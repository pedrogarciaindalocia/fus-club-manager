-- ==============================================================================
-- Migration : Ajout des colonnes Rapport du Joueur dans trial_candidates
-- Date : 2026-09-17
-- ==============================================================================

ALTER TABLE public.trial_candidates 
ADD COLUMN IF NOT EXISTS is_upgraded_category BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS upgraded_categories_count INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_first_time_seen BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS potential_rating NUMERIC(4,1) DEFAULT 7.5,
ADD COLUMN IF NOT EXISTS performance_rating NUMERIC(4,1) DEFAULT 7.0,
ADD COLUMN IF NOT EXISTS is_starter BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS team_formation VARCHAR(50) DEFAULT '4-3-3',
ADD COLUMN IF NOT EXISTS scout_state_decision VARCHAR(50) DEFAULT 'to_follow',
ADD COLUMN IF NOT EXISTS information_source VARCHAR(50) DEFAULT 'terrain',
ADD COLUMN IF NOT EXISTS information_source_person TEXT;

COMMENT ON COLUMN public.trial_candidates.is_upgraded_category IS 'Indique si le joueur opère en catégorie surclassée';
COMMENT ON COLUMN public.trial_candidates.upgraded_categories_count IS 'Nombre de catégories de surclassement (1, 2, 3, 4)';
COMMENT ON COLUMN public.trial_candidates.is_first_time_seen IS 'Est-ce que le joueur est vu/observé pour la première fois';
COMMENT ON COLUMN public.trial_candidates.potential_rating IS 'Évaluation du potentiel (1 à 10)';
COMMENT ON COLUMN public.trial_candidates.performance_rating IS 'Évaluation de la performance actuelle (1 à 10)';
COMMENT ON COLUMN public.trial_candidates.is_starter IS 'Statut de titularisation (true = titulaire, false = remplaçant)';
COMMENT ON COLUMN public.trial_candidates.team_formation IS 'Système / formation tactique de son équipe (ex: 4-3-3, 4-2-3-1)';
COMMENT ON COLUMN public.trial_candidates.scout_state_decision IS 'État décisionnel du scout (invitation_test, recruit_now, to_follow)';
COMMENT ON COLUMN public.trial_candidates.information_source IS 'Source d''information (terrain, recommandation_interne, recommandation_externe)';
COMMENT ON COLUMN public.trial_candidates.information_source_person IS 'Nom et prénom de la personne source d''information';

CREATE INDEX IF NOT EXISTS idx_trial_candidates_scout_decision 
ON public.trial_candidates(scout_state_decision);
