import React, { useState, useEffect } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Trophy, Footprints, Activity, Compass, Brain } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { CandidateEvaluation } from '../types/recruitment';
import { getScoutPositionConfig, type ScoutPillarKey } from '../constants/scoutCriteriaByPosition';

export type RadarTabMode = 'summary' | 'tech' | 'tact' | 'phys' | 'ment';

interface PlayerRadarChartProps {
  evaluations: {
    name: string;
    color: string;
    eval: CandidateEvaluation;
  }[];
  detailed?: boolean;
  height?: number;
  showTabs?: boolean;
  defaultTab?: RadarTabMode;
  onTabChange?: (tab: RadarTabMode) => void;
  customPositionConfig?: any;
}

interface TabConfig {
  id: RadarTabMode;
  label: string;
  icon?: React.ElementType;
  countLabel: string;
  color: string;
  activeClass: string;
}

const RADAR_TABS: TabConfig[] = [
  {
    id: 'tech',
    label: 'Technique',
    countLabel: 'Spécifique',
    color: 'text-blue-600',
    activeClass: 'bg-blue-600 text-white shadow-xs',
  },
  {
    id: 'tact',
    label: 'Tactique',
    countLabel: 'Spécifique',
    color: 'text-emerald-600',
    activeClass: 'bg-emerald-600 text-white shadow-xs',
  },
  {
    id: 'phys',
    label: 'Physique',
    countLabel: 'Spécifique',
    color: 'text-amber-600',
    activeClass: 'bg-amber-600 text-white shadow-xs',
  },
  {
    id: 'ment',
    label: 'Mental',
    countLabel: 'Spécifique',
    color: 'text-purple-600',
    activeClass: 'bg-purple-600 text-white shadow-xs',
  },
];

export const PlayerRadarChart: React.FC<PlayerRadarChartProps> = ({
  evaluations,
  detailed = false,
  height = 360,
  showTabs = true,
  defaultTab = 'tech',
  onTabChange,
  customPositionConfig,
}) => {
  const [currentTab, setCurrentTab] = useState<RadarTabMode>(
    defaultTab || 'tech'
  );

  useEffect(() => {
    if (defaultTab) {
      setCurrentTab(defaultTab);
    }
  }, [defaultTab]);

  const handleTabSelect = (tab: RadarTabMode) => {
    setCurrentTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  if (!evaluations || evaluations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Aucune évaluation disponible pour afficher le diagramme radar.
      </div>
    );
  }

  // Helpers de secours pour la rétrocompatibilité
  const getTechValue = (c: any) => {
    return Number(c.eval.technical_score ?? c.eval.technical_rating ?? 7.0);
  };

  const getPhysValue = (c: any) => {
    return Number(c.eval.physical_score ?? c.eval.physical_rating ?? 7.0);
  };

  const getTactValue = (c: any) => {
    return Number(c.eval.tactical_score ?? c.eval.tactical_rating ?? 7.0);
  };

  const getMentValue = (c: any) => {
    return Number(c.eval.mental_score ?? c.eval.mental_rating ?? 7.0);
  };

  // Détection du poste du joueur principal
  const primaryPos = evaluations[0]?.eval.position_evaluated;
  const posConfig = customPositionConfig || getScoutPositionConfig(primaryPos);

  // Construction des données du Radar selon l'onglet actif
  let chartData: Array<{ axis: string; fullMark: number; [key: string]: string | number }> = [];

  if (currentTab === 'summary') {
    // Synthèse des 4 Piliers Fondamentaux (1–10)
    chartData = [
      {
        axis: '⚽ Technique',
        fullMark: 10,
        ...evaluations.reduce((acc, curr, idx) => {
          acc[`player_${idx}`] = Number(curr.eval.technical_score ?? (curr.eval as any).technical_rating ?? 0);
          return acc;
        }, {} as Record<string, number>),
      },
      {
        axis: '🧭 Tactique',
        fullMark: 10,
        ...evaluations.reduce((acc, curr, idx) => {
          acc[`player_${idx}`] = Number(curr.eval.tactical_score ?? (curr.eval as any).tactical_rating ?? 0);
          return acc;
        }, {} as Record<string, number>),
      },
      {
        axis: '🏃 Physique',
        fullMark: 10,
        ...evaluations.reduce((acc, curr, idx) => {
          acc[`player_${idx}`] = Number(curr.eval.physical_score ?? (curr.eval as any).physical_rating ?? 0);
          return acc;
        }, {} as Record<string, number>),
      },
      {
        axis: '🧠 Mental',
        fullMark: 10,
        ...evaluations.reduce((acc, curr, idx) => {
          acc[`player_${idx}`] = Number(curr.eval.mental_score ?? (curr.eval as any).mental_rating ?? 0);
          return acc;
        }, {} as Record<string, number>),
      },
    ];
  } else {
    // Critères spécifiques du pilier sélectionnés selon la grille du poste
    const pillarKey: ScoutPillarKey =
      currentTab === 'tech'
        ? 'technique'
        : currentTab === 'tact'
        ? 'tactique'
        : currentTab === 'phys'
        ? 'physique'
        : 'mental';

    const criteriaList = posConfig?.criteria?.[pillarKey] || [];

    chartData = criteriaList.map((criterion) => {
      const openIdx = criterion.indexOf('(');
      const cleanAxis = openIdx !== -1 ? criterion.substring(0, openIdx).trim() : criterion.trim();
      const entry: { axis: string; fullMark: number; [key: string]: string | number } = {
        axis: cleanAxis,
        fullMark: 10,
      };

      evaluations.forEach((c, idx) => {
        let val: number | undefined = c.eval.criteria_scores?.[criterion];
        if (val == null) {
          // Si une map criteria_scores existe, un critère non renseigné reste sur sa note de base (5.0)
          // afin qu'augmenter ou diminuer un critère individuel n'affecte jamais les autres critères du radar
          const hasIndividualScores = c.eval.criteria_scores && Object.keys(c.eval.criteria_scores).length > 0;
          if (hasIndividualScores) {
            val = 5.0;
          } else {
            if (pillarKey === 'technique') val = getTechValue(c);
            else if (pillarKey === 'tactique') val = getTactValue(c);
            else if (pillarKey === 'physique') val = getPhysValue(c);
            else val = getMentValue(c);
          }
        }
        entry[`player_${idx}`] = Number(val);
      });

      return entry;
    });
  }

  // Sous-titre dynamique du radar
  const currentTabInfo = RADAR_TABS.find(t => t.id === currentTab);

  return (
    <div className="w-full flex flex-col items-center space-y-3">
      {/* 4 ONGLETS (TECHNIQUE, PHYSIQUE, TACTIQUE, MENTAL) SANS ICONES */}
      {showTabs && (
        <div className="w-full flex items-center justify-center gap-1.5 flex-wrap p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-2xs">
          {RADAR_TABS.map((tab) => {
            const isSelected = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabSelect(tab.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer",
                  isSelected
                    ? tab.activeClass
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                )}
              >
                <span>{tab.label}</span>
                <span className={cn("text-[10px] opacity-80 font-semibold", isSelected ? "text-white" : "text-slate-400")}>
                  ({tab.countLabel})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Titre & Info de l'axe actif */}
      <div className="w-full flex items-center justify-between px-2 text-[11px] text-slate-500 font-medium">
        <span className="flex items-center gap-1.5 font-bold text-slate-700">
          Radar {currentTabInfo?.label} — {chartData.length} critères mesurés ({posConfig?.code || 'Profil'})
        </span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-600 text-[10px]">
          Échelle 0 – 10
        </span>
      </div>

      {/* ZONE GRAPHIQUE RADAR */}
      <div style={{ width: '100%', height, minHeight: height || 250 }} className="relative flex flex-col items-center">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
            <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: '#334155', fontSize: 10, fontWeight: 700 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 10]}
              tick={{ fill: '#94a3b8', fontSize: 9 }}
              stroke="#cbd5e1"
            />
            {evaluations.map((item, idx) => (
              <Radar
                key={`radar-${idx}`}
                name={item.name}
                dataKey={`player_${idx}`}
                stroke={item.color}
                fill={item.color}
                fillOpacity={evaluations.length > 1 ? 0.25 : 0.4}
                strokeWidth={2.5}
              />
            ))}
            <Tooltip
              formatter={(val: any) => [`${val} / 10`, 'Note']}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                padding: '8px 12px',
                fontWeight: 600,
              }}
            />
            {evaluations.length > 1 && <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PlayerRadarChart;
