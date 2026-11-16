import { supabase } from '../lib/supabase';
import {
  formatMatchEvaluationComment,
  isUserBlockedFromCustomMetricSets,
  parseMatchEvaluationComment,
  resolveMetricSetPositionForPlayer,
  type MetricPillar,
} from '../utils/metricSetsHelpers';

export type MatchContextKind = 'official' | 'friendly' | 'internal' | 'manual';

export interface ClassifiedMatchContext {
  kind: Exclude<MatchContextKind, 'manual'>;
  typeLabel: string;
  opponentName: string;
  shortLabel: string;
  displayLabel: string;
  matchDate: string;
  scoreLabel: string;
}

export function classifyMatchContext(
  match: any,
  opts?: {
    opponentClubs?: any[];
    mainClub?: any;
    leagues?: any[];
  }
): ClassifiedMatchContext {
  const opponentClubs = opts?.opponentClubs || [];
  const mainClub = opts?.mainClub;
  const leagues = opts?.leagues || [];

  const isInternal = Boolean(
    match?.match_type === 'internal_scrimmage' ||
      match?.lineup?.match_type === 'internal_scrimmage' ||
      match?.lineup?.internal_opposition?.is_internal_scrimmage ||
      (typeof match?.notes === 'string' && match.notes.includes('[Opposition Interne]')) ||
      (mainClub?.id && String(match?.opponent_id) === String(mainClub.id))
  );

  const isFriendly = Boolean(
    !isInternal &&
      (match?.match_type === 'amical' ||
        match?.lineup?.match_type === 'amical' ||
        !match?.league_id ||
        String(match?.category || '').toLowerCase().includes('amical') ||
        String(match?.notes || '').toLowerCase().includes('amical'))
  );

  const kind: 'official' | 'friendly' | 'internal' = isInternal
    ? 'internal'
    : isFriendly
      ? 'friendly'
      : 'official';

  const oppClub = opponentClubs.find(
    (c: any) =>
      String(c.id) === String(match?.opponent_id) ||
      String(c.id) === String(match?.opponent_club_id) ||
      String(c.id) === String(match?.away_club_id) ||
      String(c.id) === String(match?.home_club_id)
  );
  const league = leagues.find((l: any) => String(l.id) === String(match?.league_id));

  const opponentName = isInternal
    ? match?.lineup?.internal_opposition?.target_category
      ? `Opposition Interne (${match.lineup.internal_opposition.target_category})`
      : 'Opposition Interne'
    : match?.opponent_name ||
      oppClub?.short_name ||
      oppClub?.name ||
      match?.away_club_name ||
      match?.home_club_name ||
      'Adversaire';

  const typeLabel =
    kind === 'internal'
      ? 'Opposition Interne'
      : kind === 'friendly'
        ? 'Match Amical'
        : league?.name || 'Match Officiel';

  const matchDate = String(match?.match_date || '').slice(0, 10);
  const scoreLabel =
    match?.score_home != null && match?.score_away != null
      ? `${match.score_home}-${match.score_away}`
      : '';

  const shortLabel = isInternal
    ? opponentName
    : kind === 'friendly'
      ? `Amical vs ${opponentName}`
      : `vs ${opponentName}`;

  const catPart = match?.category ? ` (${match.category})` : '';
  const scorePart = scoreLabel ? ` · ${scoreLabel}` : '';
  const datePart = matchDate ? `${matchDate} · ` : '';
  const displayLabel = `${datePart}${typeLabel} · ${shortLabel}${catPart}${scorePart}`;

  return {
    kind,
    typeLabel,
    opponentName,
    shortLabel,
    displayLabel,
    matchDate,
    scoreLabel,
  };
}
import type { GeminiPerformanceSynthesis } from './geminiPerformanceService';

export const PILLAR_COLORS: Record<
  MetricPillar,
  {
    label: string;
    shortLabel: string;
    hex: string;
    bgClass: string;
    textClass: string;
  }
> = {
  technique: {
    label: 'Technique',
    shortLabel: 'Tech',
    hex: '#10b981',
    bgClass: 'bg-emerald-50 border-emerald-200',
    textClass: 'text-emerald-700',
  },
  physique: {
    label: 'Physique',
    shortLabel: 'Phys',
    hex: '#f43f5e',
    bgClass: 'bg-rose-50 border-rose-200',
    textClass: 'text-rose-700',
  },
  tactique: {
    label: 'Tactique',
    shortLabel: 'Tact',
    hex: '#6366f1',
    bgClass: 'bg-indigo-50 border-indigo-200',
    textClass: 'text-indigo-700',
  },
  mental: {
    label: 'Mental',
    shortLabel: 'Ment',
    hex: '#f59e0b',
    bgClass: 'bg-amber-50 border-amber-200',
    textClass: 'text-amber-700',
  },
};

export interface PlayerPerformanceEvaluation {
  id: string;
  player_id: string;
  match_id?: string | null;
  metric_set_id?: string | null;
  metric_set_name?: string | null;
  position_code: string;
  position_name?: string | null;
  evaluation_date: string;
  source_type: 'manual' | 'match' | 'training';
  evaluator_id?: string | null;
  evaluator_name?: string | null;
  technique_score: number;
  tactique_score: number;
  physique_score: number;
  mental_score: number;
  global_score: number;
  criteria_scores: Record<string, number>;
  comment?: string;
  ai_synthesis?: GeminiPerformanceSynthesis | null;
  match_label?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePlayerPerformancePayload {
  player_id: string;
  match_id?: string | null;
  match_label?: string | null;
  metric_set_id?: string | null;
  metric_set_name?: string | null;
  position_code: string;
  position_name?: string | null;
  evaluation_date: string;
  source_type?: 'manual' | 'match' | 'training';
  evaluator_id?: string | null;
  evaluator_name?: string | null;
  technique_score: number;
  tactique_score: number;
  physique_score: number;
  mental_score: number;
  global_score?: number;
  criteria_scores: Record<string, number>;
  comment?: string;
  ai_synthesis?: GeminiPerformanceSynthesis | null;
}

export type UpdatePlayerPerformancePayload = Partial<CreatePlayerPerformancePayload> & {
  player_id: string;
};

const LOCAL_STORAGE_KEY_PREFIX = 'fus_player_perf_evals_v1_';
const LOCAL_SYNTH_STORAGE_PREFIX = 'fus_player_perf_synth_v1_';
const PLUGINS_EVALS_KEY = 'player_performance_evaluations';
const PLUGINS_SYNTH_KEY = 'player_performance_ai_syntheses';

function readLocalSyntheses(playerId: string): Record<string, GeminiPerformanceSynthesis> {
  try {
    const raw = localStorage.getItem(`${LOCAL_SYNTH_STORAGE_PREFIX}${playerId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalSynthesis(
  playerId: string,
  evalId: string,
  synthesis: GeminiPerformanceSynthesis | null | undefined
): void {
  if (!synthesis) return;
  try {
    const prev = readLocalSyntheses(playerId);
    prev[evalId] = synthesis;
    localStorage.setItem(`${LOCAL_SYNTH_STORAGE_PREFIX}${playerId}`, JSON.stringify(prev));
  } catch { }
}

function normalizeSynthesis(raw: any): GeminiPerformanceSynthesis | null {
  if (!raw || typeof raw !== 'object' || !raw.summary) return null;
  return {
    summary: String(raw.summary || ''),
    strengths: Array.isArray(raw.strengths) ? raw.strengths.map(String) : [],
    improvements: Array.isArray(raw.improvements) ? raw.improvements.map(String) : [],
    coach_recommendation: String(raw.coach_recommendation || ''),
    evolution_trend: raw.evolution_trend ? String(raw.evolution_trend) : undefined,
    model_used: String(raw.model_used || 'gemini'),
    generated_at: String(raw.generated_at || new Date().toISOString()),
  };
}

function isUuid(v?: string | null): boolean {
  return !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function isMissingTableErr(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  const code = String(err?.code || '');
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === '42703' ||
    code === 'PGRST204' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('could not find')
  );
}

function clampTen(v: unknown): number {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Number(Math.min(10, Math.max(0, n)).toFixed(2));
}

function computeFourPillarMean(
  tech: number,
  tact: number,
  phys: number,
  ment: number
): number {
  return Number(((tech + tact + phys + ment) / 4).toFixed(2));
}

function readLocalEvaluations(playerId: string): PlayerPerformanceEvaluation[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${playerId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalEvaluations(playerId: string, rows: PlayerPerformanceEvaluation[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${playerId}`, JSON.stringify(rows));
  } catch { }
}

function normalizeRow(row: any): PlayerPerformanceEvaluation {
  const technique_score = clampTen(row.technique_score);
  const tactique_score = clampTen(row.tactique_score);
  const physique_score = clampTen(row.physique_score);
  const mental_score = clampTen(row.mental_score);
  const global_score =
    row.global_score != null && Number.isFinite(Number(row.global_score))
      ? clampTen(row.global_score)
      : computeFourPillarMean(technique_score, tactique_score, physique_score, mental_score);

  return {
    id: String(row.id),
    player_id: String(row.player_id),
    match_id: row.match_id || null,
    metric_set_id: row.metric_set_id || null,
    metric_set_name: row.metric_set_name || null,
    position_code: String(row.position_code || 'CM'),
    position_name: row.position_name || null,
    evaluation_date: String(row.evaluation_date || new Date().toISOString()).slice(0, 10),
    source_type:
      row.source_type === 'match' || row.source_type === 'training' ? row.source_type : 'manual',
    evaluator_id: row.evaluator_id || null,
    evaluator_name: row.evaluator_name || null,
    technique_score,
    tactique_score,
    physique_score,
    mental_score,
    global_score,
    criteria_scores:
      row.criteria_scores && typeof row.criteria_scores === 'object' ? row.criteria_scores : {},
    comment: typeof row.comment === 'string' ? row.comment : '',
    ai_synthesis: normalizeSynthesis(row.ai_synthesis),
    match_label: row.match_label || undefined,
    created_at: row.created_at || undefined,
    updated_at: row.updated_at || undefined,
  };
}

function resolveMatchOpponentLabel(
  match: any,
  opponentClubs: any[] = [],
  mainClub?: any
): string {
  return classifyMatchContext(match, { opponentClubs, mainClub }).shortLabel;
}

function sortChronological(list: PlayerPerformanceEvaluation[]): PlayerPerformanceEvaluation[] {
  return [...list].sort((a, b) => {
    const cmp = a.evaluation_date.localeCompare(b.evaluation_date);
    if (cmp !== 0) return cmp;
    return String(a.created_at || '').localeCompare(String(b.created_at || ''));
  });
}

function isMissingColumnErr(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  const code = String(err?.code || '');
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    msg.includes('ai_synthesis') ||
    msg.includes('could not find the')
  );
}

async function persistSynthesisSidecar(
  playerId: string,
  evalId: string,
  synthesis: GeminiPerformanceSynthesis | null | undefined
): Promise<void> {
  if (!synthesis || !evalId) return;
  writeLocalSynthesis(playerId, evalId, synthesis);
  try {
    const { data: sRow } = await supabase.from('settings').select('id, plugins').limit(1).maybeSingle();
    if (sRow?.id) {
      const plugins = sRow.plugins && typeof sRow.plugins === 'object' ? (sRow.plugins as Record<string, any>) : {};
      const prevMap = plugins[PLUGINS_SYNTH_KEY] && typeof plugins[PLUGINS_SYNTH_KEY] === 'object'
        ? { ...(plugins[PLUGINS_SYNTH_KEY] as Record<string, any>) }
        : {};
      prevMap[evalId] = synthesis;
      await supabase
        .from('settings')
        .update({ plugins: { ...plugins, [PLUGINS_SYNTH_KEY]: prevMap } })
        .eq('id', sRow.id);
    }
  } catch { }
}

export const playerPerformanceService = {
  async listByPlayer(
    playerId: string,
    role?: string | null,
    jobTitle?: string | null
  ): Promise<PlayerPerformanceEvaluation[]> {
    if (!playerId || isUserBlockedFromCustomMetricSets(role, jobTitle)) {
      return [];
    }

    const collected: PlayerPerformanceEvaluation[] = [];
    let pluginsSyntheses: Record<string, any> = {};

    // 1. Table dédiée Supabase
    try {
      const { data, error } = await supabase
        .from('player_performance_evaluations')
        .select('*')
        .eq('player_id', playerId)
        .order('evaluation_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        data.forEach(r => collected.push(normalizeRow(r)));
      }
    } catch { }

    // 2. Fallback settings.plugins
    try {
      const { data: sRow } = await supabase.from('settings').select('plugins').limit(1).maybeSingle();
      const rawList = Array.isArray((sRow?.plugins as any)?.[PLUGINS_EVALS_KEY])
        ? ((sRow?.plugins as any)[PLUGINS_EVALS_KEY] as any[])
        : [];
      rawList
        .filter(r => String(r?.player_id) === String(playerId))
        .forEach(r => collected.push(normalizeRow(r)));

      if ((sRow?.plugins as any)?.[PLUGINS_SYNTH_KEY] && typeof (sRow?.plugins as any)[PLUGINS_SYNTH_KEY] === 'object') {
        pluginsSyntheses = (sRow?.plugins as any)[PLUGINS_SYNTH_KEY];
      }
    } catch { }

    // 3. Fallback localStorage
    const localSyntheses = readLocalSyntheses(playerId);
    readLocalEvaluations(playerId).forEach(r => collected.push(normalizeRow(r)));

    // Déduplication par id ou couple (match_id, player_id) + fusion synthèse IA
    const byKey = new Map<string, PlayerPerformanceEvaluation>();
    for (const item of collected) {
      const synth =
        item.ai_synthesis ||
        normalizeSynthesis(pluginsSyntheses[item.id]) ||
        normalizeSynthesis(localSyntheses[item.id]);
      const enriched = synth && !item.ai_synthesis ? { ...item, ai_synthesis: synth } : item;
      const dedupKey = enriched.match_id ? `match:${enriched.match_id}:${enriched.player_id}` : enriched.id;
      if (!byKey.has(dedupKey)) {
        byKey.set(dedupKey, enriched);
      } else {
        const existing = byKey.get(dedupKey)!;
        if (!existing.ai_synthesis && enriched.ai_synthesis) {
          byKey.set(dedupKey, { ...existing, ai_synthesis: enriched.ai_synthesis });
        }
      }
    }

    return sortChronological(Array.from(byKey.values()));
  },

  async listAllEvaluations(
    role?: string | null,
    jobTitle?: string | null,
    rawMatches: any[] = [],
    opponentClubs: any[] = [],
    mainClub?: any
  ): Promise<PlayerPerformanceEvaluation[]> {
    if (isUserBlockedFromCustomMetricSets(role, jobTitle)) {
      return [];
    }

    const collected: PlayerPerformanceEvaluation[] = [];
    let pluginsSyntheses: Record<string, any> = {};

    try {
      const { data, error } = await supabase
        .from('player_performance_evaluations')
        .select('*')
        .order('evaluation_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(800);

      if (!error && Array.isArray(data)) {
        data.forEach(r => collected.push(normalizeRow(r)));
      }
    } catch { }

    try {
      const { data: sRow } = await supabase.from('settings').select('plugins').limit(1).maybeSingle();
      const rawList = Array.isArray((sRow?.plugins as any)?.[PLUGINS_EVALS_KEY])
        ? ((sRow?.plugins as any)[PLUGINS_EVALS_KEY] as any[])
        : [];
      rawList.forEach(r => {
        if (r?.player_id) collected.push(normalizeRow(r));
      });
      if ((sRow?.plugins as any)?.[PLUGINS_SYNTH_KEY] && typeof (sRow?.plugins as any)[PLUGINS_SYNTH_KEY] === 'object') {
        pluginsSyntheses = (sRow?.plugins as any)[PLUGINS_SYNTH_KEY];
      }
    } catch { }

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
          const pid = k.slice(LOCAL_STORAGE_KEY_PREFIX.length);
          readLocalEvaluations(pid).forEach(r => collected.push(normalizeRow(r)));
        }
      }
    } catch { }

    const byKey = new Map<string, PlayerPerformanceEvaluation>();
    for (const item of collected) {
      const synth = item.ai_synthesis || normalizeSynthesis(pluginsSyntheses[item.id]);
      const enriched = synth && !item.ai_synthesis ? { ...item, ai_synthesis: synth } : item;
      const dedupKey = enriched.match_id ? `match:${enriched.match_id}:${enriched.player_id}` : enriched.id;
      if (!byKey.has(dedupKey)) {
        byKey.set(dedupKey, enriched);
      }
    }

    // Inclure également les évaluations issues de match_players non encore présentes dans player_performance_evaluations
    const matchById = new Map<string, any>();
    (rawMatches || []).forEach(m => {
      if (m?.id) matchById.set(String(m.id), m);
    });

    const representedPairs = new Set<string>();
    const normalizedCollected = Array.from(byKey.values()).map(ev => {
      if (ev.match_id) {
        representedPairs.add(`${ev.match_id}:${ev.player_id}`);
        const m = matchById.get(String(ev.match_id));
        if (m && !ev.match_label) {
          return {
            ...ev,
            match_label: resolveMatchOpponentLabel(m, opponentClubs, mainClub),
          };
        }
      }
      return ev;
    });

    const extractedFromMatches: PlayerPerformanceEvaluation[] = [];
    for (const match of rawMatches || []) {
      if (!match?.id || !Array.isArray(match.match_players)) continue;
      for (const mp of match.match_players) {
        const pid = String(mp?.player_id || '');
        if (!pid || representedPairs.has(`${match.id}:${pid}`)) continue;

        const parsedComment = parseMatchEvaluationComment(mp.rating_comment);
        const rawPillars = mp.pillar_scores && typeof mp.pillar_scores === 'object' ? mp.pillar_scores : null;
        const hasRealPillarValues = Boolean(
          rawPillars &&
            (rawPillars.technique != null ||
              rawPillars.tactique != null ||
              rawPillars.physique != null ||
              rawPillars.mental != null ||
              (rawPillars.criteria_scores &&
                typeof rawPillars.criteria_scores === 'object' &&
                Object.keys(rawPillars.criteria_scores).length > 0))
        );

        let tech = 0;
        let tact = 0;
        let phys = 0;
        let ment = 0;
        let hasPillars = false;

        if (hasRealPillarValues && rawPillars) {
          tech = clampTen(rawPillars.technique);
          tact = clampTen(rawPillars.tactique);
          phys = clampTen(rawPillars.physique);
          ment = clampTen(rawPillars.mental);
          hasPillars = true;
        } else if (parsedComment.pillars) {
          tech = clampTen(parsedComment.pillars.technique);
          tact = clampTen(parsedComment.pillars.tactique);
          phys = clampTen(parsedComment.pillars.physique);
          ment = clampTen(parsedComment.pillars.mental);
          hasPillars = true;
        }
        if (!hasPillars) continue;

        const global = computeFourPillarMean(tech, tact, phys, ment);
        extractedFromMatches.push({
          id: `match_eval_${match.id}_${pid}`,
          player_id: pid,
          match_id: String(match.id),
          metric_set_id: mp.metric_set_id || rawPillars?.metric_set_id || null,
          metric_set_name: rawPillars?.metric_set_name || parsedComment.setName || 'Match',
          position_code: rawPillars?.position_code || parsedComment.positionCode || 'CM',
          position_name: rawPillars?.position_name || null,
          evaluation_date: String(match.match_date || new Date().toISOString()).slice(0, 10),
          source_type: 'match',
          technique_score: tech,
          tactique_score: tact,
          physique_score: phys,
          mental_score: ment,
          global_score: global,
          criteria_scores: rawPillars?.criteria_scores && typeof rawPillars.criteria_scores === 'object' ? rawPillars.criteria_scores : {},
          comment: parsedComment.textComment,
          match_label: resolveMatchOpponentLabel(match, opponentClubs, mainClub),
          created_at: match.match_date || undefined,
        });
      }
    }

    return [...normalizedCollected, ...extractedFromMatches].sort((a, b) => {
      const cmp = b.evaluation_date.localeCompare(a.evaluation_date);
      if (cmp !== 0) return cmp;
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
  },

  async createEvaluation(
    payload: CreatePlayerPerformancePayload,
    role?: string | null,
    jobTitle?: string | null
  ): Promise<PlayerPerformanceEvaluation> {
    if (isUserBlockedFromCustomMetricSets(role, jobTitle)) {
      throw new Error('Accès refusé : les évaluations Performance Joueur sont isolées des comptes Scouts.');
    }

    const technique_score = clampTen(payload.technique_score);
    const tactique_score = clampTen(payload.tactique_score);
    const physique_score = clampTen(payload.physique_score);
    const mental_score = clampTen(payload.mental_score);
    const global_score =
      payload.global_score != null
        ? clampTen(payload.global_score)
        : computeFourPillarMean(technique_score, tactique_score, physique_score, mental_score);
    const ai_synthesis = normalizeSynthesis(payload.ai_synthesis);

    const nowIso = new Date().toISOString();
    const baseRow: Record<string, any> = {
      player_id: payload.player_id,
      match_id: isUuid(payload.match_id) ? payload.match_id : null,
      metric_set_id: isUuid(payload.metric_set_id) ? payload.metric_set_id : null,
      metric_set_name: payload.metric_set_name || 'Performance Joueur',
      position_code: payload.position_code || 'CM',
      position_name: payload.position_name || null,
      evaluation_date: (payload.evaluation_date || nowIso).slice(0, 10),
      source_type: payload.source_type || 'manual',
      evaluator_id: isUuid(payload.evaluator_id) ? payload.evaluator_id : null,
      evaluator_name: payload.evaluator_name || null,
      technique_score,
      tactique_score,
      physique_score,
      mental_score,
      global_score,
      criteria_scores: payload.criteria_scores || {},
      comment: payload.comment || '',
    };

    try {
      const insertPayload = ai_synthesis ? { ...baseRow, ai_synthesis } : baseRow;
      let { data, error } = await supabase
        .from('player_performance_evaluations')
        .insert([insertPayload])
        .select('*')
        .single();

      // Si la colonne ai_synthesis n'existe pas encore côté SQL, réessayer sans elle puis stocker en sidecar
      if (error && ai_synthesis && isMissingColumnErr(error)) {
        const retryRes = await supabase
          .from('player_performance_evaluations')
          .insert([baseRow])
          .select('*')
          .single();
        data = retryRes.data;
        error = retryRes.error;
      }

      if (!error && data) {
        const normalized = normalizeRow({
          ...data,
          match_label: data.match_label || payload.match_label || undefined,
          ai_synthesis: data.ai_synthesis || ai_synthesis,
        });
        if (ai_synthesis) {
          await persistSynthesisSidecar(payload.player_id, normalized.id, ai_synthesis);
        }
        if (isUuid(payload.match_id) && isUuid(payload.player_id) && payload.source_type === 'match') {
          try {
            const formatted = formatMatchEvaluationComment(
              payload.comment || '',
              {
                technique: technique_score,
                tactique: tactique_score,
                physique: physique_score,
                mental: mental_score,
              },
              payload.metric_set_name || undefined,
              payload.position_code || undefined
            );
            await supabase
              .from('match_players')
              .update({ rating: Math.round(global_score), rating_comment: formatted })
              .eq('match_id', payload.match_id!)
              .eq('player_id', payload.player_id);
          } catch { }
        }
        const existingLocal = readLocalEvaluations(payload.player_id);
        writeLocalEvaluations(payload.player_id, [normalized, ...existingLocal]);
        return normalized;
      }

      if (error && !isMissingTableErr(error)) {
        throw error;
      }
    } catch (err: any) {
      if (!isMissingTableErr(err)) throw err;
    }

    // Fallback settings.plugins + localStorage
    const fallbackRow = normalizeRow({
      id: `local_eval_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...baseRow,
      match_label: payload.match_label || undefined,
      ai_synthesis,
      metric_set_id: payload.metric_set_id || null,
      created_at: nowIso,
      updated_at: nowIso,
    });

    try {
      const { data: sRow } = await supabase.from('settings').select('id, plugins').limit(1).maybeSingle();
      if (sRow?.id) {
        const plugins = sRow.plugins && typeof sRow.plugins === 'object' ? (sRow.plugins as Record<string, any>) : {};
        const prevList = Array.isArray(plugins[PLUGINS_EVALS_KEY]) ? (plugins[PLUGINS_EVALS_KEY] as any[]) : [];
        await supabase
          .from('settings')
          .update({ plugins: { ...plugins, [PLUGINS_EVALS_KEY]: [fallbackRow, ...prevList].slice(0, 600) } })
          .eq('id', sRow.id);
      }
    } catch { }

    if (ai_synthesis) {
      await persistSynthesisSidecar(payload.player_id, fallbackRow.id, ai_synthesis);
    }
    const prevLocal = readLocalEvaluations(payload.player_id);
    writeLocalEvaluations(payload.player_id, [fallbackRow, ...prevLocal]);
    return fallbackRow;
  },

  async updateEvaluationSynthesis(
    evalId: string,
    playerId: string,
    synthesis: GeminiPerformanceSynthesis,
    role?: string | null,
    jobTitle?: string | null
  ): Promise<void> {
    if (isUserBlockedFromCustomMetricSets(role, jobTitle)) {
      throw new Error('Accès refusé.');
    }

    if (isUuid(evalId)) {
      try {
        const { error } = await supabase
          .from('player_performance_evaluations')
          .update({ ai_synthesis: synthesis, updated_at: new Date().toISOString() })
          .eq('id', evalId);
        if (error && !isMissingTableErr(error) && !isMissingColumnErr(error)) {
          throw error;
        }
      } catch (err: any) {
        if (!isMissingTableErr(err) && !isMissingColumnErr(err)) throw err;
      }
    }

    // Toujours garder localStorage & settings.plugins synchronisés (y compris pour les synthèses sur évaluations match)
    const prevLocal = readLocalEvaluations(playerId);
    if (prevLocal.some(item => String(item.id) === String(evalId))) {
      writeLocalEvaluations(
        playerId,
        prevLocal.map(item => (String(item.id) === String(evalId) ? { ...item, ai_synthesis: synthesis } : item))
      );
    }
    await persistSynthesisSidecar(playerId, evalId, synthesis);
  },

  async updateEvaluation(
    evalId: string,
    payload: UpdatePlayerPerformancePayload,
    role?: string | null,
    jobTitle?: string | null
  ): Promise<PlayerPerformanceEvaluation> {
    if (isUserBlockedFromCustomMetricSets(role, jobTitle)) {
      throw new Error('Accès refusé : les évaluations Performance Joueur sont isolées des comptes Scouts.');
    }

    // Si l'évaluation vient historiquement d'une ligne match_players sans ligne player_performance_evaluations, on la crée proprement
    if (String(evalId).startsWith('match_eval_')) {
      return this.createEvaluation(
        {
          player_id: payload.player_id,
          match_id: payload.match_id ?? null,
          match_label: payload.match_label ?? null,
          metric_set_id: payload.metric_set_id ?? null,
          metric_set_name: payload.metric_set_name || 'Performance Match',
          position_code: payload.position_code || 'CM',
          position_name: payload.position_name || null,
          evaluation_date: (payload.evaluation_date || new Date().toISOString()).slice(0, 10),
          source_type: payload.source_type || 'match',
          evaluator_id: payload.evaluator_id ?? null,
          evaluator_name: payload.evaluator_name ?? null,
          technique_score: payload.technique_score ?? 5,
          tactique_score: payload.tactique_score ?? 5,
          physique_score: payload.physique_score ?? 5,
          mental_score: payload.mental_score ?? 5,
          global_score: payload.global_score,
          criteria_scores: payload.criteria_scores || {},
          comment: payload.comment || '',
          ai_synthesis: payload.ai_synthesis ?? null,
        },
        role,
        jobTitle
      );
    }

    const technique_score = clampTen(payload.technique_score);
    const tactique_score = clampTen(payload.tactique_score);
    const physique_score = clampTen(payload.physique_score);
    const mental_score = clampTen(payload.mental_score);
    const global_score =
      payload.global_score != null
        ? clampTen(payload.global_score)
        : computeFourPillarMean(technique_score, tactique_score, physique_score, mental_score);
    const nowIso = new Date().toISOString();

    const dbUpdates: Record<string, any> = {
      match_id: payload.match_id !== undefined ? (isUuid(payload.match_id) ? payload.match_id : null) : undefined,
      metric_set_id: payload.metric_set_id !== undefined ? (isUuid(payload.metric_set_id) ? payload.metric_set_id : null) : undefined,
      metric_set_name: payload.metric_set_name,
      position_code: payload.position_code,
      position_name: payload.position_name,
      evaluation_date: payload.evaluation_date ? String(payload.evaluation_date).slice(0, 10) : undefined,
      source_type: payload.source_type,
      technique_score,
      tactique_score,
      physique_score,
      mental_score,
      global_score,
      criteria_scores: payload.criteria_scores,
      comment: payload.comment,
      updated_at: nowIso,
    };
    Object.keys(dbUpdates).forEach(k => dbUpdates[k] === undefined && delete dbUpdates[k]);

    let updatedRow: PlayerPerformanceEvaluation | null = null;

    if (isUuid(evalId)) {
      try {
        const { data, error } = await supabase
          .from('player_performance_evaluations')
          .update(dbUpdates)
          .eq('id', evalId)
          .select('*')
          .maybeSingle();
        if (!error && data) {
          updatedRow = normalizeRow({
            ...data,
            match_label: data.match_label || payload.match_label || undefined,
          });
        } else if (error && !isMissingTableErr(error)) {
          throw error;
        }
      } catch (err: any) {
        if (!isMissingTableErr(err)) throw err;
      }
    }

    if (isUuid(payload.match_id) && isUuid(payload.player_id)) {
      try {
        const formatted = formatMatchEvaluationComment(
          payload.comment || '',
          {
            technique: technique_score,
            tactique: tactique_score,
            physique: physique_score,
            mental: mental_score,
          },
          payload.metric_set_name || undefined,
          payload.position_code || undefined
        );
        await supabase
          .from('match_players')
          .update({ rating: Math.round(global_score), rating_comment: formatted })
          .eq('match_id', payload.match_id!)
          .eq('player_id', payload.player_id);
      } catch { }
    }

    // Mettre à jour settings.plugins fallback
    try {
      const { data: sRow } = await supabase.from('settings').select('id, plugins').limit(1).maybeSingle();
      if (sRow?.id && sRow.plugins && typeof sRow.plugins === 'object') {
        const plugins = sRow.plugins as Record<string, any>;
        const prevList = Array.isArray(plugins[PLUGINS_EVALS_KEY]) ? (plugins[PLUGINS_EVALS_KEY] as any[]) : [];
        if (prevList.some(item => String(item?.id) === String(evalId))) {
          const nextList = prevList.map(item =>
            String(item?.id) === String(evalId)
              ? {
                  ...item,
                  ...dbUpdates,
                  ...(payload.match_label !== undefined ? { match_label: payload.match_label } : {}),
                }
              : item
          );
          await supabase
            .from('settings')
            .update({ plugins: { ...plugins, [PLUGINS_EVALS_KEY]: nextList } })
            .eq('id', sRow.id);
        }
      }
    } catch { }

    // Mettre à jour localStorage
    const prevLocal = readLocalEvaluations(payload.player_id);
    const localUpdated = normalizeRow({
      ...(prevLocal.find(item => String(item.id) === String(evalId)) || {}),
      id: evalId,
      player_id: payload.player_id,
      ...dbUpdates,
      ...(payload.match_label !== undefined ? { match_label: payload.match_label } : {}),
    });

    if (prevLocal.some(item => String(item.id) === String(evalId))) {
      writeLocalEvaluations(
        payload.player_id,
        prevLocal.map(item => (String(item.id) === String(evalId) ? (updatedRow || localUpdated) : item))
      );
    } else if (updatedRow) {
      writeLocalEvaluations(payload.player_id, [updatedRow, ...prevLocal]);
    }

    return updatedRow || localUpdated;
  },

  async deleteEvaluation(
    evalId: string,
    role?: string | null,
    jobTitle?: string | null,
    meta?: { playerId?: string; matchId?: string | null }
  ): Promise<void> {
    if (isUserBlockedFromCustomMetricSets(role, jobTitle)) {
      throw new Error('Accès refusé.');
    }

    if (isUuid(evalId)) {
      const { error } = await supabase
        .from('player_performance_evaluations')
        .delete()
        .eq('id', evalId);
      if (error && !isMissingTableErr(error)) {
        throw error;
      }
    }

    // Si une évaluation liée à un match existe dans match_players, nettoyer rating/comment pour éviter la recréation auto
    let targetMatchId = meta?.matchId || null;
    let targetPlayerId = meta?.playerId || null;
    if (String(evalId).startsWith('match_eval_')) {
      const rest = String(evalId).slice('match_eval_'.length);
      const sepIdx = rest.lastIndexOf('_');
      if (sepIdx > 0) {
        targetMatchId = targetMatchId || rest.slice(0, sepIdx);
        targetPlayerId = targetPlayerId || rest.slice(sepIdx + 1);
      }
    }
    if (isUuid(targetMatchId) && isUuid(targetPlayerId)) {
      try {
        await supabase
          .from('match_players')
          .update({ rating: null, rating_comment: null, rated_at: null, pillar_scores: null, metric_set_id: null })
          .eq('match_id', targetMatchId!)
          .eq('player_id', targetPlayerId!);
      } catch { }
    }

    // Nettoyer fallback settings.plugins
    try {
      const { data: sRow } = await supabase.from('settings').select('id, plugins').limit(1).maybeSingle();
      if (sRow?.id && sRow.plugins && typeof sRow.plugins === 'object') {
        const plugins = sRow.plugins as Record<string, any>;
        const prevList = Array.isArray(plugins[PLUGINS_EVALS_KEY]) ? (plugins[PLUGINS_EVALS_KEY] as any[]) : [];
        const filtered = prevList.filter(e => String(e?.id) !== String(evalId));
        if (filtered.length !== prevList.length) {
          await supabase
            .from('settings')
            .update({ plugins: { ...plugins, [PLUGINS_EVALS_KEY]: filtered } })
            .eq('id', sRow.id);
        }
      }
    } catch { }

    // Nettoyer localStorage sur toutes les clés player_perf
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
          const pid = k.slice(LOCAL_STORAGE_KEY_PREFIX.length);
          const list = readLocalEvaluations(pid);
          const filtered = list.filter(item => String(item.id) !== String(evalId));
          if (filtered.length !== list.length) {
            writeLocalEvaluations(pid, filtered);
          }
        }
      }
    } catch { }
  },

  buildUnifiedTimeline(
    dbEvaluations: PlayerPerformanceEvaluation[],
    rawPlayerMatches: any[],
    playerId: string,
    fallbackPosition?: string | null,
    opponentClubs: any[] = [],
    mainClub?: any
  ): PlayerPerformanceEvaluation[] {
    const matchById = new Map<string, any>();
    (rawPlayerMatches || []).forEach(m => {
      if (m?.id) matchById.set(String(m.id), m);
    });

    const representedMatchIds = new Set<string>();

    const enrichedDb = (dbEvaluations || []).map(ev => {
      if (ev.match_id) {
        representedMatchIds.add(String(ev.match_id));
        const m = matchById.get(String(ev.match_id));
        if (m && !ev.match_label) {
          return {
            ...ev,
            match_label: resolveMatchOpponentLabel(m, opponentClubs, mainClub),
          };
        }
      }
      return ev;
    });

    const extractedFromMatches: PlayerPerformanceEvaluation[] = [];

    for (const match of rawPlayerMatches || []) {
      if (!match?.id || representedMatchIds.has(String(match.id))) continue;
      const mp = (match.match_players || []).find(
        (row: any) => String(row.player_id) === String(playerId)
      );
      if (!mp) continue;

      const parsedComment = parseMatchEvaluationComment(mp.rating_comment);
      const rawPillars =
        mp.pillar_scores && typeof mp.pillar_scores === 'object' ? mp.pillar_scores : null;
      const hasRealPillarValues = Boolean(
        rawPillars &&
          (rawPillars.technique != null ||
            rawPillars.tactique != null ||
            rawPillars.physique != null ||
            rawPillars.mental != null ||
            (rawPillars.criteria_scores &&
              typeof rawPillars.criteria_scores === 'object' &&
              Object.keys(rawPillars.criteria_scores).length > 0))
      );

      let tech = 0;
      let tact = 0;
      let phys = 0;
      let ment = 0;
      let hasPillars = false;

      if (hasRealPillarValues && rawPillars) {
        tech = clampTen(rawPillars.technique);
        tact = clampTen(rawPillars.tactique);
        phys = clampTen(rawPillars.physique);
        ment = clampTen(rawPillars.mental);
        hasPillars = true;
      } else if (parsedComment.pillars) {
        tech = clampTen(parsedComment.pillars.technique);
        tact = clampTen(parsedComment.pillars.tactique);
        phys = clampTen(parsedComment.pillars.physique);
        ment = clampTen(parsedComment.pillars.mental);
        hasPillars = true;
      }

      if (!hasPillars) continue;

      const global = computeFourPillarMean(tech, tact, phys, ment);
      const resolvedFallbackPos = resolveMetricSetPositionForPlayer([], fallbackPosition);
      const matchEvalId = `match_eval_${match.id}_${playerId}`;
      const localSynthMap = readLocalSyntheses(playerId);

      extractedFromMatches.push({
        id: matchEvalId,
        player_id: playerId,
        match_id: String(match.id),
        metric_set_id: mp.metric_set_id || rawPillars?.metric_set_id || null,
        metric_set_name: rawPillars?.metric_set_name || parsedComment.setName || 'Match officiel',
        position_code:
          rawPillars?.position_code ||
          parsedComment.positionCode ||
          resolvedFallbackPos?.code ||
          fallbackPosition ||
          'CM',
        position_name: rawPillars?.position_name || null,
        evaluation_date: String(match.match_date || new Date().toISOString()).slice(0, 10),
        source_type: 'match',
        technique_score: tech,
        tactique_score: tact,
        physique_score: phys,
        mental_score: ment,
        global_score: global,
        criteria_scores:
          rawPillars?.criteria_scores && typeof rawPillars.criteria_scores === 'object'
            ? rawPillars.criteria_scores
            : {},
        comment: parsedComment.textComment,
        ai_synthesis: normalizeSynthesis(localSynthMap[matchEvalId]),
        match_label: resolveMatchOpponentLabel(match, opponentClubs, mainClub),
        created_at: match.match_date || undefined,
      });
    }

    return sortChronological([...enrichedDb, ...extractedFromMatches]);
  },
};

