import { supabase } from '../../../lib/supabase';
import { storageService } from '../../../services/storageService';
import { ALLOWED_IMAGE_EXTENSIONS, ALLOWED_IMAGE_MIME_TYPES, convertHeicIfSupported } from '../../../services/mediaService';
import type { AdministrativeDocument } from '../types/recruitment';

export interface UploadRecruitmentDocumentOptions {
  allowImages?: boolean;
  maxSizeMb?: number;
}

const isPdfFile = (file: File): boolean =>
  file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');

const isImageFile = (file: File): boolean => {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return (
    file.type.startsWith('image/') ||
    ALLOWED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase()) ||
    ALLOWED_IMAGE_EXTENSIONS.includes(ext)
  );
};

/**
 * Téléverse un document PDF (ou Image si allowImages=true) dans Supabase Storage
 * avec fallback transparent en Data URL Base64.
 */
export const uploadRecruitmentDocument = async (
  file: File,
  category: AdministrativeDocument['category'] = 'other',
  options?: UploadRecruitmentDocumentOptions
): Promise<AdministrativeDocument> => {
  const allowImages = Boolean(options?.allowImages || category === 'honor_declaration');
  const maxSizeMb = options?.maxSizeMb ?? 25;

  const isPdf = isPdfFile(file);
  const isImage = isImageFile(file);

  if (!isPdf && !(allowImages && isImage)) {
    throw new Error(
      allowImages
        ? 'Format de fichier non supporté. Veuillez sélectionner un PDF ou une image (JPG, PNG, WEBP, HEIC).'
        : 'Seuls les fichiers au format PDF sont acceptés.'
    );
  }

  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`Le document dépasse la taille maximale autorisée de ${maxSizeMb} Mo.`);
  }

  const fileToUpload = isImage ? await convertHeicIfSupported(file) : file;
  const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  let finalUrl = '';

  try {
    if (category === 'honor_declaration') {
      // Déclaration sur l'honneur (PDF ou Image) -> bucket 'medias', dossier 'scout_documents/'
      const rawExt = (fileToUpload.name.split('.').pop() || (isPdf ? 'pdf' : 'jpg'))
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') || (isPdf ? 'pdf' : 'jpg');
      const storagePath = `scout_documents/${Date.now()}-${Math.random().toString(36).substring(2)}.${rawExt}`;
      const { error: uploadErr } = await supabase.storage
        .from('medias')
        .upload(storagePath, fileToUpload, {
          contentType: fileToUpload.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
          upsert: false,
        });
      if (uploadErr) {
        console.error('[uploadRecruitmentDocument] Erreur upload medias/scout_documents:', uploadErr);
        throw new Error(`Échec upload Supabase Storage (medias/scout_documents) : ${uploadErr.message}`);
      }
      const { data } = supabase.storage.from('medias').getPublicUrl(storagePath);
      if (!data?.publicUrl) {
        throw new Error('Impossible de récupérer l’URL publique depuis medias/scout_documents.');
      }
      finalUrl = data.publicUrl;
    } else if (isImage) {
      const publicUrl = await storageService.uploadFile(fileToUpload, 'scouts');
      if (publicUrl) {
        finalUrl = publicUrl;
      }
    } else if (isPdf) {
      // Pour les autres PDF de recrutement, téléverser également dans 'medias/scout_documents/'
      const safeExt = 'pdf';
      const storagePath = `scout_documents/${Date.now()}-${Math.random().toString(36).substring(2)}.${safeExt}`;
      const { error: uploadErr } = await supabase.storage
        .from('medias')
        .upload(storagePath, fileToUpload, { contentType: 'application/pdf' });
      if (!uploadErr) {
        const { data } = supabase.storage.from('medias').getPublicUrl(storagePath);
        if (data?.publicUrl) {
          finalUrl = data.publicUrl;
        }
      }
    }
  } catch (err) {
    if (category === 'honor_declaration') {
      throw err;
    }
    console.warn('[uploadRecruitmentDocument] Échec upload Supabase, bascule Base64:', err);
  }

  if (!finalUrl) {
    finalUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Erreur de lecture du document sélectionné.'));
        }
      };
      reader.onerror = () => reject(new Error('Impossible de lire le fichier sélectionné.'));
      reader.readAsDataURL(fileToUpload);
    });
  }

  return {
    id: docId,
    name: fileToUpload.name || file.name,
    url: finalUrl,
    file_type: isPdf ? 'application/pdf' : (fileToUpload.type || 'image/jpeg'),
    file_size: fileToUpload.size || file.size,
    uploaded_at: new Date().toISOString(),
    category,
  };
};
