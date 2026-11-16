import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Activity,
  Bot,
  Calendar,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  Info,
  Key,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Shield,
  Sparkles,
  Target,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import {
  PlayerPerformanceRadarChart,
  type RadarEvaluationSnapshot,
  type RadarViewMode,
} from '../../../components/metrics/PlayerPerformanceRadarChart';
import {
  PlayerPerformanceEvolutionChart,
  type PerformanceSourceFilter,
} from '../../../components/metrics/PlayerPerformanceEvolutionChart';
import {
  playerPerformanceService,
  type PlayerPerformanceEvaluation,
} from '../../../services/playerPerformanceService';
import {
  geminiPerformanceService,
  MISSING_GEMINI_API_KEY_ERROR,
  type GeminiPerformanceSynthesis,
} from '../../../services/geminiPerformanceService';
import { geminiVisionService } from '../../../services/geminiVisionService';
import { useMetricSets } from '../../../hooks/useMetricSets';
import { usePermissions } from '../../../context/PermissionsContext';
import {
  computeIntegerPillarAveragesFromCriteria,
  getMetricPositionFrenchName,
  parseMetricCriterionLabel,
  resolveMetricSetForRubric,
  resolveMetricSetPositionForPlayer,
  type MetricPillar,
  type MetricSet,
  type MetricSetPosition,
} from '../../../utils/metricSetsHelpers';
import type { Player } from '../../../types';
import { cn } from '../../../lib/utils';

interface PlayerPerformanceSectionProps {
  player: Player;
  rawPlayerMatches: any[];
  opponentClubs?: any[];
  mainClub?: any;
  canEditPerformance: boolean;
}

const DEFAULT_CRITERION_INT = 5;

const PILLAR_CONFIG: Array<{
  key: MetricPillar;
  letter: string;
  tabLabel: string;
  sectionTitle: string;
  subtitle: string;
}> = [
    {
      key: 'technique',
      letter: 'A',
      tabLabel: 'Technique',
      sectionTitle: 'Techniques',
      subtitle: 'Barème entier 0 à 10 spécifique au poste',
    },
    {
      key: 'tactique',
      letter: 'B',
      tabLabel: 'Tactique',
      sectionTitle: 'Tactiques',
      subtitle: 'Intelligence, vision & placement',
    },
    {
      key: 'physique',
      letter: 'C',
      tabLabel: 'Physique',
      sectionTitle: 'Physiques & Athlétiques',
      subtitle: 'Vitesse, endurance et profil athlétique',
    },
    {
      key: 'mental',
      letter: 'D',
      tabLabel: 'Mental',
      sectionTitle: 'Mentaux & Comportement',
      subtitle: 'Mentalité, discipline et leadership',
    },
  ];

function formatReadableDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy', { locale: fr });
  } catch {
    return dateStr;
  }
}

function getScoreBadgeClasses(score: number): string {
  if (score >= 9) return 'bg-rose-50 text-rose-700 border-rose-200 font-black';
  if (score >= 7) return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-black';
  if (score >= 5) return 'bg-slate-100 text-slate-800 border-slate-200 font-black';
  if (score > 0) return 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
  return 'bg-slate-100 text-slate-400 border-slate-200 font-bold';
}

function buildDefaultCriteriaMap(
  position: MetricSetPosition | null,
  baseScore = DEFAULT_CRITERION_INT
): Record<string, number> {
  const next: Record<string, number> = {};
  if (!position?.criteria) return next;
  for (const pillar of ['technique', 'tactique', 'physique', 'mental'] as MetricPillar[]) {
    for (const crit of position.criteria[pillar] || []) {
      next[`${pillar}:${crit}`] = baseScore;
    }
  }
  return next;
}

export const PlayerPerformanceSection: React.FC<PlayerPerformanceSectionProps> = ({
  player,
  rawPlayerMatches,
  opponentClubs = [],
  mainClub = null,
  canEditPerformance,
}) => {
  const { authState } = usePermissions();
  const { metricSets, allSetPositions, getPositionsForSet, isScoutUser } = useMetricSets();

  const currentRole = authState.user?.system_role || authState.roles?.[0];
  const currentJobTitle = authState.user?.job_title;

  const [dbEvaluations, setDbEvaluations] = useState<PlayerPerformanceEvaluation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sourceFilter, setSourceFilter] = useState<PerformanceSourceFilter>('all');

  // Mode : 'create' (saisie / modification) vs 'inspect' (consultation d'un point historique)
  const [boardMode, setBoardMode] = useState<'create' | 'inspect'>(() =>
    canEditPerformance ? 'create' : 'inspect'
  );
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  const [editingEval, setEditingEval] = useState<PlayerPerformanceEvaluation | null>(null);

  // Navigation synchronisée entre Radar (haut) & Grille critères (bas)
  const [activePillarTab, setActivePillarTab] = useState<MetricPillar>('tactique');
  const [radarViewMode, setRadarViewMode] = useState<RadarViewMode>('tactique');
  const [activeCriterionTooltip, setActiveCriterionTooltip] = useState<string | null>(null);

  // Sélecteur Lot & Poste choisi pour l'évaluation (jamais écrasé après choix manuel)
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [selectedPosCode, setSelectedPosCode] = useState<string>('');
  const hasUserPickedPosRef = useRef<boolean>(false);

  // Saisie évaluation (entiers stricts 0..10) + Mot du coach + Synthèse Gemini AI
  const [evaluationDate, setEvaluationDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({});
  const [manualPillarScores, setManualPillarScores] = useState<Record<MetricPillar, number>>({
    technique: DEFAULT_CRITERION_INT,
    tactique: DEFAULT_CRITERION_INT,
    physique: DEFAULT_CRITERION_INT,
    mental: DEFAULT_CRITERION_INT,
  });
  const [coachNote, setCoachNote] = useState<string>('');
  const [draftSynthesis, setDraftSynthesis] = useState<GeminiPerformanceSynthesis | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Configuration rapide clé Gemini si non encore renseignée dans Paramètres Club
  const [showInlineGeminiKey, setShowInlineGeminiKey] = useState<boolean>(false);
  const [inlineGeminiKey, setInlineGeminiKey] = useState<string>(() =>
    geminiVisionService.getApiKey()
  );
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);

  const boardTopRef = useRef<HTMLDivElement | null>(null);

  const loadEvaluations = useCallback(async () => {
    if (!player?.id || isScoutUser) {
      setDbEvaluations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await playerPerformanceService.listByPlayer(
        player.id,
        currentRole,
        currentJobTitle
      );
      setDbEvaluations(list);
    } catch (err) {
      console.warn('[PlayerPerformanceSection] Erreur chargement évaluations:', err);
    } finally {
      setLoading(false);
    }
  }, [player?.id, isScoutUser, currentRole, currentJobTitle]);

  // Réinitialisation propre au changement de joueur
  useEffect(() => {
    hasUserPickedPosRef.current = false;
    setSelectedPosCode('');
    setSelectedEvaluationId(null);
    setEditingEval(null);
    setBoardMode(canEditPerformance ? 'create' : 'inspect');
    setCoachNote('');
    setDraftSynthesis(null);
    setCriteriaScores({});
    setManualPillarScores({
      technique: DEFAULT_CRITERION_INT,
      tactique: DEFAULT_CRITERION_INT,
      physique: DEFAULT_CRITERION_INT,
      mental: DEFAULT_CRITERION_INT,
    });
    setEvaluationDate(new Date().toISOString().slice(0, 10));
    void loadEvaluations();
  }, [player?.id, canEditPerformance, loadEvaluations]);

  const activeSet: MetricSet | null = useMemo(() => {
    if (isScoutUser || metricSets.length === 0) return null;
    if (selectedSetId) {
      const hit = metricSets.find(s => s.id === selectedSetId);
      if (hit) return hit;
    }
    return resolveMetricSetForRubric(metricSets, 'player');
  }, [isScoutUser, metricSets, selectedSetId]);

  const positionsInSet: MetricSetPosition[] = useMemo(() => {
    if (!activeSet) return allSetPositions;
    return getPositionsForSet(activeSet.id);
  }, [activeSet, allSetPositions, getPositionsForSet]);

  // Pré-sélectionner le poste du joueur tant que l'utilisateur n'en a pas choisi un autre
  useEffect(() => {
    if (positionsInSet.length === 0) return;
    if (
      hasUserPickedPosRef.current &&
      selectedPosCode &&
      positionsInSet.some(p => p.code.toUpperCase() === selectedPosCode.toUpperCase())
    ) {
      return;
    }
    const matched = resolveMetricSetPositionForPlayer(positionsInSet, player.position);
    if (matched && selectedPosCode !== matched.code) {
      setSelectedPosCode(matched.code);
    }
  }, [positionsInSet, player.position, selectedPosCode]);

  const activeCreatePosition: MetricSetPosition | null = useMemo(() => {
    if (positionsInSet.length === 0) return null;
    return (
      positionsInSet.find(p => p.code.toUpperCase() === selectedPosCode.toUpperCase()) ||
      resolveMetricSetPositionForPlayer(positionsInSet, player.position) ||
      positionsInSet[0]
    );
  }, [positionsInSet, selectedPosCode, player.position]);

  // Pré-initialiser les critères manquants du poste choisi à l'entier 5
  useEffect(() => {
    if (!activeCreatePosition?.criteria) return;
    setCriteriaScores(prev => {
      const next = { ...prev };
      let changed = false;
      for (const pillar of ['technique', 'tactique', 'physique', 'mental'] as MetricPillar[]) {
        for (const crit of activeCreatePosition.criteria[pillar] || []) {
          const k = `${pillar}:${crit}`;
          if (next[k] === undefined) {
            next[k] = DEFAULT_CRITERION_INT;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [activeCreatePosition]);

  // Historique unifié chronologique (Éval. Performance + Éval. Matchs)
  const timeline = useMemo(
    () =>
      playerPerformanceService.buildUnifiedTimeline(
        dbEvaluations,
        rawPlayerMatches,
        player.id,
        player.position,
        opponentClubs,
        mainClub
      ),
    [dbEvaluations, rawPlayerMatches, player.id, player.position, opponentClubs, mainClub]
  );

  const filteredTimeline = useMemo(() => {
    if (sourceFilter === 'all') return timeline;
    return timeline.filter(e => e.source_type === sourceFilter);
  }, [timeline, sourceFilter]);

  const inspectedEvaluation = useMemo(() => {
    const pool = filteredTimeline.length > 0 ? filteredTimeline : timeline;
    if (pool.length === 0) return null;
    if (selectedEvaluationId) {
      const hit = pool.find(e => e.id === selectedEvaluationId);
      if (hit) return hit;
    }
    return pool[pool.length - 1] || null;
  }, [filteredTimeline, timeline, selectedEvaluationId]);

  const previousInspectedEvaluation = useMemo<RadarEvaluationSnapshot | null>(() => {
    if (boardMode !== 'inspect' || !inspectedEvaluation || timeline.length < 2) return null;
    const idx = timeline.findIndex(e => e.id === inspectedEvaluation.id);
    if (idx <= 0) return null;
    const prev = timeline[idx - 1];
    return {
      id: prev.id,
      label: `Précédente (${formatReadableDate(prev.evaluation_date)})`,
      positionCode: prev.position_code,
      positionName: prev.position_name,
      evaluationDate: formatReadableDate(prev.evaluation_date),
      sourceType: prev.source_type,
      technique: Math.round(prev.technique_score),
      tactique: Math.round(prev.tactique_score),
      physique: Math.round(prev.physique_score),
      mental: Math.round(prev.mental_score),
      global: Math.round(prev.global_score),
      criteriaScores: prev.criteria_scores,
    };
  }, [boardMode, inspectedEvaluation, timeline]);

  // Calcul temps réel STRICTEMENT ENTIER (0..10)
  const createSummary = useMemo(
    () =>
      computeIntegerPillarAveragesFromCriteria(
        activeCreatePosition,
        criteriaScores,
        manualPillarScores
      ),
    [activeCreatePosition, criteriaScores, manualPillarScores]
  );

  // Poste affiché dans l'espace actif (soit poste sélectionné en saisie, soit poste de l'éval. consultée)
  const effectivePosition: MetricSetPosition | null = useMemo(() => {
    if (boardMode === 'create' && canEditPerformance) {
      return activeCreatePosition;
    }
    if (inspectedEvaluation) {
      if (inspectedEvaluation.metric_set_id) {
        const setPos = getPositionsForSet(inspectedEvaluation.metric_set_id);
        const hit = resolveMetricSetPositionForPlayer(setPos, inspectedEvaluation.position_code);
        if (hit) return hit;
      }
      return resolveMetricSetPositionForPlayer(
        positionsInSet.length > 0 ? positionsInSet : allSetPositions,
        inspectedEvaluation.position_code || player.position
      );
    }
    return activeCreatePosition;
  }, [
    boardMode,
    canEditPerformance,
    activeCreatePosition,
    inspectedEvaluation,
    getPositionsForSet,
    positionsInSet,
    allSetPositions,
    player.position,
  ]);

  const effectiveRadarSnapshot = useMemo<RadarEvaluationSnapshot | null>(() => {
    if (boardMode === 'create' && canEditPerformance) {
      return {
        id: 'live-draft',
        label: `Évaluation en cours (${activeCreatePosition?.code || player.position || 'CM'})`,
        positionCode: activeCreatePosition?.code || player.position || 'CM',
        positionName: activeCreatePosition ? getMetricPositionFrenchName(activeCreatePosition) : null,
        evaluationDate: formatReadableDate(evaluationDate),
        sourceType: 'manual',
        technique: createSummary.technique,
        tactique: createSummary.tactique,
        physique: createSummary.physique,
        mental: createSummary.mental,
        global: createSummary.global,
        criteriaScores,
      };
    }

    if (!inspectedEvaluation) return null;
    return {
      id: inspectedEvaluation.id,
      label:
        inspectedEvaluation.source_type === 'match' && inspectedEvaluation.match_label
          ? inspectedEvaluation.match_label
          : `Éval. ${inspectedEvaluation.position_code}`,
      positionCode: inspectedEvaluation.position_code,
      positionName: inspectedEvaluation.position_name,
      evaluationDate: formatReadableDate(inspectedEvaluation.evaluation_date),
      sourceType: inspectedEvaluation.source_type,
      technique: Math.round(inspectedEvaluation.technique_score),
      tactique: Math.round(inspectedEvaluation.tactique_score),
      physique: Math.round(inspectedEvaluation.physique_score),
      mental: Math.round(inspectedEvaluation.mental_score),
      global: Math.round(inspectedEvaluation.global_score),
      criteriaScores: inspectedEvaluation.criteria_scores,
    };
  }, [
    boardMode,
    canEditPerformance,
    activeCreatePosition,
    player.position,
    evaluationDate,
    createSummary,
    criteriaScores,
    inspectedEvaluation,
  ]);

  const activeDisplayedScores = useMemo(() => {
    if (boardMode === 'create' && canEditPerformance) {
      return {
        technique: createSummary.technique,
        tactique: createSummary.tactique,
        physique: createSummary.physique,
        mental: createSummary.mental,
        global: createSummary.global,
      };
    }
    if (!inspectedEvaluation) {
      return { technique: 0, tactique: 0, physique: 0, mental: 0, global: 0 };
    }
    const technique = Math.round(inspectedEvaluation.technique_score);
    const tactique = Math.round(inspectedEvaluation.tactique_score);
    const physique = Math.round(inspectedEvaluation.physique_score);
    const mental = Math.round(inspectedEvaluation.mental_score);
    const global = Math.round((technique + tactique + physique + mental) / 4);
    return { technique, tactique, physique, mental, global };
  }, [boardMode, canEditPerformance, createSummary, inspectedEvaluation]);

  const activeSynthesis: GeminiPerformanceSynthesis | null =
    boardMode === 'create' && canEditPerformance
      ? draftSynthesis
      : inspectedEvaluation?.ai_synthesis || null;

  // Synchronisation bidirectionnelle Radar <-> Onglets Piliers
  const handleSelectPillarTab = (pillar: MetricPillar) => {
    setActivePillarTab(pillar);
    setRadarViewMode(pillar);
  };

  const handleRadarViewChange = (mode: RadarViewMode) => {
    setRadarViewMode(mode);
    if (mode !== 'summary') {
      setActivePillarTab(mode);
    }
  };

  const handleCriterionIntChange = (pillar: MetricPillar, crit: string, rawVal: number) => {
    const intVal = Math.min(10, Math.max(0, Math.round(rawVal)));
    setCriteriaScores(prev => ({
      ...prev,
      [`${pillar}:${crit}`]: intVal,
    }));
  };

  const handleResetPillarToDefault = (pillar: MetricPillar, targetVal: number) => {
    const list = activeCreatePosition?.criteria?.[pillar] || [];
    if (list.length === 0) {
      setManualPillarScores(prev => ({ ...prev, [pillar]: targetVal }));
      return;
    }
    setCriteriaScores(prev => {
      const next = { ...prev };
      for (const crit of list) {
        next[`${pillar}:${crit}`] = targetVal;
      }
      return next;
    });
  };

  const handleSwitchToCreate = () => {
    if (!canEditPerformance) return;
    setEditingEval(null);
    setBoardMode('create');
    setSelectedEvaluationId(null);
    setDraftSynthesis(null);
    setCoachNote('');
    setEvaluationDate(new Date().toISOString().slice(0, 10));
    setManualPillarScores({
      technique: DEFAULT_CRITERION_INT,
      tactique: DEFAULT_CRITERION_INT,
      physique: DEFAULT_CRITERION_INT,
      mental: DEFAULT_CRITERION_INT,
    });
    setCriteriaScores(buildDefaultCriteriaMap(activeCreatePosition, DEFAULT_CRITERION_INT));
    boardTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleInspectEvaluation = (ev: PlayerPerformanceEvaluation, scrollToTop = false) => {
    setEditingEval(null);
    setSelectedEvaluationId(ev.id);
    setBoardMode('inspect');
    if (scrollToTop) {
      boardTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleStartEditEvaluation = (ev: PlayerPerformanceEvaluation) => {
    if (!canEditPerformance) return;
    setEditingEval(ev);
    setSelectedEvaluationId(ev.id);
    setBoardMode('create');
    if (ev.metric_set_id) setSelectedSetId(ev.metric_set_id);
    hasUserPickedPosRef.current = true;
    setSelectedPosCode(ev.position_code || '');
    setEvaluationDate(ev.evaluation_date || new Date().toISOString().slice(0, 10));
    setCoachNote(ev.comment || '');
    setDraftSynthesis(ev.ai_synthesis || null);

    const tech = Math.round(ev.technique_score);
    const tact = Math.round(ev.tactique_score);
    const phys = Math.round(ev.physique_score);
    const ment = Math.round(ev.mental_score);
    setManualPillarScores({
      technique: tech,
      tactique: tact,
      physique: phys,
      mental: ment,
    });

    const pool = ev.metric_set_id ? getPositionsForSet(ev.metric_set_id) : positionsInSet;
    const matchedPos = resolveMetricSetPositionForPlayer(
      pool.length > 0 ? pool : allSetPositions,
      ev.position_code || player.position
    );
    const loadedCriteria: Record<string, number> = {};
    const existingRaw = ev.criteria_scores && typeof ev.criteria_scores === 'object' ? ev.criteria_scores : {};
    const fallbackByPillar: Record<MetricPillar, number> = {
      technique: tech,
      tactique: tact,
      physique: phys,
      mental: ment,
    };

    if (matchedPos?.criteria) {
      for (const p of ['technique', 'tactique', 'physique', 'mental'] as MetricPillar[]) {
        for (const c of matchedPos.criteria[p] || []) {
          const k = `${p}:${c}`;
          const rawVal = existingRaw[k] ?? existingRaw[c];
          loadedCriteria[k] =
            rawVal !== undefined && Number.isFinite(Number(rawVal))
              ? Math.min(10, Math.max(0, Math.round(Number(rawVal))))
              : fallbackByPillar[p];
        }
      }
    }
    setCriteriaScores(loadedCriteria);
    boardTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSaveEvaluation = async () => {
    if (!evaluationDate) {
      toast.error("Veuillez choisir une date d'enregistrement.");
      return;
    }
    setIsSaving(true);
    try {
      if (editingEval) {
        const updated = await playerPerformanceService.updateEvaluation(
          editingEval.id,
          {
            player_id: player.id,
            match_id: editingEval.match_id ?? null,
            match_label: editingEval.match_label ?? null,
            metric_set_id: activeSet?.id || editingEval.metric_set_id || null,
            metric_set_name: activeSet?.name || editingEval.metric_set_name || 'Performance Joueur',
            position_code: activeCreatePosition?.code || editingEval.position_code || player.position || 'CM',
            position_name: activeCreatePosition
              ? getMetricPositionFrenchName(activeCreatePosition)
              : editingEval.position_name || player.position || 'Milieu Central',
            evaluation_date: evaluationDate,
            source_type: editingEval.source_type || 'manual',
            technique_score: createSummary.technique,
            tactique_score: createSummary.tactique,
            physique_score: createSummary.physique,
            mental_score: createSummary.mental,
            global_score: createSummary.global,
            criteria_scores: criteriaScores,
            comment: coachNote.trim(),
            ai_synthesis: draftSynthesis,
          },
          currentRole,
          currentJobTitle
        );

        await loadEvaluations();
        setSelectedEvaluationId(updated.id);
        setEditingEval(null);
        setBoardMode('inspect');
        toast.success(
          `Évaluation mise à jour (${Math.round(updated.global_score)}/10 • Poste ${updated.position_code})`
        );
      } else {
        const saved = await playerPerformanceService.createEvaluation(
          {
            player_id: player.id,
            metric_set_id: activeSet?.id || null,
            metric_set_name: activeSet?.name || 'Performance Joueur',
            position_code: activeCreatePosition?.code || player.position || 'CM',
            position_name: activeCreatePosition
              ? getMetricPositionFrenchName(activeCreatePosition)
              : player.position || 'Milieu Central',
            evaluation_date: evaluationDate,
            source_type: 'manual',
            evaluator_id: authState.user?.id || null,
            evaluator_name: (authState.user as any)?.full_name || authState.email || 'Staff Technique',
            technique_score: createSummary.technique,
            tactique_score: createSummary.tactique,
            physique_score: createSummary.physique,
            mental_score: createSummary.mental,
            global_score: createSummary.global,
            criteria_scores: criteriaScores,
            comment: coachNote.trim(),
            ai_synthesis: draftSynthesis,
          },
          currentRole,
          currentJobTitle
        );

        setDbEvaluations(prev => [...prev, saved]);
        setSelectedEvaluationId(saved.id);
        setCoachNote('');
        setDraftSynthesis(null);
        setCriteriaScores(buildDefaultCriteriaMap(activeCreatePosition, DEFAULT_CRITERION_INT));
        toast.success(
          `Évaluation enregistrée (${Math.round(saved.global_score)}/10 • Poste ${saved.position_code})`
        );
      }
    } catch (err: any) {
      console.error('[PlayerPerformanceSection] Erreur sauvegarde:', err);
      toast.error(err?.message || "Erreur lors de l'enregistrement de l'évaluation.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvaluation = async (evalId: string) => {
    setDeletingId(evalId);
    try {
      const target = dbEvaluations.find(e => e.id === evalId) || timeline.find(e => e.id === evalId);
      await playerPerformanceService.deleteEvaluation(evalId, currentRole, currentJobTitle, {
        playerId: target?.player_id || player.id,
        matchId: target?.match_id || null,
      });
      await loadEvaluations();
      if (editingEval?.id === evalId) {
        setEditingEval(null);
      }
      if (selectedEvaluationId === evalId) {
        setSelectedEvaluationId(null);
        if (canEditPerformance) setBoardMode('create');
      }
      toast.success('Évaluation supprimée.');
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la suppression.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerateGeminiSynthesis = async (keyOverride?: string) => {
    const isCreate = boardMode === 'create' && canEditPerformance;
    const pos = effectivePosition;
    const posCode = isCreate
      ? pos?.code || player.position || 'CM'
      : inspectedEvaluation?.position_code || player.position || 'CM';
    const posName = pos
      ? getMetricPositionFrenchName(pos)
      : inspectedEvaluation?.position_name || posCode;
    const evalDateStr = isCreate
      ? evaluationDate
      : inspectedEvaluation?.evaluation_date || evaluationDate;
    const targetCriteriaMap = isCreate
      ? criteriaScores
      : inspectedEvaluation?.criteria_scores || {};
    const targetCoachNote = isCreate ? coachNote : inspectedEvaluation?.comment || '';

    const criteriaDetails: Array<{ pillar: string; label: string; score: number }> = [];
    for (const pillar of ['technique', 'tactique', 'physique', 'mental'] as MetricPillar[]) {
      for (const crit of pos?.criteria?.[pillar] || []) {
        const raw = targetCriteriaMap[`${pillar}:${crit}`] ?? targetCriteriaMap[crit];
        const fallback = activeDisplayedScores[pillar];
        const val = typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : fallback;
        criteriaDetails.push({
          pillar,
          label: parseMetricCriterionLabel(crit).title,
          score: val,
        });
      }
    }

    setIsGeneratingAI(true);
    try {
      const synthesis = await geminiPerformanceService.generateSynthesis(
        {
          player: {
            full_name: player.full_name,
            position: player.position,
            age_category: player.category_number
              ? `U${player.category_number}`
              : (player as any).age_category || null,
            preferred_foot: (player as any).preferred_foot,
          },
          positionCode: posCode,
          positionName: posName,
          evaluationDate: evalDateStr,
          scores: activeDisplayedScores,
          criteriaDetails,
          coachNote: targetCoachNote,
          history: timeline,
        },
        keyOverride
      );

      if (isCreate) {
        setDraftSynthesis(synthesis);
      } else if (inspectedEvaluation) {
        await playerPerformanceService.updateEvaluationSynthesis(
          inspectedEvaluation.id,
          player.id,
          synthesis,
          currentRole,
          currentJobTitle
        );
        setDbEvaluations(prev =>
          prev.map(item =>
            item.id === inspectedEvaluation.id ? { ...item, ai_synthesis: synthesis } : item
          )
        );
      }
      setShowInlineGeminiKey(false);
      toast.success(`Synthèse générée via Google Gemini (${synthesis.model_used}) !`);
    } catch (err: any) {
      if (err?.message === MISSING_GEMINI_API_KEY_ERROR) {
        setShowInlineGeminiKey(true);
        toast.warning('Veuillez renseigner votre clé API Google Gemini pour générer la synthèse.');
      } else {
        console.error('[PlayerPerformanceSection] Erreur Gemini AI:', err);
        toast.error(err?.message || 'Erreur lors de la génération de la synthèse Gemini AI.');
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSaveInlineGeminiKey = async () => {
    const clean = inlineGeminiKey.trim();
    if (!clean) {
      toast.error('Veuillez coller une clé API Google Gemini valide.');
      return;
    }
    setIsTestingKey(true);
    try {
      geminiVisionService.saveApiKey(clean);
      const test = await geminiVisionService.testConnection(clean);
      if (test.success) {
        toast.success(`Clé Gemini validée (${test.model}). Génération de la synthèse...`);
        await handleGenerateGeminiSynthesis(clean);
      } else {
        toast.warning(`Clé sauvegardée, test API : ${test.message}`);
      }
    } finally {
      setIsTestingKey(false);
    }
  };

  if (isScoutUser) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-center gap-4 text-amber-900">
        <div className="w-11 h-11 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
          <Lock className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-wider">
            Section réservée au Staff Technique
          </h4>
          <p className="text-xs font-medium text-amber-800/80 mt-0.5">
            Le référentiel Performance Joueur (métriques des Paramètres &amp; évaluations) est strictement isolé des comptes Scouts.
          </p>
        </div>
      </div>
    );
  }

  const activePillarMeta =
    PILLAR_CONFIG.find(p => p.key === activePillarTab) || PILLAR_CONFIG[0];
  const activePositionName = effectivePosition
    ? getMetricPositionFrenchName(effectivePosition)
    : inspectedEvaluation?.position_name || player.position || 'Poste Joueur';
  const activeCriteriaList = effectivePosition?.criteria?.[activePillarTab] || [];
  const isInspecting = boardMode === 'inspect' || !canEditPerformance;
  const activePillarScore = activeDisplayedScores[activePillarTab];

  return (
    <div ref={boardTopRef} className="space-y-6">
      {/* 1. EN-TÊTE + SÉLECTEUR DIRECT DU POSTE SANS LISTE DÉROULANTE */}
      <div className="bg-white rounded-3xl border border-secondary/70 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 truncate">
                  Évaluation Performance — {player.full_name}
                </h3>
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border',
                    editingEval
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : isInspecting
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  )}
                >
                  {editingEval
                    ? 'Modification en cours'
                    : isInspecting
                      ? 'Consultation Historique'
                      : 'Nouvelle Évaluation'}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Barème entier 0 à 10 sans cases à cocher • Choix direct du poste • {timeline.length} évaluation{timeline.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {(isInspecting || editingEval) && canEditPerformance && (
              <Button
                type="button"
                onClick={handleSwitchToCreate}
                className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{editingEval ? 'Nouvelle Évaluation' : 'Nouvelle Évaluation'}</span>
              </Button>
            )}

            <div className="px-3.5 py-2 rounded-2xl bg-slate-900 text-white flex items-center gap-2 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Score Global
              </span>
              <span className="text-lg font-black text-amber-400 tabular-nums">
                {activeDisplayedScores.global} / 10
              </span>
            </div>
          </div>
        </div>

        {/* Bandeau Mode Modification active */}
        {editingEval && !isInspecting && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-950">
            <div className="flex items-center gap-2 font-black">
              <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Modification de l&apos;évaluation du {formatReadableDate(editingEval.evaluation_date)} ({editingEval.position_code})
              </span>
            </div>
            <button
              type="button"
              onClick={handleSwitchToCreate}
              className="inline-flex items-center gap-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 text-[11px] font-black cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Annuler modification</span>
            </button>
          </div>
        )}

        {/* Barre Sélecteur Direct Poste à Évaluer / Lot / Date (Zéro liste déroulante) */}
        {!isInspecting ? (
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80">
            {metricSets.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>Lot de Métriques (Hors-Scout)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {metricSets.map(set => {
                    const selected = activeSet?.id === set.id;
                    return (
                      <button
                        key={set.id}
                        type="button"
                        onClick={() => {
                          hasUserPickedPosRef.current = false;
                          setSelectedSetId(set.id);
                          setSelectedPosCode('');
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer border',
                          selected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        )}
                      >
                        {set.emoji} {set.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-primary" />
                    Poste avec lequel évaluer
                  </span>
                  {player.position && activeCreatePosition?.code && player.position !== activeCreatePosition.code && (
                    <span className="text-[10px] font-bold text-indigo-600">
                      Poste habituel joueur : {player.position}
                    </span>
                  )}
                </div>

                {positionsInSet.length === 0 ? (
                  <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600">
                    Poste libre (aucun poste configuré)
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {positionsInSet.map(pos => {
                      const selected = activeCreatePosition?.code === pos.code;
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => {
                            hasUserPickedPosRef.current = true;
                            setSelectedPosCode(pos.code);
                          }}
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer border',
                            selected
                              ? 'bg-primary text-white border-primary shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          )}
                        >
                          <span>{pos.emoji}</span>
                          <span>{pos.code}</span>
                          <span className={cn('text-[10px] font-bold', selected ? 'text-white/90' : 'text-slate-500')}>
                            {getMetricPositionFrenchName(pos)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="w-full lg:w-48 shrink-0 space-y-1.5">
                <label
                  htmlFor="perf-eval-date"
                  className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3 text-primary" />
                  Date d&apos;évaluation
                </label>
                <input
                  id="perf-eval-date"
                  type="date"
                  value={evaluationDate}
                  onChange={e => setEvaluationDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
            </div>
          </div>
        ) : inspectedEvaluation ? (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 text-xs text-indigo-950">
            <div className="flex flex-wrap items-center gap-2 font-bold">
              <Eye className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Évaluation du {formatReadableDate(inspectedEvaluation.evaluation_date)}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-white border border-indigo-200 text-indigo-800 font-black">
                Poste évalué : {activePositionName} ({inspectedEvaluation.position_code})
              </span>
              {inspectedEvaluation.match_label && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-bold">
                  {inspectedEvaluation.match_label}
                </span>
              )}
              {inspectedEvaluation.evaluator_name && (
                <span className="text-indigo-700 font-medium flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  {inspectedEvaluation.evaluator_name}
                </span>
              )}
            </div>

            {canEditPerformance && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStartEditEvaluation(inspectedEvaluation)}
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-[11px] font-black cursor-pointer shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>
                <button
                  type="button"
                  disabled={deletingId === inspectedEvaluation.id}
                  onClick={() => void handleDeleteEvaluation(inspectedEvaluation.id)}
                  className="inline-flex items-center gap-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 text-[11px] font-black cursor-pointer shadow-xs"
                >
                  {deletingId === inspectedEvaluation.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Supprimer</span>
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* 2. DISPOSITION 2 COLONNES : 4 PILIERS & CRITÈRES À GAUCHE + RADAR À DROITE */}
        {loading ? (
          <div className="p-10 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs font-bold">Chargement des performances...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* COLONNE GAUCHE : ONGLETS DES 4 PILIERS + CRITÈRES */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex gap-1.5 border-b border-slate-200 overflow-x-auto pb-2.5">
                {PILLAR_CONFIG.map(tab => {
                  const isActive = activePillarTab === tab.key;
                  const tabScore = activeDisplayedScores[tab.key];
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => handleSelectPillarTab(tab.key)}
                      className={cn(
                        'px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer',
                        isActive
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      <span>{tab.tabLabel}</span>
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-black tabular-nums',
                          isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
                        )}
                      >
                        {tabScore}/10
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* En-tête du pilier sélectionné */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="min-w-0">
                  <h4 className="text-sm sm:text-base font-black text-slate-800 truncate">
                    {activePillarMeta.letter}. Critères {activePillarMeta.sectionTitle} — {activePositionName}
                  </h4>
                  <p className="text-[11px] font-medium text-slate-500">{activePillarMeta.subtitle}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isInspecting && (
                    <button
                      type="button"
                      onClick={() => handleResetPillarToDefault(activePillarTab, DEFAULT_CRITERION_INT)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-600 flex items-center gap-1 transition cursor-pointer"
                      title="Replacer tous les critères de ce pilier à 5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Base 5</span>
                    </button>
                  )}

                  <div className="px-3 py-1.5 bg-rose-50 text-rose-700 font-black rounded-xl text-xs border border-rose-100 tabular-nums">
                    Moy. {activePillarScore}/10
                  </div>
                </div>
              </div>

              {/* Grille critères (2 colonnes dans la moitié gauche, sans case à cocher) */}
              {activeCriteriaList.length === 0 ? (
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/90 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Note globale directe — Pilier {activePillarMeta.tabLabel}
                    </span>
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-lg text-xs border tabular-nums',
                        getScoreBadgeClasses(
                          isInspecting ? activePillarScore : manualPillarScores[activePillarTab]
                        )
                      )}
                    >
                      {isInspecting ? activePillarScore : manualPillarScores[activePillarTab]} /10
                    </span>
                  </div>
                  {!isInspecting ? (
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={manualPillarScores[activePillarTab]}
                      onChange={e =>
                        setManualPillarScores(prev => ({
                          ...prev,
                          [activePillarTab]: Math.round(Number(e.target.value)),
                        }))
                      }
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary bg-slate-200"
                    />
                  ) : (
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${activePillarScore * 10}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeCriteriaList.map(crit => {
                    const scopedKey = `${activePillarTab}:${crit}`;
                    const { title, detail } = parseMetricCriterionLabel(crit);
                    const isTooltipOpen = activeCriterionTooltip === scopedKey;

                    const rawValue = isInspecting
                      ? inspectedEvaluation?.criteria_scores?.[scopedKey] ??
                        inspectedEvaluation?.criteria_scores?.[crit] ??
                        activePillarScore
                      : criteriaScores[scopedKey] ?? DEFAULT_CRITERION_INT;

                    const intValue = Math.min(10, Math.max(0, Math.round(Number(rawValue))));

                    return (
                      <div
                        key={scopedKey}
                        className="p-3 rounded-2xl border bg-slate-50/90 border-slate-200/80 hover:border-slate-300 hover:bg-white shadow-2xs transition-all space-y-2 relative"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            <span
                              className="text-xs font-bold text-slate-800 truncate select-none"
                              title={detail ? `${title} : ${detail}` : title}
                            >
                              {title}
                            </span>

                            {detail && (
                              <div className="relative inline-flex items-center shrink-0">
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setActiveCriterionTooltip(isTooltipOpen ? null : scopedKey);
                                  }}
                                  onMouseEnter={() => setActiveCriterionTooltip(scopedKey)}
                                  onMouseLeave={() => setActiveCriterionTooltip(null)}
                                  className="text-slate-400 hover:text-primary p-0.5 rounded-full hover:bg-slate-200/60 cursor-pointer"
                                  aria-label={detail}
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                                {isTooltipOpen && (
                                  <div className="absolute left-0 bottom-full mb-1.5 z-50 w-64 p-2.5 bg-slate-900/95 text-white text-[11px] rounded-xl shadow-xl border border-slate-700 pointer-events-none">
                                    <p className="font-bold text-red-400 mb-0.5">{title}</p>
                                    <p className="text-slate-200 leading-snug">{detail}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-lg text-xs border tabular-nums shrink-0',
                              getScoreBadgeClasses(intValue)
                            )}
                          >
                            {intValue} /10
                          </span>
                        </div>

                        {!isInspecting ? (
                          <input
                            type="range"
                            min={0}
                            max={10}
                            step={1}
                            value={intValue}
                            onChange={e =>
                              handleCriterionIntChange(activePillarTab, crit, Number(e.target.value))
                            }
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary bg-slate-200"
                          />
                        ) : (
                          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-300"
                              style={{ width: `${intValue * 10}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* COLONNE DROITE : RADAR EN TEMPS RÉEL */}
            <div className="lg:col-span-6 lg:sticky lg:top-24">
              <PlayerPerformanceRadarChart
                variant="board"
                integerOnly
                playerName={player.full_name}
                evaluation={effectiveRadarSnapshot}
                activePosition={effectivePosition}
                previousEvaluation={isInspecting ? previousInspectedEvaluation : null}
                viewMode={radarViewMode}
                onViewModeChange={handleRadarViewChange}
                height={330}
              />
            </div>
          </div>
        )}

        {/* 3. ZONE DU MOT DU COACH + ACTIONS (SOUS LES 2 COLONNES) */}
        <div className="space-y-4 pt-1">

          {/* 4. ZONE DU MOT DU COACH DIRECTEMENT SOUS LA GRILLE */}
          <div className="p-4 rounded-2xl bg-blue-50/75 border border-blue-200/80 space-y-2">
            <label
              htmlFor="perf-coach-note"
              className="flex items-center gap-2 text-xs font-black text-blue-950"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Mot &amp; Observations du Coach</span>
            </label>

            {!isInspecting ? (
              <textarea
                id="perf-coach-note"
                rows={3}
                value={coachNote}
                onChange={e => setCoachNote(e.target.value)}
                placeholder={`Mot du coach, bilan de performance et axes de progression pour ${player.full_name}...`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200/90 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-2xs"
              />
            ) : (
              <div className="px-3.5 py-2.5 rounded-xl border border-blue-200/80 bg-white text-xs text-slate-700 leading-relaxed min-h-[3.5rem]">
                {inspectedEvaluation?.comment?.trim() ? (
                  inspectedEvaluation.comment
                ) : (
                  <span className="text-slate-400 italic">
                    Aucun mot du coach enregistré pour cette évaluation.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Barre d'actions : Générer Synthèse Gemini AI + Enregistrer Évaluation */}
          {(canEditPerformance || activeDisplayedScores.global > 0 || inspectedEvaluation) && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  disabled={isGeneratingAI || (!isInspecting && !activeCreatePosition && activeDisplayedScores.global === 0) || (isInspecting && !inspectedEvaluation)}
                  onClick={() => void handleGenerateGeminiSynthesis()}
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-black uppercase tracking-wider gap-2 shadow-sm cursor-pointer"
                >
                  {isGeneratingAI ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                  <span>
                    {activeSynthesis
                      ? 'Régénérer Synthèse Gemini AI'
                      : 'Générer Synthèse Gemini AI'}
                  </span>
                </Button>

                {!geminiVisionService.getApiKey() && !showInlineGeminiKey && (
                  <button
                    type="button"
                    onClick={() => setShowInlineGeminiKey(true)}
                    className="text-[11px] font-bold text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Configurer la clé API Gemini</span>
                  </button>
                )}
              </div>

              {!isInspecting && (
                <div className="flex items-center gap-2 flex-wrap">
                  {editingEval && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSwitchToCreate}
                      className="h-10 px-4 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                      Annuler
                    </Button>
                  )}
                  <Button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveEvaluation}
                    className={cn(
                      'h-10 px-5 rounded-xl text-white text-xs font-black uppercase tracking-wider gap-2 shadow-sm cursor-pointer',
                      editingEval
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-slate-900 hover:bg-black'
                    )}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className={cn('w-4 h-4', editingEval ? 'text-white' : 'text-amber-400')} />
                    )}
                    <span>
                      {editingEval
                        ? `Mettre à jour (${createSummary.global}/10)`
                        : `Enregistrer l'évaluation (${createSummary.global}/10)`}
                    </span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Panneau de configuration rapide Clé Gemini si absente */}
          {showInlineGeminiKey && (
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-indigo-600" />
                  Clé API Google Gemini requise pour la synthèse IA
                </span>
                <button
                  type="button"
                  onClick={() => setShowInlineGeminiKey(false)}
                  className="text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer"
                >
                  Fermer
                </button>
              </div>
              <p className="text-[11px] text-indigo-800">
                La clé est sauvegardée localement (partagée avec Paramètres Club &rarr; Google Gemini AI).
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  value={inlineGeminiKey}
                  onChange={e => setInlineGeminiKey(e.target.value)}
                  placeholder="Collez votre clé Google AI Studio (AIza...)"
                  className="flex-1 h-9 px-3 rounded-xl border border-indigo-300 bg-white text-xs text-slate-900"
                />
                <Button
                  type="button"
                  disabled={isTestingKey}
                  onClick={() => void handleSaveInlineGeminiKey()}
                  className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5"
                >
                  {isTestingKey && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Enregistrer &amp; Générer</span>
                </Button>
              </div>
            </div>
          )}

          {/* 5. BLOC SYNTHÈSE AI — GOOGLE GEMINI AI */}
          {activeSynthesis && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-5 border border-indigo-500/30 shadow-md space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-300">
                    <Bot className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                      Synthèse AI — Google Gemini
                    </h4>
                    <p className="text-[11px] text-indigo-200/80">
                      Modèle : {activeSynthesis.model_used} • {formatReadableDate(activeSynthesis.generated_at.slice(0, 10))}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Analyse Technique &amp; Progression
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-medium">
                {activeSynthesis.summary}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {activeSynthesis.strengths.length > 0 && (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/20 p-3.5 space-y-2">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Points Forts Clés
                    </h5>
                    <ul className="space-y-1.5 text-xs text-slate-200">
                      {activeSynthesis.strengths.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-400 font-black">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeSynthesis.improvements.length > 0 && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-400/20 p-3.5 space-y-2">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      Axes de Progression
                    </h5>
                    <ul className="space-y-1.5 text-xs text-slate-200">
                      {activeSynthesis.improvements.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-400 font-black">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {activeSynthesis.coach_recommendation && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">
                    Recommandation Plan d&apos;Action (Staff / Match)
                  </span>
                  <p className="text-xs text-slate-100 leading-relaxed">
                    {activeSynthesis.coach_recommendation}
                  </p>
                </div>
              )}

              {activeSynthesis.evolution_trend && (
                <p className="text-[11px] text-indigo-200/90 italic">
                  Tendance : {activeSynthesis.evolution_trend}
                </p>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* 6. AU-DESSOUS : COURBE D'ÉVOLUTION / ÉVALUATION (ENTIER 0-10) */}
      <PlayerPerformanceEvolutionChart
        evaluations={timeline}
        selectedEvaluationId={isInspecting ? inspectedEvaluation?.id || null : null}
        onSelectEvaluation={ev => handleInspectEvaluation(ev, true)}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        integerOnly
        height={310}
      />

      {/* 7. HISTORIQUE DES ÉVALUATIONS DATÉES */}
      <div className="bg-white rounded-3xl border border-secondary/70 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-5 bg-slate-900 rounded-full" />
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Historique des Évaluations ({filteredTimeline.length})
            </h4>
          </div>
          <p className="text-[11px] font-medium text-slate-500">
            Cliquez sur une ligne pour l&apos;afficher dans le Radar, les critères et sa Synthèse Gemini AI
          </p>
        </div>

        {filteredTimeline.length === 0 ? (
          <div className="rounded-2xl bg-slate-50/70 border border-dashed border-slate-200 p-6 text-center space-y-2">
            <Activity className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700">
              Aucune évaluation enregistrée pour {player.full_name}
            </p>
            <p className="text-[11px] text-slate-500">
              Utilisez le panneau ci-dessus pour enregistrer une évaluation au poste de votre choix.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {[...filteredTimeline].reverse().map(ev => {
              const isSelected = isInspecting && inspectedEvaluation?.id === ev.id;
              const isMatch = ev.source_type === 'match';
              const techInt = Math.round(ev.technique_score);
              const physInt = Math.round(ev.physique_score);
              const tactInt = Math.round(ev.tactique_score);
              const mentInt = Math.round(ev.mental_score);
              const globalInt = Math.round(ev.global_score);

              return (
                <div
                  key={ev.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleInspectEvaluation(ev, true)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleInspectEvaluation(ev, true);
                    }
                  }}
                  className={cn(
                    'w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'bg-slate-50/70 hover:bg-white border-slate-200/80 text-slate-900'
                  )}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'text-xs font-black',
                          isSelected ? 'text-amber-300' : 'text-slate-900'
                        )}
                      >
                        {formatReadableDate(ev.evaluation_date)}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1',
                          isMatch
                            ? isSelected
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-emerald-100 text-emerald-800'
                            : isSelected
                              ? 'bg-white/10 text-white'
                              : 'bg-slate-200 text-slate-700'
                        )}
                      >
                        <Shield className="w-3 h-3" />
                        {ev.position_code}
                        {ev.position_name ? ` • ${ev.position_name}` : ''}
                      </span>
                      {isMatch && (
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-lg text-[10px] font-bold',
                            isSelected
                              ? 'bg-amber-400/20 text-amber-300'
                              : 'bg-amber-100 text-amber-800'
                          )}
                        >
                          {ev.match_label || 'Match officiel'}
                        </span>
                      )}
                      {ev.ai_synthesis && (
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1',
                            isSelected
                              ? 'bg-indigo-500/30 text-indigo-200'
                              : 'bg-indigo-100 text-indigo-800'
                          )}
                        >
                          <Bot className="w-3 h-3" />
                          Gemini AI
                        </span>
                      )}
                      {ev.evaluator_name && (
                        <span
                          className={cn(
                            'text-[10px] font-medium flex items-center gap-1',
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          )}
                        >
                          <UserCheck className="w-3 h-3" />
                          {ev.evaluator_name}
                        </span>
                      )}
                    </div>

                    {ev.comment ? (
                      <p
                        className={cn(
                          'text-xs leading-snug line-clamp-2',
                          isSelected ? 'text-slate-300' : 'text-slate-600'
                        )}
                      >
                        <span className="font-bold">Mot du coach : </span>
                        {ev.comment}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                    <div className="grid grid-cols-4 gap-1.5 text-[10px] font-black tabular-nums">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-lg',
                          isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                        )}
                      >
                        T {techInt}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-1 rounded-lg',
                          isSelected ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-50 text-rose-700'
                        )}
                      >
                        P {physInt}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-1 rounded-lg',
                          isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
                        )}
                      >
                        Ta {tactInt}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-1 rounded-lg',
                          isSelected ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-50 text-amber-700'
                        )}
                      >
                        M {mentInt}
                      </span>
                    </div>

                    <div
                      className={cn(
                        'px-3 py-1.5 rounded-xl font-black text-sm tabular-nums flex items-center gap-1',
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-slate-900 text-amber-400'
                      )}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>{globalInt}/10</span>
                    </div>

                    {canEditPerformance && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleStartEditEvaluation(ev);
                          }}
                          className={cn(
                            'px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 transition-colors cursor-pointer',
                            isSelected
                              ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                              : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          )}
                          title="Modifier / mettre à jour cette évaluation"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Modifier</span>
                        </button>

                        <button
                          type="button"
                          disabled={deletingId === ev.id}
                          onClick={e => {
                            e.stopPropagation();
                            void handleDeleteEvaluation(ev.id);
                          }}
                          className={cn(
                            'p-2 rounded-xl transition-colors cursor-pointer',
                            isSelected
                              ? 'hover:bg-white/10 text-rose-300'
                              : 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'
                          )}
                          title="Supprimer cette évaluation"
                        >
                          {deletingId === ev.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
