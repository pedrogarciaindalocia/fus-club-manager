-- ==============================================================================
-- 🇲🇦 FUS CLUB — DURCISSEMENT DE SÉCURITÉ MAJEUR (SAST & RLS COMPLIANCE)
-- Date: 2026-10-24
-- Description : 
--   1. Révocation des accès anonymes (anon) sur les fonctions administratives
--   2. Verrouillage strict des fonctions RPC SECURITY DEFINER (contrôle is_club_admin)
--   3. Protection anti-élévation de privilèges sur public.user_profiles
--   4. Sécurisation des données de recrutement (candidats mineurs, scouts, évaluations)
--   5. Sécurisation des tables audit_logs et user_sessions
--   6. Révocation des privilèges globaux excessifs accordés à anon
-- ==============================================================================

-- ── 1. ASSAINISSEMENT DES PRIVILÈGES GLOBAUX DU RÔLE ANON ──────────────────
-- Révocation du grant universel accidentel sur le schéma public
REVOKE ALL PRIVILEGES ON SCHEMA public FROM anon;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ── 2. SÉCURISATION DE LA RPC admin_delete_user ────────────────────────────
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid, text);

CREATE OR REPLACE FUNCTION public.admin_delete_user(
  target_user_id uuid,
  target_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  calling_user_id uuid;
  caller_is_admin boolean;
  resolved_email text;
BEGIN
  calling_user_id := auth.uid();
  resolved_email := lower(trim(COALESCE(target_email, '')));

  -- Contrôle strict d'autorisation : Service Role OU Administrateur Club
  IF auth.role() <> 'service_role' THEN
    IF calling_user_id IS NULL THEN
      RAISE EXCEPTION 'Non autorisé: Utilisateur non authentifié';
    END IF;

    caller_is_admin := public.is_club_admin();
    IF NOT caller_is_admin THEN
      RAISE EXCEPTION 'Accès refusé: Seuls les administrateurs peuvent supprimer un utilisateur';
    END IF;
  END IF;

  -- Résolution de l'adresse email si non fournie
  IF resolved_email = '' AND target_user_id IS NOT NULL THEN
    SELECT lower(trim(email)) INTO resolved_email FROM public.scouts WHERE id = target_user_id;
  END IF;
  IF (resolved_email = '' OR resolved_email IS NULL) AND target_user_id IS NOT NULL THEN
    SELECT lower(trim(email)) INTO resolved_email FROM public.user_profiles WHERE id = target_user_id;
  END IF;

  -- Protection : Empêcher la suppression accidentelle de son propre compte administrateur
  IF calling_user_id IS NOT NULL AND target_user_id = calling_user_id THEN
    RAISE EXCEPTION 'Action interdite: Vous ne pouvez pas supprimer votre propre compte administrateur en cours de session';
  END IF;

  -- 1. Libérer en cascade les joueurs associés
  UPDATE public.trial_candidates
  SET 
    assigned_scout_id = NULL,
    assigned_scout_name = NULL,
    recruiter_id = NULL,
    recruiter_name = NULL
  WHERE assigned_scout_id = target_user_id 
     OR recruiter_id = target_user_id;

  -- 2. Supprimer les affectations et permissions
  DELETE FROM public.user_category_assignments WHERE user_id = target_user_id;
  DELETE FROM public.user_permissions_overrides WHERE user_id = target_user_id;
  DELETE FROM public.user_sessions WHERE user_id = target_user_id;

  -- 3. Supprimer de public.scouts
  DELETE FROM public.scouts 
  WHERE id = target_user_id 
     OR (resolved_email <> '' AND lower(email) = resolved_email);

  -- 4. Supprimer de public.user_profiles
  DELETE FROM public.user_profiles 
  WHERE id = target_user_id 
     OR (resolved_email <> '' AND lower(email) = resolved_email);

  -- 5. Supprimer du compte auth.users
  DELETE FROM auth.users 
  WHERE id = target_user_id 
     OR (resolved_email <> '' AND lower(email) = resolved_email);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Utilisateur et scout définitivement supprimés',
    'user_id', target_user_id,
    'email', resolved_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid, text) TO authenticated, service_role;


-- ── 3. SÉCURISATION DE admin_provision_user_credentials ────────────────────
DROP FUNCTION IF EXISTS public.admin_provision_user_credentials(uuid, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.admin_provision_user_credentials(
  target_user_id uuid DEFAULT NULL,
  temp_password text DEFAULT NULL,
  target_email text DEFAULT NULL,
  target_full_name text DEFAULT NULL,
  target_phone text DEFAULT NULL,
  target_role text DEFAULT 'viewer',
  target_job_title text DEFAULT 'Collaborateur'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  calling_user_id uuid;
  caller_is_admin boolean;
  caller_role text;
  final_email text;
  final_name text;
  final_role text;
  final_title text;
  hashed_pwd text;
  actual_user_id uuid;
BEGIN
  calling_user_id := auth.uid();

  -- Contrôle strict d'autorisation
  IF auth.role() <> 'service_role' THEN
    IF calling_user_id IS NULL THEN
      RAISE EXCEPTION 'Non autorisé: Utilisateur non authentifié';
    END IF;

    caller_is_admin := public.is_club_admin();
    IF NOT caller_is_admin THEN
      RAISE EXCEPTION 'Accès refusé: Seuls les administrateurs du club peuvent provisionner des utilisateurs';
    END IF;

    -- Si le demandeur tente de créer ou promouvoir un 'super_admin', vérifier qu'il est lui-même super_admin
    SELECT system_role INTO caller_role FROM public.user_profiles WHERE id = calling_user_id;
    IF lower(trim(target_role)) = 'super_admin' AND caller_role <> 'super_admin' THEN
      RAISE EXCEPTION 'Accès refusé: Seul un super_admin peut attribuer le rôle super_admin';
    END IF;
  END IF;

  IF temp_password IS NULL OR length(trim(temp_password)) < 6 THEN
    RAISE EXCEPTION 'Le mot de passe temporaire doit contenir au moins 6 caractères';
  END IF;

  final_email := lower(trim(target_email));
  IF final_email IS NULL OR final_email = '' THEN
    RAISE EXCEPTION 'Email ou identifiant de connexion obligatoire';
  END IF;

  final_name := COALESCE(trim(target_full_name), 'Collaborateur FUS');
  final_role := COALESCE(trim(target_role), 'viewer');
  final_title := COALESCE(trim(target_job_title), 'Collaborateur');
  hashed_pwd := extensions.crypt(trim(temp_password), extensions.gen_salt('bf', 10));

  SELECT id INTO actual_user_id FROM auth.users WHERE lower(email) = final_email LIMIT 1;
  IF actual_user_id IS NULL AND target_user_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
      actual_user_id := target_user_id;
    END IF;
  END IF;

  IF actual_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET 
      encrypted_password = hashed_pwd,
      email = final_email,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_user_meta_data = jsonb_build_object('full_name', final_name, 'system_role', final_role),
      updated_at = now()
    WHERE id = actual_user_id;
  ELSE
    actual_user_id := COALESCE(target_user_id, gen_random_uuid());
    
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      actual_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      final_email, hashed_pwd,
      now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', final_name, 'system_role', final_role), false
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      actual_user_id::text,
      actual_user_id,
      jsonb_build_object('sub', actual_user_id::text, 'email', final_email),
      'email', now(), now(), now()
    )
    ON CONFLICT (provider, identity_data) DO UPDATE SET updated_at = now();
  END IF;

  INSERT INTO public.user_profiles (
    id, full_name, phone_number, system_role, job_title, force_password_change, is_active, updated_at
  ) VALUES (
    actual_user_id,
    final_name,
    target_phone,
    final_role,
    final_title,
    true,
    true,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone_number = COALESCE(EXCLUDED.phone_number, user_profiles.phone_number),
    system_role = COALESCE(EXCLUDED.system_role, user_profiles.system_role),
    job_title = EXCLUDED.job_title,
    force_password_change = true,
    is_active = true,
    updated_at = now();

  IF EXISTS (SELECT 1 FROM public.scouts WHERE id = actual_user_id OR lower(email) = final_email) THEN
    UPDATE public.scouts
    SET 
      email = final_email,
      phone = COALESCE(target_phone, scouts.phone),
      full_name = final_name,
      role_title = final_title,
      updated_at = now()
    WHERE id = actual_user_id OR lower(email) = final_email;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Compte utilisateur provisionné avec succès',
    'user_id', actual_user_id,
    'email', final_email,
    'force_password_change', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_provision_user_credentials(uuid, text, text, text, text, text, text) TO authenticated, service_role;


-- ── 4. SÉCURISATION DE admin_provision_scout_credentials ───────────────────
DROP FUNCTION IF EXISTS public.admin_provision_scout_credentials(uuid, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.admin_provision_scout_credentials(
  target_user_id uuid,
  temp_password text,
  target_email text,
  target_full_name text DEFAULT NULL,
  target_phone text DEFAULT NULL,
  target_role text DEFAULT 'scout'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  calling_user_id uuid;
  caller_is_admin boolean;
  final_email text;
  final_name text;
  final_role text;
  hashed_pwd text;
  actual_user_id uuid;
BEGIN
  calling_user_id := auth.uid();

  IF auth.role() <> 'service_role' THEN
    IF calling_user_id IS NULL THEN
      RAISE EXCEPTION 'Non autorisé: Utilisateur non authentifié';
    END IF;

    caller_is_admin := public.is_club_admin();
    IF NOT caller_is_admin THEN
      RAISE EXCEPTION 'Accès refusé: Seuls les administrateurs peuvent provisionner un compte scout';
    END IF;
  END IF;

  IF temp_password IS NULL OR length(trim(temp_password)) < 6 THEN
    RAISE EXCEPTION 'Le mot de passe temporaire doit contenir au moins 6 caractères';
  END IF;

  final_email := lower(trim(target_email));
  IF final_email IS NULL OR final_email = '' THEN
    RAISE EXCEPTION 'Email ou identifiant de connexion obligatoire';
  END IF;

  final_name := COALESCE(trim(target_full_name), 'Scout FUS');
  final_role := COALESCE(trim(target_role), 'scout');
  hashed_pwd := extensions.crypt(trim(temp_password), extensions.gen_salt('bf', 10));

  SELECT id INTO actual_user_id FROM auth.users WHERE lower(email) = final_email LIMIT 1;
  IF actual_user_id IS NULL AND target_user_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
      actual_user_id := target_user_id;
    END IF;
  END IF;

  IF actual_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET 
      encrypted_password = hashed_pwd,
      email = final_email,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = actual_user_id;
  ELSE
    actual_user_id := COALESCE(target_user_id, gen_random_uuid());
    
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      actual_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      final_email, hashed_pwd,
      now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', final_name, 'system_role', final_role), false
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      actual_user_id::text,
      actual_user_id,
      jsonb_build_object('sub', actual_user_id::text, 'email', final_email),
      'email', now(), now(), now()
    )
    ON CONFLICT (provider, identity_data) DO UPDATE SET updated_at = now();
  END IF;

  INSERT INTO public.user_profiles (
    id, full_name, phone_number, system_role, job_title, force_password_change, is_active, updated_at
  ) VALUES (
    actual_user_id,
    final_name,
    target_phone,
    final_role,
    'Scout Régional',
    true,
    true,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone_number = COALESCE(EXCLUDED.phone_number, user_profiles.phone_number),
    system_role = final_role,
    job_title = EXCLUDED.job_title,
    force_password_change = true,
    is_active = true,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Compte scout provisionné avec succès',
    'user_id', actual_user_id,
    'email', final_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_provision_scout_credentials(uuid, text, text, text, text, text) TO authenticated, service_role;


-- ── 5. PROTECTION ANTI-ÉLÉVATION DE PRIVILÈGES SUR USER_PROFILES ───────────
-- Trigger de sécurité : Empêche un utilisateur non-admin de modifier son propre system_role
CREATE OR REPLACE FUNCTION public.protect_user_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.system_role IS DISTINCT FROM NEW.system_role) OR 
     (OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    IF auth.role() <> 'service_role' AND NOT public.is_club_admin() THEN
      RAISE EXCEPTION 'Élévation de privilèges interdite : Seul un administrateur peut modifier le rôle système ou le statut';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_user_profile_privilege_escalation ON public.user_profiles;
CREATE TRIGGER trg_protect_user_profile_privilege_escalation
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.protect_user_profile_privilege_escalation();

-- RLS plus restrictive sur user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_profiles_admin_manage" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;

CREATE POLICY "user_profiles_select_policy" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (true); -- Visibilité des profils pour l'équipe

CREATE POLICY "user_profiles_update_policy" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (public.is_club_admin() OR id = auth.uid())
  WITH CHECK (public.is_club_admin() OR id = auth.uid());


-- ── 6. SÉCURISATION DES DONNÉES DE RECRUTEMENT DE MINEURS ──────────────────
REVOKE ALL ON public.trial_candidates FROM anon;
REVOKE ALL ON public.scouts FROM anon;
REVOKE ALL ON public.candidate_evaluations FROM anon;
REVOKE ALL ON public.recruitment_timeline FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trial_candidates TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scouts TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_evaluations TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_timeline TO authenticated, service_role;

-- trial_candidates
ALTER TABLE public.trial_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to trial_candidates" ON public.trial_candidates;
DROP POLICY IF EXISTS "trial_candidates_auth_access" ON public.trial_candidates;

CREATE POLICY "trial_candidates_auth_access" ON public.trial_candidates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- scouts
ALTER TABLE public.scouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to scouts" ON public.scouts;
DROP POLICY IF EXISTS "scouts_auth_access" ON public.scouts;

CREATE POLICY "scouts_auth_access" ON public.scouts
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- candidate_evaluations
ALTER TABLE public.candidate_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to candidate_evaluations" ON public.candidate_evaluations;
DROP POLICY IF EXISTS "candidate_evaluations_auth_access" ON public.candidate_evaluations;

CREATE POLICY "candidate_evaluations_auth_access" ON public.candidate_evaluations
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- recruitment_timeline
ALTER TABLE public.recruitment_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to recruitment_timeline" ON public.recruitment_timeline;
DROP POLICY IF EXISTS "recruitment_timeline_auth_access" ON public.recruitment_timeline;

CREATE POLICY "recruitment_timeline_auth_access" ON public.recruitment_timeline
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);


-- ── 7. SÉCURISATION DE AUDIT_LOGS ET USER_SESSIONS ─────────────────────────
REVOKE ALL ON public.audit_logs FROM anon;
REVOKE ALL ON public.user_sessions FROM anon;

GRANT SELECT, INSERT ON public.audit_logs TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated, service_role;

-- audit_logs : Seuls les administrateurs peuvent consulter la totalité des traces
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_select_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "allow_insert_audit_logs" ON public.audit_logs;

CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_club_admin());

CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- user_sessions : Chaque utilisateur ne peut voir ou manipuler que ses propres sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_select_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "allow_insert_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "allow_update_sessions" ON public.user_sessions;

CREATE POLICY "user_sessions_select_owner_or_admin" ON public.user_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_club_admin());

CREATE POLICY "user_sessions_insert_owner_or_admin" ON public.user_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_club_admin());

CREATE POLICY "user_sessions_update_owner_or_admin" ON public.user_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_club_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_club_admin());


-- ── 8. RECHARGEMENT DU SCHÉMA POSTGREST ────────────────────────────────────
NOTIFY pgrst, 'reload schema';
