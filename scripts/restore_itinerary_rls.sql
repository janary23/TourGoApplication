-- Restore organizer-only itinerary writes.
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
--
-- Context: fix_itinerary_rls.sql added member-level INSERT/UPDATE/DELETE
-- policies. That was the wrong call — the original design was organizer-writes
-- / member-reads, and the "violates row-level security" error was simply a
-- member account correctly being refused.
--
-- This script puts the original model back and removes the member write
-- policies. Safe to re-run.

-- ── 1. Remove the member write policies added by fix_itinerary_rls.sql ──────
DROP POLICY IF EXISTS "Members can insert itinerary" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can update itinerary" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can delete itinerary" ON public.itinerary_items;

-- Also drop the duplicate SELECT it created ("Member reads itinerary" below
-- covers reads on its own).
DROP POLICY IF EXISTS "Members can read itinerary" ON public.itinerary_items;

-- ── 2. Recreate the original pair ───────────────────────────────────────────
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

-- Organizers get full control of the plan.
DROP POLICY IF EXISTS "Organizer manages itinerary" ON public.itinerary_items;
CREATE POLICY "Organizer manages itinerary"
  ON public.itinerary_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = itinerary_items.trip_id
        AND trip_members.user_id = auth.uid()
        AND trip_members.role = 'organizer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = itinerary_items.trip_id
        AND trip_members.user_id = auth.uid()
        AND trip_members.role = 'organizer'
    )
  );

-- Everyone on the trip can read the plan.
DROP POLICY IF EXISTS "Member reads itinerary" ON public.itinerary_items;
CREATE POLICY "Member reads itinerary"
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

-- ── 3. Verify — expect exactly two rows: ALL (organizer), SELECT (member) ───
SELECT policyname, cmd
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'itinerary_items'
 ORDER BY cmd, policyname;
