-- Migration: Ajout du champ match_phase à la table matches
-- Date: 2026-04-27
-- Description: Ajoute la colonne match_phase pour stocker la phase/tour de compétition
--              ainsi que le statut qualification / disqualification

-- 1. Créer le type enum match_phase
DO $$ BEGIN
  CREATE TYPE match_phase AS ENUM (
    'league',
    'qualification',
    'disqualification',
    'round_of_32',
    'round_of_16',
    'quarter_final',
    'semi_final',
    'third_place',
    'final'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Ajouter la colonne match_phase à la table matches
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS match_phase match_phase DEFAULT NULL;

-- 3. Commentaire
COMMENT ON COLUMN matches.match_phase IS 'Phase ou tour de compétition : ligue, 32e, 16e, quart, demi, finale, ou statut qualification/disqualification';
