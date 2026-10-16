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
    return (data || []).map((s: any) => ({
      ...s,
      image_url: s.photo_url || s.image_url || null,
    }));
  },

  async addStadium(stadium: Omit<Inserts<'stadiums'>, 'id'> & { image_url?: string | null }): Promise<Stadium> {
    const clubId = await getMyClubId();
    const payload = { ...stadium } as any;
    if (payload.image_url !== undefined && !payload.photo_url) {
      payload.photo_url = payload.image_url;
    }
    delete payload.image_url;

    const { data, error } = await supabase
      .from('stadiums')
      .insert([{ ...payload, club_id: clubId }])
      .select()
      .single();
    if (error) throw error;
    return data ? { ...data, image_url: (data as any).photo_url } as Stadium : data;
  },

  async updateStadium(id: string, stadium: Partial<Stadium> & { image_url?: string | null }): Promise<Stadium> {
    const payload = { ...stadium } as any;
    if (payload.image_url !== undefined && !payload.photo_url) {
      payload.photo_url = payload.image_url;
    }
    delete payload.image_url;

    const { data, error } = await supabase
      .from('stadiums')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data ? { ...data, image_url: (data as any).photo_url } as Stadium : data;
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
      .maybeSingle();
    if (error) throw error;
    return (data || { id: crypto.randomUUID?.() || String(Date.now()), ...league, club_id: clubId }) as League;
  },

  async updateLeague(id: string, league: Partial<League>): Promise<League> {
    const { data, error } = await supabase
      .from('leagues')
      .update(league)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return (data || { id, ...league }) as League;
  },

  async deleteLeague(id: string): Promise<void> {
    const { error } = await supabase.from('leagues').delete().eq('id', id);
    if (error) throw error;
  },
};
