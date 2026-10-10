import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchService } from '../services/matchService';
import { toast } from 'sonner';
import type { Match } from '../types';
import { enqueue } from '../services/offlineQueue';

export const useMatches = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['matches'],
    queryFn: matchService.getAllMatches,
  });

  const isNetworkError = (err: any) => {
    return !navigator.onLine || err.message.includes('Failed to fetch') || err.message.includes('Network');
  };

  const createMutation = useMutation({
    mutationFn: matchService.createMatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Match planifié avec succès');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Match> }) => 
      matchService.updateMatch(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['matches'] });
      const previousMatches = queryClient.getQueryData<Match[]>(['matches']);
      queryClient.setQueryData<Match[]>(['matches'], old => 
        (old || []).map(m => m.id === id ? { ...m, ...data } : m)
      );
      return { previousMatches, id, data };
    },
    onError: (err: any, variables, context: any) => {
      if (isNetworkError(err)) {
        enqueue({ kind: 'update_match', matchId: context.id, updates: context.data }, context.id);
        toast.success('Modification de match sauvegardée hors ligne');
      } else {
        queryClient.setQueryData(['matches'], context.previousMatches);
        toast.error(`Erreur: ${err.message}`);
      }
    },
    onSettled: () => {
      if (navigator.onLine) queryClient.invalidateQueries({ queryKey: ['matches'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: matchService.deleteMatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Match supprimé');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const saveLineupMutation = useMutation({
    mutationFn: ({ matchId, startingXI, substitutes }: { matchId: string; startingXI: string[]; substitutes: string[] }) =>
      matchService.saveLineup(matchId, startingXI, substitutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Composition enregistrée');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const saveStaffMutation = useMutation({
    mutationFn: ({ matchId, staffIds }: { matchId: string; staffIds: string[] }) =>
      matchService.saveStaff(matchId, staffIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Staff du match enregistré');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  return {
    matches: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    addMatch: createMutation.mutateAsync,
    updateMatch: updateMutation.mutateAsync,
    deleteMatch: deleteMutation.mutateAsync,
    saveLineup: saveLineupMutation.mutateAsync,
    saveStaff: saveStaffMutation.mutateAsync,
  };
};
