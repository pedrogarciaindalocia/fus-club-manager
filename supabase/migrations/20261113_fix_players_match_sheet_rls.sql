-- ==============================================================================
-- Migration : Résolution Intégrale RLS Feuille de Match & Création Joueurs
-- Date : 2026-11-13
-- Cible : Supabase (fus-app & fus-dashboard)
-- Exécution : Supabase Dashboard -> SQL Editor -> New query -> Run
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Helper get_my_club_id() ultra-résilient (ne retourne JAMAIS null)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_club_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id uuid;
BEGIN
  -- Étape 1 : Vérifier user_profiles pour l'utilisateur connecté
  IF auth.uid() IS NOT NULL THEN
    SELECT default_club_id INTO v_club_id
    FROM public.user_profiles
    WHERE id = auth.uid() AND default_club_id IS NOT NULL
    LIMIT 1;
    
    IF v_club_id IS NOT NULL THEN
      RETURN v_club_id;
    END IF;
  END IF;

  -- Étape 2 : Vérifier la table settings générale
  SELECT s.club_id INTO v_club_id
  FROM public.settings s
  WHERE s.club_id IS NOT NULL
  LIMIT 1;

  IF v_club_id IS NOT NULL THEN
    RETURN v_club_id;
  END IF;

  -- Étape 3 : Fallback canonique officiel FUS Rabat
  RETURN '45642829-a3d7-48de-afdd-3c45a1ced474'::uuid;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. Backfill user_profiles pour les utilisateurs auth existants
-- ------------------------------------------------------------------------------
INSERT INTO public.user_profiles (id, default_club_id)
SELECT
  au.id,
  '45642829-a3d7-48de-afdd-3c45a1ced474'::uuid
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
)
ON CONFLICT (id) DO UPDATE 
SET default_club_id = COALESCE(public.user_profiles.default_club_id, '45642829-a3d7-48de-afdd-3c45a1ced474'::uuid);

CREATE OR REPLACE FUNCTION public.handle_ensure_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, default_club_id)
  VALUES (NEW.id, '45642829-a3d7-48de-afdd-3c45a1ced474'::uuid)
  ON CONFLICT (id) DO UPDATE
    SET default_club_id = COALESCE(public.user_profiles.default_club_id, '45642829-a3d7-48de-afdd-3c45a1ced474'::uuid);
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS tr_ensure_user_profile ON auth.users;
  CREATE TRIGGER tr_ensure_user_profile
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_ensure_user_profile();
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Trigger sur auth.users omis (permissions gérées par Supabase Auth)';
END $$;

-- ------------------------------------------------------------------------------
-- 3. Trigger automatique : attribution du club_id sur public.players si omis
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_set_default_player_club_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.club_id IS NULL THEN
    NEW.club_id := public.get_my_club_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_set_player_club_id ON public.players;
CREATE TRIGGER tr_set_player_club_id
  BEFORE INSERT ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_set_default_player_club_id();

-- ------------------------------------------------------------------------------
-- 4. Politiques RLS universelles pour public.players (Déblocage complet)
-- ------------------------------------------------------------------------------
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "players_select" ON public.players;
DROP POLICY IF EXISTS "players_insert" ON public.players;
DROP POLICY IF EXISTS "players_update" ON public.players;
DROP POLICY IF EXISTS "players_delete" ON public.players;
DROP POLICY IF EXISTS "app_anon_read_players" ON public.players;
DROP POLICY IF EXISTS "players_select_all" ON public.players;
DROP POLICY IF EXISTS "players_insert_authenticated" ON public.players;
DROP POLICY IF EXISTS "players_update_authenticated" ON public.players;
DROP POLICY IF EXISTS "players_delete_authenticated" ON public.players;
DROP POLICY IF EXISTS "players_full_access" ON public.players;

CREATE POLICY "players_full_access" ON public.players
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. Politiques RLS universelles pour public.match_players
-- ------------------------------------------------------------------------------
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_players_select" ON public.match_players;
DROP POLICY IF EXISTS "match_players_insert" ON public.match_players;
DROP POLICY IF EXISTS "match_players_update" ON public.match_players;
DROP POLICY IF EXISTS "match_players_delete" ON public.match_players;
DROP POLICY IF EXISTS "app_anon_read_match_players" ON public.match_players;
DROP POLICY IF EXISTS "match_players_select_all" ON public.match_players;
DROP POLICY IF EXISTS "match_players_insert_authenticated" ON public.match_players;
DROP POLICY IF EXISTS "match_players_update_authenticated" ON public.match_players;
DROP POLICY IF EXISTS "match_players_delete_authenticated" ON public.match_players;
DROP POLICY IF EXISTS "match_players_full_access" ON public.match_players;

CREATE POLICY "match_players_full_access" ON public.match_players
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. Politiques RLS universelles pour public.player_match_stats
-- ------------------------------------------------------------------------------
ALTER TABLE public.player_match_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_match_stats_select" ON public.player_match_stats;
DROP POLICY IF EXISTS "player_match_stats_insert" ON public.player_match_stats;
DROP POLICY IF EXISTS "player_match_stats_update" ON public.player_match_stats;
DROP POLICY IF EXISTS "player_match_stats_delete" ON public.player_match_stats;
DROP POLICY IF EXISTS "player_match_stats_all" ON public.player_match_stats;
DROP POLICY IF EXISTS "player_match_stats_select_all" ON public.player_match_stats;
DROP POLICY IF EXISTS "player_match_stats_full_access" ON public.player_match_stats;

CREATE POLICY "player_match_stats_full_access" ON public.player_match_stats
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. Politiques RLS universelles pour public.matches
-- ------------------------------------------------------------------------------
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches_select" ON public.matches;
DROP POLICY IF EXISTS "matches_insert" ON public.matches;
DROP POLICY IF EXISTS "matches_update" ON public.matches;
DROP POLICY IF EXISTS "matches_delete" ON public.matches;
DROP POLICY IF EXISTS "app_anon_read_matches" ON public.matches;
DROP POLICY IF EXISTS "matches_select_all" ON public.matches;
DROP POLICY IF EXISTS "matches_insert_authenticated" ON public.matches;
DROP POLICY IF EXISTS "matches_update_authenticated" ON public.matches;
DROP POLICY IF EXISTS "matches_delete_authenticated" ON public.matches;
DROP POLICY IF EXISTS "matches_full_access" ON public.matches;

CREATE POLICY "matches_full_access" ON public.matches
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 8. Droits d'accès globaux (GRANTS)
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_players TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_match_stats TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO anon, authenticated, service_role;
