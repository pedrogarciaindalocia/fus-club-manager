import { supabase } from '../lib/supabase';
import { getMyClubId } from './_helpers';
import {
  getMentionMeta,
  normalizeMentionDate,
  type MentionLevel,
  type OfficialSavedShortlistConfig,
  type PlayerMentionEntry,
} from '../utils/playerMentionsHelper';

const KEY_MENTIONS_CACHE = 'fus_player_mentions_cache_v1';
const KEY_OFFICIAL_SHORTLISTS = 'fus_official_saved_shortlists_v1';
const KEY_LEGACY_RECRUITMENT_SHORTLISTS = 'fusc_saved_shortlists_v2';

function ensureUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = (error.code || '').toUpperCase();
  const msg = (error.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table')
  );
}

async function readSettingsPluginsRow(): Promise<{ id: string; plugins: Record<string, any> } | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('id, plugins')
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) return null;
  const plugins = data.plugins && typeof data.plugins === 'object' ? (data.plugins as Record<string, any>) : {};
  return { id: data.id, plugins };
}

async function writeSettingsPluginsKey(key: string, value: unknown): Promise<void> {
  const row = await readSettingsPluginsRow();
  if (!row) return;
  const updatedPlugins = {
    ...row.plugins,
    [key]: value,
  };
  await supabase.from('settings').update({ plugins: updatedPlugins }).eq('id', row.id);
}

function normalizeMentionRow(row: any): PlayerMentionEntry {
  const meta = getMentionMeta(row?.mention);
  return {
    id: String(row?.id || ensureUuid()),
    club_id: row?.club_id ? String(row.club_id) : undefined,
    player_id: String(row?.player_id || ''),
    mention: meta.id,
    mention_score: Number(row?.mention_score) || meta.score,
    mention_date: normalizeMentionDate(row?.mention_date),
    comment: typeof row?.comment === 'string' ? row.comment : '',
    source: typeof row?.source === 'string' ? row.source : 'official_shortlist',
    created_at: row?.created_at || new Date().toISOString(),
    updated_at: row?.updated_at || row?.created_at || new Date().toISOString(),
  };
}

function mergeMentionsByPlayerAndDate(primary: PlayerMentionEntry[], secondary: PlayerMentionEntry[]): PlayerMentionEntry[] {
  const map = new Map<string, PlayerMentionEntry>();
  [...secondary, ...primary].forEach(raw => {
    const entry = normalizeMentionRow(raw);
    if (!entry.player_id) return;
    const key = `${entry.player_id}::${entry.mention_date}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, entry);
      return;
    }
    const existingTs = new Date(existing.updated_at || existing.created_at || 0).getTime();
    const currentTs = new Date(entry.updated_at || entry.created_at || 0).getTime();
    if (currentTs >= existingTs) {
      map.set(key, entry);
    }
  });
  return Array.from(map.values()).sort((a, b) =>
    b.mention_date.localeCompare(a.mention_date)
  );
}

export interface UpsertPlayerMentionInput {
  player_id: string;
  mention: MentionLevel;
  mention_date: string;
  comment?: string;
}

export const playerMentionService = {
  async listAllMentions(): Promise<PlayerMentionEntry[]> {
    const localMentions = readLocal<PlayerMentionEntry[]>(KEY_MENTIONS_CACHE, []);

    try {
      const { data, error } = await supabase
        .from('player_mentions')
        .select('*')
        .order('mention_date', { ascending: false });

      if (!error && Array.isArray(data)) {
        const normalized = data.map(normalizeMentionRow);
        writeLocal(KEY_MENTIONS_CACHE, normalized);
        return normalized;
      }

      if (error && !isMissingTableError(error)) {
        console.warn('[playerMentionService] Erreur lecture player_mentions:', error.message);
      }
    } catch (err) {
      console.warn('[playerMentionService] Exception lecture player_mentions:', err);
    }

    // Repli gracieux : settings.plugins.official_player_mentions + cache local
    try {
      const row = await readSettingsPluginsRow();
      const dbFallback = Array.isArray(row?.plugins?.official_player_mentions)
        ? (row!.plugins.official_player_mentions as any[]).map(normalizeMentionRow)
        : [];
      const merged = mergeMentionsByPlayerAndDate(dbFallback, localMentions);
      writeLocal(KEY_MENTIONS_CACHE, merged);
      return merged;
    } catch {
      return localMentions;
    }
  },

  async listMentionsForPlayer(playerId: string): Promise<PlayerMentionEntry[]> {
    if (!playerId) return [];
    const all = await this.listAllMentions();
    return all.filter(m => m.player_id === playerId);
  },

  async upsertPlayerMention(input: UpsertPlayerMentionInput): Promise<PlayerMentionEntry> {
    const clubId = await getMyClubId();
    const meta = getMentionMeta(input.mention);
    const mentionDate = normalizeMentionDate(input.mention_date);
    const now = new Date().toISOString();

    const optimisticEntry: PlayerMentionEntry = {
      id: ensureUuid(),
      club_id: clubId,
      player_id: input.player_id,
      mention: meta.id,
      mention_score: meta.score,
      mention_date: mentionDate,
      comment: (input.comment || '').trim(),
      source: 'official_shortlist',
      created_at: now,
      updated_at: now,
    };

    try {
      const { data, error } = await supabase
        .from('player_mentions')
        .upsert(
          {
            club_id: clubId,
            player_id: input.player_id,
            mention: meta.id,
            mention_score: meta.score,
            mention_date: mentionDate,
            comment: optimisticEntry.comment,
            source: 'official_shortlist',
          },
          { onConflict: 'player_id,mention_date' }
        )
        .select('*')
        .single();

      if (!error && data) {
        const saved = normalizeMentionRow(data);
        const cached = readLocal<PlayerMentionEntry[]>(KEY_MENTIONS_CACHE, []);
        writeLocal(KEY_MENTIONS_CACHE, mergeMentionsByPlayerAndDate([saved], cached));
        return saved;
      }

      if (error && !isMissingTableError(error)) {
        throw error;
      }
    } catch (err: any) {
      if (!isMissingTableError(err)) {
        console.warn('[playerMentionService] Erreur upsert Supabase, bascule repli:', err?.message || err);
      }
    }

    // Repli persistant dans settings.plugins.official_player_mentions + localStorage
    const localMentions = readLocal<PlayerMentionEntry[]>(KEY_MENTIONS_CACHE, []);
    const existing = localMentions.find(
      m => m.player_id === input.player_id && normalizeMentionDate(m.mention_date) === mentionDate
    );
    const persistedEntry: PlayerMentionEntry = existing
      ? {
          ...existing,
          mention: meta.id,
          mention_score: meta.score,
          mention_date: mentionDate,
          comment: optimisticEntry.comment,
          updated_at: now,
        }
      : optimisticEntry;

    const merged = mergeMentionsByPlayerAndDate([persistedEntry], localMentions);
    writeLocal(KEY_MENTIONS_CACHE, merged);

    try {
      const row = await readSettingsPluginsRow();
      const dbList = Array.isArray(row?.plugins?.official_player_mentions)
        ? (row!.plugins.official_player_mentions as PlayerMentionEntry[])
        : [];
      const synced = mergeMentionsByPlayerAndDate([persistedEntry], dbList);
      await writeSettingsPluginsKey('official_player_mentions', synced);
    } catch (err) {
      console.warn('[playerMentionService] Impossible de synchroniser official_player_mentions:', err);
    }

    return persistedEntry;
  },

  async deletePlayerMention(entryId: string, playerId?: string, mentionDate?: string): Promise<void> {
    try {
      const { error } = await supabase.from('player_mentions').delete().eq('id', entryId);
      if (error && !isMissingTableError(error)) {
        console.warn('[playerMentionService] Erreur suppression player_mentions:', error.message);
      }
    } catch {
      // Fall through to local/settings cleanup
    }

    const matchesEntry = (item: PlayerMentionEntry) => {
      if (item.id === entryId) return true;
      if (playerId && mentionDate) {
        return item.player_id === playerId && normalizeMentionDate(item.mention_date) === normalizeMentionDate(mentionDate);
      }
      return false;
    };

    const cached = readLocal<PlayerMentionEntry[]>(KEY_MENTIONS_CACHE, []);
    writeLocal(KEY_MENTIONS_CACHE, cached.filter(item => !matchesEntry(item)));

    try {
      const row = await readSettingsPluginsRow();
      if (row && Array.isArray(row.plugins?.official_player_mentions)) {
        const filtered = (row.plugins.official_player_mentions as PlayerMentionEntry[]).filter(
          item => !matchesEntry(item)
        );
        await writeSettingsPluginsKey('official_player_mentions', filtered);
      }
    } catch {
      // Ignore fallback cleanup errors
    }
  },

  // ─── Shortlists Officielles liées à la catégorie cible ──────────────────────
  async getOfficialShortlists(): Promise<OfficialSavedShortlistConfig[]> {
    const localList = readLocal<OfficialSavedShortlistConfig[]>(KEY_OFFICIAL_SHORTLISTS, []);

    try {
      const row = await readSettingsPluginsRow();
      if (row) {
        const officialFromDb = Array.isArray(row.plugins?.official_saved_shortlists)
          ? (row.plugins.official_saved_shortlists as OfficialSavedShortlistConfig[])
          : [];

        // Compatibilité ascendante avec les éventuelles shortlists officielles historisées
        // avant séparation (identifiables via candidate_ids présent & absence de scout_filter)
        const legacyFromDb = Array.isArray(row.plugins?.recruitment_saved_shortlists)
          ? (row.plugins.recruitment_saved_shortlists as any[]).filter(
              item =>
                item &&
                item.shortlist_scope !== 'recruitment' &&
                !item.scout_filter &&
                Array.isArray(item.candidate_ids)
            )
          : [];

        const map = new Map<string, OfficialSavedShortlistConfig>();
        [...legacyFromDb, ...localList, ...officialFromDb].forEach(item => {
          if (!item?.id) return;
          map.set(item.id, {
            id: String(item.id),
            title: String(item.title || 'Shortlist sans titre'),
            category_filter: String(item.category_filter || 'ALL').toUpperCase(),
            formation_key: String(item.formation_key || '4-3-3'),
            candidate_ids: Array.isArray(item.candidate_ids) ? item.candidate_ids : [],
            custom_slot_order:
              item.custom_slot_order && typeof item.custom_slot_order === 'object'
                ? item.custom_slot_order
                : {},
            manager_notes: item.manager_notes,
            shortlist_scope: 'official',
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || new Date().toISOString(),
          });
        });

        const merged = Array.from(map.values()).sort((a, b) =>
          (b.updated_at || '').localeCompare(a.updated_at || '')
        );
        writeLocal(KEY_OFFICIAL_SHORTLISTS, merged);
        return merged;
      }
    } catch (err) {
      console.warn('[playerMentionService] Erreur lecture official_saved_shortlists:', err);
    }

    // Fallback cache local
    const legacyLocal = readLocal<any[]>(KEY_LEGACY_RECRUITMENT_SHORTLISTS, []).filter(
      item => item && !item.scout_filter && Array.isArray(item.candidate_ids)
    );
    const fallbackMap = new Map<string, OfficialSavedShortlistConfig>();
    [...legacyLocal, ...localList].forEach(item => {
      if (item?.id) {
        fallbackMap.set(item.id, {
          ...item,
          category_filter: String(item.category_filter || 'ALL').toUpperCase(),
          candidate_ids: Array.isArray(item.candidate_ids) ? item.candidate_ids : [],
          shortlist_scope: 'official',
        });
      }
    });
    return Array.from(fallbackMap.values());
  },

  async saveOfficialShortlist(
    config: Omit<OfficialSavedShortlistConfig, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ): Promise<OfficialSavedShortlistConfig> {
    const current = await this.getOfficialShortlists();
    const now = new Date().toISOString();
    const existing = config.id ? current.find(c => c.id === config.id) : undefined;

    const savedItem: OfficialSavedShortlistConfig = {
      ...config,
      id: config.id || ensureUuid(),
      category_filter: String(config.category_filter || 'ALL').toUpperCase(),
      shortlist_scope: 'official',
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    const nextList = [savedItem, ...current.filter(c => c.id !== savedItem.id)];
    writeLocal(KEY_OFFICIAL_SHORTLISTS, nextList);

    try {
      await writeSettingsPluginsKey('official_saved_shortlists', nextList);
    } catch (err) {
      console.warn('[playerMentionService] Erreur écriture official_saved_shortlists:', err);
    }

    return savedItem;
  },

  async deleteOfficialShortlist(id: string): Promise<void> {
    const current = await this.getOfficialShortlists();
    const nextList = current.filter(item => item.id !== id);
    writeLocal(KEY_OFFICIAL_SHORTLISTS, nextList);
    try {
      await writeSettingsPluginsKey('official_saved_shortlists', nextList);
    } catch (err) {
      console.warn('[playerMentionService] Erreur suppression official_saved_shortlists:', err);
    }
  },
};

