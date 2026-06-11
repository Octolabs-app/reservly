-- Reservly D1 Schema - Migration 0001
-- Replaces: supabase/migrations/20260611000000_reservly_core.sql
-- Target: Cloudflare D1 (SQLite dialect)
-- Auth: Cloudflare-issued JWT sessions stored in KV (no Supabase auth.users)
--
-- D1 / SQLite differences from Postgres:
--   - No UUID type: store as TEXT (crypto.randomUUID() in application layer)
--   - No timestamptz: store as TEXT (ISO-8601 UTC strings)
--   - No CHECK constraints on INSERT triggers: enforced in app layer
--   - No btree_gist or EXCLUDE USING GIST: overlap guard in app layer
--   - No pg triggers: replaced by app-layer guards in src/lib/cf/db.ts
--   - UPSERT via INSERT OR REPLACE / ON CONFLICT DO UPDATE

-- ─── Owners (replaces auth.users + profiles) ───────────────────────────────
CREATE TABLE IF NOT EXISTS owners (
  id          TEXT PRIMARY KEY,          -- crypto.randomUUID()
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,           -- bcryptjs hash, never returned to client
  full_name   TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Sessions (replaces Supabase JWT / GoTrue) ───────────────────────────────
-- Short-lived tokens stored here; KV used as fast read cache (see env setup)
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,          -- crypto.randomUUID()
  owner_id    TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS sessions_owner_idx ON sessions(owner_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

-- ─── Businesses ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
  id                      TEXT PRIMARY KEY,
  owner_id                TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  slug                    TEXT NOT NULL UNIQUE,
  category                TEXT NOT NULL,
  city                    TEXT NOT NULL DEFAULT '',
  whatsapp_number         TEXT NOT NULL DEFAULT '',
  booking_page_language   TEXT NOT NULL DEFAULT 'Both',
  timezone                TEXT NOT NULL DEFAULT 'Indian/Mauritius',
  plan                    TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'pro' | 'studio'
  booking_limit_monthly   INTEGER DEFAULT 15,            -- NULL = unlimited (pro/studio)
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS businesses_owner_idx ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS businesses_slug_idx  ON businesses(slug);

-- ─── Services ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id               TEXT PRIMARY KEY,
  business_id      TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price_label      TEXT NOT NULL DEFAULT '',
  active           INTEGER NOT NULL DEFAULT 1,   -- 0 | 1 (SQLite bool)
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS services_business_idx ON services(business_id);

-- ─── Availability ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS availability (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL,   -- 0=Sun … 6=Sat
  is_open      INTEGER NOT NULL DEFAULT 1,
  opens_at     TEXT NOT NULL DEFAULT '09:00',
  closes_at    TEXT NOT NULL DEFAULT '18:00',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(business_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS availability_business_idx ON availability(business_id);

-- ─── Bookings ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                TEXT PRIMARY KEY,
  business_id       TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id        TEXT NOT NULL REFERENCES services(id),
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT NOT NULL,
  customer_language TEXT NOT NULL DEFAULT 'Both',
  start_at          TEXT NOT NULL,   -- ISO-8601 UTC
  end_at            TEXT NOT NULL,   -- ISO-8601 UTC
  status            TEXT NOT NULL DEFAULT 'pending',  -- 'pending'|'confirmed'|'cancelled'
  source            TEXT NOT NULL DEFAULT 'public',   -- 'public'|'dashboard'
  notes             TEXT,
  cancellation_reason TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS bookings_business_start_idx ON bookings(business_id, start_at);
CREATE INDEX IF NOT EXISTS bookings_phone_created_idx  ON bookings(customer_phone, created_at DESC);

-- ─── Message Events (WhatsApp log) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_events (
  id                  TEXT PRIMARY KEY,
  business_id         TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  booking_id          TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  direction           TEXT NOT NULL,   -- 'inbound'|'outbound'
  channel             TEXT NOT NULL DEFAULT 'whatsapp',
  provider            TEXT NOT NULL DEFAULT 'twilio',
  provider_message_id TEXT,
  recipient_phone     TEXT,
  body                TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'queued',
  raw_payload         TEXT,            -- JSON string (D1 has no native JSON column)
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS message_events_business_idx ON message_events(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS message_events_booking_idx  ON message_events(booking_id);

-- ─── Subscriptions (Stripe billing state) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     TEXT PRIMARY KEY,
  business_id            TEXT NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  plan                   TEXT NOT NULL DEFAULT 'free',
  status                 TEXT NOT NULL DEFAULT 'inactive',
  current_period_end     TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);
