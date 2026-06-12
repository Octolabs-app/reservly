# Cloudflare Architecture — Rezavu

Architecture reference. The current deploy runbook is **DEPLOYMENT.md** — follow that for commands; this doc explains the design. (SUPABASE_SETUP.md was removed with the Supabase backend.)

## Architecture Overview

```
Browser / Customer
      │
      ▼
Cloudflare Pages  ─── static assets (JS, CSS, images)
      │
      ▼
Cloudflare Workers (Nitro SSR + API handlers)
      │       │       │
      ▼       ▼       ▼
   D1 DB     KV    R2 (future: logos)
(SQLite)  (sessions)
      │
      ▼
 Twilio WhatsApp API
 Stripe Billing API
```

| Concern | Before (Supabase) | After (Cloudflare) |
|---|---|---|
| Database | Supabase Postgres | **Cloudflare D1** (SQLite) |
| Auth | Supabase GoTrue (JWT) | **D1 owners + sessions table** (HttpOnly cookie) |
| Admin API | Supabase service role client | **D1 Worker-side queries** |
| Message log | Supabase `message_events` | **D1 `message_events`** |
| Subscriptions | Supabase `subscriptions` | **D1 `subscriptions`** |
| Session cache | Supabase JWT (stateless) | **Cloudflare KV** (1h TTL) |
| File storage | — | **Cloudflare R2** (when needed) |
| Hosting | Vercel / Netlify | **Cloudflare Pages** |
| Scheduled jobs | pg_cron | **Cloudflare Cron Triggers** |

---

## One-time Setup

### 1. Install Wrangler
```bash
npm install -g wrangler
wrangler login
```

### 2. Create D1 Database
```bash
wrangler d1 create rezavu-db
```
Copy the `database_id` into `wrangler.toml` → `[[d1_databases]]`.

### 3. Run the Migration
```bash
# Production
wrangler d1 execute rezavu-db --remote --file=migrations/0001_rezavu_core.sql
wrangler d1 execute rezavu-db --remote --file=migrations/0002_booking_rules.sql

# Local dev with real D1 (optional)
wrangler d1 execute rezavu-db --local --file=migrations/0001_rezavu_core.sql
wrangler d1 execute rezavu-db --local --file=migrations/0002_booking_rules.sql
```

### 4. Create KV Namespace (session cache)
```bash
wrangler kv namespace create rezavu-sessions
```
Copy the `id` into `wrangler.toml` → `[[kv_namespaces]]`.

### 5. Set Secrets
```bash
wrangler pages secret put TWILIO_ACCOUNT_SID --project-name=rezavu
wrangler pages secret put TWILIO_AUTH_TOKEN --project-name=rezavu
wrangler pages secret put TWILIO_WHATSAPP_FROM --project-name=rezavu    # e.g. whatsapp:+14155238886
wrangler pages secret put STRIPE_SECRET_KEY --project-name=rezavu
wrangler pages secret put STRIPE_WEBHOOK_SECRET --project-name=rezavu
wrangler pages secret put STRIPE_PRICE_PRO_MONTHLY --project-name=rezavu
wrangler pages secret put STRIPE_PRICE_STUDIO_MONTHLY --project-name=rezavu
```

### 6. Deploy
```bash
npm run build
wrangler pages deploy ./dist
```

---

## Local Development

No Cloudflare credentials needed. Just:
```bash
npm install
npm run dev
```

The app detects missing D1 bindings and falls back to the **in-browser dev-store** (localStorage). All flows — onboarding, booking, dashboard — work fully offline. Seed data (`Salon Rose`) is pre-loaded.

### Optional: Test with real local D1
```bash
wrangler pages dev --d1 DB=rezavu-db --kv KV=rezavu-sessions
```

---

## New Source Files

| File | Purpose |
|---|---|
| `src/lib/cf/db.ts` | D1 client, bindings injection, query helpers |
| `src/lib/cf/auth.ts` | Owner auth (D1 + KV sessions, bcryptjs) |
| `src/lib/cf/data.ts` | All data operations (replaces Supabase SDK calls in `data.ts`) |
| `src/lib/cf/messaging.ts` | WhatsApp send + inbound + D1 event log |
| `src/lib/cf/billing.ts` | Stripe checkout + webhook + D1 subscription updates |
| `migrations/0001_rezavu_core.sql` | D1 schema (SQLite dialect) |
| `migrations/0002_booking_rules.sql` | Booking rules + all-day services |
| `wrangler.toml` | Cloudflare Pages + Workers config |
| `src/routes/api.auth.signin.tsx` | POST /api/auth/signin |
| `src/routes/api.auth.signup.tsx` | POST /api/auth/signup |
| `src/routes/api.auth.signout.tsx` | POST /api/auth/signout |
| `src/routes/api.auth.me.tsx` | GET /api/auth/me |

## Retained (unchanged) Files

`src/lib/rezavu/dev-store.ts`, `slots.ts`, `slug.ts`, `types.ts` — pure logic, no Supabase deps.  
All route UI files — unchanged.

## Deprecated (kept but no longer used)

`src/lib/rezavu/supabase.ts` — can be deleted once Supabase project is confirmed decommissioned.  
`src/lib/rezavu/admin.server.ts` — replaced by `src/lib/cf/db.ts`.  
`src/lib/rezavu/auth.ts` — replaced by `src/lib/cf/auth.ts`.  
`src/lib/rezavu/billing.server.ts` — replaced by `src/lib/cf/billing.ts`.  
`src/lib/rezavu/messaging.server.ts` — replaced by `src/lib/cf/messaging.ts`.  
`supabase/` directory — keep until Supabase project is confirmed closed.

---

## Auth Flow

```
Sign up / Sign in
  → POST /api/auth/signin  (or signup)
  → D1: verify password hash (bcryptjs)
  → D1: INSERT session row
  → KV: cache session → owner for 1h
  → Response: Set-Cookie rsv_session=<id>; HttpOnly

Every authenticated request
  → Cookie: rsv_session=<id>
  → KV.get("session:<id>") → owner (fast path)
  → If KV miss: D1 SELECT sessions + owners
  → owner injected into handler context

Sign out
  → POST /api/auth/signout
  → D1: DELETE session row
  → KV: delete cache key
  → Response: Set-Cookie rsv_session=; Max-Age=0
```

---

## D1 vs Supabase Postgres Differences

| Feature | Supabase Postgres | Cloudflare D1 |
|---|---|---|
| Dialect | PostgreSQL | SQLite |
| UUID | `gen_random_uuid()` | `crypto.randomUUID()` in app |
| Timestamps | `timestamptz` | `TEXT` (ISO-8601) |
| Booleans | `boolean` | `INTEGER` (0/1) |
| JSON | `jsonb` | `TEXT` (JSON string) |
| Overlap exclusion | `EXCLUDE USING GIST` | App-layer overlap check |
| RLS | Postgres RLS policies | Worker-side ownership checks |
| Auth | GoTrue (auth.users) | `owners` table + `sessions` table |
| Triggers | PL/pgSQL | App-layer guards |

---

## R2 (Future)

R2 is not needed for the current MVP. When logo uploads are added (Studio tier):
```bash
wrangler r2 bucket create rezavu-assets
```
Add to `wrangler.toml`:
```toml
[[r2_buckets]]
binding = "R2"
bucket_name = "rezavu-assets"
```
