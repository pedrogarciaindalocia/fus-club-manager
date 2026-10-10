import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playerService } from '../services/playerService';
import { toast } from 'sonner';
import type { Player } from '../types';
import { AuditLogger } from '../services/auditLogger';

export const usePlayers = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['players'],
    queryFn: () => playerService.getPlayers(),
  });

  const createMutation = useMutation({
    mutationFn: playerService.addPlayer,
    onSuccess: (newPlayer) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Joueur ajouté avec succès');
      AuditLogger.logCreate(
        'PLAYERS', 
        'PLAYER', 
        newPlayer.id, 
        newPlayer, 
        `Création du joueur ${newPlayer.full_name || newPlayer.first_name || ''}`
      );
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
      AuditLogger.log({
        action: 'CREATE',
        module: 'PLAYERS',
        description: `Échec de création de joueur : ${error.message}`,
        status: 'FAILED'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Player> }) => 
      playerService.updatePlayer(id, data),
    onSuccess: (updatedPlayer, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Profil joueur mis à jour');
      const existingList = queryClient.getQueryData<Player[]>(['players']) || [];
      const oldPlayer = existingList.find(p => p.id === id);

      AuditLogger.logUpdate(
        'PLAYERS', 
        'PLAYER', 
        id, 
        oldPlayer || null, 
        updatedPlayer || data, 
        `Mise à jour du profil joueur ${updatedPlayer?.full_name || oldPlayer?.full_name || id}`
      );
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const existingList = queryClient.getQueryData<Player[]>(['players']) || [];
      const oldPlayer = existingList.find(p => p.id === id);
      await playerService.deletePlayer(id);
      return { id, oldPlayer };
    },
    onSuccess: ({ id, oldPlayer }) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Joueur supprimé du système');

      // Audit Log pour la suppression de joueur
      AuditLogger.logDelete(
        'PLAYERS',
        'PLAYER',
        id,
        oldPlayer || null,
        `Suppression du joueur ${oldPlayer?.full_name ? oldPlayer.full_name : `#${id}`}`
      );
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
      AuditLogger.log({
        action: 'IMPORT',
        module: 'PLAYERS',
        description: `Importation en masse de ${players.length} joueurs`,
        metadata: { count: players.length }
      });
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
      AuditLogger.log({
        action: 'DELETE',
        module: 'PLAYERS',
        description: `Suppression en masse de ${ids.length} joueurs`,
        metadata: { deletedIds: ids }
      });
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
