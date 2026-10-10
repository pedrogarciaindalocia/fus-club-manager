import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clubService } from '../services/clubService';
import { toast } from 'sonner';
import type { Club, MyClubSettings } from '../types';

export const useClubData = () => {
  const queryClient = useQueryClient();

  const mainClubQuery = useQuery({
    queryKey: ['mainClub'],
    queryFn: clubService.getMyClub,
  });

  const opponentsQuery = useQuery({
    queryKey: ['opponents'],
    queryFn: clubService.getOpponentClubs,
  });

  const updateMainClubMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MyClubSettings> }) =>
      clubService.updateMyClub(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mainClub'] });
      toast.success('Paramètres du club mis à jour');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const addOpponentMutation = useMutation({
    mutationFn: clubService.addOpponentClub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opponents'] });
      toast.success('Club adverse ajouté');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const updateOpponentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Club> }) =>
      clubService.updateOpponentClub(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opponents'] });
      toast.success('Club adverse mis à jour');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const deleteOpponentMutation = useMutation({
    mutationFn: clubService.deleteOpponentClub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opponents'] });
      toast.success('Club adverse supprimé');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const resetDatabaseMutation = useMutation({
    mutationFn: clubService.resetDatabase,
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Base de données réinitialisée');
    },
    onError: (error: any) => {
      toast.error(`Erreur de réinitialisation: ${error.message}`);
    }
  });

  return {
    mainClub: mainClubQuery.data || null,
    opponentClubs: opponentsQuery.data || [],
    isLoading: mainClubQuery.isLoading || opponentsQuery.isLoading,
    updateMainClub: updateMainClubMutation.mutateAsync,
    addOpponent: addOpponentMutation.mutateAsync,
    updateOpponent: updateOpponentMutation.mutateAsync,
    deleteOpponent: deleteOpponentMutation.mutateAsync,
    resetDatabase: resetDatabaseMutation.mutateAsync,
  };
};
