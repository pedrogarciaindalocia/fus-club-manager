/**
 * Grille d'évaluation Scout FUS par Poste
 * 9 Profils tactiques avec 4 piliers : Technique, Tactique, Physique, Mental.
 * Support de personnalisation dynamique pour la session Super Admin.
 */

export type ScoutPillarKey = 'technique' | 'tactique' | 'physique' | 'mental';

export interface ScoutPositionConfig {
  id: string;
  code: string;
  name: string;
  emoji: string;
  category: 'GK' | 'DF' | 'MF' | 'FW';
  criteria: {
    technique: string[];
    tactique: string[];
    physique: string[];
    mental: string[];
  };
}

export const SCOUT_POSITION_CONFIGS: Record<string, ScoutPositionConfig> = {
  GK: {
    id: 'GK',
    code: 'GK',
    name: 'Gardien de but',
    emoji: '',
    category: 'GK',
    criteria: {
      technique: [
        'Prise de balle',
        'Jeu au pied',
        'Passe courte',
        'Passe longue',
        'Sorties aériennes',
        '1 contre 1',
        'Arrêts',
      ],
      tactique: [
        'Placement',
        'Positionnement',
        'Anticipation',
        'Lecture des trajectoires',
        'Gestion profondeur',
        'Relance',
        'Organisation défense',
      ],
      physique: [
        'Explosivité',
        'Détente',
        'Agilité',
        'Vitesse',
        'Coordination',
        'Souplesse',
        'Force',
      ],
      mental: [
        'Concentration',
        'Réactivité',
        'Confiance',
        'Gestion de pression',
        'Communication',
        'Prise de décision',
        'Leadership',
      ],
    },
  },

  CB: {
    id: 'CB',
    code: 'CB',
    name: 'Défenseur central',
    emoji: '',
    category: 'DF',
    criteria: {
      technique: [
        'Contrôle & première touche (orientée, sous pression, en mouvement)',
        'Passe & relance (courte/longue, filtrante, diagonale, déviation, sous pression)',
        'Jeu de tête & duels (offensif/défensif, aériens & au sol)',
        'Frappe & tirs (variété, efficacité)',
        'Dribbles & conduite (jusqu’au moment opportun, feintes, 1v1)',
        'Défense individuelle (cadrage, recul-frein, tacles maîtrisés, interceptions, récupération)',
        'Prise d’information & décision (rapidité, sélection de passe, orientation du corps)',
      ],
      tactique: [
        'Transitions & pressing (avec et sans ballon, réactivité, marquage préventif, gestion profondeur)',
        'Positionnement & couverture (placement, alignement, cadrage, couverture espace)',
        'Lecture & anticipation (trajectoires, pertes, profondeur, danger immédiat)',
        'Gestion du bloc & tempo (remontée, contrôle défensif, rythme du jeu)',
        'Verticalité & participation offensive (projection, relance, fixation, compréhension du jeu)',
      ],
      physique: [
        'Vitesse & accélération (profondeur, mobilité, transitions rapides)',
        'Explosivité & détente (premiers appuis, duels aériens, impulsion)',
        'Puissance & gabarit (force, impact physique, jeu de tête offensif et défensif)',
        'Endurance & intensité (répétition d’efforts, volume de jeu)',
        'Coordination & agilité (appuis, équilibre, profil latéral inclus)',
      ],
      mental: [
        'Vision & intelligence de jeu (lecture, anticipation, flair, perception → prise d’info & décision)',
        'Détermination & agressivité (courage, intensité dans les duels, esprit compétitif)',
        'Concentration & résilience (gestion des transitions, réactivité, bon état d’esprit)',
        'Leadership & communication (confiance, influence, coordination collective)',
      ],
    },
  },

  RB: {
    id: 'RB',
    code: 'RB',
    name: 'Latéral droit',
    emoji: '',
    category: 'DF',
    criteria: {
      technique: [
        'Contrôle & première touche (orienté, sous pression, tous types)',
        'Passe & relance (courte/longue, dosée, remises/déviations, soutien à la relance)',
        'Dribbles & duels 1v1 (offensifs/défensifs, feintes, conservation)',
        'Centres & jeu de tête (offensif & défensif)',
        'Frappe & tirs (variété, efficacité)',
        'Défense individuelle (cadrage, interceptions, tacles/charges, défense haute)',
      ],
      tactique: [
        'Transitions & pressing (avec et sans ballon, réactivité, repli, pressing intelligent)',
        'Positionnement & discipline (alignement, replacement, marquage individuel/couverture)',
        'Lecture & compréhension du jeu (anticipation pertes/profondeur, conscience espace-temps, gestion infériorité)',
        'Verticalité & largeur (appels en profondeur, participation offensive, dédoublements couloir droit)',
        'Créativité & relance (fixation, circulation, apporter des solutions)',
      ],
      physique: [
        'Vitesse & accélération (profondeur, transitions)',
        'Explosivité & détente (appuis, impulsion, duels aériens)',
        'Puissance & engagement (force dans les duels, intensité physique)',
        'Endurance & mobilité (répétition d’efforts, couverture terrain)',
        'Agilité & coordination (souplesse, équilibre, changements de direction)',
      ],
      mental: [
        'Vision & intelligence de jeu (lecture, anticipation, perception → analyse → décision)',
        'Détermination & agressivité (courage, intensité, dépassement de soi)',
        'Concentration & constance (répétition d’efforts, justesse sous pression)',
        'Confiance & leadership (communication, influence, bon état d’esprit)',
      ],
    },
  },

  LB: {
    id: 'LB',
    code: 'LB',
    name: 'Latéral gauche',
    emoji: '',
    category: 'DF',
    criteria: {
      technique: [
        'Contrôle & première touche (orienté, sous pression, tous types)',
        'Passe & relance (courte/longue, dosée, remises/déviations, soutien à la relance)',
        'Dribbles & duels 1v1 (offensifs/défensifs, feintes, conservation)',
        'Centres & jeu de tête (offensif & défensif)',
        'Frappe & tirs (variété, efficacité)',
        'Défense individuelle (cadrage, interceptions, tacles/charges, défense haute)',
      ],
      tactique: [
        'Transitions & pressing (avec et sans ballon, réactivité, repli, pressing intelligent)',
        'Positionnement & discipline (alignement, replacement, marquage individuel/couverture)',
        'Lecture & compréhension du jeu (anticipation pertes/profondeur, conscience espace-temps, gestion infériorité)',
        'Verticalité & largeur (appels en profondeur, participation offensive, dédoublements couloir gauche)',
        'Créativité & relance (fixation, circulation, apporter des solutions)',
      ],
      physique: [
        'Vitesse & accélération (profondeur, transitions)',
        'Explosivité & détente (appuis, impulsion, duels aériens)',
        'Puissance & engagement (force dans les duels, intensité physique)',
        'Endurance & mobilité (répétition d’efforts, couverture terrain)',
        'Agilité & coordination (souplesse, équilibre, changements de direction)',
      ],
      mental: [
        'Vision & intelligence de jeu (lecture, anticipation, perception → analyse → décision)',
        'Détermination & agressivité (courage, intensité, dépassement de soi)',
        'Concentration & constance (répétition d’efforts, justesse sous pression)',
        'Confiance & leadership (communication, influence, bon état d’esprit)',
      ],
    },
  },

  RB_LB: {
    id: 'RB_LB',
    code: 'RB/LB',
    name: 'Latéraux',
    emoji: '',
    category: 'DF',
    criteria: {
      technique: [
        'Contrôle & première touche (orienté, sous pression, tous types)',
        'Passe & relance (courte/longue, dosée, remises/déviations, soutien à la relance)',
        'Dribbles & duels 1v1 (offensifs/défensifs, feintes, conservation)',
        'Centres & jeu de tête (offensif & défensif)',
        'Frappe & tirs (variété, efficacité)',
        'Défense individuelle (cadrage, interceptions, tacles/charges, défense haute)',
      ],
      tactique: [
        'Transitions & pressing (avec et sans ballon, réactivité, repli, pressing intelligent)',
        'Positionnement & discipline (alignement, replacement, marquage individuel/couverture)',
        'Lecture & compréhension du jeu (anticipation pertes/profondeur, conscience espace-temps, gestion infériorité)',
        'Verticalité & largeur (appels en profondeur, participation offensive, dédoublements)',
        'Créativité & relance (fixation, circulation, apporter des solutions)',
      ],
      physique: [
        'Vitesse & accélération (profondeur, transitions)',
        'Explosivité & détente (appuis, impulsion, duels aériens)',
        'Puissance & engagement (force dans les duels, intensité physique)',
        'Endurance & mobilité (répétition d’efforts, couverture terrain)',
        'Agilité & coordination (souplesse, équilibre, changements de direction)',
      ],
      mental: [
        'Vision & intelligence de jeu (lecture, anticipation, perception → analyse → décision)',
        'Détermination & agressivité (courage, intensité, dépassement de soi)',
        'Concentration & constance (répétition d’efforts, justesse sous pression)',
        'Confiance & leadership (communication, influence, bon état d’esprit)',
      ],
    },
  },

  CDM: {
    id: 'CDM',
    code: 'CDM / 6',
    name: 'Milieu défensif',
    emoji: '',
    category: 'MF',
    criteria: {
      technique: [
        'Contrôle & première touche (sous pression, orientée, en mouvement)',
        'Passe & relance (courte/longue, dosée, déviation, cassant les lignes)',
        'Dribbles & 1v1 (conduite, feintes, demi-tour, supériorité)',
        'Frappe & finition (tirs, verticalité offensive, capacité à marquer)',
        'Jeu de tête (offensif & défensif)',
        'Défense individuelle (duels, cadrage, recul-frein, tacles, interceptions, récupération)',
        'Contrôle du tempo (accélérer/décélérer, orientation du corps, rythme du jeu)',
      ],
      tactique: [
        'Transitions & pressing (avec et sans ballon, réactivité, pressing/repli, marquage préventif)',
        'Positionnement & couverture (placement, alignement, cadrage, marquage, gestion infériorité)',
        'Lecture & contrôle du jeu (prise d’info, anticipation, gestion des temps forts/faibles)',
        'Gestion & occupation d’espaces (mouvements entre lignes, projection vers l’avant, couverture défensive)',
        'Verticalité & créativité (apports offensifs, fixation, jeu direct)',
      ],
      physique: [
        'Endurance & intensité (volume de jeu, répétition des efforts)',
        'Puissance & duels (force, impact physique)',
        'Vitesse & explosivité (profondeur, premiers appuis)',
        'Coordination & agilité (appuis, vivacité, équilibre)',
        'Profils spécifiques (latéral, de surface à surface)',
      ],
      mental: [
        'Vision & intelligence de jeu (orientation, gestion du temps, perception/prise d’info)',
        'Confiance & initiative (prise de risque, créativité, courage, agressivité positive)',
        'Concentration & résilience (alerte, endurance mentale, capacité à oublier l’action précédente)',
        'Communication & leadership (bon état d’esprit, disponibilité pour le porteur, influence collective)',
      ],
    },
  },

  CAM: {
    id: 'CAM',
    code: 'CAM / 10',
    name: 'Milieu offensif',
    emoji: '',
    category: 'MF',
    criteria: {
      technique: [
        'Première touche & contrôles (orientés, sous pression, en mouvement)',
        'Passe & relance (courte/longue, cassant les lignes, remises, déviations)',
        'Dribbles & 1v1 (feintes, création de supériorité)',
        'Frappe & finition (variété de tirs, efficacité devant le but, capacité à marquer)',
        'Jeu de tête (offensif & défensif)',
        'Centres & création d’occasions',
        'Conservation & disponibilité (dos au but, entre lignes)',
        'Défense individuelle (interceptions, récupération, cadrage, pression)',
      ],
      tactique: [
        'Réactivité en transitions (avec et sans ballon, pressing/repli)',
        'Positionnement & couverture (placement, alignement, cadrage, marquage, couverture)',
        'Lecture & compréhension du jeu (prise d’info, contrôle du tempo, anticipation, gestion déséquilibres)',
        'Verticalité & occupation espaces (appels en profondeur, déplacements entre lignes, occupation surface)',
      ],
      physique: [
        'Vitesse & explosivité (profondeur, transitions)',
        'Puissance & engagement (force dans les duels)',
        'Endurance (volume de jeu, répétition d’efforts)',
        'Coordination, appuis & vivacité (agilité, changements de direction)',
      ],
      mental: [
        'Vision & intelligence de jeu (orientation, anticipation, lecture, perception)',
        'Détermination & résilience (résistance aux échecs, capacité à oublier l’action précédente, endurance mentale)',
        'Confiance & initiative (prise de risque, créativité, courage)',
        'Communication & leadership (bon état d’esprit, esprit collectif, gestion du stress, concentration)',
        'Esprit collectif & générosité (solidarité, connexions, pressing intelligent)',
      ],
    },
  },

  RW_LW: {
    id: 'RW_LW',
    code: 'RW / LW',
    name: 'Ailier',
    emoji: '',
    category: 'FW',
    criteria: {
      technique: [
        'Première touche & contrôles (orientés, sous pression, en mouvement)',
        'Passe & relance (courte/longue, remises, déviations, cassant les lignes)',
        'Dribbles & 1v1 (feintes, création supériorité)',
        'Centres',
        'Frappe & finition (variété de tirs, efficacité dans surface)',
        'Jeu de tête (offensif & défensif)',
        'Conservation & disponibilité (dos au but, entre lignes)',
        'Créativité et progression de balle',
        'Capacités défensives spécifiques (interceptions, récupération, pression orientée)',
      ],
      tactique: [
        'Réactivité en transitions (avec et sans ballon, pressing/repli)',
        'Positionnement & alignement (placement, cadrage, couverture, marquage)',
        'Verticalité & occupation des espaces (appels en profondeur, déplacements entre lignes, occupation surface)',
        'Lecture & compréhension du jeu (prise d’info, contrôle du tempo, gestion déséquilibres)',
      ],
      physique: [
        'Vitesse & explosivité (appels, transitions)',
        'Puissance & engagement (duels, protection ballon)',
        'Endurance (volume de jeu, répétition d’efforts)',
        'Coordination, appuis & vivacité (changements de direction, agilité)',
      ],
      mental: [
        'Vision & intelligence de jeu (orientation, anticipation, lecture des situations)',
        'Détermination & résilience (résistance aux échecs, capacité à oublier le précédent)',
        'Confiance & initiative (prise de risque créative, courage, leadership)',
        'Communication & esprit collectif (cohésion, bon état d’esprit, discipline)',
        'Concentration & lucidité (gestion du stress, endurance mentale, justesse sous pression)',
      ],
    },
  },

  ST: {
    id: 'ST',
    code: 'ST / CF',
    name: 'Attaquant de pointe',
    emoji: '',
    category: 'FW',
    criteria: {
      technique: [
        'Première touche & contrôle orienté sous pression',
        'Jeu en appui (remises, déviations, conservation dos au but)',
        'Dribbles & 1v1 (création de supériorité)',
        'Passe & dernière passe (création occasions, variété de transmissions)',
        'Finition (dans surface, têtes, frappes variées)',
      ],
      tactique: [
        'Réactivité en transitions (avec et sans ballon, pressing/repli)',
        'Pressing & contre-pressing (déclenchements, cadrage, fermer l’axe)',
        'Positionnement & déplacements (entre lignes, appels en profondeur, occupation surface)',
        'Jeu sans ballon (création/occupation d’espaces, connexions avec milieux/ailiers)',
        'Lecture & prise de décision (choix rapides, efficacité dans dernier tiers)',
      ],
      physique: [
        'Vitesse & explosivité (profondeur, transition)',
        'Puissance & engagement (duels, couverture du ballon)',
        'Endurance (répétition d’efforts, pressing/replis)',
        'Coordination & vivacité (appuis, changements de direction)',
      ],
      mental: [
        'Vision & intelligence de jeu (orientation, lecture des situations, anticipation)',
        'Détermination & résilience (capacité à réagir après perte, résistance aux échecs)',
        'Confiance & initiative (prise de risque créative, tirer/passer sous pression)',
        'Concentration & lucidité (exécution rapide, justesse dans zones décisives)',
        'Esprit collectif (communication, leadership, discipline tactique)',
      ],
    },
  },
};

const STORAGE_KEY_CUSTOM_CRITERIA = 'fus_scout_custom_criteria_v1';
export const SCOUT_CRITERIA_UPDATED_EVENT = 'fus_scout_criteria_updated';

/**
 * Récupère les configurations de scouting personnalisées (ou les grilles par défaut).
 */
export function getCustomScoutPositionConfigs(): Record<string, ScoutPositionConfig> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return SCOUT_POSITION_CONFIGS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_CRITERIA);
    if (!raw) return SCOUT_POSITION_CONFIGS;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const merged: Record<string, ScoutPositionConfig> = { ...SCOUT_POSITION_CONFIGS };
      Object.keys(SCOUT_POSITION_CONFIGS).forEach(key => {
        if (parsed[key]?.criteria) {
          merged[key] = {
            ...SCOUT_POSITION_CONFIGS[key],
            ...parsed[key],
            criteria: {
              technique: parsed[key].criteria.technique || SCOUT_POSITION_CONFIGS[key].criteria.technique,
              tactique: parsed[key].criteria.tactique || SCOUT_POSITION_CONFIGS[key].criteria.tactique,
              physique: parsed[key].criteria.physique || SCOUT_POSITION_CONFIGS[key].criteria.physique,
              mental: parsed[key].criteria.mental || SCOUT_POSITION_CONFIGS[key].criteria.mental,
            }
          };
        }
      });
      return merged;
    }
  } catch (err) {
    console.warn('[scoutCriteriaByPosition] Erreur lecture custom criteria:', err);
  }
  return SCOUT_POSITION_CONFIGS;
}

/**
 * Sauvegarde les configurations personnalisées et émet un événement global de mise à jour.
 */
export function saveCustomScoutPositionConfigs(configs: Record<string, ScoutPositionConfig>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_CRITERIA, JSON.stringify(configs));
    window.dispatchEvent(new CustomEvent(SCOUT_CRITERIA_UPDATED_EVENT, { detail: configs }));
  } catch (err) {
    console.warn('[scoutCriteriaByPosition] Erreur sauvegarde custom criteria:', err);
  }
}

/**
 * Réinitialise aux grilles officielles de critères par défaut FUS.
 */
export function resetToDefaultScoutConfigs(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_CRITERIA);
    window.dispatchEvent(new CustomEvent(SCOUT_CRITERIA_UPDATED_EVENT, { detail: SCOUT_POSITION_CONFIGS }));
  } catch (err) {
    console.warn('[scoutCriteriaByPosition] Erreur reset custom criteria:', err);
  }
}

/**
 * Ajoute un critère à un poste et un pilier donnés (Réservé Super Admin).
 */
export function addScoutCriterion(positionId: string, pillar: ScoutPillarKey, criterionName: string): boolean {
  const cleanName = criterionName.trim();
  if (!cleanName) return false;
  const configs = getCustomScoutPositionConfigs();
  const pos = configs[positionId];
  if (!pos) return false;

  const currentList = pos.criteria[pillar] || [];
  if (currentList.some(c => c.toLowerCase() === cleanName.toLowerCase())) return false;

  const updated: Record<string, ScoutPositionConfig> = {
    ...configs,
    [positionId]: {
      ...pos,
      criteria: {
        ...pos.criteria,
        [pillar]: [...currentList, cleanName],
      }
    }
  };
  saveCustomScoutPositionConfigs(updated);
  return true;
}

/**
 * Modifie/renomme un critère existant (Réservé Super Admin).
 */
export function updateScoutCriterion(positionId: string, pillar: ScoutPillarKey, oldName: string, newName: string): boolean {
  const cleanNew = newName.trim();
  if (!cleanNew || cleanNew === oldName) return false;
  const configs = getCustomScoutPositionConfigs();
  const pos = configs[positionId];
  if (!pos) return false;

  const currentList = pos.criteria[pillar] || [];
  const updatedList = currentList.map(c => c === oldName ? cleanNew : c);

  const updated: Record<string, ScoutPositionConfig> = {
    ...configs,
    [positionId]: {
      ...pos,
      criteria: {
        ...pos.criteria,
        [pillar]: updatedList,
      }
    }
  };
  saveCustomScoutPositionConfigs(updated);
  return true;
}

/**
 * Supprime un critère (Réservé Super Admin).
 */
export function deleteScoutCriterion(positionId: string, pillar: ScoutPillarKey, criterionName: string): boolean {
  const configs = getCustomScoutPositionConfigs();
  const pos = configs[positionId];
  if (!pos) return false;

  const currentList = pos.criteria[pillar] || [];
  const updatedList = currentList.filter(c => c !== criterionName);

  const updated: Record<string, ScoutPositionConfig> = {
    ...configs,
    [positionId]: {
      ...pos,
      criteria: {
        ...pos.criteria,
        [pillar]: updatedList,
      }
    }
  };
  saveCustomScoutPositionConfigs(updated);
  return true;
}

/**
 * Associe n'importe quel code ou libellé de poste à l'une des 9 configurations de scouting.
 * Prend en compte les critères personnalisés enregistrés par le Super Admin.
 */
export function getScoutPositionConfig(rawPosition?: string | null): ScoutPositionConfig {
  const configs = getCustomScoutPositionConfigs();
  const defaultFallback: ScoutPositionConfig =
    configs.ST ||
    SCOUT_POSITION_CONFIGS.ST ||
    configs.CAM ||
    SCOUT_POSITION_CONFIGS.CAM ||
    configs.CDM ||
    SCOUT_POSITION_CONFIGS.CDM ||
    Object.values(configs)[0] ||
    Object.values(SCOUT_POSITION_CONFIGS)[0];

  if (!rawPosition) {
    return defaultFallback;
  }

  const clean = rawPosition.trim().toUpperCase();
  const lower = rawPosition.toLowerCase();

  // 1. Gardien — GK
  if (clean === 'GK' || clean === 'G' || clean === 'GB' || lower.includes('gardien')) {
    return configs.GK || SCOUT_POSITION_CONFIGS.GK || defaultFallback;
  }

  // 2. Défenseur central — CB
  if (
    clean === 'CB' ||
    clean === 'DC' ||
    lower.includes('central') ||
    lower.includes('stoppeur') ||
    lower.includes('libero')
  ) {
    return configs.CB || SCOUT_POSITION_CONFIGS.CB || defaultFallback;
  }

  // 3. Latéral droit — RB / DD / RWB
  if (
    clean === 'RB' ||
    clean === 'DD' ||
    clean === 'RWB' ||
    clean.includes('RB') ||
    clean.includes('DD') ||
    (lower.includes('droit') && (lower.includes('latéral') || lower.includes('lateral') || lower.includes('arrière') || lower.includes('arriere')))
  ) {
    return configs.RB || SCOUT_POSITION_CONFIGS.RB || configs.RB_LB || SCOUT_POSITION_CONFIGS.RB_LB || defaultFallback;
  }

  // 3bis. Latéral gauche — LB / DG / LWB
  if (
    clean === 'LB' ||
    clean === 'DG' ||
    clean === 'LWB' ||
    clean.includes('LB') ||
    clean.includes('DG') ||
    (lower.includes('gauche') && (lower.includes('latéral') || lower.includes('lateral') || lower.includes('arrière') || lower.includes('arriere')))
  ) {
    return configs.LB || SCOUT_POSITION_CONFIGS.LB || configs.RB_LB || SCOUT_POSITION_CONFIGS.RB_LB || defaultFallback;
  }

  // 3ter. Latéral générique / fallback
  if (
    clean.includes('RB/LB') ||
    clean.includes('RB_LB') ||
    lower.includes('latéral') ||
    lower.includes('lateral') ||
    lower.includes('arrière') ||
    lower.includes('arriere')
  ) {
    return configs.RB || configs.LB || configs.RB_LB || SCOUT_POSITION_CONFIGS.RB || defaultFallback;
  }

  // 4. Milieu défensif — CDM / 6
  if (
    clean === 'CDM' ||
    clean === 'DM' ||
    clean === 'MDC' ||
    clean === '6' ||
    lower.includes('défensif') ||
    lower.includes('defensif') ||
    lower.includes('sentinelle') ||
    lower.includes('recuperateur')
  ) {
    return configs.CDM || SCOUT_POSITION_CONFIGS.CDM || defaultFallback;
  }

  // 5. Milieu offensif — CAM / 10
  if (
    clean === 'CAM' ||
    clean === 'AM' ||
    clean === 'MOC' ||
    clean === 'MO' ||
    clean === '10' ||
    lower.includes('offensif') ||
    lower.includes('meneur')
  ) {
    return configs.CAM || SCOUT_POSITION_CONFIGS.CAM || defaultFallback;
  }

  // 6. Milieu central / relayeur / CM / 8 -> mappé vers Milieu Offensif ou Défensif
  if (
    clean === 'CM' ||
    clean === 'MC' ||
    clean === 'MF' ||
    clean === '8' ||
    lower.includes('milieu') ||
    lower.includes('relayeur')
  ) {
    return configs.CAM || configs.CDM || SCOUT_POSITION_CONFIGS.CAM || defaultFallback;
  }

  // 7. Ailier — RW / LW
  if (
    clean === 'RW' ||
    clean === 'LW' ||
    clean === 'RM' ||
    clean === 'LM' ||
    clean === 'AD' ||
    clean === 'AG' ||
    clean === 'MD' ||
    clean === 'MG' ||
    lower.includes('ailier')
  ) {
    return configs.RW_LW || SCOUT_POSITION_CONFIGS.RW_LW || defaultFallback;
  }

  // 8. Second attaquant — SS / 9.5 -> mappé vers Attaquant de pointe ou Milieu Offensif
  if (
    clean === 'SS' ||
    clean === 'SA' ||
    clean === 'AT' ||
    clean === '9.5' ||
    lower.includes('second') ||
    lower.includes('soutien')
  ) {
    return configs.ST || configs.CAM || SCOUT_POSITION_CONFIGS.ST || defaultFallback;
  }

  // 9. Avant-centre / Attaquant de pointe — ST / CF
  if (
    clean === 'ST' ||
    clean === 'CF' ||
    clean === 'BU' ||
    clean === 'AC' ||
    clean === '9' ||
    lower.includes('centre') ||
    lower.includes('buteur') ||
    lower.includes('attaquant') ||
    lower.includes('pointe')
  ) {
    return configs.ST || SCOUT_POSITION_CONFIGS.ST || defaultFallback;
  }

  // Fallback universel garanti
  return defaultFallback;
}

export const SCOUT_POSITION_PROFILES = SCOUT_POSITION_CONFIGS;
