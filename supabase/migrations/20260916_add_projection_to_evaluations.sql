-- ==============================================================================
-- Migration : Ajout du champ Projection aux Évaluations de Candidats
-- Date : 2026-09-16
-- ==============================================================================

ALTER TABLE public.candidate_evaluations 
ADD COLUMN IF NOT EXISTS projection TEXT;

COMMENT ON COLUMN public.candidate_evaluations.projection IS 'Projection d''évolution du joueur au FUS (rapport de scout)';

-- Les champs strengths et weaknesses existent déjà, on ajoute juste la projection.
