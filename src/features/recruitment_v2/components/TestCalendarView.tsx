import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
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
} from 'lucide-react';
import { toast } from 'sonner';
import type { PlayerTest, TrialCandidate, SessionStatus, CandidateEvaluation } from '../types/recruitment';
import { RECRUITMENT_AGE_CATEGORIES, groupCategoriesByPole } from '../types/recruitment';
import { cn } from '../../../lib/utils';
import { TrialSessionPlannerForm } from './TrialSessionPlannerForm';

interface TestCalendarViewProps {
  tests: PlayerTest[];
  candidates?: TrialCandidate[];
  evaluations?: CandidateEvaluation[];
  scouts?: any[];
  isLoading?: boolean;
  onOpenNewTest: (defaultDate?: string) => void;
  onSaveBatchTests?: (tests: Omit<PlayerTest, 'id' | 'created_at' | 'updated_at'>[]) => Promise<any>;
  onUpdateTest?: (id: string, updates: Partial<PlayerTest>) => Promise<any>;
  onEditTest: (test: PlayerTest) => void;
  onDeleteTest: (id: string) => Promise<void>;
  onDeleteTests?: (ids: string[]) => Promise<void>;
  onMoveTest: (testId: string, newDate: string) => Promise<void>;
  onOpenEvaluationForTest?: (candidate: TrialCandidate, test: PlayerTest) => void;
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
  onOpenNewTest,
  onSaveBatchTests,
  onUpdateTest,
  onEditTest,
  onDeleteTest,
  onDeleteTests,
  onMoveTest,
  onOpenEvaluationForTest,
}) => {
  // Mode d'affichage
  const [viewMode, setViewMode] = useState<'calendar' | 'cards'>('calendar');

  // Navigation mois & sélection multi-jours
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [lastClickedDate, setLastClickedDate] = useState<string | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

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

  // Panneau droit (formulaire d'invitation / édition / sessions des jours sélectionnés)
  const [rightPanelTab, setRightPanelTab] = useState<'plan' | 'sessions'>('plan');
  const [panelEditingTest, setPanelEditingTest] = useState<PlayerTest | null>(null);

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

  const getTestCandidates = (test: PlayerTest): TrialCandidate[] => {
    const ids = new Set<string>([
      ...(test.candidate_ids || []),
      ...(test.candidate_id ? [test.candidate_id] : []),
    ]);
    return candidates.filter(c => ids.has(c.id));
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
  }, [tests, candidates, searchQuery, categoryFilter, typeFilter, statusFilter]);

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

  // Sessions appartenant aux jours sélectionnés
  const selectedDaysTests = useMemo(() => {
    if (selectedDates.length === 0) return [];
    const set = new Set(selectedDates);
    return filteredTests.filter(t => set.has(t.test_date));
  }, [filteredTests, selectedDates]);

  const isSplitPanelOpen = viewMode === 'calendar' && (selectedDates.length > 0 || panelEditingTest !== null);

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
    setRightPanelTab('plan');
  };

  // Clic sur une case jour (sélection multi-jours + Shift+clic pour plage jour début -> jour fin)
  const handleDayClick = (e: React.MouseEvent, formattedDate: string) => {
    setPanelEditingTest(null);
    setRightPanelTab('plan');

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
    if (selectedTestIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      if (onDeleteTests) {
        await onDeleteTests(selectedTestIds);
      } else {
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
    e.dataTransfer.setData('text/plain', testId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTestId(testId);
  };
  const handleDragEnd = () => {
    setDraggedTestId(null);
    setDragOverDate(null);
  };
  const handleDragOver = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== targetDate) setDragOverDate(targetDate);
  };
  const handleDragLeave = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    if (dragOverDate === targetDate) setDragOverDate(null);
  };
  const handleDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    setDragOverDate(null);
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
    if (viewMode === 'calendar' && onSaveBatchTests) {
      setPanelEditingTest(null);
      setRightPanelTab('plan');
      if (selectedDates.length === 0) {
        setSelectedDates([todayStr]);
        setLastClickedDate(todayStr);
      }
    } else {
      onOpenNewTest(selectedDates[0] || undefined);
    }
  };

  const handleOpenEditSession = (test: PlayerTest) => {
    if (viewMode === 'calendar' && onUpdateTest) {
      setPanelEditingTest(test);
      setRightPanelTab('plan');
    } else {
      onEditTest(test);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
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
              {filteredTests.length} session(s) programmée(s) • Cliquez sur plusieurs jours pour ouvrir le formulaire d'invitation à droite.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Mode sélection multiple pour suppression groupée */}
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

            {/* Planifier une session */}
            <button
              type="button"
              onClick={openPlannerFromHeader}
              className="px-4 py-2 rounded-2xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary/95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Planifier une Session</span>
            </button>
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
        {(isBulkSelectMode || selectedTestIds.length > 0 || (viewMode === 'cards' && filteredTests.length > 0)) && (
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
                {selectedDates.length === 0
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
                      ) : (
                        <span className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded-md bg-primary/10 text-primary flex items-center justify-center transition-opacity">
                          <Plus className="w-2.5 h-2.5" />
                        </span>
                      )}
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
                            draggable={!isBulkSelectMode}
                            onDragStart={(e) => handleDragStart(e, test.id)}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => {
                              if (e.shiftKey) return;
                              e.stopPropagation();
                              if (isBulkSelectMode) {
                                toggleSelectTest(test.id);
                              } else {
                                handleOpenEditSession(test);
                              }
                            }}
                            className={cn(
                              "p-1 rounded-xl text-[9px] font-bold border transition-all flex items-center gap-1 shadow-2xs hover:scale-[1.02]",
                              isBulkSelectMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
                              isTestChecked ? "bg-rose-600 text-white border-rose-600" : typeConfig.badge,
                              draggedTestId === test.id && "opacity-40"
                            )}
                            title={`${test.test_name} (${test.start_time || 'Horaire TBD'})`}
                          >
                            {isBulkSelectMode ? (
                              <span
                                className={cn(
                                  "w-3 h-3 rounded border flex items-center justify-center shrink-0",
                                  isTestChecked ? "bg-white text-rose-600 border-white" : "bg-white border-slate-400"
                                )}
                              >
                                {isTestChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </span>
                            ) : (
                              <GripVertical className="w-2.5 h-2.5 opacity-40 shrink-0 hidden sm:block" />
                            )}
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

          {/* COLONNE DROITE : FORMULAIRE D'INVITATION MULTI-JOURS & SESSIONS DES JOURS COCHÉS */}
          {isSplitPanelOpen && (
            <div className="lg:col-span-5 lg:sticky lg:top-4 bg-white rounded-3xl border shadow-lg overflow-hidden animate-in fade-in slide-in-from-right-3 duration-200">
              {/* En-tête Panneau Droit */}
              <div className="p-4 border-b bg-slate-50/90 flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    {panelEditingTest
                      ? `Modifier : ${panelEditingTest.test_name}`
                      : `Inviter & Planifier (${selectedDates.length} jour${selectedDates.length > 1 ? 's' : ''})`}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {panelEditingTest
                      ? `Session du ${panelEditingTest.test_date}`
                      : 'Sélectionnez les joueurs à convoquer sur ces journées'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDates([]);
                    setLastClickedDate(null);
                    setPanelEditingTest(null);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 cursor-pointer"
                  title="Fermer le panneau"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Onglets Panneau Droit (si pas en édition directe) */}
              {!panelEditingTest && (
                <div className="px-4 pt-3 flex items-center gap-2 border-b bg-white pb-2.5">
                  <button
                    type="button"
                    onClick={() => setRightPanelTab('plan')}
                    className={cn(
                      "flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      rightPanelTab === 'plan'
                        ? "bg-primary text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    )}
                  >
                    + Formulaire d'invitation
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelTab('sessions')}
                    className={cn(
                      "flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                      rightPanelTab === 'sessions'
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    )}
                  >
                    <span>Sessions prévues</span>
                    <span className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                      rightPanelTab === 'sessions' ? "bg-white/20 text-white" : "bg-white text-slate-700"
                    )}>
                      {selectedDaysTests.length}
                    </span>
                  </button>
                </div>
              )}

              {/* Contenu Panneau Droit */}
              <div className="p-4 max-h-[78vh] overflow-y-auto custom-scrollbar">
                {(panelEditingTest || rightPanelTab === 'plan') ? (
                  <TrialSessionPlannerForm
                    variant="panel"
                    selectedDates={selectedDates}
                    onSelectedDatesChange={setSelectedDates}
                    initialTest={panelEditingTest}
                    candidates={candidates}
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
                        setRightPanelTab('sessions');
                      }
                    }}
                    onCancel={panelEditingTest ? () => setPanelEditingTest(null) : undefined}
                  />
                ) : (
                  <div className="space-y-3">
                    {selectedDaysTests.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-50 border text-center space-y-2 text-xs text-slate-500">
                        <p>Aucune session programmée sur les jours cochés.</p>
                        <button
                          type="button"
                          onClick={() => setRightPanelTab('plan')}
                          className="px-3.5 py-1.5 rounded-xl bg-primary text-white font-bold text-xs cursor-pointer"
                        >
                          + Planifier sur ces {selectedDates.length} jour(s)
                        </button>
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
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelectTest(test.id)}
                                  className="mt-1 w-4 h-4 rounded border-slate-300 text-rose-600 cursor-pointer"
                                />
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
                                      {c.first_name} {c.last_name} ({c.primary_position})
                                    </button>
                                  );
                                })}
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
                                        await onDeleteTest(test.id);
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
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectTest(test.id)}
                          className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500/30 cursor-pointer"
                          aria-label={`Sélectionner ${test.test_name}`}
                        />
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
                                {c.first_name} {c.last_name} <span className="text-slate-400 font-medium">({c.primary_position})</span>
                              </button>
                            );
                          })}
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
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditTest(test)}
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
                              await onDeleteTest(test.id);
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
