import React, { useState, useEffect, useRef } from 'react';
import {
  Folder, FolderPlus, Upload, Search, Grid, List, ChevronRight,
  ArrowLeft, Trash2, Download, Copy, Eye, MoreVertical,
  Check, Loader2, Sparkles, Image as ImageIcon, HardDrive,
  FileImage, Edit2, AlertCircle, X, ExternalLink,
  FolderInput, Move, ShieldAlert, Lock
} from 'lucide-react';
import { mediaService, validateFileSecurity } from '../../services/mediaService';
import type { MediaFolder, MediaFile } from '../../services/mediaService';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';

export const MediaManagementPage: React.FC = () => {
  const { hasSubModuleAccess, authState } = usePermissions();
  const currentRole = authState.user?.system_role?.toLowerCase() || '';
  const isSuperAdmin = currentRole === 'super_admin' || authState.isRealSuperAdmin;

  const canCreate = isSuperAdmin || hasSubModuleAccess('media', 'create', 'media');
  const canUpdate = isSuperAdmin || hasSubModuleAccess('media', 'update', 'media');
  const canDelete = isSuperAdmin || hasSubModuleAccess('media', 'delete', 'media');
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [allFolders, setAllFolders] = useState<MediaFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [allFiles, setAllFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Drag & Drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);

  // Modales
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameTarget, setRenameTarget] = useState<{ type: 'folder' | 'file'; id: string; name: string } | null>(null);
  const [renamedName, setRenamedName] = useState('');
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ type: 'folder' | 'file'; id: string; name: string; path?: string } | null>(null);
  const [blockedFolderDelete, setBlockedFolderDelete] = useState<{ name: string; count: number } | null>(null);
  const [checkingFolderId, setCheckingFolderId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);

  // Modale de déplacement de fichier ou dossier
  const [moveItemTarget, setMoveItemTarget] = useState<{
    type: 'file' | 'folder';
    id: string;
    name: string;
    currentParentId?: string | null;
  } | null>(null);
  const [selectedDestinationFolderId, setSelectedDestinationFolderId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [currentFolderId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allFld, currentFld, currentFl, allFl] = await Promise.all([
        mediaService.getAllFolders(),
        mediaService.getFolders(currentFolderId),
        mediaService.getFiles(currentFolderId),
        mediaService.getAllFiles(),
      ]);
      setAllFolders(allFld);
      setFolders(currentFld);
      setFiles(currentFl);
      setAllFiles(allFl);
    } catch (err) {
      console.error('Erreur chargement médiathèque:', err);
      toast.error('Erreur lors du chargement des médias');
    } finally {
      setLoading(false);
    }
  };

  // Breadcrumbs calculation
  const getBreadcrumbs = () => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Médiathèque' }];
    if (!currentFolderId) return crumbs;

    const findFolder = (id: string): MediaFolder | undefined => allFolders.find(f => f.id === id);
    let curr = findFolder(currentFolderId);
    const stack: MediaFolder[] = [];
    while (curr) {
      stack.unshift(curr);
      curr = curr.parent_id ? findFolder(curr.parent_id) : undefined;
    }
    stack.forEach(f => crumbs.push({ id: f.id, name: f.name }));
    return crumbs;
  };

  const currentFolder = currentFolderId ? allFolders.find(f => f.id === currentFolderId) : null;

  // Gestion de l'upload de fichiers avec filtrage de sécurité strict
  const handleUploadFiles = async (fileList: FileList | File[]) => {
    if (!canCreate) {
      toast.error("Vous ne disposez pas de la permission d'importer des fichiers (Create)");
      return;
    }
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    let successCount = 0;
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        
        // 🛡️ Vérification de sécurité stricte (rejet .js, .php, exécutables)
        const validation = validateFileSecurity(file);
        if (!validation.isValid) {
          toast.error(validation.error || `Fichier "${file.name}" refusé pour des raisons de sécurité.`);
          continue;
        }

        await mediaService.uploadFile(file, currentFolderId);
        successCount++;
      }
      if (successCount > 0) {
        toast.success(`${successCount} image(s) téléversée(s) avec succès !`);
        await loadData();
      }
    } catch (err: any) {
      console.error('Erreur téléversement:', err);
      toast.error(err.message || "Échec lors de l'envoi de certaines images");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Gestion du déplacement de fichier ou de dossier
  const handleMoveItem = async () => {
    if (!moveItemTarget) return;
    if (!canUpdate) {
      toast.error("Vous ne disposez pas de la permission de modification (Update)");
      return;
    }
    setMoving(true);
    try {
      if (moveItemTarget.type === 'file') {
        await mediaService.moveFile(moveItemTarget.id, selectedDestinationFolderId);
        toast.success(`Fichier "${moveItemTarget.name}" déplacé avec succès ! Les liaisons (fiches joueurs, staff...) ont été préservées.`);
      } else {
        await mediaService.moveFolder(moveItemTarget.id, selectedDestinationFolderId);
        toast.success(`Dossier "${moveItemTarget.name}" déplacé avec succès ! Tous les fichiers et leurs liaisons ont été synchronisés.`);
      }
      setMoveItemTarget(null);
      await loadData();
    } catch (err: any) {
      console.error('Erreur déplacement:', err);
      toast.error(err.message || "Erreur lors du déplacement");
    } finally {
      setMoving(false);
    }
  };

  // Drag & drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Création de dossier
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await mediaService.createFolder(newFolderName.trim(), currentFolderId);
      toast.success(`Dossier "${newFolderName.trim()}" créé avec succès`);
      setNewFolderName('');
      setCreateFolderModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error('Erreur lors de la création du dossier');
    }
  };

  // Renommage de dossier ou fichier
  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renamedName.trim()) return;

    try {
      if (renameTarget.type === 'folder') {
        await mediaService.renameFolder(renameTarget.id, renamedName.trim());
        toast.success(`Dossier renommé en "${renamedName.trim()}"`);
      } else {
        await mediaService.renameFile(renameTarget.id, renamedName.trim());
        toast.success(`Fichier renommé en "${renamedName.trim()}"`);
      }
      setRenameTarget(null);
      await loadData();
    } catch (err) {
      toast.error('Erreur lors du renommage');
    }
  };

  // Demande de suppression d'un dossier : bloquée si le dossier contient des fichiers ou s'il s'agit du dossier default
  const handleRequestDeleteFolder = async (folder: MediaFolder) => {
    // 🛡️ Protection absolue : Le dossier default ne peut pas être supprimé
    if (folder.id === 'a0000000-0000-0000-0000-000000000001' || folder.name.toLowerCase() === 'default' || folder.path === '/default') {
      toast.error('Le dossier système « default » est protégé et ne peut pas être supprimé.');
      return;
    }

    setCheckingFolderId(folder.id);
    try {
      const count = await mediaService.countFilesInFolderTree(folder.id);
      if (count > 0) {
        setBlockedFolderDelete({ name: folder.name, count });
      } else {
        setDeleteConfirmTarget({ type: 'folder', id: folder.id, name: folder.name });
      }
    } catch {
      toast.error('Impossible de vérifier le contenu du dossier');
    } finally {
      setCheckingFolderId(null);
    }
  };

  // Suppression
  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;

    try {
      if (deleteConfirmTarget.type === 'folder') {
        // Double sécurité : refuser la suppression si des fichiers sont présents
        const count = await mediaService.countFilesInFolderTree(deleteConfirmTarget.id);
        if (count > 0) {
          setBlockedFolderDelete({ name: deleteConfirmTarget.name, count });
          setDeleteConfirmTarget(null);
          return;
        }
        await mediaService.deleteFolder(deleteConfirmTarget.id);
        toast.success(`Dossier "${deleteConfirmTarget.name}" supprimé`);
      } else {
        await mediaService.deleteFile(deleteConfirmTarget.id, deleteConfirmTarget.path || '');
        toast.success(`Fichier "${deleteConfirmTarget.name}" supprimé`);
        if (previewFile?.id === deleteConfirmTarget.id) setPreviewFile(null);
      }
      setDeleteConfirmTarget(null);
      await loadData();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Copie de l'URL publique
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Lien public copié dans le presse-papiers !');
  };

  // Téléchargement direct
  const handleDownload = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Filtrage par recherche
  const displayedFiles = searchQuery.trim()
    ? allFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  const totalSize = allFiles.reduce((acc, f) => acc + (f.file_size || 0), 0);
  const formattedTotalSize = (totalSize / (1024 * 1024)).toFixed(1);

  return (
    <div
      ref={dropZoneRef}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative min-h-[calc(100vh-4rem)] bg-[#0d0d0d] text-white p-6 lg:p-10 space-y-8"
    >
      {/* Overlay Drag & Drop animé */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-8 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="w-28 h-28 rounded-3xl bg-primary/20 border-4 border-dashed border-primary flex items-center justify-center text-primary mb-6 animate-pulse shadow-2xl shadow-primary/30">
            <Upload className="w-14 h-14" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mb-2">
            Déposez vos images ici
          </h2>
          <p className="text-sm text-white/60 font-medium max-w-md text-center">
            Les fichiers seront automatiquement téléversés dans le bucket <span className="text-primary font-bold">medias</span>
            {currentFolder && <span> dans le dossier « {currentFolder.name} »</span>}
          </p>
        </div>
      )}

      {/* En-tête Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-rose-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight">Espace Média</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                  DAM FUS
                </span>
              </div>
              <p className="text-sm text-white/60 font-medium">
                Gestionnaire de ressources visuelles et bucket centralisé <span className="text-primary font-bold">medias</span>
              </p>
            </div>
          </div>
        </div>

        {/* Boutons d'Action & Upload */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,.heic,.heif,image/heic,image/heif"
            multiple
            className="hidden"
          />

          {canCreate && (
            <>
              <Button
                onClick={() => setCreateFolderModalOpen(true)}
                variant="outline"
                className="gap-2 rounded-2xl border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold h-12 px-5 text-sm"
              >
                <FolderPlus className="w-4 h-4 text-primary" />
                Nouveau Dossier
              </Button>

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold h-12 px-6 text-sm shadow-xl shadow-primary/25 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Téléversement en cours...' : 'Importer des Médias'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Statistiques Rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/70">
            <FileImage className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Total Fichiers</p>
            <p className="text-lg font-black text-white">{allFiles.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/70">
            <Folder className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Dossiers</p>
            <p className="text-lg font-black text-white">{allFolders.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/70">
            <HardDrive className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Espace Consommé</p>
            <p className="text-lg font-black text-white">{formattedTotalSize} Mo</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/70">
            <Sparkles className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Bucket Unique</p>
            <p className="text-sm font-black text-white uppercase tracking-wider text-primary">medias</p>
          </div>
        </div>
      </div>

      {/* Barre de navigation / Fil d'Ariane & Filtres */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-[#141414] border border-white/10">
        {/* Fil d'Ariane (Breadcrumbs) */}
        <div className="flex items-center gap-1.5 flex-wrap text-sm">
          {currentFolderId && (
            <button
              onClick={() => {
                const parent = currentFolder?.parent_id || null;
                setCurrentFolderId(parent);
              }}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors mr-2"
              title="Dossier parent"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {getBreadcrumbs().map((crumb, idx, arr) => {
            const isLast = idx === arr.length - 1;
            return (
              <React.Fragment key={crumb.id || 'root'}>
                {idx > 0 && <ChevronRight className="w-4 h-4 text-white/30" />}
                <button
                  onClick={() => setCurrentFolderId(crumb.id)}
                  disabled={isLast}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                    isLast
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Recherche et commutation Grille / Liste */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-primary/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center rounded-xl bg-white/5 p-1 border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-primary text-white' : 'text-white/40 hover:text-white'
              }`}
              title="Vue Grille"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-primary text-white' : 'text-white/40 hover:text-white'
              }`}
              title="Vue Tableau"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Contenu : Dossiers & Médias */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-4 text-white/50">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <span className="text-xs uppercase tracking-widest font-black">Chargement des éléments...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1 : Dossiers (Masquée en mode recherche globale) */}
          {!searchQuery && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-black uppercase tracking-wider text-white/50 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-amber-400" />
                  Dossiers ({folders.length})
                </h2>
              </div>

              {folders.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#141414]/50 border border-white/5 text-center text-white/40 text-xs italic">
                  Aucun sous-dossier ici. Cliquez sur « Nouveau Dossier » pour en créer un.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {folders.map(folder => {
                    const childFiles = allFiles.filter(f => f.folder_id === folder.id);
                    return (
                      <div
                        key={folder.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          setDropTargetFolderId(folder.id);
                        }}
                        onDragLeave={() => setDropTargetFolderId(null)}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDropTargetFolderId(null);
                          const fileId = e.dataTransfer.getData('text/media-file-id');
                          if (fileId) {
                            try {
                              await mediaService.moveFile(fileId, folder.id);
                              toast.success(`Fichier déplacé dans "${folder.name}" ! Les liaisons associées ont été préservées.`);
                              await loadData();
                            } catch (err: any) {
                              toast.error(err.message || 'Erreur lors du déplacement');
                            }
                          }
                        }}
                        className={`group relative flex flex-col p-4 rounded-2xl bg-[#141414] hover:bg-[#1a1a1a] border transition-all cursor-pointer shadow-md ${
                          dropTargetFolderId === folder.id
                            ? 'border-primary ring-2 ring-primary/50 bg-primary/10 scale-105'
                            : 'border-white/5 hover:border-primary/40'
                        }`}
                        onClick={() => setCurrentFolderId(folder.id)}
                      >
                        {/* Action buttons or Protected System Badge */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                            <Folder className="w-6 h-6 fill-amber-400/20" />
                          </div>

                          {(() => {
                            const isDefault = folder.id === 'a0000000-0000-0000-0000-000000000001' || folder.name.toLowerCase() === 'default' || folder.path === '/default';
                            if (isDefault) {
                              return (
                                <span
                                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider bg-amber-400/10 text-amber-400/90 flex items-center gap-1 border border-amber-400/20"
                                  title="Dossier système protégé (réception de tous les uploads directs, non supprimable)"
                                >
                                  <Lock className="w-3 h-3" /> Défaut
                                </span>
                              );
                            }

                            return (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                {canUpdate && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setMoveItemTarget({
                                          type: 'folder',
                                          id: folder.id,
                                          name: folder.name,
                                          currentParentId: folder.parent_id,
                                        });
                                        setSelectedDestinationFolderId(folder.parent_id);
                                      }}
                                      className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-amber-400 transition-colors"
                                      title="Déplacer ce dossier"
                                    >
                                      <FolderInput className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setRenameTarget({ type: 'folder', id: folder.id, name: folder.name });
                                        setRenamedName(folder.name);
                                      }}
                                      className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
                                      title="Renommer ce dossier"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleRequestDeleteFolder(folder)}
                                    disabled={checkingFolderId === folder.id}
                                    className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate mb-1">
                          {folder.name}
                        </h3>
                        <p className="text-[11px] text-white/40">
                          {childFiles.length} média{childFiles.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section 2 : Fichiers Médias */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-white/50 flex items-center gap-2">
                <FileImage className="w-4 h-4 text-primary" />
                Images {searchQuery ? `(Résultats de recherche: ${displayedFiles.length})` : `(${displayedFiles.length})`}
              </h2>
            </div>

            {displayedFiles.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="py-20 border-2 border-dashed border-white/10 hover:border-primary/50 rounded-3xl bg-[#141414]/30 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/5 group-hover:bg-primary/20 flex items-center justify-center text-white/40 group-hover:text-primary transition-colors">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-white mb-1">Aucune image dans cet emplacement</p>
                  <p className="text-xs text-white/50">
                    Glissez-déposez vos fichiers ici ou <span className="text-primary font-bold underline">parcourez votre ordinateur</span>
                  </p>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              /* Vue Grille */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {displayedFiles.map(file => (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/media-file-id', file.id);
                      setDraggedFileId(file.id);
                    }}
                    onDragEnd={() => setDraggedFileId(null)}
                    onClick={() => setPreviewFile(file)}
                    className={`group relative aspect-square rounded-2xl overflow-hidden bg-[#141414] border border-white/10 hover:border-primary/50 transition-all cursor-pointer shadow-lg ${
                      draggedFileId === file.id ? 'opacity-40 scale-95 border-amber-500/50' : ''
                    }`}
                  >
                    <img
                      src={file.public_url}
                      alt={file.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.parentElement?.querySelector('.heic-fallback') as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="heic-fallback hidden w-full h-full flex-col items-center justify-center bg-white/5 text-white/50 p-4 text-center">
                      <FileImage className="w-10 h-10 text-primary mb-2 opacity-70" />
                      <span className="text-[11px] font-bold truncate max-w-full text-white/80">{file.name}</span>
                      <span className="text-[9px] text-primary uppercase font-black tracking-wider mt-1 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                        {file.name.split('.').pop()?.toUpperCase() || 'MÉDIA'}
                      </span>
                    </div>

                    {/* Overlay d'actions rapides au survol */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                      <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleCopyUrl(file.public_url)}
                          className="p-1.5 rounded-xl bg-black/70 hover:bg-primary text-white transition-colors"
                          title="Copier le lien public"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownload(file.public_url, file.name)}
                          className="p-1.5 rounded-xl bg-black/70 hover:bg-emerald-600 text-white transition-colors"
                          title="Télécharger"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {canUpdate && (
                          <>
                            <button
                              onClick={() => {
                                setRenameTarget({ type: 'file', id: file.id, name: file.name });
                                setRenamedName(file.name);
                              }}
                              className="p-1.5 rounded-xl bg-black/70 hover:bg-blue-600 text-white transition-colors"
                              title="Renommer le fichier"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setMoveItemTarget({
                                  type: 'file',
                                  id: file.id,
                                  name: file.name,
                                  currentParentId: file.folder_id,
                                });
                                setSelectedDestinationFolderId(file.folder_id);
                              }}
                              className="p-1.5 rounded-xl bg-black/70 hover:bg-amber-500 text-white transition-colors"
                              title="Déplacer vers un autre dossier"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteConfirmTarget({ type: 'file', id: file.id, name: file.name, path: file.storage_path })}
                            className="p-1.5 rounded-xl bg-black/70 hover:bg-rose-600 text-white transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-bold text-white truncate drop-shadow">{file.name}</p>
                        <p className="text-[10px] text-white/70">
                          {(file.file_size / 1024).toFixed(0)} Ko
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Vue Tableau */
              <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#141414]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#181818] border-b border-white/10 text-white/50 font-black uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Aperçu</th>
                      <th className="py-3 px-4">Nom du fichier</th>
                      <th className="py-3 px-4">Taille</th>
                      <th className="py-3 px-4">Date d'ajout</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {displayedFiles.map(file => (
                      <tr
                        key={file.id}
                        className="hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => setPreviewFile(file)}
                      >
                        <td className="py-3 px-4">
                          <div className="relative w-10 h-10">
                            <img
                              src={file.public_url}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover border border-white/10"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                            <div className="hidden w-10 h-10 rounded-xl bg-white/5 border border-white/10 items-center justify-center text-primary">
                              <FileImage className="w-5 h-5" />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {file.name}
                        </td>
                        <td className="py-3 px-4 text-white/60">
                          {(file.file_size / 1024).toFixed(0)} Ko
                        </td>
                        <td className="py-3 px-4 text-white/40">
                          {file.created_at ? new Date(file.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleCopyUrl(file.public_url)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-primary text-white/70 hover:text-white transition-colors"
                              title="Copier le lien"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDownload(file.public_url, file.name)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-600 text-white/70 hover:text-white transition-colors"
                              title="Télécharger"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            {canUpdate && (
                              <>
                                <button
                                  onClick={() => {
                                    setRenameTarget({ type: 'file', id: file.id, name: file.name });
                                    setRenamedName(file.name);
                                  }}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-600 text-white/70 hover:text-white transition-colors"
                                  title="Renommer le fichier"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setMoveItemTarget({
                                      type: 'file',
                                      id: file.id,
                                      name: file.name,
                                      currentParentId: file.folder_id,
                                    });
                                    setSelectedDestinationFolderId(file.folder_id);
                                  }}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-500 text-white/70 hover:text-white transition-colors"
                                  title="Déplacer vers un autre dossier"
                                >
                                  <FolderInput className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleteConfirmTarget({ type: 'file', id: file.id, name: file.name, path: file.storage_path })}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-600 text-rose-400 hover:text-white transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALE : Créer un Dossier */}
      {createFolderModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={handleCreateFolder} className="w-full max-w-md bg-[#181818] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-2">Nouveau Dossier</h3>
            <p className="text-xs text-white/60 mb-5">
              Créer un sous-dossier dans : <span className="text-primary font-bold">{currentFolder ? currentFolder.name : 'Racine'}</span>
            </p>
            <input
              type="text"
              autoFocus
              placeholder="Ex: Équipe Première, U17..."
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary mb-6"
            />
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateFolderModalOpen(false)}
                className="rounded-xl border-white/10 text-white text-xs font-bold"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={!newFolderName.trim()}
                className="rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold px-6 shadow-lg shadow-primary/20"
              >
                Créer le dossier
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODALE : Renommer un Dossier ou un Fichier */}
      {renameTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={handleConfirmRename} className="w-full max-w-md bg-[#181818] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-2">
              Renommer {renameTarget.type === 'folder' ? 'le Dossier' : "l'Image"}
            </h3>
            <p className="text-xs text-white/60 mb-4">
              Nouveau nom pour {renameTarget.type === 'folder' ? 'ce dossier' : 'cette ressource'} (synchronisé avec Supabase) :
            </p>
            <input
              type="text"
              autoFocus
              value={renamedName}
              onChange={e => setRenamedName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary mb-6"
            />
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameTarget(null)}
                className="rounded-xl border-white/10 text-white text-xs font-bold"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={!renamedName.trim()}
                className="rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold px-6"
              >
                Sauvegarder
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODALE : Confirmation de Suppression */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#181818] border border-rose-500/20 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 mx-auto flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">Confirmer la suppression</h3>
            <p className="text-xs text-white/60 mb-6">
              Êtes-vous sûr de vouloir supprimer définitivement {deleteConfirmTarget.type === 'folder' ? 'le dossier' : "l'image"}{' '}
              <strong className="text-white">« {deleteConfirmTarget.name} »</strong> ? Cette action est irréversible.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirmTarget(null)}
                className="rounded-xl border-white/10 text-white text-xs font-bold"
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-6 shadow-lg shadow-rose-600/25"
              >
                Supprimer définitivement
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE : Suppression de dossier bloquée (dossier non vide) */}
      {blockedFolderDelete && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setBlockedFolderDelete(null)}
        >
          <div
            className="w-full max-w-md bg-[#181818] border border-amber-500/20 rounded-3xl p-6 shadow-2xl text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-4">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">Suppression impossible</h3>
            <p className="text-xs text-white/60 mb-6">
              Le dossier <strong className="text-white">« {blockedFolderDelete.name} »</strong> contient{' '}
              <strong className="text-amber-400">
                {blockedFolderDelete.count} fichier{blockedFolderDelete.count > 1 ? 's' : ''}
              </strong>.
              <br />
              Vous devez d'abord supprimer {blockedFolderDelete.count > 1 ? 'ces fichiers' : 'ce fichier'} avant de pouvoir supprimer le dossier.
            </p>
            <div className="flex items-center justify-center">
              <Button
                type="button"
                onClick={() => setBlockedFolderDelete(null)}
                className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-8"
              >
                J'ai compris
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE : Lightbox Visualisation Image */}
      {previewFile && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-8 bg-black/90 backdrop-blur-xl animate-in fade-in"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-[#141414] border border-white/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Lightbox */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#181818]">
              <div className="min-w-0 pr-4">
                <h3 className="text-sm font-bold text-white truncate">{previewFile.name}</h3>
                <p className="text-[10px] text-white/50">
                  {(previewFile.file_size / 1024).toFixed(1)} Ko • {previewFile.mime_type}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleCopyUrl(previewFile.public_url)}
                  variant="outline"
                  className="rounded-xl border-white/10 text-white hover:bg-white/10 text-xs font-bold gap-1.5 h-9 px-3"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copier l'URL
                </Button>
                <Button
                  onClick={() => handleDownload(previewFile.public_url, previewFile.name)}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 h-9 px-3"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger
                </Button>
                {canUpdate && (
                  <Button
                    onClick={() => {
                      setMoveItemTarget({
                        type: 'file',
                        id: previewFile.id,
                        name: previewFile.name,
                        currentParentId: previewFile.folder_id,
                      });
                      setSelectedDestinationFolderId(previewFile.folder_id);
                    }}
                    variant="outline"
                    className="rounded-xl border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs font-bold gap-1.5 h-9 px-3"
                  >
                    <FolderInput className="w-3.5 h-3.5" />
                    Déplacer
                  </Button>
                )}
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Corps Image */}
            <div className="flex-1 p-6 flex items-center justify-center bg-black/50 overflow-auto">
              <div className="relative max-h-[65vh] max-w-full flex items-center justify-center">
                <img
                  src={previewFile.public_url}
                  alt={previewFile.name}
                  className="max-h-[65vh] max-w-full rounded-2xl object-contain shadow-2xl"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="hidden flex-col items-center justify-center p-10 rounded-2xl bg-[#141414] border border-white/10 text-center max-w-md">
                  <FileImage className="w-16 h-16 text-primary mb-4 opacity-80" />
                  <p className="text-white font-bold text-base truncate max-w-xs">{previewFile.name}</p>
                  <p className="text-xs text-white/50 mt-2">
                    Aperçu direct non décodable sur ce navigateur (format {previewFile.name.split('.').pop()?.toUpperCase() || 'HEIC'}).
                  </p>
                  <a
                    href={previewFile.public_url}
                    download={previewFile.name}
                    className="mt-4 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger le fichier original
                  </a>
                </div>
              </div>
            </div>

            {/* Footer Lightbox avec lien public */}
            <div className="px-6 py-3 bg-[#181818] border-t border-white/10 flex items-center justify-between text-xs text-white/50">
              <span className="truncate max-w-lg font-mono text-[11px] text-white/70">
                {previewFile.public_url}
              </span>
              <a
                href={previewFile.public_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-primary hover:underline font-bold"
              >
                <span>Ouvrir l'original</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODALE : Déplacer un Fichier ou un Dossier */}
      {moveItemTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-[#181818] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <FolderInput className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {moveItemTarget.type === 'file' ? 'Déplacer le fichier' : 'Déplacer le dossier'}
                  </h3>
                  <p className="text-xs text-white/60 truncate max-w-xs font-medium">
                    « {moveItemTarget.name} »
                  </p>
                </div>
              </div>

              <button
                onClick={() => setMoveItemTarget(null)}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-white/50 block mb-2">
                Choisir le dossier de destination :
              </label>

              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 rounded-2xl bg-black/30 p-2 border border-white/5">
                {/* Option Racine (Médiathèque) */}
                <button
                  type="button"
                  onClick={() => setSelectedDestinationFolderId(null)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                    selectedDestinationFolderId === null
                      ? 'bg-primary text-white font-bold shadow-md shadow-primary/20'
                      : 'hover:bg-white/5 text-white/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Folder className={`w-4 h-4 shrink-0 ${selectedDestinationFolderId === null ? 'fill-white' : 'text-amber-400'}`} />
                    <span className="text-xs">Médiathèque (Racine)</span>
                  </div>
                  {moveItemTarget.currentParentId === null && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">Actuel</span>
                  )}
                </button>

                {/* Liste des dossiers éligibles */}
                {allFolders
                  .filter(f => {
                    // Si on déplace un dossier, interdire de le sélectionner ou de sélectionner l'un de ses descendants
                    if (moveItemTarget.type === 'folder') {
                      if (f.id === moveItemTarget.id) return false;
                      let curr: MediaFolder | undefined = f;
                      while (curr?.parent_id) {
                        if (curr.parent_id === moveItemTarget.id) return false;
                        curr = allFolders.find(item => item.id === curr?.parent_id);
                      }
                    }
                    return true;
                  })
                  .map(f => {
                    const isSelected = selectedDestinationFolderId === f.id;
                    const isCurrent = moveItemTarget.currentParentId === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedDestinationFolderId(f.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-primary text-white font-bold shadow-md shadow-primary/20'
                            : 'hover:bg-white/5 text-white/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'fill-white' : 'text-amber-400'}`} />
                          <span className="text-xs truncate font-mono">{f.path}</span>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-mono shrink-0">Actuel</span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMoveItemTarget(null)}
                className="rounded-xl border-white/10 text-white hover:bg-white/10 text-xs font-bold h-11 px-5"
              >
                Annuler
              </Button>
              <Button
                type="button"
                disabled={moving || selectedDestinationFolderId === moveItemTarget.currentParentId}
                onClick={handleMoveItem}
                className="rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold gap-2 h-11 px-6 shadow-lg shadow-primary/25 cursor-pointer disabled:opacity-50"
              >
                {moving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderInput className="w-4 h-4" />}
                <span>Confirmer le déplacement</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
