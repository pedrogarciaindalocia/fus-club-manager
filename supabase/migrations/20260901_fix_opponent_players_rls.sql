-- Migration: Fix RLS Policy for opponent_players
-- Date: 2026-09-01

ALTER TABLE public.opponent_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read/write opponent_players" ON public.opponent_players;
DROP POLICY IF EXISTS "Allow public read opponent_players" ON public.opponent_players;
DROP POLICY IF EXISTS "Allow full access for opponent_players" ON public.opponent_players;

CREATE POLICY "Allow full access for opponent_players" 
  ON public.opponent_players 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
