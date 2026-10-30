import React, { useState } from 'react';
import { Check, Save, X } from 'lucide-react';

interface PlayerMatchEvaluationModalProps {
  player: {
    id: string;
    full_name: string;
    position?: string;
    photo_url?: string;
  } | null;
  matchInfo?: {
    opponent_name?: string;
    match_date?: string;
    competition?: string;
    is_friendly?: boolean;
  };
  initialRating?: number | null;
  onClose: () => void;
  onSave: (evalData: {
    rating: number;
    comment: string;
    mode: 'estimated';
  }) => Promise<void>;
}

export const PlayerMatchEvaluationModal: React.FC<PlayerMatchEvaluationModalProps> = ({
  player,
  matchInfo,
  initialRating,
  onClose,
  onSave,
}) => {
  const initialScore = initialRating != null && Number.isFinite(initialRating)
    ? Math.min(10, Math.max(1, Math.round(initialRating)))
    : null;
  const [rating, setRating] = useState<number | null>(initialScore);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!player) return null;

  const handleSave = async () => {
    if (rating == null || isSaving) return;
    setIsSaving(true);
    try {
      await onSave({ rating, comment: '', mode: 'estimated' });
      setSaveSuccess(true);
      window.setTimeout(onClose, 500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-red-600">Note du joueur</p>
            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{player.full_name}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {[player.position, matchInfo?.match_date].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Choisissez une seule note</p>
            <div className="mt-2 text-5xl font-black text-red-600 dark:text-red-500">
              {rating ?? '—'}<span className="ml-1 text-lg font-bold text-slate-400">/10</span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2" role="group" aria-label="Note de 1 à 10">
            {Array.from({ length: 10 }, (_, index) => index + 1).map(score => (
              <button
                key={score}
                type="button"
                aria-pressed={rating === score}
                onClick={() => setRating(score)}
                className={`h-12 rounded-xl border text-base font-black transition ${rating === score
                  ? 'border-red-600 bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-red-300 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-red-700 dark:hover:bg-red-950/40'
                }`}
              >
                {score}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={rating == null || isSaving || saveSuccess}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saveSuccess ? 'Enregistré' : 'Enregistrer la note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerMatchEvaluationModal;
