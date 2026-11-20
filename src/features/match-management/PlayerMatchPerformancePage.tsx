import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowLeft,
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
import { useTeams } from '../../hooks/useTeams';
import { useMetricSets } from '../../hooks/useMetricSets';
import { usePermissions } from '../../context/PermissionsContext';
import { AuditLogger } from '../../services/auditLogger';
import {
  PlayerPerformanceRadarChart,
  type RadarEvaluationSnapshot,
  type RadarViewMode,
} from '../../components/metrics/PlayerPerformanceRadarChart';
import {
  playerPerformanceService,
  type PlayerPerformanceEvaluation,
} from '../../services/playerPerformanceService';
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
} from '../../utils/metricSetsHelpers';
import { normalizeAgeCategory } from '../../constants';
import type { Player } from '../../types';
import { calculateAge } from '../../types/arbitre';
import { cn } from '../../lib/utils';

type PlayerWithCategory = Player & { category?: string | null };

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

function getPlayerAge(player: Player | null | undefined): number | null {
  if (!player) return null;
  const exact = calculateAge(player.birth_date);
  if (exact !== null && exact > 0 && exact < 100) return exact;
  if (
    player.birth_year &&
    player.birth_year > 1950 &&
    player.birth_year <= new Date().getFullYear()
  ) {
    return new Date().getFullYear() - player.birth_year;
  }
  return null;
}

function getPlayerNameDisplay(player: Player): {
  lastName: string;
  firstName: string;
  fullName: string;
  hasSplit: boolean;
} {
  const first = (player.first_name || '').trim();
  const last = (player.last_name || '').trim();
  if (first && last) {
    return {
      lastName: last,
      firstName: first,
      fullName: `${first} ${last}`,
      hasSplit: true,
    };
  }
  const full = (player.full_name || first || last || 'Joueur').trim();
  return {
    lastName: full,
    firstName: '',
    fullName: full,
    hasSplit: false,
  };
}

function getPlayerPhotoUrl(player: Player): string {
  if (player.photo_url && player.photo_url !== 'null') {
    return player.photo_url;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name || 'Joueur')}&background=0D0D0F&color=fff&size=256`;
}

export const PlayerMatchPerformancePage: React.FC = () => {
  const { authState, hasSubModuleAccess, canManageCategory } = usePermissions();
  const { players = [], isLoading: playersLoading } = usePlayers();
  const { teams = [] } = useTeams();
  const { metricSets, allSetPositions, getPositionsForSet, isScoutUser } = useMetricSets();

  const currentRole = authState.user?.system_role || authState.roles?.[0] || null;
  const currentJobTitle = authState.user?.job_title || null;

  const canCreate = hasSubModuleAccess('player_performance', 'create');
  const canUpdate = hasSubModuleAccess('player_performance', 'update');
  const canDelete = hasSubModuleAccess('player_performance', 'delete');

  // Filtre unique par catégorie + joueur cliqué + date de l'évaluation affichée/créée
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  // Chargement automatique des performances du joueur sélectionné
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

  const teamCategoryById = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach(t => {
      if (t.id && t.category) map.set(t.id, t.category);
    });
    return map;
  }, [teams]);

  const resolvePlayerCategory = useCallback(
    (p: PlayerWithCategory): string => {
      const rawCat = p.category || (p.team_id ? teamCategoryById.get(p.team_id) : null) || 'PRO';
      return normalizeAgeCategory(rawCat) || rawCat;
    },
    [teamCategoryById]
  );

  // Catégories disponibles
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    players.forEach(p => {
      const cat = resolvePlayerCategory(p as PlayerWithCategory);
      if (canManageCategory(cat)) cats.add(cat);
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  }, [players, canManageCategory, resolvePlayerCategory]);

  // Joueurs filtrés par la catégorie choisie
  const filteredPlayers = useMemo(() => {
    return players
      .filter(p => {
        const cat = resolvePlayerCategory(p as PlayerWithCategory);
        if (!canManageCategory(cat)) return false;
        if (categoryFilter !== 'ALL' && cat !== categoryFilter) return false;
        return true;
      })
      .sort((a, b) =>
        (a.full_name || '').localeCompare(b.full_name || '', 'fr', { sensitivity: 'base' })
      );
  }, [players, canManageCategory, categoryFilter, resolvePlayerCategory]);

  // Si la catégorie change et que le joueur sélectionné n'en fait plus partie, revenir à la liste
  useEffect(() => {
    if (selectedPlayerId && !filteredPlayers.some(p => p.id === selectedPlayerId)) {
      setSelectedPlayerId('');
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

  // Liste triée des évaluations enregistrées (de la plus récente à la plus ancienne) pour la liste déroulante
  const sortedPlayerEvaluations = useMemo(() => {
    if (!selectedPlayerId) return [];
    return allPlayerEvaluations
      .filter(ev => String(ev.player_id) === String(selectedPlayerId))
      .sort((a, b) => {
        const dateCmp = String(b.evaluation_date || '')
          .slice(0, 10)
          .localeCompare(String(a.evaluation_date || '').slice(0, 10));
        if (dateCmp !== 0) return dateCmp;
        const aManual = a.source_type === 'manual' ? 0 : 1;
        const bManual = b.source_type === 'manual' ? 0 : 1;
        if (aManual !== bManual) return aManual - bManual;
        return String(b.updated_at || b.created_at || '').localeCompare(
          String(a.updated_at || a.created_at || '')
        );
      });
  }, [allPlayerEvaluations, selectedPlayerId]);

  // Libellés formatés des dates d'enregistrement pour la liste déroulante
  const savedDateDropdownOptions = useMemo(() => {
    const totalsByDate: Record<string, number> = {};
    for (const ev of sortedPlayerEvaluations) {
      const d = String(ev.evaluation_date || '').slice(0, 10);
      if (d) totalsByDate[d] = (totalsByDate[d] || 0) + 1;
    }
    const seenByDate: Record<string, number> = {};

    return sortedPlayerEvaluations.map(ev => {
      const d = String(ev.evaluation_date || '').slice(0, 10);
      seenByDate[d] = (seenByDate[d] || 0) + 1;
      const indexSuffix = (totalsByDate[d] || 0) > 1 ? ` (#${seenByDate[d]})` : '';
      const sourceTag =
        ev.source_type === 'match'
          ? ` · ${ev.match_label || 'Match'}`
          : ev.source_type === 'training'
            ? ' · Entraînement'
            : '';
      const posTag = ev.position_code ? ` · ${ev.position_code}` : '';
      return {
        id: ev.id,
        label: `${formatDateFr(d)}${indexSuffix} — ${Math.round(ev.global_score)}/10${posTag}${sourceTag}`,
      };
    });
  }, [sortedPlayerEvaluations]);

  const activeEval: PlayerPerformanceEvaluation | null = useMemo(() => {
    if (!activeEvalId) return null;
    return sortedPlayerEvaluations.find(e => e.id === activeEvalId) || null;
  }, [sortedPlayerEvaluations, activeEvalId]);

  const selectablePositions: MetricSetPosition[] = useMemo(
    () => filterMetricPositionsForPlayer(positionsInSet, selectedPlayer?.position),
    [positionsInSet, selectedPlayer?.position]
  );

  const activePosition: MetricSetPosition | null = useMemo(() => {
    if (selectablePositions.length === 0) return null;
    if (selectedPosCode) {
      const matched = selectablePositions.find(
        p => p.code.toUpperCase() === selectedPosCode.toUpperCase()
      );
      if (matched) return matched;
    }
    return (
      resolveMetricSetPositionForPlayer(selectablePositions, selectedPlayer?.position) ||
      selectablePositions[0]
    );
  }, [selectablePositions, selectedPosCode, selectedPlayer?.position]);

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
      setFilterDate(
        String(ev.evaluation_date || '').slice(0, 10) || new Date().toISOString().slice(0, 10)
      );
      setIsEditing(false);
      setIsCreatingNew(false);
      setConfirmDelete(false);

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
      setPillarSliders(baseScores);
      setCriteriaScores(buildInitialCriteriaForPosition(resolvedPos, baseScores, ev.criteria_scores));
    },
    [positionsInSet, playerPerfSets, getPositionsForSet, buildInitialCriteriaForPosition]
  );

  // Dès qu'un joueur est sélectionné et ses évaluations chargées, afficher automatiquement la dernière date enregistrée
  useEffect(() => {
    if (!selectedPlayerId) {
      setActiveEvalId(null);
      setIsEditing(false);
      setIsCreatingNew(false);
      setConfirmDelete(false);
      return;
    }

    if (isCreatingNew) return;

    if (sortedPlayerEvaluations.length === 0) {
      setActiveEvalId(null);
      setIsEditing(false);
      return;
    }

    const currentValid = activeEvalId
      ? sortedPlayerEvaluations.find(e => e.id === activeEvalId)
      : null;

    if (!currentValid) {
      loadEvaluationIntoEditor(sortedPlayerEvaluations[0], selectedPlayer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerId, sortedPlayerEvaluations, isCreatingNew]);

  const handleSelectPlayer = useCallback((player: Player) => {
    setSelectedPlayerId(player.id);
    setActiveEvalId(null);
    setIsEditing(false);
    setIsCreatingNew(false);
    setConfirmDelete(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBackToPlayers = useCallback(() => {
    setSelectedPlayerId('');
    setActiveEvalId(null);
    setIsEditing(false);
    setIsCreatingNew(false);
    setConfirmDelete(false);
  }, []);

  const handleCategoryChange = useCallback((nextCategory: string) => {
    setCategoryFilter(nextCategory);
    setSelectedPlayerId('');
    setActiveEvalId(null);
    setIsEditing(false);
    setIsCreatingNew(false);
    setConfirmDelete(false);
  }, []);

  const handleSelectSavedDateEval = useCallback(
    (evalId: string) => {
      const target = sortedPlayerEvaluations.find(e => e.id === evalId);
      if (target) {
        loadEvaluationIntoEditor(target, selectedPlayer);
      }
    },
    [sortedPlayerEvaluations, loadEvaluationIntoEditor, selectedPlayer]
  );

  const startNewEvaluation = useCallback(() => {
    const resolvedPos =
      resolveMetricSetPositionForPlayer(selectablePositions, selectedPlayer?.position) ||
      selectablePositions[0] ||
      null;
    const baseScores: Record<MetricPillar, number> = {
      technique: DEFAULT_SCORE,
      tactique: DEFAULT_SCORE,
      physique: DEFAULT_SCORE,
      mental: DEFAULT_SCORE,
    };
    setActiveEvalId(null);
    setFilterDate(new Date().toISOString().slice(0, 10));
    setIsCreatingNew(true);
    setIsEditing(false);
    setConfirmDelete(false);
    setSelectedPosCode(resolvedPos?.code || '');
    setPillarSliders(baseScores);
    setCriteriaScores(buildInitialCriteriaForPosition(resolvedPos, baseScores));
    setActivePillarTab('technique');
    setRadarViewMode('technique');
  }, [selectablePositions, selectedPlayer?.position, buildInitialCriteriaForPosition]);

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
      if (sortedPlayerEvaluations.length > 0 && selectedPlayer) {
        loadEvaluationIntoEditor(sortedPlayerEvaluations[0], selectedPlayer);
      }
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
        loadEvaluationIntoEditor(updated, selectedPlayer);
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
        setFilterDate(String(created.evaluation_date || filterDate).slice(0, 10));
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
      setActiveEvalId(null);
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
  const selectedPlayerAge = getPlayerAge(selectedPlayer);
  const selectedPlayerCategory = selectedPlayer
    ? resolvePlayerCategory(selectedPlayer as PlayerWithCategory)
    : null;
  const selectedPlayerName = selectedPlayer ? getPlayerNameDisplay(selectedPlayer) : null;

  return (
    <div className="space-y-6 pb-14">
      {/* Barre supérieure : Filtre unique par Catégorie (+ retour & liste déroulante des dates si joueur sélectionné) */}
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3 min-w-0">
            {selectedPlayer && (
              <button
                type="button"
                onClick={handleBackToPlayers}
                className="h-11 px-4 rounded-xl bg-[#0D0D0F] hover:bg-[#1e1e26] text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 transition cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-[#FF3737]" />
                <span>Tous les joueurs</span>
              </button>
            )}

            {/* Filtre unique par Catégorie */}
            <div className="w-full sm:w-64 space-y-1.5 min-w-0">
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
                onChange={e => handleCategoryChange(e.target.value)}
                disabled={playersLoading}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-xs sm:text-sm font-bold text-[#0D0D0F] focus:outline-none focus:ring-2 focus:ring-[#FF3737]/30 transition cursor-pointer"
              >
                <option value="ALL">Toutes les catégories</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!selectedPlayer ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 text-xs font-black text-[#0D0D0F] self-start lg:self-end">
              <Users className="w-4 h-4 text-[#FF3737]" />
              <span>
                {filteredPlayers.length} joueur{filteredPlayers.length > 1 ? 's' : ''}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3 w-full lg:w-auto">
              {/* Liste déroulante des dates d'enregistrement */}
              <div className="flex-1 sm:flex-initial sm:min-w-[290px] space-y-1.5 min-w-0">
                <label
                  htmlFor="perf-saved-dates"
                  className="text-[11px] font-black uppercase tracking-wider text-[#0D0D0F] flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#FF3737]" />
                  <span>Dates d&apos;enregistrement ({sortedPlayerEvaluations.length})</span>
                </label>
                <select
                  id="perf-saved-dates"
                  value={isCreatingNew ? '' : activeEval?.id || ''}
                  onChange={e => {
                    if (e.target.value) handleSelectSavedDateEval(e.target.value);
                  }}
                  disabled={isLoadingPlayerEvals || sortedPlayerEvaluations.length === 0}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-xs sm:text-sm font-bold text-[#0D0D0F] focus:outline-none focus:ring-2 focus:ring-[#FF3737]/30 disabled:opacity-60 transition cursor-pointer"
                >
                  {isLoadingPlayerEvals ? (
                    <option value="">Chargement des dates...</option>
                  ) : sortedPlayerEvaluations.length === 0 ? (
                    <option value="">Aucune date enregistrée</option>
                  ) : (
                    <>
                      {isCreatingNew && (
                        <option value="">
                          Nouvelle saisie ({formatDateFr(filterDate)})
                        </option>
                      )}
                      {savedDateDropdownOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {canCreate && !isCreatingNew && (
                <button
                  type="button"
                  onClick={startNewEvaluation}
                  disabled={isLoadingPlayerEvals}
                  className="h-11 px-4 rounded-xl bg-[#FF3737] hover:bg-[#dc2626] text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouvelle date</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Vue 1 : Grille de tous les joueurs (Photo + Nom + Prénom + Âge) */}
      {!selectedPlayer ? (
        playersLoading ? (
          <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-12 flex items-center justify-center gap-2.5 text-xs font-black text-[#0D0D0F]">
            <Loader2 className="w-5 h-5 animate-spin text-[#FF3737]" />
            <span>Chargement des joueurs...</span>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-10 text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-[#0D0D0F] text-white flex items-center justify-center">
              <Users className="w-6 h-6 text-[#FF3737]" />
            </div>
            <h2 className="text-base font-black text-[#0D0D0F]">Aucun joueur trouvé</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Aucun joueur disponible dans cette catégorie.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredPlayers.map(player => {
              const nameInfo = getPlayerNameDisplay(player);
              const age = getPlayerAge(player);
              const cat = resolvePlayerCategory(player as PlayerWithCategory);

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => handleSelectPlayer(player)}
                  className="group rounded-3xl bg-white border border-slate-200/80 hover:border-[#FF3737] hover:shadow-lg transition-all p-4 flex flex-col items-center text-center gap-3 cursor-pointer"
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#0D0D0F] ring-2 ring-slate-100 group-hover:ring-[#FF3737]/30 transition shrink-0">
                    <img
                      src={getPlayerPhotoUrl(player)}
                      alt={nameInfo.fullName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/assets/avatar.svg';
                      }}
                    />
                  </div>

                  <div className="w-full min-w-0 space-y-0.5">
                    {nameInfo.hasSplit ? (
                      <>
                        <div className="text-xs sm:text-sm font-black uppercase tracking-tight text-[#0D0D0F] group-hover:text-[#FF3737] transition-colors truncate">
                          {nameInfo.lastName}
                        </div>
                        <div className="text-xs font-bold text-slate-600 truncate">
                          {nameInfo.firstName}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs sm:text-sm font-black uppercase tracking-tight text-[#0D0D0F] group-hover:text-[#FF3737] transition-colors line-clamp-2">
                        {nameInfo.fullName}
                      </div>
                    )}
                  </div>

                  {(age !== null || categoryFilter === 'ALL') && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-auto">
                      {age !== null && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-black text-[#0D0D0F] tabular-nums">
                          {age} ans
                        </span>
                      )}
                      {categoryFilter === 'ALL' && (
                        <span className="px-2 py-0.5 rounded-lg bg-[#0D0D0F] text-[10px] font-black text-white">
                          {cat}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )
      ) : (
        /* Vue 2 : Tableau de bord Performance du joueur sélectionné */
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
            </div>
          ) : isCreatingNew ? (
            <div className="rounded-2xl bg-[#0D0D0F] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF3737] text-white text-[11px] font-black uppercase tracking-wider shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nouvelle performance</span>
                </span>
                {activeSet && (
                  <span className="px-2.5 py-1 rounded-lg bg-[#1C1C22] text-white/85 text-[11px] font-bold">
                    {activeSet.name}
                  </span>
                )}
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-bold text-white/85">
                <span>Date :</span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="h-9 px-3 rounded-xl bg-[#1C1C22] border border-white/15 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#FF3737]/50"
                />
              </label>
            </div>
          ) : (
            <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-8 sm:p-10 text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden bg-[#0D0D0F] ring-2 ring-slate-100 shadow-sm">
                <img
                  src={getPlayerPhotoUrl(selectedPlayer)}
                  alt={selectedPlayerName?.fullName || selectedPlayer.full_name}
                  className="w-full h-full object-cover"
                  onError={e => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/assets/avatar.svg';
                  }}
                />
              </div>
              <div className="space-y-1 max-w-lg mx-auto">
                <h2 className="text-base sm:text-lg font-black text-[#0D0D0F]">
                  {selectedPlayerName?.hasSplit
                    ? `${selectedPlayerName.lastName} ${selectedPlayerName.firstName}`
                    : selectedPlayer.full_name}
                </h2>
                <p className="text-xs font-bold text-slate-500">
                  {[
                    selectedPlayer.position || 'Poste non défini',
                    selectedPlayerAge !== null ? `${selectedPlayerAge} ans` : null,
                    selectedPlayerCategory,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p className="text-xs sm:text-sm text-slate-600 pt-2">
                  Aucune performance enregistrée pour ce joueur pour le moment.
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
          )}

          {/* Espace 2 Colonnes : 4 Piliers en Onglets + Critères à gauche | Radar à droite */}
          {!isLoadingPlayerEvals && showEditorWorkspace && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* COLONNE GAUCHE : 4 ONGLETS PILIER & CRITÈRES MÉTRIQUES PERF. JOUEUR */}
              <div className="lg:col-span-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-5 min-w-0">
                {/* En-tête Joueur (Photo, Nom & Prénom, Âge, Poste) & Note Globale */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={getPlayerPhotoUrl(selectedPlayer)}
                      alt={selectedPlayerName?.fullName || selectedPlayer.full_name}
                      className="w-16 h-16 rounded-2xl object-cover bg-[#0D0D0F] border border-slate-200/80 shadow-xs shrink-0"
                      onError={e => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/assets/avatar.svg';
                      }}
                    />
                    <div className="min-w-0 space-y-0.5">
                      <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-[#0D0D0F] truncate">
                        {selectedPlayerName?.hasSplit
                          ? `${selectedPlayerName.lastName} ${selectedPlayerName.firstName}`
                          : selectedPlayer.full_name}
                      </h2>
                      <p className="text-xs font-bold text-slate-600 truncate">
                        {[
                          activePosition
                            ? `${activePosition.emoji} ${getMetricPositionFrenchName(activePosition)}`
                            : selectedPlayer.position || 'Poste non défini',
                          selectedPlayerAge !== null ? `${selectedPlayerAge} ans` : null,
                          selectedPlayerCategory,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
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

                {selectablePositions.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-[#FF3737]" />
                      <span>Choix du poste (Métriques Perf. Joueur)</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectablePositions.map(pos => {
                        const isActive = activePosition?.code === pos.code;
                        return (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => {
                              if (isActive) return;
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

              {/* COLONNE DROITE : RADAR EN TEMPS RÉEL (SANS COURBE D'ÉVOLUTION) */}
              <div className="lg:col-span-6 min-w-0">
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
                  height={460}
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
