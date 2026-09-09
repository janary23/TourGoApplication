-- Adds the "safe zone" radius used by the Guardian map's geofence alert.
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query).
--
-- NULL/0 means no geofence is configured for the trip (feature off). The
-- zone's center is computed client-side from the itinerary (centroid of
-- placed stops, falling back to the destination) rather than stored here,
-- so organizers only ever set one number: the radius.

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS geofence_radius_meters integer;

COMMENT ON COLUMN public.trips.geofence_radius_meters IS
  'Safe-zone radius in meters for the Guardian map geofence alert. NULL = feature off.';
