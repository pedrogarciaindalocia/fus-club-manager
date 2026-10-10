import React from 'react';
import { Calendar, Plus, Dumbbell, Users, Activity, TrendingUp, Sparkles, Clock, MapPin } from 'lucide-react';
import type { TrainingSession, PlayerTrainingLoad } from '../types/training';

interface TrainingsHeaderProps {
  sessions: TrainingSession[];
  loads: PlayerTrainingLoad[];
  onOpenNewSessionModal: () => void;
  onOpenNewExerciseModal: () => void;
}

export const TrainingsHeader: React.FC<TrainingsHeaderProps> = ({
  sessions,
  loads,
  onOpenNewSessionModal,
  onOpenNewExerciseModal,
}) => {
  // Compute KPIs
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === 'terminee').length;

  const totalCalled = sessions.reduce((acc, s) => acc + (s.called_players_count || 0), 0);
  const totalPresent = sessions.reduce((acc, s) => acc + (s.present_players_count || 0), 0);
  const attendanceRate = totalCalled > 0 ? Math.round((totalPresent / totalCalled) * 100) : 92;

  const avgLoad = loads.length > 0
    ? Math.round(loads.reduce((acc, l) => acc + l.training_load, 0) / loads.length)
    : 480;

  // Next upcoming session
  const upcomingSessions = sessions
    .filter(s => s.status === 'planifiee' || s.status === 'en_cours')
    .sort((a, b) => new Date(a.session_date + 'T' + a.start_time).getTime() - new Date(b.session_date + 'T' + b.start_time).getTime());
  const nextSession = upcomingSessions[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Premium Hero Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl text-white shadow-xl relative overflow-hidden border border-emerald-800/40">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            <Sparkles className="w-4 h-4" />
            <span>FUS ACADÉMIE & PRO • HUB DES ENTRAÎNEMENTS</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-100 flex items-center gap-2 sm:gap-3">
            ⚽ Gestion des Entraînements
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Planification du calendrier, conception des séances tactiques et physiques, suivi des présences,
            évaluations 4 piliers et gestion de la charge d'entraînement (RPE × Durée).
          </p>

          {nextSession && (
            <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-300">
              <span className="bg-emerald-500/20 text-emerald-300 font-semibold px-2.5 sm:px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5 text-[11px] sm:text-xs">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Prochaine séance : {nextSession.name} ({nextSession.team})
              </span>
              <span className="flex items-center gap-1 text-slate-400 text-[11px] sm:text-xs">
                <Calendar className="w-3.5 h-3.5 shrink-0" /> {nextSession.session_date} à {nextSession.start_time}
              </span>
              <span className="flex items-center gap-1 text-slate-400 text-[11px] sm:text-xs">
                <MapPin className="w-3.5 h-3.5 shrink-0" /> {nextSession.pitch}
              </span>
            </div>
          )}
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          <button
            onClick={onOpenNewExerciseModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 font-semibold text-xs sm:text-sm transition-all duration-200 shadow-sm hover:shadow active:scale-95"
          >
            <Dumbbell className="w-4 h-4 text-emerald-400" />
            <span>Nouvel Exercice</span>
          </button>
          <button
            onClick={onOpenNewSessionModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-900/40 hover:shadow-emerald-900/60 transition-all duration-200 active:scale-95 border border-emerald-400/30"
          >
            <Plus className="w-4 h-4" />
            <span>Planifier Séance</span>
          </button>
        </div>
      </div>

      {/* Quick Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
              {totalSessions}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              Séances au total ({completedSessions} term.)
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
              {attendanceRate}%
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              Taux d'assiduité moyen
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/40">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
              {avgLoad} <span className="text-xs font-normal text-slate-400">u.a.</span>
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              Charge moyenne (RPE×min)
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800/40">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
              4 Piliers
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              Tech / Tac / Phy / Men
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
