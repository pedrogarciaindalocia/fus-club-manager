-- Migration: Create opponent_players table for adversary squad management
-- Date: 2026-09-01

CREATE TABLE IF NOT EXISTS public.opponent_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opponent_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  jersey_number INT,
  position TEXT,
  category TEXT NOT NULL DEFAULT 'SENIOR',
  photo_url TEXT,
  height INT,
  weight INT,
  preferred_foot TEXT,
  nationality TEXT DEFAULT 'Maroc',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast filtering by opponent_id and category
CREATE INDEX IF NOT EXISTS idx_opponent_players_opponent_id ON public.opponent_players(opponent_id);
CREATE INDEX IF NOT EXISTS idx_opponent_players_category ON public.opponent_players(category);

-- Enable RLS
ALTER TABLE public.opponent_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Full access for read and write)
DROP POLICY IF EXISTS "Allow authenticated read/write opponent_players" ON public.opponent_players;
DROP POLICY IF EXISTS "Allow public read opponent_players" ON public.opponent_players;
DROP POLICY IF EXISTS "Allow full access for opponent_players" ON public.opponent_players;

CREATE POLICY "Allow full access for opponent_players" 
  ON public.opponent_players 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.opponent_players IS 'Table stockant les joueurs répertoriés pour chaque club adversaire par catégorie';
COMMENT ON COLUMN public.opponent_players.category IS 'Catégorie d âge du joueur (ex: SENIOR, U19, U17, U15)';
