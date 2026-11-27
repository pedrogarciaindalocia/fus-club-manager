import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Activity,
  Award,
  Calendar,
  Check,
  Clock,
  Edit3,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Shield,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import PlayerMentionsChart from '../../../components/PlayerMentionsChart';
import {
  PlayerPerformanceRadarChart,
  type RadarEvaluationSnapshot,
  type RadarViewMode,
} from '../../../components/metrics/PlayerPerformanceRadarChart';
import { PlayerPerformanceEvolutionChart } from '../../../components/metrics/PlayerPerformanceEvolutionChart';
import { PerformanceDateCalendarPicker } from './PerformanceDateCalendarPicker';
import {
  playerPerformanceService,
  type PlayerPerformanceEvaluation,
} from '../../../services/playerPerformanceService';
import { useMetricSets } from '../../../hooks/useMetricSets';
import { usePermissions } from '../../../context/PermissionsContext';
import {
  computeIntegerPillarAveragesFromCriteria,
  filterMetricPositionsForPlayer,
  getMetricPositionFrenchName,
  parseMetricCriterionLabel,
  resolveMetricSetForRubric,
  resolveMetricSetPositionForPlayer,
  type MetricPillar,
  type MetricSet,
  type MetricSetPosition,
} from '../../../utils/metricSetsHelpers';
import {
  getLatestMention,
  getMentionMeta,
  isShortlistSurclassement,
  MENTION_OPTIONS,
  normalizeMentionDate,
  type MentionLevel,
  type MentionTimelinePoint,
  type PlayerMentionEntry,
} from '../../../utils/playerMentionsHelper';
import { cn } from '../../../lib/utils';

export interface PlayerMentionModalPlayer {
  id: string;
  full_name: string;
  position?: string;
  jersey_number?: number | null;
  age_category?: string;
  photo_url?: string | null;
}

type ShortlistModalTab = 'mentions' | 'performance';
type EvolutionPeriodMode = 'quarterly' | 'semiannual' | 'annual';

const EVOLUTION_PERIOD_OPTIONS: Array<{
  id: EvolutionPeriodMode;
  label: string;
  months: number;
}> = [
  { id: 'quarterly', label: 'Trimestriel', months: 3 },
  { id: 'semiannual', label: 'Semestriel', months: 6 },
  { id: 'annual', label: 'Annuel', months: 12 },
];

const PERF_PILLAR_TABS: Array<{ key: MetricPillar; label: string }> = [
  { key: 'technique', label: 'Technique' },
  { key: 'tactique', label: 'Tactique' },
  { key: 'physique', label: 'Physique' },
  { key: 'mental', label: 'Mental' },
];

interface PlayerMentionModalProps {
  player: PlayerMentionModalPlayer | null;
  targetCategory: string;
  mentions: PlayerMentionEntry[];
  rawMatches?: unknown[];
  opponentClubs?: unknown[];
  mainClub?: unknown;
  isSaving: boolean;
  onSave: (payload: {
    player_id: string;
    mention: MentionLevel;
    mention_date: string;
    comment?: string;
  }) => Promise<unknown>;
  onDelete: (payload: {
    id: string;
    entryPlayerId?: string;
    mentionDate?: string;
  }) => Promise<unknown>;
  onClose: () => void;
}

function formatReadableDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr.slice(0, 10)), 'dd MMM yyyy', { locale: fr });
  } catch {
    return dateStr;
  }
}

export const PlayerMentionModal: React.FC<PlayerMentionModalProps> = ({
  player,
  targetCategory,
  mentions,
  rawMatches = [],
  opponentClubs = [],
  mainClub = null,
  isSaving,
  onSave,
  onDelete,
  onClose,
}) => {
  const { authState } = usePermissions();
  const { metricSets, allSetPositions, getPositionsForSet, isScoutUser } = useMetricSets();

  const currentRole = authState.user?.system_role || authState.roles?.[0] || null;
  const currentJobTitle = authState.user?.job_title || null;

  const todayIso = new Date().toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<ShortlistModalTab>('mentions');
  const [selectedMention, setSelectedMention] = useState<MentionLevel>('assez_bien');
  const [mentionDate, setMentionDate] = useState<string>(todayIso);
  const [comment, setComment] = useState<string>('');
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [editingMention, setEditingMention] = useState<PlayerMentionEntry | null>(null);
  const [deletingMention, setDeletingMention] = useState<boolean>(false);

  // État Performance Joueur (Métriques Perf. Joueur, Calendrier, Choix du poste, Radar & Courbe d'évolution)
  const [dbEvaluations, setDbEvaluations] = useState<PlayerPerformanceEvaluation[]>([]);
  const [perfLoading, setPerfLoading] = useState<boolean>(false);
  const [selectedEvalId, setSelectedEvalId] = useState<string | null>(null);
  const [perfSelectedDate, setPerfSelectedDate] = useState<string>(todayIso);
  const [hasInitializedPerfDate, setHasInitializedPerfDate] = useState<boolean>(false);
  const [activePerfPillar, setActivePerfPillar] = useState<MetricPillar>('technique');
  const [radarViewMode, setRadarViewMode] = useState<RadarViewMode>('technique');
  const [evolutionPeriod, setEvolutionPeriod] = useState<EvolutionPeriodMode>('quarterly');

  // État Édition / Création / Mise à jour / Suppression dans Performance Shortlist
  const [isEditingPerf, setIsEditingPerf] = useState<boolean>(false);
  const [isCreatingPerf, setIsCreatingPerf] = useState<boolean>(false);
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [selectedPosCode, setSelectedPosCode] = useState<string>('');
  const [perfCriteriaScores, setPerfCriteriaScores] = useState<Record<string, number>>({});
  const [perfPillarSliders, setPerfPillarSliders] = useState<Record<MetricPillar, number>>({
    technique: 5,
    tactique: 5,
    physique: 5,
    mental: 5,
  });
  const perfPillarSlidersRef = useRef(perfPillarSliders);
  perfPillarSlidersRef.current = perfPillarSliders;
  const [isSavingPerf, setIsSavingPerf] = useState<boolean>(false);
  const [isDeletingPerf, setIsDeletingPerf] = useState<boolean>(false);
  const [confirmDeletePerf, setConfirmDeletePerf] = useState<boolean>(false);

  useEffect(() => {
    setActiveTab('mentions');
    setSelectedEvalId(null);
    setPerfSelectedDate(todayIso);
    setHasInitializedPerfDate(false);
    setEditingMention(null);
    setIsEditingPerf(false);
    setIsCreatingPerf(false);
    setConfirmDeletePerf(false);
    setActivePerfPillar('technique');
    setRadarViewMode('technique');
    setEvolutionPeriod('quarterly');
  }, [player?.id, todayIso]);

  // Charger les performances du joueur lorsqu'un joueur non-Scout est sélectionné
  const reloadPlayerEvaluations = useCallback(async () => {
    if (!player?.id || isScoutUser) return;
    try {
      const list = await playerPerformanceService.listByPlayer(player.id, currentRole, currentJobTitle);
      setDbEvaluations(list);
    } catch {
      // ignore fallback error
    }
  }, [player?.id, isScoutUser, currentRole, currentJobTitle]);

  useEffect(() => {
    let mounted = true;
    if (!player?.id || isScoutUser) {
      setDbEvaluations([]);
      setPerfLoading(false);
      return;
    }
    setDbEvaluations([]);
    setPerfLoading(true);
    playerPerformanceService
      .listByPlayer(player.id, currentRole, currentJobTitle)
      .then(list => {
        if (mounted) setDbEvaluations(list);
      })
      .catch(() => {
        if (mounted) setDbEvaluations([]);
      })
      .finally(() => {
        if (mounted) setPerfLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [player?.id, isScoutUser, currentRole, currentJobTitle]);

  // Synchronise les champs lors de l'ouverture ou d'un changement de date si une mention existe déjà ce jour-là
  useEffect(() => {
    if (!player || editingMention) return;
    const latest = getLatestMention(mentions);
    const matchingForDate = mentions.find(
      m => normalizeMentionDate(m.mention_date) === normalizeMentionDate(mentionDate)
    );
    if (matchingForDate) {
      setSelectedMention(matchingForDate.mention);
      setComment(matchingForDate.comment || '');
    } else if (latest && mentionDate === todayIso) {
      setSelectedMention(latest.mention);
      setComment('');
    }
  }, [player, mentionDate, mentions, todayIso, editingMention]);

  // Référentiel issu de "Métriques Perf. Joueur" (scope player_performance)
  const playerPerfSets: MetricSet[] = useMemo(() => {
    const active = metricSets.filter(s => s.is_active !== false);
    const dedicated = active.filter(s => s.scope === 'player_performance');
    return dedicated.length > 0 ? dedicated : active;
  }, [metricSets]);

  const activeSet: MetricSet | null = useMemo(() => {
    if (isScoutUser || playerPerfSets.length === 0) return null;
    if (selectedSetId) {
      const found = playerPerfSets.find(s => s.id === selectedSetId);
      if (found) return found;
    }
    return resolveMetricSetForRubric(playerPerfSets, 'player');
  }, [isScoutUser, playerPerfSets, selectedSetId]);

  const positionsInSet: MetricSetPosition[] = useMemo(() => {
    if (!activeSet) return allSetPositions;
    const setPos = getPositionsForSet(activeSet.id);
    return setPos.length > 0 ? setPos : allSetPositions;
  }, [activeSet, allSetPositions, getPositionsForSet]);

  const timeline = useMemo(() => {
    if (!player?.id || isScoutUser) return [];
    return playerPerformanceService.buildUnifiedTimeline(
      dbEvaluations,
      rawMatches,
      player.id,
      player.position,
      opponentClubs,
      mainClub
    );
  }, [dbEvaluations, rawMatches, player?.id, player?.position, opponentClubs, mainClub, isScoutUser]);

  // Positionner initialement le calendrier sur la dernière date enregistrée (s'il y en a une)
  useEffect(() => {
    if (perfLoading || hasInitializedPerfDate) return;
    if (timeline.length > 0) {
      const latestDate = String(timeline[timeline.length - 1].evaluation_date || '').slice(0, 10);
      if (latestDate) setPerfSelectedDate(latestDate);
    }
    setHasInitializedPerfDate(true);
  }, [perfLoading, hasInitializedPerfDate, timeline]);

  // Carte des dates ayant une performance pour les indicateurs du calendrier
  const recordedDateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ev of timeline) {
      const d = String(ev.evaluation_date || '').slice(0, 10);
      if (d) counts[d] = (counts[d] || 0) + 1;
    }
    return counts;
  }, [timeline]);

  // Évaluations automatiquement filtrées sur la date choisie dans le calendrier
  const dayEvaluations = useMemo(() => {
    if (!perfSelectedDate) return [];
    return timeline
      .filter(e => String(e.evaluation_date || '').slice(0, 10) === perfSelectedDate)
      .sort((a, b) => {
        const aManual = a.source_type === 'manual' ? 0 : 1;
        const bManual = b.source_type === 'manual' ? 0 : 1;
        if (aManual !== bManual) return aManual - bManual;
        return String(b.updated_at || b.created_at || '').localeCompare(
          String(a.updated_at || a.created_at || '')
        );
      });
  }, [timeline, perfSelectedDate]);

  const activeEvaluation: PlayerPerformanceEvaluation | null = useMemo(() => {
    if (dayEvaluations.length === 0) return null;
    if (selectedEvalId) {
      const hit = dayEvaluations.find(e => e.id === selectedEvalId);
      if (hit) return hit;
    }
    return dayEvaluations[0] || null;
  }, [dayEvaluations, selectedEvalId]);

  const selectablePositions: MetricSetPosition[] = useMemo(
    () => filterMetricPositionsForPlayer(positionsInSet, player?.position),
    [positionsInSet, player?.position]
  );

  const activePositionObj: MetricSetPosition | null = useMemo(() => {
    if (selectablePositions.length === 0) return null;
    if (selectedPosCode) {
      const matched = selectablePositions.find(
        p => p.code.toUpperCase() === selectedPosCode.toUpperCase()
      );
      if (matched) return matched;
    }
    return (
      resolveMetricSetPositionForPlayer(selectablePositions, player?.position) ||
      selectablePositions[0]
    );
  }, [selectablePositions, selectedPosCode, player?.position]);

  const buildInitialPerfCriteria = useCallback(
    (
      pos: MetricSetPosition | null,
      baseScores: Record<MetricPillar, number>,
      existingCriteria?: Record<string, number>
    ): Record<string, number> => {
      const next: Record<string, number> = { ...(existingCriteria || {}) };
      if (!pos?.criteria) return next;
      for (const pillar of ['technique', 'tactique', 'physique', 'mental'] as MetricPillar[]) {
        const list = pos.criteria[pillar] || [];
        const fallbackVal = Math.min(10, Math.max(0, Math.round(baseScores[pillar] ?? 5)));
        for (const crit of list) {
          const k = `${pillar}:${crit}`;
          if (next[k] === undefined) {
            const legacy = next[crit];
            next[k] =
              legacy !== undefined && Number.isFinite(Number(legacy))
                ? Math.min(10, Math.max(0, Math.round(Number(legacy))))
                : fallbackVal;
          } else {
            next[k] = Math.min(10, Math.max(0, Math.round(Number(next[k]))));
          }
        }
      }
      return next;
    },
    []
  );

  const loadPerfEvaluationIntoState = useCallback(
    (ev: PlayerPerformanceEvaluation) => {
      setSelectedEvalId(ev.id);
      setIsEditingPerf(false);
      setIsCreatingPerf(false);
      setConfirmDeletePerf(false);

      let rawTargetPositions = positionsInSet;
      if (ev.metric_set_id && playerPerfSets.some(s => s.id === ev.metric_set_id)) {
        setSelectedSetId(ev.metric_set_id);
        const setPos = getPositionsForSet(ev.metric_set_id);
        if (setPos.length > 0) rawTargetPositions = setPos;
      }
      const targetPositions = filterMetricPositionsForPlayer(rawTargetPositions, player?.position);

      const resolvedPos =
        targetPositions.find(
          p => p.code.toUpperCase() === String(ev.position_code || '').toUpperCase()
        ) ||
        resolveMetricSetPositionForPlayer(targetPositions, ev.position_code || player?.position) ||
        targetPositions[0] ||
        null;

      setSelectedPosCode(resolvedPos?.code || ev.position_code || '');

      const baseScores: Record<MetricPillar, number> = {
        technique: Math.round(ev.technique_score),
        tactique: Math.round(ev.tactique_score),
        physique: Math.round(ev.physique_score),
        mental: Math.round(ev.mental_score),
      };
      setPerfPillarSliders(baseScores);
      setPerfCriteriaScores(buildInitialPerfCriteria(resolvedPos, baseScores, ev.criteria_scores));
    },
    [positionsInSet, playerPerfSets, getPositionsForSet, player?.position, buildInitialPerfCriteria]
  );

  // Mise à jour automatique dès que la date ou les évaluations changent
  useEffect(() => {
    setIsEditingPerf(false);
    setIsCreatingPerf(false);
    setConfirmDeletePerf(false);
    if (dayEvaluations.length > 0) {
      loadPerfEvaluationIntoState(dayEvaluations[0]);
    } else {
      setSelectedEvalId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfSelectedDate, dayEvaluations]);

  // Synchroniser les critères manquants si l'utilisateur change de poste ou de lot
  useEffect(() => {
    if (!activePositionObj?.criteria || (!activeEvaluation && !isCreatingPerf)) return;
    setPerfCriteriaScores(prev => {
      const next = { ...prev };
      let changed = false;
      for (const pillar of ['technique', 'tactique', 'physique', 'mental'] as MetricPillar[]) {
        const list = activePositionObj.criteria[pillar] || [];
        const baseVal = perfPillarSlidersRef.current[pillar] ?? 5;
        for (const crit of list) {
          const k = `${pillar}:${crit}`;
          if (next[k] === undefined) {
            const legacy = next[crit];
            next[k] =
              legacy !== undefined && Number.isFinite(Number(legacy))
                ? Math.min(10, Math.max(0, Math.round(Number(legacy))))
                : baseVal;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [activePositionObj, activeEvaluation, isCreatingPerf]);

  const isPerfEditable = Boolean((activeEvaluation && isEditingPerf) || (!activeEvaluation && isCreatingPerf));

  const integerPerfSummary = useMemo(
    () =>
      computeIntegerPillarAveragesFromCriteria(
        activePositionObj,
        perfCriteriaScores,
        perfPillarSliders
      ),
    [activePositionObj, perfCriteriaScores, perfPillarSliders]
  );

  const displayedPillarScores = useMemo(() => {
    if (activePositionObj) {
      return {
        technique: integerPerfSummary.technique,
        tactique: integerPerfSummary.tactique,
        physique: integerPerfSummary.physique,
        mental: integerPerfSummary.mental,
        global: integerPerfSummary.global,
      };
    }
    const technique = Math.round(perfPillarSliders.technique);
    const tactique = Math.round(perfPillarSliders.tactique);
    const physique = Math.round(perfPillarSliders.physique);
    const mental = Math.round(perfPillarSliders.mental);
    const global = Math.round((technique + tactique + physique + mental) / 4);
    return { technique, tactique, physique, mental, global };
  }, [activePositionObj, integerPerfSummary, perfPillarSliders]);

  const radarSnapshot = useMemo<RadarEvaluationSnapshot | null>(() => {
    if (!player || !perfSelectedDate) return null;
    if (!activeEvaluation && !isCreatingPerf) return null;
    return {
      id: activeEvaluation ? activeEvaluation.id : `draft-${player.id}`,
      label: player.full_name,
      positionCode: activePositionObj?.code || player.position || 'CM',
      positionName: activePositionObj ? getMetricPositionFrenchName(activePositionObj) : null,
      evaluationDate: formatReadableDate(perfSelectedDate),
      sourceType: activeEvaluation?.source_type || 'manual',
      technique: displayedPillarScores.technique,
      tactique: displayedPillarScores.tactique,
      physique: displayedPillarScores.physique,
      mental: displayedPillarScores.mental,
      global: displayedPillarScores.global,
      criteriaScores: perfCriteriaScores,
    };
  }, [
    player,
    perfSelectedDate,
    activeEvaluation,
    isCreatingPerf,
    activePositionObj,
    displayedPillarScores,
    perfCriteriaScores,
  ]);

  // Filtrage Trimestriel / Semestriel / Annuel de la courbe d'évolution
  const evolutionBoundsByPeriod = useMemo(() => {
    const today = new Date();
    let selectedDt = today;
    try {
      if (perfSelectedDate && /^\d{4}-\d{2}-\d{2}$/.test(perfSelectedDate)) {
        const parsed = parseISO(perfSelectedDate);
        if (!Number.isNaN(parsed.getTime())) selectedDt = parsed;
      }
    } catch {
      selectedDt = today;
    }
    const anchorDate = selectedDt > today ? selectedDt : today;
    const endIso = format(anchorDate, 'yyyy-MM-dd');

    const byMode: Record<EvolutionPeriodMode, PlayerPerformanceEvaluation[]> = {
      quarterly: [],
      semiannual: [],
      annual: [],
    };
    for (const opt of EVOLUTION_PERIOD_OPTIONS) {
      const startIso = format(subMonths(anchorDate, opt.months), 'yyyy-MM-dd');
      byMode[opt.id] = timeline.filter(ev => {
        const d = String(ev.evaluation_date || '').slice(0, 10);
        return d >= startIso && d <= endIso;
      });
    }
    return byMode;
  }, [timeline, perfSelectedDate]);

  const evolutionEvaluations = evolutionBoundsByPeriod[evolutionPeriod];
  const activePeriodMeta =
    EVOLUTION_PERIOD_OPTIONS.find(o => o.id === evolutionPeriod) || EVOLUTION_PERIOD_OPTIONS[0];

  const perfSummary = useMemo(() => {
    if (timeline.length === 0) {
      return { latest: 0, mean: 0, best: 0, count: 0 };
    }
    const globals = timeline.map(e => Math.round(e.global_score));
    const latest = globals[globals.length - 1];
    const best = Math.max(...globals);
    const mean = Math.round(globals.reduce((a, b) => a + b, 0) / globals.length);
    return { latest, mean, best, count: timeline.length };
  }, [timeline]);

  if (!player) return null;

  const latestMention = getLatestMention(mentions);
  const latestMeta = latestMention ? getMentionMeta(latestMention.mention) : null;
  const isSurclasse = isShortlistSurclassement(player.age_category, targetCategory);
  const hasEntryForSelectedDate = mentions.some(
    m => normalizeMentionDate(m.mention_date) === normalizeMentionDate(mentionDate)
  );

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    const normalizedNewDate = normalizeMentionDate(mentionDate);
    try {
      // Si l'utilisateur modifie la date d'une mention existante, supprimer l'ancienne date pour éviter un doublon
      if (
        editingMention &&
        normalizeMentionDate(editingMention.mention_date) !== normalizedNewDate
      ) {
        await onDelete({
          id: editingMention.id,
          entryPlayerId: player.id,
          mentionDate: editingMention.mention_date,
        });
      }

      await onSave({
        player_id: player.id,
        mention: selectedMention,
        mention_date: normalizedNewDate,
        comment: comment.trim(),
      });
      setEditingMention(null);
      setJustSaved(true);
      toast.success(
        `Mention « ${getMentionMeta(selectedMention).label} » ${hasEntryForSelectedDate || editingMention ? 'mise à jour' : 'enregistrée'} pour ${player.full_name} (${normalizedNewDate})`
      );
      window.setTimeout(() => setJustSaved(false), 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error(`Erreur lors de l'enregistrement : ${msg}`);
    }
  };

  const handleSelectChartEntry = (point: MentionTimelinePoint) => {
    const rawMatch =
      mentions.find(m => m.id === point.id || normalizeMentionDate(m.mention_date) === point.mention_date) || null;
    setEditingMention(rawMatch);
    setMentionDate(point.mention_date);
    setSelectedMention(point.mention);
    setComment(point.comment || '');
    setActiveTab('mentions');
  };

  const handleCancelMentionEdit = () => {
    setEditingMention(null);
    setMentionDate(todayIso);
    const matchingToday = mentions.find(m => normalizeMentionDate(m.mention_date) === todayIso);
    setSelectedMention(matchingToday?.mention || latestMention?.mention || 'assez_bien');
    setComment(matchingToday?.comment || '');
  };

  const handleDeleteCurrentSelectedMention = async () => {
    const targetEntry =
      editingMention ||
      mentions.find(m => normalizeMentionDate(m.mention_date) === normalizeMentionDate(mentionDate));
    if (!targetEntry) return;
    setDeletingMention(true);
    try {
      await onDelete({
        id: targetEntry.id,
        entryPlayerId: player.id,
        mentionDate: normalizeMentionDate(targetEntry.mention_date),
      });
      setEditingMention(null);
      setComment('');
      toast.success(`Mention du ${formatReadableDate(targetEntry.mention_date)} supprimée`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error(`Erreur suppression : ${msg}`);
    } finally {
      setDeletingMention(false);
    }
  };

  const handleDeleteChartEntry = async (point: MentionTimelinePoint) => {
    try {
      await onDelete({
        id: point.id,
        entryPlayerId: player.id,
        mentionDate: point.mention_date,
      });
      if (editingMention && (editingMention.id === point.id || normalizeMentionDate(editingMention.mention_date) === point.mention_date)) {
        setEditingMention(null);
        setComment('');
      }
      toast.success(`Mention du ${point.fullDateLabel} supprimée`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error(`Erreur suppression : ${msg}`);
    }
  };

  // Handlers Performance Shortlist (Métriques Perf. Joueur, Choix du poste, 4 Onglets Pilier, Radar & Courbe d'évolution)
  const handleSelectPerfPillar = (pillar: MetricPillar) => {
    setActivePerfPillar(pillar);
    setRadarViewMode(pillar);
  };

  const handleShortlistRadarViewChange = (mode: RadarViewMode) => {
    setRadarViewMode(mode);
    if (mode !== 'summary') {
      setActivePerfPillar(mode);
    }
  };

  const startNewPerfEvaluation = () => {
    const resolvedPos =
      resolveMetricSetPositionForPlayer(selectablePositions, player?.position) ||
      selectablePositions[0] ||
      null;
    const baseScores: Record<MetricPillar, number> = {
      technique: 5,
      tactique: 5,
      physique: 5,
      mental: 5,
    };
    setSelectedEvalId(null);
    setIsCreatingPerf(true);
    setIsEditingPerf(false);
    setConfirmDeletePerf(false);
    setSelectedPosCode(resolvedPos?.code || '');
    setPerfPillarSliders(baseScores);
    setPerfCriteriaScores(buildInitialPerfCriteria(resolvedPos, baseScores));
    setActivePerfPillar('technique');
    setRadarViewMode('technique');
  };

  const handleCriterionSliderChange = (pillar: MetricPillar, crit: string, rawVal: number) => {
    if (!isPerfEditable) return;
    const intVal = Math.min(10, Math.max(0, Math.round(rawVal)));
    const next = { ...perfCriteriaScores, [`${pillar}:${crit}`]: intVal };
    setPerfCriteriaScores(next);

    const critList = activePositionObj?.criteria?.[pillar] || [];
    if (critList.length > 0) {
      const sum = critList.reduce((acc, c) => acc + (next[`${pillar}:${c}`] ?? intVal), 0);
      const avg = Math.round(sum / critList.length);
      setPerfPillarSliders(p => ({ ...p, [pillar]: avg }));
    }
  };

  const handlePillarDirectSliderChange = (pillar: MetricPillar, rawVal: number) => {
    if (!isPerfEditable) return;
    const intVal = Math.min(10, Math.max(0, Math.round(rawVal)));
    setPerfPillarSliders(prev => ({ ...prev, [pillar]: intVal }));

    const critList = activePositionObj?.criteria?.[pillar] || [];
    if (critList.length > 0) {
      const next = { ...perfCriteriaScores };
      for (const crit of critList) {
        next[`${pillar}:${crit}`] = intVal;
      }
      setPerfCriteriaScores(next);
    }
  };

  const handleResetPerfBase5 = () => {
    if (!isPerfEditable) return;
    const base: Record<MetricPillar, number> = {
      technique: 5,
      tactique: 5,
      physique: 5,
      mental: 5,
    };
    setPerfPillarSliders(base);
    setPerfCriteriaScores(buildInitialPerfCriteria(activePositionObj, base));
  };

  const handleCancelPerfEdit = () => {
    if (activeEvaluation) {
      loadPerfEvaluationIntoState(activeEvaluation);
      setIsEditingPerf(false);
    } else {
      setIsCreatingPerf(false);
    }
  };

  const buildPerfCriteriaPayload = (): Record<string, number> => {
    const built: Record<string, number> = { ...perfCriteriaScores };
    if (activePositionObj?.criteria) {
      for (const pillar of ['technique', 'tactique', 'physique', 'mental'] as MetricPillar[]) {
        for (const crit of activePositionObj.criteria[pillar] || []) {
          const k = `${pillar}:${crit}`;
          if (built[k] === undefined) {
            built[k] = displayedPillarScores[pillar];
          }
        }
      }
    }
    return built;
  };

  const handleSaveOrUpdatePerf = async () => {
    if (!player?.id || isScoutUser || !perfSelectedDate) return;
    const posCode = activePositionObj?.code || player.position || 'CM';
    const posName = activePositionObj
      ? getMetricPositionFrenchName(activePositionObj)
      : player.position || 'Milieu central';
    const builtCriteria = buildPerfCriteriaPayload();

    setIsSavingPerf(true);
    try {
      if (activeEvaluation) {
        const previousSnapshot = {
          technique_score: activeEvaluation.technique_score,
          tactique_score: activeEvaluation.tactique_score,
          physique_score: activeEvaluation.physique_score,
          mental_score: activeEvaluation.mental_score,
          global_score: activeEvaluation.global_score,
          position_code: activeEvaluation.position_code,
        };
        const updated = await playerPerformanceService.updateEvaluation(
          activeEvaluation.id,
          {
            player_id: player.id,
            match_id: activeEvaluation.match_id ?? null,
            match_label: activeEvaluation.match_label ?? null,
            metric_set_id: activeSet?.id || activeEvaluation.metric_set_id || null,
            metric_set_name: activeSet?.name || activeEvaluation.metric_set_name || 'Performance Joueur',
            position_code: posCode,
            position_name: posName,
            evaluation_date: perfSelectedDate,
            source_type: activeEvaluation.source_type || 'manual',
            technique_score: displayedPillarScores.technique,
            tactique_score: displayedPillarScores.tactique,
            physique_score: displayedPillarScores.physique,
            mental_score: displayedPillarScores.mental,
            global_score: displayedPillarScores.global,
            criteria_scores: builtCriteria,
            comment: activeEvaluation.comment || '',
          },
          currentRole,
          currentJobTitle
        );

        await reloadPlayerEvaluations();
        setSelectedEvalId(updated.id);
        setIsEditingPerf(false);
        toast.success(`Mise à jour enregistrée (${Math.round(updated.global_score)}/10)`);
      } else {
        const created = await playerPerformanceService.createEvaluation(
          {
            player_id: player.id,
            match_id: null,
            match_label: null,
            metric_set_id: activeSet?.id || null,
            metric_set_name: activeSet?.name || 'Performance Joueur',
            position_code: posCode,
            position_name: posName,
            evaluation_date: perfSelectedDate,
            source_type: 'manual',
            evaluator_id: authState.user?.id || null,
            evaluator_name:
              (authState.user as (typeof authState.user & { full_name?: string | null }) | null)
                ?.full_name ||
              authState.email ||
              'Staff Technique',
            technique_score: displayedPillarScores.technique,
            tactique_score: displayedPillarScores.tactique,
            physique_score: displayedPillarScores.physique,
            mental_score: displayedPillarScores.mental,
            global_score: displayedPillarScores.global,
            criteria_scores: builtCriteria,
            comment: '',
          },
          currentRole,
          currentJobTitle
        );

        await reloadPlayerEvaluations();
        setSelectedEvalId(created.id);
        setIsCreatingPerf(false);
        setIsEditingPerf(false);
        toast.success(`Performance enregistrée (${Math.round(created.global_score)}/10)`);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la performance.';
      toast.error(msg);
    } finally {
      setIsSavingPerf(false);
    }
  };

  const handleDeletePerformance = async (ev: PlayerPerformanceEvaluation) => {
    if (isScoutUser) return;
    setIsDeletingPerf(true);
    try {
      await playerPerformanceService.deleteEvaluation(ev.id, currentRole, currentJobTitle, {
        playerId: player.id,
        matchId: ev.match_id || null,
      });

      await reloadPlayerEvaluations();
      setConfirmDeletePerf(false);
      setIsEditingPerf(false);
      setIsCreatingPerf(false);
      if (selectedEvalId === ev.id) setSelectedEvalId(null);
      toast.success(`Performance du ${formatReadableDate(ev.evaluation_date)} supprimée`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur suppression performance.';
      toast.error(msg);
    } finally {
      setIsDeletingPerf(false);
    }
  };

  const tabs: Array<{ id: ShortlistModalTab; label: string; icon: React.FC<{ className?: string }>; badge?: string | number }> = [
    { id: 'mentions', label: 'Mentions', icon: Award, badge: mentions.length > 0 ? mentions.length : undefined },
    ...(!isScoutUser
      ? [
          {
            id: 'performance' as const,
            label: 'Performance',
            icon: Activity,
            badge: timeline.length > 0 ? timeline.length : undefined,
          },
        ]
      : []),
  ];

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header joueur (Charte FUS : Noir / Rouge / Blanc) */}
        <div className="flex items-start justify-between gap-4 bg-[#0D0D0F] p-5 text-white">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#1C1C22] shadow-lg">
              <img
                src={
                  player.photo_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=0D0D0F&color=fff&size=140`
                }
                alt={player.full_name}
                className="h-full w-full object-cover"
                onError={event => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/assets/avatar.svg';
                }}
              />
            </div>

            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#1C1C22] px-2.5 py-0.5 text-[10px] font-black text-white">
                  <ShieldCheck className="h-3 w-3 text-[#FF3737]" /> {player.age_category || 'PRO'}
                </span>
                {isSurclasse && (
                  <span className="inline-flex items-center rounded-full bg-[#FF3737] px-2.5 py-0.5 text-[10px] font-black text-white">
                    Surclassement Shortlist → {targetCategory}
                  </span>
                )}
                {latestMeta && (
                  <span className="rounded-full bg-[#1C1C22] px-2.5 py-0.5 text-[10px] font-black text-white">
                    Mention : {latestMeta.label}
                  </span>
                )}
                {!isScoutUser && perfSummary.count > 0 && (
                  <span className="rounded-full bg-[#FF3737] px-2.5 py-0.5 text-[10px] font-black text-white tabular-nums">
                    Perf : {perfSummary.latest}/10
                  </span>
                )}
              </div>
              <h3 className="truncate text-lg font-black text-white">{player.full_name}</h3>
              <p className="text-xs text-white/70">
                Poste : {player.position || '—'}
                {player.jersey_number ? ` · #${player.jersey_number}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 rounded-xl bg-[#1C1C22] p-2 text-white/80 transition hover:bg-[#FF3737] hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation par Onglets : Mentions | Performance (boutons remplis FUS) */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-5 py-3">
          {tabs.map(tab => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer',
                  isActive
                    ? 'bg-[#FF3737] text-white shadow-sm'
                    : 'bg-[#161619] text-white/85 hover:bg-[#26262c]'
                )}
              >
                <IconComp className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums',
                      isActive ? 'bg-[#0D0D0F] text-white' : 'bg-white/15 text-white'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Corps scrollable selon l'onglet actif */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {activeTab === 'mentions' && (
            <>
              <form onSubmit={handleSaveSubmit} className="space-y-4">
                {editingMention && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-950">
                    <div className="flex items-center gap-2 font-black">
                      <Edit3 className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>
                        Mode Modification — Mention du {formatReadableDate(editingMention.mention_date)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelMentionEdit}
                      className="inline-flex items-center gap-1 rounded-xl bg-amber-600 hover:bg-amber-700 px-3 py-1 text-[11px] font-black text-white cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Annuler</span>
                    </button>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Mention d&apos;évaluation
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {MENTION_OPTIONS.map(opt => {
                      const isActive = selectedMention === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedMention(opt.id)}
                          aria-pressed={isActive}
                          className={`rounded-2xl border-2 px-3 py-3 text-center text-xs font-black transition-all cursor-pointer ${
                            isActive
                              ? opt.activeButtonClass
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                      Date de la mention
                    </label>
                    <input
                      type="date"
                      required
                      value={mentionDate}
                      onChange={e => setMentionDate(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                      Observation (optionnel)
                    </label>
                    <input
                      type="text"
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Remarque sur le niveau du jour..."
                      className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {editingMention
                      ? 'Modifiez la mention, la date ou l’observation puis cliquez sur Mettre à jour.'
                      : hasEntryForSelectedDate
                        ? `Une mention existe déjà le ${normalizeMentionDate(mentionDate)} : l'enregistrement la mettra à jour.`
                        : 'Chaque date crée un nouveau point sur la courbe.'}
                  </span>

                  <div className="flex items-center gap-2 flex-wrap">
                    {(editingMention || hasEntryForSelectedDate) && (
                      <button
                        type="button"
                        disabled={deletingMention}
                        onClick={() => void handleDeleteCurrentSelectedMention()}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 px-4 py-2.5 text-xs font-black text-rose-800 transition disabled:opacity-50 cursor-pointer"
                      >
                        {deletingMention ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        <span>Supprimer</span>
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={isSaving}
                      className={cn(
                        'flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black text-white shadow-md transition active:scale-98 disabled:opacity-50 cursor-pointer',
                        editingMention || hasEntryForSelectedDate
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-emerald-600 hover:bg-emerald-500'
                      )}
                    >
                      {justSaved ? (
                        <>
                          <Check className="h-4 w-4" />
                          Enregistrée
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          {isSaving
                            ? 'Enregistrement...'
                            : editingMention || hasEntryForSelectedDate
                              ? 'Mettre à jour'
                              : 'Enregistrer la mention'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              <PlayerMentionsChart
                mentions={mentions}
                height={210}
                title="Évolution des mentions en fonction de la date"
                emptyMessage="Enregistrez une première mention datée ci-dessus pour tracer la courbe."
                selectedEntryId={editingMention?.id || null}
                selectedMentionDate={editingMention ? normalizeMentionDate(editingMention.mention_date) : normalizeMentionDate(mentionDate)}
                onSelectEntry={handleSelectChartEntry}
                onDeleteEntry={handleDeleteChartEntry}
              />
            </>
          )}

          {activeTab === 'performance' && !isScoutUser && (
            <div className="space-y-4">
              {perfLoading ? (
                <div className="p-10 flex flex-col items-center justify-center gap-2 text-xs font-bold text-[#0D0D0F]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#FF3737]" />
                  <span>Chargement des performances...</span>
                </div>
              ) : (
                <>
                  {/* Barre Calendrier avec indicateurs + Statut d'existence */}
                  <div className="rounded-2xl bg-slate-50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="w-full sm:w-72">
                      <PerformanceDateCalendarPicker
                        value={perfSelectedDate}
                        onChange={nextDate => {
                          setPerfSelectedDate(nextDate);
                          setSelectedEvalId(null);
                          setIsEditingPerf(false);
                          setIsCreatingPerf(false);
                        }}
                        recordedDateCounts={recordedDateCounts}
                        isLoadingDates={perfLoading}
                      />
                    </div>

                    {activeEvaluation ? (
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF3737] text-white text-[11px] font-black uppercase tracking-wider shrink-0">
                          <Check className="w-3.5 h-3.5" />
                          <span>{isEditingPerf ? 'Modification' : 'Performance enregistrée'}</span>
                        </span>
                        {activeEvaluation.updated_at && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                            <Clock className="w-3 h-3 text-[#FF3737]" />
                            <span>{formatReadableDate(activeEvaluation.updated_at)}</span>
                          </span>
                        )}
                        {dayEvaluations.length > 1 &&
                          dayEvaluations.map((ev, idx) => {
                            const isSel = ev.id === activeEvaluation.id;
                            return (
                              <button
                                key={ev.id}
                                type="button"
                                onClick={() => loadPerfEvaluationIntoState(ev)}
                                className={cn(
                                  'px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer',
                                  isSel
                                    ? 'bg-[#0D0D0F] text-white'
                                    : 'bg-[#161619]/10 text-[#0D0D0F] hover:bg-[#161619]/20'
                                )}
                              >
                                Éval #{idx + 1} ({Math.round(ev.global_score)}/10)
                              </button>
                            );
                          })}
                      </div>
                    ) : !isCreatingPerf ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0D0D0F] text-white text-[11px] font-black uppercase tracking-wider shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-[#FF3737]" />
                        <span>Aucune performance à cette date</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF3737] text-white text-[11px] font-black uppercase tracking-wider shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nouvelle évaluation</span>
                      </span>
                    )}
                  </div>

                  {!activeEvaluation && !isCreatingPerf ? (
                    <div className="rounded-3xl bg-white border border-slate-200/80 p-8 text-center space-y-4">
                      <div className="mx-auto w-12 h-12 rounded-2xl bg-[#0D0D0F] text-white flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-[#FF3737]" />
                      </div>
                      <div className="space-y-1 max-w-md mx-auto">
                        <p className="text-sm font-black text-[#0D0D0F]">
                          Aucune performance enregistrée
                        </p>
                        <p className="text-xs text-slate-600">
                          Aucune évaluation enregistrée pour{' '}
                          <span className="font-bold text-[#0D0D0F]">{player.full_name}</span> le{' '}
                          <span className="font-bold text-[#0D0D0F]">
                            {formatReadableDate(perfSelectedDate)}
                          </span>
                          .
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={startNewPerfEvaluation}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF3737] hover:bg-[#dc2626] text-white text-xs font-black uppercase tracking-wider transition cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Enregistrer une performance</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      {/* GAUCHE : CHOIX DU POSTE + 4 ONGLETS PILIERS (MÉTRIQUES PERF. JOUEUR) + MODIFIER/SUPPRIMER */}
                      <div className="lg:col-span-6 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 space-y-4 min-w-0">
                        {/* En-tête poste actif & note globale */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                          <div className="min-w-0">
                            <div className="inline-flex items-center gap-1.5 text-xs font-black text-[#0D0D0F]">
                              <Shield className="w-3.5 h-3.5 text-[#FF3737] shrink-0" />
                              <span className="truncate">
                                {activePositionObj
                                  ? `${activePositionObj.emoji} ${getMetricPositionFrenchName(activePositionObj)}`
                                  : activeEvaluation?.position_code || player.position || 'Poste'}
                              </span>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-500 pl-5">
                              {formatReadableDate(perfSelectedDate)}
                              {activeSet ? ` · ${activeSet.name}` : ''}
                            </p>
                          </div>

                          <div className="px-3 py-1.5 rounded-xl bg-[#0D0D0F] text-white text-center shrink-0">
                            <span className="text-xs font-black text-[#FF3737] tabular-nums">
                              {displayedPillarScores.global}/10
                            </span>
                          </div>
                        </div>

                        {/* Choix du poste (Métriques Perf. Joueur) */}
                        {selectablePositions.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                              <Shield className="w-3 h-3 text-[#FF3737]" />
                              <span>Choix du poste (Métriques Perf. Joueur)</span>
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {selectablePositions.map(pos => {
                                const isActPos = activePositionObj?.code === pos.code;
                                return (
                                  <button
                                    key={pos.id}
                                    type="button"
                                    onClick={() => {
                                      if (isActPos) return;
                                      setSelectedPosCode(pos.code);
                                      if (activeEvaluation && !isEditingPerf) {
                                        setConfirmDeletePerf(false);
                                        setIsEditingPerf(true);
                                      }
                                    }}
                                    className={cn(
                                      'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition cursor-pointer',
                                      isActPos
                                        ? 'bg-[#FF3737] text-white'
                                        : 'bg-[#161619] text-white/85 hover:bg-[#26262c]'
                                    )}
                                  >
                                    <span>{pos.emoji}</span>
                                    <span>{pos.code}</span>
                                    <span
                                      className={cn(
                                        'text-[10px] font-bold',
                                        isActPos ? 'text-white/90' : 'text-white/60'
                                      )}
                                    >
                                      {getMetricPositionFrenchName(pos)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 4 Onglets Piliers synchronisés avec le Radar */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-[#0D0D0F]">
                              4 Piliers &amp; Critères
                            </span>
                            {isPerfEditable && (
                              <button
                                type="button"
                                onClick={handleResetPerfBase5}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#161619] hover:bg-[#26262c] text-[10px] font-black text-white cursor-pointer transition"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Base 5</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" role="tablist">
                            {PERF_PILLAR_TABS.map(tab => {
                              const isAct = activePerfPillar === tab.key;
                              const pScore = displayedPillarScores[tab.key];
                              const pct = Math.min(100, Math.max(0, (pScore / 10) * 100));
                              return (
                                <button
                                  key={tab.key}
                                  type="button"
                                  role="tab"
                                  aria-selected={isAct}
                                  onClick={() => handleSelectPerfPillar(tab.key)}
                                  className={cn(
                                    'rounded-xl p-2.5 text-left transition cursor-pointer space-y-1.5',
                                    isAct
                                      ? 'bg-[#FF3737] text-white shadow-xs'
                                      : 'bg-[#161619] hover:bg-[#26262c] text-white'
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-1 text-[11px] font-black">
                                    <span className="truncate">{tab.label}</span>
                                    <span className="tabular-nums shrink-0">{pScore}/10</span>
                                  </div>
                                  <div
                                    className={cn(
                                      'w-full h-1.5 rounded-full overflow-hidden',
                                      isAct ? 'bg-black/25' : 'bg-white/15'
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        'h-full rounded-full transition-all duration-200',
                                        isAct ? 'bg-white' : 'bg-[#FF3737]'
                                      )}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Barres de critères du pilier sélectionné (lecture ou modification sliders) */}
                          {(() => {
                            const critList = activePositionObj?.criteria?.[activePerfPillar] || [];
                            const curPillarVal = displayedPillarScores[activePerfPillar];

                            if (critList.length === 0) {
                              return (
                                <div className="p-3.5 rounded-2xl bg-slate-50 space-y-2">
                                  <div className="flex items-center justify-between text-xs font-bold text-[#0D0D0F]">
                                    <span>Score global du pilier</span>
                                    <span className="px-2 py-0.5 rounded-md bg-[#FF3737] text-white text-[11px] font-black tabular-nums">
                                      {curPillarVal}/10
                                    </span>
                                  </div>
                                  <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-[#FF3737] transition-all duration-200"
                                      style={{ width: `${curPillarVal * 10}%` }}
                                    />
                                  </div>
                                  {isPerfEditable && (
                                    <input
                                      type="range"
                                      min={0}
                                      max={10}
                                      step={1}
                                      value={perfPillarSliders[activePerfPillar]}
                                      onChange={e =>
                                        handlePillarDirectSliderChange(
                                          activePerfPillar,
                                          Number(e.target.value)
                                        )
                                      }
                                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#FF3737] bg-slate-200"
                                    />
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                                {critList.map(crit => {
                                  const k = `${activePerfPillar}:${crit}`;
                                  const { title, detail } = parseMetricCriterionLabel(crit);
                                  const rawVal = perfCriteriaScores[k] ?? curPillarVal;
                                  const intVal = Math.min(10, Math.max(0, Math.round(Number(rawVal))));

                                  return (
                                    <div
                                      key={k}
                                      className="p-2.5 rounded-xl bg-slate-50 space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between gap-2 text-xs">
                                        <span
                                          className="font-bold text-[#0D0D0F] truncate"
                                          title={detail ? `${title} : ${detail}` : title}
                                        >
                                          {title}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-[#0D0D0F] text-white text-[11px] font-black tabular-nums shrink-0">
                                          {intVal}/10
                                        </span>
                                      </div>

                                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-[#FF3737] transition-all duration-200"
                                          style={{ width: `${intVal * 10}%` }}
                                        />
                                      </div>

                                      {isPerfEditable && (
                                        <input
                                          type="range"
                                          min={0}
                                          max={10}
                                          step={1}
                                          value={intVal}
                                          onChange={e =>
                                            handleCriterionSliderChange(
                                              activePerfPillar,
                                              crit,
                                              Number(e.target.value)
                                            )
                                          }
                                          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#FF3737] bg-slate-200"
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Boutons d'action : Modifier -> Mettre à jour / Supprimer (ou Enregistrer) */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                          {activeEvaluation ? (
                            isEditingPerf ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isSavingPerf}
                                  onClick={handleCancelPerfEdit}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#161619] hover:bg-[#26262c] text-white text-xs font-black cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Annuler</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingPerf}
                                  onClick={() => void handleSaveOrUpdatePerf()}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF3737] hover:bg-[#dc2626] text-white text-xs font-black cursor-pointer ml-auto"
                                >
                                  {isSavingPerf ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5" />
                                  )}
                                  <span>Mettre à jour ({displayedPillarScores.global}/10)</span>
                                </button>
                              </>
                            ) : (
                              <>
                                {confirmDeletePerf ? (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={isDeletingPerf}
                                      onClick={() => void handleDeletePerformance(activeEvaluation)}
                                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#FF3737] hover:bg-[#dc2626] text-white text-[11px] font-black cursor-pointer"
                                    >
                                      {isDeletingPerf ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Check className="w-3.5 h-3.5" />
                                      )}
                                      <span>Confirmer</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isDeletingPerf}
                                      onClick={() => setConfirmDeletePerf(false)}
                                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#161619] hover:bg-[#26262c] text-white text-[11px] font-black cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Annuler</span>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeletePerf(true)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF3737] hover:bg-[#dc2626] text-white text-xs font-black cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Supprimer</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmDeletePerf(false);
                                    setIsEditingPerf(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0D0D0F] hover:bg-[#1e1e26] text-white text-xs font-black cursor-pointer ml-auto"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-[#FF3737]" />
                                  <span>Modifier</span>
                                </button>
                              </>
                            )
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={handleCancelPerfEdit}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#161619] hover:bg-[#26262c] text-white text-xs font-black cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Annuler</span>
                              </button>
                              <button
                                type="button"
                                disabled={isSavingPerf}
                                onClick={() => void handleSaveOrUpdatePerf()}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF3737] hover:bg-[#dc2626] text-white text-xs font-black cursor-pointer ml-auto"
                              >
                                {isSavingPerf ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Save className="w-3.5 h-3.5" />
                                )}
                                <span>Enregistrer ({displayedPillarScores.global}/10)</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* DROITE : RADAR + COURBE D'ÉVOLUTION EN FONCTION DE LA DATE JUSTE AU-DESSOUS */}
                      <div className="lg:col-span-6 space-y-4 min-w-0">
                        <PlayerPerformanceRadarChart
                          variant="default"
                          theme="fus"
                          hideFooter
                          hideHeaderMeta
                          integerOnly
                          playerName={player.full_name}
                          evaluation={radarSnapshot}
                          activePosition={activePositionObj}
                          viewMode={radarViewMode}
                          onViewModeChange={handleShortlistRadarViewChange}
                          height={300}
                        />

                        <PlayerPerformanceEvolutionChart
                          theme="fus"
                          hideSourceFilter
                          integerOnly
                          title="Courbe d'évolution en fonction de la date"
                          subtitle={`Période ${activePeriodMeta.label} (${activePeriodMeta.months} mois) · Cliquez sur un point`}
                          evaluations={evolutionEvaluations}
                          selectedEvaluationId={activeEvaluation?.id || null}
                          onSelectEvaluation={ev => {
                            const targetDate = String(ev.evaluation_date || '').slice(0, 10);
                            if (targetDate) setPerfSelectedDate(targetDate);
                          }}
                          headerExtra={
                            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtre de période">
                              {EVOLUTION_PERIOD_OPTIONS.map(opt => {
                                const isAct = evolutionPeriod === opt.id;
                                const count = evolutionBoundsByPeriod[opt.id].length;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setEvolutionPeriod(opt.id)}
                                    className={cn(
                                      'px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer flex items-center gap-1.5',
                                      isAct
                                        ? 'bg-[#FF3737] text-white shadow-xs'
                                        : 'bg-[#161619] hover:bg-[#26262c] text-white/85'
                                    )}
                                  >
                                    <span>{opt.label}</span>
                                    <span
                                      className={cn(
                                        'px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums',
                                        isAct ? 'bg-[#0D0D0F] text-white' : 'bg-white/10 text-white/80'
                                      )}
                                    >
                                      {count}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          }
                          emptyTitle={`Aucune évaluation en mode ${activePeriodMeta.label}`}
                          emptyDescription={`Aucune performance sur les ${activePeriodMeta.months} derniers mois. Changez vers Semestriel ou Annuel.`}
                          height={240}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#161619] px-5 py-2 text-xs font-black text-white transition hover:bg-[#26262c] cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerMentionModal;
