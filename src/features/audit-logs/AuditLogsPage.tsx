import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Clock, 
  Laptop, 
  Smartphone,
  Activity, 
  RefreshCw, 
  Sparkles, 
  Download, 
  Eye, 
  LayoutGrid,
  List,
  Briefcase,
  Layers,
  Users,
  SmartphoneNfc,
  Printer,
  History,
  FileText,
  Calendar,
  X,
  FileJson,
  RotateCcw
} from 'lucide-react';
import { useAuditLogs, isMobilePlatform, isGuestEntry } from '../../hooks/useAuditLogs';
import { SessionTimelineModal } from './components/SessionTimelineModal';
import { UserAuditDetailModal } from './components/UserAuditDetailModal';
import type { UserSummaryItem, UserLatestAction } from './components/UserAuditDetailModal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { OFFICIAL_JOB_TITLES } from '../../constants/roles';
import { 
  PresenceTracker, 
  resolvePresenceStatus, 
  resolveUserPresenceDetails, 
  PRESENCE_META 
} from '../../services/presenceService';
import type { PresenceEntry, PresenceStatus } from '../../services/presenceService';

/** Convertit le statut de la carte en statut de présence (vert / orange / gris) */
const toPresence = (status?: string): PresenceStatus =>
  status === 'ACTIVE' ? 'ONLINE' : status === 'IDLE' ? 'IDLE' : 'OFFLINE';

/** Formate une date en temps relatif convivial */
const formatRelativeTime = (dateStr: string): string => {
  try {
    const timestamp = new Date(dateStr).getTime();
    if (isNaN(timestamp)) return '';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return "à l'instant";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `il y a ${diffHours} h`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  } catch (_) {
    return '';
  }
};

interface UserSessionAvatarProps {
  name?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  status?: string;
  size?: 'sm' | 'md' | 'lg';
}

const UserSessionAvatar: React.FC<UserSessionAvatarProps> = ({ 
  name, 
  email, 
  photoUrl, 
  status, 
  size = 'md' 
}) => {
  const [imgError, setImgError] = useState(false);

  const displayName = name || email || 'Utilisateur';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('') || displayName.slice(0, 2).toUpperCase();

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-14 h-14 text-sm',
    lg: 'w-16 h-16 text-base'
  }[size];

  const dotClasses = {
    sm: 'w-3 h-3 right-0 bottom-0 border-2',
    md: 'w-3.5 h-3.5 right-0.5 bottom-0.5 border-2',
    lg: 'w-4 h-4 right-0.5 bottom-0.5 border-2'
  }[size];

  return (
    <div className="relative inline-block shrink-0">
      {photoUrl && !imgError ? (
        <img
          src={photoUrl}
          alt={displayName}
          onError={() => setImgError(true)}
          className={`${sizeClasses} rounded-2xl object-cover border-2 border-border/80 shadow-md bg-secondary/30`}
        />
      ) : (
        <div
          className={`${sizeClasses} rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 text-primary-foreground font-black flex items-center justify-center border-2 border-primary/20 shadow-md`}
        >
          {initials}
        </div>
      )}

      {/* Live status badge : vert = connecté, orange = inactif, gris = déconnecté */}
      {(() => {
        const meta = PRESENCE_META[toPresence(status)];
        return (
          <span
            className={`absolute rounded-full border-card ${dotClasses} ${meta.dot}`}
            title={meta.title}
          >
            {meta.ping && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${meta.ping} opacity-75`} />
            )}
          </span>
        );
      })()}
    </div>
  );
};

export const AuditLogsPage: React.FC = () => {
  const {
    sessions,
    allSessions,
    logs,
    loading,
    filters,
    setFilters,
    selectedSessionId,
    setSelectedSessionId,
    selectedSessionEvents,
    selectedSessionDetails,
    refresh
  } = useAuditLogs();

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [groupByPoste, setGroupByPoste] = useState<boolean>(false);
  const [selectedUserForModal, setSelectedUserForModal] = useState<UserSummaryItem | null>(null);

  // Onglet principal : 'supervision' (Cartes / Sessions) ou 'history' (Journal complet des logs)
  const [mainTab, setMainTab] = useState<'supervision' | 'history'>('supervision');

  // Filtres spécifiques pour l'Historique des Logs
  const [logSearchTerm, setLogSearchTerm] = useState<string>('');
  const [logJobTitleFilter, setLogJobTitleFilter] = useState<string>('ALL');
  const [logActionFilter, setLogActionFilter] = useState<string>('ALL');
  const [logModuleFilter, setLogModuleFilter] = useState<string>('ALL');
  const [logStartDateTime, setLogStartDateTime] = useState<string>('');
  const [logEndDateTime, setLogEndDateTime] = useState<string>('');
  const [selectedLogForJson, setSelectedLogForJson] = useState<AuditLog | null>(null);

  // Présence temps réel (Supabase Realtime Presence)
  const [presenceSnapshot, setPresenceSnapshot] = useState<Map<string, PresenceEntry>>(new Map());
  useEffect(() => PresenceTracker.subscribe(snap => setPresenceSnapshot(new Map(snap))), []);

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'UPDATE':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'DELETE':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
      case 'LOGIN':
      case 'LOGOUT':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'EXPORT':
      case 'IMPORT':
      case 'DOWNLOAD':
      case 'UPLOAD':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'PASSWORD_CHANGE':
      case 'PERMISSION_CHANGE':
      case 'ROLE_CHANGE':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  const getJobBadgeClass = (title?: string | null) => {
    const t = (title || '').toLowerCase();
    if (t.includes('directeur') || t.includes('technique')) {
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
    }
    if (t.includes('scout') || t.includes('recrutement')) {
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
    }
    if (t.includes('analyste') || t.includes('vidéo') || t.includes('video')) {
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
    }
    if (t.includes('entraîneur') || t.includes('coach')) {
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    }
    if (t.includes('préparateur') || t.includes('physique')) {
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }
    if (t.includes('médical') || t.includes('médecin') || t.includes('kiné')) {
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
    }
    if (t.includes('admin')) {
      return 'bg-primary/10 text-primary border-primary/30';
    }
    return 'bg-secondary text-muted-foreground border-border';
  };

  // 1. REGROUPEMENT PAR UTILISATEUR UNIQUE AVEC IDENTIFICATION MULTI-PLATEFORME & DERNIÈRE ACTION TEMPS RÉEL
  const allUserSummaries = useMemo<UserSummaryItem[]>(() => {
    const userMap = new Map<string, UserSummaryItem>();

    allSessions.forEach(s => {
      if (isGuestEntry(s.user_email, s.session_id)) return;

      const key = s.user_id || (s.user_email ? s.user_email.toLowerCase().trim() : s.session_id);
      const isPlaceholder = s.session_id?.startsWith('NO_SESSION-');

      if (!userMap.has(key)) {
        userMap.set(key, {
          userId: s.user_id,
          userEmail: s.user_email,
          userName: s.user_name || (s.user_email ? s.user_email.split('@')[0] : 'Utilisateur'),
          userAvatar: s.user_avatar || null,
          jobTitle: s.job_title || 'Collaborateur',
          status: 'LOGGED_OUT',
          activePlatform: 'none',
          lastPlatform: 'web',
          latestAction: null,
          lastActivity: isPlaceholder ? '' : (s.last_activity_at || s.login_at),
          totalSessions: 0,
          totalEvents: 0,
          sessions: [],
          logs: []
        });
      }

      const item = userMap.get(key)!;
      if (!isPlaceholder) {
        item.sessions.push(s);
        item.totalSessions += 1;
        item.totalEvents += (s.event_count || 0);

        // Conserver la date d'activité la plus récente
        const sessionLast = s.last_activity_at || s.login_at;
        if (!item.lastActivity || new Date(sessionLast).getTime() > new Date(item.lastActivity).getTime()) {
          item.lastActivity = sessionLast;
        }
      }

      if (s.user_avatar && !item.userAvatar) {
        item.userAvatar = s.user_avatar;
      }
      if (s.job_title && (!item.jobTitle || item.jobTitle === 'Collaborateur')) {
        item.jobTitle = s.job_title;
      }
    });

    // 1b. Inclure dynamiquement TOUT collaborateur connecté en direct via Supabase Realtime Presence
    // Même s'il n'a pas encore de session archivée dans user_sessions ou est en session privée
    presenceSnapshot.forEach((presEntry, presKey) => {
      if (!presEntry || (!presEntry.user_id && !presEntry.email)) return;
      if (isGuestEntry(presEntry.email, null)) return;

      const userKey = presEntry.user_id || (presEntry.email ? presEntry.email.toLowerCase().trim() : presKey);
      const emailLower = presEntry.email ? presEntry.email.toLowerCase().trim() : null;

      // Vérifier si l'utilisateur est déjà présent par ID ou par email
      const alreadyExists = Array.from(userMap.values()).some(item => 
        (presEntry.user_id && item.userId === presEntry.user_id) ||
        (emailLower && item.userEmail && item.userEmail.toLowerCase().trim() === emailLower)
      );

      if (!alreadyExists && userKey) {
        // Résolution du nom formaté
        const rawName = presEntry.email ? presEntry.email.split('@')[0].replace(/[._]/g, ' ') : 'Collaborateur';
        const formattedName = rawName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        // Détection du poste probable
        let detectedJob = 'Collaborateur';
        const lowerEmail = presEntry.email ? presEntry.email.toLowerCase() : '';
        if (lowerEmail.includes('admin') || lowerEmail.includes('badr')) detectedJob = 'Admin Club';
        else if (lowerEmail.includes('scout')) detectedJob = 'Scout';

        userMap.set(userKey, {
          userId: presEntry.user_id,
          userEmail: presEntry.email,
          userName: formattedName,
          userAvatar: null,
          jobTitle: detectedJob,
          status: presEntry.state === 'idle' ? 'IDLE' : 'ACTIVE',
          activePlatform: presEntry.platform || 'web',
          lastPlatform: presEntry.platform || 'web',
          latestAction: {
            action: 'LOGIN',
            module: 'AUTH',
            description: `Session active en temps réel (${presEntry.platform === 'mobile' ? 'Fus-App Mobile' : 'Web Dashboard'})`,
            timestamp: presEntry.online_at || new Date().toISOString(),
            platform: presEntry.platform || 'web'
          },
          lastActivity: presEntry.online_at || new Date().toISOString(),
          totalSessions: 1,
          totalEvents: 1,
          sessions: [],
          logs: []
        });
      }
    });

    // Associer les logs d'audit à chaque utilisateur
    logs.forEach(l => {
      if (isGuestEntry(l.user_email, l.session_id)) return;

      const key = l.user_id || (l.user_email ? l.user_email.toLowerCase().trim() : null);
      if (key && userMap.has(key)) {
        userMap.get(key)!.logs.push(l);
      }
    });

    // Trier les sessions et logs de chaque utilisateur par date décroissante
    userMap.forEach(u => {
      u.sessions.sort((a, b) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime());
      u.logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Résolution de la dernière action en temps réel
      if (u.logs.length > 0) {
        const topLog = u.logs[0];
        const isMobAction = isMobilePlatform(topLog.session_id, null, topLog.user_agent, topLog.module);
        u.latestAction = {
          action: topLog.action,
          module: topLog.module,
          description: topLog.description,
          timestamp: topLog.created_at,
          platform: isMobAction ? 'mobile' : 'web'
        };
      }

      // Résolution de la dernière plateforme connue
      if (u.sessions.length > 0) {
        const topSession = u.sessions[0];
        u.lastPlatform = isMobilePlatform(topSession.session_id, topSession.device, topSession.user_agent, null) ? 'mobile' : 'web';
      }

      // Résolution de la présence en direct et de la plateforme active (Web vs Mobile)
      let presenceDetails = resolveUserPresenceDetails(presenceSnapshot, u.userId, u.userEmail);
      if (presenceDetails.status === 'OFFLINE' && u.sessions.length > 0) {
        for (const s of u.sessions) {
          const detail = resolveUserPresenceDetails(presenceSnapshot, s.user_id, s.user_email);
          if (detail.status !== 'OFFLINE') {
            presenceDetails = detail;
            break;
          }
        }
      }

      const isPresenceOnline = presenceDetails.status === 'ONLINE';
      const isPresenceIdle = presenceDetails.status === 'IDLE';

      // Détecter aussi les sessions au statut 'ACTIVE'
      const activeSessions = u.sessions.filter(s => s.status === 'ACTIVE');
      const hasActiveWeb = activeSessions.some(s => !isMobilePlatform(s.session_id, s.device, s.user_agent, null));
      const hasActiveMobile = activeSessions.some(s => isMobilePlatform(s.session_id, s.device, s.user_agent, null));

      // L'utilisateur est connecté s'il est en présence (ONLINE ou IDLE) ou s'il a une session active
      if (isPresenceOnline || isPresenceIdle || activeSessions.length > 0) {
        u.status = (isPresenceIdle && activeSessions.length === 0) ? 'IDLE' : 'ACTIVE';
        if ((presenceDetails.platform === 'both') || (hasActiveWeb && hasActiveMobile)) {
          u.activePlatform = 'both';
        } else if (presenceDetails.platform === 'mobile' || hasActiveMobile) {
          u.activePlatform = 'mobile';
        } else {
          u.activePlatform = 'web';
        }
      } else {
        u.status = 'LOGGED_OUT';
        u.activePlatform = 'none';
      }
    });

    const rank = (s: UserSummaryItem['status']) => (s === 'ACTIVE' ? 0 : s === 'IDLE' ? 1 : 2);
    return Array.from(userMap.values()).sort((a, b) => {
      // Prioriser : en ligne > inactif > déconnecté, puis date de dernière activité
      const diff = rank(a.status) - rank(b.status);
      if (diff !== 0) return diff;
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });
  }, [allSessions, logs, presenceSnapshot]);

  // Liste dynamique des postes distincts détectés depuis le profil des utilisateurs
  const distinctJobTitles = useMemo(() => {
    const titles = new Set<string>();
    allUserSummaries.forEach(u => {
      if (u.jobTitle && u.jobTitle.trim()) {
        titles.add(u.jobTitle.trim());
      }
    });
    return Array.from(titles).sort();
  }, [allUserSummaries]);

  // Dictionnaire utilisateur par userId et par email pour enrichir chaque log
  const userLookup = useMemo(() => {
    const map = new Map<string, UserSummaryItem>();
    allUserSummaries.forEach(u => {
      if (u.userId) map.set(u.userId, u);
      if (u.userEmail) map.set(u.userEmail.toLowerCase().trim(), u);
    });
    return map;
  }, [allUserSummaries]);

  // Actions distinctes disponibles dans les logs
  const distinctActions = useMemo(() => {
    const actions = new Set<string>();
    ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT', 'PASSWORD_CHANGE', 'PERMISSION_CHANGE', 'ROLE_CHANGE', 'SETTINGS_UPDATE'].forEach(a => actions.add(a));
    logs.forEach(l => {
      if (l.action) actions.add(l.action);
    });
    return Array.from(actions).sort();
  }, [logs]);

  // Modules distincts disponibles
  const distinctModules = useMemo(() => {
    const modules = new Set<string>();
    ['AUTH', 'USERS', 'RECRUTEMENT', 'MATCHS', 'PLAYERS', 'STAFF', 'ARBITRES', 'CLUB', 'BACKUPS', 'SYSTEM'].forEach(m => modules.add(m));
    logs.forEach(l => {
      if (l.module) modules.add(l.module);
    });
    return Array.from(modules).sort();
  }, [logs]);

  // Filtrage ultra-précis de l'Historique des Logs
  const filteredAuditLogs = useMemo(() => {
    return logs.filter(log => {
      if (isGuestEntry(log.user_email, log.session_id)) return false;

      const user = (log.user_id && userLookup.get(log.user_id)) ||
                   (log.user_email && userLookup.get(log.user_email.toLowerCase().trim()));
      const name = user?.userName || log.user_email?.split('@')[0] || '';
      const email = log.user_email || '';
      const job = user?.jobTitle || 'Collaborateur';

      // 1. Filtre Nom d'utilisateur / recherche textuelle
      if (logSearchTerm.trim()) {
        const q = logSearchTerm.toLowerCase().trim();
        const matchName = name.toLowerCase().includes(q);
        const matchEmail = email.toLowerCase().includes(q);
        const matchDesc = (log.description || '').toLowerCase().includes(q);
        const matchEntity = (log.entity_type || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchDesc && !matchEntity) return false;
      }

      // 2. Filtre Poste de l'utilisateur
      if (logJobTitleFilter !== 'ALL') {
        const target = logJobTitleFilter.toLowerCase();
        if (!job.toLowerCase().includes(target)) return false;
      }

      // 3. Filtre Action effectuée
      if (logActionFilter !== 'ALL' && log.action !== logActionFilter) {
        return false;
      }

      // 4. Filtre Module
      if (logModuleFilter !== 'ALL' && log.module !== logModuleFilter) {
        return false;
      }

      // 5. Filtre Intervalle Date et Heure
      if (logStartDateTime) {
        const startTime = new Date(logStartDateTime).getTime();
        const logTime = new Date(log.created_at).getTime();
        if (logTime < startTime) return false;
      }
      if (logEndDateTime) {
        const endTime = new Date(logEndDateTime).getTime();
        const logTime = new Date(log.created_at).getTime();
        if (logTime > endTime) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [logs, userLookup, logSearchTerm, logJobTitleFilter, logActionFilter, logModuleFilter, logStartDateTime, logEndDateTime]);

  // Statistiques calculées pour l'Historique
  const logStats = useMemo(() => {
    return {
      total: filteredAuditLogs.length,
      creates: filteredAuditLogs.filter(l => l.action === 'CREATE').length,
      updates: filteredAuditLogs.filter(l => l.action === 'UPDATE').length,
      deletes: filteredAuditLogs.filter(l => l.action === 'DELETE').length,
      auths: filteredAuditLogs.filter(l => l.action === 'LOGIN' || l.action === 'LOGOUT').length,
    };
  }, [filteredAuditLogs]);

  // Filtrage des utilisateurs (Recherche + Poste + Statut + Plateforme + Période)
  const filteredUsers = useMemo(() => {
    return allUserSummaries.filter(u => {
      const matchSearch = filters.searchTerm === '' ||
        u.userName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        (u.userEmail && u.userEmail.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        u.jobTitle.toLowerCase().includes(filters.searchTerm.toLowerCase());

      const matchJobTitle = filters.jobTitle === 'ALL' ||
        u.jobTitle.trim().toLowerCase() === filters.jobTitle.trim().toLowerCase() ||
        u.jobTitle.toLowerCase().includes(filters.jobTitle.toLowerCase());

      const matchStatus = filters.status === 'ALL' ||
        (filters.status === 'ACTIVE' && (u.status === 'ACTIVE' || u.status === 'IDLE')) ||
        u.status === filters.status;

      // Filtrage par Plateforme : Dashboard Web vs Mobile Fus-App
      const matchPlatform = filters.platform === 'ALL' ||
        (filters.platform === 'MOBILE' && (u.activePlatform === 'mobile' || u.activePlatform === 'both' || (u.status !== 'ACTIVE' && u.lastPlatform === 'mobile'))) ||
        (filters.platform === 'WEB' && (u.activePlatform === 'web' || u.activePlatform === 'both' || (u.status !== 'ACTIVE' && u.lastPlatform === 'web')));

      const matchStart = !filters.startDate || new Date(u.lastActivity) >= new Date(filters.startDate);
      const matchEnd = !filters.endDate || new Date(u.lastActivity) <= new Date(filters.endDate + 'T23:59:59');

      return matchSearch && matchJobTitle && matchStatus && matchPlatform && matchStart && matchEnd;
    });
  }, [allUserSummaries, filters]);

  // Groupement des utilisateurs par poste
  const groupedUsersByPoste = useMemo(() => {
    const map = new Map<string, UserSummaryItem[]>();
    filteredUsers.forEach(u => {
      const key = u.jobTitle || 'Collaborateur';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(u);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredUsers]);

  // Statistiques clés calculées en direct
  const stats = useMemo(() => {
    // Les utilisateurs connectés regroupent les actifs et inactifs récents
    const connectedList = allUserSummaries.filter(u => u.status === 'ACTIVE' || u.status === 'IDLE');
    const totalUsers = allUserSummaries.length;
    const totalSessionsCount = allSessions.filter(s => !isGuestEntry(s.user_email, s.session_id)).length;
    const uniqueRoles = distinctJobTitles.length;

    const webCount = connectedList.filter(u => u.activePlatform === 'web' || u.activePlatform === 'both').length;
    const mobileCount = connectedList.filter(u => u.activePlatform === 'mobile' || u.activePlatform === 'both').length;

    return {
      totalUsers,
      activeUsers: connectedList.length,
      webActiveUsers: webCount,
      mobileActiveUsers: mobileCount,
      totalSessions: totalSessionsCount,
      uniqueRoles
    };
  }, [allUserSummaries, allSessions, distinctJobTitles]);

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allUserSummaries, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Supervision_Utilisateurs_FUS_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportLogsCSV = () => {
    const headers = ['Date_Heure_GMT', 'Utilisateur', 'Email', 'Poste', 'Action', 'Module', 'Description', 'IP', 'Statut'];
    const rows = filteredAuditLogs.map(l => {
      const user = (l.user_id && userLookup.get(l.user_id)) || (l.user_email && userLookup.get(l.user_email.toLowerCase().trim()));
      return [
        `"${new Date(l.created_at).toISOString()}"`,
        `"${(user?.userName || l.user_email?.split('@')[0] || '').replace(/"/g, '""')}"`,
        `"${(l.user_email || '').replace(/"/g, '""')}"`,
        `"${(user?.jobTitle || 'Collaborateur').replace(/"/g, '""')}"`,
        `"${l.action}"`,
        `"${l.module}"`,
        `"${(l.description || '').replace(/"/g, '""')}"`,
        `"${l.ip_address || ''}"`,
        `"${l.status}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FUS_Journal_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleResetLogFilters = () => {
    setLogSearchTerm('');
    setLogJobTitleFilter('ALL');
    setLogActionFilter('ALL');
    setLogModuleFilter('ALL');
    setLogStartDateTime('');
    setLogEndDateTime('');
  };

  return (
    <div className="space-y-8 pb-20 overflow-visible">
      {/* ── EN-TÊTE IMPRESSION OFFICIELLE (VISIBLE UNIQUEMENT À L'IMPRESSION) ── */}
      <div className="hidden print:block mb-8 pb-4 border-b-2 border-black text-black">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-black uppercase tracking-tight text-red-600">FUS RABAT — JOURNAL OFFICIEL D'AUDIT</div>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">
              Traçabilité intégrale des opérations, connexions et modifications des utilisateurs
            </p>
          </div>
          <div className="text-right text-xs space-y-0.5">
            <div>Édité le : <strong>{new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')} (GMT)</strong></div>
            <div>Période : <strong>{logStartDateTime ? new Date(logStartDateTime).toLocaleString('fr-FR') : 'Début'} ➔ {logEndDateTime ? new Date(logEndDateTime).toLocaleString('fr-FR') : 'Actuel'}</strong></div>
            <div>Total événements : <strong>{filteredAuditLogs.length} logs</strong></div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-600 border-t border-gray-200 pt-2">
          <span>Filtre Utilisateur : <strong>{logSearchTerm || 'Tous'}</strong></span>
          <span>•</span>
          <span>Filtre Poste : <strong>{logJobTitleFilter}</strong></span>
          <span>•</span>
          <span>Filtre Action : <strong>{logActionFilter}</strong></span>
          <span>•</span>
          <span>Filtre Module : <strong>{logModuleFilter}</strong></span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground uppercase italic flex items-center gap-2">
            Supervision & Audit <Sparkles className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-muted-foreground text-sm font-medium">
            Traçabilité unifiée : surveillance multi-plateforme en temps réel et journal d'audit complet de toutes les actions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => refresh()}
            variant="outline"
            size="icon"
            className="w-11 h-11 rounded-xl shrink-0"
            title="Rafraîchir les données"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </Button>

          {mainTab === 'supervision' ? (
            <Button
              onClick={handleExportJSON}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-5 rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary/20 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Exporter JSON
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportLogsCSV}
                variant="outline"
                className="gap-2 h-11 px-4 rounded-xl font-bold uppercase tracking-wider text-xs cursor-pointer"
              >
                <Download className="w-4 h-4" /> Exporter CSV
              </Button>

              <Button
                onClick={() => window.print()}
                className="gap-2 bg-red-600 text-white hover:bg-red-700 h-11 px-5 rounded-xl font-black uppercase tracking-wider text-xs shadow-lg shadow-red-600/20 cursor-pointer active:scale-95 transition"
              >
                <Printer className="w-4 h-4" /> Imprimer l'historique
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Onglets Principaux : Supervision Collaborateurs vs Historique des Logs */}
      <div className="flex items-center gap-2 p-1.5 bg-secondary/40 rounded-2xl border border-border w-fit print:hidden">
        <button
          onClick={() => setMainTab('supervision')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            mainTab === 'supervision'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Supervision Collaborateurs</span>
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-black/20 font-black">
            {stats.totalUsers}
          </span>
        </button>

        <button
          onClick={() => setMainTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            mainTab === 'history'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historique des Logs & Actions</span>
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-black/20 font-black">
            {filteredAuditLogs.length}
          </span>
        </button>
      </div>

      {mainTab === 'supervision' ? (
        /* ========================================================================= */
        /* ONGLET 1 : SUPERVISION MULTI-PLATEFORME (COLLABORATEURS & SESSIONS)       */
        /* ========================================================================= */
        <>
          {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Collaborateurs</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-foreground mt-2">{stats.totalUsers}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Comptes identifiés</div>
        </div>

        {/* Live Active Connections with Web/Mobile breakdown */}
        <div className="bg-card border border-emerald-500/20 bg-emerald-500/[0.02] rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Actuellement en ligne</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.activeUsers}
          </div>
          <div className="text-[11px] font-bold text-muted-foreground mt-0.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-foreground">
              <Laptop className="w-3 h-3 text-primary" /> {stats.webActiveUsers} Web
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">
              <Smartphone className="w-3 h-3" /> {stats.mobileActiveUsers} Mobile
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sessions Tracées</span>
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground mt-2">{stats.totalSessions}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Historique des connexions</div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Postes Métier</span>
            <Briefcase className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-foreground mt-2">{stats.uniqueRoles}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Fonctions actives</div>
        </div>
      </div>

      {/* Control Bar : Mode Toggle + Search + Platform Filter + Status + Dates */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            placeholder="Rechercher par collaborateur, email, intitulé de poste..."
            className="pl-10 h-11 bg-secondary/30 border-transparent focus:bg-background transition-all rounded-xl font-medium text-sm"
          />
        </div>

        {/* Dropdown Filters & Controls */}
        <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto">
          {/* Filter by Platform (Web Dashboard vs Mobile Fus-App) */}
          <div className="flex items-center gap-1.5 bg-secondary/40 rounded-xl px-2.5 py-1 border border-border/50">
            <SmartphoneNfc className="w-3.5 h-3.5 text-primary shrink-0" />
            <select
              value={filters.platform}
              onChange={(e) => setFilters({ ...filters, platform: e.target.value as any })}
              className="h-8 bg-transparent text-foreground text-xs font-bold uppercase tracking-wider border-none outline-none cursor-pointer pr-2"
            >
              <option value="ALL">PLATEFORME: TOUTES</option>
              <option value="WEB">💻 WEB DASHBOARD</option>
              <option value="MOBILE">📱 FUS-APP MOBILE</option>
            </select>
          </div>

          {/* Filter by Poste (job_title) */}
          <div className="flex items-center gap-1.5 bg-secondary/40 rounded-xl px-2.5 py-1 border border-border/50">
            <Briefcase className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              value={filters.jobTitle}
              onChange={(e) => setFilters({ ...filters, jobTitle: e.target.value })}
              className="h-8 bg-transparent text-foreground text-xs font-bold uppercase tracking-wider border-none outline-none cursor-pointer pr-2"
            >
              <option value="ALL">POSTE : TOUS</option>
              {OFFICIAL_JOB_TITLES.map(title => (
                <option key={title} value={title}>{title.toUpperCase()}</option>
              ))}
              {distinctJobTitles
                .filter(title => !OFFICIAL_JOB_TITLES.some(o => o.toLowerCase() === title.toLowerCase()))
                .map(title => (
                  <option key={title} value={title}>{title.toUpperCase()} (AUTRE)</option>
                ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div className="flex items-center gap-1.5 bg-secondary/40 rounded-xl px-2.5 py-1 border border-border/50">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="h-8 bg-transparent text-foreground text-xs font-bold uppercase tracking-wider border-none outline-none cursor-pointer pr-2"
            >
              <option value="ALL">STATUT: TOUS</option>
              <option value="ACTIVE">EN LIGNE (ACTIF)</option>
              <option value="IDLE">INACTIF</option>
              <option value="LOGGED_OUT">DÉCONNECTÉ</option>
            </select>
          </div>

          {/* Date Picker Start */}
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="h-10 px-2.5 bg-secondary/40 text-foreground text-xs font-bold rounded-xl border border-border/50 outline-none cursor-pointer"
            title="Actif depuis le"
          />

          {/* Date Picker End */}
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="h-10 px-2.5 bg-secondary/40 text-foreground text-xs font-bold rounded-xl border border-border/50 outline-none cursor-pointer"
            title="Actif jusqu'au"
          />

          {/* Group by Poste Toggle */}
          <button
            onClick={() => setGroupByPoste(!groupByPoste)}
            className={`flex items-center gap-1.5 px-3 h-10 rounded-xl text-xs font-bold transition-all border ${
              groupByPoste
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-secondary/40 text-muted-foreground border-border/50 hover:text-foreground'
            }`}
            title="Regrouper les collaborateurs par intitulé de poste"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Groupé</span>
          </button>

          {/* View Mode Toggle: Grid vs Table */}
          <div className="flex items-center p-1 bg-secondary/50 rounded-xl border border-border/80">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Affichage en Grille (1 Carte par Utilisateur)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Affichage en Tableau"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <RefreshCw className="w-9 h-9 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm font-semibold tracking-wide">Chargement des données de supervision en direct...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-16 text-center bg-card border border-border rounded-3xl space-y-3">
          <Users className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-lg font-bold text-foreground">Aucun collaborateur trouvé</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Aucun utilisateur ne correspond aux filtres sélectionnés. Essayez de réinitialiser vos critères de recherche.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ================= VUE 1 : GRILLE 1 CARTE PAR UTILISATEUR ================= */
        groupByPoste ? (
          /* Grille groupée par poste */
          <div className="space-y-8">
            {groupedUsersByPoste.map(([posteName, usersList]) => (
              <div key={posteName} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-border/60 pb-2">
                  <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${getJobBadgeClass(posteName)}`}>
                    {posteName}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    ({usersList.length} {usersList.length > 1 ? 'collaborateurs' : 'collaborateur'})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {usersList.map((user) => (
                    <UserCard
                      key={user.userId || user.userEmail || user.userName}
                      user={user}
                      getJobBadgeClass={getJobBadgeClass}
                      onSelectUser={setSelectedUserForModal}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Grille uniforme (1 carte par utilisateur) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredUsers.map((user) => (
              <UserCard
                key={user.userId || user.userEmail || user.userName}
                user={user}
                getJobBadgeClass={getJobBadgeClass}
                onSelectUser={setSelectedUserForModal}
              />
            ))}
          </div>
        )
      ) : (
        /* ================= VUE 2 : TABLEAU DES COLLABORATEURS ================= */
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/20 border-b border-border">
                <tr>
                  <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Collaborateur</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Poste / Fonction</th>
                  <th className="text-center py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Plateforme</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dernière Action en Direct</th>
                  <th className="text-center py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sessions</th>
                  <th className="text-center py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actions</th>
                  <th className="text-center py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Statut</th>
                  <th className="text-right py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.userId || user.userEmail} className="hover:bg-secondary/15 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <UserSessionAvatar
                          name={user.userName}
                          email={user.userEmail}
                          photoUrl={user.userAvatar}
                          status={user.status}
                          size="sm"
                        />
                        <div>
                          <div className="font-bold text-sm text-foreground">{user.userName}</div>
                          <div className="text-[11px] text-muted-foreground font-medium">{user.userEmail || 'Email non renseigné'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getJobBadgeClass(user.jobTitle)}`}>
                        {user.jobTitle}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-center">
                      {user.status === 'ACTIVE' ? (
                        user.activePlatform === 'both' ? (
                          <span className="px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-extrabold text-[11px] border border-cyan-500/30 inline-flex items-center gap-1">
                            💻+📱 Web & Mobile
                          </span>
                        ) : user.activePlatform === 'mobile' ? (
                          <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold text-[11px] border border-purple-500/30 inline-flex items-center gap-1">
                            📱 Fus-App Mobile
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-[11px] border border-blue-500/30 inline-flex items-center gap-1">
                            💻 Web Dashboard
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-semibold inline-flex items-center gap-1">
                          {user.lastPlatform === 'mobile' ? '📱 Mobile' : '💻 Web'}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-xs text-muted-foreground max-w-xs">
                      {user.latestAction ? (
                        <div className="truncate">
                          <span className="font-black text-primary">[{user.latestAction.module}]</span> {user.latestAction.description}
                          <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                            {formatRelativeTime(user.latestAction.timestamp)}
                          </div>
                        </div>
                      ) : (
                        <span className="italic text-muted-foreground/60">Aucune action</span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-center">
                      <span className="px-2.5 py-1 rounded-xl bg-secondary text-foreground font-black text-xs">
                        {user.totalSessions}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <span className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-black text-xs">
                        {user.totalEvents}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${PRESENCE_META[toPresence(user.status)].badge}`}>
                        {PRESENCE_META[toPresence(user.status)].label}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <Button
                        onClick={() => setSelectedUserForModal(user)}
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-xs font-bold gap-1.5 hover:bg-primary hover:text-white"
                      >
                        <Eye className="w-3.5 h-3.5" /> Voir Détails
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      ) : (
        /* ========================================================================= */
        /* ONGLET 2 : HISTORIQUE COMPLET DES LOGS & ACTIONS D'AUDIT                  */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* KPI Cards Summary for Logs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 print:hidden">
            <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Total Événements</span>
              <div className="text-2xl font-black text-foreground mt-1">{logStats.total}</div>
              <span className="text-[11px] text-muted-foreground">Dans la sélection</span>
            </div>

            <div className="bg-card border border-emerald-500/30 bg-emerald-500/[0.03] rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Créations</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{logStats.creates}</div>
              <span className="text-[11px] text-muted-foreground">Objets créés</span>
            </div>

            <div className="bg-card border border-blue-500/30 bg-blue-500/[0.03] rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Modifications</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{logStats.updates}</div>
              <span className="text-[11px] text-muted-foreground">Mises à jour</span>
            </div>

            <div className="bg-card border border-red-500/30 bg-red-500/[0.03] rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider block">Suppressions</span>
              <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{logStats.deletes}</div>
              <span className="text-[11px] text-muted-foreground">Suppressions tracées</span>
            </div>

            <div className="bg-card border border-amber-500/30 bg-amber-500/[0.03] rounded-2xl p-4 shadow-sm relative overflow-hidden col-span-2 sm:col-span-1">
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Connexions</span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{logStats.auths}</div>
              <span className="text-[11px] text-muted-foreground">Authentifications</span>
            </div>
          </div>

          {/* Control Bar : Filtres complets (Nom, Poste, Action, Module, Intervalle Date et Heure) */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-4 print:hidden">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
              {/* Recherche textuelle par nom de l'utilisateur ou action */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={logSearchTerm}
                  onChange={(e) => setLogSearchTerm(e.target.value)}
                  placeholder="Rechercher par nom de l'utilisateur, email, action effectuée..."
                  className="pl-10 pr-9 h-11 bg-secondary/30 border-transparent focus:bg-background transition-all rounded-xl font-medium text-sm"
                />
                {logSearchTerm && (
                  <button
                    onClick={() => setLogSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Bouton de réinitialisation si filtres actifs */}
              {(logSearchTerm || logJobTitleFilter !== 'ALL' || logActionFilter !== 'ALL' || logModuleFilter !== 'ALL' || logStartDateTime || logEndDateTime) && (
                <Button
                  onClick={handleResetLogFilters}
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0 h-10 px-3 rounded-xl cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser les filtres
                </Button>
              )}
            </div>

            {/* Rangée de filtres : Poste, Action, Module, Intervalle Date & Heure Début / Fin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-border/50 text-xs">
              {/* 1. Filtre Poste de l'utilisateur */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-purple-500" /> Poste de l'utilisateur
                </label>
                <select
                  value={logJobTitleFilter}
                  onChange={(e) => setLogJobTitleFilter(e.target.value)}
                  className="w-full h-10 bg-secondary/40 text-foreground font-bold rounded-xl border border-border/50 px-2.5 outline-none cursor-pointer"
                >
                  <option value="ALL">POSTE : TOUS</option>
                  {OFFICIAL_JOB_TITLES.map(title => (
                    <option key={title} value={title}>{title.toUpperCase()}</option>
                  ))}
                  {distinctJobTitles
                    .filter(title => !OFFICIAL_JOB_TITLES.some(o => o.toLowerCase() === title.toLowerCase()))
                    .map(title => (
                      <option key={title} value={title}>{title.toUpperCase()} (AUTRE)</option>
                    ))}
                </select>
              </div>

              {/* 2. Filtre Action Effectuée */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-primary" /> Action Effectuée
                </label>
                <select
                  value={logActionFilter}
                  onChange={(e) => setLogActionFilter(e.target.value)}
                  className="w-full h-10 bg-secondary/40 text-foreground font-bold rounded-xl border border-border/50 px-2.5 outline-none cursor-pointer"
                >
                  <option value="ALL">ACTION : TOUTES</option>
                  {distinctActions.map(act => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
              </div>

              {/* 3. Filtre Module */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <Layers className="w-3 h-3 text-blue-500" /> Module
                </label>
                <select
                  value={logModuleFilter}
                  onChange={(e) => setLogModuleFilter(e.target.value)}
                  className="w-full h-10 bg-secondary/40 text-foreground font-bold rounded-xl border border-border/50 px-2.5 outline-none cursor-pointer"
                >
                  <option value="ALL">MODULE : TOUS</option>
                  {distinctModules.map(mod => (
                    <option key={mod} value={mod}>{mod}</option>
                  ))}
                </select>
              </div>

              {/* 4. Intervalle Date/Heure Début */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-500" /> Date & Heure Début
                </label>
                <input
                  type="datetime-local"
                  value={logStartDateTime}
                  onChange={(e) => setLogStartDateTime(e.target.value)}
                  className="w-full h-10 px-2.5 bg-secondary/40 text-foreground text-xs font-bold rounded-xl border border-border/50 outline-none cursor-pointer"
                />
              </div>

              {/* 5. Intervalle Date/Heure Fin */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500" /> Date & Heure Fin
                </label>
                <input
                  type="datetime-local"
                  value={logEndDateTime}
                  onChange={(e) => setLogEndDateTime(e.target.value)}
                  className="w-full h-10 px-2.5 bg-secondary/40 text-foreground text-xs font-bold rounded-xl border border-border/50 outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Tableau de l'Historique Complet des Logs */}
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm print:border print:border-gray-300 print:shadow-none print:rounded-none">
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full print:border-collapse print:text-black">
                <thead className="bg-secondary/20 border-b border-border print:bg-gray-100 print:border-b-2 print:border-black">
                  <tr>
                    <th className="text-left py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground print:text-black">Date & Heure (GMT)</th>
                    <th className="text-left py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground print:text-black">Collaborateur</th>
                    <th className="text-left py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground print:text-black">Poste</th>
                    <th className="text-center py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground print:text-black">Action</th>
                    <th className="text-left py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground print:text-black">Module</th>
                    <th className="text-left py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground print:text-black">Description de l'action</th>
                    <th className="text-center py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground print:text-black">Plateforme</th>
                    <th className="text-right py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground print:hidden">Détail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border print:divide-gray-300">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-muted-foreground">
                        <History className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="font-bold text-sm text-foreground">Aucun événement ne correspond à vos filtres</p>
                        <p className="text-xs text-muted-foreground mt-1">Modifiez les filtres de collaborateur, de date ou d'action pour afficher l'historique.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map(log => {
                      const user = (log.user_id && userLookup.get(log.user_id)) || (log.user_email && userLookup.get(log.user_email.toLowerCase().trim()));
                      const userName = user?.userName || log.user_email?.split('@')[0] || 'Utilisateur';
                      const userJob = user?.jobTitle || 'Collaborateur';
                      const isMobile = isMobilePlatform(log.session_id, null, log.user_agent, log.module);

                      return (
                        <tr key={log.id} className="hover:bg-secondary/15 transition-colors group print:break-inside-avoid">
                          {/* Date & Heure */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                            <div className="font-bold text-foreground print:text-black">
                              {new Date(log.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                            <div className="text-[11px] text-muted-foreground print:text-gray-600 font-mono">
                              {new Date(log.created_at).toLocaleTimeString('fr-FR')} • {formatRelativeTime(log.created_at)}
                            </div>
                          </td>

                          {/* Collaborateur */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="print:hidden">
                                <UserSessionAvatar
                                  name={userName}
                                  email={log.user_email}
                                  photoUrl={user?.userAvatar}
                                  size="sm"
                                />
                              </div>
                              <div>
                                <div className="font-bold text-xs text-foreground print:text-black">{userName}</div>
                                <div className="text-[10px] text-muted-foreground print:text-gray-600">{log.user_email || 'Email non renseigné'}</div>
                              </div>
                            </div>
                          </td>

                          {/* Poste */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider border ${getJobBadgeClass(userJob)} print:border-black print:text-black`}>
                              {userJob}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getActionBadgeClass(log.action)} print:border-black print:text-black`}>
                              {log.action}
                            </span>
                          </td>

                          {/* Module */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-muted-foreground print:text-black bg-secondary/60 print:bg-transparent px-2 py-0.5 rounded-md">
                              {log.module}
                            </span>
                          </td>

                          {/* Description */}
                          <td className="py-3.5 px-4 max-w-md">
                            <div className="text-xs font-medium text-foreground print:text-black leading-snug">
                              {log.description}
                            </div>
                            {log.entity_type && (
                              <span className="text-[9.5px] text-muted-foreground print:text-gray-600 font-mono mt-0.5 block">
                                Entité : {log.entity_type} {log.entity_id ? `(#${log.entity_id.slice(0, 8)})` : ''}
                              </span>
                            )}
                          </td>

                          {/* Plateforme */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {isMobile ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md print:text-black print:bg-transparent">
                                <Smartphone className="w-3 h-3" /> Mobile
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md print:text-black print:bg-transparent">
                                <Laptop className="w-3 h-3" /> Web
                              </span>
                            )}
                          </td>

                          {/* Détail JSON */}
                          <td className="py-3.5 px-4 text-right print:hidden">
                            {(log.old_values || log.new_values || log.metadata) && (
                              <Button
                                onClick={() => setSelectedLogForJson(log)}
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs gap-1 font-bold text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                                title="Inspecter le payload JSON"
                              >
                                <FileJson className="w-3.5 h-3.5" /> Données
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inspection JSON des valeurs avant/après d'un Log */}
      {selectedLogForJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 print:hidden">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-primary font-black text-sm uppercase tracking-wide">
                <FileJson className="w-4 h-4" />
                <span>Payload & Données Modifiées</span>
              </div>
              <button
                onClick={() => setSelectedLogForJson(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-secondary/30 p-3 rounded-xl border border-border/60">
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold block uppercase">Action & Module</span>
                  <span className="font-extrabold text-foreground">{selectedLogForJson.action} • {selectedLogForJson.module}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold block uppercase">Date & Heure</span>
                  <span className="font-mono text-foreground">{new Date(selectedLogForJson.created_at).toLocaleString('fr-FR')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold block uppercase">Adresse IP</span>
                  <span className="font-mono text-foreground">{selectedLogForJson.ip_address || 'Non capturée'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold block uppercase">Entité</span>
                  <span className="font-mono text-foreground">{selectedLogForJson.entity_type || 'N/A'} {selectedLogForJson.entity_id ? `(#${selectedLogForJson.entity_id})` : ''}</span>
                </div>
              </div>

              {selectedLogForJson.description && (
                <div>
                  <span className="font-bold text-muted-foreground block mb-1">Description :</span>
                  <div className="p-3 bg-secondary/20 rounded-xl text-foreground font-medium">
                    {selectedLogForJson.description}
                  </div>
                </div>
              )}

              {selectedLogForJson.old_values && (
                <div>
                  <span className="font-bold text-red-500 block mb-1">Valeurs Précédentes (Avant Modification) :</span>
                  <pre className="p-3 rounded-xl bg-slate-950 text-red-300 font-mono text-[11px] overflow-x-auto border border-red-500/20 max-h-48">
                    {JSON.stringify(selectedLogForJson.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLogForJson.new_values && (
                <div>
                  <span className="font-bold text-emerald-500 block mb-1">Nouvelles Valeurs (Après Modification) :</span>
                  <pre className="p-3 rounded-xl bg-slate-950 text-emerald-300 font-mono text-[11px] overflow-x-auto border border-emerald-500/20 max-h-48">
                    {JSON.stringify(selectedLogForJson.new_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLogForJson.metadata && (
                <div>
                  <span className="font-bold text-purple-400 block mb-1">Métadonnées Complémentaires :</span>
                  <pre className="p-3 rounded-xl bg-slate-950 text-purple-300 font-mono text-[11px] overflow-x-auto border border-purple-500/20 max-h-48">
                    {JSON.stringify(selectedLogForJson.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                onClick={() => setSelectedLogForJson(null)}
                variant="outline"
                size="sm"
                className="rounded-xl px-4 text-xs font-bold cursor-pointer"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1 : Détail Complet de l'Utilisateur (Sessions + Actions Réelles filtrables par dates) */}
      <UserAuditDetailModal
        isOpen={!!selectedUserForModal}
        onClose={() => setSelectedUserForModal(null)}
        user={selectedUserForModal}
        onOpenSessionTimeline={(sessionId) => setSelectedSessionId(sessionId)}
      />

      {/* Modal 2 : Timeline Chronologique d'une Session Spécifique */}
      <SessionTimelineModal
        isOpen={!!selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
        session={selectedSessionDetails}
        events={selectedSessionEvents}
      />
    </div>
  );
};

// Sous-composant Carte Collaborateur Unique (1 Carte par Utilisateur)
interface UserCardProps {
  user: UserSummaryItem;
  getJobBadgeClass: (title?: string | null) => string;
  onSelectUser: (user: UserSummaryItem) => void;
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  getJobBadgeClass,
  onSelectUser
}) => {
  const hasValidDate = user.lastActivity && !isNaN(new Date(user.lastActivity).getTime());

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-card border border-border/80 hover:border-primary/40 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden h-full"
    >
      {/* Top Banner Accent */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${PRESENCE_META[toPresence(user.status)].banner}`} />

      {/* Header : Photo + Identité + Poste */}
      <div className="space-y-4">
        <div className="flex items-start gap-3.5">
          <UserSessionAvatar
            name={user.userName}
            email={user.userEmail}
            photoUrl={user.userAvatar}
            status={user.status}
            size="md"
          />

          <div className="flex-1 min-w-0">
            <h4 className="font-extrabold text-sm text-foreground truncate group-hover:text-primary transition-colors">
              {user.userName}
            </h4>
            <p className="text-[11px] text-muted-foreground truncate font-medium">
              {user.userEmail || 'Email non renseigné'}
            </p>

            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border truncate max-w-full ${getJobBadgeClass(user.jobTitle)}`}>
                {user.jobTitle}
              </span>

              {/* Badge Plateforme Connecté en Direct */}
              {user.status === 'ACTIVE' && (
                user.activePlatform === 'both' ? (
                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                    💻+📱 Web & App
                  </span>
                ) : user.activePlatform === 'mobile' ? (
                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1">
                    📱 Fus-App
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
                    💻 Dashboard
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Encart Dernière Action en Direct (Temps Réel) */}
        {user.latestAction ? (
          <div className="bg-secondary/40 border border-border/70 rounded-2xl p-2.5 text-xs space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="flex items-center gap-1 text-primary">
                <Activity className="w-3 h-3" /> Dernière action
              </span>
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                {user.latestAction.platform === 'mobile' ? '📱 Fus-App' : '💻 Dashboard'} • {formatRelativeTime(user.latestAction.timestamp)}
              </span>
            </div>
            <p className="text-foreground font-semibold text-[11px] truncate" title={user.latestAction.description}>
              <span className="text-primary font-bold">[{user.latestAction.module}]</span> {user.latestAction.description}
            </p>
          </div>
        ) : (
          <div className="bg-secondary/20 border border-border/40 rounded-2xl p-2 text-center text-[10px] text-muted-foreground/70 italic">
            Aucune action récente tracée
          </div>
        )}

        {/* Détails opérationnels synthétisés */}
        <div className="space-y-2 py-2.5 border-y border-border/50 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" /> Dernière Activité
            </span>
            <span className="font-bold text-foreground text-[11px]">
              {hasValidDate ? (
                `${new Date(user.lastActivity).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à ${new Date(user.lastActivity).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
              ) : (
                <span className="italic text-muted-foreground/70 font-normal">Jamais connecté</span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Total Sessions
            </span>
            <span className="font-extrabold text-foreground text-[11px]">
              {user.totalSessions} {user.totalSessions > 1 ? 'connexions' : 'connexion'}
            </span>
          </div>

          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Actions Réelles
            </span>
            <span className="font-black text-primary text-[11px] bg-primary/10 px-2 py-0.5 rounded-md">
              {user.totalEvents} actions
            </span>
          </div>
        </div>
      </div>

      {/* Footer : Statut + Bouton Détails */}
      <div className="mt-4 pt-1 flex items-center justify-between gap-2">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${PRESENCE_META[toPresence(user.status)].badge}`}>
          {PRESENCE_META[toPresence(user.status)].label}
        </span>

        <Button
          onClick={() => onSelectUser(user)}
          size="sm"
          className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/15 h-8 px-3.5"
        >
          <Eye className="w-3.5 h-3.5" /> Voir Détails
        </Button>
      </div>
    </motion.div>
  );
};

export default AuditLogsPage;
