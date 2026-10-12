import React, { useState, useMemo, useEffect } from 'react';
import type {
  TrialCandidate,
  CandidateEvaluation,
  ScoutObservation,
  PlayerTest,
  RecruitmentTimelineEvent,
  Scout,
  AdministrativeDocument
} from '../types/recruitment';
import { ScoutAvatar } from './ScoutAvatar';
import PlayerRadarChart, { type RadarTabMode } from './PlayerRadarChart';
import { QualityPillarsBlock } from './QualityPillarsBlock';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, ChartTooltip, ChartLegend);
import { getScoutPositionConfig, type ScoutPillarKey } from '../constants/scoutCriteriaByPosition';
import { useMetrics } from '../../../hooks/useMetrics';
import {
  X, User, Shield, Calendar, Award, Sparkles, Phone, Mail,
  Clock, MapPin, CheckCircle2, AlertCircle, FileText, Briefcase, Building2,
  ShieldCheck, ShieldAlert, UserCheck, Zap, Star, XCircle, RotateCcw, TrendingUp, TrendingDown, Edit3,
  Video, Play, ExternalLink, Lock, ArrowLeft, Users, FileSpreadsheet, Flame, Compass, Target, Eye,
  History, ClipboardList, Bookmark, BookmarkCheck, Trash2, Check, Loader2, Trophy, Info
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { recruitmentService } from '../services/recruitmentService';
import { toast } from 'sonner';
import { useClubData } from '../../../hooks/useClubData';
import type { Club } from '../../../types';
import { OpponentClubFormModal } from '../../club-management/components/OpponentClubFormModal';
import { AdministrativeDossierForm } from './AdministrativeDossierForm';
import { PlayerVideoModal } from './PlayerVideoModal';

const calculateAge = (birthDate?: string) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

import DOMPurify from 'dompurify';

// Helper pour afficher le texte riche HTML proprement sans balises <p> brutes
const RichTextView: React.FC<{ content?: string; fallback?: string; className?: string }> = ({
  content,
  fallback = 'Non renseigné',
  className,
}) => {
  if (!content || !content.trim() || content === '<p></p>') {
    return <span className="text-slate-400 italic text-xs">{fallback}</span>;
  }

  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  if (isHtml) {
    const cleanHtml = DOMPurify.sanitize(content);
    return (
      <div
        className={cn("prose prose-sm max-w-none text-slate-800 text-xs [&>p]:mb-1 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4", className)}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    );
  }

  return (
    <p className={cn("text-xs text-slate-800 whitespace-pre-wrap leading-relaxed", className)}>
      {content}
    </p>
  );
};

// Helper pour extraire l'intitulé propre d'un critère et ses détails entre parenthèses
const parseCriterion = (criterion: string) => {
  const openIndex = criterion.indexOf('(');
  const closeIndex = criterion.lastIndexOf(')');
  if (openIndex !== -1 && closeIndex > openIndex) {
    const title = criterion.substring(0, openIndex).trim();
    const detail = criterion.substring(openIndex + 1, closeIndex).trim();
    return { title, detail };
  }
  return { title: criterion.trim(), detail: null };
};

interface CandidateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: TrialCandidate;
  evaluations: CandidateEvaluation[];
  observations: ScoutObservation[];
  tests: PlayerTest[];
  timeline: RecruitmentTimelineEvent[];
  onUpdateStatus?: (id: string, status: TrialCandidate['status']) => void;
  onOpenEvaluation?: (options?: { mode?: 'create' | 'reevaluate' | 'edit'; testId?: string }) => void;
  onOpenObservation?: () => void;
  onScheduleTest?: (candidate: TrialCandidate) => void;
  onAddReport?: (candidate: TrialCandidate) => void;
  onEditReport?: (candidate: TrialCandidate, evaluation: CandidateEvaluation) => void;
  onDeleteReport?: (reportId: string) => Promise<void>;
  onDeleteReports?: (reportIds: string[]) => Promise<void>;
  canEditEvaluation?: (evaluation: CandidateEvaluation) => boolean;
  canDeleteEvaluation?: (evaluation: CandidateEvaluation) => boolean;
  onRefresh?: () => void;
  variant?: 'page' | 'modal';
  onOpenEditCandidate?: (candidate: TrialCandidate) => void;
  onDeleteCandidate?: (candidate: TrialCandidate) => void;
  onOpenDriveLink?: (candidate: TrialCandidate) => void;
  onUpdateCandidate?: (id: string, updates: Partial<TrialCandidate>) => Promise<void>;
  initialTab?: 'scout' | 'personal' | 'sport' | 'evaluations' | 'report';
  scouts?: Scout[];
}

export const CandidateDetailModal: React.FC<CandidateDetailModalProps> = ({
  isOpen,
  onClose,
  candidate,
  evaluations,
  observations,
  tests,
  timeline,
  scouts = [],
  onUpdateStatus,
  onOpenEvaluation,
  onOpenObservation,
  onScheduleTest,
  onAddReport,
  onEditReport,
  onDeleteReport,
  onDeleteReports,
  canEditEvaluation,
  canDeleteEvaluation,
  onRefresh,
  variant = 'page',
  onOpenEditCandidate,
  onDeleteCandidate,
  onOpenDriveLink,
  onUpdateCandidate,
  initialTab = 'scout',
}) => {
  const [activeTab, setActiveTab] = useState<'scout' | 'personal' | 'report' | 'admin'>((initialTab === 'sport' || initialTab === 'evaluations' || initialTab === 'report') ? 'report' : (initialTab as any) || 'scout');
  const { getPositionByCode } = useMetrics();

  const resolvePositionConfig = (posCode?: string) => {
    const custom = getPositionByCode(posCode);
    if (custom && custom.criteria) return custom;
    return getScoutPositionConfig(posCode);
  };
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [isBulkDeleteReportsModalOpen, setIsBulkDeleteReportsModalOpen] = useState(false);
  const [isDeletingReports, setIsDeletingReports] = useState(false);
  const [activeQualityPillar, setActiveQualityPillar] = useState<RadarTabMode>('tech');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [pillarViewModes, setPillarViewModes] = useState<Record<string, 'bars' | 'radar'>>({
    tech: 'bars',
    tact: 'bars',
    phys: 'bars',
    ment: 'bars',
  });
  const [isOpponentModalOpen, setIsOpponentModalOpen] = useState(false);
  const [selectedOpponentClub, setSelectedOpponentClub] = useState<Club | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const [currentAdminDocs, setCurrentAdminDocs] = useState<AdministrativeDocument[]>(candidate?.administrative_documents || []);
  const [currentContractType, setCurrentContractType] = useState<string>(candidate?.contract_type || 'Convention de formation');
  const [currentAdminNotes, setCurrentAdminNotes] = useState<string>(candidate?.admin_notes || '');

  React.useEffect(() => {
    setCurrentAdminDocs(candidate?.administrative_documents || []);
    setCurrentContractType(candidate?.contract_type || 'Convention de formation');
    setCurrentAdminNotes(candidate?.admin_notes || '');
  }, [candidate]);

  const handleDocsChange = async (newDocs: AdministrativeDocument[]) => {
    setCurrentAdminDocs(newDocs);
    if (onUpdateCandidate && candidate?.id) {
      await onUpdateCandidate(candidate.id, { administrative_documents: newDocs });
    } else if (candidate?.id) {
      await recruitmentService.updateCandidate(candidate.id, { administrative_documents: newDocs });
    }
  };

  const handleContractTypeChange = async (newType: string) => {
    setCurrentContractType(newType);
    if (onUpdateCandidate && candidate?.id) {
      await onUpdateCandidate(candidate.id, { contract_type: newType });
    } else if (candidate?.id) {
      await recruitmentService.updateCandidate(candidate.id, { contract_type: newType });
    }
  };

  const handleAdminNotesChange = async (newNotes: string) => {
    setCurrentAdminNotes(newNotes);
    if (onUpdateCandidate && candidate?.id) {
      await onUpdateCandidate(candidate.id, { admin_notes: newNotes });
    } else if (candidate?.id) {
      await recruitmentService.updateCandidate(candidate.id, { admin_notes: newNotes });
    }
  };

  React.useEffect(() => {
    if (initialTab) {
      if (initialTab === 'sport' || initialTab === 'evaluations' || initialTab === 'report') {
        setActiveTab('report');
      } else {
        setActiveTab(initialTab as any);
      }
    }
  }, [initialTab, candidate?.id]);

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('en-CA');
  const candidateEvals = evaluations
    .filter(e => e.candidate_id === candidate.id)
    .sort((a, b) => {
      const dateA = new Date(a.evaluation_date || a.created_at || '').getTime();
      const dateB = new Date(b.evaluation_date || b.created_at || '').getTime();
      return dateB - dateA;
    });
  const deletableEvaluations = useMemo(() => {
    return candidateEvals.filter(ev => !canDeleteEvaluation || canDeleteEvaluation(ev));
  }, [candidateEvals, canDeleteEvaluation]);
  const latestEval = candidateEvals[0];
  const candidateObs = observations.filter(o => o.candidate_id === candidate.id);
  const candidateTests = tests.filter(t => t.candidate_id === candidate.id);
  const candidateTimeline = timeline.filter(t => t.candidate_id === candidate.id);

  // Initialiser le rapport sélectionné par défaut sur le plus récent
  const currentSelectedReport = candidateEvals.find(e => e.id === selectedReportId) || candidateEvals[0] || null;

  // Filtrage des tests selon la date pour verrouillage d'évaluation
  const eligibleTests = candidateTests.filter(t => t.test_date <= todayStr);
  const futureTests = candidateTests.filter(t => t.test_date > todayStr);
  const firstEligibleTest = eligibleTests[0];
  const nextFutureTest = futureTests[0];

  const isPage = variant === 'page';

  const candidateAge = calculateAge(candidate.birth_date);
  const candidateSurclass = (candidate as any).surclassement || (candidate as any).is_upgraded_category || (candidate as any).upgraded_category;
  const isCandidateUpgraded = !!candidateSurclass && candidateSurclass !== 'non' && candidateSurclass !== false && candidateSurclass !== 'false';
  const candidateSurclassLabel = typeof candidateSurclass === 'string' && candidateSurclass !== 'true' && candidateSurclass !== 'oui' ? candidateSurclass : null;

  const cardContent = (
    <div className={cn(
      "bg-white flex flex-col overflow-hidden",
      isPage
        ? "rounded-3xl border border-slate-200 shadow-sm"
        : "rounded-3xl shadow-2xl border-2 border-slate-300 w-full max-w-4xl max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 opacity-100"
    )}>
      {/* 🌟 BANDEAU HERO OMNIPRÉSENT : PHOTO DU JOUEUR & PHOTO DU SCOUT 🌟 */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 shrink-0">
        {/* BLOC 1 : JOUEUR (Photo omniprésente, nom, poste, club, âge, surclassement) */}
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <div className="relative shrink-0">
            {candidate.photo_url ? (
              <img
                src={candidate.photo_url}
                alt={`${candidate.first_name} ${candidate.last_name}`}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-white/20 shadow-md bg-slate-800"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fb = (e.target as HTMLElement).nextElementSibling;
                  if (fb) (fb as HTMLElement).style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 text-white font-black text-lg sm:text-xl flex items-center justify-center ring-2 ring-white/20 shadow-md",
                candidate.photo_url ? "hidden" : "flex"
              )}
            >
              {candidate.first_name?.[0]}{candidate.last_name?.[0]}
            </div>
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-primary text-white text-[10px] font-black uppercase shadow-xs border border-white/30">
              {candidate.primary_position}
            </span>
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                {candidate.first_name} {candidate.last_name}
              </h2>
              {isCandidateUpgraded && (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold flex items-center gap-1 shadow-2xs">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  Surclassé {candidateSurclassLabel ? `(${candidateSurclassLabel})` : ''}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-lg bg-primary/20 text-primary-foreground border border-primary/30 text-[10px] font-black uppercase tracking-wider">
                {candidate.pipeline_stage || 'Prospect'}
              </span>
              {candidate.reference_player_style && (
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-[10px] font-black flex items-center gap-1 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-indigo-300" />
                  Style : {candidate.reference_player_style}
                </span>
              )}
              {candidate.scout_state_decision === 'recruit_now' && (
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[10px] font-black flex items-center gap-1 shadow-2xs">
                  <Flame className="w-3 h-3 text-emerald-400" />
                  À recruter immédiatement
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
              <span className="flex items-center gap-1 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{candidate.current_club || 'Sans club'}</span>
              </span>
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {candidateAge ? `${candidateAge} ans` : ''} {candidate.birth_date ? `(${new Date(candidate.birth_date).getFullYear()})` : ''}
                </span>
              </span>
              {candidate.status && (
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-200 text-[10px] font-bold">
                  {candidate.status}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* BLOC 2 : SCOUT OMNIPRÉSENT & ACTIONS */}
        <div className="flex items-center gap-3 self-end md:self-center shrink-0">
          {/* Carte Scout Référent / Découvreur */}
          <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs p-2 sm:p-2.5 rounded-2xl border border-white/15 shadow-2xs">
            <ScoutAvatar
              scoutId={candidate.discovering_scout_id || latestEval?.evaluator_id}
              scoutName={candidate.discovering_scout_name || latestEval?.evaluator_name || 'Cellule Recrutement FUS'}
              scouts={scouts}
              size="md"
              className="ring-2 ring-white/30"
            />
            <div className="min-w-0 pr-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                Scout Référent
              </span>
              <span className="font-black text-white text-xs block truncate max-w-[130px] sm:max-w-[170px]">
                {candidate.discovering_scout_name || latestEval?.evaluator_name || 'Cellule Recrutement FUS'}
              </span>
              {(() => {
                const s = scouts.find(sc => sc.id === candidate.discovering_scout_id || sc.full_name?.toLowerCase().trim() === (candidate.discovering_scout_name || latestEval?.evaluator_name || '').toLowerCase().trim());
                return (
                  <span className="text-[10px] text-amber-300 font-semibold block truncate">
                    {s?.role_title || 'Scout Officiel FUS'}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Actions : Play Vidéo, Shortlist & Fermer */}
          <div className="flex items-center gap-1.5">
            {candidate.video_url && (
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(true)}
                className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/30 cursor-pointer transition-all shrink-0 active:scale-95"
                title="Visionner les séquences vidéo (Google Drive)"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Vidéo</span>
              </button>
            )}

            {onOpenDriveLink && (
              <button
                type="button"
                onClick={() => onOpenDriveLink(candidate)}
                className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 active:scale-95"
                title={candidate.video_url ? "Modifier le lien vidéo Google Drive" : "Ajouter un lien vidéo Google Drive"}
              >
                <Video className="w-3.5 h-3.5 text-emerald-400" />
                <span>{candidate.video_url ? 'Lien Drive' : '+ Lien Drive'}</span>
              </button>
            )}

            {onOpenEditCandidate && (
              <button
                type="button"
                onClick={() => onOpenEditCandidate(candidate)}
                className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 active:scale-95"
                title="Modifier les données du joueur"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                <span>Modifier Joueur</span>
              </button>
            )}

            {onDeleteCandidate && (
              <button
                type="button"
                onClick={() => onDeleteCandidate(candidate)}
                className="px-3.5 py-2 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 active:scale-95"
                title="Supprimer la fiche de ce joueur"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Supprimer</span>
              </button>
            )}

            {onUpdateCandidate && (() => {
              const isShortlisted = ['shortlisted', 'shortlist'].includes(candidate.pipeline_stage);
              return (
                <button
                  type="button"
                  onClick={async () => {
                    if (isShortlisted) {
                      if (!window.confirm(`Voulez-vous retirer ${candidate.first_name} ${candidate.last_name} de la shortlist ?`)) return;
                      try {
                        await onUpdateCandidate(candidate.id, { pipeline_stage: 'prospect' });
                        toast.success(`${candidate.first_name} ${candidate.last_name} retiré de la shortlist`);
                        if (onRefresh) onRefresh();
                      } catch (err) {
                        toast.error("Erreur lors du retrait de la shortlist");
                      }
                    } else {
                      try {
                        await onUpdateCandidate(candidate.id, { pipeline_stage: 'shortlisted' });
                        toast.success(`${candidate.first_name} ${candidate.last_name} ajouté à la shortlist`);
                        if (onRefresh) onRefresh();
                      } catch (err) {
                        toast.error("Erreur lors de l'ajout à la shortlist");
                      }
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-2xl border transition-all cursor-pointer shadow-2xs flex items-center justify-center shrink-0",
                    isShortlisted
                      ? "bg-amber-400 text-slate-900 border-amber-300 hover:bg-rose-500 hover:text-white hover:border-rose-400"
                      : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                  )}
                  title={isShortlisted ? "Retirer de la shortlist" : "Ajouter à la shortlist"}
                >
                  {isShortlisted ? (
                    <BookmarkCheck className="w-4 h-4" />
                  ) : (
                    <Bookmark className="w-4 h-4 text-slate-300" />
                  )}
                </button>
              );
            })()}

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/20 transition-colors cursor-pointer shadow-2xs shrink-0"
              title="Fermer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation Principale du Dossier (1. Scout, 2. État Civil & Contact, 3. Rapports) */}
      <div className="flex border-b bg-white px-6 overflow-x-auto gap-2 py-2.5 shrink-0">
        {[
          { id: 'scout', label: '1. Scout', icon: Compass },
          { id: 'personal', label: '2. État Civil & Contact', icon: User },
          { id: 'report', label: `3. Rapports (${candidateEvals.length})`, icon: FileText },
          { id: 'admin', label: `4. Dossier Administratif (${currentAdminDocs.length})`, icon: Briefcase },
        ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer",
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* TAB 1 : SCOUT */}
          {activeTab === 'scout' && (
            <div className="space-y-6 text-xs animate-in fade-in duration-200">
              {/* En-tête Scout Découvreur & Poste */}
              <div className="bg-slate-50/90 p-5 rounded-3xl border border-slate-200/90 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Informations de Détection & Scout</h4>
                      <p className="text-[11px] text-muted-foreground">Scout découvreur, recruteur référent, lieu et contexte de détection</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center gap-1.5 shadow-xs">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>{candidate.primary_position}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-bold text-xs uppercase border border-primary/20">
                      Priorité : {candidate.recommendation_priority || 'Standard'}
                    </span>

                    {onUpdateCandidate && (() => {
                      const isShortlisted = ['shortlisted', 'shortlist'].includes(candidate.pipeline_stage);
                      return (
                        <button
                          type="button"
                          onClick={async () => {
                            if (isShortlisted) {
                              if (!window.confirm(`Voulez-vous retirer ${candidate.first_name} ${candidate.last_name} de la shortlist ?`)) return;
                              try {
                                await onUpdateCandidate(candidate.id, { pipeline_stage: 'prospect' });
                                toast.success(`${candidate.first_name} ${candidate.last_name} retiré de la shortlist`);
                                if (onRefresh) onRefresh();
                              } catch (err) {
                                toast.error("Erreur lors du retrait de la shortlist");
                              }
                            } else {
                              try {
                                await onUpdateCandidate(candidate.id, { pipeline_stage: 'shortlisted' });
                                toast.success(`${candidate.first_name} ${candidate.last_name} ajouté à la shortlist`);
                                if (onRefresh) onRefresh();
                              } catch (err) {
                                toast.error("Erreur lors de l'ajout à la shortlist");
                              }
                            }
                          }}
                          className={cn(
                            "px-3 py-1 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer border",
                            isShortlisted
                              ? "bg-amber-100 hover:bg-rose-100 text-amber-900 hover:text-rose-900 border-amber-300 hover:border-rose-300 group"
                              : "bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border-slate-200 hover:border-amber-300"
                          )}
                          title={isShortlisted ? "Cliquer pour retirer ce joueur de la shortlist" : "Ajouter ce joueur à la shortlist"}
                        >
                          {isShortlisted ? (
                            <>
                              <BookmarkCheck className="w-3.5 h-3.5 text-amber-600 group-hover:hidden" />
                              <Trash2 className="w-3.5 h-3.5 text-rose-600 hidden group-hover:inline" />
                              <span className="group-hover:hidden">Dans la Shortlist</span>
                              <span className="hidden group-hover:inline">Retirer de la Shortlist</span>
                            </>
                          ) : (
                            <>
                              <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                              <span>Ajouter à la Shortlist</span>
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* Grille Données Scout & Détection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/70">
                    <span className="text-muted-foreground block text-[11px] mb-1.5 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-blue-600" /> Scout Découvreur (A)
                    </span>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ScoutAvatar
                        scoutId={candidate.discovering_scout_id}
                        scoutName={candidate.discovering_scout_name || latestEval?.evaluator_name || 'Cellule Recrutement FUS'}
                        scouts={scouts}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-black text-slate-900 text-sm block truncate">
                          {candidate.discovering_scout_name || latestEval?.evaluator_name || 'Cellule Recrutement FUS'}
                        </span>
                        {(() => {
                          const s = scouts.find(sc => sc.id === candidate.discovering_scout_id || sc.full_name?.toLowerCase().trim() === (candidate.discovering_scout_name || latestEval?.evaluator_name || '').toLowerCase().trim());
                          return s?.role_title ? (
                            <span className="text-[10px] text-slate-500 font-medium block truncate">
                              {s.role_title}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/70">
                    <span className="text-muted-foreground block text-[11px] mb-1.5 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-purple-600" /> Scout en Mission (B)
                    </span>
                    {(() => {
                      const discScout = candidate.discovering_scout_name || latestEval?.evaluator_name;
                      const assignedTo = candidate.assigned_scout_name || (candidate.active_mission ? candidate.active_mission.assigned_to_name : candidate.recruiter_name);
                      const assignedToId = candidate.assigned_scout_id || (candidate.active_mission ? candidate.active_mission.assigned_to_id : candidate.recruiter_id);
                      if (!assignedTo) return <span className="font-bold text-slate-400 text-sm block pt-1">Non assigné</span>;
                      if (discScout && assignedTo.trim().toLowerCase() === discScout.trim().toLowerCase()) {
                        return <span className="text-slate-500 font-medium text-xs block pt-1">Non délégué (Scout référent)</span>;
                      }
                      return (
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ScoutAvatar
                            scoutId={assignedToId}
                            scoutName={assignedTo}
                            scouts={scouts}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-black text-purple-950 text-sm block truncate">
                              {assignedTo}
                            </span>
                            <span className="text-[10px] text-purple-600 font-semibold block truncate">
                              En mission d'évaluation
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/70">
                    <span className="text-muted-foreground block text-[11px] mb-1 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-primary" /> Poste Détecté
                    </span>
                    <span className="font-black text-primary text-sm">
                      {candidate.primary_position}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/70">
                    <span className="text-muted-foreground block text-[11px] mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" /> Date de Détection
                    </span>
                    <span className="font-black text-slate-900 text-sm">
                      {candidate.discovery_date || 'Non renseignée'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/70">
                    <span className="text-muted-foreground block text-[11px] mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Lieu de Détection
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      {candidate.discovery_location || '-'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/70">
                    <span className="text-muted-foreground block text-[11px] mb-1 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-600" /> Match d'Observation
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      {candidate.discovery_match || '-'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/70">
                    <span className="text-muted-foreground block text-[11px] mb-1 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-600" /> Statut Actuel
                    </span>
                    <span className="font-bold text-slate-900 text-xs capitalize">
                      {candidate.status === 'selected' ? 'Retenu FUS' :
                       candidate.status === 'in_trial' ? 'En Essai / Test' :
                       candidate.status === 'rejected' ? 'Non Retenu' :
                       candidate.status === 'on_hold' ? 'En Réserve' : 'Inscrit'}
                    </span>
                  </div>
                </div>

                {/* Zones Géographiques Préférées / Rayon */}
                {candidate.preferred_locations && candidate.preferred_locations.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-muted-foreground block text-[11px] mb-2 font-bold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Zones Géographiques de Surveillance / Rayon de détection :
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {candidate.preferred_locations.map((loc, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-xl bg-white text-indigo-700 font-bold text-xs border border-indigo-200 shadow-2xs flex items-center gap-1.5"
                        >
                          <MapPin className="w-3 h-3 text-indigo-500" />
                          {loc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mission d'observation active */}
                {candidate.active_mission && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/90 to-indigo-50/70 border border-purple-200 shadow-2xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-200/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                          <Target className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-wider text-purple-900">
                            Mission d'Observation Active
                          </span>
                          <h4 className="font-black text-sm text-slate-900">
                            {candidate.active_mission.mission_title}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {candidate.active_mission.is_locked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs" title="Ordre de mission ordonné par la Direction (Scout Admin) - Non réassignable">
                            <Lock className="w-3 h-3 text-amber-700" />
                            Ordre Directionnel Verrouillé
                          </span>
                        )}
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                          candidate.active_mission.priority === 'urgent' ? "bg-red-100 text-red-700 border-red-300" :
                          candidate.active_mission.priority === 'high' ? "bg-amber-100 text-amber-800 border-amber-300" :
                          "bg-purple-100 text-purple-800 border-purple-300"
                        )}>
                          Priorité : {candidate.active_mission.priority || 'Normale'}
                        </span>
                        {candidate.active_mission.due_date && (
                          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1 bg-white/80 px-2.5 py-0.5 rounded-full border border-purple-200">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Échéance : {candidate.active_mission.due_date}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-white/90 p-3 rounded-xl border border-purple-100/80 space-y-1">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5 text-purple-600" /> Consignes de la mission (Scout B) :
                      </span>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {candidate.active_mission.mission_description || 'Observation générale des performances en match et à l’entraînement.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 pt-0.5">
                      <span>Scout assigné (B) : <strong className="text-purple-900 font-bold">{candidate.active_mission.assigned_to_name}</strong></span>
                      <span>Assigné par (A) : <strong className="text-slate-800 font-bold">{candidate.active_mission.assigned_by_name}</strong></span>
                      {candidate.active_mission.assigned_at && (
                        <span className="text-slate-400">Date : {new Date(candidate.active_mission.assigned_at).toLocaleDateString('fr-FR')}</span>
                      )}
                    </div>

                    {/* Statut d'accusé de réception */}
                    <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between">
                      {candidate.active_mission.acknowledged_at ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Accusé de réception validé le {new Date(candidate.active_mission.acknowledged_at).toLocaleDateString('fr-FR')} à {new Date(candidate.active_mission.acknowledged_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-2.5 py-1 rounded-lg animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>En attente d'accusé de réception par {candidate.active_mission.assigned_to_name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Historique des Missions d'Observation */}
                {candidate.mission_history && candidate.mission_history.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                    <span className="text-slate-800 block text-xs font-bold flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-purple-600" /> Historique des Missions d'Observation ({candidate.mission_history.length}) :
                    </span>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                      {candidate.mission_history.map((m, idx) => (
                        <div key={m.id || idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{m.mission_title}</span>
                            <span className={cn(
                              "px-2 py-0.2 rounded-md text-[9px] font-black uppercase",
                              m.status === 'completed' ? "bg-emerald-100 text-emerald-800" :
                              m.status === 'cancelled' ? "bg-slate-200 text-slate-700" :
                              "bg-purple-100 text-purple-800"
                            )}>
                              {m.status === 'completed' ? 'Terminée' : m.status === 'cancelled' ? 'Annulée' : 'En cours'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-2">
                            <span>Scout B : <strong className="text-slate-700">{m.assigned_to_name}</strong></span>
                            <span>•</span>
                            <span>Assigné par : <strong className="text-slate-700">{m.assigned_by_name}</strong></span>
                            {m.assigned_at && (
                              <>
                                <span>•</span>
                                <span>{new Date(m.assigned_at).toLocaleDateString('fr-FR')}</span>
                              </>
                            )}
                          </div>
                          {m.mission_description && (
                            <p className="text-[11px] text-slate-600 italic">
                              "{m.mission_description}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes & Recommandations Initiales du Scout */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <span className="text-slate-800 block text-xs font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" /> Notes & Recommandations Initiales du Scout Découvreur :
                  </span>
                  {candidate.scout_recommendation_notes ? (
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {candidate.scout_recommendation_notes}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Aucune note initiale laissée par le scout découvreur lors de la création du dossier.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* TAB : ÉVALUATIONS & SUIVI DANS LE TEMPS */}
          {activeTab === 'evaluations' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-primary" /> Historique des Évaluations & Suivi ({candidateEvals.length})
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Historique chronologique de toutes les sessions d'évaluation et de réévaluation du joueur.
                  </p>
                </div>
                {onOpenEvaluation && (
                  <button
                    type="button"
                    onClick={() => onOpenEvaluation({ mode: 'create' })}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Nouvelle Évaluation (Scout)</span>
                  </button>
                )}
              </div>

              {candidateEvals.length === 0 ? (
                <div className="py-12 px-6 text-center bg-white rounded-2xl border space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm">Aucune évaluation enregistrée</h5>
                    <p className="text-muted-foreground text-xs mt-1 max-w-md mx-auto">
                      Saisissez l'évaluation approfondie du joueur selon les 4 piliers adaptés à son poste ({candidate.primary_position}).
                    </p>
                  </div>
                  {onOpenEvaluation && (
                    <button
                      type="button"
                      onClick={() => onOpenEvaluation({ mode: 'create' })}
                      className="px-4 py-2 rounded-xl bg-primary text-white font-bold inline-flex items-center gap-2 text-xs hover:bg-primary/90 shadow-sm cursor-pointer"
                    >
                      <Award className="w-4 h-4" />
                      <span>Saisir l'Évaluation Approfondie</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Visualisation Radar de la dernière évaluation */}
                  {latestEval && (
                    <div className="bg-slate-50/70 rounded-3xl p-5 border border-slate-200/80 flex flex-col items-center">
                      <div className="w-full flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
                            <Sparkles className="w-4 h-4" />
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                              Visualisation Radar des Qualités (Dernière Évaluation)
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Profil complet sur les 4 piliers & compétences spécifiques du poste {candidate.primary_position}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-primary bg-primary/10 px-2.5 py-1 rounded-xl">
                            Moyenne : {Number(latestEval.overall_score).toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <div className="w-full">
                        <QualityPillarsBlock
                          report={latestEval}
                          positionCode={latestEval.position_evaluated || candidate.primary_position}
                          customPositionConfig={resolvePositionConfig(latestEval.position_evaluated || candidate.primary_position)}
                        />

                        {candidateEvals.length > 1 && (() => {
                          const first = candidateEvals[candidateEvals.length - 1];
                          const diff = Math.round((latestEval.overall_score - first.overall_score) * 10) / 10;
                          return (
                            <div className="w-full mt-2 p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] flex items-center justify-between">
                              <span className="text-slate-600 font-medium">
                                Suivi : {candidateEvals.length} sessions d'évaluation enregistrées
                              </span>
                              <span className={cn(
                                "font-black px-2 py-0.5 rounded-md flex items-center gap-1",
                                diff > 0 ? "bg-emerald-100 text-emerald-800" : diff < 0 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"
                              )}>
                                {diff > 0 ? <TrendingUp className="w-3 h-3" /> : diff < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                Progression : {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} pt
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                  {candidateEvals.map((ev, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div key={ev.id} className="p-4 rounded-2xl bg-white border shadow-sm space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                              isLatest ? "bg-primary text-white" : "bg-slate-200 text-slate-700"
                            )}>
                              {isLatest ? 'Dernière Réévaluation' : `Session #${candidateEvals.length - idx}`}
                            </span>
                            <span className="font-bold text-slate-800">{ev.evaluation_date}</span>
                            <span className="inline-flex items-center gap-1.5 text-muted-foreground text-xs">
                              <span>• Par</span>
                              <ScoutAvatar
                                scoutId={ev.evaluator_id}
                                scoutName={ev.evaluator_name}
                                role={ev.evaluator_role}
                                scouts={scouts}
                                size="xs"
                              />
                              <strong className="text-slate-800 font-semibold">{ev.evaluator_name}</strong>
                              <span className="text-[10px]">({ev.evaluator_role || 'Scout'})</span>
                            </span>
                            {ev.test_id && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 text-[10px]">
                                <Calendar className="w-3 h-3" />
                                Test lié : {ev.test_name || tests.find(t => t.id === ev.test_id)?.test_name || 'Session Planifiée'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-primary">{Number(ev.overall_score).toFixed(1)}</span>
                            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-slate-100 text-slate-800 border">
                              {ev.verdict.replace('_', ' ')}
                            </span>
                            {Boolean(onEditReport || onOpenEvaluation) && (!canEditEvaluation || canEditEvaluation(ev)) && (
                              <button
                                type="button"
                                onClick={() => onEditReport ? onEditReport(candidate, ev) : onOpenEvaluation?.({ mode: 'edit' })}
                                className="p-1 rounded-lg border hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors ml-1"
                                title="Modifier ce rapport (formulaire de rapport)"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                          <div className="p-2 rounded-xl bg-slate-50 border">
                            <span className="text-[10px] text-muted-foreground block font-semibold">⚽ Technique</span>
                            <span className="font-black text-slate-800">{Number(ev.technical_score).toFixed(1)}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 border">
                            <span className="text-[10px] text-muted-foreground block font-semibold">🏃 Physique</span>
                            <span className="font-black text-slate-800">{Number(ev.physical_score).toFixed(1)}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 border">
                            <span className="text-[10px] text-muted-foreground block font-semibold">🧭 Tactique</span>
                            <span className="font-black text-slate-800">{Number(ev.tactical_score).toFixed(1)}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 border">
                            <span className="text-[10px] text-muted-foreground block font-semibold">🧠 Mental</span>
                            <span className="font-black text-slate-800">{Number(ev.mental_score).toFixed(1)}</span>
                          </div>
                        </div>

                        {ev.strengths && (
                          <div className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-xl border space-y-0.5">
                            <strong className="block text-slate-900">Points Forts :</strong>
                            <RichTextView content={ev.strengths} />
                          </div>
                        )}
                        {ev.weaknesses && (
                          <div className="text-[11px] text-rose-800 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 space-y-0.5">
                            <strong className="block text-rose-900">Axes d'Amélioration :</strong>
                            <RichTextView content={ev.weaknesses} className="text-rose-900" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2 : ÉTAT CIVIL */}
          {activeTab === 'personal' && (
            <div className="space-y-6 text-xs">
              {/* 1. Carte Identité & État Civil */}
              <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Identité & État Civil du Joueur
                  </h4>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                    Catégorie : {candidate.age_category || 'U19'}
                  </span>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Photo officielle avec avatar */}
                  <div className="w-24 h-24 rounded-2xl border-2 border-slate-300 bg-white overflow-hidden shadow-xs flex items-center justify-center shrink-0">
                    {candidate.photo_url ? (
                      <img
                        src={candidate.photo_url}
                        alt={`${candidate.first_name} ${candidate.last_name}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <User className="w-10 h-10 text-slate-300" />
                    )}
                  </div>

                  {/* Grille informations personnelles */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 flex-1 w-full">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Prénom</span>
                      <span className="font-bold text-slate-900 text-sm">{candidate.first_name}</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Nom</span>
                      <span className="font-bold text-slate-900 text-sm">{candidate.last_name}</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Date de Naissance</span>
                      <span className="font-bold text-slate-900">
                        {candidate.birth_date || 'Non renseignée'}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Âge Actuel</span>
                      <span className="font-bold text-slate-900">
                        {calculateAge(candidate.birth_date) ? `${calculateAge(candidate.birth_date)} ans` : '-'}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Lieu de Naissance</span>
                      <span className="font-bold text-slate-900">{candidate.birth_place || 'Non renseigné'}</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Nationalité</span>
                      <span className="font-bold text-slate-900">{candidate.nationality || 'Marocaine'}</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Genre</span>
                      <span className="font-bold text-slate-900">{candidate.gender || 'Masculin'}</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Catégorie Officielle</span>
                      <span className="font-bold text-primary">{candidate.age_category || 'U19'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Coordonnées & Contact */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  Coordonnées de Contact Direct
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Téléphone du Joueur */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/60">
                    <span className="text-muted-foreground block text-[11px] mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" /> Téléphone Joueur
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      {candidate.phone || 'Non renseigné'}
                    </span>
                  </div>

                  {/* Téléphone du Représentant (parent, agent, autre) */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-200/60">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-indigo-900/80 block text-[11px] font-semibold flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-600" /> Téléphone Représentant
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-[10px] capitalize">
                        {candidate.guardian_relationship || 'Parent'}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 text-xs block">
                      {candidate.guardian_phone || 'Non renseigné'}
                    </span>
                    {(candidate.guardian_name || candidate.agent_name) && (
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        Nom : {candidate.guardian_name || candidate.agent_name}
                      </span>
                    )}
                  </div>

                  {/* Adresse Email */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/60">
                    <span className="text-muted-foreground block text-[11px] mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" /> Adresse Email
                    </span>
                    <span className="font-bold text-slate-900 text-xs truncate block">
                      {candidate.email || 'Non renseigné'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Domicile & Localisation */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  Adresse de Résidence & Localisation
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Adresse de Résidence</span>
                    <span className="font-bold text-slate-900">
                      {candidate.address || 'Non renseignée'}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Ville de Résidence</span>
                    <span className="font-bold text-slate-900">
                      {candidate.city || 'Non renseignée'}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Pays de Résidence</span>
                    <span className="font-bold text-slate-900">
                      {candidate.country || candidate.nationality || 'Maroc'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3 : RAPPORTS DE SCOUT (Rapport 1, Rapport 2... avec leurs 3 sous-onglets liés) */}
          {activeTab === 'report' && (
            <div className="space-y-6 text-xs animate-in fade-in duration-200">
              <div className="bg-slate-50/90 p-5 rounded-3xl border border-slate-200/90 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Rapports de Scout & Observations ({candidateEvals.length})
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Historique des séances d'observation. Consultez l'ensemble des analyses, données terrain et évaluations du scout en vue dashboard.
                      </p>
                    </div>
                  </div>

                  {Boolean(onAddReport || onOpenEvaluation) && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAddReport ? onAddReport(candidate) : onOpenEvaluation?.({ mode: 'create' })}
                        className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>+ Ajouter un rapport</span>
                      </button>
                    </div>
                  )}
                </div>

                {candidateEvals.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="text-muted-foreground text-xs max-w-sm mx-auto">
                      Aucun rapport de scout n'a encore été rédigé pour {candidate.first_name} {candidate.last_name}.
                    </p>
                    {Boolean(onAddReport || onOpenEvaluation) ? (
                      <button
                        type="button"
                        onClick={() => onAddReport ? onAddReport(candidate) : onOpenEvaluation?.({ mode: 'create' })}
                        className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary/90 transition-all inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Rédiger le Premier Rapport</span>
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Rapports en lecture seule (joueur non assigné à votre compte)</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Barre d'actions groupées pour les rapports */}
                    {Boolean((onDeleteReports || onDeleteReport) && deletableEvaluations.length > 0) && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedReportIds.length === deletableEvaluations.length) {
                                setSelectedReportIds([]);
                              } else {
                                setSelectedReportIds(deletableEvaluations.map(e => e.id));
                              }
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
                              selectedReportIds.length === deletableEvaluations.length
                                ? "bg-slate-900 text-white border-slate-900"
                                : selectedReportIds.length > 0
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                              selectedReportIds.length === deletableEvaluations.length && deletableEvaluations.length > 0
                                ? "bg-primary border-primary text-white"
                                : selectedReportIds.length > 0
                                ? "bg-primary/20 border-primary text-primary"
                                : "border-slate-300 bg-white"
                            )}>
                              {selectedReportIds.length === deletableEvaluations.length && deletableEvaluations.length > 0 && <Check className="w-3 h-3 stroke-[3]" />}
                              {selectedReportIds.length > 0 && selectedReportIds.length < deletableEvaluations.length && <div className="w-2 h-0.5 bg-primary rounded-full" />}
                            </div>
                            <span>
                              {selectedReportIds.length === deletableEvaluations.length
                                ? 'Tout désélectionner'
                                : 'Tout sélectionner (mes rapports)'}
                            </span>
                          </button>

                          {selectedReportIds.length > 0 && (
                            <span className="text-xs text-slate-600 font-medium bg-slate-100 px-2.5 py-1 rounded-lg">
                              <strong className="text-slate-900">{selectedReportIds.length}</strong> / {deletableEvaluations.length} sélectionné{selectedReportIds.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {selectedReportIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setIsBulkDeleteReportsModalOpen(true)}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer animate-in fade-in"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer la sélection ({selectedReportIds.length})</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Sélecteur horizontal des Rapports (Rapport 1, Rapport 2, etc.) */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                      {candidateEvals.map((ev, idx) => {
                        const reportNumber = candidateEvals.length - idx;
                        const isSelected = (currentSelectedReport?.id === ev.id) || (!selectedReportId && idx === 0);
                        const isChecked = selectedReportIds.includes(ev.id);
                        const title = ev.report_title || ev.test_name || `Rapport #${reportNumber}`;

                        return (
                          <div
                            key={ev.id}
                            className={cn(
                              "relative group rounded-2xl border transition-all shrink-0 flex items-center shadow-2xs overflow-hidden",
                              isSelected
                                ? "bg-slate-900 text-white border-slate-900 ring-2 ring-primary/30"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100/80",
                              isChecked && !isSelected && "border-rose-400 bg-rose-50/60 ring-1 ring-rose-300"
                            )}
                          >
                            {/* Checkbox de sélection multiple (uniquement si le rapport est supprimable) */}
                            {(!canDeleteEvaluation || canDeleteEvaluation(ev)) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReportIds(prev =>
                                    prev.includes(ev.id)
                                      ? prev.filter(id => id !== ev.id)
                                      : [...prev, ev.id]
                                  );
                                }}
                                title={isChecked ? "Désélectionner ce rapport" : "Sélectionner ce rapport pour action groupée"}
                                className="pl-3 pr-1 py-2.5 flex items-center justify-center cursor-pointer"
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                  isChecked
                                    ? "bg-rose-600 border-rose-600 text-white"
                                    : isSelected
                                    ? "border-slate-500 bg-slate-800 hover:border-slate-300"
                                    : "border-slate-300 bg-white hover:border-slate-400"
                                )}>
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </button>
                            )}

                            {/* Bouton pour visualiser le rapport */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReportId(ev.id);
                              }}
                              className="pr-3.5 py-2.5 text-left cursor-pointer flex items-center gap-2"
                            >
                              <div className={cn(
                                "w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0",
                                isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
                              )}>
                                #{reportNumber}
                              </div>
                              <div className="min-w-[120px]">
                                <p className={cn("text-xs font-black truncate max-w-[160px]", isSelected ? "text-white" : "text-slate-900")}>
                                  {title}
                                </p>
                                <div className={cn("text-[10px] flex items-center gap-1.5 mt-0.5", isSelected ? "text-slate-300" : "text-muted-foreground")}>
                                  <ScoutAvatar
                                    scoutId={ev.evaluator_id}
                                    scoutName={ev.evaluator_name}
                                    scouts={scouts}
                                    size="xs"
                                  />
                                  <span className="truncate max-w-[80px] font-medium">{ev.evaluator_name || 'Scout'}</span>
                                  <span>•</span>
                                  <strong className={cn("font-bold", isSelected ? "text-amber-300" : "text-slate-800")}>{ev.overall_score}/10</strong>
                                </div>
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Fiche détaillée du rapport sélectionné - Mode Dashboard (Cards Blanches sans sous-onglets) */}
                    {currentSelectedReport && (() => {
                      const rData = currentSelectedReport.report_data || {};
                      const dispDecision = rData.scout_state_decision || candidate.scout_state_decision;
                      const dispPosition = rData.primary_position || candidate.primary_position;
                      const dispSecondaryPosition = rData.secondary_position || candidate.secondary_position;
                      const dispCategory = rData.age_category || candidate.age_category || 'U19';
                      const dispClub = rData.current_club || candidate.current_club;
                      const dispPreviousClubs = rData.previous_clubs || candidate.previous_clubs;
                      const rawSurclass = (rData as any).surclassement || candidate.surclassement;
                      const dispIsUpgraded = Boolean(
                        rData.is_upgraded_category === true ||
                        candidate.is_upgraded_category === true ||
                        (rawSurclass && rawSurclass !== '0C' && rawSurclass !== 'Non' && rawSurclass !== 'non' && rawSurclass !== 'Non surclassé') ||
                        (rData.upgraded_categories_count && rData.upgraded_categories_count > 0) ||
                        (candidate.upgraded_categories_count && candidate.upgraded_categories_count > 0)
                      );

                      let count = rData.upgraded_categories_count || candidate.upgraded_categories_count;
                      if (!count && rawSurclass && typeof rawSurclass === 'string' && rawSurclass.startsWith('+')) {
                        const parsed = parseInt(rawSurclass.replace(/\D/g, ''), 10);
                        if (!isNaN(parsed)) count = parsed;
                      }
                      const dispUpgradedCount = count || 1;
                      const surclassementBadgeText = dispIsUpgraded 
                        ? (rawSurclass && typeof rawSurclass === 'string' && rawSurclass.startsWith('+') ? rawSurclass : `+${dispUpgradedCount}C`)
                        : '0C';
                      const dispStarter = rData.is_starter ?? candidate.is_starter ?? true;
                      const dispFormation = rData.team_formation || candidate.team_formation || '4-3-3';
                      const dispMinutes = rData.minutes_played ?? candidate.minutes_played ?? 0;
                      const dispGoals = rData.goals ?? candidate.goals ?? 0;
                      const dispAssists = rData.assists ?? candidate.assists ?? 0;
                      const dispSource = rData.information_source || candidate.information_source || 'terrain';
                      const dispSourcePerson = rData.information_source_person || candidate.information_source_person;
                      const dispVideoUrl = rData.video_url || candidate.video_url;

                      const matchObserved = rData.match_observed;
                      const obsStatus = rData.observation_status;

                      let statusMain = dispStarter ? 'Titulaire (XI)' : 'Remplaçant';
                      let statusDetail = '';
                      if (dispStarter) {
                        if (rData.is_full_match === false) {
                          statusDetail = `Sorti ${rData.sub_out_minute ? rData.sub_out_minute + 'e' : ''} (${rData.sub_out_half === '1st' ? '1ère MT' : '2ème MT'})`;
                        } else {
                          statusDetail = 'Match complet';
                        }
                      } else {
                        if (rData.has_subbed_in) {
                          statusDetail = `Entré ${rData.sub_in_minute ? rData.sub_in_minute + 'e' : ''} (${rData.sub_in_half === '1st' ? '1ère MT' : '2ème MT'})`;
                        } else {
                          statusDetail = 'Non entré';
                        }
                      }

                      const posCode = currentSelectedReport.position_evaluated || candidate.primary_position;
                      const posConfig = resolvePositionConfig(posCode);

                      const getPillarCriterionScore = (
                        criteriaScores: Record<string, number> | undefined,
                        critName: string,
                        pillarKeyStr: ScoutPillarKey,
                        fallbackScore: number
                      ): number => {
                        if (!criteriaScores) return Number(fallbackScore);
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

                        return Number(fallbackScore);
                      };

                      const pillarsConfig: Array<{
                        key: 'tech' | 'tact' | 'phys' | 'ment';
                        scoutKey: ScoutPillarKey;
                        label: string;
                        icon: React.ElementType;
                        score: number;
                        reportText?: string;
                        reportFallback: string;
                        badgeBg: string;
                        badgeText: string;
                        chartColor: string;
                      }> = [
                        {
                          key: 'tech',
                          scoutKey: 'technique',
                          label: 'Pilier Technique',
                          icon: Zap,
                          score: currentSelectedReport.technical_score ?? 0,
                          reportText: currentSelectedReport.tech_report,
                          reportFallback: 'Aucune observation technique détaillée renseignée.',
                          badgeBg: 'bg-primary/10 border-primary/20',
                          badgeText: 'text-primary',
                          chartColor: '#ef4444',
                        },
                        {
                          key: 'tact',
                          scoutKey: 'tactique',
                          label: 'Pilier Tactique',
                          icon: Target,
                          score: currentSelectedReport.tactical_score ?? 0,
                          reportText: currentSelectedReport.tact_report,
                          reportFallback: 'Aucune observation tactique détaillée renseignée.',
                          badgeBg: 'bg-blue-50 border-blue-200',
                          badgeText: 'text-blue-700',
                          chartColor: '#2563eb',
                        },
                        {
                          key: 'phys',
                          scoutKey: 'physique',
                          label: 'Pilier Physique',
                          icon: Flame,
                          score: currentSelectedReport.physical_score ?? 0,
                          reportText: currentSelectedReport.phys_report,
                          reportFallback: 'Aucune observation physique détaillée renseignée.',
                          badgeBg: 'bg-emerald-50 border-emerald-200',
                          badgeText: 'text-emerald-700',
                          chartColor: '#059669',
                        },
                        {
                          key: 'ment',
                          scoutKey: 'mental',
                          label: 'Pilier Mental',
                          icon: Compass,
                          score: currentSelectedReport.mental_score ?? 0,
                          reportText: currentSelectedReport.ment_report,
                          reportFallback: 'Aucune observation mentale détaillée renseignée.',
                          badgeBg: 'bg-purple-50 border-purple-200',
                          badgeText: 'text-purple-700',
                          chartColor: '#7c3aed',
                        },
                      ];

                      const radarChartOptions = {
                        maintainAspectRatio: false,
                        scales: {
                          r: {
                            suggestedMin: 0,
                            suggestedMax: 10,
                            ticks: { display: false, stepSize: 2 },
                            grid: { color: '#e2e8f0' },
                            angleLines: { color: '#e2e8f0' },
                            pointLabels: {
                              font: { size: 10, weight: 600 },
                              color: '#334155',
                            },
                          },
                        },
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (context: any) => ` ${context.label}: ${context.formattedValue} / 10`,
                            },
                          },
                        },
                      };

                      const getPillarChartData = (
                        pillarKeyStr: 'tech' | 'tact' | 'phys' | 'ment',
                        scoutKey: ScoutPillarKey,
                        criteria: string[],
                        color: string,
                        fallbackScore: number
                      ) => {
                        const scores = criteria.map((crit) =>
                          getPillarCriterionScore(currentSelectedReport.criteria_scores, crit, scoutKey, fallbackScore)
                        );
                        return {
                          labels: criteria.map((c) => parseCriterion(c).title),
                          datasets: [
                            {
                              label: pillarKeyStr.toUpperCase(),
                              data: scores,
                              backgroundColor: `${color}25`,
                              borderColor: color,
                              borderWidth: 2,
                              pointBackgroundColor: color,
                              pointBorderColor: '#ffffff',
                              pointHoverBackgroundColor: '#ffffff',
                              pointHoverBorderColor: color,
                              pointRadius: 3,
                              fill: true,
                            },
                          ],
                        };
                      };

                      const reportNumber = candidateEvals.length - candidateEvals.indexOf(currentSelectedReport);

                      return (
                        <div className="space-y-4">
                          {/* 1. Card Blanche : Synthèse & Informations Clés du Rapport (Sans redondance) */}
                          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                                  #{reportNumber}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h5 className="font-bold text-slate-900 text-sm sm:text-base">
                                      {currentSelectedReport.report_title ? currentSelectedReport.report_title : `Rapport d'observation #${reportNumber}`}
                                    </h5>
                                    {dispIsUpgraded && (
                                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                                        <TrendingUp className="w-3 h-3 text-emerald-600" />
                                        Surclassé ({surclassementBadgeText})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      {currentSelectedReport.evaluation_date}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <ScoutAvatar
                                        scoutId={currentSelectedReport.evaluator_id}
                                        scoutName={currentSelectedReport.evaluator_name}
                                        role={currentSelectedReport.evaluator_role}
                                        scouts={scouts}
                                        size="xs"
                                      />
                                      <span className="font-medium text-slate-700">{currentSelectedReport.evaluator_name || 'Scout FUS'}</span>
                                      {currentSelectedReport.evaluator_role && (
                                        <span className="text-slate-400 text-[11px]">({currentSelectedReport.evaluator_role})</span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 flex-wrap">
                                <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3.5 py-2 rounded-xl shadow-2xs">
                                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                  <span className="text-xs font-black">
                                    Note Globale : <span className="text-amber-400">{Number(currentSelectedReport.overall_score ?? 0).toFixed(1)}</span>
                                  </span>
                                </div>
                                <span className="px-3 py-2 rounded-xl bg-primary/10 text-primary font-black text-xs border border-primary/20 flex items-center gap-1.5 uppercase shadow-2xs">
                                  <Award className="w-3.5 h-3.5" />
                                  {currentSelectedReport.verdict ? currentSelectedReport.verdict.replace('_', ' ') : 'OBSERVÉ'}
                                </span>
                                {Boolean(onEditReport || onOpenEvaluation) && (!canEditEvaluation || (currentSelectedReport && canEditEvaluation(currentSelectedReport))) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onEditReport) {
                                        onEditReport(candidate, currentSelectedReport);
                                      } else if (onOpenEvaluation) {
                                        onOpenEvaluation({ mode: 'edit', testId: currentSelectedReport.test_id });
                                      }
                                    }}
                                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200"
                                    title="Modifier ce rapport"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                )}
                                {onDeleteReport && (!canDeleteEvaluation || (currentSelectedReport && canDeleteEvaluation(currentSelectedReport))) && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce rapport d'observation ?")) {
                                        await onDeleteReport(currentSelectedReport.id);
                                      }
                                    }}
                                    className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer border border-slate-200 hover:border-rose-200"
                                    title="Supprimer ce rapport"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                                {currentSelectedReport && canEditEvaluation && !canEditEvaluation(currentSelectedReport) && canDeleteEvaluation && !canDeleteEvaluation(currentSelectedReport) && (
                                  <span className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-semibold text-[11px] border border-slate-200 flex items-center gap-1.5" title="Ce rapport a été rédigé par un autre scout. Consultation en lecture seule.">
                                    <Lock className="w-3 h-3 text-slate-400" />
                                    <span>Lecture seule</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 2. Card Blanche : Observation Terrain & Contexte Match */}
                          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
                            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                              <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                                <FileSpreadsheet className="w-4 h-4" />
                              </div>
                              <div>
                                <h5 className="font-bold text-slate-900 text-sm">
                                  Observation Terrain & Contexte de Match
                                </h5>
                                <p className="text-[11px] text-muted-foreground">
                                  Dispositif tactique, statut de jeu et statistiques observées en direct
                                </p>
                              </div>
                            </div>

                            {/* Bannière Décision d'Observation, Poste & Surclassement */}
                            <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-700">Décision d'Observation :</span>
                                <span className={cn(
                                  "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs border",
                                  dispDecision === 'recruit_now'
                                    ? "bg-emerald-600 text-white border-emerald-700"
                                    : dispDecision === 'invitation_test'
                                    ? "bg-amber-500 text-white border-amber-600"
                                    : "bg-indigo-600 text-white border-indigo-700"
                                  )}>
                                  {dispDecision === 'recruit_now' && <Flame className="w-3.5 h-3.5" />}
                                  {dispDecision === 'invitation_test' && <Zap className="w-3.5 h-3.5" />}
                                  {(!dispDecision || dispDecision === 'to_follow') && <Eye className="w-3.5 h-3.5" />}
                                  <span>
                                    {dispDecision === 'recruit_now' ? 'À recruter immédiatement' :
                                     dispDecision === 'invitation_test' ? 'Invitation Test' : 'À suivre'}
                                  </span>
                                </span>

                                {obsStatus && (
                                  <span className={cn(
                                    "px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider border",
                                    obsStatus === 'already_seen'
                                      ? "bg-purple-100 text-purple-800 border-purple-200"
                                      : "bg-blue-100 text-blue-800 border-blue-200"
                                  )}>
                                    {obsStatus === 'already_seen' ? 'Déjà vu (Suivi)' : 'Vu (1ère observation)'}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-700">Poste :</span>
                                  <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 text-xs shadow-2xs">
                                    {dispPosition}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-700">Surclassement :</span>
                                  <span className={cn(
                                    "px-3 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border shadow-2xs",
                                    dispIsUpgraded
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-black"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  )}>
                                    <TrendingUp className={cn("w-3.5 h-3.5", dispIsUpgraded ? "text-emerald-600" : "text-slate-400")} />
                                    <span>{dispIsUpgraded ? `Surclassé (${surclassementBadgeText})` : 'Non surclassé (0C)'}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Match Observé Banner si renseigné */}
                            {matchObserved && (
                              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                                    <Trophy className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800/80 block">Match Observé</span>
                                    <span className="text-sm font-black text-slate-900">{matchObserved}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Grille des caractéristiques sportives */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                              <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-center">
                                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Poste Observé</span>
                                <span className="font-black text-slate-900 text-xs mt-1 block truncate">
                                  {dispPosition}
                                </span>
                              </div>

                              <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-center">
                                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Surclassement</span>
                                <span className={cn(
                                  "font-black text-xs mt-1 block truncate",
                                  dispIsUpgraded ? "text-emerald-700" : "text-slate-700"
                                )}>
                                  {dispIsUpgraded ? `Surclassé (${surclassementBadgeText})` : '0C (Non surclassé)'}
                                </span>
                              </div>

                              <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-center">
                                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Statut Match</span>
                                <span className="font-black text-slate-900 text-xs mt-1 block">
                                  {statusMain}
                                </span>
                                {statusDetail && (
                                  <span className="text-[10px] text-muted-foreground font-semibold block mt-0.5 truncate">
                                    {statusDetail}
                                  </span>
                                )}
                              </div>

                              <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-center">
                                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Formation</span>
                                <span className="font-black text-primary text-xs mt-1 block">
                                  {dispFormation}
                                </span>
                              </div>

                              <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-center">
                                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Club Observé</span>
                                <span className="font-black text-slate-900 text-xs mt-1 block truncate">
                                  {dispClub || 'Sans club'}
                                </span>
                              </div>

                              <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-center">
                                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Source Info</span>
                                <span className="font-bold text-slate-800 text-xs mt-1 block capitalize truncate">
                                  {dispSource.replace('_', ' ')}
                                </span>
                                {dispSourcePerson && (
                                  <span className="text-[10px] text-muted-foreground block mt-0.5 truncate">
                                    {dispSourcePerson}
                                  </span>
                                )}
                              </div>

                              <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-center">
                                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Lien Vidéo</span>
                                {dispVideoUrl ? (
                                  <a
                                    href={dispVideoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-bold text-primary hover:underline flex items-center justify-center gap-1 mt-1"
                                  >
                                    <Video className="w-3.5 h-3.5" />
                                    <span>Voir vidéo</span>
                                  </a>
                                ) : (
                                  <span className="text-xs text-muted-foreground mt-1 block italic">Aucune</span>
                                )}
                              </div>
                            </div>

                            {/* Statistiques Observées lors du Match */}
                            <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-2.5">
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Statistiques Observées lors du Match
                              </span>
                              <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                                  <span className="text-muted-foreground block text-[10px] font-bold uppercase">Temps de jeu</span>
                                  <span className="text-base font-black text-slate-900">{dispMinutes} min</span>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                                  <span className="text-muted-foreground block text-[10px] font-bold uppercase">Buts marqués</span>
                                  <span className="text-base font-black text-emerald-600">{dispGoals}</span>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                                  <span className="text-muted-foreground block text-[10px] font-bold uppercase">Passes décisives</span>
                                  <span className="text-base font-black text-blue-600">{dispAssists}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 3. Card Blanche : Évaluation des Qualités par Pilier (4 Blocs en Grille 2 sur 2 avec Prise de Note intégrée) */}
                          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
                            {/* En-tête Général */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                                  <Star className="w-4 h-4 fill-amber-500" />
                                </div>
                                <div>
                                  <h5 className="font-bold text-slate-900 text-sm sm:text-base">
                                    Évaluation des Qualités par Pilier
                                  </h5>
                                  <p className="text-[11px] text-muted-foreground">
                                    Notes par pilier et critères spécifiques du poste ({posConfig?.code || dispPosition}) avec prise de note au-dessous de chaque pilier
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Moyenne Globale :</span>
                                <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-black text-xs shadow-2xs">
                                  {Number(currentSelectedReport.overall_score ?? 0).toFixed(1)} / 10
                                </span>
                              </div>
                            </div>

                            {/* Grille 4 Blocs (2 sur 2) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                              {pillarsConfig.map((pillar) => {
                                const pillarCriteria = (posConfig?.criteria?.[pillar.scoutKey] || [])
                                  .map((c: any) => typeof c === 'string' ? c : c?.label || c?.name || '')
                                  .filter(Boolean);
                                const isRadar = pillarViewModes[pillar.key] === 'radar';

                                return (
                                  <div
                                    key={pillar.key}
                                    className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all shadow-2xs"
                                  >
                                    <div className="space-y-3.5">
                                      {/* Header du Pilier */}
                                      <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                                        <div className="flex items-center gap-2.5">
                                          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center font-bold shadow-2xs", pillar.badgeBg, pillar.badgeText)}>
                                            <pillar.icon className="w-4 h-4" />
                                          </div>
                                          <div>
                                            <h6 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                              {pillar.label}
                                            </h6>
                                            <span className="text-[10px] text-muted-foreground font-medium">
                                              {pillarCriteria.length} critères évalués
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          {/* Toggle Barres / Radar */}
                                          <div className="inline-flex p-0.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                                            <button
                                              type="button"
                                              onClick={() => setPillarViewModes(prev => ({ ...prev, [pillar.key]: 'bars' }))}
                                              className={cn(
                                                "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                                                !isRadar ? "bg-slate-900 text-white shadow-2xs" : "text-slate-500 hover:text-slate-800"
                                              )}
                                              title="Afficher les barres de critères"
                                            >
                                              Barres
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setPillarViewModes(prev => ({ ...prev, [pillar.key]: 'radar' }))}
                                              className={cn(
                                                "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                                                isRadar ? "bg-slate-900 text-white shadow-2xs" : "text-slate-500 hover:text-slate-800"
                                              )}
                                              title="Afficher le radar"
                                            >
                                              Radar
                                            </button>
                                          </div>

                                          {/* Note moyenne du pilier */}
                                          <span className={cn("px-2.5 py-1 rounded-xl font-black text-xs border shadow-2xs", pillar.badgeBg, pillar.badgeText)}>
                                            {Number(pillar.score).toFixed(1)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Corps : Radar OU Barres de progression des critères */}
                                      {isRadar ? (
                                        <div className="h-56 w-full relative bg-white rounded-xl border border-slate-200/80 p-2 flex items-center justify-center">
                                          <Radar
                                            data={getPillarChartData(pillar.key, pillar.scoutKey, pillarCriteria, pillar.chartColor, pillar.score)}
                                            options={radarChartOptions}
                                          />
                                        </div>
                                      ) : (
                                        <div className="space-y-2.5">
                                          {pillarCriteria.map((critName) => {
                                            const { title, detail } = parseCriterion(critName);
                                            const numScore = getPillarCriterionScore(currentSelectedReport.criteria_scores, critName, pillar.scoutKey, pillar.score);
                                            const percentage = Math.min(100, Math.max(0, (numScore / 10) * 100));
                                            const tooltipKey = `${pillar.key}-${critName}`;
                                            const isTooltipOpen = activeTooltip === tooltipKey;

                                            return (
                                              <div
                                                key={critName}
                                                className="p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 shadow-2xs transition-all relative"
                                              >
                                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                                                    <span className="text-xs font-bold text-slate-800 truncate" title={title}>
                                                      {title}
                                                    </span>
                                                    {detail && (
                                                      <div className="relative inline-flex items-center shrink-0">
                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveTooltip(isTooltipOpen ? null : tooltipKey);
                                                          }}
                                                          onMouseEnter={() => setActiveTooltip(tooltipKey)}
                                                          onMouseLeave={() => setActiveTooltip(null)}
                                                          className="text-slate-400 hover:text-primary transition-colors cursor-pointer p-0.5 rounded-full hover:bg-slate-100"
                                                          title={detail}
                                                          aria-label={`Détails pour ${title}: ${detail}`}
                                                        >
                                                          <Info className="w-3.5 h-3.5" />
                                                        </button>
                                                        {isTooltipOpen && (
                                                          <div
                                                            className="absolute left-0 top-full mt-1.5 z-50 w-64 sm:w-72 p-2.5 bg-slate-900/95 backdrop-blur-md text-white text-xs leading-relaxed rounded-2xl shadow-2xl border border-slate-700 pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
                                                            onMouseEnter={() => setActiveTooltip(tooltipKey)}
                                                            onMouseLeave={() => setActiveTooltip(null)}
                                                          >
                                                            <div className="flex items-center justify-between gap-2 mb-1 border-b border-slate-800 pb-1">
                                                              <span className="font-bold text-[10px] text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                                                <Info className="w-3 h-3 text-amber-400" />
                                                                {title}
                                                              </span>
                                                              <span className="text-[10px] text-slate-400 font-medium">Précisions</span>
                                                            </div>
                                                            <p className="text-slate-200 text-[11px] font-normal leading-relaxed">
                                                              {detail}
                                                            </p>
                                                            <div className="absolute left-2.5 bottom-full w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-900" />
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>

                                                  <span
                                                    className={cn(
                                                      "font-black text-xs px-2 py-0.5 rounded-lg border shrink-0",
                                                      numScore >= 8
                                                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                                        : numScore >= 6
                                                        ? "text-blue-700 bg-blue-50 border-blue-200"
                                                        : numScore >= 4
                                                        ? "text-amber-700 bg-amber-50 border-amber-200"
                                                        : "text-rose-700 bg-rose-50 border-rose-200"
                                                    )}
                                                  >
                                                    {numScore.toFixed(1)}
                                                  </span>
                                                </div>

                                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                  <div
                                                    className={cn(
                                                      "h-full rounded-full transition-all duration-500",
                                                      numScore >= 8
                                                        ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                                                        : numScore >= 6
                                                        ? "bg-blue-600 shadow-xs shadow-blue-500/50"
                                                        : numScore >= 4
                                                        ? "bg-amber-500 shadow-xs shadow-amber-500/50"
                                                        : "bg-rose-500 shadow-xs shadow-rose-500/50"
                                                    )}
                                                    style={{ width: `${percentage}%` }}
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>

                                    {/* Prise de note au-dessous de chaque pilier */}
                                    <div className="pt-3 border-t border-slate-200/80 space-y-2 mt-auto">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                                          <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                                          Prise de note — {pillar.label}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-semibold">Commentaire scout</span>
                                      </div>
                                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs min-h-[64px]">
                                        <RichTextView
                                          content={pillar.reportText}
                                          fallback={pillar.reportFallback}
                                          className="text-slate-800 text-xs"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 5. Card Blanche : Analyse & Recommandations du Recruteur */}
                          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-2xl bg-primary text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
                                  <FileText className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <h5 className="font-bold text-slate-900 text-sm">
                                    Analyse & Recommandations du Recruteur
                                  </h5>
                                  <p className="text-[11px] text-muted-foreground">
                                    Bilan synthétique, points forts, axes de progression et projection FUS
                                  </p>
                                </div>
                              </div>
                              <span className="px-3 py-1 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider">
                                Verdict : {currentSelectedReport.verdict ? currentSelectedReport.verdict.replace('_', ' ') : 'OBSERVÉ'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                              {/* Points Forts (Blanc & Noir avec accent Rouge FUS) */}
                              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-2 hover:border-slate-300 transition-colors">
                                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                                  <div className="flex items-center gap-1.5 text-slate-900 font-black text-xs uppercase tracking-wider">
                                    <Zap className="w-4 h-4 text-primary" />
                                    <span>Points Forts</span>
                                  </div>
                                  <span className="w-2 h-2 rounded-full bg-primary" />
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-200/80 min-h-[85px]">
                                  <RichTextView
                                    content={currentSelectedReport.strengths}
                                    fallback="Aucun point fort spécifique renseigné."
                                    className="text-slate-800"
                                  />
                                </div>
                              </div>

                              {/* Axes de Progression (Blanc & Noir avec accent Slate-900) */}
                              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-2 hover:border-slate-300 transition-colors">
                                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                                  <div className="flex items-center gap-1.5 text-slate-900 font-black text-xs uppercase tracking-wider">
                                    <Target className="w-4 h-4 text-slate-700" />
                                    <span>Axes de Progression</span>
                                  </div>
                                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-200/80 min-h-[85px]">
                                  <RichTextView
                                    content={currentSelectedReport.weaknesses}
                                    fallback="Aucun axe d'amélioration spécifique renseigné."
                                    className="text-slate-800"
                                  />
                                </div>
                              </div>

                              {/* Projection FUS (Noir & Rouge) */}
                              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 shadow-xs">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                  <div className="flex items-center gap-1.5 text-white font-black text-xs uppercase tracking-wider">
                                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                    <span>Projection FUS</span>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-slate-300 uppercase">
                                    Futur Club
                                  </span>
                                </div>
                                <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 min-h-[85px]">
                                  <RichTextView
                                    content={currentSelectedReport.projection}
                                    fallback="Aucune projection spécifique renseignée."
                                    className="text-slate-100"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ONGLET 4 : DOSSIER ADMINISTRATIF & CONTRAT */}
          {activeTab === 'admin' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <AdministrativeDossierForm
                documents={currentAdminDocs}
                onDocumentsChange={handleDocsChange}
                contractType={currentContractType}
                onContractTypeChange={handleContractTypeChange}
                adminNotes={currentAdminNotes}
                onAdminNotesChange={handleAdminNotesChange}
              />
            </div>
          )}
        </div>

        {/* Modal Lecteur Vidéo Détection Google Drive */}
        {isVideoModalOpen && (
          <PlayerVideoModal
            isOpen={isVideoModalOpen}
            onClose={() => setIsVideoModalOpen(false)}
            candidate={candidate}
          />
        )}

        {/* Modal Footer with Squad Integration Action */}
        <div className="p-4 border-t bg-slate-50 flex items-center justify-end">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isPage ? '← Retour à la liste' : 'Fermer'}
            </button>
          </div>
        </div>

        {/* Modal de Confirmation de Suppression Multiple des Rapports */}
        {isBulkDeleteReportsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center shadow-xs">
                  <Trash2 className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900">
                    Supprimer {selectedReportIds.length} rapport{selectedReportIds.length > 1 ? 's' : ''} ?
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Vous êtes sur le point de supprimer définitivement <strong className="text-slate-900">{selectedReportIds.length} rapport{selectedReportIds.length > 1 ? 's' : ''} d'observation</strong> pour le joueur <strong className="text-slate-900">{candidate.first_name} {candidate.last_name}</strong>.
                  </p>
                  <p className="text-[11px] text-rose-600 font-semibold pt-1">
                    ⚠️ Cette action est irréversible et effacera toutes les notes et observations associées.
                  </p>
                </div>

                {/* Liste des rapports sélectionnés */}
                <div className="max-h-40 overflow-y-auto rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-left space-y-2 custom-scrollbar">
                  {candidateEvals
                    .filter(e => selectedReportIds.includes(e.id))
                    .map((ev) => (
                      <div key={ev.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 last:border-0">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-slate-700">#{candidateEvals.length - candidateEvals.indexOf(ev)}</span>
                          <span className="truncate font-medium text-slate-900">{ev.report_title || ev.test_name || 'Rapport sans titre'}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{ev.evaluation_date}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeletingReports}
                  onClick={() => setIsBulkDeleteReportsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isDeletingReports}
                  onClick={async () => {
                    setIsDeletingReports(true);
                    try {
                      const validIds = selectedReportIds.filter(id => {
                        const ev = candidateEvals.find(e => e.id === id);
                        return !canDeleteEvaluation || (ev && canDeleteEvaluation(ev));
                      });
                      if (validIds.length === 0) {
                        toast.error("Aucun rapport supprimable sélectionné.");
                        return;
                      }
                      if (onDeleteReports) {
                        await onDeleteReports(validIds);
                      } else if (onDeleteReport) {
                        for (const id of validIds) {
                          await onDeleteReport(id);
                        }
                      } else {
                        await recruitmentService.deleteEvaluations(validIds);
                        toast.success(`${validIds.length} rapport(s) supprimé(s) avec succès !`);
                        if (onRefresh) onRefresh();
                      }

                      const deletedSet = new Set(selectedReportIds);
                      setSelectedReportIds([]);
                      setIsBulkDeleteReportsModalOpen(false);
                      if (deletedSet.has(selectedReportId)) {
                        setSelectedReportId('');
                      }
                    } catch (err: any) {
                      console.error("Erreur suppression rapports:", err);
                      toast.error(err?.message || "Erreur lors de la suppression des rapports");
                    } finally {
                      setIsDeletingReports(false);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isDeletingReports ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Suppression...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirmer la suppression ({selectedReportIds.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );

  if (isPage) {
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        {cardContent}

        {/* Modal Officiel de Consultation / Modification de Club Adversaire */}
        {isOpponentModalOpen && (
          <OpponentClubFormModal
            isOpen={isOpponentModalOpen}
            onClose={() => {
              setIsOpponentModalOpen(false);
              setSelectedOpponentClub(null);
            }}
            club={selectedOpponentClub}
            initialName={candidate.current_club || ''}
          />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 overflow-y-auto">
      {cardContent}

      {/* Modal Officiel de Consultation / Modification de Club Adversaire */}
      {isOpponentModalOpen && (
        <OpponentClubFormModal
          isOpen={isOpponentModalOpen}
          onClose={() => {
            setIsOpponentModalOpen(false);
            setSelectedOpponentClub(null);
          }}
          club={selectedOpponentClub}
          initialName={candidate.current_club || ''}
        />
      )}
    </div>
  );
};
export default CandidateDetailModal;
