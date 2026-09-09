-- Upgrades checklist_items for: organizer-assignable group tasks, a private
-- per-member "what to bring" packing list, and members claiming an
-- unassigned group task for themselves.
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query).
-- Assumes is_trip_member()/is_trip_organizer() already exist — see
-- scripts/fix_trip_members_rls.sql (run that first if you haven't).

-- 1. New columns (safe no-op if they already exist)
ALTER TABLE public.checklist_items
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'group',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

ALTER TABLE public.checklist_items
  DROP CONSTRAINT IF EXISTS checklist_items_scope_check;
ALTER TABLE public.checklist_items
  ADD CONSTRAINT checklist_items_scope_check CHECK (scope IN ('group', 'personal'));

COMMENT ON COLUMN public.checklist_items.scope IS
  '''group'': shared trip task, visible to every member, assignable/claimable. ''personal'': one member''s own packing-list item, visible only to its creator.';
COMMENT ON COLUMN public.checklist_items.created_by IS
  'Who added the item. Existing rows created before this migration are NULL — treated as group items only (a NULL creator can never own a personal item, so old rows are unaffected).';

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklist_items_select" ON public.checklist_items;
DROP POLICY IF EXISTS "checklist_items_insert" ON public.checklist_items;
DROP POLICY IF EXISTS "checklist_items_update" ON public.checklist_items;
DROP POLICY IF EXISTS "checklist_items_delete" ON public.checklist_items;

-- 2. SELECT: group items are visible to any trip member; personal items are
--    visible only to whoever created them.
CREATE POLICY "checklist_items_select"
  ON public.checklist_items
  FOR SELECT
  TO authenticated
  USING (
    public.is_trip_member(trip_id, auth.uid())
    AND (scope = 'group' OR created_by = auth.uid())
  );

-- 3. INSERT: must be a trip member, and must attribute the row to yourself.
CREATE POLICY "checklist_items_insert"
  ON public.checklist_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_trip_member(trip_id, auth.uid())
    AND (created_by = auth.uid() OR created_by IS NULL)
  );

-- 4. UPDATE: a group item can be toggled/(re)assigned by any trip member
--    (claiming, releasing, organizer reassigning, marking done) or the
--    organizer; a personal item only by whoever created it.
CREATE POLICY "checklist_items_update"
  ON public.checklist_items
  FOR UPDATE
  TO authenticated
  USING (
    (scope = 'group' AND public.is_trip_member(trip_id, auth.uid()))
    OR created_by = auth.uid()
  );

-- 5. DELETE: whoever created the item, or the trip organizer for group items.
CREATE POLICY "checklist_items_delete"
  ON public.checklist_items
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (scope = 'group' AND public.is_trip_organizer(trip_id, auth.uid()))
  );
