-- Create active_day_plans table for 1-minute spontaneous itineraries in Supabase
CREATE TABLE IF NOT EXISTS public.active_day_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  destination TEXT NOT NULL,
  date_str TEXT NOT NULL,
  time_range TEXT,
  group_type TEXT,
  plan_json JSONB NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.active_day_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own day plans" ON public.active_day_plans;
DROP POLICY IF EXISTS "Users can view their own day plans" ON public.active_day_plans;
DROP POLICY IF EXISTS "Users can insert their own day plans" ON public.active_day_plans;
DROP POLICY IF EXISTS "Users can update their own day plans" ON public.active_day_plans;
DROP POLICY IF EXISTS "Users can delete their own day plans" ON public.active_day_plans;

CREATE POLICY "Users can view their own day plans"
  ON public.active_day_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own day plans"
  ON public.active_day_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own day plans"
  ON public.active_day_plans
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own day plans"
  ON public.active_day_plans
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

