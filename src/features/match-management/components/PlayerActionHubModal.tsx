import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Target,
  RotateCw,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Star,
  Check,
  ShieldCheck,
  Trophy,
  ArrowRight,
  Activity,
  User,
  Sliders,
  ChevronRight,
  Zap,
  Info
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { toast } from 'sonner';
import type { MatchEvent } from '../../../types';

export interface PlayerActionTarget {
  id: string;
  full_name: string;
  jersey_number?: number | string | null;
  position?: string | null;
  photo_url?: string | null;
  is_opponent: boolean;
  is_starter?: boolean;
  has_entered?: boolean;
  entered_minute?: number | null;
  rating?: number | null;
  rating_comment?: string | null;
  opponent_ref?: string | null;
}

interface PlayerActionHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerActionTarget | null;
  matchId: string;
  currentMatch: any;
  matchEvents: MatchEvent[];
  homePlayers: any[];
  opponentPlayers: any[];
  onAddEvent: (eventPayload: any) => Promise<void>;
  onUpdateEvent: (id: string, updates: any) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onSaveRating?: (playerId: string, rating: number, comment: string) => Promise<void>;
  onOpenDeepEvaluation?: (player: any) => void;
  mainClubName?: string;
  opponentClubName?: string;
}

type TabType = 'add_event' | 'event_history' | 'evaluation';
type ActionType = 'goal' | 'penalty' | 'substitution' | 'yellow_card' | 'red_card' | 'own_goal';
type PenaltyResult = 'scored' | 'saved' | 'post' | 'missed';

const ACTION_CONFIG: Record<ActionType, { label: string; icon: any; color: string; bg: string; border: string }> = {
  goal: {
    label: 'But',
    icon: Target,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    border: 'border-emerald-500/30'
  },
  penalty: {
    label: 'Penalty',
    icon: Target,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 hover:bg-blue-500/20',
    border: 'border-blue-500/30'
  },
  substitution: {
    label: 'Remplacement',
    icon: RotateCw,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 hover:bg-indigo-500/20',
    border: 'border-indigo-500/30'
  },
  yellow_card: {
    label: 'Carton Jaune',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 hover:bg-amber-500/20',
    border: 'border-amber-500/30'
  },
  red_card: {
    label: 'Carton Rouge',
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-500/10 hover:bg-red-500/20',
    border: 'border-red-500/30'
  },
  own_goal: {
    label: 'Contre son camp (CSC)',
    icon: Target,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 hover:bg-rose-500/20',
    border: 'border-rose-500/30'
  }
};

const PRESET_MINUTES = [15, 30, 45, 47, 60, 75, 90, 93];

export const PlayerActionHubModal: React.FC<PlayerActionHubModalProps> = ({
  isOpen,
  onClose,
  player,
  matchId,
  currentMatch,
  matchEvents,
  homePlayers,
  opponentPlayers,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onSaveRating,
  onOpenDeepEvaluation,
  mainClubName = 'FUS de Rabat',
  opponentClubName = 'Adversaire'
}) => {
  if (!isOpen || !player) return null;

  const isOpponent = player.is_opponent;

  // Tabs
  const [activeTab, setActiveTab] = useState<TabType>('add_event');

  // Form State for Events
  const [selectedAction, setSelectedAction] = useState<ActionType>('goal');
  const [minute, setMinute] = useState<number>(() => {
    return Math.min(90, Math.max(1, Math.floor((currentMatch?.time_elapsed_seconds || 1800) / 60)));
  });
  const [penaltyResult, setPenaltyResult] = useState<PenaltyResult>('scored');
  const [assistPlayerId, setAssistPlayerId] = useState<string>('');
  const [substitutePartnerId, setSubstitutePartnerId] = useState<string>('');
  const [eventComment, setEventComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editing existing event
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Rating State
  const [ratingValue, setRatingValue] = useState<number>(player.rating != null ? Number(player.rating) : 7.0);
  const [ratingComment, setRatingComment] = useState<string>(player.rating_comment || '');
  const [isSavingRating, setIsSavingRating] = useState(false);

  // Player's existing events in this match
  const playerEvents = useMemo(() => {
    return matchEvents.filter(e => {
      if (!isOpponent) {
        return (
          e.player_id === player.id ||
          e.related_player_id === player.id ||
          e.extra?.player_in_id === player.id
        );
      } else {
        const pRef = player.opponent_ref || player.id;
        const eOppRef = e.extra?.opponent_ref || e.player_id;
        return (
          eOppRef === pRef ||
          (e.extra?.team === 'away' && (e.extra?.player_name === player.full_name || e.extra?.player_out_name === player.full_name))
        );
      }
    }).sort((a, b) => b.minute - a.minute);
  }, [matchEvents, player, isOpponent]);

  // Check disciplinary yellow cards for warning
  const hasExistingYellow = useMemo(() => {
    return playerEvents.some(e => e.type === 'yellow_card');
  }, [playerEvents]);

  // Candidate partners for substitutions
  const startersIds = useMemo(() => {
    return new Set<string>((currentMatch?.lineup?.startingXI || []).filter(Boolean));
  }, [currentMatch]);

  const benchIds = useMemo(() => {
    return new Set<string>((currentMatch?.lineup?.substitutes || []).filter(Boolean));
  }, [currentMatch]);

  // Available partner players for sub
  const availableSubPartners = useMemo(() => {
    if (!isOpponent) {
      if (player.is_starter) {
        // Player is currently starting -> candidate entering players are from the bench
        return homePlayers.filter(p => benchIds.has(p.id) && p.id !== player.id);
      } else {
        // Player is on bench -> candidate exiting players are starters
        return homePlayers.filter(p => startersIds.has(p.id) && p.id !== player.id);
      }
    } else {
      // Opponent candidates
      return opponentPlayers.filter(p => p.id !== player.id);
    }
  }, [isOpponent, player, homePlayers, opponentPlayers, benchIds, startersIds]);

  // Handle Event Submit (Add or Edit)
  const handleSubmitEvent = async () => {
    if (!minute || minute < 0) {
      toast.error('Veuillez renseigner une minute valide (entre 1 et 120)');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalType: string = selectedAction;
      let finalExtra: any = {
        team: isOpponent ? 'away' : 'home',
        minute: minute,
        comment: eventComment.trim() || null,
        timestamp_seconds: minute * 60
      };

      // Disciplinary double yellow check
      if (selectedAction === 'yellow_card' && hasExistingYellow && !editingEventId) {
        finalType = 'red_card';
        finalExtra.reason = 'double_yellow';
        finalExtra.note = 'Double carton jaune (Expulsion automatique)';
        toast.info('Second carton jaune converti en carton rouge direct.');
      }

      // Penalty result
      if (selectedAction === 'penalty') {
        finalExtra.result = penaltyResult;
      }

      // Player identifiers
      let pId: string | null = isOpponent ? null : player.id;
      let relatedId: string | null = null;

      if (isOpponent) {
        finalExtra.opponent_ref = player.opponent_ref || player.id;
        finalExtra.player_name = player.full_name;
      } else {
        finalExtra.player_name = player.full_name;
      }

      // Assists for Goal
      if (selectedAction === 'goal' && assistPlayerId) {
        if (!isOpponent) {
          relatedId = assistPlayerId;
          const assistPlayer = homePlayers.find(p => p.id === assistPlayerId);
          if (assistPlayer) {
            finalExtra.related_name = assistPlayer.full_name;
          }
        } else {
          finalExtra.related_name = assistPlayerId;
        }
      }

      // Substitutions
      if (selectedAction === 'substitution') {
        if (!isOpponent) {
          if (player.is_starter) {
            // Player OUT: this player. Player IN: substitutePartnerId
            pId = player.id;
            relatedId = substitutePartnerId || null;
            finalExtra.player_out_name = player.full_name;
            const inPlayer = homePlayers.find(p => p.id === substitutePartnerId);
            finalExtra.player_in_name = inPlayer?.full_name || 'Remplaçant entrant';
            finalExtra.player_in_id = substitutePartnerId || null;
          } else {
            // Player IN: this player. Player OUT: substitutePartnerId
            pId = substitutePartnerId || null;
            relatedId = player.id;
            const outPlayer = homePlayers.find(p => p.id === substitutePartnerId);
            finalExtra.player_out_name = outPlayer?.full_name || 'Titulaire sortant';
            finalExtra.player_in_name = player.full_name;
            finalExtra.player_in_id = player.id;
          }
        } else {
          // Opponent substitution
          finalExtra.player_out_name = player.full_name;
          const partnerObj = opponentPlayers.find(p => p.id === substitutePartnerId);
          finalExtra.player_in_name = partnerObj ? partnerObj.full_name : substitutePartnerId || 'Adversaire entrant';
        }
      }

      const payload = {
        match_id: matchId,
        minute: minute,
        type: finalType,
        player_id: pId,
        related_player_id: relatedId,
        extra: finalExtra
      };

      if (editingEventId) {
        await onUpdateEvent(editingEventId, payload);
        toast.success('Événement modifié avec succès !');
        setEditingEventId(null);
      } else {
        await onAddEvent(payload);
        toast.success(`Événement ${ACTION_CONFIG[selectedAction].label} enregistré à la ${minute}' !`);
      }

      // Reset form
      setEventComment('');
      setAssistPlayerId('');
      setSubstitutePartnerId('');
      setActiveTab('event_history');
    } catch (err: any) {
      console.error('Error saving event from PlayerActionHubModal:', err);
      toast.error(`Erreur: ${err.message || 'Impossible d’enregistrer l’événement'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Switch to edit mode for an existing event
  const startEditEvent = (evt: MatchEvent) => {
    setEditingEventId(evt.id);
    let targetType: ActionType = 'goal';
    if (['goal', 'penalty', 'substitution', 'yellow_card', 'red_card', 'own_goal'].includes(evt.type)) {
      targetType = evt.type as ActionType;
    }
    setSelectedAction(targetType);
    setMinute(evt.minute || 45);
    setEventComment(evt.extra?.comment || '');
    if (evt.type === 'penalty' && evt.extra?.result) {
      setPenaltyResult(evt.extra.result as PenaltyResult);
    }
    if (evt.type === 'goal' && evt.related_player_id) {
      setAssistPlayerId(evt.related_player_id);
    }
    if (evt.type === 'substitution') {
      setSubstitutePartnerId(evt.related_player_id || evt.extra?.player_in_id || '');
    }
    setActiveTab('add_event');
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingEventId(null);
    setEventComment('');
    setAssistPlayerId('');
    setSubstitutePartnerId('');
  };

  // Handle Rating Save
  const handleSavePlayerRating = async () => {
    if (!onSaveRating) return;
    setIsSavingRating(true);
    try {
      await onSaveRating(player.id, ratingValue, ratingComment.trim());
      toast.success(`Note de ${ratingValue}/10 enregistrée pour ${player.full_name}`);
    } catch (err: any) {
      toast.error(`Erreur notation: ${err.message || 'Échec de sauvegarde'}`);
    } finally {
      setIsSavingRating(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden text-white my-8"
        >
          {/* HEADER BANNER */}
          <div className="relative p-6 sm:p-8 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-white/10">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all z-20"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-5">
              {/* Player Avatar */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border-2 border-white/20 overflow-hidden flex items-center justify-center shadow-2xl shrink-0">
                {player.photo_url ? (
                  <img src={player.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl sm:text-3xl font-black text-white/80">
                    {player.jersey_number || '•'}
                  </span>
                )}
                {player.jersey_number && player.photo_url && (
                  <div className="absolute bottom-0 right-0 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-tl-md">
                    #{player.jersey_number}
                  </div>
                )}
              </div>

              {/* Player Meta Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge
                    className={`border-none text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 ${
                      isOpponent ? 'bg-amber-500/20 text-amber-300' : 'bg-primary text-white shadow-lg shadow-primary/30'
                    }`}
                  >
                    {isOpponent ? opponentClubName : mainClubName}
                  </Badge>
                  <Badge className="bg-white/10 text-slate-300 border-none text-[9px] font-black uppercase">
                    {player.position || (isOpponent ? 'Adversaire' : 'Joueur')}
                  </Badge>
                  {player.is_starter ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase">
                      Titulaire
                    </Badge>
                  ) : (
                    <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-black uppercase">
                      Remplaçant
                    </Badge>
                  )}
                  {player.has_entered && (
                    <Badge className="bg-emerald-500 text-white text-[9px] font-black uppercase animate-pulse">
                      Entré en jeu {player.entered_minute ? `(${player.entered_minute}')` : ''}
                    </Badge>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-black tracking-tight uppercase truncate">
                  {player.full_name}
                </h3>

                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                  Match · Catégorie {currentMatch?.category || 'Officielle'} · {playerEvents.length} événement(s)
                </p>
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex gap-2 mt-6 bg-slate-950/60 p-1.5 rounded-2xl border border-white/5">
              <button
                type="button"
                onClick={() => { setActiveTab('add_event'); cancelEdit(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === 'add_event'
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{editingEventId ? 'Modifier' : 'Ajouter Événement'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('event_history')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${
                  activeTab === 'event_history'
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Événements ({playerEvents.length})</span>
                {playerEvents.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </button>

              {!isOpponent && (
                <button
                  type="button"
                  onClick={() => setActiveTab('evaluation')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === 'evaluation'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Évaluation ({ratingValue}/10)</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: ADD / EDIT EVENT */}
          {activeTab === 'add_event' && (
            <div className="p-6 sm:p-8 space-y-6 max-h-[62vh] overflow-y-auto custom-scrollbar">
              {editingEventId && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    <span>Mode Modification d'événement</span>
                  </div>
                  <button
                    onClick={cancelEdit}
                    className="text-[10px] uppercase tracking-wider text-slate-400 hover:text-white underline"
                  >
                    Annuler
                  </button>
                </div>
              )}

              {/* ACTION TYPE SELECTOR */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block px-1">
                  Type d'événement (Système Live Tracking)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(Object.keys(ACTION_CONFIG) as ActionType[]).map((actionKey) => {
                    const cfg = ACTION_CONFIG[actionKey];
                    const Icon = cfg.icon;
                    const isSelected = selectedAction === actionKey;
                    return (
                      <button
                        key={actionKey}
                        type="button"
                        onClick={() => setSelectedAction(actionKey)}
                        className={`p-3 rounded-2xl border-2 text-left flex items-center gap-3 transition-all ${
                          isSelected
                            ? 'bg-white text-slate-950 border-white shadow-xl scale-[1.02]'
                            : `${cfg.bg} ${cfg.border} text-white/90`
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-slate-950 text-white' : 'bg-white/10'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : cfg.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black tracking-tight leading-tight uppercase truncate">
                            {cfg.label}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DOUBLE YELLOW ALERT */}
              {selectedAction === 'yellow_card' && hasExistingYellow && !editingEventId && (
                <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-200">
                    <p className="font-black uppercase tracking-wide">Second Carton Jaune Détecté !</p>
                    <p className="text-[11px] text-red-300/80 mt-0.5">
                      Ce joueur a déjà reçu un avertissement. En enregistrant ce carton, il sera automatiquement comptabilisé en carton rouge (expulsion pour double jaune).
                    </p>
                  </div>
                </div>
              )}

              {/* TIMING / MINUTE SELECTOR */}
              <div className="space-y-3 bg-white/5 p-5 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Minute du match (Timing de l'événement)</span>
                  </label>
                  <span className="text-lg font-black text-primary italic tabular-nums">{minute}'</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMinute(m => Math.max(1, m - 5))}
                    className="h-11 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-black text-slate-300"
                  >
                    -5'
                  </button>
                  <button
                    type="button"
                    onClick={() => setMinute(m => Math.max(1, m - 1))}
                    className="h-11 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-black text-slate-300"
                  >
                    -1'
                  </button>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={minute}
                      onChange={e => setMinute(parseInt(e.target.value, 10) || 1)}
                      className="h-11 text-center font-black text-base bg-slate-950 border-white/20 text-white rounded-xl focus:border-primary"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">min</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMinute(m => Math.min(120, m + 1))}
                    className="h-11 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-black text-slate-300"
                  >
                    +1'
                  </button>
                  <button
                    type="button"
                    onClick={() => setMinute(m => Math.min(120, m + 5))}
                    className="h-11 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-black text-slate-300"
                  >
                    +5'
                  </button>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
                  <span className="text-[9px] font-black uppercase text-slate-500 mr-1 shrink-0">Raccourcis :</span>
                  {PRESET_MINUTES.map(pm => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setMinute(pm)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all shrink-0 ${
                        minute === pm ? 'bg-primary text-white shadow' : 'bg-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pm}'
                    </button>
                  ))}
                </div>
              </div>

              {/* SPECIFIC FIELDS: PENALTY */}
              {selectedAction === 'penalty' && (
                <div className="space-y-2 bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20">
                  <label className="text-[10px] font-black uppercase tracking-widest text-blue-300 block">
                    Résultat du tir au penalty
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'scored', label: 'Marqué', emoji: '✅', color: 'border-emerald-500 bg-emerald-500/20 text-emerald-300' },
                      { key: 'saved', label: 'Arrêté', emoji: '🧤', color: 'border-blue-500 bg-blue-500/20 text-blue-300' },
                      { key: 'post', label: 'Poteau', emoji: '🔲', color: 'border-amber-500 bg-amber-500/20 text-amber-300' },
                      { key: 'missed', label: 'Raté', emoji: '❌', color: 'border-red-500 bg-red-500/20 text-red-300' },
                    ].map(res => (
                      <button
                        key={res.key}
                        type="button"
                        onClick={() => setPenaltyResult(res.key as PenaltyResult)}
                        className={`p-2.5 rounded-xl border-2 flex items-center justify-center gap-2 text-xs font-black transition-all ${
                          penaltyResult === res.key ? `${res.color} scale-105 shadow-lg` : 'border-white/10 bg-white/5 text-slate-400'
                        }`}
                      >
                        <span>{res.emoji}</span>
                        <span>{res.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SPECIFIC FIELDS: ASSIST FOR GOAL */}
              {selectedAction === 'goal' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block px-1">
                    Passeur décisif (Assist - Optionnel)
                  </label>
                  {!isOpponent ? (
                    <select
                      value={assistPlayerId}
                      onChange={e => setAssistPlayerId(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-white/20 font-bold text-xs text-white outline-none focus:border-emerald-500 transition-all cursor-pointer"
                    >
                      <option value="">Aucun passeur décisif (Action individuelle / Corner / CF direct)</option>
                      {homePlayers
                        .filter(p => p.id !== player.id)
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            #{p.jersey_number || '?'} - {p.full_name} ({p.position || 'Joueur'})
                          </option>
                        ))}
                    </select>
                  ) : (
                    <Input
                      value={assistPlayerId}
                      onChange={e => setAssistPlayerId(e.target.value)}
                      placeholder="Nom ou numéro du joueur adverse ayant fait la passe..."
                      className="h-12 bg-slate-950 border-white/20 text-white rounded-xl text-xs"
                    />
                  )}
                </div>
              )}

              {/* SPECIFIC FIELDS: SUBSTITUTION */}
              {selectedAction === 'substitution' && (
                <div className="space-y-3 bg-indigo-500/10 p-5 rounded-2xl border border-indigo-500/20">
                  <div className="flex items-center gap-2 text-xs font-black text-indigo-300 uppercase tracking-wider">
                    <RotateCw className="w-4 h-4" />
                    <span>
                      {player.is_starter
                        ? `Joueur Sortant : ${player.full_name}`
                        : `Joueur Entrant : ${player.full_name}`}
                    </span>
                  </div>

                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                    {player.is_starter
                      ? 'Sélectionner le joueur entrant (depuis le banc) :'
                      : 'Sélectionner le titulaire sortant (sur le terrain) :'}
                  </label>

                  {!isOpponent ? (
                    <select
                      value={substitutePartnerId}
                      onChange={e => setSubstitutePartnerId(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-white/20 font-bold text-xs text-white outline-none focus:border-indigo-400 cursor-pointer"
                    >
                      <option value="">
                        {player.is_starter
                          ? 'Choisir le joueur remplaçant entrant...'
                          : 'Choisir le titulaire qui cède sa place...'}
                      </option>
                      {availableSubPartners.map(p => (
                        <option key={p.id} value={p.id}>
                          #{p.jersey_number || '?'} - {p.full_name} ({p.position || 'Joueur'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2">
                      {opponentPlayers.length > 0 ? (
                        <select
                          value={substitutePartnerId}
                          onChange={e => setSubstitutePartnerId(e.target.value)}
                          className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-white/20 font-bold text-xs text-white outline-none focus:border-indigo-400 cursor-pointer"
                        >
                          <option value="">Sélectionner le joueur adverse partenaire...</option>
                          {availableSubPartners.map(op => (
                            <option key={op.id} value={op.id}>
                              #{op.jersey_number ?? '?'} - {op.full_name} ({op.position || 'ADV'})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={substitutePartnerId}
                          onChange={e => setSubstitutePartnerId(e.target.value)}
                          placeholder="Nom ou numéro du joueur adverse entrant/sortant..."
                          className="h-12 bg-slate-950 border-white/20 text-white rounded-xl text-xs"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* OPTIONAL COMMENT */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block px-1">
                  Observation / Commentaire de scouting (Optionnel)
                </label>
                <Input
                  value={eventComment}
                  onChange={e => setEventComment(e.target.value)}
                  placeholder="Ex: Frappe enroulée 25m lucarne opposée, Faute tactique, etc."
                  className="h-12 bg-slate-950 border-white/20 text-white rounded-xl text-xs"
                />
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-2">
                <Button
                  onClick={handleSubmitEvent}
                  disabled={isSubmitting}
                  className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-widest shadow-xl hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Enregistrement en cours...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingEventId ? "Mettre à jour l'événement" : "Valider l'événement"}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: EVENT HISTORY */}
          {activeTab === 'event_history' && (
            <div className="p-6 sm:p-8 space-y-4 max-h-[62vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Historique des événements de {player.full_name}
                </span>
                <button
                  type="button"
                  onClick={() => { setActiveTab('add_event'); cancelEdit(); }}
                  className="text-primary hover:text-white text-xs font-black uppercase flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nouveau</span>
                </button>
              </div>

              {playerEvents.length === 0 ? (
                <div className="py-12 text-center space-y-3 bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <Activity className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-400">Aucun événement enregistré pour ce joueur.</p>
                  <Button
                    onClick={() => { setActiveTab('add_event'); cancelEdit(); }}
                    className="h-10 px-5 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase hover:bg-primary"
                  >
                    Ajouter le premier événement
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {playerEvents.map(evt => {
                    const cfg = ACTION_CONFIG[evt.type as ActionType] || {
                      label: evt.type,
                      icon: Activity,
                      color: 'text-slate-400',
                      bg: 'bg-white/5',
                      border: 'border-white/10'
                    };
                    const Icon = cfg.icon;

                    return (
                      <div
                        key={evt.id}
                        className="p-4 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-between gap-4 hover:border-white/20 transition-all"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.border}`}>
                            <Icon className={`w-5 h-5 ${cfg.color}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-tight text-white truncate">
                                {cfg.label}
                              </span>
                              <Badge className="bg-white/10 text-primary border-none text-[9px] font-black px-1.5 py-0.5">
                                {evt.minute}'
                              </Badge>
                              {evt.extra?.result && (
                                <Badge className="bg-blue-500/20 text-blue-300 border-none text-[8px] font-black uppercase">
                                  {evt.extra.result}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {evt.type === 'substitution' && (
                                <>
                                  {evt.extra?.player_out_name ? `Sortie: ${evt.extra.player_out_name}` : ''}
                                  {evt.extra?.player_in_name ? ` → Entrée: ${evt.extra.player_in_name}` : ''}
                                </>
                              )}
                              {evt.type === 'goal' && evt.extra?.related_name && (
                                <>Passeur : {evt.extra.related_name}</>
                              )}
                              {evt.extra?.comment && (
                                <span className="italic ml-1 text-slate-500">"{evt.extra.comment}"</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Event Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditEvent(evt)}
                            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                            title="Modifier cet événement"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm('Voulez-vous vraiment supprimer cet événement ?')) {
                                await onDeleteEvent(evt.id);
                                toast.success('Événement supprimé');
                              }
                            }}
                            className="w-9 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
                            title="Supprimer cet événement"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EVALUATION & SCOUTING (FUS Players only) */}
          {activeTab === 'evaluation' && !isOpponent && (
            <div className="p-6 sm:p-8 space-y-6 max-h-[62vh] overflow-y-auto custom-scrollbar">
              <div className="bg-slate-950 p-6 rounded-3xl border border-white/10 text-center space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Note Globale de Performance Match
                </p>

                <div className="flex items-center justify-center gap-3">
                  <span className="text-5xl font-black italic tracking-tighter text-amber-400 tabular-nums">
                    {ratingValue.toFixed(1)}
                  </span>
                  <span className="text-xl font-bold text-slate-500">/ 10</span>
                </div>

                {/* Star Row */}
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(starIndex => (
                    <button
                      key={starIndex}
                      type="button"
                      onClick={() => setRatingValue(starIndex)}
                      className="p-1 group hover:scale-125 transition-transform"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          ratingValue >= starIndex
                            ? 'text-amber-400 fill-amber-400'
                            : ratingValue >= starIndex - 0.5
                            ? 'text-amber-400 fill-amber-400/50'
                            : 'text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* Rating Slider */}
                <div className="px-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.1"
                    value={ratingValue}
                    onChange={e => setRatingValue(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                <p className="text-[11px] font-bold text-slate-300">
                  {ratingValue >= 8.5
                    ? '🌟 Prestation Exceptionnelle (Top Player)'
                    : ratingValue >= 7.0
                    ? '⭐ Très Bon Match (Régulier & Efficace)'
                    : ratingValue >= 5.5
                    ? '⚡ Match Correct (Dans la moyenne)'
                    : '⚠️ Prestation Insuffisante (Difficultés techniques)'}
                </p>
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block px-1">
                  Commentaire & Recommandation Scouting
                </label>
                <textarea
                  rows={3}
                  value={ratingComment}
                  onChange={e => setRatingComment(e.target.value)}
                  placeholder="Points forts observés, axes de progression, vision du jeu, comportement..."
                  className="w-full p-4 rounded-2xl bg-slate-950 border border-white/20 font-medium text-xs text-white outline-none focus:border-amber-400 resize-none custom-scrollbar"
                />
              </div>

              {/* Deep Evaluation Trigger */}
              {onOpenDeepEvaluation && (
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between gap-4">
                  <div>
                    <h5 className="text-xs font-black uppercase text-indigo-300">
                      Grille d'Évaluation Approfondie (4 Piliers)
                    </h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Technique (11 critères), Tactique (7), Physique (7), Mental (6).
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDeepEvaluation(player);
                    }}
                    className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase shrink-0"
                  >
                    <Sliders className="w-3.5 h-3.5 mr-1.5" />
                    Grille Complète
                  </Button>
                </div>
              )}

              {/* Save rating button */}
              <Button
                onClick={handleSavePlayerRating}
                disabled={isSavingRating}
                className="w-full h-14 rounded-2xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2"
              >
                {isSavingRating ? (
                  <span>Enregistrement en cours...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Sauvegarder l'évaluation ({ratingValue}/10)</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PlayerActionHubModal;
