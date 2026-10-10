import React, { useState } from 'react';
import {
  Award,
  Search,
  Filter,
  Plus,
  TrendingUp,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Trash2,
  X,
  Check,
  Flame,
  Zap,
  Target
} from 'lucide-react';
import type { PlayerTrainingEvaluation, TrainingSession } from '../types/training';

interface TrainingEvaluationsViewProps {
  evaluations: PlayerTrainingEvaluation[];
  sessions: TrainingSession[];
  onSaveEvaluation: (evaluation: Omit<PlayerTrainingEvaluation, 'id'>) => Promise<any>;
  onDeleteEvaluation: (id: string) => Promise<any>;
}

export const TrainingEvaluationsView: React.FC<TrainingEvaluationsViewProps> = ({
  evaluations,
  sessions,
  onSaveEvaluation,
  onDeleteEvaluation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [playerFilter, setPlayerFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [isNewEvalModalOpen, setIsNewEvalModalOpen] = useState(false);
  const [selectedEvaluationForDetail, setSelectedEvaluationForDetail] = useState<PlayerTrainingEvaluation | null>(null);

  // New Eval Form State
  const [formPlayerName, setFormPlayerName] = useState('Amine Zouhair');
  const [formPlayerId, setFormPlayerId] = useState('p-1');
  const [formSessionId, setFormSessionId] = useState(sessions[0]?.id || '');
  const [formEvaluator, setFormEvaluator] = useState('Jamal Sellami');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTech, setFormTech] = useState(8);
  const [formTac, setFormTac] = useState(7.5);
  const [formPhy, setFormPhy] = useState(8);
  const [formMen, setFormMen] = useState(8.5);
  const [formNotes, setFormNotes] = useState('');
  const [formStrengths, setFormStrengths] = useState('Excellente orientation à la prise de balle, vision périphérique');
  const [formImprovements, setFormImprovements] = useState('Gagner en régularité sur les replis défensifs');

  // Filter evaluations
  const filteredEvaluations = evaluations.filter(ev => {
    if (playerFilter !== 'all' && ev.player_name !== playerFilter) return false;
    if (sessionFilter !== 'all' && ev.session_id !== sessionFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchPlayer = ev.player_name.toLowerCase().includes(q);
      const matchEval = ev.evaluator_name.toLowerCase().includes(q);
      const matchNotes = ev.notes?.toLowerCase().includes(q);
      if (!matchPlayer && !matchEval && !matchNotes) return false;
    }
    return true;
  });

  const uniquePlayers = Array.from(new Set(evaluations.map(e => e.player_name)));

  // Global pillars average
  const avgTech = evaluations.length > 0
    ? (evaluations.reduce((acc, e) => acc + e.technical_score, 0) / evaluations.length).toFixed(1)
    : '7.8';
  const avgTac = evaluations.length > 0
    ? (evaluations.reduce((acc, e) => acc + e.tactical_score, 0) / evaluations.length).toFixed(1)
    : '7.4';
  const avgPhy = evaluations.length > 0
    ? (evaluations.reduce((acc, e) => acc + e.physical_score, 0) / evaluations.length).toFixed(1)
    : '8.1';
  const avgMen = evaluations.length > 0
    ? (evaluations.reduce((acc, e) => acc + e.mental_score, 0) / evaluations.length).toFixed(1)
    : '8.3';

  const handleCreateEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    const globalScore = Number(((formTech + formTac + formPhy + formMen) / 4).toFixed(1));
    const targetSession = sessions.find(s => s.id === formSessionId);

    await onSaveEvaluation({
      player_id: formPlayerId,
      player_name: formPlayerName,
      session_id: formSessionId,
      session_name: targetSession?.name || 'Séance d\'entraînement',
      evaluation_date: formDate,
      evaluator_name: formEvaluator,
      technical_score: formTech,
      tactical_score: formTac,
      physical_score: formPhy,
      mental_score: formMen,
      global_score: globalScore,
      notes: formNotes,
      strengths: formStrengths.split(',').map(s => s.trim()).filter(Boolean),
      improvements: formImprovements.split(',').map(s => s.trim()).filter(Boolean),
      tags: ['Séance FUS', targetSession?.session_type || 'Tactique']
    });

    setIsNewEvalModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 4 Pillars Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              1. Technique
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {avgTech} <span className="text-xs font-normal text-slate-400">/10</span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Moyenne club
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold text-base border border-emerald-200 dark:border-emerald-800">
            ⚽
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              2. Tactique
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {avgTac} <span className="text-xs font-normal text-slate-400">/10</span>
            </div>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
              Moyenne club
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold text-base border border-blue-200 dark:border-blue-800">
            🧠
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              3. Physique
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {avgPhy} <span className="text-xs font-normal text-slate-400">/10</span>
            </div>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
              Moyenne club
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold text-base border border-amber-200 dark:border-amber-800">
            ⚡
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              4. Mental
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {avgMen} <span className="text-xs font-normal text-slate-400">/10</span>
            </div>
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
              Moyenne club
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold text-base border border-purple-200 dark:border-purple-800">
            🔥
          </div>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par joueur ou évaluateur..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <button
            onClick={() => setIsNewEvalModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center gap-1.5 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Nouvelle Évaluation 4 Piliers
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            Filtres :
          </div>

          <select
            value={playerFilter}
            onChange={e => setPlayerFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="all">Tous les joueurs ({uniquePlayers.length})</option>
            {uniquePlayers.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select
            value={sessionFilter}
            onChange={e => setSessionFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="all">Toutes les séances</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.name} ({s.session_date})</option>)}
          </select>

          {(searchTerm || playerFilter !== 'all' || sessionFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setPlayerFilter('all');
                setSessionFilter('all');
              }}
              className="font-bold text-rose-600 dark:text-rose-400 hover:underline ml-auto"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Evaluations Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-black text-slate-900 dark:text-white text-sm">
            Historique des Évaluations ({filteredEvaluations.length})
          </h3>
          <span className="text-xs text-slate-400">
            Notes sur 10 pondérées automatiquement
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Joueur & Date</th>
                <th className="p-4">Séance & Staff</th>
                <th className="p-4 text-center">Technique</th>
                <th className="p-4 text-center">Tactique</th>
                <th className="p-4 text-center">Physique</th>
                <th className="p-4 text-center">Mental</th>
                <th className="p-4 text-center">Score Global</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredEvaluations.map(item => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition cursor-pointer"
                  onClick={() => setSelectedEvaluationForDetail(item)}
                >
                  <td className="p-4">
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      {item.player_name}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {item.evaluation_date}
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="text-slate-800 dark:text-slate-200 font-semibold line-clamp-1">
                      {item.session_name || "Entraînement régulier"}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Évaluateur : {item.evaluator_name}
                    </div>
                  </td>

                  <td className="p-4 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black border border-emerald-200 dark:border-emerald-800">
                      {item.technical_score}
                    </span>
                  </td>

                  <td className="p-4 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black border border-blue-200 dark:border-blue-800">
                      {item.tactical_score}
                    </span>
                  </td>

                  <td className="p-4 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-black border border-amber-200 dark:border-amber-800">
                      {item.physical_score}
                    </span>
                  </td>

                  <td className="p-4 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-black border border-purple-200 dark:border-purple-800">
                      {item.mental_score}
                    </span>
                  </td>

                  <td className="p-4 text-center">
                    <span className="inline-block px-3 py-1 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-black text-sm shadow-xs">
                      {item.global_score} / 10
                    </span>
                  </td>

                  <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        if (window.confirm("Supprimer cette évaluation ?")) {
                          onDeleteEvaluation(item.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                      title="Supprimer l'évaluation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW EVALUATION MODAL */}
      {isNewEvalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-b border-emerald-800/40 relative flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">
                  Fiche de notation
                </span>
                <h3 className="text-xl font-black text-white">
                  Nouvelle Évaluation 4 Piliers
                </h3>
              </div>
              <button
                onClick={() => setIsNewEvalModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvaluation} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nom du joueur *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPlayerName}
                    onChange={e => setFormPlayerName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Séance associée
                  </label>
                  <select
                    value={formSessionId}
                    onChange={e => setFormSessionId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  >
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.session_date})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Évaluateur / Coach *
                  </label>
                  <input
                    type="text"
                    required
                    value={formEvaluator}
                    onChange={e => setFormEvaluator(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Date de l'évaluation *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              {/* 4 Pillars Sliders */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                  Notes des 4 Piliers (1 à 10)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="flex justify-between font-bold text-emerald-600 mb-1">
                      <span>⚽ 1. Technique</span>
                      <span>{formTech} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={formTech}
                      onChange={e => setFormTech(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-blue-600 mb-1">
                      <span>🧠 2. Tactique</span>
                      <span>{formTac} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={formTac}
                      onChange={e => setFormTac(parseFloat(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-amber-600 mb-1">
                      <span>⚡ 3. Physique</span>
                      <span>{formPhy} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={formPhy}
                      onChange={e => setFormPhy(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-purple-600 mb-1">
                      <span>🔥 4. Mental</span>
                      <span>{formMen} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={formMen}
                      onChange={e => setFormMen(parseFloat(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Moyenne globale automatique :</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    {((formTech + formTac + formPhy + formMen) / 4).toFixed(1)} / 10
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Points forts observés
                </label>
                <input
                  type="text"
                  value={formStrengths}
                  onChange={e => setFormStrengths(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Axes d'amélioration prioritaires
                </label>
                <input
                  type="text"
                  value={formImprovements}
                  onChange={e => setFormImprovements(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Commentaires détaillés du coach
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Notes complémentaires sur le comportement, l'écoute et l'intensité..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewEvalModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Enregistrer l'évaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL EVALUATION POPUP */}
      {selectedEvaluationForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-b border-emerald-800/40 relative flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">
                  Bilan Évaluation 4 Piliers
                </span>
                <h3 className="text-2xl font-black text-white">{selectedEvaluationForDetail.player_name}</h3>
                <span className="text-xs text-slate-300">
                  {selectedEvaluationForDetail.evaluation_date} • Par {selectedEvaluationForDetail.evaluator_name}
                </span>
              </div>
              <button
                onClick={() => setSelectedEvaluationForDetail(null)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Pillar Score Bars */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-emerald-600">⚽ Technique</span>
                    <span className="text-slate-800 dark:text-white">{selectedEvaluationForDetail.technical_score} / 10</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${selectedEvaluationForDetail.technical_score * 10}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-blue-600">🧠 Tactique</span>
                    <span className="text-slate-800 dark:text-white">{selectedEvaluationForDetail.tactical_score} / 10</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${selectedEvaluationForDetail.tactical_score * 10}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-amber-600">⚡ Physique</span>
                    <span className="text-slate-800 dark:text-white">{selectedEvaluationForDetail.physical_score} / 10</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${selectedEvaluationForDetail.physical_score * 10}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-purple-600">🔥 Mental</span>
                    <span className="text-slate-800 dark:text-white">{selectedEvaluationForDetail.mental_score} / 10</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${selectedEvaluationForDetail.mental_score * 10}%` }}></div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-500">Note Globale FUS :</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {selectedEvaluationForDetail.global_score} / 10
                  </span>
                </div>
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-400 block mb-1">
                    Points forts
                  </span>
                  <ul className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                    {selectedEvaluationForDetail.strengths?.map((s, i) => (
                      <li key={i}>✓ {s}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <span className="text-[11px] font-black uppercase text-amber-700 dark:text-amber-400 block mb-1">
                    Axes d'amélioration
                  </span>
                  <ul className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                    {selectedEvaluationForDetail.improvements?.map((im, i) => (
                      <li key={i}>⚡ {im}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {selectedEvaluationForDetail.notes && (
                <div>
                  <span className="text-xs font-bold text-slate-500 block mb-1">Commentaires du coach</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    {selectedEvaluationForDetail.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedEvaluationForDetail(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
