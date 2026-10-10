-- ==========================================
-- Migration : Rubrique Gestion des Arbitres
-- ==========================================

-- 1. Création de la table 'arbitres'
CREATE TABLE IF NOT EXISTS public.arbitres (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    date_naissance DATE,
    nationalite VARCHAR(50) DEFAULT 'Maroc',
    numero_licence VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE,
    telephone VARCHAR(20),
    role_principal VARCHAR(50) DEFAULT 'central' CHECK (role_principal IN ('central', 'assistant', 'var', 'quatrieme')),
    grade VARCHAR(50) DEFAULT 'Régional' CHECK (grade IN ('FIFA', 'National 1', 'Régional', 'District')),
    statut VARCHAR(50) DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'suspendu', 'retraite')),
    photo_url VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index de recherche rapide
CREATE INDEX IF NOT EXISTS idx_arbitres_licence ON public.arbitres(numero_licence);
CREATE INDEX IF NOT EXISTS idx_arbitres_statut ON public.arbitres(statut);
CREATE INDEX IF NOT EXISTS idx_arbitres_role ON public.arbitres(role_principal);

-- 3. Trigger pour mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_arbitres_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_arbitres_timestamp ON public.arbitres;
CREATE TRIGGER trigger_update_arbitres_timestamp
    BEFORE UPDATE ON public.arbitres
    FOR EACH ROW
    EXECUTE FUNCTION update_arbitres_updated_at();

-- 4. Activer Row Level Security (RLS)
ALTER TABLE public.arbitres ENABLE ROW LEVEL SECURITY;

-- Politiques RLS (lecture publique pour consultation, modification autorisée)
DROP POLICY IF EXISTS "Allow public read for arbitres" ON public.arbitres;
CREATE POLICY "Allow public read for arbitres"
    ON public.arbitres FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow full access for authenticated users on arbitres" ON public.arbitres;
CREATE POLICY "Allow full access for authenticated users on arbitres"
    ON public.arbitres FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. Données de démonstration (Mock Data)
INSERT INTO public.arbitres (nom, prenom, date_naissance, nationalite, numero_licence, email, telephone, role_principal, grade, statut, photo_url)
VALUES
    ('Ghayat', 'Redouane', '1987-03-15', 'Maroc', 'ARB-2024-001', 'r.ghayat@frmf.ma', '+212 661 123456', 'central', 'FIFA', 'actif', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'),
    ('Jiyed', 'Redouane', '1979-04-09', 'Maroc', 'ARB-2024-002', 'r.jiyed@frmf.ma', '+212 662 234567', 'var', 'FIFA', 'actif', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300'),
    ('Bouchra', 'Karboubi', '1987-05-15', 'Maroc', 'ARB-2024-003', 'b.karboubi@frmf.ma', '+212 663 345678', 'central', 'FIFA', 'actif', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300'),
    ('Azgaou', 'Lahsen', '1989-11-20', 'Maroc', 'ARB-2024-004', 'l.azgaou@frmf.ma', '+212 664 456789', 'assistant', 'National 1', 'actif', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300'),
    ('Brinsi', 'Fatiha', '1992-08-05', 'Maroc', 'ARB-2024-005', 'f.brinsi@frmf.ma', '+212 665 567890', 'quatrieme', 'Régional', 'actif', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=300')
ON CONFLICT (numero_licence) DO NOTHING;
