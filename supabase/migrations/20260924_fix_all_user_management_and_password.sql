-- ==============================================================================
-- FIX COMPLET : GESTION DES UTILISATEURS, MOTS DE PASSE, AUDIT LOGS & RLS
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor)
-- ==============================================================================

-- 1. EXTENSION PGCRYPTO POUR LE HACHAGE BCRYPT DES MOTS DE PASSE
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. STRUCTURE TABLE USER_PROFILES (Colonnes nécessaires)
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS job_title VARCHAR(150);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS system_role VARCHAR(50) DEFAULT 'viewer';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. MISE À JOUR DU HELPER IS_CLUB_ADMIN POUR RECONNAÎTRE TOUS LES RÔLES ADMINS
CREATE OR REPLACE FUNCTION public.is_club_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND (
        system_role IN ('super_admin', 'admin', 'scout_admin', 'direction', 'technical_director')
        OR system_role ILIKE '%admin%'
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'super_admin')
  );
$$;

-- 4. FONCTION RPC DE MODIFICATION DE MOT DE PASSE (ADMIN)
CREATE OR REPLACE FUNCTION public.admin_update_user_password(
  target_user_id uuid,
  new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  calling_user_id uuid;
  caller_role text;
BEGIN
  -- Vérification authentification
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Non autorisé: Utilisateur non authentifié';
  END IF;

  -- Vérification rôle admin
  SELECT system_role INTO caller_role
  FROM public.user_profiles
  WHERE id = calling_user_id;

  IF caller_role NOT IN ('super_admin', 'admin', 'scout_admin', 'direction', 'technical_director') 
     AND NOT public.is_club_admin() THEN
    RAISE EXCEPTION 'Accès refusé: Seuls les administrateurs peuvent modifier les mots de passe';
  END IF;

  -- Validation longueur mot de passe
  IF new_password IS NULL OR length(trim(new_password)) < 6 THEN
    RAISE EXCEPTION 'Le mot de passe doit contenir au moins 6 caractères';
  END IF;

  -- Mise à jour dans auth.users
  UPDATE auth.users
  SET 
    encrypted_password = extensions.crypt(trim(new_password), extensions.gen_salt('bf', 10)),
    updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur introuvable dans auth.users (ID: %)', target_user_id;
  END IF;

  -- Réinitialisation du flag de changement obligatoire
  BEGIN
    UPDATE public.user_profiles
    SET force_password_change = false,
        updated_at = now()
    WHERE id = target_user_id;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Mot de passe mis à jour avec succès',
    'user_id', target_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_password(uuid, text) TO service_role;

-- 5. TABLES USER_SESSIONS & AUDIT_LOGS
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email VARCHAR(255),
    user_role VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    device VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    login_at TIMESTAMPTZ DEFAULT NOW(),
    logout_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    module VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    description TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(50) DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_select_sessions" ON public.user_sessions;
CREATE POLICY "allow_select_sessions" ON public.user_sessions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "allow_insert_sessions" ON public.user_sessions;
CREATE POLICY "allow_insert_sessions" ON public.user_sessions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "allow_update_sessions" ON public.user_sessions;
CREATE POLICY "allow_update_sessions" ON public.user_sessions FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "allow_select_audit_logs" ON public.audit_logs;
CREATE POLICY "allow_select_audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "allow_insert_audit_logs" ON public.audit_logs;
CREATE POLICY "allow_insert_audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 6. POLITIQUES RLS SUR USER_PROFILES ET CATEGORY_ASSIGNMENTS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_profiles_admin_manage" ON public.user_profiles;
CREATE POLICY "user_profiles_admin_manage" ON public.user_profiles
  FOR ALL TO authenticated
  USING (public.is_club_admin() OR id = auth.uid())
  WITH CHECK (public.is_club_admin() OR id = auth.uid());

ALTER TABLE public.user_category_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_category_assignments_admin_all" ON public.user_category_assignments;
CREATE POLICY "user_category_assignments_admin_all" ON public.user_category_assignments
  FOR ALL TO authenticated
  USING (public.is_club_admin() OR user_id = auth.uid())
  WITH CHECK (public.is_club_admin() OR user_id = auth.uid());

-- 7. RECHARGEMENT DU CACHE DE L'API POSTGREST
NOTIFY pgrst, 'reload schema';
