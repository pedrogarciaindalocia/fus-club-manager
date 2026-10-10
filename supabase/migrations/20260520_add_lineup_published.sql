-- Migration: Ajout des champs de publication des compositions officielles
-- Date: 2026-05-20
-- Description: Ajoute les colonnes lineup_published et opponent_lineup_published à la table matches

ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS lineup_published BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS opponent_lineup_published BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN matches.lineup_published IS 'Indique si la composition officielle du club (FUS) est publiée';
COMMENT ON COLUMN matches.opponent_lineup_published IS 'Indique si la composition officielle de l''adversaire est publiée';
