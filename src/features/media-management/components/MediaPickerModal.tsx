import React, { useState, useEffect, useRef } from 'react';
import {
  X, Folder, Image as ImageIcon, ChevronRight, Upload, Search,
  Check, Loader2, FolderPlus, ArrowLeft, Eye
} from 'lucide-react';
import { mediaService } from '../../../services/mediaService';
import type { MediaFolder, MediaFile } from '../../../services/mediaService';
import { Button } from '../../../components/ui/button';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (publicUrl: string) => void;
  title?: string;
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = 'Choisir une photo depuis la Médiathèque',
}) => {
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [allFiles, setAllFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, currentFolderId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allFldrs, currentFldrs, currentFl, allFl] = await Promise.all([
        mediaService.getAllFolders(),
        mediaService.getFolders(currentFolderId),
        mediaService.getFiles(currentFolderId),
        mediaService.getAllFiles(),
      ]);
      setFolders(currentFldrs);
      setFiles(currentFl);
      setAllFiles(allFl);
    } catch (err) {
      console.error('Erreur chargement médias:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Récupérer la hiérarchie pour le fil d'Ariane
  const buildBreadcrumbs = (): { id: string | null; name: string }[] => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Racine' }];
    if (!currentFolderId) return crumbs;

    const findFolder = (id: string, all: MediaFolder[]): MediaFolder | undefined =>
      all.find(f => f.id === id);

    let curr = findFolder(currentFolderId, folders);
    const pathStack: MediaFolder[] = [];
    while (curr) {
      pathStack.unshift(curr);
      curr = curr.parent_id ? findFolder(curr.parent_id, folders) : undefined;
    }

    pathStack.forEach(f => crumbs.push({ id: f.id, name: f.name }));
    return crumbs;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const newFile = await mediaService.uploadFile(file, currentFolderId);
        if (i === 0) {
          setSelectedFileUrl(newFile.public_url);
        }
      }
      await loadData();
    } catch (err) {
      console.error('Erreur upload:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmSelect = () => {
    if (selectedFileUrl) {
      onSelect(selectedFileUrl);
      onClose();
    }
  };

  // Filtrage par recherche
  const displayFiles = searchQuery.trim()
    ? allFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[85vh] bg-[#141414] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* En-tête */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-[#181818]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">{title}</h2>
              <p className="text-xs text-muted-foreground font-medium">Bucket centralisé : <span className="text-primary font-bold">medias</span></p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,.heic,.heif,image/heic,image/heif"
              multiple
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold px-4 py-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Téléversement...' : 'Importer une image'}
            </Button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barre d'outils & Navigation Fil d'Ariane */}
        <div className="px-8 py-3 bg-[#111111] border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
          {/* Fil d'Ariane */}
          <div className="flex items-center gap-1 text-xs">
            {currentFolderId && (
              <button
                onClick={() => setCurrentFolderId(null)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all mr-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Racine</span>
              </button>
            )}
            <span className="text-white/40">Emplacement :</span>
            <div className="flex items-center gap-1.5 font-bold text-white/80">
              <button
                onClick={() => setCurrentFolderId(null)}
                className={`hover:text-primary transition-colors ${!currentFolderId ? 'text-primary' : ''}`}
              >
                Médiathèque
              </button>
              {currentFolderId && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-primary truncate max-w-[200px]">Dossier actif</span>
                </>
              )}
            </div>
          </div>

          {/* Recherche */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher une image..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-primary/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Corps principal : Arborescence & Grille de photos */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-white/50">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs uppercase tracking-widest font-black">Chargement des médias...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Liste des Dossiers (si pas en mode recherche) */}
              {!searchQuery && folders.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white/50 mb-3 flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5" />
                    Dossiers ({folders.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {folders.map(folder => (
                      <button
                        key={folder.id}
                        onClick={() => setCurrentFolderId(folder.id)}
                        className="group flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/40 transition-all text-left"
                      >
                        <div className="w-9 h-9 rounded-xl bg-primary/20 group-hover:bg-primary flex items-center justify-center text-primary group-hover:text-white transition-colors">
                          <Folder className="w-4 h-4 fill-current" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white group-hover:text-primary transition-colors truncate">
                            {folder.name}
                          </p>
                          <p className="text-[10px] text-white/40">Dossier</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fichiers Médias */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white/50 mb-3 flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Images {searchQuery ? `(Résultats pour "${searchQuery}")` : ''} ({displayFiles.length})
                </h3>

                {displayFiles.length === 0 ? (
                  <div className="py-16 text-center border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3">
                    <ImageIcon className="w-12 h-12 text-white/20" />
                    <p className="text-sm font-bold text-white/60">Aucune photo dans cet emplacement</p>
                    <p className="text-xs text-white/40">Téléversez des images ou parcourez un autre sous-dossier</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {displayFiles.map(file => {
                      const isSelected = selectedFileUrl === file.public_url;
                      return (
                        <div
                          key={file.id}
                          onClick={() => setSelectedFileUrl(file.public_url)}
                          className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${
                            isSelected
                              ? 'border-primary ring-4 ring-primary/30 shadow-lg shadow-primary/20 scale-[0.98]'
                              : 'border-white/10 hover:border-white/30 bg-black/40'
                          }`}
                        >
                          <img
                            src={file.public_url}
                            alt={file.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div className="hidden w-full h-full flex-col items-center justify-center bg-white/5 text-white/50 p-2 text-center">
                            <ImageIcon className="w-8 h-8 text-primary mb-1 opacity-70" />
                            <span className="text-[10px] font-bold truncate max-w-full text-white/70">{file.name}</span>
                          </div>

                          {/* Badge de sélection */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-7 h-7 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg animate-in zoom-in">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          )}

                          {/* Bouton d'agrandissement au survol */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewModalUrl(file.public_url);
                            }}
                            className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                            title="Agrandir l'image"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Encart bas avec nom */}
                          <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                            <p className="text-[11px] font-bold text-white truncate">{file.name}</p>
                            <p className="text-[9px] text-white/60">
                              {(file.file_size / 1024).toFixed(0)} Ko
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pied de page avec confirmation de sélection */}
        <div className="px-8 py-4 bg-[#181818] border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedFileUrl ? (
              <div className="flex items-center gap-3">
                <img
                  src={selectedFileUrl}
                  alt="Sélectionnée"
                  className="w-10 h-10 rounded-xl object-cover border border-primary"
                />
                <div>
                  <p className="text-xs font-bold text-white">1 image sélectionnée</p>
                  <p className="text-[10px] text-white/40 truncate max-w-xs">{selectedFileUrl}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-white/40 italic">Cliquez sur une image pour la sélectionner</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-white/10 text-white hover:bg-white/10 text-xs font-bold px-5"
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmSelect}
              disabled={!selectedFileUrl}
              className="gap-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold px-6 shadow-lg shadow-primary/25 disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
              Valider cette photo
            </Button>
          </div>
        </div>
      </div>

      {/* Aperçu Lightbox agrandi */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] p-2 bg-[#181818] border border-white/20 rounded-3xl shadow-2xl">
            <button
              onClick={() => setPreviewModalUrl(null)}
              className="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewModalUrl}
              alt="Aperçu grand format"
              className="max-w-full max-h-[80vh] rounded-2xl object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
