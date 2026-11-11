import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Trophy, Activity } from 'lucide-react';
import { useMatches } from '../../../hooks/useMatches';
import { useOpponentMatches } from '../../../hooks/useOpponentMatches';
import { useClubData } from '../../../hooks/useClubData';
import { useCompetitions } from '../../../hooks/useCompetitions';
import { PLAYER_CATEGORIES } from '../../../constants';
import { frmfDataService, type FRMFDataset } from '../../../services/frmfDataService';
import {
  buildChampionshipTimelineSnapshot,
  collectFrmfGroupMatches,
  pickDefaultFrmfGroupForCategory,
} from '../../../utils/championshipTimelineHelper';
import { AttackDefenseScatterModule } from '../../match-management/components/AttackDefenseScatterModule';
import { MatchdayTimelineControl } from '../../match-management/components/MatchdayTimelineControl';
import type { TieBreakerRuleApplied } from '../../../utils/standingsRankingEngine';
import type { Club } from '../../../types';

function getTieRuleBadgeLabel(rule?: TieBreakerRuleApplied | null): string | null {
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

export const DashboardLeagueStandingsWidget: React.FC = () => {
  const { matches: fusMatches } = useMatches();
  const { leagues } = useCompetitions();
  const { mainClub, opponentClubs } = useClubData();

  const [frmfDataset, setFrmfDataset] = useState<FRMFDataset>(() => frmfDataService.getDataset());

  useEffect(() => {
    let mounted = true;
    frmfDataService.loadFromDatabase().then((res) => {
      if (mounted && res?.dataset) {
        setFrmfDataset(res.dataset);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const officialLeagues = useMemo(
    () => leagues.filter((l) => !l.name?.toLowerCase().includes('amical')),
    [leagues]
  );

  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('U21');

  const availableCategories = useMemo(() => {
    const merged = new Set<string>(['SENIOR', 'U23', ...PLAYER_CATEGORIES, ...frmfDataService.getCategories()]);
    return Array.from(merged);
  }, [frmfDataset]);

  const frmfGroups = useMemo(
    () => frmfDataService.getGroups(selectedCategory),
    [selectedCategory, frmfDataset]
  );

  const [selectedGroup, setSelectedGroup] = useState<string>(() =>
    pickDefaultFrmfGroupForCategory(frmfDataset, 'U21', frmfDataService.getGroups('U21'))
  );

  // Sub-tab : 'standings' (Classement) ou 'attack_defense' (Attaque vs Défense)
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'standings' | 'attack_defense'>(
    urlTab === 'attack_defense' || urlTab === 'attack-defense' ? 'attack_defense' : 'standings'
  );

  useEffect(() => {
    if (urlTab === 'attack_defense' || urlTab === 'attack-defense') {
      setActiveTab('attack_defense');
    } else if (urlTab === 'standings') {
      setActiveTab('standings');
    }
  }, [urlTab]);

  const handleTabChange = (tab: 'standings' | 'attack_defense') => {
    setActiveTab(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true }
    );
  };

  const currentLeagueId = useMemo(() => {
    if (selectedLeagueId) return selectedLeagueId;
    return officialLeagues[0]?.id || leagues[0]?.id || '';
  }, [selectedLeagueId, officialLeagues, leagues]);

  const { opponentMatches } = useOpponentMatches(currentLeagueId || undefined);

  const allClubs = useMemo(() => {
    const list: Club[] = [];
    if (mainClub) list.push(mainClub);
    (opponentClubs || []).forEach((c) => {
      if (!list.some((existing) => existing.id === c.id)) {
        list.push(c);
      }
    });
    return list;
  }, [mainClub, opponentClubs]);

  const currentLeague = useMemo(
    () => leagues.find((l) => l.id === currentLeagueId),
    [leagues, currentLeagueId]
  );

  // Sélection automatique de la poule active quand on change de catégorie
  useEffect(() => {
    const nextGroups = frmfDataService.getGroups(selectedCategory);
    setSelectedGroup(pickDefaultFrmfGroupForCategory(frmfDataset, selectedCategory, nextGroups));
  }, [selectedCategory, frmfDataset]);

  // Matchs FRMF disponibles pour la catégorie / poule sélectionnée
  const frmfGroupMatches = useMemo(
    () => collectFrmfGroupMatches(frmfDataset, selectedCategory, selectedGroup),
    [frmfDataset, selectedCategory, selectedGroup]
  );

  // État chronologique partagé entre Classement & Attaque vs Défense
  const [selectedJournee, setSelectedJournee] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleCategoryChange = (cat: string) => {
    setIsPlaying(false);
    setSelectedJournee(null);
    setSelectedCategory(cat);
  };

  const handleGroupChange = (grp: string) => {
    setIsPlaying(false);
    setSelectedJournee(null);
    setSelectedGroup(grp);
  };

  const handleLeagueChange = (lid: string) => {
    setIsPlaying(false);
    setSelectedJournee(null);
    setSelectedLeagueId(lid);
  };

  // Calcul chronologique unifié (FRMF prioritaire si des résultats existent, sinon Supabase matches + opponent_matches)
  const timelineSnapshot = useMemo(() => {
    return buildChampionshipTimelineSnapshot({
      frmfMatches: frmfGroupMatches,
      fusMatches,
      opponentMatches,
      allClubs,
      mainClub,
      leagueId: currentLeagueId || undefined,
      category: selectedCategory,
      upToJournee: selectedJournee,
      minExpectedDays: selectedCategory === 'U21' ? 30 : 18,
    });
  }, [
    frmfGroupMatches,
    fusMatches,
    opponentMatches,
    allClubs,
    mainClub,
    currentLeagueId,
    selectedCategory,
    selectedJournee,
  ]);

  const effectiveJournee = selectedJournee ?? timelineSnapshot.latestPlayedJournee;
  const effectiveJourneeRef = useRef(effectiveJournee);
  effectiveJourneeRef.current = effectiveJournee;

  useEffect(() => {
    if (isPlaying) {
      const playCap = Math.max(timelineSnapshot.latestPlayedJournee, 1);
      playTimerRef.current = setInterval(() => {
        setSelectedJournee((prev) => {
          const cur = prev ?? timelineSnapshot.firstPlayedJournee;
          if (cur >= playCap) {
            setIsPlaying(false);
            return playCap;
          }
          return cur + 1;
        });
      }, 950);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, timelineSnapshot.latestPlayedJournee, timelineSnapshot.firstPlayedJournee]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    const playCap = Math.max(timelineSnapshot.latestPlayedJournee, 1);
    if (effectiveJourneeRef.current >= playCap) {
      setSelectedJournee(timelineSnapshot.firstPlayedJournee || 1);
    } else if (selectedJournee === null) {
      setSelectedJournee(timelineSnapshot.firstPlayedJournee || 1);
    }
    setIsPlaying(true);
  };

  const handleSelectJournee = (day: number) => {
    setIsPlaying(false);
    setSelectedJournee(day);
  };

  const handleJumpToday = () => {
    setIsPlaying(false);
    setSelectedJournee(null);
  };

  const standings = timelineSnapshot.standings;

  return (
    <div className="space-y-4">
      {/* ── BARRE DE CONTRÔLE SUPÉRIEURE DU WIDGET (DEUX ONGLETS + FILTRES) ── */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[#FF3737]/10 border border-[#FF3737]/20 flex items-center justify-center text-[#FF3737] shadow-inner shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black uppercase italic tracking-tight text-slate-900 leading-none">
                Championnat & Performances
              </h2>
              <Badge className="bg-[#FF3737] text-white border-none text-[10px] font-black uppercase px-2.5 py-0.5">
                {timelineSnapshot.source === 'frmf'
                  ? `FRMF • ${selectedGroup}`
                  : currentLeague?.name || 'Botola Pro Inwi'}
              </Badge>
              <Badge variant="outline" className="text-slate-600 border-slate-300 text-[10px] font-bold">
                {selectedCategory}
              </Badge>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              Classement évolutif par journée et analyse tactique Attaque vs Défense synchronisés
            </p>
          </div>
        </div>

        {/* ── ONGLETS & SÉLECTEURS ── */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => handleTabChange('standings')}
              className={`h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl font-black uppercase tracking-wider text-[10px] sm:text-[11px] flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'standings'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-4 h-4 text-[#FF3737]" />
              <span>Classement</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('attack_defense')}
              className={`h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl font-black uppercase tracking-wider text-[10px] sm:text-[11px] flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'attack_defense'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Attaque vs Défense</span>
            </button>
          </div>

          {timelineSnapshot.source === 'frmf' && frmfGroups.length > 1 && (
            <select
              value={selectedGroup}
              onChange={(e) => handleGroupChange(e.target.value)}
              aria-label="Sélectionner la poule"
              className="text-xs font-bold uppercase rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF3737]/30 h-10 cursor-pointer"
            >
              {frmfGroups.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>
          )}

          {timelineSnapshot.source === 'supabase' && (officialLeagues.length > 0 || leagues.length > 0) && (
            <select
              value={currentLeagueId}
              onChange={(e) => handleLeagueChange(e.target.value)}
              aria-label="Sélectionner la compétition"
              className="text-xs font-bold uppercase rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF3737]/30 h-10 cursor-pointer"
            >
              {officialLeagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.season ? `(${l.season})` : ''}
                </option>
              ))}
              {officialLeagues.length === 0 &&
                leagues.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.season ? `(${l.season})` : ''}
                  </option>
                ))}
            </select>
          )}

          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            aria-label="Sélectionner la catégorie"
            className="text-xs font-bold uppercase rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF3737]/30 h-10 cursor-pointer"
          >
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── ONGLET 1 : CLASSEMENT ÉVOLUTIF PAR JOURNÉE ── */}
      {activeTab === 'standings' && (
        <div className="space-y-3">
          <MatchdayTimelineControl
            activeJournee={effectiveJournee}
            maxJournee={timelineSnapshot.maxJournee}
            latestPlayedJournee={timelineSnapshot.latestPlayedJournee}
            finishedDays={timelineSnapshot.finishedDays}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onSelectJournee={handleSelectJournee}
            onJumpToday={handleJumpToday}
            isTodaySelected={
              selectedJournee === null || selectedJournee === timelineSnapshot.latestPlayedJournee
            }
          />

          <Card className="rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden bg-white">
            <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between gap-2 text-[11px]">
              <span className="font-bold text-slate-600">
                {timelineSnapshot.isChampionshipCompleted
                  ? 'Phase finale — Confrontations directes activées en cas d’égalité'
                  : `${timelineSnapshot.finishedMatchesCount} match(s) comptabilisés — Égalités : Diff. générale puis Meilleure attaque`}
              </span>
              <Badge
                variant="outline"
                className={`text-[9px] font-black uppercase shrink-0 ${
                  timelineSnapshot.isChampionshipCompleted
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-amber-300 bg-amber-50 text-amber-800'
                }`}
              >
                {timelineSnapshot.isChampionshipCompleted ? 'Phase Finale' : 'Provisoire'}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[740px] w-full text-left text-xs">
                <div className="grid grid-cols-[44px_56px_minmax(190px,1fr)_44px_40px_40px_40px_44px_44px_54px_58px_108px] items-center bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                  <div className="py-3 px-2 text-center">Pos</div>
                  <div className="py-3 px-1 text-center">Évol.</div>
                  <div className="py-3 px-4">Club</div>
                  <div className="py-3 px-2 text-center">MJ</div>
                  <div className="py-3 px-2 text-center">V</div>
                  <div className="py-3 px-2 text-center">N</div>
                  <div className="py-3 px-2 text-center">D</div>
                  <div className="py-3 px-2 text-center">BP</div>
                  <div className="py-3 px-2 text-center">BC</div>
                  <div className="py-3 px-2 text-center">Diff</div>
                  <div className="py-3 px-3 text-center font-black text-slate-900">Pts</div>
                  <div className="py-3 px-3 text-center">5 Derniers</div>
                </div>
                <div className="divide-y divide-slate-100 font-bold text-xs relative">
                  {standings.map((row) => {
                    const isFus = row.is_fus || (mainClub && row.club_id === mainClub.id);
                    const hasPlayed = row.played > 0;
                    const isTop3 = hasPlayed && row.position <= 3;
                    const isBottom2 = hasPlayed && standings.length > 4 && row.position > standings.length - 2;
                    const delta = row.position_delta;
                    const tieBadge = hasPlayed ? getTieRuleBadgeLabel(row.tie_breaker_rule) : null;

                    return (
                      <motion.div
                        key={row.team_key || row.club_id}
                        layout
                        transition={{ type: 'spring', damping: 24, stiffness: 200 }}
                        className={`relative grid grid-cols-[44px_56px_minmax(190px,1fr)_44px_40px_40px_40px_44px_44px_54px_58px_108px] items-center transition-colors hover:bg-slate-50/80 ${
                          isFus ? 'bg-red-50/40 font-black border-l-4 border-l-[#FF3737]' : ''
                        }`}
                      >
                        {hasPlayed && delta !== null && delta !== undefined && delta !== 0 && (
                          <motion.div
                            key={`flash-${row.team_key}-${effectiveJournee}-${delta}`}
                            initial={{ opacity: 0.45 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 0.65 }}
                            className={`absolute inset-0 pointer-events-none ${
                              delta > 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                            }`}
                          />
                        )}
                        <div className="py-3 px-2 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black ${
                              !hasPlayed
                                ? 'bg-slate-100 text-slate-400'
                                : isFus
                                ? 'bg-[#FF3737] text-white shadow-xs'
                                : isTop3
                                ? 'bg-emerald-100 text-emerald-800'
                                : isBottom2
                                ? 'bg-rose-100 text-rose-800'
                                : 'text-slate-600'
                            }`}
                          >
                            {hasPlayed ? row.position : '-'}
                          </span>
                        </div>

                        <div className="py-3 px-1 text-center text-[11px] font-black tabular-nums">
                          {!hasPlayed || delta === null || delta === undefined ? (
                            <span className="text-slate-400">-</span>
                          ) : delta > 0 ? (
                            <motion.span
                              key={`d-${row.team_key}-${effectiveJournee}`}
                              initial={{ scale: 1.3 }}
                              animate={{ scale: 1 }}
                              className="inline-block text-emerald-600"
                              title={`+${delta} place(s) vs journée précédente`}
                            >
                              ▲ +{delta}
                            </motion.span>
                          ) : delta < 0 ? (
                            <motion.span
                              key={`d-${row.team_key}-${effectiveJournee}`}
                              initial={{ scale: 1.3 }}
                              animate={{ scale: 1 }}
                              className="inline-block text-rose-500"
                              title={`${delta} place(s) vs journée précédente`}
                            >
                              ▼ {delta}
                            </motion.span>
                          ) : (
                            <span className="text-slate-400">=</span>
                          )}
                        </div>

                        <div className="py-3 px-4 min-w-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-2xs">
                              {row.club_logo ? (
                                <img src={row.club_logo} alt="" className="w-full h-full object-contain rounded-full" />
                              ) : (
                                <span className="font-black text-[10px] text-slate-600">
                                  {row.short_name.slice(0, 3)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span
                                className={`text-xs uppercase leading-tight line-clamp-1 ${
                                  isFus ? 'font-black text-[#FF3737]' : 'font-bold text-slate-900'
                                }`}
                              >
                                {row.team_name}
                              </span>
                              {(isFus || tieBadge) && (
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  {isFus && (
                                    <span className="text-[9px] text-[#FF3737] font-black uppercase tracking-wider">
                                      Mon Club
                                    </span>
                                  )}
                                  {tieBadge && (
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                        row.h2h_activated
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-slate-100 text-slate-600 border-slate-200'
                                      }`}
                                      title="Critère appliqué en cas d'égalité de points"
                                    >
                                      {tieBadge}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="py-3 px-2 text-center text-slate-700">{hasPlayed ? row.played : '-'}</div>
                        <div className="py-3 px-2 text-center text-emerald-700">{hasPlayed ? row.won : '-'}</div>
                        <div className="py-3 px-2 text-center text-slate-500">{hasPlayed ? row.drawn : '-'}</div>
                        <div className="py-3 px-2 text-center text-red-600">{hasPlayed ? row.lost : '-'}</div>
                        <div className="py-3 px-2 text-center text-slate-700">{hasPlayed ? row.goals_for : '-'}</div>
                        <div className="py-3 px-2 text-center text-slate-500">{hasPlayed ? row.goals_against : '-'}</div>
                        <div className="py-3 px-2 text-center font-black">
                          {!hasPlayed ? (
                            <span className="text-slate-400">-</span>
                          ) : (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] ${
                                row.goal_difference > 0
                                  ? 'text-emerald-700 bg-emerald-50'
                                  : row.goal_difference < 0
                                  ? 'text-red-700 bg-red-50'
                                  : 'text-slate-600 bg-slate-100'
                              }`}
                            >
                              {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                            </span>
                          )}
                        </div>

                        <div className="py-3 px-3 text-center">
                          <span
                            className={`text-sm font-black tabular-nums ${
                              !hasPlayed ? 'text-slate-400' : isFus ? 'text-[#FF3737]' : 'text-slate-900'
                            }`}
                          >
                            {hasPlayed ? row.points : '-'}
                          </span>
                        </div>

                        <div className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {row.form.length === 0 ? (
                              <span className="text-[10px] text-slate-400 italic">-</span>
                            ) : (
                              row.form.map((res, i) => (
                                <span
                                  key={i}
                                  className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center text-white ${
                                    res === 'W'
                                      ? 'bg-emerald-500'
                                      : res === 'D'
                                      ? 'bg-slate-400'
                                      : 'bg-red-500'
                                  }`}
                                >
                                  {res === 'W' ? 'G' : res === 'D' ? 'N' : 'P'}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {standings.length === 0 && (
                    <div className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                        <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider">
                          Pas encore disponible
                        </span>
                        <p className="text-slate-500 font-medium text-xs">
                          Aucun résultat officiel enregistré pour la catégorie{' '}
                          <span className="font-bold text-slate-800">{selectedCategory}</span> jusqu&apos;à la Journée{' '}
                          {effectiveJournee}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── ONGLET 2 : MODULE ATTAQUE VS DÉFENSE LIÉ AU CLASSEMENT ÉVOLUTIF ── */}
      {activeTab === 'attack_defense' && (
        <AttackDefenseScatterModule
          matches={timelineSnapshot.matches}
          clubs={timelineSnapshot.clubs}
          mainClub={mainClub}
          selectedLeagueName={
            timelineSnapshot.source === 'frmf'
              ? `FRMF • ${selectedGroup}`
              : currentLeague?.name || 'Botola Pro Inwi'
          }
          selectedCategory={selectedCategory}
          selectedSeason={
            timelineSnapshot.source === 'frmf'
              ? frmfDataset.metadata?.season || '2026/2027'
              : currentLeague?.season || '2025/2026'
          }
          selectedJournee={effectiveJournee}
          onJourneeChange={handleSelectJournee}
          isPlaying={isPlaying}
          onPlayingChange={(next) => {
            if (next) {
              const playCap = Math.max(timelineSnapshot.latestPlayedJournee, 1);
              if (effectiveJourneeRef.current >= playCap) {
                setSelectedJournee(timelineSnapshot.firstPlayedJournee || 1);
              }
            }
            setIsPlaying(next);
          }}
          maxJourneeOverride={timelineSnapshot.maxJournee}
          latestPlayedJourneeOverride={timelineSnapshot.latestPlayedJournee}
          firstPlayedJourneeOverride={timelineSnapshot.firstPlayedJournee}
          finishedDays={timelineSnapshot.finishedDays}
          linkedStandings={timelineSnapshot.standings}
          isChampionshipCompletedOverride={timelineSnapshot.isChampionshipCompleted}
        />
      )}
    </div>
  );
};

export default DashboardLeagueStandingsWidget;
