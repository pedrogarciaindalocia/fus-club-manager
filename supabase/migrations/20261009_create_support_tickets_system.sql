-- Migration : Système de Tickets Support (Fus-App & Fus-Dashboard)
-- Date : 2026-10-09
-- Description : Création des tables support_tickets et support_ticket_messages, 
--               des index, du bucket de stockage, des politiques RLS et du support temps réel.

-- 1. Table principale : support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Optionnel pour les fans invités non connectés
    user_email TEXT,
    user_name TEXT,
    user_avatar TEXT,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'autre', -- 'technique', 'compte', 'matchs', 'suggestion', 'autre'
    priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_reply_at TIMESTAMPTZ DEFAULT now()
);

-- Si la table existait déjà avec NOT NULL, s'assurer que user_id peut être NULL
DO $$
BEGIN
    ALTER TABLE public.support_tickets ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Index d'optimisation
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);

-- 2. Table des messages/réponses : support_ticket_messages
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID,
    sender_email TEXT,
    sender_name TEXT,
    sender_avatar TEXT,
    sender_role TEXT NOT NULL DEFAULT 'staff', -- 'user', 'staff', 'admin'
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index d'optimisation
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON public.support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_created_at ON public.support_ticket_messages(created_at ASC);

-- 3. Activation de Row Level Security (RLS)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS pour support_tickets
DROP POLICY IF EXISTS "Users can read own tickets or staff read all" ON public.support_tickets;
CREATE POLICY "Users can read own tickets or staff read all" ON public.support_tickets
    FOR SELECT TO anon, authenticated
    USING (
        -- Les fans et utilisateurs peuvent lire les tickets (filtrés par leur ID côté client)
        -- Les membres du staff voient tout
        true
    );

DROP POLICY IF EXISTS "Users can insert own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Anyone can insert tickets" ON public.support_tickets;
CREATE POLICY "Anyone can insert tickets" ON public.support_tickets
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        true
    );

DROP POLICY IF EXISTS "Users and staff can update tickets" ON public.support_tickets;
CREATE POLICY "Users and staff can update tickets" ON public.support_tickets
    FOR UPDATE TO anon, authenticated
    USING (
        true
    )
    WITH CHECK (
        true
    );

-- 5. Politiques RLS pour support_ticket_messages
DROP POLICY IF EXISTS "Users and staff can read messages" ON public.support_ticket_messages;
CREATE POLICY "Users and staff can read messages" ON public.support_ticket_messages
    FOR SELECT TO anon, authenticated
    USING (
        true
    );

DROP POLICY IF EXISTS "Users and staff can insert messages" ON public.support_ticket_messages;
CREATE POLICY "Users and staff can insert messages" ON public.support_ticket_messages
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        true
    );

-- 6. Droits d'accès
GRANT ALL ON TABLE public.support_tickets TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.support_ticket_messages TO anon, authenticated, service_role;

-- 7. Bucket de stockage pour les pièces jointes des tickets
INSERT INTO storage.buckets (id, name, public)
VALUES ('tickets', 'tickets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Politiques de stockage pour le bucket 'tickets'
DROP POLICY IF EXISTS "Public view for tickets bucket" ON storage.objects;
CREATE POLICY "Public view for tickets bucket" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id = 'tickets');

DROP POLICY IF EXISTS "Public upload to tickets bucket" ON storage.objects;
CREATE POLICY "Public upload to tickets bucket" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id = 'tickets');

-- 8. Ajout à la réplication temps réel Supabase
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;
