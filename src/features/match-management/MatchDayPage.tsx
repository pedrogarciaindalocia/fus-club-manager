import React, { useState, useMemo, useEffect } from 'react';
import { useClubData } from '../../hooks/useClubData';
import { useMatches } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useStaff } from '../../hooks/useStaff';
import { useCompetitions } from '../../hooks/useCompetitions';
import { useTouchDragAndDrop } from '../../hooks/useTouchDragAndDrop';
import { FusLogoLoader } from '../../components/ui/FusLogoLoader';
import { usePermissions } from '../../context/PermissionsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import {
  Calendar, Users, Briefcase,
  Shield, Star, Layout,
  ChevronRight, CheckCircle2, Timer, Target,
  FileDown, LayoutGrid, Save, ChevronLeft,
  Settings, Clock, MapPin, Search, Filter, Loader2 as LucideLoader, Eye, Radio
} from 'lucide-react';
import { toast } from 'sonner';
import LiveTracking from './LiveTracking';
import type { Match, Player } from '../../types';
import { getFusAcademyStadium } from '../../utils/stadiumHelpers';

import {
  FORMATIONS_BY_FORMAT,
  ALL_FORMATION_ROLES,
  getFormationPositions,
  inferMatchFormat
} from './tacticalFormations';
import { classifyPosition } from './ScheduleMatchWizard';

const FORMATIONS = FORMATIONS_BY_FORMAT[11];

const POSITION_GROUPS = [
  { label: 'Gardiens',   category: 'Gardiens' as const },
  { label: 'Défenseurs', category: 'Défenseurs' as const },
  { label: 'Milieux',    category: 'Milieux' as const },
  { label: 'Attaquants', category: 'Attaquants' as const }
];

type PrepStep = 'setup' | 'staff' | 'lineup' | 'opponent';

const STEPS: { key: PrepStep; label: string; icon: React.ElementType }[] = [
  { key: 'setup',    label: 'Setup',    icon: Settings },
  { key: 'staff',    label: 'Staff',    icon: Briefcase },
  { key: 'lineup',   label: 'My Club',  icon: Users },
  { key: 'opponent', label: 'Opponent', icon: Target },
];

const MatchDayPage: React.FC = () => {
  const { mainClub, opponentClubs, isLoading: clubLoading } = useClubData();
  const { matches, updateMatch, saveLineup, saveStaff, isLoading: matchesLoading } = useMatches();
  const { players, isLoading: playersLoading } = usePlayers();
  const { staff, isLoading: staffLoading } = useStaff();
  const { stadiums, isLoading: compLoading } = useCompetitions();
  
  const isLoading = clubLoading || matchesLoading || playersLoading || staffLoading || compLoading;
  const { can } = usePermissions();

  const today = new Date().toISOString().split('T')[0];
  const todayMatches = matches.filter(m => m.match_date === today);

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<PrepStep>('setup');
  const [saving, setSaving] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const match = matches.find(m => m.id === selectedMatchId);
  const [formData, setFormData] = useState<Partial<Match>>({});

  // Auto-select today's live/scheduled match and open live tracking
  useEffect(() => {
    if (isLoading || selectedMatchId) return;
    const liveMatch = todayMatches.find(m => m.status === 'live');
    const scheduledMatch = todayMatches.find(m => m.status === 'scheduled');
    const target = liveMatch || scheduledMatch;
    if (target) {
      setSelectedMatchId(target.id);
      const isTargetLeague = Boolean(
        target.league_id &&
        (target as any).match_type !== 'amical' &&
        (target as any).match_type !== 'internal_scrimmage' &&
        !target.notes?.includes('[Opposition Interne]') &&
        !target.category?.toLowerCase().includes('amical')
      );
      const targetRoundName = isTargetLeague
        ? ((target as any).round_name || (target.lineup as any)?.round_name || 'Journée 1')
        : '';
      setFormData({
        ...target,
        round_name: targetRoundName,
        lineup: target.lineup ? { ...target.lineup, round_name: targetRoundName } : { startingXI: Array(11).fill(''), substitutes: [], formation: target.formation || '4-3-3', round_name: targetRoundName },
        staff_ids: target.staff_ids || [],
        opponent_formation: target.opponent_formation || '4-4-2'
      });
      if (liveMatch) setShowLive(true);
    }
  }, [isLoading, todayMatches.length]);

  useEffect(() => {
    if (stadiums.length > 0 && formData.is_home && !formData.stadium_id) {
      const fusStadium = getFusAcademyStadium(stadiums, mainClub?.id);
      if (fusStadium) {
        setFormData(prev => ({ ...prev, stadium_id: fusStadium.id }));
      }
    }
  }, [stadiums, formData.is_home, formData.stadium_id, mainClub?.id]);

  useEffect(() => {
    if (formData.lineup) {
      const sxi = [...(formData.lineup.startingXI || [])];
      while (sxi.length < 11) sxi.push('');
      if (sxi.length > 11) sxi.length = 11;
      
      const lineupMatch = JSON.stringify(sxi) === JSON.stringify(formData.lineup.startingXI);
      if (!lineupMatch) {
         setFormData(prev => ({
            ...prev,
            lineup: { ...prev.lineup!, startingXI: sxi }
         }));
      }
    }
  }, [formData.lineup]);

  const selectMatch = (id: string) => {
    const m = matches.find(x => x.id === id);
    if (!m) return;
    setSelectedMatchId(id);
    const isMatchLeague = Boolean(
      m.league_id &&
      (m as any).match_type !== 'amical' &&
      (m as any).match_type !== 'internal_scrimmage' &&
      !m.notes?.includes('[Opposition Interne]') &&
      !m.category?.toLowerCase().includes('amical')
    );
    const targetRoundName = isMatchLeague
      ? ((m as any).round_name || (m.lineup as any)?.round_name || 'Journée 1')
      : '';
    setFormData({
      ...m,
      round_name: targetRoundName,
      lineup: m.lineup ? { ...m.lineup, round_name: targetRoundName } : { startingXI: Array(11).fill(''), substitutes: [], formation: m.formation || '4-3-3', round_name: targetRoundName },
      staff_ids: m.staff_ids || [],
      opponent_formation: m.opponent_formation || '4-4-2'
    });
    setCurrentStep('setup');
    setShowLive(false);
  };

  const updateField = (field: keyof Match, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!match) return;
    setSaving(true);
    try {
      const { lineup, staff_ids, opponent_formation, ...rest } = formData;
      const isMatchLeague = Boolean(
        (formData.league_id || match.league_id) &&
        (formData as any).match_type !== 'amical' &&
        (formData as any).match_type !== 'internal_scrimmage' &&
        match.match_type !== 'amical' &&
        match.match_type !== 'internal_scrimmage' &&
        !match.notes?.includes('[Opposition Interne]') &&
        !match.category?.toLowerCase().includes('amical')
      );
      const targetRoundName = isMatchLeague
        ? ((formData as any).round_name || (lineup as any)?.round_name || 'Journée 1')
        : null;
      const updatedLineup = {
        ...(lineup || {}),
        round_name: targetRoundName,
      };
      await updateMatch({ 
        id: match.id, 
        data: {
          ...rest, 
          round_name: targetRoundName,
          opponent_formation: opponent_formation || '4-4-2',
          formation: lineup?.formation || '4-3-3',
          lineup: updatedLineup,
          staff_ids
        }
      });
      setSelectedMatchId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleStaff = (id: string) => {
    const currentIds = formData.staff_ids || [];
    setFormData({
      ...formData,
      staff_ids: currentIds.includes(id) ? currentIds.filter(sid => sid !== id) : [...currentIds, id]
    });
  };

  const toggleLineupPlayer = (player: Player) => {
    const currentLineup = formData.lineup!;
    const startingXI = [...(currentLineup.startingXI || [])];
    const substitutes = currentLineup.substitutes || [];

    const isStarter = startingXI.includes(player.id);
    const isSub = substitutes.includes(player.id);

    if (isStarter || isSub) {
      // Remove
      setFormData({
        ...formData,
        lineup: {
          ...currentLineup,
          startingXI: startingXI.map(id => id === player.id ? '' : id),
          substitutes: substitutes.filter(id => id !== player.id)
        }
      });
    } else {
      // Add logic
      const isGK = ['GK', 'G', 'GARDIEN'].includes(player.position?.toUpperCase() || '');
      
      if (isGK && startingXI[0] === '') {
        const nextXI = [...startingXI];
        nextXI[0] = player.id;
        setFormData({ ...formData, lineup: { ...currentLineup, startingXI: nextXI } });
      } else {
        const roles = getFormationPositions(currentLineup.formation);
        let placed = false;
        const nextXI = [...startingXI];
        
        const matchingSlot = roles.findIndex((r, idx) => 
          idx > 0 && r.label === player.position?.toUpperCase() && nextXI[idx] === ''
        );

        if (matchingSlot !== -1) {
           nextXI[matchingSlot] = player.id;
           setFormData({ ...formData, lineup: { ...currentLineup, startingXI: nextXI } });
           placed = true;
        } else {
           const emptySlot = nextXI.findIndex((id, idx) => idx > 0 && id === '');
           if (emptySlot !== -1) {
             nextXI[emptySlot] = player.id;
             setFormData({ ...formData, lineup: { ...currentLineup, startingXI: nextXI } });
             placed = true;
           }
        }

        if (!placed) {
          const filledStartersCount = startingXI.filter(id => id !== '').length;
          if (filledStartersCount >= 11) {
            setFormData({
              ...formData,
              lineup: { ...currentLineup, substitutes: [...substitutes, player.id] }
            });
          } else {
             const firstFree = nextXI.indexOf('');
             if (firstFree !== -1) {
                nextXI[firstFree] = player.id;
                setFormData({ ...formData, lineup: { ...currentLineup, startingXI: nextXI } });
             }
          }
        }
      }
    }
  };

  const handleSwap = (draggedPlayerId: string, slotIndex: number) => {
    const currentLineup = formData.lineup!;
    const nextXI = [...(currentLineup.startingXI || [])];
    const oldIndex = nextXI.indexOf(draggedPlayerId);
    
    if (oldIndex !== -1) {
      const playerAtTarget = nextXI[slotIndex];
      nextXI[slotIndex] = draggedPlayerId;
      nextXI[oldIndex] = playerAtTarget;
    } else if (currentLineup.substitutes.includes(draggedPlayerId)) {
      const playerAtTarget = nextXI[slotIndex];
      nextXI[slotIndex] = draggedPlayerId;
      
      let nextSubs = currentLineup.substitutes.filter(id => id !== draggedPlayerId);
      if (playerAtTarget) nextSubs.push(playerAtTarget);
      
      setFormData({
        ...formData,
        lineup: { ...currentLineup, startingXI: nextXI, substitutes: nextSubs }
      });
      return;
    }
    setFormData({ ...formData, lineup: { ...currentLineup, startingXI: nextXI } });
  };

  const goNext = () => {
    const stepIndex = STEPS.findIndex(s => s.key === currentStep);
    if (stepIndex < STEPS.length - 1) setCurrentStep(STEPS[stepIndex + 1].key);
  };

  const goPrev = () => {
    const stepIndex = STEPS.findIndex(s => s.key === currentStep);
    if (stepIndex > 0) setCurrentStep(STEPS[stepIndex - 1].key);
    else setSelectedMatchId(null);
  };

  const getPlayerById = (id: string) => players.find(p => p.id === id);
  const getOpponent = (id: string) => opponentClubs.find(c => c.id === id);
  
  const stepIndex = STEPS.findIndex(s => s.key === currentStep);
  const currentLineup = formData.lineup || { startingXI: Array(11).fill(''), substitutes: [], formation: '4-3-3' };
  const positions = getFormationPositions(currentLineup.formation);

  const matchPlayers = useMemo(() => {
    if (!match) return [];
    return players
      .filter(p => p.category === match.category || !match.category)
      .filter(p => p.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => (a.jersey_number || 0) - (b.jersey_number || 0));
  }, [players, match, searchQuery]);

  const groupedPlayers = useMemo(() => {
    const map: Record<'Gardiens' | 'Défenseurs' | 'Milieux' | 'Attaquants', Player[]> = {
      Gardiens: [],
      Défenseurs: [],
      Milieux: [],
      Attaquants: []
    };

    matchPlayers.forEach(p => {
      const cat = classifyPosition(p.position);
      map[cat].push(p);
    });

    return POSITION_GROUPS.map(group => ({
      ...group,
      players: map[group.category] || []
    })).filter(g => g.players.length > 0);
  }, [matchPlayers]);

  if (isLoading) {
    return <FusLogoLoader fullPage size="lg" label="Chargement du Match Day…" />;
  }

  return (
    <>
    <div className="space-y-8 pb-10 print:hidden">
        {showLive && selectedMatchId ? (
          <div key="live">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="icon" onClick={() => setShowLive(false)} className="rounded-2xl bg-secondary/50">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </Button>
              <h3 className="text-xl font-black uppercase tracking-tight italic">Live Terminal</h3>
            </div>
            <LiveTracking matchId={selectedMatchId} />
          </div>
        ) : selectedMatchId && match ? (
          <div key="config" className="space-y-8">             <div className="relative bg-gradient-to-r from-slate-900 via-primary to-blue-900 rounded-[3rem] px-10 py-6 text-white overflow-hidden shadow-2xl border-b-[8px] border-primary/20 flex items-center justify-between">
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '15px 15px' }} />
                
                <div className="relative z-10 flex items-center gap-6">
                   <Button variant="ghost" size="icon" onClick={() => setSelectedMatchId(null)} className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all">
                      <ChevronLeft className="w-6 h-6" />
                   </Button>
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-0.5">Configuration Match</p>
                      <h2 className="text-xl font-black uppercase italic tracking-tight leading-none truncate max-w-xs md:max-w-md">
                         vs {getOpponent(formData.opponent_id || '')?.name || 'Adversaire'}
                      </h2>
                   </div>
                </div>

                <div className="relative z-10 flex items-center gap-8">
                   <div className="hidden lg:flex items-center">
                    {STEPS.map((step, idx) => {
                        const Icon = step.icon;
                        const isActive = step.key === currentStep;
                        const isDone = idx < stepIndex;
                        return (
                           <React.Fragment key={step.key}>
                              <button onClick={() => setCurrentStep(step.key)} className="flex items-center gap-3 transition-all group">
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 shadow-lg ${isDone ? 'bg-emerald-400 text-white' : isActive ? 'bg-white text-primary scale-110 shadow-xl' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                 </div>
                                 {isActive && <span className="text-[9px] font-black uppercase tracking-widest text-white animate-in slide-in-from-left-2">{step.label}</span>}
                              </button>
                              {idx < STEPS.length - 1 && (
                                 <div className={`w-8 h-0.5 mx-3 rounded-full transition-all duration-700 ${idx < stepIndex ? 'bg-emerald-400' : 'bg-white/10'}`} />
                              )}
                           </React.Fragment>
                        );
                    })}
                   </div>
                   <div className="flex items-center gap-3 border-l border-white/10 pl-8">
                      <Button variant="ghost" onClick={() => window.print()} className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white text-white hover:text-primary transition-all font-bold text-[9px] uppercase tracking-widest gap-2">
                         <FileDown className="w-3.5 h-3.5" /> Export
                      </Button>
                   </div>
                </div>
             </div>


             <div className="bg-white rounded-[3.5rem] border shadow-2xl overflow-hidden min-h-[700px] flex flex-col">
                   {currentStep === 'setup' && (
                     <div key="setup" className="p-10 space-y-12">
                        <SectionTitle icon={<Settings className="w-5 h-5 text-primary" />} title="Réglages de Match" subtitle="Ajustez les détails de la rencontre pour aujourd'hui" />
                        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                           {/* PILIER 2 (US-DASH-146 & US-DASH-148) : Choix de la Journée UNIQUEMENT pour le Championnat Officiel */}
                           {(() => {
                             const isFormMatchLeague = Boolean(
                               (formData.league_id || match?.league_id) &&
                               (formData as any).match_type !== 'amical' &&
                               (formData as any).match_type !== 'internal_scrimmage' &&
                               match?.match_type !== 'amical' &&
                               match?.match_type !== 'internal_scrimmage' &&
                               !match?.notes?.includes('[Opposition Interne]') &&
                               !match?.category?.toLowerCase().includes('amical')
                             );

                             if (!isFormMatchLeague) {
                               return (
                                 <div className="md:col-span-2 p-4 rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-between shadow-2xs">
                                   <div className="flex items-center gap-2.5">
                                     <Trophy className="w-4 h-4 text-slate-500" />
                                     <div>
                                       <p className="text-xs font-black uppercase tracking-tight text-slate-800">
                                         {(formData as any).match_type === 'internal_scrimmage' || match?.match_type === 'internal_scrimmage' ? 'Opposition Interne' : 'Match Amical / Hors Championnat'}
                                       </p>
                                       <p className="text-[10px] font-semibold text-slate-500">
                                         Rencontre amicale ou interne
                                       </p>
                                     </div>
                                   </div>
                                   <span className="text-[10px] font-black uppercase text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                                     Pas de Journée de Championnat
                                   </span>
                                 </div>
                               );
                             }

                             return (
                               <div className="md:col-span-2 p-5 rounded-3xl bg-slate-50 border-2 border-primary/25 shadow-xs space-y-3">
                                 <div className="flex items-center justify-between">
                                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                                     <Calendar className="w-4 h-4 text-primary" /> Journée de Championnat Officiel
                                     <span className="text-[8px] font-black uppercase tracking-wider bg-red-100 text-[#FF3737] px-2 py-0.5 rounded-full border border-red-200">
                                       Paramètre Primordial
                                     </span>
                                   </label>
                                   <span className="text-[11px] font-black uppercase text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                                     {(formData as any).round_name || (formData.lineup as any)?.round_name || 'Journée 1'}
                                   </span>
                                 </div>

                                 {/* Raccourcis rapides J1 à J15 */}
                                 <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
                                   {Array.from({ length: 15 }, (_, i) => i + 1).map(jNum => {
                                     const val = `Journée ${jNum}`;
                                     const currentVal = (formData as any).round_name || (formData.lineup as any)?.round_name;
                                     const isSel = currentVal === val;
                                     return (
                                       <button
                                         key={jNum}
                                         type="button"
                                         onClick={() => {
                                           setFormData(prev => ({
                                             ...prev,
                                             round_name: val,
                                             lineup: { ...(prev.lineup || {}), round_name: val } as any,
                                           }));
                                         }}
                                         className={`h-8 rounded-xl text-[11px] font-black transition-all border ${
                                           isSel
                                             ? 'bg-primary text-white border-primary shadow-md scale-105'
                                             : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                         }`}
                                       >
                                         J{jNum}
                                       </button>
                                     );
                                   })}
                                 </div>

                                 {/* Sélecteur J1 à J38 + Tournois + Champ libre */}
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                   <select
                                     className="w-full h-11 rounded-xl bg-white border border-slate-200 px-3 font-black text-xs text-slate-800 outline-none focus:ring-2 ring-primary/20 cursor-pointer"
                                     value={(formData as any).round_name || (formData.lineup as any)?.round_name || 'Journée 1'}
                                     onChange={e => {
                                       const val = e.target.value;
                                       setFormData(prev => ({
                                         ...prev,
                                         round_name: val,
                                         lineup: { ...(prev.lineup || {}), round_name: val } as any,
                                       }));
                                     }}
                                   >
                                     {Array.from({ length: 38 }, (_, i) => `Journée ${i + 1}`).map(rName => (
                                       <option key={rName} value={rName}>{rName}</option>
                                     ))}
                                     <option value="Match de Coupe">Match de Coupe</option>
                                     <option value="Tour préliminaire">Tour préliminaire</option>
                                     <option value="16ème de finale">16ème de finale</option>
                                     <option value="8ème de finale">8ème de finale</option>
                                     <option value="Quart de finale">Quart de finale</option>
                                     <option value="Demi-finale">Demi-finale</option>
                                     <option value="Finale">Finale</option>
                                   </select>
                                   <input
                                     type="text"
                                     placeholder="Intitulé libre (ex: J4 - Match en retard)..."
                                     value={(formData as any).round_name || ''}
                                     onChange={e => {
                                       const val = e.target.value;
                                       setFormData(prev => ({
                                         ...prev,
                                         round_name: val,
                                         lineup: { ...(prev.lineup || {}), round_name: val } as any,
                                       }));
                                     }}
                                     className="w-full h-11 rounded-xl bg-white border border-slate-200 px-3 font-bold text-xs text-slate-800 outline-none focus:ring-2 ring-primary/20"
                                   />
                                 </div>
                               </div>
                             );
                           })()}

                           <div className="space-y-6">
                              <div className="space-y-3">
                                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-primary" /> Date</label>
                                 <input type="date" value={formData.match_date} onChange={(e) => updateField('match_date', e.target.value)} className="w-full h-14 px-6 rounded-2xl bg-secondary/30 border-2 border-transparent focus:border-primary font-bold transition-all shadow-sm" />
                              </div>
                              <div className="space-y-3">
                                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-primary" /> Coup d'envoi</label>
                                 <input type="time" value={formData.match_time} onChange={(e) => updateField('match_time', e.target.value)} className="w-full h-14 px-6 rounded-2xl bg-secondary/30 border-2 border-transparent focus:border-primary font-bold transition-all shadow-sm" />
                              </div>
                           </div>
                           <div className="space-y-6">
                              <div className="space-y-3">
                                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-primary" /> Adversaire</label>
                                 <select value={formData.opponent_id || ''} onChange={(e) => updateField('opponent_id', e.target.value)} className="w-full h-14 px-8 rounded-2xl bg-secondary/30 border-2 border-transparent focus:border-primary font-bold transition-all appearance-none shadow-sm">
                                    <option value="" disabled>Sélectionner un adversaire</option>
                                    {opponentClubs.map(c => {
                                      const cNorm = (c.name || '').toUpperCase().trim();
                                      const sNorm = ((c as any).short_name || '').toUpperCase().trim();
                                      const label =
                                        cNorm === 'AMF' || sNorm === 'AMF'
                                          ? 'AMF — Académie Mohammed VI'
                                          : cNorm === 'AAMF' || sNorm === 'AAMF'
                                          ? 'AAMF — Association AMF'
                                          : c.name;
                                      return <option key={c.id} value={c.id}>{label}</option>;
                                    })}
                                 </select>
                              </div>
                              <div className="space-y-3">
                                 <div className="flex items-center justify-between">
                                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                     <MapPin className="w-3.5 h-3.5 text-primary" /> Stade
                                   </label>
                                   {formData.is_home && (
                                     <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                       🏟️ {getFusAcademyStadium(stadiums, mainClub?.id)?.name || 'FUS ACADEMY'} (Auto Domicile)
                                     </span>
                                   )}
                                 </div>
                                  <select value={formData.stadium_id || ''} onChange={(e) => updateField('stadium_id', e.target.value)} className="w-full h-14 px-8 rounded-2xl bg-secondary/30 border-2 border-transparent focus:border-primary font-bold appearance-none shadow-sm">
                                    <option value="">Sélectionner un stade</option>
                                    {stadiums.map(v => <option key={v.id} value={v.id}>{v.name} ({v.city})</option>)}
                                 </select>

                                 {/* Raccourcis Terrains 1 à 4 à Domicile */}
                                 {formData.is_home && (
                                   <div className="grid grid-cols-4 gap-2 pt-1">
                                     {['1', '2', '3', '4'].map(n => {
                                       const fusStadium = getFusAcademyStadium(stadiums, mainClub?.id);
                                       const pitchLabel = `Terrain ${n}`;
                                       const isPitchSel = Boolean((formData.notes && formData.notes.includes(pitchLabel)) || (formData.lineup as any)?.pitch_number === n);
                                       return (
                                         <button
                                           key={n}
                                           type="button"
                                           onClick={() => {
                                             const sName = fusStadium?.name || 'FUS ACADEMY';
                                             setFormData(prev => ({
                                               ...prev,
                                               stadium_id: fusStadium?.id || prev.stadium_id || '',
                                               lineup: { ...(prev.lineup || {}), pitch_number: isPitchSel ? null : n } as any,
                                               notes: isPitchSel ? (prev.notes || '').replace(new RegExp(`\\s*—?\\s*${pitchLabel}`), '') : `${sName} — ${pitchLabel}`,
                                             }));
                                           }}
                                           className={`h-10 rounded-xl text-xs font-black transition-all border ${
                                             isPitchSel
                                               ? 'bg-primary text-white border-primary shadow-md scale-105'
                                               : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                           }`}
                                         >
                                           Terrain {n}
                                         </button>
                                       );
                                     })}
                                   </div>
                                 )}
                              </div>
                           </div>
                           <div className="md:col-span-2 pt-6">
                              <div className="flex bg-secondary/30 p-2 rounded-[2.5rem] border-2 border-secondary shadow-inner">
                                  <button
                                     onClick={() => {
                                       if (!formData.is_home) {
                                         const fusStadium = getFusAcademyStadium(stadiums, mainClub?.id);
                                         setFormData(prev => ({
                                           ...prev,
                                           is_home: true,
                                           stadium_id: fusStadium?.id || prev.stadium_id || '',
                                           score_home: prev.score_away ?? 0,
                                           score_away: prev.score_home ?? 0
                                         }));
                                       }
                                     }}
                                     className={`flex-1 h-14 rounded-[2rem] font-black uppercase text-[10px] tracking-widest transition-all ${formData.is_home ? 'bg-primary text-white shadow-xl scale-105' : 'text-muted-foreground hover:bg-white/50'}`}
                                  >
                                     Domicile
                                  </button>
                                 <button
                                     onClick={() => {
                                       if (formData.is_home) {
                                         setFormData(prev => ({
                                           ...prev,
                                           is_home: false,
                                           stadium_id: '',
                                           score_home: prev.score_away ?? 0,
                                           score_away: prev.score_home ?? 0
                                         }));
                                       }
                                     }}
                                     className={`flex-1 h-14 rounded-[2rem] font-black uppercase text-[10px] tracking-widest transition-all ${!formData.is_home ? 'bg-slate-900 text-white shadow-xl scale-105' : 'text-muted-foreground hover:bg-white/50'}`}
                                 >
                                     Extérieur
                                 </button>
                              </div>
                           </div>
                        </div>
                     </div>
                   )}

                   {currentStep === 'staff' && (
                      <div key="staff" className="p-10 space-y-8 flex-1">
                         <SectionTitle icon={<Briefcase className="w-5 h-5 text-primary" />} title="Gestion du Staff" subtitle="Désignez les membres du staff présents sur le banc" />
                         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {staff.map(s => {
                               const isSelected = (formData.staff_ids || []).includes(s.id);
                               return (
                                  <motion.button key={s.id} onClick={() => toggleStaff(s.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`p-6 rounded-[3rem] border-2 transition-all relative overflow-hidden group ${isSelected ? 'border-primary bg-primary/5 shadow-2xl' : 'border-secondary bg-white hover:border-primary/20'}`}>
                                     <div className={`w-18 h-18 rounded-[1.5rem] mx-auto mb-4 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center transition-all ${isSelected ? 'bg-primary' : 'bg-secondary'}`}>
                                        <img src={(s.photo_url && s.photo_url !== 'null') ? s.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(s.full_name)}&background=random&color=fff&size=200`} className="w-full h-full object-cover" />
                                     </div>
                                     <p className="font-black text-[12px] uppercase tracking-tighter truncate text-center">{s.full_name}</p>
                                     <p className="text-[9px] text-muted-foreground uppercase text-center mt-1 font-bold">{s.role}</p>
                                     {isSelected && <div className="absolute top-4 right-4 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white"><CheckCircle2 className="w-4 h-4 text-white" /></div>}
                                  </motion.button>
                               );
                            })}
                         </div>
                      </div>
                   )}

                   {currentStep === 'lineup' && (
                      <div key="lineup" className="p-8 flex-1">
                         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                            <div className="lg:col-span-4 space-y-6 flex flex-col h-full">
                               <div className="bg-secondary/10 p-6 rounded-[2.5rem] border border-secondary/50 shadow-inner">
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 flex items-center justify-between">
                                     <span>Système Tactique</span>
                                     <Badge variant="outline" className="text-[8px] bg-white">{currentLineup.formation}</Badge>
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                     {FORMATIONS.map(f => (
                                         <button key={f} onClick={() => updateField('lineup', {...currentLineup, formation: f})} className={`h-10 px-4 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${currentLineup.formation === f ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-white border-secondary text-muted-foreground hover:border-primary/20'}`}>{f}</button>
                                     ))}
                                  </div>
                               </div>

                               <div className="flex-1 flex flex-col min-h-0 bg-white border-2 border-secondary/20 rounded-[3rem] p-6 shadow-sm overflow-hidden">
                                  <div className="relative mb-6">
                                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-30" />
                                     <input 
                                       type="text" 
                                       placeholder="Rechercher joueur..." 
                                       value={searchQuery}
                                       onChange={(e) => setSearchQuery(e.target.value)}
                                       className="w-full h-11 pl-12 pr-4 rounded-2xl bg-secondary/20 border-none font-bold text-xs"
                                     />
                                  </div>

                                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
                                     {groupedPlayers.map(group => (
                                        <div key={group.label} className="space-y-3">
                                           <div className="flex items-center gap-3 px-3">
                                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                              <h5 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{group.label}</h5>
                                              <div className="flex-1 h-px bg-secondary" />
                                           </div>
                                           <div className="space-y-2">
                                             {group.players.map(p => {
                                                const isStarter = currentLineup.startingXI.includes(p.id);
                                                const isSub = currentLineup.substitutes.includes(p.id);
                                                return (
                                                   <motion.div 
                                                     key={p.id} 
                                                     layout
                                                     draggable 
                                                     onDragStart={(e) => { e.dataTransfer.setData('playerId', p.id); }}
                                                     className={`group p-3 rounded-[2rem] border-2 transition-all flex items-center gap-4 cursor-grab active:cursor-grabbing ${isStarter ? 'border-primary bg-primary/5 shadow-md' : isSub ? 'border-emerald-400 bg-emerald-50/20' : 'border-secondary bg-white hover:border-black/5'}`}
                                                   >
                                                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-black text-xs overflow-hidden border-2 border-white shadow-sm">
                                                         <img src={(p.photo_url && p.photo_url !== 'null') ? p.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=random&color=fff&size=200`} className="w-full h-full object-cover" />
                                                      </div>
                                                      <div className="flex-1 min-w-0">
                                                         <p className="font-black text-[11px] uppercase truncate">{p.full_name}</p>
                                                         <p className="text-[8px] font-bold text-muted-foreground opacity-60">#{p.jersey_number} • {p.position}</p>
                                                      </div>
                                                      <div className="flex gap-1">
                                                         <button onClick={() => toggleLineupPlayer(p)} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${ (isStarter || isSub) ? 'bg-primary text-white shadow-lg' : 'bg-secondary text-muted-foreground group-hover:bg-primary/10'}`}>
                                                            {(isStarter || isSub) ? <CheckCircle2 className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                                                         </button>
                                                      </div>
                                                   </motion.div>
                                                );
                                             })}
                                           </div>
                                        </div>
                                     ))}
                                  </div>
                               </div>
                            </div>

                            <div className="lg:col-span-8 flex flex-col items-center">
                               <div className="w-full flex justify-between items-center mb-6 px-10">
                                  <div className="flex items-center gap-4">
                                     <Badge className="bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-[10px]">Starters: {currentLineup.startingXI.filter(id => id !== '').length}/11</Badge>
                                     <Badge className="bg-blue-500 text-white font-black px-4 py-2 rounded-xl text-[10px]">Subs: {currentLineup.substitutes.length}</Badge>
                                  </div>
                                  <div className="flex items-center gap-2 opacity-30 italic text-[10px] font-bold uppercase">
                                     <Filter className="w-3.5 h-3.5" /> Glisser pour ajuster
                                  </div>
                               </div>
                               <Pitch positions={positions} startingXI={currentLineup.startingXI} getPlayerById={getPlayerById} onDropPlayer={handleSwap} />
                               
                               <div className="w-full mt-8 bg-secondary/10 p-6 rounded-[3rem] border-2 border-dashed border-secondary/50">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 px-4 flex items-center gap-2"><Layout className="w-3.5 h-3.5" /> Banc de touche</p>
                                  <div className="flex flex-wrap gap-3">
                                     {currentLineup.substitutes.map(sid => {
                                        const p = getPlayerById(sid);
                                        if (!p) return null;
                                        return (
                                           <motion.div 
                                             key={sid}
                                             draggable
                                             onDragStart={(e) => { e.dataTransfer.setData('playerId', sid); }}
                                             className="flex items-center gap-3 bg-white p-2 pr-5 rounded-2xl border-2 border-emerald-400 shadow-sm cursor-grab active:cursor-grabbing hover:scale-105"
                                           >
                                              <div className="w-8 h-8 rounded-lg bg-secondary overflow-hidden border border-secondary shadow-inner">
                                                 <img src={(p.photo_url && p.photo_url !== 'null') ? p.photo_url : `https://i.pravatar.cc/300?u=${p.id}`} className="w-full h-full object-cover" />
                                              </div>
                                              <span className="text-[10px] font-black uppercase truncate max-w-[100px]">{p.full_name.split(' ').pop()}</span>
                                           </motion.div>
                                        );
                                     })}
                                     {currentLineup.substitutes.length === 0 && <p className="text-[10px] italic text-muted-foreground/40 px-4">Aucun remplaçant</p>}
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                   )}

                   {currentStep === 'opponent' && (
                     <div key="opponent" className="p-10 space-y-8 flex-1">
                        <SectionTitle icon={<Target className="w-5 h-5 text-primary" />} title="Tactique Adverse" subtitle="Modélisez le bloc adverse pour préparer la réponse tactique" />
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                           <div className="lg:col-span-4 space-y-6">
                              <div className="bg-white rounded-[4rem] border-2 border-secondary p-12 space-y-10 shadow-2xl relative overflow-hidden group">
                                 <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-all duration-700" />
                                 <div className="w-24 h-24 bg-secondary/50 rounded-[2.5rem] flex items-center justify-center p-6 border-2 border-white mx-auto shadow-2xl ring-8 ring-secondary/10 relative z-10 transition-transform group-hover:scale-110">
                                    {getOpponent(formData.opponent_id || '')?.logo_url ? <img src={getOpponent(formData.opponent_id || '')?.logo_url || ''} className="w-14 h-14 object-contain shadow-2xl" /> : <Shield className="w-12 h-12 text-muted-foreground opacity-20" />}
                                 </div>
                                 <div className="text-center relative z-10">
                                    <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none">{getOpponent(formData.opponent_id || '')?.name || 'Adversaire'}</h3>
                                    <Badge variant="outline" className="mt-3 text-[9px] border-primary/20 opacity-50 uppercase tracking-[0.3em]">Away Team Tactics</Badge>
                                 </div>
                                 <div className="grid grid-cols-2 gap-3 relative z-10">
                                    {FORMATIONS.map(f => (
                                       <button key={f} onClick={() => updateField('opponent_formation', f)} className={`h-14 rounded-[1.5rem] text-[11px] font-black border-2 transition-all ${formData.opponent_formation === f ? 'bg-primary text-white border-primary shadow-xl scale-105' : 'bg-secondary/30 border-transparent text-muted-foreground hover:border-primary/20 hover:bg-white'}`}>{f}</button>
                                    ))}
                                 </div>
                              </div>
                           </div>
                           <div className="lg:col-span-8 flex justify-center items-start">
                              <Pitch positions={getFormationPositions(formData.opponent_formation || '4-4-2')} isOpponent />
                           </div>
                        </div>
                     </div>
                   )}

                <div className="p-10 border-t bg-secondary/10 flex items-center justify-between mt-auto">
                   <Button variant="ghost" onClick={goPrev} className="h-16 px-10 rounded-[2rem] font-black uppercase tracking-widest text-[11px] gap-3 hover:bg-white transition-all shadow-sm">
                      <ChevronLeft className="w-5 h-5" /> {stepIndex === 0 ? 'Dashboard' : 'Précédent'}
                   </Button>
                   <div className="flex items-center gap-4">
                      {STEPS.map((s, i) => (
                        <div key={s.key} className={`rounded-full transition-all duration-700 ${s.key === currentStep ? 'w-12 h-3 bg-primary shadow-xl' : i < stepIndex ? 'w-3 h-3 bg-primary/40' : 'w-3 h-3 bg-secondary'}`} />
                      ))}
                   </div>
                   <div className="flex items-center gap-4">
                      {can('track_live_match') && (
                        <Button onClick={() => setShowLive(true)} variant="outline" className="h-16 px-10 rounded-[2rem] border-emerald-500/30 text-emerald-600 font-black uppercase tracking-widest text-[11px] hover:bg-emerald-50 gap-4 shadow-sm">
                           <Timer className="w-5 h-5 animate-pulse" /> Live Tracking
                        </Button>
                      )}
                      
                      {currentStep === 'opponent' ? (
                         can('edit_matches') && (
                           <Button onClick={handleSave} disabled={saving} className="h-16 px-14 rounded-[2.2rem] bg-slate-950 hover:bg-black text-white transition-all font-black uppercase tracking-widest text-[11px] gap-5 shadow-2xl active:scale-95 group">
                              {saving ? <LucideLoader className="w-5 h-5 animate-spin" /> : <Save className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />}
                              {saving ? 'Transmission...' : 'Enregistrer'}
                           </Button>
                         )
                      ) : (
                         <Button onClick={goNext} className="h-16 px-14 rounded-[2.2rem] bg-primary hover:bg-slate-900 transition-all font-black uppercase tracking-widest text-[11px] gap-5 shadow-2xl group hover:scale-105 active:scale-95">
                            Suivant <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                         </Button>
                      )}
                   </div>
                </div>
             </div>
          </div>
        ) : (
          <div key="dashboard" className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-10">
                <div className="w-24 h-24 bg-primary/10 rounded-[3rem] flex items-center justify-center p-6 border-2 border-primary/20 shadow-2xl ring-[12px] ring-primary/5">
                  <Calendar className="w-12 h-12 text-primary" />
                </div>
                <div>
                  <h1 className="text-6xl font-black italic uppercase tracking-tighter text-foreground leading-none">
                     Match Center
                  </h1>
                  <p className="text-[12px] font-black uppercase tracking-[0.5em] text-primary mt-4 flex items-center gap-4">
                    <span className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_15px_rgba(37,99,235,0.6)]" />
                    Today FIXTURES • {today}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                 <Button variant="outline" className="h-16 rounded-[2rem] px-10 border-secondary font-black uppercase tracking-widest text-[11px] gap-4 shadow-xl hover:bg-white" onClick={() => window.print()}>
                    <FileDown className="w-5 h-5 text-primary" /> Export PDF
                 </Button>
                 <Button className="h-16 rounded-[2.2rem] px-12 bg-primary hover:scale-105 transition-all shadow-2xl shadow-primary/20 font-black uppercase tracking-widest text-[11px] gap-5" onClick={() => setViewAll(!viewAll)}>
                    <LayoutGrid className="w-5 h-5" /> {viewAll ? 'Compact List' : 'Gallery Layout'}
                 </Button>
              </div>
            </div>

            {todayMatches.length === 0 ? (
               <div className="py-48 text-center bg-white/40 backdrop-blur-3xl border-4 border-dashed border-secondary/20 rounded-[5rem] space-y-8 shadow-inner">
                  <div className="w-32 h-32 bg-secondary/20 rounded-full mx-auto flex items-center justify-center">
                     <Calendar className="w-16 h-16 text-muted-foreground opacity-10" />
                  </div>
                  <p className="text-3xl font-black uppercase tracking-tight text-muted-foreground/30 italic">No official fixtures recorded for today</p>
               </div>
            ) : viewAll ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {todayMatches.map(m => {
                     const opp = getOpponent(m.opponent_id);
                     return (
                        <Card key={m.id} className="p-12 rounded-[5rem] border-2 border-secondary bg-white overflow-hidden relative group hover:border-primary transition-all duration-700 shadow-2xl hover:shadow-primary/10">
                           <div className="flex justify-between items-start mb-12">
                              <Badge className="bg-primary/10 text-primary border-none uppercase font-black text-[11px] tracking-widest px-6 py-2.5 rounded-2xl">{m.category}</Badge>
                              <div className="flex items-center gap-3 bg-secondary/40 px-5 py-2.5 rounded-2xl border border-secondary shadow-sm">
                                 <Timer className="w-4 h-4 text-primary" />
                                 <span className="text-[12px] font-black uppercase">{m.match_time}</span>
                              </div>
                           </div>
                           
                           <div className="flex items-center justify-between gap-8 mb-16 relative">
                              <div className="flex flex-col items-center gap-6 flex-1">
                                 <div className="w-28 h-28 bg-secondary/30 rounded-[3rem] flex items-center justify-center p-6 transition-all duration-1000 group-hover:scale-110 group-hover:rotate-12 border border-secondary shadow-2xl shadow-inner">
                                    {m.is_home ? (
                                      mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = 'https://ui-avatars.com/api/?name=Home&background=020617&color=fff&size=512')} /> : <Shield className="w-14 h-14 text-primary/20" />
                                    ) : (
                                      opp?.logo_url ? <img src={opp.logo_url} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(opp?.name || 'Away')}&background=020617&color=fff&size=512`)} /> : <Target className="w-14 h-14 text-muted-foreground/20" />
                                    )}
                                 </div>
                                 <p className="text-[13px] font-black uppercase text-center truncate w-full leading-none tracking-tight">{m.is_home ? (mainClub?.club_name || 'My Club') : opp?.name || 'Inconnu'}</p>
                              </div>
                              <div className="text-5xl font-black italic text-primary/5 select-none -mb-10 tracking-tighter">VS</div>
                              <div className="flex flex-col items-center gap-6 flex-1">
                                 <div className="w-28 h-28 bg-secondary/30 rounded-[3rem] flex items-center justify-center p-6 transition-all duration-1000 group-hover:scale-110 group-hover:-rotate-12 border border-secondary shadow-2xl shadow-inner">
                                    {!m.is_home ? (
                                      mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = 'https://ui-avatars.com/api/?name=Home&background=020617&color=fff&size=512')} /> : <Shield className="w-14 h-14 text-primary/20" />
                                    ) : (
                                      opp?.logo_url ? <img src={opp.logo_url} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(opp?.name || 'Away')}&background=020617&color=fff&size=512`)} /> : <Target className="w-14 h-14 text-muted-foreground/20" />
                                    )}
                                 </div>
                                 <p className="text-[13px] font-black uppercase text-center truncate w-full leading-none tracking-tight">{!m.is_home ? (mainClub?.club_name || 'My Club') : opp?.name || 'Inconnu'}</p>
                              </div>
                           </div>

                           {(can('edit_matches') || can('track_live_match')) && (
                             <Button onClick={() => selectMatch(m.id)} className="w-full h-20 rounded-[2.5rem] bg-secondary hover:bg-slate-950 text-foreground hover:text-white transition-all duration-700 font-black uppercase tracking-[0.2em] text-[12px] gap-5 shadow-xl hover:scale-105 active:scale-95">
                                CONFIG BOARD <ChevronRight className="w-6 h-6" />
                             </Button>
                           )}
                        </Card>
                     );
                  })}
               </div>
            ) : (
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  {todayMatches.map(m => {
                     const opp = getOpponent(m.opponent_id);
                     return (
                        <div key={m.id} className="lg:col-span-6 xl:col-span-4">
                           <Card onClick={() => selectMatch(m.id)} className="p-10 flex flex-col justify-center min-h-[160px] rounded-[4rem] border-2 border-secondary bg-white hover:border-primary transition-all duration-700 cursor-pointer shadow-2xl group hover:shadow-primary/5">
                              <div className="flex items-center gap-8">
                                 <div className={`flex items-center gap-2 shrink-0 ${!m.is_home ? 'flex-row-reverse' : ''}`}>
                                    <div className="w-20 h-20 bg-secondary/30 rounded-[2rem] flex items-center justify-center p-4 border border-secondary group-hover:rotate-12 transition-all duration-700 shadow-inner">
                                       {m.is_home ? (
                                         mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = 'https://ui-avatars.com/api/?name=Home&background=020617&color=fff&size=256')} /> : <Shield className="w-10 h-10 text-primary/20" />
                                       ) : (
                                         opp?.logo_url ? <img src={opp.logo_url} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(opp?.name || 'Away')}&background=020617&color=fff&size=256`)} /> : <Target className="w-10 h-10 text-muted-foreground/20" />
                                       )}
                                    </div>
                                    <div className="text-xl font-black italic opacity-10 px-3">VS</div>
                                    <div className="w-20 h-20 bg-secondary/30 rounded-[2rem] flex items-center justify-center p-4 border border-secondary group-hover:-rotate-12 transition-all duration-700 shadow-inner">
                                       {!m.is_home ? (
                                         mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = 'https://ui-avatars.com/api/?name=Home&background=020617&color=fff&size=256')} /> : <Shield className="w-10 h-10 text-primary/20" />
                                       ) : (
                                         opp?.logo_url ? <img src={opp.logo_url} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(opp?.name || 'Away')}&background=020617&color=fff&size=256`)} /> : <Target className="w-10 h-10 text-muted-foreground/20" />
                                       )}
                                    </div>
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-2xl tracking-tighter uppercase truncate leading-none mb-3">{m.is_home ? 'vs ' : 'at '}{opp?.name || 'Unknown'}</h4>
                                    <div className="flex items-center gap-4">
                                       <Badge className="bg-primary/5 text-primary border-none text-[10px] font-black px-4 py-1.5 uppercase rounded-xl tracking-widest">{m.category}</Badge>
                                       <span className="text-[11px] font-black text-muted-foreground uppercase opacity-60 tracking-widest">{m.match_time}</span>
                                    </div>
                                 </div>
                                 <div className="flex flex-col gap-2 relative z-20">
                                    { (m.status === 'finished' || m.status === 'ongoing') && (
                                       <button 
                                          onClick={(e) => { e.stopPropagation(); setSelectedMatchId(m.id); setShowLive(true); }}
                                          className="w-12 h-12 bg-secondary/50 rounded-[1.4rem] flex items-center justify-center transition-all duration-700 hover:bg-emerald-500 hover:text-white shadow-sm ring-8 ring-transparent hover:ring-emerald-500/10"
                                          title="View Match Details & Timeline"
                                       >
                                          <Eye className="w-5 h-5" />
                                       </button>
                                    )}
                                    <button 
                                       onClick={(e) => { e.stopPropagation(); selectMatch(m.id); }}
                                       className="w-12 h-12 bg-secondary/50 rounded-[1.4rem] flex items-center justify-center transition-all duration-700 hover:bg-primary hover:text-white shadow-sm ring-8 ring-transparent hover:ring-primary/10"
                                       title="Edit Match Setup"
                                    >
                                       <ChevronRight className="w-5 h-5" />
                                    </button>
                                 </div>
                              </div>
                           </Card>
                        </div>
                     );
                  })}
               </div>
            )}
          </div>
        )}
    </div>

    {/* MATCH SHEET PRINTABLE VIEW */}
    {selectedMatchId && match && (
       <div className="hidden print:block absolute inset-0 bg-white text-black p-10 font-sans z-[100]">
          <div className="flex items-start justify-between border-b-4 border-black pb-8 mb-8">
             <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-slate-100 p-2 rounded-2xl border-2 border-black flex items-center justify-center">
                   {mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-12 h-12" />}
                </div>
                <div>
                   <h1 className="text-4xl font-black uppercase tracking-tighter">Official Match Sheet</h1>
                   <p className="text-xl font-bold mt-2 uppercase">{mainClub?.club_name || 'FuscClub'} vs {getOpponent(formData.opponent_id || '')?.name || 'Adversaire'}</p>
                   <p className="text-sm font-medium mt-1">Category: {match.category} • Date: {formData.match_date} at {formData.match_time}</p>
                </div>
             </div>
             <div className="w-24 h-24 bg-slate-100 p-2 rounded-2xl border-2 border-black flex items-center justify-center">
                {getOpponent(formData.opponent_id || '')?.logo_url ? <img src={getOpponent(formData.opponent_id || '')?.logo_url!} className="w-full h-full object-contain" /> : <Target className="w-12 h-12" />}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-12">
             <div>
                <h3 className="text-2xl font-black uppercase border-b-2 border-black pb-2 mb-6">Starting XI - {currentLineup.formation}</h3>
                <table className="w-full text-left">
                   <thead>
                      <tr className="border-b-2 border-black">
                         <th className="py-2 text-sm uppercase">N°</th>
                         <th className="py-2 text-sm uppercase">Nom du Joueur</th>
                         <th className="py-2 text-sm uppercase text-right">Signature</th>
                      </tr>
                   </thead>
                   <tbody>
                      {currentLineup.startingXI.filter(id => id).map(pid => {
                         const player = getPlayerById(pid);
                         if (!player) return null;
                         return (
                            <tr key={pid} className="border-b border-gray-300">
                               <td className="py-4 font-black">{player.jersey_number}</td>
                               <td className="py-4 font-bold uppercase">{player.full_name}</td>
                               <td className="py-4 text-right">............................</td>
                            </tr>
                         )
                      })}
                   </tbody>
                </table>
             </div>

             <div>
                <h3 className="text-2xl font-black uppercase border-b-2 border-black pb-2 mb-6">Substitutes & Staff</h3>
                <h4 className="font-bold text-lg mb-4">Remplaçants</h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 border-b border-gray-300 pb-6 mb-6">
                   {currentLineup.substitutes.map(pid => {
                      const player = getPlayerById(pid);
                      if (!player) return null;
                      return <div key={pid} className="font-medium text-sm border p-2 rounded">{player.jersey_number} • {player.full_name}</div>
                   })}
                   {currentLineup.substitutes.length === 0 && <div className="text-gray-400 italic">Aucun remplaçant sélectionné</div>}
                </div>

                <h4 className="font-bold text-lg mb-4">Staff Technique</h4>
                <div className="space-y-4">
                   {(formData.staff_ids || []).map(sid => {
                      const s = staff.find(x => x.id === sid);
                      if (!s) return null;
                      return (
                         <div key={sid} className="flex justify-between items-center bg-gray-100 p-3 rounded font-bold text-sm">
                            <span className="uppercase">{s.full_name}</span>
                            <span className="text-gray-500">{s.role}</span>
                         </div>
                      )
                   })}
                   {(formData.staff_ids || []).length === 0 && <div className="text-gray-400 italic">Aucun staff déclaré</div>}
                </div>
             </div>
          </div>
       </div>
    )}
    </>
  );
};


const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
  <div className="flex items-center gap-6">
    <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex items-center justify-center shadow-inner shrink-0 border border-primary/5">{icon}</div>
    <div><h3 className="text-3xl font-black uppercase tracking-tighter italic leading-none">{title}</h3><p className="text-sm text-muted-foreground mt-2 font-medium">{subtitle}</p></div>
  </div>
);

const Pitch: React.FC<{ positions: { top: string; left: string; label: string }[]; startingXI?: string[]; getPlayerById?: (id: string) => any; isOpponent?: boolean; onDropPlayer?: (playerId: string, posIndex: number) => void }> = ({ positions, startingXI = [], getPlayerById, isOpponent, onDropPlayer }) => {
  const {
    isDragging,
    draggedItem,
    dragPosition,
    longPressProgress,
    pitchRef,
    isTouchDevice,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useTouchDragAndDrop({
    onDrop: (draggedId, targetIndex) => {
      if (onDropPlayer) onDropPlayer(draggedId, targetIndex);
    },
    longPressDuration: 600,
  });

  return (
    <div 
      ref={pitchRef}
      className="w-full max-w-[500px] bg-[#3fa375] aspect-[0.66] rounded-[4rem] shadow-2xl relative overflow-hidden ring-[16px] ring-white/5 border-[12px] border-[#52b788] group/pitch touch-none select-none"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-0 opacity-[0.25]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #52b788 0, #52b788 40px, #40916c 40px, #40916c 80px)' }} />
      <div className="absolute inset-6 border-[3px] border-white/50 rounded-[3rem] pointer-events-none" />
      <div className="absolute inset-x-6 top-1/2 -translate-y-px border-t-[3px] border-white/50 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-[3px] border-white/50 rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white/50 rounded-full" />
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[55%] h-[18%] border-b-[3px] border-x-[3px] border-white/50 pointer-events-none" />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[55%] h-[18%] border-t-[3px] border-x-[3px] border-white/50 pointer-events-none" />
      
      {/* Touch instruction hint */}
      {isTouchDevice && !isDragging && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase backdrop-blur-sm z-40 pointer-events-none animate-pulse">
          👆 Maintenez pour déplacer
        </div>
      )}
      
      {/* Drag preview following finger */}
      {isDragging && draggedItem && dragPosition && getPlayerById && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: dragPosition.x - 32,
            top: dragPosition.y - 32,
          }}
        >
          <div className="w-16 h-16 rounded-full border-[4px] border-white bg-primary shadow-2xl flex items-center justify-center ring-4 ring-white/30">
            {(() => {
              const p = getPlayerById(draggedItem.id);
              return p ? (
                <img 
                  src={(p.photo_url && p.photo_url !== 'null') ? p.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=random&color=fff&size=200`} 
                  className="w-full h-full rounded-full object-cover p-0.5" 
                />
              ) : null;
            })()}
          </div>
        </motion.div>
      )}
      
      <AnimatePresence>
      {positions.map((pos, idx) => {
        const pid = startingXI[idx];
        const p = getPlayerById && pid ? getPlayerById(pid) : null;
        const displayTop = isOpponent ? (100 - parseFloat(pos.top)) + '%' : pos.top;
        const displayLeft = isOpponent ? (100 - parseFloat(pos.left)) + '%' : pos.left;
        const isBeingDragged = draggedItem?.id === (p?.id || '');

        return (
          <motion.div 
            key={idx}
            data-pitch-slot={idx}
            initial={{ scale: 0, x: "-50%", y: "-50%" }} 
            animate={{ 
              scale: isBeingDragged ? 0.3 : 1, 
              x: "-50%", 
              y: "-50%",
              opacity: isBeingDragged ? 0.3 : 1
            }} 
            layout
            className="absolute flex flex-col items-center gap-2 z-30" 
            style={{ top: displayTop, left: displayLeft }}
            onDragOver={(e) => { if (onDropPlayer) e.preventDefault(); e.currentTarget.classList.add('scale-110'); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('scale-110'); }}
            onDrop={(e) => {
               if (onDropPlayer) {
                 e.preventDefault();
                 e.currentTarget.classList.remove('scale-110');
                 const droppedPlayerId = (e as any).dataTransfer?.getData('playerId');
                 if (droppedPlayerId) onDropPlayer(droppedPlayerId, idx);
               }
            }}
          >
            {/* Long press progress ring */}
            {isTouchDevice && p && !isOpponent && longPressProgress > 0 && !isDragging && (
              <div className="absolute inset-0 -m-1 pointer-events-none">
                <svg className="w-[calc(100%+8px)] h-[calc(100%+8px)] -m-1 rotate-[-90deg]">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="46%"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeDasharray={`${longPressProgress * 283} 283`}
                    className="transition-all duration-75"
                  />
                </svg>
              </div>
            )}

            <motion.div 
              draggable={!!p}
              onDragStart={(e) => { if(p) (e as any).dataTransfer?.setData('playerId', p.id); }}
              onTouchStart={(e) => {
                if (p && !isOpponent && isTouchDevice) {
                  handleTouchStart(e, { id: p.id, type: 'player' }, idx);
                }
              }}
              whileHover={p ? { scale: 1.1, rotate: 5, y: -5 } : { scale: 1.05 }}
              className={`w-16 h-16 rounded-full border-[4px] flex items-center justify-center shadow-2xl transition-all duration-300 relative
                ${p ? 'bg-primary border-white ring-4 ring-primary/20' : isOpponent ? 'bg-slate-950 border-white/30' : 'bg-white/10 border-white/20 hover:bg-white/30 hover:border-white/50 cursor-crosshair'}
                ${isBeingDragged ? 'scale-50 opacity-30' : ''}`}
            >
               {p ? (
                 <>
                  <img 
                    src={(p.photo_url && p.photo_url !== 'null') ? p.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=random&color=fff&size=200`} 
                    className="w-full h-full rounded-full object-cover p-0.5" 
                  />
                  <Badge className="absolute -top-1 -right-1 bg-black text-white h-6 w-6 rounded-full flex items-center justify-center p-0 border-2 border-white text-[10px] font-black">{p.jersey_number}</Badge>
                 </>
               ) : (
                 <span className="text-[10px] font-black text-white/40">{pos.label}</span>
               )}
            </motion.div>
            <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase backdrop-blur-md truncate max-w-[90px] border shadow-lg transition-all
              ${p ? 'bg-black/80 text-white border-white/20 scale-105' : 'bg-white/10 text-white/30 border-white/10'}
              ${isBeingDragged ? 'opacity-50' : ''}`}>
              {p ? p.full_name.split(' ').pop() : pos.label}
            </div>
          </motion.div>
        );
      })}
      </AnimatePresence>
    </div>
  );
};

export default MatchDayPage;
