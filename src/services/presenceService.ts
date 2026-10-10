import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/**
 * Présence temps réel des collaborateurs (Supabase Realtime Presence).
 *
 * Contrairement au champ `user_sessions.status` (qui reste ACTIVE si l'onglet est fermé
 * sans déconnexion), la présence disparaît automatiquement quand le client se déconnecte
 * du WebSocket (fermeture d'onglet, perte réseau, mise en veille...).
 */

export type PresenceActivity = 'active' | 'idle';

/** Statut de présence affiché dans l'UI */
export type PresenceStatus = 'ONLINE' | 'IDLE' | 'OFFLINE';

export interface PresenceEntry {
  user_id: string;
  email: string | null;
  state: PresenceActivity;
  online_at: string;
}

type Listener = (snapshot: Map<string, PresenceEntry>) => void;

const CHANNEL_NAME = 'fus-dashboard-presence';

class PresenceService {
  private channel: RealtimeChannel | null = null;
  private userId: string | null = null;
  private payload: PresenceEntry | null = null;
  private subscribed = false;
  private snapshot = new Map<string, PresenceEntry>();
  private listeners = new Set<Listener>();

  /** Rejoint le canal de présence pour l'utilisateur connecté */
  connect(user: { id: string; email: string | null }) {
    if (this.channel && this.userId === user.id) return;
    this.disconnect();

    this.userId = user.id;
    this.payload = {
      user_id: user.id,
      email: user.email ? user.email.toLowerCase().trim() : null,
      state: 'active',
      online_at: new Date().toISOString()
    };

    const channel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: user.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => this.handleSync())
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this.subscribed = true;
          if (this.payload) await channel.track(this.payload);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          this.subscribed = false;
        }
      });

    this.channel = channel;
  }

  /** Met à jour l'état actif / inactif de l'utilisateur courant */
  setActivity(state: PresenceActivity) {
    if (!this.payload || this.payload.state === state) return;
    this.payload = { ...this.payload, state };
    if (this.channel && this.subscribed) {
      this.channel.track(this.payload).catch(() => {});
    }
  }

  /** Quitte le canal (déconnexion) */
  disconnect() {
    if (this.channel) {
      const ch = this.channel;
      ch.untrack().catch(() => {});
      supabase.removeChannel(ch);
    }
    this.channel = null;
    this.userId = null;
    this.payload = null;
    this.subscribed = false;
    this.snapshot = new Map();
    this.emit();
  }

  /** S'abonne aux changements de présence. Retourne la fonction de désabonnement. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private handleSync() {
    if (!this.channel) return;
    const raw = this.channel.presenceState<PresenceEntry>();
    const next = new Map<string, PresenceEntry>();

    Object.values(raw).forEach((metas) => {
      if (!metas || metas.length === 0) return;
      // Plusieurs onglets possibles : l'utilisateur est actif si au moins un onglet l'est
      const anyActive = metas.some((m) => m.state === 'active');
      const base = metas[0];
      const entry: PresenceEntry = {
        user_id: base.user_id,
        email: base.email,
        state: anyActive ? 'active' : 'idle',
        online_at: base.online_at
      };
      if (entry.user_id) next.set(entry.user_id, entry);
      if (entry.email) next.set(entry.email, entry);
    });

    this.snapshot = next;
    this.emit();
  }

  private emit() {
    this.listeners.forEach((l) => l(this.snapshot));
  }
}

export const PresenceTracker = new PresenceService();

/** Résout le statut de présence d'un utilisateur à partir du snapshot temps réel */
export const resolvePresenceStatus = (
  snapshot: Map<string, PresenceEntry>,
  userId: string | null,
  email: string | null
): PresenceStatus => {
  const entry =
    (userId ? snapshot.get(userId) : undefined) ||
    (email ? snapshot.get(email.toLowerCase().trim()) : undefined);
  if (!entry) return 'OFFLINE';
  return entry.state === 'active' ? 'ONLINE' : 'IDLE';
};

/** Styles et libellés partagés pour les 3 états de présence */
export const PRESENCE_META: Record<PresenceStatus, {
  label: string;
  dot: string;
  ping: string | null;
  badge: string;
  banner: string;
  title: string;
}> = {
  ONLINE: {
    label: 'En ligne',
    dot: 'bg-emerald-500',
    ping: 'bg-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    banner: 'bg-emerald-500',
    title: 'Connecté et actif'
  },
  IDLE: {
    label: 'Inactif',
    dot: 'bg-amber-500',
    ping: null,
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    banner: 'bg-amber-500',
    title: 'Connecté mais inactif'
  },
  OFFLINE: {
    label: 'Déconnecté',
    dot: 'bg-muted-foreground/40',
    ping: null,
    badge: 'bg-secondary text-muted-foreground border-border',
    banner: 'bg-transparent',
    title: 'Session déconnectée'
  }
};
