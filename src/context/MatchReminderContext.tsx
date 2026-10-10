import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface MatchReminderContextData {
  reminderInterval: number;
  maxReminders: number;
  setReminderInterval: (val: number) => void;
  setMaxReminders: (val: number) => void;
  setMatchLiveWaitingKickoff: (matchId: string) => Promise<void>;
  checkAutoTerminateMatches: () => Promise<void>;
}

const MatchReminderContext = createContext<MatchReminderContextData>({
  reminderInterval: 5,
  maxReminders: 3,
  setReminderInterval: () => {},
  setMaxReminders: () => {},
  setMatchLiveWaitingKickoff: async () => {},
  checkAutoTerminateMatches: async () => {},
});

export const useMatchReminder = () => useContext(MatchReminderContext);

export const MatchReminderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reminderInterval, setReminderIntervalState] = useState(5);
  const [maxReminders, setMaxRemindersState] = useState(3);
  const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
  const reminderState = useRef<Record<string, { count: number; lastReminderAt: number }>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoTerminateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const savedInterval = localStorage.getItem('fus_reminder_interval');
    if (savedInterval) setReminderIntervalState(parseInt(savedInterval, 10));
    const savedMax = localStorage.getItem('fus_max_reminders');
    if (savedMax) setMaxRemindersState(parseInt(savedMax, 10));
  }, []);

  const setReminderInterval = (val: number) => {
    setReminderIntervalState(val);
    localStorage.setItem('fus_reminder_interval', val.toString());
  };

  const setMaxReminders = (val: number) => {
    setMaxRemindersState(val);
    localStorage.setItem('fus_max_reminders', val.toString());
  };

  const fetchMatches = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('matches')
        .select('*, opponent:clubs!opponent_id(name)')
        .eq('status', 'scheduled')
        .eq('match_date', today);

      if (!error && data) {
        setUpcomingMatches(data);
      }
    } catch (err) {
      console.warn('Error fetching matches for reminder:', err);
    }
  };

  useEffect(() => {
    fetchMatches();
    const refreshInterval = setInterval(fetchMatches, 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  const handleStartMatch = (matchId: string) => {
    toast.dismiss(`match-reminder-${matchId}`);
    navigate(`/matchday?matchId=${matchId}`);
  };

  const handlePostponeMatch = async (matchId: string) => {
    try {
      toast.dismiss(`match-reminder-${matchId}`);
      await supabase
        .from('matches')
        .update({ status: 'postponed', updated_at: new Date().toISOString() })
        .eq('id', matchId);
      
      setUpcomingMatches(prev => prev.filter(m => m.id !== matchId));
      delete reminderState.current[matchId];
      toast.info('Le match a été reporté.');
    } catch (err) {
      toast.error('Erreur lors du report du match');
    }
  };

  /**
   * Redirection vers la console de match pour préparer la feuille et donner le coup d'envoi
   * [US-DASH-56] Aucun match ne passe en statut 'live' sans coup d'envoi officiel donné par l'utilisateur.
   */
  const setMatchLiveWaitingKickoff = async (matchId: string) => {
    toast.dismiss(`match-reminder-${matchId}`);
    handleStartMatch(matchId);
  };

  /**
   * RÈGLE D'AUTO-CLÔTURE [US-DASH-56] :
   * 1. Si le coup d'envoi a été donné et que l'administrateur n'a pas mis fin au match,
   * après 120 minutes depuis l'initiation du match (kickoff_at ou time_elapsed_seconds >= 7200),
   * le live doit être automatiquement terminé.
   * 2. Si le coup d'envoi n'a pas été donné, le match n'est JAMAIS en live et n'est pas auto-clôturé.
   */
  const checkAutoTerminateMatches = useCallback(async () => {
    try {
      // 1. Tenter d'abord la fonction RPC Postgres si disponible
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('auto_terminate_expired_matches');
        if (!rpcErr && rpcData?.terminated_matches > 0) {
          toast.info(`${rpcData.terminated_matches} match(s) terminé(s) automatiquement (120 min après coup d'envoi). Synchronisé avec FUS-APP.`);
          return;
        }
      } catch {
        // Fallback côté client si la fonction RPC n'est pas encore déployée
      }

      // 2. Vérification côté client
      const { data: activeMatches, error } = await supabase
        .from('matches')
        .select('id, status, kickoff_at, time_elapsed_seconds, half_duration_minutes, match_date, match_time, updated_at, opponent:clubs!opponent_id(name)')
        .in('status', ['live', 'halftime', 'paused']);

      if (error || !activeMatches || activeMatches.length === 0) return;

      const now = new Date();
      const MAX_MATCH_DURATION_SEC = 120 * 60; // 120 minutes = 7200 secondes
      const MAX_MATCH_DURATION_MS = 120 * 60 * 1000;

      for (const m of activeMatches) {
        const halfDuration = m.half_duration_minutes || 45;
        const regularDurationSec = halfDuration * 2 * 60;

        let shouldTerminate = false;
        let reason = '';

        // Condition A : Le chronomètre interne dépasse 120 minutes (7200 s)
        if (m.time_elapsed_seconds != null && m.time_elapsed_seconds >= MAX_MATCH_DURATION_SEC) {
          shouldTerminate = true;
          reason = `Chronomètre à ${Math.floor(m.time_elapsed_seconds / 60)} min (seuil maximal de 120 min atteint)`;
        }

        // Condition B : Temps réel écoulé depuis le coup d'envoi officiel (kickoff_at) >= 120 minutes
        if (!shouldTerminate && m.kickoff_at) {
          const kickoffMs = new Date(m.kickoff_at).getTime();
          const elapsedFromKickoffMs = now.getTime() - kickoffMs;

          if (elapsedFromKickoffMs >= MAX_MATCH_DURATION_MS) {
            shouldTerminate = true;
            reason = `120 minutes révolues depuis le coup d'envoi officiel`;
          }
        }

        if (shouldTerminate) {
          console.log(`[Auto-Terminate] Clôture automatique du match ${m.id} : ${reason}`);
          await supabase
            .from('matches')
            .update({
              status: 'finished',
              live_period: 'finished',
              time_elapsed_seconds: Math.max(m.time_elapsed_seconds || 0, regularDurationSec),
              updated_at: new Date().toISOString()
            })
            .eq('id', m.id);

          const oppName = (m.opponent as any)?.name || 'Adversaire';
          toast.info(`Match contre ${oppName} terminé automatiquement (${reason}). Statut synchronisé avec FUS-APP.`, {
            id: `auto-finish-${m.id}`,
            duration: 8000,
          });
        }
      }
    } catch (err) {
      console.warn('Erreur vérification auto-terminaison des matchs:', err);
    }
  }, []);

  const checkReminders = () => {
    if (upcomingMatches.length === 0) return;

    const now = new Date();
    const intervalMs = reminderInterval * 60 * 1000;

    upcomingMatches.forEach(match => {
      if (!match.match_time || !match.match_date) return;

      const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
      
      if (now >= matchDateTime) {
        const state = reminderState.current[match.id] || { count: 0, lastReminderAt: 0 };

        if (now.getTime() - state.lastReminderAt >= intervalMs || state.count === 0) {
          state.count += 1;
          state.lastReminderAt = now.getTime();
          reminderState.current[match.id] = state;

          const oppName = match.opponent?.name || 'Adversaire';

          toast(
            `Le match contre ${oppName} est programmé ! Ouvrez la console Match pour donner le coup d'envoi officiel.`,
            {
              id: `match-reminder-${match.id}`,
              duration: intervalMs,
              action: {
                label: '⚽ Console Match',
                onClick: () => handleStartMatch(match.id),
              },
              cancel: {
                label: 'Reporter',
                onClick: () => handlePostponeMatch(match.id),
              },
            }
          );
        }
      }
    });
  };

  // Surveillance périodique : rappels et auto-clôture toutes les 30 secondes
  useEffect(() => {
    intervalRef.current = setInterval(checkReminders, 30000);
    autoTerminateIntervalRef.current = setInterval(checkAutoTerminateMatches, 30000);
    
    // Première vérification immédiate au montage
    checkAutoTerminateMatches();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (autoTerminateIntervalRef.current) clearInterval(autoTerminateIntervalRef.current);
    };
  }, [upcomingMatches, reminderInterval, maxReminders, checkAutoTerminateMatches]);

  return (
    <MatchReminderContext.Provider value={{
      reminderInterval,
      maxReminders,
      setReminderInterval,
      setMaxReminders,
      setMatchLiveWaitingKickoff,
      checkAutoTerminateMatches,
    }}>
      {children}
    </MatchReminderContext.Provider>
  );
};
