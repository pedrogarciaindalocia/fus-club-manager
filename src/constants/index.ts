export const MATCH_STATUS = {
  PLANNED: 'planned',
  ONGOING: 'ongoing',
  FINISHED: 'finished',
  CANCELLED: 'cancelled',
} as const;

export const MATCH_TRACKING_STATUS = {
  PLANNED: 'planned',
  ONGOING: 'ongoing',
  FINISHED: 'finished',
  VALIDATED: 'validated',
} as const;

export const PLAYER_CATEGORIES = [
  'U23',
  'U22',
  'U21',
  'U20',
  'U19',
  'U18',
  'U17',
  'U16',
  'U15',
  'U14',
  'U13',
] as const;

export const UNIFIED_AGE_CATEGORIES = PLAYER_CATEGORIES;
export type AgeCategoryCode = typeof PLAYER_CATEGORIES[number];

/**
 * Normalise n'importe quelle catégorie (ex: 'Senior', 'U21 / Espoirs', 'u19')
 * vers le code officiel FUS standardisé.
 */
export const normalizeAgeCategory = (rawCat?: string | null): string => {
  if (!rawCat) return 'U23'; // Default to highest category if empty
  const clean = rawCat.trim().toUpperCase();
  if (clean.includes('23')) return 'U23';
  if (clean.includes('22')) return 'U22';
  if (clean.includes('21') || clean.includes('ESPOIR')) return 'U21';
  if (clean.includes('20')) return 'U20';
  if (clean.includes('19')) return 'U19';
  if (clean.includes('18')) return 'U18';
  if (clean.includes('17')) return 'U17';
  if (clean.includes('16')) return 'U16';
  if (clean.includes('15')) return 'U15';
  if (clean.includes('14')) return 'U14';
  if (clean.includes('13')) return 'U13';
  return clean;
};

export const MATCH_EVENT_TYPES = {
  KICKOFF: 'kickoff',
  HALFTIME: 'halftime',
  FULLTIME: 'fulltime',
  GOAL: 'goal',
  OWN_GOAL: 'own_goal',
  ASSIST: 'assist',
  YELLOW_CARD: 'yellow_card',
  RED_CARD: 'red_card',
  SUBSTITUTION: 'substitution',
  PENALTY_SCORED: 'penalty_scored',
  PENALTY_MISSED: 'penalty_missed',
  INJURY: 'injury',
  SHOT: 'shot',
  VAR: 'var',
} as const;

export const PITCH_DESIGNS = ['classic', 'modern', 'minimal', 'striped'] as const;

export const PREFERRED_FOOT = ['Left', 'Right', 'Both'] as const;

export const FOOT_OPTIONS = [
  { value: 'Droit', label: 'Droitier (Droit)' },
  { value: 'Gauche', label: 'Gaucher (Gauche)' },
  { value: 'Ambidextre', label: 'Ambidextre (Les deux)' },
];

export const NATIONALITIES = [
  'Maroc',
  'Algérie',
  'Tunisie',
  'Égypte',
  'Sénégal',
  'Côte d\'Ivoire',
  'Cameroun',
  'Mali',
  'Burkina Faso',
  'Ghana',
  'Nigéria',
  'RDC',
  'France',
  'Espagne',
  'Portugal',
  'Italie',
  'Belgique',
  'Pays-Bas',
  'Allemagne',
  'Brésil',
  'Argentine',
  'Uruguay',
  'Autre',
] as const;

export * from './positions';
