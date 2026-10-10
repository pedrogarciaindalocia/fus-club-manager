-- Migration: Ajout des fonctionnalités avancées de gestion de match
-- Date: 2026-04-27
-- Description: Ajoute les colonnes pour la durée des mi-temps, prolongations, penalties et temps perdu

-- 1. Mise à jour du type enum match_status
ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'halftime';
ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'extra_time';
ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'penalties';

-- 2. Ajout des colonnes de configuration du match
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS half_duration_minutes INTEGER DEFAULT 45,
ADD COLUMN IF NOT EXISTS enable_extra_time BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS enable_penalties BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS current_half INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS time_elapsed_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS added_time_first_half INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS added_time_second_half INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS penalty_score_home INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS penalty_score_away INTEGER DEFAULT 0;

-- 3. Contraintes pour valider les données
ALTER TABLE matches 
ADD CONSTRAINT valid_half_duration CHECK (half_duration_minutes IN (30, 35, 40, 45)),
ADD CONSTRAINT valid_current_half CHECK (current_half BETWEEN 1 AND 4);
-- half 1: première mi-temps, half 2: deuxième mi-temps
-- half 3: première prolongation, half 4: deuxième prolongation

-- 4. Index pour améliorer les performances des requêtes de filtrage par statut
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- 5. Commentaires sur les colonnes
COMMENT ON COLUMN matches.half_duration_minutes IS 'Durée d''une mi-temps en minutes (30, 35, 40 ou 45)';
COMMENT ON COLUMN matches.enable_extra_time IS 'Indique si le match peut avoir des prolongations';
COMMENT ON COLUMN matches.enable_penalties IS 'Indique si le match peut aller aux penalties';
COMMENT ON COLUMN matches.current_half IS 'Mi-temps actuelle: 1, 2, 3 (prol. 1), 4 (prol. 2)';
COMMENT ON COLUMN matches.time_elapsed_seconds IS 'Temps écoulé total en secondes';
COMMENT ON COLUMN matches.added_time_first_half IS 'Temps additionnel première mi-temps (minutes)';
COMMENT ON COLUMN matches.added_time_second_half IS 'Temps additionnel deuxième mi-temps (minutes)';
COMMENT ON COLUMN matches.penalty_score_home IS 'Score aux penalties pour l''équipe à domicile';
COMMENT ON COLUMN matches.penalty_score_away IS 'Score aux penalties pour l''équipe à l''extérieur';

-- 6. Fonction pour activer automatiquement le match à l'heure prévue
CREATE OR REPLACE FUNCTION auto_activate_scheduled_matches()
RETURNS void AS $$
BEGIN
    UPDATE matches 
    SET status = 'live',
        updated_at = NOW()
    WHERE status = 'scheduled'
      AND match_date <= CURRENT_DATE
      AND match_time <= CURRENT_TIME
      AND (match_date < CURRENT_DATE OR match_time <= CURRENT_TIME);
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger optionnel pour l'activation automatique (désactivé par défaut)
-- Décommenter si vous voulez une activation automatique via cron/trigger
-- SELECT cron.schedule('0 * * * *', 'SELECT auto_activate_scheduled_matches()');
