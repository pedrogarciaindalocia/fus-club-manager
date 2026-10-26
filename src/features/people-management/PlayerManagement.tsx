import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { usePlayers } from '../../hooks/usePlayers';
import { useTeams } from '../../hooks/useTeams';
import { useClubData } from '../../hooks/useClubData';
import { useCompetitions } from '../../hooks/useCompetitions';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  UserPlus,
  Compass,
  Search,
  Trash2,
  Edit2,
  Scissors,
  Eye,
  Calendar,
  CalendarDays,
  Ruler,
  Weight,
  Footprints,
  Globe,
  User as UserIcon,
  X,
  Camera,
  LayoutGrid,
  List as ListIcon,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  BarChart3,
  Trophy,
  Clock,
  Target,
  Users,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Save,
  Loader2,
  CheckSquare,
  Star,
  GripHorizontal,
  CheckCircle2,
  NotebookPen,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Flame,
  Zap,
  Award,
  TrendingUp,
  Shield,
  Filter,
  HelpCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import type { Player, Team, Club } from '../../types';
import { storageService } from '../../services/storageService';
import { supabase } from '../../lib/supabase';
import ImageCropperModal from '../../components/ImageCropperModal';
import { MediaPickerModal } from '../media-management/components/MediaPickerModal';
import { Skeleton } from '../../components/ui/skeleton';
import { PLAYER_CATEGORIES, NATIONALITIES, PLAYER_POSITIONS, getPositionDetails, matchesPositionFilter, normalizeAgeCategory } from '../../constants';
import { useMetrics } from '../../hooks/useMetrics';

import ErrorEmptyState from '../../components/ErrorEmptyState';
import { useSurclassements, usePlayerSurclassements } from '../../hooks/useSurclassements';
import { isLowerCategory } from '../../services/surclassementService';
import SurclassementModal from './SurclassementModal';
import { usePermissions } from '../../context/PermissionsContext';
import { isScoutBranch } from '../../constants/roles';
import FeatureGate from '../../components/FeatureGate';
import { PlayerDepartureModal } from './components/PlayerDepartureModal';
import { PlayerMatchCalendarModal } from './components/PlayerMatchCalendarModal';
import { opponentPlayerService } from '../../services/opponentPlayerService';

// ─── Fake player generation utilities ────────────────────────────────────────
const _FIRST_NAMES = [
  'Yassine', 'Mehdi', 'Soufiane', 'Omar', 'Amine', 'Hamza', 'Bilal', 'Rachid',
  'Karim', 'Saad', 'Adil', 'Younes', 'Tarik', 'Zakaria', 'Hicham', 'Khalid',
  'Abdellah', 'Nabil', 'Said', 'Driss', 'Mouad', 'Ayoub', 'Reda', 'Othmane',
  'Ilyas', 'Marouane', 'Nassim', 'Walid', 'Badr', 'Sami', 'Anass', 'Imad',
  'Hakim', 'Ryad', 'Taha', 'Brahim', 'Jawad', 'Aziz', 'Salim', 'Fouad',
];
const _LAST_NAMES = [
  'Benali', 'El Amrani', 'Ouali', 'Benabdallah', 'Rami', 'Hajji', 'Benameur',
  'Zine', 'Hassani', 'El Idrissi', 'Boukhari', 'Sebari', 'Naciri', 'El Housni',
  'Khadhraoui', 'Derras', 'Benkhali', 'Lahmidi', 'Talbi', 'Bensalem', 'Arabi',
  'Mouttaki', 'Faqir', 'Cherkaoui', 'Alaoui', 'Benjelloun', 'El Khamlichi',
  'Boussairi', 'Rahimi', 'Tlemçani', 'El Yamani', 'Chaabi', 'Ghazali', 'Essafi',
];
const _POSITIONS = [
  'GK', 'GK',
  'CB', 'CB', 'CB', 'LB', 'RB',
  'CDM', 'CDM', 'CM', 'CM', 'CAM',
  'LW', 'RW', 'SS', 'ST', 'ST',
];
const _CAT_YEAR: Record<string, number> = {
  U7: 2019, U9: 2017, U11: 2015, U13: 2013, U14: 2012,
  U15: 2011, U16: 2010, U17: 2009, U18: 2008, U19: 2007, U21: 2005,
  U23: 2003, SENIOR: 1998, PRO: 1997, OTHER: 1998,
};
const _r = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const _pick = <T,>(arr: T[]): T => arr[_r(0, arr.length - 1)];
const _shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function buildFakePlayers(category: string, teamId: string) {
  const year = _CAT_YEAR[category] ?? 1998;
  const isYouth = ['U7', 'U9', 'U11'].includes(category);
  const isMid = ['U13', 'U14', 'U15', 'U16'].includes(category);
  const isAdol = ['U17', 'U19'].includes(category);
  const feet = ['right', 'right', 'right', 'left', 'left', 'both'] as const;

  // Numéros 1-99 mélangés, on prend les 22 premiers
  const jerseys = _shuffle(Array.from({ length: 99 }, (_, i) => i + 1)).slice(0, 22);
  const positions = _shuffle([..._POSITIONS]);

  // Pool de noms : toutes les combinaisons prénom+nom possibles, mélangées
  const namePool = _shuffle(
    _FIRST_NAMES.flatMap(f => _LAST_NAMES.map(l => `${f} ${l}`))
  );

  return Array.from({ length: 22 }, (_, i) => {
    const birthYear = year + _r(-1, 1);
    const birthDate = `${birthYear}-${String(_r(1, 12)).padStart(2, '0')}-${String(_r(1, 28)).padStart(2, '0')}`;
    let height: number, weight: number;
    if (isYouth) { height = _r(110, 135); weight = _r(25, 40); }
    else if (isMid) { height = _r(140, 165); weight = _r(38, 58); }
    else if (isAdol) { height = _r(160, 182); weight = _r(55, 72); }
    else { height = _r(170, 192); weight = _r(65, 85); }
    return {
      full_name: namePool[i],
      jersey_number: jerseys[i],
      position: positions[i],
      birth_date: birthDate,
      nationality: 'Maroc',
      height,
      weight,
      preferred_foot: _pick([...feet]) as 'right' | 'left' | 'both',
      photo_url: null,
      team_id: teamId,
      category: category === 'PRO' ? 'SENIOR' : category,
      is_active: true,
    };
  });
}

// ─── Planning utilities ───────────────────────────────────────────────────────
const FR_DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const FR_DAYS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const FR_MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const getWeekDays = (offset: number): string[] => {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
};

const fmtShort = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return `${FR_DAYS_SHORT[d.getDay()]} ${d.getDate()}`;
};
const fmtFull = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return `${FR_DAYS_FULL[d.getDay()]} ${d.getDate()} ${FR_MONTHS[d.getMonth()]}`;
};

type Attendance = 'present' | 'absent' | 'blesse' | 'suspendu';
interface PlanningEntry { attendance: Attendance; rating: number; notes: string; }
interface PlanningData { [playerId: string]: { [isoDate: string]: PlanningEntry } }
interface ScheduleModal { players: Player[]; days: string[]; }

const ATTENDANCE_OPTS: { value: Attendance; label: string; color: string }[] = [
  { value: 'present', label: '✅ Présent', color: 'emerald' },
  { value: 'absent', label: '❌ Absent', color: 'red' },
  { value: 'blesse', label: '🤕 Blessé', color: 'orange' },
  { value: 'suspendu', label: '🚫 Suspendu', color: 'amber' },
];

const ATTENDANCE_BG: Record<Attendance, string> = {
  present: 'bg-emerald-500',
  absent: 'bg-red-500',
  blesse: 'bg-orange-500',
  suspendu: 'bg-amber-500',
};

const getPositionInfo = (position: string | undefined | null) => getPositionDetails(position);

const IndicatorHelpTooltip: React.FC<{ title: string; role: string; metric: string }> = ({ title, role, metric }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="w-5 h-5 rounded-full bg-slate-100 hover:bg-primary/10 text-slate-400 hover:text-primary transition-colors flex items-center justify-center text-[10px] font-black border border-slate-200/80 shadow-xs focus:outline-none cursor-pointer"
        title="Rôle de cet indicateur"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="absolute z-50 left-0 top-full mt-2 w-64 sm:w-72 p-3.5 bg-slate-950/95 backdrop-blur-md text-white rounded-2xl shadow-2xl text-[11px] border border-slate-700/80 pointer-events-auto transition-all animate-in fade-in-50 zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-black text-primary uppercase text-[10px] tracking-wider">{title}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase">{metric}</span>
            </div>
            <p className="text-slate-300 leading-relaxed font-medium">
              <strong className="text-white font-bold">Rôle de l'indicateur : </strong>
              {role}
            </p>
          </div>
          {/* Tooltip caret pointing up */}
          <div className="absolute bottom-full left-2.5 -mb-px border-4 border-transparent border-b-slate-950/95" />
        </div>
      )}
    </div>
  );
};

const PlayerManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authState, hasSubModuleAccess, canManageCategory } = usePermissions();
  const currentRole = authState.user?.system_role?.toLowerCase() || (authState.roles?.[0]?.toLowerCase() ?? '');
  const isScout = isScoutBranch(currentRole, authState.user?.job_title);

  // Permissions dynamiques RBAC (US-DASH-52 & US-DASH-57)
  const canCreatePlayer = hasSubModuleAccess('players', 'create');
  const canUpdatePlayer = hasSubModuleAccess('players', 'update');
  const canDeletePlayer = hasSubModuleAccess('players', 'delete');
  const canViewStats = hasSubModuleAccess('players', 'stats');
  const canSurclassPlayer = hasSubModuleAccess('players', 'surclasser');
  const canDeparturePlayer = hasSubModuleAccess('players', 'departure');

  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [isDeletingPlayer, setIsDeletingPlayer] = useState(false);

  const { players, isLoading: playersLoading, isError: playersError, addPlayer, updatePlayer, deletePlayer, bulkDeletePlayers, isBulkDeleting, bulkAddPlayers, isBulkAdding } = usePlayers();
  const { teams, isLoading: teamsLoading, isError: teamsError } = useTeams();

  // Helper centralisé pour calculer l'âge
  const calculateAge = (dob: string | null | undefined): number => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const difference = Date.now() - birthDate.getTime();
    return Math.abs(new Date(difference).getUTCFullYear() - 1970);
  };

  // Helper centralisé et infaillible pour résoudre la catégorie officielle d'un joueur
  const getPlayerCategory = (player: Player | null | undefined): string => {
    if (!player) return 'SENIOR';
    const team = teams.find(t => t.id === player.team_id);
    if (team?.category) return team.category;
    if ((player as any).category) return (player as any).category;
    if (player.birth_date) {
      const age = calculateAge(player.birth_date);
      if (age <= 13) return 'U13';
      if (age <= 15) return 'U15';
      if (age <= 17) return 'U17';
      if (age <= 19) return 'U19';
      if (age <= 21) return 'U21';
      if (age <= 23) return 'U23';
    }
    return 'SENIOR';
  };

  const handleConfirmDeletePlayer = async () => {
    if (!playerToDelete) return;
    const playerCategory = getPlayerCategory(playerToDelete);
    if (!canDeletePlayer || !canManageCategory(playerCategory)) {
      toast.error(`Suppression non autorisée : ce joueur appartient à la catégorie ${playerCategory}. Vos droits de gestion sont réservés à vos catégories assignées.`);
      return;
    }
    try {
      setIsDeletingPlayer(true);
      await deletePlayer(playerToDelete.id);
      toast.success(`Joueur ${playerToDelete.full_name} supprimé définitivement avec succès.`);
      setPlayerToDelete(null);
    } catch (err: any) {
      toast.error(`Erreur lors de la suppression : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setIsDeletingPlayer(false);
    }
  };

  // Catégories / équipes autorisées pour l'utilisateur (selon ses catégories assignées)
  const allowedCategories = useMemo<string[]>(
    () => [...PLAYER_CATEGORIES, 'PRO'].filter(cat => canManageCategory(cat)),
    [canManageCategory, authState.userCategories]
  );
  const allowedTeams = useMemo(
    () => teams.filter(t => canManageCategory(t.category)),
    [teams, canManageCategory, authState.userCategories]
  );
  const defaultCategory = (allowedCategories[0] || 'U13') as any;

  // Catégories visibles dans les filtres : Strictement limité aux catégories autorisées
  const visibleFilterCategories = useMemo(() => {
    if (authState.userCategories && authState.userCategories.length > 0) {
      return allowedCategories.length === 1 ? allowedCategories : ['ALL', ...allowedCategories];
    }
    return ['ALL', ...PLAYER_CATEGORIES];
  }, [allowedCategories, authState.userCategories]);

  const { mainClub, opponentClubs = [], isLoading: clubLoading } = useClubData();
  const [departurePlayer, setDeparturePlayer] = useState<Player | null>(null);
  const [departureModalOpen, setDepartureModalOpen] = useState(false);

  const handleOpenDeparture = (player: Player) => {
    const playerCategory = getPlayerCategory(player);
    if (!canDeparturePlayer || !canManageCategory(playerCategory)) {
      toast.error(`Action non autorisée : le joueur ${player.full_name} (${playerCategory}) est hors de vos catégories assignées. Consultation seule.`);
      return;
    }
    setDeparturePlayer(player);
    setDepartureModalOpen(true);
  };

  const handleConfirmTransfer = async (player: Player, targetClub: Club) => {
    const playerCategory = getPlayerCategory(player);
    if (!canDeparturePlayer || !canManageCategory(playerCategory)) {
      toast.error(`Transfert non autorisé pour la catégorie ${playerCategory}.`);
      return;
    }
    await opponentPlayerService.addOpponentPlayer({
      opponent_id: targetClub.id,
      full_name: player.full_name,
      jersey_number: player.jersey_number ?? null,
      position: player.position ?? null,
      category: playerCategory,
      height: player.height ?? null,
      weight: player.weight ?? null,
      preferred_foot: player.preferred_foot === 'right' ? 'Droit' : player.preferred_foot === 'left' ? 'Gauche' : player.preferred_foot || 'Droit',
      nationality: player.nationality || 'Maroc',
      photo_url: player.photo_url || null,
    });
    await deletePlayer(player.id);
    toast.success(`Joueur ${player.full_name} transféré vers ${targetClub.name} avec succès !`);
  };

  const handleConfirmArchive = async (player: Player) => {
    const playerCategory = getPlayerCategory(player);
    if (!canDeparturePlayer || !canManageCategory(playerCategory)) {
      toast.error(`Archivage non autorisé pour la catégorie ${playerCategory}.`);
      return;
    }
    const nameParts = player.full_name.trim().split(' ');
    const firstName = nameParts[0] || player.full_name;
    const lastName = nameParts.slice(1).join(' ') || player.full_name;

    // Fetch player stats from match_events before archiving
    let matchesCount = 0;
    let goalsCount = 0;
    let assistsCount = 0;
    let yellowCardsCount = 0;
    let redCardsCount = 0;

    try {
      const { data: events } = await supabase
        .from('match_events')
        .select('*')
        .eq('player_id', player.id);

      if (events) {
        goalsCount = events.filter((e: any) => e.type === 'goal').length;
        assistsCount = events.filter((e: any) => e.type === 'goal' && e.related_player_id === player.id).length;
        yellowCardsCount = events.filter((e: any) => e.type === 'yellow_card').length;
        redCardsCount = events.filter((e: any) => e.type === 'red_card').length;
      }

      const { data: playerMatches } = await supabase
        .from('matches')
        .select('id, lineup')
        .eq('status', 'finished');

      if (playerMatches) {
        matchesCount = playerMatches.filter((m: any) => {
          if (!m.lineup) return false;
          const lineupArray = Array.isArray(m.lineup) ? m.lineup : [];
          return lineupArray.some((item: any) =>
            item === player.id || item?.id === player.id || item?.jersey_number === player.jersey_number
          );
        }).length;
      }
    } catch (err) {
      console.error('Error fetching player stats for archiving:', err);
    }

    await deletePlayer(player.id);
    toast.success(`Joueur ${player.full_name} retiré du roster FUS et archivé avec toutes ses données & statistiques.`);
  };
  const {
    activeByPlayerId,
    createSurclassement,
    isCreating: isSurclassing,
    revertSurclassement,
    isReverting,
  } = useSurclassements();

  const queryClient = useQueryClient();

  // ─── Generate fake players ────────────────────────────────────────────────
  const [genModal, setGenModal] = useState(false);
  const [genCategory, setGenCategory] = useState('');
  const [genTeamId, setGenTeamId] = useState('');
  const [genProgress, setGenProgress] = useState(0);
  const [genRunning, setGenRunning] = useState(false);

  const genTeams = useMemo(
    () => teams.filter(t => t.category === genCategory),
    [teams, genCategory],
  );

  const handleGenerateFakePlayers = async () => {
    if (!genTeamId || !genCategory) return;

    // Vérification session Supabase
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      toast.error('Session expirée — veuillez vous reconnecter (Déconnexion → reconnexion)');
      return;
    }

    setGenRunning(true);
    setGenProgress(0);

    // Progression animée pendant l'insert bulk
    const timer = setInterval(() => {
      setGenProgress(p => (p < 21 ? p + 1 : p));
    }, 120);

    try {
      if (!canManageCategory(genCategory)) {
        clearInterval(timer);
        setGenRunning(false);
        toast.error(`Catégorie ${genCategory} non autorisée pour votre compte.`);
        return;
      }
      const fakePlayers = buildFakePlayers(genCategory, genTeamId);
      await bulkAddPlayers(fakePlayers as any);
      clearInterval(timer);
      setGenProgress(22);
      setTimeout(() => {
        setGenModal(false);
        setGenCategory('');
        setGenTeamId('');
        setGenRunning(false);
        setGenProgress(0);
      }, 600);
    } catch (err: any) {
      clearInterval(timer);
      toast.error(`Erreur génération : ${err.message}`);
      setGenRunning(false);
      setGenProgress(0);
    }
  };

  // Surclassement modal state
  const [surclassementPlayer, setSurclassementPlayer] = useState<Player | null>(null);
  const [calendarModalPlayer, setCalendarModalPlayer] = useState<Player | null>(null);

  const handleOpenSurclassement = (player: Player) => {
    const playerCategory = getPlayerCategory(player);
    if (!canSurclassPlayer || !canManageCategory(playerCategory)) {
      toast.error(`Surclassement non autorisé : ce joueur appartient à la catégorie ${playerCategory}. Vos droits sont limités à vos catégories assignées.`);
      return;
    }
    setSurclassementPlayer(player);
  };
  const handleCloseSurclassement = () => setSurclassementPlayer(null);

  // Settings sync
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>((mainClub?.preferred_view_mode as 'grid' | 'list') || 'list');
  const [pageSize, setPageSize] = useState(mainClub?.pagination_limit || 10);
  const [currentPage, setCurrentPage] = useState(1);

  React.useEffect(() => {
    if (mainClub?.preferred_view_mode) setDisplayMode(mainClub.preferred_view_mode as 'grid' | 'list');
    if (mainClub?.pagination_limit) setPageSize(mainClub.pagination_limit);
  }, [mainClub]);

  const isLoading = playersLoading || teamsLoading || clubLoading;
  const isError = playersError || teamsError;

  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>(() => {
    const cat = new URLSearchParams(window.location.search).get('category');
    return cat ? cat.toUpperCase() : 'ALL';
  });
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      setCategoryFilter(cat.toUpperCase());
    } else if (authState.userCategories && authState.userCategories.length === 1) {
      setCategoryFilter(normalizeAgeCategory(authState.userCategories[0]));
    }
  }, [searchParams, authState.userCategories]);

  const [viewState, setViewState] = useState<'LIST' | 'FORM' | 'VIEW' | 'STATS' | 'PLANNING' | 'BULK_ADD'>('LIST');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  // Multi-sélection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Postes dynamiques configurés dans Paramètres / Gestion des critères
  const { positions: dynamicPositions } = useMetrics();
  const availablePositions = React.useMemo(() => {
    if (dynamicPositions && dynamicPositions.length > 0) {
      const list: Array<{ code: string; label: string; emoji: string }> = [];
      dynamicPositions.forEach(p => {
        if (p.code === 'RB/LB' || p.id === 'RB_LB') {
          if (!list.some(x => x.code === 'RB')) {
            list.push({ code: 'RB', label: 'Latéral droit', emoji: p.emoji || '🛡️' });
          }
          if (!list.some(x => x.code === 'LB')) {
            list.push({ code: 'LB', label: 'Latéral gauche', emoji: p.emoji || '🛡️' });
          }
        } else {
          list.push({
            code: p.code,
            label: p.name,
            emoji: p.emoji || '👤'
          });
        }
      });
      // Garantir la présence de RB et LB comme sélections autonomes
      if (!list.some(p => p.code === 'RB')) {
        list.splice(2, 0, { code: 'RB', label: 'Latéral droit', emoji: '🛡️' });
      }
      if (!list.some(p => p.code === 'LB')) {
        list.splice(2, 0, { code: 'LB', label: 'Latéral gauche', emoji: '🛡️' });
      }
      return list;
    }
    return PLAYER_POSITIONS.map(p => ({
      code: p.code,
      label: p.label,
      emoji: ''
    }));
  }, [dynamicPositions]);

  // Bulk add
  type BulkRow = {
    id: string; full_name: string; jersey_number: number; position: string;
    birth_date: string; nationality: string; team_id: string; category: string;
    photo_url: string; uploading: boolean;
  };

  const getActiveBulkCategory = (): string => {
    if (categoryFilter && categoryFilter !== 'ALL' && allowedCategories.includes(categoryFilter)) {
      return categoryFilter;
    }
    return defaultCategory || allowedCategories[0] || 'SENIOR';
  };

  const newBulkRow = (idx: number, catOverride?: string): BulkRow => {
    const activeCat = catOverride || getActiveBulkCategory();
    const matchingTeam = teams.find(t => t.category === activeCat) || allowedTeams[0];
    return {
      id: crypto.randomUUID(), full_name: '', jersey_number: players.length + idx + 1,
      position: 'FW', birth_date: '2012-01-01', nationality: 'Maroc',
      team_id: matchingTeam?.id || '',
      category: activeCat,
      photo_url: '', uploading: false,
    };
  };
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([newBulkRow(0)]);
  const updateBulkRow = (id: string, field: keyof BulkRow, value: any) =>
    setBulkRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  const removeBulkRow = (id: string) => setBulkRows(prev => prev.filter(r => r.id !== id));
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [bulkSaveProgress, setBulkSaveProgress] = useState(0);
  const [bulkSavedCount, setBulkSavedCount] = useState(0);
  const [bulkTotalCount, setBulkTotalCount] = useState(0);

  const handleBulkPhotoUpload = async (rowId: string, file: File) => {
    updateBulkRow(rowId, 'uploading', true);
    try {
      const url = await storageService.uploadFile(file, 'players');
      updateBulkRow(rowId, 'photo_url', url);
    } catch { toast.error('Erreur upload photo'); }
    finally { updateBulkRow(rowId, 'uploading', false); }
  };

  const handleBulkSave = async () => {
    if (!canCreatePlayer) {
      toast.error("Création de joueur non autorisée.");
      return;
    }
    const valid = bulkRows.filter(r => r.full_name.trim());
    if (!valid.length) { toast.error('Remplissez au moins un nom'); return; }
    const unauthorized = valid.some(r => !canManageCategory(r.category));
    if (unauthorized) {
      toast.error("Vous ne pouvez créer des joueurs que dans vos catégories assignées.");
      return;
    }

    const payload = valid.map(({ id, uploading, ...r }) => ({
      ...r,
      jersey_number: Number(r.jersey_number),
      team_id: r.team_id || null,
      birth_date: r.birth_date || null,
      category: r.category === 'PRO' ? 'SENIOR' : r.category,
      preferred_foot: 'right' as const,
      photo_url: r.photo_url || null, height: null, weight: null,
    }));

    setIsBulkSaving(true);
    setBulkSaveProgress(10);
    setBulkSavedCount(0);
    setBulkTotalCount(valid.length);

    try {
      const chunkSize = 5;
      const chunks: typeof payload[] = [];
      for (let i = 0; i < payload.length; i += chunkSize) {
        chunks.push(payload.slice(i, i + chunkSize));
      }

      let saved = 0;
      for (let i = 0; i < chunks.length; i++) {
        await bulkAddPlayers(chunks[i] as any);
        saved += chunks[i].length;
        setBulkSavedCount(saved);
        const pct = Math.min(95, Math.round((saved / payload.length) * 100));
        setBulkSaveProgress(pct);
        if (chunks.length > 1) {
          await new Promise(r => setTimeout(r, 120));
        }
      }

      setBulkSaveProgress(100);
      setBulkSavedCount(payload.length);
      toast.success(`${payload.length} joueur${payload.length > 1 ? 's' : ''} enregistré${payload.length > 1 ? 's' : ''} avec succès !`);

      setTimeout(() => {
        setIsBulkSaving(false);
        setBulkSaveProgress(0);
        setBulkSavedCount(0);
        setBulkTotalCount(0);
        const activeCat = getActiveBulkCategory();
        setBulkRows([newBulkRow(0, activeCat)]);
        setViewState('LIST');
      }, 500);
    } catch (err: any) {
      setIsBulkSaving(false);
      toast.error(`Erreur lors de l'enregistrement : ${err.message || 'Erreur inconnue'}`);
    }
  };
  const [isUploading, setIsUploading] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'photo_url' | 'celebration_photo_url'>('photo_url');
  const [cropTarget, setCropTarget] = useState<'photo_url' | 'celebration_photo_url'>('photo_url');
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);

  // Player Stats State
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const { leagues } = useCompetitions();
  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState('ALL');
  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState('ALL');
  const [selectedMatchFilter, setSelectedMatchFilter] = useState('ALL');
  const [evalSeasonFilter, setEvalSeasonFilter] = useState('ALL');
  const [evalMonthFilter, setEvalMonthFilter] = useState('ALL');
  const [evalTypeFilter, setEvalTypeFilter] = useState<'ALL' | 'FRIENDLY' | 'OFFICIAL'>('ALL');
  const [rawPlayerEvents, setRawPlayerEvents] = useState<any[]>([]);
  const [rawPlayerMatches, setRawPlayerMatches] = useState<any[]>([]);

  const { participatedMatches, participatedLeagues, participatedSeasons, hasFriendlyMatches } = useMemo(() => {
    if (!rawPlayerMatches || !selectedPlayer) return { participatedMatches: [], participatedLeagues: [], participatedSeasons: [], hasFriendlyMatches: false };

    const pMatches: any[] = [];
    const leagueIds = new Set<string>();
    let hasFriendlies = false;

    rawPlayerMatches.forEach(m => {
      const lineup = m.lineup as any;
      const mpRecord = m.match_players?.find((p: any) => p.player_id === selectedPlayer.id);
      const isStarter = mpRecord?.is_starting || lineup?.startingXI?.includes(selectedPlayer.id);
      const isSub = (mpRecord && !mpRecord.is_starting) || lineup?.substitutes?.includes(selectedPlayer.id);
      const hasEvent = rawPlayerEvents?.some((e: any) => e.match_id === m.id);

      if (isStarter || isSub || hasEvent) {
        pMatches.push(m);
        if (m.league_id) {
          leagueIds.add(m.league_id);
        } else {
          hasFriendlies = true;
        }
      }
    });

    const pLeagues = leagues?.filter((l: any) => leagueIds.has(l.id)) || [];
    const seasons = new Set<string>();
    pLeagues.forEach(l => { if (l.season) seasons.add(l.season) });

    return {
      participatedMatches: pMatches,
      participatedLeagues: pLeagues,
      participatedSeasons: Array.from(seasons),
      hasFriendlyMatches: hasFriendlies
    };
  }, [rawPlayerMatches, rawPlayerEvents, selectedPlayer, leagues]);

  const computedPlayerStats = useMemo(() => {
    if (!rawPlayerEvents && !rawPlayerMatches) return null;

    let eventsToUse = rawPlayerEvents || [];
    let matchesToUse = rawPlayerMatches || [];

    if (selectedSeasonFilter !== 'ALL') {
      const validLeagueIds = leagues?.filter(l => l.season === selectedSeasonFilter).map(l => l.id) || [];
      matchesToUse = matchesToUse.filter(m => validLeagueIds.includes(m.league_id));
    }

    if (selectedLeagueFilter === 'FRIENDLY') {
      matchesToUse = matchesToUse.filter(m => !m.league_id || m.category?.toLowerCase().includes('amical') || m.notes?.toLowerCase().includes('amical'));
    } else if (selectedLeagueFilter === 'OFFICIAL') {
      matchesToUse = matchesToUse.filter(m => !!m.league_id && !m.category?.toLowerCase().includes('amical'));
    } else if (selectedLeagueFilter !== 'ALL') {
      matchesToUse = matchesToUse.filter(m => m.league_id === selectedLeagueFilter);
    }

    if (selectedMatchFilter !== 'ALL') {
      matchesToUse = matchesToUse.filter(m => m.id === selectedMatchFilter);
    }

    const validMatchIds = new Set(matchesToUse.map(m => m.id));
    eventsToUse = eventsToUse.filter(e => validMatchIds.has(e.match_id));

    let matchesPlayed = 0;
    let startsCount = 0;
    let subsCount = 0;
    let minutesPlayed = 0;

    matchesToUse.forEach(match => {
      const lineup = match.lineup as { startingXI?: string[]; substitutes?: string[] } | null;
      const mpRecord = (match as any).match_players?.find((p: any) => p.player_id === selectedPlayer?.id);
      const isStarter = mpRecord?.is_starting || lineup?.startingXI?.includes(selectedPlayer?.id);
      const isSub = (mpRecord && !mpRecord.is_starting) || lineup?.substitutes?.includes(selectedPlayer?.id);
      const hasEvent = eventsToUse?.some((e: any) => e.match_id === match.id);

      if (isStarter || isSub || hasEvent) {
        matchesPlayed++;
        const matchDuration = (match.half_duration_minutes || 45) * 2;
        if (isStarter) {
          startsCount++;
          minutesPlayed += matchDuration;
        } else if (isSub) {
          subsCount++;
          minutesPlayed += 30;
        } else {
          minutesPlayed += 20;
        }
      }
    });

    eventsToUse.forEach((e: any) => {
      if (e.type === 'substitution') {
        if (e.player_id === selectedPlayer?.id) {
          minutesPlayed -= 15;
        } else if (e.related_player_id === selectedPlayer?.id) {
          minutesPlayed += 15;
        }
      }
    });

    const goals = eventsToUse.filter((e: any) => e.type === 'goal' && e.player_id === selectedPlayer?.id).length || 0;
    const assists = eventsToUse.filter((e: any) =>
      e.type === 'assist' || (e.type === 'goal' && e.related_player_id === selectedPlayer?.id)
    ).length || 0;
    const yellowCards = eventsToUse.filter((e: any) => e.type === 'yellow_card' && e.player_id === selectedPlayer?.id).length || 0;
    const redCards = eventsToUse.filter((e: any) => e.type === 'red_card' && e.player_id === selectedPlayer?.id).length || 0;
    const substitutions = eventsToUse.filter((e: any) => e.type === 'substitution').length || 0;

    return {
      matches: matchesPlayed,
      starts: startsCount,
      subs: subsCount,
      minutes: Math.max(0, minutesPlayed),
      goals,
      assists,
      yellowCards,
      redCards,
      substitutions,
      totalContributions: goals + assists,
      avgMinutes: matchesPlayed > 0 ? Math.round(Math.max(0, minutesPlayed) / matchesPlayed) : 0,
      starterRate: matchesPlayed > 0 ? Math.round((startsCount / matchesPlayed) * 100) : 0,
    };
  }, [rawPlayerEvents, rawPlayerMatches, selectedSeasonFilter, selectedLeagueFilter, selectedMatchFilter, leagues, selectedPlayer]);

  const displayStats = computedPlayerStats || playerStats;

  // ── Évaluations de tous les matchs (amicaux & officiels) pour le joueur ──
  const evaluatedMatches = useMemo(() => {
    if (!rawPlayerMatches || !selectedPlayer) return [];
    return rawPlayerMatches
      .filter((m: any) => {
        const mpRecord = (m as any).match_players?.find((p: any) => p.player_id === selectedPlayer.id);
        return mpRecord && mpRecord.rating != null;
      })
      .map((m: any) => {
        const mpRecord = (m as any).match_players?.find((p: any) => p.player_id === selectedPlayer.id);
        const lg = leagues?.find((l: any) => l.id === m.league_id);
        const season = lg?.season || (m.match_date ? `${new Date(m.match_date).getFullYear()}` : '2025');
        const opp = opponentClubs.find((c: any) => c.id === m.opponent_id);
        const isFriendly = !m.league_id || m.category?.toLowerCase().includes('amical') || m.notes?.toLowerCase().includes('amical') || (lg?.name && lg.name.toLowerCase().includes('amical'));
        return {
          ...m,
          isFriendly,
          rating: Number(mpRecord.rating),
          ratingComment: mpRecord.rating_comment,
          season,
          opponentName: opp?.name || 'Adversaire',
          leagueName: isFriendly ? 'Match Amical' : (lg?.name || 'Compétition Officielle'),
        };
      });
  }, [rawPlayerMatches, selectedPlayer, leagues, opponentClubs]);

  const availableEvalSeasons = useMemo(() => {
    const s = new Set<string>();
    evaluatedMatches.forEach(m => { if (m.season) s.add(m.season); });
    return Array.from(s).sort();
  }, [evaluatedMatches]);

  const availableEvalMonths = useMemo(() => {
    const mSet = new Set<string>();
    evaluatedMatches.forEach(m => {
      if (m.match_date && m.match_date.length >= 7) mSet.add(m.match_date.slice(5, 7));
    });
    return Array.from(mSet).sort();
  }, [evaluatedMatches]);

  const filteredEvaluatedMatches = useMemo(() => {
    return evaluatedMatches.filter(m => {
      if (evalSeasonFilter !== 'ALL' && m.season !== evalSeasonFilter) return false;
      if (evalMonthFilter !== 'ALL' && m.match_date?.slice(5, 7) !== evalMonthFilter) return false;
      if (evalTypeFilter === 'FRIENDLY' && !m.isFriendly) return false;
      if (evalTypeFilter === 'OFFICIAL' && m.isFriendly) return false;
      return true;
    }).sort((a, b) => (a.match_date || '').localeCompare(b.match_date || ''));
  }, [evaluatedMatches, evalSeasonFilter, evalMonthFilter, evalTypeFilter]);

  const evalKPIs = useMemo(() => {
    if (filteredEvaluatedMatches.length === 0) {
      return { avg: '-', max: '-', min: '-', count: 0 };
    }
    const ratings = filteredEvaluatedMatches.map(m => m.rating);
    const avg = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
    const max = Math.max(...ratings).toFixed(1);
    const min = Math.min(...ratings).toFixed(1);
    return { avg, max, min, count: filteredEvaluatedMatches.length };
  }, [filteredEvaluatedMatches]);

  const evalChartData = useMemo(() => {
    return filteredEvaluatedMatches.map((m, idx) => {
      const d = m.match_date ? new Date(m.match_date) : null;
      const dateFormatted = d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : `M${idx + 1}`;
      return {
        name: `${dateFormatted} vs ${m.opponentName}`,
        date: dateFormatted,
        fullDate: m.match_date,
        opponent: m.opponentName,
        rating: m.rating,
        comment: m.ratingComment,
        isFriendly: m.isFriendly,
        leagueName: m.leagueName,
        score: `${m.is_home ? m.score_home : m.score_away} - ${m.is_home ? m.score_away : m.score_home}`,
      };
    });
  }, [filteredEvaluatedMatches]);

  const MONTH_LABELS: Record<string, string> = {
    '01': 'Janvier', '02': 'Février', '03': 'Mars', '04': 'Avril',
    '05': 'Mai', '06': 'Juin', '07': 'Juillet', '08': 'Août',
    '09': 'Septembre', '10': 'Octobre', '11': 'Novembre', '12': 'Décembre',
  };

  const filteredPlayerMatches = useMemo(() => {
    if (!selectedPlayer || !rawPlayerMatches) return [];

    return rawPlayerMatches
      .filter((m: any) => {
        const lineup = m.lineup as { startingXI?: string[]; substitutes?: string[] } | null;
        const mpRecord = (m as any).match_players?.find((p: any) => p.player_id === selectedPlayer.id);
        const isStarter = mpRecord?.is_starting || lineup?.startingXI?.includes(selectedPlayer.id);
        const isSub = (mpRecord && !mpRecord.is_starting) || lineup?.substitutes?.includes(selectedPlayer.id);
        const hasEvent = rawPlayerEvents?.some((e: any) => e.match_id === m.id);

        if (!isStarter && !isSub && !hasEvent) return false;

        if (selectedSeasonFilter !== 'ALL') {
          const lg = leagues?.find((l: any) => l.id === m.league_id);
          if (lg?.season !== selectedSeasonFilter) return false;
        }

        if (selectedLeagueFilter === 'FRIENDLY') {
          const isFriendly = !m.league_id || m.category?.toLowerCase().includes('amical') || m.notes?.toLowerCase().includes('amical');
          if (!isFriendly) return false;
        } else if (selectedLeagueFilter === 'OFFICIAL') {
          const isOfficial = !!m.league_id && !m.category?.toLowerCase().includes('amical');
          if (!isOfficial) return false;
        } else if (selectedLeagueFilter !== 'ALL' && m.league_id !== selectedLeagueFilter) {
          return false;
        }

        if (selectedMatchFilter !== 'ALL' && m.id !== selectedMatchFilter) {
          return false;
        }

        return true;
      })
      .sort((a: any, b: any) => new Date(b.match_date || 0).getTime() - new Date(a.match_date || 0).getTime());
  }, [rawPlayerMatches, rawPlayerEvents, selectedPlayer, selectedSeasonFilter, selectedLeagueFilter, selectedMatchFilter, leagues]);

  // Planning State
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [scheduleModal, setScheduleModal] = useState<ScheduleModal | null>(null);
  const [planningData, setPlanningData] = useState<PlanningData>(() => {
    try { return JSON.parse(localStorage.getItem('fus_planning') || '{}'); }
    catch { return {}; }
  });
  const [modalForms, setModalForms] = useState<Record<string, PlanningEntry>>({});

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);

  const toggleDay = (day: string) =>
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const openScheduleModal = (player: Player, adjPlayer: Player | undefined, days: string[]) => {
    const players = [player, adjPlayer].filter(Boolean) as Player[];
    const initForms: Record<string, PlanningEntry> = {};
    players.forEach(p => {
      initForms[p.id] = planningData[p.id]?.[days[0]] || { attendance: 'present', rating: 0, notes: '' };
    });
    setModalForms(initForms);
    setScheduleModal({ players, days });
  };

  const handleSavePlanning = () => {
    if (!scheduleModal) return;
    const updated = { ...planningData };
    scheduleModal.players.forEach(p => {
      if (!updated[p.id]) updated[p.id] = {};
      scheduleModal.days.forEach(day => {
        updated[p.id][day] = modalForms[p.id] || { attendance: 'present', rating: 0, notes: '' };
      });
    });
    setPlanningData(updated);
    localStorage.setItem('fus_planning', JSON.stringify(updated));
    setScheduleModal(null);
    setSelectedDays([]);
    toast.success('Planning enregistré !');
  };

  const updateModalForm = (playerId: string, field: keyof PlanningEntry, value: any) =>
    setModalForms(prev => ({ ...prev, [playerId]: { ...prev[playerId], [field]: value } }));

  // Navigation functions for player details
  const goToNextPlayer = () => {
    if (!selectedPlayer || filteredPlayers.length <= 1) return;
    const currentIndex = filteredPlayers.findIndex(p => p.id === selectedPlayer.id);
    const nextIndex = (currentIndex + 1) % filteredPlayers.length;
    const nextPlayer = filteredPlayers[nextIndex];
    if (viewState === 'VIEW') {
      handleViewPlayer(nextPlayer);
    } else if (viewState === 'STATS') {
      handleViewStats(nextPlayer);
    }
  };

  const goToPreviousPlayer = () => {
    if (!selectedPlayer || filteredPlayers.length <= 1) return;
    const currentIndex = filteredPlayers.findIndex(p => p.id === selectedPlayer.id);
    const prevIndex = currentIndex === 0 ? filteredPlayers.length - 1 : currentIndex - 1;
    const prevPlayer = filteredPlayers[prevIndex];
    if (viewState === 'VIEW') {
      handleViewPlayer(prevPlayer);
    } else if (viewState === 'STATS') {
      handleViewStats(prevPlayer);
    }
  };

  // Form State
  const [formData, setFormData] = useState<Partial<Player> & { category?: string }>({
    full_name: '',
    jersey_number: 1,
    position: 'FW',
    birth_date: '2010-01-01',
    nationality: 'Maroc',
    height: 160,
    weight: 50,
    preferred_foot: 'right',
    photo_url: '',
    celebration_photo_url: '',
    category: 'U13',
    team_id: ''
  });

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      // 1. Recherche texte
      const matchesSearch = p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.jersey_number !== undefined && p.jersey_number !== null && p.jersey_number.toString().includes(searchQuery));

      // 2. Filtrer par poste
      const matchesPosition = matchesPositionFilter(p.position, positionFilter);

      // 3. Filtrer par catégorie selon le sélecteur :
      // RÈGLE STRICTE : Si l'utilisateur possède des catégories assignées,
      // SEULES ces catégories sont visibles ("ne m'affiche pas les autres").
      const playerCategory = getPlayerCategory(p);
      if (!canManageCategory(playerCategory)) {
        return false;
      }

      const matchesCategory = categoryFilter === 'ALL' || normalizeAgeCategory(playerCategory || '') === categoryFilter.toUpperCase();

      return matchesSearch && matchesPosition && matchesCategory;
    });
  }, [players, searchQuery, positionFilter, categoryFilter, teams, canManageCategory]);

  const paginatedPlayers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPlayers.slice(start, start + pageSize);
  }, [filteredPlayers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredPlayers.length / pageSize);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, positionFilter, categoryFilter, pageSize]);

  // Auto-select team when category changes if there's only one team for that category
  React.useEffect(() => {
    if (viewState === 'FORM' && formData.category) {
      const matchingTeams = teams.filter(t => t.category === formData.category);
      if (matchingTeams.length === 1 && !formData.team_id) {
        setFormData(prev => ({ ...prev, team_id: matchingTeams[0].id }));
      }
    }
  }, [formData.category, teams, viewState]);

  const handleOpenEdit = (player: Player) => {
    if (!canUpdatePlayer) {
      toast.error("Modification de l'effectif officiel non autorisée.");
      return;
    }
    const playerCategory = getPlayerCategory(player);
    if (!canManageCategory(playerCategory)) {
      toast.error(`Accès restreint : le joueur ${player.full_name} (${playerCategory}) est hors de votre périmètre assigné. Vous pouvez uniquement consulter sa fiche.`);
      return;
    }
    setSelectedPlayer(player);
    setFormData({
      ...player,
      photo_url: player.photo_url || '',
      celebration_photo_url: (player as any).celebration_photo_url || '',
    });
    setViewState('FORM');
  };

  const handleOpenAdd = () => {
    if (!canCreatePlayer) {
      if (isScout) {
        toast.info("En tant que scout, la saisie des talents détectés s'effectue dans Détection & Recrutement V2.");
        navigate('/recruitment-v2/add-player');
      } else {
        toast.error("Création de joueur officiel non autorisée.");
      }
      return;
    }
    if (allowedCategories.length === 0) {
      toast.error("Aucune catégorie ne vous est assignée pour créer un joueur.");
      return;
    }
    setSelectedPlayer(null);
    setFormData({
      full_name: '',
      jersey_number: players.length + 1,
      position: 'FW',
      birth_date: '2012-01-01',
      nationality: 'Maroc',
      height: 155,
      weight: 45,
      preferred_foot: 'right',
      photo_url: '',
      celebration_photo_url: '',
      category: defaultCategory,
      team_id: allowedTeams[0]?.id || ''
    });
    setViewState('FORM');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'photo_url' | 'celebration_photo_url' = 'photo_url') => {
    const file = e.target.files?.[0];
    if (file) {
      setCropTarget(target);
      const url = URL.createObjectURL(file);
      setSelectedFileUrl(url);
      setCropModalOpen(true);
    }
    e.target.value = '';
  };

  const handleEditExistingPhoto = async (target: 'photo_url' | 'celebration_photo_url') => {
    const currentUrl = formData[target];
    if (!currentUrl) return;
    setCropTarget(target);
    setIsUploading(true);
    try {
      const res = await fetch(currentUrl);
      const blob = await res.blob();
      const localUrl = URL.createObjectURL(blob);
      setSelectedFileUrl(localUrl);
      setCropModalOpen(true);
    } catch {
      setSelectedFileUrl(currentUrl);
      setCropModalOpen(true);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropModalOpen(false);
    setIsUploading(true);
    try {
      const fileName = `player-${cropTarget}-${Date.now()}.png`;
      const file = new File([croppedBlob], fileName, { type: 'image/png' });
      const publicUrl = await storageService.uploadFile(file, 'players');
      setFormData(prev => ({ ...prev, [cropTarget]: publicUrl }));
    } catch (error: any) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement de l'image");
    } finally {
      setIsUploading(false);
      if (selectedFileUrl && selectedFileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(selectedFileUrl);
      }
      setSelectedFileUrl(null);
    }
  };

  const handleViewPlayer = async (player: Player) => {
    setSelectedPlayer(player);
    setViewState('VIEW');
    setLoadingStats(true);

    // Fetch player stats from match_events and matches
    try {
      const { data: events, error: eventsError } = await supabase
        .from('match_events')
        .select('*')
        .or(`player_id.eq.${player.id},related_player_id.eq.${player.id}`);

      if (eventsError) console.error('Events error:', eventsError);

      const { data: playerMatches, error: matchesError } = await supabase
        .from('matches')
        .select('*, match_players(player_id, is_starting, position_index, rating, rating_comment)')
        .order('match_date', { ascending: false });

      if (matchesError) console.error('Matches error:', matchesError);

      let matchesPlayed = 0;
      let startsCount = 0;
      let subsCount = 0;
      let minutesPlayed = 0;

      playerMatches?.forEach(match => {
        const lineup = match.lineup as { startingXI?: string[]; substitutes?: string[] } | null;
        const mpRecord = (match as any).match_players?.find((p: any) => p.player_id === player.id);
        const isStarter = mpRecord?.is_starting || lineup?.startingXI?.includes(player.id);
        const isSub = (mpRecord && !mpRecord.is_starting) || lineup?.substitutes?.includes(player.id);
        const hasEvent = events?.some((e: any) => e.match_id === match.id);

        if (isStarter || isSub || hasEvent) {
          matchesPlayed++;
          const matchDuration = (match.half_duration_minutes || 45) * 2;
          if (isStarter) {
            startsCount++;
            minutesPlayed += matchDuration;
          } else if (isSub) {
            subsCount++;
            minutesPlayed += 30;
          } else {
            minutesPlayed += 20;
          }
        }
      });

      events?.forEach((e: any) => {
        if (e.type === 'substitution') {
          if (e.player_id === player.id) {
            minutesPlayed -= 15;
          } else if (e.related_player_id === player.id) {
            minutesPlayed += 15;
          }
        }
      });

      const goals = events?.filter((e: any) => e.type === 'goal' && e.player_id === player.id).length || 0;
      const assists = events?.filter((e: any) => e.type === 'assist' || (e.type === 'goal' && e.related_player_id === player.id)).length || 0;
      const yellowCards = events?.filter((e: any) => e.type === 'yellow_card' && e.player_id === player.id).length || 0;
      const redCards = events?.filter((e: any) => e.type === 'red_card' && e.player_id === player.id).length || 0;
      const substitutions = events?.filter((e: any) => e.type === 'substitution').length || 0;

      const stats = {
        matches: matchesPlayed,
        starts: startsCount,
        subs: subsCount,
        minutes: Math.max(0, minutesPlayed),
        goals,
        assists,
        yellowCards,
        redCards,
        substitutions,
        totalContributions: goals + assists,
        avgMinutes: matchesPlayed > 0 ? Math.round(Math.max(0, minutesPlayed) / matchesPlayed) : 0,
        starterRate: matchesPlayed > 0 ? Math.round((startsCount / matchesPlayed) * 100) : 0,
      };

      setPlayerStats(stats);
      setRawPlayerEvents(events || []);
      setRawPlayerMatches(playerMatches || []);
      setSelectedSeasonFilter('ALL');
      setSelectedLeagueFilter('ALL');
      setSelectedMatchFilter('ALL');
    } catch (error) {
      console.error('Error fetching stats:', error);
      setPlayerStats({ matches: 0, starts: 0, subs: 0, minutes: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, substitutions: 0, totalContributions: 0, avgMinutes: 0, starterRate: 0 });
    } finally {
      setLoadingStats(false);
    }
  };

  const handleViewStats = async (player: Player) => {
    setSelectedPlayer(player);
    setLoadingStats(true);
    setViewState('STATS');

    // Fetch player stats from match_events and matches
    try {
      const { data: events, error: eventsError } = await supabase
        .from('match_events')
        .select('*')
        .or(`player_id.eq.${player.id},related_player_id.eq.${player.id}`);

      if (eventsError) console.error('Events error:', eventsError);

      const { data: playerMatches, error: matchesError } = await supabase
        .from('matches')
        .select('*, match_players(player_id, is_starting, position_index, rating, rating_comment)')
        .order('match_date', { ascending: false });

      if (matchesError) console.error('Matches error:', matchesError);

      let matchesPlayed = 0;
      let startsCount = 0;
      let subsCount = 0;
      let minutesPlayed = 0;

      playerMatches?.forEach(match => {
        const lineup = match.lineup as { startingXI?: string[]; substitutes?: string[] } | null;
        const mpRecord = (match as any).match_players?.find((p: any) => p.player_id === player.id);
        const isStarter = mpRecord?.is_starting || lineup?.startingXI?.includes(player.id);
        const isSub = (mpRecord && !mpRecord.is_starting) || lineup?.substitutes?.includes(player.id);
        const hasEvent = events?.some((e: any) => e.match_id === match.id);

        if (isStarter || isSub || hasEvent) {
          matchesPlayed++;
          const matchDuration = (match.half_duration_minutes || 45) * 2;
          if (isStarter) {
            startsCount++;
            minutesPlayed += matchDuration;
          } else if (isSub) {
            subsCount++;
            minutesPlayed += 30;
          } else {
            minutesPlayed += 20;
          }
        }
      });

      events?.forEach((e: any) => {
        if (e.type === 'substitution') {
          if (e.player_id === player.id) {
            minutesPlayed -= 15;
          } else if (e.related_player_id === player.id) {
            minutesPlayed += 15;
          }
        }
      });

      const goals = events?.filter((e: any) => e.type === 'goal' && e.player_id === player.id).length || 0;
      const assists = events?.filter((e: any) => e.type === 'assist' || (e.type === 'goal' && e.related_player_id === player.id)).length || 0;
      const yellowCards = events?.filter((e: any) => e.type === 'yellow_card' && e.player_id === player.id).length || 0;
      const redCards = events?.filter((e: any) => e.type === 'red_card' && e.player_id === player.id).length || 0;
      const substitutions = events?.filter((e: any) => e.type === 'substitution').length || 0;

      const stats = {
        matches: matchesPlayed,
        starts: startsCount,
        subs: subsCount,
        minutes: Math.max(0, minutesPlayed),
        goals,
        assists,
        yellowCards,
        redCards,
        substitutions,
        totalContributions: goals + assists,
        avgMinutes: matchesPlayed > 0 ? Math.round(Math.max(0, minutesPlayed) / matchesPlayed) : 0,
        starterRate: matchesPlayed > 0 ? Math.round((startsCount / matchesPlayed) * 100) : 0,
      };

      setPlayerStats(stats);
      setRawPlayerEvents(events || []);
      setRawPlayerMatches(playerMatches || []);
      setSelectedSeasonFilter('ALL');
      setSelectedLeagueFilter('ALL');
      setSelectedMatchFilter('ALL');
    } catch (error) {
      console.error('Error fetching stats:', error);
      setPlayerStats({ matches: 0, starts: 0, subs: 0, minutes: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, substitutions: 0, totalContributions: 0, avgMinutes: 0, starterRate: 0 });
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (viewState === 'STATS' && selectedPlayer && (!rawPlayerMatches || rawPlayerMatches.length === 0) && !loadingStats) {
      handleViewStats(selectedPlayer);
    }
  }, [viewState, selectedPlayer]);

  const handleSave = async () => {
    try {
      if (!formData.full_name?.trim()) {
        toast.error("Veuillez saisir le nom complet du joueur.");
        return;
      }

      const sanitizedData = {
        ...formData,
        full_name: formData.full_name.trim(),
        team_id: formData.team_id === '' ? null : formData.team_id,
        birth_date: formData.birth_date === '' ? null : formData.birth_date,
        preferred_foot: (formData.preferred_foot as string)?.toLowerCase() as any, // DB expects lowercase 'left', 'right', 'both'
        category: formData.category === 'PRO' ? ('SENIOR' as any) : formData.category
      };

      if (!canManageCategory(sanitizedData.category)) {
        toast.error(`Vous n'avez pas la permission d'enregistrer un joueur dans la catégorie ${sanitizedData.category}.`);
        return;
      }

      if (selectedPlayer) {
        if (!canUpdatePlayer) {
          toast.error("Modification de joueur non autorisée.");
          return;
        }
        const originalCategory = getPlayerCategory(selectedPlayer);
        if (!canManageCategory(originalCategory)) {
          toast.error(`Vous n'avez pas la permission de modifier un joueur de la catégorie ${originalCategory}. Vous pouvez uniquement le consulter.`);
          return;
        }
        const { id, created_at, ...updateData } = sanitizedData as any;
        await updatePlayer({ id: selectedPlayer.id, data: updateData });
        toast.success("Profil joueur mis à jour avec succès !");
      } else {
        if (!canCreatePlayer) {
          toast.error("Création de joueur non autorisée.");
          return;
        }
        await addPlayer(sanitizedData as Omit<Player, 'id'>);
        toast.success("Joueur créé avec succès !");
      }
      setViewState('LIST');
    } catch (err: any) {
      toast.error(`Erreur lors de la sauvegarde : ${err.message}`);
    }
  };


  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-11 w-40 rounded-xl" />
        </div>
        <div className="h-16 w-full rounded-2xl bg-secondary/20 border border-secondary/50 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Skeleton key={i} className="h-64 w-full rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <ErrorEmptyState
          title="Accès au Roster Impossible"
          message="Nous n'avons pas pu charger la liste des joueurs. Vérifiez la table 'players' dans votre base."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <AnimatePresence mode="wait">
        {viewState === 'LIST' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Scout Orientation Banner (US-DASH-19 / US-DASH-52) */}
            {isScout && !canCreatePlayer && !canUpdatePlayer && (
              <div className="bg-gradient-to-r from-purple-50 via-purple-50/70 to-indigo-50 dark:from-purple-950/40 dark:via-purple-900/30 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-800/60 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-purple-600 text-white shrink-0 shadow-md shadow-purple-500/20">
                    <Compass className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-base text-purple-950 dark:text-purple-100">
                        Espace Effectif & Sportif — Profil Scout (Consultation Seule)
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 border border-purple-300 dark:border-purple-700">
                        Cellule Détection
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-purple-800/90 dark:text-purple-300 mt-1 max-w-3xl leading-relaxed">
                      L'effectif officiel regroupe les joueurs sous contrat club gérés par le Staff Technique.
                      En tant que recruteur, <strong>tous vos joueurs détectés, prospects et talents à l'essai doivent être saisis dans le module Détection & Recrutement V2</strong>.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate('/recruitment-v2/add-player')}
                  className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider h-11 px-5 rounded-2xl shadow-lg shadow-purple-600/20 gap-2 active:scale-95 transition-all w-full md:w-auto justify-center cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Saisir dans Détection V2
                </Button>
              </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Effectif Joueurs</h2>
                  <p className="text-muted-foreground text-xs sm:text-sm font-medium">Gérez vos athlètes et leurs données physiques</p>
                </div>

                {/* Main Action Buttons - Wrap on mobile */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* View Toggle */}
                  <div className="flex bg-secondary/30 p-1 rounded-2xl border">
                    <Button
                      variant={displayMode === 'list' ? 'default' : 'ghost'}
                      size="icon"
                      onClick={() => setDisplayMode('list')}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl"
                    >
                      <ListIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={displayMode === 'grid' ? 'default' : 'ghost'}
                      size="icon"
                      onClick={() => setDisplayMode('grid')}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                  </div>

                  {canCreatePlayer ? (
                    <Button onClick={handleOpenAdd} className="gap-2 shadow-lg shadow-primary/20 h-10 sm:h-11 px-4 sm:px-6 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all active:scale-95 bg-primary">
                      <UserPlus className="w-4 h-4" />
                      <span className="hidden sm:inline">Ajouter un Joueur</span>
                      <span className="sm:hidden">Ajouter</span>
                    </Button>
                  ) : isScout ? (
                    <Button
                      onClick={() => navigate('/recruitment-v2/add-player')}
                      className="gap-2 shadow-lg shadow-purple-600/20 h-10 sm:h-11 px-4 sm:px-6 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all active:scale-95 bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                      title="Enregistrer un talent détecté dans Détection & Recrutement V2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span className="hidden sm:inline">Nouveau Talent (Détection V2)</span>
                      <span className="sm:hidden">Détection V2</span>
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Secondary Actions - Scrollable on mobile */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
                {/* Planning Button */}
                <Button
                  variant={(viewState as string) === 'PLANNING' ? 'default' : 'outline'}
                  onClick={() => setViewState((viewState as string) === 'PLANNING' ? 'LIST' : 'PLANNING')}
                  className={`h-9 sm:h-11 px-3 sm:px-5 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs gap-2 transition-all shrink-0 ${(viewState as string) === 'PLANNING' ? 'bg-primary shadow-lg shadow-primary/20' : 'border-primary/30 text-primary hover:bg-primary/5'}`}
                >
                  <CalendarDays className="w-4 h-4" />
                  <span className="hidden sm:inline">Planning</span>
                  <span className="sm:hidden">Plan</span>
                </Button>

                {/* Bouton mode sélection */}
                <Button
                  variant={selectionMode ? 'default' : 'outline'}
                  onClick={() => { setSelectionMode(s => !s); setSelectedIds(new Set()); }}
                  className={`h-9 sm:h-11 px-3 sm:px-5 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs gap-2 transition-all shrink-0 ${selectionMode ? 'bg-amber-500 hover:bg-amber-600 border-amber-500 text-white shadow-lg' : 'border-slate-200 text-slate-500'}`}
                >
                  <CheckSquare className="w-4 h-4" />
                  {selectionMode ? `${selectedIds.size}` : <span className="hidden sm:inline">Sélectionner</span>}
                </Button>

                {selectionMode && selectedIds.size > 0 && (
                  <Button
                    variant="destructive"
                    disabled={isBulkDeleting}
                    onClick={async () => {
                      if (!canDeletePlayer) {
                        toast.error("Suppression non autorisée.");
                        return;
                      }
                      const toDelete = paginatedPlayers
                        .filter(p => selectedIds.has(p.id))
                        .filter(p => {
                          const cat = teams.find(t => t.id === p.team_id)?.category || (p as any).category;
                          return canManageCategory(cat);
                        })
                        .map(p => p.id);
                      if (toDelete.length === 0) {
                        toast.error("Aucun joueur supprimable dans vos catégories assignées.");
                        return;
                      }
                      if (!confirm(`Supprimer ${toDelete.length} joueur${toDelete.length > 1 ? 's' : ''} et leurs photos définitivement ?`)) return;
                      await bulkDeletePlayers(toDelete);
                      setSelectedIds(new Set());
                      setSelectionMode(false);
                    }}
                    className="h-9 sm:h-11 px-3 sm:px-5 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs gap-2 bg-red-600 hover:bg-red-700 shadow-lg shrink-0"
                  >
                    {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    <span className="hidden sm:inline">Supprimer {selectedIds.size}</span>
                    <span className="sm:hidden">{selectedIds.size}</span>
                  </Button>
                )}

                {selectionMode && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const selectableIds = paginatedPlayers
                        .filter(p => {
                          const cat = getPlayerCategory(p);
                          return canDeletePlayer && canManageCategory(cat);
                        })
                        .map(p => p.id);
                      const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.has(id));
                      setSelectedIds(allSelected ? new Set() : new Set(selectableIds));
                    }}
                    className="h-9 sm:h-11 px-3 sm:px-5 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs gap-2 border-slate-200 shrink-0"
                  >
                    {(() => {
                      const selectable = paginatedPlayers.filter(p => {
                        const cat = getPlayerCategory(p);
                        return canDeletePlayer && canManageCategory(cat);
                      });
                      return selectable.length > 0 && selectable.every(p => selectedIds.has(p.id)) ? 'Tout désélect.' : 'Tout sélect.';
                    })()}
                  </Button>
                )}

                {canCreatePlayer && allowedCategories.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const activeCat = getActiveBulkCategory();
                        const matchingTeam = teams.find(t => t.category === activeCat) || teams[0];
                        setGenCategory(activeCat);
                        setGenTeamId(matchingTeam?.id || '');
                        setGenModal(true);
                      }}
                      className="gap-2 h-9 sm:h-11 px-3 sm:px-5 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs border-violet-300 text-violet-600 hover:bg-violet-50 shrink-0"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="hidden sm:inline">Générer 22</span>
                      <span className="sm:hidden">Générer</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        const activeCat = getActiveBulkCategory();
                        setBulkRows([newBulkRow(0, activeCat)]);
                        setViewState('BULK_ADD');
                      }}
                      className="gap-2 h-9 sm:h-11 px-3 sm:px-5 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs border-primary/30 text-primary hover:bg-primary/5 shrink-0"
                    >
                      <Users className="w-4 h-4" />
                      <span className="hidden sm:inline">Ajout multiple</span>
                      <span className="sm:hidden">Multiple</span>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border shadow-sm">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou numéro..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 sm:h-11 bg-secondary/30 border-transparent focus:bg-white transition-all rounded-xl font-medium text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <div className="flex bg-secondary/30 p-1 rounded-xl w-full overflow-x-auto no-scrollbar">
                  {visibleFilterCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`flex-1 sm:flex-none px-2 sm:px-3 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${categoryFilter === cat ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex bg-secondary/30 p-1 rounded-xl w-full sm:w-auto">
                  {(['ALL', 'GK', 'DF', 'MF', 'FW'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setPositionFilter(pos)}
                      className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${positionFilter === pos ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Area */}
            {displayMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                  {paginatedPlayers.map((player) => (
                    <motion.div
                      key={player.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="group relative overflow-hidden border-secondary hover:border-primary/20 hover:shadow-2xl transition-all duration-500 bg-white rounded-[2rem]">
                        <CardContent className="p-0">
                          {/* Card Header Illustration */}
                          <div className="h-24 bg-gradient-to-br from-secondary to-secondary/50 relative overflow-hidden">
                            {/* Club Logo + Category Badge stacked */}
                            {mainClub?.logo_url && (
                              <div className="absolute top-3 left-3 flex flex-col items-center gap-2">
                                <div className="w-16 h-16 rounded-full bg-white shadow-lg p-2">
                                  <img src={mainClub.logo_url} alt="Club" className="w-full h-full object-contain rounded-full" />
                                </div>
                                <Badge className="bg-white/90 backdrop-blur-sm text-primary font-black text-[10px] uppercase tracking-widest border-none shadow-md px-3 py-1">
                                  {getPlayerCategory(player)}
                                </Badge>
                              </div>
                            )}
                            <div className="absolute top-3 right-4 text-3xl font-black italic text-black/5 select-none transition-all group-hover:text-primary/10">
                              {(player.jersey_number !== undefined && player.jersey_number !== null) ? player.jersey_number : '—'}
                            </div>
                          </div>

                          <div className="px-6 pb-6 -mt-8 relative z-10 text-center">
                            <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-xl overflow-hidden mx-auto mb-4 group-hover:scale-105 transition-transform duration-500">
                              <img src={(player.photo_url && player.photo_url !== 'null') ? player.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=random&color=fff&size=200`} alt={player.full_name} className="w-full h-full object-cover" />
                            </div>

                            <h3 className="font-black text-lg tracking-tight uppercase group-hover:text-primary transition-colors truncate">{player.full_name}</h3>
                            <div className="flex items-center justify-center mt-1 mb-2">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${getPositionDetails(player.position).badgeBg}`}>
                                {getPositionDetails(player.position).code} — {getPositionDetails(player.position).label}
                              </span>
                            </div>

                            {/* Badge Statut Effectif */}
                            <div className="mb-3 flex items-center justify-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-2.5 py-1">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">
                                Effectif Officiel
                              </span>
                            </div>

                            {/* Badge surclassement ou sous-classement actif */}
                            {activeByPlayerId[player.id] && (() => {
                              const activeMob = activeByPlayerId[player.id];
                              return (
                                <div className="mb-3 flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 border bg-orange-50 border-orange-200 text-orange-600">
                                  <ArrowUpCircle className="w-3 h-3 text-orange-500" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">
                                    SURCLASSÉ → {activeMob.target_category}
                                  </span>
                                </div>
                              );
                            })()}

                            <div className="flex items-center justify-between pt-4 border-t border-secondary">
                              <div className="flex gap-2">
                                <Button variant="secondary" size="icon" onClick={() => handleViewPlayer(player)} className="h-9 w-9 rounded-xl bg-secondary/50 hover:bg-primary hover:text-white transition-all" title="Consulter le détail">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {canViewStats && (
                                  <Button variant="secondary" size="icon" onClick={() => handleViewStats(player)} className="h-9 w-9 rounded-xl bg-secondary/50 hover:bg-emerald-500 hover:text-white transition-all" title="Statistiques">
                                    <BarChart3 className="w-4 h-4" />
                                  </Button>
                                )}
                                {canUpdatePlayer && canManageCategory(getPlayerCategory(player)) && (
                                  <Button variant="secondary" size="icon" onClick={() => handleOpenEdit(player)} className="h-9 w-9 rounded-xl bg-secondary/50 hover:bg-primary hover:text-white transition-all" title="Modifier">
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                )}
                                {canSurclassPlayer && canManageCategory(getPlayerCategory(player)) && (() => {
                                  const activeMob = activeByPlayerId[player.id];
                                  return (
                                    <Button
                                      variant="secondary"
                                      size="icon"
                                      onClick={() => handleOpenSurclassement(player)}
                                      title={activeMob ? 'Gérer le surclassement (Matchs planifiés)' : 'Surclasser sur des matchs à venir'}
                                      className={`h-9 w-9 rounded-xl transition-all ${activeMob
                                        ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                                        : 'bg-secondary/50 hover:bg-orange-500 hover:text-white'
                                      }`}
                                    >
                                      {activeMob
                                        ? <RotateCcw className="w-4 h-4" />
                                        : <ArrowUpCircle className="w-4 h-4" />
                                      }
                                    </Button>
                                  );
                                })()}
                              </div>
                              {selectionMode ? (
                                canDeletePlayer && canManageCategory(getPlayerCategory(player)) ? (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedIds(prev => { const n = new Set(prev); n.has(player.id) ? n.delete(player.id) : n.add(player.id); return n; }); }}
                                    className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${selectedIds.has(player.id) ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500'}`}
                                  >
                                    {selectedIds.has(player.id) ? <CheckSquare className="w-4 h-4" /> : <div className="w-4 h-4 rounded border-2 border-current" />}
                                  </button>
                                ) : (
                                  <div className="w-9 h-9" />
                                )
                              ) : (
                                <div className="flex items-center gap-1">
                                  {!canManageCategory(getPlayerCategory(player)) ? (
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                                      Consultation seule
                                    </span>
                                  ) : (
                                    <>
                                      {canDeparturePlayer && (
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDeparture(player)} title="Sortie / Transfert du club" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-red-50 transition-all">
                                          <X className="w-4 h-4 text-red-500" />
                                        </Button>
                                      )}
                                      {canDeletePlayer && (
                                        <Button variant="ghost" size="icon" onClick={() => setPlayerToDelete(player)} title="Supprimer définitivement" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-all">
                                          <Trash2 className="w-4 h-4 text-rose-600" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white border rounded-[2rem] overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead className="bg-secondary/10 border-b">
                    <tr>
                      <th className="text-left px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <div className="flex items-center gap-2">
                          Joueur
                          {mainClub?.logo_url && categoryFilter !== 'ALL' && (
                            <img src={mainClub.logo_url} alt="Club" className="w-6 h-6 object-contain" />
                          )}
                        </div>
                      </th>
                      <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nationalité</th>
                      <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Position</th>
                      <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Catégorie</th>
                      <th className="text-right px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary/30">
                    {paginatedPlayers.map((player) => (
                      <tr key={player.id} className="group hover:bg-secondary/5 transition-colors">
                        <td className="px-8 py-3">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-secondary/30 overflow-hidden border-2 border-white shadow-md">
                              <img src={(player.photo_url && player.photo_url !== 'null') ? player.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=random&color=fff&size=200`} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-black text-sm uppercase italic tracking-tighter leading-none">{player.full_name}</p>
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[8px] font-black uppercase">
                                  ⭐ Signé FUS
                                </span>
                              </div>
                              <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">
                                #{(player.jersey_number !== undefined && player.jersey_number !== null) ? player.jersey_number : '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-xs font-bold">{player.nationality}</td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border shadow-2xs ${getPositionDetails(player.position).badgeBg}`}
                            title={getPositionDetails(player.position).label}
                          >
                            <span>{getPositionDetails(player.position).code}</span>
                            <span className="opacity-75 font-semibold text-[8px] hidden 2xl:inline">· {getPositionDetails(player.position).label}</span>
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] font-black border-primary/20 text-primary uppercase">
                              {getPlayerCategory(player)}
                            </Badge>
                            {activeByPlayerId[player.id] && (() => {
                              const activeMob = activeByPlayerId[player.id];
                              const isSousClass = isLowerCategory(activeMob.original_category, activeMob.target_category);
                              return (
                                <Badge className={`text-[9px] font-black uppercase gap-1 border ${
                                  isSousClass
                                    ? 'bg-sky-100 text-sky-700 border-sky-200'
                                    : 'bg-orange-100 text-orange-600 border-orange-200'
                                }`}>
                                  {isSousClass ? (
                                    <ArrowDownCircle className="w-2.5 h-2.5 text-sky-600" />
                                  ) : (
                                    <ArrowUpCircle className="w-2.5 h-2.5 text-orange-500" />
                                  )}
                                  {activeMob.target_category}
                                </Badge>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-8 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {selectionMode ? (
                              canDeletePlayer && canManageCategory(getPlayerCategory(player)) ? (
                                <button
                                  onClick={() => setSelectedIds(prev => { const n = new Set(prev); n.has(player.id) ? n.delete(player.id) : n.add(player.id); return n; })}
                                  className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${selectedIds.has(player.id) ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500'}`}
                                >
                                  {selectedIds.has(player.id) ? <CheckSquare className="w-4 h-4" /> : <div className="w-4 h-4 rounded border-2 border-current" />}
                                </button>
                              ) : (
                                <div className="w-9 h-9" />
                              )
                            ) : (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => handleViewPlayer(player)} className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-md transition-all" title="Consulter le détail">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {canViewStats && (
                                  <Button variant="ghost" size="icon" onClick={() => handleViewStats(player)} className="h-9 w-9 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:shadow-md transition-all" title="Statistiques">
                                    <BarChart3 className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => setCalendarModalPlayer(player)} className="h-9 w-9 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:shadow-md transition-all" title="Calendrier & Stats Matchs Joueur">
                                  <Calendar className="w-4 h-4 text-blue-600" />
                                </Button>
                                {!canManageCategory(getPlayerCategory(player)) ? (
                                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 ml-1">
                                    Consultation seule
                                  </span>
                                ) : (
                                  <>
                                    {canUpdatePlayer && (
                                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(player)} className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-md transition-all" title="Modifier">
                                        <Edit2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                    {canSurclassPlayer && (() => {
                                      const activeMob = activeByPlayerId[player.id];
                                      return (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleOpenSurclassement(player)}
                                          title={activeMob ? 'Gérer le surclassement (Matchs planifiés)' : 'Surclasser sur des matchs à venir'}
                                          className={`h-9 w-9 rounded-xl transition-all ${
                                            activeMob
                                              ? 'text-orange-500 bg-orange-50 hover:bg-orange-100'
                                              : 'text-muted-foreground hover:text-orange-500 hover:bg-orange-50'
                                          }`}
                                        >
                                          {activeMob
                                            ? <RotateCcw className="w-4 h-4" />
                                            : <ArrowUpCircle className="w-4 h-4" />
                                          }
                                        </Button>
                                      );
                                    })()}
                                    {canDeparturePlayer && (
                                      <Button variant="ghost" size="icon" onClick={() => handleOpenDeparture(player)} title="Sortie / Transfert du club" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-red-50 transition-all">
                                        <X className="w-4 h-4 text-red-500" />
                                      </Button>
                                    )}
                                    {canDeletePlayer && (
                                      <Button variant="ghost" size="icon" onClick={() => setPlayerToDelete(player)} title="Supprimer définitivement" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-all">
                                        <Trash2 className="w-4 h-4 text-rose-600" />
                                      </Button>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                  Affichage {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredPlayers.length)} sur {filteredPlayers.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="w-9 h-9 rounded-xl bg-white border-secondary"><ChevronLeft className="w-4 h-4" /></Button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <Button key={i} variant={currentPage === i + 1 ? 'default' : 'ghost'} size="sm" onClick={() => setCurrentPage(i + 1)} className={`w-9 h-9 rounded-xl font-black text-[11px] ${currentPage === i + 1 ? 'shadow-lg shadow-primary/20 bg-primary' : 'bg-white border-secondary border'}`}>{i + 1}</Button>
                  ))}
                  <Button variant="outline" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="w-9 h-9 rounded-xl bg-white border-secondary"><ChevronRight className="w-4 h-4" /></Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50">Par page:</span>
                  <select value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value))} className="h-9 w-16 rounded-xl bg-white border border-secondary font-black text-xs px-2 appearance-none cursor-pointer text-center">
                    {[10, 15, 20, 25, 50].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            )}
          </motion.div>
        ) : viewState === 'FORM' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-6 mb-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewState('LIST')}
                className="w-14 h-14 rounded-2xl bg-white border shadow-sm hover:bg-secondary transition-all"
              >
                <X className="w-6 h-6 rotate-90" />
              </Button>
              <div>
                <h3 className="text-4xl font-black tracking-tight uppercase italic">
                  {selectedPlayer ? 'Modifier le Profil' : 'Nouvelle Signature'}
                </h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1">Enregistrement Passeport Joueur</p>
              </div>
            </div>

            {/* Callout Distinction Effectif Officiel vs Détection V2 (US-DASH-19) */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800/60 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-blue-900 dark:text-blue-200 mb-8 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-2xl bg-blue-600 text-white shrink-0 shadow-sm">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-blue-950 dark:text-blue-100">
                    Enregistrement dans l'Effectif Officiel (<code className="font-mono bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded text-[11px]">public.players</code>)
                  </div>
                  <p className="text-blue-800/90 dark:text-blue-300 mt-0.5 text-xs">
                    Ce formulaire est réservé aux joueurs officiellement licenciés et sous contrat au club. Pour enregistrer un <strong>talent détecté, un prospect ou un joueur à l'essai</strong>, utilisez la cellule de détection.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/recruitment-v2/add-player')}
                className="shrink-0 border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-bold h-10 px-4 rounded-xl cursor-pointer"
              >
                Aller en Détection V2 →
              </Button>
            </div>

            <Card className="border-none shadow-2xl rounded-[3.5rem] bg-white overflow-hidden">
              <CardContent className="p-10 space-y-10">
                {/* ── SECTION PHOTOS : 2 Photos côte à côte (Officielle & Célébration) ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 rounded-full bg-primary" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">
                      Photographies Officielles & Célébration
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 1. Photo Officielle */}
                    <div className="space-y-4 p-6 rounded-3xl bg-slate-50/90 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                          <UserIcon className="w-3.5 h-3.5 text-primary" />
                          Photo Officielle
                        </label>
                        <span className="text-[9px] font-bold text-slate-600 uppercase bg-slate-200/90 px-2.5 py-0.5 rounded-full">Profil</span>
                      </div>

                      <div className="relative group">
                        <input
                          type="file"
                          id="player-photo"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, 'photo_url')}
                        />
                        <label
                          htmlFor="player-photo"
                          className="block aspect-4/3 w-full rounded-2xl bg-white border-2 border-dashed border-slate-200 hover:border-primary/50 transition-all cursor-pointer overflow-hidden group shadow-inner"
                        >
                          {(formData.photo_url && formData.photo_url !== 'null') ? (
                            <img src={formData.photo_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Officielle" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                              <Camera className={`w-8 h-8 ${isUploading && cropTarget === 'photo_url' ? 'animate-bounce text-primary' : 'opacity-40'}`} />
                              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Choisir la photo officielle</span>
                            </div>
                          )}
                        </label>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setMediaPickerTarget('photo_url');
                            setMediaPickerOpen(true);
                          }}
                          className="flex-1 gap-1.5 rounded-xl text-[11px] font-bold border-slate-200 hover:border-primary/40 bg-white hover:bg-primary/10 text-slate-800 h-9 shadow-xs cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-primary" />
                          Médiathèque
                        </Button>
                        <label
                          htmlFor="player-photo"
                          className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition-all border border-slate-200 h-9 shadow-xs"
                        >
                          <Camera className="w-3.5 h-3.5 text-primary" />
                          Uploader
                        </label>
                        {(formData.photo_url && formData.photo_url !== 'null') && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleEditExistingPhoto('photo_url')}
                            className="flex-1 gap-1.5 rounded-xl text-[11px] font-bold border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary/10 text-primary h-9 shadow-xs cursor-pointer"
                            title="Recadrer et zoomer la photo officielle existante"
                          >
                            <Scissors className="w-3.5 h-3.5 text-primary" />
                            Recadrer
                          </Button>
                        )}
                        {formData.photo_url && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, photo_url: '' })}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors h-9 w-9 flex items-center justify-center border border-rose-200 cursor-pointer"
                            title="Retirer la photo officielle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 2. Photo de Célébration (But pour joueurs de champ, Arrêt pour gardiens) */}
                    {(() => {
                      const isGk = ['GK', 'G', 'GB', 'GARDIEN', 'GARDIEN DE BUT'].includes((formData.position || '').toUpperCase());
                      return (
                        <div className={`space-y-4 p-6 rounded-3xl border shadow-xs flex flex-col justify-between transition-all ${
                          isGk
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : 'bg-rose-50/60 border-rose-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                              {isGk ? <Shield className="w-3.5 h-3.5 text-emerald-600" /> : <Flame className="w-3.5 h-3.5 text-rose-600" />}
                              {isGk ? "Célébration Arrêt Décisif" : "Célébration But"}
                            </label>
                            <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                              isGk
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {isGk ? '🧤 Penalty Arrêté' : '⚽ But / Penalty'}
                            </span>
                          </div>

                          <div className="relative group">
                            <input
                              type="file"
                              id="player-celebration-photo"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(e, 'celebration_photo_url')}
                            />
                            <label
                              htmlFor="player-celebration-photo"
                              className={`block aspect-4/3 w-full rounded-2xl bg-white border-2 border-dashed transition-all cursor-pointer overflow-hidden group shadow-inner ${
                                isGk ? 'border-emerald-200 hover:border-emerald-400' : 'border-rose-200 hover:border-rose-400'
                              }`}
                            >
                              {(formData.celebration_photo_url && formData.celebration_photo_url !== 'null') ? (
                                <div className="relative w-full h-full">
                                  <img src={formData.celebration_photo_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Célébration" />
                                  <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-md text-[9px] font-black text-white bg-black/60 backdrop-blur-xs">
                                    {isGk ? '🧤 ARRÊT' : '⚽ BUT'}
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                                  {isGk ? (
                                    <Shield className={`w-8 h-8 ${isUploading && cropTarget === 'celebration_photo_url' ? 'animate-bounce text-emerald-600' : 'text-emerald-400/60'}`} />
                                  ) : (
                                    <Flame className={`w-8 h-8 ${isUploading && cropTarget === 'celebration_photo_url' ? 'animate-bounce text-rose-600' : 'text-rose-400/60'}`} />
                                  )}
                                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Choisir la photo de célébration</span>
                                </div>
                              )}
                            </label>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setMediaPickerTarget('celebration_photo_url');
                                setMediaPickerOpen(true);
                              }}
                              className={`flex-1 gap-1.5 rounded-xl text-[11px] font-bold bg-white h-9 shadow-xs cursor-pointer ${
                                isGk
                                  ? 'border-emerald-200 hover:bg-emerald-50 text-emerald-800'
                                  : 'border-rose-200 hover:bg-rose-50 text-rose-800'
                              }`}
                            >
                              <ImageIcon className={`w-3.5 h-3.5 ${isGk ? 'text-emerald-600' : 'text-rose-600'}`} />
                              Médiathèque
                            </Button>
                            <label
                              htmlFor="player-celebration-photo"
                              className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition-all border border-slate-200 h-9 shadow-xs"
                            >
                              <Camera className="w-3.5 h-3.5 text-primary" />
                              Uploader
                            </label>
                            {(formData.celebration_photo_url && formData.celebration_photo_url !== 'null') && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleEditExistingPhoto('celebration_photo_url')}
                                className={`flex-1 gap-1.5 rounded-xl text-[11px] font-bold h-9 shadow-xs cursor-pointer ${
                                  isGk
                                    ? 'border-emerald-300 hover:border-emerald-500 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                                    : 'border-rose-300 hover:border-rose-500 bg-rose-50 hover:bg-rose-100 text-rose-800'
                                }`}
                                title="Recadrer et zoomer la photo de célébration existante"
                              >
                                <Scissors className={`w-3.5 h-3.5 ${isGk ? 'text-emerald-600' : 'text-rose-600'}`} />
                                Recadrer
                              </Button>
                            )}
                            {formData.celebration_photo_url && (
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, celebration_photo_url: '' })}
                                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors h-9 w-9 flex items-center justify-center border border-rose-200 cursor-pointer"
                                title="Retirer la photo de célébration"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* ── SECTION IDENTITÉ & AFFECTATION SPORTIVE ── */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 rounded-full bg-primary" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">
                      Identité & Affectation Sportive
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Nom Complet de l'Athlète */}
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Nom Complet de l'Athlète</label>
                      <Input
                        value={formData.full_name}
                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="ex. Cristiano Ronaldo"
                        className="h-16 px-6 rounded-2xl bg-secondary/30 border-none font-bold text-lg focus:ring-2 ring-primary/20"
                      />
                    </div>

                    {/* Numéro de Dossard */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Numéro de Dossard</label>
                      <Input
                        type="number"
                        value={formData.jersey_number}
                        onChange={e => setFormData({ ...formData, jersey_number: parseInt(e.target.value) || 0 })}
                        className="h-16 px-6 rounded-2xl bg-secondary/30 border-none font-bold text-lg focus:ring-2 ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Catégorie d'Âge */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Catégorie d'Âge</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value as any, team_id: '' })}
                        className="w-full h-16 rounded-2xl bg-secondary/30 border-none font-bold px-6 text-base outline-none appearance-none cursor-pointer focus:ring-2 ring-primary/20"
                      >
                        {allowedCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Affectation Équipe */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Affectation Équipe</label>
                      <select
                        value={(formData as any).team_id || ''}
                        onChange={e => setFormData({ ...formData, team_id: e.target.value })}
                        className="w-full h-16 rounded-2xl bg-primary/5 border border-primary/20 text-primary font-bold px-6 outline-none appearance-none cursor-pointer focus:ring-2 ring-primary/20 text-base"
                      >
                        <option value="">-- Sans Équipe (Agent Libre) --</option>
                        {allowedTeams.filter(t => t.category === formData.category).map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                        ))}
                      </select>
                    </div>

                    {/* Nationalité (Liste Déroulante) */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Nationalité (Liste Déroulante)</label>
                      <select
                        value={formData.nationality || 'Maroc'}
                        onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                        className="w-full h-16 px-6 rounded-2xl bg-secondary/30 border-none font-bold text-base focus:ring-2 ring-primary/20 appearance-none outline-none cursor-pointer"
                      >
                        {NATIONALITIES.map(nat => (
                          <option key={nat} value={nat}>{nat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── SECTION PROFIL TERRAIN & CARACTÉRISTIQUES PHYSIQUES ── */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 rounded-full bg-primary" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">
                      Profil Terrain & Caractéristiques Physiques
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {/* Poste Tactique */}
                    <div className="space-y-2 col-span-2 md:col-span-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Poste Tactique</label>
                      <select
                        value={formData.position}
                        onChange={e => setFormData({ ...formData, position: e.target.value as any })}
                        className="w-full h-16 rounded-2xl bg-secondary/30 border-none font-bold px-6 outline-none appearance-none cursor-pointer focus:ring-2 ring-primary/20 text-base"
                      >
                        {availablePositions.map(pos => (
                          <option key={pos.code} value={pos.code}>
                            {pos.emoji ? `${pos.emoji} ` : ''}{pos.code} — {pos.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date de Naissance */}
                    <div className="space-y-2 col-span-2 md:col-span-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Date de Naissance</label>
                      <Input
                        type="date"
                        value={formData.birth_date}
                        onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                        className="h-16 px-6 rounded-2xl bg-secondary/30 border-none font-bold text-base focus:ring-2 ring-primary/20"
                      />
                    </div>

                    {/* Taille (cm) */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Taille (cm)</label>
                      <Input
                        type="number"
                        value={formData.height}
                        onChange={e => setFormData({ ...formData, height: parseFloat(e.target.value) || 0 })}
                        className="h-16 px-6 rounded-2xl bg-secondary/30 border-none font-bold text-base focus:ring-2 ring-primary/20"
                      />
                    </div>

                    {/* Poids (kg) */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Poids (kg)</label>
                      <Input
                        type="number"
                        value={formData.weight}
                        onChange={e => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                        className="h-16 px-6 rounded-2xl bg-secondary/30 border-none font-bold text-base focus:ring-2 ring-primary/20"
                      />
                    </div>

                    {/* Pied de Prédilection */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Pied Fort</label>
                      <select
                        value={formData.preferred_foot}
                        onChange={e => setFormData({ ...formData, preferred_foot: e.target.value as any })}
                        className="w-full h-16 rounded-2xl bg-secondary/30 border-none font-bold px-6 outline-none appearance-none cursor-pointer focus:ring-2 ring-primary/20 text-base"
                      >
                        <option value="Right">Droitier</option>
                        <option value="Left">Gaucher</option>
                        <option value="Both">Ambidextre</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-8 border-t border-secondary/50">
                  <Button variant="ghost" onClick={() => setViewState('LIST')} className="flex-1 h-16 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-secondary">Annuler</Button>
                  <Button onClick={handleSave} className="flex-1 h-16 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95">
                    {selectedPlayer ? 'Enregistrer les Modifications' : 'Confirmer la Signature'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : viewState === 'VIEW' ? (
          <motion.div
            key="view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-5xl mx-auto"
          >
            {selectedPlayer && (
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewState('LIST')}
                    className="w-14 h-14 rounded-2xl bg-white border shadow-sm hover:bg-secondary transition-all"
                  >
                    <X className="w-6 h-6 rotate-90" />
                  </Button>

                  {/* Navigation buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goToPreviousPlayer}
                      disabled={filteredPlayers.length <= 1}
                      className="w-12 h-12 rounded-xl bg-white border shadow-sm hover:bg-secondary transition-all disabled:opacity-40"
                      title="Joueur précédent"
                    >
                      <PrevIcon className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goToNextPlayer}
                      disabled={filteredPlayers.length <= 1}
                      className="w-12 h-12 rounded-xl bg-white border shadow-sm hover:bg-secondary transition-all disabled:opacity-40"
                      title="Joueur suivant"
                    >
                      <NextIcon className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-4xl font-black tracking-tight uppercase italic">{selectedPlayer.full_name}</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1">Détails du Profil Joueur</p>
                  </div>

                  <Badge variant="outline" className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    {filteredPlayers.findIndex(p => p.id === selectedPlayer.id) + 1} / {filteredPlayers.length}
                  </Badge>
                </div>

                <Card className="border-none shadow-2xl rounded-[4rem] bg-white overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-12">
                    {/* Left Side: Photo & Hero */}
                    <div className="md:col-span-5 bg-slate-950 p-16 text-white relative flex flex-col justify-between min-h-[600px]">
                      <div className="absolute top-0 right-0 w-80 h-80 -mr-40 -mt-40 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

                      {/* Club Logo + Category Badge stacked */}
                      {mainClub?.logo_url && (
                        <div className="absolute top-6 left-6 z-20 flex flex-col items-center gap-2">
                          <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 p-2 shadow-xl">
                            <img src={mainClub.logo_url} alt="Club" className="w-full h-full object-contain rounded-full" />
                          </div>
                          <Badge className="bg-white/10 backdrop-blur-md text-white font-black uppercase px-3 py-1 border border-white/20 text-xs">
                            {teams.find(t => t.id === selectedPlayer.team_id)?.category || 'N/A'}
                          </Badge>
                        </div>
                      )}

                      <div className="relative z-10 mt-20">
                        <span className="text-9xl font-black italic opacity-20 select-none">#{selectedPlayer.jersey_number}</span>
                        <div className="mt-6">
                          <h2 className="text-6xl font-black tracking-tighter uppercase leading-none">
                            {selectedPlayer.full_name.split(' ').map((n, i) => (
                              <span key={i} className="block">{n}</span>
                            ))}
                          </h2>
                          <Badge className="mt-8 bg-primary text-white font-black uppercase px-6 py-2 border-none text-sm">{selectedPlayer.position}</Badge>
                        </div>
                      </div>

                      <div className="relative z-10 w-full aspect-square rounded-[3.5rem] bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden shadow-2xl mt-12">
                        <img src={(selectedPlayer.photo_url && selectedPlayer.photo_url !== 'null') ? selectedPlayer.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPlayer.full_name)}&background=random&color=fff&size=256`} alt={selectedPlayer.full_name} className="w-full h-full object-cover" />
                      </div>
                    </div>

                    {/* Right Side: Attributes */}
                    <div className="md:col-span-7 p-16 space-y-12 bg-white flex flex-col justify-center">
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-8 flex items-center gap-3">
                          <div className="w-8 h-px bg-primary/30" /> Passeport Technique
                        </h4>

                        <div className="grid grid-cols-2 gap-12">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nationalité</p>
                            <div className="flex items-center gap-3 text-2xl font-black italic uppercase">
                              <Globe className="w-6 h-6 text-primary" /> {selectedPlayer.nationality}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Âge / Date de Naissance</p>
                            <div className="flex items-center gap-3 text-2xl font-black italic uppercase">
                              <Calendar className="w-6 h-6 text-primary" /> {calculateAge(selectedPlayer.birth_date)} ans
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-8">
                        <div className="p-8 rounded-[2.5rem] bg-secondary/20 space-y-3 border border-secondary/50">
                          <Ruler className="w-6 h-6 text-primary/40" />
                          <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase">Taille</p>
                            <p className="text-2xl font-black">{selectedPlayer.height} <span className="text-xs uppercase ml-1 opacity-50">cm</span></p>
                          </div>
                        </div>
                        <div className="p-8 rounded-[2.5rem] bg-secondary/20 space-y-3 border border-secondary/50">
                          <Weight className="w-6 h-6 text-primary/40" />
                          <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase">Poids</p>
                            <p className="text-2xl font-black">{selectedPlayer.weight} <span className="text-xs uppercase ml-1 opacity-50">kg</span></p>
                          </div>
                        </div>
                        <div className="p-8 rounded-[2.5rem] bg-secondary/20 space-y-3 border border-secondary/50">
                          <Footprints className="w-6 h-6 text-primary/40" />
                          <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase">Pied</p>
                            <p className="text-2xl font-black uppercase italic">{selectedPlayer.preferred_foot}</p>
                          </div>
                        </div>
                      </div>

                      {/* Player Stats Section */}
                      <div className="pt-8 border-t border-secondary/50">
                        <div className="flex justify-between items-center mb-6">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-3 m-0">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            <div className="w-8 h-px bg-primary/30" /> Statistiques Performance
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            <select
                              value={selectedSeasonFilter}
                              onChange={(e) => { setSelectedSeasonFilter(e.target.value); setSelectedLeagueFilter('ALL'); setSelectedMatchFilter('ALL'); }}
                              className="h-8 rounded-lg border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[120px]"
                            >
                              <option value="ALL">Toutes Saisons</option>
                              {participatedSeasons.map((s: string) => <option key={s} value={s}>{s}</option>)}
                            </select>

                            <select
                              value={selectedLeagueFilter}
                              onChange={(e) => { setSelectedLeagueFilter(e.target.value); setSelectedMatchFilter('ALL'); }}
                              className="h-8 rounded-lg border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[120px]"
                            >
                              <option value="ALL">Toutes Ligues</option>
                              {participatedLeagues
                                .filter((l: any) => selectedSeasonFilter === 'ALL' || l.season === selectedSeasonFilter)
                                .map((league: any) => (
                                  <option key={league.id} value={league.id}>{league.name}</option>
                                ))
                              }
                            </select>

                            <select
                              value={selectedMatchFilter}
                              onChange={(e) => setSelectedMatchFilter(e.target.value)}
                              className="h-8 rounded-lg border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-primary max-w-[200px]"
                            >
                              <option value="ALL">Tous les Matchs</option>
                              {participatedMatches
                                .filter((m: any) => selectedLeagueFilter === 'ALL' || m.league_id === selectedLeagueFilter)
                                .filter((m: any) => {
                                  if (selectedSeasonFilter === 'ALL') return true;
                                  const lg = leagues.find((l: any) => l.id === m.league_id);
                                  return lg?.season === selectedSeasonFilter;
                                })
                                .map((match: any) => {
                                  const oppName = match.clubs?.name || 'Inconnu';
                                  const dateStr = match.match_date ? new Date(match.match_date).toLocaleDateString('fr-FR') : '';
                                  return (
                                    <option key={match.id} value={match.id}>vs {oppName} {dateStr ? `(${dateStr})` : ''}</option>
                                  );
                                })
                              }
                            </select>
                          </div>
                        </div>

                        {loadingStats ? (
                          <div className="flex items-center justify-center h-24">
                            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="p-5 rounded-[1.5rem] bg-emerald-50 border border-emerald-100 text-center">
                              <Trophy className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Matchs</p>
                              <p className="text-2xl font-black text-emerald-700">{displayStats?.matches || 0}</p>
                            </div>
                            <div className="p-5 rounded-[1.5rem] bg-blue-50 border border-blue-100 text-center">
                              <Clock className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                              <div>
                                <p className="text-[10px] font-black text-blue-900/60 uppercase tracking-wider mb-1">Minutes</p>
                                <p className="text-2xl font-black text-blue-700">{displayStats?.minutes || 0}</p>
                              </div>
                            </div>
                            <div className="p-5 rounded-[1.5rem] bg-indigo-50 border border-indigo-100 text-center">
                              <Target className="w-5 h-5 text-indigo-500 mx-auto mb-2" />
                              <div>
                                <p className="text-[10px] font-black text-indigo-900/60 uppercase tracking-wider mb-1">Buts</p>
                                <p className="text-2xl font-black text-indigo-700">{displayStats?.goals || 0}</p>
                              </div>
                            </div>
                            <div className="p-5 rounded-[1.5rem] bg-amber-50 border border-amber-100 text-center">
                              <div className="w-4 h-5 bg-amber-400 rounded-sm mx-auto mb-2" />
                              <div>
                                <p className="text-[10px] font-black text-amber-900/60 uppercase tracking-wider mb-1">Jaunes</p>
                                <p className="text-2xl font-black text-amber-700">{displayStats?.yellowCards || 0}</p>
                              </div>
                            </div>
                            <div className="p-5 rounded-[1.5rem] bg-red-50 border border-red-100 text-center">
                              <div className="w-4 h-5 bg-red-500 rounded-sm mx-auto mb-2" />
                              <div>
                                <p className="text-[10px] font-black text-red-900/60 uppercase tracking-wider mb-1">Rouges</p>
                                <p className="text-2xl font-black text-red-700">{displayStats?.redCards || 0}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-12 border-t border-secondary/50 flex gap-4 items-center">
                        {canUpdatePlayer && canManageCategory(getPlayerCategory(selectedPlayer)) ? (
                          <Button onClick={() => handleOpenEdit(selectedPlayer)} className="flex-1 h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-xs gap-3 shadow-xl transition-all active:scale-95 bg-primary">
                            <Edit2 className="w-5 h-5" /> Modifier le Profil
                          </Button>
                        ) : (
                          <div className="flex-1 flex items-center justify-center h-16 rounded-[1.5rem] bg-slate-100 border border-slate-200 text-slate-500 text-xs font-black uppercase tracking-widest gap-2">
                            <Eye className="w-4 h-4 text-slate-400" /> Profil Hors Catégorie Assignée — Consultation Seule
                          </div>
                        )}
                        <Button variant="outline" onClick={() => setViewState('LIST')} className="h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-xs px-12 hover:bg-secondary transition-all">
                          Fermer
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </motion.div>
        ) : viewState === 'STATS' ? (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="max-w-6xl mx-auto space-y-6 pb-16"
          >
            {selectedPlayer && (
              <div className="space-y-6">
                {/* ── Top Navigation Bar ── */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-secondary/60 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setViewState('LIST')}
                      className="h-11 px-4 rounded-xl border-border hover:bg-secondary text-xs font-black uppercase tracking-wider gap-2 shadow-sm transition-all hover:scale-[1.02]"
                    >
                      <ArrowLeft className="w-4 h-4 text-primary" />
                      <span>Retour Effectif</span>
                    </Button>

                    <div className="flex items-center bg-secondary/40 p-1 rounded-xl border border-secondary">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToPreviousPlayer}
                        disabled={filteredPlayers.length <= 1}
                        className="w-9 h-9 rounded-lg hover:bg-white transition-all disabled:opacity-30"
                        title="Joueur précédent"
                      >
                        <PrevIcon className="w-4 h-4" />
                      </Button>
                      <div className="px-3 text-[11px] font-black tracking-widest uppercase text-muted-foreground whitespace-nowrap">
                        {filteredPlayers.findIndex(p => p.id === selectedPlayer.id) + 1} / {filteredPlayers.length}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToNextPlayer}
                        disabled={filteredPlayers.length <= 1}
                        className="w-9 h-9 rounded-lg hover:bg-white transition-all disabled:opacity-30"
                        title="Joueur suivant"
                      >
                        <NextIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      variant="outline"
                      onClick={() => handleViewPlayer(selectedPlayer)}
                      className="h-11 px-4 rounded-xl border-secondary hover:bg-secondary text-xs font-black uppercase tracking-wider gap-2 transition-all"
                    >
                      <Eye className="w-4 h-4 text-primary" />
                      <span className="hidden md:inline">Voir Profil Complet</span>
                      <span className="md:hidden">Profil</span>
                    </Button>
                    {canUpdatePlayer && canManageCategory(getPlayerCategory(selectedPlayer)) && (
                      <Button
                        onClick={() => handleOpenEdit(selectedPlayer)}
                        className="h-11 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider gap-2 shadow-md shadow-primary/20 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span className="hidden md:inline">Modifier Joueur</span>
                        <span className="md:hidden">Modifier</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* ── Player Header (Directement dans la page, sans carte fermée, photo à gauche) ── */}
                <div className="relative pt-2 pb-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
                    {/* Photo Joueur À GAUCHE */}
                    <div className="shrink-0">
                      <div className="relative group">
                        <div className="relative w-28 h-28 sm:w-36 sm:h-36 lg:w-40 lg:h-40 rounded-3xl bg-white p-1.5 shadow-xl border-4 border-white ring-1 ring-slate-200/80 overflow-hidden">
                          <img
                            src={(selectedPlayer.photo_url && selectedPlayer.photo_url !== 'null') ? selectedPlayer.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPlayer.full_name)}&background=e2e8f0&color=1e293b&size=256`}
                            alt={selectedPlayer.full_name}
                            className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        {selectedPlayer.jersey_number && (
                          <div className="absolute -bottom-2 -right-2 bg-primary text-white text-xs sm:text-sm font-black px-2.5 py-1 rounded-xl shadow-lg border-2 border-white">
                            #{selectedPlayer.jersey_number}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Infos Joueur (À DROITE de la photo) */}
                    <div className="space-y-4 flex-1">
                      {/* Tags club, position & catégorie */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-black uppercase tracking-wider border border-primary/20">
                          <Sparkles className="w-3.5 h-3.5" /> FUS Rabat • Centre de Performance
                        </span>
                        <Badge className={`font-black uppercase text-[11px] px-3 py-1 border shadow-xs ${getPositionInfo(selectedPlayer.position).badgeBg}`}>
                          {getPositionInfo(selectedPlayer.position).label}
                        </Badge>
                        <Badge className="bg-secondary text-slate-700 font-black uppercase text-[11px] px-3 py-1 border border-secondary/80">
                          {teams.find(t => t.id === selectedPlayer.team_id)?.category || (selectedPlayer as any).category || 'U16'}
                        </Badge>
                        <Badge variant="outline" className="text-slate-600 border-border text-[11px] uppercase font-bold px-2.5 py-0.5">
                          <Globe className="w-3.5 h-3.5 mr-1 text-primary" />
                          {selectedPlayer.nationality || 'Maroc'}
                        </Badge>
                      </div>

                      {/* Nom & Numéro de Maillot */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-slate-900 leading-none">
                            {selectedPlayer.full_name}
                          </h1>
                          {selectedPlayer.jersey_number && (
                            <span className="px-3 py-1 rounded-xl bg-primary text-white font-mono font-black text-lg sm:text-xl shadow-md shadow-primary/20">
                              #{selectedPlayer.jersey_number}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-semibold">
                          Fiche analytique individuelle et statistiques de jeu en compétition
                        </p>
                      </div>

                      {/* Passeport physique (Pills dans la page) */}
                      <div className="inline-flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
                        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-secondary shadow-xs">
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Âge</span>
                          <span className="text-sm font-black text-slate-900">{calculateAge(selectedPlayer.birth_date)} <span className="text-xs font-normal text-slate-500">ans</span></span>
                        </div>
                        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-secondary shadow-xs">
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Taille</span>
                          <span className="text-sm font-black text-slate-900">{selectedPlayer.height || '-'} <span className="text-xs font-normal text-slate-500">cm</span></span>
                        </div>
                        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-secondary shadow-xs">
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Poids</span>
                          <span className="text-sm font-black text-slate-900">{selectedPlayer.weight || '-'} <span className="text-xs font-normal text-slate-500">kg</span></span>
                        </div>
                        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-secondary shadow-xs">
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pied</span>
                          <span className="text-sm font-black text-slate-900 uppercase">{selectedPlayer.preferred_foot || 'Droit'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Filters Toolbar ── */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-secondary/70 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600">
                    <Filter className="w-4 h-4 text-primary" />
                    <span>Filtrer les statistiques :</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* Season Filter */}
                    <select
                      value={selectedSeasonFilter}
                      onChange={(e) => { setSelectedSeasonFilter(e.target.value); setSelectedLeagueFilter('ALL'); setSelectedMatchFilter('ALL'); }}
                      className="h-10 rounded-xl border border-input bg-secondary/30 px-3 text-xs font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[130px]"
                    >
                      <option value="ALL">🗓️ Toutes Saisons</option>
                      {participatedSeasons.map((s: string) => <option key={s} value={s}>Saison {s}</option>)}
                    </select>

                    {/* League / Competition Filter with Matchs Amicaux */}
                    <select
                      value={selectedLeagueFilter}
                      onChange={(e) => { setSelectedLeagueFilter(e.target.value); setSelectedMatchFilter('ALL'); }}
                      className="h-10 rounded-xl border border-input bg-secondary/30 px-3 text-xs font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[170px]"
                    >
                      <option value="ALL">🏆 Toutes Compétitions</option>
                      <option value="FRIENDLY">🤝 Matchs Amicaux</option>
                      <option value="OFFICIAL">🏅 Compétitions Officielles</option>
                      {participatedLeagues
                        .filter((l: any) => selectedSeasonFilter === 'ALL' || l.season === selectedSeasonFilter)
                        .map((league: any) => (
                          <option key={league.id} value={league.id}>{league.name}</option>
                        ))
                      }
                    </select>

                    {/* Match Filter */}
                    <select
                      value={selectedMatchFilter}
                      onChange={(e) => setSelectedMatchFilter(e.target.value)}
                      className="h-10 rounded-xl border border-input bg-secondary/30 px-3 text-xs font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary max-w-[240px]"
                    >
                      <option value="ALL">⚽ Tous les Matchs</option>
                      {participatedMatches
                        .filter((m: any) => {
                          if (selectedLeagueFilter === 'FRIENDLY') {
                            return !m.league_id || m.category?.toLowerCase().includes('amical') || m.notes?.toLowerCase().includes('amical');
                          }
                          if (selectedLeagueFilter === 'OFFICIAL') {
                            return !!m.league_id && !m.category?.toLowerCase().includes('amical');
                          }
                          if (selectedLeagueFilter !== 'ALL') {
                            return m.league_id === selectedLeagueFilter;
                          }
                          return true;
                        })
                        .filter((m: any) => {
                          if (selectedSeasonFilter === 'ALL') return true;
                          const lg = leagues?.find((l: any) => l.id === m.league_id);
                          return lg?.season === selectedSeasonFilter;
                        })
                        .map((match: any) => {
                          const opp = opponentClubs.find((c: any) => c.id === match.opponent_id);
                          const oppName = opp?.name || 'Adversaire';
                          const dateStr = match.match_date ? new Date(match.match_date).toLocaleDateString('fr-FR') : '';
                          return (
                            <option key={match.id} value={match.id}>vs {oppName} {dateStr ? `(${dateStr})` : ''}</option>
                          );
                        })
                      }
                    </select>

                    {/* Reset Button */}
                    {(selectedSeasonFilter !== 'ALL' || selectedLeagueFilter !== 'ALL' || selectedMatchFilter !== 'ALL') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedSeasonFilter('ALL'); setSelectedLeagueFilter('ALL'); setSelectedMatchFilter('ALL'); }}
                        className="h-10 px-3 rounded-xl text-xs font-black text-primary hover:bg-primary/10 gap-1.5 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Réinitialiser</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* ── 6 Core Football KPI Cards ── */}
                {loadingStats ? (
                  <div className="flex items-center justify-center h-64 bg-white rounded-3xl border border-secondary/60 shadow-sm">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Chargement des analytiques...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                      {/* 1. MATCHS JOUÉS */}
                      <div className="relative p-6 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 shadow-sm hover:shadow-md transition-all group hover:z-30 focus-within:z-30">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 transition-transform group-hover:scale-110">
                              <Trophy className="w-6 h-6" />
                            </div>
                            <IndicatorHelpTooltip
                              title="Matchs Disputés"
                              metric="Volume & Présence"
                              role="Mesure la récurrence des apparitions sur la feuille de match. Permet d'évaluer l'intégration sportive du joueur, sa disponibilité et son taux de titularisation dans le XI de départ."
                            />
                          </div>
                          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px] font-black uppercase tracking-widest">
                            Taux départ : {displayStats?.starterRate || 0}%
                          </Badge>
                        </div>
                        <p className="text-xs font-black text-emerald-900/60 uppercase tracking-widest mb-1">Matchs Disputés</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl sm:text-5xl font-black text-emerald-950 tracking-tight">{displayStats?.matches || 0}</span>
                          <span className="text-xs font-bold text-emerald-700 uppercase">rencontres</span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-emerald-500/15 flex items-center justify-between text-[11px] font-bold text-emerald-800/80">
                          <span>{displayStats?.starts || 0} Titulaire(s)</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>{displayStats?.subs || 0} Remplaçant(s)</span>
                        </div>
                      </div>

                      {/* 2. TEMPS DE JEU (MINUTES) */}
                      <div className="relative p-6 rounded-[2rem] bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 shadow-sm hover:shadow-md transition-all group hover:z-30 focus-within:z-30">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 transition-transform group-hover:scale-110">
                              <Clock className="w-6 h-6" />
                            </div>
                            <IndicatorHelpTooltip
                              title="Temps de Jeu"
                              metric="Charge athlétique"
                              role="Cumule les minutes réelles jouées en match. Permet au staff technique de doser la charge de travail athlétique, de prévenir le surentraînement et de valider la régularité physique."
                            />
                          </div>
                          <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30 text-[10px] font-black uppercase tracking-widest">
                            Moy. {displayStats?.avgMinutes || 0} min/m
                          </Badge>
                        </div>
                        <p className="text-xs font-black text-blue-900/60 uppercase tracking-widest mb-1">Temps de Jeu Total</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl sm:text-5xl font-black text-blue-950 tracking-tight">{displayStats?.minutes || 0}</span>
                          <span className="text-xs font-bold text-blue-700 uppercase">minutes</span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-blue-500/15 flex items-center justify-between text-[11px] font-bold text-blue-800/80">
                          <span>Présence active terrain</span>
                          <span className="font-black text-blue-900">{displayStats?.matches ? Math.round(((displayStats?.minutes || 0) / (displayStats.matches * 90)) * 100) : 0}% du temps total</span>
                        </div>
                      </div>

                      {/* 3. BUTS MARQUÉS */}
                      <div className="relative p-6 rounded-[2rem] bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/30 shadow-sm hover:shadow-md transition-all group hover:z-30 focus-within:z-30">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                              <Flame className="w-6 h-6" />
                            </div>
                            <IndicatorHelpTooltip
                              title="Buts Marqués"
                              metric="Finition offensive"
                              role="Comptabilise les réalisations officielles et amicales du joueur. Évalue le réalisme devant le but adverse, le ratio d'efficacité offensive et l'impact direct au score."
                            />
                          </div>
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-black uppercase tracking-widest">
                            {displayStats?.matches ? ((displayStats.goals || 0) / displayStats.matches).toFixed(2) : '0.00'} but/match
                          </Badge>
                        </div>
                        <p className="text-xs font-black text-primary/70 uppercase tracking-widest mb-1">Buts Marqués</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl sm:text-5xl font-black text-slate-950 tracking-tight">{displayStats?.goals || 0}</span>
                          <span className="text-xs font-bold text-primary uppercase">but(s) officiel(s)</span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-primary/15 flex items-center justify-between text-[11px] font-bold text-slate-600">
                          <span>Impact offensif</span>
                          <span className="font-black text-primary">{displayStats?.goals ? `${Math.round((displayStats?.minutes || 0) / displayStats.goals)} min/but` : 'Aucun but'}</span>
                        </div>
                      </div>

                      {/* 4. PASSES DÉCISIVES */}
                      <div className="relative p-6 rounded-[2rem] bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-500/20 shadow-sm hover:shadow-md transition-all group hover:z-30 focus-within:z-30">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 transition-transform group-hover:scale-110">
                              <Zap className="w-6 h-6" />
                            </div>
                            <IndicatorHelpTooltip
                              title="Passes Décisives"
                              metric="Créativité & Vista"
                              role="Mesure les passes directes converties en but par un coéquipier. Témoigne de la vision tactique, de l'altruisme et de la faculté à créer des opportunités de but."
                            />
                          </div>
                          <Badge className="bg-indigo-500/15 text-indigo-700 border-indigo-500/30 text-[10px] font-black uppercase tracking-widest">
                            {displayStats?.totalContributions || 0} G+A total
                          </Badge>
                        </div>
                        <p className="text-xs font-black text-indigo-900/60 uppercase tracking-widest mb-1">Passes Décisives</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl sm:text-5xl font-black text-indigo-950 tracking-tight">{displayStats?.assists || 0}</span>
                          <span className="text-xs font-bold text-indigo-700 uppercase">assist(s)</span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-indigo-500/15 flex items-center justify-between text-[11px] font-bold text-indigo-800/80">
                          <span>Créativité & vista</span>
                          <span className="font-black text-indigo-900">{((displayStats?.goals || 0) + (displayStats?.assists || 0))} actions décisives</span>
                        </div>
                      </div>

                      {/* 5. DISCIPLINE & CARTONS */}
                      <div className="relative p-6 rounded-[2rem] bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent border border-amber-500/20 shadow-sm hover:shadow-md transition-all group hover:z-30 focus-within:z-30">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 transition-transform group-hover:scale-110">
                              <Shield className="w-6 h-6" />
                            </div>
                            <IndicatorHelpTooltip
                              title="Discipline Arbitrale"
                              metric="Maîtrise & Fair-play"
                              role="Recense les cartons jaunes et rouges reçus. Indique la maîtrise de soi dans les duels disputés, le respect des décisions arbitrales et prévient les suspensions."
                            />
                          </div>
                          <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-[10px] font-black uppercase tracking-widest">
                            {(displayStats?.yellowCards || 0) === 0 && (displayStats?.redCards || 0) === 0 ? 'Discipline ✅' : 'Averti'}
                          </Badge>
                        </div>
                        <p className="text-xs font-black text-amber-900/60 uppercase tracking-widest mb-1">Discipline Arbitrale</p>
                        <div className="flex items-center gap-4 py-1">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-7 bg-amber-400 rounded-[4px] shadow-sm border border-amber-500/40" />
                            <span className="text-3xl font-black text-amber-950">{displayStats?.yellowCards || 0}</span>
                          </div>
                          <div className="w-px h-8 bg-border" />
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-7 bg-red-500 rounded-[4px] shadow-sm border border-red-600/40" />
                            <span className="text-3xl font-black text-red-950">{displayStats?.redCards || 0}</span>
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-amber-500/15 flex items-center justify-between text-[11px] font-bold text-amber-900/80">
                          <span>{displayStats?.yellowCards || 0} Jaune(s)</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>{displayStats?.redCards || 0} Rouge(s)</span>
                        </div>
                      </div>

                      {/* 6. FRÉQUENCE DÉCISIVE / IMPACT */}
                      <div className="relative p-6 rounded-[2rem] bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 shadow-sm hover:shadow-md transition-all group hover:z-30 focus-within:z-30">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-600 transition-transform group-hover:scale-110">
                              <TrendingUp className="w-6 h-6" />
                            </div>
                            <IndicatorHelpTooltip
                              title="Fréquence Décisive"
                              metric="Rentabilité par minute"
                              role="Définit le nombre moyen de minutes nécessaires au joueur pour réaliser une action décisive (but ou assist). Plus ce chiffre est bas, plus son impact par match est élevé."
                            />
                          </div>
                          <Badge className="bg-purple-500/15 text-purple-700 border-purple-500/30 text-[10px] font-black uppercase tracking-widest">
                            Impact Pro
                          </Badge>
                        </div>
                        <p className="text-xs font-black text-purple-900/60 uppercase tracking-widest mb-1">Fréquence Décisive</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl sm:text-5xl font-black text-purple-950 tracking-tight">
                            {displayStats?.totalContributions > 0 && displayStats?.minutes > 0
                              ? Math.round(displayStats.minutes / displayStats.totalContributions)
                              : '-'
                            }
                          </span>
                          <span className="text-xs font-bold text-purple-700 uppercase">{displayStats?.totalContributions > 0 ? 'min / geste décisif' : 'N/A'}</span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-purple-500/15 flex items-center justify-between text-[11px] font-bold text-purple-800/80">
                          <span>Régularité offensive</span>
                          <span className="font-black text-purple-900">{displayStats?.totalContributions || 0} geste(s) clé(s)</span>
                        </div>
                      </div>
                    </div>

                    {/* ── CARD: ÉVOLUTION DES ÉVALUATIONS EN MATCHS AMICAUX ── */}
                    <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-secondary/60 shadow-sm space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-secondary">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                              <Star className="w-4 h-4 fill-amber-500" />
                            </div>
                            <h4 className="text-base font-black uppercase tracking-tight text-slate-900 m-0">
                              Évolution des Évaluations Staff
                            </h4>
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-black uppercase">
                              {evaluatedMatches.length} match{evaluatedMatches.length > 1 ? 's' : ''} noté{evaluatedMatches.length > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-medium">
                            Suivi chronologique des notes (1 à 10) et observations attribuées par le staff (Matchs Amicaux & Compétitions Officielles).
                          </p>
                        </div>

                        {/* Filtres Saison, Mois et Type */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Filtre Type de match */}
                          <div className="flex items-center gap-1.5 bg-secondary/30 p-1 rounded-xl border border-secondary/60">
                            <Shield className="w-3.5 h-3.5 text-muted-foreground ml-2" />
                            <select
                              value={evalTypeFilter}
                              onChange={e => setEvalTypeFilter(e.target.value as any)}
                              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none pr-2 py-1 cursor-pointer"
                            >
                              <option value="ALL">Tous les types</option>
                              <option value="FRIENDLY">🤝 Matchs amicaux</option>
                              <option value="OFFICIAL">🏆 Compétitions officielles</option>
                            </select>
                          </div>

                          {/* Filtre Saison */}
                          <div className="flex items-center gap-1.5 bg-secondary/30 p-1 rounded-xl border border-secondary/60">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground ml-2" />
                            <select
                              value={evalSeasonFilter}
                              onChange={e => setEvalSeasonFilter(e.target.value)}
                              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none pr-2 py-1 cursor-pointer"
                            >
                              <option value="ALL">Toutes les saisons</option>
                              {availableEvalSeasons.map(sz => (
                                <option key={sz} value={sz}>{sz}</option>
                              ))}
                            </select>
                          </div>

                          {/* Filtre Mois */}
                          <div className="flex items-center gap-1.5 bg-secondary/30 p-1 rounded-xl border border-secondary/60">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground ml-2" />
                            <select
                              value={evalMonthFilter}
                              onChange={e => setEvalMonthFilter(e.target.value)}
                              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none pr-2 py-1 cursor-pointer"
                            >
                              <option value="ALL">Tous les mois</option>
                              {availableEvalMonths.map(mCode => (
                                <option key={mCode} value={mCode}>{MONTH_LABELS[mCode] || `Mois ${mCode}`}</option>
                              ))}
                            </select>
                          </div>

                          {(evalSeasonFilter !== 'ALL' || evalMonthFilter !== 'ALL' || evalTypeFilter !== 'ALL') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEvalSeasonFilter('ALL'); setEvalMonthFilter('ALL'); setEvalTypeFilter('ALL'); }}
                              className="h-8 px-2 text-[10px] font-black uppercase text-primary hover:bg-primary/5"
                            >
                              Effacer
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* 4 KPIs de Performance */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-800/70 mb-1">Note Moyenne</p>
                          <p className="text-3xl font-black text-amber-950">{evalKPIs.avg} <span className="text-xs text-amber-700">/10</span></p>
                        </div>
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70 mb-1">Meilleure Note</p>
                          <p className="text-3xl font-black text-emerald-950">{evalKPIs.max} <span className="text-xs text-emerald-700">/10</span></p>
                        </div>
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-800/70 mb-1">Note Minimale</p>
                          <p className="text-3xl font-black text-blue-950">{evalKPIs.min} <span className="text-xs text-blue-700">/10</span></p>
                        </div>
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-purple-800/70 mb-1">Matchs Notés</p>
                          <p className="text-3xl font-black text-purple-950">{evalKPIs.count}</p>
                        </div>
                      </div>

                      {/* Recharts AreaChart */}
                      {evalChartData.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center bg-secondary/10 rounded-2xl border border-dashed border-secondary">
                          <Star className="w-8 h-8 text-muted-foreground/30 mb-2" />
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Aucune évaluation disponible pour ces filtres
                          </p>
                          <p className="text-[11px] text-muted-foreground/60 max-w-sm mt-1">
                            Les notes sont saisies par le staff technique dans la fiche de match (Amicaux et Compétitions).
                          </p>
                        </div>
                      ) : (
                        <div className="h-64 w-full pt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={evalChartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="evalGradColor" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                              <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }}
                              />
                              <YAxis
                                domain={[0, 10]}
                                ticks={[0, 2, 4, 6, 8, 10]}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                              />
                              <RechartsTooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-slate-950 text-white p-3.5 rounded-2xl shadow-2xl border border-white/10 space-y-1.5 text-xs max-w-xs">
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-slate-400 text-[11px]">{data.fullDate || data.date}</span>
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${data.isFriendly ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-400/20 text-emerald-300'}`}>
                                              {data.isFriendly ? '🤝 Amical' : `🏆 ${data.leagueName || 'Officiel'}`}
                                            </span>
                                          </div>
                                          <span className="font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20 text-xs">
                                            ★ {data.rating}/10
                                          </span>
                                        </div>
                                        <p className="font-black text-white text-sm">vs {data.opponent}</p>
                                        <p className="text-slate-300 text-[11px]">Score : <span className="font-bold">{data.score}</span></p>
                                        {data.comment && (
                                          <p className="text-amber-200/90 italic pt-1.5 border-t border-white/10 text-[11px] leading-relaxed">
                                            « {data.comment} »
                                          </p>
                                        )}
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="rating"
                                stroke="#d97706"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#evalGradColor)"
                                dot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                                activeDot={{ r: 7, fill: '#b45309' }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* ── Two-Column Breakdown & Matches Feed ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left: Tactical Game Distribution (5 cols) */}
                      <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-[2.5rem] border border-secondary/60 shadow-sm space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-secondary">
                          <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 m-0">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            <span>Répartition & Ratios Tactiques</span>
                          </h4>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Saison en cours</span>
                        </div>

                        {/* Starter vs Substitute Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-emerald-700 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                              Titulaire ({displayStats?.starts || 0})
                            </span>
                            <span className="text-amber-700 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                              Remplaçant ({displayStats?.subs || 0})
                            </span>
                          </div>
                          <div className="h-4 bg-secondary/60 rounded-full overflow-hidden flex p-0.5 gap-0.5">
                            <div
                              style={{ width: `${displayStats?.matches > 0 ? Math.round(((displayStats.starts || 0) / displayStats.matches) * 100) : 50}%` }}
                              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                              title={`${displayStats?.starts || 0} Titularisations`}
                            />
                            <div
                              style={{ width: `${displayStats?.matches > 0 ? Math.round(((displayStats.subs || 0) / displayStats.matches) * 100) : 50}%` }}
                              className="h-full bg-amber-400 rounded-full transition-all duration-700"
                              title={`${displayStats?.subs || 0} Remplacements`}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground text-right font-medium">
                            {displayStats?.starterRate || 0}% de titularisation dans le XI
                          </p>
                        </div>

                        {/* Playing Time Gauge */}
                        <div className="space-y-2 pt-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-700">Volume de Temps de Jeu</span>
                            <span className="text-primary font-black">{displayStats?.minutes || 0} / {(displayStats?.matches || 1) * 90} min</span>
                          </div>
                          <div className="h-3 bg-secondary rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, Math.round(((displayStats?.minutes || 0) / Math.max(90, (displayStats?.matches || 1) * 90)) * 100))}%` }}
                              className="h-full bg-gradient-to-r from-blue-500 to-primary rounded-full transition-all duration-700"
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                            <span>0 min</span>
                            <span>Temps maximal possible</span>
                          </div>
                        </div>

                        {/* Offensive Breakdown (Goals vs Assists) */}
                        <div className="space-y-2 pt-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-700">Actions Décisives (Buts / Assists)</span>
                            <span className="text-indigo-700 font-black">{((displayStats?.goals || 0) + (displayStats?.assists || 0))} au total</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-center">
                              <p className="text-[9px] font-black uppercase tracking-wider text-primary">Buts</p>
                              <p className="text-xl font-black text-slate-900">{displayStats?.goals || 0}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-150 text-center">
                              <p className="text-[9px] font-black uppercase tracking-wider text-indigo-700">Passes D.</p>
                              <p className="text-xl font-black text-indigo-950">{displayStats?.assists || 0}</p>
                            </div>
                          </div>
                        </div>

                        {/* Performance Note Card */}
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white space-y-2 border border-slate-800">
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <Award className="w-3.5 h-3.5 text-primary" /> Évaluation Technique Staff
                          </p>
                          <p className="text-xs text-slate-300 leading-relaxed font-medium">
                            {(displayStats?.matches || 0) > 0
                              ? `Joueur actif avec ${displayStats?.matches} apparitions. Régularité physique confirmée (${displayStats?.avgMinutes} min/m en moyenne).`
                              : 'Aucune donnée officielle enregistrée pour cette sélection de filtres.'
                            }
                          </p>
                        </div>
                      </div>

                      {/* Right: Match Log (7 cols) */}
                      <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-[2.5rem] border border-secondary/60 shadow-sm space-y-4 flex flex-col">
                        <div className="flex items-center justify-between pb-4 border-b border-secondary shrink-0">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 m-0">
                                Historique des Matchs
                              </h4>
                              <p className="text-[10px] text-muted-foreground font-semibold">
                                {filteredPlayerMatches.length} match(s) disputé(s)
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1">
                            FUS Rabat
                          </Badge>
                        </div>

                        {filteredPlayerMatches.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3 min-h-[300px]">
                            <div className="w-14 h-14 rounded-2xl bg-secondary/80 flex items-center justify-center text-muted-foreground">
                              <Calendar className="w-6 h-6 opacity-40" />
                            </div>
                            <div>
                              <p className="text-sm font-black uppercase text-slate-700">Aucun match trouvé</p>
                              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                                Aucun match ne correspond aux filtres de saison ou de ligue sélectionnés pour ce joueur.
                              </p>
                            </div>
                            {(selectedSeasonFilter !== 'ALL' || selectedLeagueFilter !== 'ALL' || selectedMatchFilter !== 'ALL') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setSelectedSeasonFilter('ALL'); setSelectedLeagueFilter('ALL'); setSelectedMatchFilter('ALL'); }}
                                className="h-9 rounded-xl text-xs font-bold uppercase tracking-wider text-primary border-primary/30 hover:bg-primary/5"
                              >
                                Réinitialiser les filtres
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                            {filteredPlayerMatches.map((m: any) => {
                              const lineup = m.lineup as { startingXI?: string[]; substitutes?: string[] } | null;
                              const mpRecord = m.match_players?.find((p: any) => p.player_id === selectedPlayer.id);
                              const isStarter = mpRecord?.is_starting || lineup?.startingXI?.includes(selectedPlayer.id);
                              const isSub = (mpRecord && !mpRecord.is_starting) || lineup?.substitutes?.includes(selectedPlayer.id);
                              const matchEvents = (rawPlayerEvents || []).filter((e: any) => e.match_id === m.id);

                              const playerGoals = matchEvents.filter((e: any) => e.type === 'goal' && e.player_id === selectedPlayer.id).length;
                              const playerAssists = matchEvents.filter((e: any) => e.type === 'assist' || (e.type === 'goal' && e.related_player_id === selectedPlayer.id)).length;
                              const playerYellows = matchEvents.filter((e: any) => e.type === 'yellow_card' && e.player_id === selectedPlayer.id).length;
                              const playerReds = matchEvents.filter((e: any) => e.type === 'red_card' && e.player_id === selectedPlayer.id).length;

                              const opp = opponentClubs.find((c: any) => c.id === m.opponent_id);
                              const oppName = opp?.name || 'Adversaire';
                              const oppLogo = opp?.logo_url;
                              const dateFormatted = m.match_date ? new Date(m.match_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date inconnue';
                              const isFriendly = !m.league_id || m.category?.toLowerCase().includes('amical') || m.notes?.toLowerCase().includes('amical');
                              const leagueName = isFriendly ? '🤝 Match Amical' : (leagues?.find((l: any) => l.id === m.league_id)?.name || 'Compétition');

                              // Score & Result
                              const homeScore = m.score_home ?? 0;
                              const awayScore = m.score_away ?? 0;
                              const hasScore = m.score_home !== null && m.score_home !== undefined && m.score_away !== null && m.score_away !== undefined;
                              let resultBadge = null;
                              if (hasScore) {
                                const fusScore = m.is_home ? homeScore : awayScore;
                                const oppScore = m.is_home ? awayScore : homeScore;
                                if (fusScore > oppScore) {
                                  resultBadge = <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[9px] font-black px-2 py-0.5 uppercase">Victoire</Badge>;
                                } else if (fusScore < oppScore) {
                                  resultBadge = <Badge className="bg-rose-500/15 text-rose-700 border-rose-500/30 text-[9px] font-black px-2 py-0.5 uppercase">Défaite</Badge>;
                                } else {
                                  resultBadge = <Badge className="bg-slate-500/15 text-slate-700 border-slate-500/30 text-[9px] font-black px-2 py-0.5 uppercase">Nul</Badge>;
                                }
                              }

                              const ratingBadge = mpRecord?.rating != null ? (
                                <Badge className={isFriendly ? "bg-amber-50 text-amber-700 border-amber-300 text-[9px] font-black px-2 py-0.5 gap-1 shadow-sm" : "bg-emerald-50 text-emerald-700 border-emerald-300 text-[9px] font-black px-2 py-0.5 gap-1 shadow-sm"}>
                                  <Star className={`w-2.5 h-2.5 ${isFriendly ? 'text-amber-600 fill-amber-600' : 'text-emerald-600 fill-emerald-600'}`} />
                                  {mpRecord.rating}/10
                                </Badge>
                              ) : null;

                              return (
                                <div
                                  key={m.id}
                                  className="p-4 rounded-2xl bg-secondary/20 hover:bg-secondary/40 border border-secondary/60 transition-all space-y-3"
                                >
                                  <div className="flex items-center justify-between gap-3 flex-wrap">
                                    {/* Opponent & Competition */}
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-secondary p-1.5 flex items-center justify-center shrink-0">
                                        {oppLogo ? (
                                          <img src={oppLogo} alt={oppName} className="w-full h-full object-contain" />
                                        ) : (
                                          <Shield className="w-5 h-5 text-slate-400" />
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-xs font-black uppercase text-slate-900 flex items-center gap-2">
                                          vs {oppName}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-2">
                                          <span>{dateFormatted}</span>
                                          <span>•</span>
                                          <span>{leagueName}</span>
                                        </p>
                                      </div>
                                    </div>

                                    {/* Score and Status */}
                                    <div className="flex items-center gap-2 shrink-0">
                                      {hasScore && (
                                        <div className="text-right">
                                          <p className="text-xs font-black text-slate-900">
                                            {homeScore} - {awayScore}
                                          </p>
                                          {resultBadge}
                                        </div>
                                      )}

                                      {ratingBadge}

                                      {isStarter ? (
                                        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px] font-black uppercase">
                                          Titulaire
                                        </Badge>
                                      ) : isSub ? (
                                        <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-[10px] font-black uppercase">
                                          Remplaçant
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[10px] font-black uppercase">
                                          Convoqué
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Event & Evaluation Badges if any */}
                                  {(playerGoals > 0 || playerAssists > 0 || playerYellows > 0 || playerReds > 0 || (mpRecord?.rating !== undefined && mpRecord?.rating !== null)) && (
                                    <div className="pt-2 border-t border-secondary/60 flex items-center gap-2 flex-wrap text-[11px]">
                                      {mpRecord?.rating !== undefined && mpRecord?.rating !== null && (
                                        <Badge className={`font-black text-[10px] px-2.5 py-0.5 gap-1 shadow-sm ${isFriendly ? 'bg-amber-500/15 text-amber-800 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30'
                                          }`} title={mpRecord.rating_comment || undefined}>
                                          ⭐ Note {isFriendly ? 'amicale' : 'officielle'} : {Number(mpRecord.rating).toFixed(1)}/10
                                          {mpRecord.rating_comment && (
                                            <span className="font-normal italic text-slate-700 ml-1 truncate max-w-[150px]">
                                              « {mpRecord.rating_comment} »
                                            </span>
                                          )}
                                        </Badge>
                                      )}
                                      {playerGoals > 0 && (
                                        <Badge className="bg-primary text-white font-black text-[10px] px-2 py-0.5 border-none gap-1">
                                          ⚽ {playerGoals} But{playerGoals > 1 ? 's' : ''}
                                        </Badge>
                                      )}
                                      {playerAssists > 0 && (
                                        <Badge className="bg-indigo-600 text-white font-black text-[10px] px-2 py-0.5 border-none gap-1">
                                          👟 {playerAssists} Passe{playerAssists > 1 ? 's' : ''} D.
                                        </Badge>
                                      )}
                                      {playerYellows > 0 && (
                                        <Badge className="bg-amber-400 text-amber-950 font-black text-[10px] px-2 py-0.5 border-none gap-1">
                                          🟨 Carton Jaune
                                        </Badge>
                                      )}
                                      {playerReds > 0 && (
                                        <Badge className="bg-red-600 text-white font-black text-[10px] px-2 py-0.5 border-none gap-1">
                                          🟥 Carton Rouge
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Footer Navigation Actions ── */}
                    <div className="flex justify-center items-center gap-4 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setViewState('LIST')}
                        className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-secondary transition-all"
                      >
                        Fermer
                      </Button>
                      <Button
                        onClick={() => handleViewPlayer(selectedPlayer)}
                        className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all"
                      >
                        Consulter Fiche Technique
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        ) : viewState === 'PLANNING' ? (
          <motion.div
            key="planning"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* ── Week Navigator ── */}
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-secondary/40 p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter">Planning Entraînement</h3>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
                    Glisse des jours sur chaque joueur pour saisir leur fiche
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => { setWeekOffset(w => w - 1); setSelectedDays([]); }}
                    className="w-10 h-10 rounded-xl border-secondary"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground min-w-[130px] text-center">
                    {fmtShort(weekDays[0])} — {fmtShort(weekDays[6])}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => { setWeekOffset(w => w + 1); setSelectedDays([]); }}
                    className="w-10 h-10 rounded-xl border-secondary"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Day Chips */}
              <div className="flex gap-3 flex-wrap">
                {weekDays.map(day => {
                  const isSelected = selectedDays.includes(day);
                  const isToday = day === new Date().toISOString().split('T')[0];
                  return (
                    <div
                      key={day}
                      draggable
                      onDragStart={(e) => {
                        const toDrag = isSelected && selectedDays.length > 0 ? selectedDays : [day];
                        e.dataTransfer.setData('planning-days', JSON.stringify(toDrag));
                      }}
                      onClick={() => toggleDay(day)}
                      className={`
                        relative flex flex-col items-center px-5 py-4 rounded-2xl border-2 cursor-grab active:cursor-grabbing
                        select-none transition-all duration-200 group
                        ${isSelected
                          ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105'
                          : isToday
                            ? 'bg-primary/5 border-primary/30 text-primary hover:bg-primary/10'
                            : 'bg-secondary/20 border-secondary hover:border-primary/30 hover:bg-secondary/40'
                        }
                      `}
                    >
                      <GripHorizontal className={`w-3 h-3 mb-1 opacity-40 ${isSelected ? 'text-white' : 'text-muted-foreground'}`} />
                      <span className="text-[11px] font-black uppercase tracking-widest leading-none">
                        {FR_DAYS_SHORT[new Date(day + 'T00:00:00').getDay()]}
                      </span>
                      <span className={`text-[10px] font-bold mt-0.5 ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {new Date(day + 'T00:00:00').getDate()}
                      </span>
                      {isToday && !isSelected && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-white" />
                      )}
                      {isSelected && (
                        <CheckCircle2 className="absolute -top-1 -right-1 w-4 h-4 text-white drop-shadow" />
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedDays.length > 0 && (
                <div className="flex items-center gap-3 text-[11px] text-primary font-black uppercase tracking-widest">
                  <CheckSquare className="w-4 h-4" />
                  {selectedDays.length} jour{selectedDays.length > 1 ? 's' : ''} sélectionné{selectedDays.length > 1 ? 's' : ''}
                  &nbsp;—&nbsp; glisse-les sur un joueur ci-dessous
                  <button
                    onClick={() => setSelectedDays([])}
                    className="ml-4 text-muted-foreground hover:text-red-500 transition-colors font-bold normal-case tracking-normal"
                  >
                    Tout désélectionner
                  </button>
                </div>
              )}
            </div>

            {/* ── Player Grid with Drop Zones ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredPlayers.map((player, idx) => {
                const playerDays = planningData[player.id] || {};
                const weekAssigned = weekDays.filter(d => playerDays[d]);
                return (
                  <motion.div
                    key={player.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.querySelector('[data-dropzone]')?.classList.add('border-primary', 'bg-primary/5', 'scale-[1.02]');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.querySelector('[data-dropzone]')?.classList.remove('border-primary', 'bg-primary/5', 'scale-[1.02]');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.querySelector('[data-dropzone]')?.classList.remove('border-primary', 'bg-primary/5', 'scale-[1.02]');
                      const raw = e.dataTransfer.getData('planning-days');
                      if (!raw) return;
                      const days: string[] = JSON.parse(raw);
                      const adjIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
                      const adjPlayer = filteredPlayers[adjIdx];
                      openScheduleModal(player, adjPlayer, days);
                    }}
                  >
                    <div className="bg-white rounded-[2.5rem] border-2 border-secondary/40 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:border-primary/20">
                      {/* Player Info */}
                      <div className="p-6 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-lg shrink-0">
                          <img
                            src={(player.photo_url && player.photo_url !== 'null')
                              ? player.photo_url
                              : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=random&color=fff&size=200`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm uppercase truncate tracking-tight">{player.full_name}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">
                            #{player.jersey_number} • {player.position}
                          </p>
                        </div>
                        {weekAssigned.length > 0 && (
                          <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase px-3 shrink-0">
                            {weekAssigned.length}j planifié{weekAssigned.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>

                      {/* Assigned days pills */}
                      {weekAssigned.length > 0 && (
                        <div className="px-6 pb-3 flex flex-wrap gap-2">
                          {weekAssigned.map(d => {
                            const entry = playerDays[d];
                            return (
                              <span
                                key={d}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-black uppercase text-white ${ATTENDANCE_BG[entry?.attendance || 'present']}`}
                              >
                                {fmtShort(d)}
                                {entry?.rating > 0 && <span className="opacity-80">• {entry.rating}/10</span>}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Drop Zone */}
                      <div
                        data-dropzone
                        className="mx-4 mb-4 border-2 border-dashed border-secondary/50 rounded-2xl px-4 py-5 flex flex-col items-center justify-center gap-2 transition-all duration-200"
                      >
                        <CalendarDays className="w-5 h-5 text-muted-foreground/30" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">
                          Dépose des jours ici
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {filteredPlayers.length === 0 && (
              <div className="py-32 text-center border-2 border-dashed border-secondary/30 rounded-[3rem]">
                <p className="text-xl font-black uppercase text-muted-foreground/20">Aucun joueur trouvé</p>
              </div>
            )}
          </motion.div>

        ) : viewState === 'BULK_ADD' ? (
          <motion.div key="bulk" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Ajout Multiple de Joueurs</h2>
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                  {bulkRows.filter(r => r.full_name.trim()).length} / {bulkRows.length} joueur{bulkRows.length > 1 ? 's' : ''} prêt{bulkRows.length > 1 ? 's' : ''} à enregistrer
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setViewState('LIST')}
                  disabled={isBulkSaving}
                  className="h-11 px-6 rounded-2xl font-black uppercase text-xs"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleBulkSave}
                  disabled={isBulkSaving || bulkRows.filter(r => r.full_name.trim()).length === 0}
                  className="h-11 px-8 rounded-2xl font-black uppercase text-xs bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 gap-2 transition-all min-w-[175px]"
                >
                  {isBulkSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Enregistrement ({bulkSaveProgress}%)</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-white" />
                      <span>Enregistrer {bulkRows.filter(r => r.full_name.trim()).length > 0 ? `(${bulkRows.filter(r => r.full_name.trim()).length})` : ''}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Barre de Progression d'Enregistrement */}
            {isBulkSaving && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border-2 border-primary/20 rounded-[2rem] p-5 shadow-lg shadow-primary/5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                        Enregistrement des joueurs en cours...
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full font-mono">
                          {bulkSaveProgress}%
                        </span>
                      </p>
                      <p className="text-[11px] font-bold text-muted-foreground mt-0.5">
                        {bulkSavedCount} sur {bulkTotalCount} joueur{bulkTotalCount > 1 ? 's' : ''} enregistré{bulkSavedCount > 1 ? 's' : ''} en base de données
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-xl font-black text-primary font-mono tracking-tight">{bulkSaveProgress}%</span>
                  </div>
                </div>

                <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <motion.div
                    className="h-full bg-gradient-to-r from-red-600 via-primary to-emerald-500 rounded-full shadow-sm"
                    initial={{ width: 0 }}
                    animate={{ width: `${bulkSaveProgress}%` }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            )}

            {/* Sélecteurs communs */}
            <div className="flex items-center gap-4 p-5 bg-white border rounded-[2rem] shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0">Appliquer à tous :</p>
              <div className="flex items-center gap-3 flex-wrap">
                {allowedCategories.filter(c => c !== 'PRO').map(cat => {
                  const isActive = bulkRows.length > 0 && bulkRows.every(r => r.category === cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        const matchingTeam = teams.find(t => t.category === cat);
                        setBulkRows(prev => prev.map(r => ({
                          ...r,
                          category: cat,
                          team_id: matchingTeam?.id || r.team_id
                        })));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                        isActive
                          ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                          : 'bg-secondary/30 hover:bg-primary/20 text-foreground'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
                <div className="h-6 w-px bg-slate-200" />
                <select
                  onChange={e => setBulkRows(prev => prev.map(r => ({ ...r, team_id: e.target.value })))}
                  className="h-8 px-3 rounded-xl text-[11px] font-bold bg-secondary/30 border-transparent outline-none"
                >
                  <option value="">Équipe…</option>
                  {allowedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border rounded-[2rem] overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-secondary/10 border-b">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center w-10">#</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center w-16">Photo</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Nom Complet *</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center w-20">Maillot</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center w-28">Poste</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center w-32">Catégorie</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center w-36">Équipe</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center w-36">Date Naiss.</th>
                    <th className="px-4 py-3 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary/30">
                  {bulkRows.map((row, idx) => (
                    <tr key={row.id} className={`transition-colors ${row.full_name.trim() ? 'bg-emerald-50/30' : 'hover:bg-secondary/5'}`}>
                      <td className="px-4 py-2 text-center text-[11px] font-bold text-muted-foreground">{idx + 1}</td>

                      {/* Photo */}
                      <td className="px-4 py-2">
                        <label className="cursor-pointer block w-11 h-11 mx-auto">
                          <input
                            type="file" accept="image/*" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleBulkPhotoUpload(row.id, f); e.target.value = ''; }}
                          />
                          <div className={`w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center transition-all border-2 ${row.photo_url ? 'border-emerald-300' : 'border-dashed border-slate-200 hover:border-primary'}`}>
                            {row.uploading ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : row.photo_url ? (
                              <img src={row.photo_url} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <Camera className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                        </label>
                      </td>

                      <td className="px-4 py-2">
                        <Input
                          value={row.full_name}
                          onChange={e => updateBulkRow(row.id, 'full_name', e.target.value)}
                          placeholder="Prénom Nom..."
                          className="h-9 text-sm font-semibold border-transparent bg-secondary/20 focus:bg-white rounded-xl"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number" min={1} max={99}
                          value={row.jersey_number}
                          onChange={e => updateBulkRow(row.id, 'jersey_number', Number(e.target.value))}
                          className="h-9 text-sm font-black text-center border-transparent bg-secondary/20 focus:bg-white rounded-xl"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={row.position}
                          onChange={e => updateBulkRow(row.id, 'position', e.target.value)}
                          className="h-9 w-full px-2 rounded-xl text-[11px] font-bold bg-secondary/20 border-transparent outline-none focus:bg-white"
                        >
                          {availablePositions.map(p => (
                            <option key={p.code} value={p.code}>{p.code} — {p.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={row.category}
                          onChange={e => updateBulkRow(row.id, 'category', e.target.value)}
                          className="h-9 w-full px-2 rounded-xl text-[11px] font-bold bg-secondary/20 border-transparent outline-none focus:bg-white"
                        >
                          {allowedCategories.filter(c => c !== 'PRO').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={row.team_id}
                          onChange={e => updateBulkRow(row.id, 'team_id', e.target.value)}
                          className="h-9 w-full px-2 rounded-xl text-[11px] font-bold bg-secondary/20 border-transparent outline-none focus:bg-white"
                        >
                          <option value="">—</option>
                          {allowedTeams.filter(t => !row.category || t.category === row.category).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="date" value={row.birth_date}
                          onChange={e => updateBulkRow(row.id, 'birth_date', e.target.value)}
                          className="h-9 text-xs border-transparent bg-secondary/20 focus:bg-white rounded-xl"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        {bulkRows.length > 1 && (
                          <button onClick={() => removeBulkRow(row.id)} className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Actions bas de tableau */}
              <div className="p-4 border-t border-secondary/30 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => setBulkRows(prev => [...prev, newBulkRow(prev.length, prev[0]?.category)])}
                  className="flex-1 w-full h-11 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center gap-2 text-slate-500 hover:border-primary hover:text-primary transition-all text-[11px] font-black uppercase tracking-widest bg-slate-50/50 hover:bg-white"
                >
                  <UserPlus className="w-4 h-4" /> Ajouter une ligne
                </button>
                <Button
                  type="button"
                  onClick={handleBulkSave}
                  disabled={isBulkSaving || bulkRows.filter(r => r.full_name.trim()).length === 0}
                  className="w-full sm:w-auto h-11 px-8 rounded-2xl font-black uppercase text-xs bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 gap-2 shrink-0 transition-all min-w-[175px]"
                >
                  {isBulkSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Enregistrement ({bulkSaveProgress}%)</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-white" />
                      <span>Enregistrer {bulkRows.filter(r => r.full_name.trim()).length > 0 ? `(${bulkRows.filter(r => r.full_name.trim()).length})` : ''}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>

        ) : null}
      </AnimatePresence>

      {/* ── Schedule Modal (2 joueurs côte à côte) ── */}
      <AnimatePresence>
        {scheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4 md:p-8"
            onClick={(e) => { if (e.target === e.currentTarget) setScheduleModal(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-secondary/30 px-10 py-7 flex items-center justify-between rounded-t-[3rem] z-10">
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter">Fiche Planning</h3>
                  <p className="text-[11px] text-muted-foreground font-bold mt-1 flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-primary" />
                    {scheduleModal.days.map(d => fmtFull(d)).join(' · ')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setScheduleModal(null)}
                  className="w-12 h-12 rounded-2xl bg-secondary/30 hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Modal Body — 2 joueurs côte à côte */}
              <div className={`p-10 grid gap-8 ${scheduleModal.players.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-lg mx-auto'}`}>
                {scheduleModal.players.map(player => {
                  const form = modalForms[player.id] || { attendance: 'present', rating: 0, notes: '' };
                  return (
                    <div key={player.id} className="space-y-6 bg-secondary/10 rounded-[2.5rem] p-8">
                      {/* Player header */}
                      <div className="flex items-center gap-4 pb-5 border-b border-secondary/30">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-white shadow-xl shrink-0">
                          <img
                            src={(player.photo_url && player.photo_url !== 'null')
                              ? player.photo_url
                              : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=random&color=fff&size=200`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="font-black text-lg uppercase italic tracking-tighter leading-none">{player.full_name}</h4>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">#{player.jersey_number} · {player.position}</p>
                        </div>
                      </div>

                      {/* Présence */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Présence</label>
                        <div className="grid grid-cols-2 gap-2">
                          {ATTENDANCE_OPTS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => updateModalForm(player.id, 'attendance', opt.value)}
                              className={`h-11 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border-2 ${form.attendance === opt.value
                                ? `${ATTENDANCE_BG[opt.value]} text-white border-transparent shadow-lg scale-[1.03]`
                                : 'bg-white border-secondary hover:border-primary/20 text-muted-foreground'
                                }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Note de performance */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <Star className="w-3.5 h-3.5 text-primary" /> Note de performance
                        </label>
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                            <button
                              key={n}
                              onClick={() => updateModalForm(player.id, 'rating', n === form.rating ? 0 : n)}
                              className={`flex-1 h-10 rounded-xl text-[11px] font-black transition-all border-2 ${n <= form.rating
                                ? 'bg-primary text-white border-primary shadow-md'
                                : 'bg-white border-secondary text-muted-foreground hover:border-primary/30'
                                }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        {form.rating > 0 && (
                          <p className="text-[10px] font-black text-primary text-right">{form.rating}/10</p>
                        )}
                      </div>

                      {/* Observations */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <NotebookPen className="w-3.5 h-3.5 text-primary" /> Observations
                        </label>
                        <textarea
                          value={form.notes}
                          onChange={(e) => updateModalForm(player.id, 'notes', e.target.value)}
                          placeholder="Notes du coach pour cette session..."
                          rows={3}
                          className="w-full rounded-2xl bg-white border-2 border-secondary focus:border-primary px-5 py-4 text-sm font-medium resize-none outline-none transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-secondary/30 px-10 py-7 flex items-center justify-between rounded-b-[3rem]">
                <Button
                  variant="ghost"
                  onClick={() => setScheduleModal(null)}
                  className="h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-xs"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSavePlanning}
                  className="h-14 px-14 rounded-2xl bg-primary font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Save className="w-5 h-5" /> Enregistrer le Planning
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cropper Modal */}
      <ImageCropperModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        imageSrc={selectedFileUrl}
        onCropComplete={handleCropComplete}
        title={cropTarget === 'celebration_photo_url' ? "Recadrer la Photo de Célébration" : "Recadrer le Portrait du Joueur"}
        description="Ajustez le zoom et positionnez le joueur pour un rendu parfait"
      />

      {/* Sélecteur de Médias Centralisé (Bucket 'medias') */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => setFormData(prev => ({ ...prev, [mediaPickerTarget]: url }))}
        title={mediaPickerTarget === 'celebration_photo_url' ? "Affecter la photo de célébration (But / Arrêt)" : "Affecter la photo officielle depuis la Médiathèque"}
      />

      {/* Generate 22 Fake Players Modal */}
      <AnimatePresence>
        {genModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget && !genRunning) setGenModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-lg uppercase tracking-widest">Générer 22 Joueurs</h3>
                    <p className="text-white/70 text-xs font-medium">Données fictives réalistes (noms marocains)</p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="px-8 py-6 space-y-5">
                {/* Category */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    1. Choisir la catégorie
                  </label>
                  <select
                    value={genCategory}
                    disabled={genRunning}
                    onChange={(e) => { setGenCategory(e.target.value); setGenTeamId(''); }}
                    className="w-full h-12 rounded-2xl border-2 border-secondary bg-secondary/20 px-4 text-sm font-semibold focus:outline-none focus:border-violet-400 transition-all"
                  >
                    <option value="">— Choisir une catégorie —</option>
                    {allowedCategories.filter(c => c !== 'PRO').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Team (conditionally shown) */}
                {genCategory && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      2. Choisir l'équipe
                    </label>
                    {genTeams.length === 0 ? (
                      <div className="h-12 flex items-center justify-center rounded-2xl bg-orange-50 border-2 border-orange-200 text-orange-600 text-xs font-semibold">
                        Aucune équipe trouvée pour la catégorie {genCategory}
                      </div>
                    ) : (
                      <select
                        value={genTeamId}
                        disabled={genRunning}
                        onChange={(e) => setGenTeamId(e.target.value)}
                        className="w-full h-12 rounded-2xl border-2 border-secondary bg-secondary/20 px-4 text-sm font-semibold focus:outline-none focus:border-violet-400 transition-all"
                      >
                        <option value="">— Choisir une équipe —</option>
                        {genTeams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}
                  </motion.div>
                )}

                {/* Progress Bar */}
                {genRunning && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3 pt-2"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Création en cours...</span>
                      <span className="text-violet-600 font-black text-sm">{genProgress} / 22</span>
                    </div>
                    <div className="h-3 bg-secondary/40 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full"
                        animate={{ width: `${(genProgress / 22) * 100}%` }}
                        transition={{ ease: 'easeOut', duration: 0.25 }}
                      />
                    </div>
                    <p className="text-center text-[11px] text-muted-foreground font-medium">
                      {genProgress < 22
                        ? `Joueur ${genProgress + 1} en cours d'ajout...`
                        : 'Finalisation...'}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-5 border-t border-secondary/30 flex items-center justify-between">
                <Button
                  variant="ghost"
                  disabled={genRunning}
                  onClick={() => setGenModal(false)}
                  className="h-11 px-6 rounded-2xl font-black uppercase tracking-widest text-xs"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleGenerateFakePlayers}
                  disabled={!genTeamId || genRunning}
                  className="h-11 px-8 rounded-2xl bg-violet-600 hover:bg-violet-700 font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-violet-500/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {genRunning
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération...</>
                    : <><Sparkles className="w-4 h-4" /> Générer 22 Joueurs</>
                  }
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Surclassement Modal */}
      <AnimatePresence>
        {surclassementPlayer && (
          <SurclassementModalWrapper
            player={surclassementPlayer}
            teams={teams}
            activeByPlayerId={activeByPlayerId}
            createSurclassement={createSurclassement}
            isSurclassing={isSurclassing}
            revertSurclassement={revertSurclassement}
            isReverting={isReverting}
            onClose={handleCloseSurclassement}
          />
        )}
      </AnimatePresence>

      {/* Departure / Transfer Modal */}
      <PlayerDepartureModal
        isOpen={departureModalOpen}
        onClose={() => setDepartureModalOpen(false)}
        player={departurePlayer}
        opponentClubs={opponentClubs}
        onConfirmTransfer={handleConfirmTransfer}
        onConfirmArchive={handleConfirmArchive}
      />

      {/* Dedicated Player Match Calendar Modal */}
      {calendarModalPlayer && (
        <PlayerMatchCalendarModal
          isOpen={!!calendarModalPlayer}
          onClose={() => setCalendarModalPlayer(null)}
          initialPlayer={calendarModalPlayer}
        />
      )}

      {/* Modal Confirmation de Suppression Définitive (US-DASH-57) */}
      <AnimatePresence>
        {playerToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-3xl border border-destructive/20 shadow-2xl p-6 overflow-hidden relative"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Supprimer le joueur</h3>
                  <p className="text-xs text-muted-foreground">Cette action supprimera le joueur de la base</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-secondary/30 border border-secondary mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-secondary flex items-center justify-center font-bold text-sm shrink-0">
                  {playerToDelete.photo_url ? (
                    <img src={playerToDelete.photo_url} alt={playerToDelete.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{playerToDelete.full_name.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-foreground truncate">{playerToDelete.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    #{playerToDelete.jersey_number || '—'} • {playerToDelete.position || 'Non défini'}
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer définitivement <strong className="text-foreground">{playerToDelete.full_name}</strong> de la base de données de l'effectif ?
              </p>

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setPlayerToDelete(null)}
                  disabled={isDeletingPlayer}
                  className="rounded-xl px-5"
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDeletePlayer}
                  disabled={isDeletingPlayer}
                  className="rounded-xl px-5 bg-destructive hover:bg-destructive/90 gap-2"
                >
                  {isDeletingPlayer ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Suppression...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Supprimer définitivement</span>
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Wrapper : charge l'historique du joueur sélectionné ────────────────────
interface WrapperProps {
  player: Player;
  teams: Team[];
  activeByPlayerId: Record<string, any>;
  createSurclassement: (p: any) => Promise<any>;
  isSurclassing: boolean;
  revertSurclassement: (id: string) => Promise<void>;
  isReverting: boolean;
  onClose: () => void;
}

function SurclassementModalWrapper({
  player, teams, activeByPlayerId,
  createSurclassement, isSurclassing,
  revertSurclassement, isReverting,
  onClose,
}: WrapperProps) {
  const { canManageCategory } = usePermissions();
  const activeSurclassement = activeByPlayerId[player.id] ?? null;
  const { data: history = [], isLoading: historyLoading } = usePlayerSurclassements(player.id);

  // Si le joueur est déjà surclassé, son team_id pointe vers l'équipe cible.
  // On utilise original_team_id du surclassement actif comme équipe réelle d'origine.
  const currentTeam = activeSurclassement
    ? teams.find(t => t.id === activeSurclassement.original_team_id)
    : teams.find(t => t.id === player.team_id);

  const handleConfirmSurclasser = async (targetTeamId: string, notes: string, targetJerseyNumber: number | null) => {
    const targetTeam = teams.find(t => t.id === targetTeamId);
    if (!targetTeam || !currentTeam) return;
    if (!canManageCategory(currentTeam.category)) {
      toast.error(`Vous n'avez pas la permission de surclasser un joueur de la catégorie ${currentTeam.category}.`);
      return;
    }
    await createSurclassement({
      player_id: player.id,
      original_team_id: currentTeam.id,
      target_team_id: targetTeamId,
      original_category: currentTeam.category,
      target_category: targetTeam.category,
      notes: notes || null,
      original_jersey_number: player.jersey_number ?? null,
      target_jersey_number: targetJerseyNumber,
    });
    onClose();
  };

  const handleConfirmRevert = async (surclassementId: string) => {
    if (currentTeam && !canManageCategory(currentTeam.category)) {
      toast.error(`Vous n'avez pas la permission de réintégrer un joueur de la catégorie ${currentTeam.category}.`);
      return;
    }
    await revertSurclassement(surclassementId);
    onClose();
  };

  return (
    <SurclassementModal
      player={player}
      teams={teams}
      originalTeam={currentTeam}
      activeSurclassement={activeSurclassement}
      history={history}
      historyLoading={historyLoading}
      isCreating={isSurclassing}
      isReverting={isReverting}
      onConfirmSurclasser={handleConfirmSurclasser}
      onConfirmRevert={handleConfirmRevert}
      onClose={onClose}
    />
  );
}

export default PlayerManagement;
