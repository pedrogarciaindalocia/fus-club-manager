-- ==============================================================================
-- Migration : Module Détection & Recrutement de Joueurs (fus-dashboard)
-- Date : 2026-08-25
-- ==============================================================================

-- 1. Table des Joueurs Candidats / À l'essai
CREATE TABLE IF NOT EXISTS public.trial_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    nationality VARCHAR(100) DEFAULT 'Marocaine',
    photo_url TEXT,
    primary_position VARCHAR(50) NOT NULL,
    secondary_position VARCHAR(50),
    preferred_foot VARCHAR(20) DEFAULT 'Droitier' CHECK (preferred_foot IN ('Droitier', 'Gaucher', 'Ambidextre')),
    height_cm NUMERIC(5,1),
    weight_kg NUMERIC(5,1),
    origin_club VARCHAR(150),
    status VARCHAR(30) DEFAULT 'registered' CHECK (status IN ('registered', 'in_trial', 'selected', 'rejected', 'on_hold')),
    pipeline_stage VARCHAR(50) DEFAULT 'shortlisted',
    age_category VARCHAR(30) DEFAULT 'U19',
    current_club VARCHAR(150),
    phone VARCHAR(50), 
    agent_name VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent alter for existing databases:
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50) DEFAULT 'shortlisted';
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS age_category VARCHAR(30) DEFAULT 'U19';
ALTER TABLE public.trial_candidates ADD COLUMN IF NOT EXISTS current_club VARCHAR(150);

-- 2. Table des Sessions de Tests / Détections
CREATE TABLE IF NOT EXISTS public.trial_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_name VARCHAR(150) NOT NULL,
    session_date DATE NOT NULL,
    session_time TIME DEFAULT '10:00:00',
    location VARCHAR(150) DEFAULT 'Complexe Sportif FUS - Terrain 1',
    lead_scout_name VARCHAR(150) DEFAULT 'Staff Technique & Détection',
    category_age VARCHAR(50) DEFAULT 'U19',
    status VARCHAR(30) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table de liaison / Évaluations Multicritères (4 Piliers)
CREATE TABLE IF NOT EXISTS public.candidate_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.trial_candidates(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.trial_sessions(id) ON DELETE SET NULL,
    evaluator_name VARCHAR(150) NOT NULL DEFAULT 'Scout Principal',
    evaluation_date DATE DEFAULT CURRENT_DATE,
    
    -- Pilier 1 : Physique (Scores 1 à 100)
    phys_speed INT CHECK (phys_speed BETWEEN 0 AND 100) DEFAULT 70,
    phys_endurance INT CHECK (phys_endurance BETWEEN 0 AND 100) DEFAULT 70,
    phys_strength INT CHECK (phys_strength BETWEEN 0 AND 100) DEFAULT 70,
    phys_agility INT CHECK (phys_agility BETWEEN 0 AND 100) DEFAULT 70,
    phys_jump INT CHECK (phys_jump BETWEEN 0 AND 100) DEFAULT 70,
    physical_score NUMERIC(5,2) GENERATED ALWAYS AS ((phys_speed + phys_endurance + phys_strength + phys_agility + phys_jump) / 5.0) STORED,

    -- Pilier 2 : Mental (Scores 1 à 100)
    ment_determination INT CHECK (ment_determination BETWEEN 0 AND 100) DEFAULT 75,
    ment_focus INT CHECK (ment_focus BETWEEN 0 AND 100) DEFAULT 70,
    ment_teamwork INT CHECK (ment_teamwork BETWEEN 0 AND 100) DEFAULT 75,
    ment_composure INT CHECK (ment_composure BETWEEN 0 AND 100) DEFAULT 70,
    ment_leadership INT CHECK (ment_leadership BETWEEN 0 AND 100) DEFAULT 65,
    mental_score NUMERIC(5,2) GENERATED ALWAYS AS ((ment_determination + ment_focus + ment_teamwork + ment_composure + ment_leadership) / 5.0) STORED,

    -- Pilier 3 : Tactique (Scores 1 à 100)
    tact_positioning INT CHECK (tact_positioning BETWEEN 0 AND 100) DEFAULT 70,
    tact_vision INT CHECK (tact_vision BETWEEN 0 AND 100) DEFAULT 70,
    tact_anticipation INT CHECK (tact_anticipation BETWEEN 0 AND 100) DEFAULT 70,
    tact_game_iq INT CHECK (tact_game_iq BETWEEN 0 AND 100) DEFAULT 70,
    tact_transition INT CHECK (tact_transition BETWEEN 0 AND 100) DEFAULT 70,
    tactical_score NUMERIC(5,2) GENERATED ALWAYS AS ((tact_positioning + tact_vision + tact_anticipation + tact_game_iq + tact_transition) / 5.0) STORED,

    -- Pilier 4 : Technique (Scores 1 à 100)
    tech_first_touch INT CHECK (tech_first_touch BETWEEN 0 AND 100) DEFAULT 75,
    tech_passing INT CHECK (tech_passing BETWEEN 0 AND 100) DEFAULT 70,
    tech_shooting INT CHECK (tech_shooting BETWEEN 0 AND 100) DEFAULT 70,
    tech_dribbling INT CHECK (tech_dribbling BETWEEN 0 AND 100) DEFAULT 75,
    tech_heading INT CHECK (tech_heading BETWEEN 0 AND 100) DEFAULT 65,
    technical_score NUMERIC(5,2) GENERATED ALWAYS AS ((tech_first_touch + tech_passing + tech_shooting + tech_dribbling + tech_heading) / 5.0) STORED,

    -- Overall Score
    overall_score NUMERIC(5,2) GENERATED ALWAYS AS (
        ((phys_speed + phys_endurance + phys_strength + phys_agility + phys_jump) / 5.0 +
         (ment_determination + ment_focus + ment_teamwork + ment_composure + ment_leadership) / 5.0 +
         (tact_positioning + tact_vision + tact_anticipation + tact_game_iq + tact_transition) / 5.0 +
         (tech_first_touch + tech_passing + tech_shooting + tech_dribbling + tech_heading) / 5.0) / 4.0
    ) STORED,

    verdict VARCHAR(50) DEFAULT 'under_review' CHECK (verdict IN ('sign_immediately', 'sign_academy', 'second_trial', 'standby', 'reject')),
    strengths TEXT,
    weaknesses TEXT,
    general_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances de requête
CREATE INDEX IF NOT EXISTS idx_candidates_status ON public.trial_candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_position ON public.trial_candidates(primary_position);
CREATE INDEX IF NOT EXISTS idx_evaluations_candidate ON public.candidate_evaluations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_session ON public.candidate_evaluations(session_id);

-- Activer RLS
ALTER TABLE public.trial_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_evaluations ENABLE ROW LEVEL SECURITY;

-- Politiques RLS (lecture/écriture pour utilisateurs authentifiés)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trial_candidates' AND policyname = 'Allow authenticated users full access to trial_candidates') THEN
        CREATE POLICY "Allow authenticated users full access to trial_candidates" ON public.trial_candidates FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trial_sessions' AND policyname = 'Allow authenticated users full access to trial_sessions') THEN
        CREATE POLICY "Allow authenticated users full access to trial_sessions" ON public.trial_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_evaluations' AND policyname = 'Allow authenticated users full access to candidate_evaluations') THEN
        CREATE POLICY "Allow authenticated users full access to candidate_evaluations" ON public.candidate_evaluations FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;
