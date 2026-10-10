import React, { useState, useMemo } from 'react';
import { useMatches } from '../../../hooks/useMatches';
import { useCompetitions } from '../../../hooks/useCompetitions';
import { useClubData } from '../../../hooks/useClubData';
import { usePlayers } from '../../../hooks/usePlayers';
import type { Player, Match } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent } from '../../../components/ui/card';
import {
  X, Calendar, Trophy, Target, Shield, Users, Activity,
  Clock, ChevronRight, Eye, UserCheck, ArrowUpRight,
  Filter, Search, ArrowRightLeft, Sparkles
} from 'lucide-react';
import MatchOverviewPanel from '../../match-management/MatchOverviewPanel';
import { supabase } from '../../../lib/supabase';

interface PlayerMatchCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlayer: Player;
}

export const PlayerMatchCalendarModal: React.FC<PlayerMatchCalendarModalProps> = ({
  isOpen,
  onClose,
  initialPlayer,
}) => {
  const { players } = usePlayers();
  const { matches, isLoading: matchesLoading } = useMatches();
  const { leagues = [] } = useCompetitions();
  const { opponentClubs = [], mainClub } = useClubData();

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(initialPlayer.id);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [filterCompetition, setFilterCompetition] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'starter' | 'sub'>('all');
  const [matchEvents, setMatchEvents] = useState<Record<string, any[]>>({});

  // Current selected player object
  const currentPlayer = useMemo(() => {
    return players.find(p => p.id === selectedPlayerId) || initialPlayer;
  }, [players, selectedPlayerId, initialPlayer]);

  // Fetch all match events from database for current player
  React.useEffect(() => {
    async function fetchPlayerEvents() {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('player_id', selectedPlayerId);

      if (!error && data) {
        // Group by match_id
        const grouped: Record<string, any[]> = {};
        data.forEach(e => {
          if (!grouped[e.match_id]) grouped[e.match_id] = [];
          grouped[e.match_id].push(e);
        });
        setMatchEvents(grouped);
      }
    }

    if (selectedPlayerId) {
      fetchPlayerEvents();
    }
  }, [selectedPlayerId]);

  // Filter matches involving this player
  const playerMatches = useMemo(() => {
    return matches.filter(m => {
      const startingXI: string[] = m.lineup?.startingXI || [];
      const substitutes: string[] = m.lineup?.substitutes || [];
      const hasEvents = matchEvents[m.id]?.length > 0;
      const isConvoque = startingXI.includes(selectedPlayerId) || substitutes.includes(selectedPlayerId) || hasEvents;

      if (!isConvoque) return false;

      if (filterCompetition !== 'all' && m.league_id !== filterCompetition) return false;

      if (filterType === 'starter' && !startingXI.includes(selectedPlayerId)) return false;
      if (filterType === 'sub' && !substitutes.includes(selectedPlayerId)) return false;

      return true;
    }).sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());
  }, [matches, selectedPlayerId, matchEvents, filterCompetition, filterType]);

  // Total accumulated player season statistics
  const accumulatedStats = useMemo(() => {
    let goals = 0;
    let assists = 0;
    let yellows = 0;
    let reds = 0;
    let subs = 0;
    let minutesPlayed = 0;

    Object.values(matchEvents).forEach(eventsArr => {
      eventsArr.forEach(e => {
        if (e.type === 'goal' || e.type === 'own_goal') goals++;
        if (e.type === 'assist') assists++;
        if (e.type === 'yellow_card') yellows++;
        if (e.type === 'red_card') reds++;
        if (e.type === 'substitution') subs++;
      });
    });

    playerMatches.forEach(m => {
      const startingXI: string[] = m.lineup?.startingXI || [];
      const substitutes: string[] = m.lineup?.substitutes || [];

      if (startingXI.includes(selectedPlayerId)) {
        minutesPlayed += 90; // Default estimate
      } else if (substitutes.includes(selectedPlayerId)) {
        minutesPlayed += 30; // Default estimate
      }
    });

    return {
      goals,
      assists,
      yellows,
      reds,
      subs,
      minutesPlayed,
      totalMatches: playerMatches.length,
    };
  }, [matchEvents, playerMatches, selectedPlayerId]);

  if (!isOpen) return null;

  const mainClubLogo = mainClub?.logo_url && mainClub.logo_url !== 'null'
    ? mainClub.logo_url
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(mainClub?.name || 'Club')}&background=10b981&color=fff&size=128`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden my-auto max-h-[92vh] flex flex-col font-sans"
        >
          {/* ── BROADCAST TOP TOOLBAR ── */}
          <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center p-1 shadow-lg shrink-0">
                <img
                  src={(currentPlayer.photo_url && currentPlayer.photo_url !== 'null') ? currentPlayer.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(currentPlayer.full_name)}&background=020617&color=fff&size=128`}
                  alt=""
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black uppercase tracking-tight italic text-white leading-none">
                    {currentPlayer.full_name}
                  </h2>
                  <Badge className="bg-emerald-600 text-white font-black text-xs px-2.5 py-0.5 rounded-lg border-none">
                    #{currentPlayer.jersey_number || '-'}
                  </Badge>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Calendrier & Statistiques Matchs Individuelles • {currentPlayer.position} ({currentPlayer.category})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Player Selector Dropdown */}
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                <Users className="w-4 h-4 text-emerald-400" />
                <select
                  value={selectedPlayerId}
                  onChange={e => setSelectedPlayerId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer max-w-[160px]"
                >
                  {players.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      #{p.jersey_number || '-'} {p.full_name} ({p.position})
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* ── ACCUMULATED SEASON STATS CARDS BAR ── */}
          <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg shrink-0">
                ⚽
              </div>
              <div>
                <span className="text-xl font-black text-slate-900 tabular-nums">{accumulatedStats.goals}</span>
                <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Buts Marqués</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-lg shrink-0">
                🅰️
              </div>
              <div>
                <span className="text-xl font-black text-slate-900 tabular-nums">{accumulatedStats.assists}</span>
                <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Passes Décisives</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-lg shrink-0">
                🟨
              </div>
              <div>
                <span className="text-xl font-black text-slate-900 tabular-nums">{accumulatedStats.yellows}</span>
                <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Cartons Jaunes</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-black text-lg shrink-0">
                🟥
              </div>
              <div>
                <span className="text-xl font-black text-slate-900 tabular-nums">{accumulatedStats.reds}</span>
                <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Cartons Rouges</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-lg shrink-0">
                🔄
              </div>
              <div>
                <span className="text-xl font-black text-slate-900 tabular-nums">{accumulatedStats.subs}</span>
                <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Changements</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-black text-lg shrink-0">
                ⏱️
              </div>
              <div>
                <span className="text-xl font-black text-slate-900 tabular-nums">{accumulatedStats.totalMatches}</span>
                <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Matchs Disputés</p>
              </div>
            </div>
          </div>

          {/* ── FILTER TOOLBAR ── */}
          <div className="p-4 px-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-black uppercase text-slate-700">Filtres :</span>

              <select
                value={filterCompetition}
                onChange={e => setFilterCompetition(e.target.value)}
                className="h-8 px-3 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 border-none outline-none"
              >
                <option value="all">Toutes les Compétitions</option>
                {leagues.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === 'all' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Tous
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('starter')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === 'starter' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Titulaire
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('sub')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === 'sub' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Remplaçant
                </button>
              </div>
            </div>

            <span className="text-[11px] font-bold text-slate-400 uppercase">
              {playerMatches.length} Matchs Trouvés
            </span>
          </div>

          {/* ── PLAYER MATCH TIMELINE FEED ── */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
            {selectedMatch ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMatch(null)}
                    className="gap-2 font-bold text-xs"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" /> Retour au Calendrier Joueur
                  </Button>
                  <Badge className="bg-slate-900 text-white uppercase text-[10px] font-black px-3 py-1">
                    Match Overview Broadcast
                  </Badge>
                </div>
                <MatchOverviewPanel
                  match={selectedMatch}
                  onBack={() => setSelectedMatch(null)}
                />
              </div>
            ) : playerMatches.length === 0 ? (
              <div className="py-20 text-center text-slate-400 space-y-3">
                <Activity className="w-12 h-12 mx-auto text-slate-300 animate-pulse" />
                <h4 className="text-sm font-black uppercase text-slate-700">Aucun match enregistré</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Ce joueur n'a pas encore participé à de match dans les compétitions enregistrées.
                </p>
              </div>
            ) : (
              playerMatches.map(m => {
                const startingXI: string[] = m.lineup?.startingXI || [];
                const substitutes: string[] = m.lineup?.substitutes || [];
                const isStarter = startingXI.includes(selectedPlayerId);
                const isSub = substitutes.includes(selectedPlayerId);

                const opp = (opponentClubs || []).find(c => c.id === m.opponent_id);
                const oppName = opp?.name || 'Adversaire';
                const oppLogo = opp?.logo_url && opp.logo_url !== 'null'
                  ? opp.logo_url
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(oppName)}&background=3b82f6&color=fff&size=128`;

                const leg = (leagues || []).find(l => l.id === m.league_id);
                const legName = leg?.name || 'Ligue';

                const pEvents = matchEvents[m.id] || [];
                const pGoals = pEvents.filter(e => e.type === 'goal' || e.type === 'own_goal');
                const pAssists = pEvents.filter(e => e.type === 'assist');
                const pYellows = pEvents.filter(e => e.type === 'yellow_card');
                const pReds = pEvents.filter(e => e.type === 'red_card');
                const pSubs = pEvents.filter(e => e.type === 'substitution');

                return (
                  <div
                    key={m.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200 shadow-md hover:shadow-xl transition-all space-y-4 group"
                  >
                    {/* Header bar of the match card */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 text-xs">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-amber-100 text-amber-800 font-bold border-none text-[10px] px-3 py-1 flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5" /> {legName} ({m.category})
                        </Badge>
                        <span className="font-bold text-slate-500 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {m.match_date} - {m.match_time?.substring(0, 5) || '18:00'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isStarter && (
                          <Badge className="bg-emerald-100 text-emerald-800 font-black text-[10px] uppercase border-emerald-200">
                            ⚡ Titulaire (11 Initial)
                          </Badge>
                        )}
                        {isSub && (
                          <Badge className="bg-blue-100 text-blue-800 font-black text-[10px] uppercase border-blue-200">
                            🔄 Remplaçant
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMatch(m)}
                          className="h-7 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider gap-1 shadow-sm"
                        >
                          <Eye className="w-3 h-3" /> Voir Match
                        </Button>
                      </div>
                    </div>

                    {/* Match Score & Teams */}
                    <div className="flex items-center justify-between gap-4 px-2">
                      {/* Mon Club */}
                      <div className="flex items-center gap-3 flex-1">
                        <img src={mainClubLogo} className="w-10 h-10 object-contain drop-shadow" alt="" />
                        <div>
                          <span className="text-sm font-black text-slate-900 uppercase block">{mainClub?.name || 'FUS'}</span>
                          <span className="text-[10px] font-bold text-emerald-600 uppercase">{m.is_home ? 'Domicile' : 'Extérieur'}</span>
                        </div>
                      </div>

                      {/* Score Box */}
                      <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-2 rounded-2xl shadow-inner font-black text-xl tabular-nums">
                        <span>{m.home_score ?? 0}</span>
                        <span className="text-slate-500 text-xs">-</span>
                        <span>{m.away_score ?? 0}</span>
                      </div>

                      {/* Adversaire */}
                      <div className="flex items-center justify-end gap-3 flex-1 text-right">
                        <div>
                          <span className="text-sm font-black text-slate-900 uppercase block">{oppName}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{!m.is_home ? 'Domicile' : 'Extérieur'}</span>
                        </div>
                        <img src={oppLogo} className="w-10 h-10 object-contain drop-shadow" alt="" />
                      </div>
                    </div>

                    {/* Player Individual Actions Breakdown with Minute Chips */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                        Actions Clés de {currentPlayer.full_name} durant ce match :
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        {pGoals.length > 0 && (
                          <div className="bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border border-emerald-200 shadow-sm">
                            <span>⚽ Buts ({pGoals.length}) :</span>
                            <span className="text-emerald-700 font-bold">{pGoals.map(g => `${g.minute}'`).join(', ')}</span>
                          </div>
                        )}

                        {pAssists.length > 0 && (
                          <div className="bg-blue-100 text-blue-900 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border border-blue-200 shadow-sm">
                            <span>🅰️ Passes Décisives ({pAssists.length}) :</span>
                            <span className="text-blue-700 font-bold">{pAssists.map(a => `${a.minute}'`).join(', ')}</span>
                          </div>
                        )}

                        {pYellows.length > 0 && (
                          <div className="bg-amber-100 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border border-amber-200 shadow-sm">
                            <span>🟨 Carton Jaune :</span>
                            <span className="text-amber-800 font-bold">{pYellows.map(y => `${y.minute}'`).join(', ')}</span>
                          </div>
                        )}

                        {pReds.length > 0 && (
                          <div className="bg-rose-100 text-rose-900 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border border-rose-200 shadow-sm">
                            <span>🟥 Carton Rouge :</span>
                            <span className="text-rose-800 font-bold">{pReds.map(r => `${r.minute}'`).join(', ')}</span>
                          </div>
                        )}

                        {pSubs.length > 0 && (
                          <div className="bg-purple-100 text-purple-900 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border border-purple-200 shadow-sm">
                            <span>🔄 Changement :</span>
                            <span className="text-purple-800 font-bold">{pSubs.map(s => `${s.minute}'`).join(', ')}</span>
                          </div>
                        )}

                        {pGoals.length === 0 && pAssists.length === 0 && pYellows.length === 0 && pReds.length === 0 && pSubs.length === 0 && (
                          <span className="text-[11px] text-slate-500 font-medium italic">
                            Aucun événement disciplinaire ou décisif individuel enregistré pour cette rencontre.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
