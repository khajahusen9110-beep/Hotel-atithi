# Supabase backend changes

1. **SQL** — Supabase Dashboard → SQL Editor → paste `migrations/20261007000000_security_hardening.sql` → Run (safe to re-run, deletes no data).
2. **Guest checkout** — Authentication → Sign In / Providers → turn on **Allow anonymous sign-ins**.
   Customers who order without logging in get a private guest session on their device.
3. **Leaked password protection** — Authentication → Settings → enable it.
4. Online payment is switched off (Cash on Delivery only). The old `create-razorpay-order` and
   `verify-payment` edge functions are no longer used and can be deleted from Edge Functions.
