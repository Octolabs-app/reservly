-- Randevou D1 Schema - Migration 0002
-- Booking rules: owner control over scheduling behaviour.
--
-- businesses.min_notice_minutes   How close to the appointment a customer can still book.
--                                 Default 120 = customers must book at least 2 hours ahead.
-- businesses.max_advance_days     How far ahead customers can book. Default 30 days.
-- businesses.slot_interval_minutes Spacing between offered start times.
--                                 NULL = default (30 minutes).
-- services.all_day                1 = the service takes the whole working day:
--                                 one booking per day, no time grid.

ALTER TABLE businesses ADD COLUMN min_notice_minutes INTEGER NOT NULL DEFAULT 120;
ALTER TABLE businesses ADD COLUMN max_advance_days INTEGER NOT NULL DEFAULT 30;
ALTER TABLE businesses ADD COLUMN slot_interval_minutes INTEGER;

ALTER TABLE services ADD COLUMN all_day INTEGER NOT NULL DEFAULT 0;
