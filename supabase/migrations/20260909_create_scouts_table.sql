-- ==============================================================================
-- Migration : Table Scouts & Cellule Recrutement Détection (fus-dashboard)
-- Date : 2026-09-09
-- Auteur : Chef de Projet / Équipe Technique FUS
-- ==============================================================================

-- 1. Création de la table scouts
CREATE TABLE IF NOT EXISTS public.scouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    photo_url TEXT,
    phone VARCHAR(50),
    email VARCHAR(150),
    role_title VARCHAR(100) NOT NULL DEFAULT 'Scout Régional',
    recruitment_region VARCHAR(150) NOT NULL DEFAULT 'Rabat, Maroc',
    assigned_categories TEXT[] DEFAULT ARRAY['U17', 'U19']::TEXT[],
    assigned_teams TEXT[] DEFAULT ARRAY['Académie FUS']::TEXT[],
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    recruited_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index pour la performance
CREATE INDEX IF NOT EXISTS idx_scouts_status ON public.scouts(status);
CREATE INDEX IF NOT EXISTS idx_scouts_region ON public.scouts(recruitment_region);

-- 3. Activation de la sécurité RLS
ALTER TABLE public.scouts ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS (lecture, insertion, modification, suppression pour utilisateurs authentifiés et service)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'scouts' AND policyname = 'Allow authenticated users full access to scouts'
    ) THEN
        CREATE POLICY "Allow authenticated users full access to scouts" 
        ON public.scouts 
        FOR ALL 
        TO authenticated 
        USING (true) 
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'scouts' AND policyname = 'Allow public read access to scouts'
    ) THEN
        CREATE POLICY "Allow public read access to scouts" 
        ON public.scouts 
        FOR SELECT 
        TO anon 
        USING (true);
    END IF;
END $$;

-- 5. Insertion des scouts référents initiaux du FUS
INSERT INTO public.scouts (id, full_name, photo_url, phone, email, role_title, recruitment_region, assigned_categories, assigned_teams, status, recruited_date, notes)
VALUES
    ('a1111111-1111-4111-8111-111111111111', 'Hassan Benabicha', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', '+212 6 61 11 22 33', 'h.benabicha@fus.ma', 'Directeur du Recrutement & Scouting', 'National / Élite', ARRAY['U19', 'U21', 'Équipe Pro'], ARRAY['Académie FUS Élite', 'Équipe Réserve'], 'active', '2022-06-01', 'Ancien cadre fédéral, réseau très étendu au Maroc et en Afrique subsaharienne.'),
    ('a2222222-2222-4222-8222-222222222222', 'Youssef Safri', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', '+212 6 62 44 55 66', 'y.safri@fus.ma', 'Scout Principal - Nord & Centre', 'Rabat-Salé-Kénitra & Casablanca', ARRAY['U15', 'U17', 'U19'], ARRAY['Académie FUS Formation'], 'active', '2023-09-15', 'Spécialiste de la détection précoce des milieux et profils techniques.'),
    ('a3333333-3333-4333-8333-333333333333', 'Tarik Sektioui', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', '+212 6 63 77 88 99', 't.sektioui@fus.ma', 'Scout Régional - Nord & Oriental', 'Tanger-Tétouan & Fès-Meknès', ARRAY['U17', 'U19'], ARRAY['Académie FUS'], 'active', '2024-01-10', 'Veille active sur les championnats régionaux et tournois scolaires.'),
    ('a4444444-4444-4444-8444-444444444444', 'Karim Fassi-Fihri', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', '+212 6 65 99 88 77', 'k.fassi@fus.ma', 'Chargé de Recrutement & Négociations', 'Région Centre & International', ARRAY['U19', 'U21', 'Équipe Pro'], ARRAY['Équipe Pro', 'Académie U21'], 'active', '2023-01-15', 'Expert contractuel, suivi des démarches académiques et relation clubs partenaires.')
ON CONFLICT (id) DO NOTHING;
