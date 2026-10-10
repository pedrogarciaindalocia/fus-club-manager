import React, { useState, useEffect } from 'react';
import { Video, X, Check, ExternalLink, Trash2, AlertCircle, Link2, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { matchService } from '../../../services/matchService';
import type { Match } from '../../../types';

interface MatchDriveVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  opponentName?: string;
  onSuccess?: (newUrl: string | null) => void;
}

export const extractDriveId = (rawUrl: string): string | null => {
  if (!rawUrl) return null;
  const match1 = rawUrl.match(/\/(?:file\/)?(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
  if (match1 && match1[1]) return match1[1];
  const match2 = rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2 && match2[1]) return match2[1];
  const match3 = rawUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match3 && match3[1]) return match3[1];
  return null;
};

export const extractYouTubeId = (rawUrl: string): string | null => {
  if (!rawUrl) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = rawUrl.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const MatchDriveVideoModal: React.FC<MatchDriveVideoModalProps> = ({
  isOpen,
  onClose,
  match,
  opponentName = 'Adversaire',
  onSuccess,
}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (match) {
      setVideoUrl((match as any)?.video_url || '');
    }
  }, [match, isOpen]);

  if (!isOpen || !match) return null;

  const trimmedUrl = videoUrl.trim();
  const driveId = extractDriveId(trimmedUrl);
  const ytId = extractYouTubeId(trimmedUrl);
  const isDrive = Boolean(driveId) || trimmedUrl.includes('drive.google.com');
  const isYouTube = Boolean(ytId) || trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be');

  const previewSrc = driveId 
    ? `https://drive.google.com/file/d/${driveId}/preview`
    : ytId
    ? `https://www.youtube.com/embed/${ytId}?rel=0`
    : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const cleanUrl = trimmedUrl || null;
      await matchService.updateMatch(match.id, {
        video_url: cleanUrl,
      } as any);

      toast.success(cleanUrl ? 'Lien vidéo post-match enregistré avec succès !' : 'Lien vidéo retiré');
      if (onSuccess) onSuccess(cleanUrl);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Erreur lors de la sauvegarde du lien vidéo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    setIsSubmitting(true);
    try {
      await matchService.updateMatch(match.id, {
        video_url: null,
      } as any);
      setVideoUrl('');
      toast.success('Lien vidéo post-match supprimé');
      if (onSuccess) onSuccess(null);
      onClose();
    } catch (err) {
      toast.error('Erreur lors de la suppression du lien vidéo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-white">
        
        {/* Header */}
        <div className="p-5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                  Post-Match • Résumé Vidéo
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {match.match_date}
                </span>
              </div>
              <h3 className="text-base font-black text-white truncate mt-0.5">
                FUS Rabat vs {opponentName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-indigo-400" />
              Lien du Résumé Vidéo (Google Drive recommandé)
            </label>
            <div className="relative">
              <input
                type="url"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-500 text-xs font-mono outline-hidden transition-all pr-10"
                autoFocus
              />
              {trimmedUrl && (
                <a
                  href={trimmedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-400 transition-colors p-1"
                  title="Ouvrir le lien dans un nouvel onglet"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Player Preview */}
          {previewSrc ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-emerald-400" /> Aperçu du lecteur
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {isDrive ? 'Google Drive Stream' : 'YouTube Stream'}
                </span>
              </div>
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-700 bg-black shadow-inner">
                <iframe
                  src={previewSrc}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Aperçu vidéo post-match"
                />
              </div>
            </div>
          ) : trimmedUrl ? (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Format d'URL non reconnu comme lecteur embed Google Drive ou YouTube direct. Assurez-vous d'un lien standard avec identifiant.</span>
            </div>
          ) : null}

          {/* Validation & Guide Help */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1.5 text-xs">
            {isDrive ? (
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
                <Check className="w-3.5 h-3.5" />
                <span>Lien Google Drive valide et compatible avec l'application mobile ✓</span>
              </div>
            ) : isYouTube ? (
              <div className="flex items-center gap-2 text-blue-400 font-bold text-[11px]">
                <Check className="w-3.5 h-3.5" />
                <span>Format YouTube détecté ✓</span>
              </div>
            ) : (
              <p className="text-slate-400 text-[11px]">
                Collez le lien de partage Google Drive du résumé de match. Ce lien sera synchronisé avec l'application mobile <strong>fus-app</strong>.
              </p>
            )}
            <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-700/60 pt-1.5">
              💡 <strong>Accès Google Drive :</strong> Configurez le partage sur <em>« Tous les utilisateurs disposant du lien (Lecteur) »</em> pour un streaming direct sans invite de connexion.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-between gap-2">
            {(match as any)?.video_url ? (
              <button
                type="button"
                onClick={handleClear}
                disabled={isSubmitting}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Enregistrer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
