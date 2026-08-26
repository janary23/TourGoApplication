-- Fix RLS policies for trip_features table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Ensure RLS is enabled
ALTER TABLE trip_features ENABLE ROW LEVEL SECURITY;

-- 2. Drop any overly restrictive existing policies on trip_features
DROP POLICY IF EXISTS "trip_features" ON trip_features;
DROP POLICY IF EXISTS "Members can insert trip features" ON trip_features;
DROP POLICY IF EXISTS "Members can read trip features" ON trip_features;
DROP POLICY IF EXISTS "Organizers can update trip features" ON trip_features;

-- 3. Allow authenticated users to INSERT trip_features for trips they are a member of
CREATE POLICY "Members can insert trip features"
  ON trip_features
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_features.trip_id
        AND trip_members.user_id = auth.uid()
    )
  );

-- 4. Allow members to read trip features for their trips
CREATE POLICY "Members can read trip features"
  ON trip_features
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_features.trip_id
        AND trip_members.user_id = auth.uid()
    )
  );

-- 5. Allow organizers to update trip features
CREATE POLICY "Organizers can update trip features"
  ON trip_features
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_features.trip_id
        AND trip_members.user_id = auth.uid()
        AND trip_members.role = 'organizer'
    )
  );
