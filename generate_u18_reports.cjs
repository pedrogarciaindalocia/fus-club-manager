// Générateur complet de la migration SQL pour les 44 rapports scouts U18 (2 par joueur)
const fs = require('fs');
const path = require('path');

const U18_PLAYERS = [
  // 1. GARDIENS DE BUT (GK)
  {
    id: 'c0000000-0018-0001-0000-000000000111',
    first_name: 'Ziyad',
    last_name: 'Boukhalfa',
    pos_code: 'GK',
    position: 'Gardien de But',
    club: 'MAS Fès U18',
    foot: 'Droitier',
    height: 182,
    weight: 73,
    r1: {
      title: 'Observation J11 Botola Pro U18 vs MAS Fès',
      date: '2026-08-26',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'recruit_now',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 0,
      assists: 0,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [84, 80, 78, 86, 88], // speed, end, str, agi, jmp
        ment: [86, 88, 84, 85, 82], // det, foc, team, comp, lead
        tact: [85, 83, 87, 85, 84], // pos, vis, ant, iq, trans
        tech: [88, 84, 70, 72, 75]  // first, pass, shoot, drib, head
      },
      crit: {
        "Prise de balle": 8.8,
        "Jeu au pied": 8.2,
        "Sorties aériennes": 8.6,
        "1 contre 1": 9.0,
        "Arrêts": 8.9,
        "Placement": 8.5,
        "Anticipation": 8.7,
        "Explosivité": 8.5,
        "Concentration": 8.8
      },
      strengths: "Envergure imposante et autorité remarquable dans les sorties aériennes sous contact. Réflexes au sol de très haut niveau sur les frappes à mi-distance. Capacité à rassurer son bloc défensif.",
      weaknesses: "Relance au pied sous pressing à perfectionner sur son pied gauche. Tendance à relâcher certains ballons lourds en corner au lieu de bloquer.",
      projection: "Prêt pour intégrer immédiatement le groupe Élite U19 et servir de 3e gardien sur la feuille de match de l'équipe Réserve FUS en Botola D2.",
      tech_report: "Excellente main ferme et prise de balle sécurisée. Jeu long au pied précis sur l'aile droite.",
      tact_report: "Placement axial irréprochable. Bonne anticipation des passes dans le dos de sa charnière.",
      phys_report: "Détente verticale explosive et temps de réaction très vif sur ses appuis bas.",
      ment_report: "Calme olympien sous la pression du public adverse. Communication vocale claire et autoritaire.",
      notes: "Prestation aboutie récompensée par un clean-sheet et 5 arrêts déterminants."
    },
    r2: {
      title: 'Observation 1/4 Finale Coupe du Trône U18 vs RS Berkane',
      date: '2026-09-18',
      evaluator_name: 'Hassan Benabicha',
      evaluator_id: 'a0000000-0000-0000-0000-000000000003',
      decision: 'recruit_now',
      starter: true,
      formation: '4-2-3-1',
      minutes: 90,
      goals: 0,
      assists: 0,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [85, 82, 80, 87, 90],
        ment: [88, 90, 86, 88, 85],
        tact: [86, 85, 88, 86, 85],
        tech: [89, 85, 70, 74, 76]
      },
      crit: {
        "Prise de balle": 9.0,
        "Jeu au pied": 8.4,
        "Sorties aériennes": 8.8,
        "1 contre 1": 9.2,
        "Arrêts": 9.1,
        "Placement": 8.7,
        "Anticipation": 8.9,
        "Explosivité": 8.8,
        "Concentration": 9.0
      },
      strengths: "Arrêt décisif sur penalty à la 74e minute. Parade réflexe sur corner direct. Lecture chirurgicale des trajectoires fuyantes.",
      weaknesses: "Doit communiquer davantage avec son latéral droit sur les couvertures en profondeur.",
      projection: "Signature prioritaire recommandée pour sécuriser le poste de gardien N°1 à l'Académie FUS.",
      tech_report: "Jeu au pied mi-long chirurgical vers les ailiers. Prise de balle impeccable même sous pluie battante.",
      tact_report: "Rôle de gardien-libéro assumé avec maturité. Réduit les espaces entre la ligne arrière et son but.",
      phys_report: "Impulsion tonique et grande souplesse articulaire sur les plongeons latéraux.",
      ment_report: "Détermination contagieuse. A harangué sa défense dans les 10 dernières minutes sous pression.",
      notes: "Homme du match incontestable. Rapport validé par Hassan Benabicha."
    }
  },
  {
    id: 'c0000000-0018-0001-0000-000000000112',
    first_name: 'Reda',
    last_name: 'Bennis',
    pos_code: 'GK',
    position: 'Gardien de But',
    club: 'Kawkab Marrakech U18',
    foot: 'Droitier',
    height: 179,
    weight: 70,
    r1: {
      title: 'Observation J09 Championnat U18 vs KACM',
      date: '2026-08-22',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'to_follow',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 0,
      assists: 0,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [78, 76, 74, 82, 80],
        ment: [80, 82, 80, 78, 75],
        tact: [76, 78, 79, 77, 75],
        tech: [81, 79, 65, 68, 70]
      },
      crit: {
        "Prise de balle": 8.0,
        "Jeu au pied": 7.9,
        "Sorties aériennes": 7.4,
        "1 contre 1": 8.1,
        "Arrêts": 8.2,
        "Placement": 7.7,
        "Anticipation": 7.8,
        "Explosivité": 8.0,
        "Concentration": 8.1
      },
      strengths: "Vitesse d'intervention sur la ligne très satisfaisante. Bonnes sorties dans les pieds des attaquants adverses.",
      weaknesses: "Déficit d'envergure sur les centres au deuxième poteau. Hésitation occasionnelle sur les prises de décision aériennes.",
      projection: "Profil avec une marge de progression technique intéressante. À intégrer dans un programme de renforcement spécifique.",
      tech_report: "Pied droit fiable pour relancer court. Prise de balle convenable dans la niche.",
      tact_report: "Alignement correct sur sa ligne de but mais reste parfois trop passif sur sa ligne lors des attaques placées.",
      phys_report: "Très agile et souple sur les appuis bas, manque encore de masse musculaire sur le haut du corps.",
      ment_report: "Appliqué et à l'écoute des consignes. Doit gagner en assurance face aux adversaires agressifs.",
      notes: "Prestation sérieuse avec 3 arrêts cruciaux pour préserver le match nul."
    },
    r2: {
      title: 'Observation Match Amical Détection Régionale Marrakech',
      date: '2026-09-12',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'invitation_test',
      starter: false,
      formation: '4-4-2',
      minutes: 45,
      goals: 0,
      assists: 0,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [80, 78, 75, 84, 82],
        ment: [82, 84, 82, 80, 77],
        tact: [78, 80, 81, 79, 77],
        tech: [83, 81, 67, 70, 72]
      },
      crit: {
        "Prise de balle": 8.2,
        "Jeu au pied": 8.1,
        "Sorties aériennes": 7.7,
        "1 contre 1": 8.3,
        "Arrêts": 8.4,
        "Placement": 8.0,
        "Anticipation": 8.1,
        "Explosivité": 8.2,
        "Concentration": 8.3
      },
      strengths: "Entrée en jeu dynamique à la mi-temps. Deux claquettes décisives sous la barre transversale.",
      weaknesses: "Doit accélérer ses relances à la main pour amorcer les contre-attaques.",
      projection: "Invitation proposée pour une semaine d'immersion au centre de formation FUS à Rabat.",
      tech_report: "Bonne coordination œil-main. Relances au pied gauche en nette amélioration.",
      tact_report: "Meilleure gestion de la profondeur et positionnement plus haut sur le terrain.",
      phys_report: "Bonne tonicité musculaire sur les appuis de reprise.",
      ment_report: "Volonté évidente de prouver sa valeur lors de son entrée. Belle concentration.",
      notes: "Confirmation des progrès notés en août. Joueur en phase d'ascension."
    }
  },

  // 2. LATÉRAUX DROITS (RB_LB)
  {
    id: 'c0000000-0018-0002-0000-000000000113',
    first_name: 'Sami',
    last_name: 'Zerouali',
    pos_code: 'RB_LB',
    position: 'Latéral Droit',
    club: 'Ittihad Tanger U18',
    foot: 'Droitier',
    height: 174,
    weight: 66,
    r1: {
      title: 'Observation J13 Botola Pro U18 vs IR Tanger',
      date: '2026-08-28',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'recruit_now',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 0,
      assists: 1,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [94, 90, 82, 89, 84],
        ment: [88, 86, 88, 85, 80],
        tact: [86, 88, 87, 86, 88],
        tech: [89, 88, 76, 89, 78]
      },
      crit: {
        "Vitesse & accélération": 9.4,
        "Endurance & répétition d'efforts": 9.1,
        "Dribbles & duels 1v1": 8.9,
        "Centres & passes": 8.8,
        "Repli défensif & compensation": 8.6,
        "Qualité de relance": 8.7
      },
      strengths: "Vitesse fulgurante sur les débordements couloir droit. Qualité de centre tendu entre le gardien et le point de penalty. Intensité remarquable du début à la fin.",
      weaknesses: "Marquage parfois trop lâche dans son dos lors des phases de transition adverse rapide.",
      projection: "Profil taillé pour le système moderne du FUS. Éligible pour une intégration directe en Équipe Réserve U21.",
      tech_report: "Conduite de balle en pleine vitesse sans perte de contrôle. Précision remarquable sur les centres en première intention.",
      tact_report: "Comprend parfaitement les dédoublements avec son ailier. Décrochages intelligents pour offrir une solution.",
      phys_report: "Capacité aérobie impressionnante, répète les courses à haute intensité sur 90 minutes.",
      ment_report: "Guerrier sur le terrain, ne recule devant aucun duel au sol. Tempérament de gagneur.",
      notes: "Auteur d'une passe décisive superbe à la 62e minute sur un centre millimétré."
    },
    r2: {
      title: 'Observation 1/4 Finale Tournoi National Excellence U18',
      date: '2026-09-19',
      evaluator_name: 'Hassan Benabicha',
      evaluator_id: 'a0000000-0000-0000-0000-000000000003',
      decision: 'recruit_now',
      starter: true,
      formation: '3-5-2',
      minutes: 90,
      goals: 1,
      assists: 0,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [95, 92, 84, 91, 85],
        ment: [90, 88, 89, 87, 83],
        tact: [88, 90, 89, 88, 90],
        tech: [90, 89, 80, 90, 80]
      },
      crit: {
        "Vitesse & accélération": 9.5,
        "Endurance & répétition d'efforts": 9.3,
        "Dribbles & duels 1v1": 9.1,
        "Centres & passes": 9.0,
        "Repli défensif & compensation": 8.8,
        "Qualité de relance": 8.9
      },
      strengths: "Utilisé comme piston droit dans un 3-5-2 : a régné sur l'ensemble de son couloir. But spectaculaire inscrit d'une frappe sous la barre.",
      weaknesses: "Doit éviter de contester les décisions arbitrales sur les fautes d'engagement.",
      projection: "L'un des latéraux droits les plus prometteurs du Royaume dans la génération 2008. Recrutement prioritaire.",
      tech_report: "Qualité de frappe de balle surprenante. Dribbles intérieurs et extérieurs très déstabilisants.",
      tact_report: "Adaptation tactique instantanée au rôle de piston moderne, alternance attaque/défense exemplaire.",
      phys_report: "Explosivité intacte dans le temps additionnel, dominante nette face à son vis-à-vis.",
      ment_report: "Prestation de leader technique et physique. Très impliqué pour son collectif.",
      notes: "Validation conjointe Sektioui/Benabicha : proposition de contrat FUS à préparer."
    }
  },
  {
    id: 'c0000000-0018-0002-0000-000000000114',
    first_name: 'Ayman',
    last_name: 'Rahimi',
    pos_code: 'RB_LB',
    position: 'Latéral Droit',
    club: 'Olympique Safi U18',
    foot: 'Droitier',
    height: 171,
    weight: 63,
    r1: {
      title: 'Observation J08 Championnat National U18 vs OCS',
      date: '2026-08-20',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'to_follow',
      starter: true,
      formation: '4-4-2',
      minutes: 75,
      goals: 0,
      assists: 1,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [80, 78, 74, 82, 76],
        ment: [78, 80, 82, 76, 74],
        tact: [77, 78, 76, 77, 78],
        tech: [81, 80, 68, 82, 70]
      },
      crit: {
        "Vitesse & accélération": 8.2,
        "Endurance & répétition d'efforts": 7.9,
        "Dribbles & duels 1v1": 8.1,
        "Centres & passes": 8.0,
        "Repli défensif & compensation": 7.6,
        "Qualité de relance": 7.8
      },
      strengths: "Vivacité d'appuis et capacité à combiner dans les petits espaces. Passe décisive sur un une-deux bien senti.",
      weaknesses: "Gabarit léger dans les duels à l'impact physique. Sorti à la 75e pour cause de crampes.",
      projection: "Joueur technique à profil d'appoint, nécessitant un cycle de développement musculaire.",
      tech_report: "Bon toucher de balle et précision satisfaisante sur les passes courtes de relance.",
      tact_report: "Respecte son couloir mais anticipe parfois tardivement les ouvertures adverses dans son dos.",
      phys_report: "Bonne pointe de vitesse mais manque d'endurance de puissance sur la durée complète.",
      ment_report: "Attitude positive, combatif malgré le déficit de puissance physique face aux attaquants.",
      notes: "À revoir sur un match d'intensité supérieure."
    },
    r2: {
      title: 'Observation Match Amical Détection U18 vs KACM',
      date: '2026-09-14',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'invitation_test',
      starter: true,
      formation: '4-2-3-1',
      minutes: 85,
      goals: 0,
      assists: 0,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [82, 80, 76, 84, 78],
        ment: [80, 82, 84, 78, 76],
        tact: [79, 80, 78, 79, 80],
        tech: [83, 82, 70, 84, 72]
      },
      crit: {
        "Vitesse & accélération": 8.4,
        "Endurance & répétition d'efforts": 8.1,
        "Dribbles & duels 1v1": 8.3,
        "Centres & passes": 8.1,
        "Repli défensif & compensation": 7.9,
        "Qualité de relance": 8.0
      },
      strengths: "Amélioration visible de la résistance physique. 4 tacles propres sans concéder de coup franc dangereux.",
      weaknesses: "Centres au second poteau manquant de hauteur et de force sous la pression du défenseur.",
      projection: "Convocation pour un stage d'évaluation de 3 jours à Rabat sous la supervision du staff FUS.",
      tech_report: "Sorties de balle soignées, évite de dégager au hasard sous la pression adverse.",
      tact_report: "Meilleur positionnement défensif sur la ligne de hors-jeu.",
      phys_report: "A tenu 85 minutes avec une meilleure gestion de ses temps de récupération.",
      ment_report: "Rigueur accrue dans le repli et meilleure concentration globale.",
      notes: "Progression notable entre août et septembre."
    }
  },

  // 3. DÉFENSEURS CENTRAUX DROITS (CB)
  {
    id: 'c0000000-0018-0003-0000-000000000115',
    first_name: 'Yassine',
    last_name: 'Aboukhlal',
    pos_code: 'CB',
    position: 'Défenseur Central Droit',
    club: 'Union Touarga Sport U18',
    foot: 'Droitier',
    height: 184,
    weight: 76,
    r1: {
      title: 'Observation J12 Championnat U18 vs UTS Touarga',
      date: '2026-08-25',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'recruit_now',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 1,
      assists: 0,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [86, 88, 92, 82, 90],
        ment: [90, 88, 89, 87, 88],
        tact: [90, 88, 91, 89, 87],
        tech: [86, 88, 72, 78, 92]
      },
      crit: {
        "Jeu de tête & duels": 9.3,
        "Défense individuelle & tacles": 9.0,
        "Passe & relance": 8.7,
        "Positionnement & couverture": 8.9,
        "Puissance & gabarit": 9.1,
        "Leadership & communication": 8.8
      },
      strengths: "Patron défensif avec un gabarit athlétique hors normes. Intraitable dans le jeu aérien, but marqué de la tête sur corner.",
      weaknesses: "Premier pas de recul à travailler face aux attaquants de très petite taille ultra-vifs.",
      projection: "Potentiel titulaire indiscutable en réserve U21 et trajectoire tracée vers l'équipe professionnelle.",
      tech_report: "Excellente relance pied droit, casse les lignes adverses avec des passes claquées plein axe.",
      tact_report: "Coordination parfaite avec son partenaire d'axe, commande la remontée du bloc défensif.",
      phys_report: "Puissance musculaire dominante dans les duels d'épaule, détente verticale impressionnante.",
      ment_report: "Capitaine naturel, communique en permanence pour replacer ses milieux défensifs.",
      notes: "Prestation royale : 9 duels aériens gagnés sur 10. Rapport élogieux."
    },
    r2: {
      title: 'Observation 1/2 Finale Tournoi Régional Rabat-Salé U18',
      date: '2026-09-17',
      evaluator_name: 'Hassan Benabicha',
      evaluator_id: 'a0000000-0000-0000-0000-000000000003',
      decision: 'recruit_now',
      starter: true,
      formation: '4-2-3-1',
      minutes: 90,
      goals: 0,
      assists: 1,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [88, 89, 93, 84, 91],
        ment: [92, 90, 91, 89, 90],
        tact: [91, 89, 92, 90, 88],
        tech: [87, 89, 74, 80, 93]
      },
      crit: {
        "Jeu de tête & duels": 9.4,
        "Défense individuelle & tacles": 9.2,
        "Passe & relance": 8.9,
        "Positionnement & couverture": 9.1,
        "Puissance & gabarit": 9.3,
        "Leadership & communication": 9.0
      },
      strengths: "Interceptions souveraines et passe décisive sur une relance longue millimétrée de 50 mètres.",
      weaknesses: "Excès d'assurance sur une relance courte interceptée à 25m en milieu de première période.",
      projection: "Dossier prioritaire d'incorporation à l'Académie FUS pour la saison 2026/2027.",
      tech_report: "Ouverture diagonale droite-gauche de niveau senior. Contrôle de poitrine serein sous pression.",
      tact_report: "Sens tactique aiguisé, bloque les couloirs de passe adverses avec une grande lucidité.",
      phys_report: "Solidité au duel au sol remarquable, ne cède aucun mètre face à l'avant-centre.",
      ment_report: "Autorité sereine, tempérament de compétiteur d'élite sans agressivité malveillante.",
      notes: "Fiche de recrutement finalisée avec avis très favorable."
    }
  },
  {
    id: 'c0000000-0018-0003-0000-000000000116',
    first_name: 'Marouane',
    last_name: 'En-Nesyri',
    pos_code: 'CB',
    position: 'Défenseur Central Droit',
    club: 'Union Sportive Témara U18',
    foot: 'Droitier',
    height: 181,
    weight: 73,
    r1: {
      title: 'Observation J10 Championnat U18 vs UST',
      date: '2026-08-21',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'to_follow',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 0,
      assists: 0,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [82, 84, 86, 78, 85],
        ment: [84, 82, 85, 80, 78],
        tact: [81, 79, 82, 80, 79],
        tech: [80, 82, 65, 72, 86]
      },
      crit: {
        "Jeu de tête & duels": 8.6,
        "Défense individuelle & tacles": 8.2,
        "Passe & relance": 8.0,
        "Positionnement & couverture": 8.1,
        "Puissance & gabarit": 8.4,
        "Leadership & communication": 7.9
      },
      strengths: "Défenseur combatif, très solide dans le duel aérien et propre sur les tacles glissés.",
      weaknesses: "Vitesse de pivotement moyenne sur les changements d'orientation de l'attaque adverse.",
      projection: "Défenseur central avec des bases solides, à évaluer en situation de jeu rapide.",
      tech_report: "Relance courte propre vers les milieux axiaux. Dégagements de la tête autoritaires.",
      tact_report: "Garde bien sa zone axiale mais laisse parfois trop d'espace entre lui et son latéral.",
      phys_report: "Bonne puissance musculaire, encaisse bien les charges adverses dos au jeu.",
      ment_report: "Engagement total, généreux dans les efforts défensifs.",
      notes: "Match courageux, a contenu le meilleur buteur adverse."
    },
    r2: {
      title: 'Observation Match Détection Témara vs FUS B',
      date: '2026-09-15',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'invitation_test',
      starter: true,
      formation: '3-4-3',
      minutes: 90,
      goals: 0,
      assists: 0,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [83, 85, 87, 80, 86],
        ment: [86, 84, 86, 82, 80],
        tact: [83, 81, 84, 82, 81],
        tech: [82, 83, 67, 74, 87]
      },
      crit: {
        "Jeu de tête & duels": 8.7,
        "Défense individuelle & tacles": 8.4,
        "Passe & relance": 8.2,
        "Positionnement & couverture": 8.3,
        "Puissance & gabarit": 8.5,
        "Leadership & communication": 8.1
      },
      strengths: "Positionné axial droit dans une défense à trois : couverture sécurisante et zéro faute bête concédée.",
      weaknesses: "Peut progresser sur la prise d'initiative balle au pied pour franchir le premier rideau.",
      projection: "Invitation confirmée pour participer au stage de sélection à l'Académie FUS.",
      tech_report: "Précision de passe améliorée sur les diagonales vers l'ailier opposé.",
      tact_report: "Meilleure entente avec les latéraux sur les glissements défensifs.",
      phys_report: "Endurance solide sans baisse de régime en fin de rencontre.",
      ment_report: "Attitude irréprochable et discipline tactique respectée.",
      notes: "Progression technique encourageante."
    }
  },

  // 4. DÉFENSEURS CENTRAUX GAUCHES (CB)
  {
    id: 'c0000000-0018-0004-0000-000000000117',
    first_name: 'Adam',
    last_name: 'Bellarabi',
    pos_code: 'CB',
    position: 'Défenseur Central Gauche',
    club: 'AS FAR Jeunes U18',
    foot: 'Gaucher',
    height: 183,
    weight: 75,
    r1: {
      title: 'Observation Derby Jeunes vs AS FAR U18',
      date: '2026-08-29',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'recruit_now',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 0,
      assists: 1,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [86, 88, 89, 84, 88],
        ment: [89, 88, 90, 87, 85],
        tact: [89, 90, 90, 89, 88],
        tech: [90, 92, 70, 80, 89]
      },
      crit: {
        "Passe & relance": 9.2,
        "Positionnement & couverture": 9.0,
        "Défense individuelle & tacles": 8.9,
        "Jeu de tête & duels": 8.8,
        "Puissance & gabarit": 8.9,
        "Leadership & communication": 8.7
      },
      strengths: "Défenseur central gaucher rare de très grande qualité. Sorties de balle d'une fluidité et d'une précision chirurgicales. Calme absolu sous pression.",
      weaknesses: "Peut parfois faire preuve d'un excès de confiance en voulant relancer court dans sa propre surface.",
      projection: "Profil stratégique prioritaire : pied gauche naturel pour l'axe FUS, trajectoire directe vers la Botola Pro.",
      tech_report: "Pied gauche exceptionnel. Transversales millimétrées et passes lasers qui éliminent deux lignes adverses.",
      tact_report: "Intelligence de placement très au-dessus de la moyenne d'âge. Excellente lecture des trajectoires.",
      phys_report: "Gabarit équilibré, vitesse de course suffisante pour compenser la profondeur.",
      ment_report: "Sérénité contagieuse pour toute sa ligne défensive. Zéro panique dans le temps fort adverse.",
      notes: "Passe décisive délivrée sur une ouverture de 60 mètres. Évaluation de premier ordre."
    },
    r2: {
      title: 'Observation Tournoi National Espoirs - Choc vs Raja CA U18',
      date: '2026-09-20',
      evaluator_name: 'Hassan Benabicha',
      evaluator_id: 'a0000000-0000-0000-0000-000000000003',
      decision: 'recruit_now',
      starter: true,
      formation: '4-2-3-1',
      minutes: 90,
      goals: 0,
      assists: 0,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [87, 89, 90, 85, 89],
        ment: [91, 90, 92, 89, 87],
        tact: [90, 91, 91, 90, 89],
        tech: [91, 93, 72, 82, 90]
      },
      crit: {
        "Passe & relance": 9.3,
        "Positionnement & couverture": 9.1,
        "Défense individuelle & tacles": 9.0,
        "Jeu de tête & duels": 9.0,
        "Puissance & gabarit": 9.0,
        "Leadership & communication": 8.9
      },
      strengths: "Maîtrise totale face aux meilleurs attaquants U18 du pays. 6 interceptions et 100% de passes réussies en première période.",
      weaknesses: "Engagement aérien à durcir sur les coups de pied arrêtés offensifs pour marquer davantage.",
      projection: "Signature immédiate préconisée. Le FUS doit sécuriser ce joueur avant la concurrence des clubs étrangers.",
      tech_report: "Toucher soyeux pied gauche, protection de balle exemplaire sous le pressing adverse.",
      tact_report: "Gère la ligne défensive avec une autorité de joueur professionnel confirmé.",
      phys_report: "Excellente tonicité et résistance dans les contacts physiques.",
      ment_report: "Concentration sans faille sur les 94 minutes de la rencontre.",
      notes: "Joueur clé. Fiche de signature transmise à la direction sportive."
    }
  },
  {
    id: 'c0000000-0018-0004-0000-000000000118',
    first_name: 'Soufiane',
    last_name: 'Boukhriss',
    pos_code: 'CB',
    position: 'Défenseur Central Gauche',
    club: 'Wydad AC Jeunes U18',
    foot: 'Gaucher',
    height: 180,
    weight: 72,
    r1: {
      title: 'Observation J11 Championnat U18 vs WAC',
      date: '2026-08-24',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'to_follow',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 0,
      assists: 0,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [80, 82, 84, 78, 82],
        ment: [82, 80, 84, 78, 76],
        tact: [82, 80, 83, 81, 80],
        tech: [83, 84, 66, 75, 84]
      },
      crit: {
        "Passe & relance": 8.3,
        "Positionnement & couverture": 8.2,
        "Défense individuelle & tacles": 8.1,
        "Jeu de tête & duels": 8.2,
        "Puissance & gabarit": 8.2,
        "Leadership & communication": 7.8
      },
      strengths: "Défenseur propre avec une bonne patte gauche. Bonne anticipation sur les centres adverses au premier poteau.",
      weaknesses: "Doit s'affirmer physiquement dans les duels au sol face aux buteurs physiques.",
      projection: "Joueur élégant avec du potentiel. Deuxième test recommandé lors d'une opposition amicale.",
      tech_report: "Pied gauche précis pour allonger le jeu. Bon contrôle orienté.",
      tact_report: "Comprend les consignes de repli mais manque de rigueur dans l'alignement sur le hors-jeu.",
      phys_report: "Endurance convenable, mais développement musculaire nécessaire sur les membres inférieurs.",
      ment_report: "Calme, écoute les consignes, tempérament appliqué.",
      notes: "Match sérieux, joueur appliqué."
    },
    r2: {
      title: 'Observation Match Amical Détection Casablanca vs FUS U18',
      date: '2026-09-16',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'invitation_test',
      starter: true,
      formation: '4-2-3-1',
      minutes: 90,
      goals: 0,
      assists: 0,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [82, 84, 85, 80, 84],
        ment: [84, 82, 85, 80, 78],
        tact: [84, 82, 85, 83, 82],
        tech: [85, 86, 68, 77, 85]
      },
      crit: {
        "Passe & relance": 8.5,
        "Positionnement & couverture": 8.4,
        "Défense individuelle & tacles": 8.3,
        "Jeu de tête & duels": 8.4,
        "Puissance & gabarit": 8.3,
        "Leadership & communication": 8.0
      },
      strengths: "Progression notable dans l'impact physique. Trois tacles glissés salvateurs dans la zone dangereuse.",
      weaknesses: "Prend encore des risques sur certaines passes latérales sous pressing haut.",
      projection: "Invitation à un stage d'immersion d'une semaine au centre d'entraînement du FUS.",
      tech_report: "Très bon jeu long tendu vers le couloir opposé.",
      tact_report: "Sens de l'anticipation en hausse, meilleure lecture des une-deux adverses.",
      phys_report: "Intensité maintenue sur l'ensemble de la rencontre.",
      ment_report: "Plus de voix et d'affirmation dans la commande de son latéral gauche.",
      notes: "Évolution positive confirmée."
    }
  },

  // 5. LATÉRAUX GAUCHES (RB_LB)
  {
    id: 'c0000000-0018-0005-0000-000000000119',
    first_name: 'Rayane',
    last_name: 'Haddad',
    pos_code: 'RB_LB',
    position: 'Latéral Gauche',
    club: 'MAS Fès U18',
    foot: 'Gaucher',
    height: 173,
    weight: 65,
    r1: {
      title: 'Observation J10 Championnat U18 vs MAS Fès',
      date: '2026-08-27',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'recruit_now',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 0,
      assists: 2,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [93, 91, 80, 90, 82],
        ment: [89, 87, 89, 86, 82],
        tact: [88, 90, 89, 88, 90],
        tech: [91, 90, 78, 91, 79]
      },
      crit: {
        "Vitesse & accélération": 9.3,
        "Centres & passes": 9.1,
        "Dribbles & duels 1v1": 9.0,
        "Endurance & répétition d'efforts": 9.1,
        "Repli défensif & compensation": 8.7,
        "Qualité de relance": 8.9
      },
      strengths: "Piston gauche moderne de très haut vol. Deux passes décisives somptueuses sur des centres enveloppés pied gauche. Vitesse d'accélération phénoménale.",
      weaknesses: "Défense dans le duel aérien au second poteau sur coups de pied arrêtés défensifs.",
      projection: "Intégration directe dans le groupe Réserve FUS avec passerelle rapide vers l'équipe première.",
      tech_report: "Pied gauche d'une finesse rare. Dribble de débordement dévastateur en 1 contre 1.",
      tact_report: "Offre un apport offensif continu sans jamais déséquilibrer son bloc défensif.",
      phys_report: "Vitesse pure impressionnante et capacité à répéter les sprints de 60 mètres.",
      ment_report: "Mentalité exemplaire, généreux dans les efforts et concentré du début à la fin.",
      notes: "Prestation de premier plan récompensée par 2 passes décisives."
    },
    r2: {
      title: 'Observation 1/4 Finale Coupe du Trône U18 vs RS Berkane',
      date: '2026-09-18',
      evaluator_name: 'Hassan Benabicha',
      evaluator_id: 'a0000000-0000-0000-0000-000000000003',
      decision: 'recruit_now',
      starter: true,
      formation: '3-5-2',
      minutes: 90,
      goals: 1,
      assists: 0,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [94, 92, 82, 91, 84],
        ment: [90, 89, 90, 88, 84],
        tact: [89, 91, 90, 89, 91],
        tech: [92, 91, 80, 92, 80]
      },
      crit: {
        "Vitesse & accélération": 9.4,
        "Centres & passes": 9.2,
        "Dribbles & duels 1v1": 9.1,
        "Endurance & répétition d'efforts": 9.2,
        "Repli défensif & compensation": 8.9,
        "Qualité de relance": 9.0
      },
      strengths: "But sensationnel marqué d'une frappe croisée en lucarne opposée. Domination physique et technique sur tout le flanc gauche.",
      weaknesses: "Doit éviter de trop porter le ballon lorsqu'une passe simple vers l'axe est disponible.",
      projection: "Recrutement capital pour consolider le flanc gauche de l'Académie FUS.",
      tech_report: "Maîtrise technique impeccable en course, frappes brossées dangereuses sur coups francs.",
      tact_report: "Polyvalence tactique confirmée dans le système à trois défenseurs.",
      phys_report: "Fraîcheur athlétique impressionnante jusqu'au coup de sifflet final.",
      ment_report: "Leader d'énergie pour son équipe, galvanise ses partenaires.",
      notes: "Rapport validé par Hassan Benabicha : dossier prioritaire A+."
    }
  },
  {
    id: 'c0000000-0018-0005-0000-000000000120',
    first_name: 'Mehdi',
    last_name: 'Mansouri',
    pos_code: 'RB_LB',
    position: 'Latéral Gauche',
    club: 'Kawkab Marrakech U18',
    foot: 'Gaucher',
    height: 170,
    weight: 62,
    r1: {
      title: 'Observation J09 Championnat U18 vs KACM',
      date: '2026-08-23',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'to_follow',
      starter: true,
      formation: '4-4-2',
      minutes: 80,
      goals: 0,
      assists: 0,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [82, 80, 72, 84, 76],
        ment: [80, 82, 82, 78, 75],
        tact: [78, 80, 79, 78, 80],
        tech: [82, 81, 70, 83, 72]
      },
      crit: {
        "Vitesse & accélération": 8.3,
        "Centres & passes": 8.0,
        "Dribbles & duels 1v1": 8.2,
        "Endurance & répétition d'efforts": 7.9,
        "Repli défensif & compensation": 7.7,
        "Qualité de relance": 7.9
      },
      strengths: "Petit gabarit très vif et mobile. Bonnes sorties de balle courtes et vivacité sur les 15 premiers mètres.",
      weaknesses: "Difficultés face aux ailiers grands et athlétiques dans les duels d'épaule.",
      projection: "Joueur à potentiel technique certain, à développer sur le plan physique.",
      tech_report: "Pied gauche propre, bonne conservation du ballon le long de la ligne de touche.",
      tact_report: "Comprend les phases d'interception mais tarde parfois à revenir lors des pertes de balle hautes.",
      phys_report: "Vitesse satisfaisante mais résistance aux chocs à travailler en salle de musculation.",
      ment_report: "Combatif et discipliné, ne baisse jamais les bras.",
      notes: "Prestation honorable, joueur courageux."
    },
    r2: {
      title: 'Observation Match Amical Sélection Sud U18',
      date: '2026-09-13',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'invitation_test',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 0,
      assists: 1,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [84, 82, 74, 86, 78],
        ment: [82, 84, 84, 80, 77],
        tact: [80, 82, 81, 80, 82],
        tech: [84, 83, 72, 85, 74]
      },
      crit: {
        "Vitesse & accélération": 8.5,
        "Centres & passes": 8.3,
        "Dribbles & duels 1v1": 8.4,
        "Endurance & répétition d'efforts": 8.2,
        "Repli défensif & compensation": 8.0,
        "Qualité de relance": 8.2
      },
      strengths: "Passe décisive délivrée sur un centre ras du sol en retrait. A disputé les 90 minutes sans fléchir.",
      weaknesses: "Doit travailler la précision des centres aériens vers le second poteau.",
      projection: "Invitation au stage d'évaluation FUS à Rabat pour test approfondi.",
      tech_report: "Bonne protection de balle sous pressing, élimination propre de son vis-à-vis.",
      tact_report: "Meilleure gestion des temps forts et temps faibles sur son flanc gauche.",
      phys_report: "Progression visible sur l'endurance aérobie.",
      ment_report: "Grande détermination et belle générosité dans les replis défensifs.",
      notes: "Signaux très positifs sur ce 2e rapport."
    }
  },

  // 6. MILIEUX DÉFENSIFS (DM)
  {
    id: 'c0000000-0018-0006-0000-000000000121',
    first_name: 'Hamza',
    last_name: 'El Amrani',
    pos_code: 'DM',
    position: 'Milieu Défensif',
    club: 'Ittihad Tanger U18',
    foot: 'Droitier',
    height: 178,
    weight: 71,
    r1: {
      title: 'Observation J12 Championnat U18 vs IR Tanger',
      date: '2026-08-27',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'recruit_now',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 0,
      assists: 1,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [88, 94, 88, 86, 85],
        ment: [92, 90, 93, 89, 88],
        tact: [91, 89, 93, 91, 90],
        tech: [88, 90, 75, 84, 84]
      },
      crit: {
        "Interceptions & récupération": 9.3,
        "Discipline tactique & compensation": 9.2,
        "Qualité de passe (courte & longue)": 9.0,
        "Volume de jeu & endurance": 9.4,
        "Vision du jeu & prise d'info": 8.9,
        "Protection de balle & impact": 8.8
      },
      strengths: "Sentinelle moderne impressionnante. Récupérateur infatigable qui nettoie tous les ballons devant sa charnière. 14 ballons récupérés sur le match.",
      weaknesses: "Parfois un excès d'engagement qui lui vaut des avertissements évitables.",
      projection: "Profil profilé pour être le patron du milieu de l'équipe réserve FUS dès cette saison.",
      tech_report: "Jeu de passe propre et vertical. Capacité à jouer en une touche sous pression.",
      tact_report: "Positionnement de sentinelle parfait, colmate toutes les brèches laissées par ses latéraux.",
      phys_report: "Endurance monstrueuse, court plus de 12 kilomètres par rencontre avec une intensité constante.",
      ment_report: "Leader de combat, hargneux et extrêmement précieux pour l'équilibre de son équipe.",
      notes: "Passe décisive en profondeur à la 80e minute. Match XXL."
    },
    r2: {
      title: 'Observation 1/4 Finale Tournoi National Excellence U18',
      date: '2026-09-19',
      evaluator_name: 'Hassan Benabicha',
      evaluator_id: 'a0000000-0000-0000-0000-000000000003',
      decision: 'recruit_now',
      starter: true,
      formation: '4-2-3-1',
      minutes: 90,
      goals: 1,
      assists: 0,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [89, 95, 89, 87, 86],
        ment: [93, 91, 94, 90, 90],
        tact: [92, 90, 94, 92, 91],
        tech: [89, 91, 78, 85, 85]
      },
      crit: {
        "Interceptions & récupération": 9.4,
        "Discipline tactique & compensation": 9.3,
        "Qualité de passe (courte & longue)": 9.1,
        "Volume de jeu & endurance": 9.5,
        "Vision du jeu & prise d'info": 9.0,
        "Protection de balle & impact": 9.0
      },
      strengths: "But marqué d'une frappe lourde des 25 mètres. Éteint complètement le meneur de jeu adverse durant toute la partie.",
      weaknesses: "Doit gérer son tempo pour ne pas trop s'éparpiller en zone offensive.",
      projection: "Joueur à signer d'urgence avant la concurrence des clubs casablancais.",
      tech_report: "Excellente orientation du corps dès la première touche, ouverture vers les ailiers fluide.",
      tact_report: "Sens tactique d'un joueur expérimenté, compense les montées des latéraux avec brio.",
      phys_report: "Impact physique et puissance dans les duels au sol de niveau professionnel.",
      ment_report: "Véritable régulateur émotionnel de son équipe sous forte tension.",
      notes: "Validation à l'unanimité. Recrutement prioritaire."
    }
  },
  {
    id: 'c0000000-0018-0006-0000-000000000122',
    first_name: 'Ismail',
    last_name: 'Tahiri',
    pos_code: 'DM',
    position: 'Milieu Défensif',
    club: 'Olympique Safi U18',
    foot: 'Droitier',
    height: 175,
    weight: 68,
    r1: {
      title: 'Observation J08 Championnat U18 vs OCS',
      date: '2026-08-20',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'to_follow',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 0,
      assists: 0,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [82, 86, 80, 80, 78],
        ment: [84, 82, 85, 80, 76],
        tact: [83, 82, 84, 82, 80],
        tech: [82, 84, 68, 79, 76]
      },
      crit: {
        "Interceptions & récupération": 8.4,
        "Discipline tactique & compensation": 8.3,
        "Qualité de passe (courte & longue)": 8.3,
        "Volume de jeu & endurance": 8.6,
        "Vision du jeu & prise d'info": 8.1,
        "Protection de balle & impact": 8.0
      },
      strengths: "Milieu travailleur avec un gros abattage défensif. Bonnes passes courtes de sécurité pour fluidifier le jeu.",
      weaknesses: "Manque parfois de créativité dans le jeu vers l'avant, joue trop souvent en retrait.",
      projection: "Milieu défensif solide pour étoffer l'effectif U19 avec marge d'apprentissage.",
      tech_report: "Contrôle orienté propre, déchet technique minimal dans les zones de risque.",
      tact_report: "Respecte scrupuleusement sa position axiale, protège bien sa charnière.",
      phys_report: "Endurance satisfaisante, tient les 90 minutes sans fatigue apparente.",
      ment_report: "Calme, très discipliné tactiquement et respectueux des consignes.",
      notes: "Prestation d'ensemble sérieuse et régulière."
    },
    r2: {
      title: 'Observation Match Détection Espoirs Safi vs FUS',
      date: '2026-09-14',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'invitation_test',
      starter: true,
      formation: '4-2-3-1',
      minutes: 85,
      goals: 0,
      assists: 1,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [84, 88, 82, 82, 80],
        ment: [86, 84, 87, 82, 78],
        tact: [85, 84, 86, 84, 82],
        tech: [84, 86, 70, 81, 78]
      },
      crit: {
        "Interceptions & récupération": 8.6,
        "Discipline tactique & compensation": 8.5,
        "Qualité de passe (courte & longue)": 8.5,
        "Volume de jeu & endurance": 8.8,
        "Vision du jeu & prise d'info": 8.3,
        "Protection de balle & impact": 8.2
      },
      strengths: "Passe décisive en profondeur pour son avant-centre. Prise d'initiative en progrès.",
      weaknesses: "Jeu de tête défensif à perfectionner lors des relances aériennes adverses.",
      projection: "Invitation proposée pour une semaine de mise en situation au Complexe FUS.",
      tech_report: "Capacité accrue à casser une ligne adverse par la passe.",
      tact_report: "Meilleure synchronisation avec son partenaire de double pivot.",
      phys_report: "Gros volume de courses défensives et bon pressing sur le porteur.",
      ment_report: "Assurance et combativité en hausse par rapport à août.",
      notes: "Joueur fiable et constant."
    }
  },

  // 7. MILIEUX CENTRAUX DROITS (CM)
  {
    id: 'c0000000-0018-0007-0000-000000000123',
    first_name: 'Othmane',
    last_name: 'Zouheir',
    pos_code: 'CM',
    position: 'Milieu Central Droit',
    club: 'Union Touarga Sport U18',
    foot: 'Droitier',
    height: 176,
    weight: 69,
    r1: {
      title: 'Observation J12 Championnat U18 vs UTS',
      date: '2026-08-25',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'recruit_now',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 1,
      assists: 1,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [87, 91, 82, 88, 80],
        ment: [89, 88, 91, 87, 85],
        tact: [90, 92, 89, 91, 89],
        tech: [91, 92, 84, 88, 78]
      },
      crit: {
        "Qualité de passe (courte & longue)": 9.2,
        "Vision du jeu & prise d'info": 9.2,
        "Première touche & orientation": 9.1,
        "Volume de jeu & endurance": 9.0,
        "Protection de balle & percussion": 8.8,
        "Discipline tactique": 8.9
      },
      strengths: "Métronome du milieu. Vision panoramique du jeu, oriente le jeu à sa guise. Un but et une passe décisive dans le même match.",
      weaknesses: "Repli défensif parfois tardif lorsque son équipe perd le ballon très haut.",
      projection: "Meneur reculé ou relayeur d'élite pour l'équipe réserve avec potentiel d'accession rapide en équipe fanion.",
      tech_report: "Qualité de passe chirurgicale, deux pieds utilisables avec une grande aisance.",
      tact_report: "Sens du tempo remarquable, sait accélérer ou temporiser selon la situation du match.",
      phys_report: "Box-to-box capable d'enchaîner les allers-retours entre les deux surfaces.",
      ment_report: "Personnalité affirmée, réclame toujours le ballon dans les moments compliqués.",
      notes: "Masterclass au milieu de terrain. Évaluation excellente."
    },
    r2: {
      title: 'Observation Tournoi Régional U18 Rabat vs AS FAR',
      date: '2026-09-17',
      evaluator_name: 'Hassan Benabicha',
      evaluator_id: 'a0000000-0000-0000-0000-000000000003',
      decision: 'recruit_now',
      starter: true,
      formation: '4-2-3-1',
      minutes: 85,
      goals: 0,
      assists: 2,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [88, 92, 84, 89, 82],
        ment: [91, 90, 92, 89, 87],
        tact: [91, 93, 90, 92, 90],
        tech: [92, 93, 85, 89, 80]
      },
      crit: {
        "Qualité de passe (courte & longue)": 9.3,
        "Vision du jeu & prise d'info": 9.3,
        "Première touche & orientation": 9.2,
        "Volume de jeu & endurance": 9.1,
        "Protection de balle & percussion": 8.9,
        "Discipline tactique": 9.0
      },
      strengths: "Deux caviars distillés en profondeur. Dictature technique dans l'entrejeu face à un milieu très athlétique.",
      weaknesses: "Doit parfois lâcher le ballon plus vite sur les phases de contre-attaque.",
      projection: "Recrutement recommandé sans réserve pour le FUS.",
      tech_report: "Toucher soyeux, feintes de corps qui éliminent le pressing au départ de l'action.",
      tact_report: "Trouve toujours les demi-espaces libres pour se connecter avec les attaquants.",
      phys_report: "Excellente tonicité sur les changements de direction avec ballon.",
      ment_report: "Calme olympien sous haute intensité, maturité émotionnelle impressionnante.",
      notes: "Confirmation éclatante des qualités observées en août."
    }
  },
  {
    id: 'c0000000-0018-0007-0000-000000000124',
    first_name: 'Bilal',
    last_name: 'El Khayati',
    pos_code: 'CM',
    position: 'Milieu Central Droit',
    club: 'Union Sportive Témara U18',
    foot: 'Droitier',
    height: 173,
    weight: 66,
    r1: {
      title: 'Observation J10 Championnat U18 vs UST',
      date: '2026-08-21',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'to_follow',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 0,
      assists: 1,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [81, 85, 76, 83, 75],
        ment: [83, 81, 85, 80, 76],
        tact: [82, 83, 81, 82, 80],
        tech: [84, 85, 74, 83, 72]
      },
      crit: {
        "Qualité de passe (courte & longue)": 8.5,
        "Vision du jeu & prise d'info": 8.3,
        "Première touche & orientation": 8.4,
        "Volume de jeu & endurance": 8.5,
        "Protection de balle & percussion": 8.0,
        "Discipline tactique": 8.2
      },
      strengths: "Milieu relayeur élégant avec une bonne finesse technique. Belle passe décisive sur coup franc excentré.",
      weaknesses: "Manque d'impact athlétique lors des duels physiques engagés au milieu de terrain.",
      projection: "Milieu créateur avec de la marge de progression athlétique à polir en académie.",
      tech_report: "Pied droit soyeux, bonne frappe enroulée sur coups de pied arrêtés.",
      tact_report: "Bonne compréhension des mouvements de ses partenaires offensifs.",
      phys_report: "Course fluide mais déficit de puissance à l'impact.",
      ment_report: "Joueur concentré et respectueux du plan de jeu.",
      notes: "Prestation intéressante avec un rôle créatif assumé."
    },
    r2: {
      title: 'Observation Match Détection Témara vs FUS B',
      date: '2026-09-15',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'invitation_test',
      starter: true,
      formation: '4-2-3-1',
      minutes: 80,
      goals: 1,
      assists: 0,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [83, 87, 78, 85, 77],
        ment: [85, 83, 87, 82, 78],
        tact: [84, 85, 83, 84, 82],
        tech: [86, 87, 77, 85, 74]
      },
      crit: {
        "Qualité de passe (courte & longue)": 8.7,
        "Vision du jeu & prise d'info": 8.5,
        "Première touche & orientation": 8.6,
        "Volume de jeu & endurance": 8.7,
        "Protection de balle & percussion": 8.2,
        "Discipline tactique": 8.4
      },
      strengths: "Joli but inscrit d'une frappe tendue à l'entrée de la surface. Meilleure présence dans les duels.",
      weaknesses: "Repli défensif à intensifier dans les transitions de perte rapide de balle.",
      projection: "Invitation validée pour une semaine de stage d'essai au FUS Rabat.",
      tech_report: "Bonne vitesse d'exécution dans la transmission du ballon.",
      tact_report: "Positionnement plus haut entre les lignes adverses qui a créé du danger.",
      phys_report: "Gain en vivacité sur les accélérations courtes.",
      ment_report: "Confiance en hausse, a pris ses responsabilités sur les tirs de loin.",
      notes: "Deuxième rapport confirmant le potentiel du joueur."
    }
  },

  // 8. MILIEUX CENTRAUX GAUCHES (CAM)
  {
    id: 'c0000000-0018-0008-0000-000000000125',
    first_name: 'Zakaria',
    last_name: 'El Asbahi',
    pos_code: 'CAM',
    position: 'Milieu Central Gauche',
    club: 'AS FAR Jeunes U18',
    foot: 'Gaucher',
    height: 175,
    weight: 68,
    r1: {
      title: 'Observation Derby Jeunes vs AS FAR U18',
      date: '2026-08-29',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'recruit_now',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 1,
      assists: 1,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [86, 88, 80, 89, 78],
        ment: [90, 89, 91, 88, 86],
        tact: [91, 93, 90, 92, 89],
        tech: [93, 92, 86, 92, 75]
      },
      crit: {
        "Qualité de passe (courte & longue)": 9.3,
        "Vision du jeu & prise d'info": 9.3,
        "Première touche & orientation": 9.3,
        "Dribbles & percussion": 9.2,
        "Volume de jeu & endurance": 8.8,
        "Créativité & finition": 9.0
      },
      strengths: "Meneur de jeu gaucher exceptionnel. Pied gauche soyeux, créateur d'occasions hors pair avec un but et une passe décisive.",
      weaknesses: "Utilisation du pied droit à encourager pour éviter d'être trop prévisible sur son côté gauche.",
      projection: "Meneur offensif de très haute volée, futur profil Botola Pro avec une projection vers la réserve FUS.",
      tech_report: "Qualité technique d'élite. Dribble court dévastateur et dernières passes millimétrées.",
      tact_report: "Se positionne à merveille dans les demi-espaces pour déstabiliser les blocs bas.",
      phys_report: "Appuis bas très toniques, élimine son adversaire direct sur le premier crochet.",
      ment_report: "Insolent de talent et de sang-froid dans les grands rendez-vous.",
      notes: "Performance étincelante dans le derby. Note globale d'élite."
    },
    r2: {
      title: 'Observation Tournoi National Espoirs - vs Raja U18',
      date: '2026-09-20',
      evaluator_name: 'Hassan Benabicha',
      evaluator_id: 'a0000000-0000-0000-0000-000000000003',
      decision: 'recruit_now',
      starter: true,
      formation: '4-2-3-1',
      minutes: 90,
      goals: 0,
      assists: 2,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [87, 89, 81, 90, 79],
        ment: [91, 90, 92, 89, 87],
        tact: [92, 94, 91, 93, 90],
        tech: [94, 93, 87, 93, 76]
      },
      crit: {
        "Qualité de passe (courte & longue)": 9.4,
        "Vision du jeu & prise d'info": 9.4,
        "Première touche & orientation": 9.4,
        "Dribbles & percussion": 9.3,
        "Volume de jeu & endurance": 8.9,
        "Créativité & finition": 9.1
      },
      strengths: "Deux passes décisives d'anthologie sur des ouvertures sans contrôle. Dictée du tempo du match du début à la fin.",
      weaknesses: "Repli défensif à maintenir avec la même rigueur lorsque le score est acquis.",
      projection: "Signature immédiate prioritaire. Talent générationnel à enrôler au FUS.",
      tech_report: "Toucher de balle velouté, coup d'œil instantané avant la réception.",
      tact_report: "Comprend les faiblesses du dispositif adverse et oriente l'attaque en conséquence.",
      phys_report: "Bonne résistance physique malgré un gabarit moyen.",
      ment_report: "Plaisir évident de jouer pour le collectif, humilité et générosité.",
      notes: "Rapport validé conjointement. Accord du joueur à solliciter rapidement."
    }
  },
  {
    id: 'c0000000-0018-0008-0000-000000000126',
    first_name: 'Nassim',
    last_name: 'Berrada',
    pos_code: 'CAM',
    position: 'Milieu Central Gauche',
    club: 'Wydad AC Jeunes U18',
    foot: 'Gaucher',
    height: 172,
    weight: 65,
    r1: {
      title: 'Observation J11 Championnat U18 vs WAC',
      date: '2026-08-24',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'to_follow',
      starter: true,
      formation: '4-3-3',
      minutes: 75,
      goals: 0,
      assists: 1,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [80, 82, 74, 85, 75],
        ment: [82, 80, 84, 81, 77],
        tact: [83, 85, 81, 83, 80],
        tech: [85, 86, 76, 86, 70]
      },
      crit: {
        "Qualité de passe (courte & longue)": 8.6,
        "Vision du jeu & prise d'info": 8.5,
        "Première touche & orientation": 8.5,
        "Dribbles & percussion": 8.6,
        "Volume de jeu & endurance": 8.2,
        "Créativité & finition": 8.3
      },
      strengths: "Milieu offensif gaucher très créatif. Dribble déroutant et passe décisive sur une passe piquée.",
      weaknesses: "Manque d'impact athlétique et baisse d'intensité après l'heure de jeu.",
      projection: "Profil créatif à polir physiquement pour supporter les exigences du haut niveau.",
      tech_report: "Belle qualité technique de passe courte et contrôle orienté dans la course.",
      tact_report: "Se déplace bien entre les lignes mais participe peu au pressing défensif.",
      phys_report: "Vivacité intéressante sur 5 mètres, endurance à étoffer.",
      ment_report: "Esprit joueur, créatif mais doit gagner en rigueur sans ballon.",
      notes: "Joueur intéressant avec des éclairs techniques indéniables."
    },
    r2: {
      title: 'Observation Match Détection Casablanca vs FUS B',
      date: '2026-09-16',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'invitation_test',
      starter: true,
      formation: '4-2-3-1',
      minutes: 85,
      goals: 1,
      assists: 0,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [82, 84, 76, 87, 77],
        ment: [84, 83, 86, 83, 79],
        tact: [85, 87, 83, 85, 82],
        tech: [87, 88, 79, 88, 72]
      },
      crit: {
        "Qualité de passe (courte & longue)": 8.8,
        "Vision du jeu & prise d'info": 8.7,
        "Première touche & orientation": 8.7,
        "Dribbles & percussion": 8.8,
        "Volume de jeu & endurance": 8.4,
        "Créativité & finition": 8.5
      },
      strengths: "But marqué d'un lob astucieux sur le gardien sorti à sa rencontre. Meilleure implication sans ballon.",
      weaknesses: "Doit éviter de trop garder le ballon sous le pressing agressif de deux joueurs.",
      projection: "Invitation transmise pour un test d'immersion au sein de l'Académie FUS.",
      tech_report: "Précision de frappe brossée remarquable, feinte de frappe très efficace.",
      tact_report: "Meilleure discipline dans le repli sur phase défensive adverse.",
      phys_report: "Meilleure résistance physique constatée sur 85 minutes.",
      ment_report: "Attitude positive et réactivité accrue lors des pertes de balle.",
      notes: "Confirmation des qualités du joueur, test concluant."
    }
  },

  // 9. AILIERS DROITS (WINGER)
  {
    id: 'c0000000-0018-0009-0000-000000000127',
    first_name: 'Youssef',
    last_name: 'Belammari',
    pos_code: 'WINGER',
    position: 'Ailier Droit',
    club: 'MAS Fès U18',
    foot: 'Droitier',
    height: 175,
    weight: 67,
    r1: {
      title: 'Observation J10 Championnat U18 vs MAS Fès',
      date: '2026-08-27',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'recruit_now',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 2,
      assists: 1,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [94, 88, 80, 92, 82],
        ment: [89, 88, 88, 87, 84],
        tact: [89, 88, 90, 89, 90],
        tech: [93, 89, 90, 94, 76]
      },
      crit: {
        "Dribbles & 1v1": 9.4,
        "Vitesse & accélération": 9.4,
        "Finition & frappes": 9.0,
        "Centres & passes": 8.9,
        "Créativité & percussion": 9.3,
        "Repli défensif": 8.5
      },
      strengths: "Ailier percutant et dévastateur en 1 contre 1. Doublé et une passe décisive. Capacité d'accélération foudroyante sur les premiers appuis.",
      weaknesses: "Dernier geste parfois forcé sur des angles fermés au lieu de combiner.",
      projection: "Joueur offensif de premier plan, prêt pour disputer des minutes en équipe Réserve FUS.",
      tech_report: "Dribble intérieur ou extérieur imprévisible. Frappe sèche pied droit qui ne pardonne pas.",
      tact_report: "Appels tranchants dans le dos du latéral gauche adverse, exploite la moindre faille.",
      phys_report: "Vitesse de pointe enregistrée au-dessus des standards de sa catégorie.",
      ment_report: "Tueur dans les 20 derniers mètres, aucune peur de provoquer son vis-à-vis.",
      notes: "Prestation de très haute volée récompensée par le titre d'homme du match."
    },
    r2: {
      title: 'Observation 1/4 Finale Coupe du Trône U18',
      date: '2026-09-18',
      evaluator_name: 'Hassan Benabicha',
      evaluator_id: 'a0000000-0000-0000-0000-000000000003',
      decision: 'recruit_now',
      starter: true,
      formation: '4-2-3-1',
      minutes: 90,
      goals: 1,
      assists: 1,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [95, 90, 82, 93, 84],
        ment: [91, 90, 90, 89, 86],
        tact: [90, 90, 91, 90, 91],
        tech: [94, 90, 91, 95, 78]
      },
      crit: {
        "Dribbles & 1v1": 9.5,
        "Vitesse & accélération": 9.5,
        "Finition & frappes": 9.1,
        "Centres & passes": 9.0,
        "Créativité & percussion": 9.4,
        "Repli défensif": 8.7
      },
      strengths: "But décisif après avoir éliminé deux défenseurs et une passe décisive au cordeau. A martyrisé la défense adverse.",
      weaknesses: "Doit veiller à garder son calme lors des provocations physiques adverses.",
      projection: "Signature immédiate indispensable pour sécuriser l'avenir de l'attaque du FUS.",
      tech_report: "Contrôle orienté vers l'avant à pleine vitesse, changements de rythme dévastateurs.",
      tact_report: "Permutation très intelligente avec l'ailier gauche pour déstabiliser le marquage adverse.",
      phys_report: "Explosivité intacte même dans les dernières minutes du match.",
      ment_report: "Gagneur né, exigeant avec lui-même et très investi pour son équipe.",
      notes: "Rapport validé avec mention d'excellence."
    }
  },
  {
    id: 'c0000000-0018-0009-0000-000000000128',
    first_name: 'Walid',
    last_name: 'El Mourabit',
    pos_code: 'WINGER',
    position: 'Ailier Droit',
    club: 'Kawkab Marrakech U18',
    foot: 'Droitier',
    height: 172,
    weight: 64,
    r1: {
      title: 'Observation J09 Championnat U18 vs KACM',
      date: '2026-08-23',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'to_follow',
      starter: true,
      formation: '4-3-3',
      minutes: 80,
      goals: 1,
      assists: 0,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [86, 80, 72, 88, 76],
        ment: [80, 82, 80, 78, 74],
        tact: [79, 81, 80, 80, 82],
        tech: [85, 82, 84, 87, 70]
      },
      crit: {
        "Dribbles & 1v1": 8.7,
        "Vitesse & accélération": 8.6,
        "Finition & frappes": 8.4,
        "Centres & passes": 8.2,
        "Créativité & percussion": 8.5,
        "Repli défensif": 7.6
      },
      strengths: "Ailier vif et agile, bon but inscrit d'un tir croisé après un crochet intérieur.",
      weaknesses: "Déchet dans le repli défensif, a laissé son latéral droit en infériorité numérique à deux reprises.",
      projection: "Potentiel offensif intéressant nécessitant une rigueur tactique renforcée.",
      tech_report: "Vitesse d'exécution balle au pied appréciable, bon crochet extérieur.",
      tact_report: "Doit apprendre à temporiser et à attendre le soutien de son latéral.",
      phys_report: "Bonne vivacité mais manque de coffre sur l'ensemble des 90 minutes.",
      ment_report: "Attitude combative en phase offensive, doit transférer cette énergie en défense.",
      notes: "Auteur d'un joli but, prestation encourageante."
    },
    r2: {
      title: 'Observation Match Amical Détection Marrakech vs FUS',
      date: '2026-09-13',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'invitation_test',
      starter: true,
      formation: '4-2-3-1',
      minutes: 85,
      goals: 0,
      assists: 1,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [88, 83, 74, 90, 78],
        ment: [82, 84, 82, 80, 76],
        tact: [81, 83, 82, 82, 84],
        tech: [87, 84, 85, 89, 72]
      },
      crit: {
        "Dribbles & 1v1": 8.9,
        "Vitesse & accélération": 8.8,
        "Finition & frappes": 8.5,
        "Centres & passes": 8.4,
        "Créativité & percussion": 8.7,
        "Repli défensif": 8.0
      },
      strengths: "Passe décisive splendide sur un centre en retrait. Meilleure assiduité dans le travail de compensation.",
      weaknesses: "Encore quelques mauvais choix de dribble dans sa propre moitié de terrain.",
      projection: "Invitation accordée pour un essai d'une semaine au centre de formation FUS.",
      tech_report: "Contrôle orienté plus propre, bon centre au cordeau.",
      tact_report: "Progrès tangibles dans la fermeture de l'intérieur en phase sans ballon.",
      phys_report: "A mieux géré son effort sur les 85 minutes passées sur le terrain.",
      ment_report: "À l'écoute des consignes du coach, volonté d'apprendre évidente.",
      notes: "Progression confirmée, invitation validée."
    }
  },

  // 10. AVANT-CENTRES (ST)
  {
    id: 'c0000000-0018-0010-0000-000000000129',
    first_name: 'Amine',
    last_name: 'Chraibi',
    pos_code: 'ST',
    position: 'Avant-Centre',
    club: 'Ittihad Tanger U18',
    foot: 'Droitier',
    height: 182,
    weight: 75,
    r1: {
      title: 'Observation J12 Championnat U18 vs IRT',
      date: '2026-08-28',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'recruit_now',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 2,
      assists: 0,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [90, 88, 91, 86, 89],
        ment: [92, 90, 89, 91, 88],
        tact: [90, 88, 92, 91, 89],
        tech: [91, 86, 94, 88, 92]
      },
      crit: {
        "Finition & sang-froid": 9.4,
        "Jeu de tête & détente": 9.2,
        "Jeu dos au but & remises": 9.0,
        "Appels & déplacements": 9.1,
        "Puissance athlétique": 9.1,
        "Dribbles & percussion": 8.8
      },
      strengths: "Buteur complet et clinique dans la zone de vérité. Doublé magistral : une tête décroisée sous la barre et une frappe limpide en demi-volée.",
      weaknesses: "Peut encore améliorer son implication dans le premier pressing défensif à la perte.",
      projection: "Numéro 9 moderne taillé pour le haut niveau. Profil idéal pour s'imposer en équipe réserve puis en Botola Pro.",
      tech_report: "Variété de finitions impressionnante : pied droit, pied gauche, tête. Remise dos au but très propre.",
      tact_report: "Appels tranchants au premier poteau et contre-appels qui sèment la panique chez les défenseurs centraux.",
      phys_report: "Gabarit d'athlète, tient le choc dos au but face aux défenseurs rugueux.",
      ment_report: "Sang-froid glacial dans la surface, instinct de renard des surfaces exceptionnel.",
      notes: "Prestation sensationnelle récompensée par 2 buts splendides."
    },
    r2: {
      title: 'Observation 1/4 Finale Tournoi Excellence U18',
      date: '2026-09-19',
      evaluator_name: 'Hassan Benabicha',
      evaluator_id: 'a0000000-0000-0000-0000-000000000003',
      decision: 'recruit_now',
      starter: true,
      formation: '4-2-3-1',
      minutes: 90,
      goals: 1,
      assists: 1,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [91, 89, 92, 87, 90],
        ment: [93, 91, 91, 92, 89],
        tact: [91, 89, 93, 92, 90],
        tech: [92, 88, 95, 89, 93]
      },
      crit: {
        "Finition & sang-froid": 9.5,
        "Jeu de tête & détente": 9.3,
        "Jeu dos au but & remises": 9.1,
        "Appels & déplacements": 9.2,
        "Puissance athlétique": 9.2,
        "Dribbles & percussion": 8.9
      },
      strengths: "But de la victoire inscrit à la 88e minute et passe décisive splendide de déviation en pivot. Performance de géant.",
      weaknesses: "Tendance à trop décrocher par moments lorsque l'équipe manque de créativité au milieu.",
      projection: "Cible prioritaire absolue pour le recrutement offensif de l'Académie FUS.",
      tech_report: "Contrôle orienté parfait sous pression, enchaînement contrôle-frappe d'une vélocité remarquable.",
      tact_report: "Lit le jeu défensif adverse et attaque systématiquement l'espace libre au moment opportun.",
      phys_report: "Puissance et détente verticale aérienne au-dessus du lot.",
      ment_report: "Leader d'attaque, insuffle la foi de la victoire à tout son groupe.",
      notes: "Rapport exceptionnel : validation conjointe pour signature immédiate."
    }
  },
  {
    id: 'c0000000-0018-0010-0000-000000000130',
    first_name: 'Taha',
    last_name: 'Regragui',
    pos_code: 'ST',
    position: 'Avant-Centre',
    club: 'Olympique Safi U18',
    foot: 'Droitier',
    height: 179,
    weight: 72,
    r1: {
      title: 'Observation J08 Championnat U18 vs OCS',
      date: '2026-08-20',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'to_follow',
      starter: true,
      formation: '4-4-2',
      minutes: 85,
      goals: 1,
      assists: 0,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [83, 82, 84, 80, 85],
        ment: [85, 84, 82, 83, 80],
        tact: [82, 80, 85, 83, 81],
        tech: [84, 80, 86, 82, 85]
      },
      crit: {
        "Finition & sang-froid": 8.6,
        "Jeu de tête & détente": 8.5,
        "Jeu dos au but & remises": 8.3,
        "Appels & déplacements": 8.4,
        "Puissance athlétique": 8.4,
        "Dribbles & percussion": 8.2
      },
      strengths: "Bon pivot offensif, but inscrit d'une tête plongeante bien placée. Présence physique rassurante dans la surface.",
      weaknesses: "Vitesse de sprint sur les longs ballons en profondeur un peu juste face aux défenseurs véloces.",
      projection: "Attaquant de surface avec de bonnes aptitudes aériennes, à évaluer sur un bloc plus haut.",
      tech_report: "Bonne efficacité sur les ballons traînants dans les 16 mètres, contrôle orienté correct.",
      tact_report: "Fixe bien la charnière adverse, mais doit diversifier ses appels sur les ailes.",
      phys_report: "Gabarit solide, bon jeu de corps pour résister au marquage serré.",
      ment_report: "Travailleur, ne rechigne pas aux duels âpres contre les défenseurs centraux.",
      notes: "Auteur d'un joli but de la tête, match solide."
    },
    r2: {
      title: 'Observation Match Détection Safi vs FUS',
      date: '2026-09-14',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'invitation_test',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 1,
      assists: 1,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [85, 84, 86, 82, 87],
        ment: [87, 86, 84, 85, 82],
        tact: [84, 82, 87, 85, 83],
        tech: [86, 82, 88, 84, 87]
      },
      crit: {
        "Finition & sang-froid": 8.8,
        "Jeu de tête & détente": 8.7,
        "Jeu dos au but & remises": 8.5,
        "Appels & déplacements": 8.6,
        "Puissance athlétique": 8.6,
        "Dribbles & percussion": 8.4
      },
      strengths: "Un but et une passe décisive de remise en pivot. Excellente présence aérienne sur corners.",
      weaknesses: "Doit accélérer ses enchaînements dos au but pour éviter les retours défensifs.",
      projection: "Invitation validée pour une semaine de stage à l'Académie FUS.",
      tech_report: "Précision de frappe en progrès sur les tirs spontanés à mi-distance.",
      tact_report: "Meilleurs déplacements en décrochage pour participer à la construction.",
      phys_report: "A tenu 90 minutes complètes avec un bon rendement physique.",
      ment_report: "Attitude très professionnelle et belle envie de marquer.",
      notes: "Progression confirmée, invitation à adresser."
    }
  },

  // 11. AILIERS GAUCHES (WINGER)
  {
    id: 'c0000000-0018-0011-0000-000000000131',
    first_name: 'Anas',
    last_name: 'Benjelloun',
    pos_code: 'WINGER',
    position: 'Ailier Gauche',
    club: 'Union Touarga Sport U18',
    foot: 'Gaucher',
    height: 174,
    weight: 66,
    r1: {
      title: 'Observation J12 Championnat U18 vs UTS Touarga',
      date: '2026-08-25',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'recruit_now',
      starter: true,
      formation: '4-3-3',
      minutes: 90,
      goals: 1,
      assists: 2,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [93, 89, 78, 93, 80],
        ment: [90, 89, 88, 88, 85],
        tact: [89, 91, 90, 90, 91],
        tech: [94, 91, 89, 95, 75]
      },
      crit: {
        "Dribbles & 1v1": 9.5,
        "Vitesse & accélération": 9.3,
        "Centres & passes": 9.1,
        "Créativité & percussion": 9.4,
        "Finition & frappes": 8.9,
        "Repli défensif": 8.6
      },
      strengths: "Ailier gaucher magique. Élimination en 1 contre 1 quasi systématique, deux passes décisives et un but d'un enroulé magnifique en lucarne.",
      weaknesses: "Parfois un brin de gourmandise sur les dribbles au lieu de jouer simple dans son camp.",
      projection: "Profil ailier moderne de classe supérieure. Recrutement prioritaire pour l'aile gauche du FUS.",
      tech_report: "Dextérité technique exceptionnelle du pied gauche. Roulette, feinte de frappe et centre millimétré.",
      tact_report: "Prend l'intervalle avec un sens aiguisé du timing. Repique dans l'axe pour tirer ou décaler.",
      phys_report: "Agilité et centre de gravité bas rendant sa conduite de balle insaisissable pour les défenseurs.",
      ment_report: "Confiance absolue en ses moyens techniques, audacieux et spectaculaire.",
      notes: "Prestation de gala. Rapport transmis en priorité."
    },
    r2: {
      title: 'Observation Demi-Finale Coupe Régionale U18 vs AS FAR',
      date: '2026-09-17',
      evaluator_name: 'Hassan Benabicha',
      evaluator_id: 'a0000000-0000-0000-0000-000000000003',
      decision: 'recruit_now',
      starter: true,
      formation: '4-2-3-1',
      minutes: 90,
      goals: 1,
      assists: 1,
      verdict: 'sign_immediately',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [94, 90, 80, 94, 82],
        ment: [91, 90, 90, 89, 87],
        tact: [90, 92, 91, 91, 92],
        tech: [95, 92, 90, 96, 76]
      },
      crit: {
        "Dribbles & 1v1": 9.6,
        "Vitesse & accélération": 9.4,
        "Centres & passes": 9.2,
        "Créativité & percussion": 9.5,
        "Finition & frappes": 9.0,
        "Repli défensif": 8.8
      },
      strengths: "A renversé le match à lui seul en deuxième période avec un but et une passe décisive décisive. Ailier déroutant et décisif.",
      weaknesses: "Repli défensif à stabiliser face aux latéraux très offensifs.",
      projection: "Futur international jeune marocain. Le FUS doit boucler son arrivée sans délai.",
      tech_report: "Pied gauche d'une pureté rare. Frappes brossées du coup du pied imparables.",
      tact_report: "Se positionne idéalement entre le latéral et le défenseur central pour créer le surnombre.",
      phys_report: "Vitesse d'exécution et accélération sur 10 mètres foudroyantes.",
      ment_report: "Brave, ne se cache jamais même après avoir reçu plusieurs tacles violents.",
      notes: "Candidat star de la catégorie U18. Accord unanime."
    }
  },
  {
    id: 'c0000000-0018-0011-0000-000000000132',
    first_name: 'Badr',
    last_name: 'Cherradi',
    pos_code: 'WINGER',
    position: 'Ailier Gauche',
    club: 'Union Sportive Témara U18',
    foot: 'Gaucher',
    height: 171,
    weight: 63,
    r1: {
      title: 'Observation J10 Championnat U18 vs UST',
      date: '2026-08-21',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'to_follow',
      starter: true,
      formation: '4-3-3',
      minutes: 75,
      goals: 1,
      assists: 0,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [86, 80, 72, 88, 74],
        ment: [81, 82, 80, 79, 75],
        tact: [80, 81, 80, 81, 82],
        tech: [85, 83, 84, 87, 70]
      },
      crit: {
        "Dribbles & 1v1": 8.7,
        "Vitesse & accélération": 8.6,
        "Centres & passes": 8.3,
        "Créativité & percussion": 8.6,
        "Finition & frappes": 8.4,
        "Repli défensif": 7.6
      },
      strengths: "Ailier gaucher vif et déroutant sur son couloir, but marqué après avoir enrhumé le latéral adverse.",
      weaknesses: "Manque d'impact dans les duels physiques et gestion de l'effort sur 90 minutes.",
      projection: "Profil intéressant pour l'animation des couloirs de l'académie, développement physique requis.",
      tech_report: "Bonne protection du pied gauche, dribble de débordement classique mais efficace.",
      tact_report: "Doit mieux collaborer avec son latéral gauche pour bloquer les couloirs.",
      phys_report: "Accélération vive sur 10 mètres, manque d'endurance de puissance.",
      ment_report: "Volontaire, aime avoir le ballon dans les pieds pour créer du danger.",
      notes: "Prestation satisfaisante avec un but à son actif."
    },
    r2: {
      title: 'Observation Match Détection Témara vs FUS B',
      date: '2026-09-15',
      evaluator_name: 'Tarik Sektioui',
      evaluator_id: 'a0000000-0000-0000-0000-000000000002',
      decision: 'invitation_test',
      starter: true,
      formation: '4-2-3-1',
      minutes: 85,
      goals: 0,
      assists: 1,
      verdict: 'second_trial',
      is_upgraded: false,
      upgraded_count: 0,
      scores: {
        phys: [88, 83, 74, 90, 76],
        ment: [83, 84, 82, 81, 77],
        tact: [82, 83, 82, 83, 84],
        tech: [87, 85, 85, 89, 72]
      },
      crit: {
        "Dribbles & 1v1": 8.9,
        "Vitesse & accélération": 8.8,
        "Centres & passes": 8.5,
        "Créativité & percussion": 8.8,
        "Finition & frappes": 8.5,
        "Repli défensif": 8.0
      },
      strengths: "Passe décisive en retrait après un débordement tranchant. Plus discipliné dans le repli défensif.",
      weaknesses: "Pied droit très peu utilisé, ce qui réduit ses angles de frappe dans l'axe.",
      projection: "Invitation accordée pour un stage d'évaluation technique et physique au FUS.",
      tech_report: "Excellente qualité de centre tendu pied gauche.",
      tact_report: "Meilleure lecture du jeu d'équipe et moins de portées inutiles de balle.",
      phys_report: "A tenu 85 minutes avec une meilleure tonicité.",
      ment_report: "Attitude positive et réceptive aux remarques du staff.",
      notes: "Évolution confirmée, joueur invité au test."
    }
  }
];

function escapeSql(str) {
  if (!str) return "''";
  return "'" + str.replace(/'/g, "''") + "'";
}

let sql = `-- ==============================================================================
-- 🇲🇦 FUS CLUB - MIGRATION SQL : 44 RAPPORTS SCOUTS COMPLETS U18 (2 PAR JOUEUR)
-- Catégorie : U18 (22 Joueurs = 44 Rapports d'Observation Terrain & Évaluations)
-- Conforme aux 3 volets de l'interface FUS :
--   1. Observation Terrain (Contexte match, formation, temps de jeu, décision scout)
--   2. Qualités (Scores piliers, 20 critères 0-100 et grille détaillée par poste sur 10)
--   3. Rapport de Scout (Points forts, axes à développer, projection FUS, verdicts)
-- ==============================================================================

-- 1. Sécurisation de l'existence des colonnes nécessaires sur candidate_evaluations
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS report_title TEXT;
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS report_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS criteria_scores JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS position_evaluated TEXT;
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS tech_report TEXT;
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS tact_report TEXT;
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS phys_report TEXT;
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS ment_report TEXT;
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS evaluator_id TEXT;
ALTER TABLE public.candidate_evaluations ADD COLUMN IF NOT EXISTS projection TEXT;

-- 2. Nettoyage des anciennes évaluations de test basiques pour garantir exactement 2 rapports par joueur
DELETE FROM public.candidate_evaluations 
WHERE candidate_id IN (
    'c0000000-0018-0001-0000-000000000111', 'c0000000-0018-0001-0000-000000000112',
    'c0000000-0018-0002-0000-000000000113', 'c0000000-0018-0002-0000-000000000114',
    'c0000000-0018-0003-0000-000000000115', 'c0000000-0018-0003-0000-000000000116',
    'c0000000-0018-0004-0000-000000000117', 'c0000000-0018-0004-0000-000000000118',
    'c0000000-0018-0005-0000-000000000119', 'c0000000-0018-0005-0000-000000000120',
    'c0000000-0018-0006-0000-000000000121', 'c0000000-0018-0006-0000-000000000122',
    'c0000000-0018-0007-0000-000000000123', 'c0000000-0018-0007-0000-000000000124',
    'c0000000-0018-0008-0000-000000000125', 'c0000000-0018-0008-0000-000000000126',
    'c0000000-0018-0009-0000-000000000127', 'c0000000-0018-0009-0000-000000000128',
    'c0000000-0018-0010-0000-000000000129', 'c0000000-0018-0010-0000-000000000130',
    'c0000000-0018-0011-0000-000000000131', 'c0000000-0018-0011-0000-000000000132'
) AND id NOT LIKE 'e0000000-0018-0001-0001-%' AND id NOT LIKE 'e0000000-0018-0001-0002-%';

-- 3. Insertion et Mise à Jour des 44 Rapports Détaillés U18
`;

for (let i = 0; i < U18_PLAYERS.length; i++) {
  const p = U18_PLAYERS[i];
  const numIndex = String(i + 1).padStart(2, '0');
  
  // Rapport 1
  const r1Id = `e0000000-0018-0001-0001-${p.id.split('-')[4]}`;
  // Rapport 2
  const r2Id = `e0000000-0018-0001-0002-${p.id.split('-')[4]}`;

  [ { r: p.r1, id: r1Id, repNum: 1 }, { r: p.r2, id: r2Id, repNum: 2 } ].forEach(({ r, id, repNum }) => {
    const reportDataJson = JSON.stringify({
      scout_state_decision: r.decision,
      is_upgraded_category: r.is_upgraded,
      upgraded_categories_count: r.upgraded_count,
      primary_position: p.position,
      age_category: 'U18',
      current_club: p.club,
      previous_clubs: p.club + ' Formation',
      is_starter: r.starter,
      team_formation: r.formation,
      matches_played: 14 + repNum,
      minutes_played: r.minutes,
      goals: r.goals,
      assists: r.assists,
      information_source: 'terrain',
      information_source_person: r.evaluator_name,
      video_type: 'none',
      video_url: ''
    });

    const criteriaJson = JSON.stringify(r.crit);

    sql += `
-- ------------------------------------------------------------------------------
-- Joueur ${p.first_name} ${p.last_name} (${p.position} - ${p.club}) | Rapport ${repNum}/2
-- ------------------------------------------------------------------------------
INSERT INTO public.candidate_evaluations (
    id, candidate_id, evaluator_id, evaluator_name, evaluation_date,
    report_title, position_evaluated,
    phys_speed, phys_endurance, phys_strength, phys_agility, phys_jump,
    ment_determination, ment_focus, ment_teamwork, ment_composure, ment_leadership,
    tact_positioning, tact_vision, tact_anticipation, tact_game_iq, tact_transition,
    tech_first_touch, tech_passing, tech_shooting, tech_dribbling, tech_heading,
    verdict,
    strengths,
    weaknesses,
    projection,
    tech_report,
    tact_report,
    phys_report,
    ment_report,
    general_notes,
    criteria_scores,
    report_data
) VALUES (
    '${id}',
    '${p.id}',
    '${r.evaluator_id}',
    ${escapeSql(r.evaluator_name)},
    '${r.date}',
    ${escapeSql(r.title)},
    ${escapeSql(p.position)},
    ${r.scores.phys[0]}, ${r.scores.phys[1]}, ${r.scores.phys[2]}, ${r.scores.phys[3]}, ${r.scores.phys[4]},
    ${r.scores.ment[0]}, ${r.scores.ment[1]}, ${r.scores.ment[2]}, ${r.scores.ment[3]}, ${r.scores.ment[4]},
    ${r.scores.tact[0]}, ${r.scores.tact[1]}, ${r.scores.tact[2]}, ${r.scores.tact[3]}, ${r.scores.tact[4]},
    ${r.scores.tech[0]}, ${r.scores.tech[1]}, ${r.scores.tech[2]}, ${r.scores.tech[3]}, ${r.scores.tech[4]},
    '${r.verdict}',
    ${escapeSql(r.strengths)},
    ${escapeSql(r.weaknesses)},
    ${escapeSql(r.projection)},
    ${escapeSql(r.tech_report)},
    ${escapeSql(r.tact_report)},
    ${escapeSql(r.phys_report)},
    ${escapeSql(r.ment_report)},
    ${escapeSql(r.notes)},
    ${escapeSql(criteriaJson)}::jsonb,
    ${escapeSql(reportDataJson)}::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    candidate_id = EXCLUDED.candidate_id,
    evaluator_id = EXCLUDED.evaluator_id,
    evaluator_name = EXCLUDED.evaluator_name,
    evaluation_date = EXCLUDED.evaluation_date,
    report_title = EXCLUDED.report_title,
    position_evaluated = EXCLUDED.position_evaluated,
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
    projection = EXCLUDED.projection,
    tech_report = EXCLUDED.tech_report,
    tact_report = EXCLUDED.tact_report,
    phys_report = EXCLUDED.phys_report,
    ment_report = EXCLUDED.ment_report,
    general_notes = EXCLUDED.general_notes,
    criteria_scores = EXCLUDED.criteria_scores,
    report_data = EXCLUDED.report_data,
    updated_at = NOW();
`;
  });
}

sql += `\n-- ==============================================================================
-- 4. Événements Timeline Recrutement pour les 44 Rapports d'Observation U18
-- ==============================================================================
`;

for (let i = 0; i < U18_PLAYERS.length; i++) {
  const p = U18_PLAYERS[i];
  const t1Id = `d0000000-0018-0001-0001-${p.id.split('-')[4]}`;
  const t2Id = `d0000000-0018-0001-0002-${p.id.split('-')[4]}`;

  [ { r: p.r1, id: t1Id, num: 1 }, { r: p.r2, id: t2Id, num: 2 } ].forEach(({ r, id, num }) => {
    sql += `
INSERT INTO public.recruitment_timeline (
    id, candidate_id, event_type, event_title, event_description, performed_by, event_date
) VALUES (
    '${id}',
    '${p.id}',
    'evaluated',
    ${escapeSql(`Rapport d'Observation Terrain N°${num} : ${r.title}`)},
    ${escapeSql(`Évaluation complète validée (${r.verdict}). ${r.strengths}`)},
    ${escapeSql(r.evaluator_name)},
    '${r.date}'
)
ON CONFLICT (id) DO UPDATE SET
    event_title = EXCLUDED.event_title,
    event_description = EXCLUDED.event_description,
    performed_by = EXCLUDED.performed_by,
    event_date = EXCLUDED.event_date;
`;
  });
}

const outPath = path.join(__dirname, 'supabase/migrations/20260925_seed_u18_scout_reports.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log(`Fichier SQL généré avec succès : ${outPath}`);
console.log(`Taille : ${sql.length} octets`);
