import React, { useState } from 'react';
import {
  X,
  FileText,
  Star,
  ChevronRight,
  Save,
  User,
  Compass,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TrialCandidate } from '../types/recruitment';
import { cn } from '../../../lib/utils';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface ScoutReport {
  player_source: string;
  match_context: string;
  general_impression: string;
  technical_description: string;
  strengths: string;
  weaknesses: string;
  potential: string;
  standout_moments: string;
  scout_recommendation: string;
  next_steps: string;
  priority: 'high' | 'medium' | 'low';
  scout_signature: string;
}

interface ScoutReportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: TrialCandidate;
  onSave: (report: ScoutReport) => Promise<void>;
  defaultScoutName?: string;
  defaultSource?: string;
}

// ──────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────

const WIZARD_STEPS = [
  {
    number: 3,
    id: 'player_report',
    title: 'Observation Terrain',
    icon: '📄',
    description: "Contexte d'observation et impression générale du joueur sur le terrain",
  },
  {
    number: 4,
    id: 'qualities',
    title: 'Qualités',
    icon: '⭐',
    description: 'Points forts, axes de progression et potentiel détecté',
  },
  {
    number: 5,
    id: 'scout_report',
    title: 'Rapport de Scout',
    icon: '🔍',
    description: 'Recommandation officielle et prochaines étapes',
  },
];

const PRIORITY_OPTIONS = [
  { id: 'high', label: '🔥 Haute', activeColor: 'bg-red-500 text-white border-red-500', inactiveColor: 'bg-red-50 border-red-300 text-red-800' },
  { id: 'medium', label: '⚡ Moyenne', activeColor: 'bg-amber-500 text-white border-amber-500', inactiveColor: 'bg-amber-50 border-amber-300 text-amber-800' },
  { id: 'low', label: '🔵 Basse', activeColor: 'bg-blue-500 text-white border-blue-500', inactiveColor: 'bg-blue-50 border-blue-200 text-blue-800' },
];

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export const ScoutReportWizard: React.FC<ScoutReportWizardProps> = ({
  isOpen,
  onClose,
  candidate,
  onSave,
  defaultScoutName = 'Scout FUS',
  defaultSource,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const [playerSource, setPlayerSource] = useState(defaultSource || candidate.information_source || '');
  const [matchContext, setMatchContext] = useState('');
  const [generalImpression, setGeneralImpression] = useState('');
  const [technicalDescription, setTechnicalDescription] = useState('');
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [potential, setPotential] = useState('');
  const [standoutMoments, setStandoutMoments] = useState('');
  const [scoutRecommendation, setScoutRecommendation] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [scoutSignature, setScoutSignature] = useState(defaultScoutName);

  if (!isOpen) return null;

  const step = WIZARD_STEPS[currentStep];
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  const progressPct = Math.round(((currentStep + 1) / WIZARD_STEPS.length) * 100);

  const handleNext = () => {
    setCurrentStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };

  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        player_source: playerSource,
        match_context: matchContext,
        general_impression: generalImpression,
        technical_description: technicalDescription,
        strengths: strengths,
        weaknesses: weaknesses,
        potential: potential,
        standout_moments: standoutMoments,
        scout_recommendation: scoutRecommendation,
        next_steps: nextSteps,
        priority: priority,
        scout_signature: scoutSignature.trim() || defaultScoutName || 'Scout FUS',
      });
      toast.success('Rapport de scout enregistré avec succès !');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'enregistrement du rapport");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-5 border-b bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-white text-base shrink-0 overflow-hidden">
                {candidate.photo_url ? (
                  <img
                    src={candidate.photo_url}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <span>{candidate.first_name?.[0] || ''}{candidate.last_name?.[0] || ''}</span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-black text-white leading-tight flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  Rapport de Scout
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {candidate.first_name} {candidate.last_name}{' '}
                  <span className="mx-1 text-slate-500">•</span>
                  <span className="font-bold text-primary">{candidate.primary_position}</span>{' '}
                  <span className="mx-1 text-slate-500">•</span>
                  {candidate.age_category || 'U17'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {WIZARD_STEPS.map((s, idx) => (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  onClick={() => { if (idx < currentStep) setCurrentStep(idx); }}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all',
                    idx === currentStep
                      ? 'bg-primary text-white shadow-sm'
                      : idx < currentStep
                      ? 'bg-white/20 text-white cursor-pointer hover:bg-white/25'
                      : 'bg-white/5 text-slate-500 cursor-not-allowed'
                  )}
                >
                  <span>{s.icon}</span>
                  <span className="hidden sm:inline">{s.number}. {s.title}</span>
                  <span className="sm:hidden">{s.number}</span>
                </button>
                {idx < WIZARD_STEPS.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Source du Joueur - persistante sur toutes les étapes */}
        <div className="px-6 pt-4 pb-3 bg-indigo-50/60 border-b border-indigo-100">
          <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-indigo-800 mb-1.5">
            <Compass className="w-3.5 h-3.5" />
            Source du Joueur
          </label>
          <input
            type="text"
            value={playerSource}
            onChange={(e) => setPlayerSource(e.target.value)}
            placeholder="Ex: Match interclubs, Tournoi regional, Reseau agent, Detection academie..."
            className="w-full px-3.5 py-2 rounded-xl border border-indigo-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
          />
        </div>

        {/* Step Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar" style={{ maxHeight: '52vh' }}>
          <div className="flex items-start gap-3 pb-3 border-b">
            <span className="text-2xl">{step.icon}</span>
            <div>
              <h4 className="text-sm font-black text-slate-900">{step.number}. {step.title}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">{step.description}</p>
            </div>
          </div>

          {/* STEP 3 */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Contexte du match / Observation <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  value={matchContext}
                  onChange={(e) => setMatchContext(e.target.value)}
                  placeholder="Ex: Match U17 contre AS FAR le 14/09 - Terrain El Harti, Marrakech"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Impression generale du joueur <span className="text-primary">*</span>
                </label>
                <textarea
                  rows={3}
                  value={generalImpression}
                  onChange={(e) => setGeneralImpression(e.target.value)}
                  placeholder="Decrivez votre premiere impression : presence, attitude, comportement sur le terrain..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Description technique generale
                </label>
                <textarea
                  rows={3}
                  value={technicalDescription}
                  onChange={(e) => setTechnicalDescription(e.target.value)}
                  placeholder="Decrivez les aptitudes techniques observees : touches de balle, passes, conduite, dribbles..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                  Points Forts <span className="text-primary">*</span>
                </label>
                <textarea
                  rows={3}
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="Listez les qualites distinctives : vitesse, technique, vision du jeu, leadership, mentalite..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/40 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <ThumbsDown className="w-3.5 h-3.5 text-amber-600" />
                  Axes de Progression / Points Faibles
                </label>
                <textarea
                  rows={3}
                  value={weaknesses}
                  onChange={(e) => setWeaknesses(e.target.value)}
                  placeholder="Aspects a ameliorer : pied faible, concentration, physique, placement defensif..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-amber-50/40 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  Potentiel Estime
                </label>
                <textarea
                  rows={2}
                  value={potential}
                  onChange={(e) => setPotential(e.target.value)}
                  placeholder="Evaluation du potentiel de progression sur 1 a 3 ans..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/40 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                  Moments Marquants
                </label>
                <textarea
                  rows={2}
                  value={standoutMoments}
                  onChange={(e) => setStandoutMoments(e.target.value)}
                  placeholder="Actions remarquables : but, dribble, recuperation defensive, passe decisive..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-yellow-200 bg-yellow-50/40 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  Recommandation Officielle du Scout
                </label>
                <textarea
                  rows={4}
                  value={scoutRecommendation}
                  onChange={(e) => setScoutRecommendation(e.target.value)}
                  placeholder="Redigez la recommandation officielle : integration academie, test club, shortlist, suivi long terme..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                  Prochaines Etapes Suggerees
                </label>
                <textarea
                  rows={2}
                  value={nextSteps}
                  onChange={(e) => setNextSteps(e.target.value)}
                  placeholder="Ex: Planifier un test club dans les 2 semaines, contacter le tuteur..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Niveau de Priorite</label>
                <div className="flex gap-2 flex-wrap">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPriority(opt.id as 'high' | 'medium' | 'low')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                        priority === opt.id ? opt.activeColor : opt.inactiveColor
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Nom du Scout Signataire <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  value={scoutSignature}
                  onChange={(e) => setScoutSignature(e.target.value)}
                  placeholder="Ex: Hassan Benabicha - Scout Regional FUS"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Recap */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <h5 className="font-black text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Recapitulatif du rapport
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block">Source du joueur</span>
                    <span className="font-bold text-slate-800">{playerSource || 'Non renseigne'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Contexte</span>
                    <span className="font-bold text-slate-800 truncate block">{matchContext || 'Non renseigne'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Points forts</span>
                    <span className="font-bold text-slate-800 truncate block">
                      {strengths ? `${strengths.slice(0, 50)}${strengths.length > 50 ? '...' : ''}` : 'Non renseigne'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Priorite</span>
                    <span className="font-bold text-slate-800">{PRIORITY_OPTIONS.find((o) => o.id === priority)?.label}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={isFirstStep ? onClose : handleBack}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 border border-slate-200 bg-white transition-colors cursor-pointer"
          >
            {isFirstStep ? 'Annuler' : '← Retour'}
          </button>

          {isLastStep ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-white text-xs font-black shadow-md flex items-center gap-2 bg-primary hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Enregistrement...' : 'Enregistrer le rapport'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-xl text-white text-xs font-black shadow-md flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
            >
              <span>Suivant</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScoutReportWizard;
