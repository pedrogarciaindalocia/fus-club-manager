import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { competitionService } from '../services/competitionService';
import { toast } from 'sonner';
import type { League, Stadium } from '../types';

const EMPTY_LEAGUES: League[] = [];
const EMPTY_STADIUMS: Stadium[] = [];

export const useCompetitions = () => {
  const queryClient = useQueryClient();

  const leaguesQuery = useQuery({
    queryKey: ['leagues'],
    queryFn: competitionService.getLeagues,
  });

  const stadiumsQuery = useQuery({
    queryKey: ['stadiums'],
    queryFn: competitionService.getStadiums,
  });

  const addLeagueMutation = useMutation({
    mutationFn: competitionService.addLeague,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      toast.success('Compétition ajoutée');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const updateLeagueMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<League> }) =>
      competitionService.updateLeague(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      toast.success('Compétition mise à jour');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const deleteLeagueMutation = useMutation({
    mutationFn: competitionService.deleteLeague,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      toast.success('Compétition supprimée');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const addStadiumMutation = useMutation({
    mutationFn: competitionService.addStadium,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stadiums'] });
      toast.success('Stade ajouté');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const updateStadiumMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Stadium> }) =>
      competitionService.updateStadium(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stadiums'] });
      toast.success('Stade mis à jour');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const deleteStadiumMutation = useMutation({
    mutationFn: competitionService.deleteStadium,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stadiums'] });
      toast.success('Stade supprimé');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  return {
    leagues: leaguesQuery.data || EMPTY_LEAGUES,
    stadiums: stadiumsQuery.data || EMPTY_STADIUMS,
    isLoading: leaguesQuery.isLoading || stadiumsQuery.isLoading,
    addLeague: addLeagueMutation.mutateAsync,
    updateLeague: updateLeagueMutation.mutateAsync,
    deleteLeague: deleteLeagueMutation.mutateAsync,
    addStadium: addStadiumMutation.mutateAsync,
    updateStadium: updateStadiumMutation.mutateAsync,
    deleteStadium: deleteStadiumMutation.mutateAsync,
  };
};
