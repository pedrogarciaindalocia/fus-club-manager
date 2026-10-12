import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { AuditLogger } from '../services/auditLogger';
import { PresenceTracker } from '../services/presenceService';
import { useClubData } from '../hooks/useClubData';
import { ConcurrentSessionModal } from '../components/security/ConcurrentSessionModal';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';

export type SessionStatus = 'ACTIVE' | 'IDLE_COUNTDOWN' | 'EXPIRED';

export interface SessionSecurityContextValue {
  sessionStatus: SessionStatus;
  isUserActive: boolean;                 // true si mouvement souris/curseur récent (< 60s)
  idleSeconds: number;                   // secondes écoulées depuis la dernière activité
  gracePeriodSeconds: number;            // seuil de grâce (60 secondes)
  remainingCountdownSeconds: number;     // secondes restantes avant déconnexion effective
  totalTimeoutSeconds: number;           // durée totale d'inactivité autorisée (secondes)
  inactivityTimeoutMinutes: number;      // durée configurée en minutes
  lastActivityTimestamp: number;
  resetActivity: () => void;             // remise à 0 du compteur et passage en ACTIF
}

const SessionSecurityContext = createContext<SessionSecurityContextValue | null>(null);

export const SessionSecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mainClub } = useClubData();
  const [showConcurrentModal, setShowConcurrentModal] = useState(false);
  
  // Paramètre de timeout d'inactivité total (résolu avec réactivité immédiate)
  const [localTimeoutMinutes, setLocalTimeoutMinutes] = useState<number>(() => {
    const stored = localStorage.getItem('fuso_session_timeout_minutes');
    if (stored !== null && !isNaN(Number(stored))) {
      return Number(stored);
    }
    const dbVal = (mainClub?.settings as any)?.plugins?.session_timeout_minutes ?? (mainClub?.settings as any)?.session_timeout_minutes;
    if (dbVal !== undefined && !isNaN(Number(dbVal))) {
      return Number(dbVal);
    }
    return 30; // 30 min par défaut (recommandé)
  });

  // Synchronisation dès que mainClub est chargé depuis Supabase
  useEffect(() => {
    const dbVal = (mainClub?.settings as any)?.plugins?.session_timeout_minutes ?? (mainClub?.settings as any)?.session_timeout_minutes;
    if (dbVal !== undefined && !isNaN(Number(dbVal))) {
      const num = Number(dbVal);
      setLocalTimeoutMinutes(num);
      localStorage.setItem('fuso_session_timeout_minutes', String(num));
    }
  }, [mainClub]);

  // Écoute des mises à jour directes en temps réel depuis les paramètres
  useEffect(() => {
    const handleTimeoutUpdated = (e: any) => {
      const val = e.detail?.timeout;
      if (val !== undefined && !isNaN(Number(val))) {
        const num = Number(val);
        setLocalTimeoutMinutes(num);
        lastActivityRef.current = Date.now();
        setIdleSeconds(0);
        setRemainingCountdownSeconds(num === 0 ? Infinity : num * 60);
      }
    };
    window.addEventListener('session-timeout-updated', handleTimeoutUpdated);
    return () => window.removeEventListener('session-timeout-updated', handleTimeoutUpdated);
  }, []);

  const isTimeoutDisabled = localTimeoutMinutes === 0;
  const gracePeriodSeconds = 60; // 60 secondes d'activité sans déclenchement du compte à rebours
  const totalTimeoutSeconds = isTimeoutDisabled ? Infinity : Math.max(120, localTimeoutMinutes * 60);
  const inactivityTimeoutMinutes = localTimeoutMinutes;

  const lastActivityRef = useRef<number>(Date.now());
  const isIdleRef = useRef<boolean>(false);
  const hasAlertedRef = useRef<boolean>(false);

  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('ACTIVE');
  const [isUserActive, setIsUserActive] = useState<boolean>(true);
  const [idleSeconds, setIdleSeconds] = useState<number>(0);
  const [remainingCountdownSeconds, setRemainingCountdownSeconds] = useState<number>(totalTimeoutSeconds);

  // Remise à zéro du compteur et retour immédiat au statut ACTIF
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIdleSeconds(0);
    setRemainingCountdownSeconds(totalTimeoutSeconds);
    if (isIdleRef.current) {
      isIdleRef.current = false;
      setIsUserActive(true);
      setSessionStatus('ACTIVE');
    }
  }, [totalTimeoutSeconds]);

  // 1. Détection ultra-réactive des mouvements de souris / curseur et interactions utilisateur
  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
      // Si l'utilisateur était en état d'inactivité (> 60s), réactiver instantanément
      if (isIdleRef.current) {
        isIdleRef.current = false;
        setIsUserActive(true);
        setSessionStatus('ACTIVE');
      }
    };

    const events = ['mousemove', 'mousedown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, handleUserActivity, { passive: true }));

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handleUserActivity));
    };
  }, []);

  // 2. Boucle de vérification chaque seconde : calcul du statut et du décompte d'expiration
  useEffect(() => {
    const timer = setInterval(async () => {
      const now = Date.now();
      const currentStoredSession = AuditLogger.getCurrentSession();
      if (!currentStoredSession) return;

      // CAS 0 : Délai d'inactivité désactivé (0)
      if (isTimeoutDisabled) {
        if (isIdleRef.current) {
          isIdleRef.current = false;
          setIsUserActive(true);
          setSessionStatus('ACTIVE');
        }
        setRemainingCountdownSeconds(Infinity);
        return;
      }

      const idle = Math.floor((now - lastActivityRef.current) / 1000);
      setIdleSeconds(idle);

      // CAS 1 : Activité récente (< 60 secondes) -> Statut ACTIF
      if (idle < gracePeriodSeconds) {
        if (isIdleRef.current) {
          isIdleRef.current = false;
          setIsUserActive(true);
          setSessionStatus('ACTIVE');
        }
        setRemainingCountdownSeconds(Math.max(0, totalTimeoutSeconds - idle));
      } 
      // CAS 2 : Plus de 60 secondes sans activité souris/curseur -> Lancer le décompte d'expiration
      else {
        isIdleRef.current = true;
        setIsUserActive(false);
        setSessionStatus('IDLE_COUNTDOWN');

        const remaining = Math.max(0, totalTimeoutSeconds - idle);
        setRemainingCountdownSeconds(remaining);

        // CAS 3 : Le décompte est arrivé à 0 -> Déconnexion automatique de la session
        if (remaining <= 0 && !hasAlertedRef.current) {
          hasAlertedRef.current = true;
          toast.error("Votre session a expiré suite à une inactivité prolongée.", {
            duration: 8000,
          });

          await AuditLogger.closeSessionWithReason('EXPIRED');
          await supabase.auth.signOut();
          window.location.href = '/login?reason=inactivity';
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [totalTimeoutSeconds]);

  // 3. Surveillance de session concurrente (toutes les 12 secondes)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!hasAlertedRef.current) {
        const serverStatus = await AuditLogger.checkCurrentSessionStatus();
        if (serverStatus === 'TERMINATED_CONCURRENT') {
          hasAlertedRef.current = true;
          setShowConcurrentModal(true);
        }
      }
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  // 4. Écoute Supabase Realtime instantanée sur les changements de user_sessions
  useEffect(() => {
    const currentStoredSession = AuditLogger.getCurrentSession();
    if (!currentStoredSession?.session_id) return;

    const channel = supabase
      .channel(`session_guard_${currentStoredSession.session_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_sessions',
          filter: `session_id=eq.${currentStoredSession.session_id}`
        },
        (payload: any) => {
          if (payload.new?.status === 'TERMINATED_CONCURRENT' && !hasAlertedRef.current) {
            hasAlertedRef.current = true;
            setShowConcurrentModal(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 5. Présence temps réel & initialisation automatique de session d'audit
  useEffect(() => {
    const syncUser = async (user: { id: string; email?: string | null; user_metadata?: any } | null | undefined) => {
      if (user?.id) {
        PresenceTracker.connect({ id: user.id, email: user.email ?? null }, 'web');

        // Initialiser ou restaurer la session dans user_sessions si non encore active
        const curSession = AuditLogger.getCurrentSession();
        if (!curSession || curSession.user_id !== user.id || curSession.status !== 'ACTIVE') {
          try {
            await AuditLogger.startSession(
              user.id,
              user.email ?? null,
              user.user_metadata?.role || 'super_admin'
            );
          } catch (e) {
            console.warn('[SessionSecurityContext] Erreur auto-démarrage session audit:', e);
          }
        }
      } else {
        PresenceTracker.disconnect();
      }
    };

    supabase.auth.getSession().then(({ data }) => syncUser(data.session?.user));
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUser(session?.user);
    });

    // Inactif uniquement après 5 minutes sans mouvement (300s) au lieu de 60s
    const updateActivity = () => {
      const idleMs = Date.now() - lastActivityRef.current;
      PresenceTracker.setActivity(idleMs >= 300000 ? 'idle' : 'active');
    };
    const presenceTimer = setInterval(updateActivity, 10000);
    const activityEvents = ['mousedown', 'keydown', 'pointermove', 'touchstart'];
    activityEvents.forEach(ev => window.addEventListener(ev, updateActivity, { passive: true }));
    document.addEventListener('visibilitychange', updateActivity);

    return () => {
      clearInterval(presenceTimer);
      activityEvents.forEach(ev => window.removeEventListener(ev, updateActivity));
      document.removeEventListener('visibilitychange', updateActivity);
      authSub.subscription.unsubscribe();
      PresenceTracker.disconnect();
    };
  }, []);

  const handleConfirmConcurrentLogout = async () => {
    setShowConcurrentModal(false);
    await AuditLogger.closeSessionWithReason('TERMINATED_CONCURRENT');
    await supabase.auth.signOut();
    window.location.href = '/login?reason=concurrent_session';
  };

  // Formatage mm:ss du décompte
  const formatCountdown = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <SessionSecurityContext.Provider value={{
      sessionStatus,
      isUserActive,
      idleSeconds,
      gracePeriodSeconds,
      remainingCountdownSeconds,
      totalTimeoutSeconds,
      inactivityTimeoutMinutes,
      lastActivityTimestamp: lastActivityRef.current,
      resetActivity
    }}>
      {children}

      {/* Alerte flottante discrète lorsque l'inactivité dépasse 60s et qu'il reste moins de 2 minutes */}
      {sessionStatus === 'IDLE_COUNTDOWN' && remainingCountdownSeconds <= 120 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] max-w-md w-full px-4 animate-in slide-in-from-top duration-300">
          <div className="bg-slate-950/95 backdrop-blur-2xl border border-amber-500/40 text-white p-3.5 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Inactivité détectée ({idleSeconds}s)</p>
                <p className="text-[11px] text-amber-300/90 font-mono font-medium">
                  Déconnexion dans <span className="font-bold underline">{formatCountdown(remainingCountdownSeconds)}</span>
                </p>
              </div>
            </div>
            <button
              onClick={resetActivity}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shrink-0 transition-colors shadow-sm"
            >
              Rester actif
            </button>
          </div>
        </div>
      )}

      <ConcurrentSessionModal
        isOpen={showConcurrentModal}
        onConfirm={handleConfirmConcurrentLogout}
      />
    </SessionSecurityContext.Provider>
  );
};

export const useSessionSecurity = () => {
  const context = useContext(SessionSecurityContext);
  if (!context) {
    throw new Error('useSessionSecurity must be used within a SessionSecurityProvider');
  }
  return context;
};

