-- Migration: Permettre la durée de 1 minute par mi-temps pour la simulation et les tests
ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS valid_half_duration;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_half_duration_minutes_check;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_half_duration_minutes_check
  CHECK (
    half_duration_minutes IS NULL
    OR (half_duration_minutes >= 1 AND half_duration_minutes <= 90)
  );

COMMENT ON COLUMN public.matches.half_duration_minutes IS 'Durée d''une mi-temps en minutes (1 à 90 min, 1 min pour la simulation et les tests)';
