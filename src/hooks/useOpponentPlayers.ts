import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { opponentPlayerService } from '../services/opponentPlayerService';
import { toast } from 'sonner';
import type { OpponentPlayer } from '../types';
import type { Inserts, Updates } from '../types/supabase';

export const useOpponentPlayers = (opponentId?: string, category?: string) => {
  const queryClient = useQueryClient();

  const queryKey = ['opponent_players', opponentId || 'all', category || 'all'];

  const query = useQuery({
    queryKey,
    queryFn: () => opponentPlayerService.getOpponentPlayers(opponentId, category),
    enabled: !!opponentId,
  });

  const addMutation = useMutation({
    mutationFn: (player: Inserts<'opponent_players'>) =>
      opponentPlayerService.addOpponentPlayer(player),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opponent_players'] });
      toast.success('Joueur adverse ajouté avec succès');
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de l'ajout: ${error.message}`);
    },
  });

  const addManyMutation = useMutation({
    mutationFn: (players: Inserts<'opponent_players'>[]) =>
      opponentPlayerService.addManyOpponentPlayers(players),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['opponent_players'] });
      toast.success(`${data.length} joueurs adverses générés avec succès !`);
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la génération en masse: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Updates<'opponent_players'> }) =>
      opponentPlayerService.updateOpponentPlayer(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opponent_players'] });
      toast.success('Joueur adverse mis à jour');
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => opponentPlayerService.deleteOpponentPlayer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opponent_players'] });
      toast.success('Joueur adverse supprimé');
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la suppression: ${error.message}`);
    },
  });

  return {
    players: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    addOpponentPlayer: addMutation.mutateAsync,
    addManyOpponentPlayers: addManyMutation.mutateAsync,
    updateOpponentPlayer: updateMutation.mutateAsync,
    deleteOpponentPlayer: deleteMutation.mutateAsync,
  };
};
