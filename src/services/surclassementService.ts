import { supabase } from '../lib/supabase';
import { getMyClubId } from './_helpers';
import type { PlayerSurclassement } from '../types';

/**
 * Rang numérique des catégories d'âge (U7 -> 7, U14 -> 14, U17 -> 17, U18 -> 18, SENIOR -> 30, PRO -> 40)
 * Extraction universelle dynamique par regex insensible à la casse.
 */
export function getCategoryRank(cat?: string | null): number {
  if (!cat) return 0;
  const upper = cat.trim().toUpperCase();
  const numMatch = upper.match(/U[-_]?(\d+)/i);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }
  if (upper.includes('SENIOR')) return 30;
  if (upper.includes('PRO')) return 40;
  return 0;
}

export function isHigherCategory(current: string, target: string): boolean {
  const currentRank = getCategoryRank(current);
  const targetRank = getCategoryRank(target);
  return currentRank > 0 && targetRank > 0 && targetRank > currentRank;
}

export function isLowerCategory(current: string, target: string): boolean {
  const currentRank = getCategoryRank(current);
  const targetRank = getCategoryRank(target);
  return currentRank > 0 && targetRank > 0 && targetRank < currentRank;
}

export type MobilityType = 'surclassement' | 'sous_classement';

export function getMobilityType(current: string, target: string): MobilityType {
  const origRank = getCategoryRank(current);
  const targetRank = getCategoryRank(target);
  return targetRank < origRank ? 'sous_classement' : 'surclassement';
}

/**
 * Ordre croissant dynamique des catégories — Proxy rétro-compatible pour tout accès CATEGORY_ORDER[cat]
 */
export const CATEGORY_ORDER: Record<string, number> = new Proxy(
  {
    U7: 7, U8: 8, U9: 9, U10: 10, U11: 11, U12: 12, U13: 13,
    U14: 14, U15: 15, U16: 16, U17: 17, U18: 18, U19: 19,
    U20: 20, U21: 21, U22: 22, U23: 23, SENIOR: 30, PRO: 40,
  },
  {
    get(target, prop: string) {
      if (typeof prop === 'string') {
        const rank = getCategoryRank(prop);
        if (rank > 0) return rank;
      }
      return (target as any)[prop] ?? 0;
    },
  }
);

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

  /**
   * Planifier le surclassement d'un joueur sur un ensemble de matchs cibles à venir.
   * Aligné strictement sur le fonctionnement de fus-app :
   * 1. Met à jour matches.lineup.surclasses
   * 2. Insère ou met à jour public.player_surclassements
   */
  async saveMatchSurclassements({
    player,
    playerCategory,
    originalTeamId,
    matches,
    selectedMatchIds,
    targetJerseyNumber,
    notes,
  }: {
    player: { id: string; full_name: string; jersey_number: number | null; position: string | null; photo_url: string | null; club_id?: string | null };
    playerCategory: string;
    originalTeamId: string;
    matches: any[];
    selectedMatchIds: Set<string>;
    targetJerseyNumber?: number | null;
    notes?: string | null;
  }): Promise<void> {
    const clubId = player.club_id || await getMyClubId();

    for (const m of matches) {
      const isSelected = selectedMatchIds.has(m.id);
      const wasAssigned = !!m.lineup?.surclasses?.[player.id];

      if (isSelected && !wasAssigned) {
        // 1. Ajouter au match
        const { data: currentMatchData } = await supabase
          .from('matches')
          .select('lineup, team_id')
          .eq('id', m.id)
          .single();

        const currentLineup = currentMatchData?.lineup || {};
        const currentSurclasses = currentLineup.surclasses || {};

        const updatedSurclasses = {
          ...currentSurclasses,
          [player.id]: {
            player_id: player.id,
            full_name: player.full_name,
            jersey_number: targetJerseyNumber ?? player.jersey_number,
            position: player.position,
            photo_url: player.photo_url,
            original_category: playerCategory,
            target_category: m.category,
            mobility_type: 'surclassement',
            match_id: m.id,
            assigned_at: new Date().toISOString(),
          },
        };

        await supabase
          .from('matches')
          .update({
            lineup: {
              ...currentLineup,
              surclasses: updatedSurclasses,
            },
          })
          .eq('id', m.id);

        // 2. Insérer dans player_surclassements
        let targetTeamId = m.team_id;
        if (!targetTeamId) {
          const targetCatClean = (m.category || '').trim();
          const { data: targetTeam } = await supabase
            .from('teams')
            .select('id')
            .ilike('category', targetCatClean)
            .limit(1)
            .maybeSingle();
          targetTeamId = targetTeam?.id;
        }

        let origTeamId = originalTeamId;
        if (!origTeamId) {
          const origCatClean = (playerCategory || '').trim();
          const { data: origTeam } = await supabase
            .from('teams')
            .select('id')
            .ilike('category', origCatClean)
            .limit(1)
            .maybeSingle();
          origTeamId = origTeam?.id;
        }

        if (!targetTeamId && origTeamId) targetTeamId = origTeamId;
        if (!origTeamId && targetTeamId) origTeamId = targetTeamId;

        if (origTeamId && targetTeamId) {
          await supabase.from('player_surclassements').insert([{
            club_id: clubId,
            player_id: player.id,
            original_team_id: origTeamId,
            target_team_id: targetTeamId,
            original_category: playerCategory,
            target_category: m.category,
            status: 'active',
            notes: JSON.stringify({
              match_id: m.id,
              opponent: m.opponent?.name || 'Adversaire',
              match_date: m.match_date,
              match_time: m.match_time,
              mobility_type: 'surclassement',
              reason: notes || null,
            }),
            original_jersey_number: player.jersey_number,
            target_jersey_number: targetJerseyNumber ?? player.jersey_number,
          }]);
        }
      } else if (!isSelected && wasAssigned) {
        // Retirer du match
        const { data: currentMatchData } = await supabase
          .from('matches')
          .select('lineup')
          .eq('id', m.id)
          .single();

        const currentLineup = currentMatchData?.lineup || {};
        const currentSurclasses = { ...(currentLineup.surclasses || {}) };
        delete currentSurclasses[player.id];

        await supabase
          .from('matches')
          .update({
            lineup: {
              ...currentLineup,
              surclasses: currentSurclasses,
            },
          })
          .eq('id', m.id);

        // Clore le surclassement lié à ce match
        await supabase
          .from('player_surclassements')
          .update({ status: 'reverted', reverted_at: new Date().toISOString() })
          .eq('player_id', player.id)
          .ilike('notes', `%${m.id}%`);
      }
    }
  },
};
