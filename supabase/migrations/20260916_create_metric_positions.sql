-- ==============================================================================
-- Migration : Ajout de la table metric_positions pour la gestion dynamique des métriques
-- Date : 2026-09-16
-- À exécuter dans : Supabase Dashboard → SQL Editor → New Query → Run
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.metric_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    emoji VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('GK', 'DF', 'MF', 'FW')),
    criteria JSONB NOT NULL DEFAULT '{"technique": [], "tactique": [], "physique": [], "mental": []}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Permissions d'accès PostgreSQL
GRANT ALL ON TABLE public.metric_positions TO anon, authenticated, service_role;

-- Configuration RLS (Row Level Security)
ALTER TABLE public.metric_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on metric_positions" ON public.metric_positions;
CREATE POLICY "Allow public read access on metric_positions" 
    ON public.metric_positions FOR SELECT 
    TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Allow admin full access on metric_positions" ON public.metric_positions;
DROP POLICY IF EXISTS "Allow all access on metric_positions" ON public.metric_positions;
CREATE POLICY "Allow all access on metric_positions" 
    ON public.metric_positions FOR ALL 
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- Insert Default Seeds (9 profils tactiques officiels)
INSERT INTO public.metric_positions (code, name, emoji, category, criteria)
VALUES 
('GK', 'Gardien', '🧤', 'GK', '{"technique": ["Prise de balle", "Jeu au pied", "Passe courte", "Passe longue", "Sorties aériennes", "1 contre 1", "Arrêts"], "tactique": ["Placement", "Positionnement", "Anticipation", "Lecture des trajectoires", "Gestion profondeur", "Relance", "Organisation défense"], "physique": ["Explosivité", "Détente", "Agilité", "Vitesse", "Coordination", "Souplesse", "Force"], "mental": ["Concentration", "Réactivité", "Confiance", "Gestion de pression", "Communication", "Prise de décision", "Leadership"]}'),
('CB', 'Défenseur central', '🛡️', 'DF', '{"technique": ["Contrôle", "Passe courte", "Passe longue", "Jeu aérien", "Conduite", "Tacle", "Duel 1v1"], "tactique": ["Placement", "Marquage", "Couverture", "Anticipation", "Gestion profondeur", "Défense de zone", "Sortie de balle"], "physique": ["Vitesse", "Force", "Puissance", "Détente", "Endurance", "Agilité", "Coordination"], "mental": ["Concentration", "Courage", "Calme", "Communication", "Leadership", "Prise de décision", "Résilience"]}'),
('RB/LB', 'Latéral droit/gauche', '🏃', 'DF', '{"technique": ["Contrôle", "Passe", "Centre", "Conduite", "Dribble", "Tacle", "Finition"], "tactique": ["Positionnement", "Placement défensif", "Couverture", "Gestion 1v1", "Projection offensive", "Repli défensif", "Combinaisons"], "physique": ["Vitesse", "Accélération", "Endurance", "Explosivité", "Agilité", "Puissance", "Coordination"], "mental": ["Concentration", "Discipline", "Combativité", "Décision", "Courage", "Persévérance", "Intelligence"]}'),
('CDM / 6', 'Milieu défensif', '⚙️', 'MF', '{"technique": ["Contrôle", "Passe courte", "Passe longue", "Contrôle orienté", "Conduite", "Jeu sous pression", "Récupération technique"], "tactique": ["Placement", "Couverture", "Lecture du jeu", "Transition défensive", "Pressing", "Équilibre équipe", "Orientation du jeu"], "physique": ["Endurance", "Force", "Vitesse", "Explosivité", "Agilité", "Puissance", "Résistance"], "mental": ["Concentration", "Intelligence", "Calme", "Prise de décision", "Discipline", "Leadership", "Personnalité"]}'),
('CM / 8', 'Milieu central', '🎯', 'MF', '{"technique": ["Contrôle", "Passe courte", "Passe longue", "Contrôle orienté", "Conduite", "Tir", "Dribble"], "tactique": ["Positionnement", "Occupation espaces", "Transition", "Jeu entre lignes", "Pressing", "Projection", "Soutien offensif"], "physique": ["Endurance", "Vitesse", "Agilité", "Explosivité", "Force", "Coordination", "Résistance"], "mental": ["Intelligence", "Concentration", "Prise de décision", "Calme", "Discipline", "Créativité", "Leadership"]}'),
('CAM / 10', 'Milieu offensif', '🎨', 'MF', '{"technique": ["Contrôle", "Passe", "Passe décisive", "Dribble", "Contrôle orienté", "Tir", "Finition"], "tactique": ["Positionnement entre lignes", "Lecture du jeu", "Déplacement", "Création espaces", "Dernière passe", "Transition offensive", "Jeu combiné"], "physique": ["Accélération", "Agilité", "Vitesse", "Explosivité", "Endurance", "Coordination", "Mobilité"], "mental": ["Créativité", "Intelligence", "Prise de décision", "Confiance", "Sang-froid", "Personnalité", "Vision"]}'),
('RW / LW', 'Ailier', '🪽', 'FW', '{"technique": ["Dribble", "Contrôle", "Centre", "Passe", "Finition", "Tir", "Conduite"], "tactique": ["1v1 offensif", "Largeur", "Déplacement", "Appels", "Attaque profondeur", "Repli défensif", "Entrée dans l''axe"], "physique": ["Accélération", "Vitesse", "Explosivité", "Agilité", "Endurance", "Coordination", "Mobilité"], "mental": ["Créativité", "Confiance", "Audace", "Prise de décision", "Concentration", "Persévérance", "Sang-froid"]}'),
('ST / CF', 'Avant-centre', '⚽', 'FW', '{"technique": ["Finition", "Tir", "Contrôle", "Contrôle orienté", "Dribble", "Jeu de tête", "Passe"], "tactique": ["Placement", "Déplacement", "Appels", "Jeu dos au but", "Attaque profondeur", "Pressing", "Combinaisons"], "physique": ["Force", "Vitesse", "Accélération", "Explosivité", "Détente", "Endurance", "Coordination"], "mental": ["Sang-froid", "Confiance", "Concentration", "Combativité", "Persévérance", "Prise de décision", "Mentalité"]}'),
('SS', 'Second attaquant', '🔄', 'FW', '{"technique": ["Contrôle", "Passe", "Dribble", "Finition", "Tir", "Passe décisive"], "tactique": ["Déplacement", "Jeu entre lignes", "Combinaisons", "Création espaces", "Soutien attaquant", "Pressing"], "physique": ["Accélération", "Vitesse", "Agilité", "Explosivité", "Endurance", "Mobilité"], "mental": ["Créativité", "Intelligence", "Prise de décision", "Confiance", "Sang-froid", "Persévérance"]}')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    emoji = EXCLUDED.emoji,
    category = EXCLUDED.category,
    criteria = EXCLUDED.criteria,
    updated_at = timezone('utc'::text, now());
