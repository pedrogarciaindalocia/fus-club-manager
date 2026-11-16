import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wrench,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../../../lib/utils';
import { normalizeAgeCategory } from '../../../constants';
import type { Player } from '../../../types';
import defaultClubLogo from '../../../assets/fus-logo.png';
import {
  geminiPerformanceService,
  MISSING_GEMINI_API_KEY_ERROR,
  normalizeStoredGeminiSynthesis,
  type GeminiPerformanceSynthesis,
} from '../../../services/geminiPerformanceService';
import { geminiVisionService } from '../../../services/geminiVisionService';
import {
  playerPerformanceService,
  type PlayerPerformanceEvaluation,
} from '../../../services/playerPerformanceService';
import type { PlayerPerformanceDiagnosis } from '../../../utils/playerPerformanceAnalysisHelper';

type DrawerTab = 'all' | 'analysis' | 'problems' | 'work' | 'boost';

export interface PlayerPerformanceAnalysisDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  diagnosis: PlayerPerformanceDiagnosis | null;
  contextLabel: string;
  savedEvaluationId?: string | null;
  existingAiSynthesis?: GeminiPerformanceSynthesis | null;
  scores: {
    technique: number;
    tactique: number;
    physique: number;
    mental: number;
    global: number;
  };
  criteriaDetails: Array<{ pillar: string; label: string; score: number }>;
  coachNote?: string;
  history: PlayerPerformanceEvaluation[];
  currentRole?: string | null;
  currentJobTitle?: string | null;
  onSynthesisSaved?: (evalId: string, synthesis: GeminiPerformanceSynthesis) => void;
}

function formatDateFrSafe(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr.slice(0, 10)), 'dd MMM yyyy', { locale: fr });
  } catch {
    return dateStr;
  }
}

const PILLAR_CARD_STYLES: Record<
  string,
  { bar: string; chip: string; border: string }
> = {
  technique: {
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    border: 'border-emerald-200/80',
  },
  tactique: {
    bar: 'bg-indigo-500',
    chip: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    border: 'border-indigo-200/80',
  },
  physique: {
    bar: 'bg-rose-500',
    chip: 'bg-rose-50 text-rose-700 border-rose-200',
    border: 'border-rose-200/80',
  },
  mental: {
    bar: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    border: 'border-amber-200/80',
  },
};

export const PlayerPerformanceAnalysisDrawer: React.FC<PlayerPerformanceAnalysisDrawerProps> = ({
  isOpen,
  onClose,
  player,
  diagnosis,
  contextLabel,
  savedEvaluationId,
  existingAiSynthesis,
  scores,
  criteriaDetails,
  coachNote,
  history,
  currentRole,
  currentJobTitle,
  onSynthesisSaved,
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('all');
  const [copied, setCopied] = useState(false);
  const [aiSynthesis, setAiSynthesis] = useState<GeminiPerformanceSynthesis | null>(
    () => normalizeStoredGeminiSynthesis(existingAiSynthesis)
  );
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiErrorMsg, setAiErrorMsg] = useState<string | null>(null);
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const autoTriggeredKeyRef = useRef<string>('');

  const cleanedExistingSynthesis = useMemo(
    () => normalizeStoredGeminiSynthesis(existingAiSynthesis),
    [existingAiSynthesis]
  );

  useEffect(() => {
    setAiSynthesis(cleanedExistingSynthesis);
    setAiErrorMsg(null);
    setShowKeyPrompt(false);
  }, [cleanedExistingSynthesis, savedEvaluationId, player?.id, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      autoTriggeredKeyRef.current = '';
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleRunGemini = useCallback(
    async (overrideKey?: string, silentOnMissingKey = false) => {
      if (!player || !diagnosis) return;
      setIsGeneratingAi(true);
      setAiErrorMsg(null);
      try {
        const synthesis = await geminiPerformanceService.generateSynthesis(
          {
            player: {
              full_name: player.full_name,
              position: player.position,
              age_category: normalizeAgeCategory(player.category || 'PRO'),
              preferred_foot: (player as any).preferred_foot || null,
            },
            positionCode: diagnosis.positionCode,
            positionName: diagnosis.positionName,
            evaluationDate: diagnosis.evaluationDate,
            scores,
            criteriaDetails,
            coachNote,
            history,
          },
          overrideKey
        );
        setAiSynthesis(synthesis);
        setShowKeyPrompt(false);

        if (savedEvaluationId) {
          await playerPerformanceService.updateEvaluationSynthesis(
            savedEvaluationId,
            player.id,
            synthesis,
            currentRole,
            currentJobTitle
          );
          onSynthesisSaved?.(savedEvaluationId, synthesis);
        }
        if (!silentOnMissingKey) {
          toast.success(`FUS COACH AI · Analyse générée (${synthesis.model_used})`);
        }
      } catch (err: any) {
        if (err?.message === MISSING_GEMINI_API_KEY_ERROR) {
          setShowKeyPrompt(true);
          if (!silentOnMissingKey) {
            toast.info('Renseignez une clé API Gemini pour activer FUS COACH AI.');
          }
        } else {
          const msg = err?.message || 'Erreur lors de la génération FUS COACH AI.';
          setAiErrorMsg(msg);
          if (!silentOnMissingKey) {
            toast.error(msg);
          }
        }
      } finally {
        setIsGeneratingAi(false);
      }
    },
    [
      player,
      diagnosis,
      scores,
      criteriaDetails,
      coachNote,
      history,
      savedEvaluationId,
      currentRole,
      currentJobTitle,
      onSynthesisSaved,
    ]
  );

  // Lier automatiquement cette analyse à FUS COACH AI à l'ouverture si clé disponible et pas encore de synthèse complète
  useEffect(() => {
    if (!isOpen || !player || !diagnosis) return;
    const openKey = `${player.id}|${savedEvaluationId || 'draft'}|${diagnosis.positionCode}|${diagnosis.globalScore}`;
    if (autoTriggeredKeyRef.current === openKey) return;

    const existingSummaryLooksIncomplete = Boolean(
      cleanedExistingSynthesis?.summary?.endsWith('…') ||
        (cleanedExistingSynthesis && !cleanedExistingSynthesis.coach_recommendation)
    );
    const hasValidKey = Boolean(geminiVisionService.getApiKey()?.trim());

    if ((!cleanedExistingSynthesis || existingSummaryLooksIncomplete) && hasValidKey) {
      autoTriggeredKeyRef.current = openKey;
      void handleRunGemini(undefined, true);
    } else if (!hasValidKey && !cleanedExistingSynthesis) {
      autoTriggeredKeyRef.current = openKey;
      setShowKeyPrompt(true);
    }
  }, [isOpen, player, diagnosis, savedEvaluationId, cleanedExistingSynthesis, handleRunGemini]);

  const handleCopyDiagnosis = async () => {
    if (!player || !diagnosis) return;
    const lines: string[] = [
      `FUS COACH AI — ANALYSE PERFORMANCE : ${player.full_name} (${diagnosis.positionName} · ${diagnosis.positionCode})`,
      `Date : ${formatDateFrSafe(diagnosis.evaluationDate)} | Contexte : ${contextLabel} | Note Globale : ${diagnosis.globalScore}/10 (${diagnosis.levelLabel})`,
      ...(aiSynthesis
        ? [
            '',
            'SYNTHÈSE FUS COACH AI :',
            aiSynthesis.summary,
            ...(aiSynthesis.coach_recommendation ? [`Plan Coach AI : ${aiSynthesis.coach_recommendation}`] : []),
          ]
        : []),
      '',
      '1. ANALYSE DES PERFORMANCES :',
      diagnosis.executiveSummary,
      ...diagnosis.pillarBreakdown.map(
        p => `- ${p.label} : ${p.score}/10${p.deltaVsAvg !== null ? ` (écart moyenne : ${p.deltaVsAvg > 0 ? `+${p.deltaVsAvg}` : p.deltaVsAvg})` : ''}`
      ),
      '',
      '2. PROBLÈMES IDENTIFIÉS :',
      ...diagnosis.problems.map(p => `- [${p.scoreLabel}] ${p.title} → ${p.impact}`),
      '',
      '3. CE QU’IL FAUT TRAVAILLER :',
      ...diagnosis.workAxes.map(
        w => `- [${w.priority}] ${w.criterionTitle} (${w.currentScore}/10 → ${w.targetScore}/10) : ${w.objective} Atelier : ${w.drill}`
      ),
      '',
      `4. PLAN POUR AUGMENTER LES PERFORMANCES (${diagnosis.boostPlan.currentGlobalScore}/10 → ${diagnosis.boostPlan.projectedGlobalScore}/10) :`,
      ...diagnosis.boostPlan.steps.map(s => `- ${s.horizon} — ${s.title} : ${s.description}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      toast.success('Bilan complet copié dans le presse-papiers');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier automatiquement le texte.');
    }
  };

  const handleSaveGeminiKey = () => {
    const clean = geminiKeyInput.trim();
    if (!clean) {
      toast.error('Veuillez coller une clé API Gemini valide.');
      return;
    }
    geminiVisionService.saveApiKey(clean);
    setGeminiKeyInput('');
    void handleRunGemini(clean, false);
  };

  const showSection = (tab: Exclude<DrawerTab, 'all'>) =>
    activeTab === 'all' || activeTab === tab;

  return (
    <AnimatePresence>
      {isOpen && player && diagnosis && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label={`FUS COACH AI — Analyse de performance de ${player.full_name}`}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]"
          />

          {/* Volet latéral coulissant de droite à gauche */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            className="relative z-10 w-full max-w-[640px] h-full bg-slate-50 border-l border-slate-200 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header Dark FUS + LOGO FUS COACH AI EN ÉVIDENCE TOUT EN HAUT */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-red-950/90 text-white px-5 pt-4 pb-3.5 border-b border-white/10 shrink-0 space-y-3.5">
              {/* Bandeau Identité Logo FUS COACH AI mis en évidence en haut */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-red-600/25 via-indigo-600/25 to-amber-500/20 border border-amber-400/35 px-3.5 py-2.5 shadow-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-11 h-11 rounded-2xl bg-white p-1 shadow-md ring-2 ring-amber-400/70 shrink-0 flex items-center justify-center">
                    <img
                      src={defaultClubLogo}
                      alt="Logo FUS COACH AI"
                      className="w-full h-full object-contain"
                    />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-red-600 text-slate-950 flex items-center justify-center shadow ring-2 ring-slate-950">
                      <Sparkles className="w-3 h-3" />
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm sm:text-base font-black tracking-wide bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent">
                        FUS COACH AI
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wider">
                        IA Officielle
                      </span>
                      {aiSynthesis && !isGeneratingAi && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-[9px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {aiSynthesis.model_used}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-200 truncate">
                      {isGeneratingAi
                        ? 'Analyse tactique, technique, physique & mentale en cours…'
                        : 'Diagnostic connecté à Google Gemini AI · Performance & Progression'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isGeneratingAi}
                    onClick={() => void handleRunGemini(undefined, false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-60 text-slate-950 text-[11px] font-black shadow-sm transition cursor-pointer"
                  >
                    {isGeneratingAi ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>{isGeneratingAi ? 'Analyse IA…' : aiSynthesis ? 'Actualiser IA' : 'Lancer IA'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fermer le panneau FUS COACH AI"
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Ligne Joueur & Note Globale */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={
                      player.photo_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=dc2626&color=fff&size=128`
                    }
                    alt={player.full_name}
                    className="w-11 h-11 rounded-2xl object-cover border border-white/15 shrink-0"
                    onError={e => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/assets/avatar.svg';
                    }}
                  />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="text-sm sm:text-base font-black tracking-tight truncate">
                        {player.full_name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-200 text-[10px] font-bold">
                        {normalizeAgeCategory(player.category || 'PRO')}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-300 font-semibold">
                      <span className="inline-flex items-center gap-1 text-amber-300 font-black">
                        <Shield className="w-3 h-3" />
                        {diagnosis.positionName} ({diagnosis.positionCode})
                      </span>
                      <span>·</span>
                      <span className="truncate">{contextLabel}</span>
                      <span>·</span>
                      <span>{formatDateFrSafe(diagnosis.evaluationDate)}</span>
                    </div>
                  </div>
                </div>

                <div className="px-3 py-1 rounded-2xl bg-white/10 border border-white/15 text-center shrink-0">
                  <div className="text-[9px] font-bold uppercase text-slate-300">Note</div>
                  <div className="text-base sm:text-lg font-black text-amber-400 tabular-nums leading-tight">
                    {diagnosis.globalScore}/10
                  </div>
                </div>
              </div>

              {/* Barre onglets & action copier */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  {[
                    { id: 'all' as const, label: 'Tout' },
                    { id: 'analysis' as const, label: 'Analyse' },
                    { id: 'problems' as const, label: `Problèmes (${diagnosis.problems.length})` },
                    { id: 'work' as const, label: `À travailler (${diagnosis.workAxes.length})` },
                    { id: 'boost' as const, label: 'Progression' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer',
                        activeTab === t.id
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleCopyDiagnosis}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-bold text-slate-100 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copié' : 'Copier bilan'}</span>
                </button>
              </div>
            </div>

            {/* Corps scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* CARTE PHARE EN HAUT : SYNTHÈSE LIVE FUS COACH AI */}
              <section className="rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 text-white border border-indigo-500/35 p-4 sm:p-5 space-y-3.5 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-white p-0.5 flex items-center justify-center shrink-0">
                      <img src={defaultClubLogo} alt="FUS COACH AI" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                          Synthèse FUS COACH AI
                        </span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      {aiSynthesis?.evolution_trend && (
                        <p className="text-[11px] text-indigo-200 font-medium">{aiSynthesis.evolution_trend}</p>
                      )}
                    </div>
                  </div>

                  {!showKeyPrompt && (
                    <button
                      type="button"
                      onClick={() => setShowKeyPrompt(v => !v)}
                      className="text-[10px] font-bold text-slate-300 hover:text-white underline-offset-2 hover:underline cursor-pointer"
                    >
                      Clé Gemini
                    </button>
                  )}
                </div>

                {showKeyPrompt && (
                  <div className="rounded-xl bg-white/10 border border-white/15 p-3 space-y-2">
                    <div className="text-[11px] font-bold text-amber-200 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>Clé API Google Gemini requise pour activer FUS COACH AI</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={geminiKeyInput}
                        onChange={e => setGeminiKeyInput(e.target.value)}
                        placeholder="Coller AIza..."
                        className="flex-1 h-9 px-3 rounded-lg border border-white/20 bg-slate-950/60 text-xs text-white placeholder:text-slate-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSaveGeminiKey}
                        className="px-3.5 h-9 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                      >
                        Activer AI
                      </button>
                    </div>
                  </div>
                )}

                {isGeneratingAi ? (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center gap-3 text-xs font-semibold text-slate-200">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                    <span>
                      FUS COACH AI analyse les critères du poste {diagnosis.positionCode} et l&apos;historique de {player.full_name}…
                    </span>
                  </div>
                ) : aiErrorMsg && !aiSynthesis ? (
                  <div className="rounded-xl bg-rose-500/15 border border-rose-400/30 p-3 text-xs text-rose-200 flex items-center justify-between gap-2">
                    <span>{aiErrorMsg}</span>
                    <button
                      type="button"
                      onClick={() => void handleRunGemini(undefined, false)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[11px] font-black shrink-0 cursor-pointer"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : aiSynthesis ? (
                  <div className="space-y-3">
                    <p className="text-xs sm:text-[13px] text-slate-100 leading-relaxed font-medium bg-white/5 rounded-xl p-3.5 border border-white/10">
                      {aiSynthesis.summary}
                    </p>

                    {(aiSynthesis.strengths.length > 0 || aiSynthesis.improvements.length > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {aiSynthesis.strengths.length > 0 && (
                          <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/25 p-3 space-y-1.5">
                            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                              Points forts identifiés par l&apos;IA
                            </div>
                            <ul className="space-y-1 text-[11px] text-slate-100">
                              {aiSynthesis.strengths.map((s, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {aiSynthesis.improvements.length > 0 && (
                          <div className="rounded-xl bg-rose-500/10 border border-rose-400/25 p-3 space-y-1.5">
                            <div className="text-[10px] font-black uppercase tracking-wider text-rose-300">
                              Problèmes / Priorités IA
                            </div>
                            <ul className="space-y-1 text-[11px] text-slate-100">
                              {aiSynthesis.improvements.map((imp, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                  <span>{imp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {aiSynthesis.key_drills && aiSynthesis.key_drills.length > 0 && (
                      <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1.5">
                        <div className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                          <Wrench className="w-3 h-3" />
                          <span>Ateliers terrain FUS COACH AI</span>
                        </div>
                        <ul className="space-y-1 text-[11px] text-slate-200">
                          {aiSynthesis.key_drills.map((d, i) => (
                            <li key={i}>• {d}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiSynthesis.coach_recommendation && (
                      <div className="rounded-xl bg-amber-400/15 border border-amber-400/30 p-3 text-xs text-amber-50 leading-relaxed">
                        <span className="font-black text-amber-300">Recommandation FUS COACH AI : </span>
                        {aiSynthesis.coach_recommendation}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Cliquez sur <span className="font-black text-amber-300">Lancer IA</span> ci-dessus pour générer l&apos;analyse complète de {player.full_name} avec FUS COACH AI.
                  </p>
                )}
              </section>
              {/* 1. ANALYSE DES PERFORMANCES */}
              {showSection('analysis') && (
                <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 space-y-4 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-red-600" />
                      <span>1. Analyse des performances</span>
                    </h3>
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full border text-[10px] font-black',
                        diagnosis.levelBadgeClass
                      )}
                    >
                      {diagnosis.levelLabel}
                    </span>
                  </div>

                  <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed font-medium bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                    {diagnosis.executiveSummary}
                  </p>

                  {/* Comparaison Historique */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-center">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Suivis datés</div>
                      <div className="text-sm font-black text-slate-900 tabular-nums mt-0.5">
                        {diagnosis.historySummary.totalCount}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-center">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Moy. joueur</div>
                      <div className="text-sm font-black text-slate-900 tabular-nums mt-0.5">
                        {diagnosis.historySummary.avgGlobal !== null
                          ? `${diagnosis.historySummary.avgGlobal}/10`
                          : '—'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-center">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Tendance</div>
                      <div
                        className={cn(
                          'text-xs font-black mt-1 inline-flex items-center gap-1',
                          diagnosis.historySummary.trendDirection === 'up'
                            ? 'text-emerald-700'
                            : diagnosis.historySummary.trendDirection === 'down'
                              ? 'text-rose-700'
                              : 'text-slate-700'
                        )}
                      >
                        {diagnosis.historySummary.trendDirection === 'up' && (
                          <TrendingUp className="w-3.5 h-3.5" />
                        )}
                        {diagnosis.historySummary.trendDirection === 'down' && (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        <span>{diagnosis.historySummary.trendLabel}</span>
                      </div>
                    </div>
                  </div>

                  {/* Diagnostic des 4 Piliers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {diagnosis.pillarBreakdown.map(p => {
                      const styleMeta = PILLAR_CARD_STYLES[p.pillar];
                      return (
                        <div
                          key={p.pillar}
                          className={cn(
                            'rounded-xl border bg-slate-50/70 p-3 space-y-2',
                            styleMeta.border
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-slate-900">{p.label}</span>
                            <div className="flex items-center gap-1.5">
                              {p.deltaVsAvg !== null && p.deltaVsAvg !== 0 && (
                                <span
                                  className={cn(
                                    'text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded-md',
                                    p.deltaVsAvg > 0
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-rose-100 text-rose-700'
                                  )}
                                >
                                  {p.deltaVsAvg > 0 ? `+${p.deltaVsAvg}` : p.deltaVsAvg} vs moy
                                </span>
                              )}
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-lg border text-[11px] font-black tabular-nums',
                                  styleMeta.chip
                                )}
                              >
                                {p.score}/10
                              </span>
                            </div>
                          </div>

                          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', styleMeta.bar)}
                              style={{ width: `${Math.min(100, Math.max(0, p.score * 10))}%` }}
                            />
                          </div>

                          {p.weakCriteria.length > 0 ? (
                            <div className="text-[10px] font-semibold text-rose-700 truncate">
                              Point bas : {p.weakCriteria[0].title} ({p.weakCriteria[0].score}/10)
                            </div>
                          ) : p.strongCriteria.length > 0 ? (
                            <div className="text-[10px] font-semibold text-emerald-700 truncate">
                              Point fort : {p.strongCriteria[0].title} ({p.strongCriteria[0].score}/10)
                            </div>
                          ) : (
                            <div className="text-[10px] font-medium text-slate-500">
                              Rendement équilibré sur ce pilier
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Points forts */}
                  {diagnosis.strengths.length > 0 && (
                    <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-3 space-y-2">
                      <div className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Points d&apos;appui du joueur</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {diagnosis.strengths.map((st, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-[11px] font-bold text-slate-800"
                          >
                            <span>{st.label}</span>
                            <span className="text-emerald-700 font-black tabular-nums">
                              {st.score}/10
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* 2. LES PROBLÈMES IDENTIFIÉS */}
              {showSection('problems') && (
                <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>2. Problèmes &amp; points faibles détectés</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black">
                      {diagnosis.problems.length} point{diagnosis.problems.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {diagnosis.problems.map(prob => {
                      const isCritical = prob.severity === 'critical';
                      const isWarning = prob.severity === 'warning';
                      return (
                        <div
                          key={prob.id}
                          className={cn(
                            'rounded-xl border p-3.5 space-y-1',
                            isCritical
                              ? 'bg-rose-50/75 border-rose-200'
                              : isWarning
                                ? 'bg-amber-50/75 border-amber-200'
                                : 'bg-indigo-50/60 border-indigo-200'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-slate-900">{prob.title}</span>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-md text-[10px] font-black tabular-nums shrink-0',
                                isCritical
                                  ? 'bg-rose-600 text-white'
                                  : isWarning
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-indigo-600 text-white'
                              )}
                            >
                              {prob.scoreLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                            {prob.impact}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 3. CE QU'IL FAUT TRAVAILLER */}
              {showSection('work') && (
                <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-amber-600" />
                      <span>3. Ce qu&apos;il faut travailler (Ateliers ciblés)</span>
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {diagnosis.workAxes.map(axis => (
                      <div
                        key={axis.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={cn(
                                'px-1.5 py-0.5 rounded-md text-[10px] font-black',
                                axis.priority === 'P1'
                                  ? 'bg-rose-600 text-white'
                                  : axis.priority === 'P2'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-700 text-white'
                              )}
                            >
                              {axis.priority}
                            </span>
                            <span className="text-[10px] font-black uppercase text-slate-500">
                              {axis.pillarLabel}
                            </span>
                            <span className="text-xs font-black text-slate-900 truncate">
                              · {axis.criterionTitle}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-black tabular-nums text-slate-800 shrink-0">
                            <span>{axis.currentScore}/10</span>
                            <ArrowRight className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">{axis.targetScore}/10</span>
                          </span>
                        </div>

                        <p className="text-[11px] font-bold text-slate-800">{axis.objective}</p>
                        <div className="rounded-lg bg-white border border-slate-200/80 px-3 py-2 text-[11px] text-slate-600 leading-relaxed">
                          <span className="font-black text-slate-800">Atelier recommandé : </span>
                          {axis.drill}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 4. COMMENT AUGMENTER LES PERFORMANCES */}
              {showSection('boost') && (
                <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white p-4 sm:p-5 space-y-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-400" />
                      <span>4. Augmenter les performances du joueur</span>
                    </h3>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-black tabular-nums">
                      <span>{diagnosis.boostPlan.currentGlobalScore}/10</span>
                      <ArrowRight className="w-3 h-3" />
                      <span>Objectif {diagnosis.boostPlan.projectedGlobalScore}/10</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {diagnosis.boostPlan.projectedSummary}
                  </p>

                  <div className="space-y-2.5">
                    {diagnosis.boostPlan.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-red-300">
                            {step.horizon}
                          </span>
                          <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        </div>
                        <div className="text-xs font-black text-white">{step.title}</div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {diagnosis.boostPlan.kpis.map((kpi, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-white/10 text-[10px] font-bold text-slate-100"
                      >
                        ✓ {kpi}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PlayerPerformanceAnalysisDrawer;

