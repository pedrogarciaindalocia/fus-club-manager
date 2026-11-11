import { PLAYER_CATEGORIES, normalizeAgeCategory } from '../constants';
import { resolveClubAbbreviation } from '../features/match-management/utils/frmfMatchSheetParser';
import { getClubLogoUrl } from '../utils/clubLogos';
import {
  computeRankedStandingsFromMatches,
  isRankableMatchFinished,
  type ComputedStandingsResult,
  type RankableMatchInput,
  type TieBreakerRuleApplied,
} from '../utils/standingsRankingEngine';

export interface FRMFStandingTeam {
  position: number;
  team_key?: string;
  team_name: string;
  is_fus: boolean;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  club_logo?: string;
  form?: Array<'W' | 'D' | 'L'>;
  is_tied_on_points?: boolean;
  h2h_activated?: boolean;
  tie_breaker_rule?: TieBreakerRuleApplied;
  position_delta?: number | null;
}

export interface FRMFMatch {
  id?: string;
  category: string;
  group: string;
  match_day: number;
  home_team: string;
  away_team: string;
  score_home: number | null;
  score_away: number | null;
  status: 'finished' | 'scheduled' | 'postponed' | 'cancelled';
  match_date: string;
  match_time: string;
  home_team_logo?: string;
  away_team_logo?: string;
}

export interface FRMFDataset {
  metadata: {
    source: string;
    source_url: string;
    extracted_at: string;
    season: string;
    categories: string[];
    _version?: string;
  };
  standings: Record<string, Record<string, FRMFStandingTeam[]>>;
  results: Record<string, Record<string, Record<string, FRMFMatch[]>>>;
}

export interface ResultsHtmlImportParams {
  category: string;
  group: string;
  resultsDay: number;
  matches: FRMFMatch[];
  season?: string;
}

export interface FRMFCalculatedStandingsResponse {
  standings: FRMFStandingTeam[];
  meta: ComputedStandingsResult['meta'];
}

export type FRMFDatabaseStatus = 'idle' | 'synced' | 'migration_required' | 'error';

export interface FRMFDatabaseMutationResult {
  dataset: FRMFDataset;
  savedToDb: boolean;
  dbStatus: FRMFDatabaseStatus;
  totalDbRows?: number;
  errorMessage?: string;
}

export const FRMF_STORAGE_KEY = 'fusc_frmf_real_results_v6';
export const FRMF_DATA_VERSION = '2026_11_10_real_results_only_v6';
const LEGACY_STORAGE_KEYS = ['fusc_frmf_standings_results_custom_v5', 'fusc_frmf_db_seeded_v1'];

function createEmptyDataset(): FRMFDataset {
  return {
    metadata: {
      source: 'Fédération Royale Marocaine de Football (FRMF)',
      source_url: 'https://frmf.ma',
      extracted_at: new Date().toISOString(),
      season: '2026/2027',
      categories: [...PLAYER_CATEGORIES],
      _version: FRMF_DATA_VERSION,
    },
    standings: {},
    results: {},
  };
}

const STANDARD_GROUPS_SINGLE_FIRST = ['Poule Unique', 'Groupe Nord', 'Groupe Sud'];
const STANDARD_GROUPS_NORTH_SOUTH = ['Groupe Nord', 'Groupe Sud', 'Poule Unique'];

export const FRMF_MATCHES_MIGRATION_SQL = `-- À exécuter dans Supabase Dashboard -> SQL Editor -> New Query
CREATE TABLE IF NOT EXISTS public.frmf_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season TEXT NOT NULL DEFAULT '2026/2027',
  category TEXT NOT NULL,
  league_group TEXT NOT NULL DEFAULT 'Poule Unique',
  match_day INTEGER NOT NULL CHECK (match_day > 0),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  score_home INTEGER,
  score_away INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('finished', 'scheduled', 'postponed', 'cancelled')),
  match_date TEXT NOT NULL DEFAULT '',
  match_time TEXT NOT NULL DEFAULT '15:00',
  home_team_logo TEXT,
  away_team_logo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_frmf_diff_teams CHECK (UPPER(TRIM(home_team)) <> UPPER(TRIM(away_team))),
  CONSTRAINT uq_frmf_match_slot UNIQUE (season, category, league_group, match_day, home_team, away_team)
);
GRANT ALL ON TABLE public.frmf_matches TO anon, authenticated, service_role;
ALTER TABLE public.frmf_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read frmf_matches" ON public.frmf_matches;
CREATE POLICY "Allow read frmf_matches" ON public.frmf_matches FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Allow insert frmf_matches" ON public.frmf_matches;
CREATE POLICY "Allow insert frmf_matches" ON public.frmf_matches FOR INSERT TO authenticated, anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update frmf_matches" ON public.frmf_matches;
CREATE POLICY "Allow update frmf_matches" ON public.frmf_matches FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow delete frmf_matches" ON public.frmf_matches;
CREATE POLICY "Allow delete frmf_matches" ON public.frmf_matches FOR DELETE TO authenticated, anon USING (true);`;

function cloneDataset(ds: FRMFDataset): FRMFDataset {
  return JSON.parse(JSON.stringify(ds)) as FRMFDataset;
}

function getStorage(): Storage | null {
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return null;
}

function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  );
}

async function resolveSupabaseClient(clientOverride?: any): Promise<any | null> {
  if (clientOverride) return clientOverride;
  try {
    const mod = await import('../lib/supabase');
    return mod.supabase;
  } catch {
    return null;
  }
}

function isFusClubName(rawName: string): boolean {
  const norm = rawName.trim().toLowerCase();
  const abbr = resolveClubAbbreviation(rawName);
  return abbr === 'FUS' || norm.includes('fus') || norm.includes('fath');
}

function collectAllMatchesForGroup(
  ds: FRMFDataset,
  category: string,
  group: string
): FRMFMatch[] {
  const groupDays = ds.results?.[category]?.[group];
  if (!groupDays) return [];
  const allMatches: FRMFMatch[] = [];
  Object.keys(groupDays)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((dayKey) => {
      const dayList = groupDays[dayKey];
      if (Array.isArray(dayList)) {
        dayList.forEach((m) => {
          allMatches.push({
            ...m,
            match_day: Number(m.match_day || dayKey) || 1,
          });
        });
      }
    });
  return allMatches;
}

function toDbMatchPayload(match: FRMFMatch, season: string, category: string, group: string) {
  return {
    season: season || '2026/2027',
    category: normalizeAgeCategory(category),
    league_group: group || 'Poule Unique',
    match_day: Number(match.match_day) || 1,
    home_team: match.home_team.trim(),
    away_team: match.away_team.trim(),
    score_home: match.status === 'finished' ? (match.score_home ?? 0) : null,
    score_away: match.status === 'finished' ? (match.score_away ?? 0) : null,
    status: match.status || 'scheduled',
    match_date: match.match_date || '',
    match_time: match.match_time || '15:00',
    home_team_logo: match.home_team_logo || null,
    away_team_logo: match.away_team_logo || null,
  };
}

function fromDbRow(row: any): FRMFMatch {
  return {
    id: row.id,
    category: normalizeAgeCategory(row.category),
    group: row.league_group || 'Poule Unique',
    match_day: Number(row.match_day) || 1,
    home_team: String(row.home_team || '').trim(),
    away_team: String(row.away_team || '').trim(),
    score_home: row.score_home !== null && row.score_home !== undefined ? Number(row.score_home) : null,
    score_away: row.score_away !== null && row.score_away !== undefined ? Number(row.score_away) : null,
    status: (row.status || 'scheduled') as FRMFMatch['status'],
    match_date: row.match_date || '',
    match_time: row.match_time || '15:00',
    home_team_logo: row.home_team_logo || undefined,
    away_team_logo: row.away_team_logo || undefined,
  };
}

function deduplicatePayloadsByConflictKey<
  T extends { season: string; category: string; league_group: string; match_day: number; home_team: string; away_team: string }
>(rows: T[]): T[] {
  const seen = new Map<string, T>();
  rows.forEach((r) => {
    if (!r.home_team || !r.away_team) return;
    if (r.home_team.trim().toUpperCase() === r.away_team.trim().toUpperCase()) return;
    const key = `${r.season}__${r.category}__${r.league_group}__${r.match_day}__${r.home_team.toUpperCase()}__${r.away_team.toUpperCase()}`;
    seen.set(key, r);
  });
  return Array.from(seen.values());
}

function buildDatasetFromDbRows(rows: any[], baseDataset: FRMFDataset): FRMFDataset {
  const next: FRMFDataset = {
    metadata: {
      source: 'Supabase PostgreSQL (public.frmf_matches)',
      source_url: 'https://frmf.ma',
      extracted_at: new Date().toISOString(),
      season: (rows[0]?.season as string) || baseDataset.metadata?.season || '2026/2027',
      categories: Array.from(new Set<string>([...PLAYER_CATEGORIES])),
      _version: FRMF_DATA_VERSION,
    },
    standings: {},
    results: {},
  };

  rows.forEach((raw) => {
    const m = fromDbRow(raw);
    next.results[m.category] = next.results[m.category] || {};
    next.results[m.category][m.group] = next.results[m.category][m.group] || {};
    const dayKey = String(m.match_day);
    next.results[m.category][m.group][dayKey] = next.results[m.category][m.group][dayKey] || [];
    next.results[m.category][m.group][dayKey].push(m);
  });

  // Recalcule le classement pour chaque couple (catégorie, groupe) présent en base
  Object.keys(next.results).forEach((cat) => {
    next.standings[cat] = {};
    Object.keys(next.results[cat]).forEach((grp) => {
      next.standings[cat][grp] = frmfDataService.calculateStandingsFromResultsDataset(next, cat, grp).standings;
    });
  });

  return next;
}

function prepareRankableMatches(
  ds: FRMFDataset,
  category: string,
  group: string
): { normCategory: string; rankable: RankableMatchInput[]; expectedDays: number } {
  const normCategory = normalizeAgeCategory(category);
  const matches = collectAllMatchesForGroup(ds, normCategory, group);

  const rankable: RankableMatchInput[] = matches.map((m) => {
    const homeKey = resolveClubAbbreviation(m.home_team);
    const awayKey = resolveClubAbbreviation(m.away_team);
    const homeLogo = m.home_team_logo || getClubLogoUrl(m.home_team);
    const awayLogo = m.away_team_logo || getClubLogoUrl(m.away_team);
    return {
      homeKey,
      homeName: m.home_team.trim(),
      homeLogo,
      isHomeFus: isFusClubName(m.home_team),
      awayKey,
      awayName: m.away_team.trim(),
      awayLogo,
      isAwayFus: isFusClubName(m.away_team),
      scoreHome: m.score_home,
      scoreAway: m.score_away,
      status: m.status,
      matchDay: Number(m.match_day) || 0,
      matchDate: m.match_date,
    };
  });

  const distinctTeams = new Set<string>();
  rankable.forEach((m) => {
    distinctTeams.add(m.homeKey);
    distinctTeams.add(m.awayKey);
  });
  const maxListedDay = matches.reduce((max, m) => Math.max(max, Number(m.match_day || 0)), 0);
  const expectedDays = Math.max(
    maxListedDay,
    distinctTeams.size >= 2 ? 2 * (distinctTeams.size - 1) : 0,
    normCategory === 'U21' ? 34 : 18
  );

  return { normCategory, rankable, expectedDays };
}

export const frmfDataService = {
  /**
   * Récupère uniquement les résultats réellement saisis ou importés (aucune donnée factice pré-remplie).
   */
  getDataset(): FRMFDataset {
    try {
      const storage = getStorage();
      if (storage) {
        LEGACY_STORAGE_KEYS.forEach((oldKey) => {
          try {
            storage.removeItem(oldKey);
          } catch {
            // ignore
          }
        });
      }
      const stored = storage?.getItem(FRMF_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.metadata && parsed?.results && parsed?.metadata?._version === FRMF_DATA_VERSION) {
          return parsed as FRMFDataset;
        }
      }
    } catch (e) {
      console.warn('[frmfDataService] Erreur lecture localStorage:', e);
    }
    return createEmptyDataset();
  },

  /**
   * Persiste une copie complète du dataset en localStorage.
   */
  persistDataset(nextDataset: FRMFDataset): FRMFDataset {
    const stamped: FRMFDataset = {
      ...nextDataset,
      metadata: {
        ...nextDataset.metadata,
        extracted_at: new Date().toISOString(),
        _version: FRMF_DATA_VERSION,
      },
    };
    const storage = getStorage();
    if (storage) {
      storage.setItem(FRMF_STORAGE_KEY, JSON.stringify(stamped));
    }
    return stamped;
  },

  /**
   * Charge uniquement les résultats réellement enregistrés dans Supabase (`public.frmf_matches`).
   * N'injecte jamais de faux résultats pré-remplis si la base est vide.
   */
  async loadFromDatabase(clientOverride?: any): Promise<FRMFDatabaseMutationResult> {
    const currentLocal = this.getDataset();
    const client = await resolveSupabaseClient(clientOverride);
    if (!client) {
      return { dataset: currentLocal, savedToDb: false, dbStatus: 'error', errorMessage: 'Client Supabase indisponible.' };
    }

    try {
      // Récupère toutes les lignes par pages pour ne jamais être tronqué à 1000 lignes
      const allRows: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await client
          .from('frmf_matches')
          .select('*')
          .order('match_day', { ascending: true })
          .order('created_at', { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) {
          if (isMissingTableError(error)) {
            return {
              dataset: currentLocal,
              savedToDb: false,
              dbStatus: 'migration_required',
              errorMessage: 'Table public.frmf_matches absente dans Supabase.',
            };
          }
          return {
            dataset: currentLocal,
            savedToDb: false,
            dbStatus: 'error',
            errorMessage: error.message || 'Erreur lecture Supabase.',
          };
        }

        const chunk = Array.isArray(data) ? data : [];
        allRows.push(...chunk);
        if (chunk.length < pageSize) break;
        from += pageSize;
      }

      if (allRows.length > 0) {
        const hydrated = this.persistDataset(buildDatasetFromDbRows(allRows, currentLocal));
        return {
          dataset: hydrated,
          savedToDb: true,
          dbStatus: 'synced',
          totalDbRows: allRows.length,
        };
      }

      // Base vide : aucun faux match injecté — on nettoie aussi le cache s'il était périmé
      const emptyDs = this.persistDataset(createEmptyDataset());
      return {
        dataset: emptyDs,
        savedToDb: true,
        dbStatus: 'synced',
        totalDbRows: 0,
      };
    } catch (err: any) {
      return {
        dataset: currentLocal,
        savedToDb: false,
        dbStatus: 'error',
        errorMessage: err?.message || 'Erreur de synchronisation base de données.',
      };
    }
  },

  /**
   * Envoie l'ensemble des résultats locaux actuels vers Supabase (`public.frmf_matches`).
   */
  async syncLocalResultsToDatabase(
    datasetInput?: FRMFDataset,
    clientOverride?: any
  ): Promise<FRMFDatabaseMutationResult> {
    const source = cloneDataset(datasetInput || this.getDataset());
    const client = await resolveSupabaseClient(clientOverride);
    if (!client) {
      return { dataset: source, savedToDb: false, dbStatus: 'error', errorMessage: 'Client Supabase indisponible.' };
    }

    const season = source.metadata?.season || '2026/2027';
    const rawPayloads: ReturnType<typeof toDbMatchPayload>[] = [];

    Object.keys(source.results || {}).forEach((cat) => {
      Object.keys(source.results[cat] || {}).forEach((grp) => {
        Object.keys(source.results[cat][grp] || {}).forEach((dayKey) => {
          (source.results[cat][grp][dayKey] || []).forEach((m) => {
            rawPayloads.push(toDbMatchPayload({ ...m, match_day: Number(m.match_day || dayKey) || 1 }, season, cat, grp));
          });
        });
      });
    });

    const deduped = deduplicatePayloadsByConflictKey(rawPayloads);
    if (deduped.length === 0) {
      return { dataset: source, savedToDb: true, dbStatus: 'synced', totalDbRows: 0 };
    }

    try {
      const insertedRows: any[] = [];
      const chunkSize = 200;
      for (let i = 0; i < deduped.length; i += chunkSize) {
        const chunk = deduped.slice(i, i + chunkSize);
        const { data, error } = await client
          .from('frmf_matches')
          .upsert(chunk, { onConflict: 'season,category,league_group,match_day,home_team,away_team' })
          .select();

        if (error) {
          if (isMissingTableError(error)) {
            return {
              dataset: source,
              savedToDb: false,
              dbStatus: 'migration_required',
              errorMessage: 'Table public.frmf_matches absente dans Supabase.',
            };
          }
          return {
            dataset: source,
            savedToDb: false,
            dbStatus: 'error',
            errorMessage: error.message,
          };
        }
        if (Array.isArray(data)) insertedRows.push(...data);
      }

      if (insertedRows.length > 0) {
        const syncedDataset = this.persistDataset(buildDatasetFromDbRows(insertedRows, source));
        return {
          dataset: syncedDataset,
          savedToDb: true,
          dbStatus: 'synced',
          totalDbRows: insertedRows.length,
        };
      }

      return { dataset: source, savedToDb: true, dbStatus: 'synced', totalDbRows: deduped.length };
    } catch (err: any) {
      return {
        dataset: source,
        savedToDb: false,
        dbStatus: 'error',
        errorMessage: err?.message || 'Erreur upsert Supabase.',
      };
    }
  },

  /**
   * Importe uniquement les RÉSULTATS HTML d'une journée (synchrone local).
   */
  applyResultsHtmlImport(params: ResultsHtmlImportParams): FRMFDataset {
    const { category, group, resultsDay, matches, season } = params;
    const normCategory = normalizeAgeCategory(category);
    const current = cloneDataset(this.getDataset());

    const existingCats = new Set<string>(this.getCategories());
    existingCats.add(normCategory);

    current.metadata = {
      source: 'Fédération Royale Marocaine de Football (FRMF)',
      source_url: 'https://frmf.ma',
      extracted_at: new Date().toISOString(),
      season: season || current.metadata?.season || '2026/2027',
      categories: Array.from(existingCats),
      _version: FRMF_DATA_VERSION,
    };

    current.results = current.results || {};
    current.results[normCategory] = current.results[normCategory] || {};
    current.results[normCategory][group] = current.results[normCategory][group] || {};
    current.results[normCategory][group][String(resultsDay)] = matches.map((m) => ({
      ...m,
      category: normCategory,
      group,
      match_day: Number(resultsDay) || 1,
    }));

    current.standings = current.standings || {};
    current.standings[normCategory] = current.standings[normCategory] || {};
    current.standings[normCategory][group] = this.calculateStandingsFromResultsDataset(
      current,
      normCategory,
      group
    ).standings;

    return this.persistDataset(current);
  },

  /**
   * Importe les résultats HTML d'une journée ET les enregistre immédiatement dans Supabase (`public.frmf_matches`).
   */
  async applyResultsHtmlImportAsync(
    params: ResultsHtmlImportParams,
    clientOverride?: any
  ): Promise<FRMFDatabaseMutationResult> {
    const updatedLocal = this.applyResultsHtmlImport(params);
    const normCategory = normalizeAgeCategory(params.category);
    const season = params.season || updatedLocal.metadata?.season || '2026/2027';
    const dayNumber = Number(params.resultsDay) || 1;
    const client = await resolveSupabaseClient(clientOverride);

    if (!client) {
      return {
        dataset: updatedLocal,
        savedToDb: false,
        dbStatus: 'error',
        errorMessage: 'Client Supabase indisponible.',
      };
    }

    try {
      // 1. Remplace uniquement la journée ciblée de cette catégorie & poule dans Supabase
      const { error: delError } = await client
        .from('frmf_matches')
        .delete()
        .eq('season', season)
        .eq('category', normCategory)
        .eq('league_group', params.group)
        .eq('match_day', dayNumber);

      if (delError) {
        if (isMissingTableError(delError)) {
          return {
            dataset: updatedLocal,
            savedToDb: false,
            dbStatus: 'migration_required',
            errorMessage: 'Table public.frmf_matches absente dans Supabase.',
          };
        }
        return {
          dataset: updatedLocal,
          savedToDb: false,
          dbStatus: 'error',
          errorMessage: delError.message,
        };
      }

      const payloads = deduplicatePayloadsByConflictKey(
        params.matches.map((m) =>
          toDbMatchPayload({ ...m, match_day: dayNumber }, season, normCategory, params.group)
        )
      );

      let savedRows: FRMFMatch[] = params.matches;
      if (payloads.length > 0) {
        const { data: inserted, error: insError } = await client
          .from('frmf_matches')
          .insert(payloads)
          .select();

        if (insError) {
          return {
            dataset: updatedLocal,
            savedToDb: false,
            dbStatus: isMissingTableError(insError) ? 'migration_required' : 'error',
            errorMessage: insError.message,
          };
        }
        if (Array.isArray(inserted) && inserted.length > 0) {
          savedRows = inserted.map(fromDbRow);
        }
      }

      const finalDs = cloneDataset(updatedLocal);
      finalDs.results[normCategory][params.group][String(dayNumber)] = savedRows;
      finalDs.standings[normCategory][params.group] = this.calculateStandingsFromResultsDataset(
        finalDs,
        normCategory,
        params.group
      ).standings;

      return {
        dataset: this.persistDataset(finalDs),
        savedToDb: true,
        dbStatus: 'synced',
      };
    } catch (err: any) {
      return {
        dataset: updatedLocal,
        savedToDb: false,
        dbStatus: 'error',
        errorMessage: err?.message || 'Erreur lors de la sauvegarde en base de données.',
      };
    }
  },

  /**
   * Crée ou modifie un match dans les résultats locaux et recalcule le classement.
   */
  upsertMatch(
    category: string,
    group: string,
    match: FRMFMatch,
    editTarget?: { originalDay: number; originalIndex: number }
  ): FRMFDataset {
    const normCategory = normalizeAgeCategory(category);
    const current = cloneDataset(this.getDataset());
    current.results = current.results || {};
    current.results[normCategory] = current.results[normCategory] || {};
    current.results[normCategory][group] = current.results[normCategory][group] || {};

    const normalizedMatch: FRMFMatch = {
      ...match,
      category: normCategory,
      group,
      match_day: Number(match.match_day) || 1,
      score_home: match.status === 'finished' ? (match.score_home ?? 0) : null,
      score_away: match.status === 'finished' ? (match.score_away ?? 0) : null,
    };

    const targetDayKey = String(normalizedMatch.match_day);

    if (editTarget) {
      const origDayKey = String(editTarget.originalDay);
      const origList = [...(current.results[normCategory][group][origDayKey] || [])];
      if (origDayKey === targetDayKey) {
        if (editTarget.originalIndex >= 0 && editTarget.originalIndex < origList.length) {
          origList[editTarget.originalIndex] = normalizedMatch;
        } else {
          origList.push(normalizedMatch);
        }
        current.results[normCategory][group][targetDayKey] = origList;
      } else {
        if (editTarget.originalIndex >= 0 && editTarget.originalIndex < origList.length) {
          origList.splice(editTarget.originalIndex, 1);
          current.results[normCategory][group][origDayKey] = origList;
        }
        const destList = [...(current.results[normCategory][group][targetDayKey] || [])];
        destList.push(normalizedMatch);
        current.results[normCategory][group][targetDayKey] = destList;
      }
    } else {
      const destList = [...(current.results[normCategory][group][targetDayKey] || [])];
      destList.push(normalizedMatch);
      current.results[normCategory][group][targetDayKey] = destList;
    }

    current.standings = current.standings || {};
    current.standings[normCategory] = current.standings[normCategory] || {};
    current.standings[normCategory][group] = this.calculateStandingsFromResultsDataset(
      current,
      normCategory,
      group
    ).standings;

    return this.persistDataset(current);
  },

  /**
   * Crée ou modifie un match ET le persiste dans Supabase (`public.frmf_matches`).
   */
  async upsertMatchAsync(
    category: string,
    group: string,
    match: FRMFMatch,
    editTarget?: { originalDay: number; originalIndex: number; existingId?: string },
    clientOverride?: any
  ): Promise<FRMFDatabaseMutationResult> {
    const updatedLocal = this.upsertMatch(category, group, match, editTarget);
    const normCategory = normalizeAgeCategory(category);
    const season = updatedLocal.metadata?.season || '2026/2027';
    const client = await resolveSupabaseClient(clientOverride);

    if (!client) {
      return { dataset: updatedLocal, savedToDb: false, dbStatus: 'error', errorMessage: 'Client Supabase indisponible.' };
    }

    const payload = toDbMatchPayload(match, season, normCategory, group);
    const targetId = editTarget?.existingId || match.id;

    try {
      let dbRow: any = null;
      if (targetId) {
        const { data, error } = await client
          .from('frmf_matches')
          .update(payload)
          .eq('id', targetId)
          .select()
          .single();

        if (error) {
          return {
            dataset: updatedLocal,
            savedToDb: false,
            dbStatus: isMissingTableError(error) ? 'migration_required' : 'error',
            errorMessage: error.message,
          };
        }
        dbRow = data;
      } else {
        const { data, error } = await client
          .from('frmf_matches')
          .upsert([payload], { onConflict: 'season,category,league_group,match_day,home_team,away_team' })
          .select()
          .single();

        if (error) {
          return {
            dataset: updatedLocal,
            savedToDb: false,
            dbStatus: isMissingTableError(error) ? 'migration_required' : 'error',
            errorMessage: error.message,
          };
        }
        dbRow = data;
      }

      if (dbRow?.id) {
        const hydratedMatch = fromDbRow(dbRow);
        const dayKey = String(hydratedMatch.match_day);
        const finalDs = cloneDataset(updatedLocal);
        const list = [...(finalDs.results?.[normCategory]?.[group]?.[dayKey] || [])];
        const matchIdx = list.findIndex(
          (item) =>
            (item.id && item.id === hydratedMatch.id) ||
            (item.home_team.toUpperCase() === hydratedMatch.home_team.toUpperCase() &&
              item.away_team.toUpperCase() === hydratedMatch.away_team.toUpperCase())
        );
        if (matchIdx >= 0) {
          list[matchIdx] = hydratedMatch;
          finalDs.results[normCategory][group][dayKey] = list;
          return {
            dataset: this.persistDataset(finalDs),
            savedToDb: true,
            dbStatus: 'synced',
          };
        }
      }

      return { dataset: updatedLocal, savedToDb: true, dbStatus: 'synced' };
    } catch (err: any) {
      return {
        dataset: updatedLocal,
        savedToDb: false,
        dbStatus: 'error',
        errorMessage: err?.message || 'Erreur sauvegarde match en base.',
      };
    }
  },

  /**
   * Supprime un match des résultats locaux.
   */
  deleteMatch(category: string, group: string, day: number, index: number): FRMFDataset {
    const normCategory = normalizeAgeCategory(category);
    const current = cloneDataset(this.getDataset());
    const dayKey = String(day);
    const list = [...(current.results?.[normCategory]?.[group]?.[dayKey] || [])];
    if (index < 0 || index >= list.length) {
      return current;
    }
    list.splice(index, 1);
    current.results[normCategory] = current.results[normCategory] || {};
    current.results[normCategory][group] = current.results[normCategory][group] || {};
    current.results[normCategory][group][dayKey] = list;

    current.standings = current.standings || {};
    current.standings[normCategory] = current.standings[normCategory] || {};
    current.standings[normCategory][group] = this.calculateStandingsFromResultsDataset(
      current,
      normCategory,
      group
    ).standings;

    return this.persistDataset(current);
  },

  /**
   * Supprime un match dans le cache local ET dans Supabase (`public.frmf_matches`).
   */
  async deleteMatchAsync(
    category: string,
    group: string,
    day: number,
    index: number,
    matchSnapshot?: FRMFMatch,
    clientOverride?: any
  ): Promise<FRMFDatabaseMutationResult> {
    const beforeDs = this.getDataset();
    const normCategory = normalizeAgeCategory(category);
    const season = beforeDs.metadata?.season || '2026/2027';
    const target = matchSnapshot || beforeDs.results?.[normCategory]?.[group]?.[String(day)]?.[index];
    const updatedLocal = this.deleteMatch(category, group, day, index);

    const client = await resolveSupabaseClient(clientOverride);
    if (!client) {
      return { dataset: updatedLocal, savedToDb: false, dbStatus: 'error', errorMessage: 'Client Supabase indisponible.' };
    }

    try {
      if (target?.id) {
        const { error } = await client.from('frmf_matches').delete().eq('id', target.id);
        if (error) {
          return {
            dataset: updatedLocal,
            savedToDb: false,
            dbStatus: isMissingTableError(error) ? 'migration_required' : 'error',
            errorMessage: error.message,
          };
        }
      } else if (target) {
        const { error } = await client
          .from('frmf_matches')
          .delete()
          .eq('season', season)
          .eq('category', normCategory)
          .eq('league_group', group)
          .eq('match_day', day)
          .eq('home_team', target.home_team)
          .eq('away_team', target.away_team);

        if (error) {
          return {
            dataset: updatedLocal,
            savedToDb: false,
            dbStatus: isMissingTableError(error) ? 'migration_required' : 'error',
            errorMessage: error.message,
          };
        }
      }

      return { dataset: updatedLocal, savedToDb: true, dbStatus: 'synced' };
    } catch (err: any) {
      return {
        dataset: updatedLocal,
        savedToDb: false,
        dbStatus: 'error',
        errorMessage: err?.message || 'Erreur suppression match en base.',
      };
    }
  },

  /**
   * Supprime tous les matchs d'une journée donnée (local + Supabase).
   */
  async clearMatchDayAsync(
    category: string,
    group: string,
    day: number,
    clientOverride?: any
  ): Promise<FRMFDatabaseMutationResult> {
    const normCategory = normalizeAgeCategory(category);
    const current = cloneDataset(this.getDataset());
    const season = current.metadata?.season || '2026/2027';

    if (current.results?.[normCategory]?.[group]) {
      delete current.results[normCategory][group][String(day)];
    }
    current.standings[normCategory] = current.standings[normCategory] || {};
    current.standings[normCategory][group] = this.calculateStandingsFromResultsDataset(
      current,
      normCategory,
      group
    ).standings;

    const updatedLocal = this.persistDataset(current);
    const client = await resolveSupabaseClient(clientOverride);
    if (!client) {
      return { dataset: updatedLocal, savedToDb: false, dbStatus: 'error', errorMessage: 'Client Supabase indisponible.' };
    }

    try {
      const { error } = await client
        .from('frmf_matches')
        .delete()
        .eq('season', season)
        .eq('category', normCategory)
        .eq('league_group', group)
        .eq('match_day', day);

      if (error) {
        return {
          dataset: updatedLocal,
          savedToDb: false,
          dbStatus: isMissingTableError(error) ? 'migration_required' : 'error',
          errorMessage: error.message,
        };
      }
      return { dataset: updatedLocal, savedToDb: true, dbStatus: 'synced' };
    } catch (err: any) {
      return {
        dataset: updatedLocal,
        savedToDb: false,
        dbStatus: 'error',
        errorMessage: err?.message || 'Erreur suppression journée en base.',
      };
    }
  },

  /**
   * Supprime tous les matchs d'une catégorie & poule (local + Supabase).
   */
  async clearCategoryGroupAsync(
    category: string,
    group: string,
    clientOverride?: any
  ): Promise<FRMFDatabaseMutationResult> {
    const normCategory = normalizeAgeCategory(category);
    const current = cloneDataset(this.getDataset());
    const season = current.metadata?.season || '2026/2027';

    if (current.results?.[normCategory]) {
      delete current.results[normCategory][group];
    }
    if (current.standings?.[normCategory]) {
      delete current.standings[normCategory][group];
    }

    const updatedLocal = this.persistDataset(current);
    const client = await resolveSupabaseClient(clientOverride);
    if (!client) {
      return { dataset: updatedLocal, savedToDb: false, dbStatus: 'error', errorMessage: 'Client Supabase indisponible.' };
    }

    try {
      const { error } = await client
        .from('frmf_matches')
        .delete()
        .eq('season', season)
        .eq('category', normCategory)
        .eq('league_group', group);

      if (error) {
        return {
          dataset: updatedLocal,
          savedToDb: false,
          dbStatus: isMissingTableError(error) ? 'migration_required' : 'error',
          errorMessage: error.message,
        };
      }
      return { dataset: updatedLocal, savedToDb: true, dbStatus: 'synced' };
    } catch (err: any) {
      return {
        dataset: updatedLocal,
        savedToDb: false,
        dbStatus: 'error',
        errorMessage: err?.message || 'Erreur suppression poule en base.',
      };
    }
  },

  /**
   * Liste complète des catégories sélectionnables (toutes les catégories du club + celles du dataset).
   */
  getCategories(): string[] {
    const ds = this.getDataset();
    const set = new Set<string>([...PLAYER_CATEGORIES]);
    (ds.metadata?.categories || []).forEach((c) => {
      if (c) set.add(normalizeAgeCategory(c));
    });
    Object.keys(ds.results || {}).forEach((c) => {
      if (c) set.add(normalizeAgeCategory(c));
    });
    return Array.from(set);
  },

  /**
   * Groupes / poules disponibles pour une catégorie donnée.
   */
  getGroups(category: string): string[] {
    const ds = this.getDataset();
    const normCategory = normalizeAgeCategory(category);
    const resultGroups = Object.keys(ds.results?.[normCategory] || {});
    const defaults =
      normCategory === 'U21' || normCategory === 'SENIOR' || normCategory === 'U23'
        ? STANDARD_GROUPS_SINGLE_FIRST
        : STANDARD_GROUPS_NORTH_SOUTH;

    const merged = new Set<string>();
    resultGroups.forEach((g) => merged.add(g));
    defaults.forEach((g) => merged.add(g));
    return Array.from(merged);
  },

  /**
   * Nombre total de journées pour une catégorie (et poule optionnelle).
   */
  getTotalDays(category: string, group?: string): number {
    const normCategory = normalizeAgeCategory(category);
    const ds = this.getDataset();
    let maxDay = normCategory === 'U21' ? 34 : 18;

    const inspectGroup = (grpData?: Record<string, FRMFMatch[]>) => {
      if (!grpData) return;
      const teamKeys = new Set<string>();
      Object.keys(grpData).forEach((k) => {
        const d = Number(k);
        if (Number.isFinite(d) && d > maxDay) maxDay = d;
        (grpData[k] || []).forEach((m) => {
          if (m.home_team) teamKeys.add(resolveClubAbbreviation(m.home_team));
          if (m.away_team) teamKeys.add(resolveClubAbbreviation(m.away_team));
        });
      });
      if (teamKeys.size >= 2) {
        const roundRobinDays = 2 * (teamKeys.size - 1);
        if (roundRobinDays > maxDay) maxDay = roundRobinDays;
      }
    };

    if (group) {
      inspectGroup(ds.results?.[normCategory]?.[group]);
    } else {
      Object.values(ds.results?.[normCategory] || {}).forEach((grp) => inspectGroup(grp));
    }

    return maxDay;
  },

  /**
   * Calcule dynamiquement le classement d'une catégorie et d'un groupe
   * exclusivement à partir des résultats de matchs saisis ou importés.
   * Si `upToMatchDay` est fourni, calcule le classement cumulatif arrêté à cette journée.
   */
  calculateStandingsFromResultsDataset(
    ds: FRMFDataset,
    category: string,
    group: string,
    upToMatchDay?: number
  ): FRMFCalculatedStandingsResponse {
    const { normCategory, rankable, expectedDays } = prepareRankableMatches(ds, category, group);
    const hasDayCap = typeof upToMatchDay === 'number' && upToMatchDay > 0;
    const targetRankable = hasDayCap
      ? rankable.filter((m) => Number(m.matchDay || 0) <= upToMatchDay)
      : rankable;

    if (targetRankable.length === 0) {
      return {
        standings: [],
        meta: {
          isChampionshipCompleted: false,
          totalTeams: 0,
          finishedMatchesCount: 0,
          scheduledMatchesCount: 0,
          expectedTotalDays: normCategory === 'U21' ? 34 : 18,
          maxFinishedDay: 0,
          hasTiedPoints: false,
          hasAnyH2HActivated: false,
          hasAnyProvisionalTie: false,
        },
      };
    }

    const hasFutureMatchesBeyondCap = hasDayCap
      ? rankable.some((m) => Number(m.matchDay || 0) > upToMatchDay)
      : false;

    const computed = computeRankedStandingsFromMatches(targetRankable, {
      expectedTotalDays: expectedDays,
      championshipCompletedOverride: hasFutureMatchesBeyondCap ? false : undefined,
    });

    // Calcul de l'évolution par rapport à la journée terminée précédente
    const finishedDays = Array.from(
      new Set(
        targetRankable
          .filter((m) => isRankableMatchFinished(m) && Number(m.matchDay || 0) > 0)
          .map((m) => Number(m.matchDay || 0))
      )
    ).sort((a, b) => a - b);

    const prevRankMap = new Map<string, number>();
    if (finishedDays.length >= 2) {
      const prevDay = finishedDays[finishedDays.length - 2];
      const prevMatches = targetRankable.filter((m) => Number(m.matchDay || 0) <= prevDay);
      const prevComputed = computeRankedStandingsFromMatches(prevMatches, {
        expectedTotalDays: expectedDays,
        championshipCompletedOverride: false,
      });
      prevComputed.standings.forEach((r) => {
        if (r.played > 0) prevRankMap.set(r.team_key, r.position);
      });
    }

    return {
      standings: computed.standings.map((row) => {
        const prevRank = prevRankMap.get(row.team_key);
        const positionDelta =
          row.played > 0 && prevRank !== undefined ? prevRank - row.position : null;
        return {
          position: row.position,
          team_key: row.team_key,
          team_name: row.team_name,
          is_fus: row.is_fus,
          points: row.points,
          played: row.played,
          won: row.won,
          drawn: row.drawn,
          lost: row.lost,
          goals_for: row.goals_for,
          goals_against: row.goals_against,
          goal_difference: row.goal_difference,
          club_logo: row.club_logo || undefined,
          form: row.form,
          is_tied_on_points: row.is_tied_on_points,
          h2h_activated: row.h2h_activated,
          tie_breaker_rule: row.tie_breaker_rule,
          position_delta: positionDelta,
        };
      }),
      meta: computed.meta,
    };
  },

  /**
   * Liste ordonnée des journées ayant au moins un match terminé pour cette catégorie & poule.
   */
  getFinishedMatchDays(category: string, group: string, dsOverride?: FRMFDataset): number[] {
    const ds = dsOverride || this.getDataset();
    const { rankable } = prepareRankableMatches(ds, category, group);
    return Array.from(
      new Set(
        rankable
          .filter((m) => isRankableMatchFinished(m) && Number(m.matchDay || 0) > 0)
          .map((m) => Number(m.matchDay || 0))
      )
    ).sort((a, b) => a - b);
  },

  /**
   * Retourne le classement calculé à partir des résultats pour une catégorie et un groupe donnés
   * (optionnellement arrêté à une journée précise `upToMatchDay`).
   */
  getCalculatedStandings(
    category: string,
    group: string,
    dsOverride?: FRMFDataset,
    upToMatchDay?: number
  ): FRMFCalculatedStandingsResponse {
    const ds = dsOverride || this.getDataset();
    return this.calculateStandingsFromResultsDataset(ds, category, group, upToMatchDay);
  },

  /**
   * Classement calculé pour une catégorie et un groupe donnés.
   */
  getStandings(category: string, group: string): FRMFStandingTeam[] {
    return this.getCalculatedStandings(category, group).standings;
  },

  /**
   * Résultats pour une catégorie, un groupe et une journée donnés.
   */
  getResults(category: string, group: string, day: number): FRMFMatch[] {
    const ds = this.getDataset();
    const normCategory = normalizeAgeCategory(category);
    return ds.results?.[normCategory]?.[group]?.[String(day)] || [];
  },
};
