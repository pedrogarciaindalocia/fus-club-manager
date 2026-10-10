-- Migration: Mise à jour de la fonction get_all_users pour inclure job_title et phone_number
-- À exécuter dans le SQL Editor du Supabase Dashboard

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
