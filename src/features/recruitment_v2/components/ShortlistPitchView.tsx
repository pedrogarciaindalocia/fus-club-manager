import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Trophy,
  Sparkles,
  Users,
  Filter,
  CheckCircle2,
  X,
  Eye,
  Shield,
  Footprints,
  BarChart3,
  Activity,
  Compass,
  Brain,
  Target,
  SlidersHorizontal,
  ChevronRight,
  Award,
  Search,
  UserCheck,
  ArrowUpDown,
  Crown,
  Maximize,
  Minimize,
  GripVertical,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
  TrendingUp,
  Plus,
  UserPlus,
  Bookmark,
  BookmarkPlus,
  BookmarkCheck,
  Save,
  Trash2,
  Edit3,
  FolderKanban,
  ExternalLink,
  Lock,
  Printer,
  Download,
  Camera
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { generate } from '@pdfme/generator';
import { text, image, rectangle } from '@pdfme/schemas';
import type { Template } from '@pdfme/common';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import { usePermissions } from '../../../context/PermissionsContext';
import type { TrialCandidate, CandidateEvaluation, Scout, SavedShortlistConfig } from '../types/recruitment';
import { RECRUITMENT_AGE_CATEGORIES } from '../types/recruitment';
import PlayerRadarChart from './PlayerRadarChart';
import ScoutasticDenseSlotCard from '../../../components/ScoutasticDenseSlotCard';
import { ScoutAvatar } from './ScoutAvatar';
import { recruitmentService } from '../services/recruitmentService';

export interface FormationSlot {
  roleCode: string;
  label: string;
  category: 'GK' | 'DEF' | 'MID' | 'ATT';
  top: string;
  left: string;
}

export interface FormationConfig {
  id: string;
  name: string;
  slots: FormationSlot[];
}

export const FORMATIONS: Record<string, FormationConfig> = {
  '4-3-3': {
    id: '4-3-3',
    name: '4-3-3 Offensif Classique',
    slots: [
      { roleCode: 'GK', label: 'GB', category: 'GK', top: '88%', left: '50%' },
      { roleCode: 'RB', label: 'DD', category: 'DEF', top: '72%', left: '85%' },
      { roleCode: 'CB', label: 'DC Droit', category: 'DEF', top: '75%', left: '62%' },
      { roleCode: 'CB', label: 'DC Gauche', category: 'DEF', top: '75%', left: '38%' },
      { roleCode: 'LB', label: 'DG', category: 'DEF', top: '72%', left: '15%' },
      { roleCode: 'CDM', label: 'MDC', category: 'MID', top: '56%', left: '50%' },
      { roleCode: 'CM', label: 'MC Droit', category: 'MID', top: '44%', left: '68%' },
      { roleCode: 'CM', label: 'MC Gauche', category: 'MID', top: '44%', left: '32%' },
      { roleCode: 'RW', label: 'AD', category: 'ATT', top: '24%', left: '82%' },
      { roleCode: 'ST', label: 'BU', category: 'ATT', top: '16%', left: '50%' },
      { roleCode: 'LW', label: 'AG', category: 'ATT', top: '24%', left: '18%' },
    ],
  },
  '4-4-2': {
    id: '4-4-2',
    name: '4-4-2 À Plat',
    slots: [
      { roleCode: 'GK', label: 'GB', category: 'GK', top: '88%', left: '50%' },
      { roleCode: 'RB', label: 'DD', category: 'DEF', top: '72%', left: '85%' },
      { roleCode: 'CB', label: 'DC Droit', category: 'DEF', top: '75%', left: '62%' },
      { roleCode: 'CB', label: 'DC Gauche', category: 'DEF', top: '75%', left: '38%' },
      { roleCode: 'LB', label: 'DG', category: 'DEF', top: '72%', left: '15%' },
      { roleCode: 'RM', label: 'MD', category: 'MID', top: '50%', left: '84%' },
      { roleCode: 'CM', label: 'MC Droit', category: 'MID', top: '52%', left: '60%' },
      { roleCode: 'CM', label: 'MC Gauche', category: 'MID', top: '52%', left: '40%' },
      { roleCode: 'LM', label: 'MG', category: 'MID', top: '50%', left: '16%' },
      { roleCode: 'ST', label: 'BU Droit', category: 'ATT', top: '20%', left: '62%' },
      { roleCode: 'ST', label: 'BU Gauche', category: 'ATT', top: '20%', left: '38%' },
    ],
  },
  '4-2-3-1': {
    id: '4-2-3-1',
    name: '4-2-3-1 Moderne',
    slots: [
      { roleCode: 'GK', label: 'GB', category: 'GK', top: '88%', left: '50%' },
      { roleCode: 'RB', label: 'DD', category: 'DEF', top: '72%', left: '85%' },
      { roleCode: 'CB', label: 'DC Droit', category: 'DEF', top: '75%', left: '62%' },
      { roleCode: 'CB', label: 'DC Gauche', category: 'DEF', top: '75%', left: '38%' },
      { roleCode: 'LB', label: 'DG', category: 'DEF', top: '72%', left: '15%' },
      { roleCode: 'CDM', label: 'MDC Droit', category: 'MID', top: '58%', left: '60%' },
      { roleCode: 'CDM', label: 'MDC Gauche', category: 'MID', top: '58%', left: '40%' },
      { roleCode: 'RM', label: 'AD', category: 'ATT', top: '38%', left: '82%' },
      { roleCode: 'CAM', label: 'MOC', category: 'MID', top: '38%', left: '50%' },
      { roleCode: 'LM', label: 'AG', category: 'ATT', top: '38%', left: '18%' },
      { roleCode: 'ST', label: 'BU', category: 'ATT', top: '18%', left: '50%' },
    ],
  },
  '3-5-2': {
    id: '3-5-2',
    name: '3-5-2 Pistons',
    slots: [
      { roleCode: 'GK', label: 'GB', category: 'GK', top: '88%', left: '50%' },
      { roleCode: 'CB', label: 'DC Droit', category: 'DEF', top: '74%', left: '72%' },
      { roleCode: 'CB', label: 'DC Axe', category: 'DEF', top: '76%', left: '50%' },
      { roleCode: 'CB', label: 'DC Gauche', category: 'DEF', top: '74%', left: '28%' },
      { roleCode: 'RWB', label: 'Piston D', category: 'MID', top: '48%', left: '88%' },
      { roleCode: 'CM', label: 'MC Droit', category: 'MID', top: '54%', left: '63%' },
      { roleCode: 'CDM', label: 'MDC', category: 'MID', top: '58%', left: '50%' },
      { roleCode: 'CM', label: 'MC Gauche', category: 'MID', top: '54%', left: '37%' },
      { roleCode: 'LWB', label: 'Piston G', category: 'MID', top: '48%', left: '12%' },
      { roleCode: 'ST', label: 'BU Droit', category: 'ATT', top: '20%', left: '62%' },
      { roleCode: 'ST', label: 'BU Gauche', category: 'ATT', top: '20%', left: '38%' },
    ],
  },
};

export const ROLE_FULL_NAMES: Record<string, string> = {
  'GB': 'Gardien de But',
  'DD': 'Défenseur Droit',
  'DG': 'Défenseur Gauche',
  'DC': 'Défenseur Central',
  'DC Droit': 'Défenseur Central Droit',
  'DC Gauche': 'Défenseur Central Gauche',
  'DC Axe': 'Défenseur Central Axial',
  'MDC': 'Milieu Défensif Central',
  'MDC Droit': 'Milieu Défensif Droit',
  'MDC Gauche': 'Milieu Défensif Gauche',
  'MC': 'Milieu Central',
  'MC Droit': 'Milieu Central Droit',
  'MC Gauche': 'Milieu Central Gauche',
  'MD': 'Milieu Droit',
  'MG': 'Milieu Gauche',
  'MOC': 'Milieu Offensif Central',
  'Piston D': 'Piston Latéral Droit',
  'Piston G': 'Piston Latéral Gauche',
  'AG': 'Ailier Gauche',
  'AD': 'Ailier Droit',
  'BU': 'Buteur',
  'BUG': 'Buteur Gauche',
  'BUD': 'Buteur Droit',
};

interface ShortlistPitchViewProps {
  candidates: TrialCandidate[];
  evaluations: CandidateEvaluation[];
  scouts?: Scout[];
  isAdmin?: boolean;
  onOpenCandidateDetail: (candidate: TrialCandidate) => void;
  onOpenEvaluationForCandidate?: (candidate: TrialCandidate) => void;
  onUpdateCandidate?: (id: string, updates: Partial<TrialCandidate>) => Promise<any>;
}

export const ShortlistPitchView: React.FC<ShortlistPitchViewProps> = ({
  candidates,
  evaluations,
  scouts = [],
  isAdmin = true,
  onOpenCandidateDetail,
  onOpenEvaluationForCandidate,
  onUpdateCandidate,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pitchCaptureRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // US-DASH-35 : Récupération des informations de session pour le cloisonnement Scout Manager
  const { authState, canManageCategory } = usePermissions();
  const currentUserId = authState?.user?.id;
  const currentUserName = authState?.user?.full_name?.trim();
  const currentUserEmail = authState?.user?.email?.trim();
  const currentUserRole = authState?.user?.system_role;

  const visibleCategories = useMemo(() => {
    const allowed = RECRUITMENT_AGE_CATEGORIES.filter(cat => canManageCategory(cat));
    return allowed.length > 0 ? allowed : RECRUITMENT_AGE_CATEGORIES;
  }, [canManageCategory]);

  const isScoutManager = Boolean(
    currentUserRole === 'scout_manager' ||
    (!isAdmin && (currentUserRole?.includes('scout') || authState?.user?.job_title?.toLowerCase().includes('scout')))
  );

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const [selectedFormationKey, setSelectedFormationKey] = useState<string>('4-3-3');
  const [pitchScale, setPitchScale] = useState<'normal' | 'large' | 'xlarge'>('large');

  // FILTRES OBLIGATOIRES POUR CHARGER LE TERRAIN :
  // Le terrain est STRICTEMENT VIDE tant qu'un scout ET une catégorie ne sont pas choisis
  const [scoutFilter, setScoutFilter] = useState<string>('ALL'); // 'ALL' = tous les scouts (Base Complète Club)
  const [categoryFilter, setCategoryFilter] = useState<string>(''); // '' = aucune catégorie sélectionnée (VIDE)

  React.useEffect(() => {
    if (visibleCategories.length === 1 && !categoryFilter) {
      setCategoryFilter(visibleCategories[0]);
    }
  }, [visibleCategories, categoryFilter]);

  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyBestScorePerPosition, setOnlyBestScorePerPosition] = useState<boolean>(false);
  const [shortlistOnly, setShortlistOnly] = useState<boolean>(false);
  // Option de tri global au-dessus du terrain : 'none' | 'score' | 'scout'
  const [pitchSortOption, setPitchSortOption] = useState<'none' | 'score' | 'scout'>('none');

  // Liste des scouts disponibles : liste exhaustive depuis les scouts du club et les découvreurs trouvés sur les candidats
  const availableScouts = useMemo(() => {
    const list: { id?: string; name: string }[] = [];
    const seen = new Set<string>();

    if (scouts && scouts.length > 0) {
      scouts.forEach(s => {
        const name = s.full_name?.trim();
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          list.push({ id: s.id, name });
        }
      });
    }

    candidates.forEach(cand => {
      const name = cand.discovering_scout_name?.trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({ id: cand.discovering_scout_id, name });
      }
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [scouts, candidates]);

  // US-DASH-37 : Objet scout complet sélectionné (pour photo, nom et rôle dans l'export PDF et l'en-tête officiel)
  const selectedScout = useMemo(() => {
    if (!scoutFilter || scoutFilter === 'ALL') return null;
    return scouts?.find(s =>
      s.full_name?.toLowerCase().trim() === scoutFilter.toLowerCase().trim() ||
      s.id === scoutFilter
    ) || null;
  }, [scouts, scoutFilter]);

  // Joueur survolé (infobulle) et joueur inspecté (panneau modal complet)
  const [hoveredCandidate, setHoveredCandidate] = useState<TrialCandidate | null>(null);
  const [inspectedCandidate, setInspectedCandidate] = useState<TrialCandidate | null>(null);

  // Tiroir latéral droit pour ajuster la hiérarchie du poste sélectionné
  const [selectedSlotForDrawer, setSelectedSlotForDrawer] = useState<{
    slotIndex: number;
    label: string;
    roleCode: string;
  } | null>(null);

  // Modal d'assignation d'un joueur existant de la base de données au poste
  const [slotForAddingPlayer, setSlotForAddingPlayer] = useState<{
    slotIndex: number;
    label: string;
    roleCode: string;
    category: 'GK' | 'DEF' | 'MID' | 'ATT';
  } | null>(null);
  const [playerModalSearch, setPlayerModalSearch] = useState<string>('');
  const [positionFilterMode, setPositionFilterMode] = useState<'matching' | 'all' | 'all_categories'>('matching');
  const [isAssigningPlayer, setIsAssigningPlayer] = useState<boolean>(false);

  // Ordre personnalisé par poste : Map slotLabel -> candidateId[] (Synchronisé Supabase + localStorage)
  const [customSlotOrder, setCustomSlotOrder] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('fus_shortlist_custom_slot_order');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Chargement asynchrone de l'ordre sauvegardé dans Supabase au montage
  React.useEffect(() => {
    let isMounted = true;
    recruitmentService.getShortlistSlotOrder().then(dbOrder => {
      if (isMounted && dbOrder && Object.keys(dbOrder).length > 0) {
        setCustomSlotOrder(dbOrder);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const saveCustomSlotOrder = (newOrder: Record<string, string[]>) => {
    setCustomSlotOrder(newOrder);
    recruitmentService.saveShortlistSlotOrder(newOrder);
  };

  // ── GESTION DES SHORTLISTS ENREGISTRÉES AVEC INTITULÉ (US-DASH-33) ──
  const [savedShortlists, setSavedShortlists] = useState<SavedShortlistConfig[]>([]);
  const [activeSavedShortlistId, setActiveSavedShortlistId] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [saveModalTitle, setSaveModalTitle] = useState<string>('');
  const [saveModalDesc, setSaveModalDesc] = useState<string>('');
  const [isSavingShortlist, setIsSavingShortlist] = useState<boolean>(false);

  const [searchParams] = useSearchParams();
  const urlShortlistId = searchParams.get('shortlistId');

  // Chargement initial des configurations de shortlist sauvegardées
  React.useEffect(() => {
    let isMounted = true;
    recruitmentService.getSavedShortlists().then(list => {
      if (isMounted && list) {
        setSavedShortlists(list);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // US-DASH-35 / Strict Account Ownership Isolation :
  // Une shortlist appartient à la session active STRICTEMENT si son ID utilisateur (author_id / created_by) ou son Email (author_email) correspond au compte connecté.
  const isShortlistOwner = (sl: SavedShortlistConfig | null | undefined): boolean => {
    if (!sl) return false;
    if (currentUserId && (sl.author_id === currentUserId || sl.created_by === currentUserId)) return true;
    if (currentUserEmail && sl.author_email && sl.author_email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase()) return true;
    return false;
  };

  // US-DASH-64 : Vérification si une shortlist est rattachée à un scout spécifique
  const isShortlistForScout = (sl: SavedShortlistConfig | null | undefined, targetScout: string, scoutObj?: Scout | null): boolean => {
    if (!sl) return false;
    if (!targetScout || targetScout === 'ALL') return true;
    const targetLower = targetScout.toLowerCase().trim();

    if (sl.scout_filter && sl.scout_filter.toLowerCase().trim() === targetLower) return true;
    if (sl.author_name && sl.author_name.toLowerCase().trim() === targetLower) return true;

    if (scoutObj) {
      if (scoutObj.id && (sl.author_id === scoutObj.id || sl.created_by === scoutObj.id)) return true;
      if (scoutObj.email && sl.author_email?.toLowerCase().trim() === scoutObj.email.toLowerCase().trim()) return true;
      if (scoutObj.full_name) {
        const scoutNameLower = scoutObj.full_name.toLowerCase().trim();
        if (sl.author_name?.toLowerCase().trim() === scoutNameLower) return true;
        if (sl.scout_filter?.toLowerCase().trim() === scoutNameLower) return true;
      }
    }
    return false;
  };

  // US-DASH-62 / Strict Scout Manager Shortlist Isolation:
  // Si l'utilisateur est un Scout Manager (isScoutManager), il ne voit QUE ses propres shortlists (isShortlistOwner).
  // Si l'utilisateur est un Admin / Super Admin (isAdmin && !isScoutManager), il voit l'ensemble des shortlists du club.
  const scopedSavedShortlists = useMemo(() => {
    if (isScoutManager) {
      return savedShortlists.filter(sl => isShortlistOwner(sl));
    }
    return savedShortlists;
  }, [savedShortlists, isScoutManager, currentUserId, currentUserEmail, currentUserName]);

  // US-DASH-64 : Répartition dynamique des shortlists selon le profil et le scout sélectionné
  const { myShortlists, otherShortlists, scoutSpecificShortlists } = useMemo(() => {
    const mine: SavedShortlistConfig[] = [];
    const others: SavedShortlistConfig[] = [];
    const forSelectedScout: SavedShortlistConfig[] = [];

    const isCurrentScoutSelected = Boolean(scoutFilter && scoutFilter !== 'ALL');

    scopedSavedShortlists.forEach(sl => {
      const belongsToSelected = isCurrentScoutSelected && isShortlistForScout(sl, scoutFilter, selectedScout);
      if (belongsToSelected) {
        forSelectedScout.push(sl);
      }

      if (isAdmin && !isScoutManager) {
        // En tant qu'admin : si un scout particulier est choisi, on isole en priorité les shortlists de ce scout
        if (isCurrentScoutSelected) {
          if (belongsToSelected) {
            mine.push(sl);
          } else {
            others.push(sl);
          }
        } else {
          mine.push(sl);
        }
      } else if (isShortlistOwner(sl)) {
        mine.push(sl);
      } else {
        if (!isScoutManager) {
          others.push(sl);
        }
      }
    });

    return {
      myShortlists: mine,
      otherShortlists: isScoutManager ? [] : others,
      scoutSpecificShortlists: forSelectedScout
    };
  }, [scopedSavedShortlists, isAdmin, isScoutManager, scoutFilter, selectedScout, currentUserId, currentUserEmail, currentUserName]);

  // Détection et chargement automatique si une shortlistId est spécifiée dans l'URL
  React.useEffect(() => {
    if (urlShortlistId && scopedSavedShortlists.length > 0 && activeSavedShortlistId !== urlShortlistId) {
      handleSelectSavedShortlist(urlShortlistId);
    }
  }, [urlShortlistId, scopedSavedShortlists, activeSavedShortlistId]);

  const activeSavedShortlist = useMemo(() => {
    return scopedSavedShortlists.find(s => s.id === activeSavedShortlistId) || null;
  }, [scopedSavedShortlists, activeSavedShortlistId]);

  // Détermine si l'utilisateur a les droits d'édition / modification sur la shortlist affichée :
  // - L'Admin de direction a tous les droits
  // - Pour le Scout Manager :
  //    * Si une shortlist sauvegardée est chargée : éditable SEULEMENT si c'est la sienne ! Si c'est celle d'un autre scout -> Visualisation seule.
  //    * Si aucune shortlist sauvegardée n'est chargée : éditable si scoutFilter est sur lui-même ('ALL' ou son compte). Si scoutFilter est sur un AUTRE scout -> Visualisation seule.
  const canEditCurrentShortlist = useMemo(() => {
    if (isAdmin && !isScoutManager) return true;

    // 1. Si une shortlist sauvegardée spécifique est active :
    if (activeSavedShortlist) {
      return isShortlistOwner(activeSavedShortlist);
    }

    // 2. Si aucune shortlist sauvegardée n'est active :
    if (scoutFilter && scoutFilter !== 'ALL') {
      const myScout = scouts?.find(s =>
        (currentUserId && s.id === currentUserId) ||
        (currentUserEmail && s.email?.toLowerCase().trim() === currentUserEmail.toLowerCase().trim()) ||
        (currentUserName && s.full_name?.toLowerCase().trim() === currentUserName.toLowerCase().trim())
      );
      const isMyScoutFilter = Boolean(
        (currentUserName && scoutFilter.toLowerCase().trim() === currentUserName.toLowerCase().trim()) ||
        (myScout && (scoutFilter.toLowerCase().trim() === myScout.full_name?.toLowerCase().trim() || scoutFilter === myScout.id))
      );
      if (!isMyScoutFilter) {
        return false; // Visualisation seule de la sélection d'un autre scout !
      }
    }

    return true;
  }, [isAdmin, isScoutManager, activeSavedShortlist, scoutFilter, currentUserId, currentUserEmail, currentUserName, scouts]);

  const handleSelectSavedShortlist = (shortlistId: string) => {
    if (!shortlistId) {
      setActiveSavedShortlistId(null);
      return;
    }
    const target = scopedSavedShortlists.find(s => s.id === shortlistId);
    if (!target) return;

    setActiveSavedShortlistId(target.id);
    setScoutFilter(target.scout_filter || 'ALL');
    setCategoryFilter(target.category_filter || '');
    if (target.formation_key && FORMATIONS[target.formation_key]) {
      setSelectedFormationKey(target.formation_key);
    }
    if (target.custom_slot_order) {
      setCustomSlotOrder(target.custom_slot_order);
      recruitmentService.saveShortlistSlotOrder(target.custom_slot_order);
    }
    setSelectedSlotForDrawer(null);

    const isMine = isShortlistOwner(target);
    if (isMine || (isAdmin && !isScoutManager)) {
      toast.success(`Shortlist "${target.title}" chargée avec succès !`);
    } else {
      toast.info(`Shortlist "${target.title}" de ${target.author_name || target.scout_filter || 'un autre scout'} ouverte en mode Visualisation seule.`);
    }
  };

  const handleQuickSaveCurrentShortlist = async () => {
    if (!activeSavedShortlist) {
      handleOpenSaveModal();
      return;
    }
    if (!canEditCurrentShortlist) {
      toast.error("Opération refusée : Vous ne pouvez pas modifier la shortlist d'un autre scout. Utilisez 'Enregistrer sous' pour créer votre propre copie.");
      return;
    }
    try {
      setIsSavingShortlist(true);
      const updated = await recruitmentService.saveShortlistConfig({
        id: activeSavedShortlist.id,
        title: activeSavedShortlist.title,
        description: activeSavedShortlist.description,
        scout_filter: scoutFilter,
        category_filter: categoryFilter,
        formation_key: selectedFormationKey,
        custom_slot_order: customSlotOrder,
        author_id: activeSavedShortlist.author_id || currentUserId,
        author_name: activeSavedShortlist.author_name || currentUserName,
        author_email: activeSavedShortlist.author_email || currentUserEmail,
        author_role: activeSavedShortlist.author_role || currentUserRole || (isScoutManager ? 'scout_manager' : 'admin'),
      });
      setSavedShortlists(prev => prev.map(s => s.id === updated.id ? updated : s));
      toast.success(`Shortlist "${updated.title}" mise à jour !`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la mise à jour de la shortlist");
    } finally {
      setIsSavingShortlist(false);
    }
  };

  const handleOpenSaveModal = () => {
    if (activeSavedShortlist) {
      setSaveModalTitle(activeSavedShortlist.title);
      setSaveModalDesc(activeSavedShortlist.description || '');
    } else {
      const catText = categoryFilter ? categoryFilter : 'Toutes Catégories';
      const scoutText = scoutFilter ? ` - Scout ${scoutFilter}` : '';
      setSaveModalTitle(`Shortlist ${catText}${scoutText}`);
      setSaveModalDesc('');
    }
    setIsSaveModalOpen(true);
  };

  const handleConfirmSaveShortlist = async (asNew: boolean = false) => {
    if (!saveModalTitle.trim()) {
      toast.error("Veuillez renseigner un intitulé pour la shortlist");
      return;
    }

    try {
      setIsSavingShortlist(true);
      const configToSave = {
        id: (!asNew && activeSavedShortlistId) ? activeSavedShortlistId : undefined,
        title: saveModalTitle.trim(),
        description: saveModalDesc.trim() || undefined,
        scout_filter: scoutFilter,
        category_filter: categoryFilter,
        formation_key: selectedFormationKey,
        custom_slot_order: customSlotOrder,
        author_id: currentUserId,
        author_name: currentUserName,
        author_email: currentUserEmail,
        author_role: currentUserRole || (isScoutManager ? 'scout_manager' : 'admin'),
      };

      const saved = await recruitmentService.saveShortlistConfig(configToSave);
      setSavedShortlists(prev => {
        const exists = prev.some(s => s.id === saved.id);
        return exists ? prev.map(s => s.id === saved.id ? saved : s) : [saved, ...prev];
      });
      setActiveSavedShortlistId(saved.id);
      setIsSaveModalOpen(false);
      toast.success(`Shortlist "${saved.title}" enregistrée avec succès !`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement de la shortlist");
    } finally {
      setIsSavingShortlist(false);
    }
  };

  const handleDeleteSavedShortlist = async (id: string, title: string) => {
    const target = savedShortlists.find(s => s.id === id);
    if (!isAdmin && !isShortlistOwner(target)) {
      toast.error("Opération refusée : Vous ne pouvez pas supprimer la shortlist d'un autre scout.");
      return;
    }
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la shortlist "${title}" ?`)) {
      return;
    }
    try {
      await recruitmentService.deleteSavedShortlist(id);
      setSavedShortlists(prev => prev.filter(s => s.id !== id));
      if (activeSavedShortlistId === id) {
        setActiveSavedShortlistId(null);
      }
      toast.success(`Shortlist "${title}" supprimée.`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression");
    }
  };

  // ── GESTIONNAIRE DÉDIÉ DES SHORTLISTS (MODIFICATION & SUPPRESSION) ──
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [managerSearchQuery, setManagerSearchQuery] = useState('');
  const [editingManagerShortlistId, setEditingManagerShortlistId] = useState<string | null>(null);
  const [editingManagerTitle, setEditingManagerTitle] = useState('');
  const [editingManagerDesc, setEditingManagerDesc] = useState('');
  const [isSavingManagerEdit, setIsSavingManagerEdit] = useState(false);

  const handleStartEditManagerShortlist = (sl: SavedShortlistConfig) => {
    if (!isAdmin && !isShortlistOwner(sl)) {
      toast.error("Opération refusée : Vous ne pouvez pas modifier l'intitulé d'une shortlist appartenant à un autre scout.");
      return;
    }
    setEditingManagerShortlistId(sl.id);
    setEditingManagerTitle(sl.title);
    setEditingManagerDesc(sl.description || '');
  };

  const handleCancelEditManagerShortlist = () => {
    setEditingManagerShortlistId(null);
    setEditingManagerTitle('');
    setEditingManagerDesc('');
  };

  const handleSaveEditManagerShortlist = async (id: string) => {
    if (!editingManagerTitle.trim()) {
      toast.error("Veuillez renseigner un intitulé pour la shortlist");
      return;
    }
    const target = scopedSavedShortlists.find(s => s.id === id);
    if (!target) return;

    if (!isAdmin && !isShortlistOwner(target)) {
      toast.error("Opération refusée : Vous ne pouvez pas modifier la shortlist d'un autre scout.");
      return;
    }

    try {
      setIsSavingManagerEdit(true);
      const updated = await recruitmentService.saveShortlistConfig({
        ...target,
        title: editingManagerTitle.trim(),
        description: editingManagerDesc.trim() || undefined,
        author_id: target.author_id || currentUserId,
        author_name: target.author_name || currentUserName,
        author_email: target.author_email || currentUserEmail,
        author_role: target.author_role || currentUserRole || (isScoutManager ? 'scout_manager' : 'admin'),
      });
      setSavedShortlists(prev => prev.map(s => s.id === updated.id ? updated : s));
      toast.success(`Shortlist "${updated.title}" modifiée avec succès !`);
      setEditingManagerShortlistId(null);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la modification de la shortlist");
    } finally {
      setIsSavingManagerEdit(false);
    }
  };

  const handleClearActiveShortlist = () => {
    setActiveSavedShortlistId(null);
    toast.info("Shortlist détachée du terrain.");
  };

  const filteredManagerShortlists = useMemo(() => {
    if (!managerSearchQuery.trim()) return scopedSavedShortlists;
    const q = managerSearchQuery.toLowerCase();
    return scopedSavedShortlists.filter(s =>
      s.title.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.category_filter && s.category_filter.toLowerCase().includes(q)) ||
      (s.formation_key && s.formation_key.toLowerCase().includes(q)) ||
      (s.scout_filter && s.scout_filter.toLowerCase().includes(q)) ||
      (s.author_name && s.author_name.toLowerCase().includes(q))
    );
  }, [scopedSavedShortlists, managerSearchQuery]);

  // Drag & drop state dans le tiroir
  const [draggedCandidateId, setDraggedCandidateId] = useState<string | null>(null);
  const [dragOverCandidateId, setDragOverCandidateId] = useState<string | null>(null);

  // Dimensions & proportions généreuses du terrain (Agrandies pour respirer)
  const pitchStyle = useMemo(() => {
    if (isFullscreen) {
      return {
        width: '100%',
        maxWidth: pitchScale === 'xlarge' ? '1400px' : pitchScale === 'normal' ? '980px' : '1180px',
        minHeight: '92vh',
        aspectRatio: '84 / 105',
      };
    }

    if (selectedSlotForDrawer) {
      // Lorsque la liste latérale droite est ouverte dans la page, adapter la largeur du terrain pour un affichage côte à côte optimal
      switch (pitchScale) {
        case 'xlarge':
          return {
            width: '100%',
            maxWidth: '1060px',
            minHeight: '940px',
            aspectRatio: '84 / 105',
          };
        case 'normal':
          return {
            width: '100%',
            maxWidth: '720px',
            minHeight: '720px',
            aspectRatio: '80 / 105',
          };
        case 'large':
        default:
          return {
            width: '100%',
            maxWidth: '920px',
            minHeight: '840px',
            aspectRatio: '82 / 105',
          };
      }
    }

    switch (pitchScale) {
      case 'xlarge':
        return {
          width: '100%',
          maxWidth: '1240px',
          minHeight: '1100px',
          aspectRatio: '86 / 105',
        };
      case 'normal':
        return {
          width: '100%',
          maxWidth: '840px',
          minHeight: '800px',
          aspectRatio: '80 / 105',
        };
      case 'large':
      default:
        return {
          width: '100%',
          maxWidth: '1060px',
          minHeight: '960px',
          aspectRatio: '84 / 105',
        };
    }
  }, [pitchScale, isFullscreen, selectedSlotForDrawer]);

  const activeFormation = FORMATIONS[selectedFormationKey] || FORMATIONS['4-3-3'];

  // Map des évaluations les plus récentes par joueur
  const playerEvaluationsMap = useMemo(() => {
    const map = new Map<string, CandidateEvaluation>();
    evaluations.forEach(ev => {
      const existing = map.get(ev.candidate_id);
      if (!existing || new Date(ev.evaluation_date).getTime() > new Date(existing.evaluation_date).getTime()) {
        map.set(ev.candidate_id, ev);
      }
    });
    return map;
  }, [evaluations]);

  // Vérifie si un candidat est formellement shortlisté : par défaut, tous les talents actifs sont shortlistés et intégrés au Onze / Shadow List
  const isCandidateShortlisted = (cand: TrialCandidate): boolean => {
    if (cand.pipeline_stage === 'rejected' || cand.pipeline_stage === 'archived') {
      return false;
    }
    return true;
  };

  // US-DASH-62 / Scout Manager Cloisonnement Joueurs :
  // Vérifie si un candidat appartient au Scout Manager connecté (découvert, créé ou assigné à son compte)
  const isCandidateBelongingToCurrentScoutManager = (cand: TrialCandidate): boolean => {
    if (!cand) return false;

    // Correspondance directe avec le scout de l'utilisateur connecté
    const myScout = scouts?.find(s =>
      (currentUserId && s.id === currentUserId) ||
      (currentUserEmail && s.email?.toLowerCase().trim() === currentUserEmail.toLowerCase().trim()) ||
      (currentUserName && s.full_name?.toLowerCase().trim() === currentUserName.toLowerCase().trim())
    );

    if (myScout) {
      if (cand.discovering_scout_id === myScout.id) return true;
      if (myScout.full_name && cand.discovering_scout_name?.toLowerCase().trim() === myScout.full_name.toLowerCase().trim()) return true;
      if (myScout.email && cand.discovering_scout_email?.toLowerCase().trim() === myScout.email.toLowerCase().trim()) return true;
    }

    if (currentUserId && (cand.discovering_scout_id === currentUserId || cand.created_by === currentUserId)) return true;
    if (currentUserEmail && cand.discovering_scout_email?.toLowerCase().trim() === currentUserEmail.toLowerCase().trim()) return true;
    if (currentUserName && cand.discovering_scout_name?.toLowerCase().trim() === currentUserName.toLowerCase().trim()) return true;

    if (cand.assigned_scouts && cand.assigned_scouts.some(s => {
      const sNorm = s.toLowerCase().trim();
      return (currentUserId && s === currentUserId) ||
        (currentUserEmail && sNorm === currentUserEmail.toLowerCase().trim()) ||
        (currentUserName && sNorm === currentUserName.toLowerCase().trim()) ||
        (myScout && (s === myScout.id || (myScout.full_name && sNorm === myScout.full_name.toLowerCase().trim())));
    })) {
      return true;
    }

    // Vérification dans les évaluations
    const ev = playerEvaluationsMap.get(cand.id);
    if (ev) {
      if (currentUserId && ev.scout_id === currentUserId) return true;
      if (currentUserName && ev.scout_name?.toLowerCase().trim() === currentUserName.toLowerCase().trim()) return true;
      if (myScout && (ev.scout_id === myScout.id || (myScout.full_name && ev.scout_name?.toLowerCase().trim() === myScout.full_name.toLowerCase().trim()))) return true;
    }

    return false;
  };

  // Liste de tous les candidats autorisés selon le rôle (Scout Manager = uniquement SES candidats, Admin = tous)
  const scopedCandidates = useMemo(() => {
    if (isScoutManager) {
      return candidates.filter(cand => isCandidateBelongingToCurrentScoutManager(cand));
    }
    return candidates;
  }, [candidates, isScoutManager, currentUserId, currentUserEmail, currentUserName, scouts, playerEvaluationsMap]);

  // Décompte total des joueurs de la shortlist
  const shortlistedTotalCount = useMemo(() => {
    return scopedCandidates.filter(isCandidateShortlisted).length;
  }, [scopedCandidates, playerEvaluationsMap]);

  // Vérifie si un candidat a été détecté ou assigné au scout choisi
  const isCandidateDetectedBySelectedScout = (cand: TrialCandidate, sFilter: string): boolean => {
    if (isScoutManager && !isCandidateBelongingToCurrentScoutManager(cand)) return false;

    if (!sFilter || sFilter === 'ALL' || sFilter === 'all') return true;
    const sFilterNorm = sFilter.toLowerCase().trim();
    const discName = (cand.discovering_scout_name || '').toLowerCase().trim();
    const discId = cand.discovering_scout_id || '';
    if (discName === sFilterNorm || discId === sFilter) return true;
    if (cand.assigned_scouts && cand.assigned_scouts.some(s => s.toLowerCase().trim() === sFilterNorm || s === sFilter)) {
      return true;
    }
    // Vérification dans l'évaluation
    const ev = playerEvaluationsMap.get(cand.id);
    if (ev && ((ev.scout_name || '').toLowerCase().trim() === sFilterNorm || ev.scout_id === sFilter)) {
      return true;
    }
    return false;
  };

  const normalizeCat = (c?: string | null): string => (c || '').trim().toUpperCase().replace(/[-\s]/g, '');
  const isCandidateMatchingCategory = (candCat?: string | null, filterCat?: string | null): boolean => {
    if (!filterCat || filterCat === 'ALL') return true;
    return normalizeCat(candCat) === normalizeCat(filterCat);
  };

  // Tous les candidats de la catégorie sélectionnée (filtrés selon scout s'il est spécifié)
  const categoryCandidates = useMemo(() => {
    // Si pas de catégorie sélectionnée -> SHORTLIST VIDE !
    if (!categoryFilter) {
      return [];
    }

    return scopedCandidates.filter(cand => {
      // 1. Filtrage strict par catégorie (sauf si 'ALL')
      if (categoryFilter !== 'ALL' && !isCandidateMatchingCategory(cand.age_category, categoryFilter)) {
        return false;
      }

      // 2. Filtrage par scout détecteur (sauf si 'ALL')
      if (scoutFilter && scoutFilter !== 'ALL' && !isCandidateDetectedBySelectedScout(cand, scoutFilter)) {
        return false;
      }

      // 3. Filtre Shortlist uniquement (si actif)
      if (shortlistOnly && !isCandidateShortlisted(cand)) {
        return false;
      }

      // 4. Filtre score global
      if (minScoreFilter > 0) {
        const score = playerEvaluationsMap.get(cand.id)?.overall_score || 0;
        if (score < minScoreFilter) return false;
      }

      // 5. Filtre recherche textuelle
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${cand.first_name} ${cand.last_name}`.toLowerCase();
        const club = (cand.current_club || '').toLowerCase();
        const pos = (cand.primary_position || '').toLowerCase();
        if (!fullName.includes(q) && !club.includes(q) && !pos.includes(q)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const evalA = playerEvaluationsMap.get(a.id);
      const evalB = playerEvaluationsMap.get(b.id);
      const scoreA = evalA?.overall_score;
      const scoreB = evalB?.overall_score;

      // 1. Joueur avec évaluation passe avant joueur sans évaluation
      if (scoreA !== undefined && scoreB === undefined) return -1;
      if (scoreA === undefined && scoreB !== undefined) return 1;

      // 2. Meilleur score d'évaluation décroissant
      if (scoreA !== undefined && scoreB !== undefined) {
        if (scoreB !== scoreA) return scoreB - scoreA;
        // 3. En cas d'égalité, évaluation la plus récente
        const dateA = new Date(evalA.evaluation_date).getTime() || 0;
        const dateB = new Date(evalB.evaluation_date).getTime() || 0;
        return dateB - dateA;
      }

      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    });
  }, [scopedCandidates, scoutFilter, categoryFilter, shortlistOnly, minScoreFilter, searchQuery, playerEvaluationsMap]);

  // Fonction de placement automatique d'un candidat sur le slot tactique le plus adapté
  const mapCandidateToSlotIndex = (
    cand: TrialCandidate,
    slots: FormationSlot[],
    currentMap?: Record<number, TrialCandidate[]>
  ): number => {
    const pos = (cand.primary_position || '').toUpperCase();
    const sec = (cand.secondary_position || '').toUpperCase();
    const fullPos = `${pos} ${sec}`;

    // Helper pour trouver un slot avec départage si plusieurs existent (ex: DC Droit vs DC Gauche)
    const findSlot = (predicate: (s: FormationSlot) => boolean): number => {
      const matchingIndices = slots
        .map((s, idx) => ({ s, idx }))
        .filter(item => predicate(item.s))
        .map(item => item.idx);

      if (matchingIndices.length === 0) return -1;
      if (matchingIndices.length === 1 || !currentMap) return matchingIndices[0];

      // Si plusieurs slots correspondent (ex: DC Droit et DC Gauche, ou MC Droit et MC Gauche) :
      // 1. Préférer le côté explicite si le joueur le mentionne
      if (fullPos.includes('GAUCHE') || fullPos.includes(' G ') || fullPos.endsWith(' G') || fullPos.includes('LEFT')) {
        const leftIdx = matchingIndices.find(idx => slots[idx].label.includes('Gauche') || slots[idx].label.includes(' G') || slots[idx].label.endsWith('G'));
        if (leftIdx !== undefined) return leftIdx;
      }
      if (fullPos.includes('DROIT') || fullPos.includes(' D ') || fullPos.endsWith(' D') || fullPos.includes('RIGHT')) {
        const rightIdx = matchingIndices.find(idx => slots[idx].label.includes('Droit') || slots[idx].label.includes(' D') || slots[idx].label.endsWith('D'));
        if (rightIdx !== undefined) return rightIdx;
      }
      if (fullPos.includes('AXE') || fullPos.includes('AXIAL')) {
        const centerIdx = matchingIndices.find(idx => slots[idx].label.includes('Axe') || slots[idx].label.includes('Axial'));
        if (centerIdx !== undefined) return centerIdx;
      }

      // 2. Sinon, choisir le slot qui a le moins de joueurs actuellement (équilibre naturel)
      let bestIdx = matchingIndices[0];
      let minCount = currentMap[bestIdx]?.length || 0;
      for (let i = 1; i < matchingIndices.length; i++) {
        const idx = matchingIndices[i];
        const count = currentMap[idx]?.length || 0;
        if (count < minCount) {
          minCount = count;
          bestIdx = idx;
        }
      }
      return bestIdx;
    };

    // 1. Gardien de But
    if (fullPos.includes('GARDIEN') || fullPos.includes('GK') || fullPos.includes('GB')) {
      const idx = findSlot(s => s.roleCode === 'GK' || s.category === 'GK');
      if (idx !== -1) return idx;
    }

    // 2. Avant-Centre / Buteur / Attaquant de pointe
    if (
      fullPos.includes('AVANT-CENTRE') || fullPos.includes('AVANT CENTRE') || fullPos.includes('CENTRE-AVANT') ||
      fullPos.includes('BUTEUR') || fullPos.includes('ST') || fullPos.includes('CF') || fullPos.includes('BU') ||
      fullPos.includes('POINTE') || fullPos.includes('ATTAQUANT') || fullPos.includes('ATT')
    ) {
      const isWing = fullPos.includes('AILIER') || fullPos.includes('AG') || fullPos.includes('AD') || fullPos.includes('LW') || fullPos.includes('RW');
      if (!isWing) {
        const idx = findSlot(s => s.roleCode === 'ST' || s.label.includes('BU'));
        if (idx !== -1) return idx;
      }
    }

    // 3. Ailier Gauche
    if (fullPos.includes('AILIER G') || fullPos.includes('LW') || fullPos.includes('AG') || (fullPos.includes('AILIER') && fullPos.includes('GAUCHE')) || fullPos.includes('ATTAQUANT G')) {
      const idx = findSlot(s => s.roleCode === 'LW' || s.label === 'AG' || s.label === 'MG' || s.roleCode === 'LM');
      if (idx !== -1) return idx;
    }

    // 4. Ailier Droit
    if (fullPos.includes('AILIER D') || fullPos.includes('RW') || fullPos.includes('AD') || (fullPos.includes('AILIER') && fullPos.includes('DROIT')) || fullPos.includes('ATTAQUANT D')) {
      const idx = findSlot(s => s.roleCode === 'RW' || s.label === 'AD' || s.label === 'MD' || s.roleCode === 'RM');
      if (idx !== -1) return idx;
    }

    // 5. Latéral Gauche / Piston Gauche
    if (fullPos.includes('LATÉRAL G') || fullPos.includes('LATERAL G') || fullPos.includes('PISTON G') || fullPos.includes('LB') || fullPos.includes('LWB') || fullPos.includes('DG')) {
      const idx = findSlot(s => s.roleCode === 'LB' || s.roleCode === 'LWB' || s.label === 'DG' || s.label.includes('Piston G'));
      if (idx !== -1) return idx;
    }

    // 6. Latéral Droit / Piston Droit
    if (fullPos.includes('LATÉRAL D') || fullPos.includes('LATERAL D') || fullPos.includes('PISTON D') || fullPos.includes('RB') || fullPos.includes('RWB') || fullPos.includes('DD')) {
      const idx = findSlot(s => s.roleCode === 'RB' || s.roleCode === 'RWB' || s.label === 'DD' || s.label.includes('Piston D'));
      if (idx !== -1) return idx;
    }

    // 7. Défenseur Central
    if (fullPos.includes('DÉFENSEUR CENTRAL') || fullPos.includes('DEFENSEUR CENTRAL') || fullPos.includes('CB') || fullPos.includes('DC') || (fullPos.includes('DEF') && fullPos.includes('CENTRAL'))) {
      const idx = findSlot(s => s.roleCode === 'CB' || s.label.includes('DC'));
      if (idx !== -1) return idx;
    }

    // 8. Milieu Défensif
    if (fullPos.includes('DÉFENSIF') || fullPos.includes('DEFENSIF') || fullPos.includes('CDM') || fullPos.includes('MDC') || fullPos.includes('SENTINELLE')) {
      const idx = findSlot(s => s.roleCode === 'CDM' || s.label.includes('MDC'));
      if (idx !== -1) return idx;
    }

    // 9. Milieu Offensif
    if (fullPos.includes('OFFENSIF') || fullPos.includes('CAM') || fullPos.includes('MOC') || fullPos.includes('10') || fullPos.includes('MENEUR')) {
      const idx = findSlot(s => s.roleCode === 'CAM' || s.label === 'MOC');
      if (idx !== -1) return idx;
    }

    // 10. Milieu Central
    if (fullPos.includes('MILIEU CENTRAL') || fullPos.includes('CM') || fullPos.includes('MC') || fullPos.includes('MILIEU') || fullPos.includes('RELAIS')) {
      const idx = findSlot(s => s.roleCode === 'CM' || s.label.includes('MC') || s.category === 'MID');
      if (idx !== -1) return idx;
    }

    // Fallbacks généraux par catégorie
    if (fullPos.includes('ATT') || fullPos.includes('BUTEUR')) {
      const idx = findSlot(s => s.category === 'ATT');
      if (idx !== -1) return idx;
    }
    if (fullPos.includes('MID') || fullPos.includes('MIL')) {
      const idx = findSlot(s => s.category === 'MID');
      if (idx !== -1) return idx;
    }
    if (fullPos.includes('DEF') || fullPos.includes('DÉF')) {
      const idx = findSlot(s => s.category === 'DEF');
      if (idx !== -1) return idx;
    }

    // Slot par défaut : milieu
    return Math.floor(slots.length / 2);
  };

  // Regroupement automatique des joueurs par slot tactique
  const playersBySlot = useMemo(() => {
    const map: Record<number, TrialCandidate[]> = {};
    activeFormation.slots.forEach((_, idx) => {
      map[idx] = [];
    });

    // RÈGLE STRICTE : Si aucune catégorie n'est sélectionnée, le terrain reste STRICTEMENT VIDE !
    if (!categoryFilter) {
      return map;
    }

    const excludedIds = new Set(customSlotOrder._excluded_candidate_ids || []);

    // Index des candidats éligibles pour cette catégorie et ce scout
    const eligibleCandidatesMap = new Map<string, TrialCandidate>();
    categoryCandidates.forEach(cand => {
      eligibleCandidatesMap.set(cand.id, cand);
    });

    // 1. Affecter en priorité absolue les joueurs assignés explicitement à un slot dans customSlotOrder
    // CONDITION STRICTE : Seuls les candidats éligibles de la catégorie sélectionnée sont positionnés !
    const assignedIds = new Set<string>();

    activeFormation.slots.forEach((slot, slotIdx) => {
      const explicitIds = customSlotOrder[slot.label] || customSlotOrder[`slot_${slotIdx}`] || [];
      explicitIds.forEach(candId => {
        if (excludedIds.has(candId) || assignedIds.has(candId)) return;
        const cand = eligibleCandidatesMap.get(candId);
        if (cand && cand.pipeline_stage !== 'prospect') {
          map[slotIdx].push(cand);
          assignedIds.add(cand.id);
        }
      });
    });

    // 2. Pour tous les autres candidats non encore assignés explicitement, les mapper intelligemment
    categoryCandidates.forEach(cand => {
      if (excludedIds.has(cand.id)) return;
      if (cand.pipeline_stage === 'prospect') return;
      if (assignedIds.has(cand.id)) return;

      const slotIdx = mapCandidateToSlotIndex(cand, activeFormation.slots, map);
      if (map[slotIdx]) {
        map[slotIdx].push(cand);
      } else {
        map[0]?.push(cand);
      }
    });

    // 3. Appliquer le tri selon pitchSortOption ou l'ordre personnalisé du Drag & Drop
    activeFormation.slots.forEach((slot, idx) => {
      const customIds = customSlotOrder[slot.label] || customSlotOrder[`slot_${idx}`] || customSlotOrder[slot.roleCode];

      if (pitchSortOption === 'score') {
        // Tri forcé par dernier score d'évaluation
        if (map[idx] && map[idx].length > 1) {
          map[idx].sort((a, b) => {
            const evalA = playerEvaluationsMap.get(a.id);
            const evalB = playerEvaluationsMap.get(b.id);
            const scoreA = evalA?.overall_score;
            const scoreB = evalB?.overall_score;
            if (scoreA !== undefined && scoreB === undefined) return -1;
            if (scoreA === undefined && scoreB !== undefined) return 1;
            if (scoreA !== undefined && scoreB !== undefined) {
              if (scoreB !== scoreA) return scoreB - scoreA;
              const dateA = new Date(evalA.evaluation_date).getTime() || 0;
              const dateB = new Date(evalB.evaluation_date).getTime() || 0;
              return dateB - dateA;
            }
            return 0;
          });
        }
      } else if (pitchSortOption === 'scout') {
        // Tri par scout découvreur
        if (map[idx] && map[idx].length > 1) {
          map[idx].sort((a, b) => {
            const scoutA = (a.discovering_scout_name || 'Cellule FUS').toLowerCase();
            const scoutB = (b.discovering_scout_name || 'Cellule FUS').toLowerCase();
            const cmp = scoutA.localeCompare(scoutB);
            if (cmp !== 0) return cmp;
            const evalA = playerEvaluationsMap.get(a.id);
            const evalB = playerEvaluationsMap.get(b.id);
            const scoreA = evalA?.overall_score ?? -1;
            const scoreB = evalB?.overall_score ?? -1;
            return scoreB - scoreA;
          });
        }
      } else {
        // Ordre par défaut / Ordre personnalisé issu du Drag & Drop
        if (customIds && customIds.length > 0 && map[idx] && map[idx].length > 1) {
          map[idx].sort((a, b) => {
            const idxA = customIds.indexOf(a.id);
            const idxB = customIds.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return 0;
          });
        }
      }
    });

    // Si l'option "Meilleur Score par Poste" est active : ne garder que le 1er joueur du slot
    if (onlyBestScorePerPosition) {
      Object.keys(map).forEach(key => {
        const slotIdx = Number(key);
        if (map[slotIdx].length > 1) {
          map[slotIdx] = [map[slotIdx][0]];
        }
      });
    }

    return map;
  }, [categoryCandidates, categoryFilter, scoutFilter, activeFormation, onlyBestScorePerPosition, customSlotOrder, pitchSortOption, playerEvaluationsMap]);

  // Handlers pour le Drag & Drop et la réorganisation dans le tiroir latéral
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedCandidateId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCandidateId !== id) {
      setDragOverCandidateId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!canEditCurrentShortlist) {
      toast.error("Opération refusée : Vous êtes en mode Visualisation Seule sur la shortlist d'un autre scout.");
      return;
    }
    const sourceId = draggedCandidateId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId || !selectedSlotForDrawer) return;

    const currentList = [...(playersBySlot[selectedSlotForDrawer.slotIndex] || [])];
    const sourceIndex = currentList.findIndex(c => c.id === sourceId);
    const targetIndex = currentList.findIndex(c => c.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const [moved] = currentList.splice(sourceIndex, 1);
    currentList.splice(targetIndex, 0, moved);

    const newOrderIds = currentList.map(c => c.id);
    saveCustomSlotOrder({
      ...customSlotOrder,
      [selectedSlotForDrawer.label]: newOrderIds,
      [selectedSlotForDrawer.roleCode]: newOrderIds,
    });

    setPitchSortOption('none');
    setDraggedCandidateId(null);
    setDragOverCandidateId(null);
    toast.success("Ordre personnalisé mis à jour");
  };

  const handleMovePlayer = (candidateId: string, direction: 'up' | 'down') => {
    if (!canEditCurrentShortlist) return;
    if (!selectedSlotForDrawer) return;
    const currentList = [...(playersBySlot[selectedSlotForDrawer.slotIndex] || [])];
    const index = currentList.findIndex(c => c.id === candidateId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentList.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const [moved] = currentList.splice(index, 1);
    currentList.splice(targetIndex, 0, moved);

    const newOrderIds = currentList.map(c => c.id);
    saveCustomSlotOrder({
      ...customSlotOrder,
      [selectedSlotForDrawer.label]: newOrderIds,
      [selectedSlotForDrawer.roleCode]: newOrderIds,
    });
    setPitchSortOption('none');
  };

  const handleSortByLastScore = () => {
    if (!canEditCurrentShortlist) return;
    if (!selectedSlotForDrawer) return;
    const updated = { ...customSlotOrder };
    delete updated[selectedSlotForDrawer.label];
    delete updated[selectedSlotForDrawer.roleCode];
    saveCustomSlotOrder(updated);
    toast.success(`Poste ${selectedSlotForDrawer.label} réordonné par note d'évaluation`);
  };

  // Retirer un joueur de la shortlist (et de ce poste tactique)
  const handleRemoveCandidateFromShortlist = async (cand: TrialCandidate, slotIndex?: number) => {
    if (!cand) return;
    if (isScoutManager && !isCandidateBelongingToCurrentScoutManager(cand)) {
      toast.error("Opération refusée : Vous ne pouvez pas virer ou retirer un joueur appartenant à un autre scout de la shadow list.");
      return;
    }
    if (!canEditCurrentShortlist) {
      toast.error("Opération refusée : Vous êtes en mode Visualisation Seule sur la shortlist d'un autre scout.");
      return;
    }
    const confirmMsg = `Êtes-vous sûr de vouloir retirer ${cand.first_name} ${cand.last_name} de la shortlist ?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      // 1. Mettre à jour le statut du joueur dans Supabase vers 'prospect'
      if (onUpdateCandidate) {
        await onUpdateCandidate(cand.id, { pipeline_stage: 'prospect' });
      } else {
        await recruitmentService.updateCandidate(cand.id, { pipeline_stage: 'prospect' });
      }

      // 2. Mettre à jour customSlotOrder : retirer l'ID du joueur de tous les slots et l'ajouter à _excluded_candidate_ids
      const updated = { ...customSlotOrder };
      const excluded = new Set(updated._excluded_candidate_ids || []);
      excluded.add(cand.id);
      updated._excluded_candidate_ids = Array.from(excluded);

      // Nettoyer des slots existants
      Object.keys(updated).forEach(key => {
        if (key !== '_excluded_candidate_ids' && Array.isArray(updated[key])) {
          updated[key] = updated[key].filter(id => id !== cand.id);
        }
      });
      saveCustomSlotOrder(updated);

      // 3. Fermer le panneau d'inspection s'il était ouvert pour ce joueur
      if (inspectedCandidate?.id === cand.id) {
        setInspectedCandidate(null);
      }

      toast.success(`${cand.first_name} ${cand.last_name} a été retiré de la shortlist`);
    } catch (err: any) {
      console.error('Erreur lors du retrait de la shortlist:', err);
      toast.error("Impossible de retirer le joueur de la shortlist");
    }
  };

  // Vérifie si la position d'un joueur correspond au poste du slot sélectionné
  const isPlayerPositionMatchingSlot = (cand: TrialCandidate, slot: { roleCode: string; label: string; category: 'GK' | 'DEF' | 'MID' | 'ATT' }): boolean => {
    const pos = (cand.primary_position || '').toUpperCase().trim();
    const sec = (cand.secondary_position || '').toUpperCase().trim();
    const rCode = slot.roleCode.toUpperCase();
    const sLabel = slot.label.toUpperCase();
    const sCat = slot.category;

    const isGk = pos.includes('GARDIEN') || pos.includes('GK') || pos.includes('GB') || sec.includes('GARDIEN');
    if (sCat === 'GK' || rCode === 'GK') {
      return isGk;
    }
    // Si ce n'est pas un slot gardien, un gardien ne doit JAMAIS correspondre
    if (isGk) {
      return false;
    }

    // Correspondance de mot entier ou début/fin pour éviter que "PISTON" matche "ST" ou "GARDIEN DE BUT" matche "BU"
    const exactMatch = (text: string, term: string) => {
      if (!text || !term) return false;
      const regex = new RegExp(`(^|[^A-Z0-9À-ÖØ-ß])${term}([^A-Z0-9À-ÖØ-ß]|$)`, 'i');
      return regex.test(text);
    };

    if (exactMatch(pos, rCode) || exactMatch(pos, sLabel) || exactMatch(sec, rCode) || exactMatch(sec, sLabel)) {
      return true;
    }

    // Avant-Centre / Buteur / Attaquant de pointe
    if (rCode === 'ST' || rCode === 'CF' || sLabel.includes('BU')) {
      const isForward =
        exactMatch(pos, 'ST') || exactMatch(pos, 'CF') || exactMatch(pos, 'BU') ||
        pos.includes('BUTEUR') || pos.includes('AVANT-CENTRE') || pos.includes('AVANT CENTRE') ||
        pos.includes('CENTRE-AVANT') || pos.includes('ATTAQUANT') || pos.includes('POINTE') ||
        exactMatch(sec, 'ST') || exactMatch(sec, 'CF') || exactMatch(sec, 'BU') ||
        sec.includes('BUTEUR') || sec.includes('AVANT-CENTRE') || sec.includes('AVANT CENTRE') ||
        sec.includes('ATTAQUANT');
      return isForward;
    }

    // Latéral Droit / Piston D
    if (rCode === 'RB' || rCode === 'RWB' || sLabel.includes('DD') || sLabel.includes('PISTON D')) {
      return pos.includes('LATÉRAL D') || pos.includes('LATERAL D') || pos.includes('PISTON D') || exactMatch(pos, 'RB') || exactMatch(pos, 'DD') ||
        sec.includes('LATÉRAL D') || sec.includes('LATERAL D') || sec.includes('PISTON D') || exactMatch(sec, 'RB') || exactMatch(sec, 'DD') ||
        (pos.includes('DROIT') && (pos.includes('DEF') || pos.includes('DÉF')));
    }

    // Latéral Gauche / Piston G
    if (rCode === 'LB' || rCode === 'LWB' || sLabel.includes('DG') || sLabel.includes('PISTON G')) {
      return pos.includes('LATÉRAL G') || pos.includes('LATERAL G') || pos.includes('PISTON G') || exactMatch(pos, 'LB') || exactMatch(pos, 'DG') ||
        sec.includes('LATÉRAL G') || sec.includes('LATERAL G') || sec.includes('PISTON G') || exactMatch(sec, 'LB') || exactMatch(sec, 'DG') ||
        (pos.includes('GAUCHE') && (pos.includes('DEF') || pos.includes('DÉF')));
    }

    // Défenseur Central
    if (rCode === 'CB' || sLabel.includes('DC')) {
      return exactMatch(pos, 'CB') || exactMatch(pos, 'DC') || pos.includes('DÉFENSEUR CENTRAL') || pos.includes('DEFENSEUR CENTRAL') ||
        exactMatch(sec, 'CB') || exactMatch(sec, 'DC') || sec.includes('DÉFENSEUR CENTRAL') || sec.includes('DEFENSEUR CENTRAL') ||
        ((pos.includes('DEF') || pos.includes('DÉF')) && (pos.includes('CENTRAL') || pos.includes('AXE') || pos.includes('AXIAL')));
    }

    // Milieu Défensif
    if (rCode === 'CDM' || sLabel.includes('MDC')) {
      return exactMatch(pos, 'CDM') || exactMatch(pos, 'MDC') || pos.includes('DÉFENSIF') || pos.includes('DEFENSIF') || pos.includes('SENTINELLE') ||
        exactMatch(sec, 'CDM') || exactMatch(sec, 'MDC') || sec.includes('DÉFENSIF') || sec.includes('DEFENSIF');
    }

    // Milieu Offensif
    if (rCode === 'CAM' || sLabel.includes('MOC')) {
      return exactMatch(pos, 'CAM') || exactMatch(pos, 'MOC') || pos.includes('OFFENSIF') || exactMatch(pos, '10') || pos.includes('MENEUR') ||
        exactMatch(sec, 'CAM') || exactMatch(sec, 'MOC') || sec.includes('OFFENSIF');
    }

    // Milieu Central
    if (rCode === 'CM' || sLabel.includes('MC') || sLabel === 'MD' || sLabel === 'MG') {
      return exactMatch(pos, 'CM') || exactMatch(pos, 'MC') || exactMatch(pos, 'MD') || exactMatch(pos, 'MG') || pos.includes('MILIEU CENTRAL') || pos.includes('MILIEU') ||
        exactMatch(sec, 'CM') || exactMatch(sec, 'MC') || sec.includes('MILIEU');
    }

    // Ailier Droit
    if (rCode === 'RW' || sLabel.includes('AD')) {
      return exactMatch(pos, 'RW') || exactMatch(pos, 'AD') || pos.includes('AILIER D') || (pos.includes('AILIER') && pos.includes('DROIT')) ||
        exactMatch(sec, 'RW') || exactMatch(sec, 'AD') || sec.includes('AILIER D');
    }

    // Ailier Gauche
    if (rCode === 'LW' || sLabel.includes('AG')) {
      return exactMatch(pos, 'LW') || exactMatch(pos, 'AG') || pos.includes('AILIER G') || (pos.includes('AILIER') && pos.includes('GAUCHE')) ||
        exactMatch(sec, 'LW') || exactMatch(sec, 'AG') || sec.includes('AILIER G');
    }

    // Fallbacks par secteur
    if (sCat === 'DEF') return (pos.includes('DEF') || pos.includes('DÉF')) && !pos.includes('MILIEU');
    if (sCat === 'MID') return pos.includes('MIL') || pos.includes('MID');
    if (sCat === 'ATT') return pos.includes('ATT') || pos.includes('AILIER') || pos.includes('BUTEUR');

    return false;
  };

  // Candidats disponibles dans la base de données pour l'assignation au poste
  // Filtrés prioritairement par POSITION selon la demande utilisateur
  // CONDITION STRICTE : Seuls les joueurs appartenant STRICTEMENT au Scout et à la Catégorie choisis peuvent être affichés et ajoutés !
  const candidatesForSlotSelection = useMemo(() => {
    if (!slotForAddingPlayer) return [];
    // Condition : La catégorie est obligatoire pour le terrain
    if (!categoryFilter) return [];

    const query = playerModalSearch.toLowerCase().trim();

    return scopedCandidates.filter(cand => {
      // Exclure les archivés
      if (cand.pipeline_stage === 'archived' || cand.status === 'archived') return false;

      // 1. CONDITION DE LA CATÉGORIE SÉLECTIONNÉE (Désactivée en mode all_categories ou si categoryFilter === ALL)
      if (positionFilterMode !== 'all_categories' && categoryFilter !== 'ALL') {
        if (!isCandidateMatchingCategory(cand.age_category, categoryFilter)) {
          return false;
        }
      }

      // 2. Filtrage strict par scout détecteur (sauf si 'ALL')
      if (scoutFilter && scoutFilter !== 'ALL' && !isCandidateDetectedBySelectedScout(cand, scoutFilter)) {
        return false;
      }

      // 3. Filtrage par position selon le mode sélectionné
      if (positionFilterMode === 'matching') {
        if (!isPlayerPositionMatchingSlot(cand, slotForAddingPlayer)) {
          return false;
        }
      }

      // 3. Filtrer par recherche textuelle si présente
      if (query) {
        const fullName = `${cand.first_name} ${cand.last_name}`.toLowerCase();
        const club = (cand.current_club || '').toLowerCase();
        const pos = (cand.primary_position || '').toLowerCase();
        const cat = (cand.age_category || '').toLowerCase();
        const scout = (cand.discovering_scout_name || '').toLowerCase();
        if (!fullName.includes(query) && !club.includes(query) && !pos.includes(query) && !cat.includes(query) && !scout.includes(query)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // 1. Correspondance exacte du poste
      const aMatches = isPlayerPositionMatchingSlot(a, slotForAddingPlayer) ? 1 : 0;
      const bMatches = isPlayerPositionMatchingSlot(b, slotForAddingPlayer) ? 1 : 0;
      if (bMatches !== aMatches) return bMatches - aMatches;

      // 2. Priorité aux joueurs de la catégorie
      const aSameCat = a.age_category === categoryFilter ? 1 : 0;
      const bSameCat = b.age_category === categoryFilter ? 1 : 0;
      if (bSameCat !== aSameCat) return bSameCat - aSameCat;

      // 3. Priorité aux joueurs découverts par le scout actuellement sélectionné s'il y en a un
      if (scoutFilter && scoutFilter !== 'ALL') {
        const aSameScout = isCandidateDetectedBySelectedScout(a, scoutFilter) ? 1 : 0;
        const bSameScout = isCandidateDetectedBySelectedScout(b, scoutFilter) ? 1 : 0;
        if (bSameScout !== aSameScout) return bSameScout - aSameScout;
      }

      // 4. Meilleure note d'évaluation
      const evalA = playerEvaluationsMap.get(a.id)?.overall_score ?? -1;
      const evalB = playerEvaluationsMap.get(b.id)?.overall_score ?? -1;
      if (evalB !== evalA) return evalB - evalA;

      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    });
  }, [candidates, slotForAddingPlayer, positionFilterMode, playerModalSearch, categoryFilter, scoutFilter, playerEvaluationsMap]);

  // Handler pour assigner un joueur existant de la base de données au poste sélectionné
  const handleAssignExistingCandidateToSlot = async (candidate: TrialCandidate) => {
    if (!slotForAddingPlayer) return;

    if (!canEditCurrentShortlist) {
      toast.error("Opération refusée : Vous êtes en mode Visualisation Seule sur la shortlist d'un autre scout.");
      return;
    }

    if (!categoryFilter) {
      toast.error("Veuillez d'abord sélectionner une catégorie sur le terrain.");
      return;
    }

    setIsAssigningPlayer(true);

    try {
      const targetRoleCode = slotForAddingPlayer.roleCode;
      const targetLabel = slotForAddingPlayer.label;
      const targetSlotIndex = slotForAddingPlayer.slotIndex;
      const fullRoleName = ROLE_FULL_NAMES[targetLabel] || targetLabel;

      // 1. Préparer les modifications pour le joueur (ajustement du poste et statut shortlisté)
      const updates: Partial<TrialCandidate> = {
        primary_position: fullRoleName || targetRoleCode || targetLabel,
        pipeline_stage: 'shortlisted',
        status: candidate.status === 'archived' ? 'registered' : candidate.status,
      };

      // 2. Enregistrer la mise à jour du joueur (Supabase + local)
      if (onUpdateCandidate) {
        await onUpdateCandidate(candidate.id, updates);
      } else {
        await recruitmentService.updateCandidate(candidate.id, updates);
      }

      // 3. Mettre à jour customSlotOrder : retirer le joueur des autres slots et l'assigner à ce slot
      const updatedOrder = { ...customSlotOrder };
      if (updatedOrder._excluded_candidate_ids) {
        updatedOrder._excluded_candidate_ids = updatedOrder._excluded_candidate_ids.filter(id => id !== candidate.id);
      }

      // Retirer le joueur de tous les autres slots pour éviter les doublons sur le terrain
      Object.keys(updatedOrder).forEach(key => {
        if (key !== '_excluded_candidate_ids' && Array.isArray(updatedOrder[key])) {
          updatedOrder[key] = updatedOrder[key].filter(id => id !== candidate.id);
        }
      });

      // L'assigner en tête de liste pour ce slot
      const existingSlotIds = updatedOrder[targetLabel] || [];
      const newSlotIds = [candidate.id, ...existingSlotIds.filter(id => id !== candidate.id)];
      updatedOrder[targetLabel] = newSlotIds;
      updatedOrder[`slot_${targetSlotIndex}`] = newSlotIds;
      saveCustomSlotOrder(updatedOrder);

      const isSurclasse = candidate.age_category && categoryFilter !== 'ALL' && candidate.age_category !== categoryFilter;
      toast.success(
        `✓ ${candidate.first_name} ${candidate.last_name}${isSurclasse ? ` (${candidate.age_category} surclassé en ${categoryFilter})` : ''} assigné au poste ${targetLabel} (${targetRoleCode}) !`,
        { icon: '⭐' }
      );

      // 4. Fermer le modal
      setSlotForAddingPlayer(null);
      setPlayerModalSearch('');
    } catch (err: any) {
      console.error('Erreur assignation joueur au slot:', err);
      toast.error("Erreur lors de l'assignation du joueur au poste");
    } finally {
      setIsAssigningPlayer(false);
    }
  };

  // Nombre total de joueurs effectivement affichés sur le terrain
  const positionedPlayersCount = useMemo(() => {
    return Object.values(playersBySlot).reduce((sum, list) => sum + list.length, 0);
  }, [playersBySlot]);

  // Décompte des candidats par catégorie d'âge (filtré selon le scout sélectionné s'il est spécifié)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    scopedCandidates.forEach(c => {
      if (c.pipeline_stage === 'archived' || c.status === 'archived') return;
      if (scoutFilter && scoutFilter !== 'ALL' && !isCandidateDetectedBySelectedScout(c, scoutFilter)) {
        return;
      }
      const rawCat = (c.age_category || '').trim();
      if (!rawCat) return;
      const matchedCat = RECRUITMENT_AGE_CATEGORIES.find(rc => normalizeCat(rc) === normalizeCat(rawCat)) || rawCat;
      counts[matchedCat] = (counts[matchedCat] || 0) + 1;
    });
    return counts;
  }, [scopedCandidates, scoutFilter]);

  // Nombre total de joueurs détectés par le scout sélectionné (ou total club si 'ALL')
  const totalScoutPlayersCount = useMemo(() => {
    if (!scoutFilter) return 0;
    if (scoutFilter === 'ALL') return scopedCandidates.filter(c => c.pipeline_stage !== 'archived' && c.status !== 'archived').length;
    return scopedCandidates.filter(c => c.pipeline_stage !== 'archived' && c.status !== 'archived' && isCandidateDetectedBySelectedScout(c, scoutFilter)).length;
  }, [scopedCandidates, scoutFilter]);

  // ── CAPTURE & GÉNÉRATION PDF HAUTE FIDÉLITÉ DE LA SHADOW LIST VIA @PDFME (US-DASH-40) ──
  const handleExportPDF = async () => {
    if (!scoutFilter || !categoryFilter) {
      toast.warning("Veuillez sélectionner un scout et une catégorie avant d'exporter la Shadow List.");
      return;
    }

    if (!pitchCaptureRef.current) {
      toast.error("Conteneur du terrain introuvable.");
      return;
    }

    try {
      setIsExportingPDF(true);
      toast.loading("Capture haute résolution du terrain et génération du PDF (@pdfme)...", { id: 'pdf-export-toast' });

      // Petit délai pour stabiliser le rendu et les polices
      await new Promise(resolve => setTimeout(resolve, 300));

      const element = pitchCaptureRef.current;

      // Fixer temporairement les dimensions de capture optimales pour un ratio parfait sans rognage
      const origMaxWidth = element.style.maxWidth;
      const origWidth = element.style.width;
      element.style.maxWidth = '1180px';
      element.style.width = '1180px';

      const canvas = await html2canvas(element, {
        scale: 2, // 2x haute résolution pour netteté vectorielle
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#020617', // Fond Slate-950 officiel FUS
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1440,
      });

      // Rétablir immédiatement les dimensions d'écran interactives
      element.style.maxWidth = origMaxWidth;
      element.style.width = origWidth;

      const isLandscape = canvas.width >= canvas.height;
      const pageWidth = isLandscape ? 297 : 210;
      const pageHeight = isLandscape ? 210 : 297;

      // Marges de 8mm
      const margin = 8;
      const availableWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - (margin * 2);

      const ratio = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
      const renderWidth = Math.round((canvas.width * ratio) * 100) / 100;
      const renderHeight = Math.round((canvas.height * ratio) * 100) / 100;

      const posX = Math.round((margin + (availableWidth - renderWidth) / 2) * 100) / 100;
      const posY = Math.round((margin + (availableHeight - renderHeight) / 2) * 100) / 100;

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Construction du template officiel @pdfme
      const template: Template = {
        basePdf: {
          width: pageWidth,
          height: pageHeight,
          padding: [0, 0, 0, 0],
        },
        schemas: [
          [
            {
              name: 'background',
              type: 'rectangle',
              position: { x: 0, y: 0 },
              width: pageWidth,
              height: pageHeight,
              color: '#020617',
            },
            {
              name: 'pitch_capture',
              type: 'image',
              position: { x: posX, y: posY },
              width: renderWidth,
              height: renderHeight,
            },
          ],
        ],
      };

      const plugins = { text, image, rectangle };
      const pdfUint8Array = await generate({
        template,
        inputs: [{ background: '', pitch_capture: imgData }],
        plugins,
      });

      const blob = new Blob([pdfUint8Array.buffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      const cleanCategory = (categoryFilter || 'ALL').replace(/\s+/g, '_');
      const cleanFormation = (selectedFormationKey || '4-3-3').replace(/\s+/g, '_');
      const cleanScout = (scoutFilter || 'Scout').replace(/[^a-zA-Z0-9À-ÿ_-]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `FUS_ShadowList_${cleanCategory}_${cleanFormation}_${cleanScout}_${dateStr}.pdf`;

      // Déclenchement du téléchargement automatique
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Ouvrir également l'aperçu PDF dans un nouvel onglet si possible
      try {
        window.open(blobUrl, '_blank');
      } catch (e) {
        // En cas de blocage popup, le fichier est déjà téléchargé
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);

      toast.success("Shadow List capturée et générée en PDF avec succès (@pdfme) !", { id: 'pdf-export-toast' });
    } catch (err: any) {
      console.error("Erreur lors de la capture et génération PDF avec @pdfme :", err);
      toast.error("Erreur lors de la création du PDF avec @pdfme. Veuillez réessayer.", { id: 'pdf-export-toast' });
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "space-y-6 animate-in fade-in duration-200",
        isFullscreen && "bg-slate-50 p-6 overflow-y-auto h-screen"
      )}
    >
      {/* ── BANDEAU DE GESTION & SAUVEGARDE DES SHORTLISTS (US-DASH-33) ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-slate-700/80 space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-black border border-amber-400/30 shadow-inner shrink-0">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                  {isScoutManager
                    ? "Mes Shortlists Enregistrées (Shadow Teams)"
                    : (scoutFilter && scoutFilter !== 'ALL'
                      ? `Shortlists Enregistrées — Scout ${selectedScout?.full_name || scoutFilter}`
                      : "Configurations de Shortlist Enregistrées")}
                </h3>
                {scopedSavedShortlists.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {scopedSavedShortlists.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 font-medium">
                {isScoutManager
                  ? "Accédez à vos propres compositions tactiques et configurations de détection."
                  : (scoutFilter && scoutFilter !== 'ALL'
                    ? `Visualisez et chargez les compositions tactiques enregistrées pour ${selectedScout?.full_name || scoutFilter}.`
                    : "Enregistrez vos shortlists avec un intitulé pour y accéder à tout moment.")}
              </p>
            </div>
          </div>

          {/* Actions : sélecteur + boutons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Dropdown sélecteur de shortlist */}
            <div className="relative min-w-[220px] max-w-xs">
              <select
                value={activeSavedShortlistId || ''}
                onChange={(e) => handleSelectSavedShortlist(e.target.value)}
                className="w-full bg-slate-800/90 text-white text-xs font-bold rounded-xl border border-slate-600 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all cursor-pointer truncate"
              >
                <option value="" className="text-slate-400">
                  {scopedSavedShortlists.length === 0 ? "Aucune shortlist enregistrée" : "-- Choisir une shortlist --"}
                </option>
                {myShortlists.length > 0 && (
                  <optgroup
                    label={
                      isAdmin && !isScoutManager
                        ? (scoutFilter && scoutFilter !== 'ALL'
                          ? `📋 Shortlists de ${selectedScout?.full_name || scoutFilter} (${myShortlists.length})`
                          : `🌟 Toutes les shortlists du club (${myShortlists.length})`)
                        : `⭐ Mes Shortlists (${myShortlists.length})`
                    }
                    className="text-slate-900 bg-white font-bold"
                  >
                    {myShortlists.map(s => (
                      <option key={s.id} value={s.id} className="text-slate-900 bg-white font-medium">
                        {s.title} {(!scoutFilter || scoutFilter === 'ALL' || !isAdmin) && (s.author_name || s.scout_filter) ? `[Scout: ${s.author_name || s.scout_filter}]` : ''} ({s.category_filter || 'Toutes'} - {s.formation_key})
                      </option>
                    ))}
                  </optgroup>
                )}
                {otherShortlists.length > 0 && (
                  <optgroup
                    label={
                      isAdmin && !isScoutManager
                        ? `🌐 Autres shortlists du club (${otherShortlists.length})`
                        : "👥 Shortlists des autres scouts (Visualisation seule)"
                    }
                    className="text-slate-900 bg-white font-bold"
                  >
                    {otherShortlists.map(s => (
                      <option key={s.id} value={s.id} className="text-slate-700 bg-slate-50 font-medium">
                        👁️ {s.title} [{s.author_name || s.scout_filter || 'Scout'}] ({s.category_filter || 'Toutes'} - {s.formation_key})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Bouton Gérer les shortlists (Admin & Équipe) */}
            <button
              type="button"
              onClick={() => setIsManagerModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700 hover:border-amber-400/50 text-xs font-black transition-all shadow-sm cursor-pointer"
              title="Gérer les shortlists enregistrées (modifier les intitulés, voir les compositions ou supprimer)"
            >
              <FolderKanban className="w-3.5 h-3.5 text-amber-400" />
              <span>Gérer ({scopedSavedShortlists.length})</span>
            </button>

            {/* Si shortlist active : bouton Enregistrer modifications (réservé au propriétaire / admin) */}
            {activeSavedShortlist && canEditCurrentShortlist && (
              <button
                type="button"
                onClick={handleQuickSaveCurrentShortlist}
                disabled={isSavingShortlist}
                title="Mettre à jour la composition actuelle dans cette shortlist"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Mettre à jour</span>
              </button>
            )}

            {/* Indicateur de lecture seule si shortlist d'un autre scout */}
            {activeSavedShortlist && !canEditCurrentShortlist && (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                <Eye className="w-3.5 h-3.5" />
                <span>Lecture seule</span>
              </span>
            )}

            {/* Bouton Enregistrer / Nouvelle Shortlist (toujours possible pour créer sa propre copie ou nouvelle shortlist) */}
            <button
              type="button"
              onClick={handleOpenSaveModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black transition-all shadow-sm cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>{activeSavedShortlist ? "Enregistrer sous..." : "Enregistrer cette Shortlist"}</span>
            </button>

            {/* Si shortlist active : bouton modifier l'intitulé (réservé au propriétaire / admin) */}
            {activeSavedShortlist && canEditCurrentShortlist && (
              <button
                type="button"
                onClick={handleOpenSaveModal}
                title="Modifier l'intitulé et la description de cette shortlist"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Si shortlist active : bouton supprimer (réservé au propriétaire / admin) */}
            {activeSavedShortlist && canEditCurrentShortlist && (
              <button
                type="button"
                onClick={() => handleDeleteSavedShortlist(activeSavedShortlist.id, activeSavedShortlist.title)}
                title="Supprimer cette shortlist enregistrée"
                className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Si shortlist active : bouton détacher du canevas */}
            {activeSavedShortlist && (
              <button
                type="button"
                onClick={handleClearActiveShortlist}
                title="Détacher cette shortlist du terrain"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Détails de la shortlist active si sélectionnée */}
        {activeSavedShortlist && (
          <div className="pt-2 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <BookmarkCheck className="w-3.5 h-3.5" />
                Active :
              </span>
              <span className="font-black text-white">{activeSavedShortlist.title}</span>
              {activeSavedShortlist.description && (
                <span className="text-slate-400 italic hidden sm:inline truncate max-w-sm">
                  — {activeSavedShortlist.description}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              {activeSavedShortlist.author_name && (
                <span className={cn(
                  "px-2 py-0.5 rounded-md font-bold text-[11px] border",
                  canEditCurrentShortlist
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                )}>
                  {canEditCurrentShortlist ? "👤 Ma shortlist" : `👤 Scout : ${activeSavedShortlist.author_name}`}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-mono text-[11px]">
                {activeSavedShortlist.category_filter || 'Toutes catégories'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-mono text-[11px]">
                {activeSavedShortlist.formation_key}
              </span>
              <span className="text-[11px] text-slate-400">
                Mis à jour le {new Date(activeSavedShortlist.updated_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bannière Mode Visualisation Seule si consultation d'un autre scout */}
      {!canEditCurrentShortlist && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs font-medium shadow-sm animate-in fade-in duration-200">
          <Eye className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="flex-1">
            <strong>Mode Visualisation Seule :</strong> Vous consultez la shortlist de{' '}
            <strong className="underline decoration-amber-500">{activeSavedShortlist?.author_name || activeSavedShortlist?.scout_filter || scoutFilter || 'ce scout'}</strong>.
            L'ajout, la modification d'ordre et le retrait de joueurs sont verrouillés. Pour créer et modifier votre propre version, cliquez sur <strong>« Enregistrer sous... »</strong>.
          </span>
        </div>
      )}

      {/* ── BANDEAU DE SÉLECTION OBLIGATOIRE : SCOUT & CATÉGORIE (SHORTLIST VIDE AVANT CHOIX) ── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-slate-200 shadow-sm space-y-4">
        {/* En-tête avec explication & bouton vider */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Shortlist Tactique — Sélection du Scout & de la Catégorie
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                La shortlist est vide tant qu'un scout et une catégorie ne sont pas choisis.
              </p>
            </div>
          </div>

          {(scoutFilter || categoryFilter) && (
            <button
              type="button"
              onClick={() => {
                if (isScoutManager) {
                  setCategoryFilter('');
                } else {
                  setScoutFilter('');
                  setCategoryFilter('');
                }
                setSelectedSlotForDrawer(null);
                toast.info("Sélection réinitialisée");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
            >
              <X className="w-3.5 h-3.5" />
              <span>Vider la sélection</span>
            </button>
          )}
        </div>

        {/* Les 2 étapes de sélection obligatoire */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Étape 1 : Choisir le Scout Découvreur (Uniquement visible pour les Admins / Super Admins) */}
          {!isScoutManager && (
            <div className="lg:col-span-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-colors",
                    scoutFilter ? "bg-emerald-600 text-white" : "bg-amber-400 text-slate-950 ring-2 ring-amber-300"
                  )}>
                    {scoutFilter ? '✓' : '1'}
                  </span>
                  <span>Scout Découvreur *</span>
                </label>
                {scoutFilter && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {totalScoutPlayersCount} joueur{totalScoutPlayersCount > 1 ? 's' : ''} trouvé{totalScoutPlayersCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <select
                value={scoutFilter}
                onChange={(e) => {
                  const nextScout = e.target.value;
                  setScoutFilter(nextScout);
                  setSelectedSlotForDrawer(null);
                  // Si la shortlist active ne correspond pas au nouveau scout sélectionné, on la détache
                  if (activeSavedShortlist && nextScout !== 'ALL') {
                    const targetScoutObj = scouts?.find(s => s.full_name === nextScout || s.id === nextScout);
                    const belongs = isShortlistForScout(activeSavedShortlist, nextScout, targetScoutObj);
                    if (!belongs) {
                      setActiveSavedShortlistId(null);
                    }
                  }
                }}
                className={cn(
                  "w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2",
                  scoutFilter
                    ? "bg-emerald-50 text-emerald-950 border-emerald-300 ring-emerald-400/20 font-black"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300 ring-primary/20"
                )}
              >
                <option value="ALL">🌟 Tous les Scouts (Club Global)</option>
                {availableScouts.map(scout => (
                  <option key={scout.id || scout.name} value={scout.name}>
                    {scout.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Étape 2 : Choisir la Catégorie d'Âge */}
          <div className={cn(isScoutManager ? "lg:col-span-12" : "lg:col-span-8", "space-y-1.5")}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-colors",
                  categoryFilter ? "bg-emerald-600 text-white" : "bg-amber-400 text-slate-950 ring-2 ring-amber-300"
                )}>
                  {categoryFilter ? '✓' : isScoutManager ? '1' : '2'}
                </span>
                <span>Catégorie d'Âge *</span>
              </label>
              {categoryFilter && (
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  Catégorie {categoryFilter}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {visibleCategories.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter(prev => prev === 'ALL' ? '' : 'ALL');
                    setSelectedSlotForDrawer(null);
                  }}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs",
                    categoryFilter === 'ALL'
                      ? "bg-primary text-white shadow-primary/25 font-black scale-105 ring-2 ring-primary/30"
                      : "bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 font-black"
                  )}
                  title="Afficher tous les joueurs du vivier club toutes catégories confondues"
                >
                  <span>{isScoutManager ? "🌟 Tous mes Joueurs" : "🌟 Tout le Club"}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                    categoryFilter === 'ALL' ? "bg-white/25 text-white" : "bg-amber-300 text-amber-950"
                  )}>
                    {scopedCandidates.filter(c => c.pipeline_stage !== 'archived' && c.status !== 'archived').length}
                  </span>
                </button>
              )}
              {visibleCategories.map(cat => {
                const count = categoryCounts[cat] || 0;
                const isSelected = categoryFilter === cat;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(prev => prev === cat ? '' : cat);
                      setSelectedSlotForDrawer(null);
                    }}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs",
                      isSelected
                        ? "bg-primary text-white shadow-primary/25 font-black scale-105 ring-2 ring-primary/30"
                        : count > 0 && scoutFilter
                          ? "bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-black"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                    )}
                    title={scoutFilter ? `${count} joueur(s) détecté(s) par ${scoutFilter} en ${cat}` : "Veuillez d'abord choisir un scout"}
                  >
                    <span>{cat}</span>
                    {scoutFilter && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                        isSelected
                          ? "bg-white/25 text-white"
                          : count > 0 ? "bg-amber-200 text-amber-900" : "bg-slate-200 text-slate-500"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* US-DASH-64 : Affichage automatique des shortlists enregistrées pour le scout sélectionné */}
        {scoutFilter && scoutFilter !== 'ALL' && (
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-amber-400/30 shadow-md space-y-2 text-white animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-xs">
                  <BookmarkCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-tight text-white flex items-center gap-2">
                    <span>Shortlists enregistrées pour <strong className="text-amber-300 underline decoration-amber-400">{selectedScout?.full_name || scoutFilter}</strong></span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {scoutSpecificShortlists.length}
                    </span>
                  </h4>
                </div>
              </div>

              {activeSavedShortlist && isShortlistForScout(activeSavedShortlist, scoutFilter, selectedScout) && (
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Shortlist active : <strong>"{activeSavedShortlist.title}"</strong></span>
                </span>
              )}
            </div>

            {scoutSpecificShortlists.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {scoutSpecificShortlists.map(sl => {
                  const isCurrentActive = activeSavedShortlistId === sl.id;
                  return (
                    <button
                      key={sl.id}
                      type="button"
                      onClick={() => handleSelectSavedShortlist(sl.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                        isCurrentActive
                          ? "bg-amber-400 text-slate-950 font-black shadow-md ring-2 ring-amber-300 scale-102"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 hover:border-amber-400/50"
                      )}
                      title={`Charger la composition "${sl.title}" (${sl.category_filter || 'Toutes'} - ${sl.formation_key})`}
                    >
                      <Bookmark className={cn("w-3.5 h-3.5", isCurrentActive ? "text-slate-950 fill-slate-950" : "text-amber-400")} />
                      <span>{sl.title}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md font-semibold",
                        isCurrentActive ? "bg-slate-950/20 text-slate-950 font-bold" : "bg-slate-700 text-amber-300"
                      )}>
                        {sl.category_filter || 'Toutes'} • {sl.formation_key}
                      </span>
                      {isCurrentActive && (
                        <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-400 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2">
                <span>ℹ️</span>
                <span>Aucune shortlist tactique n'a encore été enregistrée pour <strong>{selectedScout?.full_name || scoutFilter}</strong>. Placez des joueurs sur le terrain et cliquez sur "Enregistrer cette Shortlist" pour lui en créer une.</span>
              </div>
            )}
          </div>
        )}

        {/* Ligne d'état & résumé dynamique */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {!scoutFilter && !categoryFilter ? (
              <span className="text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 font-semibold flex items-center gap-1.5 shadow-2xs">
                <span>⚠️</span>
                <span>Sélectionnez un <strong>Scout</strong> et une <strong>Catégorie</strong> pour charger le terrain tactique.</span>
              </span>
            ) : !scoutFilter ? (
              <span className="text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 font-semibold flex items-center gap-1.5 shadow-2xs">
                <span>👤</span>
                <span>Veuillez maintenant choisir un <strong>Scout</strong> dans le menu déroulant.</span>
              </span>
            ) : !categoryFilter ? (
              <span className="text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 font-semibold flex items-center gap-1.5 shadow-2xs">
                <span>🏷️</span>
                <span>Scout : <strong>{scoutFilter === 'ALL' ? 'Tous les Scouts (Club Global)' : scoutFilter}</strong> — Cliquez maintenant sur une <strong>Catégorie</strong>.</span>
              </span>
            ) : (
              <span className="text-emerald-900 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 font-black flex items-center gap-2 shadow-2xs">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                <span>
                  {categoryCandidates.length} joueur{categoryCandidates.length > 1 ? 's' : ''} {scoutFilter === 'ALL' ? `disponible${categoryCandidates.length > 1 ? 's' : ''} dans le club` : `détecté${categoryCandidates.length > 1 ? 's' : ''} par ${scoutFilter}`} en {categoryFilter}
                </span>
              </span>
            )}
          </div>

          {/* Outils secondaires : recherche, tri, taille, plein écran */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {scoutFilter && categoryFilter && (
              <>
                {/* Recherche */}
                <div className="relative w-40 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrer nom..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Bouton Tri Score */}
                <button
                  type="button"
                  onClick={() => {
                    const next = pitchSortOption === 'score' ? 'none' : 'score';
                    setPitchSortOption(next);
                    toast.info(next === 'score' ? "Terrain : Trié par dernier score d'évaluation" : "Terrain : Ordre réinitialisé");
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs",
                    pitchSortOption === 'score'
                      ? "bg-amber-500 text-slate-950 font-black"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  )}
                  title="Trier par note d'évaluation décroissante"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden md:inline">Score</span>
                </button>
              </>
            )}

            {/* Échelle terrain */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setPitchScale('normal')}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                  pitchScale === 'normal' ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setPitchScale('large')}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                  pitchScale === 'large' ? "bg-white text-emerald-700 shadow-xs font-black" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Grand
              </button>
              <button
                type="button"
                onClick={() => setPitchScale('xlarge')}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                  pitchScale === 'xlarge' ? "bg-white text-primary shadow-xs font-black" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Max
              </button>
            </div>

            {/* Plein écran */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-primary transition-colors shadow-2xs shrink-0 cursor-pointer"
              title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>

            {/* Bouton Unique : Capture Haute Fidélité & Génération PDF via @pdfme */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExportingPDF || !scoutFilter || !categoryFilter}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 shadow-2xs cursor-pointer",
                scoutFilter && categoryFilter
                  ? "bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 hover:border-amber-400/80 shadow-xs hover:shadow-md"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
              )}
              title={
                !scoutFilter || !categoryFilter
                  ? "Sélectionnez un scout et une catégorie pour exporter la shortlist"
                  : "Prendre une capture haute fidélité du terrain et générer le document PDF via @pdfme"
              }
            >
              {isExportingPDF ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-amber-400 rounded-full animate-spin shrink-0" />
                  <span className="font-semibold text-amber-300">Génération PDF en cours...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-semibold">Capturer & Générer PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── DISPOSITION CÔTE À CÔTE DANS LA PAGE (TERRAIN À GAUCHE + LISTE DU POSTE À DROITE) ── */}
      <div className={cn(
        "w-full flex flex-col gap-5 sm:gap-6 items-start transition-all duration-300",
        selectedSlotForDrawer ? "xl:flex-row items-stretch" : "items-center"
      )}>
        {/* Colonne GAUCHE : Terrain de Football */}
        <div className={cn(
          "relative bg-slate-50/50 p-2 sm:p-4 md:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar transition-all duration-300",
          selectedSlotForDrawer
            ? "w-full xl:flex-1 flex justify-center min-w-0"
            : "w-full flex justify-center"
        )}>
          {/* Conteneur officiel exportable (En-tête officiel avec Scout & Intitulés + Terrain + Footer) */}
          <div
            id="fus-shadowlist-print-root"
            ref={pitchCaptureRef}
            className="flex flex-col items-center gap-3.5 p-3 sm:p-5 rounded-3xl bg-slate-950 border-2 border-slate-800/90 shadow-2xl transition-all duration-300 w-full"
            style={{
              maxWidth: pitchStyle.maxWidth || '1180px',
            }}
          >
            {/* En-tête officiel FUS Club & Scout Découvreur & Métadonnées de la Shadow List */}
            {scoutFilter && categoryFilter && (
              <div className="print-header w-full bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
                {/* Titre & Intitulés */}
                <div className="flex items-center gap-3.5 min-w-0 w-full md:w-auto">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-md ring-2 ring-amber-400/40 shrink-0">
                    FUS
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                        Shadow List Officielle • Détection V2
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-white truncate tracking-tight mt-1">
                      {activeSavedShortlist?.title || `Shadow List Tactique — Catégorie ${categoryFilter}`}
                    </h2>
                    {activeSavedShortlist?.description && (
                      <p className="text-xs text-slate-400 italic truncate max-w-md">
                        {activeSavedShortlist.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px]">
                      <span className="font-bold text-emerald-400 bg-emerald-950/70 px-2.5 py-0.5 rounded-lg border border-emerald-800/80">
                        Catégorie : <strong>{categoryFilter}</strong>
                      </span>
                      <span className="font-bold text-sky-300 bg-sky-950/70 px-2.5 py-0.5 rounded-lg border border-sky-800/80">
                        Système : <strong>{selectedFormationKey}</strong> ({activeFormation.name})
                      </span>
                      <span className="font-bold text-amber-300 bg-amber-950/70 px-2.5 py-0.5 rounded-lg border border-amber-800/80">
                        <strong>{positionedPlayersCount}</strong> joueur{positionedPlayersCount > 1 ? 's' : ''} sur le terrain
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profil Scout Découvreur avec Photo de Profil, Nom et Rôle */}
                <div className="flex items-center gap-3 bg-slate-950/90 px-4 py-2.5 rounded-2xl border border-slate-800 shrink-0 shadow-inner w-full md:w-auto">
                  <ScoutAvatar
                    scout={selectedScout}
                    scoutName={selectedScout?.full_name || (scoutFilter === 'ALL' ? 'Tous les Scouts' : scoutFilter)}
                    scouts={scouts}
                    size="lg"
                    avatarClassName="ring-2 ring-amber-400/50 shadow-md"
                  />
                  <div className="text-left min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 block">
                      {scoutFilter === 'ALL' ? 'Base Détection' : 'Scout Référent'}
                    </span>
                    <span className="text-sm font-black text-white block truncate max-w-[180px]">
                      {scoutFilter === 'ALL' ? 'Tous les Scouts (Club)' : (selectedScout?.full_name || scoutFilter)}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium block truncate max-w-[180px]">
                      {scoutFilter === 'ALL' ? 'FUS Rabat • Vue Globale' : (selectedScout?.role_title || selectedScout?.role || 'Observateur & Détecteur FUS')}
                      {selectedScout?.recruitment_region ? ` • ${selectedScout.recruitment_region}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div
              className="pitch-container-printable rounded-2xl sm:rounded-3xl relative overflow-hidden bg-gradient-to-b from-emerald-800 via-emerald-700 to-emerald-900 border-4 border-emerald-950 shadow-2xl select-none transition-all duration-300 w-full"
              style={pitchStyle}
            >
              {/* Pelouse Réaliste : Bandes de tonte alternées */}
              <div className="absolute inset-0 flex flex-col pointer-events-none opacity-25">
                {[...Array(18)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 w-full",
                      i % 2 === 0 ? "bg-black/15" : "bg-white/10"
                    )}
                  />
                ))}
              </div>

              {/* Lignes Blanches Officielles FUS */}
              <div className="absolute inset-3 sm:inset-5 border-2 border-white/75 rounded-2xl pointer-events-none">
                {/* Ligne médiane & Rond Central */}
                <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/75 -translate-y-1/2" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 border-2 border-white/75 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-xs" />

                {/* Surface de réparation NORD (Adversaire / Attaque) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 sm:w-80 md:w-96 h-32 sm:h-40 md:h-48 border-2 border-t-0 border-white/75 rounded-b-2xl" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 sm:w-36 md:w-44 h-12 sm:h-16 md:h-20 border-2 border-t-0 border-white/75 rounded-b-xl" />
                <div className="absolute top-24 sm:top-32 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
                {/* Arc de cercle surface Nord */}
                <div className="absolute top-32 sm:top-40 left-1/2 -translate-x-1/2 w-24 sm:w-28 md:w-32 h-12 sm:h-14 md:h-16 border-2 border-t-0 border-white/75 rounded-b-full" />

                {/* Surface de réparation SUD (FUS / Gardien) */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 sm:w-80 md:w-96 h-32 sm:h-40 md:h-48 border-2 border-b-0 border-white/75 rounded-t-2xl" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 sm:w-36 md:w-44 h-12 sm:h-16 md:h-20 border-2 border-b-0 border-white/75 rounded-t-xl" />
                <div className="absolute bottom-24 sm:bottom-32 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
                {/* Arc de cercle surface Sud */}
                <div className="absolute bottom-32 sm:bottom-40 left-1/2 -translate-x-1/2 w-24 sm:w-28 md:w-32 h-12 sm:h-14 md:h-16 border-2 border-b-0 border-white/75 rounded-t-full" />
              </div>

              {/* ── OVERLAY QUAND LA SHORTLIST EST VIDE (SÉLECTION NON EFFECTUÉE) ── */}
              {(!scoutFilter || !categoryFilter) && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200">
                  <div className="max-w-md p-6 sm:p-8 bg-slate-900/95 border-2 border-amber-400/50 rounded-3xl shadow-2xl space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
                      <UserCheck className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                        Terrain Shortlist Vide
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                        Veuillez sélectionner un <strong>Scout</strong> et une <strong>Catégorie</strong> ci-dessus pour afficher sur le terrain les joueurs détectés.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-bold">
                      <span className={cn(
                        "px-3 py-1.5 rounded-xl border flex items-center gap-1.5",
                        scoutFilter ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      )}>
                        {scoutFilter ? `✓ Scout : ${scoutFilter}` : '① Choisir un Scout'}
                      </span>
                      <span className={cn(
                        "px-3 py-1.5 rounded-xl border flex items-center gap-1.5",
                        categoryFilter ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      )}>
                        {categoryFilter ? `✓ Catégorie : ${categoryFilter}` : '② Choisir une Catégorie'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── OVERLAY QUAND AUCUN JOUEUR N'EST DÉTECTÉ POUR CE DUO SCOUT + CATÉGORIE ── */}
              {scoutFilter && categoryFilter && categoryCandidates.length === 0 && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-black/50 backdrop-blur-xs select-none animate-in fade-in duration-200">
                  <div className="max-w-md p-6 sm:p-7 bg-slate-900/95 border border-white/20 rounded-3xl shadow-2xl space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                      <Users className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-white">
                      Aucun joueur détecté
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {scoutFilter === 'ALL'
                        ? `Aucun joueur n'est répertorié dans la catégorie ${categoryFilter} pour l'ensemble du club.`
                        : `Le scout ${scoutFilter} n'a aucun joueur répertorié dans la catégorie ${categoryFilter}.`
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* ── EMPLACEMENTS TACTIQUES AVEC JUXTAPOSITION DES JOUEURS ── */}
              {activeFormation.slots.map((slot, slotIdx) => {
                const slotPlayers = playersBySlot[slotIdx] || [];

                return (
                  <div
                    key={slotIdx}
                    style={{ top: slot.top, left: slot.left }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20"
                  >
                    {/* Badge du rôle / poste tactique - Cliquable pour ouvrir ou fermer la liste latérale droite */}
                    <button
                      type="button"
                      onClick={() => setSelectedSlotForDrawer(prev =>
                        prev?.slotIndex === slotIdx ? null : { slotIndex: slotIdx, label: slot.label, roleCode: slot.roleCode }
                      )}
                      className="duplicate-slot-badge mb-1.5 flex items-center gap-1 cursor-pointer group hover:scale-105 transition-transform"
                      title={`Cliquer pour afficher la liste complète de ce poste (${slot.label}) à droite du terrain`}
                    >
                      <span
                        className={cn(
                          "text-[10px] sm:text-[11px] font-black uppercase px-2 py-0.5 rounded-md backdrop-blur-xs border shadow-md transition-colors",
                          selectedSlotForDrawer?.slotIndex === slotIdx
                            ? "bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/40"
                            : "text-white bg-black/75 border-white/30 group-hover:border-amber-400 group-hover:bg-black/90"
                        )}
                      >
                        {slot.label}
                      </span>
                    </button>

                    {/* S'il n'y a pas de joueur à ce poste dans la catégorie */}
                    {slotPlayers.length === 0 ? (
                      canEditCurrentShortlist ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!scoutFilter || !categoryFilter) {
                              toast.info("Veuillez sélectionner un Scout et une Catégorie avant d'ajouter un joueur");
                              return;
                            }
                            setSlotForAddingPlayer({ slotIndex: slotIdx, label: slot.label, roleCode: slot.roleCode, category: slot.category });
                            setPositionFilterMode('matching');
                            setPlayerModalSearch('');
                          }}
                          className="group/empty flex flex-col items-center cursor-pointer transition-all hover:scale-110 active:scale-95"
                          title={`Ajouter un joueur de la base de données au poste ${slot.label} (${slot.roleCode})`}
                        >
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-dashed border-white/60 group-hover/empty:border-amber-400 bg-black/35 group-hover/empty:bg-amber-400/20 flex items-center justify-center text-white/70 group-hover/empty:text-amber-300 backdrop-blur-xs shadow-lg transition-colors relative">
                            <span className="text-[9px] font-bold uppercase">{slot.roleCode}</span>
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 group-hover/empty:bg-amber-300 text-slate-950 flex items-center justify-center shadow-md font-black">
                              <Plus className="w-3 h-3 stroke-[3]" />
                            </span>
                          </div>
                        </button>
                      ) : (
                        <div
                          className="flex flex-col items-center opacity-45 cursor-not-allowed select-none"
                          title={`Poste ${slot.label} (${slot.roleCode}) - Non modifiable en mode Visualisation`}
                        >
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-dashed border-white/40 bg-black/25 flex items-center justify-center text-white/50 backdrop-blur-xs shadow-xs">
                            <span className="text-[9px] font-bold uppercase">{slot.roleCode}</span>
                          </div>
                        </div>
                      )
                    ) : (
                      /* Carte Dense Multi-Joueurs */
                      <ScoutasticDenseSlotCard
                        slotLabel={slot.label}
                        roleCode={slot.roleCode}
                        players={slotPlayers.map(cand => {
                          const ev = playerEvaluationsMap.get(cand.id);
                          return {
                            raw: cand,
                            id: cand.id,
                            shortName: `${cand.first_name[0]}. ${cand.last_name}`,
                            fullName: `${cand.first_name} ${cand.last_name}`,
                            photoUrl: cand.photo_url,
                            initials: `${cand.first_name[0]}${cand.last_name[0]}`.toUpperCase(),
                            rating: ev?.overall_score ?? null,
                            hasEvaluation: !!ev,
                            isTrial: cand.pipeline_stage === 'trial',
                            clubOrTeam: cand.current_club || 'Sans club',
                          };
                        })}
                        isSelected={selectedSlotForDrawer?.slotIndex === slotIdx}
                        onSelectPlayer={(cand) => setInspectedCandidate(cand)}
                        onOpenSlotDrawer={() => setSelectedSlotForDrawer(prev =>
                          prev?.slotIndex === slotIdx ? null : { slotIndex: slotIdx, label: slot.label, roleCode: slot.roleCode }
                        )}
                        onAddPlayer={canEditCurrentShortlist ? () => {
                          if (!scoutFilter || !categoryFilter) {
                            toast.info("Veuillez sélectionner un Scout et une Catégorie avant d'ajouter un joueur");
                            return;
                          }
                          setSlotForAddingPlayer({ slotIndex: slotIdx, label: slot.label, roleCode: slot.roleCode, category: slot.category });
                          setPositionFilterMode('matching');
                          setPlayerModalSearch('');
                        } : undefined}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer officiel d'authentification FUS (US-DASH-37) */}
            {scoutFilter && categoryFilter && (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 px-3 pt-2 border-t border-slate-800/80 gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0 animate-pulse" />
                  <span className="font-black text-slate-300">FATH UNION SPORT DE RABAT</span>
                  <span className="text-slate-500">• Cellule Détection & Recrutement V2</span>
                </div>
                <div className="font-mono text-[9px] text-slate-400">
                  Document Officiel • Généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • Confidentiel
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Colonne DROITE : Panneau détaillé du poste affiché directement dans la page (NON EN SLIDE) */}
        {selectedSlotForDrawer && (() => {
          const slotPlayers = playersBySlot[selectedSlotForDrawer.slotIndex] || [];
          const fullRoleName = ROLE_FULL_NAMES[selectedSlotForDrawer.label] || selectedSlotForDrawer.label;

          return (
            <aside
              className="w-full xl:w-[420px] 2xl:w-[460px] bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl flex flex-col shrink-0 overflow-hidden xl:sticky xl:top-4 self-start max-h-[960px] animate-in fade-in zoom-in-95 duration-200"
              aria-label={`Gestion des joueurs du poste ${selectedSlotForDrawer.label}`}
            >
              {/* Entête du Panneau */}
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-black text-sm shadow-xs">
                    {selectedSlotForDrawer.roleCode}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 tracking-tight">
                        {fullRoleName}
                      </h3>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {selectedSlotForDrawer.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {slotPlayers.length} joueur{slotPlayers.length > 1 ? 's' : ''} présélectionné{slotPlayers.length > 1 ? 's' : ''} à ce poste
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSlotForDrawer(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Fermer la liste et recentrer le terrain"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Barre d'outils / Actions rapides */}
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Hiérarchie des choix
                  </span>
                  <div className="flex items-center gap-1.5">
                    {canEditCurrentShortlist ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (!scoutFilter || !categoryFilter) {
                              toast.info("Veuillez sélectionner un Scout et une Catégorie avant d'ajouter un joueur");
                              return;
                            }
                            const slotCfg = activeFormation.slots[selectedSlotForDrawer.slotIndex];
                            setSlotForAddingPlayer({
                              slotIndex: selectedSlotForDrawer.slotIndex,
                              label: selectedSlotForDrawer.label,
                              roleCode: selectedSlotForDrawer.roleCode,
                              category: slotCfg?.category || 'MID',
                            });
                            setPositionFilterMode('matching');
                            setPlayerModalSearch('');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors shadow-2xs cursor-pointer"
                          title="Ajouter un joueur existant de la base de données à ce poste"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Ajouter joueur</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSortByLastScore}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-amber-400 hover:bg-amber-50/40 text-slate-700 hover:text-amber-900 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                          title="Classer les joueurs selon leur note d'évaluation la plus récente"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                          <span>Trier score</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-amber-700" />
                        <span>Visualisation seule</span>
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-snug">
                  {canEditCurrentShortlist ? (
                    <>Glissez-déposez les cartes (Drag & Drop) pour définir l’ordre de priorité. Le joueur en <strong>#1</strong> hérite de la couronne 👑 sur le terrain à gauche.</>
                  ) : (
                    <>Mode lecture seule : Cliquez sur l'icône 👁️ pour inspecter la fiche détaillée et les évaluations du joueur.</>
                  )}
                </p>
              </div>

              {/* Liste des Joueurs Réordonnables */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 custom-scrollbar bg-slate-100/50 max-h-[640px]">
                {slotPlayers.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Aucun joueur assigné à ce poste</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {canEditCurrentShortlist
                          ? "Choisissez un joueur existant créé dans la base de données."
                          : "Ce poste est vide dans cette shortlist."}
                      </p>
                    </div>
                    {canEditCurrentShortlist && (
                      <button
                        type="button"
                        onClick={() => {
                          const slotCfg = activeFormation.slots[selectedSlotForDrawer.slotIndex];
                          setSlotForAddingPlayer({
                            slotIndex: selectedSlotForDrawer.slotIndex,
                            label: selectedSlotForDrawer.label,
                            roleCode: selectedSlotForDrawer.roleCode,
                            category: slotCfg?.category || 'MID',
                          });
                          setPositionFilterMode('matching');
                          setPlayerModalSearch('');
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-sm cursor-pointer hover:scale-105"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Ajouter un joueur de la base de données</span>
                      </button>
                    )}
                  </div>
                ) : (
                  slotPlayers.map((cand, idx) => {
                    const ev = playerEvaluationsMap.get(cand.id);
                    const isFirst = idx === 0;
                    const isDragging = draggedCandidateId === cand.id;
                    const isOver = dragOverCandidateId === cand.id;
                    const score = ev?.overall_score;

                    return (
                      <div
                        key={cand.id}
                        draggable={canEditCurrentShortlist}
                        onDragStart={(e) => canEditCurrentShortlist && handleDragStart(e, cand.id)}
                        onDragOver={(e) => canEditCurrentShortlist && handleDragOver(e, cand.id)}
                        onDrop={(e) => canEditCurrentShortlist && handleDrop(e, cand.id)}
                        onDragEnd={() => {
                          setDraggedCandidateId(null);
                          setDragOverCandidateId(null);
                        }}
                        className={cn(
                          "group relative flex items-center gap-2.5 p-3 rounded-2xl border transition-all duration-150 bg-white select-none shadow-2xs",
                          canEditCurrentShortlist ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                          isDragging && "opacity-40 border-dashed border-amber-400 scale-[0.98]",
                          isOver && "border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/40",
                          !isDragging && !isOver && (isFirst ? "border-amber-300 ring-1 ring-amber-200/50 bg-gradient-to-r from-amber-50/20 to-white" : "border-slate-200 hover:border-slate-300")
                        )}
                      >
                        {/* Poignée de drag */}
                        {canEditCurrentShortlist && (
                          <div className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0">
                            <GripVertical className="w-4 h-4" />
                          </div>
                        )}

                        {/* Badge de Rang */}
                        <div className="shrink-0">
                          {isFirst ? (
                            <div
                              className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs"
                              title="Choix #1 Titulaire shortlist"
                            >
                              <Crown className="w-4 h-4 fill-slate-950" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center border border-slate-200">
                              #{idx + 1}
                            </div>
                          )}
                        </div>

                        {/* Photo / Initials */}
                        <div className="relative shrink-0">
                          {cand.photo_url ? (
                            <img
                              src={cand.photo_url}
                              alt={`${cand.first_name} ${cand.last_name}`}
                              className="w-14 h-14 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-slate-800 text-white font-black text-sm flex items-center justify-center">
                              {cand.first_name[0]}{cand.last_name[0]}
                            </div>
                          )}
                          {isFirst && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center" />
                          )}
                        </div>

                        {/* Identité Joueur */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-800 text-xs truncate">
                              {cand.first_name} {cand.last_name}
                            </span>
                            {cand.pipeline_stage === 'trial' && (
                              <span className="text-[9px] font-bold px-1 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                Test
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                            <span>{cand.current_club || 'Sans club'}</span>
                            <span>•</span>
                            <span className="font-semibold text-slate-600">{cand.age_category}</span>
                            {cand.preferred_foot && (
                              <>
                                <span>•</span>
                                <span className="text-[10px] text-slate-400">{cand.preferred_foot}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Note ou Score */}
                        <div className="shrink-0 text-right">
                          {score !== undefined ? (
                            <div className={cn(
                              "px-2 py-1 rounded-lg font-black text-xs inline-flex items-center gap-1 border",
                              score >= 7.5 ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                                score >= 6 ? "bg-blue-50 text-blue-800 border-blue-200" :
                                  score >= 4 ? "bg-amber-50 text-amber-800 border-amber-200" :
                                    "bg-rose-50 text-rose-800 border-rose-200"
                            )}>
                              <span>{score.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                              Non noté
                            </span>
                          )}
                        </div>

                        {/* Contrôles de déplacement accessible & ouverture profil */}
                        <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-slate-100">
                          {canEditCurrentShortlist && (
                            <>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMovePlayer(cand.id, 'up');
                                }}
                                className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                                title="Monter le joueur (# plus prioritaire)"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === slotPlayers.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMovePlayer(cand.id, 'down');
                                }}
                                className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                                title="Descendre le joueur"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectedCandidate(cand);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors ml-0.5 cursor-pointer"
                            title="Inspecter le joueur"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canEditCurrentShortlist && (!isScoutManager || isCandidateBelongingToCurrentScoutManager(cand)) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCandidateFromShortlist(cand, selectedSlotForDrawer.slotIndex);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-0.5 cursor-pointer"
                              title="Retirer ce joueur de la shortlist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pied de Page du Panneau */}
              <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span>Synchronisé Supabase</span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSlotForDrawer(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                >
                  Fermer la liste
                </button>
              </div>
            </aside>
          );
        })()}
      </div>

      {/* ── GRAND PANNEAU MODAL DE PERFORMANCE (REPRODUISANT LA PHOTO UTILISATEUR) ── */}
      {inspectedCandidate && (() => {
        const ev = playerEvaluationsMap.get(inspectedCandidate.id);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 animate-in fade-in duration-200"
            onClick={() => setInspectedCandidate(null)}
          >
            <div
              className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border-2 border-slate-300 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* EN-TÊTE DU PANNEAU (STYLE PHOTO FOURNIE) */}
              <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b-2 border-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                  {/* Photo / Avatar avec initiales */}
                  <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center font-black text-2xl text-white shrink-0 shadow-md">
                    {inspectedCandidate.photo_url ? (
                      <img src={inspectedCandidate.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{inspectedCandidate.first_name[0]}{inspectedCandidate.last_name[0]}</span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-xl font-black text-white tracking-tight">
                        {inspectedCandidate.first_name} {inspectedCandidate.last_name}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white border border-rose-500">
                        {inspectedCandidate.primary_position}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white border border-blue-500">
                        {inspectedCandidate.age_category}
                      </span>
                      {(() => {
                        const inspEval = playerEvaluationsMap.get(inspectedCandidate.id);
                        return inspEval ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-600 text-white border border-emerald-500">
                            {inspEval.verdict?.replace('_', ' ').toUpperCase()}
                          </span>
                        ) : null;
                      })()}
                    </div>

                    <p className="text-xs text-slate-400 flex items-center gap-2">
                      <span>Club : <strong>{inspectedCandidate.current_club || 'Sans club'}</strong></span>
                      <span>•</span>
                      <span>Nationalité : <strong>Marocaine</strong></span>
                      <span>•</span>
                      <span>Catégorie : <strong>{inspectedCandidate.age_category}</strong></span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectedCandidate(null)}
                  className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* CORPS DU PANNEAU (RADAR & DONNÉES CLÉS) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-6 bg-slate-100">
                {!ev ? (
                  <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-dashed p-8">
                    <Users className="w-12 h-12 text-slate-300 mx-auto" />
                    <h4 className="text-base font-bold text-slate-800">Aucune évaluation enregistrée pour ce joueur</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Ce joueur n'a pas encore fait l'objet d'une notation détaillée sur les 4 piliers fondamentaux.
                    </p>
                    {onOpenEvaluationForCandidate && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenEvaluationForCandidate(inspectedCandidate);
                          setInspectedCandidate(null);
                        }}
                        className="mt-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-sm inline-flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Créer l'évaluation maintenant</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      {/* COLONNE GAUCHE : RADAR DES 4 PILIERS AVEC ONGLETS */}
                      <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between pb-3 border-b mb-1">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                            Profil Radar des 4 Piliers (1–10)
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                              Score : {typeof ev.overall_score === 'number' ? ev.overall_score.toFixed(1) : ev.overall_score}
                            </span>
                            {onOpenEvaluationForCandidate && (
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenEvaluationForCandidate(inspectedCandidate);
                                  setInspectedCandidate(null);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-primary hover:bg-primary/90 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs"
                              >
                                Évaluer Test
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Composant Radar à 4 Onglets Piliers Dédiés */}
                        <div className="w-full flex items-center justify-center pt-2">
                          <PlayerRadarChart
                            evaluations={[{
                              name: `${inspectedCandidate.first_name} ${inspectedCandidate.last_name}`,
                              color: '#ef4444',
                              eval: ev,
                            }]}
                            height={310}
                            showTabs={true}
                            defaultTab="summary"
                          />
                        </div>
                      </div>

                      {/* COLONNE DROITE : DONNÉES CLÉS & VERDICT */}
                      <div className="lg:col-span-5 space-y-4">
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3.5">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b">
                            Données Clés
                          </h4>

                          <div className="space-y-2.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Pied Fort</span>
                              <strong className="text-slate-800">{inspectedCandidate.preferred_foot || 'Droitier'}</strong>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Morphologie</span>
                              <strong className="text-slate-800">
                                {inspectedCandidate.height_cm ? `${inspectedCandidate.height_cm} cm` : '-'} / {inspectedCandidate.weight_kg ? `${inspectedCandidate.weight_kg} kg` : '-'}
                              </strong>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Scout Découvreur</span>
                              <div className="flex items-center gap-1.5">
                                <ScoutAvatar
                                  scoutId={inspectedCandidate.discovering_scout_id}
                                  scoutName={inspectedCandidate.discovering_scout_name || 'Cellule FUS'}
                                  scouts={scouts}
                                  size="xs"
                                />
                                <strong className="text-amber-700 text-xs">
                                  {inspectedCandidate.discovering_scout_name || 'Cellule FUS'}
                                </strong>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Scout Référent</span>
                              <div className="flex items-center gap-1.5">
                                <ScoutAvatar
                                  scoutId={inspectedCandidate.recruiter_id}
                                  scoutName={inspectedCandidate.recruiter_name || 'Staff Technique'}
                                  scouts={scouts}
                                  size="xs"
                                />
                                <strong className="text-amber-700 text-xs">
                                  {inspectedCandidate.recruiter_name || 'Staff Technique'}
                                </strong>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Priorité Recommandation</span>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                                {inspectedCandidate.recommendation_priority || 'HIGH'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Badge Verdict Scout (Exactement comme sur la photo) */}
                        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 flex items-center gap-2.5 shadow-2xs">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="text-[10px] font-bold text-emerald-600 block uppercase tracking-wider">
                              Verdict Scout
                            </span>
                            <span className="text-sm font-black uppercase tracking-tight">
                              {ev.verdict?.replace('_', ' ') || 'SHORTLIST'}
                            </span>
                          </div>
                        </div>

                        {/* Synthèse Scout si disponible */}
                        {ev.strengths && (
                          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs space-y-1">
                            <span className="font-bold text-slate-700 block">Points Forts Remarqués :</span>
                            <p className="text-slate-600 leading-relaxed text-[11px]">{ev.strengths}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SECTION BASSE : LES 4 SCORES PILIERS */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs text-center">
                        <span className="text-[10px] text-slate-500 block font-bold">⚽ Technique (30%)</span>
                        <span className="text-xl font-black text-slate-900">{typeof ev.technical_score === 'number' ? ev.technical_score.toFixed(1) : ev.technical_score}</span>
                      </div>
                      <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs text-center">
                        <span className="text-[10px] text-slate-500 block font-bold">🏃 Physique (25%)</span>
                        <span className="text-xl font-black text-slate-900">{typeof ev.physical_score === 'number' ? ev.physical_score.toFixed(1) : ev.physical_score}</span>
                      </div>
                      <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs text-center">
                        <span className="text-[10px] text-slate-500 block font-bold">🧭 Tactique (25%)</span>
                        <span className="text-xl font-black text-slate-900">{typeof ev.tactical_score === 'number' ? ev.tactical_score.toFixed(1) : ev.tactical_score}</span>
                      </div>
                      <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs text-center">
                        <span className="text-[10px] text-slate-500 block font-bold">🧠 Mental (20%)</span>
                        <span className="text-xl font-black text-slate-900">{typeof ev.mental_score === 'number' ? ev.mental_score.toFixed(1) : ev.mental_score}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* PIED DE PAGE DU MODAL */}
              <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onOpenCandidateDetail(inspectedCandidate);
                    setInspectedCandidate(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Ouvrir Fiche Complète du Joueur</span>
                </button>

                <div className="flex items-center gap-2">
                  {canEditCurrentShortlist && inspectedCandidate && (!isScoutManager || isCandidateBelongingToCurrentScoutManager(inspectedCandidate)) && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCandidateFromShortlist(inspectedCandidate)}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors border border-rose-200 cursor-pointer"
                      title="Retirer ce joueur de la shortlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Retirer de la Shortlist</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setInspectedCandidate(null)}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL : SÉLECTION D'UN JOUEUR EXISTANT DANS LA BASE DE DONNÉES POUR CE POSTE ── */}
      {slotForAddingPlayer && (() => {
        const fullRoleName = ROLE_FULL_NAMES[slotForAddingPlayer.label] || slotForAddingPlayer.label;
        const currentSlotPlayerIds = new Set(
          (playersBySlot[slotForAddingPlayer.slotIndex] || []).map(p => p.id)
        );

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => {
              if (!isAssigningPlayer) {
                setSlotForAddingPlayer(null);
                setPlayerModalSearch('');
              }
            }}
          >
            <div
              className="bg-white w-full max-w-2xl max-h-[88vh] rounded-3xl shadow-2xl border-2 border-slate-300 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* En-tête du Modal */}
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-md">
                    <UserPlus className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                        Ajouter un joueur à ce poste
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950">
                        {slotForAddingPlayer.label} ({slotForAddingPlayer.roleCode})
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Sélectionnez un joueur existant dans la base de données ({fullRoleName}).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isAssigningPlayer}
                  onClick={() => {
                    setSlotForAddingPlayer(null);
                    setPlayerModalSearch('');
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contexte Scout & Catégorie */}
              <div className="px-5 py-3 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  {scoutFilter && (
                    <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs">
                      <span>Scout cible :</span>
                      <strong className="text-primary">{scoutFilter}</strong>
                    </span>
                  )}
                  {categoryFilter && (
                    <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs">
                      <span>Catégorie :</span>
                      <strong className="text-amber-600">{categoryFilter}</strong>
                    </span>
                  )}
                </div>

                <span className="text-[11px] font-bold text-slate-500">
                  {candidatesForSlotSelection.length} joueur{candidatesForSlotSelection.length > 1 ? 's' : ''} trouvé{candidatesForSlotSelection.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Barre de Filtrage par Position (Spécifique au poste cliqué vs Tous les postes du Scout) */}
              <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start">
                  <button
                    type="button"
                    onClick={() => setPositionFilterMode('matching')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5",
                      positionFilterMode === 'matching'
                        ? "bg-amber-400 text-slate-950 shadow-xs ring-1 ring-amber-300"
                        : "text-slate-600 hover:text-slate-950"
                    )}
                  >
                    <span>Poste {slotForAddingPlayer.label} ({slotForAddingPlayer.roleCode})</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/10 font-bold">
                      {scopedCandidates.filter(c =>
                        c.pipeline_stage !== 'archived' &&
                        c.status !== 'archived' &&
                        (scoutFilter === 'ALL' || !scoutFilter || isCandidateDetectedBySelectedScout(c, scoutFilter)) &&
                        categoryFilter && c.age_category === categoryFilter &&
                        isPlayerPositionMatchingSlot(c, slotForAddingPlayer)
                      ).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPositionFilterMode('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5",
                      positionFilterMode === 'all'
                        ? "bg-white text-slate-900 shadow-xs border border-slate-300"
                        : "text-slate-600 hover:text-slate-950"
                    )}
                    title={`Tous les profils disponibles en ${categoryFilter}`}
                  >
                    <span>Catégorie {categoryFilter}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
                      {scopedCandidates.filter(c =>
                        c.pipeline_stage !== 'archived' &&
                        c.status !== 'archived' &&
                        (scoutFilter === 'ALL' || !scoutFilter || isCandidateDetectedBySelectedScout(c, scoutFilter)) &&
                        categoryFilter && c.age_category === categoryFilter
                      ).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPositionFilterMode('all_categories')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5",
                      positionFilterMode === 'all_categories'
                        ? "bg-primary text-white shadow-xs font-black"
                        : "text-slate-600 hover:text-slate-950"
                    )}
                    title="Afficher tous les profils du club (tous scouts et toutes catégories)"
                  >
                    <span>🌟 Tout le Club</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                      positionFilterMode === 'all_categories' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                    )}>
                      {scopedCandidates.filter(c => c.pipeline_stage !== 'archived' && c.status !== 'archived').length}
                    </span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 font-medium">
                  {positionFilterMode === 'matching'
                    ? `Spécialistes du poste ${slotForAddingPlayer.label} (${categoryFilter})`
                    : positionFilterMode === 'all'
                      ? `Tous les profils de la catégorie ${categoryFilter}`
                      : 'Tout le vivier du club (toutes catégories & tous scouts)'
                  }
                </span>
              </div>

              {/* Champ de recherche rapide */}
              <div className="p-4 border-b border-slate-200 bg-white">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={playerModalSearch}
                    onChange={(e) => setPlayerModalSearch(e.target.value)}
                    placeholder={`Rechercher un joueur pour le poste ${slotForAddingPlayer.label} (nom, club, catégorie...)...`}
                    className="w-full pl-10 pr-9 py-2.5 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-slate-900 font-medium transition-all"
                    autoFocus
                  />
                  {playerModalSearch && (
                    <button
                      type="button"
                      onClick={() => setPlayerModalSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Liste des Joueurs Existant */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/60 max-h-[500px]">
                {candidatesForSlotSelection.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm space-y-2">
                    <p className="font-bold text-slate-600">Aucun joueur correspondant trouvé</p>
                    <p className="text-xs text-slate-400">Modifiez les termes de recherche pour afficher d'autres profils.</p>
                  </div>
                ) : (
                  candidatesForSlotSelection.map((cand) => {
                    const ev = playerEvaluationsMap.get(cand.id);
                    const isAlreadyOnThisSlot = currentSlotPlayerIds.has(cand.id);
                    const isSameCategory = cand.age_category === categoryFilter;
                    const isSameScout = scoutFilter ? isCandidateDetectedBySelectedScout(cand, scoutFilter) : true;
                    const score = ev?.overall_score;

                    return (
                      <div
                        key={cand.id}
                        className={cn(
                          "p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 bg-white",
                          isAlreadyOnThisSlot
                            ? "border-emerald-300 bg-emerald-50/40 opacity-75"
                            : "border-slate-200 hover:border-amber-400 hover:shadow-md"
                        )}
                      >
                        {/* Info Joueur */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Avatar / Photo */}
                          <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-900 text-white font-black text-sm flex items-center justify-center">
                            {cand.photo_url ? (
                              <img src={cand.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{cand.first_name[0]}{cand.last_name[0]}</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-900 text-sm truncate">
                                {cand.first_name} {cand.last_name}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {cand.primary_position || 'Sans poste'}
                              </span>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                isSameCategory
                                  ? "bg-amber-50 text-amber-900 border-amber-300 font-black"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              )}>
                                {cand.age_category || 'Cat. inconnue'}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-500 truncate flex items-center gap-2 mt-1">
                              <span>{cand.current_club || 'Sans club'}</span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 text-slate-700">
                                <ScoutAvatar
                                  scoutId={cand.discovering_scout_id}
                                  scoutName={cand.discovering_scout_name || 'Cellule FUS'}
                                  scouts={scouts}
                                  size="xs"
                                />
                                <span>Scout : <strong className="font-semibold text-slate-800">{cand.discovering_scout_name || 'Cellule FUS'}</strong></span>
                              </span>
                              {score !== undefined && (
                                <>
                                  <span>•</span>
                                  <span className="font-black text-emerald-700">
                                    ⭐ {score.toFixed(1)}/10
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bouton d'action */}
                        <div className="shrink-0">
                          {isAlreadyOnThisSlot ? (
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Déjà à ce poste</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isAssigningPlayer}
                              onClick={() => handleAssignExistingCandidateToSlot(cand)}
                              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Sélectionner</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pied de page du Modal */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-slate-500 font-medium">
                  {candidatesForSlotSelection.length} profils existants dans la base de données
                </div>

                <button
                  type="button"
                  disabled={isAssigningPlayer}
                  onClick={() => {
                    setSlotForAddingPlayer(null);
                    setPlayerModalSearch('');
                  }}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL D'ENREGISTREMENT DE SHORTLIST AVEC INTITULÉ (US-DASH-33) ── */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Enregistrer la Shortlist
                  </h3>
                  <p className="text-xs text-slate-300">
                    Donnez un intitulé à cette configuration pour la retrouver facilement
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Intitulé */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Intitulé de la Shortlist</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={saveModalTitle}
                  onChange={(e) => setSaveModalTitle(e.target.value)}
                  placeholder="Ex: Élite U15 - Pépites Mars 2026, Équipe Type 4-3-3..."
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-sm font-bold text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
                />
              </div>

              {/* Description / Remarques */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Description / Remarques (Optionnel)</span>
                </label>
                <textarea
                  value={saveModalDesc}
                  onChange={(e) => setSaveModalDesc(e.target.value)}
                  rows={2}
                  placeholder="Notes tactiques, contexte de détection, objectifs de recrutement..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-xs font-medium text-slate-900 placeholder:text-slate-400 transition-all outline-hidden resize-none"
                />
              </div>

              {/* Récapitulatif technique capturé */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Paramètres sauvegardés automatiquement
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Scout filtré</span>
                    <span className="font-bold text-slate-800 truncate block">
                      {scoutFilter || 'Tous / Aucun'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Catégorie d'âge</span>
                    <span className="font-bold text-slate-800">
                      {categoryFilter || 'Toutes'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Système tactique</span>
                    <span className="font-bold text-slate-800">
                      {selectedFormationKey}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Hiérarchie des postes</span>
                    <span className="font-bold text-emerald-700">
                      {Object.keys(customSlotOrder).length} poste(s) ajusté(s)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                disabled={isSavingShortlist}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Annuler
              </button>

              {activeSavedShortlistId && (
                <button
                  type="button"
                  onClick={() => handleConfirmSaveShortlist(true)}
                  disabled={isSavingShortlist || !saveModalTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                >
                  Sauvegarder comme nouvelle
                </button>
              )}

              <button
                type="button"
                onClick={() => handleConfirmSaveShortlist(false)}
                disabled={isSavingShortlist || !saveModalTitle.trim()}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <BookmarkCheck className="w-4 h-4 stroke-[2.5]" />
                <span>{activeSavedShortlistId ? "Mettre à jour" : "Enregistrer la Shortlist"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL GESTIONNAIRE COMPLET DES SHORTLISTS (MODIFICATION & SUPPRESSION) ── */}
      {isManagerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-black border border-amber-400/30 shadow-inner">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">
                      {isScoutManager ? "Gestion de mes Shortlists Enregistrées" : "Gestion des Shortlists Enregistrées"}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {scopedSavedShortlists.length} configuration{scopedSavedShortlists.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {isScoutManager
                      ? "Modifiez vos intitulés, chargez vos compositions ou supprimez vos configurations."
                      : "Modifiez les intitulés, chargez les compositions ou supprimez les configurations."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsManagerModalOpen(false);
                  handleCancelEditManagerShortlist();
                }}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barre de recherche */}
            <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center gap-2.5 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={managerSearchQuery}
                  onChange={(e) => setManagerSearchQuery(e.target.value)}
                  placeholder="Rechercher par titre, catégorie, formation ou scout..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                />
              </div>
              {managerSearchQuery && (
                <button
                  type="button"
                  onClick={() => setManagerSearchQuery('')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 cursor-pointer"
                >
                  Effacer
                </button>
              )}
            </div>

            {/* Liste des shortlists avec scroll */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
              {scopedSavedShortlists.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <BookmarkPlus className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">Aucune shortlist enregistrée</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Créez votre première shortlist tactique et cliquez sur "Enregistrer cette Shortlist" pour la retrouver ici.
                  </p>
                </div>
              ) : filteredManagerShortlists.length === 0 ? (
                <div className="py-10 text-center space-y-1 text-xs text-slate-500">
                  <p className="font-bold">Aucune shortlist ne correspond à votre recherche.</p>
                  <p className="text-slate-400">Essayez un autre terme de recherche.</p>
                </div>
              ) : (
                filteredManagerShortlists.map((sl) => {
                  const isEditing = editingManagerShortlistId === sl.id;
                  const isActive = activeSavedShortlistId === sl.id;
                  const order = sl.custom_slot_order || {};
                  const configuredSlots = Object.keys(order).filter(k => Array.isArray(order[k]) && order[k].length > 0).length;

                  return (
                    <div
                      key={sl.id}
                      className={cn(
                        "p-4 rounded-2xl border transition-all space-y-3",
                        isActive
                          ? "bg-amber-50/50 border-amber-300 shadow-xs ring-1 ring-amber-300/50"
                          : "bg-slate-50/70 hover:bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                      )}
                    >
                      {isEditing ? (
                        /* Mode Édition */
                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-amber-300">
                          <div className="space-y-1">
                            <label className="text-[11px] font-black text-slate-700">
                              Intitulé de la shortlist *
                            </label>
                            <input
                              type="text"
                              value={editingManagerTitle}
                              onChange={(e) => setEditingManagerTitle(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
                              placeholder="Ex: Onze Titulaire U17 FUS..."
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-black text-slate-700">
                              Description / Notes (Optionnel)
                            </label>
                            <textarea
                              value={editingManagerDesc}
                              onChange={(e) => setEditingManagerDesc(e.target.value)}
                              rows={2}
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 resize-none"
                              placeholder="Notes tactiques, contexte de détection..."
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleCancelEditManagerShortlist}
                              disabled={isSavingManagerEdit}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditManagerShortlist(sl.id)}
                              disabled={isSavingManagerEdit || !editingManagerTitle.trim()}
                              className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Enregistrer</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Mode Affichage */
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-slate-900 text-sm truncate">
                                {sl.title}
                              </h4>
                              {isActive && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 border border-amber-500 shadow-2xs flex items-center gap-1">
                                  <BookmarkCheck className="w-3 h-3" />
                                  <span>Active</span>
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-900 text-white font-mono">
                                {sl.formation_key}
                              </span>
                              {sl.category_filter && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {sl.category_filter}
                                </span>
                              )}
                              {sl.scout_filter && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                  Scout : {sl.scout_filter}
                                </span>
                              )}
                            </div>

                            {sl.description && (
                              <p className="text-xs text-slate-600 font-medium">
                                {sl.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                              <span>{configuredSlots} poste{configuredSlots > 1 ? 's' : ''} configuré{configuredSlots > 1 ? 's' : ''}</span>
                              <span>•</span>
                              <span>Mis à jour le {new Date(sl.updated_at || sl.created_at).toLocaleDateString('fr-FR')}</span>
                              {sl.author_name && (
                                <>
                                  <span>•</span>
                                  <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                    👤 {sl.author_name === currentUserName ? 'Ma Shortlist' : `Auteur : ${sl.author_name}`}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            {/* Bouton Charger sur le terrain */}
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectSavedShortlist(sl.id);
                                setIsManagerModalOpen(false);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                              title="Charger cette configuration sur le terrain"
                            >
                              <Target className="w-3.5 h-3.5 text-primary" />
                              <span>Charger</span>
                            </button>

                            {/* Actions sur la shortlist selon permissions */}
                            {(isAdmin || isShortlistOwner(sl)) ? (
                              <>
                                {/* Bouton Modifier */}
                                <button
                                  type="button"
                                  onClick={() => handleStartEditManagerShortlist(sl)}
                                  className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Modifier l'intitulé et la description"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* Bouton Supprimer */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSavedShortlist(sl.id, sl.title)}
                                  className="p-1.5 rounded-xl border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors cursor-pointer"
                                  title="Supprimer définitivement cette shortlist"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                                <Eye className="w-3 h-3 text-slate-400" />
                                <span>Lecture seule</span>
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {scopedSavedShortlists.length} shortlist{scopedSavedShortlists.length > 1 ? 's' : ''} enregistrée{scopedSavedShortlists.length > 1 ? 's' : ''} au total
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsManagerModalOpen(false);
                  handleCancelEditManagerShortlist();
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortlistPitchView;
