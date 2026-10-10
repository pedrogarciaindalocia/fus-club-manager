import React, { useState, useEffect, useMemo } from 'react';
import type { PlayerTest, SessionStatus, TrialCandidate } from '../types/recruitment';
import {
  X, Calendar, Clock, MapPin, CheckCircle2,
  Users, Swords, ChevronDown, Plus, Check
} from 'lucide-react';
import { useMatches } from '../../../hooks/useMatches';
import { useClubData } from '../../../hooks/useClubData';
import { useRecruitment } from '../hooks/useRecruitment';
import { normalizeAgeCategory } from '../../../constants';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';

interface TrialSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (test: Omit<PlayerTest, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdate?: (id: string, test: Partial<PlayerTest>) => Promise<any>;
  initialTest?: PlayerTest | null;
  defaultDate?: string;
  defaultCandidateId?: string;
  candidates?: TrialCandidate[];
  scouts?: any[];
}

export const TrialSessionModal: React.FC<TrialSessionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  initialTest,
  defaultDate,
  defaultCandidateId,
  candidates: propCandidates,
  scouts: propScouts,
}) => {
  const { candidates: hookCandidates = [], scouts: hookScouts = [], updateCandidate } = useRecruitment();
  const candidates = propCandidates && propCandidates.length > 0 ? propCandidates : hookCandidates;
  const scouts = propScouts && propScouts.length > 0 ? propScouts : hookScouts;
  const { matches = [] } = useMatches();
  const { opponentClubs = [] } = useClubData();

  // Multi-sélection des candidats convoqués
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [matchId, setMatchId] = useState<string>('');
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState('');
  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('12:00');
  const [location, setLocation] = useState('Complexe Sportif FUS - Académie');
  const [trainingGround, setTrainingGround] = useState('Terrain Synthétique 1');
  const [targetTeam, setTargetTeam] = useState('Académie FUS U13');
  const [ageCategory, setAgeCategory] = useState('U13');
  const [testType, setTestType] = useState<'trial_match' | 'physical_test' | 'technical_session' | 'medical_test' | 'comprehensive'>('trial_match');
  const [status, setStatus] = useState<SessionStatus>('scheduled');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMultiSelectDropdown, setShowMultiSelectDropdown] = useState(false);

  // Helper pour trouver le nom de l'adversaire
  const getOpponentName = (oppId?: string) => {
    if (!oppId) return 'Adversaire';
    const found = opponentClubs.find(c => c.id === oppId);
    return found?.name || 'Club Partenaire';
  };

  // Matchs de la catégorie cible
  const categoryMatches = useMemo(() => {
    return matches.filter(m => {
      return normalizeAgeCategory(m.category) === normalizeAgeCategory(ageCategory);
    });
  }, [matches, ageCategory]);

  // Autres matchs du club
  const otherMatches = useMemo(() => {
    return matches.filter(m => {
      return normalizeAgeCategory(m.category) !== normalizeAgeCategory(ageCategory);
    });
  }, [matches, ageCategory]);

  useEffect(() => {
    if (!isOpen) return;

    if (initialTest) {
      const initialCandIds = initialTest.candidate_ids && initialTest.candidate_ids.length > 0
        ? initialTest.candidate_ids
        : initialTest.candidate_id ? [initialTest.candidate_id] : [];
      setSelectedCandidateIds(initialCandIds);
      setMatchId(initialTest.match_id || '');
      setTestName(initialTest.test_name);
      setTestDate(initialTest.test_date);
      setStartTime(initialTest.start_time || '09:30');
      setEndTime(initialTest.end_time || '12:00');
      setLocation(initialTest.location || 'Complexe Sportif FUS - Académie');
      setTrainingGround(initialTest.training_ground || 'Terrain Synthétique 1');
      setTargetTeam(initialTest.target_team || 'Académie FUS U13');
      setAgeCategory(normalizeAgeCategory(initialTest.age_category || 'U13'));
      setTestType(initialTest.test_type || 'trial_match');
      setStatus(initialTest.status || 'scheduled');
      setNotes(initialTest.notes || '');
    } else {
      const activeCandIds = defaultCandidateId ? [defaultCandidateId] : [];
      setSelectedCandidateIds(activeCandIds);
      setMatchId('');

      const primaryCand = candidates.find(c => c.id === defaultCandidateId);
      const normCat = primaryCand ? normalizeAgeCategory(primaryCand.age_category || 'U13') : 'U13';
      setAgeCategory(normCat);
      setTargetTeam(`Académie FUS ${normCat}`);

      if (primaryCand) {
        setTestName(`Match d'Essai & Test : ${primaryCand.first_name} ${primaryCand.last_name}`);
      } else {
        setTestName(`Session Détection & Match Amical ${normCat}`);
      }

      setTestDate(defaultDate || new Date().toISOString().split('T')[0]);
      setStartTime('09:30');
      setEndTime('12:00');
      setLocation('Complexe Sportif FUS - Académie');
      setTrainingGround('Terrain Synthétique 1');
      setTestType('trial_match');
      setStatus('scheduled');
      setNotes('');
    }
  }, [isOpen, initialTest?.id, defaultCandidateId, defaultDate]);

  if (!isOpen) return null;

  // Gestion du choix d'un match : synchronisation automatique des détails
  const handleSelectMatch = (selectedId: string) => {
    setMatchId(selectedId);
    if (!selectedId) return;

    const foundMatch = matches.find(m => m.id === selectedId);
    if (foundMatch) {
      if (foundMatch.match_date) {
        setTestDate(foundMatch.match_date);
      }
      if (foundMatch.match_time) {
        const timeClean = foundMatch.match_time.slice(0, 5);
        setStartTime(timeClean);
        const [h, m] = timeClean.split(':').map(Number);
        if (!isNaN(h)) {
          const endH = String((h + 2) % 24).padStart(2, '0');
          setEndTime(`${endH}:${String(m || 0).padStart(2, '0')}`);
        }
      }
      setTestType('trial_match');

      const stadium = (foundMatch as any).venue || (foundMatch as any).stadium_name || 'Complexe Sportif FUS - Académie';
      setLocation(stadium);

      const oppName = getOpponentName(foundMatch.opponent_id);
      const selectedNames = candidates
        .filter(c => selectedCandidateIds.includes(c.id))
        .map(c => `${c.first_name} ${c.last_name}`);

      if (selectedNames.length > 0) {
        setTestName(`Match d'Essai vs ${oppName} (${foundMatch.category}) : ${selectedNames.join(', ')}`);
      } else {
        setTestName(`Match d'Essai vs ${oppName} (${foundMatch.category})`);
      }
    }
  };

  const toggleCandidateSelection = (id: string) => {
    setSelectedCandidateIds(prev => {
      const next = prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id];
      // Mettre à jour le titre du test
      const selectedNames = candidates
        .filter(c => next.includes(c.id))
        .map(c => `${c.first_name} ${c.last_name}`);

      const foundMatch = matches.find(m => m.id === matchId);
      const opp = foundMatch ? ` vs ${getOpponentName(foundMatch.opponent_id)}` : '';
      if (selectedNames.length > 0) {
        setTestName(`Match d'Essai${opp} (${ageCategory}) : ${selectedNames.join(', ')}`);
      } else {
        setTestName(`Session Détection & Match Amical (${ageCategory})`);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName.trim() || !testDate) return;

    setIsSubmitting(true);
    try {
      const selectedMatch = matches.find(m => m.id === matchId);
      const selectedMatchOppName = selectedMatch ? getOpponentName(selectedMatch.opponent_id) : undefined;
      const matchDisplayName = selectedMatch
        ? `FUS vs ${selectedMatchOppName} (${selectedMatch.category}) [${selectedMatch.match_date}]`
        : undefined;

      const primaryCandidateId = selectedCandidateIds[0] || undefined;

      const payload: Omit<PlayerTest, 'id' | 'created_at' | 'updated_at'> = {
        candidate_id: primaryCandidateId,
        candidate_ids: selectedCandidateIds,
        match_id: matchId || undefined,
        match_name: matchDisplayName,
        test_name: testName.trim(),
        test_date: testDate,
        start_time: startTime,
        end_time: endTime,
        location: location.trim(),
        training_ground: trainingGround.trim(),
        target_team: targetTeam.trim(),
        age_category: ageCategory,
        assigned_coaches: ['Coach Jamal (U13)', 'Staff Technique Académie FUS'],
        assigned_scouts: scouts.slice(0, 2).map(s => s.full_name),
        test_type: testType,
        status,
        notes: notes.trim() || undefined,
      };

      if (initialTest && onUpdate) {
        await onUpdate(initialTest.id, payload);
      } else {
        await onSave(payload);
      }

      // S'assurer que tous les joueurs sélectionnés en choix multiple changent d'étape dans le pipeline Kanban
      for (const candId of selectedCandidateIds) {
        try {
          const cand = candidates.find(c => c.id === candId);
          const isClubTest = Boolean(matchId || (cand && ['shortlisted', 'shortlist'].includes(cand.pipeline_stage)));
          const nextStage = isClubTest ? 'under_evaluation' : 'test_scheduled';

          await updateCandidate({
            id: candId,
            updates: {
              pipeline_stage: nextStage,
              status: 'in_trial',
            },
          });
        } catch (linkErr) {
          console.warn('[TrialSessionModal] Liaison candidat:', linkErr);
        }
      }

      toast.success(
        selectedCandidateIds.length > 1
          ? `Convocation validée : ${selectedCandidateIds.length} joueurs déplacés dans "Test Planifié" !`
          : 'Session de test enregistrée avec succès !'
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(`Erreur lors de l'enregistrement : ${err?.message || ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground tracking-tight">
                {initialTest ? 'Modifier la Session de Test' : 'Planifier un Test Scouting / Match Amical'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Convocation, date, horaire, terrain et affectation au match
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          
          {/* 1. SÉLECTION MULTIPLE DES JOUEURS CONVOQUÉS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                Joueurs Convoqués ({selectedCandidateIds.length} sélectionné{selectedCandidateIds.length > 1 ? 's' : ''})
              </label>
              <button
                type="button"
                onClick={() => {
                  if (selectedCandidateIds.length === candidates.length) {
                    setSelectedCandidateIds([]);
                  } else {
                    setSelectedCandidateIds(candidates.map(c => c.id));
                  }
                }}
                className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
              >
                {selectedCandidateIds.length === candidates.length ? 'Désélectionner tout' : 'Tout sélectionner'}
              </button>
            </div>

            {/* Badges des joueurs sélectionnés */}
            <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-slate-50 border border-slate-200 rounded-xl">
              {selectedCandidateIds.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">
                  Cliquez ci-dessous pour ajouter un ou plusieurs joueurs à cette session...
                </span>
              ) : (
                selectedCandidateIds.map(cId => {
                  const cand = candidates.find(c => c.id === cId);
                  if (!cand) return null;
                  return (
                    <span
                      key={cId}
                      className="px-2 py-1 rounded-lg bg-primary/10 text-primary font-bold text-[11px] flex items-center gap-1 border border-primary/20"
                    >
                      <span>{cand.first_name} {cand.last_name} ({cand.primary_position})</span>
                      <button
                        type="button"
                        onClick={() => toggleCandidateSelection(cId)}
                        className="hover:text-red-500 ml-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })
              )}
            </div>

            {/* Liste déroulante / Grille des candidats pour choix multiple */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMultiSelectDropdown(prev => !prev)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between text-slate-700 font-semibold cursor-pointer"
              >
                <span>➕ Choisir / Ajouter des joueurs à la convocation</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {showMultiSelectDropdown && (
                <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-2 space-y-1 custom-scrollbar">
                  {candidates.map(c => {
                    const isSelected = selectedCandidateIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleCandidateSelection(c.id)}
                        className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-md border flex items-center justify-center ${isSelected ? 'bg-primary text-white border-primary' : 'border-slate-300'}`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <span>{c.first_name} {c.last_name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">{c.primary_position}</span>
                          <span className="text-[10px] text-slate-400">({c.current_club || 'Sans club'})</span>
                        </div>
                        <span className="text-[9px] font-black uppercase text-slate-400">{c.pipeline_stage}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 2. CHOIX DU MATCH D'OPPOSITION (LISTE ENRICHIE AVEC TOUS LES MATCHS DU CLUB) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-blue-50/60 to-slate-50 border border-indigo-200/80 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-indigo-600" />
                Dans quel Match tester les joueurs ?
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {matches.length} Match{matches.length > 1 ? 's' : ''} au Club
                </span>
              </div>
            </div>

            <select
              value={matchId}
              onChange={(e) => handleSelectMatch(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-300 bg-white font-bold text-slate-900 outline-none focus:ring-2 ring-indigo-500/30 text-xs transition-shadow cursor-pointer"
            >
              <option value="">Séance d'entraînement / Test autonome (Hors match)</option>

              {/* Groupe 1 : Matchs de la catégorie cible */}
              {categoryMatches.length > 0 && (
                <optgroup label={`Matchs Catégorie ${ageCategory} (${categoryMatches.length})`}>
                  {categoryMatches.map(m => {
                    const oppName = getOpponentName(m.opponent_id);
                    const statusFr = m.status === 'completed' ? 'Terminé' : m.status === 'live' ? 'En Direct' : 'Planifié';
                    return (
                      <option key={m.id} value={m.id}>
                        ⚽ Match {m.category} du {m.match_date} {m.match_time ? `à ${m.match_time.slice(0, 5)}` : ''} — vs {oppName} ({statusFr})
                      </option>
                    );
                  })}
                </optgroup>
              )}

              {/* Groupe 2 : Tous les autres matchs du club */}
              {otherMatches.length > 0 && (
                <optgroup label={`Autres Matchs du Club (${otherMatches.length})`}>
                  {otherMatches.map(m => {
                    const oppName = getOpponentName(m.opponent_id);
                    const statusFr = m.status === 'completed' ? 'Terminé' : m.status === 'live' ? 'En Direct' : 'Planifié';
                    return (
                      <option key={m.id} value={m.id}>
                        ⚽ {m.category} • {m.match_date} — vs {oppName} ({statusFr})
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>

            {matchId ? (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Joueurs rattachés au match <strong>{matches.find(m => m.id === matchId)?.category}</strong> contre <strong>{getOpponentName(matches.find(m => m.id === matchId)?.opponent_id)}</strong> avec mention « Sous Test ».
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-200 text-emerald-950 shrink-0 ml-2">
                  Synchronisé
                </span>
              </div>
            ) : (
              <p className="text-[10px] text-indigo-700/90 italic">
                💡 Sélectionnez un match pour synchroniser automatiquement la date, l'horaire et le stade de la rencontre.
              </p>
            )}
          </div>

          {/* 3. INTITULÉ DE LA SESSION */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Intitulé de la Session *
            </label>
            <input
              type="text"
              required
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="Ex: Match d'Essai U13 vs KAC Kénitra"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-800 outline-none focus:ring-2 ring-primary/20"
            />
          </div>

          {/* 4. DATE & CRÉNEAU HORAIRE (LIBREMENT MODIFIABLE) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              Date & Horaires du Test
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Date Prévue *</label>
                <input
                  type="date"
                  required
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Début</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Fin</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* 5. LIEU ET TERRAIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Complexe / Stade
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Complexe Sportif FUS - Académie"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Terrain d'Évaluation
              </label>
              <input
                type="text"
                value={trainingGround}
                onChange={(e) => setTrainingGround(e.target.value)}
                placeholder="Terrain Synthétique 1"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-bold text-slate-800"
              />
            </div>
          </div>

          {/* 6. CONSIGNES & PROGRAMME */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Consignes & Programme de Test
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Échauffement collectif 20 min, opposition 2×30 min avec le groupe U13..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:ring-2 ring-primary/20 resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : initialTest ? 'Mettre à jour la Session' : 'Valider la Planification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default TrialSessionModal;
