-- ============================================================
-- Migration : Ajout de la colonne preferred_locations
-- Table : trial_candidates
-- Description : Stocke les zones géographiques préférées du
--               candidat sous forme de tableau JSON de villes.
-- ============================================================

ALTER TABLE trial_candidates
  ADD COLUMN IF NOT EXISTS preferred_locations JSONB DEFAULT '[]'::jsonb;

-- Commentaire de colonne
COMMENT ON COLUMN trial_candidates.preferred_locations IS
  'Tableau JSON des villes préférées du candidat, sélectionnées via la carte interactive (LocationPicker). Ex: ["Rabat", "Casablanca", "Paris"]';

-- Index GIN pour les recherches JSONB performantes (optionnel mais recommandé)
CREATE INDEX IF NOT EXISTS idx_trial_candidates_preferred_locations
  ON trial_candidates USING GIN (preferred_locations);
