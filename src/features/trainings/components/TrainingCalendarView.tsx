import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Filter,
  Flame,
  CheckCircle,
  Play,
  Layers,
  Target
} from 'lucide-react';
import type { TrainingSession, SessionStatus, SessionType } from '../types/training';

interface TrainingCalendarViewProps {
  sessions: TrainingSession[];
  onSelectSession: (session: TrainingSession) => void;
  onOpenNewSessionModal: () => void;
  onOpenEditModal: (session: TrainingSession) => void;
  onDeleteSession: (id: string) => Promise<any>;
}

export const TrainingCalendarView: React.FC<TrainingCalendarViewProps> = ({
  sessions,
  onSelectSession,
  onOpenNewSessionModal,
  onOpenEditModal,
  onDeleteSession,
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Filters
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [pitchFilter, setPitchFilter] = useState<string>('all');
  const [coachFilter, setCoachFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter sessions
  const filteredSessions = sessions.filter(s => {
    if (teamFilter !== 'all' && s.team !== teamFilter) return false;
    if (typeFilter !== 'all' && s.session_type !== typeFilter) return false;
    if (pitchFilter !== 'all' && s.pitch !== pitchFilter) return false;
    if (coachFilter !== 'all' && s.coach_name !== coachFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    return true;
  });

  // Extract unique filter choices
  const teams = Array.from(new Set(sessions.map(s => s.team).filter(Boolean)));
  const types = Array.from(new Set(sessions.map(s => s.session_type).filter(Boolean)));
  const pitches = Array.from(new Set(sessions.map(s => s.pitch).filter(Boolean)));
  const coaches = Array.from(new Set(sessions.map(s => s.coach_name).filter(Boolean)));

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(selectedDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setSelectedDate(next);
  };

  const handleNext = () => {
    const next = new Date(selectedDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const monthYearLabel = selectedDate.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric'
  });

  // Generate days for Month View
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Monday-based offset (0 = Monday, 6 = Sunday)
  let startOffset = firstDayOfMonth.getDay() - 1;
  if (startOffset === -1) startOffset = 6;

  const totalDays = lastDayOfMonth.getDate();
  const daysArray: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) {
    daysArray.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    daysArray.push(new Date(year, month, i));
  }

  const getStatusColor = (status: SessionStatus) => {
    switch (status) {
      case 'planifiee':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'en_cours':
        return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40 font-bold';
      case 'terminee':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
      case 'annulee':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar Bar & Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Mois
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                viewMode === 'day'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Jour
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              Aujourd'hui
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-sm md:text-base font-black text-slate-900 dark:text-white capitalize ml-2">
            {monthYearLabel}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewSessionModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Planifier séance
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mr-2">
          <Filter className="w-3.5 h-3.5" />
          Filtres :
        </div>

        <select
          value={teamFilter}
          onChange={e => setTeamFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
        >
          <option value="all">Toutes les équipes</option>
          {teams.map((t, i) => <option key={`team-${t}-${i}`} value={t}>{t}</option>)}
        </select>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
        >
          <option value="all">Tous types</option>
          {types.map((t, i) => <option key={`type-${t}-${i}`} value={t}>{t}</option>)}
        </select>

        <select
          value={pitchFilter}
          onChange={e => setPitchFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
        >
          <option value="all">Tous terrains</option>
          {pitches.map((p, i) => <option key={`pitch-${p}-${i}`} value={p}>{p}</option>)}
        </select>

        <select
          value={coachFilter}
          onChange={e => setCoachFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
        >
          <option value="all">Tous entraîneurs</option>
          {coaches.map((c, i) => <option key={`coach-${c}-${i}`} value={c}>{c}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
        >
          <option value="all">Tous statuts</option>
          <option value="planifiee">Planifiée</option>
          <option value="en_cours">En cours</option>
          <option value="terminee">Terminée</option>
          <option value="annulee">Annulée</option>
        </select>

        {(teamFilter !== 'all' || typeFilter !== 'all' || pitchFilter !== 'all' || coachFilter !== 'all' || statusFilter !== 'all') && (
          <button
            onClick={() => {
              setTeamFilter('all');
              setTypeFilter('all');
              setPitchFilter('all');
              setCoachFilter('all');
              setStatusFilter('all');
            }}
            className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline ml-auto"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center text-xs font-bold text-slate-500 py-3 bg-slate-50 dark:bg-slate-800/40">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mer</span>
            <span>Jeu</span>
            <span>Ven</span>
            <span>Sam</span>
            <span>Dim</span>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800">
            {daysArray.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="min-h-[110px] bg-slate-50/50 dark:bg-slate-900/30"></div>;
              }

              const dateStr = date.toISOString().split('T')[0];
              const isToday = new Date().toISOString().split('T')[0] === dateStr;
              const daySessions = filteredSessions.filter(s => s.session_date === dateStr);

              return (
                <div
                  key={dateStr}
                  className={`min-h-[120px] p-2 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40 flex flex-col justify-between ${
                    isToday ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-emerald-600 text-white font-black'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {daySessions.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        {daySessions.length} {daySessions.length > 1 ? 'séances' : 'séance'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[110px]">
                    {daySessions.map(sess => (
                      <div
                        key={sess.id}
                        onClick={() => onSelectSession(sess)}
                        className={`p-1.5 rounded-lg border text-[11px] cursor-pointer transition-all hover:scale-[1.02] shadow-xs ${getStatusColor(
                          sess.status
                        )}`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="truncate max-w-[90px]">{sess.start_time} • {sess.team}</span>
                          <span className="text-[9px] uppercase">{sess.session_type}</span>
                        </div>
                        <div className="truncate font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                          {sess.name}
                        </div>
                        <div className="text-[9px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {sess.pitch.replace('Terrain ', '')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK / DAY VIEW */}
      {(viewMode === 'week' || viewMode === 'day') && (
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Séances trouvées ({filteredSessions.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map(sess => (
              <div
                key={sess.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-emerald-500/50 shadow-sm transition space-y-3 cursor-pointer"
                onClick={() => onSelectSession(sess)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                      {sess.team} • {sess.category}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">
                      {sess.name}
                    </h4>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border ${getStatusColor(sess.status)}`}>
                    {sess.status}
                  </span>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sess.session_date} à {sess.start_time} ({sess.duration_minutes} min)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{sess.pitch}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Staff : {sess.coach_name}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-semibold text-slate-600 dark:text-slate-300">
                    {sess.session_type}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                    Détails séance →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
