import React, { useState, useEffect } from 'react';
import { Video, X, Check, ExternalLink, Trash2, AlertCircle, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { recruitmentService } from '../services/recruitmentService';
import type { TrialCandidate } from '../types/recruitment';

interface CandidateDriveLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: TrialCandidate | null;
  onSuccess?: () => void;
}

export const CandidateDriveLinkModal: React.FC<CandidateDriveLinkModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onSuccess,
}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (candidate) {
      setVideoUrl(candidate.video_url || '');
    }
  }, [candidate, isOpen]);

  if (!isOpen || !candidate) return null;

  const trimmedUrl = videoUrl.trim();
  const isDrive = trimmedUrl.includes('drive.google.com');
  const isYouTube = trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const cleanUrl = trimmedUrl || null;
      const videoType = cleanUrl
        ? (cleanUrl.includes('drive.google.com') ? 'drive' : cleanUrl.includes('youtu') ? 'youtube' : 'drive')
        : 'none';

      await recruitmentService.updateCandidate(candidate.id, {
        video_url: cleanUrl || undefined,
        video_type: videoType,
      });

      toast.success(cleanUrl ? 'Lien vidéo Google Drive enregistré avec succès !' : 'Lien vidéo retiré');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour du lien vidéo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    setIsSubmitting(true);
    try {
      await recruitmentService.updateCandidate(candidate.id, {
        video_url: undefined,
        video_type: 'none',
      });
      toast.success('Lien vidéo supprimé');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error('Erreur lors de la suppression du lien');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-white">
        {/* Header */}
        <div className="p-5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 inline-block mb-0.5">
                Action Spécifique • Lien Drive
              </span>
              <h3 className="text-base font-black text-white truncate">
                {candidate.first_name} {candidate.last_name}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {candidate.primary_position} • {candidate.age_category || 'U19'} • {candidate.current_club || 'Club non renseigné'}
              </p>
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
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-emerald-400" />
              Lien de la Vidéo Google Drive
            </label>
            <div className="relative">
              <input
                type="url"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white placeholder-slate-500 text-xs font-mono outline-hidden transition-all"
                autoFocus
              />
              {trimmedUrl && (
                <a
                  href={trimmedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors p-1"
                  title="Tester le lien dans un nouvel onglet"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Validation & Guide Help */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1.5 text-xs">
            {isDrive ? (
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
                <Check className="w-3.5 h-3.5" />
                <span>Format Google Drive détecté et valide ✓</span>
              </div>
            ) : isYouTube ? (
              <div className="flex items-center gap-2 text-blue-400 font-bold text-[11px]">
                <Check className="w-3.5 h-3.5" />
                <span>Format YouTube détecté ✓</span>
              </div>
            ) : trimmedUrl ? (
              <div className="flex items-center gap-2 text-amber-400 font-medium text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Lien personnalisé (non standard Google Drive)</span>
              </div>
            ) : (
              <p className="text-slate-400 text-[11px]">
                Collez ici le lien de partage du fichier vidéo stocké sur Google Drive.
              </p>
            )}
            <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-700/60 pt-1.5">
              💡 <strong>Recommandation Google Drive :</strong> Configurez l'accès au fichier sur <em>« Tous les utilisateurs disposant du lien (Lecteur) »</em> pour que la vidéo soit directement lisible en streaming par le staff.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-between gap-2">
            {candidate.video_url ? (
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
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
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
export default CandidateDriveLinkModal;
