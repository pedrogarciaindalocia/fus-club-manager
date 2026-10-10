CREATE TABLE IF NOT EXISTS public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category_id uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  image_url text
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON public.blog_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON public.blog_posts (category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts (status);

-- Disable RLS (Row Level Security) for blog tables
-- This allows full access without authentication restrictions
ALTER TABLE public.blog_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to anon and authenticated roles
GRANT ALL ON public.blog_categories TO anon, authenticated, service_role;
GRANT ALL ON public.blog_posts TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.blog_categories_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.blog_posts_id_seq TO anon, authenticated;
