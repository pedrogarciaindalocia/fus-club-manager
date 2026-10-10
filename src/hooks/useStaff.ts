import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffService } from '../services/staffService';
import { toast } from 'sonner';
import type { StaffMember } from '../types';

export const useStaff = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['staff'],
    queryFn: staffService.getStaff,
  });

  const createMutation = useMutation({
    mutationFn: staffService.addMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Membre du staff ajouté');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffMember> }) =>
      staffService.updateMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Profil staff mis à jour');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: staffService.deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Membre du staff supprimé');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  return {
    staff: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    addStaff: createMutation.mutateAsync,
    updateStaff: updateMutation.mutateAsync,
    deleteStaff: deleteMutation.mutateAsync,
  };
};
