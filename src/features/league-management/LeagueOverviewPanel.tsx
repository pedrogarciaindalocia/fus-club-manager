import React, { useState } from 'react';
import { useMatches } from '../../hooks/useMatches';
import { useQuery } from '@tanstack/react-query';
import { matchService } from '../../services/matchService';
import type { League } from '../../types';
import { usePlayers } from '../../hooks/usePlayers';
import { useClubData } from '../../hooks/useClubData';
import { 
  ArrowLeft,
  Calendar,
  Activity,
  Trophy,
  Users,
  Target,
  BarChart3,
  Globe,
  AlertCircle
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

interface LeagueOverviewPanelProps {
  league: League;
  onBack: () => void;
}

const LeagueOverviewPanel: React.FC<LeagueOverviewPanelProps> = ({ league, onBack }) => {
  const { matches = [] } = useMatches(league.id);
  const { players = [] } = usePlayers();
  const { mainClub, opponentClubs = [] } = useClubData();
  
  const [activeTab, setActiveTab] = useState<'resume' | 'matchs' | 'buteurs' | 'cartons'>('resume');

  // Fetch all events for all matches in this league
  const { data: allEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['league_events', league.id],
    queryFn: async () => {
      if (!matches.length) return [];
      const eventsPromises = matches.map(m => matchService.getMatchEvents(m.id));
      const results = await Promise.all(eventsPromises);
      return results.flat();
    },
    enabled: matches.length > 0
  });

  const playerStats = players.map(player => {
    const pEvents = allEvents.filter(e => e.playerId === player.id);
    const goals = pEvents.filter(e => e.type === 'goal' || e.type === 'penalty').length;
    const yellows = pEvents.filter(e => e.type === 'yellow_card').length;
    const reds = pEvents.filter(e => e.type === 'red_card').length;
    return { ...player, goals, yellows, reds };
  });

  const buteurs = [...playerStats].filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals);
  const cartones = [...playerStats].filter(p => p.yellows > 0 || p.reds > 0).sort((a, b) => (b.yellows + b.reds * 2) - (a.yellows + a.reds * 2));

  const totalGoalsScored = playerStats.reduce((sum, p) => sum + p.goals, 0);
  const totalYellows = playerStats.reduce((sum, p) => sum + p.yellows, 0);
  const totalReds = playerStats.reduce((sum, p) => sum + p.reds, 0);

  const bilan = matches.reduce((acc, m) => {
    if (m.status !== 'finished') return acc;
    const fusScore = m.is_home ? (m.score_home || 0) : (m.score_away || 0);
    const oppScore = m.is_home ? (m.score_away || 0) : (m.score_home || 0);
    if (fusScore > oppScore) acc.wins++;
    else if (fusScore === oppScore) acc.draws++;
    else acc.losses++;
    return acc;
  }, { wins: 0, draws: 0, losses: 0 });

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 max-w-5xl mx-auto">
      {/* ── HEADER ── */}
      <div className="flex items-center gap-6 bg-white p-6 rounded-[2rem] border border-red-100 shadow-xl shadow-red-500/5">
        <Button onClick={onBack} variant="ghost" size="icon" className="w-12 h-12 rounded-2xl hover:bg-red-50 text-slate-500 hover:text-red-600 transition-all shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-16 h-16 rounded-2xl bg-red-50 border-2 border-white shadow-md flex items-center justify-center p-2 shrink-0">
          {league.logo_url && league.logo_url !== 'null' ? (
            <img src={league.logo_url} className="w-full h-full object-contain" alt="" />
          ) : (
            <Globe className="w-8 h-8 text-red-300" />
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-black uppercase tracking-tighter italic text-slate-800 leading-none">{league.name}</h2>
          <div className="flex items-center gap-3 mt-2">
            <Badge className="bg-red-50 text-red-600 hover:bg-red-100 border-none font-black uppercase text-[10px] px-3 py-1">
              Saison {league.season}
            </Badge>
            {league.category && (
              <Badge variant="outline" className="text-slate-400 border-slate-200 font-black uppercase text-[9px]">
                {league.category}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'resume', icon: Activity, label: 'Résumé' },
          { id: 'matchs', icon: Calendar, label: 'Matchs' },
          { id: 'buteurs', icon: Target, label: 'Buteurs' },
          { id: 'cartons', icon: AlertCircle, label: 'Cartons' }
        ].map(tab => (
          <Button 
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`rounded-xl px-6 h-12 font-black uppercase tracking-widest text-[10px] transition-all gap-2 shrink-0 ${activeTab === tab.id ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 scale-105' : 'text-slate-400 hover:bg-red-50 hover:text-red-600'}`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </Button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 min-h-[500px]">
        {eventsLoading ? (
          <div className="h-full flex items-center justify-center text-red-300 min-h-[400px]">
            <Activity className="w-10 h-10 animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'resume' && (
              <div className="space-y-10 max-w-4xl mx-auto">
                {/* Bilan */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Bilan</h4>
                  <div className="flex items-center justify-between bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="text-center flex-1">
                      <span className="block text-4xl font-black text-slate-800">{matches.length}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Matchs</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-3 border-l border-slate-200 pl-8">
                       <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                         <div className="flex items-center gap-2 text-slate-600"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Victoires</div>
                         <span className="text-slate-800">{bilan.wins}</span>
                       </div>
                       <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                         <div className="flex items-center gap-2 text-slate-600"><div className="w-2 h-2 rounded-full bg-slate-400" /> Nuls</div>
                         <span className="text-slate-800">{bilan.draws}</span>
                       </div>
                       <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                         <div className="flex items-center gap-2 text-slate-600"><div className="w-2 h-2 rounded-full bg-red-600" /> Défaites</div>
                         <span className="text-slate-800">{bilan.losses}</span>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Buts */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Buts</h4>
                  <div className="flex items-center justify-between bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="text-center flex-1">
                      <span className="block text-3xl font-black text-yellow-500">{totalGoalsScored}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Marqués</span>
                    </div>
                    <div className="w-px h-12 bg-slate-200" />
                    <div className="text-center flex-1">
                      <span className="block text-3xl font-black text-red-600">-</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Encaissés</span>
                    </div>
                    <div className="w-px h-12 bg-slate-200" />
                    <div className="text-center flex-1">
                      <span className="block text-3xl font-black text-slate-800">+{totalGoalsScored}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Différence</span>
                    </div>
                  </div>
                </div>

                {/* Discipline */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Discipline</h4>
                  <div className="flex items-center justify-between bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="text-center flex-1">
                      <span className="block text-3xl font-black text-yellow-400">{totalYellows}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cartons Jaunes</span>
                    </div>
                    <div className="w-px h-12 bg-slate-200" />
                    <div className="text-center flex-1">
                      <span className="block text-3xl font-black text-red-600">{totalReds}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cartons Rouges</span>
                    </div>
                    <div className="w-px h-12 bg-slate-200" />
                    <div className="text-center flex-1">
                      <span className="block text-3xl font-black text-slate-800">{matches.length ? (totalYellows / matches.length).toFixed(1) : '0.0'}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Jaunes / Match</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'matchs' && (
              <div className="max-w-3xl mx-auto space-y-6">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{matches.length} Matchs Joués</h4>
                 {matches.map(m => {
                    const opp = opponentClubs.find(c => c.id === m.opponent_id);
                    const oppName = opp ? opp.name : 'Adversaire';
                    const fusScore = m.is_home ? m.score_home : m.score_away;
                    const oppScore = m.is_home ? m.score_away : m.score_home;
                    
                     const hasPenalties = (m.penalty_score_home ?? 0) > 0 || (m.penalty_score_away ?? 0) > 0;
                     const fusPenScore = m.is_home ? m.penalty_score_home : m.penalty_score_away;
                     const oppPenScore = m.is_home ? m.penalty_score_away : m.penalty_score_home;

                    return (
                      <div key={m.id} className="flex items-center justify-between bg-slate-50 p-5 rounded-2xl border border-slate-100">
                         <div className="flex items-center gap-4">
                           <div className="w-14 h-14 rounded-xl bg-white border shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                             {mainClub?.logo_url ? <img src={mainClub.logo_url} alt="" className="w-full h-full object-contain p-1.5" /> : <div className="bg-yellow-500 w-full h-full text-white font-black text-sm flex items-center justify-center">F</div>}
                           </div>
                           <span className="font-black text-base uppercase truncate max-w-[120px]">{mainClub?.club_name || 'FUS'}</span>
                         </div>
                         <div className="text-center px-6 flex flex-col items-center justify-center">
                           <div className="text-3xl font-black tracking-tighter text-slate-800">
                             {m.status === 'finished' ? (
                               <>{fusScore ?? 0} - {oppScore ?? 0}</>
                             ) : 'À Venir'}
                           </div>
                           {hasPenalties && (
                              <div className="mt-1 bg-purple-50 text-purple-700 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-purple-200 shadow-sm">
                                 ({fusPenScore} - {oppPenScore} TAB)
                              </div>
                           )}
                           <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">
                             {m.date ? new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'Date inconnue'}
                           </div>
                         </div>
                         <div className="flex items-center gap-4 flex-row-reverse">
                           <div className="w-14 h-14 rounded-xl bg-white border shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                             {opp?.logo_url ? <img src={opp.logo_url} alt="" className="w-full h-full object-contain p-1.5" /> : <Target className="w-6 h-6 text-slate-300" />}
                           </div>
                           <span className="font-black text-base uppercase text-slate-600 truncate max-w-[120px] text-right">{oppName}</span>
                         </div>
                      </div>
                    );
                 })}
                 {matches.length === 0 && (
                    <div className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Aucun match enregistré
                    </div>
                 )}
              </div>
            )}

            {activeTab === 'buteurs' && (
              <div className="max-w-3xl mx-auto space-y-4">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Buteurs - {totalGoalsScored} Buts</h4>
                 {buteurs.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <div className="flex items-center gap-5">
                         <span className="text-[11px] font-black text-slate-400 w-6">#{i + 1}</span>
                         <div className="w-14 h-14 rounded-full bg-red-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                           {p.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover" /> : <Users className="w-6 h-6 text-red-300" />}
                         </div>
                         <span className="font-black text-sm uppercase tracking-wider text-slate-800">{p.first_name} <span className="text-red-600">{p.last_name}</span></span>
                       </div>
                       <div className="bg-yellow-500/20 text-yellow-700 px-4 py-2 rounded-2xl flex items-center gap-2 border border-yellow-500/30">
                         <span className="text-base">⚽</span>
                         <span className="font-black text-lg">{p.goals}</span>
                       </div>
                    </div>
                 ))}
                 {buteurs.length === 0 && (
                    <div className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Aucun buteur
                    </div>
                 )}
              </div>
            )}

            {activeTab === 'cartons' && (
              <div className="max-w-3xl mx-auto space-y-8">
                 {/* Total Summary */}
                 <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Total Cartons</h4>
                    <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-100 p-4">
                       <div className="flex-1 text-center border-r border-slate-200">
                          <span className="block text-2xl font-black text-yellow-500">{totalYellows}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Cartons Jaunes</span>
                       </div>
                       <div className="flex-1 text-center">
                          <span className="block text-2xl font-black text-red-600">{totalReds}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Cartons Rouges</span>
                       </div>
                    </div>
                 </div>

                 {/* Per Player */}
                 <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Par Joueur</h4>
                    <div className="space-y-3">
                       {cartones.map(p => (
                          <div key={p.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <div className="flex items-center gap-5">
                               <div className="w-14 h-14 rounded-full bg-red-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                                 {p.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover" /> : <Users className="w-6 h-6 text-red-300" />}
                               </div>
                               <span className="font-black text-sm uppercase tracking-wider text-slate-800">{p.first_name} <span className="text-red-600">{p.last_name}</span></span>
                             </div>
                             <div className="flex items-center gap-3">
                               {p.yellows > 0 && (
                                 <div className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-yellow-200">
                                   <div className="w-3 h-4 bg-yellow-400 rounded-sm shadow-sm" />
                                   <span className="font-black text-base">{p.yellows}</span>
                                 </div>
                               )}
                               {p.reds > 0 && (
                                 <div className="bg-red-50 text-red-700 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-red-100">
                                   <div className="w-3 h-4 bg-red-500 rounded-sm shadow-sm" />
                                   <span className="font-black text-base">{p.reds}</span>
                                 </div>
                               )}
                             </div>
                          </div>
                       ))}
                       {cartones.length === 0 && (
                          <div className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Aucun carton
                          </div>
                       )}
                    </div>
                 </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LeagueOverviewPanel;
