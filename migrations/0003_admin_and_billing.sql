-- Randevou D1 Schema - Migration 0003
-- Platform admin, WhatsApp cancellation refs, and no-BRN billing fields.
--
-- bookings.booking_ref       Short human-friendly reference (e.g. RDV-8K2Q),
--                            shown in confirmations and used for /cancel REF.
-- businesses.no_same_day     1 = customers may not book a slot on the current day.
--
-- admin_audit_events         Immutable log of every platform-admin mutation.
--
-- subscriptions.provider     Billing provider:
--                            manual | paddle_individual | dodo_individual
--                            | paypal_manual | stripe_future
-- subscriptions.payment_note / payment_reference
--                            Free-text note + external reference for manual
--                            (PayPal / bank) payments tracked by admin.
-- subscriptions.status now also covers:
--                            free | trialing | active | past_due | canceled | manual

ALTER TABLE bookings ADD COLUMN booking_ref TEXT;
CREATE INDEX IF NOT EXISTS bookings_ref_idx ON bookings(booking_ref);

ALTER TABLE businesses ADD COLUMN no_same_day INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS admin_audit_events (
  id             TEXT PRIMARY KEY,           -- crypto.randomUUID()
  admin_owner_id TEXT NOT NULL,              -- owners.id of the acting admin
  action         TEXT NOT NULL,              -- e.g. 'business.update_plan'
  target_type    TEXT,                       -- 'business' | 'booking' | 'subscription' | ...
  target_id      TEXT,
  metadata_json  TEXT,                       -- JSON string of before/after / details
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_admin_idx   ON admin_audit_events(admin_owner_id, created_at DESC);

ALTER TABLE subscriptions ADD COLUMN provider TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE subscriptions ADD COLUMN payment_note TEXT;
ALTER TABLE subscriptions ADD COLUMN payment_reference TEXT;
