# Supabase backend changes

Apply in this order (payments break if the functions are deployed before the SQL):

1. **SQL** — Supabase Dashboard → SQL Editor → paste `migrations/20261007000000_security_hardening.sql` → Run.
2. **Edge functions** — redeploy `create-razorpay-order` and `verify-payment` from `functions/`
   (Dashboard → Edge Functions → open the function → replace code → Deploy, or `supabase functions deploy <name>`).
   Required secrets: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (already used by the old versions).
3. **Auth setting** — Dashboard → Authentication → Settings → enable *Leaked password protection*.
