import React, { useState, useEffect, useMemo } from 'react';
import type { PlayerTest, SessionStatus, TrialCandidate } from '../types/recruitment';
import { RECRUITMENT_AGE_CATEGORIES } from '../types/recruitment';
import {
  X,
  Calendar,
  Clock,
  Users,
  Search,
  Check,
  Plus,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { useRecruitment } from '../hooks/useRecruitment';
import { normalizeAgeCategory } from '../../../constants';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

export interface TrialSessionPlannerFormProps {
  selectedDates: string[];
  onSelectedDatesChange: (dates: string[]) => void;
  initialTest?: PlayerTest | null;
  defaultCandidateId?: string;
  candidates?: TrialCandidate[];
  scouts?: any[];
  onSaveBatch: (tests: Omit<PlayerTest, 'id' | 'created_at' | 'updated_at'>[]) => Promise<any>;
  onUpdate?: (id: string, updates: Partial<PlayerTest>) => Promise<any>;
  onSuccess?: () => void;
  onCancel?: () => void;
  variant?: 'panel' | 'modal';
}

export const TrialSessionPlannerForm: React.FC<TrialSessionPlannerFormProps> = ({
  selectedDates,
  onSelectedDatesChange,
  initialTest,
  defaultCandidateId,
  candidates: propCandidates,
  scouts: propScouts,
  onSaveBatch,
  onUpdate,
  onSuccess,
  onCancel,
  variant = 'panel',
}) => {
  const { candidates: hookCandidates = [], scouts: hookScouts = [] } = useRecruitment();
  const candidates = propCandidates && propCandidates.length > 0 ? propCandidates : hookCandidates;
  const scouts = propScouts && propScouts.length > 0 ? propScouts : hookScouts;

  // Multi-sélection des candidats + barre de recherche
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [candidateCategoryFilter, setCandidateCategoryFilter] = useState('ALL');

  // Champs de la session
  const [editDate, setEditDate] = useState('');
  const [customDateToAdd, setCustomDateToAdd] = useState('');
  const [testName, setTestName] = useState('');
  const [hasCustomTitle, setHasCustomTitle] = useState(false);
  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('12:00');
  const [location, setLocation] = useState('Complexe Sportif FUS - Académie');
  const [trainingGround, setTrainingGround] = useState('Terrain Synthétique 1');
  const [targetTeam, setTargetTeam] = useState('Académie FUS U13');
  const [ageCategory, setAgeCategory] = useState('U13');
  const [testType, setTestType] = useState<'trial_match' | 'physical_test' | 'technical_session' | 'medical_test' | 'comprehensive'>('comprehensive');
  const [status, setStatus] = useState<SessionStatus>('scheduled');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialisation en mode création ou édition
  useEffect(() => {
    if (initialTest) {
      const initialCandIds = initialTest.candidate_ids && initialTest.candidate_ids.length > 0
        ? initialTest.candidate_ids
        : initialTest.candidate_id ? [initialTest.candidate_id] : [];
      setSelectedCandidateIds(initialCandIds);
      setTestName(initialTest.test_name);
      setHasCustomTitle(true);
      setEditDate(initialTest.test_date);
      setStartTime(initialTest.start_time || '09:30');
      setEndTime(initialTest.end_time || '12:00');
      setLocation(initialTest.location || 'Complexe Sportif FUS - Académie');
      setTrainingGround(initialTest.training_ground || 'Terrain Synthétique 1');
      setTargetTeam(initialTest.target_team || 'Académie FUS U13');
      setAgeCategory(normalizeAgeCategory(initialTest.age_category || 'U13'));
      setTestType(initialTest.test_type || 'comprehensive');
      setStatus(initialTest.status || 'scheduled');
      setNotes(initialTest.notes || '');
    } else {
      const activeCandIds = defaultCandidateId ? [defaultCandidateId] : [];
      setSelectedCandidateIds(activeCandIds);
      setHasCustomTitle(false);

      const primaryCand = candidates.find(c => c.id === defaultCandidateId);
      const normCat = primaryCand ? normalizeAgeCategory(primaryCand.age_category || 'U13') : 'U13';
      setAgeCategory(normCat);
      setTargetTeam(`Académie FUS ${normCat}`);

      if (primaryCand) {
        setTestName(`Session Détection : ${primaryCand.first_name} ${primaryCand.last_name}`);
      } else {
        setTestName(`Session Détection & Test ${normCat}`);
      }

      setStartTime('09:30');
      setEndTime('12:00');
      setLocation('Complexe Sportif FUS - Académie');
      setTrainingGround('Terrain Synthétique 1');
      setTestType('comprehensive');
      setStatus('scheduled');
      setNotes('');
    }
  }, [initialTest?.id, defaultCandidateId]);

  // Liste des joueurs filtrée par la barre de recherche (tout en conservant les IDs sélectionnés)
  const filteredCandidates = useMemo(() => {
    const q = candidateSearchQuery.toLowerCase().trim();
    return candidates.filter(c => {
      if (c.pipeline_stage === 'archived' || c.status === 'archived') return false;
      if (candidateCategoryFilter !== 'ALL') {
        if (normalizeAgeCategory(c.age_category || '') !== normalizeAgeCategory(candidateCategoryFilter)) {
          return false;
        }
      }
      if (!q) return true;
      const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
      const pos = (c.primary_position || '').toLowerCase();
      const club = (c.current_club || '').toLowerCase();
      const cat = (c.age_category || '').toLowerCase();
      return fullName.includes(q) || pos.includes(q) || club.includes(q) || cat.includes(q);
    });
  }, [candidates, candidateSearchQuery, candidateCategoryFilter]);

  const buildAutoTitle = (candIds: string[], cat: string) => {
    const selectedNames = candidates
      .filter(c => candIds.includes(c.id))
      .map(c => `${c.first_name} ${c.last_name}`);

    if (selectedNames.length > 0) {
      const namesLabel = selectedNames.length > 3
        ? `${selectedNames.slice(0, 3).join(', ')} +${selectedNames.length - 3}`
        : selectedNames.join(', ');
      return `Session Détection (${cat}) : ${namesLabel}`;
    }
    return `Session Détection & Test (${cat})`;
  };

  const toggleCandidateSelection = (id: string) => {
    setSelectedCandidateIds(prev => {
      const next = prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id];
      if (!hasCustomTitle) {
        setTestName(buildAutoTitle(next, ageCategory));
      }
      return next;
    });
  };

  const handleSelectAllFilteredCandidates = () => {
    const filteredIds = filteredCandidates.map(c => c.id);
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedCandidateIds.includes(id));

    setSelectedCandidateIds(prev => {
      let next: string[];
      if (allFilteredSelected) {
        const filteredSet = new Set(filteredIds);
        next = prev.filter(id => !filteredSet.has(id));
      } else {
        next = Array.from(new Set([...prev, ...filteredIds]));
      }
      if (!hasCustomTitle) {
        setTestName(buildAutoTitle(next, ageCategory));
      }
      return next;
    });
  };

  const handleRemoveDate = (dateToRemove: string) => {
    onSelectedDatesChange(selectedDates.filter(d => d !== dateToRemove));
  };

  const handleAddCustomDate = () => {
    if (!customDateToAdd) return;
    if (!selectedDates.includes(customDateToAdd)) {
      onSelectedDatesChange(Array.from(new Set([...selectedDates, customDateToAdd])).sort());
    }
    setCustomDateToAdd('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const datesToPlan = initialTest ? [editDate].filter(Boolean) : selectedDates;

    if (!testName.trim()) {
      toast.error("Veuillez saisir un intitulé de session.");
      return;
    }
    if (datesToPlan.length === 0) {
      toast.error("Veuillez sélectionner au moins un jour dans le calendrier.");
      return;
    }

    setIsSubmitting(true);
    try {
      const primaryCandidateId = selectedCandidateIds[0] || undefined;

      if (initialTest && onUpdate) {
        await onUpdate(initialTest.id, {
          candidate_id: primaryCandidateId,
          candidate_ids: selectedCandidateIds,
          test_name: testName.trim(),
          test_date: editDate,
          start_time: startTime,
          end_time: endTime,
          location: location.trim(),
          training_ground: trainingGround.trim(),
          target_team: targetTeam.trim(),
          age_category: ageCategory,
          test_type: testType,
          status,
          notes: notes.trim() || undefined,
        });
      } else {
        const batchPayloads: Omit<PlayerTest, 'id' | 'created_at' | 'updated_at'>[] = datesToPlan.map(dateStr => ({
          candidate_id: primaryCandidateId,
          candidate_ids: selectedCandidateIds,
          test_name: testName.trim(),
          test_date: dateStr,
          start_time: startTime,
          end_time: endTime,
          location: location.trim(),
          training_ground: trainingGround.trim(),
          target_team: targetTeam.trim(),
          age_category: ageCategory,
          assigned_coaches: [`Staff Technique Académie FUS (${ageCategory})`],
          assigned_scouts: scouts.slice(0, 2).map(s => s.full_name),
          test_type: testType,
          status,
          notes: notes.trim() || undefined,
        }));

        await onSaveBatch(batchPayloads);
      }

      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      toast.error(`Erreur lors de l'enregistrement : ${err?.message || ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "space-y-4 text-xs",
        variant === 'modal' && "p-6 overflow-y-auto custom-scrollbar flex-1"
      )}
    >
      {/* 0. JOURS SÉLECTIONNÉS (CRÉATION MULTI-JOURS OU DATE UNIQUE EN ÉDITION) */}
      {!initialTest ? (
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Jours sélectionnés ({selectedDates.length})
            </span>
            {selectedDates.length > 0 && (
              <button
                type="button"
                onClick={() => onSelectedDatesChange([])}
                className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Tout effacer
              </button>
            )}
          </div>

          {selectedDates.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic">
              Cliquez sur un jour de début, maintenez <strong>Shift</strong> et cliquez sur le jour de fin dans le calendrier.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectedDates.map(d => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-bold text-[11px]"
                >
                  <span>
                    {new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDate(d)}
                    className="hover:text-rose-600 cursor-pointer"
                    title={`Retirer ${d}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Ajout manuel d'une date supplémentaire */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="date"
              value={customDateToAdd}
              onChange={(e) => setCustomDateToAdd(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 text-[11px]"
            />
            <button
              type="button"
              onClick={handleAddCustomDate}
              disabled={!customDateToAdd}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-[11px] flex items-center gap-1 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Ajouter jour</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
            Date de la Session *
          </label>
          <input
            type="date"
            required
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
          />
        </div>
      )}

      {/* 1. SÉLECTION MULTIPLE DES JOUEURS CONVOQUÉS + BARRE DE RECHERCHE */}
      <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/90">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" />
            Joueurs Convoqués ({selectedCandidateIds.length} sélectionné{selectedCandidateIds.length > 1 ? 's' : ''})
          </label>
          <div className="flex items-center gap-2">
            {selectedCandidateIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCandidateIds([]);
                  if (!hasCustomTitle) setTestName(buildAutoTitle([], ageCategory));
                }}
                className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Vider ({selectedCandidateIds.length})
              </button>
            )}
            <button
              type="button"
              onClick={handleSelectAllFilteredCandidates}
              className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
            >
              {filteredCandidates.length > 0 && filteredCandidates.every(c => selectedCandidateIds.includes(c.id))
                ? 'Désélectionner filtrés'
                : `Tout cocher (${filteredCandidates.length})`}
            </button>
          </div>
        </div>

        {/* Badges des joueurs sélectionnés */}
        <div className="flex flex-wrap gap-1.5 min-h-[34px] p-2 bg-white border border-slate-200 rounded-xl">
          {selectedCandidateIds.length === 0 ? (
            <span className="text-[11px] text-slate-400 italic">
              Recherchez et cochez un ou plusieurs joueurs ci-dessous...
            </span>
          ) : (
            selectedCandidateIds.map(cId => {
              const cand = candidates.find(c => c.id === cId);
              if (!cand) return null;
              return (
                <span
                  key={cId}
                  className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-bold text-[11px] flex items-center gap-1 border border-primary/20"
                >
                  <span>{cand.first_name} {cand.last_name} ({cand.primary_position})</span>
                  <button
                    type="button"
                    onClick={() => toggleCandidateSelection(cId)}
                    className="hover:text-rose-600 ml-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })
          )}
        </div>

        {/* Barre de recherche joueurs + filtre catégorie */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={candidateSearchQuery}
              onChange={(e) => setCandidateSearchQuery(e.target.value)}
              placeholder="Rechercher joueur (nom, poste, club, catégorie)..."
              className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 outline-none focus:ring-2 ring-primary/20 text-[11px]"
            />
            {candidateSearchQuery && (
              <button
                type="button"
                onClick={() => setCandidateSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select
            value={candidateCategoryFilter}
            onChange={(e) => setCandidateCategoryFilter(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 text-[11px] cursor-pointer outline-none"
          >
            <option value="ALL">Toutes cat.</option>
            {RECRUITMENT_AGE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Liste scrollable avec choix multiple persistant */}
        <div className="max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl p-1.5 space-y-1 custom-scrollbar">
          {filteredCandidates.length === 0 ? (
            <div className="py-4 text-center text-[11px] text-slate-400 italic">
              Aucun joueur trouvé pour cette recherche.
            </div>
          ) : (
            filteredCandidates.map(c => {
              const isSelected = selectedCandidateIds.includes(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => toggleCandidateSelection(c.id)}
                  className={cn(
                    "p-2 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-colors",
                    isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-50 text-slate-700'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "w-4 h-4 rounded-md border flex items-center justify-center shrink-0",
                        isSelected ? 'bg-primary text-white border-primary' : 'border-slate-300 bg-white'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <span className="truncate">{c.first_name} {c.last_name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold shrink-0">
                      {c.primary_position}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                      ({c.current_club || 'Sans club'})
                    </span>
                  </div>
                  <span className="text-[9px] font-black uppercase text-slate-400 shrink-0">
                    {c.age_category || 'U19'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. INTITULÉ, CATÉGORIE & TYPE */}
      <div className="space-y-2.5">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
            Intitulé de la Session *
          </label>
          <input
            type="text"
            required
            value={testName}
            onChange={(e) => {
              setTestName(e.target.value);
              setHasCustomTitle(true);
            }}
            placeholder="Ex: Stage Détection U13"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 outline-none focus:ring-2 ring-primary/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Catégorie Cible
            </label>
            <select
              value={ageCategory}
              onChange={(e) => {
                const nextCat = e.target.value;
                setAgeCategory(nextCat);
                setTargetTeam(`Académie FUS ${nextCat}`);
                if (!hasCustomTitle) {
                  setTestName(buildAutoTitle(selectedCandidateIds, nextCat));
                }
              }}
              className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 cursor-pointer"
            >
              {RECRUITMENT_AGE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Type de Séance
            </label>
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value as any)}
              className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 cursor-pointer"
            >
              <option value="comprehensive">Batterie Complète</option>
              <option value="trial_match">Match d'Essai</option>
              <option value="technical_session">Séance Technique</option>
              <option value="physical_test">Test Physique</option>
              <option value="medical_test">Bilan Médical</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. HORAIRES & LIEUX */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[9px] font-bold text-slate-500 mb-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3 text-primary" /> Début
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
          />
        </div>
        <div>
          <label className="block text-[9px] font-bold text-slate-500 mb-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3 text-primary" /> Fin
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-primary" /> Complexe / Stade
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Complexe Sportif FUS - Académie"
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-800"
          />
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
            Terrain d'Évaluation
          </label>
          <input
            type="text"
            value={trainingGround}
            onChange={(e) => setTrainingGround(e.target.value)}
            placeholder="Terrain Synthétique 1"
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-800"
          />
        </div>
      </div>

      {/* 4. CONSIGNES */}
      <div>
        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
          Consignes & Programme
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: Échauffement collectif 20 min, opposition 2×30 min..."
          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:ring-2 ring-primary/20 resize-none"
        />
      </div>

      {/* ACTIONS */}
      <div className="pt-3 border-t flex items-center justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || (!initialTest && selectedDates.length === 0)}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {isSubmitting
              ? 'Enregistrement...'
              : initialTest
                ? 'Mettre à jour la Session'
                : selectedDates.length > 1
                  ? `Planifier sur ${selectedDates.length} jours${selectedCandidateIds.length > 0 ? ` (${selectedCandidateIds.length} joueur${selectedCandidateIds.length > 1 ? 's' : ''})` : ''}`
                  : `Valider la Planification${selectedCandidateIds.length > 0 ? ` (${selectedCandidateIds.length} joueur${selectedCandidateIds.length > 1 ? 's' : ''})` : ''}`}
          </span>
        </button>
      </div>
    </form>
  );
};

export default TrialSessionPlannerForm;
