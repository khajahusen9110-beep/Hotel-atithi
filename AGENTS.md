# Hotel Atithi — Base44 Dev Environment

## Overview
Vite + React 19 + TypeScript frontend for a vegetarian restaurant and farm-to-table produce delivery app. Uses Supabase (hosted) as backend for auth, database, and edge functions. Razorpay is loaded via CDN script tag for payments. Leaflet for maps.

## Running locally (Base44)
```
docker compose -f docker-compose.base44.yml up -d
```
- Web entry point: http://localhost:3000
- Vite dev server with live reload (HMR)
- Source is bind-mounted; edits appear instantly without rebuild

## Environment variables
- `VITE_SUPABASE_URL` — Supabase project URL (has a hardcoded fallback in `src/lib/supabase.ts`)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key (public, safe for frontend)
- Both are read from `.env` at the repo root. Override via `/run/base44/app.env` (dashboard secrets).

## Notes
- `npm install` can hang on postinstall scripts (esbuild binary download); the compose uses `--ignore-scripts` and skips install when `node_modules/.bin/vite` already exists.
- `vite.config.ts` has `allowedHosts: true` so the preview proxy hostname works.
- No local backend — all data goes to the hosted Supabase instance.
- Razorpay key is fetched at runtime from a Supabase edge function (`create-razorpay-order`).
