import {
  computeIntegerPillarAveragesFromCriteria,
  getMetricPositionFrenchName,
  parseMetricCriterionLabel,
  type MetricPillar,
  type MetricSetPosition,
} from './metricSetsHelpers';
import type { PlayerPerformanceEvaluation } from '../services/playerPerformanceService';

export interface PerformanceCriterionEvaluation {
  pillar: MetricPillar;
  rawKey: string;
  title: string;
  detail: string;
  score: number;
}

export interface PillarDiagnosis {
  pillar: MetricPillar;
  label: string;
  score: number;
  historicalAvg: number | null;
  deltaVsAvg: number | null;
  deltaVsLast: number | null;
  status: 'strong' | 'correct' | 'weak' | 'critical';
  weakCriteria: PerformanceCriterionEvaluation[];
  strongCriteria: PerformanceCriterionEvaluation[];
}

export interface PerformanceProblemItem {
  id: string;
  severity: 'critical' | 'warning' | 'balance';
  pillar: MetricPillar | 'global';
  title: string;
  scoreLabel: string;
  impact: string;
}

export interface PerformanceWorkAxisItem {
  id: string;
  priority: 'P1' | 'P2' | 'P3';
  pillar: MetricPillar;
  pillarLabel: string;
  criterionTitle: string;
  currentScore: number;
  targetScore: number;
  objective: string;
  drill: string;
}

export interface PerformanceBoostStep {
  horizon: string;
  title: string;
  description: string;
}

export interface PlayerPerformanceDiagnosis {
  levelLabel: string;
  levelBadgeClass: string;
  positionCode: string;
  positionName: string;
  evaluationDate: string;
  globalScore: number;
  executiveSummary: string;
  historySummary: {
    totalCount: number;
    avgGlobal: number | null;
    lastGlobal: number | null;
    deltaVsAvg: number | null;
    deltaVsLast: number | null;
    trendLabel: string;
    trendDirection: 'up' | 'stable' | 'down' | 'initial';
  };
  pillarBreakdown: PillarDiagnosis[];
  strengths: Array<{ label: string; score: number; pillarLabel: string }>;
  problems: PerformanceProblemItem[];
  workAxes: PerformanceWorkAxisItem[];
  boostPlan: {
    currentGlobalScore: number;
    projectedGlobalScore: number;
    projectedGain: number;
    projectedSummary: string;
    steps: PerformanceBoostStep[];
    kpis: string[];
  };
  criteriaCount: number;
}

export interface BuildPlayerDiagnosisInput {
  playerName: string;
  positionCode: string;
  positionName?: string | null;
  activePosition?: MetricSetPosition | null;
  evaluationDate: string;
  scores: {
    technique: number;
    tactique: number;
    physique: number;
    mental: number;
    global: number;
  };
  criteriaScores?: Record<string, number> | null;
  coachNote?: string | null;
  history?: PlayerPerformanceEvaluation[];
  currentEvaluationId?: string | null;
}

const PILLAR_LABELS: Record<MetricPillar, string> = {
  technique: 'Technique',
  tactique: 'Tactique',
  physique: 'Physique',
  mental: 'Mental',
};

const PILLAR_ORDER: MetricPillar[] = ['technique', 'tactique', 'physique', 'mental'];

interface DrillRule {
  keywords: string[];
  objective: string;
  drill: string;
}

const CRITERION_DRILL_RULES: DrillRule[] = [
  {
    keywords: ['centre', 'centrer', 'dédoublement'],
    objective: 'Améliorer la justesse du centre en pleine course sous pression adverse.',
    drill: 'Ateliers de dédoublement sur couloir avec centre en mouvement 1-2 touches sur zones cibles (3 séries × 6 ballons par pied).',
  },
  {
    keywords: ['contrôle', 'prise de balle', 'première touche', 'orientation'],
    objective: 'Fiabiliser l’orientation du premier contrôle vers l’avant pour gagner du temps.',
    drill: 'Rondo orienté 4v2 dans carré réduit avec contrôle orienté obligatoire avant passe verticale.',
  },
  {
    keywords: ['passe', 'relance', 'jeu long', 'vertical'],
    objective: 'Sécuriser les transmissions sous pressing et casser la première ligne.',
    drill: 'Jeu de possession à 3 zones avec bonus de point pour chaque passe cassant une ligne sous pressing 2 secondes.',
  },
  {
    keywords: ['dribble', '1v1', 'élimination', 'percussion'],
    objective: 'Augmenter le taux de réussite en duel offensif 1v1 et la variation de rythme.',
    drill: 'Duels 1v1 en couloir/demi-espace avec changement de rythme imposé avant finition ou passe en retrait.',
  },
  {
    keywords: ['finition', 'frappe', 'tir', 'surface', 'cadre'],
    objective: 'Optimiser le relâchement devant le but et la précision dans la surface.',
    drill: 'Enchaînement appel-contrôle-frappe à 1 ou 2 touches sous contrainte temps avec gardien actif.',
  },
  {
    keywords: ['placement', 'fermeture', 'couloir', 'axe', 'alignement', 'hors-jeu', 'coulissement', 'bloc'],
    objective: 'Corriger le positionnement défensif sans ballon et le respect des distances de ligne.',
    drill: 'Situations défensives 4v4 / ligne de 4 avec repères visuels d’alignement, fermeture d’intervalle et couverture.',
  },
  {
    keywords: ['vision', 'anticipation', 'lecture', 'prise d’information', 'décision'],
    objective: 'Accélérer la prise d’information avant de recevoir le ballon.',
    drill: 'Jeux réduits avec balayage visuel obligatoire (annonce de couleur/numéro avant la passe reçue).',
  },
  {
    keywords: ['pressing', 'repli', 'transition', 'récupération'],
    objective: 'Réduire le temps de réaction à la perte et coordonner le premier temps de pressing.',
    drill: 'Jeu à thème 6v6 avec règle des 5 secondes pour récupérer après perte ou repli rapide derrière ligne médiane.',
  },
  {
    keywords: ['duel', 'impact', 'aérien', 'contact'],
    objective: 'Renforcer l’engagement physique maîtrisé et la protection de balle au contact.',
    drill: 'Ateliers duel épaule contre épaule + jeu aérien défensif/offensif avec gainage dynamique.',
  },
  {
    keywords: ['vitesse', 'accélération', 'explosivité', 'sprint', 'vivacité'],
    objective: 'Développer l’explosivité sur les 10–20 premiers mètres et la répétition de sprints.',
    drill: 'Sprints répétés RSA (6 × 25m avec récupération active 20s) couplés à conduite de balle ou appel.',
  },
  {
    keywords: ['endurance', 'volume', 'répétition', 'récupération', 'vma'],
    objective: 'Maintenir la lucidité technique sur l’ensemble des 90 minutes.',
    drill: 'Jeu réduit haute intensité (4 min travail / 2 min récup) ou intermittents spécifiques au poste.',
  },
  {
    keywords: ['concentration', 'constance', 'calme', 'lucidité', 'gestion'],
    objective: 'Éviter les sautes de concentration dans les temps faibles et fins de mi-temps.',
    drill: 'Exercices de prise de décision sous fatigue en fin de séance avec consignes évolutives.',
  },
  {
    keywords: ['communication', 'leadership', 'caractère', 'combativité', 'mental', 'confiance'],
    objective: 'Encourager la prise de parole tactique et la résilience après une erreur.',
    drill: 'Nommer le joueur comme relai de communication sur une séquence tactique 8v8 pour orienter ses partenaires.',
  },
];

const FALLBACK_PILLAR_DRILLS: Record<MetricPillar, { objective: string; drill: string }> = {
  technique: {
    objective: 'Élever la propreté technique gestuelle et la vitesse d’exécution au poste.',
    drill: 'Séquence analytique balle au pied 15 min puis jeu réduit à 2 touches orienté poste.',
  },
  tactique: {
    objective: 'Fiabiliser les choix sans ballon, le placement et la lecture du jeu collectif.',
    drill: 'Retour vidéo court (3 séquences du dernier match) + mise en situation tactique dédiée.',
  },
  physique: {
    objective: 'Améliorer l’impact athlétique, le volume de courses à haute intensité et la vivacité.',
    drill: 'Bloc athlétique intégré ballon (changements de direction + duels) 2 fois par semaine.',
  },
  mental: {
    objective: 'Stabiliser l’engagement émotionnel, la confiance et la concentration sur toute la rencontre.',
    drill: 'Fixation d’un objectif comportemental simple par mi-temps avec feedback positif immédiat post-match.',
  },
};

function getPositionContextImpact(positionCode: string, pillar: MetricPillar): string {
  const code = positionCode.toUpperCase();
  if (pillar === 'technique') {
    if (['LB', 'RB', 'DG', 'DD', 'LWB', 'RWB'].includes(code)) {
      return 'Indispensable pour sécuriser la sortie de balle sur le côté et livrer des centres décisifs.';
    }
    if (['CDM', 'CM', 'CAM', 'MC', 'MDC', 'MOC'].includes(code)) {
      return 'Impact direct sur la fluidité de possession et le cassage de lignes au cœur du jeu.';
    }
    if (['LW', 'RW', 'AG', 'AD', 'ST', 'CF', 'SS'].includes(code)) {
      return 'Conditionne l’efficacité dans les 30 derniers mètres, le 1v1 et la finition.';
    }
    if (['GK', 'G', 'GB'].includes(code)) {
      return 'Essentiel pour la propreté de la relance sous pressing et les prises de balle.';
    }
    return 'Clé pour sécuriser la relance sous pressing et éviter les pertes dangereuses.';
  }
  if (pillar === 'tactique') {
    if (['CB', 'DC', 'LB', 'RB', 'DG', 'DD'].includes(code)) {
      return 'Détermine l’équilibre de la ligne défensive, l’alignement hors-jeu et la fermeture d’espace.';
    }
    return 'Directement lié à la lecture des déplacements adverses et au bon tempo des choix de jeu.';
  }
  if (pillar === 'physique') {
    return 'Pèse sur l’intensité des duels, les courses à haute intensité et la fraîcheur en fin de match.';
  }
  return 'Influence la régularité sur 90 minutes, la réaction après erreur et l’influence sur le groupe.';
}

function resolveDrillForCriterion(pillar: MetricPillar, title: string): { objective: string; drill: string } {
  const lower = title.toLowerCase();
  const matched = CRITERION_DRILL_RULES.find(rule => rule.keywords.some(kw => lower.includes(kw)));
  if (matched) {
    return { objective: matched.objective, drill: matched.drill };
  }
  return FALLBACK_PILLAR_DRILLS[pillar];
}

function getLevelMeta(globalScore: number): { label: string; badgeClass: string } {
  if (globalScore >= 8) {
    return {
      label: 'Niveau Élite',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
    };
  }
  if (globalScore >= 6) {
    return {
      label: 'Performance Solide',
      badgeClass: 'bg-sky-500/15 text-sky-700 border-sky-300',
    };
  }
  if (globalScore === 5) {
    return {
      label: 'Base à Consolider',
      badgeClass: 'bg-amber-500/15 text-amber-800 border-amber-300',
    };
  }
  return {
    label: 'Alerte Performance',
    badgeClass: 'bg-rose-500/15 text-rose-700 border-rose-300',
  };
}

function extractCriteriaByPillar(
  scores: BuildPlayerDiagnosisInput['scores'],
  activePosition?: MetricSetPosition | null,
  criteriaScores?: Record<string, number> | null
): Record<MetricPillar, PerformanceCriterionEvaluation[]> {
  const result: Record<MetricPillar, PerformanceCriterionEvaluation[]> = {
    technique: [],
    tactique: [],
    physique: [],
    mental: [],
  };
  const map = criteriaScores || {};

  if (activePosition?.criteria) {
    for (const pillar of PILLAR_ORDER) {
      const list = activePosition.criteria[pillar] || [];
      result[pillar] = list.map(crit => {
        const key = `${pillar}:${crit}`;
        const parsed = parseMetricCriterionLabel(crit);
        const rawVal = map[key] ?? map[crit];
        const score =
          typeof rawVal === 'number' && Number.isFinite(rawVal)
            ? Math.min(10, Math.max(0, Math.round(rawVal)))
            : Math.round(scores[pillar]);
        return {
          pillar,
          rawKey: crit,
          title: parsed.title,
          detail: parsed.detail || '',
          score,
        };
      });
    }
    return result;
  }

  for (const [k, rawVal] of Object.entries(map)) {
    if (typeof rawVal !== 'number' || !Number.isFinite(rawVal)) continue;
    const colonIdx = k.indexOf(':');
    if (colonIdx <= 0) continue;
    const maybePillar = k.slice(0, colonIdx).toLowerCase() as MetricPillar;
    if (!PILLAR_ORDER.includes(maybePillar)) continue;
    const rawCrit = k.slice(colonIdx + 1);
    const parsed = parseMetricCriterionLabel(rawCrit);
    result[maybePillar].push({
      pillar: maybePillar,
      rawKey: rawCrit,
      title: parsed.title,
      detail: parsed.detail || '',
      score: Math.min(10, Math.max(0, Math.round(rawVal))),
    });
  }
  return result;
}

export function buildPlayerPerformanceDiagnosis(
  input: BuildPlayerDiagnosisInput
): PlayerPerformanceDiagnosis {
  const {
    playerName,
    positionCode,
    positionName,
    activePosition,
    evaluationDate,
    scores,
    criteriaScores,
    coachNote,
    history = [],
    currentEvaluationId,
  } = input;

  const tech = Math.min(10, Math.max(0, Math.round(scores.technique)));
  const tact = Math.min(10, Math.max(0, Math.round(scores.tactique)));
  const phys = Math.min(10, Math.max(0, Math.round(scores.physique)));
  const ment = Math.min(10, Math.max(0, Math.round(scores.mental)));
  const global = Math.min(10, Math.max(0, Math.round(scores.global)));

  const resolvedPosName =
    positionName?.trim() ||
    (activePosition ? getMetricPositionFrenchName(activePosition) : getMetricPositionFrenchName(positionCode));

  // Comparaison historique (en excluant l'évaluation inspectée elle-même pour comparer aux autres séances)
  const sortedHistory = [...history].sort((a, b) =>
    String(a.evaluation_date || '').localeCompare(String(b.evaluation_date || ''))
  );
  const comparableHistory = currentEvaluationId
    ? sortedHistory.filter(h => h.id !== currentEvaluationId)
    : sortedHistory;

  const avgOf = (getter: (ev: PlayerPerformanceEvaluation) => number): number | null => {
    if (comparableHistory.length === 0) return null;
    const sum = comparableHistory.reduce((acc, ev) => acc + Number(getter(ev) || 0), 0);
    return Number((sum / comparableHistory.length).toFixed(1));
  };

  const lastOther = comparableHistory.length > 0 ? comparableHistory[comparableHistory.length - 1] : null;
  const avgGlobal = avgOf(ev => ev.global_score);
  const lastGlobal = lastOther ? Math.round(lastOther.global_score) : null;
  const deltaVsAvg = avgGlobal !== null ? Number((global - avgGlobal).toFixed(1)) : null;
  const deltaVsLast = lastGlobal !== null ? global - lastGlobal : null;

  let trendDirection: 'up' | 'stable' | 'down' | 'initial' = 'initial';
  let trendLabel = 'Référence initiale';
  if (comparableHistory.length > 0 && deltaVsLast !== null) {
    if (deltaVsLast >= 1 || (deltaVsAvg !== null && deltaVsAvg >= 0.8)) {
      trendDirection = 'up';
      trendLabel = 'En progression';
    } else if (deltaVsLast <= -1 || (deltaVsAvg !== null && deltaVsAvg <= -0.8)) {
      trendDirection = 'down';
      trendLabel = 'Baisse détectée';
    } else {
      trendDirection = 'stable';
      trendLabel = 'Forme stable';
    }
  }

  const byPillarCriteria = extractCriteriaByPillar(
    { technique: tech, tactique: tact, physique: phys, mental: ment, global },
    activePosition,
    criteriaScores
  );

  const scoreByPillar: Record<MetricPillar, number> = {
    technique: tech,
    tactique: tact,
    physique: phys,
    mental: ment,
  };

  const pillarBreakdown: PillarDiagnosis[] = PILLAR_ORDER.map(pillar => {
    const score = scoreByPillar[pillar];
    const histAvg = avgOf(ev => ev[`${pillar}_score` as const] as number);
    const lastScore = lastOther ? Math.round(lastOther[`${pillar}_score` as const] as number) : null;
    const critRows = byPillarCriteria[pillar] || [];

    const weakCriteria = [...critRows]
      .filter(c => c.score <= 5)
      .sort((a, b) => a.score - b.score);
    const strongCriteria = [...critRows]
      .filter(c => c.score >= 7)
      .sort((a, b) => b.score - a.score);

    const status: PillarDiagnosis['status'] =
      score <= 4 ? 'critical' : score === 5 ? 'weak' : score >= 7 ? 'strong' : 'correct';

    return {
      pillar,
      label: PILLAR_LABELS[pillar],
      score,
      historicalAvg: histAvg,
      deltaVsAvg: histAvg !== null ? Number((score - histAvg).toFixed(1)) : null,
      deltaVsLast: lastScore !== null ? score - lastScore : null,
      status,
      weakCriteria,
      strongCriteria,
    };
  });

  const sortedPillarsDesc = [...pillarBreakdown].sort((a, b) => b.score - a.score);
  const sortedPillarsAsc = [...pillarBreakdown].sort((a, b) => a.score - b.score);
  const topPillar = sortedPillarsDesc[0];
  const lowestPillar = sortedPillarsAsc[0];

  const allCriteria = PILLAR_ORDER.flatMap(p => byPillarCriteria[p]);
  const allWeakCriteria = allCriteria.filter(c => c.score <= 5).sort((a, b) => a.score - b.score);
  const allStrongCriteria = allCriteria.filter(c => c.score >= 7).sort((a, b) => b.score - a.score);

  const strengths: Array<{ label: string; score: number; pillarLabel: string }> = [
    ...allStrongCriteria.slice(0, 4).map(c => ({
      label: c.title,
      score: c.score,
      pillarLabel: PILLAR_LABELS[c.pillar],
    })),
  ];
  if (strengths.length === 0) {
    strengths.push({
      label: `Pilier leader : ${topPillar.label}`,
      score: topPillar.score,
      pillarLabel: topPillar.label,
    });
  }

  // Détection structurée des problèmes
  const problems: PerformanceProblemItem[] = [];
  const seenKeys = new Set<string>();

  for (const crit of allWeakCriteria) {
    if (crit.score <= 4) {
      const k = `crit-${crit.pillar}-${crit.title}`;
      seenKeys.add(k);
      problems.push({
        id: k,
        severity: 'critical',
        pillar: crit.pillar,
        title: `${crit.title} (${PILLAR_LABELS[crit.pillar]})`,
        scoreLabel: `${crit.score}/10`,
        impact: getPositionContextImpact(positionCode, crit.pillar),
      });
    }
  }

  for (const p of sortedPillarsAsc) {
    if (p.score <= 4) {
      problems.push({
        id: `pillar-crit-${p.pillar}`,
        severity: 'critical',
        pillar: p.pillar,
        title: `Déficit global sur le pilier ${p.label}`,
        scoreLabel: `${p.score}/10`,
        impact: getPositionContextImpact(positionCode, p.pillar),
      });
    } else if (p.deltaVsLast !== null && p.deltaVsLast <= -2) {
      problems.push({
        id: `pillar-drop-${p.pillar}`,
        severity: 'warning',
        pillar: p.pillar,
        title: `Recul marqué en ${p.label} par rapport au dernier suivi`,
        scoreLabel: `${p.deltaVsLast} pt`,
        impact: `Note passée à ${p.score}/10 contre ${p.score - p.deltaVsLast}/10 précédemment : fatigue ou perte de repères au poste ${resolvedPosName}.`,
      });
    }
  }

  for (const crit of allWeakCriteria) {
    if (crit.score === 5 && problems.length < 6) {
      const k = `crit-${crit.pillar}-${crit.title}`;
      if (!seenKeys.has(k)) {
        seenKeys.add(k);
        problems.push({
          id: k,
          severity: 'warning',
          pillar: crit.pillar,
          title: `${crit.title} (${PILLAR_LABELS[crit.pillar]})`,
          scoreLabel: `${crit.score}/10`,
          impact: `Niveau neutre (5/10) insuffisant pour faire la différence au poste ${resolvedPosName}.`,
        });
      }
    }
  }

  const gapBetweenPillars = topPillar.score - lowestPillar.score;
  if (gapBetweenPillars >= 3) {
    problems.push({
      id: 'balance-gap',
      severity: 'balance',
      pillar: lowestPillar.pillar,
      title: `Déséquilibre de profil (${topPillar.label} ${topPillar.score}/10 vs ${lowestPillar.label} ${lowestPillar.score}/10)`,
      scoreLabel: `Écart ${gapBetweenPillars} pts`,
      impact: `Un écart supérieur à 2 points freine le rendement global malgré les points forts en ${topPillar.label}.`,
    });
  }

  if (problems.length === 0) {
    problems.push({
      id: 'no-blocker-optimization',
      severity: 'balance',
      pillar: lowestPillar.pillar,
      title: `Aucun point bloquant — marge d’optimisation en ${lowestPillar.label}`,
      scoreLabel: `${lowestPillar.score}/10`,
      impact: `Tous les critères sont à 6/10 ou plus. Viser le passage du pilier ${lowestPillar.label} à ${Math.min(10, lowestPillar.score + 1)}/10 pour atteindre le niveau supérieur.`,
    });
  }

  // Ce qu'il faut travailler (priorisé P1 -> P2 -> P3)
  const workAxes: PerformanceWorkAxisItem[] = [];
  const usedAxisLabels = new Set<string>();
  const candidates =
    allCriteria.length > 0
      ? [...allCriteria].sort((a, b) => a.score - b.score)
      : sortedPillarsAsc.map(p => ({
          pillar: p.pillar,
          rawKey: p.label,
          title: `Maîtrise ${p.label} (${resolvedPosName})`,
          detail: '',
          score: p.score,
        }));

  for (const item of candidates) {
    if (workAxes.length >= 4) break;
    if (item.score >= 9 && workAxes.length >= 2) continue;
    const dedup = `${item.pillar}:${item.title}`;
    if (usedAxisLabels.has(dedup)) continue;
    usedAxisLabels.add(dedup);

    const priority: 'P1' | 'P2' | 'P3' =
      item.score <= 4 ? 'P1' : item.score <= 6 ? 'P2' : 'P3';
    const targetScore = Math.min(10, Math.max(item.score + 2, item.score <= 4 ? 6 : item.score + 1));
    const resolved = resolveDrillForCriterion(item.pillar, item.title);

    workAxes.push({
      id: `work-${workAxes.length}-${dedup}`,
      priority,
      pillar: item.pillar,
      pillarLabel: PILLAR_LABELS[item.pillar],
      criterionTitle: item.title,
      currentScore: item.score,
      targetScore,
      objective: resolved.objective,
      drill: resolved.drill,
    });
  }

  // Projection réaliste pour augmenter la performance globale
  const projectedCriteriaMap: Record<string, number> = { ...(criteriaScores || {}) };
  for (const axis of workAxes.slice(0, 3)) {
    if (activePosition?.criteria) {
      const exactCrit = (activePosition.criteria[axis.pillar] || []).find(
        c => parseMetricCriterionLabel(c).title === axis.criterionTitle
      );
      if (exactCrit) {
        projectedCriteriaMap[`${axis.pillar}:${exactCrit}`] = axis.targetScore;
      }
    } else {
      projectedCriteriaMap[`${axis.pillar}:${axis.criterionTitle}`] = axis.targetScore;
    }
  }

  let projectedGlobalScore = global;
  if (activePosition) {
    const projectedSummary = computeIntegerPillarAveragesFromCriteria(
      activePosition,
      projectedCriteriaMap,
      scoreByPillar
    );
    projectedGlobalScore = Math.max(global, Math.min(10, projectedSummary.global));
  } else {
    const boostedAvg = Math.round(
      pillarBreakdown.reduce((acc, p) => {
        const hasAxis = workAxes.slice(0, 2).some(a => a.pillar === p.pillar);
        return acc + (hasAxis ? Math.min(10, p.score + 2) : p.score);
      }, 0) / 4
    );
    projectedGlobalScore = Math.max(global, Math.min(10, boostedAvg));
  }
  if (projectedGlobalScore === global && global < 9) {
    projectedGlobalScore = Math.min(10, global + 1);
  }
  const projectedGain = Math.max(0, projectedGlobalScore - global);

  const primaryAxis = workAxes[0];
  const secondaryAxis = workAxes[1];

  const steps: PerformanceBoostStep[] = [
    {
      horizon: 'Court terme · Prochaine séance',
      title: primaryAxis
        ? `Corriger en priorité : ${primaryAxis.criterionTitle}`
        : `Atelier ciblé sur ${lowestPillar.label}`,
      description: primaryAxis
        ? `${primaryAxis.drill} Objectif immédiat : passer de ${primaryAxis.currentScore}/10 à ${primaryAxis.targetScore}/10.`
        : `Travailler le pilier ${lowestPillar.label} sur des séquences spécifiques au poste ${resolvedPosName}.`,
    },
    {
      horizon: 'Moyen terme · Cycle 2 à 3 semaines',
      title: secondaryAxis
        ? `Doubler le travail sur ${secondaryAxis.criterionTitle} & régularité ${lowestPillar.label}`
        : `Équilibrer les 4 piliers autour du point fort (${topPillar.label})`,
      description: secondaryAxis
        ? `Associer ${secondaryAxis.drill} à un retour vidéo individuel de 5 minutes pour ancrer les repères au poste.`
        : `Capitaliser sur ${topPillar.label} (${topPillar.score}/10) tout en relevant ${lowestPillar.label} vers ${Math.min(10, lowestPillar.score + 2)}/10.`,
    },
    {
      horizon: 'Prochain match / Opposition interne',
      title: 'Consigne match simple & réévaluation datée',
      description: `Donner au joueur 1 à 2 missions claires en match (${primaryAxis?.criterionTitle || lowestPillar.label}) et réévaluer sur Performance Joueur pour valider le palier ${projectedGlobalScore}/10.`,
    },
  ];

  const kpis: string[] = [
    `Note Globale visée : ${global}/10 → ${projectedGlobalScore}/10`,
    ...workAxes.slice(0, 2).map(a => `${a.criterionTitle} : ${a.currentScore}/10 → ${a.targetScore}/10`),
  ];

  const noteSnippet =
    coachNote && coachNote.trim()
      ? ` Observation staff prise en compte : « ${coachNote.trim().slice(0, 120)}${coachNote.trim().length > 120 ? '…' : ''} ».`
      : '';

  const deltaClause =
    deltaVsAvg !== null
      ? deltaVsAvg > 0
        ? ` en hausse de +${deltaVsAvg} pt par rapport à sa moyenne (${avgGlobal}/10).`
        : deltaVsAvg < 0
          ? ` en retrait de ${deltaVsAvg} pt par rapport à sa moyenne (${avgGlobal}/10).`
          : ` dans la continuité exacte de sa moyenne (${avgGlobal}/10).`
      : ` sur cette évaluation de référence.`;

  const executiveSummary =
    `${playerName} affiche une note globale de ${global}/10 au poste ${resolvedPosName} (${positionCode}),` +
    deltaClause +
    ` Point d’appui principal : ${topPillar.label} (${topPillar.score}/10).` +
    (lowestPillar.score < topPillar.score
      ? ` Axe prioritaire de progression : ${lowestPillar.label} (${lowestPillar.score}/10)${primaryAxis && primaryAxis.currentScore <= 5 ? `, notamment sur « ${primaryAxis.criterionTitle} » (${primaryAxis.currentScore}/10)` : ''}.`
      : ' Profil homogène sur les 4 piliers.') +
    noteSnippet;

  const levelMeta = getLevelMeta(global);

  return {
    levelLabel: levelMeta.label,
    levelBadgeClass: levelMeta.badgeClass,
    positionCode,
    positionName: resolvedPosName,
    evaluationDate,
    globalScore: global,
    executiveSummary,
    historySummary: {
      totalCount: comparableHistory.length + (currentEvaluationId ? 1 : 0),
      avgGlobal,
      lastGlobal,
      deltaVsAvg,
      deltaVsLast,
      trendLabel,
      trendDirection,
    },
    pillarBreakdown,
    strengths,
    problems,
    workAxes,
    boostPlan: {
      currentGlobalScore: global,
      projectedGlobalScore,
      projectedGain,
      projectedSummary:
        projectedGain > 0
          ? `Corriger les ${Math.min(3, workAxes.length)} critères prioritaires permet de viser un gain de +${projectedGain} pt sur la note globale (${global}/10 → ${projectedGlobalScore}/10).`
          : `Maintenir ce haut niveau d’exigence sur les ${allCriteria.length || 4} indicateurs du poste.`,
      steps,
      kpis,
    },
    criteriaCount: allCriteria.length,
  };
}
