import type { Club, League, MyClubSettings } from '../types';
import { normalizeAgeCategory } from '../constants';
import {
  buildMyClubContext,
  findMatchingOpponentClub,
  resolveClubAbbreviation,
} from '../features/match-management/utils/frmfMatchSheetParser';
import { DEFAULT_CLUB_LOGOS } from './clubLogos';
import { isHigherCategory, isLowerCategory } from './categoryRank';

export interface PreferredFootDisplay {
  code: 'G' | 'D' | 'G/D' | '—';
  label: string;
  isSet: boolean;
}

/**
 * Normalise et traduit en français le pied préférentiel d'un joueur.
 * Corrige les incohérences (ex: `'LEFT'` stocké en base affiché avec le badge `'D'`).
 */
export function formatPreferredFootFrench(rawFoot?: string | null): PreferredFootDisplay {
  const clean = (rawFoot || '').trim().toLowerCase();
  if (!clean) {
    return { code: '—', label: 'Non renseigné', isSet: false };
  }
  if (
    clean === 'left' ||
    clean === 'l' ||
    clean === 'g' ||
    clean === 'gauche' ||
    clean === 'gaucher' ||
    clean === 'pied gauche'
  ) {
    return { code: 'G', label: 'Gaucher', isSet: true };
  }
  if (
    clean === 'right' ||
    clean === 'r' ||
    clean === 'd' ||
    clean === 'droit' ||
    clean === 'droite' ||
    clean === 'droitier' ||
    clean === 'pied droit'
  ) {
    return { code: 'D', label: 'Droitier', isSet: true };
  }
  if (
    clean === 'both' ||
    clean === 'ambidextre' ||
    clean === 'ambidextrous' ||
    clean === 'les deux' ||
    clean === 'deux' ||
    clean === 'g/d' ||
    clean === 'l/r'
  ) {
    return { code: 'G/D', label: 'Ambidextre', isSet: true };
  }
  return { code: '—', label: rawFoot!.trim(), isSet: true };
}

/**
 * Filtre strictement une liste de joueurs pour ne conserver que ceux appartenant à `targetCategory`.
 * Retourne une liste vide si `targetCategory` est vide ou `'ALL'`.
 */
export function filterPlayersForCategoryNav<T>(
  players: T[],
  targetCategory: string,
  getCategory: (player: T) => string | null | undefined
): T[] {
  const normTarget = normalizeAgeCategory(targetCategory || '');
  if (!normTarget || normTarget === 'ALL') return [];
  return players.filter((player) => {
    const pCat = normalizeAgeCategory(getCategory(player) || '');
    return pCat === normTarget;
  });
}

/**
 * Détermine si un match a effectivement été joué (ou est en cours) plutôt qu'un match simplement programmé/annulé.
 */
export function isMatchPlayedOrLive(match: any): boolean {
  if (!match) return false;
  const status = String(match.status || '').trim().toLowerCase();
  if (status === 'scheduled' || status === 'cancelled' || status === 'canceled' || status === 'postponed' || status === 'draft') {
    return false;
  }
  if (status === 'finished' || status === 'live' || status === 'completed' || status === 'terminated' || status === 'played') {
    return true;
  }
  // Ancien enregistrement sans status explicite : uniquement si un score est saisi
  return match.score_home != null || match.score_away != null;
}

export function formatMatchStatusFrench(status?: string | null, hasScore: boolean = false): string {
  const clean = String(status || '').trim().toLowerCase();
  if (clean === 'finished' || clean === 'completed' || clean === 'terminated' || clean === 'played') {
    return 'Terminé';
  }
  if (clean === 'live' || clean === 'in_progress') {
    return 'En direct';
  }
  if (clean === 'scheduled') {
    return 'Programmé';
  }
  if (clean === 'postponed') {
    return 'Reporté';
  }
  if (clean === 'cancelled' || clean === 'canceled') {
    return 'Annulé';
  }
  return hasScore ? 'Terminé' : 'Statut non précisé';
}

export interface PlayerMatchStatsSummary {
  matches: number;
  starts: number;
  subs: number;
  minutes: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  substitutions: number;
  totalContributions: number;
  avgMinutes: number;
  starterRate: number;
}

export interface PlayerRecentFormItem {
  id: string;
  oppName: string;
  oppAbbr: string;
  oppLogo: string;
  fusAbbr: string;
  fusLogo: string;
  isHome: boolean;
  sHome: number;
  sAway: number;
  fusScore: number;
  oppScore: number;
  hasScore: boolean;
  isWin: boolean;
  isDraw: boolean;
  isLoss: boolean;
  minutes: number;
  goals: number;
  assists: number;
  dateStr: string;
  compLabel: string;
  statusLabel: string;
  matchCategory: string;
  isSurclasse: boolean;
}

export interface PlayerLastMatchDetail {
  id: string;
  compName: string;
  category: string;
  isSurclasse?: boolean;
  timeAgoStr: string;
  statusLabel: string;
  isHome: boolean;
  homeName: string;
  homeAbbr: string;
  homeLogo: string;
  awayName: string;
  awayAbbr: string;
  awayLogo: string;
  sHome: number;
  sAway: number;
  fusScore: number;
  oppScore: number;
  fusAbbr: string;
  oppAbbr: string;
  oppName: string;
  oppLogo: string;
  hasScore: boolean;
  isWin: boolean;
  isDraw: boolean;
  isLoss: boolean;
  goalMinutes: number[];
  yellowCardMinutes: number[];
  redCardMinutes: number[];
  totalMinutes: number;
  playedMinutes: number;
  subInMinute: number | null;
  subOutMinute: number | null;
  isStarter: boolean;
  roleLabel: string;
  rating: number | null;
  assistsCount: number;
}

interface MatchParticipationResolved {
  participated: boolean;
  isStarter: boolean;
  isSub: boolean;
  playedMinutes: number;
  totalMinutes: number;
  subInMinute: number | null;
  subOutMinute: number | null;
  goalMinutes: number[];
  yellowCardMinutes: number[];
  redCardMinutes: number[];
  goalsCount: number;
  assistsCount: number;
  yellowCount: number;
  redCount: number;
  substitutionsCount: number;
  roleLabel: string;
  rating: number | null;
}

function resolvePlayerMatchParticipation(
  playerId: string,
  match: any,
  playerEvents: any[]
): MatchParticipationResolved {
  const empty: MatchParticipationResolved = {
    participated: false,
    isStarter: false,
    isSub: false,
    playedMinutes: 0,
    totalMinutes: (match?.half_duration_minutes || 45) * 2,
    subInMinute: null,
    subOutMinute: null,
    goalMinutes: [],
    yellowCardMinutes: [],
    redCardMinutes: [],
    goalsCount: 0,
    assistsCount: 0,
    yellowCount: 0,
    redCount: 0,
    substitutionsCount: 0,
    roleLabel: '',
    rating: null,
  };

  if (!playerId || !match || !isMatchPlayedOrLive(match)) return empty;

  const lineup = match.lineup as { startingXI?: string[]; substitutes?: string[] } | null;
  const mpRecord = (match as any).match_players?.find((p: any) => p.player_id === playerId);
  const isStarter = Boolean(mpRecord?.is_starting || lineup?.startingXI?.includes(playerId));
  const isSubListed = Boolean(!isStarter && ((mpRecord && !mpRecord.is_starting) || lineup?.substitutes?.includes(playerId)));

  const matchEvents = (playerEvents || []).filter((e: any) => e.match_id === match.id);
  const subInEvent = matchEvents.find(
    (e: any) => e.type === 'substitution' && (e.related_player_id === playerId || e.extra?.player_in_id === playerId)
  );
  const subOutEvent = matchEvents.find(
    (e: any) => e.type === 'substitution' && e.player_id === playerId
  );

  const playerGoalEvents = matchEvents
    .filter((e: any) => e.type === 'goal' && e.player_id === playerId)
    .sort((a: any, b: any) => Number(a.minute || 0) - Number(b.minute || 0));
  const assistsCount = matchEvents.filter(
    (e: any) => (e.type === 'assist' && e.player_id === playerId) || (e.type === 'goal' && e.related_player_id === playerId)
  ).length;
  const yellowEvents = matchEvents.filter((e: any) => e.type === 'yellow_card' && e.player_id === playerId);
  const redEvents = matchEvents.filter((e: any) => e.type === 'red_card' && e.player_id === playerId);

  const hasDirectAction =
    Boolean(subInEvent || subOutEvent) ||
    playerGoalEvents.length > 0 ||
    assistsCount > 0 ||
    yellowEvents.length > 0 ||
    redEvents.length > 0 ||
    mpRecord?.rating != null;

  const participated = isStarter || isSubListed || hasDirectAction;
  if (!participated) return empty;

  const totalMinutes = Math.max(40, (match.half_duration_minutes || 45) * 2);
  const subInMinute = subInEvent?.minute != null && Number(subInEvent.minute) > 0 ? Number(subInEvent.minute) : null;
  const subOutMinute = subOutEvent?.minute != null && Number(subOutEvent.minute) > 0 ? Number(subOutEvent.minute) : null;

  let playedMinutes = 0;
  let roleLabel = '';
  const isEffectiveSub = !isStarter && (Boolean(subInEvent) || isSubListed);

  if (isStarter) {
    if (subOutMinute != null) {
      playedMinutes = Math.max(1, Math.min(totalMinutes, subOutMinute));
      roleLabel = `Titulaire • Sorti ${subOutMinute}' (${playedMinutes}')`;
    } else if (subOutEvent) {
      playedMinutes = Math.max(15, totalMinutes - 15);
      roleLabel = `Titulaire • Remplacé (${playedMinutes}')`;
    } else {
      playedMinutes = totalMinutes;
      roleLabel = `Titulaire ${playedMinutes}'`;
    }
  } else if (subInEvent) {
    const startMin = subInMinute ?? Math.max(45, totalMinutes - 30);
    const endMin = subOutMinute ?? (subOutEvent ? Math.max(startMin + 5, totalMinutes - 10) : totalMinutes);
    playedMinutes = Math.max(1, endMin - startMin);
    roleLabel = subInMinute != null
      ? `Remplaçant • Entré ${subInMinute}' (${playedMinutes}')`
      : `Remplaçant entré (${playedMinutes}')`;
  } else if (isSubListed) {
    playedMinutes = 30;
    roleLabel = `Remplaçant (${playedMinutes}')`;
  } else {
    playedMinutes = 20;
    roleLabel = `Apparition (${playedMinutes}')`;
  }

  return {
    participated: true,
    isStarter,
    isSub: isEffectiveSub,
    playedMinutes,
    totalMinutes,
    subInMinute,
    subOutMinute,
    goalMinutes: playerGoalEvents
      .map((e: any) => Number(e.minute))
      .filter((m: number) => Number.isFinite(m) && m > 0),
    yellowCardMinutes: yellowEvents
      .map((e: any) => Number(e.minute))
      .filter((m: number) => Number.isFinite(m) && m > 0),
    redCardMinutes: redEvents
      .map((e: any) => Number(e.minute))
      .filter((m: number) => Number.isFinite(m) && m > 0),
    goalsCount: playerGoalEvents.length,
    assistsCount,
    yellowCount: yellowEvents.length,
    redCount: redEvents.length,
    substitutionsCount: matchEvents.filter((e: any) => e.type === 'substitution').length,
    roleLabel,
    rating: mpRecord?.rating != null ? Number(mpRecord.rating) : null,
  };
}

export interface PlayerPlayedMatchLinkInfo {
  played: boolean;
  roleLabel: string;
  isStarter: boolean;
  isSubEntered: boolean;
  minutesPlayed: number | null;
}

/**
 * Détermine strictement si un joueur a réellement joué (ou participé) dans un match donné,
 * afin de ne proposer que ses matchs joués lors de la liaison d'une évaluation de performance.
 */
export function resolvePlayerPlayedMatchForPerformance(
  playerId: string,
  match: any,
  opts?: {
    playerEvents?: any[];
    playerMatchStat?: {
      minutes_played?: number | null;
      goals?: number | null;
      assists?: number | null;
      rating?: number | null;
    } | null;
    matchHasTrackedSubstitutions?: boolean;
    matchHasTrackedMinutes?: boolean;
    includeInternalOpponentSide?: boolean;
    forceIncludeMatchId?: boolean;
  }
): PlayerPlayedMatchLinkInfo {
  const notPlayed: PlayerPlayedMatchLinkInfo = {
    played: false,
    roleLabel: '',
    isStarter: false,
    isSubEntered: false,
    minutesPlayed: null,
  };

  if (!playerId || !match) return notPlayed;
  const pid = String(playerId);

  const status = String(match.status || '').trim().toLowerCase();
  if (
    !opts?.forceIncludeMatchId &&
    (status === 'cancelled' || status === 'canceled' || status === 'postponed' || status === 'draft')
  ) {
    return notPlayed;
  }

  const mpRecord = Array.isArray(match.match_players)
    ? match.match_players.find((p: any) => String(p?.player_id) === pid)
    : undefined;

  const lineup = match.lineup as { startingXI?: string[]; substitutes?: string[] } | null;
  const startingXI = Array.isArray(lineup?.startingXI) ? lineup!.startingXI.map(String) : [];
  const substitutes = Array.isArray(lineup?.substitutes) ? lineup!.substitutes.map(String) : [];
  const oppLineup =
    opts?.includeInternalOpponentSide && Array.isArray(match.opponent_lineup)
      ? match.opponent_lineup.map(String)
      : [];
  const oppSubs =
    opts?.includeInternalOpponentSide && Array.isArray(match.opponent_subs)
      ? match.opponent_subs.map(String)
      : [];

  const matchEvents = (opts?.playerEvents || []).filter(
    (e: any) => String(e?.match_id) === String(match.id)
  );
  const subInEvent = matchEvents.find(
    (e: any) =>
      e?.type === 'substitution' &&
      (String(e?.related_player_id) === pid || String(e?.extra?.player_in_id) === pid)
  );
  const subOutEvent = matchEvents.find(
    (e: any) => e?.type === 'substitution' && String(e?.player_id) === pid
  );
  const hasOtherAction = matchEvents.some(
    (e: any) =>
      String(e?.player_id) === pid ||
      String(e?.related_player_id) === pid ||
      String(e?.extra?.player_in_id) === pid
  );

  const stat = opts?.playerMatchStat;
  const explicitMinutes =
    stat?.minutes_played != null && Number.isFinite(Number(stat.minutes_played))
      ? Number(stat.minutes_played)
      : null;
  const hasPositiveStats = Boolean(
    stat &&
      ((explicitMinutes != null && explicitMinutes > 0) ||
        Number(stat.goals || 0) > 0 ||
        Number(stat.assists || 0) > 0 ||
        stat.rating != null)
  );
  const hasZeroMinutesExplicitly =
    explicitMinutes === 0 && !subInEvent && !subOutEvent && !hasOtherAction && mpRecord?.rating == null;

  const hasDirectAction = Boolean(
    subInEvent || subOutEvent || hasOtherAction || hasPositiveStats || mpRecord?.rating != null
  );

  const isStarter = Boolean(
    mpRecord?.is_starting ||
      startingXI.includes(pid) ||
      (opts?.includeInternalOpponentSide && oppLineup.includes(pid))
  );
  const isSubListed = Boolean(
    !isStarter &&
      ((mpRecord && !mpRecord.is_starting) ||
        substitutes.includes(pid) ||
        (opts?.includeInternalOpponentSide && oppSubs.includes(pid)))
  );

  const hasNonDefaultScore =
    Number(match.score_home || 0) > 0 || Number(match.score_away || 0) > 0;
  const isMatchActiveOrPlayed =
    isMatchPlayedOrLive(match) || hasNonDefaultScore || hasDirectAction;

  if (!isMatchActiveOrPlayed) {
    if (opts?.forceIncludeMatchId) {
      return {
        played: true,
        roleLabel: isStarter ? 'Titulaire' : 'Match lié',
        isStarter,
        isSubEntered: Boolean(subInEvent),
        minutesPlayed: explicitMinutes,
      };
    }
    return notPlayed;
  }

  if (isStarter) {
    const mins = explicitMinutes ?? (subOutEvent?.minute ? Number(subOutEvent.minute) : null);
    return {
      played: true,
      roleLabel: mins != null && mins > 0 ? `Titulaire (${mins}')` : 'Titulaire',
      isStarter: true,
      isSubEntered: false,
      minutesPlayed: mins,
    };
  }

  if (hasDirectAction) {
    const mins = explicitMinutes;
    return {
      played: true,
      roleLabel: subInEvent
        ? mins != null && mins > 0
          ? `Entré en jeu (${mins}')`
          : subInEvent?.minute
            ? `Entré à ${subInEvent.minute}'`
            : 'Entré en jeu'
        : mins != null && mins > 0
          ? `A participé (${mins}')`
          : 'A participé',
      isStarter: false,
      isSubEntered: Boolean(subInEvent || (mins != null && mins > 0)),
      minutesPlayed: mins,
    };
  }

  if (isSubListed) {
    const subsTrackedWithoutEntry = Boolean(
      hasZeroMinutesExplicitly ||
        opts?.matchHasTrackedSubstitutions ||
        opts?.matchHasTrackedMinutes
    );
    if (!subsTrackedWithoutEntry) {
      return {
        played: true,
        roleLabel: 'Remplaçant (Convoqué)',
        isStarter: false,
        isSubEntered: false,
        minutesPlayed: null,
      };
    }
  }

  if (opts?.forceIncludeMatchId) {
    return {
      played: true,
      roleLabel: 'Match lié',
      isStarter: false,
      isSubEntered: false,
      minutesPlayed: explicitMinutes,
    };
  }

  return notPlayed;
}

function resolveClubMetaForMatch(
  match: any,
  opponentClubs: Club[],
  leagues: League[],
  mainClub?: MyClubSettings | null
) {
  const myClubCtx = buildMyClubContext(mainClub);
  const myClubName = mainClub?.name || 'FUS Rabat';
  const fusAbbr = myClubCtx.myClubAbbreviation || resolveClubAbbreviation(myClubName);
  const fusLogo = (mainClub?.logo_url && mainClub.logo_url !== 'null')
    ? mainClub.logo_url
    : (DEFAULT_CLUB_LOGOS[fusAbbr] || DEFAULT_CLUB_LOGOS.FUS || '');

  const rawOpp =
    opponentClubs.find((c: any) => c.id === match.opponent_id) ||
    (match.opponent_name
      ? findMatchingOpponentClub(match.opponent_name, opponentClubs)
      : null);
  const oppName = rawOpp?.name || match.opponent_name || 'Adversaire';
  const oppAbbr = (rawOpp as any)?.short_name || (rawOpp as any)?.abbreviation || resolveClubAbbreviation(oppName);
  const resolvedDefaultOppLogo =
    DEFAULT_CLUB_LOGOS[oppAbbr] ||
    DEFAULT_CLUB_LOGOS[oppName.trim().toUpperCase()] ||
    '';
  const oppLogo = (rawOpp?.logo_url && rawOpp.logo_url !== 'null')
    ? rawOpp.logo_url
    : resolvedDefaultOppLogo;

  const lg = leagues?.find((l: any) => l.id === match.league_id);
  const isFriendly =
    !match.league_id ||
    String(match.category || '').toLowerCase().includes('amical') ||
    String(match.notes || '').toLowerCase().includes('amical') ||
    String(lg?.name || '').toLowerCase().includes('amical');

  const compName = isFriendly ? 'Match Amical' : (lg?.name || 'Compétition Officielle');
  const compLabel = isFriendly ? 'AMICAL' : (lg?.name ? lg.name.slice(0, 14) : 'OFFICIEL');

  return {
    myClubName,
    fusAbbr,
    fusLogo,
    oppName,
    oppAbbr,
    oppLogo,
    compName,
    compLabel,
  };
}

/**
 * Calcule les statistiques agrégées, les 4 derniers matchs (Forme) et le Dernier Match
 * à partir des seules rencontres réellement disputées par ce joueur.
 * Garantit qu'aucun match d'un autre joueur/catégorie et qu'aucun marqueur fictif ne s'affiche.
 */
export interface MatchSurclassementInput {
  category?: string | null;
  lineup?: {
    surclasses?: Record<
      string,
      | {
        original_category?: string | null;
        mobility_type?: string | null;
      }
      | undefined
    > | null;
  } | null;
}

export interface MatchSurclassementInfo {
  matchCategory: string;
  isSurclasse: boolean;
}

/**
 * Détermine la catégorie normalisée d'un match et si un joueur y a pris part
 * en situation de surclassement (catégorie du match strictement supérieure
 * à sa catégorie officielle, ou marquage explicite dans `lineup.surclasses`).
 */
export function resolveMatchSurclassement(
  match: MatchSurclassementInput | null | undefined,
  playerId?: string | null,
  playerBaseCategory?: string | null
): MatchSurclassementInfo {
  const rawMatchCat = (match?.category || '').trim();
  const matchCategory = rawMatchCat ? normalizeAgeCategory(rawMatchCat) : '';
  const rawPlayerCat = (playerBaseCategory || '').trim();
  const normPlayerCat =
    rawPlayerCat && rawPlayerCat.toUpperCase() !== 'ALL'
      ? normalizeAgeCategory(rawPlayerCat)
      : '';

  const surclassEntry = playerId ? match?.lineup?.surclasses?.[playerId] : undefined;
  const explicitOrigRaw = (surclassEntry?.original_category || '').trim();
  const explicitOrig = explicitOrigRaw ? normalizeAgeCategory(explicitOrigRaw) : '';

  const isExplicitSousClasse =
    surclassEntry?.mobility_type === 'sous_classement' ||
    (!!explicitOrig && !!matchCategory && isLowerCategory(explicitOrig, matchCategory)) ||
    (!!normPlayerCat && !!matchCategory && isLowerCategory(normPlayerCat, matchCategory));

  if (isExplicitSousClasse || !matchCategory) {
    return { matchCategory, isSurclasse: false };
  }

  const isHigherThanPlayerCat =
    !!normPlayerCat && isHigherCategory(normPlayerCat, matchCategory);
  const isExplicitSurclasse =
    !!surclassEntry &&
    (surclassEntry.mobility_type === 'surclassement' ||
      (!!explicitOrig && isHigherCategory(explicitOrig, matchCategory)) ||
      (!explicitOrig && surclassEntry.mobility_type !== 'sous_classement'));

  return {
    matchCategory,
    isSurclasse: isHigherThanPlayerCat || isExplicitSurclasse,
  };
}

export function computePlayerMatchSummary(
  playerId: string | undefined | null,
  rawMatches: any[] = [],
  rawEvents: any[] = [],
  opponentClubs: Club[] = [],
  leagues: League[] = [],
  mainClub?: MyClubSettings | null,
  playerBaseCategory?: string | null
): {
  stats: PlayerMatchStatsSummary;
  recentFormMatches: PlayerRecentFormItem[];
  lastMatchData: PlayerLastMatchDetail | null;
} {
  const emptyStats: PlayerMatchStatsSummary = {
    matches: 0,
    starts: 0,
    subs: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    substitutions: 0,
    totalContributions: 0,
    avgMinutes: 0,
    starterRate: 0,
  };

  if (!playerId) {
    return { stats: emptyStats, recentFormMatches: [], lastMatchData: null };
  }

  const sortedMatches = [...(rawMatches || [])].sort(
    (a: any, b: any) => new Date(b.match_date || 0).getTime() - new Date(a.match_date || 0).getTime()
  );

  let matchesPlayed = 0;
  let startsCount = 0;
  let subsCount = 0;
  let minutesPlayed = 0;
  let goalsTotal = 0;
  let assistsTotal = 0;
  let yellowTotal = 0;
  let redTotal = 0;
  let subsEventsTotal = 0;

  const participatedEntries: Array<{ match: any; resolved: MatchParticipationResolved }> = [];

  for (const match of sortedMatches) {
    const resolved = resolvePlayerMatchParticipation(playerId, match, rawEvents || []);
    if (!resolved.participated) continue;

    participatedEntries.push({ match, resolved });
    matchesPlayed++;
    if (resolved.isStarter) startsCount++;
    else if (resolved.isSub) subsCount++;

    minutesPlayed += resolved.playedMinutes;
    goalsTotal += resolved.goalsCount;
    assistsTotal += resolved.assistsCount;
    yellowTotal += resolved.yellowCount;
    redTotal += resolved.redCount;
    subsEventsTotal += resolved.substitutionsCount;
  }

  const stats: PlayerMatchStatsSummary = {
    matches: matchesPlayed,
    starts: startsCount,
    subs: subsCount,
    minutes: Math.max(0, minutesPlayed),
    goals: goalsTotal,
    assists: assistsTotal,
    yellowCards: yellowTotal,
    redCards: redTotal,
    substitutions: subsEventsTotal,
    totalContributions: goalsTotal + assistsTotal,
    avgMinutes: matchesPlayed > 0 ? Math.round(Math.max(0, minutesPlayed) / matchesPlayed) : 0,
    starterRate: matchesPlayed > 0 ? Math.round((startsCount / matchesPlayed) * 100) : 0,
  };

  const recentFormMatches: PlayerRecentFormItem[] = participatedEntries.slice(0, 4).map(({ match, resolved }) => {
    const clubMeta = resolveClubMetaForMatch(match, opponentClubs, leagues, mainClub);
    const { matchCategory, isSurclasse } = resolveMatchSurclassement(match, playerId, playerBaseCategory);
    const isHome = match.is_home ?? true;
    const hasScore = match.score_home != null && match.score_away != null;
    const sHome = hasScore ? Number(match.score_home) : 0;
    const sAway = hasScore ? Number(match.score_away) : 0;
    const fusScore = isHome ? sHome : sAway;
    const oppScore = isHome ? sAway : sHome;
    const dateStr = match.match_date
      ? new Date(match.match_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).toUpperCase()
      : 'REC';

    return {
      id: match.id,
      oppName: clubMeta.oppName,
      oppAbbr: clubMeta.oppAbbr,
      oppLogo: clubMeta.oppLogo,
      fusAbbr: clubMeta.fusAbbr,
      fusLogo: clubMeta.fusLogo,
      isHome,
      sHome,
      sAway,
      fusScore,
      oppScore,
      hasScore,
      isWin: hasScore && fusScore > oppScore,
      isDraw: hasScore && fusScore === oppScore,
      isLoss: hasScore && fusScore < oppScore,
      minutes: resolved.playedMinutes,
      goals: resolved.goalsCount,
      assists: resolved.assistsCount,
      dateStr,
      compLabel: clubMeta.compLabel,
      statusLabel: formatMatchStatusFrench(match.status, hasScore),
      matchCategory,
      isSurclasse,
    };
  });

  const latest = participatedEntries[0];
  if (!latest) {
    return { stats, recentFormMatches, lastMatchData: null };
  }

  const { match: lastMatch, resolved: lastResolved } = latest;
  const clubMeta = resolveClubMetaForMatch(lastMatch, opponentClubs, leagues, mainClub);
  const lastMatchSurc = resolveMatchSurclassement(lastMatch, playerId, playerBaseCategory);
  const isHome = lastMatch.is_home ?? true;
  const hasScore = lastMatch.score_home != null && lastMatch.score_away != null;
  const sHome = hasScore ? Number(lastMatch.score_home) : 0;
  const sAway = hasScore ? Number(lastMatch.score_away) : 0;
  const fusScore = isHome ? sHome : sAway;
  const oppScore = isHome ? sAway : sHome;
  const matchDate = lastMatch.match_date ? new Date(lastMatch.match_date) : null;
  const timeAgoStr = matchDate
    ? matchDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date non précisée';

  const lastMatchData: PlayerLastMatchDetail = {
    id: lastMatch.id,
    compName: clubMeta.compName,
    category: lastMatchSurc.matchCategory,
    isSurclasse: lastMatchSurc.isSurclasse,
    timeAgoStr,
    statusLabel: formatMatchStatusFrench(lastMatch.status, hasScore),
    isHome,
    homeName: isHome ? clubMeta.myClubName : clubMeta.oppName,
    homeAbbr: isHome ? clubMeta.fusAbbr : clubMeta.oppAbbr,
    homeLogo: isHome ? clubMeta.fusLogo : clubMeta.oppLogo,
    awayName: isHome ? clubMeta.oppName : clubMeta.myClubName,
    awayAbbr: isHome ? clubMeta.oppAbbr : clubMeta.fusAbbr,
    awayLogo: isHome ? clubMeta.oppLogo : clubMeta.fusLogo,
    sHome,
    sAway,
    fusScore,
    oppScore,
    fusAbbr: clubMeta.fusAbbr,
    oppAbbr: clubMeta.oppAbbr,
    oppName: clubMeta.oppName,
    oppLogo: clubMeta.oppLogo,
    hasScore,
    isWin: hasScore && fusScore > oppScore,
    isDraw: hasScore && fusScore === oppScore,
    isLoss: hasScore && fusScore < oppScore,
    goalMinutes: lastResolved.goalMinutes,
    yellowCardMinutes: lastResolved.yellowCardMinutes,
    redCardMinutes: lastResolved.redCardMinutes,
    totalMinutes: lastResolved.totalMinutes,
    playedMinutes: lastResolved.playedMinutes,
    subInMinute: lastResolved.subInMinute,
    subOutMinute: lastResolved.subOutMinute,
    isStarter: lastResolved.isStarter,
    roleLabel: lastResolved.roleLabel,
    rating: lastResolved.rating,
    assistsCount: lastResolved.assistsCount,
  };

  return { stats, recentFormMatches, lastMatchData };
}
