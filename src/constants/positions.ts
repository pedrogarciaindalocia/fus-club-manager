/**
 * Source unique de vérité pour les Postes des Joueurs (FUS Analytics)
 *
 * Postes standardisés :
 * GK  — Gardien
 * CB  — Défenseur central
 * LB  — Arrière gauche
 * RB  — Arrière droit
 * CDM — Milieu défensif
 * CM  — Milieu central
 * CAM — Milieu offensif
 * LW  — Ailier gauche
 * RW  — Ailier droit
 * SS  — Second attaquant
 * ST  — Avant-centre
 */

export interface PlayerPosition {
  code: 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'SS' | 'ST';
  label: string;
  category: 'GK' | 'DF' | 'MF' | 'FW';
  categoryLabel: string;
  badgeBg: string;
}

export const PLAYER_POSITIONS: readonly PlayerPosition[] = [
  { code: 'GK',  label: 'Gardien',           category: 'GK', categoryLabel: 'Gardiens',    badgeBg: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  { code: 'CB',  label: 'Défenseur central', category: 'DF', categoryLabel: 'Défenseurs',   badgeBg: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
  { code: 'LB',  label: 'Arrière gauche',    category: 'DF', categoryLabel: 'Défenseurs',   badgeBg: 'bg-sky-500/15 text-sky-500 border-sky-500/30' },
  { code: 'RB',  label: 'Arrière droit',     category: 'DF', categoryLabel: 'Défenseurs',   badgeBg: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30' },
  { code: 'CDM', label: 'Milieu défensif',   category: 'MF', categoryLabel: 'Milieux',      badgeBg: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  { code: 'CM',  label: 'Milieu central',    category: 'MF', categoryLabel: 'Milieux',      badgeBg: 'bg-teal-500/15 text-teal-500 border-teal-500/30' },
  { code: 'CAM', label: 'Milieu offensif',   category: 'MF', categoryLabel: 'Milieux',      badgeBg: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30' },
  { code: 'LW',  label: 'Ailier gauche',     category: 'FW', categoryLabel: 'Attaquants',   badgeBg: 'bg-purple-500/15 text-purple-500 border-purple-500/30' },
  { code: 'RW',  label: 'Ailier droit',      category: 'FW', categoryLabel: 'Attaquants',   badgeBg: 'bg-pink-500/15 text-pink-500 border-pink-500/30' },
  { code: 'SS',  label: 'Second attaquant',  category: 'FW', categoryLabel: 'Attaquants',   badgeBg: 'bg-orange-500/15 text-orange-500 border-orange-500/30' },
  { code: 'ST',  label: 'Avant-centre',      category: 'FW', categoryLabel: 'Attaquants',   badgeBg: 'bg-rose-500/15 text-rose-500 border-rose-500/30' },
] as const;

export type PlayerPositionCode = typeof PLAYER_POSITIONS[number]['code'];

/**
 * Retourne les métadonnées complètes d'un poste à partir de n'importe quel code ou libellé.
 */
export const getPositionDetails = (rawPos?: string | null) => {
  if (!rawPos) {
    return {
      code: 'J',
      label: 'Joueur',
      category: 'MF' as const,
      badgeBg: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
      short: 'J',
    };
  }

  const clean = rawPos.trim().toUpperCase();
  const codeCandidate = clean.split('—')[0].split('-')[0].trim();

  // Correspondance directe par code (ex: GK, CB, CDM, ST) ou format standardisé (LW — Ailier gauche)
  const found = PLAYER_POSITIONS.find(p => p.code === clean || p.code === codeCandidate);
  if (found) {
    return {
      code: found.code,
      label: found.label,
      category: found.category,
      badgeBg: found.badgeBg,
      short: found.code,
    };
  }

  // Correspondance avec libellés français et abréviations alternatives
  const lower = rawPos.toLowerCase();
  if (lower.includes('gardien') || clean === 'G' || clean === 'GB') {
    return { code: 'GK', label: 'Gardien', category: 'GK' as const, badgeBg: 'bg-amber-500/15 text-amber-500 border-amber-500/30', short: 'GK' };
  }
  if (lower.includes('central') || clean === 'DC') {
    return { code: 'CB', label: 'Défenseur central', category: 'DF' as const, badgeBg: 'bg-blue-500/15 text-blue-500 border-blue-500/30', short: 'CB' };
  }
  if (lower.includes('gauche') && (lower.includes('arrière') || lower.includes('latéral') || clean === 'DG' || clean === 'LB')) {
    return { code: 'LB', label: 'Arrière gauche', category: 'DF' as const, badgeBg: 'bg-sky-500/15 text-sky-500 border-sky-500/30', short: 'LB' };
  }
  if (lower.includes('droit') && (lower.includes('arrière') || lower.includes('latéral') || clean === 'DD' || clean === 'RB')) {
    return { code: 'RB', label: 'Arrière droit', category: 'DF' as const, badgeBg: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30', short: 'RB' };
  }
  if (clean === 'DF' || lower.includes('défenseur')) {
    return { code: 'DF', label: 'Défenseur', category: 'DF' as const, badgeBg: 'bg-blue-500/15 text-blue-500 border-blue-500/30', short: 'DF' };
  }
  if (lower.includes('défensif') || clean === 'DM' || clean === 'MDC') {
    return { code: 'CDM', label: 'Milieu défensif', category: 'MF' as const, badgeBg: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30', short: 'CDM' };
  }
  if (lower.includes('offensif') || clean === 'AM' || clean === 'MOC') {
    return { code: 'CAM', label: 'Milieu offensif', category: 'MF' as const, badgeBg: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30', short: 'CAM' };
  }
  if (clean === 'MF' || lower.includes('milieu') || clean === 'MC') {
    return { code: 'CM', label: 'Milieu central', category: 'MF' as const, badgeBg: 'bg-teal-500/15 text-teal-500 border-teal-500/30', short: 'CM' };
  }
  if (lower.includes('ailier') && (lower.includes('gauche') || clean === 'AG')) {
    return { code: 'LW', label: 'Ailier gauche', category: 'FW' as const, badgeBg: 'bg-purple-500/15 text-purple-500 border-purple-500/30', short: 'LW' };
  }
  if (lower.includes('ailier') && (lower.includes('droit') || clean === 'AD')) {
    return { code: 'RW', label: 'Ailier droit', category: 'FW' as const, badgeBg: 'bg-pink-500/15 text-pink-500 border-pink-500/30', short: 'RW' };
  }
  if (lower.includes('second') || clean === 'SS' || clean === 'AT') {
    return { code: 'SS', label: 'Second attaquant', category: 'FW' as const, badgeBg: 'bg-orange-500/15 text-orange-500 border-orange-500/30', short: 'SS' };
  }
  if (lower.includes('centre') || lower.includes('buteur') || clean === 'BU' || clean === 'CF') {
    return { code: 'ST', label: 'Avant-centre', category: 'FW' as const, badgeBg: 'bg-rose-500/15 text-rose-500 border-rose-500/30', short: 'ST' };
  }
  if (clean === 'FW' || lower.includes('attaquant')) {
    return { code: 'ST', label: 'Attaquant', category: 'FW' as const, badgeBg: 'bg-rose-500/15 text-rose-500 border-rose-500/30', short: 'FW' };
  }

  return {
    code: clean,
    label: rawPos,
    category: 'MF' as const,
    badgeBg: 'bg-primary/15 text-primary border-primary/30',
    short: clean,
  };
};

/**
 * Options unifiées et standardisées de postes pour tous les formulaires du dashboard :
 * "CODE — Libellé"
 */
export const UNIFIED_POSITION_OPTIONS = PLAYER_POSITIONS.map(p => ({
  code: p.code,
  label: p.label,
  full: `${p.code} — ${p.label}`,
  value: `${p.code} — ${p.label}`,
  category: p.category,
  categoryLabel: p.categoryLabel,
  badgeBg: p.badgeBg,
}));

export const UNIFIED_POSITION_STRINGS = UNIFIED_POSITION_OPTIONS.map(p => p.full);

/**
 * Formate n'importe quel code ou libellé de poste en format standard unifié "CODE — Libellé".
 * Ex: "LW" ou "Ailier gauche" -> "LW — Ailier gauche"
 */
export const formatUnifiedPosition = (rawPos?: string | null): string => {
  if (!rawPos) return 'ST — Avant-centre';
  // Si déjà sous le format exact
  const exact = UNIFIED_POSITION_OPTIONS.find(p => p.full.toLowerCase() === rawPos.trim().toLowerCase());
  if (exact) return exact.full;

  // Sinon résolution via getPositionDetails
  const details = getPositionDetails(rawPos);
  const found = UNIFIED_POSITION_OPTIONS.find(p => p.code === details.code);
  return found ? found.full : (rawPos.trim() || 'ST — Avant-centre');
};

/**
 * Vérifie si le poste d'un joueur correspond au filtre sélectionné (filtre par code ou par catégorie).
 */
export const matchesPositionFilter = (playerPos?: string | null, filter: string = 'ALL'): boolean => {
  if (filter === 'ALL' || !filter) return true;
  if (!playerPos) return false;
  const upperFilter = filter.toUpperCase();
  const details = getPositionDetails(playerPos);
  if (upperFilter === details.code || upperFilter === playerPos.toUpperCase()) return true;
  if (upperFilter === details.category) return true;
  return false;
};

