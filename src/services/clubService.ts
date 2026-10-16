import { supabase } from '../lib/supabase';
import type { Club, Settings } from '../types';
import type { Inserts, Updates } from '../types/supabase';
import { getMyClubId } from './_helpers';

// -------------------------------------------------------
// Club principal + Settings
// -------------------------------------------------------

export const clubService = {
  /** Retourne le club principal + sa config settings */
  async getMyClub(): Promise<(Club & { settings: Settings | null }) | null> {
    const clubId = await getMyClubId();

    const [{ data: club, error: clubErr }, { data: settings }] = await Promise.all([
      supabase.from('clubs').select('*').eq('id', clubId).single(),
      supabase.from('settings').select('*').eq('club_id', clubId).maybeSingle(),
    ]);

    if (clubErr) throw clubErr;

    let finalSettings = settings;
    if (!finalSettings) {
      const { data: fallbackSettings } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      finalSettings = fallbackSettings;
    }

    return club ? { ...club, settings: finalSettings ?? null } : null;
  },

  /** Met à jour la config globale (clubs et settings liés) */
  async updateMyClub(id: string, updates: any): Promise<any> {
    const clubId = await getMyClubId();

    const clubUpdates: any = {};
    if (updates.club_name) clubUpdates.name = updates.club_name;
    if (updates.city !== undefined) clubUpdates.city = updates.city;
    if (updates.country !== undefined) clubUpdates.country = updates.country;
    if (updates.logo_url !== undefined) clubUpdates.logo_url = updates.logo_url;

    if (Object.keys(clubUpdates).length > 0) {
      await supabase.from('clubs').update(clubUpdates).eq('id', clubId);
    }

    // Filtre les champs valides pour la table settings
    const settingsUpdates: any = {};
    const validSettingsFields = [
      'club_name', 'city', 'country', 'logo_url', 
      'contact_email', 'contact_phone', 'timezone',
      'primary_color', 'secondary_color', 'pagination_limit', 'preferred_view_mode',
      'plugins'
    ];
    
    for (const key of validSettingsFields) {
      if (updates[key] !== undefined) {
        settingsUpdates[key] = updates[key];
      }
    }

    if (Object.keys(settingsUpdates).length > 0) {
      // 1. Rechercher l'enregistrement settings existant (par club_id ou premier enregistrement)
      const { data: existingSettings } = await supabase
        .from('settings')
        .select('id')
        .eq('club_id', clubId)
        .maybeSingle();

      let targetId = existingSettings?.id;

      if (!targetId) {
        const { data: firstSettings } = await supabase
          .from('settings')
          .select('id')
          .limit(1)
          .maybeSingle();
        targetId = firstSettings?.id;
      }

      let data: any = null;
      let error: any = null;

      if (targetId) {
        // Mise à jour ciblée par ID primaire : 100% fiable, évite l'erreur HTTP 400 on_conflict
        const res = await supabase
          .from('settings')
          .update({ ...settingsUpdates, club_id: clubId, updated_at: new Date().toISOString() })
          .eq('id', targetId)
          .select()
          .maybeSingle();
        data = res.data;
        error = res.error;
      } else {
        // Insertion simple si aucun enregistrement préalable
        const res = await supabase
          .from('settings')
          .insert([{ ...settingsUpdates, club_id: clubId }])
          .select()
          .maybeSingle();
        data = res.data;
        error = res.error;
      }

      // Si erreur liée à la colonne plugins sur base distante non migrée, réessayer sans plugins
      if (error && error.message && error.message.toLowerCase().includes('plugins')) {
        const safeUpdates = { ...settingsUpdates };
        delete safeUpdates.plugins;
        if (targetId) {
          const retryRes = await supabase
            .from('settings')
            .update({ ...safeUpdates, club_id: clubId })
            .eq('id', targetId)
            .select()
            .maybeSingle();
          data = retryRes.data;
          error = retryRes.error;
        }
      }

      if (error) {
        console.warn('[clubService] Erreur mise à jour settings:', error);
        throw error;
      }
      return data;
    }
    
    return null;
  },

  /** Met à jour le nom / logo / ville du club lui-même */
  async updateClubInfo(clubId: string, updates: Updates<'clubs'>): Promise<Club> {
    const { data, error } = await supabase
      .from('clubs')
      .update(updates)
      .eq('id', clubId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Met à jour la configuration (email, téléphone, timezone…) dans settings */
  async updateSettings(clubId: string, updates: Updates<'settings'>): Promise<Settings> {
    const { data, error } = await supabase
      .from('settings')
      .update(updates)
      .eq('club_id', clubId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // -------------------------------------------------------
  // Clubs adversaires
  // Un adversaire = tout club dont l'id != default_club_id
  // -------------------------------------------------------

  async getOpponentClubs(): Promise<Club[]> {
    const clubId = await getMyClubId();

    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .neq('id', clubId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205') return [];
      throw error;
    }
    return data ?? [];
  },

  async addOpponentClub(club: Omit<Inserts<'clubs'>, 'id'>): Promise<Club> {
    const { data, error } = await supabase
      .from('clubs')
      .insert([club])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateOpponentClub(id: string, updates: Updates<'clubs'>): Promise<Club> {
    const { data, error } = await supabase
      .from('clubs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteOpponentClub(id: string): Promise<void> {
    const { error } = await supabase.from('clubs').delete().eq('id', id);
    if (error) throw error;
  },

  // -------------------------------------------------------
  // Reset complet (respect de l'ordre CASCADE)
  // -------------------------------------------------------

  async resetDatabase(): Promise<void> {
    const clubId = await getMyClubId();

    // 1. matches en premier → CASCADE supprime match_players, match_staff,
    //    match_events, match_stats, player_match_stats
    await supabase.from('matches').delete().eq('club_id', clubId);

    // 2. Entités principales
    await supabase.from('players').delete().eq('club_id', clubId);
    await supabase.from('staff').delete().eq('club_id', clubId);
    await supabase.from('teams').delete().eq('club_id', clubId);

    // 3. Référentiel
    await supabase.from('leagues').delete().eq('club_id', clubId);
    await supabase.from('stadiums').delete().eq('club_id', clubId);

    // 4. Blog & backups
    await supabase.from('blog_posts').delete().eq('club_id', clubId);
    await supabase.from('blog_categories').delete().eq('club_id', clubId);
    await supabase.from('backups').delete().eq('club_id', clubId);
  },
};
