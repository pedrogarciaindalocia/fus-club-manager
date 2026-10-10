-- ============================================================
-- FUS-APP — Politiques de lecture publique (anonyme)
-- À exécuter dans : Supabase Dashboard → SQL Editor → New Query
-- ============================================================
-- Ces policies permettent à l'app mobile (fus-app) de lire
-- les données sans authentification (rôle anon).
-- Les opérations d'écriture restent protégées par les policies
-- existantes (authentification obligatoire).
-- ============================================================


-- ── match_events ────────────────────────────────────────────
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_anon_read_match_events" ON public.match_events;
CREATE POLICY "app_anon_read_match_events"
  ON public.match_events
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ── match_players ───────────────────────────────────────────
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_anon_read_match_players" ON public.match_players;
CREATE POLICY "app_anon_read_match_players"
  ON public.match_players
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ── match_staff ─────────────────────────────────────────────
ALTER TABLE public.match_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_anon_read_match_staff" ON public.match_staff;
CREATE POLICY "app_anon_read_match_staff"
  ON public.match_staff
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ── match_stats ─────────────────────────────────────────────
ALTER TABLE public.match_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_anon_read_match_stats" ON public.match_stats;
CREATE POLICY "app_anon_read_match_stats"
  ON public.match_stats
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ── matches ─────────────────────────────────────────────────
-- (déjà lisible, mais on s'assure que la policy existe)
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_anon_read_matches" ON public.matches;
CREATE POLICY "app_anon_read_matches"
  ON public.matches
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ── players ─────────────────────────────────────────────────
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_anon_read_players" ON public.players;
CREATE POLICY "app_anon_read_players"
  ON public.players
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ── clubs ───────────────────────────────────────────────────
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_anon_read_clubs" ON public.clubs;
CREATE POLICY "app_anon_read_clubs"
  ON public.clubs
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ── teams ───────────────────────────────────────────────────
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_anon_read_teams" ON public.teams;
CREATE POLICY "app_anon_read_teams"
  ON public.teams
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ── leagues ─────────────────────────────────────────────────
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_anon_read_leagues" ON public.leagues;
CREATE POLICY "app_anon_read_leagues"
  ON public.leagues
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ── blog_posts / blog_categories ───────────────────────────
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_anon_read_blog_posts" ON public.blog_posts;
CREATE POLICY "app_anon_read_blog_posts"
  ON public.blog_posts
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_anon_read_blog_categories" ON public.blog_categories;
CREATE POLICY "app_anon_read_blog_categories"
  ON public.blog_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ── staff (pour affichage dans l'app) ───────────────────────
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_anon_read_staff" ON public.staff;
CREATE POLICY "app_anon_read_staff"
  ON public.staff
  FOR SELECT
  TO anon, authenticated
  USING (true);
