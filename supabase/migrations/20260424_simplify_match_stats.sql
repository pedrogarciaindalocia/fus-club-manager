-- Mitimle lin de live trakin ggration to simplify match_stats and player_match_stats based on raw data tracking request
-- ONLY keep raw base events: Goals, Assists, Substitutions, Cards

-- 1. Simplify player_match_stats
-- Drop unnecessary detailed stats
ALTER TABLE public.player_match_stats
DROP COLUMN IF EXISTS shots,
DROP COLUMN IF EXISTS passes,
DROP COLUMN IF EXISTS tackles,
DROP COLUMN IF EXISTS interceptions,
DROP COLUMN IF EXISTS dribbles;

-- 2. Simplify match_stats
-- Drop unnecessary detailed team stats (possession, shots, etc. usually calculated from advanced video analysis, not raw live tracking)
ALTER TABLE public.match_stats
DROP COLUMN IF EXISTS possession,
DROP COLUMN IF EXISTS shots,
DROP COLUMN IF EXISTS shots_on_target,
DROP COLUMN IF EXISTS corners,
DROP COLUMN IF EXISTS fouls,
DROP COLUMN IF EXISTS offsides,
DROP COLUMN IF EXISTS passesDROP COLUMN IF EXISTS duels_won;

-- Note: We keep yellow_cards and red_cards on match_stats as aggregate raw totals if needed,
-- but usually they are derived from match_events.
