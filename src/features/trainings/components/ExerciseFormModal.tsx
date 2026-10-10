import React, { useState } from 'react';
import { X, Check, Dumbbell, Star, Info, Target, Layers } from 'lucide-react';
import type { TrainingExercise, ExerciseCategory, IntensityLevel } from '../types/training';

interface ExerciseFormModalProps {
  exerciseToEdit?: TrainingExercise | null;
  onClose: () => void;
  onSubmit: (exerciseData: any) => Promise<any>;
}

const CATEGORIES: ExerciseCategory[] = [
  'Technique',
  'Tactique',
  'Physique',
  'Finition',
  'Possession',
  'Transition',
  'Coups de pied arrêtés',
  'Échauffement',
  'Jeu réduit',
  'Match d\'application',
  'Spécifique gardien',
  'Coordination',
  'Vitesse',
  'Récupération'
];

export const ExerciseFormModal: React.FC<ExerciseFormModalProps> = ({
  exerciseToEdit,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState(exerciseToEdit?.title || '');
  const [category, setCategory] = useState<ExerciseCategory>(exerciseToEdit?.category || 'Possession');
  const [pitchSurface, setPitchSurface] = useState(exerciseToEdit?.pitch_surface || 'Zone réduite 30x30m');
  const [equipmentStr, setEquipmentStr] = useState(exerciseToEdit?.equipment_needed?.join(', ') || 'Chasubles (2 couleurs), Cônes, 10 ballons');
  const [durationMinutes, setDurationMinutes] = useState(exerciseToEdit?.duration_minutes || 20);
  const [restMinutes, setRestMinutes] = useState(exerciseToEdit?.rest_minutes || 3);
  const [playerCount, setPlayerCount] = useState(exerciseToEdit?.player_count_recommended || '14 joueurs (7v7) + 2 jokers');
  const [intensityLevel, setIntensityLevel] = useState<IntensityLevel>(exerciseToEdit?.intensity_level || 'elevee');
  const [description, setDescription] = useState(exerciseToEdit?.description || '');
  const [criteriaStr, setCriteriaStr] = useState(exerciseToEdit?.success_criteria?.join('\n') || '5 passes consécutives avant de changer de zone\nPrise d\'information constante');
  const [coachingPointsStr, setCoachingPointsStr] = useState(exerciseToEdit?.coaching_points?.join('\n') || 'Orientation du corps dès l\'appel\nIntensité dans le contre-pressing');
  const [isFavorite, setIsFavorite] = useState(exerciseToEdit?.is_favorite || false);
  const [diagramUrl, setDiagramUrl] = useState(exerciseToEdit?.diagram_url || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const equip = equipmentStr.split(',').map(s => s.trim()).filter(Boolean);
    const criteria = criteriaStr.split('\n').map(s => s.trim()).filter(Boolean);
    const coachingPoints = coachingPointsStr.split('\n').map(s => s.trim()).filter(Boolean);

    const payload = {
      title,
      category,
      pitch_surface: pitchSurface,
      equipment_needed: equip,
      duration_minutes: Number(durationMinutes),
      rest_minutes: Number(restMinutes),
      player_count_recommended: playerCount,
      intensity_level: intensityLevel,
      description,
      success_criteria: criteria,
      coaching_points: coachingPoints,
      is_favorite: isFavorite,
      diagram_url: diagramUrl || undefined,
    };

    await onSubmit(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-6 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-b border-emerald-800/40 relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">
                Bibliothèque d'Exercices
              </span>
              <h3 className="text-xl font-black text-white">
                {exerciseToEdit ? 'Modifier l\'exercice' : 'Créer un nouvel atelier'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Titre de l'exercice *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Rondo 7v3 à haute intensité avec transition"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Catégorie (14 Catégories FUS) *
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ExerciseCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Surface / Espace requis
              </label>
              <input
                type="text"
                placeholder="Ex: 30x30m, Demi-terrain..."
                value={pitchSurface}
                onChange={e => setPitchSurface(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Durée (min)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Temps de repos (min)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={restMinutes}
                onChange={e => setRestMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Effectif conseillé
              </label>
              <input
                type="text"
                placeholder="Ex: 12 joueurs (6v6)"
                value={playerCount}
                onChange={e => setPlayerCount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Intensité
              </label>
              <select
                value={intensityLevel}
                onChange={e => setIntensityLevel(e.target.value as IntensityLevel)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                <option value="faible">Faible</option>
                <option value="moyenne">Moyenne</option>
                <option value="elevee">Élevée</option>
                <option value="tres_elevee">Très élevée</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Matériel requis (séparés par virgules)
            </label>
            <input
              type="text"
              value={equipmentStr}
              onChange={e => setEquipmentStr(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Consignes & Déroulement de l'exercice *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Décrire les règles, la disposition des joueurs, la circulation de balle et les séquences..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Critères de réussite (1 par ligne)
              </label>
              <textarea
                rows={3}
                value={criteriaStr}
                onChange={e => setCriteriaStr(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Points de vigilance coach (1 par ligne)
              </label>
              <textarea
                rows={3}
                value={coachingPointsStr}
                onChange={e => setCoachingPointsStr(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={e => setIsFavorite(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Star className={`w-3.5 h-3.5 ${isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                Marquer comme favori de l'académie
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
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
              {exerciseToEdit ? 'Mettre à jour l\'exercice' : 'Ajouter à la bibliothèque'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
