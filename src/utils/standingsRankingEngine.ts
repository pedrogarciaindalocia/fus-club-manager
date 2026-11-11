export interface RankableMatchInput {
  id?: string;
  homeKey: string;
  homeName: string;
  homeLogo?: string | null;
  isHomeFus?: boolean;
  awayKey: string;
  awayName: string;
  awayLogo?: string | null;
  isAwayFus?: boolean;
  scoreHome: number | null;
  scoreAway: number | null;
  status: string;
  matchDay?: number;
  matchDate?: string;
}

export interface ParticipatingTeamSeed {
  key: string;
  name: string;
  logo?: string | null;
  isFus?: boolean;
}

export interface RankStandingsOptions {
  /** Nombre total attendu de journées pour détecter la fin du championnat (ex: 18 ou 34). */
  expectedTotalDays?: number;
  /** Permet de forcer l'activation finale si connu en amont. */
  championshipCompletedOverride?: boolean;
  /** Équipes inscrites devant apparaître même avec 0 match joué. */
  participatingTeams?: ParticipatingTeamSeed[];
}

export type TieBreakerRuleApplied =
  | 'h2h'
  | 'general_after_h2h'
  | 'provisional_gd'
  | 'provisional_gf'
  | 'h2h_subtie'
  | 'wins_or_alpha'
  | null;

export interface ComputedStandingEntry {
  position: number;
  team_key: string;
  team_name: string;
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
}

export interface ComputedStandingsResult {
  standings: ComputedStandingEntry[];
  meta: {
    isChampionshipCompleted: boolean;
    totalTeams: number;
    finishedMatchesCount: number;
    scheduledMatchesCount: number;
    expectedTotalDays: number;
    maxFinishedDay: number;
    hasTiedPoints: boolean;
    hasAnyH2HActivated: boolean;
    hasAnyProvisionalTie: boolean;
  };
}

interface InternalTeamStats {
  key: string;
  name: string;
  logo: string | null;
  isFus: boolean;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  form: Array<'W' | 'D' | 'L'>;
}

interface NormalizedFinishedMatch {
  homeKey: string;
  awayKey: string;
  scoreH: number;
  scoreA: number;
  matchDay: number;
  matchDate: string;
}

export function isRankableMatchFinished(m: {
  status?: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
}): boolean {
  const status = String(m.status || '').trim().toLowerCase();
  if (status === 'scheduled' || status === 'postponed' || status === 'cancelled' || status === 'canceled' || status === 'draft') {
    return false;
  }
  if (status === 'finished' || status === 'completed' || status === 'terminated' || status === 'played') {
    return m.scoreHome !== null && m.scoreAway !== null;
  }
  return m.scoreHome !== null && m.scoreAway !== null;
}

function hasClosedReturnLegForGroup(
  teamKeys: string[],
  playedDirections: Set<string>
): boolean {
  if (teamKeys.length < 2) return false;
  for (let i = 0; i < teamKeys.length; i++) {
    for (let j = i + 1; j < teamKeys.length; j++) {
      const a = teamKeys[i];
      const b = teamKeys[j];
      const forward = playedDirections.has(`${a}__VS__${b}`);
      const backward = playedDirections.has(`${b}__VS__${a}`);
      if (!forward || !backward) {
        return false;
      }
    }
  }
  return true;
}

function computeMiniTableStats(
  groupKeys: string[],
  finishedMatches: NormalizedFinishedMatch[]
): Map<string, { h2hPoints: number; h2hGD: number; h2hGF: number; h2hAwayGF: number }> {
  const keySet = new Set(groupKeys);
  const map = new Map<string, { h2hPoints: number; h2hGD: number; h2hGF: number; h2hAwayGF: number }>();
  for (const k of groupKeys) {
    map.set(k, { h2hPoints: 0, h2hGD: 0, h2hGF: 0, h2hAwayGF: 0 });
  }

  for (const m of finishedMatches) {
    if (!keySet.has(m.homeKey) || !keySet.has(m.awayKey)) continue;
    const h = map.get(m.homeKey)!;
    const a = map.get(m.awayKey)!;

    h.h2hGF += m.scoreH;
    h.h2hGD += m.scoreH - m.scoreA;

    a.h2hGF += m.scoreA;
    a.h2hGD += m.scoreA - m.scoreH;
    a.h2hAwayGF += m.scoreA;

    if (m.scoreH > m.scoreA) {
      h.h2hPoints += 3;
    } else if (m.scoreH < m.scoreA) {
      a.h2hPoints += 3;
    } else {
      h.h2hPoints += 1;
      a.h2hPoints += 1;
    }
  }

  return map;
}

function sortByGeneralCriteria(
  teams: InternalTeamStats[],
  playedDirections: Set<string>,
  finishedMatches: NormalizedFinishedMatch[]
): Array<{ team: InternalTeamStats; rule: TieBreakerRuleApplied; h2hUsed: boolean }> {
  const sorted = [...teams].sort((a, b) => {
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    if (b.won !== a.won) return b.won - a.won;
    return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
  });

  // Vérifier si un sous-groupe reste à égalité sur Diff. générale ET Attaque générale,
  // et si sa phase retour directe est déjà bouclée entre ces clubs précis.
  const output: Array<{ team: InternalTeamStats; rule: TieBreakerRuleApplied; h2hUsed: boolean }> = [];
  let idx = 0;
  while (idx < sorted.length) {
    const base = sorted[idx];
    let end = idx + 1;
    while (
      end < sorted.length &&
      sorted[end].goal_difference === base.goal_difference &&
      sorted[end].goals_for === base.goals_for
    ) {
      end++;
    }
    const subBucket = sorted.slice(idx, end);
    if (subBucket.length >= 2) {
      const subKeys = subBucket.map((t) => t.key);
      if (hasClosedReturnLegForGroup(subKeys, playedDirections)) {
        const mini = computeMiniTableStats(subKeys, finishedMatches);
        subBucket.sort((a, b) => {
          const ma = mini.get(a.key)!;
          const mb = mini.get(b.key)!;
          if (mb.h2hPoints !== ma.h2hPoints) return mb.h2hPoints - ma.h2hPoints;
          if (mb.h2hGD !== ma.h2hGD) return mb.h2hGD - ma.h2hGD;
          if (mb.h2hGF !== ma.h2hGF) return mb.h2hGF - ma.h2hGF;
          if (b.won !== a.won) return b.won - a.won;
          return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
        });
        subBucket.forEach((t) => output.push({ team: t, rule: 'h2h_subtie', h2hUsed: true }));
        idx = end;
        continue;
      }
    }

    for (const t of subBucket) {
      const differsByGD = sorted.some((o) => o.key !== t.key && o.goal_difference !== t.goal_difference);
      const sameGDAnother = sorted.some((o) => o.key !== t.key && o.goal_difference === t.goal_difference);
      const differsByGFWithinSameGD =
        sameGDAnother &&
        sorted.some(
          (o) =>
            o.key !== t.key &&
            o.goal_difference === t.goal_difference &&
            o.goals_for !== t.goals_for
        );

      let rule: TieBreakerRuleApplied = 'wins_or_alpha';
      if (sameGDAnother && differsByGFWithinSameGD) {
        rule = 'provisional_gf';
      } else if (differsByGD) {
        rule = 'provisional_gd';
      }
      output.push({ team: t, rule, h2hUsed: false });
    }
    idx = end;
  }

  return output;
}

function sortByH2HCascade(
  teams: InternalTeamStats[],
  finishedMatches: NormalizedFinishedMatch[]
): Array<{ team: InternalTeamStats; rule: TieBreakerRuleApplied; h2hUsed: boolean }> {
  if (teams.length <= 1) {
    return teams.map((team) => ({ team, rule: null, h2hUsed: false }));
  }

  const groupKeys = teams.map((t) => t.key);
  const mini = computeMiniTableStats(groupKeys, finishedMatches);

  const ordered = [...teams].sort((a, b) => {
    const ma = mini.get(a.key)!;
    const mb = mini.get(b.key)!;
    if (mb.h2hPoints !== ma.h2hPoints) return mb.h2hPoints - ma.h2hPoints;
    if (mb.h2hGD !== ma.h2hGD) return mb.h2hGD - ma.h2hGD;
    if (mb.h2hGF !== ma.h2hGF) return mb.h2hGF - ma.h2hGF;
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    if (b.won !== a.won) return b.won - a.won;
    return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
  });

  // Partitionner sur le triplet H2H pour cascade récursive si >= 2 clubs (sur 3+) restent égaux en H2H
  const result: Array<{ team: InternalTeamStats; rule: TieBreakerRuleApplied; h2hUsed: boolean }> = [];
  let idx = 0;
  while (idx < ordered.length) {
    const base = ordered[idx];
    const baseMini = mini.get(base.key)!;
    let end = idx + 1;
    while (end < ordered.length) {
      const nextMini = mini.get(ordered[end].key)!;
      if (
        nextMini.h2hPoints === baseMini.h2hPoints &&
        nextMini.h2hGD === baseMini.h2hGD &&
        nextMini.h2hGF === baseMini.h2hGF
      ) {
        end++;
      } else {
        break;
      }
    }

    const sub = ordered.slice(idx, end);
    if (sub.length > 1 && sub.length < teams.length) {
      // Relance mini-classement H2H uniquement entre les clubs encore à égalité
      const subRanked = sortByH2HCascade(sub, finishedMatches);
      result.push(...subRanked);
    } else if (sub.length === 1) {
      result.push({ team: sub[0], rule: 'h2h', h2hUsed: true });
    } else {
      // Égalité H2H totale -> départage sur Différence de buts générale, Meilleure attaque générale, etc.
      sub.forEach((t) => result.push({ team: t, rule: 'general_after_h2h', h2hUsed: true }));
    }

    idx = end;
  }

  return result;
}

/**
 * Calcule le classement complet à partir des seuls résultats de matchs.
 *
 * RÈGLES OFFICIELLES IMPLÉMENTÉES :
 * 1. Points généraux (Victoire = 3, Nul = 1, Défaite = 0).
 * 2. Classement provisoire (avant clôture des confrontations Aller/Retour entre ex æquo ou fin de saison) :
 *    - Priorité 1 : Différence de buts générale (`goal_difference`).
 *    - Priorité 2 : Meilleure attaque (`goals_for`).
 * 3. Confrontations directes activées UNIQUEMENT si :
 *    - la phase retour entre ces équipes ex æquo est clôturée (Aller + Retour disputés), OU
 *    - la dernière journée du championnat est atteinte (saison terminée).
 */
export function computeRankedStandingsFromMatches(
  allMatches: RankableMatchInput[],
  options?: RankStandingsOptions
): ComputedStandingsResult {
  const statsMap = new Map<string, InternalTeamStats>();

  const ensureTeam = (
    key: string,
    name: string,
    logo?: string | null,
    isFus = false
  ): InternalTeamStats => {
    const cleanKey = key.trim();
    const existing = statsMap.get(cleanKey);
    if (existing) {
      if (!existing.logo && logo) existing.logo = logo;
      if (isFus) existing.isFus = true;
      return existing;
    }
    const created: InternalTeamStats = {
      key: cleanKey,
      name: name.trim() || cleanKey,
      logo: logo && logo !== 'null' ? logo : null,
      isFus,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      points: 0,
      form: [],
    };
    statsMap.set(cleanKey, created);
    return created;
  };

  (options?.participatingTeams || []).forEach((seed) => {
    if (seed.key) {
      ensureTeam(seed.key, seed.name, seed.logo, Boolean(seed.isFus));
    }
  });

  allMatches.forEach((m) => {
    if (m.homeKey) ensureTeam(m.homeKey, m.homeName, m.homeLogo, Boolean(m.isHomeFus));
    if (m.awayKey) ensureTeam(m.awayKey, m.awayName, m.awayLogo, Boolean(m.isAwayFus));
  });

  const finishedMatches: NormalizedFinishedMatch[] = [];
  let scheduledMatchesCount = 0;

  allMatches.forEach((m) => {
    if (!m.homeKey || !m.awayKey || m.homeKey === m.awayKey) return;
    if (isRankableMatchFinished(m)) {
      finishedMatches.push({
        homeKey: m.homeKey.trim(),
        awayKey: m.awayKey.trim(),
        scoreH: Number(m.scoreHome ?? 0),
        scoreA: Number(m.scoreAway ?? 0),
        matchDay: Number(m.matchDay ?? 0),
        matchDate: String(m.matchDate || ''),
      });
    } else if (
      String(m.status || '').toLowerCase() === 'scheduled' ||
      String(m.status || '').toLowerCase() === 'postponed'
    ) {
      scheduledMatchesCount++;
    }
  });

  // Tri chronologique pour construire la forme sur les 5 derniers matchs
  finishedMatches.sort((a, b) => {
    if (a.matchDay !== b.matchDay) return a.matchDay - b.matchDay;
    return a.matchDate.localeCompare(b.matchDate);
  });

  const playedDirections = new Set<string>();
  let maxFinishedDay = 0;

  for (const m of finishedMatches) {
    const home = statsMap.get(m.homeKey)!;
    const away = statsMap.get(m.awayKey)!;

    if (m.matchDay > maxFinishedDay) maxFinishedDay = m.matchDay;
    playedDirections.add(`${m.homeKey}__VS__${m.awayKey}`);

    home.played += 1;
    home.goals_for += m.scoreH;
    home.goals_against += m.scoreA;

    away.played += 1;
    away.goals_for += m.scoreA;
    away.goals_against += m.scoreH;

    if (m.scoreH > m.scoreA) {
      home.won += 1;
      home.points += 3;
      home.form.push('W');

      away.lost += 1;
      away.form.push('L');
    } else if (m.scoreH === m.scoreA) {
      home.drawn += 1;
      home.points += 1;
      home.form.push('D');

      away.drawn += 1;
      away.points += 1;
      away.form.push('D');
    } else {
      home.lost += 1;
      home.form.push('L');

      away.won += 1;
      away.points += 3;
      away.form.push('W');
    }
  }

  statsMap.forEach((team) => {
    team.goal_difference = team.goals_for - team.goals_against;
  });

  const totalTeams = statsMap.size;
  const doubleRoundRobinDays = totalTeams >= 2 ? 2 * (totalTeams - 1) : 0;
  const expectedTotalDays = options?.expectedTotalDays ?? doubleRoundRobinDays;
  const minPlayed = totalTeams > 0
    ? Math.min(...Array.from(statsMap.values()).map((t) => t.played))
    : 0;

  const isChampionshipCompleted = Boolean(
    options?.championshipCompletedOverride ||
      (finishedMatches.length > 0 &&
        scheduledMatchesCount === 0 &&
        expectedTotalDays > 0 &&
        (maxFinishedDay >= expectedTotalDays || (doubleRoundRobinDays > 0 && minPlayed >= doubleRoundRobinDays)))
  );

  // Séparer les équipes ayant déjà au moins 1 résultat saisi (played > 0) de celles sans aucun résultat (played === 0)
  const activeTeams = Array.from(statsMap.values())
    .filter((t) => t.played > 0)
    .sort((a, b) => b.points - a.points);
  const unplayedTeams = Array.from(statsMap.values())
    .filter((t) => t.played === 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

  const finalEntries: ComputedStandingEntry[] = [];

  let hasTiedPoints = false;
  let hasAnyH2HActivated = false;
  let hasAnyProvisionalTie = false;

  let idx = 0;
  while (idx < activeTeams.length) {
    const pts = activeTeams[idx].points;
    let end = idx + 1;
    while (end < activeTeams.length && activeTeams[end].points === pts) {
      end++;
    }
    const bucket = activeTeams.slice(idx, end);

    if (bucket.length === 1) {
      const t = bucket[0];
      finalEntries.push({
        position: finalEntries.length + 1,
        team_key: t.key,
        team_name: t.name,
        club_logo: t.logo,
        is_fus: t.isFus,
        played: t.played,
        won: t.won,
        drawn: t.drawn,
        lost: t.lost,
        goals_for: t.goals_for,
        goals_against: t.goals_against,
        goal_difference: t.goal_difference,
        points: t.points,
        form: t.form.slice(-5),
        is_tied_on_points: false,
        h2h_activated: false,
        tie_breaker_rule: null,
      });
    } else {
      hasTiedPoints = true;
      const bucketKeys = bucket.map((t) => t.key);
      const returnLegClosed = hasClosedReturnLegForGroup(bucketKeys, playedDirections);
      const h2hEligible = isChampionshipCompleted || returnLegClosed;

      const rankedBucket = h2hEligible
        ? sortByH2HCascade(bucket, finishedMatches)
        : sortByGeneralCriteria(bucket, playedDirections, finishedMatches);

      for (const item of rankedBucket) {
        if (item.h2hUsed) hasAnyH2HActivated = true;
        else hasAnyProvisionalTie = true;

        finalEntries.push({
          position: finalEntries.length + 1,
          team_key: item.team.key,
          team_name: item.team.name,
          club_logo: item.team.logo,
          is_fus: item.team.isFus,
          played: item.team.played,
          won: item.team.won,
          drawn: item.team.drawn,
          lost: item.team.lost,
          goals_for: item.team.goals_for,
          goals_against: item.team.goals_against,
          goal_difference: item.team.goal_difference,
          points: item.team.points,
          form: item.team.form.slice(-5),
          is_tied_on_points: true,
          h2h_activated: item.h2hUsed,
          tie_breaker_rule: item.rule,
        });
      }
    }

    idx = end;
  }

  // Équipes sans aucun résultat enregistré : en fin de tableau (affichées avec tirets côté UI)
  for (const t of unplayedTeams) {
    finalEntries.push({
      position: finalEntries.length + 1,
      team_key: t.key,
      team_name: t.name,
      club_logo: t.logo,
      is_fus: t.isFus,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      points: 0,
      form: [],
      is_tied_on_points: false,
      h2h_activated: false,
      tie_breaker_rule: null,
    });
  }

  return {
    standings: finalEntries,
    meta: {
      isChampionshipCompleted,
      totalTeams,
      finishedMatchesCount: finishedMatches.length,
      scheduledMatchesCount,
      expectedTotalDays,
      maxFinishedDay,
      hasTiedPoints,
      hasAnyH2HActivated,
      hasAnyProvisionalTie,
    },
  };
}

