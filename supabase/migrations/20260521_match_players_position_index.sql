-- Migration: Add position_index column to match_players table
-- This fixes the lineup ordering issue where players don't appear in their assigned positions

-- Add position_index column to store the array index in startingXI (0-10)
ALTER TABLE match_players 
ADD COLUMN IF NOT EXISTS position_index INTEGER;

-- Add comment to document the column
COMMENT ON COLUMN match_players.position_index IS 'Index position in the startingXI array (0=GK, 1-10=field positions). NULL for substitutes.';

-- Create index for faster queries when ordering by position
CREATE INDEX IF NOT EXISTS idx_match_players_position_index 
ON match_players(match_id, position_index) 
WHERE position_index IS NOT NULL;
