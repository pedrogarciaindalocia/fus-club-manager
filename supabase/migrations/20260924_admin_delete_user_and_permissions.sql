-- ==============================================================================
-- 🇲🇦 FUS CLUB - MIGRATION : SUPPRESSION DÉFINITIVE DES UTILISATEURS & SCOUTS
-- Supprime en cascade les profils, les comptes scouts et délie les joueurs
-- ==============================================================================

-- 1. PERMISSIONS TABLES SCOUTS ET USER_PROFILES
GRANT ALL PRIVILEGES ON TABLE public.scouts TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.user_profiles TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.user_category_assignments TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.user_permissions_overrides TO anon, authenticated, service_role;

-- 2. POLITIQUES RLS PERMISSIVES POUR LA SUPPRESSION
DO $$
BEGIN
    -- Policy pour scouts
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'scouts' AND policyname = 'Allow admin and service_role full access to scouts'
    ) THEN
        CREATE POLICY "Allow admin and service_role full access to scouts" 
        ON public.scouts FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
    END IF;

    -- Policy DELETE pour user_profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' AND policyname = 'Allow admin delete user_profiles'
    ) THEN
        CREATE POLICY "Allow admin delete user_profiles" 
        ON public.user_profiles FOR DELETE TO authenticated, service_role USING (true);
    END IF;
END $$;

-- 3. FONCTION RPC DE SUPPRESSION COMPLÈTE
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
  resolved_email text;
BEGIN
  calling_user_id := auth.uid();
  resolved_email := lower(trim(COALESCE(target_email, '')));

  -- Si target_email n'est pas fourni, chercher dans scouts ou user_profiles
  IF resolved_email = '' THEN
    SELECT lower(trim(email)) INTO resolved_email FROM public.scouts WHERE id = target_user_id;
  END IF;
  IF resolved_email = '' OR resolved_email IS NULL THEN
    SELECT lower(trim(email)) INTO resolved_email FROM public.user_profiles WHERE id = target_user_id;
  END IF;

  -- 1. Libérer en cascade les joueurs associés (US-DASH-17)
  UPDATE public.trial_candidates
  SET 
    assigned_scout_id = NULL,
    assigned_scout_name = NULL,
    recruiter_id = NULL,
    recruiter_name = NULL
  WHERE assigned_scout_id = target_user_id 
     OR recruiter_id = target_user_id;

  -- 2. Supprimer les affectations de catégories & permissions
  DELETE FROM public.user_category_assignments WHERE user_id = target_user_id;
  DELETE FROM public.user_permissions_overrides WHERE user_id = target_user_id;

  -- 3. Supprimer de public.scouts
  DELETE FROM public.scouts 
  WHERE id = target_user_id 
     OR (resolved_email <> '' AND lower(email) = resolved_email);

  -- 4. Supprimer de public.user_profiles
  DELETE FROM public.user_profiles 
  WHERE id = target_user_id 
     OR (resolved_email <> '' AND lower(email) = resolved_email);

  -- 5. Supprimer du compte d'authentification auth.users si existant
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

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid, text) TO authenticated, service_role, anon;
