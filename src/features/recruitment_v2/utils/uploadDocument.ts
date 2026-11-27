import { supabase } from '../../../lib/supabase';
import { storageService } from '../../../services/storageService';
import { ALLOWED_IMAGE_EXTENSIONS, ALLOWED_IMAGE_MIME_TYPES, convertHeicIfSupported } from '../../../services/mediaService';
import { compressImageClientSide } from '../../../utils/compressImage';
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

  const convertedFile = isImage ? await convertHeicIfSupported(file) : file;
  const fileToUpload = isImage
    ? await compressImageClientSide(convertedFile, { maxWidth: 1200, quality: 0.78, mimeType: 'image/webp' })
    : convertedFile;
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
          cacheControl: '31536000',
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
        .upload(storagePath, fileToUpload, {
          cacheControl: '31536000',
          contentType: 'application/pdf',
        });
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
    console.warn('[uploadRecruitmentDocument] Échec upload Supabase:', err);
  }

  if (!finalUrl) {
    throw new Error(
      "Échec du téléversement vers Supabase Storage. Veuillez vérifier votre connexion et réessayer."
    );
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
