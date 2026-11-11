/**
 * Rang numérique des catégories d'âge (U7 -> 7, U14 -> 14, U17 -> 17, U18 -> 18, SENIOR -> 30, PRO -> 40)
 * Extraction universelle dynamique par regex insensible à la casse.
 */
export function getCategoryRank(cat?: string | null): number {
  if (!cat) return 0;
  const upper = cat.trim().toUpperCase();
  const numMatch = upper.match(/U[-_]?(\d+)/i);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }
  if (upper.includes('SENIOR')) return 30;
  if (upper.includes('PRO')) return 40;
  return 0;
}

export function isHigherCategory(current: string, target: string): boolean {
  const currentRank = getCategoryRank(current);
  const targetRank = getCategoryRank(target);
  return currentRank > 0 && targetRank > 0 && targetRank > currentRank;
}

export function isLowerCategory(current: string, target: string): boolean {
  const currentRank = getCategoryRank(current);
  const targetRank = getCategoryRank(target);
  return currentRank > 0 && targetRank > 0 && targetRank < currentRank;
}

export type MobilityType = 'surclassement' | 'sous_classement';

export function getMobilityType(current: string, target: string): MobilityType {
  const origRank = getCategoryRank(current);
  const targetRank = getCategoryRank(target);
  return targetRank < origRank ? 'sous_classement' : 'surclassement';
}

/**
 * Ordre croissant dynamique des catégories — Proxy rétro-compatible pour tout accès CATEGORY_ORDER[cat]
 */
export const CATEGORY_ORDER: Record<string, number> = new Proxy(
  {
    U7: 7, U8: 8, U9: 9, U10: 10, U11: 11, U12: 12, U13: 13,
    U14: 14, U15: 15, U16: 16, U17: 17, U18: 18, U19: 19,
    U20: 20, U21: 21, U22: 22, U23: 23, SENIOR: 30, PRO: 40,
  },
  {
    get(target, prop: string) {
      if (typeof prop === 'string') {
        const rank = getCategoryRank(prop);
        if (rank > 0) return rank;
      }
      return (target as any)[prop] ?? 0;
    },
  }
);

