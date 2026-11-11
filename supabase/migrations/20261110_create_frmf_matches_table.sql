-- ==============================================================================
-- Migration : Persistance en Base de Données des Résultats FRMF par Journée
-- Table : public.frmf_matches
-- Date : 2026-11-10
-- Projet : FUS Club (fus-dashboard)
-- À exécuter dans : Supabase Dashboard → SQL Editor → New Query → Run
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.frmf_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season TEXT NOT NULL DEFAULT '2026/2027',
  category TEXT NOT NULL,
  league_group TEXT NOT NULL DEFAULT 'Poule Unique',
  match_day INTEGER NOT NULL CHECK (match_day > 0),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  score_home INTEGER,
  score_away INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('finished', 'scheduled', 'postponed', 'cancelled')),
  match_date TEXT NOT NULL DEFAULT '',
  match_time TEXT NOT NULL DEFAULT '15:00',
  home_team_logo TEXT,
  away_team_logo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_frmf_diff_teams CHECK (UPPER(TRIM(home_team)) <> UPPER(TRIM(away_team))),
  CONSTRAINT uq_frmf_match_slot UNIQUE (season, category, league_group, match_day, home_team, away_team)
);

CREATE INDEX IF NOT EXISTS idx_frmf_matches_cat_group_day
  ON public.frmf_matches(category, league_group, match_day);

CREATE INDEX IF NOT EXISTS idx_frmf_matches_season_cat
  ON public.frmf_matches(season, category);

CREATE OR REPLACE FUNCTION public.touch_frmf_matches_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_frmf_matches_updated_at ON public.frmf_matches;
CREATE TRIGGER trg_frmf_matches_updated_at
  BEFORE UPDATE ON public.frmf_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_frmf_matches_updated_at();

GRANT ALL ON TABLE public.frmf_matches TO anon, authenticated, service_role;

ALTER TABLE public.frmf_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read frmf_matches" ON public.frmf_matches;
CREATE POLICY "Allow read frmf_matches"
  ON public.frmf_matches FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Allow insert frmf_matches" ON public.frmf_matches;
CREATE POLICY "Allow insert frmf_matches"
  ON public.frmf_matches FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update frmf_matches" ON public.frmf_matches;
CREATE POLICY "Allow update frmf_matches"
  ON public.frmf_matches FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete frmf_matches" ON public.frmf_matches;
CREATE POLICY "Allow delete frmf_matches"
  ON public.frmf_matches FOR DELETE
  TO authenticated, anon
  USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.frmf_matches;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

COMMENT ON TABLE public.frmf_matches IS 'Matchs et résultats par journée des championnats (toutes catégories), base de calcul automatique du classement officiel.';

