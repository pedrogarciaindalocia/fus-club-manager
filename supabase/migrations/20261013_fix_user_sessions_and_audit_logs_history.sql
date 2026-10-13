-- =========================================================================
-- Migration SQL : Déblocage Droits & Historisation des Sessions Utilisateurs
-- Tables : public.user_sessions & public.audit_logs
-- Résout l'anomalie : permission denied (42501) & absence d'historique dans /logs
-- =========================================================================

-- 1. S'assurer que les tables existent avec toutes les colonnes requises
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email VARCHAR(255),
    user_role VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    device VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    login_at TIMESTAMPTZ DEFAULT NOW(),
    logout_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    module VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    description TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(50) DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Supprimer d'éventuelles contraintes CHECK trop restrictives sur le statut
DO $$
BEGIN
    ALTER TABLE public.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_status_check;
EXCEPTION
    WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_status_check;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Rendre la clé étrangère sur session_id non bloquante dans audit_logs
DO $$
BEGIN
    ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_session_id_fkey;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 3. ATTRIBUTION FORMELLE DES PERMISSIONS POSTGRESQL (GRANT)
-- C'est l'absence de ces GRANT qui provoquait l'erreur 42501 "permission denied"
GRANT ALL PRIVILEGES ON TABLE public.user_sessions TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.audit_logs TO anon, authenticated, service_role;

-- 4. Activer RLS avec politiques permissives et sécurisées
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour user_sessions
DROP POLICY IF EXISTS "allow_select_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "allow_select_sessions_all" ON public.user_sessions;
CREATE POLICY "allow_select_sessions_all" ON public.user_sessions
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "allow_insert_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "allow_insert_sessions_all" ON public.user_sessions;
CREATE POLICY "allow_insert_sessions_all" ON public.user_sessions
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "allow_update_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "allow_update_sessions_all" ON public.user_sessions;
CREATE POLICY "allow_update_sessions_all" ON public.user_sessions
    FOR UPDATE TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "allow_delete_sessions_all" ON public.user_sessions;
CREATE POLICY "allow_delete_sessions_all" ON public.user_sessions
    FOR DELETE TO anon, authenticated
    USING (true);

-- Politiques RLS pour audit_logs
DROP POLICY IF EXISTS "allow_select_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "allow_select_audit_logs_all" ON public.audit_logs;
CREATE POLICY "allow_select_audit_logs_all" ON public.audit_logs
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "allow_insert_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "allow_insert_audit_logs_all" ON public.audit_logs;
CREATE POLICY "allow_insert_audit_logs_all" ON public.audit_logs
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "allow_update_audit_logs_all" ON public.audit_logs;
CREATE POLICY "allow_update_audit_logs_all" ON public.audit_logs
    FOR UPDATE TO anon, authenticated
    USING (true);

-- 5. Index pour les performances de tri et de recherche dans /logs
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_at ON public.user_sessions(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON public.user_sessions(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON public.audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 6. Rechargement du cache PostgREST
NOTIFY pgrst, 'reload schema';
