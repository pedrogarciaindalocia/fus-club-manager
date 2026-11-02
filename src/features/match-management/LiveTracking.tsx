import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useMatches } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useClubData } from '../../hooks/useClubData';
import { useTeams } from '../../hooks/useTeams';
import { useMatchEvents } from '../../hooks/useMatchEvents';
import { useOpponentPlayers } from '../../hooks/useOpponentPlayers';
import { usePermissions } from '../../context/PermissionsContext';
import { inferMatchFormat } from './tacticalFormations';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Play, 
  StopCircle, 
  Goal, 
  RotateCw, 
  X, 
  Shield,
  Activity,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Edit2,
  Plus,
  AlertCircle,
  ArrowLeftRight,
  Pause,
  Timer,
  Clock,
  Hourglass,
  Trophy,
  SkipForward,
  CheckCircle2,
  Target,
  Save,
  Radio,
  History
} from 'lucide-react';
import { AuditLogger } from '../../services/auditLogger';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import type { MatchStatus } from '../../types';

type TimeUnit = 'seconds' | 'minutes' | '15min';
type MatchPhase = 'first_half' | 'halftime' | 'second_half' | 'extra_time_first' | 'extra_time_second' | 'penalties' | 'finished';

// Match timing configuration interface
interface MatchTimingConfig {
  halfDurationMinutes: number;
  enableExtraTime: boolean;
  enablePenalties: boolean;
}

const LiveTracking: React.FC<{ matchId: string; onMatchFinished?: () => Promise<void> | void }> = ({ matchId, onMatchFinished }) => {
  const { matches, updateMatch } = useMatches();
  const { players } = usePlayers();
  const { mainClub, opponentClubs } = useClubData();
  const { teams } = useTeams();
  const { can, authState } = usePermissions();
  const { events, addEvent: addEventHook, updateEvent: updateEventHook, deleteEvent: deleteEventHook } = useMatchEvents(matchId);
  
  const match = matches.find(m => m.id === matchId);
  const { players: opponentPlayers } = useOpponentPlayers(match?.opponent_id, match?.category);

  const isSuperAdmin = Boolean(authState?.isRealSuperAdmin || authState?.user?.system_role === 'super_admin');
  const currentUserId = authState?.user?.id;
  const operatorId = (match as any)?.live_operator_id;
  const operatorName = (match as any)?.live_operator_name;
  const isDesignatedOperator = Boolean(currentUserId && operatorId && currentUserId === operatorId);
  const canOperateThisMatch = isSuperAdmin || (operatorId ? isDesignatedOperator : isSuperAdmin);
  const currentOpName = operatorName || authState?.user?.name || authState?.user?.email?.split('@')[0] || 'Opérateur';

  const getMatchLabel = useCallback(() => {
    if (!match) return 'Match Live';
    const opponent = opponentClubs.find(c => c.id === match.opponent_id);
    const home = match.is_home ? (mainClub?.club_name || 'FUS') : (opponent?.name || 'Adversaire');
    const away = match.is_home ? (opponent?.name || 'Adversaire') : (mainClub?.club_name || 'FUS');
    return `${home} vs ${away}${match.category ? ` (${match.category})` : ''}`;
  }, [match, opponentClubs, mainClub]);

  // --- Historique des Opérations Live ---
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [matchAuditLogs, setMatchAuditLogs] = useState<any[]>([]);
  const [loadingMatchLogs, setLoadingMatchLogs] = useState(false);

  const loadMatchAuditLogs = useCallback(async () => {
    if (!matchId) return;
    setLoadingMatchLogs(true);
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .or(`entity_id.eq.${matchId},metadata->>match_id.eq.${matchId}`)
        .order('created_at', { ascending: false })
        .limit(100);
      if (data) setMatchAuditLogs(data);
    } catch (_) {}
    finally { setLoadingMatchLogs(false); }
  }, [matchId]);

  useEffect(() => {
    loadMatchAuditLogs();
    const ch = supabase
      .channel(`live_audit_${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          const l = payload.new as any;
          if (l.entity_id === matchId || l.metadata?.match_id === matchId) {
            setMatchAuditLogs(prev => [l, ...prev.filter(x => x.id !== l.id)]);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [matchId, loadMatchAuditLogs]);

  // --- Match Configuration ---
  const matchConfig: MatchTimingConfig = {
    halfDurationMinutes: match?.half_duration_minutes || 45,
    enableExtraTime: match?.enable_extra_time || false,
    enablePenalties: match?.enable_penalties || false
  };

  // Calculate total match duration based on configuration
  const calculateTotalDuration = useCallback(() => {
    const halfSeconds = matchConfig.halfDurationMinutes * 60;
    let total = halfSeconds * 2; // Regular 2 halves
    if (matchConfig.enableExtraTime) {
      total += halfSeconds; // Extra time is typically same duration
    }
    return total;
  }, [matchConfig]);

  const getMatchLiveElapsed = (m: any) => {
    let el = m?.time_elapsed_seconds || 0;
    const startIso = m?.live_started_at || m?.kickoff_at;
    if (m?.status === 'live' && startIso) {
      const delta = Math.max(0, Math.floor((Date.now() - new Date(startIso).getTime()) / 1000));
      if (delta > 0 && delta < 7200) {
        el = Math.max(el, delta);
      }
    }
    return el;
  };

  const initialElapsed = getMatchLiveElapsed(match);

  // --- Timeline State ---
  const [zoom, setZoom] = useState(1);
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('minutes');
  const [cursorTime, setCursorTime] = useState(initialElapsed);
  const [matchDuration, setMatchDuration] = useState(calculateTotalDuration()); 
  const timelineRef = useRef<HTMLDivElement>(null);

  // --- Match Phase & Timing State ---
  const [matchPhase, setMatchPhase] = useState<MatchPhase>(() => {
    if (match?.status === 'finished') return 'finished';
    if (match?.status === 'extra_time') return 'extra_time_first';
    if (match?.status === 'penalties') return 'penalties';
    if (match?.status === 'halftime') return 'halftime';
    if (match?.status === 'live') return match?.current_half === 2 ? 'second_half' : 'first_half';
    return 'first_half';
  });

  // Per-half elapsed seconds
  const [phaseElapsedSeconds, setPhaseElapsedSeconds] = useState(0);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(initialElapsed);
  const [isActive, setIsActive] = useState(
    match?.status === 'live' && (initialElapsed > 0 || Boolean((match as any)?.live_started_at || match?.kickoff_at)) && match?.live_period !== 'pre_match'
  );
  const [isPaused, setIsPaused] = useState(match?.status === 'paused');
  const isWaitingKickoff = match?.status === 'live' && totalElapsedSeconds === 0 && !((match as any)?.live_started_at || match?.kickoff_at) && !isActive;
  
  // Scores
  const [homeScore, setHomeScore] = useState(match?.score_home || 0);
  const [awayScore, setAwayScore] = useState(match?.score_away || 0);
  
  // Penalty shootout scores
  const [penaltyHomeScore, setPenaltyHomeScore] = useState(match?.penalty_score_home || 0);
  const [penaltyAwayScore, setPenaltyAwayScore] = useState(match?.penalty_score_away || 0);

  // Added time (injury time) for each half
  const [addedTime, setAddedTime] = useState({
    firstHalf: match?.added_time_first_half || 0,
    secondHalf: match?.added_time_second_half || 0,
    extraFirst: 0,
    extraSecond: 0
  });

  // Lost time tracking (for pause calculations)
  const [lostTime, setLostTime] = useState(0);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);

  // Half-time and end-of-match modals
  const [isHalfTimeModalOpen, setIsHalfTimeModalOpen] = useState(false);
  const [isEndOfMatchModalOpen, setIsEndOfMatchModalOpen] = useState(false);
  const [currentHalf, setCurrentHalf] = useState(match?.current_half || 1);

  // --- Modals ---
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
  const [isAddedTimeModalOpen, setIsAddedTimeModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedAssistId, setSelectedAssistId] = useState('');
  const [selectedPlayerInId, setSelectedPlayerInId] = useState('');
  const [isOpponentAction, setIsOpponentAction] = useState(false);
  const [showGoalAnim, setShowGoalAnim] = useState(false);
  const [tempAddedTime, setTempAddedTime] = useState(0);

  // --- Timer Effect ---
  useEffect(() => {
    let interval: any = null;
    if (isActive && !isPaused) {
      interval = setInterval(() => {
        const halfSeconds = matchConfig.halfDurationMinutes * 60;
        const maxAutoEndSeconds = (matchConfig.halfDurationMinutes * 2 + 30) * 60; // Dépassement max de 30 min (ex: 120 min = 7200s)

        setPhaseElapsedSeconds(s => {
          const next = s + 1;
          // Check for end of half
          if (currentHalf === 1 && next >= halfSeconds && !isHalfTimeModalOpen) {
            // End of first half
            setIsActive(false);
            setIsHalfTimeModalOpen(true);
            return halfSeconds;
          }
          if (currentHalf === 2 && next >= halfSeconds * 2 && !isEndOfMatchModalOpen) {
            // End of regular time (90 min)
            setIsActive(false);
            setIsEndOfMatchModalOpen(true);
            return halfSeconds * 2;
          }
          return next;
        });
        setTotalElapsedSeconds(s => {
          const next = s + 1;
          setCursorTime(next);

          // RÈGLE AUTO-TERMINAISON (+30 min après temps réglementaire)
          if (next >= maxAutoEndSeconds) {
            setIsActive(false);
            toast.warning("Délai maximal atteint (+30 min après temps réglementaire). Le match est automatiquement terminé.");
            updateMatch({
              id: matchId,
              data: {
                status: 'finished',
                live_period: 'finished',
                score_home: homeScore,
                score_away: awayScore,
                time_elapsed_seconds: next,
                current_half: currentHalf,
                updated_at: new Date().toISOString()
              }
            });
            onMatchFinished?.();
          }

          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, currentHalf, matchConfig.halfDurationMinutes, isHalfTimeModalOpen, isEndOfMatchModalOpen, homeScore, awayScore, matchId, onMatchFinished, updateMatch]);

  // Sync with match data - only update if values changed to prevent infinite loop
  useEffect(() => {
    if (match) {
      setHomeScore(prev => prev !== (match.score_home ?? 0) ? match.score_home ?? 0 : prev);
      setAwayScore(prev => prev !== (match.score_away ?? 0) ? match.score_away ?? 0 : prev);
      setPenaltyHomeScore(prev => prev !== (match.penalty_score_home ?? 0) ? match.penalty_score_home ?? 0 : prev);
      setPenaltyAwayScore(prev => prev !== (match.penalty_score_away ?? 0) ? match.penalty_score_away ?? 0 : prev);
      const computedElapsed = getMatchLiveElapsed(match);
      setTotalElapsedSeconds(prev => Math.max(prev, computedElapsed));
      setCursorTime(prev => Math.max(prev, computedElapsed));
      setAddedTime(prev => ({
        firstHalf: match.added_time_first_half ?? 0,
        secondHalf: match.added_time_second_half ?? 0,
        extraFirst: 0,
        extraSecond: 0
      }));
      // Calculate duration inline to avoid dependency issues
      const halfSeconds = (match?.half_duration_minutes || 45) * 60;
      let newDuration = halfSeconds * 2;
      if (match?.enable_extra_time) {
        newDuration += halfSeconds;
      }
      setMatchDuration(prev => prev !== newDuration ? newDuration : prev);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id, match?.score_home, match?.score_away, match?.penalty_score_home, match?.penalty_score_away, match?.time_elapsed_seconds, match?.added_time_first_half, match?.added_time_second_half, match?.half_duration_minutes, match?.enable_extra_time]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    let absoluteTime = percentage * matchDuration;
    
    const snap = timeUnit === 'seconds' ? 1 : timeUnit === 'minutes' ? 60 : 900;
    absoluteTime = Math.round(absoluteTime / snap) * snap;
    setCursorTime(Math.max(0, Math.min(absoluteTime, matchDuration)));
  };

  const handleActionClick = (type: string, isOpponent: boolean) => {
    setEditingEventId(null);
    setEventType(type);
    setIsOpponentAction(isOpponent);
    setSelectedPlayerId(isOpponent ? (type === 'substitution' ? '' : (opponentPlayers.length > 0 ? opponentPlayers[0].id : 'OPPONENT-1')) : '');
    setSelectedPlayerInId('');
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: any) => {
     setEditingEventId(event.id);
     setEventType(event.type);
     const isOpp = event.extra?.team === 'away' || !!event.extra?.opponent_ref || (!event.player_id && !event.playerId);
     setIsOpponentAction(isOpp);
     setSelectedPlayerId(event.player_id || event.extra?.player_out_name || event.extra?.opponent_ref || '');
     setSelectedAssistId(event.related_player_id || '');
     setSelectedPlayerInId(event.related_player_id || event.extra?.player_in_id || event.extra?.player_in_name || '');
     setCursorTime(event.extra?.timestamp_seconds || event.minute * 60);
     setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async (id: string) => {
     if (confirm('Supprimer cet événement ?')) {
        const evt = events.find(e => e.id === id);
        await deleteEventHook(id);
        void AuditLogger.logLiveMatchOperation({
          matchId,
          matchLabel: getMatchLabel(),
          action: 'DELETE',
          description: `Événement ${evt?.type || 'action'} (${evt?.minute || 0}') supprimé par ${currentOpName}`,
          operatorName: currentOpName,
          minute: evt?.minute || 0,
          score: `${homeScore} - ${awayScore}`,
          period: matchPhase,
          metadata: { event_id: id, event_type: evt?.type }
        });
        loadMatchAuditLogs();
     }
  };

  const saveEvent = async () => {
    if (!eventType || !matchId || (!selectedPlayerId && eventType !== 'substitution')) return;

    const isOpponent = isOpponentAction || selectedPlayerId?.startsWith('OPPONENT-') || opponentPlayers.some(p => p.id === selectedPlayerId);
    
    let outPlayerName = '';
    let inPlayerName = '';
    if (eventType === 'substitution' && isOpponent) {
      const oppOutP = opponentPlayers.find(p => p.id === selectedPlayerId);
      outPlayerName = oppOutP ? `#${oppOutP.jersey_number ?? '?'} ${oppOutP.full_name}` : (selectedPlayerId || 'Adversaire sortant');
      const oppInP = opponentPlayers.find(p => p.id === selectedPlayerInId);
      inPlayerName = oppInP ? `#${oppInP.jersey_number ?? '?'} ${oppInP.full_name}` : (selectedPlayerInId || 'Adversaire entrant');
    }

    const playerUuid = isOpponent ? null : (selectedPlayerId || null);
    const relatedUuid = isOpponent ? null : (eventType === 'substitution' ? selectedPlayerInId : selectedAssistId) || null;

    const payload: any = {
      match_id: matchId,
      minute: Math.floor(cursorTime / 60),
      type: eventType,
      player_id: playerUuid,
      related_player_id: relatedUuid,
      extra: { 
        team: isOpponent ? 'away' : 'home',
        player_in_id: !isOpponent ? (selectedPlayerInId || null) : null,
        player_out_name: outPlayerName || null,
        player_in_name: inPlayerName || null,
        opponent_ref: isOpponent ? (selectedPlayerId || 'OPPONENT-SUB') : null,
        timestamp_seconds: cursorTime 
      }
    };

    try {
      if (editingEventId) {
         await updateEventHook({ id: editingEventId, updates: payload });
         void AuditLogger.logLiveMatchOperation({
           matchId,
           matchLabel: getMatchLabel(),
           action: 'UPDATE',
           description: `Événement ${eventType.toUpperCase()} modifié par ${currentOpName} à la ${Math.floor(cursorTime / 60)}e minute`,
           operatorName: currentOpName,
           minute: Math.floor(cursorTime / 60),
           score: `${homeScore} - ${awayScore}`,
           period: matchPhase,
           metadata: payload
         });
      } else {
         await addEventHook(payload);
         const targetPlayer = isOpponent
           ? (inPlayerName || outPlayerName || 'Adversaire')
           : (players.find(p => p.id === playerUuid)?.full_name || 'Joueur FUS');
         void AuditLogger.logLiveMatchOperation({
           matchId,
           matchLabel: getMatchLabel(),
           action: 'CREATE',
           description: `${eventType.toUpperCase()} enregistré par ${currentOpName} : ${targetPlayer} (${isOpponent ? 'Adversaire' : 'FUS'}) à la ${Math.floor(cursorTime / 60)}e minute`,
           operatorName: currentOpName,
           minute: Math.floor(cursorTime / 60),
           score: `${homeScore} - ${awayScore}`,
           period: matchPhase,
           metadata: { ...payload, player_name: targetPlayer }
         });

         if (eventType === 'goal') {
            const weScored = !isOpponent;
            const updateHome = match.is_home ? weScored : !weScored;
            
            if (updateHome) {
               const ns = (match.score_home ?? 0) + 1;
               await updateMatch({ id: matchId, data: { score_home: ns } });
               setHomeScore(ns);
            } else {
               const ns = (match.score_away ?? 0) + 1;
               await updateMatch({ id: matchId, data: { score_away: ns } });
               setAwayScore(ns);
            }
            setShowGoalAnim(true);
            setTimeout(() => setShowGoalAnim(false), 3000);
         }
      }
      loadMatchAuditLogs();
      setIsEventModalOpen(false);
      resetModal();
    } catch (e) {
      console.error(e);
    }
  };

  // --- Disciplinary Tracking ---
  const sentOffPlayerIds = React.useMemo(() => {
    const yellowCounts: Record<string, number> = {};
    const sentOff = new Set<string>();
    
    events.forEach(e => {
      if (!e.player_id) return;
      if (e.type === 'red_card') sentOff.add(e.player_id);
      if (e.type === 'yellow_card') {
        yellowCounts[e.player_id] = (yellowCounts[e.player_id] || 0) + 1;
        if (yellowCounts[e.player_id] >= 2) sentOff.add(e.player_id);
      }
    });

    return sentOff;
  }, [events]);

  const handleKickoff = async () => {
    if (!canOperateThisMatch) {
      toast.error(
        operatorId
          ? `Accès restreint : Seul l'opérateur désigné (${operatorName || 'Assigné'}) ou le Super Admin peut lancer le direct.`
          : "Accès restreint : Aucun opérateur assigné à ce match. Seul le Super Admin a les commandes."
      );
      return;
    }

    // Règle Anti-Conflit Simultané : Impossible de déclencher deux matchs en direct de la même catégorie
    if (match?.category) {
      const { data: conflicting } = await supabase
        .from('matches')
        .select('id, category')
        .eq('status', 'live')
        .eq('category', match.category)
        .neq('id', matchId)
        .limit(1);

      if (conflicting && conflicting.length > 0) {
        toast.error(`⚠️ Conflit de direct simultané : Un match de catégorie ${match.category} est déjà en cours de diffusion en direct. Terminez le direct en cours avant d'en lancer un nouveau.`);
        return;
      }
    }

    setIsActive(true);
    setIsPaused(false);
    setPhaseElapsedSeconds(0);
    setMatchPhase('first_half');
    const nowIso = new Date().toISOString();
    await updateMatch({
      id: matchId,
      data: {
        status: 'live',
        live_period: 'first_half',
        current_half: 1,
        time_elapsed_seconds: 0,
        kickoff_at: nowIso,
        live_started_at: nowIso,
        updated_at: nowIso
      }
    });
    void AuditLogger.logLiveMatchOperation({
      matchId,
      matchLabel: getMatchLabel(),
      action: 'START_LIVE',
      description: `Coup d'envoi donné par ${currentOpName} (00:00)`,
      operatorName: currentOpName,
      minute: 0,
      score: '0-0',
      period: 'first_half',
      metadata: { kickoff_at: nowIso }
    });
    loadMatchAuditLogs();
    toast.success("⚽ Coup d'envoi donné ! Le match passe en direct et le chronomètre officiel est lancé.");
  };

  const handleStart = async () => {
    if (!canOperateThisMatch) {
      toast.error(
        operatorId
          ? `Accès restreint : Seul l'opérateur désigné (${operatorName || 'Assigné'}) ou le Super Admin peut piloter ce match.`
          : "Accès restreint : Aucun opérateur assigné à ce match. Seul le Super Admin a les commandes."
      );
      return;
    }
    if (isWaitingKickoff || match?.status === 'scheduled') {
      await handleKickoff();
      return;
    }

    // Règle Anti-Conflit Simultané
    if (match?.category) {
      const { data: conflicting } = await supabase
        .from('matches')
        .select('id, category')
        .eq('status', 'live')
        .eq('category', match.category)
        .neq('id', matchId)
        .limit(1);

      if (conflicting && conflicting.length > 0) {
        toast.error(`⚠️ Conflit de direct simultané : Un match de catégorie ${match.category} est déjà en cours de diffusion en direct.`);
        return;
      }
    }

    setIsActive(true);
    setIsPaused(false);
    // If resuming from pause, calculate lost time
    if (pauseStartTime) {
      const pausedDuration = Math.floor((Date.now() - pauseStartTime) / 1000);
      setLostTime(prev => prev + pausedDuration);
      setPauseStartTime(null);
    }
    // Update match status to live
    await updateMatch({
      id: matchId,
      data: {
        status: 'live',
        live_period: currentHalf === 2 ? 'second_half' : 'first_half',
        current_half: currentHalf,
        updated_at: new Date().toISOString()
      }
    });
    void AuditLogger.logLiveMatchOperation({
      matchId,
      matchLabel: getMatchLabel(),
      action: 'RESUME_LIVE',
      description: `Chronomètre repris par ${currentOpName} (${formatTime(totalElapsedSeconds)})`,
      operatorName: currentOpName,
      minute: Math.floor(totalElapsedSeconds / 60),
      score: `${homeScore} - ${awayScore}`,
      period: currentHalf === 2 ? 'second_half' : 'first_half'
    });
    loadMatchAuditLogs();
  };

  const handlePause = () => {
    if (!canOperateThisMatch) {
      toast.error("Action réservée à l'opérateur désigné ou au Super Admin.");
      return;
    }
    setIsActive(false);
    setPauseStartTime(Date.now());
    void AuditLogger.logLiveMatchOperation({
      matchId,
      matchLabel: getMatchLabel(),
      action: 'PAUSE_LIVE',
      description: `Chronomètre mis en pause par ${currentOpName} (${formatTime(totalElapsedSeconds)})`,
      operatorName: currentOpName,
      minute: Math.floor(totalElapsedSeconds / 60),
      score: `${homeScore} - ${awayScore}`,
      period: matchPhase
    });
    loadMatchAuditLogs();
  };

  const handleStartSecondHalf = async () => {
    if (!canOperateThisMatch) {
      toast.error("Action réservée à l'opérateur désigné ou au Super Admin.");
      return;
    }
    setCurrentHalf(2);
    setPhaseElapsedSeconds(0);
    setMatchPhase('second_half');
    setIsHalfTimeModalOpen(false);
    setIsActive(true);
    await updateMatch({
      id: matchId,
      data: {
        current_half: 2,
        status: 'live'
      }
    });
    void AuditLogger.logLiveMatchOperation({
      matchId,
      matchLabel: getMatchLabel(),
      action: 'PERIOD_CHANGE',
      description: `Coup d'envoi 2ème mi-temps lancé par ${currentOpName}`,
      operatorName: currentOpName,
      minute: Math.floor(totalElapsedSeconds / 60),
      score: `${homeScore} - ${awayScore}`,
      period: 'second_half'
    });
    loadMatchAuditLogs();
  };

  const handleStartExtraTime = async () => {
    if (!canOperateThisMatch) {
      toast.error("Action réservée à l'opérateur désigné ou au Super Admin.");
      return;
    }
    setCurrentHalf(3);
    setPhaseElapsedSeconds(0);
    setMatchPhase('extra_time_first');
    setIsEndOfMatchModalOpen(false);
    setIsActive(true);
    await updateMatch({
      id: matchId,
      data: {
        current_half: 3,
        status: 'extra_time'
      }
    });
    void AuditLogger.logLiveMatchOperation({
      matchId,
      matchLabel: getMatchLabel(),
      action: 'PERIOD_CHANGE',
      description: `Prolongations démarrées par ${currentOpName}`,
      operatorName: currentOpName,
      minute: Math.floor(totalElapsedSeconds / 60),
      score: `${homeScore} - ${awayScore}`,
      period: 'extra_time_first'
    });
    loadMatchAuditLogs();
  };

  const handleStartPenalties = async () => {
    setMatchPhase('penalties');
    setIsEndOfMatchModalOpen(false);
    setIsPenaltyModalOpen(true);
    await updateMatch({
      id: matchId,
      data: {
        status: 'penalties'
      }
    });
    void AuditLogger.logLiveMatchOperation({
      matchId,
      matchLabel: getMatchLabel(),
      action: 'PERIOD_CHANGE',
      description: `Passage aux tirs au but validé par ${currentOpName}`,
      operatorName: currentOpName,
      minute: Math.floor(totalElapsedSeconds / 60),
      score: `${homeScore} - ${awayScore}`,
      period: 'penalties'
    });
    loadMatchAuditLogs();
  };
  const handleStop = async () => {
     setIsActive(false);
     if (confirm('Terminer ce match et archiver les statistiques ?')) {
        await updateMatch({
          id: matchId,
          data: {
            status: 'finished',
            score_home: homeScore,
            score_away: awayScore,
            time_elapsed_seconds: totalElapsedSeconds,
            current_half: currentHalf,
          }
        });
        void AuditLogger.logLiveMatchOperation({
          matchId,
          matchLabel: getMatchLabel(),
          action: 'END_MATCH',
          description: `Match clôturé par ${currentOpName} avec le score final ${homeScore} - ${awayScore}`,
          operatorName: currentOpName,
          minute: Math.floor(totalElapsedSeconds / 60),
          score: `${homeScore} - ${awayScore}`,
          period: 'finished',
          metadata: { score_home: homeScore, score_away: awayScore }
        });
        loadMatchAuditLogs();
        await onMatchFinished?.();
     }
  };

  const resetModal = () => {
    setEditingEventId(null);
    setEventType(null);
    setSelectedPlayerId('');
    setSelectedAssistId('');
    setSelectedPlayerInId('');
    setIsOpponentAction(false);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- Match Configuration Modal State ---
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [tempHalfDuration, setTempHalfDuration] = useState(matchConfig.halfDurationMinutes);
  const [tempEnableExtraTime, setTempEnableExtraTime] = useState(matchConfig.enableExtraTime);
  const [tempEnablePenalties, setTempEnablePenalties] = useState(matchConfig.enablePenalties);
  const updateMatchConfig = async () => {
    await updateMatch({
      id: matchId,
      data: {
        half_duration_minutes: tempHalfDuration,
        enable_extra_time: tempEnableExtraTime,
        enable_penalties: tempEnablePenalties,
      }
    });
    setIsConfigModalOpen(false);
  };

  // --- Penalty Shootout System ---
  const [penaltyShots, setPenaltyShots] = useState<Array<{
    id: string;
    team: 'home' | 'away';
    playerNumber: number;
    result: 'scored' | 'missed' | 'saved';
    minute: number;
  }>>([]);

  // Load penalty shots from events on mount
  useEffect(() => {
    const shots = events
      .filter(e => (e.extra as any)?.is_penalty_shootout)
      .map((e, idx) => ({
        id: `penalty-${idx}`,
        team: (e.extra as any)?.team || 'home',
        playerNumber: (e.extra as any)?.player_number || 0,
        result: (e.type === 'penalty' ? 'scored' : (e.extra as any)?.result || 'missed') as 'scored' | 'missed' | 'saved',
        minute: e.minute
      }));
    setPenaltyShots(shots);
  }, [events]);

  const addPenaltyShot = async (team: 'home' | 'away', playerNumber: number, result: 'scored' | 'missed' | 'saved') => {
    // Update score
    if (result === 'scored') {
      if (team === 'home') {
        const newScore = penaltyHomeScore + 1;
        setPenaltyHomeScore(newScore);
        await updateMatch({ id: matchId, data: { penalty_score_home: newScore } });
      } else {
        const newScore = penaltyAwayScore + 1;
        setPenaltyAwayScore(newScore);
        await updateMatch({ id: matchId, data: { penalty_score_away: newScore } });
      }
    }

    // Add to timeline as event
    await addEventHook({
      match_id: matchId,
      minute: Math.floor(totalElapsedSeconds / 60),
      type: result === 'scored' ? 'penalty' : 'missed_penalty',
      player_id: null,
      related_player_id: null,
      extra: {
        team,
        player_number: playerNumber,
        result,
        timestamp_seconds: totalElapsedSeconds,
        is_penalty_shootout: true
      }
    });

    const currentTabScore = `TAB ${team === 'home' && result === 'scored' ? penaltyHomeScore + 1 : penaltyHomeScore}-${team === 'away' && result === 'scored' ? penaltyAwayScore + 1 : penaltyAwayScore}`;
    void AuditLogger.logLiveMatchOperation({
      matchId,
      matchLabel: getMatchLabel(),
      action: 'CREATE',
      description: `Tir au but ${team === 'home' ? 'Home' : 'Away'} #${playerNumber} : ${result === 'scored' ? 'Marqué ✅' : 'Manqué ❌'} (${currentTabScore}) par ${currentOpName}`,
      operatorName: currentOpName,
      score: currentTabScore,
      period: 'penalties',
      metadata: { team, playerNumber, result }
    });
    loadMatchAuditLogs();
  };

  // Calculate match phase for visual timeline
  const getMatchPhaseInfo = () => {
    const halfSeconds = matchConfig.halfDurationMinutes * 60;
    const regularEnd = halfSeconds * 2;
    const extraEnd = regularEnd + (matchConfig.enableExtraTime ? halfSeconds * 2 : 0);

    if (totalElapsedSeconds <= halfSeconds) return { phase: '1ère MT', icon: '⏱️', color: 'bg-blue-500' };
    if (totalElapsedSeconds <= regularEnd) return { phase: '2ème MT', icon: '⏱️', color: 'bg-blue-600' };
    if (matchConfig.enableExtraTime && totalElapsedSeconds <= extraEnd) return { phase: 'Prolong.', icon: '⚡', color: 'bg-amber-500' };
    if (matchConfig.enablePenalties) return { phase: 'Penalties', icon: '🎯', color: 'bg-purple-500' };
    return { phase: 'Terminé', icon: '✓', color: 'bg-emerald-500' };
  };

  const phaseInfo = getMatchPhaseInfo();

  if (!match) return null;

  const validStarters = (match.lineup?.startingXI || []).filter(id => id && id.trim() !== '');
  const validSubs = (match.lineup?.substitutes || []).filter(id => id && id.trim() !== '');
  const hasValidLineup = validStarters.length > 0 || validSubs.length > 0;

  const currentLineup = hasValidLineup ? players.filter(p => validStarters.includes(p.id)) : players;
  const bench = hasValidLineup ? players.filter(p => validSubs.includes(p.id)) : [];
  const opponent = opponentClubs.find(c => c.id === match.opponent_id);

  // Résolution jersey porté pour ce match spécifique (override > jersey global)
  const matchJerseyOverrides: Record<string, number> = (match as any).lineup?.jerseyOverrides ?? {};
  const getJersey = (p: { id: string; jersey_number?: number | null }) =>
    matchJerseyOverrides[p.id] ?? p.jersey_number;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1600px] mx-auto px-8 py-10 space-y-8">
        
        {/* Bannière Opérateur Live & Privilèges */}
        {operatorName ? (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center font-black">
                🎙️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">Opérateur Live Désigné : {operatorName}</span>
                  {isDesignatedOperator && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ⭐ C'est vous
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {canOperateThisMatch
                    ? "Vous disposez des droits complets d'intervention et de saisie sur ce match."
                    : "Vous êtes en mode consultation seule. Seul cet opérateur ou le Super Admin peut intervenir."}
                </p>
              </div>
            </div>
            {!canOperateThisMatch && (
              <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Mode Consultation Seule
              </span>
            )}
          </div>
        ) : (
          !isSuperAdmin && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Aucun opérateur n'a été désigné pour ce match :</strong> Seul le <strong>Super Administrateur</strong> a les commandes de gestion et de déclenchement du direct.
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                Lecture Seule
              </span>
            </div>
          )
        )}

        {/* Scoreboard Header */}
        {(() => {
          // Left = home team, Right = away team (standard convention)
          const leftLogo  = match.is_home ? mainClub?.logo_url  : opponent?.logo_url;
          const leftName  = match.is_home ? mainClub?.club_name : opponent?.name;
          const leftScore = homeScore; // score_home always belongs to the home team (left)
          const rightLogo  = match.is_home ? opponent?.logo_url  : mainClub?.logo_url;
          const rightName  = match.is_home ? opponent?.name      : mainClub?.club_name;
          const rightScore = awayScore; // score_away always belongs to the away team (right)
          return (
        <div className="bg-slate-950 text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden flex items-center justify-between">
           {/* Home team (left) */}
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2 border-4 border-white/5 shadow-xl">
                 {leftLogo ? <img src={leftLogo} className="w-full h-full object-contain" /> : <Shield className="w-8 h-8 text-primary" />}
              </div>
              <div className="space-y-2">
                 <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">{leftName}</h2>
                 <div className="flex items-center gap-2">
                    <Badge className="bg-primary text-[8px] font-black uppercase px-2 h-4 border-none shadow-sm">HOME</Badge>
                    {match.category && (
                       <Badge variant="outline" className="text-[8px] font-black uppercase px-2 h-4 text-white/80 border-white/20 bg-white/5">
                          {match.category}
                       </Badge>
                    )}
                    {match.team_id && (
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-1">
                          {teams?.find(t => t.id === match.team_id)?.name}
                       </span>
                    )}
                 </div>
              </div>
           </div>

           {/* Score */}
           <div className="flex flex-col items-center">
              <div className="flex items-center gap-6">
                 <span className="text-7xl font-black italic tabular-nums text-primary leading-none">{leftScore}</span>
                 <div className="flex flex-col items-center">
                    <span className="text-lg font-black opacity-10 uppercase">v</span>
                    <div className="bg-white/5 px-3 py-1 rounded-xl border border-white/10 mt-1">
                       <span className="text-sm font-black tabular-nums italic text-slate-300">{formatTime(isActive ? totalElapsedSeconds : cursorTime)}</span>
                    </div>
                    {matchPhase === 'penalties' && (
                       <div className="bg-purple-500/20 px-3 py-1 rounded-xl border border-purple-400/30 mt-1">
                          <span className="text-sm font-black tabular-nums italic text-purple-300">
                             PENS: {penaltyHomeScore} - {penaltyAwayScore}
                          </span>
                       </div>
                    )}
                 </div>
                 <span className="text-7xl font-black italic tabular-nums leading-none">{rightScore}</span>
              </div>
           </div>

           {/* Away team (right) */}
           <div className="flex items-center gap-6 text-right">
              <div className="space-y-1">
                 <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">{rightName}</h2>
                 <Badge variant="outline" className="text-[8px] font-black uppercase px-2 h-4 text-slate-500 border-slate-700">AWAY</Badge>
              </div>
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2 border-4 border-white/5 shadow-xl">
                 {rightLogo ? <img src={rightLogo} className="w-full h-full object-contain" /> : <Shield className="w-8 h-8 text-slate-300" />}
              </div>
           </div>
        </div>
          );
        })()}

        {/* MINIMIZED DUAL-TRACK TIMELINE */}
        <div className="bg-white rounded-[4rem] border-2 border-slate-100 p-10 space-y-8 shadow-sm relative overflow-hidden">
           
           {/* Timeline Header Controls */}
           <div className="flex items-center justify-between pb-6 border-b border-slate-50">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center shadow-lg">
                    <Activity className="w-5 h-5 text-primary" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">Tactical Dual-Track</h3>
                    <div className="flex items-center gap-2 mt-1">
                       <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white ${phaseInfo.color}`}>
                          {phaseInfo.icon} {phaseInfo.phase}
                       </span>
                       <span className="text-[9px] text-slate-400 font-black uppercase">
                          {matchConfig.halfDurationMinutes}min × {matchConfig.enableExtraTime ? '4' : '2'} mi-temps
                          {matchConfig.enablePenalties ? ' + Penalties' : ''}
                       </span>
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 {/* Match Live History Button */}
                 <Button 
                    onClick={() => {
                      loadMatchAuditLogs();
                      setIsHistoryModalOpen(true);
                    }}
                    variant="outline"
                    className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-slate-200 hover:border-red-500 hover:text-red-500 flex items-center gap-2 cursor-pointer shadow-sm"
                 >
                    <History className="w-4 h-4 text-red-500" />
                    Historique Live
                    {matchAuditLogs.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-black text-[9px]">
                        {matchAuditLogs.length}
                      </span>
                    )}
                 </Button>
                 {/* Match Config Button */}
                 <Button 
                    onClick={() => setIsConfigModalOpen(true)}
                    variant="outline"
                    className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-slate-200 hover:border-primary hover:text-primary"
                 >
                    <Timer className="w-4 h-4 mr-2" /> Config Match
                 </Button>
                 {/* Unit Toggle */}
                 <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-sm">
                    {(['seconds', 'minutes'] as const).map(u => (
                       <button key={u} onClick={() => setTimeUnit(u)} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${timeUnit === u ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>{u}</button>
                    ))}
                 </div>

                 {/* Zoom Slider */}
                 <div className="flex items-center gap-6 bg-slate-50 p-3 px-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                       <ZoomOut className="w-4 h-4 text-slate-400" />
                       <input 
                         type="range" 
                         min="1" 
                         max="40" 
                         step="1"
                         value={zoom} 
                         onChange={(e) => setZoom(parseFloat(e.target.value))}
                         className="w-80 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                       />
                       <ZoomIn className="w-4 h-4 text-slate-400" />
                    </div>
                    <Badge variant="outline" className="bg-white border-slate-200 text-primary font-black px-3 py-1 text-xs">
                       {zoom.toFixed(1)}x
                    </Badge>
                 </div>
              </div>
           </div>

           {/* The Dual-Track Layout */}
           <div className="flex bg-slate-50/40 rounded-[3rem] border border-slate-100 shadow-inner overflow-hidden">
              
              {/* FIXED SIDEBAR: LOGOS */}
              <div className="w-24 shrink-0 flex flex-col justify-between py-12 border-r-2 border-slate-100 bg-white shadow-[10px_0_30px_rgba(0,0,0,0.02)] z-30">
                 <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-2xl bg-white border-2 border-primary/10 p-2 shadow-sm">
                       {mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-full h-full text-primary" />}
                    </div>
                    <span className="text-[9px] font-black uppercase text-primary">HOME</span>
                 </div>

                 {/* Intersection indicator for axis */}
                 <div className="h-0.5 w-full bg-slate-200 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-400" />
                 </div>

                 <div className="flex flex-col items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-slate-400">AWAY</span>
                    <div className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-100 p-2 shadow-sm">
                       {opponent?.logo_url ? <img src={opponent.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-full h-full text-slate-300" />}
                    </div>
                 </div>
              </div>

              {/* SCROLLABLE TRACKS */}
              <div className="flex-1 relative overflow-x-auto custom-scrollbar group/scroll bg-white">
                 <div 
                   ref={timelineRef} 
                   onClick={handleTimelineClick}
                   className="relative min-h-[400px] cursor-crosshair py-16 px-16 overflow-visible"
                   style={{ width: `${100 * zoom}%`, minWidth: '100%' }}
                 >
                    {/* PERIOD SEPARATORS */}
                    {[45, 90, 105, 120].map(m => {
                       const pos = (m * 60 / matchDuration) * 100;
                       if (pos > 100) return null;
                       return (
                         <div key={m} className="absolute inset-y-0 w-px border-l-2 border-dashed border-slate-200 z-0" style={{ left: `${pos}%` }}>
                            <div className="absolute top-0 -translate-x-1/2 -translate-y-full bg-slate-100 px-2 py-0.5 rounded text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                               {m === 45 ? 'HALF-TIME' : m === 90 ? 'FULL-TIME' : 'PROLOG.'}
                            </div>
                         </div>
                       );
                    })}

                    {/* Home Track (Top) */}
                    <div className="absolute top-0 left-16 right-16 h-[200px] flex items-center">
                       {events.filter((e: any) => {
                          const isOurEvent = !!e.player_id;
                          return match.is_home ? isOurEvent : !isOurEvent;
                       }).map((e: any) => {
                          const pos = ((e.extra?.timestamp_seconds || e.minute * 60) / matchDuration) * 100;
                          const player = players.find(p => p.id === (e.player_id || e.playerId));
                          const timeStr = formatTime(e.extra?.timestamp_seconds || e.minute * 60);
                          const isCard = e.type.includes('card');
                          const cardColor = e.type === 'yellow_card' ? 'bg-amber-400' : 'bg-red-600';
                          
                          return (
                            <div key={e.id} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group/marker z-40" style={{ left: `${pos}%` }}>
                               <div className="relative flex flex-col items-center">
                                  <div className="absolute top-full w-[2px] h-16 bg-primary/10 group-hover/marker:bg-primary transition-colors" />
                                  <div onClick={(ev) => { ev.stopPropagation(); handleEditEvent(e); }} className={`w-12 h-12 rounded-xl ${isCard ? cardColor : 'bg-white'} border-2 ${isCard ? 'border-white shadow-xl' : 'border-primary'} flex flex-col items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-lg`}>
                                     {e.type === 'goal' ? <div className="w-5 h-5 rounded-full border-2 border-emerald-500 flex items-center justify-center"><div className="w-2 h-2 bg-emerald-500 rounded-full" /></div> : 
                                      e.type === 'substitution' ? <ArrowLeftRight className="w-5 h-5 text-primary" /> :
                                      <div className="w-4 h-6 border border-white/50 rounded-sm" />}
                                     <span className={`text-[8px] font-black ${isCard ? 'text-white/80' : 'text-slate-400'} leading-none mt-0.5`}>{timeStr}</span>
                                  </div>
                                  <div className="absolute bottom-full mb-3 opacity-0 group-hover/marker:opacity-100 transition-all scale-90 group-hover/marker:scale-100 whitespace-nowrap bg-slate-950 text-white text-[11px] font-black px-4 py-2 rounded-2xl shadow-2xl pointer-events-none z-50 flex items-center gap-3">
                                     <div className={`w-2 h-2 rounded-full ${isCard ? cardColor : 'bg-emerald-500'}`} />
                                     <span className="text-primary">{timeStr}</span>
                                     <span className="uppercase text-slate-300">
                                        {e.type === 'substitution' ? (
                                           (() => {
                                              let outName = '';
                                              if (e.player_id) {
                                                 const p = players.find(x => x.id === e.player_id);
                                                 outName = p ? `#${getJersey(p) || '?'} ${p.full_name.split(' ').pop()}` : 'Sortant';
                                              } else if (e.extra?.player_out_name) {
                                                 outName = e.extra.player_out_name;
                                              } else if (e.extra?.opponent_ref) {
                                                 const oppP = opponentPlayers.find(x => x.id === e.extra.opponent_ref);
                                                 outName = oppP ? `#${oppP.jersey_number ?? '?'} ${oppP.full_name.split(' ').pop()}` : `Adversaire #${e.extra.opponent_ref.replace('OPPONENT-', '')}`;
                                              } else {
                                                 outName = 'Sortant';
                                              }

                                              let inName = '';
                                              const inId = e.related_player_id || e.extra?.player_in_id;
                                              if (inId) {
                                                 const p = players.find(x => x.id === inId);
                                                 inName = p ? `#${getJersey(p) || '?'} ${p.full_name.split(' ').pop()}` : 'Entrant';
                                              } else if (e.extra?.player_in_name) {
                                                 inName = e.extra.player_in_name;
                                              } else {
                                                 inName = 'Entrant';
                                              }

                                              return (
                                                 <span className="flex items-center gap-1.5">
                                                    <span className="text-red-400">🔴 {outName}</span>
                                                    <span className="mx-1 text-white/50">→</span>
                                                    <span className="text-emerald-400">🟢 {inName}</span>
                                                 </span>
                                              );
                                           })()
                                        ) : e.player_id ? (
                                           player ? `#${getJersey(player) || '?'} ${player.full_name}` : 'Joueur'
                                        ) : (
                                           e.extra?.opponent_ref ? `Jersey n°${e.extra.opponent_ref.split('-')[1]}` : 'Adversaire'
                                        )}
                                     </span>
                                  </div>
                               </div>
                            </div>
                          );
                       })}
                    </div>

                    {/* CENTRAL AXIS */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-16 right-16 h-1 bg-slate-200 z-10 transition-width">
                       <motion.div className="absolute inset-y-0 left-0 bg-red-600 rounded-full z-20 shadow-[0_0_10px_rgba(220,38,38,0.3)]" animate={{ width: `${(cursorTime / matchDuration) * 100}%` }} />
                       <motion.div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-red-600 border-[4px] border-white rounded-full shadow-2xl z-30 cursor-grab active:cursor-grabbing" animate={{ left: `${(cursorTime / matchDuration) * 100}%` }}>
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-xl border-2 border-white">{formatTime(cursorTime)}</div>
                       </motion.div>
                    </div>

                    {/* Away Track (Bottom) */}
                    <div className="absolute bottom-0 left-16 right-16 h-[200px] flex items-center">
                       {events.filter((e: any) => {
                          const isOurEvent = !!e.player_id;
                          return match.is_home ? !isOurEvent : isOurEvent;
                       }).map((e: any) => {
                          const pos = ((e.extra?.timestamp_seconds || e.minute * 60) / matchDuration) * 100;
                          const player = players.find(p => p.id === (e.player_id || e.playerId));
                          const timeStr = formatTime(e.extra?.timestamp_seconds || e.minute * 60);
                          const isCard = e.type.includes('card');
                          const cardColor = e.type === 'yellow_card' ? 'bg-amber-400' : 'bg-red-600';
                          
                          return (
                            <div key={e.id} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group/marker z-40" style={{ left: `${pos}%` }}>
                               <div className="relative flex flex-col items-center">
                                  <div className="absolute bottom-full w-[2px] h-16 bg-slate-200 group-hover/marker:bg-slate-400 transition-colors" />
                                  <div onClick={(ev) => { ev.stopPropagation(); handleEditEvent(e); }} className={`w-12 h-12 rounded-xl ${isCard ? cardColor : 'bg-white'} border-2 ${isCard ? 'border-white shadow-xl' : 'border-slate-300'} flex flex-col items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-lg`}>
                                     {e.type === 'goal' ? <div className="w-5 h-5 rounded-full border-2 border-emerald-500 flex items-center justify-center"><div className="w-2 h-2 bg-emerald-500 rounded-full" /></div> : 
                                      e.type === 'substitution' ? <ArrowLeftRight className="w-5 h-5 text-slate-400" /> :
                                      <div className="w-4 h-6 border border-white/50 rounded-sm" />}
                                     <span className={`text-[8px] font-black ${isCard ? 'text-white/80' : 'text-slate-400'} leading-none mt-0.5`}>{timeStr}</span>
                                  </div>
                                  <div className="absolute top-full mt-3 opacity-0 group-hover/marker:opacity-100 transition-all scale-90 group-hover/marker:scale-100 whitespace-nowrap bg-slate-900 text-white text-[11px] font-black px-4 py-2 rounded-2xl shadow-2xl pointer-events-none z-50 flex items-center gap-3">
                                     <div className={`w-2 h-2 rounded-full ${isCard ? cardColor : 'bg-emerald-500'}`} />
                                     <span className="text-primary">{timeStr}</span>
                                     <span className="uppercase text-slate-300">
                                        {e.type === 'substitution' ? (
                                           (() => {
                                              let outName = '';
                                              if (e.player_id) {
                                                 const p = players.find(x => x.id === e.player_id);
                                                 outName = p ? `#${getJersey(p) || '?'} ${p.full_name.split(' ').pop()}` : 'Sortant';
                                              } else if (e.extra?.player_out_name) {
                                                 outName = e.extra.player_out_name;
                                              } else if (e.extra?.opponent_ref) {
                                                 const oppP = opponentPlayers.find(x => x.id === e.extra.opponent_ref);
                                                 outName = oppP ? `#${oppP.jersey_number ?? '?'} ${oppP.full_name.split(' ').pop()}` : `Adversaire #${e.extra.opponent_ref.replace('OPPONENT-', '')}`;
                                              } else {
                                                 outName = 'Sortant';
                                              }

                                              let inName = '';
                                              const inId = e.related_player_id || e.extra?.player_in_id;
                                              if (inId) {
                                                 const p = players.find(x => x.id === inId);
                                                 inName = p ? `#${getJersey(p) || '?'} ${p.full_name.split(' ').pop()}` : 'Entrant';
                                              } else if (e.extra?.player_in_name) {
                                                 inName = e.extra.player_in_name;
                                              } else {
                                                 inName = 'Entrant';
                                              }

                                              return (
                                                 <span className="flex items-center gap-1.5">
                                                    <span className="text-red-400">🔴 {outName}</span>
                                                    <span className="mx-1 text-white/50">→</span>
                                                    <span className="text-emerald-400">🟢 {inName}</span>
                                                 </span>
                                              );
                                           })()
                                        ) : e.player_id ? (
                                           player ? `#${getJersey(player) || '?'} ${player.full_name}` : 'Joueur'
                                        ) : (
                                           e.extra?.opponent_ref ? `Jersey n°${e.extra.opponent_ref.split('-')[1]}` : 'Adversaire'
                                        )}
                                     </span>
                                  </div>
                               </div>
                            </div>
                          );
                       })}
                    </div>
                 </div>
              </div>
           </div>

           {/* STREAMING & VIDEO LINKS BAR */}
           <div className="flex items-center justify-center gap-4 py-4">
              {(match as any)?.stream_url ? (
                 <a 
                    href={(match as any).stream_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-red-600 hover:scale-105 transition-all"
                 >
                    <Play className="w-4 h-4 fill-white" /> 
                    <span>Streaming Live</span>
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                 </a>
              ) : (
                 <div className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-400 rounded-2xl font-bold text-[11px] uppercase tracking-widest">
                    <Play className="w-4 h-4" /> Aucun stream configuré
                 </div>
              )}

              {(match as any)?.video_url ? (
                 <a 
                    href={(match as any).video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-blue-600 hover:scale-105 transition-all"
                 >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                       <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                    </svg>
                    <span>Vidéo Replay</span>
                 </a>
              ) : (
                 <div className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-400 rounded-2xl font-bold text-[11px] uppercase tracking-widest">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                       <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                    </svg> Aucune vidéo configurée
                 </div>
              )}
           </div>

        {/* UNIFIED COMMAND CENTER */}
        {(match?.status === 'scheduled' || isWaitingKickoff) && (
           <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white p-6 rounded-[2.5rem] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-slate-700/60 mb-6">
              <div className="flex items-center gap-3">
                 <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                 </span>
                 <div>
                    <p className="font-black text-sm uppercase tracking-wider text-white">⚽ Match programmé — En attente du coup d'envoi</p>
                    <p className="text-xs text-slate-300">Le match passera automatiquement en direct sur FUS-APP dès que vous aurez donné le coup d'envoi officiel.</p>
                 </div>
              </div>
              <Button onClick={handleKickoff} className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-all">
                 ⚽ Donner le coup d'envoi
              </Button>
           </div>
        )}

        <div className="grid grid-cols-12 gap-10">
           
           {/* Main Control Card */}
           <div className="col-span-12 lg:col-span-5 bg-white rounded-[4rem] border-2 border-slate-100 p-8 shadow-sm space-y-8 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-50 pb-8">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-white shadow-lg">
                       <Activity className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">Centre de Commande</h3>
                 </div>
                 <div className="flex gap-4">
                    {match?.status === 'scheduled' || isWaitingKickoff ? (
                       <Button onClick={handleKickoff} className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200 animate-pulse">
                          <Play className="w-4 h-4 mr-2" /> Donner Coup d'envoi
                       </Button>
                    ) : !isActive && totalElapsedSeconds > 0 ? (
                       <Button onClick={handleStart} className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-amber-500 text-white shadow-xl shadow-amber-200 animate-pulse">
                          <Play className="w-4 h-4 mr-2" /> Reprendre
                       </Button>
                    ) : (
                       <Button onClick={handleStart} className={`h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all ${isActive ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200'}`}>
                          <Play className={`w-4 h-4 mr-2 ${isActive ? 'animate-pulse' : ''}`} /> {isActive ? 'Live en cours...' : 'Démarrer Live'}
                       </Button>
                    )}

                    {isActive && (
                       <Button onClick={handlePause} className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-slate-900 text-white shadow-xl">
                          <Pause className="w-4 h-4 mr-2" /> Pause
                       </Button>
                    )}

                    <Button onClick={handleStop} variant="outline" className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-slate-100 hover:bg-red-50 hover:text-red-600 transition-colors">
                       <StopCircle className="w-4 h-4 mr-2" /> Terminer Match
                    </Button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                 {/* MON CLUB */}
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b-2 border-slate-100 pb-3 flex items-center justify-between">
                       <span>{mainClub?.club_name || 'Mon Club'}</span>
                       <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                       <Button onClick={() => handleActionClick('goal', false)} className="h-20 rounded-2xl bg-emerald-50 text-emerald-600 border-2 border-emerald-100 flex flex-col gap-1 hover:scale-105 transition-all outline-none">
                          <Goal className="w-5 h-5" />
                          <span className="font-black uppercase text-[8px] tracking-widest">But</span>
                       </Button>
                       <Button onClick={() => handleActionClick('substitution', false)} className="h-20 rounded-2xl bg-blue-50 text-blue-600 border-2 border-blue-100 flex flex-col gap-1 hover:scale-105 transition-all outline-none">
                          <ArrowLeftRight className="w-5 h-5" />
                          <span className="font-black uppercase text-[8px] tracking-widest">Changement</span>
                       </Button>
                       <Button onClick={() => handleActionClick('yellow_card', false)} className="h-20 rounded-2xl bg-amber-50 text-amber-600 border-2 border-amber-100 flex flex-col gap-1 hover:scale-105 transition-all outline-none">
                          <div className="w-3 h-5 bg-amber-400 border border-amber-500 rounded-sm shadow-md" />
                          <span className="font-black uppercase text-[8px] tracking-widest">Jaune</span>
                       </Button>
                       <Button onClick={() => handleActionClick('red_card', false)} className="h-20 rounded-2xl bg-red-50 text-red-600 border-2 border-red-100 flex flex-col gap-1 hover:scale-105 transition-all outline-none">
                          <div className="w-3 h-5 bg-red-600 border border-red-700 rounded-sm shadow-md" />
                          <span className="font-black uppercase text-[8px] tracking-widest">Rouge</span>
                       </Button>
                    </div>

                 </div>

                 {/* ADVERSAIRE */}
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b-2 border-slate-100 pb-3 flex items-center justify-between">
                       <span>Adversaire</span>
                       <div className="w-2 h-2 rounded-full bg-slate-300" />
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                       <Button onClick={() => handleActionClick('goal', true)} className="h-20 rounded-2xl bg-slate-50 text-slate-600 border-2 border-slate-200 flex flex-col gap-1 hover:scale-105 transition-all outline-none">
                          <Goal className="w-5 h-5" />
                          <span className="font-black uppercase text-[8px] tracking-widest">Goal</span>
                       </Button>
                       <Button onClick={() => handleActionClick('substitution', true)} className="h-20 rounded-2xl bg-slate-50 text-slate-600 border-2 border-slate-200 flex flex-col gap-1 hover:scale-105 transition-all outline-none">
                          <ArrowLeftRight className="w-5 h-5" />
                          <span className="font-black uppercase text-[8px] tracking-widest">Sub</span>
                       </Button>
                       <Button onClick={() => handleActionClick('yellow_card', true)} className="h-20 rounded-2xl bg-slate-50 text-slate-600 border-2 border-slate-200 flex flex-col gap-1 hover:scale-105 transition-all outline-none">
                          <div className="w-3 h-5 bg-amber-400 border border-slate-300 rounded-sm shadow-md opacity-80" />
                          <span className="font-black uppercase text-[8px] tracking-widest">Yellow</span>
                       </Button>
                       <Button onClick={() => handleActionClick('red_card', true)} className="h-24 rounded-2xl bg-slate-50 text-slate-600 border-2 border-slate-200 flex flex-col gap-1 hover:scale-105 transition-all outline-none">
                          <div className="w-3 h-5 bg-red-600 border border-slate-300 rounded-sm shadow-md opacity-80" />
                          <span className="font-black uppercase text-[8px] tracking-widest">Red</span>
                       </Button>
                    </div>

                 </div>
              </div>

              {/* PENALTY SHOOTOUT MINI DASHBOARD */}
              {matchPhase === 'penalties' && (
                 <div className="mt-6 bg-purple-50 rounded-3xl p-6 border-2 border-purple-200">
                    <div className="flex items-center justify-between mb-4">
                       <h4 className="text-[12px] font-black uppercase tracking-[0.2em] text-purple-700 flex items-center gap-2">
                          <Target className="w-4 h-4" /> Tirs au But 🎯
                       </h4>
                       <div className="flex items-center gap-4">
                          <span className="text-3xl font-black text-slate-900">{penaltyHomeScore}</span>
                          <span className="text-xl font-black text-slate-400">-</span>
                          <span className="text-3xl font-black text-slate-900">{penaltyAwayScore}</span>
                       </div>
                    </div>
                    
                    {/* Quick Penalty Controls */}
                    <div className="grid grid-cols-2 gap-4">
                       {/* Home Penalties */}
                       <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase text-blue-600">{mainClub?.club_name || 'Home'}</p>
                          <div className="grid grid-cols-6 gap-1">
                             {[1,2,3,4,5,6].map(num => (
                                <div key={`mini-home-${num}`} className="flex flex-col gap-0.5">
                                   <button
                                      onClick={() => addPenaltyShot('home', num, 'scored')}
                                      className="h-8 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black"
                                      title={`Home #${num} - Marqué`}
                                   >
                                      ✅
                                   </button>
                                   <button
                                      onClick={() => addPenaltyShot('home', num, 'missed')}
                                      className="h-8 rounded bg-red-500 hover:bg-red-600 text-white text-[10px] font-black"
                                      title={`Home #${num} - Manqué`}
                                   >
                                      ❌
                                   </button>
                                </div>
                             ))}
                          </div>
                       </div>
                       
                       {/* Away Penalties */}
                       <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase text-slate-500">{opponent?.name || 'Away'}</p>
                          <div className="grid grid-cols-6 gap-1">
                             {[1,2,3,4,5,6].map(num => (
                                <div key={`mini-away-${num}`} className="flex flex-col gap-0.5">
                                   <button
                                      onClick={() => addPenaltyShot('away', num, 'scored')}
                                      className="h-8 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black"
                                      title={`Away #${num} - Marqué`}
                                   >
                                      ✅
                                   </button>
                                   <button
                                      onClick={() => addPenaltyShot('away', num, 'missed')}
                                      className="h-8 rounded bg-red-500 hover:bg-red-600 text-white text-[10px] font-black"
                                      title={`Away #${num} - Manqué`}
                                   >
                                      ❌
                                   </button>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                    
                    <p className="text-[9px] text-slate-500 text-center mt-3 font-bold">
                       Cliquez sur ✅ pour but marqué ou ❌ pour manqué
                    </p>
                 </div>
              )}


           </div>

           {/* Video Feed Card */}
           <div className="col-span-12 lg:col-span-7">
              <div className="bg-slate-950 rounded-[4rem] h-full min-h-[400px] relative overflow-hidden group shadow-2xl border-[12px] border-white flex items-center justify-center outline outline-1 outline-slate-100">
                 {(match as any)?.stream_url ? (
                    /* Live Stream Embed */
                    <iframe
                       src={(match as any).stream_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                       className="absolute inset-0 w-full h-full"
                       allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                       allowFullScreen
                       title="Live Stream"
                    />
                 ) : (match as any)?.video_url ? (
                    /* Video Replay Embed */
                    <iframe
                       src={(match as any).video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                       className="absolute inset-0 w-full h-full"
                       allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                       allowFullScreen
                       title="Video Replay"
                    />
                 ) : (
                    /* Placeholder when no video */
                    <>
                       <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=1500')] bg-cover opacity-20 blur-sm group-hover:scale-105 transition-all duration-1000" />
                       <div className="relative z-10 text-center flex items-center gap-6 bg-black/60 backdrop-blur-xl px-10 py-6 rounded-[2rem] border border-white/10">
                          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center animate-pulse shadow-2xl">
                             <Play className="w-6 h-6 text-primary translate-x-0.5" />
                          </div>
                          <div className="text-left">
                             <h4 className="text-lg font-black italic text-white uppercase tracking-tighter leading-none">Signal Vidéo Live</h4>
                             <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-1">Aucun stream configuré</p>
                          </div>
                       </div>
                    </>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* RE-USED MODAL (Redesigned for High-Precision Scouting) */}
      <AnimatePresence>
        {isEventModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEventModalOpen(false)} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[4rem] p-12 shadow-2xl border-4 border-slate-50">
              
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                   <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">{editingEventId ? 'Modifier' : 'Enregistrer'} {eventType?.replace('_', ' ')}</h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{match.is_home ? 'Match à Domicile' : 'Match à l\'Extérieur'}</p>
                </div>
                <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full hover:bg-slate-100" onClick={() => setIsEventModalOpen(false)}><X className="w-6 h-6" /></Button>
              </div>

              <div className="space-y-8">
                
                {/* DYNAMIC PLAYER SELECTION */}
                {/* DYNAMIC PLAYER SELECTION (Hidden for substitutions to avoid 3 selects) */}
                {eventType !== 'substitution' && (
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking_widest text-slate-400 block px-2">
                         {(selectedPlayerId.startsWith('OPPONENT-') || opponentPlayers.some(p => p.id === selectedPlayerId)) ? 'Joueur de l\'Adversaire' : 'Joueur de l\'Équipe'}
                      </label>
                      
                      {!(selectedPlayerId.startsWith('OPPONENT-') || opponentPlayers.some(p => p.id === selectedPlayerId)) ? (
                         <select value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)} className="w-full h-16 px-6 rounded-3xl bg-slate-50 border-2 border-slate-200 font-black text-sm outline-none focus:border-primary transition-all appearance-none cursor-pointer">
                            <option value="">Choisir un joueur...</option>
                            {currentLineup.length > 0 || bench.length > 0 ? (
                              <>
                                <optgroup label="Titulaires">
                                   {currentLineup.map(p => <option key={p.id} value={p.id}>#{getJersey(p) || '?'} - {p.full_name}</option>)}
                                </optgroup>
                                {bench.length > 0 && (
                                  <optgroup label="Remplaçants">
                                     {bench.map(p => <option key={p.id} value={p.id}>#{getJersey(p) || '?'} - {p.full_name}</option>)}
                                  </optgroup>
                                )}
                              </>
                            ) : (
                              <optgroup label="Tous les Joueurs (Attente Compo)">
                                 {players.map(p => <option key={p.id} value={p.id}>#{getJersey(p) || '?'} - {p.full_name}</option>)}
                              </optgroup>
                            )}
                         </select>
                      ) : (
                          <div className="space-y-3">
                             <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {opponentPlayers.length > 0 ? (
                                   opponentPlayers.map(op => (
                                      <button 
                                        key={op.id} 
                                        onClick={() => setSelectedPlayerId(op.id)}
                                        className={`h-12 rounded-xl flex items-center justify-center text-[10px] font-black uppercase transition-all border-2 px-1 text-center leading-tight ${selectedPlayerId === op.id ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>
                                         #{op.jersey_number ?? '?'} {op.full_name.split(' ').pop()}
                                      </button>
                                   ))
                                ) : (() => {
                                   const matchFmt = inferMatchFormat(match);
                                   const oppLineup = Array.isArray(match.opponent_lineup) ? match.opponent_lineup : [];
                                   const slotsCount = Math.max(matchFmt, oppLineup.length || 0);

                                   return (
                                      <>
                                         {[...Array(slotsCount)].map((_, i) => {
                                            const num = i + 1;
                                            const rawOpp = oppLineup[i];
                                            const oppPlayerObj = rawOpp ? (players.find(p => p.id === rawOpp || (typeof rawOpp === 'object' && p.id === (rawOpp.id || rawOpp.player_id))) || null) : null;
                                            const displayLabel = oppPlayerObj
                                               ? `#${oppPlayerObj.jersey_number ?? num} ${oppPlayerObj.full_name.split(' ').pop()}`
                                               : (typeof rawOpp === 'object' ? (rawOpp.full_name || rawOpp.name || `#${num}`) : (rawOpp && isNaN(Number(rawOpp)) ? String(rawOpp) : `ADV #${num}`));
                                            const ref = oppPlayerObj ? oppPlayerObj.id : (typeof rawOpp === 'object' && rawOpp?.id ? rawOpp.id : `OPPONENT-${num}`);
                                            
                                            return (
                                               <button 
                                                 key={ref} 
                                                 onClick={() => setSelectedPlayerId(ref)}
                                                 className={`h-12 rounded-xl flex flex-col items-center justify-center text-[10px] font-black transition-all border-2 px-1 text-center ${selectedPlayerId === ref ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white border-slate-200 text-slate-700 hover:border-primary/40'}`}>
                                                  <span className="leading-tight truncate max-w-full">{displayLabel}</span>
                                               </button>
                                            );
                                         })}
                                      </>
                                   );
                                })()}
                             </div>
                          </div>
                      )}
                   </div>
                )}

                {/* GOAL ASSIST (Only for My Club) */}
                {eventType === 'goal' && !(selectedPlayerId.startsWith('OPPONENT-') || opponentPlayers.some(p => p.id === selectedPlayerId)) && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block px-2">Passeur Décisif (Assist)</label>
                     <select value={selectedAssistId || ''} onChange={e => setSelectedAssistId(e.target.value)} className="w-full h-16 px-6 rounded-3xl bg-emerald-50 border-2 border-emerald-100 font-black text-sm outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer">
                        <option value="">Aucune passe</option>
                        {players.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                     </select>
                  </div>
                )}

                {/* SUBSTITUTION FIELDS */}
                {eventType === 'substitution' && (
                  <div className="space-y-8 animate-in zoom-in-95">
                     <div className="space-y-3">
                        <label className="text-[9px] font-black uppercase text-red-500 tracking-widest px-2">
                           Sortie (Joueur OUT {isOpponentAction ? 'Adverse' : ''})
                        </label>
                        {isOpponentAction ? (
                          opponentPlayers.length > 0 ? (
                            <select
                              value={selectedPlayerId}
                              onChange={e => setSelectedPlayerId(e.target.value)}
                              className="w-full h-16 px-6 rounded-[2rem] bg-red-50 border-2 border-red-100 font-black text-sm outline-none focus:border-red-500 transition-all"
                            >
                              <option value="">Sélectionner le joueur adverse sortant...</option>
                              {opponentPlayers.map(p => (
                                <option key={p.id} value={p.id}>
                                  #{p.jersey_number ?? '?'} - {p.full_name} ({p.position})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={selectedPlayerId}
                              onChange={e => setSelectedPlayerId(e.target.value)}
                              placeholder="Nom ou numéro du joueur adverse sortant..."
                              className="w-full h-16 px-6 rounded-[2rem] bg-red-50 border-2 border-red-100 font-black text-sm outline-none focus:border-red-500 transition-all"
                            />
                          )
                        ) : (
                          <select
                            value={selectedPlayerId}
                            onChange={e => setSelectedPlayerId(e.target.value)}
                            className="w-full h-16 px-6 rounded-[2rem] bg-red-50 border-2 border-red-100 font-black text-sm outline-none focus:border-red-500 transition-all"
                          >
                            <option value="">Sélectionner le joueur sortant...</option>
                            <optgroup label="Sur le terrain">
                              {currentLineup.filter(p => !sentOffPlayerIds.has(p.id)).map(p => (
                                <option key={p.id} value={p.id}>
                                  #{getJersey(p) || '?'} - {p.full_name}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        )}
                     </div>
                     
                     <div className="flex items-center justify-center -my-4 relative z-10">
                        <div className="bg-white p-3 rounded-full border-2 border-slate-100 shadow-sm">
                           <ArrowLeftRight className="w-5 h-5 text-slate-400" />
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[9px] font-black uppercase text-emerald-500 tracking-widest px-2">
                           Entrée (Joueur IN {isOpponentAction ? 'Adverse' : ''})
                        </label>
                        {isOpponentAction ? (
                          opponentPlayers.length > 0 ? (
                            <select
                              value={selectedPlayerInId}
                              onChange={e => setSelectedPlayerInId(e.target.value)}
                              className="w-full h-16 px-6 rounded-[2rem] bg-emerald-50 border-2 border-emerald-100 font-black text-sm outline-none focus:border-emerald-500 transition-all"
                            >
                              <option value="">Sélectionner le joueur adverse entrant...</option>
                              {opponentPlayers.map(p => (
                                <option key={p.id} value={p.id}>
                                  #{p.jersey_number ?? '?'} - {p.full_name} ({p.position})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={selectedPlayerInId}
                              onChange={e => setSelectedPlayerInId(e.target.value)}
                              placeholder="Nom ou numéro du joueur adverse entrant..."
                              className="w-full h-16 px-6 rounded-[2rem] bg-emerald-50 border-2 border-emerald-100 font-black text-sm outline-none focus:border-emerald-500 transition-all"
                            />
                          )
                        ) : (
                          <select
                            value={selectedPlayerInId}
                            onChange={e => setSelectedPlayerInId(e.target.value)}
                            className="w-full h-16 px-6 rounded-[2rem] bg-emerald-50 border-2 border-emerald-100 font-black text-sm outline-none focus:border-emerald-500 transition-all"
                          >
                            <option value="">Sélectionner le joueur entrant...</option>
                            <optgroup label="Banc de touche">
                              {bench.filter(p => !sentOffPlayerIds.has(p.id)).map(p => (
                                <option key={p.id} value={p.id}>
                                  #{getJersey(p) || '?'} - {p.full_name}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        )}
                     </div>
                  </div>
                )}

                <div className="flex gap-4 pt-8">
                  {editingEventId && (
                    <Button variant="ghost" onClick={() => handleDeleteEvent(editingEventId)} className="h-16 px-8 rounded-3xl text-red-500 font-black uppercase text-[10px] hover:bg-red-50">
                       <Trash2 className="w-5 h-5 mr-3" /> Supprimer
                    </Button>
                  )}
                  <Button className="flex-1 h-16 rounded-3xl bg-slate-950 text-white font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all" onClick={saveEvent}>
                     {editingEventId ? 'Mettre à jour' : 'Confirmer l\'Action'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MATCH CONFIGURATION MODAL */}
      <AnimatePresence>
        {isConfigModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsConfigModalOpen(false)} 
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-lg bg-white rounded-[4rem] p-12 shadow-2xl border-4 border-slate-50"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Configuration du Match</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Durée & Options de Prolongation</p>
                </div>
                <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full hover:bg-slate-100" onClick={() => setIsConfigModalOpen(false)}>
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <div className="space-y-8">
                {/* Half Duration */}
                <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Durée des Mi-temps</label>
                   <div className="grid grid-cols-4 gap-3">
                      {[30, 35, 40, 45].map((duration) => (
                         <button
                            key={duration}
                            type="button"
                            onClick={() => setTempHalfDuration(duration)}
                            className={`h-14 rounded-2xl text-[12px] font-black transition-all ${
                               tempHalfDuration === duration
                                  ? 'bg-primary text-white shadow-lg scale-105'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                         >
                            {duration} min
                         </button>
                      ))}
                   </div>
                </div>

                {/* Extra Time Toggle */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                   <label className="flex items-center justify-between cursor-pointer group p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all">
                      <div className="flex items-center gap-3">
                         <div className={`w-12 h-7 rounded-full transition-all relative ${tempEnableExtraTime ? 'bg-amber-500' : 'bg-slate-300'}`}>
                            <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-1 transition-all ${tempEnableExtraTime ? 'left-6' : 'left-1'}`} />
                         </div>
                         <span className={`text-[12px] font-black uppercase tracking-widest ${tempEnableExtraTime ? 'text-amber-600' : 'text-slate-500'}`}>
                            Prolongations ⚡
                         </span>
                      </div>
                      <input
                         type="checkbox"
                         checked={tempEnableExtraTime}
                         onChange={(e) => setTempEnableExtraTime(e.target.checked)}
                         className="hidden"
                      />
                   </label>

                   {/* Penalties Toggle */}
                   <label className="flex items-center justify-between cursor-pointer group p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all">
                      <div className="flex items-center gap-3">
                         <div className={`w-12 h-7 rounded-full transition-all relative ${tempEnablePenalties ? 'bg-purple-500' : 'bg-slate-300'}`}>
                            <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-1 transition-all ${tempEnablePenalties ? 'left-6' : 'left-1'}`} />
                         </div>
                         <span className={`text-[12px] font-black uppercase tracking-widest ${tempEnablePenalties ? 'text-purple-600' : 'text-slate-500'}`}>
                            Tirs au But 🎯
                         </span>
                      </div>
                      <input
                         type="checkbox"
                         checked={tempEnablePenalties}
                         onChange={(e) => setTempEnablePenalties(e.target.checked)}
                         className="hidden"
                      />
                   </label>
                </div>


                {/* Visual Timeline Preview */}
                <div className="space-y-3 pt-4">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Aperçu Timeline</label>
                   <div className="h-16 bg-slate-100 rounded-2xl flex overflow-hidden">
                      <div className="flex-1 bg-blue-500/20 border-r border-white/50 flex items-center justify-center">
                         <span className="text-[10px] font-black text-blue-700">1ère MT</span>
                      </div>
                      <div className="flex-1 bg-blue-600/20 border-r border-white/50 flex items-center justify-center">
                         <span className="text-[10px] font-black text-blue-800">2ème MT</span>
                      </div>
                      {tempEnableExtraTime && (
                         <>
                            <div className="flex-1 bg-amber-500/20 border-r border-white/50 flex items-center justify-center">
                               <span className="text-[10px] font-black text-amber-700">Prol. 1</span>
                            </div>
                            <div className="flex-1 bg-amber-600/20 border-r border-white/50 flex items-center justify-center">
                               <span className="text-[10px] font-black text-amber-800">Prol. 2</span>
                            </div>
                         </>
                      )}
                      {tempEnablePenalties && (
                         <div className="w-24 bg-purple-500/20 flex items-center justify-center">
                            <span className="text-[10px] font-black text-purple-700">Pen.</span>
                         </div>
                      )}
                   </div>
                </div>

                <Button 
                   onClick={updateMatchConfig}
                   className="w-full h-16 rounded-3xl bg-slate-950 text-white font-black uppercase tracking-widest text-[11px] shadow-2xl"
                >
                   <CheckCircle2 className="w-5 h-5 mr-2" /> Appliquer Configuration
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PENALTY SHOOTOUT EDITOR */}
      <AnimatePresence>
        {isPenaltyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsPenaltyModalOpen(false)} 
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-2xl bg-white rounded-[4rem] p-12 shadow-2xl border-4 border-slate-50"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Tirs au But</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Système de Comptage</p>
                </div>
                <div className="flex items-center gap-4">
                   <div className="text-center">
                      <span className="text-3xl font-black text-slate-900">{penaltyHomeScore}</span>
                      <p className="text-[9px] font-black uppercase text-slate-400">Home</p>
                   </div>
                   <span className="text-2xl font-black text-slate-300">-</span>
                   <div className="text-center">
                      <span className="text-3xl font-black text-slate-900">{penaltyAwayScore}</span>
                      <p className="text-[9px] font-black uppercase text-slate-400">Away</p>
                   </div>
                </div>
                <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full hover:bg-slate-100" onClick={() => setIsPenaltyModalOpen(false)}>
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Penalty History from Events */}
                <div className="bg-slate-50 rounded-3xl p-6 max-h-48 overflow-y-auto">
                   {events.filter(e => (e.extra as any)?.is_penalty_shootout).length === 0 ? (
                      <p className="text-center text-[12px] font-bold text-slate-400 py-4">Aucun tir au but enregistré</p>
                   ) : (
                      <div className="space-y-2">
                         {events.filter(e => (e.extra as any)?.is_penalty_shootout).map((e, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl">
                               <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-slate-400">#{idx + 1}</span>
                                  <Badge className={(e.extra as any)?.team === 'home' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}>
                                     {(e.extra as any)?.team === 'home' ? 'Home' : 'Away'}
                                  </Badge>
                                  <span className="text-[12px] font-bold">Joueur #{(e.extra as any)?.player_number}</span>
                               </div>
                               <Badge className={e.type === 'penalty' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                                  {e.type === 'penalty' ? '✅ Marqué' : '❌ Manqué'}
                               </Badge>
                            </div>
                         ))}
                      </div>
                   )}
                </div>

                {/* Add New Penalty Shot */}
                <div className="grid grid-cols-2 gap-4">
                   {/* Home Penalty */}
                   <div className="space-y-3">
                      <h4 className="text-[11px] font-black uppercase text-blue-600">Home</h4>
                      <div className="grid grid-cols-5 gap-2">
                         {[1,2,3,4,5,6,7,8,9,10,11].map(num => (
                            <div key={`home-${num}`} className="flex flex-col gap-1">
                               <button
                                  onClick={() => addPenaltyShot('home', num, 'scored')}
                                  className="h-8 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-black"
                               >
                                  ✅
                               </button>
                               <span className="text-center text-[8px] font-bold text-slate-400">#{num}</span>
                               <button
                                  onClick={() => addPenaltyShot('home', num, 'missed')}
                                  className="h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-black"
                               >
                                  ❌
                               </button>
                            </div>
                         ))}
                      </div>
                   </div>

                   {/* Away Penalty */}
                   <div className="space-y-3">
                      <h4 className="text-[11px] font-black uppercase text-slate-600">Away</h4>
                      <div className="grid grid-cols-5 gap-2">
                         {[1,2,3,4,5,6,7,8,9,10,11].map(num => (
                            <div key={`away-${num}`} className="flex flex-col gap-1">
                               <button
                                  onClick={() => addPenaltyShot('away', num, 'scored')}
                                  className="h-8 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-black"
                               >
                                  ✅
                               </button>
                               <span className="text-center text-[8px] font-bold text-slate-400">#{num}</span>
                               <button
                                  onClick={() => addPenaltyShot('away', num, 'missed')}
                                  className="h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-black"
                               >
                                  ❌
                               </button>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>

                <p className="text-[10px] text-slate-400 text-center font-bold">
                   Cliquez sur ✅ pour but marqué ou ❌ pour but manqué
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HALF-TIME MODAL */}
      <AnimatePresence>
        {isHalfTimeModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="relative w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-2xl border-4 border-amber-100"
            >
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-4xl">⏱️</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter">Mi-Temps !</h3>
                  <p className="text-[12px] font-bold text-slate-500 mt-2">
                    Fin de la première mi-temps ({matchConfig.halfDurationMinutes} min)
                  </p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-[11px] font-black uppercase text-slate-400 mb-2">Score</p>
                  <div className="flex items-center justify-center gap-4">
                     <span className="text-4xl font-black">{homeScore}</span>
                     <span className="text-2xl font-black text-slate-300">-</span>
                     <span className="text-4xl font-black">{awayScore}</span>
                  </div>
                  {lostTime > 0 && (
                     <p className="text-[10px] text-amber-600 font-bold mt-2">
                        ⏸️ Temps perdu: {formatTime(lostTime)}
                     </p>
                  )}
                </div>
                <Button 
                  onClick={handleStartSecondHalf}
                  className="w-full h-16 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-[12px] shadow-xl hover:bg-emerald-600"
                >
                  <Play className="w-5 h-5 mr-2" /> Démarrer 2ème Mi-Temps
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* END OF MATCH MODAL */}
      <AnimatePresence>
        {isEndOfMatchModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="relative w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-2xl border-4 border-blue-100"
            >
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-4xl">🏁</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter">Fin du Match !</h3>
                  <p className="text-[12px] font-bold text-slate-500 mt-2">
                    90 minutes écoulées
                  </p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-[11px] font-black uppercase text-slate-400 mb-2">Score Final Régulier</p>
                  <div className="flex items-center justify-center gap-4">
                     <span className="text-4xl font-black">{homeScore}</span>
                     <span className="text-2xl font-black text-slate-300">-</span>
                     <span className="text-4xl font-black">{awayScore}</span>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {homeScore === awayScore && matchConfig.enableExtraTime && (
                     <Button 
                       onClick={handleStartExtraTime}
                       className="w-full h-14 rounded-2xl bg-amber-500 text-white font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-amber-600"
                     >
                       ⚡ Démarrer la Prolongation
                     </Button>
                  )}
                  {homeScore === awayScore && matchConfig.enablePenalties && (
                     <Button 
                       onClick={handleStartPenalties}
                       className="w-full h-14 rounded-2xl bg-purple-500 text-white font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-purple-600"
                     >
                       🎯 Aller aux Tirs au But
                     </Button>
                  )}
                  <Button 
                    onClick={handleStop}
                    variant="outline"
                    className="w-full h-14 rounded-2xl border-2 border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[11px] hover:bg-slate-50"
                  >
                    Terminer le Match
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Penalty Quick Button in Timeline */}
      {(matchConfig.enablePenalties || matchPhase === 'penalties') && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setIsPenaltyModalOpen(true)}
          className="fixed bottom-8 right-8 z-50 bg-purple-600 text-white px-6 py-4 rounded-3xl shadow-2xl font-black uppercase text-[11px] tracking-widest flex items-center gap-2 hover:bg-purple-700 transition-all"
        >
          <Target className="w-5 h-5" />
          Penalties {penaltyHomeScore}-{penaltyAwayScore}
        </motion.button>
      )}

      {/* HISTORIQUE DES OPÉRATIONS LIVE DU MATCH */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsHistoryModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border-4 border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] z-10"
            >
              {/* Header */}
              <div className="p-6 px-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center font-black">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
                      Journal des Opérations Live
                    </h3>
                    <p className="text-xs font-semibold text-slate-500">
                      Traçabilité en temps réel de toutes les actions de chaque opérateur pour ce match
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Match summary strip */}
              <div className="bg-red-500/5 border-b border-red-500/10 px-8 py-3 flex items-center justify-between text-xs font-black">
                <span className="text-red-700 dark:text-red-400">
                  🏟️ {getMatchLabel()}
                </span>
                <span className="text-slate-500">
                  Total : <strong className="text-slate-900 dark:text-white">{matchAuditLogs.length} opérations enregistrées</strong>
                </span>
              </div>

              {/* Log List */}
              <div className="p-6 px-8 overflow-y-auto space-y-3 flex-1">
                {loadingMatchLogs ? (
                  <div className="py-16 text-center text-slate-400 font-bold">
                    Chargement de l'historique des opérations...
                  </div>
                ) : matchAuditLogs.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <History className="w-12 h-12 mx-auto opacity-30 mb-3" />
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Aucune opération live enregistrée pour l'instant</p>
                    <p className="text-xs text-slate-400 mt-1">Dès qu'un opérateur lance le live, note un but, un carton ou modifie le chronomètre, l'action sera tracée ici.</p>
                  </div>
                ) : (
                  matchAuditLogs.map(log => {
                    const isMob = log.session_id?.startsWith('MOB-') || log.user_agent?.toLowerCase().includes('fusapp') || log.ip_address?.includes('Mobile');
                    const opName = log.metadata?.operator_name || log.user_email?.split('@')[0] || 'Opérateur';
                    const timeStr = new Date(log.created_at).toLocaleTimeString('fr-FR');
                    const dateStr = new Date(log.created_at).toLocaleDateString('fr-FR');

                    return (
                      <div 
                        key={log.id} 
                        className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:border-slate-200 transition-all flex items-start justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {opName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-slate-900 dark:text-white">
                                {opName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold">
                                {log.user_email}
                              </span>
                              {isMob ? (
                                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[9px] font-black h-4 px-1.5 border-none">
                                  📱 Fus-App
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[9px] font-black h-4 px-1.5 border-none">
                                  💻 Dashboard
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 leading-snug">
                              {log.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {log.metadata?.minute !== undefined && log.metadata?.minute !== null && (
                                <span className="text-[9.5px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-black border border-amber-500/20">
                                  ⏱️ {log.metadata.minute}e min
                                </span>
                              )}
                              {log.metadata?.score && (
                                <span className="text-[9.5px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-black border border-emerald-500/20">
                                  🔢 {log.metadata.score}
                                </span>
                              )}
                              {log.metadata?.event_type && (
                                <span className="text-[9.5px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 font-black border border-purple-500/20 uppercase">
                                  ⚡ {log.metadata.event_type}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono">
                                {dateStr} à {timeStr}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-4 px-8 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-900/50">
                <Button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="rounded-xl px-6 font-bold text-xs"
                >
                  Fermer
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default LiveTracking;
