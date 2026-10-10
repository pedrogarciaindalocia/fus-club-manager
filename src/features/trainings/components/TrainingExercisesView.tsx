import React, { useState } from 'react';
import {
  Dumbbell,
  Search,
  Filter,
  Star,
  Plus,
  Clock,
  Users,
  Target,
  Layers,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  X
} from 'lucide-react';
import type { TrainingExercise, ExerciseCategory, IntensityLevel } from '../types/training';

interface TrainingExercisesViewProps {
  exercises: TrainingExercise[];
  onOpenNewExerciseModal: () => void;
  onOpenEditExerciseModal: (exo: TrainingExercise) => void;
  onDeleteExercise: (id: string) => Promise<any>;
  onToggleFavorite: (id: string) => Promise<any>;
  onAddExerciseToSession?: (exo: TrainingExercise) => void;
}

const CATEGORIES: { id: string; label: string; count?: number }[] = [
  { id: 'all', label: 'Toutes les catégories' },
  { id: 'Technique', label: '⚽ Technique' },
  { id: 'Tactique', label: '🧠 Tactique' },
  { id: 'Physique', label: '⚡ Physique' },
  { id: 'Finition', label: '🎯 Finition' },
  { id: 'Possession', label: '🔄 Possession' },
  { id: 'Transition', label: '🚀 Transition' },
  { id: 'Coups de pied arrêtés', label: '🚩 CPA' },
  { id: 'Échauffement', label: '🏃 Échauffement' },
  { id: 'Jeu réduit', label: '🥅 Jeu réduit' },
  { id: 'Match d\'application', label: '🏟️ Match d\'application' },
  { id: 'Spécifique gardien', label: '🧤 Spécifique gardien' },
  { id: 'Coordination', label: '🧘 Coordination' },
  { id: 'Vitesse', label: '⚡ Vitesse' },
  { id: 'Récupération', label: '🧊 Récupération' }
];

export const TrainingExercisesView: React.FC<TrainingExercisesViewProps> = ({
  exercises,
  onOpenNewExerciseModal,
  onOpenEditExerciseModal,
  onDeleteExercise,
  onToggleFavorite,
  onAddExerciseToSession,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedExerciseForPreview, setSelectedExerciseForPreview] = useState<TrainingExercise | null>(null);

  // Filter exercises
  const filteredExercises = exercises.filter(e => {
    if (onlyFavorites && !e.is_favorite) return false;
    if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchDesc = e.description.toLowerCase().includes(q);
      const matchCat = e.category.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  const getIntensityBadge = (lvl: IntensityLevel) => {
    switch (lvl) {
      case 'faible':
        return <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-bold">Faible</span>;
      case 'moyenne':
        return <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">Moyenne</span>;
      case 'elevee':
        return <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold">Élevée</span>;
      case 'tres_elevee':
        return <span className="bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 px-2 py-0.5 rounded-full text-[10px] font-bold">Très élevée</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un atelier par mot-clé (ex: pressing, rondo, finition)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                onlyFavorites
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-white' : 'text-amber-500'}`} />
              Favoris Académie ({exercises.filter(e => e.is_favorite).length})
            </button>

            <button
              onClick={onOpenNewExerciseModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Créer un atelier
            </button>
          </div>
        </div>

        {/* 14 Categories Horizontal Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          {CATEGORIES.map(cat => {
            const count = cat.id === 'all' ? exercises.length : exercises.filter(e => e.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Exercises Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExercises.map(exercise => (
          <div
            key={exercise.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              {/* Header card */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      {exercise.category}
                    </span>
                    {getIntensityBadge(exercise.intensity_level)}
                  </div>
                  <h3
                    onClick={() => setSelectedExerciseForPreview(exercise)}
                    className="font-black text-slate-900 dark:text-white text-base hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition"
                  >
                    {exercise.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleFavorite(exercise.id)}
                  title={exercise.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-amber-500 transition"
                >
                  <Star
                    className={`w-4 h-4 ${
                      exercise.is_favorite ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                </button>
              </div>

              {/* Description preview */}
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                {exercise.description}
              </p>

              {/* Mini Pitch / Surface badge */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    {exercise.duration_minutes} min (repos: {exercise.rest_minutes || 2} min)
                  </span>
                  <span className="flex items-center gap-1 font-semibold">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    {exercise.player_count_recommended}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate pt-0.5">
                  Terrain : {exercise.pitch_surface || "Espace réduit"}
                </div>
              </div>

              {/* Success Criteria preview */}
              {exercise.success_criteria && exercise.success_criteria.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Critères de réussite :
                  </span>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
                    <span className="line-clamp-1">{exercise.success_criteria[0]}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Toolbar */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onOpenEditExerciseModal(exercise)}
                  title="Modifier l'atelier"
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Supprimer cet atelier de la bibliothèque ?")) {
                      onDeleteExercise(exercise.id);
                    }
                  }}
                  title="Supprimer l'atelier"
                  className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedExerciseForPreview(exercise)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Eye className="w-3.5 h-3.5" /> Voir fiche
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredExercises.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
          <Dumbbell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">Aucun atelier trouvé</h4>
          <p className="text-xs text-slate-500 mt-1">Modifiez vos filtres ou créez un nouvel exercice dans la bibliothèque.</p>
          <button
            onClick={onOpenNewExerciseModal}
            className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
          >
            Créer un atelier
          </button>
        </div>
      )}

      {/* DETAILED EXERCISE PREVIEW MODAL */}
      {selectedExerciseForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="p-6 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-b border-emerald-800/40 relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                    {selectedExerciseForPreview.category}
                  </span>
                  {getIntensityBadge(selectedExerciseForPreview.intensity_level)}
                  {selectedExerciseForPreview.is_favorite && (
                    <span className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" /> Favori
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-white">{selectedExerciseForPreview.title}</h3>
              </div>
              <button
                onClick={() => setSelectedExerciseForPreview(null)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Pitch Diagram Visual / Simulation */}
              <div className="rounded-2xl overflow-hidden border border-emerald-800/50 bg-gradient-to-b from-emerald-900 via-emerald-950 to-emerald-900 p-6 relative shadow-inner">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                {/* Football pitch markings */}
                <div className="border-2 border-white/20 rounded-xl h-44 relative flex items-center justify-center">
                  <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20"></div>
                  <div className="w-20 h-20 rounded-full border border-white/20 flex items-center justify-center">
                    <span className="text-white/60 text-xs font-bold uppercase tracking-widest text-center">
                      Zone {selectedExerciseForPreview.pitch_surface || "Atelier"}
                    </span>
                  </div>
                  {/* Dynamic Tactical Dots */}
                  <div className="absolute left-8 top-8 w-6 h-6 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center shadow-lg animate-pulse">
                    J1
                  </div>
                  <div className="absolute right-8 bottom-8 w-6 h-6 rounded-full bg-blue-500 text-white font-bold text-[10px] flex items-center justify-center shadow-lg">
                    J2
                  </div>
                  <div className="absolute left-1/3 bottom-6 w-5 h-5 rounded-full bg-amber-400 text-slate-900 font-bold text-[9px] flex items-center justify-center shadow-lg">
                    ⚽
                  </div>
                </div>
                <p className="text-center text-emerald-200 text-xs mt-3 font-semibold">
                  📐 Schéma d'atelier FUS : {selectedExerciseForPreview.pitch_surface} • {selectedExerciseForPreview.player_count_recommended}
                </p>
              </div>

              {/* Instructions */}
              <div>
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                  Consignes & Déroulement
                </h4>
                <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  {selectedExerciseForPreview.description}
                </p>
              </div>

              {/* Success criteria & Coaching points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/50">
                  <h4 className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Critères de réussite
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {selectedExerciseForPreview.success_criteria?.map((sc, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">✓</span> {sc}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50/50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/50">
                  <h4 className="text-xs font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider mb-2 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" /> Points de vigilance staff
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {selectedExerciseForPreview.coaching_points?.map((cp, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">⚡</span> {cp}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Gear */}
              {selectedExerciseForPreview.equipment_needed && selectedExerciseForPreview.equipment_needed.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                    Matériel requis
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedExerciseForPreview.equipment_needed.map((eq, i) => (
                      <span
                        key={i}
                        className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700"
                      >
                        📦 {eq}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  onOpenEditExerciseModal(selectedExerciseForPreview);
                  setSelectedExerciseForPreview(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition"
              >
                Modifier cet exercice
              </button>
              <button
                onClick={() => setSelectedExerciseForPreview(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 transition"
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
