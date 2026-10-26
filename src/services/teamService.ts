import { supabase } from '../lib/supabase';
import type { Team } from '../types';
import type { Inserts } from '../types/supabase';
import { getMyClubId } from './_helpers';

export type { Team };

// Catégories autorisées par l'enum public.age_category dans PostgreSQL
export const VALID_DB_TEAM_CATEGORIES = [
  'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'U21', 'U22', 'U23', 'SENIOR', 'PRO', 'OTHER'
] as const;

const VALID_CATEGORIES_SET = new Set<string>(VALID_DB_TEAM_CATEGORIES);

export function normalizeTeamCategory(cat?: string | null): string {
  if (!cat) return 'U13';
  const clean = cat.trim().toUpperCase();
  if (VALID_CATEGORIES_SET.has(clean)) return clean;
  return clean;
}

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
    const sanitized = { ...team } as any;
    (['id', 'created_at', 'updated_at', 'club_id'] as const).forEach(field => delete sanitized[field]);
    if (!sanitized.coach_id || sanitized.coach_id === '' || sanitized.coach_id === 'null' || sanitized.coach_id === 'undefined') {
      sanitized.coach_id = null;
    }
    if (!sanitized.photo_url || sanitized.photo_url === '' || sanitized.photo_url === 'null' || sanitized.photo_url === 'undefined') {
      sanitized.photo_url = null;
    }
    if (sanitized.category) {
      sanitized.category = normalizeTeamCategory(sanitized.category);
    }

    console.log('[addTeam] Payload final envoyé:', { ...sanitized, club_id: clubId });

    const { data, error } = await supabase
      .from('teams')
      .insert([{ ...sanitized, club_id: clubId }])
      .select()
      .single();

    if (error) {
      const errMsg = error.message || error.details || JSON.stringify(error);
      console.error('[addTeam] Erreur Supabase:', errMsg, error);
      throw new Error(errMsg);
    }
    return data;
  },

  async updateTeam(id: string, team: Partial<Team>): Promise<Team> {
    const sanitized = { ...team } as any;
    (['id', 'created_at', 'updated_at', 'club_id'] as const).forEach(field => delete sanitized[field]);
    if (!sanitized.coach_id || sanitized.coach_id === '' || sanitized.coach_id === 'null' || sanitized.coach_id === 'undefined') {
      sanitized.coach_id = null;
    }
    if (!sanitized.photo_url || sanitized.photo_url === '' || sanitized.photo_url === 'null' || sanitized.photo_url === 'undefined') {
      sanitized.photo_url = null;
    }
    if (sanitized.category) {
      sanitized.category = normalizeTeamCategory(sanitized.category);
    }

    console.log('[updateTeam] payload envoyé:', sanitized, 'pour id:', id);

    const { data, error } = await supabase
      .from('teams')
      .update(sanitized)
      .eq('id', id)
      .select()
      .single();

    console.log('[updateTeam] résultat:', { data, error });

    if (error) {
      console.error('[updateTeam] Erreur Supabase:', error);
      throw error;
    }
    return data;
  },

  async deleteTeam(id: string): Promise<void> {
    const clubId = await getMyClubId();
    const { error } = await supabase.from('teams').delete().eq('id', id).eq('club_id', clubId);
    if (error) throw error;
  },
};
