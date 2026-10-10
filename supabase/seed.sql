-- =============================================================
-- SEED — Données de test (Botola Pro - FUS Rabat)
-- Idempotent via DELETE + INSERT
-- =============================================================

BEGIN;

-- 1. VIDAGE COMPLET
DELETE FROM public.match_staff;
DELETE FROM public.match_players;
DELETE FROM public.match_events;
DELETE FROM public.match_stats;
DELETE FROM public.player_match_stats;
DELETE FROM public.matches;
DELETE FROM public.players;
DELETE FROM public.staff;
DELETE FROM public.teams;
DELETE FROM public.leagues;
DELETE FROM public.stadiums;
DELETE FROM public.settings;
DELETE FROM public.clubs;

-- 2. MY CLUB (FUS RABAT)
INSERT INTO public.clubs (id, name, city, country, logo_url)
VALUES ('00000000-0000-0000-0000-000000000001', 'FUS Rabat', 'Rabat', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/4/4b/Logo_FUS_Rabat.png');

INSERT INTO public.settings (club_id, club_name, city, country, timezone, contact_email)
VALUES ('00000000-0000-0000-0000-000000000001', 'FUS Rabat', 'Rabat', 'Maroc', 'Africa/Casablanca', 'contact@fusrabat.ma');

-- 3. OPPONENTS
INSERT INTO public.clubs (id, name, city, country, logo_url) VALUES 
  ('11111111-0000-0000-0000-000000000001', 'Wydad AC', 'Casablanca', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/thumb/f/f6/Wydad_Athletic_Club_%28logo%29.svg/1200px-Wydad_Athletic_Club_%28logo%29.svg.png'),
  ('11111111-0000-0000-0000-000000000002', 'Raja CA', 'Casablanca', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/thumb/6/6f/Logo_Raja_Club_Athletic.svg/1200px-Logo_Raja_Club_Athletic.svg.png'),
  ('11111111-0000-0000-0000-000000000003', 'AS FAR', 'Rabat', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/archive/1/14/20220625121303%21Logo_AS_FAR.png');

-- 4. STADIUMS & LEAGUES
INSERT INTO public.stadiums (id, club_id, name, city) VALUES 
  ('22222222-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Complexe Sportif FUS', 'Rabat');

INSERT INTO public.leagues (id, club_id, name, season) VALUES 
  ('33333333-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Botola Pro', '2025/2026');

-- 5. STAFF
INSERT INTO public.staff (id, club_id, full_name, role, category) VALUES 
  ('55555555-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Amine Karmamine', 'Coach Principal', 'TECHNICAL');

-- 6. TEAMS
INSERT INTO public.teams (id, club_id, name, category, coach_id) VALUES 
  ('44444444-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Equipe Première', 'PRO', '55555555-0000-0000-0000-000000000001');

-- 7. PLAYERS SQUAD (GK, DEF, MID, ST)
INSERT INTO public.players (id, club_id, team_id, full_name, position, jersey_number, category, nationality) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'Mehdi Benabid', 'GK', 1, 'PRO', 'Marocain'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'Ayoub Qasmi', 'LB', 3, 'PRO', 'Marocain'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'Herman Junior', 'ST', 9, 'PRO', 'Ivoirien');

-- 8. MATCHES
INSERT INTO public.matches (id, club_id, team_id, opponent_id, stadium_id, league_id, category, match_date, match_time, is_home, status, formation, score_home, score_away) VALUES 
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'PRO', CURRENT_DATE, '20:00', true, 'planned', '4-3-3', 0, 0);

COMMIT;
