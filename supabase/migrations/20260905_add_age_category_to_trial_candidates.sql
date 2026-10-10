-- ==============================================================================
-- Migration : Ajout Catégorie d'Âge Ux aux Candidats en Détection
-- Date : 2026-09-05
-- ==============================================================================

-- 1. Ajout de la colonne age_category si non existante
ALTER TABLE public.trial_candidates 
ADD COLUMN IF NOT EXISTS age_category VARCHAR(50) DEFAULT 'U19';

-- 2. Commentaire descriptif
COMMENT ON COLUMN public.trial_candidates.age_category IS 'Catégorie d''âge du joueur candidat (U13, U14, U15, U16, U17, U18, U19, U21, Senior)';

-- 3. Index d'accélération pour les filtres par catégorie
CREATE INDEX IF NOT EXISTS idx_trial_candidates_age_category 
ON public.trial_candidates(age_category);
