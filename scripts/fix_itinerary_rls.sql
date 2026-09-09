-- Fix RLS policies and enable Trip Code Itinerary sharing for itinerary_items
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ── 1. Make sure RLS is on ──────────────────────────────────────────────────
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

-- ── 2. Clear previous policies ──────────────────────────────────────────────
DROP POLICY IF EXISTS "itinerary_items" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can read itinerary" ON public.itinerary_items;
DROP POLICY IF EXISTS "Anyone signed in can read itinerary" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can insert itinerary" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can update itinerary" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can delete itinerary" ON public.itinerary_items;

-- ── 3. Read: Anyone signed in can read itinerary (Allows trip code preview & copy)
CREATE POLICY "Anyone signed in can read itinerary"
  ON public.itinerary_items
  FOR SELECT
  TO authenticated
  USING (true);

-- ── 4. Insert: members on the trip ──────────────────────────────────────────
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

-- ── 5. Update: members on the trip ──────────────────────────────────────────
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

-- ── 6. Delete: members on the trip ──────────────────────────────────────────
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

-- ── 7. Secure RPC to preview and copy itinerary by trip code ────────────────
CREATE OR REPLACE FUNCTION public.preview_trip_by_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_items jsonb;
BEGIN
  SELECT id, title, destination, code, start_date, end_date, image_url
    INTO v_trip
    FROM public.trips
   WHERE lower(trim(code)) = lower(trim(p_code))
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(jsonb_agg(
           jsonb_build_object(
             'dayIndex', coalesce(day_index, 1),
             'time', coalesce(time_label, '10:00 AM'),
             'title', coalesce(title, 'Stop'),
             'description', coalesce(description, ''),
             'location', coalesce(location, '')
           ) ORDER BY day_index, time_label
         ), '[]'::jsonb)
    INTO v_items
    FROM public.itinerary_items
   WHERE trip_id = v_trip.id;

  RETURN jsonb_build_object(
    'trip', jsonb_build_object(
      'id', v_trip.id,
      'title', v_trip.title,
      'destination', v_trip.destination,
      'code', v_trip.code,
      'startDate', v_trip.start_date,
      'endDate', v_trip.end_date,
      'image', coalesce(v_trip.image_url, 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80')
    ),
    'stops', v_items
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_trip_by_code(text) TO authenticated, anon;
