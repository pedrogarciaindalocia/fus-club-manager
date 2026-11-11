import React, { useEffect, useState } from 'react';
import { Calendar, Check, Save, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import PlayerMentionsChart from '../../../components/PlayerMentionsChart';
import {
  getLatestMention,
  getMentionMeta,
  isShortlistSurclassement,
  MENTION_OPTIONS,
  normalizeMentionDate,
  type MentionLevel,
  type MentionTimelinePoint,
  type PlayerMentionEntry,
} from '../../../utils/playerMentionsHelper';

export interface PlayerMentionModalPlayer {
  id: string;
  full_name: string;
  position?: string;
  jersey_number?: number | null;
  age_category?: string;
  photo_url?: string | null;
}

interface PlayerMentionModalProps {
  player: PlayerMentionModalPlayer | null;
  targetCategory: string;
  mentions: PlayerMentionEntry[];
  isSaving: boolean;
  onSave: (payload: {
    player_id: string;
    mention: MentionLevel;
    mention_date: string;
    comment?: string;
  }) => Promise<any>;
  onDelete: (payload: {
    id: string;
    entryPlayerId?: string;
    mentionDate?: string;
  }) => Promise<any>;
  onClose: () => void;
}

export const PlayerMentionModal: React.FC<PlayerMentionModalProps> = ({
  player,
  targetCategory,
  mentions,
  isSaving,
  onSave,
  onDelete,
  onClose,
}) => {
  const todayIso = new Date().toISOString().split('T')[0];

  const [selectedMention, setSelectedMention] = useState<MentionLevel>('assez_bien');
  const [mentionDate, setMentionDate] = useState<string>(todayIso);
  const [comment, setComment] = useState<string>('');
  const [justSaved, setJustSaved] = useState<boolean>(false);

  // Synchronise les champs lors de l'ouverture ou d'un changement de date si une mention existe déjà ce jour-là
  useEffect(() => {
    if (!player) return;
    const latest = getLatestMention(mentions);
    const matchingForDate = mentions.find(
      m => normalizeMentionDate(m.mention_date) === normalizeMentionDate(mentionDate)
    );
    if (matchingForDate) {
      setSelectedMention(matchingForDate.mention);
      setComment(matchingForDate.comment || '');
    } else if (latest && mentionDate === todayIso) {
      setSelectedMention(latest.mention);
      setComment('');
    }
  }, [player?.id, mentionDate, mentions]);

  if (!player) return null;

  const latestMention = getLatestMention(mentions);
  const latestMeta = latestMention ? getMentionMeta(latestMention.mention) : null;
  const isSurclasse = isShortlistSurclassement(player.age_category, targetCategory);
  const hasEntryForSelectedDate = mentions.some(
    m => normalizeMentionDate(m.mention_date) === normalizeMentionDate(mentionDate)
  );

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    try {
      await onSave({
        player_id: player.id,
        mention: selectedMention,
        mention_date: normalizeMentionDate(mentionDate),
        comment: comment.trim(),
      });
      setJustSaved(true);
      toast.success(
        `Mention « ${getMentionMeta(selectedMention).label} » enregistrée pour ${player.full_name} (${normalizeMentionDate(mentionDate)})`
      );
      window.setTimeout(() => setJustSaved(false), 1800);
    } catch (err: any) {
      toast.error(`Erreur lors de l'enregistrement : ${err?.message || 'Erreur inconnue'}`);
    }
  };

  const handleSelectChartEntry = (point: MentionTimelinePoint) => {
    setMentionDate(point.mention_date);
    setSelectedMention(point.mention);
    setComment(point.comment || '');
  };

  const handleDeleteChartEntry = async (point: MentionTimelinePoint) => {
    try {
      await onDelete({
        id: point.id,
        entryPlayerId: player.id,
        mentionDate: point.mention_date,
      });
      toast.success(`Mention du ${point.fullDateLabel} supprimée`);
    } catch (err: any) {
      toast.error(`Erreur suppression : ${err?.message || 'Erreur inconnue'}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header joueur */}
        <div className="flex items-start justify-between gap-4 border-b border-emerald-800/30 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-5 text-white">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-2 border-white/25 bg-white/10 shadow-lg">
              <img
                src={
                  player.photo_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=047857&color=fff&size=140`
                }
                alt={player.full_name}
                className="h-full w-full object-cover"
                onError={event => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/assets/avatar.svg';
                }}
              />
            </div>

            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-300">
                  <ShieldCheck className="h-3 w-3" /> {player.age_category || 'PRO'}
                </span>
                {isSurclasse && (
                  <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-black text-amber-300">
                    Surclassement Shortlist → {targetCategory}
                  </span>
                )}
                {latestMeta && (
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${latestMeta.badgeClass}`}>
                    Actuelle : {latestMeta.label}
                  </span>
                )}
              </div>
              <h3 className="truncate text-lg font-black text-white">{player.full_name}</h3>
              <p className="text-xs text-slate-300">
                Poste : {player.position || '—'}
                {player.jersey_number ? ` · #${player.jersey_number}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 rounded-xl bg-slate-800/80 p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corps scrollable : Formulaire Mention + Date puis Courbe */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <form onSubmit={handleSaveSubmit} className="space-y-4">
            {/* 5 Mentions */}
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Mention d'évaluation
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {MENTION_OPTIONS.map(opt => {
                  const isActive = selectedMention === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedMention(opt.id)}
                      aria-pressed={isActive}
                      className={`rounded-2xl border-2 px-3 py-3 text-center text-xs font-black transition-all cursor-pointer ${
                        isActive
                          ? opt.activeButtonClass
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date + Commentaire */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                  Date de la mention
                </label>
                <input
                  type="date"
                  required
                  value={mentionDate}
                  onChange={e => setMentionDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Observation (optionnel)
                </label>
                <input
                  type="text"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Remarque sur le niveau du jour..."
                  className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {hasEntryForSelectedDate
                  ? `Une mention existe déjà le ${normalizeMentionDate(mentionDate)} : l'enregistrement la mettra à jour.`
                  : 'Chaque date crée un nouveau point sur la courbe ci-dessous.'}
              </span>

              <button
                type="submit"
                disabled={isSaving}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-md transition hover:bg-emerald-500 active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {justSaved ? (
                  <>
                    <Check className="h-4 w-4" />
                    Enregistrée
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isSaving
                      ? 'Enregistrement...'
                      : hasEntryForSelectedDate
                      ? 'Mettre à jour'
                      : 'Enregistrer la mention'}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Courbe d'évolution en fonction de la date */}
          <PlayerMentionsChart
            mentions={mentions}
            height={210}
            title="Évolution des mentions en fonction de la date"
            emptyMessage="Enregistrez une première mention datée ci-dessus pour tracer la courbe."
            onSelectEntry={handleSelectChartEntry}
            onDeleteEntry={handleDeleteChartEntry}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-5 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerMentionModal;

