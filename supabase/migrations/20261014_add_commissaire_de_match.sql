-- Migration: Add commissaire de match support for arbitres and matches
-- Date: 2026-10-14

-- 1. Ajouter la colonne referee_commissaire_id sur la table matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS referee_commissaire_id BIGINT;
COMMENT ON COLUMN public.matches.referee_commissaire_id IS 'ID du commissaire du match / délégué officiel de la rencontre';

-- 2. Mettre à jour la contrainte CHECK sur le rôle principal des arbitres
DO $$
BEGIN
    ALTER TABLE public.arbitres DROP CONSTRAINT IF EXISTS arbitres_role_principal_check;
    ALTER TABLE public.arbitres ADD CONSTRAINT arbitres_role_principal_check 
        CHECK (role_principal IN ('central', 'assistant', 'var', 'quatrieme', 'commissaire'));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Contrainte arbitres_role_principal_check mise à jour ou déjà compatible';
END $$;
