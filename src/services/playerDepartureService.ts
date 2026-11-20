import { supabase } from '../lib/supabase';
import { getMyClubId } from './_helpers';

export type DepartureType =
  | 'transfer'
  | 'loan'
  | 'release'
  | 'end_of_contract'
  | 'retirement'
  | 'other';

export type DepartureStatus = 'planned' | 'completed' | 'cancelled';

export interface DeparturePlayerSummary {
  id: string;
  full_name: string;
  jersey_number?: number | null;
  position?: string | null;
  photo_url?: string | null;
  team_id?: string | null;
  is_active?: boolean;
}

export interface PlayerDeparture {
  id: string;
  club_id: string | null;
  player_id: string;
  team_id: string | null;
  departure_type: DepartureType;
  status: DepartureStatus;
  departure_date: string;
  destination_club: string;
  transfer_fee: number | null;
  currency: string;
  reason: string;
  notes: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  player?: DeparturePlayerSummary;
}

export interface CreatePlayerDepartureInput {
  player_id: string;
  team_id?: string | null;
  departure_type: DepartureType;
  status: DepartureStatus;
  departure_date: string;
  destination_club?: string;
  transfer_fee?: number | null;
  currency?: string;
  reason?: string;
  notes?: string;
  /** Synchronise players.is_active (désactive le joueur sur sortie définitive finalisée). */
  deactivate_player?: boolean;
}

export interface UpdatePlayerDepartureInput {
  departure_type?: DepartureType;
  status?: DepartureStatus;
  departure_date?: string;
  destination_club?: string;
  transfer_fee?: number | null;
  currency?: string;
  reason?: string;
  notes?: string;
  deactivate_player?: boolean;
}

export const DEPARTURE_TYPE_META: Record<
  DepartureType,
  { label: string; shortLabel: string; badgeClass: string; permanentByDefault: boolean }
> = {
  transfer: {
    label: 'Transfert définitif',
    shortLabel: 'Transfert',
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    permanentByDefault: true,
  },
  loan: {
    label: 'Prêt',
    shortLabel: 'Prêt',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    permanentByDefault: false,
  },
  release: {
    label: 'Libération / Résiliation',
    shortLabel: 'Libéré',
    badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    permanentByDefault: true,
  },
  end_of_contract: {
    label: 'Fin de contrat',
    shortLabel: 'Fin contrat',
    badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30',
    permanentByDefault: true,
  },
  retirement: {
    label: 'Retraite sportive',
    shortLabel: 'Retraite',
    badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    permanentByDefault: true,
  },
  other: {
    label: 'Autre sortie',
    shortLabel: 'Autre',
    badgeClass: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30',
    permanentByDefault: true,
  },
};

export const DEPARTURE_STATUS_META: Record<
  DepartureStatus,
  { label: string; badgeClass: string }
> = {
  completed: {
    label: 'Actée',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  planned: {
    label: 'Planifiée',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  cancelled: {
    label: 'Annulée',
    badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  },
};

const STORAGE_KEY_PREFIX = 'fus_player_departures_v1_';

interface PostgrestErrorLike {
  code?: string;
  message?: string;
}

interface DeparturesTableQuery {
  select: (columns?: string) => {
    eq: (col: string, val: string) => {
      order: (col: string, opts: { ascending: boolean }) => {
        order: (col: string, opts: { ascending: boolean }) => Promise<{ data: PlayerDeparture[] | null; error: PostgrestErrorLike | null }>;
      };
    };
  };
  insert: (payload: Record<string, unknown>) => {
    select: () => {
      single: () => Promise<{ data: PlayerDeparture | null; error: PostgrestErrorLike | null }>;
    };
  };
  update: (payload: Record<string, unknown>) => {
    eq: (col: string, val: string) => {
      select: () => {
        single: () => Promise<{ data: PlayerDeparture | null; error: PostgrestErrorLike | null }>;
      };
    };
  };
  delete: () => {
    eq: (col: string, val: string) => Promise<{ error: PostgrestErrorLike | null }>;
  };
}

function getDeparturesTable(): DeparturesTableQuery {
  return (supabase as unknown as { from: (table: string) => DeparturesTableQuery }).from('player_departures');
}

function isMissingTableError(error: PostgrestErrorLike | null | undefined): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  );
}

function readLocalDepartures(clubId: string): PlayerDeparture[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${clubId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalDepartures(clubId: string, rows: PlayerDeparture[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${clubId}`, JSON.stringify(rows));
  } catch {
    // Ignore storage quota errors
  }
}

export function shouldDeactivateOnDeparture(
  status: DepartureStatus,
  departureType: DepartureType
): boolean {
  return status === 'completed' && DEPARTURE_TYPE_META[departureType].permanentByDefault;
}

export async function getClubPlayersIncludingInactive(): Promise<DeparturePlayerSummary[]> {
  const clubId = await getMyClubId();
  const { data, error } = await supabase
    .from('players')
    .select('id, full_name, jersey_number, position, photo_url, team_id, is_active')
    .eq('club_id', clubId)
    .order('jersey_number', { ascending: true });

  if (error) {
    console.error('[playerDepartureService] getClubPlayersIncludingInactive error:', error);
    return [];
  }

  return (data || []) as DeparturePlayerSummary[];
}

async function syncPlayerActiveStatus(playerId: string, isActive: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('players')
      .update({ is_active: isActive })
      .eq('id', playerId);

    if (error) {
      console.error('[playerDepartureService] syncPlayerActiveStatus error:', error);
    }
  } catch (err) {
    console.error('[playerDepartureService] syncPlayerActiveStatus exception:', err);
  }
}

function enrichWithPlayers(
  departures: PlayerDeparture[],
  players: DeparturePlayerSummary[]
): PlayerDeparture[] {
  const byId = new Map<string, DeparturePlayerSummary>();
  players.forEach(p => byId.set(p.id, p));
  return departures.map(dep => ({
    ...dep,
    player: dep.player || byId.get(dep.player_id),
  }));
}

export const playerDepartureService = {
  async getDepartures(): Promise<PlayerDeparture[]> {
    const clubId = await getMyClubId();
    const players = await getClubPlayersIncludingInactive();

    const { data, error } = await getDeparturesTable()
      .select('*')
      .eq('club_id', clubId)
      .order('departure_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) {
        return enrichWithPlayers(readLocalDepartures(clubId), players);
      }
      console.error('[playerDepartureService] getDepartures error:', error);
      return [];
    }

    const rows = (data || []) as PlayerDeparture[];
    writeLocalDepartures(clubId, rows);
    return enrichWithPlayers(rows, players);
  },

  async createDeparture(input: CreatePlayerDepartureInput): Promise<PlayerDeparture> {
    const clubId = await getMyClubId();
    const { data: authData } = await supabase.auth.getUser();
    const now = new Date().toISOString();

    const payload = {
      club_id: clubId,
      player_id: input.player_id,
      team_id: input.team_id || null,
      departure_type: input.departure_type,
      status: input.status,
      departure_date: input.departure_date,
      destination_club: (input.destination_club || '').trim(),
      transfer_fee: input.transfer_fee ?? null,
      currency: input.currency || 'MAD',
      reason: (input.reason || '').trim(),
      notes: (input.notes || '').trim(),
      created_by: authData?.user?.id || null,
      created_at: now,
      updated_at: now,
    };

    const shouldDeactivate =
      input.deactivate_player !== undefined
        ? input.deactivate_player && input.status === 'completed'
        : shouldDeactivateOnDeparture(input.status, input.departure_type);

    const { data, error } = await getDeparturesTable()
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (!isMissingTableError(error)) {
        throw new Error(error.message || "Erreur lors de l'enregistrement de la sortie.");
      }

      const localRow: PlayerDeparture = {
        id: crypto.randomUUID ? crypto.randomUUID() : `dep_${Date.now()}`,
        ...payload,
      };
      const existing = readLocalDepartures(clubId);
      writeLocalDepartures(clubId, [localRow, ...existing]);

      if (shouldDeactivate) {
        await syncPlayerActiveStatus(input.player_id, false);
      }
      return localRow;
    }

    if (shouldDeactivate) {
      await syncPlayerActiveStatus(input.player_id, false);
    }

    return data as PlayerDeparture;
  },

  async updateDeparture(
    id: string,
    updates: UpdatePlayerDepartureInput
  ): Promise<PlayerDeparture> {
    const clubId = await getMyClubId();
    const now = new Date().toISOString();

    const { deactivate_player, ...dbUpdates } = updates;
    const cleanUpdates = {
      ...dbUpdates,
      updated_at: now,
    };

    const { data, error } = await getDeparturesTable()
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (!isMissingTableError(error)) {
        throw new Error(error.message || 'Erreur lors de la mise à jour de la sortie.');
      }

      const existing = readLocalDepartures(clubId);
      const target = existing.find(item => item.id === id);
      if (!target) {
        throw new Error('Dossier de sortie introuvable.');
      }
      const updatedRow: PlayerDeparture = {
        ...target,
        ...cleanUpdates,
      } as PlayerDeparture;
      writeLocalDepartures(
        clubId,
        existing.map(item => (item.id === id ? updatedRow : item))
      );

      if (deactivate_player !== undefined) {
        const shouldBeInactive =
          deactivate_player && updatedRow.status === 'completed';
        await syncPlayerActiveStatus(updatedRow.player_id, !shouldBeInactive);
      } else if (updatedRow.status === 'cancelled' || updatedRow.status === 'planned') {
        await syncPlayerActiveStatus(updatedRow.player_id, true);
      } else {
        const deactivate = shouldDeactivateOnDeparture(
          updatedRow.status,
          updatedRow.departure_type
        );
        await syncPlayerActiveStatus(updatedRow.player_id, !deactivate);
      }

      return updatedRow;
    }

    const updatedRow = data as PlayerDeparture;
    if (deactivate_player !== undefined) {
      const shouldBeInactive = deactivate_player && updatedRow.status === 'completed';
      await syncPlayerActiveStatus(updatedRow.player_id, !shouldBeInactive);
    } else if (updatedRow.status === 'cancelled' || updatedRow.status === 'planned') {
      await syncPlayerActiveStatus(updatedRow.player_id, true);
    } else {
      const deactivate = shouldDeactivateOnDeparture(
        updatedRow.status,
        updatedRow.departure_type
      );
      await syncPlayerActiveStatus(updatedRow.player_id, !deactivate);
    }

    return updatedRow;
  },

  async deleteDeparture(
    id: string,
    playerId: string,
    reintegratePlayer = true
  ): Promise<void> {
    const clubId = await getMyClubId();
    const { error } = await getDeparturesTable()
      .delete()
      .eq('id', id);

    if (error) {
      if (!isMissingTableError(error)) {
        throw new Error(error.message || 'Erreur lors de la suppression de la sortie.');
      }
      const existing = readLocalDepartures(clubId);
      writeLocalDepartures(
        clubId,
        existing.filter(item => item.id !== id)
      );
    } else {
      const existing = readLocalDepartures(clubId);
      writeLocalDepartures(
        clubId,
        existing.filter(item => item.id !== id)
      );
    }

    if (reintegratePlayer && playerId) {
      await syncPlayerActiveStatus(playerId, true);
    }
  },
};
