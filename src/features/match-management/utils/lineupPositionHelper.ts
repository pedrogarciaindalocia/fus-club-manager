import { getPositionDetails } from '../../../constants/positions';
import { getFormationPositions } from '../tacticalFormations';

export type CoarseLine = 'GK' | 'DF' | 'MF' | 'FW';

const KNOWN_ROLE_CODES = new Set([
  'GK', 'LB', 'LWB', 'CB', 'RB', 'RWB', 'DF',
  'CDM', 'CM', 'CAM', 'LM', 'RM', 'LAM', 'RAM', 'MF',
  'LW', 'RW', 'ST', 'CF', 'SS', 'FW',
]);

const ALIAS_TO_ROLE: Record<string, string> = {
  '1': 'GK',
  '2': 'RB',
  '3': 'LB',
  '4': 'CB',
  '5': 'CB',
  '6': 'CDM',
  '7': 'RW',
  '8': 'CM',
  '9': 'ST',
  '10': 'CAM',
  '11': 'LW',
  G: 'GK',
  GB: 'GK',
  DG: 'LB',
  DD: 'RB',
  DC: 'CB',
  DLG: 'LWB',
  DLD: 'RWB',
  MDC: 'CDM',
  DM: 'CDM',
  MC: 'CM',
  MOC: 'CAM',
  AM: 'CAM',
  MG: 'LM',
  MD: 'RM',
  AG: 'LW',
  AD: 'RW',
  BU: 'ST',
  AC: 'ST',
  AT: 'SS',
};

const LEFT_SIDE_CODES = new Set(['LB', 'LWB', 'LM', 'LAM', 'LW']);
const RIGHT_SIDE_CODES = new Set(['RB', 'RWB', 'RM', 'RAM', 'RW']);

function normalizeRoleCode(rawToken: string): string {
  const trimmed = rawToken.trim();
  const upper = trimmed.toUpperCase();
  if (!upper) return '';

  if (ALIAS_TO_ROLE[upper]) return ALIAS_TO_ROLE[upper];
  if (KNOWN_ROLE_CODES.has(upper)) return upper;

  const prefixCandidate = upper.split('—')[0].split('-')[0].trim();
  if (ALIAS_TO_ROLE[prefixCandidate]) return ALIAS_TO_ROLE[prefixCandidate];
  if (KNOWN_ROLE_CODES.has(prefixCandidate)) return prefixCandidate;

  const lower = trimmed.toLowerCase();
  if (lower.includes('milieu gauche') || lower.includes('milieu latéral gauche')) return 'LM';
  if (lower.includes('milieu droit') || lower.includes('milieu latéral droit')) return 'RM';
  if (lower.includes('défenseur gauche') || lower.includes('defenseur gauche')) return 'LB';
  if (lower.includes('défenseur droit') || lower.includes('defenseur droit')) return 'RB';

  const details = getPositionDetails(trimmed);
  const code = details.code.toUpperCase();
  if (KNOWN_ROLE_CODES.has(code)) return code;
  if (ALIAS_TO_ROLE[code]) return ALIAS_TO_ROLE[code];
  return '';
}

function getLineFromCode(code: string): CoarseLine {
  if (code === 'GK') return 'GK';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DF'].includes(code)) return 'DF';
  if (['CDM', 'CM', 'CAM', 'LM', 'RM', 'LAM', 'RAM', 'MF'].includes(code)) return 'MF';
  if (['LW', 'RW', 'ST', 'CF', 'SS', 'FW'].includes(code)) return 'FW';
  return 'MF';
}

/**
 * Extrait les codes de postes normalisés (principal puis secondaires) et la ligne de jeu
 * depuis n'importe quel libellé de poste ("LB — Latéral gauche", "CDM / 6", "Défenseur central", etc.).
 */
export function extractPlayerRoleProfile(rawPosition?: string | null): {
  primaryCode: string;
  codes: string[];
  line: CoarseLine;
} {
  if (!rawPosition || typeof rawPosition !== 'string' || !rawPosition.trim()) {
    return { primaryCode: '', codes: [], line: 'MF' };
  }

  const trimmed = rawPosition.trim();
  const rawSegments = trimmed.split(/[/,+]+/).map((s) => s.trim()).filter(Boolean);
  const codes: string[] = [];

  if (rawSegments.length <= 1) {
    const primaryFromFull = normalizeRoleCode(trimmed);
    if (primaryFromFull) codes.push(primaryFromFull);
  }

  for (const seg of rawSegments) {
    const resolved = normalizeRoleCode(seg);
    if (resolved && !codes.includes(resolved)) {
      codes.push(resolved);
    }
    const subTokens = seg.split(/[\s\-—]+/).filter(Boolean);
    for (const tok of subTokens) {
      const upperTok = tok.toUpperCase();
      if (ALIAS_TO_ROLE[upperTok]) {
        const mapped = ALIAS_TO_ROLE[upperTok];
        if (!codes.includes(mapped)) codes.push(mapped);
      } else if (KNOWN_ROLE_CODES.has(upperTok) && !codes.includes(upperTok)) {
        codes.push(upperTok);
      }
    }
  }

  if (codes.length === 0) {
    const fallback = normalizeRoleCode(trimmed);
    if (fallback) codes.push(fallback);
  }

  const primaryCode = codes[0] || '';
  const line = primaryCode
    ? getLineFromCode(primaryCode)
    : (getPositionDetails(trimmed).category as CoarseLine);
  return { primaryCode, codes, line };
}

export function isGoalkeeperPosition(rawPosition?: string | null): boolean {
  const profile = extractPlayerRoleProfile(rawPosition);
  return profile.primaryCode === 'GK' || profile.line === 'GK';
}

function scoreSingleCodeForSlot(playerCode: string, slotCode: string): number {
  if (!playerCode || !slotCode) return 0;

  if (slotCode === 'GK') {
    return playerCode === 'GK' ? 120 : -100;
  }
  if (playerCode === 'GK') {
    return -60;
  }

  if (playerCode === slotCode) return 110;

  // Équivalences directes et couloirs
  if (slotCode === 'LB') {
    if (playerCode === 'LWB') return 95;
    if (playerCode === 'LM') return 75;
    if (playerCode === 'DF') return 65;
    if (playerCode === 'LW') return 42;
  }
  if (slotCode === 'LWB') {
    if (playerCode === 'LB') return 98;
    if (playerCode === 'LM') return 82;
    if (playerCode === 'LW') return 60;
    if (playerCode === 'DF') return 62;
  }
  if (slotCode === 'RB') {
    if (playerCode === 'RWB') return 95;
    if (playerCode === 'RM') return 75;
    if (playerCode === 'DF') return 65;
    if (playerCode === 'RW') return 42;
  }
  if (slotCode === 'RWB') {
    if (playerCode === 'RB') return 98;
    if (playerCode === 'RM') return 82;
    if (playerCode === 'RW') return 60;
    if (playerCode === 'DF') return 62;
  }
  if (slotCode === 'CB') {
    if (playerCode === 'DF') return 82;
    if (playerCode === 'LB' || playerCode === 'RB') return 55;
    if (playerCode === 'CDM') return 35;
  }
  if (slotCode === 'DF') {
    if (playerCode === 'CB') return 90;
    if (playerCode === 'LB' || playerCode === 'RB' || playerCode === 'LWB' || playerCode === 'RWB') return 80;
  }

  if (slotCode === 'CDM') {
    if (playerCode === 'CM') return 76;
    if (playerCode === 'MF') return 65;
    if (playerCode === 'CB') return 32;
    if (playerCode === 'CAM') return 48;
  }
  if (slotCode === 'CM') {
    if (playerCode === 'MF') return 85;
    if (playerCode === 'CDM' || playerCode === 'CAM') return 78;
    if (playerCode === 'LM' || playerCode === 'RM') return 58;
  }
  if (slotCode === 'CAM') {
    if (playerCode === 'LAM' || playerCode === 'RAM') return 85;
    if (playerCode === 'CM') return 76;
    if (playerCode === 'SS') return 74;
    if (playerCode === 'MF') return 65;
    if (playerCode === 'LW' || playerCode === 'RW') return 58;
    if (playerCode === 'CDM') return 48;
  }
  if (slotCode === 'LAM') {
    if (playerCode === 'LW' || playerCode === 'LM') return 92;
    if (playerCode === 'CAM') return 86;
    if (playerCode === 'CM') return 65;
  }
  if (slotCode === 'RAM') {
    if (playerCode === 'RW' || playerCode === 'RM') return 92;
    if (playerCode === 'CAM') return 86;
    if (playerCode === 'CM') return 65;
  }
  if (slotCode === 'LM') {
    if (playerCode === 'LW') return 95;
    if (playerCode === 'LAM') return 88;
    if (playerCode === 'LWB' || playerCode === 'LB') return 72;
    if (playerCode === 'CM' || playerCode === 'MF') return 55;
  }
  if (slotCode === 'RM') {
    if (playerCode === 'RW') return 95;
    if (playerCode === 'RAM') return 88;
    if (playerCode === 'RWB' || playerCode === 'RB') return 72;
    if (playerCode === 'CM' || playerCode === 'MF') return 55;
  }
  if (slotCode === 'MF') {
    if (['CM', 'CDM', 'CAM', 'LM', 'RM'].includes(playerCode)) return 85;
  }

  if (slotCode === 'LW') {
    if (playerCode === 'LM' || playerCode === 'LAM') return 94;
    if (playerCode === 'FW') return 65;
    if (playerCode === 'ST' || playerCode === 'SS' || playerCode === 'CF') return 55;
    if (playerCode === 'CAM') return 52;
    if (playerCode === 'LB' || playerCode === 'LWB') return 40;
  }
  if (slotCode === 'RW') {
    if (playerCode === 'RM' || playerCode === 'RAM') return 94;
    if (playerCode === 'FW') return 65;
    if (playerCode === 'ST' || playerCode === 'SS' || playerCode === 'CF') return 55;
    if (playerCode === 'CAM') return 52;
    if (playerCode === 'RB' || playerCode === 'RWB') return 40;
  }
  if (slotCode === 'ST' || slotCode === 'CF') {
    if (playerCode === 'ST' || playerCode === 'CF') return 105;
    if (playerCode === 'SS') return 96;
    if (playerCode === 'FW') return 88;
    if (playerCode === 'LW' || playerCode === 'RW') return 64;
    if (playerCode === 'CAM') return 56;
  }
  if (slotCode === 'FW') {
    if (['ST', 'CF', 'SS', 'LW', 'RW'].includes(playerCode)) return 85;
  }

  const pLine = getLineFromCode(playerCode);
  const sLine = getLineFromCode(slotCode);

  if (pLine === sLine) {
    // Respecter le côté gauche/droite lors d'un repli dans la même ligne
    if (
      (LEFT_SIDE_CODES.has(playerCode) && RIGHT_SIDE_CODES.has(slotCode)) ||
      (RIGHT_SIDE_CODES.has(playerCode) && LEFT_SIDE_CODES.has(slotCode))
    ) {
      return 34;
    }
    return 44;
  }

  // Lignes adjacentes (MF <-> DF ou MF <-> FW)
  if (
    (pLine === 'MF' && (sLine === 'DF' || sLine === 'FW')) ||
    (sLine === 'MF' && (pLine === 'DF' || pLine === 'FW'))
  ) {
    return 15;
  }

  // Opposé (DF <-> FW)
  return -20;
}

/**
 * Calcule le score d'adéquation entre le poste d'un joueur et un poste cible de la formation.
 */
export function scorePlayerPositionForSlot(
  playerPosition?: string | null,
  slotRoleLabel?: string | null
): number {
  const slotCode = String(slotRoleLabel || '').trim().toUpperCase();
  if (!slotCode) return 0;

  const profile = extractPlayerRoleProfile(playerPosition);
  if (profile.codes.length === 0) {
    return slotCode === 'GK' ? -50 : 0;
  }

  let best = -Infinity;
  profile.codes.forEach((code, idx) => {
    const raw = scoreSingleCodeForSlot(code, slotCode);
    const adjusted = idx === 0 ? raw : raw - 8;
    if (adjusted > best) best = adjusted;
  });

  return best === -Infinity ? 0 : best;
}

/**
 * Indique si le poste d'un joueur correspond bien au rôle tactique demandé (utilisé par les filtres/placements).
 */
export function isPlayerMatchingTacticalSlot(
  playerPosition?: string | null,
  slotRoleLabel?: string | null
): boolean {
  return scorePlayerPositionForSlot(playerPosition, slotRoleLabel) >= 44;
}

/**
 * Algorithme hongrois (Kuhn-Munkres) de couplage maximal pondéré pour N <= 11 postes.
 * Retourne pour chaque joueur i l'indice de poste optimal (0..numSlots-1).
 */
function solveMaxWeightAssignment(weights: number[][]): number[] {
  const nRows = weights.length;
  if (nRows === 0) return [];
  const nCols = weights[0].length;
  const dim = Math.max(nRows, nCols);

  let maxWeight = 0;
  for (let i = 0; i < nRows; i++) {
    for (let j = 0; j < nCols; j++) {
      if (weights[i][j] > maxWeight) maxWeight = weights[i][j];
    }
  }

  const cost: number[][] = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => {
      const w = i < nRows && j < nCols ? weights[i][j] : 0;
      return maxWeight - w;
    })
  );

  const u = new Array(dim + 1).fill(0);
  const v = new Array(dim + 1).fill(0);
  const p = new Array(dim + 1).fill(0);
  const way = new Array(dim + 1).fill(0);

  for (let i = 1; i <= dim; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(dim + 1).fill(Infinity);
    const used = new Array(dim + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;

      for (let j = 1; j <= dim; j++) {
        if (!used[j]) {
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }

      for (let j = 0; j <= dim; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }

      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const assignment = new Array(nRows).fill(-1);
  for (let j = 1; j <= dim; j++) {
    if (p[j] >= 1 && p[j] <= nRows && j - 1 < nCols) {
      assignment[p[j] - 1] = j - 1;
    }
  }
  return assignment;
}

/**
 * Trouve le meilleur emplacement libre dans `currentXI` pour un joueur cliqué en Compo.
 */
export function findBestEmptySlotForPlayer(
  playerPosition: string | null | undefined,
  roles: { label: string }[],
  currentXI: string[],
  format?: number
): number {
  const slotCount = Math.min(roles.length, format || roles.length);
  if (slotCount === 0) return -1;

  if (isGoalkeeperPosition(playerPosition) && (!currentXI[0] || currentXI[0] === '')) {
    return 0;
  }

  let bestSlot = -1;
  let bestScore = -Infinity;

  for (let idx = 1; idx < slotCount; idx++) {
    if (currentXI[idx] && currentXI[idx] !== '') continue;
    const sc = scorePlayerPositionForSlot(playerPosition, roles[idx]?.label);
    if (sc > bestScore) {
      bestScore = sc;
      bestSlot = idx;
    }
  }

  if (bestSlot !== -1) return bestSlot;

  // Dernier recours : slot 0 si encore libre et qu'aucun autre slot n'est disponible
  if (!currentXI[0] || currentXI[0] === '') return 0;
  return -1;
}

/**
 * Aligne un ensemble de titulaires (IDs ou objets) sur les postes exacts d'une formation.
 * Retourne un tableau de longueur `format` avec chaque joueur placé à son poste optimal.
 */
export function alignEntriesToFormation<T>(
  entries: T[],
  formation: string | null | undefined,
  format: number,
  getEntryPosition: (entry: T) => string | null | undefined,
  emptyValue: T
): T[] {
  const roles = getFormationPositions(formation, format);
  const slotCount = Math.min(roles.length, format);
  const result: T[] = Array.from({ length: format }, () => emptyValue);

  const validEntries = entries.filter((e) => Boolean(e) && (typeof e !== 'string' || e.trim() !== '')).slice(0, slotCount);
  if (validEntries.length === 0 || slotCount === 0) return result;

  // Décalage positif (+250) pour garantir que chaque joueur réel soit préféré aux lignes fictives (poids 0)
  const weights: number[][] = validEntries.map((entry) => {
    const pos = getEntryPosition(entry);
    return Array.from({ length: slotCount }, (_, slotIdx) => {
      return 250 + scorePlayerPositionForSlot(pos, roles[slotIdx]?.label);
    });
  });

  const assignedSlots = solveMaxWeightAssignment(weights);
  assignedSlots.forEach((slotIdx, entryIdx) => {
    if (slotIdx >= 0 && slotIdx < format) {
      result[slotIdx] = validEntries[entryIdx];
    }
  });

  return result;
}

/**
 * Résout la composition à afficher sur le terrain (Overview / Stats) :
 * - Respecte strictement le Drag & Drop manuel (`manualPositions === true` ou compo déjà cohérente).
 * - Corrige automatiquement les compositions désalignées (ex. issues d'imports FRMF ou saisies séquentielles).
 */
export function resolveDisplayLineupEntries<T>(
  rawEntries: T[],
  formation: string | null | undefined,
  format: number,
  getEntryPosition: (entry: T) => string | null | undefined,
  emptyValue: T,
  manualPositions?: boolean
): T[] {
  if (manualPositions) return rawEntries;

  const roles = getFormationPositions(formation, format);
  const padded = Array.from({ length: format }, (_, i) => rawEntries[i] ?? emptyValue);

  const isValidEntry = (e: T) => Boolean(e) && (typeof e !== 'string' || e.trim() !== '');
  const validWithSlots = padded
    .map((entry, idx) => ({ entry, idx, pos: isValidEntry(entry) ? getEntryPosition(entry) : null }))
    .filter((item) => isValidEntry(item.entry));

  if (validWithSlots.length < 2) return rawEntries;

  const knownPosCount = validWithSlots.filter((item) => extractPlayerRoleProfile(item.pos).primaryCode !== '').length;
  if (knownPosCount < 2) return rawEntries;

  const currentScore = validWithSlots.reduce(
    (sum, item) => sum + scorePlayerPositionForSlot(item.pos, roles[item.idx]?.label),
    0
  );

  const aligned = alignEntriesToFormation(
    validWithSlots.map((item) => item.entry),
    formation,
    format,
    getEntryPosition,
    emptyValue
  );

  const alignedScore = aligned.reduce((sum, entry, idx) => {
    if (!isValidEntry(entry)) return sum;
    return sum + scorePlayerPositionForSlot(getEntryPosition(entry), roles[idx]?.label);
  }, 0);

  const hasGKAtWrongSlot = validWithSlots.some(
    (item) => item.idx > 0 && isGoalkeeperPosition(item.pos)
  ) && !isGoalkeeperPosition(validWithSlots.find((item) => item.idx === 0)?.pos);

  const misplacedLineCount = validWithSlots.filter((item) => {
    const profile = extractPlayerRoleProfile(item.pos);
    if (!profile.primaryCode) return false;
    const slotLine = getLineFromCode((roles[item.idx]?.label || '').toUpperCase());
    return profile.line !== slotLine;
  }).length;

  const scoreGain = alignedScore - currentScore;

  if (hasGKAtWrongSlot || misplacedLineCount >= 2 || scoreGain >= 50) {
    return aligned;
  }

  return rawEntries;
}

/**
 * Sélectionne et aligne automatiquement les meilleurs titulaires d'un effectif sur les postes exacts
 * de la formation, puis place les joueurs restants sur le banc si demandé.
 */
export function pickBestLineupFromSquad<T extends { id: string; position?: string | null }>(
  squad: T[],
  formation: string | null | undefined,
  format: number,
  includeBench: boolean = true
): { startingXI: string[]; substitutes: string[] } {
  const roles = getFormationPositions(formation, format);
  const slotCount = Math.min(roles.length, format);
  const startingXI = Array(format).fill('');
  const substitutes: string[] = [];

  if (squad.length === 0 || slotCount === 0) {
    return { startingXI, substitutes };
  }

  const weights: number[][] = squad.map((player) =>
    Array.from({ length: slotCount }, (_, slotIdx) => {
      return 250 + scorePlayerPositionForSlot(player.position, roles[slotIdx]?.label);
    })
  );

  const assignedSlots = solveMaxWeightAssignment(weights);
  const starterIds = new Set<string>();

  assignedSlots.forEach((slotIdx, playerIdx) => {
    const player = squad[playerIdx];
    if (slotIdx >= 0 && slotIdx < slotCount) {
      startingXI[slotIdx] = player.id;
      starterIds.add(player.id);
    }
  });

  if (includeBench) {
    squad.forEach((player) => {
      if (!starterIds.has(player.id)) {
        substitutes.push(player.id);
      }
    });
  }

  return { startingXI, substitutes };
}
