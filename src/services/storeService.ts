import { supabase } from '../lib/supabase';
import { getMyClubId } from './_helpers';
import type { Banner } from '../types';

/**
 * Récupère le client Supabase authentifié standard pour les opérations de bannières
 */
const getClient = () => supabase;

export const storeService = {
  async getBanners(): Promise<Banner[]> {
    const clubId = await getMyClubId();
    const client = getClient();
    const { data, error } = await client
      .from('banners')
      .select('*')
      .eq('club_id', clubId)
      .order('display_order', { ascending: true });

    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205') return [];
      throw error;
    }
    return data || [];
  },

  async addBanner(banner: Omit<Banner, 'id' | 'created_at' | 'updated_at'>): Promise<Banner> {
    const clubId = await getMyClubId();
    const client = getClient();
    const payload = { ...banner, club_id: (banner as any).club_id || clubId };
    
    let { data, error } = await client
      .from('banners')
      .insert([payload])
      .select()
      .single();

    // Fallback avec client par défaut si client alternatif échoue
    if (error && client !== supabase) {
      const fallback = await supabase
        .from('banners')
        .insert([payload])
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;
    return data;
  },

  async updateBanner(id: string, updates: Partial<Banner>): Promise<Banner> {
    const client = getClient();
    // Nettoyer les champs non modifiables
    const { id: _id, created_at: _ca, updated_at: _ua, ...fieldsToUpdate } = updates as any;

    let { data, error } = await client
      .from('banners')
      .update(fieldsToUpdate)
      .eq('id', id)
      .select()
      .maybeSingle();

    // Fallback supplémentaire si nécessaire
    if ((!data || error) && client !== supabase) {
      const fallbackRes = await supabase
        .from('banners')
        .update(fieldsToUpdate)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (fallbackRes.data) {
        data = fallbackRes.data;
        error = fallbackRes.error;
      }
    }

    if (error) throw error;
    if (!data) throw new Error('Bannière introuvable ou accès refusé (RLS)');
    return data;
  },

  async deleteBanner(id: string): Promise<void> {
    const client = getClient();
    let { error } = await client
      .from('banners')
      .delete()
      .eq('id', id);

    if (error && client !== supabase) {
      const fallback = await supabase
        .from('banners')
        .delete()
        .eq('id', id);
      error = fallback.error;
    }

    if (error) throw error;
  },
};

