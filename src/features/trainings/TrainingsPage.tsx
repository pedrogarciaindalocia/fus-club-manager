import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  FileText,
  Dumbbell,
  Award,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { useTrainings } from './hooks/useTrainings';
import { TrainingsHeader } from './components/TrainingsHeader';
import { TrainingCalendarView } from './components/TrainingCalendarView';
import { TrainingSessionsView } from './components/TrainingSessionsView';
import { TrainingExercisesView } from './components/TrainingExercisesView';
import { TrainingEvaluationsView } from './components/TrainingEvaluationsView';
import { TrainingLoadView } from './components/TrainingLoadView';
import { SessionDetailModal } from './components/SessionDetailModal';
import { SessionFormModal } from './components/SessionFormModal';
import { ExerciseFormModal } from './components/ExerciseFormModal';
import type { TrainingSession, TrainingExercise } from './types/training';

export const TrainingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'calendar';

  const {
    sessions,
    exercises,
    attendances,
    evaluations,
    loads,
    isLoading,
    createSession,
    updateSession,
    deleteSession,
    duplicateSession,
    createExercise,
    updateExercise,
    deleteExercise,
    toggleFavoriteExercise,
    saveAttendances,
    saveEvaluation,
    deleteEvaluation,
    saveLoad,
  } = useTrainings();

  // Modals state
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<TrainingSession | null>(null);
  const [sessionToEdit, setSessionToEdit] = useState<TrainingSession | null>(null);
  const [isSessionFormOpen, setIsSessionFormOpen] = useState(false);

  const [exerciseToEdit, setExerciseToEdit] = useState<TrainingExercise | null>(null);
  const [isExerciseFormOpen, setIsExerciseFormOpen] = useState(false);

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
  };

  const handleOpenNewSession = () => {
    setSessionToEdit(null);
    setIsSessionFormOpen(true);
  };

  const handleOpenEditSession = (session: TrainingSession) => {
    setSessionToEdit(session);
    setIsSessionFormOpen(true);
  };

  const handleOpenNewExercise = () => {
    setExerciseToEdit(null);
    setIsExerciseFormOpen(true);
  };

  const handleOpenEditExercise = (exercise: TrainingExercise) => {
    setExerciseToEdit(exercise);
    setIsExerciseFormOpen(true);
  };

  const handleStartSession = async (id: string) => {
    await updateSession({ id, updates: { status: 'en_cours' } });
  };

  const handleSessionFormSubmit = async (data: any) => {
    if (sessionToEdit) {
      await updateSession({ id: sessionToEdit.id, updates: data });
    } else {
      await createSession(data);
    }
  };

  const handleExerciseFormSubmit = async (data: any) => {
    if (exerciseToEdit) {
      await updateExercise({ id: exerciseToEdit.id, updates: data });
    } else {
      await createExercise(data);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Hero Banner & KPIs */}
      <TrainingsHeader
        sessions={sessions}
        loads={loads}
        onOpenNewSessionModal={handleOpenNewSession}
        onOpenNewExerciseModal={handleOpenNewExercise}
      />

      {/* 5 Main Tabs Navigation Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-sm overflow-x-auto gap-1">
        <button
          onClick={() => handleTabChange('calendar')}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs md:text-sm font-black transition-all whitespace-nowrap ${
            currentTab === 'calendar'
              ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CalendarIcon className="w-4 h-4 text-emerald-400" />
          <span>1. 📅 Calendrier</span>
        </button>

        <button
          onClick={() => handleTabChange('sessions')}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs md:text-sm font-black transition-all whitespace-nowrap ${
            currentTab === 'sessions'
              ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-400" />
          <span>2. 📝 Séances</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 dark:bg-slate-700 text-white font-bold">
            {sessions.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('exercises')}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs md:text-sm font-black transition-all whitespace-nowrap ${
            currentTab === 'exercises'
              ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Dumbbell className="w-4 h-4 text-amber-400" />
          <span>3. 🧩 Exercices</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 dark:bg-slate-700 text-white font-bold">
            {exercises.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('evaluations')}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs md:text-sm font-black transition-all whitespace-nowrap ${
            currentTab === 'evaluations'
              ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-purple-400" />
          <span>4. ⭐ Évaluations (4 Piliers)</span>
        </button>

        <button
          onClick={() => handleTabChange('load')}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs md:text-sm font-black transition-all whitespace-nowrap ${
            currentTab === 'load'
              ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4 text-rose-400" />
          <span>5. ⚡ Charge d'entraînement</span>
        </button>
      </div>

      {/* Main Tab Views */}
      <div className="animate-in fade-in duration-150">
        {currentTab === 'calendar' && (
          <TrainingCalendarView
            sessions={sessions}
            onSelectSession={session => setSelectedSessionForDetail(session)}
            onOpenNewSessionModal={handleOpenNewSession}
            onOpenEditModal={handleOpenEditSession}
            onDeleteSession={deleteSession}
          />
        )}

        {currentTab === 'sessions' && (
          <TrainingSessionsView
            sessions={sessions}
            onSelectSession={session => setSelectedSessionForDetail(session)}
            onOpenNewSessionModal={handleOpenNewSession}
            onOpenEditModal={handleOpenEditSession}
            onDuplicateSession={duplicateSession}
            onDeleteSession={deleteSession}
            onStartSession={handleStartSession}
          />
        )}

        {currentTab === 'exercises' && (
          <TrainingExercisesView
            exercises={exercises}
            onOpenNewExerciseModal={handleOpenNewExercise}
            onOpenEditExerciseModal={handleOpenEditExercise}
            onDeleteExercise={deleteExercise}
            onToggleFavorite={toggleFavoriteExercise}
          />
        )}

        {currentTab === 'evaluations' && (
          <TrainingEvaluationsView
            evaluations={evaluations}
            sessions={sessions}
            onSaveEvaluation={saveEvaluation}
            onDeleteEvaluation={deleteEvaluation}
          />
        )}

        {currentTab === 'load' && (
          <TrainingLoadView
            loads={loads}
            sessions={sessions}
            onSaveLoad={saveLoad}
          />
        )}
      </div>

      {/* MODALS */}
      {selectedSessionForDetail && (
        <SessionDetailModal
          session={selectedSessionForDetail}
          allExercises={exercises}
          attendances={attendances.filter(a => a.session_id === selectedSessionForDetail.id)}
          evaluations={evaluations.filter(e => e.session_id === selectedSessionForDetail.id)}
          onClose={() => setSelectedSessionForDetail(null)}
          onUpdateSession={updateSession}
          onDuplicateSession={duplicateSession}
          onDeleteSession={deleteSession}
          onSaveAttendances={saveAttendances}
          onSaveEvaluation={saveEvaluation}
          onOpenEditModal={session => {
            setSelectedSessionForDetail(null);
            handleOpenEditSession(session);
          }}
        />
      )}

      {isSessionFormOpen && (
        <SessionFormModal
          sessionToEdit={sessionToEdit}
          allExercises={exercises}
          onClose={() => setIsSessionFormOpen(false)}
          onSubmit={handleSessionFormSubmit}
        />
      )}

      {isExerciseFormOpen && (
        <ExerciseFormModal
          exerciseToEdit={exerciseToEdit}
          onClose={() => setIsExerciseFormOpen(false)}
          onSubmit={handleExerciseFormSubmit}
        />
      )}
    </div>
  );
};

export default TrainingsPage;
