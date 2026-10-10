import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainingService } from '../services/trainingService';
import type {
  TrainingSession,
  TrainingExercise,
  SessionAttendance,
  PlayerTrainingEvaluation,
  PlayerTrainingLoad
} from '../types/training';
import { toast } from 'sonner';

export const TRAINING_KEYS = {
  sessions: ['trainings', 'sessions'] as const,
  session: (id: string) => ['trainings', 'session', id] as const,
  exercises: ['trainings', 'exercises'] as const,
  attendances: (sessionId?: string) => ['trainings', 'attendances', sessionId] as const,
  evaluations: ['trainings', 'evaluations'] as const,
  loads: ['trainings', 'loads'] as const,
};

export function useTrainings(activeSessionId?: string) {
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: TRAINING_KEYS.sessions,
    queryFn: () => trainingService.getSessions(),
  });

  const exercisesQuery = useQuery({
    queryKey: TRAINING_KEYS.exercises,
    queryFn: () => trainingService.getExercises(),
  });

  const attendancesQuery = useQuery({
    queryKey: TRAINING_KEYS.attendances(activeSessionId),
    queryFn: () => trainingService.getAttendances(activeSessionId),
  });

  const evaluationsQuery = useQuery({
    queryKey: TRAINING_KEYS.evaluations,
    queryFn: () => trainingService.getEvaluations(),
  });

  const loadsQuery = useQuery({
    queryKey: TRAINING_KEYS.loads,
    queryFn: () => trainingService.getLoads(),
  });

  // MUTATIONS: Sessions
  const createSessionMutation = useMutation({
    mutationFn: (session: Omit<TrainingSession, 'id' | 'created_at' | 'updated_at'>) =>
      trainingService.createSession(session),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_KEYS.sessions });
      toast.success('Séance créée avec succès');
    },
    onError: (err: any) => {
      toast.error('Erreur création de séance: ' + (err.message || 'inconnue'));
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TrainingSession> }) =>
      trainingService.updateSession(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_KEYS.sessions });
      toast.success('Séance mise à jour');
    },
    onError: (err: any) => {
      toast.error('Erreur mise à jour séance: ' + (err.message || 'inconnue'));
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => trainingService.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_KEYS.sessions });
      toast.success('Séance supprimée');
    },
    onError: (err: any) => {
      toast.error('Erreur suppression séance: ' + (err.message || 'inconnue'));
    },
  });

  const duplicateSessionMutation = useMutation({
    mutationFn: (id: string) => trainingService.duplicateSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_KEYS.sessions });
      toast.success('Séance dupliquée avec succès');
    },
    onError: (err: any) => {
      toast.error('Erreur duplication séance: ' + (err.message || 'inconnue'));
    },
  });

  // MUTATIONS: Exercises
  const createExerciseMutation = useMutation({
    mutationFn: (exo: Omit<TrainingExercise, 'id' | 'created_at' | 'updated_at'>) =>
      trainingService.createExercise(exo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_KEYS.exercises });
      toast.success('Exercice ajouté à la bibliothèque');
    },
    onError: (err: any) => {
      toast.error('Erreur création exercice: ' + (err.message || 'inconnue'));
    },
  });

  const updateExerciseMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TrainingExercise> }) =>
      trainingService.updateExercise(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_KEYS.exercises });
      toast.success('Exercice mis à jour');
    },
    onError: (err: any) => {
      toast.error('Erreur mise à jour exercice: ' + (err.message || 'inconnue'));
    },
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: (id: string) => trainingService.deleteExercise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_KEYS.exercises });
      toast.success('Exercice supprimé');
    },
    onError: (err: any) => {
      toast.error('Erreur suppression exercice: ' + (err.message || 'inconnue'));
    },
  });

  const toggleFavoriteExerciseMutation = useMutation({
    mutationFn: (id: string) => trainingService.toggleFavoriteExercise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_KEYS.exercises });
    },
  });

  // MUTATIONS: Attendance
  const saveAttendancesMutation = useMutation({
    mutationFn: ({ sessionId, attendances }: { sessionId: string; attendances: SessionAttendance[] }) =>
      trainingService.saveAttendances(sessionId, attendances),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: TRAINING_KEYS.attendances(vars.sessionId) });
      queryClient.invalidateQueries({ queryKey: TRAINING_KEYS.sessions });
      toast.success('Feuille de présence enregistrée');
    },
    onError: (err: any) => {
      toast.error('Erreur enregistrement présences: ' + (err.message || 'inconnue'));
    },
  });

  // MUTATIONS: Evaluations
  const saveEvaluationMutation = useMutation({
    mutationFn: (evaluation: Omit<PlayerTrainingEvaluation, 'id'>) =>
      trainingService.saveEvaluation(evaluation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_KEYS.evaluations });
      toast.success('Évaluation enregistrée avec succès');
    },
    onError: (err: any) => {
      toast.error('Erreur enregistrement évaluation: ' + (err.message || 'inconnue'));
    },
  });

  const deleteEvaluationMutation = useMutation({
    mutationFn: (id: string) => trainingService.deleteEvaluation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_KEYS.evaluations });
      toast.success('Évaluation supprimée');
    },
    onError: (err: any) => {
      toast.error('Erreur suppression évaluation: ' + (err.message || 'inconnue'));
    },
  });

  // MUTATIONS: Load
  const saveLoadMutation = useMutation({
    mutationFn: (loadItem: Omit<PlayerTrainingLoad, 'id'>) =>
      trainingService.saveLoad(loadItem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_KEYS.loads });
      toast.success('Charge d’entraînement enregistrée');
    },
    onError: (err: any) => {
      toast.error('Erreur enregistrement charge: ' + (err.message || 'inconnue'));
    },
  });

  return {
    // Queries
    sessions: sessionsQuery.data || [],
    exercises: exercisesQuery.data || [],
    attendances: attendancesQuery.data || [],
    evaluations: evaluationsQuery.data || [],
    loads: loadsQuery.data || [],
    isLoading:
      sessionsQuery.isLoading ||
      exercisesQuery.isLoading ||
      attendancesQuery.isLoading ||
      evaluationsQuery.isLoading ||
      loadsQuery.isLoading,
    // Mutations
    createSession: createSessionMutation.mutateAsync,
    updateSession: updateSessionMutation.mutateAsync,
    deleteSession: deleteSessionMutation.mutateAsync,
    duplicateSession: duplicateSessionMutation.mutateAsync,
    createExercise: createExerciseMutation.mutateAsync,
    updateExercise: updateExerciseMutation.mutateAsync,
    deleteExercise: deleteExerciseMutation.mutateAsync,
    toggleFavoriteExercise: toggleFavoriteExerciseMutation.mutateAsync,
    saveAttendances: saveAttendancesMutation.mutateAsync,
    saveEvaluation: saveEvaluationMutation.mutateAsync,
    deleteEvaluation: deleteEvaluationMutation.mutateAsync,
    saveLoad: saveLoadMutation.mutateAsync,
  };
}
