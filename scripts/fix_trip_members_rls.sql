-- Fix trip_members Row Level Security (RLS) policies (No Infinite Recursion)
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Helper functions with SECURITY DEFINER to bypass RLS recursion
CREATE OR REPLACE FUNCTION public.is_trip_member(lookup_trip_id UUID, lookup_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = lookup_trip_id AND user_id = lookup_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trip_organizer(lookup_trip_id UUID, lookup_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = lookup_trip_id AND user_id = lookup_user_id AND role = 'organizer'
  );
$$;

ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to eliminate recursion
DROP POLICY IF EXISTS "Members can view trip_members" ON public.trip_members;
DROP POLICY IF EXISTS "Users can view trip_members" ON public.trip_members;
DROP POLICY IF EXISTS "Users can insert trip_members" ON public.trip_members;
DROP POLICY IF EXISTS "Users can update trip_members" ON public.trip_members;
DROP POLICY IF EXISTS "Users can delete trip_members" ON public.trip_members;

-- 3. SELECT: Authenticated users can view trip members
CREATE POLICY "Users can view trip_members"
  ON public.trip_members
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. INSERT: Users can join a trip or organizers can add members
CREATE POLICY "Users can insert trip_members"
  ON public.trip_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_trip_organizer(trip_id, auth.uid())
  );

-- 5. UPDATE: Users can update own check-in, organizers can promote/update members
CREATE POLICY "Users can update trip_members"
  ON public.trip_members
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_trip_organizer(trip_id, auth.uid())
  );

-- 6. DELETE: Users can leave trips (delete own row), organizers can remove members
CREATE POLICY "Users can delete trip_members"
  ON public.trip_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_trip_organizer(trip_id, auth.uid())
  );
