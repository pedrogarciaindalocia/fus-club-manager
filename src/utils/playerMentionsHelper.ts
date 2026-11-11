import { normalizeAgeCategory } from '../constants';
import { getCategoryRank } from './categoryRank';

function safeNormalizeCategory(cat?: string | null): string {
  if (!cat || !cat.trim()) return '';
  const upper = cat.trim().toUpperCase();
  if (upper === 'ALL' || upper === 'ALL_ELIGIBLE') return upper;
  return normalizeAgeCategory(upper);
}

export interface OfficialSavedShortlistConfig {
  id: string;
  title: string;
  category_filter: string;
  formation_key: string;
  candidate_ids: string[];
  custom_slot_order: Record<string, number>;
  manager_notes?: string;
  shortlist_scope?: 'official';
  created_at: string;
  updated_at: string;
}

export type MentionLevel = 'faible' | 'moyen' | 'assez_bien' | 'tres_bien' | 'top';

export interface MentionMeta {
  id: MentionLevel;
  label: string;
  shortLabel: string;
  score: 1 | 2 | 3 | 4 | 5;
  hex: string;
  badgeClass: string;
  activeButtonClass: string;
  pillClass: string;
}

export interface PlayerMentionEntry {
  id: string;
  club_id?: string;
  player_id: string;
  mention: MentionLevel;
  mention_score: number;
  mention_date: string; // YYYY-MM-DD
  comment?: string;
  source?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MentionTimelinePoint {
  id: string;
  mention_date: string;
  dateLabel: string;
  fullDateLabel: string;
  mention: MentionLevel;
  label: string;
  score: number;
  hex: string;
  comment: string;
}

export const MENTION_OPTIONS: MentionMeta[] = [
  {
    id: 'faible',
    label: 'Faible',
    shortLabel: 'Faible',
    score: 1,
    hex: '#ef4444',
    badgeClass: 'bg-red-600 text-white border-red-400',
    activeButtonClass: 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/25 ring-2 ring-red-400/50',
    pillClass: 'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-300',
  },
  {
    id: 'moyen',
    label: 'Moyen',
    shortLabel: 'Moyen',
    score: 2,
    hex: '#f97316',
    badgeClass: 'bg-orange-500 text-white border-orange-300',
    activeButtonClass: 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/25 ring-2 ring-orange-400/50',
    pillClass: 'bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300',
  },
  {
    id: 'assez_bien',
    label: 'Assez bien',
    shortLabel: 'Assez bien',
    score: 3,
    hex: '#eab308',
    badgeClass: 'bg-amber-400 text-slate-950 border-amber-200',
    activeButtonClass: 'bg-amber-400 text-slate-950 border-amber-400 shadow-lg shadow-amber-400/25 ring-2 ring-amber-300/60',
    pillClass: 'bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300',
  },
  {
    id: 'tres_bien',
    label: 'Très bien',
    shortLabel: 'Très bien',
    score: 4,
    hex: '#10b981',
    badgeClass: 'bg-emerald-500 text-white border-emerald-300',
    activeButtonClass: 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-400/50',
    pillClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300',
  },
  {
    id: 'top',
    label: 'Top',
    shortLabel: 'Top',
    score: 5,
    hex: '#0284c7',
    badgeClass: 'bg-sky-500 text-white border-sky-300',
    activeButtonClass: 'bg-sky-600 text-white border-sky-600 shadow-lg shadow-sky-600/25 ring-2 ring-sky-400/50',
    pillClass: 'bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-300',
  },
];

const MENTION_BY_ID = new Map<MentionLevel, MentionMeta>(MENTION_OPTIONS.map(m => [m.id, m]));
const MENTION_BY_SCORE = new Map<number, MentionMeta>(MENTION_OPTIONS.map(m => [m.score, m]));

export function getMentionMeta(mention?: string | null): MentionMeta {
  const normalized = (mention || '').trim().toLowerCase() as MentionLevel;
  return MENTION_BY_ID.get(normalized) || MENTION_OPTIONS[1];
}

export function getMentionByScore(score?: number | null): MentionMeta {
  const rounded = Math.min(5, Math.max(1, Math.round(Number(score) || 2)));
  return MENTION_BY_SCORE.get(rounded) || MENTION_OPTIONS[1];
}

export function normalizeMentionDate(dateInput?: string | null): string {
  const trimmed = (dateInput || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  return new Date().toISOString().split('T')[0];
}

function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}`;
}

function formatFullDateFr(isoDate: string): string {
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Construit les points chronologiques pour la courbe des mentions (triés du plus ancien au plus récent,
 * dédupliqués par date en gardant la saisie la plus récente).
 */
export function buildMentionTimelinePoints(mentions: PlayerMentionEntry[]): MentionTimelinePoint[] {
  const byDate = new Map<string, PlayerMentionEntry>();

  mentions.forEach(entry => {
    const dateKey = normalizeMentionDate(entry.mention_date);
    const existing = byDate.get(dateKey);
    if (!existing) {
      byDate.set(dateKey, { ...entry, mention_date: dateKey });
      return;
    }
    const existingTs = new Date(existing.updated_at || existing.created_at || 0).getTime();
    const currentTs = new Date(entry.updated_at || entry.created_at || 0).getTime();
    if (currentTs >= existingTs) {
      byDate.set(dateKey, { ...entry, mention_date: dateKey });
    }
  });

  return Array.from(byDate.values())
    .sort((a, b) => a.mention_date.localeCompare(b.mention_date))
    .map(entry => {
      const meta = entry.mention ? getMentionMeta(entry.mention) : getMentionByScore(entry.mention_score);
      return {
        id: entry.id,
        mention_date: entry.mention_date,
        dateLabel: formatShortDate(entry.mention_date),
        fullDateLabel: formatFullDateFr(entry.mention_date),
        mention: meta.id,
        label: meta.label,
        score: meta.score,
        hex: meta.hex,
        comment: entry.comment || '',
      };
    });
}

/**
 * Retourne la mention la plus récente d'un joueur (par mention_date DESC puis updated_at DESC).
 */
export function getLatestMention(mentions: PlayerMentionEntry[]): PlayerMentionEntry | null {
  if (!mentions.length) return null;
  const sorted = [...mentions].sort((a, b) => {
    const dateCmp = normalizeMentionDate(b.mention_date).localeCompare(normalizeMentionDate(a.mention_date));
    if (dateCmp !== 0) return dateCmp;
    const tsB = new Date(b.updated_at || b.created_at || 0).getTime();
    const tsA = new Date(a.updated_at || a.created_at || 0).getTime();
    return tsB - tsA;
  });
  return sorted[0];
}

export const ORDERED_CLUB_CATEGORIES = [
  'PRO',
  'SENIOR',
  'U23',
  'U21',
  'U19',
  'U18',
  'U17',
  'U16',
  'U15',
  'U14',
  'U13',
  'U11',
  'U9',
  'U7',
] as const;

/**
 * Retourne les catégories natives autorisées dans la liste déroulante de droite
 * pour constituer une catégorie cible avec surclassement :
 * ex. pour 'U16' -> ['U16', 'U15', 'U14', 'U13', 'U11', 'U9', 'U7'].
 */
export function getEligibleSourceCategories(
  targetCategory: string,
  allCategories: readonly string[] = ORDERED_CLUB_CATEGORIES
): string[] {
  const cleanCategories = allCategories
    .map(c => safeNormalizeCategory(c))
    .filter(c => c && c !== 'ALL');

  const normTarget = safeNormalizeCategory(targetCategory);
  if (!normTarget || normTarget === 'ALL') {
    return Array.from(new Set(cleanCategories)).sort((a, b) => getCategoryRank(b) - getCategoryRank(a));
  }

  const targetRank = getCategoryRank(normTarget);
  if (targetRank <= 0) return [normTarget];

  const eligible = cleanCategories.filter(cat => {
    const rank = getCategoryRank(cat);
    return rank > 0 && rank <= targetRank;
  });

  if (!eligible.includes(normTarget)) {
    eligible.unshift(normTarget);
  }

  return Array.from(new Set(eligible)).sort((a, b) => getCategoryRank(b) - getCategoryRank(a));
}

/**
 * Vérifie si un joueur de catégorie native `playerCategory` correspond à la sélection
 * de la liste déroulante de droite tout en étant éligible à la catégorie cible `targetCategory`.
 */
export function isPlayerEligibleForRightList(
  playerCategory: string | null | undefined,
  targetCategory: string,
  rightNativeCategoryFilter: string // 'ALL_ELIGIBLE' | 'ALL' | 'U16' | 'U15' ...
): boolean {
  const normPlayer = safeNormalizeCategory(playerCategory);
  const normTarget = safeNormalizeCategory(targetCategory || 'ALL');
  const normRight = safeNormalizeCategory(rightNativeCategoryFilter || 'ALL_ELIGIBLE');

  if (normTarget && normTarget !== 'ALL') {
    const targetRank = getCategoryRank(normTarget);
    const playerRank = getCategoryRank(normPlayer);
    if (targetRank > 0 && (playerRank <= 0 || playerRank > targetRank)) {
      return false;
    }
  }

  if (normRight && normRight !== 'ALL' && normRight !== 'ALL_ELIGIBLE') {
    return normPlayer === normRight;
  }

  return true;
}

/**
 * Indique si un joueur joue en surclassement shortlist dans la catégorie cible en cours
 * (sa catégorie native a un rang strictement inférieur à la catégorie cible, ex. U14 < U16).
 */
export function isShortlistSurclassement(
  playerNativeCategory: string | null | undefined,
  targetCategory: string
): boolean {
  const normTarget = safeNormalizeCategory(targetCategory);
  if (!normTarget || normTarget === 'ALL') return false;
  const normPlayer = safeNormalizeCategory(playerNativeCategory);
  if (!normPlayer) return false;
  const playerRank = getCategoryRank(normPlayer);
  const targetRank = getCategoryRank(normTarget);
  return playerRank > 0 && targetRank > 0 && playerRank < targetRank;
}

/**
 * Filtre strictement les shortlists officielles enregistrées en fonction de la catégorie cible choisie.
 */
export function filterOfficialShortlistsByCategory<
  T extends { category_filter?: string | null }
>(shortlists: T[], targetCategory: string): T[] {
  const normTarget = safeNormalizeCategory(targetCategory || 'ALL');
  if (!normTarget || normTarget === 'ALL') {
    return shortlists;
  }
  return shortlists.filter(sl => {
    const normSlCat = safeNormalizeCategory(sl.category_filter);
    return Boolean(normSlCat) && normSlCat === normTarget;
  });
}
