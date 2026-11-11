import { isScoutBranch } from '../constants/roles';

export type MetricPillar = 'technique' | 'tactique' | 'physique' | 'mental';

export type MetricPositionCategory = 'GK' | 'DF' | 'MF' | 'FW';

export type MetricSetScope =
  | 'player_performance'
  | 'match_performance'
  | 'training_performance'
  | 'custom';

export type MetricSetTemplateMode = 'performance_preset' | 'positions_only' | 'blank';

export interface MetricCriteriaByPillar {
  technique: string[];
  tactique: string[];
  physique: string[];
  mental: string[];
}

export interface MetricSet {
  id: string;
  code: string;
  name: string;
  description: string;
  emoji: string;
  scope: MetricSetScope;
  exclude_scouts: boolean;
  is_active: boolean;
  sort_order: number;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MetricSetPosition {
  id: string;
  metric_set_id: string;
  code: string;
  name: string;
  emoji: string;
  category: MetricPositionCategory;
  criteria: MetricCriteriaByPillar;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export const SCOUTING_LOCKED_SET_ID = 'scouting_v2_locked';
export const METRIC_SETS_CACHE_KEY = 'fus_metric_sets_cache_v1';
export const METRIC_SET_POSITIONS_CACHE_KEY = 'fus_metric_set_positions_cache_v1';
export const DEFAULT_PLAYER_PERFORMANCE_SET_ID = 'default_player_performance_set';

export const METRIC_CATEGORY_FR_LABELS: Record<MetricPositionCategory, string> = {
  GK: 'Gardien',
  DF: 'Défenseur',
  MF: 'Milieu',
  FW: 'Attaquant',
};

export const METRIC_POSITION_CODE_FR_LABELS: Record<string, string> = {
  GK: 'Gardien de but',
  G: 'Gardien de but',
  GB: 'Gardien de but',
  CB: 'Défenseur central',
  DC: 'Défenseur central',
  DCF: 'Défenseur central',
  RB: 'Latéral droit',
  DD: 'Latéral droit',
  RWB: 'Piston droit',
  LB: 'Latéral gauche',
  DG: 'Latéral gauche',
  LWB: 'Piston gauche',
  'RB/LB': 'Latéraux',
  RB_LB: 'Latéraux',
  DF: 'Défenseur',
  CDM: 'Milieu défensif',
  'CDM / 6': 'Milieu défensif',
  MDC: 'Milieu défensif',
  CM: 'Milieu central',
  'CM / 8': 'Milieu central',
  MC: 'Milieu central',
  CAM: 'Milieu offensif',
  'CAM / 10': 'Milieu offensif',
  MOC: 'Milieu offensif',
  MF: 'Milieu',
  RW: 'Ailier droit',
  AD: 'Ailier droit',
  LW: 'Ailier gauche',
  AG: 'Ailier gauche',
  'RW / LW': 'Ailier',
  'RW/LW': 'Ailier',
  RW_LW: 'Ailier',
  SS: 'Second attaquant',
  ST: 'Avant-centre',
  'ST / CF': 'Attaquant de pointe',
  CF: 'Attaquant de pointe',
  FW: 'Attaquant',
};

/**
 * Retourne le libellé français complet d'une catégorie de poste métrique sans abréviation anglaise.
 */
export function getMetricCategoryFrenchLabel(cat?: string | null): string {
  const clean = (cat || '').trim().toUpperCase();
  if (clean === 'ALL' || clean === 'TOUS') return 'Tous';
  if (clean in METRIC_CATEGORY_FR_LABELS) {
    return METRIC_CATEGORY_FR_LABELS[clean as MetricPositionCategory];
  }
  return cat?.trim() || 'Autre';
}

/**
 * Retourne le nom français complet d'un poste de métrique sans afficher les codes/abréviations anglaises (GK, CB, CDM...).
 */
export function getMetricPositionFrenchName(
  pos?: { code?: string | null; name?: string | null } | string | null
): string {
  if (!pos) return 'Poste';
  if (typeof pos === 'string') {
    const clean = pos.trim();
    const upper = clean.toUpperCase();
    return METRIC_POSITION_CODE_FR_LABELS[upper] || clean;
  }
  const rawName = (pos.name || '').trim();
  const rawCode = (pos.code || '').trim();
  if (rawName) {
    const mappedFromName = METRIC_POSITION_CODE_FR_LABELS[rawName.toUpperCase()];
    if (mappedFromName) return mappedFromName;
    if (rawName.toUpperCase() === 'GARDIEN') return 'Gardien de but';
    return rawName;
  }
  if (rawCode) {
    return METRIC_POSITION_CODE_FR_LABELS[rawCode.toUpperCase()] || rawCode;
  }
  return 'Poste';
}

export const METRIC_SET_SCOPE_META: Record<
  MetricSetScope,
  { label: string; shortLabel: string; badgeClass: string; description: string }
> = {
  player_performance: {
    label: 'Performance Joueur (Club)',
    shortLabel: 'Performance Joueur',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'Évaluation globale de la performance des joueurs du club (à part des scouts).',
  },
  match_performance: {
    label: 'Performance Match',
    shortLabel: 'Perf. Match',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Métriques staff dédiées à l’analyse des joueurs en compétition.',
  },
  training_performance: {
    label: 'Performance Entraînement',
    shortLabel: 'Perf. Entraînement',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Indicateurs de suivi quotidien et progression en séance.',
  },
  custom: {
    label: 'Référentiel Personnalisé (Hors-Scout)',
    shortLabel: 'Personnalisé',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    description: 'Lot sur mesure réservé au staff et à la direction technique.',
  },
};

export interface PresetPositionSeed {
  code: string;
  name: string;
  emoji: string;
  category: MetricPositionCategory;
  sort_order: number;
  criteria: MetricCriteriaByPillar;
}

export const PLAYER_PERFORMANCE_PRESET_POSITIONS: PresetPositionSeed[] = [
  {
    code: 'GK',
    name: 'Gardien de but',
    emoji: '🧤',
    category: 'GK',
    sort_order: 1,
    criteria: {
      technique: [
        'Prise de balle & captage',
        'Jeu au pied court & long',
        'Relance sous pression',
        'Sorties aériennes',
        'Arrêts réflexes',
      ],
      tactique: [
        'Placement sur la ligne & angle',
        'Gestion de la profondeur',
        'Communication défensive',
        'Lecture des centres',
      ],
      physique: ['Détente & impulsion', 'Explosivité appuis', 'Agilité au sol', 'Coordination'],
      mental: [
        'Concentration sur 90 min',
        'Calme sous pression',
        'Autorité dans la surface',
        'Résilience après erreur',
      ],
    },
  },
  {
    code: 'CB',
    name: 'Défenseur central',
    emoji: '🛡️',
    category: 'DF',
    sort_order: 2,
    criteria: {
      technique: [
        'Contrôle orienté & première relance',
        'Passe entre les lignes',
        'Jeu aérien défensif & offensif',
        'Tacle & interception propre',
      ],
      tactique: [
        'Alignement ligne défensive',
        'Couverture & gestion profondeur',
        'Duel 1 contre 1 défensif',
        'Cadrage porteur de balle',
      ],
      physique: [
        'Vitesse de récupération',
        'Puissance dans les duels',
        'Endurance de concentration',
        'Impulsion aérienne',
      ],
      mental: [
        'Leadership défensif',
        'Communication constante',
        'Sang-froid à la relance',
        'Agressivité maîtrisée',
      ],
    },
  },
  {
    code: 'RB',
    name: 'Latéral droit',
    emoji: '🏃',
    category: 'DF',
    sort_order: 3,
    criteria: {
      technique: [
        'Contrôle en course',
        'Centre en première intention',
        'Dribble & dédoublement',
        'Passe verticale sur couloir',
      ],
      tactique: [
        'Gestion couloir défensif',
        'Fermeture second poteau',
        'Timing montées offensives',
        'Transitions avec et sans ballon',
      ],
      physique: [
        'Vitesse maximale & répétée',
        'Capacité aérobie (allers-retours)',
        'Explosivité 1ers mètres',
        'Résistance physique',
      ],
      mental: [
        'Rigueur défensive',
        "Générosité dans l'effort",
        "Prise d'initiative couloir",
        'Lucidité fin de match',
      ],
    },
  },
  {
    code: 'LB',
    name: 'Latéral gauche',
    emoji: '🏃',
    category: 'DF',
    sort_order: 4,
    criteria: {
      technique: [
        'Contrôle en course pied gauche',
        'Centre précis en mouvement',
        'Combinaison couloir & intérieur',
        'Passe sous pression',
      ],
      tactique: [
        'Fermeture axe & couloir',
        'Alignement hors-jeu',
        'Timing projection offensive',
        'Compensation défensive',
      ],
      physique: [
        'Vitesse de sprint répété',
        'Endurance haute intensité',
        "Vivacité d'appuis",
        'Duel épaule contre épaule',
      ],
      mental: [
        'Régularité sur le match',
        'Courage défensif',
        'Adaptation tactique',
        'Concentration sans ballon',
      ],
    },
  },
  {
    code: 'CDM',
    name: 'Milieu défensif',
    emoji: '⚙️',
    category: 'MF',
    sort_order: 5,
    criteria: {
      technique: [
        "Prise d'information avant contrôle",
        'Orientation du jeu court & long',
        'Protection de balle sous pressing',
        'Récupération propre sans faute',
      ],
      tactique: [
        'Équilibre bloc équipe',
        'Couverture des montées de latéraux',
        'Coupe des lignes de passe',
        'Déclenchement du contre-pressing',
      ],
      physique: [
        'Volume de course global',
        'Impact dans les duels',
        'Résistance à la fatigue',
        'Mobilité latérale',
      ],
      mental: [
        'Lecture anticipative du jeu',
        'Sérénité sous haute pression',
        'Discipline positionnelle',
        'Leadership au cœur du jeu',
      ],
    },
  },
  {
    code: 'CM',
    name: 'Milieu central',
    emoji: '🎯',
    category: 'MF',
    sort_order: 6,
    criteria: {
      technique: [
        "Contrôle orienté vers l'avant",
        'Passe cassant des lignes',
        'Projection & frappe de loin',
        'Conduite sous pression',
      ],
      tactique: [
        'Disponibilité entre les lignes',
        'Lien défense-attaque',
        'Alternance jeu court / long',
        'Repli défensif rapide',
      ],
      physique: [
        'Endurance intermittente (de surface à surface)',
        'Vivacité changements de rythme',
        'Puissance dans les duels',
        'Récupération entre efforts',
      ],
      mental: [
        'Intelligence tactique',
        'Justesse des choix sous fatigue',
        'Personnalité à la construction',
        'Régularité mentale',
      ],
    },
  },
  {
    code: 'CAM',
    name: 'Milieu offensif',
    emoji: '🎨',
    category: 'MF',
    sort_order: 7,
    criteria: {
      technique: [
        'Contrôle orienté petit périmètre',
        'Dernière passe décisive',
        'Dribble éliminatoire',
        'Frappe placée entrée de surface',
      ],
      tactique: [
        "Prise d'espace inter-lignes",
        'Création supériorité zone 14',
        'Appel en soutien attaquant',
        'Premier rideau de pressing',
      ],
      physique: [
        'Accélération sur 10m',
        'Agilité & équilibre appuis',
        "Vitesse d'exécution gestuelle",
        "Endurance d'intensité",
      ],
      mental: [
        'Créativité sous contrainte',
        'Sang-froid dans le dernier geste',
        'Vision périphérique',
        'Prise de risque calculée',
      ],
    },
  },
  {
    code: 'RW',
    name: 'Ailier droit',
    emoji: '🪽',
    category: 'FW',
    sort_order: 8,
    criteria: {
      technique: [
        'Dribble 1 contre 1 en vitesse',
        'Centre tendu ou en retrait',
        'Rentrée intérieur pied gauche',
        'Finition en angle fermé',
      ],
      tactique: [
        'Élargissement bloc adverse',
        'Appel dans le dos du latéral',
        'Attaque second poteau',
        'Repli sur latéral adverse',
      ],
      physique: [
        'Vitesse pure & démarrage',
        "Explosivité changements d'appui",
        'Répétition de sprints haute intensité',
        'Résistance aux contacts',
      ],
      mental: [
        'Audace & percussion',
        'Efficacité dans la zone de vérité',
        'Persévérance après échec en 1 contre 1',
        'Disponibilité constante',
      ],
    },
  },
  {
    code: 'LW',
    name: 'Ailier gauche',
    emoji: '🪽',
    category: 'FW',
    sort_order: 9,
    criteria: {
      technique: [
        'Dribble 1 contre 1 extérieur / intérieur',
        'Frappe enroulée pied opposé',
        'Combiné court avec latéral/10',
        'Dernière passe surface',
      ],
      tactique: [
        'Attaque de la profondeur',
        "Fixation & libération d'espace",
        'Transition offensive immédiate',
        'Pressing orienté sur relance',
      ],
      physique: [
        'Accélération explosive',
        'Agilité & feintes de corps',
        'Endurance répétition sprints',
        'Équilibre à haute vitesse',
      ],
      mental: [
        'Confiance dans le un contre un',
        'Lucidité devant le but',
        'Implication défensive collective',
        'Réactivité transitions',
      ],
    },
  },
  {
    code: 'ST',
    name: 'Avant-centre',
    emoji: '⚽',
    category: 'FW',
    sort_order: 10,
    criteria: {
      technique: [
        'Finition 1 touche pied/tête',
        'Contrôle & remise dos au but',
        'Protection du ballon dans la surface',
        'Frappe puissante & placée',
      ],
      tactique: [
        'Déplacements de rupture & décrochage',
        'Occupation charnière centrale',
        'Pressing coordonné des relances',
        'Timing appels dans surface',
      ],
      physique: [
        'Puissance & engagement duels',
        'Détente aérienne',
        'Explosivité sur 5-15m',
        'Résistance au marquage serré',
      ],
      mental: [
        'Sang-froid face au gardien',
        'Instinct de buteur',
        'Combativité permanente',
        'Résilience si peu servi',
      ],
    },
  },
];

export const DEFAULT_PLAYER_PERFORMANCE_SET: MetricSet = {
  id: DEFAULT_PLAYER_PERFORMANCE_SET_ID,
  code: 'player_performance',
  name: 'Performance Joueur',
  description:
    'Référentiel dynamique dédié à la performance des joueurs du club (isolé des scouts et de Détection V2).',
  emoji: '📈',
  scope: 'player_performance',
  exclude_scouts: true,
  is_active: true,
  sort_order: 1,
};

/**
 * Détermine strictement si l'utilisateur appartient à la branche Scout / Détection
 * (ne doit ni voir ni modifier les lots personnalisés Performance Joueur).
 */
export function isUserBlockedFromCustomMetricSets(
  systemRole?: string | null,
  jobTitle?: string | null
): boolean {
  if (isScoutBranch(systemRole, jobTitle)) return true;
  const normJob = (jobTitle || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  return normJob.includes('scout') || normJob.includes('detecteur');
}

/**
 * Filtre les lots de métriques visibles pour l'utilisateur courant.
 * Tout utilisateur Scout ne reçoit aucun lot marqué `exclude_scouts = true`.
 */
export function filterVisibleMetricSetsForUser(
  sets: MetricSet[],
  systemRole?: string | null,
  jobTitle?: string | null
): MetricSet[] {
  if (!Array.isArray(sets)) return [];
  if (isUserBlockedFromCustomMetricSets(systemRole, jobTitle)) {
    return sets.filter(s => !s.exclude_scouts);
  }
  return sets;
}

/**
 * Génère un code slug unique pour un nouveau lot de métriques sans jamais entrer en conflit
 * avec le référentiel Scouting verrouillé.
 */
export function slugifyMetricSetCode(name: string, existingCodes: string[] = []): string {
  const base = (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);

  const safeBase =
    !base || base === 'scouting' || base === 'metric_positions'
      ? `custom_lot_${base || 'metrics'}`
      : base;

  const existingSet = new Set(existingCodes.map(c => c.toLowerCase()));
  if (!existingSet.has(safeBase)) return safeBase;

  let suffix = 2;
  while (existingSet.has(`${safeBase}_${suffix}`)) {
    suffix += 1;
  }
  return `${safeBase}_${suffix}`;
}

/**
 * Nettoie et normalise la structure JSONB des 4 piliers avant persistance.
 */
export function sanitizeCriteriaPayload(
  raw?: Partial<MetricCriteriaByPillar> | null
): MetricCriteriaByPillar {
  const cleanList = (items?: unknown): string[] => {
    if (!Array.isArray(items)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of items) {
      if (typeof item !== 'string') continue;
      const trimmed = item.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(trimmed);
      }
    }
    return out;
  };

  return {
    technique: cleanList(raw?.technique),
    tactique: cleanList(raw?.tactique),
    physique: cleanList(raw?.physique),
    mental: cleanList(raw?.mental),
  };
}

/**
 * Construit les lignes initiales de postes pour un lot nouvellement créé selon le modèle choisi.
 */
export function buildPositionSeedRowsForSet(
  metricSetId: string,
  templateMode: MetricSetTemplateMode
): Array<Omit<MetricSetPosition, 'id'>> {
  if (templateMode === 'blank') return [];

  return PLAYER_PERFORMANCE_PRESET_POSITIONS.map(seed => ({
    metric_set_id: metricSetId,
    code: seed.code,
    name: seed.name,
    emoji: seed.emoji,
    category: seed.category,
    sort_order: seed.sort_order,
    criteria:
      templateMode === 'positions_only'
        ? { technique: [], tactique: [], physique: [], mental: [] }
        : sanitizeCriteriaPayload(seed.criteria),
  }));
}

export function getDefaultMetricSetsCacheSeed(): {
  sets: MetricSet[];
  positions: MetricSetPosition[];
} {
  const positions: MetricSetPosition[] = PLAYER_PERFORMANCE_PRESET_POSITIONS.map(seed => ({
    id: `local_${DEFAULT_PLAYER_PERFORMANCE_SET_ID}_${seed.code}`,
    metric_set_id: DEFAULT_PLAYER_PERFORMANCE_SET_ID,
    code: seed.code,
    name: seed.name,
    emoji: seed.emoji,
    category: seed.category,
    sort_order: seed.sort_order,
    criteria: sanitizeCriteriaPayload(seed.criteria),
  }));

  return {
    sets: [{ ...DEFAULT_PLAYER_PERFORMANCE_SET }],
    positions,
  };
}

export interface PillarScoreSummary {
  technique: number;
  tactique: number;
  physique: number;
  mental: number;
  global: number;
  ratedCriteriaCount: number;
  totalCriteriaCount: number;
}

/**
 * Sélectionne le lot dynamique le plus pertinent pour une rubrique ('match' ou 'training').
 */
export function resolveMetricSetForRubric(
  sets: MetricSet[],
  rubric: 'match' | 'training'
): MetricSet | null {
  const active = (sets || []).filter(s => s.is_active !== false);
  if (active.length === 0) return null;

  const preferredScope: MetricSetScope =
    rubric === 'match' ? 'match_performance' : 'training_performance';

  return (
    active.find(s => s.scope === preferredScope) ||
    active.find(s => s.scope === 'player_performance') ||
    active[0] ||
    null
  );
}

/**
 * Fait correspondre le poste texte d'un joueur (ex: 'Gardien', 'Latéral droit', 'CM', 'FW')
 * avec le poste le plus proche dans un lot dynamique.
 */
export function resolveMetricSetPositionForPlayer(
  positions: MetricSetPosition[],
  playerPosition?: string | null
): MetricSetPosition | null {
  if (!Array.isArray(positions) || positions.length === 0) return null;
  if (!playerPosition || !playerPosition.trim()) {
    return positions.find(p => p.code.toUpperCase() === 'CM') || positions[0];
  }

  const raw = playerPosition.trim();
  const upper = raw.toUpperCase();
  const lower = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 1. Exact code or name match
  const exact = positions.find(
    p =>
      p.code.toUpperCase() === upper ||
      p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === lower
  );
  if (exact) return exact;

  // 2. Semantic / French synonym resolution
  const aliasRules: Array<{ test: () => boolean; candidateCodes: string[]; fallbackCategory: MetricPositionCategory }> = [
    {
      test: () => upper === 'GK' || lower.includes('gardien'),
      candidateCodes: ['GK'],
      fallbackCategory: 'GK',
    },
    {
      test: () => upper === 'RB' || upper === 'DD' || (lower.includes('droit') && (lower.includes('lateral') || lower.includes('arriere'))),
      candidateCodes: ['RB', 'CB'],
      fallbackCategory: 'DF',
    },
    {
      test: () => upper === 'LB' || upper === 'DG' || (lower.includes('gauche') && (lower.includes('lateral') || lower.includes('arriere'))),
      candidateCodes: ['LB', 'CB'],
      fallbackCategory: 'DF',
    },
    {
      test: () => upper === 'CB' || upper === 'DC' || upper === 'DF' || lower.includes('defenseur') || lower.includes('central'),
      candidateCodes: ['CB', 'RB', 'LB'],
      fallbackCategory: 'DF',
    },
    {
      test: () => upper === 'CDM' || upper === '6' || (lower.includes('milieu') && (lower.includes('defensif') || lower.includes('sentinelle'))),
      candidateCodes: ['CDM', 'CM'],
      fallbackCategory: 'MF',
    },
    {
      test: () => upper === 'CAM' || upper === '10' || (lower.includes('milieu') && lower.includes('offensif')) || lower.includes('meneur'),
      candidateCodes: ['CAM', 'CM'],
      fallbackCategory: 'MF',
    },
    {
      test: () => upper === 'CM' || upper === 'MF' || upper === '8' || lower.includes('milieu') || lower.includes('relayeur'),
      candidateCodes: ['CM', 'CDM', 'CAM'],
      fallbackCategory: 'MF',
    },
    {
      test: () => upper === 'RW' || upper === 'AD' || (lower.includes('ailier') && lower.includes('droit')),
      candidateCodes: ['RW', 'ST'],
      fallbackCategory: 'FW',
    },
    {
      test: () => upper === 'LW' || upper === 'AG' || (lower.includes('ailier') && lower.includes('gauche')),
      candidateCodes: ['LW', 'ST'],
      fallbackCategory: 'FW',
    },
    {
      test: () => upper === 'ST' || upper === 'CF' || upper === 'FW' || upper === '9' || lower.includes('attaquant') || lower.includes('avant') || lower.includes('buteur') || lower.includes('ailier'),
      candidateCodes: ['ST', 'RW', 'LW'],
      fallbackCategory: 'FW',
    },
  ];

  for (const rule of aliasRules) {
    if (rule.test()) {
      for (const code of rule.candidateCodes) {
        const hit = positions.find(p => p.code.toUpperCase().startsWith(code));
        if (hit) return hit;
      }
      const catHit = positions.find(p => p.category === rule.fallbackCategory);
      if (catHit) return catHit;
    }
  }

  return positions.find(p => p.code.toUpperCase() === 'CM') || positions[0];
}

/**
 * Calcule automatiquement les moyennes des 4 piliers et la note globale (/10)
 * à partir des scores saisis par critère du lot actif.
 */
export function computePillarAveragesFromCriteria(
  position: MetricSetPosition | null,
  criteriaScores: Record<string, number>,
  fallbackScores?: Partial<Record<MetricPillar, number>>
): PillarScoreSummary {
  const pillars: MetricPillar[] = ['technique', 'tactique', 'physique', 'mental'];
  const averages: Record<MetricPillar, number> = {
    technique: fallbackScores?.technique ?? 7,
    tactique: fallbackScores?.tactique ?? 7,
    physique: fallbackScores?.physique ?? 7,
    mental: fallbackScores?.mental ?? 7,
  };

  let ratedCriteriaCount = 0;
  let totalCriteriaCount = 0;

  for (const pillar of pillars) {
    const list = position?.criteria?.[pillar] || [];
    totalCriteriaCount += list.length;

    const scoredValues: number[] = [];
    for (const crit of list) {
      const scopedKey = `${pillar}:${crit}`;
      const rawVal = criteriaScores[scopedKey] ?? criteriaScores[crit];
      if (typeof rawVal === 'number' && Number.isFinite(rawVal) && rawVal > 0) {
        scoredValues.push(Math.min(10, Math.max(1, rawVal)));
      }
    }

    if (scoredValues.length > 0) {
      ratedCriteriaCount += scoredValues.length;
      const avg = scoredValues.reduce((sum, v) => sum + v, 0) / scoredValues.length;
      averages[pillar] = Number(avg.toFixed(1));
    }
  }

  const global = Number(
    ((averages.technique + averages.tactique + averages.physique + averages.mental) / 4).toFixed(1)
  );

  return {
    technique: averages.technique,
    tactique: averages.tactique,
    physique: averages.physique,
    mental: averages.mental,
    global,
    ratedCriteriaCount,
    totalCriteriaCount,
  };
}

/**
 * Formate `match_players.rating_comment` de façon rétrocompatible avec OfficialShortlistPage
 * (`Tech: X | Tact: Y | Phys: Z | Ment: W`).
 */
export function formatMatchEvaluationComment(
  textComment: string,
  pillars?: { technique: number; tactique: number; physique: number; mental: number } | null,
  setName?: string | null,
  positionCode?: string | null
): string {
  const cleanNote = (textComment || '').trim();
  if (!pillars) return cleanNote;

  const headerParts: string[] = [];
  if (setName?.trim()) {
    headerParts.push(`Lot: ${setName.trim()}${positionCode ? ` (${positionCode})` : ''}`);
  }
  const pillarTag = `[Tech: ${pillars.technique.toFixed(1)} | Tact: ${pillars.tactique.toFixed(1)} | Phys: ${pillars.physique.toFixed(1)} | Ment: ${pillars.mental.toFixed(1)}${
    headerParts.length ? ` | ${headerParts[0]}` : ''
  }]`;

  return cleanNote ? `${cleanNote}\n${pillarTag}` : pillarTag;
}

/**
 * Extrait le commentaire libre et les 4 piliers éventuels depuis `rating_comment`.
 */
export function parseMatchEvaluationComment(comment?: string | null): {
  textComment: string;
  setName?: string;
  positionCode?: string;
  pillars?: { technique: number; tactique: number; physique: number; mental: number };
} {
  const raw = (comment || '').trim();
  if (!raw) return { textComment: '' };

  const bracketMatch = raw.match(/\[Tech:\s*([0-9.]+)\s*\|\s*Tact:\s*([0-9.]+)\s*\|\s*Phys:\s*([0-9.]+)\s*\|\s*Ment:\s*([0-9.]+)(?:\s*\|\s*Lot:\s*([^\]]+))?\]/i);
  if (!bracketMatch) {
    return { textComment: raw };
  }

  const lotRaw = bracketMatch[5]?.trim();
  let setName: string | undefined;
  let positionCode: string | undefined;
  if (lotRaw) {
    const posMatch = lotRaw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (posMatch) {
      setName = posMatch[1].trim();
      positionCode = posMatch[2].trim();
    } else {
      setName = lotRaw;
    }
  }

  const textComment = raw.replace(bracketMatch[0], '').trim();
  return {
    textComment,
    setName,
    positionCode,
    pillars: {
      technique: Number(bracketMatch[1]),
      tactique: Number(bracketMatch[2]),
      physique: Number(bracketMatch[3]),
      mental: Number(bracketMatch[4]),
    },
  };
}


