-- scripts/create_community_posts_table.sql
-- TourGo Social Community Posts & Itinerary Adoption Schema

-- 1. Community Posts Table
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id TEXT NOT NULL,
  content TEXT NOT NULL,
  location TEXT,
  photos TEXT[] DEFAULT '{}',
  likes_count INT DEFAULT 0,
  loves_count INT DEFAULT 0,
  wows_count INT DEFAULT 0,
  adoptions_count INT DEFAULT 0,
  privacy TEXT DEFAULT 'public',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Post Reactions Table
CREATE TABLE IF NOT EXISTS public.community_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT CHECK (reaction_type IN ('like', 'love', 'wow')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 3. Post Comments Table
CREATE TABLE IF NOT EXISTS public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

-- 5. Public read policies
CREATE POLICY "Anyone can view public community posts"
  ON public.community_posts FOR SELECT USING (privacy = 'public');

CREATE POLICY "Anyone can view comments"
  ON public.community_comments FOR SELECT USING (true);

CREATE POLICY "Anyone can view reactions"
  ON public.community_reactions FOR SELECT USING (true);

-- 6. Authenticated write policies
CREATE POLICY "Authenticated users can create posts"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authenticated users can react"
  ON public.community_reactions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can comment"
  ON public.community_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);
