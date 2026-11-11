import React, { useMemo, useState } from 'react';
import { Check, Save, Sliders, Star, X } from 'lucide-react';
import {
  DynamicPerformanceEvaluator,
  type DynamicEvaluationChangePayload,
} from '../../../components/metrics/DynamicPerformanceEvaluator';
import {
  formatMatchEvaluationComment,
  parseMatchEvaluationComment,
} from '../../../utils/metricSetsHelpers';
import { useMetricSets } from '../../../hooks/useMetricSets';

export interface PlayerMatchEvaluationSaveData {
  rating: number;
  comment: string;
  mode: 'estimated' | 'detailed';
  metricSetId?: string | null;
  metricSetName?: string | null;
  positionCode?: string | null;
  pillarScores?: {
    technique: number;
    tactique: number;
    physique: number;
    mental: number;
  };
  criteriaScores?: Record<string, number>;
}

interface PlayerMatchEvaluationModalProps {
  player: {
    id: string;
    full_name: string;
    position?: string;
    photo_url?: string;
  } | null;
  matchInfo?: {
    id?: string;
    opponent_name?: string;
    match_date?: string;
    competition?: string;
    is_friendly?: boolean;
  };
  initialRating?: number | null;
  initialComment?: string | null;
  initialMode?: 'estimated' | 'detailed';
  initialPillarScores?: {
    metric_set_id?: string | null;
    position_code?: string | null;
    technique?: number;
    tactique?: number;
    physique?: number;
    mental?: number;
    criteria_scores?: Record<string, number>;
  } | null;
  onClose: () => void;
  onSave: (evalData: PlayerMatchEvaluationSaveData) => Promise<void>;
}

export const PlayerMatchEvaluationModal: React.FC<PlayerMatchEvaluationModalProps> = ({
  player,
  matchInfo,
  initialRating,
  initialComment,
  initialMode = 'estimated',
  initialPillarScores,
  onClose,
  onSave,
}) => {
  const { isScoutUser } = useMetricSets();

  const parsedInitial = useMemo(
    () => parseMatchEvaluationComment(initialComment),
    [initialComment]
  );

  const initialScore =
    initialRating != null && Number.isFinite(initialRating)
      ? Math.min(10, Math.max(1, Math.round(initialRating * 10) / 10))
      : null;

  const [mode, setMode] = useState<'estimated' | 'detailed'>(() =>
    isScoutUser ? 'estimated' : initialMode
  );
  const [rating, setRating] = useState<number | null>(initialScore);
  const [comment, setComment] = useState<string>(parsedInitial.textComment || '');
  const [dynamicResult, setDynamicResult] = useState<DynamicEvaluationChangePayload | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!player) return null;

  const effectiveMode = isScoutUser ? 'estimated' : mode;
  const activeScore =
    effectiveMode === 'detailed' && dynamicResult ? dynamicResult.global : rating;

  const handleSave = async () => {
    if (isSaving) return;
    const scoreToSave = activeScore;
    if (scoreToSave == null) return;

    setIsSaving(true);
    try {
      if (effectiveMode === 'detailed' && dynamicResult) {
        const pillars = {
          technique: dynamicResult.technique,
          tactique: dynamicResult.tactique,
          physique: dynamicResult.physique,
          mental: dynamicResult.mental,
        };
        const formattedComment = formatMatchEvaluationComment(
          comment,
          pillars,
          dynamicResult.metricSetName,
          dynamicResult.positionCode
        );
        await onSave({
          rating: dynamicResult.global,
          comment: formattedComment,
          mode: 'detailed',
          metricSetId: dynamicResult.metricSetId,
          metricSetName: dynamicResult.metricSetName,
          positionCode: dynamicResult.positionCode,
          pillarScores: pillars,
          criteriaScores: dynamicResult.criteriaScores,
        });
      } else {
        await onSave({
          rating: scoreToSave,
          comment: comment.trim(),
          mode: 'estimated',
        });
      }
      setSaveSuccess(true);
      window.setTimeout(onClose, 500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div
        className={`w-full ${
          effectiveMode === 'detailed' ? 'max-w-3xl' : 'max-w-md'
        } overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 my-4`}
      >
        <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-red-600">
              Performance Joueur • Match
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
              {player.full_name}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {[player.position, matchInfo?.opponent_name, matchInfo?.match_date]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6 max-h-[82vh] overflow-y-auto">
          {/* Sélecteur Note rapide vs Grille Performance Joueur (masqué pour Scouts) */}
          {!isScoutUser && (
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setMode('estimated')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                  effectiveMode === 'estimated'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-500" />
                Note rapide (1–10)
              </button>
              <button
                type="button"
                onClick={() => setMode('detailed')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                  effectiveMode === 'detailed'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                Grille Dynamique 4 Piliers
              </button>
            </div>
          )}

          {effectiveMode === 'estimated' ? (
            <>
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Choisissez une note de match
                </p>
                <div className="mt-2 text-5xl font-black text-red-600 dark:text-red-500">
                  {rating ?? '—'}
                  <span className="ml-1 text-lg font-bold text-slate-400">/10</span>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2" role="group" aria-label="Note de 1 à 10">
                {Array.from({ length: 10 }, (_, index) => index + 1).map(score => (
                  <button
                    key={score}
                    type="button"
                    aria-pressed={Math.round(rating ?? -1) === score}
                    onClick={() => setRating(score)}
                    className={`h-12 rounded-xl border text-base font-black transition ${
                      Math.round(rating ?? -1) === score
                        ? 'border-red-600 bg-red-600 text-white shadow-md shadow-red-600/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-red-300 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-red-700 dark:hover:bg-red-950/40'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <DynamicPerformanceEvaluator
              rubric="match"
              playerPosition={player.position}
              initialSetId={initialPillarScores?.metric_set_id}
              initialPositionCode={initialPillarScores?.position_code || parsedInitial.positionCode}
              initialCriteriaScores={initialPillarScores?.criteria_scores}
              initialPillarScores={
                initialPillarScores?.technique != null
                  ? {
                      technique: initialPillarScores.technique,
                      tactique: initialPillarScores.tactique,
                      physique: initialPillarScores.physique,
                      mental: initialPillarScores.mental,
                    }
                  : parsedInitial.pillars
              }
              onChange={setDynamicResult}
            />
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
              Observation staff (optionnel)
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Points forts, axes de progression sur le match..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={activeScore == null || isSaving || saveSuccess}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saveSuccess
                ? 'Enregistré'
                : `Enregistrer (${activeScore != null ? `${activeScore}/10` : '—'})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerMatchEvaluationModal;
