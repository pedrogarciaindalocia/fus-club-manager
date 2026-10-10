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
};

export function loadQueue(): QueueEntry[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
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
    } catch (err) {
      console.error('Failed to sync operation:', entry.op, err);
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
    const { localId: _, ...payload } = op.payload;
    const { error } = await supabase.from('match_events').insert([payload]);
    if (error) throw error;
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
    const { error } = await supabase.from('matches').update(op.updates).eq('id', op.matchId);
    if (error) throw error;
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
