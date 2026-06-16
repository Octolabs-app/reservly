-- Randevou D1 Schema - Migration 0005
-- Unique partial index on booking_ref so the DB enforces ref uniqueness.
-- The booking INSERT in data.ts retries up to 5 times on UNIQUE violation.

CREATE UNIQUE INDEX IF NOT EXISTS bookings_booking_ref_unique
  ON bookings(booking_ref)
  WHERE booking_ref IS NOT NULL;
