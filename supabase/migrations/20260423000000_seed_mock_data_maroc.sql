-- ==============================================================
-- 🇲🇦 FUS RABAT - MOCK DATA COMPLET MAROC (BOTOLA PRO) 🇲🇦
-- MIGRATION SEED
-- ==============================================================

BEGIN;

-- 1. VIDAGE DES TABLES EXISTANTES POUR UN SEED PROPRE
DELETE FROM public.match_staff;
DELETE FROM public.match_players;
DELETE FROM public.match_events;
DELETE FROM public.match_stats;
DELETE FROM public.player_match_stats;
DELETE FROM public.matches;
DELETE FROM public.players;
DELETE FROM public.teams;
DELETE FROM public.staff;
DELETE FROM public.leagues;
DELETE FROM public.stadiums;
DELETE FROM public.clubs;
DELETE FROM public.settings;

-- ----------------------------------------------------
-- 2. MY CLUB (FUS RABAT)
-- ----------------------------------------------------
INSERT INTO public.clubs (id, name, city, country, logo_url)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'FUS Rabat', 'Rabat', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/4/4b/Logo_FUS_Rabat.png');

INSERT INTO public.settings (club_id, club_name, city, country, timezone, contact_email)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'FUS Rabat', 'Rabat', 'Maroc', 'Africa/Casablanca', 'contact@fusrabat.ma');

-- ----------------------------------------------------
-- 3. OPPONENT CLUBS (TOUT LE MAROC SAUF LE FUS)
-- ----------------------------------------------------
INSERT INTO public.clubs (id, name, city, country, logo_url) VALUES 
  ('11111111-0000-0000-0000-000000000001', 'Wydad AC', 'Casablanca', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/thumb/f/f6/Wydad_Athletic_Club_%28logo%29.svg/1200px-Wydad_Athletic_Club_%28logo%29.svg.png'),
  ('11111111-0000-0000-0000-000000000002', 'Raja CA', 'Casablanca', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/thumb/6/6f/Logo_Raja_Club_Athletic.svg/1200px-Logo_Raja_Club_Athletic.svg.png'),
  ('11111111-0000-0000-0000-000000000003', 'AS FAR', 'Rabat', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/archive/1/14/20220625121303%21Logo_AS_FAR.png'),
  ('11111111-0000-0000-0000-000000000004', 'RS Berkane', 'Berkane', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/4/4c/Logo_de_la_R._S._B..png'),
  ('11111111-0000-0000-0000-000000000005', 'Maghreb de Fès', 'Fès', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/b/b3/MAS_F%C3%A8s_logo.png'),
  ('11111111-0000-0000-0000-000000000006', 'Ittihad Tanger', 'Tanger', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/7/7e/Logo_Ittihad_Riadi_Tanger_%28IRT%29.png'),
  ('11111111-0000-0000-0000-000000000007', 'Hassania Agadir', 'Agadir', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/c/c5/Logo_Hassania_Agadir.png'),
  ('11111111-0000-0000-0000-000000000008', 'Olympic Safi', 'Safi', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/b/b8/Logo_de_l%27Olympique_Club_de_Safi.png');

-- ----------------------------------------------------
-- 4. STADIUMS & LEAGUES
-- ----------------------------------------------------
INSERT INTO public.stadiums (id, club_id, name, city) VALUES 
  ('22222222-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Complexe Sportif FUS', 'Rabat'),
  ('22222222-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Stade Mohammed V', 'Casablanca');

INSERT INTO public.leagues (id, club_id, name, season) VALUES 
  ('33333333-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Botola Pro', '2025/2026'),
  ('33333333-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Championnat National U13', '2025/2026');

-- ----------------------------------------------------
-- 5. STAFF
-- ----------------------------------------------------
INSERT INTO public.staff (id, club_id, full_name, role, category) VALUES 
  ('55555555-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Amine Karmamine', 'Coach Principal', 'TECHNICAL'),
  ('55555555-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Nabil Baha', 'Assistant', 'TECHNICAL');

-- ----------------------------------------------------
-- 6. TEAMS
-- ----------------------------------------------------
INSERT INTO public.teams (id, club_id, name, category, coach_id) VALUES 
  ('44444444-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Equipe Première', 'PRO', '55555555-0000-0000-0000-000000000001'),
  ('44444444-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'FUS U13 Elite', 'U13', NULL);

-- ----------------------------------------------------
-- 7. PLAYERS (GÉNÉRATION AUTO POUR REMPLIR)
-- ----------------------------------------------------
DO $$
DECLARE
  team_rec RECORD;
  i INT;
  first_names TEXT[] := ARRAY['Amine', 'Yassine', 'Hakim', 'Brahim', 'Sofyan', 'Nayef', 'Achraf', 'Noussair', 'Yahya', 'Ayoub', 'Ilyas', 'Bilal', 'Ismael', 'Mehdi', 'Anas', 'Oussama', 'Hamza', 'Zakaria', 'Soufiane', 'Azeddine', 'Rachid', 'Tariq', 'Khalid'];
  last_names TEXT[] := ARRAY['Bounou', 'Hakimi', 'Aguerd', 'Saiss', 'Mazraoui', 'Amrabat', 'Ounahi', 'Ziyech', 'Diaz', 'En-Nesyri', 'El Kaabi', 'Adli', 'Harit', 'Boufal', 'Abde', 'Richardson', 'Saibari', 'El Khannouss', 'Rahimi', 'Akhomach', 'Taarabt', 'Benoun'];
  positions TEXT[] := ARRAY['GK', 'GK', 'RB', 'RB', 'LB', 'LB', 'CB', 'CB', 'CB', 'CB', 'CDM', 'CDM', 'CM', 'CM', 'CAM', 'CAM', 'LW', 'LW', 'RW', 'RW', 'ST', 'ST'];
BEGIN
  FOR team_rec IN SELECT id, category FROM public.teams LOOP
    FOR i IN 1..22 LOOP
      INSERT INTO public.players (club_id, full_name, category, team_id, position, jersey_number, preferred_foot, nationality)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        first_names[1 + mod((random()*100)::int, array_length(first_names, 1))] || ' ' || last_names[1 + mod((random()*100)::int, array_length(last_names, 1))],
        team_rec.category,
        team_rec.id,
        positions[i],
        i,
        CASE WHEN mod(i, 3) = 0 THEN 'left' ELSE 'right' END,
        'Marocain'
      );
    END LOOP;
  END LOOP;
END $$;

-- ----------------------------------------------------
-- 8. MATCHES
-- ----------------------------------------------------
INSERT INTO public.matches (club_id, category, team_id, opponent_id, stadium_id, match_date, match_time, is_home, status, formation, score_home, score_away, opponent_formation) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'PRO', '44444444-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', CURRENT_DATE, '21:00', true, 'planned', '4-3-3', 0, 0, '4-4-2'),
  ('00000000-0000-0000-0000-000000000001', 'PRO', '44444444-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', CURRENT_DATE - interval '7 days', '18:30', false, 'finished', '4-2-3-1', 1, 2, '4-3-3');

COMMIT;
