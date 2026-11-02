export type UserSessionStatus = 'ACTIVE' | 'LOGGED_OUT' | 'EXPIRED' | 'TERMINATED_CONCURRENT';

export type AuditAction = 
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'SESSION_EXPIRED'
  | 'CONCURRENT_LOGIN_DETECTED'
  | 'VIEW'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT'
  | 'IMPORT'
  | 'DOWNLOAD'
  | 'UPLOAD'
  | 'PASSWORD_CHANGE'
  | 'PERMISSION_CHANGE'
  | 'ROLE_CHANGE'
  | 'SETTINGS_UPDATE'
  | 'START_LIVE'
  | 'PAUSE_LIVE'
  | 'RESUME_LIVE'
  | 'PERIOD_CHANGE'
  | 'TIMER_ADJUST'
  | 'END_MATCH';

export type AuditModule = 
  | 'AUTH'
  | 'USERS'
  | 'TEAMS'
  | 'PLAYERS'
  | 'STAFF'
  | 'ARBITRES'
  | 'MATCHES'
  | 'LIVE_TRACKING'
  | 'CLUB'
  | 'BLOG'
  | 'BACKUPS'
  | 'SYSTEM';

export type AuditOutcome = 'SUCCESS' | 'FAILED';

export interface UserSession {
  id: string;
  session_id: string;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device: string | null;
  status: UserSessionStatus;
  login_at: string;
  logout_at: string | null;
  last_activity_at: string;
  created_at: string;
  event_count?: number;
  user_name?: string | null;
  user_avatar?: string | null;
  job_title?: string | null;
}

export interface AuditLog {
  id: string;
  session_id: string;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  action: AuditAction;
  module: AuditModule;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  metadata: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  status: AuditOutcome;
  created_at: string;
}

export interface AuditLogInput {
  action: AuditAction;
  module: AuditModule;
  description: string;
  entity_type?: string;
  entity_id?: string;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  status?: AuditOutcome;
}
