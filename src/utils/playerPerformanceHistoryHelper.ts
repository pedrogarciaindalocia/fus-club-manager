import type { MatchContextKind, PlayerPerformanceEvaluation } from '../services/playerPerformanceService';
import type { Player } from '../types';

export type HistoryContextMode = 'all' | 'date_only' | 'match';
export type HistoryMatchSubType = 'all' | 'friendly' | 'internal';

export interface EnrichedHistoryEvaluation {
  ev: PlayerPerformanceEvaluation;
  player: Player | null;
  contextKind: MatchContextKind;
  matchDisplay: string;
  categoryNorm: string;
}

export interface HistoryFilterCriteria {
  contextMode: HistoryContextMode;
  matchSubType?: HistoryMatchSubType;
  matchIdFilter?: string;
  dateFilter?: string;
  categoryFilter?: string;
  playerIdFilter?: string;
  search?: string;
}

export interface DistinctHistoryPlayer {
  id: string;
  name: string;
  count: number;
}

export interface BuildHistoryEvolutionOptions {
  playerIdFilter?: string;
}

export interface HistoryEvolutionSeriesResult {
  series: PlayerPerformanceEvaluation[];
  isMultiPlayer: boolean;
  uniquePlayersCount: number;
  distinctPlayers: DistinctHistoryPlayer[];
}

function roundToOneDecimal(sum: number, count: number): number {
  if (count <= 0) return 0;
  return Number((sum / count).toFixed(1));
}

/**
 * Filtre les évaluations historiques accessibles en excluant toujours les matchs officiels.
 */
export function filterHistoryEvaluations(
  rows: EnrichedHistoryEvaluation[],
  criteria: HistoryFilterCriteria
): EnrichedHistoryEvaluation[] {
  const normalizedDate = (criteria.dateFilter || '').trim().slice(0, 10);
  const normalizedSearch = (criteria.search || '').trim().toLowerCase();
  const categoryFilter = criteria.categoryFilter || 'ALL';
  const playerIdFilter = criteria.playerIdFilter || 'ALL';
  const matchSubType = criteria.matchSubType || 'all';
  const matchIdFilter = criteria.matchIdFilter || 'ALL';

  return rows.filter(row => {
    // Exclure toujours les matchs officiels (gérés dans la feuille de match officielle)
    if (row.contextKind === 'official') return false;

    if (criteria.contextMode === 'date_only') {
      if (row.contextKind !== 'manual') return false;
    } else if (criteria.contextMode === 'match') {
      if (row.contextKind !== 'friendly' && row.contextKind !== 'internal') return false;
      if (matchSubType !== 'all' && row.contextKind !== matchSubType) return false;
      if (matchIdFilter !== 'ALL' && String(row.ev.match_id || '') !== String(matchIdFilter)) {
        return false;
      }
    }

    if (normalizedDate) {
      const evDate = String(row.ev.evaluation_date || '').slice(0, 10);
      if (evDate !== normalizedDate) return false;
    }

    if (categoryFilter !== 'ALL' && row.categoryNorm !== categoryFilter) {
      return false;
    }

    if (playerIdFilter !== 'ALL' && String(row.ev.player_id) !== String(playerIdFilter)) {
      return false;
    }

    if (normalizedSearch) {
      const haystack = [
        row.player?.full_name || '',
        row.ev.position_code || '',
        row.ev.position_name || '',
        row.matchDisplay || '',
        row.ev.comment || '',
        row.ev.evaluation_date || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }

    return true;
  });
}

/**
 * Compte le nombre d'évaluations par joueur sur les critères actifs hors filtre joueur.
 */
export function countEvaluationsByPlayer(
  rows: EnrichedHistoryEvaluation[],
  criteriaWithoutPlayer?: Partial<Omit<HistoryFilterCriteria, 'playerIdFilter'>>
): Record<string, number> {
  const scoped = filterHistoryEvaluations(rows, {
    contextMode: 'all',
    ...criteriaWithoutPlayer,
    playerIdFilter: 'ALL',
  });

  const counts: Record<string, number> = {};
  for (const row of scoped) {
    const pid = String(row.ev.player_id);
    counts[pid] = (counts[pid] || 0) + 1;
  }
  return counts;
}

/**
 * Construit la série chronologique pour la courbe d'évolution (mode joueur unique ou agrégation multi-joueurs par date).
 */
export function buildHistoryEvolutionSeries(
  filteredRows: EnrichedHistoryEvaluation[],
  options?: BuildHistoryEvolutionOptions
): HistoryEvolutionSeriesResult {
  const sorted = [...filteredRows].sort((a, b) => {
    const dateA = String(a.ev.evaluation_date || '').slice(0, 10);
    const dateB = String(b.ev.evaluation_date || '').slice(0, 10);
    const cmp = dateA.localeCompare(dateB);
    if (cmp !== 0) return cmp;
    return String(a.ev.created_at || '').localeCompare(String(b.ev.created_at || ''));
  });

  const playerStatsMap = new Map<string, DistinctHistoryPlayer>();
  for (const row of sorted) {
    const pid = String(row.ev.player_id);
    const existing = playerStatsMap.get(pid);
    if (existing) {
      existing.count += 1;
    } else {
      playerStatsMap.set(pid, {
        id: pid,
        name: row.player?.full_name?.trim() || 'Joueur',
        count: 1,
      });
    }
  }

  const distinctPlayers = Array.from(playerStatsMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  );
  const uniquePlayersCount = distinctPlayers.length;

  const playerIdFilter = options?.playerIdFilter || 'ALL';
  const isSingleSelected = Boolean(playerIdFilter && playerIdFilter !== 'ALL');
  const isMultiPlayer = !isSingleSelected && uniquePlayersCount > 1;

  if (!isMultiPlayer) {
    const series: PlayerPerformanceEvaluation[] = sorted.map(row => ({
      ...row.ev,
      evaluation_date: String(row.ev.evaluation_date || '').slice(0, 10),
      technique_score: Math.round(Number(row.ev.technique_score || 0)),
      tactique_score: Math.round(Number(row.ev.tactique_score || 0)),
      physique_score: Math.round(Number(row.ev.physique_score || 0)),
      mental_score: Math.round(Number(row.ev.mental_score || 0)),
      global_score: Math.round(Number(row.ev.global_score || 0)),
      match_label: row.ev.match_label || row.matchDisplay,
    }));

    return {
      series,
      isMultiPlayer: false,
      uniquePlayersCount,
      distinctPlayers,
    };
  }

  const byDate = new Map<string, EnrichedHistoryEvaluation[]>();
  for (const row of sorted) {
    const dateKey = String(row.ev.evaluation_date || '').slice(0, 10);
    const list = byDate.get(dateKey);
    if (list) {
      list.push(row);
    } else {
      byDate.set(dateKey, [row]);
    }
  }

  const sortedDates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));
  const series: PlayerPerformanceEvaluation[] = sortedDates.map(dateKey => {
    const group = byDate.get(dateKey) || [];
    const count = group.length;
    const uniqueOnDate = new Set(group.map(r => String(r.ev.player_id))).size;
    let sumTech = 0;
    let sumTact = 0;
    let sumPhys = 0;
    let sumMent = 0;
    let sumGlobal = 0;
    let hasMatch = false;

    for (const item of group) {
      sumTech += Number(item.ev.technique_score || 0);
      sumTact += Number(item.ev.tactique_score || 0);
      sumPhys += Number(item.ev.physique_score || 0);
      sumMent += Number(item.ev.mental_score || 0);
      sumGlobal += Number(item.ev.global_score || 0);
      if (item.ev.source_type === 'match') {
        hasMatch = true;
      }
    }

    return {
      id: `agg-${dateKey}`,
      player_id: 'multi',
      position_code: `${uniqueOnDate}J`,
      evaluation_date: dateKey,
      source_type: hasMatch ? 'match' : 'manual',
      technique_score: roundToOneDecimal(sumTech, count),
      tactique_score: roundToOneDecimal(sumTact, count),
      physique_score: roundToOneDecimal(sumPhys, count),
      mental_score: roundToOneDecimal(sumMent, count),
      global_score: roundToOneDecimal(sumGlobal, count),
      criteria_scores: {},
      match_label: `${count} éval. · ${uniqueOnDate} joueur(s)`,
    };
  });

  return {
    series,
    isMultiPlayer: true,
    uniquePlayersCount,
    distinctPlayers,
  };
}
