-- Run this in your Supabase SQL Editor to create the avatars storage bucket
-- and allow authenticated users to upload/read their own avatars.

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow authenticated users to upload to avatars bucket
CREATE POLICY "Avatar upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'avatars'
  );

-- 3. Allow anyone to read avatars (public bucket)
CREATE POLICY "Avatar read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- 4. Allow users to update their own avatars (upsert)
CREATE POLICY "Avatar update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

-- 5. Allow users to delete their own avatars
CREATE POLICY "Avatar delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');
