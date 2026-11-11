import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  playerMentionService,
  type UpsertPlayerMentionInput,
} from '../services/playerMentionService';
import {
  getLatestMention,
  type PlayerMentionEntry,
} from '../utils/playerMentionsHelper';

export const PLAYER_MENTIONS_QUERY_KEY = ['player-mentions'] as const;

export function usePlayerMentions(playerId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery<PlayerMentionEntry[]>({
    queryKey: PLAYER_MENTIONS_QUERY_KEY,
    queryFn: () => playerMentionService.listAllMentions(),
    staleTime: 30_000,
  });

  // Écoute temps réel Supabase (si table active)
  useEffect(() => {
    const channel = supabase
      .channel('player-mentions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_mentions' },
        () => {
          queryClient.invalidateQueries({ queryKey: PLAYER_MENTIONS_QUERY_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const upsertMutation = useMutation({
    mutationFn: (input: UpsertPlayerMentionInput) =>
      playerMentionService.upsertPlayerMention(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLAYER_MENTIONS_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({
      id,
      entryPlayerId,
      mentionDate,
    }: {
      id: string;
      entryPlayerId?: string;
      mentionDate?: string;
    }) => playerMentionService.deletePlayerMention(id, entryPlayerId, mentionDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLAYER_MENTIONS_QUERY_KEY });
    },
  });

  const allMentions = query.data || [];

  const mentionsByPlayerId = useMemo(() => {
    const map = new Map<string, PlayerMentionEntry[]>();
    allMentions.forEach(entry => {
      const list = map.get(entry.player_id);
      if (list) {
        list.push(entry);
      } else {
        map.set(entry.player_id, [entry]);
      }
    });
    return map;
  }, [allMentions]);

  const latestMentionByPlayerId = useMemo(() => {
    const map = new Map<string, PlayerMentionEntry>();
    mentionsByPlayerId.forEach((entries, pid) => {
      const latest = getLatestMention(entries);
      if (latest) map.set(pid, latest);
    });
    return map;
  }, [mentionsByPlayerId]);

  const playerMentions = useMemo(() => {
    if (!playerId) return [];
    return mentionsByPlayerId.get(playerId) || [];
  }, [mentionsByPlayerId, playerId]);

  const playerLatestMention = useMemo(() => {
    return getLatestMention(playerMentions);
  }, [playerMentions]);

  return {
    allMentions,
    mentionsByPlayerId,
    latestMentionByPlayerId,
    playerMentions,
    playerLatestMention,
    isLoading: query.isLoading,
    upsertMention: upsertMutation.mutateAsync,
    isSavingMention: upsertMutation.isPending,
    deleteMention: deleteMutation.mutateAsync,
    isDeletingMention: deleteMutation.isPending,
  };
}

