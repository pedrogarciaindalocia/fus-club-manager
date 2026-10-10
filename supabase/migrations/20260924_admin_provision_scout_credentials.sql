-- ==============================================================================
-- Migration: Admin Provision Scout Credentials RPC & Force Password Change (Corrigée)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Garantir que la colonne force_password_change existe sur user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT false;

-- Fonction RPC pour provisionner ou mettre à jour les identifiants d'un Scout avec mot de passe haché
CREATE OR REPLACE FUNCTION public.admin_provision_scout_credentials(
  target_user_id uuid,
  temp_password text,
  target_email text,
  target_full_name text DEFAULT NULL,
  target_phone text DEFAULT NULL,
  target_role text DEFAULT 'scout_manager'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensionssi on la ssu
AS $$
DECLARE
  calling_user_id uuid;
  final_email text;
  final_name text;
  hashed_pwd text;
  actual_user_id uuid;
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Non autorisé: Utilisateur non authentifié';
  END IF;

  IF temp_password IS NULL OR length(trim(temp_password)) < 6 THEN
    RAISE EXCEPTION 'Le mot de passe temporaire doit contenir au moins 6 caractères';
  END IF;

  final_email := lower(trim(target_email));
  IF final_email IS NULL OR final_email = '' THEN
    RAISE EXCEPTION 'Email ou identifiant de connexion obligatoire';
  END IF;

  final_name := COALESCE(trim(target_full_name), 'Scout FUS');
  hashed_pwd := extensions.crypt(trim(temp_password), extensions.gen_salt('bf', 10));

  -- Détecter si l'utilisateur existe déjà par email ou par ID
  SELECT id INTO actual_user_id FROM auth.users WHERE lower(email) = final_email LIMIT 1;
  
  IF actual_user_id IS NULL AND target_user_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
      actual_user_id := target_user_id;
    END IF;
  END IF;

  -- 1. Insérer ou mettre à jour dans auth.users avec mot de passe haché bcrypt
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
      jsonb_build_object('full_name', final_name), false
    );

    -- Insérer dans auth.identities pour permettre la connexion GoTrue
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      actual_user_id::text,
      actual_user_id,
      jsonb_build_object('sub', actual_user_id::text, 'email', final_email),
      'email',
      now(),
      now(),
      now()
    ) ON CONFLICT (provider, id) DO NOTHING;
  END IF;

  -- 2. Insérer ou mettre à jour dans user_profiles avec force_password_change = true (PAS de colonne email)
  INSERT INTO public.user_profiles (
    id, full_name, phone_number, system_role, job_title, force_password_change, is_active, updated_at
  ) VALUES (
    actual_user_id,
    final_name,
    target_phone,
    COALESCE(target_role, 'scout_manager'),
    CASE 
      WHEN target_role = 'scout_admin' THEN 'Scout Admin'
      WHEN target_role = 'scout_manager' THEN 'Scout Manager'
      WHEN target_role = 'scout_editor' THEN 'Scout Éditeur'
      WHEN target_role = 'scout_user' THEN 'Scout User'
      ELSE 'Scout Manager'
    END,
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

  -- 3. Synchroniser la table scouts
  IF EXISTS (SELECT 1 FROM public.scouts WHERE id = actual_user_id OR lower(email) = final_email) THEN
    UPDATE public.scouts
    SET 
      email = final_email,
      phone = COALESCE(target_phone, scouts.phone),
      full_name = final_name,
      role_title = CASE 
        WHEN target_role = 'scout_admin' THEN 'Scout Admin'
        WHEN target_role = 'scout_manager' THEN 'Scout Manager'
        WHEN target_role = 'scout_editor' THEN 'Scout Éditeur'
        WHEN target_role = 'scout_user' THEN 'Scout User'
        ELSE scouts.role_title
      END,
      updated_at = now()
    WHERE id = actual_user_id OR lower(email) = final_email;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Compte scout provisionné avec succès',
    'user_id', actual_user_id,
    'email', final_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_provision_scout_credentials(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_provision_scout_credentials(uuid, text, text, text, text, text) TO service_role;
