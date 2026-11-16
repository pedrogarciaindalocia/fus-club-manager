import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Brain, Compass, Footprints, Radar as RadarIcon, Shield, Sparkles, Zap } from 'lucide-react';
import {
  PILLAR_COLORS,
} from '../../services/playerPerformanceService';
import {
  getMetricPositionFrenchName,
  type MetricPillar,
  type MetricSetPosition,
} from '../../utils/metricSetsHelpers';
import { cn } from '../../lib/utils';

export interface RadarEvaluationSnapshot {
  id: string;
  label: string;
  positionCode?: string | null;
  positionName?: string | null;
  evaluationDate: string;
  sourceType: string;
  technique: number;
  tactique: number;
  physique: number;
  mental: number;
  global: number;
  criteriaScores?: Record<string, number>;
}

export type RadarViewMode = 'summary' | MetricPillar;

interface PlayerPerformanceRadarChartProps {
  evaluation: RadarEvaluationSnapshot | null;
  activePosition: MetricSetPosition | null;
  previousEvaluation?: RadarEvaluationSnapshot | null;
  height?: number;
  viewMode?: RadarViewMode;
  onViewModeChange?: (mode: RadarViewMode) => void;
  playerName?: string;
  integerOnly?: boolean;
  variant?: 'default' | 'board';
  theme?: 'default' | 'fus';
  hideFooter?: boolean;
  hideHeaderMeta?: boolean;
}

const RADAR_VIEWS: Array<{
  id: RadarViewMode;
  label: string;
  boardLabel: string;
  icon: React.FC<{ className?: string }>;
  hex: string;
  activeClass: string;
}> = [
    {
      id: 'summary',
      label: '4 Piliers',
      boardLabel: '4 Piliers (Synthèse)',
      icon: RadarIcon,
      hex: '#dc2626',
      activeClass: 'bg-slate-900 text-white shadow-xs',
    },
    {
      id: 'technique',
      label: 'Technique',
      boardLabel: 'Technique (Spécifique)',
      icon: Footprints,
      hex: '#ef4444',
      activeClass: 'bg-blue-600 text-white shadow-xs',
    },
    {
      id: 'tactique',
      label: 'Tactique',
      boardLabel: 'Tactique (Spécifique)',
      icon: Compass,
      hex: '#ef4444',
      activeClass: 'bg-emerald-600 text-white shadow-xs',
    },
    {
      id: 'physique',
      label: 'Physique',
      boardLabel: 'Physique (Spécifique)',
      icon: Zap,
      hex: '#ef4444',
      activeClass: 'bg-amber-600 text-white shadow-xs',
    },
    {
      id: 'mental',
      label: 'Mental',
      boardLabel: 'Mental (Spécifique)',
      icon: Brain,
      hex: '#ef4444',
      activeClass: 'bg-purple-600 text-white shadow-xs',
    },
  ];

function truncateAxisLabel(label: string, max = 20): string {
  const clean = label.split('(')[0].split(':')[0].trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function formatScoreValue(val: number, integerOnly: boolean): string {
  return integerOnly ? String(Math.round(val)) : val.toFixed(1);
}

export const PlayerPerformanceRadarChart: React.FC<PlayerPerformanceRadarChartProps> = ({
  evaluation,
  activePosition,
  previousEvaluation = null,
  height = 305,
  viewMode: controlledViewMode,
  onViewModeChange,
  playerName,
  integerOnly = false,
  variant = 'default',
  theme = 'default',
  hideFooter = false,
  hideHeaderMeta = false,
}) => {
  const [internalViewMode, setInternalViewMode] = useState<RadarViewMode>(
    variant === 'board' ? 'technique' : 'summary'
  );
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = (mode: RadarViewMode) => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };

  const radarData = useMemo(() => {
    if (!evaluation) return [];
    const roundVal = (n: number) => (integerOnly ? Math.round(n) : Number(n.toFixed(2)));

    if (viewMode === 'summary') {
      const rows: Array<{
        axis: string;
        fullAxis: string;
        current: number;
        previous?: number;
      }> = [
          {
            axis: 'Technique',
            fullAxis: 'Technique',
            current: roundVal(evaluation.technique),
            previous: previousEvaluation ? roundVal(previousEvaluation.technique) : undefined,
          },
          {
            axis: 'Physique',
            fullAxis: 'Physique',
            current: roundVal(evaluation.physique),
            previous: previousEvaluation ? roundVal(previousEvaluation.physique) : undefined,
          },
          {
            axis: 'Tactique',
            fullAxis: 'Tactique',
            current: roundVal(evaluation.tactique),
            previous: previousEvaluation ? roundVal(previousEvaluation.tactique) : undefined,
          },
          {
            axis: 'Mental',
            fullAxis: 'Mental',
            current: roundVal(evaluation.mental),
            previous: previousEvaluation ? roundVal(previousEvaluation.mental) : undefined,
          },
        ];
      return rows;
    }

    const criteriaList = activePosition?.criteria?.[viewMode] || [];
    const pillarScore = evaluation[viewMode];
    const prevPillarScore = previousEvaluation?.[viewMode];

    return criteriaList.map(crit => {
      const scoped = `${viewMode}:${crit}`;
      const rawCur = evaluation.criteriaScores?.[scoped] ?? evaluation.criteriaScores?.[crit];
      const currentVal =
        typeof rawCur === 'number' && Number.isFinite(rawCur) ? rawCur : pillarScore;

      let prevVal: number | undefined;
      if (previousEvaluation) {
        const rawPrev =
          previousEvaluation.criteriaScores?.[scoped] ?? previousEvaluation.criteriaScores?.[crit];
        prevVal =
          typeof rawPrev === 'number' && Number.isFinite(rawPrev)
            ? rawPrev
            : prevPillarScore;
      }

      return {
        axis: truncateAxisLabel(crit, 19),
        fullAxis: crit,
        current: roundVal(currentVal),
        previous: prevVal !== undefined ? roundVal(prevVal) : undefined,
      };
    });
  }, [evaluation, previousEvaluation, viewMode, activePosition, integerOnly]);

  const activeColor =
    theme === 'fus'
      ? '#FF3737'
      : variant === 'board'
        ? '#ef4444'
        : RADAR_VIEWS.find(v => v.id === viewMode)?.hex || '#dc2626';

  const positionDisplayName =
    activePosition ? getMetricPositionFrenchName(activePosition) : evaluation?.positionName || evaluation?.positionCode || 'Poste';

  const activeViewMeta = RADAR_VIEWS.find(v => v.id === viewMode) || RADAR_VIEWS[0];

  if (variant === 'board') {
    const orderedBoardTabs = RADAR_VIEWS.filter(t => t.id !== 'summary');
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="bg-slate-50/75 rounded-3xl border border-slate-200/80 p-4 sm:p-5 space-y-3.5"
      >
        {/* Header style capture */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Visualisation Radar en Temps Réel
              </h3>
              <p className="text-[11px] font-medium text-slate-500">
                Graphique dynamique mis à jour selon les critères ajustés pour{' '}
                <span className="font-bold text-slate-700">{playerName || 'le joueur'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'summary' ? 'technique' : 'summary')}
              className={cn(
                'px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1',
                viewMode === 'summary'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              )}
            >
              <RadarIcon className="w-3 h-3" />
              <span>4 Piliers</span>
            </button>
          </div>
        </div>

        {/* Sélecteur centré des 4 Piliers (Spécifique) */}
        <div className="w-full flex items-center justify-center gap-1.5 flex-wrap p-1.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          {orderedBoardTabs.map(tab => {
            const isSelected = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewMode(tab.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer',
                  isSelected
                    ? tab.activeClass
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'text-[10px] font-semibold',
                    isSelected ? 'text-white/90' : 'text-slate-400'
                  )}
                >
                  (Spécifique)
                </span>
              </button>
            );
          })}
        </div>

        {/* Ligne d'information Radar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px]">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-primary" />
            Radar {activeViewMeta.label} — {radarData.length}{' '}
            {viewMode === 'summary' ? 'piliers' : 'critères mesurés'} ({positionDisplayName})
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-600 text-[10px]">
            Échelle 0 – 10
          </span>
        </div>

        {/* Zone Graphique Radar */}
        {!evaluation || radarData.length === 0 ? (
          <div
            style={{ height }}
            className="rounded-2xl border border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-center p-6 gap-2"
          >
            <RadarIcon className="w-6 h-6 text-slate-400" />
            <p className="text-xs font-bold text-slate-700">
              {evaluation
                ? 'Aucun critère configuré pour ce pilier sur ce poste'
                : 'Sélectionnez un poste et ajustez les critères ci-dessous'}
            </p>
          </div>
        ) : (
          <motion.div
            key={`${viewMode}-${evaluation.id}-${evaluation.positionCode || ''}`}
            initial={{ opacity: 0.55, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ height }}
            className="w-full bg-white rounded-2xl border border-slate-200/70 p-2"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 10]}
                  tickCount={6}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={false}
                />

                {previousEvaluation && (
                  <Radar
                    name={previousEvaluation.label}
                    dataKey="previous"
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    strokeWidth={1.6}
                    fill="#94a3b8"
                    fillOpacity={0.1}
                    isAnimationActive
                    animationDuration={550}
                  />
                )}

                <Radar
                  name={evaluation.label}
                  dataKey="current"
                  stroke={activeColor}
                  strokeWidth={2.5}
                  fill={activeColor}
                  fillOpacity={0.28}
                  dot={{ r: 3.5, fill: activeColor }}
                  isAnimationActive
                  animationDuration={550}
                  animationEasing="ease-out"
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const row = payload[0]?.payload as (typeof radarData)[number];
                    if (!row) return null;
                    return (
                      <div className="bg-slate-900/95 text-white p-2.5 rounded-xl border border-slate-700 shadow-lg text-xs space-y-1">
                        <p className={cn('font-black', theme === 'fus' ? 'text-[#FF3737]' : 'text-amber-300')}>{row.fullAxis}</p>
                        <p className="font-bold">
                          Note : <span className="text-white">{formatScoreValue(row.current, integerOnly)} / 10</span>
                        </p>
                        {row.previous !== undefined && (
                          <p className="text-slate-300 text-[11px]">
                            Précédent : {formatScoreValue(row.previous, integerOnly)} / 10
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={cn(
        'bg-white rounded-3xl shadow-sm p-5 sm:p-6 flex flex-col justify-between gap-4 h-full',
        theme === 'fus' ? 'border border-slate-200/80' : 'border border-secondary/70'
      )}
    >
      {/* En-tête Radar */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className={cn('w-2.5 h-5 rounded-full shrink-0', theme === 'fus' ? 'bg-[#FF3737]' : 'bg-primary')} />
            <h3 className={cn('text-sm font-black uppercase tracking-wider', theme === 'fus' ? 'text-[#0D0D0F]' : 'text-slate-900')}>
              Radar Performance (0–10)
            </h3>
          </div>
          {!hideHeaderMeta && (
            evaluation ? (
              <p className="text-[11px] font-medium text-slate-500 pl-4 flex flex-wrap items-center gap-1.5">
                <span>{evaluation.evaluationDate}</span>
                <span>•</span>
                <span className={cn('inline-flex items-center gap-1 font-bold', theme === 'fus' ? 'text-[#0D0D0F]' : 'text-slate-700')}>
                  <Shield className={cn('w-3 h-3', theme === 'fus' ? 'text-[#FF3737]' : 'text-primary')} />
                  {activePosition?.emoji || '🎯'}{' '}
                  {evaluation.positionCode || activePosition?.code || 'CM'}
                  {evaluation.positionName || activePosition?.name
                    ? ` (${evaluation.positionName || activePosition?.name})`
                    : ''}
                </span>
              </p>
            ) : (
              <p className="text-[11px] font-medium text-slate-400 pl-4">
                Aucune donnée sélectionnée
              </p>
            )
          )}
        </div>

        {evaluation && !hideHeaderMeta && (
          <div
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-black tabular-nums shadow-xs',
              theme === 'fus' ? 'bg-[#0D0D0F] text-white' : 'bg-slate-900 text-amber-400'
            )}
          >
            {formatScoreValue(evaluation.global, integerOnly)} / 10
          </div>
        )}
      </div>

      {/* Onglets Synthèse / Critères par Pilier */}
      <div className="flex flex-wrap items-center gap-1.5">
        {RADAR_VIEWS.map(tab => {
          const Icon = tab.icon;
          const active = viewMode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewMode(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer',
                theme === 'fus'
                  ? active
                    ? 'bg-[#FF3737] text-white shadow-xs'
                    : 'bg-[#161619] text-white/85 hover:bg-[#26262c]'
                  : cn(
                      'border',
                      active
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    )
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Zone Chart */}
      {!evaluation || radarData.length === 0 ? (
        <div
          style={{ height }}
          className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 flex flex-col items-center justify-center text-center p-6 gap-2"
        >
          <RadarIcon className="w-6 h-6 text-slate-400" />
          <p className="text-xs font-bold text-slate-700">
            {evaluation
              ? 'Aucun critère configuré pour ce pilier sur ce poste'
              : 'Ajoutez une première évaluation pour afficher le Radar'}
          </p>
        </div>
      ) : (
        <motion.div
          key={`${viewMode}-${evaluation.id}-${evaluation.positionCode || ''}`}
          initial={{ opacity: 0.45, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ height }}
          className="w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 10]}
                tickCount={6}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={false}
              />

              {previousEvaluation && (
                <Radar
                  name={previousEvaluation.label}
                  dataKey="previous"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={1.8}
                  fill="#94a3b8"
                  fillOpacity={0.12}
                  isAnimationActive
                  animationDuration={650}
                />
              )}

              <Radar
                name={evaluation.label}
                dataKey="current"
                stroke={activeColor}
                strokeWidth={2.5}
                fill={activeColor}
                fillOpacity={0.28}
                dot={{ r: 3.5, fill: activeColor }}
                isAnimationActive
                animationDuration={750}
                animationEasing="ease-out"
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const row = payload[0]?.payload as (typeof radarData)[number];
                  if (!row) return null;
                  return (
                    <div className="bg-slate-900/95 text-white p-2.5 rounded-xl border border-slate-700 shadow-lg text-xs space-y-1">
                      <p className={cn('font-black', theme === 'fus' ? 'text-[#FF3737]' : 'text-amber-300')}>{row.fullAxis}</p>
                      <p className="font-bold">
                        Actuel : <span className="text-white">{formatScoreValue(row.current, integerOnly)} / 10</span>
                      </p>
                      {row.previous !== undefined && (
                        <p className="text-slate-300 text-[11px]">
                          Précédent : {formatScoreValue(row.previous, integerOnly)} / 10
                        </p>
                      )}
                    </div>
                  );
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Bandeau synthèse 4 piliers en pied */}
      {evaluation && !hideFooter && (
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          {(['technique', 'physique', 'tactique', 'mental'] as MetricPillar[]).map(key => {
            const meta = PILLAR_COLORS[key];
            return (
              <div
                key={key}
                className={cn(
                  'rounded-xl px-2 py-1.5 border text-center',
                  meta.bgClass
                )}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {meta.shortLabel}
                </div>
                <div className={cn('text-xs font-black tabular-nums', meta.textClass)}>
                  {formatScoreValue(evaluation[key], integerOnly)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

