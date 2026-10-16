import { supabase } from '../lib/supabase';
import type { Player } from '../types';
import type { Inserts, Updates } from '../types/supabase';
import { getMyClubId } from './_helpers';
import { storageService } from './storageService';

let hasCelebrationColumn: boolean | null = null;

function sanitizePlayerPayload<T extends Record<string, any>>(payload: T): T {
  const clean = { ...payload };
  // If celebration_photo_url is empty, or if we know DB doesn't have the column yet, omit it to prevent Postgres 42703 / HTTP 400
  if (!clean.celebration_photo_url || hasCelebrationColumn === false) {
    delete clean.celebration_photo_url;
  }
  return clean;
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
    const cleanPlayer = sanitizePlayerPayload(player);

    try {
      const { data, error } = await supabase
        .from('players')
        .insert([{ ...cleanPlayer, club_id: clubId }])
        .select()
        .single();

      if (error) throw error;
      if (player.celebration_photo_url) hasCelebrationColumn = true;
      return data;
    } catch (error: any) {
      if (error.code === '42703' && (error.message?.includes('celebration_photo_url') || error.details?.includes('celebration_photo_url'))) {
        hasCelebrationColumn = false;
        console.warn('Colonne celebration_photo_url absente, repli automatique sans ce champ.');
        const { celebration_photo_url, ...withoutCelebration } = cleanPlayer as any;
        const { data: fallbackData, error: retryErr } = await supabase
          .from('players')
          .insert([{ ...withoutCelebration, club_id: clubId }])
          .select()
          .single();
        if (retryErr) throw retryErr;
        return fallbackData;
      }
      if (error.code === '23505' || (error as any).status === 409) {
        throw new Error('Ce numéro de maillot est déjà utilisé dans cette équipe.');
      }
      throw error;
    }
  },

  async updatePlayer(id: string, updates: Updates<'players'>): Promise<Player> {
    const cleanUpdates = sanitizePlayerPayload(updates);

    try {
      const { data, error } = await supabase
        .from('players')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (updates.celebration_photo_url) hasCelebrationColumn = true;
      return data;
    } catch (error: any) {
      if (error.code === '42703' && (error.message?.includes('celebration_photo_url') || error.details?.includes('celebration_photo_url'))) {
        hasCelebrationColumn = false;
        console.warn('Colonne celebration_photo_url absente, repli automatique sans ce champ.');
        const { celebration_photo_url, ...withoutCelebration } = cleanUpdates as any;
        const { data: fallbackData, error: retryErr } = await supabase
          .from('players')
          .update(withoutCelebration)
          .eq('id', id)
          .select()
          .single();
        if (retryErr) throw retryErr;
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
