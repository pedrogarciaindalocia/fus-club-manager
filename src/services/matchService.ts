import { supabase } from '../lib/supabase';
import type { Match, MatchEvent, MatchStats, PlayerMatchStat, MatchLineup } from '../types';
import type { Inserts, Updates } from '../types/supabase';
import { getMyClubId } from './_helpers';

// -------------------------------------------------------
// Matches
// -------------------------------------------------------

export const matchService = {
  async getAllMatches(): Promise<(Match & { lineup: MatchLineup; staff_ids: string[] })[]> {
    const clubId = await getMyClubId();

    const { data, error } = await supabase
      .from('matches')
      .select('*, match_players(player_id, is_starting, position_index, rating, rating_comment), match_staff(staff_id)')
      .eq('club_id', clubId)
      .order('match_date', { ascending: false });

    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205') return [];
      throw error;
    }

    return (data ?? []).map(m => {
      // Build startingXI array with correct ordering using position_index
      const startingPlayers = m.match_players?.filter((p: any) => p.is_starting) ?? [];
      const substitutes = m.match_players?.filter((p: any) => !p.is_starting).map((p: any) => p.player_id) ?? [];
      
      // Sort by position_index if available, otherwise maintain original order (backward compatibility)
      const sortedStarters = startingPlayers.sort((a: any, b: any) => {
        // If position_index is null/undefined, treat as -1 (will be at the end)
        const idxA = a.position_index ?? -1;
        const idxB = b.position_index ?? -1;
        return idxA - idxB;
      });
      
      // Build startingXI array (11 slots)
      const startingXI: string[] = Array(11).fill('');
      sortedStarters.forEach((p: any) => {
        const idx = p.position_index;
        // Only place if index is valid (0-10)
        if (idx !== null && idx !== undefined && idx >= 0 && idx < 11) {
          startingXI[idx] = p.player_id;
        }
      });
      
      return {
        ...m,
        lineup: {
          startingXI,
          substitutes,
          formation: (m.lineup as any)?.formation ?? m.formation ?? '4-3-3',
        },
        staff_ids: m.match_staff?.map((s: any) => s.staff_id) ?? [],
      };
    });
  },

  async createMatch(
    match: Omit<Inserts<'matches'>, 'id' | 'club_id'> & {
      lineup?: MatchLineup;
      staff_ids?: string[];
      opponent_lineup?: any[];
      opponent_subs?: any[];
    }
  ): Promise<Match> {
    const clubId = await getMyClubId();

    if (!match.team_id)     throw new Error('team_id est obligatoire');
    if (!match.opponent_id) throw new Error('opponent_id est obligatoire');

    // Extract fields handled separately or not yet in DB schema
    const { 
      lineup, 
      staff_ids, 
      opponent_lineup, 
      opponent_subs, 
      match_type, 
      match_format, 
      ...payload 
    } = match as any;

    const mergedLineup = lineup ? {
      ...lineup,
      match_type: match_type || (lineup as any).match_type,
      match_format: match_format || (lineup as any).match_format,
    } : (match_type || match_format ? { match_type, match_format } : undefined);

    // Build the DB payload — only include opponent scouting if we have data
    const dbPayload: any = { ...payload, club_id: clubId, status: payload.status ?? 'scheduled' };
    if (mergedLineup) dbPayload.lineup = mergedLineup;
    
    // Safely try to include opponent fields (they require the migration to be run)
    if (opponent_lineup !== undefined) dbPayload.opponent_lineup = opponent_lineup;
    if (opponent_subs !== undefined)   dbPayload.opponent_subs   = opponent_subs;

    const { data, error } = await supabase
      .from('matches')
      .insert([dbPayload])
      .select()
      .single();

    if (error) {
      // If columns don't exist yet (400 / PGRST204 / PGRST205), retry with safe payload stripped of missing columns
      const isColumnError = error.code === 'PGRST204' || error.code === 'PGRST205' ||
        error.message?.includes('referee_') || error.message?.includes('opponent_lineup') || 
        error.message?.includes('opponent_subs') || error.message?.includes('column') || 
        (error as any)?.status === 400;

      if (isColumnError) {
        const safePayload = { ...dbPayload };
        delete safePayload.match_type;
        delete safePayload.match_format;
        delete safePayload.opponent_lineup;
        delete safePayload.opponent_subs;
        delete safePayload.referee_central_id;
        delete safePayload.referee_assistant1_id;
        delete safePayload.referee_assistant2_id;
        delete safePayload.referee_fourth_id;
        delete safePayload.referees_assigned;

        const { data: retryData, error: retryError } = await supabase
          .from('matches')
          .insert([safePayload])
          .select()
          .single();
        if (retryError) throw retryError;
        if (lineup) await matchService.saveLineup(retryData.id, lineup.startingXI, lineup.substitutes);
        if (staff_ids?.length) await matchService.saveStaff(retryData.id, staff_ids);
        return retryData;
      }
      throw error;
    }

    if (lineup) {
      await matchService.saveLineup(data.id, lineup.startingXI, lineup.substitutes);
    }
    if (staff_ids?.length) {
      await matchService.saveStaff(data.id, staff_ids);
    }

    return data;
  },

  async updateMatch(id: string, updates: Updates<'matches'> & { lineup?: MatchLineup; staff_ids?: string[] }): Promise<Match> {
    const { lineup, staff_ids, match_type, match_format, ...payload } = updates as any;

    const sanitized = { ...payload } as any;
    if (lineup) {
      sanitized.lineup = {
        ...lineup,
        match_type: match_type || (lineup as any).match_type,
        match_format: match_format || (lineup as any).match_format,
      };
    }
    delete sanitized.match_type;
    delete sanitized.match_format;
    (['id', 'created_at', 'match_players', 'match_staff'] as const).forEach(f => delete sanitized[f]);
    (['opponent_id', 'league_id', 'stadium_id', 'team_id'] as const).forEach(f => {
      if (sanitized[f] === '') sanitized[f] = null;
    });

    const { data, error } = await supabase
      .from('matches')
      .update(sanitized)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const isColumnError = error.code === 'PGRST204' || error.code === 'PGRST205' ||
        error.message?.includes('referee_') || error.message?.includes('opponent_lineup') ||
        error.message?.includes('column') || (error as any)?.status === 400;

      if (isColumnError) {
        delete sanitized.match_type;
        delete sanitized.match_format;
        delete sanitized.referee_central_id;
        delete sanitized.referee_assistant1_id;
        delete sanitized.referee_assistant2_id;
        delete sanitized.referee_fourth_id;
        delete sanitized.referees_assigned;
        delete sanitized.opponent_lineup;
        delete sanitized.opponent_subs;

        const { data: retryData, error: retryError } = await supabase
          .from('matches')
          .update(sanitized)
          .eq('id', id)
          .select()
          .single();
        if (retryError) throw retryError;
        if (lineup) await matchService.saveLineup(id, lineup.startingXI, lineup.substitutes);
        if (staff_ids) await matchService.saveStaff(id, staff_ids);
        return retryData;
      }
      throw error;
    }

    if (lineup) {
      await matchService.saveLineup(id, lineup.startingXI, lineup.substitutes);
    }
    if (staff_ids) {
      await matchService.saveStaff(id, staff_ids);
    }

    return data;
  },

  async deleteMatch(id: string): Promise<void> {
    const d2 = await supabase.from('player_match_stats').delete().eq('match_id', id);
    if (d2.error && d2.error.code !== 'PGRST205') console.error('Error deleting player_match_stats:', d2.error);
    
    const d3 = await supabase.from('match_stats').delete().eq('match_id', id);
    if (d3.error && d3.error.code !== 'PGRST205') console.error('Error deleting match_stats:', d3.error);
    
    const d4 = await supabase.from('match_players').delete().eq('match_id', id);
    if (d4.error && d4.error.code !== 'PGRST205') console.error('Error deleting match_players:', d4.error);
    
    const d5 = await supabase.from('match_staff').delete().eq('match_id', id);
    if (d5.error && d5.error.code !== 'PGRST205') console.error('Error deleting match_staff:', d5.error);

    
    const d6 = await supabase.from('match_events').delete().eq('match_id', id);
    if (d6.error && d6.error.code !== 'PGRST205') console.error('Error deleting match_events:', d6.error);
    
    const { error } = await supabase.from('matches').delete().eq('id', id);
    if (error) {
      console.error('Error deleting match:', error);
      throw error;
    }
  },

  // -------------------------------------------------------
  // Composition
  // -------------------------------------------------------

  async saveLineup(matchId: string, startingXI: any[], substitutes: any[]): Promise<void> {
    const normalizePid = (p: any): string => {
      if (!p) return '';
      if (typeof p === 'object') return p.player_id || p.id || '';
      return String(p).trim();
    };

    // Build rows with position_index for starters to preserve their position in the array
    const rawRows = [
      ...startingXI.map((rawPid, index) => {
        const pid = normalizePid(rawPid);
        return {
          match_id: matchId,
          player_id: pid,
          is_starting: !!pid,
          position_index: pid ? index : null,
        };
      }).filter(r => r.player_id),
      ...substitutes.map(rawPid => {
        const pid = normalizePid(rawPid);
        return {
          match_id: matchId,
          player_id: pid,
          is_starting: false,
          position_index: null,
        };
      }).filter(r => r.player_id),
    ];

    // Deduplicate by player_id
    const uniqueRowsMap = new Map();
    rawRows.forEach(r => {
      if (!uniqueRowsMap.has(r.player_id)) {
        uniqueRowsMap.set(r.player_id, r);
      }
    });
    const rows = Array.from(uniqueRowsMap.values());

    await supabase.from('match_players').delete().eq('match_id', matchId);

    if (rows.length) {
      const { error } = await supabase.from('match_players').upsert(rows, { onConflict: 'match_id,player_id' });
      if (error) {
        const { error: insertError } = await supabase.from('match_players').insert(rows);
        if (insertError && insertError.code !== '23505') {
          console.warn('saveLineup insert error:', insertError);
        }
      }
    }
  },

  async getMatchLineup(matchId: string): Promise<{ player_id: string; is_starting: boolean; position_index: number | null; rating?: number | null; rating_comment?: string | null }[]> {
    const { data, error } = await supabase
      .from('match_players')
      .select('player_id, is_starting, position_index, rating, rating_comment')
      .eq('match_id', matchId);
    if (error) throw error;
    return data ?? [];
  },

  async savePlayerRating(matchId: string, playerId: string, rating: number | null, ratingComment: string | null = null): Promise<void> {
    const { data, error } = await supabase
      .from('match_players')
      .update({ rating, rating_comment: ratingComment })
      .eq('match_id', matchId)
      .eq('player_id', playerId)
      .select();
    if (error) throw error;

    if (!data || data.length === 0) {
      const { error: upsertErr } = await supabase
        .from('match_players')
        .upsert({
          match_id: matchId,
          player_id: playerId,
          rating,
          rating_comment: ratingComment,
          is_starting: false
        }, { onConflict: 'match_id,player_id' });
      if (upsertErr) throw upsertErr;
    }
  },

  // -------------------------------------------------------
  // Staff du match
  // -------------------------------------------------------

  async saveStaff(matchId: string, staffIds: string[]): Promise<void> {
    await supabase.from('match_staff').delete().eq('match_id', matchId);
    if (!staffIds.length) return;

    const { error } = await supabase
      .from('match_staff')
      .insert(staffIds.map(sid => ({ match_id: matchId, staff_id: sid })));
    if (error) throw error;
  },

  async getMatchStaff(matchId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('match_staff')
      .select('staff_id')
      .eq('match_id', matchId);
    if (error) throw error;
    return (data ?? []).map(s => s.staff_id);
  },

  // -------------------------------------------------------
  // Événements
  // -------------------------------------------------------

  async getMatchEvents(matchId: string): Promise<MatchEvent[]> {
    const { data, error } = await supabase
      .from('match_events')
      .select('*')
      .eq('match_id', matchId)
      .order('minute', { ascending: true });

    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205') return [];
      throw error;
    }

    return (data ?? []).map(e => ({
      ...e,
      playerId: e.player_id,
      relatedPlayerId: e.related_player_id,
    }));
  },

  async addEvent(event: Omit<Inserts<'match_events'>, 'id'>): Promise<void> {
    const { error } = await supabase.from('match_events').insert([event]);
    if (error) throw error;
  },

  async updateEvent(id: string, updates: Updates<'match_events'>): Promise<void> {
    const { error } = await supabase.from('match_events').update(updates).eq('id', id);
    if (error) throw error;
  },

  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await supabase.from('match_events').delete().eq('id', eventId);
    if (error) throw error;
  },

  // -------------------------------------------------------
  // Stats d'équipe (1:1 avec match)
  // -------------------------------------------------------

  async getMatchStats(matchId: string): Promise<MatchStats | null> {
    const { data, error } = await supabase
      .from('match_stats')
      .select('*')
      .eq('match_id', matchId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsertMatchStats(stats: Inserts<'match_stats'>): Promise<MatchStats> {
    const { data, error } = await supabase
      .from('match_stats')
      .upsert(stats, { onConflict: 'match_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // -------------------------------------------------------
  // Stats individuelles
  // -------------------------------------------------------

  async getPlayerMatchStats(matchId: string): Promise<PlayerMatchStat[]> {
    const { data, error } = await supabase
      .from('player_match_stats')
      .select('*')
      .eq('match_id', matchId);
    if (error) throw error;
    return data ?? [];
  },

  async upsertPlayerMatchStat(stat: Inserts<'player_match_stats'>): Promise<PlayerMatchStat> {
    const { data, error } = await supabase
      .from('player_match_stats')
      .upsert(stat, { onConflict: 'match_id,player_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
