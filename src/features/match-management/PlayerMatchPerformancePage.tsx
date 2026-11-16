import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Brain,
  Calendar,
  Check,
  Clock,
  Compass,
  Edit3,
  Footprints,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Shield,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePlayers } from '../../hooks/usePlayers';
import { useMetricSets } from '../../hooks/useMetricSets';
import { usePermissions } from '../../context/PermissionsContext';
import { AuditLogger } from '../../services/auditLogger';
import {
  PlayerPerformanceRadarChart,
  type RadarEvaluationSnapshot,
  type RadarViewMode,
} from '../../components/metrics/PlayerPerformanceRadarChart';
import { PlayerPerformanceEvolutionChart } from '../../components/metrics/PlayerPerformanceEvolutionChart';
import { PerformanceDateCalendarPicker } from './components/PerformanceDateCalendarPicker';
import {
  playerPerformanceService,
  type PlayerPerformanceEvaluation,
} from '../../services/playerPerformanceService';
import {
  computeIntegerPillarAveragesFromCriteria,
  getMetricPositionFrenchName,
  parseMetricCriterionLabel,
  resolveMetricSetForRubric,
  resolveMetricSetPositionForPlayer,
  type MetricPillar,
  type MetricSet,
  type MetricSetPosition,
} from '../../utils/metricSetsHelpers';
import { normalizeAgeCategory } from '../../constants';
import type { Player } from '../../types';
import { cn } from '../../lib/utils';

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

const DEFAULT_SCORE = 5;

const PILLAR_CONFIG: Array<{
  key: MetricPillar;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { key: 'technique', label: 'Technique', icon: Footprints },
  { key: 'tactique', label: 'Tactique', icon: Compass },
  { key: 'physique', label: 'Physique', icon: Zap },
  { key: 'mental', label: 'Mental', icon: Brain },
];

function formatDateFr(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr.slice(0, 10)), 'dd MMM yyyy', { locale: fr });
  } catch {
    return dateStr;
  }
}

function formatDateTimeFr(isoStr?: string | null): string | null {
  if (!isoStr) return null;
  try {
    const dt = parseISO(isoStr);
    if (Number.isNaN(dt.getTime())) return null;
    return format(dt, 'dd MMM yyyy à HH:mm', { locale: fr });
  } catch {
    return null;
  }
}

export const PlayerMatchPerformancePage: React.FC = () => {
  const { authState, hasSubModuleAccess, canManageCategory } = usePermissions();
  const { players = [], isLoading: playersLoading } = usePlayers();
  const { metricSets, allSetPositions, getPositionsForSet, isScoutUser } = useMetricSets();

  const currentRole = authState.user?.system_role || authState.roles?.[0] || null;
  const currentJobTitle = authState.user?.job_title || null;

  const canCreate = hasSubModuleAccess('player_performance', 'create');
  const canUpdate = hasSubModuleAccess('player_performance', 'update');
  const canDelete = hasSubModuleAccess('player_performance', 'delete');

  // Filtres : Catégorie, Date (Calendrier), Joueur
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  // Chargement automatique des performances du joueur sélectionné (alimente aussi les indicateurs du calendrier)
  const [allPlayerEvaluations, setAllPlayerEvaluations] = useState<PlayerPerformanceEvaluation[]>([]);
  const [isLoadingPlayerEvals, setIsLoadingPlayerEvals] = useState<boolean>(false);

  // État d'affichage / modification / création
  const [activeEvalId, setActiveEvalId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Référentiel "Métriques Perf. Joueur" (scope player_performance)
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [selectedPosCode, setSelectedPosCode] = useState<string>('');

  // Scores des 4 piliers et des critères du poste
  const [pillarSliders, setPillarSliders] = useState<Record<MetricPillar, number>>({
    technique: DEFAULT_SCORE,
    tactique: DEFAULT_SCORE,
    physique: DEFAULT_SCORE,
    mental: DEFAULT_SCORE,
  });
  const pillarSlidersRef = useRef(pillarSliders);
  pillarSlidersRef.current = pillarSliders;
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({});
  const [activePillarTab, setActivePillarTab] = useState<MetricPillar>('technique');
  const [radarViewMode, setRadarViewMode] = useState<RadarViewMode>('technique');
  const [evolutionPeriod, setEvolutionPeriod] = useState<EvolutionPeriodMode>('quarterly');

  // Actions Enregistrer / Mettre à jour / Supprimer
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  // Lots issus de "Métriques Perf. Joueur"
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
    const setPositions = getPositionsForSet(activeSet.id);
    return setPositions.length > 0 ? setPositions : allSetPositions;
  }, [activeSet, allSetPositions, getPositionsForSet]);

  // Catégories disponibles
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    players.forEach(p => {
      const cat = normalizeAgeCategory(p.category || 'PRO') || p.category || 'PRO';
      if (canManageCategory(cat)) cats.add(cat);
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  }, [players, canManageCategory]);

  // Joueurs filtrés par la catégorie choisie
  const filteredPlayers = useMemo(() => {
    return players
      .filter(p => {
        const cat = normalizeAgeCategory(p.category || 'PRO') || p.category || 'PRO';
        if (!canManageCategory(cat)) return false;
        if (categoryFilter !== 'ALL' && cat !== categoryFilter) return false;
        return true;
      })
      .sort((a, b) =>
        (a.full_name || '').localeCompare(b.full_name || '', 'fr', { sensitivity: 'base' })
      );
  }, [players, canManageCategory, categoryFilter]);

  // Maintenir un joueur valide sélectionné lorsque la catégorie change
  useEffect(() => {
    if (filteredPlayers.length === 0) {
      if (selectedPlayerId) setSelectedPlayerId('');
      return;
    }
    if (!selectedPlayerId || !filteredPlayers.some(p => p.id === selectedPlayerId)) {
      setSelectedPlayerId(filteredPlayers[0].id);
    }
  }, [filteredPlayers, selectedPlayerId]);

  const selectedPlayer: Player | null = useMemo(() => {
    if (!selectedPlayerId) return null;
    return players.find(p => p.id === selectedPlayerId) || null;
  }, [players, selectedPlayerId]);

  // Chargement automatique des évaluations dès que le joueur change
  const refreshPlayerEvaluations = useCallback(
    async (playerId: string): Promise<PlayerPerformanceEvaluation[]> => {
      if (!playerId || isScoutUser) return [];
      const list = await playerPerformanceService.listByPlayer(
        playerId,
        currentRole,
        currentJobTitle
      );
      return list;
    },
    [isScoutUser, currentRole, currentJobTitle]
  );

  useEffect(() => {
    if (!selectedPlayerId || isScoutUser) {
      setAllPlayerEvaluations([]);
      setIsLoadingPlayerEvals(false);
      return;
    }

    let cancelled = false;
    setAllPlayerEvaluations([]);
    setIsLoadingPlayerEvals(true);

    refreshPlayerEvaluations(selectedPlayerId)
      .then(list => {
        if (!cancelled) {
          setAllPlayerEvaluations(list);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.warn('[PlayerMatchPerformancePage] Erreur chargement évaluations:', err);
          setAllPlayerEvaluations([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPlayerEvals(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPlayerId, isScoutUser, refreshPlayerEvaluations]);

  // Carte des dates ayant au moins une performance enregistrée pour le calendrier
  const recordedDateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ev of allPlayerEvaluations) {
      if (String(ev.player_id) !== String(selectedPlayerId)) continue;
      const d = String(ev.evaluation_date || '').slice(0, 10);
      if (d) counts[d] = (counts[d] || 0) + 1;
    }
    return counts;
  }, [allPlayerEvaluations, selectedPlayerId]);

  // Évaluations correspondant automatiquement à la date filtrée
  const dayEvaluations = useMemo(() => {
    if (!filterDate || !selectedPlayerId) return [];
    return allPlayerEvaluations
      .filter(
        ev =>
          String(ev.player_id) === String(selectedPlayerId) &&
          String(ev.evaluation_date || '').slice(0, 10) === filterDate
      )
      .sort((a, b) => {
        const aManual = a.source_type === 'manual' ? 0 : 1;
        const bManual = b.source_type === 'manual' ? 0 : 1;
        if (aManual !== bManual) return aManual - bManual;
        return String(b.updated_at || b.created_at || '').localeCompare(
          String(a.updated_at || a.created_at || '')
        );
      });
  }, [allPlayerEvaluations, selectedPlayerId, filterDate]);

  const activeEval: PlayerPerformanceEvaluation | null = useMemo(() => {
    if (!activeEvalId) return null;
    return dayEvaluations.find(e => e.id === activeEvalId) || null;
  }, [dayEvaluations, activeEvalId]);

  const activePosition: MetricSetPosition | null = useMemo(() => {
    if (positionsInSet.length === 0) return null;
    if (selectedPosCode) {
      const matched = positionsInSet.find(
        p => p.code.toUpperCase() === selectedPosCode.toUpperCase()
      );
      if (matched) return matched;
    }
    return (
      resolveMetricSetPositionForPlayer(positionsInSet, selectedPlayer?.position) ||
      positionsInSet[0]
    );
  }, [positionsInSet, selectedPosCode, selectedPlayer?.position]);

  const buildInitialCriteriaForPosition = useCallback(
    (
      pos: MetricSetPosition | null,
      baseScores: Record<MetricPillar, number>,
      existingCriteria?: Record<string, number>
    ): Record<string, number> => {
      const next: Record<string, number> = { ...(existingCriteria || {}) };
      if (!pos?.criteria) return next;
      for (const pillar of ['technique', 'tactique', 'physique', 'mental'] as MetricPillar[]) {
        const list = pos.criteria[pillar] || [];
        const fallbackVal = Math.min(10, Math.max(0, Math.round(baseScores[pillar] ?? DEFAULT_SCORE)));
        for (const crit of list) {
          const scopedKey = `${pillar}:${crit}`;
          if (next[scopedKey] === undefined) {
            const legacyVal = next[crit];
            next[scopedKey] =
              legacyVal !== undefined && Number.isFinite(Number(legacyVal))
                ? Math.min(10, Math.max(0, Math.round(Number(legacyVal))))
                : fallbackVal;
          } else {
            next[scopedKey] = Math.min(10, Math.max(0, Math.round(Number(next[scopedKey]))));
          }
        }
      }
      return next;
    },
    []
  );

  const loadEvaluationIntoEditor = useCallback(
    (ev: PlayerPerformanceEvaluation, player: Player | null) => {
      setActiveEvalId(ev.id);
      setIsEditing(false);
      setIsCreatingNew(false);
      setConfirmDelete(false);

      let targetPositions = positionsInSet;
      if (ev.metric_set_id && playerPerfSets.some(s => s.id === ev.metric_set_id)) {
        setSelectedSetId(ev.metric_set_id);
        const setPos = getPositionsForSet(ev.metric_set_id);
        if (setPos.length > 0) targetPositions = setPos;
      }

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
      setPillarSliders(baseScores);
      setCriteriaScores(buildInitialCriteriaForPosition(resolvedPos, baseScores, ev.criteria_scores));
    },
    [positionsInSet, playerPerfSets, getPositionsForSet, buildInitialCriteriaForPosition]
  );

  // Mise à jour automatique du résultat dès qu'un filtre change ou que les données arrivent
  useEffect(() => {
    setConfirmDelete(false);
    setIsEditing(false);
    setIsCreatingNew(false);

    if (dayEvaluations.length > 0) {
      loadEvaluationIntoEditor(dayEvaluations[0], selectedPlayer);
    } else {
      setActiveEvalId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerId, filterDate, dayEvaluations]);

  const startNewEvaluation = useCallback(() => {
    const resolvedPos =
      resolveMetricSetPositionForPlayer(positionsInSet, selectedPlayer?.position) ||
      positionsInSet[0] ||
      null;
    const baseScores: Record<MetricPillar, number> = {
      technique: DEFAULT_SCORE,
      tactique: DEFAULT_SCORE,
      physique: DEFAULT_SCORE,
      mental: DEFAULT_SCORE,
    };
    setActiveEvalId(null);
    setIsCreatingNew(true);
    setIsEditing(false);
    setConfirmDelete(false);
    setSelectedPosCode(resolvedPos?.code || '');
    setPillarSliders(baseScores);
    setCriteriaScores(buildInitialCriteriaForPosition(resolvedPos, baseScores));
    setActivePillarTab('technique');
    setRadarViewMode('technique');
  }, [positionsInSet, selectedPlayer?.position, buildInitialCriteriaForPosition]);

  // Synchroniser les critères manquants si le poste ou le lot de métriques change
  useEffect(() => {
    if (!activePosition?.criteria || (!activeEval && !isCreatingNew)) return;
    setCriteriaScores(prev => {
      const next = { ...prev };
      let changed = false;
      for (const pillar of ['technique', 'tactique', 'physique', 'mental'] as MetricPillar[]) {
        const list = activePosition.criteria[pillar] || [];
        const baseVal = pillarSlidersRef.current[pillar] ?? DEFAULT_SCORE;
        for (const crit of list) {
          const scopedKey = `${pillar}:${crit}`;
          if (next[scopedKey] === undefined) {
            const legacy = next[crit];
            next[scopedKey] =
              legacy !== undefined && Number.isFinite(Number(legacy))
                ? Math.min(10, Math.max(0, Math.round(Number(legacy))))
                : baseVal;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [activePosition, activeEval, isCreatingNew]);

  const isEditable = Boolean((activeEval && isEditing) || (!activeEval && isCreatingNew));

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

  const handlePillarDirectSliderChange = (pillar: MetricPillar, rawVal: number) => {
    if (!isEditable) return;
    const intVal = Math.min(10, Math.max(0, Math.round(rawVal)));
    setPillarSliders(prev => ({ ...prev, [pillar]: intVal }));

    const critList = activePosition?.criteria?.[pillar] || [];
    if (critList.length > 0) {
      const next = { ...criteriaScores };
      for (const crit of critList) {
        next[`${pillar}:${crit}`] = intVal;
      }
      setCriteriaScores(next);
    }
  };

  const handleCriterionSliderChange = (pillar: MetricPillar, crit: string, rawVal: number) => {
    if (!isEditable) return;
    const intVal = Math.min(10, Math.max(0, Math.round(rawVal)));
    const next = { ...criteriaScores, [`${pillar}:${crit}`]: intVal };
    setCriteriaScores(next);

    const critList = activePosition?.criteria?.[pillar] || [];
    if (critList.length > 0) {
      const sum = critList.reduce((acc, c) => acc + (next[`${pillar}:${c}`] ?? intVal), 0);
      const avg = Math.round(sum / critList.length);
      setPillarSliders(p => ({ ...p, [pillar]: avg }));
    }
  };

  const handleResetToBase5 = () => {
    if (!isEditable) return;
    const base: Record<MetricPillar, number> = {
      technique: DEFAULT_SCORE,
      tactique: DEFAULT_SCORE,
      physique: DEFAULT_SCORE,
      mental: DEFAULT_SCORE,
    };
    setPillarSliders(base);
    setCriteriaScores(buildInitialCriteriaForPosition(activePosition, base));
  };

  const handleCancelEdit = () => {
    if (activeEval) {
      loadEvaluationIntoEditor(activeEval, selectedPlayer);
      setIsEditing(false);
    } else {
      setIsCreatingNew(false);
    }
  };

  const integerSummary = useMemo(
    () => computeIntegerPillarAveragesFromCriteria(activePosition, criteriaScores, pillarSliders),
    [activePosition, criteriaScores, pillarSliders]
  );

  const effectiveScores = useMemo(() => {
    if (activePosition) {
      return {
        technique: integerSummary.technique,
        tactique: integerSummary.tactique,
        physique: integerSummary.physique,
        mental: integerSummary.mental,
        global: integerSummary.global,
      };
    }
    const technique = Math.round(pillarSliders.technique);
    const tactique = Math.round(pillarSliders.tactique);
    const physique = Math.round(pillarSliders.physique);
    const mental = Math.round(pillarSliders.mental);
    const global = Math.round((technique + tactique + physique + mental) / 4);
    return { technique, tactique, physique, mental, global };
  }, [activePosition, integerSummary, pillarSliders]);

  // Filtrage de la courbe d'évolution par période (Trimestriel 3m / Semestriel 6m / Annuel 12m)
  const evolutionBoundsByPeriod = useMemo(() => {
    const today = new Date();
    let selectedDt = today;
    try {
      if (filterDate && /^\d{4}-\d{2}-\d{2}$/.test(filterDate)) {
        const parsed = parseISO(filterDate);
        if (!Number.isNaN(parsed.getTime())) selectedDt = parsed;
      }
    } catch {
      selectedDt = today;
    }
    const anchorDate = selectedDt > today ? selectedDt : today;
    const endIso = format(anchorDate, 'yyyy-MM-dd');

    const playerEvals = allPlayerEvaluations.filter(
      ev => String(ev.player_id) === String(selectedPlayerId)
    );

    const byMode: Record<EvolutionPeriodMode, PlayerPerformanceEvaluation[]> = {
      quarterly: [],
      semiannual: [],
      annual: [],
    };

    for (const opt of EVOLUTION_PERIOD_OPTIONS) {
      const startIso = format(subMonths(anchorDate, opt.months), 'yyyy-MM-dd');
      byMode[opt.id] = playerEvals.filter(ev => {
        const d = String(ev.evaluation_date || '').slice(0, 10);
        return d >= startIso && d <= endIso;
      });
    }

    return byMode;
  }, [allPlayerEvaluations, selectedPlayerId, filterDate]);

  const evolutionEvaluations = evolutionBoundsByPeriod[evolutionPeriod];
  const activePeriodMeta =
    EVOLUTION_PERIOD_OPTIONS.find(o => o.id === evolutionPeriod) || EVOLUTION_PERIOD_OPTIONS[0];

  const radarSnapshot: RadarEvaluationSnapshot | null = useMemo(() => {
    if (!selectedPlayer || !filterDate) return null;
    if (!activeEval && !isCreatingNew) return null;
    return {
      id: activeEval ? activeEval.id : `draft-${selectedPlayer.id}`,
      label: selectedPlayer.full_name,
      positionCode: activePosition?.code || selectedPlayer.position || 'CM',
      positionName: activePosition ? getMetricPositionFrenchName(activePosition) : null,
      evaluationDate: formatDateFr(filterDate),
      sourceType: activeEval?.source_type || 'manual',
      technique: effectiveScores.technique,
      tactique: effectiveScores.tactique,
      physique: effectiveScores.physique,
      mental: effectiveScores.mental,
      global: effectiveScores.global,
      criteriaScores,
    };
  }, [
    selectedPlayer,
    filterDate,
    activeEval,
    isCreatingNew,
    activePosition,
    effectiveScores,
    criteriaScores,
  ]);

  const buildPayloadCriteria = (): Record<string, number> => {
    const built: Record<string, number> = { ...criteriaScores };
    if (activePosition?.criteria) {
      for (const pillar of ['technique', 'tactique', 'physique', 'mental'] as MetricPillar[]) {
        for (const crit of activePosition.criteria[pillar] || []) {
          const k = `${pillar}:${crit}`;
          if (built[k] === undefined) {
            built[k] = effectiveScores[pillar];
          }
        }
      }
    }
    return built;
  };

  const handleSaveOrUpdate = async () => {
    if (!selectedPlayer || !filterDate) return;

    if (activeEval && !canUpdate) {
      toast.error("Vous n'avez pas la permission de modifier cette performance.");
      return;
    }
    if (!activeEval && !canCreate) {
      toast.error("Vous n'avez pas la permission d'enregistrer une performance.");
      return;
    }

    const posCode = activePosition?.code || selectedPlayer.position || 'CM';
    const posName = activePosition
      ? getMetricPositionFrenchName(activePosition)
      : selectedPlayer.position || 'Milieu central';
    const builtCriteria = buildPayloadCriteria();

    setIsSaving(true);
    try {
      if (activeEval) {
        const previousSnapshot = {
          technique_score: activeEval.technique_score,
          tactique_score: activeEval.tactique_score,
          physique_score: activeEval.physique_score,
          mental_score: activeEval.mental_score,
          global_score: activeEval.global_score,
          position_code: activeEval.position_code,
        };

        const updated = await playerPerformanceService.updateEvaluation(
          activeEval.id,
          {
            player_id: selectedPlayer.id,
            match_id: activeEval.match_id ?? null,
            match_label: activeEval.match_label ?? null,
            metric_set_id: activeSet?.id || activeEval.metric_set_id || null,
            metric_set_name: activeSet?.name || activeEval.metric_set_name || 'Performance Joueur',
            position_code: posCode,
            position_name: posName,
            evaluation_date: filterDate,
            source_type: activeEval.source_type || 'manual',
            technique_score: effectiveScores.technique,
            tactique_score: effectiveScores.tactique,
            physique_score: effectiveScores.physique,
            mental_score: effectiveScores.mental,
            global_score: effectiveScores.global,
            criteria_scores: builtCriteria,
            comment: activeEval.comment || '',
          },
          currentRole,
          currentJobTitle
        );

        void AuditLogger.logUpdate(
          'PLAYERS',
          'PLAYER_PERFORMANCE',
          updated.id,
          previousSnapshot,
          {
            technique_score: updated.technique_score,
            tactique_score: updated.tactique_score,
            physique_score: updated.physique_score,
            mental_score: updated.mental_score,
            global_score: updated.global_score,
            position_code: updated.position_code,
            evaluation_date: updated.evaluation_date,
          },
          `Mise à jour performance de ${selectedPlayer.full_name} (${formatDateFr(filterDate)}) : ${updated.global_score}/10`
        );

        const freshList = await refreshPlayerEvaluations(selectedPlayer.id);
        setAllPlayerEvaluations(
          freshList.length > 0
            ? freshList
            : allPlayerEvaluations.map(item => (item.id === activeEval.id ? updated : item))
        );
        setActiveEvalId(updated.id);
        setIsEditing(false);
        toast.success(
          `Mise à jour enregistrée pour ${selectedPlayer.full_name} (${effectiveScores.global}/10)`
        );
      } else {
        const created = await playerPerformanceService.createEvaluation(
          {
            player_id: selectedPlayer.id,
            match_id: null,
            match_label: null,
            metric_set_id: activeSet?.id || null,
            metric_set_name: activeSet?.name || 'Performance Joueur',
            position_code: posCode,
            position_name: posName,
            evaluation_date: filterDate,
            source_type: 'manual',
            evaluator_id: authState.user?.id || null,
            evaluator_name:
              (authState.user as (typeof authState.user & { full_name?: string | null }) | null)
                ?.full_name ||
              authState.email ||
              'Staff Technique',
            technique_score: effectiveScores.technique,
            tactique_score: effectiveScores.tactique,
            physique_score: effectiveScores.physique,
            mental_score: effectiveScores.mental,
            global_score: effectiveScores.global,
            criteria_scores: builtCriteria,
            comment: '',
          },
          currentRole,
          currentJobTitle
        );

        void AuditLogger.logCreate(
          'PLAYERS',
          'PLAYER_PERFORMANCE',
          created.id,
          {
            player_id: created.player_id,
            evaluation_date: created.evaluation_date,
            position_code: created.position_code,
            global_score: created.global_score,
          },
          `Enregistrement performance de ${selectedPlayer.full_name} (${formatDateFr(filterDate)}) : ${created.global_score}/10`
        );

        const freshList = await refreshPlayerEvaluations(selectedPlayer.id);
        setAllPlayerEvaluations(
          freshList.length > 0 ? freshList : [...allPlayerEvaluations, created]
        );
        setActiveEvalId(created.id);
        setIsCreatingNew(false);
        setIsEditing(false);
        toast.success(
          `Performance enregistrée pour ${selectedPlayer.full_name} (${effectiveScores.global}/10)`
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Impossible d'enregistrer la performance.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvaluation = async () => {
    if (!activeEval || !selectedPlayer) return;
    if (!canDelete) {
      toast.error("Vous n'avez pas la permission de supprimer cette performance.");
      return;
    }

    setIsDeleting(true);
    try {
      await playerPerformanceService.deleteEvaluation(
        activeEval.id,
        currentRole,
        currentJobTitle,
        { playerId: activeEval.player_id, matchId: activeEval.match_id }
      );

      void AuditLogger.logDelete(
        'PLAYERS',
        'PLAYER_PERFORMANCE',
        activeEval.id,
        {
          player_id: activeEval.player_id,
          evaluation_date: activeEval.evaluation_date,
          global_score: activeEval.global_score,
        },
        `Suppression performance de ${selectedPlayer.full_name} (${formatDateFr(filterDate)})`
      );

      const freshList = await refreshPlayerEvaluations(selectedPlayer.id);
      setAllPlayerEvaluations(
        freshList.filter(item => item.id !== activeEval.id)
      );
      setConfirmDelete(false);
      setIsEditing(false);
      setIsCreatingNew(false);
      toast.success('Performance supprimée');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la suppression.';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isScoutUser) {
    return (
      <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center max-w-2xl mx-auto my-8 space-y-3 shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-[#FF3737] text-white flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-[#0D0D0F]">Accès restreint — Performance Joueur</h2>
        <p className="text-sm text-slate-600">
          Cette rubrique utilise les métriques internes du staff technique et reste isolée des comptes Scouts.
        </p>
      </div>
    );
  }

  const showEditorWorkspace = Boolean(selectedPlayer && (activeEval || isCreatingNew));
  const lastUpdatedLabel = activeEval
    ? formatDateTimeFr(activeEval.updated_at || activeEval.created_at)
    : null;

  return (
    <div className="space-y-6 pb-14">
      {/* Filtres automatiques (sans bannière) : Catégorie, Joueur & Calendrier avec indicateur */}
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Filtre Catégorie */}
          <div className="md:col-span-3 space-y-1.5 min-w-0">
            <label
              htmlFor="perf-filter-category"
              className="text-[11px] font-black uppercase tracking-wider text-[#0D0D0F] flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-[#FF3737]" />
              <span>Catégorie</span>
            </label>
            <select
              id="perf-filter-category"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              disabled={playersLoading}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-xs sm:text-sm font-bold text-[#0D0D0F] focus:outline-none focus:ring-2 focus:ring-[#FF3737]/30 transition"
            >
              <option value="ALL">Toutes les catégories</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre Joueur */}
          <div className="md:col-span-5 space-y-1.5 min-w-0">
            <label
              htmlFor="perf-filter-player"
              className="text-[11px] font-black uppercase tracking-wider text-[#0D0D0F] flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-[#FF3737]" />
              <span>Joueur ({filteredPlayers.length})</span>
            </label>
            <select
              id="perf-filter-player"
              value={selectedPlayerId}
              onChange={e => setSelectedPlayerId(e.target.value)}
              disabled={playersLoading || filteredPlayers.length === 0}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-xs sm:text-sm font-bold text-[#0D0D0F] focus:outline-none focus:ring-2 focus:ring-[#FF3737]/30 disabled:opacity-60 transition"
            >
              {filteredPlayers.length === 0 ? (
                <option value="">Aucun joueur dans cette catégorie</option>
              ) : (
                filteredPlayers.map(p => {
                  const cat = normalizeAgeCategory(p.category || 'PRO') || p.category || 'PRO';
                  const posLabel = p.position ? ` · ${p.position}` : '';
                  const catLabel = categoryFilter === 'ALL' ? ` (${cat})` : '';
                  return (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                      {posLabel}
                      {catLabel}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Filtre Date avec Calendrier & Indicateurs */}
          <div className="md:col-span-4 space-y-1.5 min-w-0">
            <label
              htmlFor="perf-filter-date"
              className="text-[11px] font-black uppercase tracking-wider text-[#0D0D0F] flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-[#FF3737]" />
              <span>Calendrier / Date</span>
            </label>
            <PerformanceDateCalendarPicker
              value={filterDate}
              onChange={setFilterDate}
              recordedDateCounts={recordedDateCounts}
              isLoadingDates={isLoadingPlayerEvals}
            />
          </div>
        </div>
      </div>

      {/* Résultat mis à jour automatiquement selon les filtres */}
      {selectedPlayer && (
        <>
          {isLoadingPlayerEvals ? (
            <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-10 flex items-center justify-center gap-2.5 text-xs font-black text-[#0D0D0F]">
              <Loader2 className="w-5 h-5 animate-spin text-[#FF3737]" />
              <span>Chargement de la performance...</span>
            </div>
          ) : activeEval ? (
            <div className="rounded-2xl bg-[#0D0D0F] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF3737] text-white text-[11px] font-black uppercase tracking-wider shrink-0">
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Modification en cours' : 'Performance enregistrée'}</span>
                </span>
                <span className="text-xs font-bold text-white/85">
                  {formatDateFr(filterDate)}
                </span>
                {activeSet && (
                  <span className="px-2.5 py-1 rounded-lg bg-[#1C1C22] text-white/85 text-[11px] font-bold">
                    {activeSet.name}
                  </span>
                )}
                {lastUpdatedLabel && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/65">
                    <Clock className="w-3 h-3 text-[#FF3737]" />
                    <span>Enregistré le {lastUpdatedLabel}</span>
                  </span>
                )}
              </div>

              {dayEvaluations.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  {dayEvaluations.map((ev, idx) => {
                    const isSelected = ev.id === activeEval.id;
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => loadEvaluationIntoEditor(ev, selectedPlayer)}
                        className={cn(
                          'px-3 py-1 rounded-lg text-[11px] font-black transition cursor-pointer',
                          isSelected
                            ? 'bg-[#FF3737] text-white'
                            : 'bg-[#1C1C22] text-white/80 hover:bg-[#2a2a32]'
                        )}
                      >
                        Éval #{idx + 1} ({Math.round(ev.global_score)}/10)
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : !isCreatingNew ? (
            <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-8 sm:p-10 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-[#0D0D0F] text-white flex items-center justify-center">
                <Calendar className="w-6 h-6 text-[#FF3737]" />
              </div>
              <div className="space-y-1 max-w-lg mx-auto">
                <h2 className="text-base sm:text-lg font-black text-[#0D0D0F]">
                  Aucune performance enregistrée
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  Il n&apos;existe pas encore de performance enregistrée pour{' '}
                  <span className="font-bold text-[#0D0D0F]">{selectedPlayer.full_name}</span> à la
                  date du{' '}
                  <span className="font-bold text-[#0D0D0F]">{formatDateFr(filterDate)}</span>.
                </p>
              </div>
              {canCreate && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={startNewEvaluation}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#FF3737] hover:bg-[#e02d2d] text-white text-xs font-black uppercase tracking-wider transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Enregistrer une performance</span>
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* Espace 2 Colonnes : 4 Piliers en Onglets + Critères à gauche | Radar à droite */}
          {!isLoadingPlayerEvals && showEditorWorkspace && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* COLONNE GAUCHE : 4 ONGLETS PILIER & CRITÈRES MÉTRIQUES PERF. JOUEUR */}
              <div className="lg:col-span-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-5 min-w-0">
                {/* En-tête Joueur & Note Globale */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        selectedPlayer.photo_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPlayer.full_name)}&background=0D0D0F&color=fff&size=128`
                      }
                      alt={selectedPlayer.full_name}
                      className="w-12 h-12 rounded-2xl object-cover bg-[#0D0D0F] shrink-0"
                      onError={e => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/assets/avatar.svg';
                      }}
                    />
                    <div className="min-w-0">
                      <h2 className="text-base font-black text-[#0D0D0F] truncate">
                        {selectedPlayer.full_name}
                      </h2>
                      <p className="text-xs font-bold text-slate-600 truncate">
                        {activePosition
                          ? `${activePosition.emoji} ${getMetricPositionFrenchName(activePosition)}`
                          : selectedPlayer.position || 'Poste non défini'}
                      </p>
                    </div>
                  </div>

                  <div className="px-3.5 py-2 rounded-2xl bg-[#0D0D0F] text-white text-center shrink-0">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-white/70">
                      Note Globale
                    </div>
                    <div className="text-lg font-black text-[#FF3737] tabular-nums">
                      {effectiveScores.global}/10
                    </div>
                  </div>
                </div>

                {/* Sélecteur de lot & poste (actif en mode Modification ou Création) */}
                {isEditable && playerPerfSets.length > 1 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      Métriques Perf. Joueur
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {playerPerfSets.map(setItem => {
                        const isActive = activeSet?.id === setItem.id;
                        return (
                          <button
                            key={setItem.id}
                            type="button"
                            onClick={() => setSelectedSetId(setItem.id)}
                            className={cn(
                              'px-3 py-1.5 rounded-xl text-[11px] font-black transition cursor-pointer',
                              isActive
                                ? 'bg-[#FF3737] text-white'
                                : 'bg-[#161619] text-white/85 hover:bg-[#26262c]'
                            )}
                          >
                            {setItem.emoji} {setItem.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {positionsInSet.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-[#FF3737]" />
                      <span>Choix du poste (Métriques Perf. Joueur)</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {positionsInSet.map(pos => {
                        const isActive = activePosition?.code === pos.code;
                        return (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => {
                              setSelectedPosCode(pos.code);
                              if (activeEval && !isEditing && canUpdate) {
                                setConfirmDelete(false);
                                setIsEditing(true);
                              }
                            }}
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition cursor-pointer',
                              isActive
                                ? 'bg-[#FF3737] text-white'
                                : 'bg-[#161619] text-white/85 hover:bg-[#26262c]'
                            )}
                          >
                            <span>{pos.emoji}</span>
                            <span>{pos.code}</span>
                            <span
                              className={cn(
                                'text-[10px] font-bold',
                                isActive ? 'text-white/90' : 'text-white/60'
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

                {/* 4 ONGLETS PILIER (Technique, Tactique, Physique, Mental) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#0D0D0F]">
                      4 Piliers &amp; Critères (Métriques Perf. Joueur)
                    </h3>
                    {isEditable && (
                      <button
                        type="button"
                        onClick={handleResetToBase5}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#161619] hover:bg-[#26262c] text-[11px] font-bold text-white cursor-pointer transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Base 5</span>
                      </button>
                    )}
                  </div>

                  {/* Onglets des 4 Piliers */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="tablist">
                    {PILLAR_CONFIG.map(pillarMeta => {
                      const IconComp = pillarMeta.icon;
                      const score = effectiveScores[pillarMeta.key];
                      const isActive = activePillarTab === pillarMeta.key;
                      const pct = Math.min(100, Math.max(0, (score / 10) * 100));

                      return (
                        <button
                          key={pillarMeta.key}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => handleSelectPillarTab(pillarMeta.key)}
                          className={cn(
                            'rounded-2xl p-3 text-left transition cursor-pointer space-y-2',
                            isActive
                              ? 'bg-[#FF3737] text-white shadow-sm'
                              : 'bg-[#161619] hover:bg-[#232329] text-white'
                          )}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <IconComp className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-xs font-black truncate">{pillarMeta.label}</span>
                            </div>
                            <span
                              className={cn(
                                'px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums shrink-0',
                                isActive ? 'bg-[#0D0D0F] text-white' : 'bg-white/10 text-white'
                              )}
                            >
                              {score}/10
                            </span>
                          </div>

                          <div
                            className={cn(
                              'w-full h-1.5 rounded-full overflow-hidden',
                              isActive ? 'bg-black/25' : 'bg-white/15'
                            )}
                          >
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-200',
                                isActive ? 'bg-white' : 'bg-[#FF3737]'
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Contenu de l'onglet pilier sélectionné : Barre du pilier + ses critères */}
                  {(() => {
                    const activeMeta =
                      PILLAR_CONFIG.find(p => p.key === activePillarTab) || PILLAR_CONFIG[0];
                    const ActiveIcon = activeMeta.icon;
                    const pillarScore = effectiveScores[activeMeta.key];
                    const pillarPct = Math.min(100, Math.max(0, (pillarScore / 10) * 100));
                    const activeCriteria = activePosition?.criteria?.[activeMeta.key] || [];

                    return (
                      <div className="rounded-2xl bg-slate-50 p-4 space-y-3.5">
                        {/* Barre principale du pilier sélectionné */}
                        <div className="bg-white rounded-xl p-3.5 space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-7 h-7 rounded-xl bg-[#0D0D0F] text-white flex items-center justify-center shrink-0">
                                <ActiveIcon className="w-3.5 h-3.5 text-[#FF3737]" />
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-black text-[#0D0D0F]">
                                  {activeMeta.label}
                                </div>
                                <div className="text-[10px] font-semibold text-slate-500">
                                  {activeCriteria.length > 0
                                    ? `${activeCriteria.length} critères du poste`
                                    : 'Note directe du pilier'}
                                </div>
                              </div>
                            </div>

                            <span className="px-2.5 py-1 rounded-lg bg-[#FF3737] text-white text-xs font-black tabular-nums shrink-0">
                              {pillarScore} / 10
                            </span>
                          </div>

                          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#FF3737] transition-all duration-200"
                              style={{ width: `${pillarPct}%` }}
                            />
                          </div>

                          {isEditable && activeCriteria.length === 0 && (
                            <input
                              type="range"
                              min={0}
                              max={10}
                              step={1}
                              value={pillarScore}
                              onChange={e =>
                                handlePillarDirectSliderChange(
                                  activeMeta.key,
                                  Number(e.target.value)
                                )
                              }
                              aria-label={`${activeMeta.label} sur 10`}
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-[#FF3737]"
                            />
                          )}
                        </div>

                        {/* Liste des critères du pilier (lecture seule jusqu'à clic sur Modifier) */}
                        {activeCriteria.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {activeCriteria.map(crit => {
                              const key = `${activeMeta.key}:${crit}`;
                              const { title, detail } = parseMetricCriterionLabel(crit);
                              const val = Math.min(
                                10,
                                Math.max(0, Math.round(criteriaScores[key] ?? pillarScore))
                              );
                              const critPct = Math.min(100, Math.max(0, (val / 10) * 100));

                              return (
                                <div
                                  key={key}
                                  className="bg-white rounded-xl p-3 space-y-2 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span
                                      className="text-[11px] font-bold text-[#0D0D0F] truncate"
                                      title={detail ? `${title} : ${detail}` : title}
                                    >
                                      {title}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-[#0D0D0F] text-white text-[11px] font-black tabular-nums shrink-0">
                                      {val}/10
                                    </span>
                                  </div>

                                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-[#FF3737] transition-all duration-150"
                                      style={{ width: `${critPct}%` }}
                                    />
                                  </div>

                                  {isEditable && (
                                    <input
                                      type="range"
                                      min={0}
                                      max={10}
                                      step={1}
                                      value={val}
                                      onChange={e =>
                                        handleCriterionSliderChange(
                                          activeMeta.key,
                                          crit,
                                          Number(e.target.value)
                                        )
                                      }
                                      aria-label={`${title} sur 10`}
                                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-[#FF3737]"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Boutons d'action : Modifier -> Mettre à jour / Supprimer (ou Enregistrer si création) */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                  {activeEval ? (
                    isEditing ? (
                      <>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={handleCancelEdit}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#161619] hover:bg-[#26262c] text-white text-xs font-black uppercase tracking-wider transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                          <span>Annuler</span>
                        </button>

                        {canUpdate && (
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => void handleSaveOrUpdate()}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF3737] hover:bg-[#dc2626] text-white text-xs font-black uppercase tracking-wider transition cursor-pointer disabled:opacity-50 ml-auto"
                          >
                            {isSaving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            <span>Mettre à jour ({effectiveScores.global}/10)</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {canDelete ? (
                          confirmDelete ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => void handleDeleteEvaluation()}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF3737] hover:bg-[#dc2626] text-white text-xs font-black transition cursor-pointer disabled:opacity-50"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Confirmer suppression</span>
                              </button>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setConfirmDelete(false)}
                                className="inline-flex items-center gap-1 px-3.5 py-2.5 rounded-xl bg-[#161619] hover:bg-[#26262c] text-white text-xs font-black transition cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Annuler</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(true)}
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF3737] hover:bg-[#dc2626] text-white text-xs font-black uppercase tracking-wider transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Supprimer</span>
                            </button>
                          )
                        ) : (
                          <div />
                        )}

                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDelete(false);
                              setIsEditing(true);
                            }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D0D0F] hover:bg-[#1e1e26] text-white text-xs font-black uppercase tracking-wider transition cursor-pointer ml-auto"
                          >
                            <Edit3 className="w-4 h-4 text-[#FF3737]" />
                            <span>Modifier</span>
                          </button>
                        )}
                      </>
                    )
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#161619] hover:bg-[#26262c] text-white text-xs font-black uppercase tracking-wider transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>Annuler</span>
                      </button>

                      {canCreate && (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => void handleSaveOrUpdate()}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF3737] hover:bg-[#dc2626] text-white text-xs font-black uppercase tracking-wider transition cursor-pointer disabled:opacity-50 ml-auto"
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          <span>Enregistrer ({effectiveScores.global}/10)</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* COLONNE DROITE : RADAR EN TEMPS RÉEL + COURBE D'ÉVOLUTION EN FONCTION DE LA DATE */}
              <div className="lg:col-span-6 space-y-6 min-w-0">
                <PlayerPerformanceRadarChart
                  variant="default"
                  theme="fus"
                  hideFooter
                  hideHeaderMeta
                  integerOnly
                  playerName={selectedPlayer.full_name}
                  evaluation={radarSnapshot}
                  activePosition={activePosition}
                  viewMode={radarViewMode}
                  onViewModeChange={handleRadarViewChange}
                  height={380}
                />

                <PlayerPerformanceEvolutionChart
                  theme="fus"
                  hideSourceFilter
                  integerOnly
                  title="Courbe d'évolution en fonction de la date"
                  subtitle={`Période ${activePeriodMeta.label} (${activePeriodMeta.months} mois) · Cliquez sur un point pour afficher la date`}
                  evaluations={evolutionEvaluations}
                  selectedEvaluationId={activeEval?.id || null}
                  onSelectEvaluation={ev => {
                    const targetDate = String(ev.evaluation_date || '').slice(0, 10);
                    if (targetDate) setFilterDate(targetDate);
                  }}
                  headerExtra={
                    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtre de période">
                      {EVOLUTION_PERIOD_OPTIONS.map(opt => {
                        const isActive = evolutionPeriod === opt.id;
                        const count = evolutionBoundsByPeriod[opt.id].length;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setEvolutionPeriod(opt.id)}
                            className={cn(
                              'px-3 py-1.5 rounded-xl text-[11px] font-black transition cursor-pointer flex items-center gap-1.5',
                              isActive
                                ? 'bg-[#FF3737] text-white shadow-xs'
                                : 'bg-[#161619] hover:bg-[#26262c] text-white/85'
                            )}
                          >
                            <span>{opt.label}</span>
                            <span
                              className={cn(
                                'px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums',
                                isActive ? 'bg-[#0D0D0F] text-white' : 'bg-white/10 text-white/80'
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
                  emptyDescription={`Aucune performance enregistrée sur les ${activePeriodMeta.months} derniers mois pour ${selectedPlayer.full_name}. Changez vers Semestriel ou Annuel pour élargir l'historique.`}
                  height={270}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlayerMatchPerformancePage;
