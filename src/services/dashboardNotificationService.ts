import { supabase } from '../lib/supabase';
import { getMyClubId } from './_helpers';
import {
  isCoachJob,
  isDirecteurAdministratifJob,
  isResponsableMagasinierJob,
  isResponsableVieJob,
  normalizeJobTitleKey,
} from '../constants/roles';
import { normalizeAgeCategory } from '../constants';

export type DashboardNotificationType =
  | 'test_planned'
  | 'test_slot_validated'
  | 'test_tomorrow_reminder'
  | 'recruit_now_validated'
  | 'system';

export interface DashboardNotificationMetadata {
  candidate_id?: string;
  candidate_name?: string;
  test_date?: string;
  test_dates?: string[];
  categories?: string[];
  session_count?: number;
  location?: string;
  start_time?: string;
  [key: string]: unknown;
}

export interface DashboardNotification {
  id: string;
  club_id: string | null;
  target_user_id: string | null;
  target_roles: string[];
  target_categories: string[];
  type: DashboardNotificationType;
  title: string;
  message: string;
  link_url: string;
  metadata: DashboardNotificationMetadata;
  read_by: string[];
  created_by: string | null;
  created_at: string;
  isVirtual?: boolean;
}

export interface DispatchTestPlanningNotificationInput {
  type: 'test_planned' | 'test_slot_validated' | 'recruit_now_validated';
  title: string;
  message: string;
  categories?: string[];
  targetRoles?: string[];
  linkUrl?: string;
  metadata?: DashboardNotificationMetadata;
}

export interface UserNotificationContext {
  userId?: string | null;
  jobTitle?: string | null;
  systemRole?: string | null;
  userCategories?: string[];
}

export const DASHBOARD_NOTIFICATIONS_CHANNEL = 'dashboard_notifications_realtime';
const LOCAL_NOTIF_PREFIX = 'fus_dashboard_notifications_v1_';
const LOCAL_READ_PREFIX = 'fus_dashboard_notifications_read_v1_';
const REMOTE_MISSING_SESSION_KEY = 'fus_dashboard_notifications_table_missing_v1';

let remoteTableUnavailableMemory = false;
let inFlightNotificationsProbe: Promise<DashboardNotification[] | null> | null = null;

export function isRemoteDashboardNotificationsUnavailable(): boolean {
  if (remoteTableUnavailableMemory) return true;
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(REMOTE_MISSING_SESSION_KEY) === '1') {
      remoteTableUnavailableMemory = true;
      return true;
    }
  } catch {
    // Ignore storage access issues
  }
  return false;
}

function markRemoteTableUnavailable(): void {
  remoteTableUnavailableMemory = true;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(REMOTE_MISSING_SESSION_KEY, '1');
    }
  } catch {
    // Ignore storage access issues
  }
}

interface PostgrestErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

interface NotificationsTableQuery {
  select: (columns?: string) => {
    eq: (col: string, val: string) => {
      order: (col: string, opts: { ascending: boolean }) => {
        limit: (n: number) => Promise<{ data: DashboardNotification[] | null; error: PostgrestErrorLike | null }>;
      };
    };
  };
  insert: (payload: Record<string, unknown>) => {
    select: () => {
      single: () => Promise<{ data: DashboardNotification | null; error: PostgrestErrorLike | null }>;
    };
  };
  update: (payload: Record<string, unknown>) => {
    eq: (col: string, val: string) => Promise<{ error: PostgrestErrorLike | null }>;
  };
}

function getNotificationsTable(): NotificationsTableQuery {
  return (supabase as unknown as { from: (t: string) => NotificationsTableQuery }).from('dashboard_notifications');
}

function isMissingTableError(error: PostgrestErrorLike | null | undefined): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.status === 404 ||
    code === '42P01' ||
    code === 'PGRST205' ||
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('could not find the table') ||
    message.includes('not found')
  );
}

function readLocalNotifications(clubId: string): DashboardNotification[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_NOTIF_PREFIX}${clubId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DashboardNotification[]) : [];
  } catch {
    return [];
  }
}

function writeLocalNotifications(clubId: string, rows: DashboardNotification[]): void {
  try {
    localStorage.setItem(`${LOCAL_NOTIF_PREFIX}${clubId}`, JSON.stringify(rows.slice(0, 80)));
  } catch {
    // Ignore quota errors
  }
}

export function getLocalReadIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_READ_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function markLocalReadIds(userId: string, ids: string[]): void {
  try {
    const existing = new Set(getLocalReadIds(userId));
    ids.forEach((id) => existing.add(id));
    localStorage.setItem(`${LOCAL_READ_PREFIX}${userId}`, JSON.stringify(Array.from(existing).slice(-150)));
  } catch {
    // Ignore quota errors
  }
}

export function resolveUserNotificationRoles(ctx: UserNotificationContext): string[] {
  const roles = new Set<string>();
  const sys = (ctx.systemRole || '').toLowerCase().trim();
  const job = normalizeJobTitleKey(ctx.jobTitle);

  if (sys === 'super_admin') roles.add('super_admin');
  if (sys === 'admin' || sys === 'scout_admin') roles.add('admin');
  if (isCoachJob(ctx.jobTitle, ctx.systemRole)) roles.add('coach');
  if (isResponsableVieJob(ctx.jobTitle)) roles.add('responsable_vie');
  if (isResponsableMagasinierJob(ctx.jobTitle)) roles.add('responsable_magasinier');
  if (isDirecteurAdministratifJob(ctx.jobTitle)) roles.add('directeur_administratif');
  if (job) roles.add(job);
  if (sys) roles.add(sys);

  return Array.from(roles);
}

export function doesNotificationMatchUser(
  notif: DashboardNotification,
  ctx: UserNotificationContext
): boolean {
  const userId = ctx.userId || '';
  if (notif.target_user_id && userId && notif.target_user_id !== userId) {
    return false;
  }

  const userRoles = resolveUserNotificationRoles(ctx);
  const isSuper = userRoles.includes('super_admin');
  const targetRoles = Array.isArray(notif.target_roles) ? notif.target_roles : [];

  if (!isSuper && targetRoles.length > 0) {
    const hasRoleMatch = targetRoles.some((r) => userRoles.includes(r.toLowerCase()));
    if (!hasRoleMatch) return false;
  }

  const targetCats = (Array.isArray(notif.target_categories) ? notif.target_categories : [])
    .map((c) => normalizeAgeCategory(c))
    .filter(Boolean);
  const userCats = (Array.isArray(ctx.userCategories) ? ctx.userCategories : [])
    .map((c) => normalizeAgeCategory(c))
    .filter(Boolean);

  if (!isSuper && targetCats.length > 0 && userCats.length > 0) {
    const hasCatOverlap = targetCats.some((c) => userCats.includes(c));
    if (!hasCatOverlap) return false;
  }

  return true;
}

export function isNotificationReadForUser(notif: DashboardNotification, userId?: string | null): boolean {
  if (!userId) return false;
  if (Array.isArray(notif.read_by) && notif.read_by.includes(userId)) return true;
  return getLocalReadIds(userId).includes(notif.id);
}

export function getTomorrowIsoDate(): string {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const dashboardNotificationService = {
  async getNotifications(ctx: UserNotificationContext): Promise<DashboardNotification[]> {
    const clubId = await getMyClubId();
    let rows: DashboardNotification[] = readLocalNotifications(clubId);

    if (isRemoteDashboardNotificationsUnavailable()) {
      return rows.filter((n) => doesNotificationMatchUser(n, ctx));
    }

    try {
      if (!inFlightNotificationsProbe) {
        inFlightNotificationsProbe = (async () => {
          const { data, error } = await getNotificationsTable()
            .select('*')
            .eq('club_id', clubId)
            .order('created_at', { ascending: false })
            .limit(60);

          if (error) {
            if (isMissingTableError(error)) {
              markRemoteTableUnavailable();
            }
            return null;
          }

          const remoteRows = (data || []) as DashboardNotification[];
          writeLocalNotifications(clubId, remoteRows);
          return remoteRows;
        })().finally(() => {
          inFlightNotificationsProbe = null;
        });
      }

      const fetched = await inFlightNotificationsProbe;
      if (fetched !== null) {
        rows = fetched;
      }
    } catch {
      rows = readLocalNotifications(clubId);
    }

    return rows.filter((n) => doesNotificationMatchUser(n, ctx));
  },

  async dispatchTestPlanningNotification(
    input: DispatchTestPlanningNotificationInput
  ): Promise<DashboardNotification | null> {
    const clubId = await getMyClubId();
    const { data: sessionRes } = await supabase.auth.getSession();
    const authData = { user: sessionRes?.session?.user ?? null };
    const now = new Date().toISOString();

    const cleanCategories = Array.from(
      new Set((input.categories || []).map((c) => normalizeAgeCategory(c)).filter(Boolean))
    );
    const targetRoles =
      input.targetRoles && input.targetRoles.length > 0 ? input.targetRoles : ['coach'];

    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const record: DashboardNotification = {
      id,
      club_id: clubId,
      target_user_id: null,
      target_roles: targetRoles,
      target_categories: cleanCategories,
      type: input.type,
      title: input.title,
      message: input.message,
      link_url: input.linkUrl || '/recruitment-v2?tab=sessions',
      metadata: {
        ...(input.metadata || {}),
        categories: cleanCategories,
      },
      read_by: authData?.user?.id ? [authData.user.id] : [],
      created_by: authData?.user?.id || null,
      created_at: now,
    };

    if (isRemoteDashboardNotificationsUnavailable()) {
      const localRows = readLocalNotifications(clubId);
      writeLocalNotifications(clubId, [record, ...localRows]);
    } else {
      try {
        const { data, error } = await getNotificationsTable()
          .insert({
            id: record.id,
            club_id: record.club_id,
            target_user_id: record.target_user_id,
            target_roles: record.target_roles,
            target_categories: record.target_categories,
            type: record.type,
            title: record.title,
            message: record.message,
            link_url: record.link_url,
            metadata: record.metadata,
            read_by: record.read_by,
            created_by: record.created_by,
            created_at: record.created_at,
          })
          .select()
          .single();

        if (error || !data) {
          if (isMissingTableError(error)) {
            markRemoteTableUnavailable();
          }
          const localRows = readLocalNotifications(clubId);
          writeLocalNotifications(clubId, [record, ...localRows]);
        } else {
          const saved = data as DashboardNotification;
          const localRows = readLocalNotifications(clubId);
          writeLocalNotifications(clubId, [saved, ...localRows.filter((x) => x.id !== saved.id)]);
        }
      } catch {
        const localRows = readLocalNotifications(clubId);
        writeLocalNotifications(clubId, [record, ...localRows]);
      }
    }

    // Diffusion temps réel immédiate vers tous les onglets Dashboard connectés
    try {
      await supabase.channel(DASHBOARD_NOTIFICATIONS_CHANNEL).send({
        type: 'broadcast',
        event: 'dashboard_notification',
        payload: record,
      });
    } catch {
      // Silencieux si hors ligne
    }

    return record;
  },

  async markAsRead(notif: DashboardNotification, userId?: string | null): Promise<void> {
    if (!userId) return;
    markLocalReadIds(userId, [notif.id]);
    if (notif.isVirtual) return;

    const updatedReadBy = Array.from(new Set([...(notif.read_by || []), userId]));
    const clubId = notif.club_id || (await getMyClubId());
    const localRows = readLocalNotifications(clubId).map((n) =>
      n.id === notif.id ? { ...n, read_by: updatedReadBy } : n
    );
    writeLocalNotifications(clubId, localRows);

    if (isRemoteDashboardNotificationsUnavailable()) return;

    try {
      const { error } = await getNotificationsTable()
        .update({ read_by: updatedReadBy })
        .eq('id', notif.id);
      if (isMissingTableError(error)) {
        markRemoteTableUnavailable();
      }
    } catch {
      // Déjà enregistré en local
    }
  },

  async markAllAsRead(notifications: DashboardNotification[], userId?: string | null): Promise<void> {
    if (!userId || notifications.length === 0) return;
    markLocalReadIds(
      userId,
      notifications.map((n) => n.id)
    );

    const persisted = notifications.filter((n) => !n.isVirtual && !isNotificationReadForUser(n, userId));
    for (const notif of persisted) {
      await this.markAsRead(notif, userId);
    }
  },
};
