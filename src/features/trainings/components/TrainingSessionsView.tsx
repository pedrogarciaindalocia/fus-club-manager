import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Flame,
  Search,
  Filter,
  Plus,
  Play,
  Copy,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  Dumbbell
} from 'lucide-react';
import type { TrainingSession, SessionStatus, SessionType, IntensityLevel } from '../types/training';

interface TrainingSessionsViewProps {
  sessions: TrainingSession[];
  onSelectSession: (session: TrainingSession) => void;
  onOpenNewSessionModal: () => void;
  onOpenEditModal: (session: TrainingSession) => void;
  onDuplicateSession: (id: string) => Promise<any>;
  onDeleteSession: (id: string) => Promise<any>;
  onStartSession: (id: string) => Promise<any>;
}

export const TrainingSessionsView: React.FC<TrainingSessionsViewProps> = ({
  sessions,
  onSelectSession,
  onOpenNewSessionModal,
  onOpenEditModal,
  onDuplicateSession,
  onDeleteSession,
  onStartSession,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [coachFilter, setCoachFilter] = useState('all');

  // Filter sessions
  const filteredSessions = sessions.filter(s => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchCoach = s.coach_name.toLowerCase().includes(q);
      const matchObj = s.primary_objective?.toLowerCase().includes(q);
      if (!matchName && !matchCoach && !matchObj) return false;
    }
    if (teamFilter !== 'all' && s.team !== teamFilter) return false;
    if (typeFilter !== 'all' && s.session_type !== typeFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (coachFilter !== 'all' && s.coach_name !== coachFilter) return false;
    return true;
  });

  const teams = Array.from(new Set(sessions.map(s => s.team)));
  const types = Array.from(new Set(sessions.map(s => s.session_type)));
  const coaches = Array.from(new Set(sessions.map(s => s.coach_name)));

  const getIntensityBadge = (lvl: IntensityLevel) => {
    switch (lvl) {
      case 'faible':
        return <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full text-[11px] font-bold">Faible</span>;
      case 'moyenne':
        return <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[11px] font-bold">Moyenne</span>;
      case 'elevee':
        return <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-full text-[11px] font-bold">Élevée</span>;
      case 'tres_elevee':
        return <span className="bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 px-2 py-0.5 rounded-full text-[11px] font-bold">Très élevée</span>;
    }
  };

  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'planifiee':
        return <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold">Planifiée</span>;
      case 'en_cours':
        return <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold animate-pulse">● En cours</span>;
      case 'terminee':
        return <span className="bg-slate-500/10 text-slate-500 border border-slate-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold">Terminée</span>;
      case 'annulee':
        return <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold">Annulée</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher une séance, entraîneur, mot-clé..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <button
            onClick={onOpenNewSessionModal}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center gap-2 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Créer une séance
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            Filtres :
          </div>

          <select
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="all">Toutes les équipes</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="all">Tous types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="all">Tous statuts</option>
            <option value="planifiee">Planifiée</option>
            <option value="en_cours">En cours</option>
            <option value="terminee">Terminée</option>
            <option value="annulee">Annulée</option>
          </select>

          <select
            value={coachFilter}
            onChange={e => setCoachFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="all">Tous entraîneurs</option>
            {coaches.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {(searchTerm || teamFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all' || coachFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setTeamFilter('all');
                setTypeFilter('all');
                setStatusFilter('all');
                setCoachFilter('all');
              }}
              className="font-bold text-rose-600 dark:text-rose-400 hover:underline ml-auto"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSessions.map(session => (
          <div
            key={session.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                    {session.team} • {session.category}
                  </span>
                  <h3
                    onClick={() => onSelectSession(session)}
                    className="font-black text-slate-900 dark:text-white text-base hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
                  >
                    {session.name}
                  </h3>
                </div>
                {getStatusBadge(session.status)}
              </div>

              {session.primary_objective && (
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  🎯 « {session.primary_objective} »
                </p>
              )}

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{session.session_date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{session.start_time} ({session.duration_minutes} min)</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{session.pitch}</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Staff : {session.coach_name}</span>
                </div>
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md text-[11px] font-bold">
                  {session.session_type}
                </span>
                {getIntensityBadge(session.intensity_level)}
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 ml-auto">
                  <Users className="w-3 h-3 text-emerald-500" />
                  {session.present_players_count || 0}/{session.called_players_count || 0} joueurs
                </span>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {session.status === 'planifiee' && (
                  <button
                    onClick={() => onStartSession(session.id)}
                    title="Démarrer la séance"
                    className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onDuplicateSession(session.id)}
                  title="Dupliquer la séance"
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onOpenEditModal(session)}
                  title="Modifier la séance"
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Supprimer cette séance ?")) {
                      onDeleteSession(session.id);
                    }
                  }}
                  title="Supprimer la séance"
                  className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => onSelectSession(session)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Eye className="w-3.5 h-3.5" /> Voir détails
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredSessions.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">Aucune séance ne correspond aux critères</h4>
          <p className="text-xs text-slate-500 mt-1">Modifiez vos filtres ou créez une nouvelle séance.</p>
          <button
            onClick={onOpenNewSessionModal}
            className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
          >
            Créer une séance
          </button>
        </div>
      )}
    </div>
  );
};
