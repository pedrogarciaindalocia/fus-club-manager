-- Migration: Automatisation du cycle de vie des matchs [US-DASH-56]
-- Date: 2026-10-03
-- Description:
-- 1. Ajout de la colonne kickoff_at pour horodater le coup d'envoi officiel.
-- 2. Fonction RPC pour terminer automatiquement à T+120 minutes tout match dont le coup d'envoi a été donné
--    et qui n'a pas été clôturé manuellement par l'administrateur.
-- 3. Règle formelle : S'il n'y a pas eu de coup d'envoi, un match ne passe jamais en Live et n'est pas auto-clôturé.

-- 1. Vérification / Création de la colonne kickoff_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'kickoff_at'
  ) THEN
    ALTER TABLE public.matches ADD COLUMN kickoff_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.matches.kickoff_at IS 'Horodatage précis du coup d''envoi donné par l''arbitre/administrateur';

-- 2. Nettoyage préventif des anciens matchs fictivement en direct avant coup d'envoi (pre_match à 0s)
UPDATE public.matches
SET 
  status = 'scheduled',
  live_period = NULL,
  updated_at = NOW()
WHERE status = 'live' 
  AND live_period = 'pre_match' 
  AND (time_elapsed_seconds IS NULL OR time_elapsed_seconds = 0)
  AND kickoff_at IS NULL;

-- 3. Fonction RPC pour terminer automatiquement les matchs 120 minutes après coup d'envoi
CREATE OR REPLACE FUNCTION public.auto_terminate_expired_matches()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_terminated_count INT := 0;
BEGIN
  -- Clôture automatique de tout match live / en pause dont le coup d'envoi a été donné il y a 120 minutes ou plus
  UPDATE public.matches
  SET 
    status = 'finished',
    live_period = 'finished',
    time_elapsed_seconds = GREATEST(COALESCE(time_elapsed_seconds, 0), (COALESCE(half_duration_minutes, 45) * 2 * 60)),
    updated_at = NOW()
  WHERE status IN ('live', 'halftime', 'paused')
    AND (
      -- Règle A : Le coup d'envoi a été donné il y a plus de 120 minutes (7200 s)
      (
        kickoff_at IS NOT NULL 
        AND NOW() >= kickoff_at + interval '120 minutes'
      )
      OR
      -- Règle B : Le chronomètre interne a atteint ou dépassé 120 minutes (7200 s)
      (
        time_elapsed_seconds IS NOT NULL 
        AND time_elapsed_seconds >= 7200
      )
    );

  GET DIAGNOSTICS v_terminated_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'terminated_matches', v_terminated_count,
    'checked_at', NOW()
  );
END;
$$;

-- Permissions d'exécution
GRANT EXECUTE ON FUNCTION public.auto_terminate_expired_matches() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_terminate_expired_matches() TO anon;
GRANT EXECUTE ON FUNCTION public.auto_terminate_expired_matches() TO service_role;
