-- Ensure member_locations exists with the schema "Share my location" needs,
-- and RLS policies consistent with the rest of the app (see fix_trip_members_rls.sql).
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query).
--
-- Why this script exists: the app's updateUserLocation() does
--   supabase.from('member_locations').upsert({ trip_id, user_id, latitude, longitude, updated_at })
-- with no `onConflict` — Postgres upsert falls back to matching the table's
-- PRIMARY KEY. If member_locations only has an auto `id` primary key (no
-- unique constraint on trip_id+user_id), every "Share my location" tap
-- INSERTS a brand new row instead of updating the existing one, so a member
-- accumulates a history of location rows instead of having one current
-- location — and code that reads "the latest row per user_id" can pick an
-- arbitrary (not necessarily the newest) row. This script adds the missing
-- unique index so upserts correctly update in place, safe to run whether or
-- not the table/index already exists.

-- 1. Table (safe no-op if it already exists)
CREATE TABLE IF NOT EXISTS public.member_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. The constraint the app's upsert() actually needs to update in place
--    instead of silently duplicating a row every time someone shares.
CREATE UNIQUE INDEX IF NOT EXISTS member_locations_trip_user_key
  ON public.member_locations (trip_id, user_id);

-- 3. One-time cleanup: if duplicates already accumulated before this fix,
--    keep only the most recently updated row per (trip_id, user_id).
DELETE FROM public.member_locations a
USING public.member_locations b
WHERE a.trip_id = b.trip_id
  AND a.user_id = b.user_id
  AND a.updated_at < b.updated_at;

ALTER TABLE public.member_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip members can view member_locations" ON public.member_locations;
DROP POLICY IF EXISTS "Users can upsert own member_locations" ON public.member_locations;
DROP POLICY IF EXISTS "Users can insert own member_locations" ON public.member_locations;
DROP POLICY IF EXISTS "Users can update own member_locations" ON public.member_locations;
DROP POLICY IF EXISTS "Users can delete own member_locations" ON public.member_locations;

-- 4. SELECT: only fellow members of the same trip can see a location
--    (reuses the is_trip_member() helper from fix_trip_members_rls.sql).
CREATE POLICY "Trip members can view member_locations"
  ON public.member_locations
  FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

-- 5. INSERT/UPDATE/DELETE: only your own location row, and only for a trip
--    you actually belong to.
CREATE POLICY "Users can insert own member_locations"
  ON public.member_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Users can update own member_locations"
  ON public.member_locations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own member_locations"
  ON public.member_locations
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
