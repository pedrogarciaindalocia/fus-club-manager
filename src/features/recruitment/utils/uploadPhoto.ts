import { storageService } from '../../../services/storageService';
import type { StorageUploadType } from '../../../services/storageService';

/**
 * Téléverse une photo de joueur ou de scout/recruteur dans le bucket Supabase Storage 'scouts'.
 * - Photos de joueurs détectés : scouts/players/...
 * - Photos de scouts/recruteurs : scouts/scouts/...
 * 
 * Bascule en toute transparence sur un encodage Base64 data URL
 * en cas de coupure réseau, bucket non provisionné ou environnement de test local.
 */
export const uploadRecruitmentPhoto = async (
  file: File,
  target: 'players' | 'scouts' = 'players'
): Promise<string> => {
  // Validation de taille (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("L'image dépasse la taille maximale autorisée de 10 Mo");
  }

  const storageType: StorageUploadType = target === 'scouts' ? 'scouts' : 'scout_players';

  try {
    const publicUrl = await storageService.uploadFile(file, storageType);
    if (publicUrl) return publicUrl;
  } catch (err) {
    console.warn(`[RecruitmentPhoto] Échec upload Supabase dans le bucket 'scouts' (${storageType}), bascule automatique en Base64:`, err);
  }

  // Fallback fiable FileReader
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error("Erreur de conversion de l'image"));
      }
    };
    reader.onerror = () => reject(new Error("Impossible de lire le fichier sélectionné"));
    reader.readAsDataURL(file);
  });
};
