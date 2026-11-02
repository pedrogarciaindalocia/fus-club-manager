import { supabase } from '../lib/supabase';
import type { 
  UserSession, 
  AuditLog, 
  AuditLogInput, 
  AuditAction, 
  AuditModule, 
  AuditOutcome 
} from '../types/audit';

const LOCAL_SESSION_KEY = 'fus_audit_current_session';
const LOCAL_LOGS_KEY = 'fus_audit_local_logs_cache';
const LOCAL_SESSIONS_CACHE_KEY = 'fus_audit_local_sessions_cache';

/** Liste des champs sensibles à masquer pour la sécurité */
const SENSITIVE_KEYS = [
  'password', 'pass', 'pwd', 'token', 'secret', 'apikey', 'api_key', 
  'authorization', 'credit_card', 'card_number', 'cvv'
];

/** Masque ou supprime récursivement les clés sensibles */
const sanitizePayload = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);

  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(s => lowerKey.includes(s))) {
      clean[key] = '[REDACTED_CONFIDENTIAL]';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      clean[key] = sanitizePayload(obj[key]);
    } else {
      clean[key] = obj[key];
    }
  }
  return clean;
};

/** Récupère l'adresse IP publique du client */
const fetchPublicIp = async (): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.ip) return data.ip;
    }
  } catch (_) {}
  return '127.0.0.1 (Local)';
};

/** Détecte avec précision le support (Ordinateur, Téléphone, Tablette) et le système d'exploitation */
const getDeviceSupportInfo = (userAgent: string): { device: string; support: string } => {
  const ua = userAgent.toLowerCase();
  
  let supportType = '💻 Ordinateur';
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    supportType = '📑 Tablette';
  } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    supportType = '📱 Téléphone';
  }

  let osName = 'Autre';
  if (ua.includes('macintosh') || ua.includes('mac os x')) osName = 'macOS';
  else if (ua.includes('windows')) osName = 'Windows PC';
  else if (ua.includes('android')) osName = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) osName = 'iOS';
  else if (ua.includes('linux')) osName = 'Linux';

  return {
    support: supportType,
    device: `${supportType} (${osName})`
  };
};

class AuditLoggerService {
  private static instance: AuditLoggerService | null = null;
  private currentSession: UserSession | null = null;
  private cachedIp: string | null = null;

  private constructor() {
    this.restoreSessionFromStorage();
  }

  public static getInstance(): AuditLoggerService {
    if (!AuditLoggerService.instance) {
      AuditLoggerService.instance = new AuditLoggerService();
    }
    return AuditLoggerService.instance;
  }

  private restoreSessionFromStorage() {
    try {
      const saved = localStorage.getItem(LOCAL_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Élimination stricte des sessions invitées (invite@fus.ma / GUEST)
        const email = (parsed?.user_email || '').toLowerCase().trim();
        const sId = (parsed?.session_id || '').toUpperCase();
        if (email === 'invite@fus.ma' || email.includes('invite') || sId.includes('GUEST')) {
          localStorage.removeItem(LOCAL_SESSION_KEY);
          this.currentSession = null;
        } else {
          this.currentSession = parsed;
        }
      }
    } catch (_) {}
  }

  private saveSessionToStorage(session: UserSession | null) {
    this.currentSession = session;
    if (session) {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
      this.cacheSessionLocally(session);
    } else {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
  }

  /**
   * Initialise une nouvelle session unique lors de la connexion utilisateur.
   * Si une session ACTIVE existe déjà pour cet utilisateur, elle est invalidée en TERMINATED_CONCURRENT.
   */
  async startSession(userId: string | null, email: string | null, role: string | null): Promise<string> {
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 9).toUpperCase();
    const sessionId = `SES-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomHex}`;

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    const { device } = getDeviceSupportInfo(userAgent);

    if (!this.cachedIp) {
      this.cachedIp = await fetchPublicIp();
    }
    const ipAddress = this.cachedIp;

    // Détection et révocation des sessions concurrentes préexistantes pour ce compte
    if (userId) {
      try {
        const { data: previousActive } = await supabase
          .from('user_sessions')
          .select('session_id, ip_address, device, login_at')
          .eq('user_id', userId)
          .eq('status', 'ACTIVE');

        if (previousActive && previousActive.length > 0) {
          const prevIds = previousActive.map(s => s.session_id);
          const nowStr = new Date().toISOString();

          await supabase
            .from('user_sessions')
            .update({
              status: 'TERMINATED_CONCURRENT',
              logout_at: nowStr,
              last_activity_at: nowStr
            })
            .in('session_id', prevIds);

          await this.log({
            action: 'CONCURRENT_LOGIN_DETECTED',
            module: 'AUTH',
            description: `Connexion simultanée détectée pour le compte ${email || userId}. Session précédente révoquée par sécurité.`,
            status: 'SUCCESS',
            metadata: {
              new_session_id: sessionId,
              revoked_sessions: prevIds,
              new_ip: ipAddress,
              new_device: device
            }
          });
        }
      } catch (err) {
        console.warn('[AuditLogger] Concurrent session check error:', err);
      }
    }

    const newSession: UserSession = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(timestamp),
      session_id: sessionId,
      user_id: userId,
      user_email: email,
      user_role: role,
      ip_address: ipAddress,
      user_agent: userAgent,
      device: device,
      status: 'ACTIVE',
      login_at: new Date().toISOString(),
      logout_at: null,
      last_activity_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      event_count: 0
    };

    this.saveSessionToStorage(newSession);

    // Persister dans Supabase
    try {
      const isValidUuid = (val?: string | null) =>
        Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

      const sanitizedUserId = isValidUuid(newSession.user_id) ? newSession.user_id : null;

      const { error: insertErr } = await supabase.from('user_sessions').insert([{
        session_id: newSession.session_id,
        user_id: sanitizedUserId,
        user_email: newSession.user_email,
        user_role: newSession.user_role,
        ip_address: newSession.ip_address,
        user_agent: newSession.user_agent,
        device: newSession.device,
        status: newSession.status,
        login_at: newSession.login_at,
        last_activity_at: newSession.last_activity_at
      }]);
      if (insertErr) {
        console.warn('[AuditLogger] Échec insertion user_sessions Supabase:', insertErr);
        this.cacheSessionLocally(newSession);
      }
    } catch (err) {
      console.warn('[AuditLogger] Exception insertion user_sessions:', err);
      this.cacheSessionLocally(newSession);
    }

    // Mettre à jour directement le statut ONLINE dans user_profiles
    if (userId) {
      try {
        const { error: upErr } = await supabase
          .from('user_profiles')
          .update({
            biometric_device_id: 'ONLINE:web:💻 Web Dashboard',
            biometric_last_used_at: newSession.login_at,
            updated_at: newSession.login_at
          })
          .eq('id', userId);
        if (upErr) {
          console.warn('[AuditLogger] Échec maj user_profiles ONLINE:', upErr);
        }
      } catch (_) {}
    }

    // Logger l'événement LOGIN
    await this.log({
      action: 'LOGIN',
      module: 'AUTH',
      description: `Connexion réussie depuis ${device} (IP: ${ipAddress})`,
      status: 'SUCCESS'
    });

    return sessionId;
  }

  /**
   * Vérifie le statut serveur de la session active courante
   */
  async checkCurrentSessionStatus(): Promise<'ACTIVE' | 'TERMINATED_CONCURRENT' | 'EXPIRED' | 'LOGGED_OUT' | 'NOT_FOUND'> {
    if (!this.currentSession?.session_id) return 'NOT_FOUND';
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('status')
        .eq('session_id', this.currentSession.session_id)
        .maybeSingle();

      if (error || !data) return 'ACTIVE';
      return (data.status as any) || 'ACTIVE';
    } catch (_) {
      return 'ACTIVE';
    }
  }

  /**
   * Clôture la session avec un motif spécifique
   */
  async closeSessionWithReason(reason: 'LOGGED_OUT' | 'EXPIRED' | 'TERMINATED_CONCURRENT' = 'LOGGED_OUT'): Promise<void> {
    if (!this.currentSession) return;

    const sessionId = this.currentSession.session_id;
    const now = new Date().toISOString();

    const action = reason === 'EXPIRED' ? 'SESSION_EXPIRED' : 'LOGOUT';
    const description = reason === 'EXPIRED'
      ? `Session clôturée suite à inactivité prolongée (Session: ${sessionId})`
      : reason === 'TERMINATED_CONCURRENT'
        ? `Session fermée suite à une nouvelle connexion simultanée (Session: ${sessionId})`
        : `Déconnexion utilisateur (Session: ${sessionId})`;

    await this.log({
      action,
      module: 'AUTH',
      description,
      status: 'SUCCESS'
    });

    if (this.currentSession.user_id) {
      try {
        await supabase
          .from('user_profiles')
          .update({
            biometric_device_id: 'OFFLINE:web',
            updated_at: now
          })
          .eq('id', this.currentSession.user_id);
      } catch (_) {}
    }

    try {
      await supabase
        .from('user_sessions')
        .update({
          logout_at: now,
          status: reason,
          last_activity_at: now
        })
        .eq('session_id', sessionId);
    } catch (_) {}

    this.saveSessionToStorage(null);
  }

  /**
   * Clôture la session lors de la déconnexion normale
   */
  async closeSession(): Promise<void> {
    await this.closeSessionWithReason('LOGGED_OUT');
  }

  /**
   * Met à jour l'horodatage de dernière activité
   */
  async touchActivity(): Promise<void> {
    if (!this.currentSession) return;
    const now = new Date().toISOString();
    this.currentSession.last_activity_at = now;
    this.saveSessionToStorage(this.currentSession);

    if (this.currentSession.user_id) {
      try {
        await supabase
          .from('user_profiles')
          .update({ updated_at: now })
          .eq('id', this.currentSession.user_id);
      } catch (_) {}
    }

    try {
      await supabase
        .from('user_sessions')
        .update({ last_activity_at: now })
        .eq('session_id', this.currentSession.session_id);
    } catch (_) {}
  }

  /**
   * Récupère la session utilisateur active actuelle
   */
  getCurrentSession(): UserSession | null {
    if (!this.currentSession) {
      this.restoreSessionFromStorage();
    }
    return this.currentSession;
  }

  /**
   * Récupère l'ID de la session active courante.
   * Ne crée JAMAIS de faux utilisateur invité.
   */
  getCurrentSessionId(): string {
    if (!this.currentSession) {
      this.restoreSessionFromStorage();
    }
    return this.currentSession?.session_id || '';
  }

  /**
   * API Centrale d'Enregistrement des Événements d'Audit
   */
  async log(input: AuditLogInput): Promise<void> {
    const sessionId = this.getCurrentSessionId();
    const user = this.currentSession;
    
    // Si aucun utilisateur n'est authentifié ou présent en session, on ne crée pas de log orphelin fantôme
    if (!sessionId && !user?.user_id && !user?.user_email) {
      return;
    }

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const now = new Date().toISOString();

    const sanitizedOld = sanitizePayload(input.old_values);
    const sanitizedNew = sanitizePayload(input.new_values);
    const sanitizedMeta = sanitizePayload(input.metadata);

    const logEntry: Omit<AuditLog, 'id'> = {
      session_id: sessionId || `SYS-${Date.now()}`,
      user_id: user?.user_id || null,
      user_email: user?.user_email || 'Système',
      user_role: user?.user_role || 'collaborateur',
      action: input.action,
      module: input.module,
      entity_type: input.entity_type || null,
      entity_id: input.entity_id || null,
      description: input.description,
      old_values: sanitizedOld || null,
      new_values: sanitizedNew || null,
      metadata: sanitizedMeta || null,
      ip_address: user?.ip_address || this.cachedIp || '127.0.0.1',
      user_agent: userAgent,
      status: input.status || 'SUCCESS',
      created_at: now
    };

    // Incrementation du compteur d'événements de la session locale
    if (this.currentSession) {
      this.currentSession.event_count = (this.currentSession.event_count || 0) + 1;
      this.saveSessionToStorage(this.currentSession);
    }

    // Persistance dans Supabase avec fallback local
    try {
      const { error } = await supabase.from('audit_logs').insert([{
        session_id: logEntry.session_id,
        user_id: logEntry.user_id,
        user_email: logEntry.user_email,
        user_role: logEntry.user_role,
        action: logEntry.action,
        module: logEntry.module,
        entity_type: logEntry.entity_type,
        entity_id: logEntry.entity_id,
        description: logEntry.description,
        old_values: logEntry.old_values,
        new_values: logEntry.new_values,
        metadata: logEntry.metadata,
        ip_address: logEntry.ip_address,
        user_agent: logEntry.user_agent,
        status: logEntry.status,
        created_at: logEntry.created_at
      }]);

      if (error) throw error;
    } catch (_) {
      this.cacheLogLocally(logEntry);
    }
  }

  // --- Raccourcis d'Audit ---

  async logView(module: AuditModule, description: string) {
    return this.log({ action: 'VIEW', module, description });
  }

  async logCreate(module: AuditModule, entityType: string, entityId: string, newValues: any, description: string) {
    return this.log({ action: 'CREATE', module, entity_type: entityType, entity_id: entityId, new_values: newValues, description });
  }

  async logUpdate(module: AuditModule, entityType: string, entityId: string, oldValues: any, newValues: any, description: string) {
    return this.log({ action: 'UPDATE', module, entity_type: entityType, entity_id: entityId, old_values: oldValues, new_values: newValues, description });
  }

  async logDelete(module: AuditModule, entityType: string, entityId: string, oldValues: any, description: string) {
    return this.log({ action: 'DELETE', module, entity_type: entityType, entity_id: entityId, old_values: oldValues, description });
  }

  /**
   * Enregistre une opération du direct (Live Tracking) pour un match donné
   * avec traçabilité complète de l'opérateur, du match, de la minute et du score.
   */
  async logLiveMatchOperation(params: {
    matchId: string;
    matchLabel?: string | null;
    action: AuditAction;
    description: string;
    operatorName?: string | null;
    minute?: number | null;
    score?: string | null;
    period?: string | null;
    metadata?: any;
  }) {
    const meta = {
      ...(params.metadata || {}),
      match_id: params.matchId,
      entity_id: params.matchId,
      entity_type: 'match',
      match_label: params.matchLabel,
      operator_name: params.operatorName,
      minute: params.minute ?? null,
      score: params.score ?? null,
      period: params.period ?? null,
    };
    return this.log({
      action: params.action,
      module: 'LIVE_TRACKING',
      entity_type: 'match',
      entity_id: params.matchId,
      description: params.description,
      metadata: meta,
      status: 'SUCCESS'
    });
  }

  // --- Stockage & Recouvrement local (Fallback Offline) ---

  private cacheLogLocally(log: Omit<AuditLog, 'id'>) {
    try {
      const existing = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
      const newEntry = { id: `LOCAL-${Date.now()}-${Math.random()}`, ...log };
      existing.unshift(newEntry);
      localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(existing.slice(0, 200)));
    } catch (_) {}
  }

  private cacheSessionLocally(session: UserSession) {
    try {
      const existing = JSON.parse(localStorage.getItem(LOCAL_SESSIONS_CACHE_KEY) || '[]');
      existing.unshift(session);
      localStorage.setItem(LOCAL_SESSIONS_CACHE_KEY, JSON.stringify(existing.slice(0, 50)));
    } catch (_) {}
  }

  getLocalCachedLogs(): AuditLog[] {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
    } catch (_) {
      return [];
    }
  }

  getLocalCachedSessions(): UserSession[] {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_SESSIONS_CACHE_KEY) || '[]');
    } catch (_) {
      return [];
    }
  }
}

export { AuditLoggerService };
export const AuditLogger = AuditLoggerService.getInstance();
