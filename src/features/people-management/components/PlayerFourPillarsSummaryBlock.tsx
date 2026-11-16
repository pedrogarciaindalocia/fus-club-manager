import React, { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Loader2,
  Shield,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { usePermissions } from '../../../context/PermissionsContext';
import { isScoutBranch } from '../../../constants/roles';
import {
  playerPerformanceService,
  type PlayerPerformanceEvaluation,
} from '../../../services/playerPerformanceService';
import { buildPlayerPerformanceDiagnosis } from '../../../utils/playerPerformanceAnalysisHelper';
import { getMetricPositionFrenchName } from '../../../utils/metricSetsHelpers';
import type { Player } from '../../../types';
import { Badge } from '../../../components/ui/badge';
import { cn } from '../../../lib/utils';

interface PlayerFourPillarsSummaryBlockProps {
  player: Player;
  rawPlayerMatches: any[];
  opponentClubs: any[];
  mainClub: any;
  onNavigateToEvaluation?: () => void;
}

type SummaryViewMode = 'average' | 'latest' | 'date';

function formatFrDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso.slice(0, 10)), 'dd MMM yyyy', { locale: fr });
  } catch {
    return iso;
  }
}

function getSlicePalette(score: number, hasData: boolean): {
  wedgeFill: string;
  badgeBg: string;
  badgeText: string;
} {
  if (!hasData) {
    return {
      wedgeFill: '#e2e8f0',
      badgeBg: '#e2e8f0',
      badgeText: '#64748b',
    };
  }
  if (score >= 7.5) {
    return {
      wedgeFill: '#4ade80',
      badgeBg: '#4ade80',
      badgeText: '#052e16',
    };
  }
  if (score >= 5) {
    return {
      wedgeFill: '#facc15',
      badgeBg: '#facc15',
      badgeText: '#422006',
    };
  }
  return {
    wedgeFill: '#f43f5e',
    badgeBg: '#f43f5e',
    badgeText: '#ffffff',
  };
}

function formatScoreNum(val: number): string {
  const r = Math.round(val * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function buildWedgePath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number
): string {
  if (r <= 0.5) return '';
  const rad1 = (startDeg * Math.PI) / 180;
  const rad2 = (endDeg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad1);
  const y1 = cy + r * Math.sin(rad1);
  const x2 = cx + r * Math.cos(rad2);
  const y2 = cy + r * Math.sin(rad2);
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(
    2
  )} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

export const PlayerFourPillarsSummaryBlock: React.FC<PlayerFourPillarsSummaryBlockProps> = ({
  player,
  rawPlayerMatches,
  opponentClubs,
  mainClub,
  onNavigateToEvaluation,
}) => {
  const { authState, hasSubModuleAccess } = usePermissions();
  const currentRole = authState.user?.system_role || authState.roles?.[0] || null;
  const currentJobTitle = authState.user?.job_title || null;
  const isScout = isScoutBranch(currentRole, currentJobTitle);

  const canOpenPerfModule = hasSubModuleAccess('player_performance', 'read') && !isScout;

  const [dbEvaluations, setDbEvaluations] = useState<PlayerPerformanceEvaluation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<SummaryViewMode>('average');
  const [selectedEvalId, setSelectedEvalId] = useState<string>('');

  useEffect(() => {
    if (!player?.id || isScout) {
      setDbEvaluations([]);
      return;
    }
    let mounted = true;
    setLoading(true);
    playerPerformanceService
      .listByPlayer(player.id, currentRole, currentJobTitle)
      .then(rows => {
        if (mounted) setDbEvaluations(rows);
      })
      .catch(() => {
        if (mounted) setDbEvaluations([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [player?.id, currentRole, currentJobTitle, isScout]);

  const timeline = useMemo(
    () =>
      playerPerformanceService.buildUnifiedTimeline(
        dbEvaluations,
        rawPlayerMatches || [],
        player.id,
        player.position,
        opponentClubs,
        mainClub
      ),
    [dbEvaluations, rawPlayerMatches, player.id, player.position, opponentClubs, mainClub]
  );

  useEffect(() => {
    setViewMode('average');
    setSelectedEvalId('');
  }, [player?.id]);

  const summaryData = useMemo(() => {
    if (timeline.length === 0) {
      return {
        hasData: false,
        count: 0,
        scores: { technique: 0, tactique: 0, physique: 0, mental: 0, global: 0 },
        inspectedEval: null as PlayerPerformanceEvaluation | null,
        posDisplay: player.position ? getMetricPositionFrenchName(player.position) : 'Non défini',
        dateLabel: 'Aucune évaluation',
        trendDiff: null as number | null,
        comment: '',
      };
    }

    const latest = timeline[timeline.length - 1];
    const prev = timeline.length >= 2 ? timeline[timeline.length - 2] : null;
    const trendDiff = prev ? Number((latest.global_score - prev.global_score).toFixed(1)) : null;

    if (viewMode === 'latest' || (viewMode === 'date' && selectedEvalId)) {
      const target =
        viewMode === 'date'
          ? timeline.find(t => t.id === selectedEvalId) || latest
          : latest;
      return {
        hasData: true,
        count: timeline.length,
        scores: {
          technique: Number(Number(target.technique_score || 0).toFixed(1)),
          tactique: Number(Number(target.tactique_score || 0).toFixed(1)),
          physique: Number(Number(target.physique_score || 0).toFixed(1)),
          mental: Number(Number(target.mental_score || 0).toFixed(1)),
          global: Number(Number(target.global_score || 0).toFixed(1)),
        },
        inspectedEval: target,
        posDisplay: `${getMetricPositionFrenchName({
          code: target.position_code,
          name: target.position_name,
        })} (${target.position_code})`,
        dateLabel: formatFrDate(target.evaluation_date),
        trendDiff,
        comment: target.comment || '',
      };
    }

    const n = timeline.length;
    const avgOf = (getter: (ev: PlayerPerformanceEvaluation) => number) =>
      Number((timeline.reduce((acc, ev) => acc + Number(getter(ev) || 0), 0) / n).toFixed(1));

    return {
      hasData: true,
      count: n,
      scores: {
        technique: avgOf(e => e.technique_score),
        tactique: avgOf(e => e.tactique_score),
        physique: avgOf(e => e.physique_score),
        mental: avgOf(e => e.mental_score),
        global: avgOf(e => e.global_score),
      },
      inspectedEval: latest,
      posDisplay: `${getMetricPositionFrenchName({
        code: latest.position_code,
        name: latest.position_name,
      })} (${latest.position_code})`,
      dateLabel:
        n === 1
          ? formatFrDate(latest.evaluation_date)
          : `Dernière : ${formatFrDate(latest.evaluation_date)}`,
      trendDiff,
      comment: latest.comment || '',
    };
  }, [timeline, viewMode, selectedEvalId, player.position]);

  const diagnosis = useMemo(() => {
    if (!summaryData.hasData) return null;
    const refEv = summaryData.inspectedEval;
    return buildPlayerPerformanceDiagnosis({
      playerName: player.full_name,
      positionCode: refEv?.position_code || player.position || 'CM',
      positionName: refEv?.position_name || undefined,
      evaluationDate: refEv?.evaluation_date || new Date().toISOString().slice(0, 10),
      scores: summaryData.scores,
      criteriaScores: refEv?.criteria_scores || {},
      coachNote: summaryData.comment,
      history: timeline,
      currentEvaluationId: refEv?.id || null,
    });
  }, [summaryData, player.full_name, player.position, timeline]);

  if (isScout) return null;

  // Géométrie exacte du Pizza / Polar Radial Chart (style BeSoccer fourni)
  const svgW = 360;
  const svgH = 310;
  const cx = svgW / 2;
  const cy = svgH / 2 + 4;
  const R = 88;
  const rings = [2, 4, 6, 8, 10];

  const sectorConfigs = [
    {
      key: 'technique' as const,
      label: 'TECHNIQUE',
      startDeg: -135,
      endDeg: -45,
      score: summaryData.scores.technique,
      labelX: cx,
      labelY: cy - R - 46,
      circleX: cx,
      circleY: cy - R - 23,
      textAnchor: 'middle' as const,
    },
    {
      key: 'tactique' as const,
      label: 'TACTIQUE',
      startDeg: -45,
      endDeg: 45,
      score: summaryData.scores.tactique,
      labelX: cx + R + 42,
      labelY: cy - 16,
      circleX: cx + R + 42,
      circleY: cy + 8,
      textAnchor: 'middle' as const,
    },
    {
      key: 'physique' as const,
      label: 'PHYSIQUE',
      startDeg: 45,
      endDeg: 135,
      score: summaryData.scores.physique,
      labelX: cx,
      labelY: cy + R + 54,
      circleX: cx,
      circleY: cy + R + 27,
      textAnchor: 'middle' as const,
    },
    {
      key: 'mental' as const,
      label: 'MENTAL',
      startDeg: 135,
      endDeg: 225,
      score: summaryData.scores.mental,
      labelX: cx - R - 42,
      labelY: cy - 16,
      circleX: cx - R - 42,
      circleY: cy + 8,
      textAnchor: 'middle' as const,
    },
  ];

  const rayAngles = [-135, -45, 45, 135];

  return (
    <div className="bg-white rounded-3xl border border-secondary/70 shadow-sm p-6 space-y-5">
      {/* En-tête du bloc Résumé des 4 Piliers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-secondary/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-5 bg-primary rounded-full" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              Résumé des 4 Piliers
              {summaryData.hasData && (
                <Badge className="bg-slate-900 text-amber-400 text-[10px] font-black">
                  {summaryData.count} éval.{summaryData.count > 1 ? 's' : ''}
                </Badge>
              )}
            </h3>
            <p className="text-[11px] font-medium text-muted-foreground">
              Synthèse Technique, Tactique, Physique &amp; Mental (échelle 0–10)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {summaryData.count > 1 && (
            <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('average')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer',
                  viewMode === 'average'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Moyenne ({summaryData.count})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('latest')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer',
                  viewMode === 'latest'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Dernière éval.
              </button>
            </div>
          )}

          {summaryData.count > 1 && (
            <select
              aria-label="Choisir une date d'évaluation"
              value={viewMode === 'date' ? selectedEvalId : ''}
              onChange={e => {
                const val = e.target.value;
                if (!val) {
                  setViewMode('average');
                  setSelectedEvalId('');
                } else {
                  setViewMode('date');
                  setSelectedEvalId(val);
                }
              }}
              className="h-8 px-2.5 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 focus:outline-none"
            >
              <option value="">Par date…</option>
              {[...timeline].reverse().map(ev => (
                <option key={ev.id} value={ev.id}>
                  {formatFrDate(ev.evaluation_date)} · {ev.position_code} ({formatScoreNum(ev.global_score)}/10)
                </option>
              ))}
            </select>
          )}

          {canOpenPerfModule && onNavigateToEvaluation && (
            <button
              type="button"
              onClick={onNavigateToEvaluation}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-black transition cursor-pointer"
            >
              <span>Évaluer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Chargement du résumé des 4 piliers…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Colonne Gauche : Pizza / Polar Radial Chart 4 Piliers exact */}
          <div className="lg:col-span-6 flex items-center justify-center">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full max-w-[360px] h-auto select-none"
              role="img"
              aria-label={`Résumé radar des 4 piliers pour ${player.full_name}`}
            >
              {/* Fond circulaire clair */}
              <circle cx={cx} cy={cy} r={R} fill="#f8fafc" />

              {/* Secteurs colorés proportionnels aux notes des 4 piliers */}
              {sectorConfigs.map(sec => {
                const palette = getSlicePalette(sec.score, summaryData.hasData);
                const clamped = Math.min(10, Math.max(0, sec.score));
                const sliceR = summaryData.hasData ? (clamped / 10) * R : 0;
                const d = buildWedgePath(cx, cy, sliceR, sec.startDeg, sec.endDeg);
                return d ? (
                  <path
                    key={`wedge-${sec.key}`}
                    d={d}
                    fill={palette.wedgeFill}
                    fillOpacity={0.92}
                  />
                ) : null;
              })}

              {/* Anneaux concentriques subtils par-dessus les secteurs */}
              {rings.map(val => {
                const rr = (val / 10) * R;
                const isOuter = val === 10;
                return (
                  <circle
                    key={`ring-${val}`}
                    cx={cx}
                    cy={cy}
                    r={rr}
                    fill="none"
                    stroke={isOuter ? '#64748b' : '#cbd5e1'}
                    strokeWidth={isOuter ? 2.2 : 1}
                  />
                );
              })}

              {/* 4 Rayons séparateurs nets */}
              {rayAngles.map(deg => {
                const rad = (deg * Math.PI) / 180;
                const x2 = cx + R * Math.cos(rad);
                const y2 = cy + R * Math.sin(rad);
                return (
                  <line
                    key={`ray-${deg}`}
                    x1={cx}
                    y1={cy}
                    x2={x2}
                    y2={y2}
                    stroke="#64748b"
                    strokeWidth={1.6}
                  />
                );
              })}

              {/* Point central discret */}
              <circle cx={cx} cy={cy} r={2.5} fill="#64748b" />

              {/* Libellés + Pastilles rondes colorées externes */}
              {sectorConfigs.map(sec => {
                const palette = getSlicePalette(sec.score, summaryData.hasData);
                return (
                  <g key={`badge-${sec.key}`}>
                    <text
                      x={sec.labelX}
                      y={sec.labelY}
                      textAnchor={sec.textAnchor}
                      fill="#1e293b"
                      fontSize="11.5"
                      fontWeight="800"
                      letterSpacing="0.6"
                    >
                      {sec.label}
                    </text>
                    <circle
                      cx={sec.circleX}
                      cy={sec.circleY}
                      r={16.5}
                      fill={palette.badgeBg}
                    />
                    <text
                      x={sec.circleX}
                      y={sec.circleY + 4.5}
                      textAnchor="middle"
                      fill={palette.badgeText}
                      fontSize="12.5"
                      fontWeight="900"
                    >
                      {summaryData.hasData ? formatScoreNum(sec.score) : '—'}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Colonne Droite : Note Globale, Poste évalué & Lecture synthétique */}
          <div className="lg:col-span-6 space-y-3.5">
            {summaryData.hasData ? (
              <>
                <div className="rounded-2xl bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                      Note Globale — 4 Piliers
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-3xl font-black text-amber-400 tabular-nums">
                        {formatScoreNum(summaryData.scores.global)}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/ 10</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    {summaryData.trendDiff !== null && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black',
                          summaryData.trendDiff > 0
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : summaryData.trendDiff < 0
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-white/10 text-slate-200'
                        )}
                      >
                        {summaryData.trendDiff > 0 && <TrendingUp className="w-3 h-3" />}
                        {summaryData.trendDiff < 0 && <TrendingDown className="w-3 h-3" />}
                        {summaryData.trendDiff > 0
                          ? `+${summaryData.trendDiff} pt récent`
                          : summaryData.trendDiff < 0
                            ? `${summaryData.trendDiff} pt récent`
                            : 'Forme stable'}
                      </span>
                    )}
                    <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-300 font-semibold">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      <span>{summaryData.dateLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 font-black text-slate-800">
                    <Shield className="w-4 h-4 text-primary shrink-0" />
                    <span>Évalué au poste : {summaryData.posDisplay}</span>
                  </div>
                  {diagnosis && (
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full border text-[10px] font-black',
                        diagnosis.levelBadgeClass
                      )}
                    >
                      {diagnosis.levelLabel}
                    </span>
                  )}
                </div>

                {diagnosis && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-3 space-y-1">
                      <div className="text-[10px] font-black uppercase text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Point fort clé</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900">
                        {diagnosis.strengths[0]?.label || 'Profil équilibré'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-3 space-y-1">
                      <div className="text-[10px] font-black uppercase text-amber-800 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Axe à travailler</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900">
                        {diagnosis.workAxes[0]?.criterionTitle || 'Perfectionnement'}
                      </p>
                    </div>
                  </div>
                )}

                {summaryData.comment && (
                  <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 text-xs text-slate-700 leading-relaxed">
                    <span className="font-black text-slate-900">Observation récente : </span>
                    {summaryData.comment}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center space-y-2.5">
                <Activity className="w-7 h-7 text-slate-400 mx-auto" />
                <p className="text-xs font-black text-slate-800">
                  Aucune évaluation des 4 piliers enregistrée pour {player.full_name}
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Les notes Technique, Tactique, Physique et Mental saisies depuis Performance Joueur ou l&apos;app mobile s&apos;afficheront automatiquement ici.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerFourPillarsSummaryBlock;

