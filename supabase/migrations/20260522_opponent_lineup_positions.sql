-- Migration: Ajout des positions pour la composition adverse
-- Date: 2026-05-22
-- Description: Ajoute la colonne opponent_lineup_positions pour stocker les positions (GK, CB, etc.) associees aux numeros de maillot

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS opponent_lineup_positions JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN matches.opponent_lineup_positions IS 'Tableau d objets {jersey_number, position} pour la composition adverse';
