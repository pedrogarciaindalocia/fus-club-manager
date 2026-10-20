import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePermissions } from './PermissionsContext';
import { isScoutBranch } from '../constants/roles';

export interface CursorClickEvent {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  xPercent: number;
  yPercent: number;
  rawX: number;
  rawY: number;
  targetTag?: string;
  targetText?: string;
  timestamp: number;
}

export interface RemoteCursor {
  userId: string;
  name: string;
  avatarUrl: string;
  role: string;
  jobTitle?: string;
  color: string;
  xPercent: number; // 0 - 100% de la largeur d'écran
  yPercent: number; // 0 - 100% de la hauteur d'écran
  rawX: number;
  rawY: number;
  route: string;
  sectionLabel: string;
  lastUpdated: number;
  isSameSection: boolean;
  screenWidth?: number;
  screenHeight?: number;
  device?: string;
  sessionStartedAt?: string;
  lastClick?: CursorClickEvent;
}

export interface LiveCursorsContextType {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  filterSameSectionOnly: boolean;
  setFilterSameSectionOnly: (filter: boolean) => void;
  selectedUserId: string | null;
  setSelectedUserId: (userId: string | null) => void;
  inspectorUser: RemoteCursor | null;
  setInspectorUser: (user: RemoteCursor | null) => void;
  remoteCursors: RemoteCursor[];
  allOnlineUsers: RemoteCursor[];
  onlineCount: number;
  userColor: string;
  currentSectionLabel: string;
  isSuperAdmin: boolean;
  recentClicks: CursorClickEvent[];
}

const PALETTE = [
  '#2563EB', // Bleu Royal
  '#059669', // Émeraude
  '#7C3AED', // Violet Profond
  '#DB2777', // Rose Magenta
  '#D97706', // Ambre Doré
  '#0891B2', // Cyan Océan
  '#4F46E5', // Indigo
  '#EA580C', // Orange Vif
  '#0D9488', // Sarcelle
  '#E11D48', // Rouge Rubis
];

function getStableColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

const PAGE_SECTION_LABELS: Record<string, string> = {
  '/': 'Tableau de Bord',
  '/dashboard': 'Tableau de Bord',
  '/tickets': 'Support & Tickets Fus-App',
  '/media': 'Espace de Gestion Média',
  '/matches': 'Calendrier des Matchs',
  '/matches/new': 'Planification de Match',
  '/matchday': 'Console Live Match',
  '/official-shortlist': 'Shortlist & Placement Tactique',
  '/club': 'Effectif FUS',
  '/players': 'Gestion de l\'Effectif',
  '/teams': 'Unités d\'Équipe',
  '/staff': 'Staff Technique',
  '/arbitres': 'Effectif Arbitres',
  '/trainings': 'Gestion des Entraînements',
  '/recruitment': 'Cellule Détection V1',
  '/recruitment-v2': 'Détection & Recrutement V2',
  '/plugins': 'Gestion des Plugins',
  '/leagues': 'Gestion des Compétitions',
  '/opponents': 'Clubs Adversaires',
  '/stadiums': 'Gestion des Stades',
  '/settings': 'Paramètres Club & Logo',
  '/blog': 'Gestion du Blog',
  '/store': 'Gestion du Store',
  '/users': 'Gestion des Utilisateurs',
  '/logs': 'Logs & Audit Sessions',
  '/profile': 'Profil Utilisateur',
};

function resolveSectionLabel(pathname: string): string {
  if (PAGE_SECTION_LABELS[pathname]) {
    return PAGE_SECTION_LABELS[pathname];
  }
  for (const [route, label] of Object.entries(PAGE_SECTION_LABELS)) {
    if (route !== '/' && pathname.startsWith(route)) {
      return label;
    }
  }
  return 'Dashboard Web';
}

export interface ModuleAccessItem {
  id: string;
  name: string;
  path: string;
  category: string;
  allowed: boolean;
}

export function getVisibleSectionsForRole(role?: string, jobTitle?: string | null): ModuleAccessItem[] {
  const normRole = (role || '').toLowerCase();
  const normJob = (jobTitle || '').toLowerCase();
  const isSuper = normRole === 'super_admin';
  const isScout = isScoutBranch(normRole, normJob);
  const isAnalyst = normJob.includes('analyst') || normRole.includes('analyst') || normJob.includes('vidéo') || normJob.includes('video') || normJob.includes('data');
  const isCoach = normRole === 'coach' || normJob.includes('coach') || normJob.includes('entr');
  const isAdminMetier = normRole === 'admin' || normRole === 'direction' || normRole === 'manager';

  return [
    { id: 'dashboard', name: 'Tableau de Bord', path: '/', category: 'Général', allowed: true },
    { id: 'matches', name: 'Calendrier des Matchs', path: '/matches', category: 'Compétition', allowed: isSuper || isCoach || isAnalyst || isAdminMetier || normRole === 'staff' },
    { id: 'matchday', name: 'Console Live Match', path: '/matchday', category: 'Compétition', allowed: isSuper || isCoach || isAnalyst },
    { id: 'shortlist', name: 'Shortlist Officielle (Tactique)', path: '/official-shortlist', category: 'Compétition', allowed: isSuper || isCoach || isScout || isAnalyst || isAdminMetier },
    { id: 'arbitres', name: 'Rubrique Arbitres', path: '/arbitres', category: 'Compétition', allowed: isSuper || isCoach || isAnalyst || isAdminMetier },
    { id: 'leagues', name: 'Gestion des Compétitions', path: '/leagues', category: 'Compétition', allowed: isSuper || isCoach || isAnalyst || isAdminMetier },
    { id: 'stadiums', name: 'Gestion des Stades', path: '/stadiums', category: 'Compétition', allowed: isSuper || isCoach || isAnalyst || isAdminMetier },
    { id: 'players', name: 'Gestion de l\'Effectif Joueurs', path: '/players', category: 'Sportif', allowed: isSuper || isCoach || isScout || isAnalyst || isAdminMetier },
    { id: 'teams', name: 'Unités d\'Équipe', path: '/teams', category: 'Sportif', allowed: isSuper || isCoach || isAnalyst || isAdminMetier },
    { id: 'staff', name: 'Staff Technique', path: '/staff', category: 'Sportif', allowed: isSuper || isAnalyst || isAdminMetier },
    { id: 'opponents', name: 'Clubs Adversaires', path: '/opponents', category: 'Sportif', allowed: isSuper || isCoach || isScout || isAnalyst || isAdminMetier },
    { id: 'trainings', name: 'Gestion des Entraînements', path: '/trainings', category: 'Sportif', allowed: isSuper || isCoach || (isAdminMetier && !isAnalyst && !isScout) },
    { id: 'recruitment_v2', name: 'Détection & Recrutement V2', path: '/recruitment-v2', category: 'Recrutement', allowed: isSuper || isScout || (isAdminMetier && !isAnalyst) },
    { id: 'media', name: 'Espace de Gestion Média', path: '/media', category: 'Médiathèque', allowed: true },
    { id: 'tickets', name: 'Support & Tickets Fus-App', path: '/tickets', category: 'Support', allowed: isSuper },
    { id: 'settings', name: 'Paramètres Club & Logo', path: '/settings', category: 'Administration', allowed: isSuper },
    { id: 'users', name: 'Gestion des Utilisateurs', path: '/users', category: 'Administration', allowed: isSuper },
    { id: 'logs', name: 'Logs & Audit Sessions', path: '/logs', category: 'Administration', allowed: isSuper },
    { id: 'plugins', name: 'Gestion des Plugins', path: '/plugins', category: 'Administration', allowed: isSuper },
  ];
}

const LiveCursorsContext = createContext<LiveCursorsContextType | undefined>(undefined);

export const LiveCursorsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authState } = usePermissions();
  const location = useLocation();

  // Préférences utilisateur persistées localement
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fus_live_cursors_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [filterSameSectionOnly, setFilterSameSectionOnlyState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fus_live_cursors_filter_same_section');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const setEnabled = useCallback((val: boolean) => {
    setEnabledState(val);
    try {
      localStorage.setItem('fus_live_cursors_enabled', String(val));
    } catch {}
  }, []);

  const setFilterSameSectionOnly = useCallback((val: boolean) => {
    setFilterSameSectionOnlyState(val);
    try {
      localStorage.setItem('fus_live_cursors_filter_same_section', String(val));
    } catch {}
  }, []);

  const [remoteCursorsMap, setRemoteCursorsMap] = useState<Map<string, RemoteCursor>>(new Map());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inspectorUser, setInspectorUser] = useState<RemoteCursor | null>(null);
  const [recentClicks, setRecentClicks] = useState<CursorClickEvent[]>([]);
  const sessionStartTimeRef = useRef<string>(new Date().toISOString());

  const currentRole = authState.user?.system_role?.toLowerCase() || (authState.roles?.[0]?.toLowerCase() ?? '');
  const isSuperAdmin = currentRole === 'super_admin' || authState.isRealSuperAdmin;

  const currentUserId = authState.user?.id || authState.user_id || 'anonymous';
  const currentUserName = authState.user?.full_name || authState.email?.split('@')[0] || 'Utilisateur';
  const currentUserRole = authState.user?.system_role || 'Staff';
  const currentUserAvatar = authState.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserName)}&background=1d4ed8&color=fff&size=100`;
  const userColor = useMemo(() => getStableColor(currentUserId), [currentUserId]);

  const currentSectionLabel = useMemo(() => resolveSectionLabel(location.pathname), [location.pathname]);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastBroadcastTimeRef = useRef<number>(0);
  const THROTTLE_MS = 40; // ~25 FPS max pour fluidité et économie réseau

  // Initialisation du canal Supabase Realtime Broadcast & Presence
  useEffect(() => {
    if (!currentUserId || currentUserId === 'anonymous') return;

    const channelName = 'dashboard:live-cursors';
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: currentUserId }
      }
    });

    // 1. Écoute de l'événement de position de curseur diffusé
    channel.on('broadcast', { event: 'cursor-pos' }, (event) => {
      if (!enabled) return;
      const payload = event.payload as {
        userId: string;
        name: string;
        avatarUrl: string;
        role: string;
        jobTitle?: string;
        color: string;
        xPercent: number;
        yPercent: number;
        rawX: number;
        rawY: number;
        route: string;
        sectionLabel: string;
        screenWidth?: number;
        screenHeight?: number;
        device?: string;
        sessionStartedAt?: string;
        timestamp: number;
      };

      if (!payload || payload.userId === currentUserId) return;

      setRemoteCursorsMap((prev) => {
        const existing = prev.get(payload.userId);
        const updatedCursor: RemoteCursor = {
          userId: payload.userId,
          name: payload.name || 'Collaborateur',
          avatarUrl: payload.avatarUrl || existing?.avatarUrl || '',
          role: payload.role || 'Staff',
          jobTitle: payload.jobTitle || existing?.jobTitle,
          color: payload.color || getStableColor(payload.userId),
          xPercent: payload.xPercent,
          yPercent: payload.yPercent,
          rawX: payload.rawX,
          rawY: payload.rawY,
          route: payload.route,
          sectionLabel: payload.sectionLabel || 'Dashboard',
          lastUpdated: Date.now(),
          isSameSection: payload.route === location.pathname,
          screenWidth: payload.screenWidth || 1920,
          screenHeight: payload.screenHeight || 1080,
          device: payload.device || existing?.device || 'Desktop',
          sessionStartedAt: payload.sessionStartedAt || existing?.sessionStartedAt,
          lastClick: existing?.lastClick,
        };

        const next = new Map(prev);
        next.set(payload.userId, updatedCursor);
        return next;
      });

      setInspectorUser((prev) => (prev && prev.userId === payload.userId ? { ...prev, ...payload, lastUpdated: Date.now() } : prev));
    });

    // 2. Écoute de l'événement de clic diffusé en temps réel
    channel.on('broadcast', { event: 'cursor-click' }, (event) => {
      if (!enabled) return;
      const click = event.payload as CursorClickEvent;
      if (!click || click.userId === currentUserId) return;

      // Ajouter à la pile des clics visuels
      setRecentClicks((prev) => [...prev.slice(-15), click]);

      // Mettre à jour l'utilisateur distant avec son dernier clic
      setRemoteCursorsMap((prev) => {
        const existing = prev.get(click.userId);
        if (!existing) return prev;
        const next = new Map(prev);
        next.set(click.userId, {
          ...existing,
          lastClick: click,
          lastUpdated: Date.now(),
        });
        return next;
      });

      setInspectorUser((prev) => (prev && prev.userId === click.userId ? { ...prev, lastClick: click } : prev));
    });

    // 3. Détection Immédiate de Connexion (Presence Sync)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setRemoteCursorsMap((prev) => {
        const next = new Map(prev);
        Object.values(state).forEach((presences) => {
          (presences as any[]).forEach((p) => {
            if (p.userId && p.userId !== currentUserId) {
              const existing = next.get(p.userId);
              if (!existing) {
                next.set(p.userId, {
                  userId: p.userId,
                  name: p.name || 'Collaborateur',
                  avatarUrl: p.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'U')}&background=1d4ed8&color=fff&size=100`,
                  role: p.role || 'Staff',
                  jobTitle: p.jobTitle,
                  color: getStableColor(p.userId),
                  xPercent: 50,
                  yPercent: 50,
                  rawX: 960,
                  rawY: 540,
                  route: p.route || '/',
                  sectionLabel: p.sectionLabel || 'Tableau de Bord',
                  lastUpdated: Date.now(),
                  isSameSection: p.route === location.pathname,
                  device: p.device || 'Desktop',
                  sessionStartedAt: p.onlineAt || new Date().toISOString(),
                });
              }
            }
          });
        });
        return next;
      });
    });

    // 4. Détection Immédiate quand un nouvel utilisateur rejoint (Presence Join)
    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      setRemoteCursorsMap((prev) => {
        const next = new Map(prev);
        (newPresences as any[]).forEach((p) => {
          if (p.userId && p.userId !== currentUserId) {
            next.set(p.userId, {
              userId: p.userId,
              name: p.name || 'Collaborateur',
              avatarUrl: p.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'U')}&background=1d4ed8&color=fff&size=100`,
              role: p.role || 'Staff',
              jobTitle: p.jobTitle,
              color: getStableColor(p.userId),
              xPercent: 50,
              yPercent: 50,
              rawX: 960,
              rawY: 540,
              route: p.route || '/',
              sectionLabel: p.sectionLabel || 'Tableau de Bord',
              lastUpdated: Date.now(),
              isSameSection: p.route === location.pathname,
              device: p.device || 'Desktop',
              sessionStartedAt: p.onlineAt || new Date().toISOString(),
            });
          }
        });
        return next;
      });
    });

    // 5. Gestion Presence Leave (quand un utilisateur quitte la page)
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      setRemoteCursorsMap((prev) => {
        const next = new Map(prev);
        leftPresences.forEach((p: { key?: string; userId?: string }) => {
          const id = p.key || p.userId;
          if (id) next.delete(id);
        });
        return next;
      });
    });

    // Souscription et déclaration de présence avec métadonnées de session
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const deviceName = navigator.userAgent.includes('Mac')
          ? 'Macintosh'
          : navigator.userAgent.includes('Windows')
          ? 'Windows'
          : navigator.userAgent.includes('iPhone')
          ? 'iOS iPhone'
          : navigator.userAgent.includes('Android')
          ? 'Android'
          : 'Desktop';

        await channel.track({
          userId: currentUserId,
          name: currentUserName,
          avatarUrl: currentUserAvatar,
          role: currentUserRole,
          jobTitle: authState.user?.job_title,
          route: location.pathname,
          sectionLabel: currentSectionLabel,
          device: deviceName,
          onlineAt: sessionStartTimeRef.current,
        });
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentUserId, currentUserName, currentUserAvatar, currentUserRole, authState.user?.job_title, location.pathname, currentSectionLabel, enabled]);

  // Nettoyage régulier des curseurs inactifs (CRITIQUE : l'utilisateur ciblé ne disparaît JAMAIS !)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursorsMap((prev) => {
        let hasExpired = false;
        const next = new Map(prev);
        next.forEach((cursor, id) => {
          // L'utilisateur ciblé par le Super Admin ne doit JAMAIS disparaître même si son curseur ne bouge pas
          if (id === selectedUserId) {
            return;
          }
          // Pour les autres utilisateurs, conserver tant qu'ils sont connectés (délai étendu à 45s)
          if (now - cursor.lastUpdated > 45000) {
            next.delete(id);
            hasExpired = true;
          }
        });
        return hasExpired ? next : prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedUserId]);

  // Capture mousemove avec throttling et envoi Realtime Broadcast
  useEffect(() => {
    if (!enabled || !currentUserId || currentUserId === 'anonymous') return;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastBroadcastTimeRef.current < THROTTLE_MS) return;
      lastBroadcastTimeRef.current = now;

      if (!channelRef.current) return;

      const windowWidth = window.innerWidth || 1920;
      const windowHeight = window.innerHeight || 1080;

      const xPercent = Math.min(100, Math.max(0, (e.clientX / windowWidth) * 100));
      const yPercent = Math.min(100, Math.max(0, (e.clientY / windowHeight) * 100));

      const deviceName = navigator.userAgent.includes('Mac')
        ? 'Macintosh'
        : navigator.userAgent.includes('Windows')
        ? 'Windows'
        : navigator.userAgent.includes('iPhone')
        ? 'iOS iPhone'
        : navigator.userAgent.includes('Android')
        ? 'Android'
        : 'Desktop';

      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor-pos',
        payload: {
          userId: currentUserId,
          name: currentUserName,
          avatarUrl: currentUserAvatar,
          role: currentUserRole,
          jobTitle: authState.user?.job_title,
          color: userColor,
          xPercent: Number(xPercent.toFixed(2)),
          yPercent: Number(yPercent.toFixed(2)),
          rawX: Math.round(e.clientX),
          rawY: Math.round(e.clientY),
          route: location.pathname,
          sectionLabel: currentSectionLabel,
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          device: deviceName,
          sessionStartedAt: sessionStartTimeRef.current,
          timestamp: now,
        },
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled, currentUserId, currentUserName, currentUserAvatar, currentUserRole, userColor, location.pathname, currentSectionLabel]);

  // Capture click avec diffusion Realtime
  useEffect(() => {
    if (!currentUserId || currentUserId === 'anonymous') return;

    const handleClick = (e: MouseEvent) => {
      if (!channelRef.current) return;

      const windowWidth = window.innerWidth || 1920;
      const windowHeight = window.innerHeight || 1080;

      const xPercent = Number(Math.min(100, Math.max(0, (e.clientX / windowWidth) * 100)).toFixed(2));
      const yPercent = Number(Math.min(100, Math.max(0, (e.clientY / windowHeight) * 100)).toFixed(2));

      const target = e.target as HTMLElement | null;
      const targetTag = target ? target.tagName.toLowerCase() : undefined;
      const rawText = target ? (target.innerText || target.getAttribute('aria-label') || target.getAttribute('title') || '').slice(0, 30).trim() : '';
      const targetText = rawText ? rawText.replace(/\s+/g, ' ') : undefined;

      const clickEvent: CursorClickEvent = {
        id: `${currentUserId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUserId,
        userName: currentUserName,
        userColor,
        xPercent,
        yPercent,
        rawX: Math.round(e.clientX),
        rawY: Math.round(e.clientY),
        targetTag,
        targetText,
        timestamp: Date.now(),
      };

      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor-click',
        payload: clickEvent,
      });
    };

    window.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('click', handleClick, true);
    };
  }, [currentUserId, currentUserName, userColor]);

  // Nettoyage régulier des clics récents (> 3 secondes)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRecentClicks((prev) => {
        const filtered = prev.filter((c) => now - c.timestamp < 3000);
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Liste de tous les collaborateurs en ligne (non filtrée par sélection pour alimenter le sélecteur)
  const allOnlineUsers = useMemo(() => {
    return Array.from(remoteCursorsMap.values()).map((c) => ({
      ...c,
      isSameSection: c.route === location.pathname,
    }));
  }, [remoteCursorsMap, location.pathname]);

  // Liste ordonnée des curseurs filtrés (Seul le Super Admin a l'affichage)
  const remoteCursors = useMemo(() => {
    // Si l'utilisateur n'est pas Super Admin ou que la fonctionnalité est coupée, aucun curseur distant n'est rendu
    if (!isSuperAdmin || !enabled) {
      return [];
    }

    let cursors = Array.from(remoteCursorsMap.values()).map((c) => ({
      ...c,
      isSameSection: c.route === location.pathname,
    }));

    // Filtre utilisateur ciblé si sélectionné
    if (selectedUserId) {
      cursors = cursors.filter((c) => c.userId === selectedUserId);
    } else if (filterSameSectionOnly) {
      cursors = cursors.filter((c) => c.isSameSection);
    }

    return cursors;
  }, [isSuperAdmin, enabled, remoteCursorsMap, selectedUserId, filterSameSectionOnly, location.pathname]);

  const onlineCount = useMemo(() => remoteCursorsMap.size + 1, [remoteCursorsMap]);

  const value = {
    enabled,
    setEnabled,
    filterSameSectionOnly,
    setFilterSameSectionOnly,
    selectedUserId,
    setSelectedUserId,
    inspectorUser,
    setInspectorUser,
    remoteCursors,
    allOnlineUsers,
    onlineCount,
    userColor,
    currentSectionLabel,
    isSuperAdmin,
    recentClicks,
  };

  return <LiveCursorsContext.Provider value={value}>{children}</LiveCursorsContext.Provider>;
};

export const useLiveCursors = (): LiveCursorsContextType => {
  const context = useContext(LiveCursorsContext);
  if (!context) {
    throw new Error('useLiveCursors must be used within a LiveCursorsProvider');
  }
  return context;
};
