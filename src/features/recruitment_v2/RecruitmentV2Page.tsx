import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Users, Calendar, Swords, Plus, Search, Filter,
  Award, Shield, ChevronRight,
  TrendingUp, Trash2, Edit3, CheckCircle2, Clock, AlertCircle,
  Eye, UserCheck, LayoutList, Kanban, HeartHandshake, Briefcase, User, RotateCcw, X, Lock, MapPin, Trophy,
  Sliders, LayoutGrid, List, ClipboardList, Archive, RefreshCw, FileText, UserPlus, Target, Compass, History, Loader2,
  Play, Video, Bookmark, BookmarkCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '../../context/PermissionsContext';
import { useRecruitment, RECRUITMENT_KEYS } from './hooks/useRecruitment';
import { recruitmentService } from './services/recruitmentService';
import { supabase } from '../../lib/supabase';
import type {
  TrialCandidate,
  CandidateEvaluation,
  PlayerTest,
  Scout,
  ScoutObservation,
  ScoutMission,
  PlayerRecruitmentStatus
} from './types/recruitment';
import {
  RECRUITMENT_AGE_CATEGORIES,
  groupCategoriesByPole,
  PLAYER_RECRUITMENT_STATUS_OPTIONS,
  getAgeCategoryFromBirthDate,
  calculateCandidateAge,
  getPoleFromCategory,
  resolveReportOrCandidateSurclassement
} from './types/recruitment';
import { PLAYER_POSITIONS, normalizeAgeCategory } from '../../constants';
import { getCountryFlag } from '../../constants/geography';

// Subcomponents
import CandidateModal from './components/CandidateModal';
import EvaluationModal from './components/EvaluationModal';
import TrialSessionModal from './components/TrialSessionModal';
import TestCalendarView from './components/TestCalendarView';
import ObservationModal from './components/ObservationModal';
import CandidateDetailModal from './components/CandidateDetailModal';
import RecruitmentPipelineKanban from './components/RecruitmentPipelineKanban';
import ScoutManagementView from './components/ScoutManagementView';
import RadarComparisonView from './components/RadarComparisonView';
import ShortlistPitchView from './components/ShortlistPitchView';
import PlayerRadarChart from './components/PlayerRadarChart';
import RecruitmentResetModal from './components/RecruitmentResetModal';
import ScoutCriteriaManagerModal from './components/ScoutCriteriaManagerModal';
import ScoutReportWizard from './components/ScoutReportWizard';
import MissionsManagementView from './components/MissionsManagementView';
import { ScoutAvatar } from './components/ScoutAvatar';
import { PlayerVideoModal } from './components/PlayerVideoModal';
import { CandidateDriveLinkModal } from './components/CandidateDriveLinkModal';
import { AdministrativeProcedureModal } from './components/AdministrativeProcedureModal';
import { getFrenchPositionLabel } from './constants/scoutCriteriaByPosition';
import { CandidatePillarsScorecard } from './components/CandidatePillarsScorecard';
import { PreferredFootIcon } from './components/PreferredFootIcon';
import { cn } from '../../lib/utils';
const FOOT_OPTIONS = [
  { id: 'ALL', label: 'Tous les pieds' },
  { id: 'Droitier', label: 'Droitier' },
  { id: 'Gaucher', label: 'Gaucher' },
  { id: 'Ambidextre', label: 'Ambidextre' },
];

const VERDICT_OPTIONS = [
  { id: 'ALL', label: 'Tous les verdicts' },
  { id: 'favorable', label: 'Favorable (Signer)' },
  { id: 'a_revoir', label: 'À revoir (Suivi)' },
  { id: 'reserve', label: 'Réservé (Doute)' },
  { id: 'non_retenu', label: 'Non retenu' },
];

// Mots-clés pour la détection de la nationalité Marocaine
const MOROCCAN_KEYWORDS = [
  'maroc', 'marocain', 'marocaine', 'morocco', 'moroccan', 'mar', 'ma'
];

// Mots-clés pour la détection des nationalités du continent Africain (hors exclusivement Maroc)
const AFRICAN_KEYWORDS = [
  'africain', 'africaine', 'african', 'afrique', 'africa',
  // Afrique du Nord
  'algérie', 'algerie', 'algérien', 'algerien', 'algérienne', 'algerienne', 'algeria', 'algerian', 'dza',
  'tunisie', 'tunisien', 'tunisienne', 'tunisia', 'tunisian', 'tun',
  'égypte', 'egypte', 'égyptien', 'egyptien', 'égyptienne', 'egyptienne', 'egypt', 'egyptian', 'egy',
  'libye', 'libyen', 'libyenne', 'libya', 'libyan', 'lby',
  'mauritanie', 'mauritanien', 'mauritanienne', 'mauritania', 'mauritanian', 'mrt',
  'soudan', 'soudanais', 'soudanaise', 'sudan', 'sudanese', 'sdn', 'ssd',
  // Afrique de l'Ouest
  'sénégal', 'senegal', 'sénégalais', 'senegalais', 'sénégalaise', 'senegalaise', 'senegalese', 'sen',
  'mali', 'malien', 'malienne', 'malian', 'mli',
  'côte d\'ivoire', 'cote d\'ivoire', 'ivoirien', 'ivoirienne', 'ivory coast', 'ivorian', 'civ',
  'guinée', 'guinee', 'guinéen', 'guineen', 'guinéenne', 'guineenne', 'guinea', 'guinean', 'gin', 'gnb',
  'cameroun', 'camerounais', 'camerounaise', 'cameroon', 'cameroonian', 'cmr',
  'ghana', 'ghanéen', 'ghaneen', 'ghanéenne', 'ghaneenne', 'ghanaian', 'gha',
  'nigéria', 'nigeria', 'nigérian', 'nigerian', 'nigériane', 'nigeriane', 'nga',
  'niger', 'nigérien', 'nigerien', 'nigérienne', 'nigerienne', 'ner',
  'burkina faso', 'burkina', 'burkinabè', 'burkinabe', 'bfa',
  'togo', 'togolais', 'togolaise', 'togolese', 'tgo',
  'bénin', 'benin', 'béninois', 'beninois', 'béninoise', 'beninoise', 'ben',
  'gambie', 'gambia', 'gambien', 'gambienne', 'gambian', 'gmb',
  'sierra leone', 'sle', 'libéria', 'liberia', 'lbr', 'cap-vert', 'cape verde', 'cpv',
  // Afrique Centrale
  'congo', 'congolais', 'congolaise', 'congolese', 'cog', 'cod', 'rdc', 'dr congo',
  'gabon', 'gabonais', 'gabonaise', 'gabonese', 'gab',
  'tchad', 'chad', 'tcd', 'centrafrique', 'caf', 'guinée équatoriale', 'gnq',
  // Afrique de l'Est
  'éthiopie', 'ethiopie', 'ethiopian', 'eth', 'kenya', 'kenyan', 'ken',
  'ouganda', 'uganda', 'uga', 'rwanda', 'rwandais', 'rwa', 'burundi', 'bdi',
  'tanzanie', 'tanzania', 'tza', 'somalie', 'somalia', 'som', 'djibouti', 'dji', 'érythrée', 'eri',
  // Afrique Australe
  'afrique du sud', 'south africa', 'zaf', 'angola', 'ago', 'zambie', 'zmb',
  'zimbabwe', 'zwe', 'mozambique', 'moz', 'madagascar', 'mdg', 'namibie', 'nam',
  'botswana', 'bwa', 'malawi', 'mwi', 'comores', 'com', 'maurice', 'mus'
];

export type NationalityTag = 'marocains' | 'africains' | 'all' | 'autres';

export function isCandidateMoroccan(c: TrialCandidate): boolean {
  const nat = (c.nationality || '').toLowerCase().trim();
  const country = (c.country || '').toLowerCase().trim();
  const text = `${nat} ${country}`.trim();
  // Par défaut au club FUS, une absence de nationalité explicite équivaut à marocaine
  if (!text) return true;
  return MOROCCAN_KEYWORDS.some(k => text.includes(k));
}

export function isCandidateAfrican(c: TrialCandidate): boolean {
  const nat = (c.nationality || '').toLowerCase().trim();
  const country = (c.country || '').toLowerCase().trim();
  const text = `${nat} ${country}`.trim();
  if (!text) return false;
  return AFRICAN_KEYWORDS.some(k => text.includes(k));
}

export function matchesCandidateNationality(c: TrialCandidate, filter: NationalityTag): boolean {
  if (filter === 'all') return true;
  const isMoroccan = isCandidateMoroccan(c);
  const isAfrican = isCandidateAfrican(c);

  if (filter === 'marocains') {
    return isMoroccan;
  }
  if (filter === 'africains') {
    // Joueurs africains hors profil exclusivement marocain (ou binationaux avec nation africaine)
    const nat = (c.nationality || '').toLowerCase().trim();
    const country = (c.country || '').toLowerCase().trim();
    const text = `${nat} ${country}`.trim();
    const hasExplicitAfrican = text.includes('afric') || AFRICAN_KEYWORDS.some(k => !MOROCCAN_KEYWORDS.includes(k) && text.includes(k));
    return hasExplicitAfrican || (!isMoroccan && isAfrican);
  }
  if (filter === 'autres') {
    return !isMoroccan && !isAfrican;
  }
  return true;
}

export const RecruitmentV2Page: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { authState, hasSubModuleAccess, canManageCategory } = usePermissions();
  const currentUserId = authState?.user?.id;
  const [searchParams, setSearchParams] = useSearchParams();
  const userRole = authState?.user?.system_role?.toLowerCase() || '';
  const userRoles = (authState?.roles ?? []).map(r => r.toLowerCase());
  const isSuperAdmin = Boolean(
    (!authState?.isImpersonating || authState?.impersonatedUser?.system_role?.toLowerCase() === 'super_admin') && (
      userRoles.includes('super_admin') ||
      userRole === 'super_admin'
    )
  );
  // Rôle scout_admin (reste soumis à la matrice explicite de permissions sauf Super Admin)
  const isScoutAdmin = Boolean(
    userRoles.includes('scout_admin') ||
    userRole === 'scout_admin'
  );
  // Seul le Super Admin a les pleins pouvoirs sans passer par les cases cochées
  const isAdmin = isSuperAdmin;

  // US-DASH: Scout Manager (responsable opérationnel de scouts, mais non administrateur de direction)
  const isScoutManager = Boolean(
    !isSuperAdmin && !isScoutAdmin && (
      userRoles.includes('scout_manager') ||
      userRoles.includes('manager') ||
      userRole === 'scout_manager' ||
      userRole === 'manager' ||
      (authState?.user?.job_title && authState.user.job_title.toLowerCase().includes('scout manager'))
    )
  );

  // Admin du recrutement effectif (Super Admin uniquement par défaut, ou Scout Admin avec accès Scouts explicite)
  const isRecruitmentAdmin = Boolean(
    isSuperAdmin ||
    (isScoutAdmin && !isScoutManager && hasSubModuleAccess('scouts', 'read', 'recruitment_v2'))
  );

  // Assigner des missions : dépend strictement d'être Super Admin ou d'avoir la permission cochée
  const canAssignMissions = Boolean(
    isSuperAdmin ||
    hasSubModuleAccess('candidates', 'assign_mission')
  );

  // Permission de traitement du recrutement immédiat : strictement contrôlée par case cochée (sauf Super Admin)
  const canProcessRecruitNow = Boolean(
    !isScoutManager && (
      isSuperAdmin ||
      hasSubModuleAccess('candidates', 'recruit_now')
    )
  );

  const isOnlyRecruitNowUser = Boolean(
    !isSuperAdmin &&
    !isScoutAdmin &&
    hasSubModuleAccess('candidates', 'recruit_now')
  );

  // US-DASH-60: Permission spécifique de gestion des rapports d'observation
  const canManageReports = Boolean(
    isSuperAdmin ||
    hasSubModuleAccess('candidates', 'manage_reports') ||
    hasSubModuleAccess('candidates', 'reports')
  );

  // Vérification granulaire des accès aux sous-rubriques Détection V2 (strict : uniquement ce qui est coché)
  const canAccessTab = React.useCallback((tabKey: string): boolean => {
    if (isSuperAdmin) return true;
    return hasSubModuleAccess(tabKey, 'read', 'recruitment_v2');
  }, [isSuperAdmin, hasSubModuleAccess]);

  const availableV2Tabs = useMemo(() => {
    const list: string[] = [];
    if (canAccessTab('scouts')) list.push('scouts');
    if (canAccessTab('candidates')) list.push('candidates');
    if (canAccessTab('missions')) list.push('missions');
    if (canAccessTab('shortlist')) list.push('shortlist');
    if (canAccessTab('sessions')) list.push('sessions');
    if (canAccessTab('compare')) list.push('compare');
    if (canAccessTab('archives')) list.push('archives');
    return list;
  }, [canAccessTab]);

  const firstAvailableTab = availableV2Tabs[0] || '';
  const rawTab = searchParams.get('tab');

  // L'onglet actif ne s'affiche que s'il est autorisé dans les permissions de l'utilisateur
  const activeTab = useMemo(() => {
    if (rawTab && availableV2Tabs.includes(rawTab)) {
      return rawTab;
    }
    return firstAvailableTab;
  }, [rawTab, availableV2Tabs, firstAvailableTab]);

  React.useEffect(() => {
    if (rawTab && !availableV2Tabs.includes(rawTab) && availableV2Tabs.length > 0) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', firstAvailableTab);
      setSearchParams(nextParams, { replace: true });
    }
  }, [rawTab, availableV2Tabs, firstAvailableTab, searchParams, setSearchParams]);

  const {
    scouts,
    isLoadingScouts,
    candidates,
    isLoadingCandidates,
    tests,
    isLoadingTests,
    evaluations,
    isLoadingEvaluations,
    observations,
    timeline,
    createScout,
    updateScout,
    deleteScout,
    deleteScouts,
    createCandidate,
    updateCandidate,
    updatePipelineStage,
    deleteCandidate,
    deleteCandidates,
    archiveCandidates,
    createTest,
    createTestsBatch,
    updateTest,
    deleteTest,
    deleteTests,
    saveEvaluation,
    deleteEvaluation,
    deleteEvaluations,
    createObservation,
    resetRecruitmentData,
    acknowledgeMission
  } = useRecruitment();

  // Détermination de la décision du candidat via son DERNIER RAPPORT d'évaluation
  const getCandidateLatestEvaluation = React.useCallback((c: TrialCandidate): CandidateEvaluation | undefined => {
    if (!c?.id) return undefined;
    const candEvals = [
      ...evaluations.filter(e => e.candidate_id === c.id),
      ...(c.evaluations || [])
    ].filter((e, idx, arr) => arr.findIndex(x => x.id === e.id) === idx);

    if (candEvals.length === 0) return undefined;

    return candEvals.slice().sort((a, b) => {
      const dateA = new Date(a.evaluation_date || a.created_at || 0).getTime();
      const dateB = new Date(b.evaluation_date || b.created_at || 0).getTime();
      return dateB - dateA;
    })[0];
  }, [evaluations]);

  const getCandidateLatestDecision = React.useCallback((c: TrialCandidate): 'recruit_now' | 'invitation_test' | 'to_follow' | null => {
    // Si explicitement validé recrutement immédiat ou statut recruit_now / selected
    if (
      (c as any).is_recruit_now_validated ||
      c.scout_state_decision === 'recruit_now' ||
      c.scout_state_decision === 'recruit_standby' ||
      (c as any).status === 'recruit_now' ||
      (c as any).status === 'selected' ||
      (c as any).pipeline_stage === 'recruit_now'
    ) {
      return 'recruit_now';
    }
    const latestEval = getCandidateLatestEvaluation(c);
    if (!latestEval) {
      if (c.scout_state_decision === 'recruit_standby') return 'recruit_now';
      return (c.scout_state_decision as any) || null;
    }
    const dec = (latestEval as any).scout_state_decision || latestEval.report_data?.scout_state_decision;
    if (dec === 'recruit_now' || dec === 'recruit_standby' || c.scout_state_decision === 'recruit_standby') {
      return 'recruit_now';
    }
    if (dec === 'invitation_test' || dec === 'to_follow') {
      return dec;
    }
    if (latestEval.verdict === 'sign' || latestEval.verdict === 'sign_immediately') return 'recruit_now';
    if (latestEval.verdict === 'trial') return 'invitation_test';
    if (latestEval.verdict === 'follow') return 'to_follow';
    return (c.scout_state_decision as any) || null;
  }, [getCandidateLatestEvaluation]);

  // Helper pour vérifier si un candidat est en recrutement immédiat
  const isCandidateRecruitNow = React.useCallback((c: TrialCandidate): boolean => {
    if ((c as any).is_recruit_now_validated) return true;
    const latestDec = getCandidateLatestDecision(c);
    if (latestDec === 'recruit_now') return true;
    return (
      c.scout_state_decision === 'recruit_now' ||
      c.scout_state_decision === 'recruit_standby' ||
      (c as any).status === 'recruit_now' ||
      (c as any).status === 'selected' ||
      (c as any).pipeline_stage === 'recruit_now'
    );
  }, [getCandidateLatestDecision]);

  // Helper de compatibilité : aucun candidat en stand-by (remplacé par recrutement immédiat)
  const isCandidateRecruitStandby = React.useCallback((_c: TrialCandidate): boolean => {
    return false;
  }, []);

  // Helper US-DASH-120 : Catégorie d'âge réelle calculée systématiquement via la date de naissance
  const getCandidateEffectiveCategory = React.useCallback((c: TrialCandidate): string => {
    if (c.birth_date) {
      return getAgeCategoryFromBirthDate(c.birth_date, c.age_category || 'U19');
    }
    return normalizeAgeCategory(c.age_category || 'U19');
  }, []);

  const todayStr = new Date().toLocaleDateString('en-CA');

  // Modals state
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<TrialCandidate | null>(null);

  // État de sélection multiple pour la rubrique Database
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkArchiveModalOpen, setIsBulkArchiveModalOpen] = useState(false);
  const [isDeletingCandidate, setIsDeletingCandidate] = useState(false);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  // Réinitialiser les modals et fermer le dossier lors du basculement d'onglet via la sidebar
  useEffect(() => {
    setIsCandidateModalOpen(false);
    setEditingCandidate(null);
    setDetailCandidate(null);
    setSelectedCandidateIds([]);
    setIsBulkDeleteModalOpen(false);
    setIsBulkArchiveModalOpen(false);
    setIsDeletingCandidate(false);
  }, [activeTab]);
  const [selectedScoutForCandidate, setSelectedScoutForCandidate] = useState<string | undefined>(undefined);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [evaluatingCandidate, setEvaluatingCandidate] = useState<TrialCandidate | null>(null);
  const [evaluationInitialMode, setEvaluationInitialMode] = useState<'create' | 'reevaluate' | 'edit'>('create');
  const [evaluationInitialTestId, setEvaluationInitialTestId] = useState<string | undefined>(undefined);
  const [isObservationModalOpen, setIsObservationModalOpen] = useState(false);
  const [observingCandidate, setObservingCandidate] = useState<TrialCandidate | null>(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<PlayerTest | null>(null);
  const [schedulingCandidate, setSchedulingCandidate] = useState<TrialCandidate | null>(null);
  const [newTestDefaultDate, setNewTestDefaultDate] = useState<string | undefined>(undefined);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailCandidate, setDetailCandidate] = useState<TrialCandidate | null>(null);
  const [selectedRadarTestId, setSelectedRadarTestId] = useState<string>('latest');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isCriteriaManagerOpen, setIsCriteriaManagerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [playerToWatchVideo, setPlayerToWatchVideo] = useState<TrialCandidate | null>(null);
  const [candidateForDriveLink, setCandidateForDriveLink] = useState<TrialCandidate | null>(null);
  const [candidateForAdminProcedure, setCandidateForAdminProcedure] = useState<TrialCandidate | null>(null);

  const handleOpenAdminProcedure = (candidate: TrialCandidate) => {
    if (!canProcessRecruitNow) {
      toast.error("Accès restreint : Seule la Direction Administrative ou les profils habilités peuvent traiter cette procédure.");
      return;
    }
    setCandidateForAdminProcedure(candidate);
  };

  // Résolution unifiée du potentiel du joueur :
  // Règle métier : 0 rapport d'évaluation = potentiel strictement à 0.0
  const resolveCandidatePotentialScore = (
    c: TrialCandidate,
    latestEval?: CandidateEvaluation,
    reportsCount?: number
  ): number => {
    if (!latestEval || reportsCount === 0) return 0;
    const rawPot = latestEval.potential_rating != null && !isNaN(Number(latestEval.potential_rating))
      ? Number(latestEval.potential_rating)
      : (c.potential_rating != null && !isNaN(Number(c.potential_rating)) ? Number(c.potential_rating) : 0);
    return Math.round(rawPot * 10) / 10;
  };

  // Badge unifié de surclassement :
  // - Si le joueur a 0 rapport (candReportsCount === 0), aucun surclassement n'est affiché
  // - Sinon affiche la catégorie exacte du dernier rapport lorsque le joueur est surclassé
  const renderCandidateSurclassementBadge = (
    c: TrialCandidate,
    latestEval: CandidateEvaluation | undefined,
    candReportsCount: number,
    roundedClass: 'rounded-md' | 'rounded-full' = 'rounded-md'
  ) => {
    const surclassInfo = resolveReportOrCandidateSurclassement({
      candidate: { ...c, age_category: getCandidateEffectiveCategory(c) },
      evaluation: latestEval,
      totalReportsCount: candReportsCount,
    });
    if (!surclassInfo.isUpgraded) return null;
    return (
      <span
        className={cn("inline-flex items-center px-1.5 py-0.5 text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200", roundedClass)}
        title={
          surclassInfo.targetCategory
            ? `Surclassé : rapport effectué en ${surclassInfo.targetCategory} (catégorie principale : ${surclassInfo.baseCategory})`
            : 'Joueur surclassé'
        }
      >
        Surclassé {surclassInfo.shortBadgeText}
      </span>
    );
  };

  // Badge unifié d'âge (sans afficher la catégorie principale)
  const renderCandidateAgeBadge = (
    c: TrialCandidate,
    roundedClass: 'rounded-md' | 'rounded-full' = 'rounded-md'
  ) => {
    const computedAge = calculateCandidateAge(c.birth_date) ?? ((c as any).age != null ? Number((c as any).age) : null);
    if (computedAge === null || isNaN(computedAge)) return null;
    return (
      <span
        className={cn("px-2 py-0.5 text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs", roundedClass)}
        title={c.birth_date ? `Né le ${c.birth_date}` : undefined}
      >
        {computedAge} ans
      </span>
    );
  };

  // Rendu unifié de la cellule/ligne Statut :
  // - Si "Recrutement immédiatement" et habilité -> afficher uniquement le bouton d'action à la place du statut (sans icône)
  // - Sinon -> affichage purement informatif sans liste déroulante ni icône
  const renderCandidateStatusControl = (c: TrialCandidate, fullWidthButton = false) => {
    const candDecision = getCandidateLatestDecision(c);
    const currentStatus: PlayerRecruitmentStatus =
      (isCandidateRecruitNow(c) || candDecision === 'recruit_now' || c.scout_state_decision === 'recruit_now' || c.scout_state_decision === 'recruit_standby') ? 'recruit_now' :
        (candDecision === 'invitation_test' || c.scout_state_decision === 'invitation_test' || c.status === 'in_trial') ? 'invitation_test' :
          'to_follow';

    if (currentStatus === 'recruit_now' && (canProcessRecruitNow || isOnlyRecruitNowUser)) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenAdminProcedure(c);
          }}
          className={cn(
            "h-8 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs inline-flex items-center justify-center shadow-sm shadow-emerald-950/15 cursor-pointer active:scale-95 transition-all whitespace-nowrap",
            fullWidthButton ? "w-full" : ""
          )}
          title="Ouvrir la procédure administrative pour ce recrutement immédiat"
        >
          À recruter immédiatement
        </button>
      );
    }

    const statusLabel =
      currentStatus === 'recruit_now' ? 'Recrutement immédiat' :
        currentStatus === 'invitation_test' ? 'Inviter à un test' :
          'À suivre';

    const statusBadgeClass =
      currentStatus === 'recruit_now'
        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
        : currentStatus === 'invitation_test'
          ? "bg-blue-50 text-blue-800 border-blue-200"
          : "bg-indigo-50 text-indigo-800 border-indigo-200";

    return (
      <span className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-xl border text-[11px] font-black uppercase tracking-wider select-none whitespace-nowrap",
        statusBadgeClass
      )}>
        {statusLabel}
      </span>
    );
  };
  // Scout Report Wizard state
  const [isReportWizardOpen, setIsReportWizardOpen] = useState(false);
  const [reportWizardCandidate, setReportWizardCandidate] = useState<TrialCandidate | null>(null);
  const [createdPromptCandidate, setCreatedPromptCandidate] = useState<{ id: string; name: string } | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<TrialCandidate | null>(null);
  const [candidateToAssign, setCandidateToAssign] = useState<TrialCandidate | null>(null);
  const [selectedScoutIdForAssign, setSelectedScoutIdForAssign] = useState<string>('');
  const [assignMissionTitle, setAssignMissionTitle] = useState<string>('Observation en match officiel');
  const [assignMissionCustomTitle, setAssignMissionCustomTitle] = useState<string>('');
  const [assignMissionDescription, setAssignMissionDescription] = useState<string>('');
  const [assignMissionPriority, setAssignMissionPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [assignMissionDueDate, setAssignMissionDueDate] = useState<string>('');
  const [isAssigningScout, setIsAssigningScout] = useState(false);

  const openAssignModal = (c: TrialCandidate) => {
    // US-DASH-31: Interdiction stricte aux Scout Managers et rôles opérationnels
    if (!canAssignMissions) {
      toast.error("L'assignation des joueurs et des missions est strictement réservée à la Direction (Scout Admin et Super Admin).");
      return;
    }
    setCandidateToAssign(c);
    setSelectedScoutIdForAssign(c.assigned_scout_id || c.active_mission?.assigned_to_id || '');
    setAssignMissionTitle(c.active_mission?.mission_title || 'Observation en match officiel');
    setAssignMissionCustomTitle('');
    setAssignMissionDescription(c.active_mission?.mission_description || '');
    setAssignMissionPriority(c.active_mission?.priority || 'medium');
    setAssignMissionDueDate(c.active_mission?.due_date || '');
  };

  const handleAssignMission = async (
    candidateId: string,
    missionData: {
      scoutId: string;
      missionTitle: string;
      missionDescription: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      dueDate?: string;
    },
    candidateObj?: TrialCandidate
  ) => {
    if (!canAssignMissions) {
      toast.error("Action non autorisée : seuls le Super Admin et les Scout Admins peuvent assigner des missions.");
      return;
    }
    let targetCandidate = candidateObj || candidates.find(c => c.id === candidateId);
    if (!targetCandidate) {
      try {
        const { data: dbCand } = await supabase
          .from('trial_candidates')
          .select('*')
          .eq('id', candidateId)
          .single();
        if (dbCand) {
          targetCandidate = recruitmentService.transformCandidateFromDB(dbCand);
        }
      } catch { }
    }
    if (!targetCandidate) {
      toast.error("Joueur introuvable pour l'assignation.");
      return;
    }
    const targetScout = scouts.find(s => s.id === missionData.scoutId);
    const assignerId = currentScout?.id || authState?.user?.id || 'admin';
    const assignerName = currentScout?.full_name || authState?.user?.full_name || 'Direction Scouting FUS';
    const isDirector = Boolean(isAdmin || isSuperAdmin || authState?.user?.system_role === 'scout_admin');

    if (targetScout) {
      const newMission: ScoutMission = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mission-${Date.now()}`,
        candidate_id: targetCandidate.id,
        candidate_name: `${targetCandidate.first_name} ${targetCandidate.last_name}`,
        candidate_photo: targetCandidate.photo_url,
        candidate_position: targetCandidate.primary_position,
        candidate_category: targetCandidate.age_category,
        candidate_club: targetCandidate.origin_club || targetCandidate.current_club,
        assigned_by_id: assignerId,
        assigned_by_name: assignerName,
        assigned_by_avatar: currentScout?.photo_url || authState?.user?.avatar_url,
        assigned_by_role: isSuperAdmin ? 'super_admin' : (isAdmin ? 'scout_admin' : authState?.user?.system_role || 'scout_manager'),
        assigned_to_id: targetScout.id,
        assigned_to_name: targetScout.full_name,
        assigned_to_avatar: targetScout.photo_url,
        mission_title: missionData.missionTitle,
        mission_description: missionData.missionDescription.trim() || 'Observation et suivi des performances du joueur.',
        priority: missionData.priority,
        assigned_at: new Date().toISOString(),
        due_date: missionData.dueDate || undefined,
        status: 'pending_ack',
        is_locked: isDirector,
        locked_by_role: isDirector ? (isSuperAdmin ? 'super_admin' : 'scout_admin') : undefined,
      };

      const existingHistory = targetCandidate.mission_history || [];
      const historyToKeep = targetCandidate.active_mission
        ? [{ ...targetCandidate.active_mission, status: 'completed' as const, completed_at: new Date().toISOString() }, ...existingHistory]
        : [...existingHistory];

      const fullHistory: ScoutMission[] = [newMission, ...historyToKeep.filter(m => m.id !== newMission.id)];

      await updateCandidate(targetCandidate.id, {
        discovering_scout_id: targetCandidate.discovering_scout_id || assignerId,
        discovering_scout_name: targetCandidate.discovering_scout_name || assignerName,
        assigned_scout_id: targetScout.id,
        assigned_scout_name: targetScout.full_name,
        assigned_by_scout_id: assignerId,
        assigned_by_scout_name: assignerName,
        active_mission: newMission,
        mission_history: fullHistory,
      });

      // Synchroniser le cache React Query immédiatement pour que la mission apparaisse tout de suite
      queryClient.setQueryData<TrialCandidate[]>(RECRUITMENT_KEYS.candidates, (old = []) => {
        const updated = {
          ...targetCandidate!,
          discovering_scout_id: targetCandidate!.discovering_scout_id || assignerId,
          discovering_scout_name: targetCandidate!.discovering_scout_name || assignerName,
          assigned_scout_id: targetScout.id,
          assigned_scout_name: targetScout.full_name,
          active_mission: newMission,
          mission_history: fullHistory,
        };
        const exists = old.some(c => c.id === targetCandidate!.id);
        return exists ? old.map(c => c.id === targetCandidate!.id ? updated : c) : [updated, ...old];
      });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });

      // Synchroniser avec public.scouting_basket : marquer comme 'assigned' pour disparaître du panier
      try {
        const candFullName = `${targetCandidate.first_name} ${targetCandidate.last_name}`.trim();
        await supabase
          .from('scouting_basket')
          .update({
            status: 'assigned',
            assigned_to_id: targetScout.id,
            assigned_to_name: targetScout.full_name,
            assigned_mission_id: targetCandidate.id,
            updated_at: new Date().toISOString(),
          })
          .or(`assigned_mission_id.eq.${targetCandidate.id},player_id.eq.${targetCandidate.id},full_name.ilike.${candFullName}`);
      } catch (basketSyncErr) {
        console.warn('Notice basket status update on assign:', basketSyncErr);
      }

      // Diffuser la notification en temps réel pour le scout / scout manager ciblé
      try {
        await supabase.channel('scouting_missions_broadcast_alerts').send({
          type: 'broadcast',
          event: 'mission_assigned',
          payload: {
            scoutId: targetScout.id,
            scoutName: targetScout.full_name,
            candidateId: targetCandidate.id,
            candidateName: `${targetCandidate.first_name} ${targetCandidate.last_name}`,
            missionTitle: missionData.missionTitle,
            missionDescription: missionData.missionDescription,
            assignedBy: assignerName,
          },
        });
      } catch (broadcastErr) {
        console.warn('Notice broadcast mission notification:', broadcastErr);
      }

      try {
        await recruitmentService.addTimelineEvent({
          candidate_id: targetCandidate.id,
          event_type: 'observation_scheduled',
          event_title: `Mission confiée à ${targetScout.full_name}`,
          event_description: `${missionData.missionTitle}${missionData.missionDescription ? ` : ${missionData.missionDescription}` : ''}`,
          performed_by: assignerName,
          event_date: new Date().toISOString().split('T')[0],
        });
      } catch {
        // silence
      }

      toast.success(`Mission assignée à ${targetScout.full_name} (${missionData.missionTitle}) !`, {
        icon: '🎯',
      });
    } else {
      const existingHistory = targetCandidate.mission_history || [];
      const updatedHistory = targetCandidate.active_mission
        ? [{ ...targetCandidate.active_mission, status: 'cancelled' as const, completed_at: new Date().toISOString() }, ...existingHistory]
        : existingHistory;

      await updateCandidate(targetCandidate.id, {
        assigned_scout_id: undefined,
        assigned_scout_name: undefined,
        active_mission: undefined,
        mission_history: updatedHistory,
      });

      toast.info(`Assignation réinitialisée pour ${targetCandidate.first_name} ${targetCandidate.last_name}.`, {
        icon: '🔄',
      });
    }
  };

  const handleUnassignMission = async (candidateId: string, _missionId?: string) => {
    if (!canAssignMissions) {
      toast.error("Action non autorisée : seuls le Super Admin et les Scout Admins peuvent retirer des missions.");
      return;
    }
    const targetCandidate = candidates.find(c => c.id === candidateId);
    if (!targetCandidate) {
      toast.error("Joueur introuvable.");
      return;
    }

    const previousScoutName = targetCandidate.assigned_scout_name || targetCandidate.active_mission?.assigned_to_name || 'Scout';
    const previousScoutId = targetCandidate.assigned_scout_id || targetCandidate.active_mission?.assigned_to_id;
    const assignerName = currentScout?.full_name || authState?.user?.full_name || 'Direction Scouting FUS';

    const existingHistory = targetCandidate.mission_history || [];
    const updatedHistory: ScoutMission[] = targetCandidate.active_mission
      ? [
        {
          ...targetCandidate.active_mission,
          status: 'recalled' as any,
          completed_at: new Date().toISOString(),
        },
        ...existingHistory.filter(m => m.id !== targetCandidate.active_mission?.id)
      ]
      : existingHistory;

    await updateCandidate(targetCandidate.id, {
      assigned_scout_id: undefined,
      assigned_scout_name: undefined,
      active_mission: undefined,
      mission_history: updatedHistory,
    });

    // Mettre à jour le cache React Query immédiatement
    queryClient.setQueryData<TrialCandidate[]>(RECRUITMENT_KEYS.candidates, (old = []) => {
      return old.map(c => {
        if (c.id === targetCandidate.id) {
          return {
            ...c,
            assigned_scout_id: undefined,
            assigned_scout_name: undefined,
            active_mission: undefined,
            mission_history: updatedHistory,
          };
        }
        return c;
      });
    });
    queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });

    // Règle métier : lorsqu'on retire la mission du scout, le joueur revient au panier de détection !
    try {
      const candFullName = `${targetCandidate.first_name} ${targetCandidate.last_name}`.trim();

      // Chercher si le joueur existe déjà dans public.scouting_basket
      const { data: basketRows } = await supabase
        .from('scouting_basket')
        .select('id, player_id, match_id')
        .or(`assigned_mission_id.eq.${targetCandidate.id},player_id.eq.${targetCandidate.id},full_name.ilike.${candFullName}`);

      if (basketRows && basketRows.length > 0) {
        for (const entry of basketRows) {
          await supabase
            .from('scouting_basket')
            .update({
              status: 'pending',
              assigned_to_id: null,
              assigned_to_name: null,
              assigned_mission_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', entry.id);

          // Si lié à un match, retirer l'assignation scout et s'assurer que in_scouting_basket = true
          if (entry.match_id) {
            const { data: matchData } = await supabase
              .from('matches')
              .select('id, opponent_lineup, opponent_subs')
              .eq('id', entry.match_id)
              .maybeSingle();

            if (matchData) {
              const resetOpp = (arr: any[]) => (arr || []).map(p => {
                if (typeof p === 'object' && p !== null) {
                  const mId = p.id && (String(p.id) === String(entry.player_id) || String(p.id) === String(targetCandidate.id));
                  const mName = p.full_name && p.full_name.trim().toLowerCase() === candFullName.toLowerCase();
                  if (mId || mName) {
                    return {
                      ...p,
                      in_scouting_basket: true,
                      assigned_scout_id: null,
                      assigned_scout_name: null,
                    };
                  }
                }
                return p;
              });

              await supabase
                .from('matches')
                .update({
                  opponent_lineup: resetOpp(matchData.opponent_lineup),
                  opponent_subs: resetOpp(matchData.opponent_subs),
                })
                .eq('id', entry.match_id);
            }
          }
        }
      } else {
        // Le joueur n'existait pas encore dans scouting_basket -> réintégration directe au panier
        await supabase
          .from('scouting_basket')
          .insert({
            player_id: targetCandidate.id,
            full_name: candFullName,
            jersey_number: null,
            position: targetCandidate.primary_position || 'Attaquant',
            photo_url: targetCandidate.photo_url || null,
            category: targetCandidate.age_category || 'SENIOR',
            match_id: targetCandidate.discovery_match || null,
            match_context: targetCandidate.origin_club ? { away_name: targetCandidate.origin_club, home_name: 'FUS CLUB' } : {},
            rating: evaluations.some(e => e.candidate_id === targetCandidate.id)
              ? (targetCandidate.performance_rating || targetCandidate.potential_rating || null)
              : (targetCandidate.performance_rating || null),
            rating_comment: targetCandidate.notes || "Mission retirée du scout et remise au panier de détection.",
            added_by_name: assignerName,
            added_by_role: 'Direction Scouting',
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      }

      // Diffuser l'événement en direct pour que le Panier de Détection se recharge immédiatement
      await supabase.channel('scouting_basket_realtime').send({
        type: 'broadcast',
        event: 'basket_player_restored',
        payload: {
          candidateId: targetCandidate.id,
          candidateName: candFullName,
        },
      });
    } catch (basketErr) {
      console.warn('[handleUnassignMission] Erreur réintégration au panier:', basketErr);
    }

    // Diffuser la notification en temps réel
    if (previousScoutId) {
      try {
        await supabase.channel('scouting_missions_broadcast_alerts').send({
          type: 'broadcast',
          event: 'mission_recalled',
          payload: {
            scoutId: previousScoutId,
            candidateId: targetCandidate.id,
            candidateName: `${targetCandidate.first_name} ${targetCandidate.last_name}`,
            withdrawnBy: assignerName,
          },
        });
      } catch (broadcastErr) {
        console.warn('Notice broadcast unassign error:', broadcastErr);
      }
    }

    try {
      await recruitmentService.addTimelineEvent({
        candidate_id: targetCandidate.id,
        event_type: 'observation_scheduled',
        event_title: `Mission retirée à ${previousScoutName}`,
        event_description: `La mission a été retirée par ${assignerName}. Le joueur a été remis dans le Panier de Détection.`,
        performed_by: assignerName,
        event_date: new Date().toISOString().split('T')[0],
      });
    } catch { }

    toast.success(`Mission retirée avec succès à ${previousScoutName}`, {
      description: `${targetCandidate.first_name} ${targetCandidate.last_name} a été remis dans le Panier de Détection.`,
      icon: '↩️',
    });
  };

  const handleConfirmAssign = async () => {
    if (!candidateToAssign) return;
    setIsAssigningScout(true);
    try {
      const effectiveTitle = assignMissionTitle === 'custom'
        ? (assignMissionCustomTitle.trim() || 'Mission personnalisée')
        : assignMissionTitle;

      await handleAssignMission(candidateToAssign.id, {
        scoutId: selectedScoutIdForAssign,
        missionTitle: effectiveTitle,
        missionDescription: assignMissionDescription,
        priority: assignMissionPriority,
        dueDate: assignMissionDueDate,
      });
      setCandidateToAssign(null);
    } catch (err: any) {
      console.error('Erreur assignation scout & mission:', err);
      toast.error("Erreur lors de l'assignation de la mission");
    } finally {
      setIsAssigningScout(false);
    }
  };

  // Profil scout cloisonné : rôle scout de terrain ou scout manager
  const isScoutRestricted = Boolean(
    !isRecruitmentAdmin && (
      isScoutManager ||
      userRoles.some(r => r.startsWith('scout')) ||
      userRole.startsWith('scout') ||
      userRole === 'scout' ||
      userRole === 'scout_manager' ||
      userRole === 'scout_editor' ||
      userRole === 'scout_user' ||
      (authState?.user?.job_title && authState.user.job_title.toLowerCase().includes('scout'))
    )
  );

  // Identification du scout connecté
  const currentScout = React.useMemo(() => {
    if (!authState?.user) return null;
    const userEmail = authState.user.email?.toLowerCase().trim();
    const userName = (authState.user.full_name || '').toLowerCase().trim();
    const userId = authState.user.id;

    let found = scouts.find(s => s.email && s.email.toLowerCase().trim() === userEmail);
    if (!found && userId) {
      found = scouts.find(s => s.id === userId);
    }
    if (!found && userName) {
      found = scouts.find(s => s.full_name && s.full_name.toLowerCase().trim() === userName);
    }
    if (!found && (isScoutRestricted || isScoutManager || !isRecruitmentAdmin)) {
      return {
        id: userId || 'current-scout-id',
        full_name: authState.user.full_name || 'Scout FUS',
        email: authState.user.email || 'scout@fusc.ma',
        phone: (authState.user as any).phone_number || '',
        role_title: authState.user.job_title || (isScoutManager ? 'Scout Manager' : 'Scout'),
        recruitment_region: 'Rabat-Salé-Kénitra',
        assigned_categories: ['U15', 'U17', 'U19'],
        assigned_teams: [],
        status: 'active' as const,
        recruited_date: '2024-01-01',
      };
    }
    return found || null;
  }, [authState?.user, scouts, isScoutRestricted, isScoutManager, isRecruitmentAdmin]);

  // US-DASH-30: Catégories assignées à l'Admin connecté par le Super Admin (Délégation en cascade)
  const scoutAdminAssignedCategories = React.useMemo(() => {
    if (isSuperAdmin) {
      return RECRUITMENT_AGE_CATEGORIES;
    }
    if (currentScout?.assigned_categories && Array.isArray(currentScout.assigned_categories) && currentScout.assigned_categories.length > 0) {
      return currentScout.assigned_categories;
    }
    return RECRUITMENT_AGE_CATEGORIES;
  }, [isSuperAdmin, currentScout]);

  // Portefeuille des candidats (Base de données) :
  // - Les administrateurs (Super Admin & Scout Admin) accèdent à l'intégralité de la base globale du club
  // US-DASH-60: Visibilité Database Détection V2
  // - Administrateurs : Accès à toute la base (candidates)
  // - Utilisateurs avec catégories assignées (ex: U15, U17) : Affiche TOUTE la database des candidats appartenant à leurs catégories assignées (ainsi que les candidats créés ou assignés à ce scout)
  // - Utilisateurs sans restriction de catégorie : Affiche TOUTE la database (candidates)
  const scopedCandidates = React.useMemo(() => {
    const userCats = (authState?.userCategories || []).map(c => normalizeAgeCategory(c));
    const hasAssignedCats = userCats.length > 0;

    // Les catégories assignées limitent les scouts opérationnels, pas la Direction Scout Admin.
    if (hasAssignedCats && !isRecruitmentAdmin) {
      return candidates.filter(c => {
        const candCat = normalizeAgeCategory(c.age_category || '');
        return !!candCat && userCats.includes(candCat);
      });
    }

    // 1. Les administrateurs de détection, la direction générale ET les Scout Managers ont accès à toute la base (Database globale)
    if (isRecruitmentAdmin || isScoutManager) {
      return candidates;
    }

    const scoutId = currentScout?.id || authState?.user?.id || '';
    const scoutName = (currentScout?.full_name || authState?.user?.full_name || '').toLowerCase().trim();
    const userId = authState?.user?.id;

    return candidates.filter(c => {
      // Également inclure les joueurs créés ou assignés à ce scout
      if (userId && (c as any).created_by === userId) return true;
      if (userId && (c as any).user_id === userId) return true;
      if (scoutId && c.discovering_scout_id === scoutId) return true;
      if (scoutName && c.discovering_scout_name && c.discovering_scout_name.toLowerCase().trim() === scoutName) return true;
      if (scoutId && c.recruiter_id === scoutId) return true;
      if (scoutName && c.recruiter_name && c.recruiter_name.toLowerCase().trim() === scoutName) return true;
      if (scoutId && c.assigned_scout_id === scoutId) return true;
      if (scoutName && c.assigned_scout_name && c.assigned_scout_name.toLowerCase().trim() === scoutName) return true;
      if (scoutId && c.active_mission?.assigned_to_id === scoutId) return true;
      if (scoutName && c.active_mission?.assigned_to_name && c.active_mission.assigned_to_name.toLowerCase().trim() === scoutName) return true;
      if (scoutId && c.assigned_scouts?.some(s => s.id === scoutId || (s.name && s.name.toLowerCase().trim() === scoutName))) return true;
      if (scoutId && c.mission_history?.some(m => m.assigned_to_id === scoutId || (m.assigned_to_name && m.assigned_to_name.toLowerCase().trim() === scoutName))) return true;
      if (c.evaluations?.some(e =>
        (scoutId && (e.evaluator_id === scoutId || e.scout_id === scoutId)) ||
        (scoutName && e.evaluator_name && e.evaluator_name.toLowerCase().trim() === scoutName)
      )) return true;
      if (evaluations?.some(e =>
        e.candidate_id === c.id && (
          (scoutId && (e.evaluator_id === scoutId || e.scout_id === scoutId)) ||
          (scoutName && e.evaluator_name && e.evaluator_name.toLowerCase().trim() === scoutName)
        )
      )) return true;
      if (observations?.some(o =>
        o.candidate_id === c.id && (
          (scoutId && o.scout_id === scoutId) ||
          (scoutName && o.scout_name && o.scout_name.toLowerCase().trim() === scoutName)
        )
      )) return true;

      return false;
    });
  }, [candidates, authState?.userCategories, isRecruitmentAdmin, isScoutManager, currentScout, authState?.user?.id, authState?.user?.full_name, evaluations, observations]);

  // Cellule scouts & personnel : Les administrateurs et managers apparaissent ensemble dans la cellule personnel
  const scopedScouts = React.useMemo(() => {
    if (scouts && scouts.length > 0) {
      return scouts;
    }
    if (currentScout) return [currentScout];
    if (authState?.user) {
      return [{
        id: authState.user.id,
        full_name: authState.user.full_name || 'Membre Cellule',
        email: authState.user.email || '',
        phone: '',
        role_title: isScoutManager ? 'Scout Manager' : isAdmin ? 'Administrateur' : 'Scout',
        recruitment_region: 'Rabat-Salé-Kénitra',
        assigned_categories: ['U15', 'U17', 'U19'],
        assigned_teams: [],
        status: 'active' as const,
        recruited_date: '2024-01-01',
      }];
    }
    return [];
  }, [scouts, currentScout, authState?.user, isScoutManager, isAdmin]);

  // US-DASH-59: Permission spécifique d'ajout/modification du lien vidéo Google Drive
  const canEditDriveLink = Boolean(
    isSuperAdmin ||
    hasSubModuleAccess('candidates', 'drive_link')
  );

  // Vérifie si l'utilisateur a le droit de créer un candidat ou un rapport (CRUD create)
  const canCreateCandidate = Boolean(isSuperAdmin || hasSubModuleAccess('candidates', 'create'));

  // Vérifie si un candidat a été introduit / découvert par le scout connecté
  const isCandidateIntroducedByScout = (cand: TrialCandidate): boolean => {
    if (!cand) return false;
    const userId = authState?.user?.id;
    const scoutId = currentScout?.id;
    const scoutName = (currentScout?.full_name || authState?.user?.full_name || '').toLowerCase().trim();
    const userName = (authState?.user?.full_name || '').toLowerCase().trim();

    // 1. Créé par l'utilisateur connecté
    if (userId && ((cand as any).created_by === userId || (cand as any).user_id === userId)) {
      return true;
    }

    // 2. Scout découvreur
    if (userId && cand.discovering_scout_id === userId) return true;
    if (scoutId && cand.discovering_scout_id === scoutId) return true;
    if (scoutName && cand.discovering_scout_name && cand.discovering_scout_name.toLowerCase().trim() === scoutName) return true;
    if (userName && cand.discovering_scout_name && cand.discovering_scout_name.toLowerCase().trim() === userName) return true;

    // 3. Recruteur ayant introduit le joueur
    if (userId && cand.recruiter_id === userId) return true;
    if (scoutId && cand.recruiter_id === scoutId) return true;
    if (scoutName && cand.recruiter_name && cand.recruiter_name.toLowerCase().trim() === scoutName) return true;
    if (userName && cand.recruiter_name && cand.recruiter_name.toLowerCase().trim() === userName) return true;

    return false;
  };

  // Vérifie si un candidat a une mission d'observation assignée au scout connecté
  const isCandidateAssignedToScout = (cand: TrialCandidate): boolean => {
    if (!cand) return false;
    const userId = authState?.user?.id;
    const scoutId = currentScout?.id;
    const scoutName = (currentScout?.full_name || authState?.user?.full_name || '').toLowerCase().trim();

    // Mission directe sur le candidat
    if (scoutId && cand.assigned_scout_id === scoutId) return true;
    if (scoutName && cand.assigned_scout_name && cand.assigned_scout_name.toLowerCase().trim() === scoutName) return true;
    if (scoutId && cand.active_mission?.assigned_to_id === scoutId) return true;
    if (scoutName && cand.active_mission?.assigned_to_name && cand.active_mission.assigned_to_name.toLowerCase().trim() === scoutName) return true;
    if (userId && cand.active_mission?.assigned_to_id === userId) return true;
    if (cand.assigned_scouts?.some(s => (scoutId && s.id === scoutId) || (userId && s.id === userId) || (scoutName && s.name && s.name.toLowerCase().trim() === scoutName))) return true;
    if (cand.mission_history?.some(m => (scoutId && m.assigned_to_id === scoutId) || (userId && m.assigned_to_id === userId) || (scoutName && m.assigned_to_name && m.assigned_to_name.toLowerCase().trim() === scoutName))) return true;

    return false;
  };

  // Vérifie si le scout connecté est strictement l'auteur d'un rapport / évaluation (sans présumer des droits admin)
  const isEvaluationStrictlyAuthoredByCurrentScout = (ev: CandidateEvaluation): boolean => {
    if (!ev) return false;
    const userId = authState?.user?.id;
    const scoutId = currentScout?.id;
    const scoutName = (currentScout?.full_name || '').toLowerCase().trim();
    const userName = (authState?.user?.full_name || '').toLowerCase().trim();

    if (userId && ((ev as any).created_by === userId || (ev as any).user_id === userId)) return true;
    if (scoutId && (ev.evaluator_id === scoutId || (ev as any).scout_id === scoutId)) return true;
    if (userId && (ev.evaluator_id === userId || (ev as any).scout_id === userId)) return true;
    if (scoutName && ev.evaluator_name && ev.evaluator_name.toLowerCase().trim() === scoutName) return true;
    if (userName && ev.evaluator_name && ev.evaluator_name.toLowerCase().trim() === userName) return true;

    return false;
  };

  // US-DASH-100 : Vérifie si l'utilisateur connecté a le droit de visualiser cette évaluation
  // Les admins voient tout. Les scouts et scout managers ne voient QUE leurs propres rapports.
  const canViewEvaluation = (ev: CandidateEvaluation): boolean => {
    if (!ev) return false;
    if (isSuperAdmin || isAdmin || isRecruitmentAdmin) return true;
    return isEvaluationStrictlyAuthoredByCurrentScout(ev);
  };

  // Vérifie si le scout connecté est l'auteur d'un rapport / évaluation (avec droits admin)
  const isEvaluationAuthoredByScout = (ev: CandidateEvaluation): boolean => {
    if (!ev) return false;
    if (isSuperAdmin || isAdmin) return true;
    return isEvaluationStrictlyAuthoredByCurrentScout(ev);
  };

  // Règle d'ajout de rapport (US-DASH-100) :
  // Tout scout ou scout manager habilité aux rapports peut rédiger un rapport
  // sur n'importe quel joueur existant dans la base de données.
  const canAddReportForCandidate = (cand: TrialCandidate): boolean => {
    if (!cand) return false;
    if (isSuperAdmin || isAdmin || isRecruitmentAdmin) return true;
    if (!canManageReports) return false;
    if (!canManageCategory(cand.age_category)) return false;
    return true;
  };

  // Règle de modification d'un rapport :
  // On ne peut modifier QUE ses propres rapports (sauf Super Admin / Admin)
  const canEditEvaluation = (ev: CandidateEvaluation): boolean => {
    if (!ev) return false;
    if (isSuperAdmin || isAdmin) return true;
    if (!canManageReports) return false;
    if (!hasSubModuleAccess('candidates', 'update')) return false;
    return isEvaluationAuthoredByScout(ev);
  };

  // Règle de suppression d'un rapport :
  // On ne peut supprimer QUE ses propres rapports (sauf Super Admin / Admin)
  const canDeleteEvaluation = (ev: CandidateEvaluation): boolean => {
    if (!ev) return false;
    if (isSuperAdmin || isAdmin) return true;
    if (!canManageReports) return false;
    if (!hasSubModuleAccess('candidates', 'delete')) return false;
    return isEvaluationAuthoredByScout(ev);
  };

  // Vérifie si l'utilisateur a le droit d'ouvrir et de consulter le dossier détaillé (modal/page) et les rapports du joueur
  const canViewCandidateDetails = (candidate?: TrialCandidate): boolean => {
    if (!candidate) return false;
    if (isSuperAdmin) return true;

    // Règle stricte : uniquement si l'utilisateur possède au moins une permission de consultation / dossier / rapport
    const hasDossierOrReportPermission = Boolean(
      canManageReports ||
      hasSubModuleAccess('candidates', 'manage_reports') ||
      hasSubModuleAccess('candidates', 'reports') ||
      hasSubModuleAccess('candidates', 'edit_player') ||
      hasSubModuleAccess('candidates', 'update') ||
      hasSubModuleAccess('candidates', 'assign_mission') ||
      hasSubModuleAccess('candidates', 'create') ||
      hasSubModuleAccess('shortlist', 'read', 'recruitment_v2')
    );

    if (hasDossierOrReportPermission) {
      return true;
    }

    return false;
  };

  // Vérifie si l'utilisateur a le droit d'ajouter/modifier le lien Drive pour ce candidat
  const canAddDriveLinkForCandidate = (cand: TrialCandidate): boolean => {
    if (!cand) return false;
    if (isSuperAdmin) return true;
    if (!canEditDriveLink) return false;
    if (!canManageCategory(cand.age_category)) return false;
    return true;
  };

  // Vérifie si l'utilisateur a le droit de modifier l'intégralité de la fiche du candidat (accès au formulaire complet)
  const canUpdateCandidateFull = (cand: TrialCandidate): boolean => {
    if (!cand) return false;
    if (isSuperAdmin) return true;

    // Vérification de la permission dédiée 'Modifier un joueur' (sub:candidates:edit_player) ou update général
    const hasEditPermission = hasSubModuleAccess('candidates', 'edit_player') || hasSubModuleAccess('candidates', 'update');
    if (!hasEditPermission) return false;

    if (isAdmin) return true;

    // Si le joueur a été introduit par le scout connecté : modification autorisée
    if (isCandidateIntroducedByScout(cand)) {
      return true;
    }

    return false;
  };

  // Règle de suppression : Seule la direction ou le scout ayant introduit le joueur peut le supprimer
  const canDeleteCandidate = (cand: TrialCandidate): boolean => {
    if (!cand) return false;
    if (isSuperAdmin) return true;
    // Règle stricte : la permission de suppression candidates:delete est impérativement requise
    if (!hasSubModuleAccess('candidates', 'delete')) return false;

    if (isAdmin) return true;

    // Ne peut supprimer QUE les joueurs qu'il a introduits lui-même
    if (isCandidateIntroducedByScout(cand)) {
      return true;
    }

    return false;
  };

  // Droit global de suppression pour les actions de masse
  const canDeleteAnyCandidate = Boolean(isSuperAdmin || hasSubModuleAccess('candidates', 'delete'));

  // Action rapide : Ajouter / Retirer un joueur de la Shadow List (Shortlist)
  const handleToggleShortlist = async (cand: TrialCandidate) => {
    const isCurrentlyShortlisted = ['shortlisted', 'shortlist'].includes(cand.pipeline_stage);
    const newStage = isCurrentlyShortlisted ? 'prospect' : 'shortlisted';
    try {
      await updateCandidate(cand.id, { pipeline_stage: newStage });
      if (isCurrentlyShortlisted) {
        toast.success(`${cand.first_name} ${cand.last_name} a été retiré de la shortlist`);
      } else {
        toast.success(`${cand.first_name} ${cand.last_name} a été ajouté à la Shadow List / Shortlist !`, { icon: '⭐' });
      }
    } catch (err) {
      toast.error("Erreur lors de la mise à jour de la shortlist");
    }
  };

  const handleOpenScheduleTestForCandidate = (cand: TrialCandidate, defaultDate?: string) => {
    setEditingTest(null);
    setSchedulingCandidate(cand);
    setNewTestDefaultDate(defaultDate || todayStr);
    setIsSessionModalOpen(true);
  };

  // Filtre unique complet transversal multi-critères
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [footFilter, setFootFilter] = useState('ALL');
  const [scoutFilter, setScoutFilter] = useState('ALL');
  const [myPlayersOnly, setMyPlayersOnly] = useState(false);
  // Filtre rapide Marocains / Africains (sans bouton Tous)
  const [nationalityTagFilter, setNationalityTagFilter] = useState<'all' | 'marocains' | 'africains'>('all');
  // Filtre de statut / décision scout
  const [decisionFilter, setDecisionFilter] = useState<'ALL' | 'recruit_now' | 'invitation_test' | 'to_follow'>('ALL');

  const nationalityCounts = React.useMemo(() => {
    let morocCount = 0;
    let afriCount = 0;

    scopedCandidates.forEach(c => {
      if (c.pipeline_stage === 'archived' || c.status === 'archived') return;
      if (matchesCandidateNationality(c, 'marocains')) morocCount++;
      if (matchesCandidateNationality(c, 'africains')) afriCount++;
    });

    return { morocCount, afriCount };
  }, [scopedCandidates]);

  const visibleRecruitmentCategories = React.useMemo(() => {
    const allowed = RECRUITMENT_AGE_CATEGORIES.filter(cat => canManageCategory(cat));
    if (allowed.length < RECRUITMENT_AGE_CATEGORIES.length && allowed.length > 0) {
      return allowed;
    }
    return RECRUITMENT_AGE_CATEGORIES;
  }, [canManageCategory]);

  React.useEffect(() => {
    if (authState?.userCategories && authState.userCategories.length === 1) {
      setCategoryFilter(normalizeAgeCategory(authState.userCategories[0]));
    }
  }, [authState?.userCategories]);

  const isAnyFilterActive = Boolean(
    searchQuery.trim() ||
    categoryFilter !== 'ALL' ||
    positionFilter !== 'ALL' ||
    footFilter !== 'ALL' ||
    scoutFilter !== 'ALL' ||
    myPlayersOnly ||
    nationalityTagFilter !== 'all' ||
    decisionFilter !== 'ALL'
  );

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setCategoryFilter('ALL');
    setPositionFilter('ALL');
    setFootFilter('ALL');
    setScoutFilter('ALL');
    setMyPlayersOnly(false);
    setNationalityTagFilter('all');
    setDecisionFilter('ALL');
  };

  const setTab = (tab: string) => {
    if (!canAccessTab(tab)) {
      if (firstAvailableTab) setSearchParams({ tab: firstAvailableTab });
      return;
    }
    setSearchParams({ tab });
  };

  // KPIs calculés sur le portefeuille cloisonné
  const totalProspects = scopedCandidates.length;
  const inEvaluationCount = scopedCandidates.filter(c => ['test_scheduled', 'test_completed', 'under_evaluation'].includes(c.pipeline_stage)).length;
  const signedCount = scopedCandidates.filter(c => ['signed', 'academy', 'shortlisted'].includes(c.pipeline_stage)).length;
  const activeScoutsCount = scopedScouts.filter(s => s.status === 'active').length;

  // 1. Filtrage complet des candidats actifs (hors archivés)
  const filteredCandidates = React.useMemo(() => {
    const list = scopedCandidates.filter((c) => {
      // Exclure les joueurs archivés de la database active
      if (c.pipeline_stage === 'archived' || c.status === 'archived') {
        return false;
      }

      // Catégorie d'âge (Règle Métier US-DASH-120 : Traitement et indexation systématiques par âge réel via date de naissance)
      const effectiveCat = getCandidateEffectiveCategory(c);
      if (categoryFilter !== 'ALL' && normalizeAgeCategory(effectiveCat) !== normalizeAgeCategory(categoryFilter)) {
        return false;
      }

      // Poste de jeu
      if (positionFilter !== 'ALL') {
        const rawPos = (c.primary_position || '').toUpperCase();
        if (!rawPos.includes(positionFilter.toUpperCase())) {
          return false;
        }
      }

      // Pied fort
      if (footFilter !== 'ALL' && c.preferred_foot !== footFilter) {
        return false;
      }

      // Filtre Scout
      if (scoutFilter !== 'ALL') {
        const matchesScoutId = c.discovering_scout_id === scoutFilter;
        const matchesScoutName = c.discovering_scout_name?.toLowerCase() === scoutFilter.toLowerCase();
        const candEvals = evaluations.filter(e => e.candidate_id === c.id);
        const matchesEvalScout = candEvals.some(e => e.evaluator_name?.toLowerCase() === scoutFilter.toLowerCase() || e.evaluator_id === scoutFilter);
        if (!matchesScoutId && !matchesScoutName && !matchesEvalScout) {
          return false;
        }
      }

      // Recherche textuelle multi-champs
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        const club = (c.current_club || '').toLowerCase();
        const originClub = (c.origin_club || '').toLowerCase();
        const position = (c.primary_position || '').toLowerCase();
        const country = `${c.nationality || ''} ${c.country || ''} ${c.city || ''}`.toLowerCase();
        const ageCategory = (c.age_category || '').toLowerCase();
        const scout = (c.discovering_scout_name || '').toLowerCase();
        const recruiter = (c.recruiter_name || '').toLowerCase();
        const matches = (
          fullName.includes(q) ||
          club.includes(q) ||
          originClub.includes(q) ||
          position.includes(q) ||
          country.includes(q) ||
          ageCategory.includes(q) ||
          scout.includes(q) ||
          recruiter.includes(q)
        );
        if (!matches) return false;
      }

      // Filtre Nationalité (Marocains ou Africains)
      if (nationalityTagFilter !== 'all') {
        if (!matchesCandidateNationality(c, nationalityTagFilter)) {
          return false;
        }
      }

      // Règle Directeur Administratif / Permission Recruter Immédiatement :
      // Afficher exclusivement les profils à recruter immédiatement
      if (isOnlyRecruitNowUser && !isCandidateRecruitNow(c)) {
        return false;
      }

      // Filtre Décision Scout / Statut (si activé manuellement) : déterminé par le DERNIER RAPPORT
      const candDecision = getCandidateLatestDecision(c);
      if (decisionFilter === 'recruit_now' && !isCandidateRecruitNow(c)) {
        return false;
      } else if (decisionFilter !== 'ALL' && decisionFilter !== 'recruit_now' && candDecision !== decisionFilter) {
        return false;
      }

      // Filtre "Mes Joueurs Uniquement" (introduits / découverts par l'utilisateur connecté)
      if (myPlayersOnly && !isCandidateIntroducedByScout(c)) {
        return false;
      }

      return true;
    });

    // Tri prioritaire : Afficher les profils marocains en premier lieu puis par date de création
    const sorted = [...list].sort((a, b) => {
      const aMoroc = isCandidateMoroccan(a) ? 1 : 0;
      const bMoroc = isCandidateMoroccan(b) ? 1 : 0;
      if (bMoroc !== aMoroc) {
        return bMoroc - aMoroc;
      }
      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    });

    return sorted;
  }, [scopedCandidates, evaluations, searchQuery, categoryFilter, positionFilter, footFilter, scoutFilter, myPlayersOnly, nationalityTagFilter, currentScout, authState?.user, decisionFilter, isOnlyRecruitNowUser, isCandidateRecruitNow, getCandidateLatestDecision]);

  // 1b. Filtrage des candidats archivés pour l'onglet Archives
  const filteredArchivedCandidates = React.useMemo(() => {
    return candidates.filter((c) => {
      const isArchived = c.pipeline_stage === 'archived' || c.status === 'archived';
      if (!isArchived) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        const club = (c.current_club || '').toLowerCase();
        const originClub = (c.origin_club || '').toLowerCase();
        const position = (c.primary_position || '').toLowerCase();
        return (
          fullName.includes(q) ||
          club.includes(q) ||
          originClub.includes(q) ||
          position.includes(q)
        );
      }
      return true;
    });
  }, [candidates, searchQuery]);

  // Calculs et gestionnaires de sélection multiple pour la rubrique Database
  const visibleCandidateIds = useMemo(() => filteredCandidates.map(c => c.id), [filteredCandidates]);
  const selectedVisibleCount = useMemo(() => visibleCandidateIds.filter(id => selectedCandidateIds.includes(id)).length, [visibleCandidateIds, selectedCandidateIds]);
  const isAllSelected = visibleCandidateIds.length > 0 && selectedVisibleCount === visibleCandidateIds.length;
  const isSomeSelected = selectedVisibleCount > 0 && selectedVisibleCount < visibleCandidateIds.length;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCandidateIds(prev => prev.filter(id => !visibleCandidateIds.includes(id)));
    } else {
      setSelectedCandidateIds(prev => Array.from(new Set([...prev, ...visibleCandidateIds])));
    }
  };

  const handleToggleSelectCandidate = (id: string) => {
    setSelectedCandidateIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedCandidateIds([]);
  };

  const selectedCandidates = useMemo(() =>
    candidates.filter(c => selectedCandidateIds.includes(c.id)),
    [candidates, selectedCandidateIds]
  );

  const selectedCandidatesWithDeletePermission = useMemo(() =>
    selectedCandidates.filter(c => canDeleteCandidate(c)),
    [selectedCandidates, isAdmin, authState?.user?.id]
  );

  const nonDeletableSelectedCount = selectedCandidates.length - selectedCandidatesWithDeletePermission.length;

  // 2. Filtrage complet des observations
  const filteredObservations = React.useMemo(() => {
    const candidateIds = new Set(filteredCandidates.map(c => c.id));
    return observations.filter(obs => {
      const isCandidateMatched = candidateIds.has(obs.candidate_id);

      if ((categoryFilter !== 'ALL' || positionFilter !== 'ALL' || footFilter !== 'ALL' || scoutFilter !== 'ALL') && !isCandidateMatched) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cand = candidates.find(c => c.id === obs.candidate_id);
        const candName = cand ? `${cand.first_name} ${cand.last_name}`.toLowerCase() : '';
        const matchName = (obs.match_name || '').toLowerCase();
        const compName = (obs.competition_name || '').toLowerCase();
        const scoutName = (obs.scout_name || '').toLowerCase();
        const impression = (obs.general_impression || '').toLowerCase();
        const matchesText = (
          candName.includes(q) ||
          matchName.includes(q) ||
          compName.includes(q) ||
          scoutName.includes(q) ||
          impression.includes(q)
        );
        if (!matchesText && !isCandidateMatched) return false;
      }

      return true;
    });
  }, [observations, filteredCandidates, candidates, searchQuery, categoryFilter, positionFilter, footFilter, scoutFilter]);

  // 3. Filtrage complet des tests (Planning des Tests)
  const filteredTests = React.useMemo(() => {
    const candidateIds = new Set(filteredCandidates.map(c => c.id));
    return tests.filter(t => {
      if (categoryFilter !== 'ALL' && t.age_category !== categoryFilter) {
        return false;
      }

      const testCandIds = Array.from(new Set([
        ...(t.candidate_ids || []),
        ...(t.candidate_id ? [t.candidate_id] : []),
      ]));

      if (testCandIds.length > 0) {
        if (!testCandIds.some(id => candidateIds.has(id))) return false;
      } else {
        if (positionFilter !== 'ALL' || footFilter !== 'ALL' || scoutFilter !== 'ALL') {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const testName = (t.test_name || '').toLowerCase();
        const location = (t.location || '').toLowerCase();
        const targetTeam = (t.target_team || '').toLowerCase();
        const matchName = (t.match_name || '').toLowerCase();
        const candNames = candidates
          .filter(c => testCandIds.includes(c.id))
          .map(c => `${c.first_name} ${c.last_name}`.toLowerCase())
          .join(' ');

        const matches = (
          testName.includes(q) ||
          location.includes(q) ||
          targetTeam.includes(q) ||
          matchName.includes(q) ||
          candNames.includes(q)
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [tests, filteredCandidates, candidates, categoryFilter, positionFilter, footFilter, scoutFilter, searchQuery]);

  // 4. Filtrage complet des évaluations
  const filteredEvaluations = React.useMemo(() => {
    const candidateIds = new Set(filteredCandidates.map(c => c.id));
    return evaluations.filter(ev => {
      if (!candidateIds.has(ev.candidate_id)) return false;
      if (scoutFilter !== 'ALL' && ev.evaluator_name?.toLowerCase() !== scoutFilter.toLowerCase()) return false;
      return true;
    });
  }, [evaluations, filteredCandidates, scoutFilter]);

  // 5. Joueurs uniques évalués (dédoublonnés par joueur)
  const evaluatedCandidates = React.useMemo(() => {
    const map = new Map<string, {
      candidate: TrialCandidate;
      latestEval: CandidateEvaluation;
      evalCount: number;
    }>();

    filteredEvaluations.forEach(ev => {
      const cand = candidates.find(c => c.id === ev.candidate_id);
      if (!cand) return;

      if (!map.has(cand.id)) {
        map.set(cand.id, {
          candidate: cand,
          latestEval: ev,
          evalCount: 1,
        });
      } else {
        const item = map.get(cand.id)!;
        item.evalCount += 1;
        if (ev.evaluation_date > item.latestEval.evaluation_date) {
          item.latestEval = ev;
        }
      }
    });

    return Array.from(map.values());
  }, [filteredEvaluations, candidates]);

  const shortlistedCandidatesCount = React.useMemo(() => {
    return filteredCandidates.filter(c => {
      const hasEval = evaluations.some(e => e.candidate_id === c.id && (['shortlist', 'recommend_academy', 'contract_proposal'].includes(e.verdict) || e.overall_score >= 6.0));
      return hasEval;
    }).length;
  }, [filteredCandidates, evaluations]);

  // Sélection du dossier candidat en mode pleine page (non modal)
  const candidateIdParam = searchParams.get('candidateId');
  const detailTabParam = searchParams.get('detailTab') as any;
  const rawTargetCandidate = candidateIdParam ? (candidates.find(c => c.id === candidateIdParam) || detailCandidate) : null;
  const activeCandidate = (rawTargetCandidate && canViewCandidateDetails(rawTargetCandidate)) ? rawTargetCandidate : null;

  // Si l'utilisateur clique sur une rubrique sans candidateId ou s'il n'a pas le droit de consulter, refermer automatiquement le dossier
  useEffect(() => {
    if (!candidateIdParam && detailCandidate) {
      setDetailCandidate(null);
    }
    if (candidateIdParam) {
      const cand = candidates.find(c => c.id === candidateIdParam);
      if (cand && !canViewCandidateDetails(cand)) {
        closeCandidateDetail();
      }
    }
  }, [candidateIdParam, detailCandidate, candidates]);

  const openCandidateDetail = (candidate: TrialCandidate, initialDetailTab?: 'scout' | 'personal' | 'sport' | 'evaluations' | 'report') => {
    if (!canViewCandidateDetails(candidate)) {
      return;
    }
    setDetailCandidate(candidate);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('candidateId', candidate.id);
      if (initialDetailTab) {
        next.set('detailTab', initialDetailTab);
      } else {
        next.delete('detailTab');
      }
      return next;
    });
  };

  const closeCandidateDetail = () => {
    setDetailCandidate(null);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('candidateId');
      next.delete('detailTab');
      return next;
    });
  };

  // Si un dossier candidat est sélectionné, on affiche la PAGE complète du dossier joueur (pas de modal)
  if (activeCandidate) {
    return (
      <div className="space-y-6 pb-12">
        <CandidateDetailModal
          variant="page"
          isOpen={true}
          initialTab={detailTabParam || 'scout'}
          onClose={closeCandidateDetail}
          candidate={activeCandidate}
          evaluations={evaluations}
          observations={observations}
          tests={tests}
          timeline={timeline}
          scouts={scouts}
          canManageReports={canManageReports}
          isRecruitmentAdmin={isRecruitmentAdmin}
          isScoutManager={isScoutManager}
          currentScout={currentScout}
          currentUserId={authState?.user?.id}
          currentUserName={authState?.user?.full_name}
          onScheduleTest={canCreateCandidate ? (cand) => {
            handleOpenScheduleTestForCandidate(cand);
          } : undefined}
          onOpenEvaluation={canAddReportForCandidate(activeCandidate) ? (options) => {
            setEvaluatingCandidate(activeCandidate);
            setEvaluationInitialMode(options?.mode || 'reevaluate');
            setEvaluationInitialTestId(options?.testId);
            setIsEvaluationModalOpen(true);
          } : undefined}
          onOpenObservation={canAddReportForCandidate(activeCandidate) ? () => {
            setObservingCandidate(activeCandidate);
            setIsObservationModalOpen(true);
          } : undefined}
          onOpenEditCandidate={canUpdateCandidateFull(activeCandidate) ? (cand) => {
            setIsDetailModalOpen(false);
            navigate(`/recruitment-v2/add-player?editId=${cand.id}&returnTab=${activeTab}`);
          } : undefined}
          onAddReport={canAddReportForCandidate(activeCandidate) ? (cand) => {
            setIsDetailModalOpen(false);
            navigate(`/recruitment-v2/add-report?candidateId=${cand.id}&returnTab=${activeTab}`);
          } : undefined}
          onEditReport={(cand, ev) => {
            if (!canEditEvaluation(ev)) {
              toast.error("Vous ne pouvez pas modifier un rapport rédigé par un autre scout.");
              return;
            }
            setIsDetailModalOpen(false);
            navigate(`/recruitment-v2/add-report?candidateId=${cand.id}&editReportId=${ev.id}&returnTab=${activeTab}`);
          }}
          onDeleteReport={async (reportId) => {
            const ev = evaluations.find(e => e.id === reportId);
            if (ev && !canDeleteEvaluation(ev)) {
              toast.error("Vous ne pouvez pas supprimer un rapport rédigé par un autre scout.");
              return;
            }
            await deleteEvaluation(reportId);
            toast.success("Rapport d'observation supprimé avec succès !");
            queryClient.invalidateQueries({ queryKey: ['recruitment'] });
          }}
          onDeleteReports={async (reportIds) => {
            const allowedIds = reportIds.filter(id => {
              const ev = evaluations.find(e => e.id === id);
              return !ev || canDeleteEvaluation(ev);
            });
            if (allowedIds.length === 0) {
              toast.error("Aucun rapport sélectionné ne vous appartient pour suppression.");
              return;
            }
            await deleteEvaluations(allowedIds);
            toast.success(`${allowedIds.length} rapport(s) d'observation supprimé(s) avec succès !`);
            queryClient.invalidateQueries({ queryKey: ['recruitment'] });
          }}
          canEditEvaluation={canEditEvaluation}
          canDeleteEvaluation={canDeleteEvaluation}
          onUpdateCandidate={(id, updates) => updateCandidate(id, updates)}
          onDeleteCandidate={canDeleteCandidate(activeCandidate) ? (cand) => setCandidateToDelete(cand) : undefined}
          onOpenDriveLink={canAddDriveLinkForCandidate(activeCandidate) ? () => setCandidateForDriveLink(activeCandidate) : undefined}
        />

        {/* MODAL RAPIDE AJOUT / MODIFICATION DU LIEN GOOGLE DRIVE (US-DASH-59) */}
        {candidateForDriveLink && (
          <CandidateDriveLinkModal
            isOpen={!!candidateForDriveLink}
            onClose={() => setCandidateForDriveLink(null)}
            candidate={candidateForDriveLink}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
              queryClient.invalidateQueries({ queryKey: ['recruitment'] });
            }}
          />
        )}

        {/* MODAL ÉVALUATION SCOUT */}
        {isEvaluationModalOpen && evaluatingCandidate && (
          <EvaluationModal
            isOpen={isEvaluationModalOpen}
            onClose={() => {
              setIsEvaluationModalOpen(false);
              setEvaluatingCandidate(null);
            }}
            candidate={evaluatingCandidate}
            tests={tests}
            initialMode={evaluationInitialMode}
            initialTestId={evaluationInitialTestId}
            onAddPlayer={() => {
              navigate('/recruitment-v2/add-player');
            }}
            onSave={async (evalData) => {
              await saveEvaluation(evalData);
              setIsEvaluationModalOpen(false);
              setEvaluatingCandidate(null);
            }}
            onDelete={async (evalId) => {
              const ev = evaluations.find(e => e.id === evalId);
              if (ev && !canDeleteEvaluation(ev)) {
                toast.error("Vous ne pouvez pas supprimer un rapport rédigé par un autre scout.");
                return;
              }
              await deleteEvaluation(evalId);
              setIsEvaluationModalOpen(false);
              setEvaluatingCandidate(null);
            }}
          />
        )}

        {/* MODAL OBSERVATION SCOUT */}
        {isObservationModalOpen && observingCandidate && (
          <ObservationModal
            isOpen={isObservationModalOpen}
            onClose={() => {
              setIsObservationModalOpen(false);
              setObservingCandidate(null);
            }}
            candidate={observingCandidate}
            onSave={async (obsData) => {
              await createObservation(obsData);
              setIsObservationModalOpen(false);
              setObservingCandidate(null);
            }}
          />
        )}

        {/* MODAL SESSION / TEST */}
        {isSessionModalOpen && (
          <TrialSessionModal
            isOpen={isSessionModalOpen}
            onClose={() => {
              setIsSessionModalOpen(false);
              setEditingTest(null);
              setSchedulingCandidate(null);
              setNewTestDefaultDate(undefined);
            }}
            candidates={scopedCandidates}
            scouts={scopedScouts}
            initialTest={editingTest}
            defaultDate={newTestDefaultDate}
            defaultCandidateId={schedulingCandidate?.id}
            onSave={async (testData) => {
              await createTest(testData);
            }}
            onSaveBatch={async (testsPayload) => {
              await createTestsBatch(testsPayload);
            }}
            onUpdate={async (id, updates) => {
              await updateTest({ id, updates });
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">


      {/* KPI Stats removed from V2 */}

      {/* Bloc de navigation des onglets supprimé selon la demande */}

      {/* CONTENU PRINCIPAL DES ONGLETS */}
      <div className="space-y-6">



        {/* TAB 1 : CELLULE SCOUTS / PERSONNEL (RÉSERVÉ AUX ADMINS HABILITÉS UNIQUEMENT) */}
        {activeTab === 'scouts' && canAccessTab('scouts') && (
          <ScoutManagementView
            scouts={scopedScouts}
            candidates={candidates}
            evaluations={evaluations}
            observations={observations}
            isAdmin={isRecruitmentAdmin}
            isSuperAdmin={isSuperAdmin}
            adminCategories={scoutAdminAssignedCategories}
            onCreateScout={createScout}
            onUpdateScout={(id, updates) => updateScout(id, updates)}
            onDeleteScout={deleteScout}
            onDeleteScouts={deleteScouts}
            onOpenCandidateDetail={(c, initialTab) => openCandidateDetail(c, initialTab)}
            onAddCandidateForScout={(scoutId) => {
              navigate(`/recruitment-v2/add-player?scoutId=${scoutId}&returnTab=scouts`);
            }}
            onUpdateCandidate={(id, updates) => updateCandidate(id, updates)}
          />
        )}

        {/* L'onglet Kanban a été supprimé de la V2 */}

        {/* TAB 3 : CANDIDATS & TUTEURS (LISTE) */}
        {activeTab === 'candidates' && canAccessTab('candidates') && (
          <div className="space-y-4">

            {/* Header Database avec bouton Ajouter & Toggle Vue */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-800">Base de données joueurs</h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {filteredCandidates.length} joueur{filteredCandidates.length !== 1 ? 's' : ''} {filteredCandidates.length !== candidates.length ? `/ ${candidates.length} au total` : 'enregistrés'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Toggle Vue : Tableau (par défaut) / Grille */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      viewMode === 'table'
                        ? "bg-white text-primary shadow-xs font-black"
                        : "text-slate-500 hover:text-slate-900"
                    )}
                    title="Affichage en tableau"
                  >
                    <List className="w-3.5 h-3.5" />
                    Tableau
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      viewMode === 'grid'
                        ? "bg-white text-primary shadow-xs font-black"
                        : "text-slate-500 hover:text-slate-900"
                    )}
                    title="Affichage en grille"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Grille
                  </button>
                </div>

                {canCreateCandidate && (
                  <>
                    <button
                      onClick={() => {
                        if (isScoutRestricted && currentScout) {
                          navigate(`/recruitment-v2/add-player?scoutId=${currentScout.id}&returnTab=${activeTab}`);
                        } else {
                          navigate('/recruitment-v2/add-player');
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/25 hover:bg-primary/90 active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter Joueur
                    </button>

                    {canManageReports && (
                      <button
                        onClick={() => navigate('/recruitment-v2/add-report')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer"
                        title="Rédiger un rapport scout pour un candidat"
                      >
                        <ClipboardList className="w-4 h-4" />
                        Ajouter un rapport
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Barre de Filtre Complet (Placée directement au-dessus du tableau) */}
            <div className="bg-white rounded-3xl p-4 md:p-5 border shadow-sm space-y-3">
              {/* LIGNE 0 : Filtres Marocains / Africains (sans bouton Tous) + Filtres Rapides de Statut (sans icônes) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 gap-1 flex-wrap mr-1">
                    {/* Filtre : Marocains */}
                    <button
                      type="button"
                      onClick={() => setNationalityTagFilter(prev => prev === 'marocains' ? 'all' : 'marocains')}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs",
                        nationalityTagFilter === 'marocains'
                          ? "bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-400/40"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white"
                      )}
                      title={nationalityTagFilter === 'marocains' ? "Cliquez pour désactiver le filtre Marocains" : "Afficher les joueurs de nationalité marocaine"}
                    >
                      <span>Marocains</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none",
                        nationalityTagFilter === 'marocains'
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-700"
                      )}>
                        {nationalityCounts.morocCount}
                      </span>
                    </button>

                    {/* Filtre : Africains */}
                    <button
                      type="button"
                      onClick={() => setNationalityTagFilter(prev => prev === 'africains' ? 'all' : 'africains')}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs",
                        nationalityTagFilter === 'africains'
                          ? "bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-400/40"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white"
                      )}
                      title={nationalityTagFilter === 'africains' ? "Cliquez pour désactiver le filtre Africains" : "Afficher les joueurs de nationalité africaine"}
                    >
                      <span>Africains</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none",
                        nationalityTagFilter === 'africains'
                          ? "bg-slate-950/20 text-slate-950"
                          : "bg-slate-200 text-slate-700"
                      )}>
                        {nationalityCounts.afriCount}
                      </span>
                    </button>
                  </div>

                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 mr-1">
                    Statuts :
                  </span>

                  {/* Filtre Rapide : À suivre */}
                  <div className="inline-flex items-center p-1 bg-indigo-50 rounded-2xl border border-indigo-200/80">
                    <button
                      type="button"
                      onClick={() => setDecisionFilter(prev => prev === 'to_follow' ? 'ALL' : 'to_follow')}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs",
                        decisionFilter === 'to_follow'
                          ? "bg-indigo-600 text-white font-black shadow-xs ring-2 ring-indigo-400/40"
                          : "text-indigo-800 hover:bg-white"
                      )}
                      title="Filtrer les talents positionnés en veille active (À suivre)"
                    >
                      <span>À suivre</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none",
                        decisionFilter === 'to_follow'
                          ? "bg-white/20 text-white"
                          : "bg-indigo-200 text-indigo-900"
                      )}>
                        {scopedCandidates.filter(c => getCandidateLatestDecision(c) === 'to_follow').length}
                      </span>
                    </button>
                  </div>

                  {/* Filtre Rapide : Inviter à un test */}
                  <div className="inline-flex items-center p-1 bg-blue-50 rounded-2xl border border-blue-200/80">
                    <button
                      type="button"
                      onClick={() => setDecisionFilter(prev => prev === 'invitation_test' ? 'ALL' : 'invitation_test')}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs",
                        decisionFilter === 'invitation_test'
                          ? "bg-blue-600 text-white font-black shadow-xs ring-2 ring-blue-400/40"
                          : "text-blue-800 hover:bg-white"
                      )}
                      title="Filtrer les talents convoqués pour match d'essai ou détection"
                    >
                      <span>Inviter à un test</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none",
                        decisionFilter === 'invitation_test'
                          ? "bg-white/20 text-white"
                          : "bg-blue-200 text-blue-900"
                      )}>
                        {scopedCandidates.filter(c => getCandidateLatestDecision(c) === 'invitation_test').length}
                      </span>
                    </button>
                  </div>

                  {/* Filtre Rapide : À recruter immédiatement */}
                  <div className="inline-flex items-center p-1 bg-emerald-50 rounded-2xl border border-emerald-200/80">
                    <button
                      type="button"
                      onClick={() => setDecisionFilter(prev => prev === 'recruit_now' ? 'ALL' : 'recruit_now')}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs",
                        decisionFilter === 'recruit_now'
                          ? "bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-400/40"
                          : "text-emerald-800 hover:bg-white"
                      )}
                      title="Filtrer uniquement les talents validés à recruter immédiatement"
                    >
                      <span>Recrutement immédiatement</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none",
                        decisionFilter === 'recruit_now'
                          ? "bg-white/20 text-white"
                          : "bg-emerald-200 text-emerald-900"
                      )}>
                        {scopedCandidates.filter(c => isCandidateRecruitNow(c)).length}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* LIGNE 1 : Recherche + Compteur de talents + Reset */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filtre global : nom, prénom, club, ville, pays, scout, évaluateur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 font-medium transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
                      title="Effacer la recherche"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-end text-xs shrink-0 flex-wrap">
                  {/* Bouton filtre rapide : Mes Joueurs Uniquement */}
                  <button
                    type="button"
                    onClick={() => setMyPlayersOnly(!myPlayersOnly)}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer",
                      myPlayersOnly
                        ? "bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-indigo-500/25 scale-105"
                        : "bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/80"
                    )}
                    title="Afficher uniquement les joueurs que vous avez ajoutés / découverts"
                  >
                    <UserCheck className={cn("w-3.5 h-3.5", myPlayersOnly ? "text-white" : "text-indigo-600")} />
                    <span>Mes Joueurs Uniquement</span>
                  </button>

                  <span className="font-bold text-slate-700 bg-slate-100/90 px-3 py-2 rounded-xl flex items-center gap-1.5 border border-slate-200/60">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <strong>{filteredCandidates.length}</strong> / {candidates.length} talents
                  </span>

                  {isAnyFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetAllFilters}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      title="Réinitialiser tous les critères de filtre"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Réinitialiser</span>
                    </button>
                  )}
                </div>
              </div>

              {/* LIGNE 2 : Sélecteurs déroulants de filtrage complet */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100">
                {/* 1. Catégorie d'Âge */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Catégorie d'Âge
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className={cn(
                      "w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-primary transition-all",
                      categoryFilter !== 'ALL'
                        ? "border-primary bg-primary/5 text-primary font-bold shadow-2xs"
                        : "border-slate-200 bg-white text-slate-700"
                    )}
                  >
                    <option value="ALL">Toutes les catégories</option>
                    {(() => {
                      const groups = groupCategoriesByPole(visibleRecruitmentCategories);
                      return (
                        <>
                          {groups.labellise.length > 0 && (
                            <optgroup label="⚽ Pôle Labellisé (U9 - U12)">
                              {groups.labellise.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </optgroup>
                          )}
                          {groups.formation.length > 0 && (
                            <optgroup label="🎓 Pôle Formation (U13 - U21)">
                              {groups.formation.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </optgroup>
                          )}
                          {groups.senior.length > 0 && (
                            <optgroup label="🏆 Pôle Senior (U23 & Senior)">
                              {groups.senior.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </optgroup>
                          )}
                          {groups.other.length > 0 && (
                            <optgroup label="Autres">
                              {groups.other.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </optgroup>
                          )}
                        </>
                      );
                    })()}
                  </select>
                </div>

                {/* 2. Poste de Jeu */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Poste de Jeu
                  </label>
                  <select
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    className={cn(
                      "w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-primary transition-all",
                      positionFilter !== 'ALL'
                        ? "border-primary bg-primary/5 text-primary font-bold shadow-2xs"
                        : "border-slate-200 bg-white text-slate-700"
                    )}
                  >
                    <option value="ALL">Tous les postes</option>
                    {PLAYER_POSITIONS.map(pos => (
                      <option key={pos.code} value={pos.code}>
                        {pos.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Pied Fort */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Pied Fort
                  </label>
                  <select
                    value={footFilter}
                    onChange={(e) => setFootFilter(e.target.value)}
                    className={cn(
                      "w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-primary transition-all",
                      footFilter !== 'ALL'
                        ? "border-primary bg-primary/5 text-primary font-bold shadow-2xs"
                        : "border-slate-200 bg-white text-slate-700"
                    )}
                  >
                    {FOOT_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Scout (Réservé à la Direction) */}
                {isRecruitmentAdmin ? (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      Scout
                    </label>
                    <select
                      value={scoutFilter}
                      onChange={(e) => setScoutFilter(e.target.value)}
                      className={cn(
                        "w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-primary transition-all",
                        scoutFilter !== 'ALL'
                          ? "border-primary bg-primary/5 text-primary font-bold shadow-2xs"
                          : "border-slate-200 bg-white text-slate-700"
                      )}
                    >
                      <option value="ALL">Tous les scouts</option>
                      {scouts.map(scout => {
                        const cleanRole = (!scout.role_title || scout.role_title.includes('Scout') || scout.role_title.includes('Détecteur') || scout.role_title.includes('Recruteur'))
                          ? 'Scout'
                          : scout.role_title;
                        return (
                          <option key={scout.id} value={scout.full_name}>
                            {scout.full_name} ({cleanRole})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div className="hidden lg:block" />
                )}
              </div>

              {/* LIGNE 3 : Badges des filtres actifs */}
              {isAnyFilterActive && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
                  <span className="font-bold text-slate-400 flex items-center gap-1 mr-1">
                    <Filter className="w-3 h-3 text-primary" />
                    Filtres actifs :
                  </span>

                  {nationalityTagFilter !== 'all' && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200 flex items-center gap-1">
                      Origine : {nationalityTagFilter === 'marocains' ? 'Marocains' : 'Africains'}
                      <button
                        type="button"
                        onClick={() => setNationalityTagFilter('all')}
                        className="hover:text-rose-600 font-bold ml-0.5 cursor-pointer"
                        title="Désactiver ce filtre"
                      >
                        ×
                      </button>
                    </span>
                  )}

                  {searchQuery && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200 flex items-center gap-1">
                      Recherche : "{searchQuery}"
                      <button onClick={() => setSearchQuery('')} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                    </span>
                  )}

                  {categoryFilter !== 'ALL' && (
                    <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20 flex items-center gap-1">
                      Catégorie : {categoryFilter}
                      <button onClick={() => setCategoryFilter('ALL')} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                    </span>
                  )}

                  {positionFilter !== 'ALL' && (
                    <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20 flex items-center gap-1">
                      Poste : {positionFilter}
                      <button onClick={() => setPositionFilter('ALL')} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                    </span>
                  )}

                  {footFilter !== 'ALL' && (
                    <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20 flex items-center gap-1">
                      Pied : {footFilter}
                      <button onClick={() => setFootFilter('ALL')} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                    </span>
                  )}

                  {scoutFilter !== 'ALL' && (
                    <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20 flex items-center gap-1">
                      Scout : {scoutFilter}
                      <button onClick={() => setScoutFilter('ALL')} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                    </span>
                  )}

                  {decisionFilter !== 'ALL' && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-900 font-bold border border-slate-300 flex items-center gap-1">
                      Statut : {decisionFilter === 'recruit_now' ? 'Recrutement immédiatement' : decisionFilter === 'invitation_test' ? 'Inviter à un test' : 'À suivre'}
                      <button onClick={() => setDecisionFilter('ALL')} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bandeau d'Actions Groupées (Si des joueurs sont sélectionnés) */}
            {selectedCandidateIds.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 px-4 bg-indigo-50/90 border border-indigo-200 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-xs">
                    {selectedCandidateIds.length}
                  </span>
                  <span className="text-xs font-bold text-indigo-950">
                    joueur{selectedCandidateIds.length > 1 ? 's' : ''} sélectionné{selectedCandidateIds.length > 1 ? 's' : ''} {selectedVisibleCount < selectedCandidateIds.length ? `(${selectedVisibleCount} visible${selectedVisibleCount > 1 ? 's' : ''})` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Tout désélectionner
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsBulkArchiveModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Archiver les joueurs sélectionnés"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archiver ({selectedCandidateIds.length})</span>
                  </button>

                  {canDeleteAnyCandidate && (
                    <button
                      type="button"
                      onClick={() => setIsBulkDeleteModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Supprimer définitivement les joueurs sélectionnés"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer ({selectedCandidateIds.length})</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bannière Dédiée : Directeur Administratif / Recrutement Immédiat Exclusif */}
            {isOnlyRecruitNowUser && (
              <div className="p-4 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-emerald-500/10 border border-rose-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
                <div>
                  <p className="font-black text-slate-900">Espace Procédure Administrative de Recrutement Immédiat</p>
                  <p className="text-slate-500 text-[11px]">Affichage exclusif des profils ayant le statut à recruter immédiatement.</p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-white border border-rose-200 text-rose-700 font-black text-xs shadow-2xs whitespace-nowrap">
                  {filteredCandidates.length} joueur{filteredCandidates.length > 1 ? 's' : ''} à traiter
                </span>
              </div>
            )}

            {filteredCandidates.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border shadow-sm text-center space-y-2">
                <Users className="w-8 h-8 text-muted-foreground mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">Aucun profil ne correspond à ce filtre</h3>
                <p className="text-xs text-muted-foreground">
                  Essayez d'ajuster ou d'effacer votre terme de recherche dans la barre unique ci-dessus.
                </p>
              </div>
            ) : viewMode === 'table' ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <tr>
                        {canDeleteAnyCandidate && (
                          <th className="py-3.5 px-3 w-10 text-center">
                            <input
                              ref={headerCheckboxRef}
                              type="checkbox"
                              checked={isAllSelected}
                              onChange={handleToggleSelectAll}
                              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/30 cursor-pointer transition-all"
                              title={isAllSelected ? "Tout désélectionner" : "Tout sélectionner"}
                              aria-label="Sélectionner tous les joueurs visibles"
                            />
                          </th>
                        )}
                        <th className="py-3.5 px-4">Joueur</th>
                        <th className="py-3.5 px-3">Scout Détecteur</th>
                        {isRecruitmentAdmin && (
                          <th className="py-3.5 px-3 text-center">Scores Détecteur (5 Piliers)</th>
                        )}
                        <th className="py-3.5 px-3">Statut</th>
                        {!isOnlyRecruitNowUser && (
                          <th className="py-3.5 px-4 text-right min-w-[360px]">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredCandidates.map((c) => {
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

                        // 2. Dernier potentiel du joueur (0.0 strict si aucun rapport)
                        const potentialScore = resolveCandidatePotentialScore(c, latestEval, candEvalsList.length);

                        const candTests = tests.filter(t => t.candidate_id === c.id || t.candidate_ids?.includes(c.id));
                        const isSelected = selectedCandidateIds.includes(c.id);

                        return (
                          <tr
                            key={c.id}
                            className={cn(
                              "transition-colors group",
                              isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-slate-50/70"
                            )}
                          >
                            {/* Case à cocher 1ère colonne (uniquement si suppression autorisée) */}
                            {canDeleteAnyCandidate && (
                              <td className="py-3 px-3 w-10 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectCandidate(c.id)}
                                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/30 cursor-pointer transition-all"
                                  aria-label={`Sélectionner ${c.first_name} ${c.last_name}`}
                                />
                              </td>
                            )}

                            {/* Joueur (avec l'intégralité du profil, poste en français et caractéristiques) */}
                            <td className="py-3 px-4">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 shadow-2xs mt-0.5">
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
                                <div className="space-y-1.5 min-w-[220px]">
                                  {canViewCandidateDetails(c) ? (
                                    <span
                                      onClick={() => openCandidateDetail(c)}
                                      className="font-bold text-sm text-slate-900 hover:text-primary cursor-pointer transition-colors block"
                                    >
                                      {c.first_name} {c.last_name}
                                    </span>
                                  ) : (
                                    <span className="font-bold text-sm text-slate-900 block select-none">
                                      {c.first_name} {c.last_name}
                                    </span>
                                  )}

                                  {/* Ligne 1 : Âge + Surclassement + Poste principal en français sans abréviation */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {renderCandidateAgeBadge(c, 'rounded-md')}
                                    {renderCandidateSurclassementBadge(c, latestEval, candEvalsList.length, 'rounded-md')}
                                    <span className="font-bold text-slate-900 text-xs tracking-tight">
                                      {getFrenchPositionLabel(c.primary_position)}
                                    </span>
                                  </div>

                                  {/* Ligne 2 : Icône pied fort uniquement • Taille / Poids */}
                                  {(c.preferred_foot || c.height_cm || c.weight_kg) && (
                                    <div className="flex items-center gap-2 text-[11px] text-slate-600 flex-wrap pt-0.5">
                                      {c.preferred_foot && (
                                        <span
                                          className="inline-flex items-center justify-center bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-lg"
                                          title={`Pied fort : ${c.preferred_foot}`}
                                          aria-label={`Pied fort : ${c.preferred_foot}`}
                                        >
                                          <PreferredFootIcon foot={c.preferred_foot} className="w-[22px] h-[22px]" />
                                        </span>
                                      )}

                                      {(c.height_cm || c.weight_kg) && (
                                        <>
                                          {c.preferred_foot && <span className="text-slate-300">•</span>}
                                          <span className="font-semibold text-slate-600 text-[11px]" title="Taille & Poids">
                                            {c.height_cm ? `${c.height_cm} cm` : '-'} / {c.weight_kg ? `${c.weight_kg} kg` : '-'}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Scout Détecteur & Auteur(s) de rapport */}
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-1 items-start">
                                {c.discovering_scout_name ? (
                                  <ScoutAvatar
                                    scoutId={c.discovering_scout_id}
                                    scoutName={c.discovering_scout_name}
                                    scouts={scouts}
                                    size="xs"
                                    showBadge
                                    badgePrefix={(isRecruitmentAdmin || isScoutManager) ? "Détecteur :" : undefined}
                                    className="bg-slate-50 text-slate-800 border border-slate-200 shadow-2xs"
                                  />
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Cellule FUS</span>
                                )}

                                {/* Mention explicite des autres scouts ayant rentré un rapport (Admin & Super Admin) */}
                                {isRecruitmentAdmin && (() => {
                                  const candEvals = evaluations.filter(e => e.candidate_id === c.id);
                                  const evalScoutsMap = new Map<string, { id?: string; name: string }>();
                                  candEvals.forEach(e => {
                                    const name = e.evaluator_name?.trim();
                                    if (name && !evalScoutsMap.has(name.toLowerCase())) {
                                      evalScoutsMap.set(name.toLowerCase(), { id: e.evaluator_id, name });
                                    }
                                  });
                                  const otherScouts = Array.from(evalScoutsMap.values()).filter(
                                    s => !c.discovering_scout_name || s.name.toLowerCase() !== c.discovering_scout_name.toLowerCase().trim()
                                  );

                                  if (otherScouts.length > 0) {
                                    return (
                                      <div className="flex flex-wrap items-center gap-1 mt-0.5" title={`Contre-rapport(s) rédigé(s) par : ${otherScouts.map(s => s.name).join(', ')}`}>
                                        {otherScouts.map((sc, i) => (
                                          <ScoutAvatar
                                            key={i}
                                            scoutId={sc.id}
                                            scoutName={sc.name}
                                            scouts={scouts}
                                            size="xs"
                                            showBadge
                                            badgePrefix="Rapport :"
                                            className="bg-indigo-50/90 text-indigo-800 border border-indigo-200 shadow-2xs"
                                          />
                                        ))}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </td>

                            {/* Scores 5 Piliers (Technique, Tactique, Physique, Mental, Potentiel) avec survol Radar & Barres de progression */}
                            {isRecruitmentAdmin && (
                              <td className="py-3 px-3 text-center">
                                <CandidatePillarsScorecard
                                  candidate={c}
                                  latestEval={latestEval}
                                  techScore={techScore}
                                  tactScore={tactScore}
                                  physScore={physScore}
                                  mentScore={mentScore}
                                  potentialScore={potentialScore}
                                  onOpenDetail={canViewCandidateDetails(c) ? () => openCandidateDetail(c) : undefined}
                                />
                              </td>
                            )}

                            {/* Colonne Statut du joueur : Bouton action si 'Recrutement immédiatement', sinon information seule sans icône */}
                            <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                              {renderCandidateStatusControl(c)}
                            </td>

                            {/* Actions : masqué si utilisateur recrutement immédiat exclusif (bouton déjà affiché à la place du statut) */}
                            {!isOnlyRecruitNowUser && (
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2.5">

                                  {/* Bouton Vidéo Google Drive */}
                                  {c.video_url ? (
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => setPlayerToWatchVideo(c)}
                                        className="w-[80px] h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center justify-center gap-1.5 text-xs font-bold shadow-2xs cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                                        title="Visionner la vidéo du joueur (Google Drive)"
                                      >
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                        <span>Play</span>
                                      </button>
                                      {canAddDriveLinkForCandidate(c) && (
                                        <button
                                          type="button"
                                          onClick={() => setCandidateForDriveLink(c)}
                                          className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center text-xs font-bold shadow-2xs cursor-pointer shrink-0"
                                          title="Modifier le lien vidéo Google Drive"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ) : canAddDriveLinkForCandidate(c) ? (
                                    <button
                                      type="button"
                                      onClick={() => setCandidateForDriveLink(c)}
                                      className="w-[115px] h-8 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center gap-1.5 text-xs font-bold shadow-2xs cursor-pointer shrink-0 whitespace-nowrap"
                                      title="Ajouter un lien vidéo Google Drive"
                                    >
                                      <Video className="w-3.5 h-3.5" />
                                      <span>+ Lien Drive</span>
                                    </button>
                                  ) : (
                                    <div className="w-[115px] shrink-0" />
                                  )}

                                  {/* Bouton Rapport [N] */}
                                  {canManageReports && (() => {
                                    const candEvals = [
                                      ...evaluations.filter(e => e.candidate_id === c.id),
                                      ...(c.evaluations || [])
                                    ].filter((e, idx, arr) => arr.findIndex(x => x.id === e.id) === idx);
                                    const totalCount = candEvals.length;
                                    const myCount = candEvals.filter(isEvaluationStrictlyAuthoredByCurrentScout).length;
                                    const count = (isRecruitmentAdmin || isScoutManager) ? totalCount : myCount;
                                    const titleText = isScoutManager
                                      ? `${totalCount} rapport${totalCount > 1 ? 's' : ''} au total (${myCount} rédigé${myCount > 1 ? 's' : ''} par vous, ${totalCount - myCount} par d'autres scouts — confidentiels)`
                                      : `Consulter les rapports (${count} rapport${count !== 1 ? 's' : ''})`;
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => openCandidateDetail(c, 'report')}
                                        className="w-[115px] h-8 rounded-full transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-xs shrink-0 whitespace-nowrap bg-slate-950 text-white hover:bg-slate-800 cursor-pointer"
                                        title={titleText}
                                      >
                                        <span className="font-bold text-xs text-white">Rapport</span>
                                        <span className="w-5 h-5 min-w-[20px] rounded-full flex items-center justify-center text-[11px] font-black shrink-0 leading-none shadow-2xs bg-amber-400 text-slate-950">
                                          {count}
                                        </span>
                                      </button>
                                    );
                                  })()}

                                  {/* Bouton Assigner Mission */}
                                  {canAssignMissions && (
                                    <button
                                      type="button"
                                      onClick={() => openAssignModal(c)}
                                      className="w-8 h-8 rounded-full border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 cursor-pointer flex items-center justify-center shrink-0 transition-colors"
                                      title="Assigner à un scout & confier une mission"
                                    >
                                      <UserPlus className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Modifier la fiche complète */}
                                  {canUpdateCandidateFull(c) && (
                                    <button
                                      onClick={() => {
                                        navigate(`/recruitment-v2/add-player?editId=${c.id}&returnTab=${activeTab}`);
                                      }}
                                      className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                                      title="Modifier la fiche complète du joueur"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {canDeleteCandidate(c) && (
                                    <button
                                      onClick={() => setCandidateToDelete(c)}
                                      className="w-8 h-8 rounded-full border border-slate-200 text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                                      title="Supprimer ou archiver le joueur"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredCandidates.map((c) => {
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

                  const isSelected = selectedCandidateIds.includes(c.id);

                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4",
                        isSelected ? "ring-2 ring-primary border-primary/50 bg-primary/2" : ""
                      )}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 shadow-2xs">
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
                              {canViewCandidateDetails(c) ? (
                                <h3
                                  onClick={() => openCandidateDetail(c)}
                                  className="font-bold text-sm text-foreground hover:text-primary cursor-pointer transition-colors"
                                >
                                  {c.first_name} {c.last_name}
                                </h3>
                              ) : (
                                <h3 className="font-bold text-sm text-foreground select-none">
                                  {c.first_name} {c.last_name}
                                </h3>
                              )}
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-xs text-muted-foreground font-medium">{c.primary_position}</span>
                                {renderCandidateAgeBadge(c, 'rounded-full')}
                                {renderCandidateSurclassementBadge(c, latestEval, candEvalsList.length, 'rounded-full')}
                              </div>
                            </div>
                          </div>

                          {/* Case à cocher en mode Grille */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectCandidate(c.id)}
                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/30 cursor-pointer transition-all mt-1"
                            aria-label={`Sélectionner ${c.first_name} ${c.last_name}`}
                          />
                        </div>

                        {/* Morphologie & Club */}
                        <div className="grid grid-cols-3 gap-2 mt-4 p-2.5 rounded-xl bg-slate-50 border text-center text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Pied</span>
                            <span
                              className="inline-flex items-center justify-center mt-0.5"
                              title={`Pied fort : ${c.preferred_foot}`}
                              aria-label={`Pied fort : ${c.preferred_foot}`}
                            >
                              <PreferredFootIcon foot={c.preferred_foot} className="w-[22px] h-[22px]" />
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Taille / Poids</span>
                            <span className="font-bold">{c.height_cm ? `${c.height_cm}cm` : '-'} / {c.weight_kg ? `${c.weight_kg}kg` : '-'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Nationalité & Origine</span>
                            <span className="font-bold flex items-center gap-1 text-slate-900">
                              <span className="text-xs leading-none">{getCountryFlag(c.country || c.nationality)}</span>
                              <span>{c.nationality || 'Marocaine'}</span>
                              {c.city && <span className="text-slate-500 font-medium text-[11px]">({c.city})</span>}
                            </span>
                          </div>
                        </div>

                        {c.current_club && (
                          <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5 font-medium">
                            <Shield className="w-3.5 h-3.5 text-primary" />
                            Club : <span className="font-bold text-slate-800">{c.current_club}</span>
                          </p>
                        )}

                        {/* Tuteur info if available */}
                        {c.guardian_name && (
                          <p className="text-[11px] text-amber-800 mt-1 flex items-center gap-1.5 font-medium">
                            <HeartHandshake className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            Tuteur : {c.guardian_name} ({c.guardian_relationship || 'Père'})
                          </p>
                        )}

                        {/* Scout & Mission badges */}
                        <div className="pt-2 mt-2 border-t border-slate-100 flex flex-wrap gap-1.5 text-[11px]">
                          {isRecruitmentAdmin && (() => {
                            const discScout = c.discovering_scout_name;
                            const assScout = c.assigned_scout_name;
                            const isSame = !assScout || (discScout && discScout.trim().toLowerCase() === assScout.trim().toLowerCase());

                            if (isSame && discScout) {
                              return (
                                <ScoutAvatar
                                  scoutId={c.discovering_scout_id}
                                  scoutName={discScout}
                                  scouts={scouts}
                                  size="xs"
                                  showBadge
                                  badgePrefix="Scout :"
                                  className="bg-blue-50/90 text-blue-800 border border-blue-200/80 shadow-2xs"
                                />
                              );
                            }

                            return (
                              <>
                                {discScout && (
                                  <ScoutAvatar
                                    scoutId={c.discovering_scout_id}
                                    scoutName={discScout}
                                    scouts={scouts}
                                    size="xs"
                                    showBadge
                                    badgePrefix="Scout A :"
                                    className="bg-blue-50/90 text-blue-800 border border-blue-200/80 shadow-2xs"
                                  />
                                )}
                                {assScout && (isRecruitmentAdmin || Boolean(
                                  (scoutId && (c.assigned_scout_id === scoutId || c.active_mission?.assigned_to_id === scoutId)) ||
                                  (scoutName && assScout.toLowerCase().trim() === scoutName)
                                )) && (
                                    <ScoutAvatar
                                      scoutId={c.assigned_scout_id}
                                      scoutName={assScout}
                                      scouts={scouts}
                                      size="xs"
                                      showBadge
                                      badgePrefix="Scout B :"
                                      className="bg-purple-50/90 text-purple-800 border border-purple-200/80 shadow-2xs"
                                    />
                                  )}
                              </>
                            );
                          })()}
                          {c.active_mission?.mission_title && (isRecruitmentAdmin || Boolean(
                            (scoutId && c.active_mission.assigned_to_id === scoutId) ||
                            (scoutName && c.active_mission.assigned_to_name && c.active_mission.assigned_to_name.toLowerCase().trim() === scoutName) ||
                            (authState?.user?.id && c.active_mission.assigned_to_id === authState.user.id)
                          )) && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200 truncate max-w-full">
                                <span>🎯 {c.active_mission.mission_title}</span>
                                {c.active_mission.acknowledged_at ? (
                                  <span className="text-[9px] text-emerald-700 font-extrabold bg-emerald-100 px-1 rounded">✓ Reçu</span>
                                ) : (
                                  <span className="text-[9px] text-amber-700 font-bold bg-amber-100 px-1 rounded animate-pulse">⏳ Attente</span>
                                )}
                              </span>
                            )}
                          {isRecruitmentAdmin && c.recruiter_name && !c.assigned_scout_name && (
                            <ScoutAvatar
                              scoutId={c.recruiter_id}
                              scoutName={c.recruiter_name}
                              scouts={scouts}
                              size="xs"
                              showBadge
                              badgePrefix="Recruteur :"
                              className="bg-amber-50/90 text-amber-900 border border-amber-200/80 shadow-2xs"
                            />
                          )}
                        </div>
                      </div>

                      {/* Statut du joueur : bouton action si recrutement immédiat, sinon information sans icône */}
                      <div className="pt-2 border-t flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider shrink-0">Statut</span>
                        {renderCandidateStatusControl(c)}
                      </div>

                      {/* Actions en mode Grid */}
                      {!isOnlyRecruitNowUser && (
                        <div className="pt-2 border-t flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2.5">
                            {/* Bouton Vidéo Google Drive : Play uniquement si le lien est présent, sinon + Drive */}
                            {c.video_url ? (
                              <div className="flex-1 flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPlayerToWatchVideo(c)}
                                  className="flex-1 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                                  title="Visionner la vidéo du joueur (Google Drive)"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>Play</span>
                                </button>
                                {canAddDriveLinkForCandidate(c) && (
                                  <button
                                    type="button"
                                    onClick={() => setCandidateForDriveLink(c)}
                                    className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 font-bold text-xs flex items-center justify-center shadow-2xs transition-all cursor-pointer shrink-0"
                                    title="Modifier le lien vidéo Google Drive"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : canAddDriveLinkForCandidate(c) ? (
                              <button
                                type="button"
                                onClick={() => setCandidateForDriveLink(c)}
                                className="flex-1 h-8 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                                title="Ajouter un lien vidéo Google Drive"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>+ Drive</span>
                              </button>
                            ) : null}

                            {canManageReports && (() => {
                              const candEvals = [
                                ...evaluations.filter(e => e.candidate_id === c.id),
                                ...(c.evaluations || [])
                              ].filter((e, idx, arr) => arr.findIndex(x => x.id === e.id) === idx);
                              const totalCount = candEvals.length;
                              const myCount = candEvals.filter(isEvaluationStrictlyAuthoredByCurrentScout).length;
                              const count = (isRecruitmentAdmin || isScoutManager) ? totalCount : myCount;
                              const titleText = isScoutManager
                                ? `${totalCount} rapport${totalCount > 1 ? 's' : ''} au total (${myCount} rédigé${myCount > 1 ? 's' : ''} par vous, ${totalCount - myCount} par d'autres scouts — confidentiels)`
                                : `Consulter les rapports (${count} rapport${count !== 1 ? 's' : ''})`;
                              return (
                                <button
                                  type="button"
                                  onClick={() => openCandidateDetail(c, 'report')}
                                  className="flex-1 h-8 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs whitespace-nowrap bg-slate-950 text-white hover:bg-slate-800 cursor-pointer"
                                  title={titleText}
                                >
                                  <span className="font-bold text-xs text-white">Rapport</span>
                                  <span className="w-5 h-5 min-w-[20px] rounded-full flex items-center justify-center text-[11px] font-black shrink-0 leading-none shadow-2xs bg-amber-400 text-slate-950">
                                    {count}
                                  </span>
                                </button>
                              );
                            })()}

                            {canAssignMissions && (
                              <button
                                type="button"
                                onClick={() => openAssignModal(c)}
                                className="w-8 h-8 rounded-full border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 cursor-pointer flex items-center justify-center shrink-0 transition-colors"
                                title="Assigner à un scout & confier une mission"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Modifier la fiche complète (protégé par CRUD update et catégorie) */}
                            {canUpdateCandidateFull(c) && (
                              <button
                                onClick={() => {
                                  navigate(`/recruitment-v2/add-player?editId=${c.id}&returnTab=${activeTab}`);
                                }}
                                className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                                title="Modifier la fiche complète du joueur"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canDeleteCandidate(c) && (
                              <button
                                onClick={() => setCandidateToDelete(c)}
                                className="w-8 h-8 rounded-full border border-slate-200 text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                                title="Supprimer ou archiver le joueur"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {/* L'onglet Observations a été supprimé de la V2 */}

        {/* TAB : MISSIONS DE DÉTECTION & OBSERVATION (US-DASH-26) */}
        {activeTab === 'missions' && canAccessTab('missions') && (
          <MissionsManagementView
            candidates={candidates}
            scouts={scouts}
            currentUser={authState?.user}
            currentScout={currentScout}
            isAdmin={isRecruitmentAdmin || isSuperAdmin}
            isScoutAdmin={(isScoutAdmin || isSuperAdmin) && !isScoutManager}
            isSuperAdmin={isSuperAdmin}
            isScoutManager={isScoutManager}
            onAcknowledgeMission={async (candidateId, missionId) => {
              const scoutId = currentScout?.id || authState?.user?.id || '';
              const scoutName = currentScout?.full_name || authState?.user?.full_name || 'Scout FUS';
              await acknowledgeMission(candidateId, missionId, scoutId, scoutName);
            }}
            onOpenCandidate={(cand) => setDetailCandidate(cand)}
            onNavigateToReport={(candidateId) => {
              navigate(`/recruitment-v2/add-report?candidateId=${candidateId}&returnTab=missions`);
            }}
            onAssignMission={handleAssignMission}
            onUnassignMission={handleUnassignMission}
          />
        )}

        {/* TAB 5 : PLANNING DES TESTS */}
        {activeTab === 'sessions' && canAccessTab('sessions') && (
          <TestCalendarView
            tests={filteredTests}
            candidates={filteredCandidates}
            evaluations={filteredEvaluations}
            scouts={scopedScouts}
            isLoading={isLoadingTests}
            onOpenNewTest={(defaultDate) => {
              setEditingTest(null);
              setNewTestDefaultDate(defaultDate);
              setIsSessionModalOpen(true);
            }}
            onSaveBatchTests={async (testsPayload) => {
              await createTestsBatch(testsPayload);
            }}
            onUpdateTest={async (id, updates) => {
              await updateTest({ id, updates });
            }}
            onEditTest={(test) => {
              setEditingTest(test);
              setNewTestDefaultDate(undefined);
              setIsSessionModalOpen(true);
            }}
            onDeleteTest={async (testId) => {
              await deleteTest(testId);
            }}
            onDeleteTests={async (testIds) => {
              await deleteTests(testIds);
            }}
            onMoveTest={async (testId, newDate) => {
              await updateTest({ id: testId, updates: { test_date: newDate } });
            }}
            onOpenEvaluationForTest={(candidate, test) => {
              setEvaluatingCandidate(candidate);
              const hasExisting = evaluations.some(e => e.candidate_id === candidate.id);
              setEvaluationInitialMode(hasExisting ? 'reevaluate' : 'create');
              setEvaluationInitialTestId(test.id);
              setIsEvaluationModalOpen(true);
            }}
          />
        )}

        {/* TAB 8 : SHORTLIST & ONZE IDÉAL (TERRAIN VERTICAL) */}
        {activeTab === 'shortlist' && canAccessTab('shortlist') && (
          <ShortlistPitchView
            candidates={candidates}
            evaluations={evaluations}
            scouts={scouts}
            isAdmin={isRecruitmentAdmin}
            onOpenCandidateDetail={(c) => canViewCandidateDetails(c) && openCandidateDetail(c)}
            onOpenEvaluationForCandidate={(c) => {
              setEvaluatingCandidate(c);
              setEvaluationInitialMode('create');
              setIsEvaluationModalOpen(true);
            }}
            onUpdateCandidate={(id, updates) => updateCandidate(id, updates)}
          />
        )}

        {/* TAB : COMPARATEUR RADAR */}
        {activeTab === 'compare' && canAccessTab('compare') && (
          <RadarComparisonView
            candidates={filteredCandidates}
            evaluations={evaluations}
            onOpenEvaluation={(c) => {
              setEvaluatingCandidate(c);
              setEvaluationInitialMode('create');
              setIsEvaluationModalOpen(true);
            }}
          />
        )}

        {/* TAB : ARCHIVES (JOUEURS ARCHIVÉS AVEC LEURS RAPPORTS) */}
        {activeTab === 'archives' && canAccessTab('archives') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 bg-white p-5 rounded-2xl border shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Archives — Joueurs & Rapports</h2>
                  <p className="text-[11px] text-slate-500">
                    {filteredArchivedCandidates.length} joueur{filteredArchivedCandidates.length > 1 ? 's' : ''} archivé{filteredArchivedCandidates.length > 1 ? 's' : ''} (historique, observations et rapports préservés)
                  </p>
                </div>
              </div>
            </div>

            {filteredArchivedCandidates.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Archive className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">Aucun joueur archivé</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Lorsqu'un joueur est supprimé de la base de données active, vous pouvez choisir de l'archiver pour conserver l'ensemble de ses rapports et historiques.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Joueur</th>
                      <th className="py-3 px-4">Poste & Catégorie</th>
                      <th className="py-3 px-4">Club d'origine</th>
                      <th className="py-3 px-4">Rapports liés</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredArchivedCandidates.map(c => {
                      const candEvals = evaluations.filter(e => e.candidate_id === c.id);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs overflow-hidden shrink-0 border">
                                {c.photo_url ? (
                                  <img src={c.photo_url} alt={c.first_name} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{c.first_name[0]}{c.last_name[0]}</span>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 leading-snug">{c.first_name} {c.last_name}</p>
                                <p className="text-[10px] text-slate-400">{c.nationality || 'Maroc'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px]">
                                {c.primary_position || 'N/A'}
                              </span>
                              <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                                {c.age_category || 'U19'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {c.current_club || c.origin_club || 'Non renseigné'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-200/60 inline-flex items-center gap-1">
                              <FileText className="w-3 h-3 text-indigo-600" />
                              {candEvals.length} rapport{candEvals.length > 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canManageReports && (
                                <button
                                  type="button"
                                  onClick={() => openCandidateDetail(c, 'report')}
                                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
                                  title="Consulter les rapports et l'historique"
                                >
                                  <Eye className="w-3.5 h-3.5 text-primary" />
                                  <span>Consulter</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={async () => {
                                  await updateCandidate(c.id, { pipeline_stage: 'prospect', status: 'registered' });
                                  toast.success(`Le joueur ${c.first_name} ${c.last_name} a été restauré dans la Database !`);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                title="Restaurer le joueur dans la base active"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Restaurer</span>
                              </button>

                              {canDeleteCandidate(c) && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`Supprimer DÉFINITIVEMENT ${c.first_name} ${c.last_name} et tous ses rapports de la base de données ?`)) {
                                      await deleteCandidate(c.id);
                                      toast.success(`Le joueur a été supprimé définitivement.`);
                                    }
                                  }}
                                  className="p-1.5 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Supprimer définitivement"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {availableV2Tabs.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Accès restreint au module Détection</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                Vous n'avez de permissions actives pour aucune rubrique de ce module. Veuillez contacter un administrateur pour configurer vos droits d'accès.
              </p>
            </div>
          </div>
        )}

      </div> {/* FIN DU WRAPPER */}

      {isEvaluationModalOpen && evaluatingCandidate && (
        <EvaluationModal
          isOpen={isEvaluationModalOpen}
          onClose={() => {
            setIsEvaluationModalOpen(false);
            setEvaluatingCandidate(null);
            setEvaluationInitialTestId(undefined);
          }}
          candidate={evaluatingCandidate}
          existingEvaluation={evaluations.find(e => e.candidate_id === evaluatingCandidate.id)}
          evaluations={evaluations}
          initialMode={evaluationInitialMode}
          tests={tests}
          scouts={scopedScouts}
          initialTestId={evaluationInitialTestId}
          onAddPlayer={() => {
            setIsEvaluationModalOpen(false);
            setEvaluatingCandidate(null);
            navigate('/recruitment-v2/add-player');
          }}
          onSave={async (evalData, options) => {
            await saveEvaluation(evalData, options);
          }}
          onDelete={async (evalId) => {
            const ev = evaluations.find(e => e.id === evalId);
            if (ev && !canDeleteEvaluation(ev)) {
              toast.error("Vous ne pouvez pas supprimer un rapport rédigé par un autre scout.");
              return;
            }
            await deleteEvaluation(evalId);
          }}
          onOpenScheduleTest={(cand) => {
            handleOpenScheduleTestForCandidate(cand);
          }}
        />
      )}

      {isObservationModalOpen && observingCandidate && (
        <ObservationModal
          isOpen={isObservationModalOpen}
          onClose={() => {
            setIsObservationModalOpen(false);
            setObservingCandidate(null);
          }}
          candidate={observingCandidate}
          scouts={scopedScouts}
          onSave={async (obsData) => {
            await createObservation(obsData);
          }}
        />
      )}

      {isSessionModalOpen && (
        <TrialSessionModal
          isOpen={isSessionModalOpen}
          onClose={() => {
            setIsSessionModalOpen(false);
            setEditingTest(null);
            setSchedulingCandidate(null);
            setNewTestDefaultDate(undefined);
          }}
          candidates={scopedCandidates}
          scouts={scopedScouts}
          initialTest={editingTest}
          defaultDate={newTestDefaultDate}
          defaultCandidateId={schedulingCandidate?.id}
          onSave={async (testData) => {
            await createTest(testData);
          }}
          onSaveBatch={async (testsPayload) => {
            await createTestsBatch(testsPayload);
          }}
          onUpdate={async (id, updates) => {
            await updateTest({ id, updates });
          }}
        />
      )}


      {/* LECTEUR VIDÉO DÉTECTION & GOOGLE DRIVE */}
      {playerToWatchVideo && (
        <PlayerVideoModal
          isOpen={!!playerToWatchVideo}
          onClose={() => setPlayerToWatchVideo(null)}
          candidate={playerToWatchVideo}
          onEditLink={canAddDriveLinkForCandidate(playerToWatchVideo) ? (cand) => setCandidateForDriveLink(cand) : undefined}
        />
      )}

      {/* MODAL RAPIDE AJOUT / MODIFICATION DU LIEN GOOGLE DRIVE (US-DASH-59) */}
      {candidateForDriveLink && (
        <CandidateDriveLinkModal
          isOpen={!!candidateForDriveLink}
          onClose={() => setCandidateForDriveLink(null)}
          candidate={candidateForDriveLink}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
            queryClient.invalidateQueries({ queryKey: ['recruitment'] });
          }}
        />
      )}

      {/* MODAL PROCÉDURE ADMINISTRATIVE POUR RECRUTEMENT IMMÉDIAT */}
      {candidateForAdminProcedure && (
        <AdministrativeProcedureModal
          isOpen={!!candidateForAdminProcedure}
          onClose={() => setCandidateForAdminProcedure(null)}
          candidate={candidateForAdminProcedure}
          onSave={async (candidateId, updates) => {
            await updateCandidate({
              id: candidateId,
              updates
            });
            queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
            queryClient.invalidateQueries({ queryKey: ['recruitment'] });
          }}
        />
      )}

      {/* MODAL RESET CELLULE RECRUTEMENT */}
      {isResetModalOpen && (
        <RecruitmentResetModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          currentUserEmail={authState.email}
          candidatesCount={candidates.length}
          evaluationsCount={evaluations.length}
          observationsCount={observations.length}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
            queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.evaluations });
            queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.observations });
            queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.tests });
            queryClient.invalidateQueries({ queryKey: ['recruitment'] });
          }}
        />
      )}

      {/* MODAL GESTION DES CRITÈRES SCOUT (SUPER ADMIN) */}
      {isSuperAdmin && isCriteriaManagerOpen && (
        <ScoutCriteriaManagerModal
          isOpen={isCriteriaManagerOpen}
          onClose={() => setIsCriteriaManagerOpen(false)}
        />
      )}

      {/* MODAL RAPPORT DE SCOUT (3 Onglets à l'ancienne : 3. Rapport, 4. Qualités, 5. Rapport Scout) */}
      {isReportWizardOpen && (
        <CandidateModal
          isOpen={isReportWizardOpen}
          mode="report_only"
          initialTab="sport"
          onClose={() => {
            setIsReportWizardOpen(false);
            setReportWizardCandidate(null);
          }}
          candidate={reportWizardCandidate || (candidates[0] as TrialCandidate)}
          scouts={scopedScouts}
          onSave={async (data, evalData) => {
            const targetCand = reportWizardCandidate || candidates[0];
            if (targetCand?.id) {
              await updateCandidate({ id: targetCand.id, updates: data });
              if (evalData) {
                await saveEvaluation({ ...evalData, candidate_id: targetCand.id });
              }
              toast.success(`Rapport scout enregistré pour ${targetCand.first_name} ${targetCand.last_name} !`);
            }
            setIsReportWizardOpen(false);
            setReportWizardCandidate(null);
            queryClient.invalidateQueries({ queryKey: ['recruitment'] });
          }}
        />
      )}
      {/* Popup de confirmation : Ajouter un rapport ou pas encore */}
      {createdPromptCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900">
                Joueur enregistré avec succès !
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                La fiche de <strong className="text-slate-800">{createdPromptCandidate.name}</strong> a bien été créée dans la base de détection.
              </p>
              <div className="p-3.5 bg-indigo-50/80 rounded-2xl border border-indigo-100 mt-3 text-left">
                <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-indigo-600 shrink-0" />
                  Voulez-vous ajouter un rapport dès maintenant ?
                </p>
                <p className="text-[11px] text-indigo-700/80 mt-1">
                  Vous pourrez renseigner l'impression générale, le contexte d'observation et les qualités du joueur.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCreatedPromptCandidate(null)}
                className="w-full sm:flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer order-2 sm:order-1"
              >
                Pas encore
              </button>

              <button
                type="button"
                onClick={() => {
                  const id = createdPromptCandidate.id;
                  setCreatedPromptCandidate(null);
                  navigate(id ? `/recruitment-v2/add-report?candidateId=${id}` : '/recruitment-v2/add-report');
                }}
                className="w-full sm:flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer order-1 sm:order-2"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Oui, ajouter un rapport</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Popup / Panel de Confirmation : Suppression vs Archivage du Joueur */}
      {candidateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <Archive className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900">
                Voulez-vous vraiment supprimer ce joueur ?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Vous êtes sur le point de retirer <strong className="text-slate-900">{candidateToDelete.first_name} {candidateToDelete.last_name}</strong> de la base de données active.
              </p>

              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/70 text-left space-y-1.5 mt-3">
                <p className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <Archive className="w-4 h-4 text-amber-600 shrink-0" />
                  Archivage recommandé (sécurité des données)
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Tous les <strong>rapports de scout</strong>, évaluations, notes et historiques liés au joueur seront automatiquement conservés et transférés dans la rubrique <strong>Archives</strong>. Vous pourrez le consulter ou le restaurer à tout moment.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingCandidate}
                onClick={async () => {
                  const target = candidateToDelete;
                  if (!target) return;
                  setIsDeletingCandidate(true);
                  try {
                    await updateCandidate(target.id, { pipeline_stage: 'archived', status: 'archived' });
                    toast.success(`Le joueur ${target.first_name} ${target.last_name} et ses rapports ont été déplacés dans les Archives !`, { icon: '📦' });
                    setCandidateToDelete(null);
                  } catch (err: any) {
                    console.error('Erreur archivage joueur:', err);
                  } finally {
                    setIsDeletingCandidate(false);
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingCandidate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                <span>Archiver le joueur et ses rapports (Recommandé)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isDeletingCandidate}
                  onClick={() => setCandidateToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  disabled={isDeletingCandidate}
                  onClick={async () => {
                    const target = candidateToDelete;
                    if (!target) return;
                    if (!canDeleteCandidate(target)) {
                      toast.error("Action refusée : seul un administrateur peut supprimer un joueur entré par l'administration.");
                      setCandidateToDelete(null);
                      return;
                    }
                    setIsDeletingCandidate(true);
                    try {
                      await deleteCandidate(target.id);
                      toast.success(`Le joueur ${target.first_name} ${target.last_name} a été supprimé définitivement.`);
                      setCandidateToDelete(null);
                    } catch (err: any) {
                      console.error("Erreur suppression joueur:", err);
                    } finally {
                      setIsDeletingCandidate(false);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  title="Supprimer définitivement"
                >
                  {isDeletingCandidate && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Supprimer définitivement</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BARRE D'ACTIONS GROUPÉES FLOTTANTE (Fixée en bas de l'écran lors du scroll) */}
      {activeTab === 'candidates' && selectedCandidateIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2.5 pr-3 border-r border-slate-700">
            <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-black text-xs">
              {selectedCandidateIds.length}
            </span>
            <span className="text-xs font-bold text-slate-200">
              Sélectionné{selectedCandidateIds.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkArchiveModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archiver ({selectedCandidateIds.length})</span>
            </button>

            {canDeleteAnyCandidate && (
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer ({selectedCandidateIds.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClearSelection}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Désélectionner tout"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMATION : SUPPRESSION MULTIPLE DÉFINITIVE */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <Trash2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900">
                Suppression multiple de {selectedCandidates.length} joueur{selectedCandidates.length > 1 ? 's' : ''}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Vous êtes sur le point de retirer définitivement <strong className="text-slate-900">{selectedCandidates.length} joueur{selectedCandidates.length > 1 ? 's' : ''}</strong> de la base de données.
              </p>

              {/* Aperçu des noms des joueurs sélectionnés */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left max-h-36 overflow-y-auto custom-scrollbar space-y-1">
                {selectedCandidates.map(cand => (
                  <div key={cand.id} className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-slate-100">
                    <span className="font-bold text-slate-800">{cand.first_name} {cand.last_name}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{cand.primary_position} • {cand.age_category || 'U19'}</span>
                  </div>
                ))}
              </div>

              {nonDeletableSelectedCount > 0 && !isAdmin && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left text-xs text-amber-800 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    {nonDeletableSelectedCount} profil(s) créé(s) par l'administration
                  </p>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    En tant que Scout Manager, vous ne pouvez pas supprimer définitivement les profils admin. Ces profils seront ignorés ou vous pouvez choisir de tous les archiver.
                  </p>
                </div>
              )}

              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/70 text-left space-y-1.5 mt-2">
                <p className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <Archive className="w-4 h-4 text-amber-600 shrink-0" />
                  Alternative : Archivage recommandé
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  L'archivage conserve l'ensemble des rapports, notes et évaluations tout en retirant les joueurs de la liste active. Vous pourrez les restaurer à tout moment.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingCandidate}
                onClick={async () => {
                  const idsToArchive = selectedCandidateIds;
                  if (idsToArchive.length === 0) {
                    setIsBulkDeleteModalOpen(false);
                    return;
                  }
                  setIsDeletingCandidate(true);
                  try {
                    await archiveCandidates(idsToArchive);
                    toast.success(`${idsToArchive.length} joueur${idsToArchive.length > 1 ? 's et leurs rapports ont été déplacés' : ' a été déplacé'} dans les Archives !`, { icon: '📦' });
                    setIsBulkDeleteModalOpen(false);
                    setSelectedCandidateIds([]);
                  } catch (err: any) {
                    console.error('Erreur archivage multiple:', err);
                  } finally {
                    setIsDeletingCandidate(false);
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingCandidate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                <span>Archiver la sélection (Recommandé)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isDeletingCandidate}
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  disabled={isDeletingCandidate}
                  onClick={async () => {
                    const idsToDelete = isAdmin
                      ? selectedCandidateIds
                      : selectedCandidatesWithDeletePermission.map(c => c.id);

                    if (idsToDelete.length === 0) {
                      toast.error("Action refusée : aucun des joueurs sélectionnés n'est supprimable avec votre rôle.");
                      setIsBulkDeleteModalOpen(false);
                      return;
                    }

                    setIsDeletingCandidate(true);
                    try {
                      await deleteCandidates(idsToDelete);
                      toast.success(`${idsToDelete.length} joueur${idsToDelete.length > 1 ? 's ont été définitivement supprimés' : ' a été définitivement supprimé'}.`);
                      setIsBulkDeleteModalOpen(false);
                      setSelectedCandidateIds([]);
                    } catch (err: any) {
                      console.error("Erreur suppression groupée:", err);
                    } finally {
                      setIsDeletingCandidate(false);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  title="Supprimer définitivement"
                >
                  {isDeletingCandidate && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Supprimer définitivement {isAdmin ? `(${selectedCandidateIds.length})` : `(${selectedCandidatesWithDeletePermission.length})`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMATION : ARCHIVAGE MULTIPLE */}
      {isBulkArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <Archive className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900">
                Archiver {selectedCandidates.length} joueur{selectedCandidates.length > 1 ? 's' : ''} ?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Les profils sélectionnés seront retirés de la base de données active et transférés dans la rubrique <strong>Archives</strong>.
              </p>

              {/* Aperçu des noms */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left max-h-36 overflow-y-auto custom-scrollbar space-y-1">
                {selectedCandidates.map(cand => (
                  <div key={cand.id} className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-slate-100">
                    <span className="font-bold text-slate-800">{cand.first_name} {cand.last_name}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{cand.primary_position} • {cand.age_category || 'U19'}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 text-left">
                Tous les rapports, évaluations et notes des scouts sont intégralement conservés. Vous pourrez restaurer chaque joueur à tout moment depuis l'onglet Archives.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingCandidate}
                onClick={() => setIsBulkArchiveModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={isDeletingCandidate}
                onClick={async () => {
                  const idsToArchive = selectedCandidateIds;
                  if (idsToArchive.length === 0) {
                    setIsBulkArchiveModalOpen(false);
                    return;
                  }
                  setIsDeletingCandidate(true);
                  try {
                    await archiveCandidates(idsToArchive);
                    toast.success(`${idsToArchive.length} joueur${idsToArchive.length > 1 ? 's ont été déplacés' : ' a été déplacé'} dans les Archives !`, { icon: '📦' });
                    setIsBulkArchiveModalOpen(false);
                    setSelectedCandidateIds([]);
                  } catch (err: any) {
                    console.error("Erreur archivage multiple:", err);
                  } finally {
                    setIsDeletingCandidate(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-lg shadow-amber-600/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeletingCandidate && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmer l'archivage</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'Assignation d'un Joueur à un Scout & Mission d'Observation */}
      {candidateToAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200 custom-scrollbar">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-xs shrink-0">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Assigner une mission d'observation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Déléguez le suivi à un scout de terrain (Scout B) et historisez les consignes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCandidateToAssign(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profil du joueur sélectionné & Scout A */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                {candidateToAssign.photo_url ? (
                  <img src={candidateToAssign.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{candidateToAssign.first_name?.[0]}{candidateToAssign.last_name?.[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-slate-900 text-sm truncate">
                    {candidateToAssign.first_name} {candidateToAssign.last_name}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black border border-indigo-200 shrink-0">
                    {candidateToAssign.age_category || 'U15'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="truncate">{candidateToAssign.primary_position || 'Poste non renseigné'}</span>
                  {candidateToAssign.current_club && (
                    <>
                      <span>•</span>
                      <span className="truncate">{candidateToAssign.current_club}</span>
                    </>
                  )}
                </div>
                <div className="mt-1.5 text-[11px] font-medium text-slate-600 flex flex-wrap items-center gap-2">
                  {(() => {
                    const discoveringScout = candidateToAssign.discovering_scout_name || currentScout?.full_name || 'Direction Recrutement FUS';
                    const assignedScout = candidateToAssign.assigned_scout_name;
                    const isSameScout = !assignedScout || (
                      assignedScout.trim().toLowerCase() === discoveringScout.trim().toLowerCase() ||
                      (Boolean(candidateToAssign.assigned_scout_id) && candidateToAssign.assigned_scout_id === candidateToAssign.discovering_scout_id)
                    );

                    if (isSameScout) {
                      return (
                        <ScoutAvatar
                          scoutId={candidateToAssign.discovering_scout_id}
                          scoutName={discoveringScout}
                          scouts={scouts}
                          size="xs"
                          showBadge
                          badgePrefix="Scout Découvreur :"
                          className="bg-blue-50/90 text-blue-800 border border-blue-200/80 shadow-2xs"
                        />
                      );
                    }

                    return (
                      <>
                        <ScoutAvatar
                          scoutId={candidateToAssign.discovering_scout_id}
                          scoutName={discoveringScout}
                          scouts={scouts}
                          size="xs"
                          showBadge
                          badgePrefix="Scout A (Découvreur) :"
                          className="bg-blue-50/90 text-blue-800 border border-blue-200/80 shadow-2xs"
                        />
                        <ScoutAvatar
                          scoutId={candidateToAssign.assigned_scout_id}
                          scoutName={assignedScout}
                          scouts={scouts}
                          size="xs"
                          showBadge
                          badgePrefix="Scout B (Assigné) :"
                          className="bg-purple-50/90 text-purple-800 border border-purple-200/80 shadow-2xs"
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Choix du Scout B (Assignataire de la mission) */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                  Scout de terrain assigné (Scout B)
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {scouts.length} scout{scouts.length > 1 ? 's' : ''} disponible{scouts.length > 1 ? 's' : ''}
                </span>
              </label>

              <select
                value={selectedScoutIdForAssign}
                onChange={(e) => setSelectedScoutIdForAssign(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-2xs cursor-pointer"
              >
                <option value="">— Non assigné (Retirer l'assignation active) —</option>
                {scouts.map((s) => {
                  const count = candidates.filter(
                    c => c.assigned_scout_id === s.id || c.discovering_scout_id === s.id
                  ).length;
                  return (
                    <option key={s.id} value={s.id}>
                      {s.full_name} • {s.role_title || 'Scout'} ({s.recruitment_region || 'Maroc'}) — {count} joueur{count > 1 ? 's' : ''} suivi{count > 1 ? 's' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Aperçu du scout B sélectionné */}
            {(() => {
              const currentSelectedScout = scouts.find(s => s.id === selectedScoutIdForAssign);
              if (!currentSelectedScout) return null;
              const assignedTotal = candidates.filter(
                c => c.assigned_scout_id === currentSelectedScout.id || c.discovering_scout_id === currentSelectedScout.id
              ).length;

              return (
                <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                    {currentSelectedScout.photo_url ? (
                      <img src={currentSelectedScout.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{currentSelectedScout.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-900 text-xs truncate">
                      {currentSelectedScout.full_name}
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5 truncate mt-0.5">
                      <span className="font-semibold text-purple-700">{currentSelectedScout.role_title || 'Scout'}</span>
                      <span>•</span>
                      <span>{currentSelectedScout.recruitment_region || 'Toutes zones'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-purple-900">{assignedTotal}</span>
                    <span className="block text-[10px] text-purple-700">joueur{assignedTotal > 1 ? 's' : ''}</span>
                  </div>
                </div>
              );
            })()}

            {/* Paramètres de la Mission si un scout B est choisi */}
            {selectedScoutIdForAssign && (
              <div className="space-y-4 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-purple-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Détails de la mission d'observation
                  </h4>
                </div>

                {/* Type de mission */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Type de Mission</label>
                  <select
                    value={assignMissionTitle}
                    onChange={(e) => setAssignMissionTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-2xs cursor-pointer"
                  >
                    <option value="Observation en match officiel">Observation en match officiel</option>
                    <option value="Détection sur tournoi">Détection sur tournoi</option>
                    <option value="Supervision séance d'entraînement">Supervision séance d'entraînement</option>
                    <option value="Évaluation approfondie 4 Piliers">Évaluation approfondie 4 Piliers</option>
                    <option value="Contre-expertise / Second regard">Contre-expertise / Second regard</option>
                    <option value="custom">Autre mission (personnalisée)</option>
                  </select>
                </div>

                {assignMissionTitle === 'custom' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Titre personnalisé de la mission</label>
                    <input
                      type="text"
                      value={assignMissionCustomTitle}
                      onChange={(e) => setAssignMissionCustomTitle(e.target.value)}
                      placeholder="Ex: Analyse comportementale et motricité..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-2xs"
                    />
                  </div>
                )}

                {/* Consignes / Description de la mission */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Consignes précises pour le scout B</span>
                    <span className="text-[10px] font-normal text-slate-400">Historisé dans le dossier</span>
                  </label>
                  <textarea
                    rows={3}
                    value={assignMissionDescription}
                    onChange={(e) => setAssignMissionDescription(e.target.value)}
                    placeholder="Précisez les points clés à observer : qualité sous pression, vitesse de déplacement, pied faible, attitude avec ses coéquipiers, consignes du coach..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-2xs resize-none"
                  />
                </div>

                {/* Priorité & Échéance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Priorité</label>
                    <div className="grid grid-cols-4 gap-1">
                      {(['low', 'medium', 'high', 'urgent'] as const).map((p) => {
                        const labels: Record<string, string> = {
                          low: 'Faible',
                          medium: 'Norm.',
                          high: 'Haute',
                          urgent: 'Urgente'
                        };
                        const isSelected = assignMissionPriority === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setAssignMissionPriority(p)}
                            className={cn(
                              "py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center",
                              isSelected
                                ? p === 'urgent' ? "bg-red-600 text-white border-red-600 shadow-xs"
                                  : p === 'high' ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                    : "bg-purple-600 text-white border-purple-600 shadow-xs"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            {labels[p]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Date limite d'évaluation</label>
                    <input
                      type="date"
                      value={assignMissionDueDate}
                      onChange={(e) => setAssignMissionDueDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-2xs cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Historique des missions précédentes du joueur */}
            {candidateToAssign.mission_history && candidateToAssign.mission_history.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Historique des missions passées ({candidateToAssign.mission_history.length})</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {candidateToAssign.mission_history.map((m, idx) => (
                    <div key={m.id || idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{m.mission_title}</span>
                        <span className={cn(
                          "px-2 py-0.2 rounded-md text-[9px] font-black uppercase",
                          m.status === 'completed' ? "bg-emerald-100 text-emerald-800" :
                            m.status === 'cancelled' ? "bg-slate-200 text-slate-700" :
                              "bg-purple-100 text-purple-800"
                        )}>
                          {m.status === 'completed' ? 'Terminée' : m.status === 'cancelled' ? 'Annulée' : 'En cours'}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[10px] flex items-center gap-2">
                        <span>Assigné à : <strong className="text-slate-700">{m.assigned_to_name}</strong></span>
                        <span>•</span>
                        <span>Par : <strong className="text-slate-700">{m.assigned_by_name}</strong></span>
                        {m.assigned_at && (
                          <>
                            <span>•</span>
                            <span>{new Date(m.assigned_at).toLocaleDateString('fr-FR')}</span>
                          </>
                        )}
                      </div>
                      {m.mission_description && (
                        <p className="text-slate-600 text-[10px] italic line-clamp-2">
                          "{m.mission_description}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions boutons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCandidateToAssign(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={isAssigningScout}
                onClick={handleConfirmAssign}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isAssigningScout ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Enregistrement de la mission...</span>
                  </>
                ) : (
                  <>
                    <Target className="w-3.5 h-3.5" />
                    <span>{selectedScoutIdForAssign ? "Confirmer la mission" : "Retirer l'assignation"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default RecruitmentV2Page;
