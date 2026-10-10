import { supabase } from '../lib/supabase';
import type { Stadium, League } from '../types';
import type { Inserts } from '../types/supabase';
import { getMyClubId } from './_helpers';

export const competitionService = {
  // Stadiums
  async getStadiums(): Promise<Stadium[]> {
    const clubId = await getMyClubId();

    const { data, error } = await supabase
      .from('stadiums')
      .select('*')
      .eq('club_id', clubId)
      .order('name', { ascending: true });

    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205') return [];
      throw error;
    }
    return data || [];
  },

  async addStadium(stadium: Omit<Inserts<'stadiums'>, 'id'>): Promise<Stadium> {
    const clubId = await getMyClubId();

    const { data, error } = await supabase
      .from('stadiums')
      .insert([{ ...stadium, club_id: clubId }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStadium(id: string, stadium: Partial<Stadium>): Promise<Stadium> {
    const { data, error } = await supabase
      .from('stadiums')
      .update(stadium)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteStadium(id: string): Promise<void> {
    const { error } = await supabase.from('stadiums').delete().eq('id', id);
    if (error) throw error;
  },

  // Leagues
  async getLeagues(): Promise<League[]> {
    const clubId = await getMyClubId();

    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('club_id', clubId)
      .order('name', { ascending: true });

    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205') return [];
      throw error;
    }
    return data || [];
  },

  async addLeague(league: Omit<Inserts<'leagues'>, 'id'>): Promise<League> {
    const clubId = await getMyClubId();

    const { data, error } = await supabase
      .from('leagues')
      .insert([{ ...league, club_id: clubId }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateLeague(id: string, league: Partial<League>): Promise<League> {
    const { data, error } = await supabase
      .from('leagues')
      .update(league)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteLeague(id: string): Promise<void> {
    const { error } = await supabase.from('leagues').delete().eq('id', id);
    if (error) throw error;
  },
};
