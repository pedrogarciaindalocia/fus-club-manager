-- ================================================================
-- Migration: Add opponent scouting & lineup columns to matches table
-- Run this in Supabase SQL Editor
-- ================================================================

-- Add opponent_lineup column (array of jersey numbers as text)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS opponent_lineup JSONB DEFAULT '[]'::jsonb;

-- Add opponent_subs column (array of jersey numbers as text)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS opponent_subs JSONB DEFAULT '[]'::jsonb;

-- Add lineup column (JSON with startingXI, substitutes, formation)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS lineup JSONB DEFAULT '{}'::jsonb;

-- Add staff_ids column (array of staff UUIDs)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS staff_ids UUID[] DEFAULT '{}';

-- Add team_id if it doesn't already exist
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
