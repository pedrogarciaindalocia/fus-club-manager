import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamService } from '../services/teamService';
import { toast } from 'sonner';
import type { Team } from '../services/teamService';
import { AuditLogger } from '../services/auditLogger';

const EMPTY_TEAMS: Team[] = [];

export const useTeams = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['teams'],
    queryFn: teamService.getTeams,
  });

  const createMutation = useMutation({
    mutationFn: teamService.addTeam,
    onSuccess: (newTeam) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Équipe créée avec succès');
      AuditLogger.logCreate(
        'TEAMS',
        'TEAM',
        newTeam.id,
        newTeam,
        `Création de l'unité d'équipe ${newTeam.name} (${newTeam.category})`
      );
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Team> }) =>
      teamService.updateTeam(id, data),
    onSuccess: (updatedTeam, { id, data }) => {
      const existingList = queryClient.getQueryData<Team[]>(['teams']) || [];
      const oldTeam = existingList.find(t => t.id === id);

      queryClient.setQueryData<Team[]>(['teams'], (prev) =>
        prev ? prev.map(t => t.id === updatedTeam.id ? updatedTeam : t) : [updatedTeam]
      );
      queryClient.refetchQueries({ queryKey: ['teams'] });
      toast.success('Équipe mise à jour');

      AuditLogger.logUpdate(
        'TEAMS',
        'TEAM',
        id,
        oldTeam || null,
        updatedTeam || data,
        `Mise à jour de l'équipe ${updatedTeam.name || oldTeam?.name || id}`
      );
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const existingList = queryClient.getQueryData<Team[]>(['teams']) || [];
      const oldTeam = existingList.find(t => t.id === id);
      await teamService.deleteTeam(id);
      return { id, oldTeam };
    },
    onSuccess: ({ id, oldTeam }) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Équipe supprimée');

      AuditLogger.logDelete(
        'TEAMS',
        'TEAM',
        id,
        oldTeam || null,
        `Suppression de l'équipe ${oldTeam?.name ? oldTeam.name : `#${id}`}`
      );
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
