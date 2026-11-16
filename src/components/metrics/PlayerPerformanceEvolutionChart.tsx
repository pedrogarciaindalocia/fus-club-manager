import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type ActiveDotProps,
  type DotItemDotProps,
  type MouseHandlerDataParam,
} from 'recharts';
import { Activity, Layers, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import {
  PILLAR_COLORS,
  type PlayerPerformanceEvaluation,
} from '../../services/playerPerformanceService';
import type { MetricPillar } from '../../utils/metricSetsHelpers';
import { cn } from '../../lib/utils';

export type PerformanceSourceFilter = 'all' | 'manual' | 'match';

interface PlayerPerformanceEvolutionChartProps {
  evaluations: PlayerPerformanceEvaluation[];
  selectedEvaluationId?: string | null;
  onSelectEvaluation?: (evaluation: PlayerPerformanceEvaluation) => void;
  sourceFilter?: PerformanceSourceFilter;
  onSourceFilterChange?: (filter: PerformanceSourceFilter) => void;
  height?: number;
  integerOnly?: boolean;
  hideSourceFilter?: boolean;
  title?: string;
  subtitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  headerExtra?: React.ReactNode;
  theme?: 'default' | 'fus';
}

function formatShortDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM', { locale: fr });
  } catch {
    return dateStr.slice(0, 10);
  }
}

function formatFullDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMMM yyyy', { locale: fr });
  } catch {
    return dateStr;
  }
}

const PILLAR_KEYS: MetricPillar[] = ['technique', 'physique', 'tactique', 'mental'];

const FUS_PILLAR_STYLES: Record<MetricPillar, { hex: string; dash?: string }> = {
  technique: { hex: '#0D0D0F' },
  physique: { hex: '#FF3737', dash: '5 3' },
  tactique: { hex: '#52525B', dash: '2 2' },
  mental: { hex: '#991B1B', dash: '8 3' },
};

export const PlayerPerformanceEvolutionChart: React.FC<PlayerPerformanceEvolutionChartProps> = ({
  evaluations,
  selectedEvaluationId,
  onSelectEvaluation,
  sourceFilter = 'all',
  onSourceFilterChange,
  height = 295,
  integerOnly = false,
  hideSourceFilter = false,
  title = "Courbe d'Évolution (Moyenne des 4 Piliers)",
  subtitle = "Progression par date d'enregistrement • Cliquez sur un point pour actualiser le Radar",
  emptyTitle = 'Aucune évaluation enregistrée sur ce filtre',
  emptyDescription = "Ajoutez une évaluation ci-dessous en choisissant le poste du joueur pour tracer sa courbe d'évolution des 4 piliers.",
  headerExtra,
  theme = 'default',
}) => {
  const [showMeanCurve, setShowMeanCurve] = useState(true);
  const [showAllPillars, setShowAllPillars] = useState(true);
  const [enabledPillars, setEnabledPillars] = useState<Record<MetricPillar, boolean>>({
    technique: true,
    physique: true,
    tactique: true,
    mental: true,
  });

  const counts = useMemo(() => {
    const manual = evaluations.filter(e => e.source_type === 'manual').length;
    const match = evaluations.filter(e => e.source_type === 'match').length;
    return { all: evaluations.length, manual, match };
  }, [evaluations]);

  const filteredEvaluations = useMemo(() => {
    const base =
      sourceFilter === 'all'
        ? evaluations
        : evaluations.filter(e => e.source_type === sourceFilter);
    return [...base].sort((a, b) => {
      const cmp = a.evaluation_date.localeCompare(b.evaluation_date);
      if (cmp !== 0) return cmp;
      return String(a.created_at || '').localeCompare(String(b.created_at || ''));
    });
  }, [evaluations, sourceFilter]);

  const chartData = useMemo(() => {
    const fmtNum = (v: number) => (integerOnly ? Math.round(v) : Number(v.toFixed(2)));
    return filteredEvaluations.map((ev, index) => ({
      ...ev,
      idx: index,
      dateLabel: formatShortDate(ev.evaluation_date),
      fullDateLabel: formatFullDate(ev.evaluation_date),
      moyenne: fmtNum(ev.global_score),
      technique: fmtNum(ev.technique_score),
      physique: fmtNum(ev.physique_score),
      tactique: fmtNum(ev.tactique_score),
      mental: fmtNum(ev.mental_score),
    }));
  }, [filteredEvaluations, integerOnly]);

  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { latest: 0, meanAll: 0, delta: 0 };
    }
    const latest = chartData[chartData.length - 1].moyenne;
    const first = chartData[0].moyenne;
    const meanAll =
      chartData.reduce((acc, row) => acc + row.moyenne, 0) / chartData.length;
    return {
      latest: integerOnly ? Math.round(latest) : Number(latest.toFixed(1)),
      meanAll: integerOnly ? Math.round(meanAll) : Number(meanAll.toFixed(1)),
      delta: integerOnly ? Math.round(latest - first) : Number((latest - first).toFixed(1)),
    };
  }, [chartData, integerOnly]);

  const togglePillar = (key: MetricPillar) => {
    if (!showAllPillars) {
      setShowAllPillars(true);
      setEnabledPillars({
        technique: key === 'technique',
        physique: key === 'physique',
        tactique: key === 'tactique',
        mental: key === 'mental',
      });
      return;
    }
    setEnabledPillars(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isFus = theme === 'fus';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={cn(
        'bg-white rounded-3xl shadow-sm p-5 sm:p-6 flex flex-col justify-between gap-4 min-w-0',
        isFus ? 'border border-slate-200/80' : 'border border-secondary/70'
      )}
    >
      {/* Header Courbe */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-2.5 h-5 rounded-full shrink-0',
                isFus ? 'bg-[#FF3737]' : 'bg-emerald-500'
              )}
            />
            <h3
              className={cn(
                'text-sm font-black uppercase tracking-wider',
                isFus ? 'text-[#0D0D0F]' : 'text-slate-900'
              )}
            >
              {title}
            </h3>
          </div>
          {subtitle && (
            <p className="text-[11px] font-medium text-slate-500 pl-4">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {chartData.length >= 2 && (
            <div
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5',
                isFus
                  ? stats.delta >= 0
                    ? 'bg-[#0D0D0F] text-white'
                    : 'bg-[#FF3737] text-white'
                  : cn(
                      'border',
                      stats.delta >= 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    )
              )}
            >
              {stats.delta >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {stats.delta >= 0
                  ? `+${integerOnly ? Math.round(stats.delta) : stats.delta.toFixed(1)}`
                  : integerOnly
                    ? Math.round(stats.delta)
                    : stats.delta.toFixed(1)}{' '}
                pts
              </span>
            </div>
          )}
          <div
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-black',
              isFus
                ? 'bg-slate-100 text-[#0D0D0F]'
                : 'bg-slate-100 border border-slate-200 text-slate-800'
            )}
          >
            Moy. période : {integerOnly ? Math.round(stats.meanAll) : stats.meanAll.toFixed(1)}/10
          </div>
        </div>
      </div>

      {headerExtra && (
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {headerExtra}
        </div>
      )}

      {/* Contrôles : Filtres Source & Bascule 4 Piliers */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {!hideSourceFilter && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {[
              { id: 'all' as const, label: `Toutes (${counts.all})` },
              { id: 'manual' as const, label: `Manuelles (${counts.manual})` },
              { id: 'match' as const, label: `Matchs (${counts.match})` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSourceFilterChange?.(tab.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-black transition-all',
                  sourceFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowMeanCurve(prev => !prev)}
            className={cn(
              'px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer',
              isFus
                ? showMeanCurve
                  ? 'bg-[#FF3737] text-white shadow-xs'
                  : 'bg-[#161619] text-white/80 hover:bg-[#26262c]'
                : cn(
                    'border',
                    showMeanCurve
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  )
            )}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                showMeanCurve ? 'bg-white' : isFus ? 'bg-[#FF3737]' : 'bg-rose-500'
              )}
            />
            <span>Moyenne Globale</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !showAllPillars;
              setShowAllPillars(next);
              if (next) {
                setEnabledPillars({
                  technique: true,
                  physique: true,
                  tactique: true,
                  mental: true,
                });
              }
            }}
            className={cn(
              'px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer',
              isFus
                ? showAllPillars
                  ? 'bg-[#0D0D0F] text-white shadow-xs'
                  : 'bg-[#161619] text-white/75 hover:bg-[#26262c]'
                : cn(
                    'border',
                    showAllPillars
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  )
            )}
          >
            <Layers className="w-3 h-3" />
            <span>4 Piliers</span>
          </button>

          {PILLAR_KEYS.map(key => {
            const meta = PILLAR_COLORS[key];
            const active = showAllPillars && enabledPillars[key];
            const lineHex = isFus ? FUS_PILLAR_STYLES[key].hex : meta.hex;
            return (
              <button
                key={key}
                type="button"
                onClick={() => togglePillar(key)}
                className={cn(
                  'px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer',
                  isFus
                    ? active
                      ? 'bg-slate-100 text-[#0D0D0F]'
                      : 'bg-slate-100/60 text-slate-400 hover:text-slate-600'
                    : cn(
                        'border',
                        active
                          ? 'bg-white text-slate-900 border-slate-300 shadow-2xs'
                          : 'bg-slate-50 text-slate-400 border-slate-200 opacity-75 hover:opacity-100'
                      )
                )}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: lineHex }}
                />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Zone Graphique Animée */}
      {chartData.length === 0 ? (
        <div
          style={{ height }}
          className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 flex flex-col items-center justify-center text-center p-6 gap-2"
        >
          <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
            <Activity className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-black text-slate-700">
            {emptyTitle}
          </p>
          <p className="text-xs text-slate-500 max-w-sm">
            {emptyDescription}
          </p>
        </div>
      ) : (
        <motion.div
          key={`${sourceFilter}-${chartData.length}-${showAllPillars ? 'multi' : 'mean'}`}
          initial={{ opacity: 0.45 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{ height }}
          className="w-full min-w-0"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 12, right: 14, left: -16, bottom: 4 }}
              onClick={(state: MouseHandlerDataParam) => {
                const rawIdx = state?.activeTooltipIndex ?? state?.activeIndex;
                const idx = rawIdx != null ? Number(rawIdx) : NaN;
                const activeItem =
                  Number.isFinite(idx) && idx >= 0 && idx < chartData.length ? chartData[idx] : null;
                if (activeItem && onSelectEvaluation) {
                  onSelectEvaluation(activeItem);
                }
              }}
            >
              <defs>
                <linearGradient id={isFus ? 'perfMeanGradientFus' : 'perfMeanGradient'} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isFus ? '#FF3737' : '#dc2626'} stopOpacity={0.32} />
                  <stop offset="95%" stopColor={isFus ? '#FF3737' : '#dc2626'} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
              />
              <ReferenceLine y={5} stroke="#cbd5e1" strokeDasharray="4 4" />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const row = payload[0]?.payload as (typeof chartData)[number];
                  if (!row) return null;
                  return (
                    <div
                      className={cn(
                        'text-white p-3 rounded-2xl shadow-xl text-xs space-y-2 min-w-[205px]',
                        isFus ? 'bg-[#0D0D0F]' : 'bg-slate-900/95 border border-slate-700'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                        <span className={cn('font-black', isFus ? 'text-[#FF3737]' : 'text-amber-300')}>
                          {row.fullDateLabel}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-black text-white/80 uppercase">
                          {row.id?.startsWith('agg-')
                            ? row.match_label || row.position_code
                            : row.source_type === 'match'
                              ? row.match_label || 'Match'
                              : row.position_code}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white/75 flex items-center gap-1">
                          <Sparkles className={cn('w-3 h-3', isFus ? 'text-[#FF3737]' : 'text-rose-400')} />
                          Moyenne 4 Piliers
                        </span>
                        <span className="text-sm font-black text-white tabular-nums">
                          {integerOnly ? Math.round(row.moyenne) : row.moyenne.toFixed(1)} / 10
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/10 text-[11px]">
                        <span className={cn('font-bold', isFus ? 'text-white' : 'text-emerald-400')}>
                          Tech : {integerOnly ? Math.round(row.technique) : row.technique.toFixed(1)}
                        </span>
                        <span className={cn('font-bold', isFus ? 'text-[#FF3737]' : 'text-rose-400')}>
                          Phys : {integerOnly ? Math.round(row.physique) : row.physique.toFixed(1)}
                        </span>
                        <span className={cn('font-bold', isFus ? 'text-white/75' : 'text-indigo-400')}>
                          Tact : {integerOnly ? Math.round(row.tactique) : row.tactique.toFixed(1)}
                        </span>
                        <span className={cn('font-bold', isFus ? 'text-rose-300' : 'text-amber-400')}>
                          Ment : {integerOnly ? Math.round(row.mental) : row.mental.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />

              {showAllPillars &&
                PILLAR_KEYS.map(key =>
                  enabledPillars[key] ? (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={PILLAR_COLORS[key].label}
                      stroke={isFus ? FUS_PILLAR_STYLES[key].hex : PILLAR_COLORS[key].hex}
                      strokeDasharray={isFus ? FUS_PILLAR_STYLES[key].dash : undefined}
                      strokeWidth={2}
                      dot={{
                        r: chartData.length === 1 ? 5 : 2.5,
                        fill: isFus ? FUS_PILLAR_STYLES[key].hex : PILLAR_COLORS[key].hex,
                        stroke:
                          chartData.length === 1
                            ? '#ffffff'
                            : isFus
                              ? FUS_PILLAR_STYLES[key].hex
                              : PILLAR_COLORS[key].hex,
                        strokeWidth: chartData.length === 1 ? 1.5 : 0,
                      }}
                      activeDot={{ r: chartData.length === 1 ? 6.5 : 4.5 }}
                      isAnimationActive
                      animationDuration={850}
                      animationEasing="ease-out"
                    />
                  ) : null
                )}

              {showMeanCurve && (
                <Area
                  type="monotone"
                  dataKey="moyenne"
                  name="Moyenne 4 Piliers"
                  stroke={isFus ? '#FF3737' : '#dc2626'}
                  strokeWidth={3}
                  fill={`url(#${isFus ? 'perfMeanGradientFus' : 'perfMeanGradient'})`}
                  dot={(props: DotItemDotProps) => {
                    const { cx, cy, index } = props;
                    const payload = props.payload as (typeof chartData)[number] | undefined;
                    if (cx == null || cy == null) return <g key={`empty-${index}`} />;
                    const isSelected = Boolean(payload?.id && payload.id === selectedEvaluationId);
                    const isSinglePoint = chartData.length === 1;
                    const radius = isSelected
                      ? isSinglePoint
                        ? 8
                        : 6.5
                      : isSinglePoint
                        ? 6.5
                        : 4;
                    const normalFill = isFus ? '#FF3737' : '#dc2626';
                    const selectedFill = isFus ? '#0D0D0F' : '#f59e0b';
                    return (
                      <circle
                        key={payload?.id || index}
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill={isSelected ? selectedFill : normalFill}
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-pointer"
                        onClick={e => {
                          e.stopPropagation();
                          if (payload && onSelectEvaluation) {
                            onSelectEvaluation(payload);
                          }
                        }}
                      />
                    );
                  }}
                  activeDot={(props: ActiveDotProps) => {
                    const { cx, cy } = props;
                    if (cx == null || cy == null) return <g />;
                    const payload = props.payload as (typeof chartData)[number] | undefined;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={chartData.length === 1 ? 8.5 : 7}
                        fill={isFus ? '#0D0D0F' : '#f59e0b'}
                        stroke="#ffffff"
                        strokeWidth={2.5}
                        className="cursor-pointer"
                        onClick={e => {
                          e.stopPropagation();
                          if (payload && onSelectEvaluation) {
                            onSelectEvaluation(payload);
                          }
                        }}
                      />
                    );
                  }}
                  isAnimationActive
                  animationDuration={950}
                  animationEasing="ease-in-out"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </motion.div>
  );
};

