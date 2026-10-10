-- ==============================================================================
-- Migration : Ajout du champ Surclassement aux Candidats en Détection
-- Date : 2026-09-16
-- ==============================================================================

ALTER TABLE public.trial_candidates 
ADD COLUMN IF NOT EXISTS surclassement VARCHAR(10) DEFAULT '0C';

COMMENT ON COLUMN public.trial_candidates.surclassement IS 'Surclassement éventuel du joueur (0C, +1C, +2C, +3C)';

CREATE INDEX IF NOT EXISTS idx_trial_candidates_surclassement 
ON public.trial_candidates(surclassement);
