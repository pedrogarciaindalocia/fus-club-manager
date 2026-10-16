import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { SCOUT_POSITION_CONFIGS, getScoutPositionConfig } from '../features/recruitment_v2/constants/scoutCriteriaByPosition';

export type MetricPillar = 'technique' | 'tactique' | 'physique' | 'mental';

export interface MetricPosition {
  id: string;
  code: string;
  name: string;
  emoji: string;
  category: 'GK' | 'DF' | 'MF' | 'FW';
  criteria: {
    technique: string[];
    tactique: string[];
    physique: string[];
    mental: string[];
  };
}

function normalizePositionsList(list: MetricPosition[]): MetricPosition[] {
  const result: MetricPosition[] = [];
  list.forEach(item => {
    if (item.code === 'RB/LB' || item.id === 'RB_LB') {
      if (!list.some(x => x.code === 'RB')) {
        result.push({
          id: 'RB',
          code: 'RB',
          name: 'Latéral droit',
          emoji: item.emoji || '',
          category: 'DF',
          criteria: item.criteria
        });
      }
      if (!list.some(x => x.code === 'LB')) {
        result.push({
          id: 'LB',
          code: 'LB',
          name: 'Latéral gauche',
          emoji: item.emoji || '',
          category: 'DF',
          criteria: item.criteria
        });
      }
    } else {
      result.push(item);
    }
  });

  if (!result.some(p => p.code === 'RB')) {
    result.push({
      id: 'RB',
      code: 'RB',
      name: 'Latéral droit',
      emoji: '',
      category: 'DF',
      criteria: SCOUT_POSITION_CONFIGS.RB.criteria
    });
  }
  if (!result.some(p => p.code === 'LB')) {
    result.push({
      id: 'LB',
      code: 'LB',
      name: 'Latéral gauche',
      emoji: '',
      category: 'DF',
      criteria: SCOUT_POSITION_CONFIGS.LB.criteria
    });
  }

  return result;
}

export function useMetrics() {
  const queryClient = useQueryClient();

  const { data: positions, isLoading, error } = useQuery({
    queryKey: ['metric_positions'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('metric_positions')
          .select('*')
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          const normalized = normalizePositionsList(data as MetricPosition[]);
          localStorage.setItem('fus_metric_positions_cache', JSON.stringify(normalized));
          return normalized;
        }
        if (error) {
          console.warn("Table metric_positions Supabase non disponible ou permissions manquantes :", error.message);
        }
      } catch (e) {
        console.warn("Exception chargement metric_positions:", e);
      }

      // Repli sur le cache local ou sur les constantes par défaut
      const cached = localStorage.getItem('fus_metric_positions_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as MetricPosition[];
          const normalized = normalizePositionsList(parsed);
          return normalized;
        } catch (e) {
          console.error("Erreur lecture cache local:", e);
        }
      }

      return Object.values(SCOUT_POSITION_CONFIGS).filter(p => p.id !== 'RB_LB') as unknown as MetricPosition[];
    }
  });

  const getPositionByCode = useCallback((code: string | null | undefined) => {
    if (!code || !positions) return undefined;
    
    const clean = code.trim().toUpperCase();
    const lower = code.toLowerCase();

    // 0. Traitement prioritaire pour Latéral droit et Latéral gauche
    if (clean === 'RB' || clean === 'DD' || (lower.includes('droit') && (lower.includes('latéral') || lower.includes('arrière')))) {
      const matchRB = positions.find(p => p.code === 'RB' || p.name.toLowerCase().includes('droit'));
      if (matchRB) return matchRB;
    }
    if (clean === 'LB' || clean === 'DG' || (lower.includes('gauche') && (lower.includes('latéral') || lower.includes('arrière')))) {
      const matchLB = positions.find(p => p.code === 'LB' || p.name.toLowerCase().includes('gauche'));
      if (matchLB) return matchLB;
    }

    // 1. Exact match sur code ou nom
    let match = positions.find(p => p.code.toUpperCase() === clean || p.name.toUpperCase() === clean);
    if (match) return match;

    // 2. Correspondance partielle sur code ou nom
    match = positions.find(p => 
      p.code.toLowerCase().includes(lower) || lower.includes(p.code.toLowerCase()) ||
      p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase())
    );
    if (match) return match;

    // 3. Résolution via les profils tactiques officiels FUS (ex: 'Gardien de But' -> 'GK', 'Avant-centre' -> 'ST')
    const resolved = getScoutPositionConfig(code);
    if (resolved?.code) {
      match = positions.find(p => p.code.toUpperCase() === resolved.code.toUpperCase() || p.id === resolved.id);
      if (match) return match;
    }
    
    // 4. Repli de secours
    return positions.find(p => p.code === 'CM') || positions[0];
  }, [positions]);

  const createMutation = useMutation({
    mutationFn: async (newPos: Omit<MetricPosition, 'id'>) => {
      const payload = {
        code: newPos.code,
        name: newPos.name,
        emoji: newPos.emoji,
        category: newPos.category,
        criteria: newPos.criteria,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabase
        .from('metric_positions')
        .upsert(payload, { onConflict: 'code' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metric_positions'] });
      toast.success('Poste et métriques enregistrés dans Supabase');
    },
    onError: (err: any) => {
      toast.error('Erreur lors de la création : ' + err.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<MetricPosition> }) => {
      const payload: any = {
        code: data.code,
        name: data.name,
        emoji: data.emoji,
        category: data.category,
        criteria: data.criteria,
        updated_at: new Date().toISOString()
      };

      const isUuid = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      let res: any = null;
      let error: any = null;

      // 1. Tenter la mise à jour par ID si UUID valide
      if (isUuid) {
        const updateRes = await supabase
          .from('metric_positions')
          .update(payload)
          .eq('id', id)
          .select();
        res = updateRes.data;
        error = updateRes.error;
      }

      // 2. Si pas d'UUID ou si aucune ligne touchée ou erreur, faire un upsert par code
      if (!isUuid || (!res || res.length === 0) || error) {
        const upsertRes = await supabase
          .from('metric_positions')
          .upsert(payload, { onConflict: 'code' })
          .select();
        res = upsertRes.data;
        error = upsertRes.error;
      }

      if (error) {
        console.warn("Erreur Supabase update metric_positions:", error.message);
        // Sauvegarde locale de secours pour ne pas perdre les modifications
        const cached = localStorage.getItem('fus_metric_positions_cache');
        let list: MetricPosition[] = cached ? JSON.parse(cached) : (Object.values(SCOUT_POSITION_CONFIGS) as any);
        const idx = list.findIndex(p => p.code === data.code || p.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...data } as MetricPosition;
        } else {
          list.push({ id: id || (data.code as string), ...data } as MetricPosition);
        }
        localStorage.setItem('fus_metric_positions_cache', JSON.stringify(list));
        throw error;
      }

      // Mise à jour du cache local avec le retour de Supabase
      const updated = res && res[0] ? (res[0] as MetricPosition) : null;
      if (updated) {
        const cached = localStorage.getItem('fus_metric_positions_cache');
        let list: MetricPosition[] = cached ? JSON.parse(cached) : [];
        const idx = list.findIndex(p => p.code === updated.code || p.id === updated.id);
        if (idx !== -1) list[idx] = updated;
        else list.push(updated);
        localStorage.setItem('fus_metric_positions_cache', JSON.stringify(list));
      }

      return updated;
    },
    onSuccess: (updated) => {
      if (updated) {
        queryClient.setQueryData(['metric_positions'], (old: MetricPosition[] | undefined) => {
          if (!old) return [updated];
          return old.map(p => (p.code === updated.code || p.id === updated.id ? updated : p));
        });
      }
      queryClient.invalidateQueries({ queryKey: ['metric_positions'] });
      toast.success('Modifications enregistrées avec succès dans Supabase');
    },
    onError: (err: any) => {
      queryClient.invalidateQueries({ queryKey: ['metric_positions'] });
      toast.error(`Erreur d'enregistrement : ${err.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const isUuid = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = supabase.from('metric_positions').delete();
      if (isUuid) {
        query = query.eq('id', id);
      } else {
        query = query.eq('code', id);
      }
      const { error } = await query;
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metric_positions'] });
      toast.success('Poste supprimé avec succès');
    },
    onError: (err: any) => {
      toast.error('Erreur lors de la suppression : ' + err.message);
    }
  });

  return {
    positions: positions || [],
    isLoading,
    error,
    getPositionByCode,
    createPosition: createMutation.mutateAsync,
    updatePosition: updateMutation.mutateAsync,
    deletePosition: deleteMutation.mutateAsync,
  };
}
