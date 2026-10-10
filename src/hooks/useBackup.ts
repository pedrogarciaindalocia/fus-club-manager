import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backupService } from '../services/backupService';
import { toast } from 'sonner';
import type { BackupType, BackupDestination } from '../types';

export const useBackup = () => {
  const queryClient = useQueryClient();

  const backupsQuery = useQuery({
    queryKey: ['backups'],
    queryFn: backupService.getBackups,
    retry: false, // Don't retry if table doesn't exist (404)
  });

  const statsQuery = useQuery({
    queryKey: ['backupStats'],
    queryFn: backupService.getStats,
    retry: false,
  });

  // Poll the active (running/pending) backup for real-time progress
  const activeBackup = (backupsQuery.data || []).find(
    b => b.status === 'running' || b.status === 'pending'
  );

  // Auto-refetch every 3 seconds while a backup is active
  useQuery({
    queryKey: ['backups', 'active-poll'],
    queryFn: async () => {
      // Invalidate both queries to get fresh data
      await queryClient.invalidateQueries({ queryKey: ['backups'] });
      await queryClient.invalidateQueries({ queryKey: ['backupStats'] });
      return true;
    },
    refetchInterval: activeBackup ? 3000 : false,
    enabled: !!activeBackup,
  });

  const createMutation = useMutation({
    mutationFn: (opts: { type: BackupType; destination: BackupDestination }) =>
      backupService.createBackup(opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      queryClient.invalidateQueries({ queryKey: ['backupStats'] });
      toast.success('Backup lancé avec succès');
    },
    onError: (error: any) => {
      toast.error(`Erreur de backup: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: backupService.deleteBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      queryClient.invalidateQueries({ queryKey: ['backupStats'] });
      toast.success('Backup supprimé');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    backups: backupsQuery.data || [],
    stats: statsQuery.data || {
      totalBackups: 0,
      lastBackupDate: null,
      totalSizeMB: 0,
      successRate: 0,
    },
    isLoading: backupsQuery.isLoading || statsQuery.isLoading,
    isError: backupsQuery.isError,
    activeBackup: activeBackup || null,
    createBackup: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteBackup: deleteMutation.mutateAsync,
  };
};
