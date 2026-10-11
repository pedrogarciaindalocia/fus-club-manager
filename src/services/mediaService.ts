import { supabase } from '../lib/supabase';
import { mediaRelinkerService } from './mediaRelinkerService';

export interface MediaFolder {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
  created_at?: string;
}

export interface MediaFile {
  id: string;
  folder_id: string | null;
  name: string;
  storage_path: string;
  public_url: string;
  file_size: number;
  mime_type: string;
  created_at?: string;
}

// 🛡️ SÉCURITÉ : Extensions et types MIME autorisés (Liste blanche stricte, incluant formats Apple HEIC/HEIF)
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic', 'heif'];
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
];

// Extensions formellement interdites (Scripts, exécutables, web shells)
export const DANGEROUS_EXTENSIONS = [
  'js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx',
  'php', 'phtml', 'php3', 'php4', 'php5', 'phps',
  'exe', 'dll', 'so', 'bin', 'com',
  'sh', 'bash', 'zsh', 'bat', 'cmd', 'ps1',
  'py', 'pyc', 'pl', 'cgi',
  'html', 'htm', 'xhtml', 'svg', 'xml',
  'vbs', 'jar', 'apk', 'msi', 'jsp', 'asp', 'aspx',
];

/**
 * Tente de transcoder une image HEIC/HEIF en JPEG universel via l'API Canvas/createImageBitmap
 * si le navigateur supporte le décodage direct (macOS, iOS Safari, etc.).
 * Préserve la qualité haute fidélité (92%). Retourne le fichier inchangé sinon.
 */
export async function convertHeicIfSupported(file: File): Promise<File> {
  const fileName = file.name.toLowerCase();
  const ext = fileName.split('.').pop() || '';
  if (ext !== 'heic' && ext !== 'heif') {
    return file;
  }

  try {
    if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.92)
        );
        if (blob) {
          const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
          return new File([blob], newName, { type: 'image/jpeg' });
        }
      }
    }
  } catch (conversionErr) {
    console.info('[MediaService] Transcodage HEIC direct non supporté par ce navigateur, upload au format natif .heic:', conversionErr);
  }
  return file;
}

/**
 * Valide la conformité et la sécurité d'un fichier avant téléversement.
 * Rejette immédiatement les scripts exécutables et formats non reconnus.
 */
export function validateFileSecurity(file: File): { isValid: boolean; error?: string } {
  if (!file || !file.name) {
    return { isValid: false, error: 'Fichier invalide ou corrompu.' };
  }

  const fileName = file.name.toLowerCase();
  const ext = fileName.split('.').pop() || '';

  // 1. Détection immédiate d'extensions dangereuses
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return {
      isValid: false,
      error: `Sécurité : L'extension .${ext} est strictement interdite pour protéger le serveur contre les scripts malveillants.`,
    };
  }

  // 2. Vérification stricte de la liste blanche d'extensions
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    return {
      isValid: false,
      error: `Format non autorisé (.${ext}). Seuls les formats d'images sécurisés (${ALLOWED_IMAGE_EXTENSIONS.join(', ').toUpperCase()}) sont acceptés.`,
    };
  }

  // 3. Vérification du type MIME
  // Note : Sur Windows et certains navigateurs, file.type pour .heic / .heif est vide ("") ou générique ("application/octet-stream")
  const isHeicOrHeif = ext === 'heic' || ext === 'heif';
  if (file.type && !ALLOWED_IMAGE_MIME_TYPES.includes(file.type) && !isHeicOrHeif) {
    return {
      isValid: false,
      error: `Type MIME non autorisé (${file.type}). Le fichier ne correspond pas à une image valide.`,
    };
  }

  return { isValid: true };
}

const LOCAL_FOLDERS_KEY = 'fusc_media_folders_cache';
const LOCAL_FILES_KEY = 'fusc_media_files_cache';

// Dossiers initiaux par défaut avec identifiants stables (Miroir exact de la Médiathèque FUS Club)
export const DEFAULT_FOLDERS: MediaFolder[] = [
  { id: 'a0000000-0000-0000-0000-000000000001', name: 'default', parent_id: null, path: '/default', created_at: new Date().toISOString() },
  { id: 'a0000000-0000-0000-0000-000000000002', name: 'Joueurs', parent_id: null, path: '/Joueurs', created_at: new Date().toISOString() },
  { id: 'a0000000-0000-0000-0000-000000000003', name: 'Staff', parent_id: null, path: '/Staff', created_at: new Date().toISOString() },

  // Sous-dossiers Joueurs : Catégories officielles FUS (U13 à U23 + Équipe Première)
  { id: 'a0000000-0000-0000-0000-000000000013', name: 'U13', parent_id: 'a0000000-0000-0000-0000-000000000002', path: '/Joueurs/U13', created_at: new Date().toISOString() },
  { id: 'a0000000-0000-0000-0000-000000000014', name: 'U14', parent_id: 'a0000000-0000-0000-0000-000000000002', path: '/Joueurs/U14', created_at: new Date().toISOString() },
  { id: 'a0000000-0000-0000-0000-000000000015', name: 'U15', parent_id: 'a0000000-0000-0000-0000-000000000002', path: '/Joueurs/U15', created_at: new Date().toISOString() },
  { id: 'a0000000-0000-0000-0000-000000000016', name: 'U16', parent_id: 'a0000000-0000-0000-0000-000000000002', path: '/Joueurs/U16', created_at: new Date().toISOString() },
  { id: 'a0000000-0000-0000-0000-000000000017', name: 'U17', parent_id: 'a0000000-0000-0000-0000-000000000002', path: '/Joueurs/U17', created_at: new Date().toISOString() },
  { id: 'a0000000-0000-0000-0000-000000000018', name: 'U18', parent_id: 'a0000000-0000-0000-0000-000000000002', path: '/Joueurs/U18', created_at: new Date().toISOString() },
  { id: 'a0000000-0000-0000-0000-000000000019', name: 'U19', parent_id: 'a0000000-0000-0000-0000-000000000002', path: '/Joueurs/U19', created_at: new Date().toISOString() },
  { id: 'a0000000-0000-0000-0000-000000000020', name: 'U20', parent_id: 'a0000000-0000-0000-0000-000000000002', path: '/Joueurs/U20', created_at: new Date().toISOString() },
  { id: 'a0000000-0000-0000-0000-000000000021', name: 'U21', parent_id: 'a0000000-0000-0000-0000-000000000002', path: '/Joueurs/U21', created_at: new Date().toISOString() },
  { id: 'a0000000-0000-0000-0000-000000000022', name: 'U22', parent_id: 'a0000000-0000-0000-0000-000000000002', path: '/Joueurs/U22', created_at: new Date().toISOString() },
  { id: 'a0000000-0000-0000-0000-000000000023', name: 'U23', parent_id: 'a0000000-0000-0000-0000-000000000002', path: '/Joueurs/U23', created_at: new Date().toISOString() },
  { id: 'a0000000-0000-0000-0000-000000000024', name: 'Équipe Première', parent_id: 'a0000000-0000-0000-0000-000000000002', path: '/Joueurs/Équipe Première', created_at: new Date().toISOString() },

  // Sous-dossiers Staff : Exacts selon le tableau de bord FUS Club
  { id: 'a0000000-0000-0000-0000-000000000031', name: 'Analystes video', parent_id: 'a0000000-0000-0000-0000-000000000003', path: '/Staff/Analystes video', created_at: new Date().toISOString() },
  { id: 'a0000000-0000-0000-0000-000000000032', name: 'Coachs', parent_id: 'a0000000-0000-0000-0000-000000000003', path: '/Staff/Coachs', created_at: new Date().toISOString() },
  { id: 'a0000000-0000-0000-0000-000000000033', name: 'Scouts', parent_id: 'a0000000-0000-0000-0000-000000000003', path: '/Staff/Scouts', created_at: new Date().toISOString() },
];

function getLocalFolders(): MediaFolder[] {
  try {
    const raw = localStorage.getItem(LOCAL_FOLDERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_FOLDERS_KEY, JSON.stringify(DEFAULT_FOLDERS));
      return DEFAULT_FOLDERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_FOLDERS;
  }
}

function saveLocalFolders(folders: MediaFolder[]) {
  try {
    localStorage.setItem(LOCAL_FOLDERS_KEY, JSON.stringify(folders));
  } catch (err) {
    console.error('Erreur sauvegarde folders local:', err);
  }
}

function getLocalFiles(): MediaFile[] {
  try {
    const raw = localStorage.getItem(LOCAL_FILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFiles(files: MediaFile[]) {
  try {
    localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(files));
  } catch (err) {
    console.error('Erreur sauvegarde files local:', err);
  }
}

const TRANSPARENT_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function getFolderPlaceholderBlob(): Blob {
  try {
    const byteCharacters = atob(TRANSPARENT_PNG_BASE64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'image/png' });
  } catch {
    return new Blob([''], { type: 'image/png' });
  }
}

function sanitizeStoragePath(path: string): string {
  return path
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^\/+|\/+$/g, '')
    .trim();
}

let structureInitialized = false;

export const mediaService = {
  /** Récupérer l'ensemble des dossiers */
  async getAllFolders(): Promise<MediaFolder[]> {
    try {
      const { data, error } = await supabase
        .from('media_folders')
        .select('*')
        .order('name', { ascending: true });

      if (error || !data || data.length === 0) {
        if (!error && data && data.length === 0) {
          // Si la table est vide, insérer automatiquement les dossiers par défaut
          try {
            await supabase.from('media_folders').insert(DEFAULT_FOLDERS);
            saveLocalFolders(DEFAULT_FOLDERS);
            return DEFAULT_FOLDERS;
          } catch {
            // Ignorer si échec
          }
        }
        return getLocalFolders();
      }
      saveLocalFolders(data);
      return data;
    } catch {
      return getLocalFolders();
    }
  },

  /** Récupérer les sous-dossiers d'un parent donné (null pour la racine) */
  async getFolders(parentId: string | null = null): Promise<MediaFolder[]> {
    const all = await this.getAllFolders();
    return all.filter(f => (parentId ? f.parent_id === parentId : !f.parent_id));
  },

  /** Créer un dossier */
  async createFolder(name: string, parentId: string | null = null): Promise<MediaFolder> {
    const allFolders = await this.getAllFolders();
    const parent = parentId ? allFolders.find(f => f.id === parentId) : null;
    const parentPath = parent ? parent.path : '';
    const newPath = `${parentPath}/${name}`.replace(/^\/+/, '/');

    const newFolder: MediaFolder = {
      id: crypto.randomUUID ? crypto.randomUUID() : `folder-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: name.trim(),
      parent_id: parentId || null,
      path: newPath,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('media_folders')
        .insert([{
          name: newFolder.name,
          parent_id: newFolder.parent_id,
          path: newFolder.path,
        }])
        .select()
        .single();

      if (!error && data) {
        newFolder.id = data.id;
      }
    } catch (err) {
      console.warn('[MediaService] Supabase offline/migration non appliquée, utilisation locale:', err);
    }

    // Créer immédiatement le dossier physique dans le bucket Storage via un marqueur .keep (compatible whitelist MIME)
    try {
      const cleanPath = sanitizeStoragePath(newPath);
      if (cleanPath) {
        const keepBlob = getFolderPlaceholderBlob();
        await supabase.storage.from('medias').upload(`${cleanPath}/.keep`, keepBlob, { upsert: true });
      }
    } catch (err) {
      console.warn('[MediaService] Création .keep storage en erreur:', err);
    }

    const updated = [...allFolders, newFolder];
    saveLocalFolders(updated);
    return newFolder;
  },

  /** Renommer un dossier avec synchronisation complète Supabase Storage, DB et sous-dossiers */
  async renameFolder(id: string, newName: string): Promise<void> {
    const allFolders = await this.getAllFolders();
    const folder = allFolders.find(f => f.id === id);
    if (!folder) return;

    // 🛡️ Protection absolue : Le dossier système default ne peut pas être renommé
    if (folder.id === 'a0000000-0000-0000-0000-000000000001' || folder.name.toLowerCase() === 'default' || folder.path === '/default') {
      throw new Error("Le dossier système « default » ne peut pas être renommé.");
    }

    const trimmedNewName = newName.trim();
    if (!trimmedNewName || trimmedNewName === folder.name) return;

    const oldPath = folder.path;
    const pathParts = oldPath.split('/');
    pathParts[pathParts.length - 1] = trimmedNewName;
    const newPath = pathParts.join('/');

    const oldStoragePrefix = sanitizeStoragePath(oldPath);
    const newStoragePrefix = sanitizeStoragePath(newPath);

    // 1. Identifier tous les dossiers affectés (le dossier cible + tous ses descendants)
    const affectedFolders: { id: string; oldPath: string; newPath: string }[] = [];
    affectedFolders.push({ id: folder.id, oldPath, newPath });

    for (const f of allFolders) {
      if (f.path.startsWith(oldPath + '/')) {
        const childNewPath = f.path.replace(oldPath, newPath);
        affectedFolders.push({ id: f.id, oldPath: f.path, newPath: childNewPath });
        f.path = childNewPath;
      }
    }

    folder.name = trimmedNewName;
    folder.path = newPath;

    // 2. Mettre à jour les enregistrements dans la table PostgreSQL media_folders
    for (const item of affectedFolders) {
      try {
        const itemFolderName = item.newPath.split('/').pop() || '';
        await supabase
          .from('media_folders')
          .update({ name: itemFolderName, path: item.newPath })
          .eq('id', item.id);
      } catch (err) {
        console.warn(`[MediaService] Erreur mise à jour DB dossier ${item.id}:`, err);
      }
    }

    // 3. Déplacer physiquement tous les fichiers médias stockés dans ces dossiers dans Supabase Storage
    const affectedFolderIds = affectedFolders.map(a => a.id);
    const allFiles = await this.getAllFiles();
    const filesToMove = allFiles.filter(f => f.folder_id && affectedFolderIds.includes(f.folder_id));

    for (const file of filesToMove) {
      const oldStoragePath = file.storage_path.replace(/^\/+/, '');
      if (oldStoragePath.startsWith(oldStoragePrefix + '/')) {
        const relativeSubPath = oldStoragePath.slice(oldStoragePrefix.length + 1);
        const newStoragePath = `${newStoragePrefix}/${relativeSubPath}`;

        try {
          const { error: moveErr } = await supabase.storage
            .from('medias')
            .move(oldStoragePath, newStoragePath);

          if (moveErr) {
            const { error: copyErr } = await supabase.storage
              .from('medias')
              .copy(oldStoragePath, newStoragePath);
            if (!copyErr) {
              await supabase.storage.from('medias').remove([oldStoragePath]);
            }
          }

          const oldFilePublicUrl = file.public_url;
          const { data: urlData } = supabase.storage
            .from('medias')
            .getPublicUrl(newStoragePath);

          file.storage_path = newStoragePath;
          file.public_url = urlData.publicUrl;

          await supabase
            .from('media_files')
            .update({
              storage_path: newStoragePath,
              public_url: urlData.publicUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', file.id);

          // 🔗 PRÉSERVATION DE LA FICELLE : Relinkage automatique des références
          try {
            await mediaRelinkerService.relinkMediaReferences(
              oldFilePublicUrl,
              urlData.publicUrl,
              oldStoragePath,
              newStoragePath
            );
          } catch (relinkErr) {
            console.warn('[MediaService] Erreur non bloquante relinkage (renameFolder):', relinkErr);
          }
        } catch (err) {
          console.warn(`[MediaService] Erreur déplacement Storage fichier ${file.id}:`, err);
        }
      }
    }

    // 4. Mettre à jour les marqueurs physiques .keep dans Supabase Storage
    for (const item of affectedFolders) {
      const oldClean = sanitizeStoragePath(item.oldPath);
      const newClean = sanitizeStoragePath(item.newPath);

      if (newClean) {
        try {
          const keepBlob = getFolderPlaceholderBlob();
          await supabase.storage.from('medias').upload(`${newClean}/.keep`, keepBlob, { upsert: true });
          if (oldClean && oldClean !== newClean) {
            await supabase.storage.from('medias').remove([`${oldClean}/.keep`]);
          }
        } catch (err) {
          console.warn(`[MediaService] Erreur mise à jour marqueur .keep pour ${newClean}:`, err);
        }
      }
    }

    // 5. Sauvegarder dans les caches locaux
    saveLocalFolders(allFolders);
    saveLocalFiles(allFiles);
  },

  /** Scanner récursivement tous les chemins d'objets dans un dossier Storage */
  async listAllStoragePathsInFolder(prefix: string): Promise<string[]> {
    const cleanPrefix = sanitizeStoragePath(prefix);
    if (!cleanPrefix) return [];

    const foundPaths: string[] = [];
    try {
      const { data, error } = await supabase.storage.from('medias').list(cleanPrefix, { limit: 1000 });
      if (!error && data) {
        for (const item of data) {
          const itemPath = `${cleanPrefix}/${item.name}`;
          foundPaths.push(itemPath);
          // Si l'élément est un sous-dossier virtuel (pas d'id ou pas de métadonnées fichier)
          if (!item.id && (!item.metadata || Object.keys(item.metadata).length === 0)) {
            const subPaths = await this.listAllStoragePathsInFolder(itemPath);
            foundPaths.push(...subPaths);
          }
        }
      }
    } catch (err) {
      console.warn(`[MediaService] Erreur scan storage pour ${cleanPrefix}:`, err);
    }
    return foundPaths;
  },

  /** Compter les fichiers contenus dans un dossier et tous ses sous-dossiers */
  async countFilesInFolderTree(id: string): Promise<number> {
    const allFolders = await this.getAllFolders();
    const ids = new Set<string>();
    const collect = (folderId: string) => {
      ids.add(folderId);
      allFolders.filter(c => c.parent_id === folderId).forEach(c => collect(c.id));
    };
    collect(id);

    try {
      const { count, error } = await supabase
        .from('media_files')
        .select('id', { count: 'exact', head: true })
        .in('folder_id', Array.from(ids));
      if (!error && typeof count === 'number') return count;
    } catch (err) {
      console.warn('[MediaService] Erreur comptage fichiers du dossier:', err);
    }

    // Fallback : cache local
    return getLocalFiles().filter(f => f.folder_id && ids.has(f.folder_id)).length;
  },

  /** Supprimer un dossier, ses sous-dossiers et tous les fichiers associés (Storage + Base de données) */
  async deleteFolder(id: string): Promise<void> {
    const allFolders = await this.getAllFolders();
    const target = allFolders.find(x => x.id === id);

    // 🛡️ Protection absolue : Le dossier système default ne peut pas être supprimé
    if (target && (target.id === 'a0000000-0000-0000-0000-000000000001' || target.name.toLowerCase() === 'default' || target.path === '/default')) {
      throw new Error("Le dossier système « default » est protégé par le club et ne peut pas être supprimé.");
    }

    const toDeleteIds = new Set<string>();
    const toDeleteFolders: MediaFolder[] = [];

    function collectChildren(folderId: string) {
      toDeleteIds.add(folderId);
      const f = allFolders.find(x => x.id === folderId);
      if (f) toDeleteFolders.push(f);
      allFolders
        .filter(child => child.parent_id === folderId)
        .forEach(child => collectChildren(child.id));
    }
    collectChildren(id);

    const pathsToRemove = new Set<string>();

    // 1. Récupérer les chemins des fichiers en base associés à ces dossiers
    try {
      const { data: dbFiles } = await supabase
        .from('media_files')
        .select('storage_path')
        .in('folder_id', Array.from(toDeleteIds));

      if (dbFiles) {
        dbFiles.forEach(f => {
          if (f.storage_path) {
            pathsToRemove.add(f.storage_path.replace(/^\/+/, ''));
          }
        });
      }
    } catch (err) {
      console.warn('[MediaService] Erreur récupération fichiers du dossier à supprimer:', err);
    }

    // Récupérer également les fichiers du cache local pour ces dossiers
    const allFiles = getLocalFiles();
    allFiles
      .filter(f => f.folder_id && toDeleteIds.has(f.folder_id))
      .forEach(f => {
        if (f.storage_path) pathsToRemove.add(f.storage_path.replace(/^\/+/, ''));
      });

    // 2. Scanner physiquement le bucket Storage pour chaque dossier et sous-dossier
    for (const folder of toDeleteFolders) {
      const cleanPath = sanitizeStoragePath(folder.path);
      if (cleanPath) {
        pathsToRemove.add(`${cleanPath}/.keep`);
        try {
          const storageObjects = await this.listAllStoragePathsInFolder(cleanPath);
          storageObjects.forEach(p => pathsToRemove.add(p));
        } catch (err) {
          console.warn(`[MediaService] Erreur listage storage pour ${cleanPath}:`, err);
        }
      }
    }

    // 3. Suppression physique de tous les objets et marqueurs dans Supabase Storage
    if (pathsToRemove.size > 0) {
      try {
        const pathsArray = Array.from(pathsToRemove);
        const { error: removeError } = await supabase.storage.from('medias').remove(pathsArray);
        if (removeError) {
          console.warn('[MediaService] Erreur suppression physique Storage:', removeError);
        }
      } catch (err) {
        console.warn('[MediaService] Erreur appel suppression Storage:', err);
      }
    }

    // 4. Suppression en cascade dans la base de données PostgreSQL
    try {
      await supabase
        .from('media_files')
        .delete()
        .in('folder_id', Array.from(toDeleteIds));

      await supabase
        .from('media_folders')
        .delete()
        .in('id', Array.from(toDeleteIds));
    } catch (err) {
      console.warn('[MediaService] Suppression DB en erreur:', err);
    }

    // 5. Nettoyage immédiat des caches locaux
    const remainingFolders = allFolders.filter(f => !toDeleteIds.has(f.id));
    saveLocalFolders(remainingFolders);

    const remainingFiles = allFiles.filter(f => !f.folder_id || !toDeleteIds.has(f.folder_id));
    saveLocalFiles(remainingFiles);
  },

  /** Récupérer les fichiers d'un dossier donné */
  async getFiles(folderId: string | null = null): Promise<MediaFile[]> {
    try {
      let query = supabase
        .from('media_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (folderId) {
        query = query.eq('folder_id', folderId);
      } else {
        query = query.is('folder_id', null);
      }

      const { data, error } = await query;
      if (error || !data) {
        const local = getLocalFiles();
        return local.filter(f => (folderId ? f.folder_id === folderId : !f.folder_id));
      }

      // Synchroniser avec le cache local
      const local = getLocalFiles();
      const otherFiles = local.filter(f => (folderId ? f.folder_id !== folderId : !!f.folder_id));
      saveLocalFiles([...otherFiles, ...data]);
      return data;
    } catch {
      const local = getLocalFiles();
      return local.filter(f => (folderId ? f.folder_id === folderId : !f.folder_id));
    }
  },

  /** Récupérer l'intégralité des fichiers médias */
  async getAllFiles(): Promise<MediaFile[]> {
    try {
      const { data, error } = await supabase
        .from('media_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) {
        return getLocalFiles();
      }
      saveLocalFiles(data);
      return data;
    } catch {
      return getLocalFiles();
    }
  },

  /** S'assurer que le bucket 'medias' et l'arborescence des dossiers existants ont des marqueurs .keep */
  async ensureBucketStructure(): Promise<void> {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const exists = buckets?.some(b => b.id === 'medias');
      if (!exists) {
        await supabase.storage.createBucket('medias', { public: true });
      }
    } catch {
      // Ignorer si déjà créé
    }

    const allFolders = await this.getAllFolders();
    for (const folder of allFolders) {
      try {
        const cleanPath = sanitizeStoragePath(folder.path);
        if (!cleanPath) continue;
        const keepPath = `${cleanPath}/.keep`;
        const keepBlob = getFolderPlaceholderBlob();
        await supabase.storage.from('medias').upload(keepPath, keepBlob, { upsert: true });
      } catch {
        // Non bloquant
      }
    }
  },

  /** Téléverser un fichier dans le bucket 'medias' et enregistrer ses métadonnées */
  async uploadFile(file: File, folderId: string | null = null, customName?: string): Promise<MediaFile> {
    // 🛡️ Validation de sécurité stricte
    const validation = validateFileSecurity(file);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Fichier refusé pour des raisons de sécurité.');
    }

    // 🚀 Adaptation transparente du format Apple HEIC/HEIF si décodable par le navigateur
    const processedFile = await convertHeicIfSupported(file);

    const fileExt = processedFile.name.split('.').pop() || 'jpg';
    const cleanBaseName = (customName || processedFile.name.replace(/\.[^/.]+$/, ''))
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const uniqueFileName = `${cleanBaseName}-${timestamp}.${fileExt}`;

    // Récupérer l'ensemble des dossiers
    const allFolders = await this.getAllFolders();
    const defaultFolder = allFolders.find(
      f => f.name.toLowerCase() === 'default' || f.path === '/default'
    ) || DEFAULT_FOLDERS[0];

    // Règle métier : si aucun dossier spécifié, router automatiquement dans le dossier 'default'
    const targetFolderId = folderId || defaultFolder.id;
    const targetFolder = allFolders.find(f => f.id === targetFolderId) || defaultFolder;

    // Récupérer le chemin du dossier
    let storagePath = `default/${uniqueFileName}`;
    if (targetFolder) {
      const cleanPath = targetFolder.path.replace(/^\/+|\/+$/g, '');
      storagePath = cleanPath ? `${cleanPath}/${uniqueFileName}` : `default/${uniqueFileName}`;
    }

    // Déterminer le type MIME effectif (notamment si le navigateur envoie une chaîne vide pour .heic/.heif)
    const effectiveMimeType = processedFile.type || (
      processedFile.name.toLowerCase().endsWith('.heic') ? 'image/heic' :
      processedFile.name.toLowerCase().endsWith('.heif') ? 'image/heif' :
      'image/jpeg'
    );

    // 1. Upload dans Supabase Storage (bucket 'medias')
    const { error: uploadError } = await supabase.storage
      .from('medias')
      .upload(storagePath, processedFile, {
        cacheControl: '3600',
        upsert: true,
        contentType: effectiveMimeType,
      });

    if (uploadError) {
      console.error('[MediaService] Erreur upload bucket medias:', uploadError);
      // Tentative de fallback ou création si bucket absent
      try {
        await supabase.storage.createBucket('medias', { public: true });
        await supabase.storage.from('medias').upload(storagePath, processedFile, {
          upsert: true,
          contentType: effectiveMimeType,
        });
      } catch (e) {
        console.warn('[MediaService] Création dynamique de bucket échouée:', e);
      }
    }

    // 2. Récupération de l'URL publique
    const { data: urlData } = supabase.storage
      .from('medias')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    const mediaFile: MediaFile = {
      id: crypto.randomUUID ? crypto.randomUUID() : `file-${timestamp}-${Math.random().toString(36).substr(2, 6)}`,
      folder_id: targetFolderId,
      name: processedFile.name,
      storage_path: storagePath,
      public_url: publicUrl,
      file_size: processedFile.size,
      mime_type: effectiveMimeType,
      created_at: new Date().toISOString(),
    };

    // 3. Persistance en base de données Supabase
    try {
      const { data: dbData, error: dbError } = await supabase
        .from('media_files')
        .insert([{
          folder_id: mediaFile.folder_id,
          name: mediaFile.name,
          storage_path: mediaFile.storage_path,
          public_url: mediaFile.public_url,
          file_size: mediaFile.file_size,
          mime_type: mediaFile.mime_type,
        }])
        .select()
        .single();

      if (!dbError && dbData) {
        mediaFile.id = dbData.id;
      }
    } catch (err) {
      console.warn('[MediaService] Persistance DB media_files en mode local:', err);
    }

    // 4. Mise à jour du cache local
    const local = getLocalFiles();
    saveLocalFiles([mediaFile, ...local]);

    return mediaFile;
  },

  /** Supprimer un fichier média du storage et de la base avec synchronisation complète */
  async deleteFile(fileId: string, storagePath?: string): Promise<void> {
    let pathToRemove = storagePath;

    // Si storagePath n'est pas fourni, le rechercher dans la base ou le cache local
    if (!pathToRemove) {
      const allFiles = await this.getAllFiles();
      const target = allFiles.find(f => f.id === fileId);
      pathToRemove = target?.storage_path;
    }

    // 1. Suppression physique dans le bucket Storage
    if (pathToRemove) {
      try {
        // Nettoyer d'éventuels préfixes d'URL ou slash initial
        let cleanPath = pathToRemove.trim();
        if (cleanPath.includes('/medias/')) {
          cleanPath = cleanPath.split('/medias/').pop() || cleanPath;
        }
        cleanPath = cleanPath.replace(/^\/+/, '');

        const { error: storageError } = await supabase.storage.from('medias').remove([cleanPath]);
        if (storageError) {
          console.warn('[MediaService] Erreur suppression physique storage:', storageError);
        }
      } catch (err) {
        console.warn('[MediaService] Exception suppression storage:', err);
      }
    }

    // 2. Suppression en base de données PostgreSQL
    try {
      await supabase.from('media_files').delete().eq('id', fileId);
    } catch (err) {
      console.warn('[MediaService] Suppression DB media_files:', err);
    }

    // 3. Nettoyage du cache local
    const local = getLocalFiles();
    saveLocalFiles(local.filter(f => f.id !== fileId));
  },

  /** Déplacer un fichier vers un autre dossier avec synchronisation Storage et DB */
  async moveFile(fileId: string, targetFolderId: string | null): Promise<MediaFile | null> {
    const allFiles = await this.getAllFiles();
    const file = allFiles.find(f => f.id === fileId);
    if (!file) return null;

    const allFolders = await this.getAllFolders();
    const defaultFolder = allFolders.find(
      f => f.name.toLowerCase() === 'default' || f.path === '/default'
    ) || DEFAULT_FOLDERS[0];

    const actualTargetFolderId = targetFolderId || defaultFolder.id;
    const targetFolder = allFolders.find(f => f.id === actualTargetFolderId) || defaultFolder;

    // Calculer le nouveau chemin Storage
    const baseName = file.storage_path.split('/').pop() || file.name;
    let newStoragePath = `default/${baseName}`;
    if (targetFolder) {
      const cleanPath = targetFolder.path.replace(/^\/+|\/+$/g, '');
      newStoragePath = cleanPath ? `${cleanPath}/${baseName}` : `default/${baseName}`;
    }

    const oldStoragePath = file.storage_path;
    const oldPublicUrl = file.public_url;

    // 1. Déplacement physique de l'objet dans Supabase Storage
    if (oldStoragePath !== newStoragePath) {
      try {
        const { error: moveError } = await supabase.storage
          .from('medias')
          .move(oldStoragePath, newStoragePath);

        if (moveError) {
          // Fallback copy + remove si .move n'est pas permis
          const { error: copyError } = await supabase.storage
            .from('medias')
            .copy(oldStoragePath, newStoragePath);
          if (!copyError) {
            await supabase.storage.from('medias').remove([oldStoragePath]);
          }
        }
      } catch (err) {
        console.warn('[MediaService] Erreur déplacement Storage:', err);
      }
    }

    // Récupérer la nouvelle URL publique
    const { data: urlData } = supabase.storage
      .from('medias')
      .getPublicUrl(newStoragePath);
    const newPublicUrl = urlData.publicUrl;

    // 2. Mise à jour dans la table media_files
    try {
      await supabase
        .from('media_files')
        .update({
          folder_id: actualTargetFolderId,
          storage_path: newStoragePath,
          public_url: newPublicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId);
    } catch (err) {
      console.warn('[MediaService] Erreur mise à jour DB media_files:', err);
    }

    // 3. 🔗 PRÉSERVATION DE LA FICELLE : Relinkage automatique en cascade de toutes les entités (joueurs, staff, etc.)
    try {
      await mediaRelinkerService.relinkMediaReferences(
        oldPublicUrl,
        newPublicUrl,
        oldStoragePath,
        newStoragePath
      );
    } catch (err) {
      console.warn('[MediaService] Erreur non bloquante relinkage références:', err);
    }

    // 4. Mise à jour du cache local
    file.folder_id = actualTargetFolderId;
    file.storage_path = newStoragePath;
    file.public_url = newPublicUrl;
    saveLocalFiles([...allFiles]);

    return file;
  },

  /** Déplacer tout un dossier vers un nouveau dossier parent avec prévention des boucles */
  async moveFolder(folderId: string, newParentId: string | null): Promise<MediaFolder | null> {
    const allFolders = await this.getAllFolders();
    const folder = allFolders.find(f => f.id === folderId);
    if (!folder) return null;

    // Contrôle 1 : Impossible de déplacer un dossier dans lui-même
    if (folderId === newParentId) {
      throw new Error("Impossible de déplacer un dossier à l'intérieur de lui-même.");
    }

    // Contrôle 2 : Impossible de déplacer un dossier dans l'un de ses descendants (anti-boucle cyclique)
    const isDescendant = (childId: string | null, parentIdToFind: string): boolean => {
      if (!childId) return false;
      let curr = allFolders.find(f => f.id === childId);
      while (curr) {
        if (curr.parent_id === parentIdToFind) return true;
        curr = curr.parent_id ? allFolders.find(f => f.id === curr?.parent_id) : undefined;
      }
      return false;
    };

    if (newParentId && isDescendant(newParentId, folderId)) {
      throw new Error("Impossible de déplacer un dossier à l'intérieur de l'un de ses propres sous-dossiers.");
    }

    const oldPath = folder.path;
    const parent = newParentId ? allFolders.find(f => f.id === newParentId) : null;
    const parentPath = parent ? parent.path : '';
    const newPath = `${parentPath}/${folder.name}`.replace(/^\/+/, '/');

    folder.parent_id = newParentId || null;
    folder.path = newPath;

    // Mettre à jour les chemins des sous-dossiers enfants
    for (const f of allFolders) {
      if (f.id !== folder.id && f.path.startsWith(oldPath + '/')) {
        f.path = f.path.replace(oldPath, newPath);
      }
    }

    // 1. Mise à jour dans media_folders
    try {
      await supabase
        .from('media_folders')
        .update({
          parent_id: folder.parent_id,
          path: folder.path,
          updated_at: new Date().toISOString(),
        })
        .eq('id', folderId);

      for (const f of allFolders) {
        if (f.id !== folder.id && f.path.startsWith(newPath + '/')) {
          await supabase
            .from('media_folders')
            .update({ path: f.path })
            .eq('id', f.id);
        }
      }
    } catch (err) {
      console.warn('[MediaService] Erreur déplacement DB dossier:', err);
    }

    // 2. Déplacer physiquement tous les fichiers des dossiers affectés et relier les références
    try {
      const affectedFolderIds = [
        folder.id,
        ...allFolders.filter(f => f.path.startsWith(newPath + '/')).map(f => f.id)
      ];

      const oldStoragePrefix = sanitizeStoragePath(oldPath);
      const newStoragePrefix = sanitizeStoragePath(newPath);

      const allFiles = await this.getAllFiles();
      const filesToMove = allFiles.filter(f => f.folder_id && affectedFolderIds.includes(f.folder_id));

      for (const file of filesToMove) {
        const oldStoragePath = file.storage_path.replace(/^\/+/, '');
        if (oldStoragePath.startsWith(oldStoragePrefix + '/')) {
          const relativeSubPath = oldStoragePath.slice(oldStoragePrefix.length + 1);
          const newStoragePath = `${newStoragePrefix}/${relativeSubPath}`;
          const oldFilePublicUrl = file.public_url;

          try {
            const { error: moveErr } = await supabase.storage
              .from('medias')
              .move(oldStoragePath, newStoragePath);

            if (moveErr) {
              const { error: copyErr } = await supabase.storage
                .from('medias')
                .copy(oldStoragePath, newStoragePath);
              if (!copyErr) {
                await supabase.storage.from('medias').remove([oldStoragePath]);
              }
            }

            const { data: urlData } = supabase.storage
              .from('medias')
              .getPublicUrl(newStoragePath);

            file.storage_path = newStoragePath;
            file.public_url = urlData.publicUrl;

            await supabase
              .from('media_files')
              .update({
                storage_path: newStoragePath,
                public_url: urlData.publicUrl,
                updated_at: new Date().toISOString()
              })
              .eq('id', file.id);

            // 🔗 PRÉSERVATION DE LA FICELLE
            await mediaRelinkerService.relinkMediaReferences(
              oldFilePublicUrl,
              urlData.publicUrl,
              oldStoragePath,
              newStoragePath
            );
          } catch (fileErr) {
            console.warn(`[MediaService] Erreur déplacement Storage fichier ${file.id} (moveFolder):`, fileErr);
          }
        }
      }

      saveLocalFiles(allFiles);
    } catch (filesErr) {
      console.warn('[MediaService] Erreur non-bloquante déplacement fichiers dossier:', filesErr);
    }

    // 3. Marqueur Storage
    try {
      const cleanPath = sanitizeStoragePath(newPath);
      if (cleanPath) {
        const keepBlob = getFolderPlaceholderBlob();
        await supabase.storage.from('medias').upload(`${cleanPath}/.keep`, keepBlob, { upsert: true });
        const oldClean = sanitizeStoragePath(oldPath);
        if (oldClean && oldClean !== cleanPath) {
          await supabase.storage.from('medias').remove([`${oldClean}/.keep`]);
        }
      }
    } catch {
      // Non bloquant
    }

    saveLocalFolders(allFolders);
    return folder;
  },

  /** Renommer un fichier média avec synchronisation Storage et DB */
  async renameFile(fileId: string, newName: string): Promise<MediaFile | null> {
    const allFiles = await this.getAllFiles();
    const file = allFiles.find(f => f.id === fileId);
    if (!file) return null;

    const trimmedNewName = newName.trim();
    if (!trimmedNewName || trimmedNewName === file.name) return file;

    // Déterminer l'extension d'origine
    const oldExt = file.storage_path.includes('.')
      ? file.storage_path.split('.').pop() || 'jpg'
      : (file.name.includes('.') ? file.name.split('.').pop() || 'jpg' : 'jpg');

    // Nettoyer le nom de base en évitant la double extension
    const baseNewName = trimmedNewName.replace(/\.[^/.]+$/, '').trim();
    const cleanBaseName = baseNewName.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Conserver le dossier parent de storage_path
    const pathParts = file.storage_path.split('/');
    const folderPrefix = pathParts.slice(0, -1).join('/');

    // Générer le nouveau chemin Storage
    const newFileName = `${cleanBaseName}.${oldExt}`;
    const newStoragePath = folderPrefix ? `${folderPrefix}/${newFileName}` : newFileName;
    const oldStoragePath = file.storage_path.replace(/^\/+/, '');
    const oldPublicUrl = file.public_url;

    // 1. Déplacement / Renommage physique dans Supabase Storage
    if (oldStoragePath !== newStoragePath) {
      try {
        const { error: moveError } = await supabase.storage
          .from('medias')
          .move(oldStoragePath, newStoragePath);

        if (moveError) {
          const { error: copyError } = await supabase.storage
            .from('medias')
            .copy(oldStoragePath, newStoragePath);
          if (!copyError) {
            await supabase.storage.from('medias').remove([oldStoragePath]);
          }
        }
      } catch (err) {
        console.warn('[MediaService] Erreur déplacement Storage lors du renommage fichier:', err);
      }
    }

    // 2. Récupérer la nouvelle URL publique
    const { data: urlData } = supabase.storage
      .from('medias')
      .getPublicUrl(newStoragePath);
    const newPublicUrl = urlData.publicUrl;

    // 3. Mise à jour dans la table PostgreSQL media_files
    try {
      await supabase
        .from('media_files')
        .update({
          name: trimmedNewName,
          storage_path: newStoragePath,
          public_url: newPublicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId);
    } catch (err) {
      console.warn('[MediaService] Erreur renommage fichier en base:', err);
    }

    // 4. 🔗 PRÉSERVATION DE LA FICELLE : Relinkage automatique en cascade des références
    try {
      await mediaRelinkerService.relinkMediaReferences(
        oldPublicUrl,
        newPublicUrl,
        oldStoragePath,
        newStoragePath
      );
    } catch (err) {
      console.warn('[MediaService] Erreur non bloquante relinkage références (rename):', err);
    }

    // 5. Mise à jour du cache local
    file.name = trimmedNewName;
    file.storage_path = newStoragePath;
    file.public_url = newPublicUrl;
    saveLocalFiles([...allFiles]);

    return file;
  }
};
