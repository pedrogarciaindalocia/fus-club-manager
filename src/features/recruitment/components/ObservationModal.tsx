import React, { useState } from 'react';
import type { ScoutObservation, TrialCandidate, Scout } from '../types/recruitment';
import { X, FileText, Sparkles, Video, FileCheck, Shield, CheckCircle2 } from 'lucide-react';
import { UNIFIED_POSITION_OPTIONS, formatUnifiedPosition } from '../../../constants/positions';

interface ObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: TrialCandidate;
  scouts: Scout[];
  onSave: (obs: Omit<ScoutObservation, 'id' | 'created_at'>) => Promise<void>;
}

export const ObservationModal: React.FC<ObservationModalProps> = ({
  isOpen,
  onClose,
  candidate,
  scouts,
  onSave,
}) => {
  const [scoutId, setScoutId] = useState(scouts[0]?.id || '');
  const [observationDate, setObservationDate] = useState(new Date().toISOString().split('T')[0]);
  const [competitionName, setCompetitionName] = useState('Championnat Régional / Tournoi');
  const [matchName, setMatchName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [location, setLocation] = useState('');
  const [observedPosition, setObservedPosition] = useState(formatUnifiedPosition(candidate.primary_position));
  const [minutesObserved, setMinutesObserved] = useState(90);
  const [generalImpression, setGeneralImpression] = useState('');
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [potentialRating, setPotentialRating] = useState(8);
  const [recommendationVerdict, setRecommendationVerdict] = useState('Convocation Immédiate pour Test Académie');
  const [comments, setComments] = useState('');
  const [videoLinks, setVideoLinks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const selectedScout = scouts.find(s => s.id === scoutId);

    try {
      await onSave({
        candidate_id: candidate.id,
        scout_id: scoutId || undefined,
        scout_name: selectedScout?.full_name || 'Scout Officiel',
        observation_date: observationDate,
        competition_name: competitionName,
        match_name: matchName || undefined,
        opponent_name: opponentName || undefined,
        location: location || undefined,
        observed_position: observedPosition,
        minutes_observed: Number(minutesObserved),
        general_impression: generalImpression.trim() || undefined,
        strengths: strengths.trim() || undefined,
        weaknesses: weaknesses.trim() || undefined,
        potential_rating: Number(potentialRating),
        recommendation_verdict: recommendationVerdict,
        comments: comments.trim() || undefined,
        video_links: videoLinks ? videoLinks.split(',').map(s => s.trim()).filter(Boolean) : [],
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Rapport d'Observation Match : {candidate.first_name} {candidate.last_name}
            </h3>
            <p className="text-xs text-muted-foreground">
              Compte-rendu de terrain établi par la cellule de scouting FUS.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Scout Observateur *</label>
              <select
                value={scoutId}
                onChange={(e) => setScoutId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {scouts.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.recruitment_region})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Date d'Observation *</label>
              <input
                type="date"
                required
                value={observationDate}
                onChange={(e) => setObservationDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Compétition / Tournoi</label>
              <input
                type="text"
                value={competitionName}
                onChange={(e) => setCompetitionName(e.target.value)}
                placeholder="Ex: Championnat National U17"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Affiche du Match Observé</label>
              <input
                type="text"
                value={matchName}
                onChange={(e) => setMatchName(e.target.value)}
                placeholder="Ex: AMF U17 vs KAC U17"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Poste Observé *</label>
              <select
                value={observedPosition}
                onChange={(e) => setObservedPosition(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-bold text-slate-800 cursor-pointer"
              >
                {UNIFIED_POSITION_OPTIONS.map(p => (
                  <option key={p.code} value={p.full}>
                    {p.full}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Minutes Jouées</label>
              <input
                type="number"
                value={minutesObserved}
                onChange={(e) => setMinutesObserved(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Potentiel (1 à 10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={potentialRating}
                onChange={(e) => setPotentialRating(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Impression Générale du Scout</label>
            <textarea
              rows={2}
              value={generalImpression}
              onChange={(e) => setGeneralImpression(e.target.value)}
              placeholder="Attitude sur le terrain, impact dans le match, comportement tactique..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Points Forts Remarqués</label>
              <textarea
                rows={2}
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="Ex: Vitesse, vision, pied gauche..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Axes d'Amélioration</label>
              <textarea
                rows={2}
                value={weaknesses}
                onChange={(e) => setWeaknesses(e.target.value)}
                placeholder="Ex: Repli défensif..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Verdict & Recommandation Scout</label>
            <input
              type="text"
              value={recommendationVerdict}
              onChange={(e) => setRecommendationVerdict(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Liens Vidéos & Séquences (Séparés par virgules)</label>
            <input
              type="text"
              value={videoLinks}
              onChange={(e) => setVideoLinks(e.target.value)}
              placeholder="https://youtube.com/watch?v=..., https://wyscout.com/..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer le Rapport'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default ObservationModal;
