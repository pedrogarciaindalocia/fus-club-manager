-- ==============================================================================
-- Migration : Système de Matchs Adversaires & Calcul du Classement de Ligue
-- Date : 2026-11-03
-- Projet : FUS Club (fus-dashboard & fus-app)
-- ==============================================================================

-- 1. Table des matchs entre adversaires (pour compléter le championnat)
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
    status TEXT NOT NULL DEFAULT 'finished', -- 'scheduled', 'live', 'finished'
    round_name TEXT, -- ex: "Journée 1"
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT chk_diff_clubs CHECK (home_club_id <> away_club_id)
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_opponent_matches_league ON public.opponent_matches(league_id);
CREATE INDEX IF NOT EXISTS idx_opponent_matches_clubs ON public.opponent_matches(home_club_id, away_club_id);
CREATE INDEX IF NOT EXISTS idx_opponent_matches_date ON public.opponent_matches(match_date DESC);

-- Activation de RLS
ALTER TABLE public.opponent_matches ENABLE ROW LEVEL SECURITY;

-- Politiques RLS permissives et résilientes
DROP POLICY IF EXISTS "Allow read opponent_matches" ON public.opponent_matches;
CREATE POLICY "Allow read opponent_matches"
    ON public.opponent_matches FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow insert opponent_matches" ON public.opponent_matches;
CREATE POLICY "Allow insert opponent_matches"
    ON public.opponent_matches FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update opponent_matches" ON public.opponent_matches;
CREATE POLICY "Allow update opponent_matches"
    ON public.opponent_matches FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Allow delete opponent_matches" ON public.opponent_matches;
CREATE POLICY "Allow delete opponent_matches"
    ON public.opponent_matches FOR DELETE
    USING (true);

-- Publication temps réel (Realtime)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.opponent_matches;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
END $$;

