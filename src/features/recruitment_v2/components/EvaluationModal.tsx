import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Sparkles,
  Award,
  FileText,
  CheckCircle2,
  ChevronRight,
  Sliders,
  Shield,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Edit3,
  Calendar,
  Lock,
  AlertTriangle,
  Trash2,
  Clock,
  MapPin,
  Plus,
  UserCheck,
  Check,
  Crown,
  ChevronUp,
  ChevronDown,
  User,
  HeartHandshake,
  Briefcase,
  Phone,
  UserPlus,
  ClipboardList,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import type { TrialCandidate, CandidateEvaluation, EvaluationVerdict, PlayerTest, Scout } from '../types/recruitment';
import { cn } from '../../../lib/utils';
import { usePermissions } from '../../../context/PermissionsContext';
import { useMetrics } from '../../../hooks/useMetrics';
import { getMetricPositionFrenchName } from '../../../utils/metricSetsHelpers';
import {
  type ScoutPillarKey
} from '../constants/scoutCriteriaByPosition';
import ScoutCriteriaManagerModal from './ScoutCriteriaManagerModal';
import ScoutReportWizard, { type ScoutReport } from './ScoutReportWizard';
import CandidateModal from './CandidateModal';
import { ScoutAvatar } from './ScoutAvatar';

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

interface EvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: TrialCandidate;
  existingEvaluation?: CandidateEvaluation | null;
  evaluations?: CandidateEvaluation[];
  initialMode?: 'create' | 'reevaluate' | 'edit';
  tests?: PlayerTest[];
  scouts?: Scout[];
  initialTestId?: string;
  onSave: (
    evaluation: Omit<CandidateEvaluation, 'id' | 'created_at'>,
    options?: { isReevaluation?: boolean; updateId?: string; promoteToShortlist?: boolean }
  ) => Promise<void>;
  onDelete?: (evaluationId: string) => Promise<void>;
  onOpenScheduleTest?: (candidate: TrialCandidate) => void;
  /** Callback fired when user clicks "Ajouter joueur" — opens CandidateModal in create mode */
  onAddPlayer?: () => void;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({
  isOpen,
  onClose,
  candidate,
  existingEvaluation,
  evaluations = [],
  initialMode,
  tests = [],
  scouts = [],
  initialTestId,
  onSave,
  onDelete,
  onOpenScheduleTest,
  onAddPlayer,
}) => {
  const navigate = useNavigate();
  const [isReportWizardOpen, setIsReportWizardOpen] = useState(false);
  const [evalMode, setEvalMode] = useState<'create' | 'reevaluate' | 'edit'>('create');
  const [activeTab, setActiveTab] = useState<'scout' | 'profile' | 'tech' | 'tact' | 'phys' | 'ment' | 'position' | 'verdict'>('scout');
  const [isCandidateCardExpanded, setIsCandidateCardExpanded] = useState(true);
  const [evaluatorId, setEvaluatorId] = useState('');
  const [evaluatorName, setEvaluatorName] = useState('Hassan Benabicha');
  const [evaluatorRole, setEvaluatorRole] = useState('Directeur du Recrutement');
  const [evaluationDate, setEvaluationDate] = useState(new Date().toISOString().split('T')[0]);

  // Rapports textuels par pilier
  const [techReport, setTechReport] = useState('');
  const [tactReport, setTactReport] = useState('');
  const [physReport, setPhysReport] = useState('');
  const [mentReport, setMentReport] = useState('');
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const candidateTests = tests.filter(t => t.candidate_id === candidate.id || t.candidate_ids?.includes(candidate.id));
  const selectedTest = candidateTests.find(t => t.id === selectedTestId);
  const isFutureTest = Boolean(selectedTest && selectedTest.test_date > todayStr);

  const { authState } = usePermissions();
  const userRole = authState?.user?.system_role?.toLowerCase() || '';
  const userRoles = (authState?.roles ?? []).map(r => r.toLowerCase());
  const isSuperAdmin = Boolean(
    userRoles.includes('super_admin') ||
    userRoles.includes('scout_admin') ||
    userRole === 'super_admin' ||
    userRole === 'admin' ||
    userRole === 'scout_admin'
  );

  const { getPositionByCode, positions, updatePosition } = useMetrics();

  // Configuration dynamique des critères selon le poste du joueur (9 profils de la gestion des métriques)
  const positionConfig = React.useMemo(() => {
    const targetPos = existingEvaluation?.position_evaluated || candidate.primary_position;
    const config = getPositionByCode(targetPos);
    if (config) return config;
    return { name: targetPos || 'CM', code: targetPos || 'CM', emoji: '👤', category: 'MF', criteria: { technique: [], tactique: [], physique: [], mental: [] } };
  }, [existingEvaluation?.position_evaluated, candidate.primary_position, positions, getPositionByCode]);

  // Notes des critères dynamiques par nom de critère (Échelle 1–10)
  const [criterionScores, setCriterionScores] = useState<Record<string, number>>({});
  // État d'activation des critères (Coché = pris en compte, Décoché = exclu)
  const [criterionEnabled, setCriterionEnabled] = useState<Record<string, boolean>>({});

  // Super Admin Criteria inline management
  const [isCriteriaManagerOpen, setIsCriteriaManagerOpen] = useState(false);
  const [inlineAddingPillar, setInlineAddingPillar] = useState<ScoutPillarKey | null>(null);
  const [inlineNewCriterionName, setInlineNewCriterionName] = useState('');
  const [editingCriterion, setEditingCriterion] = useState<{ pillar: ScoutPillarKey; oldName: string } | null>(null);
  const [editingCriterionNewName, setEditingCriterionNewName] = useState('');
  const [activeCriterionTooltip, setActiveCriterionTooltip] = useState<string | null>(null);

  // Critères complémentaires spécifiques
  const posUpper = candidate.primary_position.toUpperCase();
  const isGK = posUpper.includes('GK') || candidate.primary_position.toLowerCase().includes('gardien');
  const isDef = posUpper.includes('CB') || posUpper.includes('LB') || posUpper.includes('RB') || candidate.primary_position.toLowerCase().includes('défenseur') || candidate.primary_position.toLowerCase().includes('latéral') || candidate.primary_position.toLowerCase().includes('arrière');
  const isMid = posUpper.includes('CDM') || posUpper.includes('CM') || posUpper.includes('CAM') || candidate.primary_position.toLowerCase().includes('milieu');
  const isWng = posUpper.includes('LW') || posUpper.includes('RW') || candidate.primary_position.toLowerCase().includes('ailier');

  const [posTrait1Label, setPosTrait1Label] = useState(isGK ? 'Réflexes & Arrêts sur sa ligne' : isDef ? 'Duels Aériens & Tacles' : isMid ? 'Résistance au Pressing' : isWng ? 'Percussion 1 contre 1 & Dribble' : 'Finition Clinique');
  const [posTrait1Score, setPosTrait1Score] = useState(0);
  const [posTrait2Label, setPosTrait2Label] = useState(isGK ? 'Sorties Aériennes & 1 contre 1' : isDef ? 'Relance & Vision défensive' : isMid ? 'Passes Progressives & Rupture' : isWng ? 'Qualité de Centre' : 'Instinct de Buteur');
  const [posTrait2Score, setPosTrait2Score] = useState(0);
  const [posTrait3Label, setPosTrait3Label] = useState(isGK ? 'Jeu au pied & Relance' : isDef ? 'Couverture & Vitesse de repli' : isMid ? 'Contrôle du Tempo' : isWng ? 'Vitesse de Transition' : 'Jeu Dos au But');
  const [posTrait3Score, setPosTrait3Score] = useState(0);

  // Verdict & Synthèse
  const [verdict, setVerdict] = useState<EvaluationVerdict>('shortlist');
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper pour initialiser ou réinitialiser les notes de critères
  const initCriterionScores = (evaluation?: CandidateEvaluation | null) => {
    const scores: Record<string, number> = {};
    const enabled: Record<string, boolean> = {};

    const pillars: ScoutPillarKey[] = ['technique', 'tactique', 'physique', 'mental'];
    pillars.forEach((p) => {
      const configCriteria = positionConfig.criteria?.[p] || [];
      const criteriaList: string[] = configCriteria.map((c: any) => typeof c === 'string' ? c : c?.label || '');

      criteriaList.forEach((lbl) => {
        if (!lbl) return;
        const key = `${p}-${lbl}`;
        const title = parseCriterion(lbl).title;

        if (evaluation?.criteria_scores && evaluation.criteria_scores[key] !== undefined) {
          scores[key] = Number(evaluation.criteria_scores[key]);
        } else if (evaluation?.criteria_scores && evaluation.criteria_scores[lbl] !== undefined) {
          scores[key] = Number(evaluation.criteria_scores[lbl]);
        } else if (evaluation?.criteria_scores && evaluation.criteria_scores[title] !== undefined) {
          scores[key] = Number(evaluation.criteria_scores[title]);
        } else if (criterionScores[key] !== undefined) {
          scores[key] = criterionScores[key];
        } else {
          scores[key] = 0;
        }
        enabled[key] = true;
      });
    });

    setCriterionScores(scores);
    setCriterionEnabled(enabled);
  };

  // Helper to load evaluation data or reset to default
  const loadEvaluationData = (evaluation: CandidateEvaluation | null, test?: PlayerTest) => {
    // Si pas d'évaluation fournie pour ce test spécifique, conserver les métriques existantes du joueur (évaluation vivante et continue)
    const candidateLatest = evaluation
      || (evaluations || []).find(e => e.candidate_id === candidate.id)
      || (existingEvaluation?.candidate_id === candidate.id ? existingEvaluation : null);

    if (candidateLatest) {
      setEvalMode(evaluation ? 'edit' : 'create');
      setEvaluatorId(candidateLatest.evaluator_id || '');
      setEvaluatorName(candidateLatest.evaluator_name || 'Hassan Benabicha');
      setEvaluatorRole(candidateLatest.evaluator_role || 'Directeur du Recrutement');
      setEvaluationDate(test?.test_date || candidateLatest.evaluation_date || todayStr);

      setTechReport(candidateLatest.tech_report || '');
      setTactReport(candidateLatest.tact_report || '');
      setPhysReport(candidateLatest.phys_report || '');
      setMentReport(candidateLatest.ment_report || '');

      initCriterionScores(candidateLatest);

      if (candidateLatest.pos_specific_1_label) setPosTrait1Label(candidateLatest.pos_specific_1_label);
      if (candidateLatest.pos_specific_1_score !== undefined) setPosTrait1Score(candidateLatest.pos_specific_1_score);
      if (candidateLatest.pos_specific_2_label) setPosTrait2Label(candidateLatest.pos_specific_2_label);
      if (candidateLatest.pos_specific_2_score !== undefined) setPosTrait2Score(candidateLatest.pos_specific_2_score);
      if (candidateLatest.pos_specific_3_label) setPosTrait3Label(candidateLatest.pos_specific_3_label);
      if (candidateLatest.pos_specific_3_score !== undefined) setPosTrait3Score(candidateLatest.pos_specific_3_score);

      setVerdict(candidateLatest.verdict || 'shortlist');
      setStrengths(candidateLatest.strengths || '');
      setWeaknesses(candidateLatest.weaknesses || '');
      setComments(candidateLatest.comments || '');
    } else {
      setEvalMode('create');
      setEvaluatorId('');
      setEvaluatorName('Hassan Benabicha');
      setEvaluatorRole('Directeur du Recrutement');
      setEvaluationDate(test?.test_date || todayStr);

      setTechReport('');
      setTactReport('');
      setPhysReport('');
      setMentReport('');

      initCriterionScores(null);

      setPosTrait1Score(0);
      setPosTrait2Score(0);
      setPosTrait3Score(0);

      setVerdict('shortlist');
      setStrengths('');
      setWeaknesses('');
      setComments('');
    }
  };

  useEffect(() => {
    // Si un initialTestId est donné ou qu'un test correspond à l'évaluation existante
    const defaultTest = (initialTestId && candidateTests.find(t => t.id === initialTestId))
      || (existingEvaluation?.test_id && candidateTests.find(t => t.id === existingEvaluation.test_id))
      || (candidateTests.length > 0 ? candidateTests.find(t => t.test_date <= todayStr) || candidateTests[0] : undefined);

    const defaultTestId = defaultTest ? defaultTest.id : '';
    setSelectedTestId(defaultTestId);

    // Trouver l'évaluation : soit par test_id soit la première évaluation disponible pour ce candidat
    const matchedEval = (evaluations || []).find(e => defaultTestId ? e.test_id === defaultTestId : e.candidate_id === candidate.id)
      || (existingEvaluation?.test_id === defaultTestId ? existingEvaluation : null)
      || (existingEvaluation && !existingEvaluation.test_id ? existingEvaluation : null)
      || (evaluations || []).find(e => e.candidate_id === candidate.id)
      || null;

    loadEvaluationData(matchedEval, defaultTest);
  }, [existingEvaluation, evaluations, isOpen, initialTestId, candidate.id, candidate.primary_position]);

  const handleSelectTest = (testId: string) => {
    setSelectedTestId(testId);
    const candidateLatest = (evaluations || []).find(e => e.candidate_id === candidate.id) || existingEvaluation || null;
    if (!testId) {
      // Mode évaluation autonome sans test
      loadEvaluationData(candidateLatest, undefined);
      return;
    }
    const test = candidateTests.find(t => t.id === testId);
    const matchedEval = (evaluations || []).find(e => e.test_id === testId)
      || (existingEvaluation?.test_id === testId ? existingEvaluation : null);
    // TOUJOURS conserver les métriques existantes du candidat même si cette session n'a pas encore de note dédiée
    loadEvaluationData(matchedEval || candidateLatest, test);
  };

  const toggleCriterion = (key: string) => {
    setCriterionEnabled(prev => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const setCriterionScore = (pillar: ScoutPillarKey, label: string, val: number) => {
    const key = `${pillar}-${label}`;
    setCriterionScores(prev => ({ ...prev, [key]: val }));
  };


  const getPillarActiveCount = (pillar: ScoutPillarKey) => {
    const list = positionConfig.criteria[pillar] || [];
    return list.filter(c => {
      const lbl = typeof c === 'string' ? c : (c as any)?.label;
      return criterionEnabled[`${pillar}-${lbl}`] !== false;
    }).length;
  };

  const calcScore = (pillar: ScoutPillarKey) => {
    const criteria = positionConfig.criteria[pillar] || [];
    const active = criteria.filter(c => {
      const lbl = typeof c === 'string' ? c : (c as any)?.label;
      return criterionEnabled[`${pillar}-${lbl}`] !== false;
    });
    if (active.length === 0) return 0;
    const sum = active.reduce((acc, c) => {
      const lbl = typeof c === 'string' ? c : (c as any)?.label;
      return acc + (criterionScores[`${pillar}-${lbl}`] ?? 0);
    }, 0);
    return Math.round((sum / active.length) * 10) / 10;
  };

  const techScore = calcScore('technique');
  const tactScore = calcScore('tactique');
  const physScore = calcScore('physique');
  const mentScore = calcScore('mental');

  // Formule officielle pondérée dynamique : Tech 30%, Phys 25%, Tact 25%, Ment 20%
  const activePillars: { score: number; weight: number }[] = [];
  if (getPillarActiveCount('technique') > 0) activePillars.push({ score: techScore, weight: 0.30 });
  if (getPillarActiveCount('tactique') > 0) activePillars.push({ score: tactScore, weight: 0.25 });
  if (getPillarActiveCount('physique') > 0) activePillars.push({ score: physScore, weight: 0.25 });
  if (getPillarActiveCount('mental') > 0) activePillars.push({ score: mentScore, weight: 0.20 });

  const totalWeight = activePillars.reduce((acc, p) => acc + p.weight, 0);
  const overallScore = totalWeight > 0
    ? Math.round((activePillars.reduce((acc, p) => acc + p.score * p.weight, 0) / totalWeight) * 10) / 10
    : 7.0;

  // Trouver l'évaluation correspondante
  const currentEvaluation = (evaluations || []).find(e => selectedTestId ? e.test_id === selectedTestId : e.candidate_id === candidate.id)
    || (existingEvaluation && (!selectedTestId || existingEvaluation.test_id === selectedTestId) ? existingEvaluation : null);

  const handleDeleteEvaluation = async () => {
    if (!currentEvaluation?.id) {
      toast.error("Aucune évaluation trouvée.");
      return;
    }
    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(currentEvaluation.id);
        toast.success("L'évaluation a été supprimée avec succès.");
        setIsConfirmingDelete(false);
        onClose();
      }
    } catch (err) {
      console.error("Erreur suppression évaluation:", err);
      toast.error("Erreur lors de la suppression de l'évaluation.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSubmit = async (promoteToShortlist: boolean) => {
    if (!candidate?.id) return;
    setIsSubmitting(true);
    try {
      const candidateLatestEval = (evaluations || []).find(e => e.candidate_id === candidate.id) || existingEvaluation;
      const updateId = currentEvaluation?.id || candidateLatestEval?.id;

      await onSave({
        candidate_id: candidate.id,
        test_id: selectedTestId || undefined,
        test_name: selectedTest?.test_name || undefined,
        evaluator_id: evaluatorId || undefined,
        evaluator_name: evaluatorName.trim() || 'Hassan Benabicha',
        evaluator_role: evaluatorRole.trim() || 'Directeur du Recrutement',
        evaluation_date: evaluationDate,

        tech_report: techReport.trim() || undefined,
        tact_report: tactReport.trim() || undefined,
        phys_report: physReport.trim() || undefined,
        ment_report: mentReport.trim() || undefined,

        technical_score: techScore,
        physical_score: physScore,
        tactical_score: tactScore,
        mental_score: mentScore,
        criteria_scores: Object.fromEntries(
          Object.entries(criterionScores).flatMap(([key, value]) => {
            const label = key.split('-').slice(1).join('-');
            const title = parseCriterion(label).title;
            return [
              [key, value],
              [label, value],
              [title, value],
            ];
          })
        ),

        // Rétrocompatibilité legacy avec les anciens champs DB / composants (0 si non modifié)
        tech_ball_control: criterionScores['technique-Contrôle'] ?? criterionScores['technique-Prise de balle'] ?? 0,
        tech_first_touch: criterionScores['technique-Contrôle orienté'] ?? criterionScores['technique-Contrôle'] ?? 0,
        tech_passing_short: criterionScores['technique-Passe courte'] ?? criterionScores['technique-Passe'] ?? 0,
        tech_passing_long: criterionScores['technique-Passe longue'] ?? 0,
        tech_dribbling: criterionScores['technique-Dribble'] ?? 0,
        tech_crossing: criterionScores['technique-Centre'] ?? 0,
        tech_finishing: criterionScores['technique-Finition'] ?? criterionScores['technique-Tir'] ?? 0,
        tech_heading: criterionScores['technique-Jeu aérien'] ?? criterionScores['technique-Jeu de tête'] ?? 0,
        tech_1v1_attacking: criterionScores['technique-Duel 1v1'] ?? criterionScores['technique-1 contre 1'] ?? 0,
        tech_1v1_defending: criterionScores['technique-Tacle'] ?? 0,
        tech_weak_foot: 0,

        phys_acceleration: criterionScores['physique-Accélération'] ?? 0,
        phys_sprint_speed: criterionScores['physique-Vitesse'] ?? 0,
        phys_agility: criterionScores['physique-Agilité'] ?? 0,
        phys_balance: criterionScores['physique-Souplesse'] ?? criterionScores['physique-Coordination'] ?? 0,
        phys_strength: criterionScores['physique-Force'] ?? criterionScores['physique-Puissance'] ?? 0,
        phys_endurance: criterionScores['physique-Endurance'] ?? criterionScores['physique-Résistance'] ?? 0,
        phys_explosiveness: criterionScores['physique-Explosivité'] ?? criterionScores['physique-Détente'] ?? 0,

        tact_positioning: criterionScores['tactique-Placement'] ?? criterionScores['tactique-Positionnement'] ?? 0,
        tact_awareness: criterionScores['tactique-Lecture du jeu'] ?? criterionScores['tactique-Vision'] ?? 0,
        tact_decision_making: criterionScores['tactique-Prise de décision'] ?? 0,
        tact_anticipation: criterionScores['tactique-Anticipation'] ?? 0,
        tact_space_awareness: criterionScores['tactique-Gestion profondeur'] ?? criterionScores['tactique-Occupation espaces'] ?? 0,
        tact_transition: criterionScores['tactique-Transition défensive'] ?? criterionScores['tactique-Transition'] ?? 0,

        ment_concentration: criterionScores['mental-Concentration'] ?? 0,
        ment_discipline: criterionScores['mental-Discipline'] ?? 0,
        ment_motivation: criterionScores['mental-Combativité'] ?? criterionScores['mental-Courage'] ?? 0,
        ment_confidence: criterionScores['mental-Confiance'] ?? 0,
        ment_teamwork: criterionScores['mental-Communication'] ?? 0,
        ment_leadership: criterionScores['mental-Leadership'] ?? 0,
        ment_coachability: criterionScores['mental-Intelligence'] ?? 0,

        pos_specific_1_label: posTrait1Label,
        pos_specific_1_score: posTrait1Score,
        pos_specific_2_label: posTrait2Label,
        pos_specific_2_score: posTrait2Score,
        pos_specific_3_label: posTrait3Label,
        pos_specific_3_score: posTrait3Score,

        overall_score: overallScore,
        verdict: promoteToShortlist ? 'shortlist' : verdict,
        strengths: strengths.trim() || undefined,
        weaknesses: weaknesses.trim() || undefined,
        comments: comments.trim() || undefined,
      }, {
        isReevaluation: false,
        updateId,
        promoteToShortlist,
      });

      if (promoteToShortlist) {
        toast.success(`⭐ Évaluation validée ! ${candidate.first_name} ${candidate.last_name} est officiellement transféré dans la Shortlist & le Onze Idéal.`);
      } else {
        toast.success(`💾 Évaluation enregistrée (${overallScore.toFixed(1)}) ! Le joueur passe en "Test Réalisé". Les métriques sont conservées pour les prochaines sessions.`);
      }
      onClose();
    } catch (err) {
      console.error("Erreur sauvegarde évaluation:", err);
      toast.error("Erreur lors de l'enregistrement de l'évaluation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveInlineAdd = async (pillar: ScoutPillarKey) => {
    const trimmed = inlineNewCriterionName.trim();
    if (!trimmed) {
      toast.error("Veuillez saisir un nom de critère.");
      return;
    }
    
    // Convert to database update
    try {
      const posId = (positionConfig as any).id;
      if (!posId) throw new Error("ID du poste introuvable");
      
      const currentList = positionConfig.criteria[pillar] || [];
      if (currentList.some((c: string) => c.toLowerCase() === trimmed.toLowerCase())) {
        toast.error("Ce critère existe déjà pour ce profil.");
        return;
      }
      
      const updatedCriteria = {
        ...positionConfig.criteria,
        [pillar]: [...currentList, trimmed]
      };
      
      await updatePosition({ id: posId, data: { criteria: updatedCriteria } });
      
      const key = `${pillar}-${trimmed}`;
      setCriterionScores((prev) => ({ ...prev, [key]: 0 }));
      setCriterionEnabled((prev) => ({ ...prev, [key]: true }));
      setInlineNewCriterionName('');
      setInlineAddingPillar(null);
      toast.success(`Critère "${trimmed}" ajouté pour ${positionConfig.name}.`);
    } catch (err: any) {
      toast.error("Erreur lors de l'ajout du critère : " + err.message);
    }
  };

  const handleSaveInlineEdit = async () => {
    if (!editingCriterion) return;
    const trimmed = editingCriterionNewName.trim();
    if (!trimmed) {
      toast.error("Le nom du critère ne peut pas être vide.");
      return;
    }
    if (trimmed === editingCriterion.oldName) {
      setEditingCriterion(null);
      return;
    }

    try {
      const posId = (positionConfig as any).id;
      if (!posId) throw new Error("ID du poste introuvable");
      
      const currentList = positionConfig.criteria[editingCriterion.pillar] || [];
      if (currentList.some((c: string) => c.toLowerCase() === trimmed.toLowerCase() && c !== editingCriterion.oldName)) {
        toast.error("Un critère portant ce nom existe déjà.");
        return;
      }

      const updatedList = currentList.map((c: string) => c === editingCriterion.oldName ? trimmed : c);
      const updatedCriteria = {
        ...positionConfig.criteria,
        [editingCriterion.pillar]: updatedList
      };

      await updatePosition({ id: posId, data: { criteria: updatedCriteria } });

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
    } catch (err: any) {
      toast.error("Erreur lors de la modification : " + err.message);
    }
  };

  const handleInlineDeleteCriterion = async (pillar: ScoutPillarKey, label: string) => {
    const currentList = positionConfig.criteria[pillar] || [];
    if (currentList.length <= 1) {
      toast.error("Impossible de supprimer le dernier critère de ce pilier.");
      return;
    }

    try {
      const posId = (positionConfig as any).id;
      if (!posId) throw new Error("ID du poste introuvable");

      const updatedList = currentList.filter((c: string) => c !== label);
      const updatedCriteria = {
        ...positionConfig.criteria,
        [pillar]: updatedList
      };

      await updatePosition({ id: posId, data: { criteria: updatedCriteria } });

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
    } catch (err: any) {
      toast.error("Erreur lors de la suppression : " + err.message);
    }
  };

  const renderCriterionSlider = (pillar: ScoutPillarKey, label: string) => {
    const key = `${pillar}-${label}`;
    const isEnabled = criterionEnabled[key] ?? true;
    const value = criterionScores[key] ?? 0;
    const isEditing = editingCriterion?.pillar === pillar && editingCriterion?.oldName === label;
    const { title, detail } = parseCriterion(label);
    const isTooltipOpen = activeCriterionTooltip === key;

    let scoreBadgeColor = value === 0 ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-700';
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
                    {value === 0 ? '0' : value.toFixed(1)}
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
          min="0"
          max="10"
          step="0.1"
          disabled={!isEnabled}
          value={value}
          onChange={(e) => setCriterionScore(pillar, label, Number(e.target.value))}
          className={cn(
            "w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary",
            isEnabled ? "bg-slate-200" : "bg-slate-200 opacity-40 cursor-not-allowed"
          )}
        />
      </div>
    );
  };

  const renderPillarSection = (
    pillar: ScoutPillarKey,
    letter: string,
    label: string,
    desc: string,
    score: number
  ) => {
    const criteria = positionConfig.criteria[pillar] || [];
    const isAdding = inlineAddingPillar === pillar;

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b gap-2">
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2 flex-wrap">
              <span>{letter}. Critères {label} — {getMetricPositionFrenchName(positionConfig)}</span>
            </h4>
            <p className="text-[11px] text-muted-foreground">{desc}</p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-bold">
              ({(positionConfig.criteria[pillar] || []).filter(c => {
                const lbl = typeof c === 'string' ? c : (c as any)?.label;
                return criterionEnabled[`${pillar}-${lbl}`] !== false;
              }).length}/{(positionConfig.criteria[pillar] || []).length} critères pris en compte)
            </span>
            <span className="text-xs font-bold text-primary">Moyenne Pilier : {score.toFixed(1)}</span>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  setInlineAddingPillar(isAdding ? null : pillar);
                  setInlineNewCriterionName('');
                }}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 flex items-center gap-1 transition cursor-pointer"
                title="Ajouter un critère pour ce profil (Super Admin)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAdding ? 'Annuler' : 'Ajouter un critère'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Barre d'ajout rapide pour Super Admin */}
        {isSuperAdmin && isAdding && (
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center gap-2 animate-in fade-in duration-150">
            <input
              type="text"
              placeholder={`Nouveau critère ${label.toLowerCase()} pour ${positionConfig.name}...`}
              value={inlineNewCriterionName}
              onChange={(e) => setInlineNewCriterionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveInlineAdd(pillar);
                }
                if (e.key === 'Escape') {
                  setInlineAddingPillar(null);
                }
              }}
              autoFocus
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900"
            />
            <button
              type="button"
              onClick={() => handleSaveInlineAdd(pillar)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Valider</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {criteria.map((crit) => renderCriterionSlider(pillar, crit))}
        </div>

        {/* Champ Rapport direct sous la grille */}
        <div className="mt-4 p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-blue-900">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Rapport & Observations {label} (Scout)</span>
          </label>
          <textarea
            rows={3}
            value={
              pillar === 'technique' ? techReport :
              pillar === 'tactique' ? tactReport :
              pillar === 'physique' ? physReport :
              mentReport
            }
            onChange={(e) => {
              const val = e.target.value;
              if (pillar === 'technique') setTechReport(val);
              else if (pillar === 'tactique') setTactReport(val);
              else if (pillar === 'physique') setPhysReport(val);
              else setMentReport(val);
            }}
            placeholder={`Commentaires et observations détaillées pour la dimension ${label.toLowerCase()}...`}
            className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200/90 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-xs"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  <span>Évaluation 1–10 : {candidate.first_name} {candidate.last_name}</span>
                </h3>

                {/* Badge du Poste Spécifique Détecté */}
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5 shadow-xs">
                  <span>{getMetricPositionFrenchName(positionConfig)}</span>
                </span>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsCriteriaManagerOpen(true)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 flex items-center gap-1 transition cursor-pointer"
                    title="Gérer les critères d'évaluation de ce poste (Super Admin)"
                  >
                    <Sliders className="w-3 h-3 text-amber-600" />
                    <span>Gérer critères ({getMetricPositionFrenchName(positionConfig)})</span>
                  </button>
                )}

                {selectedTest && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-700" />
                    <span>Test du {selectedTest.test_date}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Évaluation approfondie du scout • Grille spécialisée pour le poste de <strong>{positionConfig.name}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Score Global Pondéré</span>
                <div className="text-2xl font-black text-primary">
                  {overallScore.toFixed(1)}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Badge informatif session liée */}
          {selectedTestId && (
            <div className="mt-3 p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center gap-2.5 text-xs text-blue-900 animate-in fade-in duration-200">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <strong>Session liée :</strong> {selectedTest?.test_name || 'Test Club'} le <strong>{selectedTest?.test_date}</strong>. Évaluation ouverte et modifiable.
              </div>
            </div>
          )}
        </div>

        {/* FICHE CANDIDAT DÉTAILLÉE (VUE SYNTHÉTIQUE COMPLÈTE) */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 border-b shadow-inner">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-primary/20 text-primary">
                <User className="w-3.5 h-3.5 text-red-400" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                Fiche Candidat Détaillée
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                {candidate.age_category || 'U17'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Bouton : Ajouter joueur */}
              {onAddPlayer && (
                <button
                  type="button"
                  onClick={() => { onClose(); onAddPlayer(); }}
                  className="text-[11px] font-bold text-white px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Créer une nouvelle fiche joueur"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Ajouter joueur</span>
                </button>
              )}

              {/* Bouton : Ajouter un rapport */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/recruitment-v2/add-report?candidateId=${candidate.id}`);
                }}
                className="text-[11px] font-bold text-white px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Rédiger un rapport scout dans une page dédiée"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Ajouter un rapport</span>
              </button>

              {/* Toggle fiche */}
              <button
                type="button"
                onClick={() => setIsCandidateCardExpanded(prev => !prev)}
                className="text-[11px] font-bold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 transition-all flex items-center gap-1 cursor-pointer"
              >
                {isCandidateCardExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Réduire fiche</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Afficher détails</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Corps de la Fiche Détaillée */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Colonne 1 : Avatar & Identité (md:col-span-4) */}
            <div className="md:col-span-4 flex items-center gap-3">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 border-2 border-white/20 overflow-hidden flex items-center justify-center font-black text-white text-lg shrink-0 shadow-md">
                {candidate.photo_url ? (
                  <img
                    src={candidate.photo_url}
                    alt={`${candidate.first_name} ${candidate.last_name}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  `${candidate.first_name?.[0] || ''}${candidate.last_name?.[0] || ''}`
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-black text-white truncate leading-tight">
                  {candidate.first_name} {candidate.last_name}
                </h4>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-primary text-white">
                    {candidate.primary_position}
                  </span>
                  {candidate.secondary_position && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-white/10 text-slate-300">
                      /{candidate.secondary_position}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-300 font-medium">
                    {candidate.nationality || 'Marocaine'}
                  </span>
                </div>
                {candidate.birth_date && (
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {new Date(candidate.birth_date).toLocaleDateString('fr-FR')} {(() => {
                      const age = Math.floor((Date.now() - new Date(candidate.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                      return !isNaN(age) && age > 0 ? `(${age} ans)` : '';
                    })()}
                  </p>
                )}
              </div>
            </div>

            {/* Colonne 2 & 3 : Morphologie, Club & Contacts */}
            {isCandidateCardExpanded ? (
              <>
                {/* Caractéristiques Sportives (md:col-span-4) */}
                <div className="md:col-span-4 grid grid-cols-3 gap-2 bg-white/5 p-2.5 rounded-2xl border border-white/10 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Pied Fort</span>
                    <span className="font-bold text-white text-xs">{candidate.preferred_foot || 'Droitier'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Taille / Poids</span>
                    <span className="font-bold text-white text-xs">
                      {candidate.height_cm ? `${candidate.height_cm} cm` : '-'} / {candidate.weight_kg ? `${candidate.weight_kg} kg` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Club Actuel</span>
                    <span className="font-bold text-white text-xs truncate block" title={candidate.current_club}>
                      {candidate.current_club || 'Sans club'}
                    </span>
                  </div>
                </div>

                {/* Tuteur & Encadrement Scout (md:col-span-4) */}
                <div className="md:col-span-4 space-y-1.5 text-xs bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  {candidate.guardian_name ? (
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <HeartHandshake className="w-3 h-3 text-amber-400 shrink-0" />
                        Tuteur :
                      </span>
                      <span className="font-bold text-amber-200 truncate">
                        {candidate.guardian_name} {candidate.guardian_phone ? `(${candidate.guardian_phone})` : ''}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Ville / Origine :</span>
                      <span className="font-bold text-slate-200">{candidate.city || candidate.country || 'Maroc'}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-1.5 text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      Découvreur :
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ScoutAvatar
                        scoutId={candidate.discovering_scout_id}
                        scoutName={candidate.discovering_scout_name || 'Cellule FUS'}
                        scouts={scouts}
                        size="xs"
                      />
                      <span className="font-bold text-blue-200 truncate">
                        {candidate.discovering_scout_name || 'Cellule FUS'}
                      </span>
                    </div>
                  </div>

                  {candidate.recruiter_name && (
                    <div className="flex items-center justify-between gap-1.5 text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        Scout :
                      </span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ScoutAvatar
                          scoutId={candidate.recruiter_id}
                          scoutName={candidate.recruiter_name}
                          scouts={scouts}
                          size="xs"
                        />
                        <span className="font-bold text-emerald-200 truncate">
                          {candidate.recruiter_name}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="md:col-span-8 flex items-center justify-end gap-3 text-xs text-slate-300">
                <span>Pied : <strong>{candidate.preferred_foot}</strong></span>
                <span>•</span>
                <span>Taille : <strong>{candidate.height_cm ? `${candidate.height_cm}cm` : '-'}</strong></span>
                <span>•</span>
                <span>Club : <strong>{candidate.current_club || 'Sans club'}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Test Sessions Selector / Info Bar */}
        <div className="bg-slate-50/90 border-b px-6 py-3 space-y-2">
          {candidateTests.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-slate-800">
                    Sessions de Test Disponibles ({candidateTests.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    — Rattachez l'évaluation à une session ou évaluez en mode autonome :
                  </span>
                </div>
                {onOpenScheduleTest && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenScheduleTest(candidate);
                    }}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Programmer une autre session</span>
                  </button>
                )}
              </div>

              <div className="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
                {/* Option Évaluation Autonome Scout */}
                <button
                  type="button"
                  onClick={() => handleSelectTest('')}
                  className={cn(
                    "p-2.5 rounded-2xl border text-left transition-all shrink-0 min-w-[200px] flex flex-col justify-between space-y-1.5 cursor-pointer",
                    !selectedTestId
                      ? "bg-white border-primary ring-2 ring-primary/20 shadow-sm"
                      : "bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white"
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1 truncate">
                      <UserCheck className="w-3.5 h-3.5 text-primary" />
                      Évaluation Autonome
                    </span>
                    {!selectedTestId && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        Sélectionné
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Observation scout directe
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Sans session terrain liée
                  </div>
                </button>

                {/* Sessions de tests du candidat */}
                {candidateTests.map((t) => {
                  const isSelected = t.id === selectedTestId;
                  const testEval = (evaluations || []).find((e) => e.test_id === t.id) || (existingEvaluation?.test_id === t.id ? existingEvaluation : null);
                  const isFuture = t.test_date > todayStr;
                  const startTime = t.start_time || '10:00';
                  const endTime = t.end_time || '12:00';

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTest(t.id)}
                      className={cn(
                        "p-2.5 rounded-2xl border text-left transition-all shrink-0 min-w-[230px] max-w-[280px] flex flex-col justify-between space-y-1.5 cursor-pointer",
                        isSelected
                          ? "bg-white border-primary ring-2 ring-primary/20 shadow-sm"
                          : "bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white"
                      )}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1 truncate">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          {t.test_date}
                        </span>
                        {testEval ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✅ {typeof testEval.overall_score === 'number' ? testEval.overall_score.toFixed(1) : testEval.overall_score}
                          </span>
                        ) : isFuture ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border">
                            🔒 Prévu
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            ⏱️ À évaluer
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-600 flex items-center gap-1 font-semibold">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{startTime} - {endTime}</span>
                        <span className="text-slate-300">•</span>
                        <span className="truncate">{t.test_name}</span>
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{t.training_ground || t.location || 'Terrain FUS'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-700 bg-white p-2.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary shrink-0" />
                <span>
                  <strong>Mode Évaluation Approfondie Scout :</strong> saisie directe pour <strong>{candidate.first_name} {candidate.last_name}</strong> (Aucun test terrain prérequis à cette étape).
                </span>
              </div>
              {onOpenScheduleTest && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenScheduleTest(candidate);
                  }}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 shrink-0 cursor-pointer ml-2"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Programmer un test club</span>
                </button>
              )}
            </div>
          )}

          {/* Information si l'évaluation est déjà enregistrée */}
          {currentEvaluation && (
            <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">
                  <strong>Évaluation existante :</strong> Note globale {typeof currentEvaluation.overall_score === 'number' ? currentEvaluation.overall_score.toFixed(1) : currentEvaluation.overall_score} par {currentEvaluation.evaluator_name || 'Scout FUS'}. Vous pouvez ajuster les critères ou supprimer.
                </span>
              </div>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-700 hover:text-rose-800 hover:bg-rose-100 border border-rose-200 transition-colors shrink-0 flex items-center gap-1 ml-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b bg-white px-6 overflow-x-auto gap-2 py-2.5">
          {[
            { id: 'scout', label: '👤 Scout', score: undefined },
            { id: 'profile', label: '📋 Fiche Joueur', score: undefined },
            { id: 'tech', label: '⚽ Technique', score: techScore },
            { id: 'tact', label: '🧭 Tactique', score: tactScore },
            { id: 'phys', label: '🏃 Physique', score: physScore },
            { id: 'ment', label: '🧠 Mental', score: mentScore },
            { id: 'position', label: '🎯 Spécifique Poste', score: undefined },
            { id: 'verdict', label: '⚖️ Verdict Final', score: undefined },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer",
                activeTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <span>{tab.label}</span>
              {tab.score !== undefined && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md text-[10px]",
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700 font-bold"
                )}>
                  {tab.score}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit(false); }} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* TAB FICHE COMPLÈTE DU CANDIDAT */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>Dossier & Informations Complètes du Joueur</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Données d'état civil, parcours sportif, coordonnées et encadrement</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. État Civil & Identité */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h5 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                    <User className="w-3.5 h-3.5 text-primary" /> État Civil & Identité
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Nom complet</span>
                      <span className="font-bold text-slate-800">{candidate.first_name} {candidate.last_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Date & Lieu Naiss.</span>
                      <span className="font-bold text-slate-800">
                        {candidate.birth_date ? new Date(candidate.birth_date).toLocaleDateString('fr-FR') : '—'} {candidate.birth_place ? `(${candidate.birth_place})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Nationalité</span>
                      <span className="font-bold text-slate-800">{candidate.nationality || 'Marocaine'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Ville / Pays</span>
                      <span className="font-bold text-slate-800">{candidate.city || '—'} {candidate.country ? `(${candidate.country})` : ''}</span>
                    </div>
                    {candidate.address && (
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-400 block font-medium">Adresse</span>
                        <span className="font-bold text-slate-800">{candidate.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Profil Sportif & Morphologie */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h5 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                    <Shield className="w-3.5 h-3.5 text-primary" /> Profil Sportif & Morphologie
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Poste Principal</span>
                      <span className="font-bold text-slate-800">{candidate.primary_position} {candidate.secondary_position ? `(${candidate.secondary_position})` : ''}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Catégorie d'Âge</span>
                      <span className="font-bold text-slate-800">{candidate.age_category || 'U17'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Pied Fort</span>
                      <span className="font-bold text-slate-800">{candidate.preferred_foot || 'Droitier'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Taille / Poids</span>
                      <span className="font-bold text-slate-800">{candidate.height_cm ? `${candidate.height_cm} cm` : '—'} / {candidate.weight_kg ? `${candidate.weight_kg} kg` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Club Actuel</span>
                      <span className="font-bold text-slate-800">{candidate.current_club || 'Sans club'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Club d'Origine</span>
                      <span className="font-bold text-slate-800">{candidate.origin_club || candidate.previous_clubs || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Tuteur Légal & Urgence */}
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                  <h5 className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5 pb-2 border-b border-amber-200">
                    <HeartHandshake className="w-3.5 h-3.5 text-amber-700" /> Tuteur Légal & Contact d'Urgence
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-amber-700 block font-medium">Nom du Tuteur</span>
                      <span className="font-bold text-slate-800">{candidate.guardian_name || 'Non renseigné'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-700 block font-medium">Lien de Parenté</span>
                      <span className="font-bold text-slate-800">{candidate.guardian_relationship || 'Père'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-700 block font-medium">Téléphone Tuteur</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-amber-600" />
                        {candidate.guardian_phone || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-700 block font-medium">Téléphone Candidat</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {candidate.phone || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Cellule de Détection & Encadrement */}
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
                  <h5 className="text-xs font-black uppercase text-blue-900 flex items-center gap-1.5 pb-2 border-b border-blue-200">
                    <Briefcase className="w-3.5 h-3.5 text-blue-700" /> Cellule de Détection & Suivi FUS
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-blue-700 block font-medium mb-1">Scout Découvreur</span>
                      <div className="flex items-center gap-1.5">
                        <ScoutAvatar
                          scoutId={candidate.discovering_scout_id}
                          scoutName={candidate.discovering_scout_name || 'Cellule FUS'}
                          scouts={scouts}
                          size="xs"
                        />
                        <span className="font-bold text-slate-800">{candidate.discovering_scout_name || 'Cellule FUS'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-700 block font-medium mb-1">Recruteur Assigné</span>
                      <div className="flex items-center gap-1.5">
                        <ScoutAvatar
                          scoutId={candidate.recruiter_id}
                          scoutName={candidate.recruiter_name || 'Direction Recrutement'}
                          scouts={scouts}
                          size="xs"
                        />
                        <span className="font-bold text-slate-800">{candidate.recruiter_name || 'Direction Recrutement'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-700 block font-medium">Source d'Information</span>
                      <span className="font-bold text-slate-800 capitalize">{candidate.information_source || 'Terrain'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-700 block font-medium">Note Initiale Scout</span>
                      <span className="font-bold text-primary">{candidate.initial_scout_score ? `${candidate.initial_scout_score}/10` : '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 0 : SCOUT RESPONSABLE */}
          {activeTab === 'scout' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>👤 Scout Responsable & Informations d'Évaluation</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Sélectionnez le scout référent et renseignez l'évaluateur de ce joueur</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-4">
                <h5 className="text-xs font-bold text-blue-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  Sélection du Scout Référent
                </h5>

                {scouts.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Choisir un Scout dans l'Équipe FUS *</label>
                    <select
                      value={evaluatorId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setEvaluatorId(id);
                        const found = scouts.find(s => s.id === id);
                        if (found) {
                          setEvaluatorName(found.full_name);
                          const cleanRole = (!found.role_title || found.role_title.includes('Scout') || found.role_title.includes('Détecteur') || found.role_title.includes('Recruteur'))
                            ? 'Scout'
                            : found.role_title;
                          setEvaluatorRole(cleanRole);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-blue-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                    >
                      <option value="">-- Sélectionner un scout dans la liste --</option>
                      {scouts.map(scout => {
                        const cleanRole = (!scout.role_title || scout.role_title.includes('Scout') || scout.role_title.includes('Détecteur') || scout.role_title.includes('Recruteur'))
                          ? 'Scout'
                          : scout.role_title;
                        return (
                          <option key={scout.id} value={scout.id}>
                            {scout.full_name} ({cleanRole}) — Région: {scout.recruitment_region || 'Maroc'}
                          </option>
                        );
                      })}
                    </select>

                    {(() => {
                      const selScout = scouts.find(s => s.id === evaluatorId || s.full_name?.toLowerCase().trim() === evaluatorName.toLowerCase().trim());
                      if (!selScout) return null;
                      return (
                        <div className="mt-3 flex items-center gap-3 p-3 bg-white rounded-xl border border-blue-200/90 shadow-2xs">
                          <ScoutAvatar
                            scout={selScout}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-slate-900 truncate">{selScout.full_name}</p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {selScout.role_title} • Région: {selScout.recruitment_region || 'Maroc'}
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide shrink-0">
                            Scout Assigné
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nom Complet de l'Évaluateur *</label>
                    <input
                      type="text"
                      required
                      value={evaluatorName}
                      onChange={(e) => setEvaluatorName(e.target.value)}
                      placeholder="Ex: Hassan Benabicha"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Rôle / Fonction de l'Évaluateur</label>
                    <input
                      type="text"
                      value={evaluatorRole}
                      onChange={(e) => setEvaluatorRole(e.target.value)}
                      placeholder="Ex: Directeur du Recrutement, Scout U15"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date de la Session / Observation *</label>
                  <input
                    type="date"
                    required
                    value={evaluationDate}
                    onChange={(e) => setEvaluationDate(e.target.value)}
                    className="w-full sm:w-1/2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Résumé des Rapports Rédigés par Pilier */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  État des Rapports Textuels par Onglet
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className={cn("p-2.5 rounded-xl border flex items-center justify-between", techReport ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-white border-slate-200 text-slate-500")}>
                    <span>⚽ Rapport Technique :</span>
                    <span className="font-bold">{techReport ? '✓ Rédigé' : 'Non renseigné'}</span>
                  </div>
                  <div className={cn("p-2.5 rounded-xl border flex items-center justify-between", tactReport ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-white border-slate-200 text-slate-500")}>
                    <span>🧭 Rapport Tactique :</span>
                    <span className="font-bold">{tactReport ? '✓ Rédigé' : 'Non renseigné'}</span>
                  </div>
                  <div className={cn("p-2.5 rounded-xl border flex items-center justify-between", physReport ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-white border-slate-200 text-slate-500")}>
                    <span>🏃 Rapport Physique :</span>
                    <span className="font-bold">{physReport ? '✓ Rédigé' : 'Non renseigné'}</span>
                  </div>
                  <div className={cn("p-2.5 rounded-xl border flex items-center justify-between", mentReport ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-white border-slate-200 text-slate-500")}>
                    <span>🧠 Rapport Mental :</span>
                    <span className="font-bold">{mentReport ? '✓ Rédigé' : 'Non renseigné'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1 : TECHNIQUE */}
          {activeTab === 'tech' && renderPillarSection('technique', 'A', 'Techniques', 'Barème 1 à 10 spécifique au poste', techScore)}

          {/* TAB 2 : TACTIQUE */}
          {activeTab === 'tact' && renderPillarSection('tactique', 'B', 'Tactiques', 'Intelligence, vision & placement adaptés au rôle', tactScore)}

          {/* TAB 3 : PHYSIQUE */}
          {activeTab === 'phys' && renderPillarSection('physique', 'C', 'Physiques & Athlétiques', 'Vitesse, endurance et profil athlétique requis', physScore)}

          {/* TAB 4 : MENTAL */}
          {activeTab === 'ment' && renderPillarSection('mental', 'D', 'Mentaux & Psychologiques', 'Force mentale, lucidité et leadership attendus', mentScore)}

          {/* TAB 5 : POSITION SPECIFIC */}
          {activeTab === 'position' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Critères Additionnels Spécifiques : {candidate.primary_position}</h4>
                  <p className="text-[11px] text-muted-foreground">Traits complémentaires distinctifs du profil</p>
                </div>
                <span className="text-xs font-bold text-slate-500">Adaptation au poste</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Trait 1 */}
                <div className="p-3 rounded-2xl border bg-slate-50/90 border-slate-200/80 space-y-2">
                  <div className="flex justify-between items-center text-xs gap-2">
                    <span className="font-bold text-slate-800 truncate">{posTrait1Label}</span>
                    <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700">
                      {posTrait1Score.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={posTrait1Score}
                    onChange={(e) => setPosTrait1Score(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary bg-slate-200"
                  />
                </div>

                {/* Trait 2 */}
                <div className="p-3 rounded-2xl border bg-slate-50/90 border-slate-200/80 space-y-2">
                  <div className="flex justify-between items-center text-xs gap-2">
                    <span className="font-bold text-slate-800 truncate">{posTrait2Label}</span>
                    <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700">
                      {posTrait2Score.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={posTrait2Score}
                    onChange={(e) => setPosTrait2Score(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary bg-slate-200"
                  />
                </div>

                {/* Trait 3 */}
                <div className="p-3 rounded-2xl border bg-slate-50/90 border-slate-200/80 space-y-2">
                  <div className="flex justify-between items-center text-xs gap-2">
                    <span className="font-bold text-slate-800 truncate">{posTrait3Label}</span>
                    <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700">
                      {posTrait3Score.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={posTrait3Score}
                    onChange={(e) => setPosTrait3Score(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary bg-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6 : VERDICT FINAL */}
          {activeTab === 'verdict' && (
            <div className="space-y-4">
              {/* Liaison Session de Test (Optionnelle pour le scout) */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    Session de Test Club (Optionnel)
                  </label>
                  {selectedTestId && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800">
                      ✓ Lié au test ({selectedTest?.test_date})
                    </span>
                  )}
                </div>
                <select
                  value={selectedTestId}
                  onChange={(e) => handleSelectTest(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="">-- Évaluation autonome Scout (sans session liée) --</option>
                  {candidateTests.map(t => {
                    const testEval = (evaluations || []).find((e) => e.test_id === t.id) || (existingEvaluation?.test_id === t.id ? existingEvaluation : null);
                    const startTime = t.start_time || '10:00';
                    const endTime = t.end_time || '12:00';
                    const location = t.training_ground || t.location || 'Terrain FUS';
                    return (
                      <option key={t.id} value={t.id}>
                        {t.test_date > todayStr ? '🔒 ' : '⚽ '} {t.test_date} ({startTime} - {endTime}) — {t.test_name} ({location}) [{testEval ? `✅ Déjà évalué (${testEval.overall_score}/10)` : t.status === 'completed' ? 'Complété' : 'Planifié'}]
                      </option>
                    );
                  })}
                </select>

                <p className="text-[11px] text-amber-800 mt-1.5">
                  {selectedTestId
                    ? "L'évaluation est rattachée à cette session de test et synchronisera son statut."
                    : "Évaluation approfondie du scout enregistrée directement sur la fiche du joueur (sans test terrain obligatoire)."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Décision / Recommandation Officielle *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'contract_proposal', label: '🔥 Contrat / Signature Pro', color: 'border-red-500 bg-red-50 text-red-900' },
                    { id: 'recommend_academy', label: '⭐ Intégrer Académie', color: 'border-blue-500 bg-blue-50 text-blue-900' },
                    { id: 'shortlist', label: '📋 Shortlist Prioritaire', color: 'border-emerald-500 bg-emerald-50 text-emerald-900' },
                    { id: 'additional_test', label: '⏱️ Test Additionnel', color: 'border-amber-500 bg-amber-50 text-amber-900' },
                    { id: 'monitor', label: '🔍 Suivre en Matchs', color: 'border-purple-500 bg-purple-50 text-purple-900' },
                    { id: 'reject', label: '❌ Non Retenu', color: 'border-slate-500 bg-slate-50 text-slate-900' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVerdict(v.id as EvaluationVerdict)}
                      className={cn(
                        "p-3 rounded-2xl border text-xs font-bold text-left transition-all cursor-pointer",
                        verdict === v.id ? `${v.color} shadow ring-2 ring-primary/20` : "border-slate-200 bg-white hover:bg-slate-50"
                      )}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Points Forts Majeurs</label>
                  <textarea
                    rows={3}
                    value={strengths}
                    onChange={(e) => setStrengths(e.target.value)}
                    placeholder="Qualités athlétiques, gestes techniques distinctifs..."
                    className="w-full px-3.5 py-2 rounded-xl border text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Axes d'Amélioration</label>
                  <textarea
                    rows={3}
                    value={weaknesses}
                    onChange={(e) => setWeaknesses(e.target.value)}
                    placeholder="Aspects tactiques ou physiques à travailler..."
                    className="w-full px-3.5 py-2 rounded-xl border text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rapport de Synthèse pour la Direction</label>
                <textarea
                  rows={2}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Recommandation générale..."
                  className="w-full px-3.5 py-2 rounded-xl border text-sm"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span>Score Global Pondéré :</span>
              <span className="font-black text-primary text-base">{overallScore.toFixed(1)}</span>
              {currentEvaluation && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  Mode Édition
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentEvaluation && onDelete && (
                <button
                  type="button"
                  disabled={isSubmitting || isDeleting}
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer l'Évaluation</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Annuler
              </button>

              {/* Action 1 : Enregistrer l'évaluation intermédiaire durant la semaine de test (Test Réalisé) */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleFormSubmit(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                title="Conserver les métriques et passer le dossier en Test Réalisé (durant la semaine de test)"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-500" />
                <span>💾 Enregistrer (Test Réalisé)</span>
              </button>

              {/* Action 2 : Confirmation finale et passation officielle vers Shortlist & Onze Idéal */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleFormSubmit(true)}
                className="px-5 py-2 rounded-xl text-white text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer bg-primary hover:bg-primary/90 disabled:opacity-50"
                title="Validation finale de la semaine de test : confirmer la passation vers la Shortlist & le Onze Idéal"
              >
                <Crown className="w-4 h-4 text-amber-300" />
                <span>⭐ Confirmer vers Shortlist ({overallScore.toFixed(1)})</span>
              </button>
            </div>
          </div>
        </form>

        {/* Modal de confirmation de suppression */}
        {isConfirmingDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Supprimer cette évaluation ?</h4>
                  <p className="text-xs text-slate-500">
                    {candidate.first_name} {candidate.last_name} ({candidate.primary_position})
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 space-y-1 font-medium">
                <p>Cette action supprimera définitivement les notes et le rapport d'évaluation associés.</p>
              </div>

              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteEvaluation}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow flex items-center gap-1.5 cursor-pointer"
                >
                  {isDeleting ? 'Suppression...' : 'Confirmer la suppression'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Super Admin Criteria Manager Modal */}
        {isSuperAdmin && (
          <ScoutCriteriaManagerModal
            isOpen={isCriteriaManagerOpen}
            onClose={() => setIsCriteriaManagerOpen(false)}
            defaultPositionCode={positionConfig.code}
          />
        )}

        {/* Rapport de Scout (3 Onglets à l'ancienne : 3. Rapport, 4. Qualités, 5. Rapport Scout) */}
        {isReportWizardOpen && (
          <CandidateModal
            isOpen={isReportWizardOpen}
            mode="report_only"
            initialTab="sport"
            onClose={() => setIsReportWizardOpen(false)}
            candidate={candidate}
            scouts={scouts || []}
            onSave={async (candUpdates, evalData) => {
              if (evalData) {
                await onSave(evalData as any);
              }
              toast.success(`Rapport de scout enregistré pour ${candidate.first_name} ${candidate.last_name} !`);
              setIsReportWizardOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default EvaluationModal;
