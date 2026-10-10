-- Migration: Ajout du champ 'job_title' (Intitulé de Poste) sur la table user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS job_title VARCHAR(150);

-- Commentaires d'explication
COMMENT ON COLUMN public.user_profiles.job_title IS 'Intitulé de poste officiel (ex: Entraîneur U15, Directeur Technique, Médecin du Club)';
