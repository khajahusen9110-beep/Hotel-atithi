-- Hotel Atithi: one source of truth for "is the hotel open right now".
-- The admin edits the weekly timings (store_hours) and the emergency closure
-- (settings.store_manually_closed). The customer website and the order trigger both
-- read the result of get_store_status(), so they can never disagree.
--
-- Fixes overnight shifts: a Mon 18:00 -> 02:00 shift is now open at Tue 01:00 even if
-- Tuesday itself is closed (before, only today's row was checked).
-- Safe to re-run.

begin;

create or replace function public.get_store_status(p_at timestamptz default now())
returns json
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_now timestamp := p_at at time zone 'Asia/Kolkata';
  v_manual boolean := false;
  v_message text;
  v_row record;
  v_day date;
  v_start timestamp;
  v_end timestamp;
  v_open boolean := false;
  v_closes_at timestamp;
  v_next_open timestamp;
  v_week json;
begin
  select coalesce(store_manually_closed, false), store_closed_message
  into v_manual, v_message
  from public.settings where id = true;

  -- Opening windows from yesterday (a shift that runs past midnight) to a week ahead
  for i in -1..7 loop
    v_day := v_now::date + i;
    select * into v_row from public.store_hours where day_of_week = extract(dow from v_day)::int;
    if not found then
      continue;
    end if;
    continue when v_row.is_closed or v_row.open_time is null or v_row.close_time is null;

    v_start := v_day + v_row.open_time;
    v_end := v_day + v_row.close_time;
    -- closing at or before the opening time means the shift ends the next day (e.g. 18:00 -> 02:00)
    if v_row.close_time <= v_row.open_time then
      v_end := v_end + interval '1 day';
    end if;

    if v_now >= v_start and v_now < v_end then
      v_open := true;
      v_closes_at := greatest(coalesce(v_closes_at, v_end), v_end);
    elsif v_start > v_now and v_next_open is null then
      v_next_open := v_start;
    end if;
  end loop;

  if v_manual then
    v_open := false;
  end if;

  select json_agg(
           json_build_object(
             'day_of_week', day_of_week,
             'open_time', open_time,
             'close_time', close_time,
             'is_closed', is_closed
           ) order by day_of_week)
  into v_week
  from public.store_hours;

  return json_build_object(
    'is_open', v_open,
    -- open | manual (closed from the admin panel) | hours (outside the weekly timings)
    'reason', case when v_open then 'open' when v_manual then 'manual' else 'hours' end,
    'message', case when v_manual then v_message end,
    'now', v_now,
    'today_dow', extract(dow from v_now)::int,
    'closes_at', case when v_open then v_closes_at end,
    'closes_at_epoch', case when v_open then extract(epoch from (v_closes_at at time zone 'Asia/Kolkata'))::bigint end,
    'next_open_at', case when not v_open and not v_manual then v_next_open end,
    'next_open_epoch', case when not v_open and not v_manual and v_next_open is not null
                            then extract(epoch from (v_next_open at time zone 'Asia/Kolkata'))::bigint end,
    'week', coalesce(v_week, '[]'::json)
  );
end;
$$;

-- The order trigger (check_store_open) uses this, so orders follow the same rules
create or replace function public.is_store_open_now()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((public.get_store_status() ->> 'is_open')::boolean, false);
$$;

grant execute on function public.get_store_status(timestamptz) to anon, authenticated;

commit;
