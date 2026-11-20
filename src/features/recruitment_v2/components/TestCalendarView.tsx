import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Plus,
  Search,
  Clock,
  MapPin,
  Users,
  Trash2,
  Edit2,
  AlertCircle,
  LayoutGrid,
  List,
  GripVertical,
  Award,
  Lock,
  Swords,
  Check,
  CheckSquare,
  Square,
  X,
  AlertTriangle,
  Building2,
  Eye,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PlayerTest, TrialCandidate, SessionStatus, CandidateEvaluation } from '../types/recruitment';
import { RECRUITMENT_AGE_CATEGORIES, groupCategoriesByPole, calculateCandidateAge, resolveReportOrCandidateSurclassement } from '../types/recruitment';
import { getFrenchPositionLabel } from '../constants/scoutCriteriaByPosition';
import { cn } from '../../../lib/utils';
import { TrialSessionPlannerForm } from './TrialSessionPlannerForm';
import { PreferredFootIcon } from './PreferredFootIcon';
import {
  formatCompactFrenchDate,
  formatTestDateIntervalLabel,
  getTestCandidateIds,
  groupConsecutiveTestDateRanges,
} from '../utils/testDateIntervals';

interface TestCalendarViewProps {
  tests: PlayerTest[];
  candidates?: TrialCandidate[];
  evaluations?: CandidateEvaluation[];
  scouts?: any[];
  isLoading?: boolean;
  canManageSchedule?: boolean;
  onOpenNewTest?: (defaultDate?: string) => void;
  onSaveBatchTests?: (tests: Omit<PlayerTest, 'id' | 'created_at' | 'updated_at'>[]) => Promise<any>;
  onUpdateTest?: (id: string, updates: Partial<PlayerTest>) => Promise<any>;
  onEditTest?: (test: PlayerTest) => void;
  onDeleteTest?: (id: string) => Promise<void>;
  onDeleteTests?: (ids: string[]) => Promise<void>;
  onMoveTest?: (testId: string, newDate: string) => Promise<void>;
  onOpenEvaluationForTest?: (candidate: TrialCandidate, test: PlayerTest) => void;
  initialSelectedDates?: string[];
  initialMonthDate?: string;
  initialRightPanelTab?: 'invited' | 'plan' | 'sessions';
  focusedCandidateId?: string | null;
  defaultPlannerCandidateId?: string;
  onBack?: () => void;
  backLabel?: string;
  onOpenFullPlanning?: () => void;
  contextTitle?: string;
  contextSubtitle?: string;
  showSportingDetails?: boolean;
  onOpenCandidateDetail?: (candidate: TrialCandidate) => void;
}

const TEST_TYPE_LABELS: Record<string, { label: string; color: string; badge: string }> = {
  comprehensive: { label: 'Complète', color: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  trial_match: { label: 'Match d\'Essai', color: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  physical_test: { label: 'Test Physique', color: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  technical_session: { label: 'Séance Technique', color: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  medical_test: { label: 'Médical', color: 'bg-cyan-500', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
};

const STATUS_CONFIG: Record<SessionStatus, { label: string; badge: string }> = {
  scheduled: { label: 'Planifié', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  confirmed: { label: 'Confirmé', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  in_progress: { label: 'En Cours', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  completed: { label: 'Réalisé', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Annulé', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const DAYS_HEADER = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function getDateRangeStrings(startStr: string, endStr: string): string[] {
  const [a, b] = startStr <= endStr ? [startStr, endStr] : [endStr, startStr];
  const result: string[] = [];
  const cur = new Date(`${a}T12:00:00`);
  const end = new Date(`${b}T12:00:00`);
  let guard = 0;
  while (cur <= end && guard < 90) {
    result.push(cur.toLocaleDateString('en-CA'));
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return result;
}

export const TestCalendarView: React.FC<TestCalendarViewProps> = ({
  tests,
  candidates = [],
  evaluations = [],
  scouts = [],
  canManageSchedule = true,
  onOpenNewTest,
  onSaveBatchTests,
  onUpdateTest,
  onEditTest,
  onDeleteTest,
  onDeleteTests,
  onMoveTest,
  onOpenEvaluationForTest,
  initialSelectedDates,
  initialMonthDate,
  initialRightPanelTab,
  focusedCandidateId = null,
  defaultPlannerCandidateId,
  onBack,
  backLabel = 'Retour à la Database',
  onOpenFullPlanning,
  contextTitle,
  contextSubtitle,
  showSportingDetails = false,
  onOpenCandidateDetail,
}) => {
  // Mode d'affichage
  const [viewMode, setViewMode] = useState<'calendar' | 'cards'>('calendar');

  const resolveMonthDate = (dateStr?: string): Date => {
    if (dateStr) {
      const parsed = new Date(`${dateStr}T12:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      }
    }
    return new Date();
  };

  // Navigation mois & sélection multi-jours
  const [currentDate, setCurrentDate] = useState(() =>
    resolveMonthDate(initialMonthDate || initialSelectedDates?.[0])
  );
  const [selectedDates, setSelectedDates] = useState<string[]>(() =>
    initialSelectedDates ? [...initialSelectedDates].sort() : []
  );
  const [lastClickedDate, setLastClickedDate] = useState<string | null>(() =>
    initialSelectedDates && initialSelectedDates.length > 0
      ? initialSelectedDates[initialSelectedDates.length - 1]
      : null
  );
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // Panneau droit (joueurs invités / formulaire d'invitation / sessions des jours sélectionnés)
  const [rightPanelTab, setRightPanelTab] = useState<'invited' | 'plan' | 'sessions'>(() => {
    if (!canManageSchedule && initialRightPanelTab === 'plan') return 'invited';
    return initialRightPanelTab ?? (canManageSchedule ? 'plan' : 'invited');
  });
  const [panelEditingTest, setPanelEditingTest] = useState<PlayerTest | null>(null);

  const initialDatesKey = (initialSelectedDates || []).join(',');
  useEffect(() => {
    if (!canManageSchedule && rightPanelTab === 'plan') {
      setRightPanelTab('invited');
      setPanelEditingTest(null);
    }
  }, [canManageSchedule, rightPanelTab]);

  useEffect(() => {
    if (!initialSelectedDates) return;
    const sorted = [...initialSelectedDates].sort();
    setSelectedDates(sorted);
    setLastClickedDate(sorted.length > 0 ? sorted[sorted.length - 1] : null);
    if (initialMonthDate || sorted[0]) {
      setCurrentDate(resolveMonthDate(initialMonthDate || sorted[0]));
    }
    if (initialRightPanelTab) {
      setRightPanelTab(!canManageSchedule && initialRightPanelTab === 'plan' ? 'invited' : initialRightPanelTab);
    }
    setPanelEditingTest(null);
    setViewMode('calendar');
  }, [initialDatesKey, initialMonthDate, initialRightPanelTab, focusedCandidateId, canManageSchedule]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };
    const handleBlur = () => setIsShiftPressed(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const shiftPreviewSet = useMemo(() => {
    if (!isShiftPressed || !lastClickedDate || !hoveredDate) return new Set<string>();
    return new Set(getDateRangeStrings(lastClickedDate, hoveredDate));
  }, [isShiftPressed, lastClickedDate, hoveredDate]);

  // Sélection multiple pour suppression groupée
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Drag & Drop
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [draggedTestId, setDraggedTestId] = useState<string | null>(null);

  const candidateById = useMemo(
    () => new Map(candidates.map(c => [c.id, c])),
    [candidates]
  );

  const getTestCandidates = (test: PlayerTest): TrialCandidate[] => {
    const ids = getTestCandidateIds(test);
    return ids
      .map(id => candidateById.get(id))
      .filter((c): c is TrialCandidate => Boolean(c));
  };

  // Sessions filtrées
  const filteredTests = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tests.filter(test => {
      const testCands = getTestCandidates(test);
      const candNames = testCands.map(c => `${c.first_name} ${c.last_name}`.toLowerCase()).join(' ');

      const matchesSearch = !q ||
        test.test_name.toLowerCase().includes(q) ||
        candNames.includes(q) ||
        (test.location && test.location.toLowerCase().includes(q)) ||
        (test.match_name && test.match_name.toLowerCase().includes(q));

      const matchesCat = categoryFilter === 'ALL' || test.age_category === categoryFilter;
      const matchesType = typeFilter === 'ALL' || test.test_type === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || test.status === statusFilter;

      return matchesSearch && matchesCat && matchesType && matchesStatus;
    });
  }, [tests, candidateById, searchQuery, categoryFilter, typeFilter, statusFilter]);

  // Grille du calendrier mensuel
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

    const days: { date: Date; isCurrentMonth: boolean; formattedDate: string }[] = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        formattedDate: d.toLocaleDateString('en-CA'),
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        formattedDate: d.toLocaleDateString('en-CA'),
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        formattedDate: d.toLocaleDateString('en-CA'),
      });
    }

    return days;
  }, [currentDate]);

  const todayStr = new Date().toLocaleDateString('en-CA');

  const renderCandidateSportingBadges = (cand: TrialCandidate, compact = false) => {
    if (!showSportingDetails) return null;
    const surclassInfo = resolveReportOrCandidateSurclassement({
      ageCategory: cand.age_category,
      birthDate: cand.birth_date,
      birthYear: cand.birth_date ? Number(String(cand.birth_date).slice(0, 4)) : null,
    });
    const candEvals = evaluations
      .filter((e) => e.candidate_id === cand.id)
      .sort((a, b) => new Date(b.evaluation_date || b.created_at || 0).getTime() - new Date(a.evaluation_date || a.created_at || 0).getTime());
    const latestEval = candEvals[0];
    const footRaw = String(cand.preferred_foot || '').toLowerCase();
    const footLabel = footRaw === 'right' || footRaw === 'droit' || footRaw === 'droitier'
      ? 'Droitier'
      : footRaw === 'left' || footRaw === 'gauche' || footRaw === 'gaucher'
      ? 'Gaucher'
      : footRaw === 'both' || footRaw === 'ambidextre'
      ? 'Ambidextre'
      : cand.preferred_foot || null;
    const verdictLabels: Record<string, string> = {
      recruit_now: 'Recruter',
      invitation_test: 'Test',
      to_follow: 'À suivre',
      reject: 'Écarté',
    };
    const candAge = calculateCandidateAge(cand.birth_date);

    return (
      <div className={cn('flex flex-wrap items-center gap-1', compact ? 'pt-1' : 'pt-1.5')}>
        {compact && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold">
            {getFrenchPositionLabel(cand.primary_position)}
            {cand.secondary_position ? ` / ${getFrenchPositionLabel(cand.secondary_position)}` : ''}
            {cand.age_category ? ` · ${cand.age_category}` : ''}
            {candAge != null ? ` (${candAge} ans)` : ''}
          </span>
        )}
        {footLabel && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
            <PreferredFootIcon foot={cand.preferred_foot} className="w-3.5 h-3.5" />
            {footLabel}
          </span>
        )}
        {(cand.height_cm || cand.weight_kg) && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
            {cand.height_cm ? `${cand.height_cm} cm` : ''}
            {cand.height_cm && cand.weight_kg ? ' · ' : ''}
            {cand.weight_kg ? `${cand.weight_kg} kg` : ''}
          </span>
        )}
        {surclassInfo?.isSurclasse && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-extrabold">
            {surclassInfo.badgeLabel || 'Surclassé'}
          </span>
        )}
        {latestEval?.overall_score != null && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold">
            Score {latestEval.overall_score}/10
            {latestEval.recommendation && verdictLabels[latestEval.recommendation]
              ? ` · ${verdictLabels[latestEval.recommendation]}`
              : ''}
          </span>
        )}
      </div>
    );
  };

  // Sessions appartenant aux jours sélectionnés
  const selectedDaysTests = useMemo(() => {
    if (selectedDates.length === 0) return [];
    const set = new Set(selectedDates);
    return filteredTests.filter(t => set.has(t.test_date));
  }, [filteredTests, selectedDates]);

  // Joueurs invités agrégés pour les jours sélectionnés (joueur ciblé mis en tête)
  const invitedPlayersForSelectedDates = useMemo(() => {
    const grouped = new Map<string, { candidate: TrialCandidate; sessions: PlayerTest[] }>();

    selectedDaysTests.forEach((test) => {
      const ids = getTestCandidateIds(test);
      ids.forEach((candId) => {
        const candidate = candidateById.get(candId);
        if (!candidate) return;
        const existing = grouped.get(candId);
        if (existing) {
          if (!existing.sessions.some(s => s.id === test.id)) {
            existing.sessions.push(test);
          }
        } else {
          grouped.set(candId, { candidate, sessions: [test] });
        }
      });
    });

    const list = Array.from(grouped.values());
    list.forEach((entry) => {
      entry.sessions.sort((a, b) => {
        const dateCmp = a.test_date.localeCompare(b.test_date);
        if (dateCmp !== 0) return dateCmp;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });
    });

    list.sort((a, b) => {
      if (focusedCandidateId) {
        if (a.candidate.id === focusedCandidateId && b.candidate.id !== focusedCandidateId) return -1;
        if (b.candidate.id === focusedCandidateId && a.candidate.id !== focusedCandidateId) return 1;
      }
      const nameA = `${a.candidate.first_name} ${a.candidate.last_name}`.toLowerCase();
      const nameB = `${b.candidate.first_name} ${b.candidate.last_name}`.toLowerCase();
      return nameA.localeCompare(nameB, 'fr');
    });

    return list;
  }, [selectedDaysTests, candidateById, focusedCandidateId]);

  const focusedCandidate = useMemo(
    () => (focusedCandidateId ? candidateById.get(focusedCandidateId) || null : null),
    [focusedCandidateId, candidateById]
  );

  const selectedDatesSummary = useMemo(() => {
    const intervals = groupConsecutiveTestDateRanges(selectedDates);
    if (intervals.length === 0) return 'Aucune date sélectionnée';
    return intervals.map(formatTestDateIntervalLabel).join(' · ');
  }, [selectedDates]);

  const isSplitPanelOpen =
    viewMode === 'calendar' &&
    (selectedDates.length > 0 || panelEditingTest !== null || Boolean(onBack));

  // Navigation mois
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const tStr = now.toLocaleDateString('en-CA');
    setSelectedDates(prev => (prev.includes(tStr) ? prev : [...prev, tStr].sort()));
    setLastClickedDate(tStr);
    setPanelEditingTest(null);
    if (rightPanelTab !== 'invited' && rightPanelTab !== 'sessions') {
      setRightPanelTab(canManageSchedule ? 'plan' : 'invited');
    }
  };
  const handleTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setCurrentDate(new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1));
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA');
    setSelectedDates([tomorrowStr]);
    setLastClickedDate(tomorrowStr);
    setPanelEditingTest(null);
    if (rightPanelTab !== 'invited' && rightPanelTab !== 'sessions') {
      setRightPanelTab(canManageSchedule ? 'plan' : 'invited');
    }
  };

  // Clic sur une case jour (sélection multi-jours + Shift+clic pour plage jour début -> jour fin)
  const handleDayClick = (e: React.MouseEvent, formattedDate: string) => {
    setPanelEditingTest(null);
    if (rightPanelTab !== 'invited' && rightPanelTab !== 'sessions') {
      setRightPanelTab('plan');
    }

    if (e.shiftKey && lastClickedDate) {
      const range = getDateRangeStrings(lastClickedDate, formattedDate);
      setSelectedDates(prev => Array.from(new Set([...prev, ...range])).sort());
      setLastClickedDate(formattedDate);
      return;
    }

    setSelectedDates(prev => {
      const exists = prev.includes(formattedDate);
      const next = exists
        ? prev.filter(d => d !== formattedDate)
        : [...prev, formattedDate].sort();
      setLastClickedDate(exists ? (next[next.length - 1] ?? null) : formattedDate);
      return next;
    });
  };

  // Sélection multiple des sessions
  const toggleSelectTest = (id: string) => {
    setSelectedTestIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const visibleTestIds = useMemo(() => filteredTests.map(t => t.id), [filteredTests]);
  const isAllVisibleSelected = visibleTestIds.length > 0 && visibleTestIds.every(id => selectedTestIds.includes(id));

  const handleToggleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      const visibleSet = new Set(visibleTestIds);
      setSelectedTestIds(prev => prev.filter(id => !visibleSet.has(id)));
    } else {
      setSelectedTestIds(prev => Array.from(new Set([...prev, ...visibleTestIds])));
    }
  };

  const handleSelectTestsInSelectedDates = () => {
    const ids = selectedDaysTests.map(t => t.id);
    if (ids.length === 0) return;
    setSelectedTestIds(prev => Array.from(new Set([...prev, ...ids])));
    setIsBulkSelectMode(true);
    toast.info(`${ids.length} session(s) des jours sélectionnés cochée(s)`);
  };

  const handleConfirmBulkDelete = async () => {
    if (!canManageSchedule || selectedTestIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      if (onDeleteTests) {
        await onDeleteTests(selectedTestIds);
      } else if (onDeleteTest) {
        for (const id of selectedTestIds) {
          await onDeleteTest(id);
        }
      }
      setSelectedTestIds([]);
      setIsBulkDeleteConfirmOpen(false);
      setIsBulkSelectMode(false);
      if (panelEditingTest && selectedTestIds.includes(panelEditingTest.id)) {
        setPanelEditingTest(null);
      }
    } catch (err: any) {
      toast.error(`Erreur lors de la suppression : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, testId: string) => {
    if (!canManageSchedule) return;
    e.dataTransfer.setData('text/plain', testId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTestId(testId);
  };
  const handleDragEnd = () => {
    setDraggedTestId(null);
    setDragOverDate(null);
  };
  const handleDragOver = (e: React.DragEvent, targetDate: string) => {
    if (!canManageSchedule) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== targetDate) setDragOverDate(targetDate);
  };
  const handleDragLeave = (e: React.DragEvent, targetDate: string) => {
    if (!canManageSchedule) return;
    e.preventDefault();
    if (dragOverDate === targetDate) setDragOverDate(null);
  };
  const handleDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    setDragOverDate(null);
    if (!canManageSchedule || !onMoveTest) return;
    const testId = e.dataTransfer.getData('text/plain') || draggedTestId;
    if (!testId) return;

    const test = tests.find(t => t.id === testId);
    if (!test || test.test_date === targetDate) return;

    try {
      await onMoveTest(testId, targetDate);
      toast.success(`Session replanifiée au ${targetDate}`, { icon: '📅' });
    } catch (err: any) {
      toast.error(`Erreur lors du déplacement : ${err.message}`);
    } finally {
      setDraggedTestId(null);
    }
  };

  const monthTitle = currentDate.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const openPlannerFromHeader = () => {
    if (!canManageSchedule) return;
    if (viewMode === 'calendar' && onSaveBatchTests) {
      setPanelEditingTest(null);
      setRightPanelTab('plan');
      if (selectedDates.length === 0) {
        setSelectedDates([todayStr]);
        setLastClickedDate(todayStr);
      }
    } else {
      onOpenNewTest?.(selectedDates[0] || undefined);
    }
  };

  const handleOpenEditSession = (test: PlayerTest) => {
    if (!canManageSchedule) return;
    if (viewMode === 'calendar' && onUpdateTest) {
      setPanelEditingTest(test);
      setRightPanelTab('plan');
    } else {
      onEditTest?.(test);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ── Barre de retour contextuelle (lorsque ouvert depuis Database) ── */}
      {onBack && (
        <div className="bg-white rounded-2xl border shadow-sm px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-xs font-black cursor-pointer shrink-0 active:scale-95"
              title={backLabel}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{backLabel}</span>
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block shrink-0" />

            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-900 truncate">
                {contextTitle || 'Calendrier & Joueurs Invités'}
              </h2>
              {contextSubtitle && (
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {contextSubtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-black shrink-0">
              {invitedPlayersForSelectedDates.length} joueur{invitedPlayersForSelectedDates.length > 1 ? 's' : ''} invité{invitedPlayersForSelectedDates.length > 1 ? 's' : ''}
            </span>
            {onOpenFullPlanning && (
              <button
                type="button"
                onClick={onOpenFullPlanning}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors text-xs font-black cursor-pointer shrink-0 shadow-xs"
                title="Accéder à l'onglet Planning des Tests complet"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Planning des Tests</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Top Controls & Filter Bar ──────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-5 border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <CalendarIcon className="w-4 h-4" />
              Planning Opérationnel des Détections
            </div>
            <h2 className="text-xl font-black text-foreground tracking-tight mt-0.5">
              Sessions de Test & Convocations
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {canManageSchedule
                ? `${filteredTests.length} session(s) programmée(s) • Cliquez sur des jours du calendrier pour afficher les joueurs invités et planifier à droite.`
                : `${filteredTests.length} session(s) programmée(s) • Consultation seule (planification réservée à l'Admin / Super Admin).`}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Mode sélection multiple pour suppression groupée (Admin uniquement) */}
            {canManageSchedule && (
              <button
                type="button"
                onClick={() => {
                  setIsBulkSelectMode(prev => {
                    const next = !prev;
                    if (!next) setSelectedTestIds([]);
                    return next;
                  });
                }}
                className={cn(
                  "px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer",
                  isBulkSelectMode || selectedTestIds.length > 0
                    ? "bg-rose-50 text-rose-700 border-rose-200 shadow-2xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                )}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>
                  {isBulkSelectMode || selectedTestIds.length > 0
                    ? `Sélection (${selectedTestIds.length})`
                    : 'Sélection multiple'}
                </span>
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  viewMode === 'calendar'
                    ? "bg-white text-primary shadow-xs"
                    : "text-slate-600 hover:text-foreground"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Calendrier</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  viewMode === 'cards'
                    ? "bg-white text-primary shadow-xs"
                    : "text-slate-600 hover:text-foreground"
                )}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Liste Cartes</span>
              </button>
            </div>

            {/* Planifier une session (Admin uniquement) */}
            {canManageSchedule && (
              <button
                type="button"
                onClick={openPlannerFromHeader}
                className="px-4 py-2 rounded-2xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary/95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Planifier une Session</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t text-xs">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher joueur, test, lieu..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 font-medium outline-none focus:bg-white focus:ring-2 ring-primary/20"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 font-bold outline-none focus:bg-white focus:ring-2 ring-primary/20 cursor-pointer text-xs"
            >
              <option value="ALL">Toutes les Catégories</option>
              {(() => {
                const groups = groupCategoriesByPole(RECRUITMENT_AGE_CATEGORIES);
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
                  </>
                );
              })()}
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 font-bold outline-none focus:bg-white focus:ring-2 ring-primary/20 cursor-pointer"
            >
              <option value="ALL">Tous les Types de Test</option>
              <option value="comprehensive">Batterie Complète</option>
              <option value="trial_match">Match d'Essai</option>
              <option value="physical_test">Test Physique</option>
              <option value="technical_session">Séance Technique</option>
              <option value="medical_test">Bilan Médical</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 font-bold outline-none focus:bg-white focus:ring-2 ring-primary/20 cursor-pointer"
            >
              <option value="ALL">Tous les Statuts</option>
              <option value="scheduled">Planifié</option>
              <option value="confirmed">Confirmé</option>
              <option value="in_progress">En Cours</option>
              <option value="completed">Réalisé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
        </div>

        {/* Barre d'actions groupées (Suppression multiple des plannings) */}
        {canManageSchedule && (isBulkSelectMode || selectedTestIds.length > 0 || (viewMode === 'cards' && filteredTests.length > 0)) && (
          <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleToggleSelectAllVisible}
                className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-primary cursor-pointer"
              >
                {isAllVisibleSelected ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>
                  {isAllVisibleSelected
                    ? `Tout désélectionner (${visibleTestIds.length})`
                    : `Tout sélectionner (${visibleTestIds.length})`}
                </span>
              </button>

              {selectedDates.length > 0 && selectedDaysTests.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectTestsInSelectedDates}
                  className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px] hover:bg-amber-100 cursor-pointer"
                >
                  Cocher les {selectedDaysTests.length} session(s) des jours sélectionnés
                </button>
              )}

              {selectedTestIds.length > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-black text-[11px]">
                  {selectedTestIds.length} planning{selectedTestIds.length > 1 ? 's' : ''} sélectionné{selectedTestIds.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {selectedTestIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTestIds([])}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteConfirmOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer la sélection ({selectedTestIds.length})</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CALENDAR VIEW (SPLIT LAYOUT LORSQUE DES JOURS SONT SÉLECTIONNÉS) ─ */}
      {viewMode === 'calendar' && (
        <div className={cn("grid grid-cols-1 gap-5 items-start", isSplitPanelOpen && "lg:grid-cols-12")}>
          {/* COLONNE GAUCHE : CALENDRIER MENSUEL */}
          <div className={cn("bg-white rounded-3xl p-4 sm:p-6 border shadow-sm space-y-4", isSplitPanelOpen ? "lg:col-span-7" : "w-full")}>
            {/* Month Navigation Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                  title="Mois précédent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-base sm:text-lg font-black text-foreground capitalize min-w-[170px] text-center">
                  {monthTitle}
                </h3>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                  title="Mois suivant"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Aujourd'hui
                </button>
                <button
                  type="button"
                  onClick={handleTomorrow}
                  className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs font-bold text-amber-800 hover:bg-amber-100/80 transition-colors cursor-pointer"
                  title="Afficher les tests prévus demain"
                >
                  Demain
                </button>
                {selectedDates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDates([]);
                      setLastClickedDate(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 hover:text-rose-600 cursor-pointer"
                  >
                    Effacer ({selectedDates.length}j)
                  </button>
                )}
              </div>
            </div>

            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between gap-2 flex-wrap">
              <span>
                {!canManageSchedule ? (
                  selectedDates.length === 0
                    ? <>👁️ <strong>Mode consultation</strong> — Cliquez sur un jour (ou « Demain ») pour consulter le planning et les joueurs convoqués.</>
                    : <>📅 <strong>{selectedDates.length} jour(s) sélectionné(s)</strong> (du {selectedDates[0]} au {selectedDates[selectedDates.length - 1]}) — consultation seule.</>
                ) : selectedDates.length === 0
                  ? <>💡 Cliquez sur le jour de début, maintenez <strong>Shift</strong> et cliquez sur le jour de fin pour sélectionner toute une plage.</>
                  : <>📅 <strong>{selectedDates.length} jour(s) sélectionné(s)</strong> (du {selectedDates[0]} au {selectedDates[selectedDates.length - 1]}) — maintenez <strong>Shift + clic</strong> sur un autre jour pour étendre la plage.</>}
              </span>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400">
              {DAYS_HEADER.map(day => (
                <div key={day} className="py-1">{day}</div>
              ))}
            </div>

            {/* Calendar Grid 7 columns */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map(({ date, isCurrentMonth, formattedDate }, idx) => {
                const dayTests = filteredTests.filter(t => t.test_date === formattedDate);
                const isToday = formattedDate === todayStr;
                const isSelected = selectedDates.includes(formattedDate);
                const isShiftPreview = !isSelected && shiftPreviewSet.has(formattedDate);
                const isDropTarget = dragOverDate === formattedDate;
                const hasTests = dayTests.length > 0;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredDate(formattedDate)}
                    onMouseLeave={() => setHoveredDate(prev => (prev === formattedDate ? null : prev))}
                    onDragOver={(e) => handleDragOver(e, formattedDate)}
                    onDragLeave={(e) => handleDragLeave(e, formattedDate)}
                    onDrop={(e) => handleDrop(e, formattedDate)}
                    onClick={(e) => handleDayClick(e, formattedDate)}
                    className={cn(
                      "relative min-h-[90px] sm:min-h-[108px] p-1.5 sm:p-2 rounded-2xl border transition-all flex flex-col group cursor-pointer select-none",
                      !isCurrentMonth && "opacity-35 bg-slate-50/40 border-transparent",
                      isDropTarget && "border-emerald-500 bg-emerald-50/90 ring-4 ring-emerald-400/30 scale-[1.02] shadow-lg z-10",
                      !isDropTarget && isSelected && "border-primary bg-primary/5 ring-2 ring-primary/25 shadow-md",
                      !isDropTarget && isShiftPreview && "border-dashed border-primary bg-primary/10 ring-1 ring-primary/30",
                      !isDropTarget && !isSelected && !isShiftPreview && isToday && "border-primary/50 bg-blue-50/30 shadow-2xs",
                      !isDropTarget && !isSelected && !isShiftPreview && !isToday && hasTests && "border-slate-200 bg-white hover:border-primary/40 hover:shadow-sm",
                      !isDropTarget && !isSelected && !isShiftPreview && !isToday && !hasTests && "border-slate-100 bg-slate-50/30 hover:border-slate-200"
                    )}
                  >
                    {/* Top Day Header */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "text-[10px] sm:text-xs font-black",
                          isToday
                            ? "bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center shadow-xs"
                            : isSelected ? "text-primary" : "text-slate-700"
                        )}>
                          {date.getDate()}
                        </span>
                        {hasTests && (
                          <span className="text-[8px] font-black text-slate-500 bg-slate-100 px-1 rounded-full hidden sm:inline">
                            {dayTests.length}
                          </span>
                        )}
                      </div>

                      {isSelected ? (
                        <span className="w-4 h-4 rounded-md bg-primary text-white flex items-center justify-center shadow-2xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      ) : canManageSchedule ? (
                        <span className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded-md bg-primary/10 text-primary flex items-center justify-center transition-opacity">
                          <Plus className="w-2.5 h-2.5" />
                        </span>
                      ) : null}
                    </div>

                    {/* Sessions Chips inside Day */}
                    <div className="flex-1 space-y-1 overflow-hidden">
                      {dayTests.slice(0, 3).map((test) => {
                        const testCands = getTestCandidates(test);
                        const primaryCand = testCands[0];
                        const typeConfig = TEST_TYPE_LABELS[test.test_type] || TEST_TYPE_LABELS.comprehensive;
                        const isTestChecked = selectedTestIds.includes(test.id);

                        const chipLabel = testCands.length > 1 && primaryCand
                          ? `${primaryCand.first_name} +${testCands.length - 1}`
                          : primaryCand
                            ? `${primaryCand.first_name} ${primaryCand.last_name[0]}.`
                            : test.test_name;

                        return (
                          <div
                            key={test.id}
                            draggable={canManageSchedule && !isBulkSelectMode}
                            onDragStart={(e) => handleDragStart(e, test.id)}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => {
                              if (e.shiftKey) return;
                              e.stopPropagation();
                              if (canManageSchedule && isBulkSelectMode) {
                                toggleSelectTest(test.id);
                              } else if (canManageSchedule) {
                                handleOpenEditSession(test);
                              } else {
                                setSelectedDates([formattedDate]);
                                setLastClickedDate(formattedDate);
                                setRightPanelTab('sessions');
                              }
                            }}
                            className={cn(
                              "p-1 rounded-xl text-[9px] font-bold border transition-all flex items-center gap-1 shadow-2xs hover:scale-[1.02]",
                              canManageSchedule
                                ? (isBulkSelectMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing")
                                : "cursor-pointer",
                              isTestChecked ? "bg-rose-600 text-white border-rose-600" : typeConfig.badge,
                              draggedTestId === test.id && "opacity-40"
                            )}
                            title={`${test.test_name} (${test.start_time || 'Horaire TBD'})`}
                          >
                            {isBulkSelectMode && canManageSchedule ? (
                              <span
                                className={cn(
                                  "w-3 h-3 rounded border flex items-center justify-center shrink-0",
                                  isTestChecked ? "bg-white text-rose-600 border-white" : "bg-white border-slate-400"
                                )}
                              >
                                {isTestChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </span>
                            ) : canManageSchedule ? (
                              <GripVertical className="w-2.5 h-2.5 opacity-40 shrink-0 hidden sm:block" />
                            ) : null}
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isTestChecked ? "bg-white" : typeConfig.color)} />
                            <span className="truncate flex-1">{chipLabel}</span>
                          </div>
                        );
                      })}

                      {dayTests.length > 3 && (
                        <div className="text-[8px] font-black text-slate-400 text-center pt-0.5">
                          +{dayTests.length - 3} de plus...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLONNE DROITE : JOUEURS INVITÉS, FORMULAIRE D'INVITATION MULTI-JOURS & SESSIONS */}
          {isSplitPanelOpen && (
            <div className="lg:col-span-5 lg:sticky lg:top-4 bg-white rounded-3xl border shadow-lg overflow-hidden animate-in fade-in slide-in-from-right-3 duration-200">
              {/* En-tête Panneau Droit */}
              <div className="p-4 border-b bg-slate-50/90 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-slate-900 truncate">
                    {panelEditingTest
                      ? `Modifier : ${panelEditingTest.test_name}`
                      : rightPanelTab === 'invited'
                        ? `Joueurs invités (${invitedPlayersForSelectedDates.length})`
                        : rightPanelTab === 'sessions'
                          ? `Sessions prévues (${selectedDaysTests.length})`
                          : `Inviter & Planifier (${selectedDates.length} jour${selectedDates.length > 1 ? 's' : ''})`}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    {panelEditingTest
                      ? `Session du ${formatCompactFrenchDate(panelEditingTest.test_date)}`
                      : rightPanelTab === 'plan'
                        ? 'Sélectionnez les joueurs à convoquer sur ces journées'
                        : selectedDatesSummary}
                  </p>
                </div>
                {!onBack && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDates([]);
                      setLastClickedDate(null);
                      setPanelEditingTest(null);
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 cursor-pointer shrink-0"
                    title="Fermer le panneau"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Onglets Panneau Droit (si pas en édition directe) */}
              {!panelEditingTest && (
                <div className="px-4 pt-3 flex items-center gap-1.5 border-b bg-white pb-2.5">
                  <button
                    type="button"
                    onClick={() => setRightPanelTab('invited')}
                    className={cn(
                      "flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                      rightPanelTab === 'invited'
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    )}
                  >
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Joueurs invités</span>
                    <span className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0",
                      rightPanelTab === 'invited' ? "bg-white/20 text-white" : "bg-white text-slate-700"
                    )}>
                      {invitedPlayersForSelectedDates.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelTab('sessions')}
                    className={cn(
                      "py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1",
                      rightPanelTab === 'sessions'
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    )}
                  >
                    <span>Sessions</span>
                    <span className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                      rightPanelTab === 'sessions' ? "bg-white/20 text-white" : "bg-white text-slate-700"
                    )}>
                      {selectedDaysTests.length}
                    </span>
                  </button>
                  {canManageSchedule && (
                    <button
                      type="button"
                      onClick={() => setRightPanelTab('plan')}
                      className={cn(
                        "py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0",
                        rightPanelTab === 'plan'
                          ? "bg-primary text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                      )}
                    >
                      + Inviter
                    </button>
                  )}
                </div>
              )}

              {/* Contenu Panneau Droit */}
              <div className="p-4 max-h-[78vh] overflow-y-auto custom-scrollbar">
                {(canManageSchedule && (panelEditingTest || rightPanelTab === 'plan')) ? (
                  <TrialSessionPlannerForm
                    variant="panel"
                    selectedDates={selectedDates}
                    onSelectedDatesChange={setSelectedDates}
                    initialTest={panelEditingTest}
                    defaultCandidateId={defaultPlannerCandidateId || focusedCandidateId || undefined}
                    candidates={candidates}
                    evaluations={evaluations}
                    scouts={scouts}
                    onSaveBatch={async (testsPayload) => {
                      if (onSaveBatchTests) {
                        await onSaveBatchTests(testsPayload);
                      }
                    }}
                    onUpdate={onUpdateTest}
                    onSuccess={() => {
                      if (panelEditingTest) {
                        setPanelEditingTest(null);
                      } else {
                        setRightPanelTab(onBack ? 'invited' : 'sessions');
                      }
                    }}
                    onCancel={panelEditingTest ? () => setPanelEditingTest(null) : undefined}
                  />
                ) : rightPanelTab === 'invited' ? (
                  <div className="space-y-3">
                    {selectedDates.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-50 border text-center space-y-2 text-xs text-slate-500">
                        <p>Sélectionnez un ou plusieurs jours sur le calendrier pour afficher les joueurs invités.</p>
                      </div>
                    ) : invitedPlayersForSelectedDates.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-50 border text-center space-y-3 text-xs text-slate-500">
                        <p>
                          Aucun joueur invité sur {selectedDates.length > 1 ? 'cette période' : 'cette journée'}.
                        </p>
                        {canManageSchedule && onSaveBatchTests && (
                          <button
                            type="button"
                            onClick={() => setRightPanelTab('plan')}
                            className="px-3.5 py-2 rounded-xl bg-primary text-white font-bold text-xs cursor-pointer shadow-xs hover:bg-primary/95 transition-all"
                          >
                            {focusedCandidate
                              ? `+ Planifier un test pour ${focusedCandidate.first_name} ${focusedCandidate.last_name}`
                              : `+ Planifier sur ces ${selectedDates.length} jour(s)`}
                          </button>
                        )}
                      </div>
                    ) : (
                      invitedPlayersForSelectedDates.map(({ candidate, sessions }) => {
                        const isFocused = Boolean(focusedCandidateId && candidate.id === focusedCandidateId);
                        const candAge = calculateCandidateAge(candidate.birth_date);
                        const clubName = candidate.current_club || candidate.origin_club;

                        return (
                          <div
                            key={candidate.id}
                            className={cn(
                              "p-3.5 rounded-2xl border transition-all space-y-2.5",
                              isFocused
                                ? "bg-blue-50/70 border-blue-400 ring-2 ring-blue-400/25 shadow-sm"
                                : "bg-slate-50/70 border-slate-200 hover:bg-white"
                            )}
                          >
                            {/* En-tête Joueur Invité */}
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 text-xs font-black text-slate-600 shadow-2xs">
                                  {candidate.photo_url ? (
                                    <img
                                      src={candidate.photo_url}
                                      alt={`${candidate.first_name} ${candidate.last_name}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.currentTarget;
                                        if (!target.src.endsWith('/assets/avatar.svg')) {
                                          target.src = '/assets/avatar.svg';
                                        }
                                      }}
                                    />
                                  ) : (
                                    <span>
                                      {candidate.first_name?.[0] || ''}
                                      {candidate.last_name?.[0] || ''}
                                    </span>
                                  )}
                                </div>

                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {onOpenCandidateDetail ? (
                                      <button
                                        type="button"
                                        onClick={() => onOpenCandidateDetail(candidate)}
                                        className="font-black text-xs text-slate-900 hover:text-primary text-left cursor-pointer transition-colors truncate"
                                        title={`Ouvrir la fiche de ${candidate.first_name} ${candidate.last_name}`}
                                      >
                                        {candidate.first_name} {candidate.last_name}
                                      </button>
                                    ) : (
                                      <span className="font-black text-xs text-slate-900 truncate">
                                        {candidate.first_name} {candidate.last_name}
                                      </span>
                                    )}
                                    {isFocused && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider shrink-0">
                                        <UserCheck className="w-2.5 h-2.5" />
                                        Sélectionné
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-[11px] font-semibold text-slate-600 truncate">
                                    {getFrenchPositionLabel(candidate.primary_position)}
                                    {showSportingDetails && candidate.secondary_position ? ` / ${getFrenchPositionLabel(candidate.secondary_position)}` : ''}
                                    {candidate.age_category ? ` · ${candidate.age_category}` : ''}
                                    {candAge != null ? ` (${candAge} ans)` : ''}
                                  </p>

                                  {clubName && (
                                    <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="truncate">{clubName}</span>
                                    </p>
                                  )}

                                  {showSportingDetails && renderCandidateSportingBadges(candidate, false)}
                                </div>
                              </div>

                              {onOpenCandidateDetail && (
                                <button
                                  type="button"
                                  onClick={() => onOpenCandidateDetail(candidate)}
                                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-primary hover:text-primary text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                                  title="Consulter la fiche complète"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Fiche</span>
                                </button>
                              )}
                            </div>

                            {/* Sessions planifiées pour ce joueur sur les jours sélectionnés */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
                              {sessions.map((session) => {
                                const typeConfig = TEST_TYPE_LABELS[session.test_type] || TEST_TYPE_LABELS.comprehensive;
                                const statusConfig = STATUS_CONFIG[session.status] || STATUS_CONFIG.scheduled;
                                const canEvalThis = Boolean(onOpenEvaluationForTest && session.test_date <= todayStr);
                                const linkedEval = evaluations.find(
                                  e => e.test_id === session.id || (e.candidate_id === candidate.id && e.evaluation_date === session.test_date)
                                );

                                return (
                                  <div
                                    key={session.id}
                                    className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0", typeConfig.badge)}>
                                          {typeConfig.label}
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-800 truncate">
                                          {session.test_name}
                                        </span>
                                      </div>
                                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0", statusConfig.badge)}>
                                        {statusConfig.label}
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                                      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                                          <CalendarIcon className="w-3 h-3 text-blue-600 shrink-0" />
                                          {formatCompactFrenchDate(session.test_date)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                          {session.start_time || '09:30'} - {session.end_time || '12:00'}
                                        </span>
                                        <span className="flex items-center gap-1 truncate">
                                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                          <span className="truncate">{session.location}</span>
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        {onOpenEvaluationForTest && (
                                          canEvalThis ? (
                                            <button
                                              type="button"
                                              onClick={() => onOpenEvaluationForTest(candidate, session)}
                                              className="px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-white text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                            >
                                              <Award className="w-2.5 h-2.5" />
                                              <span>{linkedEval ? 'Modifier Éval' : 'Évaluer'}</span>
                                            </button>
                                          ) : (
                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 text-[10px] font-semibold inline-flex items-center gap-1">
                                              <Lock className="w-2.5 h-2.5" />
                                              À venir
                                            </span>
                                          )
                                        )}
                                        {canManageSchedule && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditSession(session)}
                                            className="p-1 rounded-md border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/40 cursor-pointer"
                                            title="Modifier la session"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDaysTests.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-50 border text-center space-y-2 text-xs text-slate-500">
                        <p>Aucune session programmée sur les jours cochés.</p>
                        {canManageSchedule && (
                          <button
                            type="button"
                            onClick={() => setRightPanelTab('plan')}
                            className="px-3.5 py-1.5 rounded-xl bg-primary text-white font-bold text-xs cursor-pointer"
                          >
                            + Planifier sur ces {selectedDates.length} jour(s)
                          </button>
                        )}
                      </div>
                    ) : (
                      selectedDaysTests.map((test) => {
                        const testCands = getTestCandidates(test);
                        const primaryCand = testCands[0];
                        const typeConfig = TEST_TYPE_LABELS[test.test_type] || TEST_TYPE_LABELS.comprehensive;
                        const statusConfig = STATUS_CONFIG[test.status] || STATUS_CONFIG.scheduled;
                        const linkedEval = primaryCand
                          ? evaluations.find(e => e.test_id === test.id || (e.candidate_id === primaryCand.id && e.evaluation_date === test.test_date))
                          : undefined;
                        const isChecked = selectedTestIds.includes(test.id);

                        return (
                          <div
                            key={test.id}
                            className={cn(
                              "p-3.5 rounded-2xl border transition-all space-y-2",
                              isChecked ? "bg-rose-50/50 border-rose-300" : "bg-slate-50/70 border-slate-200 hover:bg-white"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                {canManageSchedule && (
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleSelectTest(test.id)}
                                    className="mt-1 w-4 h-4 rounded border-slate-300 text-rose-600 cursor-pointer"
                                  />
                                )}
                                <div className="min-w-0">
                                  <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-md border", typeConfig.badge)}>
                                    {typeConfig.label} • {test.age_category}
                                  </span>
                                  <h5 className="font-black text-xs text-foreground mt-1">
                                    {test.test_name}
                                  </h5>
                                </div>
                              </div>
                              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0", statusConfig.badge)}>
                                {statusConfig.label}
                              </span>
                            </div>

                            {testCands.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap gap-1">
                                  {testCands.map(c => {
                                    const canEvalThis = Boolean(onOpenEvaluationForTest && test.test_date <= todayStr);
                                    return (
                                      <button
                                        key={c.id}
                                        type="button"
                                        disabled={!canEvalThis}
                                        onClick={() => canEvalThis && onOpenEvaluationForTest?.(c, test)}
                                        title={canEvalThis ? `Évaluer ${c.first_name} ${c.last_name}` : undefined}
                                        className={cn(
                                          "text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white border text-slate-700",
                                          canEvalThis && "hover:border-primary hover:text-primary cursor-pointer transition-colors"
                                        )}
                                      >
                                        {c.first_name} {c.last_name} ({getFrenchPositionLabel(c.primary_position)})
                                      </button>
                                    );
                                  })}
                                </div>
                                {showSportingDetails && testCands.map(c => (
                                  <div key={`sport-${test.id}-${c.id}`} className="pl-2 border-l-2 border-slate-200">
                                    <p className="text-[10px] font-bold text-slate-700">{c.first_name} {c.last_name}</p>
                                    {renderCandidateSportingBadges(c, true)}
                                  </div>
                                ))}
                              </div>
                            )}

                            {test.match_name && (
                              <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-900 font-semibold">
                                <Swords className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span className="truncate">{test.match_name}</span>
                              </div>
                            )}

                            <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-3">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3 text-slate-400" />
                                {test.test_date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {test.start_time || '09:30'} - {test.end_time || '12:00'}
                              </span>
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                {test.location}
                              </span>
                            </div>

                            <div className="pt-2 border-t flex items-center justify-between gap-1.5">
                              {primaryCand && onOpenEvaluationForTest ? (
                                test.test_date > todayStr ? (
                                  <div className="px-2 py-1 rounded-lg bg-slate-100 text-slate-400 border text-[10px] font-semibold flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    <span>Verrouillé ({test.test_date})</span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onOpenEvaluationForTest(primaryCand, test)}
                                    className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <Award className="w-3 h-3" />
                                    <span>{linkedEval ? 'Modifier Éval' : 'Évaluer'}</span>
                                  </button>
                                )
                              ) : <div />}

                              {canManageSchedule && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditSession(test)}
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-primary cursor-pointer"
                                    title="Modifier"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (window.confirm(`Supprimer la session "${test.test_name}" ?`)) {
                                        try {
                                          await onDeleteTest?.(test.id);
                                        } catch {
                                          // Erreur déjà remontée par la mutation React Query
                                        }
                                      }
                                    }}
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CARDS / LIST VIEW ──────────────────────────────────────────────── */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTests.length === 0 ? (
            <div className="col-span-full bg-white rounded-3xl p-12 border text-center space-y-2">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-foreground">Aucune session trouvée</h4>
              <p className="text-xs text-muted-foreground">Modifiez vos filtres ou planifiez une nouvelle session.</p>
            </div>
          ) : (
            filteredTests.map((test) => {
              const testCands = getTestCandidates(test);
              const primaryCand = testCands[0];
              const typeConfig = TEST_TYPE_LABELS[test.test_type] || TEST_TYPE_LABELS.comprehensive;
              const statusConfig = STATUS_CONFIG[test.status] || STATUS_CONFIG.scheduled;
              const isSelected = selectedTestIds.includes(test.id);

              return (
                <div
                  key={test.id}
                  className={cn(
                    "bg-white rounded-3xl p-5 border shadow-sm transition-all space-y-3 flex flex-col justify-between",
                    isSelected
                      ? "border-rose-400 ring-2 ring-rose-500/20 bg-rose-50/20"
                      : "hover:shadow-md hover:border-primary/30"
                  )}
                >
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        {canManageSchedule && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectTest(test.id)}
                            className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500/30 cursor-pointer"
                            aria-label={`Sélectionner ${test.test_name}`}
                          />
                        )}
                        <span className={cn("text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border", typeConfig.badge)}>
                          {typeConfig.label} • {test.age_category}
                        </span>
                      </div>
                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", statusConfig.badge)}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-foreground tracking-tight">
                      {test.test_name}
                    </h4>

                    {testCands.length > 0 && (
                      <div className="p-2.5 rounded-2xl bg-slate-50 border space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500">
                          <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{testCands.length} joueur{testCands.length > 1 ? 's' : ''} convoqué{testCands.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-1">
                            {testCands.map(c => {
                              const canEvalThis = Boolean(onOpenEvaluationForTest);
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  disabled={!canEvalThis}
                                  onClick={() => canEvalThis && onOpenEvaluationForTest?.(c, test)}
                                  title={canEvalThis ? `Évaluer ${c.first_name} ${c.last_name}` : undefined}
                                  className={cn(
                                    "text-[11px] font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border",
                                    canEvalThis && "hover:border-primary hover:text-primary cursor-pointer transition-colors"
                                  )}
                                >
                                  {c.first_name} {c.last_name} <span className="text-slate-400 font-medium">({getFrenchPositionLabel(c.primary_position)})</span>
                                </button>
                              );
                            })}
                          </div>
                          {showSportingDetails && testCands.map(c => (
                            <div key={`card-sport-${test.id}-${c.id}`} className="pt-1 border-t border-slate-200/70">
                              <p className="text-[10px] font-bold text-slate-700">{c.first_name} {c.last_name}</p>
                              {renderCandidateSportingBadges(c, true)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {test.match_name && (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50/80 border border-indigo-200/70 text-xs text-indigo-900 font-semibold">
                        <Swords className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">Match support : <strong>{test.match_name}</strong></span>
                      </div>
                    )}

                    <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                      <p className="flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-semibold">
                          {new Date(`${test.test_date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-slate-400">({test.start_time || '09:30'} - {test.end_time || '12:00'})</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{test.location} • {test.training_ground}</span>
                      </p>
                    </div>

                    {test.notes && (
                      <p className="text-xs p-2.5 rounded-xl bg-slate-50 text-slate-600 italic border">
                        « {test.notes} »
                      </p>
                    )}

                    {(() => {
                      const linkedEval = primaryCand
                        ? evaluations.find(e => e.test_id === test.id || (e.candidate_id === primaryCand.id && e.evaluation_date === test.test_date))
                        : undefined;
                      if (linkedEval) {
                        return (
                          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                            <span className="font-bold text-emerald-800 flex items-center gap-1">
                              <Award className="w-3.5 h-3.5 text-emerald-600" />
                              Note : {linkedEval.overall_score}/10
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-700 uppercase bg-emerald-100/80 px-2 py-0.5 rounded-md">
                              {linkedEval.verdict}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div className="p-2 rounded-xl bg-slate-100/70 border border-slate-200/60 text-[11px] text-slate-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Non encore évalué</span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="pt-3 border-t flex justify-between items-center gap-2">
                    {primaryCand && onOpenEvaluationForTest ? (
                      (() => {
                        const linkedEval = evaluations.find(e => e.test_id === test.id || (e.candidate_id === primaryCand.id && e.evaluation_date === test.test_date));
                        return (
                          <button
                            type="button"
                            onClick={() => onOpenEvaluationForTest(primaryCand, test)}
                            className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{linkedEval ? 'Modifier Évaluation' : 'Évaluer'}</span>
                          </button>
                        );
                      })()
                    ) : <div />}
                    {canManageSchedule && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEditTest?.(test)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Modifier</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Supprimer la session "${test.test_name}" ?`)) {
                              try {
                                await onDeleteTest?.(test.id);
                              } catch {
                                // Erreur déjà remontée par la mutation React Query
                              }
                            }
                          }}
                          className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── MODALE CONFIRMATION SUPPRESSION MULTIPLE ──────────────────────── */}
      {isBulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Supprimer {selectedTestIds.length} planning{selectedTestIds.length > 1 ? 's' : ''} ?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Cette action supprimera définitivement les sessions sélectionnées du planning des détections.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsBulkDeleteConfirmOpen(false)}
                disabled={isBulkDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={isBulkDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isBulkDeleting ? 'Suppression...' : `Confirmer (${selectedTestIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestCalendarView;
