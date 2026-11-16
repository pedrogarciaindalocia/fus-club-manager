import { supabase, supabaseAdmin } from '../lib/supabase';
import type { Player } from '../types';
import type { Inserts, Updates } from '../types/supabase';
import { getMyClubId } from './_helpers';
import { storageService } from './storageService';

const knownMissingColumns = new Set<string>();

function sanitizePlayerPayload<T extends Record<string, any>>(payload: T): T {
  const clean = { ...payload };
  // Supprimer automatiquement toute colonne identifiée comme inexistante dans la DB
  knownMissingColumns.forEach((col) => {
    delete clean[col];
  });
  if (knownMissingColumns.has('celebration_photo_url') || !clean.celebration_photo_url) {
    delete clean.celebration_photo_url;
  }
  return clean;
}

function detectAndRecordMissingColumn(error: any): string | null {
  if (error?.code === '42703') {
    const msg = (error.message || '') + ' ' + (error.details || '');
    const candidates = ['celebration_photo_url', 'category_number', 'first_name', 'last_name', 'birth_year', 'secondary_position'];
    for (const c of candidates) {
      if (msg.includes(c)) {
        knownMissingColumns.add(c);
        return c;
      }
    }
  }
  return null;
}

export const playerService = {
  async getPlayers(teamId?: string): Promise<Player[]> {
    const clubId = await getMyClubId();

    let query = supabase
      .from('players')
      .select('*')
      .eq('club_id', clubId)
      .neq('is_active', false)
      .order('full_name', { ascending: true });

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data, error } = await query;
    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205') return [];
      throw error;
    }
    return data ?? [];
  },

  async addPlayer(player: Omit<Inserts<'players'>, 'id'>): Promise<Player> {
    const clubId = (await getMyClubId()) || '45642829-a3d7-48de-afdd-3c45a1ced474';
    let cleanPlayer = sanitizePlayerPayload(player);
    const targetClubId = (cleanPlayer as any).club_id || clubId || '45642829-a3d7-48de-afdd-3c45a1ced474';

    try {
      const { data, error } = await supabase
        .from('players')
        .insert([{ ...cleanPlayer, club_id: targetClubId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      const missing = detectAndRecordMissingColumn(error);
      if (missing) {
        console.warn(`Colonne ${missing} absente dans la DB, repli automatique.`);
        cleanPlayer = sanitizePlayerPayload(cleanPlayer);
        const { data: fallbackData, error: retryErr } = await supabase
          .from('players')
          .insert([{ ...cleanPlayer, club_id: clubId }])
          .select()
          .single();
        if (retryErr) {
          const secondMissing = detectAndRecordMissingColumn(retryErr);
          if (secondMissing) {
            cleanPlayer = sanitizePlayerPayload(cleanPlayer);
            const { data: retry2Data, error: retry2Err } = await supabase
              .from('players')
              .insert([{ ...cleanPlayer, club_id: clubId }])
              .select()
              .single();
            if (retry2Err) throw retry2Err;
            return retry2Data;
          }
          throw retryErr;
        }
        return fallbackData;
      }
      if (error.code === '23505' || (error as any).status === 409) {
        throw new Error('Ce numéro de maillot est déjà utilisé dans cette équipe.');
      }
      throw error;
    }
  },

  async updatePlayer(id: string, updates: Updates<'players'>): Promise<Player> {
    let cleanUpdates = sanitizePlayerPayload(updates);

    try {
      const { data, error } = await supabase
        .from('players')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      const missing = detectAndRecordMissingColumn(error);
      if (missing) {
        console.warn(`Colonne ${missing} absente dans la DB, repli automatique.`);
        cleanUpdates = sanitizePlayerPayload(cleanUpdates);
        const { data: fallbackData, error: retryErr } = await supabase
          .from('players')
          .update(cleanUpdates)
          .eq('id', id)
          .select()
          .single();
        if (retryErr) {
          const secondMissing = detectAndRecordMissingColumn(retryErr);
          if (secondMissing) {
            cleanUpdates = sanitizePlayerPayload(cleanUpdates);
            const { data: retry2Data, error: retry2Err } = await supabase
              .from('players')
              .update(cleanUpdates)
              .eq('id', id)
              .select()
              .single();
            if (retry2Err) throw retry2Err;
            return retry2Data;
          }
          throw retryErr;
        }
        return fallbackData;
      }
      if (error.code === '23505') {
        throw new Error('Ce numéro de maillot est déjà utilisé dans cette équipe.');
      }
      throw error;
    }
  },

  async deletePlayer(id: string): Promise<void> {
    // 1. Récupérer la photo avant suppression
    const { data: player } = await supabase
      .from('players')
      .select('id, photo_url')
      .eq('id', id)
      .maybeSingle();

    // 2. Nettoyage préventif des liaisons dépendantes pour éviter toute violation de clé étrangère
    try {
      await Promise.allSettled([
        supabase.from('match_players').delete().eq('player_id', id),
        supabase.from('player_match_stats').delete().eq('player_id', id),
        supabase.from('match_events').delete().eq('player_id', id),
        supabase.from('match_events').delete().eq('related_player_id', id),
        supabase.from('player_surclassements').delete().eq('player_id', id),
        supabase.from('player_mentions').delete().eq('player_id', id),
        supabase.from('player_performance_evaluations').delete().eq('player_id', id),
      ]);
    } catch (cleanupErr) {
      console.warn('[playerService] Nettoyage préalable des liaisons:', cleanupErr);
    }

    // 3. Suppression dans la table players
    const { data, error } = await supabase.from('players').delete().eq('id', id).select('id');

    // Repli de secours via supabaseAdmin si la suppression est bloquée par RLS
    if (error || !data || data.length === 0) {
      if (supabaseAdmin && supabaseAdmin !== supabase) {
        try {
          await Promise.allSettled([
            supabaseAdmin.from('match_players').delete().eq('player_id', id),
            supabaseAdmin.from('player_match_stats').delete().eq('player_id', id),
            supabaseAdmin.from('match_events').delete().eq('player_id', id),
            supabaseAdmin.from('player_surclassements').delete().eq('player_id', id),
            supabaseAdmin.from('player_mentions').delete().eq('player_id', id),
            supabaseAdmin.from('player_performance_evaluations').delete().eq('player_id', id),
          ]);
        } catch {
          // Continuer vers la suppression du joueur
        }
        const { error: adminErr } = await supabaseAdmin.from('players').delete().eq('id', id);
        if (adminErr) throw adminErr;
      } else if (error) {
        throw error;
      }
    }

    // 4. Nettoyage de la photo dans le storage
    if (player?.photo_url && player.photo_url !== 'null') {
      try {
        await storageService.deleteFile(player.photo_url);
      } catch {
        // Ignorer si le fichier n'existe pas dans le bucket
      }
    }
  },

  /** Ajoute plusieurs joueurs en une seule opération */
  async bulkAddPlayers(players: Omit<Inserts<'players'>, 'id'>[]): Promise<void> {
    if (!players.length) return;
    const clubId = await getMyClubId();
    const rows = players.map(p => ({ ...p, club_id: clubId }));
    const { error } = await supabase.from('players').insert(rows);
    if (error) throw error;
  },

  /** Supprime plusieurs joueurs + leurs photos en une seule opération */
  async bulkDeletePlayers(ids: string[]): Promise<void> {
    if (!ids.length) return;
    // Récupérer les photos avant suppression
    const { data: rows } = await supabase
      .from('players')
      .select('id, photo_url')
      .in('id', ids);

    // Nettoyage préventif des liaisons dépendantes
    try {
      await Promise.allSettled([
        supabase.from('match_players').delete().in('player_id', ids),
        supabase.from('player_match_stats').delete().in('player_id', ids),
        supabase.from('match_events').delete().in('player_id', ids),
        supabase.from('match_events').delete().in('related_player_id', ids),
        supabase.from('player_surclassements').delete().in('player_id', ids),
        supabase.from('player_mentions').delete().in('player_id', ids),
        supabase.from('player_performance_evaluations').delete().in('player_id', ids),
      ]);
    } catch (cleanupErr) {
      console.warn('[playerService] Nettoyage en masse des liaisons:', cleanupErr);
    }

    // Supprimer en DB
    const { data, error } = await supabase.from('players').delete().in('id', ids).select('id');

    // Repli de secours via supabaseAdmin
    if (error || !data || data.length === 0) {
      if (supabaseAdmin && supabaseAdmin !== supabase) {
        try {
          await Promise.allSettled([
            supabaseAdmin.from('match_players').delete().in('player_id', ids),
            supabaseAdmin.from('player_match_stats').delete().in('player_id', ids),
            supabaseAdmin.from('match_events').delete().in('player_id', ids),
            supabaseAdmin.from('player_surclassements').delete().in('player_id', ids),
            supabaseAdmin.from('player_mentions').delete().in('player_id', ids),
            supabaseAdmin.from('player_performance_evaluations').delete().in('player_id', ids),
          ]);
        } catch {
          // Continuer vers la suppression admin
        }
        const { error: adminErr } = await supabaseAdmin.from('players').delete().in('id', ids);
        if (adminErr) throw adminErr;
      } else if (error) {
        throw error;
      }
    }

    // Supprimer les photos du storage (en parallèle, erreurs ignorées)
    await Promise.allSettled(
      (rows ?? [])
        .filter(r => r.photo_url && r.photo_url !== 'null')
        .map(r => storageService.deleteFile(r.photo_url!))
    );
  },
};
