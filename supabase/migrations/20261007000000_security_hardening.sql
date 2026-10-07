-- Hotel Atithi: production security hardening
-- Run once in Supabase Dashboard -> SQL Editor (safe to re-run; no data is deleted).

begin;

-- ---------------------------------------------------------------------------
-- 1. PROFILES: customers must never be able to change their own role.
--    Before this, any signed-in customer could run
--    `update profiles set role = 'admin'` and get full admin access.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_fields()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.role := 'customer';
    return new;
  end if;
  if new.role is distinct from old.role or new.id is distinct from old.id then
    raise exception 'You are not allowed to change your role';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_fields on public.profiles;
create trigger trg_profiles_guard_fields
before insert or update on public.profiles
for each row execute function public.guard_profile_fields();

-- ---------------------------------------------------------------------------
-- 2. ORDERS
--    - dedicated razorpay_order_id column, written only by the edge function
--    - customers can no longer change status (before: they could mark their own
--      COD order "delivered", which also auto-marked it "paid")
--    - customers can no longer write payment_id (before: they could point an
--      expensive order at a cheap paid Razorpay order and get it marked paid)
--    - delivery address must belong to the customer
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists razorpay_order_id text;

create or replace function public.guard_order_client_fields()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.addresses a
      where a.id = new.address_id and a.customer_id = auth.uid()
    ) then
      raise exception 'Invalid delivery address';
    end if;

    new.status := 'new';
    new.payment_status := 'pending';
    new.payment_id := null;
    new.razorpay_order_id := null;
    new.discount_amount := 0;
    new.coupon_id := null;
    new.coupon_code := null;
    new.subtotal := 0;
    new.tax_amount := 0;
    new.delivery_fee := 0;
    new.total := 0;
    new.rejection_reason := null;
    new.cancellation_reason := null;
    return new;
  end if;

  if new.total is distinct from old.total
     or new.subtotal is distinct from old.subtotal
     or new.tax_amount is distinct from old.tax_amount
     or new.delivery_fee is distinct from old.delivery_fee
     or new.discount_amount is distinct from old.discount_amount
     or new.coupon_id is distinct from old.coupon_id
     or new.coupon_code is distinct from old.coupon_code
     or new.payment_status is distinct from old.payment_status
     or new.payment_id is distinct from old.payment_id
     or new.razorpay_order_id is distinct from old.razorpay_order_id
     or new.customer_id is distinct from old.customer_id
     or new.customer_name is distinct from old.customer_name
     or new.customer_phone is distinct from old.customer_phone
     or new.order_number is distinct from old.order_number
     or new.address_id is distinct from old.address_id
     or new.rejection_reason is distinct from old.rejection_reason
  then
    raise exception 'You are not allowed to modify order amounts, payment status or ownership';
  end if;

  -- Customers may only cancel their own new, unpaid order
  if new.status is distinct from old.status then
    if not (old.status = 'new' and new.status = 'cancelled' and old.payment_status <> 'paid') then
      raise exception 'You can only cancel an order before it is accepted';
    end if;
  end if;

  if new.payment_gateway is distinct from old.payment_gateway and old.payment_status = 'paid' then
    raise exception 'Payment method cannot be changed after payment';
  end if;

  return new;
end;
$$;

drop policy if exists orders_update_own_pending_or_admin on public.orders;
create policy orders_update_own_pending_or_admin on public.orders
for update
using ((select public.is_admin()) or (((select auth.uid()) = customer_id) and (status = 'new'::order_status)))
with check ((select public.is_admin()) or ((select auth.uid()) = customer_id));

-- ---------------------------------------------------------------------------
-- 3. ORDER ITEMS: items can only be added while the order is new, unpaid and
--    before an online payment has been started (amount is then locked).
-- ---------------------------------------------------------------------------
drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items
for insert
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.customer_id = (select auth.uid())
      and o.status = 'new'::order_status
      and o.payment_status = 'pending'::payment_status
      and o.razorpay_order_id is null
  )
);

-- ---------------------------------------------------------------------------
-- 4. ADDRESSES / REVIEWS: rows can't be re-assigned to another customer;
--    one review per order.
-- ---------------------------------------------------------------------------
drop policy if exists addresses_update_own on public.addresses;
create policy addresses_update_own on public.addresses
for update
using ((select auth.uid()) = customer_id)
with check ((select auth.uid()) = customer_id);

drop policy if exists reviews_customer_update_own on public.reviews;
create policy reviews_customer_update_own on public.reviews
for update
using ((select auth.uid()) = customer_id)
with check ((select auth.uid()) = customer_id);

create unique index if not exists reviews_one_per_order
  on public.reviews(order_id) where order_id is not null;

-- ---------------------------------------------------------------------------
-- 5. Time windows that cross midnight (e.g. 20:00 -> 02:00).
--    `now between from and until` is always false for those.
-- ---------------------------------------------------------------------------
create or replace function public.time_in_window(p_now time, p_from time, p_until time)
returns boolean
language sql
immutable
set search_path to 'public'
as $$
  select case
    when p_from <= p_until then p_now between p_from and p_until
    else p_now >= p_from or p_now <= p_until
  end;
$$;

create or replace function public.is_store_open_now()
returns boolean
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_manual_closed boolean;
  v_ist timestamp;
  v_row record;
begin
  select store_manually_closed into v_manual_closed from public.settings where id = true;
  if v_manual_closed then return false; end if;

  v_ist := now() at time zone 'Asia/Kolkata';
  select * into v_row from public.store_hours where day_of_week = extract(dow from v_ist)::int;
  if v_row is null or v_row.is_closed then return false; end if;

  return public.time_in_window(v_ist::time, v_row.open_time, v_row.close_time);
end;
$$;

create or replace function public.is_product_orderable(p_product_id uuid)
returns boolean
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_available boolean;
  v_stock int;
  v_from time;
  v_until time;
begin
  select is_available, stock, available_from, available_until
  into v_available, v_stock, v_from, v_until
  from public.products where id = p_product_id;

  if v_available is null or not v_available then return false; end if;
  if v_stock is not null and v_stock <= 0 then return false; end if;

  if v_from is not null and v_until is not null then
    return public.time_in_window((now() at time zone 'Asia/Kolkata')::time, v_from, v_until);
  end if;
  return true;
end;
$$;

create or replace function public.set_order_item_live_price()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_price numeric(10,2);
  v_name text;
  v_available boolean;
  v_stock int;
  v_from time;
  v_until time;
begin
  select price, name, is_available, stock, available_from, available_until
  into v_price, v_name, v_available, v_stock, v_from, v_until
  from public.products
  where id = new.product_id
  for update;

  if v_price is null then
    raise exception 'Product not found or has been removed';
  end if;
  if not v_available then
    raise exception 'Product "%" is currently unavailable', v_name;
  end if;
  if v_from is not null and v_until is not null
     and not public.time_in_window((now() at time zone 'Asia/Kolkata')::time, v_from, v_until) then
    raise exception 'Product "%" is only available between % and %', v_name, v_from, v_until;
  end if;
  if v_stock < new.qty then
    raise exception 'Insufficient stock for "%": only % left', v_name, v_stock;
  end if;

  new.price := v_price;
  new.product_name := v_name;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. COUPONS: re-applying used to increase used_count every time, and a second
--    coupon could be stacked on the same order.
-- ---------------------------------------------------------------------------
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
  v_tax_percent numeric(5,2);
  v_tax numeric(10,2);
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

  select tax_percent into v_tax_percent from public.settings where id = true;
  v_tax := round((v_order.subtotal - v_discount) * coalesce(v_tax_percent, 0) / 100, 2);

  update public.orders
  set coupon_id = v_coupon.id, coupon_code = v_coupon.code, discount_amount = v_discount,
      tax_amount = v_tax,
      total = subtotal - v_discount + v_tax + delivery_fee
  where id = p_order_id;

  insert into public.coupon_usages (coupon_id, customer_id, order_id, discount_amount)
  values (v_coupon.id, auth.uid(), p_order_id, v_discount);

  update public.coupons set used_count = used_count + 1 where id = v_coupon.id;

  return json_build_object('success', true, 'discount_amount', v_discount);
end;
$$;

-- remove_coupon must not run once payment has started
create or replace function public.remove_coupon(p_order_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_order record;
  v_tax_percent numeric(5,2);
  v_tax numeric(10,2);
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

  select tax_percent into v_tax_percent from public.settings where id = true;
  v_tax := round(v_order.subtotal * coalesce(v_tax_percent, 0) / 100, 2);

  update public.orders
  set coupon_id = null, coupon_code = null, discount_amount = 0, tax_amount = v_tax,
      total = subtotal + v_tax + delivery_fee
  where id = p_order_id;

  return json_build_object('success', true);
end;
$$;

-- Give back coupon usage when an order is cancelled or rejected
create or replace function public.release_coupon_on_cancel()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.status in ('rejected', 'cancelled') and old.status not in ('rejected', 'cancelled')
     and new.coupon_id is not null then
    update public.coupons set used_count = greatest(used_count - 1, 0) where id = new.coupon_id;
    delete from public.coupon_usages where order_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_release_coupon on public.orders;
create trigger trg_orders_release_coupon
after update on public.orders
for each row execute function public.release_coupon_on_cancel();

-- ---------------------------------------------------------------------------
-- 7. Internal helpers should not be callable from the public API
-- ---------------------------------------------------------------------------
revoke execute on function public.guard_profile_fields() from public, anon, authenticated;
revoke execute on function public.release_coupon_on_cancel() from public, anon, authenticated;

commit;
