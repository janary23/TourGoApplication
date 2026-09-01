-- Add image_url to chat_messages (for image messages in chat)
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url to poll_options (for image options in polls)
ALTER TABLE public.poll_options
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create a storage bucket for trip media (images)
-- Run this in Supabase Dashboard > Storage > New Bucket
-- Bucket name: trip-media, Public: true
-- OR run via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-media', 'trip-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to trip-media
CREATE POLICY "Authenticated users can upload trip media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'trip-media');

CREATE POLICY "Anyone can view trip media"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'trip-media');

CREATE POLICY "Users can delete their own trip media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'trip-media' AND auth.uid()::text = (storage.foldername(name))[1]);
