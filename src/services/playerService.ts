import { supabase } from '../lib/supabase';
import type { Player } from '../types';
import type { Inserts, Updates } from '../types/supabase';
import { getMyClubId } from './_helpers';
import { storageService } from './storageService';

let knownMissingColumns = new Set<string>();

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
    const clubId = await getMyClubId();
    let cleanPlayer = sanitizePlayerPayload(player);

    try {
      const { data, error } = await supabase
        .from('players')
        .insert([{ ...cleanPlayer, club_id: clubId }])
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
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) throw error;
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

    // Supprimer en DB
    const { error } = await supabase.from('players').delete().in('id', ids);
    if (error) throw error;

    // Supprimer les photos du storage (en parallèle, erreurs ignorées)
    await Promise.allSettled(
      (rows ?? [])
        .filter(r => r.photo_url && r.photo_url !== 'null')
        .map(r => storageService.deleteFile(r.photo_url!))
    );
  },
};
