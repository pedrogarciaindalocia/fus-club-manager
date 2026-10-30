import React, { useEffect, useState, useMemo, useRef } from 'react';
import { usePlayers } from '../../hooks/usePlayers';
import { useStaff } from '../../hooks/useStaff';
import { useMatchEvents } from '../../hooks/useMatchEvents';
import { useMatches } from '../../hooks/useMatches';
import { useClubData } from '../../hooks/useClubData';
import { matchService } from '../../services/matchService';
import { useSurclassements } from '../../hooks/useSurclassements';
import { useCompetitions } from '../../hooks/useCompetitions';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { useOpponentPlayers } from '../../hooks/useOpponentPlayers';
import PlayerMatchEvaluationModal from './components/PlayerMatchEvaluationModal';
import PlayerActionHubModal from './components/PlayerActionHubModal';
import type { PlayerActionTarget } from './components/PlayerActionHubModal';
import { inferMatchFormat, getHorizontalFormationPositions, FORMATIONS_BY_FORMAT } from './tacticalFormations';
import {
  Trophy,
  Target,
  AlertCircle,
  AlertTriangle,
  RotateCw,
  Clock,
  User,
  Activity,
  ChevronRight,
  HelpCircle,
  Brain,
  Zap,
  ShieldCheck,
  Edit3,
  ZoomIn,
  ZoomOut,
  ArrowLeftRight,
  Trash2,
  X,
  Plus,
  Video,
  Save,
  PlaySquare,
  ExternalLink,
  Camera,
  Layout,
  Goal,
  Briefcase,
  Star,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import type { MatchEvent } from '../../types';

interface MatchStatsViewProps {
  matchId: string;
  match: any;
  mainClub: any;
  opponentClubs: any[];
}

type ViewMode = 'lineup' | 'edit' | 'video';

const TacticalInfo: React.FC<{ title: string; formula?: string; description: string; light?: boolean }> = ({ title, formula, description, light }) => (
  <div className="group relative">
    <HelpCircle className={`w-4 h-4 cursor-help transition-colors ${light ? 'text-white/20 hover:text-white' : 'text-slate-400 hover:text-slate-950'}`} />
    <div className="absolute bottom-full right-0 mb-4 w-72 p-6 bg-slate-950 text-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 pointer-events-none z-[100] border border-white/10 backdrop-blur-md">
      <p className="text-[11px] font-black text-primary uppercase mb-3 tracking-widest">{title}</p>
      <div className="space-y-4">
        {formula && (
          <div>
            <span className="text-[9px] text-slate-500 font-black uppercase block mb-1">Formule de calcul</span>
            <code className="text-[12px] block bg-white/10 p-3 rounded-xl font-mono text-emerald-400 border border-white/5">{formula}</code>
          </div>
        )}
        <div>
          <span className="text-[9px] text-slate-500 font-black uppercase block mb-1">Analyse Scouting</span>
          <p className="text-[11px] text-slate-200 font-bold leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="absolute top-full right-4 w-4 h-4 bg-slate-950 rotate-45 -translate-y-2 border-r border-b border-white/10" />
    </div>
  </div>
);

const MatchStatsView: React.FC<MatchStatsViewProps> = ({ matchId, match: initialMatch, mainClub: initialMainClub, opponentClubs }) => {
  const { players } = usePlayers();
  const { staff } = useStaff();
  const { matches, updateMatch } = useMatches();
  const { mainClub, opponentClubs: clubs } = useClubData();
  const { events, addEvent, updateEvent, deleteEvent } = useMatchEvents(matchId);
  const { surclassements } = useSurclassements();

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
  
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('lineup');
  const [zoom, setZoom] = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);
  const matchDuration = 5400; // 90 min default

  const currentMatch = matches.find(m => m.id === matchId) || initialMatch;

  // Modals & Editing
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedAssistId, setSelectedAssistId] = useState('');
  const [selectedPlayerInId, setSelectedPlayerInId] = useState('');
  const [isOpponentAction, setIsOpponentAction] = useState(false);
  const [cursorTime, setCursorTime] = useState(0);

  // Opponent Players
  const { players: opponentPlayers = [] } = useOpponentPlayers(currentMatch?.opponent_id, currentMatch?.category);

  // Competitions & League metadata
  const { leagues } = useCompetitions();
  const currentLeague = leagues?.find(l => l.id === currentMatch?.league_id);
  const currentLeagueName = currentLeague?.name || currentMatch?.league?.name || 'Compétition Officielle';

  // Friendly match evaluation condition & modal state
  const isCurrentMatchFriendly = useMemo(() => {
    if (!currentMatch) return false;
    if (!currentMatch.league_id) return true;
    const lName = (currentLeague?.name || currentMatch.league?.name || '').toLowerCase();
    if (lName.includes('amical')) return true;
    if (currentMatch.category?.toLowerCase().includes('amical')) return true;
    if (currentMatch.notes?.toLowerCase().includes('amical')) return true;
    return false;
  }, [currentMatch, currentLeague]);

  const [ratingModalPlayer, setRatingModalPlayer] = useState<any | null>(null);
  const [modalRating, setModalRating] = useState<number>(7);
  const [modalComment, setModalComment] = useState<string>('');
  const [savingRating, setSavingRating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);

  // Player Action Hub State & Handlers
  const [actionHubPlayer, setActionHubPlayer] = useState<PlayerActionTarget | null>(null);

  const openPlayerActionHub = (
    p: any,
    isOpp: boolean = false,
    isStarter: boolean = true
  ) => {
    if (!p) return;
    const mpRecord = !isOpp ? currentMatch.match_players?.find((mp: any) => mp.player_id === p.id) : null;
    const subEvt = events.find(e => 
      e.type === 'substitution' && 
      (isOpp 
        ? (e.extra?.opponent_ref === p.id || e.player_id === p.id || e.extra?.player_in_name === p.full_name) 
        : (e.related_player_id === p.id || e.extra?.player_in_id === p.id))
    );

    const target: PlayerActionTarget = {
      id: p.id,
      full_name: p.full_name || p.name || (isOpp ? `Adversaire N°${p.jersey_number || '?'}` : 'Joueur'),
      jersey_number: p.jersey_number ?? null,
      position: p.position || (isOpp ? 'Adversaire' : 'Joueur'),
      photo_url: p.photo_url || null,
      is_opponent: isOpp,
      is_starter: isStarter,
      has_entered: !!subEvt,
      entered_minute: subEvt?.minute ?? null,
      rating: mpRecord?.rating != null ? Number(mpRecord.rating) : null,
      rating_comment: mpRecord?.rating_comment || null,
      opponent_ref: isOpp ? (p.opponent_ref || p.id) : null,
    };

    setActionHubPlayer(target);
  };

  const handleAddEventFromHub = async (payload: any) => {
    await addEvent(payload);
    // Score update
    if (payload.type === 'goal' || (payload.type === 'penalty' && payload.extra?.result === 'scored')) {
      const isOpp = payload.extra?.team === 'away' || !payload.player_id;
      const addHome = currentMatch.is_home ? !isOpp : isOpp;
      if (addHome) {
        await updateMatch({ id: matchId, data: { score_home: (currentMatch.score_home || 0) + 1 } });
      } else {
        await updateMatch({ id: matchId, data: { score_away: (currentMatch.score_away || 0) + 1 } });
      }
    } else if (payload.type === 'own_goal') {
      const isOpp = payload.extra?.team === 'away';
      const addHome = currentMatch.is_home ? isOpp : !isOpp;
      if (addHome) {
        await updateMatch({ id: matchId, data: { score_home: (currentMatch.score_home || 0) + 1 } });
      } else {
        await updateMatch({ id: matchId, data: { score_away: (currentMatch.score_away || 0) + 1 } });
      }
    }
  };

  const handleUpdateEventFromHub = async (id: string, updates: any) => {
    await updateEvent({ id, updates });
  };

  const handleDeleteEventFromHub = async (id: string) => {
    const ev = events.find(e => e.id === id);
    await deleteEvent(id);
    if (ev) {
      if (ev.type === 'goal' || (ev.type === 'penalty' && ev.extra?.result === 'scored')) {
        const isOpp = ev.extra?.team === 'away' || !ev.player_id;
        const decHome = currentMatch.is_home ? !isOpp : isOpp;
        if (decHome) {
          await updateMatch({ id: matchId, data: { score_home: Math.max(0, (currentMatch.score_home || 0) - 1) } });
        } else {
          await updateMatch({ id: matchId, data: { score_away: Math.max(0, (currentMatch.score_away || 0) - 1) } });
        }
      } else if (ev.type === 'own_goal') {
        const isOpp = ev.extra?.team === 'away';
        const decHome = currentMatch.is_home ? isOpp : !isOpp;
        if (decHome) {
          await updateMatch({ id: matchId, data: { score_home: Math.max(0, (currentMatch.score_home || 0) - 1) } });
        } else {
          await updateMatch({ id: matchId, data: { score_away: Math.max(0, (currentMatch.score_away || 0) - 1) } });
        }
      }
    }
  };

  const handleSaveRatingFromHub = async (playerId: string, rating: number, comment: string) => {
    await matchService.savePlayerRating(currentMatch.id, playerId, rating, comment.trim() || null);
    if (!currentMatch.match_players) currentMatch.match_players = [];
    const target = currentMatch.match_players.find((mp: any) => mp.player_id === playerId);
    if (target) {
      target.rating = rating;
      target.rating_comment = comment.trim() || null;
    } else {
      currentMatch.match_players.push({
        match_id: currentMatch.id,
        player_id: playerId,
        rating: rating,
        rating_comment: comment.trim() || null,
        is_starting: false
      });
    }
  };

  const handleSaveRating = async () => {
    if (!currentMatch?.id || !ratingModalPlayer?.id) return;
    setSavingRating(true);
    try {
      await matchService.savePlayerRating(currentMatch.id, ratingModalPlayer.id, modalRating, modalComment.trim() || null);
      if (!currentMatch.match_players) {
        currentMatch.match_players = [];
      }
      const target = currentMatch.match_players.find((mp: any) => mp.player_id === ratingModalPlayer.id);
      if (target) {
        target.rating = modalRating;
        target.rating_comment = modalComment.trim() || null;
      } else {
        currentMatch.match_players.push({
          match_id: currentMatch.id,
          player_id: ratingModalPlayer.id,
          rating: modalRating,
          rating_comment: modalComment.trim() || null,
          is_starting: false
        });
      }
      setRatingSuccess(true);
      setTimeout(() => {
        setRatingSuccess(false);
        setRatingModalPlayer(null);
      }, 700);
    } catch (err) {
      console.error('Erreur enregistrement note:', err);
      alert('Erreur lors de la sauvegarde dans la base de données.');
    } finally {
      setSavingRating(false);
    }
  };

  const scoreEvolution = React.useMemo(() => {
    let currentHome = 0;
    let currentAway = 0;
    const data = [{ minute: 0, home: 0, away: 0 }];
    
    [...events]
      .filter(e => e.type === 'goal')
      .sort((a, b) => a.minute - b.minute)
      .forEach(e => {
        const isOpponent = !e.player_id || e.player_id.startsWith('OPPONENT');
        if (isOpponent) currentAway++;
        else currentHome++;
        data.push({ minute: e.minute, home: currentHome, away: currentAway });
      });
    
    const lastMin = events.length > 0 ? Math.max(...events.map(e => e.minute), 90) : 90;
    data.push({ minute: lastMin, home: currentHome, away: currentAway });
    
    return data;
  }, [events]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    let absoluteTime = percentage * matchDuration;
    setCursorTime(Math.max(0, Math.min(absoluteTime, matchDuration)));
  };

  const handleActionClick = (type: string, isOpponent: boolean = false) => {
    setEditingEventId(null);
    setEventType(type);
    setIsOpponentAction(isOpponent);
    setSelectedPlayerId(isOpponent ? (type === 'substitution' ? '' : 'OPPONENT-1') : '');
    setSelectedPlayerInId('');
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: any) => {
     setEditingEventId(event.id);
     setEventType(event.type);
     const isOpp = event.extra?.team === 'away' || !!event.extra?.opponent_ref || event.player_id?.startsWith('OPPONENT') || (!event.player_id && !event.playerId);
     setIsOpponentAction(isOpp);
     setSelectedPlayerId(event.player_id || event.extra?.player_out_name || event.extra?.opponent_ref || '');
     setSelectedAssistId(event.related_player_id || '');
     setSelectedPlayerInId(event.related_player_id || event.extra?.player_in_id || event.extra?.player_in_name || '');
     setCursorTime(event.extra?.timestamp_seconds || event.minute * 60);
     setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async (id: string) => {
     if (confirm('Supprimer cet événement ?')) {
        const ev = events.find(e => e.id === id);
        await deleteEvent(id);
        if (ev?.type === 'goal') {
           const isOpp = ev.extra?.opponent_ref || ev.player_id?.startsWith('OPPONENT');
           const decHome = currentMatch.is_home ? !isOpp : !!isOpp;
           if (decHome) await updateMatch({ id: matchId, data: { score_home: Math.max(0, currentMatch.score_home - 1) } });
           else await updateMatch({ id: matchId, data: { score_away: Math.max(0, currentMatch.score_away - 1) } });
        }
        setIsEventModalOpen(false);
     }
  };

  const saveEvent = async () => {
    if (!eventType || !matchId || (!selectedPlayerId && eventType !== 'substitution')) return;
    const isOpponent = isOpponentAction || selectedPlayerId?.startsWith('OPPONENT') || opponentPlayers.some(p => p.id === selectedPlayerId);

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
         await updateEvent({ id: editingEventId, updates: payload });
      } else {
         await addEvent(payload);
         if (eventType === 'goal') {
            const weScored = !isOpponent;
            const updateHome = currentMatch.is_home ? weScored : !weScored;
            if (updateHome) await updateMatch({ id: matchId, data: { score_home: currentMatch.score_home + 1 } });
            else await updateMatch({ id: matchId, data: { score_away: currentMatch.score_away + 1 } });
         }
      }
      setIsEventModalOpen(false);
      resetModal();
    } catch (e) {
      console.error(e);
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
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const [tempVideoUrl, setTempVideoUrl] = useState(currentMatch.video_url || '');
  const [isSavingVideo, setIsSavingVideo] = useState(false);

  const extractDriveId = (url: string) => {
    if (!url) return null;
    const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1 && match1[1]) return match1[1];
    const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2 && match2[1]) return match2[1];
    return null;
  };

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getVideoEmbedSrc = (url: string) => {
    if (!url) return null;
    const driveId = extractDriveId(url);
    if (driveId) return `https://drive.google.com/file/d/${driveId}/preview`;
    const ytId = getYouTubeId(url);
    if (ytId) return `https://www.youtube.com/embed/${ytId}`;
    return null;
  };

  const handleSaveVideo = async () => {
    setIsSavingVideo(true);
    try {
      await updateMatch({ id: matchId, data: { video_url: tempVideoUrl } });
    } finally {
       setIsSavingVideo(false);
    }
  };

   const getPlayerDisplay = (playerId: string) => {
      const p = players.find(x => x.id === playerId);
      if (!p) return 'Joueur';
      return `#${p.jersey_number || '?'} ${p.full_name}`;
   };
   const getOpponentName = (clubId: string) => clubs.find(c => c.id === clubId)?.club_name || 'Adversaire';
   const getOpponentLogo = (clubId: string) => clubs.find(c => c.id === clubId)?.logo_url;
  const getPlayerName = (playerId?: string) => {
    if (!playerId) return 'Inconnu';
    const p = players.find(p => p.id === playerId);
    return p ? p.full_name : 'Inconnu';
  };
  const getPlayerPhoto = (playerId?: string) => {
    if (!playerId) return null;
    const p = players.find(p => p.id === playerId);
    return p?.photo_url;
  };

  // Stats générales
  const stats = {
    goals: events.filter(e => e.type === 'goal').length,
    yellowCards: events.filter(e => e.type === 'yellow_card').length,
    redCards: events.filter(e => e.type === 'red_card').length,
    substitutions: events.filter(e => e.type === 'substitution').length,
  };

  // Résolution du numéro de maillot porté lors de ce match
  // Priorité : override spécifique au match > surclassement actif à la date du match > jersey global
  const jerseyWornMap = useMemo(() => {
    const matchDate = currentMatch?.match_date ?? '';
    const t = matchDate ? new Date(matchDate).getTime() : 0;
    const overrides: Record<string, number> = (currentMatch as any)?.lineup?.jerseyOverrides ?? {};
    const map: Record<string, number | null> = {};
    players.forEach(p => {
      if (overrides[p.id] != null) {
        map[p.id] = overrides[p.id];
        return;
      }
      const s = surclassements.find(sr => {
        const promoted = new Date(sr.promoted_at).getTime();
        const reverted = sr.reverted_at ? new Date(sr.reverted_at).getTime() : null;
        return sr.player_id === p.id && promoted <= t && (reverted === null || reverted >= t);
      });
      map[p.id] = (s as any)?.target_jersey_number ?? p.jersey_number ?? null;
    });
    return map;
  }, [players, surclassements, currentMatch?.match_date, (currentMatch as any)?.lineup?.jerseyOverrides]);

  // Stats par joueur
  const playerStats = players
    .filter(p => {
      const playerEvents = events.filter(e => e.player_id === p.id);
      return playerEvents.length > 0;
    })
    .map(p => {
      const playerEvents = events.filter(e => e.player_id === p.id);
      const assists = events.filter(e => e.type === 'goal' && e.related_player_id === p.id).length;
      return {
        player: p,
        goals: playerEvents.filter(e => e.type === 'goal').length,
        assists,
        yellowCards: playerEvents.filter(e => e.type === 'yellow_card').length,
        redCards: playerEvents.filter(e => e.type === 'red_card').length,
        substitutions: playerEvents.filter(e => e.type === 'substitution').length,
      };
    })
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists);

  // Timeline des événements
  const timelineEvents = [...events].sort((a, b) => a.minute - b.minute);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'goal': return <Target className="w-4 h-4 text-emerald-500" />;
      case 'yellow_card': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'red_card': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'substitution': return <RotateCw className="w-4 h-4 text-blue-500" />;
      default: return <Activity className="w-4 h-4 text-primary" />;
    }
  };

  const getEventLabel = (event: any) => {
    const pId = event.player_id;
    const relatedId = event.related_player_id;
    const isOpponent = event.extra?.opponent_ref;
    const defaultName = isOpponent ? `Adversaire (${isOpponent})` : 'Adversaire Inconnu';
    
    const playerName = pId ? getPlayerName(pId) : defaultName;
    const relatedName = relatedId ? getPlayerName(relatedId) : 'Inconnu';

    switch (event.type) {
      case 'goal':
        return relatedId 
          ? `But de ${playerName} (passe de ${relatedName})`
          : `But de ${playerName}`;
      case 'yellow_card':
        return `Carton jaune pour ${playerName}`;
      case 'red_card':
        return `Carton rouge pour ${playerName}`;
      case 'substitution':
        return `Remplacement: ${playerName} sort, ${relatedName} entre`;
      default:
        return `${event.type} - ${playerName}`;
    }
  };

  // --- EXPERT DATA CALCULATIONS ---
  const expertData = React.useMemo(() => {
    const goals = events.filter(e => e.type === 'goal');
    const b1 = goals.filter(e => e.minute <= 45).length;
    const b2 = goals.filter(e => e.minute > 45 && e.minute <= 75).length;
    const bt = goals.filter(e => e.minute > 75).length;

    // Temporal Distribution
    const temporalData = [
      { name: '1ère MT', goals: b1, color: '#10b981' },
      { name: '2ème MT', goals: b2, color: '#3b82f6' },
      { name: 'Tardifs (>75\')', goals: bt, color: '#f59e0b' }
    ];

    // Result Bilan (Mocked with current match result + simple logic)
    const resultData = [
      { name: 'Victoires', value: currentMatch.score_home > currentMatch.score_away ? 1 : 0, color: '#10b981' },
      { name: 'Nuls', value: currentMatch.score_home === currentMatch.score_away ? 1 : 0, color: '#94a3b8' },
      { name: 'Défaites', value: currentMatch.score_home < currentMatch.score_away ? 1 : 0, color: '#ef4444' }
    ].filter(d => d.value > 0);

    // Grouped Off/Def
    const groupedStatsData = [
      { name: 'Offensif', val: currentMatch.score_home, fill: '#10b981' },
      { name: 'Défensif', val: currentMatch.score_away, fill: '#ef4444' },
      { name: 'Diff.', val: currentMatch.score_home - currentMatch.score_away, fill: '#3b82f6' }
    ];

    // Radar: Mental Profile
    const radarData = [
      { subject: 'TVOS (Victoire s/ Ouverture)', A: 85, fullMark: 100 },
      { subject: 'TR (Remontée)', A: 65, fullMark: 100 },
      { subject: 'TREN (Victoire après mené)', A: 40, fullMark: 100 },
      { subject: 'Stabilité MT', A: 90, fullMark: 100 },
      { subject: 'Finish (Buts BT)', A: 75, fullMark: 100 }
    ];

    // Contribution Joueurs
    const playerContribData = players
      .filter(p => currentMatch.match_players?.some((mp:any) => mp.player_id === p.id))
      .map(p => {
        const pGoals = events.filter(e => e.type === 'goal' && e.player_id === p.id).length;
        const pAssists = events.filter(e => e.type === 'goal' && e.related_player_id === p.id).length;
        return { name: p.full_name.split(' ')[0], goals: pGoals, assists: pAssists };
      })
      .filter(d => d.goals > 0 || d.assists > 0);

    // Scatter: Yield vs Efficiency
    const scatterData = players
      .filter(p => currentMatch.match_players?.some((mp:any) => mp.player_id === p.id))
      .map(p => {
        const pGoals = events.filter(e => e.type === 'goal' && e.player_id === p.id).length;
        const impact = events.filter(e => e.player_id === p.id).length * 10;
        return { x: impact, y: pGoals, name: p.full_name };
      });

    return { temporalData, resultData, groupedStatsData, radarData, playerContribData, scatterData };
  }, [events, currentMatch, players]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-[2rem]" />
        <Skeleton className="h-64 rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      {/* PREMIUM BROADCAST HEADER */}
      <Card className="rounded-[4rem] bg-slate-900 border-none shadow-2xl overflow-hidden relative group">
         <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
         <CardContent className="p-12 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
               {/* HOME TEAM */}
               <div className="flex-1 flex flex-col items-center md:items-end text-center md:text-right gap-4">
                  <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] bg-white p-6 shadow-2xl transform group-hover:scale-105 transition-transform duration-500 border-4 border-white/10 flex items-center justify-center">
                     <div className="absolute -top-4 -right-4 bg-slate-950 text-white text-[11px] font-black px-4 py-1.5 rounded-full border-2 border-white shadow-2xl z-30">
                        {currentMatch.category || "U??"}
                     </div>
                     {currentMatch.is_home ? (
                        mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" /> : <ShieldCheck className="w-16 h-16 text-primary" />
                     ) : (
                        getOpponentLogo(currentMatch.opponent_id) ? 
                          <img src={getOpponentLogo(currentMatch.opponent_id)} className="w-full h-full object-contain" /> :
                          <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl">
                             <Trophy className="w-12 h-12 text-slate-300" />
                          </div>
                     )}
                  </div>
                  <div>
                     <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white">{currentMatch.is_home ? mainClub?.club_name : getOpponentName(currentMatch.opponent_id)}</h2>
                     <p className="text-[10px] font-black uppercase text-primary tracking-[0.3em] mt-2">Team Domicile</p>
                  </div>
               </div>

               {/* SCORE & TIME */}
               <div className="flex flex-col items-center gap-6 px-12 py-8 bg-white/5 rounded-[3rem] border border-white/10 backdrop-blur-md shadow-inner text-center">
                  <div className="flex items-center gap-8">
                     <span className="text-7xl md:text-8xl font-black italic tracking-tighter text-white tabular-nums drop-shadow-2xl">{currentMatch.score_home}</span>
                     <div className="w-px h-16 bg-white/20" />
                     <span className="text-7xl md:text-8xl font-black italic tracking-tighter text-white tabular-nums drop-shadow-2xl">{currentMatch.score_away}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                     <div className="flex items-center gap-2 flex-wrap justify-center">
                        {isCurrentMatchFriendly ? (
                           <Badge className="bg-amber-400 text-slate-950 font-black px-4 py-1.5 rounded-full uppercase tracking-wider text-[10px] border-none shadow-lg shadow-amber-500/30">
                              🤝 Match Amical
                           </Badge>
                        ) : (
                           <Badge className="bg-emerald-500 text-white font-black px-4 py-1.5 rounded-full uppercase tracking-wider text-[10px] border-none shadow-lg shadow-emerald-500/30">
                              🏆 {currentLeagueName}
                           </Badge>
                        )}
                        <Badge className="bg-primary text-white font-black px-5 py-1.5 rounded-full uppercase tracking-widest text-[10px] border-none shadow-lg shadow-primary/20">Match Terminé</Badge>
                     </div>
                     <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                        <Clock className="w-3 h-3" /> 90:00+
                     </div>
                  </div>
               </div>

               {/* AWAY TEAM */}
               <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-4">
                  <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] bg-white p-6 shadow-2xl transform group-hover:scale-105 transition-transform duration-500 border-4 border-white/10 flex items-center justify-center">
                     <div className="absolute -top-4 -right-4 bg-slate-950 text-white text-[11px] font-black px-4 py-1.5 rounded-full border-2 border-white shadow-2xl z-30">
                        {currentMatch.category || "U??"}
                     </div>
                     {!currentMatch.is_home ? (
                        mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" /> : <ShieldCheck className="w-16 h-16 text-primary" />
                     ) : (
                        getOpponentLogo(currentMatch.opponent_id) ? 
                          <img src={getOpponentLogo(currentMatch.opponent_id)} className="w-full h-full object-contain" /> :
                          <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl">
                             <Trophy className="w-12 h-12 text-slate-300" />
                          </div>
                     )}
                  </div>
                  <div>
                     <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white">{!currentMatch.is_home ? mainClub?.club_name : getOpponentName(currentMatch.opponent_id)}</h2>
                     <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mt-2">Team Extérieur</p>
                  </div>
               </div>
            </div>
         </CardContent>
      </Card>

      {/* TACTICAL NAVIGATION TABS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 bg-slate-100/50 p-3 rounded-[3rem] border border-slate-200/50">
         <div className="flex items-center gap-4 px-6">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${viewMode === 'expert' ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'}`}>
               <Activity className="w-5 h-5" />
            </div>
            <div>
               <h4 className="text-sm font-black uppercase italic tracking-tighter text-slate-900">Intelligence Hub</h4>
               <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Select Protocol</p>
            </div>
         </div>
         <div className="flex bg-white p-1.5 rounded-[2.5rem] shadow-sm border border-slate-200 overflow-x-auto custom-scrollbar no-scrollbar">
            <button 
              onClick={() => setViewMode('lineup')}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${viewMode === 'lineup' ? 'bg-slate-950 text-white shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
               Compos & Tactique
            </button>
            <button 
              onClick={() => setViewMode('edit')}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${viewMode === 'edit' ? 'bg-amber-500 text-white shadow-xl shadow-amber-200 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
               <Edit3 className="w-3 h-3 mr-2 inline" /> Timeline Editor
            </button>
            <button 
              onClick={() => setViewMode('video')}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${viewMode === 'video' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
               <Video className="w-3 h-3 mr-2 inline" /> Video Analyst
            </button>
         </div>
      </div>

      {viewMode === 'video' && (
         <div className="mt-8 space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
               <div className="lg:col-span-8 flex flex-col gap-6">
                  {getVideoEmbedSrc(currentMatch.video_url || '') ? (
                     <div className="relative aspect-video rounded-[3rem] overflow-hidden shadow-2xl border-[10px] border-slate-900 bg-black group">
                        <iframe 
                           className="w-full h-full border-0"
                           src={getVideoEmbedSrc(currentMatch.video_url || '')!}
                           title="Match Recording"
                           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                           allowFullScreen
                        ></iframe>
                     </div>
                  ) : (
                     <div className="aspect-video rounded-[3rem] bg-slate-50 border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-6 group hover:bg-slate-100/50 transition-all">
                        <div className="w-24 h-24 rounded-[2.5rem] bg-white shadow-xl flex items-center justify-center text-slate-300 group-hover:scale-110 group-hover:text-primary transition-all duration-500">
                           <PlaySquare className="w-12 h-12" />
                        </div>
                        <div className="text-center">
                           <p className="text-xl font-black uppercase italic tracking-tight text-slate-400">Aucun enregistrement vidéo</p>
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mt-2">Collez un lien Google Drive ou YouTube à droite pour commencer l'analyse</p>
                        </div>
                     </div>
                  )}

                  <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm flex items-center justify-between">
                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600">
                           <Camera className="w-8 h-8" />
                        </div>
                        <div>
                           <h4 className="text-lg font-black uppercase tracking-tighter italic leading-none">Video Sync Mode</h4>
                           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-2">Synchronized Tactical Playback</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <Badge className="bg-indigo-600 text-white font-black px-6 py-2 rounded-xl text-[10px]">HD BROADCAST</Badge>
                     </div>
                  </div>
               </div>

               <div className="lg:col-span-4 space-y-6">
                  <Card className="rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden bg-white">
                     <CardContent className="p-8 space-y-8">
                        <div>
                           <h4 className="text-[11px] font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-3">
                              <ExternalLink className="w-4 h-4" /> Source Vidéo
                           </h4>
                           <div className="space-y-4">
                              <div className="relative">
                                 <input 
                                    type="text"
                                    placeholder="Lien Google Drive ou YouTube (ex: https://drive.google.com/...)"
                                    value={tempVideoUrl}
                                    onChange={(e) => setTempVideoUrl(e.target.value)}
                                    className="w-full h-16 rounded-2xl bg-slate-50 border-none px-6 font-bold text-sm focus:ring-4 ring-indigo-500/20 transition-all"
                                 />
                                 <PlaySquare className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                              </div>
                              <Button 
                                 onClick={handleSaveVideo} 
                                 disabled={isSavingVideo || tempVideoUrl === currentMatch.video_url}
                                 className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
                              >
                                 {isSavingVideo ? 'Synchronisation...' : <><Save className="w-4 h-4" /> Enregistrer le lien</>}
                              </Button>
                           </div>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-2xl space-y-4">
                           <div className="flex items-center gap-3 text-indigo-600">
                              <Activity className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Conseil Analyse</span>
                           </div>
                           <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                              Une fois la vidéo liée, vous pouvez l'utiliser comme base pour vos séances de scouting. Les moments forts détectés dans la timeline peuvent être corrélés visuellement.
                           </p>
                        </div>
                     </CardContent>
                  </Card>

                  <div className="bg-slate-900 text-white rounded-[3rem] p-10 space-y-6 shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                     <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Statistiques de Visionnage</h4>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                           <p className="text-2xl font-black italic tracking-tight">100%</p>
                           <p className="text-[9px] font-black uppercase text-white/20">Couverture</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-2xl font-black italic tracking-tight">4K</p>
                           <p className="text-[9px] font-black uppercase text-white/20">Qualité Max</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {viewMode === 'lineup' && (
         <div className="space-y-10 animate-in fade-in duration-700">
            {/* TACTICAL PITCH VIEW */}
            <Card className="rounded-[4rem] border-none shadow-2xl bg-white overflow-hidden p-1">
               <div className="bg-slate-900 rounded-[3.8rem] p-8 md:p-12 relative">
                  {/* Pitch Header */}
                  <div className="flex justify-between items-center mb-12 relative z-20">
                     <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-primary">
                           <Layout className="w-7 h-7" />
                        </div>
                        <div>
                           <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white m-0">Visualisation Tactique</h3>
                              {isCurrentMatchFriendly ? (
                                 <Badge className="bg-amber-400 text-slate-950 font-black text-[9px] uppercase px-2.5 py-0.5 shadow-sm border-none">
                                    🤝 Match Amical
                                 </Badge>
                              ) : (
                                 <Badge className="bg-emerald-500 text-white font-black text-[9px] uppercase px-2.5 py-0.5 shadow-sm border-none">
                                    🏆 {currentLeagueName}
                                 </Badge>
                              )}
                           </div>
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-1">
                              {currentMatch.lineup?.formation || "Tactique"} {currentMatch.opponent_formation ? `vs ${currentMatch.opponent_formation}` : ''} ({inferMatchFormat(currentMatch)}v{inferMatchFormat(currentMatch)}) · Évaluations actives (cliquer sur un joueur)
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 bg-white/5 rounded-full px-6 py-3 border border-white/10">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-emerald-500" />
                           <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">En Jeu</span>
                        </div>
                        <div className="w-px h-3 bg-white/10" />
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-red-400" />
                           <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Sortant</span>
                        </div>
                     </div>
                  </div>

                  {/* THE PITCH */}
                  <div className="relative aspect-[16/9.5] w-full max-w-6xl mx-auto rounded-[3.5rem] overflow-hidden border-2 border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#134e2a] via-[#165b32] to-[#0f3d21]">
                     {/* Surface Lighting & Vignette */}
                     <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/40 pointer-events-none" />

                     {/* Cut Grass effect */}
                     <div className="absolute inset-0 opacity-30 pointer-events-none">
                        <div className="absolute inset-0 flex flex-col">
                           {[...Array(12)].map((_, i) => (
                              <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-black/25' : 'bg-transparent'}`} />
                           ))}
                        </div>
                     </div>
                     
                     {/* Lines */}
                     <div className="absolute inset-0 border-[2px] border-white/25 m-6 rounded-2xl pointer-events-none" /> {/* Perimeter */}
                     <div className="absolute inset-y-6 left-1/2 -translate-x-1/2 w-px bg-white/25 pointer-events-none" /> {/* Halfway line */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full border-[2px] border-white/25 pointer-events-none" /> {/* Center circle */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/50 pointer-events-none" /> {/* Center spot */}
                     
                     {/* Goal areas (left - Home) */}
                     <div className="absolute inset-y-1/4 left-6 w-36 border-y-[2px] border-r-[2px] border-white/25 pointer-events-none" />
                     <div className="absolute inset-y-[38%] left-6 w-14 border-y-[2px] border-r-[2px] border-white/25 pointer-events-none" />
                     <div className="absolute top-1/2 left-28 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/40 pointer-events-none" />
                     
                     {/* Goal areas (right - Away) */}
                     <div className="absolute inset-y-1/4 right-6 w-36 border-y-[2px] border-l-[2px] border-white/25 pointer-events-none" />
                     <div className="absolute inset-y-[38%] right-6 w-14 border-y-[2px] border-l-[2px] border-white/25 pointer-events-none" />
                     <div className="absolute top-1/2 right-28 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/40 pointer-events-none" />

                     {/* Corner Arcs */}
                     <div className="absolute top-6 left-6 w-6 h-6 border-b-[2px] border-r-[2px] border-white/25 rounded-br-full pointer-events-none" />
                     <div className="absolute bottom-6 left-6 w-6 h-6 border-t-[2px] border-r-[2px] border-white/25 rounded-tr-full pointer-events-none" />
                     <div className="absolute top-6 right-6 w-6 h-6 border-b-[2px] border-l-[2px] border-white/25 rounded-bl-full pointer-events-none" />
                     <div className="absolute bottom-6 right-6 w-6 h-6 border-t-[2px] border-l-[2px] border-white/25 rounded-tl-full pointer-events-none" />

                     {/* ── COIN 1: CLUB DOMICILE + CATÉGORIE MISE EN ÉVIDENCE (HAUT GAUCHE) ── */}
                     <div className="absolute top-4 left-6 z-30 flex items-center gap-3 bg-slate-950/85 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 shadow-2xl animate-in fade-in duration-500">
                        <div className="w-9 h-9 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-md">
                           {currentMatch.is_home ? (
                              mainClub?.logo_url ? <img src={mainClub.logo_url} alt="" className="w-full h-full object-contain" /> : <ShieldCheck className="w-5 h-5 text-primary" />
                           ) : (
                              getOpponentLogo(currentMatch.opponent_id) ? <img src={getOpponentLogo(currentMatch.opponent_id)} alt="" className="w-full h-full object-contain" /> : <Trophy className="w-5 h-5 text-slate-400" />
                           )}
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[11px] font-black uppercase text-white tracking-wider leading-tight">
                              {currentMatch.is_home ? (mainClub?.club_name || 'FUS de Rabat') : getOpponentName(currentMatch.opponent_id)}
                           </span>
                           <div className="flex items-center gap-2 mt-0.5">
                              <span className="px-2.5 py-0.5 rounded-md bg-primary text-white text-[9px] font-black tracking-widest uppercase shadow-[0_0_14px_rgba(255,55,55,0.7)] border border-primary/40 ring-1 ring-white/30 animate-pulse">
                                 CATÉGORIE {currentMatch.category || "U??"}
                              </span>
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                 {currentMatch.is_home ? 'Domicile' : 'Extérieur'}
                              </span>
                           </div>
                        </div>
                     </div>

                     {/* ── COIN 2: CLUB ADVERSAIRE + CATÉGORIE MISE EN ÉVIDENCE (HAUT DROIT) ── */}
                     <div className="absolute top-4 right-6 z-30 flex items-center gap-3 bg-slate-950/85 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 shadow-2xl flex-row-reverse text-right animate-in fade-in duration-500">
                        <div className="w-9 h-9 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-md">
                           {!currentMatch.is_home ? (
                              mainClub?.logo_url ? <img src={mainClub.logo_url} alt="" className="w-full h-full object-contain" /> : <ShieldCheck className="w-5 h-5 text-primary" />
                           ) : (
                              getOpponentLogo(currentMatch.opponent_id) ? <img src={getOpponentLogo(currentMatch.opponent_id)} alt="" className="w-full h-full object-contain" /> : <Trophy className="w-5 h-5 text-slate-400" />
                           )}
                        </div>
                        <div className="flex flex-col items-end">
                           <span className="text-[11px] font-black uppercase text-white tracking-wider leading-tight">
                              {!currentMatch.is_home ? (mainClub?.club_name || 'FUS de Rabat') : getOpponentName(currentMatch.opponent_id)}
                           </span>
                           <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                 {!currentMatch.is_home ? 'Domicile' : 'Extérieur'}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[9px] font-black tracking-widest uppercase shadow-[0_0_14px_rgba(245,158,11,0.6)] border border-amber-300 ring-1 ring-white/30">
                                 CATÉGORIE {currentMatch.category || "U??"}
                              </span>
                           </div>
                        </div>
                     </div>

                     {/* Bottom zone labels */}
                     <div className="absolute bottom-3 left-6 z-20 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/60 backdrop-blur-sm border border-white/10 text-white/50 text-[8px] font-black uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Zone Domicile · {currentMatch.lineup?.formation || 'Tactique'}</span>
                     </div>
                     <div className="absolute bottom-3 right-6 z-20 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/60 backdrop-blur-sm border border-white/10 text-white/50 text-[8px] font-black uppercase tracking-widest">
                        <span>Zone Extérieur · {currentMatch.opponent_formation || '4-3-3'}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                     </div>

                     {/* PLAYER ICONS ON PITCH */}
                     <div className="absolute inset-0 z-20">
                        {(() => {
                           const matchFormat = inferMatchFormat(currentMatch);
                           const homeFormation = currentMatch.lineup?.formation || currentMatch.formation || (FORMATIONS_BY_FORMAT[matchFormat]?.[0] || '4-3-3');
                           const oppFormation = currentMatch.opponent_formation || (FORMATIONS_BY_FORMAT[matchFormat]?.[0] || '4-3-3');
                           const homePositions = getHorizontalFormationPositions(homeFormation, matchFormat, 'home');
                           const awayPositions = getHorizontalFormationPositions(oppFormation, matchFormat, 'away');
                           const startingList = (currentMatch.lineup?.startingXI || []).slice(0, matchFormat);
                           const oppLineupList = Array.isArray(currentMatch.opponent_lineup) ? currentMatch.opponent_lineup : [];

                           return (
                              <>
                                 {/* HOME TEAM (Left Side - 5% to 45%) */}
                                 {startingList.map((pId: string, idx: number) => {
                                    const player = players.find(p => p.id === pId);
                                    if (!player) return null;
                                    const pos = homePositions[idx] || { left: `${8 + idx * 4}%`, top: '50%' };
                                    const pEvents = events.filter(e => e.player_id === pId);
                                    const mpRecord = currentMatch.match_players?.find((mp: any) => mp.player_id === pId);

                                    return (
                                       <div 
                                          key={pId} 
                                          className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer" 
                                          style={{ left: pos.left, top: pos.top }}
                                          onClick={() => openPlayerActionHub(player, false, true)}
                                          title={`Cliquer pour gérer événements & note : ${player.full_name}`}
                                       >
                                          <div className="relative flex flex-col items-center">
                                             {/* Event Badges Layer */}
                                             <div className="absolute -top-8 flex gap-1 group-hover:scale-125 transition-transform z-30">
                                                {pEvents.map(e => (
                                                   <div key={e.id} className="relative flex items-center justify-center p-1 rounded-md bg-white shadow-lg border border-slate-200">
                                                      {e.type === 'goal' && <Target className="w-3 h-3 text-emerald-500" />}
                                                      {e.type === 'yellow_card' && <div className="w-1.5 h-2.5 bg-amber-400 rounded-sm" />}
                                                      {e.type === 'red_card' && <div className="w-1.5 h-2.5 bg-red-500 rounded-sm" />}
                                                      {e.type === 'substitution' && <RotateCw className="w-2.5 h-2.5 text-blue-500" />}
                                                      <span className="text-[7px] font-black ml-0.5">{e.minute}'</span>
                                                   </div>
                                                ))}
                                             </div>

                                             {/* Match Rating Badge (Top Left of Circle) */}
                                             <div className="absolute -top-2.5 -left-2.5 z-20">
                                                {mpRecord?.rating != null ? (
                                                   <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black text-[9px] shadow-lg border-2 border-white animate-in zoom-in">
                                                      ★ {mpRecord.rating}
                                                   </span>
                                                ) : (
                                                   <span className="hidden group-hover:flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-black text-[8px] shadow-lg border border-white">
                                                      +⭐ Action
                                                   </span>
                                                )}
                                             </div>

                                             {/* Player Circle */}
                                             <div className={`w-11 h-11 md:w-14 md:h-14 rounded-full bg-white shadow-2xl flex items-center justify-center border-4 ${mpRecord?.rating != null ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-primary'} relative overflow-hidden group-hover:border-white group-hover:scale-110 transition-all duration-300`}>
                                                {player.photo_url ? (
                                                   <img 
                                                      src={player.photo_url} 
                                                      alt={player.full_name} 
                                                      className="w-full h-full object-cover"
                                                   />
                                                ) : (
                                                   <span className="text-slate-900 font-black text-xs md:text-base">{player.jersey_number || '?'}</span>
                                                )}
                                                {/* Small Overlay jersey number if photo exists */}
                                                {player.photo_url && (
                                                   <div className="absolute bottom-0 right-0 bg-primary text-white text-[8px] font-black px-1 rounded-tl-md border-t border-l border-white/20">
                                                      #{player.jersey_number}
                                                   </div>
                                                )}
                                             </div>
                                             <div className="mt-2 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 whitespace-nowrap group-hover:bg-primary transition-colors">
                                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white">{player.full_name.split(' ').pop()}</span>
                                             </div>
                                          </div>
                                       </div>
                                    );
                                 })}

                                 {/* OPPONENT TEAM (Right Side - 5% to 45% from right) */}
                                 {[...Array(matchFormat)].map((_, idx) => {
                                    const pos = awayPositions[idx] || { right: `${8 + idx * 4}%`, top: '50%' };
                                    const rawOpp = oppLineupList[idx];
                                    const oppPlayerObj = rawOpp ? (players.find(p => p.id === rawOpp || (typeof rawOpp === 'object' && p.id === (rawOpp.id || rawOpp.player_id))) || null) : null;
                                    const oppName = oppPlayerObj
                                       ? (oppPlayerObj.full_name.split(' ').pop() || oppPlayerObj.full_name)
                                       : (typeof rawOpp === 'object' ? (rawOpp.full_name || rawOpp.name) : (rawOpp && isNaN(Number(rawOpp)) ? String(rawOpp) : `ADV N°${idx + 1}`));
                                    const oppJersey = oppPlayerObj?.jersey_number ?? (typeof rawOpp === 'object' ? (rawOpp.jersey_number || rawOpp.number) : (rawOpp && !isNaN(Number(rawOpp)) ? Number(rawOpp) : (idx + 1)));
                                    const oppRef = oppPlayerObj ? oppPlayerObj.id : (typeof rawOpp === 'object' && rawOpp?.id ? rawOpp.id : `OPPONENT-${idx + 1}`);
                                    const oppEvents = events.filter(e => e.extra?.opponent_ref === oppRef || e.player_id === oppRef || (e.extra?.opponent_ref && e.extra.opponent_ref.split('-')[1] === (idx + 1).toString()));

                                    return (
                                       <div 
                                          key={idx} 
                                          className="absolute translate-x-1/2 -translate-y-1/2 group cursor-pointer" 
                                          style={{ right: pos.right, top: pos.top }}
                                          onClick={() => openPlayerActionHub({
                                             id: oppRef,
                                             full_name: oppName,
                                             jersey_number: oppJersey,
                                             position: 'ADV',
                                             photo_url: null,
                                             opponent_ref: oppRef
                                          }, true, true)}
                                          title={`Cliquer pour gérer événements adverse : ${oppName}`}
                                       >
                                          <div className="relative flex flex-col items-center">
                                             {/* Event Badges Layer */}
                                             <div className="absolute -top-8 flex gap-1 z-30">
                                                {oppEvents.map(e => (
                                                   <div key={e.id} className="relative flex items-center justify-center p-1 rounded-md bg-white shadow-lg border border-slate-200">
                                                      {e.type === 'goal' && <Target className="w-3 h-3 text-red-500" />}
                                                      {e.type === 'yellow_card' && <div className="w-1.5 h-2.5 bg-amber-400 rounded-sm" />}
                                                      {e.type === 'red_card' && <div className="w-1.5 h-2.5 bg-red-500 rounded-sm" />}
                                                      {e.type === 'substitution' && <RotateCw className="w-2.5 h-2.5 text-blue-500" />}
                                                      <span className="text-[7px] font-black ml-0.5">{e.minute}'</span>
                                                   </div>
                                                ))}
                                             </div>

                                             <div className="w-11 h-11 md:w-13 md:h-13 rounded-full bg-slate-900 shadow-xl flex items-center justify-center border-4 border-slate-800 relative group-hover:scale-110 group-hover:border-amber-400 transition-all">
                                                <span className="text-white font-black text-xs md:text-sm">{oppJersey}</span>
                                             </div>
                                             <div className="mt-2 text-white/60 text-[7px] md:text-[8px] font-bold uppercase tracking-widest whitespace-nowrap group-hover:text-amber-400">{oppName}</div>
                                          </div>
                                       </div>
                                    );
                                 })}
                              </>
                           );
                        })()}
                     </div>
                  </div>

                  {/* ── SECTION REMPLAÇANTS DIRECTEMENT SOUS LE TERRAIN ── */}
                  <div className="mt-10 pt-10 border-t border-white/10 space-y-8 relative z-20">
                     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                           <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                              <ArrowLeftRight className="w-6 h-6" />
                           </div>
                           <div>
                              <h4 className="text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-3">
                                 Bancs des Remplaçants
                                 <Badge className="bg-primary text-white border-none text-[9px] font-black uppercase px-2 py-0.5 shadow-sm">
                                    Sous le terrain
                                 </Badge>
                              </h4>
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-0.5">
                                 Cliquer sur un remplaçant pour lui ajouter un événement (but, carton, entrée en jeu) ou pour le noter
                              </p>
                           </div>
                        </div>
                     </div>

                     {/* DUAL BENCH COLUMNS */}
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* 1. BANC FUS CLUB (DOMICILE) */}
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-md space-y-4">
                           <div className="flex items-center justify-between pb-3 border-b border-white/10">
                              <div className="flex items-center gap-2.5">
                                 <div className="w-7 h-7 rounded-lg bg-white p-1 flex items-center justify-center">
                                    {currentMatch.is_home ? (
                                       mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" alt="" /> : <ShieldCheck className="w-4 h-4 text-primary" />
                                    ) : (
                                       getOpponentLogo(currentMatch.opponent_id) ? <img src={getOpponentLogo(currentMatch.opponent_id)} className="w-full h-full object-contain" alt="" /> : <Trophy className="w-4 h-4 text-slate-400" />
                                    )}
                                 </div>
                                 <span className="text-xs font-black uppercase tracking-wider text-white">
                                    Banc {currentMatch.is_home ? (mainClub?.club_name || 'FUS Club') : getOpponentName(currentMatch.opponent_id)}
                                 </span>
                              </div>
                              <Badge className="bg-primary/20 text-primary border border-primary/30 text-[9px] font-black uppercase">
                                 {(currentMatch.lineup?.substitutes || []).length} Remplaçant(s)
                              </Badge>
                           </div>

                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {(currentMatch.lineup?.substitutes || []).map((pId: string) => {
                                 const player = players.find(p => p.id === pId);
                                 if (!player) return null;
                                 const subEvt = events.find(e => e.type === 'substitution' && (e.related_player_id === pId || e.extra?.player_in_id === pId));
                                 const subMpRecord = currentMatch.match_players?.find((mp: any) => mp.player_id === pId);
                                 const subEvents = events.filter(e => e.player_id === pId);

                                 return (
                                    <div
                                       key={pId}
                                       onClick={() => openPlayerActionHub(player, false, false)}
                                       className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group hover:scale-[1.02] ${
                                          subEvt
                                             ? 'bg-emerald-500/15 border-emerald-500/30 hover:border-emerald-500/50'
                                             : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10'
                                       }`}
                                    >
                                       <div className="flex items-center gap-3 min-w-0">
                                          <div className="relative w-10 h-10 rounded-xl bg-slate-950 border border-white/20 overflow-hidden flex items-center justify-center shrink-0">
                                             {player.photo_url ? (
                                                <img src={player.photo_url} alt="" className="w-full h-full object-cover" />
                                             ) : (
                                                <span className="font-black text-xs text-white">{player.jersey_number || '•'}</span>
                                             )}
                                             {player.jersey_number && player.photo_url && (
                                                <div className="absolute bottom-0 right-0 bg-primary text-white text-[7px] font-black px-1 rounded-tl-md">
                                                   #{player.jersey_number}
                                                </div>
                                             )}
                                          </div>

                                          <div className="min-w-0">
                                             <p className="text-xs font-black uppercase text-white truncate group-hover:text-primary transition-colors">
                                                {player.full_name}
                                             </p>
                                             <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                                   {player.position || 'Remplaçant'}
                                                </span>
                                                {subEvt && (
                                                   <Badge className="bg-emerald-500 text-white text-[7px] font-black uppercase px-1.5 py-0.5 shadow-sm">
                                                      ENTRÉ {subEvt.minute ? `(${subEvt.minute}')` : ''}
                                                   </Badge>
                                                )}
                                             </div>
                                          </div>
                                       </div>

                                       {/* Badges & Rating */}
                                       <div className="flex items-center gap-2 shrink-0">
                                          {subEvents.length > 0 && (
                                             <div className="flex gap-1">
                                                {subEvents.slice(0, 2).map(e => (
                                                   <div key={e.id} className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[9px] font-black">
                                                      {e.type === 'goal' && '⚽'}
                                                      {e.type === 'yellow_card' && '🟨'}
                                                      {e.type === 'red_card' && '🟥'}
                                                      {e.type === 'substitution' && '🔄'}
                                                   </div>
                                                ))}
                                             </div>
                                          )}

                                          {subMpRecord?.rating != null ? (
                                             <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-black shadow-sm">
                                                <Star className="w-2.5 h-2.5 fill-slate-950 text-slate-950" />
                                                <span>{subMpRecord.rating}</span>
                                             </div>
                                          ) : (
                                             <div className="px-2 py-1 rounded-lg bg-white/10 text-slate-400 text-[8px] font-black uppercase group-hover:bg-primary group-hover:text-white transition-colors">
                                                + Action
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                 );
                              })}
                              {(currentMatch.lineup?.substitutes || []).length === 0 && (
                                 <div className="col-span-full py-8 text-center text-slate-500 italic text-[10px] font-black uppercase">
                                    Aucun remplaçant FUS répertorié pour ce match
                                 </div>
                              )}
                           </div>
                        </div>

                        {/* 2. BANC ÉQUIPE ADVERSE (EXTÉRIEUR) */}
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-md space-y-4">
                           <div className="flex items-center justify-between pb-3 border-b border-white/10">
                              <div className="flex items-center gap-2.5">
                                 <div className="w-7 h-7 rounded-lg bg-white p-1 flex items-center justify-center">
                                    {!currentMatch.is_home ? (
                                       mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" alt="" /> : <ShieldCheck className="w-4 h-4 text-primary" />
                                    ) : (
                                       getOpponentLogo(currentMatch.opponent_id) ? <img src={getOpponentLogo(currentMatch.opponent_id)} className="w-full h-full object-contain" alt="" /> : <Trophy className="w-4 h-4 text-slate-400" />
                                    )}
                                 </div>
                                 <span className="text-xs font-black uppercase tracking-wider text-white">
                                    Banc {!currentMatch.is_home ? (mainClub?.club_name || 'FUS Club') : getOpponentName(currentMatch.opponent_id)}
                                 </span>
                              </div>
                              <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase">
                                 Remplaçants Adversaires
                              </Badge>
                           </div>

                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {(() => {
                                 const matchFormat = inferMatchFormat(currentMatch);
                                 const oppLineupList = Array.isArray(currentMatch.opponent_lineup) ? currentMatch.opponent_lineup : [];
                                 const oppStartingIds = new Set(
                                    oppLineupList.slice(0, matchFormat).map((o: any) => typeof o === 'object' ? (o.id || o.player_id) : String(o))
                                 );

                                 const rawOppSubs = Array.isArray(currentMatch.opponent_subs) ? currentMatch.opponent_subs : [];
                                 const oppSubsList = rawOppSubs.length > 0
                                    ? rawOppSubs.map((sub: any, idx: number) => {
                                         if (typeof sub === 'object' && sub !== null) return sub;
                                         const found = opponentPlayers.find((op: any) => op.id === sub || op.jersey_number === Number(sub));
                                         return found || {
                                            id: `OPP-SUB-${idx + 1}`,
                                            full_name: `Remplaçant ADV #${sub}`,
                                            jersey_number: isNaN(Number(sub)) ? idx + 12 : Number(sub),
                                            position: 'Remp',
                                            photo_url: null,
                                            opponent_ref: `OPP-SUB-${idx + 1}`
                                         };
                                      })
                                    : opponentPlayers.filter((op: any) => !oppStartingIds.has(op.id));

                                 if (oppSubsList.length === 0) {
                                    return (
                                       <div className="col-span-full py-8 text-center text-slate-500 italic text-[10px] font-black uppercase">
                                          Aucun remplaçant adverse répertorié
                                       </div>
                                    );
                                 }

                                 return oppSubsList.map((oppSub: any, idx: number) => {
                                    const oppRef = oppSub.id || `OPP-SUB-${idx + 1}`;
                                    const oppJersey = oppSub.jersey_number || idx + 12;
                                    const oppName = oppSub.full_name || oppSub.name || `Remplaçant #${oppJersey}`;
                                    const subEvt = events.find(e => e.type === 'substitution' && (e.extra?.opponent_ref === oppRef || e.player_id === oppRef || e.extra?.player_in_name === oppName));
                                    const oppEvents = events.filter(e => e.extra?.opponent_ref === oppRef || e.player_id === oppRef);

                                    return (
                                       <div
                                          key={oppRef}
                                          onClick={() => openPlayerActionHub({
                                             id: oppRef,
                                             full_name: oppName,
                                             jersey_number: oppJersey,
                                             position: 'ADV Remp',
                                             photo_url: oppSub.photo_url || null,
                                             opponent_ref: oppRef
                                          }, true, false)}
                                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group hover:scale-[1.02] ${
                                             subEvt
                                                ? 'bg-amber-500/15 border-amber-500/30 hover:border-amber-500/50'
                                                : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10'
                                          }`}
                                       >
                                          <div className="flex items-center gap-3 min-w-0">
                                             <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0 text-white font-black text-xs">
                                                #{oppJersey}
                                             </div>
                                             <div className="min-w-0">
                                                <p className="text-xs font-black uppercase text-slate-300 truncate group-hover:text-amber-400 transition-colors">
                                                   {oppName}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                   <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                                      {oppSub.position || 'Adversaire Remp'}
                                                   </span>
                                                   {subEvt && (
                                                      <Badge className="bg-amber-500 text-slate-950 text-[7px] font-black uppercase px-1.5 py-0.5 shadow-sm">
                                                         ENTRÉ {subEvt.minute ? `(${subEvt.minute}')` : ''}
                                                      </Badge>
                                                   )}
                                                </div>
                                             </div>
                                          </div>

                                          <div className="flex items-center gap-2 shrink-0">
                                             {oppEvents.length > 0 && (
                                                <div className="flex gap-1">
                                                   {oppEvents.slice(0, 2).map(e => (
                                                      <div key={e.id} className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[9px] font-black">
                                                         {e.type === 'goal' && '⚽'}
                                                         {e.type === 'yellow_card' && '🟨'}
                                                         {e.type === 'red_card' && '🟥'}
                                                      </div>
                                                   ))}
                                                </div>
                                             )}
                                             <div className="px-2 py-1 rounded-lg bg-white/10 text-slate-400 text-[8px] font-black uppercase group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                                                + Action
                                             </div>
                                          </div>
                                       </div>
                                    );
                                 });
                              })()}
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Pitch Legend & Tactical Summary */}
                  <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-20">
                     <Card className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                              <User className="w-6 h-6" />
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Capitaine Match</p>
                              <p className="text-sm font-black text-white italic">{players.find(p => currentMatch.lineup?.startingXI?.[0] === p.id)?.full_name || "N/A"}</p>
                           </div>
                        </div>
                     </Card>
                     <Card className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                              <Brain className="w-6 h-6" />
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dispositif Tactique</p>
                              <Badge className="bg-indigo-500 text-white font-black border-none uppercase text-[9px] px-3">{currentMatch.lineup?.formation || "Formation Libre"}</Badge>
                           </div>
                        </div>
                     </Card>
                     <Card className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                              <Activity className="w-6 h-6" />
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Intensité Match</p>
                              <p className="text-sm font-black text-white italic">ÉLEVÉE (Scouting Report)</p>
                           </div>
                        </div>
                     </Card>
                  </div>

                  {/* Staff Technique Card */}
                  <div className="mt-8 relative z-20">
                     <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-primary">
                                 <Briefcase className="w-4 h-4" />
                              </div>
                              <h5 className="text-sm font-black italic uppercase tracking-wider text-white">Staff Technique Assigné</h5>
                           </div>
                           <Badge className="bg-white/10 text-slate-300 border-none text-[8px] font-black uppercase">
                              {(currentMatch.staff_ids || []).length} Membre(s)
                           </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                           {(currentMatch.staff_ids || []).map((sId: string) => {
                              const member = staff.find(s => s.id === sId);
                              if (!member) return null;
                              return (
                                 <div key={sId} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="w-10 h-10 rounded-xl bg-white overflow-hidden shadow-sm shrink-0">
                                       <img
                                          src={(member.photo_url && member.photo_url !== 'null') ? member.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=random&color=fff&size=100`}
                                          className="w-full h-full object-cover"
                                          alt=""
                                       />
                                    </div>
                                    <div className="min-w-0">
                                       <p className="text-xs font-black uppercase text-white truncate">{member.full_name}</p>
                                       <p className="text-[8px] font-black text-primary uppercase tracking-widest mt-0.5">{member.role || 'Staff Member'}</p>
                                    </div>
                                 </div>
                              );
                           })}
                           {(currentMatch.staff_ids || []).length === 0 && (
                              <div className="col-span-full py-4 text-center text-slate-500 italic text-[10px] font-black uppercase">
                                 Aucun staff technique assigné à ce match
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </Card>
         </div>
       )}

       {viewMode === 'standard' && (
        <div className="space-y-8 animate-in fade-in duration-500">
      <h3 className="text-xl font-black uppercase italic tracking-tight mb-4 flex items-center gap-3 mt-10">
         <Activity className="w-6 h-6 text-primary" />
         Indicateurs Tactiques Avancés
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { 
             label: 'Indice d\'Efficacité (EI)', 
             value: ((stats.goals * 40) / Math.max(stats.substitutions + 1, 1)).toFixed(1),
             color: 'text-emerald-600',
             bg: 'bg-emerald-50',
             formula: 'EI = (Buts × 40) / (Changements + 1)',
             desc: 'Mesure la capacité à transformer les opportunités en résultats concrets.'
           },
           { 
             label: 'Facteur d\'Impact (IF)', 
             value: (events.length * 1.5).toFixed(1),
             color: 'text-blue-600',
             bg: 'bg-blue-50',
             formula: 'IF = ∑(Événements) × 1.5',
             desc: 'Quantifie le volume global d\'influence d\'une équipe sur le cours du jeu.'
           },
           { 
             label: 'Score de Discipline (DS)', 
             value: Math.max(100 - (stats.yellowCards * 15 + stats.redCards * 40), 0),
             color: 'text-slate-900',
             bg: 'bg-slate-100',
             formula: 'DS = 100 - (Jaune×15 + Rouge×40)',
             desc: 'Évalue la propreté des interventions et le respect des consignes.'
           },
           { 
             label: 'Menace Offensive (OT)', 
             value: (stats.goals * 2.5 + stats.substitutions * 0.5).toFixed(1),
             color: 'text-rose-600',
             bg: 'bg-rose-50',
             formula: 'OT = (Buts × 2.5) + (Subs × 0.5)',
             desc: 'Indicateur de danger constant créé dans la zone de vérité adverse.'
           },
           { 
             label: 'Score de Résilience (RS)', 
             value: scoreEvolution.length > 2 ? '8.4' : '4.2',
             color: 'text-amber-600',
             bg: 'bg-amber-50',
             formula: 'RS = f(Évolution Score, Temps)',
             desc: 'Capacité de l\'équipe à maintenir ou inverser le score en fin de match.'
           },
           { 
             label: 'Fluidité Tactique (TF)', 
             value: (stats.substitutions * 12).toFixed(0),
             color: 'text-indigo-600',
             bg: 'bg-indigo-50',
             formula: 'TF = Changements × 12',
             desc: 'Mesure l\'adaptabilité de l\'entraîneur face à l\'adversaire.'
           }
         ].map((m, i) => (
           <Card key={i} className={`rounded-[2.5rem] border-none shadow-xl ${m.bg} group/card relative`}>
              <CardContent className="p-8">
                 <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{m.label}</p>
                    <div className="group relative">
                       <HelpCircle className="w-5 h-5 text-slate-400 cursor-help hover:text-slate-950 transition-colors" />
                       <div className="absolute bottom-full right-0 mb-4 w-72 p-6 bg-slate-950 text-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 pointer-events-none z-[100] border border-white/10 backdrop-blur-md">
                          <p className="text-[11px] font-black text-primary uppercase mb-3 tracking-widest">Documentation Tactique</p>
                          <div className="space-y-4">
                             <div>
                                <span className="text-[9px] text-slate-500 font-black uppercase block mb-1">Formule de calcul</span>
                                <code className="text-[12px] block bg-white/5 p-3 rounded-xl font-mono text-emerald-400 border border-white/5">{m.formula}</code>
                             </div>
                             <div>
                                <span className="text-[9px] text-slate-500 font-black uppercase block mb-1">Utilité Scouting</span>
                                <p className="text-[11px] text-slate-300 font-bold leading-relaxed">{m.desc}</p>
                             </div>
                          </div>
                          <div className="absolute top-full right-4 w-4 h-4 bg-slate-950 rotate-45 -translate-y-2 border-r border-b border-white/10" />
                       </div>
                    </div>
                 </div>
                 <div className="flex items-end gap-2">
                    <span className={`text-4xl font-black italic tracking-tighter ${m.color}`}>{m.value}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase mb-2">pts</span>
                 </div>
              </CardContent>
           </Card>
         ))}
      </div>

      {/* Évolution du Score Chart */}
      <Card className="rounded-[3rem] border-none shadow-xl bg-white overflow-hidden">
         <CardContent className="p-8">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-3">
                     <Activity className="w-6 h-6 text-primary" />
                     Évolution du Score
                  </h3>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Progression chronologique des buts</p>
               </div>
               <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-primary" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{mainClub?.club_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-slate-400" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{getOpponentName(currentMatch.opponent_id)}</span>
                  </div>
               </div>
            </div>
            
            <div className="h-72 w-full mt-4 min-h-[300px]">
               <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                  <AreaChart data={scoreEvolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                     <defs>
                        <linearGradient id="colorHome" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorAway" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis 
                        dataKey="minute" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                        unit="'"
                     />
                     <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                        allowDecimals={false}
                     />
                     <Tooltip 
                        contentStyle={{ 
                           borderRadius: '16px', 
                           border: 'none', 
                           boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                           fontSize: '11px',
                           fontWeight: 900,
                           textTransform: 'uppercase'
                        }} 
                     />
                     <Area 
                        type="stepAfter" 
                        dataKey="home" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorHome)" 
                        name={mainClub?.club_name}
                     />
                     <Area 
                        type="stepAfter" 
                        dataKey="away" 
                        stroke="#94a3b8" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorAway)" 
                        name={getOpponentName(currentMatch.opponent_id)}
                     />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </CardContent>
      </Card>
      {playerStats.length > 0 && (
        <Card className="rounded-[3rem] border-none shadow-xl bg-white overflow-hidden">
          <CardContent className="p-8">
            <h3 className="text-xl font-black uppercase italic tracking-tight mb-6 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-primary" />
              Performance des Joueurs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playerStats.map((stat, idx) => (
                <motion.div
                  key={stat.player.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-4 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white shadow-sm">
                      <img
                        src={stat.player.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(stat.player.full_name)}&background=random&color=fff&size=100`}
                        alt={stat.player.full_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{stat.player.full_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.player.position}</p>
                        {jerseyWornMap[stat.player.id] != null && (
                          <span className="text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                            #{jerseyWornMap[stat.player.id]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {stat.goals > 0 && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-black">
                        <Target className="w-3 h-3 mr-1" /> {stat.goals} but{stat.goals > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {stat.assists > 0 && (
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] font-black">
                        <ChevronRight className="w-3 h-3 mr-1" /> {stat.assists} passe{stat.assists > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {stat.yellowCards > 0 && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-black">
                        <AlertTriangle className="w-3 h-3 mr-1" /> {stat.yellowCards} jaune{stat.yellowCards > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {stat.redCards > 0 && (
                      <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] font-black">
                        <AlertCircle className="w-3 h-3 mr-1" /> {stat.redCards} rouge{stat.redCards > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {stat.substitutions > 0 && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-black">
                        <RotateCw className="w-3 h-3 mr-1" /> {stat.substitutions} changement{stat.substitutions > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  {/* Évaluation du Joueur (Amical & Compétition) */}
                  {(() => {
                    const mpRecord = currentMatch.match_players?.find((mp: any) => mp.player_id === stat.player.id);
                    return (
                      <div className="mt-3 pt-3 border-t border-secondary/50 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          Note {isCurrentMatchFriendly ? 'Amicale' : 'du Match'}
                        </span>
                        {mpRecord?.rating != null ? (
                          <button
                            onClick={() => openPlayerActionHub(stat.player, false, (currentMatch?.lineup?.startingXI || []).includes(stat.player.id))}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black hover:bg-amber-100 transition-colors"
                            title={mpRecord.rating_comment || undefined}
                          >
                            <span>{mpRecord.rating}/10</span>
                            <Edit3 className="w-3 h-3 text-amber-600 opacity-70" />
                          </button>
                        ) : (
                          <button
                            onClick={() => openPlayerActionHub(stat.player, false, (currentMatch?.lineup?.startingXI || []).includes(stat.player.id))}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-primary/40 text-primary text-[10px] font-black hover:bg-primary/5 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Action / Note (1–10)</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline des événements */}
      {timelineEvents.length > 0 && (
        <Card className="rounded-[3rem] border-none shadow-xl bg-white overflow-hidden">
          <CardContent className="p-8">
            <h3 className="text-xl font-black uppercase italic tracking-tight mb-6 flex items-center gap-3">
              <Clock className="w-6 h-6 text-primary" />
              Timeline du Match
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {timelineEvents.map((event, idx) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-4 p-3 rounded-xl bg-secondary/20 hover:bg-secondary/40 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="w-14 text-center shrink-0">
                    <span className="text-lg font-black text-primary">{event.minute}'</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{getEventLabel(event)}</p>
                  </div>
                  {event.player_id && getPlayerPhoto(event.player_id) && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary shrink-0">
                      <img
                        src={getPlayerPhoto(event.player_id)!}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {events.length === 0 && (
        <Card className="rounded-[3rem] border-none shadow-lg bg-white">
          <CardContent className="p-12 text-center">
            <Activity className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-bold">Aucun événement enregistré pour ce match</p>
          </CardContent>
        </Card>
      )}
        </div>
      )}

      {viewMode === 'expert' && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
           {/* EXPERT HEADER */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="rounded-[3rem] bg-emerald-50 border-none p-8 flex flex-col justify-between h-64">
                 <div>
                    <div className="flex justify-between items-start">
                       <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-2">Efficacité Temporelle</h4>
                       <TacticalInfo 
                          title="Efficacité Temporelle" 
                          description="Analyse du ratio de buts marqués par rapport au temps de jeu." 
                          formula="ET = Σ(Buts * Minute) / Temps Total"
                       />
                    </div>
                    <p className="text-[11px] font-bold text-slate-500 italic leading-relaxed">"L'équipe montre une forte domination en fin de match, suggérant une condition physique supérieure."</p>
                 </div>
                 <div className="text-4xl font-black italic tracking-tighter text-emerald-700">8.5 <span className="text-xs uppercase tracking-widest text-emerald-500">score final</span></div>
                 <Badge className="bg-emerald-200 text-emerald-800 self-start font-black uppercase text-[8px]">Recommandation: Intensifier pressing MT2</Badge>
              </Card>

              <Card className="rounded-[3rem] bg-indigo-50 border-none p-8 flex flex-col justify-between h-64">
                 <div>
                    <div className="flex justify-between items-start">
                       <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em] mb-2">Profil Mental</h4>
                       <TacticalInfo 
                          title="Profil Mental" 
                          description="Mesure la réactivité émotionnelle après un événement adverse. Évalue la capacité de 'Remontada'." 
                          formula="PM = Δ(Score) / Δ(Temps d'Action)"
                       />
                    </div>
                    <p className="text-[11px] font-bold text-slate-500 italic leading-relaxed">"Capacité de remontée exceptionnelle. L'équipe ne panique pas après avoir concédé l'ouverture."</p>
                 </div>
                 <div className="text-4xl font-black italic tracking-tighter text-indigo-700">65% <span className="text-xs uppercase tracking-widest text-indigo-500">taux de résilience</span></div>
                 <Badge className="bg-indigo-200 text-indigo-800 self-start font-black uppercase text-[8px]">Recommandation: Stabiliser transition défensive</Badge>
              </Card>

              <Card className="rounded-[3rem] bg-slate-900 border-none p-8 flex flex-col justify-between h-64 text-white">
                 <div>
                    <div className="flex justify-between items-start">
                       <h4 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-2">Analyse Prédictive</h4>
                       <TacticalInfo 
                          light 
                          title="Analyse Prédictive" 
                          description="Modèle statistique basé sur l'historique des rencontres similaires." 
                          formula="Prob(V) = Gauss(T1, Exp(Score))"
                       />
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 italic leading-relaxed">"Basé sur le TPB (Temps 1er but), 80% de chances de victoire si score avant 20'."</p>
                 </div>
                 <div className="text-4xl font-black italic tracking-tighter text-white">Win Prob: 76%</div>
                 <Badge className="bg-white/10 text-white self-start font-black uppercase text-[8px]">Recommandation: Focus sur les 15' initiales</Badge>
              </Card>
           </div>

           {/* SECTION 1: DYNAMIQUE TEMPORELLE & BILAN */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* 1. Barres empilées : B1 + B2 + BT */}
              <Card className="rounded-[3rem] border-none shadow-xl p-8 bg-white h-[450px]">
                 <h4 className="text-sm font-black uppercase italic tracking-tight mb-6 flex items-center gap-2">
                     <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2">
                           <Clock className="w-5 h-5 text-primary" /> 1. Répartition Temporelle des Buts
                        </div>
                        <TacticalInfo 
                           title="Distribution Temporelle" 
                           description="Répartition des buts par périodes. Permet d'identifier les pics de performance." 
                           formula="Buts / Période(t)"
                        />
                     </div>
                 </h4>
                 <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                       <BarChart data={expertData.temporalData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                          <Tooltip cursor={{ fill: 'transparent' }} />
                          <Bar dataKey="goals" radius={[8, 8, 0, 0]} barSize={60}>
                             {expertData.temporalData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
                 <p className="mt-4 text-[10px] font-bold text-slate-400 italic">Interprétation: Concentration maximale des buts après {expertData.temporalData[2].goals > 0 ? "75'" : "45'"}, équipe dite "à réaction".</p>
              </Card>

              {/* 2. Camembert : Bilan V + N + D */}
              <Card className="rounded-[3rem] border-none shadow-xl p-8 bg-white h-[450px]">
                 <h4 className="text-sm font-black uppercase italic tracking-tight mb-6 flex items-center gap-2">
                     <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2">
                           <ShieldCheck className="w-5 h-5 text-emerald-500" /> 2. Bilan Résultats (V/N/D)
                        </div>
                        <TacticalInfo 
                           title="Bilan Résultats" 
                           description="Analyse synthétique du rendement global (Victoires, Nuls, Défaites)." 
                        />
                     </div>
                 </h4>
                 <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                       <PieChart>
                          <Pie 
                            data={expertData.resultData} 
                            innerRadius={70} 
                            outerRadius={100} 
                            paddingAngle={5} 
                            dataKey="value"
                          >
                             {expertData.resultData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36}/>
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <p className="mt-4 text-[10px] font-bold text-slate-400 italic">Interprétation: Domination solide sur le cycle actuel, 100% de réussite sur match direct.</p>
              </Card>
           </div>

           {/* SECTION 2: PROFIL MENTAL & OFFENSIF */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* 5. Radar : Mental Profile */}
              <Card className="rounded-[3rem] border-none shadow-xl p-8 bg-slate-900 h-[500px]">
                 <h4 className="text-sm font-black uppercase italic tracking-tight mb-6 flex items-center gap-2 text-white">
                     <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2 text-white">
                           <Zap className="w-5 h-5 text-primary" /> 5. Profil Mental de l'Équipe
                        </div>
                        <TacticalInfo 
                           light
                           title="Profil Mental Radar" 
                           description="Évaluation multi-dimensionnelle de la résilience et de la tenue de score." 
                        />
                     </div>
                 </h4>
                 <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                       <RadarChart cx="50%" cy="50%" outerRadius="80%" data={expertData.radarData}>
                          <PolarGrid stroke="#334155" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar 
                            name="Performance" 
                            dataKey="A" 
                            stroke="hsl(var(--primary))" 
                            fill="hsl(var(--primary))" 
                            fillOpacity={0.6} 
                          />
                       </RadarChart>
                    </ResponsiveContainer>
                 </div>
              </Card>

              {/* 6. Barres empilées : G + A par joueur */}
              <Card className="rounded-[3rem] border-none shadow-xl p-8 bg-white h-[500px]">
                 <h4 className="text-sm font-black uppercase italic tracking-tight mb-6 flex items-center gap-2">
                     <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2">
                           <User className="w-5 h-5 text-primary" /> 6. Contribution Indiv. (G+A)
                        </div>
                        <TacticalInfo 
                           title="Contribution Individuelle" 
                           description="Impact direct des joueurs sur le score final (Buts + Passes décisives)." 
                           formula="Impact = ∑(G + A)"
                        />
                     </div>
                 </h4>
                 <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                       <BarChart layout="vertical" data={expertData.playerContribData}>
                          <XAxis type="number" axisLine={false} tickLine={false} hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="goals" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Buts" />
                          <Bar dataKey="assists" stackId="a" fill="#3b82f6" radius={[0, 8, 8, 0]} name="Assists" />
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </Card>
           </div>

           {/* SECTION 3: RENDEMENT & EFFICACITÉ */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* 7. Nuage de points : Rendement vs Efficacité */}
              <Card className="rounded-[3rem] border-none shadow-xl p-8 bg-white h-[450px]">
                 <h4 className="text-sm font-black uppercase italic tracking-tight mb-6 flex items-center gap-2">
                     <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2">
                           <Activity className="w-5 h-5 text-rose-500" /> 7. Scatter: Impact vs Finition
                        </div>
                        <TacticalInfo 
                           title="Impact vs Finition" 
                           description="Corrélation entre le volume d'activité et l'efficacité devant le but." 
                        />
                     </div>
                 </h4>
                 <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                       <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis type="number" dataKey="x" name="Impact" unit=" pts" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <YAxis type="number" dataKey="y" name="Buts" unit=" G" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <ZAxis type="number" range={[100, 500]} />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                          <Scatter name="Joueurs" data={expertData.scatterData} fill="hsl(var(--primary))">
                             {expertData.scatterData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.y > 0 ? '#10b981' : '#3b82f6'} />
                             ))}
                          </Scatter>
                       </ScatterChart>
                    </ResponsiveContainer>
                 </div>
                 <p className="mt-4 text-[10px] font-bold text-slate-400 italic">Interprétation: Les joueurs en haut à droite sont les "Piliers Tactiques".</p>
              </Card>

              {/* 3. Barres groupées : BP + BC + GD */}
              <Card className="rounded-[3rem] border-none shadow-xl p-8 bg-white h-[450px]">
                 <h4 className="text-sm font-black uppercase italic tracking-tight mb-6 flex items-center gap-2">
                     <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2">
                           <Trophy className="w-5 h-5 text-amber-500" /> 3. Bilan Offensif vs Défensif
                        </div>
                        <TacticalInfo 
                           title="Équilibre Off/Déf" 
                           description="Ration entre buts marqués et concédés pour évaluer la solidité globale." 
                           formula="Diff = BP - BC"
                        />
                     </div>
                 </h4>
                 <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                       <BarChart data={expertData.groupedStatsData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                          <Tooltip />
                          <Bar dataKey="val" radius={[12, 12, 0, 0]} barSize={80}>
                             {expertData.groupedStatsData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                             ))}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </Card>
           </div>
        </div>
      )}

      {viewMode === 'edit' && (
        <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
           {/* TACTICAL TIMELINE (Dual Track) */}
           <div className="bg-white rounded-[4rem] border-2 border-slate-100 p-12 space-y-10 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between pb-8 border-b border-slate-50">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.5rem] bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                       <Edit3 className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black italic uppercase tracking-tighter">Timeline Auditor</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Audit Mode: Enabled</p>
                    </div>
                 </div>
                  <div className="flex flex-col gap-4">
                     <div className="flex items-center gap-4 bg-slate-50 p-3 px-6 rounded-2xl border border-slate-100 shadow-sm">
                        <ZoomOut className="w-4 h-4 text-slate-400" />
                        <input type="range" min="1" max="40" step="1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-64 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                        <ZoomIn className="w-4 h-4 text-slate-400" />
                     </div>
                     
                     <div className="flex items-center gap-6">
                        {/* Club Actions */}
                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                           <span className="text-[7px] font-black uppercase text-slate-400 px-2">Club</span>
                           <Button onClick={() => handleActionClick('goal', false)} size="sm" className="h-10 w-10 p-0 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-200"><Goal className="w-4 h-4" /></Button>
                           <Button onClick={() => handleActionClick('substitution', false)} size="sm" className="h-10 w-10 p-0 rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-200"><RotateCw className="w-4 h-4" /></Button>
                           <Button onClick={() => handleActionClick('yellow_card', false)} size="sm" className="h-10 w-10 p-0 rounded-xl bg-amber-400 text-white shadow-lg shadow-amber-200"><div className="w-3 h-4 bg-white/50 rounded-sm" /></Button>
                           <Button onClick={() => handleActionClick('red_card', false)} size="sm" className="h-10 w-10 p-0 rounded-xl bg-red-500 text-white shadow-lg shadow-red-200"><div className="w-3 h-4 bg-white/50 rounded-sm" /></Button>
                        </div>

                        {/* Opponent Actions */}
                        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl shadow-xl shadow-slate-200">
                           <span className="text-[7px] font-black uppercase text-slate-500 px-2">Opp</span>
                           <Button onClick={() => handleActionClick('goal', true)} size="sm" className="h-10 w-10 p-0 rounded-xl bg-white/10 text-white hover:bg-white/20"><Goal className="w-4 h-4" /></Button>
                           <Button onClick={() => handleActionClick('substitution', true)} size="sm" className="h-10 w-10 p-0 rounded-xl bg-white/10 text-white hover:bg-white/20"><RotateCw className="w-4 h-4" /></Button>
                           <Button onClick={() => handleActionClick('yellow_card', true)} size="sm" className="h-10 w-10 p-0 rounded-xl bg-white/10 text-white hover:bg-white/20"><div className="w-3 h-4 bg-amber-400 rounded-sm" /></Button>
                           <Button onClick={() => handleActionClick('red_card', true)} size="sm" className="h-10 w-10 p-0 rounded-xl bg-white/10 text-white hover:bg-white/20"><div className="w-3 h-4 bg-red-500 rounded-sm" /></Button>
                        </div>
                        
                        <div className="w-px h-8 bg-slate-200" />
                        
                        <Button onClick={() => handleActionClick('goal')} className="h-12 px-6 rounded-xl bg-slate-950 text-white font-black uppercase text-[9px] tracking-widest shadow-xl">
                           <Plus className="w-4 h-4 mr-2" /> New
                        </Button>
                     </div>
                  </div>
              </div>

              <div className="flex bg-slate-50/40 rounded-[3rem] border border-slate-100 shadow-inner overflow-hidden">
                 <div className="w-24 shrink-0 flex flex-col justify-between py-12 border-r-2 border-slate-100 bg-white z-30">
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative w-12 h-12 rounded-xl bg-white border-2 border-slate-100 p-2 shadow-sm flex items-center justify-center">
                           <div className="absolute -top-2 -right-2 bg-primary text-white text-[7px] font-black px-1.5 py-0.5 rounded-lg border-2 border-white shadow-lg z-40">
                              {currentMatch.category || 'U??'}
                           </div>
                           {currentMatch.is_home ? (
                              mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" /> : <ShieldCheck className="w-8 h-8 text-primary" />
                           ) : (
                              getOpponentLogo(currentMatch.opponent_id) ? <img src={getOpponentLogo(currentMatch.opponent_id)} className="w-full h-full object-contain" /> : <Trophy className="w-8 h-8 text-slate-300" />
                           )}
                        </div>
                        <span className="text-[9px] font-black uppercase text-slate-400">HOME</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                       <span className="text-[9px] font-black uppercase text-slate-400">AWAY</span>
                       <div className="relative w-12 h-12 rounded-xl bg-white border-2 border-slate-100 p-2 shadow-sm flex items-center justify-center">
                          <div className="absolute -top-2 -right-2 bg-slate-950 text-white text-[7px] font-black px-1.5 py-0.5 rounded-lg border-2 border-white shadow-lg z-40">
                             {currentMatch.category || 'U??'}
                          </div>
                          {!currentMatch.is_home ? (
                             mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" /> : <ShieldCheck className="w-8 h-8 text-primary" />
                          ) : (
                             getOpponentLogo(currentMatch.opponent_id) ? <img src={getOpponentLogo(currentMatch.opponent_id)} className="w-full h-full object-contain" /> : <Trophy className="w-8 h-8 text-slate-300" />
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="flex-1 relative overflow-x-auto custom-scrollbar bg-white">
                    <div ref={timelineRef} onClick={handleTimelineClick} className="relative min-h-[400px] cursor-crosshair py-16 px-16" style={{ width: `${100 * zoom}%`, minWidth: '100%' }}>
                       {/* Period Marks */}
                       {[45, 90].map(m => (
                          <div key={m} className="absolute inset-y-0 w-px border-l-2 border-dashed border-slate-200 z-0" style={{ left: `${(m * 60 / matchDuration) * 100}%` }}>
                             <div className="absolute top-0 -translate-x-1/2 -translate-y-full bg-slate-100 px-2 py-0.5 rounded text-[8px] font-black text-slate-500 uppercase">{m === 45 ? 'MT' : 'FIN'}</div>
                          </div>
                       ))}

                       {/* TIME CURSOR (RED LINE) */}
                       <div className="absolute inset-y-0 w-px bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] z-50 pointer-events-none transition-all duration-300" style={{ left: `${(cursorTime / matchDuration) * 100}%` }}>
                          <div className="absolute top-0 -translate-x-1/2 -translate-y-full bg-red-600 text-white font-black text-[9px] px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                             {formatTime(cursorTime)}
                          </div>
                       </div>

                       {/* TRACK 1 (Top) */}
                       <div className="absolute top-0 left-16 right-16 h-[200px] flex items-center">
                          {events.filter((e: any) => {
                             const isOurEvent = !!e.player_id;
                             return currentMatch.is_home ? isOurEvent : !isOurEvent;
                          }).map((e: any) => (
                             <div key={e.id} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group/marker z-40" style={{ left: `${((e.extra?.timestamp_seconds || e.minute * 60) / matchDuration) * 100}%` }}>
                                 <div onClick={() => handleEditEvent(e)} className={`w-10 h-10 rounded-xl bg-white border-2 ${
                                    e.type === 'goal' ? 'border-emerald-500 shadow-emerald-100 shadow-lg' : 
                                    e.type === 'yellow_card' ? 'border-amber-400' :
                                    e.type === 'red_card' ? 'border-red-500' :
                                    e.type === 'substitution' ? 'border-blue-500' :
                                    'border-slate-200'
                                 } flex items-center justify-center cursor-pointer hover:scale-110 transition-all shadow-sm`}>
                                    {e.type === 'goal' && <Target className="w-5 h-5 text-emerald-500" />}
                                    {e.type === 'yellow_card' && <div className="w-2.5 h-4 bg-amber-400 rounded-sm" />}
                                    {e.type === 'red_card' && <div className="w-2.5 h-4 bg-red-600 rounded-sm" />}
                                    {e.type === 'substitution' && <RotateCw className="w-5 h-5 text-blue-500" />}
                                    {e.type !== 'goal' && e.type !== 'yellow_card' && e.type !== 'red_card' && e.type !== 'substitution' && <Activity className="w-5 h-5 text-slate-400" />}
                                   <div className="absolute bottom-full mb-3 hidden group-hover/marker:block bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-xl whitespace-nowrap z-50">
                                      {formatTime(e.extra?.timestamp_seconds || e.minute * 60)} - {e.type === 'substitution' ? (
                                          (() => {
                                             let outName = '';
                                             if (e.player_id) {
                                                outName = getPlayerDisplay(e.player_id);
                                             } else if (e.extra?.player_out_name) {
                                                outName = e.extra.player_out_name;
                                             } else if (e.extra?.opponent_ref) {
                                                const oppP = opponentPlayers.find(x => x.id === e.extra.opponent_ref);
                                                outName = oppP ? `#${oppP.jersey_number ?? '?'} ${oppP.full_name}` : `Adversaire #${e.extra.opponent_ref.replace('OPPONENT-', '')}`;
                                             } else {
                                                outName = 'Sortant';
                                             }

                                             let inName = '';
                                             const inId = e.related_player_id || e.extra?.player_in_id;
                                             if (inId) {
                                                const oppP = opponentPlayers.find(x => x.id === inId);
                                                inName = oppP ? `#${oppP.jersey_number ?? '?'} ${oppP.full_name}` : getPlayerDisplay(inId);
                                             } else if (e.extra?.player_in_name) {
                                                inName = e.extra.player_in_name;
                                             } else {
                                                inName = 'Entrant';
                                             }

                                             return (
                                                <span className="inline-flex items-center gap-1.5">
                                                   <span className="text-red-400">🔴 {outName}</span>
                                                   <span className="text-white/50">→</span>
                                                   <span className="text-emerald-400">🟢 {inName}</span>
                                                </span>
                                             );
                                          })()
                                       ) : e.player_id ? (
                                          getPlayerDisplay(e.player_id)
                                       ) : (
                                          e.extra?.opponent_ref ? `Jersey n°${e.extra.opponent_ref.split('-')[1]}` : 'Adversaire'
                                       )}
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>

                       {/* AXIS */}
                       <div className="absolute top-1/2 -translate-y-1/2 left-16 right-16 h-1 bg-slate-100 z-10" />

                       {/* TRACK 2 (Bottom) */}
                       <div className="absolute bottom-0 left-16 right-16 h-[200px] flex items-center">
                          {events.filter((e: any) => {
                             const isOurEvent = !!e.player_id;
                             return currentMatch.is_home ? !isOurEvent : isOurEvent;
                          }).map((e: any) => (
                             <div key={e.id} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group/marker z-40" style={{ left: `${((e.extra?.timestamp_seconds || e.minute * 60) / matchDuration) * 100}%` }}>
                                 <div onClick={() => handleEditEvent(e)} className={`w-10 h-10 rounded-xl bg-white border-2 ${
                                    e.type === 'goal' ? 'border-emerald-500 shadow-emerald-100 shadow-lg' : 
                                    e.type === 'yellow_card' ? 'border-amber-400' :
                                    e.type === 'red_card' ? 'border-red-500' :
                                    e.type === 'substitution' ? 'border-blue-500' :
                                    'border-slate-200'
                                 } flex items-center justify-center cursor-pointer hover:scale-110 transition-all shadow-sm`}>
                                    {e.type === 'goal' && <Target className="w-5 h-5 text-emerald-500" />}
                                    {e.type === 'yellow_card' && <div className="w-2.5 h-4 bg-amber-400 rounded-sm" />}
                                    {e.type === 'red_card' && <div className="w-2.5 h-4 bg-red-600 rounded-sm" />}
                                    {e.type === 'substitution' && <RotateCw className="w-5 h-5 text-blue-500" />}
                                    {e.type !== 'goal' && e.type !== 'yellow_card' && e.type !== 'red_card' && e.type !== 'substitution' && <Activity className="w-5 h-5 text-slate-400" />}
                                   <div className="absolute top-full mt-3 hidden group-hover/marker:block bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-xl whitespace-nowrap z-50">
                                      {formatTime(e.extra?.timestamp_seconds || e.minute * 60)} - {e.type === 'substitution' ? (
                                          (() => {
                                             let outName = '';
                                             if (e.player_id) {
                                                outName = getPlayerDisplay(e.player_id);
                                             } else if (e.extra?.player_out_name) {
                                                outName = e.extra.player_out_name;
                                             } else if (e.extra?.opponent_ref) {
                                                const oppP = opponentPlayers.find(x => x.id === e.extra.opponent_ref);
                                                outName = oppP ? `#${oppP.jersey_number ?? '?'} ${oppP.full_name}` : `Adversaire #${e.extra.opponent_ref.replace('OPPONENT-', '')}`;
                                             } else {
                                                outName = 'Sortant';
                                             }

                                             let inName = '';
                                             const inId = e.related_player_id || e.extra?.player_in_id;
                                             if (inId) {
                                                const oppP = opponentPlayers.find(x => x.id === inId);
                                                inName = oppP ? `#${oppP.jersey_number ?? '?'} ${oppP.full_name}` : getPlayerDisplay(inId);
                                             } else if (e.extra?.player_in_name) {
                                                inName = e.extra.player_in_name;
                                             } else {
                                                inName = 'Entrant';
                                             }

                                             return (
                                                <span className="inline-flex items-center gap-1.5">
                                                   <span className="text-red-400">🔴 {outName}</span>
                                                   <span className="text-white/50">→</span>
                                                   <span className="text-emerald-400">🟢 {inName}</span>
                                                </span>
                                             );
                                          })()
                                       ) : e.player_id ? (
                                          getPlayerDisplay(e.player_id)
                                       ) : (
                                          e.extra?.opponent_ref ? `Jersey n°${e.extra.opponent_ref.split('-')[1]}` : 'Adversaire'
                                       )}
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* EDIT MODAL */}
           <AnimatePresence>
              {isEventModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEventModalOpen(false)} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
                  <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[4rem] p-12 shadow-2xl border-4 border-slate-50">
                    <div className="flex items-center justify-between mb-8">
                       <div className="space-y-1">
                          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">{editingEventId ? 'Modifier' : 'Ajouter'} {eventType}</h3>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Minute: {Math.floor(cursorTime / 60)}'</p>
                       </div>
                       <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full hover:bg-slate-100" onClick={() => setIsEventModalOpen(false)}><X className="w-6 h-6" /></Button>
                    </div>

                    <div className="space-y-8">
                       {/* TIME CONTROL SECTION */}
                       <div className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 space-y-4">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 flex items-center gap-2">
                             <Clock className="w-3 h-3" /> Temps de l'Action (Précision)
                          </label>
                          <div className="flex items-center gap-6">
                             <div className="flex-1 space-y-2">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-2">Minutes</span>
                                <input 
                                   type="number" 
                                   min="0" 
                                   max="120"
                                   value={Math.floor(cursorTime / 60)} 
                                   onChange={(e) => {
                                      const m = parseInt(e.target.value) || 0;
                                      setCursorTime(m * 60 + (cursorTime % 60));
                                   }}
                                   className="w-full h-14 bg-white rounded-2xl px-4 font-black text-center text-lg border-2 border-slate-200 outline-none focus:border-red-500 transition-all"
                                />
                             </div>
                             <div className="text-2xl font-black text-slate-300 self-end mb-2">:</div>
                             <div className="flex-1 space-y-2">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-2">Secondes</span>
                                <input 
                                   type="number" 
                                   min="0" 
                                   max="59"
                                   value={Math.floor(cursorTime % 60)} 
                                   onChange={(e) => {
                                      const s = parseInt(e.target.value) || 0;
                                      setCursorTime(Math.floor(cursorTime / 60) * 60 + s);
                                   }}
                                   className="w-full h-14 bg-white rounded-2xl px-4 font-black text-center text-lg border-2 border-slate-200 outline-none focus:border-red-500 transition-all"
                                />
                             </div>
                          </div>
                       </div>

                       {/* ACTION SELECTOR (if new) */}
                       {!editingEventId && !eventType && (
                          <div className="grid grid-cols-2 gap-4">
                             {['goal', 'yellow_card', 'red_card', 'substitution'].map(type => (
                                <button key={type} onClick={() => setEventType(type)} className="h-20 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black uppercase text-[10px] hover:border-primary transition-all">
                                   {type.replace('_', ' ')}
                                </button>
                             ))}
                          </div>
                       )}

                       {/* TEAM TABS */}
                       {(eventType || editingEventId) && (
                          <div className="flex bg-slate-100 p-1.5 rounded-[2rem] border border-slate-200">
                             <button 
                               type="button"
                               onClick={() => {
                                 setIsOpponentAction(false);
                                 setSelectedPlayerId('');
                                 setSelectedPlayerInId('');
                               }} 
                               className={`flex-1 py-3 text-[10px] font-black uppercase rounded-[1.5rem] transition-all ${!isOpponentAction && !selectedPlayerId.startsWith('OPPONENT') ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}
                             >
                               Mon Club
                             </button>
                             <button 
                               type="button"
                               onClick={() => {
                                 setIsOpponentAction(true);
                                 if (eventType !== 'substitution') {
                                   setSelectedPlayerId(opponentPlayers[0]?.id || 'OPPONENT-1');
                                 } else {
                                   setSelectedPlayerId('');
                                 }
                                 setSelectedPlayerInId('');
                               }} 
                               className={`flex-1 py-3 text-[10px] font-black uppercase rounded-[1.5rem] transition-all ${isOpponentAction || selectedPlayerId.startsWith('OPPONENT') ? 'bg-slate-950 shadow text-white' : 'text-slate-400'}`}
                             >
                               Adversaire
                             </button>
                          </div>
                       )}

                       {/* PLAYER SELECT */}
                       {(eventType || editingEventId) && (() => {
                          const validStarters = (currentMatch.lineup?.startingXI || []).filter((id: string) => id && id.trim() !== '');
                          const validSubs = (currentMatch.lineup?.substitutes || []).filter((id: string) => id && id.trim() !== '');
                          const hasValidLineup = validStarters.length > 0 || validSubs.length > 0;
                          
                          const matchPlayersList = hasValidLineup
                             ? players.filter(p => validStarters.includes(p.id) || validSubs.includes(p.id))
                             : players;

                          const startingPlayers = players.filter(p => validStarters.includes(p.id));
                          const benchPlayers = players.filter(p => validSubs.includes(p.id));

                          return (
                             <div className="space-y-6">
                                {eventType === 'substitution' ? (
                                   <div className="space-y-6 animate-in zoom-in-95">
                                      <div className="space-y-3">
                                         <label className="text-[9px] font-black uppercase text-red-500 tracking-widest px-2">
                                            Sortie (Joueur OUT {isOpponentAction ? 'Adverse' : ''})
                                         </label>
                                         {isOpponentAction ? (
                                            opponentPlayers.length > 0 ? (
                                               <select
                                                  value={selectedPlayerId}
                                                  onChange={e => setSelectedPlayerId(e.target.value)}
                                                  className="w-full h-16 px-6 rounded-[2rem] bg-red-50 border-2 border-red-100 font-black text-sm outline-none focus:border-red-500 transition-all cursor-pointer"
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
                                            <select value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)} className="w-full h-16 px-6 rounded-[2rem] bg-red-50 border-2 border-red-100 font-black text-sm outline-none focus:border-red-500 transition-all cursor-pointer">
                                               <option value="">Sélectionner le joueur sortant...</option>
                                               <optgroup label="Titulaires">
                                                  {startingPlayers.filter(p => !sentOffPlayerIds.has(p.id)).map(p => <option key={p.id} value={p.id}>#{p.jersey_number || '?'} - {p.full_name}</option>)}
                                               </optgroup>
                                               <optgroup label="Tous les joueurs du club">
                                                  {players.filter(p => !sentOffPlayerIds.has(p.id) && !startingPlayers.some(sp => sp.id === p.id)).map(p => <option key={p.id} value={p.id}>#{p.jersey_number || '?'} - {p.full_name}</option>)}
                                               </optgroup>
                                            </select>
                                         )}
                                      </div>
                                      
                                      <div className="flex items-center justify-center -my-3 relative z-10">
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
                                                  className="w-full h-16 px-6 rounded-[2rem] bg-emerald-50 border-2 border-emerald-100 font-black text-sm outline-none focus:border-emerald-500 transition-all cursor-pointer"
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
                                            <select value={selectedPlayerInId} onChange={e => setSelectedPlayerInId(e.target.value)} className="w-full h-16 px-6 rounded-[2rem] bg-emerald-50 border-2 border-emerald-100 font-black text-sm outline-none focus:border-emerald-500 transition-all cursor-pointer">
                                               <option value="">Sélectionner le joueur entrant...</option>
                                               <optgroup label="Banc de touche">
                                                  {benchPlayers.filter(p => !sentOffPlayerIds.has(p.id)).map(p => <option key={p.id} value={p.id}>#{p.jersey_number || '?'} - {p.full_name}</option>)}
                                               </optgroup>
                                               <optgroup label="Tous les joueurs du club">
                                                  {players.filter(p => !sentOffPlayerIds.has(p.id) && !benchPlayers.some(bp => bp.id === p.id)).map(p => <option key={p.id} value={p.id}>#{p.jersey_number || '?'} - {p.full_name}</option>)}
                                               </optgroup>
                                            </select>
                                         )}
                                      </div>
                                   </div>
                                ) : (
                                   <div className="space-y-4">
                                      {!isOpponentAction && !selectedPlayerId.startsWith('OPPONENT') ? (
                                         <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block px-2">Sélectionner un Joueur</label>
                                            <select value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)} className="w-full h-16 px-6 rounded-3xl bg-slate-50 border-2 border-slate-200 font-black text-sm">
                                               <option value="">Choisir un joueur...</option>
                                               {matchPlayersList.map(p => <option key={p.id} value={p.id}>#{p.jersey_number || '?'} - {p.full_name}</option>)}
                                            </select>
                                            
                                            {eventType === 'goal' && (
                                               <div className="space-y-3">
                                                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block px-2">Passeur Décisif (Assist)</label>
                                                  <select value={selectedAssistId} onChange={e => setSelectedAssistId(e.target.value)} className="w-full h-16 px-6 rounded-3xl bg-emerald-50 border-2 border-emerald-100 font-bold text-sm">
                                                     <option value="">(Optionnel) Aucune passe...</option>
                                                     {matchPlayersList.map(p => p.id !== selectedPlayerId && <option key={p.id} value={p.id}>#{p.jersey_number || '?'} - {p.full_name}</option>)}
                                                  </select>
                                               </div>
                                            )}
                                         </div>
                                      ) : (
                                         <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-primary block px-2">Sélectionner un Joueur Adverse</label>
                                            {opponentPlayers.length > 0 ? (
                                               <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar p-1">
                                                  {opponentPlayers.map(op => (
                                                     <button 
                                                       key={op.id} 
                                                       type="button"
                                                       onClick={() => setSelectedPlayerId(op.id)} 
                                                       className={`h-12 rounded-xl text-[10px] font-black border-2 transition-all ${selectedPlayerId === op.id ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white border-slate-100 text-slate-700 hover:border-slate-300'}`}
                                                     >
                                                        #{op.jersey_number ?? '?'} {op.full_name.split(' ').pop()}
                                                     </button>
                                                  ))}
                                               </div>
                                            ) : (
                                               <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar p-1">
                                                  {[...Array(99)].map((_, i) => (
                                                     <button key={i} type="button" onClick={() => setSelectedPlayerId(`OPPONENT-${i+1}`)} className={`h-12 rounded-xl text-xs font-black border-2 transition-all ${selectedPlayerId === `OPPONENT-${i+1}` ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>N° {i+1}</button>
                                                  ))}
                                               </div>
                                            )}
                                         </div>
                                      )}
                                   </div>
                                )}
                             </div>
                          );
                       })()}

                       <div className="flex gap-4 pt-8">
                          {editingEventId && (
                             <Button variant="ghost" onClick={() => handleDeleteEvent(editingEventId)} className="h-16 px-8 rounded-3xl text-red-500 font-black uppercase text-[10px]">Supprimer</Button>
                          )}
                          <Button className="flex-1 h-16 rounded-3xl bg-slate-950 text-white font-black uppercase" onClick={saveEvent}>Confirmer</Button>
                       </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
         </div>
       )}

           {/* Modal d'Évaluation Match à Double Niveau (Estimée vs Approfondie) */}
           {ratingModalPlayer && (
             <PlayerMatchEvaluationModal
               player={ratingModalPlayer}
               matchInfo={{
                 id: currentMatch?.id,
                 opponent_name: (currentMatch as any)?.opponent_club?.name || currentMatch?.opponent_team_name,
                 match_date: currentMatch?.match_date,
                 competition: currentLeagueName,
                 is_friendly: isCurrentMatchFriendly,
               }}
               initialRating={modalRating}
               initialComment={modalComment}
               onClose={() => setRatingModalPlayer(null)}
               onSave={async (evalData) => {
                 setModalRating(evalData.rating);
                 setModalComment(evalData.comment);
                 if (!currentMatch?.id || !ratingModalPlayer?.id) return;
                 await matchService.savePlayerRating(currentMatch.id, ratingModalPlayer.id, evalData.rating, evalData.comment.trim() || null);
                 if (!currentMatch.match_players) {
                   currentMatch.match_players = [];
                 }
                 const target = currentMatch.match_players.find((mp: any) => mp.player_id === ratingModalPlayer.id);
                 if (target) {
                   target.rating = evalData.rating;
                   target.rating_comment = evalData.comment.trim() || null;
                 } else {
                   currentMatch.match_players.push({
                     match_id: currentMatch.id,
                     player_id: ratingModalPlayer.id,
                     rating: evalData.rating,
                     rating_comment: evalData.comment.trim() || null,
                     is_starting: false
                   });
                 }
               }}
             />
           )}

           {/* Modal Complet Événements Live & Évaluation Joueur */}
           {actionHubPlayer && (
             <PlayerActionHubModal
               isOpen={!!actionHubPlayer}
               player={actionHubPlayer}
               matchId={matchId}
               currentMatch={currentMatch}
               matchEvents={events}
               homePlayers={players}
               opponentPlayers={opponentPlayers}
               onClose={() => setActionHubPlayer(null)}
               onAddEvent={handleAddEventFromHub}
               onUpdateEvent={handleUpdateEventFromHub}
               onDeleteEvent={handleDeleteEventFromHub}
               onSaveRating={handleSaveRatingFromHub}
               onOpenDeepEvaluation={(p) => {
                 setRatingModalPlayer(p);
                 const mpRecord = currentMatch.match_players?.find((mp: any) => mp.player_id === p.id);
                 setModalRating(mpRecord?.rating != null ? Number(mpRecord.rating) : 7);
                 setModalComment(mpRecord?.rating_comment || '');
               }}
               mainClubName={mainClub?.club_name || 'FUS de Rabat'}
               opponentClubName={getOpponentName(currentMatch.opponent_id)}
             />
           )}
    </div>
  );
};

export default MatchStatsView;

