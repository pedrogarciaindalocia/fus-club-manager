import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recruitmentService } from '../services/recruitmentService';
import { usePlugins } from '../../../context/PluginsContext';
import type {
  Scout,
  TrialCandidate,
  PlayerTest,
  CandidateEvaluation,
  ScoutObservation,
  PipelineStage
} from '../types/recruitment';
import { toast } from 'sonner';

export const RECRUITMENT_KEYS = {
  scouts: ['recruitment', 'scouts'] as const,
  candidates: ['recruitment', 'candidates'] as const,
  candidate: (id: string) => ['recruitment', 'candidate', id] as const,
  tests: ['recruitment', 'tests'] as const,
  evaluations: ['recruitment', 'evaluations'] as const,
  observations: ['recruitment', 'observations'] as const,
  timeline: (id?: string) => ['recruitment', 'timeline', id] as const,
};

export function useRecruitment(candidateIdForTimeline?: string) {
  const queryClient = useQueryClient();

  // Détection d'activation du plugin (Null Object Pattern)
  let isPluginActive = true;
  try {
    const plugins = usePlugins();
    isPluginActive = plugins.isPluginActive('recruitment_v2');
  } catch {
    // Si appelé hors provider, conserver la valeur active par défaut
    isPluginActive = true;
  }

  const scoutsQuery = useQuery({
    queryKey: RECRUITMENT_KEYS.scouts,
    queryFn: () => recruitmentService.getScouts(),
    enabled: isPluginActive,
  });

  const candidatesQuery = useQuery({
    queryKey: RECRUITMENT_KEYS.candidates,
    queryFn: () => recruitmentService.getCandidates(),
    enabled: isPluginActive,
  });

  const testsQuery = useQuery({
    queryKey: RECRUITMENT_KEYS.tests,
    queryFn: () => recruitmentService.getTests(),
    enabled: isPluginActive,
  });

  const evaluationsQuery = useQuery({
    queryKey: RECRUITMENT_KEYS.evaluations,
    queryFn: () => recruitmentService.getEvaluations(),
    enabled: isPluginActive,
  });

  const observationsQuery = useQuery({
    queryKey: RECRUITMENT_KEYS.observations,
    queryFn: () => recruitmentService.getObservations(),
    enabled: isPluginActive,
  });

  const timelineQuery = useQuery({
    queryKey: RECRUITMENT_KEYS.timeline(candidateIdForTimeline),
    queryFn: () => recruitmentService.getTimeline(candidateIdForTimeline),
    enabled: isPluginActive && !!candidateIdForTimeline,
  });

  // SCOUTS MUTATIONS
  const createScoutMutation = useMutation({
    mutationFn: (payload: { scout: Omit<Scout, 'id' | 'created_at' | 'updated_at'>; credentials?: { login?: string; tempPassword?: string } } | Omit<Scout, 'id' | 'created_at' | 'updated_at'>) => {
      if ('scout' in payload) {
        return recruitmentService.createScout(payload.scout, payload.credentials);
      }
      return recruitmentService.createScout(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.scouts });
      toast.success('Scout ajouté à la cellule de recrutement');
    },
    onError: () => toast.error('Erreur lors de l\'ajout du scout'),
  });

  const updateScoutMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Scout> }) => recruitmentService.updateScout(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.scouts });
      toast.success('Profil scout mis à jour avec succès');
    },
    onError: (err: any) => {
      console.error('[useRecruitment] updateScout mutation error:', err);
      toast.error(`Erreur mise à jour scout: ${err?.message || 'Erreur inconnue'}`);
    },
  });

  const deleteScoutMutation = useMutation({
    mutationFn: (id: string) => recruitmentService.deleteScout(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.scouts });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
      queryClient.invalidateQueries({ queryKey: ['recruitment', 'timeline'] });
      toast.success('Scout retiré de la cellule et joueurs libérés');
    },
    onError: (err: any) => {
      console.error('[useRecruitment] deleteScout mutation error:', err);
      toast.error(`Erreur suppression scout: ${err?.message || 'Erreur inconnue'}`);
    },
  });

  const deleteScoutsMutation = useMutation({
    mutationFn: (ids: string[]) => recruitmentService.deleteScouts(ids),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.scouts });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
      queryClient.invalidateQueries({ queryKey: ['recruitment', 'timeline'] });
      toast.success(`${count} scout(s) supprimé(s) et joueurs libérés`);
    },
    onError: (err: any) => {
      console.error('[useRecruitment] deleteScouts mutation error:', err);
      toast.error(`Erreur suppression multiple scouts: ${err?.message || 'Erreur inconnue'}`);
    },
  });

  const releaseCandidatesByScoutMutation = useMutation({
    mutationFn: ({ scoutId, scoutName }: { scoutId: string | string[]; scoutName?: string }) =>
      recruitmentService.releaseCandidatesByScout(scoutId, scoutName),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
      queryClient.invalidateQueries({ queryKey: ['recruitment', 'timeline'] });
      if (data.releasedCount > 0) {
        toast.success(`${data.releasedCount} joueur(s) libéré(s) pour réassignation`, { icon: '🔄' });
      }
    },
  });

  // CANDIDATES MUTATIONS
  const createCandidateMutation = useMutation({
    mutationFn: (candidate: Omit<TrialCandidate, 'id' | 'created_at' | 'updated_at'>) =>
      recruitmentService.createCandidate(candidate),
    onSuccess: (newCand) => {
      queryClient.setQueryData<TrialCandidate[]>(RECRUITMENT_KEYS.candidates, (old = []) => [
        newCand,
        ...old.filter(c => c.id !== newCand.id)
      ]);
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.timeline() });
      toast.success(`Le joueur ${newCand.first_name} ${newCand.last_name} a été ajouté à la base de données`);
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement du joueur'),
  });

  const updateCandidateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TrialCandidate> }) =>
      recruitmentService.updateCandidate(id, updates),
    onSuccess: (updated) => {
      queryClient.setQueryData<TrialCandidate[]>(RECRUITMENT_KEYS.candidates, (old = []) =>
        old.map(c => c.id === updated.id ? { ...c, ...updated } : c)
      );
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
      toast.success('Fiche candidat mise à jour');
    },
  });

  const updatePipelineStageMutation = useMutation({
    mutationFn: ({ id, stage, reason }: { id: string; stage: PipelineStage; reason?: string }) =>
      recruitmentService.updatePipelineStage(id, stage, reason),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.timeline() });
      toast.success(`Étape mise à jour : ${vars.stage.replace('_', ' ').toUpperCase()}`);
    },
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: (id: string) => recruitmentService.deleteCandidate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.evaluations });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.timeline() });
    },
    onError: (err: any) => {
      console.error('[useRecruitment] deleteCandidate mutation error:', err);
      toast.error(`Erreur lors de la suppression du candidat : ${err?.message || 'Erreur inconnue'}`);
    },
  });

  const deleteCandidatesMutation = useMutation({
    mutationFn: (ids: string[]) => recruitmentService.deleteCandidates(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.evaluations });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.timeline() });
    },
    onError: (err: any) => {
      console.error('[useRecruitment] deleteCandidates mutation error:', err);
      toast.error(`Erreur lors de la suppression multiple : ${err?.message || 'Erreur inconnue'}`);
    },
  });

  const archiveCandidatesMutation = useMutation({
    mutationFn: (ids: string[]) => recruitmentService.archiveCandidates(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.timeline() });
    },
    onError: (err: any) => {
      console.error('[useRecruitment] archiveCandidates mutation error:', err);
      toast.error(`Erreur lors de l'archivage multiple : ${err?.message || 'Erreur inconnue'}`);
    },
  });

  // TESTS MUTATIONS
  const createTestMutation = useMutation({
    mutationFn: (test: Omit<PlayerTest, 'id' | 'created_at' | 'updated_at'>) => recruitmentService.createTest(test),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.tests });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.evaluations });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.timeline() });
      toast.success('Session de test planifiée (Dossier déplacé dans "Test Planifié")');
    },
  });

  const updateTestMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PlayerTest> }) =>
      recruitmentService.updateTest(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.tests });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.evaluations });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.timeline() });
      toast.success('Session de test mise à jour');
    },
    onError: (err: any) => {
      toast.error(`Erreur: ${err.message}`);
    },
  });

  const deleteTestMutation = useMutation({
    mutationFn: (id: string) => recruitmentService.deleteTest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.tests });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.evaluations });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.timeline() });
      toast.success('Session de test supprimée');
    },
    onError: (err: any) => {
      toast.error(`Erreur: ${err.message}`);
    },
  });

  // EVALUATIONS MUTATIONS
  const saveEvaluationMutation = useMutation({
    mutationFn: ({ evalData, options }: { evalData: Omit<CandidateEvaluation, 'id' | 'created_at'>; options?: { isReevaluation?: boolean; updateId?: string; promoteToShortlist?: boolean } }) =>
      recruitmentService.saveEvaluation(evalData, options),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.evaluations });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.tests });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.timeline() });
      if (variables.options?.isReevaluation) {
        toast.success('Réévaluation enregistrée avec succès');
      } else if (variables.options?.updateId) {
        toast.success('Évaluation mise à jour avec succès');
      } else {
        toast.success('Évaluation 1–10 enregistrée avec succès');
      }
    },
  });

  const deleteEvaluationMutation = useMutation({
    mutationFn: (id: string) => recruitmentService.deleteEvaluation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.evaluations });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.tests });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.timeline() });
      toast.success('Évaluation supprimée avec succès');
    },
    onError: (err: any) => {
      toast.error(`Erreur: ${err.message}`);
    },
  });

  const deleteEvaluationsMutation = useMutation({
    mutationFn: (ids: string[]) => recruitmentService.deleteEvaluations(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.evaluations });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.tests });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.timeline() });
      toast.success('Rapports d\'observation supprimés avec succès');
    },
    onError: (err: any) => {
      toast.error(`Erreur: ${err.message}`);
    },
  });
  const createObservationMutation = useMutation({
    mutationFn: (obs: Omit<ScoutObservation, 'id' | 'created_at'>) => recruitmentService.createObservation(obs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.observations });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.timeline() });
      toast.success('Rapport d\'observation match enregistré');
    },
  });

  // RESET RECRUITMENT MUTATION
  const resetRecruitmentMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string; confirmationWord: string }) =>
      recruitmentService.resetRecruitmentData(credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment'] });
    },
  });

  return {
    isPluginActive,
    scouts: isPluginActive ? (scoutsQuery.data || []) : [],
    isLoadingScouts: isPluginActive ? scoutsQuery.isLoading : false,
    candidates: isPluginActive ? (candidatesQuery.data || []) : [],
    candidatesQuery,
    isLoadingCandidates: isPluginActive ? candidatesQuery.isLoading : false,
    tests: isPluginActive ? (testsQuery.data || []) : [],
    isLoadingTests: isPluginActive ? testsQuery.isLoading : false,
    evaluations: isPluginActive ? (evaluationsQuery.data || []) : [],
    isLoadingEvaluations: isPluginActive ? evaluationsQuery.isLoading : false,
    observations: isPluginActive ? (observationsQuery.data || []) : [],
    isLoadingObservations: isPluginActive ? observationsQuery.isLoading : false,
    timeline: isPluginActive ? (timelineQuery.data || []) : [],
    isLoadingTimeline: isPluginActive ? timelineQuery.isLoading : false,

    createScout: (
      scout: Omit<Scout, 'id' | 'created_at' | 'updated_at'>,
      credentials?: { login?: string; tempPassword?: string }
    ) => {
      if (credentials) {
        return createScoutMutation.mutateAsync({ scout, credentials });
      }
      return createScoutMutation.mutateAsync(scout);
    },
    updateScout: (
      arg1: string | { id: string; updates: Partial<Scout> },
      arg2?: Partial<Scout>
    ) => {
      if (typeof arg1 === 'string') {
        return updateScoutMutation.mutateAsync({ id: arg1, updates: arg2 || {} });
      }
      return updateScoutMutation.mutateAsync(arg1);
    },
    deleteScout: deleteScoutMutation.mutateAsync,
    deleteScouts: deleteScoutsMutation.mutateAsync,

    createCandidate: createCandidateMutation.mutateAsync,
    updateCandidate: (
      arg1: string | { id: string; updates: Partial<TrialCandidate> },
      arg2?: Partial<TrialCandidate>
    ) => {
      if (typeof arg1 === 'string') {
        return updateCandidateMutation.mutateAsync({ id: arg1, updates: arg2 || {} });
      }
      return updateCandidateMutation.mutateAsync(arg1);
    },
    updatePipelineStage: updatePipelineStageMutation.mutateAsync,
    deleteCandidate: deleteCandidateMutation.mutateAsync,
    deleteCandidates: deleteCandidatesMutation.mutateAsync,
    archiveCandidates: archiveCandidatesMutation.mutateAsync,

    createTest: createTestMutation.mutateAsync,
    updateTest: (
      arg1: string | { id: string; updates: Partial<PlayerTest> },
      arg2?: Partial<PlayerTest>
    ) => {
      if (typeof arg1 === 'string') {
        return updateTestMutation.mutateAsync({ id: arg1, updates: arg2 || {} });
      }
      return updateTestMutation.mutateAsync(arg1);
    },
    deleteTest: deleteTestMutation.mutateAsync,
    saveEvaluation: (evalData: Omit<CandidateEvaluation, 'id' | 'created_at'>, options?: { isReevaluation?: boolean; updateId?: string; promoteToShortlist?: boolean }) =>
      saveEvaluationMutation.mutateAsync({ evalData, options }),
    deleteEvaluation: (id: string) => deleteEvaluationMutation.mutateAsync(id),
    deleteEvaluations: (ids: string[]) => deleteEvaluationsMutation.mutateAsync(ids),
    createObservation: createObservationMutation.mutateAsync,
    resetRecruitmentData: resetRecruitmentMutation.mutateAsync,
    releaseCandidatesByScout: (scoutId: string | string[], scoutName?: string) =>
      releaseCandidatesByScoutMutation.mutateAsync({ scoutId, scoutName }),
    acknowledgeMission: async (candidateId: string, missionId: string, scoutId: string, scoutName: string) => {
      const res = await recruitmentService.acknowledgeMission(candidateId, missionId, scoutId, scoutName);
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
      queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidate(candidateId) });
      queryClient.invalidateQueries({ queryKey: ['recruitment', 'timeline'] });
      return res;
    },
  };
}
