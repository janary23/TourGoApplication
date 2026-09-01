-- Add an explicit trip lifecycle to the existing trips table.
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
--
-- Backward compatible by design:
--   * every existing trip defaults to 'planned' and keeps working untouched
--   * the app derives a status from dates when these columns are absent, so it
--     runs both before and after this migration is applied
--
-- Lifecycle: planned -> active -> completed   (cancelled is a terminal side exit)

-- 1. Columns ------------------------------------------------------------------
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned';
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 2. Constrain the allowed values --------------------------------------------
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_status_check;
ALTER TABLE public.trips
  ADD CONSTRAINT trips_status_check
  CHECK (status IN ('planned', 'active', 'completed', 'cancelled'));

-- 3. Backfill: trips whose end date has already passed are historical ---------
--    (only touches rows still sitting at the default, so it is safe to re-run)
UPDATE public.trips
   SET status = 'completed',
       completed_at = COALESCE(completed_at, (end_date::timestamptz + interval '1 day'))
 WHERE status = 'planned'
   AND end_date IS NOT NULL
   AND end_date < CURRENT_DATE;

-- 4. Index for the Album query (a user's completed trips) ---------------------
CREATE INDEX IF NOT EXISTS trips_status_idx ON public.trips (status);

-- 5. Only the trip organizer may move a trip through its lifecycle ------------
DROP POLICY IF EXISTS "Organizers can update their trip" ON public.trips;
CREATE POLICY "Organizers can update their trip"
  ON public.trips
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trips.id
        AND trip_members.user_id = auth.uid()
        AND trip_members.role = 'organizer'
    )
  );
