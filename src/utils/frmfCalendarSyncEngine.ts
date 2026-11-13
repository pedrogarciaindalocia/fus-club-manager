import { PLAYER_CATEGORIES, normalizeAgeCategory } from '../constants';
import {
  buildMyClubContext,
  computeClubAcronym,
  findMatchingOpponentClub,
  isMyClubName,
  normalizeName,
  normalizeSeasonFormat,
  normalizeTimeHHMM,
  resolveClubAbbreviation,
  stripCategorySuffix,
} from '../features/match-management/utils/frmfMatchSheetParser';
import type { FRMFDataset, FRMFMatch } from '../services/frmfDataService';
import type { Club, League, Match, MyClubSettings, Team } from '../types';
import { getClubLogoUrl } from './clubLogos';
import { isRankableMatchFinished } from './standingsRankingEngine';

type MatchWithOptionalMeta = Match & {
  round_name?: string | null;
  season?: string | null;
  match_type?: string | null;
  lineup?: {
    round_name?: string | null;
    match_type?: string | null;
    internal_opposition?: { is_internal_scrimmage?: boolean } | null;
    frmf_sync?: { frmf_match_id?: string | null } | null;
  } | null;
};

type LeagueWithMeta = League & {
  category?: string | null;
  season?: string | null;
  is_active?: boolean | null;
};

export interface FrmfCalendarMissingMatchItem {
  syncKey: string;
  frmfMatch: FRMFMatch;
  category: string;
  group: string;
  matchDay: number;
  roundName: string;
  season: string;
  isHome: boolean;
  myClubName: string;
  myClubAbbreviation: string;
  myClubLogo: string;
  opponentRawName: string;
  opponentAbbreviation: string;
  opponentLogo: string;
  matchedOpponentClub: Club | null;
  willCreateOpponentClub: boolean;
  resolvedTeamId: string | null;
  resolvedLeagueId: string | null;
  resolvedLeagueName: string;
  scoreHome: number;
  scoreAway: number;
  matchDate: string;
  matchTime: string;
}

export interface FrmfCalendarRoundUpdateItem {
  syncKey: string;
  frmfMatch: FRMFMatch;
  existingCalendarMatch: Match;
  category: string;
  group: string;
  season: string;
  matchDay: number;
  currentRoundName: string | null;
  targetRoundName: string;
  isHome: boolean;
  myClubName: string;
  myClubAbbreviation: string;
  myClubLogo: string;
  opponentRawName: string;
  opponentAbbreviation: string;
  opponentLogo: string;
  hasPlayedScore: boolean;
  scoreHome: number | null;
  scoreAway: number | null;
  // US-DASH-146 : Rectification intelligente si match vierge (score vide & 0 événement)
  isBlankMatch?: boolean;
  hasRecordedEvents?: boolean;
  needsDateRectification?: boolean;
  currentDate?: string | null;
  targetDate?: string;
  currentTime?: string | null;
  targetTime?: string;
  willUpdateScore?: boolean;
}

export interface FrmfCalendarExistingMatchItem {
  syncKey: string;
  frmfMatch: FRMFMatch;
  category: string;
  group: string;
  matchDay: number;
  roundName: string;
  isHome: boolean;
  opponentRawName: string;
  opponentAbbreviation: string;
  scoreHome: number;
  scoreAway: number;
  existingCalendarMatch: Match;
  reason: string;
}

export interface FrmfCalendarSkippedMatchItem {
  frmfMatch: FRMFMatch;
  category: string;
  matchDay: number;
  reason: string;
}

export interface FrmfCalendarAuditResult {
  totalFrmfMyClubMatches: number;
  totalPlayedFrmfMyClubMatches: number;
  missingMatches: FrmfCalendarMissingMatchItem[];
  roundUpdates: FrmfCalendarRoundUpdateItem[];
  alreadyInCalendar: FrmfCalendarExistingMatchItem[];
  skippedNotFinished: FrmfCalendarSkippedMatchItem[];
}

export interface FrmfCalendarAuditParams {
  frmfDataset: FRMFDataset | null | undefined;
  calendarMatches: Match[];
  mainClub: MyClubSettings | null;
  opponentClubs: Club[];
  teams: Team[];
  leagues: League[];
  canManageCategory?: (category: string | null | undefined) => boolean;
  matchesWithEventsSet?: Set<string>;
}

/**
 * Extrait le numéro de journée depuis une chaîne ("Journée 2", "J2", "2").
 */
export function extractRoundDayNumber(rawRound?: string | null): number | null {
  if (!rawRound) return null;
  const text = String(rawRound).trim();
  const match =
    text.match(/(?:journ[ée]e|j|round|day)\s*[:#n°\-\s]*(\d{1,2})\b/i) ||
    text.match(/^(\d{1,2})$/);
  if (!match) return null;
  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Normalise une date FRMF (DD/MM/YYYY, YYYY-MM-DD, vide) vers YYYY-MM-DD.
 */
export function normalizeFrmfDateToIso(rawDate?: string | null): string {
  const clean = (rawDate || '').trim();
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }
  const frMatch = clean.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (frMatch) {
    return `${frMatch[3]}-${frMatch[2].padStart(2, '0')}-${frMatch[1].padStart(2, '0')}`;
  }
  return new Date().toLocaleDateString('en-CA');
}

/**
 * Normalise une heure FRMF ("15:00", "15h00") vers "HH:MM:00".
 */
export function normalizeFrmfTimeToHHMMSS(rawTime?: string | null): string {
  const hhmm = normalizeTimeHHMM(rawTime) || '15:00';
  return `${hhmm}:00`;
}

/**
 * Déduit la saison sportive YYYY/YY depuis une date ISO (août à décembre -> N/N+1, janvier à juillet -> N-1/N).
 */
export function inferSeasonFromIsoDate(dateStr?: string | null): string | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return null;
  const year = parseInt(dateStr.slice(0, 4), 10);
  const month = parseInt(dateStr.slice(5, 7), 10);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  const startYear = month >= 8 ? year : year - 1;
  return `${startYear}/${String(startYear + 1).slice(-2)}`;
}

/**
 * Indique si un match du calendrier est amical ou une opposition interne (à exclure de la déduplication championnat FRMF).
 */
export function isNonOfficialCalendarMatch(match: Match, mainClubId?: string | null): boolean {
  const m = match as MatchWithOptionalMeta;
  const lineup = m.lineup || {};
  const isInternal =
    m.match_type === 'internal_scrimmage' ||
    lineup.match_type === 'internal_scrimmage' ||
    lineup.internal_opposition?.is_internal_scrimmage === true ||
    (typeof m.notes === 'string' && m.notes.includes('[Opposition Interne]')) ||
    Boolean(mainClubId && m.opponent_id === mainClubId);

  if (isInternal) return true;

  const isFriendly =
    m.match_type === 'amical' ||
    lineup.match_type === 'amical' ||
    (!m.league_id &&
      (String(m.category || '').toLowerCase().includes('amical') ||
        String(m.notes || '').toLowerCase().includes('amical')));

  return isFriendly;
}

/**
 * Résout la ligue officielle la plus pertinente pour un match FRMF.
 */
export function resolveLeagueForFrmfMatch(
  leagues: League[],
  category: string,
  season: string
): League | null {
  if (!leagues?.length) return null;
  const normCategory = normalizeAgeCategory(category);
  const normSeason = normalizeSeasonFormat(season);

  const typedLeagues = leagues as LeagueWithMeta[];
  const officialLeagues = typedLeagues.filter(
    (l) => l.is_active !== false && !String(l.name || '').toLowerCase().includes('amical')
  );
  const pool = officialLeagues.length > 0 ? officialLeagues : typedLeagues;

  return (
    pool.find(
      (l) =>
        normalizeAgeCategory(l.category || '') === normCategory &&
        Boolean(l.category) &&
        normalizeSeasonFormat(l.season) === normSeason
    ) ||
    pool.find(
      (l) =>
        !l.category &&
        normalizeSeasonFormat(l.season) === normSeason
    ) ||
    pool.find(
      (l) =>
        Boolean(l.category) &&
        normalizeAgeCategory(l.category) === normCategory
    ) ||
    pool.find((l) => !l.category) ||
    pool[0] ||
    null
  );
}

/**
 * Résout l'équipe My Club de la catégorie correspondante.
 */
export function resolveTeamForFrmfMatch(teams: Team[], category: string): Team | null {
  if (!teams?.length) return null;
  const normCategory = normalizeAgeCategory(category);
  return (
    teams.find(
      (t) => t.is_active !== false && normalizeAgeCategory(t.category) === normCategory
    ) ||
    teams.find((t) => normalizeAgeCategory(t.category) === normCategory) ||
    null
  );
}

function getCategorySortWeight(category: string): number {
  const idx = (PLAYER_CATEGORIES as readonly string[]).indexOf(normalizeAgeCategory(category));
  return idx === -1 ? 999 : idx;
}

/**
 * Recherche un match officiel déjà présent dans le calendrier correspondant au match FRMF.
 * Vérifie strictement : catégorie, domicile/extérieur, adversaire et journée/saison.
 * Ne bloque jamais si d'autres matchs ou événements existent à la même date pour cette catégorie.
 */
export function findExistingCalendarMatchForFrmf(params: {
  frmfMatch: FRMFMatch;
  normCategory: string;
  matchDay: number;
  normSeason: string;
  isHome: boolean;
  opponentRawName: string;
  opponentAbbr: string;
  matchedOpponentClub: Club | null;
  resolvedLeagueId: string | null;
  calendarMatches: Match[];
  clubById: Map<string, Club>;
  mainClubId: string | null;
  claimedMatchIds?: Set<string>;
}): { match: Match; reason: string } | null {
  const {
    frmfMatch,
    normCategory,
    matchDay,
    normSeason,
    isHome,
    opponentRawName,
    opponentAbbr,
    matchedOpponentClub,
    resolvedLeagueId,
    calendarMatches,
    clubById,
    mainClubId,
    claimedMatchIds,
  } = params;

  const oppAbbrNorm = normalizeName(opponentAbbr);
  const oppCleanNorm = normalizeName(stripCategorySuffix(opponentRawName));

  for (const rawCal of calendarMatches) {
    const cal = rawCal as MatchWithOptionalMeta;
    const calLineup = cal.lineup || {};

    // 1. Lien direct déjà enregistré lors d'une synchronisation précédente
    if (
      frmfMatch.id &&
      calLineup.frmf_sync?.frmf_match_id &&
      String(calLineup.frmf_sync.frmf_match_id) === String(frmfMatch.id)
    ) {
      return { match: cal, reason: 'Déjà synchronisé depuis FRMF' };
    }

    if (isNonOfficialCalendarMatch(cal, mainClubId)) continue;

    // 2. Même catégorie d'âge stricte
    if (normalizeAgeCategory(cal.category) !== normCategory) continue;

    // 3. Même côté Domicile / Extérieur (Aller vs Retour)
    if (Boolean(cal.is_home ?? true) !== isHome) continue;

    // 4. Même adversaire (par ID direct OU par sigle/nom canonique pour couvrir les doublons de clubs)
    let sameOpponent = Boolean(matchedOpponentClub && cal.opponent_id === matchedOpponentClub.id);
    if (!sameOpponent && cal.opponent_id) {
      const calOpp = clubById.get(cal.opponent_id);
      if (calOpp) {
        const calOppAbbr = normalizeName(resolveClubAbbreviation(calOpp.name));
        const calOppClean = normalizeName(stripCategorySuffix(calOpp.name));
        if (
          (oppAbbrNorm && calOppAbbr && oppAbbrNorm !== 'clb' && calOppAbbr === oppAbbrNorm) ||
          (oppCleanNorm && calOppClean && oppCleanNorm === calOppClean)
        ) {
          sameOpponent = true;
        }
      }
    }
    if (!sameOpponent) continue;

    // 5. Même journée si renseignée sur le match calendrier, et même compétition/saison
    const calRoundRaw = cal.round_name || calLineup.round_name || null;
    const calRoundDay = extractRoundDayNumber(calRoundRaw);

    if (calRoundDay !== null && calRoundDay !== matchDay) {
      continue;
    }

    if (resolvedLeagueId && cal.league_id && cal.league_id !== resolvedLeagueId) {
      continue;
    }

    const calSeasonRaw = cal.season || inferSeasonFromIsoDate(cal.match_date);
    if (calSeasonRaw && normalizeSeasonFormat(calSeasonRaw) !== normSeason) {
      continue;
    }

    if (calRoundDay === null && claimedMatchIds?.has(cal.id)) {
      continue;
    }

    return {
      match: cal,
      reason:
        calRoundDay === matchDay
          ? `Match déjà présent (Journée ${matchDay} • ${normCategory})`
          : `Match officiel déjà présent dans le calendrier (${cal.match_date})`,
    };
  }

  return null;
}

/**
 * Audite l'ensemble des matchs de My Club dans Classement & Résultats FRMF (`frmfDataset`)
 * par rapport aux matchs existants du Calendrier (`calendarMatches`).
 */
export function auditFrmfMyClubMatchesForCalendar(
  params: FrmfCalendarAuditParams
): FrmfCalendarAuditResult {
  const {
    frmfDataset,
    calendarMatches,
    mainClub,
    opponentClubs,
    teams,
    leagues,
    canManageCategory,
  } = params;

  const myClubCtx = buildMyClubContext(mainClub);
  const mainClubId = mainClub?.id || null;
  const datasetSeason = frmfDataset?.metadata?.season || '2026/2027';

  // Prioriser les clubs adversaires déjà utilisés dans le calendrier
  const preferredClubIds = new Set<string>(
    calendarMatches.map((m) => m.opponent_id).filter(Boolean)
  );
  const clubById = new Map<string, Club>();
  opponentClubs.forEach((c) => {
    if (c?.id) clubById.set(c.id, c);
  });

  // Collecter et trier déterministiquement tous les matchs FRMF impliquant My Club
  const rawEntries: Array<{ cat: string; grp: string; day: number; match: FRMFMatch }> = [];
  const resultsRoot = frmfDataset?.results || {};

  Object.entries(resultsRoot).forEach(([rawCat, groupsMap]) => {
    const normCat = normalizeAgeCategory(rawCat);
    if (canManageCategory && !canManageCategory(normCat)) return;

    Object.entries(groupsMap || {}).forEach(([grp, daysMap]) => {
      Object.entries(daysMap || {}).forEach(([dayKey, list]) => {
        if (!Array.isArray(list)) return;
        list.forEach((m) => {
          const day = Number(m.match_day || dayKey) || 1;
          rawEntries.push({
            cat: normCat,
            grp: m.group || grp || 'Poule Unique',
            day,
            match: { ...m, category: normCat, group: m.group || grp || 'Poule Unique', match_day: day },
          });
        });
      });
    });
  });

  rawEntries.sort((a, b) => {
    const catDiff = getCategorySortWeight(a.cat) - getCategorySortWeight(b.cat);
    if (catDiff !== 0) return catDiff;
    if (a.day !== b.day) return a.day - b.day;
    const aPlayed = isRankableMatchFinished({
      status: a.match.status,
      scoreHome: a.match.score_home,
      scoreAway: a.match.score_away,
    })
      ? 0
      : 1;
    const bPlayed = isRankableMatchFinished({
      status: b.match.status,
      scoreHome: b.match.score_home,
      scoreAway: b.match.score_away,
    })
      ? 0
      : 1;
    if (aPlayed !== bPlayed) return aPlayed - bPlayed;
    return `${a.match.home_team}_${a.match.away_team}`.localeCompare(
      `${b.match.home_team}_${b.match.away_team}`
    );
  });

  let totalFrmfMyClubMatches = 0;
  let totalPlayedFrmfMyClubMatches = 0;
  const missingMatches: FrmfCalendarMissingMatchItem[] = [];
  const roundUpdates: FrmfCalendarRoundUpdateItem[] = [];
  const alreadyInCalendar: FrmfCalendarExistingMatchItem[] = [];
  const skippedNotFinished: FrmfCalendarSkippedMatchItem[] = [];

  const seenFrmfKeys = new Set<string>();
  const claimedCalendarMatchIds = new Set<string>();
  const seenRoundUpdateMatchIds = new Set<string>();
  const normSeason = normalizeSeasonFormat(datasetSeason);

  for (const entry of rawEntries) {
    const { cat, grp, day, match } = entry;
    const homeIsMyClub = isMyClubName(match.home_team, myClubCtx);
    const awayIsMyClub = isMyClubName(match.away_team, myClubCtx);

    if (!homeIsMyClub && !awayIsMyClub) continue;
    if (homeIsMyClub && awayIsMyClub) continue;

    const isHome = homeIsMyClub;
    const opponentRawName = (isHome ? match.away_team : match.home_team).trim();
    const opponentAbbr = resolveClubAbbreviation(opponentRawName) || computeClubAcronym(opponentRawName);
    const dedupKey = `${normSeason}__${cat}__${day}__${isHome ? 'H' : 'A'}__${normalizeName(opponentAbbr || opponentRawName)}`;
    if (seenFrmfKeys.has(dedupKey)) continue;
    seenFrmfKeys.add(dedupKey);

    totalFrmfMyClubMatches++;

    const isFinished = isRankableMatchFinished({
      status: match.status,
      scoreHome: match.score_home,
      scoreAway: match.score_away,
    });
    if (isFinished) {
      totalPlayedFrmfMyClubMatches++;
    }

    const matchedOpponentClub = findMatchingOpponentClub(
      opponentRawName,
      opponentClubs,
      preferredClubIds,
      opponentAbbr
    );

    const resolvedLeague = resolveLeagueForFrmfMatch(leagues, cat, normSeason);
    const resolvedTeam = resolveTeamForFrmfMatch(teams, cat);

    const existing = findExistingCalendarMatchForFrmf({
      frmfMatch: match,
      normCategory: cat,
      matchDay: day,
      normSeason,
      isHome,
      opponentRawName,
      opponentAbbr,
      matchedOpponentClub,
      resolvedLeagueId: resolvedLeague?.id || null,
      calendarMatches,
      clubById,
      mainClubId,
      claimedMatchIds: claimedCalendarMatchIds,
    });

    const targetRoundName = `Journée ${day}`;
    const myClubLogo = getClubLogoUrl(myClubCtx.myClubName, opponentClubs, mainClub);
    const opponentLogo =
      matchedOpponentClub?.logo_url && matchedOpponentClub.logo_url !== 'null'
        ? matchedOpponentClub.logo_url
        : getClubLogoUrl(opponentRawName, opponentClubs, mainClub);

    if (existing) {
      claimedCalendarMatchIds.add(existing.match.id);
      const existingMeta = existing.match as MatchWithOptionalMeta;
      const currentRoundRaw =
        (typeof existingMeta.round_name === 'string' && existingMeta.round_name.trim()) ||
        (typeof existingMeta.lineup?.round_name === 'string' && existingMeta.lineup.round_name.trim()) ||
        null;
      const currentRoundDay = extractRoundDayNumber(currentRoundRaw);
      const needsRoundSync =
        currentRoundRaw === null ||
        (currentRoundDay !== null ? currentRoundDay !== day : currentRoundRaw !== targetRoundName);

      // US-DASH-146 : Détection de match vierge (score vide & 0 événement enregistré)
      const targetMatchDate = (match.match_date ? normalizeFrmfDateToIso(match.match_date) : '') || inferIsoDateFromFrmfMatch(match, datasetSeason) || '';
      const targetMatchTime = normalizeTimeHHMM(match.match_time) || '15:00';
      const currentMatchDate = (existing.match.match_date || '').trim().slice(0, 10);
      const currentMatchTime = normalizeTimeHHMM(existing.match.match_time) || '';

      const hasRecordedEvents = Boolean(params.matchesWithEventsSet && params.matchesWithEventsSet.has(existing.match.id));
      const isScoreEmpty =
        (existing.match.score_home === null || existing.match.score_home === undefined) &&
        (existing.match.score_away === null || existing.match.score_away === undefined) ||
        existing.match.status !== 'finished';
      const isBlankMatch = isScoreEmpty && !hasRecordedEvents;

      const needsDateSync = isBlankMatch && Boolean(targetMatchDate && currentMatchDate !== targetMatchDate);
      const needsTimeSync = isBlankMatch && Boolean(targetMatchTime && currentMatchTime && currentMatchTime !== targetMatchTime);
      const needsScoreSync = isBlankMatch && isFinished;

      const needsRectification = needsRoundSync || needsDateSync || needsTimeSync || needsScoreSync;

      const calScoreHome =
        typeof existing.match.score_home === 'number'
          ? existing.match.score_home
          : isFinished
            ? Number(match.score_home ?? 0)
            : null;
      const calScoreAway =
        typeof existing.match.score_away === 'number'
          ? existing.match.score_away
          : isFinished
            ? Number(match.score_away ?? 0)
            : null;

      if (needsRectification && !seenRoundUpdateMatchIds.has(existing.match.id)) {
        seenRoundUpdateMatchIds.add(existing.match.id);
        roundUpdates.push({
          syncKey: `round__${existing.match.id}__${dedupKey}`,
          frmfMatch: match,
          existingCalendarMatch: existing.match,
          category: cat,
          group: grp,
          season: normSeason,
          matchDay: day,
          currentRoundName: currentRoundRaw,
          targetRoundName,
          isHome,
          myClubName: myClubCtx.myClubName,
          myClubAbbreviation: myClubCtx.myClubAbbreviation,
          myClubLogo,
          opponentRawName,
          opponentAbbreviation: opponentAbbr,
          opponentLogo,
          hasPlayedScore: calScoreHome !== null && calScoreAway !== null,
          scoreHome: calScoreHome,
          scoreAway: calScoreAway,
          isBlankMatch,
          hasRecordedEvents,
          needsDateRectification: needsDateSync || needsTimeSync,
          currentDate: currentMatchDate || null,
          targetDate: targetMatchDate || undefined,
          currentTime: currentMatchTime || null,
          targetTime: targetMatchTime || undefined,
          willUpdateScore: needsScoreSync,
        });
      } else {
        alreadyInCalendar.push({
          syncKey: dedupKey,
          frmfMatch: match,
          category: cat,
          group: grp,
          matchDay: day,
          roundName: currentRoundRaw || targetRoundName,
          isHome,
          opponentRawName,
          opponentAbbreviation: opponentAbbr,
          scoreHome: Number(calScoreHome ?? 0),
          scoreAway: Number(calScoreAway ?? 0),
          existingCalendarMatch: existing.match,
          reason: existing.reason,
        });
      }
      continue;
    }

    if (!isFinished) {
      skippedNotFinished.push({
        frmfMatch: match,
        category: cat,
        matchDay: day,
        reason: `Match non terminé (${match.status || 'programmé'})`,
      });
      continue;
    }

    const scoreHome = Number(match.score_home ?? 0);
    const scoreAway = Number(match.score_away ?? 0);

    missingMatches.push({
      syncKey: dedupKey,
      frmfMatch: match,
      category: cat,
      group: grp,
      matchDay: day,
      roundName: targetRoundName,
      season: normSeason,
      isHome,
      myClubName: myClubCtx.myClubName,
      myClubAbbreviation: myClubCtx.myClubAbbreviation,
      myClubLogo,
      opponentRawName,
      opponentAbbreviation: opponentAbbr,
      opponentLogo,
      matchedOpponentClub,
      willCreateOpponentClub: !matchedOpponentClub,
      resolvedTeamId: resolvedTeam?.id || null,
      resolvedLeagueId: resolvedLeague?.id || null,
      resolvedLeagueName: resolvedLeague?.name || 'Compétition Officielle',
      scoreHome,
      scoreAway,
      matchDate: normalizeFrmfDateToIso(match.match_date),
      matchTime: normalizeFrmfTimeToHHMMSS(match.match_time),
    });
  }

  return {
    totalFrmfMyClubMatches,
    totalPlayedFrmfMyClubMatches,
    missingMatches,
    roundUpdates,
    alreadyInCalendar,
    skippedNotFinished,
  };
}
