import { supabase } from '../lib/supabase';
import type { OpponentPlayer } from '../types';
import type { Inserts, Updates } from '../types/supabase';

export const opponentPlayerService = {
  /** Récupère la liste des joueurs d'un club adversaire (filtrés optionnellement par catégorie) */
  async getOpponentPlayers(opponentId?: string, category?: string): Promise<OpponentPlayer[]> {
    if (!opponentId) return [];

    let query = supabase
      .from('opponent_players')
      .select('*')
      .eq('opponent_id', opponentId)
      .eq('is_active', true)
      .order('jersey_number', { ascending: true, nullsFirst: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
        return [];
      }
      throw error;
    }
    return data ?? [];
  },

  /** Ajoute un nouveau joueur à l'effectif d'un club adversaire */
  async addOpponentPlayer(player: Inserts<'opponent_players'>): Promise<OpponentPlayer> {
    const { data, error } = await supabase
      .from('opponent_players')
      .insert([player])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Ajoute plusieurs joueurs en masse à l'effectif d'un club adversaire (ex: Génération de 22 joueurs) */
  async addManyOpponentPlayers(players: Inserts<'opponent_players'>[]): Promise<OpponentPlayer[]> {
    const { data, error } = await supabase
      .from('opponent_players')
      .insert(players)
      .select();

    if (error) {
      console.warn('Batch insert error, attempting individual inserts fallback:', error);
      const inserted: OpponentPlayer[] = [];
      for (const player of players) {
        try {
          const item = await this.addOpponentPlayer(player);
          if (item) inserted.push(item);
        } catch (e) {
          console.error('Individual insert error:', e);
        }
      }
      if (inserted.length === 0) throw error;
      return inserted;
    }
    return data ?? [];
  },

  /** Met à jour les informations d'un joueur adverse */
  async updateOpponentPlayer(id: string, updates: Updates<'opponent_players'>): Promise<OpponentPlayer> {
    const { data, error } = await supabase
      .from('opponent_players')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Supprime un joueur de l'effectif adverse */
  async deleteOpponentPlayer(id: string): Promise<void> {
    const { error } = await supabase
      .from('opponent_players')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
