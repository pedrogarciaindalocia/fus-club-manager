import type { Match, OpponentMatch, Club, StandingRow } from '../types';
import {
  computeRankedStandingsFromMatches,
  type RankableMatchInput,
} from './standingsRankingEngine';

export interface StandingsOptions {
  leagueId?: string;
  category?: string; // 'All' or specific category
  expectedTotalDays?: number;
}

/**
 * Vérifie si un match est un match amical ou une opposition interne (à exclure du classement)
 */
export function isFriendlyOrScrimmage(m: Match | OpponentMatch, mainClubId?: string): boolean {
  // 1. Un match officiel doit obligatoirement être rattaché à une compétition officielle
  if (!m.league_id) return true;

  // 2. Opposition interne
  const isInternal = (m as any).match_type === 'internal_scrimmage'
    || (m as any).lineup?.internal_opposition?.is_internal_scrimmage
    || ((m as any).notes && (m as any).notes.toLowerCase().includes('[opposition interne]'))
    || (mainClubId && (m as any).opponent_id === mainClubId);
  if (isInternal) return true;

  // 3. Match Amical explicite (catégorie, notes, match_type)
  const cat = (m.category || '').toLowerCase();
  const notes = ((m as any).notes || '').toLowerCase();
  const matchType = ((m as any).match_type || '').toLowerCase();

  if (
    cat.includes('amical') ||
    notes.includes('amical') ||
    matchType === 'friendly' ||
    matchType === 'amical'
  ) {
    return true;
  }

  return false;
}

/**
 * Calcule le classement officiel d'un championnat en agrégeant :
 * 1. Les matchs officiels du FUS (table matches)
 * 2. Les matchs officiels entre adversaires (table opponent_matches)
 *
 * RÈGLES STRICTES :
 * - EXCLUSION des matchs amicaux et des oppositions internes.
 * - SEULS les clubs engagés / participant officiellement au championnat sont affichés.
 * - Victoire = 3 points
 * - Match Nul = 1 point
 * - Défaite = 0 point
 *
 * RÈGLES DE DÉPARTAGE EN CAS D'ÉGALITÉ DE POINTS :
 * 1. Classement provisoire (avant clôture de la phase retour entre équipes à égalité ou fin du championnat) :
 *    - Différence de buts générale (prioritaire)
 *    - Meilleure attaque (second critère temporaire)
 * 2. Confrontations directes activées uniquement une fois la phase retour entre les équipes ex æquo clôturée
 *    ou à l'issue de la dernière journée du championnat.
 */
export function calculateStandings(
  fusMatches: Match[],
  opponentMatches: OpponentMatch[],
  allClubs: Club[],
  mainClub: Club | null,
  options?: StandingsOptions
): StandingRow[] {
  const { leagueId, category, expectedTotalDays } = options || {};

  // Le classement officiel se fait STRICTEMENT par catégorie (pas de cumul tous âges confondus)
  const targetCategory = category && category !== 'All' ? category : 'U17';

  // Filtrage préliminaire des matchs FUS : ligue + non-amicaux + catégorie stricte
  const officialFusMatches = fusMatches.filter(m => {
    if (isFriendlyOrScrimmage(m, mainClub?.id)) return false;
    if (leagueId && m.league_id !== leagueId) return false;
    if (m.category !== targetCategory) return false;
    return true;
  });

  // Filtrage préliminaire des matchs adverses : ligue + non-amicaux + catégorie stricte
  const officialOppMatches = opponentMatches.filter(m => {
    if (isFriendlyOrScrimmage(m, mainClub?.id)) return false;
    if (leagueId && m.league_id !== leagueId) return false;
    if (m.category !== targetCategory) return false;
    return true;
  });

  if (officialFusMatches.length === 0 && officialOppMatches.length === 0) {
    return [];
  }

  const getClubMeta = (clubId: string) => {
    const isFus = Boolean(mainClub && clubId === mainClub.id);
    const found = allClubs.find(c => c.id === clubId);
    return {
      name: isFus ? (mainClub?.name || 'FUS Rabat') : (found?.name || 'Club inconnu'),
      logo: isFus ? (mainClub?.logo_url || null) : (found?.logo_url || null),
      isFus,
    };
  };

  const rankableMatches: RankableMatchInput[] = [];

  for (const m of officialFusMatches) {
    if (!mainClub?.id || !m.opponent_id) continue;
    const fusIsHome = m.is_home ?? true;
    const homeId = fusIsHome ? mainClub.id : m.opponent_id;
    const awayId = fusIsHome ? m.opponent_id : mainClub.id;
    const homeMeta = getClubMeta(homeId);
    const awayMeta = getClubMeta(awayId);

    rankableMatches.push({
      id: m.id,
      homeKey: homeId,
      homeName: homeMeta.name,
      homeLogo: homeMeta.logo,
      isHomeFus: homeMeta.isFus,
      awayKey: awayId,
      awayName: awayMeta.name,
      awayLogo: awayMeta.logo,
      isAwayFus: awayMeta.isFus,
      scoreHome: m.score_home,
      scoreAway: m.score_away,
      status: m.status,
      matchDay: Number((m as any).match_day || 0) || undefined,
      matchDate: m.match_date,
    });
  }

  for (const m of officialOppMatches) {
    if (!m.home_club_id || !m.away_club_id) continue;
    const homeMeta = getClubMeta(m.home_club_id);
    const awayMeta = getClubMeta(m.away_club_id);

    rankableMatches.push({
      id: m.id,
      homeKey: m.home_club_id,
      homeName: homeMeta.name,
      homeLogo: homeMeta.logo,
      isHomeFus: homeMeta.isFus,
      awayKey: m.away_club_id,
      awayName: awayMeta.name,
      awayLogo: awayMeta.logo,
      isAwayFus: awayMeta.isFus,
      scoreHome: m.score_home,
      scoreAway: m.score_away,
      status: m.status,
      matchDay: Number((m as any).match_day || 0) || undefined,
      matchDate: m.match_date,
    });
  }

  const { standings } = computeRankedStandingsFromMatches(rankableMatches, {
    expectedTotalDays,
  });

  return standings.map(item => ({
    position: item.position,
    club_id: item.team_key,
    club_name: item.team_name,
    club_logo: item.club_logo,
    is_fus: item.is_fus,
    played: item.played,
    won: item.won,
    drawn: item.drawn,
    lost: item.lost,
    goals_for: item.goals_for,
    goals_against: item.goals_against,
    goal_difference: item.goal_difference,
    points: item.points,
    form: item.form,
  }));
}
