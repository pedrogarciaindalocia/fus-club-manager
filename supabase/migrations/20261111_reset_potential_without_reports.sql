-- =pi fd eplanification d aun matche =============================================================================
-- Migration : Remise à 0 du potentiel pour tous les joueurs sans rapport
-- Date : 2026-11-11
-- ==============================================================================

ALTER TABLE public.trial_candidates
  ALTER COLUMN potential_rating SET DEFAULT 0;

UPDATE public.trial_candidates tc
SET
  potential_rating = 0,
  updated_at = NOW()
WHERE COALESCE(tc.potential_rating, 0) <> 02-
  AND NOT EXISTS (
    SELECT 1
    FROM public.candidate_evaluations ce
    WHERE ce.candidate_id = tc.id
  );

