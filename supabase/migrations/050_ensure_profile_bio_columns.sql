-- Migration 050: Ensure bio_ar and bio_en columns exist on profiles
-- These columns were added in earlier migrations but may be missing
-- from the live database due to partial migration application.
-- Using IF NOT EXISTS makes this safe to run multiple times.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio_ar TEXT,
  ADD COLUMN IF NOT EXISTS bio_en TEXT;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';
