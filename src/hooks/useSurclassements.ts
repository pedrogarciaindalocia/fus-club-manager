import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { surclassementService, type CreateSurclassementPayload } from '../services/surclassementService';
import { toast } from 'sonner';

export const useSurclassements = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['surclassements'],
    queryFn: surclassementService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateSurclassementPayload) => surclassementService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surclassements'] });
      toast.success('Surclassement enregistré avec succès');
    },
    onError: (error: any) => {
      toast.error(`Erreur surclassement : ${error.message}`);
    },
  });

  const revertMutation = useMutation({
    mutationFn: (id: string) => surclassementService.revert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surclassements'] });
      toast.success("Joueur réintégré dans sa catégorie d'origine");
    },
    onError: (error: any) => {
      toast.error(`Erreur réintégration : ${error.message}`);
    },
  });

  /** Map playerId → surclassement actif (pour lookup O(1) dans la liste) */
  const activeByPlayerId = Object.fromEntries(
    (query.data ?? [])
      .filter(s => s.status === 'active')
      .map(s => [s.player_id, s])
  );

  return {
    surclassements: query.data ?? [],
    activeByPlayerId,
    isLoading: query.isLoading,
    createSurclassement: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    revertSurclassement: revertMutation.mutateAsync,
    isReverting: revertMutation.isPending,
  };
};

/** Hook léger pour l'historique d'un joueur précis */
export const usePlayerSurclassements = (playerId: string) => {
  return useQuery({
    queryKey: ['surclassements', 'player', playerId],
    queryFn: () => surclassementService.getForPlayer(playerId),
    enabled: !!playerId,
  });
};
