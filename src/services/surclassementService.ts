import { supabase } from '../lib/supabase';
import { getMyClubId } from './_helpers';
import type { PlayerSurclassement } from '../types';
import {
  getCategoryRank,
  isHigherCategory,
  isLowerCategory,
  getMobilityType,
  CATEGORY_ORDER,
  type MobilityType,
} from '../utils/categoryRank';

export {
  getCategoryRank,
  isHigherCategory,
  isLowerCategory,
  getMobilityType,
  CATEGORY_ORDER,
  type MobilityType,
};

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
      .order('promoted_at', { ascending: false })
      .limit(1)
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

    const readMatchHistory = async (matchId: string) => {
      const { data, error } = await supabase
        .from('player_surclassements')
        .select('id, notes')
        .eq('player_id', player.id)
        .eq('status', 'active');
      if (error) throw error;
      return (data ?? []).filter(row => {
        try {
          const parsed = typeof row.notes === 'string' ? JSON.parse(row.notes) : row.notes;
          return String(parsed?.match_id ?? '') === String(matchId);
        } catch {
          return false;
        }
      });
    };

    for (const m of matches) {
      const isSelected = selectedMatchIds.has(m.id);
      const wasAssigned = !!m.lineup?.surclasses?.[player.id];

      if (isSelected && !wasAssigned) {
        const { data: currentMatchData, error: matchReadError } = await supabase
          .from('matches').select('lineup, team_id, status').eq('id', m.id).single();
        if (matchReadError) throw matchReadError;

        let targetTeamId = m.team_id || currentMatchData?.team_id;
        if (!targetTeamId) {
          const { data, error } = await supabase.from('teams').select('id').ilike('category', (m.category || '').trim()).limit(1).maybeSingle();
          if (error) throw error;
          targetTeamId = data?.id;
        }
        let origTeamId = originalTeamId;
        if (!origTeamId) {
          const { data, error } = await supabase.from('teams').select('id').ilike('category', playerCategory.trim()).limit(1).maybeSingle();
          if (error) throw error;
          origTeamId = data?.id;
        }
        if (!targetTeamId && origTeamId) targetTeamId = origTeamId;
        if (!origTeamId && targetTeamId) origTeamId = targetTeamId;
        if (!origTeamId || !targetTeamId) throw new Error('Impossible d’identifier les équipes pour historiser ce surclassement.');

        const currentLineup = currentMatchData?.lineup || {};
        const updatedSurclasses = {
          ...(currentLineup.surclasses || {}),
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

        // Pour un match en direct ou terminé, créer le lien joueur-match manquant
        // afin que la convocation et les statistiques historiques le prennent en compte.
        const status = String(currentMatchData?.status || m.status || '').toLowerCase();
        const needsStatRosterLink = ['live', 'finished', 'completed'].includes(status);
        let createdMatchPlayerLink = false;
        if (needsStatRosterLink) {
          const { data: existingLink, error: linkReadError } = await supabase
            .from('match_players').select('player_id').eq('match_id', m.id).eq('player_id', player.id).maybeSingle();
          if (linkReadError) throw linkReadError;
          if (!existingLink) {
            const { error: linkInsertError } = await supabase.from('match_players').insert({
              match_id: m.id, player_id: player.id, is_starting: false, position_index: null,
            });
            if (linkInsertError) throw linkInsertError;
            createdMatchPlayerLink = true;
          }
        }

        const { data: historyRows, error: historyError } = await supabase.from('player_surclassements').insert([{
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
            roster_link_created: createdMatchPlayerLink,
          }),
          original_jersey_number: player.jersey_number,
          target_jersey_number: targetJerseyNumber ?? player.jersey_number,
        }]).select('id');
        if (historyError) {
          if (createdMatchPlayerLink) await supabase.from('match_players').delete().eq('match_id', m.id).eq('player_id', player.id);
          throw historyError;
        }

        const { error: matchUpdateError } = await supabase.from('matches').update({
          lineup: { ...currentLineup, surclasses: updatedSurclasses },
        }).eq('id', m.id);
        if (matchUpdateError) {
          const historyId = historyRows?.[0]?.id;
          if (historyId) await supabase.from('player_surclassements').update({ status: 'reverted', reverted_at: new Date().toISOString() }).eq('id', historyId);
          if (createdMatchPlayerLink) await supabase.from('match_players').delete().eq('match_id', m.id).eq('player_id', player.id);
          throw matchUpdateError;
        }
      } else if (!isSelected && wasAssigned) {
        const { data: currentMatchData, error: matchReadError } = await supabase
          .from('matches').select('lineup, status').eq('id', m.id).single();
        if (matchReadError) throw matchReadError;
        const currentLineup = currentMatchData?.lineup || {};
        const currentSurclasses = { ...(currentLineup.surclasses || {}) };
        delete currentSurclasses[player.id];

        const historyRows = await readMatchHistory(m.id);
        const historyIds = historyRows.map(row => row.id);
        const now = new Date().toISOString();
        if (historyIds.length > 0) {
          const { error } = await supabase.from('player_surclassements')
            .update({ status: 'reverted', reverted_at: now }).in('id', historyIds);
          if (error) throw error;
        }

        const { error: matchUpdateError } = await supabase.from('matches').update({
          lineup: { ...currentLineup, surclasses: currentSurclasses },
        }).eq('id', m.id);
        if (matchUpdateError) {
          if (historyIds.length > 0) await supabase.from('player_surclassements')
            .update({ status: 'active', reverted_at: null }).in('id', historyIds);
          throw matchUpdateError;
        }

        const createdRosterLink = historyRows.some(row => {
          try {
            const parsed = typeof row.notes === 'string' ? JSON.parse(row.notes) : row.notes;
            return parsed?.roster_link_created === true;
          } catch { return false; }
        });
        if (createdRosterLink) {
          const { data: events, error: eventsError } = await supabase.from('match_events').select('id')
            .eq('match_id', m.id).or(`player_id.eq.${player.id},related_player_id.eq.${player.id}`).limit(1);
          const { data: stats, error: statsError } = await supabase.from('player_match_stats').select('player_id')
            .eq('match_id', m.id).eq('player_id', player.id).limit(1);
          if (!eventsError && !statsError && !events?.length && !stats?.length) {
            await supabase.from('match_players').delete().eq('match_id', m.id).eq('player_id', player.id);
          }
        }
      }
    }
  },
};
