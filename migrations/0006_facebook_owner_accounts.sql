-- Randevou D1 Schema - Migration 0006
-- Facebook account sign-in / linking for business owners.
-- Apply AFTER 0005_booking_ref_index.sql.

ALTER TABLE owners ADD COLUMN facebook_id TEXT;
ALTER TABLE owners ADD COLUMN facebook_email TEXT;
ALTER TABLE owners ADD COLUMN facebook_name TEXT;
ALTER TABLE owners ADD COLUMN facebook_linked_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS owners_facebook_id_idx
  ON owners(facebook_id)
  WHERE facebook_id IS NOT NULL;
