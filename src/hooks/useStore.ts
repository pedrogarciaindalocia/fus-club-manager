import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storeService } from '../services/storeService';
import { toast } from 'sonner';
import type { Banner } from '../types';

export const useStore = () => {
  const queryClient = useQueryClient();

  const bannersQuery = useQuery({
    queryKey: ['banners'],
    queryFn: storeService.getBanners,
  });

  const addBannerMutation = useMutation({
    mutationFn: (banner: Omit<Banner, 'id' | 'created_at' | 'updated_at'>) =>
      storeService.addBanner(banner),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Bannière ajoutée');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const updateBannerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Banner> }) =>
      storeService.updateBanner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Bannière mise à jour');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const deleteBannerMutation = useMutation({
    mutationFn: (id: string) => storeService.deleteBanner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Bannière supprimée');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    banners: bannersQuery.data || [],
    isLoadingBanners: bannersQuery.isLoading,
    addBanner: addBannerMutation.mutateAsync,
    updateBanner: updateBannerMutation.mutateAsync,
    deleteBanner: deleteBannerMutation.mutateAsync,
  };
};
