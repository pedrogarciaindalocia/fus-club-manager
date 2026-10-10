-- Fix RLS for user_profiles so that admins can update other profiles (fixes the job_title saving issue)
CREATE POLICY "user_profiles_update_admin" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (public.is_club_admin());

-- Create push_tokens table for React Native Expo tokens
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_select_own" ON public.push_tokens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "push_tokens_insert_own" ON public.push_tokens
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_tokens_update_own" ON public.push_tokens
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_tokens_delete_own" ON public.push_tokens
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Enable Realtime for critical tables (matches, user_profiles, user_permissions_overrides)
-- Note: supabase_realtime publication must exist.
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
  ELSE
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_permissions_overrides;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignorer si la table est déjà dans la publication
END $$;
