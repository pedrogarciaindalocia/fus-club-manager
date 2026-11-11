import { supabase } from '../lib/supabase';
import type { OpponentMatch } from '../types';
import { getMyClubId } from './_helpers';

const LOCAL_STORAGE_KEY = 'fusc_opponent_matches_fallback';

function getLocalFallback(): OpponentMatch[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFallback(items: OpponentMatch[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('[opponentMatchService] Error writing to localStorage:', err);
  }
}

let isOpponentMatchesTableMissing = false;

export const opponentMatchService = {
  /**
   * Récupère tous les matchs entre clubs adverses (filtrable par league_id)
   */
  async getOpponentMatches(leagueId?: string): Promise<OpponentMatch[]> {
    if (isOpponentMatchesTableMissing) {
      const local = getLocalFallback();
      return leagueId ? local.filter(m => m.league_id === leagueId) : local;
    }

    try {
      let query = supabase
        .from('opponent_matches' as any)
        .select('*')
        .order('match_date', { ascending: false });

      if (leagueId) {
        query = query.eq('league_id', leagueId);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table') || error.code === '42P01') {
          isOpponentMatchesTableMissing = true;
        }
        // Table non créée ou indisponible -> fallback localStorage
        const local = getLocalFallback();
        return leagueId ? local.filter(m => m.league_id === leagueId) : local;
      }

      return (data || []) as OpponentMatch[];
    } catch (err: any) {
      isOpponentMatchesTableMissing = true;
      const local = getLocalFallback();
      return leagueId ? local.filter(m => m.league_id === leagueId) : local;
    }
  },

  /**
   * Crée un nouveau match / résultat adverse
   */
  async createOpponentMatch(
    match: Omit<OpponentMatch, 'id' | 'created_at' | 'updated_at'>
  ): Promise<OpponentMatch> {
    const clubId = await getMyClubId().catch(() => null);

    const payload = {
      ...match,
      club_id: clubId,
      score_home: Number(match.score_home ?? 0),
      score_away: Number(match.score_away ?? 0),
      status: match.status || 'finished',
    };

    try {
      const { data, error } = await supabase
        .from('opponent_matches' as any)
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.warn('[opponentMatchService] Insert error, saving locally:', error.message);
        const localItem: OpponentMatch = {
          ...payload,
          id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const current = getLocalFallback();
        saveLocalFallback([localItem, ...current]);
        return localItem;
      }

      return data as OpponentMatch;
    } catch (err) {
      const localItem: OpponentMatch = {
        ...payload,
        id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const current = getLocalFallback();
      saveLocalFallback([localItem, ...current]);
      return localItem;
    }
  },

  /**
   * Met à jour le score ou les informations d'un match adverse
   */
  async updateOpponentMatch(
    id: string,
    updates: Partial<OpponentMatch>
  ): Promise<OpponentMatch> {
    try {
      const { data, error } = await supabase
        .from('opponent_matches' as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.warn('[opponentMatchService] Update error, updating locally:', error.message);
        const current = getLocalFallback();
        const updated = current.map(m => m.id === id ? { ...m, ...updates } : m);
        saveLocalFallback(updated);
        return updated.find(m => m.id === id) as OpponentMatch;
      }

      return data as OpponentMatch;
    } catch (err) {
      const current = getLocalFallback();
      const updated = current.map(m => m.id === id ? { ...m, ...updates } : m);
      saveLocalFallback(updated);
      return updated.find(m => m.id === id) as OpponentMatch;
    }
  },

  /**
   * Supprime un match adverse
   */
  async deleteOpponentMatch(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('opponent_matches' as any)
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('[opponentMatchService] Delete error, removing locally:', error.message);
      }
    } catch (err) {
      console.warn('[opponentMatchService] Exception on delete:', err);
    } finally {
      const current = getLocalFallback();
      saveLocalFallback(current.filter(m => m.id !== id));
    }
  },
};

