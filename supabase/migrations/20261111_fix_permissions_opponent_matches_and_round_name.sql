-- ==============================================================================
-- Migration corrective :
-- 1. Colonne public.matches.round_name (résout HTTP 400 / PGRST204)
-- 2. Table public.opponent_matches + RLS + GRANT (résout HTTP 404 / PGRST205)
-- 3. GRANT & RLS sur trial_candidates, candidate_evaluations, scouts,
--    user_sessions, audit_logs (résout HTTP 401 / 42501 permission denied)
-- À exécuter dans : Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Ajout de round_name sur public.matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS round_name TEXT DEFAULT 'Journée 1';

CREATE INDEX IF NOT EXISTS idx_matches_round_name
  ON public.matches(round_name);

-- 2. Création de public.opponent_matches si absente (404)
CREATE TABLE IF NOT EXISTS public.opponent_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  category TEXT DEFAULT 'PRO',
  home_club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  away_club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  match_date DATE NOT NULL,
  match_time TIME,
  score_home INTEGER DEFAULT 0,
  score_away INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'finished',
  round_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_diff_clubs CHECK (home_club_id <> away_club_id)
);

CREATE INDEX IF NOT EXISTS idx_opponent_matches_league ON public.opponent_matches(league_id);
CREATE INDEX IF NOT EXISTS idx_opponent_matches_clubs ON public.opponent_matches(home_club_id, away_club_id);
CREATE INDEX IF NOT EXISTS idx_opponent_matches_date ON public.opponent_matches(match_date DESC);

GRANT ALL PRIVILEGES ON TABLE public.opponent_matches TO anon, authenticated, service_role;
ALTER TABLE public.opponent_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read opponent_matches" ON public.opponent_matches;
CREATE POLICY "Allow read opponent_matches"
  ON public.opponent_matches FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert opponent_matches" ON public.opponent_matches;
CREATE POLICY "Allow insert opponent_matches"
  ON public.opponent_matches FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update opponent_matches" ON public.opponent_matches;
CREATE POLICY "Allow update opponent_matches"
  ON public.opponent_matches FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete opponent_matches" ON public.opponent_matches;
CREATE POLICY "Allow delete opponent_matches"
  ON public.opponent_matches FOR DELETE
  TO anon, authenticated
  USING (true);

-- 3. Rétablissement des GRANT & RLS sur les tables en 401 (42501 permission denied)
-- Note : inclut `anon` pour compatibilité avec le mode DEV local sans session Supabase Auth.
-- En production stricte avec authentification obligatoire (/login), vous pouvez remplacer `anon, authenticated` par `authenticated`.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

DO $$
DECLARE
  t TEXT;
  tables_to_grant TEXT[] := ARRAY[
    'trial_candidates',
    'trial_sessions',
    'candidate_evaluations',
    'scouts',
    'user_sessions',
    'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables_to_grant LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO anon, authenticated, service_role;', t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'allow_all_' || t, t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);',
        'allow_all_' || t,
        t
      );
    END IF;
  END LOOP;
END $$;

-- Recharger le schema cache PostgREST immédiatement
NOTIFY pgrst, 'reload schema';

