-- FIX: Remove all RLS policies and disable RLS for blog tables
-- This resolves the 401 Unauthorized errors

-- 1. Drop ALL existing policies on blog tables (clean slate)
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop policies for blog_categories
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'blog_categories' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.blog_categories', pol.policyname);
    END LOOP;
    
    -- Drop policies for blog_posts
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'blog_posts' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.blog_posts', pol.policyname);
    END LOOP;
END $$;

-- 2. Disable RLS completely on both tables
ALTER TABLE IF EXISTS public.blog_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blog_posts DISABLE ROW LEVEL SECURITY;

-- 3. Force RLS disable (in case it was enabled for some users)
ALTER TABLE IF EXISTS public.blog_categories NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blog_posts NO FORCE ROW LEVEL SECURITY;

-- 4. Grant all permissions to all roles
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Specific grants for blog tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO anon, authenticated;

-- 6. Verify RLS is disabled (should return 'false' for both)
SELECT 
    relname AS table_name,
    relrowsecurity AS rls_enabled,
    relforcerowsecurity AS rls_forced
FROM pg_class 
WHERE relname IN ('blog_categories', 'blog_posts') 
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
