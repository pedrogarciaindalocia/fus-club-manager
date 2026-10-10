-- Add club_id to blog_categories and blog_posts
-- Required because blogService filters by club_id but the column was missing

-- 1. blog_categories
ALTER TABLE public.blog_categories
  ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE;

-- Assign existing categories to FUS Rabat (default club)
UPDATE public.blog_categories
  SET club_id = '45642829-a3d7-48de-afdd-3c45a1ced474'
  WHERE club_id IS NULL;

-- Drop old global UNIQUE on name; replace with per-club unique
ALTER TABLE public.blog_categories
  DROP CONSTRAINT IF EXISTS blog_categories_name_key;

ALTER TABLE public.blog_categories
  ADD CONSTRAINT blog_categories_name_club_unique UNIQUE (name, club_id);

-- 2. blog_posts
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE;

-- Assign existing posts to FUS Rabat
UPDATE public.blog_posts
  SET club_id = '45642829-a3d7-48de-afdd-3c45a1ced474'
  WHERE club_id IS NULL;

-- Index for fast club-scoped queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_club_id   ON public.blog_posts (club_id);
CREATE INDEX IF NOT EXISTS idx_blog_categories_club_id ON public.blog_categories (club_id);

-- Keep RLS off (already done in previous migrations)
ALTER TABLE public.blog_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts      DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.blog_categories TO anon, authenticated, service_role;
GRANT ALL ON public.blog_posts      TO anon, authenticated, service_role;
