export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/webp' | 'image/jpeg';
}

const SKIPPED_MIME_TYPES = new Set(['image/svg+xml', 'image/gif', 'image/x-icon']);

/**
 * Compresse et redimensionne une image côté client avant l'upload Supabase Storage.
 * Retourne le fichier original si le format n'est pas raster (SVG/GIF) ou en cas d'indisponibilité Canvas.
 */
export async function compressImageClientSide(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  if (!file.type.startsWith('image/') || SKIPPED_MIME_TYPES.has(file.type.toLowerCase())) {
    return file;
  }

  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
    return file;
  }

  const maxWidth = options.maxWidth ?? 1200;
  const maxHeight = options.maxHeight ?? 1200;
  const quality = options.quality ?? 0.78;
  const targetMime = options.mimeType ?? 'image/webp';

  try {
    const bitmap = await createImageBitmap(file);
    try {
      const ratio = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
      const targetWidth = Math.max(1, Math.round(bitmap.width * ratio));
      const targetHeight = Math.max(1, Math.round(bitmap.height * ratio));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return file;

      ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, targetMime, quality)
      );

      if (!blob || blob.size >= file.size) {
        return file;
      }

      const ext = targetMime === 'image/webp' ? 'webp' : 'jpg';
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
      return new File([blob], `${baseName}.${ext}`, {
        type: targetMime,
        lastModified: Date.now(),
      });
    } finally {
      bitmap.close();
    }
  } catch {
    return file;
  }
}
