import { supabase } from '../lib/supabase';
import { validateFileSecurity } from './mediaService';

export type StorageUploadType =
  | 'leagues'
  | 'clubs'
  | 'players'
  | 'staff'
  | 'stadiums'
  | 'blog'
  | 'banners'
  | 'arbitres'
  | 'scouts'
  | 'scout_players'
  | 'medias';

interface StorageStrategy {
  bucket: string;
  resolvePath: (fileName: string) => string;
  defaultFolderId: string;
}

/**
 * Registre de stratégies de stockage respectant le principe Open/Closed (OCP).
 * L'extension vers un nouveau type d'entité se fait par simple déclaration sans modifier la logique d'upload.
 */
const STORAGE_STRATEGIES: Record<StorageUploadType, StorageStrategy> = {
  players:       { bucket: 'medias',  resolvePath: (fn) => `default/${fn}`, defaultFolderId: 'a0000000-0000-0000-0000-000000000001' },
  medias:        { bucket: 'medias',  resolvePath: (fn) => `default/${fn}`, defaultFolderId: 'a0000000-0000-0000-0000-000000000001' },
  staff:         { bucket: 'medias',  resolvePath: (fn) => `default/${fn}`, defaultFolderId: 'a0000000-0000-0000-0000-000000000001' },
  arbitres:      { bucket: 'medias',  resolvePath: (fn) => `default/${fn}`, defaultFolderId: 'a0000000-0000-0000-0000-000000000001' },
  stadiums:      { bucket: 'medias',  resolvePath: (fn) => `default/${fn}`, defaultFolderId: 'a0000000-0000-0000-0000-000000000001' },
  blog:          { bucket: 'medias',  resolvePath: (fn) => `default/${fn}`, defaultFolderId: 'a0000000-0000-0000-0000-000000000001' },
  banners:       { bucket: 'medias',  resolvePath: (fn) => `default/${fn}`, defaultFolderId: 'a0000000-0000-0000-0000-000000000001' },
  leagues:       { bucket: 'medias',  resolvePath: (fn) => `default/${fn}`, defaultFolderId: 'a0000000-0000-0000-0000-000000000001' },
  clubs:         { bucket: 'medias',  resolvePath: (fn) => `default/${fn}`, defaultFolderId: 'a0000000-0000-0000-0000-000000000001' },
  scouts:        { bucket: 'medias',  resolvePath: (fn) => `default/${fn}`, defaultFolderId: 'a0000000-0000-0000-0000-000000000001' },
  scout_players: { bucket: 'medias',  resolvePath: (fn) => `default/${fn}`, defaultFolderId: 'a0000000-0000-0000-0000-000000000001' },
};

export const storageService = {
  /** Supprime un fichier depuis son URL publique Supabase Storage */
  async deleteFile(publicUrl: string): Promise<void> {
    try {
      // Extraire bucket + path depuis l'URL publique
      // Format: .../storage/v1/object/public/<bucket>/<path>
      const match = publicUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
      if (!match) return;
      const [, bucket, path] = match;
      await supabase.storage.from(bucket).remove([path]);
    } catch (err) {
      console.warn('[StorageService] Erreur non-bloquante lors de la suppression du fichier:', err);
    }
  },

  /** Téléverse un fichier en appliquant la stratégie dédiée à son type */
  async uploadFile(file: File, type: StorageUploadType): Promise<string> {
    // 🛡️ Sécurité : Rejet immédiat des fichiers exécutables / non autorisés
    const validation = validateFileSecurity(file);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Fichier refusé pour des raisons de sécurité.');
    }

    const strategy = STORAGE_STRATEGIES[type] ?? {
      bucket: 'medias',
      resolvePath: (fn: string) => `default/${fn}`,
      defaultFolderId: 'a0000000-0000-0000-0000-000000000001',
    };

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = strategy.resolvePath(fileName);

    // 1. Upload file to specific bucket
    const { error: uploadError } = await supabase.storage
      .from(strategy.bucket)
      .upload(filePath, file);

    if (uploadError) {
      console.error(`[StorageService] Échec upload image (${type}):`, uploadError);
      throw uploadError;
    }

    // 2. Get Public URL
    const { data } = supabase.storage
      .from(strategy.bucket)
      .getPublicUrl(filePath);

    // 3. Enregistrement dans media_files avec dossier par défaut pour visibilité immédiate dans l'Espace Média
    const mediaFileRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}-${Math.random()}`,
      name: file.name,
      folder_id: strategy.defaultFolderId,
      storage_path: filePath,
      public_url: data.publicUrl,
      file_size: file.size,
      mime_type: file.type || 'image/jpeg',
      created_at: new Date().toISOString(),
    };

    try {
      const { data: dbInsert } = await supabase
        .from('media_files')
        .insert([{
          name: mediaFileRecord.name,
          folder_id: mediaFileRecord.folder_id,
          storage_path: mediaFileRecord.storage_path,
          public_url: mediaFileRecord.public_url,
          file_size: mediaFileRecord.file_size,
          mime_type: mediaFileRecord.mime_type,
        }])
        .select()
        .single();

      if (dbInsert?.id) {
        mediaFileRecord.id = dbInsert.id;
      }
    } catch {
      // Non bloquant si migration non exécutée
    }

    // 4. Synchronisation dans le cache local de l'Espace Média
    try {
      const LOCAL_FILES_KEY = 'fusc_media_files_cache';
      const raw = localStorage.getItem(LOCAL_FILES_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      existing.unshift(mediaFileRecord);
      localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(existing));
    } catch {
      // Ignorer
    }

    return data.publicUrl;
  }
};

