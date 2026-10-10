import { storageService } from '../../../services/storageService';
import type { AdministrativeDocument } from '../types/recruitment';

/**
 * Téléverse un document PDF (Contrat, Pièce d'identité, Certificat, Autorisation)
 * dans le bucket Supabase Storage avec fallback transparent Base64.
 */
export const uploadRecruitmentDocument = async (
  file: File,
  category: AdministrativeDocument['category'] = 'other'
): Promise<AdministrativeDocument> => {
  // Validation stricte du type PDF
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Seuls les fichiers au format PDF sont acceptés.');
  }

  // Taille maximale 25 Mo
  if (file.size > 25 * 1024 * 1024) {
    throw new Error('Le document dépasse la taille maximale autorisée de 25 Mo.');
  }

  const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  let finalUrl = '';

  try {
    const publicUrl = await storageService.uploadFile(file, 'scouts');
    if (publicUrl) {
      finalUrl = publicUrl;
    }
  } catch (err) {
    console.warn('[uploadRecruitmentDocument] Échec upload Supabase, bascule Base64:', err);
  }

  if (!finalUrl) {
    // Fallback Data URL Base64
    finalUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Erreur de lecture du document PDF.'));
        }
      };
      reader.onerror = () => reject(new Error('Impossible de lire le fichier PDF sélectionné.'));
      reader.readAsDataURL(file);
    });
  }

  return {
    id: docId,
    name: file.name,
    url: finalUrl,
    file_type: 'application/pdf',
    file_size: file.size,
    uploaded_at: new Date().toISOString(),
    category,
  };
};
