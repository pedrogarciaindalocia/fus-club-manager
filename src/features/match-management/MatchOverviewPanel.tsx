import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftRight,
  AlertTriangle,
  Calendar,
  Clock,
  Target,
  Users,
  BarChart3,
  ChevronRight,
  Play,
  Shield,
  Star,
  Activity,
  Zap,
  LayoutPanelLeft,
  TrendingUp,
  ArrowUpDown,
  Swords,
  Flag,
  MapPin,
  Video,
  UserCheck,
  Search,
  RefreshCw,
  ChevronDown,
  Crosshair,
  Footprints,
  Maximize2,
  Sparkles,
  Radio,
  Timer
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { PlayerPitchHoverCard, type PlayerPitchStats } from './components/PlayerPitchHoverCard';
import { useMatchEvents } from '../../hooks/useMatchEvents';
import { usePlayers } from '../../hooks/usePlayers';
import { useArbitres } from '../../hooks/useArbitres';
import { useCompetitions } from '../../hooks/useCompetitions';
import { useStaff } from '../../hooks/useStaff';
import { matchService } from '../../services/matchService';
import { MatchDriveVideoModal } from './components/MatchDriveVideoModal';
import { supabase } from '../../lib/supabase';
import type { Match } from '../../types';

interface MatchOverviewPanelProps {
  match: Match;
  allMatches?: Match[];
  onSelectMatch?: (match: Match) => void;
  mainClub?: any;
  opponentClubs?: any[];
  getOpponentName?: (id: string) => string;
  onOrchestrate?: () => void;
  onStats?: () => void;
  onBack: () => void;
}

// Tactical Formation Coordinates imported from centralized module
import { getFormationPositions, inferMatchFormat } from './tacticalFormations';

const getInitials = (name: string) => {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const StatBar: React.FC<{ label: string; home: number; away: number; icon?: string; unit?: string }> = ({
  label, home, away, icon, unit = ''
}) => {
  const total = (home + away) || 0;
  const homePercent = total === 0 ? 50 : Math.round((home / total) * 100);
  const awayPercent = total === 0 ? 50 : 100 - homePercent;

  return (
    <div className="space-y-1.5 py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between text-[11px] font-bold">
        <span className="text-slate-900 font-black tabular-nums w-8 text-left text-sm">{home}{unit}</span>
        <span className="text-slate-600 text-[10.5px] tracking-wider text-center flex-1 font-black flex items-center justify-center gap-1.5">
          {icon && <span className="text-sm">{icon}</span>}
          {label}
        </span>
        <span className="text-slate-900 font-black tabular-nums w-8 text-right text-sm">{away}{unit}</span>
      </div>
      <div className="flex items-center gap-2 h-2.5">
        <div className="flex-1 bg-slate-100 rounded-full h-full flex justify-end overflow-hidden">
          <div
            className="bg-[#4d94ff] rounded-full h-full transition-all duration-700"
            style={{ width: `${total === 0 ? (home > 0 ? 100 : 0) : homePercent}%` }}
          />
        </div>
        <div className="flex-1 bg-slate-100 rounded-full h-full flex justify-start overflow-hidden">
          <div
            className="bg-[#e94e77] rounded-full h-full transition-all duration-700"
            style={{ width: `${total === 0 ? (away > 0 ? 100 : 0) : awayPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export const MatchOverviewPanel: React.FC<MatchOverviewPanelProps> = ({
  match,
  allMatches = [],
  onSelectMatch,
  mainClub,
  opponentClubs = [],
  getOpponentName,
  onOrchestrate,
  onStats,
  onBack,
}) => {
  const { events } = useMatchEvents(match?.id);
  const { players } = usePlayers();
  const { arbitres } = useArbitres();
  const { leagues, stadiums } = useCompetitions();
  const { staff } = useStaff();

  const [matchStats, setMatchStats] = useState<any>(null);
  const [playerMatchStats, setPlayerMatchStats] = useState<any[]>([]);
  const [matchLineupPlayers, setMatchLineupPlayers] = useState<any[]>([]);
  const [hoveredPlayerKey, setHoveredPlayerKey] = useState<string | null>(null);
  const [feedTab, setFeedTab] = useState<'play' | 'narration'>('play');
  const [searchQuery, setSearchQuery] = useState('');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>((match as any)?.video_url || null);

  useEffect(() => {
    setCurrentVideoUrl((match as any)?.video_url || null);
  }, [match?.id, (match as any)?.video_url]);

  // Fetch DB Match Stats & Lineup details
  useEffect(() => {
    if (match?.id) {
      matchService.getMatchStats(match.id).then(setMatchStats).catch(() => setMatchStats(null));
      matchService.getPlayerMatchStats(match.id).then(setPlayerMatchStats).catch(() => setPlayerMatchStats([]));
      matchService.getMatchLineup(match.id).then(setMatchLineupPlayers).catch(() => setMatchLineupPlayers([]));
    }
  }, [match?.id]);

  // Opérateur Live Fus-App (Nom, Prénom, Photo, Poste)
  const initialOpId = (match as any).live_operator_id || (match.lineup as any)?.live_operator?.id;
  const initialOpName = (match as any).live_operator_name || (match.lineup as any)?.live_operator?.name;
  const initialOpRole = (match as any).live_operator_role || (match.lineup as any)?.live_operator?.role;
  const initialOpAvatar = (match as any).live_operator_avatar_url || (match.lineup as any)?.live_operator?.avatar_url;

  const [operatorDetails, setOperatorDetails] = useState<{
    id: string | null;
    name: string | null;
    role: string | null;
    avatar_url: string | null;
  }>({
    id: initialOpId || null,
    name: initialOpName || null,
    role: initialOpRole || null,
    avatar_url: initialOpAvatar || null,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchOperatorProfile = async () => {
      const opId = (match as any).live_operator_id || (match.lineup as any)?.live_operator?.id;
      const opName = (match as any).live_operator_name || (match.lineup as any)?.live_operator?.name;
      const opRole = (match as any).live_operator_role || (match.lineup as any)?.live_operator?.role;
      const opAvatar = (match as any).live_operator_avatar_url || (match.lineup as any)?.live_operator?.avatar_url;

      if (opId) {
        try {
          const { data } = await supabase
            .from('user_profiles')
            .select('id, full_name, first_name, last_name, avatar_url, job_title, system_role')
            .eq('id', opId)
            .maybeSingle();
          if (data && isMounted) {
            const resolvedFullName = data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || opName;
            const resolvedRole = data.job_title || (data.system_role === 'admin' ? 'Administrateur' : data.system_role === 'super_admin' ? 'Super Administrateur' : 'Opérateur Live');
            setOperatorDetails({
              id: data.id,
              name: resolvedFullName || opName || 'Opérateur Live',
              role: resolvedRole || opRole || 'Opérateur Live Fus-App',
              avatar_url: data.avatar_url || opAvatar || null,
            });
            return;
          }
        } catch (err) {
          console.warn('[MatchOverviewPanel] Error fetching operator profile:', err);
        }
      }

      if (opName && isMounted) {
        setOperatorDetails({
          id: opId || null,
          name: opName,
          role: opRole || 'Opérateur Live Fus-App',
          avatar_url: opAvatar || null,
        });
        return;
      }

      if (match.id && isMounted) {
        try {
          const { data: logs } = await supabase
            .from('audit_logs')
            .select('user_id, metadata')
            .or(`entity_id.eq.${match.id},metadata->>match_id.eq.${match.id}`)
            .not('user_id', 'is', null)
            .limit(1);
          if (logs && logs.length > 0 && logs[0].user_id) {
            const uid = logs[0].user_id;
            const { data: prof } = await supabase
              .from('user_profiles')
              .select('id, full_name, first_name, last_name, avatar_url, job_title, system_role')
              .eq('id', uid)
              .maybeSingle();
            if (prof && isMounted) {
              const resolvedFullName = prof.full_name || `${prof.first_name || ''} ${prof.last_name || ''}`.trim();
              const resolvedRole = prof.job_title || (prof.system_role === 'admin' ? 'Administrateur' : prof.system_role === 'super_admin' ? 'Super Administrateur' : 'Opérateur Live');
              setOperatorDetails({
                id: prof.id,
                name: resolvedFullName || 'Opérateur Live',
                role: resolvedRole || 'Opérateur Live Fus-App',
                avatar_url: prof.avatar_url || null,
              });
              return;
            }
          }
        } catch (_) {}
      }

      if (isMounted) {
        setOperatorDetails({
          id: opId || null,
          name: opName || null,
          role: opRole || null,
          avatar_url: opAvatar || null,
        });
      }
    };

    fetchOperatorProfile();
    return () => { isMounted = false; };
  }, [match?.id, (match as any)?.live_operator_id, (match as any)?.live_operator_name, (match?.lineup as any)?.live_operator]);

  if (!match) {
    return (
      <div className="py-20 text-center space-y-3 bg-[#131d27] rounded-3xl text-white">
        <p className="text-slate-400 font-bold text-sm">Sélectionnez un match pour voir les détails</p>
        <Button onClick={onBack} size="sm" variant="outline">Retour</Button>
      </div>
    );
  }

  // Home vs Away Determination (Left = Home, Right = Away)
  const isHome = match.is_home ?? true;

  // Real Database Metadata
  const mainClubName = mainClub?.name || mainClub?.club_name || 'FUS Rabat';
  const mainClubLogo = mainClub?.logo_url && mainClub.logo_url !== 'null' ? mainClub.logo_url : null;
  const opponent = opponentClubs.find(c => c.id === match.opponent_id);
  const opponentName = (getOpponentName && match.opponent_id ? getOpponentName(match.opponent_id) : '') || opponent?.name || (match as any).opponent_name || 'Adversaire';
  const opponentLogo = opponent?.logo_url && opponent.logo_url !== 'null' ? opponent.logo_url : null;

  const homeClubName = isHome ? mainClubName : opponentName;
  const homeClubLogo = isHome ? mainClubLogo : opponentLogo;
  const homeClubCategory = isHome ? (match.category || 'Équipe Première') : 'Domicile';

  const awayClubName = isHome ? opponentName : mainClubName;
  const awayClubLogo = isHome ? opponentLogo : mainClubLogo;
  const awayClubCategory = isHome ? 'Adversaire' : (match.category || 'Extérieur');

  // Scores in DB: score_home is Home score, score_away is Away score
  const homeScore = match.score_home ?? 0;
  const awayScore = match.score_away ?? 0;
  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';

  const league = leagues.find(l => l.id === match.league_id);
  const isFriendly = !match.league_id || league?.name?.toLowerCase().includes('amical') || match.category?.toLowerCase().includes('amical') || match.notes?.toLowerCase().includes('amical');
  const leagueName = isFriendly ? 'Match Amical' : (league?.name || 'Compétition Officielle');
  const stadium = stadiums.find(s => s.id === match.stadium_id);
  const stadiumName = stadium?.name || match.stadium || mainClub?.stadium || 'Stade Prince Moulay El Hassan';

  const startingXI: string[] = Array.isArray(match.lineup?.startingXI) ? match.lineup.startingXI : [];
  const subs: string[] = Array.isArray(match.lineup?.substitutes) ? match.lineup.substitutes : [];
  const formationKey = match.formation || match.lineup?.formation || '4-3-3';
  const opponentStartingXI: string[] = Array.isArray(match.opponent_lineup) ? match.opponent_lineup : [];
  const opponentSubs: string[] = Array.isArray(match.opponent_subs) ? match.opponent_subs : [];
  const opponentFormationKey = match.opponent_formation || '4-3-3';

  // Format et durée de match dynamiques (Jeu réduit, opposition interne, catégories jeunes)
  const matchFormat = inferMatchFormat(match);
  const halfDuration = Number(
    match.half_duration_minutes ||
    (matchFormat <= 8 || ['U7', 'U9', 'U11', 'U13'].includes(match.category || '') ? 30 : 45)
  );
  const totalDuration = halfDuration * 2;

  // Helper for real player info (handles both string ID and raw object)
  const getPlayer = (rawPid?: any) => {
    if (!rawPid) return null;
    const pid = typeof rawPid === 'object' ? (rawPid.id || rawPid.player_id) : rawPid;
    if (!pid) return null;
    const pStr = String(pid);
    return (
      (players || []).find(pl => String(pl.id) === pStr) ||
      (matchLineupPlayers || []).find(pl => String(pl.player_id || pl.id) === pStr) ||
      null
    );
  };

  const getPlayerDisplayName = (rawPid?: any, fallbackName?: string) => {
    if (typeof rawPid === 'object' && rawPid) {
      const directName = rawPid.full_name || rawPid.name || rawPid.last_name || rawPid.first_name;
      if (directName && directName !== 'undefined') return String(directName);
    }
    const p = getPlayer(rawPid);
    if (p) {
      const fullName = p.full_name || p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim();
      if (fullName && fullName !== 'undefined') return fullName;
    }
    if (fallbackName && fallbackName !== 'undefined' && fallbackName.trim() !== '') {
      return fallbackName;
    }
    return 'Joueur';
  };

  const getPlayerShortName = (rawPid?: any) => {
    if (!rawPid) return 'Joueur';
    if (typeof rawPid === 'object') {
      const nm = rawPid.full_name || rawPid.last_name || rawPid.name || rawPid.first_name || '';
      if (nm && nm !== 'undefined') {
        const parts = String(nm).trim().split(' ');
        return parts[parts.length - 1]?.substring(0, 12) || 'Joueur';
      }
    }
    const p = getPlayer(rawPid);
    if (!p) return 'Joueur';
    const name = p.full_name || p.last_name || p.name || p.first_name || '';
    if (!name || name === 'undefined') return 'Joueur';
    const parts = name.trim().split(' ');
    return parts[parts.length - 1]?.substring(0, 12) || 'Joueur';
  };

  const getEventPlayerId = (e: any): string => {
    if (!e) return '';
    const raw = e.player_id ?? e.playerId;
    if (!raw) return '';
    if (typeof raw === 'object') return raw.id || raw.player_id || '';
    return String(raw);
  };

  // Real event stats directly from Supabase match_events & match
  const ourPlayerIds = new Set(
    [...startingXI, ...subs].map(item => (typeof item === 'object' ? (item.id || item.player_id) : item)).filter(Boolean).map(String)
  );

  const isEventOurTeam = (e: any): boolean => {
    if (e.extra?.opponent_ref) return false;
    const pid = getEventPlayerId(e);
    if (!pid) return true;
    return ourPlayerIds.has(pid);
  };

  // 1. Buts
  const ourGoalEvents = (events || []).filter(e => (e.type === 'goal' || e.type === 'penalty') && isEventOurTeam(e)).length;
  const advGoalEvents = (events || []).filter(e => (e.type === 'goal' || e.type === 'penalty') && !isEventOurTeam(e)).length;
  
  // Calculate goals for FUS vs Opponent (accounting for match score and logged events)
  const fusGoals = Math.max(isHome ? homeScore : awayScore, ourGoalEvents);
  const oppGoals = Math.max(isHome ? awayScore : homeScore, advGoalEvents);

  // Home (Left) vs Away (Right) Goals
  const homeGoals = isHome ? fusGoals : oppGoals;
  const awayGoals = isHome ? oppGoals : fusGoals;

  // 2. Assists (Passes décisives)
  const ourAssists = (events || []).filter(e => e.type === 'assist' && isEventOurTeam(e)).length;
  const advAssists = (events || []).filter(e => e.type === 'assist' && !isEventOurTeam(e)).length;
  const homeAssists = isHome ? ourAssists : advAssists;
  const awayAssists = isHome ? advAssists : ourAssists;

  // 3. Changements (Remplacements)
  const ourSubsCount = (events || []).filter(e => e.type === 'substitution' && isEventOurTeam(e)).length;
  const advSubsCount = (events || []).filter(e => e.type === 'substitution' && !isEventOurTeam(e)).length;
  const homeSubsCount = isHome ? ourSubsCount : advSubsCount;
  const awaySubsCount = isHome ? advSubsCount : ourSubsCount;

  // 4. Cartons Jaunes
  const ourYellows = (events || []).filter(e => e.type === 'yellow_card' && isEventOurTeam(e)).length;
  const advYellows = (events || []).filter(e => e.type === 'yellow_card' && !isEventOurTeam(e)).length;
  const homeYellows = isHome ? ourYellows : advYellows;
  const awayYellows = isHome ? advYellows : ourYellows;

  // 5. Cartons Rouges
  const ourReds = (events || []).filter(e => e.type === 'red_card' && isEventOurTeam(e)).length;
  const advReds = (events || []).filter(e => e.type === 'red_card' && !isEventOurTeam(e)).length;
  const homeReds = isHome ? ourReds : advReds;
  const awayReds = isHome ? advReds : ourReds;

  // Real Head Coach from Staff
  const headCoach = (staff || []).find(s => (s.role || '').toLowerCase().includes('entraîneur') || (s.role || '').toLowerCase().includes('coach')) || staff[0];
  const headCoachName = headCoach ? (headCoach.full_name || headCoach.name || 'Staff Technique') : 'Staff Technique FUS';

  const getPeriodMarkerDetails = (e: any) => {
    const phase = e.extra?.phase || '';
    const label = e.extra?.label || '';
    if (phase === 'first_half_start' || label.toLowerCase().includes('1ère')) {
      return { icon: '🏁', label: label || 'Coup d\'envoi (1ère Mi-temps)' };
    }
    if (phase === 'half_time' || label.toLowerCase().includes('mi-temps')) {
      return { icon: '⏸️', label: label || 'Pause Mi-temps' };
    }
    if (phase === 'second_half_start' || label.toLowerCase().includes('2ème')) {
      return { icon: '▶️', label: label || 'Reprise 2ème Mi-temps' };
    }
    if (phase === 'full_time' || label.toLowerCase().includes('fin')) {
      return { icon: '🏁', label: label || 'Fin du match' };
    }
    return { icon: '⏱️', label: label || 'Temps de jeu' };
  };

  // Real Timeline Events Feed
  const timelineEvents = useMemo(() => {
    if (events && events.length > 0) {
      return [...events].sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0)).map(e => {
        // 1. Marqueurs officiels de période (Coup d'envoi, Mi-temps, Fin du match)
        if (e.type === 'period_marker') {
          const marker = getPeriodMarkerDetails(e);
          return {
            id: e.id,
            minute: e.minute || 0,
            type: 'period_marker',
            isPeriodMarker: true,
            markerIcon: marker.icon,
            markerLabel: marker.label,
            title: marker.label,
            desc: '',
            isLeft: false,
          };
        }

        const rawPid = getEventPlayerId(e);
        const isOpponentRef = Boolean(e.extra?.opponent_ref);
        const isOur = isOpponentRef ? false : (rawPid ? ourPlayerIds.has(rawPid) : true);
        const playerObj = getPlayer(rawPid);

        const rawFallback = (typeof e.player === 'string' && e.player !== 'undefined')
          ? e.player
          : (e.extra?.player_name || e.extra?.playerName || '');
        const pName = getPlayerDisplayName(rawPid, rawFallback || (isOur ? 'FUS Club' : 'Adversaire'));

        let title = 'Action de jeu';
        let desc = `Action enregistrée à la ${e.minute || 0}'`;
        if (e.type === 'goal') {
          title = '⚽ BUT !';
          desc = `Superbe but inscrit par ${pName} à la ${e.minute || 0}'`;
        } else if (e.type === 'yellow_card') {
          title = '🟨 Carton Jaune';
          desc = `Avertissement arbitral adressé à ${pName}`;
        } else if (e.type === 'red_card') {
          title = '🟥 Carton Rouge';
          desc = `Expulsion directe de ${pName} à la ${e.minute || 0}'`;
        } else if (e.type === 'substitution') {
          const inPid = e.related_player_id || e.relatedPlayerId;
          const inPlayer = inPid ? getPlayerShortName(inPid) : 'Remplaçant';
          title = '🔁 Changement';
          desc = `Entrée de ${inPlayer} à la place de ${getPlayerShortName(rawPid)}`;
        } else if (e.type === 'assist') {
          title = '⭐ Passe Décisive';
          desc = `Passe décisive délivrée par ${pName}`;
        } else if (e.type === 'penalty') {
          title = '🎯 Penalty';
          desc = `Tir au but converti par ${pName}`;
        } else if (e.type === 'own_goal') {
          title = '⚽ But C.S.C.';
          desc = `But contre son camp concédé à la ${e.minute || 0}'`;
        } else if (e.type === 'missed_penalty') {
          title = '❌ Penalty manqué';
          desc = `Penalty non converti par ${pName}`;
        } else if (e.type === 'corner') {
          title = '🚩 Corner';
          desc = `Corner exécuté par ${pName}`;
        } else if (e.type === 'foul') {
          title = '⚠️ Faute';
          desc = `Faute sifflée contre ${pName}`;
        } else if (e.type === 'offside') {
          title = '🚩 Hors-jeu';
          desc = `Position de hors-jeu signalée pour ${pName}`;
        } else if (e.type === 'save') {
          title = '🧤 Arrêt';
          desc = `Parade décisive de ${pName}`;
        } else if (e.type === 'injury') {
          title = '🩹 Soins';
          desc = `Intervention médicale pour ${pName}`;
        }

        const commentaryText = typeof e.commentary === 'string' && e.commentary.trim() 
          ? e.commentary 
          : (e.extra?.commentary || desc);

        const photoUrl = playerObj?.photo_url && playerObj.photo_url !== 'null' ? playerObj.photo_url : null;

        return {
          id: e.id,
          minute: e.minute || 0,
          type: e.type,
          isPeriodMarker: false,
          player: String(pName),
          photo: photoUrl,
          title,
          desc: commentaryText,
          isOur,
          isLeft: isHome ? isOur : !isOur,
        };
      });
    }
    return [];
  }, [events, players, ourPlayerIds, matchLineupPlayers]);

  // Real Event dots along the timeline bar adapted to match duration
  const timelineBarDots = useMemo(() => {
    return (events || [])
      .filter((e: any) => e.type !== 'period_marker')
      .slice(0, 15)
      .map((e: any) => {
        const min = Math.min(totalDuration, Math.max(0, e.minute || 0));
        const leftPercent = `${(min / totalDuration) * 100}%`;
        let colorClass = 'bg-[#4d94ff]';
        if (e.type === 'goal') colorClass = 'bg-[#2ecc71] ring-2 ring-emerald-300';
        else if (e.type === 'yellow_card') colorClass = 'bg-[#f1c40f]';
      else if (e.type === 'red_card') colorClass = 'bg-[#e74c3c]';
      else if (e.type === 'substitution') colorClass = 'bg-[#9b59b6]';
      return { minute: min, left: leftPercent, color: colorClass };
    });
  }, [events, totalDuration]);

  // Real Upcoming Matches List from DB
  const upcomingMatches = useMemo(() => {
    const list = (allMatches || []).filter(m => m.id !== match.id);
    return list.slice(0, 4);
  }, [allMatches, match.id]);

  // Assigned Referees & Match Officials (including Commissaire de match)
  const assignedOfficials = useMemo(() => {
    if (!match) return [];
    const list: {
      id: number;
      prenom: string;
      nom: string;
      grade: string;
      numero_licence: string;
      photo_url: string | null;
      initials: string;
      roleKey: string;
      roleLabel: string;
      badgeClass: string;
    }[] = [];

    const refAssigned = (match.referees_assigned || {}) as any;

    const slots: { key: string; idVal: any; roleLabel: string; badgeClass: string }[] = [
      {
        key: 'central',
        idVal: match.referee_central_id || refAssigned.central_id,
        roleLabel: 'Arbitre Principal',
        badgeClass: 'bg-primary/10 text-primary border-primary/20',
      },
      {
        key: 'assistant1',
        idVal: match.referee_assistant1_id || refAssigned.assistant1_id,
        roleLabel: 'Arbitre Assistant 1',
        badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      },
      {
        key: 'assistant2',
        idVal: match.referee_assistant2_id || refAssigned.assistant2_id,
        roleLabel: 'Arbitre Assistant 2',
        badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      },
      {
        key: 'fourth',
        idVal: match.referee_fourth_id || refAssigned.fourth_id,
        roleLabel: '4ème Officiel',
        badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      },
      {
        key: 'commissaire',
        idVal: (match as any).referee_commissaire_id || refAssigned.commissaire_id,
        roleLabel: 'Commissaire du Match',
        badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      },
    ];

    slots.forEach(slot => {
      if (!slot.idVal) return;
      const found = (arbitres || []).find(a => String(a.id) === String(slot.idVal));
      if (found) {
        list.push({
          id: found.id,
          prenom: found.prenom,
          nom: found.nom,
          grade: found.grade,
          numero_licence: found.numero_licence,
          photo_url: found.photo_url,
          initials: `${found.prenom?.[0] || ''}${found.nom?.[0] || ''}`.toUpperCase() || 'ARB',
          roleKey: slot.key,
          roleLabel: slot.roleLabel,
          badgeClass: slot.badgeClass,
        });
      }
    });

    return list;
  }, [match, arbitres]);




  // Current match minute
  const currentMatchMinute = isFinished ? 90 : isLive ? 70 : 0;

  const getHorizontalAlign = (leftStr: string): 'left' | 'center' | 'right' => {
    const leftNum = parseFloat(leftStr);
    if (leftNum < 45) return 'left';
    if (leftNum > 55) return 'right';
    return 'center';
  };

  const getPlayerHoverStats = (
    rawPid: any,
    roleLabel: string,
    isHomeTeam: boolean,
    isStarting: boolean,
    idx: number,
    fallbackJersey?: string | number
  ): PlayerPitchStats => {
    const pid = typeof rawPid === 'object' ? (rawPid?.player_id || rawPid?.id) : rawPid;
    const p = getPlayer(pid);
    const teamName = isHomeTeam ? mainClubName : opponentName;

    // Display Name
    let displayName = 'Joueur';
    if (isHomeTeam) {
      if (p) {
        displayName = `${p.first_name || ''} ${p.last_name || p.name || ''}`.trim() || 'Joueur FUS';
      } else if (typeof rawPid === 'object') {
        displayName = rawPid.full_name || rawPid.name || `Joueur FUS #${idx + 1}`;
      } else {
        displayName = `Joueur FUS #${idx + 1}`;
      }
    } else {
      if (typeof rawPid === 'object') {
        displayName = rawPid.name || rawPid.full_name || `Adversaire #${fallbackJersey ?? (idx + 1)}`;
      } else {
        displayName = `Adversaire #${fallbackJersey ?? (idx + 1)}`;
      }
    }

    const jerseyNumber = p?.jersey_number 
      ?? (typeof rawPid === 'object' ? (rawPid.jersey_number || rawPid.number) : null) 
      ?? (fallbackJersey ?? (idx + 1));

    const photoUrl = p?.photo_url && p.photo_url !== 'null' 
      ? p.photo_url 
      : (typeof rawPid === 'object' ? rawPid.photo_url : null);

    // DB stats fallback
    const dbStat = (playerMatchStats || []).find(s => String(s.player_id) === String(pid));
    const explicitMinutes = dbStat?.minutes_played;

    // Goals for this player
    const playerGoals = (events || []).filter(e => 
      (e.type === 'goal' || e.type === 'penalty') &&
      String(typeof e.playerId === 'object' ? e.playerId?.id : e.playerId) === String(pid)
    );
    const goalsCount = playerGoals.length;
    const goalsMinutes = playerGoals.map(g => g.minute || 0).sort((a, b) => a - b);

    // Assists
    const assistsCount = (events || []).filter(e => 
      e.type === 'assist' &&
      String(typeof e.playerId === 'object' ? e.playerId?.id : e.playerId) === String(pid)
    ).length;

    // Cards
    const yellowEvents = (events || []).filter(e => 
      e.type === 'yellow_card' &&
      String(typeof e.playerId === 'object' ? e.playerId?.id : e.playerId) === String(pid)
    );
    const redEvents = (events || []).filter(e => 
      e.type === 'red_card' &&
      String(typeof e.playerId === 'object' ? e.playerId?.id : e.playerId) === String(pid)
    );
    const yellowCardsCount = yellowEvents.length || (dbStat?.yellow_cards ?? 0);
    const redCardsCount = redEvents.length || (dbStat?.red_cards ?? 0);
    const yellowCardMinute = yellowEvents.length > 0 ? (yellowEvents[0].minute || null) : null;
    const redCardMinute = redEvents.length > 0 ? (redEvents[0].minute || null) : null;

    // Substitutions
    const subOutEvent = (events || []).find(e => 
      e.type === 'substitution' &&
      String(typeof e.playerId === 'object' ? e.playerId?.id : e.playerId) === String(pid)
    );
    const subInEvent = (events || []).find(e => 
      e.type === 'substitution' &&
      String(typeof e.relatedPlayerId === 'object' ? e.relatedPlayerId?.id : e.relatedPlayerId) === String(pid)
    );

    let minutesPlayed = 0;
    let minutesStatus = 'Non renseigné';
    let subDetails: string | null = null;

    if (isStarting) {
      if (subOutEvent) {
        minutesPlayed = explicitMinutes ?? (subOutEvent.minute || 0);
        const inPlayerName = getPlayerShortName(subOutEvent.relatedPlayerId);
        minutesStatus = `Titulaire · Sorti à la ${subOutEvent.minute}'`;
        subDetails = `Remplacé à la ${subOutEvent.minute}' par ${inPlayerName}`;
      } else {
        minutesPlayed = explicitMinutes ?? currentMatchMinute;
        minutesStatus = isFinished 
          ? 'Titulaire · Match complet (90\')' 
          : isLive 
          ? `Titulaire · En jeu (${currentMatchMinute}')` 
          : 'Titulaire';
      }
    } else {
      if (subInEvent) {
        const subMin = subInEvent.minute || 0;
        const played = Math.max(0, currentMatchMinute - subMin);
        minutesPlayed = explicitMinutes ?? played;
        const outPlayerName = getPlayerShortName(subInEvent.playerId);
        minutesStatus = `Entré à la ${subMin}' (${minutesPlayed}' jouées)`;
        subDetails = `Entré à la ${subMin}' à la place de ${outPlayerName}`;
      } else {
        minutesPlayed = explicitMinutes ?? 0;
        minutesStatus = 'Remplaçant (Non entré)';
      }
    }

    const lineupEntry = (matchLineupPlayers || []).find(lp => String(lp.player_id) === String(pid));
    const rating = dbStat?.rating ?? lineupEntry?.rating ?? null;

    return {
      id: String(pid || ''),
      name: displayName,
      jerseyNumber,
      positionLabel: roleLabel,
      teamName,
      isHome: isHomeTeam,
      photoUrl,
      minutesPlayed,
      minutesStatus,
      goalsCount,
      goalsMinutes,
      assistsCount,
      yellowCardsCount,
      yellowCardMinute,
      redCardsCount,
      redCardMinute,
      rating: typeof rating === 'number' ? rating : null,
      subDetails,
    };
  };

  // Real Tactical Positions (respecting matchFormat and Home/Away orientation)
  const topFormation = isHome ? formationKey : opponentFormationKey;
  const bottomFormation = isHome ? opponentFormationKey : formationKey;
  const topTeamPositions = getFormationPositions(topFormation, matchFormat);
  const bottomTeamPositions = getFormationPositions(bottomFormation, matchFormat);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-4 max-w-[1750px] mx-auto pb-10 font-sans select-none"
    >
      {/* ════ TOP DARK CONTEXT BAR (Real DB metadata) ════ */}
      <div className="bg-[#121e28] border border-slate-800 text-slate-200 rounded-xl px-4 py-2.5 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-wider rounded-lg h-8 px-3 gap-1"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Retour
          </Button>

          {/* Country */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium text-[11px]">Pays:</span>
            <div className="flex items-center gap-1.5 bg-[#1a2836] px-3 py-1 rounded-lg text-white font-bold border border-slate-700/60 text-[11px]">
              <span>🇲🇦</span>
              <span>Maroc</span>
            </div>
          </div>

          {/* Competition / Type de match */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium text-[11px]">{isFriendly ? 'Type:' : 'Compétition:'}</span>
            {isFriendly ? (
              <div className="flex items-center gap-1.5 bg-amber-500/20 px-3 py-1 rounded-lg text-amber-300 font-black border border-amber-500/40 text-[11px] shadow-sm">
                <span>🤝</span>
                <span>Match Amical</span>
                {match.category && <span className="opacity-75 font-bold">({match.category})</span>}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-[#1a2836] px-3 py-1 rounded-lg text-white font-bold border border-slate-700/60 text-[11px] truncate max-w-[220px]">
                <span className="text-amber-400">🏆</span>
                <span>{leagueName}</span>
                {match.category && <span className="text-slate-400 text-[10px]">({match.category})</span>}
              </div>
            )}
          </div>

          {/* Match Date */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium text-[11px]">Date:</span>
            <div className="flex items-center gap-1.5 bg-[#1a2836] px-3 py-1 rounded-lg text-slate-300 font-medium border border-slate-700/60 text-[11px]">
              <span>{match.match_date || 'Aujourd’hui'}</span>
              <Calendar className="w-3.5 h-3.5 text-emerald-400 ml-2" />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Bouton Post-Match (Drive) */}
          <Button
            onClick={() => setIsVideoModalOpen(true)}
            className={`font-black uppercase tracking-wider text-[10px] h-8 px-3 rounded-lg gap-1.5 transition-all shadow-md ${
              currentVideoUrl
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                : isFinished
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black animate-pulse shadow-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title={currentVideoUrl ? "Voir ou modifier la vidéo post-match (Google Drive)" : "Ajouter le résumé vidéo post-match (Google Drive)"}
          >
            <Video className="w-3.5 h-3.5" />
            {currentVideoUrl ? 'Post-Match (Drive)' : isFinished ? '+ Post-Match (Drive)' : 'Post-Match'}
          </Button>

          {onOrchestrate && (
            <Button
              onClick={onOrchestrate}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black uppercase tracking-wider text-[10px] h-8 px-3 rounded-lg gap-1.5 shadow-md"
            >
              <LayoutPanelLeft className="w-3.5 h-3.5" /> Orchestrer
            </Button>
          )}
          {onStats && (
            <Button
              onClick={onStats}
              className="bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-wider text-[10px] h-8 px-3 rounded-lg gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5" /> Saisir Stats
            </Button>
          )}
        </div>
      </div>

      {/* ════ 3-COLUMN MAIN LAYOUT GRID (REAL DB DATA) ════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* ────────────────────────────────────────────────────────── */}
        {/* 1. COLUMN 1: LIVE SCOREBOARD + CARD MATCHS À VENIR + FEED  */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Scoreboard Card */}
          <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-800 bg-[#121e28]">
            {/* Top Status Header */}
            <div className={`px-4 py-2 flex items-center justify-between font-black text-[10px] uppercase ${isLive ? 'bg-red-500 text-white animate-pulse' : isFinished ? 'bg-[#2ecc71] text-[#0b141d]' : 'bg-blue-600 text-white'}`}>
              <span className="tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                {isLive ? 'EN DIRECT' : isFinished ? 'MATCH TERMINÉ' : 'À VENIR'}
              </span>
              <span className="text-[9px] font-bold opacity-90 truncate max-w-[220px]">
                {stadiumName}
              </span>
            </div>

            {/* Scoreboard Body */}
            <div className="p-5 text-center text-white space-y-4 relative bg-gradient-to-b from-[#182635] to-[#121e28]">
              <div className="flex items-center justify-center gap-2 text-[9px] font-bold tracking-wider uppercase flex-wrap">
                {isFriendly ? (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-black">
                    🤝 Match Amical
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-black">
                    🏆 {leagueName}
                  </span>
                )}
                {currentVideoUrl && (
                  <button
                    onClick={() => setIsVideoModalOpen(true)}
                    className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 transition-colors cursor-pointer"
                    title="Voir ou modifier la vidéo du match"
                  >
                    <Video className="w-3 h-3 text-indigo-400" />
                    <span>Vidéo Drive</span>
                  </button>
                )}
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{stadiumName}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{match.match_date}</span>
                {match.match_time && <span className="text-slate-500">· {match.match_time.slice(0, 5)}</span>}
              </div>

              {/* Opérateur Live Fus-App Pill */}
              {operatorDetails.name && (
                <div className="flex items-center justify-center pt-0.5 pb-1">
                  <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-md text-white backdrop-blur-sm">
                    <div className="relative shrink-0">
                      {operatorDetails.avatar_url ? (
                        <img 
                          src={operatorDetails.avatar_url} 
                          alt={operatorDetails.name} 
                          className="w-6 h-6 rounded-full object-cover border border-slate-500 shadow-xs" 
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-red-600 text-white font-black text-[9px] flex items-center justify-center border border-red-400">
                          {operatorDetails.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 text-[8px]" title="Opérateur Fus-App">📱</span>
                    </div>
                    <div className="flex items-center gap-2 text-left">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-white leading-tight">
                          {operatorDetails.name}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400 leading-tight">
                          {operatorDetails.role || 'Opérateur Live Fus-App'}
                        </span>
                      </div>
                      <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full uppercase shrink-0">
                        📱 Fus-App
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Clubs and Real Score */}
              <div className="flex items-center justify-between px-2">
                {/* Home Club (Domicile - Gauche) */}
                <div className="flex-1 text-center min-w-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full bg-white p-2 shadow-2xl flex items-center justify-center mb-2.5 overflow-hidden ring-4 ring-white/20 border-2 border-white/40">
                    {homeClubLogo ? (
                      <img src={homeClubLogo} alt={homeClubName} className="w-full h-full object-contain rounded-full" />
                    ) : (
                      <Shield className="w-10 h-10 text-emerald-500" />
                    )}
                  </div>
                  <h4 className="font-black text-xs md:text-sm tracking-wider uppercase text-white truncate max-w-full px-1">
                    {homeClubName}
                  </h4>
                  <p className="text-[9px] text-slate-400 mt-0.5 uppercase font-bold">{homeClubCategory}</p>
                  <div className="text-4xl md:text-5xl font-black mt-2 text-white tabular-nums">
                    {homeScore}
                  </div>
                </div>

                {/* Score separator & minute */}
                <div className="px-3 flex flex-col items-center">
                  <span className="text-slate-500 font-bold text-lg mb-1">—</span>
                  <div className="w-12 h-12 rounded-full border-2 border-slate-600 bg-slate-800/80 flex items-center justify-center text-xs font-black text-emerald-400 shadow-inner">
                    {isFinished ? `${totalDuration}'` : isLive ? `${Math.min(totalDuration, Math.round((match.time_elapsed_seconds || halfDuration * 60) / 60))}'` : '00\''}
                  </div>
                </div>

                {/* Away Club (Extérieur - Droite) */}
                <div className="flex-1 text-center min-w-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full bg-white p-2 shadow-2xl flex items-center justify-center mb-2.5 overflow-hidden ring-4 ring-white/20 border-2 border-white/40">
                    {awayClubLogo ? (
                      <img src={awayClubLogo} alt={awayClubName} className="w-full h-full object-contain rounded-full" />
                    ) : (
                      <Target className="w-10 h-10 text-rose-500" />
                    )}
                  </div>
                  <h4 className="font-black text-xs md:text-sm tracking-wider uppercase text-white truncate max-w-full px-1">
                    {awayClubName}
                  </h4>
                  <p className="text-[9px] text-slate-400 mt-0.5 uppercase font-bold">{awayClubCategory}</p>
                  <div className="text-4xl md:text-5xl font-black mt-2 text-white tabular-nums">
                    {awayScore}
                  </div>
                </div>
              </div>

              {/* Timeline Slider Bar with real DB events adapted to match format */}
              <div className="pt-2 space-y-1">
                <div className="relative w-full h-2 bg-slate-700/80 rounded-full flex items-center">
                  <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-3 bg-slate-500" />
                  {timelineBarDots.map((dot, idx) => (
                    <div
                      key={idx}
                      className={`absolute w-3 h-3 rounded-full ${dot.color} border border-slate-900 -translate-x-1/2 cursor-pointer shadow-md`}
                      style={{ left: dot.left }}
                      title={`${dot.minute}'`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold px-0.5">
                  <span>0'</span>
                  <span className="text-slate-500 font-semibold">{halfDuration}' (MT)</span>
                  <span>{totalDuration}'</span>
                </div>
              </div>
            </div>
          </div>

          {/* 🎥 Bloc Vidéo Google Drive du Match */}
          <MatchDriveVideoCard
            match={match}
            currentVideoUrl={currentVideoUrl}
            onVideoUpdated={(newUrl) => {
              setCurrentVideoUrl(newUrl);
              if (match) (match as any).video_url = newUrl;
            }}
            onOpenModal={() => setIsVideoModalOpen(true)}
          />

          {/* Play to Play & Narration Tabs + Real Vertical Timeline Feed */}
          <div className="bg-white rounded-2xl p-4 shadow-xl border border-slate-200 space-y-4">
            
            {/* Tab Switcher Pills */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFeedTab('play')}
                className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  feedTab === 'play'
                    ? 'bg-[#2ecc71] text-white shadow-md'
                    : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                }`}
              >
                <Target className="w-3.5 h-3.5" /> PLAY TO PLAY ({(events || []).filter(e => e.type !== 'period_marker').length})
              </button>
              <button
                onClick={() => setFeedTab('narration')}
                className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  feedTab === 'narration'
                    ? 'bg-[#2ecc71] text-white shadow-md'
                    : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                }`}
              >
                <Footprints className="w-3.5 h-3.5" /> NARRATION
              </button>
            </div>

            {/* Vertical Timeline Stream with Real Events */}
            {timelineEvents.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <Activity className="w-8 h-8 text-slate-300" />
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Aucun événement enregistré
                </p>
                <p className="text-[10px] text-slate-400 max-w-xs">
                  Les buts, cartons, changements et tirs apparaîtront ici dès leur saisie.
                </p>
                {onOrchestrate && (
                  <Button onClick={onOrchestrate} size="sm" className="bg-[#2ecc71] hover:bg-emerald-600 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-xl">
                    <LayoutPanelLeft className="w-3.5 h-3.5 mr-1" /> Saisir les actions
                  </Button>
                )}
              </div>
            ) : (
              <div className="relative pt-2 pb-4 space-y-4 max-h-[460px] overflow-y-auto scrollbar-thin pr-1">
                {/* Central vertical line */}
                <div className="absolute left-1/2 top-2 bottom-2 w-0.5 bg-emerald-300 -translate-x-1/2 pointer-events-none" />

                {timelineEvents.map((item: any, idx: number) => {
                  // Marqueur officiel de période (Coup d'envoi, Mi-temps, Fin du match)
                  if (item.isPeriodMarker) {
                    return (
                      <div key={item.id || idx} className="relative flex items-center justify-center my-3 py-1 w-full z-20">
                        <div className="absolute inset-x-0 h-px bg-slate-200" />
                        <div className="relative z-10 px-3.5 py-1 bg-slate-800 text-white rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md border border-slate-700">
                          <span className="text-xs">{item.markerIcon}</span>
                          <span>{item.markerLabel}</span>
                          <span className="text-emerald-400 font-bold ml-1">· {item.minute}'</span>
                        </div>
                      </div>
                    );
                  }

                  const isLeft = item.isLeft;
                  return (
                    <div key={item.id || idx} className="relative flex items-center justify-between gap-3 text-xs">
                      {/* Left text / block (FUS events) */}
                      <div className={`w-[42%] flex items-center justify-end gap-2 text-right ${isLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        <div>
                          <p className="font-bold text-slate-800 text-[11px] leading-tight">
                            <span className="font-black">{item.player}</span> · {item.title}
                          </p>
                          {item.desc && (
                            <p className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">
                              {item.desc}
                            </p>
                          )}
                        </div>
                        {item.isOur ? (
                          item.photo ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-400/60 shadow-sm shrink-0">
                              <img src={item.photo} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-black text-[9px] flex items-center justify-center shrink-0 border border-emerald-300">
                              {item.player.substring(0, 2).toUpperCase()}
                            </div>
                          )
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 font-black text-[9px] flex items-center justify-center shrink-0 border border-rose-300">
                            ADV
                          </div>
                        )}
                      </div>

                      {/* Center Minute Icon Pin */}
                      <div className="z-10 w-7 h-7 rounded-full bg-white border-2 border-emerald-400 flex items-center justify-center shadow-sm shrink-0">
                        <span className="text-[9px] font-black text-emerald-600">{item.minute}'</span>
                      </div>

                      {/* Right text / block (Opponent events or our events) */}
                      <div className={`w-[42%] flex items-center justify-start gap-2 text-left ${!isLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        {item.isOur ? (
                          item.photo ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-400/60 shadow-sm shrink-0">
                              <img src={item.photo} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-black text-[9px] flex items-center justify-center shrink-0 border border-emerald-300">
                              {item.player.substring(0, 2).toUpperCase()}
                            </div>
                          )
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 font-black text-[9px] flex items-center justify-center shrink-0 border border-rose-300">
                            ADV
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-800 text-[11px] leading-tight">
                            <span className="font-black">{item.player}</span> · {item.title}
                          </p>
                          {item.desc && (
                            <p className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">
                              {item.desc}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 2. COLUMN 2: STATS & MATCHS À VENIR                        */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* STATS Card */}
          <div className="bg-white rounded-2xl p-4 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">STATS MATCH</h3>
              {onStats && (
                <button onClick={onStats} className="text-slate-400 hover:text-emerald-500 transition-colors">
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Team Badges */}
            <div className="flex items-center justify-between text-center px-2">
              <div className="w-[110px] min-w-0">
                <div className="w-14 h-14 mx-auto rounded-full bg-white border-2 border-slate-200 p-1.5 flex items-center justify-center shadow-md overflow-hidden ring-2 ring-slate-100">
                  {homeClubLogo ? <img src={homeClubLogo} alt={homeClubName} className="w-full h-full object-contain rounded-full" /> : <Shield className="w-7 h-7 text-[#4d94ff]" />}
                </div>
                <p className="text-[10px] font-black text-slate-800 mt-1.5 truncate">{homeClubName}</p>
              </div>

              <div className="text-slate-300 font-bold text-xs">VS</div>

              <div className="w-[110px] min-w-0">
                <div className="w-14 h-14 mx-auto rounded-full bg-white border-2 border-slate-200 p-1.5 flex items-center justify-center shadow-md overflow-hidden ring-2 ring-slate-100">
                  {awayClubLogo ? <img src={awayClubLogo} alt={awayClubName} className="w-full h-full object-contain rounded-full" /> : <Target className="w-7 h-7 text-[#e94e77]" />}
                </div>
                <p className="text-[10px] font-black text-slate-800 mt-1.5 truncate">{awayClubName}</p>
              </div>
            </div>

            {/* Real Stats Bars for the 5 Metrics (Left = Home, Right = Away) */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <StatBar label="Buts" icon="⚽" home={homeGoals} away={awayGoals} />
              <StatBar label="Assists" icon="⭐" home={homeAssists} away={awayAssists} />
              <StatBar label="Changements" icon="🔁" home={homeSubsCount} away={awaySubsCount} />
              <StatBar label="Cartons Jaunes" icon="🟨" home={homeYellows} away={awayYellows} />
              <StatBar label="Cartons Rouges" icon="🟥" home={homeReds} away={awayReds} />
            </div>
          </div>

          {/* ── CARD CORPS D'ARBITRAGE & COMMISSAIRE DU MATCH ── */}
          <div className="bg-white rounded-2xl p-4 shadow-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-900 font-black text-[11px] uppercase tracking-wider">
                <UserCheck className="w-4 h-4 text-primary" />
                <span>Corps d'Arbitrage & Officiels</span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                {assignedOfficials.length} désigné{assignedOfficials.length > 1 ? 's' : ''}
              </span>
            </div>

            {assignedOfficials.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-[10px] font-medium italic">
                Aucun arbitre ou commissaire désigné
              </div>
            ) : (
              <div className="space-y-2">
                {assignedOfficials.map((off, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-300 flex items-center justify-center">
                        {off.photo_url && off.photo_url !== 'null' ? (
                          <img src={off.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] font-black text-slate-600">{off.initials}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-900 truncate">
                          {off.prenom} {off.nom}
                        </p>
                        <p className="text-[9px] font-medium text-slate-500">
                          {off.grade || 'Officiel'} {off.numero_licence ? `• Lic. ${off.numero_licence}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider shrink-0 border ${off.badgeClass}`}>
                      {off.roleLabel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── CARD OPÉRATEUR DU MATCH (FUS-APP) ── */}
          <div className="bg-white rounded-2xl p-4 shadow-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-900 font-black text-[11px] uppercase tracking-wider">
                <span className="text-sm">🎙️</span>
                <span>Opérateur Fus-App</span>
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                match.status === 'live' 
                  ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' 
                  : operatorDetails.name 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {match.status === 'live' ? '🔴 En Direct' : operatorDetails.name ? '📱 Opéré avec Fus-App' : 'Non assigné'}
              </span>
            </div>

            {operatorDetails.name ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100/70 border border-slate-200/80 shadow-xs">
                <div className="relative shrink-0">
                  {operatorDetails.avatar_url ? (
                    <img 
                      src={operatorDetails.avatar_url} 
                      alt={operatorDetails.name} 
                      className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-md" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white font-black text-sm flex items-center justify-center border-2 border-white shadow-md">
                      {operatorDetails.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center border-2 border-white shadow-xs" title="Application mobile Fus-App">
                    📱
                  </div>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate tracking-tight">
                      {operatorDetails.name}
                    </h4>
                  </div>
                  <p className="text-[10px] sm:text-[11px] font-bold text-red-600 truncate mt-0.5">
                    {operatorDetails.role || 'Opérateur Live'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8.5px] font-semibold text-slate-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      Saisie mobile des événements terrain en direct
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-slate-400 text-[10px] font-medium italic">
                Aucun opérateur désigné pour ce match
              </div>
            )}
          </div>

          {/* ── CARD MATCHS À VENIR (Real DB Fixtures) ── */}
          <div className="bg-[#121e28] border border-slate-800 rounded-2xl p-4 shadow-xl text-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Matchs à venir
                </h3>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {upcomingMatches.length} Matchs
              </span>
            </div>

            {/* Upcoming List */}
            {upcomingMatches.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-[10px] font-medium">
                Aucun autre match programmé pour le moment.
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingMatches.map((m: Match) => {
                  const opp = opponentClubs.find(c => c.id === m.opponent_id);
                  const oppNm = (getOpponentName && m.opponent_id ? getOpponentName(m.opponent_id) : '') || opp?.name || 'Adversaire';
                  const dateText = m.match_date || 'À venir';
                  const timeText = m.match_time ? m.match_time.slice(0, 5) : '18:00';

                  return (
                    <div
                      key={m.id}
                      onClick={() => onSelectMatch?.(m)}
                      className="bg-[#182635] hover:bg-[#1f3144] border border-slate-700/60 hover:border-emerald-500/50 rounded-xl p-3 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
                    >
                      {(() => {
                        const otherLeague = leagues.find(l => l.id === m.league_id);
                        const otherIsFriendly = !m.league_id || otherLeague?.name?.toLowerCase().includes('amical') || m.category?.toLowerCase().includes('amical') || m.notes?.toLowerCase().includes('amical');
                        return (
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold mb-2">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-emerald-400" /> {timeText} · {dateText}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${m.status === 'live' ? 'bg-red-500 text-white animate-pulse' : otherIsFriendly ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-300'}`}>
                              {m.status === 'live' ? 'LIVE' : otherIsFriendly ? '🤝 Amical' : (otherLeague?.name || m.category || 'PRO')}
                            </span>
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-between gap-2 py-1">
                        <span className="text-[11px] font-black text-white group-hover:text-emerald-300 transition-colors truncate">
                          {m.is_home ? mainClubName : oppNm}
                        </span>
                        <span className="text-[9px] font-bold text-slate-500 px-1.5 py-0.5 bg-slate-900 rounded">
                          VS
                        </span>
                        <span className="text-[11px] font-black text-slate-300 group-hover:text-white transition-colors truncate text-right">
                          {m.is_home ? oppNm : mainClubName}
                        </span>
                      </div>

                      <p className="text-[8px] text-slate-500 truncate mt-1 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" /> {m.stadium || stadiumName}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 3. COLUMN 3: LINE UP REAL TACTICAL PITCH & BENCHES         */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-[#28963c] text-white flex flex-col">
            
            {/* Header: LINE UP & Half selector */}
            <div className="bg-[#2ecc71] px-4 py-2.5 flex items-center justify-between text-[#0b141d] font-black text-[11px] uppercase">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> COMPOSITIONS ({topFormation} vs {bottomFormation})
              </span>
              <div className="flex items-center gap-1 text-[9px] font-bold bg-[#1d7e32]/40 px-2 py-0.5 rounded text-white cursor-pointer">
                <span>TITULAIRES</span>
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>

            {/* Tactical Football Pitch with Real Players */}
            <div className="relative w-full h-[620px] bg-gradient-to-b from-[#28963c] via-[#248936] to-[#207c31] p-3">
              {/* Grass vertical stripes */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: 'repeating-linear-gradient(180deg, #000 0px, #000 35px, transparent 35px, transparent 70px)'
                }}
              />

              {/* Pitch Markings */}
              <div className="absolute inset-2 border-2 border-white/50 rounded pointer-events-none" />
              <div className="absolute top-1/2 inset-x-2 h-0.5 bg-white/50 -translate-y-1/2 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-white/50 pointer-events-none" />
              <div className="absolute top-2 inset-x-[25%] h-[12%] border-2 border-white/50 border-t-0 pointer-events-none" />
              <div className="absolute bottom-2 inset-x-[25%] h-[12%] border-2 border-white/50 border-b-0 pointer-events-none" />

              {/* Formations Labels (Top = Home, Bottom = Away) */}
              <span className="absolute top-3 left-3 text-[9px] font-black text-white/90 bg-black/40 px-2 py-0.5 rounded">
                {homeClubName.substring(0, 8)} ({topFormation})
              </span>
              <span className="absolute bottom-3 left-3 text-[9px] font-black text-white/90 bg-black/40 px-2 py-0.5 rounded">
                {awayClubName.substring(0, 8)} ({bottomFormation})
              </span>

              {/* Top Team Nodes (Home Team: Top Goal) */}
              {topTeamPositions.map((pos, idx) => {
                if (isHome) {
                  const rawPid = startingXI[idx];
                  const pid = typeof rawPid === 'object' ? (rawPid?.player_id || rawPid?.id) : rawPid;
                  const p = getPlayer(pid);
                  const name = p ? (p.last_name || p.name || 'FUS') : (typeof rawPid === 'object' ? (rawPid.full_name || rawPid.name || 'FUS') : `J.${idx + 1}`);
                  const jerseyVal = p?.jersey_number ?? (typeof rawPid === 'object' ? (rawPid.jersey_number || rawPid.number) : null) ?? (idx + 1);
                  const jerseyText = String(jerseyVal);
                  const hasGoal = (events || []).some(e => (e.type === 'goal' || e.type === 'penalty') && String(typeof e.playerId === 'object' ? e.playerId?.id : e.playerId) === String(pid));
                  const hasYellowCard = (events || []).some(e => e.type === 'yellow_card' && String(typeof e.playerId === 'object' ? e.playerId?.id : e.playerId) === String(pid));
                  const hasRedCard = (events || []).some(e => e.type === 'red_card' && String(typeof e.playerId === 'object' ? e.playerId?.id : e.playerId) === String(pid));

                  const topPct = 48 - (parseFloat(pos.top) * 0.44);
                  const isHovered = hoveredPlayerKey === `top-fus-${idx}`;
                  const hoverStats = isHovered ? getPlayerHoverStats(rawPid, pos.label, true, true, idx, jerseyVal) : null;
                  const hAlign = getHorizontalAlign(pos.left);

                  return (
                    <div
                      key={`top-fus-${idx}`}
                      onMouseEnter={() => setHoveredPlayerKey(`top-fus-${idx}`)}
                      onMouseLeave={() => setHoveredPlayerKey(null)}
                      className={`absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${
                        isHovered ? 'scale-125 z-40' : 'hover:scale-125 z-20'
                      }`}
                      style={{ top: `${topPct}%`, left: pos.left }}
                    >
                      <div className="relative w-11 h-11 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-xs font-black text-white shadow-xl">
                        {p?.photo_url && p.photo_url !== 'null' ? (
                          <img src={p.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-xs font-black">{jerseyText}</span>
                        )}
                        <span className="absolute -top-1 -right-1 bg-slate-950 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white shadow">
                          {jerseyText}
                        </span>
                        {hasGoal && <span className="absolute -bottom-1 -left-1 text-[10px]">⚽</span>}
                        {hasRedCard ? (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-3 bg-red-600 rounded-xs shadow border border-white/40" title="Carton Rouge" />
                        ) : hasYellowCard ? (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-3 bg-yellow-400 rounded-xs shadow border border-white/40" title="Carton Jaune" />
                        ) : null}
                      </div>
                      <span className="text-[8px] font-black text-white uppercase mt-0.5 tracking-tight drop-shadow bg-black/60 px-1.5 py-0.5 rounded-md truncate max-w-[65px]">
                        {String(name).split(' ').pop()}
                      </span>

                      <AnimatePresence>
                        {isHovered && hoverStats && (
                          <PlayerPitchHoverCard
                            stats={hoverStats}
                            placement="bottom"
                            horizontalAlign={hAlign}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  );
                } else {
                  // Opponent is Home (Top Goal)
                  const rawOpp = opponentStartingXI[idx];
                  const oppPid = typeof rawOpp === 'object' ? (rawOpp.id || rawOpp.player_id) : rawOpp;
                  const jerseyVal = typeof rawOpp === 'object' ? (rawOpp.jersey_number || rawOpp.number || (idx + 1)) : (rawOpp || (idx + 1));
                  const jerseyText = String(jerseyVal);

                  const hasOppGoal = (events || []).some(e => (e.type === 'goal' || e.type === 'penalty') && String(typeof e.playerId === 'object' ? e.playerId?.id : e.playerId) === String(oppPid));
                  const hasOppYellowCard = (events || []).some(e => e.type === 'yellow_card' && String(typeof e.playerId === 'object' ? e.playerId?.id : e.playerId) === String(oppPid));
                  const hasOppRedCard = (events || []).some(e => e.type === 'red_card' && String(typeof e.playerId === 'object' ? e.playerId?.id : e.playerId) === String(oppPid));

                  const topPct = 48 - (parseFloat(pos.top) * 0.44);
                  const isHovered = hoveredPlayerKey === `top-opp-${idx}`;
                  const hoverStats = isHovered ? getPlayerHoverStats(rawOpp, pos.label, false, true, idx, jerseyVal) : null;
                  const hAlign = getHorizontalAlign(pos.left);

                  return (
                    <div
                      key={`top-opp-${idx}`}
                      onMouseEnter={() => setHoveredPlayerKey(`top-opp-${idx}`)}
                      onMouseLeave={() => setHoveredPlayerKey(null)}
                      className={`absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${
                        isHovered ? 'scale-125 z-40' : 'hover:scale-125 z-20'
                      }`}
                      style={{ top: `${topPct}%`, left: pos.left }}
                    >
                      <div className="relative w-11 h-11 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-xs font-black text-white shadow-xl">
                        {jerseyText}
                        {hasOppGoal && <span className="absolute -bottom-1 -left-1 text-[10px]">⚽</span>}
                        {hasOppRedCard ? (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-3 bg-red-600 rounded-xs shadow border border-white/40" title="Carton Rouge" />
                        ) : hasOppYellowCard ? (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-3 bg-yellow-400 rounded-xs shadow border border-white/40" title="Carton Jaune" />
                        ) : null}
                      </div>
                      <span className="text-[8px] font-black text-rose-200 uppercase mt-0.5 tracking-tight drop-shadow bg-black/60 px-1.5 py-0.5 rounded-md truncate max-w-[65px]">
                        Adv #{jerseyText}
                      </span>

                      <AnimatePresence>
                        {isHovered && hoverStats && (
                          <PlayerPitchHoverCard
                            stats={hoverStats}
                            placement="bottom"
                            horizontalAlign={hAlign}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }
              })}

              {/* Bottom Team Nodes (Away Team: Bottom Goal - Rotated 180°) */}
              {bottomTeamPositions.map((pos, idx) => {
                if (isHome) {
                  // Opponent is Away (Bottom Goal)
                  const rawOpp = opponentStartingXI[idx];
                  const oppPid = typeof rawOpp === 'object' ? (rawOpp.id || rawOpp.player_id) : rawOpp;
                  const jerseyVal = typeof rawOpp === 'object' ? (rawOpp.jersey_number || rawOpp.number || (idx + 1)) : (rawOpp || (idx + 1));
                  const jerseyText = String(jerseyVal);

                  const hasOppGoal = (events || []).some(e => (e.type === 'goal' || e.type === 'penalty') && String(typeof e.playerId === 'object' ? e.playerId?.id : e.playerId) === String(oppPid));
                  const hasOppYellowCard = (events || []).some(e => e.type === 'yellow_card' && String(typeof e.playerId === 'object' ? e.playerId?.id : e.playerId) === String(oppPid));
                  const hasOppRedCard = (events || []).some(e => e.type === 'red_card' && String(typeof e.playerId === 'object' ? e.playerId?.id : e.playerId) === String(oppPid));
                  
                  const topPct = 52 + (parseFloat(pos.top) * 0.44);
                  const leftPct = parseFloat(pos.left);

                  const isHovered = hoveredPlayerKey === `bottom-opp-${idx}`;
                  const hoverStats = isHovered ? getPlayerHoverStats(rawOpp, pos.label, false, true, idx, jerseyVal) : null;
                  const hAlign = getHorizontalAlign(pos.left);

                  return (
                    <div
                      key={`bottom-opp-${idx}`}
                      onMouseEnter={() => setHoveredPlayerKey(`bottom-opp-${idx}`)}
                      onMouseLeave={() => setHoveredPlayerKey(null)}
                      className={`absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${
                        isHovered ? 'scale-125 z-40' : 'hover:scale-125 z-20'
                      }`}
                      style={{ top: `${topPct}%`, left: `${leftPct}%` }}
                    >
                      <div className="relative w-11 h-11 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-xs font-black text-white shadow-xl">
                        {jerseyText}
                        {hasOppGoal && <span className="absolute -bottom-1 -left-1 text-[10px]">⚽</span>}
                        {hasOppRedCard ? (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-3 bg-red-600 rounded-xs shadow border border-white/40" title="Carton Rouge" />
                        ) : hasOppYellowCard ? (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-3 bg-yellow-400 rounded-xs shadow border border-white/40" title="Carton Jaune" />
                        ) : null}
                      </div>
                      <span className="text-[8px] font-black text-rose-200 uppercase mt-0.5 tracking-tight drop-shadow bg-black/60 px-1.5 py-0.5 rounded-md truncate max-w-[65px]">
                        Adv #{jerseyText}
                      </span>

                      <AnimatePresence>
                        {isHovered && hoverStats && (
                          <PlayerPitchHoverCard
                            stats={hoverStats}
                            placement="top"
                            horizontalAlign={hAlign}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  );
                } else {
                  // FUS is Away (Bottom Goal)
                  const rawPid = startingXI[idx];
                  const pid = typeof rawPid === 'object' ? (rawPid?.player_id || rawPid?.id) : rawPid;
                  const p = getPlayer(pid);
                  const name = p ? (p.last_name || p.name || 'FUS') : (typeof rawPid === 'object' ? (rawPid.full_name || rawPid.name || 'FUS') : `J.${idx + 1}`);
                  const jerseyVal = p?.jersey_number ?? (typeof rawPid === 'object' ? (rawPid.jersey_number || rawPid.number) : null) ?? (idx + 1);
                  const jerseyText = String(jerseyVal);
                  const hasGoal = (events || []).some(e => (e.type === 'goal' || e.type === 'penalty') && String(typeof e.playerId === 'object' ? e.playerId?.id : e.playerId) === String(pid));
                  const hasYellowCard = (events || []).some(e => e.type === 'yellow_card' && String(typeof e.playerId === 'object' ? e.playerId?.id : e.playerId) === String(pid));
                  const hasRedCard = (events || []).some(e => e.type === 'red_card' && String(typeof e.playerId === 'object' ? e.playerId?.id : e.playerId) === String(pid));

                  const topPct = 52 + (parseFloat(pos.top) * 0.44);
                  const leftPct = parseFloat(pos.left);

                  const isHovered = hoveredPlayerKey === `bottom-fus-${idx}`;
                  const hoverStats = isHovered ? getPlayerHoverStats(rawPid, pos.label, true, true, idx, jerseyVal) : null;
                  const hAlign = getHorizontalAlign(pos.left);

                  return (
                    <div
                      key={`bottom-fus-${idx}`}
                      onMouseEnter={() => setHoveredPlayerKey(`bottom-fus-${idx}`)}
                      onMouseLeave={() => setHoveredPlayerKey(null)}
                      className={`absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${
                        isHovered ? 'scale-125 z-40' : 'hover:scale-125 z-20'
                      }`}
                      style={{ top: `${topPct}%`, left: `${leftPct}%` }}
                    >
                      <div className="relative w-11 h-11 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-xs font-black text-white shadow-xl">
                        {p?.photo_url && p.photo_url !== 'null' ? (
                          <img src={p.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-xs font-black">{jerseyText}</span>
                        )}
                        <span className="absolute -top-1 -right-1 bg-slate-950 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white shadow">
                          {jerseyText}
                        </span>
                        {hasGoal && <span className="absolute -bottom-1 -left-1 text-[10px]">⚽</span>}
                        {hasRedCard ? (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-3 bg-red-600 rounded-xs shadow border border-white/40" title="Carton Rouge" />
                        ) : hasYellowCard ? (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-3 bg-yellow-400 rounded-xs shadow border border-white/40" title="Carton Jaune" />
                        ) : null}
                      </div>
                      <span className="text-[8px] font-black text-white uppercase mt-0.5 tracking-tight drop-shadow bg-black/60 px-1.5 py-0.5 rounded-md truncate max-w-[65px]">
                        {String(name).split(' ').pop()}
                      </span>

                      <AnimatePresence>
                        {isHovered && hoverStats && (
                          <PlayerPitchHoverCard
                            stats={hoverStats}
                            placement="top"
                            horizontalAlign={hAlign}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }
              })}
            </div>

            {/* Benches Section (Real DB Substitutes & Coaches) */}
            <div className="bg-[#182635] p-3.5 border-t border-slate-700 text-white space-y-2.5">
              <div className="flex items-center justify-center">
                <span className="bg-slate-800 text-slate-300 text-[8px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full border border-slate-700">
                  STAFF & REMPLAÇANTS
                </span>
              </div>

              {/* Coaches Portraits (Left = Home, Right = Away) */}
              <div className="grid grid-cols-2 gap-2 text-center text-[8px] pb-2 border-b border-slate-700/60">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full ${isHome ? 'bg-emerald-500/20 border-emerald-400' : 'bg-rose-500/20 border-rose-400'} border flex items-center justify-center text-xs`}>
                    👨‍💼
                  </div>
                  <p className="font-bold text-white uppercase mt-1 truncate max-w-full px-1">
                    {isHome ? headCoachName : `Staff ${opponentName}`}
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full ${!isHome ? 'bg-emerald-500/20 border-emerald-400' : 'bg-rose-500/20 border-rose-400'} border flex items-center justify-center text-xs`}>
                    👨‍💼
                  </div>
                  <p className="font-bold text-slate-300 uppercase mt-1 truncate max-w-full px-1">
                    {!isHome ? headCoachName : `Staff ${opponentName}`}
                  </p>
                </div>
              </div>

              {/* Substitutes List Columns with Photos (Left = Home, Right = Away) */}
              <div className="grid grid-cols-2 gap-2 text-[8px]">
                {/* Home Subs */}
                <div className="space-y-1.5">
                  {isHome ? (
                    subs.length === 0 ? (
                      <span className="text-slate-500 italic text-[7.5px]">Aucun remplaçant</span>
                    ) : (
                      subs.slice(0, 5).map((rawSub, i) => {
                        const pid = typeof rawSub === 'object' ? (rawSub?.player_id || rawSub?.id) : rawSub;
                        const p = getPlayer(pid);
                        const subJersey = p?.jersey_number ?? (typeof rawSub === 'object' ? (rawSub.jersey_number || rawSub.number) : null) ?? (12 + i);
                        const subName = p ? getPlayerShortName(pid) : (typeof rawSub === 'object' ? (rawSub.full_name || rawSub.name) : 'Remplaçant');
                        const isSubHovered = hoveredPlayerKey === `sub-home-${i}`;
                        const subStats = isSubHovered ? getPlayerHoverStats(rawSub, 'SUB', true, false, i, subJersey) : null;

                        return (
                          <div
                            key={i}
                            onMouseEnter={() => setHoveredPlayerKey(`sub-home-${i}`)}
                            onMouseLeave={() => setHoveredPlayerKey(null)}
                            className="relative flex items-center gap-1.5 truncate text-slate-300 hover:text-white cursor-pointer transition-colors"
                          >
                            <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden border border-slate-600 shrink-0 flex items-center justify-center">
                              {p?.photo_url && p.photo_url !== 'null' ? (
                                <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[8px] font-bold text-slate-400">{String(subJersey)}</span>
                              )}
                            </div>
                            <span className="text-emerald-400 font-bold">{String(subJersey)}.</span>
                            <span className="truncate uppercase text-[8px]">{String(subName)}</span>

                            <AnimatePresence>
                              {isSubHovered && subStats && (
                                <PlayerPitchHoverCard
                                  stats={subStats}
                                  placement="top"
                                  horizontalAlign="left"
                                />
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    )
                  ) : (
                    (opponentSubs.length > 0 ? opponentSubs : ['12', '14', '18', '21', '24']).slice(0, 5).map((rawOppSub, i) => {
                      const num = typeof rawOppSub === 'object' ? (rawOppSub.jersey_number || rawOppSub.number || (12 + i)) : String(rawOppSub);
                      const isOppSubHovered = hoveredPlayerKey === `sub-home-${i}`;
                      const oppSubStats = isOppSubHovered ? getPlayerHoverStats(rawOppSub, 'SUB', false, false, i, num) : null;

                      return (
                        <div
                          key={i}
                          onMouseEnter={() => setHoveredPlayerKey(`sub-home-${i}`)}
                          onMouseLeave={() => setHoveredPlayerKey(null)}
                          className="relative flex items-center gap-1.5 truncate text-slate-300 hover:text-white cursor-pointer transition-colors"
                        >
                          <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden border border-slate-700 shrink-0 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-rose-400">{String(num)}</span>
                          </div>
                          <span className="text-rose-400 font-bold">{String(num)}.</span>
                          <span className="truncate uppercase text-[8px]">Adv #{String(num)}</span>

                          <AnimatePresence>
                            {isOppSubHovered && oppSubStats && (
                              <PlayerPitchHoverCard
                                stats={oppSubStats}
                                placement="top"
                                horizontalAlign="left"
                              />
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Away Subs */}
                <div className="space-y-1.5">
                  {!isHome ? (
                    subs.length === 0 ? (
                      <span className="text-slate-500 italic text-[7.5px]">Aucun remplaçant</span>
                    ) : (
                      subs.slice(0, 5).map((rawSub, i) => {
                        const pid = typeof rawSub === 'object' ? (rawSub?.player_id || rawSub?.id) : rawSub;
                        const p = getPlayer(pid);
                        const subJersey = p?.jersey_number ?? (typeof rawSub === 'object' ? (rawSub.jersey_number || rawSub.number) : null) ?? (12 + i);
                        const subName = p ? getPlayerShortName(pid) : (typeof rawSub === 'object' ? (rawSub.full_name || rawSub.name) : 'Remplaçant');
                        const isSubHovered = hoveredPlayerKey === `sub-away-${i}`;
                        const subStats = isSubHovered ? getPlayerHoverStats(rawSub, 'SUB', true, false, i, subJersey) : null;

                        return (
                          <div
                            key={i}
                            onMouseEnter={() => setHoveredPlayerKey(`sub-away-${i}`)}
                            onMouseLeave={() => setHoveredPlayerKey(null)}
                            className="relative flex items-center gap-1.5 truncate text-slate-400 hover:text-white cursor-pointer transition-colors"
                          >
                            <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden border border-slate-600 shrink-0 flex items-center justify-center">
                              {p?.photo_url && p.photo_url !== 'null' ? (
                                <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[8px] font-bold text-slate-400">{String(subJersey)}</span>
                              )}
                            </div>
                            <span className="text-emerald-400 font-bold">{String(subJersey)}.</span>
                            <span className="truncate uppercase text-[8px]">{String(subName)}</span>

                            <AnimatePresence>
                              {isSubHovered && subStats && (
                                <PlayerPitchHoverCard
                                  stats={subStats}
                                  placement="top"
                                  horizontalAlign="right"
                                />
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    )
                  ) : (
                    (opponentSubs.length > 0 ? opponentSubs : ['12', '14', '18', '21', '24']).slice(0, 5).map((rawOppSub, i) => {
                      const num = typeof rawOppSub === 'object' ? (rawOppSub.jersey_number || rawOppSub.number || (12 + i)) : String(rawOppSub);
                      const isOppSubHovered = hoveredPlayerKey === `sub-away-${i}`;
                      const oppSubStats = isOppSubHovered ? getPlayerHoverStats(rawOppSub, 'SUB', false, false, i, num) : null;

                      return (
                        <div
                          key={i}
                          onMouseEnter={() => setHoveredPlayerKey(`sub-away-${i}`)}
                          onMouseLeave={() => setHoveredPlayerKey(null)}
                          className="relative flex items-center gap-1.5 truncate text-slate-400 hover:text-white cursor-pointer transition-colors"
                        >
                          <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden border border-slate-700 shrink-0 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-rose-400">{String(num)}</span>
                          </div>
                          <span className="text-rose-400 font-bold">{String(num)}.</span>
                          <span className="truncate uppercase text-[8px]">Adv #{String(num)}</span>

                          <AnimatePresence>
                            {isOppSubHovered && oppSubStats && (
                              <PlayerPitchHoverCard
                                stats={oppSubStats}
                                placement="top"
                                horizontalAlign="right"
                              />
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* Modal Post-Match Video Drive */}
      <MatchDriveVideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        match={match}
        opponentName={opponentName}
        onSuccess={(newUrl) => {
          setCurrentVideoUrl(newUrl);
          if (match) (match as any).video_url = newUrl;
        }}
      />
    </motion.div>
  );
};

export default MatchOverviewPanel;
