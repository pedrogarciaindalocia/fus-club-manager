-- ==============================================================================
-- Migration : Évaluations Datées de Performance Joueur (0-10, 4 Piliers)
-- Projet : US-PLAYER-156 (fus-dashboard & fus-app)
-- Table : public.player_performance_evaluations
-- Date : 2026-11-14
-- Note : Exploitation stricte des lots Performance Joueur (metric_sets / metric_set_positions),
--        totalement isolée de public.metric_positions et des comptes Scouts.
-- ==============================================================================

-- 1. S'assurer que la fonction helper anti-scout existe
CREATE OR REPLACE FUNCTION public.is_scout_account()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND (
            LOWER(COALESCE(up.system_role, '')) LIKE 'scout%'
            OR LOWER(COALESCE(up.job_title, '')) LIKE '%scout%'
            OR LOWER(COALESCE(up.job_title, '')) LIKE '%détecteur%'
            OR LOWER(COALESCE(up.job_title, '')) LIKE '%detecteur%'
          )
      )
      OR (
        COALESCE((auth.jwt() ->> 'email'), '') <> ''
        AND EXISTS (
          SELECT 1
          FROM public.scouts sc
          WHERE LOWER(COALESCE(sc.email, '')) = LOWER(COALESCE((auth.jwt() ->> 'email'), ''))
        )
      )
    )
  );
$$;

-- 2. Table des évaluations de performance joueur (manuelles par poste + évaluations match)
CREATE TABLE IF NOT EXISTS public.player_performance_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  metric_set_id UUID,
  metric_set_name TEXT,
  position_code VARCHAR(50) NOT NULL,
  position_name TEXT,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_type VARCHAR(30) NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('manual', 'match', 'training')),
  evaluator_id UUID,
  evaluator_name TEXT,
  technique_score NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (technique_score >= 0 AND technique_score <= 10),
  tactique_score NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (tactique_score >= 0 AND tactique_score <= 10),
  physique_score NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (physique_score >= 0 AND physique_score <= 10),
  mental_score NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (mental_score >= 0 AND mental_score <= 10),
  global_score NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (global_score >= 0 AND global_score <= 10),
  criteria_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  comment TEXT DEFAULT '',
  ai_synthesis JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.player_performance_evaluations
  ADD COLUMN IF NOT EXISTS ai_synthesis JSONB DEFAULT NULL;

-- 3. Index de performance pour les fiches joueurs, courbes d'évolution et matchs
CREATE INDEX IF NOT EXISTS idx_player_perf_eval_player_date
  ON public.player_performance_evaluations(player_id, evaluation_date ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_player_perf_eval_match_player
  ON public.player_performance_evaluations(match_id, player_id)
  WHERE match_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_player_perf_eval_source
  ON public.player_performance_evaluations(player_id, source_type);

-- 4. Permissions & RLS (blocage strict des comptes Scouts)
GRANT ALL ON TABLE public.player_performance_evaluations TO anon, authenticated, service_role;

ALTER TABLE public.player_performance_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_perf_eval_non_scout_authenticated" ON public.player_performance_evaluations;
CREATE POLICY "player_perf_eval_non_scout_authenticated"
  ON public.player_performance_evaluations
  FOR ALL
  TO authenticated
  USING (NOT public.is_scout_account())
  WITH CHECK (NOT public.is_scout_account());

DROP POLICY IF EXISTS "player_perf_eval_anon_dashboard_dev" ON public.player_performance_evaluations;
CREATE POLICY "player_perf_eval_anon_dashboard_dev"
  ON public.player_performance_evaluations
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- 5. Extension idempotente sur match_players pour synchronisation bidirectionnelle match <-> fiche joueur
DO $$
BEGIN
  IF to_regclass('public.match_players') IS NOT NULL THEN
    ALTER TABLE public.match_players
      ADD COLUMN IF NOT EXISTS metric_set_id UUID,
      ADD COLUMN IF NOT EXISTS pillar_scores JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 6. Publication Realtime optionnelle (sans échec si déjà publiée)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.player_performance_evaluations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

COMMENT ON TABLE public.player_performance_evaluations IS 'Évaluations datées des performances joueurs (échelle 0-10, 4 piliers, critères par poste hors-scouts).';

