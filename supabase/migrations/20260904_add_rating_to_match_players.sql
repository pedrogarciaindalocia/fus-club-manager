-- ─────────────────────────────────────────────────────────────
-- Migration: Add rating and rating_comment to match_players
-- Allows coaches and staff to rate player performance (1-10) in friendly matches
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.match_players 
ADD COLUMN IF NOT EXISTS rating NUMERIC(3,1) NULL;

ALTER TABLE public.match_players 
ADD COLUMN IF NOT EXISTS rating_comment TEXT NULL;

COMMENT ON COLUMN public.match_players.rating IS 'Performance rating (1-10) awarded in friendly matches.';
COMMENT ON COLUMN public.match_players.rating_comment IS 'Qualitative feedback or coach observations for the match.';
