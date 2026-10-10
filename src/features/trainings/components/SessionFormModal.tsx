import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Dumbbell, Target, Check, Plus, Trash2 } from 'lucide-react';
import type { TrainingSession, TrainingExercise, IntensityLevel, SessionType, SessionStatus } from '../types/training';

interface SessionFormModalProps {
  sessionToEdit?: TrainingSession | null;
  allExercises: TrainingExercise[];
  onClose: () => void;
  onSubmit: (sessionData: any) => Promise<any>;
}

export const SessionFormModal: React.FC<SessionFormModalProps> = ({
  sessionToEdit,
  allExercises,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState(sessionToEdit?.name || '');
  const [team, setTeam] = useState(sessionToEdit?.team || 'Équipe Première');
  const [category, setCategory] = useState(sessionToEdit?.category || 'Senior Pro');
  const [sessionDate, setSessionDate] = useState(sessionToEdit?.session_date || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(sessionToEdit?.start_time || '10:00');
  const [durationMinutes, setDurationMinutes] = useState(sessionToEdit?.duration_minutes || 90);
  const [pitch, setPitch] = useState(sessionToEdit?.pitch || 'Terrain Annexe 1 (Herbe naturelle)');
  const [coachName, setCoachName] = useState(sessionToEdit?.coach_name || 'Jamal Sellami');
  const [sessionType, setSessionType] = useState<SessionType>(sessionToEdit?.session_type || 'Tactique');
  const [intensityLevel, setIntensityLevel] = useState<IntensityLevel>(sessionToEdit?.intensity_level || 'elevee');
  const [intensityRpeAvg, setIntensityRpeAvg] = useState(sessionToEdit?.intensity_rpe_avg || 7);
  const [primaryObjective, setPrimaryObjective] = useState(sessionToEdit?.primary_objective || '');
  const [secondaryObjectivesStr, setSecondaryObjectivesStr] = useState(sessionToEdit?.secondary_objectives?.join(', ') || '');
  const [equipmentNeededStr, setEquipmentNeededStr] = useState(sessionToEdit?.equipment_needed?.join(', ') || 'Chasubles (3 couleurs), Cônes, Ballons T5');
  const [weather, setWeather] = useState(sessionToEdit?.weather || 'Ensoleillé 21°C');
  const [status, setStatus] = useState<SessionStatus>(sessionToEdit?.status || 'planifiee');

  // Selected exercises list
  const [selectedExercises, setSelectedExercises] = useState<Array<{ exercise_id: string; duration_minutes: number; rest_minutes?: number; pitch_zone?: string }>>(() => {
    if (sessionToEdit?.exercises && sessionToEdit.exercises.length > 0) {
      return sessionToEdit.exercises.map(e => ({
        exercise_id: e.exercise_id,
        duration_minutes: e.duration_minutes,
        rest_minutes: e.rest_minutes,
        pitch_zone: e.pitch_zone
      }));
    }
    return [];
  });

  const [pickedExerciseId, setPickedExerciseId] = useState<string>(allExercises[0]?.id || '');
  const [pickedDuration, setPickedDuration] = useState<number>(20);

  const handleAddExerciseToSession = () => {
    if (!pickedExerciseId) return;
    setSelectedExercises(prev => [
      ...prev,
      {
        exercise_id: pickedExerciseId,
        duration_minutes: pickedDuration,
        rest_minutes: 3,
        pitch_zone: 'Moitié de terrain'
      }
    ]);
  };

  const handleRemoveExercise = (index: number) => {
    setSelectedExercises(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const secObjs = secondaryObjectivesStr.split(',').map(s => s.trim()).filter(Boolean);
    const equip = equipmentNeededStr.split(',').map(s => s.trim()).filter(Boolean);

    const payload = {
      name,
      team,
      category,
      session_date: sessionDate,
      start_time: startTime,
      duration_minutes: Number(durationMinutes),
      pitch,
      coach_name: coachName,
      session_type: sessionType,
      intensity_level: intensityLevel,
      intensity_rpe_avg: Number(intensityRpeAvg),
      primary_objective: primaryObjective,
      secondary_objectives: secObjs,
      equipment_needed: equip,
      weather,
      status,
      called_players_count: sessionToEdit?.called_players_count || 22,
      present_players_count: sessionToEdit?.present_players_count || 0,
      exercises: selectedExercises.map((se, idx) => ({
        ...se,
        id: `se-${idx + 1}`,
        order_index: idx + 1
      }))
    };

    await onSubmit(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-6 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-b border-emerald-800/40 relative flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">
              {sessionToEdit ? 'Modification' : 'Planification'}
            </span>
            <h3 className="text-xl font-black text-white">
              {sessionToEdit ? 'Modifier la séance' : 'Créer une nouvelle séance'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Intitulé de la séance *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Animation offensive et transition rapide à la perte"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Équipe concernée
              </label>
              <select
                value={team}
                onChange={e => setTeam(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                <option value="Équipe Première">Équipe Première</option>
                <option value="Équipe Réserve (U21)">Équipe Réserve (U21)</option>
                <option value="U19 Nationaux">U19 Nationaux</option>
                <option value="U17 Nationaux">U17 Nationaux</option>
                <option value="U15 Académie">U15 Académie</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Catégorie
              </label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Date de la séance *
              </label>
              <input
                type="date"
                required
                value={sessionDate}
                onChange={e => setSessionDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Heure de début *
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Durée (minutes) *
              </label>
              <input
                type="number"
                required
                min="15"
                max="240"
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Entraîneur / Responsable
              </label>
              <input
                type="text"
                value={coachName}
                onChange={e => setCoachName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Terrain assigné
              </label>
              <select
                value={pitch}
                onChange={e => setPitch(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                <option value="Terrain Annexe 1 (Herbe naturelle)">Terrain Annexe 1 (Herbe naturelle)</option>
                <option value="Terrain Annexe 2 (Herbe naturelle)">Terrain Annexe 2 (Herbe naturelle)</option>
                <option value="Terrain Synthétique A">Terrain Synthétique A</option>
                <option value="Terrain d'Honneur Prince Héritier Moulay El Hassan">Terrain d'Honneur Prince Héritier Moulay El Hassan</option>
                <option value="Salle de Musculation & Réathlétisation">Salle de Musculation & Réathlétisation</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Type de séance
              </label>
              <select
                value={sessionType}
                onChange={e => setSessionType(e.target.value as SessionType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                <option value="Tactique">Tactique</option>
                <option value="Technique">Technique</option>
                <option value="Physique">Physique</option>
                <option value="Récupération">Récupération</option>
                <option value="Mixte">Mixte</option>
                <option value="Spécifique gardiens">Spécifique gardiens</option>
                <option value="Veille de match">Veille de match</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Intensité cible
              </label>
              <select
                value={intensityLevel}
                onChange={e => setIntensityLevel(e.target.value as IntensityLevel)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                <option value="faible">Faible (RPE 1-4)</option>
                <option value="moyenne">Moyenne (RPE 5-6)</option>
                <option value="elevee">Élevée (RPE 7-8)</option>
                <option value="tres_elevee">Très élevée (RPE 9-10)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Statut initial
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as SessionStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                <option value="planifiee">Planifiée</option>
                <option value="en_cours">En cours</option>
                <option value="terminee">Terminée</option>
                <option value="annulee">Annulée</option>
              </select>
            </div>
          </div>

          {/* Objectives & Gear */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Objectif Principal
              </label>
              <input
                type="text"
                placeholder="Ex: Bloc haut et pressing orienté sur le premier relanceur"
                value={primaryObjective}
                onChange={e => setPrimaryObjective(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Objectifs Secondaires (séparés par des virgules)
              </label>
              <input
                type="text"
                placeholder="Ex: Qualité de la première passe, Cadrage défensif"
                value={secondaryObjectivesStr}
                onChange={e => setSecondaryObjectivesStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Matériel requis (séparés par des virgules)
              </label>
              <input
                type="text"
                value={equipmentNeededStr}
                onChange={e => setEquipmentNeededStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>
          </div>

          {/* Attach exercises */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
              Ateliers & Exercices au programme ({selectedExercises.length})
            </h4>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={pickedExerciseId}
                onChange={e => setPickedExerciseId(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
              >
                {allExercises.map(exo => (
                  <option key={exo.id} value={exo.id}>
                    [{exo.category}] {exo.title} ({exo.duration_minutes} min)
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="5"
                max="60"
                value={pickedDuration}
                onChange={e => setPickedDuration(Number(e.target.value))}
                className="w-20 px-2 py-2 text-xs text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-bold"
                title="Durée en min"
              />
              <button
                type="button"
                onClick={handleAddExerciseToSession}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>

            {selectedExercises.length > 0 && (
              <div className="space-y-2 pt-2">
                {selectedExercises.map((se, idx) => {
                  const exo = allExercises.find(e => e.id === se.exercise_id);
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white">
                          {exo?.title || se.exercise_id}
                        </span>
                        <span className="text-slate-400">({se.duration_minutes} min)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {sessionToEdit ? 'Enregistrer les modifications' : 'Créer la séance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
