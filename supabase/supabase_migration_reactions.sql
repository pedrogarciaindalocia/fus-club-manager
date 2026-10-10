-- Migration pour la gestion des réactions de match
-- Crée la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.match_reactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- peut être NULL pour un fan non authentifié
    reaction text NOT NULL, -- ex: 'fire', 'thumbsup', 'thumbsdown'
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Activation du RLS (Row Level Security)
ALTER TABLE public.match_reactions ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre à tout le monde de lire les réactions (SELECT)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'match_reactions' AND policyname = 'Permettre la lecture à tout le monde'
    ) THEN
        CREATE POLICY "Permettre la lecture à tout le monde" 
        ON public.match_reactions FOR SELECT 
        USING (true);
    END IF;
END
$$;

-- Politique pour permettre aux fans (anon et authenticated) d'ajouter une réaction (INSERT)
-- Si l'application autorise les utilisateurs non connectés, le rôle public/anon peut insérer.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'match_reactions' AND policyname = 'Permettre l''ajout de réactions (public)'
    ) THEN
        CREATE POLICY "Permettre l'ajout de réactions (public)" 
        ON public.match_reactions FOR INSERT 
        WITH CHECK (true);
    END IF;
END
$$;

-- Politique pour la mise à jour (UPDATE) si besoin
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'match_reactions' AND policyname = 'Permettre la modification'
    ) THEN
        CREATE POLICY "Permettre la modification" 
        ON public.match_reactions FOR UPDATE 
        USING (true);
    END IF;
END
$$;

-- Politique pour la suppression (DELETE) si besoin
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'match_reactions' AND policyname = 'Permettre la suppression'
    ) THEN
        CREATE POLICY "Permettre la suppression" 
        ON public.match_reactions FOR DELETE 
        USING (true);
    END IF;
END
$$;

-- Note: Ce RLS est très permissif pour simplifier l'utilisation "Fan Zone".
-- En production, une logique de rate-limiting (par IP ou autre) pourrait être recommandée.

-- Activer le temps réel pour la table match_reactions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'match_reactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE match_reactions;
    END IF;
END $$;
