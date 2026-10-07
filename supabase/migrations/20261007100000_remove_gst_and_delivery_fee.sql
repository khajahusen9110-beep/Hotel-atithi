-- Hotel Atithi: no GST and no delivery fee on orders.
-- Order total = item subtotal - coupon discount.
--
-- The amounts are fixed to 0 in the functions themselves (not only in `settings`),
-- so changing tax_percent / delivery_fee in the admin panel can never charge a
-- customer more than the total the app showed at checkout.
-- Existing orders are left untouched.
-- Safe to re-run.

begin;

-- 1. Settings: zero the values so every screen reading them agrees
update public.settings
set tax_percent = 0,
    delivery_fee = 0,
    delivery_per_km_charge = 0
where id = true;

-- 2. Distance-based delivery fee: no longer applied. Kept as a no-op (instead of
--    dropping it) so trg_order_items_apply_delivery_fee stays valid; totals are
--    set by recompute_order_totals below.
create or replace function public.apply_delivery_fee_rule()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  return null;
end;
$$;

-- 3. Totals recomputed whenever order items change: no tax, no delivery fee
create or replace function public.recompute_order_totals()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_order_id uuid;
  v_subtotal numeric(10,2);
  v_discount numeric(10,2);
begin
  v_order_id := coalesce(new.order_id, old.order_id);

  select coalesce(sum(price * qty), 0) into v_subtotal
  from public.order_items where order_id = v_order_id;

  select discount_amount into v_discount
  from public.orders where id = v_order_id;

  update public.orders
  set subtotal = v_subtotal,
      tax_amount = 0,
      delivery_fee = 0,
      total = greatest(v_subtotal - coalesce(v_discount, 0), 0)
  where id = v_order_id;

  return null;
end;
$$;

-- 4. Coupons: same rules as before, totals without tax / delivery fee
create or replace function public.apply_coupon(p_order_id uuid, p_code text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_order record;
  v_coupon record;
  v_customer_usage_count int;
  v_discount numeric(10,2);
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if v_order is null then raise exception 'Order not found'; end if;
  if v_order.customer_id is distinct from auth.uid() then raise exception 'Forbidden'; end if;
  if v_order.status <> 'new' then raise exception 'Coupon can only be applied before order is accepted'; end if;
  if v_order.payment_status <> 'pending' or v_order.razorpay_order_id is not null then
    raise exception 'Coupon cannot be applied after payment has started';
  end if;
  if v_order.coupon_id is not null then raise exception 'A coupon is already applied to this order'; end if;

  select * into v_coupon from public.coupons where upper(code) = upper(trim(p_code)) for update;
  if v_coupon is null or not v_coupon.is_active then raise exception 'Invalid coupon code'; end if;
  if v_coupon.valid_from > now() or (v_coupon.valid_until is not null and v_coupon.valid_until < now()) then
    raise exception 'Coupon is not currently valid';
  end if;
  if v_order.subtotal < v_coupon.min_order_amount then
    raise exception 'Minimum order amount of % required for this coupon', round(v_coupon.min_order_amount, 2);
  end if;
  if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
    raise exception 'Coupon usage limit reached';
  end if;

  select count(*) into v_customer_usage_count from public.coupon_usages
  where coupon_id = v_coupon.id and customer_id = auth.uid();
  if v_customer_usage_count >= v_coupon.per_customer_limit then
    raise exception 'You have already used this coupon';
  end if;

  if v_coupon.discount_type = 'percent' then
    v_discount := round(v_order.subtotal * v_coupon.discount_value / 100, 2);
    if v_coupon.max_discount_amount is not null and v_discount > v_coupon.max_discount_amount then
      v_discount := v_coupon.max_discount_amount;
    end if;
  else
    v_discount := v_coupon.discount_value;
  end if;
  if v_discount > v_order.subtotal then v_discount := v_order.subtotal; end if;

  update public.orders
  set coupon_id = v_coupon.id, coupon_code = v_coupon.code, discount_amount = v_discount,
      tax_amount = 0,
      delivery_fee = 0,
      total = greatest(subtotal - v_discount, 0)
  where id = p_order_id;

  insert into public.coupon_usages (coupon_id, customer_id, order_id, discount_amount)
  values (v_coupon.id, auth.uid(), p_order_id, v_discount);

  update public.coupons set used_count = used_count + 1 where id = v_coupon.id;

  return json_build_object('success', true, 'discount_amount', v_discount);
end;
$$;

create or replace function public.remove_coupon(p_order_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_order record;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if v_order is null then raise exception 'Order not found'; end if;
  if v_order.customer_id is distinct from auth.uid() then raise exception 'Forbidden'; end if;
  if v_order.status <> 'new' or v_order.payment_status <> 'pending' or v_order.razorpay_order_id is not null then
    raise exception 'Coupon cannot be changed now';
  end if;

  if v_order.coupon_id is not null then
    update public.coupons set used_count = greatest(used_count - 1, 0) where id = v_order.coupon_id;
    delete from public.coupon_usages where order_id = p_order_id;
  end if;

  update public.orders
  set coupon_id = null, coupon_code = null, discount_amount = 0,
      tax_amount = 0,
      delivery_fee = 0,
      total = subtotal
  where id = p_order_id;

  return json_build_object('success', true);
end;
$$;

commit;
