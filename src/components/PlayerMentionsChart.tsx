import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Calendar, Trash2, TrendingUp } from 'lucide-react';
import {
  buildMentionTimelinePoints,
  getMentionByScore,
  getMentionMeta,
  MENTION_OPTIONS,
  type MentionTimelinePoint,
  type PlayerMentionEntry,
} from '../utils/playerMentionsHelper';

interface PlayerMentionsChartProps {
  mentions: PlayerMentionEntry[];
  height?: number;
  title?: string;
  emptyMessage?: string;
  onSelectEntry?: (point: MentionTimelinePoint) => void;
  onDeleteEntry?: (point: MentionTimelinePoint) => void;
  compact?: boolean;
  darkSurface?: boolean;
}

const MentionChartTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0]?.payload as MentionTimelinePoint | undefined;
  if (!point) return null;
  const meta = getMentionMeta(point.mention);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
        <Calendar className="h-3 w-3 text-emerald-500" />
        <span>{point.fullDateLabel}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-black ${meta.badgeClass}`}>
          {meta.label}
        </span>
      </div>
      {point.comment ? (
        <p className="mt-1.5 max-w-[220px] text-[11px] font-medium text-slate-600 dark:text-slate-300">
          {point.comment}
        </p>
      ) : null}
    </div>
  );
};

export const PlayerMentionsChart: React.FC<PlayerMentionsChartProps> = ({
  mentions,
  height = 210,
  title = 'Courbe des mentions dans le temps',
  emptyMessage = 'Aucune mention datée enregistrée pour ce joueur.',
  onSelectEntry,
  onDeleteEntry,
  compact = false,
  darkSurface = false,
}) => {
  const points = useMemo(() => buildMentionTimelinePoints(mentions), [mentions]);
  const latestPoint = points.length > 0 ? points[points.length - 1] : null;
  const latestMeta = latestPoint ? getMentionMeta(latestPoint.mention) : null;

  return (
    <div
      className={
        darkSurface
          ? 'rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-white'
          : 'rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60'
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h4
              className={`text-xs font-black uppercase tracking-wider ${
                darkSurface ? 'text-white' : 'text-slate-900 dark:text-white'
              }`}
            >
              {title}
            </h4>
            <p className={`text-[10px] font-medium ${darkSurface ? 'text-slate-400' : 'text-slate-500'}`}>
              {points.length > 0
                ? `${points.length} évaluation${points.length > 1 ? 's' : ''} datée${points.length > 1 ? 's' : ''}`
                : 'Échelle : Faible → Moyen → Assez bien → Très bien → Top'}
            </p>
          </div>
        </div>

        {latestPoint && latestMeta && (
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold ${darkSurface ? 'text-slate-400' : 'text-slate-500'}`}>
              Dernière :
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${latestMeta.badgeClass}`}>
              {latestMeta.label}
            </span>
          </div>
        )}
      </div>

      {points.length === 0 ? (
        <div
          className={`flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center ${
            darkSurface
              ? 'border-white/15 bg-slate-950/40 text-slate-400'
              : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950/40'
          }`}
        >
          <TrendingUp className="mb-2 h-6 w-6 opacity-35" />
          <p className="text-xs font-semibold">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="mentionCurveFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={darkSurface ? 'rgba(255,255,255,0.10)' : 'rgba(148,163,184,0.25)'}
                />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 10, fontWeight: 700, fill: darkSurface ? '#cbd5e1' : '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  width={76}
                  tickFormatter={(val: number) => getMentionByScore(val).shortLabel}
                  tick={{ fontSize: 10, fontWeight: 700, fill: darkSurface ? '#e2e8f0' : '#475569' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<MentionChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#mentionCurveFill)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (typeof cx !== 'number' || typeof cy !== 'number') return <g key={props.index} />;
                    return (
                      <circle
                        key={payload.id || props.index}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill={payload.hex || '#10b981'}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    );
                  }}
                  activeDot={{ r: 7, stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Légende des 5 mentions */}
          {!compact && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 border-t border-slate-200/70 pt-2.5 dark:border-slate-800">
              {MENTION_OPTIONS.map(opt => (
                <span key={opt.id} className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: opt.hex }} />
                  {opt.label}
                </span>
              ))}
            </div>
          )}

          {/* Historique daté interactif */}
          <div className="mt-3 max-h-36 space-y-1.5 overflow-y-auto pr-1">
            {[...points].reverse().map(pt => {
              const meta = getMentionMeta(pt.mention);
              return (
                <div
                  key={pt.id}
                  onClick={() => onSelectEntry?.(pt)}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-1.5 text-xs transition ${
                    onSelectEntry ? 'cursor-pointer hover:border-emerald-400' : ''
                  } ${
                    darkSurface
                      ? 'border-white/10 bg-slate-800/60 text-slate-200'
                      : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 font-mono text-[11px] font-bold text-slate-400">
                      {pt.fullDateLabel}
                    </span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                    {pt.comment && (
                      <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        — {pt.comment}
                      </span>
                    )}
                  </div>
                  {onDeleteEntry && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteEntry(pt);
                      }}
                      title="Supprimer cette mention"
                      className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default PlayerMentionsChart;

