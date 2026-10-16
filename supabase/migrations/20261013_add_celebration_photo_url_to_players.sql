-- Migration: Add celebration_photo_url to public.players
-- Permet d'enregistrer la 2ème photo d'un joueur (célébration de but ou célébration d'arrêt décisif pour gardien)

ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS celebration_photo_url TEXT;

-- Privilèges d'accès
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT SELECT ON public.players TO anon;

COMMENT ON COLUMN public.players.celebration_photo_url IS 'Photo de célébration du joueur (But pour joueurs de champ, Arrêt décisif pour gardiens)';
