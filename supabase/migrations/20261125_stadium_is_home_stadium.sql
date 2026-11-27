-- Add is_home_stadium flag on stadiums to designate My Club's official home stadium
ALTER TABLE public.stadiums
  ADD COLUMN IF NOT EXISTS is_home_stadium boolean NOT NULL DEFAULT false;

-- Ensure at most one home stadium per club
CREATE UNIQUE INDEX IF NOT EXISTS idx_stadiums_single_home_per_club
  ON public.stadiums (club_id)
  WHERE is_home_stadium = true;
