-- ==============================================================================
-- Migration : Mentions Datées des Joueurs & Historique Shortlist Officielle (US-DASH-137)
-- Table : public.player_mentions
-- Date : 2026-11-10
-- Projet : FUS Club (fus-dashboard)
-- À exécuter dans : Supabase Dashboard → SQL Editor → New Query → Run
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.player_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL DEFAULT '45642829-a3d7-48de-afdd-3c45a1ced474'::uuid,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  mention TEXT NOT NULL CHECK (mention IN ('faible', 'moyen', 'assez_bien', 'tres_bien', 'top')),
  mention_score SMALLINT NOT NULL CHECK (mention_score BETWEEN 1 AND 5),
  mention_date DATE NOT NULL,
  comment TEXT NOT NULL DEFAULT '',r
  source TEXT NOT NULL DEFAULT 'official_shortlist',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_player_mention_date UNIQUE (player_id, mention_date)
);

CREATE INDEX IF NOT EXISTS idx_player_mentions_player_date
  ON public.player_mentions(player_id, mention_date DESC);

CREATE INDEX IF NOT EXISTS idx_player_mentions_club_date
  ON public.player_mentions(club_id, mention_date DESC);

CREATE OR REPLACE FUNCTION public.touch_player_mentions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_player_mentions_updated_at ON public.player_mentions;
CREATE TRIGGER trg_player_mentions_updated_at
  BEFORE UPDATE ON public.player_mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_player_mentions_updated_at();

GRANT ALL ON TABLE public.player_mentions TO anon, authenticated, service_role;

ALTER TABLE public.player_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read player_mentions" ON public.player_mentions;
CREATE POLICY "Allow read player_mentions"
  ON public.player_mentions FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Allow insert player_mentions" ON public.player_mentions;
CREATE POLICY "Allow insert player_mentions"
  ON public.player_mentions FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update player_mentions" ON public.player_mentions;
CREATE POLICY "Allow update player_mentions"
  ON public.player_mentions FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete player_mentions" ON public.player_mentions;
CREATE POLICY "Allow delete player_mentions"
  ON public.player_mentions FOR DELETE
  TO authenticated, anon
  USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.player_mentions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

COMMENT ON TABLE public.player_mentions IS 'Mentions qualitatives datées des joueurs (Faible, Moyen, Assez bien, Très bien, Top) saisies depuis la Shortlist Officielle et affichées en courbe chronologique.';

