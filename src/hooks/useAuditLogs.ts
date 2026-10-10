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
}

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
  });

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch User Sessions, Audit Logs, User Profiles, RPC Users, and Staff/Scouts in parallel
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fuhrxfhszttvpkmjydca.supabase.co';
      const clientToUse = serviceRoleKey
        ? supabase
        : supabase;

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
        supabase.from('user_profiles').select('id, full_name, avatar_url, job_title, system_role, is_active'),
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

      const combinedLogs: AuditLog[] = [
        ...(dbLogs || []),
        ...localLogs.filter(l => !(dbLogs || []).some(dbL => dbL.id === l.id))
      ];

      // Exclude phantom orphan test sessions (e.g. invite@fus.ma) that have no registered auth account or profile
      const rawSessions: UserSession[] = [
        ...(dbSessions || []),
        ...localSessions.filter(s => !(dbSessions || []).some(dbS => dbS.session_id === s.session_id))
      ];

      const combinedSessions = rawSessions.filter(s => {
        const emailKey = (s.user_email || '').toLowerCase().trim();
        if (emailKey === 'invite@fus.ma' && !profileByEmail.has('invite@fus.ma') && !s.user_id) {
          return false;
        }
        return true;
      });

      // Reconstitution automatique des sessions pour chaque session_id présent dans les logs mais absent des sessions
      const existingSessionIds = new Set(combinedSessions.map(s => s.session_id));
      combinedLogs.forEach(log => {
        if (log.session_id && !existingSessionIds.has(log.session_id)) {
          existingSessionIds.add(log.session_id);
          const sessionEvents = combinedLogs.filter(l => l.session_id === log.session_id);
          const oldestEvent = sessionEvents[sessionEvents.length - 1] || log;
          const newestEvent = sessionEvents[0] || log;

          combinedSessions.push({
            id: log.session_id,
            session_id: log.session_id,
            user_id: log.user_id,
            user_email: log.user_email || 'Utilisateur',
            user_role: log.user_role || 'super_admin',
            ip_address: log.ip_address || '127.0.0.1 (Local)',
            user_agent: log.user_agent || '',
            device: '💻 Ordinateur (Mac)',
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
      const allKnownProfiles = Array.from(profileById.values());
      (rpcUsers || []).forEach(u => {
        const uId = u.id;
        const uEmail = u.email ? u.email.toLowerCase().trim() : '';
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

        return {
          ...s,
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
      setLogs(AuditLogger.getLocalCachedLogs());
      setSessions(AuditLogger.getLocalCachedSessions());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
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
