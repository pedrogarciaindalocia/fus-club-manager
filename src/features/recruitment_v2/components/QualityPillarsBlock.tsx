import React, { useMemo } from 'react';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { cn } from '../../../lib/utils';
import { useMetrics } from '../../../hooks/useMetrics';
import { getScoutPositionConfig, type ScoutPillarKey } from '../constants/scoutCriteriaByPosition';
import type { CandidateEvaluation } from '../types/recruitment';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export type PillarKey = 'tech' | 'tact' | 'phys' | 'ment';

interface QualityPillarsBlockProps {
  report: CandidateEvaluation;
  positionCode?: string;
  customPositionConfig?: any;
}

const pillarConfig: Record<PillarKey, { label: string; color: string }> = {
  tech: { label: 'Technique', color: '#3b82f6' },
  tact: { label: 'Tactique', color: '#10b981' },
  phys: { label: 'Physique', color: '#f59e0b' },
  ment: { label: 'Mental', color: '#8b5cf6' },
};

const parseCriterion = (criterion: string) => {
  const open = criterion.indexOf('(');
  const close = criterion.lastIndexOf(')');
  if (open !== -1 && close > open) {
    return criterion.substring(0, open).trim();
  }
  return criterion.trim();
};

const buildChartData = (
  pillar: PillarKey,
  criteriaList: string[],
  report: CandidateEvaluation,
) => {
  const scores = criteriaList.map((crit) => {
    const raw = report.criteria_scores?.[crit];
    if (typeof raw === 'number') return raw;
    return 0;
  });
  return {
    labels: criteriaList.map(parseCriterion),
    datasets: [
      {
        label: pillarConfig[pillar].label,
        data: scores,
        backgroundColor: `${pillarConfig[pillar].color}33`,
        borderColor: pillarConfig[pillar].color,
        pointBackgroundColor: pillarConfig[pillar].color,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: pillarConfig[pillar].color,
        fill: true,
      },
    ],
  };
};

const chartOptions = {
  maintainAspectRatio: false,
  scales: {
    r: {
      suggestedMin: 0,
      suggestedMax: 10,
      ticks: { display: false },
      grid: { color: '#e5e7eb' },
      angleLines: { color: '#e5e7eb' },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: any) => `${context.label}: ${context.formattedValue}`,
      },
    },
  },
};

export const QualityPillarsBlock: React.FC<QualityPillarsBlockProps> = ({
  report,
  positionCode,
  customPositionConfig,
}) => {
  const { getPositionByCode } = useMetrics();
  const posConfig =
    customPositionConfig ||
    getPositionByCode(positionCode) ||
    getScoutPositionConfig(positionCode);

  const charts = useMemo(() => {
    const blocks: Record<PillarKey, { data: any }> = {
      tech: { data: null },
      tact: { data: null },
      phys: { data: null },
      ment: { data: null },
    };
    (Object.keys(pillarConfig) as PillarKey[]).forEach((p) => {
      const pillarKey =
        p === 'tech'
          ? 'technique'
          : p === 'tact'
          ? 'tactique'
          : p === 'phys'
          ? 'physique'
          : 'mental';
      const criteria = (posConfig?.criteria?.[pillarKey] || []) as string[];
      blocks[p].data = buildChartData(p, criteria, report);
    });
    return blocks;
  }, [report, posConfig]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(Object.keys(pillarConfig) as PillarKey[]).map((p) => {
        const cfg = pillarConfig[p];
        const chartData = charts[p].data;
        return (
          <div key={p} className="bg-white rounded-xl shadow-sm p-4">
            <h3 className={cn('text-lg font-semibold mb-2', cfg.color)}>{cfg.label}</h3>
            <div className="h-48 w-full relative">
              <Radar data={chartData} options={chartOptions} />
            </div>
            <p className="mt-2 text-sm text-gray-600">Note : ---</p>
          </div>
        );
      })}
    </div>
  );
};
