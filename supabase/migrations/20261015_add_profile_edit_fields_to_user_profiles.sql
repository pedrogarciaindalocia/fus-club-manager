-- Migration: Ajouter et garantir les champs modifiables du profil utilisateur Pro
-- Nom, Prénom, Email, Formation / Fonction / Poste, Photo de profil

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS first_name VARCHAR(150);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_name VARCHAR(150);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS job_title VARCHAR(150);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Initialiser l'email depuis auth.users si non renseigné
DO $$
BEGIN
  UPDATE public.user_profiles up
  SET email = lower(trim(au.email))
  FROM auth.users au
  WHERE up.id = au.id AND (up.email IS NULL OR up.email = '');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
