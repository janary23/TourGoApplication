-- Fix RLS policies for itinerary_items
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
--
-- Why the insert fails today:
--   itinerary_items has RLS enabled but no INSERT policy, so every insert is
--   rejected with "new row violates row-level security policy".
--
--   The app inserts only: trip_id, day_index, time_label, title, description,
--   location — there is NO user_id column on this table. So the policy has to
--   authorise by trip membership, not by row ownership.

-- ── 0. What is there right now? (read-only, safe) ───────────────────────────
SELECT policyname, cmd, qual, with_check
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'itinerary_items';

-- ── 1. Make sure RLS is on ──────────────────────────────────────────────────
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

-- ── 2. Clear any half-configured policies so this script is re-runnable ─────
DROP POLICY IF EXISTS "itinerary_items" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can read itinerary" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can insert itinerary" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can update itinerary" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can delete itinerary" ON public.itinerary_items;

-- ── 3. Read: anyone on the trip ─────────────────────────────────────────────
CREATE POLICY "Members can read itinerary"
  ON public.itinerary_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = itinerary_items.trip_id
        AND trip_members.user_id = auth.uid()
    )
  );

-- ── 4. Insert: anyone on the trip (this is the one that was missing) ────────
CREATE POLICY "Members can insert itinerary"
  ON public.itinerary_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = itinerary_items.trip_id
        AND trip_members.user_id = auth.uid()
    )
  );

-- ── 5. Update: anyone on the trip (editing a stop's time/title/location) ────
CREATE POLICY "Members can update itinerary"
  ON public.itinerary_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = itinerary_items.trip_id
        AND trip_members.user_id = auth.uid()
    )
  );

-- ── 6. Delete: anyone on the trip (removing a stop) ─────────────────────────
CREATE POLICY "Members can delete itinerary"
  ON public.itinerary_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = itinerary_items.trip_id
        AND trip_members.user_id = auth.uid()
    )
  );

-- ── 7. Verify ───────────────────────────────────────────────────────────────
SELECT policyname, cmd
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'itinerary_items'
 ORDER BY cmd;
-- Expect four rows: DELETE, INSERT, SELECT, UPDATE.


-- ════════════════════════════════════════════════════════════════════════════
-- OPTIONAL — only if you want "import itinerary by trip code" to work.
--
-- The policy above is members-only, so previewTripByCode() cannot read the
-- stops of a trip you have not joined, and the import shows
-- "That trip's itinerary is not shared publicly."
--
-- Uncomment to let any signed-in user READ any itinerary. Writes stay
-- members-only. Only do this if you are comfortable with itineraries being
-- readable by anyone who has (or guesses) a trip code.
-- ════════════════════════════════════════════════════════════════════════════

-- DROP POLICY IF EXISTS "Members can read itinerary" ON public.itinerary_items;
-- CREATE POLICY "Anyone signed in can read itinerary"
--   ON public.itinerary_items
--   FOR SELECT
--   TO authenticated
--   USING (true);
