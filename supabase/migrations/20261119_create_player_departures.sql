-- ==============================================================================
-- Migration : Registre des Sorties & Transferts de Joueurs
-- Projet : US-DASH-178 (CRUD Spécifiques Joueurs -> Sortie / Transfert)
-- Table : public.player_departures
-- Date : 2026-11-19
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.player_departures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  departure_type VARCHAR(30) NOT NULL DEFAULT 'transfer'
    CHECK (departure_type IN ('transfer', 'loan', 'release', 'end_of_contract', 'retirement', 'other')),
  status VARCHAR(20) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('planned', 'completed', 'cancelled')),
  departure_date DATE NOT NULL DEFAULT CURRENT_DATE,
  destination_club TEXT DEFAULT '',
  transfer_fee NUMERIC(12, 2) DEFAULT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'MAD',
  reason TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_player_departures_club_date
  ON public.player_departures(club_id, departure_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_departures_player
  ON public.player_departures(player_id, departure_date DESC);

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

GRANT ALL ON TABLE public.player_departures TO anon, authenticated, service_role;

ALTER TABLE public.player_departures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_departures_non_scout_authenticated" ON public.player_departures;
CREATE POLICY "player_departures_non_scout_authenticated"
  ON public.player_departures
  FOR ALL
  TO authenticated
  USING (NOT public.is_scout_account())
  WITH CHECK (NOT public.is_scout_account());
