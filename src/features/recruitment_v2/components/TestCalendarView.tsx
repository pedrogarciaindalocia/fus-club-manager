import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Clock,
  MapPin,
  Users,
  Shield,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
  Sparkles,
  GripVertical,
  Award,
  Lock,
  Swords,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PlayerTest, TrialCandidate, SessionStatus, CandidateEvaluation } from '../types/recruitment';
import { RECRUITMENT_AGE_CATEGORIES } from '../types/recruitment';
import { cn } from '../../../lib/utils';

interface TestCalendarViewProps {
  tests: PlayerTest[];
  candidates?: TrialCandidate[];
  evaluations?: CandidateEvaluation[];
  isLoading?: boolean;
  onOpenNewTest: (defaultDate?: string) => void;
  onEditTest: (test: PlayerTest) => void;
  onDeleteTest: (id: string) => Promise<void>;
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
  in_progress: { label: 'En Cours', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  completed: { label: 'Réalisé', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Annulé', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  postponed: { label: 'Reporté', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const DAYS_HEADER = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const TestCalendarView: React.FC<TestCalendarViewProps> = ({
  tests,
  candidates = [],
  evaluations = [],
  isLoading = false,
  onOpenNewTest,
  onEditTest,
  onDeleteTest,
  onMoveTest,
  onOpenEvaluationForTest,
}) => {
  // Current view mode
  const [viewMode, setViewMode] = useState<'calendar' | 'cards'>('calendar');

  // Calendar month state
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Drag & Drop hover state
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [draggedTestId, setDraggedTestId] = useState<string | null>(null);

  // Filtered tests
  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      const candidate = candidates.find(c => c.id === test.candidate_id);
      const candName = candidate ? `${candidate.first_name} ${candidate.last_name}` : '';
      
      const matchesSearch =
        test.test_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (test.location && test.location.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = categoryFilter === 'ALL' || test.age_category === categoryFilter;
      const matchesType = typeFilter === 'ALL' || test.test_type === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || test.status === statusFilter;

      return matchesSearch && matchesCat && matchesType && matchesStatus;
    });
  }, [tests, candidates, searchQuery, categoryFilter, typeFilter, statusFilter]);

  // Calendar grid calculation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Days in month
    const daysInMonth = lastDayOfMonth.getDate();

    // Start day (0=Sun, 1=Mon, ..., 6=Sat). We want Monday as index 0.
    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

    const days: { date: Date; isCurrentMonth: boolean; formattedDate: string }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        formattedDate: d.toLocaleDateString('en-CA'),
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        formattedDate: d.toLocaleDateString('en-CA'),
      });
    }

    // Next month padding to complete 35 or 42 grid cells
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

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now.toLocaleDateString('en-CA'));
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
    if (dragOverDate !== targetDate) {
      setDragOverDate(targetDate);
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    if (dragOverDate === targetDate) {
      setDragOverDate(null);
    }
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
      toast.success(`Session replanifiée au ${targetDate}`, {
        icon: '📅',
      });
    } catch (err: any) {
      toast.error(`Erreur lors du déplacement : ${err.message}`);
    } finally {
      setDraggedTestId(null);
    }
  };

  // Month title formatted
  const monthTitle = currentDate.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const todayStr = new Date().toLocaleDateString('en-CA');

  // Selected date sessions
  const selectedDayTests = useMemo(() => {
    if (!selectedDate) return [];
    return filteredTests.filter(t => t.test_date === selectedDate);
  }, [filteredTests, selectedDate]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ── Top Controls & Filter Bar ──────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-5 border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Header Title & Counter */}
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <CalendarIcon className="w-4 h-4" />
              Planning Opérationnel des Détections
            </div>
            <h2 className="text-xl font-black text-foreground tracking-tight mt-0.5">
              Sessions de Test & Convocations
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filteredTests.length} session(s) programmée(s) • Déplacez les sessions par glisser-déposer sur le calendrier.
            </p>
          </div>

          {/* Action Buttons: Add Session & View Mode */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
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
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
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
              onClick={() => onOpenNewTest(selectedDate || undefined)}
              className="px-4 py-2 rounded-2xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary/95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Planifier une Session</span>
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t text-xs">
          {/* Search */}
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

          {/* Catégorie */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 font-bold outline-none focus:bg-white focus:ring-2 ring-primary/20 cursor-pointer"
            >
              <option value="ALL">Toutes les Catégories</option>
              {RECRUITMENT_AGE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Type de test */}
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

          {/* Statut */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 font-bold outline-none focus:bg-white focus:ring-2 ring-primary/20 cursor-pointer"
            >
              <option value="ALL">Tous les Statuts</option>
              <option value="scheduled">Planifié</option>
              <option value="in_progress">En Cours</option>
              <option value="completed">Réalisé</option>
              <option value="postponed">Reporté</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── CALENDAR VIEW ──────────────────────────────────────────────────── */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-3xl p-4 sm:p-6 border shadow-sm space-y-4">
          {/* Month Navigation Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-700 transition-colors"
                title="Mois précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="text-base sm:text-lg font-black text-foreground capitalize min-w-[180px] text-center">
                {monthTitle}
              </h3>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-700 transition-colors"
                title="Mois suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Aujourd'hui
              </button>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Tout afficher
                </button>
              )}
            </div>
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
              const isSelected = selectedDate === formattedDate;
              const isDropTarget = dragOverDate === formattedDate;
              const hasTests = dayTests.length > 0;

              return (
                <div
                  key={idx}
                  onDragOver={(e) => handleDragOver(e, formattedDate)}
                  onDragLeave={(e) => handleDragLeave(e, formattedDate)}
                  onDrop={(e) => handleDrop(e, formattedDate)}
                  onClick={() => {
                    setSelectedDate(isSelected ? null : formattedDate);
                  }}
                  className={cn(
                    "relative min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 rounded-2xl border transition-all flex flex-col group cursor-pointer",
                    !isCurrentMonth && "opacity-35 bg-slate-50/40 border-transparent",
                    isDropTarget && "border-emerald-500 bg-emerald-50/90 ring-4 ring-emerald-400/30 scale-[1.02] shadow-lg z-10",
                    !isDropTarget && isSelected && "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md",
                    !isDropTarget && !isSelected && isToday && "border-primary/50 bg-blue-50/30 shadow-2xs",
                    !isDropTarget && !isSelected && !isToday && hasTests && "border-slate-200 bg-white hover:border-primary/40 hover:shadow-sm",
                    !isDropTarget && !isSelected && !isToday && !hasTests && "border-slate-100 bg-slate-50/30 hover:border-slate-200"
                  )}
                >
                  {/* Top Day Header: Day Number + Quick Add Button */}
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
                        <span className="text-[8px] font-black text-slate-400 bg-slate-100 px-1 rounded-full hidden sm:inline">
                          {dayTests.length}
                        </span>
                      )}
                    </div>

                    {/* Quick Add Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNewTest(formattedDate);
                      }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white flex items-center justify-center transition-all"
                      title={`Planifier un test le ${formattedDate}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Sessions Chips inside Day */}
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {dayTests.slice(0, 3).map((test) => {
                      const candidate = candidates.find(c => c.id === test.candidate_id);
                      const typeConfig = TEST_TYPE_LABELS[test.test_type] || TEST_TYPE_LABELS.comprehensive;

                      return (
                        <div
                          key={test.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, test.id)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTest(test);
                          }}
                          className={cn(
                            "p-1 rounded-xl text-[9px] font-bold border transition-all cursor-grab active:cursor-grabbing flex items-center gap-1 shadow-2xs group/chip hover:scale-[1.02]",
                            typeConfig.badge,
                            draggedTestId === test.id && "opacity-40"
                          )}
                          title={`${test.test_name} (${test.start_time || 'Horaire TBD'}) - Glisser pour changer de jour`}
                        >
                          <GripVertical className="w-2.5 h-2.5 opacity-40 shrink-0 hidden sm:block" />
                          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", typeConfig.color)} />
                          <span className="truncate flex-1">
                            {candidate ? `${candidate.first_name} ${candidate.last_name[0]}.` : test.test_name}
                          </span>
                          <span className="text-[8px] opacity-70 shrink-0 hidden md:inline">
                            {test.start_time || test.age_category}
                          </span>
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

          {/* ── Selected Day Slide / Detail Panel ───────────────────────────── */}
          {selectedDate && (
            <div className="pt-4 border-t space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-black text-foreground">
                    Sessions du {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h4>
                  <span className="text-xs font-bold text-slate-400">({selectedDayTests.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenNewTest(selectedDate)}
                  className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une Session ce jour</span>
                </button>
              </div>

              {selectedDayTests.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 border text-center text-xs text-slate-500">
                  Aucune session de test prévue pour cette date. Cliquez sur "Ajouter une Session" pour en programmer une.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedDayTests.map((test) => {
                    const candidate = candidates.find(c => c.id === test.candidate_id);
                    const typeConfig = TEST_TYPE_LABELS[test.test_type] || TEST_TYPE_LABELS.comprehensive;
                    const statusConfig = STATUS_CONFIG[test.status] || STATUS_CONFIG.scheduled;
                    const linkedEval = evaluations.find(e => e.test_id === test.id || (test.candidate_id && e.candidate_id === test.candidate_id && e.evaluation_date === test.test_date));

                    return (
                      <div
                        key={test.id}
                        className="bg-slate-50/60 hover:bg-white p-4 rounded-2xl border hover:border-primary/40 hover:shadow-md transition-all space-y-2.5"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-md border", typeConfig.badge)}>
                              {typeConfig.label} • {test.age_category}
                            </span>
                            <h5 className="font-black text-sm text-foreground mt-1 tracking-tight">
                              {test.test_name}
                            </h5>
                          </div>
                          <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0", statusConfig.badge)}>
                            {statusConfig.label}
                          </span>
                        </div>

                        {candidate && (
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-white border text-xs">
                            <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="font-bold text-slate-800">
                              {candidate.first_name} {candidate.last_name}
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              ({candidate.primary_position} • {candidate.current_club || 'Sans club'})
                            </span>
                          </div>
                        )}

                        {test.match_name && (
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50/80 border border-indigo-200/70 text-xs text-indigo-900 font-semibold">
                            <Swords className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="truncate">Match support : <strong>{test.match_name}</strong></span>
                          </div>
                        )}

                        <div className="text-[11px] text-slate-600 space-y-1">
                          <p className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{test.start_time || '09:30'} - {test.end_time || '12:00'}</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{test.location} • {test.training_ground}</span>
                          </p>
                        </div>

                        {/* Statut Évaluation liée */}
                        {linkedEval ? (
                          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                            <span className="font-bold text-emerald-800 flex items-center gap-1">
                              <Award className="w-3.5 h-3.5 text-emerald-600" />
                              Note : {linkedEval.overall_score}/10
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-700 uppercase bg-emerald-100/80 px-2 py-0.5 rounded-md">
                              {linkedEval.verdict}
                            </span>
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-xl bg-slate-100/70 border border-slate-200/60 text-[11px] text-slate-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Aucune évaluation saisie pour ce test</span>
                          </div>
                        )}

                        <div className="pt-2 border-t flex items-center justify-between gap-1.5">
                          {candidate && onOpenEvaluationForTest && (
                            test.test_date > todayStr ? (
                              <div
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed"
                                title={`Évaluation impossible avant la date du test (${test.test_date})`}
                              >
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Verrouillé ({test.test_date})</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onOpenEvaluationForTest(candidate, test)}
                                className="px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>{linkedEval ? 'Modifier Évaluation' : 'Évaluer'}</span>
                              </button>
                            )
                          )}
                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => onEditTest(test)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-primary transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Supprimer la session "${test.test_name}" ?`)) {
                                  await onDeleteTest(test.id);
                                }
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
              const candidate = candidates.find(c => c.id === test.candidate_id);
              const typeConfig = TEST_TYPE_LABELS[test.test_type] || TEST_TYPE_LABELS.comprehensive;
              const statusConfig = STATUS_CONFIG[test.status] || STATUS_CONFIG.scheduled;

              return (
                <div
                  key={test.id}
                  className="bg-white rounded-3xl p-5 border shadow-sm hover:shadow-md hover:border-primary/30 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <span className={cn("text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border", typeConfig.badge)}>
                        {typeConfig.label} • {test.age_category}
                      </span>
                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", statusConfig.badge)}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-foreground tracking-tight">
                      {test.test_name}
                    </h4>

                    {candidate && (
                      <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border text-xs">
                        <Users className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="font-bold text-slate-800">
                            {candidate.first_name} {candidate.last_name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {candidate.primary_position} • {candidate.current_club || 'Sans club'}
                          </p>
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
                          {new Date(test.test_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
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

                    {/* Statut Évaluation liée */}
                    {(() => {
                      const linkedEval = evaluations.find(e => e.test_id === test.id || (test.candidate_id && e.candidate_id === test.candidate_id && e.evaluation_date === test.test_date));
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
                    {candidate && onOpenEvaluationForTest ? (
                      (() => {
                        const linkedEval = evaluations.find(e => e.test_id === test.id || (test.candidate_id && e.candidate_id === test.candidate_id && e.evaluation_date === test.test_date));
                        return (
                          <button
                            type="button"
                            onClick={() => onOpenEvaluationForTest(candidate, test)}
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
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Modifier</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Supprimer la session "${test.test_name}" ?`)) {
                            await onDeleteTest(test.id);
                          }
                        }}
                        className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
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
  );
};

export default TestCalendarView;
