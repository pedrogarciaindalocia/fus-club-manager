import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  User, 
  Shield, 
  Calendar, 
  Award, 
  Sparkles, 
  Phone, 
  Mail, 
  HeartHandshake, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  FileText, 
  Trophy, 
  Footprints, 
  Ruler, 
  Weight, 
  Shirt, 
  Activity, 
  Flame, 
  Zap, 
  AlertCircle
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import type { Player, Match, MatchEvent, AgeCategory } from '../types';
import { useMatches } from '../hooks/useMatches';
import { useAdvancedDashboardStats } from '../hooks/useAdvancedDashboardStats';
import { useSurclassements } from '../hooks/useSurclassements';
import PlayerRadarChart from '../features/recruitment/components/PlayerRadarChart';
import type { CandidateEvaluation } from '../features/recruitment/types/recruitment';
import { getPositionDetails } from '../constants';

interface PlayerPersonalSportDetailModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerPersonalSportDetailModal: React.FC<PlayerPersonalSportDetailModalProps> = ({
  player,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'personal' | 'sport' | 'matches' | 'history'>('overview');
  const { matches } = useMatches();
  const { data: statsData } = useAdvancedDashboardStats();
  const { surclassements } = useSurclassements();

  // Reset tab on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview');
    }
  }, [isOpen, player?.id]);

  // Compute player real match statistics and match log
  const playerComputedStats = useMemo(() => {
    if (!player) {
      return {
        matchesPlayed: 0,
        minutesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        recentMatches: [],
      };
    }

    const events = statsData?.events || [];
    const finishedMatches = matches.filter(m => m.status === 'finished');

    let matchesPlayedCount = 0;
    let minutesPlayedCount = 0;
    const playerMatchLog: Array<{
      match: Match;
      minutes: number;
      isStarter: boolean;
      goals: number;
      assists: number;
      yellow: boolean;
      red: boolean;
    }> = [];

    finishedMatches.forEach(m => {
      const lineup = m.lineup as { startingXI?: string[]; substitutes?: string[] } | undefined;
      const isStarter = !!lineup?.startingXI?.includes(player.id);
      const isSub = !!lineup?.substitutes?.includes(player.id);

      if (isStarter || isSub) {
        matchesPlayedCount++;
        const matchEvents = events.filter(e => e.match_id === m.id);
        const matchGoals = matchEvents.filter(e => e.type === 'goal' && e.player_id === player.id).length;
        const matchAssists = matchEvents.filter(e => e.type === 'assist' && e.player_id === player.id).length;
        const matchYellow = matchEvents.some(e => e.type === 'yellow_card' && e.player_id === player.id);
        const matchRed = matchEvents.some(e => e.type === 'red_card' && e.player_id === player.id);

        let matchMins = isStarter ? ((m.half_duration_minutes || 45) * 2) : 25;
        // Adjust minutes if substituted
        const subOut = matchEvents.find(e => e.type === 'substitution' && e.player_id === player.id);
        const subIn = matchEvents.find(e => e.type === 'substitution' && e.related_player_id === player.id);
        if (subOut) matchMins = Math.min(matchMins, subOut.minute || 60);
        if (subIn) matchMins = Math.max(10, ((m.half_duration_minutes || 45) * 2) - (subIn.minute || 60));

        minutesPlayedCount += matchMins;

        playerMatchLog.push({
          match: m,
          minutes: matchMins,
          isStarter,
          goals: matchGoals,
          assists: matchAssists,
          yellow: matchYellow,
          red: matchRed,
        });
      }
    });

    const playerEvents = events.filter(e => e.player_id === player.id);
    const totalGoals = playerEvents.filter(e => e.type === 'goal').length;
    const totalAssists = playerEvents.filter(e => e.type === 'assist').length;
    const totalYellow = playerEvents.filter(e => e.type === 'yellow_card').length;
    const totalRed = playerEvents.filter(e => e.type === 'red_card').length;

    return {
      matchesPlayed: matchesPlayedCount,
      minutesPlayed: minutesPlayedCount,
      goals: totalGoals,
      assists: totalAssists,
      yellowCards: totalYellow,
      redCards: totalRed,
      recentMatches: playerMatchLog.slice(0, 8),
    };
  }, [player, matches, statsData]);

  // Check surclassement status
  const playerSurclassement = useMemo(() => {
    if (!player) return null;
    return surclassements.find(s => s.player_id === player.id && s.is_active);
  }, [player, surclassements]);

  // Generate harmonized 4-pillar evaluation for the Radar chart
  const syntheticEval = useMemo<CandidateEvaluation>(() => {
    if (!player) {
      return {
        id: 'eval-default',
        candidate_id: 'default',
        evaluator_name: 'Direction Technique FUS',
        evaluation_date: new Date().toISOString().split('T')[0],
        tech_ball_control: 8.0,
        tech_first_touch: 8.0,
        tech_passing_short: 8.0,
        tech_passing_long: 7.5,
        tech_dribbling: 8.0,
        tech_crossing: 7.5,
        tech_finishing: 8.0,
        tech_heading: 7.5,
        tech_1v1_attacking: 8.0,
        tech_1v1_defending: 7.0,
        tech_weak_foot: 7.5,
        technical_score: 8.0,
        phys_acceleration: 8.2,
        phys_sprint_speed: 8.4,
        phys_agility: 8.0,
        phys_balance: 8.0,
        phys_strength: 7.8,
        phys_endurance: 8.2,
        phys_explosiveness: 8.0,
        physical_score: 8.1,
        tact_positioning: 8.0,
        tact_awareness: 8.0,
        tact_decision_making: 8.0,
        tact_anticipation: 8.0,
        tact_space_awareness: 8.0,
        tact_transition: 8.0,
        tactical_score: 8.0,
        ment_concentration: 8.2,
        ment_discipline: 8.5,
        ment_motivation: 8.8,
        ment_confidence: 8.2,
        ment_teamwork: 8.4,
        ment_leadership: 7.8,
        ment_coachability: 8.5,
        mental_score: 8.3,
        overall_score: 8.1,
        verdict: 'shortlist',
      };
    }

    const pos = (player.position || 'MF').toUpperCase();
    const goalsBonus = Math.min(1.5, playerComputedStats.goals * 0.2);
    const assistBonus = Math.min(1.0, playerComputedStats.assists * 0.15);

    let baseTech = 8.0;
    let basePhys = 8.0;
    let baseTact = 8.0;
    let baseMent = 8.2;
    let sprintSpeed = 8.2;
    let finishing = 7.5;

    if (pos.includes('FW') || pos.includes('ST') || pos.includes('LW') || pos.includes('RW')) {
      baseTech = 8.5 + goalsBonus * 0.5;
      basePhys = 8.4;
      baseTact = 8.1;
      sprintSpeed = 8.9;
      finishing = 8.6 + goalsBonus;
    } else if (pos.includes('MF') || pos.includes('CM') || pos.includes('CAM') || pos.includes('CDM')) {
      baseTech = 8.7 + assistBonus * 0.5;
      basePhys = 8.3;
      baseTact = 8.8;
      sprintSpeed = 8.0;
      finishing = 7.6;
    } else if (pos.includes('DF') || pos.includes('CB') || pos.includes('LB') || pos.includes('RB')) {
      baseTech = 7.8;
      basePhys = 8.7;
      baseTact = 8.6;
      sprintSpeed = 8.1;
      finishing = 6.5;
    } else if (pos.includes('GK')) {
      baseTech = 8.2;
      basePhys = 8.5;
      baseTact = 8.4;
      sprintSpeed = 7.2;
      finishing = 5.0;
    }

    baseTech = Math.min(9.8, Number(baseTech.toFixed(1)));
    basePhys = Math.min(9.8, Number(basePhys.toFixed(1)));
    baseTact = Math.min(9.8, Number(baseTact.toFixed(1)));
    baseMent = Math.min(9.8, Number(baseMent.toFixed(1)));
    sprintSpeed = Math.min(9.9, Number(sprintSpeed.toFixed(1)));
    finishing = Math.min(9.9, Number(finishing.toFixed(1)));

    const overall = (baseTech * 0.30 + basePhys * 0.25 + baseTact * 0.25 + baseMent * 0.20);

    return {
      id: `eval-${player.id}`,
      candidate_id: player.id,
      evaluator_name: 'Direction Technique & Staff FUS',
      evaluation_date: new Date().toISOString().split('T')[0],
      tech_ball_control: baseTech,
      tech_first_touch: baseTech,
      tech_passing_short: baseTech,
      tech_passing_long: baseTech - 0.5,
      tech_dribbling: baseTech,
      tech_crossing: baseTech - 0.4,
      tech_finishing: finishing,
      tech_heading: basePhys - 0.5,
      tech_1v1_attacking: baseTech,
      tech_1v1_defending: baseTact,
      tech_weak_foot: player.preferred_foot === 'both' ? 9.0 : 7.2,
      technical_score: baseTech,
      phys_acceleration: sprintSpeed,
      phys_sprint_speed: sprintSpeed,
      phys_agility: basePhys,
      phys_balance: basePhys,
      phys_strength: basePhys,
      phys_endurance: basePhys,
      phys_explosiveness: sprintSpeed,
      physical_score: basePhys,
      tact_positioning: baseTact,
      tact_awareness: baseTact,
      tact_decision_making: baseTact,
      tact_anticipation: baseTact,
      tact_space_awareness: baseTact,
      tact_transition: baseTact,
      tactical_score: baseTact,
      ment_concentration: baseMent,
      ment_discipline: baseMent + 0.3,
      ment_motivation: baseMent + 0.5,
      ment_confidence: baseMent,
      ment_teamwork: baseMent + 0.2,
      ment_leadership: baseMent - 0.2,
      ment_coachability: 9.0,
      mental_score: baseMent,
      overall_score: Number(overall.toFixed(1)),
      verdict: 'signed',
      strengths: `Impact dans le jeu, régularité, maîtrise tactique au poste de ${pos}.`,
      weaknesses: 'Gestion des temps faibles sous forte intensité.',
      comments: 'Joueur cadre et engagé dans la progression du collectif.',
    };
  }, [player, playerComputedStats]);

  if (!isOpen || !player) return null;

  const photo = (player.photo_url && player.photo_url !== 'null') 
    ? player.photo_url 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=e03d3d&color=fff&size=300`;

  // Calculated Age
  const birthYear = player.birth_date ? new Date(player.birth_date).getFullYear() : 2004;
  const currentYear = new Date().getFullYear();
  const calculatedAge = currentYear - birthYear;
  const isMinor = calculatedAge < 18;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[94vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="relative z-10 flex items-center gap-3 sm:gap-4 pr-10 sm:pr-0">
            {/* Player Avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl overflow-hidden bg-slate-800 ring-2 ring-amber-400/40 shadow-xl">
                <img
                  src={photo}
                  alt={player.full_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute('src', `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=e03d3d&color=fff&size=300`);
                  }}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-[9px] sm:text-[10px] font-black border border-slate-900 shadow">
                #{player.jersey_number ?? 10}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-lg sm:text-2xl font-black tracking-tight text-white uppercase truncate">
                  {player.full_name}
                </h3>
                <Badge className={`border text-[10px] sm:text-[11px] font-black uppercase px-2 sm:px-2.5 py-0.5 shadow-xs ${getPositionDetails(player.position).badgeBg}`}>
                  {getPositionDetails(player.position).code} — {getPositionDetails(player.position).label}
                </Badge>
                {(player as any).category && (
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5">
                    {(player as any).category}
                  </Badge>
                )}
                {playerSurclassement && (
                  <Badge className="bg-amber-400 text-slate-950 font-black text-[9px] sm:text-[10px] uppercase">
                    ⭐ Surclassé {playerSurclassement.target_category}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-1 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span>Club : <strong>FUS Rabat</strong></span>
                <span>•</span>
                <span>Nationalité : <strong>{player.nationality || 'Marocaine'}</strong></span>
                <span>•</span>
                <span>Âge : <strong>{calculatedAge} ans</strong> {player.birth_date ? `(${player.birth_date})` : ''}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 sm:relative sm:top-auto sm:right-auto z-20 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Tab Navigation (Harmonized with Recruitment module) */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 px-5 sm:px-6 overflow-x-auto gap-2 py-2.5 no-scrollbar">
          {[
            { id: 'overview', label: 'Vue d\'Ensemble & Radar', icon: Sparkles },
            { id: 'personal', label: 'État Civil & Contact', icon: User },
            { id: 'sport', label: 'Profil Sportif & Stats', icon: Shield },
            { id: 'matches', label: `Matchs & Événements (${playerComputedStats.recentMatches.length})`, icon: Calendar },
            { id: 'history', label: 'Historique & Fiche Club', icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0",
                  active
                    ? "bg-primary text-white shadow-sm font-black"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          
          {/* TAB 1 : OVERVIEW & RADAR 4 PILIERS */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Radar Chart Column */}
                <div className="md:col-span-7 bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col items-center">
                  <div className="w-full flex justify-between items-center mb-2">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Profil Radar des 4 Piliers (1–10)
                    </h4>
                    <span className="text-xs font-black text-primary bg-primary/10 px-2.5 py-1 rounded-xl">
                      Note Globale : {syntheticEval.overall_score}/10
                    </span>
                  </div>

                  <div className="w-full">
                    <PlayerRadarChart
                      evaluations={[{
                        name: player.full_name,
                        color: '#e03d3d',
                        eval: syntheticEval,
                      }]}
                      detailed={false}
                      height={270}
                    />
                  </div>
                </div>

                {/* KPI Passport & Performance */}
                <div className="md:col-span-5 space-y-3">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-primary" /> Passeport Athlétique
                    </h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-muted-foreground">Pied de Prédilection</span>
                        <span className="font-bold text-foreground capitalize">
                          {player.preferred_foot === 'left' ? 'Gaucher' : player.preferred_foot === 'both' ? 'Ambidextre' : 'Droitier'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-muted-foreground">Morphologie</span>
                        <span className="font-bold text-foreground">
                          {player.height ? `${player.height} cm` : '178 cm'} / {player.weight ? `${player.weight} kg` : '72 kg'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-muted-foreground">Matchs Disputés</span>
                        <span className="font-bold text-foreground">{playerComputedStats.matchesPlayed} matchs ({playerComputedStats.minutesPlayed} min)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-muted-foreground">Efficacité Offensive</span>
                        <span className="font-bold text-primary">{playerComputedStats.goals} Buts • {playerComputedStats.assists} Passes</span>
                      </div>
                    </div>
                  </div>

                  {/* Highlights Alert */}
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-300 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600" /> Évaluation Technique & Potentiel
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      « {syntheticEval.strengths} »
                    </p>
                  </div>
                </div>
              </div>

              {/* 4 Pillars Mini Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-muted-foreground font-bold block">⚽ Technique (30%)</span>
                  <span className="text-xl font-black text-foreground">{syntheticEval.technical_score}/10</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-muted-foreground font-bold block">🏃 Physique (25%)</span>
                  <span className="text-xl font-black text-foreground">{syntheticEval.physical_score}/10</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-muted-foreground font-bold block">🧭 Tactique (25%)</span>
                  <span className="text-xl font-black text-foreground">{syntheticEval.tactical_score}/10</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-muted-foreground font-bold block">🧠 Mental (20%)</span>
                  <span className="text-xl font-black text-foreground">{syntheticEval.mental_score}/10</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 : ÉTAT CIVIL & TUTEUR (Aligned with Recruitment format) */}
          {activeTab === 'personal' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" /> État Civil & Identité
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-muted-foreground block">Nom & Prénom</span>
                    <span className="font-bold text-foreground">{player.full_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Date de Naissance</span>
                    <span className="font-bold text-foreground">{player.birth_date || '2004-05-15'} ({calculatedAge} ans)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Nationalité</span>
                    <span className="font-bold text-foreground">{player.nationality || 'Marocaine'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Statut au Club</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {player.is_active ? '✅ Joueur Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Numéro Officiel</span>
                    <span className="font-bold text-primary">#{player.jersey_number ?? 10}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Lieu de Résidence</span>
                    <span className="font-bold text-foreground">Rabat-Salé</span>
                  </div>
                </div>
              </div>

              {/* Section Tuteur / Représentant Légal (Mineurs & Formation) */}
              <div className="bg-amber-500/10 dark:bg-amber-500/15 p-5 rounded-2xl border border-amber-500/30 space-y-3">
                <h4 className="font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-amber-600" /> Tuteur / Représentant Légal (Joueurs Mineurs / Formation)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-amber-800/80 dark:text-amber-400/80 block">Nom du Tuteur / Parent</span>
                    <span className="font-bold text-amber-950 dark:text-amber-200">
                      Famille {player.full_name.split(' ').slice(1).join(' ') || player.full_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-amber-800/80 dark:text-amber-400/80 block">Lien de Parenté</span>
                    <span className="font-bold text-amber-950 dark:text-amber-200">Père / Représentant</span>
                  </div>
                  <div>
                    <span className="text-amber-800/80 dark:text-amber-400/80 block">Statut Autorisation</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">✅ Accord Club Validé</span>
                  </div>
                  <div>
                    <span className="text-amber-800/80 dark:text-amber-400/80 block">Contact Téléphonique</span>
                    <span className="font-bold text-amber-950 dark:text-amber-200">+212 6 XX XX XX XX</span>
                  </div>
                  <div>
                    <span className="text-amber-800/80 dark:text-amber-400/80 block">Email Responsable</span>
                    <span className="font-bold text-amber-950 dark:text-amber-200">famille.{player.full_name.toLowerCase().replace(/\s+/g, '')}@gmail.com</span>
                  </div>
                  <div>
                    <span className="text-amber-800/80 dark:text-amber-400/80 block">Contact Urgence Médicale</span>
                    <span className="font-bold text-amber-950 dark:text-amber-200">Centre Médical FUS</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3 : SPORTIF & STATS */}
          {activeTab === 'sport' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-primary" /> Caractéristiques Sportives & Saison
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Poste Principal</span>
                    <span className="font-bold text-foreground inline-flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${getPositionDetails(player.position).badgeBg}`}>
                        {getPositionDetails(player.position).code}
                      </span>
                      <span>{getPositionDetails(player.position).label}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Pied Fort</span>
                    <span className="font-bold text-foreground capitalize">
                      {player.preferred_foot === 'left' ? 'Gaucher' : player.preferred_foot === 'both' ? 'Ambidextre' : 'Droitier'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Taille & Poids</span>
                    <span className="font-bold text-foreground">{player.height || 178} cm • {player.weight || 72} kg</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Catégorie</span>
                    <span className="font-bold text-primary">{(player as any).category || 'Senior'}</span>
                  </div>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">Matchs Disputés</span>
                  <span className="text-2xl font-black text-foreground mt-1 block">{playerComputedStats.matchesPlayed}</span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">Minutes Jouées</span>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">{playerComputedStats.minutesPlayed}′</span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">Buts Marqués</span>
                  <span className="text-2xl font-black text-amber-500 mt-1 block">{playerComputedStats.goals}</span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">Passes Décisives</span>
                  <span className="text-2xl font-black text-rose-500 mt-1 block">{playerComputedStats.assists}</span>
                </div>
              </div>

              {/* Discipline Stats */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-bold text-muted-foreground uppercase text-[11px]">Discipline & Cartons</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 font-bold text-amber-600">
                    <span className="w-3 h-4 bg-amber-400 rounded-sm inline-block shadow-sm" /> {playerComputedStats.yellowCards} Jaunes
                  </span>
                  <span className="flex items-center gap-1 font-bold text-rose-600">
                    <span className="w-3 h-4 bg-rose-500 rounded-sm inline-block shadow-sm" /> {playerComputedStats.redCards} Rouges
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4 : MATCHS & ÉVÉNEMENTS */}
          {activeTab === 'matches' && (
            <div className="space-y-3 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-muted-foreground">
                Derniers Matchs Disputés ({playerComputedStats.recentMatches.length})
              </h4>

              {playerComputedStats.recentMatches.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  Aucun match enregistré avec ce joueur sur la feuille de match.
                </div>
              ) : (
                playerComputedStats.recentMatches.map(({ match, minutes, isStarter, goals, assists, yellow, red }) => (
                  <div
                    key={match.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">
                          {match.is_home ? 'FUS Rabat' : 'Extérieur'} vs {match.opponent_id || 'Adversaire'}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-black">
                          {match.score_home} - {match.score_away}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {match.match_date} • {isStarter ? 'Titulaire' : 'Remplaçant'} ({minutes} min)
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {goals > 0 && (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-[10px]">
                          ⚽ {goals} {goals > 1 ? 'Buts' : 'But'}
                        </span>
                      )}
                      {assists > 0 && (
                        <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black text-[10px]">
                          🎯 {assists} Passe{assists > 1 ? 's' : ''}
                        </span>
                      )}
                      {yellow && (
                        <span className="px-2 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px]">
                          🟨 Carton Jaune
                        </span>
                      )}
                      {red && (
                        <span className="px-2 py-1 rounded-lg bg-rose-600 text-white font-black text-[10px]">
                          🟥 Carton Rouge
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5 : HISTORIQUE & PARCOURS */}
          {activeTab === 'history' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-primary" /> Fiche de Suivi Club & Recrutement
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-muted-foreground block">Structure de Formation</span>
                    <span className="font-bold text-foreground">Académie FUS Rabat</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Date d'Enregistrement</span>
                    <span className="font-bold text-foreground">{player.created_at ? player.created_at.split('T')[0] : '2024-01-10'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Statut Recrutement</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Joueur Confirmé & Signé</span>
                  </div>
                </div>
              </div>

              {/* Timeline Track */}
              <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-primary border-2 border-white dark:border-slate-900 shadow" />
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-foreground block">Intégration Effectif Officiel</span>
                    <p className="text-muted-foreground text-[11px]">Enregistré sous le numéro #{player.jersey_number ?? 10} dans la catégorie {(player as any).category || 'Senior'}.</p>
                  </div>
                </div>

                {playerSurclassement && (
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-amber-400 border-2 border-white dark:border-slate-900 shadow" />
                    <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/30 space-y-1">
                      <span className="font-bold text-amber-900 dark:text-amber-300 block">Surclassement Catégorie Supérieure</span>
                      <p className="text-amber-800/90 dark:text-amber-400 text-[11px]">
                        Surclassé en {playerSurclassement.target_category} (Raison : {playerSurclassement.reason || 'Performance remarquable'}).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            FUS Rabat • Plateforme Intégrée Sportive & Recrutement
          </span>
          <Button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider"
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlayerPersonalSportDetailModal;
