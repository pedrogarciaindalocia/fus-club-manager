-- =============================================================
-- RLS POLICIES — Schema Option B (multi-tenant par club_id)
-- =============================================================

-- -------------------------------------------------------
-- 0. HELPERS SECURITY DEFINER (appelés par chaque policy)
-- -------------------------------------------------------

-- Retourne le club_id de l'utilisateur courant depuis son profil.
-- STABLE = cachée dans la transaction, SECURITY DEFINER = bypass RLS sur user_profiles.
CREATE OR REPLACE FUNCTION public.get_my_club_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT default_club_id
  FROM public.user_profiles
  WHERE id = auth.uid();
$$;

-- Vrai si l'utilisateur possède le rôle 'admin'.
CREATE OR REPLACE FUNCTION public.is_club_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
  );
$$;

-- -------------------------------------------------------
-- 1. ACTIVATION RLS
-- -------------------------------------------------------

ALTER TABLE public.settings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stadiums                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_staff               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_stats               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_match_stats        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_team_assignments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_match_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_category_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions          ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- 2. SETTINGS (config du club principal)
-- -------------------------------------------------------

CREATE POLICY "settings_select" ON public.settings
  FOR SELECT TO authenticated
  USING (club_id = public.get_my_club_id());

CREATE POLICY "settings_insert" ON public.settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_club_admin());

CREATE POLICY "settings_update" ON public.settings
  FOR UPDATE TO authenticated
  USING (club_id = public.get_my_club_id())
  WITH CHECK (club_id = public.get_my_club_id());

-- -------------------------------------------------------
-- 3. CLUBS (référentiel : mon club + adversaires)
-- Lecture ouverte car les adversaires doivent être visibles
-- dans les dropdowns de création de match.
-- -------------------------------------------------------

CREATE POLICY "clubs_select" ON public.clubs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "clubs_insert" ON public.clubs
  FOR INSERT TO authenticated
  WITH CHECK (true);  -- tout utilisateur peut ajouter un club adversaire

CREATE POLICY "clubs_update" ON public.clubs
  FOR UPDATE TO authenticated
  USING (
    id = public.get_my_club_id()    -- mon club : accès direct
    OR public.is_club_admin()       -- admin peut modifier n'importe quel club
  )
  WITH CHECK (
    id = public.get_my_club_id()
    OR public.is_club_admin()
  );

CREATE POLICY "clubs_delete" ON public.clubs
  FOR DELETE TO authenticated
  USING (
    id != public.get_my_club_id()   -- impossible de supprimer son propre club
    AND public.is_club_admin()
  );

-- -------------------------------------------------------
-- 4. TABLES SCOPÉES PAR club_id DIRECT
--    Macro appliquée à : leagues, stadiums, staff, teams,
--    players, blog_categories, blog_posts, backups
-- -------------------------------------------------------

-- LEAGUES
CREATE POLICY "leagues_select" ON public.leagues
  FOR SELECT TO authenticated USING (club_id = public.get_my_club_id());
CREATE POLICY "leagues_insert" ON public.leagues
  FOR INSERT TO authenticated WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "leagues_update" ON public.leagues
  FOR UPDATE TO authenticated
  USING (club_id = public.get_my_club_id()) WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "leagues_delete" ON public.leagues
  FOR DELETE TO authenticated USING (club_id = public.get_my_club_id());

-- STADIUMS
CREATE POLICY "stadiums_select" ON public.stadiums
  FOR SELECT TO authenticated USING (club_id = public.get_my_club_id());
CREATE POLICY "stadiums_insert" ON public.stadiums
  FOR INSERT TO authenticated WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "stadiums_update" ON public.stadiums
  FOR UPDATE TO authenticated
  USING (club_id = public.get_my_club_id()) WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "stadiums_delete" ON public.stadiums
  FOR DELETE TO authenticated USING (club_id = public.get_my_club_id());

-- STAFF
CREATE POLICY "staff_select" ON public.staff
  FOR SELECT TO authenticated USING (club_id = public.get_my_club_id());
CREATE POLICY "staff_insert" ON public.staff
  FOR INSERT TO authenticated WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "staff_update" ON public.staff
  FOR UPDATE TO authenticated
  USING (club_id = public.get_my_club_id()) WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "staff_delete" ON public.staff
  FOR DELETE TO authenticated USING (club_id = public.get_my_club_id());

-- TEAMS
CREATE POLICY "teams_select" ON public.teams
  FOR SELECT TO authenticated USING (club_id = public.get_my_club_id());
CREATE POLICY "teams_insert" ON public.teams
  FOR INSERT TO authenticated WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "teams_update" ON public.teams
  FOR UPDATE TO authenticated
  USING (club_id = public.get_my_club_id()) WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "teams_delete" ON public.teams
  FOR DELETE TO authenticated USING (club_id = public.get_my_club_id());

-- PLAYERS
CREATE POLICY "players_select" ON public.players
  FOR SELECT TO authenticated USING (club_id = public.get_my_club_id());
CREATE POLICY "players_insert" ON public.players
  FOR INSERT TO authenticated WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "players_update" ON public.players
  FOR UPDATE TO authenticated
  USING (club_id = public.get_my_club_id()) WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "players_delete" ON public.players
  FOR DELETE TO authenticated USING (club_id = public.get_my_club_id());

-- MATCHES
CREATE POLICY "matches_select" ON public.matches
  FOR SELECT TO authenticated USING (club_id = public.get_my_club_id());
CREATE POLICY "matches_insert" ON public.matches
  FOR INSERT TO authenticated WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "matches_update" ON public.matches
  FOR UPDATE TO authenticated
  USING (club_id = public.get_my_club_id()) WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "matches_delete" ON public.matches
  FOR DELETE TO authenticated USING (club_id = public.get_my_club_id());

-- BLOG CATEGORIES
CREATE POLICY "blog_categories_select" ON public.blog_categories
  FOR SELECT TO authenticated USING (club_id = public.get_my_club_id());
CREATE POLICY "blog_categories_insert" ON public.blog_categories
  FOR INSERT TO authenticated WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "blog_categories_update" ON public.blog_categories
  FOR UPDATE TO authenticated
  USING (club_id = public.get_my_club_id()) WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "blog_categories_delete" ON public.blog_categories
  FOR DELETE TO authenticated USING (club_id = public.get_my_club_id());

-- BLOG POSTS
CREATE POLICY "blog_posts_select" ON public.blog_posts
  FOR SELECT TO authenticated USING (club_id = public.get_my_club_id());
CREATE POLICY "blog_posts_insert" ON public.blog_posts
  FOR INSERT TO authenticated WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "blog_posts_update" ON public.blog_posts
  FOR UPDATE TO authenticated
  USING (club_id = public.get_my_club_id()) WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "blog_posts_delete" ON public.blog_posts
  FOR DELETE TO authenticated USING (club_id = public.get_my_club_id());

-- BACKUPS
CREATE POLICY "backups_select" ON public.backups
  FOR SELECT TO authenticated USING (club_id = public.get_my_club_id());
CREATE POLICY "backups_insert" ON public.backups
  FOR INSERT TO authenticated WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "backups_update" ON public.backups
  FOR UPDATE TO authenticated
  USING (club_id = public.get_my_club_id()) WITH CHECK (club_id = public.get_my_club_id());
CREATE POLICY "backups_delete" ON public.backups
  FOR DELETE TO authenticated USING (club_id = public.get_my_club_id());

-- -------------------------------------------------------
-- 5. TABLES DE JONCTION (pas de club_id direct — jointure via matches)
-- -------------------------------------------------------

-- Helper : vérifie que le match appartient au club courant
-- Utilisé dans les policies des tables de jonction.

CREATE POLICY "match_players_select" ON public.match_players
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));
CREATE POLICY "match_players_insert" ON public.match_players
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));
CREATE POLICY "match_players_update" ON public.match_players
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));
CREATE POLICY "match_players_delete" ON public.match_players
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));

CREATE POLICY "match_staff_select" ON public.match_staff
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));
CREATE POLICY "match_staff_insert" ON public.match_staff
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));
CREATE POLICY "match_staff_update" ON public.match_staff
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));
CREATE POLICY "match_staff_delete" ON public.match_staff
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));

CREATE POLICY "match_events_select" ON public.match_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));
CREATE POLICY "match_events_insert" ON public.match_events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));
CREATE POLICY "match_events_update" ON public.match_events
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));
CREATE POLICY "match_events_delete" ON public.match_events
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));

CREATE POLICY "match_stats_select" ON public.match_stats
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));
CREATE POLICY "match_stats_insert" ON public.match_stats
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));
CREATE POLICY "match_stats_update" ON public.match_stats
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));
CREATE POLICY "match_stats_delete" ON public.match_stats
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));

CREATE POLICY "player_match_stats_select" ON public.player_match_stats
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));
CREATE POLICY "player_match_stats_insert" ON public.player_match_stats
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));
CREATE POLICY "player_match_stats_update" ON public.player_match_stats
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));
CREATE POLICY "player_match_stats_delete" ON public.player_match_stats
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.club_id = public.get_my_club_id()
  ));

-- -------------------------------------------------------
-- 6. RBAC — Tables statiques (lecture seule pour tous)
-- -------------------------------------------------------

CREATE POLICY "roles_select" ON public.roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "permissions_select" ON public.permissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "role_permissions_select" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

-- -------------------------------------------------------
-- 7. USER PROFILES & ASSIGNMENTS
-- -------------------------------------------------------

-- Chaque utilisateur voit son propre profil.
-- Les admins voient tous les profils de leur club.
CREATE POLICY "user_profiles_select_own" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (default_club_id = public.get_my_club_id() AND public.is_club_admin())
  );

CREATE POLICY "user_profiles_insert" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "user_profiles_update_own" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Roles utilisateur
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_club_admin());
CREATE POLICY "user_roles_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_club_admin());
CREATE POLICY "user_roles_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_club_admin());

-- Surcharges de permissions
CREATE POLICY "user_permissions_overrides_select" ON public.user_permissions_overrides
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_club_admin());
CREATE POLICY "user_permissions_overrides_insert" ON public.user_permissions_overrides
  FOR INSERT TO authenticated WITH CHECK (public.is_club_admin());
CREATE POLICY "user_permissions_overrides_delete" ON public.user_permissions_overrides
  FOR DELETE TO authenticated USING (public.is_club_admin());

-- Assignation équipe
CREATE POLICY "user_team_assignments_select" ON public.user_team_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_club_admin());
CREATE POLICY "user_team_assignments_insert" ON public.user_team_assignments
  FOR INSERT TO authenticated WITH CHECK (public.is_club_admin());
CREATE POLICY "user_team_assignments_delete" ON public.user_team_assignments
  FOR DELETE TO authenticated USING (public.is_club_admin());

-- Assignation match
CREATE POLICY "user_match_assignments_select" ON public.user_match_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_club_admin());
CREATE POLICY "user_match_assignments_insert" ON public.user_match_assignments
  FOR INSERT TO authenticated WITH CHECK (public.is_club_admin());
CREATE POLICY "user_match_assignments_delete" ON public.user_match_assignments
  FOR DELETE TO authenticated USING (public.is_club_admin());

-- Assignation catégorie
CREATE POLICY "user_category_assignments_select" ON public.user_category_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_club_admin());
CREATE POLICY "user_category_assignments_insert" ON public.user_category_assignments
  FOR INSERT TO authenticated WITH CHECK (public.is_club_admin());
CREATE POLICY "user_category_assignments_delete" ON public.user_category_assignments
  FOR DELETE TO authenticated USING (public.is_club_admin());

-- -------------------------------------------------------
-- 8. TRIGGER : création automatique du user_profile
--    Déclenché après chaque inscription dans auth.users
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, default_club_id)
  SELECT NEW.id, s.club_id
  FROM public.settings s
  LIMIT 1
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Supprime l'ancien trigger s'il existe pour idempotence
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
