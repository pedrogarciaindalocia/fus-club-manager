import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { AuditLogger } from '../services/auditLogger';
import type { UserSession, AuditLog, AuditAction, AuditModule, AuditOutcome } from '../types/audit';

export interface AuditFilters {
  searchTerm: string;
  userId: string;
  sessionId: string;
  action: string;
  module: string;
  status: string;
  entityType: string;
  startDate: string;
  endDate: string;
  ipAddress: string;
  jobTitle: string;
  platform: 'ALL' | 'WEB' | 'MOBILE';
}

/** Vérifie et filtre rigoureusement toute trace de compte invité fantôme */
export const isGuestEntry = (email?: string | null, sessionId?: string | null): boolean => {
  const em = (email || '').toLowerCase().trim();
  const sId = (sessionId || '').toUpperCase();
  return em === 'invite@fus.ma' || em.includes('invite') || sId.includes('GUEST');
};

/** Détecte avec précision si une session ou un log provient de l'application mobile Fus-App */
export const isMobilePlatform = (sessionId?: string | null, device?: string | null, userAgent?: string | null, module?: string | null): boolean => {
  if (sessionId && sessionId.startsWith('MOB-')) return true;
  const d = (device || '').toLowerCase();
  if (d.includes('fus-app') || d.includes('mobile') || d.includes('ios') || d.includes('android') || d.includes('téléphone')) return true;
  const ua = (userAgent || '').toLowerCase();
  if (ua.includes('fusapp')) return true;
  const m = (module || '').toUpperCase();
  if (m.includes('MOBILE')) return true;
  return false;
};

export const useAuditLogs = () => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<AuditFilters>({
    searchTerm: '',
    userId: 'ALL',
    sessionId: 'ALL',
    action: 'ALL',
    module: 'ALL',
    status: 'ALL',
    entityType: 'ALL',
    startDate: '',
    endDate: '',
    ipAddress: '',
    jobTitle: 'ALL',
    platform: 'ALL',
  });

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // 1. Fetch User Sessions, Audit Logs, User Profiles, RPC Users, and Staff/Scouts in parallel
      const [
        { data: dbSessions },
        { data: dbLogs },
        { data: dbProfiles },
        rpcUsersRes,
        { data: dbStaff },
        { data: dbScouts }
      ] = await Promise.all([
        supabase.from('user_sessions').select('*').order('login_at', { ascending: false }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('id, full_name, avatar_url, job_title, system_role, is_active, biometric_device_id, updated_at, biometric_last_used_at'),
        supabase.rpc('get_all_users').catch(() => ({ data: [] })),
        supabase.from('staff').select('id, full_name, photo_url, role, email'),
        supabase.from('scouts').select('id, full_name, photo_url, role_title, email')
      ]);

      const rpcUsers: any[] = rpcUsersRes?.data || [];

      // Build profile & scout lookups for photos and job titles
      const profileById = new Map<string, any>();
      const profileByEmail = new Map<string, any>();

      (dbProfiles || []).forEach(p => {
        if (p.id) profileById.set(p.id, p);
      });

      (rpcUsers || []).forEach(u => {
        if (u.id) {
          const existing = profileById.get(u.id) || {};
          profileById.set(u.id, {
            ...existing,
            id: u.id,
            email: u.email,
            full_name: existing.full_name || u.raw_user_meta_data?.full_name || u.full_name || u.email?.split('@')[0]
          });
        }
        if (u.email) {
          const emailKey = u.email.toLowerCase().trim();
          profileByEmail.set(emailKey, {
            id: u.id,
            email: u.email,
            full_name: u.raw_user_meta_data?.full_name || u.full_name || u.email.split('@')[0]
          });
        }
      });

      (dbProfiles || []).forEach(p => {
        if (p.email) {
          const emailKey = p.email.toLowerCase().trim();
          if (!profileByEmail.has(emailKey)) {
            profileByEmail.set(emailKey, p);
          }
        }
      });

      // Add staff/scouts ONLY if email is not already matched to a real user profile/auth account
      (dbStaff || []).forEach(st => {
        if (st.email) {
          const emailKey = st.email.toLowerCase().trim();
          if (!profileByEmail.has(emailKey)) {
            profileByEmail.set(emailKey, st);
          }
        }
      });
      (dbScouts || []).forEach(sc => {
        if (sc.email) {
          const emailKey = sc.email.toLowerCase().trim();
          if (!profileByEmail.has(emailKey)) {
            profileByEmail.set(emailKey, sc);
          }
        }
      });

      const localLogs = AuditLogger.getLocalCachedLogs();
      const localSessions = AuditLogger.getLocalCachedSessions();

      // Filtrer et purger rigoureusement tout compte/log invité
      const rawLogs: AuditLog[] = [
        ...(dbLogs || []),
        ...localLogs.filter(l => !(dbLogs || []).some(dbL => dbL.id === l.id))
      ];
      const combinedLogs = rawLogs.filter(l => !isGuestEntry(l.user_email, l.session_id));

      const rawSessions: UserSession[] = [
        ...(dbSessions || []),
        ...localSessions.filter(s => !(dbSessions || []).some(dbS => dbS.session_id === s.session_id))
      ];
      const combinedSessions = rawSessions.filter(s => !isGuestEntry(s.user_email, s.session_id));

      // 2. Inclusion prioritaire de la session de l'utilisateur actuellement authentifié sur cette session
      try {
        const { data: authUserRes } = await supabase.auth.getUser();
        const currentAuthUser = authUserRes?.user;

        if (currentAuthUser && !isGuestEntry(currentAuthUser.email, null)) {
          const curSession = AuditLogger.getCurrentSession();
          const activeSessId = curSession?.session_id || `SES-${Date.now()}`;
          const currentEmailLower = (currentAuthUser.email || '').toLowerCase().trim();
          
          const hasActiveInList = combinedSessions.some(
            s => s.status === 'ACTIVE' && (
              s.user_id === currentAuthUser.id || 
              (s.user_email && s.user_email.toLowerCase().trim() === currentEmailLower)
            )
          );

          if (!hasActiveInList) {
            const nowStr = new Date().toISOString();
            combinedSessions.unshift({
              id: activeSessId,
              session_id: activeSessId,
              user_id: currentAuthUser.id,
              user_email: currentAuthUser.email || 'Utilisateur',
              user_role: curSession?.user_role || currentAuthUser.user_metadata?.role || 'super_admin',
              ip_address: curSession?.ip_address || '127.0.0.1 (Local)',
              user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
              device: '💻 Web Dashboard',
              status: 'ACTIVE',
              login_at: curSession?.login_at || nowStr,
              logout_at: null,
              last_activity_at: nowStr,
              created_at: curSession?.created_at || nowStr,
              event_count: curSession?.event_count || 1
            });
          }
        }
      } catch (_) {}

      // 2b. Détection et inclusion directe des utilisateurs connectés (base de données user_profiles)
      // Garantit la détection immédiate des utilisateurs de Fus-App et Web Dashboard
      (dbProfiles || []).forEach(p => {
        if (!p.id) return;
        const dev = p.biometric_device_id || '';
        const isOnlineDb = (dev.startsWith('ONLINE') || dev.includes('Fus-App') || dev.includes('Dashboard')) && !dev.startsWith('OFFLINE');
        const lastActiveTime = p.updated_at ? new Date(p.updated_at).getTime() : 0;
        const diffSeconds = (Date.now() - lastActiveTime) / 1000;
        const isFresh = diffSeconds < 900; // Actif ou inactif au cours des 15 dernières minutes

        if (isOnlineDb && isFresh) {
          const isMob = dev.toLowerCase().includes('mobile') || dev.toLowerCase().includes('fus-app');
          const deviceLabel = dev.replace(/^ONLINE:(mobile|web):/, '') || (isMob ? '📱 Fus-App Mobile' : '💻 Web Dashboard');
          const statusValue = diffSeconds < 300 ? 'ACTIVE' : 'IDLE';
          const activeSessId = `ACTIVE-DB-${p.id}`;

          const existingIdx = combinedSessions.findIndex(s => s.user_id === p.id);
          const pEmail = profileById.get(p.id)?.email || p.email || 'Utilisateur';
          if (isGuestEntry(pEmail, null)) return;

          const sessionObj: UserSession = {
            id: activeSessId,
            session_id: activeSessId,
            user_id: p.id,
            user_email: pEmail,
            user_role: p.system_role || 'collaborateur',
            ip_address: isMob ? 'Mobile App' : '127.0.0.1 (Local)',
            user_agent: isMob ? 'FusApp Mobile' : 'Web Dashboard',
            device: deviceLabel,
            status: statusValue,
            login_at: p.biometric_last_used_at || p.updated_at || new Date().toISOString(),
            logout_at: null,
            last_activity_at: p.updated_at || new Date().toISOString(),
            created_at: p.biometric_last_used_at || p.updated_at || new Date().toISOString(),
            event_count: 1
          };

          if (existingIdx >= 0) {
            combinedSessions[existingIdx] = {
              ...combinedSessions[existingIdx],
              status: statusValue,
              device: deviceLabel,
              last_activity_at: p.updated_at || combinedSessions[existingIdx].last_activity_at
            };
          } else {
            combinedSessions.unshift(sessionObj);
          }
        }
      });

      // Reconstitution automatique des sessions pour chaque session_id présent dans les logs mais absent des sessions
      const existingSessionIds = new Set(combinedSessions.map(s => s.session_id));
      combinedLogs.forEach(log => {
        if (log.session_id && !existingSessionIds.has(log.session_id)) {
          existingSessionIds.add(log.session_id);
          const sessionEvents = combinedLogs.filter(l => l.session_id === log.session_id);
          const oldestEvent = sessionEvents[sessionEvents.length - 1] || log;
          const newestEvent = sessionEvents[0] || log;

          const isMob = isMobilePlatform(log.session_id, null, log.user_agent, log.module);
          const deviceLabel = isMob ? '📱 Fus-App Mobile' : '💻 Web Dashboard';

          combinedSessions.push({
            id: log.session_id,
            session_id: log.session_id,
            user_id: log.user_id,
            user_email: log.user_email || 'Utilisateur',
            user_role: log.user_role || 'collaborateur',
            ip_address: log.ip_address || (isMob ? 'Mobile App' : '127.0.0.1 (Local)'),
            user_agent: log.user_agent || '',
            device: deviceLabel,
            status: 'ACTIVE',
            login_at: oldestEvent.created_at,
            logout_at: null,
            last_activity_at: newestEvent.created_at,
            created_at: oldestEvent.created_at,
            event_count: sessionEvents.length
          });
        }
      });

      // Calculate event counts per session
      const countMap = new Map<string, number>();
      combinedLogs.forEach(l => {
        if (l.session_id) {
          countMap.set(l.session_id, (countMap.get(l.session_id) || 0) + 1);
        }
      });

      // Ensure EVERY registered account from dbProfiles and rpcUsers is represented
      const userAccountsSet = new Set<string>();
      combinedSessions.forEach(s => {
        if (s.user_id) userAccountsSet.add(s.user_id);
        if (s.user_email) userAccountsSet.add(s.user_email.toLowerCase().trim());
      });

      // Add dummy 0-session placeholder for accounts with 0 sessions
      (rpcUsers || []).forEach(u => {
        const uId = u.id;
        const uEmail = u.email ? u.email.toLowerCase().trim() : '';
        if (isGuestEntry(uEmail, null)) return;
        if ((uId && !userAccountsSet.has(uId)) && (uEmail && !userAccountsSet.has(uEmail))) {
          userAccountsSet.add(uId || uEmail);
          const p = uId ? profileById.get(uId) : null;
          combinedSessions.push({
            id: `NO_SESSION-${uId || uEmail}`,
            session_id: `NO_SESSION-${uId || uEmail}`,
            user_id: uId,
            user_email: u.email || 'Utilisateur',
            user_role: p?.system_role || u.role || 'collaborateur',
            ip_address: 'N/A',
            user_agent: '',
            device: 'N/A',
            status: 'LOGGED_OUT',
            login_at: u.created_at || new Date(0).toISOString(),
            logout_at: null,
            last_activity_at: u.created_at || new Date(0).toISOString(),
            created_at: u.created_at || new Date(0).toISOString(),
            event_count: 0
          });
        }
      });

      (dbProfiles || []).forEach(p => {
        const pId = p.id;
        const pEmail = p.email ? p.email.toLowerCase().trim() : '';
        if (isGuestEntry(pEmail, null)) return;
        if (pId && !userAccountsSet.has(pId) && (!pEmail || !userAccountsSet.has(pEmail))) {
          userAccountsSet.add(pId);
          combinedSessions.push({
            id: `NO_SESSION-${pId}`,
            session_id: `NO_SESSION-${pId}`,
            user_id: pId,
            user_email: p.email || 'Utilisateur',
            user_role: p.system_role || 'collaborateur',
            ip_address: 'N/A',
            user_agent: '',
            device: 'N/A',
            status: 'LOGGED_OUT',
            login_at: new Date(0).toISOString(),
            logout_at: null,
            last_activity_at: new Date(0).toISOString(),
            created_at: new Date(0).toISOString(),
            event_count: 0
          });
        }
      });

      const enrichedSessions = combinedSessions.map(s => {
        const emailKey = (s.user_email || '').toLowerCase().trim();
        const p = (s.user_id ? profileById.get(s.user_id) : (emailKey ? profileByEmail.get(emailKey) : null));
        const st = emailKey ? profileByEmail.get(emailKey) : null;

        const resolvedName = p?.full_name || (st?.email === emailKey && st?.full_name && !p ? st.full_name : null) || (s.user_email ? s.user_email.split('@')[0] : 'Utilisateur');
        const resolvedAvatar = p?.avatar_url || st?.photo_url || null;
        const resolvedJobTitle = p?.job_title || st?.role_title || st?.role || (p?.system_role ? p.system_role.replace(/_/g, ' ') : (s.user_role ? s.user_role.replace(/_/g, ' ') : 'Collaborateur'));

        // Normalisation propre du device avec détection mobile
        let resolvedDevice = s.device;
        if (isMobilePlatform(s.session_id, s.device, s.user_agent, null)) {
          if (!resolvedDevice || resolvedDevice === 'Desktop' || resolvedDevice === 'N/A') {
            resolvedDevice = '📱 Fus-App Mobile';
          }
        }

        return {
          ...s,
          device: resolvedDevice,
          event_count: countMap.get(s.session_id) || s.event_count || 0,
          user_name: resolvedName,
          user_avatar: resolvedAvatar,
          job_title: resolvedJobTitle,
        };
      });

      setSessions(enrichedSessions);
      setLogs(combinedLogs);
    } catch (err) {
      console.warn('Fallback to cached audit logs:', err);
      setLogs(AuditLogger.getLocalCachedLogs().filter(l => !isGuestEntry(l.user_email, l.session_id)));
      setSessions(AuditLogger.getLocalCachedSessions().filter(s => !isGuestEntry(s.user_email, s.session_id)));
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Initial load + Supabase Realtime Subscription (Actions et Sessions en temps réel instantané)
  useEffect(() => {
    fetchData();

    const realtimeChannel = supabase
      .channel('audit_realtime_stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_logs' },
        () => {
          fetchData(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_sessions' },
        () => {
          fetchData(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_profiles' },
        () => {
          fetchData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [fetchData]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const isMob = isMobilePlatform(s.session_id, s.device, s.user_agent, null);

      if (filters.platform === 'MOBILE' && !isMob) return false;
      if (filters.platform === 'WEB' && isMob) return false;

      const matchSearch = filters.searchTerm === '' ||
        (s.session_id && s.session_id.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (s.user_email && s.user_email.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (s.user_name && s.user_name.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (s.job_title && s.job_title.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (s.ip_address && s.ip_address.includes(filters.searchTerm));

      const matchUser = filters.userId === 'ALL' || s.user_id === filters.userId || s.user_email === filters.userId;
      const matchStatus = filters.status === 'ALL' || s.status === filters.status;
      const matchIp = !filters.ipAddress || (s.ip_address && s.ip_address.includes(filters.ipAddress));
      const matchJobTitle = filters.jobTitle === 'ALL' ||
        (s.job_title && s.job_title.toLowerCase().includes(filters.jobTitle.toLowerCase())) ||
        (s.user_role && s.user_role.toLowerCase().includes(filters.jobTitle.toLowerCase()));

      const matchStart = !filters.startDate || new Date(s.login_at) >= new Date(filters.startDate);
      const matchEnd = !filters.endDate || new Date(s.login_at) <= new Date(filters.endDate + 'T23:59:59');

      return matchSearch && matchUser && matchStatus && matchIp && matchJobTitle && matchStart && matchEnd;
    });
  }, [sessions, filters]);

  // Filtered Audit Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const isMob = isMobilePlatform(l.session_id, null, l.user_agent, l.module);

      if (filters.platform === 'MOBILE' && !isMob) return false;
      if (filters.platform === 'WEB' && isMob) return false;

      const matchSearch = filters.searchTerm === '' ||
        l.description.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        l.action.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        l.module.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        (l.user_email && l.user_email.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (l.session_id && l.session_id.toLowerCase().includes(filters.searchTerm.toLowerCase()));

      const matchUser = filters.userId === 'ALL' || l.user_id === filters.userId || l.user_email === filters.userId;
      const matchSession = filters.sessionId === 'ALL' || l.session_id === filters.sessionId;
      const matchAction = filters.action === 'ALL' || l.action === filters.action;
      const matchModule = filters.module === 'ALL' || l.module === filters.module;
      const matchStatus = filters.status === 'ALL' || l.status === filters.status;
      const matchEntity = filters.entityType === 'ALL' || l.entity_type === filters.entityType;

      const matchStart = !filters.startDate || new Date(l.created_at) >= new Date(filters.startDate);
      const matchEnd = !filters.endDate || new Date(l.created_at) <= new Date(filters.endDate + 'T23:59:59');

      return matchSearch && matchUser && matchSession && matchAction && matchModule && matchStatus && matchEntity && matchStart && matchEnd;
    });
  }, [logs, filters]);

  // Selected session timeline events
  const selectedSessionEvents = useMemo(() => {
    if (!selectedSessionId) return [];
    return logs
      .filter(l => l.session_id === selectedSessionId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [logs, selectedSessionId]);

  const selectedSessionDetails = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessions.find(s => s.session_id === selectedSessionId) || null;
  }, [sessions, selectedSessionId]);

  return {
    sessions: filteredSessions,
    allSessions: sessions,
    logs: filteredLogs,
    allLogs: logs,
    loading,
    filters,
    setFilters,
    selectedSessionId,
    setSelectedSessionId,
    selectedSessionEvents,
    selectedSessionDetails,
    refresh: fetchData,
  };
};
