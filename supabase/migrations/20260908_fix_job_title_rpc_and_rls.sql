-- ============================================================
-- Migration: Fix intitulé de poste (job_title)
-- 1. Mise à jour de la RPC get_all_users pour inclure job_title
-- 2. Correction de la politique RLS user_profiles pour super_admin
-- ============================================================

-- 1. Mise à jour de la fonction get_all_users
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  system_role text,
  is_active boolean,
  job_title text,
  phone_number text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    au.id,
    au.email,
    COALESCE(up.full_name, au.raw_user_meta_data->>'full_name', 'Utilisateur') AS full_name,
    COALESCE(up.avatar_url, '') AS avatar_url,
    COALESCE(up.system_role, 'viewer') AS system_role,
    COALESCE(up.is_active, true) AS is_active,
    up.job_title,
    up.phone_number
  FROM auth.users au
  LEFT JOIN public.user_profiles up ON up.id = au.id
  ORDER BY au.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO service_role;

-- 2. Helper: vérifie si l'utilisateur courant est super_admin ou admin via system_role
CREATE OR REPLACE FUNCTION public.is_system_admin()
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
      AND system_role IN ('super_admin', 'admin')
  );
$$;

-- 3. Drop and recreate RLS policies for user_profiles to allow super_admin to see and update all
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;

-- Les super_admin et admin voient tous les profils
CREATE POLICY "user_profiles_select_own" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (default_club_id = public.get_my_club_id() AND public.is_system_admin())
  );

-- Les super_admin et admin peuvent modifier tous les profils
CREATE POLICY "user_profiles_update_own" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR public.is_system_admin()
  )
  WITH CHECK (
    id = auth.uid()
    OR public.is_system_admin()
  );
