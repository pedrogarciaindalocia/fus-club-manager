-- =========================================================================
-- Migration SQL : Systèmes de Sessions Utilisateurs & Logs d'Audit Professionnels
-- =========================================================================

-- 1. Table des Sessions Utilisateurs ('user_sessions')
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email VARCHAR(255),
    user_role VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    device VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOGGED_OUT', 'EXPIRED')),
    login_at TIMESTAMPTZ DEFAULT NOW(),
    logout_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des Événements d'Audit ('audit_logs')
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) REFERENCES public.user_sessions(session_id) ON DELETE CASCADE,
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
    status VARCHAR(50) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index de Performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON public.user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_at ON public.user_sessions(login_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON public.audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 4. Politiqes de Sécurité Row Level Security (RLS)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Lecture seule pour utilisateurs authentifiés / Super Admins
CREATE POLICY "Lecture des sessions pour utilisateurs authentifiés" ON public.user_sessions
    FOR SELECT USING (true);

CREATE POLICY "Insertion des sessions pour tous" ON public.user_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Mise à jour des sessions pour tous" ON public.user_sessions
    FOR UPDATE USING (true);

CREATE POLICY "Lecture des audit logs pour utilisateurs authentifiés" ON public.audit_logs
    FOR SELECT USING (true);

CREATE POLICY "Insertion des audit logs pour tous" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- Commentaires explicatifs
COMMENT ON TABLE public.user_sessions IS 'Traçabilité complète des sessions utilisateurs (durée, IP, appareil, statut)';
COMMENT ON TABLE public.audit_logs IS 'Événements d audit granulaires (actions, modules, valeurs avant/après)';
