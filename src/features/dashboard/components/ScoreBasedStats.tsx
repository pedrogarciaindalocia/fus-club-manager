import React, { useMemo, useState } from 'react';
import { useMatches } from '../../../hooks/useMatches';
import { useAdvancedDashboardStats } from '../../../hooks/useAdvancedDashboardStats';
import { usePlayers } from '../../../hooks/usePlayers';
import { useTeams } from '../../../hooks/useTeams';
import { Skeleton } from '../../../components/ui/skeleton';

export default function ScoreBasedStats() {
  const { matches: allMatches, isLoading: matchesLoading } = useMatches();
  const { data: advancedData, isLoading: statsLoading } = useAdvancedDashboardStats();
  const { players, isLoading: playersLoading } = usePlayers();
  const { teams } = useTeams();

  const [selectedMatchId, setSelectedMatchId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<number>(1);

  const isLoading = matchesLoading || statsLoading || playersLoading;

  const matches = useMemo(() => {
    return allMatches || [];
  }, [allMatches]);

  const selectedMatch = useMemo(() => {
    return matches.find(m => m.id === selectedMatchId) || null;
  }, [matches, selectedMatchId]);

  const getTeamName = (teamId: string) => teams?.find(t => t.id === teamId)?.name || 'Équipe';
  const getPlayerName = (playerId: string) => players?.find(p => p.id === playerId)?.full_name || 'Joueur Inconnu';

  // ----------------------------------------------------
  // COMPUTATIONS FOR TABLES 1 & 2 (Specific Match)
  // ----------------------------------------------------
  
  const matchDetails = useMemo(() => {
    if (!selectedMatch || !advancedData) return null;
    const matchEvents = advancedData.events.filter(e => e.match_id === selectedMatch.id && ['goal', 'own_goal'].includes(e.type));
    
    // Sort goals by minute
    matchEvents.sort((a, b) => a.minute - b.minute);
    
    let currentHome = 0;
    let currentAway = 0;
    const scoreEvolution: string[] = ['0-0'];
    let minLedThenReturned = false;
    let matchFlipped = false;
    let temporaryTiesCount = 0;

    let wasHomeDown = false;
    let wasAwayDown = false;

    matchEvents.forEach(e => {
      // Simplification: suppose if player is in our players list, it's our goal, otherwise opponent.
      // But we can also use is_home. For now we assume we know who scored.
      // Easiest is to just track the score if we can know if the player belongs to the club.
      // But we don't have team strictly defined per event. Let's assume we can map it.
      const isOurPlayer = players?.some(p => p.id === e.player_id);
      if ((selectedMatch.is_home && isOurPlayer) || (!selectedMatch.is_home && !isOurPlayer)) {
        currentHome++;
      } else {
        currentAway++;
      }
      
      scoreEvolution.push(`${currentHome}-${currentAway}`);

      if (currentHome === currentAway) {
        temporaryTiesCount++;
      }

      if (currentHome < currentAway) wasHomeDown = true;
      if (currentAway < currentHome) wasAwayDown = true;

      if ((currentHome > currentAway && wasHomeDown) || (currentAway > currentHome && wasAwayDown)) {
        minLedThenReturned = true;
      }
    });

    const finalHomeScore = selectedMatch.score_home;
    const finalAwayScore = selectedMatch.score_away;

    if (
      (finalHomeScore > finalAwayScore && wasHomeDown) ||
      (finalAwayScore > finalHomeScore && wasAwayDown)
    ) {
      matchFlipped = true;
    }

    const firstGoal = matchEvents.length > 0 ? matchEvents[0] : null;
    const lastGoal = matchEvents.length > 0 ? matchEvents[matchEvents.length - 1] : null;

    let eos = 'Aucun';
    if (firstGoal) {
      const isOurFirstGoalPlayer = players?.some(p => p.id === firstGoal.player_id);
      eos = isOurFirstGoalPlayer ? 'Notre Équipe' : 'Adversaire';
    }

    return {
      homeTeam: selectedMatch.is_home ? getTeamName(selectedMatch.team_id) : 'Adversaire',
      awayTeam: !selectedMatch.is_home ? getTeamName(selectedMatch.team_id) : 'Adversaire',
      halfTimeScore: 'N/A', // Not supported explicitly without more precise event data or fields
      finalScore: `${finalHomeScore} - ${finalAwayScore}`,
      firstGoalInfo: firstGoal ? `${getPlayerName(firstGoal.player_id!)} (${firstGoal.minute}')` : 'Aucun',
      firstGoalMinute: firstGoal ? firstGoal.minute : '-',
      lastGoalInfo: lastGoal ? `${getPlayerName(lastGoal.player_id!)} (${lastGoal.minute}')` : 'Aucun',
      totalGoals: finalHomeScore + finalAwayScore,
      scoreDiff: Math.abs(finalHomeScore - finalAwayScore),
      scoreEvolution: scoreEvolution.join(' → '),
      teamMenéePuisRevenue: minLedThenReturned ? 'Oui' : 'Non',
      matchRenverse: matchFlipped ? 'Oui' : 'Non',
      scoreNulTemporaire: temporaryTiesCount,
      eos, // Équipe qui ouvre le score
      buts1reMT: matchEvents.filter(e => e.minute <= 45).length,
      buts2eMT: matchEvents.filter(e => e.minute > 45).length,
      butsTardifs: matchEvents.filter(e => e.minute >= 75).length,
    };
  }, [selectedMatch, advancedData, players, getTeamName, getPlayerName]);


  // ----------------------------------------------------
  // COMPUTATIONS FOR TABLE 3 (Player Stats)
  // ----------------------------------------------------
  const playerStats = useMemo(() => {
    if (!advancedData || !players) return [];

    const pStats = new Map<string, any>();

    players.forEach(p => {
      pStats.set(p.id, {
        id: p.id,
        name: p.full_name,
        G: 0,
        A: 0,
        PB: 0, // Premier but
        BEG: 0, // But égalisation (approx)
        BB: 0, // But du break (approx)
        BRS: 0, // But réduction score (approx)
        BG: 0, // But gagnant (approx)
        MJ: 0,
        Min: 0,
        APB: 0,
        AD: 0,
        Y: 0,
        R: 0
      });
    });

    const matchesToAnalyze = selectedMatchId === 'ALL' ? matches : [selectedMatch].filter(Boolean);

    matchesToAnalyze.forEach(m => {
      if (!m) return;
      const mEvents = advancedData.events.filter(e => e.match_id === m.id && e.minute !== null).sort((a,b)=>a.minute - b.minute);
      const mPlayers = advancedData.playerStats.filter(ps => ps.match_id === m.id);

      mPlayers.forEach(mp => {
        if (pStats.has(mp.player_id)) {
          const s = pStats.get(mp.player_id);
          s.MJ += 1;
          s.Min += mp.minutes_played || 0;
          s.G += mp.goals || 0;
          s.A += mp.assists || 0;
        }
      });

      // analyze events for advanced goal definitions
      let home = 0; let away = 0;
      mEvents.forEach((e, idx) => {
        if (e.type === 'goal' || e.type === 'own_goal') {
          const isUs = players.some(p => p.id === e.player_id);
          const theScorer = e.player_id;

          if ((m.is_home && isUs) || (!m.is_home && !isUs)) home++; else away++;

          if (idx === 0) {
            // First goal
            if (theScorer && pStats.has(theScorer)) pStats.get(theScorer).PB += 1;
          }

          if (home === away) {
            if (theScorer && pStats.has(theScorer)) pStats.get(theScorer).BEG += 1;
          } else if (Math.abs(home - away) === 2) {
             if (theScorer && pStats.has(theScorer)) pStats.get(theScorer).BB += 1;
          } else if (Math.abs(home - away) === 1 && home > 0 && away > 0) {
             if (theScorer && pStats.has(theScorer)) pStats.get(theScorer).BRS += 1;
          }

          if (e.type === 'yellow_card' && e.player_id && pStats.has(e.player_id)) {
            pStats.get(e.player_id).Y += 1;
          }
          if (e.type === 'red_card' && e.player_id && pStats.has(e.player_id)) {
            pStats.get(e.player_id).R += 1;
          }
        }
      });
    });

    return Array.from(pStats.values())
      .filter(p => p.MJ > 0)
      .map(p => ({
        ...p,
        performanceIndex: (p.G * 4) + (p.A * 3) + (p.MJ * 1.5) - (p.Y * 1.5) - (p.R * 5)
      }))
      .sort((a, b) => b.performanceIndex - a.performanceIndex);
  }, [advancedData, players, matches, selectedMatch, selectedMatchId]);


  // ----------------------------------------------------
  // COMPUTATIONS FOR TABLE 4 (Team Stats)
  // ----------------------------------------------------
  const teamStats = useMemo(() => {
    if (!matches || matches.length === 0 || !advancedData) return null;

    let MJ = 0, V = 0, N = 0, D = 0, BP = 0, BC = 0;
    let MSM = 0, CSF = 0, Over25 = 0, Under25 = 0;
    let MOS = 0, VicAfterMOS = 0, MEP = 0, Remontee = 0, Renversement = 0;
    let B1 = 0, B2 = 0, BT = 0;

    matches.forEach(m => {
      // Only count finished matches possibly? Or just all matches with scores
      if (m.status !== 'finished') return; // optional
      
      MJ++;
      const [scored, conceded] = m.is_home ? [m.score_home, m.score_away] : [m.score_away, m.score_home];
      
      BP += scored;
      BC += conceded;

      if (scored > conceded) V++;
      else if (scored === conceded) N++;
      else D++;

      if (scored === 0) MSM++;
      if (conceded === 0) CSF++;

      if (scored + conceded >= 3) Over25++;
      if (scored + conceded <= 2) Under25++;

      const mEvents = advancedData.events.filter(e => e.match_id === m.id && ['goal', 'own_goal'].includes(e.type)).sort((a,b)=>a.minute - b.minute);
      
      let home = 0, away = 0;
      let weOpened = false;
      let theyOpened = false;
      let weWereDown = false;

      mEvents.forEach((e, idx) => {
        const isUs = players?.some(p => p.id === e.player_id);
        const usScored = (m.is_home && isUs) || (!m.is_home && !isUs);

        if (idx === 0) {
          if (usScored) { weOpened = true; MOS++; }
          else { theyOpened = true; MEP++; }
        }

        if (usScored) home++; else away++; // generic local event score
        
        // Wait, if it's us: actual scored, if not: actual conceded
        const curDiff = usScored ? (home - away) : (away - home); // approx logic
        // Simplified tracking for leading
        
        if (e.minute <= 45 && usScored) B1++;
        if (e.minute > 45 && usScored) B2++;
        if (e.minute >= 75 && usScored) BT++;
      });

      if (weOpened && scored > conceded) VicAfterMOS++;
      if (theyOpened && scored >= conceded) Remontee++;
      if (theyOpened && scored > conceded) Renversement++;
    });

    if (MJ === 0) return null;

    return {
      MJ, V, N, D, Pts: (3 * V) + N, BP, BC, GD: BP - BC,
      MBP: (BP / MJ).toFixed(2), MBC: (BC / MJ).toFixed(2), TBM: ((BP + BC) / MJ).toFixed(2),
      TV: (V / MJ * 100).toFixed(1) + '%',
      MSM, CSF, 'CS%': (CSF / MJ * 100).toFixed(1) + '%',
      Over25, Under25,
      MOS, TVOS: MOS > 0 ? (VicAfterMOS / MOS * 100).toFixed(1) + '%' : '0%',
      MEP, TR: MEP > 0 ? (Remontee / MEP * 100).toFixed(1) + '%' : '0%',
      TREN: MEP > 0 ? (Renversement / MEP * 100).toFixed(1) + '%' : '0%',
      B1, B2, BT
    };
  }, [matches, advancedData, players]);


  if (isLoading) {
    return <Skeleton className="h-[600px] w-full rounded-[2rem]" />;
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-xl border border-gray-100 flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
          Analytiques & Stats Avancées
        </h2>
        <div className="flex gap-4 items-center">
          <label className="text-sm font-semibold text-gray-600">Filtre Match</label>
          <select
            value={selectedMatchId}
            onChange={e => setSelectedMatchId(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-medium focus:ring-2 focus:ring-red-600/50 outline-none"
          >
            <option value="ALL">Tous les matchs (Stats Générales)</option>
            {matches.map(m => (
              <option key={m.id} value={m.id}>
                {new Date(m.match_date).toLocaleDateString()} - {m.is_home ? 'Domicile' : 'Extérieur'} ({m.score_home}-{m.score_away})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {[
          { id: 1, label: 'Détails du Match' },
          { id: 2, label: 'Stats du Match' },
          { id: 3, label: 'Stats Joueurs' },
          { id: 4, label: 'Stats Équipe' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[120px] px-4 py-2 font-bold text-sm rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-[400px] overflow-auto">
        {activeTab === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            {selectedMatchId === 'ALL' ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <span className="text-4xl mb-4">📊</span>
                <p>Veuillez sélectionner un match spécifique pour voir ses détails.</p>
              </div>
            ) : matchDetails ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="pb-3 px-4 font-bold text-gray-400 uppercase text-xs tracking-wider">Élément</th>
                    <th className="pb-3 px-4 font-bold text-gray-400 uppercase text-xs tracking-wider">Valeur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                     { label: 'Équipe domicile', val: matchDetails.homeTeam },
                     { label: 'Équipe extérieure', val: matchDetails.awayTeam },
                     { label: 'Score final', val: matchDetails.finalScore },
                     { label: 'Évolution du score', val: matchDetails.scoreEvolution },
                     { label: 'Premier but par', val: matchDetails.firstGoalInfo },
                     { label: 'Temps du premier but', val: `${matchDetails.firstGoalMinute}'` },
                     { label: 'Dernier but par', val: matchDetails.lastGoalInfo },
                     { label: 'Nombre total de buts', val: matchDetails.totalGoals },
                     { label: 'Écart de score', val: matchDetails.scoreDiff },
                     { label: 'Équipe menée puis revenue', val: matchDetails.teamMenéePuisRevenue },
                     { label: 'Match renversé', val: matchDetails.matchRenverse },
                     { label: 'Score nul temporaire (fois)', val: matchDetails.scoreNulTemporaire }
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-700">{row.label}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">{row.val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Données indisponibles.</p>
            )}
          </div>
        )}

        {activeTab === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            {selectedMatchId === 'ALL' ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <span className="text-4xl mb-4">📈</span>
                <p>Veuillez sélectionner un match spécifique pour voir les stats centrées sur le score.</p>
              </div>
            ) : matchDetails ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="pb-3 px-4 font-bold text-gray-400 uppercase text-xs tracking-wider">Statistique</th>
                    <th className="pb-3 px-4 font-bold text-gray-400 uppercase text-xs tracking-wider">Valeur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                     { label: 'Score final (SF)', val: matchDetails.finalScore },
                     { label: 'Total de buts (TB)', val: matchDetails.totalGoals },
                     { label: 'Différence de buts (DG)', val: matchDetails.scoreDiff },
                     { label: 'Changements de score (CS)', val: matchDetails.scoreEvolution.split('→').length - 1 },
                     { label: 'Nombre d’égalités', val: matchDetails.scoreNulTemporaire },
                     { label: 'Buts en 1re mi-temps (B1)', val: matchDetails.buts1reMT },
                     { label: 'Buts en 2e mi-temps (B2)', val: matchDetails.buts2eMT },
                     { label: 'Buts tardifs (BT > 75\')', val: matchDetails.butsTardifs },
                     { label: 'Temps du 1er but', val: `${matchDetails.firstGoalMinute}'` },
                     { label: 'Équipe qui ouvre le score', val: matchDetails.eos },
                     { label: 'Match avec remontée', val: matchDetails.teamMenéePuisRevenue },
                     { label: 'Match renversé', val: matchDetails.matchRenverse },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-700">{row.label}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">{row.val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        )}

        {activeTab === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 overflow-x-auto pb-4">
             <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="pb-3 px-4 font-bold text-gray-400 uppercase text-xs tracking-wider">Joueur</th>
                    <th className="pb-3 px-4 font-bold text-red-600 uppercase text-xs tracking-wider" title="Score de Performance">Perf.</th>
                    <th className="pb-3 px-4 font-bold text-gray-400 uppercase text-xs tracking-wider" title="Matchs Joués">MJ</th>
                    <th className="pb-3 px-4 font-bold text-gray-400 uppercase text-xs tracking-wider" title="Buts">G</th>
                    <th className="pb-3 px-4 font-bold text-gray-400 uppercase text-xs tracking-wider" title="Passes D">A</th>
                    <th className="pb-3 px-4 font-bold text-amber-500 uppercase text-xs tracking-wider" title="Cartons Jaunes">Y</th>
                    <th className="pb-3 px-4 font-bold text-red-500 uppercase text-xs tracking-wider" title="Cartons Rouges">R</th>
                    <th className="pb-3 px-4 font-bold text-gray-400 uppercase text-xs tracking-wider" title="Buts par match">G/M</th>
                    <th className="pb-3 px-4 font-bold text-gray-400 uppercase text-xs tracking-wider" title="Contribution Score / 90">CS90</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {playerStats.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900">{p.name}</td>
                      <td className="py-3 px-4 font-black text-red-600 bg-red-50 rounded-lg text-center">{p.performanceIndex.toFixed(1)}</td>
                      <td className="py-3 px-4 text-gray-600">{p.MJ}</td>
                      <td className="py-3 px-4 font-bold text-blue-600">{p.G}</td>
                      <td className="py-3 px-4 font-semibold text-gray-700">{p.A}</td>
                      <td className="py-3 px-4 font-bold text-amber-500">{p.Y}</td>
                      <td className="py-3 px-4 font-bold text-red-500">{p.R}</td>
                      <td className="py-3 px-4 text-gray-600">{(p.G / p.MJ).toFixed(2)}</td>
                      <td className="py-3 px-4 text-gray-600">{p.Min > 0 ? (((p.G + p.A) * 90) / p.Min).toFixed(2) : '-'}</td>
                    </tr>
                  ))}
                  {playerStats.length === 0 && (
                     <tr><td colSpan={10} className="py-8 text-center text-gray-400">Aucune statistique joueur trouvée.</td></tr>
                  )}
                </tbody>
              </table>
          </div>
        )}

        {activeTab === 4 && teamStats && (
          <div className="animate-in fade-in slide-in-from-bottom-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Global', metrics: [
                  { label: 'Matchs Joués', val: teamStats.MJ },
                  { label: 'Victoires', val: teamStats.V },
                  { label: 'Nuls', val: teamStats.N },
                  { label: 'Défaites', val: teamStats.D },
                  { label: 'Taux de Victoire', val: teamStats.TV },
                ]},
                { title: 'Offensif', metrics: [
                  { label: 'Buts Marqués (BP)', val: teamStats.BP },
                  { label: 'Moy Buts Marqués (MBP)', val: teamStats.MBP },
                  { label: 'Matchs Sans Marquer', val: teamStats.MSM },
                  { label: 'Matchs où on ouvre l\'O.S. (MOS)', val: teamStats.MOS },
                  { label: 'Victoire après O.S.', val: teamStats.TVOS },
                ]},
                { title: 'Défensif & Dynamiques', metrics: [
                  { label: 'Buts Encaissés (BC)', val: teamStats.BC },
                  { label: 'Clean Sheets (CS%)', val: `${teamStats.CSF} (${teamStats['CS%']})` },
                  { label: 'Matchs avec +2.5 buts', val: teamStats.Over25 },
                  { label: 'Taux de Remontée', val: teamStats.TR },
                  { label: 'Buts Tardifs (>= 75\')', val: teamStats.BT },
                ]}
              ].map((group, gi) => (
                <div key={gi} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-4">{group.title}</h3>
                  <div className="space-y-3">
                     {group.metrics.map((m, mi) => (
                       <div key={mi} className="flex justify-between items-center text-sm">
                         <span className="text-gray-600 font-medium">{m.label}</span>
                         <span className="font-black text-gray-900 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100">
                           {m.val}
                         </span>
                       </div>
                     ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
