import { supabase } from '../lib/supabase';
import { resolveCanonicalJobTitle } from '../constants/roles';
import { dispatchMatchPushNotification } from './pushNotificationSender';
import type { CrudAction } from '../utils/permissionHelpers';

export const FUS_APP_FULL_MATCH_KEYS = [
  'live_tracking',
  'modify_match',
  'change_formation',
  'postpone_match',
  'evaluate_players',
] as const;

export interface OperatorCandidate {
  id: string;
  full_name: string;
  job_title: string | null;
  system_role: string | null;
  avatar_url: string | null;
}

export interface OperatorHistoryEntry {
  id: string;
  timestamp: string;
  action: 'assigned' | 'reassigned' | 'live_handover' | 'unassigned';
  is_live: boolean;
  minute: number | null;
  previous_operator_id: string | null;
  previous_operator_name: string | null;
  new_operator_id: string | null;
  new_operator_name: string | null;
  new_operator_role: string | null;
  reason: string | null;
  changed_by_id: string | null;
  changed_by_name: string;
}

export interface OperatorAssignmentResult {
  id: string | null;
  name: string | null;
  role: string | null;
  avatar_url: string | null;
  permissions: Record<string, boolean> | null;
  lineup: Record<string, any>;
  historyEntry: OperatorHistoryEntry;
}

export function isLiveMatchStatus(status?: string | null): boolean {
  const norm = String(status || '').trim().toLowerCase();
  return (
    norm === 'live' ||
    norm === 'halftime' ||
    norm === 'first_half' ||
    norm === 'second_half' ||
    norm === 'extra_time_first' ||
    norm === 'extra_time_second' ||
    norm === 'et_first' ||
    norm === 'et_break' ||
    norm === 'et_second' ||
    norm === 'et_finished' ||
    norm === 'penalties'
  );
}

export function isOperatorEditableMatchStatus(status?: string | null): boolean {
  const norm = String(status || '').trim().toLowerCase();
  if (!norm) return true;
  if (
    norm === 'finished' ||
    norm === 'completed' ||
    norm === 'forfait' ||
    norm === 'cancelled' ||
    norm === 'canceled'
  ) {
    return false;
  }
  return true;
}

export function canUserAssignMatchOperator(params: {
  isSuperAdmin?: boolean;
  systemRole?: string | null;
  can?: (perm: string) => boolean;
  hasSpecificActionAccess?: (
    subModule: string,
    specificAction: string,
    crudAction?: CrudAction
  ) => boolean;
}): boolean {
  if (params.isSuperAdmin) return true;
  const normRole = String(params.systemRole || '').trim().toLowerCase();
  if (normRole === 'super_admin' || normRole === 'admin') return true;
  if (params.can?.('assign_operator')) return true;
  if (params.hasSpecificActionAccess?.('matches', 'assign_operator', 'create')) return true;
  if (params.hasSpecificActionAccess?.('matches', 'assign_operator', 'update')) return true;
  return false;
}

export function resolveOperatorRoleLabel(op: Pick<OperatorCandidate, 'job_title' | 'system_role'>): string {
  if (op.job_title) return op.job_title;
  const sys = String(op.system_role || '').toLowerCase();
  if (sys === 'super_admin') return 'Super Administrateur';
  if (sys === 'admin') return 'Admin Club';
  return 'Opérateur Live';
}

export function buildFullOperatorPermissionsMap(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  FUS_APP_FULL_MATCH_KEYS.forEach((k) => {
    map[k] = true;
  });
  return map;
}

export async function fetchEligibleOperators(): Promise<OperatorCandidate[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, first_name, last_name, job_title, system_role, avatar_url, is_active')
    .order('full_name', { ascending: true });

  if (error || !data) {
    if (error) throw error;
    return [];
  }

  return data
    .filter((u: any) => {
      if (u.is_active === false) return false;
      const normSys = String(u.system_role || '').toLowerCase();
      const normJob = String(u.job_title || '').toLowerCase();
      if (
        normSys.includes('scout') ||
        normJob.includes('scout') ||
        normJob.includes('détection') ||
        normJob.includes('recruteur')
      ) {
        return false;
      }
      return true;
    })
    .map((u: any) => {
      const fullName =
        u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Collaborateur';
      return {
        id: u.id,
        full_name: fullName,
        job_title: resolveCanonicalJobTitle(u.job_title) || u.job_title || null,
        system_role: u.system_role || null,
        avatar_url: u.avatar_url || null,
      };
    });
}

async function sendChannelBroadcast(
  channelName: string,
  event: string,
  payload: Record<string, any>
): Promise<void> {
  const ch = supabase.channel(channelName);
  try {
    await ch.send({
      type: 'broadcast',
      event,
      payload,
    });
  } catch {
    // Non-bloquant
  } finally {
    void supabase.removeChannel(ch);
  }
}

export async function grantOperatorOverrides(operatorId: string): Promise<void> {
  if (!operatorId) return;
  await supabase
    .from('user_permissions_overrides')
    .delete()
    .eq('user_id', operatorId)
    .in('permission_id', [...FUS_APP_FULL_MATCH_KEYS]);

  const permsToInsert = FUS_APP_FULL_MATCH_KEYS.map((k) => ({
    user_id: operatorId,
    permission_id: k,
  }));
  await supabase.from('user_permissions_overrides').insert(permsToInsert);

  await sendChannelBroadcast(`user:${operatorId}:permissions`, 'permissions_updated', {
    user_id: operatorId,
    granted: true,
    message: 'Vos permissions terrain FUS-APP ont été activées.',
  });
}

export async function revokeOperatorOverridesIfNoActiveMatches(
  operatorId: string,
  excludeMatchId: string,
  reasonMessage?: string
): Promise<void> {
  if (!operatorId) return;
  try {
    const { count } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('live_operator_id', operatorId)
      .neq('id', excludeMatchId)
      .in('status', ['scheduled', 'programmed', 'upcoming', 'live', 'halftime']);

    if (!count || count === 0) {
      await supabase
        .from('user_permissions_overrides')
        .delete()
        .eq('user_id', operatorId)
        .in('permission_id', [...FUS_APP_FULL_MATCH_KEYS]);

      await sendChannelBroadcast(`user:${operatorId}:permissions`, 'permissions_updated', {
        user_id: operatorId,
        revoked: true,
        message:
          reasonMessage ||
          'Relève opérateur effectuée : vos permissions temporaires terrain ont été révoquées.',
      });
    }
  } catch (err) {
    console.warn('[operatorAssignmentService] Erreur révocation conditionnelle:', err);
  }
}

export async function assignOrHandoverMatchOperator(params: {
  match: {
    id: string;
    status?: string | null;
    category?: string | null;
    lineup?: any;
    live_operator_id?: string | null;
    live_operator_name?: string | null;
    time_elapsed_seconds?: number | null;
  };
  newOperator: OperatorCandidate | null;
  opponentName: string;
  changedBy?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
  };
  handoverReason?: string;
  matchMinute?: number | null;
}): Promise<OperatorAssignmentResult> {
  const { match, newOperator, opponentName, changedBy, handoverReason, matchMinute } = params;
  const nowIso = new Date().toISOString();

  // 1. Lire l'état frais du match pour ne jamais écraser la composition/changements en cours de live
  let freshMatch: any = null;
  try {
    const { data } = await supabase
      .from('matches')
      .select('id, status, category, lineup, live_operator_id, live_operator_name, time_elapsed_seconds')
      .eq('id', match.id)
      .maybeSingle();
    freshMatch = data;
  } catch {
    // Fallback sur l'objet match local
  }

  const effectiveStatus = freshMatch?.status ?? match.status ?? 'scheduled';
  const effectiveCategory = freshMatch?.category ?? match.category ?? 'FUS';
  const isLive = isLiveMatchStatus(effectiveStatus);

  const curLineup =
    freshMatch?.lineup && typeof freshMatch.lineup === 'object'
      ? { ...freshMatch.lineup }
      : match.lineup && typeof match.lineup === 'object'
      ? { ...match.lineup }
      : {};

  const previousOpId: string | null =
    freshMatch?.live_operator_id ||
    curLineup?.live_operator?.id ||
    match.live_operator_id ||
    null;
  const previousOpName: string | null =
    freshMatch?.live_operator_name ||
    curLineup?.live_operator?.name ||
    match.live_operator_name ||
    null;

  const elapsedSeconds = freshMatch?.time_elapsed_seconds ?? match.time_elapsed_seconds ?? 0;
  const resolvedMinute =
    isLive ? (typeof matchMinute === 'number' ? matchMinute : Math.floor((elapsedSeconds || 0) / 60)) : null;

  const opRole = newOperator ? resolveOperatorRoleLabel(newOperator) : null;
  const fullPermsMap = newOperator ? buildFullOperatorPermissionsMap() : null;

  const actionType: OperatorHistoryEntry['action'] = !newOperator
    ? 'unassigned'
    : previousOpId && previousOpId !== newOperator.id
    ? isLive
      ? 'live_handover'
      : 'reassigned'
    : 'assigned';

  const historyEntry: OperatorHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: nowIso,
    action: actionType,
    is_live: isLive,
    minute: resolvedMinute,
    previous_operator_id: previousOpId,
    previous_operator_name: previousOpName,
    new_operator_id: newOperator?.id || null,
    new_operator_name: newOperator?.full_name || null,
    new_operator_role: opRole,
    reason: handoverReason?.trim() || null,
    changed_by_id: changedBy?.id || null,
    changed_by_name: changedBy?.name || changedBy?.email || 'Administration Club',
  };

  const prevHistory = Array.isArray(curLineup.operator_history) ? curLineup.operator_history : [];
  const updatedLineup: Record<string, any> = {
    ...curLineup,
    live_operator: newOperator
      ? {
          id: newOperator.id,
          name: newOperator.full_name,
          role: opRole,
          avatar_url: newOperator.avatar_url || null,
          permissions: fullPermsMap,
          status: 'pending',
          acknowledged_at: null,
          assigned_at: nowIso,
          handover_from_id: previousOpId && previousOpId !== newOperator.id ? previousOpId : null,
          handover_from_name: previousOpId && previousOpId !== newOperator.id ? previousOpName : null,
          handover_reason: handoverReason?.trim() || null,
        }
      : null,
    operator_history: [historyEntry, ...prevHistory].slice(0, 30),
  };

  // 2. Activer immédiatement les permissions du nouvel opérateur avant la mise à jour Realtime
  if (newOperator) {
    await grantOperatorOverrides(newOperator.id);
  }

  // 3. Mettre à jour uniquement les colonnes opérateur + lineup (sans toucher au chrono ni au score)
  const fullUpdatePayload: Record<string, any> = {
    live_operator_id: newOperator?.id || null,
    live_operator_name: newOperator?.full_name || null,
    live_operator_role: opRole,
    live_operator_avatar_url: newOperator?.avatar_url || null,
    live_operator_status: newOperator ? 'pending' : null,
    live_operator_acknowledged_at: null,
    live_operator_permissions: newOperator ? [...FUS_APP_FULL_MATCH_KEYS] : null,
    lineup: updatedLineup,
  };

  const { error: fullErr } = await supabase
    .from('matches')
    .update(fullUpdatePayload)
    .eq('id', match.id);

  if (fullErr) {
    // Repli résilient si certaines colonnes optionnelles n'existent pas
    const fallbackPayload: Record<string, any> = {
      live_operator_id: newOperator?.id || null,
      live_operator_name: newOperator?.full_name || null,
      live_operator_role: opRole,
      live_operator_avatar_url: newOperator?.avatar_url || null,
      lineup: updatedLineup,
    };
    const { error: fallbackErr } = await supabase
      .from('matches')
      .update(fallbackPayload)
      .eq('id', match.id);
    if (fallbackErr) throw fallbackErr;
  }

  // 4. Révoquer immédiatement les permissions de l'opérateur sortant et diffuser le signal de relève temps réel
  const isOperatorReplaced = Boolean(
    previousOpId && (!newOperator || String(previousOpId).toLowerCase() !== String(newOperator.id).toLowerCase())
  );

  if (isOperatorReplaced && previousOpId) {
    const revokeMsg = newOperator
      ? `Relève opérateur : le match FUS vs ${opponentName} a été transféré à ${newOperator.full_name}. Mode consultation activé.`
      : `Vous n'êtes plus assigné comme opérateur sur le match FUS vs ${opponentName}.`;

    await revokeOperatorOverridesIfNoActiveMatches(previousOpId, match.id, revokeMsg);

    // Signal temps réel instantané pour verrouiller immédiatement LiveTrackingScreen côté FUS-APP
    void sendChannelBroadcast(`live-operator-handover-${match.id}`, 'operator_handover', {
      match_id: match.id,
      previous_operator_id: previousOpId,
      previous_operator_name: previousOpName,
      new_operator_id: newOperator?.id || null,
      new_operator_name: newOperator?.full_name || null,
      new_operator_role: opRole,
      reason: handoverReason?.trim() || null,
      minute: resolvedMinute,
      timestamp: nowIso,
    });

    void sendChannelBroadcast(`operator-assignments-sub-${previousOpId}`, 'operator_revoked', {
      match_id: match.id,
      operator_id: previousOpId,
      new_operator_id: newOperator?.id || null,
      new_operator_name: newOperator?.full_name || null,
    });

    dispatchMatchPushNotification({
      match_id: match.id,
      type: 'operator_revoked',
      category: effectiveCategory,
      operator_id: previousOpId,
      target_user_id: previousOpId,
      title: isLive
        ? `🔄 Relève Opérateur en Direct [${effectiveCategory}]`
        : `ℹ️ Modification d'Opérateur [${effectiveCategory}]`,
      body: newOperator
        ? `${newOperator.full_name} reprend la gestion du match FUS vs ${opponentName}. Votre écran passe en mode consultation.`
        : `Votre assignation sur le match FUS vs ${opponentName} a été retirée.`,
    }).catch(() => {});
  }

  // 5. Notifier le nouvel opérateur entrant (Broadcast + Push)
  if (newOperator && String(previousOpId || '').toLowerCase() !== String(newOperator.id).toLowerCase()) {
    void sendChannelBroadcast(`operator-assignments-sub-${newOperator.id}`, 'operator_assigned', {
      match_id: match.id,
      operator_id: newOperator.id,
      operator_name: newOperator.full_name,
      is_live_handover: isLive,
    });

    dispatchMatchPushNotification({
      match_id: match.id,
      type: 'operator_assigned',
      category: effectiveCategory,
      operator_id: newOperator.id,
      target_user_id: newOperator.id,
      operator_name: newOperator.full_name,
      operator_role: opRole,
      operator_avatar_url: newOperator.avatar_url || null,
      minute: resolvedMinute ?? undefined,
      title: isLive
        ? `🔴 RELÈVE LIVE IMMÉDIATE [${effectiveCategory}]`
        : `🎙️ Opérateur Match Assigné [${effectiveCategory}]`,
      body: isLive
        ? `Vous reprenez immédiatement les commandes du direct FUS vs ${opponentName}${previousOpName ? ` (relève de ${previousOpName})` : ''}. Chrono et score synchronisés.`
        : `${newOperator.full_name}, vous êtes désigné Opérateur Live pour le match FUS vs ${opponentName}.`,
    }).catch(() => {});
  }

  // 6. Journalisation best-effort dans audit_logs (ne bloque jamais l'opération)
  try {
    const desc = !newOperator
      ? `Retrait de l'opérateur ${previousOpName || ''} sur le match FUS vs ${opponentName}`
      : isLive && previousOpName && previousOpId !== newOperator.id
      ? `Passation Live : remplacement de ${previousOpName} par ${newOperator.full_name}${handoverReason ? ` (${handoverReason})` : ''}`
      : `Assignation de ${newOperator.full_name} comme opérateur FUS-APP pour FUS vs ${opponentName}`;

    await supabase.from('audit_logs').insert({
      action: actionType === 'live_handover' ? 'LIVE_OPERATOR_HANDOVER' : 'ASSIGN_MATCH_OPERATOR',
      entity_type: 'match',
      entity_id: match.id,
      description: desc,
      operator_name: changedBy?.name || 'Administration Club',
      user_email: changedBy?.email || null,
      metadata: {
        match_id: match.id,
        event_type: actionType,
        minute: resolvedMinute,
        previous_operator_id: previousOpId,
        previous_operator_name: previousOpName,
        new_operator_id: newOperator?.id || null,
        new_operator_name: newOperator?.full_name || null,
        reason: handoverReason?.trim() || null,
        operator_name: changedBy?.name || 'Administration Club',
      },
    } as any);
  } catch {
    // Non-bloquant si audit_logs est restreint par RLS
  }

  return {
    id: newOperator?.id || null,
    name: newOperator?.full_name || null,
    role: opRole,
    avatar_url: newOperator?.avatar_url || null,
    permissions: fullPermsMap,
    lineup: updatedLineup,
    historyEntry,
  };
}
