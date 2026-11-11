import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../context/PermissionsContext';
import {
  METRIC_SETS_CACHE_KEY,
  METRIC_SET_POSITIONS_CACHE_KEY,
  buildPositionSeedRowsForSet,
  filterVisibleMetricSetsForUser,
  getDefaultMetricSetsCacheSeed,
  isUserBlockedFromCustomMetricSets,
  sanitizeCriteriaPayload,
  slugifyMetricSetCode,
  type MetricCriteriaByPillar,
  type MetricPositionCategory,
  type MetricSet,
  type MetricSetPosition,
  type MetricSetScope,
  type MetricSetTemplateMode,
} from '../utils/metricSetsHelpers';

export interface CreateMetricSetParams {
  name: string;
  description?: string;
  emoji?: string;
  scope: MetricSetScope;
  templateMode: MetricSetTemplateMode;
}

export interface CreateSetPositionParams {
  metric_set_id: string;
  code: string;
  name: string;
  emoji: string;
  category: MetricPositionCategory;
  criteria: MetricCriteriaByPillar;
}

function isMissingTableOrCacheError(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  const code = String(err?.code || '');
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table')
  );
}

function readLocalSets(): MetricSet[] {
  try {
    const raw = localStorage.getItem(METRIC_SETS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('[useMetricSets] Lecture cache metric_sets impossible:', e);
  }
  const seed = getDefaultMetricSetsCacheSeed();
  writeLocalSets(seed.sets);
  writeLocalPositions(seed.positions);
  return seed.sets;
}

function writeLocalSets(sets: MetricSet[]) {
  try {
    localStorage.setItem(METRIC_SETS_CACHE_KEY, JSON.stringify(sets));
  } catch {}
}

function readLocalPositions(): MetricSetPosition[] {
  try {
    const raw = localStorage.getItem(METRIC_SET_POSITIONS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('[useMetricSets] Lecture cache metric_set_positions impossible:', e);
  }
  const seed = getDefaultMetricSetsCacheSeed();
  writeLocalPositions(seed.positions);
  return seed.positions;
}

function writeLocalPositions(positions: MetricSetPosition[]) {
  try {
    localStorage.setItem(METRIC_SET_POSITIONS_CACHE_KEY, JSON.stringify(positions));
  } catch {}
}

/**
 * Hook dédié aux lots dynamiques personnalisés (ex: "Performance Joueur").
 * Totalement découplé de `metric_positions` / `useMetrics()` (Scouting V2 & fus-scout)
 * et strictement bloqué pour tout profil Scout.
 */
export function useMetricSets() {
  const queryClient = useQueryClient();
  const { authState } = usePermissions();
  const [needsSqlMigration, setNeedsSqlMigration] = useState(false);

  const currentRole = authState.user?.system_role || authState.roles?.[0];
  const currentJobTitle = authState.user?.job_title;
  const isScoutUser = isUserBlockedFromCustomMetricSets(currentRole, currentJobTitle);

  const assertNonScoutAccess = useCallback(() => {
    if (isScoutUser) {
      throw new Error(
        'Accès refusé : les lots de métriques Performance Joueur sont isolés des profils Scouts.'
      );
    }
  }, [isScoutUser]);

  const {
    data: metricSets = [],
    isLoading: isLoadingSets,
  } = useQuery({
    queryKey: ['metric_sets', isScoutUser],
    enabled: !isScoutUser,
    queryFn: async (): Promise<MetricSet[]> => {
      if (isScoutUser) return [];
      try {
        const { data, error } = await supabase
          .from('metric_sets')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });

        if (!error && Array.isArray(data)) {
          setNeedsSqlMigration(false);
          const filtered = filterVisibleMetricSetsForUser(
            data as MetricSet[],
            currentRole,
            currentJobTitle
          );
          writeLocalSets(filtered);
          return filtered;
        }

        if (error) {
          if (isMissingTableOrCacheError(error)) {
            setNeedsSqlMigration(true);
          }
          console.warn('[useMetricSets] Chargement Supabase metric_sets indisponible:', error.message);
        }
      } catch (err: any) {
        if (isMissingTableOrCacheError(err)) setNeedsSqlMigration(true);
        console.warn('[useMetricSets] Exception chargement metric_sets:', err);
      }

      return filterVisibleMetricSetsForUser(readLocalSets(), currentRole, currentJobTitle);
    },
  });

  const {
    data: allSetPositions = [],
    isLoading: isLoadingPositions,
  } = useQuery({
    queryKey: ['metric_set_positions', isScoutUser],
    enabled: !isScoutUser,
    queryFn: async (): Promise<MetricSetPosition[]> => {
      if (isScoutUser) return [];
      try {
        const { data, error } = await supabase
          .from('metric_set_positions')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (!error && Array.isArray(data)) {
          setNeedsSqlMigration(false);
          const normalized = (data as MetricSetPosition[]).map(p => ({
            ...p,
            criteria: sanitizeCriteriaPayload(p.criteria),
          }));
          writeLocalPositions(normalized);
          return normalized;
        }

        if (error && isMissingTableOrCacheError(error)) {
          setNeedsSqlMigration(true);
        }
      } catch (err: any) {
        if (isMissingTableOrCacheError(err)) setNeedsSqlMigration(true);
      }

      return readLocalPositions();
    },
  });

  const getPositionsForSet = useCallback(
    (metricSetId: string): MetricSetPosition[] => {
      if (isScoutUser || !metricSetId) return [];
      return allSetPositions.filter(p => p.metric_set_id === metricSetId);
    },
    [allSetPositions, isScoutUser]
  );

  const createMetricSetMutation = useMutation({
    mutationFn: async (params: CreateMetricSetParams): Promise<MetricSet> => {
      assertNonScoutAccess();
      const currentSets = metricSets.length > 0 ? metricSets : readLocalSets();
      const code = slugifyMetricSetCode(
        params.name,
        currentSets.map(s => s.code)
      );
      const nextSortOrder =
        currentSets.reduce((max, s) => Math.max(max, s.sort_order || 0), 0) + 1;

      const setPayload = {
        code,
        name: params.name.trim(),
        description: (params.description || '').trim(),
        emoji: (params.emoji || '📈').trim() || '📈',
        scope: params.scope || 'player_performance',
        exclude_scouts: true,
        is_active: true,
        sort_order: nextSortOrder,
        created_by: authState.user?.id || authState.email || 'admin',
        updated_at: new Date().toISOString(),
      };

      const { data: createdSet, error } = await supabase
        .from('metric_sets')
        .insert([setPayload])
        .select()
        .single();

      if (!error && createdSet) {
        setNeedsSqlMigration(false);
        const seedRows = buildPositionSeedRowsForSet(createdSet.id, params.templateMode);
        if (seedRows.length > 0) {
          const { error: posErr } = await supabase
            .from('metric_set_positions')
            .insert(seedRows);
          if (posErr) {
            console.warn('[useMetricSets] Erreur seed postes nouveau lot:', posErr.message);
          }
        }
        return createdSet as MetricSet;
      }

      if (error && isMissingTableOrCacheError(error)) {
        setNeedsSqlMigration(true);
        const localSet: MetricSet = {
          id: `local_set_${Date.now()}`,
          ...setPayload,
          created_at: new Date().toISOString(),
        };
        const updatedSets = [...readLocalSets(), localSet];
        writeLocalSets(updatedSets);

        const seedRows = buildPositionSeedRowsForSet(localSet.id, params.templateMode).map(
          (row, idx) => ({
            ...row,
            id: `local_pos_${Date.now()}_${idx}_${row.code}`,
          })
        );
        writeLocalPositions([...readLocalPositions(), ...seedRows]);
        return localSet;
      }

      throw error || new Error('Impossible de créer le lot de métriques');
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['metric_sets'] });
      queryClient.invalidateQueries({ queryKey: ['metric_set_positions'] });
      toast.success(`Lot « ${created.name} » créé (isolé des scouts)`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erreur lors de la création du lot');
    },
  });

  const updateMetricSetMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Pick<MetricSet, 'name' | 'description' | 'emoji' | 'scope' | 'is_active'>>;
    }): Promise<MetricSet> => {
      assertNonScoutAccess();
      const payload = {
        ...data,
        exclude_scouts: true,
        updated_at: new Date().toISOString(),
      };

      const isLocal = id.startsWith('local_') || id.startsWith('default_');
      if (!isLocal) {
        const { data: updated, error } = await supabase
          .from('metric_sets')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (!error && updated) {
          setNeedsSqlMigration(false);
          return updated as MetricSet;
        }
        if (error && !isMissingTableOrCacheError(error)) {
          throw error;
        }
        if (error) setNeedsSqlMigration(true);
      }

      const localList = readLocalSets();
      let updatedLocal: MetricSet | null = null;
      const nextList = localList.map(item => {
        if (item.id !== id) return item;
        updatedLocal = { ...item, ...payload };
        return updatedLocal;
      });
      writeLocalSets(nextList);
      if (!updatedLocal) throw new Error('Lot introuvable');
      return updatedLocal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metric_sets'] });
      toast.success('Lot mis à jour');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erreur lors de la mise à jour du lot');
    },
  });

  const deleteMetricSetMutation = useMutation({
    mutationFn: async (id: string): Promise<string> => {
      assertNonScoutAccess();
      const isLocal = id.startsWith('local_') || id.startsWith('default_');
      if (!isLocal) {
        const { error } = await supabase.from('metric_sets').delete().eq('id', id);
        if (!error) {
          setNeedsSqlMigration(false);
          return id;
        }
        if (!isMissingTableOrCacheError(error)) throw error;
        setNeedsSqlMigration(true);
      }

      writeLocalSets(readLocalSets().filter(s => s.id !== id));
      writeLocalPositions(readLocalPositions().filter(p => p.metric_set_id !== id));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metric_sets'] });
      queryClient.invalidateQueries({ queryKey: ['metric_set_positions'] });
      toast.success('Lot supprimé');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erreur lors de la suppression du lot');
    },
  });

  const createSetPositionMutation = useMutation({
    mutationFn: async (params: CreateSetPositionParams): Promise<MetricSetPosition> => {
      assertNonScoutAccess();
      const existing = getPositionsForSet(params.metric_set_id);
      const nextOrder = existing.reduce((max, p) => Math.max(max, p.sort_order || 0), 0) + 1;
      const payload = {
        metric_set_id: params.metric_set_id,
        code: params.code.trim().toUpperCase(),
        name: params.name.trim(),
        emoji: (params.emoji || '👤').trim() || '👤',
        category: params.category,
        criteria: sanitizeCriteriaPayload(params.criteria),
        sort_order: nextOrder,
        updated_at: new Date().toISOString(),
      };

      const isLocalSet =
        params.metric_set_id.startsWith('local_') || params.metric_set_id.startsWith('default_');

      if (!isLocalSet) {
        const { data, error } = await supabase
          .from('metric_set_positions')
          .upsert(payload, { onConflict: 'metric_set_id,code' })
          .select()
          .single();

        if (!error && data) {
          setNeedsSqlMigration(false);
          return data as MetricSetPosition;
        }
        if (error && !isMissingTableOrCacheError(error)) throw error;
        if (error) setNeedsSqlMigration(true);
      }

      const localPos: MetricSetPosition = {
        id: `local_pos_${Date.now()}_${payload.code}`,
        ...payload,
      };
      const existingAll = readLocalPositions().filter(
        p => !(p.metric_set_id === payload.metric_set_id && p.code === payload.code)
      );
      writeLocalPositions([...existingAll, localPos]);
      return localPos;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metric_set_positions'] });
      toast.success('Poste et métriques enregistrés dans le lot');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erreur lors de la création du poste');
    },
  });

  const updateSetPositionMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<MetricSetPosition>;
    }): Promise<MetricSetPosition> => {
      assertNonScoutAccess();
      const payload: any = {
        code: data.code?.trim().toUpperCase(),
        name: data.name?.trim(),
        emoji: data.emoji,
        category: data.category,
        criteria: data.criteria ? sanitizeCriteriaPayload(data.criteria) : undefined,
        updated_at: new Date().toISOString(),
      };

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        const { data: updated, error } = await supabase
          .from('metric_set_positions')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (!error && updated) {
          setNeedsSqlMigration(false);
          return updated as MetricSetPosition;
        }
        if (error && !isMissingTableOrCacheError(error)) throw error;
        if (error) setNeedsSqlMigration(true);
      }

      const allLocal = readLocalPositions();
      let updatedItem: MetricSetPosition | null = null;
      const nextAll = allLocal.map(item => {
        if (item.id !== id) return item;
        updatedItem = {
          ...item,
          ...payload,
          criteria: payload.criteria || item.criteria,
        };
        return updatedItem;
      });
      writeLocalPositions(nextAll);
      if (!updatedItem) throw new Error('Poste introuvable dans ce lot');
      return updatedItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metric_set_positions'] });
      toast.success('Métriques du lot mises à jour');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erreur lors de la mise à jour');
    },
  });

  const deleteSetPositionMutation = useMutation({
    mutationFn: async (id: string): Promise<string> => {
      assertNonScoutAccess();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        const { error } = await supabase.from('metric_set_positions').delete().eq('id', id);
        if (!error) {
          setNeedsSqlMigration(false);
          return id;
        }
        if (!isMissingTableOrCacheError(error)) throw error;
        setNeedsSqlMigration(true);
      }

      writeLocalPositions(readLocalPositions().filter(p => p.id !== id));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metric_set_positions'] });
      toast.success('Poste supprimé du lot');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erreur lors de la suppression');
    },
  });

  return {
    metricSets,
    allSetPositions,
    getPositionsForSet,
    isLoadingSets,
    isLoadingPositions,
    isScoutUser,
    needsSqlMigration,
    createMetricSet: createMetricSetMutation.mutateAsync,
    updateMetricSet: updateMetricSetMutation.mutateAsync,
    deleteMetricSet: deleteMetricSetMutation.mutateAsync,
    createSetPosition: createSetPositionMutation.mutateAsync,
    updateSetPosition: updateSetPositionMutation.mutateAsync,
    deleteSetPosition: deleteSetPositionMutation.mutateAsync,
  };
}

