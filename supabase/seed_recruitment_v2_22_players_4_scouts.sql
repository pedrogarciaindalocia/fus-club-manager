-- ==============================================================================
-- 🇲🇦 FUS CLUB - SEED SQL RECRUTEMENT & DÉTECTION V2
-- 22 Joueurs pour CHAQUE catégorie (U13 à U23) = 242 Joueurs au total
-- 2 Joueurs par poste pour chacun des 11 postes du terrain tactique
-- Saisie et détection effectuées par les 4 Scout Managers
-- AUCUNE TABLE CRÉÉE : UNIQUEMENT DES INSERTIONS (INSERT INTO)
-- ==============================================================================

-- ==============================================================================
-- SECTION 1 : 4 SCOUT MANAGERS
-- ==============================================================================

INSERT INTO public.scouts (
    id, full_name, email, phone, role_title, recruitment_region, 
    assigned_categories, status, recruited_date, notes
) VALUES
(
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', 'm.benatia@fus.ma', '+212 6 61 12 34 56',
    'Scout Manager', 'Rabat-Salé-Kénitra', ARRAY['U13', 'U14', 'U15'], 'active', CURRENT_DATE,
    'Scout Manager référent pré-formation et école de football FUS. Spécialiste détection précoce.'
),
(
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', 't.sektioui@fus.ma', '+212 6 62 23 45 67',
    'Scout Manager', 'Fès-Meknès & Oriental', ARRAY['U16', 'U17', 'U18'], 'active', CURRENT_DATE,
    'Scout Manager formation intermédiaire et détection académique nationale.'
),
(
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', 'h.benabicha@fus.ma', '+212 6 63 34 56 78',
    'Scout Manager', 'Grand Casablanca-Settat', ARRAY['U19', 'U20', 'U21'], 'active', CURRENT_DATE,
    'Scout Manager post-formation et passerelle U19/U21 vers l''équipe réserve.'
),
(
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', 'y.safri@fus.ma', '+212 6 64 45 67 89',
    'Scout Manager', 'Marrakech-Safi & Sud', ARRAY['U22', 'U23'], 'active', CURRENT_DATE,
    'Scout Manager catégorie Espoirs/U23 & détection talents prêts pour le groupe Pro.'
)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role_title = EXCLUDED.role_title,
    recruitment_region = EXCLUDED.recruitment_region,
    assigned_categories = EXCLUDED.assigned_categories,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- ==============================================================================
-- SECTION 2 : 242 JOUEURS CANDIDATS (22 PAR CATÉGORIE / 2 PAR POSTE)
-- ==============================================================================

INSERT INTO public.trial_candidates (
    id, first_name, last_name, birth_date, birth_place, nationality, gender,
    primary_position, secondary_position, preferred_foot, height_cm, weight_kg, age_category,
    current_club, matches_played, goals, assists,
    discovering_scout_id, discovering_scout_name, recruiter_id, recruiter_name,
    discovery_location, discovery_match,
    recommendation_priority, initial_scout_score, scout_recommendation_notes,
    pipeline_stage, status
) VALUES
(
    'c0000000-0013-0001-0000-000000000001', 'Ziyad', 'El Mourabit', '2013-02-11', 'Salé', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 174, 64, 'U13',
    'KAC Kénitra U13', 13, 1, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Salé', 'KAC Kénitra U13 vs FUS U13',
    'high', 86, 'Joueur Titulaire N°1 au poste de Gardien de But en U13. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0013-0001-0000-000000000002', 'Reda', 'Chraibi', '2013-03-21', 'Témara', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 171, 61, 'U13',
    'RS Berkane Académie U13', 14, 2, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Témara', 'RS Berkane Académie U13 vs FUS U13',
    'medium', 89, 'Joueur Doublure N°2 au poste de Gardien de But en U13. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0013-0002-0000-000000000003', 'Sami', 'Regragui', '2013-04-17', 'Kénitra', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 166, 57, 'U13',
    'Raja Club Athletic U13', 15, 0, 6,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Kénitra', 'Raja Club Athletic U13 vs FUS U13',
    'very_high', 80, 'Joueur Titulaire N°1 au poste de Latéral Droit en U13. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0013-0002-0000-000000000004', 'Ayman', 'Benjelloun', '2013-05-27', 'Casablanca', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 163, 54, 'U13',
    'Académie Mohammed VI Football U13', 16, 1, 7,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Casablanca', 'Académie Mohammed VI Football U13 vs FUS U13',
    'medium', 83, 'Joueur Doublure N°2 au poste de Latéral Droit en U13. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0013-0003-0000-000000000005', 'Yassine', 'Cherradi', '2013-06-23', 'Fès', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 176, 67, 'U13',
    'Hassania Agadir U13', 17, 2, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Fès', 'Hassania Agadir U13 vs FUS U13',
    'high', 94, 'Joueur Titulaire N°1 au poste de Défenseur Central Droit en U13. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0013-0003-0000-000000000006', 'Marouane', 'Boukhalfa', '2013-07-06', 'Marrakech', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 173, 64, 'U13',
    'Moghreb Tétouan U13', 18, 0, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Marrakech', 'Moghreb Tétouan U13 vs FUS U13',
    'medium', 77, 'Joueur Doublure N°2 au poste de Défenseur Central Droit en U13. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0013-0004-0000-000000000007', 'Adam', 'Bennis', '2013-08-02', 'Tanger', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 175, 66, 'U13',
    'Chabab Mohammedia U13', 19, 1, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Tanger', 'Chabab Mohammedia U13 vs FUS U13',
    'high', 88, 'Joueur Titulaire N°1 au poste de Défenseur Central Gauche en U13. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0013-0004-0000-000000000008', 'Soufiane', 'Zerouali', '2013-09-12', 'Tétouan', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 172, 63, 'U13',
    'FUS Rabat Académie U13', 20, 2, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Tétouan', 'FUS Rabat Académie U13 vs FUS U13',
    'medium', 91, 'Joueur Doublure N°2 au poste de Défenseur Central Gauche en U13. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0013-0005-0000-000000000009', 'Rayane', 'Rahimi', '2013-10-08', 'Agadir', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 165, 56, 'U13',
    'KAC Kénitra U13', 21, 0, 7,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Agadir', 'KAC Kénitra U13 vs FUS U13',
    'very_high', 82, 'Joueur Titulaire N°1 au poste de Latéral Gauche en U13. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0013-0005-0000-000000000010', 'Mehdi', 'Aboukhlal', '2013-11-18', 'Berkane', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 162, 53, 'U13',
    'RS Berkane Académie U13', 22, 1, 3,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Berkane', 'RS Berkane Académie U13 vs FUS U13',
    'medium', 85, 'Joueur Doublure N°2 au poste de Latéral Gauche en U13. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0013-0006-0000-000000000011', 'Hamza', 'En-Nesyri', '2013-12-14', 'Mohammedia', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 170, 62, 'U13',
    'Raja Club Athletic U13', 23, 7, 7,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Mohammedia', 'Raja Club Athletic U13 vs FUS U13',
    'high', 96, 'Joueur Titulaire N°1 au poste de Milieu Défensif en U13. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0013-0006-0000-000000000012', 'Ismail', 'Bellarabi', '2013-01-24', 'Rabat', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 167, 59, 'U13',
    'Académie Mohammed VI Football U13', 24, 2, 8,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Rabat', 'Académie Mohammed VI Football U13 vs FUS U13',
    'medium', 79, 'Joueur Doublure N°2 au poste de Milieu Défensif en U13. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0013-0007-0000-000000000013', 'Othmane', 'Boukhriss', '2013-02-20', 'Salé', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 168, 60, 'U13',
    'Hassania Agadir U13', 25, 3, 9,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Salé', 'Hassania Agadir U13 vs FUS U13',
    'high', 90, 'Joueur Titulaire N°1 au poste de Milieu Central Droit en U13. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0013-0007-0000-000000000014', 'Bilal', 'Haddad', '2013-03-03', 'Témara', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 165, 57, 'U13',
    'Moghreb Tétouan U13', 12, 4, 10,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Témara', 'Moghreb Tétouan U13 vs FUS U13',
    'medium', 93, 'Joueur Doublure N°2 au poste de Milieu Central Droit en U13. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0013-0008-0000-000000000015', 'Zakaria', 'Mansouri', '2013-04-26', 'Kénitra', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 167, 59, 'U13',
    'Chabab Mohammedia U13', 13, 5, 11,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Kénitra', 'Chabab Mohammedia U13 vs FUS U13',
    'very_high', 84, 'Joueur Titulaire N°1 au poste de Milieu Central Gauche en U13. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0013-0008-0000-000000000016', 'Nassim', 'El Amrani', '2013-05-09', 'Casablanca', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 164, 56, 'U13',
    'FUS Rabat Académie U13', 14, 6, 12,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Casablanca', 'FUS Rabat Académie U13 vs FUS U13',
    'medium', 87, 'Joueur Doublure N°2 au poste de Milieu Central Gauche en U13. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0013-0009-0000-000000000017', 'Youssef', 'Tahiri', '2013-06-05', 'Fès', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 167, 58, 'U13',
    'KAC Kénitra U13', 15, 7, 5,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Fès', 'KAC Kénitra U13 vs FUS U13',
    'high', 98, 'Joueur Titulaire N°1 au poste de Ailier Droit en U13. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0013-0009-0000-000000000018', 'Walid', 'Zouheir', '2013-07-15', 'Marrakech', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 164, 55, 'U13',
    'RS Berkane Académie U13', 16, 8, 6,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Marrakech', 'RS Berkane Académie U13 vs FUS U13',
    'medium', 81, 'Joueur Doublure N°2 au poste de Ailier Droit en U13. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0013-0010-0000-000000000019', 'Amine', 'El Khayati', '2013-08-11', 'Tanger', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 174, 66, 'U13',
    'Raja Club Athletic U13', 17, 17, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Tanger', 'Raja Club Athletic U13 vs FUS U13',
    'high', 92, 'Joueur Titulaire N°1 au poste de Avant-Centre en U13. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0013-0010-0000-000000000020', 'Taha', 'El Asbahi', '2013-09-21', 'Tétouan', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 171, 63, 'U13',
    'Académie Mohammed VI Football U13', 18, 18, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Tétouan', 'Académie Mohammed VI Football U13 vs FUS U13',
    'medium', 75, 'Joueur Doublure N°2 au poste de Avant-Centre en U13. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0013-0011-0000-000000000021', 'Anas', 'Berrada', '2013-10-17', 'Agadir', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 166, 57, 'U13',
    'Hassania Agadir U13', 19, 11, 9,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Agadir', 'Hassania Agadir U13 vs FUS U13',
    'very_high', 86, 'Joueur Titulaire N°1 au poste de Ailier Gauche en U13. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0013-0011-0000-000000000022', 'Badr', 'Belammari', '2013-11-27', 'Berkane', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 163, 54, 'U13',
    'Moghreb Tétouan U13', 20, 12, 10,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Berkane', 'Moghreb Tétouan U13 vs FUS U13',
    'medium', 89, 'Joueur Doublure N°2 au poste de Ailier Gauche en U13. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0014-0001-0000-000000000023', 'Ziyad', 'Chraibi', '2012-03-11', 'Témara', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 176, 66, 'U14',
    'AS FAR Jeunes U14', 16, 1, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Témara', 'AS FAR Jeunes U14 vs FUS U14',
    'high', 89, 'Joueur Titulaire N°1 au poste de Gardien de But en U14. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0014-0001-0000-000000000024', 'Reda', 'Regragui', '2012-04-21', 'Kénitra', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 173, 63, 'U14',
    'Wydad AC Jeunes U14', 17, 2, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Kénitra', 'Wydad AC Jeunes U14 vs FUS U14',
    'medium', 92, 'Joueur Doublure N°2 au poste de Gardien de But en U14. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0014-0002-0000-000000000025', 'Sami', 'Benjelloun', '2012-05-17', 'Casablanca', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 168, 59, 'U14',
    'MAS Fès U14', 18, 0, 6,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Casablanca', 'MAS Fès U14 vs FUS U14',
    'very_high', 83, 'Joueur Titulaire N°1 au poste de Latéral Droit en U14. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0014-0002-0000-000000000026', 'Ayman', 'Cherradi', '2012-06-27', 'Fès', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 165, 56, 'U14',
    'Kawkab Marrakech U14', 19, 1, 7,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Fès', 'Kawkab Marrakech U14 vs FUS U14',
    'medium', 86, 'Joueur Doublure N°2 au poste de Latéral Droit en U14. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0014-0003-0000-000000000027', 'Yassine', 'Boukhalfa', '2012-07-23', 'Marrakech', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 178, 69, 'U14',
    'Ittihad Tanger U14', 20, 2, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Marrakech', 'Ittihad Tanger U14 vs FUS U14',
    'high', 97, 'Joueur Titulaire N°1 au poste de Défenseur Central Droit en U14. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0014-0003-0000-000000000028', 'Marouane', 'Bennis', '2012-08-06', 'Tanger', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 175, 66, 'U14',
    'Olympique Safi U14', 21, 0, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Tanger', 'Olympique Safi U14 vs FUS U14',
    'medium', 80, 'Joueur Doublure N°2 au poste de Défenseur Central Droit en U14. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0014-0004-0000-000000000029', 'Adam', 'Zerouali', '2012-09-02', 'Tétouan', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 177, 68, 'U14',
    'Union Touarga Sport U14', 22, 1, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Tétouan', 'Union Touarga Sport U14 vs FUS U14',
    'high', 91, 'Joueur Titulaire N°1 au poste de Défenseur Central Gauche en U14. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0014-0004-0000-000000000030', 'Soufiane', 'Rahimi', '2012-10-12', 'Agadir', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 174, 65, 'U14',
    'Union Sportive Témara U14', 23, 2, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Agadir', 'Union Sportive Témara U14 vs FUS U14',
    'medium', 94, 'Joueur Doublure N°2 au poste de Défenseur Central Gauche en U14. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0014-0005-0000-000000000031', 'Rayane', 'Aboukhlal', '2012-11-08', 'Berkane', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 167, 58, 'U14',
    'AS FAR Jeunes U14', 24, 0, 7,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Berkane', 'AS FAR Jeunes U14 vs FUS U14',
    'very_high', 85, 'Joueur Titulaire N°1 au poste de Latéral Gauche en U14. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0014-0005-0000-000000000032', 'Mehdi', 'En-Nesyri', '2012-12-18', 'Mohammedia', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 164, 55, 'U14',
    'Wydad AC Jeunes U14', 25, 1, 3,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Mohammedia', 'Wydad AC Jeunes U14 vs FUS U14',
    'medium', 88, 'Joueur Doublure N°2 au poste de Latéral Gauche en U14. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0014-0006-0000-000000000033', 'Hamza', 'Bellarabi', '2012-01-14', 'Rabat', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 172, 64, 'U14',
    'MAS Fès U14', 12, 7, 7,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Rabat', 'MAS Fès U14 vs FUS U14',
    'high', 79, 'Joueur Titulaire N°1 au poste de Milieu Défensif en U14. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0014-0006-0000-000000000034', 'Ismail', 'Boukhriss', '2012-02-24', 'Salé', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 169, 61, 'U14',
    'Kawkab Marrakech U14', 13, 2, 8,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Salé', 'Kawkab Marrakech U14 vs FUS U14',
    'medium', 82, 'Joueur Doublure N°2 au poste de Milieu Défensif en U14. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0014-0007-0000-000000000035', 'Othmane', 'Haddad', '2012-03-20', 'Témara', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 170, 62, 'U14',
    'Ittihad Tanger U14', 14, 3, 9,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Témara', 'Ittihad Tanger U14 vs FUS U14',
    'high', 93, 'Joueur Titulaire N°1 au poste de Milieu Central Droit en U14. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0014-0007-0000-000000000036', 'Bilal', 'Mansouri', '2012-04-03', 'Kénitra', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 167, 59, 'U14',
    'Olympique Safi U14', 15, 4, 10,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Kénitra', 'Olympique Safi U14 vs FUS U14',
    'medium', 76, 'Joueur Doublure N°2 au poste de Milieu Central Droit en U14. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0014-0008-0000-000000000037', 'Zakaria', 'El Amrani', '2012-05-26', 'Casablanca', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 169, 61, 'U14',
    'Union Touarga Sport U14', 16, 5, 11,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Casablanca', 'Union Touarga Sport U14 vs FUS U14',
    'very_high', 87, 'Joueur Titulaire N°1 au poste de Milieu Central Gauche en U14. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0014-0008-0000-000000000038', 'Nassim', 'Tahiri', '2012-06-09', 'Fès', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 166, 58, 'U14',
    'Union Sportive Témara U14', 17, 6, 12,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Fès', 'Union Sportive Témara U14 vs FUS U14',
    'medium', 90, 'Joueur Doublure N°2 au poste de Milieu Central Gauche en U14. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0014-0009-0000-000000000039', 'Youssef', 'Zouheir', '2012-07-05', 'Marrakech', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 169, 60, 'U14',
    'AS FAR Jeunes U14', 18, 7, 5,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Marrakech', 'AS FAR Jeunes U14 vs FUS U14',
    'high', 81, 'Joueur Titulaire N°1 au poste de Ailier Droit en U14. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0014-0009-0000-000000000040', 'Walid', 'El Khayati', '2012-08-15', 'Tanger', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 166, 57, 'U14',
    'Wydad AC Jeunes U14', 19, 8, 6,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Tanger', 'Wydad AC Jeunes U14 vs FUS U14',
    'medium', 84, 'Joueur Doublure N°2 au poste de Ailier Droit en U14. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0014-0010-0000-000000000041', 'Amine', 'El Asbahi', '2012-09-11', 'Tétouan', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 176, 68, 'U14',
    'MAS Fès U14', 20, 17, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Tétouan', 'MAS Fès U14 vs FUS U14',
    'high', 95, 'Joueur Titulaire N°1 au poste de Avant-Centre en U14. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0014-0010-0000-000000000042', 'Taha', 'Berrada', '2012-10-21', 'Agadir', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 173, 65, 'U14',
    'Kawkab Marrakech U14', 21, 18, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Agadir', 'Kawkab Marrakech U14 vs FUS U14',
    'medium', 78, 'Joueur Doublure N°2 au poste de Avant-Centre en U14. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0014-0011-0000-000000000043', 'Anas', 'Belammari', '2012-11-17', 'Berkane', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 168, 59, 'U14',
    'Ittihad Tanger U14', 22, 11, 9,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Berkane', 'Ittihad Tanger U14 vs FUS U14',
    'very_high', 89, 'Joueur Titulaire N°1 au poste de Ailier Gauche en U14. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0014-0011-0000-000000000044', 'Badr', 'El Mourabit', '2012-12-27', 'Mohammedia', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 165, 56, 'U14',
    'Olympique Safi U14', 23, 12, 10,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Mohammedia', 'Olympique Safi U14 vs FUS U14',
    'medium', 92, 'Joueur Doublure N°2 au poste de Ailier Gauche en U14. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0015-0001-0000-000000000045', 'Ziyad', 'Regragui', '2011-04-11', 'Kénitra', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 177, 68, 'U15',
    'RS Berkane Académie U15', 19, 1, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Kénitra', 'RS Berkane Académie U15 vs FUS U15',
    'high', 92, 'Joueur Titulaire N°1 au poste de Gardien de But en U15. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0015-0001-0000-000000000046', 'Reda', 'Benjelloun', '2011-05-21', 'Casablanca', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 174, 65, 'U15',
    'Raja Club Athletic U15', 20, 2, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Casablanca', 'Raja Club Athletic U15 vs FUS U15',
    'medium', 75, 'Joueur Doublure N°2 au poste de Gardien de But en U15. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0015-0002-0000-000000000047', 'Sami', 'Cherradi', '2011-06-17', 'Fès', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 169, 61, 'U15',
    'Académie Mohammed VI Football U15', 21, 0, 6,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Fès', 'Académie Mohammed VI Football U15 vs FUS U15',
    'very_high', 86, 'Joueur Titulaire N°1 au poste de Latéral Droit en U15. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0015-0002-0000-000000000048', 'Ayman', 'Boukhalfa', '2011-07-27', 'Marrakech', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 166, 58, 'U15',
    'Hassania Agadir U15', 22, 1, 7,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Marrakech', 'Hassania Agadir U15 vs FUS U15',
    'medium', 89, 'Joueur Doublure N°2 au poste de Latéral Droit en U15. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0015-0003-0000-000000000049', 'Yassine', 'Bennis', '2011-08-23', 'Tanger', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 179, 71, 'U15',
    'Moghreb Tétouan U15', 23, 2, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Tanger', 'Moghreb Tétouan U15 vs FUS U15',
    'high', 80, 'Joueur Titulaire N°1 au poste de Défenseur Central Droit en U15. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0015-0003-0000-000000000050', 'Marouane', 'Zerouali', '2011-09-06', 'Tétouan', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 176, 68, 'U15',
    'Chabab Mohammedia U15', 24, 0, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Tétouan', 'Chabab Mohammedia U15 vs FUS U15',
    'medium', 83, 'Joueur Doublure N°2 au poste de Défenseur Central Droit en U15. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0015-0004-0000-000000000051', 'Adam', 'Rahimi', '2011-10-02', 'Agadir', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 178, 70, 'U15',
    'FUS Rabat Académie U15', 25, 1, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Agadir', 'FUS Rabat Académie U15 vs FUS U15',
    'high', 94, 'Joueur Titulaire N°1 au poste de Défenseur Central Gauche en U15. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0015-0004-0000-000000000052', 'Soufiane', 'Aboukhlal', '2011-11-12', 'Berkane', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 175, 67, 'U15',
    'KAC Kénitra U15', 12, 2, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Berkane', 'KAC Kénitra U15 vs FUS U15',
    'medium', 77, 'Joueur Doublure N°2 au poste de Défenseur Central Gauche en U15. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0015-0005-0000-000000000053', 'Rayane', 'En-Nesyri', '2011-12-08', 'Mohammedia', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 168, 60, 'U15',
    'RS Berkane Académie U15', 13, 0, 7,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Mohammedia', 'RS Berkane Académie U15 vs FUS U15',
    'very_high', 88, 'Joueur Titulaire N°1 au poste de Latéral Gauche en U15. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0015-0005-0000-000000000054', 'Mehdi', 'Bellarabi', '2011-01-18', 'Rabat', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 165, 57, 'U15',
    'Raja Club Athletic U15', 14, 1, 3,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Rabat', 'Raja Club Athletic U15 vs FUS U15',
    'medium', 91, 'Joueur Doublure N°2 au poste de Latéral Gauche en U15. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0015-0006-0000-000000000055', 'Hamza', 'Boukhriss', '2011-02-14', 'Salé', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 173, 66, 'U15',
    'Académie Mohammed VI Football U15', 15, 7, 7,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Salé', 'Académie Mohammed VI Football U15 vs FUS U15',
    'high', 82, 'Joueur Titulaire N°1 au poste de Milieu Défensif en U15. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0015-0006-0000-000000000056', 'Ismail', 'Haddad', '2011-03-24', 'Témara', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 170, 63, 'U15',
    'Hassania Agadir U15', 16, 2, 8,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Témara', 'Hassania Agadir U15 vs FUS U15',
    'medium', 85, 'Joueur Doublure N°2 au poste de Milieu Défensif en U15. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0015-0007-0000-000000000057', 'Othmane', 'Mansouri', '2011-04-20', 'Kénitra', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 171, 64, 'U15',
    'Moghreb Tétouan U15', 17, 3, 9,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Kénitra', 'Moghreb Tétouan U15 vs FUS U15',
    'high', 96, 'Joueur Titulaire N°1 au poste de Milieu Central Droit en U15. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0015-0007-0000-000000000058', 'Bilal', 'El Amrani', '2011-05-03', 'Casablanca', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 168, 61, 'U15',
    'Chabab Mohammedia U15', 18, 4, 10,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Casablanca', 'Chabab Mohammedia U15 vs FUS U15',
    'medium', 79, 'Joueur Doublure N°2 au poste de Milieu Central Droit en U15. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0015-0008-0000-000000000059', 'Zakaria', 'Tahiri', '2011-06-26', 'Fès', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 170, 63, 'U15',
    'FUS Rabat Académie U15', 19, 5, 11,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Fès', 'FUS Rabat Académie U15 vs FUS U15',
    'very_high', 90, 'Joueur Titulaire N°1 au poste de Milieu Central Gauche en U15. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0015-0008-0000-000000000060', 'Nassim', 'Zouheir', '2011-07-09', 'Marrakech', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 167, 60, 'U15',
    'KAC Kénitra U15', 20, 6, 12,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Marrakech', 'KAC Kénitra U15 vs FUS U15',
    'medium', 93, 'Joueur Doublure N°2 au poste de Milieu Central Gauche en U15. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0015-0009-0000-000000000061', 'Youssef', 'El Khayati', '2011-08-05', 'Tanger', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 170, 62, 'U15',
    'RS Berkane Académie U15', 21, 7, 5,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Tanger', 'RS Berkane Académie U15 vs FUS U15',
    'high', 84, 'Joueur Titulaire N°1 au poste de Ailier Droit en U15. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0015-0009-0000-000000000062', 'Walid', 'El Asbahi', '2011-09-15', 'Tétouan', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 167, 59, 'U15',
    'Raja Club Athletic U15', 22, 8, 6,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Tétouan', 'Raja Club Athletic U15 vs FUS U15',
    'medium', 87, 'Joueur Doublure N°2 au poste de Ailier Droit en U15. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0015-0010-0000-000000000063', 'Amine', 'Berrada', '2011-10-11', 'Agadir', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 177, 70, 'U15',
    'Académie Mohammed VI Football U15', 23, 17, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Agadir', 'Académie Mohammed VI Football U15 vs FUS U15',
    'high', 98, 'Joueur Titulaire N°1 au poste de Avant-Centre en U15. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0015-0010-0000-000000000064', 'Taha', 'Belammari', '2011-11-21', 'Berkane', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 174, 67, 'U15',
    'Hassania Agadir U15', 24, 18, 1,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Berkane', 'Hassania Agadir U15 vs FUS U15',
    'medium', 81, 'Joueur Doublure N°2 au poste de Avant-Centre en U15. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0015-0011-0000-000000000065', 'Anas', 'El Mourabit', '2011-12-17', 'Mohammedia', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 169, 61, 'U15',
    'Moghreb Tétouan U15', 25, 11, 9,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Mohammedia', 'Moghreb Tétouan U15 vs FUS U15',
    'very_high', 92, 'Joueur Titulaire N°1 au poste de Ailier Gauche en U15. Détecté par Mehdi Benatia.',
    'shortlist', 'registered'
),
(
    'c0000000-0015-0011-0000-000000000066', 'Badr', 'Chraibi', '2011-01-27', 'Rabat', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 166, 58, 'U15',
    'Chabab Mohammedia U15', 12, 12, 10,
    'a0000000-0000-0000-0000-000000000001', 'Mehdi Benatia', NULL, 'Mehdi Benatia',
    'Stade Municipal Rabat', 'Chabab Mohammedia U15 vs FUS U15',
    'medium', 75, 'Joueur Doublure N°2 au poste de Ailier Gauche en U15. Détecté par Mehdi Benatia.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0016-0001-0000-000000000067', 'Ziyad', 'Benjelloun', '2010-05-11', 'Casablanca', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 179, 69, 'U16',
    'Wydad AC Jeunes U16', 22, 1, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Casablanca', 'Wydad AC Jeunes U16 vs FUS U16',
    'high', 95, 'Joueur Titulaire N°1 au poste de Gardien de But en U16. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0016-0001-0000-000000000068', 'Reda', 'Cherradi', '2010-06-21', 'Fès', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 176, 66, 'U16',
    'MAS Fès U16', 23, 2, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Fès', 'MAS Fès U16 vs FUS U16',
    'medium', 78, 'Joueur Doublure N°2 au poste de Gardien de But en U16. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0016-0002-0000-000000000069', 'Sami', 'Boukhalfa', '2010-07-17', 'Marrakech', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 171, 62, 'U16',
    'Kawkab Marrakech U16', 24, 0, 6,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Marrakech', 'Kawkab Marrakech U16 vs FUS U16',
    'very_high', 89, 'Joueur Titulaire N°1 au poste de Latéral Droit en U16. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0016-0002-0000-000000000070', 'Ayman', 'Bennis', '2010-08-27', 'Tanger', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 168, 59, 'U16',
    'Ittihad Tanger U16', 25, 1, 7,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Tanger', 'Ittihad Tanger U16 vs FUS U16',
    'medium', 92, 'Joueur Doublure N°2 au poste de Latéral Droit en U16. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0016-0003-0000-000000000071', 'Yassine', 'Zerouali', '2010-09-23', 'Tétouan', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 181, 72, 'U16',
    'Olympique Safi U16', 12, 2, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Tétouan', 'Olympique Safi U16 vs FUS U16',
    'high', 83, 'Joueur Titulaire N°1 au poste de Défenseur Central Droit en U16. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0016-0003-0000-000000000072', 'Marouane', 'Rahimi', '2010-10-06', 'Agadir', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 178, 69, 'U16',
    'Union Touarga Sport U16', 13, 0, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Agadir', 'Union Touarga Sport U16 vs FUS U16',
    'medium', 86, 'Joueur Doublure N°2 au poste de Défenseur Central Droit en U16. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0016-0004-0000-000000000073', 'Adam', 'Aboukhlal', '2010-11-02', 'Berkane', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 180, 71, 'U16',
    'Union Sportive Témara U16', 14, 1, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Berkane', 'Union Sportive Témara U16 vs FUS U16',
    'high', 97, 'Joueur Titulaire N°1 au poste de Défenseur Central Gauche en U16. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0016-0004-0000-000000000074', 'Soufiane', 'En-Nesyri', '2010-12-12', 'Mohammedia', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 177, 68, 'U16',
    'AS FAR Jeunes U16', 15, 2, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Mohammedia', 'AS FAR Jeunes U16 vs FUS U16',
    'medium', 80, 'Joueur Doublure N°2 au poste de Défenseur Central Gauche en U16. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0016-0005-0000-000000000075', 'Rayane', 'Bellarabi', '2010-01-08', 'Rabat', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 170, 61, 'U16',
    'Wydad AC Jeunes U16', 16, 0, 7,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Rabat', 'Wydad AC Jeunes U16 vs FUS U16',
    'very_high', 91, 'Joueur Titulaire N°1 au poste de Latéral Gauche en U16. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0016-0005-0000-000000000076', 'Mehdi', 'Boukhriss', '2010-02-18', 'Salé', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 167, 58, 'U16',
    'MAS Fès U16', 17, 1, 3,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Salé', 'MAS Fès U16 vs FUS U16',
    'medium', 94, 'Joueur Doublure N°2 au poste de Latéral Gauche en U16. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0016-0006-0000-000000000077', 'Hamza', 'Haddad', '2010-03-14', 'Témara', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 175, 67, 'U16',
    'Kawkab Marrakech U16', 18, 7, 7,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Témara', 'Kawkab Marrakech U16 vs FUS U16',
    'high', 85, 'Joueur Titulaire N°1 au poste de Milieu Défensif en U16. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0016-0006-0000-000000000078', 'Ismail', 'Mansouri', '2010-04-24', 'Kénitra', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 172, 64, 'U16',
    'Ittihad Tanger U16', 19, 2, 8,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Kénitra', 'Ittihad Tanger U16 vs FUS U16',
    'medium', 88, 'Joueur Doublure N°2 au poste de Milieu Défensif en U16. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0016-0007-0000-000000000079', 'Othmane', 'El Amrani', '2010-05-20', 'Casablanca', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 173, 65, 'U16',
    'Olympique Safi U16', 20, 3, 9,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Casablanca', 'Olympique Safi U16 vs FUS U16',
    'high', 79, 'Joueur Titulaire N°1 au poste de Milieu Central Droit en U16. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0016-0007-0000-000000000080', 'Bilal', 'Tahiri', '2010-06-03', 'Fès', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 170, 62, 'U16',
    'Union Touarga Sport U16', 21, 4, 10,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Fès', 'Union Touarga Sport U16 vs FUS U16',
    'medium', 82, 'Joueur Doublure N°2 au poste de Milieu Central Droit en U16. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0016-0008-0000-000000000081', 'Zakaria', 'Zouheir', '2010-07-26', 'Marrakech', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 172, 64, 'U16',
    'Union Sportive Témara U16', 22, 5, 11,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Marrakech', 'Union Sportive Témara U16 vs FUS U16',
    'very_high', 93, 'Joueur Titulaire N°1 au poste de Milieu Central Gauche en U16. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0016-0008-0000-000000000082', 'Nassim', 'El Khayati', '2010-08-09', 'Tanger', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 169, 61, 'U16',
    'AS FAR Jeunes U16', 23, 6, 12,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Tanger', 'AS FAR Jeunes U16 vs FUS U16',
    'medium', 76, 'Joueur Doublure N°2 au poste de Milieu Central Gauche en U16. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0016-0009-0000-000000000083', 'Youssef', 'El Asbahi', '2010-09-05', 'Tétouan', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 172, 63, 'U16',
    'Wydad AC Jeunes U16', 24, 7, 5,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Tétouan', 'Wydad AC Jeunes U16 vs FUS U16',
    'high', 87, 'Joueur Titulaire N°1 au poste de Ailier Droit en U16. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0016-0009-0000-000000000084', 'Walid', 'Berrada', '2010-10-15', 'Agadir', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 169, 60, 'U16',
    'MAS Fès U16', 25, 8, 6,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Agadir', 'MAS Fès U16 vs FUS U16',
    'medium', 90, 'Joueur Doublure N°2 au poste de Ailier Droit en U16. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0016-0010-0000-000000000085', 'Amine', 'Belammari', '2010-11-11', 'Berkane', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 179, 71, 'U16',
    'Kawkab Marrakech U16', 12, 17, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Berkane', 'Kawkab Marrakech U16 vs FUS U16',
    'high', 81, 'Joueur Titulaire N°1 au poste de Avant-Centre en U16. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0016-0010-0000-000000000086', 'Taha', 'El Mourabit', '2010-12-21', 'Mohammedia', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 176, 68, 'U16',
    'Ittihad Tanger U16', 13, 18, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Mohammedia', 'Ittihad Tanger U16 vs FUS U16',
    'medium', 84, 'Joueur Doublure N°2 au poste de Avant-Centre en U16. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0016-0011-0000-000000000087', 'Anas', 'Chraibi', '2010-01-17', 'Rabat', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 171, 62, 'U16',
    'Olympique Safi U16', 14, 11, 9,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Rabat', 'Olympique Safi U16 vs FUS U16',
    'very_high', 95, 'Joueur Titulaire N°1 au poste de Ailier Gauche en U16. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0016-0011-0000-000000000088', 'Badr', 'Regragui', '2010-02-27', 'Salé', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 168, 59, 'U16',
    'Union Touarga Sport U16', 15, 12, 10,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Salé', 'Union Touarga Sport U16 vs FUS U16',
    'medium', 78, 'Joueur Doublure N°2 au poste de Ailier Gauche en U16. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0017-0001-0000-000000000089', 'Ziyad', 'Cherradi', '2009-06-11', 'Fès', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 180, 71, 'U17',
    'Raja Club Athletic U17', 25, 1, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Fès', 'Raja Club Athletic U17 vs FUS U17',
    'high', 98, 'Joueur Titulaire N°1 au poste de Gardien de But en U17. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0017-0001-0000-000000000090', 'Reda', 'Boukhalfa', '2009-07-21', 'Marrakech', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 177, 68, 'U17',
    'Académie Mohammed VI Football U17', 12, 2, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Marrakech', 'Académie Mohammed VI Football U17 vs FUS U17',
    'medium', 81, 'Joueur Doublure N°2 au poste de Gardien de But en U17. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0017-0002-0000-000000000091', 'Sami', 'Bennis', '2009-08-17', 'Tanger', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 172, 64, 'U17',
    'Hassania Agadir U17', 13, 0, 6,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Tanger', 'Hassania Agadir U17 vs FUS U17',
    'very_high', 92, 'Joueur Titulaire N°1 au poste de Latéral Droit en U17. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0017-0002-0000-000000000092', 'Ayman', 'Zerouali', '2009-09-27', 'Tétouan', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 169, 61, 'U17',
    'Moghreb Tétouan U17', 14, 1, 7,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Tétouan', 'Moghreb Tétouan U17 vs FUS U17',
    'medium', 75, 'Joueur Doublure N°2 au poste de Latéral Droit en U17. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0017-0003-0000-000000000093', 'Yassine', 'Rahimi', '2009-10-23', 'Agadir', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 182, 74, 'U17',
    'Chabab Mohammedia U17', 15, 2, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Agadir', 'Chabab Mohammedia U17 vs FUS U17',
    'high', 86, 'Joueur Titulaire N°1 au poste de Défenseur Central Droit en U17. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0017-0003-0000-000000000094', 'Marouane', 'Aboukhlal', '2009-11-06', 'Berkane', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 179, 71, 'U17',
    'FUS Rabat Académie U17', 16, 0, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Berkane', 'FUS Rabat Académie U17 vs FUS U17',
    'medium', 89, 'Joueur Doublure N°2 au poste de Défenseur Central Droit en U17. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0017-0004-0000-000000000095', 'Adam', 'En-Nesyri', '2009-12-02', 'Mohammedia', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 181, 73, 'U17',
    'KAC Kénitra U17', 17, 1, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Mohammedia', 'KAC Kénitra U17 vs FUS U17',
    'high', 80, 'Joueur Titulaire N°1 au poste de Défenseur Central Gauche en U17. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0017-0004-0000-000000000096', 'Soufiane', 'Bellarabi', '2009-01-12', 'Rabat', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 178, 70, 'U17',
    'RS Berkane Académie U17', 18, 2, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Rabat', 'RS Berkane Académie U17 vs FUS U17',
    'medium', 83, 'Joueur Doublure N°2 au poste de Défenseur Central Gauche en U17. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0017-0005-0000-000000000097', 'Rayane', 'Boukhriss', '2009-02-08', 'Salé', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 171, 63, 'U17',
    'Raja Club Athletic U17', 19, 0, 7,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Salé', 'Raja Club Athletic U17 vs FUS U17',
    'very_high', 94, 'Joueur Titulaire N°1 au poste de Latéral Gauche en U17. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0017-0005-0000-000000000098', 'Mehdi', 'Haddad', '2009-03-18', 'Témara', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 168, 60, 'U17',
    'Académie Mohammed VI Football U17', 20, 1, 3,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Témara', 'Académie Mohammed VI Football U17 vs FUS U17',
    'medium', 77, 'Joueur Doublure N°2 au poste de Latéral Gauche en U17. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0017-0006-0000-000000000099', 'Hamza', 'Mansouri', '2009-04-14', 'Kénitra', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 176, 69, 'U17',
    'Hassania Agadir U17', 21, 7, 7,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Kénitra', 'Hassania Agadir U17 vs FUS U17',
    'high', 88, 'Joueur Titulaire N°1 au poste de Milieu Défensif en U17. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0017-0006-0000-000000000100', 'Ismail', 'El Amrani', '2009-05-24', 'Casablanca', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 173, 66, 'U17',
    'Moghreb Tétouan U17', 22, 2, 8,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Casablanca', 'Moghreb Tétouan U17 vs FUS U17',
    'medium', 91, 'Joueur Doublure N°2 au poste de Milieu Défensif en U17. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0017-0007-0000-000000000101', 'Othmane', 'Tahiri', '2009-06-20', 'Fès', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 174, 67, 'U17',
    'Chabab Mohammedia U17', 23, 3, 9,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Fès', 'Chabab Mohammedia U17 vs FUS U17',
    'high', 82, 'Joueur Titulaire N°1 au poste de Milieu Central Droit en U17. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0017-0007-0000-000000000102', 'Bilal', 'Zouheir', '2009-07-03', 'Marrakech', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 171, 64, 'U17',
    'FUS Rabat Académie U17', 24, 4, 10,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Marrakech', 'FUS Rabat Académie U17 vs FUS U17',
    'medium', 85, 'Joueur Doublure N°2 au poste de Milieu Central Droit en U17. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0017-0008-0000-000000000103', 'Zakaria', 'El Khayati', '2009-08-26', 'Tanger', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 173, 66, 'U17',
    'KAC Kénitra U17', 25, 5, 11,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Tanger', 'KAC Kénitra U17 vs FUS U17',
    'very_high', 96, 'Joueur Titulaire N°1 au poste de Milieu Central Gauche en U17. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0017-0008-0000-000000000104', 'Nassim', 'El Asbahi', '2009-09-09', 'Tétouan', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 170, 63, 'U17',
    'RS Berkane Académie U17', 12, 6, 12,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Tétouan', 'RS Berkane Académie U17 vs FUS U17',
    'medium', 79, 'Joueur Doublure N°2 au poste de Milieu Central Gauche en U17. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0017-0009-0000-000000000105', 'Youssef', 'Berrada', '2009-10-05', 'Agadir', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 173, 65, 'U17',
    'Raja Club Athletic U17', 13, 7, 5,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Agadir', 'Raja Club Athletic U17 vs FUS U17',
    'high', 90, 'Joueur Titulaire N°1 au poste de Ailier Droit en U17. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0017-0009-0000-000000000106', 'Walid', 'Belammari', '2009-11-15', 'Berkane', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 170, 62, 'U17',
    'Académie Mohammed VI Football U17', 14, 8, 6,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Berkane', 'Académie Mohammed VI Football U17 vs FUS U17',
    'medium', 93, 'Joueur Doublure N°2 au poste de Ailier Droit en U17. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0017-0010-0000-000000000107', 'Amine', 'El Mourabit', '2009-12-11', 'Mohammedia', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 180, 73, 'U17',
    'Hassania Agadir U17', 15, 17, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Mohammedia', 'Hassania Agadir U17 vs FUS U17',
    'high', 84, 'Joueur Titulaire N°1 au poste de Avant-Centre en U17. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0017-0010-0000-000000000108', 'Taha', 'Chraibi', '2009-01-21', 'Rabat', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 177, 70, 'U17',
    'Moghreb Tétouan U17', 16, 18, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Rabat', 'Moghreb Tétouan U17 vs FUS U17',
    'medium', 87, 'Joueur Doublure N°2 au poste de Avant-Centre en U17. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0017-0011-0000-000000000109', 'Anas', 'Regragui', '2009-02-17', 'Salé', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 172, 64, 'U17',
    'Chabab Mohammedia U17', 17, 11, 9,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Salé', 'Chabab Mohammedia U17 vs FUS U17',
    'very_high', 98, 'Joueur Titulaire N°1 au poste de Ailier Gauche en U17. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0017-0011-0000-000000000110', 'Badr', 'Benjelloun', '2009-03-27', 'Témara', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 169, 61, 'U17',
    'FUS Rabat Académie U17', 18, 12, 10,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Témara', 'FUS Rabat Académie U17 vs FUS U17',
    'medium', 81, 'Joueur Doublure N°2 au poste de Ailier Gauche en U17. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0018-0001-0000-000000000111', 'Ziyad', 'Boukhalfa', '2008-07-11', 'Marrakech', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 182, 73, 'U18',
    'MAS Fès U18', 14, 1, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Marrakech', 'MAS Fès U18 vs FUS U18',
    'high', 81, 'Joueur Titulaire N°1 au poste de Gardien de But en U18. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0018-0001-0000-000000000112', 'Reda', 'Bennis', '2008-08-21', 'Tanger', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 179, 70, 'U18',
    'Kawkab Marrakech U18', 15, 2, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Tanger', 'Kawkab Marrakech U18 vs FUS U18',
    'medium', 84, 'Joueur Doublure N°2 au poste de Gardien de But en U18. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0018-0002-0000-000000000113', 'Sami', 'Zerouali', '2008-09-17', 'Tétouan', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 174, 66, 'U18',
    'Ittihad Tanger U18', 16, 0, 6,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Tétouan', 'Ittihad Tanger U18 vs FUS U18',
    'very_high', 95, 'Joueur Titulaire N°1 au poste de Latéral Droit en U18. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0018-0002-0000-000000000114', 'Ayman', 'Rahimi', '2008-10-27', 'Agadir', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 171, 63, 'U18',
    'Olympique Safi U18', 17, 1, 7,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Agadir', 'Olympique Safi U18 vs FUS U18',
    'medium', 78, 'Joueur Doublure N°2 au poste de Latéral Droit en U18. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0018-0003-0000-000000000115', 'Yassine', 'Aboukhlal', '2008-11-23', 'Berkane', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 184, 76, 'U18',
    'Union Touarga Sport U18', 18, 2, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Berkane', 'Union Touarga Sport U18 vs FUS U18',
    'high', 89, 'Joueur Titulaire N°1 au poste de Défenseur Central Droit en U18. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0018-0003-0000-000000000116', 'Marouane', 'En-Nesyri', '2008-12-06', 'Mohammedia', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 181, 73, 'U18',
    'Union Sportive Témara U18', 19, 0, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Mohammedia', 'Union Sportive Témara U18 vs FUS U18',
    'medium', 92, 'Joueur Doublure N°2 au poste de Défenseur Central Droit en U18. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0018-0004-0000-000000000117', 'Adam', 'Bellarabi', '2008-01-02', 'Rabat', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 183, 75, 'U18',
    'AS FAR Jeunes U18', 20, 1, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Rabat', 'AS FAR Jeunes U18 vs FUS U18',
    'high', 83, 'Joueur Titulaire N°1 au poste de Défenseur Central Gauche en U18. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0018-0004-0000-000000000118', 'Soufiane', 'Boukhriss', '2008-02-12', 'Salé', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 180, 72, 'U18',
    'Wydad AC Jeunes U18', 21, 2, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Salé', 'Wydad AC Jeunes U18 vs FUS U18',
    'medium', 86, 'Joueur Doublure N°2 au poste de Défenseur Central Gauche en U18. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0018-0005-0000-000000000119', 'Rayane', 'Haddad', '2008-03-08', 'Témara', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 173, 65, 'U18',
    'MAS Fès U18', 22, 0, 7,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Témara', 'MAS Fès U18 vs FUS U18',
    'very_high', 97, 'Joueur Titulaire N°1 au poste de Latéral Gauche en U18. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0018-0005-0000-000000000120', 'Mehdi', 'Mansouri', '2008-04-18', 'Kénitra', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 170, 62, 'U18',
    'Kawkab Marrakech U18', 23, 1, 3,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Kénitra', 'Kawkab Marrakech U18 vs FUS U18',
    'medium', 80, 'Joueur Doublure N°2 au poste de Latéral Gauche en U18. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0018-0006-0000-000000000121', 'Hamza', 'El Amrani', '2008-05-14', 'Casablanca', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 178, 71, 'U18',
    'Ittihad Tanger U18', 24, 7, 7,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Casablanca', 'Ittihad Tanger U18 vs FUS U18',
    'high', 91, 'Joueur Titulaire N°1 au poste de Milieu Défensif en U18. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0018-0006-0000-000000000122', 'Ismail', 'Tahiri', '2008-06-24', 'Fès', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 175, 68, 'U18',
    'Olympique Safi U18', 25, 2, 8,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Fès', 'Olympique Safi U18 vs FUS U18',
    'medium', 94, 'Joueur Doublure N°2 au poste de Milieu Défensif en U18. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0018-0007-0000-000000000123', 'Othmane', 'Zouheir', '2008-07-20', 'Marrakech', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 176, 69, 'U18',
    'Union Touarga Sport U18', 12, 3, 9,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Marrakech', 'Union Touarga Sport U18 vs FUS U18',
    'high', 85, 'Joueur Titulaire N°1 au poste de Milieu Central Droit en U18. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0018-0007-0000-000000000124', 'Bilal', 'El Khayati', '2008-08-03', 'Tanger', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 173, 66, 'U18',
    'Union Sportive Témara U18', 13, 4, 10,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Tanger', 'Union Sportive Témara U18 vs FUS U18',
    'medium', 88, 'Joueur Doublure N°2 au poste de Milieu Central Droit en U18. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0018-0008-0000-000000000125', 'Zakaria', 'El Asbahi', '2008-09-26', 'Tétouan', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 175, 68, 'U18',
    'AS FAR Jeunes U18', 14, 5, 11,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Tétouan', 'AS FAR Jeunes U18 vs FUS U18',
    'very_high', 79, 'Joueur Titulaire N°1 au poste de Milieu Central Gauche en U18. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0018-0008-0000-000000000126', 'Nassim', 'Berrada', '2008-10-09', 'Agadir', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 172, 65, 'U18',
    'Wydad AC Jeunes U18', 15, 6, 12,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Agadir', 'Wydad AC Jeunes U18 vs FUS U18',
    'medium', 82, 'Joueur Doublure N°2 au poste de Milieu Central Gauche en U18. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0018-0009-0000-000000000127', 'Youssef', 'Belammari', '2008-11-05', 'Berkane', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 175, 67, 'U18',
    'MAS Fès U18', 16, 7, 5,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Berkane', 'MAS Fès U18 vs FUS U18',
    'high', 93, 'Joueur Titulaire N°1 au poste de Ailier Droit en U18. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0018-0009-0000-000000000128', 'Walid', 'El Mourabit', '2008-12-15', 'Mohammedia', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 172, 64, 'U18',
    'Kawkab Marrakech U18', 17, 8, 6,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Mohammedia', 'Kawkab Marrakech U18 vs FUS U18',
    'medium', 76, 'Joueur Doublure N°2 au poste de Ailier Droit en U18. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0018-0010-0000-000000000129', 'Amine', 'Chraibi', '2008-01-11', 'Rabat', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 182, 75, 'U18',
    'Ittihad Tanger U18', 18, 17, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Rabat', 'Ittihad Tanger U18 vs FUS U18',
    'high', 87, 'Joueur Titulaire N°1 au poste de Avant-Centre en U18. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0018-0010-0000-000000000130', 'Taha', 'Regragui', '2008-02-21', 'Salé', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 179, 72, 'U18',
    'Olympique Safi U18', 19, 18, 1,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Salé', 'Olympique Safi U18 vs FUS U18',
    'medium', 90, 'Joueur Doublure N°2 au poste de Avant-Centre en U18. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0018-0011-0000-000000000131', 'Anas', 'Benjelloun', '2008-03-17', 'Témara', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 174, 66, 'U18',
    'Union Touarga Sport U18', 20, 11, 9,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Témara', 'Union Touarga Sport U18 vs FUS U18',
    'very_high', 81, 'Joueur Titulaire N°1 au poste de Ailier Gauche en U18. Détecté par Tarik Sektioui.',
    'shortlist', 'registered'
),
(
    'c0000000-0018-0011-0000-000000000132', 'Badr', 'Cherradi', '2008-04-27', 'Kénitra', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 171, 63, 'U18',
    'Union Sportive Témara U18', 21, 12, 10,
    'a0000000-0000-0000-0000-000000000002', 'Tarik Sektioui', NULL, 'Tarik Sektioui',
    'Stade Municipal Kénitra', 'Union Sportive Témara U18 vs FUS U18',
    'medium', 84, 'Joueur Doublure N°2 au poste de Ailier Gauche en U18. Détecté par Tarik Sektioui.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0019-0001-0000-000000000133', 'Ziyad', 'Bennis', '2007-08-11', 'Tanger', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 183, 75, 'U19',
    'Académie Mohammed VI Football U19', 17, 1, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Tanger', 'Académie Mohammed VI Football U19 vs FUS U19',
    'high', 84, 'Joueur Titulaire N°1 au poste de Gardien de But en U19. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0019-0001-0000-000000000134', 'Reda', 'Zerouali', '2007-09-21', 'Tétouan', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 180, 72, 'U19',
    'Hassania Agadir U19', 18, 2, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Tétouan', 'Hassania Agadir U19 vs FUS U19',
    'medium', 87, 'Joueur Doublure N°2 au poste de Gardien de But en U19. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0019-0002-0000-000000000135', 'Sami', 'Rahimi', '2007-10-17', 'Agadir', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 175, 68, 'U19',
    'Moghreb Tétouan U19', 19, 0, 6,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Agadir', 'Moghreb Tétouan U19 vs FUS U19',
    'very_high', 98, 'Joueur Titulaire N°1 au poste de Latéral Droit en U19. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0019-0002-0000-000000000136', 'Ayman', 'Aboukhlal', '2007-11-27', 'Berkane', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 172, 65, 'U19',
    'Chabab Mohammedia U19', 20, 1, 7,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Berkane', 'Chabab Mohammedia U19 vs FUS U19',
    'medium', 81, 'Joueur Doublure N°2 au poste de Latéral Droit en U19. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0019-0003-0000-000000000137', 'Yassine', 'En-Nesyri', '2007-12-23', 'Mohammedia', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 185, 78, 'U19',
    'FUS Rabat Académie U19', 21, 2, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Mohammedia', 'FUS Rabat Académie U19 vs FUS U19',
    'high', 92, 'Joueur Titulaire N°1 au poste de Défenseur Central Droit en U19. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0019-0003-0000-000000000138', 'Marouane', 'Bellarabi', '2007-01-06', 'Rabat', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 182, 75, 'U19',
    'KAC Kénitra U19', 22, 0, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Rabat', 'KAC Kénitra U19 vs FUS U19',
    'medium', 75, 'Joueur Doublure N°2 au poste de Défenseur Central Droit en U19. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0019-0004-0000-000000000139', 'Adam', 'Boukhriss', '2007-02-02', 'Salé', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 184, 77, 'U19',
    'RS Berkane Académie U19', 23, 1, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Salé', 'RS Berkane Académie U19 vs FUS U19',
    'high', 86, 'Joueur Titulaire N°1 au poste de Défenseur Central Gauche en U19. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0019-0004-0000-000000000140', 'Soufiane', 'Haddad', '2007-03-12', 'Témara', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 181, 74, 'U19',
    'Raja Club Athletic U19', 24, 2, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Témara', 'Raja Club Athletic U19 vs FUS U19',
    'medium', 89, 'Joueur Doublure N°2 au poste de Défenseur Central Gauche en U19. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0019-0005-0000-000000000141', 'Rayane', 'Mansouri', '2007-04-08', 'Kénitra', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 174, 67, 'U19',
    'Académie Mohammed VI Football U19', 25, 0, 7,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Kénitra', 'Académie Mohammed VI Football U19 vs FUS U19',
    'very_high', 80, 'Joueur Titulaire N°1 au poste de Latéral Gauche en U19. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0019-0005-0000-000000000142', 'Mehdi', 'El Amrani', '2007-05-18', 'Casablanca', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 171, 64, 'U19',
    'Hassania Agadir U19', 12, 1, 3,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Casablanca', 'Hassania Agadir U19 vs FUS U19',
    'medium', 83, 'Joueur Doublure N°2 au poste de Latéral Gauche en U19. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0019-0006-0000-000000000143', 'Hamza', 'Tahiri', '2007-06-14', 'Fès', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 179, 73, 'U19',
    'Moghreb Tétouan U19', 13, 7, 7,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Fès', 'Moghreb Tétouan U19 vs FUS U19',
    'high', 94, 'Joueur Titulaire N°1 au poste de Milieu Défensif en U19. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0019-0006-0000-000000000144', 'Ismail', 'Zouheir', '2007-07-24', 'Marrakech', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 176, 70, 'U19',
    'Chabab Mohammedia U19', 14, 2, 8,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Marrakech', 'Chabab Mohammedia U19 vs FUS U19',
    'medium', 77, 'Joueur Doublure N°2 au poste de Milieu Défensif en U19. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0019-0007-0000-000000000145', 'Othmane', 'El Khayati', '2007-08-20', 'Tanger', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 177, 71, 'U19',
    'FUS Rabat Académie U19', 15, 3, 9,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Tanger', 'FUS Rabat Académie U19 vs FUS U19',
    'high', 88, 'Joueur Titulaire N°1 au poste de Milieu Central Droit en U19. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0019-0007-0000-000000000146', 'Bilal', 'El Asbahi', '2007-09-03', 'Tétouan', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 174, 68, 'U19',
    'KAC Kénitra U19', 16, 4, 10,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Tétouan', 'KAC Kénitra U19 vs FUS U19',
    'medium', 91, 'Joueur Doublure N°2 au poste de Milieu Central Droit en U19. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0019-0008-0000-000000000147', 'Zakaria', 'Berrada', '2007-10-26', 'Agadir', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 176, 70, 'U19',
    'RS Berkane Académie U19', 17, 5, 11,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Agadir', 'RS Berkane Académie U19 vs FUS U19',
    'very_high', 82, 'Joueur Titulaire N°1 au poste de Milieu Central Gauche en U19. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0019-0008-0000-000000000148', 'Nassim', 'Belammari', '2007-11-09', 'Berkane', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 173, 67, 'U19',
    'Raja Club Athletic U19', 18, 6, 12,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Berkane', 'Raja Club Athletic U19 vs FUS U19',
    'medium', 85, 'Joueur Doublure N°2 au poste de Milieu Central Gauche en U19. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0019-0009-0000-000000000149', 'Youssef', 'El Mourabit', '2007-12-05', 'Mohammedia', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 176, 69, 'U19',
    'Académie Mohammed VI Football U19', 19, 7, 5,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Mohammedia', 'Académie Mohammed VI Football U19 vs FUS U19',
    'high', 96, 'Joueur Titulaire N°1 au poste de Ailier Droit en U19. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0019-0009-0000-000000000150', 'Walid', 'Chraibi', '2007-01-15', 'Rabat', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 173, 66, 'U19',
    'Hassania Agadir U19', 20, 8, 6,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Rabat', 'Hassania Agadir U19 vs FUS U19',
    'medium', 79, 'Joueur Doublure N°2 au poste de Ailier Droit en U19. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0019-0010-0000-000000000151', 'Amine', 'Regragui', '2007-02-11', 'Salé', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 183, 77, 'U19',
    'Moghreb Tétouan U19', 21, 17, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Salé', 'Moghreb Tétouan U19 vs FUS U19',
    'high', 90, 'Joueur Titulaire N°1 au poste de Avant-Centre en U19. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0019-0010-0000-000000000152', 'Taha', 'Benjelloun', '2007-03-21', 'Témara', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 180, 74, 'U19',
    'Chabab Mohammedia U19', 22, 18, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Témara', 'Chabab Mohammedia U19 vs FUS U19',
    'medium', 93, 'Joueur Doublure N°2 au poste de Avant-Centre en U19. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0019-0011-0000-000000000153', 'Anas', 'Cherradi', '2007-04-17', 'Kénitra', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 175, 68, 'U19',
    'FUS Rabat Académie U19', 23, 11, 9,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Kénitra', 'FUS Rabat Académie U19 vs FUS U19',
    'very_high', 84, 'Joueur Titulaire N°1 au poste de Ailier Gauche en U19. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0019-0011-0000-000000000154', 'Badr', 'Boukhalfa', '2007-05-27', 'Casablanca', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 172, 65, 'U19',
    'KAC Kénitra U19', 24, 12, 10,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Casablanca', 'KAC Kénitra U19 vs FUS U19',
    'medium', 87, 'Joueur Doublure N°2 au poste de Ailier Gauche en U19. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0020-0001-0000-000000000155', 'Ziyad', 'Zerouali', '2006-09-11', 'Tétouan', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 185, 77, 'U20',
    'Kawkab Marrakech U20', 20, 1, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Tétouan', 'Kawkab Marrakech U20 vs FUS U20',
    'high', 87, 'Joueur Titulaire N°1 au poste de Gardien de But en U20. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0020-0001-0000-000000000156', 'Reda', 'Rahimi', '2006-10-21', 'Agadir', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 182, 74, 'U20',
    'Ittihad Tanger U20', 21, 2, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Agadir', 'Ittihad Tanger U20 vs FUS U20',
    'medium', 90, 'Joueur Doublure N°2 au poste de Gardien de But en U20. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0020-0002-0000-000000000157', 'Sami', 'Aboukhlal', '2006-11-17', 'Berkane', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 177, 70, 'U20',
    'Olympique Safi U20', 22, 0, 6,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Berkane', 'Olympique Safi U20 vs FUS U20',
    'very_high', 81, 'Joueur Titulaire N°1 au poste de Latéral Droit en U20. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0020-0002-0000-000000000158', 'Ayman', 'En-Nesyri', '2006-12-27', 'Mohammedia', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 174, 67, 'U20',
    'Union Touarga Sport U20', 23, 1, 7,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Mohammedia', 'Union Touarga Sport U20 vs FUS U20',
    'medium', 84, 'Joueur Doublure N°2 au poste de Latéral Droit en U20. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0020-0003-0000-000000000159', 'Yassine', 'Bellarabi', '2006-01-23', 'Rabat', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 187, 80, 'U20',
    'Union Sportive Témara U20', 24, 2, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Rabat', 'Union Sportive Témara U20 vs FUS U20',
    'high', 95, 'Joueur Titulaire N°1 au poste de Défenseur Central Droit en U20. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0020-0003-0000-000000000160', 'Marouane', 'Boukhriss', '2006-02-06', 'Salé', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 184, 77, 'U20',
    'AS FAR Jeunes U20', 25, 0, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Salé', 'AS FAR Jeunes U20 vs FUS U20',
    'medium', 78, 'Joueur Doublure N°2 au poste de Défenseur Central Droit en U20. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0020-0004-0000-000000000161', 'Adam', 'Haddad', '2006-03-02', 'Témara', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 186, 79, 'U20',
    'Wydad AC Jeunes U20', 12, 1, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Témara', 'Wydad AC Jeunes U20 vs FUS U20',
    'high', 89, 'Joueur Titulaire N°1 au poste de Défenseur Central Gauche en U20. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0020-0004-0000-000000000162', 'Soufiane', 'Mansouri', '2006-04-12', 'Kénitra', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 183, 76, 'U20',
    'MAS Fès U20', 13, 2, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Kénitra', 'MAS Fès U20 vs FUS U20',
    'medium', 92, 'Joueur Doublure N°2 au poste de Défenseur Central Gauche en U20. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0020-0005-0000-000000000163', 'Rayane', 'El Amrani', '2006-05-08', 'Casablanca', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 176, 69, 'U20',
    'Kawkab Marrakech U20', 14, 0, 7,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Casablanca', 'Kawkab Marrakech U20 vs FUS U20',
    'very_high', 83, 'Joueur Titulaire N°1 au poste de Latéral Gauche en U20. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0020-0005-0000-000000000164', 'Mehdi', 'Tahiri', '2006-06-18', 'Fès', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 173, 66, 'U20',
    'Ittihad Tanger U20', 15, 1, 3,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Fès', 'Ittihad Tanger U20 vs FUS U20',
    'medium', 86, 'Joueur Doublure N°2 au poste de Latéral Gauche en U20. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0020-0006-0000-000000000165', 'Hamza', 'Zouheir', '2006-07-14', 'Marrakech', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 181, 75, 'U20',
    'Olympique Safi U20', 16, 7, 7,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Marrakech', 'Olympique Safi U20 vs FUS U20',
    'high', 97, 'Joueur Titulaire N°1 au poste de Milieu Défensif en U20. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0020-0006-0000-000000000166', 'Ismail', 'El Khayati', '2006-08-24', 'Tanger', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 178, 72, 'U20',
    'Union Touarga Sport U20', 17, 2, 8,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Tanger', 'Union Touarga Sport U20 vs FUS U20',
    'medium', 80, 'Joueur Doublure N°2 au poste de Milieu Défensif en U20. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0020-0007-0000-000000000167', 'Othmane', 'El Asbahi', '2006-09-20', 'Tétouan', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 179, 73, 'U20',
    'Union Sportive Témara U20', 18, 3, 9,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Tétouan', 'Union Sportive Témara U20 vs FUS U20',
    'high', 91, 'Joueur Titulaire N°1 au poste de Milieu Central Droit en U20. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0020-0007-0000-000000000168', 'Bilal', 'Berrada', '2006-10-03', 'Agadir', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 176, 70, 'U20',
    'AS FAR Jeunes U20', 19, 4, 10,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Agadir', 'AS FAR Jeunes U20 vs FUS U20',
    'medium', 94, 'Joueur Doublure N°2 au poste de Milieu Central Droit en U20. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0020-0008-0000-000000000169', 'Zakaria', 'Belammari', '2006-11-26', 'Berkane', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 178, 72, 'U20',
    'Wydad AC Jeunes U20', 20, 5, 11,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Berkane', 'Wydad AC Jeunes U20 vs FUS U20',
    'very_high', 85, 'Joueur Titulaire N°1 au poste de Milieu Central Gauche en U20. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0020-0008-0000-000000000170', 'Nassim', 'El Mourabit', '2006-12-09', 'Mohammedia', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 175, 69, 'U20',
    'MAS Fès U20', 21, 6, 12,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Mohammedia', 'MAS Fès U20 vs FUS U20',
    'medium', 88, 'Joueur Doublure N°2 au poste de Milieu Central Gauche en U20. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0020-0009-0000-000000000171', 'Youssef', 'Chraibi', '2006-01-05', 'Rabat', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 178, 71, 'U20',
    'Kawkab Marrakech U20', 22, 7, 5,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Rabat', 'Kawkab Marrakech U20 vs FUS U20',
    'high', 79, 'Joueur Titulaire N°1 au poste de Ailier Droit en U20. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0020-0009-0000-000000000172', 'Walid', 'Regragui', '2006-02-15', 'Salé', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 175, 68, 'U20',
    'Ittihad Tanger U20', 23, 8, 6,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Salé', 'Ittihad Tanger U20 vs FUS U20',
    'medium', 82, 'Joueur Doublure N°2 au poste de Ailier Droit en U20. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0020-0010-0000-000000000173', 'Amine', 'Benjelloun', '2006-03-11', 'Témara', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 185, 79, 'U20',
    'Olympique Safi U20', 24, 17, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Témara', 'Olympique Safi U20 vs FUS U20',
    'high', 93, 'Joueur Titulaire N°1 au poste de Avant-Centre en U20. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0020-0010-0000-000000000174', 'Taha', 'Cherradi', '2006-04-21', 'Kénitra', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 182, 76, 'U20',
    'Union Touarga Sport U20', 25, 18, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Kénitra', 'Union Touarga Sport U20 vs FUS U20',
    'medium', 76, 'Joueur Doublure N°2 au poste de Avant-Centre en U20. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0020-0011-0000-000000000175', 'Anas', 'Boukhalfa', '2006-05-17', 'Casablanca', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 177, 70, 'U20',
    'Union Sportive Témara U20', 12, 11, 9,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Casablanca', 'Union Sportive Témara U20 vs FUS U20',
    'very_high', 87, 'Joueur Titulaire N°1 au poste de Ailier Gauche en U20. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0020-0011-0000-000000000176', 'Badr', 'Bennis', '2006-06-27', 'Fès', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 174, 67, 'U20',
    'AS FAR Jeunes U20', 13, 12, 10,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Fès', 'AS FAR Jeunes U20 vs FUS U20',
    'medium', 90, 'Joueur Doublure N°2 au poste de Ailier Gauche en U20. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0021-0001-0000-000000000177', 'Ziyad', 'Rahimi', '2005-10-11', 'Agadir', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 186, 78, 'U21',
    'Hassania Agadir U21', 23, 1, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Agadir', 'Hassania Agadir U21 vs FUS U21',
    'high', 90, 'Joueur Titulaire N°1 au poste de Gardien de But en U21. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0021-0001-0000-000000000178', 'Reda', 'Aboukhlal', '2005-11-21', 'Berkane', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 183, 75, 'U21',
    'Moghreb Tétouan U21', 24, 2, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Berkane', 'Moghreb Tétouan U21 vs FUS U21',
    'medium', 93, 'Joueur Doublure N°2 au poste de Gardien de But en U21. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0021-0002-0000-000000000179', 'Sami', 'En-Nesyri', '2005-12-17', 'Mohammedia', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 178, 71, 'U21',
    'Chabab Mohammedia U21', 25, 0, 6,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Mohammedia', 'Chabab Mohammedia U21 vs FUS U21',
    'very_high', 84, 'Joueur Titulaire N°1 au poste de Latéral Droit en U21. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0021-0002-0000-000000000180', 'Ayman', 'Bellarabi', '2005-01-27', 'Rabat', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 175, 68, 'U21',
    'FUS Rabat Académie U21', 12, 1, 7,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Rabat', 'FUS Rabat Académie U21 vs FUS U21',
    'medium', 87, 'Joueur Doublure N°2 au poste de Latéral Droit en U21. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0021-0003-0000-000000000181', 'Yassine', 'Boukhriss', '2005-02-23', 'Salé', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 188, 81, 'U21',
    'KAC Kénitra U21', 13, 2, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Salé', 'KAC Kénitra U21 vs FUS U21',
    'high', 98, 'Joueur Titulaire N°1 au poste de Défenseur Central Droit en U21. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0021-0003-0000-000000000182', 'Marouane', 'Haddad', '2005-03-06', 'Témara', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 185, 78, 'U21',
    'RS Berkane Académie U21', 14, 0, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Témara', 'RS Berkane Académie U21 vs FUS U21',
    'medium', 81, 'Joueur Doublure N°2 au poste de Défenseur Central Droit en U21. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0021-0004-0000-000000000183', 'Adam', 'Mansouri', '2005-04-02', 'Kénitra', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 187, 80, 'U21',
    'Raja Club Athletic U21', 15, 1, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Kénitra', 'Raja Club Athletic U21 vs FUS U21',
    'high', 92, 'Joueur Titulaire N°1 au poste de Défenseur Central Gauche en U21. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0021-0004-0000-000000000184', 'Soufiane', 'El Amrani', '2005-05-12', 'Casablanca', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 184, 77, 'U21',
    'Académie Mohammed VI Football U21', 16, 2, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Casablanca', 'Académie Mohammed VI Football U21 vs FUS U21',
    'medium', 75, 'Joueur Doublure N°2 au poste de Défenseur Central Gauche en U21. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0021-0005-0000-000000000185', 'Rayane', 'Tahiri', '2005-06-08', 'Fès', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 177, 70, 'U21',
    'Hassania Agadir U21', 17, 0, 7,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Fès', 'Hassania Agadir U21 vs FUS U21',
    'very_high', 86, 'Joueur Titulaire N°1 au poste de Latéral Gauche en U21. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0021-0005-0000-000000000186', 'Mehdi', 'Zouheir', '2005-07-18', 'Marrakech', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 174, 67, 'U21',
    'Moghreb Tétouan U21', 18, 1, 3,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Marrakech', 'Moghreb Tétouan U21 vs FUS U21',
    'medium', 89, 'Joueur Doublure N°2 au poste de Latéral Gauche en U21. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0021-0006-0000-000000000187', 'Hamza', 'El Khayati', '2005-08-14', 'Tanger', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 182, 76, 'U21',
    'Chabab Mohammedia U21', 19, 7, 7,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Tanger', 'Chabab Mohammedia U21 vs FUS U21',
    'high', 80, 'Joueur Titulaire N°1 au poste de Milieu Défensif en U21. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0021-0006-0000-000000000188', 'Ismail', 'El Asbahi', '2005-09-24', 'Tétouan', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 179, 73, 'U21',
    'FUS Rabat Académie U21', 20, 2, 8,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Tétouan', 'FUS Rabat Académie U21 vs FUS U21',
    'medium', 83, 'Joueur Doublure N°2 au poste de Milieu Défensif en U21. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0021-0007-0000-000000000189', 'Othmane', 'Berrada', '2005-10-20', 'Agadir', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 180, 74, 'U21',
    'KAC Kénitra U21', 21, 3, 9,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Agadir', 'KAC Kénitra U21 vs FUS U21',
    'high', 94, 'Joueur Titulaire N°1 au poste de Milieu Central Droit en U21. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0021-0007-0000-000000000190', 'Bilal', 'Belammari', '2005-11-03', 'Berkane', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 177, 71, 'U21',
    'RS Berkane Académie U21', 22, 4, 10,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Berkane', 'RS Berkane Académie U21 vs FUS U21',
    'medium', 77, 'Joueur Doublure N°2 au poste de Milieu Central Droit en U21. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0021-0008-0000-000000000191', 'Zakaria', 'El Mourabit', '2005-12-26', 'Mohammedia', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 179, 73, 'U21',
    'Raja Club Athletic U21', 23, 5, 11,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Mohammedia', 'Raja Club Athletic U21 vs FUS U21',
    'very_high', 88, 'Joueur Titulaire N°1 au poste de Milieu Central Gauche en U21. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0021-0008-0000-000000000192', 'Nassim', 'Chraibi', '2005-01-09', 'Rabat', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 176, 70, 'U21',
    'Académie Mohammed VI Football U21', 24, 6, 12,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Rabat', 'Académie Mohammed VI Football U21 vs FUS U21',
    'medium', 91, 'Joueur Doublure N°2 au poste de Milieu Central Gauche en U21. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0021-0009-0000-000000000193', 'Youssef', 'Regragui', '2005-02-05', 'Salé', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 179, 72, 'U21',
    'Hassania Agadir U21', 25, 7, 5,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Salé', 'Hassania Agadir U21 vs FUS U21',
    'high', 82, 'Joueur Titulaire N°1 au poste de Ailier Droit en U21. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0021-0009-0000-000000000194', 'Walid', 'Benjelloun', '2005-03-15', 'Témara', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 176, 69, 'U21',
    'Moghreb Tétouan U21', 12, 8, 6,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Témara', 'Moghreb Tétouan U21 vs FUS U21',
    'medium', 85, 'Joueur Doublure N°2 au poste de Ailier Droit en U21. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0021-0010-0000-000000000195', 'Amine', 'Cherradi', '2005-04-11', 'Kénitra', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 186, 80, 'U21',
    'Chabab Mohammedia U21', 13, 17, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Kénitra', 'Chabab Mohammedia U21 vs FUS U21',
    'high', 96, 'Joueur Titulaire N°1 au poste de Avant-Centre en U21. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0021-0010-0000-000000000196', 'Taha', 'Boukhalfa', '2005-05-21', 'Casablanca', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 183, 77, 'U21',
    'FUS Rabat Académie U21', 14, 18, 1,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Casablanca', 'FUS Rabat Académie U21 vs FUS U21',
    'medium', 79, 'Joueur Doublure N°2 au poste de Avant-Centre en U21. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0021-0011-0000-000000000197', 'Anas', 'Bennis', '2005-06-17', 'Fès', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 178, 71, 'U21',
    'KAC Kénitra U21', 15, 11, 9,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Fès', 'KAC Kénitra U21 vs FUS U21',
    'very_high', 90, 'Joueur Titulaire N°1 au poste de Ailier Gauche en U21. Détecté par Hassan Benabicha.',
    'shortlist', 'registered'
),
(
    'c0000000-0021-0011-0000-000000000198', 'Badr', 'Zerouali', '2005-07-27', 'Marrakech', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 175, 68, 'U21',
    'RS Berkane Académie U21', 16, 12, 10,
    'a0000000-0000-0000-0000-000000000003', 'Hassan Benabicha', NULL, 'Hassan Benabicha',
    'Stade Municipal Marrakech', 'RS Berkane Académie U21 vs FUS U21',
    'medium', 93, 'Joueur Doublure N°2 au poste de Ailier Gauche en U21. Détecté par Hassan Benabicha.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0022-0001-0000-000000000199', 'Ziyad', 'Aboukhlal', '2004-11-11', 'Berkane', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 188, 80, 'U22',
    'Ittihad Tanger U22', 12, 1, 1,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Berkane', 'Ittihad Tanger U22 vs FUS U22',
    'high', 93, 'Joueur Titulaire N°1 au poste de Gardien de But en U22. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0022-0001-0000-000000000200', 'Reda', 'En-Nesyri', '2004-12-21', 'Mohammedia', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 185, 77, 'U22',
    'Olympique Safi U22', 13, 2, 1,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Mohammedia', 'Olympique Safi U22 vs FUS U22',
    'medium', 76, 'Joueur Doublure N°2 au poste de Gardien de But en U22. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0022-0002-0000-000000000201', 'Sami', 'Bellarabi', '2004-01-17', 'Rabat', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 180, 73, 'U22',
    'Union Touarga Sport U22', 14, 0, 6,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Rabat', 'Union Touarga Sport U22 vs FUS U22',
    'very_high', 87, 'Joueur Titulaire N°1 au poste de Latéral Droit en U22. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0022-0002-0000-000000000202', 'Ayman', 'Boukhriss', '2004-02-27', 'Salé', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 177, 70, 'U22',
    'Union Sportive Témara U22', 15, 1, 7,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Salé', 'Union Sportive Témara U22 vs FUS U22',
    'medium', 90, 'Joueur Doublure N°2 au poste de Latéral Droit en U22. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0022-0003-0000-000000000203', 'Yassine', 'Haddad', '2004-03-23', 'Témara', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 190, 83, 'U22',
    'AS FAR Jeunes U22', 16, 2, 1,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Témara', 'AS FAR Jeunes U22 vs FUS U22',
    'high', 81, 'Joueur Titulaire N°1 au poste de Défenseur Central Droit en U22. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0022-0003-0000-000000000204', 'Marouane', 'Mansouri', '2004-04-06', 'Kénitra', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 187, 80, 'U22',
    'Wydad AC Jeunes U22', 17, 0, 1,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Kénitra', 'Wydad AC Jeunes U22 vs FUS U22',
    'medium', 84, 'Joueur Doublure N°2 au poste de Défenseur Central Droit en U22. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0022-0004-0000-000000000205', 'Adam', 'El Amrani', '2004-05-02', 'Casablanca', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 189, 82, 'U22',
    'MAS Fès U22', 18, 1, 1,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Casablanca', 'MAS Fès U22 vs FUS U22',
    'high', 95, 'Joueur Titulaire N°1 au poste de Défenseur Central Gauche en U22. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0022-0004-0000-000000000206', 'Soufiane', 'Tahiri', '2004-06-12', 'Fès', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 186, 79, 'U22',
    'Kawkab Marrakech U22', 19, 2, 1,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Fès', 'Kawkab Marrakech U22 vs FUS U22',
    'medium', 78, 'Joueur Doublure N°2 au poste de Défenseur Central Gauche en U22. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0022-0005-0000-000000000207', 'Rayane', 'Zouheir', '2004-07-08', 'Marrakech', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 179, 72, 'U22',
    'Ittihad Tanger U22', 20, 0, 7,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Marrakech', 'Ittihad Tanger U22 vs FUS U22',
    'very_high', 89, 'Joueur Titulaire N°1 au poste de Latéral Gauche en U22. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0022-0005-0000-000000000208', 'Mehdi', 'El Khayati', '2004-08-18', 'Tanger', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 176, 69, 'U22',
    'Olympique Safi U22', 21, 1, 3,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Tanger', 'Olympique Safi U22 vs FUS U22',
    'medium', 92, 'Joueur Doublure N°2 au poste de Latéral Gauche en U22. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0022-0006-0000-000000000209', 'Hamza', 'El Asbahi', '2004-09-14', 'Tétouan', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 184, 78, 'U22',
    'Union Touarga Sport U22', 22, 7, 7,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Tétouan', 'Union Touarga Sport U22 vs FUS U22',
    'high', 83, 'Joueur Titulaire N°1 au poste de Milieu Défensif en U22. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0022-0006-0000-000000000210', 'Ismail', 'Berrada', '2004-10-24', 'Agadir', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 181, 75, 'U22',
    'Union Sportive Témara U22', 23, 2, 8,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Agadir', 'Union Sportive Témara U22 vs FUS U22',
    'medium', 86, 'Joueur Doublure N°2 au poste de Milieu Défensif en U22. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0022-0007-0000-000000000211', 'Othmane', 'Belammari', '2004-11-20', 'Berkane', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 182, 76, 'U22',
    'AS FAR Jeunes U22', 24, 3, 9,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Berkane', 'AS FAR Jeunes U22 vs FUS U22',
    'high', 97, 'Joueur Titulaire N°1 au poste de Milieu Central Droit en U22. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0022-0007-0000-000000000212', 'Bilal', 'El Mourabit', '2004-12-03', 'Mohammedia', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 179, 73, 'U22',
    'Wydad AC Jeunes U22', 25, 4, 10,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Mohammedia', 'Wydad AC Jeunes U22 vs FUS U22',
    'medium', 80, 'Joueur Doublure N°2 au poste de Milieu Central Droit en U22. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0022-0008-0000-000000000213', 'Zakaria', 'Chraibi', '2004-01-26', 'Rabat', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 181, 75, 'U22',
    'MAS Fès U22', 12, 5, 11,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Rabat', 'MAS Fès U22 vs FUS U22',
    'very_high', 91, 'Joueur Titulaire N°1 au poste de Milieu Central Gauche en U22. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0022-0008-0000-000000000214', 'Nassim', 'Regragui', '2004-02-09', 'Salé', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 178, 72, 'U22',
    'Kawkab Marrakech U22', 13, 6, 12,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Salé', 'Kawkab Marrakech U22 vs FUS U22',
    'medium', 94, 'Joueur Doublure N°2 au poste de Milieu Central Gauche en U22. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0022-0009-0000-000000000215', 'Youssef', 'Benjelloun', '2004-03-05', 'Témara', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 181, 74, 'U22',
    'Ittihad Tanger U22', 14, 7, 5,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Témara', 'Ittihad Tanger U22 vs FUS U22',
    'high', 85, 'Joueur Titulaire N°1 au poste de Ailier Droit en U22. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0022-0009-0000-000000000216', 'Walid', 'Cherradi', '2004-04-15', 'Kénitra', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 178, 71, 'U22',
    'Olympique Safi U22', 15, 8, 6,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Kénitra', 'Olympique Safi U22 vs FUS U22',
    'medium', 88, 'Joueur Doublure N°2 au poste de Ailier Droit en U22. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0022-0010-0000-000000000217', 'Amine', 'Boukhalfa', '2004-05-11', 'Casablanca', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 188, 82, 'U22',
    'Union Touarga Sport U22', 16, 17, 1,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Casablanca', 'Union Touarga Sport U22 vs FUS U22',
    'high', 79, 'Joueur Titulaire N°1 au poste de Avant-Centre en U22. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0022-0010-0000-000000000218', 'Taha', 'Bennis', '2004-06-21', 'Fès', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 185, 79, 'U22',
    'Union Sportive Témara U22', 17, 18, 1,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Fès', 'Union Sportive Témara U22 vs FUS U22',
    'medium', 82, 'Joueur Doublure N°2 au poste de Avant-Centre en U22. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0022-0011-0000-000000000219', 'Anas', 'Zerouali', '2004-07-17', 'Marrakech', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 180, 73, 'U22',
    'AS FAR Jeunes U22', 18, 11, 9,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Marrakech', 'AS FAR Jeunes U22 vs FUS U22',
    'very_high', 93, 'Joueur Titulaire N°1 au poste de Ailier Gauche en U22. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0022-0011-0000-000000000220', 'Badr', 'Rahimi', '2004-08-27', 'Tanger', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 177, 70, 'U22',
    'Wydad AC Jeunes U22', 19, 12, 10,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Tanger', 'Wydad AC Jeunes U22 vs FUS U22',
    'medium', 76, 'Joueur Doublure N°2 au poste de Ailier Gauche en U22. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0023-0001-0000-000000000221', 'Ziyad', 'En-Nesyri', '2003-12-11', 'Mohammedia', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 189, 82, 'U23',
    'Moghreb Tétouan U23', 15, 1, 1,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Mohammedia', 'Moghreb Tétouan U23 vs FUS U23',
    'high', 96, 'Joueur Titulaire N°1 au poste de Gardien de But en U23. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0023-0001-0000-000000000222', 'Reda', 'Bellarabi', '2003-01-21', 'Rabat', 'Marocaine', 'Masculin',
    'Gardien de But', 'Gardien', 'Droitier', 186, 79, 'U23',
    'Chabab Mohammedia U23', 16, 2, 1,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Rabat', 'Chabab Mohammedia U23 vs FUS U23',
    'medium', 79, 'Joueur Doublure N°2 au poste de Gardien de But en U23. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0023-0002-0000-000000000223', 'Sami', 'Boukhriss', '2003-02-17', 'Salé', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 181, 75, 'U23',
    'FUS Rabat Académie U23', 17, 0, 6,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Salé', 'FUS Rabat Académie U23 vs FUS U23',
    'very_high', 90, 'Joueur Titulaire N°1 au poste de Latéral Droit en U23. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0023-0002-0000-000000000224', 'Ayman', 'Haddad', '2003-03-27', 'Témara', 'Marocaine', 'Masculin',
    'Latéral Droit', 'Piston Droit', 'Droitier', 178, 72, 'U23',
    'KAC Kénitra U23', 18, 1, 7,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Témara', 'KAC Kénitra U23 vs FUS U23',
    'medium', 93, 'Joueur Doublure N°2 au poste de Latéral Droit en U23. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0023-0003-0000-000000000225', 'Yassine', 'Mansouri', '2003-04-23', 'Kénitra', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 191, 85, 'U23',
    'RS Berkane Académie U23', 19, 2, 1,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Kénitra', 'RS Berkane Académie U23 vs FUS U23',
    'high', 84, 'Joueur Titulaire N°1 au poste de Défenseur Central Droit en U23. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0023-0003-0000-000000000226', 'Marouane', 'El Amrani', '2003-05-06', 'Casablanca', 'Marocaine', 'Masculin',
    'Défenseur Central Droit', 'Défenseur Central', 'Droitier', 188, 82, 'U23',
    'Raja Club Athletic U23', 20, 0, 1,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Casablanca', 'Raja Club Athletic U23 vs FUS U23',
    'medium', 87, 'Joueur Doublure N°2 au poste de Défenseur Central Droit en U23. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0023-0004-0000-000000000227', 'Adam', 'Tahiri', '2003-06-02', 'Fès', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 190, 84, 'U23',
    'Académie Mohammed VI Football U23', 21, 1, 1,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Fès', 'Académie Mohammed VI Football U23 vs FUS U23',
    'high', 98, 'Joueur Titulaire N°1 au poste de Défenseur Central Gauche en U23. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0023-0004-0000-000000000228', 'Soufiane', 'Zouheir', '2003-07-12', 'Marrakech', 'Marocaine', 'Masculin',
    'Défenseur Central Gauche', 'Défenseur Central', 'Gaucher', 187, 81, 'U23',
    'Hassania Agadir U23', 22, 2, 1,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Marrakech', 'Hassania Agadir U23 vs FUS U23',
    'medium', 81, 'Joueur Doublure N°2 au poste de Défenseur Central Gauche en U23. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0023-0005-0000-000000000229', 'Rayane', 'El Khayati', '2003-08-08', 'Tanger', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 180, 74, 'U23',
    'Moghreb Tétouan U23', 23, 0, 7,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Tanger', 'Moghreb Tétouan U23 vs FUS U23',
    'very_high', 92, 'Joueur Titulaire N°1 au poste de Latéral Gauche en U23. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0023-0005-0000-000000000230', 'Mehdi', 'El Asbahi', '2003-09-18', 'Tétouan', 'Marocaine', 'Masculin',
    'Latéral Gauche', 'Piston Gauche', 'Gaucher', 177, 71, 'U23',
    'Chabab Mohammedia U23', 24, 1, 3,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Tétouan', 'Chabab Mohammedia U23 vs FUS U23',
    'medium', 75, 'Joueur Doublure N°2 au poste de Latéral Gauche en U23. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0023-0006-0000-000000000231', 'Hamza', 'Berrada', '2003-10-14', 'Agadir', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 185, 80, 'U23',
    'FUS Rabat Académie U23', 25, 7, 7,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Agadir', 'FUS Rabat Académie U23 vs FUS U23',
    'high', 86, 'Joueur Titulaire N°1 au poste de Milieu Défensif en U23. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0023-0006-0000-000000000232', 'Ismail', 'Belammari', '2003-11-24', 'Berkane', 'Marocaine', 'Masculin',
    'Milieu Défensif', 'Milieu Central', 'Droitier', 182, 77, 'U23',
    'KAC Kénitra U23', 12, 2, 8,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Berkane', 'KAC Kénitra U23 vs FUS U23',
    'medium', 89, 'Joueur Doublure N°2 au poste de Milieu Défensif en U23. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0023-0007-0000-000000000233', 'Othmane', 'El Mourabit', '2003-12-20', 'Mohammedia', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 183, 78, 'U23',
    'RS Berkane Académie U23', 13, 3, 9,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Mohammedia', 'RS Berkane Académie U23 vs FUS U23',
    'high', 80, 'Joueur Titulaire N°1 au poste de Milieu Central Droit en U23. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0023-0007-0000-000000000234', 'Bilal', 'Chraibi', '2003-01-03', 'Rabat', 'Marocaine', 'Masculin',
    'Milieu Central Droit', 'Milieu Central', 'Droitier', 180, 75, 'U23',
    'Raja Club Athletic U23', 14, 4, 10,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Rabat', 'Raja Club Athletic U23 vs FUS U23',
    'medium', 83, 'Joueur Doublure N°2 au poste de Milieu Central Droit en U23. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0023-0008-0000-000000000235', 'Zakaria', 'Regragui', '2003-02-26', 'Salé', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 182, 77, 'U23',
    'Académie Mohammed VI Football U23', 15, 5, 11,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Salé', 'Académie Mohammed VI Football U23 vs FUS U23',
    'very_high', 94, 'Joueur Titulaire N°1 au poste de Milieu Central Gauche en U23. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0023-0008-0000-000000000236', 'Nassim', 'Benjelloun', '2003-03-09', 'Témara', 'Marocaine', 'Masculin',
    'Milieu Central Gauche', 'Milieu Offensif', 'Gaucher', 179, 74, 'U23',
    'Hassania Agadir U23', 16, 6, 12,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Témara', 'Hassania Agadir U23 vs FUS U23',
    'medium', 77, 'Joueur Doublure N°2 au poste de Milieu Central Gauche en U23. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0023-0009-0000-000000000237', 'Youssef', 'Cherradi', '2003-04-05', 'Kénitra', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 182, 76, 'U23',
    'Moghreb Tétouan U23', 17, 7, 5,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Kénitra', 'Moghreb Tétouan U23 vs FUS U23',
    'high', 88, 'Joueur Titulaire N°1 au poste de Ailier Droit en U23. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0023-0009-0000-000000000238', 'Walid', 'Boukhalfa', '2003-05-15', 'Casablanca', 'Marocaine', 'Masculin',
    'Ailier Droit', 'Attaquant Droit', 'Droitier', 179, 73, 'U23',
    'Chabab Mohammedia U23', 18, 8, 6,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Casablanca', 'Chabab Mohammedia U23 vs FUS U23',
    'medium', 91, 'Joueur Doublure N°2 au poste de Ailier Droit en U23. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0023-0010-0000-000000000239', 'Amine', 'Bennis', '2003-06-11', 'Fès', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 189, 84, 'U23',
    'FUS Rabat Académie U23', 19, 17, 1,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Fès', 'FUS Rabat Académie U23 vs FUS U23',
    'high', 82, 'Joueur Titulaire N°1 au poste de Avant-Centre en U23. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0023-0010-0000-000000000240', 'Taha', 'Zerouali', '2003-07-21', 'Marrakech', 'Marocaine', 'Masculin',
    'Avant-Centre', 'Buteur', 'Droitier', 186, 81, 'U23',
    'KAC Kénitra U23', 20, 18, 1,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Marrakech', 'KAC Kénitra U23 vs FUS U23',
    'medium', 85, 'Joueur Doublure N°2 au poste de Avant-Centre en U23. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
),
(
    'c0000000-0023-0011-0000-000000000241', 'Anas', 'Rahimi', '2003-08-17', 'Tanger', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 181, 75, 'U23',
    'RS Berkane Académie U23', 21, 11, 9,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Tanger', 'RS Berkane Académie U23 vs FUS U23',
    'very_high', 96, 'Joueur Titulaire N°1 au poste de Ailier Gauche en U23. Détecté par Youssef Safri.',
    'shortlist', 'registered'
),
(
    'c0000000-0023-0011-0000-000000000242', 'Badr', 'Aboukhlal', '2003-09-27', 'Tétouan', 'Marocaine', 'Masculin',
    'Ailier Gauche', 'Attaquant Gauche', 'Gaucher', 178, 72, 'U23',
    'Raja Club Athletic U23', 22, 12, 10,
    'a0000000-0000-0000-0000-000000000004', 'Youssef Safri', NULL, 'Youssef Safri',
    'Stade Municipal Tétouan', 'Raja Club Athletic U23 vs FUS U23',
    'medium', 79, 'Joueur Doublure N°2 au poste de Ailier Gauche en U23. Détecté par Youssef Safri.',
    'in_trial', 'in_trial'
)
ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    primary_position = EXCLUDED.primary_position,
    secondary_position = EXCLUDED.secondary_position,
    preferred_foot = EXCLUDED.preferred_foot,
    height_cm = EXCLUDED.height_cm,
    weight_kg = EXCLUDED.weight_kg,
    age_category = EXCLUDED.age_category,
    current_club = EXCLUDED.current_club,
    matches_played = EXCLUDED.matches_played,
    goals = EXCLUDED.goals,
    assists = EXCLUDED.assists,
    discovering_scout_id = EXCLUDED.discovering_scout_id,
    discovering_scout_name = EXCLUDED.discovering_scout_name,
    recruiter_id = EXCLUDED.recruiter_id,
    recruiter_name = EXCLUDED.recruiter_name,
    discovery_location = EXCLUDED.discovery_location,
    discovery_match = EXCLUDED.discovery_match,
    recommendation_priority = EXCLUDED.recommendation_priority,
    initial_scout_score = EXCLUDED.initial_scout_score,
    scout_recommendation_notes = EXCLUDED.scout_recommendation_notes,
    pipeline_stage = EXCLUDED.pipeline_stage,
    status = EXCLUDED.status,
    updated_at = NOW();

-- ==============================================================================
-- SECTION 3 : 242 ÉVALUATIONS TECHNIQUES ET PHYSIQUES DÉTAILLÉES
-- ==============================================================================

INSERT INTO public.candidate_evaluations (
    id, candidate_id, evaluator_name, evaluation_date,
    phys_speed, phys_endurance, phys_strength, phys_agility, phys_jump,
    ment_determination, ment_focus, ment_teamwork, ment_composure, ment_leadership,
    tact_positioning, tact_vision, tact_anticipation, tact_game_iq, tact_transition,
    tech_first_touch, tech_passing, tech_shooting, tech_dribbling, tech_heading,
    verdict, strengths, weaknesses, general_notes
) VALUES
(
    'e0000000-0013-0001-0000-000000000001', 'c0000000-0013-0001-0000-000000000001', 'Mehdi Benatia', CURRENT_DATE - 2,
    80, 77, 72, 80, 75,
    80, 78, 82, 78, 74,
    79, 81, 77, 81, 80,
    81, 80, 69, 82, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Gardien de But en U13.'
),
(
    'e0000000-0013-0001-0000-000000000002', 'c0000000-0013-0001-0000-000000000002', 'Mehdi Benatia', CURRENT_DATE - 3,
    85, 80, 74, 84, 78,
    82, 81, 84, 82, 76,
    82, 85, 79, 84, 84,
    84, 84, 70, 86, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Gardien de But en U13.'
),
(
    'e0000000-0013-0002-0000-000000000003', 'c0000000-0013-0002-0000-000000000003', 'Mehdi Benatia', CURRENT_DATE - 4,
    90, 83, 76, 88, 81,
    84, 84, 86, 86, 78,
    85, 89, 81, 87, 88,
    87, 88, 71, 90, 71,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Droit en U13.'
),
(
    'e0000000-0013-0002-0000-000000000004', 'c0000000-0013-0002-0000-000000000004', 'Mehdi Benatia', CURRENT_DATE - 5,
    95, 86, 78, 92, 84,
    86, 87, 88, 90, 80,
    88, 93, 83, 90, 92,
    90, 92, 72, 94, 72,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Droit en U13.'
),
(
    'e0000000-0013-0003-0000-000000000005', 'c0000000-0013-0003-0000-000000000005', 'Mehdi Benatia', CURRENT_DATE - 6,
    78, 89, 80, 76, 87,
    88, 90, 90, 74, 82,
    91, 77, 85, 93, 76,
    93, 76, 73, 80, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Droit en U13.'
),
(
    'e0000000-0013-0003-0000-000000000006', 'c0000000-0013-0003-0000-000000000006', 'Mehdi Benatia', CURRENT_DATE - 7,
    83, 92, 82, 80, 90,
    90, 93, 92, 78, 84,
    94, 81, 87, 96, 80,
    96, 80, 74, 84, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Droit en U13.'
),
(
    'e0000000-0013-0004-0000-000000000007', 'c0000000-0013-0004-0000-000000000007', 'Mehdi Benatia', CURRENT_DATE - 1,
    88, 75, 84, 84, 93,
    92, 77, 94, 82, 86,
    77, 85, 89, 80, 84,
    80, 84, 75, 88, 89,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Gauche en U13.'
),
(
    'e0000000-0013-0004-0000-000000000008', 'c0000000-0013-0004-0000-000000000008', 'Mehdi Benatia', CURRENT_DATE - 2,
    93, 78, 86, 88, 74,
    94, 80, 80, 86, 88,
    80, 89, 91, 83, 88,
    83, 88, 76, 92, 90,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Gauche en U13.'
),
(
    'e0000000-0013-0005-0000-000000000009', 'c0000000-0013-0005-0000-000000000009', 'Mehdi Benatia', CURRENT_DATE - 3,
    76, 81, 88, 92, 77,
    78, 83, 82, 90, 90,
    83, 93, 93, 86, 92,
    86, 92, 77, 78, 77,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Gauche en U13.'
),
(
    'e0000000-0013-0005-0000-000000000010', 'c0000000-0013-0005-0000-000000000010', 'Mehdi Benatia', CURRENT_DATE - 4,
    81, 84, 90, 76, 80,
    80, 86, 84, 74, 92,
    86, 77, 95, 89, 76,
    89, 76, 78, 82, 78,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Gauche en U13.'
),
(
    'e0000000-0013-0006-0000-000000000011', 'c0000000-0013-0006-0000-000000000011', 'Mehdi Benatia', CURRENT_DATE - 5,
    86, 87, 92, 80, 83,
    82, 89, 86, 78, 72,
    89, 81, 76, 92, 80,
    92, 80, 79, 86, 79,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Défensif en U13.'
),
(
    'e0000000-0013-0006-0000-000000000012', 'c0000000-0013-0006-0000-000000000012', 'Mehdi Benatia', CURRENT_DATE - 6,
    91, 90, 71, 84, 86,
    84, 92, 88, 82, 74,
    92, 85, 78, 95, 84,
    95, 84, 80, 90, 80,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Défensif en U13.'
),
(
    'e0000000-0013-0007-0000-000000000013', 'c0000000-0013-0007-0000-000000000013', 'Mehdi Benatia', CURRENT_DATE - 7,
    96, 93, 73, 88, 89,
    86, 76, 90, 86, 76,
    95, 89, 80, 79, 88,
    79, 88, 81, 94, 81,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Droit en U13.'
),
(
    'e0000000-0013-0007-0000-000000000014', 'c0000000-0013-0007-0000-000000000014', 'Mehdi Benatia', CURRENT_DATE - 1,
    79, 76, 75, 92, 92,
    88, 79, 92, 90, 78,
    78, 93, 82, 82, 92,
    82, 92, 82, 80, 82,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Droit en U13.'
),
(
    'e0000000-0013-0008-0000-000000000015', 'c0000000-0013-0008-0000-000000000015', 'Mehdi Benatia', CURRENT_DATE - 2,
    84, 79, 77, 76, 73,
    90, 82, 94, 74, 80,
    81, 77, 84, 85, 76,
    85, 76, 68, 84, 83,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Gauche en U13.'
),
(
    'e0000000-0013-0008-0000-000000000016', 'c0000000-0013-0008-0000-000000000016', 'Mehdi Benatia', CURRENT_DATE - 3,
    89, 82, 79, 80, 76,
    92, 85, 80, 78, 82,
    84, 81, 86, 88, 80,
    88, 80, 69, 88, 68,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Gauche en U13.'
),
(
    'e0000000-0013-0009-0000-000000000017', 'c0000000-0013-0009-0000-000000000017', 'Mehdi Benatia', CURRENT_DATE - 4,
    94, 85, 81, 84, 79,
    94, 88, 82, 82, 84,
    87, 85, 88, 91, 84,
    91, 84, 87, 92, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Droit en U13.'
),
(
    'e0000000-0013-0009-0000-000000000018', 'c0000000-0013-0009-0000-000000000018', 'Mehdi Benatia', CURRENT_DATE - 5,
    77, 88, 83, 88, 82,
    78, 91, 84, 86, 86,
    90, 89, 90, 94, 88,
    94, 88, 88, 78, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Droit en U13.'
),
(
    'e0000000-0013-0010-0000-000000000019', 'c0000000-0013-0010-0000-000000000019', 'Mehdi Benatia', CURRENT_DATE - 6,
    82, 91, 85, 92, 85,
    80, 75, 86, 90, 88,
    93, 93, 92, 78, 92,
    78, 92, 89, 82, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Avant-Centre en U13.'
),
(
    'e0000000-0013-0010-0000-000000000020', 'c0000000-0013-0010-0000-000000000020', 'Mehdi Benatia', CURRENT_DATE - 7,
    87, 74, 87, 76, 88,
    82, 78, 88, 74, 90,
    76, 77, 94, 81, 76,
    81, 76, 90, 86, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Avant-Centre en U13.'
),
(
    'e0000000-0013-0011-0000-000000000021', 'c0000000-0013-0011-0000-000000000021', 'Mehdi Benatia', CURRENT_DATE - 1,
    92, 77, 89, 80, 91,
    84, 81, 90, 78, 92,
    79, 81, 75, 84, 80,
    84, 80, 91, 90, 73,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Gauche en U13.'
),
(
    'e0000000-0013-0011-0000-000000000022', 'c0000000-0013-0011-0000-000000000022', 'Mehdi Benatia', CURRENT_DATE - 2,
    75, 80, 91, 84, 72,
    86, 84, 92, 82, 72,
    82, 85, 77, 87, 84,
    87, 84, 92, 94, 74,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Gauche en U13.'
),
(
    'e0000000-0014-0001-0000-000000000023', 'c0000000-0014-0001-0000-000000000023', 'Mehdi Benatia', CURRENT_DATE - 2,
    81, 78, 73, 81, 76,
    81, 79, 83, 79, 75,
    80, 82, 78, 82, 81,
    82, 81, 69, 83, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Gardien de But en U14.'
),
(
    'e0000000-0014-0001-0000-000000000024', 'c0000000-0014-0001-0000-000000000024', 'Mehdi Benatia', CURRENT_DATE - 3,
    86, 81, 75, 85, 79,
    83, 82, 85, 83, 77,
    83, 86, 80, 85, 85,
    85, 85, 70, 87, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Gardien de But en U14.'
),
(
    'e0000000-0014-0002-0000-000000000025', 'c0000000-0014-0002-0000-000000000025', 'Mehdi Benatia', CURRENT_DATE - 4,
    91, 84, 77, 89, 82,
    85, 85, 87, 87, 79,
    86, 90, 82, 88, 89,
    88, 89, 71, 91, 71,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Droit en U14.'
),
(
    'e0000000-0014-0002-0000-000000000026', 'c0000000-0014-0002-0000-000000000026', 'Mehdi Benatia', CURRENT_DATE - 5,
    96, 87, 79, 93, 85,
    87, 88, 89, 91, 81,
    89, 94, 84, 91, 93,
    91, 93, 72, 95, 72,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Droit en U14.'
),
(
    'e0000000-0014-0003-0000-000000000027', 'c0000000-0014-0003-0000-000000000027', 'Mehdi Benatia', CURRENT_DATE - 6,
    79, 90, 81, 77, 88,
    89, 91, 91, 75, 83,
    92, 78, 86, 94, 77,
    94, 77, 73, 81, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Droit en U14.'
),
(
    'e0000000-0014-0003-0000-000000000028', 'c0000000-0014-0003-0000-000000000028', 'Mehdi Benatia', CURRENT_DATE - 7,
    84, 93, 83, 81, 91,
    91, 75, 93, 79, 85,
    95, 82, 88, 78, 81,
    78, 81, 74, 85, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Droit en U14.'
),
(
    'e0000000-0014-0004-0000-000000000029', 'c0000000-0014-0004-0000-000000000029', 'Mehdi Benatia', CURRENT_DATE - 1,
    89, 76, 85, 85, 72,
    93, 78, 95, 83, 87,
    78, 86, 90, 81, 85,
    81, 85, 75, 89, 89,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Gauche en U14.'
),
(
    'e0000000-0014-0004-0000-000000000030', 'c0000000-0014-0004-0000-000000000030', 'Mehdi Benatia', CURRENT_DATE - 2,
    94, 79, 87, 89, 75,
    95, 81, 81, 87, 89,
    81, 90, 92, 84, 89,
    84, 89, 76, 93, 90,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Gauche en U14.'
),
(
    'e0000000-0014-0005-0000-000000000031', 'c0000000-0014-0005-0000-000000000031', 'Mehdi Benatia', CURRENT_DATE - 3,
    77, 82, 89, 93, 78,
    79, 84, 83, 91, 91,
    84, 94, 94, 87, 93,
    87, 93, 77, 79, 77,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Gauche en U14.'
),
(
    'e0000000-0014-0005-0000-000000000032', 'c0000000-0014-0005-0000-000000000032', 'Mehdi Benatia', CURRENT_DATE - 4,
    82, 85, 91, 77, 81,
    81, 87, 85, 75, 93,
    87, 78, 75, 90, 77,
    90, 77, 78, 83, 78,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Gauche en U14.'
),
(
    'e0000000-0014-0006-0000-000000000033', 'c0000000-0014-0006-0000-000000000033', 'Mehdi Benatia', CURRENT_DATE - 5,
    87, 88, 70, 81, 84,
    83, 90, 87, 79, 73,
    90, 82, 77, 93, 81,
    93, 81, 79, 87, 79,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Défensif en U14.'
),
(
    'e0000000-0014-0006-0000-000000000034', 'c0000000-0014-0006-0000-000000000034', 'Mehdi Benatia', CURRENT_DATE - 6,
    92, 91, 72, 85, 87,
    85, 93, 89, 83, 75,
    93, 86, 79, 96, 85,
    96, 85, 80, 91, 80,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Défensif en U14.'
),
(
    'e0000000-0014-0007-0000-000000000035', 'c0000000-0014-0007-0000-000000000035', 'Mehdi Benatia', CURRENT_DATE - 7,
    75, 74, 74, 89, 90,
    87, 77, 91, 87, 77,
    76, 90, 81, 80, 89,
    80, 89, 81, 95, 81,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Droit en U14.'
),
(
    'e0000000-0014-0007-0000-000000000036', 'c0000000-0014-0007-0000-000000000036', 'Mehdi Benatia', CURRENT_DATE - 1,
    80, 77, 76, 93, 93,
    89, 80, 93, 91, 79,
    79, 94, 83, 83, 93,
    83, 93, 82, 81, 82,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Droit en U14.'
),
(
    'e0000000-0014-0008-0000-000000000037', 'c0000000-0014-0008-0000-000000000037', 'Mehdi Benatia', CURRENT_DATE - 2,
    85, 80, 78, 77, 74,
    91, 83, 95, 75, 81,
    82, 78, 85, 86, 77,
    86, 77, 68, 85, 83,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Gauche en U14.'
),
(
    'e0000000-0014-0008-0000-000000000038', 'c0000000-0014-0008-0000-000000000038', 'Mehdi Benatia', CURRENT_DATE - 3,
    90, 83, 80, 81, 77,
    93, 86, 81, 79, 83,
    85, 82, 87, 89, 81,
    89, 81, 69, 89, 68,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Gauche en U14.'
),
(
    'e0000000-0014-0009-0000-000000000039', 'c0000000-0014-0009-0000-000000000039', 'Mehdi Benatia', CURRENT_DATE - 4,
    95, 86, 82, 85, 80,
    95, 89, 83, 83, 85,
    88, 86, 89, 92, 85,
    92, 85, 87, 93, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Droit en U14.'
),
(
    'e0000000-0014-0009-0000-000000000040', 'c0000000-0014-0009-0000-000000000040', 'Mehdi Benatia', CURRENT_DATE - 5,
    78, 89, 84, 89, 83,
    79, 92, 85, 87, 87,
    91, 90, 91, 95, 89,
    95, 89, 88, 79, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Droit en U14.'
),
(
    'e0000000-0014-0010-0000-000000000041', 'c0000000-0014-0010-0000-000000000041', 'Mehdi Benatia', CURRENT_DATE - 6,
    83, 92, 86, 93, 86,
    81, 76, 87, 91, 89,
    94, 94, 93, 79, 93,
    79, 93, 89, 83, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Avant-Centre en U14.'
),
(
    'e0000000-0014-0010-0000-000000000042', 'c0000000-0014-0010-0000-000000000042', 'Mehdi Benatia', CURRENT_DATE - 7,
    88, 75, 88, 77, 89,
    83, 79, 89, 75, 91,
    77, 78, 95, 82, 77,
    82, 77, 90, 87, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Avant-Centre en U14.'
),
(
    'e0000000-0014-0011-0000-000000000043', 'c0000000-0014-0011-0000-000000000043', 'Mehdi Benatia', CURRENT_DATE - 1,
    93, 78, 90, 81, 92,
    85, 82, 91, 79, 93,
    80, 82, 76, 85, 81,
    85, 81, 91, 91, 73,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Gauche en U14.'
),
(
    'e0000000-0014-0011-0000-000000000044', 'c0000000-0014-0011-0000-000000000044', 'Mehdi Benatia', CURRENT_DATE - 2,
    76, 81, 92, 85, 73,
    87, 85, 93, 83, 73,
    83, 86, 78, 88, 85,
    88, 85, 92, 95, 74,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Gauche en U14.'
),
(
    'e0000000-0015-0001-0000-000000000045', 'c0000000-0015-0001-0000-000000000045', 'Mehdi Benatia', CURRENT_DATE - 2,
    82, 79, 74, 82, 77,
    82, 80, 84, 80, 76,
    81, 83, 79, 83, 82,
    83, 82, 69, 84, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Gardien de But en U15.'
),
(
    'e0000000-0015-0001-0000-000000000046', 'c0000000-0015-0001-0000-000000000046', 'Mehdi Benatia', CURRENT_DATE - 3,
    87, 82, 76, 86, 80,
    84, 83, 86, 84, 78,
    84, 87, 81, 86, 86,
    86, 86, 70, 88, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Gardien de But en U15.'
),
(
    'e0000000-0015-0002-0000-000000000047', 'c0000000-0015-0002-0000-000000000047', 'Mehdi Benatia', CURRENT_DATE - 4,
    92, 85, 78, 90, 83,
    86, 86, 88, 88, 80,
    87, 91, 83, 89, 90,
    89, 90, 71, 92, 71,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Droit en U15.'
),
(
    'e0000000-0015-0002-0000-000000000048', 'c0000000-0015-0002-0000-000000000048', 'Mehdi Benatia', CURRENT_DATE - 5,
    75, 88, 80, 94, 86,
    88, 89, 90, 92, 82,
    90, 95, 85, 92, 94,
    92, 94, 72, 78, 72,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Droit en U15.'
),
(
    'e0000000-0015-0003-0000-000000000049', 'c0000000-0015-0003-0000-000000000049', 'Mehdi Benatia', CURRENT_DATE - 6,
    80, 91, 82, 78, 89,
    90, 92, 92, 76, 84,
    93, 79, 87, 95, 78,
    95, 78, 73, 82, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Droit en U15.'
),
(
    'e0000000-0015-0003-0000-000000000050', 'c0000000-0015-0003-0000-000000000050', 'Mehdi Benatia', CURRENT_DATE - 7,
    85, 74, 84, 82, 92,
    92, 76, 94, 80, 86,
    76, 83, 89, 79, 82,
    79, 82, 74, 86, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Droit en U15.'
),
(
    'e0000000-0015-0004-0000-000000000051', 'c0000000-0015-0004-0000-000000000051', 'Mehdi Benatia', CURRENT_DATE - 1,
    90, 77, 86, 86, 73,
    94, 79, 80, 84, 88,
    79, 87, 91, 82, 86,
    82, 86, 75, 90, 89,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Gauche en U15.'
),
(
    'e0000000-0015-0004-0000-000000000052', 'c0000000-0015-0004-0000-000000000052', 'Mehdi Benatia', CURRENT_DATE - 2,
    95, 80, 88, 90, 76,
    78, 82, 82, 88, 90,
    82, 91, 93, 85, 90,
    85, 90, 76, 94, 90,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Gauche en U15.'
),
(
    'e0000000-0015-0005-0000-000000000053', 'c0000000-0015-0005-0000-000000000053', 'Mehdi Benatia', CURRENT_DATE - 3,
    78, 83, 90, 94, 79,
    80, 85, 84, 92, 92,
    85, 95, 95, 88, 94,
    88, 94, 77, 80, 77,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Gauche en U15.'
),
(
    'e0000000-0015-0005-0000-000000000054', 'c0000000-0015-0005-0000-000000000054', 'Mehdi Benatia', CURRENT_DATE - 4,
    83, 86, 92, 78, 82,
    82, 88, 86, 76, 72,
    88, 79, 76, 91, 78,
    91, 78, 78, 84, 78,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Gauche en U15.'
),
(
    'e0000000-0015-0006-0000-000000000055', 'c0000000-0015-0006-0000-000000000055', 'Mehdi Benatia', CURRENT_DATE - 5,
    88, 89, 71, 82, 85,
    84, 91, 88, 80, 74,
    91, 83, 78, 94, 82,
    94, 82, 79, 88, 79,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Défensif en U15.'
),
(
    'e0000000-0015-0006-0000-000000000056', 'c0000000-0015-0006-0000-000000000056', 'Mehdi Benatia', CURRENT_DATE - 6,
    93, 92, 73, 86, 88,
    86, 75, 90, 84, 76,
    94, 87, 80, 78, 86,
    78, 86, 80, 92, 80,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Défensif en U15.'
),
(
    'e0000000-0015-0007-0000-000000000057', 'c0000000-0015-0007-0000-000000000057', 'Mehdi Benatia', CURRENT_DATE - 7,
    76, 75, 75, 90, 91,
    88, 78, 92, 88, 78,
    77, 91, 82, 81, 90,
    81, 90, 81, 78, 81,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Droit en U15.'
),
(
    'e0000000-0015-0007-0000-000000000058', 'c0000000-0015-0007-0000-000000000058', 'Mehdi Benatia', CURRENT_DATE - 1,
    81, 78, 77, 94, 72,
    90, 81, 94, 92, 80,
    80, 95, 84, 84, 94,
    84, 94, 82, 82, 82,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Droit en U15.'
),
(
    'e0000000-0015-0008-0000-000000000059', 'c0000000-0015-0008-0000-000000000059', 'Mehdi Benatia', CURRENT_DATE - 2,
    86, 81, 79, 78, 75,
    92, 84, 80, 76, 82,
    83, 79, 86, 87, 78,
    87, 78, 68, 86, 83,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Gauche en U15.'
),
(
    'e0000000-0015-0008-0000-000000000060', 'c0000000-0015-0008-0000-000000000060', 'Mehdi Benatia', CURRENT_DATE - 3,
    91, 84, 81, 82, 78,
    94, 87, 82, 80, 84,
    86, 83, 88, 90, 82,
    90, 82, 69, 90, 68,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Gauche en U15.'
),
(
    'e0000000-0015-0009-0000-000000000061', 'c0000000-0015-0009-0000-000000000061', 'Mehdi Benatia', CURRENT_DATE - 4,
    96, 87, 83, 86, 81,
    78, 90, 84, 84, 86,
    89, 87, 90, 93, 86,
    93, 86, 87, 94, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Droit en U15.'
),
(
    'e0000000-0015-0009-0000-000000000062', 'c0000000-0015-0009-0000-000000000062', 'Mehdi Benatia', CURRENT_DATE - 5,
    79, 90, 85, 90, 84,
    80, 93, 86, 88, 88,
    92, 91, 92, 96, 90,
    96, 90, 88, 80, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Droit en U15.'
),
(
    'e0000000-0015-0010-0000-000000000063', 'c0000000-0015-0010-0000-000000000063', 'Mehdi Benatia', CURRENT_DATE - 6,
    84, 93, 87, 94, 87,
    82, 77, 88, 92, 90,
    95, 95, 94, 80, 94,
    80, 94, 89, 84, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Avant-Centre en U15.'
),
(
    'e0000000-0015-0010-0000-000000000064', 'c0000000-0015-0010-0000-000000000064', 'Mehdi Benatia', CURRENT_DATE - 7,
    89, 76, 89, 78, 90,
    84, 80, 90, 76, 92,
    78, 79, 75, 83, 78,
    83, 78, 90, 88, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Avant-Centre en U15.'
),
(
    'e0000000-0015-0011-0000-000000000065', 'c0000000-0015-0011-0000-000000000065', 'Mehdi Benatia', CURRENT_DATE - 1,
    94, 79, 91, 82, 93,
    86, 83, 92, 80, 72,
    81, 83, 77, 86, 82,
    86, 82, 91, 92, 73,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Gauche en U15.'
),
(
    'e0000000-0015-0011-0000-000000000066', 'c0000000-0015-0011-0000-000000000066', 'Mehdi Benatia', CURRENT_DATE - 2,
    77, 82, 70, 86, 74,
    88, 86, 94, 84, 74,
    84, 87, 79, 89, 86,
    89, 86, 92, 78, 74,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Gauche en U15.'
),
(
    'e0000000-0016-0001-0000-000000000067', 'c0000000-0016-0001-0000-000000000067', 'Tarik Sektioui', CURRENT_DATE - 2,
    83, 80, 75, 83, 78,
    83, 81, 85, 81, 77,
    82, 84, 80, 84, 83,
    84, 83, 69, 85, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Gardien de But en U16.'
),
(
    'e0000000-0016-0001-0000-000000000068', 'c0000000-0016-0001-0000-000000000068', 'Tarik Sektioui', CURRENT_DATE - 3,
    88, 83, 77, 87, 81,
    85, 84, 87, 85, 79,
    85, 88, 82, 87, 87,
    87, 87, 70, 89, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Gardien de But en U16.'
),
(
    'e0000000-0016-0002-0000-000000000069', 'c0000000-0016-0002-0000-000000000069', 'Tarik Sektioui', CURRENT_DATE - 4,
    93, 86, 79, 91, 84,
    87, 87, 89, 89, 81,
    88, 92, 84, 90, 91,
    90, 91, 71, 93, 71,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Droit en U16.'
),
(
    'e0000000-0016-0002-0000-000000000070', 'c0000000-0016-0002-0000-000000000070', 'Tarik Sektioui', CURRENT_DATE - 5,
    76, 89, 81, 95, 87,
    89, 90, 91, 93, 83,
    91, 96, 86, 93, 95,
    93, 95, 72, 79, 72,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Droit en U16.'
),
(
    'e0000000-0016-0003-0000-000000000071', 'c0000000-0016-0003-0000-000000000071', 'Tarik Sektioui', CURRENT_DATE - 6,
    81, 92, 83, 79, 90,
    91, 93, 93, 77, 85,
    94, 80, 88, 96, 79,
    96, 79, 73, 83, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Droit en U16.'
),
(
    'e0000000-0016-0003-0000-000000000072', 'c0000000-0016-0003-0000-000000000072', 'Tarik Sektioui', CURRENT_DATE - 7,
    86, 75, 85, 83, 93,
    93, 77, 95, 81, 87,
    77, 84, 90, 80, 83,
    80, 83, 74, 87, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Droit en U16.'
),
(
    'e0000000-0016-0004-0000-000000000073', 'c0000000-0016-0004-0000-000000000073', 'Tarik Sektioui', CURRENT_DATE - 1,
    91, 78, 87, 87, 74,
    95, 80, 81, 85, 89,
    80, 88, 92, 83, 87,
    83, 87, 75, 91, 89,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Gauche en U16.'
),
(
    'e0000000-0016-0004-0000-000000000074', 'c0000000-0016-0004-0000-000000000074', 'Tarik Sektioui', CURRENT_DATE - 2,
    96, 81, 89, 91, 77,
    79, 83, 83, 89, 91,
    83, 92, 94, 86, 91,
    86, 91, 76, 95, 90,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Gauche en U16.'
),
(
    'e0000000-0016-0005-0000-000000000075', 'c0000000-0016-0005-0000-000000000075', 'Tarik Sektioui', CURRENT_DATE - 3,
    79, 84, 91, 95, 80,
    81, 86, 85, 93, 93,
    86, 96, 75, 89, 95,
    89, 95, 77, 81, 77,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Gauche en U16.'
),
(
    'e0000000-0016-0005-0000-000000000076', 'c0000000-0016-0005-0000-000000000076', 'Tarik Sektioui', CURRENT_DATE - 4,
    84, 87, 70, 79, 83,
    83, 89, 87, 77, 73,
    89, 80, 77, 92, 79,
    92, 79, 78, 85, 78,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Gauche en U16.'
),
(
    'e0000000-0016-0006-0000-000000000077', 'c0000000-0016-0006-0000-000000000077', 'Tarik Sektioui', CURRENT_DATE - 5,
    89, 90, 72, 83, 86,
    85, 92, 89, 81, 75,
    92, 84, 79, 95, 83,
    95, 83, 79, 89, 79,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Défensif en U16.'
),
(
    'e0000000-0016-0006-0000-000000000078', 'c0000000-0016-0006-0000-000000000078', 'Tarik Sektioui', CURRENT_DATE - 6,
    94, 93, 74, 87, 89,
    87, 76, 91, 85, 77,
    95, 88, 81, 79, 87,
    79, 87, 80, 93, 80,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Défensif en U16.'
),
(
    'e0000000-0016-0007-0000-000000000079', 'c0000000-0016-0007-0000-000000000079', 'Tarik Sektioui', CURRENT_DATE - 7,
    77, 76, 76, 91, 92,
    89, 79, 93, 89, 79,
    78, 92, 83, 82, 91,
    82, 91, 81, 79, 81,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Droit en U16.'
),
(
    'e0000000-0016-0007-0000-000000000080', 'c0000000-0016-0007-0000-000000000080', 'Tarik Sektioui', CURRENT_DATE - 1,
    82, 79, 78, 95, 73,
    91, 82, 95, 93, 81,
    81, 96, 85, 85, 95,
    85, 95, 82, 83, 82,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Droit en U16.'
),
(
    'e0000000-0016-0008-0000-000000000081', 'c0000000-0016-0008-0000-000000000081', 'Tarik Sektioui', CURRENT_DATE - 2,
    87, 82, 80, 79, 76,
    93, 85, 81, 77, 83,
    84, 80, 87, 88, 79,
    88, 79, 68, 87, 83,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Gauche en U16.'
),
(
    'e0000000-0016-0008-0000-000000000082', 'c0000000-0016-0008-0000-000000000082', 'Tarik Sektioui', CURRENT_DATE - 3,
    92, 85, 82, 83, 79,
    95, 88, 83, 81, 85,
    87, 84, 89, 91, 83,
    91, 83, 69, 91, 68,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Gauche en U16.'
),
(
    'e0000000-0016-0009-0000-000000000083', 'c0000000-0016-0009-0000-000000000083', 'Tarik Sektioui', CURRENT_DATE - 4,
    75, 88, 84, 87, 82,
    79, 91, 85, 85, 87,
    90, 88, 91, 94, 87,
    94, 87, 87, 95, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Droit en U16.'
),
(
    'e0000000-0016-0009-0000-000000000084', 'c0000000-0016-0009-0000-000000000084', 'Tarik Sektioui', CURRENT_DATE - 5,
    80, 91, 86, 91, 85,
    81, 75, 87, 89, 89,
    93, 92, 93, 78, 91,
    78, 91, 88, 81, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Droit en U16.'
),
(
    'e0000000-0016-0010-0000-000000000085', 'c0000000-0016-0010-0000-000000000085', 'Tarik Sektioui', CURRENT_DATE - 6,
    85, 74, 88, 95, 88,
    83, 78, 89, 93, 91,
    76, 96, 95, 81, 95,
    81, 95, 89, 85, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Avant-Centre en U16.'
),
(
    'e0000000-0016-0010-0000-000000000086', 'c0000000-0016-0010-0000-000000000086', 'Tarik Sektioui', CURRENT_DATE - 7,
    90, 77, 90, 79, 91,
    85, 81, 91, 77, 93,
    79, 80, 76, 84, 79,
    84, 79, 90, 89, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Avant-Centre en U16.'
),
(
    'e0000000-0016-0011-0000-000000000087', 'c0000000-0016-0011-0000-000000000087', 'Tarik Sektioui', CURRENT_DATE - 1,
    95, 80, 92, 83, 72,
    87, 84, 93, 81, 73,
    82, 84, 78, 87, 83,
    87, 83, 91, 93, 73,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Gauche en U16.'
),
(
    'e0000000-0016-0011-0000-000000000088', 'c0000000-0016-0011-0000-000000000088', 'Tarik Sektioui', CURRENT_DATE - 2,
    78, 83, 71, 87, 75,
    89, 87, 95, 85, 75,
    85, 88, 80, 90, 87,
    90, 87, 92, 79, 74,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Gauche en U16.'
),
(
    'e0000000-0017-0001-0000-000000000089', 'c0000000-0017-0001-0000-000000000089', 'Tarik Sektioui', CURRENT_DATE - 2,
    84, 81, 76, 84, 79,
    84, 82, 86, 82, 78,
    83, 85, 81, 85, 84,
    85, 84, 69, 86, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Gardien de But en U17.'
),
(
    'e0000000-0017-0001-0000-000000000090', 'c0000000-0017-0001-0000-000000000090', 'Tarik Sektioui', CURRENT_DATE - 3,
    89, 84, 78, 88, 82,
    86, 85, 88, 86, 80,
    86, 89, 83, 88, 88,
    88, 88, 70, 90, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Gardien de But en U17.'
),
(
    'e0000000-0017-0002-0000-000000000091', 'c0000000-0017-0002-0000-000000000091', 'Tarik Sektioui', CURRENT_DATE - 4,
    94, 87, 80, 92, 85,
    88, 88, 90, 90, 82,
    89, 93, 85, 91, 92,
    91, 92, 71, 94, 71,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Droit en U17.'
),
(
    'e0000000-0017-0002-0000-000000000092', 'c0000000-0017-0002-0000-000000000092', 'Tarik Sektioui', CURRENT_DATE - 5,
    77, 90, 82, 76, 88,
    90, 91, 92, 74, 84,
    92, 77, 87, 94, 76,
    94, 76, 72, 80, 72,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Droit en U17.'
),
(
    'e0000000-0017-0003-0000-000000000093', 'c0000000-0017-0003-0000-000000000093', 'Tarik Sektioui', CURRENT_DATE - 6,
    82, 93, 84, 80, 91,
    92, 75, 94, 78, 86,
    95, 81, 89, 78, 80,
    78, 80, 73, 84, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Droit en U17.'
),
(
    'e0000000-0017-0003-0000-000000000094', 'c0000000-0017-0003-0000-000000000094', 'Tarik Sektioui', CURRENT_DATE - 7,
    87, 76, 86, 84, 72,
    94, 78, 80, 82, 88,
    78, 85, 91, 81, 84,
    81, 84, 74, 88, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Droit en U17.'
),
(
    'e0000000-0017-0004-0000-000000000095', 'c0000000-0017-0004-0000-000000000095', 'Tarik Sektioui', CURRENT_DATE - 1,
    92, 79, 88, 88, 75,
    78, 81, 82, 86, 90,
    81, 89, 93, 84, 88,
    84, 88, 75, 92, 89,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Gauche en U17.'
),
(
    'e0000000-0017-0004-0000-000000000096', 'c0000000-0017-0004-0000-000000000096', 'Tarik Sektioui', CURRENT_DATE - 2,
    75, 82, 90, 92, 78,
    80, 84, 84, 90, 92,
    84, 93, 95, 87, 92,
    87, 92, 76, 78, 90,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Gauche en U17.'
),
(
    'e0000000-0017-0005-0000-000000000097', 'c0000000-0017-0005-0000-000000000097', 'Tarik Sektioui', CURRENT_DATE - 3,
    80, 85, 92, 76, 81,
    82, 87, 86, 74, 72,
    87, 77, 76, 90, 76,
    90, 76, 77, 82, 77,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Gauche en U17.'
),
(
    'e0000000-0017-0005-0000-000000000098', 'c0000000-0017-0005-0000-000000000098', 'Tarik Sektioui', CURRENT_DATE - 4,
    85, 88, 71, 80, 84,
    84, 90, 88, 78, 74,
    90, 81, 78, 93, 80,
    93, 80, 78, 86, 78,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Gauche en U17.'
),
(
    'e0000000-0017-0006-0000-000000000099', 'c0000000-0017-0006-0000-000000000099', 'Tarik Sektioui', CURRENT_DATE - 5,
    90, 91, 73, 84, 87,
    86, 93, 90, 82, 76,
    93, 85, 80, 96, 84,
    96, 84, 79, 90, 79,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Défensif en U17.'
),
(
    'e0000000-0017-0006-0000-000000000100', 'c0000000-0017-0006-0000-000000000100', 'Tarik Sektioui', CURRENT_DATE - 6,
    95, 74, 75, 88, 90,
    88, 77, 92, 86, 78,
    76, 89, 82, 80, 88,
    80, 88, 80, 94, 80,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Défensif en U17.'
),
(
    'e0000000-0017-0007-0000-000000000101', 'c0000000-0017-0007-0000-000000000101', 'Tarik Sektioui', CURRENT_DATE - 7,
    78, 77, 77, 92, 93,
    90, 80, 94, 90, 80,
    79, 93, 84, 83, 92,
    83, 92, 81, 80, 81,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Droit en U17.'
),
(
    'e0000000-0017-0007-0000-000000000102', 'c0000000-0017-0007-0000-000000000102', 'Tarik Sektioui', CURRENT_DATE - 1,
    83, 80, 79, 76, 74,
    92, 83, 80, 74, 82,
    82, 77, 86, 86, 76,
    86, 76, 82, 84, 82,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Droit en U17.'
),
(
    'e0000000-0017-0008-0000-000000000103', 'c0000000-0017-0008-0000-000000000103', 'Tarik Sektioui', CURRENT_DATE - 2,
    88, 83, 81, 80, 77,
    94, 86, 82, 78, 84,
    85, 81, 88, 89, 80,
    89, 80, 68, 88, 83,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Gauche en U17.'
),
(
    'e0000000-0017-0008-0000-000000000104', 'c0000000-0017-0008-0000-000000000104', 'Tarik Sektioui', CURRENT_DATE - 3,
    93, 86, 83, 84, 80,
    78, 89, 84, 82, 86,
    88, 85, 90, 92, 84,
    92, 84, 69, 92, 68,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Gauche en U17.'
),
(
    'e0000000-0017-0009-0000-000000000105', 'c0000000-0017-0009-0000-000000000105', 'Tarik Sektioui', CURRENT_DATE - 4,
    76, 89, 85, 88, 83,
    80, 92, 86, 86, 88,
    91, 89, 92, 95, 88,
    95, 88, 87, 78, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Droit en U17.'
),
(
    'e0000000-0017-0009-0000-000000000106', 'c0000000-0017-0009-0000-000000000106', 'Tarik Sektioui', CURRENT_DATE - 5,
    81, 92, 87, 92, 86,
    82, 76, 88, 90, 90,
    94, 93, 94, 79, 92,
    79, 92, 88, 82, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Droit en U17.'
),
(
    'e0000000-0017-0010-0000-000000000107', 'c0000000-0017-0010-0000-000000000107', 'Tarik Sektioui', CURRENT_DATE - 6,
    86, 75, 89, 76, 89,
    84, 79, 90, 74, 92,
    77, 77, 75, 82, 76,
    82, 76, 89, 86, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Avant-Centre en U17.'
),
(
    'e0000000-0017-0010-0000-000000000108', 'c0000000-0017-0010-0000-000000000108', 'Tarik Sektioui', CURRENT_DATE - 7,
    91, 78, 91, 80, 92,
    86, 82, 92, 78, 72,
    80, 81, 77, 85, 80,
    85, 80, 90, 90, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Avant-Centre en U17.'
),
(
    'e0000000-0017-0011-0000-000000000109', 'c0000000-0017-0011-0000-000000000109', 'Tarik Sektioui', CURRENT_DATE - 1,
    96, 81, 70, 84, 73,
    88, 85, 94, 82, 74,
    83, 85, 79, 88, 84,
    88, 84, 91, 94, 73,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Gauche en U17.'
),
(
    'e0000000-0017-0011-0000-000000000110', 'c0000000-0017-0011-0000-000000000110', 'Tarik Sektioui', CURRENT_DATE - 2,
    79, 84, 72, 88, 76,
    90, 88, 80, 86, 76,
    86, 89, 81, 91, 88,
    91, 88, 92, 80, 74,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Gauche en U17.'
),
(
    'e0000000-0018-0001-0000-000000000111', 'c0000000-0018-0001-0000-000000000111', 'Tarik Sektioui', CURRENT_DATE - 2,
    85, 82, 77, 85, 80,
    85, 83, 87, 83, 79,
    84, 86, 82, 86, 85,
    86, 85, 69, 87, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Gardien de But en U18.'
),
(
    'e0000000-0018-0001-0000-000000000112', 'c0000000-0018-0001-0000-000000000112', 'Tarik Sektioui', CURRENT_DATE - 3,
    90, 85, 79, 89, 83,
    87, 86, 89, 87, 81,
    87, 90, 84, 89, 89,
    89, 89, 70, 91, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Gardien de But en U18.'
),
(
    'e0000000-0018-0002-0000-000000000113', 'c0000000-0018-0002-0000-000000000113', 'Tarik Sektioui', CURRENT_DATE - 4,
    95, 88, 81, 93, 86,
    89, 89, 91, 91, 83,
    90, 94, 86, 92, 93,
    92, 93, 71, 95, 71,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Droit en U18.'
),
(
    'e0000000-0018-0002-0000-000000000114', 'c0000000-0018-0002-0000-000000000114', 'Tarik Sektioui', CURRENT_DATE - 5,
    78, 91, 83, 77, 89,
    91, 92, 93, 75, 85,
    93, 78, 88, 95, 77,
    95, 77, 72, 81, 72,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Droit en U18.'
),
(
    'e0000000-0018-0003-0000-000000000115', 'c0000000-0018-0003-0000-000000000115', 'Tarik Sektioui', CURRENT_DATE - 6,
    83, 74, 85, 81, 92,
    93, 76, 95, 79, 87,
    76, 82, 90, 79, 81,
    79, 81, 73, 85, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Droit en U18.'
),
(
    'e0000000-0018-0003-0000-000000000116', 'c0000000-0018-0003-0000-000000000116', 'Tarik Sektioui', CURRENT_DATE - 7,
    88, 77, 87, 85, 73,
    95, 79, 81, 83, 89,
    79, 86, 92, 82, 85,
    82, 85, 74, 89, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Droit en U18.'
),
(
    'e0000000-0018-0004-0000-000000000117', 'c0000000-0018-0004-0000-000000000117', 'Tarik Sektioui', CURRENT_DATE - 1,
    93, 80, 89, 89, 76,
    79, 82, 83, 87, 91,
    82, 90, 94, 85, 89,
    85, 89, 75, 93, 89,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Gauche en U18.'
),
(
    'e0000000-0018-0004-0000-000000000118', 'c0000000-0018-0004-0000-000000000118', 'Tarik Sektioui', CURRENT_DATE - 2,
    76, 83, 91, 93, 79,
    81, 85, 85, 91, 93,
    85, 94, 75, 88, 93,
    88, 93, 76, 79, 90,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Gauche en U18.'
),
(
    'e0000000-0018-0005-0000-000000000119', 'c0000000-0018-0005-0000-000000000119', 'Tarik Sektioui', CURRENT_DATE - 3,
    81, 86, 70, 77, 82,
    83, 88, 87, 75, 73,
    88, 78, 77, 91, 77,
    91, 77, 77, 83, 77,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Gauche en U18.'
),
(
    'e0000000-0018-0005-0000-000000000120', 'c0000000-0018-0005-0000-000000000120', 'Tarik Sektioui', CURRENT_DATE - 4,
    86, 89, 72, 81, 85,
    85, 91, 89, 79, 75,
    91, 82, 79, 94, 81,
    94, 81, 78, 87, 78,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Gauche en U18.'
),
(
    'e0000000-0018-0006-0000-000000000121', 'c0000000-0018-0006-0000-000000000121', 'Tarik Sektioui', CURRENT_DATE - 5,
    91, 92, 74, 85, 88,
    87, 75, 91, 83, 77,
    94, 86, 81, 78, 85,
    78, 85, 79, 91, 79,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Défensif en U18.'
),
(
    'e0000000-0018-0006-0000-000000000122', 'c0000000-0018-0006-0000-000000000122', 'Tarik Sektioui', CURRENT_DATE - 6,
    96, 75, 76, 89, 91,
    89, 78, 93, 87, 79,
    77, 90, 83, 81, 89,
    81, 89, 80, 95, 80,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Défensif en U18.'
),
(
    'e0000000-0018-0007-0000-000000000123', 'c0000000-0018-0007-0000-000000000123', 'Tarik Sektioui', CURRENT_DATE - 7,
    79, 78, 78, 93, 72,
    91, 81, 95, 91, 81,
    80, 94, 85, 84, 93,
    84, 93, 81, 81, 81,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Droit en U18.'
),
(
    'e0000000-0018-0007-0000-000000000124', 'c0000000-0018-0007-0000-000000000124', 'Tarik Sektioui', CURRENT_DATE - 1,
    84, 81, 80, 77, 75,
    93, 84, 81, 75, 83,
    83, 78, 87, 87, 77,
    87, 77, 82, 85, 82,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Droit en U18.'
),
(
    'e0000000-0018-0008-0000-000000000125', 'c0000000-0018-0008-0000-000000000125', 'Tarik Sektioui', CURRENT_DATE - 2,
    89, 84, 82, 81, 78,
    95, 87, 83, 79, 85,
    86, 82, 89, 90, 81,
    90, 81, 68, 89, 83,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Gauche en U18.'
),
(
    'e0000000-0018-0008-0000-000000000126', 'c0000000-0018-0008-0000-000000000126', 'Tarik Sektioui', CURRENT_DATE - 3,
    94, 87, 84, 85, 81,
    79, 90, 85, 83, 87,
    89, 86, 91, 93, 85,
    93, 85, 69, 93, 68,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Gauche en U18.'
),
(
    'e0000000-0018-0009-0000-000000000127', 'c0000000-0018-0009-0000-000000000127', 'Tarik Sektioui', CURRENT_DATE - 4,
    77, 90, 86, 89, 84,
    81, 93, 87, 87, 89,
    92, 90, 93, 96, 89,
    96, 89, 87, 79, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Droit en U18.'
),
(
    'e0000000-0018-0009-0000-000000000128', 'c0000000-0018-0009-0000-000000000128', 'Tarik Sektioui', CURRENT_DATE - 5,
    82, 93, 88, 93, 87,
    83, 77, 89, 91, 91,
    95, 94, 95, 80, 93,
    80, 93, 88, 83, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Droit en U18.'
),
(
    'e0000000-0018-0010-0000-000000000129', 'c0000000-0018-0010-0000-000000000129', 'Tarik Sektioui', CURRENT_DATE - 6,
    87, 76, 90, 77, 90,
    85, 80, 91, 75, 93,
    78, 78, 76, 83, 77,
    83, 77, 89, 87, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Avant-Centre en U18.'
),
(
    'e0000000-0018-0010-0000-000000000130', 'c0000000-0018-0010-0000-000000000130', 'Tarik Sektioui', CURRENT_DATE - 7,
    92, 79, 92, 81, 93,
    87, 83, 93, 79, 73,
    81, 82, 78, 86, 81,
    86, 81, 90, 91, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Avant-Centre en U18.'
),
(
    'e0000000-0018-0011-0000-000000000131', 'c0000000-0018-0011-0000-000000000131', 'Tarik Sektioui', CURRENT_DATE - 1,
    75, 82, 71, 85, 74,
    89, 86, 95, 83, 75,
    84, 86, 80, 89, 85,
    89, 85, 91, 95, 73,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Gauche en U18.'
),
(
    'e0000000-0018-0011-0000-000000000132', 'c0000000-0018-0011-0000-000000000132', 'Tarik Sektioui', CURRENT_DATE - 2,
    80, 85, 73, 89, 77,
    91, 89, 81, 87, 77,
    87, 90, 82, 92, 89,
    92, 89, 92, 81, 74,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Gauche en U18.'
),
(
    'e0000000-0019-0001-0000-000000000133', 'c0000000-0019-0001-0000-000000000133', 'Hassan Benabicha', CURRENT_DATE - 2,
    86, 83, 78, 86, 81,
    86, 84, 88, 84, 80,
    85, 87, 83, 87, 86,
    87, 86, 69, 88, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Gardien de But en U19.'
),
(
    'e0000000-0019-0001-0000-000000000134', 'c0000000-0019-0001-0000-000000000134', 'Hassan Benabicha', CURRENT_DATE - 3,
    91, 86, 80, 90, 84,
    88, 87, 90, 88, 82,
    88, 91, 85, 90, 90,
    90, 90, 70, 92, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Gardien de But en U19.'
),
(
    'e0000000-0019-0002-0000-000000000135', 'c0000000-0019-0002-0000-000000000135', 'Hassan Benabicha', CURRENT_DATE - 4,
    96, 89, 82, 94, 87,
    90, 90, 92, 92, 84,
    91, 95, 87, 93, 94,
    93, 94, 71, 78, 71,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Droit en U19.'
),
(
    'e0000000-0019-0002-0000-000000000136', 'c0000000-0019-0002-0000-000000000136', 'Hassan Benabicha', CURRENT_DATE - 5,
    79, 92, 84, 78, 90,
    92, 93, 94, 76, 86,
    94, 79, 89, 96, 78,
    96, 78, 72, 82, 72,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Droit en U19.'
),
(
    'e0000000-0019-0003-0000-000000000137', 'c0000000-0019-0003-0000-000000000137', 'Hassan Benabicha', CURRENT_DATE - 6,
    84, 75, 86, 82, 93,
    94, 77, 80, 80, 88,
    77, 83, 91, 80, 82,
    80, 82, 73, 86, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Droit en U19.'
),
(
    'e0000000-0019-0003-0000-000000000138', 'c0000000-0019-0003-0000-000000000138', 'Hassan Benabicha', CURRENT_DATE - 7,
    89, 78, 88, 86, 74,
    78, 80, 82, 84, 90,
    80, 87, 93, 83, 86,
    83, 86, 74, 90, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Droit en U19.'
),
(
    'e0000000-0019-0004-0000-000000000139', 'c0000000-0019-0004-0000-000000000139', 'Hassan Benabicha', CURRENT_DATE - 1,
    94, 81, 90, 90, 77,
    80, 83, 84, 88, 92,
    83, 91, 95, 86, 90,
    86, 90, 75, 94, 89,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Gauche en U19.'
),
(
    'e0000000-0019-0004-0000-000000000140', 'c0000000-0019-0004-0000-000000000140', 'Hassan Benabicha', CURRENT_DATE - 2,
    77, 84, 92, 94, 80,
    82, 86, 86, 92, 72,
    86, 95, 76, 89, 94,
    89, 94, 76, 80, 90,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Gauche en U19.'
),
(
    'e0000000-0019-0005-0000-000000000141', 'c0000000-0019-0005-0000-000000000141', 'Hassan Benabicha', CURRENT_DATE - 3,
    82, 87, 71, 78, 83,
    84, 89, 88, 76, 74,
    89, 79, 78, 92, 78,
    92, 78, 77, 84, 77,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Gauche en U19.'
),
(
    'e0000000-0019-0005-0000-000000000142', 'c0000000-0019-0005-0000-000000000142', 'Hassan Benabicha', CURRENT_DATE - 4,
    87, 90, 73, 82, 86,
    86, 92, 90, 80, 76,
    92, 83, 80, 95, 82,
    95, 82, 78, 88, 78,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Gauche en U19.'
),
(
    'e0000000-0019-0006-0000-000000000143', 'c0000000-0019-0006-0000-000000000143', 'Hassan Benabicha', CURRENT_DATE - 5,
    92, 93, 75, 86, 89,
    88, 76, 92, 84, 78,
    95, 87, 82, 79, 86,
    79, 86, 79, 92, 79,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Défensif en U19.'
),
(
    'e0000000-0019-0006-0000-000000000144', 'c0000000-0019-0006-0000-000000000144', 'Hassan Benabicha', CURRENT_DATE - 6,
    75, 76, 77, 90, 92,
    90, 79, 94, 88, 80,
    78, 91, 84, 82, 90,
    82, 90, 80, 78, 80,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Défensif en U19.'
),
(
    'e0000000-0019-0007-0000-000000000145', 'c0000000-0019-0007-0000-000000000145', 'Hassan Benabicha', CURRENT_DATE - 7,
    80, 79, 79, 94, 73,
    92, 82, 80, 92, 82,
    81, 95, 86, 85, 94,
    85, 94, 81, 82, 81,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Droit en U19.'
),
(
    'e0000000-0019-0007-0000-000000000146', 'c0000000-0019-0007-0000-000000000146', 'Hassan Benabicha', CURRENT_DATE - 1,
    85, 82, 81, 78, 76,
    94, 85, 82, 76, 84,
    84, 79, 88, 88, 78,
    88, 78, 82, 86, 82,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Droit en U19.'
),
(
    'e0000000-0019-0008-0000-000000000147', 'c0000000-0019-0008-0000-000000000147', 'Hassan Benabicha', CURRENT_DATE - 2,
    90, 85, 83, 82, 79,
    78, 88, 84, 80, 86,
    87, 83, 90, 91, 82,
    91, 82, 68, 90, 83,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Gauche en U19.'
),
(
    'e0000000-0019-0008-0000-000000000148', 'c0000000-0019-0008-0000-000000000148', 'Hassan Benabicha', CURRENT_DATE - 3,
    95, 88, 85, 86, 82,
    80, 91, 86, 84, 88,
    90, 87, 92, 94, 86,
    94, 86, 69, 94, 68,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Gauche en U19.'
),
(
    'e0000000-0019-0009-0000-000000000149', 'c0000000-0019-0009-0000-000000000149', 'Hassan Benabicha', CURRENT_DATE - 4,
    78, 91, 87, 90, 85,
    82, 75, 88, 88, 90,
    93, 91, 94, 78, 90,
    78, 90, 87, 80, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Droit en U19.'
),
(
    'e0000000-0019-0009-0000-000000000150', 'c0000000-0019-0009-0000-000000000150', 'Hassan Benabicha', CURRENT_DATE - 5,
    83, 74, 89, 94, 88,
    84, 78, 90, 92, 92,
    76, 95, 75, 81, 94,
    81, 94, 88, 84, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Droit en U19.'
),
(
    'e0000000-0019-0010-0000-000000000151', 'c0000000-0019-0010-0000-000000000151', 'Hassan Benabicha', CURRENT_DATE - 6,
    88, 77, 91, 78, 91,
    86, 81, 92, 76, 72,
    79, 79, 77, 84, 78,
    84, 78, 89, 88, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Avant-Centre en U19.'
),
(
    'e0000000-0019-0010-0000-000000000152', 'c0000000-0019-0010-0000-000000000152', 'Hassan Benabicha', CURRENT_DATE - 7,
    93, 80, 70, 82, 72,
    88, 84, 94, 80, 74,
    82, 83, 79, 87, 82,
    87, 82, 90, 92, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Avant-Centre en U19.'
),
(
    'e0000000-0019-0011-0000-000000000153', 'c0000000-0019-0011-0000-000000000153', 'Hassan Benabicha', CURRENT_DATE - 1,
    76, 83, 72, 86, 75,
    90, 87, 80, 84, 76,
    85, 87, 81, 90, 86,
    90, 86, 91, 78, 73,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Gauche en U19.'
),
(
    'e0000000-0019-0011-0000-000000000154', 'c0000000-0019-0011-0000-000000000154', 'Hassan Benabicha', CURRENT_DATE - 2,
    81, 86, 74, 90, 78,
    92, 90, 82, 88, 78,
    88, 91, 83, 93, 90,
    93, 90, 92, 82, 74,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Gauche en U19.'
),
(
    'e0000000-0020-0001-0000-000000000155', 'c0000000-0020-0001-0000-000000000155', 'Hassan Benabicha', CURRENT_DATE - 2,
    87, 84, 79, 87, 82,
    87, 85, 89, 85, 81,
    86, 88, 84, 88, 87,
    88, 87, 69, 89, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Gardien de But en U20.'
),
(
    'e0000000-0020-0001-0000-000000000156', 'c0000000-0020-0001-0000-000000000156', 'Hassan Benabicha', CURRENT_DATE - 3,
    92, 87, 81, 91, 85,
    89, 88, 91, 89, 83,
    89, 92, 86, 91, 91,
    91, 91, 70, 93, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Gardien de But en U20.'
),
(
    'e0000000-0020-0002-0000-000000000157', 'c0000000-0020-0002-0000-000000000157', 'Hassan Benabicha', CURRENT_DATE - 4,
    75, 90, 83, 95, 88,
    91, 91, 93, 93, 85,
    92, 96, 88, 94, 95,
    94, 95, 71, 79, 71,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Droit en U20.'
),
(
    'e0000000-0020-0002-0000-000000000158', 'c0000000-0020-0002-0000-000000000158', 'Hassan Benabicha', CURRENT_DATE - 5,
    80, 93, 85, 79, 91,
    93, 75, 95, 77, 87,
    95, 80, 90, 78, 79,
    78, 79, 72, 83, 72,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Droit en U20.'
),
(
    'e0000000-0020-0003-0000-000000000159', 'c0000000-0020-0003-0000-000000000159', 'Hassan Benabicha', CURRENT_DATE - 6,
    85, 76, 87, 83, 72,
    95, 78, 81, 81, 89,
    78, 84, 92, 81, 83,
    81, 83, 73, 87, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Droit en U20.'
),
(
    'e0000000-0020-0003-0000-000000000160', 'c0000000-0020-0003-0000-000000000160', 'Hassan Benabicha', CURRENT_DATE - 7,
    90, 79, 89, 87, 75,
    79, 81, 83, 85, 91,
    81, 88, 94, 84, 87,
    84, 87, 74, 91, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Droit en U20.'
),
(
    'e0000000-0020-0004-0000-000000000161', 'c0000000-0020-0004-0000-000000000161', 'Hassan Benabicha', CURRENT_DATE - 1,
    95, 82, 91, 91, 78,
    81, 84, 85, 89, 93,
    84, 92, 75, 87, 91,
    87, 91, 75, 95, 89,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Gauche en U20.'
),
(
    'e0000000-0020-0004-0000-000000000162', 'c0000000-0020-0004-0000-000000000162', 'Hassan Benabicha', CURRENT_DATE - 2,
    78, 85, 70, 95, 81,
    83, 87, 87, 93, 73,
    87, 96, 77, 90, 95,
    90, 95, 76, 81, 90,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Gauche en U20.'
),
(
    'e0000000-0020-0005-0000-000000000163', 'c0000000-0020-0005-0000-000000000163', 'Hassan Benabicha', CURRENT_DATE - 3,
    83, 88, 72, 79, 84,
    85, 90, 89, 77, 75,
    90, 80, 79, 93, 79,
    93, 79, 77, 85, 77,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Gauche en U20.'
),
(
    'e0000000-0020-0005-0000-000000000164', 'c0000000-0020-0005-0000-000000000164', 'Hassan Benabicha', CURRENT_DATE - 4,
    88, 91, 74, 83, 87,
    87, 93, 91, 81, 77,
    93, 84, 81, 96, 83,
    96, 83, 78, 89, 78,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Gauche en U20.'
),
(
    'e0000000-0020-0006-0000-000000000165', 'c0000000-0020-0006-0000-000000000165', 'Hassan Benabicha', CURRENT_DATE - 5,
    93, 74, 76, 87, 90,
    89, 77, 93, 85, 79,
    76, 88, 83, 80, 87,
    80, 87, 79, 93, 79,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Défensif en U20.'
),
(
    'e0000000-0020-0006-0000-000000000166', 'c0000000-0020-0006-0000-000000000166', 'Hassan Benabicha', CURRENT_DATE - 6,
    76, 77, 78, 91, 93,
    91, 80, 95, 89, 81,
    79, 92, 85, 83, 91,
    83, 91, 80, 79, 80,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Défensif en U20.'
),
(
    'e0000000-0020-0007-0000-000000000167', 'c0000000-0020-0007-0000-000000000167', 'Hassan Benabicha', CURRENT_DATE - 7,
    81, 80, 80, 95, 74,
    93, 83, 81, 93, 83,
    82, 96, 87, 86, 95,
    86, 95, 81, 83, 81,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Droit en U20.'
),
(
    'e0000000-0020-0007-0000-000000000168', 'c0000000-0020-0007-0000-000000000168', 'Hassan Benabicha', CURRENT_DATE - 1,
    86, 83, 82, 79, 77,
    95, 86, 83, 77, 85,
    85, 80, 89, 89, 79,
    89, 79, 82, 87, 82,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Droit en U20.'
),
(
    'e0000000-0020-0008-0000-000000000169', 'c0000000-0020-0008-0000-000000000169', 'Hassan Benabicha', CURRENT_DATE - 2,
    91, 86, 84, 83, 80,
    79, 89, 85, 81, 87,
    88, 84, 91, 92, 83,
    92, 83, 68, 91, 83,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Gauche en U20.'
),
(
    'e0000000-0020-0008-0000-000000000170', 'c0000000-0020-0008-0000-000000000170', 'Hassan Benabicha', CURRENT_DATE - 3,
    96, 89, 86, 87, 83,
    81, 92, 87, 85, 89,
    91, 88, 93, 95, 87,
    95, 87, 69, 95, 68,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Gauche en U20.'
),
(
    'e0000000-0020-0009-0000-000000000171', 'c0000000-0020-0009-0000-000000000171', 'Hassan Benabicha', CURRENT_DATE - 4,
    79, 92, 88, 91, 86,
    83, 76, 89, 89, 91,
    94, 92, 95, 79, 91,
    79, 91, 87, 81, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Droit en U20.'
),
(
    'e0000000-0020-0009-0000-000000000172', 'c0000000-0020-0009-0000-000000000172', 'Hassan Benabicha', CURRENT_DATE - 5,
    84, 75, 90, 95, 89,
    85, 79, 91, 93, 93,
    77, 96, 76, 82, 95,
    82, 95, 88, 85, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Droit en U20.'
),
(
    'e0000000-0020-0010-0000-000000000173', 'c0000000-0020-0010-0000-000000000173', 'Hassan Benabicha', CURRENT_DATE - 6,
    89, 78, 92, 79, 92,
    87, 82, 93, 77, 73,
    80, 80, 78, 85, 79,
    85, 79, 89, 89, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Avant-Centre en U20.'
),
(
    'e0000000-0020-0010-0000-000000000174', 'c0000000-0020-0010-0000-000000000174', 'Hassan Benabicha', CURRENT_DATE - 7,
    94, 81, 71, 83, 73,
    89, 85, 95, 81, 75,
    83, 84, 80, 88, 83,
    88, 83, 90, 93, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Avant-Centre en U20.'
),
(
    'e0000000-0020-0011-0000-000000000175', 'c0000000-0020-0011-0000-000000000175', 'Hassan Benabicha', CURRENT_DATE - 1,
    77, 84, 73, 87, 76,
    91, 88, 81, 85, 77,
    86, 88, 82, 91, 87,
    91, 87, 91, 79, 73,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Gauche en U20.'
),
(
    'e0000000-0020-0011-0000-000000000176', 'c0000000-0020-0011-0000-000000000176', 'Hassan Benabicha', CURRENT_DATE - 2,
    82, 87, 75, 91, 79,
    93, 91, 83, 89, 79,
    89, 92, 84, 94, 91,
    94, 91, 92, 83, 74,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Gauche en U20.'
),
(
    'e0000000-0021-0001-0000-000000000177', 'c0000000-0021-0001-0000-000000000177', 'Hassan Benabicha', CURRENT_DATE - 2,
    88, 85, 80, 88, 83,
    88, 86, 90, 86, 82,
    87, 89, 85, 89, 88,
    89, 88, 69, 90, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Gardien de But en U21.'
),
(
    'e0000000-0021-0001-0000-000000000178', 'c0000000-0021-0001-0000-000000000178', 'Hassan Benabicha', CURRENT_DATE - 3,
    93, 88, 82, 92, 86,
    90, 89, 92, 90, 84,
    90, 93, 87, 92, 92,
    92, 92, 70, 94, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Gardien de But en U21.'
),
(
    'e0000000-0021-0002-0000-000000000179', 'c0000000-0021-0002-0000-000000000179', 'Hassan Benabicha', CURRENT_DATE - 4,
    76, 91, 84, 76, 89,
    92, 92, 94, 74, 86,
    93, 77, 89, 95, 76,
    95, 76, 71, 80, 71,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Droit en U21.'
),
(
    'e0000000-0021-0002-0000-000000000180', 'c0000000-0021-0002-0000-000000000180', 'Hassan Benabicha', CURRENT_DATE - 5,
    81, 74, 86, 80, 92,
    94, 76, 80, 78, 88,
    76, 81, 91, 79, 80,
    79, 80, 72, 84, 72,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Droit en U21.'
),
(
    'e0000000-0021-0003-0000-000000000181', 'c0000000-0021-0003-0000-000000000181', 'Hassan Benabicha', CURRENT_DATE - 6,
    86, 77, 88, 84, 73,
    78, 79, 82, 82, 90,
    79, 85, 93, 82, 84,
    82, 84, 73, 88, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Droit en U21.'
),
(
    'e0000000-0021-0003-0000-000000000182', 'c0000000-0021-0003-0000-000000000182', 'Hassan Benabicha', CURRENT_DATE - 7,
    91, 80, 90, 88, 76,
    80, 82, 84, 86, 92,
    82, 89, 95, 85, 88,
    85, 88, 74, 92, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Droit en U21.'
),
(
    'e0000000-0021-0004-0000-000000000183', 'c0000000-0021-0004-0000-000000000183', 'Hassan Benabicha', CURRENT_DATE - 1,
    96, 83, 92, 92, 79,
    82, 85, 86, 90, 72,
    85, 93, 76, 88, 92,
    88, 92, 75, 78, 89,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Gauche en U21.'
),
(
    'e0000000-0021-0004-0000-000000000184', 'c0000000-0021-0004-0000-000000000184', 'Hassan Benabicha', CURRENT_DATE - 2,
    79, 86, 71, 76, 82,
    84, 88, 88, 74, 74,
    88, 77, 78, 91, 76,
    91, 76, 76, 82, 90,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Gauche en U21.'
),
(
    'e0000000-0021-0005-0000-000000000185', 'c0000000-0021-0005-0000-000000000185', 'Hassan Benabicha', CURRENT_DATE - 3,
    84, 89, 73, 80, 85,
    86, 91, 90, 78, 76,
    91, 81, 80, 94, 80,
    94, 80, 77, 86, 77,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Gauche en U21.'
),
(
    'e0000000-0021-0005-0000-000000000186', 'c0000000-0021-0005-0000-000000000186', 'Hassan Benabicha', CURRENT_DATE - 4,
    89, 92, 75, 84, 88,
    88, 75, 92, 82, 78,
    94, 85, 82, 78, 84,
    78, 84, 78, 90, 78,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Gauche en U21.'
),
(
    'e0000000-0021-0006-0000-000000000187', 'c0000000-0021-0006-0000-000000000187', 'Hassan Benabicha', CURRENT_DATE - 5,
    94, 75, 77, 88, 91,
    90, 78, 94, 86, 80,
    77, 89, 84, 81, 88,
    81, 88, 79, 94, 79,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Défensif en U21.'
),
(
    'e0000000-0021-0006-0000-000000000188', 'c0000000-0021-0006-0000-000000000188', 'Hassan Benabicha', CURRENT_DATE - 6,
    77, 78, 79, 92, 72,
    92, 81, 80, 90, 82,
    80, 93, 86, 84, 92,
    84, 92, 80, 80, 80,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Défensif en U21.'
),
(
    'e0000000-0021-0007-0000-000000000189', 'c0000000-0021-0007-0000-000000000189', 'Hassan Benabicha', CURRENT_DATE - 7,
    82, 81, 81, 76, 75,
    94, 84, 82, 74, 84,
    83, 77, 88, 87, 76,
    87, 76, 81, 84, 81,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Droit en U21.'
),
(
    'e0000000-0021-0007-0000-000000000190', 'c0000000-0021-0007-0000-000000000190', 'Hassan Benabicha', CURRENT_DATE - 1,
    87, 84, 83, 80, 78,
    78, 87, 84, 78, 86,
    86, 81, 90, 90, 80,
    90, 80, 82, 88, 82,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Droit en U21.'
),
(
    'e0000000-0021-0008-0000-000000000191', 'c0000000-0021-0008-0000-000000000191', 'Hassan Benabicha', CURRENT_DATE - 2,
    92, 87, 85, 84, 81,
    80, 90, 86, 82, 88,
    89, 85, 92, 93, 84,
    93, 84, 68, 92, 83,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Gauche en U21.'
),
(
    'e0000000-0021-0008-0000-000000000192', 'c0000000-0021-0008-0000-000000000192', 'Hassan Benabicha', CURRENT_DATE - 3,
    75, 90, 87, 88, 84,
    82, 93, 88, 86, 90,
    92, 89, 94, 96, 88,
    96, 88, 69, 78, 68,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Gauche en U21.'
),
(
    'e0000000-0021-0009-0000-000000000193', 'c0000000-0021-0009-0000-000000000193', 'Hassan Benabicha', CURRENT_DATE - 4,
    80, 93, 89, 92, 87,
    84, 77, 90, 90, 92,
    95, 93, 75, 80, 92,
    80, 92, 87, 82, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Droit en U21.'
),
(
    'e0000000-0021-0009-0000-000000000194', 'c0000000-0021-0009-0000-000000000194', 'Hassan Benabicha', CURRENT_DATE - 5,
    85, 76, 91, 76, 90,
    86, 80, 92, 74, 72,
    78, 77, 77, 83, 76,
    83, 76, 88, 86, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Droit en U21.'
),
(
    'e0000000-0021-0010-0000-000000000195', 'c0000000-0021-0010-0000-000000000195', 'Hassan Benabicha', CURRENT_DATE - 6,
    90, 79, 70, 80, 93,
    88, 83, 94, 78, 74,
    81, 81, 79, 86, 80,
    86, 80, 89, 90, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Avant-Centre en U21.'
),
(
    'e0000000-0021-0010-0000-000000000196', 'c0000000-0021-0010-0000-000000000196', 'Hassan Benabicha', CURRENT_DATE - 7,
    95, 82, 72, 84, 74,
    90, 86, 80, 82, 76,
    84, 85, 81, 89, 84,
    89, 84, 90, 94, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Avant-Centre en U21.'
),
(
    'e0000000-0021-0011-0000-000000000197', 'c0000000-0021-0011-0000-000000000197', 'Hassan Benabicha', CURRENT_DATE - 1,
    78, 85, 74, 88, 77,
    92, 89, 82, 86, 78,
    87, 89, 83, 92, 88,
    92, 88, 91, 80, 73,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Gauche en U21.'
),
(
    'e0000000-0021-0011-0000-000000000198', 'c0000000-0021-0011-0000-000000000198', 'Hassan Benabicha', CURRENT_DATE - 2,
    83, 88, 76, 92, 80,
    94, 92, 84, 90, 80,
    90, 93, 85, 95, 92,
    95, 92, 92, 84, 74,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Gauche en U21.'
),
(
    'e0000000-0022-0001-0000-000000000199', 'c0000000-0022-0001-0000-000000000199', 'Youssef Safri', CURRENT_DATE - 2,
    89, 86, 81, 89, 84,
    89, 87, 91, 87, 83,
    88, 90, 86, 90, 89,
    90, 89, 69, 91, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Gardien de But en U22.'
),
(
    'e0000000-0022-0001-0000-000000000200', 'c0000000-0022-0001-0000-000000000200', 'Youssef Safri', CURRENT_DATE - 3,
    94, 89, 83, 93, 87,
    91, 90, 93, 91, 85,
    91, 94, 88, 93, 93,
    93, 93, 70, 95, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Gardien de But en U22.'
),
(
    'e0000000-0022-0002-0000-000000000201', 'c0000000-0022-0002-0000-000000000201', 'Youssef Safri', CURRENT_DATE - 4,
    77, 92, 85, 77, 90,
    93, 93, 95, 75, 87,
    94, 78, 90, 96, 77,
    96, 77, 71, 81, 71,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Droit en U22.'
),
(
    'e0000000-0022-0002-0000-000000000202', 'c0000000-0022-0002-0000-000000000202', 'Youssef Safri', CURRENT_DATE - 5,
    82, 75, 87, 81, 93,
    95, 77, 81, 79, 89,
    77, 82, 92, 80, 81,
    80, 81, 72, 85, 72,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Droit en U22.'
),
(
    'e0000000-0022-0003-0000-000000000203', 'c0000000-0022-0003-0000-000000000203', 'Youssef Safri', CURRENT_DATE - 6,
    87, 78, 89, 85, 74,
    79, 80, 83, 83, 91,
    80, 86, 94, 83, 85,
    83, 85, 73, 89, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Droit en U22.'
),
(
    'e0000000-0022-0003-0000-000000000204', 'c0000000-0022-0003-0000-000000000204', 'Youssef Safri', CURRENT_DATE - 7,
    92, 81, 91, 89, 77,
    81, 83, 85, 87, 93,
    83, 90, 75, 86, 89,
    86, 89, 74, 93, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Droit en U22.'
),
(
    'e0000000-0022-0004-0000-000000000205', 'c0000000-0022-0004-0000-000000000205', 'Youssef Safri', CURRENT_DATE - 1,
    75, 84, 70, 93, 80,
    83, 86, 87, 91, 73,
    86, 94, 77, 89, 93,
    89, 93, 75, 79, 89,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Gauche en U22.'
),
(
    'e0000000-0022-0004-0000-000000000206', 'c0000000-0022-0004-0000-000000000206', 'Youssef Safri', CURRENT_DATE - 2,
    80, 87, 72, 77, 83,
    85, 89, 89, 75, 75,
    89, 78, 79, 92, 77,
    92, 77, 76, 83, 90,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Gauche en U22.'
),
(
    'e0000000-0022-0005-0000-000000000207', 'c0000000-0022-0005-0000-000000000207', 'Youssef Safri', CURRENT_DATE - 3,
    85, 90, 74, 81, 86,
    87, 92, 91, 79, 77,
    92, 82, 81, 95, 81,
    95, 81, 77, 87, 77,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Gauche en U22.'
),
(
    'e0000000-0022-0005-0000-000000000208', 'c0000000-0022-0005-0000-000000000208', 'Youssef Safri', CURRENT_DATE - 4,
    90, 93, 76, 85, 89,
    89, 76, 93, 83, 79,
    95, 86, 83, 79, 85,
    79, 85, 78, 91, 78,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Gauche en U22.'
),
(
    'e0000000-0022-0006-0000-000000000209', 'c0000000-0022-0006-0000-000000000209', 'Youssef Safri', CURRENT_DATE - 5,
    95, 76, 78, 89, 92,
    91, 79, 95, 87, 81,
    78, 90, 85, 82, 89,
    82, 89, 79, 95, 79,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Défensif en U22.'
),
(
    'e0000000-0022-0006-0000-000000000210', 'c0000000-0022-0006-0000-000000000210', 'Youssef Safri', CURRENT_DATE - 6,
    78, 79, 80, 93, 73,
    93, 82, 81, 91, 83,
    81, 94, 87, 85, 93,
    85, 93, 80, 81, 80,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Défensif en U22.'
),
(
    'e0000000-0022-0007-0000-000000000211', 'c0000000-0022-0007-0000-000000000211', 'Youssef Safri', CURRENT_DATE - 7,
    83, 82, 82, 77, 76,
    95, 85, 83, 75, 85,
    84, 78, 89, 88, 77,
    88, 77, 81, 85, 81,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Droit en U22.'
),
(
    'e0000000-0022-0007-0000-000000000212', 'c0000000-0022-0007-0000-000000000212', 'Youssef Safri', CURRENT_DATE - 1,
    88, 85, 84, 81, 79,
    79, 88, 85, 79, 87,
    87, 82, 91, 91, 81,
    91, 81, 82, 89, 82,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Droit en U22.'
),
(
    'e0000000-0022-0008-0000-000000000213', 'c0000000-0022-0008-0000-000000000213', 'Youssef Safri', CURRENT_DATE - 2,
    93, 88, 86, 85, 82,
    81, 91, 87, 83, 89,
    90, 86, 93, 94, 85,
    94, 85, 68, 93, 83,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Gauche en U22.'
),
(
    'e0000000-0022-0008-0000-000000000214', 'c0000000-0022-0008-0000-000000000214', 'Youssef Safri', CURRENT_DATE - 3,
    76, 91, 88, 89, 85,
    83, 75, 89, 87, 91,
    93, 90, 95, 78, 89,
    78, 89, 69, 79, 68,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Gauche en U22.'
),
(
    'e0000000-0022-0009-0000-000000000215', 'c0000000-0022-0009-0000-000000000215', 'Youssef Safri', CURRENT_DATE - 4,
    81, 74, 90, 93, 88,
    85, 78, 91, 91, 93,
    76, 94, 76, 81, 93,
    81, 93, 87, 83, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Droit en U22.'
),
(
    'e0000000-0022-0009-0000-000000000216', 'c0000000-0022-0009-0000-000000000216', 'Youssef Safri', CURRENT_DATE - 5,
    86, 77, 92, 77, 91,
    87, 81, 93, 75, 73,
    79, 78, 78, 84, 77,
    84, 77, 88, 87, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Droit en U22.'
),
(
    'e0000000-0022-0010-0000-000000000217', 'c0000000-0022-0010-0000-000000000217', 'Youssef Safri', CURRENT_DATE - 6,
    91, 80, 71, 81, 72,
    89, 84, 95, 79, 75,
    82, 82, 80, 87, 81,
    87, 81, 89, 91, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Avant-Centre en U22.'
),
(
    'e0000000-0022-0010-0000-000000000218', 'c0000000-0022-0010-0000-000000000218', 'Youssef Safri', CURRENT_DATE - 7,
    96, 83, 73, 85, 75,
    91, 87, 81, 83, 77,
    85, 86, 82, 90, 85,
    90, 85, 90, 95, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Avant-Centre en U22.'
),
(
    'e0000000-0022-0011-0000-000000000219', 'c0000000-0022-0011-0000-000000000219', 'Youssef Safri', CURRENT_DATE - 1,
    79, 86, 75, 89, 78,
    93, 90, 83, 87, 79,
    88, 90, 84, 93, 89,
    93, 89, 91, 81, 73,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Gauche en U22.'
),
(
    'e0000000-0022-0011-0000-000000000220', 'c0000000-0022-0011-0000-000000000220', 'Youssef Safri', CURRENT_DATE - 2,
    84, 89, 77, 93, 81,
    95, 93, 85, 91, 81,
    91, 94, 86, 96, 93,
    96, 93, 92, 85, 74,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Gauche en U22.'
),
(
    'e0000000-0023-0001-0000-000000000221', 'c0000000-0023-0001-0000-000000000221', 'Youssef Safri', CURRENT_DATE - 2,
    90, 87, 82, 90, 85,
    90, 88, 92, 88, 84,
    89, 91, 87, 91, 90,
    91, 90, 69, 92, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Gardien de But en U23.'
),
(
    'e0000000-0023-0001-0000-000000000222', 'c0000000-0023-0001-0000-000000000222', 'Youssef Safri', CURRENT_DATE - 3,
    95, 90, 84, 94, 88,
    92, 91, 94, 92, 86,
    92, 95, 89, 94, 94,
    94, 94, 70, 78, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Gardien de But en U23.'
),
(
    'e0000000-0023-0002-0000-000000000223', 'c0000000-0023-0002-0000-000000000223', 'Youssef Safri', CURRENT_DATE - 4,
    78, 93, 86, 78, 91,
    94, 75, 80, 76, 88,
    95, 79, 91, 78, 78,
    78, 78, 71, 82, 71,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Droit en U23.'
),
(
    'e0000000-0023-0002-0000-000000000224', 'c0000000-0023-0002-0000-000000000224', 'Youssef Safri', CURRENT_DATE - 5,
    83, 76, 88, 82, 72,
    78, 78, 82, 80, 90,
    78, 83, 93, 81, 82,
    81, 82, 72, 86, 72,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Droit en U23.'
),
(
    'e0000000-0023-0003-0000-000000000225', 'c0000000-0023-0003-0000-000000000225', 'Youssef Safri', CURRENT_DATE - 6,
    88, 79, 90, 86, 75,
    80, 81, 84, 84, 92,
    81, 87, 95, 84, 86,
    84, 86, 73, 90, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Droit en U23.'
),
(
    'e0000000-0023-0003-0000-000000000226', 'c0000000-0023-0003-0000-000000000226', 'Youssef Safri', CURRENT_DATE - 7,
    93, 82, 92, 90, 78,
    82, 84, 86, 88, 72,
    84, 91, 76, 87, 90,
    87, 90, 74, 94, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Droit en U23.'
),
(
    'e0000000-0023-0004-0000-000000000227', 'c0000000-0023-0004-0000-000000000227', 'Youssef Safri', CURRENT_DATE - 1,
    76, 85, 71, 94, 81,
    84, 87, 88, 92, 74,
    87, 95, 78, 90, 94,
    90, 94, 75, 80, 89,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Défenseur Central Gauche en U23.'
),
(
    'e0000000-0023-0004-0000-000000000228', 'c0000000-0023-0004-0000-000000000228', 'Youssef Safri', CURRENT_DATE - 2,
    81, 88, 73, 78, 84,
    86, 90, 90, 76, 76,
    90, 79, 80, 93, 78,
    93, 78, 76, 84, 90,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Défenseur Central Gauche en U23.'
),
(
    'e0000000-0023-0005-0000-000000000229', 'c0000000-0023-0005-0000-000000000229', 'Youssef Safri', CURRENT_DATE - 3,
    86, 91, 75, 82, 87,
    88, 93, 92, 80, 78,
    93, 83, 82, 96, 82,
    96, 82, 77, 88, 77,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Latéral Gauche en U23.'
),
(
    'e0000000-0023-0005-0000-000000000230', 'c0000000-0023-0005-0000-000000000230', 'Youssef Safri', CURRENT_DATE - 4,
    91, 74, 77, 86, 90,
    90, 77, 94, 84, 80,
    76, 87, 84, 80, 86,
    80, 86, 78, 92, 78,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Latéral Gauche en U23.'
),
(
    'e0000000-0023-0006-0000-000000000231', 'c0000000-0023-0006-0000-000000000231', 'Youssef Safri', CURRENT_DATE - 5,
    96, 77, 79, 90, 93,
    92, 80, 80, 88, 82,
    79, 91, 86, 83, 90,
    83, 90, 79, 78, 79,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Défensif en U23.'
),
(
    'e0000000-0023-0006-0000-000000000232', 'c0000000-0023-0006-0000-000000000232', 'Youssef Safri', CURRENT_DATE - 6,
    79, 80, 81, 94, 74,
    94, 83, 82, 92, 84,
    82, 95, 88, 86, 94,
    86, 94, 80, 82, 80,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Défensif en U23.'
),
(
    'e0000000-0023-0007-0000-000000000233', 'c0000000-0023-0007-0000-000000000233', 'Youssef Safri', CURRENT_DATE - 7,
    84, 83, 83, 78, 77,
    78, 86, 84, 76, 86,
    85, 79, 90, 89, 78,
    89, 78, 81, 86, 81,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Droit en U23.'
),
(
    'e0000000-0023-0007-0000-000000000234', 'c0000000-0023-0007-0000-000000000234', 'Youssef Safri', CURRENT_DATE - 1,
    89, 86, 85, 82, 80,
    80, 89, 86, 80, 88,
    88, 83, 92, 92, 82,
    92, 82, 82, 90, 82,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Droit en U23.'
),
(
    'e0000000-0023-0008-0000-000000000235', 'c0000000-0023-0008-0000-000000000235', 'Youssef Safri', CURRENT_DATE - 2,
    94, 89, 87, 86, 83,
    82, 92, 88, 84, 90,
    91, 87, 94, 95, 86,
    95, 86, 68, 94, 83,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Milieu Central Gauche en U23.'
),
(
    'e0000000-0023-0008-0000-000000000236', 'c0000000-0023-0008-0000-000000000236', 'Youssef Safri', CURRENT_DATE - 3,
    77, 92, 89, 90, 86,
    84, 76, 90, 88, 92,
    94, 91, 75, 79, 90,
    79, 90, 69, 80, 68,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Milieu Central Gauche en U23.'
),
(
    'e0000000-0023-0009-0000-000000000237', 'c0000000-0023-0009-0000-000000000237', 'Youssef Safri', CURRENT_DATE - 4,
    82, 75, 91, 94, 89,
    86, 79, 92, 92, 72,
    77, 95, 77, 82, 94,
    82, 94, 87, 84, 69,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Droit en U23.'
),
(
    'e0000000-0023-0009-0000-000000000238', 'c0000000-0023-0009-0000-000000000238', 'Youssef Safri', CURRENT_DATE - 5,
    87, 78, 70, 78, 92,
    88, 82, 94, 76, 74,
    80, 79, 79, 85, 78,
    85, 78, 88, 88, 70,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Droit en U23.'
),
(
    'e0000000-0023-0010-0000-000000000239', 'c0000000-0023-0010-0000-000000000239', 'Youssef Safri', CURRENT_DATE - 6,
    92, 81, 72, 82, 73,
    90, 85, 80, 80, 76,
    83, 83, 81, 88, 82,
    88, 82, 89, 92, 87,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Avant-Centre en U23.'
),
(
    'e0000000-0023-0010-0000-000000000240', 'c0000000-0023-0010-0000-000000000240', 'Youssef Safri', CURRENT_DATE - 7,
    75, 84, 74, 86, 76,
    92, 88, 82, 84, 78,
    86, 87, 83, 91, 86,
    91, 86, 90, 78, 88,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Avant-Centre en U23.'
),
(
    'e0000000-0023-0011-0000-000000000241', 'c0000000-0023-0011-0000-000000000241', 'Youssef Safri', CURRENT_DATE - 1,
    80, 87, 76, 90, 79,
    94, 91, 84, 88, 80,
    89, 91, 85, 94, 90,
    94, 90, 91, 82, 73,
    'sign_immediately', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Titulaire N°1 au poste Ailier Gauche en U23.'
),
(
    'e0000000-0023-0011-0000-000000000242', 'c0000000-0023-0011-0000-000000000242', 'Youssef Safri', CURRENT_DATE - 2,
    85, 90, 78, 94, 82,
    78, 75, 86, 92, 82,
    92, 95, 87, 78, 94,
    78, 94, 92, 86, 74,
    'second_trial', 'Qualité technique, discipline, vision', 'Régularité dans l''intensité', 'Profil Doublure N°2 au poste Ailier Gauche en U23.'
)
ON CONFLICT (id) DO UPDATE SET
    evaluator_name = EXCLUDED.evaluator_name,
    evaluation_date = EXCLUDED.evaluation_date,
    phys_speed = EXCLUDED.phys_speed,
    phys_endurance = EXCLUDED.phys_endurance,
    phys_strength = EXCLUDED.phys_strength,
    phys_agility = EXCLUDED.phys_agility,
    phys_jump = EXCLUDED.phys_jump,
    ment_determination = EXCLUDED.ment_determination,
    ment_focus = EXCLUDED.ment_focus,
    ment_teamwork = EXCLUDED.ment_teamwork,
    ment_composure = EXCLUDED.ment_composure,
    ment_leadership = EXCLUDED.ment_leadership,
    tact_positioning = EXCLUDED.tact_positioning,
    tact_vision = EXCLUDED.tact_vision,
    tact_anticipation = EXCLUDED.tact_anticipation,
    tact_game_iq = EXCLUDED.tact_game_iq,
    tact_transition = EXCLUDED.tact_transition,
    tech_first_touch = EXCLUDED.tech_first_touch,
    tech_passing = EXCLUDED.tech_passing,
    tech_shooting = EXCLUDED.tech_shooting,
    tech_dribbling = EXCLUDED.tech_dribbling,
    tech_heading = EXCLUDED.tech_heading,
    verdict = EXCLUDED.verdict,
    strengths = EXCLUDED.strengths,
    weaknesses = EXCLUDED.weaknesses,
    general_notes = EXCLUDED.general_notes,
    updated_at = NOW();

-- ==============================================================================
-- SECTION 4 : 242 ÉVÉNEMENTS TIMELINE RECRUTEMENT
-- ==============================================================================

INSERT INTO public.recruitment_timeline (
    id, candidate_id, event_type, event_title, event_description, performed_by, event_date
) VALUES
(
    'd0000000-0013-0001-0000-000000000001', 'c0000000-0013-0001-0000-000000000001', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Gardien de But.',
    'Mehdi Benatia', CURRENT_DATE - 2
),
(
    'd0000000-0013-0001-0000-000000000002', 'c0000000-0013-0001-0000-000000000002', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Gardien de But.',
    'Mehdi Benatia', CURRENT_DATE - 3
),
(
    'd0000000-0013-0002-0000-000000000003', 'c0000000-0013-0002-0000-000000000003', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Latéral Droit.',
    'Mehdi Benatia', CURRENT_DATE - 4
),
(
    'd0000000-0013-0002-0000-000000000004', 'c0000000-0013-0002-0000-000000000004', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Latéral Droit.',
    'Mehdi Benatia', CURRENT_DATE - 5
),
(
    'd0000000-0013-0003-0000-000000000005', 'c0000000-0013-0003-0000-000000000005', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Défenseur Central Droit.',
    'Mehdi Benatia', CURRENT_DATE - 6
),
(
    'd0000000-0013-0003-0000-000000000006', 'c0000000-0013-0003-0000-000000000006', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Défenseur Central Droit.',
    'Mehdi Benatia', CURRENT_DATE - 7
),
(
    'd0000000-0013-0004-0000-000000000007', 'c0000000-0013-0004-0000-000000000007', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Défenseur Central Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 1
),
(
    'd0000000-0013-0004-0000-000000000008', 'c0000000-0013-0004-0000-000000000008', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Défenseur Central Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 2
),
(
    'd0000000-0013-0005-0000-000000000009', 'c0000000-0013-0005-0000-000000000009', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Latéral Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 3
),
(
    'd0000000-0013-0005-0000-000000000010', 'c0000000-0013-0005-0000-000000000010', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Latéral Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 4
),
(
    'd0000000-0013-0006-0000-000000000011', 'c0000000-0013-0006-0000-000000000011', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Défensif.',
    'Mehdi Benatia', CURRENT_DATE - 5
),
(
    'd0000000-0013-0006-0000-000000000012', 'c0000000-0013-0006-0000-000000000012', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Défensif.',
    'Mehdi Benatia', CURRENT_DATE - 6
),
(
    'd0000000-0013-0007-0000-000000000013', 'c0000000-0013-0007-0000-000000000013', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Central Droit.',
    'Mehdi Benatia', CURRENT_DATE - 7
),
(
    'd0000000-0013-0007-0000-000000000014', 'c0000000-0013-0007-0000-000000000014', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Central Droit.',
    'Mehdi Benatia', CURRENT_DATE - 1
),
(
    'd0000000-0013-0008-0000-000000000015', 'c0000000-0013-0008-0000-000000000015', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Central Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 2
),
(
    'd0000000-0013-0008-0000-000000000016', 'c0000000-0013-0008-0000-000000000016', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Central Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 3
),
(
    'd0000000-0013-0009-0000-000000000017', 'c0000000-0013-0009-0000-000000000017', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Ailier Droit.',
    'Mehdi Benatia', CURRENT_DATE - 4
),
(
    'd0000000-0013-0009-0000-000000000018', 'c0000000-0013-0009-0000-000000000018', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Ailier Droit.',
    'Mehdi Benatia', CURRENT_DATE - 5
),
(
    'd0000000-0013-0010-0000-000000000019', 'c0000000-0013-0010-0000-000000000019', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Avant-Centre.',
    'Mehdi Benatia', CURRENT_DATE - 6
),
(
    'd0000000-0013-0010-0000-000000000020', 'c0000000-0013-0010-0000-000000000020', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Avant-Centre.',
    'Mehdi Benatia', CURRENT_DATE - 7
),
(
    'd0000000-0013-0011-0000-000000000021', 'c0000000-0013-0011-0000-000000000021', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Ailier Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 1
),
(
    'd0000000-0013-0011-0000-000000000022', 'c0000000-0013-0011-0000-000000000022', 'discovered', 'Détection Officielle U13',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Ailier Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 2
),
(
    'd0000000-0014-0001-0000-000000000023', 'c0000000-0014-0001-0000-000000000023', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Gardien de But.',
    'Mehdi Benatia', CURRENT_DATE - 2
),
(
    'd0000000-0014-0001-0000-000000000024', 'c0000000-0014-0001-0000-000000000024', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Gardien de But.',
    'Mehdi Benatia', CURRENT_DATE - 3
),
(
    'd0000000-0014-0002-0000-000000000025', 'c0000000-0014-0002-0000-000000000025', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Latéral Droit.',
    'Mehdi Benatia', CURRENT_DATE - 4
),
(
    'd0000000-0014-0002-0000-000000000026', 'c0000000-0014-0002-0000-000000000026', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Latéral Droit.',
    'Mehdi Benatia', CURRENT_DATE - 5
),
(
    'd0000000-0014-0003-0000-000000000027', 'c0000000-0014-0003-0000-000000000027', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Défenseur Central Droit.',
    'Mehdi Benatia', CURRENT_DATE - 6
),
(
    'd0000000-0014-0003-0000-000000000028', 'c0000000-0014-0003-0000-000000000028', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Défenseur Central Droit.',
    'Mehdi Benatia', CURRENT_DATE - 7
),
(
    'd0000000-0014-0004-0000-000000000029', 'c0000000-0014-0004-0000-000000000029', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Défenseur Central Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 1
),
(
    'd0000000-0014-0004-0000-000000000030', 'c0000000-0014-0004-0000-000000000030', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Défenseur Central Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 2
),
(
    'd0000000-0014-0005-0000-000000000031', 'c0000000-0014-0005-0000-000000000031', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Latéral Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 3
),
(
    'd0000000-0014-0005-0000-000000000032', 'c0000000-0014-0005-0000-000000000032', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Latéral Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 4
),
(
    'd0000000-0014-0006-0000-000000000033', 'c0000000-0014-0006-0000-000000000033', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Défensif.',
    'Mehdi Benatia', CURRENT_DATE - 5
),
(
    'd0000000-0014-0006-0000-000000000034', 'c0000000-0014-0006-0000-000000000034', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Défensif.',
    'Mehdi Benatia', CURRENT_DATE - 6
),
(
    'd0000000-0014-0007-0000-000000000035', 'c0000000-0014-0007-0000-000000000035', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Central Droit.',
    'Mehdi Benatia', CURRENT_DATE - 7
),
(
    'd0000000-0014-0007-0000-000000000036', 'c0000000-0014-0007-0000-000000000036', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Central Droit.',
    'Mehdi Benatia', CURRENT_DATE - 1
),
(
    'd0000000-0014-0008-0000-000000000037', 'c0000000-0014-0008-0000-000000000037', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Central Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 2
),
(
    'd0000000-0014-0008-0000-000000000038', 'c0000000-0014-0008-0000-000000000038', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Central Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 3
),
(
    'd0000000-0014-0009-0000-000000000039', 'c0000000-0014-0009-0000-000000000039', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Ailier Droit.',
    'Mehdi Benatia', CURRENT_DATE - 4
),
(
    'd0000000-0014-0009-0000-000000000040', 'c0000000-0014-0009-0000-000000000040', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Ailier Droit.',
    'Mehdi Benatia', CURRENT_DATE - 5
),
(
    'd0000000-0014-0010-0000-000000000041', 'c0000000-0014-0010-0000-000000000041', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Avant-Centre.',
    'Mehdi Benatia', CURRENT_DATE - 6
),
(
    'd0000000-0014-0010-0000-000000000042', 'c0000000-0014-0010-0000-000000000042', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Avant-Centre.',
    'Mehdi Benatia', CURRENT_DATE - 7
),
(
    'd0000000-0014-0011-0000-000000000043', 'c0000000-0014-0011-0000-000000000043', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Ailier Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 1
),
(
    'd0000000-0014-0011-0000-000000000044', 'c0000000-0014-0011-0000-000000000044', 'discovered', 'Détection Officielle U14',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Ailier Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 2
),
(
    'd0000000-0015-0001-0000-000000000045', 'c0000000-0015-0001-0000-000000000045', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Gardien de But.',
    'Mehdi Benatia', CURRENT_DATE - 2
),
(
    'd0000000-0015-0001-0000-000000000046', 'c0000000-0015-0001-0000-000000000046', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Gardien de But.',
    'Mehdi Benatia', CURRENT_DATE - 3
),
(
    'd0000000-0015-0002-0000-000000000047', 'c0000000-0015-0002-0000-000000000047', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Latéral Droit.',
    'Mehdi Benatia', CURRENT_DATE - 4
),
(
    'd0000000-0015-0002-0000-000000000048', 'c0000000-0015-0002-0000-000000000048', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Latéral Droit.',
    'Mehdi Benatia', CURRENT_DATE - 5
),
(
    'd0000000-0015-0003-0000-000000000049', 'c0000000-0015-0003-0000-000000000049', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Défenseur Central Droit.',
    'Mehdi Benatia', CURRENT_DATE - 6
),
(
    'd0000000-0015-0003-0000-000000000050', 'c0000000-0015-0003-0000-000000000050', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Défenseur Central Droit.',
    'Mehdi Benatia', CURRENT_DATE - 7
),
(
    'd0000000-0015-0004-0000-000000000051', 'c0000000-0015-0004-0000-000000000051', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Défenseur Central Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 1
),
(
    'd0000000-0015-0004-0000-000000000052', 'c0000000-0015-0004-0000-000000000052', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Défenseur Central Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 2
),
(
    'd0000000-0015-0005-0000-000000000053', 'c0000000-0015-0005-0000-000000000053', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Latéral Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 3
),
(
    'd0000000-0015-0005-0000-000000000054', 'c0000000-0015-0005-0000-000000000054', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Latéral Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 4
),
(
    'd0000000-0015-0006-0000-000000000055', 'c0000000-0015-0006-0000-000000000055', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Défensif.',
    'Mehdi Benatia', CURRENT_DATE - 5
),
(
    'd0000000-0015-0006-0000-000000000056', 'c0000000-0015-0006-0000-000000000056', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Défensif.',
    'Mehdi Benatia', CURRENT_DATE - 6
),
(
    'd0000000-0015-0007-0000-000000000057', 'c0000000-0015-0007-0000-000000000057', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Central Droit.',
    'Mehdi Benatia', CURRENT_DATE - 7
),
(
    'd0000000-0015-0007-0000-000000000058', 'c0000000-0015-0007-0000-000000000058', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Central Droit.',
    'Mehdi Benatia', CURRENT_DATE - 1
),
(
    'd0000000-0015-0008-0000-000000000059', 'c0000000-0015-0008-0000-000000000059', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Central Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 2
),
(
    'd0000000-0015-0008-0000-000000000060', 'c0000000-0015-0008-0000-000000000060', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Milieu Central Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 3
),
(
    'd0000000-0015-0009-0000-000000000061', 'c0000000-0015-0009-0000-000000000061', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Ailier Droit.',
    'Mehdi Benatia', CURRENT_DATE - 4
),
(
    'd0000000-0015-0009-0000-000000000062', 'c0000000-0015-0009-0000-000000000062', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Ailier Droit.',
    'Mehdi Benatia', CURRENT_DATE - 5
),
(
    'd0000000-0015-0010-0000-000000000063', 'c0000000-0015-0010-0000-000000000063', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Avant-Centre.',
    'Mehdi Benatia', CURRENT_DATE - 6
),
(
    'd0000000-0015-0010-0000-000000000064', 'c0000000-0015-0010-0000-000000000064', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Avant-Centre.',
    'Mehdi Benatia', CURRENT_DATE - 7
),
(
    'd0000000-0015-0011-0000-000000000065', 'c0000000-0015-0011-0000-000000000065', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Ailier Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 1
),
(
    'd0000000-0015-0011-0000-000000000066', 'c0000000-0015-0011-0000-000000000066', 'discovered', 'Détection Officielle U15',
    'Joueur saisi dans la base par le Scout Manager Mehdi Benatia pour le poste Ailier Gauche.',
    'Mehdi Benatia', CURRENT_DATE - 2
),
(
    'd0000000-0016-0001-0000-000000000067', 'c0000000-0016-0001-0000-000000000067', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Gardien de But.',
    'Tarik Sektioui', CURRENT_DATE - 2
),
(
    'd0000000-0016-0001-0000-000000000068', 'c0000000-0016-0001-0000-000000000068', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Gardien de But.',
    'Tarik Sektioui', CURRENT_DATE - 3
),
(
    'd0000000-0016-0002-0000-000000000069', 'c0000000-0016-0002-0000-000000000069', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Latéral Droit.',
    'Tarik Sektioui', CURRENT_DATE - 4
),
(
    'd0000000-0016-0002-0000-000000000070', 'c0000000-0016-0002-0000-000000000070', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Latéral Droit.',
    'Tarik Sektioui', CURRENT_DATE - 5
),
(
    'd0000000-0016-0003-0000-000000000071', 'c0000000-0016-0003-0000-000000000071', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Défenseur Central Droit.',
    'Tarik Sektioui', CURRENT_DATE - 6
),
(
    'd0000000-0016-0003-0000-000000000072', 'c0000000-0016-0003-0000-000000000072', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Défenseur Central Droit.',
    'Tarik Sektioui', CURRENT_DATE - 7
),
(
    'd0000000-0016-0004-0000-000000000073', 'c0000000-0016-0004-0000-000000000073', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Défenseur Central Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 1
),
(
    'd0000000-0016-0004-0000-000000000074', 'c0000000-0016-0004-0000-000000000074', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Défenseur Central Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 2
),
(
    'd0000000-0016-0005-0000-000000000075', 'c0000000-0016-0005-0000-000000000075', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Latéral Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 3
),
(
    'd0000000-0016-0005-0000-000000000076', 'c0000000-0016-0005-0000-000000000076', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Latéral Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 4
),
(
    'd0000000-0016-0006-0000-000000000077', 'c0000000-0016-0006-0000-000000000077', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Défensif.',
    'Tarik Sektioui', CURRENT_DATE - 5
),
(
    'd0000000-0016-0006-0000-000000000078', 'c0000000-0016-0006-0000-000000000078', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Défensif.',
    'Tarik Sektioui', CURRENT_DATE - 6
),
(
    'd0000000-0016-0007-0000-000000000079', 'c0000000-0016-0007-0000-000000000079', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Central Droit.',
    'Tarik Sektioui', CURRENT_DATE - 7
),
(
    'd0000000-0016-0007-0000-000000000080', 'c0000000-0016-0007-0000-000000000080', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Central Droit.',
    'Tarik Sektioui', CURRENT_DATE - 1
),
(
    'd0000000-0016-0008-0000-000000000081', 'c0000000-0016-0008-0000-000000000081', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Central Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 2
),
(
    'd0000000-0016-0008-0000-000000000082', 'c0000000-0016-0008-0000-000000000082', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Central Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 3
),
(
    'd0000000-0016-0009-0000-000000000083', 'c0000000-0016-0009-0000-000000000083', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Ailier Droit.',
    'Tarik Sektioui', CURRENT_DATE - 4
),
(
    'd0000000-0016-0009-0000-000000000084', 'c0000000-0016-0009-0000-000000000084', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Ailier Droit.',
    'Tarik Sektioui', CURRENT_DATE - 5
),
(
    'd0000000-0016-0010-0000-000000000085', 'c0000000-0016-0010-0000-000000000085', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Avant-Centre.',
    'Tarik Sektioui', CURRENT_DATE - 6
),
(
    'd0000000-0016-0010-0000-000000000086', 'c0000000-0016-0010-0000-000000000086', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Avant-Centre.',
    'Tarik Sektioui', CURRENT_DATE - 7
),
(
    'd0000000-0016-0011-0000-000000000087', 'c0000000-0016-0011-0000-000000000087', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Ailier Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 1
),
(
    'd0000000-0016-0011-0000-000000000088', 'c0000000-0016-0011-0000-000000000088', 'discovered', 'Détection Officielle U16',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Ailier Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 2
),
(
    'd0000000-0017-0001-0000-000000000089', 'c0000000-0017-0001-0000-000000000089', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Gardien de But.',
    'Tarik Sektioui', CURRENT_DATE - 2
),
(
    'd0000000-0017-0001-0000-000000000090', 'c0000000-0017-0001-0000-000000000090', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Gardien de But.',
    'Tarik Sektioui', CURRENT_DATE - 3
),
(
    'd0000000-0017-0002-0000-000000000091', 'c0000000-0017-0002-0000-000000000091', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Latéral Droit.',
    'Tarik Sektioui', CURRENT_DATE - 4
),
(
    'd0000000-0017-0002-0000-000000000092', 'c0000000-0017-0002-0000-000000000092', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Latéral Droit.',
    'Tarik Sektioui', CURRENT_DATE - 5
),
(
    'd0000000-0017-0003-0000-000000000093', 'c0000000-0017-0003-0000-000000000093', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Défenseur Central Droit.',
    'Tarik Sektioui', CURRENT_DATE - 6
),
(
    'd0000000-0017-0003-0000-000000000094', 'c0000000-0017-0003-0000-000000000094', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Défenseur Central Droit.',
    'Tarik Sektioui', CURRENT_DATE - 7
),
(
    'd0000000-0017-0004-0000-000000000095', 'c0000000-0017-0004-0000-000000000095', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Défenseur Central Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 1
),
(
    'd0000000-0017-0004-0000-000000000096', 'c0000000-0017-0004-0000-000000000096', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Défenseur Central Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 2
),
(
    'd0000000-0017-0005-0000-000000000097', 'c0000000-0017-0005-0000-000000000097', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Latéral Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 3
),
(
    'd0000000-0017-0005-0000-000000000098', 'c0000000-0017-0005-0000-000000000098', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Latéral Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 4
),
(
    'd0000000-0017-0006-0000-000000000099', 'c0000000-0017-0006-0000-000000000099', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Défensif.',
    'Tarik Sektioui', CURRENT_DATE - 5
),
(
    'd0000000-0017-0006-0000-000000000100', 'c0000000-0017-0006-0000-000000000100', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Défensif.',
    'Tarik Sektioui', CURRENT_DATE - 6
),
(
    'd0000000-0017-0007-0000-000000000101', 'c0000000-0017-0007-0000-000000000101', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Central Droit.',
    'Tarik Sektioui', CURRENT_DATE - 7
),
(
    'd0000000-0017-0007-0000-000000000102', 'c0000000-0017-0007-0000-000000000102', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Central Droit.',
    'Tarik Sektioui', CURRENT_DATE - 1
),
(
    'd0000000-0017-0008-0000-000000000103', 'c0000000-0017-0008-0000-000000000103', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Central Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 2
),
(
    'd0000000-0017-0008-0000-000000000104', 'c0000000-0017-0008-0000-000000000104', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Central Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 3
),
(
    'd0000000-0017-0009-0000-000000000105', 'c0000000-0017-0009-0000-000000000105', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Ailier Droit.',
    'Tarik Sektioui', CURRENT_DATE - 4
),
(
    'd0000000-0017-0009-0000-000000000106', 'c0000000-0017-0009-0000-000000000106', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Ailier Droit.',
    'Tarik Sektioui', CURRENT_DATE - 5
),
(
    'd0000000-0017-0010-0000-000000000107', 'c0000000-0017-0010-0000-000000000107', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Avant-Centre.',
    'Tarik Sektioui', CURRENT_DATE - 6
),
(
    'd0000000-0017-0010-0000-000000000108', 'c0000000-0017-0010-0000-000000000108', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Avant-Centre.',
    'Tarik Sektioui', CURRENT_DATE - 7
),
(
    'd0000000-0017-0011-0000-000000000109', 'c0000000-0017-0011-0000-000000000109', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Ailier Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 1
),
(
    'd0000000-0017-0011-0000-000000000110', 'c0000000-0017-0011-0000-000000000110', 'discovered', 'Détection Officielle U17',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Ailier Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 2
),
(
    'd0000000-0018-0001-0000-000000000111', 'c0000000-0018-0001-0000-000000000111', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Gardien de But.',
    'Tarik Sektioui', CURRENT_DATE - 2
),
(
    'd0000000-0018-0001-0000-000000000112', 'c0000000-0018-0001-0000-000000000112', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Gardien de But.',
    'Tarik Sektioui', CURRENT_DATE - 3
),
(
    'd0000000-0018-0002-0000-000000000113', 'c0000000-0018-0002-0000-000000000113', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Latéral Droit.',
    'Tarik Sektioui', CURRENT_DATE - 4
),
(
    'd0000000-0018-0002-0000-000000000114', 'c0000000-0018-0002-0000-000000000114', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Latéral Droit.',
    'Tarik Sektioui', CURRENT_DATE - 5
),
(
    'd0000000-0018-0003-0000-000000000115', 'c0000000-0018-0003-0000-000000000115', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Défenseur Central Droit.',
    'Tarik Sektioui', CURRENT_DATE - 6
),
(
    'd0000000-0018-0003-0000-000000000116', 'c0000000-0018-0003-0000-000000000116', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Défenseur Central Droit.',
    'Tarik Sektioui', CURRENT_DATE - 7
),
(
    'd0000000-0018-0004-0000-000000000117', 'c0000000-0018-0004-0000-000000000117', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Défenseur Central Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 1
),
(
    'd0000000-0018-0004-0000-000000000118', 'c0000000-0018-0004-0000-000000000118', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Défenseur Central Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 2
),
(
    'd0000000-0018-0005-0000-000000000119', 'c0000000-0018-0005-0000-000000000119', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Latéral Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 3
),
(
    'd0000000-0018-0005-0000-000000000120', 'c0000000-0018-0005-0000-000000000120', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Latéral Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 4
),
(
    'd0000000-0018-0006-0000-000000000121', 'c0000000-0018-0006-0000-000000000121', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Défensif.',
    'Tarik Sektioui', CURRENT_DATE - 5
),
(
    'd0000000-0018-0006-0000-000000000122', 'c0000000-0018-0006-0000-000000000122', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Défensif.',
    'Tarik Sektioui', CURRENT_DATE - 6
),
(
    'd0000000-0018-0007-0000-000000000123', 'c0000000-0018-0007-0000-000000000123', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Central Droit.',
    'Tarik Sektioui', CURRENT_DATE - 7
),
(
    'd0000000-0018-0007-0000-000000000124', 'c0000000-0018-0007-0000-000000000124', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Central Droit.',
    'Tarik Sektioui', CURRENT_DATE - 1
),
(
    'd0000000-0018-0008-0000-000000000125', 'c0000000-0018-0008-0000-000000000125', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Central Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 2
),
(
    'd0000000-0018-0008-0000-000000000126', 'c0000000-0018-0008-0000-000000000126', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Milieu Central Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 3
),
(
    'd0000000-0018-0009-0000-000000000127', 'c0000000-0018-0009-0000-000000000127', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Ailier Droit.',
    'Tarik Sektioui', CURRENT_DATE - 4
),
(
    'd0000000-0018-0009-0000-000000000128', 'c0000000-0018-0009-0000-000000000128', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Ailier Droit.',
    'Tarik Sektioui', CURRENT_DATE - 5
),
(
    'd0000000-0018-0010-0000-000000000129', 'c0000000-0018-0010-0000-000000000129', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Avant-Centre.',
    'Tarik Sektioui', CURRENT_DATE - 6
),
(
    'd0000000-0018-0010-0000-000000000130', 'c0000000-0018-0010-0000-000000000130', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Avant-Centre.',
    'Tarik Sektioui', CURRENT_DATE - 7
),
(
    'd0000000-0018-0011-0000-000000000131', 'c0000000-0018-0011-0000-000000000131', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Ailier Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 1
),
(
    'd0000000-0018-0011-0000-000000000132', 'c0000000-0018-0011-0000-000000000132', 'discovered', 'Détection Officielle U18',
    'Joueur saisi dans la base par le Scout Manager Tarik Sektioui pour le poste Ailier Gauche.',
    'Tarik Sektioui', CURRENT_DATE - 2
),
(
    'd0000000-0019-0001-0000-000000000133', 'c0000000-0019-0001-0000-000000000133', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Gardien de But.',
    'Hassan Benabicha', CURRENT_DATE - 2
),
(
    'd0000000-0019-0001-0000-000000000134', 'c0000000-0019-0001-0000-000000000134', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Gardien de But.',
    'Hassan Benabicha', CURRENT_DATE - 3
),
(
    'd0000000-0019-0002-0000-000000000135', 'c0000000-0019-0002-0000-000000000135', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Latéral Droit.',
    'Hassan Benabicha', CURRENT_DATE - 4
),
(
    'd0000000-0019-0002-0000-000000000136', 'c0000000-0019-0002-0000-000000000136', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Latéral Droit.',
    'Hassan Benabicha', CURRENT_DATE - 5
),
(
    'd0000000-0019-0003-0000-000000000137', 'c0000000-0019-0003-0000-000000000137', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Défenseur Central Droit.',
    'Hassan Benabicha', CURRENT_DATE - 6
),
(
    'd0000000-0019-0003-0000-000000000138', 'c0000000-0019-0003-0000-000000000138', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Défenseur Central Droit.',
    'Hassan Benabicha', CURRENT_DATE - 7
),
(
    'd0000000-0019-0004-0000-000000000139', 'c0000000-0019-0004-0000-000000000139', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Défenseur Central Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 1
),
(
    'd0000000-0019-0004-0000-000000000140', 'c0000000-0019-0004-0000-000000000140', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Défenseur Central Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 2
),
(
    'd0000000-0019-0005-0000-000000000141', 'c0000000-0019-0005-0000-000000000141', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Latéral Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 3
),
(
    'd0000000-0019-0005-0000-000000000142', 'c0000000-0019-0005-0000-000000000142', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Latéral Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 4
),
(
    'd0000000-0019-0006-0000-000000000143', 'c0000000-0019-0006-0000-000000000143', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Défensif.',
    'Hassan Benabicha', CURRENT_DATE - 5
),
(
    'd0000000-0019-0006-0000-000000000144', 'c0000000-0019-0006-0000-000000000144', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Défensif.',
    'Hassan Benabicha', CURRENT_DATE - 6
),
(
    'd0000000-0019-0007-0000-000000000145', 'c0000000-0019-0007-0000-000000000145', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Central Droit.',
    'Hassan Benabicha', CURRENT_DATE - 7
),
(
    'd0000000-0019-0007-0000-000000000146', 'c0000000-0019-0007-0000-000000000146', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Central Droit.',
    'Hassan Benabicha', CURRENT_DATE - 1
),
(
    'd0000000-0019-0008-0000-000000000147', 'c0000000-0019-0008-0000-000000000147', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Central Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 2
),
(
    'd0000000-0019-0008-0000-000000000148', 'c0000000-0019-0008-0000-000000000148', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Central Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 3
),
(
    'd0000000-0019-0009-0000-000000000149', 'c0000000-0019-0009-0000-000000000149', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Ailier Droit.',
    'Hassan Benabicha', CURRENT_DATE - 4
),
(
    'd0000000-0019-0009-0000-000000000150', 'c0000000-0019-0009-0000-000000000150', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Ailier Droit.',
    'Hassan Benabicha', CURRENT_DATE - 5
),
(
    'd0000000-0019-0010-0000-000000000151', 'c0000000-0019-0010-0000-000000000151', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Avant-Centre.',
    'Hassan Benabicha', CURRENT_DATE - 6
),
(
    'd0000000-0019-0010-0000-000000000152', 'c0000000-0019-0010-0000-000000000152', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Avant-Centre.',
    'Hassan Benabicha', CURRENT_DATE - 7
),
(
    'd0000000-0019-0011-0000-000000000153', 'c0000000-0019-0011-0000-000000000153', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Ailier Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 1
),
(
    'd0000000-0019-0011-0000-000000000154', 'c0000000-0019-0011-0000-000000000154', 'discovered', 'Détection Officielle U19',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Ailier Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 2
),
(
    'd0000000-0020-0001-0000-000000000155', 'c0000000-0020-0001-0000-000000000155', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Gardien de But.',
    'Hassan Benabicha', CURRENT_DATE - 2
),
(
    'd0000000-0020-0001-0000-000000000156', 'c0000000-0020-0001-0000-000000000156', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Gardien de But.',
    'Hassan Benabicha', CURRENT_DATE - 3
),
(
    'd0000000-0020-0002-0000-000000000157', 'c0000000-0020-0002-0000-000000000157', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Latéral Droit.',
    'Hassan Benabicha', CURRENT_DATE - 4
),
(
    'd0000000-0020-0002-0000-000000000158', 'c0000000-0020-0002-0000-000000000158', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Latéral Droit.',
    'Hassan Benabicha', CURRENT_DATE - 5
),
(
    'd0000000-0020-0003-0000-000000000159', 'c0000000-0020-0003-0000-000000000159', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Défenseur Central Droit.',
    'Hassan Benabicha', CURRENT_DATE - 6
),
(
    'd0000000-0020-0003-0000-000000000160', 'c0000000-0020-0003-0000-000000000160', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Défenseur Central Droit.',
    'Hassan Benabicha', CURRENT_DATE - 7
),
(
    'd0000000-0020-0004-0000-000000000161', 'c0000000-0020-0004-0000-000000000161', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Défenseur Central Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 1
),
(
    'd0000000-0020-0004-0000-000000000162', 'c0000000-0020-0004-0000-000000000162', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Défenseur Central Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 2
),
(
    'd0000000-0020-0005-0000-000000000163', 'c0000000-0020-0005-0000-000000000163', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Latéral Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 3
),
(
    'd0000000-0020-0005-0000-000000000164', 'c0000000-0020-0005-0000-000000000164', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Latéral Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 4
),
(
    'd0000000-0020-0006-0000-000000000165', 'c0000000-0020-0006-0000-000000000165', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Défensif.',
    'Hassan Benabicha', CURRENT_DATE - 5
),
(
    'd0000000-0020-0006-0000-000000000166', 'c0000000-0020-0006-0000-000000000166', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Défensif.',
    'Hassan Benabicha', CURRENT_DATE - 6
),
(
    'd0000000-0020-0007-0000-000000000167', 'c0000000-0020-0007-0000-000000000167', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Central Droit.',
    'Hassan Benabicha', CURRENT_DATE - 7
),
(
    'd0000000-0020-0007-0000-000000000168', 'c0000000-0020-0007-0000-000000000168', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Central Droit.',
    'Hassan Benabicha', CURRENT_DATE - 1
),
(
    'd0000000-0020-0008-0000-000000000169', 'c0000000-0020-0008-0000-000000000169', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Central Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 2
),
(
    'd0000000-0020-0008-0000-000000000170', 'c0000000-0020-0008-0000-000000000170', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Central Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 3
),
(
    'd0000000-0020-0009-0000-000000000171', 'c0000000-0020-0009-0000-000000000171', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Ailier Droit.',
    'Hassan Benabicha', CURRENT_DATE - 4
),
(
    'd0000000-0020-0009-0000-000000000172', 'c0000000-0020-0009-0000-000000000172', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Ailier Droit.',
    'Hassan Benabicha', CURRENT_DATE - 5
),
(
    'd0000000-0020-0010-0000-000000000173', 'c0000000-0020-0010-0000-000000000173', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Avant-Centre.',
    'Hassan Benabicha', CURRENT_DATE - 6
),
(
    'd0000000-0020-0010-0000-000000000174', 'c0000000-0020-0010-0000-000000000174', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Avant-Centre.',
    'Hassan Benabicha', CURRENT_DATE - 7
),
(
    'd0000000-0020-0011-0000-000000000175', 'c0000000-0020-0011-0000-000000000175', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Ailier Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 1
),
(
    'd0000000-0020-0011-0000-000000000176', 'c0000000-0020-0011-0000-000000000176', 'discovered', 'Détection Officielle U20',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Ailier Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 2
),
(
    'd0000000-0021-0001-0000-000000000177', 'c0000000-0021-0001-0000-000000000177', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Gardien de But.',
    'Hassan Benabicha', CURRENT_DATE - 2
),
(
    'd0000000-0021-0001-0000-000000000178', 'c0000000-0021-0001-0000-000000000178', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Gardien de But.',
    'Hassan Benabicha', CURRENT_DATE - 3
),
(
    'd0000000-0021-0002-0000-000000000179', 'c0000000-0021-0002-0000-000000000179', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Latéral Droit.',
    'Hassan Benabicha', CURRENT_DATE - 4
),
(
    'd0000000-0021-0002-0000-000000000180', 'c0000000-0021-0002-0000-000000000180', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Latéral Droit.',
    'Hassan Benabicha', CURRENT_DATE - 5
),
(
    'd0000000-0021-0003-0000-000000000181', 'c0000000-0021-0003-0000-000000000181', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Défenseur Central Droit.',
    'Hassan Benabicha', CURRENT_DATE - 6
),
(
    'd0000000-0021-0003-0000-000000000182', 'c0000000-0021-0003-0000-000000000182', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Défenseur Central Droit.',
    'Hassan Benabicha', CURRENT_DATE - 7
),
(
    'd0000000-0021-0004-0000-000000000183', 'c0000000-0021-0004-0000-000000000183', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Défenseur Central Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 1
),
(
    'd0000000-0021-0004-0000-000000000184', 'c0000000-0021-0004-0000-000000000184', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Défenseur Central Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 2
),
(
    'd0000000-0021-0005-0000-000000000185', 'c0000000-0021-0005-0000-000000000185', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Latéral Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 3
),
(
    'd0000000-0021-0005-0000-000000000186', 'c0000000-0021-0005-0000-000000000186', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Latéral Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 4
),
(
    'd0000000-0021-0006-0000-000000000187', 'c0000000-0021-0006-0000-000000000187', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Défensif.',
    'Hassan Benabicha', CURRENT_DATE - 5
),
(
    'd0000000-0021-0006-0000-000000000188', 'c0000000-0021-0006-0000-000000000188', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Défensif.',
    'Hassan Benabicha', CURRENT_DATE - 6
),
(
    'd0000000-0021-0007-0000-000000000189', 'c0000000-0021-0007-0000-000000000189', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Central Droit.',
    'Hassan Benabicha', CURRENT_DATE - 7
),
(
    'd0000000-0021-0007-0000-000000000190', 'c0000000-0021-0007-0000-000000000190', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Central Droit.',
    'Hassan Benabicha', CURRENT_DATE - 1
),
(
    'd0000000-0021-0008-0000-000000000191', 'c0000000-0021-0008-0000-000000000191', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Central Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 2
),
(
    'd0000000-0021-0008-0000-000000000192', 'c0000000-0021-0008-0000-000000000192', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Milieu Central Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 3
),
(
    'd0000000-0021-0009-0000-000000000193', 'c0000000-0021-0009-0000-000000000193', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Ailier Droit.',
    'Hassan Benabicha', CURRENT_DATE - 4
),
(
    'd0000000-0021-0009-0000-000000000194', 'c0000000-0021-0009-0000-000000000194', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Ailier Droit.',
    'Hassan Benabicha', CURRENT_DATE - 5
),
(
    'd0000000-0021-0010-0000-000000000195', 'c0000000-0021-0010-0000-000000000195', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Avant-Centre.',
    'Hassan Benabicha', CURRENT_DATE - 6
),
(
    'd0000000-0021-0010-0000-000000000196', 'c0000000-0021-0010-0000-000000000196', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Avant-Centre.',
    'Hassan Benabicha', CURRENT_DATE - 7
),
(
    'd0000000-0021-0011-0000-000000000197', 'c0000000-0021-0011-0000-000000000197', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Ailier Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 1
),
(
    'd0000000-0021-0011-0000-000000000198', 'c0000000-0021-0011-0000-000000000198', 'discovered', 'Détection Officielle U21',
    'Joueur saisi dans la base par le Scout Manager Hassan Benabicha pour le poste Ailier Gauche.',
    'Hassan Benabicha', CURRENT_DATE - 2
),
(
    'd0000000-0022-0001-0000-000000000199', 'c0000000-0022-0001-0000-000000000199', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Gardien de But.',
    'Youssef Safri', CURRENT_DATE - 2
),
(
    'd0000000-0022-0001-0000-000000000200', 'c0000000-0022-0001-0000-000000000200', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Gardien de But.',
    'Youssef Safri', CURRENT_DATE - 3
),
(
    'd0000000-0022-0002-0000-000000000201', 'c0000000-0022-0002-0000-000000000201', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Latéral Droit.',
    'Youssef Safri', CURRENT_DATE - 4
),
(
    'd0000000-0022-0002-0000-000000000202', 'c0000000-0022-0002-0000-000000000202', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Latéral Droit.',
    'Youssef Safri', CURRENT_DATE - 5
),
(
    'd0000000-0022-0003-0000-000000000203', 'c0000000-0022-0003-0000-000000000203', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Défenseur Central Droit.',
    'Youssef Safri', CURRENT_DATE - 6
),
(
    'd0000000-0022-0003-0000-000000000204', 'c0000000-0022-0003-0000-000000000204', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Défenseur Central Droit.',
    'Youssef Safri', CURRENT_DATE - 7
),
(
    'd0000000-0022-0004-0000-000000000205', 'c0000000-0022-0004-0000-000000000205', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Défenseur Central Gauche.',
    'Youssef Safri', CURRENT_DATE - 1
),
(
    'd0000000-0022-0004-0000-000000000206', 'c0000000-0022-0004-0000-000000000206', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Défenseur Central Gauche.',
    'Youssef Safri', CURRENT_DATE - 2
),
(
    'd0000000-0022-0005-0000-000000000207', 'c0000000-0022-0005-0000-000000000207', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Latéral Gauche.',
    'Youssef Safri', CURRENT_DATE - 3
),
(
    'd0000000-0022-0005-0000-000000000208', 'c0000000-0022-0005-0000-000000000208', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Latéral Gauche.',
    'Youssef Safri', CURRENT_DATE - 4
),
(
    'd0000000-0022-0006-0000-000000000209', 'c0000000-0022-0006-0000-000000000209', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Milieu Défensif.',
    'Youssef Safri', CURRENT_DATE - 5
),
(
    'd0000000-0022-0006-0000-000000000210', 'c0000000-0022-0006-0000-000000000210', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Milieu Défensif.',
    'Youssef Safri', CURRENT_DATE - 6
),
(
    'd0000000-0022-0007-0000-000000000211', 'c0000000-0022-0007-0000-000000000211', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Milieu Central Droit.',
    'Youssef Safri', CURRENT_DATE - 7
),
(
    'd0000000-0022-0007-0000-000000000212', 'c0000000-0022-0007-0000-000000000212', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Milieu Central Droit.',
    'Youssef Safri', CURRENT_DATE - 1
),
(
    'd0000000-0022-0008-0000-000000000213', 'c0000000-0022-0008-0000-000000000213', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Milieu Central Gauche.',
    'Youssef Safri', CURRENT_DATE - 2
),
(
    'd0000000-0022-0008-0000-000000000214', 'c0000000-0022-0008-0000-000000000214', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Milieu Central Gauche.',
    'Youssef Safri', CURRENT_DATE - 3
),
(
    'd0000000-0022-0009-0000-000000000215', 'c0000000-0022-0009-0000-000000000215', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Ailier Droit.',
    'Youssef Safri', CURRENT_DATE - 4
),
(
    'd0000000-0022-0009-0000-000000000216', 'c0000000-0022-0009-0000-000000000216', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Ailier Droit.',
    'Youssef Safri', CURRENT_DATE - 5
),
(
    'd0000000-0022-0010-0000-000000000217', 'c0000000-0022-0010-0000-000000000217', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Avant-Centre.',
    'Youssef Safri', CURRENT_DATE - 6
),
(
    'd0000000-0022-0010-0000-000000000218', 'c0000000-0022-0010-0000-000000000218', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Avant-Centre.',
    'Youssef Safri', CURRENT_DATE - 7
),
(
    'd0000000-0022-0011-0000-000000000219', 'c0000000-0022-0011-0000-000000000219', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Ailier Gauche.',
    'Youssef Safri', CURRENT_DATE - 1
),
(
    'd0000000-0022-0011-0000-000000000220', 'c0000000-0022-0011-0000-000000000220', 'discovered', 'Détection Officielle U22',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Ailier Gauche.',
    'Youssef Safri', CURRENT_DATE - 2
),
(
    'd0000000-0023-0001-0000-000000000221', 'c0000000-0023-0001-0000-000000000221', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Gardien de But.',
    'Youssef Safri', CURRENT_DATE - 2
),
(
    'd0000000-0023-0001-0000-000000000222', 'c0000000-0023-0001-0000-000000000222', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Gardien de But.',
    'Youssef Safri', CURRENT_DATE - 3
),
(
    'd0000000-0023-0002-0000-000000000223', 'c0000000-0023-0002-0000-000000000223', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Latéral Droit.',
    'Youssef Safri', CURRENT_DATE - 4
),
(
    'd0000000-0023-0002-0000-000000000224', 'c0000000-0023-0002-0000-000000000224', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Latéral Droit.',
    'Youssef Safri', CURRENT_DATE - 5
),
(
    'd0000000-0023-0003-0000-000000000225', 'c0000000-0023-0003-0000-000000000225', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Défenseur Central Droit.',
    'Youssef Safri', CURRENT_DATE - 6
),
(
    'd0000000-0023-0003-0000-000000000226', 'c0000000-0023-0003-0000-000000000226', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Défenseur Central Droit.',
    'Youssef Safri', CURRENT_DATE - 7
),
(
    'd0000000-0023-0004-0000-000000000227', 'c0000000-0023-0004-0000-000000000227', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Défenseur Central Gauche.',
    'Youssef Safri', CURRENT_DATE - 1
),
(
    'd0000000-0023-0004-0000-000000000228', 'c0000000-0023-0004-0000-000000000228', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Défenseur Central Gauche.',
    'Youssef Safri', CURRENT_DATE - 2
),
(
    'd0000000-0023-0005-0000-000000000229', 'c0000000-0023-0005-0000-000000000229', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Latéral Gauche.',
    'Youssef Safri', CURRENT_DATE - 3
),
(
    'd0000000-0023-0005-0000-000000000230', 'c0000000-0023-0005-0000-000000000230', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Latéral Gauche.',
    'Youssef Safri', CURRENT_DATE - 4
),
(
    'd0000000-0023-0006-0000-000000000231', 'c0000000-0023-0006-0000-000000000231', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Milieu Défensif.',
    'Youssef Safri', CURRENT_DATE - 5
),
(
    'd0000000-0023-0006-0000-000000000232', 'c0000000-0023-0006-0000-000000000232', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Milieu Défensif.',
    'Youssef Safri', CURRENT_DATE - 6
),
(
    'd0000000-0023-0007-0000-000000000233', 'c0000000-0023-0007-0000-000000000233', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Milieu Central Droit.',
    'Youssef Safri', CURRENT_DATE - 7
),
(
    'd0000000-0023-0007-0000-000000000234', 'c0000000-0023-0007-0000-000000000234', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Milieu Central Droit.',
    'Youssef Safri', CURRENT_DATE - 1
),
(
    'd0000000-0023-0008-0000-000000000235', 'c0000000-0023-0008-0000-000000000235', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Milieu Central Gauche.',
    'Youssef Safri', CURRENT_DATE - 2
),
(
    'd0000000-0023-0008-0000-000000000236', 'c0000000-0023-0008-0000-000000000236', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Milieu Central Gauche.',
    'Youssef Safri', CURRENT_DATE - 3
),
(
    'd0000000-0023-0009-0000-000000000237', 'c0000000-0023-0009-0000-000000000237', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Ailier Droit.',
    'Youssef Safri', CURRENT_DATE - 4
),
(
    'd0000000-0023-0009-0000-000000000238', 'c0000000-0023-0009-0000-000000000238', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Ailier Droit.',
    'Youssef Safri', CURRENT_DATE - 5
),
(
    'd0000000-0023-0010-0000-000000000239', 'c0000000-0023-0010-0000-000000000239', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Avant-Centre.',
    'Youssef Safri', CURRENT_DATE - 6
),
(
    'd0000000-0023-0010-0000-000000000240', 'c0000000-0023-0010-0000-000000000240', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Avant-Centre.',
    'Youssef Safri', CURRENT_DATE - 7
),
(
    'd0000000-0023-0011-0000-000000000241', 'c0000000-0023-0011-0000-000000000241', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Ailier Gauche.',
    'Youssef Safri', CURRENT_DATE - 1
),
(
    'd0000000-0023-0011-0000-000000000242', 'c0000000-0023-0011-0000-000000000242', 'discovered', 'Détection Officielle U23',
    'Joueur saisi dans la base par le Scout Manager Youssef Safri pour le poste Ailier Gauche.',
    'Youssef Safri', CURRENT_DATE - 2
)
ON CONFLICT (id) DO NOTHING;
