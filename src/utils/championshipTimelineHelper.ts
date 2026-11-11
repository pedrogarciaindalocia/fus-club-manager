import { normalizeAgeCategory } from '../constants';
import {
  buildMyClubContext,
  isMyClubName,
  resolveClubAbbreviation,
} from '../features/match-management/utils/frmfMatchSheetParser';
import { getClubLogoUrl } from './clubLogos';
import { calculateStandings, isFriendlyOrScrimmage } from './standingsCalculator';
import {
  computeRankedStandingsFromMatches,
  isRankableMatchFinished,
  type RankableMatchInput,
  type TieBreakerRuleApplied,
} from './standingsRankingEngine';
import type { FRMFDataset, FRMFMatch } from '../services/frmfDataService';
import type { Club, Match, OpponentMatch } from '../types';

export interface TimelineMatchItem {
  id?: string;
  date: string;
  journee: number;
  domicile: string;
  domicileName: string;
  domicileLogo: string;
  isDomicileFus: boolean;
  exterieur: string;
  exterieurName: string;
  exterieurLogo: string;
  isExterieurFus: boolean;
  scoreDom: number | null;
  scoreExt: number | null;
  status: string;
}

export interface TimelineClubItem {
  id: string;
  nom: string;
  shortName: string;
  logoUrl: string | null;
  isFus: boolean;
}

export interface TimelineStandingRow {
  position: number;
  club_id: string;
  team_key: string;
  team_name: string;
  short_name: string;
  club_logo: string | null;
  is_fus: boolean;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  form: Array<'W' | 'D' | 'L'>;
  is_tied_on_points: boolean;
  h2h_activated: boolean;
  tie_breaker_rule: TieBreakerRuleApplied;
  position_delta: number | null;
}

export interface ChronologicalTimelineSnapshot {
  source: 'frmf' | 'supabase';
  activeJournee: number;
  latestPlayedJournee: number;
  firstPlayedJournee: number;
  maxJournee: number;
  finishedDays: number[];
  standings: TimelineStandingRow[];
  isChampionshipCompleted: boolean;
  finishedMatchesCount: number;
  matches: TimelineMatchItem[];
  clubs: TimelineClubItem[];
}

/**
 * Extrait un numéro de journée (1..38) à partir d'un texte ("J3", "Journée 12", "12") ou d'un nombre.
 */
export function extractMatchDayNumber(roundStr?: string | number | null): number | null {
  if (typeof roundStr === 'number' && Number.isFinite(roundStr) && roundStr > 0) {
    return Math.round(roundStr);
  }
  if (typeof roundStr === 'string' && roundStr.trim().length > 0) {
    const match = roundStr.match(/\d+/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 50) {
        return parsed;
      }
    }
  }
  return null;
}

function makeShortName(name: string): string {
  const clean = (name || '').trim();
  if (!clean) return 'CLB';
  const abbr = resolveClubAbbreviation(clean);
  if (abbr && abbr.length <= 5 && !abbr.includes(' ')) {
    return abbr;
  }
  return clean.slice(0, 4).toUpperCase();
}

/**
 * Sélectionne automatiquement la poule FRMF la plus pertinente pour une catégorie donnée :
 * priorise d'abord la poule contenant des matchs du FUS Rabat (ex: U18 Groupe Sud vs Groupe Nord),
 * puis 'Poule Unique', puis la première poule contenant des matchs.
 */
export function pickDefaultFrmfGroupForCategory(
  dataset: FRMFDataset | null | undefined,
  category: string,
  availableGroups: string[],
  mainClub?: Club | null
): string {
  const normCategory = normalizeAgeCategory(category);
  const catResults = dataset?.results?.[normCategory] || {};
  const myClubCtx = buildMyClubContext(mainClub as any);

  const nonEmptyGroups: string[] = [];
  for (const grp of availableGroups) {
    const grpData = catResults[grp];
    if (grpData && Object.values(grpData).some((arr) => Array.isArray(arr) && arr.length > 0)) {
      nonEmptyGroups.push(grp);
    }
  }

  for (const grp of nonEmptyGroups) {
    const matchesInGroup = Object.values(catResults[grp] || {}).flat();
    const hasFus = matchesInGroup.some(
      (m) =>
        isMyClubName(m.home_team, myClubCtx) ||
        isMyClubName(m.away_team, myClubCtx) ||
        resolveClubAbbreviation(m.home_team) === 'FUS' ||
        resolveClubAbbreviation(m.away_team) === 'FUS'
    );
    if (hasFus) {
      return grp;
    }
  }

  if (nonEmptyGroups.includes('Poule Unique')) {
    return 'Poule Unique';
  }
  if (nonEmptyGroups.length > 0) {
    return nonEmptyGroups[0];
  }
  return availableGroups[0] || 'Poule Unique';
}

/**
 * Collecte les matchs FRMF normalisés pour une catégorie et une poule données.
 */
export function collectFrmfGroupMatches(
  dataset: FRMFDataset | null | undefined,
  category: string,
  group: string
): FRMFMatch[] {
  const normCategory = normalizeAgeCategory(category);
  const grpData = dataset?.results?.[normCategory]?.[group];
  if (!grpData) return [];

  const list: FRMFMatch[] = [];
  Object.keys(grpData).forEach((dayKey) => {
    const dayNum = Number(dayKey);
    const items = grpData[dayKey];
    if (!Array.isArray(items)) return;
    items.forEach((m) => {
      list.push({
        ...m,
        match_day: Number(m.match_day) > 0 ? Number(m.match_day) : Number.isFinite(dayNum) ? dayNum : 1,
      });
    });
  });
  return list;
}

/**
 * Pour les matchs Supabase (tables `matches` / `opponent_matches`) ne portant pas toujours un numéro de journée explicite,
 * attribue un numéro de journée chronologique basé sur `round_name` ou par grappes temporelles (week-ends espacés >= 4 jours).
 */
export function assignChronologicalMatchDays<T extends { round_name?: string | null; match_date?: string | null }>(
  items: T[]
): Array<T & { resolvedDay: number }> {
  const withDates = items.map((item) => ({
    item,
    explicit: extractMatchDayNumber(item.round_name),
    timestamp: item.match_date ? Date.parse(item.match_date) : NaN,
  }));

  const explicitDated = withDates.filter(
    (x): x is { item: T; explicit: number; timestamp: number } =>
      x.explicit !== null && Number.isFinite(x.timestamp)
  );

  const fallbackTimestamps = Array.from(
    new Set(
      withDates
        .filter((x) => x.explicit === null && Number.isFinite(x.timestamp))
        .map((x) => x.timestamp)
    )
  ).sort((a, b) => a - b);

  const usedDays = new Set<number>(
    withDates.map((x) => x.explicit).filter((d): d is number => d !== null)
  );

  const allocateNextFreeDay = (minCandidate = 1): number => {
    let d = Math.max(1, minCandidate);
    while (usedDays.has(d)) d += 1;
    usedDays.add(d);
    return d;
  };

  // Regrouper les timestamps sans round_name en journées distantes d'au moins 4 jours
  const tsToClusterDay = new Map<number, number>();
  let currentClusterDay = 0;
  let clusterAnchorTs: number | null = null;
  const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

  fallbackTimestamps.forEach((ts) => {
    // Si un match avec journée explicite se joue le même week-end (< 4 jours), réutiliser cette journée
    const nearbyExplicit = explicitDated.find((e) => Math.abs(e.timestamp - ts) < FOUR_DAYS_MS);
    if (nearbyExplicit) {
      tsToClusterDay.set(ts, nearbyExplicit.explicit);
      clusterAnchorTs = ts;
      return;
    }

    if (clusterAnchorTs === null || ts - clusterAnchorTs >= FOUR_DAYS_MS) {
      currentClusterDay = allocateNextFreeDay(currentClusterDay + 1);
      clusterAnchorTs = ts;
    }
    tsToClusterDay.set(ts, currentClusterDay);
  });

  return withDates.map(({ item, explicit, timestamp }) => ({
    ...item,
    resolvedDay: explicit ?? (Number.isFinite(timestamp) ? tsToClusterDay.get(timestamp) || 1 : 1),
  }));
}

function buildSnapshotFromNormalizedMatches(params: {
  source: 'frmf' | 'supabase';
  matches: TimelineMatchItem[];
  clubsMap: Map<string, TimelineClubItem>;
  upToJournee?: number | null;
  minExpectedDays: number;
}): ChronologicalTimelineSnapshot {
  const { source, matches, clubsMap, upToJournee, minExpectedDays } = params;

  const clubs = Array.from(clubsMap.values());
  const roundRobinDays = clubs.length >= 2 ? 2 * (clubs.length - 1) : 0;
  const maxListedDay = matches.reduce((max, m) => Math.max(max, m.journee), 0);
  const maxJournee = Math.max(minExpectedDays, roundRobinDays, maxListedDay, 1);

  const rankableAll: RankableMatchInput[] = matches.map((m) => ({
    id: m.id,
    homeKey: m.domicile,
    homeName: m.domicileName,
    homeLogo: m.domicileLogo || null,
    isHomeFus: m.isDomicileFus,
    awayKey: m.exterieur,
    awayName: m.exterieurName,
    awayLogo: m.exterieurLogo || null,
    isAwayFus: m.isExterieurFus,
    scoreHome: m.scoreDom,
    scoreAway: m.scoreExt,
    status: m.status,
    matchDay: m.journee,
    matchDate: m.date,
  }));

  const finishedDays = Array.from(
    new Set(
      rankableAll
        .filter((m) => isRankableMatchFinished(m) && Number(m.matchDay || 0) > 0)
        .map((m) => Number(m.matchDay || 0))
    )
  ).sort((a, b) => a - b);

  const firstPlayedJournee = finishedDays.length > 0 ? finishedDays[0] : 1;
  const latestPlayedJournee = finishedDays.length > 0 ? finishedDays[finishedDays.length - 1] : 1;
  const activeJournee =
    typeof upToJournee === 'number' && Number.isFinite(upToJournee) && upToJournee > 0
      ? Math.min(Math.max(1, Math.round(upToJournee)), maxJournee)
      : latestPlayedJournee;

  const targetRankable = rankableAll.filter((m) => Number(m.matchDay || 0) <= activeJournee);

  if (targetRankable.length === 0) {
    return {
      source,
      activeJournee,
      latestPlayedJournee,
      firstPlayedJournee,
      maxJournee,
      finishedDays,
      standings: [],
      isChampionshipCompleted: false,
      finishedMatchesCount: 0,
      matches,
      clubs,
    };
  }

  const hasFutureMatchesBeyondCap = rankableAll.some((m) => Number(m.matchDay || 0) > activeJournee);

  const computed = computeRankedStandingsFromMatches(targetRankable, {
    expectedTotalDays: maxJournee,
    championshipCompletedOverride: hasFutureMatchesBeyondCap ? false : undefined,
  });

  // Calcul du delta de classement par rapport à la journée terminée précédente (< activeJournee)
  const finishedDaysUpToActive = finishedDays.filter((d) => d <= activeJournee);
  const prevRankMap = new Map<string, number>();
  if (finishedDaysUpToActive.length >= 2) {
    const prevDay = finishedDaysUpToActive[finishedDaysUpToActive.length - 2];
    const prevRankable = rankableAll.filter((m) => Number(m.matchDay || 0) <= prevDay);
    const prevComputed = computeRankedStandingsFromMatches(prevRankable, {
      expectedTotalDays: maxJournee,
      championshipCompletedOverride: false,
    });
    prevComputed.standings.forEach((r) => {
      if (r.played > 0) prevRankMap.set(r.team_key, r.position);
    });
  }

  const standings: TimelineStandingRow[] = computed.standings.map((row) => {
    const clubMeta = clubsMap.get(row.team_key);
    const prevRank = prevRankMap.get(row.team_key);
    const positionDelta = row.played > 0 && prevRank !== undefined ? prevRank - row.position : null;

    return {
      position: row.position,
      club_id: clubMeta?.id || row.team_key,
      team_key: row.team_key,
      team_name: row.team_name,
      short_name: clubMeta?.shortName || makeShortName(row.team_name),
      club_logo: row.club_logo || clubMeta?.logoUrl || null,
      is_fus: row.is_fus,
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      goals_for: row.goals_for,
      goals_against: row.goals_against,
      goal_difference: row.goal_difference,
      points: row.points,
      form: row.form,
      is_tied_on_points: row.is_tied_on_points,
      h2h_activated: row.h2h_activated,
      tie_breaker_rule: row.tie_breaker_rule,
      position_delta: positionDelta,
    };
  });

  return {
    source,
    activeJournee,
    latestPlayedJournee,
    firstPlayedJournee,
    maxJournee,
    finishedDays,
    standings,
    isChampionshipCompleted: computed.meta.isChampionshipCompleted,
    finishedMatchesCount: computed.meta.finishedMatchesCount,
    matches,
    clubs,
  };
}

/**
 * Construit les données chronologiques unifiées (Classement par journée + Attaque vs Défense)
 * depuis la source FRMF (`frmf_matches`) ou, à défaut, depuis les matchs Supabase (`matches` + `opponent_matches`).
 */
export function buildChampionshipTimelineSnapshot(params: {
  frmfMatches?: FRMFMatch[];
  fusMatches?: Match[];
  opponentMatches?: OpponentMatch[];
  allClubs?: Club[];
  mainClub?: Club | null;
  leagueId?: string;
  category: string;
  upToJournee?: number | null;
  minExpectedDays?: number;
}): ChronologicalTimelineSnapshot {
  const {
    frmfMatches = [],
    fusMatches = [],
    opponentMatches = [],
    allClubs = [],
    mainClub = null,
    leagueId,
    category,
    upToJournee,
    minExpectedDays,
  } = params;

  const normCategory = normalizeAgeCategory(category);
  const defaultMinDays = minExpectedDays ?? (normCategory === 'U21' ? 30 : 18);
  const myClubCtx = buildMyClubContext(mainClub as any);

  // 1. Source prioritaire : résultats FRMF saisis/importés pour la catégorie/poule
  if (frmfMatches.length > 0) {
    const clubsMap = new Map<string, TimelineClubItem>();
    const matches: TimelineMatchItem[] = [];

    frmfMatches.forEach((m, idx) => {
      const homeKey = resolveClubAbbreviation(m.home_team);
      const awayKey = resolveClubAbbreviation(m.away_team);
      const isHomeFus = isMyClubName(m.home_team, myClubCtx) || homeKey === 'FUS';
      const isAwayFus = isMyClubName(m.away_team, myClubCtx) || awayKey === 'FUS';

      const homeLogo =
        (m.home_team_logo && !m.home_team_logo.includes('ui-avatars.com') ? m.home_team_logo : '') ||
        getClubLogoUrl(m.home_team, allClubs, mainClub as any);
      const awayLogo =
        (m.away_team_logo && !m.away_team_logo.includes('ui-avatars.com') ? m.away_team_logo : '') ||
        getClubLogoUrl(m.away_team, allClubs, mainClub as any);

      if (!clubsMap.has(homeKey)) {
        clubsMap.set(homeKey, {
          id: homeKey,
          nom: m.home_team.trim(),
          shortName: makeShortName(m.home_team),
          logoUrl: homeLogo || null,
          isFus: isHomeFus,
        });
      }
      if (!clubsMap.has(awayKey)) {
        clubsMap.set(awayKey, {
          id: awayKey,
          nom: m.away_team.trim(),
          shortName: makeShortName(m.away_team),
          logoUrl: awayLogo || null,
          isFus: isAwayFus,
        });
      }

      matches.push({
        id: m.id || `frmf-${normCategory}-${m.match_day}-${homeKey}-${awayKey}-${idx}`,
        date: m.match_date || '',
        journee: Math.max(1, Number(m.match_day) || 1),
        domicile: homeKey,
        domicileName: m.home_team.trim(),
        domicileLogo: homeLogo,
        isDomicileFus: isHomeFus,
        exterieur: awayKey,
        exterieurName: m.away_team.trim(),
        exterieurLogo: awayLogo,
        isExterieurFus: isAwayFus,
        scoreDom: m.score_home !== null && m.score_home !== undefined ? Number(m.score_home) : null,
        scoreExt: m.score_away !== null && m.score_away !== undefined ? Number(m.score_away) : null,
        status: m.status || 'scheduled',
      });
    });

    return buildSnapshotFromNormalizedMatches({
      source: 'frmf',
      matches,
      clubsMap,
      upToJournee,
      minExpectedDays: defaultMinDays,
    });
  }

  // 2. Fallback : matchs Supabase (`matches` du FUS + `opponent_matches`)
  const targetCat = normCategory || 'U21';
  const getClubMeta = (clubId: string): TimelineClubItem => {
    const isFus = Boolean(mainClub && clubId === mainClub.id);
    const found = allClubs.find((c) => c.id === clubId);
    const name = isFus ? mainClub?.name || 'FUS Rabat' : found?.name || 'Club inconnu';
    const shortName = isFus
      ? (mainClub as any)?.short_name || 'FUS'
      : (found as any)?.short_name || makeShortName(name);
    const logoUrl = isFus ? mainClub?.logo_url || null : found?.logo_url || null;

    return {
      id: clubId,
      nom: name,
      shortName,
      logoUrl,
      isFus,
    };
  };

  type RawUnified = {
    id?: string;
    homeId: string;
    awayId: string;
    scoreHome: number | null;
    scoreAway: number | null;
    status: string;
    round_name?: string | null;
    match_date?: string | null;
  };

  const unifiedRaw: RawUnified[] = [];

  fusMatches.forEach((m) => {
    if (isFriendlyOrScrimmage(m, mainClub?.id)) return;
    if (leagueId && m.league_id !== leagueId) return;
    if (m.category && normalizeAgeCategory(m.category) !== targetCat) return;
    if (!mainClub?.id || !m.opponent_id) return;

    const fusIsHome = m.is_home ?? true;
    unifiedRaw.push({
      id: m.id,
      homeId: fusIsHome ? mainClub.id : m.opponent_id,
      awayId: fusIsHome ? m.opponent_id : mainClub.id,
      scoreHome: m.score_home,
      scoreAway: m.score_away,
      status: m.status,
      round_name: (m as any).round_name ?? null,
      match_date: m.match_date,
    });
  });

  opponentMatches.forEach((m) => {
    if (isFriendlyOrScrimmage(m, mainClub?.id)) return;
    if (leagueId && m.league_id !== leagueId) return;
    if (m.category && normalizeAgeCategory(m.category) !== targetCat) return;
    if (!m.home_club_id || !m.away_club_id) return;

    unifiedRaw.push({
      id: m.id,
      homeId: m.home_club_id,
      awayId: m.away_club_id,
      scoreHome: m.score_home,
      scoreAway: m.score_away,
      status: m.status,
      round_name: m.round_name ?? null,
      match_date: m.match_date,
    });
  });

  const withDays = assignChronologicalMatchDays(unifiedRaw);
  const clubsMap = new Map<string, TimelineClubItem>();
  const matches: TimelineMatchItem[] = [];

  withDays.forEach((m) => {
    const homeMeta = getClubMeta(m.homeId);
    const awayMeta = getClubMeta(m.awayId);
    if (!clubsMap.has(homeMeta.id)) clubsMap.set(homeMeta.id, homeMeta);
    if (!clubsMap.has(awayMeta.id)) clubsMap.set(awayMeta.id, awayMeta);

    matches.push({
      id: m.id,
      date: m.match_date || '',
      journee: m.resolvedDay,
      domicile: homeMeta.id,
      domicileName: homeMeta.nom,
      domicileLogo: homeMeta.logoUrl || '',
      isDomicileFus: homeMeta.isFus,
      exterieur: awayMeta.id,
      exterieurName: awayMeta.nom,
      exterieurLogo: awayMeta.logoUrl || '',
      isExterieurFus: awayMeta.isFus,
      scoreDom: m.scoreHome,
      scoreExt: m.scoreAway,
      status: m.status,
    });
  });

  return buildSnapshotFromNormalizedMatches({
    source: 'supabase',
    matches,
    clubsMap,
    upToJournee,
    minExpectedDays: defaultMinDays,
  });
}

/**
 * Libellé court pour les règles de départage affichées dans les tableaux de classement.
 */
export function getTieRuleBadgeLabel(rule?: TieBreakerRuleApplied | null): string | null {
  switch (rule) {
    case 'h2h':
    case 'h2h_subtie':
      return 'Confr. directe';
    case 'general_after_h2h':
      return 'Diff. gén. (après H2H)';
    case 'provisional_gd':
      return 'Diff. gén.';
    case 'provisional_gf':
      return 'Meil. attaque';
    case 'wins_or_alpha':
      return 'Victoires / Alpha';
    default:
      return null;
  }
}

export interface PlayerCategoryStandingsResolution {
  source: 'frmf' | 'supabase' | 'empty';
  activeGroup: string | null;
  availableGroupsWithData: string[];
  standings: TimelineStandingRow[];
  finishedMatchesCount: number;
  hasAnyH2HActivated: boolean;
  hasAnyProvisionalTie: boolean;
  isChampionshipCompleted: boolean;
}

/**
 * Résout le classement complet d'une catégorie pour les fiches joueurs :
 * utilise en priorité `Classement & Résultats FRMF` (`frmf_matches`), en sélectionnant automatiquement
 * la poule où évolue le FUS (ex: U18 Groupe Sud), et ne bascule sur Supabase (`matches`/`opponent_matches`)
 * que si aucune donnée FRMF n'est disponible pour la catégorie.
 */
export function resolveCategoryStandingsWithFrmfFallback(params: {
  frmfDataset: FRMFDataset | null | undefined;
  category: string | null | undefined;
  availableGroups?: string[];
  requestedGroup?: string | null;
  fusMatches?: Match[];
  opponentMatches?: OpponentMatch[];
  allClubs?: Club[];
  mainClub?: Club | null;
}): PlayerCategoryStandingsResolution {
  const {
    frmfDataset,
    category,
    availableGroups = ['Poule Unique', 'Groupe Nord', 'Groupe Sud'],
    requestedGroup,
    fusMatches = [],
    opponentMatches = [],
    allClubs = [],
    mainClub = null,
  } = params;

  const normCategory = category ? normalizeAgeCategory(category) : '';
  if (!normCategory) {
    return {
      source: 'empty',
      activeGroup: null,
      availableGroupsWithData: [],
      standings: [],
      finishedMatchesCount: 0,
      hasAnyH2HActivated: false,
      hasAnyProvisionalTie: false,
      isChampionshipCompleted: false,
    };
  }

  const catResults = frmfDataset?.results?.[normCategory] || {};
  const candidateGroups = Array.from(new Set<string>([...availableGroups, ...Object.keys(catResults)]));
  const availableGroupsWithData = candidateGroups.filter((grp) => {
    const grpData = catResults[grp];
    return Boolean(grpData && Object.values(grpData).some((arr) => Array.isArray(arr) && arr.length > 0));
  });

  if (availableGroupsWithData.length > 0) {
    const activeGroup =
      requestedGroup && availableGroupsWithData.includes(requestedGroup)
        ? requestedGroup
        : pickDefaultFrmfGroupForCategory(frmfDataset, normCategory, availableGroupsWithData, mainClub);

    const frmfGroupMatches = collectFrmfGroupMatches(frmfDataset, normCategory, activeGroup);
    const maxListedDay = frmfGroupMatches.reduce((max, m) => Math.max(max, Number(m.match_day) || 0), 0);

    const snapshot = buildChampionshipTimelineSnapshot({
      frmfMatches: frmfGroupMatches,
      allClubs,
      mainClub,
      category: normCategory,
      upToJournee: Math.max(1, maxListedDay),
    });

    const hasAnyH2HActivated = snapshot.standings.some((r) => r.played > 0 && r.h2h_activated);
    const hasAnyProvisionalTie = snapshot.standings.some(
      (r) => r.played > 0 && r.is_tied_on_points && !r.h2h_activated
    );

    return {
      source: snapshot.standings.length > 0 ? 'frmf' : 'empty',
      activeGroup,
      availableGroupsWithData,
      standings: snapshot.standings,
      finishedMatchesCount: snapshot.finishedMatchesCount,
      hasAnyH2HActivated,
      hasAnyProvisionalTie,
      isChampionshipCompleted: snapshot.isChampionshipCompleted,
    };
  }

  // Fallback si aucun résultat FRMF n'existe pour cette catégorie
  const fallbackRows = calculateStandings(fusMatches, opponentMatches, allClubs, mainClub, {
    category: normCategory,
  });

  const standings: TimelineStandingRow[] = fallbackRows.map((row) => ({
    position: row.position,
    club_id: row.club_id,
    team_key: row.club_id,
    team_name: row.club_name,
    short_name: makeShortName(row.club_name),
    club_logo: row.club_logo || getClubLogoUrl(row.club_name, allClubs, mainClub as any) || null,
    is_fus: row.is_fus,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goals_for: row.goals_for,
    goals_against: row.goals_against,
    goal_difference: row.goal_difference,
    points: row.points,
    form: row.form,
    is_tied_on_points: false,
    h2h_activated: false,
    tie_breaker_rule: null,
    position_delta: null,
  }));

  const finishedApprox = Math.floor(
    standings.reduce((acc, r) => acc + r.played, 0) / 2
  );

  return {
    source: standings.length > 0 ? 'supabase' : 'empty',
    activeGroup: null,
    availableGroupsWithData: [],
    standings,
    finishedMatchesCount: finishedApprox,
    hasAnyH2HActivated: false,
    hasAnyProvisionalTie: false,
    isChampionshipCompleted: false,
  };
}

export interface FrmfFaceToFaceMatch {
  id: string;
  matchDay: number;
  matchDate: string;
  homeKey: string;
  homeName: string;
  homeLogo: string | null;
  awayKey: string;
  awayName: string;
  awayLogo: string | null;
  scoreHome: number;
  scoreAway: number;
  leagueGroup: string;
}

export interface FrmfClubStandingSummary {
  teamKey: string;
  teamName: string;
  clubLogo: string | null;
  position: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: Array<'W' | 'D' | 'L'>;
}

export interface FrmfFaceToFaceSummary {
  hasData: boolean;
  hasH2H: boolean;
  activeGroup: string | null;
  teamAKey: string;
  teamBKey: string;
  h2hMatches: FrmfFaceToFaceMatch[];
  wins: number;
  draws: number;
  losses: number;
  total: number;
  winPct: number;
  drawPct: number;
  lossPct: number;
  goalsForA: number;
  goalsForB: number;
  standingA: FrmfClubStandingSummary | null;
  standingB: FrmfClubStandingSummary | null;
  recentA: FrmfFaceToFaceMatch[];
  recentB: FrmfFaceToFaceMatch[];
}

function isFinishedFrmfResult(m: FRMFMatch): boolean {
  return (
    m.score_home !== null &&
    m.score_home !== undefined &&
    m.score_away !== null &&
    m.score_away !== undefined &&
    isRankableMatchFinished({
      scoreHome: Number(m.score_home),
      scoreAway: Number(m.score_away),
      status: m.status,
    })
  );
}

/**
 * Calcule le Face-à-Face (confrontations directes, forme récente et comparaison au classement)
 * exclusivement depuis `Classement & Résultats FRMF` (`frmf_matches`).
 * Retourne `hasData: false` s'il n'existe ni confrontation directe ni présence des deux clubs en classement FRMF.
 */
export function computeFrmfFaceToFaceSummary(params: {
  frmfDataset: FRMFDataset | null | undefined;
  category: string | null | undefined;
  teamAName: string;
  teamBName: string;
  availableGroups?: string[];
  allClubs?: Club[];
  mainClub?: Club | null;
  excludeMatchId?: string | null;
}): FrmfFaceToFaceSummary {
  const {
    frmfDataset,
    category,
    teamAName,
    teamBName,
    availableGroups = ['Poule Unique', 'Groupe Nord', 'Groupe Sud'],
    allClubs = [],
    mainClub = null,
    excludeMatchId = null,
  } = params;

  const emptyResult = (teamAKey = '', teamBKey = ''): FrmfFaceToFaceSummary => ({
    hasData: false,
    hasH2H: false,
    activeGroup: null,
    teamAKey,
    teamBKey,
    h2hMatches: [],
    wins: 0,
    draws: 0,
    losses: 0,
    total: 0,
    winPct: 0,
    drawPct: 0,
    lossPct: 0,
    goalsForA: 0,
    goalsForB: 0,
    standingA: null,
    standingB: null,
    recentA: [],
    recentB: [],
  });

  const normCategory = category ? normalizeAgeCategory(category) : '';
  const keyA = resolveClubAbbreviation(teamAName || '');
  const keyB = resolveClubAbbreviation(teamBName || '');

  if (!normCategory || !keyA || !keyB || keyA === keyB) {
    return emptyResult(keyA, keyB);
  }

  const catResults = frmfDataset?.results?.[normCategory] || {};
  const candidateGroups = Array.from(new Set<string>([...availableGroups, ...Object.keys(catResults)]));
  const groupsWithData = candidateGroups.filter((grp) => {
    const grpData = catResults[grp];
    return Boolean(grpData && Object.values(grpData).some((arr) => Array.isArray(arr) && arr.length > 0));
  });

  if (groupsWithData.length === 0) {
    return emptyResult(keyA, keyB);
  }

  const toFaceMatch = (m: FRMFMatch, grpName: string): FrmfFaceToFaceMatch => {
    const hKey = resolveClubAbbreviation(m.home_team);
    const aKey = resolveClubAbbreviation(m.away_team);
    const hLogo =
      (m.home_team_logo && !m.home_team_logo.includes('ui-avatars.com') ? m.home_team_logo : '') ||
      getClubLogoUrl(m.home_team, allClubs, mainClub as any);
    const aLogo =
      (m.away_team_logo && !m.away_team_logo.includes('ui-avatars.com') ? m.away_team_logo : '') ||
      getClubLogoUrl(m.away_team, allClubs, mainClub as any);

    return {
      id: m.id || `frmf-vs-${normCategory}-${grpName}-${m.match_day}-${hKey}-${aKey}`,
      matchDay: Math.max(1, Number(m.match_day) || 1),
      matchDate: m.match_date || '',
      homeKey: hKey,
      homeName: m.home_team.trim(),
      homeLogo: hLogo && !hLogo.includes('ui-avatars.com') ? hLogo : null,
      awayKey: aKey,
      awayName: m.away_team.trim(),
      awayLogo: aLogo && !aLogo.includes('ui-avatars.com') ? aLogo : null,
      scoreHome: Number(m.score_home ?? 0),
      scoreAway: Number(m.score_away ?? 0),
      leagueGroup: m.group || grpName,
    };
  };

  // Choisir la poule contenant les deux équipes (prioritaire), sinon poule contenant A, sinon poule par défaut
  let activeGroup: string | null = null;
  for (const grp of groupsWithData) {
    const grpMatches = collectFrmfGroupMatches(frmfDataset, normCategory, grp);
    const hasA = grpMatches.some((m) => resolveClubAbbreviation(m.home_team) === keyA || resolveClubAbbreviation(m.away_team) === keyA);
    const hasB = grpMatches.some((m) => resolveClubAbbreviation(m.home_team) === keyB || resolveClubAbbreviation(m.away_team) === keyB);
    if (hasA && hasB) {
      activeGroup = grp;
      break;
    }
  }
  if (!activeGroup) {
    activeGroup = pickDefaultFrmfGroupForCategory(frmfDataset, normCategory, groupsWithData, mainClub);
  }

  const allCategoryFinished: FrmfFaceToFaceMatch[] = [];
  const activeGroupFinished: FrmfFaceToFaceMatch[] = [];

  for (const grp of groupsWithData) {
    const grpMatches = collectFrmfGroupMatches(frmfDataset, normCategory, grp);
    grpMatches.forEach((m) => {
      if (excludeMatchId && m.id === excludeMatchId) return;
      if (!isFinishedFrmfResult(m)) return;
      const item = toFaceMatch(m, grp);
      allCategoryFinished.push(item);
      if (grp === activeGroup) {
        activeGroupFinished.push(item);
      }
    });
  }

  const sortLatestFirst = (list: FrmfFaceToFaceMatch[]) =>
    [...list].sort((a, b) => {
      if (b.matchDay !== a.matchDay) return b.matchDay - a.matchDay;
      return String(b.matchDate || '').localeCompare(String(a.matchDate || ''));
    });

  const rawH2H = allCategoryFinished.filter(
    (m) =>
      (m.homeKey === keyA && m.awayKey === keyB) ||
      (m.homeKey === keyB && m.awayKey === keyA)
  );
  const seenH2H = new Set<string>();
  const h2hMatches = sortLatestFirst(rawH2H).filter((m) => {
    const k = `${m.matchDay}-${m.homeKey}-${m.awayKey}-${m.scoreHome}-${m.scoreAway}`;
    if (seenH2H.has(k)) return false;
    seenH2H.add(k);
    return true;
  });

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsForA = 0;
  let goalsForB = 0;

  h2hMatches.forEach((m) => {
    const isAHome = m.homeKey === keyA;
    const scoreA = isAHome ? m.scoreHome : m.scoreAway;
    const scoreB = isAHome ? m.scoreAway : m.scoreHome;
    goalsForA += scoreA;
    goalsForB += scoreB;
    if (scoreA > scoreB) wins++;
    else if (scoreA < scoreB) losses++;
    else draws++;
  });

  const total = wins + draws + losses;
  const winPct = total > 0 ? Math.round((wins / total) * 100) : 0;
  const drawPct = total > 0 ? Math.round((draws / total) * 100) : 0;
  const lossPct = total > 0 ? Math.round((losses / total) * 100) : 0;

  const standingsResolution = resolveCategoryStandingsWithFrmfFallback({
    frmfDataset,
    category: normCategory,
    availableGroups: groupsWithData,
    requestedGroup: activeGroup,
    allClubs,
    mainClub,
  });

  const toClubStanding = (teamKey: string): FrmfClubStandingSummary | null => {
    const row = standingsResolution.standings.find((r) => r.team_key === teamKey && r.played > 0);
    if (!row) return null;
    return {
      teamKey: row.team_key,
      teamName: row.team_name,
      clubLogo: row.club_logo,
      position: row.position,
      points: row.points,
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      goalsFor: row.goals_for,
      goalsAgainst: row.goals_against,
      goalDifference: row.goal_difference,
      form: row.form,
    };
  };

  const standingA = standingsResolution.source === 'frmf' ? toClubStanding(keyA) : null;
  const standingB = standingsResolution.source === 'frmf' ? toClubStanding(keyB) : null;

  const recentSource = activeGroupFinished.length > 0 ? activeGroupFinished : allCategoryFinished;
  const recentA = sortLatestFirst(
    recentSource.filter((m) => m.homeKey === keyA || m.awayKey === keyA)
  ).slice(0, 5);
  const recentB = sortLatestFirst(
    recentSource.filter((m) => m.homeKey === keyB || m.awayKey === keyB)
  ).slice(0, 5);

  const hasH2H = h2hMatches.length > 0;
  const hasData = hasH2H || Boolean(standingA && standingB);

  return {
    hasData,
    hasH2H,
    activeGroup: hasData ? activeGroup : null,
    teamAKey: keyA,
    teamBKey: keyB,
    h2hMatches,
    wins,
    draws,
    losses,
    total,
    winPct,
    drawPct,
    lossPct,
    goalsForA,
    goalsForB,
    standingA,
    standingB,
    recentA,
    recentB,
  };
}
