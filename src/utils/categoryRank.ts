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

/**
 * Règle d'éligibilité pour le surclassement / mobilité de match FUS :
 * 1. Cas standard : catégorie cible strictement supérieure (isHigherCategory).
 * 2. EXCEPTION OFFICIELLE FUS : Passerelle bidirectionnelle entre U25 et SENIOR.
 *    - Un joueur U25 peut être surclassé en SENIOR.
 *    - Un joueur SENIOR peut être mobilisé / sous-classé en U25.
 */
export function isEligibleForSurclassement(current?: string | null, target?: string | null): boolean {
  if (!current || !target) return false;
  const c = current.trim().toUpperCase();
  const t = target.trim().toUpperCase();
  if (c === t) return false;

  // Exception FUS : Mobilité fluide bidirectionnelle U25 <-> SENIOR
  const isU25SeniorBridge =
    (c.includes('25') && (t.includes('SENIOR') || t.includes('SR') || t.includes('PRO'))) ||
    ((c.includes('SENIOR') || c.includes('SR')) && t.includes('25'));

  if (isU25SeniorBridge) return true;

  // Règle générale : Catégorie strictement supérieure
  return isHigherCategory(current, target);
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
    U14: 14, U15: 15, U16: 16, U17: 17, U18: 18,
    U21: 21, U25: 25, SENIOR: 30, PRO: 40,
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

