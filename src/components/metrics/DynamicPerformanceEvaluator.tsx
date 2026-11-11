import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Brain, Lock, RotateCcw, Shield, Target, Zap } from 'lucide-react';
import { useMetricSets } from '../../hooks/useMetricSets';
import {
  computePillarAveragesFromCriteria,
  getMetricPositionFrenchName,
  resolveMetricSetForRubric,
  resolveMetricSetPositionForPlayer,
  type MetricPillar,
  type MetricSet,
  type MetricSetPosition,
} from '../../utils/metricSetsHelpers';

export interface DynamicEvaluationChangePayload {
  metricSetId: string | null;
  metricSetName: string | null;
  positionCode: string | null;
  technique: number;
  tactique: number;
  physique: number;
  mental: number;
  global: number;
  criteriaScores: Record<string, number>;
  ratedCriteriaCount: number;
  totalCriteriaCount: number;
}

interface DynamicPerformanceEvaluatorProps {
  rubric: 'match' | 'training';
  playerPosition?: string | null;
  initialSetId?: string | null;
  initialPositionCode?: string | null;
  initialCriteriaScores?: Record<string, number> | null;
  initialPillarScores?: Partial<Record<MetricPillar, number>> | null;
  compact?: boolean;
  onChange: (payload: DynamicEvaluationChangePayload) => void;
}

const PILLAR_META: Array<{
  key: MetricPillar;
  label: string;
  icon: React.FC<{ className?: string }>;
  badgeClass: string;
  accentClass: string;
}> = [
  {
    key: 'technique',
    label: '1. Technique',
    icon: Target,
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    accentClass: 'accent-emerald-500',
  },
  {
    key: 'tactique',
    label: '2. Tactique',
    icon: Shield,
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    accentClass: 'accent-indigo-500',
  },
  {
    key: 'physique',
    label: '3. Physique',
    icon: Zap,
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    accentClass: 'accent-rose-500',
  },
  {
    key: 'mental',
    label: '4. Mental',
    icon: Brain,
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    accentClass: 'accent-amber-500',
  },
];

export const DynamicPerformanceEvaluator: React.FC<DynamicPerformanceEvaluatorProps> = ({
  rubric,
  playerPosition,
  initialSetId,
  initialPositionCode,
  initialCriteriaScores,
  initialPillarScores,
  compact = false,
  onChange,
}) => {
  const { metricSets, getPositionsForSet, isScoutUser } = useMetricSets();

  const [selectedSetId, setSelectedSetId] = useState<string>(() => initialSetId || '');
  const [selectedPosCode, setSelectedPosCode] = useState<string>(() => initialPositionCode || '');
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>(
    () => ({ ...(initialCriteriaScores || {}) })
  );
  const [manualPillarScores, setManualPillarScores] = useState<Record<MetricPillar, number>>(() => ({
    technique: initialPillarScores?.technique ?? 7,
    tactique: initialPillarScores?.tactique ?? 7,
    physique: initialPillarScores?.physique ?? 7,
    mental: initialPillarScores?.mental ?? 7,
  }));

  // Synchroniser le lot sélectionné dès chargement de metricSets
  const activeSet: MetricSet | null = useMemo(() => {
    if (isScoutUser || metricSets.length === 0) return null;
    if (selectedSetId) {
      const found = metricSets.find(s => s.id === selectedSetId);
      if (found) return found;
    }
    return resolveMetricSetForRubric(metricSets, rubric);
  }, [isScoutUser, metricSets, selectedSetId, rubric]);

  const positionsInSet: MetricSetPosition[] = useMemo(() => {
    if (!activeSet) return [];
    return getPositionsForSet(activeSet.id);
  }, [activeSet, getPositionsForSet]);

  // Synchroniser automatiquement le poste du joueur dans le lot
  useEffect(() => {
    if (positionsInSet.length === 0) return;
    if (initialPositionCode) {
      const exactInit = positionsInSet.find(
        p => p.code.toUpperCase() === initialPositionCode.toUpperCase()
      );
      if (exactInit) {
        setSelectedPosCode(exactInit.code);
        return;
      }
    }
    const matched = resolveMetricSetPositionForPlayer(positionsInSet, playerPosition);
    if (matched) {
      setSelectedPosCode(matched.code);
    }
  }, [playerPosition, initialPositionCode, positionsInSet]);

  const activePosition: MetricSetPosition | null = useMemo(() => {
    if (positionsInSet.length === 0) return null;
    return (
      positionsInSet.find(p => p.code === selectedPosCode) ||
      resolveMetricSetPositionForPlayer(positionsInSet, playerPosition) ||
      positionsInSet[0]
    );
  }, [positionsInSet, selectedPosCode, playerPosition]);

  // Calcul temps réel des 4 piliers & moyenne globale
  const summary = useMemo(
    () => computePillarAveragesFromCriteria(activePosition, criteriaScores, manualPillarScores),
    [activePosition, criteriaScores, manualPillarScores]
  );

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current({
      metricSetId: isScoutUser ? null : activeSet?.id || null,
      metricSetName: isScoutUser ? null : activeSet?.name || null,
      positionCode: isScoutUser ? null : activePosition?.code || null,
      technique: summary.technique,
      tactique: summary.tactique,
      physique: summary.physique,
      mental: summary.mental,
      global: summary.global,
      criteriaScores,
      ratedCriteriaCount: summary.ratedCriteriaCount,
      totalCriteriaCount: summary.totalCriteriaCount,
    });
  }, [
    isScoutUser,
    activeSet?.id,
    activeSet?.name,
    activePosition?.code,
    summary.technique,
    summary.tactique,
    summary.physique,
    summary.mental,
    summary.global,
    summary.ratedCriteriaCount,
    summary.totalCriteriaCount,
    criteriaScores,
  ]);

  const handleCriterionChange = (pillar: MetricPillar, criterionName: string, score: number) => {
    const scopedKey = `${pillar}:${criterionName}`;
    setCriteriaScores(prev => ({
      ...prev,
      [scopedKey]: Number(score.toFixed(1)),
    }));
  };

  const handleClearPillar = (pillar: MetricPillar) => {
    setCriteriaScores(prev => {
      const next = { ...prev };
      const prefix = `${pillar}:`;
      for (const k of Object.keys(next)) {
        if (k.startsWith(prefix)) delete next[k];
      }
      return next;
    });
  };

  const handleSetAllInPillar = (pillar: MetricPillar, value: number) => {
    const list = activePosition?.criteria?.[pillar] || [];
    if (list.length === 0) {
      setManualPillarScores(prev => ({ ...prev, [pillar]: value }));
      return;
    }
    setCriteriaScores(prev => {
      const next = { ...prev };
      for (const crit of list) {
        next[`${pillar}:${crit}`] = value;
      }
      return next;
    });
  };

  if (isScoutUser) {
    return (
      <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs space-y-3">
        <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            Profil Scout détecté : les lots Performance Joueur sont isolés. Saisie manuelle des 4 piliers uniquement.
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PILLAR_META.map(p => (
            <div key={p.key} className="space-y-1">
              <div className="flex justify-between font-bold text-slate-700 dark:text-slate-200">
                <span>{p.label}</span>
                <span>{manualPillarScores[p.key].toFixed(1)}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={manualPillarScores[p.key]}
                onChange={e =>
                  setManualPillarScores(prev => ({
                    ...prev,
                    [p.key]: parseFloat(e.target.value),
                  }))
                }
                className={`w-full ${p.accentClass}`}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sélecteur de Lot & Poste (Hors-Scouts) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <div className="space-y-1 min-w-0">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-600" />
            Lot de Métriques (Hors-Scout)
          </label>
          <select
            value={activeSet?.id || ''}
            onChange={e => {
              setSelectedSetId(e.target.value);
              setSelectedPosCode('');
              setCriteriaScores({});
            }}
            className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
          >
            {metricSets.map(set => (
              <option key={set.id} value={set.id}>
                {set.emoji} {set.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1 min-w-0">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Poste évalué dans le lot
          </label>
          <select
            value={activePosition?.code || ''}
            onChange={e => {
              setSelectedPosCode(e.target.value);
              setCriteriaScores({});
            }}
            className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
          >
            {positionsInSet.length === 0 ? (
              <option value="">Aucun poste configuré (notation libre)</option>
            ) : (
              positionsInSet.map(pos => (
                <option key={pos.id} value={pos.code}>
                  {pos.emoji} {getMetricPositionFrenchName(pos)}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Résumé score global & 4 piliers */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-900 text-white">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span>
            Technique : <strong className="text-emerald-400">{summary.technique.toFixed(1)}</strong>
          </span>
          <span>
            Tactique : <strong className="text-indigo-400">{summary.tactique.toFixed(1)}</strong>
          </span>
          <span>
            Physique : <strong className="text-rose-400">{summary.physique.toFixed(1)}</strong>
          </span>
          <span>
            Mental : <strong className="text-amber-400">{summary.mental.toFixed(1)}</strong>
          </span>
          {summary.totalCriteriaCount > 0 && (
            <span className="text-[11px] text-slate-400">
              ({summary.ratedCriteriaCount}/{summary.totalCriteriaCount} critères notés)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 uppercase font-bold">Moyenne :</span>
          <span className="text-xl font-black text-amber-400 tabular-nums">
            {summary.global.toFixed(1)}/10
          </span>
        </div>
      </div>

      {/* Grille des 4 Piliers et critères dynamiques */}
      <div className={`grid grid-cols-1 ${compact ? 'lg:grid-cols-2' : 'md:grid-cols-2'} gap-3`}>
        {PILLAR_META.map(pillar => {
          const criteriaList = activePosition?.criteria?.[pillar.key] || [];
          const Icon = pillar.icon;
          const pillarAvg = summary[pillar.key];
          const ratedInPillar = criteriaList.filter(c => {
            const val = criteriaScores[`${pillar.key}:${c}`] ?? criteriaScores[c];
            return typeof val === 'number' && val > 0;
          }).length;

          return (
            <div
              key={pillar.key}
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-black uppercase tracking-wider ${pillar.badgeClass}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{pillar.label}</span>
                </div>

                <div className="flex items-center gap-2">
                  {criteriaList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSetAllInPillar(pillar.key, manualPillarScores[pillar.key])}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white underline"
                      title="Pré-remplir tous les critères de ce pilier"
                    >
                      Tout à {manualPillarScores[pillar.key].toFixed(0)}
                    </button>
                  )}
                  {ratedInPillar > 0 && (
                    <button
                      type="button"
                      onClick={() => handleClearPillar(pillar.key)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500"
                      title="Réinitialiser ce pilier"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                  <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                    {pillarAvg.toFixed(1)}/10
                  </span>
                </div>
              </div>

              {criteriaList.length === 0 ? (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Note directe du pilier (aucun critère détaillé)</span>
                    <span className="font-bold">{manualPillarScores[pillar.key].toFixed(1)}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={manualPillarScores[pillar.key]}
                    onChange={e =>
                      setManualPillarScores(prev => ({
                        ...prev,
                        [pillar.key]: parseFloat(e.target.value),
                      }))
                    }
                    className={`w-full ${pillar.accentClass}`}
                  />
                </div>
              ) : (
                <div className={`space-y-2.5 ${compact ? 'max-h-44 overflow-y-auto pr-1' : ''}`}>
                  {criteriaList.map(crit => {
                    const scopedKey = `${pillar.key}:${crit}`;
                    const currentVal = criteriaScores[scopedKey] ?? criteriaScores[crit];
                    const isRated = typeof currentVal === 'number' && currentVal > 0;
                    const sliderVal = isRated ? currentVal : manualPillarScores[pillar.key];

                    return (
                      <div key={crit} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-200 leading-snug">
                            {crit}
                          </span>
                          <span
                            className={`text-xs font-black tabular-nums shrink-0 ${
                              isRated
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-400'
                            }`}
                          >
                            {isRated ? `${currentVal.toFixed(1)}` : '—'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="0.5"
                          value={sliderVal}
                          onChange={e =>
                            handleCriterionChange(pillar.key, crit, parseFloat(e.target.value))
                          }
                          className={`w-full h-1.5 rounded-lg cursor-pointer ${pillar.accentClass}`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
