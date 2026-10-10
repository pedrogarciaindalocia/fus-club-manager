
-- Migration: Création du bucket 'medias' et du module de gestion de médias (Digital Asset Management)
-- Date: 2026-10-01
-- Description: Centralisation du stockage dans le bucket 'medias', tables media_folders et media_files avec RLS

-- 1. Création du bucket 'medias' sécurisé avec liste blanche de types MIME autorisés (anti-malware & anti-scripts)
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES (
  'medias', 
  'medias', 
  true, 
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

-- Politiques de sécurité Storage pour le bucket 'medias'
DO $$
BEGIN
  -- Lecture publique de tous les objets du bucket medias
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access on medias bucket'
  ) THEN
    CREATE POLICY "Public Access on medias bucket"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'medias');
  END IF;

  -- Écriture (upload) pour utilisateurs authentifiés ou clé anon
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Insert Access on medias bucket'
  ) THEN
    CREATE POLICY "Insert Access on medias bucket"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'medias');
  END IF;

  -- Modification pour utilisateurs authentifiés ou clé anon
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Update Access on medias bucket'
  ) THEN
    CREATE POLICY "Update Access on medias bucket"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'medias');
  END IF;

  -- Suppression pour utilisateurs authentifiés ou clé anon
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Delete Access on medias bucket'
  ) THEN
    CREATE POLICY "Delete Access on medias bucket"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'medias');
  END IF;
END $$;

-- 2. Table des dossiers de médias
CREATE TABLE IF NOT EXISTS public.media_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.media_folders(id) ON DELETE CASCADE,
  path TEXT NOT NULL DEFAULT '/',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche rapide par parent
CREATE INDEX IF NOT EXISTS idx_media_folders_parent_id ON public.media_folders(parent_id);

-- 3. Table des fichiers médias
CREATE TABLE IF NOT EXISTS public.media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES public.media_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche rapide par dossier
CREATE INDEX IF NOT EXISTS idx_media_files_folder_id ON public.media_files(folder_id);

-- 4. Activation RLS sur les tables de métadonnées
ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Policies sur media_folders
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_folders' AND policyname = 'Allow public select media_folders') THEN
    CREATE POLICY "Allow public select media_folders" ON public.media_folders FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_folders' AND policyname = 'Allow insert media_folders') THEN
    CREATE POLICY "Allow insert media_folders" ON public.media_folders FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_folders' AND policyname = 'Allow update media_folders') THEN
    CREATE POLICY "Allow update media_folders" ON public.media_folders FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_folders' AND policyname = 'Allow delete media_folders') THEN
    CREATE POLICY "Allow delete media_folders" ON public.media_folders FOR DELETE USING (true);
  END IF;

  -- Policies sur media_files
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_files' AND policyname = 'Allow public select media_files') THEN
    CREATE POLICY "Allow public select media_files" ON public.media_files FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_files' AND policyname = 'Allow insert media_files') THEN
    CREATE POLICY "Allow insert media_files" ON public.media_files FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_files' AND policyname = 'Allow update media_files') THEN
    CREATE POLICY "Allow update media_files" ON public.media_files FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_files' AND policyname = 'Allow delete media_files') THEN
    CREATE POLICY "Allow delete media_files" ON public.media_files FOR DELETE USING (true);
  END IF;
END $$;

-- 5. Attribution des permissions PostgreSQL (indispensable pour l'accès API Supabase)
GRANT ALL ON TABLE public.media_folders TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.media_files TO postgres, anon, authenticated, service_role;

-- 6. Insertion / Seed des dossiers par défaut de l'arborescence (Miroir exact de la Médiathèque FUS Club)
INSERT INTO public.media_folders (id, name, parent_id, path)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'default', NULL, '/default'),
  ('a0000000-0000-0000-0000-000000000002', 'Joueurs', NULL, '/Joueurs'),
  ('a0000000-0000-0000-0000-000000000003', 'Staff', NULL, '/Staff'),

  -- Sous-dossiers Joueurs : Catégories officielles FUS (U13 à U23 + Équipe Première)
  ('a0000000-0000-0000-0000-000000000013', 'U13', 'a0000000-0000-0000-0000-000000000002', '/Joueurs/U13'),
  ('a0000000-0000-0000-0000-000000000014', 'U14', 'a0000000-0000-0000-0000-000000000002', '/Joueurs/U14'),
  ('a0000000-0000-0000-0000-000000000015', 'U15', 'a0000000-0000-0000-0000-000000000002', '/Joueurs/U15'),
  ('a0000000-0000-0000-0000-000000000016', 'U16', 'a0000000-0000-0000-0000-000000000002', '/Joueurs/U16'),
  ('a0000000-0000-0000-0000-000000000017', 'U17', 'a0000000-0000-0000-0000-000000000002', '/Joueurs/U17'),
  ('a0000000-0000-0000-0000-000000000018', 'U18', 'a0000000-0000-0000-0000-000000000002', '/Joueurs/U18'),
  ('a0000000-0000-0000-0000-000000000019', 'U19', 'a0000000-0000-0000-0000-000000000002', '/Joueurs/U19'),
  ('a0000000-0000-0000-0000-000000000020', 'U20', 'a0000000-0000-0000-0000-000000000002', '/Joueurs/U20'),
  ('a0000000-0000-0000-0000-000000000021', 'U21', 'a0000000-0000-0000-0000-000000000002', '/Joueurs/U21'),
  ('a0000000-0000-0000-0000-000000000022', 'U22', 'a0000000-0000-0000-0000-000000000002', '/Joueurs/U22'),
  ('a0000000-0000-0000-0000-000000000023', 'U23', 'a0000000-0000-0000-0000-000000000002', '/Joueurs/U23'),
  ('a0000000-0000-0000-0000-000000000024', 'Équipe Première', 'a0000000-0000-0000-0000-000000000002', '/Joueurs/Équipe Première'),

  -- Sous-dossiers Staff : Exacts selon le tableau de bord FUS Club
  ('a0000000-0000-0000-0000-000000000031', 'Analystes video', 'a0000000-0000-0000-0000-000000000003', '/Staff/Analystes video'),
  ('a0000000-0000-0000-0000-000000000032', 'Coachs', 'a0000000-0000-0000-0000-000000000003', '/Staff/Coachs'),
  ('a0000000-0000-0000-0000-000000000033', 'Scouts', 'a0000000-0000-0000-0000-000000000003', '/Staff/Scouts')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  parent_id = EXCLUDED.parent_id,
  path = EXCLUDED.path;


