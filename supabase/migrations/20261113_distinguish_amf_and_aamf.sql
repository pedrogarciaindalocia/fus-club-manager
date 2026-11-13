-- ==============================================================================
-- Migration : Distinction stricte entre AMF (Académie Mohammed VI) et AAMF
-- Date : 2026-11-13
-- Projet : FUS Club (fus-dashboard & fus-app)
-- ==============================================================================

DO $$
DECLARE
    v_amf_id UUID;
    v_aamf_id UUID;
BEGIN
    -- 1. Identifier le club AMF (Académie Mohammed VI de Football)
    SELECT id INTO v_amf_id 
    FROM public.clubs 
    WHERE UPPER(TRIM(name)) = 'AMF' OR UPPER(TRIM(short_name)) = 'AMF' 
    LIMIT 1;

    IF v_amf_id IS NOT NULL THEN
        UPDATE public.clubs
        SET 
            name = 'AMF',
            short_name = 'AMF',
            logo_url = 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/logos/clubs/u21-amf.png',
            country = 'Maroc'
        WHERE id = v_amf_id;
    END IF;

    -- 2. Identifier le club AAMF (distinct de AMF)
    SELECT id INTO v_aamf_id 
    FROM public.clubs 
    WHERE (UPPER(TRIM(name)) = 'AAMF' OR UPPER(TRIM(short_name)) = 'AAMF')
      AND (v_amf_id IS NULL OR id <> v_amf_id)
    LIMIT 1;

    -- 3. Rectification des matchs U21 du calendrier
    -- Les matchs U21 contre l'Académie Mohammed VI doivent être rattachés à AMF et non AAMF
    IF v_amf_id IS NOT NULL AND v_aamf_id IS NOT NULL THEN
        UPDATE public.matches
        SET opponent_id = v_amf_id
        WHERE category = 'U21' AND opponent_id = v_aamf_id;

        -- Rectification des matchs inter-adversaires si existants
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'opponent_matches') THEN
            UPDATE public.opponent_matches
            SET home_club_id = v_amf_id
            WHERE category = 'U21' AND home_club_id = v_aamf_id;

            UPDATE public.opponent_matches
            SET away_club_id = v_amf_id
            WHERE category = 'U21' AND away_club_id = v_aamf_id;
        END IF;

        -- Rectification de la table public.frmf_matches pour U21
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'frmf_matches') THEN
            UPDATE public.frmf_matches
            SET home_team = 'AMF', home_team_short = 'AMF'
            WHERE category = 'U21' AND (UPPER(TRIM(home_team)) = 'AAMF' OR UPPER(TRIM(home_team_short)) = 'AAMF');

            UPDATE public.frmf_matches
            SET away_team = 'AMF', away_team_short = 'AMF'
            WHERE category = 'U21' AND (UPPER(TRIM(away_team)) = 'AAMF' OR UPPER(TRIM(away_team_short)) = 'AAMF');
        END IF;

        RAISE NOTICE 'Rectification réussie : Matchs U21 réassignés de AAMF (%) vers AMF (%)', v_aamf_id, v_amf_id;
    END IF;
END $$;

