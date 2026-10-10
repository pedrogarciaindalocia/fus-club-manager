import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  Save,
  Check,
  Zap,
  Sliders,
  Sparkles,
  Award,
  AlertCircle,
  Footprints,
  Compass,
  Activity,
  Brain,
  ShieldCheck,
  UserCheck,
  Target,
  CheckSquare,
  Square
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface PlayerMatchEvaluationModalProps {
  player: {
    id: string;
    full_name: string;
    position?: string;
    photo_url?: string;
    is_trial?: boolean;
    age_category?: string;
  } | null;
  matchInfo?: {
    id?: string;
    opponent_name?: string;
    match_date?: string;
    competition?: string;
    is_friendly?: boolean;
  };
  initialRating?: number;
  initialComment?: string;
  onClose: () => void;
  onSave: (evalData: {
    rating: number;
    comment: string;
    mode: 'estimated' | 'deep';
    pillars?: {
      technical: number;
      tactical: number;
      physical: number;
      mental: number;
    };
    strengths?: string[];
    improvements?: string[];
  }) => Promise<void>;
}

export const PlayerMatchEvaluationModal: React.FC<PlayerMatchEvaluationModalProps> = ({
  player,
  matchInfo,
  initialRating = 7.3,
  initialComment = '',
  onClose,
  onSave,
}) => {
  // Mode selection: 'deep' (Approfondi avec cases à cocher) ou 'estimated' (Estimatif rapide)
  const [evalMode, setEvalMode] = useState<'deep' | 'estimated'>('deep');
  const [activeTab, setActiveTab] = useState<'tech' | 'phys' | 'tact' | 'ment' | 'position'>('tech');

  // Mode 1: Estimatif
  const [estimatedRating, setEstimatedRating] = useState<number>(initialRating || 7.3);
  const [estimatedComment, setEstimatedComment] = useState<string>(initialComment || '');

  // 1. Pilier Technique (11 critères)
  const [techCriteria, setTechCriteria] = useState<Record<string, { label: string; score: number; enabled: boolean }>>({
    ballControl: { label: 'Contrôle du ballon', score: 7.5, enabled: true },
    firstTouch: { label: 'Première touche orientée', score: 7.5, enabled: true },
    passingShort: { label: 'Passes courtes & précision', score: 7.0, enabled: true },
    passingLong: { label: 'Passes longues & transversales', score: 7.0, enabled: true },
    dribbling: { label: 'Dribble & conduite de balle', score: 2.5, enabled: true },
    crossing: { label: 'Qualité de centre', score: 6.5, enabled: true },
    finishing: { label: 'Finition & Tir au but', score: 7.0, enabled: true },
    heading: { label: 'Jeu de tête', score: 6.5, enabled: true },
    duel1v1Off: { label: 'Duel 1v1 offensif', score: 7.5, enabled: true },
    duel1v1Def: { label: 'Duel 1v1 défensif', score: 6.5, enabled: true },
    weakFoot: { label: 'Utilisation du pied faible', score: 6.0, enabled: true },
  });

  // 2. Pilier Physique (7 critères)
  const [physCriteria, setPhysCriteria] = useState<Record<string, { label: string; score: number; enabled: boolean }>>({
    acceleration: { label: 'Accélération (0-10m)', score: 8.0, enabled: true },
    sprintSpeed: { label: 'Vitesse de pointe (Sprint)', score: 8.0, enabled: true },
    agility: { label: 'Agilité & Vivacité', score: 7.5, enabled: true },
    balance: { label: 'Équilibre & Appuis', score: 7.5, enabled: true },
    strength: { label: 'Puissance musculaire & Impact', score: 7.0, enabled: true },
    endurance: { label: 'Endurance & Volume (VMA)', score: 7.5, enabled: true },
    explosiveness: { label: 'Explosivité & Détente', score: 7.5, enabled: true },
  });

  // 3. Pilier Tactique (6 critères)
  const [tactCriteria, setTactCriteria] = useState<Record<string, { label: string; score: number; enabled: boolean }>>({
    positioning: { label: 'Placement sans ballon', score: 7.5, enabled: true },
    gameVision: { label: 'Vision du jeu globale', score: 7.5, enabled: true },
    decisionMaking: { label: 'Prise de décision sous pression', score: 7.5, enabled: true },
    anticipation: { label: 'Anticipation & Lecture des trajectoires', score: 7.5, enabled: true },
    spaceManagement: { label: 'Gestion des espaces', score: 7.0, enabled: true },
    transition: { label: 'Comportement en transition', score: 7.5, enabled: true },
  });

  // 4. Pilier Mental (7 critères)
  const [mentCriteria, setMentCriteria] = useState<Record<string, { label: string; score: number; enabled: boolean }>>({
    concentration: { label: 'Concentration & Rigueur', score: 7.5, enabled: true },
    discipline: { label: 'Discipline & Respect des consignes', score: 8.0, enabled: true },
    motivation: { label: 'Motivation & Volonté de réussir', score: 8.5, enabled: true },
    confidence: { label: 'Confiance en soi & Sang-froid', score: 7.5, enabled: true },
    teamwork: { label: 'Esprit d\'équipe & Communication', score: 8.0, enabled: true },
    leadership: { label: 'Leadership naturel', score: 7.0, enabled: true },
    coachability: { label: 'Réceptivité au coaching (Coachabilité)', score: 8.5, enabled: true },
  });

  // 5. Spécifique Poste (3 critères adaptés au poste)
  const posUpper = (player?.position || '').toUpperCase();
  const isGK = posUpper.includes('GK') || posUpper.includes('GARDIEN') || posUpper.includes('GB');
  const isDef = posUpper.includes('CB') || posUpper.includes('LB') || posUpper.includes('RB') || posUpper.includes('DEF');
  const isMid = posUpper.includes('CDM') || posUpper.includes('CM') || posUpper.includes('CAM') || posUpper.includes('MILIEU');
  const isWng = posUpper.includes('LW') || posUpper.includes('RW') || posUpper.includes('AILIER');

  const [positionCriteria, setPositionCriteria] = useState<Record<string, { label: string; score: number; enabled: boolean }>>({
    trait1: {
      label: isGK ? 'Réflexes & Arrêts sur sa ligne' : isDef ? 'Duels Aériens & Tacles' : isMid ? 'Résistance au Pressing' : isWng ? 'Percussion 1v1 & Dribble' : 'Finition Clinique',
      score: 8.0,
      enabled: true
    },
    trait2: {
      label: isGK ? 'Sorties Aériennes & 1v1' : isDef ? 'Relance & Vision défensive' : isMid ? 'Passes Progressives & Rupture' : isWng ? 'Qualité de Centre' : 'Instinct de Buteur',
      score: 7.5,
      enabled: true
    },
    trait3: {
      label: isGK ? 'Jeu au pied & Relance' : isDef ? 'Couverture & Vitesse de repli' : isMid ? 'Contrôle du Tempo' : isWng ? 'Vitesse de Transition' : 'Jeu Dos au But',
      score: 7.5,
      enabled: true
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!player) return null;

  // Calcul dynamique des moyennes de pilier selon les critères COCHÉS (enabled: true)
  const computePillarStats = (criteriaMap: Record<string, { label: string; score: number; enabled: boolean }>) => {
    const allList = Object.values(criteriaMap);
    const activeList = allList.filter(c => c.enabled);
    const avg = activeList.length > 0
      ? Number((activeList.reduce((acc, c) => acc + c.score, 0) / activeList.length).toFixed(1))
      : 7.0;
    return {
      total: allList.length,
      activeCount: activeList.length,
      avg,
    };
  };

  const techStats = computePillarStats(techCriteria);
  const physStats = computePillarStats(physCriteria);
  const tactStats = computePillarStats(tactCriteria);
  const mentStats = computePillarStats(mentCriteria);
  const posStats = computePillarStats(positionCriteria);

  // Formule officielle FUS pondérée dynamique (Tech 30%, Phys 25%, Tact 25%, Ment 20%)
  const pillarsList: { score: number; weight: number }[] = [];
  if (techStats.activeCount > 0) pillarsList.push({ score: techStats.avg, weight: 0.30 });
  if (physStats.activeCount > 0) pillarsList.push({ score: physStats.avg, weight: 0.25 });
  if (tactStats.activeCount > 0) pillarsList.push({ score: tactStats.avg, weight: 0.25 });
  if (mentStats.activeCount > 0) pillarsList.push({ score: mentStats.avg, weight: 0.20 });

  const totalWeight = pillarsList.reduce((acc, p) => acc + p.weight, 0);
  const calculatedOverallScore = totalWeight > 0
    ? Number((pillarsList.reduce((acc, p) => acc + p.score * p.weight, 0) / totalWeight).toFixed(1))
    : 7.3;

  const currentOverallScore = evalMode === 'deep' ? calculatedOverallScore : estimatedRating;

  // Toggle check/uncheck
  const toggleTech = (key: string) => {
    setTechCriteria(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  };
  const togglePhys = (key: string) => {
    setPhysCriteria(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  };
  const toggleTact = (key: string) => {
    setTactCriteria(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  };
  const toggleMent = (key: string) => {
    setMentCriteria(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  };
  const togglePosition = (key: string) => {
    setPositionCriteria(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  };

  // Slider change
  const setTechValue = (key: string, val: number) => {
    setTechCriteria(prev => ({ ...prev, [key]: { ...prev[key], score: val } }));
  };
  const setPhysValue = (key: string, val: number) => {
    setPhysCriteria(prev => ({ ...prev, [key]: { ...prev[key], score: val } }));
  };
  const setTactValue = (key: string, val: number) => {
    setTactCriteria(prev => ({ ...prev, [key]: { ...prev[key], score: val } }));
  };
  const setMentValue = (key: string, val: number) => {
    setMentCriteria(prev => ({ ...prev, [key]: { ...prev[key], score: val } }));
  };
  const setPositionValue = (key: string, val: number) => {
    setPositionCriteria(prev => ({ ...prev, [key]: { ...prev[key], score: val } }));
  };

  const handleSaveSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave({
        rating: currentOverallScore,
        comment: evalMode === 'deep'
          ? `[Évaluation Approfondie] Tech: ${techStats.avg} | Phys: ${physStats.avg} | Tact: ${tactStats.avg} | Ment: ${mentStats.avg} | Spécifique: ${posStats.avg}`
          : estimatedComment,
        mode: evalMode,
        pillars: {
          technical: techStats.avg,
          tactical: tactStats.avg,
          physical: physStats.avg,
          mental: mentStats.avg,
        }
      });
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900 dark:text-slate-100"
      >
        {/* Header exact as screenshot */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 relative bg-white dark:bg-slate-900">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-red-500 font-bold">🔖</span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Évaluation 1–10 : {player.full_name}</span>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-2.5 py-0.5 rounded-full text-xs">
                    {player.position || 'Joueur'}
                  </span>
                  <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1 border border-amber-300 dark:border-amber-800">
                    📅 Match du {matchInfo?.match_date || new Date().toISOString().split('T')[0]}
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Cochez ou décochez les critères à prendre en compte. La note globale et les moyennes se recalculent automatiquement.
              </p>
            </div>

            {/* Score Global Pondéré Top Right */}
            <div className="text-right shrink-0 pr-8 sm:pr-10">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                SCORE GLOBAL PONDÉRÉ
              </span>
              <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-500 flex items-center gap-1 justify-end">
                <span>{currentOverallScore.toFixed(1)}</span>
                <span className="text-xs text-slate-400 font-medium">/10</span>
              </div>
            </div>
          </div>

          {/* Mode Switcher : Estimatif vs Approfondi */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setEvalMode('deep')}
                className={`px-3 py-1.5 rounded-lg font-black transition flex items-center gap-1.5 ${
                  evalMode === 'deep'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Mode Approfondi (Grille à cocher)
              </button>
              <button
                type="button"
                onClick={() => setEvalMode('estimated')}
                className={`px-3 py-1.5 rounded-lg font-black transition flex items-center gap-1.5 ${
                  evalMode === 'estimated'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Mode Estimatif (Rapide)
              </button>
            </div>

            <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
              {evalMode === 'deep' ? 'Piliers Tech, Phys, Tact, Mental, Spécifique' : 'Notation Macro et Commentaires'}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 dark:bg-slate-900">
          {/* ========================================================================= */}
          {/* MODE APPROFONDI AVEC CASES À COCHER & PILLARS (EXACTEMENT COMME PHOTO)    */}
          {/* ========================================================================= */}
          {evalMode === 'deep' && (
            <div className="space-y-6">
              {/* Pillars Tabs Bar (SANS VERDICT FINAL) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('tech')}
                  className={`px-3.5 py-2 rounded-xl font-black transition flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'tech'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>⚽ Technique</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'tech' ? 'bg-red-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                    {techStats.avg}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('phys')}
                  className={`px-3.5 py-2 rounded-xl font-black transition flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'phys'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>🏃 Physique</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'phys' ? 'bg-red-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                    {physStats.avg}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('tact')}
                  className={`px-3.5 py-2 rounded-xl font-black transition flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'tact'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>🧭 Tactique</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'tact' ? 'bg-red-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                    {tactStats.avg}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ment')}
                  className={`px-3.5 py-2 rounded-xl font-black transition flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'ment'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>🧠 Mental</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'ment' ? 'bg-red-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                    {mentStats.avg}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('position')}
                  className={`px-3.5 py-2 rounded-xl font-black transition flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'position'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>🎯 Spécifique Poste</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'position' ? 'bg-red-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                    {posStats.avg}
                  </span>
                </button>
              </div>

              {/* TAB 1 : TECHNIQUE */}
              {activeTab === 'tech' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                      A. Critères Techniques (Barème 1–10)
                    </h3>
                    <div className="text-xs font-bold text-red-600 dark:text-red-400">
                      <span className="text-slate-400 font-normal">({techStats.activeCount}/{techStats.total} critères pris en compte)</span> Moyenne Pilier : {techStats.avg}/10
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(techCriteria).map(([key, item]) => (
                      <div
                        key={key}
                        className={`p-3 rounded-2xl border transition-all ${
                          item.enabled
                            ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs'
                            : 'bg-slate-100/70 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={() => toggleTech(key)}
                              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600"
                            />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                              {item.label}
                            </span>
                          </label>
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {item.score.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">/10</span>
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1.0"
                          max="10.0"
                          step="0.5"
                          disabled={!item.enabled}
                          value={item.score}
                          onChange={e => setTechValue(key, parseFloat(e.target.value))}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-red-600 bg-slate-200 dark:bg-slate-700"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2 : PHYSIQUE */}
              {activeTab === 'phys' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                      B. Capacités Physiques & Athlétiques (Barème 1–10)
                    </h3>
                    <div className="text-xs font-bold text-red-600 dark:text-red-400">
                      <span className="text-slate-400 font-normal">({physStats.activeCount}/{physStats.total} critères pris en compte)</span> Moyenne Pilier : {physStats.avg}/10
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(physCriteria).map(([key, item]) => (
                      <div
                        key={key}
                        className={`p-3 rounded-2xl border transition-all ${
                          item.enabled
                            ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs'
                            : 'bg-slate-100/70 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={() => togglePhys(key)}
                              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600"
                            />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                              {item.label}
                            </span>
                          </label>
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {item.score.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">/10</span>
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1.0"
                          max="10.0"
                          step="0.5"
                          disabled={!item.enabled}
                          value={item.score}
                          onChange={e => setPhysValue(key, parseFloat(e.target.value))}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-red-600 bg-slate-200 dark:bg-slate-700"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3 : TACTIQUE */}
              {activeTab === 'tact' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                      C. Intelligence & Rigueur Tactique (Barème 1–10)
                    </h3>
                    <div className="text-xs font-bold text-red-600 dark:text-red-400">
                      <span className="text-slate-400 font-normal">({tactStats.activeCount}/{tactStats.total} critères pris en compte)</span> Moyenne Pilier : {tactStats.avg}/10
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(tactCriteria).map(([key, item]) => (
                      <div
                        key={key}
                        className={`p-3 rounded-2xl border transition-all ${
                          item.enabled
                            ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs'
                            : 'bg-slate-100/70 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={() => toggleTact(key)}
                              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600"
                            />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                              {item.label}
                            </span>
                          </label>
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {item.score.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">/10</span>
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1.0"
                          max="10.0"
                          step="0.5"
                          disabled={!item.enabled}
                          value={item.score}
                          onChange={e => setTactValue(key, parseFloat(e.target.value))}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-red-600 bg-slate-200 dark:bg-slate-700"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4 : MENTAL */}
              {activeTab === 'ment' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                      D. Profil Mental & Psychologique (Barème 1–10)
                    </h3>
                    <div className="text-xs font-bold text-red-600 dark:text-red-400">
                      <span className="text-slate-400 font-normal">({mentStats.activeCount}/{mentStats.total} critères pris en compte)</span> Moyenne Pilier : {mentStats.avg}/10
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(mentCriteria).map(([key, item]) => (
                      <div
                        key={key}
                        className={`p-3 rounded-2xl border transition-all ${
                          item.enabled
                            ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs'
                            : 'bg-slate-100/70 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={() => toggleMent(key)}
                              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600"
                            />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                              {item.label}
                            </span>
                          </label>
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {item.score.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">/10</span>
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1.0"
                          max="10.0"
                          step="0.5"
                          disabled={!item.enabled}
                          value={item.score}
                          onChange={e => setMentValue(key, parseFloat(e.target.value))}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-red-600 bg-slate-200 dark:bg-slate-700"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5 : SPÉCIFIQUE POSTE */}
              {activeTab === 'position' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                      Critères Additionnels Spécifiques : {player.position || 'Poste'}
                    </h3>
                    <div className="text-xs font-bold text-red-600 dark:text-red-400">
                      Adaptation au poste
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(positionCriteria).map(([key, item]) => (
                      <div
                        key={key}
                        className={`p-3 rounded-2xl border transition-all ${
                          item.enabled
                            ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs'
                            : 'bg-slate-100/70 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={() => togglePosition(key)}
                              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600"
                            />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                              {item.label}
                            </span>
                          </label>
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {item.score.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">/10</span>
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1.0"
                          max="10.0"
                          step="0.5"
                          disabled={!item.enabled}
                          value={item.score}
                          onChange={e => setPositionValue(key, parseFloat(e.target.value))}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-red-600 bg-slate-200 dark:bg-slate-700"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE ESTIMATIF (RAPIDE)                                                   */}
          {/* ========================================================================= */}
          {evalMode === 'estimated' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                    Note Globale Estimée du Match
                  </span>
                  <div className="text-2xl font-black text-red-600 dark:text-red-400">
                    {estimatedRating.toFixed(1)} / 10
                  </div>
                </div>

                <input
                  type="range"
                  min="1.0"
                  max="10.0"
                  step="0.5"
                  value={estimatedRating}
                  onChange={e => setEstimatedRating(parseFloat(e.target.value))}
                  className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-red-600 bg-slate-200 dark:bg-slate-700"
                />

                <div className="grid grid-cols-6 gap-1.5 pt-2 border-t border-red-200/60 dark:border-red-900/40">
                  {[5, 6, 7, 8, 9, 10].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEstimatedRating(v)}
                      className={`py-1 rounded-lg text-xs font-black transition ${
                        estimatedRating === v
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {v}.0
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Observations synthétiques du Staff
                </label>
                <textarea
                  rows={4}
                  value={estimatedComment}
                  onChange={e => setEstimatedComment(e.target.value)}
                  placeholder="Points forts, niveau d'engagement dans les duels, respect des consignes..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer exactly as in photo */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Score Global Pondéré :</span>
            <span className="text-base font-black text-red-600 dark:text-red-500">
              {currentOverallScore.toFixed(1)}/10
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Mode Édition
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSaveSubmit}
              disabled={isSaving || saveSuccess}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-600/30 transition flex items-center gap-1.5"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Enregistré !</span>
                </>
              ) : (
                <span>Mettre à jour l'Évaluation ({currentOverallScore.toFixed(1)}/10)</span>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PlayerMatchEvaluationModal;
