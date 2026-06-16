-- Randevou D1 Schema - Migration 0004
-- Google account sign-in / linking for business owners.
--
-- Google is an authentication convenience only. It is not a billing provider
-- and does not change the no-BRN billing flow.

ALTER TABLE owners ADD COLUMN google_sub TEXT;
ALTER TABLE owners ADD COLUMN google_email TEXT;
ALTER TABLE owners ADD COLUMN google_name TEXT;
ALTER TABLE owners ADD COLUMN google_picture_url TEXT;
ALTER TABLE owners ADD COLUMN google_linked_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS owners_google_sub_idx
  ON owners(google_sub)
  WHERE google_sub IS NOT NULL;
