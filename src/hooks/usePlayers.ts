import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playerService } from '../services/playerService';
import { toast } from 'sonner';
import type { Player } from '../types';

export const usePlayers = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['players'],
    queryFn: () => playerService.getPlayers(),
  });

  const createMutation = useMutation({
    mutationFn: playerService.addPlayer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Joueur ajouté avec succès');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Player> }) => 
      playerService.updatePlayer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Profil joueur mis à jour');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await playerService.deletePlayer(id);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Joueur supprimé du système');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const bulkAddMutation = useMutation({
    mutationFn: playerService.bulkAddPlayers,
    onSuccess: (_, players) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success(`${players.length} joueur${players.length > 1 ? 's' : ''} ajouté${players.length > 1 ? 's' : ''} avec succès`);
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: playerService.bulkDeletePlayers,
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success(`${ids.length} joueur${ids.length > 1 ? 's' : ''} supprimé${ids.length > 1 ? 's' : ''} avec leurs photos`);
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  return {
    players: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    addPlayer: createMutation.mutateAsync,
    updatePlayer: updateMutation.mutateAsync,
    deletePlayer: deleteMutation.mutateAsync,
    bulkDeletePlayers: bulkDeleteMutation.mutateAsync,
    isBulkDeleting: bulkDeleteMutation.isPending,
    bulkAddPlayers: bulkAddMutation.mutateAsync,
    isBulkAdding: bulkAddMutation.isPending,
  };
};
