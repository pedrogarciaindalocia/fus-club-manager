-- Migration: Permettre toutes les durées de mi-temps (ex: 20 min pour match de 40 min, 25 min, etc.)
ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS valid_half_duration;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_half_duration_minutes_check;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_half_duration_minutes_check
  CHECK (
    half_duration_minutes IS NULL
    OR (half_duration_minutes >= 5 AND half_duration_minutes <= 90)
  );

COMMENT ON COLUMN public.matches.half_duration_minutes IS 'Durée d''une mi-temps en minutes (5 à 90 min, par ex. 20 min pour un match de 40 min)';
