-- Migration : Statistiques avancées joueur (Penaltys, CSC, Gardiens) et profil athlétique
-- Date : 2026-10-08
-- Description : Ajout des colonnes pour le suivi des penaltys réussis/ratés, CSC, clean sheets, arrêts, minutes et ancienneté

-- 1. Table public.player_match_stats
ALTER TABLE public.player_match_stats
ADD COLUMN IF NOT EXISTS penalties_scored integer DEFAULT 0 CHECK (penalties_scored >= 0),
ADD COLUMN IF NOT EXISTS penalties_missed integer DEFAULT 0 CHECK (penalties_missed >= 0),
ADD COLUMN IF NOT EXISTS own_goals integer DEFAULT 0 CHECK (own_goals >= 0),
ADD COLUMN IF NOT EXISTS clean_sheet boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS goals_conceded integer DEFAULT 0 CHECK (goals_conceded >= 0),
ADD COLUMN IF NOT EXISTS saves integer DEFAULT 0 CHECK (saves >= 0),
ADD COLUMN IF NOT EXISTS penalties_saved integer DEFAULT 0 CHECK (penalties_saved >= 0),
ADD COLUMN IF NOT EXISTS yellow_cards integer DEFAULT 0 CHECK (yellow_cards >= 0),
ADD COLUMN IF NOT EXISTS red_cards integer DEFAULT 0 CHECK (red_cards >= 0);

-- 2. Table public.players (Profil d'expérience / Ancienneté FUS)
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS club_joined_date date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS experience_years integer DEFAULT 1;

-- 3. Commentaires de documentation Supabase
COMMENT ON COLUMN public.player_match_stats.penalties_scored IS 'Nombre de tirs au but / penaltys réussis par le joueur dans le match';
COMMENT ON COLUMN public.player_match_stats.penalties_missed IS 'Nombre de penaltys manqués (hors cadre ou arrêtés par le gardien)';
COMMENT ON COLUMN public.player_match_stats.own_goals IS 'Nombre de buts contre son camp (CSC)';
COMMENT ON COLUMN public.player_match_stats.clean_sheet IS 'Vrai si le gardien n''a encaissé aucun but durant son temps de jeu';
COMMENT ON COLUMN public.player_match_stats.goals_conceded IS 'Nombre de buts encaissés (spécifique gardien de but)';
COMMENT ON COLUMN public.player_match_stats.saves IS 'Nombre d''arrêts décisifs réalisés par le gardien';
COMMENT ON COLUMN public.player_match_stats.penalties_saved IS 'Nombre de penaltys arrêtés par le gardien';
COMMENT ON COLUMN public.players.experience_years IS 'Nombre d''années d''expérience ou d''ancienneté au sein de l''académie / club FUS';
