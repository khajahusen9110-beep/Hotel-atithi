-- Hotel Atithi: contact details managed from the admin panel (Settings page).
-- The customer website reads these for the footer, call / WhatsApp links and
-- Google local SEO (Restaurant structured data). Nothing is deleted. Safe to re-run.

begin;

alter table public.settings
  add column if not exists hotel_phone text,
  add column if not exists hotel_whatsapp text,
  add column if not exists hotel_email text,
  add column if not exists hotel_city text,
  add column if not exists hotel_pincode text;

-- Fill the city for the existing row; the admin can change it any time
update public.settings
set hotel_city = coalesce(nullif(trim(hotel_city), ''), 'Raichur')
where id = true;

commit;
