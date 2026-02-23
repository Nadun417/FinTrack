-- ============================================================================
-- FinTrack — Migration 006: Fix month_key CHECK constraint
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- The original constraint used '\\d' which may be stored as a literal
-- backslash+d instead of the regex digit shorthand, causing all INSERTs
-- to fail. This replaces it with [0-9] which has no escaping ambiguity.
-- ============================================================================

ALTER TABLE public.monthly_stats
  DROP CONSTRAINT IF EXISTS monthly_stats_month_key_format;

ALTER TABLE public.monthly_stats
  ADD CONSTRAINT monthly_stats_month_key_format
  CHECK (month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
