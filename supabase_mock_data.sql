-- ==============================================================
-- 🚀 FUSCLUB - MOCK DATA 100% COMPATIBLE AVEC VOTRE SCHEMA 🚀
-- Exécutez ce script dans le **SQL Editor** de Supabase !
-- ==============================================================

-- (Optionnel) Vidage des tables pour éviter les conflits si vous aviez des tests précédents
/*
DELETE FROM match_staff;
DELETE FROM match_players;
DELETE FROM match_events;
DELETE FROM match_stats;
DELETE FROM player_match_stats;
DELETE FROM matches;
DELETE FROM players;
DELETE FROM teams;
DELETE FROM staff;
DELETE FROM leagues;
DELETE FROM stadiums;
DELETE FROM clubs;
DELETE FROM settings;
*/

-- ----------------------------------------------------
-- 1. MY CLUB (Settings)
-- ----------------------------------------------------
INSERT INTO settings (id, club_name, city, country, logo_url)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'FuscClub Elite', 'Paris', 'France', 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/1200px-Real_Madrid_CF.svg.png')
ON CONFLICT (id) DO UPDATE SET club_name = EXCLUDED.club_name;

-- ----------------------------------------------------
-- 2. OPPONENT CLUBS
-- ----------------------------------------------------
INSERT INTO clubs (id, name, city, country, logo_url) VALUES 
  ('11111111-0000-0000-0000-000000000001', 'FC Barcelone', 'Barcelone', 'Espagne', 'https://upload.wikimedia.org/wikipedia/sco/thumb/4/47/FC_Barcelona_%28crest%29.svg/1200px-FC_Barcelona_%28crest%29.svg.png'),
  ('11111111-0000-0000-0000-000000000002', 'Manchester City', 'Manchester', 'Angleterre', 'https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/1200px-Manchester_City_FC_badge.svg.png')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------
-- 3. STADIUMS & LEAGUES
-- ----------------------------------------------------
-- Attention: votre table stadiums n'a pas de colonne "capacity", elle a "photo_url"
INSERT INTO stadiums (id, name, city, photo_url) VALUES 
  ('22222222-0000-0000-0000-000000000001', 'Stade de la Victoire', 'Paris', NULL);

INSERT INTO leagues (id, name, season) VALUES 
  ('33333333-0000-0000-0000-000000000001', 'Ligue des Champions', '2025/2026');

-- ----------------------------------------------------
-- 4. STAFF TECHNIQUE
-- ----------------------------------------------------
-- On insère le staff avant les équipes car la table teams a une clé étrangère coach_id (optionnelle mais bien de l'avoir)
INSERT INTO staff (id, full_name, role, specialty, club_id) VALUES 
  ('55555555-0000-0000-0000-000000000001', 'Zinedine Zidane', 'coach', 'Manager Général', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------
-- 5. SQUAD UNITS (TEAMS)
-- ----------------------------------------------------
-- Attention: votre table teams a (id, name, category, coach_id, photo_url), pas de colonne "season"
INSERT INTO teams (id, name, category, coach_id) VALUES 
  ('44444444-0000-0000-0000-000000000001', 'Equipe Première', 'PRO', '55555555-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-u13teamid0', 'U13 A', 'U13', NULL)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------
-- 6. PLAYERS (EFFECTIF DE 16 JOUEURS PRO)
-- ----------------------------------------------------
INSERT INTO players (full_name, category, team_id, position, jersey_number, preferred_foot, height, weight, birth_date, nationality, photo_url) VALUES 
  ('Thibaut Courtois', 'PRO', '44444444-0000-0000-0000-000000000001', 'GK', 1, 'Left', 199, 96, '1992-05-11', 'Belge', 'https://api.fifa.com/api/v1/picture/players/2018/250002_sq-300_webp'),
  ('Dani Carvajal', 'PRO', '44444444-0000-0000-0000-000000000001', 'RB', 2, 'Right', 173, 73, '1992-01-11', 'Espagnol', 'https://api.fifa.com/api/v1/picture/players/2018/2000000067_sq-300_webp'),
  ('David Alaba', 'PRO', '44444444-0000-0000-0000-000000000001', 'CB', 4, 'Left', 180, 78, '1992-06-24', 'Autrichien', 'https://api.fifa.com/api/v1/picture/players/2018/250000_sq-300_webp'),
  ('Antonio Rüdiger', 'PRO', '44444444-0000-0000-0000-000000000001', 'CB', 22, 'Right', 190, 85, '1993-03-03', 'Allemand', 'https://api.fifa.com/api/v1/picture/players/2018/210000_sq-300_webp'),
  ('Ferland Mendy', 'PRO', '44444444-0000-0000-0000-000000000001', 'LB', 23, 'Left', 180, 73, '1995-06-08', 'Français', 'https://api.fifa.com/api/v1/picture/players/2018/2000000068_sq-300_webp'),
  ('Jude Bellingham', 'PRO', '44444444-0000-0000-0000-000000000001', 'CAM', 5, 'Right', 186, 75, '2003-06-29', 'Anglais', 'https://api.fifa.com/api/v1/picture/players/2018/400010_sq-300_webp'),
  ('Toni Kroos', 'PRO', '44444444-0000-0000-0000-000000000001', 'CM', 8, 'Right', 183, 76, '1990-01-04', 'Allemand', 'https://api.fifa.com/api/v1/picture/players/2018/250003_sq-300_webp'),
  ('Federico Valverde', 'PRO', '44444444-0000-0000-0000-000000000001', 'CM', 15, 'Right', 182, 78, '1998-07-22', 'Uruguayen', 'https://api.fifa.com/api/v1/picture/players/2018/250004_sq-300_webp'),
  ('Aurélien Tchouaméni', 'PRO', '44444444-0000-0000-0000-000000000001', 'CDM', 18, 'Right', 187, 81, '2000-01-27', 'Français', 'https://api.fifa.com/api/v1/picture/players/2018/250005_sq-300_webp'),
  ('Vinícius Júnior', 'PRO', '44444444-0000-0000-0000-000000000001', 'LW', 7, 'Right', 176, 73, '2000-07-12', 'Brésilien', 'https://api.fifa.com/api/v1/picture/players/2018/250006_sq-300_webp'),
  ('Kylian Mbappé', 'PRO', '44444444-0000-0000-0000-000000000001', 'ST', 9, 'Right', 178, 73, '1998-12-20', 'Français', 'https://api.fifa.com/api/v1/picture/players/2018/250007_sq-300_webp'),
  ('Rodrygo', 'PRO', '44444444-0000-0000-0000-000000000001', 'RW', 11, 'Right', 174, 64, '2001-01-09', 'Brésilien', 'https://api.fifa.com/api/v1/picture/players/2018/250008_sq-300_webp'),
  ('Luka Modrić', 'PRO', '44444444-0000-0000-0000-000000000001', 'CM', 10, 'Both', 172, 66, '1985-09-09', 'Croate', 'https://api.fifa.com/api/v1/picture/players/2018/250009_sq-300_webp'),
  ('Eduardo Camavinga', 'PRO', '44444444-0000-0000-0000-000000000001', 'CM', 12, 'Left', 182, 68, '2002-11-10', 'Français', 'https://api.fifa.com/api/v1/picture/players/2018/250010_sq-300_webp'),
  ('Brahim Díaz', 'PRO', '44444444-0000-0000-0000-000000000001', 'CAM', 21, 'Both', 170, 68, '1999-08-03', 'Espanol', 'https://api.fifa.com/api/v1/picture/players/2018/250011_sq-300_webp'),
  ('Andriy Lunin', 'PRO', '44444444-0000-0000-0000-000000000001', 'GK', 13, 'Right', 191, 80, '1999-02-11', 'Ukrainien', 'https://api.fifa.com/api/v1/picture/players/2018/250012_sq-300_webp');

-- ----------------------------------------------------
-- 7. MATCH DU JOUR
-- ----------------------------------------------------
INSERT INTO matches (id, category, opponent_id, league_id, stadium_id, match_date, match_time, is_home, status, formation, score_home, score_away, team_id, opponent_formation) VALUES 
  ('66666666-0000-0000-0000-000000000001', 'PRO', '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', CURRENT_DATE, '20:45', true, 'planned', '4-3-3', 0, 0, '44444444-0000-0000-0000-000000000001', '4-4-2');
