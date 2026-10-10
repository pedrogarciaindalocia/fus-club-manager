-- ==============================================================
-- 🇲🇦 FUS RABAT - MOCK DATA COMPLET MAROC (BOTOLA PRO) 🇲🇦
-- Exécutez ce script dans le **SQL Editor** de Supabase !
-- ==============================================================

-- 1. VIDAGE COMPLET DE LA BASE
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

-- ----------------------------------------------------
-- 2. MY CLUB (FUS RABAT)
-- ----------------------------------------------------
INSERT INTO settings (id, club_name, city, country, logo_url)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'FUS Rabat', 'Rabat', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/4/4b/Logo_FUS_Rabat.png')
ON CONFLICT (id) DO UPDATE SET club_name = EXCLUDED.club_name;


-- ----------------------------------------------------
-- 3. OPPONENT CLUBS (TOUT LE MAROC SAUF LE FUS)
-- ----------------------------------------------------
INSERT INTO clubs (id, name, city, country, logo_url) VALUES 
  ('11111111-0000-0000-0000-000000000001', 'Wydad AC', 'Casablanca', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/thumb/f/f6/Wydad_Athletic_Club_%28logo%29.svg/1200px-Wydad_Athletic_Club_%28logo%29.svg.png'),
  ('11111111-0000-0000-0000-000000000002', 'Raja CA', 'Casablanca', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/thumb/6/6f/Logo_Raja_Club_Athletic.svg/1200px-Logo_Raja_Club_Athletic.svg.png'),
  ('11111111-0000-0000-0000-000000000003', 'AS FAR', 'Rabat', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/archive/1/14/20220625121303%21Logo_AS_FAR.png'),
  ('11111111-0000-0000-0000-000000000004', 'RS Berkane', 'Berkane', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/4/4c/Logo_de_la_R._S._B..png'),
  ('11111111-0000-0000-0000-000000000005', 'Maghreb de Fès', 'Fès', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/b/b3/MAS_F%C3%A8s_logo.png'),
  ('11111111-0000-0000-0000-000000000006', 'Ittihad Tanger', 'Tanger', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/7/7e/Logo_Ittihad_Riadi_Tanger_%28IRT%29.png'),
  ('11111111-0000-0000-0000-000000000007', 'Hassania Agadir', 'Agadir', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/c/c5/Logo_Hassania_Agadir.png'),
  ('11111111-0000-0000-0000-000000000008', 'Olympic Safi', 'Safi', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/b/b8/Logo_de_l%27Olympique_Club_de_Safi.png'),
  ('11111111-0000-0000-0000-000000000009', 'MC Oujda', 'Oujda', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/8/87/Mouloudia_Club_d%27Oujda.png'),
  ('11111111-0000-0000-0000-000000000010', 'Union Touarga Sport', 'Rabat', 'Maroc', 'https://upload.wikimedia.org/wikipedia/fr/5/52/Logo_Union_Touarga.png');


-- ----------------------------------------------------
-- 4. STADIUMS (6 STADES MAROCAINS)
-- ----------------------------------------------------
INSERT INTO stadiums (id, name, city, photo_url) VALUES 
  ('22222222-0000-0000-0000-000000000001', 'Complexe Sportif Prince Moulay Abdellah', 'Rabat', NULL),
  ('22222222-0000-0000-0000-000000000002', 'Stade Mohammed V', 'Casablanca', NULL),
  ('22222222-0000-0000-0000-000000000003', 'Grand Stade de Tanger', 'Tanger', NULL),
  ('22222222-0000-0000-0000-000000000004', 'Grand Stade de Marrakech', 'Marrakech', NULL),
  ('22222222-0000-0000-0000-000000000005', 'Grand Stade d''Agadir', 'Agadir', NULL),
  ('22222222-0000-0000-0000-000000000006', 'Stade Municipal de Berkane', 'Berkane', NULL);


-- ----------------------------------------------------
-- 5. STAFF (10 MEMBRES DU STAFF DU FUS)
-- ----------------------------------------------------
INSERT INTO staff (id, full_name, role, specialty) VALUES 
  (gen_random_uuid(), 'Amine Karmamine', 'coach', 'Manager Général'),
  (gen_random_uuid(), 'Nabil Baha', 'assistant_coach', 'Entraîneur Adjoint'),
  (gen_random_uuid(), 'Youssef Safri', 'assistant_coach', 'Coach Tactique'),
  (gen_random_uuid(), 'Tarik El Jarmouni', 'assistant_coach', 'Entraîneur des Gardiens'),
  (gen_random_uuid(), 'Hassan Loued', 'match_operator', 'Préparateur Physique'),
  (gen_random_uuid(), 'Rachid Mounir', 'match_operator', 'Analyste Vidéo'),
  (gen_random_uuid(), 'Hala Drissi', 'medical', 'Médecin Sportive'),
  (gen_random_uuid(), 'Ismael Bekkali', 'medical', 'Kiné / Ostéopathe'),
  (gen_random_uuid(), 'Kamal Chafni', 'scout', 'Superviseur CDF'),
  (gen_random_uuid(), 'Brahim Zaari', 'coach', 'Directeur Académie U13-U15');


-- ----------------------------------------------------
-- 6. TEAMS (10 ÉQUIPES DU FUS RABAT)
-- ----------------------------------------------------
INSERT INTO teams (id, name, category) VALUES 
  ('33333333-1111-1111-1111-000000000012', 'FUS U12 A', 'U12'),
  ('33333333-1111-1111-1111-000000000013', 'FUS U13 Elite', 'U13'),
  ('33333333-1111-1111-1111-000000000014', 'FUS U14 A', 'U14'),
  ('33333333-1111-1111-1111-000000000015', 'FUS U15 Elite', 'U15'),
  ('33333333-1111-1111-1111-000000000016', 'FUS U16', 'U16'),
  ('33333333-1111-1111-1111-000000000017', 'FUS U17 National', 'U17'),
  ('33333333-1111-1111-1111-000000000018', 'FUS U18', 'U18'),
  ('33333333-1111-1111-1111-000000000019', 'FUS U19', 'U19'),
  ('33333333-1111-1111-1111-000000000020', 'FUS Espoirs (U21)', 'Espoirs'),
  ('33333333-1111-1111-1111-000000000021', 'FUS Équipe A', 'PRO');


-- ----------------------------------------------------
-- 7. PLAYERS : GÉNÉRATION DE 22 JOUEURS PAR ÉQUIPES (220 JOUEURS TOTAL)
-- Utilisation du PL/pgSQL pour la génération automatique avec 22 rôles exacts.
-- ----------------------------------------------------
DO $$
DECLARE
  team_rec RECORD;
  i INT;
  first_names TEXT[] := ARRAY['Amine', 'Yassine', 'Hakim', 'Brahim', 'Sofyan', 'Nayef', 'Achraf', 'Noussair', 'Yahya', 'Ayoub', 'Ilyas', 'Bilal', 'Ismael', 'Mehdi', 'Anas', 'Oussama', 'Hamza', 'Zakaria', 'Soufiane', 'Azeddine', 'Rachid', 'Tariq', 'Khalid'];
  last_names TEXT[] := ARRAY['Bounou', 'Hakimi', 'Aguerd', 'Saiss', 'Mazraoui', 'Amrabat', 'Ounahi', 'Ziyech', 'Diaz', 'En-Nesyri', 'El Kaabi', 'Adli', 'Harit', 'Boufal', 'Abde', 'Richardson', 'Saibari', 'El Khannouss', 'Rahimi', 'Akhomach', 'Taarabt', 'Benoun'];
  positions TEXT[] := ARRAY['GK', 'GK', 'RB', 'RB', 'LB', 'LB', 'CB', 'CB', 'CB', 'CB', 'CDM', 'CDM', 'CM', 'CM', 'CAM', 'CAM', 'LW', 'LW', 'RW', 'RW', 'ST', 'ST'];
  preferred_foots TEXT[] := ARRAY['Right', 'Left', 'Both'];
BEGIN
  FOR team_rec IN SELECT id, category FROM teams LOOP
    FOR i IN 1..22 LOOP
      INSERT INTO players (full_name, category, team_id, position, jersey_number, preferred_foot, nationality)
      VALUES (
        first_names[1 + mod((random()*100)::int, array_length(first_names, 1))] || ' ' || last_names[1 + mod((random()*100)::int, array_length(last_names, 1))],
        team_rec.category,
        team_rec.id,
        positions[i],
        i,
        preferred_foots[1 + mod(i, 3)],
        'Marocain'
      );
    END LOOP;
  END LOOP;
END $$;


-- ----------------------------------------------------
-- 8. MATCHES (10 MATCHS DU FUS CONTRE LE RESTE DU MAROC)
-- ----------------------------------------------------
INSERT INTO matches (category, team_id, opponent_id, stadium_id, match_date, match_time, is_home, status, formation, score_home, score_away, opponent_formation) VALUES 
  ('PRO', '33333333-1111-1111-1111-000000000021', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', CURRENT_DATE, '21:00', true, 'planned', '4-3-3', 0, 0, '4-4-2'), -- vs Wydad (Today)
  ('PRO', '33333333-1111-1111-1111-000000000021', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', CURRENT_DATE, '18:30', false, 'planned', '4-2-3-1', 0, 0, '4-3-3'), -- vs Raja (Today)
  ('Espoirs', '33333333-1111-1111-1111-000000000020', '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', CURRENT_DATE + interval '3 days', '20:00', true, 'planned', '4-3-3', 0, 0, '4-2-3-1'), -- FUS Espoirs vs FAR
  ('U19', '33333333-1111-1111-1111-000000000019', '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000006', CURRENT_DATE + interval '7 days', '16:00', false, 'planned', '3-5-2', 0, 0, '3-4-3'), -- FUS U19 vs Berkane
  ('PRO', '33333333-1111-1111-1111-000000000021', '11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', CURRENT_DATE + interval '14 days', '21:00', true, 'planned', '4-3-3', 0, 0, '4-4-2'), -- vs MAS
  ('U17', '33333333-1111-1111-1111-000000000017', '11111111-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000003', CURRENT_DATE - interval '7 days', '11:00', false, 'finished', '4-2-3-1', 1, 2, '4-4-2'), -- FUS U17 vs Tanger (Finished)
  ('PRO', '33333333-1111-1111-1111-000000000021', '11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000005', CURRENT_DATE - interval '14 days', '21:00', false, 'finished', '4-3-3', 0, 1, '4-3-3'), -- vs Agadir (Finished)
  ('U15', '33333333-1111-1111-1111-000000000015', '11111111-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000001', CURRENT_DATE + interval '2 days', '10:00', true, 'planned', '4-4-2', 0, 0, '4-2-3-1'), -- FUS U15 vs Safi
  ('U13', '33333333-1111-1111-1111-000000000013', '11111111-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000001', CURRENT_DATE + interval '4 days', '09:00', true, 'planned', '3-4-3', 0, 0, '4-4-2'), -- FUS U13 vs Oujda
  ('PRO', '33333333-1111-1111-1111-000000000021', '11111111-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000001', CURRENT_DATE + interval '21 days', '20:30', true, 'planned', '4-2-3-1', 0, 0, '4-3-3'); -- vs Touarga (Derby de Rabat)
