import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Dumbbell,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Play,
  Check,
  Flame,
  Award,
  FileText,
  Copy,
  Trash2,
  Edit,
  Plus
} from 'lucide-react';
import type {
  TrainingSession,
  TrainingExercise,
  SessionAttendance,
  AttendanceStatus,
  PlayerTrainingEvaluation,
  IntensityLevel,
  SessionStatus
} from '../types/training';

interface SessionDetailModalProps {
  session: TrainingSession;
  allExercises: TrainingExercise[];
  attendances: SessionAttendance[];
  evaluations: PlayerTrainingEvaluation[];
  onClose: () => void;
  onUpdateSession: (id: string, updates: Partial<TrainingSession>) => Promise<any>;
  onDuplicateSession: (id: string) => Promise<any>;
  onDeleteSession: (id: string) => Promise<any>;
  onSaveAttendances: (sessionId: string, attendances: SessionAttendance[]) => Promise<any>;
  onSaveEvaluation: (evaluation: Omit<PlayerTrainingEvaluation, 'id'>) => Promise<any>;
  onOpenEditModal: (session: TrainingSession) => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  session,
  allExercises,
  attendances: initialAttendances,
  evaluations: initialEvaluations,
  onClose,
  onUpdateSession,
  onDuplicateSession,
  onDeleteSession,
  onSaveAttendances,
  onSaveEvaluation,
  onOpenEditModal,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'exercises' | 'attendance' | 'evaluations' | 'report'>('overview');
  
  // Local attendances state
  const [currentAttendances, setCurrentAttendances] = useState<SessionAttendance[]>(() => {
    if (initialAttendances && initialAttendances.length > 0) {
      return initialAttendances;
    }
    // Default mock player list if none yet
    return [
      { id: 'att-1', session_id: session.id, player_id: 'p-1', player_name: 'Amine Zouhair', position: 'Milieu Défensif', status: 'present' },
      { id: 'att-2', session_id: session.id, player_id: 'p-2', player_name: 'Youssef El Hilali', position: 'Ailier Droit', status: 'present' },
      { id: 'att-3', session_id: session.id, player_id: 'p-3', player_name: 'Hamza Regragui', position: 'Défenseur Central', status: 'present' },
      { id: 'att-4', session_id: session.id, player_id: 'p-4', player_name: 'Mehdi Benabid', position: 'Gardien', status: 'present' },
      { id: 'att-5', session_id: session.id, player_id: 'p-5', player_name: 'Ayoub Nanah', position: 'Attaquant', status: 'retard', arrival_time: '10:15', note: 'Trafic routier' },
      { id: 'att-6', session_id: session.id, player_id: 'p-6', player_name: 'Reda Jaadi', position: 'Milieu Relayeur', status: 'blesse', note: 'Gêne ischios' },
      { id: 'att-7', session_id: session.id, player_id: 'p-7', player_name: 'Soufiane El Moudane', position: 'Milieu', status: 'present' },
      { id: 'att-8', session_id: session.id, player_id: 'p-8', player_name: 'Achraf Laaziri', position: 'Latéral Gauche', status: 'excuse', note: 'Examen universitaire' }
    ];
  });

  // Local report state
  const [reportObservations, setReportObservations] = useState(session.observations || '');
  const [reportIntensity, setReportIntensity] = useState<number>(session.intensity_rpe_avg || 7);
  const [reportStatus, setReportStatus] = useState<SessionStatus>(session.status);

  // Quick evaluation state
  const [evalPlayer, setEvalPlayer] = useState<string>(currentAttendances[0]?.player_name || '');
  const [evalTech, setEvalTech] = useState<number>(8);
  const [evalTac, setEvalTac] = useState<number>(7);
  const [evalPhy, setEvalPhy] = useState<number>(8);
  const [evalMen, setEvalMen] = useState<number>(8);
  const [evalNotes, setEvalNotes] = useState<string>('');

  const sessionExercises = (session.exercises || [])
    .map(se => {
      const fullExo = allExercises.find(e => e.id === se.exercise_id);
      return {
        ...se,
        fullExo
      };
    })
    .sort((a, b) => a.order_index - b.order_index);

  const getIntensityBadge = (lvl: IntensityLevel) => {
    switch (lvl) {
      case 'faible':
        return <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-2.5 py-0.5 rounded-full text-xs font-semibold">Faible</span>;
      case 'moyenne':
        return <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-semibold">Moyenne</span>;
      case 'elevee':
        return <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2.5 py-0.5 rounded-full text-xs font-semibold">Élevée</span>;
      case 'tres_elevee':
        return <span className="bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 px-2.5 py-0.5 rounded-full text-xs font-semibold">Très élevée</span>;
    }
  };

  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'planifiee':
        return <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2.5 py-1 rounded-full text-xs font-bold">Planifiée</span>;
      case 'en_cours':
        return <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse">● En cours</span>;
      case 'terminee':
        return <span className="bg-slate-500/10 text-slate-500 border border-slate-500/20 px-2.5 py-1 rounded-full text-xs font-bold">Terminée</span>;
      case 'annulee':
        return <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2.5 py-1 rounded-full text-xs font-bold">Annulée</span>;
    }
  };

  const handleUpdateAttendanceStatus = (playerId: string, status: AttendanceStatus) => {
    setCurrentAttendances(prev =>
      prev.map(a => a.player_id === playerId ? { ...a, status } : a)
    );
  };

  const handleMarkAllPresent = () => {
    setCurrentAttendances(prev => prev.map(a => ({ ...a, status: 'present' as AttendanceStatus })));
  };

  const handleSaveAttendanceSheet = async () => {
    await onSaveAttendances(session.id, currentAttendances);
  };

  const handleSaveReport = async () => {
    await onUpdateSession(session.id, {
      status: reportStatus,
      observations: reportObservations,
      intensity_rpe_avg: reportIntensity
    });
  };

  const handleAddEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    const globalScore = Number(((evalTech + evalTac + evalPhy + evalMen) / 4).toFixed(1));
    const targetPlayer = currentAttendances.find(a => a.player_name === evalPlayer);
    await onSaveEvaluation({
      player_id: targetPlayer?.player_id || `p-${Date.now()}`,
      player_name: evalPlayer,
      session_id: session.id,
      session_name: session.name,
      evaluation_date: session.session_date,
      evaluator_name: session.coach_name,
      technical_score: evalTech,
      tactical_score: evalTac,
      physical_score: evalPhy,
      mental_score: evalMen,
      global_score: globalScore,
      notes: evalNotes,
      strengths: ['Bon engagement', 'Bonne lecture de jeu'],
      improvements: ['Prise de décision sous pression'],
      tags: ['Entraînement', session.session_type]
    });
    setEvalNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-b border-emerald-800/40 relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1 rounded-full text-xs border border-emerald-500/30">
              {session.team}
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {session.category} • {session.session_type}
            </span>
            {getIntensityBadge(session.intensity_level)}
            {getStatusBadge(session.status)}
          </div>

          <h2 className="text-2xl font-black text-white">{session.name}</h2>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-3">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-400" />
              {session.session_date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400" />
              {session.start_time} ({session.duration_minutes} min)
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-400" />
              {session.pitch}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-400" />
              Staff : {session.coach_name}
            </span>
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              RPE estimé : {session.intensity_rpe_avg || 7}/10
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-6 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 px-4 text-xs md:text-sm font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Aperçu & Objectifs
          </button>
          <button
            onClick={() => setActiveTab('exercises')}
            className={`py-3.5 px-4 text-xs md:text-sm font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'exercises'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            Exercices ({sessionExercises.length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-3.5 px-4 text-xs md:text-sm font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Présences ({currentAttendances.filter(a => a.status === 'present').length}/{currentAttendances.length})
          </button>
          <button
            onClick={() => setActiveTab('evaluations')}
            className={`py-3.5 px-4 text-xs md:text-sm font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'evaluations'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            Évaluations 4 Piliers
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`py-3.5 px-4 text-xs md:text-sm font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'report'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Bilan & Clôture
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider mb-2">
                  Objectif Principal
                </h3>
                <p className="text-slate-900 dark:text-slate-100 font-semibold text-base">
                  {session.primary_objective || "Non renseigné"}
                </p>
              </div>

              {session.secondary_objectives && session.secondary_objectives.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-3">
                    Objectifs Secondaires
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {session.secondary_objectives.map((obj, i) => (
                      <span
                        key={i}
                        className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
                      >
                        🎯 {obj}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {session.equipment_needed && session.equipment_needed.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-3">
                    Matériel & Équipement requis
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {session.equipment_needed.map((eq, i) => (
                      <span
                        key={i}
                        className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40"
                      >
                        📦 {eq}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Météo & Surface</span>
                  <div className="text-slate-800 dark:text-slate-200 font-semibold text-sm">
                    🌤️ {session.weather || "Conditions idéales (20°C, temps sec)"} • {session.pitch}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Charge théorique séance</span>
                  <div className="text-slate-800 dark:text-slate-200 font-semibold text-sm">
                    ⚡ {session.duration_minutes * (session.intensity_rpe_avg || 7)} u.a. ({session.duration_minutes} min × RPE {session.intensity_rpe_avg || 7})
                  </div>
                </div>
              </div>

              {session.observations && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                  <span className="text-xs text-amber-700 dark:text-amber-400 uppercase font-bold block mb-1">
                    Observations générales
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 text-sm">{session.observations}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXERCISES */}
          {activeTab === 'exercises' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">
                  Déroulé chronologique des ateliers ({sessionExercises.length} exercices prévus)
                </p>
                <button
                  onClick={() => onOpenEditModal(session)}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Gérer les ateliers de la séance
                </button>
              </div>

              {sessionExercises.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                  <Dumbbell className="w-12 h-12 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Aucun exercice affecté à cette séance.</p>
                  <button
                    onClick={() => onOpenEditModal(session)}
                    className="mt-3 px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow"
                  >
                    Sélectionner des exercices
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessionExercises.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-black flex items-center justify-center shrink-0 text-sm border border-emerald-200 dark:border-emerald-800">
                          {idx + 1}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                              {item.fullExo?.title || item.exercise_id}
                            </h4>
                            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full font-medium">
                              {item.fullExo?.category || 'Atelier'}
                            </span>
                            {item.pitch_zone && (
                              <span className="text-xs text-slate-400 font-medium">
                                Zone : {item.pitch_zone}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {item.fullExo?.description || item.notes || "Consignes tactiques et techniques détaillées de l'atelier."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 self-end md:self-center text-xs">
                        <div className="text-right">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">
                            ⏱️ {item.duration_minutes} min
                          </span>
                          {item.rest_minutes ? (
                            <span className="text-slate-400 block text-[11px]">
                              Repos : {item.rest_minutes} min
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pointage de l'effectif convoqué
                  </h4>
                  <p className="text-xs text-slate-500">
                    {currentAttendances.filter(a => a.status === 'present').length} présents sur {currentAttendances.length} convoqués (
                    {Math.round((currentAttendances.filter(a => a.status === 'present').length / (currentAttendances.length || 1)) * 100)}%)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMarkAllPresent}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
                  >
                    Tout Présent
                  </button>
                  <button
                    onClick={handleSaveAttendanceSheet}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Enregistrer la feuille
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Joueur</th>
                      <th className="p-3">Poste</th>
                      <th className="p-3 text-center">Statut</th>
                      <th className="p-3">Notes / Heure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {currentAttendances.map(player => (
                      <tr key={player.player_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {player.player_name}
                        </td>
                        <td className="p-3 text-slate-500">
                          {player.position}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateAttendanceStatus(player.player_id, 'present')}
                              title="Présent"
                              className={`p-1.5 rounded-lg font-bold text-xs transition ${
                                player.status === 'present'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-emerald-100 hover:text-emerald-700'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateAttendanceStatus(player.player_id, 'absent')}
                              title="Absent"
                              className={`p-1.5 rounded-lg font-bold text-xs transition ${
                                player.status === 'absent'
                                  ? 'bg-rose-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-100 hover:text-rose-700'
                              }`}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateAttendanceStatus(player.player_id, 'retard')}
                              title="En retard"
                              className={`p-1.5 rounded-lg font-bold text-xs transition ${
                                player.status === 'retard'
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-amber-100 hover:text-amber-700'
                              }`}
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateAttendanceStatus(player.player_id, 'blesse')}
                              title="Blessé"
                              className={`p-1.5 rounded-lg font-bold text-xs transition ${
                                player.status === 'blesse'
                                  ? 'bg-purple-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-purple-100 hover:text-purple-700'
                              }`}
                            >
                              <AlertCircle className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateAttendanceStatus(player.player_id, 'excuse')}
                              title="Excusé"
                              className={`p-1.5 rounded-lg font-bold text-xs transition ${
                                player.status === 'excuse'
                                  ? 'bg-slate-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              <HelpCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-slate-500 text-xs">
                          {player.arrival_time && <span className="font-semibold text-amber-600 mr-2">Arrivée: {player.arrival_time}</span>}
                          {player.note || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: EVALUATIONS */}
          {activeTab === 'evaluations' && (
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider mb-3">
                  Évaluation Express d'un Joueur (4 Piliers /10)
                </h4>
                <form onSubmit={handleAddEvaluation} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Sélectionner le joueur
                      </label>
                      <select
                        value={evalPlayer}
                        onChange={e => setEvalPlayer(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-white"
                      >
                        {currentAttendances.map(p => (
                          <option key={p.player_id} value={p.player_name}>
                            {p.player_name} ({p.position})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Tech /10</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          step="0.5"
                          value={evalTech}
                          onChange={e => setEvalTech(parseFloat(e.target.value))}
                          className="w-full px-2 py-1.5 text-center text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Tac /10</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          step="0.5"
                          value={evalTac}
                          onChange={e => setEvalTac(parseFloat(e.target.value))}
                          className="w-full px-2 py-1.5 text-center text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Phy /10</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          step="0.5"
                          value={evalPhy}
                          onChange={e => setEvalPhy(parseFloat(e.target.value))}
                          className="w-full px-2 py-1.5 text-center text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Men /10</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          step="0.5"
                          value={evalMen}
                          onChange={e => setEvalMen(parseFloat(e.target.value))}
                          className="w-full px-2 py-1.5 text-center text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Commentaires / Observations de la séance
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Excellente implication sur les phases de transition offensive..."
                      value={evalNotes}
                      onChange={e => setEvalNotes(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Moyenne calculée : {((evalTech + evalTac + evalPhy + evalMen) / 4).toFixed(1)} / 10
                    </span>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
                    >
                      Enregistrer cette évaluation
                    </button>
                  </div>
                </form>
              </div>

              {/* Already saved evaluations for this session */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">
                  Évaluations enregistrées pour cette séance
                </h4>
                {initialEvaluations.filter(e => e.session_id === session.id).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucune note enregistrée pour le moment.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {initialEvaluations
                      .filter(e => e.session_id === session.id)
                      .map(ev => (
                        <div
                          key={ev.id}
                          className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                              {ev.player_name}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              T:{ev.technical_score} • Tac:{ev.tactical_score} • P:{ev.physical_score} • M:{ev.mental_score}
                            </div>
                            {ev.notes && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{ev.notes}</p>}
                          </div>
                          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-black text-base flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                            {ev.global_score}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: REPORT & CLOSURE */}
          {activeTab === 'report' && (
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h4 className="text-sm font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                  Rapport de clôture de la séance
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Statut de la séance
                    </label>
                    <select
                      value={reportStatus}
                      onChange={e => setReportStatus(e.target.value as SessionStatus)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-white"
                    >
                      <option value="planifiee">Planifiée</option>
                      <option value="en_cours">En cours</option>
                      <option value="terminee">Terminée</option>
                      <option value="annulee">Annulée</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Intensité moyenne ressentie (RPE 1 à 10)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={reportIntensity}
                        onChange={e => setReportIntensity(parseInt(e.target.value))}
                        className="flex-1 accent-emerald-500"
                      />
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg w-10 text-right">
                        {reportIntensity}/10
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Bilan & Commentaires du Staff
                  </label>
                  <textarea
                    rows={4}
                    value={reportObservations}
                    onChange={e => setReportObservations(e.target.value)}
                    placeholder="Débriefing général de la séance, respect des consignes, niveau d'engagement physique, points à retravailler à la prochaine séance..."
                    className="w-full p-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={handleSaveReport}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Enregistrer le bilan de la séance
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDuplicateSession(session.id)}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition"
            >
              <Copy className="w-3.5 h-3.5" /> Dupliquer la séance
            </button>
            <button
              onClick={() => {
                if (window.confirm("Voulez-vous vraiment supprimer cette séance ?")) {
                  onDeleteSession(session.id);
                  onClose();
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-100 flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
            </button>
          </div>

          <div className="flex items-center gap-2">
            {session.status === 'planifiee' && (
              <button
                onClick={async () => {
                  await onUpdateSession(session.id, { status: 'en_cours' });
                  setReportStatus('en_cours');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center gap-1.5 transition"
              >
                <Play className="w-3.5 h-3.5" /> Démarrer la séance
              </button>
            )}
            <button
              onClick={() => onOpenEditModal(session)}
              className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700 dark:hover:bg-slate-600 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Edit className="w-3.5 h-3.5" /> Modifier
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
