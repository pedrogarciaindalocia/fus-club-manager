-- ==============================================================================
-- FUS RABAT — MODULE GESTION DES ENTRAÎNEMENTS (MIGRATION & SCHÉMA SUPABASE)
-- ==============================================================================

-- 1. TABLE DES EXERCICES & ATELIERS (BIBLIOTHÈQUE)
CREATE TABLE IF NOT EXISTS public.training_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'Technique', 'Tactique', 'Physique', 'Finition', 'Possession', 'Transition', 'Coups de pied arrêtés', 'Échauffement', 'Jeu réduit', 'Match d''application', 'Spécifique gardien', 'Coordination', 'Vitesse', 'Récupération'
  pitch_surface TEXT,
  equipment_needed TEXT[] DEFAULT '{}',
  duration_minutes INTEGER NOT NULL DEFAULT 20,
  rest_minutes INTEGER DEFAULT 3,
  player_count_recommended TEXT,
  intensity_level TEXT NOT NULL DEFAULT 'moyenne', -- 'faible', 'moyenne', 'elevee', 'tres_elevee'
  description TEXT NOT NULL,
  success_criteria TEXT[] DEFAULT '{}',
  coaching_points TEXT[] DEFAULT '{}',
  diagram_url TEXT,
  video_url TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLE DES SÉANCES D'ENTRAÎNEMENT
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  team TEXT NOT NULL, -- 'Équipe Première', 'U21', 'U19', 'U17', 'U15'
  category TEXT NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  pitch TEXT NOT NULL,
  coach_name TEXT NOT NULL,
  session_type TEXT NOT NULL, -- 'Tactique', 'Physique', 'Technique', 'Récupération', 'Mixte', etc.
  intensity_level TEXT NOT NULL DEFAULT 'elevee',
  intensity_rpe_avg NUMERIC(3,1),
  primary_objective TEXT NOT NULL,
  secondary_objectives TEXT[] DEFAULT '{}',
  equipment_needed TEXT[] DEFAULT '{}',
  weather TEXT,
  status TEXT NOT NULL DEFAULT 'planifiee', -- 'planifiee', 'en_cours', 'terminee', 'annulee'
  called_players_count INTEGER DEFAULT 0,
  present_players_count INTEGER DEFAULT 0,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. EXERCICES ASSOCIÉS AUX SÉANCES (LIAISON & DÉROULÉ)
CREATE TABLE IF NOT EXISTS public.session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.training_exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 1,
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  rest_minutes INTEGER DEFAULT 2,
  pitch_zone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. FEUILLE DE PRÉSENCE DES SÉANCES
CREATE TABLE IF NOT EXISTS public.session_attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  position TEXT,
  status TEXT NOT NULL DEFAULT 'present', -- 'present', 'absent', 'retard', 'blesse', 'excuse'
  arrival_time TIME,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABLE DES ÉVALUATIONS DES JOUEURS (4 PILIERS)
CREATE TABLE IF NOT EXISTS public.player_training_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  session_name TEXT,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  evaluator_name TEXT NOT NULL,
  technical_score NUMERIC(3,1) NOT NULL CHECK (technical_score >= 1 AND technical_score <= 10),
  tactical_score NUMERIC(3,1) NOT NULL CHECK (tactical_score >= 1 AND tactical_score <= 10),
  physical_score NUMERIC(3,1) NOT NULL CHECK (physical_score >= 1 AND physical_score <= 10),
  mental_score NUMERIC(3,1) NOT NULL CHECK (mental_score >= 1 AND mental_score <= 10),
  global_score NUMERIC(3,1) NOT NULL CHECK (global_score >= 1 AND global_score <= 10),
  strengths TEXT[] DEFAULT '{}',
  improvements TEXT[] DEFAULT '{}',
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. SUIVI DE LA CHARGE D'ENTRAÎNEMENT & DONNÉES GPS
CREATE TABLE IF NOT EXISTS public.player_training_loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER NOT NULL,
  rpe_score NUMERIC(3,1) NOT NULL CHECK (rpe_score >= 1 AND rpe_score <= 10),
  training_load NUMERIC(6,1) NOT NULL, -- Computed as duration_minutes * rpe_score
  distance_km NUMERIC(4,2),
  high_intensity_distance_m INTEGER,
  sprint_count INTEGER,
  accelerations INTEGER,
  decelerations INTEGER,
  max_speed_kmh NUMERIC(4,1),
  acute_chronic_ratio NUMERIC(3,2),
  alert_status TEXT NOT NULL DEFAULT 'optimal', -- 'optimal', 'high', 'spike', 'low'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR OPTIMAL QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON public.training_sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_training_sessions_team ON public.training_sessions(team);
CREATE INDEX IF NOT EXISTS idx_training_sessions_status ON public.training_sessions(status);
CREATE INDEX IF NOT EXISTS idx_training_exercises_category ON public.training_exercises(category);
CREATE INDEX IF NOT EXISTS idx_session_attendances_session ON public.session_attendances(session_id);
CREATE INDEX IF NOT EXISTS idx_player_evaluations_player ON public.player_training_evaluations(player_id);
CREATE INDEX IF NOT EXISTS idx_player_loads_date ON public.player_training_loads(session_date DESC);

-- RLS POLICIES (ENABLE ALL AUTHENTICATED STAFF ACCESS)
ALTER TABLE public.training_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_training_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_training_loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read training_exercises" ON public.training_exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write training_exercises" ON public.training_exercises FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read training_sessions" ON public.training_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write training_sessions" ON public.training_sessions FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read session_attendances" ON public.session_attendances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write session_attendances" ON public.session_attendances FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read player_training_evaluations" ON public.player_training_evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write player_training_evaluations" ON public.player_training_evaluations FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read player_training_loads" ON public.player_training_loads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write player_training_loads" ON public.player_training_loads FOR ALL TO authenticated USING (true);
