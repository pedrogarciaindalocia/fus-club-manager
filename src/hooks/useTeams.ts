import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamService } from '../services/teamService';
import { toast } from 'sonner';
import type { Team } from '../services/teamService';

const EMPTY_TEAMS: Team[] = [];

export const useTeams = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['teams'],
    queryFn: teamService.getTeams,
  });

  const createMutation = useMutation({
    mutationFn: teamService.addTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Équipe créée avec succès');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Team> }) =>
      teamService.updateTeam(id, data),
    onSuccess: (updatedTeam) => {
      queryClient.setQueryData<Team[]>(['teams'], (prev) =>
        prev ? prev.map(t => t.id === updatedTeam.id ? updatedTeam : t) : [updatedTeam]
      );
      queryClient.refetchQueries({ queryKey: ['teams'] });
      toast.success('Équipe mise à jour');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await teamService.deleteTeam(id);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Équipe supprimée');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  return {
    teams: query.data || EMPTY_TEAMS,
    isLoading: query.isLoading,
    isError: query.isError,
    addTeam: createMutation.mutateAsync,
    updateTeam: updateMutation.mutateAsync,
    deleteTeam: deleteMutation.mutateAsync,
  };
};
