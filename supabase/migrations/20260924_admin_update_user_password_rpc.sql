-- ==============================================================================
-- Migration: Admin Update User Password RPC & Provisioning Scouts
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. STRUCTURES DE LA TABLE USER_PROFILES (Ajout de toutes les colonnes nécessaires)
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS job_title VARCHAR(150);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS system_role VARCHAR(50) DEFAULT 'viewer';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 3. SUPPRESSION DES ANCIENNES SIGNATURES RPC
DROP FUNCTION IF EXISTS public.admin_update_user_password(uuid, text);
DROP FUNCTION IF EXISTS public.admin_update_user_password(uuid, text, text);
DROP FUNCTION IF EXISTS public.admin_update_user_password(uuid, text, text, text);

-- 4. PROVISIONING INITIAL DES 4 SCOUT MANAGERS DANS AUTH.USERS & USER_PROFILES
DO $$
DECLARE
  scout_rec RECORD;
BEGIN
  FOR scout_rec IN 
    SELECT * FROM (VALUES
      ('a0000000-0000-0000-0000-000000000001'::uuid, 'Mehdi Benatia', 'm.benatia@fus.ma', '+212 6 61 12 34 56', 'scout_manager', 'Scout Manager'),
      ('a0000000-0000-0000-0000-000000000002'::uuid, 'Tarik Sektioui', 't.sektioui@fus.ma', '+212 6 62 23 45 67', 'scout_manager', 'Scout Manager'),
      ('a0000000-0000-0000-0000-000000000003'::uuid, 'Hassan Benabicha', 'h.benabicha@fus.ma', '+212 6 63 34 56 78', 'scout_manager', 'Scout Manager'),
      ('a0000000-0000-0000-0000-000000000004'::uuid, 'Youssef Safri', 'y.safri@fus.ma', '+212 6 64 45 67 89', 'scout_manager', 'Scout Manager')
    ) AS t(id, full_name, email, phone, system_role, job_title)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = scout_rec.id) THEN
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
      ) VALUES (
        scout_rec.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        scout_rec.email, extensions.crypt('Fusc2026!', extensions.gen_salt('bf', 10)),
        now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', scout_rec.full_name), false
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;

    INSERT INTO public.user_profiles (id, full_name, phone_number, system_role, job_title, force_password_change, updated_at)
    VALUES (scout_rec.id, scout_rec.full_name, scout_rec.phone, scout_rec.system_role, scout_rec.job_title, false, now())
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone_number = EXCLUDED.phone_number,
      system_role = EXCLUDED.system_role,
      job_title = EXCLUDED.job_title,
      updated_at = now();
  END LOOP;
END $$;

-- 5. FONCTION RPC DEFINITIVE
CREATE OR REPLACE FUNCTION public.admin_update_user_password(
  target_user_id uuid,
  new_password text,
  target_email text DEFAULT NULL,
  target_full_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  calling_user_id uuid;
  final_email text;
  final_name text;
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Non autorisé: Utilisateur non authentifié';
  END IF;

  IF new_password IS NULL OR length(trim(new_password)) < 6 THEN
    RAISE EXCEPTION 'Le mot de passe doit contenir au moins 6 caractères';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    UPDATE auth.users
    SET 
      encrypted_password = extensions.crypt(trim(new_password), extensions.gen_salt('bf', 10)),
      updated_at = now()
    WHERE id = target_user_id;
  ELSE
    final_email := target_email;
    IF final_email IS NULL OR final_email = '' THEN
      SELECT email INTO final_email FROM public.scouts WHERE id = target_user_id;
    END IF;
    IF final_email IS NULL OR final_email = '' THEN
      SELECT email INTO final_email FROM public.user_profiles WHERE id = target_user_id;
    END IF;

    final_name := target_full_name;
    IF final_name IS NULL OR final_name = '' THEN
      SELECT full_name INTO final_name FROM public.scouts WHERE id = target_user_id;
    END IF;

    IF final_email IS NULL OR final_email = '' THEN
      RAISE EXCEPTION 'Impossible de créer le compte: email manquant pour l''ID %', target_user_id;
    END IF;

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      target_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      lower(trim(final_email)), extensions.crypt(trim(new_password), extensions.gen_salt('bf', 10)),
      now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', COALESCE(final_name, final_email)), false
    );
  END IF;

  INSERT INTO public.user_profiles (id, full_name, system_role, job_title, force_password_change, updated_at)
  VALUES (
    target_user_id,
    COALESCE(target_full_name, (SELECT full_name FROM public.scouts WHERE id = target_user_id), 'Utilisateur FUS'),
    'scout_manager',
    COALESCE((SELECT role_title FROM public.scouts WHERE id = target_user_id), 'Scout Manager'),
    false,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    force_password_change = false,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Mot de passe mis à jour avec succès',
    'user_id', target_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_password(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_password(uuid, text, text, text) TO service_role;

-- 6. POLITIQUES RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_profiles_admin_manage" ON public.user_profiles;
CREATE POLICY "user_profiles_admin_manage" ON public.user_profiles
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.user_category_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_category_assignments_admin_all" ON public.user_category_assignments;
CREATE POLICY "user_category_assignments_admin_all" ON public.user_category_assignments
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. RECHARGEMENT DU CACHE POSTGREST
NOTIFY pgrst, 'reload schema';
