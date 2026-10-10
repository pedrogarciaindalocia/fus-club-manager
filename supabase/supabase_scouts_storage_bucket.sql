-- ==============================================================================
-- Migration : Création et configuration du bucket Supabase Storage 'scouts'
-- Module : Recrutement & Détection FUS (Photos des Joueurs et des Scouts)
-- ==============================================================================

-- 1. Insérer ou mettre à jour le bucket 'scouts' pour qu'il soit public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'scouts',
    'scouts',
    true,
    10485760, -- 10 MB max
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- 2. Activer RLS sur storage.objects (déjà activé par défaut dans Supabase)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Politiques RLS pour le bucket 'scouts'

-- 3.1 Lecture publique de toutes les photos du bucket 'scouts' 
DROP POLICY IF EXISTS "Public Access scouts photos" ON storage.objects;
CREATE POLICY "Public Access scouts photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'scouts');

-- 3.2 Upload / Insertion pour les utilisateurs authentifiés et anonymes
DROP POLICY IF EXISTS "Allow upload to scouts bucket" ON storage.objects;
CREATE POLICY "Allow upload to scouts bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'scouts');

-- 3.3 Mise à jour pour le bucket 'scouts'
DROP POLICY IF EXISTS "Allow update in scouts bucket" ON storage.objects;
CREATE POLICY "Allow update in scouts bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'scouts');

-- 3.4 Suppression pour le bucket 'scouts'
DROP POLICY IF EXISTS "Allow delete in scouts bucket" ON storage.objects;
CREATE POLICY "Allow delete in scouts bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'scouts');
