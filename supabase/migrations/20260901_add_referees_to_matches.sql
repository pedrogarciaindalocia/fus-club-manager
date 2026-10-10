-- Migration: Add referee columns to matches table
-- Date: 2026-09-01

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS referee_central_id BIGINT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS referee_assistant1_id BIGINT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS referee_assistant2_id BIGINT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS referee_fourth_id BIGINT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS referees_assigned JSONB;

-- Comments
COMMENT ON COLUMN public.matches.referee_central_id IS 'ID de l arbitre central';
COMMENT ON COLUMN public.matches.referee_assistant1_id IS 'ID du premier arbitre assistant';
COMMENT ON COLUMN public.matches.referee_assistant2_id IS 'ID du deuxieme arbitre assistant';
COMMENT ON COLUMN public.matches.referee_fourth_id IS 'ID du quatrieme arbitre / VAR';
COMMENT ON COLUMN public.matches.referees_assigned IS 'Objet JSON de secours contenant la liste complete des arbitres assignes';
