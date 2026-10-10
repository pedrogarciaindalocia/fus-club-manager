import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import {
  AlertTriangle,
  Trash2,
  Calendar,
  ShieldAlert,
  Loader2,
  Check,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Users
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { Match } from '../../../types';

interface DeleteMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  match?: Match | null;
  matchCount?: number;
  opponentName?: string;
  category?: string;
}

export const DeleteMatchModal: React.FC<DeleteMatchModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  match,
  matchCount = 1,
  opponentName,
  category,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset acknowledged state whenever the modal opens or target match changes
  useEffect(() => {
    if (isOpen) {
      setAcknowledged(false);
      setIsDeleting(false);
    }
  }, [isOpen, match?.id]);

  const isBulk = matchCount > 1;

  const handleConfirm = async () => {
    if (!acknowledged || isDeleting) return;
    try {
      setIsDeleting(true);
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  const formattedDate = match?.match_date
    ? new Date(match.match_date).toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden">
        {/* Header with warning icon and title */}
        <DialogHeader className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 ring-8 ring-red-50 dark:ring-red-950/20 shadow-sm animate-pulse">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div>
            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {isBulk
                ? `Supprimer définitivement ${matchCount} matches ?`
                : 'Supprimer définitivement ce match ?'}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              Cette action est irréversible et aura un impact sur les statistiques associées.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Match info pill if single match */}
        {!isBulk && match && (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex flex-col">
              <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                FUS Rabat vs {opponentName || match.opponent_club?.name || 'Adversaire'}
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px] flex items-center gap-1.5 mt-0.5">
                {formattedDate && (
                  <>
                    <Calendar className="w-3.5 h-3.5 inline text-slate-400" />
                    <span>{formattedDate}</span>
                  </>
                )}
                <span>•</span>
                <span className="uppercase font-bold text-primary">
                  {category || match.category || 'Équipe'}
                </span>
                {match.competition && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[120px]">{match.competition}</span>
                  </>
                )}
              </span>
            </div>

            {match.status && (
              <span
                className={cn(
                  'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0',
                  match.status === 'finished'
                    ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    : match.status === 'live'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 animate-pulse'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                )}
              >
                {match.status === 'finished'
                  ? 'Terminé'
                  : match.status === 'live'
                  ? 'En direct'
                  : 'À venir'}
              </span>
            )}
          </div>
        )}

        {/* Warning & consequences section */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-black uppercase tracking-wider text-[11px]">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Conséquences de la suppression :</span>
          </div>

          <div className="rounded-2xl border border-red-200/80 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-3.5 space-y-2 text-slate-700 dark:text-slate-300">
            <div className="flex items-start gap-2.5 leading-snug">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <span>
                <strong className="text-red-700 dark:text-red-300">Événements du match :</strong>{' '}
                Tous les buts, cartons, passes décisives et remplacements seront{' '}
                <strong>définitivement supprimés</strong>.
              </span>
            </div>

            <div className="flex items-start gap-2.5 leading-snug">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <span>
                <strong className="text-red-700 dark:text-red-300">Statistiques joueurs :</strong>{' '}
                Les compteurs cumulés (temps de jeu, buts, matches joués) seront{' '}
                <strong>recalculés et décrémentés (ou remis à 0)</strong>.
              </span>
            </div>

            <div className="flex items-start gap-2.5 leading-snug">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <span>
                <strong className="text-red-700 dark:text-red-300">Feuille de match & Notes :</strong>{' '}
                La composition (titulaires/remplaçants) et les évaluations du staff seront effacées.
              </span>
            </div>

            <div className="pt-1.5 mt-1.5 border-t border-red-200/60 dark:border-red-900/30 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                <em>Note : Les fiches des joueurs et les équipes ne sont pas supprimées.</em>
              </span>
            </div>
          </div>
        </div>

        {/* Safety checkbox acknowledgement layer */}
        <div
          onClick={() => !isDeleting && setAcknowledged(!acknowledged)}
          className={cn(
            'flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none',
            acknowledged
              ? 'border-red-500 bg-red-50/70 dark:bg-red-950/40 ring-1 ring-red-500/30 shadow-sm'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700'
          )}
        >
          <div
            className={cn(
              'w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors',
              acknowledged
                ? 'bg-red-600 border-red-600 text-white'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
            )}
          >
            {acknowledged && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
          <div className="flex flex-col">
            <span
              className={cn(
                'text-xs font-bold leading-snug',
                acknowledged
                  ? 'text-red-900 dark:text-red-200'
                  : 'text-slate-700 dark:text-slate-300'
              )}
            >
              Je reconnais et j'accepte les conséquences
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
              Je comprends que tous les buts, événements et statistiques liés seront définitivement supprimés et remis à zéro.
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={onClose}
            className="flex-1 sm:flex-none h-11 px-5 rounded-2xl font-bold text-xs uppercase tracking-wider border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!acknowledged || isDeleting}
            onClick={handleConfirm}
            className={cn(
              'flex-1 sm:flex-none h-11 px-6 rounded-2xl font-black text-xs uppercase tracking-wider gap-2 shadow-lg transition-all',
              acknowledged
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
            )}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Suppression en cours...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Supprimer définitivement</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteMatchModal;
