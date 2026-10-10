import { supabase } from '../lib/supabase';
import type { Staff } from '../types';
import type { Inserts } from '../types/supabase';
import { getMyClubId } from './_helpers';

export const staffService = {
  async getStaff(): Promise<(Staff & { team_ids: string[] })[]> {
    const clubId = await getMyClubId();

    const { data, error } = await supabase
      .from('staff')
      .select('*, staff_team_assignments(team_id)')
      .eq('club_id', clubId)
      .order('full_name', { ascending: true });

    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205') return [];
      throw error;
    }

    return (data || []).map(s => ({
      ...s,
      team_ids: s.staff_team_assignments?.map((a: any) => a.team_id) || []
    }));
  },

  async addMember(member: Omit<Inserts<'staff'>, 'id'> & { team_ids?: string[] }): Promise<Staff> {
    const clubId = await getMyClubId();
    const { team_ids, ...baseData } = member;

    const { data, error } = await supabase
      .from('staff')
      .insert([{ ...baseData, club_id: clubId }])
      .select()
      .single();

    if (error) throw error;

    if (team_ids && team_ids.length > 0) {
      await staffService.saveTeamAssignments(data.id, team_ids);
    }

    return data;
  },

  async updateMember(id: string, updates: Partial<Staff> & { team_ids?: string[] }): Promise<Staff> {
    const { team_ids, ...baseData } = updates;

    // Whitelist explicit des champs autorisés - évite d'envoyer des colonnes inexistantes
    const allowedFields = [
      'club_id', 'full_name', 'role', 'specialty', 'category',
      'phone', 'email', 'photo_url', 'is_active'
    ];

    const sanitized: any = {};
    allowedFields.forEach(field => {
      if (field in baseData && baseData[field as keyof typeof baseData] !== undefined) {
        sanitized[field] = baseData[field as keyof typeof baseData];
      }
    });

    // 1. Update
    const { error: updateError } = await supabase
      .from('staff')
      .update(sanitized)
      .eq('id', id);

    if (updateError) throw updateError;

    // 2. Re-fetch updated record
    const { data, error: fetchError } = await supabase
      .from('staff')
      .select('*, staff_team_assignments(team_id)')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (team_ids !== undefined) {
      await staffService.saveTeamAssignments(id, team_ids);
    }

    return data;
  },

  async saveTeamAssignments(staffId: string, teamIds: string[]): Promise<void> {
    // 1. Delete existing
    await supabase.from('staff_team_assignments').delete().eq('staff_id', staffId);

    // 2. Insert new
    if (teamIds.length > 0) {
      const { error } = await supabase
        .from('staff_team_assignments')
        .insert(teamIds.map(tid => ({ staff_id: staffId, team_id: tid })));
      if (error) throw error;
    }
  },

  async deleteMember(id: string): Promise<void> {
    await supabase.from('teams').update({ coach_id: null }).eq('coach_id', id);
    await supabase.from('match_staff').delete().eq('staff_id', id);

    const { error } = await supabase.from('staff').delete().eq('id', id);

    if (error) {
      if (error.code === '23503') {
        throw new Error('Impossible de supprimer ce membre car il est utilisé ailleurs dans le système.');
      }
      throw error;
    }
  },
};
