import { supabase } from '../lib/supabase';
import { getMyClubId } from './_helpers';
import type { PlayerSurclassement } from '../types';

// Ordre croissant des catégories — sert à valider que la cible est bien supérieure
export const CATEGORY_ORDER: Record<string, number> = {
  U7: 1, U9: 2, U11: 3, U13: 4, U15: 5, U16: 6,
  U17: 7, U19: 8, U21: 9, U23: 10, SENIOR: 11, PRO: 12,
};

export function isHigherCategory(current: string, target: string): boolean {
  return (CATEGORY_ORDER[target] ?? 0) > (CATEGORY_ORDER[current] ?? 0);
}

export type SurclassementWithDetails = PlayerSurclassement & {
  player: { full_name: string; photo_url: string | null; jersey_number: number | null };
  original_team: { name: string; category: string };
  target_team: { name: string; category: string };
};

export type CreateSurclassementPayload = {
  player_id: string;
  original_team_id: string;
  target_team_id: string;
  original_category: string;
  target_category: string;
  notes?: string | null;
  original_jersey_number?: number | null;
  target_jersey_number?: number | null;
};

export const surclassementService = {
  /** Tous les surclassements du club (avec jointures joueur + équipes) */
  async getAll(): Promise<SurclassementWithDetails[]> {
    const clubId = await getMyClubId();
    const { data, error } = await supabase
      .from('player_surclassements')
      .select(`
        *,
        player:players!player_id(full_name, photo_url, jersey_number),
        original_team:teams!original_team_id(name, category),
        target_team:teams!target_team_id(name, category)
      `)
      .eq('club_id', clubId)
      .order('promoted_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as SurclassementWithDetails[];
  },

  /** Historique complet d'un joueur */
  async getForPlayer(playerId: string): Promise<SurclassementWithDetails[]> {
    const { data, error } = await supabase
      .from('player_surclassements')
      .select(`
        *,
        player:players!player_id(full_name, photo_url, jersey_number),
        original_team:teams!original_team_id(name, category),
        target_team:teams!target_team_id(name, category)
      `)
      .eq('player_id', playerId)
      .order('promoted_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as SurclassementWithDetails[];
  },

  /** Surclassement actif d'un joueur (null si aucun) */
  async getActiveForPlayer(playerId: string): Promise<PlayerSurclassement | null> {
    const { data, error } = await supabase
      .from('player_surclassements')
      .select('*')
      .eq('player_id', playerId)
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    return data as PlayerSurclassement | null;
  },

  /** Créer un surclassement — ne modifie PAS la table players.
   *  Le joueur reste dans son équipe d'origine ET devient disponible
   *  pour l'équipe cible via la relation player_surclassements. */
  async create(payload: CreateSurclassementPayload): Promise<PlayerSurclassement> {
    const clubId = await getMyClubId();
    const { data, error } = await supabase
      .from('player_surclassements')
      .insert([{ ...payload, club_id: clubId }])
      .select()
      .single();
    if (error) throw error;
    return data as PlayerSurclassement;
  },

  /** Clore le surclassement — le joueur redevient indisponible pour l'équipe cible.
   *  Aucune modification dans la table players nécessaire. */
  async revert(id: string): Promise<void> {
    const { error } = await supabase
      .from('player_surclassements')
      .update({ status: 'reverted', reverted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};
