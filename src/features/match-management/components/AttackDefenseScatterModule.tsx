import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  TrendingDown,
  Activity,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import type { StandingRow } from '../../../types';
import {
  assignChronologicalMatchDays,
  type TimelineStandingRow,
} from '../../../utils/championshipTimelineHelper';
import {
  computeRankedStandingsFromMatches,
  isRankableMatchFinished,
  type RankableMatchInput,
} from '../../../utils/standingsRankingEngine';
import { MatchdayTimelineControl } from './MatchdayTimelineControl';

export interface AttackDefenseMatch {
  id?: string;
  date: string;
  journee?: number | string;
  domicile: string; // id ou nom
  exterieur: string; // id ou nom
  scoreDom: number | null;
  scoreExt: number | null;
  status?: string;
}

export interface AttackDefenseClub {
  id: string;
  nom: string;
  shortName?: string | null;
  logoUrl?: string | null;
  isFus?: boolean;
}

export interface ClubCalculatedStats {
  clubId: string;
  nom: string;
  shortName: string;
  logoUrl?: string | null;
  isFus?: boolean;
  played: number; // MJ
  won: number; // V
  drawn: number; // N
  lost: number; // D
  goalsFor: number; // Buts marqués (BP)
  goalsAgainst: number; // Buts encaissés (BC)
  goalDiff: number; // Diff
  points: number; // Pts
  rank: number;
  positionDelta?: number | null;
  tier: 'top' | 'mid' | 'low';
}

export interface AttackDefenseScatterModuleProps {
  matches?: AttackDefenseMatch[];
  clubs?: AttackDefenseClub[];
  standings?: StandingRow[];
  dateInitiale?: string;
  onClubPress?: (club: AttackDefenseClub & { stats: ClubCalculatedStats }) => void;

  // Données directes optionnelles du projet FuscClub
  rawFusMatches?: any[];
  rawOpponentMatches?: any[];
  rawClubs?: any[];
  mainClub?: any;
  selectedLeagueName?: string;
  selectedSeason?: string;
  selectedCategory?: string;

  // Contrôle chronologique partagé et classement lié optionnel
  selectedJournee?: number;
  onJourneeChange?: (day: number) => void;
  isPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  maxJourneeOverride?: number;
  latestPlayedJourneeOverride?: number;
  firstPlayedJourneeOverride?: number;
  finishedDays?: number[];
  linkedStandings?: TimelineStandingRow[];
  isChampionshipCompletedOverride?: boolean;
}

/**
 * Module « Attaque vs Défense » lié dynamiquement au classement évolutif par journée.
 * Nuage de points comparant l'efficacité offensive (X) et défensive inversée (Y),
 * synchronisé avec le lecteur chronologique (Lecture, < Jx >, Aujourd'hui, Slider)
 * et le classement cumulé en direct.
 */
export const AttackDefenseScatterModule: React.FC<AttackDefenseScatterModuleProps> = ({
  matches: propMatches,
  clubs: propClubs,
  standings: propStandings,
  onClubPress,
  rawFusMatches,
  rawOpponentMatches,
  rawClubs,
  mainClub,
  selectedLeagueName = 'Botola Pro Inwi',
  selectedSeason = '2025/2026',
  selectedCategory = 'U21',
  selectedJournee: controlledJournee,
  onJourneeChange,
  isPlaying: controlledPlaying,
  onPlayingChange,
  maxJourneeOverride,
  latestPlayedJourneeOverride,
  firstPlayedJourneeOverride,
  finishedDays: controlledFinishedDays,
  linkedStandings,
  isChampionshipCompletedOverride,
}) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const isDark = theme === 'dark';

  // 1. Normalisation des clubs
  const normalizedClubs: AttackDefenseClub[] = useMemo(() => {
    if (propClubs && propClubs.length > 0) return propClubs;

    const list: AttackDefenseClub[] = [];
    if (mainClub) {
      list.push({
        id: mainClub.id,
        nom: mainClub.name || 'FUS Rabat',
        shortName: mainClub.short_name || 'FUS',
        logoUrl: mainClub.logo_url,
        isFus: true,
      });
    }
    (rawClubs || []).forEach((c: any) => {
      if (!list.some((existing) => existing.id === c.id)) {
        list.push({
          id: c.id,
          nom: c.name || 'Club',
          shortName: c.short_name || (c.name ? c.name.slice(0, 3).toUpperCase() : 'CLB'),
          logoUrl: c.logo_url,
          isFus: false,
        });
      }
    });
    return list;
  }, [propClubs, rawClubs, mainClub]);

  // 2. Normalisation des matchs avec journée résolue chronologiquement si absente
  const normalizedMatches: Array<AttackDefenseMatch & { resolvedJournee: number }> = useMemo(() => {
    if (propMatches && propMatches.length > 0) {
      return propMatches.map((m) => {
        const j =
          typeof m.journee === 'number'
            ? m.journee
            : parseInt(String(m.journee || '1').replace(/\D/g, ''), 10);
        return {
          ...m,
          resolvedJournee: Number.isFinite(j) && j > 0 ? j : 1,
        };
      });
    }

    const rawUnified: Array<{
      id?: string;
      date: string;
      domicile: string;
      exterieur: string;
      scoreDom: number;
      scoreExt: number;
      status: string;
      round_name?: string | null;
      match_date?: string | null;
    }> = [];

    (rawFusMatches || []).forEach((m: any) => {
      if (m.score_home !== null && m.score_away !== null && m.status === 'finished') {
        const isFusHome = m.is_home ?? (mainClub ? m.home_club_id === mainClub.id : true);
        const homeId = isFusHome ? mainClub?.id || 'fus' : m.opponent_id;
        const awayId = isFusHome ? m.opponent_id : mainClub?.id || 'fus';
        if (!homeId || !awayId) return;

        rawUnified.push({
          id: m.id,
          date: m.match_date || new Date().toISOString(),
          domicile: homeId,
          exterieur: awayId,
          scoreDom: Number(m.score_home),
          scoreExt: Number(m.score_away),
          status: m.status,
          round_name: m.round_name ?? null,
          match_date: m.match_date,
        });
      }
    });

    (rawOpponentMatches || []).forEach((m: any) => {
      if (m.score_home !== null && m.score_away !== null && m.status === 'finished') {
        if (!m.home_club_id || !m.away_club_id) return;
        rawUnified.push({
          id: m.id,
          date: m.match_date || new Date().toISOString(),
          domicile: m.home_club_id,
          exterieur: m.away_club_id,
          scoreDom: Number(m.score_home),
          scoreExt: Number(m.score_away),
          status: m.status,
          round_name: m.round_name ?? null,
          match_date: m.match_date,
        });
      }
    });

    return assignChronologicalMatchDays(rawUnified).map((m) => ({
      id: m.id,
      date: m.date,
      journee: m.resolvedDay,
      resolvedJournee: m.resolvedDay,
      domicile: m.domicile,
      exterieur: m.exterieur,
      scoreDom: m.scoreDom,
      scoreExt: m.scoreExt,
      status: m.status,
    }));
  }, [propMatches, rawFusMatches, rawOpponentMatches, mainClub]);

  // Journées jouées et bornes temporelles
  const computedFinishedDays = useMemo(() => {
    if (controlledFinishedDays) return controlledFinishedDays;
    return Array.from(
      new Set(
        normalizedMatches
          .filter(
            (m) =>
              m.scoreDom !== null &&
              m.scoreExt !== null &&
              isRankableMatchFinished({ status: m.status, scoreHome: m.scoreDom, scoreAway: m.scoreExt })
          )
          .map((m) => m.resolvedJournee)
      )
    ).sort((a, b) => a - b);
  }, [controlledFinishedDays, normalizedMatches]);

  const maxJournee = useMemo(() => {
    if (maxJourneeOverride && maxJourneeOverride > 0) return maxJourneeOverride;
    const roundRobinDays = normalizedClubs.length >= 2 ? 2 * (normalizedClubs.length - 1) : 0;
    const maxMatchDay = normalizedMatches.reduce((max, m) => Math.max(max, m.resolvedJournee), 0);
    return Math.max(30, roundRobinDays, maxMatchDay);
  }, [maxJourneeOverride, normalizedClubs.length, normalizedMatches]);

  const firstPlayedJournee =
    firstPlayedJourneeOverride ?? (computedFinishedDays.length > 0 ? computedFinishedDays[0] : 1);
  const latestPlayedJournee =
    latestPlayedJourneeOverride ??
    (computedFinishedDays.length > 0 ? computedFinishedDays[computedFinishedDays.length - 1] : 1);

  const [internalJournee, setInternalJournee] = useState<number>(latestPlayedJournee || 1);
  const [internalPlaying, setInternalPlaying] = useState<boolean>(false);
  const [activeHoverClub, setActiveHoverClub] = useState<ClubCalculatedStats | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isControlledDay = typeof controlledJournee === 'number' && controlledJournee > 0;
  const activeJournee = isControlledDay ? controlledJournee! : internalJournee;
  const isPlaying = controlledPlaying !== undefined ? controlledPlaying : internalPlaying;

  const updateJournee = (day: number) => {
    const clamped = Math.min(Math.max(1, day), maxJournee);
    if (onJourneeChange) onJourneeChange(clamped);
    if (!isControlledDay) setInternalJournee(clamped);
  };

  const setPlaying = (playing: boolean) => {
    if (onPlayingChange) onPlayingChange(playing);
    if (controlledPlaying === undefined) setInternalPlaying(playing);
  };

  useEffect(() => {
    if (!isControlledDay && latestPlayedJournee > 0) {
      setInternalJournee(latestPlayedJournee);
    }
  }, [latestPlayedJournee, isControlledDay]);

  // Auto-lecture chronologique uniquement quand non géré par le parent
  const activeJourneeRef = useRef(activeJournee);
  activeJourneeRef.current = activeJournee;

  useEffect(() => {
    if (controlledPlaying !== undefined) return;
    if (internalPlaying) {
      const playCap = Math.max(latestPlayedJournee, 1);
      playTimerRef.current = setInterval(() => {
        setInternalJournee((prev) => {
          if (prev >= playCap) {
            setInternalPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 950);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [internalPlaying, controlledPlaying, latestPlayedJournee]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      setPlaying(false);
      return;
    }
    const playCap = Math.max(latestPlayedJournee, 1);
    if (activeJourneeRef.current >= playCap) {
      updateJournee(firstPlayedJournee);
    }
    setPlaying(true);
  };

  // 3. Stats et classement calculés cumulativement jusqu'à `activeJournee`
  const { allRankedStats, isChampionshipCompleted } = useMemo<{
    allRankedStats: ClubCalculatedStats[];
    isChampionshipCompleted: boolean;
  }>(() => {
    // Si le parent fournit directement le classement chronologique calculé pour activeJournee :
    if (linkedStandings !== undefined) {
      const total = linkedStandings.length;
      const list = linkedStandings.map((row) => {
        let tier: 'top' | 'mid' | 'low' = 'mid';
        if (row.played > 0) {
          if (row.position <= Math.max(3, Math.ceil(total * 0.25))) tier = 'top';
          else if (row.position > Math.max(1, total - Math.ceil(total * 0.25))) tier = 'low';
        }
        return {
          clubId: row.club_id || row.team_key,
          nom: row.team_name,
          shortName: row.short_name || row.team_name.slice(0, 4).toUpperCase(),
          logoUrl: row.club_logo,
          isFus: row.is_fus,
          played: row.played,
          won: row.won,
          drawn: row.drawn,
          lost: row.lost,
          goalsFor: row.goals_for,
          goalsAgainst: row.goals_against,
          goalDiff: row.goal_difference,
          points: row.points,
          rank: row.position,
          positionDelta: row.position_delta,
          tier,
        };
      });
      return {
        allRankedStats: list,
        isChampionshipCompleted: Boolean(isChampionshipCompletedOverride),
      };
    }

    // Calcul local direct à partir des matchs jusqu'à activeJournee (toujours prioritaire sur propStandings statique !)
    if (normalizedMatches.length > 0) {
      const clubsMap = new Map<string, AttackDefenseClub>();
      normalizedClubs.forEach((c) => clubsMap.set(c.id, c));

      const rankableAll: RankableMatchInput[] = normalizedMatches.map((m) => {
        const homeClub = clubsMap.get(m.domicile);
        const awayClub = clubsMap.get(m.exterieur);
        return {
          id: m.id,
          homeKey: m.domicile,
          homeName: homeClub?.nom || m.domicile,
          homeLogo: homeClub?.logoUrl || null,
          isHomeFus: homeClub?.isFus || false,
          awayKey: m.exterieur,
          awayName: awayClub?.nom || m.exterieur,
          awayLogo: awayClub?.logoUrl || null,
          isAwayFus: awayClub?.isFus || false,
          scoreHome: m.scoreDom,
          scoreAway: m.scoreExt,
          status: m.status || 'finished',
          matchDay: m.resolvedJournee,
          matchDate: m.date,
        };
      });

      const targetRankable = rankableAll.filter((m) => Number(m.matchDay || 0) <= activeJournee);
      if (targetRankable.length === 0) {
        return { allRankedStats: [], isChampionshipCompleted: false };
      }

      const hasFuture = rankableAll.some((m) => Number(m.matchDay || 0) > activeJournee);
      const computed = computeRankedStandingsFromMatches(targetRankable, {
        expectedTotalDays: maxJournee,
        championshipCompletedOverride: hasFuture ? false : undefined,
      });

      const finishedUpToActive = computedFinishedDays.filter((d) => d <= activeJournee);
      const prevRankMap = new Map<string, number>();
      if (finishedUpToActive.length >= 2) {
        const prevDay = finishedUpToActive[finishedUpToActive.length - 2];
        const prevComputed = computeRankedStandingsFromMatches(
          rankableAll.filter((m) => Number(m.matchDay || 0) <= prevDay),
          { expectedTotalDays: maxJournee, championshipCompletedOverride: false }
        );
        prevComputed.standings.forEach((r) => {
          if (r.played > 0) prevRankMap.set(r.team_key, r.position);
        });
      }

      const total = computed.standings.length;
      return {
        allRankedStats: computed.standings.map((row) => {
          const clubMeta = clubsMap.get(row.team_key);
          const prevRank = prevRankMap.get(row.team_key);
          const delta = row.played > 0 && prevRank !== undefined ? prevRank - row.position : null;
          let tier: 'top' | 'mid' | 'low' = 'mid';
          if (row.played > 0) {
            if (row.position <= Math.max(3, Math.ceil(total * 0.25))) tier = 'top';
            else if (row.position > Math.max(1, total - Math.ceil(total * 0.25))) tier = 'low';
          }
          return {
            clubId: row.team_key,
            nom: row.team_name,
            shortName: clubMeta?.shortName || row.team_name.slice(0, 4).toUpperCase(),
            logoUrl: row.club_logo || clubMeta?.logoUrl,
            isFus: row.is_fus,
            played: row.played,
            won: row.won,
            drawn: row.drawn,
            lost: row.lost,
            goalsFor: row.goals_for,
            goalsAgainst: row.goals_against,
            goalDiff: row.goal_difference,
            points: row.points,
            rank: row.position,
            positionDelta: delta,
            tier,
          };
        }),
        isChampionshipCompleted: computed.meta.isChampionshipCompleted,
      };
    }

    // Dernier recours uniquement si aucun match n'existe
    if (propStandings && propStandings.length > 0) {
      const total = propStandings.length;
      return {
        allRankedStats: propStandings.map((s) => {
          const rank = s.position || 1;
          let tier: 'top' | 'mid' | 'low' = 'mid';
          if (rank <= Math.max(3, Math.ceil(total * 0.25))) tier = 'top';
          else if (rank > Math.max(1, total - Math.ceil(total * 0.25))) tier = 'low';
          return {
            clubId: s.club_id,
            nom: s.club_name,
            shortName: s.club_name.length <= 4 ? s.club_name : s.club_name.slice(0, 3).toUpperCase(),
            logoUrl: s.club_logo,
            isFus: s.is_fus,
            played: s.played,
            won: s.won,
            drawn: s.drawn,
            lost: s.lost,
            goalsFor: s.goals_for,
            goalsAgainst: s.goals_against,
            goalDiff: s.goal_difference,
            points: s.points,
            rank,
            positionDelta: null,
            tier,
          };
        }),
        isChampionshipCompleted: false,
      };
    }

    return { allRankedStats: [], isChampionshipCompleted: false };
  }, [
    linkedStandings,
    isChampionshipCompletedOverride,
    normalizedMatches,
    normalizedClubs,
    activeJournee,
    maxJournee,
    computedFinishedDays,
    propStandings,
  ]);

  // Seuls les clubs ayant réellement joué >= 1 match jusqu'à la journée active apparaissent dans le nuage
  const clubsStats = useMemo(
    () => allRankedStats.filter((c) => c.played > 0),
    [allRankedStats]
  );

  // Garder activeHoverClub à jour lorsque la journée avance
  useEffect(() => {
    if (!activeHoverClub) return;
    const updated = clubsStats.find((c) => c.clubId === activeHoverClub.clubId) || null;
    setActiveHoverClub(updated);
  }, [clubsStats]);

  // 4. Moyennes et échelles du nuage
  const { minX, maxX, minY, maxY, avgGF, avgGA } = useMemo(() => {
    if (clubsStats.length === 0) {
      return { minX: 0, maxX: 10, minY: 0, maxY: 10, avgGF: 0, avgGA: 0 };
    }

    const allGF = clubsStats.map((c) => c.goalsFor);
    const allGA = clubsStats.map((c) => c.goalsAgainst);

    const sumGF = allGF.reduce((acc, v) => acc + v, 0);
    const sumGA = allGA.reduce((acc, v) => acc + v, 0);
    const avgGF = Math.round((sumGF / clubsStats.length) * 10) / 10;
    const avgGA = Math.round((sumGA / clubsStats.length) * 10) / 10;

    const rawMinGF = Math.min(...allGF);
    const rawMaxGF = Math.max(...allGF);
    const rawMinGA = Math.min(...allGA);
    const rawMaxGA = Math.max(...allGA);

    const minX = Math.max(0, Math.floor(rawMinGF - 2));
    const maxX = Math.max(minX + 8, Math.ceil(rawMaxGF + 3));
    const minY = Math.max(0, Math.floor(rawMinGA - 2));
    const maxY = Math.max(minY + 8, Math.ceil(rawMaxGA + 3));

    return { minX, maxX, minY, maxY, avgGF, avgGA };
  }, [clubsStats]);

  const { minPts, maxPts } = useMemo(() => {
    if (clubsStats.length === 0) return { minPts: 0, maxPts: 1 };
    const pts = clubsStats.map((c) => c.points);
    return { minPts: Math.min(...pts), maxPts: Math.max(...pts) };
  }, [clubsStats]);

  const getXPercent = (gf: number): number => {
    const range = maxX - minX || 1;
    const clamped = Math.max(minX, Math.min(maxX, gf));
    return ((clamped - minX) / range) * 100;
  };

  const getYPercent = (ga: number): number => {
    const range = maxY - minY || 1;
    const clamped = Math.max(minY, Math.min(maxY, ga));
    return ((clamped - minY) / range) * 100;
  };

  const getLogoSize = (pts: number): number => {
    const range = maxPts - minPts;
    if (range <= 0) return 52;
    const ratio = (pts - minPts) / range;
    return Math.round(42 + ratio * 26);
  };

  const xTicks = useMemo(() => {
    const count = 5;
    const step = Math.max(1, Math.round((maxX - minX) / count));
    const ticks: number[] = [];
    for (let val = minX; val <= maxX; val += step) ticks.push(val);
    return ticks;
  }, [minX, maxX]);

  const yTicks = useMemo(() => {
    const count = 5;
    const step = Math.max(1, Math.round((maxY - minY) / count));
    const ticks: number[] = [];
    for (let val = minY; val <= maxY; val += step) ticks.push(val);
    return ticks;
  }, [minY, maxY]);

  const getLabelPlacement = (club: ClubCalculatedStats, index: number): 'top' | 'bottom' => {
    const hasCollision = clubsStats.some((other, oIdx) => {
      if (oIdx === index) return false;
      const xDiff = Math.abs(getXPercent(club.goalsFor) - getXPercent(other.goalsFor));
      const yDiff = Math.abs(getYPercent(club.goalsAgainst) - getYPercent(other.goalsAgainst));
      return xDiff < 8 && yDiff < 9;
    });
    if (!hasCollision) return 'top';
    return index % 2 === 0 ? 'top' : 'bottom';
  };

  return (
    <div
      className={`rounded-3xl border shadow-xl p-4 sm:p-6 space-y-5 overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#0B0F19] text-white border-slate-800' : 'bg-white text-slate-900 border-slate-200/90'
      }`}
    >
      {/* ── EN-TÊTE DU MODULE ── */}
      <div
        className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 ${
          isDark ? 'border-slate-800/80' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[#FF3737]/10 border border-[#FF3737]/20 flex items-center justify-center text-[#FF3737] shadow-inner shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                className={`text-lg sm:text-xl font-black uppercase italic tracking-tight leading-none ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Attaque vs Défense
              </h2>
              <Badge className="bg-[#FF3737] text-white border-none text-[10px] font-black uppercase px-2.5 py-0.5 shadow-sm">
                {selectedLeagueName}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  isDark ? 'text-slate-400 border-slate-700' : 'text-slate-700 border-slate-300 bg-slate-50'
                }`}
              >
                {selectedCategory}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  isDark ? 'text-slate-400 border-slate-700' : 'text-slate-700 border-slate-300 bg-slate-50'
                }`}
              >
                {selectedSeason}
              </Badge>
            </div>
            <p className={`text-[11px] font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Nuage offensif/défensif synchronisé en direct avec le classement de la journée sélectionnée
            </p>
          </div>
        </div>

        {/* Moyennes + Mode Sombre */}
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className={`flex items-center gap-3 px-4 py-2 rounded-2xl border shrink-0 ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="text-center px-1.5">
              <span className={`text-[9px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Moy. Attaque
              </span>
              <span className="text-sm font-black text-emerald-600">
                {avgGF} <span className="text-[10px] font-normal text-slate-400">bp/clb</span>
              </span>
            </div>
            <div className={`w-px h-7 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <div className="text-center px-1.5">
              <span className={`text-[9px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Moy. Défense
              </span>
              <span className="text-sm font-black text-amber-600">
                {avgGA} <span className="text-[10px] font-normal text-slate-400">bc/clb</span>
              </span>
            </div>
            <div className={`w-px h-7 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <div className="text-center px-1.5">
              <span className={`text-[9px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Clubs
              </span>
              <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {clubsStats.length}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`h-10 px-3.5 rounded-xl border flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
            title="Basculer entre Mode Clair et Mode Sombre"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            <span>{isDark ? 'Mode Clair' : 'Mode Sombre'}</span>
          </button>
        </div>
      </div>

      {/* ── LECTEUR CHRONOLOGIQUE PARTAGÉ (J1 -> Jmax) ── */}
      <MatchdayTimelineControl
        activeJournee={activeJournee}
        maxJournee={maxJournee}
        latestPlayedJournee={latestPlayedJournee}
        finishedDays={computedFinishedDays}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onSelectJournee={(day) => {
          setPlaying(false);
          updateJournee(day);
        }}
        onJumpToday={() => {
          setPlaying(false);
          updateJournee(latestPlayedJournee || 1);
        }}
        isDark={isDark}
      />

      {/* ── GRILLE LIÉE : SCATTER PLOT (8 COLS) + CLASSEMENT ÉVOLUTIF EN DIRECT (4 COLS) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* COLONNE GAUCHE : NUAGE DE POINTS ATTAQUE VS DÉFENSE */}
        <div
          className={`xl:col-span-8 min-w-0 relative w-full h-[500px] sm:h-[580px] rounded-2xl border p-6 select-none overflow-hidden transition-colors duration-300 ${
            isDark
              ? 'bg-[#0F1420] border-slate-800/90'
              : 'bg-gradient-to-b from-slate-50/70 to-white border-slate-200 shadow-inner'
          }`}
        >
          {clubsStats.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/95 dark:bg-slate-900/95 z-30 p-6 text-center backdrop-blur-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-1">
                <Trophy className="w-6 h-6" />
              </div>
              <span className="px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider">
                Pas encore disponible à J{activeJournee}
              </span>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-xs max-w-sm">
                Aucun match terminé enregistré jusqu&apos;à la Journée {activeJournee} pour{' '}
                <span className="font-bold text-slate-800 dark:text-white">{selectedCategory}</span>.
              </p>
            </div>
          )}

          {/* Quadrants */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className={`absolute top-0 bottom-0 border-r border-dashed z-0 ${
                isDark ? 'border-slate-600/70' : 'border-slate-300'
              }`}
              style={{ left: `${getXPercent(avgGF)}%` }}
            />
            <div
              className={`absolute left-0 right-0 border-b border-dashed z-0 ${
                isDark ? 'border-slate-600/70' : 'border-slate-300'
              }`}
              style={{ top: `${getYPercent(avgGA)}%` }}
            />

            <div className="absolute top-4 right-5 text-right z-10">
              <span
                className={`text-xs sm:text-sm font-black tracking-wide uppercase inline-flex items-center gap-1.5 px-3 py-1 rounded-xl shadow-xs ${
                  isDark
                    ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/50'
                    : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Attaque forte · défense solide
              </span>
              <span className={`text-[9px] font-medium block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                + de buts marqués · - de buts encaissés
              </span>
            </div>

            <div className="absolute bottom-10 left-14 text-left z-10">
              <span
                className={`text-xs sm:text-sm font-black tracking-wide uppercase inline-flex items-center gap-1.5 px-3 py-1 rounded-xl shadow-xs ${
                  isDark
                    ? 'text-rose-400 bg-rose-950/60 border border-rose-800/50'
                    : 'text-rose-700 bg-rose-50 border border-rose-200'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                Attaque faible · défense fragile
              </span>
              <span className={`text-[9px] font-medium block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                - de buts marqués · + de buts encaissés
              </span>
            </div>
          </div>

          {/* Grille */}
          <div className={`absolute inset-0 pointer-events-none ${isDark ? 'opacity-20' : 'opacity-40'}`}>
            {xTicks.map((t) => (
              <div
                key={`grid-x-${t}`}
                className={`absolute top-0 bottom-8 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                style={{ left: `${getXPercent(t)}%` }}
              />
            ))}
            {yTicks.map((t) => (
              <div
                key={`grid-y-${t}`}
                className={`absolute left-12 right-0 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                style={{ top: `${getYPercent(t)}%` }}
              />
            ))}
          </div>

          {/* Graduations Y */}
          <div className="absolute top-6 bottom-12 left-1 w-10 flex flex-col justify-between pointer-events-none text-right pr-2">
            {yTicks.map((tick) => (
              <span
                key={`y-tick-${tick}`}
                className={`text-[10px] font-bold tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              >
                {tick}
              </span>
            ))}
          </div>

          <div
            className={`absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 origin-left text-[9px] font-black uppercase tracking-wider pointer-events-none whitespace-nowrap pl-4 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            ← Buts encaissés (plus haut = meilleure défense)
          </div>

          {/* Graduations X */}
          <div className="absolute bottom-1 left-12 right-4 h-6 flex justify-between pointer-events-none">
            {xTicks.map((tick) => (
              <span
                key={`x-tick-${tick}`}
                className={`text-[10px] font-bold tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              >
                {tick}
              </span>
            ))}
          </div>

          <div
            className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-wider pointer-events-none flex items-center gap-1 ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            <span>Buts marqués (attaque)</span>
            <span>→</span>
          </div>

          {/* Logos animés */}
          <div className="absolute top-6 bottom-12 left-12 right-6">
            {clubsStats.map((club, index) => {
              const xPercent = getXPercent(club.goalsFor);
              const yPercent = getYPercent(club.goalsAgainst);
              const size = getLogoSize(club.points);
              const isHovered = activeHoverClub?.clubId === club.clubId;
              const placement = getLabelPlacement(club, index);

              const haloColor = isDark
                ? club.tier === 'top'
                  ? 'rgba(245, 158, 11, 0.4)'
                  : club.tier === 'low'
                  ? 'rgba(239, 68, 68, 0.35)'
                  : 'rgba(59, 130, 246, 0.35)'
                : club.tier === 'top'
                ? 'rgba(245, 158, 11, 0.25)'
                : club.tier === 'low'
                ? 'rgba(239, 68, 68, 0.2)'
                : 'rgba(59, 130, 246, 0.2)';

              return (
                <motion.div
                  key={club.clubId}
                  layout
                  initial={false}
                  animate={{
                    left: `${xPercent}%`,
                    top: `${yPercent}%`,
                    scale: isHovered ? 1.25 : 1,
                    zIndex: isHovered ? 50 : club.isFus ? 30 : 20,
                  }}
                  transition={{
                    type: 'spring',
                    damping: 24,
                    stiffness: 130,
                    mass: 0.9,
                  }}
                  onMouseEnter={() => setActiveHoverClub(club)}
                  onMouseLeave={() => setActiveHoverClub(null)}
                  onClick={() => {
                    setActiveHoverClub(club);
                    const baseClub = normalizedClubs.find((c) => c.id === club.clubId) || {
                      id: club.clubId,
                      nom: club.nom,
                      logoUrl: club.logoUrl,
                    };
                    onClubPress?.({ ...baseClub, stats: club });
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer flex flex-col items-center group"
                  style={{ width: size, height: size }}
                >
                  <div
                    className="absolute inset-0 rounded-full transition-all group-hover:scale-130"
                    style={{ backgroundColor: haloColor, filter: 'blur(4px)' }}
                  />
                  <div
                    className={`w-full h-full rounded-full border-2 overflow-hidden flex items-center justify-center p-1.5 shadow-md transition-all ${
                      isDark ? 'bg-slate-900' : 'bg-white'
                    } ${
                      club.isFus
                        ? 'border-[#FF3737] ring-2 ring-red-500/40 shadow-red-500/20'
                        : club.tier === 'top'
                        ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-amber-500/20'
                        : club.tier === 'low'
                        ? 'border-rose-500 ring-2 ring-rose-400/30 shadow-rose-500/15'
                        : 'border-blue-400 ring-2 ring-blue-400/30 shadow-blue-500/15'
                    }`}
                  >
                    {club.logoUrl ? (
                      <img
                        src={club.logoUrl}
                        alt={club.nom}
                        className="w-full h-full object-contain rounded-full"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className={`font-black text-xs tracking-tighter ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {club.shortName.slice(0, 3)}
                      </span>
                    )}
                  </div>

                  <div
                    className={`absolute whitespace-nowrap text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs pointer-events-none transition-all ${
                      placement === 'top' ? '-top-5' : '-bottom-5'
                    } ${
                      isHovered
                        ? 'scale-110 text-white bg-[#FF3737] shadow-md z-30'
                        : isDark
                        ? 'text-slate-200 bg-slate-950/85 border border-slate-800'
                        : 'text-slate-800 bg-white/95 border border-slate-200'
                    }`}
                  >
                    {club.shortName}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Tooltip détaillé */}
          <AnimatePresence>
            {activeHoverClub && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 5 }}
                className={`absolute bottom-14 right-5 z-50 p-4 rounded-2xl shadow-2xl backdrop-blur-md w-72 pointer-events-auto border ${
                  isDark ? 'bg-slate-900/95 border-slate-700/80 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
                }`}
              >
                <div
                  className={`flex items-center justify-between border-b pb-2 mb-3 ${
                    isDark ? 'border-slate-800' : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full border flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-xs ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {activeHoverClub.logoUrl ? (
                        <img src={activeHoverClub.logoUrl} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <span className={`text-[10px] font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {activeHoverClub.shortName}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className={`text-xs font-black uppercase leading-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {activeHoverClub.nom}
                      </h4>
                      <span className="text-[10px] font-bold text-amber-500">
                        {activeHoverClub.rank}
                        {activeHoverClub.rank === 1 ? 'er' : 'ème'} au classement
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-[#FF3737] text-white text-[9px] font-black shadow-xs shrink-0">
                    {activeHoverClub.points} Pts
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-800/60' : 'bg-slate-50 border border-slate-100'}`}>
                    <span className={`font-medium block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Matchs</span>
                    <span className={`text-xs font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {activeHoverClub.played}
                    </span>
                  </div>
                  <div className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-800/60' : 'bg-slate-50 border border-slate-100'}`}>
                    <span className={`font-medium block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>V / N / D</span>
                    <span className={`text-xs font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {activeHoverClub.won}/{activeHoverClub.drawn}/{activeHoverClub.lost}
                    </span>
                  </div>
                  <div className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-800/60' : 'bg-slate-50 border border-slate-100'}`}>
                    <span className={`font-medium block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Différence</span>
                    <span
                      className={`text-xs font-black tabular-nums ${
                        activeHoverClub.goalDiff > 0
                          ? 'text-emerald-600'
                          : activeHoverClub.goalDiff < 0
                          ? 'text-rose-600'
                          : isDark
                          ? 'text-slate-300'
                          : 'text-slate-700'
                      }`}
                    >
                      {activeHoverClub.goalDiff > 0 ? `+${activeHoverClub.goalDiff}` : activeHoverClub.goalDiff}
                    </span>
                  </div>
                </div>

                <div
                  className={`mt-2.5 pt-2 border-t flex items-center justify-between text-xs font-bold px-1 ${
                    isDark ? 'border-slate-800' : 'border-slate-100'
                  }`}
                >
                  <span className="text-emerald-600">
                    Buts : <strong className={isDark ? 'text-white font-black' : 'text-slate-900 font-black'}>{activeHoverClub.goalsFor}</strong>
                  </span>
                  <span className="text-amber-600">
                    Encaissés : <strong className={isDark ? 'text-white font-black' : 'text-slate-900 font-black'}>{activeHoverClub.goalsAgainst}</strong>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* COLONNE DROITE : CLASSEMENT ÉVOLUTIF LIÉ À LA JOURNÉE ACTIVE */}
        <div
          className={`xl:col-span-4 min-w-0 rounded-2xl border flex flex-col overflow-hidden h-[500px] sm:h-[580px] ${
            isDark ? 'bg-[#0F1420] border-slate-800/90' : 'bg-slate-50/70 border-slate-200'
          }`}
        >
          <div
            className={`px-4 py-3 border-b flex items-center justify-between gap-2 shrink-0 ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Trophy className="w-4 h-4 text-[#FF3737] shrink-0" />
              <span className={`text-xs font-black uppercase tracking-wider truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Classement en direct
              </span>
            </div>
            <Badge
              variant="outline"
              className={`text-[9px] font-black uppercase shrink-0 ${
                isChampionshipCompleted
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : isDark
                  ? 'border-amber-700/60 bg-amber-950/50 text-amber-300'
                  : 'border-amber-300 bg-amber-50 text-amber-800'
              }`}
            >
              {isChampionshipCompleted ? 'Phase Finale' : 'Provisoire'}
            </Badge>
          </div>

          <div
            className={`grid grid-cols-12 gap-1 px-3 py-2 text-[9px] font-black uppercase tracking-wider border-b shrink-0 ${
              isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-100/80 border-slate-200 text-slate-500'
            }`}
          >
            <div className="col-span-2 text-center">Pos</div>
            <div className="col-span-2 text-center">Évol</div>
            <div className="col-span-4">Club</div>
            <div className="col-span-1 text-center">MJ</div>
            <div className="col-span-1 text-center">Dif</div>
            <div className="col-span-2 text-center">Pts</div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-800/70">
            {allRankedStats.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs text-slate-400">
                Aucun résultat disponible à cette journée.
              </div>
            ) : (
              allRankedStats.map((club) => {
                const hasPlayed = club.played > 0;
                const isHovered = activeHoverClub?.clubId === club.clubId;
                const delta = club.positionDelta;

                return (
                  <motion.div
                    key={club.clubId}
                    layout
                    transition={{ type: 'spring', damping: 24, stiffness: 200 }}
                    onMouseEnter={() => {
                      if (hasPlayed) setActiveHoverClub(club);
                    }}
                    onMouseLeave={() => setActiveHoverClub(null)}
                    className={`relative grid grid-cols-12 gap-1 items-center px-3 py-2.5 text-xs transition-colors cursor-pointer ${
                      isHovered
                        ? isDark
                          ? 'bg-red-950/40'
                          : 'bg-red-100/70'
                        : club.isFus
                        ? isDark
                          ? 'bg-red-950/20 border-l-2 border-l-[#FF3737]'
                          : 'bg-red-50/70 border-l-2 border-l-[#FF3737]'
                        : isDark
                        ? 'hover:bg-slate-800/40'
                        : 'hover:bg-white'
                    }`}
                  >
                    {hasPlayed && delta !== null && delta !== undefined && delta !== 0 && (
                      <motion.div
                        key={`live-flash-${club.clubId}-${activeJournee}-${delta}`}
                        initial={{ opacity: 0.45 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.65 }}
                        className={`absolute inset-0 pointer-events-none ${
                          delta > 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                        }`}
                      />
                    )}
                    <div className="col-span-2 flex justify-center">
                      <span
                        className={`w-6 h-6 rounded-md text-[11px] font-black flex items-center justify-center ${
                          !hasPlayed
                            ? isDark
                              ? 'bg-slate-800 text-slate-500'
                              : 'bg-slate-200 text-slate-500'
                            : club.isFus
                            ? 'bg-[#FF3737] text-white'
                            : club.tier === 'top'
                            ? 'bg-emerald-100 text-emerald-800'
                            : club.tier === 'low'
                            ? 'bg-rose-100 text-rose-800'
                            : isDark
                            ? 'bg-slate-800 text-slate-200'
                            : 'bg-slate-200/80 text-slate-700'
                        }`}
                      >
                        {hasPlayed ? club.rank : '-'}
                      </span>
                    </div>

                    <div className="col-span-2 text-center text-[10px] font-black tabular-nums">
                      {!hasPlayed || delta === null || delta === undefined ? (
                        <span className="text-slate-400">-</span>
                      ) : delta > 0 ? (
                        <motion.span
                          key={`ld-${club.clubId}-${activeJournee}`}
                          initial={{ scale: 1.3 }}
                          animate={{ scale: 1 }}
                          className="inline-block text-emerald-600"
                        >
                          ▲+{delta}
                        </motion.span>
                      ) : delta < 0 ? (
                        <motion.span
                          key={`ld-${club.clubId}-${activeJournee}`}
                          initial={{ scale: 1.3 }}
                          animate={{ scale: 1 }}
                          className="inline-block text-rose-500"
                        >
                          ▼{delta}
                        </motion.span>
                      ) : (
                        <span className="text-slate-400">=</span>
                      )}
                    </div>

                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-full border p-0.5 flex items-center justify-center shrink-0 overflow-hidden ${
                          isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                      >
                        {club.logoUrl ? (
                          <img src={club.logoUrl} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[8px] font-black">{club.shortName.slice(0, 3)}</span>
                        )}
                      </div>
                      <span
                        className={`font-extrabold truncate text-[11px] uppercase ${
                          club.isFus ? 'text-[#FF3737]' : isDark ? 'text-slate-100' : 'text-slate-900'
                        }`}
                        title={club.nom}
                      >
                        {club.shortName}
                      </span>
                    </div>

                    <div className={`col-span-1 text-center font-bold tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {hasPlayed ? club.played : '-'}
                    </div>

                    <div
                      className={`col-span-1 text-center font-bold tabular-nums ${
                        !hasPlayed
                          ? 'text-slate-400'
                          : club.goalDiff > 0
                          ? 'text-emerald-600'
                          : club.goalDiff < 0
                          ? 'text-rose-500'
                          : isDark
                          ? 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >
                      {!hasPlayed ? '-' : club.goalDiff > 0 ? `+${club.goalDiff}` : club.goalDiff}
                    </div>

                    <div
                      className={`col-span-2 text-center font-black tabular-nums ${
                        !hasPlayed
                          ? 'text-slate-400'
                          : club.isFus
                          ? 'text-[#FF3737]'
                          : isDark
                          ? 'text-white'
                          : 'text-slate-900'
                      }`}
                    >
                      {hasPlayed ? club.points : '-'}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttackDefenseScatterModule;
