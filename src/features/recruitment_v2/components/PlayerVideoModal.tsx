import React, { useState } from 'react';
import { X, ExternalLink, Video, Sparkles, Download, RefreshCw, Info, Edit3 } from 'lucide-react';
import { usePermissions } from '../../../context/PermissionsContext';
import { isScoutBranch } from '../../../constants/roles';
import type { TrialCandidate } from '../types/recruitment';

interface PlayerVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: TrialCandidate | null;
  onEditLink?: (candidate: TrialCandidate) => void;
}

export const PlayerVideoModal: React.FC<PlayerVideoModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onEditLink,
}) => {
  const { authState } = usePermissions();
  const currentRole = authState.user?.system_role?.toLowerCase() || (authState.roles?.[0]?.toLowerCase() ?? '');
  const isSuperAdmin = !authState.isImpersonating && (currentRole === 'super_admin');
  const isScout = isScoutBranch(currentRole, authState.user?.job_title);
  // Télécharger et Lien direct masqués pour la cellule Scout (notamment Scout Manager)
  const canDownloadAndOpenDirect = isSuperAdmin || (!isScout && currentRole === 'admin');

  const [reloadKey, setReloadKey] = useState(0);
  const [isReloading, setIsReloading] = useState(false);

  if (!isOpen || !candidate || !candidate.video_url) return null;

  const url = candidate.video_url.trim();
  const isDrive = url.includes('drive.google.com');
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

  const extractYouTubeId = (rawUrl: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = rawUrl.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const extractDriveId = (rawUrl: string): string | null => {
    const match1 = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1 && match1[1]) return match1[1];
    const match2 = rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2 && match2[1]) return match2[1];
    return null;
  };

  const driveId = isDrive ? extractDriveId(url) : null;
  const driveDownloadUrl = driveId
    ? `https://drive.google.com/uc?export=download&id=${driveId}`
    : url;

  const getEmbedSrc = () => {
    if (isDrive) {
      if (driveId) {
        return `https://drive.google.com/file/d/${driveId}/preview`;
      }
      return url.replace('/view', '/preview').replace('?usp=sharing', '');
    }
    if (isYouTube) {
      const ytId = extractYouTubeId(url);
      return ytId ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&autoplay=1` : url;
    }
    return url;
  };

  const handleRefresh = () => {
    setIsReloading(true);
    setReloadKey(prev => prev + 1);
    setTimeout(() => setIsReloading(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-white">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white">
                  {candidate.first_name} {candidate.last_name}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black">
                  Vidéo Détection & Highlights
                </span>
                {candidate.reference_player_style && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    Style : {candidate.reference_player_style}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {candidate.primary_position} • {candidate.age_category || 'U19'} • {candidate.current_club || 'Club actuel non renseigné'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canDownloadAndOpenDirect && isDrive && (
              <a
                href={driveDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 transition-colors shadow-sm"
                title="Télécharger la vidéo directement depuis Google Drive"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Télécharger</span>
              </a>
            )}

            <button
              onClick={handleRefresh}
              className="px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Recharger le lecteur vidéo"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Actualiser</span>
            </button>

            {canDownloadAndOpenDirect && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold text-white flex items-center gap-1.5 transition-colors"
                title="Ouvrir le lien Google Drive original dans un nouvel onglet"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lien direct</span>
              </a>
            )}

            {onEditLink && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditLink(candidate);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Modifier le lien vidéo Google Drive"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Modifier</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Fermer le lecteur"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Processing Banner for Google Drive */}
        {isDrive && (
          <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-amber-200/90 gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Traitement Google Drive :</strong> Si le lecteur indique que la vidéo est <em>en cours de traitement</em>, Google encode le streaming web (5 à 15 min après téléversement). Vous pouvez <strong>télécharger</strong> le fichier pour le lire tout de suite ou <strong>actualiser</strong> dans un instant.
              </span>
            </div>
            <a
              href={driveDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] shrink-0 transition-colors"
            >
              <Download className="w-3 h-3" />
              Télécharger sans attendre
            </a>
          </div>
        )}

        {/* Video Player Embed (16/9) */}
        <div className="relative bg-black flex-1 flex items-center justify-center min-h-[320px] sm:min-h-[460px]">
          <iframe
            key={reloadKey}
            src={getEmbedSrc()}
            title={`Vidéo de ${candidate.first_name} ${candidate.last_name}`}
            className="w-full h-full min-h-[320px] sm:min-h-[460px] border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Footer info */}
        <div className="p-3.5 px-5 bg-slate-800/80 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <span>
            {isDrive ? 'Lecteur officiel Google Drive FUS Scouting' : 'Lecteur Vidéo Détection FUS'}
          </span>
          <span className="text-[11px] text-slate-500">
            Conseil : Vérifiez que l'accès au fichier Drive est configuré sur « Tous les utilisateurs avec le lien » pour lecture instantanée.
          </span>
        </div>
      </div>
    </div>
  );
};
