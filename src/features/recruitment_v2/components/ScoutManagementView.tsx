import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Scout, TrialCandidate, CandidateEvaluation, ScoutObservation, SavedShortlistConfig } from '../types/recruitment';
import { RECRUITMENT_AGE_CATEGORIES, groupCategoriesByPole } from '../types/recruitment';
import { GEOGRAPHY_DATA } from '../../../constants/geography';
import {
  User, Plus, Phone, Mail, MapPin, Award, CheckCircle2,
  Calendar, TrendingUp, Shield, Edit3, Trash2, X, Sparkles,
  Users, CheckSquare, Square, Camera, Upload, Loader2, ChevronRight,
  Search, SlidersHorizontal, RotateCcw, Filter, Eye, ArrowUpDown, FileText,
  Trophy, UserPlus, Target, ShieldAlert, Power, Activity, Clock, Lock, Check,
  ExternalLink, KeyRound, Copy, EyeOff, MessageCircle, Share2, ShieldCheck,
  ImageIcon
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { uploadRecruitmentPhoto } from '../utils/uploadPhoto';
import { toast } from 'sonner';
import { LocationPicker } from './LocationPicker';
import { recruitmentService, generateSecureTempPassword, generateScoutLogin } from '../services/recruitmentService';
import { MediaPickerModal } from '../../media-management/components/MediaPickerModal';
import { CandidatePillarsScorecard } from './CandidatePillarsScorecard';

interface ScoutManagementViewProps {
  scouts: Scout[];
  candidates: TrialCandidate[];
  evaluations: CandidateEvaluation[];
  observations?: ScoutObservation[];
  onCreateScout: (
    scout: Omit<Scout, 'id' | 'created_at' | 'updated_at'>,
    credentials?: { login?: string; tempPassword?: string }
  ) => Promise<any>;
  onUpdateScout: (id: string, updates: Partial<Scout>) => Promise<any>;
  onDeleteScout: (id: string) => Promise<any>;
  onDeleteScouts?: (ids: string[]) => Promise<any>;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  adminCategories?: string[];
  onOpenCandidateDetail?: (candidate: TrialCandidate, initialTab?: 'scout' | 'personal' | 'sport' | 'evaluations' | 'report') => void;
  onAddCandidateForScout?: (scoutId: string) => void;
  onUpdateCandidate?: (id: string, updates: Partial<TrialCandidate>) => Promise<any>;
}

export const ScoutManagementView: React.FC<ScoutManagementViewProps> = ({
  scouts,
  candidates,
  evaluations,
  observations = [],
  isAdmin = true,
  isSuperAdmin = false,
  adminCategories,
  onCreateScout,
  onUpdateScout,
  onDeleteScout,
  onDeleteScouts,
  onOpenCandidateDetail,
  onAddCandidateForScout,
  onUpdateCandidate,
}) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingScout, setEditingScout] = useState<Scout | null>(null);

  // US-DASH-34 : Assistant de création de scout en 2 étapes & génération d'identifiants
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [createdCredentials, setCreatedCredentials] = useState<{
    scoutId: string;
    fullName: string;
    login: string;
    tempPassword: string;
    phone: string;
    roleTitle?: string;
  } | null>(null);
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [whatsAppPhoneNumber, setWhatsAppPhoneNumber] = useState('');
  // US-DASH-34.1 : Possibilité pour l'admin de définir ou générer le mot de passe en création et modification
  const [adminCustomPassword, setAdminCustomPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Rubrique Personnel : Seuls les Scout Admin, Scout Manager et Scouts de terrain apparaissent dans l'effectif
  const visibleScouts = useMemo(() => {
    // Protection anti-doublons défensive par ID, email et nom complet
    const seenEmails = new Set<string>();
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    return scouts.filter(s => {
      if (!s) return false;

      // Exclusion stricte des profils généraux du club (Directeurs, Super Admin, Analystes vidéo hors détection)
      const roleTitle = (s.role_title || '').toLowerCase().trim();
      const sysRole = ((s as any).system_role || '').toLowerCase().trim();
      const fullName = (s.full_name || '').toLowerCase().trim();

      const isExplicitScoutPersonnel = (
        sysRole === 'scout_admin' ||
        sysRole === 'scout_manager' ||
        roleTitle.includes('scout') ||
        roleTitle.includes('recruteur') ||
        roleTitle.includes('observateur')
      );

      const isGeneralClubUser = (
        (sysRole === 'super_admin' && !roleTitle.includes('scout')) ||
        (roleTitle.includes('directeur') && !roleTitle.includes('scout')) ||
        (roleTitle.includes('analyste') && !roleTitle.includes('scout')) ||
        fullName.includes('super admin') ||
        fullName.includes('manuel pires') ||
        fullName.includes('youssef oughegi') ||
        fullName.includes('boucba') ||
        fullName.includes('badr belabbes')
      );

      if (isGeneralClubUser && !isExplicitScoutPersonnel) {
        return false;
      }

      if (s.id && seenIds.has(s.id)) return false;
      if (s.id) seenIds.add(s.id);

      const emailKey = (s.email || '').toLowerCase().trim();
      if (emailKey && seenEmails.has(emailKey)) {
        return false;
      }
      if (emailKey) seenEmails.add(emailKey);

      const nameKey = fullName.replace(/\s+/g, ' ');
      if (nameKey && seenNames.has(nameKey)) {
        return false;
      }
      if (nameKey) seenNames.add(nameKey);

      return true;
    });
  }, [scouts]);

  // Helper de normalisation résiliente (accents, espaces, variations Dehbi/Dahbi)
  const normalizeScoutString = (str?: string | null): string => {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\bdehbi\b/g, 'dahbi')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const isCandidateForScout = (c: TrialCandidate, targetScout?: Scout | null) => {
    if (!targetScout) return false;
    const sId = targetScout.id;
    const sName = (targetScout.full_name || '').toLowerCase().trim();
    const sEmail = (targetScout.email || '').toLowerCase().trim();
    const normSName = normalizeScoutString(sName);

    // 1. Concordance directe sur les identifiants UUID
    const matchScoutId = Boolean(
      (c.discovering_scout_id && c.discovering_scout_id === sId) ||
      (c.recruiter_id && c.recruiter_id === sId) ||
      (c.assigned_scout_id && c.assigned_scout_id === sId) ||
      ((c as any).created_by && (c as any).created_by === sId) ||
      ((c as any).user_id && (c as any).user_id === sId)
    );

    // 2. Concordance sur le nom complet normalisé (découvreur, recruteur, scout assigné)
    const normDiscName = normalizeScoutString(c.discovering_scout_name);
    const normRecName = normalizeScoutString(c.recruiter_name);
    const normAssignedName = normalizeScoutString(c.assigned_scout_name);

    const matchName = Boolean(
      (normDiscName && normSName && (normDiscName === normSName || normDiscName.includes(normSName) || normSName.includes(normDiscName))) ||
      (normRecName && normSName && (normRecName === normSName || normRecName.includes(normSName) || normSName.includes(normRecName))) ||
      (normAssignedName && normSName && (normAssignedName === normSName || normAssignedName.includes(normSName) || normSName.includes(normAssignedName)))
    );

    // 3. Concordance par email
    const matchEmail = Boolean(
      sEmail && (
        ((c as any).recruiter_email && ((c as any).recruiter_email || '').toLowerCase().trim() === sEmail) ||
        ((c as any).scout_email && ((c as any).scout_email || '').toLowerCase().trim() === sEmail) ||
        ((c as any).created_by_email && ((c as any).created_by_email || '').toLowerCase().trim() === sEmail)
      )
    );

    // 4. Concordance missions
    const matchActiveMission = Boolean(
      (c.active_mission?.assigned_to_id && c.active_mission.assigned_to_id === sId) ||
      (c.active_mission?.assigned_to_name && normalizeScoutString(c.active_mission.assigned_to_name) === normSName)
    );

    const matchMissionHistory = Boolean(
      c.mission_history?.some(m =>
        m.assigned_to_id === sId ||
        (m.assigned_to_name && normalizeScoutString(m.assigned_to_name) === normSName)
      )
    );

    return matchScoutId || matchName || matchEmail || matchActiveMission || matchMissionHistory;
  };

  // État de recherche et filtres de statut (US-DASH-25)
  const [scoutSearchQuery, setScoutSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'in_mission'>('all');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Scouts filtrés dynamiquement selon recherche et statut
  const filteredScouts = useMemo(() => {
    return visibleScouts.filter(s => {
      // 1. Filtre recherche
      if (scoutSearchQuery.trim()) {
        const query = scoutSearchQuery.toLowerCase().trim();
        const nameMatch = (s.full_name || '').toLowerCase().includes(query);
        const roleMatch = (s.role_title || '').toLowerCase().includes(query);
        const regionMatch = (s.recruitment_region || '').toLowerCase().includes(query);
        const emailMatch = (s.email || '').toLowerCase().includes(query);
        const phoneMatch = (s.phone || '').toLowerCase().includes(query);
        if (!nameMatch && !roleMatch && !regionMatch && !emailMatch && !phoneMatch) {
          return false;
        }
      }

      // 2. Filtre statut
      if (statusFilter === 'active' && s.status !== 'active') return false;
      if (statusFilter === 'inactive' && s.status !== 'inactive') return false;
      if (statusFilter === 'in_mission') {
        const cCount = candidates.filter(c => isCandidateForScout(c, s)).length;
        if (cCount === 0 || s.status === 'inactive') return false;
      }

      return true;
    });
  }, [visibleScouts, scoutSearchQuery, statusFilter, candidates]);

  const [selectedScoutId, setSelectedScoutId] = useState<string | null>(() => filteredScouts[0]?.id || visibleScouts[0]?.id || null);

  useEffect(() => {
    if (filteredScouts.length > 0) {
      if (!selectedScoutId || !filteredScouts.some(s => s.id === selectedScoutId)) {
        setSelectedScoutId(filteredScouts[0].id);
      }
    } else if (visibleScouts.length > 0 && (!selectedScoutId || !visibleScouts.some(s => s.id === selectedScoutId))) {
      setSelectedScoutId(visibleScouts[0].id);
    } else if (visibleScouts.length === 0) {
      setSelectedScoutId(null);
    }
  }, [filteredScouts, visibleScouts, selectedScoutId]);

  // État de sélection multiple pour suppression groupée (US-DASH-22)
  const [selectedScoutIds, setSelectedScoutIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const masterCheckboxRef = React.useRef<HTMLInputElement>(null);

  // Synchroniser la sélection avec les scouts visibles
  useEffect(() => {
    setSelectedScoutIds(prev => prev.filter(id => visibleScouts.some(s => s.id === id)));
  }, [visibleScouts]);

  const allFilteredSelected = filteredScouts.length > 0 && filteredScouts.every(s => selectedScoutIds.includes(s.id));
  const someFilteredSelected = filteredScouts.some(s => selectedScoutIds.includes(s.id)) && !allFilteredSelected;

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = someFilteredSelected;
    }
  }, [someFilteredSelected]);

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredScouts.map(s => s.id));
      setSelectedScoutIds(prev => prev.filter(id => !filteredSet.has(id)));
    } else {
      const newIds = new Set([...selectedScoutIds, ...filteredScouts.map(s => s.id)]);
      setSelectedScoutIds(Array.from(newIds));
    }
  };

  const toggleSelectScout = (id: string) => {
    setSelectedScoutIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectedScoutsList = useMemo(() => {
    return visibleScouts.filter(s => selectedScoutIds.includes(s.id));
  }, [visibleScouts, selectedScoutIds]);

  const totalAffectedCandidatesCount = useMemo(() => {
    const selectedSet = new Set(selectedScoutIds);
    const affectedScouts = visibleScouts.filter(s => selectedSet.has(s.id));
    return candidates.filter(c => affectedScouts.some(s => isCandidateForScout(c, s))).length;
  }, [candidates, visibleScouts, selectedScoutIds]);

  const handleQuickToggleStatus = async (targetScout: Scout) => {
    if (!isAdmin || isUpdatingStatus) return;
    const nextStatus = targetScout.status === 'active' ? 'inactive' : 'active';
    const label = nextStatus === 'active' ? 'Actif' : 'Inactif';

    setIsUpdatingStatus(true);
    try {
      await onUpdateScout(targetScout.id, { status: nextStatus });
      toast.success(`Statut de ${targetScout.full_name} modifié : ${label}`, {
        icon: nextStatus === 'active' ? '🟢' : '⚪',
      });
    } catch (err: any) {
      console.error('Erreur changement de statut scout:', err);
      toast.error(err?.message || "Erreur lors du changement de statut");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedScoutIds.length === 0 || isBulkDeleting) return;
    setIsBulkDeleting(true);
    try {
      if (onDeleteScouts) {
        await onDeleteScouts(selectedScoutIds);
      } else {
        for (const id of selectedScoutIds) {
          await onDeleteScout(id);
        }
      }
      toast.success(`${selectedScoutIds.length} scout(s) supprimé(s) et joueurs libérés`);
      const remaining = visibleScouts.filter(s => !selectedScoutIds.includes(s.id));
      setSelectedScoutId(remaining[0]?.id || null);
      setSelectedScoutIds([]);
      setIsBulkDeleteModalOpen(false);
    } catch (err: any) {
      console.error('Erreur suppression multiple scouts:', err);
      toast.error("Erreur lors de la suppression multiple des scouts");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // État d'assignation joueur
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Onglets de la section : Joueurs ou Shortlists (Shadow Lists)
  const [activeSectionTab, setActiveSectionTab] = useState<'candidates' | 'shortlists'>('candidates');
  const [savedShortlists, setSavedShortlists] = useState<SavedShortlistConfig[]>([]);

  // Charger les configurations de Shadow Lists enregistrées
  useEffect(() => {
    let isMounted = true;
    recruitmentService.getSavedShortlists().then(list => {
      if (isMounted && list) {
        setSavedShortlists(list);
      }
    });
    return () => { isMounted = false; };
  }, []);


  // État de modification d'une shortlist enregistrée
  const [shortlistToEdit, setShortlistToEdit] = useState<SavedShortlistConfig | null>(null);
  const [editShortlistTitle, setEditShortlistTitle] = useState('');
  const [editShortlistDesc, setEditShortlistDesc] = useState('');
  const [isSavingShortlistEdit, setIsSavingShortlistEdit] = useState(false);

  const handleOpenEditShortlist = (sl: SavedShortlistConfig) => {
    setShortlistToEdit(sl);
    setEditShortlistTitle(sl.title);
    setEditShortlistDesc(sl.description || '');
  };

  const handleSaveEditShortlist = async () => {
    if (!shortlistToEdit) return;
    if (!editShortlistTitle.trim()) {
      toast.error("Veuillez renseigner un intitulé pour la shortlist");
      return;
    }
    try {
      setIsSavingShortlistEdit(true);
      const updated = await recruitmentService.saveShortlistConfig({
        ...shortlistToEdit,
        title: editShortlistTitle.trim(),
        description: editShortlistDesc.trim() || undefined,
      });
      setSavedShortlists(prev => prev.map(s => s.id === updated.id ? updated : s));
      toast.success(`Shortlist "${updated.title}" modifiée avec succès !`);
      setShortlistToEdit(null);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la modification de la shortlist");
    } finally {
      setIsSavingShortlistEdit(false);
    }
  };

  const handleDeleteShortlist = async (sl: SavedShortlistConfig) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement la shortlist "${sl.title}" ?`)) {
      return;
    }
    try {
      await recruitmentService.deleteSavedShortlist(sl.id);
      setSavedShortlists(prev => prev.filter(s => s.id !== sl.id));
      toast.success(`Shortlist "${sl.title}" supprimée.`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression de la shortlist");
    }
  };

  // Filtres & Recherche pour les joueurs du scout sélectionné
  const [candSearch, setCandSearch] = useState('');
  const [candCategoryFilter, setCandCategoryFilter] = useState('ALL');
  const [candPositionFilter, setCandPositionFilter] = useState('ALL');
  const [candScoreFilter, setCandScoreFilter] = useState('ALL');
  const [candSortBestScore, setCandSortBestScore] = useState(false);
  const [showCandFilters, setShowCandFilters] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [roleTitle, setRoleTitle] = useState('Scout');
  const [scoutContinent, setScoutContinent] = useState('Afrique');
  const [scoutCountry, setScoutCountry] = useState('Maroc');
  const [scoutCity, setScoutCity] = useState('Rabat');
  const [scoutCustomRegion, setScoutCustomRegion] = useState('');
  const [region, setRegion] = useState('Rabat, Maroc');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // US-DASH-30: Règle de délégation en cascade :
  // - Le Super Admin a accès à 100% des catégories (RECRUITMENT_AGE_CATEGORIES)
  // - Le Scout Admin ne peut allouer aux Scout Managers que les catégories qui lui ont été assignées par le Super Admin
  const allowedCategories = useMemo(() => {
    if (isSuperAdmin) {
      return RECRUITMENT_AGE_CATEGORIES;
    }
    if (adminCategories && adminCategories.length > 0) {
      return adminCategories;
    }
    return RECRUITMENT_AGE_CATEGORIES;
  }, [isSuperAdmin, adminCategories]);

  const [assignedCategories, setAssignedCategories] = useState<string[]>(
    isSuperAdmin ? [...RECRUITMENT_AGE_CATEGORIES] : [...allowedCategories]
  );
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [notes, setNotes] = useState('');

  const activeScout = filteredScouts.find(s => s.id === selectedScoutId) || visibleScouts.find(s => s.id === selectedScoutId) || visibleScouts[0] || null;

  // US-DASH-35 : Filtrer les Shadow Lists associées au scout actif/sélectionné
  const scoutSavedShortlists = useMemo(() => {
    if (!activeScout) return [];
    const scoutName = (activeScout.full_name || '').toLowerCase().trim();
    const scoutId = activeScout.id;
    const scoutEmail = (activeScout.email || '').toLowerCase().trim();

    return savedShortlists.filter(sl => {
      if (scoutId && (sl.author_id === scoutId || sl.created_by === scoutId)) return true;
      if (scoutEmail && sl.author_email?.toLowerCase().trim() === scoutEmail) return true;
      if (scoutName && sl.author_name?.toLowerCase().trim() === scoutName) return true;
      if (scoutName && sl.scout_filter?.toLowerCase().trim() === scoutName) return true;
      return false;
    });
  }, [savedShortlists, activeScout]);

  // Scout KPI calculations & Filtered Candidates
  const scoutCandidates = candidates.filter(c => isCandidateForScout(c, activeScout));
  const scoutEvals = evaluations.filter(e => scoutCandidates.some(c => c.id === e.candidate_id));

  // Agrégation des missions assignées au scout sélectionné et identité des donneurs d'ordre
  const scoutAssignedMissionsInfo = useMemo(() => {
    if (!activeScout) return { totalCount: 0, assigners: [] as { name: string; count: number }[] };
    const sId = activeScout.id;
    const normSName = normalizeScoutString(activeScout.full_name);

    const isTargetedToActiveScout = (toId?: string | null, toName?: string | null) =>
      Boolean(
        (toId && toId === sId) ||
        (toName && normSName && normalizeScoutString(toName) === normSName)
      );

    const resolveAssignerName = (byId?: string | null, byName?: string | null): string => {
      if (byName && byName.trim()) return byName.trim();
      if (byId) {
        const matched = scouts.find(s => s.id === byId);
        if (matched?.full_name) return matched.full_name.trim();
      }
      return 'Direction Scouting';
    };

    let totalCount = 0;
    const assignersMap = new Map<string, number>();

    const recordMission = (assignerName: string) => {
      totalCount += 1;
      assignersMap.set(assignerName, (assignersMap.get(assignerName) || 0) + 1);
    };

    candidates.forEach((c) => {
      const seenMissionIds = new Set<string>();
      let matchedAnyMissionObj = false;

      if (c.active_mission && isTargetedToActiveScout(c.active_mission.assigned_to_id, c.active_mission.assigned_to_name)) {
        matchedAnyMissionObj = true;
        if (c.active_mission.id) seenMissionIds.add(c.active_mission.id);
        recordMission(resolveAssignerName(c.active_mission.assigned_by_id, c.active_mission.assigned_by_name));
      }

      if (Array.isArray(c.mission_history)) {
        c.mission_history.forEach((m) => {
          if (m.id && seenMissionIds.has(m.id)) return;
          if (isTargetedToActiveScout(m.assigned_to_id, m.assigned_to_name)) {
            matchedAnyMissionObj = true;
            if (m.id) seenMissionIds.add(m.id);
            recordMission(resolveAssignerName(m.assigned_by_id, m.assigned_by_name));
          }
        });
      }

      // Repli si le joueur porte uniquement les champs d'assignation directe sans objet mission
      if (!matchedAnyMissionObj && isTargetedToActiveScout(c.assigned_scout_id, c.assigned_scout_name)) {
        recordMission(resolveAssignerName((c as any).assigned_by_scout_id, (c as any).assigned_by_scout_name));
      }
    });

    const assigners = Array.from(assignersMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'));

    return { totalCount, assigners };
  }, [candidates, activeScout, scouts]);

  // Assigner un joueur existant au scout actif
  const handleAssignCandidateToScout = async (candidateId: string) => {
    if (!onUpdateCandidate || !activeScout || isAssigning) return;
    setIsAssigning(true);
    try {
      await onUpdateCandidate(candidateId, {
        discovering_scout_id: activeScout.id,
        discovering_scout_name: activeScout.full_name,
      });
      const cand = candidates.find(c => c.id === candidateId);
      toast.success(`${cand ? `${cand.first_name} ${cand.last_name}` : 'Joueur'} assigné à ${activeScout.full_name}`);
      setIsAssignModalOpen(false);
      setAssignSearchQuery('');
    } catch (err: any) {
      console.error("Erreur d'assignation joueur au scout:", err);
      toast.error("Erreur lors de l'assignation du joueur");
    } finally {
      setIsAssigning(false);
    }
  };

  // Liste des joueurs disponibles pour assignation au scout actif
  const unassignedCandidates = useMemo(() => {
    if (!activeScout) return [];
    return candidates.filter(c => !isCandidateForScout(c, activeScout));
  }, [candidates, activeScout]);

  const filteredUnassignedCandidates = useMemo(() => {
    if (!assignSearchQuery.trim()) return unassignedCandidates;
    const q = assignSearchQuery.toLowerCase().trim();
    return unassignedCandidates.filter(c => {
      const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
      const club = (c.current_club || '').toLowerCase();
      const pos = (c.primary_position || '').toLowerCase();
      return name.includes(q) || club.includes(q) || pos.includes(q);
    });
  }, [unassignedCandidates, assignSearchQuery]);

  // Dictionnaire des noms complets des postes
  const POSITION_LABELS: Record<string, string> = {
    GK: 'Gardien de but (GK)',
    CB: 'Défenseur central (CB)',
    LB: 'Latéral gauche (LB)',
    RB: 'Latéral droit (RB)',
    LWB: 'Piston gauche (LWB)',
    RWB: 'Piston droit (RWB)',
    CDM: 'Milieu défensif (CDM)',
    CM: 'Milieu central (CM)',
    CAM: 'Milieu offensif (CAM)',
    LM: 'Milieu gauche (LM)',
    RM: 'Milieu droit (RM)',
    LW: 'Ailier gauche (LW)',
    RW: 'Ailier droit (RW)',
    ST: 'Avant-centre (ST)',
    CF: 'Attaquant de soutien (CF)',
    SS: 'Second attaquant (SS)',
  };

  // Filtrage fin des candidats associés
  const filteredScoutCandidates = useMemo(() => {
    let result = scoutCandidates.filter(c => {
      // 1. Recherche texte (Nom, Prénom, Club)
      if (candSearch.trim()) {
        const query = candSearch.toLowerCase();
        const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
        const club = (c.current_club || '').toLowerCase();
        if (!fullName.includes(query) && !club.includes(query)) {
          return false;
        }
      }

      // 2. Filtre Catégorie d'âge
      if (candCategoryFilter !== 'ALL') {
        if (c.age_category !== candCategoryFilter) return false;
      }

      // 3. Filtre Poste / Position
      if (candPositionFilter !== 'ALL') {
        if (c.primary_position !== candPositionFilter) return false;
      }

      // 4. Filtre Note Scout
      if (candScoreFilter !== 'ALL') {
        const minScore = parseFloat(candScoreFilter);
        const evalObj = scoutEvals.find(e => e.candidate_id === c.id);
        const effectiveScore = evalObj?.overall_score || c.initial_scout_score || 0;
        if (effectiveScore < minScore) return false;
      }

      return true;
    });

    // Tri par meilleur score
    if (candSortBestScore) {
      result = [...result].sort((a, b) => {
        const evalA = scoutEvals.find(e => e.candidate_id === a.id);
        const evalB = scoutEvals.find(e => e.candidate_id === b.id);
        const scoreA = evalA?.overall_score || a.initial_scout_score || 0;
        const scoreB = evalB?.overall_score || b.initial_scout_score || 0;
        return scoreB - scoreA;
      });
    }

    return result;
  }, [scoutCandidates, candSearch, candCategoryFilter, candPositionFilter, candScoreFilter, candSortBestScore, scoutEvals]);

  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    scoutCandidates.forEach(c => {
      if (c.age_category) set.add(c.age_category);
    });
    return Array.from(set).sort();
  }, [scoutCandidates]);

  const positionsList = useMemo(() => {
    const set = new Set<string>();
    scoutCandidates.forEach(c => {
      if (c.primary_position) set.add(c.primary_position);
    });
    return Array.from(set).sort();
  }, [scoutCandidates]);

  const activeFilterCount = (candCategoryFilter !== 'ALL' ? 1 : 0) +
    (candPositionFilter !== 'ALL' ? 1 : 0) +
    (candScoreFilter !== 'ALL' ? 1 : 0) +
    (candSortBestScore ? 1 : 0);

  const resetFilters = () => {
    setCandSearch('');
    setCandCategoryFilter('ALL');
    setCandPositionFilter('ALL');
    setCandScoreFilter('ALL');
    setCandSortBestScore(false);
  };

  const toggleCategory = (cat: string) => {
    setAssignedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleScoutContinentChange = (continent: string) => {
    setScoutContinent(continent);
    const countries = Object.keys(GEOGRAPHY_DATA[continent] || {});
    const firstCountry = countries[0] || '';
    setScoutCountry(firstCountry);
    const cities = GEOGRAPHY_DATA[continent]?.[firstCountry] || [];
    const firstCity = cities[0] || 'Autre';
    setScoutCity(firstCity);
    setRegion(firstCity === 'Autre' ? (scoutCustomRegion || firstCountry) : `${firstCity}, ${firstCountry}`);
  };

  const handleScoutCountryChange = (country: string) => {
    setScoutCountry(country);
    const cities = GEOGRAPHY_DATA[scoutContinent]?.[country] || [];
    const firstCity = cities[0] || 'Autre';
    setScoutCity(firstCity);
    setRegion(firstCity === 'Autre' ? (scoutCustomRegion || country) : `${firstCity}, ${country}`);
  };

  const handleScoutCityChange = (cityVal: string) => {
    setScoutCity(cityVal);
    if (cityVal === 'Autre') {
      setRegion(scoutCustomRegion ? `${scoutCustomRegion}, ${scoutCountry}` : scoutCountry);
    } else {
      setRegion(`${cityVal}, ${scoutCountry}`);
    }
  };

  const handleScoutCustomRegionChange = (val: string) => {
    setScoutCustomRegion(val);
    setRegion(val ? `${val}, ${scoutCountry}` : scoutCountry);
  };

  const handleScoutPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const url = await uploadRecruitmentPhoto(file, 'scouts');
      setPhotoUrl(url);
      toast.success('Photo du scout/recruteur chargée avec succès', { icon: '📸' });
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du téléversement de la photo');
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const getWhatsAppUrl = (phoneNumber: string, message: string) => {
    let cleaned = (phoneNumber || '').replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '+212' + cleaned.substring(1);
    }
    const digits = cleaned.replace(/^\+/, '');
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  };

  const getWhatsAppMessage = (scoutName: string, login: string, tempPwd: string, targetRole?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fus-club.ma';
    const isTargetAdmin = targetRole === 'Scout Admin' || targetRole?.toLowerCase().includes('admin');
    const roleLabel = isTargetAdmin ? 'Scout Admin (Direction & Supervision Détection)' : (targetRole || 'Scout / Recruteur');

    return `Bonjour ${scoutName},

Bienvenue au sein de la Direction du Recrutement & Détection du FUS Rabat !
Votre compte ${roleLabel} a été créé avec succès par l'Administrateur.

Voici vos identifiants d'accès à l'application de scouting :

🌐 Lien de l'application : ${origin}/login
👤 Identifiant (Login) : ${login}
🔑 Mot de passe temporaire : ${tempPwd}
💼 Rôle : ${roleLabel}

⚠️ Important : Il s'agit d'un mot de passe temporaire. Lors de votre première connexion, vous devrez obligatoirement définir votre propre mot de passe personnel avant d'accéder à l'application.

Cellule Détection & Scouting — FUS Rabat`;
  };

  const openCreateModal = () => {
    setEditingScout(null);
    setModalStep(1);
    setCreatedCredentials(null);
    setShowTempPassword(false);
    setCopiedField(null);
    setFullName('');
    setPhotoUrl('');
    setRoleTitle(isSuperAdmin ? 'Scout Manager' : 'Scout Éditeur');
    setScoutContinent('Afrique');
    setScoutCountry('Maroc');
    setScoutCity('Rabat');
    setScoutCustomRegion('');
    setRegion('Rabat, Maroc');
    setPhone('');
    setEmail('');
    setWhatsAppPhoneNumber('');
    setAdminCustomPassword(generateSecureTempPassword());
    setShowAdminPassword(true);
    setAssignedCategories(isSuperAdmin ? [...RECRUITMENT_AGE_CATEGORIES] : [...allowedCategories]);
    setStatus('active');
    setNotes('');
    setIsModalOpen(true);
  };

  // US-DASH-36 : Création dédiée du compte Scout Admin par le Super Admin
  const openCreateScoutAdminModal = () => {
    openCreateModal();
    setRoleTitle('Scout Admin');
    setAssignedCategories([...RECRUITMENT_AGE_CATEGORIES]); // Toutes les catégories par défaut pour la direction
  };

  const openEditModal = (scout: Scout) => {
    setEditingScout(scout);
    setModalStep(1);
    setCreatedCredentials(null);
    setShowTempPassword(false);
    setCopiedField(null);
    setAdminCustomPassword('');
    setShowAdminPassword(false);
    setFullName(scout.full_name);
    setPhotoUrl(scout.photo_url || '');
    setRoleTitle(scout.role_title);
    setRegion(scout.recruitment_region || 'Rabat, Maroc');
    setPhone(scout.phone || '');
    setEmail(scout.email || '');
    setWhatsAppPhoneNumber(scout.phone || '');

    // US-DASH-30 : Filtrage des catégories selon la délégation en cascade
    const rawCats = scout.assigned_categories || [];
    const initialCats = isSuperAdmin
      ? (rawCats.length > 0 ? rawCats : [...RECRUITMENT_AGE_CATEGORIES])
      : (rawCats.length > 0 ? rawCats.filter(c => allowedCategories.includes(c)) : [...allowedCategories]);
    setAssignedCategories(initialCats);
    setStatus(scout.status);
    setNotes(scout.notes || '');

    // Resolve geography
    if (scout.recruitment_region) {
      let matched = false;
      for (const [cont, countries] of Object.entries(GEOGRAPHY_DATA)) {
        for (const [country, cities] of Object.entries(countries)) {
          const foundCity = cities.find(ct => scout.recruitment_region?.toLowerCase().includes(ct.toLowerCase()));
          if (foundCity) {
            setScoutContinent(cont);
            setScoutCountry(country);
            setScoutCity(foundCity);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
      if (!matched) {
        setScoutContinent('Afrique');
        setScoutCountry('Maroc');
        setScoutCity('Autre');
        setScoutCustomRegion(scout.recruitment_region);
      }
    }

    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || isSaving) return;

    setIsSaving(true);
    try {
      // US-DASH-30 : Nettoyage et application de la cascade
      const finalCategories = isSuperAdmin
        ? (assignedCategories.length > 0 ? assignedCategories : [...RECRUITMENT_AGE_CATEGORIES])
        : assignedCategories.filter(c => allowedCategories.includes(c));
      const categoriesToSave = finalCategories.length > 0
        ? finalCategories
        : (isSuperAdmin ? [...RECRUITMENT_AGE_CATEGORIES] : [...allowedCategories]);

      if (editingScout) {
        const data = {
          full_name: fullName.trim(),
          photo_url: photoUrl.trim() || undefined,
          role_title: roleTitle,
          recruitment_region: region,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          assigned_categories: categoriesToSave,
          assigned_teams: ['Académie FUS'],
          status,
          recruited_date: editingScout?.recruited_date || new Date().toISOString().split('T')[0],
          notes: notes.trim() || undefined,
        };

        await onUpdateScout(editingScout.id, data);
        setSelectedScoutId(editingScout.id);

        // Si l'administrateur a défini ou généré un nouveau mot de passe lors de la modification
        if (adminCustomPassword.trim().length > 0) {
          const newPwd = adminCustomPassword.trim();
          const scoutLogin = email.trim() || editingScout.email || generateScoutLogin(fullName.trim());

          await recruitmentService.provisionScoutCredentials({
            scoutId: editingScout.id,
            login: scoutLogin,
            tempPassword: newPwd,
            fullName: fullName.trim(),
            phone: phone.trim() || editingScout.phone,
            roleTitle: roleTitle || editingScout.role_title
          });

          setCreatedCredentials({
            scoutId: editingScout.id,
            fullName: fullName.trim(),
            login: scoutLogin,
            tempPassword: newPwd,
            phone: phone.trim() || editingScout.phone || '',
            roleTitle: roleTitle || editingScout.role_title,
          });
          setWhatsAppPhoneNumber(phone.trim() || editingScout.phone || '');
          setModalStep(2); // Bascule automatiquement sur l'Étape 2 (WhatsApp) pour envoi immédiat !
          toast.success("Mot de passe mis à jour ! Vous pouvez l'envoyer au scout via WhatsApp.");
        } else {
          setIsModalOpen(false);
        }
      } else {
        // Mode Création - US-DASH-34
        // Étape 2 : Génération automatique ou personnalisée du Login et Mot de passe temporaire
        const generatedLogin = generateScoutLogin(fullName.trim(), email.trim());
        const finalTempPassword = adminCustomPassword.trim() || generateSecureTempPassword();

        const data = {
          full_name: fullName.trim(),
          photo_url: photoUrl.trim() || undefined,
          role_title: roleTitle,
          recruitment_region: region,
          phone: phone.trim() || undefined,
          email: generatedLogin,
          assigned_categories: categoriesToSave,
          assigned_teams: ['Académie FUS'],
          status,
          recruited_date: new Date().toISOString().split('T')[0],
          notes: notes.trim() || undefined,
        };

        const created = await onCreateScout(data, {
          login: generatedLogin,
          tempPassword: finalTempPassword
        });

        const newId = created?.id || `scout-${Date.now()}`;
        setSelectedScoutId(newId);

        setCreatedCredentials({
          scoutId: newId,
          fullName: fullName.trim(),
          login: generatedLogin,
          tempPassword: finalTempPassword,
          phone: phone.trim(),
          roleTitle: roleTitle,
        });
        setWhatsAppPhoneNumber(phone.trim());
        setModalStep(2); // Passe à l'étape 2 (Génération des identifiants & WhatsApp)
      }
    } catch (err: any) {
      console.error('[ScoutManagementView] Erreur sauvegarde scout:', err);
      toast.error(err?.message || "Erreur lors de l'enregistrement du scout");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-5 border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Cellule Détection & Gestion des Scouts
          </h2>
          <p className="text-xs text-muted-foreground">
            Suivi des recruteurs du club, fiches d'activité et zones de prospection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-600 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-100 hidden sm:inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Scout sélectionné : <strong className="text-slate-800">{activeScout?.full_name || 'Aucun'}</strong>
          </span>

          {isAdmin && (
            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={openCreateScoutAdminModal}
                  className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer"
                  title="Créer un compte Scout Admin (Direction Détection) avec génération automatique d'identifiants et envoi WhatsApp"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-200" />
                  <span>Nouveau Scout Admin</span>
                </button>
              )}

              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow hover:bg-primary/90 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isSuperAdmin ? "Ajouter un Scout / Manager" : "Ajouter un Scout"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BARRE SYNTHÉTIQUE DES STATUTS DE LA CELLULE (Vue Super Admin & Admin - US-DASH-25) */}
      {isAdmin && visibleScouts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={cn(
              "p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group shadow-2xs",
              statusFilter === 'all'
                ? "bg-white border-primary ring-2 ring-primary/10 shadow-sm"
                : "bg-white hover:bg-slate-50 border-slate-200"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Effectif</span>
              <div className="p-1.5 rounded-xl bg-slate-100 text-slate-700 group-hover:scale-105 transition-transform">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{visibleScouts.length}</span>
              <span className="text-[10px] font-semibold text-slate-500">recruteurs</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={cn(
              "p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group shadow-2xs",
              statusFilter === 'active'
                ? "bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                : "bg-white hover:bg-emerald-50/20 border-slate-200"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Scouts Actifs</span>
              <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700">
                {visibleScouts.filter(s => s.status === 'active').length}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                Opérationnels
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={cn(
              "p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group shadow-2xs",
              statusFilter === 'inactive'
                ? "bg-slate-100/80 border-slate-400 ring-2 ring-slate-400/20 shadow-sm"
                : "bg-white hover:bg-slate-50 border-slate-200"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Scouts Inactifs</span>
              <div className="p-1.5 rounded-xl bg-slate-100 text-slate-500 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-700">
                {visibleScouts.filter(s => s.status === 'inactive').length}
              </span>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full">
                En pause
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('in_mission')}
            className={cn(
              "p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group shadow-2xs",
              statusFilter === 'in_mission'
                ? "bg-purple-50/50 border-purple-500 ring-2 ring-purple-500/20 shadow-sm"
                : "bg-white hover:bg-purple-50/20 border-slate-200"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">En Mission</span>
              <div className="p-1.5 rounded-xl bg-purple-100 text-purple-700 group-hover:scale-105 transition-transform">
                <Target className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-700">
                {visibleScouts.filter(s => s.status === 'active' && candidates.some(c => isCandidateForScout(c, s))).length}
              </span>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">
                Mobilisés
              </span>
            </div>
          </button>
        </div>
      )}

      {/* ROSTER ET DÉTAIL DES SCOUTS */}
      <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-6", isModalOpen && "hidden")}>
        {/* Liste des Scouts (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                  {isAdmin && filteredScouts.length > 0 && (
                    <label className="flex items-center cursor-pointer select-none" title={allFilteredSelected ? "Tout désélectionner" : "Tout sélectionner"}>
                      <input
                        ref={masterCheckboxRef}
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                    </label>
                  )}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {isAdmin ? `Cellule Scouts • Effectif (${filteredScouts.length}/${visibleScouts.length})` : 'Mon Profil Scout'}
                    </h3>
                    {isAdmin && (
                      <p className="text-[10px] text-slate-400 font-medium">Scout Managers, Admins & Observateurs</p>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="px-2.5 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold shadow-xs hover:bg-primary/90 transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter un scout
                  </button>
                )}
              </div>

              {/* BARRE DE RECHERCHE ET ONGLETS DE STATUT (US-DASH-25) */}
              {isAdmin && visibleScouts.length > 0 && (
                <div className="space-y-2 bg-slate-50/60 p-2.5 rounded-2xl border border-slate-200/80">
                  {/* Barre de recherche */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={scoutSearchQuery}
                      onChange={(e) => setScoutSearchQuery(e.target.value)}
                      placeholder="Rechercher par nom, rôle, région..."
                      className="w-full pl-8.5 pr-7 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
                    />
                    {scoutSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setScoutSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Filtres par statut */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar">
                    {[
                      { id: 'all', label: 'Tous', count: visibleScouts.length },
                      { id: 'active', label: 'Actifs', count: visibleScouts.filter(s => s.status === 'active').length, dot: 'bg-emerald-500' },
                      { id: 'inactive', label: 'Inactifs', count: visibleScouts.filter(s => s.status === 'inactive').length, dot: 'bg-slate-400' },
                      { id: 'in_mission', label: 'En Mission', count: visibleScouts.filter(s => s.status === 'active' && candidates.some(c => isCandidateForScout(c, s))).length, dot: 'bg-purple-500' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStatusFilter(tab.id as any)}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1",
                          statusFilter === tab.id
                            ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        {tab.dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", tab.dot)} />}
                        <span>{tab.label}</span>
                        <span className={cn(
                          "text-[10px] px-1 rounded-md",
                          statusFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                        )}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* BANDEAU D'ACTIONS GROUPÉES (US-DASH-22) */}
              {isAdmin && selectedScoutIds.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-900 border border-rose-500/30 text-white shadow-lg flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                      {selectedScoutIds.length}
                    </span>
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {selectedScoutIds.length > 1 ? 'Scouts sélectionnés' : 'Scout sélectionné'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedScoutIds([])}
                      className="text-[11px] font-bold text-slate-400 hover:text-white px-2 py-1 transition-colors cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBulkDeleteModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer ({selectedScoutIds.length})
                    </button>
                  </div>
                </div>
              )}

              {visibleScouts.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <Users className="w-8 h-8 text-slate-400 mx-auto" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Aucun recruteur de terrain</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ajoutez vos scouts pour leur assigner des zones et suivre leurs détections.
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter un scout
                    </button>
                  )}
                </div>
              ) : filteredScouts.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <Filter className="w-8 h-8 text-slate-400 mx-auto" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Aucun recruteur ne correspond</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Modifiez vos critères de recherche ou réinitialisez le filtre de statut.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setScoutSearchQuery(''); setStatusFilter('all'); }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Réinitialiser les filtres
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredScouts.map((scout) => {
                    const isSelected = activeScout?.id === scout.id;
                    const isScoutChecked = selectedScoutIds.includes(scout.id);
                    const candCount = candidates.filter(c => isCandidateForScout(c, scout)).length;

                    return (
                      <div
                        key={scout.id}
                        onClick={() => setSelectedScoutId(scout.id)}
                        className={cn(
                          "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                          isScoutChecked
                            ? "bg-rose-50/20 border-rose-300 ring-2 ring-rose-500/20 shadow-sm"
                            : isSelected
                              ? "bg-white border-primary shadow-md ring-2 ring-primary/10"
                              : "bg-white hover:bg-slate-50 border-slate-200"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectScout(scout.id);
                              }}
                              className="p-1 -ml-1 text-slate-400 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
                              title={isScoutChecked ? "Désélectionner" : "Sélectionner pour suppression"}
                            >
                              {isScoutChecked ? (
                                <CheckSquare className="w-4 h-4 text-rose-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                              )}
                            </button>
                          )}
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-slate-200 shadow-2xs">
                            {scout.photo_url ? (
                              <img
                                src={scout.photo_url}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              scout.full_name.split(' ').map(n => n[0]).join('')
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-900 truncate">{scout.full_name}</h4>
                              {scout.role_title?.toLowerCase().includes('admin') && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                                  Admin
                                </span>
                              )}
                              {scout.role_title?.toLowerCase().includes('manager') && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                  Manager
                                </span>
                              )}
                              {(scout.role_title?.toLowerCase().includes('éditeur') || scout.role_title?.toLowerCase().includes('editeur')) && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-cyan-100 text-cyan-800 border border-cyan-200 shrink-0">
                                  Éditeur
                                </span>
                              )}
                              {scout.role_title?.toLowerCase().includes('user') && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-zinc-100 text-zinc-800 border border-zinc-200 shrink-0">
                                  User
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{scout.role_title}</p>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 text-primary shrink-0" /> {scout.recruitment_region?.includes('|') ? scout.recruitment_region.split('|')[0] : scout.recruitment_region}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <div className="text-right">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold block mb-1 border shadow-2xs",
                              candCount > 0
                                ? "bg-purple-50 text-purple-700 border-purple-200/60"
                                : "bg-slate-100 text-slate-600 border-slate-200/50"
                            )}>
                              {candCount > 0 ? `${candCount} prospection${candCount > 1 ? 's' : ''}` : 'Disponible'}
                            </span>
                            <span className={cn(
                              "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded inline-flex items-center gap-1 border shadow-2xs",
                              scout.status === 'active'
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                : "text-slate-600 bg-slate-100 border-slate-200"
                            )}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", scout.status === 'active' ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                              {scout.status === 'active' ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                          <ChevronRight className={cn(
                            "w-5 h-5 transition-colors shrink-0",
                            isSelected ? "text-primary" : "text-slate-300 group-hover:text-slate-400"
                          )} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dashboard Personnel du Scout Sélectionné (8 Cols) */}
            {activeScout ? (
              <div className="lg:col-span-8 bg-white rounded-3xl p-6 border shadow-sm space-y-6">
                {/* Profil Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-slate-900 text-white flex items-center justify-center text-xl font-black shrink-0 overflow-hidden border border-slate-200 shadow-sm">
                      {activeScout.photo_url ? (
                        <img
                          src={activeScout.photo_url}
                          alt={activeScout.full_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        activeScout.full_name.split(' ').map(n => n[0]).join('')
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold text-foreground">{activeScout.full_name}</h3>
                        {/* Badge Statut Administratif */}
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-2xs",
                          activeScout.status === 'active'
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                          <span className={cn("w-2 h-2 rounded-full", activeScout.status === 'active' ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                          {activeScout.status === 'active' ? 'Statut : Actif' : 'Statut : Inactif'}
                        </span>

                        {/* Badge Statut Opérationnel */}
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-2xs",
                          scoutCandidates.length > 0
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          <Target className="w-3.5 h-3.5" />
                          {scoutCandidates.length > 0 ? `${scoutCandidates.length} joueur(s) assigné(s)` : 'Disponible'}
                        </span>

                        {/* Badge Rôle */}
                        {activeScout.role_title?.toLowerCase().includes('admin') ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                            Scout Admin
                          </span>
                        ) : activeScout.role_title?.toLowerCase().includes('manager') ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Scout Manager
                          </span>
                        ) : (activeScout.role_title?.toLowerCase().includes('éditeur') || activeScout.role_title?.toLowerCase().includes('editeur')) ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-cyan-100 text-cyan-800 border border-cyan-200">
                            Scout Éditeur
                          </span>
                        ) : activeScout.role_title?.toLowerCase().includes('user') ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-zinc-100 text-zinc-800 border border-zinc-200">
                            Scout User
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-900 text-white">
                            {activeScout.role_title || 'Scout'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activeScout.role_title} • Région : {activeScout.recruitment_region?.includes('|') ? activeScout.recruitment_region.split('|')[0] : activeScout.recruitment_region}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                        {activeScout.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-primary" /> {activeScout.phone}</span>}
                        {activeScout.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-primary" /> {activeScout.email}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => handleQuickToggleStatus(activeScout)}
                        className={cn(
                          "px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs",
                          activeScout.status === 'active'
                            ? "bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        )}
                        title={activeScout.status === 'active' ? "Désactiver ce recruteur (passer en inactif)" : "Activer ce recruteur"}
                      >
                        {isUpdatingStatus ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Power className={cn("w-3.5 h-3.5", activeScout.status === 'active' ? "text-slate-500" : "text-emerald-600")} />
                        )}
                        <span>{activeScout.status === 'active' ? 'Passer en Inactif' : 'Activer le Scout'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(activeScout)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Modifier le profil"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={async () => {
                          const isTargetScoutAdmin = activeScout.role_title?.toLowerCase().includes('admin') || (activeScout as any).system_role === 'scout_admin';
                          if (isTargetScoutAdmin && !isSuperAdmin) {
                            toast.error("Seul le Super Administrateur peut supprimer un compte Scout Admin.");
                            return;
                          }
                          if (confirm(`Retirer le scout ${activeScout.full_name} ?`)) {
                            try {
                              const scoutToDeleteId = activeScout.id;
                              const remaining = visibleScouts.filter(s => s.id !== scoutToDeleteId);
                              setSelectedScoutId(remaining[0]?.id || null);
                              setSelectedScoutIds(prev => prev.filter(id => id !== scoutToDeleteId));
                              await onDeleteScout(scoutToDeleteId);
                            } catch (err) {
                              console.error('Erreur suppression scout:', err);
                            }
                          }
                        }}
                        className={cn(
                          "p-2 rounded-xl border border-slate-200 transition-colors cursor-pointer",
                          (activeScout.role_title?.toLowerCase().includes('admin') && !isSuperAdmin)
                            ? "text-slate-300 border-slate-200 cursor-not-allowed hover:bg-transparent"
                            : "text-rose-600 hover:bg-rose-50"
                        )}
                        disabled={activeScout.role_title?.toLowerCase().includes('admin') && !isSuperAdmin}
                        title={activeScout.role_title?.toLowerCase().includes('admin') && !isSuperAdmin ? "Seul le Super Admin peut supprimer un Scout Admin" : "Supprimer"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* KPIs Performance & Statut du Scout */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={cn(
                    "p-3.5 rounded-2xl border text-center flex flex-col justify-center shadow-2xs",
                    activeScout.status === 'active' ? "bg-emerald-50/50 border-emerald-100" : "bg-slate-50 border-slate-200"
                  )}>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Statut Actuel</span>
                    <span className={cn(
                      "text-sm font-black mt-1 inline-flex items-center justify-center gap-1.5",
                      activeScout.status === 'active' ? "text-emerald-700" : "text-slate-600"
                    )}>
                      <span className={cn("w-2 h-2 rounded-full", activeScout.status === 'active' ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                      {activeScout.status === 'active' ? 'Opérationnel' : 'Inactif'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {activeScout.recruited_date ? `Depuis ${new Date(activeScout.recruited_date).toLocaleDateString('fr-FR')}` : 'En poste'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Talents Découverts</span>
                    <span className="text-2xl font-black text-foreground mt-0.5">{scoutCandidates.length}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 text-center flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-bold text-amber-800 block">Évalués</span>
                    <span className="text-2xl font-black text-amber-700 mt-0.5">
                      {scoutCandidates.filter(c => scoutEvals.some(e => e.candidate_id === c.id)).length}
                    </span>
                  </div>

                  <div
                    className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-center flex flex-col justify-center"
                    title={
                      scoutAssignedMissionsInfo.totalCount > 0
                        ? `Missions assignées par : ${scoutAssignedMissionsInfo.assigners.map(a => `${a.name} (${a.count})`).join(', ')}`
                        : 'Aucune mission assignée'
                    }
                  >
                    <span className="text-[10px] uppercase font-bold text-indigo-800 block">Missions Assignées</span>
                    <span className="text-2xl font-black text-indigo-700 mt-0.5">
                      {scoutAssignedMissionsInfo.totalCount}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-900/80 mt-0.5 line-clamp-2 leading-tight">
                      {scoutAssignedMissionsInfo.totalCount > 0
                        ? `Par : ${scoutAssignedMissionsInfo.assigners
                            .map(a => (scoutAssignedMissionsInfo.assigners.length > 1 ? `${a.name} (${a.count})` : a.name))
                            .join(', ')}`
                        : 'Aucune mission'}
                    </span>
                  </div>
                </div>

                {/* Onglets Joueurs & Shortlists (Shadow Lists) */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setActiveSectionTab('candidates')}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer",
                          activeSectionTab === 'candidates'
                            ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                        )}
                      >
                        <Users className="w-3.5 h-3.5 text-primary" />
                        <span>Joueurs</span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                          activeSectionTab === 'candidates'
                            ? "bg-primary/10 text-primary"
                            : "bg-slate-200/70 text-slate-600"
                        )}>
                          {filteredScoutCandidates.length}/{scoutCandidates.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSectionTab('shortlists')}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer",
                          activeSectionTab === 'shortlists'
                            ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                        )}
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span>Shortlists</span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                          activeSectionTab === 'shortlists'
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-200/70 text-slate-600"
                        )}>
                          {scoutSavedShortlists.length}
                        </span>
                      </button>
                    </div>

                    {/* Barre de recherche compacte & Bouton Filtres (affichés dans l'onglet Joueurs) */}
                    {activeSectionTab === 'candidates' && (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 sm:w-48">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Rechercher joueur / club..."
                            value={candSearch}
                            onChange={(e) => setCandSearch(e.target.value)}
                            className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
                          />
                          {candSearch && (
                            <button
                              onClick={() => setCandSearch('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => setShowCandFilters(prev => !prev)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer",
                            showCandFilters || activeFilterCount > 0
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                          title="Filtrer les joueurs par catégorie, poste ou score"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Filtres</span>
                          {activeFilterCount > 0 && (
                            <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                              {activeFilterCount}
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* CONTENU ONGLET 1 : JOUEURS */}
                  {activeSectionTab === 'candidates' && (
                    <>
                      {/* Tiroir de filtres (Catégorie, Poste avec nom complet, Score, Tri Meilleur Score) */}
                      {showCandFilters && (
                        <div className="p-3.5 mb-3 bg-slate-50/95 rounded-2xl border border-slate-200/90 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-500">Catégorie:</span>
                            <select
                              value={candCategoryFilter}
                              onChange={(e) => setCandCategoryFilter(e.target.value)}
                              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                            >
                              <option value="ALL">Toutes</option>
                              {categoriesList.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-500">Poste:</span>
                            <select
                              value={candPositionFilter}
                              onChange={(e) => setCandPositionFilter(e.target.value)}
                              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary max-w-[210px] shadow-2xs"
                            >
                              <option value="ALL">Tous les postes</option>
                              {positionsList.map(pos => (
                                <option key={pos} value={pos}>
                                  {POSITION_LABELS[pos] || pos}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-500">Note Min:</span>
                            <select
                              value={candScoreFilter}
                              onChange={(e) => setCandScoreFilter(e.target.value)}
                              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                            >
                              <option value="ALL">Toutes les notes</option>
                              <option value="9">⭐ 9+ / 10</option>
                              <option value="8">⭐ 8+ / 10</option>
                              <option value="7">⭐ 7+ / 10</option>
                              <option value="6">⭐ 6+ / 10</option>
                            </select>
                          </div>

                          {/* Bouton Meilleur Score */}
                          <button
                            type="button"
                            onClick={() => setCandSortBestScore(prev => !prev)}
                            className={cn(
                              "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer shadow-2xs",
                              candSortBestScore
                                ? "bg-amber-500 text-white border-amber-600 shadow-amber-500/20 shadow-md"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                            )}
                            title="Trier les joueurs par meilleur score scout"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                            <span>Meilleur Score</span>
                          </button>

                          {activeFilterCount > 0 && (
                            <button
                              onClick={resetFilters}
                              className="ml-auto flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Réinitialiser
                            </button>
                          )}
                        </div>
                      )}

                      {/* Liste des joueurs scrollable */}
                      {scoutCandidates.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground bg-slate-50 rounded-2xl border border-dashed">
                          Aucun joueur actuellement associé à ce scout.
                        </div>
                      ) : filteredScoutCandidates.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground bg-slate-50 rounded-2xl border border-dashed">
                          Aucun joueur ne correspond aux filtres appliqués.
                        </div>
                      ) : (
                        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1.5">
                          {filteredScoutCandidates.map((c) => {
                            // Agrégation résiliente des rapports/évaluations du joueur
                            const candEvalsList = [
                              ...evaluations.filter(e => e.candidate_id === c.id),
                              ...(c.evaluations || [])
                            ].filter((e, idx, arr) => arr.findIndex(x => x.id === e.id) === idx);

                            const sortedEvals = [...candEvalsList].sort((a, b) => {
                              const tA = new Date(a.evaluation_date || a.created_at || (a as any).updated_at || 0).getTime();
                              const tB = new Date(b.evaluation_date || b.created_at || (b as any).updated_at || 0).getTime();
                              return tB - tA;
                            });
                            // Dernier rapport d'évaluation rédigé
                            const latestEval = sortedEvals[0];

                            // 1. Scores des 4 piliers individuels (Technique, Tactique, Physique, Mental) issus du DERNIER RAPPORT
                            const getScoreVal = (val: any) => {
                              if (val == null || val === '') return null;
                              const num = Number(val);
                              return !isNaN(num) ? Math.round(num * 10) / 10 : null;
                            };

                            const techScore = getScoreVal(latestEval?.technical_score ?? (latestEval as any)?.tech_score ?? (latestEval as any)?.technical_rating);
                            const tactScore = getScoreVal(latestEval?.tactical_score ?? (latestEval as any)?.tact_score ?? (latestEval as any)?.tactical_rating);
                            const physScore = getScoreVal(latestEval?.physical_score ?? (latestEval as any)?.phys_score ?? (latestEval as any)?.physical_rating);
                            const mentScore = getScoreVal(latestEval?.mental_score ?? (latestEval as any)?.ment_score ?? (latestEval as any)?.mental_rating);

                            // 2. Dernier potentiel du joueur : 0.0 strict si le joueur n'a aucun rapport
                            const potentialScore: number | null = (candEvalsList.length === 0 || !latestEval)
                              ? 0
                              : (latestEval.potential_rating != null && !isNaN(Number(latestEval.potential_rating)))
                                ? Math.round(Number(latestEval.potential_rating) * 10) / 10
                                : (c.potential_rating != null && !isNaN(Number(c.potential_rating)))
                                  ? Math.round(Number(c.potential_rating) * 10) / 10
                                  : 0;

                            return (
                              <div
                                key={c.id}
                                className="p-3.5 bg-slate-50/85 hover:bg-white transition-all rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 shadow-2xs">
                                    <img
                                      src={c.photo_url || '/assets/avatar.svg'}
                                      alt={`${c.first_name} ${c.last_name}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.currentTarget;
                                        if (!target.src.endsWith('/assets/avatar.svg')) {
                                          target.src = '/assets/avatar.svg';
                                        }
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-black text-slate-900">{c.first_name} {c.last_name}</p>
                                      {c.age_category && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 uppercase">
                                          {c.age_category}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      <strong className="text-slate-700">{POSITION_LABELS[c.primary_position] || c.primary_position}</strong>
                                      {' '}• {c.current_club || 'Sans club'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                  {/* Mini-Scorecard Pro 4 Piliers + Potentiel avec survol Radar & Barres de progression */}
                                  <CandidatePillarsScorecard
                                    candidate={c}
                                    latestEval={latestEval}
                                    techScore={techScore}
                                    tactScore={tactScore}
                                    physScore={physScore}
                                    mentScore={mentScore}
                                    potentialScore={potentialScore}
                                    onOpenDetail={onOpenCandidateDetail ? () => onOpenCandidateDetail(c) : undefined}
                                  />

                                  {/* Bouton Rapport avec rond jaune et chiffre en noir (0 par défaut) */}
                                  {onOpenCandidateDetail && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenCandidateDetail(c, 'report')}
                                      className="px-3.5 py-1.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer shrink-0"
                                      title={`Consulter les rapports du joueur (${candEvalsList.length} rapport${candEvalsList.length !== 1 ? 's' : ''})`}
                                    >
                                      <span className="font-bold text-xs text-white">Rapport</span>
                                      <span className="w-5 h-5 min-w-[20px] rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black shrink-0 leading-none shadow-2xs">
                                        {candEvalsList.length}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {/* CONTENU ONGLET 2 : SHORTLISTS (SHADOW LISTS) */}
                  {activeSectionTab === 'shortlists' && (
                    <div className="space-y-2.5">
                      {scoutSavedShortlists.length === 0 ? (
                        <div className="py-10 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 space-y-2">
                          <Trophy className="w-8 h-8 text-amber-400 mx-auto opacity-70" />
                          <p className="text-xs font-bold text-slate-700">Aucune Shadow List enregistrée pour ce scout</p>
                          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                            Les compositions tactiques et Shadow Lists créées par ce scout s'afficheront ici.
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1.5">
                          {scoutSavedShortlists.map((sl) => {
                            const order = sl.custom_slot_order || {};
                            const configuredSlotCount = Object.keys(order).filter(k => Array.isArray(order[k]) && order[k].length > 0).length;

                            return (
                              <div
                                key={sl.id}
                                className="p-3.5 bg-slate-50/85 hover:bg-white transition-all rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
                                    <Trophy className="w-5 h-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h5 className="text-xs font-black text-slate-900 truncate">
                                        {sl.title}
                                      </h5>
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        {sl.formation_key || '4-3-3'}
                                      </span>
                                      {sl.category_filter && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                          {sl.category_filter}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                      <span>{configuredSlotCount} poste{configuredSlotCount > 1 ? 's' : ''} configuré{configuredSlotCount > 1 ? 's' : ''}</span>
                                      <span>•</span>
                                      <span>Enregistrée le {new Date(sl.created_at).toLocaleDateString('fr-FR')}</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/recruitment-v2?tab=shortlist&shortlistId=${sl.id}`)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer group"
                                    title="Basculer vers la page Shadow list avec cette composition"
                                  >
                                    <span>Voir le détail</span>
                                    <ExternalLink className="w-3.5 h-3.5 text-primary group-hover:translate-x-0.5 transition-transform" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditShortlist(sl)}
                                    className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Modifier l'intitulé et la description"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteShortlist(sl)}
                                    className="p-1.5 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors cursor-pointer"
                                    title="Supprimer cette shortlist"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="lg:col-span-8 bg-white rounded-3xl p-12 border shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Users className="w-8 h-8" />
                </div>
                <div className="max-w-md space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">Aucun recruteur de terrain sélectionné</h3>
                  <p className="text-xs text-slate-500">
                    {isAdmin
                      ? "Ajoutez des scouts pour suivre leurs détections de terrain, leurs rapports d'observation et leur vivier de candidats."
                      : "Votre profil de scout n'a pas encore été configuré."}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow hover:bg-primary/90 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un scout
                  </button>
                )}
              </div>
            )}
        </div>

      {/* Formulaire Ajout / Édition Scout (US-DASH-34) */}
      {isModalOpen && (
        <div className="bg-white rounded-2xl shadow-sm border flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-6 border-b flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-xs",
                modalStep === 2 ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"
              )}>
                {modalStep === 2 ? <KeyRound className="w-5 h-5 text-emerald-600" /> : <User className="w-5 h-5 text-primary" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {editingScout
                    ? 'Modifier la Fiche Scout'
                    : modalStep === 2
                      ? (createdCredentials?.roleTitle === 'Scout Admin'
                        ? 'Étape 2 — Identifiants Scout Admin & Envoi WhatsApp'
                        : 'Étape 2 — Génération des Identifiants & Envoi WhatsApp')
                      : (roleTitle === 'Scout Admin'
                        ? '👑 Nouveau Scout Admin — Étape 1 : Informations'
                        : 'Nouveau Scout — Étape 1 : Informations')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {modalStep === 2
                    ? (createdCredentials?.roleTitle === 'Scout Admin'
                      ? 'Transmettez le lien, le login et le mot de passe temporaire au Scout Admin.'
                      : 'Transmettez le lien, le login et le mot de passe temporaire au Scout.')
                    : (roleTitle === 'Scout Admin'
                      ? 'Configuration du compte de Direction de la cellule détection par le Super Admin.'
                      : 'Renseignez les coordonnées, la zone de prospection et les catégories déléguées.')}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsModalOpen(false);
                setModalStep(1);
                setCreatedCredentials(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm cursor-pointer"
            >
              <X className="w-4 h-4" /> {modalStep === 2 ? 'Fermer' : 'Annuler'}
            </button>
          </div>

          {modalStep === 2 && createdCredentials ? (
            /* ── ÉTAPE 2 : IDENTIFIANTS GÉNÉRÉS & ENVOI WHATSAPP ── */
            <div className="p-6 md:p-8 space-y-6 max-w-2xl mx-auto w-full animate-in fade-in zoom-in-98 duration-200">
              <div className="text-center space-y-2">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-md",
                  createdCredentials.roleTitle === 'Scout Admin'
                    ? "bg-purple-100 text-purple-700"
                    : "bg-emerald-100 text-emerald-600"
                )}>
                  {createdCredentials.roleTitle === 'Scout Admin'
                    ? <ShieldCheck className="w-8 h-8" />
                    : <CheckCircle2 className="w-8 h-8" />}
                </div>
                <span className={cn(
                  "text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full border inline-block shadow-2xs",
                  createdCredentials.roleTitle === 'Scout Admin'
                    ? "bg-purple-50 text-purple-800 border-purple-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}>
                  {createdCredentials.roleTitle === 'Scout Admin'
                    ? '👑 Étape 2 / 2 — Identifiants Scout Admin Prêts'
                    : 'Étape 2 / 2 — Identifiants Prêts'}
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  {createdCredentials.roleTitle === 'Scout Admin'
                    ? 'Compte Scout Admin Créé avec Succès'
                    : 'Fiche & Compte Scout Créés'}
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Le profil de <strong>{createdCredentials.fullName}</strong> est actif dans la cellule{createdCredentials.roleTitle === 'Scout Admin' ? ' avec les privilèges de Direction (Scout Admin)' : ''}.
                  Voici ses accès sécurisés à lui transmettre.
                </p>
              </div>

              {/* Bloc Identifiants */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-xs font-bold text-slate-700">
                  <KeyRound className="w-4 h-4 text-primary" />
                  <span>Identifiants de Connexion Générés</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Login */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Identifiant (Login)
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-slate-900 truncate" title={createdCredentials.login}>
                        {createdCredentials.login}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(createdCredentials.login);
                          setCopiedField('login');
                          toast.success("Login copié dans le presse-papier !");
                          setTimeout(() => setCopiedField(null), 2000);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Copier le login"
                      >
                        {copiedField === 'login' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Mot de passe temporaire */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Mot de passe temporaire
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-primary">
                        {showTempPassword ? createdCredentials.tempPassword : '••••••••••••'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowTempPassword(!showTempPassword)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title={showTempPassword ? "Masquer" : "Afficher"}
                        >
                          {showTempPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(createdCredentials.tempPassword);
                            setCopiedField('pwd');
                            toast.success("Mot de passe temporaire copié !");
                            setTimeout(() => setCopiedField(null), 2000);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Copier le mot de passe"
                        >
                          {copiedField === 'pwd' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sécurité et hachage en base */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-900 text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-[11px]">Mot de passe haché & Sécurité de première connexion</p>
                    <p className="text-[11px] text-amber-800/90 leading-relaxed">
                      Ce mot de passe temporaire est chiffré (haché) en base de données. Dès sa première connexion, le {createdCredentials.roleTitle === 'Scout Admin' ? 'Scout Admin' : 'Scout'} sera <strong>automatiquement redirigé</strong> vers la page de création d'un nouveau mot de passe personnel avant tout accès à l'application.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bloc WhatsApp Officiel */}
              <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-xs">
                      <MessageCircle className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Envoi Immédiat via WhatsApp</h4>
                      <p className="text-[11px] text-slate-600">Transmettez le lien de l'app, le login et le mot de passe en 1 clic.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Numéro WhatsApp du destinataire :
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={whatsAppPhoneNumber}
                      onChange={(e) => setWhatsAppPhoneNumber(e.target.value)}
                      placeholder="+212 600-000000"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/40"
                    />
                    <a
                      href={getWhatsAppUrl(whatsAppPhoneNumber || createdCredentials.phone, getWhatsAppMessage(createdCredentials.fullName, createdCredentials.login, createdCredentials.tempPassword, createdCredentials.roleTitle))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 fill-current" />
                      <span>Envoyer WhatsApp</span>
                    </a>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#25D366]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500">Message complet pré-rempli prêt pour transmission.</span>
                  <button
                    type="button"
                    onClick={() => {
                      const msg = getWhatsAppMessage(createdCredentials.fullName, createdCredentials.login, createdCredentials.tempPassword, createdCredentials.roleTitle);
                      navigator.clipboard.writeText(msg);
                      setCopiedField('all');
                      toast.success("Texte d'invitation copié !");
                      setTimeout(() => setCopiedField(null), 2000);
                    }}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 cursor-pointer underline"
                  >
                    {copiedField === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copier tout le message</span>
                  </button>
                </div>
              </div>

              {/* Bouton de Fermeture / Fin */}
              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalStep(1);
                    setCreatedCredentials(null);
                  }}
                  className="px-7 py-3 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider hover:bg-primary/90 shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Terminer</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="flex-1">
              <div className="p-6 space-y-6 max-w-4xl mx-auto w-full">
                {/* Bandeau d'information pour la création/modification d'un Scout Admin par le Super Admin */}
                {roleTitle === 'Scout Admin' && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-200 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <ShieldCheck className="w-5 h-5 text-purple-100" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                          <span>Compte Direction — Scout Admin</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                            Supervision Globale
                          </span>
                        </h4>
                        <p className="text-[11px] text-purple-900/80">
                          Ce compte disposera des privilèges de Direction de la cellule détection (gestion des observateurs, validation de missions, shortlists et attribution des catégories).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Photo de Profil du Scout */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 rounded-2xl border-2 border-slate-300 bg-white overflow-hidden shadow-xs flex items-center justify-center">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt="Photo scout"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <User className="w-7 h-7 text-slate-300" />
                      )}
                    </div>
                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-600 transition-colors"
                        title="Supprimer la photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-primary" />
                          Photo de Profil du Scout
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                          Formats JPG, PNG, WebP (max 10 Mo).
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setMediaPickerOpen(true)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 bg-slate-50 hover:bg-primary/10 border border-slate-200 hover:border-primary/40 text-slate-800 shadow-xs"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-primary" />
                          <span>Médiathèque</span>
                        </button>

                        <label className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs shrink-0",
                          isUploadingPhoto
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                            : "bg-primary text-white hover:bg-primary/95 hover:scale-[1.02] active:scale-98 shadow-primary/20"
                        )}>
                          {isUploadingPhoto ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Chargement...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>{photoUrl ? 'Changer' : 'Téléverser'}</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                            disabled={isUploadingPhoto}
                            onChange={handleScoutPhotoUpload}
                            className="hidden"
                          />
                        </label>

                        {photoUrl && (
                          <button
                            type="button"
                            onClick={() => setPhotoUrl('')}
                            className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all border border-slate-200"
                            title="Supprimer la photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      type="url"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="Ou collez un lien URL de photo..."
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] bg-white outline-none focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nom Complet *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Hassan Benabicha"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Rôle / Niveau RBAC *</label>
                    <select
                      required
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white shadow-2xs"
                    >
                      {isSuperAdmin ? (
                        <>
                          <option value="Scout Admin">Scout Admin (Admin)</option>
                          <option value="Scout Manager">Scout Manager (Manager)</option>
                          <option value="Scout Éditeur">Scout Éditeur (Éditeur)</option>
                          <option value="Scout User">Scout User (User / Viewer)</option>
                        </>
                      ) : editingScout ? (
                        <>
                          {editingScout.role_title === 'Scout Manager' && (
                            <option value="Scout Manager">Scout Manager (Manager)</option>
                          )}
                          <option value="Scout Éditeur">Scout Éditeur (Éditeur)</option>
                          <option value="Scout User">Scout User (User / Viewer)</option>
                        </>
                      ) : (
                        <>
                          <option value="Scout Éditeur">Scout Éditeur (Éditeur)</option>
                          <option value="Scout User">Scout User (User / Viewer)</option>
                        </>
                      )}
                      {!['Scout Manager', 'Scout Éditeur', 'Scout User', 'Scout Admin'].includes(roleTitle) && roleTitle && (
                        <option value={roleTitle}>{roleTitle}</option>
                      )}
                    </select>
                    {!isSuperAdmin && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {editingScout ? "Gestion déléguée par le Scout Admin." : "Seul le Super Admin peut créer un Scout Manager ou Scout Admin."}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+212 6 XX XX XX XX"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="scout@fus.ma"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Section Mot de Passe & Génération Automatique par l'Admin (US-DASH-34.1) */}
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-800 dark:text-white block">
                          {editingScout ? "Modifier / Réinitialiser le mot de passe du Scout" : "Mot de passe d'accès du Scout"}
                        </label>
                        <span className="text-[11px] text-muted-foreground">
                          {editingScout
                            ? "Laissez vide pour conserver le mot de passe actuel, ou générez un nouveau mot de passe."
                            : "Mot de passe temporaire initial qui sera transmis au scout via WhatsApp."}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const generated = generateSecureTempPassword();
                        setAdminCustomPassword(generated);
                        setShowAdminPassword(true);
                        toast.success("Nouveau mot de passe temporaire généré !", { icon: '⚡' });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>⚡ Générer mot de passe</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showAdminPassword ? "text" : "password"}
                      value={adminCustomPassword}
                      onChange={(e) => setAdminCustomPassword(e.target.value)}
                      placeholder={editingScout ? "Laissez vide pour conserver l'actuel, ou cliquez sur Générer" : "Mot de passe temporaire"}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs font-mono font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 pr-20"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {adminCustomPassword && (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                            className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                            title={showAdminPassword ? "Masquer" : "Afficher"}
                          >
                            {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(adminCustomPassword);
                              toast.success("Mot de passe copié !");
                            }}
                            className="p-1 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                            title="Copier le mot de passe"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {adminCustomPassword && (
                    <div className="flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {editingScout
                          ? "Un nouveau mot de passe a été défini. À l'enregistrement, vous pourrez l'envoyer au scout via WhatsApp."
                          : "Le mot de passe sera automatiquement haché en base de données avant enregistrement."}
                      </span>
                    </div>
                  )}
                </div>

                {/* Région de Détection via Carte Interactive (LocationPicker) */}
                <div className="space-y-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> Zone & Région de Détection *
                    </label>
                    <span className="text-[11px] font-bold text-primary truncate max-w-[200px]">
                      {region || 'Non sélectionnée'}
                    </span>
                  </div>

                  <LocationPicker
                    continent={scoutContinent}
                    setContinent={setScoutContinent}
                    country={scoutCountry}
                    setCountry={setScoutCountry}
                    city={scoutCity}
                    setCity={setScoutCity}
                    customCity={scoutCustomRegion}
                    setCustomCity={setScoutCustomRegion}
                    locationString={region}
                    setLocationString={setRegion}
                  />
                </div>

                {/* Catégories Assignées : Cases à cocher */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      Catégories Assignées (Cases à cocher) *
                      {(!isSuperAdmin && !isAdmin) && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-normal flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Réservé Direction
                        </span>
                      )}
                    </label>
                    {(isSuperAdmin || isAdmin) && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAssignedCategories([...allowedCategories])}
                          className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                        >
                          {isSuperAdmin ? "Tout cocher" : "Cocher allouées"}
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => setAssignedCategories([])}
                          className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                        >
                          Tout décocher
                        </button>
                        <span className="text-[10px] text-muted-foreground font-medium ml-1">
                          ({assignedCategories.filter(c => allowedCategories.includes(c)).length}/{allowedCategories.length})
                        </span>
                      </div>
                    )}
                  </div>

                  {!isSuperAdmin && (
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-medium">
                      <Lock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>
                        <strong>Délégation en cascade :</strong> Vous ne pouvez attribuer aux Scout Managers que les catégories allouées à votre compte Scout Admin par le Super Admin ({allowedCategories.join(', ')}).
                      </span>
                    </div>
                  )}

                  {(() => {
                    const groups = groupCategoriesByPole(RECRUITMENT_AGE_CATEGORIES);
                    const poleSections = [
                      { title: '⚽ Pôle Labellisé (École de Football : U9 à U12)', list: groups.labellise, badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                      { title: '🎓 Pôle Formation (Académie & Élite : U13 à U21)', list: groups.formation, badgeClass: 'text-blue-700 bg-blue-50 border-blue-200' },
                      { title: '🏆 Pôle Senior (Équipe Première & Espoirs : U23, Senior)', list: groups.senior, badgeClass: 'text-purple-700 bg-purple-50 border-purple-200' },
                    ];

                    return (
                      <div className="space-y-3">
                        {poleSections.map(pole => (
                          <div key={pole.title} className="space-y-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                            <div className="flex items-center justify-between">
                              <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-md border", pole.badgeClass)}>
                                {pole.title}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5 pt-1">
                              {pole.list.map(cat => {
                                const isAllowed = isSuperAdmin || allowedCategories.includes(cat);
                                const isChecked = assignedCategories.includes(cat) && isAllowed;
                                const canEdit = (isSuperAdmin || isAdmin) && isAllowed;

                                return (
                                  <button
                                    key={cat}
                                    type="button"
                                    disabled={!canEdit}
                                    title={!isAllowed ? "Catégorie non allouée au Scout Admin par le Super Admin" : undefined}
                                    onClick={() => canEdit && toggleCategory(cat)}
                                    className={cn(
                                      "px-2 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5",
                                      !isAllowed
                                        ? "opacity-35 cursor-not-allowed bg-slate-100 text-slate-400 border-dashed border-slate-300"
                                        : !canEdit
                                          ? "opacity-70 cursor-not-allowed"
                                          : "cursor-pointer",
                                      isChecked
                                        ? "bg-primary text-white border-primary shadow-xs font-black"
                                        : isAllowed
                                          ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                          : ""
                                    )}
                                  >
                                    {isAllowed ? (
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => { }}
                                        className="w-3 h-3 rounded text-primary focus:ring-0 pointer-events-none"
                                      />
                                    ) : (
                                      <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    )}
                                    <span className={cn(!isAllowed && "line-through")}>{cat}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Notes du Recruteur</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Réseau relationnel, diplômes d'entraîneur..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Statut du Scout */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Statut d'activité</span>
                    <span className="text-[10px] text-muted-foreground">Détermine si le scout est actuellement actif dans la cellule</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setStatus('active')}
                      className={cn(
                        "px-3 py-1 text-xs font-bold rounded-md transition-all",
                        status === 'active' ? "bg-emerald-500 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Actif
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('inactive')}
                      className={cn(
                        "px-3 py-1 text-xs font-bold rounded-md transition-all",
                        status === 'inactive' ? "bg-slate-400 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Inactif
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider shadow-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {isSaving
                        ? 'Traitement en cours...'
                        : editingScout
                          ? 'Enregistrer les modifications'
                          : 'Valider & Passer à la génération des identifiants (Étape 2) ➔'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── MODALE D'ASSIGNATION D'UN JOUEUR AU SCOUT ─────────────────────── */}
      {isAssignModalOpen && activeScout && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Assigner un joueur au Scout</h3>
                  <p className="text-xs text-slate-500">
                    Scout référent : <strong className="text-slate-800">{activeScout.full_name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setAssignSearchQuery('');
                }}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Search & Create Action */}
            <div className="p-4 border-b border-slate-100 bg-white space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, club ou poste..."
                  value={assignSearchQuery}
                  onChange={(e) => setAssignSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
                />
              </div>

              {onAddCandidateForScout && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Le joueur n'est pas encore dans la base ?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAssignModalOpen(false);
                      onAddCandidateForScout(activeScout.id);
                    }}
                    className="text-[11px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Créer un nouveau profil</span>
                  </button>
                </div>
              )}
            </div>

            {/* Candidate List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-96 custom-scrollbar">
              {filteredUnassignedCandidates.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground bg-slate-50 rounded-2xl border border-dashed">
                  {unassignedCandidates.length === 0
                    ? "Tous les joueurs de la base sont déjà assignés à ce scout."
                    : "Aucun joueur ne correspond à votre recherche."}
                </div>
              ) : (
                filteredUnassignedCandidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0 overflow-hidden border border-slate-200">
                        {cand.photo_url ? (
                          <img src={cand.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          `${cand.first_name[0] || ''}${cand.last_name[0] || ''}`.toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">
                          {cand.first_name} {cand.last_name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          <strong className="text-slate-700">{cand.primary_position}</strong>
                          {cand.age_category && ` • ${cand.age_category}`}
                          {` • ${cand.current_club || 'Sans club'}`}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isAssigning}
                      onClick={() => handleAssignCandidateToScout(cand.id)}
                      className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Assigner</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setAssignSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION DE SUPPRESSION MULTIPLE (US-DASH-22 / US-DASH-17) */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Supprimer {selectedScoutIds.length} recruteur{selectedScoutIds.length > 1 ? 's' : ''} ?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Cette action est irréversible et supprimera définitivement les profils sélectionnés de la base de données.
                </p>
              </div>
            </div>

            {/* Liste des scouts concernés */}
            <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              {selectedScoutsList.map(s => {
                const cCount = candidates.filter(c => isCandidateForScout(c, s)).length;
                return (
                  <div key={s.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{s.full_name}</span>
                    <span className="text-[10px] text-slate-500">
                      {s.recruitment_region?.includes('|') ? s.recruitment_region.split('|')[0] : s.recruitment_region} • {cCount} joueur{cCount > 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Avertissement de libération des joueurs (US-DASH-17) */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-black text-amber-800 uppercase text-[10px] tracking-wider">
                <span>⚠️ Libération automatique des joueurs (Règle US-DASH-17)</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Tous les joueurs associés à ces scouts ({totalAffectedCandidatesCount} joueur{totalAffectedCandidatesCount > 1 ? 's' : ''}) seront <strong>automatiquement libérés</strong> et leurs missions actives clôturées. Ils réintégreront le vivier disponible et pourront être réassignés.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={handleConfirmBulkDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Suppression en cours...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirmer la suppression ({selectedScoutIds.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modification d'une Shortlist Enregistrée */}
      {shortlistToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl w-full max-w-md space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Modifier la Shortlist</h3>
                  <p className="text-[11px] text-slate-400">Formation {shortlistToEdit.formation_key}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShortlistToEdit(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Intitulé de la Shortlist *
                </label>
                <input
                  type="text"
                  value={editShortlistTitle}
                  onChange={(e) => setEditShortlistTitle(e.target.value)}
                  placeholder="Ex : Shortlist U19 - 4-3-3 Attaque"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50 focus:bg-white font-medium"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Remarques (Optionnel)
                </label>
                <textarea
                  rows={3}
                  value={editShortlistDesc}
                  onChange={(e) => setEditShortlistDesc(e.target.value)}
                  placeholder="Précisions sur cette composition tactique..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50 focus:bg-white font-medium resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShortlistToEdit(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isSavingShortlistEdit || !editShortlistTitle.trim()}
                onClick={handleSaveEditShortlist}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSavingShortlistEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Enregistrer les modifications</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sélecteur de Médias Centralisé */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => setPhotoUrl(url)}
        title="Affecter une photo depuis la Médiathèque"
      />
    </div>
  );
};
export default ScoutManagementView;
