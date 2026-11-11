



import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { usePlayers } from '../../hooks/usePlayers';
import { useTeams } from '../../hooks/useTeams';
import { useClubData } from '../../hooks/useClubData';
import { resolvePreferredViewMode } from '../../utils/viewModePreference';
import { useCompetitions } from '../../hooks/useCompetitions';
import { useMatches } from '../../hooks/useMatches';
import { useOpponentMatches } from '../../hooks/useOpponentMatches';
import { frmfDataService, type FRMFDataset } from '../../services/frmfDataService';
import {
  getTieRuleBadgeLabel,
  resolveCategoryStandingsWithFrmfFallback,
} from '../../utils/championshipTimelineHelper';
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
  Trophy,
  Clock,
  Target,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Save,
  Loader2,
  CheckSquare,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Flame,
  Zap,
  TrendingUp,
  TrendingDown,
  Shield,
  Filter,
  Image as ImageIcon,
  Play,
  Share2,
  ExternalLink,
  Link as LinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import type { Player, Team, Club } from '../../types';
import { storageService } from '../../services/storageService';
import { supabase } from '../../lib/supabase';
import ImageCropperModal from '../../components/ImageCropperModal';
import { MediaPickerModal } from '../media-management/components/MediaPickerModal';
import { FusLogoLoader } from '../../components/ui/FusLogoLoader';
import { PLAYER_CATEGORIES, NATIONALITIES, PLAYER_POSITIONS, getPositionDetails, matchesPositionFilter, normalizeAgeCategory } from '../../constants';
import { useMetrics } from '../../hooks/useMetrics';

import ErrorEmptyState from '../../components/ErrorEmptyState';
import { useSurclassements, usePlayerSurclassements } from '../../hooks/useSurclassements';
import { isLowerCategory } from '../../services/surclassementService';
import SurclassementModal from './SurclassementModal';
import { usePermissions } from '../../context/PermissionsContext';
import { isScoutBranch } from '../../constants/roles';
import FeatureGate from '../../components/FeatureGate';
import { PlayerMatchCalendarModal } from './components/PlayerMatchCalendarModal';
import PlayerMentionsChart from '../../components/PlayerMentionsChart';
import { usePlayerMentions } from '../../hooks/usePlayerMentions';
import {
  formatPreferredFootFrench,
  filterPlayersForCategoryNav,
  computePlayerMatchSummary,
} from '../../utils/playerProfileHelpers';

const getPositionInfo = (position: string | undefined | null) => getPositionDetails(position);

// ── Types & Helpers pour le Widget Tactique "Position sur le Terrain" (Style BeSoccer FUS) ──
interface TacticalPosition {
  code: string;
  label: string;
  x: number; // 0-100%
  y: number; // 0-100%
  percentage: number;
  isPrimary: boolean;
}

const PITCH_COORDINATES: Record<string, { code: string; label: string; x: number; y: number }> = {
  GK: { code: 'GB', label: 'Gardien de but', x: 50, y: 88 },
  GB: { code: 'GB', label: 'Gardien de but', x: 50, y: 88 },
  GARDIEN: { code: 'GB', label: 'Gardien de but', x: 50, y: 88 },
  CB: { code: 'DC', label: 'Défenseur central', x: 50, y: 72 },
  DC: { code: 'DC', label: 'Défenseur central', x: 50, y: 72 },
  'DÉFENSEUR CENTRAL': { code: 'DC', label: 'Défenseur central', x: 50, y: 72 },
  'DEFENSEUR CENTRAL': { code: 'DC', label: 'Défenseur central', x: 50, y: 72 },
  LB: { code: 'DG', label: 'Latéral gauche', x: 18, y: 68 },
  DG: { code: 'DG', label: 'Latéral gauche', x: 18, y: 68 },
  'LATÉRAL GAUCHE': { code: 'DG', label: 'Latéral gauche', x: 18, y: 68 },
  'LATERAL GAUCHE': { code: 'DG', label: 'Latéral gauche', x: 18, y: 68 },
  'ARRIÈRE GAUCHE': { code: 'DG', label: 'Latéral gauche', x: 18, y: 68 },
  RB: { code: 'DD', label: 'Latéral droit', x: 82, y: 68 },
  DD: { code: 'DD', label: 'Latéral droit', x: 82, y: 68 },
  'LATÉRAL DROIT': { code: 'DD', label: 'Latéral droit', x: 82, y: 68 },
  'LATERAL DROIT': { code: 'DD', label: 'Latéral droit', x: 82, y: 68 },
  'ARRIÈRE DROIT': { code: 'DD', label: 'Latéral droit', x: 82, y: 68 },
  CDM: { code: 'MDC', label: 'Milieu défensif', x: 50, y: 56 },
  MDC: { code: 'MDC', label: 'Milieu défensif', x: 50, y: 56 },
  'MILIEU DÉFENSIF': { code: 'MDC', label: 'Milieu défensif', x: 50, y: 56 },
  'MILIEU DEFENSIF': { code: 'MDC', label: 'Milieu défensif', x: 50, y: 56 },
  CM: { code: 'MC', label: 'Milieu central', x: 50, y: 44 },
  MC: { code: 'MC', label: 'Milieu central', x: 50, y: 44 },
  'MILIEU CENTRAL': { code: 'MC', label: 'Milieu central', x: 50, y: 44 },
  CAM: { code: 'MO', label: 'Milieu offensif', x: 50, y: 32 },
  MO: { code: 'MO', label: 'Milieu offensif', x: 50, y: 32 },
  MOC: { code: 'MO', label: 'Milieu offensif', x: 50, y: 32 },
  'MILIEU OFFENSIF': { code: 'MO', label: 'Milieu offensif', x: 50, y: 32 },
  RW: { code: 'AD', label: 'Ailier droit', x: 82, y: 22 },
  AD: { code: 'AD', label: 'Ailier droit', x: 82, y: 22 },
  'AILIER DROIT': { code: 'AD', label: 'Ailier droit', x: 82, y: 22 },
  'ATTAQUANT DROIT': { code: 'AD', label: 'Ailier droit', x: 82, y: 22 },
  LW: { code: 'AG', label: 'Ailier gauche', x: 18, y: 22 },
  AG: { code: 'AG', label: 'Ailier gauche', x: 18, y: 22 },
  'AILIER GAUCHE': { code: 'AG', label: 'Ailier gauche', x: 18, y: 22 },
  'ATTAQUANT GAUCHE': { code: 'AG', label: 'Ailier gauche', x: 18, y: 22 },
  ST: { code: 'ATT', label: 'Attaquant', x: 50, y: 15 },
  ATT: { code: 'ATT', label: 'Attaquant', x: 50, y: 15 },
  BU: { code: 'ATT', label: 'Attaquant', x: 50, y: 15 },
  ATTAQUANT: { code: 'ATT', label: 'Attaquant', x: 50, y: 15 },
  'AVANT-CENTRE': { code: 'ATT', label: 'Avant-centre', x: 50, y: 15 },
  SS: { code: 'SA', label: 'Second attaquant', x: 50, y: 24 },
  'SECOND ATTAQUANT': { code: 'SA', label: 'Second attaquant', x: 50, y: 24 },
};

const resolvePitchCoordinate = (raw: string | undefined | null) => {
  if (!raw) return PITCH_COORDINATES['MC'];
  const upper = raw.trim().toUpperCase();
  if (PITCH_COORDINATES[upper]) return PITCH_COORDINATES[upper];
  const details = getPositionDetails(raw);
  if (details && PITCH_COORDINATES[details.code]) return PITCH_COORDINATES[details.code];
  if (upper.includes('GARDIEN') || upper.includes('GK')) return PITCH_COORDINATES['GK'];
  if (upper.includes('CENTRAL') || upper.includes('CB')) return PITCH_COORDINATES['CB'];
  if (upper.includes('GAUCHE') && (upper.includes('LAT') || upper.includes('ARR') || upper.includes('DG'))) return PITCH_COORDINATES['LB'];
  if (upper.includes('DROIT') && (upper.includes('LAT') || upper.includes('ARR') || upper.includes('DD'))) return PITCH_COORDINATES['RB'];
  if (upper.includes('DEFENSIF') || upper.includes('MDC')) return PITCH_COORDINATES['CDM'];
  if (upper.includes('OFFENSIF') || upper.includes('CAM')) return PITCH_COORDINATES['CAM'];
  if (upper.includes('MILIEU') || upper.includes('MC')) return PITCH_COORDINATES['CM'];
  if (upper.includes('AILIER') && upper.includes('DROIT')) return PITCH_COORDINATES['RW'];
  if (upper.includes('AILIER') && upper.includes('GAUCHE')) return PITCH_COORDINATES['LW'];
  if (upper.includes('ATTAQUANT') || upper.includes('BUTEUR') || upper.includes('ST')) return PITCH_COORDINATES['ST'];
  return PITCH_COORDINATES['MC'];
};

const formatBirthDateLong = (dob: string | null | undefined): string => {
  if (!dob) return 'Date non renseignée';
  try {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return dob;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dob;
  }
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
  const canSurclassPlayer = hasSubModuleAccess('players', 'surclasser');

  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [isDeletingPlayer, setIsDeletingPlayer] = useState(false);

  const { players, isLoading: playersLoading, isError: playersError, addPlayer, updatePlayer, deletePlayer, bulkDeletePlayers, isBulkDeleting } = usePlayers();
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
      if (age <= 14) return 'U14';
      if (age <= 15) return 'U15';
      if (age <= 16) return 'U16';
      if (age <= 17) return 'U17';
      if (age <= 18) return 'U18';
      if (age <= 21) return 'U21'; // 19, 20 et 21 ans sont en catégorie U21
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
  const {
    activeByPlayerId,
    createSurclassement,
    isCreating: isSurclassing,
    revertSurclassement,
    isReverting,
  } = useSurclassements();

  const queryClient = useQueryClient();

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

  // Settings sync (mode Grille par défaut)
  const preferredViewMode = resolvePreferredViewMode(mainClub, 'grid');
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>(preferredViewMode);
  const [pageSize, setPageSize] = useState(mainClub?.pagination_limit || 10);
  const [currentPage, setCurrentPage] = useState(1);

  React.useEffect(() => {
    setDisplayMode(preferredViewMode);
  }, [preferredViewMode]);

  React.useEffect(() => {
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

  const [viewState, setViewState] = useState<'LIST' | 'FORM' | 'VIEW'>('LIST');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const { playerMentions: selectedPlayerMentions } = usePlayerMentions(selectedPlayer?.id);
  const [profileCategoryFilter, setProfileCategoryFilter] = useState<string>('');

  // ── Gestion du lien Drive / Vidéo Joueur ──
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [driveUrlSaving, setDriveUrlSaving] = useState(false);

  const getPlayerDriveUrl = (player: Player | null | undefined): string => {
    if (!player) return '';
    return (player as any).drive_url || (player as any).video_url || localStorage.getItem(`fus_player_drive_${player.id}`) || '';
  };

  const handleOpenDriveModal = (player: Player) => {
    const current = getPlayerDriveUrl(player);
    setDriveUrlInput(current);
    setDriveModalOpen(true);
  };

  const handleSaveDriveUrl = async () => {
    if (!selectedPlayer) return;
    setDriveUrlSaving(true);
    const cleanUrl = driveUrlInput.trim();
    try {
      if (cleanUrl) {
        localStorage.setItem(`fus_player_drive_${selectedPlayer.id}`, cleanUrl);
      } else {
        localStorage.removeItem(`fus_player_drive_${selectedPlayer.id}`);
      }

      const updated = {
        ...selectedPlayer,
        drive_url: cleanUrl || null,
        video_url: cleanUrl || null,
      } as Player;
      setSelectedPlayer(updated);

      try {
        await supabase
          .from('players')
          .update({ drive_url: cleanUrl || null, video_url: cleanUrl || null } as any)
          .eq('id', selectedPlayer.id);
      } catch (dbErr) {
        console.warn('DB drive_url update note:', dbErr);
      }

      toast.success(cleanUrl ? 'Lien Drive vidéo enregistré avec succès !' : 'Lien Drive supprimé.');
      setDriveModalOpen(false);
    } catch (err: any) {
      console.error('Error saving drive url:', err);
      toast.error("Erreur lors de l'enregistrement du lien Drive");
    } finally {
      setDriveUrlSaving(false);
    }
  };
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

  const [isUploading, setIsUploading] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'photo_url' | 'celebration_photo_url'>('photo_url');
  const [cropTarget, setCropTarget] = useState<'photo_url' | 'celebration_photo_url'>('photo_url');
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);

  // Player Stats State
  const [playerStats, setPlayerStats] = useState<any>(null);
  const { leagues } = useCompetitions();
  const { matches: allFusMatches = [] } = useMatches();
  const { opponentMatches: allOpponentMatches = [] } = useOpponentMatches();
  const [rawPlayerEvents, setRawPlayerEvents] = useState<any[]>([]);
  const [rawPlayerMatches, setRawPlayerMatches] = useState<any[]>([]);

  // ── Profil Tactique BeSoccer (Position sur le Terrain, Forme & Métriques) ──
  const tacticalPositions = useMemo(() => {
    if (!selectedPlayer) return null;

    const primaryCoord = resolvePitchCoordinate(selectedPlayer.position);
    const hasSec = selectedPlayer.secondary_position &&
      selectedPlayer.secondary_position.trim().toLowerCase() !== (selectedPlayer.position || '').trim().toLowerCase();
    const secondaryCoord = hasSec ? resolvePitchCoordinate(selectedPlayer.secondary_position) : null;

    // Analyse des matchs récents joués pour mesurer la distribution tactique
    const positionCounts: Record<string, number> = {};
    let totalTrackedMatches = 0;

    (rawPlayerMatches || []).forEach((m: any) => {
      const mpRecord = (m as any).match_players?.find((p: any) => p.player_id === selectedPlayer.id);
      if (mpRecord && (mpRecord.is_starting || mpRecord.position_index != null)) {
        if (mpRecord.position_index != null) {
          const idx = mpRecord.position_index;
          let posKey = 'MC';
          if (idx === 0) posKey = 'GK';
          else if (idx === 1) posKey = 'RB';
          else if (idx === 2 || idx === 3) posKey = 'CB';
          else if (idx === 4) posKey = 'LB';
          else if (idx === 5) posKey = 'CDM';
          else if (idx === 6) posKey = 'CM';
          else if (idx === 7) posKey = 'CAM';
          else if (idx === 8) posKey = 'RW';
          else if (idx === 9) posKey = 'ST';
          else if (idx === 10) posKey = 'LW';
          positionCounts[posKey] = (positionCounts[posKey] || 0) + 1;
          totalTrackedMatches++;
        }
      }
    });

    if (totalTrackedMatches >= 2) {
      const sorted = Object.entries(positionCounts).sort((a, b) => b[1] - a[1]);
      const topKey = sorted[0][0];
      const topCoord = PITCH_COORDINATES[topKey] || primaryCoord;
      const topPct = Math.round((sorted[0][1] / totalTrackedMatches) * 100);

      const primary: TacticalPosition = {
        code: topCoord.code,
        label: topCoord.label,
        x: topCoord.x,
        y: topCoord.y,
        percentage: topPct,
        isPrimary: true,
      };

      let secondary: TacticalPosition | null = null;
      if (sorted.length > 1) {
        const secKey = sorted[1][0];
        const secCoord = PITCH_COORDINATES[secKey] || secondaryCoord || primaryCoord;
        const secPct = Math.round((sorted[1][1] / totalTrackedMatches) * 100);
        secondary = {
          code: secCoord.code,
          label: secCoord.label,
          x: secCoord.x,
          y: secCoord.y,
          percentage: secPct,
          isPrimary: false,
        };
      } else if (secondaryCoord && secondaryCoord.code !== topCoord.code) {
        secondary = {
          code: secondaryCoord.code,
          label: secondaryCoord.label,
          x: secondaryCoord.x,
          y: secondaryCoord.y,
          percentage: Math.max(5, 100 - topPct),
          isPrimary: false,
        };
      }

      return {
        primary,
        secondary,
        all: [primary, ...(secondary ? [secondary] : [])],
      };
    }

    // Profil standard sans match : basé sur le profil sportif officiel (Excel / Foot'Mine)
    if (secondaryCoord && secondaryCoord.code !== primaryCoord.code) {
      const primary: TacticalPosition = {
        code: primaryCoord.code,
        label: primaryCoord.label,
        x: primaryCoord.x,
        y: primaryCoord.y,
        percentage: 85,
        isPrimary: true,
      };
      const secondary: TacticalPosition = {
        code: secondaryCoord.code,
        label: secondaryCoord.label,
        x: secondaryCoord.x,
        y: secondaryCoord.y,
        percentage: 15,
        isPrimary: false,
      };
      return { primary, secondary, all: [primary, secondary] };
    }

    const primary: TacticalPosition = {
      code: primaryCoord.code,
      label: primaryCoord.label,
      x: primaryCoord.x,
      y: primaryCoord.y,
      percentage: 100,
      isPrimary: true,
    };
    return { primary, secondary: null, all: [primary] };
  }, [selectedPlayer, rawPlayerMatches]);

  // Résumé réel des matchs joués par ce joueur (Derniers matchs + Dernier match)
  const playerMatchSummary = useMemo(() => {
    return computePlayerMatchSummary(
      selectedPlayer?.id,
      rawPlayerMatches || [],
      rawPlayerEvents || [],
      opponentClubs,
      leagues,
      mainClub
    );
  }, [selectedPlayer, rawPlayerMatches, rawPlayerEvents, opponentClubs, leagues, mainClub]);

  const recentFormMatches = playerMatchSummary.recentFormMatches;
  const lastMatchData = playerMatchSummary.lastMatchData;
  const displayStats = selectedPlayer && (rawPlayerEvents.length > 0 || rawPlayerMatches.length > 0)
    ? playerMatchSummary.stats
    : playerStats;

  const handleOpenMatchOverview = (matchId?: string | null) => {
    if (!matchId) return;
    navigate(`/matches?matchId=${encodeURIComponent(matchId)}&tab=overview`);
  };

  // ── Classements : Catégorie Officielle & Catégorie de Surclassement (source FRMF prioritaire) ──
  const [standingsTab, setStandingsTab] = useState<'official' | 'surclassement'>('official');
  const [showAllStandings, setShowAllStandings] = useState(false);
  const [selectedStandingsGroup, setSelectedStandingsGroup] = useState<string | null>(null);
  const [frmfDataset, setFrmfDataset] = useState<FRMFDataset>(() => frmfDataService.getDataset());

  useEffect(() => {
    let mounted = true;
    const syncFrmf = () => {
      frmfDataService.loadFromDatabase().then((res) => {
        if (mounted && res?.dataset) {
          setFrmfDataset(res.dataset);
        }
      });
    };
    syncFrmf();

    const channel = supabase
      .channel('player-mgmt-frmf-standings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'frmf_matches' },
        () => {
          if (mounted) syncFrmf();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const playerOfficialCategory = useMemo(() => {
    return getPlayerCategory(selectedPlayer);
  }, [selectedPlayer, teams]);

  const playerActiveSurclassement = useMemo(() => {
    if (!selectedPlayer) return null;
    return activeByPlayerId[selectedPlayer.id] || null;
  }, [selectedPlayer, activeByPlayerId]);

  const playerSurclassCategory = playerActiveSurclassement?.target_category || null;

  useEffect(() => {
    setSelectedStandingsGroup(null);
    setShowAllStandings(false);
  }, [selectedPlayer?.id, standingsTab, playerOfficialCategory, playerSurclassCategory]);

  const allClubsList = useMemo(() => {
    const list: Club[] = [];
    if (mainClub) list.push(mainClub);
    (opponentClubs || []).forEach(c => {
      if (!list.some(existing => existing.id === c.id)) {
        list.push(c);
      }
    });
    return list;
  }, [mainClub, opponentClubs]);

  const officialStandingsResolution = useMemo(() => {
    if (!selectedPlayer || !playerOfficialCategory) {
      return resolveCategoryStandingsWithFrmfFallback({
        frmfDataset,
        category: null,
      });
    }
    return resolveCategoryStandingsWithFrmfFallback({
      frmfDataset,
      category: playerOfficialCategory,
      availableGroups: frmfDataService.getGroups(playerOfficialCategory),
      requestedGroup: standingsTab === 'official' ? selectedStandingsGroup : null,
      fusMatches: allFusMatches || [],
      opponentMatches: allOpponentMatches || [],
      allClubs: allClubsList,
      mainClub,
    });
  }, [
    selectedPlayer,
    playerOfficialCategory,
    frmfDataset,
    standingsTab,
    selectedStandingsGroup,
    allFusMatches,
    allOpponentMatches,
    allClubsList,
    mainClub,
  ]);

  const surclassStandingsResolution = useMemo(() => {
    if (!selectedPlayer || !playerSurclassCategory) {
      return resolveCategoryStandingsWithFrmfFallback({
        frmfDataset,
        category: null,
      });
    }
    return resolveCategoryStandingsWithFrmfFallback({
      frmfDataset,
      category: playerSurclassCategory,
      availableGroups: frmfDataService.getGroups(playerSurclassCategory),
      requestedGroup: standingsTab === 'surclassement' ? selectedStandingsGroup : null,
      fusMatches: allFusMatches || [],
      opponentMatches: allOpponentMatches || [],
      allClubs: allClubsList,
      mainClub,
    });
  }, [
    selectedPlayer,
    playerSurclassCategory,
    frmfDataset,
    standingsTab,
    selectedStandingsGroup,
    allFusMatches,
    allOpponentMatches,
    allClubsList,
    mainClub,
  ]);

  const officialCategoryStandings = officialStandingsResolution.standings;
  const surclassCategoryStandings = surclassStandingsResolution.standings;

  const currentCategoryForStandings = standingsTab === 'surclassement' && playerSurclassCategory
    ? playerSurclassCategory
    : playerOfficialCategory;

  const activeStandingsResolution = standingsTab === 'surclassement' && playerSurclassCategory
    ? surclassStandingsResolution
    : officialStandingsResolution;

  const activeStandings = activeStandingsResolution.standings;

  const fusStandingRow = useMemo(() => {
    return activeStandings.find(r => r.is_fus);
  }, [activeStandings]);

  const isU21Standings = Boolean(currentCategoryForStandings?.toUpperCase().includes('U21'));

  // Catégories concrètes accessibles dans le sélecteur de profil / pagination
  const profileFilterCategories = useMemo(() => {
    const base = visibleFilterCategories.filter(c => c !== 'ALL').map(c => normalizeAgeCategory(c));
    const playerCat = selectedPlayer ? normalizeAgeCategory(getPlayerCategory(selectedPlayer) || '') : '';
    const merged = [...base];
    if (playerCat && playerCat !== 'ALL' && !merged.includes(playerCat)) {
      merged.push(playerCat);
    }
    return Array.from(new Set(merged)).filter(Boolean);
  }, [visibleFilterCategories, selectedPlayer, teams]);

  const categoryPlayerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    players.forEach(p => {
      const cat = normalizeAgeCategory(getPlayerCategory(p) || '');
      if (cat && canManageCategory(cat)) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [players, teams, canManageCategory]);

  const activeProfileCategory = useMemo(() => {
    const chosen = normalizeAgeCategory(profileCategoryFilter || '');
    if (chosen && chosen !== 'ALL') return chosen;
    if (selectedPlayer) {
      const playerCat = normalizeAgeCategory(getPlayerCategory(selectedPlayer) || '');
      if (playerCat && playerCat !== 'ALL') return playerCat;
    }
    const listCat = normalizeAgeCategory(categoryFilter || '');
    if (listCat && listCat !== 'ALL') return listCat;
    return profileFilterCategories[0] || '';
  }, [profileCategoryFilter, selectedPlayer, categoryFilter, profileFilterCategories, teams]);

  // Pagination strictement bornée à la catégorie active
  const profileNavPlayers = useMemo(() => {
    const manageablePlayers = players.filter(p => canManageCategory(getPlayerCategory(p)));
    return filterPlayersForCategoryNav(manageablePlayers, activeProfileCategory, getPlayerCategory);
  }, [players, activeProfileCategory, canManageCategory, teams]);

  const currentProfileIndex = useMemo(() => {
    if (!selectedPlayer || profileNavPlayers.length === 0) return 0;
    const idx = profileNavPlayers.findIndex(p => p.id === selectedPlayer.id);
    return idx >= 0 ? idx : 0;
  }, [selectedPlayer, profileNavPlayers]);

  const handleProfileCategoryChange = (nextCategory: string) => {
    const normCat = normalizeAgeCategory(nextCategory);
    setProfileCategoryFilter(normCat);
    const catPlayers = filterPlayersForCategoryNav(
      players.filter(p => canManageCategory(getPlayerCategory(p))),
      normCat,
      getPlayerCategory
    );
    if (catPlayers.length === 0) {
      toast.info(`Aucun joueur enregistré dans la catégorie ${normCat}.`);
      return;
    }
    const targetPlayer = catPlayers[0];
    handleViewPlayer(targetPlayer, normCat);
  };

  // Navigation functions for player details (exclusivement limitée à la catégorie active)
  const goToNextPlayer = () => {
    if (!selectedPlayer || profileNavPlayers.length <= 1) return;
    const currentIndex = profileNavPlayers.findIndex(p => p.id === selectedPlayer.id);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % profileNavPlayers.length : 0;
    const nextPlayer = profileNavPlayers[nextIndex];
    if (viewState === 'VIEW') {
      handleViewPlayer(nextPlayer, activeProfileCategory);
    }
  };

  const goToPreviousPlayer = () => {
    if (!selectedPlayer || profileNavPlayers.length <= 1) return;
    const currentIndex = profileNavPlayers.findIndex(p => p.id === selectedPlayer.id);
    const prevIndex = currentIndex <= 0 ? profileNavPlayers.length - 1 : currentIndex - 1;
    const prevPlayer = profileNavPlayers[prevIndex];
    if (viewState === 'VIEW') {
      handleViewPlayer(prevPlayer, activeProfileCategory);
    }
  };

  // Form State
  const [formData, setFormData] = useState<Partial<Player> & {
    category?: string;
    first_name?: string;
    last_name?: string;
    category_number?: number;
    secondary_position?: string;
    birth_year?: number;
  }>({
    full_name: '',
    first_name: '',
    last_name: '',
    category_number: 1,
    jersey_number: 1,
    position: 'FW',
    secondary_position: '',
    birth_date: '2010-01-01',
    birth_year: 2010,
    nationality: 'Maroc',
    height: 160,
    weight: 50,
    preferred_foot: 'right',
    photo_url: '',
    celebration_photo_url: '',
    category: 'U13',
    team_id: ''
  });

  // Calcul dynamique de l'Année de Naissance et de l'Âge de Référence au 01/01/2027
  const derivedBirthYear = useMemo(() => {
    if (!formData.birth_date) return null;
    const y = new Date(formData.birth_date).getFullYear();
    return isNaN(y) ? null : y;
  }, [formData.birth_date]);

  const derivedAgeAt2027 = useMemo(() => {
    if (!formData.birth_date) return null;
    const parts = formData.birth_date.split('-');
    if (parts.length < 3) return null;
    const birthYear = parseInt(parts[0], 10);
    const birthMonth = parseInt(parts[1], 10) - 1;
    const birthDay = parseInt(parts[2], 10);
    if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return null;

    // Date de référence pivot : 01 Janvier 2027 (standard d'éligibilité des catégories)
    const refYear = 2027;
    const refMonth = 0; // Janvier (0-indexed)
    const refDay = 1;

    let age = refYear - birthYear;
    if (refMonth < birthMonth || (refMonth === birthMonth && refDay < birthDay)) {
      age--;
    }
    return age >= 0 ? age : 0;
  }, [formData.birth_date]);

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
    const nameParts = (player.full_name || '').trim().split(/\s+/);
    const parsedFirstName = player.first_name || (nameParts.length > 1 ? nameParts[0] : '');
    const parsedLastName = player.last_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : player.full_name || '');
    setFormData({
      ...player,
      first_name: parsedFirstName,
      last_name: parsedLastName,
      category_number: player.category_number ?? undefined,
      secondary_position: player.secondary_position || '',
      birth_year: player.birth_year ?? (player.birth_date ? new Date(player.birth_date).getFullYear() : undefined),
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
      first_name: '',
      last_name: '',
      category_number: players.length + 1,
      jersey_number: players.length + 1,
      position: 'FW',
      secondary_position: '',
      birth_date: '2012-01-01',
      birth_year: 2012,
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

  const handleViewPlayer = async (player: Player, explicitCategory?: string) => {
    const resolvedCategory = normalizeAgeCategory(explicitCategory || getPlayerCategory(player) || '');
    if (resolvedCategory && resolvedCategory !== 'ALL') {
      setProfileCategoryFilter(resolvedCategory);
    }
    setSelectedPlayer(player);
    setViewState('VIEW');

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

      const { stats } = computePlayerMatchSummary(
        player.id,
        playerMatches || [],
        events || [],
        opponentClubs,
        leagues,
        mainClub
      );

      setPlayerStats(stats);
      setRawPlayerEvents(events || []);
      setRawPlayerMatches(playerMatches || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setPlayerStats({ matches: 0, starts: 0, subs: 0, minutes: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, substitutions: 0, totalContributions: 0, avgMinutes: 0, starterRate: 0 });
    }
  };

  const handleSave = async () => {
    try {
      const resolvedFirst = (formData.first_name || '').trim();
      const resolvedLast = (formData.last_name || '').trim();
      const resolvedFull = (resolvedFirst || resolvedLast)
        ? `${resolvedFirst} ${resolvedLast}`.trim()
        : (formData.full_name || '').trim();

      if (!resolvedFull) {
        toast.error("Veuillez saisir le nom et le prénom du joueur.");
        return;
      }

      const birthYear = formData.birth_date ? new Date(formData.birth_date).getFullYear() : null;

      const sanitizedData = {
        ...formData,
        full_name: resolvedFull,
        first_name: resolvedFirst || null,
        last_name: resolvedLast || null,
        category_number: formData.category_number ? Number(formData.category_number) : null,
        birth_year: birthYear && !isNaN(birthYear) ? birthYear : null,
        secondary_position: formData.secondary_position?.trim() || null,
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
    return <FusLogoLoader fullPage size="lg" label="Chargement de l'effectif joueurs…" />;
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
        {viewState === 'LIST' ? (
          <div
            key="list"
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
                  {paginatedPlayers.map((player) => (
                    <div key={player.id}>
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
                    </div>
                  ))}
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
                                <Badge className={`text-[9px] font-black uppercase gap-1 border ${isSousClass
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
                                          className={`h-9 w-9 rounded-xl transition-all ${activeMob
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
          </div>
        ) : viewState === 'FORM' ? (
          <div
            key="form"
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
                        <div className={`space-y-4 p-6 rounded-3xl border shadow-xs flex flex-col justify-between transition-all ${isGk
                          ? 'bg-emerald-50/60 border-emerald-200'
                          : 'bg-rose-50/60 border-rose-200'
                          }`}>
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                              {isGk ? <Shield className="w-3.5 h-3.5 text-emerald-600" /> : <Flame className="w-3.5 h-3.5 text-rose-600" />}
                              {isGk ? "Célébration Arrêt Décisif" : "Célébration But"}
                            </label>
                            <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 ${isGk
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
                              className={`block aspect-4/3 w-full rounded-2xl bg-white border-2 border-dashed transition-all cursor-pointer overflow-hidden group shadow-inner ${isGk ? 'border-emerald-200 hover:border-emerald-400' : 'border-rose-200 hover:border-rose-400'
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
                              className={`flex-1 gap-1.5 rounded-xl text-[11px] font-bold bg-white h-9 shadow-xs cursor-pointer ${isGk
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
                                className={`flex-1 gap-1.5 rounded-xl text-[11px] font-bold h-9 shadow-xs cursor-pointer ${isGk
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

                {/* ── SECTION IDENTITÉ (Conforme nomenclature officielle FUS) ── */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b pb-2 border-blue-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-6 rounded-md bg-blue-600 shadow-sm" />
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-blue-900 dark:text-blue-200">
                          Identité Officielle
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-medium">Informations d'état civil et matricule</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 shadow-xs">
                      Section Identité
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* N° dans la catégorie */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">
                        N° dans la catégorie
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.category_number ?? ''}
                        onChange={e => setFormData({ ...formData, category_number: parseInt(e.target.value) || undefined })}
                        placeholder="ex. 1"
                        className="h-14 px-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 font-bold text-base focus:ring-2 ring-blue-500/30"
                      />
                    </div>

                    {/* Nom */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">
                        Nom <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        value={formData.last_name || ''}
                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="ex. Benali"
                        className="h-14 px-4 rounded-xl bg-secondary/30 border-none font-bold text-base focus:ring-2 ring-primary/20"
                      />
                    </div>

                    {/* Prénom */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">
                        Prénom <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        value={formData.first_name || ''}
                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="ex. Yassine"
                        className="h-14 px-4 rounded-xl bg-secondary/30 border-none font-bold text-base focus:ring-2 ring-primary/20"
                      />
                    </div>

                    {/* Numéro de Maillot (Match) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">
                        N° Dossard (Match)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        value={formData.jersey_number ?? ''}
                        onChange={e => setFormData({ ...formData, jersey_number: parseInt(e.target.value) || 0 })}
                        className="h-14 px-4 rounded-xl bg-secondary/30 border-none font-bold text-base focus:ring-2 ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                    {/* Date de Naissance (jj/mm/aaaa) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">
                        Date de naissance (jj/mm/aaaa)
                      </label>
                      <Input
                        type="date"
                        value={formData.birth_date || ''}
                        onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                        className="h-14 px-4 rounded-xl bg-secondary/30 border-none font-bold text-sm focus:ring-2 ring-primary/20"
                      />
                    </div>

                    {/* Année de naissance (Calculée automatiquement) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1 flex items-center justify-between">
                        <span>Année de naissance</span>
                        <span className="text-[9px] text-blue-600 font-semibold lowercase">auto</span>
                      </label>
                      <div className="h-14 px-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/40 flex items-center justify-between font-black text-blue-900 dark:text-blue-100 text-base">
                        <span>{derivedBirthYear || '—'}</span>
                        <span className="text-[10px] font-semibold text-blue-600/80 bg-blue-100/70 dark:bg-blue-900/60 px-2 py-0.5 rounded-md">
                          Génération
                        </span>
                      </div>
                    </div>

                    {/* Âge au 01/01/2027 (Calculé automatiquement selon barème officiel) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1 flex items-center justify-between">
                        <span>Âge au 01/01/2027</span>
                        <span className="text-[9px] text-blue-600 font-semibold lowercase">pivot</span>
                      </label>
                      <div className="h-14 px-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/40 flex items-center justify-between font-black text-blue-900 dark:text-blue-100 text-base">
                        <span>{derivedAgeAt2027 !== null ? `${derivedAgeAt2027} ans` : '—'}</span>
                        <Badge variant="outline" className="text-[10px] font-bold border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300">
                          Saison 26/27
                        </Badge>
                      </div>
                    </div>

                    {/* Nationalité */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">
                        Nationalité
                      </label>
                      <select
                        value={formData.nationality || 'Maroc'}
                        onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                        className="w-full h-14 px-4 rounded-xl bg-secondary/30 border-none font-bold text-sm focus:ring-2 ring-primary/20 appearance-none outline-none cursor-pointer"
                      >
                        {NATIONALITIES.map(nat => (
                          <option key={nat} value={nat}>{nat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── SECTION PROFIL SPORTIF (Conforme nomenclature officielle FUS) ── */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between border-b pb-2 border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-6 rounded-md bg-emerald-600 shadow-sm" />
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                          Profil Sportif
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-medium">Catégorie, caractéristiques athlétiques et compétences tactiques</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 shadow-xs">
                      Section Profil Sportif
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Catégorie */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">
                        Catégorie
                      </label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value as any, team_id: '' })}
                        className="w-full h-14 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 font-bold px-4 text-sm outline-none appearance-none cursor-pointer focus:ring-2 ring-emerald-500/30"
                      >
                        {allowedCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Équipe d'affectation */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">
                        Équipe Rattachée
                      </label>
                      <select
                        value={(formData as any).team_id || ''}
                        onChange={e => setFormData({ ...formData, team_id: e.target.value })}
                        className="w-full h-14 rounded-xl bg-secondary/30 border-none font-bold px-4 text-sm outline-none appearance-none cursor-pointer focus:ring-2 ring-primary/20"
                      >
                        <option value="">-- Sans Équipe Spécifique --</option>
                        {allowedTeams.filter(t => t.category === formData.category).map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                        ))}
                      </select>
                    </div>

                    {/* Taille (cm) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">
                        Taille (cm)
                      </label>
                      <Input
                        type="number"
                        min="100"
                        max="230"
                        value={formData.height || ''}
                        onChange={e => setFormData({ ...formData, height: parseFloat(e.target.value) || 0 })}
                        placeholder="ex. 175"
                        className="h-14 px-4 rounded-xl bg-secondary/30 border-none font-bold text-base focus:ring-2 ring-primary/20"
                      />
                    </div>

                    {/* Poids (kg) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">
                        Poids (kg)
                      </label>
                      <Input
                        type="number"
                        min="30"
                        max="130"
                        value={formData.weight || ''}
                        onChange={e => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                        placeholder="ex. 68"
                        className="h-14 px-4 rounded-xl bg-secondary/30 border-none font-bold text-base focus:ring-2 ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                    {/* Poste principal */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">
                        Poste Principal
                      </label>
                      <select
                        value={formData.position}
                        onChange={e => setFormData({ ...formData, position: e.target.value as any })}
                        className="w-full h-14 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 font-bold px-4 outline-none appearance-none cursor-pointer focus:ring-2 ring-emerald-500/30 text-sm"
                      >
                        {availablePositions.map(pos => (
                          <option key={pos.code} value={pos.code}>
                            {pos.emoji ? `${pos.emoji} ` : ''}{pos.code} — {pos.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Poste(s) secondaire(s) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">
                        Poste(s) Secondaire(s)
                      </label>
                      <Input
                        value={formData.secondary_position || ''}
                        onChange={e => setFormData({ ...formData, secondary_position: e.target.value })}
                        placeholder="ex. Ailier Droit, Milieu Offensif (RW, CAM)"
                        className="h-14 px-4 rounded-xl bg-secondary/30 border-none font-bold text-sm focus:ring-2 ring-primary/20"
                      />
                    </div>

                    {/* Pied dominant */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">
                        Pied Dominant
                      </label>
                      <select
                        value={formData.preferred_foot}
                        onChange={e => setFormData({ ...formData, preferred_foot: e.target.value as any })}
                        className="w-full h-14 rounded-xl bg-secondary/30 border-none font-bold px-4 outline-none appearance-none cursor-pointer focus:ring-2 ring-primary/20 text-sm"
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
          </div>
        ) : viewState === 'VIEW' ? (
          <div
            key="view"
            className="max-w-6xl mx-auto space-y-6 pb-16"
          >
            {selectedPlayer && (
              <div className="space-y-6">
                {/* ── 1. Top Navigation & Action Bar ── */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-3xl border border-secondary/70 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setViewState('LIST')}
                      className="h-11 px-4 rounded-2xl border-secondary/80 hover:bg-secondary text-xs font-black uppercase tracking-wider gap-2 shadow-sm transition-all hover:scale-[1.02]"
                    >
                      <ArrowLeft className="w-4 h-4 text-primary" />
                      <span>Retour Effectif</span>
                    </Button>

                    {/* Filtre de catégorie dédié à la navigation de fiche */}
                    <div className="flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-2xl border border-primary/20">
                      <Filter className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 hidden sm:inline">
                        Catégorie
                      </span>
                      <select
                        aria-label="Filtrer par catégorie"
                        value={activeProfileCategory}
                        onChange={(e) => handleProfileCategoryChange(e.target.value)}
                        className="h-8 bg-white border border-secondary/80 rounded-xl px-2.5 text-xs font-black text-slate-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        {profileFilterCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat} ({categoryPlayerCounts[cat] || 0})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center bg-secondary/40 p-1 rounded-2xl border border-secondary/60">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToPreviousPlayer}
                        disabled={profileNavPlayers.length <= 1}
                        className="w-9 h-9 rounded-xl hover:bg-white transition-all disabled:opacity-30"
                        title="Joueur précédent dans cette catégorie"
                      >
                        <PrevIcon className="w-4 h-4" />
                      </Button>
                      <div className="px-3 text-[11px] font-black tracking-widest uppercase text-slate-700 whitespace-nowrap">
                        {profileNavPlayers.length > 0 ? `${currentProfileIndex + 1} / ${profileNavPlayers.length}` : '0 / 0'}
                        {activeProfileCategory && (
                          <span className="ml-1.5 text-[10px] text-primary">• {activeProfileCategory}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToNextPlayer}
                        disabled={profileNavPlayers.length <= 1}
                        className="w-9 h-9 rounded-xl hover:bg-white transition-all disabled:opacity-30"
                        title="Joueur suivant dans cette catégorie"
                      >
                        <NextIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {canUpdatePlayer && canManageCategory(getPlayerCategory(selectedPlayer)) && (
                      <Button
                        onClick={() => handleOpenEdit(selectedPlayer)}
                        className="h-11 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider gap-2 shadow-md shadow-primary/20 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Modifier le Profil</span>
                        <span className="sm:hidden">Modifier</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* ── 2. Top Stats Bar (Ruban BeSoccer Exact) ── */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-white p-3.5 rounded-3xl border border-secondary/70 shadow-sm">
                  {/* Matchs */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 shadow-xs border border-slate-200">
                      <Trophy className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-900 leading-none">{displayStats?.matches || 0}</span>
                      </div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-0.5">Matchs</p>
                    </div>
                  </div>

                  {/* Minutes */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-blue-600 flex items-center justify-center shrink-0 shadow-xs border border-slate-200">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-900 leading-none">{displayStats?.minutes || 0}&apos;</span>
                      </div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-0.5">Minutes</p>
                    </div>
                  </div>

                  {/* Buts */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs border border-slate-200">
                      <Target className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-900 leading-none">{displayStats?.goals || 0}</span>
                        <span className="text-[10px] font-black text-emerald-600 flex items-center">
                          ▲ {displayStats?.minutes && displayStats.minutes > 0 ? ((displayStats.goals / displayStats.minutes) * 90).toFixed(2) : '0.00'}/90&apos;
                        </span>
                      </div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-0.5">Buts</p>
                    </div>
                  </div>

                  {/* Passes D */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs border border-slate-200">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-900 leading-none">{displayStats?.assists || 0}</span>
                        <span className="text-[10px] font-black text-emerald-600 flex items-center">
                          ▲ {displayStats?.minutes && displayStats.minutes > 0 ? ((displayStats.assists / displayStats.minutes) * 90).toFixed(2) : '0.00'}/90&apos;
                        </span>
                      </div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-0.5">Passes D.</p>
                    </div>
                  </div>

                  {/* Cartons */}
                  <div className="col-span-2 sm:col-span-1 flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center gap-1 shrink-0 shadow-xs border border-slate-200">
                      <div className="w-2.5 h-3.5 bg-amber-400 rounded-[2px]" />
                      <div className="w-2.5 h-3.5 bg-rose-500 rounded-[2px]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-amber-500 leading-none">{displayStats?.yellowCards || 0}</span>
                        <span className="text-xl font-black text-slate-400 leading-none">/</span>
                        <span className="text-xl font-black text-rose-500 leading-none">{displayStats?.redCards || 0}</span>
                        <span className="text-[10px] font-black text-rose-600 flex items-center ml-1">
                          ▼ {displayStats?.minutes && displayStats.minutes > 0 ? (((displayStats.yellowCards + displayStats.redCards) / displayStats.minutes) * 90).toFixed(2) : '0.00'}/90&apos;
                        </span>
                      </div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-0.5">Cartons J/R</p>
                    </div>
                  </div>
                </div>

                {/* ── 3. RANGÉE 1 (3 BLOCS SUR 3) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
                  {/* BLOC 1/3 (Gauche) : Identité Joueur */}
                  <div className="bg-white rounded-3xl border border-secondary/70 shadow-sm p-6 flex flex-col justify-between">
                    {(() => {
                      const footDisplay = formatPreferredFootFrench(selectedPlayer.preferred_foot);
                      const primaryPos = getPositionDetails(selectedPlayer.position);
                      const secondaryPos = selectedPlayer.secondary_position
                        ? getPositionDetails(selectedPlayer.secondary_position)
                        : null;
                      const ageValue = calculateAge(selectedPlayer.birth_date);

                      return (
                        <>
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge className="bg-primary text-white border-primary/20 text-[11px] font-black uppercase tracking-wider px-3 py-1 shadow-xs">
                                  Catégorie {playerOfficialCategory || 'Non assignée'}
                                </Badge>
                                {playerSurclassCategory && (
                                  <Badge className="bg-amber-500/15 text-amber-800 border border-amber-300 text-[10px] font-black uppercase px-2.5 py-0.5">
                                    Surclassé {playerSurclassCategory}
                                  </Badge>
                                )}
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                  • {mainClub?.name || 'FUS Rabat'}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                                title="Partager le profil"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="text-center mb-5">
                              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-tight">
                                {selectedPlayer.full_name}
                              </h2>
                            </div>

                            {/* Ligne 1 : Mensurations physiques (groupement logique) */}
                            <div className="grid grid-cols-4 gap-2 text-center py-3.5 border-t border-slate-100">
                              <div className="space-y-0.5">
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Âge</p>
                                <p className="text-xl font-black text-slate-900 leading-none">{ageValue > 0 ? ageValue : '—'}</p>
                                <p className="text-[10px] font-bold text-muted-foreground">{ageValue > 0 ? 'ans' : '—'}</p>
                              </div>

                              <div className="space-y-0.5">
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Taille</p>
                                <p className="text-xl font-black text-slate-900 leading-none">{selectedPlayer.height || '—'}</p>
                                <p className="text-[10px] font-bold text-muted-foreground">{selectedPlayer.height ? 'cm' : 'n/d'}</p>
                              </div>

                              <div className="space-y-0.5">
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Poids</p>
                                <p className="text-xl font-black text-slate-900 leading-none">{selectedPlayer.weight || '—'}</p>
                                <p className="text-[10px] font-bold text-muted-foreground">{selectedPlayer.weight ? 'kg' : 'n/d'}</p>
                              </div>

                              <div className="space-y-0.5">
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Pied fort</p>
                                <div className="flex justify-center">
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-xs">
                                    {footDisplay.code}
                                  </span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-700 truncate" title={footDisplay.label}>
                                  {footDisplay.label}
                                </p>
                              </div>
                            </div>

                            {/* Ligne 2 : Repères sportifs & civils */}
                            <div className="grid grid-cols-4 gap-2 text-center py-3.5 border-y border-slate-100 bg-slate-50/50 rounded-2xl">
                              <div className="space-y-1 px-1">
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Nationalité</p>
                                <div className="w-7 h-7 mx-auto rounded-full overflow-hidden border border-slate-200 flex items-center justify-center text-sm shadow-xs bg-white">
                                  🇲🇦
                                </div>
                                <p className="text-[10px] font-bold text-slate-700 truncate">{selectedPlayer.nationality || 'Maroc'}</p>
                              </div>

                              <div className="space-y-1 px-1">
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Poste</p>
                                <div className="w-7 h-7 mx-auto rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                                  {primaryPos.code || '—'}
                                </div>
                                <p className="text-[10px] font-bold text-slate-700 truncate" title={primaryPos.label}>
                                  {primaryPos.label}
                                </p>
                              </div>

                              <div className="space-y-1 px-1">
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Poste sec.</p>
                                <div className="w-7 h-7 mx-auto rounded-full bg-slate-200 text-slate-800 text-[10px] font-black flex items-center justify-center shadow-xs">
                                  {secondaryPos ? secondaryPos.code : '—'}
                                </div>
                                <p className="text-[10px] font-bold text-slate-600 truncate" title={secondaryPos?.label || 'Spécialiste'}>
                                  {secondaryPos ? secondaryPos.label : 'Spécialiste'}
                                </p>
                              </div>

                              <div className="space-y-1 px-1">
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Maillot</p>
                                <div className="w-7 h-7 mx-auto rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                                  {selectedPlayer.jersey_number ?? '•'}
                                </div>
                                <p className="text-[10px] font-bold text-slate-700">
                                  {selectedPlayer.jersey_number ? `N° ${selectedPlayer.jersey_number}` : 'Non défini'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 text-center">
                            <p className="text-[11px] font-medium text-muted-foreground">
                              Né(e) le {formatBirthDateLong(selectedPlayer.birth_date)}
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* BLOC 2/3 (Centre) : Dernier Match réellement disputé par ce joueur */}
                  <div
                    role={lastMatchData?.id ? 'button' : undefined}
                    tabIndex={lastMatchData?.id ? 0 : undefined}
                    onClick={() => lastMatchData?.id && handleOpenMatchOverview(lastMatchData.id)}
                    onKeyDown={(e) => {
                      if (lastMatchData?.id && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleOpenMatchOverview(lastMatchData.id);
                      }
                    }}
                    title={lastMatchData?.id ? 'Ouvrir la vue complète de ce match' : undefined}
                    className={`bg-white rounded-3xl border border-secondary/70 shadow-sm p-6 flex flex-col justify-between transition-all ${
                      lastMatchData?.id ? 'cursor-pointer hover:border-primary/40 hover:shadow-md group' : ''
                    }`}
                  >
                    {lastMatchData ? (
                      <>
                        <div>
                          <div className="border-b border-secondary/60 pb-3 mb-3 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 group-hover:text-primary transition-colors">
                                Dernier Match
                              </h3>
                              <p className="text-[11px] font-medium text-muted-foreground truncate">
                                {lastMatchData.compName}, {lastMatchData.timeAgoStr} • {lastMatchData.isHome ? 'Domicile' : 'Extérieur'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="outline" className="border-slate-200 text-slate-600 text-[10px] font-bold">
                                {lastMatchData.statusLabel}
                              </Badge>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </div>

                          {/* Face à face Domicile (gauche) - Extérieur (droite) & Score exact */}
                          <div className="flex items-center justify-between py-3 px-1 gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {lastMatchData.homeLogo ? (
                                <img src={lastMatchData.homeLogo} alt={lastMatchData.homeAbbr} className="w-8 h-8 object-contain shrink-0" />
                              ) : (
                                <div className={`w-8 h-8 rounded-full font-black text-[10px] flex items-center justify-center shrink-0 ${lastMatchData.isHome ? 'bg-primary text-white' : 'bg-slate-200 text-slate-700'}`}>
                                  {lastMatchData.homeAbbr}
                                </div>
                              )}
                              <span className={`text-xs font-black truncate ${lastMatchData.isHome ? 'text-slate-900' : 'text-slate-700'}`}>
                                {lastMatchData.homeName}
                              </span>
                            </div>

                            <div className="px-2 text-center shrink-0">
                              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                {lastMatchData.hasScore ? `${lastMatchData.sHome} - ${lastMatchData.sAway}` : '— : —'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                              <span className={`text-xs font-black truncate text-right ${!lastMatchData.isHome ? 'text-slate-900' : 'text-slate-700'}`}>
                                {lastMatchData.awayName}
                              </span>
                              {lastMatchData.awayLogo ? (
                                <img src={lastMatchData.awayLogo} alt={lastMatchData.awayAbbr} className="w-8 h-8 object-contain shrink-0" />
                              ) : (
                                <div className={`w-8 h-8 rounded-full font-black text-[10px] flex items-center justify-center shrink-0 ${!lastMatchData.isHome ? 'bg-primary text-white' : 'bg-slate-200 text-slate-700'}`}>
                                  {lastMatchData.awayAbbr}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Timeline réelle de participation du joueur */}
                          {(() => {
                            const total = Math.max(1, lastMatchData.totalMinutes || 90);
                            const startPct = lastMatchData.subInMinute != null
                              ? Math.min(95, Math.max(0, (lastMatchData.subInMinute / total) * 100))
                              : 0;
                            const endMin = lastMatchData.subOutMinute != null
                              ? lastMatchData.subOutMinute
                              : (lastMatchData.subInMinute != null ? Math.min(total, lastMatchData.subInMinute + lastMatchData.playedMinutes) : lastMatchData.playedMinutes);
                            const endPct = Math.min(100, Math.max(startPct + 3, (endMin / total) * 100));

                            return (
                              <div className="mt-5 pt-2">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-black uppercase text-slate-400">Timeline du Match</span>
                                  <div className="flex items-center gap-1 text-slate-600 text-xs font-black">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{lastMatchData.totalMinutes}&apos;</span>
                                  </div>
                                </div>

                                <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-visible">
                                  <div
                                    className="absolute top-0 bottom-0 bg-[#2e7d32] rounded-full"
                                    style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
                                  />
                                  {lastMatchData.goalMinutes.map((gMin, idx) => (
                                    <div
                                      key={`${gMin}-${idx}`}
                                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                                      style={{ left: `${Math.min(94, Math.max(6, (gMin / total) * 100))}%` }}
                                    >
                                      <div className="w-1 h-4 bg-white border border-slate-300 rounded-full -mt-0.5 shadow-xs" />
                                      <div className="flex flex-col items-center mt-1">
                                        <span className="text-xs leading-none">⚽</span>
                                        <span className="text-[9px] font-black text-[#2e7d32]">{gMin}&apos;</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="font-semibold text-slate-700 truncate">{lastMatchData.roleLabel}</span>
                          {lastMatchData.rating != null ? (
                            <span className="text-[10px] font-black text-emerald-700 uppercase shrink-0">
                              Note : {lastMatchData.rating.toFixed(1)}/10
                            </span>
                          ) : lastMatchData.hasScore ? (
                            <span className={`text-[10px] font-black uppercase shrink-0 ${
                              lastMatchData.isWin ? 'text-emerald-600' : lastMatchData.isDraw ? 'text-amber-600' : 'text-rose-600'
                            }`}>
                              {lastMatchData.isWin ? 'Victoire' : lastMatchData.isDraw ? 'Match nul' : 'Défaite'}
                            </span>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="border-b border-secondary/60 pb-3 mb-3 flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                              Dernier Match
                            </h3>
                            <p className="text-[11px] font-medium text-muted-foreground">
                              Aucune rencontre disputée
                            </p>
                          </div>
                          <Badge variant="outline" className="border-slate-200 text-slate-400 text-[10px] font-bold">
                            En attente
                          </Badge>
                        </div>

                        <div className="my-4 p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1.5">
                          <Calendar className="w-6 h-6 text-slate-400 mx-auto" />
                          <p className="text-xs font-bold text-slate-700">
                            Aucun match joué pour le moment
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Le dernier match de {selectedPlayer.full_name} s&apos;affichera ici dès sa participation à une rencontre terminée.
                          </p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Statut : 0 match joué</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">—</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BLOC 3/3 (Droite) : FUSTV / Média Vidéo Joueur (Image 5 BeSoccer) */}
                  <div className="bg-white rounded-3xl border border-secondary/70 shadow-sm p-6 relative overflow-hidden flex flex-col items-center justify-between text-center min-h-[300px]">
                    {/* Motif Polka Dot BeSoccer */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-35"
                      style={{
                        backgroundImage: 'radial-gradient(#94a3b8 1.5px, transparent 1.5px)',
                        backgroundSize: '16px 16px',
                      }}
                    />

                    <div className="relative z-10 w-full flex items-center justify-between">
                      {/* Statut lien Drive */}
                      {getPlayerDriveUrl(selectedPlayer) ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          <ExternalLink className="w-2.5 h-2.5" /> Drive actif
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400">Aucun lien</span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenDriveModal(selectedPlayer)}
                        className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl bg-white/90 border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 shadow-2xs transition-all"
                        title="Configurer le lien Drive"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Gérer le lien</span>
                      </button>
                    </div>

                    {/* Photo centrale du joueur et lien vidéo placé proprement AU-DESSOUS */}
                    <div className="relative z-10 my-3 flex flex-col items-center gap-3.5">
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white p-1.5 shadow-xl border border-slate-200 overflow-hidden mx-auto">
                        <img
                          src={(selectedPlayer.photo_url && selectedPlayer.photo_url !== 'null') ? selectedPlayer.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPlayer.full_name)}&background=1e293b&color=fff&size=256`}
                          alt={selectedPlayer.full_name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>

                      {getPlayerDriveUrl(selectedPlayer) ? (
                        <button
                          type="button"
                          onClick={() => window.open(getPlayerDriveUrl(selectedPlayer), '_blank', 'noopener,noreferrer')}
                          className="bg-white/95 backdrop-blur-sm border border-emerald-300 hover:border-emerald-500 rounded-2xl shadow-sm px-4 py-2 flex items-center gap-2 hover:scale-105 transition-all cursor-pointer group"
                          title="Ouvrir la vidéo / le lien Google Drive"
                        >
                          <div className="w-6 h-6 rounded-full bg-[#2e7d32] text-white flex items-center justify-center shadow-xs group-hover:bg-emerald-700">
                            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                          </div>
                          <span className="text-[11px] font-black text-[#2e7d32] whitespace-nowrap">Lecture de la vidéo</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenDriveModal(selectedPlayer)}
                          className="bg-white/95 backdrop-blur-sm border-2 border-dashed border-emerald-400 hover:border-emerald-600 rounded-2xl shadow-sm px-4 py-1.5 flex items-center gap-2 hover:scale-105 transition-all cursor-pointer group"
                          title="Cliquer pour associer un lien Google Drive"
                        >
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:bg-emerald-700">
                            <LinkIcon className="w-3 h-3" />
                          </div>
                          <span className="text-[11px] font-black text-emerald-700 whitespace-nowrap">+ Ajouter lien Drive</span>
                        </button>
                      )}
                    </div>

                    {/* Logo FUSTV en bas */}
                    <div className="relative z-10 flex items-center justify-center gap-1.5 pt-1">
                      <div className="w-5 h-5 rounded-md bg-[#2e7d32] text-white flex items-center justify-center text-[10px] font-black">
                        ▶
                      </div>
                      <span className="font-black text-sm tracking-tight text-slate-900">
                        FUS<span className="text-[#2e7d32]">TV</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── 4. RANGÉE 2 (3 BLOCS SUR 3) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
                  {/* BLOC 1/3 (Gauche) : Données Personnelles (Tableau BeSoccer, Sauf Info Carrière) */}
                  <div className="bg-white rounded-3xl border border-secondary/70 shadow-sm p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-secondary/60 pb-3 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-4 bg-primary rounded-full" />
                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                            Données Personnelles
                          </h3>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold text-slate-600 border-slate-200">
                          Fiche Civile
                        </Badge>
                      </div>

                      <div className="divide-y divide-slate-100 text-xs">
                        <div className="py-2 flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Pays de naissance</span>
                          <span className="font-black text-slate-900 flex items-center gap-1">
                            🇲🇦 {selectedPlayer.nationality || 'Maroc'}
                          </span>
                        </div>

                        <div className="py-2 flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Date de naissance</span>
                          <span className="font-black text-slate-900">
                            {formatBirthDateLong(selectedPlayer.birth_date)}
                          </span>
                        </div>

                        <div className="py-2 flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Catégorie officielle</span>
                          <Badge className="bg-primary/10 text-primary border border-primary/25 font-black text-[11px] px-2.5 py-0.5">
                            {playerOfficialCategory || 'Non assignée'}
                          </Badge>
                        </div>

                        <div className="py-2 flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Pied préférentiel</span>
                          <span className="font-black text-slate-900">
                            {formatPreferredFootFrench(selectedPlayer.preferred_foot).label}
                          </span>
                        </div>

                        <div className="py-2 flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Poste de prédilection</span>
                          <span className="font-black text-slate-900 truncate max-w-[160px] text-right">
                            {selectedPlayer.position ? getPositionDetails(selectedPlayer.position).label : 'Non renseigné'}
                          </span>
                        </div>

                        <div className="py-2 flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Poste secondaire</span>
                          <span className="font-black text-slate-900 truncate max-w-[160px] text-right">
                            {selectedPlayer.secondary_position ? getPositionDetails(selectedPlayer.secondary_position).label : 'Spécialisation unique'}
                          </span>
                        </div>

                        <div className="py-2 flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Statut au centre</span>
                          <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                            Pensionnaire / Interne
                          </span>
                        </div>

                        <div className="py-2 flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Matricule officiel</span>
                          <span className="font-mono font-bold text-slate-600">
                            {selectedPlayer.id ? `FUS-${selectedPlayer.id.slice(0, 8).toUpperCase()}` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Académie Fath Union Sport</span>
                      <span className="text-slate-500 font-bold">Rabat</span>
                    </div>
                  </div>

                  {/* BLOC 2/3 (Centre) : Forme Lors des Derniers Matchs (Image 4 BeSoccer) */}
                  <div className="bg-white rounded-3xl border border-secondary/70 shadow-sm p-6 flex flex-col justify-between">
                    <div>
                      {/* En-tête avec barre verte/rouge BeSoccer */}
                      <div className="flex items-center justify-between border-b border-secondary/60 pb-3 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-4 bg-emerald-500 rounded-full" />
                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                            Forme lors des derniers matchs
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => selectedPlayer && setCalendarModalPlayer(selectedPlayer)}
                          className="text-[10px] font-black text-emerald-600 uppercase cursor-pointer hover:underline"
                        >
                          PLUS
                        </button>
                      </div>

                      {/* Les 4 colonnes de matchs BeSoccer */}
                      {recentFormMatches.length > 0 ? (
                        <div className="grid grid-cols-4 divide-x divide-slate-100 -mx-2">
                          {recentFormMatches.map((m: any) => (
                            <div
                              key={m.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleOpenMatchOverview(m.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleOpenMatchOverview(m.id);
                                }
                              }}
                              title="Ouvrir la vue complète de ce match"
                              className="px-2 py-1.5 text-center space-y-1.5 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                              {/* Logos face à face */}
                              <div className="flex items-center justify-center gap-1">
                                {m.fusLogo ? (
                                  <img src={m.fusLogo} alt={m.fusAbbr} className="w-5 h-5 object-contain" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-primary text-white text-[8px] font-black flex items-center justify-center">
                                    {m.fusAbbr}
                                  </div>
                                )}
                                {m.oppLogo ? (
                                  <img src={m.oppLogo} alt={m.oppAbbr} className="w-5 h-5 object-contain" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[8px] font-black flex items-center justify-center">
                                    {m.oppAbbr}
                                  </div>
                                )}
                              </div>

                              {/* Abréviation match */}
                              <p className="text-[10px] font-black text-slate-800 truncate" title={`${m.oppName} (${m.isHome ? 'Domicile' : 'Extérieur'})`}>
                                {m.isHome ? `${m.fusAbbr} - ${m.oppAbbr}` : `${m.oppAbbr} - ${m.fusAbbr}`}
                              </p>

                              {/* Score réel du point de vue FUS */}
                              <p className={`text-base font-black ${
                                !m.hasScore ? 'text-slate-400' : m.isWin ? 'text-emerald-600' : m.isDraw ? 'text-amber-500' : 'text-rose-600'
                              }`}>
                                {m.hasScore ? `${m.fusScore} - ${m.oppScore}` : '- -'}
                              </p>

                              {/* Date */}
                              <p className="text-[9px] font-bold text-muted-foreground leading-none">{m.dateStr}</p>

                              {/* Badge Compétition réel */}
                              <div className="pt-0.5">
                                <span className="text-[8px] font-black uppercase text-slate-500 truncate block">
                                  🏆 {m.compLabel}
                                </span>
                              </div>

                              {/* Minutes en pill vert pastel BeSoccer */}
                              <div className="pt-1">
                                <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800 text-[9px] font-black">
                                  {m.minutes}&apos;
                                </span>
                              </div>

                              {/* But ⚽ si marqué */}
                              {m.goals > 0 && (
                                <div className="flex items-center justify-center gap-0.5 text-xs">
                                  <span>⚽</span>
                                  {m.goals > 1 && (
                                    <span className="w-3.5 h-3.5 rounded-full bg-primary text-white text-[8px] font-black flex items-center justify-center">
                                      {m.goals}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Évolution : Flèche haut en vert (victoire), bas en rouge (défaite), tiret (nul) */}
                              <div className="pt-1.5 flex items-center justify-center">
                                {m.isWin ? (
                                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 font-black text-[10px]" title="Victoire (+3 pts)">
                                    <TrendingUp className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                    <span>▲ +3</span>
                                  </div>
                                ) : m.isLoss ? (
                                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-700 font-black text-[10px]" title="Défaite (0 pt)">
                                    <TrendingDown className="w-3 h-3 text-rose-600 stroke-[3]" />
                                    <span>▼ 0</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-700 font-black text-[10px]" title="Match Nul (1 pt)">
                                    <span className="text-xs font-black leading-none">=</span>
                                    <span>1 pt</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-xs text-muted-foreground bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          Aucun match officiel récent enregistré.
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Feuilles de match officielles</span>
                      <span className="text-slate-500 font-bold">{recentFormMatches.length} disputés</span>
                    </div>
                  </div>

                  {/* BLOC 3/3 (Droite) : Position sur le Terrain (Mini-Terrain Vert Tactique BeSoccer) */}
                  <div className="bg-white rounded-3xl border border-secondary/70 shadow-sm p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-secondary/60 pb-3 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-4 bg-emerald-600 rounded-full" />
                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                            Position sur le terrain
                          </h3>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] font-black uppercase">
                          Disposition
                        </Badge>
                      </div>

                      {/* Mini-Terrain Vert SVG et Pastilles */}
                      <div className="relative w-full aspect-[1/1.25] max-w-[210px] mx-auto rounded-2xl overflow-hidden shadow-md border-2 border-emerald-800/40 bg-gradient-to-b from-[#1b6b2e] via-[#237a37] to-[#1b6b2e] select-none my-1">
                        {/* Bandes de tonte horizontales */}
                        <div className="absolute inset-0 flex flex-col pointer-events-none opacity-20">
                          {[...Array(8)].map((_, i) => (
                            <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-black/15' : 'bg-white/10'}`} />
                          ))}
                        </div>

                        {/* Lignes du terrain en SVG */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 135" fill="none">
                          {/* Contour extérieur */}
                          <rect x="6" y="6" width="88" height="123" rx="2" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />
                          {/* Ligne médiane */}
                          <line x1="6" y1="67.5" x2="94" y2="67.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />
                          {/* Cercle central */}
                          <circle cx="50" cy="67.5" r="14" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />
                          <circle cx="50" cy="67.5" r="1.5" fill="rgba(255,255,255,0.85)" />

                          {/* Surface haute */}
                          <rect x="25" y="6" width="50" height="22" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />
                          <rect x="36" y="6" width="28" height="8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />
                          <path d="M 40 28 A 10 10 0 0 0 60 28" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />

                          {/* Surface basse */}
                          <rect x="25" y="107" width="50" height="22" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />
                          <rect x="36" y="121" width="28" height="8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />
                          <path d="M 40 107 A 10 10 0 0 1 60 107" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />

                          {/* Flèche d'attaque BeSoccer */}
                          <line x1="50" y1="80" x2="50" y2="45" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeDasharray="3 3" />
                          <polygon points="50,38 46,46 54,46" fill="rgba(255,255,255,0.4)" />
                        </svg>

                        {/* Pastilles tactiques */}
                        {tacticalPositions && (
                          <>
                            {/* Position Secondaire */}
                            {tacticalPositions.secondary && (
                              <div
                                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                                style={{ left: `${tacticalPositions.secondary.x}%`, top: `${tacticalPositions.secondary.y}%` }}
                              >
                                <div
                                  className="w-7 h-7 rounded-full bg-slate-900/85 text-white text-[9px] font-black flex items-center justify-center border-2 border-white/80 shadow-md cursor-pointer hover:scale-110 transition-transform"
                                  title={`${tacticalPositions.secondary.label} (${tacticalPositions.secondary.percentage}%)`}
                                >
                                  {tacticalPositions.secondary.code}
                                </div>
                              </div>
                            )}

                            {/* Position Principale */}
                            <div
                              className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                              style={{ left: `${tacticalPositions.primary.x}%`, top: `${tacticalPositions.primary.y}%` }}
                            >
                              <div className="relative">
                                <div className="absolute -inset-1 rounded-full bg-amber-400/40 animate-ping" />
                                <div
                                  className="relative w-8 h-8 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xl ring-2 ring-amber-400/50 cursor-pointer hover:scale-110 transition-transform"
                                  title={`${tacticalPositions.primary.label} (${tacticalPositions.primary.percentage}%)`}
                                >
                                  {tacticalPositions.primary.code}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Légende BeSoccer */}
                      {tacticalPositions && (
                        <div className="space-y-1.5 pt-2 text-xs">
                          <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/25">
                            <span className="font-bold text-slate-800 text-[11px] truncate">
                              {tacticalPositions.primary.label}
                            </span>
                            <Badge className="bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.2 shrink-0">
                              {tacticalPositions.primary.percentage}%
                            </Badge>
                          </div>

                          {tacticalPositions.secondary && (
                            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                              <span className="font-medium text-slate-700 text-[11px] truncate">
                                {tacticalPositions.secondary.label}
                              </span>
                              <Badge variant="outline" className="text-slate-700 border-slate-300 font-bold text-[9px] px-1.5 py-0.2 shrink-0">
                                {tacticalPositions.secondary.percentage}%
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="text-[10px] italic">Feuilles de match & profil</span>
                      <span className="text-[10px] font-black text-emerald-700">Pondéré</span>
                    </div>
                  </div>
                </div>

                {/* ── 4. COURBE D'ÉVOLUTION DES MENTIONS (SHORTLIST OFFICIELLE) ── */}
                <div className="bg-white rounded-3xl border border-secondary/70 shadow-sm p-6">
                  <PlayerMentionsChart
                    mentions={selectedPlayerMentions}
                    height={220}
                    title="Courbe d'évolution des mentions (Shortlist Officielle)"
                    emptyMessage={`Aucune mention enregistrée pour ${selectedPlayer.full_name}. Ajoutez une mention depuis la Shortlist Officielle pour tracer sa progression.`}
                  />
                </div>

                {/* ── 5. RANGÉE 3 : POSITION DE L'ÉQUIPE DANS LA COMPÉTITION (CLASSEMENT CATÉGORIE & SURCLASSEMENT) ── */}
                <div className="bg-white rounded-3xl border border-secondary/70 shadow-sm p-6 space-y-5">
                  {/* En-tête BeSoccer : Titre + Onglets Catégorie Officielle & Surclassement */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-secondary/60 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-5 bg-emerald-600 rounded-full" />
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                          Position de l&apos;Équipe dans la Compétition
                        </h3>
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {activeStandingsResolution.source === 'frmf'
                            ? `Source : Classement & Résultats FRMF${activeStandingsResolution.activeGroup ? ` • ${activeStandingsResolution.activeGroup}` : ''}`
                            : activeStandingsResolution.source === 'supabase'
                              ? 'Source : Matchs enregistrés (hors saisie FRMF)'
                              : `En attente de résultats FRMF • Catégorie ${currentCategoryForStandings || 'Non assignée'}`}
                        </p>
                      </div>
                    </div>

                    {/* Sélecteur d'onglets (Catégorie Officielle / Surclassement) */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setStandingsTab('official')}
                        className={`h-8 sm:h-9 px-3.5 rounded-xl font-black uppercase tracking-wider text-[10px] sm:text-[11px] flex items-center gap-1.5 transition-all ${
                          standingsTab === 'official'
                            ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Trophy className="w-3.5 h-3.5 text-primary" />
                        <span>Catégorie {playerOfficialCategory || 'Non assignée'}</span>
                        {officialCategoryStandings.length === 0 && (
                          <span className="text-[8px] font-bold text-slate-400 bg-slate-200/70 px-1.5 py-0.5 rounded-md ml-0.5">
                            Pas encore
                          </span>
                        )}
                      </button>

                      {playerSurclassCategory ? (
                        <button
                          type="button"
                          onClick={() => setStandingsTab('surclassement')}
                          className={`h-8 sm:h-9 px-3.5 rounded-xl font-black uppercase tracking-wider text-[10px] sm:text-[11px] flex items-center gap-1.5 transition-all ${
                            standingsTab === 'surclassement'
                              ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Surclassé en {playerSurclassCategory}</span>
                          {surclassCategoryStandings.length === 0 && (
                            <span className="text-[8px] font-bold text-slate-300 bg-white/20 px-1.5 py-0.5 rounded-md ml-0.5">
                              Pas encore
                            </span>
                          )}
                        </button>
                      ) : (
                        <div
                          className="h-8 sm:h-9 px-3 rounded-xl text-[10px] font-bold text-slate-400 flex items-center gap-1 cursor-not-allowed select-none"
                          title="Le joueur n'est pas surclassé sur une catégorie supérieure"
                        >
                          <span className="text-xs">🔒</span>
                          <span>Non surclassé</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sélecteur de poule FRMF lorsque plusieurs poules contiennent des matchs */}
                  {activeStandingsResolution.source === 'frmf' && activeStandingsResolution.availableGroupsWithData.length > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Poules disponibles ({currentCategoryForStandings})
                      </span>
                      <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
                        {activeStandingsResolution.availableGroupsWithData.map((grp) => {
                          const isGrpActive = activeStandingsResolution.activeGroup === grp;
                          return (
                            <button
                              key={grp}
                              type="button"
                              onClick={() => setSelectedStandingsGroup(grp)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                                isGrpActive
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {grp}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Mini-Bannière Résumé FUS Rabat */}
                  {fusStandingRow && fusStandingRow.played > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-black text-base flex items-center justify-center border border-primary/20 shrink-0">
                          {fusStandingRow.position}
                          <span className="text-[10px] align-super">e</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Rang FUS Rabat</p>
                          <p className="text-sm font-black text-slate-900">
                            {fusStandingRow.position === 1 ? 'Leader 🏆' : `${fusStandingRow.position}e position`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 font-black text-base flex items-center justify-center border border-emerald-500/20 shrink-0">
                          {fusStandingRow.points}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Points</p>
                          <p className="text-sm font-black text-slate-900">{fusStandingRow.points} pts au total</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-200/70 text-slate-800 font-black text-xs flex items-center justify-center shrink-0">
                          {fusStandingRow.played}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Bilan Matchs</p>
                          <p className="text-xs font-black text-slate-800">
                            <span className="text-emerald-700">{fusStandingRow.won}V</span>{' '}
                            <span className="text-slate-500">{fusStandingRow.drawn}N</span>{' '}
                            <span className="text-rose-600">{fusStandingRow.lost}D</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-200/70 text-slate-800 font-black text-xs flex items-center justify-center shrink-0">
                          {fusStandingRow.goal_difference > 0 ? `+${fusStandingRow.goal_difference}` : fusStandingRow.goal_difference}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Différence Buts</p>
                          <p className="text-xs font-black text-slate-800">
                            {fusStandingRow.goals_for} BM - {fusStandingRow.goals_against} BC
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tableau BeSoccer exact du classement */}
                  {activeStandings.length > 0 ? (
                    <div className="space-y-3">
                      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead>
                            {isU21Standings ? (
                              <tr className="bg-[#DC2626] text-white text-[10px] font-black uppercase tracking-wider border-b border-red-700">
                                <th className="py-2.5 px-3 text-center w-12">#</th>
                                <th className="py-2.5 px-4">Club</th>
                                <th className="py-2.5 px-4 text-right font-black">Pts</th>
                                <th className="py-2.5 px-4 text-right">Jo</th>
                                <th className="py-2.5 px-4 text-right">G</th>
                                <th className="py-2.5 px-4 text-right">N</th>
                                <th className="py-2.5 px-4 text-right">P</th>
                                <th className="py-2.5 px-4 text-right">Diff</th>
                              </tr>
                            ) : (
                              <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-600 border-b border-slate-200">
                                <th className="py-2.5 px-3 text-center w-10">#</th>
                                <th className="py-2.5 px-4">Club</th>
                                <th className="py-2.5 px-3 text-center font-black text-slate-900 bg-slate-100/70">Pts</th>
                                <th className="py-2.5 px-3 text-center">MJ</th>
                                <th className="py-2.5 px-3 text-center text-emerald-700">G</th>
                                <th className="py-2.5 px-3 text-center text-slate-500">N</th>
                                <th className="py-2.5 px-3 text-center text-rose-600">P</th>
                                <th className="py-2.5 px-3 text-center">BM</th>
                                <th className="py-2.5 px-3 text-center">BC</th>
                                <th className="py-2.5 px-3 text-center">DB</th>
                              </tr>
                            )}
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(showAllStandings ? activeStandings : activeStandings.slice(0, 5)).map((row) => {
                              const isFus = row.is_fus;
                              const hasPlayed = row.played > 0;
                              const tieBadge = hasPlayed ? getTieRuleBadgeLabel(row.tie_breaker_rule) : null;
                              const clubInitials = row.short_name || row.team_name.slice(0, 3).toUpperCase();

                              if (isU21Standings) {
                                return (
                                  <tr
                                    key={row.team_key || row.club_id}
                                    className={`transition-colors ${
                                      isFus
                                        ? 'bg-red-50/80 font-bold hover:bg-red-100/70 border-l-4 border-l-[#DC2626]'
                                        : 'hover:bg-slate-50/80'
                                    }`}
                                  >
                                    <td className="py-2 px-3 text-center">
                                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-[#DC2626] text-white font-black italic text-[11px] min-w-[28px] shadow-2xs">
                                        {String(row.position).padStart(2, '0')}
                                      </span>
                                    </td>
                                    <td className="py-2 px-4">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-2xs">
                                          {row.club_logo ? (
                                            <img src={row.club_logo} alt="" className="w-full h-full object-contain rounded-full" />
                                          ) : (
                                            <span className="font-black text-[9px] text-slate-600">
                                              {clubInitials}
                                            </span>
                                          )}
                                        </div>
                                        <span className={`truncate text-xs ${isFus ? 'font-black text-[#DC2626]' : 'font-semibold text-slate-800'}`}>
                                          {row.team_name}
                                        </span>
                                        {isFus && (
                                          <Badge className="bg-[#DC2626] text-white text-[9px] font-black px-1.5 py-0">
                                            FUS
                                          </Badge>
                                        )}
                                        {tieBadge && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80">
                                            {tieBadge}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2 px-4 text-right font-black text-xs text-slate-900">
                                      {hasPlayed ? row.points : '-'}
                                    </td>
                                    <td className="py-2 px-4 text-right text-slate-700 font-semibold">{hasPlayed ? row.played : '-'}</td>
                                    <td className="py-2 px-4 text-right text-slate-700 font-semibold">{hasPlayed ? row.won : '-'}</td>
                                    <td className="py-2 px-4 text-right text-slate-700 font-semibold">{hasPlayed ? row.drawn : '-'}</td>
                                    <td className="py-2 px-4 text-right text-slate-700 font-semibold">{hasPlayed ? row.lost : '-'}</td>
                                    <td className="py-2 px-4 text-right font-bold">
                                      {hasPlayed ? (
                                        <span
                                          className={
                                            row.goal_difference > 0
                                              ? 'text-emerald-700'
                                              : row.goal_difference < 0
                                                ? 'text-rose-600'
                                                : 'text-slate-600'
                                          }
                                        >
                                          {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">-</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr
                                  key={row.team_key || row.club_id}
                                  className={`transition-colors ${
                                    isFus
                                      ? 'bg-primary/5 font-bold hover:bg-primary/10 border-l-4 border-l-primary'
                                      : 'hover:bg-slate-50/80'
                                  }`}
                                >
                                  <td className="py-2 px-3 text-center">
                                    <span
                                      className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-black ${
                                        row.position === 1
                                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                                          : row.position <= 3
                                            ? 'bg-slate-200 text-slate-800'
                                            : 'text-slate-500'
                                      }`}
                                    >
                                      {row.position}
                                    </span>
                                  </td>
                                  <td className="py-2 px-4">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-2xs">
                                        {row.club_logo ? (
                                          <img src={row.club_logo} alt="" className="w-full h-full object-contain rounded-full" />
                                        ) : (
                                          <span className="font-black text-[9px] text-slate-600">
                                            {clubInitials}
                                          </span>
                                        )}
                                      </div>
                                      <span className={`truncate text-xs ${isFus ? 'font-black text-primary' : 'font-semibold text-slate-800'}`}>
                                        {row.team_name}
                                      </span>
                                      {isFus && (
                                        <Badge className="bg-primary text-white text-[9px] font-black px-1.5 py-0">
                                          FUS
                                        </Badge>
                                      )}
                                      {tieBadge && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80">
                                          {tieBadge}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-center font-black text-xs text-slate-900 bg-slate-100/50">
                                    {hasPlayed ? row.points : '-'}
                                  </td>
                                  <td className="py-2 px-3 text-center text-slate-700">{hasPlayed ? row.played : '-'}</td>
                                  <td className="py-2 px-3 text-center text-emerald-700 font-bold">{hasPlayed ? row.won : '-'}</td>
                                  <td className="py-2 px-3 text-center text-slate-500">{hasPlayed ? row.drawn : '-'}</td>
                                  <td className="py-2 px-3 text-center text-rose-600 font-bold">{hasPlayed ? row.lost : '-'}</td>
                                  <td className="py-2 px-3 text-center text-slate-700">{hasPlayed ? row.goals_for : '-'}</td>
                                  <td className="py-2 px-3 text-center text-slate-500">{hasPlayed ? row.goals_against : '-'}</td>
                                  <td className="py-2 px-3 text-center font-bold">
                                    {hasPlayed ? (
                                      <span
                                        className={`px-1 py-0.5 rounded text-[10px] ${
                                          row.goal_difference > 0
                                            ? 'text-emerald-700 bg-emerald-50'
                                            : row.goal_difference < 0
                                              ? 'text-rose-700 bg-rose-50'
                                              : 'text-slate-600 bg-slate-100'
                                        }`}
                                      >
                                        {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {(activeStandingsResolution.hasAnyH2HActivated || activeStandingsResolution.hasAnyProvisionalTie) && (
                        <p className="text-[10px] font-medium text-slate-500 px-1">
                          {activeStandingsResolution.hasAnyH2HActivated
                            ? 'Règle FRMF active : confrontations directes appliquées entre clubs à égalité ayant disputé leurs matchs aller/retour.'
                            : 'Classement provisoire : différence de buts générale puis meilleure attaque appliquées en attendant les matchs retours.'}
                        </p>
                      )}

                      {activeStandings.length > 5 && (
                        <div className="flex justify-center pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAllStandings(!showAllStandings)}
                            className="text-xs font-black uppercase tracking-wider text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 h-8 gap-1.5"
                          >
                            <span>{showAllStandings ? 'Afficher le Top 5' : `Voir les ${activeStandings.length} clubs (PLUS)`}</span>
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAllStandings ? '-rotate-90' : 'rotate-90'}`} />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-2xs">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/80 border border-slate-300 text-slate-700 text-xs font-black uppercase tracking-wider">
                        <span>Pas encore disponible</span>
                      </div>
                      <div className="max-w-md space-y-1">
                        <h4 className="text-sm font-black text-slate-800">
                          Classement officiel {currentCategoryForStandings || 'de la catégorie'} non publié
                        </h4>
                        <p className="text-xs font-medium text-muted-foreground">
                          Aucun résultat enregistré dans <span className="font-bold text-slate-700">Classement &amp; Résultats FRMF</span> ni en base pour la catégorie <span className="font-bold text-slate-700">{currentCategoryForStandings || 'sélectionnée'}</span>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

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

      {/* Dedicated Player Match Calendar Modal */}
      {calendarModalPlayer && (
        <PlayerMatchCalendarModal
          isOpen={!!calendarModalPlayer}
          onClose={() => setCalendarModalPlayer(null)}
          initialPlayer={calendarModalPlayer}
        />
      )}

      {/* ── Modal Gestion Lien Vidéo / Google Drive ── */}
      <AnimatePresence>
        {driveModalOpen && selectedPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget && !driveUrlSaving) setDriveModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-xs">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                    <div>
                      <h3 className="font-black text-base uppercase tracking-wider text-white">
                        Lien Vidéo / Google Drive
                      </h3>
                      <p className="text-white/80 text-xs font-semibold">
                        {selectedPlayer.full_name} (#{selectedPlayer.jersey_number || '•'})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDriveModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-black transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <LinkIcon className="w-3.5 h-3.5 text-emerald-600" />
                    URL Google Drive, Vidéo ou Dossier
                  </label>
                  <Input
                    type="url"
                    placeholder="https://drive.google.com/file/d/... ou https://..."
                    value={driveUrlInput}
                    onChange={(e) => setDriveUrlInput(e.target.value)}
                    className="h-12 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-emerald-600 text-xs font-medium px-4"
                  />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    💡 Vous pouvez coller un lien de fichier vidéo Google Drive, un dossier partagé de matchs, YouTube ou tout autre lien de diffusion.
                  </p>
                </div>

                {driveUrlInput.trim() && (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ExternalLink className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs text-emerald-800 font-bold truncate">
                        {driveUrlInput}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(driveUrlInput.trim(), '_blank', 'noopener,noreferrer')}
                      className="h-8 px-3 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-100 text-[10px] font-black uppercase shrink-0 gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Tester</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {getPlayerDriveUrl(selectedPlayer) && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setDriveUrlInput('')}
                      className="h-10 px-3 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Effacer</span>
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDriveModalOpen(false)}
                    disabled={driveUrlSaving}
                    className="h-10 px-4 rounded-xl text-xs font-bold"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveDriveUrl}
                    disabled={driveUrlSaving}
                    className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/20 gap-2"
                  >
                    {driveUrlSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Enregistrer</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
