-- Migration : Support de la persistance des plugins dans la table settings
-- Permet de stocker la configuration des plugins activés/désactivés au niveau club

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS plugins JSONB DEFAULT '{"recruitment_v1": true}'::jsonb;

-- Commentaire descriptif
COMMENT ON COLUMN public.settings.plugins IS 'Configuration dynamique des plugins activés/désactivés du club';
