-- Migration: Create scouting_basket table for adversary detection basket
-- Date: 2026-10-19
-- Enables scouts and staff to put adversary players into a detection basket from fus-app
-- and assign scouting missions via drag-and-drop in fus-dashboard.

CREATE TABLE IF NOT EXISTS public.scouting_basket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  jersey_number INT,
  position TEXT,
  photo_url TEXT,
  category TEXT DEFAULT 'SENIOR',
  match_id TEXT,
  match_date TEXT,
  match_context JSONB DEFAULT '{}'::jsonb,
  rating INT,
  rating_comment TEXT,
  added_by_id TEXT,
  added_by_name TEXT NOT NULL,
  added_by_role TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'assigned', 'archived'
  assigned_to_id TEXT,
  assigned_to_name TEXT,
  assigned_mission_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scouting_basket_status ON public.scouting_basket(status);
CREATE INDEX IF NOT EXISTS idx_scouting_basket_match_id ON public.scouting_basket(match_id);
CREATE INDEX IF NOT EXISTS idx_scouting_basket_created_at ON public.scouting_basket(created_at DESC);

-- Enable RLS
ALTER TABLE public.scouting_basket ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated read/write scouting_basket" ON public.scouting_basket;
DROP POLICY IF EXISTS "Allow public read/write scouting_basket" ON public.scouting_basket;
DROP POLICY IF EXISTS "Allow full access for scouting_basket" ON public.scouting_basket;

CREATE POLICY "Allow full access for scouting_basket"
  ON public.scouting_basket
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.scouting_basket;

COMMENT ON TABLE public.scouting_basket IS 'Panier de détection des joueurs adverses repérés en match';
