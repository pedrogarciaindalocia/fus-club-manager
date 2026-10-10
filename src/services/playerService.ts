import { supabase } from '../lib/supabase';
import type { Player } from '../types';
import type { Inserts, Updates } from '../types/supabase';
import { getMyClubId } from './_helpers';
import { storageService } from './storageService';

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

    const { data, error } = await supabase
      .from('players')
      .insert([{ ...player, club_id: clubId }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505' || (error as any).status === 409) {
        throw new Error('Ce numéro de maillot est déjà utilisé dans cette équipe.');
      }
      throw error;
    }
    return data;
  },

  async updatePlayer(id: string, updates: Updates<'players'>): Promise<Player> {
    const { data, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Ce numéro de maillot est déjà utilisé dans cette équipe.');
      }
      throw error;
    }
    return data;
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
