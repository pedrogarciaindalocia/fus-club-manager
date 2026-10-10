-- ==============================================================================
-- Migration : Ajout Recruteur Référent & Nouveaux Rôles Métiers (fus-dashboard)
-- Date : 2026-09-05
-- Auteur : Chef de Projet / Équipe Technique FUS
-- ==============================================================================

-- 1. Extension de la table des candidats en détection & recrutement
ALTER TABLE public.trial_candidates 
ADD COLUMN IF NOT EXISTS recruiter_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recruiter_name VARCHAR(150);

COMMENT ON COLUMN public.trial_candidates.discovering_scout_id IS 'Identifiant du scout ayant détecté le joueur sur le terrain';
COMMENT ON COLUMN public.trial_candidates.discovering_scout_name IS 'Nom du scout ayant observé le joueur sur le terrain';
COMMENT ON COLUMN public.trial_candidates.recruiter_id IS 'Identifiant du recruteur en charge du dossier administratif';
COMMENT ON COLUMN public.trial_candidates.recruiter_name IS 'Nom du recruteur référent du club';

-- 2. Insertion / Mise à jour des rôles système dans public.roles
INSERT INTO public.roles (name, description) VALUES
('technical_director', 'Directeur Technique, supervision globale sportive et transversale'),
('medical', 'Staff Médical (Médecin, Infirmier, Kinésithérapeute) avec accès aux bilans physiques et blessures'),
('scout', 'Scout & Cellule Recrutement, prospection et gestion des candidats'),
('recruiter', 'Recruteur / Chargé de négociation et suivi contractuel des recrues')
ON CONFLICT (name) DO NOTHING;

-- 3. Index pour l'optimisation des requêtes de filtrage sur la cellule recrutement
CREATE INDEX IF NOT EXISTS idx_trial_candidates_scout ON public.trial_candidates(discovering_scout_id);
CREATE INDEX IF NOT EXISTS idx_trial_candidates_recruiter ON public.trial_candidates(recruiter_id);
