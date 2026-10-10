-- ==============================================================================
-- 🇲🇦 FUS CLUB - SYNCHRONISATION RECRUTEMENT V2 AVEC SUPABASE 🇲🇦
-- Exécutez ce script dans l'éditeur SQL de votre Dashboard Supabase (onglet SQL Editor)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CRÉATION OU MISE À JOUR DE LA TABLE trial_candidates
CREATE TABLE IF NOT EXISTS public.trial_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    photo_url TEXT,
    birth_date DATE,
    birth_place VARCHAR(100),
    nationality VARCHAR(100) DEFAULT 'Marocaine',
    gender VARCHAR(20) DEFAULT 'Masculin',
    address TEXT,
    city VARCHAR(100) DEFAULT 'Rabat',
    phone VARCHAR(50),
    email VARCHAR(150),
    
    -- Tuteur & Légal
    guardian_name VARCHAR(150),
    guardian_relationship VARCHAR(50) DEFAULT 'Père',
    guardian_phone VARCHAR(50),
    guardian_phone_alt VARCHAR(50),
    guardian_email VARCHAR(150),
    emergency_contact VARCHAR(100),
    guardian_consent_status VARCHAR(20) DEFAULT 'granted',
    
    -- Sportif
    primary_position VARCHAR(50) NOT NULL,
    secondary_position VARCHAR(50),
    preferred_foot VARCHAR(20) DEFAULT 'Droitier',
    height_cm INT DEFAULT 150,
    weight_kg INT DEFAULT 65,
    age_category VARCHAR(30) DEFAULT 'U13',
    current_club VARCHAR(150),
    previous_clubs TEXT,
    matches_played INT DEFAULT 0,
    minutes_played INT DEFAULT 0,
    goals INT DEFAULT 0,
    assists INT DEFAULT 0,
    national_selections TEXT,
    injury_history TEXT,
    
    -- Cellule de Recrutement
    discovering_scout_id UUID,
    discovering_scout_name VARCHAR(150),
    recruiter_id UUID,
    recruiter_name VARCHAR(150),
    discovery_location VARCHAR(150),
    discovery_match VARCHAR(150),
    recommendation_priority VARCHAR(20) DEFAULT 'medium',
    initial_scout_score NUMERIC DEFAULT 0,
    scout_recommendation_notes TEXT,
    
    -- Pipeline & Statut
    pipeline_stage VARCHAR(50) DEFAULT 'prospect',
    status VARCHAR(50) DEFAULT 'registered',
    
    -- Vidéo
    video_type VARCHAR(20) DEFAULT 'none',
    video_url TEXT,
    video_source VARCHAR(100),
    
    -- Localisations préférées
    preferred_locations JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. AJOUT SÉCURISÉ DES COLONNES MANQUANTES (Si la table existait déjà)
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS birth_place VARCHAR(100);
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'Masculin';
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Rabat';
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(150);
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS guardian_relationship VARCHAR(50) DEFAULT 'Père';
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR(50);
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS guardian_phone_alt VARCHAR(50);
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS guardian_email VARCHAR(150);
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100);
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS guardian_consent_status VARCHAR(20) DEFAULT 'granted';
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS age_category VARCHAR(30) DEFAULT 'U13';
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS current_club VARCHAR(150);
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS previous_clubs TEXT;
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS matches_played INT DEFAULT 0;
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS minutes_played INT DEFAULT 0;
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS goals INT DEFAULT 0;
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS assists INT DEFAULT 0;
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS national_selections TEXT;
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS injury_history TEXT;
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS discovering_scout_id UUID;
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS discovering_scout_name VARCHAR(150);
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS recruiter_id UUID;
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS recruiter_name VARCHAR(150);
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS discovery_location VARCHAR(150);
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS discovery_match VARCHAR(150);
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS recommendation_priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS initial_scout_score NUMERIC DEFAULT 0;
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS scout_recommendation_notes TEXT;
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50) DEFAULT 'prospect';
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS video_type VARCHAR(20) DEFAULT 'none';
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS video_source VARCHAR(100);
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS preferred_locations JSONB DEFAULT '[]'::jsonb;

-- 4. POLITIQUES DE SÉCURITÉ ROW LEVEL SECURITY (RLS)
ALTER TABLE public.trial_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.trial_candidates;
DROP POLICY IF EXISTS "Allow all for anon users" ON public.trial_candidates;
DROP POLICY IF EXISTS "Allow public read access" ON public.trial_candidates;
DROP POLICY IF EXISTS "Allow public full access" ON public.trial_candidates;
DROP POLICY IF EXISTS "Allow full access to trial_candidates" ON public.trial_candidates;
DROP POLICY IF EXISTS "trial_candidates_policy" ON public.trial_candidates;

CREATE POLICY "Allow full access to trial_candidates" ON public.trial_candidates
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.trial_candidates TO anon, authenticated, service_role;

-- 5. TABLES COMPLÉMENTAIRES DU RECRUTEMENT
-- Scouts
CREATE TABLE IF NOT EXISTS public.scouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(50),
    role_title VARCHAR(100) DEFAULT 'Scout Régional',
    recruitment_region VARCHAR(100) DEFAULT 'National',
    assigned_categories TEXT[] DEFAULT ARRAY['U13'],
    assigned_teams TEXT[] DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(50) DEFAULT 'active',
    recruited_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.scouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to scouts" ON public.scouts;
CREATE POLICY "Allow full access to scouts" ON public.scouts FOR ALL TO public USING (true) WITH CHECK (true);
GRANT ALL ON public.scouts TO anon, authenticated, service_role;

-- Timeline Événements
CREATE TABLE IF NOT EXISTS public.recruitment_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES public.trial_candidates(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_title VARCHAR(200) NOT NULL,
    event_description TEXT,
    performed_by VARCHAR(150),
    event_date DATE DEFAULT CURRENT_DATE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.recruitment_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to recruitment_timeline" ON public.recruitment_timeline;
CREATE POLICY "Allow full access to recruitment_timeline" ON public.recruitment_timeline FOR ALL TO public USING (true) WITH CHECK (true);
GRANT ALL ON public.recruitment_timeline TO anon, authenticated, service_role;

-- Évaluations
CREATE TABLE IF NOT EXISTS public.candidate_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES public.trial_candidates(id) ON DELETE CASCADE,
    scout_id UUID,
    evaluation_date DATE DEFAULT CURRENT_DATE,
    technical_score NUMERIC DEFAULT 0,
    tactical_score NUMERIC DEFAULT 0,
    physical_score NUMERIC DEFAULT 0,
    mental_score NUMERIC DEFAULT 0,
    overall_score NUMERIC DEFAULT 0,
    verdict VARCHAR(50) DEFAULT 'undecided',
    comments TEXT,
    strengths TEXT[],
    weaknesses TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS tech_report TEXT;
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS tact_report TEXT;
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS phys_report TEXT;
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS ment_report TEXT;
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS evaluator_id TEXT;

ALTER TABLE public.candidate_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to candidate_evaluations" ON public.candidate_evaluations;
CREATE POLICY "Allow full access to candidate_evaluations" ON public.candidate_evaluations FOR ALL TO public USING (true) WITH CHECK (true);
GRANT ALL ON public.candidate_evaluations TO anon, authenticated, service_role;


-- 6. INSERTION DES 11 JOUEURS TALENTS DÉTECTÉS U13 DANS SUPABASE
INSERT INTO public.trial_candidates (
    id, first_name, last_name, birth_date, birth_place, nationality, gender,
    primary_position, secondary_position, preferred_foot, height_cm, weight_kg, age_category,
    current_club, matches_played, goals, assists, discovering_scout_name, recruiter_name,
    recommendation_priority, scout_recommendation_notes, pipeline_stage, status
) VALUES
(
    'c0000000-0000-0000-0000-000000000001', 'Ziyad', 'Choukri', '2013-09-04', 'Témara', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 161, 48, 'U13',
    'Union Sportive Témara U13', 18, 0, 1, 'Hassan Benabicha', 'Karim Fassi-Fihri',
    'high', 'Gardien très agile, sorties aériennes courageuses, réflexes exceptionnels.', 'prospect', 'registered'
),
(
    'c0000000-0000-0000-0000-000000000002', 'Reda', 'Benmoussa', '2013-10-12', 'Kénitra', 'Marocaine', 'Masculin',
    'Défenseur Droit', 'Piston Droit', 'Droitier', 153, 43, 'U13',
    'KAC Kénitra Jeunes', 16, 2, 5, 'Youssef Safri', 'Hassan Benabicha',
    'high', 'Latéral droit infatigable, grosse débauche d''énergie et bons centres en course.', 'prospect', 'registered'
),
(
    'c0000000-0000-0000-0000-000000000003', 'Ilyas', 'Bennasser', '2013-11-10', 'Kénitra', 'Marocaine', 'Masculin',
    'Défenseur Central', 'Défenseur Gauche', 'Droitier', 158, 46, 'U13',
    'KAC Kénitra Jeunes', 15, 3, 2, 'Youssef Safri', 'Hassan Benabicha',
    'very_high', 'Solide au duel, sens de l''anticipation développé, bonne relance verticale pour son gabarit.', 'prospect', 'registered'
),
(
    'c0000000-0000-0000-0000-000000000004', 'Sami', 'El Fassi', '2014-01-20', 'Rabat', 'Marocaine', 'Masculin',
    'Défenseur Central', 'Milieu Défensif', 'Gaucher', 156, 44, 'U13',
    'FUS Rabat École U13', 14, 1, 3, 'Hassan Benabicha', 'Karim Fassi-Fihri',
    'high', 'Défenseur axial gaucher élégant, très calme à la relance.', 'prospect', 'registered'
),
(
    'c0000000-0000-0000-0000-000000000005', 'Ayman', 'Dahbi', '2014-03-08', 'Salé', 'Marocaine', 'Masculin',
    'Défenseur Gauche', 'Piston Gauche', 'Gaucher', 151, 40, 'U13',
    'AS FAR Jeunes U13', 17, 2, 6, 'Tarik Sektioui', 'Hassan Benabicha',
    'high', 'Latéral moderne, pied gauche très précis, vif dans les transitions.', 'prospect', 'registered'
),
(
    'c0000000-0000-0000-0000-000000000006', 'Yassine', 'Touzani', '2014-02-18', 'Rabat', 'Marocaine', 'Masculin',
    'Milieu Central', 'Milieu Défensif', 'Droitier', 152, 42, 'U13',
    'Académie Régionale Rabat U13', 14, 6, 9, 'Youssef Safri', 'Hassan Benabicha',
    'very_high', 'Excellente qualité de passe et vision de jeu précoce. Très habile dans la conservation du ballon.', 'prospect', 'registered'
),
(
    'c0000000-0000-0000-0000-000000000007', 'Marouane', 'Bennis', '2013-12-05', 'Salé', 'Marocaine', 'Masculin',
    'Milieu Central', 'Milieu Offensif', 'Droitier', 154, 43, 'U13',
    'Étoile de Salé U13', 15, 4, 7, 'Tarik Sektioui', 'Karim Fassi-Fihri',
    'high', 'Milieu relayeur box-to-box, grosse endurance et technique propre.', 'prospect', 'registered'
),
(
    'c0000000-0000-0000-0000-000000000008', 'Adam', 'Zerouali', '2014-04-16', 'Casablanca', 'Marocaine', 'Masculin',
    'Milieu Offensif', 'Ailier Gauche', 'Gaucher', 150, 41, 'U13',
    'Wydad Casablanca École U13', 17, 9, 10, 'Tarik Sektioui', 'Hassan Benabicha',
    'very_high', 'Meneur de jeu avec une très forte créativité, spécialiste des coups de pied arrêtés et dribbleur.', 'prospect', 'registered'
),
(
    'c0000000-0000-0000-0000-000000000009', 'Rayane', 'El Alami', '2014-06-25', 'Salé', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant', 'Gaucher', 148, 39, 'U13',
    'Étoile de Salé U13', 16, 12, 8, 'Tarik Sektioui', 'Karim Fassi-Fihri',
    'very_high', 'Pied gauche soyeux, grande accélération sur l''aile droite, percutant et très spontané.', 'prospect', 'registered'
),
(
    'c0000000-0000-0000-0000-000000000010', 'Walid', 'Naciri', '2014-05-11', 'Rabat', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant', 'Droitier', 151, 42, 'U13',
    'Stade Marocain Jeunes U13', 15, 8, 7, 'Youssef Safri', 'Hassan Benabicha',
    'high', 'Ailier percutant, rentre sur son pied droit pour frapper, très combatif.', 'prospect', 'registered'
),
(
    'c0000000-0000-0000-0000-000000000011', 'Hamza', 'Kabbaj', '2013-08-19', 'Salé', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 160, 49, 'U13',
    'Académie Mohammed VI U13', 18, 17, 4, 'Hassan Benabicha', 'Karim Fassi-Fihri',
    'very_high', 'Buteur complet, finisseur des deux pieds, bon jeu de tête et sens du placement dans la surface.', 'prospect', 'registered'
)
ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    primary_position = EXCLUDED.primary_position,
    age_category = EXCLUDED.age_category,
    current_club = EXCLUDED.current_club,
    matches_played = EXCLUDED.matches_played,
    goals = EXCLUDED.goals,
    assists = EXCLUDED.assists,
    pipeline_stage = EXCLUDED.pipeline_stage,
    status = EXCLUDED.status,
    updated_at = NOW();
