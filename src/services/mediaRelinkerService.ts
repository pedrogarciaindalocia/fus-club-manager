import { supabase } from '../lib/supabase';

export interface RelinkTarget {
  table: string;
  column: string;
  label: string;
}

/**
 * Liste exhaustive des tables et colonnes de l'application
 * pouvant référencer une URL d'image/média Supabase Storage.
 */
export const MEDIA_REFERENCE_TARGETS: RelinkTarget[] = [
  { table: 'players', column: 'photo_url', label: 'Joueurs' },
  { table: 'staff', column: 'photo_url', label: 'Membres du Staff' },
  { table: 'teams', column: 'photo_url', label: 'Équipes' },
  { table: 'stadiums', column: 'photo_url', label: 'Stades' },
  { table: 'opponent_players', column: 'photo_url', label: 'Joueurs Adverses' },
  { table: 'scouts', column: 'photo_url', label: 'Scouts' },
  { table: 'scout_players', column: 'photo_url', label: 'Joueurs Détectés' },
  { table: 'arbitres', column: 'photo_url', label: 'Arbitres' },
  { table: 'clubs', column: 'logo_url', label: 'Clubs' },
  { table: 'leagues', column: 'logo_url', label: 'Compétitions' },
  { table: 'settings', column: 'logo_url', label: 'Paramètres Club' },
  { table: 'user_profiles', column: 'avatar_url', label: 'Profils Utilisateurs' },
  { table: 'blog_posts', column: 'cover_image', label: 'Articles Blog' },
  { table: 'banners', column: 'image_url', label: 'Bannières' },
];

export interface RelinkResult {
  updatedTotal: number;
  details: string[];
}

/**
 * Service de réconciliation des références de médias (« La Ficelle »).
 * Lorsqu'un fichier est déplacé, renommé ou réorganisé dans l'Espace Média,
 * ce service met à jour automatiquement toutes les entités de l'application
 * (fiches joueurs, staff, logos, etc.) pour qu'elles pointent immédiatement
 * vers la nouvelle URL et le nouveau chemin sans rupture d'affichage (Erreur 404).
 */
export const mediaRelinkerService = {
  /**
   * Propage la nouvelle URL publique à toutes les tables référençant l'ancienne URL.
   */
  async relinkMediaReferences(
    oldPublicUrl: string,
    newPublicUrl: string,
    oldStoragePath?: string,
    newStoragePath?: string
  ): Promise<RelinkResult> {
    if (!oldPublicUrl || !newPublicUrl || oldPublicUrl === newPublicUrl) {
      return { updatedTotal: 0, details: [] };
    }

    const cleanOldUrl = oldPublicUrl.trim();
    const cleanNewUrl = newPublicUrl.trim();
    let updatedTotal = 0;
    const details: string[] = [];

    // Extraction du chemin relatif de stockage pour match flexible
    const oldPath = oldStoragePath
      ? oldStoragePath.replace(/^\/+/, '')
      : this.extractStoragePathFromUrl(cleanOldUrl);

    for (const target of MEDIA_REFERENCE_TARGETS) {
      try {
        const tableClient = (supabase.from(target.table as any) as any);

        // 1. Recherche directe par URL publique exacte
        const { data: exactMatches, error: searchError } = await tableClient
          .select(`id, ${target.column}`)
          .eq(target.column, cleanOldUrl);

        if (!searchError && exactMatches && exactMatches.length > 0) {
          const ids = (exactMatches as Array<{ id: string }>).map(m => m.id);
          const { error: updateError } = await tableClient
            .update({ [target.column]: cleanNewUrl })
            .in('id', ids);

          if (!updateError) {
            updatedTotal += ids.length;
            details.push(`${ids.length} ${target.label}`);
          }
        }

        // 2. Recherche tolérante si l'URL contient des query params ou le storage path
        if (oldPath) {
          const { data: partialMatches, error: partialErr } = await tableClient
            .select(`id, ${target.column}`)
            .ilike(target.column, `%${oldPath}%`)
            .neq(target.column, cleanNewUrl);

          if (!partialErr && partialMatches && partialMatches.length > 0) {
            const idsToUpdate = (partialMatches as Array<{ id: string }>).map(m => m.id);
            const { error: updatePartialError } = await tableClient
              .update({ [target.column]: cleanNewUrl })
              .in('id', idsToUpdate);

            if (!updatePartialError) {
              const count = idsToUpdate.length;
              updatedTotal += count;
              details.push(`${count} ${target.label} (via path)`);
            }
          }
        }
      } catch (err) {
        // Tolérance : si une table ou colonne n'existe pas encore dans cet environnement
        console.debug(`[MediaRelinker] Table/colonne ${target.table}.${target.column} ignorée:`, err);
      }
    }

    if (updatedTotal > 0) {
      console.info(`[MediaRelinker] 🔗 La ficelle a été préservée : ${updatedTotal} référence(s) mise(s) à jour (${details.join(', ')})`);
    }

    return { updatedTotal, details };
  },

  /**
   * Extrait le chemin de stockage interne (/medias/...) depuis une URL publique Supabase
   */
  extractStoragePathFromUrl(url: string): string | null {
    try {
      const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+?)(\?.*)?$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
};
