-- ==============================================================================
-- Migration : 20261016_remote_push_tokens_and_notifications.sql
-- User Story : [US-APP-81] Notifications Push Distantes Système (Expo + Supabase)
-- ==============================================================================

-- 1. Table public.push_tokens : Adaptation pour multi-profils (Staff connecté + Supporters anonymes)
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT,
    token TEXT NOT NULL,
    device_type TEXT DEFAULT 'android',
    followed_categories TEXT[] DEFAULT '{}',
    preferences JSONB DEFAULT '{"goals": true, "cards": true, "halfTime": true, "subs": true}'::jsonb,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Si la table existait déjà, ajouter les colonnes manquantes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='push_tokens' AND column_name='device_id') THEN
    ALTER TABLE public.push_tokens ADD COLUMN device_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='push_tokens' AND column_name='followed_categories') THEN
    ALTER TABLE public.push_tokens ADD COLUMN followed_categories TEXT[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='push_tokens' AND column_name='preferences') THEN
    ALTER TABLE public.push_tokens ADD COLUMN preferences JSONB DEFAULT '{"goals": true, "cards": true, "halfTime": true, "subs": true}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='push_tokens' AND column_name='last_seen_at') THEN
    ALTER TABLE public.push_tokens ADD COLUMN last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  -- S'assurer que user_id peut être NULL pour les supporters / invités
  ALTER TABLE public.push_tokens ALTER COLUMN user_id DROP NOT NULL;
END $$;

-- 2. Index unique sur le token pour permettre un UPSERT propre
DROP INDEX IF EXISTS public.push_tokens_token_unique;
CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_token_unique ON public.push_tokens (token);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON public.push_tokens (user_id);
CREATE INDEX IF NOT EXISTS push_tokens_device_id_idx ON public.push_tokens (device_id);

-- 3. Row Level Security (RLS) permissive pour enregistrement par App Mobile
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques restrictives si existantes
DROP POLICY IF EXISTS "push_tokens_select_own" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_insert_own" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_update_own" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_delete_own" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_select_all" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_insert_all" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_update_all" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_delete_all" ON public.push_tokens;

-- Nouvelles politiques universelles (anon et authenticated)
CREATE POLICY "push_tokens_select_all" ON public.push_tokens
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "push_tokens_insert_all" ON public.push_tokens
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "push_tokens_update_all" ON public.push_tokens
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "push_tokens_delete_all" ON public.push_tokens
  FOR DELETE TO anon, authenticated
  USING (true);

-- 4. RPC Function : Enregistrement ou mise à jour sécurisée du Push Token
CREATE OR REPLACE FUNCTION public.register_push_token(
  p_token TEXT,
  p_device_type TEXT DEFAULT 'android',
  p_device_id TEXT DEFAULT NULL,
  p_categories TEXT[] DEFAULT '{}',
  p_preferences JSONB DEFAULT '{"goals": true, "cards": true, "halfTime": true, "subs": true}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.push_tokens (
    token,
    device_type,
    device_id,
    user_id,
    followed_categories,
    preferences,
    updated_at,
    last_seen_at
  )
  VALUES (
    p_token,
    COALESCE(p_device_type, 'unknown'),
    p_device_id,
    v_user_id,
    COALESCE(p_categories, '{}'),
    COALESCE(p_preferences, '{"goals": true, "cards": true, "halfTime": true, "subs": true}'::jsonb),
    NOW(),
    NOW()
  )
  ON CONFLICT (token) DO UPDATE SET
    user_id = COALESCE(v_user_id, push_tokens.user_id),
    device_type = COALESCE(EXCLUDED.device_type, push_tokens.device_type),
    device_id = COALESCE(EXCLUDED.device_id, push_tokens.device_id),
    followed_categories = COALESCE(EXCLUDED.followed_categories, push_tokens.followed_categories),
    preferences = COALESCE(EXCLUDED.preferences, push_tokens.preferences),
    updated_at = NOW(),
    last_seen_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 5. RPC Function : Désinscription d'un token (logout ou désactivation)
CREATE OR REPLACE FUNCTION public.unregister_push_token(
  p_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN FALSE;
  END IF;

  DELETE FROM public.push_tokens WHERE token = p_token;
  RETURN TRUE;
END;
$$;

-- 6. Permissions d'exécution RPC
GRANT EXECUTE ON FUNCTION public.register_push_token TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unregister_push_token TO anon, authenticated, service_role;

-- 7. Droits sur la table
GRANT ALL PRIVILEGES ON TABLE public.push_tokens TO anon, authenticated, service_role;
