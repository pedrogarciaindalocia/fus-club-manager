import { supabase } from '../lib/supabase';

const QUEUE_KEY = 'fus_dashboard_offline_queue';

export type QueuedOperation =
  | { kind: 'insert_event'; localId: string; payload: Record<string, any> }
  | { kind: 'update_event'; eventId: string; updates: Record<string, any> }
  | { kind: 'delete_event'; eventId: string }
  | { kind: 'update_match'; matchId: string; updates: Record<string, any> };

export type QueueEntry = {
  id: string;
  op: QueuedOperation;
  matchId?: string;
  createdAt: number;
  synced: boolean;
  retries?: number;
};

export function loadQueue(): QueueEntry[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Discard any poison entries that have already failed repeatedly
    return parsed.filter((e: any) => e && e.op && e.op.kind && (e.retries || 0) < 3);
  } catch {
    return [];
  }
}

export function saveQueue(queue: QueueEntry[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(op: QueuedOperation, matchId?: string): void {
  const queue = loadQueue();
  queue.push({
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    op,
    matchId,
    createdAt: Date.now(),
    synced: false,
    retries: 0,
  });
  saveQueue(queue);
}

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const queue = loadQueue();
  const pending = queue.filter(e => !e.synced).sort((a, b) => a.createdAt - b.createdAt);
  
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const entry of pending) {
    try {
      await applyOperation(entry.op);
      entry.synced = true;
      synced++;
    } catch (err: any) {
      console.error('Failed to sync operation:', entry.op, err);
      entry.retries = (entry.retries || 0) + 1;

      const status = err?.status || err?.statusCode || (err?.code === 'PGRST204' ? 400 : 0);
      const code = String(err?.code || '');
      const msg = String(err?.message || '').toLowerCase();

      // Permanent non-retryable errors (e.g. 400 Bad Request, schema/column errors, foreign key violations, invalid uuid)
      const isPermanentError =
        status === 400 ||
        status === 404 ||
        code === 'PGRST204' ||
        code === 'PGRST205' ||
        code === '22P02' ||
        code === '42703' ||
        code === '23503' ||
        msg.includes('schema cache') ||
        msg.includes('could not find the') ||
        msg.includes('invalid input syntax') ||
        entry.retries >= 3;

      if (isPermanentError) {
        console.warn('[OfflineQueue] Dropping unrecoverable operation to avoid infinite error loop:', entry.op);
        entry.synced = true; // Mark as done to remove from pending queue
      }

      failed++;
    }
  }

  saveQueue(queue.filter(e => !e.synced));
  return { synced, failed };
}

// -------------------------------------------------------
// Command Pattern: Extensible Offline Operation Registry
// -------------------------------------------------------

export type CommandExecutor<T extends QueuedOperation = QueuedOperation> = (op: T) => Promise<void>;

const commandRegistry: {
  [K in QueuedOperation['kind']]: CommandExecutor<Extract<QueuedOperation, { kind: K }>>;
} = {
  insert_event: async (op) => {
    const { localId: _, ...payload } = (op.payload || {}) as Record<string, any>;
    if (typeof payload.id === 'string' && payload.id.startsWith('local_')) {
      delete payload.id;
    }
    ['player_id', 'assist_player_id', 'sub_in_player_id', 'sub_out_player_id'].forEach(f => {
      if (payload[f] === '') payload[f] = null;
    });
    const { error } = await supabase.from('match_events').insert([payload]);
    if (error) throw error;
    try {
      supabase.functions.invoke('send-match-push', { body: { record: payload } }).catch(() => {});
    } catch {}
  },
  update_event: async (op) => {
    const { error } = await supabase.from('match_events').update(op.updates).eq('id', op.eventId);
    if (error) throw error;
  },
  delete_event: async (op) => {
    const { error } = await supabase.from('match_events').delete().eq('id', op.eventId);
    if (error) throw error;
  },
  update_match: async (op) => {
    const sanitized: Record<string, any> = { ...(op.updates || {}) };

    // Strip relation / joined / non-column properties
    const ignoredFields = [
      'id', 'created_at', 'match_players', 'match_staff',
      'team', 'opponent', 'league', 'stadium',
      'referee_central', 'referee_assistant1', 'referee_assistant2', 'referee_fourth', 'referee_commissaire'
    ];
    ignoredFields.forEach(f => delete sanitized[f]);

    // Handle lineup / format if nested
    if (sanitized.lineup) {
      sanitized.lineup = {
        ...sanitized.lineup,
        match_type: sanitized.match_type || sanitized.lineup.match_type,
        match_format: sanitized.match_format || sanitized.lineup.match_format,
      };
    }
    delete sanitized.match_type;
    delete sanitized.match_format;

    // Convert empty string UUIDs to null
    ['opponent_id', 'league_id', 'stadium_id', 'team_id', 'club_id', 'referee_central_id', 'referee_assistant1_id', 'referee_assistant2_id', 'referee_fourth_id', 'referee_commissaire_id'].forEach(f => {
      if (sanitized[f] === '') sanitized[f] = null;
    });

    const { error } = await supabase.from('matches').update(sanitized).eq('id', op.matchId);
    if (error) {
      const isColumnError = error.code === 'PGRST204' || error.code === 'PGRST205' ||
        error.message?.includes('referee_') || error.message?.includes('opponent_lineup') ||
        error.message?.includes('column') || (error as any)?.status === 400;

      if (isColumnError) {
        delete sanitized.referee_central_id;
        delete sanitized.referee_assistant1_id;
        delete sanitized.referee_assistant2_id;
        delete sanitized.referee_fourth_id;
        delete sanitized.referee_commissaire_id;
        delete sanitized.referees_assigned;
        delete sanitized.opponent_lineup;
        delete sanitized.opponent_subs;
        const { error: retryError } = await supabase.from('matches').update(sanitized).eq('id', op.matchId);
        if (retryError) throw retryError;
        return;
      }
      throw error;
    }
  },
};

/** Enregistre ou remplace un exécuteur de commande (Open/Closed Principle) */
export function registerCommandExecutor<K extends QueuedOperation['kind']>(
  kind: K,
  executor: CommandExecutor<Extract<QueuedOperation, { kind: K }>>
): void {
  commandRegistry[kind] = executor;
}

async function applyOperation(op: QueuedOperation): Promise<void> {
  const handler = commandRegistry[op.kind] as CommandExecutor<QueuedOperation> | undefined;
  if (!handler) {
    throw new Error(`Aucun exécuteur de commande enregistré pour le type : ${op.kind}`);
  }
  await handler(op);
}
