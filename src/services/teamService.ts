import { supabase } from '../lib/supabase';
import type { Team } from '../types';
import type { Inserts } from '../types/supabase';
import { getMyClubId } from './_helpers';

export type { Team };

export const teamService = {
  async getTeams(): Promise<Team[]> {
    const clubId = await getMyClubId();

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('club_id', clubId)
      .order('name', { ascending: true });

    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205') return [];
      throw error;
    }
    return data || [];
  },

  async addTeam(team: Omit<Inserts<'teams'>, 'id'>): Promise<Team> {
    const clubId = await getMyClubId();

    const { data, error } = await supabase
      .from('teams')
      .insert([{ ...team, club_id: clubId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTeam(id: string, team: Partial<Team>): Promise<Team> {
    const sanitized = { ...team } as any;
    (['id', 'created_at', 'updated_at', 'club_id'] as const).forEach(field => delete sanitized[field]);
    if (sanitized.coach_id === '') sanitized.coach_id = null;
    if (sanitized.photo_url === '') sanitized.photo_url = null;

    console.log('[updateTeam] payload envoyé:', sanitized, 'pour id:', id);

    const { data, error } = await supabase
      .from('teams')
      .update(sanitized)
      .eq('id', id)
      .select()
      .single();

    console.log('[updateTeam] résultat:', { data, error });

    if (error) throw error;
    return data;
  },

  async deleteTeam(id: string): Promise<void> {
    const clubId = await getMyClubId();
    const { error } = await supabase.from('teams').delete().eq('id', id).eq('club_id', clubId);
    if (error) throw error;
  },
};
