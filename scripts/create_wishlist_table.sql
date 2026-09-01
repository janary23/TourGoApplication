-- Create wishlist_items table in Supabase (Idempotent script)
-- Safe to run multiple times in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  destination_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, destination_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- 1. Policy: Users can only select their own wishlist items
DROP POLICY IF EXISTS "Users can view their own wishlist items" ON public.wishlist_items;
CREATE POLICY "Users can view their own wishlist items"
  ON public.wishlist_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Policy: Users can only insert their own wishlist items
DROP POLICY IF EXISTS "Users can insert their own wishlist items" ON public.wishlist_items;
CREATE POLICY "Users can insert their own wishlist items"
  ON public.wishlist_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Policy: Users can only delete their own wishlist items
DROP POLICY IF EXISTS "Users can delete their own wishlist items" ON public.wishlist_items;
CREATE POLICY "Users can delete their own wishlist items"
  ON public.wishlist_items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
