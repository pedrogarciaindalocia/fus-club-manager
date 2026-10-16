-- Migration : Contrainte UNIQUE sur settings.club_id et support persistant de la colonne plugins
-- Résout l'erreur PostgREST 400 "there is no unique or exclusion constraint matching the ON CONFLICT specification"

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS plugins JSONB DEFAULT '{"recruitment_v1": true, "show_fan_button": false}'::jsonb;

-- Ajouter une contrainte UNIQUE sur club_id si elle n'existe pas encore
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'settings_club_id_key'
  ) THEN
    -- Supprimer les éventuels doublons pour préserver l'intégrité
    DELETE FROM public.settings a USING public.settings b
    WHERE a.id < b.id AND a.club_id = b.club_id AND a.club_id IS NOT NULL;

    ALTER TABLE public.settings ADD CONSTRAINT settings_club_id_key UNIQUE (club_id);
  END IF;
END $$;
