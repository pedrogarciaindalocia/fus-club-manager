import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowUpCircle,
  RotateCcw,
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  CheckSquare,
  Square,
  Shield,
  Sparkles,
  MapPin,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { isHigherCategory, surclassementService } from '../../services/surclassementService';
import type { Player, Team, PlayerSurclassement } from '../../types';
import type { SurclassementWithDetails } from '../../services/surclassementService';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return d;
  }
};

const CAT_COLORS: Record<string, string> = {
  SENIOR: 'bg-amber-500',
  PRO: 'bg-amber-600',
  U23: 'bg-yellow-500',
  U21: 'bg-yellow-400',
  U20: 'bg-emerald-500',
  U19: 'bg-lime-500',
  U18: 'bg-purple-600',
  U17: 'bg-green-500',
  U16: 'bg-emerald-500',
  U15: 'bg-teal-500',
  U14: 'bg-cyan-600',
  U13: 'bg-cyan-500',
  U11: 'bg-sky-500',
  U9: 'bg-blue-500',
  U7: 'bg-indigo-500',
};

const catColor = (cat: string) => CAT_COLORS[cat?.toUpperCase()] ?? 'bg-slate-500';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  player: Player;
  teams: Team[];
  /** Équipe réelle d'origine (fournie par le wrapper pour gérer le cas où team_id a déjà été déplacé) */
  originalTeam?: Team;
  activeSurclassement: PlayerSurclassement | null;
  history: SurclassementWithDetails[];
  historyLoading: boolean;
  isCreating: boolean;
  isReverting: boolean;
  onConfirmSurclasser: (targetTeamId: string, notes: string, targetJerseyNumber: number | null) => void;
  onConfirmRevert: (surclassementId: string) => void;
  onClose: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function SurclassementModal({
  player,
  teams,
  originalTeam,
  activeSurclassement,
  history,
  historyLoading,
  isReverting,
  onConfirmRevert,
  onClose,
}: Props) {
  const queryClient = useQueryClient();

  // Équipe et catégorie réelles d'origine
  const currentTeam = originalTeam ?? teams.find(t => t.id === player.team_id);
  const currentCategory = currentTeam?.category ?? player.category ?? '';

  const [tab, setTab] = useState<'action' | 'history'>('action');
  const [confirmRevert, setConfirmRevert] = useState(false);

  // Matchs à venir éligibles au surclassement
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  const [savingBatch, setSavingBatch] = useState(false);

  // Form inputs
  const [targetJerseyNumber, setTargetJerseyNumber] = useState<string>('');
  const [notes, setNotes] = useState('');

  // ── Chargement des matchs planifiés à venir (catégories supérieures uniquement) ──
  useEffect(() => {
    let isMounted = true;
    const fetchUpcomingMatches = async () => {
      try {
        setLoadingMatches(true);
        const { data, error } = await supabase
          .from('matches')
          .select(`
            id, category, match_date, match_time, status, club_id, opponent_id, location, is_home, match_type, lineup, team_id,
            opponent:clubs!opponent_id(id, name, logo_url),
            club:clubs!club_id(id, name, logo_url),
            league:leagues!league_id(name)
          `)
          .neq('status', 'finished')
          .order('match_date', { ascending: true });

        if (error) throw error;
        if (!isMounted) return;

        const raw = (data || []) as any[];

        // RÈGLE MÉTIER STRICTE :
        // Uniquement les matchs en catégorie strictement supérieure (UX -> UX+1, UX+2...)
        // Le sous-classement (UX-1) est formellement interdit et impossible par règlement
        const higherMatches = raw.filter(m =>
          m.category && isHigherCategory(currentCategory, m.category)
        );

        setMatches(higherMatches);

        // Pré-cocher les matchs où le joueur est déjà planifié
        const preselected = new Set<string>();
        higherMatches.forEach(m => {
          if (m.lineup?.surclasses?.[player.id]) {
            preselected.add(m.id);
          }
        });
        setSelectedMatchIds(preselected);
      } catch (err: any) {
        console.warn('Erreur chargement matchs surclassement:', err);
      } finally {
        if (isMounted) setLoadingMatches(false);
      }
    };

    fetchUpcomingMatches();
    return () => { isMounted = false; };
  }, [player.id, currentCategory]);

  const toggleMatchSelection = (matchId: string) => {
    setSelectedMatchIds(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedMatchIds.size === matches.length) {
      setSelectedMatchIds(new Set());
    } else {
      setSelectedMatchIds(new Set(matches.map(m => m.id)));
    }
  };

  // ── Sauvegarde du surclassement sur les matchs sélectionnés ──
  const handleSaveSurclassementBatch = async () => {
    if (selectedMatchIds.size === 0) {
      toast.error('Cochez au moins un match à venir pour y programmer le surclassement de ce joueur.');
      return;
    }

    try {
      setSavingBatch(true);
      const jersey = targetJerseyNumber !== '' ? parseInt(targetJerseyNumber, 10) : null;

      await surclassementService.saveMatchSurclassements({
        player,
        playerCategory: currentCategory,
        originalTeamId: currentTeam?.id || player.team_id || '',
        matches,
        selectedMatchIds,
        targetJerseyNumber: jersey,
        notes: notes.trim() || null,
      });

      queryClient.invalidateQueries({ queryKey: ['surclassements'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });

      toast.success(
        `Surclassement enregistré ! ${player.full_name} est programmé sur ${selectedMatchIds.size} match(s).`
      );
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Impossible d’enregistrer le surclassement.');
    } finally {
      setSavingBatch(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="relative p-6 pb-6 bg-gradient-to-br from-orange-500 via-amber-500 to-amber-600 text-white flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
            title="Fermer"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-white/30 shadow-xl flex-shrink-0 bg-white/10">
              <img
                src={
                  player.photo_url && player.photo_url !== 'null'
                    ? player.photo_url
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=random&color=fff&size=200`
                }
                alt={player.full_name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white/80 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <ArrowUpCircle className="w-3.5 h-3.5 text-amber-200" />
                  Surclassement par Match Planifié
                </span>
                {activeSurclassement && (
                  <Badge className="bg-amber-400 text-slate-900 border-none text-[9px] font-black uppercase">
                    Actif ({activeSurclassement.target_category})
                  </Badge>
                )}
              </div>
              <h3 className="text-white font-black text-2xl uppercase tracking-tight leading-tight truncate">
                {player.full_name}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-white/90 font-medium">
                  Catégorie d'origine :
                </span>
                <span className={`text-[11px] font-black text-white px-2.5 py-0.5 rounded-full ${catColor(currentCategory)} shadow-sm`}>
                  {currentCategory || 'N/A'}
                </span>
                {player.jersey_number != null && (
                  <span className="text-xs font-black text-white/80 bg-white/20 px-2 py-0.5 rounded-lg">
                    #{player.jersey_number}
                  </span>
                )}
                {player.position && (
                  <span className="text-xs font-bold text-white/80 uppercase">
                    • {player.position}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-slate-50 flex-shrink-0">
          <button
            onClick={() => setTab('action')}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              tab === 'action'
                ? 'text-orange-600 border-b-2 border-orange-500 bg-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Matchs à venir ({matches.length})
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              tab === 'history'
                ? 'text-orange-600 border-b-2 border-orange-500 bg-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-4 h-4" />
            Historique ({history.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <AnimatePresence mode="wait">
            {tab === 'action' ? (
              <motion.div
                key="action"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                {/* Information Règle FRMF / FUS */}
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3">
                  <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    Sélectionnez les matchs à venir de catégorie supérieure (<span className="font-bold text-orange-600">+1 ou +2</span>) où vous souhaitez surclasser <strong>{player.full_name}</strong>.
                    Le sous-classement est interdit.
                  </p>
                </div>

                {/* Liste des matchs à venir */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Matchs cibles éligibles ({matches.length})
                    </span>
                    {matches.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 transition-colors"
                      >
                        {selectedMatchIds.size === matches.length ? (
                          <><Square className="w-3.5 h-3.5" /> Tout désélectionner</>
                        ) : (
                          <><CheckSquare className="w-3.5 h-3.5" /> Tout sélectionner</>
                        )}
                      </button>
                    )}
                  </div>

                  {loadingMatches ? (
                    <div className="py-12 text-center space-y-2">
                      <div className="w-8 h-8 rounded-full border-3 border-orange-500 border-t-transparent animate-spin mx-auto" />
                      <p className="text-xs text-muted-foreground font-semibold">Recherche des matchs planifiés…</p>
                    </div>
                  ) : matches.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-8 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight">
                        Aucun match supérieur planifié
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        Le surclassement est autorisé uniquement vers une catégorie strictement supérieure (ex: {currentCategory} ➔ U18, U19 ou Pro).
                        Planifiez d'abord un match dans le Calendrier pour pouvoir y affecter ce joueur.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {matches.map(m => {
                        const isSelected = selectedMatchIds.has(m.id);
                        const wasAssigned = !!m.lineup?.surclasses?.[player.id];
                        const oppName = m.opponent?.name || 'Adversaire';
                        const oppLogo = m.opponent?.logo_url;
                        const clubLogo = m.club?.logo_url || '/fus-logo.png';

                        return (
                          <div
                            key={m.id}
                            onClick={() => toggleMatchSelection(m.id)}
                            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3.5 ${
                              isSelected
                                ? 'border-orange-500 bg-orange-50/60 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            {/* Checkbox visuelle */}
                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                              isSelected
                                ? 'bg-orange-500 text-white'
                                : 'border-2 border-slate-300 bg-white'
                            }`}>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </div>

                            {/* Contenu Match */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`text-[10px] font-black text-white px-2 py-0.5 rounded-md ${catColor(m.category)}`}>
                                  CATÉGORIE {m.category}
                                </span>
                                <span className="text-[11px] font-bold text-slate-500">
                                  {fmtDate(m.match_date)} {m.match_time ? `• ${m.match_time.slice(0, 5)}` : ''}
                                </span>
                                {wasAssigned && (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-none text-[9px] font-black uppercase">
                                    DÉJÀ SURCLASSÉ
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                  <img src={clubLogo} alt="FUS" className="w-4 h-4 object-contain rounded-full" />
                                  <span className="font-black text-xs text-slate-900">FUS Rabat</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-400">VS</span>
                                <div className="flex items-center gap-1.5 truncate">
                                  {oppLogo ? (
                                    <img src={oppLogo} alt={oppName} className="w-4 h-4 object-contain rounded-full" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold">
                                      {oppName[0]}
                                    </div>
                                  )}
                                  <span className="font-bold text-xs text-slate-800 truncate">{oppName}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Options complémentaires */}
                {matches.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    {/* Numéro de maillot cible */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        N° de maillot dans l'équipe cible
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={targetJerseyNumber}
                        onChange={e => setTargetJerseyNumber(e.target.value)}
                        placeholder={`Actuel: #${player.jersey_number ?? '—'}`}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Laisser vide pour conserver le numéro #{player.jersey_number ?? '—'}
                      </p>
                    </div>

                    {/* Notes / Motif */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Motif / Notes (optionnel)
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Ex : Potentiel remarquable, renfort match clé…"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Bouton d'action principal */}
                {matches.length > 0 && (
                  <Button
                    onClick={handleSaveSurclassementBatch}
                    disabled={selectedMatchIds.size === 0 || savingBatch}
                    className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs gap-2 text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-200 transition-all"
                  >
                    {savingBatch ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        Enregistrement du surclassement…
                      </span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Planifier le surclassement ({selectedMatchIds.size} match{selectedMatchIds.size > 1 ? 's' : ''})
                      </>
                    )}
                  </Button>
                )}
              </motion.div>
            ) : (
              /* ── Onglet Historique ── */
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Bloc de réintégration si surclassement actif */}
                {activeSurclassement && (
                  <div className="rounded-2xl p-4 space-y-3 bg-orange-50 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-widest text-orange-800">
                          Surclassement Actif
                        </span>
                      </div>
                      <Badge className="bg-orange-500 text-white border-none text-[9px] font-black uppercase">
                        {activeSurclassement.original_category} ➔ {activeSurclassement.target_category}
                      </Badge>
                    </div>

                    {!confirmRevert ? (
                      <Button
                        onClick={() => setConfirmRevert(true)}
                        className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-xs gap-2 bg-slate-800 hover:bg-slate-900 text-white shadow-md transition-all"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Réintégrer définitivement dans {activeSurclassement.original_category}
                      </Button>
                    ) : (
                      <div className="space-y-3 pt-1">
                        <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-red-700 font-semibold leading-relaxed">
                            Confirmer la fin du surclassement de <strong>{player.full_name}</strong> et sa réintégration dans sa catégorie d'origine ({activeSurclassement.original_category}) ?
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setConfirmRevert(false)}
                            className="flex-1 h-10 rounded-xl font-bold uppercase text-xs"
                          >
                            Annuler
                          </Button>
                          <Button
                            onClick={() => onConfirmRevert(activeSurclassement.id)}
                            disabled={isReverting}
                            className="flex-1 h-10 rounded-xl font-black uppercase text-xs bg-red-600 hover:bg-red-700 text-white gap-2"
                          >
                            {isReverting ? (
                              <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                Réintégration…
                              </span>
                            ) : (
                              <><RotateCcw className="w-3.5 h-3.5" />Confirmer</>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Liste chronologique */}
                {historyLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Clock className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">Aucun historique de surclassement</p>
                    <p className="text-xs text-slate-400">Toutes les affectations de surclassement apparaîtront ici.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {history.map(s => (
                      <div
                        key={s.id}
                        className={`rounded-2xl p-4 border transition-all ${
                          s.status === 'active'
                            ? 'bg-orange-50/70 border-orange-200'
                            : 'bg-slate-50 border-slate-200 opacity-80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black text-white px-2.5 py-0.5 rounded-full ${catColor(s.original_category)}`}>
                              {s.original_category}
                            </span>
                            <ArrowUpCircle className="w-3.5 h-3.5 text-orange-500" />
                            <span className={`text-[10px] font-black text-white px-2.5 py-0.5 rounded-full ${catColor(s.target_category)}`}>
                              {s.target_category}
                            </span>
                            {s.target_jersey_number != null && (
                              <span className="text-[10px] font-black text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                Maillot #{s.target_jersey_number}
                              </span>
                            )}
                          </div>
                          <Badge
                            className={`border-none text-[9px] font-black uppercase ${
                              s.status === 'active'
                                ? 'bg-orange-500 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {s.status === 'active' ? 'Actif' : 'Clôturé'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground font-semibold">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Surclassé le {fmtDate(s.promoted_at)}
                          </span>
                          {s.reverted_at && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <RotateCcw className="w-3 h-3" />
                              Réintégré le {fmtDate(s.reverted_at)}
                            </span>
                          )}
                        </div>

                        {s.notes && (
                          <p className="mt-2 text-xs text-slate-600 bg-white/70 p-2 rounded-xl border border-slate-100 italic">
                            {s.notes.startsWith('{') ? (() => {
                              try {
                                const parsed = JSON.parse(s.notes);
                                return `Match vs ${parsed.opponent || 'Adversaire'} (${parsed.match_date || ''}) ${parsed.reason ? `— Note : ${parsed.reason}` : ''}`;
                              } catch {
                                return s.notes;
                              }
                            })() : s.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
