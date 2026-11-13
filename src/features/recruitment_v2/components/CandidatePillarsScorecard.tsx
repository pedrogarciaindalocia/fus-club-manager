import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Zap,
  Target,
  Flame,
  Brain,
  Sparkles,
  ExternalLink,
  UserCheck,
  Calendar,
  Info,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  getScoutPositionConfig,
  getFrenchPositionLabel,
  type ScoutPillarKey
} from '../constants/scoutCriteriaByPosition';
import type { TrialCandidate, CandidateEvaluation } from '../types/recruitment';

export type PillarId = 'tech' | 'tact' | 'phys' | 'ment' | 'pot' | 'summary';

interface CandidatePillarsScorecardProps {
  candidate: TrialCandidate;
  latestEval?: CandidateEvaluation;
  techScore: number | null;
  tactScore: number | null;
  physScore: number | null;
  mentScore: number | null;
  potentialScore: number | null;
  onOpenDetail?: () => void;
  className?: string;
}

// Helper pour extraire l'intitulé propre d'un critère et ses détails entre parenthèses
export const parseCriterion = (criterion: string) => {
  const openIndex = criterion.indexOf('(');
  const closeIndex = criterion.lastIndexOf(')');
  if (openIndex !== -1 && closeIndex > openIndex) {
    const title = criterion.substring(0, openIndex).trim();
    const detail = criterion.substring(openIndex + 1, closeIndex).trim();
    return { title, detail };
  }
  return { title: criterion.trim(), detail: null };
};

// Helper pour extraire résolument la note d'un critère
export const getPillarCriterionScore = (
  criteriaScores: Record<string, number> | undefined,
  critName: string,
  pillarKeyStr: ScoutPillarKey,
  _fallbackScore: number = 0
): number => {
  if (!criteriaScores || Object.keys(criteriaScores).length === 0) return 0;
  const pillarPrefixKey = `${pillarKeyStr}-${critName}`;
  if (criteriaScores[pillarPrefixKey] !== undefined) return Number(criteriaScores[pillarPrefixKey]);
  if (criteriaScores[critName] !== undefined) return Number(criteriaScores[critName]);

  const parsedTitle = parseCriterion(critName).title;
  if (criteriaScores[`${pillarKeyStr}-${parsedTitle}`] !== undefined) return Number(criteriaScores[`${pillarKeyStr}-${parsedTitle}`]);
  if (criteriaScores[parsedTitle] !== undefined) return Number(criteriaScores[parsedTitle]);

  for (const [key, val] of Object.entries(criteriaScores)) {
    const cleanKey = key.includes('-') ? key.split('-').slice(1).join('-') : key;
    if (cleanKey.trim().toLowerCase() === critName.trim().toLowerCase()) return Number(val);
    const keyTitle = parseCriterion(cleanKey).title;
    if (keyTitle && keyTitle.trim().toLowerCase() === parsedTitle.trim().toLowerCase()) return Number(val);
  }

  return 0;
};

// SVG Radar Chart Component ultra-léger et interactif
interface RadarAxisData {
  label: string;
  fullLabel?: string;
  value: number; // 0 à 10
}

interface SvgRadarProps {
  data: RadarAxisData[];
  colorHex: string;
  size?: number;
  highlightedIndex?: number | null;
  onHoverAxis?: (index: number | null) => void;
}

const SvgRadarChart: React.FC<SvgRadarProps> = ({
  data,
  colorHex,
  size = 200,
  highlightedIndex = null,
  onHoverAxis
}) => {
  if (!data || data.length < 3) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-400 italic bg-slate-50/50 rounded-xl border border-slate-200"
        style={{ width: size, height: size }}
      >
        Données insuffisantes
      </div>
    );
  }

  const center = size / 2;
  const radius = (size / 2) - 30; // Marge pour les labels
  const totalAxes = data.length;
  const angleSlice = (Math.PI * 2) / totalAxes;

  // Niveaux de grille (2.5, 5.0, 7.5, 10.0)
  const levels = [0.25, 0.5, 0.75, 1.0];

  // Calcul coordonnées polaires -> cartésiennes
  const getCoordinates = (valueNormalized: number, index: number) => {
    const angle = index * angleSlice - Math.PI / 2;
    const r = valueNormalized * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Coordonnées du polygone de données
  const dataPoints = data.map((d, i) => {
    const valNorm = Math.min(10, Math.max(0, d.value)) / 10;
    return getCoordinates(valNorm, i);
  });

  const polygonPath = dataPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ') + ' Z';

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id={`radarGradient-${colorHex.replace('#', '')}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colorHex} stopOpacity="0.45" />
            <stop offset="100%" stopColor={colorHex} stopOpacity="0.15" />
          </radialGradient>
        </defs>

        {/* Cercles / Polygones concentriques de référence */}
        {levels.map((lvl, lvlIdx) => {
          const ringPoints = Array.from({ length: totalAxes }).map((_, i) => {
            const pt = getCoordinates(lvl, i);
            return `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
          }).join(' ') + ' Z';

          return (
            <g key={lvlIdx}>
              <path
                d={ringPoints}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={lvlIdx === levels.length - 1 ? "1.5" : "1"}
                strokeDasharray={lvlIdx === 1 ? "3 3" : undefined}
              />
              {/* Repère note sur l'axe vertical supérieur */}
              <text
                x={center + 3}
                y={center - (lvl * radius) + 3}
                fontSize="8"
                fill="#94a3b8"
                fontWeight="bold"
              >
                {(lvl * 10).toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Axes radiaux */}
        {data.map((d, i) => {
          const edgePt = getCoordinates(1.0, i);
          const isHighlighted = highlightedIndex === i;

          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={edgePt.x}
              y2={edgePt.y}
              stroke={isHighlighted ? colorHex : "#cbd5e1"}
              strokeWidth={isHighlighted ? "2" : "1"}
              strokeDasharray={isHighlighted ? undefined : "2 2"}
            />
          );
        })}

        {/* Polygone de données (Surface remplie) */}
        <path
          d={polygonPath}
          fill={`url(#radarGradient-${colorHex.replace('#', '')})`}
          stroke={colorHex}
          strokeWidth="2.5"
          className="transition-all duration-300 ease-out"
        />

        {/* Points sur les sommets */}
        {dataPoints.map((pt, i) => {
          const isHighlighted = highlightedIndex === i;
          return (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={isHighlighted ? 5.5 : 3.5}
              fill="#ffffff"
              stroke={colorHex}
              strokeWidth={isHighlighted ? 3 : 2}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => onHoverAxis?.(i)}
              onMouseLeave={() => onHoverAxis?.(null)}
            >
              <title>{`${data[i].fullLabel || data[i].label} : ${data[i].value.toFixed(1)}/10`}</title>
            </circle>
          );
        })}

        {/* Libellés des axes */}
        {data.map((d, i) => {
          const labelDist = 1.15;
          const labelPt = getCoordinates(labelDist, i);
          const isHighlighted = highlightedIndex === i;

          // Alignement horizontal du texte selon la position
          let textAnchor: 'middle' | 'start' | 'end' = 'middle';
          if (labelPt.x < center - 10) textAnchor = 'end';
          else if (labelPt.x > center + 10) textAnchor = 'start';

          return (
            <text
              key={i}
              x={labelPt.x}
              y={labelPt.y + 3}
              textAnchor={textAnchor}
              fontSize={isHighlighted ? "10" : "8.5"}
              fontWeight={isHighlighted ? "800" : "600"}
              fill={isHighlighted ? colorHex : "#475569"}
              className="cursor-pointer transition-colors"
              onMouseEnter={() => onHoverAxis?.(i)}
              onMouseLeave={() => onHoverAxis?.(null)}
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export const CandidatePillarsScorecard: React.FC<CandidatePillarsScorecardProps> = ({
  candidate,
  latestEval,
  techScore,
  tactScore,
  physScore,
  mentScore,
  potentialScore,
  onOpenDetail,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PillarId>('tech');
  const [hoveredCriterionIdx, setHoveredCriterionIdx] = useState<number | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Configuration du poste et de ses critères
  const posConfig = useMemo(() => {
    return getScoutPositionConfig(latestEval?.position_evaluated || candidate.primary_position);
  }, [latestEval?.position_evaluated, candidate.primary_position]);

  // Définition des piliers
  const pillarsConfig = useMemo(() => {
    return [
      {
        id: 'tech' as PillarId,
        scoutKey: 'technique' as ScoutPillarKey,
        shortLabel: 'TEC',
        label: 'Technique',
        score: techScore,
        colorHex: '#2563eb', // Bleu
        textColor: 'text-blue-700',
        badgeBg: 'bg-blue-50 border-blue-200/90',
        progressBg: 'from-blue-500 to-indigo-600',
        icon: Zap,
      },
      {
        id: 'tact' as PillarId,
        scoutKey: 'tactique' as ScoutPillarKey,
        shortLabel: 'TAC',
        label: 'Tactique',
        score: tactScore,
        colorHex: '#059669', // Émeraude
        textColor: 'text-emerald-700',
        badgeBg: 'bg-emerald-50 border-emerald-200/90',
        progressBg: 'from-emerald-500 to-teal-600',
        icon: Target,
      },
      {
        id: 'phys' as PillarId,
        scoutKey: 'physique' as ScoutPillarKey,
        shortLabel: 'PHY',
        label: 'Physique',
        score: physScore,
        colorHex: '#d97706', // Ambre
        textColor: 'text-amber-700',
        badgeBg: 'bg-amber-50 border-amber-200/90',
        progressBg: 'from-amber-500 to-orange-500',
        icon: Flame,
      },
      {
        id: 'ment' as PillarId,
        scoutKey: 'mental' as ScoutPillarKey,
        shortLabel: 'MEN',
        label: 'Mental',
        score: mentScore,
        colorHex: '#7c3aed', // Violet
        textColor: 'text-purple-700',
        badgeBg: 'bg-purple-50 border-purple-200/90',
        progressBg: 'from-purple-500 to-pink-600',
        icon: Brain,
      },
      {
        id: 'pot' as PillarId,
        scoutKey: undefined,
        shortLabel: 'POT',
        label: 'Potentiel',
        score: potentialScore,
        colorHex: '#10b981',
        textColor: 'text-emerald-700',
        badgeBg: 'bg-emerald-50 border-emerald-200/80',
        progressBg: 'from-emerald-500 to-green-600',
        icon: Sparkles,
      },
    ];
  }, [techScore, tactScore, physScore, mentScore, potentialScore]);

  // Calcul de la position optimale du popover
  const updatePosition = useCallback((targetEl: HTMLElement) => {
    const rect = targetEl.getBoundingClientRect();
    const popoverWidth = 540;
    const popoverHeight = 360;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Déterminer s'il faut ouvrir au-dessus ou en-dessous
    const spaceBelow = windowHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight + 20 && rect.top > popoverHeight + 20;

    const top = placeAbove
      ? rect.top - popoverHeight - 8
      : rect.bottom + 8;

    // Centrage horizontal avec contraintes écran
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left < 16) left = 16;
    if (left + popoverWidth > windowWidth - 16) {
      left = windowWidth - popoverWidth - 16;
    }

    setPopoverPos({ top, left, placeAbove });
  }, []);

  const handlePillarMouseEnter = (pillarId: PillarId, e: React.MouseEvent<HTMLDivElement>) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveTab(pillarId);
    updatePosition(containerRef.current || e.currentTarget);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setHoveredCriterionIdx(null);
    }, 180);
  };

  const handlePopoverMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handlePopoverMouseLeave = () => {
    handleMouseLeave();
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Détermination des critères pour l'onglet actif
  const currentPillarMeta = pillarsConfig.find(p => p.id === activeTab) || pillarsConfig[0];

  // Données des critères pour le pilier sélectionné
  const currentCriteriaList = useMemo(() => {
    if (activeTab === 'summary' || activeTab === 'pot' || !currentPillarMeta.scoutKey) {
      return [];
    }
    const rawList = posConfig.criteria[currentPillarMeta.scoutKey] || [];
    return rawList.map((crit) => {
      const { title, detail } = parseCriterion(crit);
      const score = getPillarCriterionScore(
        latestEval?.criteria_scores,
        crit,
        currentPillarMeta.scoutKey!,
        0
      );
      return {
        raw: crit,
        title,
        detail,
        score,
        isRecorded: latestEval?.criteria_scores && Object.keys(latestEval.criteria_scores).length > 0,
      };
    });
  }, [activeTab, currentPillarMeta, posConfig, latestEval]);

  // Données pour le radar SVG
  const radarData: RadarAxisData[] = useMemo(() => {
    if (activeTab === 'summary' || activeTab === 'pot') {
      // Vue Synthèse 4 Piliers
      return [
        { label: 'Technique', fullLabel: 'Pilier Technique', value: techScore ?? 0 },
        { label: 'Tactique', fullLabel: 'Pilier Tactique', value: tactScore ?? 0 },
        { label: 'Physique', fullLabel: 'Pilier Physique', value: physScore ?? 0 },
        { label: 'Mental', fullLabel: 'Pilier Mental', value: mentScore ?? 0 },
      ];
    }

    // Vue Sous-Critères du pilier
    return currentCriteriaList.map(c => {
      // Nom court pour l'axe
      let shortLabel = c.title;
      if (shortLabel.length > 14) {
        shortLabel = shortLabel.substring(0, 12) + '…';
      }
      return {
        label: shortLabel,
        fullLabel: c.title,
        value: c.score,
      };
    });
  }, [activeTab, techScore, tactScore, physScore, mentScore, currentCriteriaList]);

  // Évaluation d'appréciation qualitative
  const getQualityTier = (val: number | null) => {
    if (val == null) return { text: 'En attente', class: 'bg-slate-100 text-slate-500' };
    if (val >= 8.5) return { text: 'Élite / Remarquable', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (val >= 7.0) return { text: 'Très Bon Profil', class: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (val >= 5.5) return { text: 'Solide / Standard', class: 'bg-slate-100 text-slate-700 border-slate-300' };
    if (val >= 4.0) return { text: 'Moyen / En progrès', class: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { text: 'Points à renforcer', class: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  const isEvaluated = techScore != null || tactScore != null || physScore != null || mentScore != null;

  return (
    <>
      {/* BADGES SCORECARD (DANS LE TABLEAU) */}
      <div
        ref={containerRef}
        className={cn(
          "inline-flex items-center gap-1 bg-slate-50/90 border border-slate-200/80 p-1.5 rounded-xl shadow-2xs transition-all",
          isOpen && "ring-2 ring-primary/30 border-primary/40 bg-white",
          className
        )}
        onMouseLeave={handleMouseLeave}
      >
        {pillarsConfig.map((p, idx) => {
          const isPot = p.id === 'pot';
          const isPillarHovered = isOpen && activeTab === p.id;

          return (
            <React.Fragment key={p.id}>
              {idx > 0 && <div className="h-4 w-px bg-slate-200 shrink-0" />}
              <div
                onMouseEnter={(e) => handlePillarMouseEnter(p.id, e)}
                className={cn(
                  "px-1.5 py-0.5 rounded flex flex-col items-center cursor-pointer transition-all duration-150 select-none",
                  isPot ? "bg-emerald-50 border border-emerald-200/80 rounded-md" : "",
                  isPillarHovered
                    ? cn(p.badgeBg, "scale-105 shadow-2xs font-extrabold")
                    : "hover:bg-slate-100 hover:scale-105"
                )}
                title={`Survoler pour afficher le radar & critères détaillés : ${p.label} (${p.score != null ? `${p.score.toFixed(1)}/10` : isPot ? '0.0/10' : 'En attente'})`}
              >
                <span className={cn(
                  "text-[8px] font-black uppercase transition-colors",
                  isPot ? "text-emerald-700" : isPillarHovered ? p.textColor : "text-slate-400"
                )}>
                  {p.shortLabel}
                </span>
                <span className={cn(
                  "text-xs font-black transition-colors",
                  isPot
                    ? (p.score != null && p.score > 0 ? "text-emerald-700" : "text-slate-600")
                    : isPillarHovered
                      ? p.textColor
                      : (p.score != null ? "text-slate-900" : "text-slate-300")
                )}>
                  {isPot
                    ? (p.score != null ? p.score.toFixed(1) : '0.0')
                    : (p.score != null ? p.score.toFixed(1) : '-')}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* POPUP RADAR & BARRES DE PROGRESSION (RENDU VIA PORTAL DANS BODY POUR ÉVITER TOUT OVERFLOW) */}
      {isOpen && popoverPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
          style={{
            position: 'fixed',
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
            width: '540px',
            zIndex: 99999,
          }}
          className={cn(
            "bg-white/98 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl p-4 text-slate-800 animate-in fade-in zoom-in-95 duration-150",
            "divide-y divide-slate-100"
          )}
        >
          {/* EN-TÊTE : JOUEUR & DERNIÈRE ÉVALUATION */}
          <div className="pb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 shadow-2xs shrink-0">
                <img
                  src={candidate.photo_url || '/assets/avatar.svg'}
                  alt={`${candidate.first_name} ${candidate.last_name}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith('/assets/avatar.svg')) {
                      target.src = '/assets/avatar.svg';
                    }
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">
                    {candidate.first_name} {candidate.last_name}
                  </h4>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {candidate.age_category || 'U19'}
                  </span>
                  <span className="font-semibold text-slate-600 text-xs">
                    {getFrenchPositionLabel(candidate.primary_position)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                  {latestEval?.evaluator_name ? (
                    <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                      <UserCheck className="w-3 h-3 text-primary" />
                      Scout : {latestEval.evaluator_name}
                    </span>
                  ) : candidate.discovering_scout_name ? (
                    <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                      <UserCheck className="w-3 h-3 text-slate-400" />
                      Détecteur : {candidate.discovering_scout_name}
                    </span>
                  ) : (
                    <span className="italic text-slate-400">Cellule Détection FUS</span>
                  )}

                  {latestEval?.evaluation_date && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(latestEval.evaluation_date).toLocaleDateString('fr-FR')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Note globale & Tier du pilier actif */}
            <div className="text-right shrink-0">
              <div className="flex items-baseline justify-end gap-1">
                <span className={cn("text-xl font-black", currentPillarMeta.textColor)}>
                  {currentPillarMeta.score != null ? currentPillarMeta.score.toFixed(1) : '—'}
                </span>
                <span className="text-xs font-bold text-slate-400">/ 10</span>
              </div>
              <span className={cn(
                "inline-block px-1.5 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider mt-0.5",
                getQualityTier(currentPillarMeta.score).class
              )}>
                {getQualityTier(currentPillarMeta.score).text}
              </span>
            </div>
          </div>

          {/* ONGLET DE NAVIGATION PILIERS */}
          <div className="py-2.5 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
            {pillarsConfig.filter(p => p.id !== 'pot').map((p) => {
              const isSelected = activeTab === p.id;
              const Icon = p.icon;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveTab(p.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                    isSelected
                      ? cn("text-white shadow-xs scale-102", p.id === 'tech' ? 'bg-blue-600' : p.id === 'tact' ? 'bg-emerald-600' : p.id === 'phys' ? 'bg-amber-600' : 'bg-purple-600')
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{p.label}</span>
                  <span className={cn(
                    "ml-0.5 text-[10px] font-extrabold px-1 rounded",
                    isSelected ? "bg-white/20 text-white" : "text-slate-400"
                  )}>
                    {p.score != null ? p.score.toFixed(1) : '-'}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                activeTab === 'summary'
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Synthèse 4 Piliers</span>
            </button>
          </div>

          {/* CORPS PRINCIPAL : RADAR GAUCHE + BARRES DE PROGRESSION DROITE */}
          <div className="pt-3 grid grid-cols-12 gap-3.5 items-start">
            {/* COLONNE GAUCHE : DIAGRAMME RADAR */}
            <div className="col-span-5 flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <span>Profil Radar</span>
                <span className={cn("font-black", currentPillarMeta.textColor)}>
                  {activeTab === 'summary' ? 'Synthèse' : currentPillarMeta.label}
                </span>
              </span>

              <SvgRadarChart
                data={radarData}
                colorHex={activeTab === 'summary' ? '#0f172a' : currentPillarMeta.colorHex}
                size={185}
                highlightedIndex={hoveredCriterionIdx}
                onHoverAxis={setHoveredCriterionIdx}
              />

              <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: activeTab === 'summary' ? '#0f172a' : currentPillarMeta.colorHex }} />
                <span>Échelle 0 à 10</span>
              </div>
            </div>

            {/* COLONNE DROITE : CRITÈRES SOUS FORME DE BARRES DE PROGRESSION */}
            <div className="col-span-7 flex flex-col space-y-2 max-h-[220px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                  {activeTab === 'summary' ? 'Notes des 4 Piliers' : `Critères (${posConfig.name})`}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {activeTab === 'summary' ? '4 piliers' : `${currentCriteriaList.length} critères`}
                </span>
              </div>

              {!isEvaluated && (
                <div className="p-2 rounded-lg bg-amber-50/90 border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Rapport en attente de validation. Les barres reflètent les critères de poste FUS standard.
                  </span>
                </div>
              )}

              {/* Liste si mode Synthèse 4 Piliers */}
              {activeTab === 'summary' && (
                <div className="space-y-2">
                  {pillarsConfig.filter(p => p.id !== 'pot').map((pillar) => {
                    const val = pillar.score ?? 0;
                    const percent = Math.min(100, Math.max(0, val * 10));

                    return (
                      <div
                        key={pillar.id}
                        onClick={() => setActiveTab(pillar.id)}
                        className="group/crit p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200/80"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-slate-800 group-hover/crit:text-primary transition-colors flex items-center gap-1.5">
                            <pillar.icon className="w-3 h-3 text-slate-500" />
                            {pillar.label}
                          </span>
                          <span className={cn("font-black text-xs", pillar.textColor)}>
                            {pillar.score != null ? `${pillar.score.toFixed(1)}/10` : '—'}
                          </span>
                        </div>
                        {/* Barre de progression */}
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden relative border border-slate-200/60">
                          <div
                            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-300", pillar.progressBg)}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Liste des critères spécifiques sous forme de barres de progression */}
              {activeTab !== 'summary' && currentCriteriaList.map((crit, idx) => {
                const percent = Math.min(100, Math.max(0, crit.score * 10));
                const isHovered = hoveredCriterionIdx === idx;

                return (
                  <div
                    key={crit.raw}
                    onMouseEnter={() => setHoveredCriterionIdx(idx)}
                    onMouseLeave={() => setHoveredCriterionIdx(null)}
                    className={cn(
                      "group/crit p-1.5 rounded-lg transition-all",
                      isHovered ? "bg-slate-100/90 shadow-2xs scale-[1.01]" : "hover:bg-slate-50/80"
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <span className={cn(
                          "font-bold text-xs block truncate transition-colors",
                          isHovered ? currentPillarMeta.textColor : "text-slate-800"
                        )}>
                          {crit.title}
                        </span>
                        {crit.detail && (
                          <span className="text-[10px] text-slate-400 block truncate" title={crit.detail}>
                            {crit.detail}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className={cn(
                          "text-xs font-black",
                          isHovered ? currentPillarMeta.textColor : "text-slate-900"
                        )}>
                          {crit.score.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-400">/10</span>
                      </div>
                    </div>

                    {/* Barre de progression avec marqueurs visuels */}
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden relative border border-slate-200/60">
                      {/* Repères à 25%, 50%, 75% */}
                      <div className="absolute top-0 bottom-0 left-1/4 w-px bg-slate-200/80 z-10" />
                      <div className="absolute top-0 bottom-0 left-2/4 w-px bg-slate-200/80 z-10" />
                      <div className="absolute top-0 bottom-0 left-3/4 w-px bg-slate-200/80 z-10" />

                      <div
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r transition-all duration-300",
                          currentPillarMeta.progressBg
                        )}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PIED DE CARTE / LIEN FICHE COMPLETE */}
          {onOpenDetail && (
            <div className="pt-2.5 mt-2.5 flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px] text-slate-400">
                Survol interactif • Modèle de détection FUS
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenDetail();
                }}
                className="inline-flex items-center gap-1 font-bold text-primary hover:text-primary/80 hover:underline transition-colors cursor-pointer"
              >
                <span>Consulter la fiche complète</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};
