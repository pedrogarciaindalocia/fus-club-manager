import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchService } from '../services/matchService';
import { toast } from 'sonner';
import type { MatchEvent } from '../types';
import { enqueue } from '../services/offlineQueue';

export const useMatchEvents = (matchId?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['match_events', matchId],
    queryFn: async () => {
      if (!matchId) return [];
      return matchService.getMatchEvents(matchId);
    },
    enabled: !!matchId,
  });

  const isNetworkError = (err: any) => {
    return !navigator.onLine || err.message.includes('Failed to fetch') || err.message.includes('Network');
  };

  const addEventMutation = useMutation({
    mutationFn: (event: Omit<MatchEvent, 'id'>) => matchService.addEvent(event),
    onMutate: async (newEvent) => {
      await queryClient.cancelQueries({ queryKey: ['match_events', matchId] });
      const previousEvents = queryClient.getQueryData<MatchEvent[]>(['match_events', matchId]);
      const localId = `local_${Date.now()}`;
      queryClient.setQueryData<MatchEvent[]>(['match_events', matchId], old => [...(old || []), { ...newEvent, id: localId } as MatchEvent]);
      return { previousEvents, localId, newEvent };
    },
    onError: (err: any, newEvent, context: any) => {
      if (isNetworkError(err)) {
        enqueue({ kind: 'insert_event', localId: context.localId, payload: { ...newEvent, id: context.localId } }, matchId);
        toast.success('Événement sauvegardé hors ligne');
      } else {
        queryClient.setQueryData(['match_events', matchId], context.previousEvents);
        toast.error(`Erreur création: ${err.message}`);
      }
    },
    onSettled: () => {
      if (navigator.onLine) queryClient.invalidateQueries({ queryKey: ['match_events', matchId] });
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<MatchEvent> }) => 
      matchService.updateEvent(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['match_events', matchId] });
      const previousEvents = queryClient.getQueryData<MatchEvent[]>(['match_events', matchId]);
      queryClient.setQueryData<MatchEvent[]>(['match_events', matchId], old => 
        (old || []).map(evt => evt.id === id ? { ...evt, ...updates } : evt)
      );
      return { previousEvents, id, updates };
    },
    onError: (err: any, variables, context: any) => {
      if (isNetworkError(err)) {
        enqueue({ kind: 'update_event', eventId: context.id, updates: context.updates }, matchId);
        toast.success('Modification sauvegardée hors ligne');
      } else {
        queryClient.setQueryData(['match_events', matchId], context.previousEvents);
        toast.error(`Erreur modification: ${err.message}`);
      }
    },
    onSettled: () => {
      if (navigator.onLine) queryClient.invalidateQueries({ queryKey: ['match_events', matchId] });
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => matchService.deleteEvent(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['match_events', matchId] });
      const previousEvents = queryClient.getQueryData<MatchEvent[]>(['match_events', matchId]);
      queryClient.setQueryData<MatchEvent[]>(['match_events', matchId], old => 
        (old || []).filter(evt => evt.id !== id)
      );
      return { previousEvents, id };
    },
    onError: (err: any, id, context: any) => {
      if (isNetworkError(err)) {
        enqueue({ kind: 'delete_event', eventId: context.id }, matchId);
        toast.success('Suppression sauvegardée hors ligne');
      } else {
        queryClient.setQueryData(['match_events', matchId], context.previousEvents);
        toast.error(`Erreur suppression: ${err.message}`);
      }
    },
    onSettled: () => {
      if (navigator.onLine) queryClient.invalidateQueries({ queryKey: ['match_events', matchId] });
    }
  });

  return {
    events: query.data || [],
    isLoading: query.isLoading,
    addEvent: addEventMutation.mutateAsync,
    updateEvent: updateEventMutation.mutateAsync,
    deleteEvent: deleteEventMutation.mutateAsync,
  };
};
