import React, { useState, useEffect } from 'react';
import { 
  Video, 
  ExternalLink, 
  Play, 
  Save, 
  Trash2, 
  Edit3, 
  Link2, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  X,
  Film,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { matchService } from '../../../services/matchService';
import { extractDriveId, extractYouTubeId } from './MatchDriveVideoModal';
import type { Match } from '../../../types';

interface MatchDriveVideoCardProps {
  match: Match;
  currentVideoUrl: string | null;
  onVideoUpdated: (newUrl: string | null) => void;
  onOpenModal?: () => void;
}

export const MatchDriveVideoCard: React.FC<MatchDriveVideoCardProps> = ({
  match,
  currentVideoUrl,
  onVideoUpdated,
  onOpenModal,
}) => {
  const [urlInput, setUrlInput] = useState(currentVideoUrl || '');
  const [isEditing, setIsEditing] = useState(!currentVideoUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    setUrlInput(currentVideoUrl || '');
    if (!currentVideoUrl) {
      setIsEditing(true);
      setShowPlayer(false);
    } else {
      setIsEditing(false);
    }
  }, [currentVideoUrl, match?.id]);

  const trimmed = (urlInput || '').trim();
  const driveId = extractDriveId(trimmed || currentVideoUrl || '');
  const ytId = extractYouTubeId(trimmed || currentVideoUrl || '');
  const activeUrl = currentVideoUrl || trimmed;
  const isDrive = Boolean(driveId) || activeUrl.includes('drive.google.com');
  const isYouTube = Boolean(ytId) || activeUrl.includes('youtube.com') || activeUrl.includes('youtu.be');

  const previewSrc = driveId 
    ? `https://drive.google.com/file/d/${driveId}/preview`
    : ytId
    ? `https://www.youtube.com/embed/${ytId}?rel=0`
    : null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!match?.id) return;

    setIsSaving(true);
    try {
      const cleanUrl = trimmed ? trimmed : null;
      await matchService.updateMatch(match.id, {
        video_url: cleanUrl,
      } as any);

      toast.success(cleanUrl ? 'Lien vidéo Google Drive enregistré !' : 'Lien vidéo retiré');
      onVideoUpdated(cleanUrl);
      setIsEditing(false);
    } catch (err: any) {
      console.error('[MatchDriveVideoCard] Erreur sauvegarde vidéo:', err);
      toast.error('Erreur lors de la sauvegarde du lien vidéo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!match?.id) return;
    if (!window.confirm('Voulez-vous vraiment détacher le lien vidéo de ce match ?')) return;

    setIsSaving(true);
    try {
      await matchService.updateMatch(match.id, {
        video_url: null,
      } as any);

      toast.success('Lien vidéo supprimé');
      setUrlInput('');
      onVideoUpdated(null);
      setIsEditing(true);
      setShowPlayer(false);
    } catch (err: any) {
      console.error('[MatchDriveVideoCard] Erreur suppression vidéo:', err);
      toast.error('Erreur lors de la suppression du lien');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden transition-all duration-300">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Vidéo du Match
              </h3>
              {currentVideoUrl ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {isDrive ? 'Google Drive' : isYouTube ? 'YouTube' : 'Lien Actif'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  À configurer
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Lien vidéo du match complet ou des temps forts (Drive / Web)
            </p>
          </div>
        </div>

        {/* Actions rapides header */}
        <div className="flex items-center gap-1.5">
          {currentVideoUrl && !isEditing && (
            <>
              <button
                type="button"
                onClick={() => setShowPlayer(!showPlayer)}
                className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  showPlayer
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200'
                }`}
                title={showPlayer ? "Fermer le lecteur" : "Visionner la vidéo"}
              >
                <Play className="w-3 h-3 fill-current" />
                <span className="hidden sm:inline">{showPlayer ? 'Masquer' : 'Visionner'}</span>
              </button>

              <a
                href={currentVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
                title="Ouvrir dans Google Drive (nouvel onglet)"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="hidden sm:inline">Ouvrir</span>
              </a>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Modifier le lien"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-3">
        {/* Mode Saisie / Édition */}
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                  Lien de partage de la vidéo (Google Drive)
                </span>
                {currentVideoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setUrlInput(currentVideoUrl || '');
                      setIsEditing(false);
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Annuler
                  </button>
                )}
              </label>

              <div className="relative">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://drive.google.com/file/d/... ou lien YouTube"
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-slate-900 placeholder:text-slate-400"
                />
                {urlInput && (
                  <button
                    type="button"
                    onClick={() => setUrlInput('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Aide Drive */}
            <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[10px] text-indigo-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
                <span>Comment partager depuis Google Drive ?</span>
              </div>
              <p className="text-indigo-700/90 leading-relaxed pl-4">
                Dans Google Drive, faites un <strong>clic droit sur la vidéo</strong> &gt; <strong>Partager</strong> &gt; passez l'accès général sur <strong>« Tous les utilisateurs disposant du lien »</strong>, puis copiez et collez le lien ici.
              </p>
            </div>

            {/* Boutons d'action enregistrement */}
            <div className="flex items-center justify-between pt-1">
              {currentVideoUrl ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Enregistrer le lien
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Mode Affichage du lien configuré */
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="min-w-0 flex-1 pr-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Lien enregistré
                </span>
                <p className="text-xs font-mono text-slate-700 truncate font-medium">
                  {currentVideoUrl}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                  title="Modifier le lien"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                  title="Supprimer le lien"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Lecteur Vidéo dépliable si demandé */}
            {showPlayer && (
              <div className="rounded-xl overflow-hidden border border-slate-200 shadow-md bg-black">
                {previewSrc ? (
                  <div className="relative w-full aspect-video">
                    <iframe
                      src={previewSrc}
                      title="Vidéo du Match"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  </div>
                ) : (
                  <div className="p-6 text-center text-white space-y-2">
                    <Video className="w-8 h-8 mx-auto text-slate-400" />
                    <p className="text-xs font-bold">Aperçu direct non intégrable pour cette URL</p>
                    <a
                      href={currentVideoUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Ouvrir dans Google Drive
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchDriveVideoCard;
