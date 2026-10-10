-- ==============================================================================
-- Migration / Script : Réinitialisation et Régénération des Postes & Critères
-- FUS Club Scouting V2 — Paramètres & Gestion des Critères
-- Table : public.metric_positions
-- À exécuter dans : Supabase Dashboard → SQL Editor → New Query → Run
-- ==============================================================================

-- 1. Nettoyage complet des anciens postes et critères
DELETE FROM public.metric_positions;

-- 2. Insertion des postes et critères régénérés
INSERT INTO public.metric_positions (code, name, emoji, category, criteria)
VALUES 
-- -----------------------------------------------------------------------------
-- 1. Attaquant de pointe (ST / CF)
-- -----------------------------------------------------------------------------
(
    'ST / CF', 
    'Attaquant de pointe', 
    '', 
    'FW', 
    '{
        "technique": [
            "Première touche & contrôle orienté sous pression",
            "Jeu en appui (remises, déviations, conservation dos au but)",
            "Dribbles & 1v1 (création de supériorité)",
            "Passe & dernière passe (création occasions, variété de transmissions)",
            "Finition (dans surface, têtes, frappes variées)"
        ],
        "tactique": [
            "Réactivité en transitions (B+ ↔ B-, pressing/repli)",
            "Pressing & contre-pressing (déclenchements, cadrage, fermer l’axe)",
            "Positionnement & déplacements (entre lignes, appels en profondeur, occupation surface)",
            "Jeu sans ballon (création/occupation d’espaces, connexions avec milieux/ailiers)",
            "Lecture & prise de décision (choix rapides, efficacité dans dernier tiers)"
        ],
        "physique": [
            "Vitesse & explosivité (profondeur, transition)",
            "Puissance & engagement (duels, couverture du ballon)",
            "Endurance (répétition d’efforts, pressing/replis)",
            "Coordination & vivacité (appuis, changements de direction)"
        ],
        "mental": [
            "Vision & intelligence de jeu (orientation, lecture des situations, anticipation)",
            "Détermination & résilience (capacité à réagir après perte, résistance aux échecs)",
            "Confiance & initiative (prise de risque créative, tirer/passer sous pression)",
            "Concentration & lucidité (exécution rapide, justesse dans zones décisives)",
            "Esprit collectif (communication, leadership, discipline tactique)"
        ]
    }'::jsonb
),

-- -----------------------------------------------------------------------------
-- 2. Ailier (RW / LW)
-- -----------------------------------------------------------------------------
(
    'RW / LW', 
    'Ailier', 
    '', 
    'FW', 
    '{
        "technique": [
            "Première touche & contrôles (orientés, sous pression, en mouvement)",
            "Passe & relance (courte/longue, remises, déviations, cassant les lignes)",
            "Dribbles & 1v1 (feintes, création supériorité)",
            "Centres",
            "Frappe & finition (variété de tirs, efficacité dans surface)",
            "Jeu de tête (offensif & défensif)",
            "Conservation & disponibilité (dos au but, entre lignes)",
            "Créativité et progression de balle",
            "Capacités défensives spécifiques (interceptions, récupération, pression orientée)"
        ],
        "tactique": [
            "Réactivité en transitions (B+ ↔ B-, pressing/repli)",
            "Positionnement & alignement (placement, cadrage, couverture, marquage)",
            "Verticalité & occupation des espaces (appels en profondeur, déplacements entre lignes, occupation surface)",
            "Lecture & compréhension du jeu (prise d’info, contrôle du tempo, gestion déséquilibres)"
        ],
        "physique": [
            "Vitesse & explosivité (appels, transitions)",
            "Puissance & engagement (duels, protection ballon)",
            "Endurance (volume de jeu, répétition d’efforts)",
            "Coordination, appuis & vivacité (changements de direction, agilité)"
        ],
        "mental": [
            "Vision & intelligence de jeu (orientation, anticipation, lecture des situations)",
            "Détermination & résilience (résistance aux échecs, capacité à oublier le précédent)",
            "Confiance & initiative (prise de risque créative, courage, leadership)",
            "Communication & esprit collectif (cohésion, bon état d’esprit, discipline)",
            "Concentration & lucidité (gestion du stress, endurance mentale, justesse sous pression)"
        ]
    }'::jsonb
),

-- -----------------------------------------------------------------------------
-- 3. Milieu Offensif (CAM / 10)
-- -----------------------------------------------------------------------------
(
    'CAM / 10', 
    'Milieu offensif', 
    '', 
    'MF', 
    '{
        "technique": [
            "Première touche & contrôles (orientés, sous pression, en mouvement)",
            "Passe & relance (courte/longue, cassant les lignes, remises, déviations)",
            "Dribbles & 1v1 (feintes, création de supériorité)",
            "Frappe & finition (variété de tirs, efficacité devant le but, capacité à marquer)",
            "Jeu de tête (offensif & défensif)",
            "Centres & création d’occasions",
            "Conservation & disponibilité (dos au but, entre lignes)",
            "Défense individuelle (interceptions, récupération, cadrage, pression)"
        ],
        "tactique": [
            "Réactivité en transitions (B+ ↔ B-, pressing/repli)",
            "Positionnement & couverture (placement, alignement, cadrage, marquage, couverture)",
            "Lecture & compréhension du jeu (prise d’info, contrôle du tempo, anticipation, gestion déséquilibres)",
            "Verticalité & occupation espaces (appels en profondeur, déplacements entre lignes, occupation surface)"
        ],
        "physique": [
            "Vitesse & explosivité (profondeur, transitions)",
            "Puissance & engagement (force dans les duels)",
            "Endurance (volume de jeu, répétition d’efforts)",
            "Coordination, appuis & vivacité (agilité, changements de direction)"
        ],
        "mental": [
            "Vision & intelligence de jeu (orientation, anticipation, lecture, perception)",
            "Détermination & résilience (résistance aux échecs, capacité à oublier l’action précédente, endurance mentale)",
            "Confiance & initiative (prise de risque, créativité, courage)",
            "Communication & leadership (bon état d’esprit, esprit collectif, gestion du stress, concentration)",
            "Esprit collectif & générosité (solidarité, connexions, pressing intelligent)"
        ]
    }'::jsonb
),

-- -----------------------------------------------------------------------------
-- 4. Milieu Défensif (CDM / 6)
-- -----------------------------------------------------------------------------
(
    'CDM / 6', 
    'Milieu défensif', 
    '', 
    'MF', 
    '{
        "technique": [
            "Contrôle & première touche (sous pression, orientée, en mouvement)",
            "Passe & relance (courte/longue, dosée, déviation, cassant les lignes)",
            "Dribbles & 1v1 (conduite, feintes, demi-tour, supériorité)",
            "Frappe & finition (tirs, verticalité offensive, capacité à marquer)",
            "Jeu de tête (offensif & défensif)",
            "Défense individuelle (duels, cadrage, recul-frein, tacles, interceptions, récupération)",
            "Contrôle du tempo (accélérer/décélérer, orientation du corps, rythme du jeu)"
        ],
        "tactique": [
            "Transitions & pressing (B+ ↔ B-, réactivité, pressing/repli, marquage préventif)",
            "Positionnement & couverture (placement, alignement, cadrage, marquage, gestion infériorité)",
            "Lecture & contrôle du jeu (prise d’info, anticipation, gestion des temps forts/faibles)",
            "Gestion & occupation d’espaces (mouvements entre lignes, projection vers l’avant, couverture défensive)",
            "Verticalité & créativité (apports offensifs, fixation, jeu direct)"
        ],
        "physique": [
            "Endurance & intensité (volume de jeu, répétition des efforts)",
            "Puissance & duels (force, impact physique)",
            "Vitesse & explosivité (profondeur, premiers appuis)",
            "Coordination & agilité (appuis, vivacité, équilibre)",
            "Profils spécifiques (latéral, box-to-box)"
        ],
        "mental": [
            "Vision & intelligence de jeu (orientation, gestion du temps, perception/prise d’info)",
            "Confiance & initiative (prise de risque, créativité, courage, agressivité positive)",
            "Concentration & résilience (alerte, endurance mentale, capacité à oublier l’action précédente)",
            "Communication & leadership (bon état d’esprit, disponibilité pour le porteur, influence collective)"
        ]
    }'::jsonb
),

-- -----------------------------------------------------------------------------
-- 5. Défenseur Central (CB)
-- -----------------------------------------------------------------------------
(
    'CB', 
    'Défenseur central', 
    '', 
    'DF', 
    '{
        "technique": [
            "Contrôle & première touche (orientée, sous pression, en mouvement)",
            "Passe & relance (courte/longue, filtrante, diagonale, déviation, sous pression)",
            "Jeu de tête & duels (offensif/défensif, aériens & au sol)",
            "Frappe & tirs (variété, efficacité)",
            "Dribbles & conduite (jusqu’au moment opportun, feintes, 1v1)",
            "Défense individuelle (cadrage, recul-frein, tacles maîtrisés, interceptions, récupération)",
            "Prise d’information & décision (rapidité, sélection de passe, orientation du corps)"
        ],
        "tactique": [
            "Transitions & pressing (B+ ↔ B-, réactivité, marquage préventif, gestion profondeur)",
            "Positionnement & couverture (placement, alignement, cadrage, couverture espace)",
            "Lecture & anticipation (trajectoires, pertes, profondeur, danger immédiat)",
            "Gestion du bloc & tempo (remontée, contrôle défensif, rythme du jeu)",
            "Verticalité & participation offensive (projection, relance, fixation, compréhension du jeu)"
        ],
        "physique": [
            "Vitesse & accélération (profondeur, mobilité, transitions rapides)",
            "Explosivité & détente (premiers appuis, duels aériens, impulsion)",
            "Puissance & gabarit (force, impact physique, jeu de tête off/def)",
            "Endurance & intensité (répétition d’efforts, volume de jeu)",
            "Coordination & agilité (appuis, équilibre, profil latéral inclus)"
        ],
        "mental": [
            "Vision & intelligence de jeu (lecture, anticipation, flair, perception → prise d’info & décision)",
            "Détermination & agressivité (courage, intensité dans les duels, esprit compétitif)",
            "Concentration & résilience (gestion des transitions, réactivité, bon état d’esprit)",
            "Leadership & communication (confiance, influence, coordination collective)"
        ]
    }'::jsonb
),

-- -----------------------------------------------------------------------------
-- 6. Latéraux (RB/LB)
-- -----------------------------------------------------------------------------
(
    'RB/LB', 
    'Latéraux', 
    '', 
    'DF', 
    '{
        "technique": [
            "Contrôle & première touche (orienté, sous pression, tous types)",
            "Passe & relance (courte/longue, dosée, remises/déviations, soutien à la relance)",
            "Dribbles & duels 1v1 (offensifs/défensifs, feintes, conservation)",
            "Centres & jeu de tête (offensif & défensif)",
            "Frappe & tirs (variété, efficacité)",
            "Défense individuelle (cadrage, interceptions, tacles/charges, défense haute)"
        ],
        "tactique": [
            "Transitions & pressing (B+ ↔ B-, réactivité, repli, pressing intelligent)",
            "Positionnement & discipline (alignement, replacement, marquage individuel/couverture)",
            "Lecture & compréhension du jeu (anticipation pertes/profondeur, conscience espace-temps, gestion infériorité)",
            "Verticalité & largeur (appels en profondeur, participation offensive, dédoublements)",
            "Créativité & relance (fixation, circulation, apporter des solutions)"
        ],
        "physique": [
            "Vitesse & accélération (profondeur, transitions)",
            "Explosivité & détente (appuis, impulsion, duels aériens)",
            "Puissance & engagement (force dans les duels, intensité physique)",
            "Endurance & mobilité (répétition d’efforts, couverture terrain)",
            "Agilité & coordination (souplesse, équilibre, changements de direction)"
        ],
        "mental": [
            "Vision & intelligence de jeu (lecture, anticipation, perception → analyse → décision)",
            "Détermination & agressivité (courage, intensité, dépassement de soi)",
            "Concentration & constance (répétition d’efforts, justesse sous pression)",
            "Confiance & leadership (communication, influence, bon état d’esprit)"
        ]
    }'::jsonb
),

-- -----------------------------------------------------------------------------
-- 7. Gardien de But (GK) - Profil Préservé pour la Cellule Spécifique Gardiens
-- -----------------------------------------------------------------------------
(
    'GK', 
    'Gardien', 
    '', 
    'GK', 
    '{
        "technique": [
            "Prise de balle",
            "Jeu au pied",
            "Passe courte",
            "Passe longue",
            "Sorties aériennes",
            "1 contre 1",
            "Arrêts"
        ],
        "tactique": [
            "Placement",
            "Positionnement",
            "Anticipation",
            "Lecture des trajectoires",
            "Gestion profondeur",
            "Relance",
            "Organisation défense"
        ],
        "physique": [
            "Explosivité",
            "Détente",
            "Agilité",
            "Vitesse",
            "Coordination",
            "Souplesse",
            "Force"
        ],
        "mental": [
            "Concentration",
            "Réactivité",
            "Confiance",
            "Gestion de pression",
            "Communication",
            "Prise de décision",
            "Leadership"
        ]
    }'::jsonb
)

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    emoji = EXCLUDED.emoji,
    category = EXCLUDED.category,
    criteria = EXCLUDED.criteria,
    updated_at = timezone('utc'::text, now());
