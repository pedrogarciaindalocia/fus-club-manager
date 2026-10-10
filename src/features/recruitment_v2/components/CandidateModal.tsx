import React, { useState, useEffect, useMemo } from 'react';
import {
  X, User, Phone, Mail, MapPin, Footprints, Shield, FileText,
  HeartHandshake, AlertCircle, Sparkles, Building2, Plus, Briefcase,
  Edit3, ShieldCheck, ShieldAlert, Clock, UserCheck, Zap, Star, XCircle,
  Target, Globe, Compass, Video, ExternalLink, Camera, Upload, Trash2, Loader2, Image as ImageIcon, Check, Users,
  FileSpreadsheet, Search, CheckCircle2, Flame, Eye, Trophy, RotateCcw, Info
} from 'lucide-react';
import type { TrialCandidate, CandidateStatus, FootType, RecommendationPriority, Scout, CandidateEvaluation, AdministrativeDocument } from '../types/recruitment';
import { RECRUITMENT_AGE_CATEGORIES, REFERENCE_PLAYER_STYLES } from '../types/recruitment';
import { AdministrativeDossierForm } from './AdministrativeDossierForm';
import { cn } from '../../../lib/utils';
import { usePlayers } from '../../../hooks/usePlayers';
import { NATIONALITIES, normalizeAgeCategory } from '../../../constants';
import { UNIFIED_POSITION_OPTIONS, formatUnifiedPosition } from '../../../constants/positions';
import { useMetrics } from '../../../hooks/useMetrics';
import { GEOGRAPHY_DATA, getContinentForCountry } from '../../../constants/geography';
import { usePermissions } from '../../../context/PermissionsContext';
import {
  getScoutPositionConfig,
  addScoutCriterion,
  updateScoutCriterion,
  deleteScoutCriterion,
  SCOUT_CRITERIA_UPDATED_EVENT,
  type ScoutPillarKey
} from '../constants/scoutCriteriaByPosition';
import { useClubData } from '../../../hooks/useClubData';
import { uploadRecruitmentPhoto } from '../utils/uploadPhoto';
import { toast } from 'sonner';
import type { Club } from '../../../types';
import { OpponentClubFormModal } from '../../club-management/components/OpponentClubFormModal';
import { LocationPicker } from './LocationPicker';
import { RichTextEditor } from '../../../components/ui/rich-text-editor';
import PlayerRadarChart from './PlayerRadarChart';
import ScoutSelect from './ScoutSelect';
import { MediaPickerModal } from '../../media-management/components/MediaPickerModal';

// Helper pour extraire l'intitulé propre d'un critère et ses détails entre parenthèses
const parseCriterion = (criterion: string) => {
  const openIndex = criterion.indexOf('(');
  const closeIndex = criterion.lastIndexOf(')');
  if (openIndex !== -1 && closeIndex > openIndex) {
    const title = criterion.substring(0, openIndex).trim();
    const detail = criterion.substring(openIndex + 1, closeIndex).trim();
    return { title, detail };
  }
  return { title: criterion.trim(), detail: null };
};

interface CandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate?: TrialCandidate | null;
  evaluation?: CandidateEvaluation | null;
  scouts: Scout[];
  onSave: (
    candidate: Omit<TrialCandidate, 'id' | 'created_at' | 'updated_at'>,
    evaluation?: Omit<CandidateEvaluation, 'id' | 'created_at'>
  ) => Promise<void>;
  mode?: 'full' | 'player_only' | 'report_only';
  initialTab?: 'scout' | 'civil' | 'sport' | 'evaluation' | 'report';
  initialScoutId?: string;
}

export const CandidateModal: React.FC<CandidateModalProps> = ({
  isOpen,
  onClose,
  candidate,
  evaluation,
  scouts,
  onSave,
  mode = 'full',
  initialTab,
  initialScoutId,
}) => {
  const { positions, getPositionByCode, updatePosition, isLoading: isMetricsLoading } = useMetrics();
  const { opponentClubs = [] } = useClubData();
  const defaultTab = initialTab || (mode === 'report_only' ? 'sport' : 'civil');
  const [activeSection, setActiveSection] = useState<'scout' | 'civil' | 'sport' | 'evaluation' | 'report'>(defaultTab);
  const [activeEvalTab, setActiveEvalTab] = useState<'tech' | 'tact' | 'phys' | 'ment'>('tech');
  const [showRadarView, setShowRadarView] = useState<boolean>(true);

  useEffect(() => {
    if (initialTab) {
      setActiveSection(initialTab);
    } else if (mode === 'report_only') {
      setActiveSection('sport');
    } else if (mode === 'player_only' || mode === 'full') {
      setActiveSection('civil');
    }
  }, [mode, initialTab]);

  const { authState, hasSubModuleAccess, canManageCategory } = usePermissions();
  const userRoles = [
    ...(authState?.roles || []),
    authState?.user?.system_role || '',
    authState?.user?.role || ''
  ].map(r => r.toLowerCase().trim());
  const isSuperAdmin = userRoles.includes('super_admin') || Boolean(authState?.isRealSuperAdmin);
  const isAdmin = isSuperAdmin || userRoles.includes('admin') || userRoles.includes('scout_admin');

  const canCreateCandidate = Boolean(isSuperAdmin || hasSubModuleAccess('candidates', 'create'));
  const canUpdateCandidate = Boolean(isSuperAdmin || hasSubModuleAccess('candidates', 'update'));

  const allowedCategories = useMemo(() => {
    if (isSuperAdmin || isAdmin) return RECRUITMENT_AGE_CATEGORIES;
    const filtered = RECRUITMENT_AGE_CATEGORIES.filter(cat => canManageCategory(cat));
    return filtered.length > 0 ? filtered : RECRUITMENT_AGE_CATEGORIES;
  }, [isSuperAdmin, isAdmin, canManageCategory]);

  // Super Admin Criteria inline management
  const [inlineAddingPillar, setInlineAddingPillar] = useState<ScoutPillarKey | null>(null);
  const [inlineNewCriterionName, setInlineNewCriterionName] = useState('');
  const [editingCriterion, setEditingCriterion] = useState<{ pillar: ScoutPillarKey; oldName: string } | null>(null);
  const [editingCriterionNewName, setEditingCriterionNewName] = useState('');
  const [activeCriterionTooltip, setActiveCriterionTooltip] = useState<string | null>(null);

  // Evaluation States
  const [techReport, setTechReport] = useState('');
  const [tactReport, setTactReport] = useState('');
  const [physReport, setPhysReport] = useState('');
  const [mentReport, setMentReport] = useState('');

  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [projection, setProjection] = useState('');

  const [criterionScores, setCriterionScores] = useState<Record<string, number>>({});
  const [criterionEnabled, setCriterionEnabled] = useState<Record<string, boolean>>({});


  // Opponent Club Modal State (Add & Edit using the exact same official form)
  const [isOpponentModalOpen, setIsOpponentModalOpen] = useState(false);
  const [selectedClubForModal, setSelectedClubForModal] = useState<Club | null>(null);
  const [opponentModalTargetField, setOpponentModalTargetField] = useState<'current' | 'previous'>('current');

  const handleOpenAddClub = (targetField: 'current' | 'previous') => {
    setSelectedClubForModal(null);
    setOpponentModalTargetField(targetField);
    setIsOpponentModalOpen(true);
  };

  const handleOpenEditClub = (clubName: string, targetField: 'current' | 'previous') => {
    const existingClub = opponentClubs.find(c => c.name.toLowerCase() === clubName.toLowerCase().trim());
    setSelectedClubForModal(existingClub || null);
    setOpponentModalTargetField(targetField);
    setIsOpponentModalOpen(true);
  };

  const handleOpponentClubSuccess = (savedClub: Club) => {
    if (opponentModalTargetField === 'current') {
      setCurrentClub(savedClub.name);
    } else {
      setPreviousClubs(prev => prev ? `${prev}, ${savedClub.name}` : savedClub.name);
    }
  };

  // Photo du Joueur
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const url = await uploadRecruitmentPhoto(file, 'players');
      setPhotoUrl(url);
      toast.success('Photo du joueur chargée avec succès', { icon: '📸' });
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du téléversement de la photo');
    } finally {
      setIsUploadingPhoto(false);
      // Réinitialiser la valeur de l'input pour permettre de re-sélectionner le même fichier si besoin
      e.target.value = '';
    }
  };

  // Identité
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [nationality, setNationality] = useState('Marocaine');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Rabat');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Représentant (parent, agent, autre)
  const [representativeType, setRepresentativeType] = useState<'parent' | 'agent' | 'autre'>('parent');
  const [representativePhone, setRepresentativePhone] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [representativeOtherDetail, setRepresentativeOtherDetail] = useState('');

  // Tuteur / Mineurs
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('Parent');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianPhoneAlt, setGuardianPhoneAlt] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [consentStatus, setConsentStatus] = useState<'pending' | 'granted' | 'refused'>('granted');

  // Sportif
  const [primaryPosition, setPrimaryPosition] = useState(positions?.[0]?.code || 'ST / CF');

  // Synchronisation dynamique du poste initial avec la liste des postes
  useEffect(() => {
    if (positions && positions.length > 0 && !candidate) {
      const exists = positions.some(p => p.code === primaryPosition || p.name === primaryPosition);
      if (!exists) {
        setPrimaryPosition(positions[0].code);
      }
    }
  }, [positions, candidate, primaryPosition]);

  const positionConfig = React.useMemo(() => {
    const config = getPositionByCode(primaryPosition);
    if (config) return config;
    return { name: primaryPosition, code: primaryPosition, emoji: '👤', category: 'MF', criteria: { technique: [], tactique: [], physique: [], mental: [] } };
  }, [primaryPosition, positions, getPositionByCode]);

  // Initialisation automatique des critères quand on change de poste
  useEffect(() => {
    const criteria = positionConfig?.criteria;
    if (!criteria) return;

    setCriterionScores(prev => {
      let hasChanges = false;
      const next = { ...prev };
      (['technique', 'tactique', 'physique', 'mental'] as ScoutPillarKey[]).forEach(pillar => {
        (criteria[pillar] || []).forEach(c => {
          const lbl = typeof c === 'string' ? c : (c as any)?.label;
          if (lbl && next[`${pillar}-${lbl}`] === undefined) {
            next[`${pillar}-${lbl}`] = 5.0;
            hasChanges = true;
          }
        });
      });
      return hasChanges ? next : prev;
    });

    setCriterionEnabled(prev => {
      let hasChanges = false;
      const next = { ...prev };
      (['technique', 'tactique', 'physique', 'mental'] as ScoutPillarKey[]).forEach(pillar => {
        (criteria[pillar] || []).forEach(c => {
          const lbl = typeof c === 'string' ? c : (c as any)?.label;
          if (lbl && next[`${pillar}-${lbl}`] === undefined) {
            next[`${pillar}-${lbl}`] = true;
            hasChanges = true;
          }
        });
      });
      return hasChanges ? next : prev;
    });
  }, [positionConfig?.code]);

  const { players: dbPlayers = [] } = usePlayers();
  const [playerSourceMode, setPlayerSourceMode] = useState<'manual' | 'database'>('manual');
  const [selectedDbPlayerId, setSelectedDbPlayerId] = useState<string>('');
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');

  const [secondaryPosition, setSecondaryPosition] = useState('');
  const [preferredFoot, setPreferredFoot] = useState<FootType>('Droitier');
  const [heightCm, setHeightCm] = useState<number | ''>(150);
  const [weightKg, setWeightKg] = useState<number | ''>(65);
  const [ageCategory, setAgeCategory] = useState(
    candidate?.age_category || (allowedCategories[0] || 'U19')
  );

  useEffect(() => {
    if (!isAdmin && !isSuperAdmin && allowedCategories.length > 0 && !allowedCategories.includes(ageCategory)) {
      setAgeCategory(allowedCategories[0]);
    }
  }, [allowedCategories, ageCategory, isAdmin, isSuperAdmin]);

  // Nouveaux indicateurs du Rapport du Joueur
  const [reportTitle, setReportTitle] = useState<string>('');
  const [matchObserved, setMatchObserved] = useState<string>('');
  const [isUpgradedCategory, setIsUpgradedCategory] = useState<boolean>(false);
  const [upgradedCategoriesCount, setUpgradedCategoriesCount] = useState<number>(1);
  const [isFirstTimeSeen, setIsFirstTimeSeen] = useState<boolean>(true);
  const [potentialRating, setPotentialRating] = useState<number>(8.0);
  const [performanceRating, setPerformanceRating] = useState<number>(7.5);
  const [isStarter, setIsStarter] = useState<boolean>(true);
  const [isFullMatch, setIsFullMatch] = useState<boolean>(true);
  const [subOutHalf, setSubOutHalf] = useState<'1st' | '2nd'>('2nd');
  const [subOutMinute, setSubOutMinute] = useState<number | ''>(60);
  const [hasSubbedIn, setHasSubbedIn] = useState<boolean>(true);
  const [subInHalf, setSubInHalf] = useState<'1st' | '2nd'>('2nd');
  const [subInMinute, setSubInMinute] = useState<number | ''>(60);
  const [teamFormation, setTeamFormation] = useState<string>('4-3-3');
  const [scoutStateDecision, setScoutStateDecision] = useState<'invitation_test' | 'recruit_now' | 'to_follow'>('to_follow');
  const [informationSource, setInformationSource] = useState<'terrain' | 'recommandation_interne' | 'recommandation_externe'>('terrain');
  const [informationSourcePerson, setInformationSourcePerson] = useState('');

  const [currentClub, setCurrentClub] = useState('');
  const [previousClubs, setPreviousClubs] = useState('');
  const [matchesPlayed, setMatchesPlayed] = useState<number | ''>('');
  const [minutesPlayed, setMinutesPlayed] = useState<number | ''>('');
  const [goals, setGoals] = useState<number | ''>('');
  const [assists, setAssists] = useState<number | ''>('');
  const [nationalSelections, setNationalSelections] = useState('');
  const [injuryHistory, setInjuryHistory] = useState('');

  // Nombre de rapports antérieurs existants pour ce joueur
  const existingReportsCount = useMemo(() => {
    return (candidate?.evaluations?.length ?? 0) + (candidate?.observations?.length ?? 0);
  }, [candidate]);

  // Calcul automatique du nombre de minutes jouées
  const calculatedMinutes = useMemo(() => {
    if (isStarter) {
      if (isFullMatch) return 90;
      if (subOutMinute === '' || isNaN(Number(subOutMinute))) return 0;
      return Math.max(0, Math.min(90, Number(subOutMinute)));
    } else {
      if (!hasSubbedIn) return 0;
      if (subInMinute === '' || isNaN(Number(subInMinute))) return 0;
      return Math.max(0, Math.min(90, 90 - Number(subInMinute)));
    }
  }, [isStarter, isFullMatch, subOutMinute, hasSubbedIn, subInMinute]);

  // Vidéo Highlights (YouTube ou Google Drive)
  const [videoType, setVideoType] = useState<'youtube' | 'drive' | 'none'>('none');
  const [videoUrl, setVideoUrl] = useState('');

  const extractYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleVideoUrlChange = (url: string) => {
    setVideoUrl(url);
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      setVideoType('youtube');
    } else if (url.includes('drive.google.com')) {
      setVideoType('drive');
    }
  };

  // Style de jeu de référence (Lions de l'Atlas)
  const [referencePlayerStyle, setReferencePlayerStyle] = useState<string>(candidate?.reference_player_style || '');

  // Dossier Administratif & Documents PDF (Recrutement Immédiat)
  const [administrativeDocuments, setAdministrativeDocuments] = useState<AdministrativeDocument[]>(candidate?.administrative_documents || []);
  const [contractType, setContractType] = useState<string>(candidate?.contract_type || 'Convention de formation');
  const [adminNotes, setAdminNotes] = useState<string>(candidate?.admin_notes || '');

  // Découverte Scout & Recruteur (tous les membres de la cellule de détection/recrutement)
  const scoutMembers = useMemo(() => scouts || [], [scouts]);
  const recruiterMembers = useMemo(() => scouts || [], [scouts]);

  const [discoveringScoutId, setDiscoveringScoutId] = useState(candidate?.discovering_scout_id || initialScoutId || scouts[0]?.id || '');
  const [recruiterId, setRecruiterId] = useState(candidate?.recruiter_id || initialScoutId || scouts[0]?.id || '');

  // Lieu de Découverte Géographique en Cascade
  const [discoveryContinent, setDiscoveryContinent] = useState('Afrique');
  const [discoveryCountry, setDiscoveryCountry] = useState('Maroc');
  const [discoveryCity, setDiscoveryCity] = useState('Rabat');
  const [discoveryCustomCity, setDiscoveryCustomCity] = useState('');
  const [discoveryLocation, setDiscoveryLocation] = useState('Rabat, Maroc');

  const [discoveryMatch, setDiscoveryMatch] = useState('');
  const [priority, setPriority] = useState<RecommendationPriority>('high');
  const [initialScore, setInitialScore] = useState<number>(8.0);
  const [scoutNotes, setScoutNotes] = useState('');
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  // LocationPicker state pour zones préférées
  const [prefContinent, setPrefContinent] = useState('Afrique');
  const [prefCountry, setPrefCountry] = useState('Maroc');
  const [prefCity, setPrefCity] = useState('Rabat');
  const [prefCustomCity, setPrefCustomCity] = useState('');
  const [prefLocationString, setPrefLocationString] = useState('');

  const [status, setStatus] = useState<CandidateStatus>('registered');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calcul automatique de l'âge et déduction de catégorie Ux
  const calculateAge = (dateStr: string) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  const getSuggestedAgeCategory = (ageVal: number | null): string => {
    let cat = 'U19';
    if (ageVal === null) cat = allowedCategories[0] || 'U19';
    else if (ageVal <= 13) cat = 'U13';
    else if (ageVal === 14) cat = 'U14';
    else if (ageVal === 15) cat = 'U15';
    else if (ageVal === 16) cat = 'U16';
    else if (ageVal === 17) cat = 'U17';
    else if (ageVal === 18) cat = 'U18';
    else if (ageVal === 19) cat = 'U19';
    else if (ageVal <= 21) cat = 'U21';
    else if (ageVal <= 23) cat = 'U23';
    else cat = 'SENIOR';

    if (allowedCategories.length > 0 && !allowedCategories.includes(cat)) {
      return allowedCategories[0];
    }
    return cat;
  };

  const handleBirthDateChange = (dateVal: string) => {
    setBirthDate(dateVal);
    const newAge = calculateAge(dateVal);
    if (newAge !== null && !candidate) {
      setAgeCategory(getSuggestedAgeCategory(newAge));
    }
  };

  const age = calculateAge(birthDate);
  const isMinor = age !== null && age < 18;

  useEffect(() => {
    if (candidate) {
      setPhotoUrl(candidate.photo_url || '');
      setFirstName(candidate.first_name || '');
      setLastName(candidate.last_name || '');
      setGender(((candidate as any).gender as 'M' | 'F') || 'M');
      setBirthDate(candidate.birth_date || '');
      setBirthPlace(candidate.birth_place || '');
      setNationality(candidate.nationality || 'Marocaine');
      setAddress(candidate.address || '');
      setCity(candidate.city || 'Rabat');
      setPhone(candidate.phone || '');
      setEmail(candidate.email || '');

      setGuardianName(candidate.guardian_name || '');
      setGuardianRelationship(candidate.guardian_relationship || 'Parent');
      setGuardianPhone(candidate.guardian_phone || '');
      setGuardianPhoneAlt(candidate.guardian_phone_alt || '');
      setGuardianEmail(candidate.guardian_email || '');
      setEmergencyContact(candidate.emergency_contact || '');
      setConsentStatus(candidate.guardian_consent_status || 'granted');

      // Initialisation Représentant (parent, agent, autre)
      const rel = (candidate.guardian_relationship || '').toLowerCase().trim();
      if (rel.includes('agent')) {
        setRepresentativeType('agent');
        setRepresentativeOtherDetail('');
      } else if (rel.includes('parent') || rel.includes('père') || rel.includes('pere') || rel.includes('mère') || rel.includes('mere')) {
        setRepresentativeType('parent');
        setRepresentativeOtherDetail('');
      } else if (candidate.guardian_relationship && candidate.guardian_relationship !== 'Parent' && candidate.guardian_relationship !== 'Père') {
        setRepresentativeType('autre');
        setRepresentativeOtherDetail(candidate.guardian_relationship);
      } else {
        setRepresentativeType('parent');
        setRepresentativeOtherDetail('');
      }
      setRepresentativePhone(candidate.guardian_phone || '');
      setRepresentativeName(candidate.guardian_name || candidate.agent_name || '');

      const resolved = getPositionByCode(candidate.primary_position);
      setPrimaryPosition(resolved?.code || candidate.primary_position);
      setSecondaryPosition(candidate.secondary_position || '');
      setPreferredFoot(candidate.preferred_foot || 'Droitier');
      setHeightCm(candidate.height_cm ?? 150);
      setWeightKg(candidate.weight_kg ?? 65);
      setAgeCategory(normalizeAgeCategory(candidate.age_category || 'U19'));
      setCurrentClub(candidate.current_club || '');
      setPreviousClubs(candidate.previous_clubs || '');
      setMatchesPlayed(candidate.matches_played ?? '');
      setMinutesPlayed(candidate.minutes_played ?? '');
      setGoals(candidate.goals ?? '');
      setAssists(candidate.assists ?? '');
      setNationalSelections(candidate.national_selections || '');
      setInjuryHistory(candidate.injury_history || '');

      // Rapport du Joueur
      const hasUpgraded = Boolean(candidate.is_upgraded_category || (candidate.surclassement && candidate.surclassement !== '0C' && candidate.surclassement !== 'Non'));
      setIsUpgradedCategory(hasUpgraded);
      if (candidate.upgraded_categories_count) {
        setUpgradedCategoriesCount(candidate.upgraded_categories_count);
      } else if (candidate.surclassement && candidate.surclassement.startsWith('+')) {
        const count = parseInt(candidate.surclassement.replace(/\D/g, ''), 10);
        setUpgradedCategoriesCount(!isNaN(count) && count >= 1 && count <= 4 ? count : 1);
      } else {
        setUpgradedCategoriesCount(1);
      }

      // Règle automatique Vu vs Déjà vu :
      // Si le joueur a déjà au moins 1 rapport d'observation enregistré, automatiquement "Déjà vu"
      const hasPriorReports = ((candidate.evaluations?.length ?? 0) + (candidate.observations?.length ?? 0)) > 0;
      setIsFirstTimeSeen(!hasPriorReports);

      setMatchObserved(candidate.discovery_match || '');
      setPotentialRating(candidate.potential_rating ?? 8.0);
      setPerformanceRating(candidate.performance_rating ?? 7.5);
      setIsStarter(candidate.is_starter ?? true);
      setIsFullMatch(true);
      setSubOutHalf('2nd');
      setSubOutMinute(60);
      setHasSubbedIn(true);
      setSubInHalf('2nd');
      setSubInMinute(60);
      setTeamFormation(candidate.team_formation || '4-3-3');
      setScoutStateDecision(candidate.scout_state_decision || 'to_follow');
      setInformationSource(candidate.information_source || 'terrain');
      setInformationSourcePerson(candidate.information_source_person || '');

      setVideoType(candidate.video_type || (candidate.video_url ? (candidate.video_url.includes('drive.google') ? 'drive' : 'youtube') : 'none'));
      setVideoUrl(candidate.video_url || '');

      setReferencePlayerStyle(candidate.reference_player_style || '');
      setAdministrativeDocuments(candidate.administrative_documents || []);
      setContractType(candidate.contract_type || 'Convention de formation');
      setAdminNotes(candidate.admin_notes || '');

      setDiscoveringScoutId(candidate.discovering_scout_id || scoutMembers[0]?.id || scouts[0]?.id || '');
      setRecruiterId(candidate.recruiter_id || recruiterMembers[0]?.id || scouts[0]?.id || '');

      if (candidate.discovery_location) {
        setDiscoveryLocation(candidate.discovery_location);
        let found = false;
        for (const [cont, countries] of Object.entries(GEOGRAPHY_DATA)) {
          for (const [country, cities] of Object.entries(countries)) {
            const matchedCity = cities.find(ct => candidate.discovery_location?.toLowerCase().includes(ct.toLowerCase()));
            if (matchedCity) {
              setDiscoveryContinent(cont);
              setDiscoveryCountry(country);
              setDiscoveryCity(matchedCity);
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (!found) {
          setDiscoveryContinent('Afrique');
          setDiscoveryCountry('Maroc');
          setDiscoveryCity('Autre');
          setDiscoveryCustomCity(candidate.discovery_location);
        }
      } else {
        setDiscoveryContinent('Afrique');
        setDiscoveryCountry('Maroc');
        setDiscoveryCity('Rabat');
        setDiscoveryCustomCity('');
        setDiscoveryLocation('Rabat, Maroc');
      }

      setDiscoveryMatch(candidate.discovery_match || '');
      setPriority(candidate.recommendation_priority || 'high');
      setInitialScore(candidate.initial_scout_score || 8.0);
      setScoutNotes(candidate.scout_recommendation_notes || '');
      setStatus(candidate.status || 'registered');
      // Zones préférées
      const locs = candidate.preferred_locations || [];
      setPreferredLocations(locs);
      if (locs.length > 0) {
        setPrefLocationString(`[VILLES] ${locs.join(', ')}`);
      }
      // Charger l'évaluation existante si présente (soit passée via prop evaluation, soit candidate.evaluations[0] hors mode report_only)
      const evalToLoad = evaluation || (mode !== 'report_only' && candidate.evaluations && candidate.evaluations.length > 0 ? candidate.evaluations[0] : null);
      if (evalToLoad) {
        if (evalToLoad.report_title) setReportTitle(evalToLoad.report_title);
        if (evalToLoad.potential_rating != null) setPotentialRating(evalToLoad.potential_rating);
        if (evalToLoad.performance_rating != null) setPerformanceRating(evalToLoad.performance_rating);

        const targetPos = evalToLoad.position_evaluated || evalToLoad.report_data?.primary_position || candidate.primary_position;
        const targetConfig = getPositionByCode(targetPos);
        if (targetConfig) {
          setPrimaryPosition(targetConfig.code);
        } else if (targetPos) {
          setPrimaryPosition(targetPos);
        }

        if (evalToLoad.tech_report) setTechReport(evalToLoad.tech_report);
        if (evalToLoad.tact_report) setTactReport(evalToLoad.tact_report);
        if (evalToLoad.phys_report) setPhysReport(evalToLoad.phys_report);
        if (evalToLoad.ment_report) setMentReport(evalToLoad.ment_report);
        if (evalToLoad.strengths) setStrengths(evalToLoad.strengths);
        if (evalToLoad.weaknesses) setWeaknesses(evalToLoad.weaknesses);
        if (evalToLoad.projection) setProjection(evalToLoad.projection);

        if (evalToLoad.report_data) {
          const rd = evalToLoad.report_data;
          if (rd.match_observed || evalToLoad.discovery_match) setMatchObserved(rd.match_observed || evalToLoad.discovery_match || '');
          if (rd.is_first_time_seen !== undefined) setIsFirstTimeSeen(rd.is_first_time_seen);
          else if (rd.observation_status !== undefined) setIsFirstTimeSeen(rd.observation_status === 'seen');
          if (rd.is_starter !== undefined) setIsStarter(rd.is_starter);
          if (rd.is_full_match !== undefined) setIsFullMatch(rd.is_full_match);
          if (rd.sub_out_half) setSubOutHalf(rd.sub_out_half);
          if (rd.sub_out_minute !== undefined) setSubOutMinute(rd.sub_out_minute);
          if (rd.has_subbed_in !== undefined) setHasSubbedIn(rd.has_subbed_in);
          if (rd.sub_in_half) setSubInHalf(rd.sub_in_half);
          if (rd.sub_in_minute !== undefined) setSubInMinute(rd.sub_in_minute);
          if (rd.team_formation) setTeamFormation(rd.team_formation);
          if (rd.scout_state_decision) setScoutStateDecision(rd.scout_state_decision as any);
          else if (evalToLoad.verdict) setScoutStateDecision(evalToLoad.verdict as any);
          if (rd.information_source) setInformationSource(rd.information_source as any);
          if (rd.information_source_person) setInformationSourcePerson(rd.information_source_person);
          if (rd.current_club) setCurrentClub(rd.current_club);
          if (rd.is_upgraded_category !== undefined) setIsUpgradedCategory(rd.is_upgraded_category);
          if (rd.upgraded_categories_count !== undefined) setUpgradedCategoriesCount(rd.upgraded_categories_count);
          if (rd.goals !== undefined) setGoals(rd.goals);
          if (rd.assists !== undefined) setAssists(rd.assists);
          if (rd.minutes_played !== undefined) setMinutesPlayed(rd.minutes_played);
        } else if (evalToLoad.discovery_match) {
          setMatchObserved(evalToLoad.discovery_match);
        }

        const activeCfg = targetConfig || positionConfig;
        const loadedScores: Record<string, number> = {};
        const loadedEnabled: Record<string, boolean> = {};

        (['technique', 'tactique', 'physique', 'mental'] as ScoutPillarKey[]).forEach(p => {
          const list = activeCfg?.criteria?.[p] || [];
          const pillarFallback =
            p === 'technique' ? (evalToLoad.technical_score ?? 7.0) :
            p === 'tactique' ? (evalToLoad.tactical_score ?? 7.0) :
            p === 'physique' ? (evalToLoad.physical_score ?? 7.0) :
            (evalToLoad.mental_score ?? 7.0);

          list.forEach(c => {
            const lbl = typeof c === 'string' ? c : (c as any)?.label;
            if (!lbl) return;
            const fullKey = `${p}-${lbl}`;
            const title = parseCriterion(lbl).title;

            let val: number | undefined;
            if (evalToLoad.criteria_scores) {
              const cs = evalToLoad.criteria_scores;
              if (cs[fullKey] !== undefined) val = Number(cs[fullKey]);
              else if (cs[lbl] !== undefined) val = Number(cs[lbl]);
              else if (cs[`${p}-${title}`] !== undefined) val = Number(cs[`${p}-${title}`]);
              else if (cs[title] !== undefined) val = Number(cs[title]);
              else {
                for (const [k, v] of Object.entries(cs)) {
                  const cleanK = k.includes('-') ? k.split('-').slice(1).join('-') : k;
                  if (cleanK.toLowerCase().trim() === lbl.toLowerCase().trim() || cleanK.toLowerCase().trim() === title.toLowerCase().trim()) {
                    val = Number(v);
                    break;
                  }
                }
              }
            }

            loadedScores[fullKey] = (val !== undefined && !isNaN(val)) ? val : pillarFallback;
            loadedEnabled[fullKey] = true;
          });
        });

        setCriterionScores(loadedScores);
        setCriterionEnabled(loadedEnabled);
      } else if (mode === 'report_only') {
        setTechReport('');
        setTactReport('');
        setPhysReport('');
        setMentReport('');
        setStrengths('');
        setWeaknesses('');
        setProjection('');
      }
    } else {
      setPhotoUrl('');
      setTechReport('');
      setTactReport('');
      setPhysReport('');
      setMentReport('');
      setStrengths('');
      setWeaknesses('');
      setProjection('');
      setRepresentativeType('parent');
      setRepresentativePhone('');
      setRepresentativeName('');
      setRepresentativeOtherDetail('');
      // Rapport du Joueur reset
      setMatchObserved('');
      setIsUpgradedCategory(false);
      setUpgradedCategoriesCount(1);
      setIsFirstTimeSeen(true);
      setPotentialRating(8.0);
      setPerformanceRating(7.5);
      setIsStarter(true);
      setIsFullMatch(true);
      setSubOutHalf('2nd');
      setSubOutMinute(60);
      setHasSubbedIn(true);
      setSubInHalf('2nd');
      setSubInMinute(60);
      setTeamFormation('4-3-3');
      setScoutStateDecision('to_follow');
      setInformationSource('terrain');
      setInformationSourcePerson('');
      setMatchesPlayed('');
      setMinutesPlayed('');
      setGoals('');
      setAssists('');
      setVideoType('none');
      setVideoUrl('');
      setReferencePlayerStyle('');
      setAdministrativeDocuments([]);
      setContractType('Convention de formation');
      setAdminNotes('');
      setSelectedDbPlayerId('');
      setPlayerSourceMode('manual');

      if (initialScoutId) {
        setDiscoveringScoutId(initialScoutId);
        setRecruiterId(initialScoutId);
      } else if (scouts && scouts.length > 0) {
        if (!discoveringScoutId || !scouts.some(s => s.id === discoveringScoutId)) {
          setDiscoveringScoutId(scouts[0].id);
        }
        if (!recruiterId || !scouts.some(s => s.id === recruiterId)) {
          setRecruiterId(scouts[0].id);
        }
      }
    }
  }, [candidate, isOpen, scouts, initialScoutId, evaluation]);

  // Sélection d'un joueur existant depuis la base de données
  const handleSelectDbPlayer = (playerId: string) => {
    setSelectedDbPlayerId(playerId);
    if (!playerId) return;
    const p = dbPlayers.find(pl => pl.id === playerId);
    if (!p) return;

    // Nom et prénom
    const full = (p.full_name || '').trim();
    const parts = full.split(' ');
    if (parts.length > 1) {
      setFirstName(parts[0]);
      setLastName(parts.slice(1).join(' '));
    } else {
      setFirstName(full);
      setLastName('');
    }

    if (p.photo_url) setPhotoUrl(p.photo_url);
    if (p.birth_date) {
      setBirthDate(p.birth_date);
      const computedAge = calculateAge(p.birth_date);
      if (computedAge !== null) {
        setAgeCategory(getSuggestedAgeCategory(computedAge));
      }
    }
    if (p.nationality) setNationality(p.nationality);
    if (p.height) setHeightCm(Number(p.height));
    if (p.weight) setWeightKg(Number(p.weight));

    // Poste
    if (p.position) {
      // Trouver la correspondance dans les positions unifiées
      const matched = positions.find(pos => pos.code.toLowerCase() === p.position?.toLowerCase() || pos.name.toLowerCase() === p.position?.toLowerCase());
      if (matched) {
        setPrimaryPosition(matched.code);
      } else {
        setPrimaryPosition(p.position);
      }
    }

    // Pied fort
    if (p.preferred_foot) {
      const footMap: Record<string, FootType> = {
        right: 'Droitier',
        left: 'Gaucher',
        both: 'Ambidextre',
        droitier: 'Droitier',
        gaucher: 'Gaucher',
        ambidextre: 'Ambidextre',
      };
      const mapped = footMap[p.preferred_foot.toLowerCase()];
      if (mapped) setPreferredFoot(mapped);
    }

    setCurrentClub('FUS Rabat');
    toast.success(`Profil pré-rempli avec succès : ${p.full_name}`, { icon: '⚽' });
  };

  const handleContinentChange = (continent: string) => {
    setDiscoveryContinent(continent);
    const countries = Object.keys(GEOGRAPHY_DATA[continent] || {});
    const firstCountry = countries[0] || '';
    setDiscoveryCountry(firstCountry);
    const cities = GEOGRAPHY_DATA[continent]?.[firstCountry] || [];
    const firstCity = cities[0] || 'Autre';
    setDiscoveryCity(firstCity);
    setDiscoveryLocation(firstCity === 'Autre' ? (discoveryCustomCity || firstCountry) : `${firstCity}, ${firstCountry}`);
  };

  const handleCountryChange = (country: string) => {
    setDiscoveryCountry(country);
    const cities = GEOGRAPHY_DATA[discoveryContinent]?.[country] || [];
    const firstCity = cities[0] || 'Autre';
    setDiscoveryCity(firstCity);
    setDiscoveryLocation(firstCity === 'Autre' ? (discoveryCustomCity || country) : `${firstCity}, ${country}`);
  };

  const handleCityChange = (cityVal: string) => {
    setDiscoveryCity(cityVal);
    if (cityVal === 'Autre') {
      setDiscoveryLocation(discoveryCustomCity ? `${discoveryCustomCity}, ${discoveryCountry}` : discoveryCountry);
    } else {
      setDiscoveryLocation(`${cityVal}, ${discoveryCountry}`);
    }
  };

  const handleCustomCityChange = (customVal: string) => {
    setDiscoveryCustomCity(customVal);
    setDiscoveryLocation(customVal ? `${customVal}, ${discoveryCountry}` : discoveryCountry);
  };
  const toggleCriterion = (pillar: ScoutPillarKey, label: string) => {
    const key = `${pillar}-${label}`;
    setCriterionEnabled(prev => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const setCriterionScore = (pillar: ScoutPillarKey, label: string, value: number) => {
    const key = `${pillar}-${label}`;
    setCriterionScores(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveInlineAdd = async () => {
    if (!inlineAddingPillar) return;
    const trimmed = inlineNewCriterionName.trim();
    if (!trimmed) {
      setInlineAddingPillar(null);
      return;
    }

    const currentList = (positionConfig.criteria[inlineAddingPillar] || []).map(c =>
      typeof c === 'string' ? c : (c as any)?.label
    );
    if (currentList.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Un critère portant ce nom existe déjà.");
      return;
    }

    const newCriteria = {
      ...positionConfig.criteria,
      [inlineAddingPillar]: [...currentList, trimmed]
    };

    // 1. Sauvegarde locale / événement synchrone
    addScoutCriterion(positionConfig.code, inlineAddingPillar, trimmed);

    // 2. Persistance Supabase
    try {
      await updatePosition({
        id: positionConfig.id || positionConfig.code,
        data: {
          code: positionConfig.code,
          name: positionConfig.name,
          emoji: positionConfig.emoji,
          category: positionConfig.category,
          criteria: newCriteria
        }
      });
    } catch (e) {
      console.warn("Mise à jour Supabase échouée mais sauvegardée localement:", e);
    }

    const key = `${inlineAddingPillar}-${trimmed}`;
    setCriterionScores((prev) => ({ ...prev, [key]: 5.0 }));
    setCriterionEnabled((prev) => ({ ...prev, [key]: true }));
    setInlineAddingPillar(null);
    setInlineNewCriterionName('');
    toast.success(`Critère "${trimmed}" ajouté au profil ${positionConfig.name}.`);
  };

  const handleSaveInlineEdit = async () => {
    if (!editingCriterion) return;
    const trimmed = editingCriterionNewName.trim();
    if (!trimmed || trimmed === editingCriterion.oldName) {
      setEditingCriterion(null);
      return;
    }

    const currentList = (positionConfig.criteria[editingCriterion.pillar] || []).map(c =>
      typeof c === 'string' ? c : (c as any)?.label
    );

    if (currentList.some(c => c.toLowerCase() === trimmed.toLowerCase() && c !== editingCriterion.oldName)) {
      toast.error("Un critère portant ce nom existe déjà.");
      return;
    }

    const newCriteria = {
      ...positionConfig.criteria,
      [editingCriterion.pillar]: currentList.map(c => c === editingCriterion.oldName ? trimmed : c)
    };

    // 1. Sauvegarde locale synchrone
    updateScoutCriterion(positionConfig.code, editingCriterion.pillar, editingCriterion.oldName, trimmed);

    // 2. Persistance Supabase
    try {
      await updatePosition({
        id: positionConfig.id || positionConfig.code,
        data: {
          code: positionConfig.code,
          name: positionConfig.name,
          emoji: positionConfig.emoji,
          category: positionConfig.category,
          criteria: newCriteria
        }
      });
    } catch (e) {
      console.warn("Mise à jour Supabase échouée mais sauvegardée localement:", e);
    }

    const oldKey = `${editingCriterion.pillar}-${editingCriterion.oldName}`;
    const newKey = `${editingCriterion.pillar}-${trimmed}`;
    setCriterionScores((prev) => {
      const next = { ...prev };
      if (next[oldKey] !== undefined) {
        next[newKey] = next[oldKey];
        delete next[oldKey];
      }
      return next;
    });
    setCriterionEnabled((prev) => {
      const next = { ...prev };
      if (next[oldKey] !== undefined) {
        next[newKey] = next[oldKey];
        delete next[oldKey];
      }
      return next;
    });
    setEditingCriterion(null);
    toast.success(`Critère renommé : "${trimmed}".`);
  };

  const handleInlineDeleteCriterion = async (pillar: ScoutPillarKey, label: string) => {
    const currentList = (positionConfig.criteria[pillar] || []).map(c =>
      typeof c === 'string' ? c : (c as any)?.label
    );
    if (currentList.length <= 1) {
      toast.error("Impossible de supprimer le dernier critère de ce pilier.");
      return;
    }

    const newCriteria = {
      ...positionConfig.criteria,
      [pillar]: currentList.filter(c => c !== label)
    };

    // 1. Sauvegarde locale synchrone
    deleteScoutCriterion(positionConfig.code, pillar, label);

    // 2. Persistance Supabase
    try {
      await updatePosition({
        id: positionConfig.id || positionConfig.code,
        data: {
          code: positionConfig.code,
          name: positionConfig.name,
          emoji: positionConfig.emoji,
          category: positionConfig.category,
          criteria: newCriteria
        }
      });
    } catch (e) {
      console.warn("Mise à jour Supabase échouée mais sauvegardée localement:", e);
    }

    const key = `${pillar}-${label}`;
    setCriterionScores((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setCriterionEnabled((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    toast.success(`Critère "${label}" retiré.`);
  };

  const renderCriterionSlider = (pillar: ScoutPillarKey, label: string) => {
    const key = `${pillar}-${label}`;
    const isEnabled = criterionEnabled[key] ?? true;
    const value = criterionScores[key] ?? 5.0;
    const isEditing = editingCriterion?.pillar === pillar && editingCriterion?.oldName === label;
    const { title, detail } = parseCriterion(label);
    const isTooltipOpen = activeCriterionTooltip === key;

    let scoreBadgeColor = 'bg-slate-100 text-slate-700';
    if (value >= 9) scoreBadgeColor = 'bg-red-50 text-primary font-black';
    else if (value >= 7.5) scoreBadgeColor = 'bg-emerald-50 text-emerald-700 font-bold';
    else if (value >= 6) scoreBadgeColor = 'bg-blue-50 text-blue-700';

    return (
      <div
        key={label}
        className={cn(
          "p-3 rounded-2xl border transition-all space-y-2 group relative",
          isEnabled
            ? "bg-slate-50/90 border-slate-200/80 hover:border-slate-300 hover:bg-white shadow-2xs"
            : "bg-slate-100/50 border-dashed border-slate-200 opacity-60"
        )}
      >
        <div className="flex justify-between items-center text-xs gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1.5 flex-1">
              <input
                type="text"
                value={editingCriterionNewName}
                onChange={(e) => setEditingCriterionNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveInlineEdit();
                  if (e.key === 'Escape') setEditingCriterion(null);
                }}
                autoFocus
                className="w-full px-2 py-0.5 text-xs rounded border border-primary bg-white text-slate-900 font-bold"
              />
              <button
                type="button"
                onClick={handleSaveInlineEdit}
                className="p-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer"
                title="Valider"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setEditingCriterion(null)}
                className="p-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                title="Annuler"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-1">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => toggleCriterion(pillar, label)}
                  className="w-4 h-4 rounded text-primary accent-primary cursor-pointer shrink-0"
                  title={isEnabled ? "Critère pris en compte dans le calcul (Coché)" : "Critère exclu / Non évalué (Décoché)"}
                />
                <span
                  onClick={() => toggleCriterion(pillar, label)}
                  onMouseEnter={() => detail && setActiveCriterionTooltip(key)}
                  onMouseLeave={() => detail && setActiveCriterionTooltip(null)}
                  className={cn(
                    "text-xs font-bold text-slate-800 cursor-pointer select-none truncate hover:text-primary transition-colors",
                    !isEnabled && "line-through text-slate-400 font-normal hover:text-slate-500"
                  )}
                  title={detail ? `${title} : ${detail}` : title}
                >
                  {title}
                </span>

                {/* Infobulle interactive lorsque le critère est survolé */}
                {detail && (
                  <div className="relative inline-flex items-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCriterionTooltip(isTooltipOpen ? null : key);
                      }}
                      onMouseEnter={() => setActiveCriterionTooltip(key)}
                      onMouseLeave={() => setActiveCriterionTooltip(null)}
                      className="text-slate-400 hover:text-primary transition-colors cursor-pointer p-0.5 rounded-full hover:bg-slate-200/60 focus:outline-hidden"
                      title={detail}
                      aria-label={`Détails pour ${title}: ${detail}`}
                    >
                      <Info className="w-3.5 h-3.5 text-slate-400 hover:text-primary" />
                    </button>

                    {isTooltipOpen && (
                      <div className="absolute left-0 bottom-full mb-1.5 z-50 w-64 sm:w-72 p-2.5 bg-slate-900/95 backdrop-blur-md text-white text-xs leading-relaxed rounded-xl shadow-xl border border-slate-700 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-1.5 font-bold text-red-400 mb-1 pb-1 border-b border-slate-800 text-[11px]">
                          <Info className="w-3 h-3 shrink-0" />
                          <span className="truncate">{title}</span>
                        </div>
                        <p className="text-slate-300 text-[11px] font-medium leading-snug">
                          {detail}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {isEnabled ? (
                  <span className={cn("px-2 py-0.5 rounded-lg text-xs font-black", scoreBadgeColor)}>
                    {value.toFixed(1)} <span className="text-[10px] opacity-70 font-normal">/10</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-200 text-slate-500 font-bold shrink-0">
                    Non évalué
                  </span>
                )}

                {/* Actions Super Admin */}
                {isSuperAdmin && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ml-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCriterion({ pillar, oldName: label });
                        setEditingCriterionNewName(label);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 transition cursor-pointer"
                      title="Modifier ce critère (Super Admin)"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInlineDeleteCriterion(pillar, label)}
                      className="p-1 rounded text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                      title="Supprimer ce critère (Super Admin)"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <input
          type="range"
          min="1"
          max="10"
          step="0.5"
          disabled={!isEnabled}
          value={value}
          onChange={(e) => setCriterionScore(pillar, label, Number(e.target.value))}
          className={cn(
            "w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary",
            isEnabled ? "bg-slate-200" : "bg-slate-100"
          )}
        />
      </div>
    );
  };

  const calcScore = (pillar: ScoutPillarKey) => {
    const criteria = positionConfig.criteria[pillar] || [];
    const active = criteria.filter(c => {
      const lbl = typeof c === 'string' ? c : (c as any)?.label;
      return criterionEnabled[`${pillar}-${lbl}`] !== false;
    });
    if (active.length === 0) return 7.0;
    const sum = active.reduce((acc, c) => {
      const lbl = typeof c === 'string' ? c : (c as any)?.label;
      return acc + (criterionScores[`${pillar}-${lbl}`] || 5.0);
    }, 0);
    return Math.round((sum / active.length) * 10) / 10;
  };

  const techScore = calcScore('technique');
  const tactScore = calcScore('tactique');
  const physScore = calcScore('physique');
  const mentScore = calcScore('mental');
  const overallScore = Math.round((techScore * 0.3 + physScore * 0.25 + tactScore * 0.25 + mentScore * 0.2) * 10) / 10;

  const renderPillarSection = (
    pillarKey: ScoutPillarKey,
    letter: string,
    title: string,
    subtitle: string,
    score: number
  ) => {
    const list = positionConfig.criteria[pillarKey] || [];
    const activeCount = list.filter(c => {
      const lbl = typeof c === 'string' ? c : (c as any)?.label;
      return criterionEnabled[`${pillarKey}-${lbl}`] !== false;
    }).length;

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b">
          <div>
            <h4 className="text-base font-black text-slate-800 flex items-center gap-2">
              <span>{letter}. Critères {title} — {positionConfig.name} ({positionConfig.code})</span>
            </h4>
            <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 font-bold">
              ({activeCount}/{list.length} critères pris en compte)
            </span>
            <div className="px-3 py-1.5 bg-rose-50 text-rose-700 font-black rounded-lg text-sm border border-rose-100 flex items-center gap-2">
              Moyenne Pilier : {score}/10
            </div>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setInlineAddingPillar(pillarKey)}
                className="px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold flex items-center gap-1 hover:bg-amber-100 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter un critère
              </button>
            )}
          </div>
        </div>

        {inlineAddingPillar === pillarKey && (
          <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
            <input
              type="text"
              autoFocus
              value={inlineNewCriterionName}
              onChange={(e) => setInlineNewCriterionName(e.target.value)}
              placeholder={`Nom du nouveau critère ${title.toLowerCase()}...`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveInlineAdd();
                if (e.key === 'Escape') setInlineAddingPillar(null);
              }}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-amber-300 bg-white focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={handleSaveInlineAdd}
              className="px-4 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold shadow hover:bg-amber-600"
            >
              Ajouter
            </button>
            <button
              type="button"
              onClick={() => setInlineAddingPillar(null)}
              className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Annuler
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((crit, idx) => {
            const lbl = typeof crit === 'string' ? crit : (crit as any)?.label;
            return (
              <React.Fragment key={`${pillarKey}-${lbl}-${idx}`}>
                {renderCriterionSlider(pillarKey, lbl)}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    // Validation des permissions CRUD et des catégories assignées
    if (mode !== 'report_only') {
      if (candidate) {
        if (!canUpdateCandidate) {
          toast.error("Action refusée : vous n'avez pas la permission de modifier ce joueur (candidates:update).");
          return;
        }
      } else {
        if (!canCreateCandidate) {
          toast.error("Action refusée : vous n'avez pas la permission d'ajouter un joueur (candidates:create).");
          return;
        }
      }
      if (!isAdmin && !isSuperAdmin && !canManageCategory(ageCategory)) {
        toast.error(`Action refusée : la catégorie ${ageCategory} ne vous est pas assignée.`);
        return;
      }
    }


    const selectedScout = scouts.find(s => s.id === discoveringScoutId) ||
      scouts.find(s => s.full_name === discoveringScoutId) ||
      scouts.find(s => s.full_name?.toLowerCase().trim() === discoveringScoutId?.toLowerCase().trim());

    const selectedRecruiter = scouts.find(s => s.id === recruiterId) ||
      scouts.find(s => s.full_name === recruiterId) ||
      scouts.find(s => s.full_name?.toLowerCase().trim() === recruiterId?.toLowerCase().trim()) ||
      selectedScout;

    // En mode player_only (Ajouter / Modifier un joueur), AUCUN rapport/évaluation ne doit être généré.
    // L'évaluation n'est incluse que si on est en mode 'report_only' ou si un vrai titre/contenu de rapport a été renseigné.
    const hasEvalData = mode === 'player_only' ? false : (
      mode === 'report_only' ||
      Boolean(
        reportTitle.trim() ||
        techReport.trim() ||
        tactReport.trim() ||
        physReport.trim() ||
        mentReport.trim() ||
        strengths.trim() ||
        weaknesses.trim() ||
        projection.trim()
      )
    );

    const evaluationPayload = hasEvalData ? {
      candidate_id: '',
      evaluator_id: discoveringScoutId || undefined,
      evaluator_name: selectedScout?.full_name || 'Scout',
      evaluator_role: selectedScout?.role_title || 'Scout',
      evaluation_date: new Date().toISOString().split('T')[0],
      report_title: reportTitle.trim() || undefined,
      position_evaluated: positionConfig.code || primaryPosition,
      report_data: {
        scout_state_decision: scoutStateDecision,
        observation_status: isFirstTimeSeen ? 'seen' : 'already_seen',
        is_first_time_seen: isFirstTimeSeen,
        match_observed: matchObserved.trim() || undefined,
        is_upgraded_category: isUpgradedCategory,
        upgraded_categories_count: isUpgradedCategory ? upgradedCategoriesCount : 0,
        primary_position: primaryPosition || candidate?.primary_position,
        secondary_position: secondaryPosition || undefined,
        preferred_foot: preferredFoot,
        height_cm: heightCm ? Number(heightCm) : undefined,
        weight_kg: weightKg ? Number(weightKg) : undefined,
        age_category: ageCategory,
        current_club: currentClub.trim() || candidate?.current_club || undefined,
        previous_clubs: previousClubs.trim() || undefined,
        is_starter: isStarter,
        is_full_match: isStarter ? isFullMatch : false,
        sub_out_half: isStarter && !isFullMatch ? subOutHalf : undefined,
        sub_out_minute: isStarter && !isFullMatch && subOutMinute !== '' ? Number(subOutMinute) : undefined,
        has_subbed_in: !isStarter ? hasSubbedIn : false,
        sub_in_half: !isStarter && hasSubbedIn ? subInHalf : undefined,
        sub_in_minute: !isStarter && hasSubbedIn && subInMinute !== '' ? Number(subInMinute) : undefined,
        team_formation: teamFormation.trim() || undefined,
        matches_played: 1,
        minutes_played: calculatedMinutes,
        goals: goals !== '' ? Number(goals) : 0,
        assists: assists !== '' ? Number(assists) : 0,
        information_source: informationSource || candidate?.information_source || 'terrain',
        information_source_person: informationSourcePerson.trim() || candidate?.information_source_person || undefined,
        video_type: videoType,
        video_url: videoUrl.trim() || undefined,
      },
      tech_report: techReport.trim() || undefined,
      tact_report: tactReport.trim() || undefined,
      phys_report: physReport.trim() || undefined,
      ment_report: mentReport.trim() || undefined,
      technical_score: techScore,
      physical_score: physScore,
      tactical_score: tactScore,
      mental_score: mentScore,
      overall_score: overallScore,
      verdict: 'undecided' as const,
      strengths: strengths.trim() || undefined,
      weaknesses: weaknesses.trim() || undefined,
      projection: projection.trim() || undefined,
      criteria_scores: (['technique', 'tactique', 'physique', 'mental'] as ScoutPillarKey[]).reduce((acc, pillar) => {
        (positionConfig.criteria[pillar] || []).forEach(c => {
          const lbl = typeof c === 'string' ? c : (c as any)?.label;
          if (lbl) {
            const scoreVal = criterionScores[`${pillar}-${lbl}`] ?? (
              pillar === 'technique' ? techScore :
              pillar === 'tactique' ? tactScore :
              pillar === 'physique' ? physScore : mentScore
            );
            acc[`${pillar}-${lbl}`] = scoreVal;
            acc[lbl] = scoreVal;
          }
        });
        return acc;
      }, {} as Record<string, number>),
    } : undefined;

    setIsSubmitting(true);
    try {
      await onSave({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender: gender || 'M',
        photo_url: photoUrl.trim() || undefined,
        birth_date: birthDate || undefined,
        birth_place: birthPlace || undefined,
        nationality,
        address: address || undefined,
        city: city || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,

        guardian_name: representativeName.trim() || guardianName || undefined,
        guardian_relationship: representativeType === 'autre'
          ? (representativeOtherDetail.trim() || 'Autre')
          : (representativeType === 'parent' ? 'Parent' : 'Agent'),
        guardian_phone: representativePhone.trim() || undefined,
        agent_name: representativeType === 'agent' ? (representativeName.trim() || undefined) : undefined,
        guardian_phone_alt: guardianPhoneAlt || undefined,
        guardian_email: guardianEmail || undefined,
        emergency_contact: emergencyContact || undefined,
        guardian_consent_status: consentStatus,

        primary_position: primaryPosition,
        secondary_position: secondaryPosition || undefined,
        preferred_foot: preferredFoot,
        height_cm: heightCm ? Number(heightCm) : undefined,
        weight_kg: weightKg ? Number(weightKg) : undefined,
        age_category: ageCategory,
        surclassement: isUpgradedCategory ? `+${upgradedCategoriesCount}C` : '0C',
        is_upgraded_category: isUpgradedCategory,
        upgraded_categories_count: isUpgradedCategory ? upgradedCategoriesCount : 0,
        is_first_time_seen: isFirstTimeSeen,
        potential_rating: Number(potentialRating),
        performance_rating: Number(performanceRating),
        is_starter: isStarter,
        team_formation: teamFormation.trim() || undefined,
        scout_state_decision: scoutStateDecision,
        information_source: informationSource,
        information_source_person: informationSourcePerson.trim() || undefined,

        current_club: currentClub.trim() || undefined,
        previous_clubs: previousClubs.trim() || undefined,
        matches_played: matchesPlayed !== '' ? Number(matchesPlayed) : 1,
        minutes_played: calculatedMinutes,
        goals: goals !== '' ? Number(goals) : 0,
        assists: assists !== '' ? Number(assists) : 0,
        national_selections: nationalSelections || undefined,
        injury_history: injuryHistory || undefined,

        discovering_scout_id: selectedScout?.id || discoveringScoutId || undefined,
        discovering_scout_name: selectedScout?.full_name || (discoveringScoutId && discoveringScoutId !== '' ? discoveringScoutId : (candidate?.discovering_scout_name || 'Scout FUS')),
        recruiter_id: selectedRecruiter?.id || recruiterId || selectedScout?.id || discoveringScoutId || undefined,
        recruiter_name: selectedRecruiter?.full_name || selectedScout?.full_name || (recruiterId && recruiterId !== '' ? recruiterId : (candidate?.recruiter_name || 'Direction Recrutement')),
        discovery_location: discoveryLocation || undefined,
        discovery_match: discoveryMatch || undefined,
        recommendation_priority: priority,
        initial_scout_score: Number(initialScore),
        scout_recommendation_notes: scoutNotes || undefined,

        video_type: videoType,
        video_url: videoUrl.trim() || undefined,

        reference_player_style: referencePlayerStyle || undefined,
        administrative_documents: administrativeDocuments.length > 0 ? administrativeDocuments : undefined,
        contract_type: contractType || undefined,
        admin_notes: adminNotes.trim() || undefined,

        preferred_locations: preferredLocations.length > 0 ? preferredLocations : undefined,

        pipeline_stage: candidate?.pipeline_stage || 'prospect',
        status,
      }, evaluationPayload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border w-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header (uniquement si mode modal standard / non player_only) */}
        {mode !== 'player_only' && (
          <div className="p-6 border-b flex items-start sm:items-center justify-between bg-slate-50/50 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">
                    {mode === 'report_only'
                      ? (evaluation ? `Modifier le Rapport : ${candidate?.first_name || ''} ${candidate?.last_name || ''}` : `Nouveau Rapport de Scout : ${candidate?.first_name || ''} ${candidate?.last_name || ''}`)
                      : (candidate ? `Fiche Candidat : ${candidate.first_name} ${candidate.last_name}` : 'Nouveau Dossier Joueur Détecté')}
                  </h3>
                  {isMinor && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                      Mineur ({age} ans)
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {mode === 'report_only'
                    ? "Formulaire officiel de rapport de détection : 1. Observation Terrain, 2. Évaluation des Qualités, 3. Rapport et Décision du Scout."
                    : "Saisie complète des informations civiles, tuteurs légaux, profil sportif et scout découvreur."}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm cursor-pointer">
              <X className="w-4 h-4" /> Annuler
            </button>
          </div>
        )}

        {/* Navigation des sous-onglets du formulaire (masqué pour le formulaire d'ajout joueur unifié) */}
        {mode !== 'player_only' && (
          <div className="flex border-b bg-white px-6 overflow-x-auto gap-2 py-2.5">
            {(mode === 'report_only'
              ? [
                { id: 'sport', label: '1. Observation Terrain', icon: FileSpreadsheet },
                { id: 'evaluation', label: '2. Qualités', icon: Star },
                { id: 'report', label: '3. Rapport de Scout', icon: FileText },
              ]
              : [
                { id: 'civil', label: '1. Profil Joueur & Contacts', icon: User },
                { id: 'sport', label: '2. Observation Terrain', icon: FileSpreadsheet },
                { id: 'evaluation', label: '3. Qualités', icon: Star },
                { id: 'report', label: '4. Rapport', icon: FileText },
              ]
            ).map((sec) => {
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id as any)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer",
                    activeSection === sec.id
                      ? "bg-primary text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto custom-scrollbar flex-1">
          <div className="p-6 space-y-4 max-w-4xl mx-auto w-full">
            {/* SECTION 1 : ÉTAT CIVIL, CONTACT & ASSIGNATION DU SCOUT */}
            {activeSection === 'civil' && (
              <div className="space-y-5">
                {/* ── CARTE 1 : ASSIGNATION DU SCOUT DÉTECTEUR ── */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/40 border border-indigo-100/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-100/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          1. Assignation & Détection
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Sélectionnez le scout responsable de l'observation initiale du joueur.
                        </p>
                      </div>
                    </div>
                    {discoveringScoutId && (
                      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-100/80 text-indigo-700 text-[11px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                        Scout assigné
                      </span>
                    )}
                  </div>

                  <div className="pt-1">
                    <ScoutSelect
                      scouts={scouts}
                      value={discoveringScoutId}
                      onChange={(scoutId) => {
                        setDiscoveringScoutId(scoutId);
                        setRecruiterId(scoutId);
                      }}
                      label="Scout"
                      placeholder="Rechercher ou sélectionner un scout (nom, région, rôle)..."
                      helperText="Le profil et les futures évaluations de ce joueur seront automatiquement comptabilisés dans le bilan de ce scout."
                      required={false}
                    />
                  </div>
                </div>

                {/* ── CARTE 2 : ÉTAT CIVIL & IDENTITÉ ── */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          2. État Civil & Identité
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Informations civiles, photo et date de naissance.
                        </p>
                      </div>
                    </div>

                    {age !== null && (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                          {age} an{age > 1 ? 's' : ''}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-black">
                          {ageCategory}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Photo Officielle du Joueur */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative group shrink-0">
                      <div className="w-20 h-20 rounded-2xl border-2 border-slate-300 bg-white overflow-hidden shadow-xs flex items-center justify-center">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt="Photo joueur"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <User className="w-9 h-9 text-slate-300" />
                        )}
                      </div>
                      {photoUrl && (
                        <button
                          type="button"
                          onClick={() => setPhotoUrl('')}
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-600 transition-colors"
                          title="Supprimer la photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 text-center sm:text-left w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-primary" />
                            Photo Officielle
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Portrait net ou tenue de sport. Formats JPG, PNG, WebP (max 10 Mo).
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-end">
                          <button
                            type="button"
                            onClick={() => setMediaPickerOpen(true)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 bg-slate-50 hover:bg-primary/10 border border-slate-200 hover:border-primary/40 text-slate-800 shadow-xs"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-primary" />
                            <span>Médiathèque</span>
                          </button>

                          <label className={cn(
                            "px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs",
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
                              onChange={handlePhotoUpload}
                              className="hidden"
                            />
                          </label>

                          {photoUrl && (
                            <button
                              type="button"
                              onClick={() => setPhotoUrl('')}
                              className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all border border-slate-200"
                              title="Supprimer la photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Champ URL direct optionnel */}
                      <div className="pt-1">
                        <input
                          type="url"
                          value={photoUrl}
                          onChange={(e) => setPhotoUrl(e.target.value)}
                          placeholder="Ou collez directement l'URL d'une image..."
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] bg-white font-normal text-slate-700 outline-none focus:ring-1 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 1. Nom, Prénom & Genre */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Nom de Famille <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Ex: El Idrissi"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Prénom <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Ex: Amine"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Sexe / Genre
                      </label>
                      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => setGender('M')}
                          className={cn(
                            "py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer",
                            gender === 'M'
                              ? "bg-white text-slate-900 shadow-2xs"
                              : "text-slate-500 hover:text-slate-800"
                          )}
                        >
                          Masculin
                        </button>
                        <button
                          type="button"
                          onClick={() => setGender('F')}
                          className={cn(
                            "py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer",
                            gender === 'F'
                              ? "bg-white text-slate-900 shadow-2xs"
                              : "text-slate-500 hover:text-slate-800"
                          )}
                        >
                          Féminin
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2. Date de naissance, Lieu de naissance, Nationalité */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-800">
                          Date de Naissance <span className="text-rose-500">*</span>
                        </label>
                      </div>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => handleBirthDateChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Lieu de Naissance
                      </label>
                      <input
                        type="text"
                        value={birthPlace}
                        onChange={(e) => setBirthPlace(e.target.value)}
                        placeholder="Ex: Rabat, Salé, Kénitra..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Nationalité
                      </label>
                      <input
                        type="text"
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        placeholder="Ex: Marocaine"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* ── CARTE 3 : CATÉGORIE D'ÂGE PRINCIPALE ── */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          3. Catégorie d'Âge Principale
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Échelon officiel de compétition du joueur.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Catégorie d'Âge Principale <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={ageCategory}
                      onChange={(e) => setAgeCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                      {allowedCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ── CARTE 4 : POSTE, PIED FORT & CLUB ACTUEL ── */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Footprints className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          4. Poste & Profil de Jeu
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Poste de prédilection, latéralité et club actuel du joueur.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Poste Principal <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={primaryPosition}
                        onChange={(e) => setPrimaryPosition(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 focus:bg-white cursor-pointer"
                      >
                        <option value="" disabled>Sélectionner le poste principal</option>
                        {(positions.length > 0 ? positions : UNIFIED_POSITION_OPTIONS.map(pos => ({ id: pos.code, code: pos.code, name: pos.label }))).map(p => (
                          <option key={p.id || p.code} value={p.code}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Pied Fort <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                        {(['Droitier', 'Gaucher', 'Ambidextre'] as FootType[]).map(foot => (
                          <button
                            key={foot}
                            type="button"
                            onClick={() => setPreferredFoot(foot)}
                            className={cn(
                              "py-2 text-[11px] font-bold rounded-xl border transition-all truncate px-1 cursor-pointer",
                              preferredFoot === foot ? "bg-primary text-white border-primary shadow-xs" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            {foot}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Taille (cm)
                      </label>
                      <input
                        type="number"
                        min="100"
                        max="230"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Ex: 178"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Poids (kg)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="130"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Ex: 68"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Club Actuel
                      </label>
                      <button
                        type="button"
                        onClick={() => handleOpenAddClub('current')}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Nouveau club</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={currentClub}
                      onChange={(e) => setCurrentClub(e.target.value)}
                      placeholder="Ex: AS FAR, FUS Rabat, KAC..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                    />
                  </div>

                  {/* Style de Jeu de Référence (Lions de l'Atlas) */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Style de Jeu de Référence</span>
                      </label>
                      {referencePlayerStyle && (
                        <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Check className="w-3 h-3 text-indigo-600" />
                          {referencePlayerStyle}
                        </span>
                      )}
                    </div>
                    <select
                      value={referencePlayerStyle}
                      onChange={(e) => setReferencePlayerStyle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                    >
                      <option value="">Sélectionner un profil de référence (Lions de l'Atlas)...</option>
                      {REFERENCE_PLAYER_STYLES.map((group) => (
                        <optgroup key={group.category} label={`── ${group.category.toUpperCase()} ──`}>
                          {group.players.map((pl) => (
                            <option key={pl.name} value={pl.name}>
                              {pl.name} — {pl.profile}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Étalonnage basé sur les profils de la sélection nationale : Défense (Hakimi, Aguerd, Saïss, Mazraoui), Milieu (Amrabat, Ziyech, Ounahi), Attaque (Díaz, En-Nesyri, Ezzalzouli).
                    </p>
                  </div>
                </div>

                {/* ── CARTE 5 : SOURCE D'INFORMATION DU JOUEUR ── */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          5. Source d'Information du Joueur <span className="text-rose-500">*</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Origine du premier signalement / découverte du joueur.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      {
                        id: 'terrain' as const,
                        label: 'Terrain',
                        desc: 'Observation directe, match, détection',
                        icon: Eye,
                      },
                      {
                        id: 'recommandation_interne' as const,
                        label: 'Recommandation interne',
                        desc: 'Staff, éducateurs, cellule FUS',
                        icon: Building2,
                      },
                      {
                        id: 'recommandation_externe' as const,
                        label: 'Recommandation externe',
                        desc: 'Club partenaire, contact externe, agent',
                        icon: Users,
                      },
                    ].map((src) => {
                      const Icon = src.icon;
                      const isSelected = informationSource === src.id;
                      return (
                        <button
                          key={src.id}
                          type="button"
                          onClick={() => setInformationSource(src.id)}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5",
                            isSelected
                              ? "bg-primary text-white border-primary shadow-xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black flex items-center gap-1.5">
                              <Icon className="w-4 h-4" />
                              <span>{src.label}</span>
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                          </div>
                          <span className={cn("text-[10px]", isSelected ? "text-white/80" : "text-muted-foreground")}>
                            {src.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Champ Nom et Prénom de la personne source / Précisions */}
                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" />
                      {informationSource === 'terrain'
                        ? "Détails / Observateur terrain (optionnel)"
                        : "Nom et prénom de la personne source"}
                    </label>
                    <input
                      type="text"
                      value={informationSourcePerson}
                      onChange={(e) => setInformationSourcePerson(e.target.value)}
                      placeholder={
                        informationSource === 'terrain'
                          ? "Ex: Détection officielle FUS, Tournoi U13, Observé par le scout..."
                          : informationSource === 'recommandation_interne'
                          ? "Ex: Coach Rachid (Éducateur U17 FUS), Karim Benali (Directeur technique)..."
                          : "Ex: Youssef El Idrissi (Président club partenaire), Agent Hassan..."
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* ── CARTE 6 : COORDONNÉES, RÉSIDENCE & REPRÉSENTANT LÉGAL ── */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          6. Coordonnées & Contacts
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Coordonnées directes et contact du tuteur / représentant légal.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Téléphone joueur, Email & Adresse */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>Téléphone du Joueur</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+212 6 XX XX XX XX"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>Email du Joueur</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="joueur@exemple.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Adresse de Résidence</span>
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Ex: Quartier Agdal, Rue..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Ville
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Ex: Rabat"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  {/* Bloc Représentant Légal / Tuteur / Agent */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Représentant Légal / Contact Tuteur</span>
                        {isMinor && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                            Requis (Joueur Mineur)
                          </span>
                        )}
                      </label>

                      {/* Sélecteur de rôle du représentant */}
                      <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200/80 shadow-2xs gap-1">
                        {[
                          { id: 'parent', label: 'Parent / Tuteur' },
                          { id: 'agent', label: 'Agent Sportif' },
                          { id: 'autre', label: 'Autre' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setRepresentativeType(item.id as any)}
                            className={cn(
                              "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                              representativeType === item.id
                                ? "bg-slate-900 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            )}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Nom du {representativeType === 'parent' ? 'Parent / Tuteur' : representativeType === 'agent' ? 'Représentant / Agent' : 'Contact Référent'}
                        </label>
                        {representativeType === 'autre' ? (
                          <input
                            type="text"
                            value={representativeOtherDetail}
                            onChange={(e) => setRepresentativeOtherDetail(e.target.value)}
                            placeholder="Ex: Oncle, Conseiller de club..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                        ) : (
                          <input
                            type="text"
                            value={representativeName}
                            onChange={(e) => setRepresentativeName(e.target.value)}
                            placeholder="Ex: Mohamed El Idrissi"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Téléphone du {representativeType === 'parent' ? 'Parent' : representativeType === 'agent' ? 'de l\'Agent' : 'Représentant'}
                        </label>
                        <input
                          type="tel"
                          value={representativePhone}
                          onChange={(e) => setRepresentativePhone(e.target.value)}
                          placeholder="+212 6 XX XX XX XX"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      </div>
                    </div>

                    {/* Statut de consentement parental pour mineurs */}
                    <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-600 font-medium">
                        Consentement parental / Autorisation de détection :
                      </span>
                      <div className="inline-flex gap-1.5">
                        {[
                          { id: 'granted', label: 'Accordé', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100', active: 'bg-emerald-600 text-white' },
                          { id: 'pending', label: 'En attente', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100', active: 'bg-amber-500 text-white' },
                          { id: 'refused', label: 'Refusé', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100', active: 'bg-rose-600 text-white' },
                        ].map((statusItem) => (
                          <button
                            key={statusItem.id}
                            type="button"
                            onClick={() => setConsentStatus(statusItem.id as any)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer",
                              consentStatus === statusItem.id
                                ? statusItem.active
                                : statusItem.color
                            )}
                          >
                            {statusItem.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── CARTE 7 : VIDÉO HIGHLIGHTS (GOOGLE DRIVE) ── */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 space-y-4 shadow-lg text-white">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                        <Video className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">
                          7. Vidéo Highlights & Détection
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Rattachez le lien Google Drive du joueur pour visionnage direct depuis la base de données.
                        </p>
                      </div>
                    </div>
                    {videoUrl && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        Lien configuré
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => handleVideoUrlChange(e.target.value)}
                        placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-white placeholder:text-slate-500 pr-28 focus:ring-2 ring-emerald-500/30 outline-none focus:border-emerald-500 transition-colors"
                      />
                      {videoUrl && (
                        <a
                          href={videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" /> Ouvrir
                        </a>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Collez votre lien de partage Google Drive avec accès lecteur. Un lecteur intégré s'affichera directement ci-dessous et dans la Database.</span>
                    </p>

                    {/* Google Drive Preview Embed */}
                    {videoUrl && videoUrl.includes('drive.google.com') && (
                      <div className="rounded-xl overflow-hidden border border-slate-700 bg-black w-full shadow-inner mt-2" style={{ aspectRatio: '16/9' }}>
                        <iframe
                          src={videoUrl.replace('/view', '/preview').replace('?usp=sharing', '')}
                          title="Aperçu Google Drive Joueur"
                          className="w-full h-full border-0"
                          allow="autoplay"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {/* Fallback YouTube si saisi */}
                    {videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) && extractYouTubeId(videoUrl) && (
                      <div className="rounded-xl overflow-hidden border border-slate-700 bg-black w-full shadow-inner mt-2" style={{ aspectRatio: '16/9' }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${extractYouTubeId(videoUrl)}?rel=0&modestbranding=1`}
                          title="Aperçu YouTube Joueur"
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* ── CARTE 8 : DÉCISION DE DÉTECTION & RECRUTEMENT ── */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          8. Décision / Statut de Détection *
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Orientation immédiate suite à la détection ou à l'observation.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Boutons de décision avec 'À recruter immédiatement' au tout début */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      {
                        id: 'recruit_now' as const,
                        label: 'À recruter immédiatement',
                        sub: 'Priorité absolue, potentiel exceptionnel validé',
                        icon: Flame,
                        activeClass: 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-500/40 shadow-sm'
                      },
                      {
                        id: 'invitation_test' as const,
                        label: 'Invitation Test',
                        sub: 'Convoquer pour match d’essai / test académie',
                        icon: Zap,
                        activeClass: 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400/40 shadow-sm'
                      },
                      {
                        id: 'to_follow' as const,
                        label: 'À suivre',
                        sub: 'Conserver en veille active & prochaines échéances',
                        icon: Eye,
                        activeClass: 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-500/40 shadow-sm'
                      },
                    ].map((dec) => {
                      const Icon = dec.icon;
                      const isSelected = scoutStateDecision === dec.id;
                      return (
                        <button
                          key={dec.id}
                          type="button"
                          onClick={() => setScoutStateDecision(dec.id)}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer",
                            isSelected
                              ? dec.activeClass
                              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80"
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-black flex items-center gap-1.5">
                              <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-white" : "text-primary")} />
                              {dec.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <p className={cn("text-[10px] leading-tight", isSelected ? "text-white/90" : "text-muted-foreground")}>
                            {dec.sub}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── CARTE 9 : FORMULAIRE ADMINISTRATIF & PIÈCES JOINTES PDF (DÉCLENCHÉ POUR 'À RECRUTER IMMÉDIATEMENT') ── */}
                {(scoutStateDecision === 'recruit_now' || administrativeDocuments.length > 0) && (
                  <AdministrativeDossierForm
                    documents={administrativeDocuments}
                    onDocumentsChange={setAdministrativeDocuments}
                    contractType={contractType}
                    onContractTypeChange={setContractType}
                    adminNotes={adminNotes}
                    onAdminNotesChange={setAdminNotes}
                  />
                )}
              </div>
            )}

            {activeSection === 'sport' && (
              <div className="space-y-5">

                {/* 0. INTITULÉ DU RAPPORT & MATCH OBSERVÉ */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-white to-indigo-50/40 border border-indigo-200/80 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Intitulé / Titre du Rapport *
                    </label>
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-100/70 px-2 py-0.5 rounded-md">
                      Observation Terrain / Séance
                    </span>
                  </div>
                  <input
                    type="text"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="Ex: Match amical vs AS FAR U19 (Stade FUS) ou Séance Détection Salé..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  />

                  {/* NOUVEAU CHAMP : Match là où le joueur a été observé */}
                  <div className="pt-2 border-t border-indigo-100/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-600" />
                        Match Observé / Affiche de la Rencontre *
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">Lieu & Contexte</span>
                    </div>
                    <input
                      type="text"
                      value={matchObserved}
                      onChange={(e) => setMatchObserved(e.target.value)}
                      placeholder="Ex: FUS Rabat U17 vs KAC Kénitra U17 (J8 Championnat) ou Tournoi de Salé..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Indiquez la rencontre ou le tournoi précis où le joueur a été supervisé par le scout.
                    </p>
                  </div>
                </div>

                {/* 1. ÉTAT DU SCOUT & STATUT D'OBSERVATION (VU vs DÉJÀ VU) */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-primary" />
                        État / Décision du Rapport *
                      </label>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Orientations suite à l'observation
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        {
                          id: 'recruit_now' as const,
                          label: 'À recruter immédiatement',
                          sub: 'Priorité absolue, potentiel exceptionnel validé',
                          icon: Flame,
                          activeClass: 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-500/40 shadow-sm'
                        },
                        {
                          id: 'invitation_test' as const,
                          label: 'Invitation Test',
                          sub: 'Convoquer pour match d’essai / test académie',
                          icon: Zap,
                          activeClass: 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400/40 shadow-sm'
                        },
                        {
                          id: 'to_follow' as const,
                          label: 'À suivre',
                          sub: 'Conserver en veille active & prochaines échéances',
                          icon: Eye,
                          activeClass: 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-500/40 shadow-sm'
                        },
                      ].map((dec) => {
                        const Icon = dec.icon;
                        const isSelected = scoutStateDecision === dec.id;
                        return (
                          <button
                            key={dec.id}
                            type="button"
                            onClick={() => setScoutStateDecision(dec.id)}
                            className={cn(
                              "p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer",
                              isSelected
                                ? dec.activeClass
                                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80"
                            )}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-black flex items-center gap-1.5">
                                <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-white" : "text-primary")} />
                                {dec.label}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <p className={cn("text-[10px] leading-tight", isSelected ? "text-white/90" : "text-muted-foreground")}>
                              {dec.sub}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {(scoutStateDecision === 'recruit_now' || administrativeDocuments.length > 0) && (
                      <div className="pt-3">
                        <AdministrativeDossierForm
                          documents={administrativeDocuments}
                          onDocumentsChange={setAdministrativeDocuments}
                          contractType={contractType}
                          onContractTypeChange={setContractType}
                          adminNotes={adminNotes}
                          onAdminNotesChange={setAdminNotes}
                        />
                      </div>
                    )}
                  </div>

                  {/* Statut d'Observation : Vu vs Déjà vu avec règle automatique */}
                  <div className="pt-3 border-t border-slate-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-blue-600" />
                        Statut d'Observation : Vu ou Déjà vu ? *
                      </label>
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 font-bold px-2 py-0.5 rounded-md">
                        {existingReportsCount > 0 ? `Déjà répertorié (${existingReportsCount} rapport${existingReportsCount > 1 ? 's' : ''})` : 'Première observation'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsFirstTimeSeen(true)}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1",
                          isFirstTimeSeen
                            ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Vu (1ère observation)</span>
                          </span>
                          {isFirstTimeSeen && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={cn("text-[10px]", isFirstTimeSeen ? "text-white/80" : "text-muted-foreground")}>
                          Nouveau talent observé pour la première fois
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsFirstTimeSeen(false)}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1",
                          !isFirstTimeSeen
                            ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black flex items-center gap-1.5">
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Déjà vu (Suivi)</span>
                          </span>
                          {!isFirstTimeSeen && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={cn("text-[10px]", !isFirstTimeSeen ? "text-white/80" : "text-muted-foreground")}>
                          Joueur déjà suivi et ré-observé
                        </span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-2">
                      💡 <em>Calcul automatique : positionné sur <strong>« {existingReportsCount > 0 ? 'Déjà vu' : 'Vu'} »</strong> car ce joueur {existingReportsCount > 0 ? `possède déjà ${existingReportsCount} rapport(s) antérieur(s).` : `n'a encore aucun rapport antérieur.`}</em>
                    </p>
                  </div>
                </div>

                {/* 2. SURCLASSEMENT DU JOUEUR (Catégorie principale éliminée de ce bloc) */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b pb-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-900">Surclassement du Joueur</span>
                    </div>
                    {isUpgradedCategory && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        +{upgradedCategoriesCount} Catégorie{upgradedCategoriesCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Surclassé lors de ce match ? (Oui / Non) *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsUpgradedCategory(false)}
                        className={cn(
                          "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                          !isUpgradedCategory
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        Non (Normal)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsUpgradedCategory(true)}
                        className={cn(
                          "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                          isUpgradedCategory
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Oui (Surclassé)</span>
                      </button>
                    </div>
                  </div>

                  {/* Si surclassé : choix de 1, 2, 3 ou 4 catégories */}
                  {isUpgradedCategory && (
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
                      <label className="block text-[11px] font-bold text-emerald-950">
                        Par combien de catégories de surclassement : 1 – 2 – 3 – 4 ?
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map((num) => {
                          const isCountSelected = upgradedCategoriesCount === num;
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setUpgradedCategoriesCount(num)}
                              className={cn(
                                "py-2 rounded-xl text-xs font-black transition-all border cursor-pointer flex flex-col items-center justify-center",
                                isCountSelected
                                  ? "bg-emerald-600 text-white border-emerald-700 shadow-xs scale-[1.02]"
                                  : "bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-100/60"
                              )}
                            >
                              <span>+{num}</span>
                              <span className="text-[9px] font-medium opacity-80">
                                {num === 1 ? '1 catégorie' : `${num} catégories`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. POSTES, PIED FORT & CLUBS (Masqué en mode création / modification de rapport) */}
                {mode !== 'report_only' && (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b pb-2.5">
                      <div className="flex items-center gap-2">
                        <Footprints className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-slate-900">Poste & Profil de Jeu</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">Postes de prédilection</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Poste Principal *</label>
                        <select
                          value={primaryPosition}
                          onChange={(e) => setPrimaryPosition(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 focus:bg-white cursor-pointer"
                        >
                          <option value="" disabled>Sélectionner le poste principal</option>
                          {positions.map(p => (
                            <option key={p.id || p.code} value={p.code}>
                              {p.name} ({p.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Pied Fort *</label>
                        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                          {(['Droitier', 'Gaucher', 'Ambidextre'] as FootType[]).map(foot => (
                            <button
                              key={foot}
                              type="button"
                              onClick={() => setPreferredFoot(foot)}
                              className={cn(
                                "py-2 text-[11px] font-bold rounded-xl border transition-all truncate px-1 cursor-pointer",
                                preferredFoot === foot ? "bg-primary text-white border-primary shadow-xs" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              )}
                            >
                              {foot}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Club Actuel</label>
                        <input
                          type="text"
                          value={currentClub}
                          onChange={(e) => setCurrentClub(e.target.value)}
                          placeholder="Ex: AS FAR, FUS Rabat, KAC..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. STATUT DANS LE MATCH & TEMPS DE JEU (CALCUL AUTOMATIQUE) */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b pb-2.5">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Statut dans le Match & Temps de Jeu (Calcul Automatique)
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Minutes jouées calculées sans saisie manuelle
                    </span>
                  </div>

                  {/* Choix 1 : Titulaire vs Remplaçant */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Statut du joueur au coup d'envoi *
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsStarter(true);
                        }}
                        className={cn(
                          "py-2.5 px-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2",
                          isStarter
                            ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Titulaire (XI de départ)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsStarter(false);
                        }}
                        className={cn(
                          "py-2.5 px-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2",
                          !isStarter
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        <Users className="w-4 h-4" />
                        <span>Remplaçant (Banc)</span>
                      </button>
                    </div>
                  </div>

                  {/* CAS 1 : TITULAIRE */}
                  {isStarter && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          A-t-il joué le match complet ? *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setIsFullMatch(true)}
                            className={cn(
                              "py-2 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer",
                              isFullMatch
                                ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            Oui (Match complet – 90 min)
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsFullMatch(false)}
                            className={cn(
                              "py-2 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer",
                              !isFullMatch
                                ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            Non (Remplacé / Sorti)
                          </button>
                        </div>
                      </div>

                      {/* Si non match complet : Mi-temps et minute de sortie */}
                      {!isFullMatch && (
                        <div className="pt-2 border-t border-slate-200 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Mi-temps de sortie *
                              </label>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSubOutHalf('1st');
                                    if (Number(subOutMinute) > 45 || subOutMinute === '') setSubOutMinute(35);
                                  }}
                                  className={cn(
                                    "py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer",
                                    subOutHalf === '1st'
                                      ? "bg-primary text-white border-primary"
                                      : "bg-white text-slate-700 border-slate-200"
                                  )}
                                >
                                  1ère Mi-temps
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSubOutHalf('2nd');
                                    if (Number(subOutMinute) <= 45 || subOutMinute === '') setSubOutMinute(65);
                                  }}
                                  className={cn(
                                    "py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer",
                                    subOutHalf === '2nd'
                                      ? "bg-primary text-white border-primary"
                                      : "bg-white text-slate-700 border-slate-200"
                                  )}
                                >
                                  2ème Mi-temps
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Minute de sortie * (1 à 90)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="1"
                                  max="90"
                                  value={subOutMinute}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : Math.max(1, Math.min(90, Number(e.target.value)));
                                    setSubOutMinute(val);
                                  }}
                                  placeholder={subOutHalf === '1st' ? "Ex: 35" : "Ex: 68"}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-black bg-white focus:ring-2 focus:ring-primary/20"
                                />
                                <span className="absolute right-3 top-1.5 text-xs font-bold text-slate-400">min</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CAS 2 : REMPLAÇANT */}
                  {!isStarter && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Est-il entré en jeu ? *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setHasSubbedIn(true)}
                            className={cn(
                              "py-2 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer",
                              hasSubbedIn
                                ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            Oui (Entré en jeu)
                          </button>
                          <button
                            type="button"
                            onClick={() => setHasSubbedIn(false)}
                            className={cn(
                              "py-2 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer",
                              !hasSubbedIn
                                ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            Non (Resté sur le banc – 0 min)
                          </button>
                        </div>
                      </div>

                      {/* Si entré en jeu : Mi-temps et minute d'entrée */}
                      {hasSubbedIn && (
                        <div className="pt-2 border-t border-slate-200 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Mi-temps d'entrée en jeu *
                              </label>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSubInHalf('1st');
                                    if (Number(subInMinute) > 45 || subInMinute === '') setSubInMinute(30);
                                  }}
                                  className={cn(
                                    "py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer",
                                    subInHalf === '1st'
                                      ? "bg-primary text-white border-primary"
                                      : "bg-white text-slate-700 border-slate-200"
                                  )}
                                >
                                  1ère Mi-temps
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSubInHalf('2nd');
                                    if (Number(subInMinute) <= 45 || subInMinute === '') setSubInMinute(60);
                                  }}
                                  className={cn(
                                    "py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer",
                                    subInHalf === '2nd'
                                      ? "bg-primary text-white border-primary"
                                      : "bg-white text-slate-700 border-slate-200"
                                  )}
                                >
                                  2ème Mi-temps
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Minute d'entrée * (1 à 90)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="1"
                                  max="90"
                                  value={subInMinute}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : Math.max(1, Math.min(90, Number(e.target.value)));
                                    setSubInMinute(val);
                                  }}
                                  placeholder={subInHalf === '1st' ? "Ex: 30" : "Ex: 60"}
                                  className="w-full px-3.5 py-1.5 rounded-lg border border-slate-200 text-sm font-black bg-white focus:ring-2 focus:ring-primary/20"
                                />
                                <span className="absolute right-3 top-1.5 text-xs font-bold text-slate-400">min</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* BANNIÈRE DE RÉSULTAT : CALCUL AUTOMATIQUE DU TEMPS DE JEU */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider block">
                          Temps de Jeu Calculé Automatiquement
                        </span>
                        <p className="text-xs font-semibold text-slate-700">
                          {isStarter
                            ? (isFullMatch ? "Match complet disputé" : `Sorti à la ${subOutMinute || 0}e minute (${subOutHalf === '1st' ? '1ère MT' : '2ème MT'})`)
                            : (!hasSubbedIn ? "Non entré en jeu (0 min)" : `Entré à la ${subInMinute || 0}e minute (90 - ${subInMinute || 0} = ${calculatedMinutes} min)`)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-emerald-700 block leading-none">
                        {calculatedMinutes} <span className="text-xs font-bold text-emerald-600">min</span>
                      </span>
                    </div>
                  </div>

                  {/* STATISTIQUES EN MATCH (BUTS & PASSES DÉCISIVES) */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      Statistiques offensives observées lors de ce match
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Buts marqués</label>
                        <input
                          type="number"
                          min="0"
                          value={goals}
                          onChange={(e) => setGoals(e.target.value ? Number(e.target.value) : '')}
                          placeholder="0"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-black bg-white focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Passes Décisives</label>
                        <input
                          type="number"
                          min="0"
                          value={assists}
                          onChange={(e) => setAssists(e.target.value ? Number(e.target.value) : '')}
                          placeholder="0"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-black bg-white focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. FORMATION TACTIQUE & SOURCE D'INFORMATION */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                  {/* Formation de l'équipe */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800">
                        Formation de l’équipe au sein de laquelle il a opéré *
                      </label>
                      <span className="text-[10px] text-muted-foreground">Dispositif tactique</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {['4-3-3', '4-2-3-1', '3-5-2', '4-4-2', '3-4-3', '5-3-2'].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setTeamFormation(f)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                            teamFormation === f
                              ? "bg-primary text-white border-primary shadow-xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          )}
                        >
                          {f}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={teamFormation}
                      onChange={(e) => setTeamFormation(e.target.value)}
                      placeholder="Ou saisissez un autre dispositif (ex: 4-1-4-1, 3-4-1-2...)"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {/* Source d'Information (Masqué en mode création / modification de rapport) */}
                  {mode !== 'report_only' && (
                    <div className="pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-primary" />
                          Source d’information du Joueur *
                        </label>
                        <span className="text-[10px] text-muted-foreground font-medium">Origine du signalement</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {[
                          {
                            id: 'terrain' as const,
                            label: 'Terrain',
                            desc: 'Observation directe, match, détection',
                            icon: Eye,
                          },
                          {
                            id: 'recommandation_interne' as const,
                            label: 'Recommandation interne',
                            desc: 'Staff, éducateurs, cellule FUS',
                            icon: Building2,
                          },
                          {
                            id: 'recommandation_externe' as const,
                            label: 'Recommandation externe',
                            desc: 'Club partenaire, contact externe, agent',
                            icon: Users,
                          },
                        ].map((src) => {
                          const Icon = src.icon;
                          const isSelected = informationSource === src.id;
                          return (
                            <button
                              key={src.id}
                              type="button"
                              onClick={() => setInformationSource(src.id)}
                              className={cn(
                                "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5",
                                isSelected
                                  ? "bg-primary text-white border-primary shadow-xs"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black flex items-center gap-1.5">
                                  <Icon className="w-4 h-4" />
                                  <span>{src.label}</span>
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                              </div>
                              <span className={cn("text-[10px]", isSelected ? "text-white/80" : "text-muted-foreground")}>
                                {src.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-1">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-primary" />
                          {informationSource === 'terrain'
                            ? "Détails / Observateur terrain (optionnel)"
                            : "Nom et prénom de la personne source"}
                        </label>
                        <input
                          type="text"
                          value={informationSourcePerson}
                          onChange={(e) => setInformationSourcePerson(e.target.value)}
                          placeholder={
                            informationSource === 'terrain'
                              ? "Ex: Détection officielle FUS, Tournoi U13, Observé par le scout..."
                              : informationSource === 'recommandation_interne'
                              ? "Ex: Coach Rachid (Éducateur U17 FUS), Karim Benali (Directeur technique)..."
                              : "Ex: Youssef El Idrissi (Président club partenaire), Agent Hassan..."
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. POTENTIEL & PERFORMANCE */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      Évaluation : Potentiel & Performance
                    </span>
                    <span className="text-[11px] text-muted-foreground">Notes de projection du recruteur</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Potentiel */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Potentiel du Joueur</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black text-xs border border-amber-200">
                          {potentialRating.toFixed(1)} / 10
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.5"
                        value={potentialRating}
                        onChange={(e) => setPotentialRating(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>1 (Faible)</span>
                        <span>5 (Moyen)</span>
                        <span>8 (Élevé)</span>
                        <span className="font-bold text-amber-700">10 (Élite)</span>
                      </div>
                    </div>

                    {/* Performance */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Niveau de Performance Observé</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-black text-xs border border-emerald-200">
                          {performanceRating.toFixed(1)} / 10
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.5"
                        value={performanceRating}
                        onChange={(e) => setPerformanceRating(Number(e.target.value))}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>1 (Insuffisant)</span>
                        <span>5 (Correct)</span>
                        <span>8 (Très bon)</span>
                        <span className="font-bold text-emerald-700">10 (Top Match)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET SCOUT */}
            {activeSection === 'scout' && (
              <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Scout & Métriques du Poste</h4>
                      <p className="text-[11px] text-slate-500">Sélectionnez le scout découvreur et notez le joueur selon les métriques configurées pour son poste</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center gap-1.5 shadow-xs">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>Score Global : {overallScore}/10</span>
                    </div>
                  </div>
                </div>

                {/* Sélection du Scout et du Poste Détecté */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-blue-600" />
                      <span>Scout *</span>
                    </label>
                    <select
                      value={discoveringScoutId}
                      onChange={(e) => setDiscoveringScoutId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-primary/20"
                      required
                    >
                      <option value="">-- Sélectionner un Scout --</option>
                      {scoutMembers.map(s => {
                        const cleanRole = (!s.role_title || s.role_title.includes('Scout') || s.role_title.includes('Détecteur') || s.role_title.includes('Recruteur')) ? 'Scout' : s.role_title;
                        return (
                          <option key={s.id} value={s.id}>{s.full_name} ({cleanRole})</option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      <span>Poste Détecté / Observé *</span>
                    </label>
                    <select
                      value={primaryPosition}
                      onChange={(e) => setPrimaryPosition(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold focus:ring-2 focus:ring-primary/20"
                      required
                    >
                      {positions.map(p => (
                        <option key={p.id || p.code} value={p.code}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>


              </div>
            )}

            {/* ONGLET EVALUATION */}
            {activeSection === 'evaluation' && (
              <div className="p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Bloc Métriques Configurées selon le Poste */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center gap-2.5">
                      <div>
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span>Métriques configurées pour le poste {positionConfig.name} ({positionConfig.code})</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                            {positionConfig.category || 'Poste'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">Critères dynamiques configurés selon le profil recherché au FUS</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRadarView(prev => !prev)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-2xs",
                          showRadarView
                            ? "bg-slate-900 text-white border-slate-800 hover:bg-slate-800"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{showRadarView ? 'Masquer le Radar' : 'Visualiser le Radar'}</span>
                      </button>
                      <div className="px-3 py-1.5 bg-primary/10 text-primary font-black rounded-xl text-xs border border-primary/20 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-primary" />
                        <span>Note Globale : {overallScore}/10</span>
                      </div>
                    </div>
                  </div>

                  {/* Visualisation Radar interactive en temps réel */}
                  {showRadarView && (
                    <div className="bg-slate-50/70 rounded-3xl p-5 border border-slate-200/80 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                      <div className="w-full flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
                            <Sparkles className="w-4 h-4" />
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                              Visualisation Radar en Temps Réel
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Graphique dynamique mis à jour selon les critères ajustés pour {firstName || 'le joueur'} {lastName}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="w-full">
                        <PlayerRadarChart
                          customPositionConfig={positionConfig}
                          evaluations={[{
                            name: `${firstName || 'Joueur'} ${lastName || ''}`.trim(),
                            color: '#ef4444',
                            eval: {
                              id: 'preview',
                              candidate_id: candidate?.id || 'temp',
                              overall_score: overallScore,
                              technical_score: techScore,
                              tactical_score: tactScore,
                              physical_score: physScore,
                              mental_score: mentScore,
                              position_evaluated: positionConfig.code || primaryPosition,
                              criteria_scores: (['technique', 'tactique', 'physique', 'mental'] as ScoutPillarKey[]).reduce((acc, pillar) => {
                                (positionConfig.criteria[pillar] || []).forEach(c => {
                                  const lbl = typeof c === 'string' ? c : (c as any)?.label;
                                  if (lbl) {
                                    acc[lbl] = criterionScores[`${pillar}-${lbl}`] ?? 5.0;
                                  }
                                });
                                return acc;
                              }, {} as Record<string, number>),
                              verdict: 'shortlist',
                              evaluation_date: new Date().toISOString().split('T')[0],
                              evaluator_name: scoutMembers.find(s => s.id === discoveringScoutId)?.full_name || 'Scout',
                              created_at: new Date().toISOString(),
                            } as CandidateEvaluation
                          }]}
                          detailed={false}
                          height={260}
                          showTabs={true}
                          defaultTab={activeEvalTab === 'tech' ? 'tech' : activeEvalTab === 'tact' ? 'tact' : activeEvalTab === 'phys' ? 'phys' : 'ment'}
                        />
                      </div>
                    </div>
                  )}

                  {/* Onglets des 4 piliers */}
                  <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-2">
                    {[
                      { id: 'tech', label: 'Technique', score: techScore },
                      { id: 'tact', label: 'Tactique', score: tactScore },
                      { id: 'phys', label: 'Physique', score: physScore },
                      { id: 'ment', label: 'Mental', score: mentScore }
                    ].map(tab => {
                      const isActive = activeEvalTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveEvalTab(tab.id as any)}
                          className={cn(
                            "px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0",
                            isActive
                              ? "bg-primary text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          <span>{tab.label}</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-black",
                            isActive ? "bg-white/20 text-white" : "bg-white text-slate-700"
                          )}>
                            {tab.score}/10
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Grille des critères configurés pour le pilier sélectionné */}
                  <div className="space-y-4">
                    {activeEvalTab === 'tech' && renderPillarSection('technique', 'A', 'Techniques', 'Barème 1 à 10 spécifique au poste', techScore)}
                    {activeEvalTab === 'tact' && renderPillarSection('tactique', 'B', 'Tactiques', 'Intelligence, vision & placement', tactScore)}
                    {activeEvalTab === 'phys' && renderPillarSection('physique', 'C', 'Physiques & Athlétiques', 'Vitesse, endurance et profil athlétique', physScore)}
                    {activeEvalTab === 'ment' && renderPillarSection('mental', 'D', 'Mentaux & Comportement', 'Mentalité, discipline et leadership', mentScore)}

                    <div className="mt-4 p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-blue-900">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>Rapport & Observations du Scout ({activeEvalTab === 'tech' ? 'Technique' : activeEvalTab === 'tact' ? 'Tactique' : activeEvalTab === 'phys' ? 'Physique' : 'Mental'})</span>
                      </label>
                      <textarea
                        rows={3}
                        value={activeEvalTab === 'tech' ? techReport : activeEvalTab === 'tact' ? tactReport : activeEvalTab === 'phys' ? physReport : mentReport}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (activeEvalTab === 'tech') setTechReport(val);
                          else if (activeEvalTab === 'tact') setTactReport(val);
                          else if (activeEvalTab === 'phys') setPhysReport(val);
                          else setMentReport(val);
                        }}
                        placeholder={`Observations et remarques du scout pour ce domaine...`}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200/90 bg-white text-xs resize-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'report' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 max-w-4xl mx-auto">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-200">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="font-black text-slate-800 text-lg">Rapport de Scout</h3>
                      <p className="text-xs text-slate-500">Synthèse et projection du recrutement</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-500" />
                        Points forts
                      </label>
                      <RichTextEditor
                        value={strengths}
                        onChange={setStrengths}
                        placeholder="Quelles sont les qualités majeures du joueur ?"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Target className="w-4 h-4 text-rose-500" />
                        Points à développer
                      </label>
                      <RichTextEditor
                        value={weaknesses}
                        onChange={setWeaknesses}
                        placeholder="Quels sont les axes d'amélioration ?"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500" />
                        Projection
                      </label>
                      <RichTextEditor
                        value={projection}
                        onChange={setProjection}
                        placeholder="Comment voyez-vous l'évolution du joueur au FUS ?"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* Footer Actions */}
            <div className="pt-4 border-t flex items-center justify-between gap-3">
              <div>
                {mode === 'report_only' && activeSection !== 'sport' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeSection === 'report') setActiveSection('evaluation');
                      else if (activeSection === 'evaluation') setActiveSection('sport');
                    }}
                    className="px-4 py-2.5 rounded-xl border text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    ← Précédent
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Annuler
                </button>

                {mode === 'report_only' && activeSection === 'sport' && (
                  <button
                    type="button"
                    onClick={() => setActiveSection('evaluation')}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    Suivant (2. Qualités) →
                  </button>
                )}

                {mode === 'report_only' && activeSection === 'evaluation' && (
                  <button
                    type="button"
                    onClick={() => setActiveSection('report')}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    Suivant (3. Rapport de Scout) →
                  </button>
                )}

                {(mode !== 'report_only' || activeSection === 'report') && (
                  <button
                    type="submit"
                    disabled={isSubmitting || (mode !== 'report_only' && (candidate ? !canUpdateCandidate : !canCreateCandidate))}
                    title={mode !== 'report_only' && (candidate ? !canUpdateCandidate : !canCreateCandidate) ? "Vous n'avez pas la permission CRUD requise" : undefined}
                    className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting
                      ? 'Enregistrement...'
                      : mode === 'report_only'
                        ? (evaluation ? 'Mettre à jour le rapport' : 'Enregistrer le rapport')
                        : candidate
                          ? 'Mettre à jour la Fiche'
                          : 'Enregistrer le Joueur'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Modal Officiel Complet d'Ajout / Modification de Club Adversaire */}
      {isOpponentModalOpen && (
        <OpponentClubFormModal
          isOpen={isOpponentModalOpen}
          onClose={() => {
            setIsOpponentModalOpen(false);
            setSelectedClubForModal(null);
          }}
          club={selectedClubForModal}
          onSuccess={handleOpponentClubSuccess}
        />
      )}

      {/* Sélecteur de Médias Centralisé */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => setPhotoUrl(url)}
        title="Affecter une photo depuis la Médiathèque"
      />
    </>
  );
};
export default CandidateModal;
