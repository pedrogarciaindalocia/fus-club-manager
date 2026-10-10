-- ==============================================================================
-- Migration : Ajout de l'onglet Scout & des Rapports par Pilier sur candidate_evaluations
-- Date : 2026-09-16
-- ==============================================================================

ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS tech_report TEXT;
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS tact_report TEXT;
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS phys_report TEXT;
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS ment_report TEXT;
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS evaluator_id TEXT;
