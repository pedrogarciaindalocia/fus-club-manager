import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { opponentMatchService } from '../services/opponentMatchService';
import { toast } from 'sonner';
import type { OpponentMatch } from '../types';

export const useOpponentMatches = (leagueId?: string) => {
  const queryClient = useQueryClient();

  const queryKey = ['opponent_matches', leagueId || 'all'];

  const {
    data: opponentMatches = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => opponentMatchService.getOpponentMatches(leagueId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const createMutation = useMutation({
    mutationFn: (match: Omit<OpponentMatch, 'id' | 'created_at' | 'updated_at'>) =>
      opponentMatchService.createOpponentMatch(match),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opponent_matches'] });
      toast.success('Résultat du match adverse enregistré !');
    },
    onError: (err: any) => {
      toast.error(`Erreur d'enregistrement : ${err.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OpponentMatch> }) =>
      opponentMatchService.updateOpponentMatch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opponent_matches'] });
      toast.success('Score du match adverse mis à jour !');
    },
    onError: (err: any) => {
      toast.error(`Erreur de mise à jour : ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => opponentMatchService.deleteOpponentMatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opponent_matches'] });
      toast.success('Match adverse supprimé');
    },
    onError: (err: any) => {
      toast.error(`Erreur de suppression : ${err.message}`);
    },
  });

  return {
    opponentMatches,
    isLoading,
    refetch,
    createOpponentMatch: createMutation.mutateAsync,
    updateOpponentMatch: updateMutation.mutateAsync,
    deleteOpponentMatch: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
};

