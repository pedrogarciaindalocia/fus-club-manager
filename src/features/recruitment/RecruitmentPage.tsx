import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users, Calendar, Swords, Plus, Search, Filter,
  Sparkles, Award, Shield, Footprints, ChevronRight,
  TrendingUp, Trash2, Edit3, CheckCircle2, Clock, AlertCircle,
  Eye, FileText, UserCheck, LayoutList, Kanban, HeartHandshake, Briefcase, User, RotateCcw, X, Lock, MapPin, Trophy, Crown,
  Sliders
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '../../context/PermissionsContext';
import { useRecruitment, RECRUITMENT_KEYS } from './hooks/useRecruitment';
import type {
  TrialCandidate,
  CandidateEvaluation,
  PlayerTest,
  Scout,
  ScoutObservation
} from './types/recruitment';
import { RECRUITMENT_AGE_CATEGORIES } from './types/recruitment';
import { PLAYER_POSITIONS } from '../../constants';

// Subcomponents
import CandidateModal from './components/CandidateModal';
import EvaluationModal from './components/EvaluationModal';
import TrialSessionModal from './components/TrialSessionModal';
import TestCalendarView from './components/TestCalendarView';
import ObservationModal from './components/ObservationModal';
import CandidateDetailModal from './components/CandidateDetailModal';
import RecruitmentPipelineKanban from './components/RecruitmentPipelineKanban';
import ScoutManagementView from './components/ScoutManagementView';
import RadarComparisonView from './components/RadarComparisonView';
import ShortlistPitchView from './components/ShortlistPitchView';
import PlayerRadarChart from './components/PlayerRadarChart';
import RecruitmentResetModal from './components/RecruitmentResetModal';
import ScoutCriteriaManagerModal from './components/ScoutCriteriaManagerModal';
import { cn } from '../../lib/utils';

const PIPELINE_STAGE_OPTIONS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'Toutes les étapes' },
  { id: 'prospect', label: '1. Prospects' },
  { id: 'scouted', label: '2. Observés' },
  { id: 'recommended', label: '3. Recommandés' },
  { id: 'screening', label: '4. Présélection' },
  { id: 'shortlisted', label: '5. Shortlistés' },
  { id: 'test_scheduled', label: '6. Test Planifié' },
  { id: 'test_completed', label: '7. Test Réalisé' },
  { id: 'under_evaluation', label: '8. Évaluation Club' },
  { id: 'signed', label: '9. Décision & Signés' },
  { id: 'rejected', label: '10. Sorties & Archives' },
];

const FOOT_OPTIONS = [
  { id: 'ALL', label: 'Tous les pieds' },
  { id: 'Droitier', label: 'Droitier' },
  { id: 'Gaucher', label: 'Gaucher' },
  { id: 'Ambidextre', label: 'Ambidextre' },
];

const VERDICT_OPTIONS = [
  { id: 'ALL', label: 'Tous les verdicts' },
  { id: 'contract_proposal', label: '🔥 Contrat / Signature Pro' },
  { id: 'recommend_academy', label: '⭐ Intégrer Académie' },
  { id: 'shortlist', label: '📋 Shortlist Prioritaire' },
  { id: 'additional_test', label: '⏱️ Test Additionnel' },
  { id: 'monitor', label: '🔍 Suivre en Matchs' },
  { id: 'reject', label: '❌ Non Retenu' },
];

export const RecruitmentPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { authState } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'scouts';

  const {
    scouts,
    candidates,
    isLoadingCandidates,
    tests,
    isLoadingTests,
    evaluations,
    isLoadingEvaluations,
    observations,
    timeline,
    createScout,
    updateScout,
    deleteScout,
    createCandidate,
    updateCandidate,
    updatePipelineStage,
    deleteCandidate,
    createTest,
    updateTest,
    deleteTest,
    saveEvaluation,
    deleteEvaluation,
    createObservation,
    resetRecruitmentData
  } = useRecruitment();

  const todayStr = new Date().toLocaleDateString('en-CA');

  // Modals state
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<TrialCandidate | null>(null);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [evaluatingCandidate, setEvaluatingCandidate] = useState<TrialCandidate | null>(null);
  const [evaluationInitialMode, setEvaluationInitialMode] = useState<'create' | 'reevaluate' | 'edit'>('create');
  const [evaluationInitialTestId, setEvaluationInitialTestId] = useState<string | undefined>(undefined);
  const [isObservationModalOpen, setIsObservationModalOpen] = useState(false);
  const [observingCandidate, setObservingCandidate] = useState<TrialCandidate | null>(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<PlayerTest | null>(null);
  const [schedulingCandidate, setSchedulingCandidate] = useState<TrialCandidate | null>(null);
  const [newTestDefaultDate, setNewTestDefaultDate] = useState<string | undefined>(undefined);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailCandidate, setDetailCandidate] = useState<TrialCandidate | null>(null);
  const [selectedRadarTestId, setSelectedRadarTestId] = useState<string>('latest');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isCriteriaManagerOpen, setIsCriteriaManagerOpen] = useState(false);
  const isSuperAdmin = Boolean(
    (authState?.roles ?? []).includes('super_admin') ||
    authState?.user?.system_role?.toLowerCase() === 'super_admin' ||
    authState?.user?.system_role?.toLowerCase() === 'admin'
  );

  const handleOpenScheduleTestForCandidate = (cand: TrialCandidate, defaultDate?: string) => {
    setEditingTest(null);
    setSchedulingCandidate(cand);
    setNewTestDefaultDate(defaultDate || todayStr);
    setIsSessionModalOpen(true);
  };

  // Filtre unique complet transversal multi-critères
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('U13');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [footFilter, setFootFilter] = useState('ALL');
  const [verdictFilter, setVerdictFilter] = useState('ALL');
  const [bestScorePerPositionFilter, setBestScorePerPositionFilter] = useState(false);

  const isAnyFilterActive = Boolean(
    searchQuery.trim() ||
    categoryFilter !== 'U13' ||
    positionFilter !== 'ALL' ||
    stageFilter !== 'ALL' ||
    footFilter !== 'ALL' ||
    verdictFilter !== 'ALL' ||
    bestScorePerPositionFilter
  );

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setCategoryFilter('U13');
    setPositionFilter('ALL');
    setStageFilter('ALL');
    setFootFilter('ALL');
    setVerdictFilter('ALL');
    setBestScorePerPositionFilter(false);
  };

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // KPIs
  const totalProspects = candidates.length;
  const inEvaluationCount = candidates.filter(c => ['test_scheduled', 'test_completed', 'under_evaluation'].includes(c.pipeline_stage)).length;
  const signedCount = candidates.filter(c => ['signed', 'academy', 'shortlisted'].includes(c.pipeline_stage)).length;
  const activeScoutsCount = scouts.filter(s => s.status === 'active').length;

  // 1. Filtrage complet des candidats (s'applique au Kanban, Fiches Joueurs & Tuteurs, et Comparateur)
  const filteredCandidates = React.useMemo(() => {
    const list = candidates.filter((c) => {
      // Catégorie d'âge
      if (categoryFilter !== 'ALL' && c.age_category !== categoryFilter) {
        return false;
      }

      // Poste de jeu
      if (positionFilter !== 'ALL') {
        const rawPos = (c.primary_position || '').toUpperCase();
        if (!rawPos.includes(positionFilter.toUpperCase())) {
          return false;
        }
      }

      // Étape pipeline
      if (stageFilter !== 'ALL') {
        if (stageFilter === 'signed') {
          if (!['signed', 'final_decision', 'academy'].includes(c.pipeline_stage)) return false;
        } else if (stageFilter === 'rejected') {
          if (!['rejected', 'archived'].includes(c.pipeline_stage) && c.status !== 'rejected') return false;
        } else if (c.pipeline_stage !== stageFilter) {
          return false;
        }
      }

      // Pied fort
      if (footFilter !== 'ALL' && c.preferred_foot !== footFilter) {
        return false;
      }

      // Verdict d'évaluation
      if (verdictFilter !== 'ALL') {
        const candEval = evaluations.find(e => e.candidate_id === c.id);
        if (!candEval || candEval.verdict !== verdictFilter) {
          return false;
        }
      }

      // Recherche textuelle multi-champs
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        const club = (c.current_club || '').toLowerCase();
        const originClub = (c.origin_club || '').toLowerCase();
        const position = (c.primary_position || '').toLowerCase();
        const country = `${c.nationality || ''} ${c.country || ''} ${c.city || ''}`.toLowerCase();
        const ageCategory = (c.age_category || '').toLowerCase();
        const scout = (c.discovering_scout_name || '').toLowerCase();
        const recruiter = (c.recruiter_name || '').toLowerCase();
        const stage = (c.pipeline_stage || '').toLowerCase();

        const matches = (
          fullName.includes(q) ||
          club.includes(q) ||
          originClub.includes(q) ||
          position.includes(q) ||
          country.includes(q) ||
          ageCategory.includes(q) ||
          scout.includes(q) ||
          recruiter.includes(q) ||
          stage.includes(q)
        );
        if (!matches) return false;
      }

      return true;
    });

    // Filtre Optionnel : Garder uniquement le meilleur score de la dernière évaluation par poste
    if (bestScorePerPositionFilter) {
      const bestMap = new Map<string, { candidate: TrialCandidate; score: number; evalDate: string }>();

      list.forEach(c => {
        const pos = (c.primary_position || 'AUTRE').toUpperCase().trim();
        const candEvals = evaluations
          .filter(e => e.candidate_id === c.id)
          .sort((a, b) => new Date(b.evaluation_date).getTime() - new Date(a.evaluation_date).getTime());
        const latestEval = candEvals[0];
        const score = latestEval ? latestEval.overall_score : -1;
        const evalDate = latestEval ? latestEval.evaluation_date : '';

        const current = bestMap.get(pos);
        if (!current || score > current.score || (score === current.score && evalDate > current.evalDate)) {
          bestMap.set(pos, { candidate: c, score, evalDate });
        }
      });

      return Array.from(bestMap.values()).map(v => v.candidate);
    }

    return list;
  }, [candidates, evaluations, searchQuery, categoryFilter, positionFilter, stageFilter, footFilter, verdictFilter, bestScorePerPositionFilter]);

  // 2. Filtrage complet des observations
  const filteredObservations = React.useMemo(() => {
    const candidateIds = new Set(filteredCandidates.map(c => c.id));
    return observations.filter(obs => {
      const isCandidateMatched = candidateIds.has(obs.candidate_id);

      if ((categoryFilter !== 'ALL' || positionFilter !== 'ALL' || stageFilter !== 'ALL' || footFilter !== 'ALL' || verdictFilter !== 'ALL') && !isCandidateMatched) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cand = candidates.find(c => c.id === obs.candidate_id);
        const candName = cand ? `${cand.first_name} ${cand.last_name}`.toLowerCase() : '';
        const matchName = (obs.match_name || '').toLowerCase();
        const compName = (obs.competition_name || '').toLowerCase();
        const scoutName = (obs.scout_name || '').toLowerCase();
        const impression = (obs.general_impression || '').toLowerCase();
        const matchesText = (
          candName.includes(q) ||
          matchName.includes(q) ||
          compName.includes(q) ||
          scoutName.includes(q) ||
          impression.includes(q)
        );
        if (!matchesText && !isCandidateMatched) return false;
      }

      return true;
    });
  }, [observations, filteredCandidates, candidates, searchQuery, categoryFilter, positionFilter, stageFilter, footFilter, verdictFilter]);

  // 3. Filtrage complet des tests (Planning des Tests)
  const filteredTests = React.useMemo(() => {
    const candidateIds = new Set(filteredCandidates.map(c => c.id));
    return tests.filter(t => {
      if (categoryFilter !== 'ALL' && t.age_category !== categoryFilter) {
        return false;
      }

      if (t.candidate_id) {
        if (!candidateIds.has(t.candidate_id)) return false;
      } else {
        if (positionFilter !== 'ALL' || footFilter !== 'ALL' || stageFilter !== 'ALL' || verdictFilter !== 'ALL') {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const testName = (t.test_name || '').toLowerCase();
        const location = (t.location || '').toLowerCase();
        const targetTeam = (t.target_team || '').toLowerCase();
        const cand = candidates.find(c => c.id === t.candidate_id);
        const candName = cand ? `${cand.first_name} ${cand.last_name}`.toLowerCase() : '';

        const matches = (
          testName.includes(q) ||
          location.includes(q) ||
          targetTeam.includes(q) ||
          candName.includes(q)
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [tests, filteredCandidates, candidates, categoryFilter, positionFilter, stageFilter, footFilter, verdictFilter, searchQuery]);

  // 4. Filtrage complet des évaluations
  const filteredEvaluations = React.useMemo(() => {
    const candidateIds = new Set(filteredCandidates.map(c => c.id));
    return evaluations.filter(ev => {
      if (!candidateIds.has(ev.candidate_id)) return false;
      if (verdictFilter !== 'ALL' && ev.verdict !== verdictFilter) return false;
      return true;
    });
  }, [evaluations, filteredCandidates, verdictFilter]);

  // 5. Joueurs uniques évalués (dédoublonnés par joueur)
  const evaluatedCandidates = React.useMemo(() => {
    const map = new Map<string, {
      candidate: TrialCandidate;
      latestEval: CandidateEvaluation;
      evalCount: number;
    }>();

    filteredEvaluations.forEach(ev => {
      const cand = candidates.find(c => c.id === ev.candidate_id);
      if (!cand) return;

      if (!map.has(cand.id)) {
        map.set(cand.id, {
          candidate: cand,
          latestEval: ev,
          evalCount: 1,
        });
      } else {
        const item = map.get(cand.id)!;
        item.evalCount += 1;
        if (ev.evaluation_date > item.latestEval.evaluation_date) {
          item.latestEval = ev;
        }
      }
    });

    return Array.from(map.values());
  }, [filteredEvaluations, candidates]);

   const shortlistedCandidatesCount = React.useMemo(() => {
    return filteredCandidates.filter(c => {
      const hasEval = evaluations.some(e => e.candidate_id === c.id && (['shortlist', 'recommend_academy', 'contract_proposal'].includes(e.verdict) || e.overall_score >= 6.0));
      return ['shortlisted', 'shortlist', 'academy', 'selected', 'signed'].includes(c.pipeline_stage) || hasEval;
    }).length;
  }, [filteredCandidates, evaluations]);

  const openCandidateDetail = (candidate: TrialCandidate) => {
    setDetailCandidate(candidate);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Recrutement & Détection
            <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-[10px] font-black lowercase">
              v1.0
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Recrutement & Détection v1 — Pipeline, Scouting & Radar
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Plateforme complète de prospection : gestion des scouts, pipeline Kanban 9 étapes, grille d'évaluation 1–10 par poste et comparateur radar.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="relative z-10 flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              setEditingCandidate(null);
              setIsCandidateModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouveau Joueur
          </button>

          <button
            onClick={() => {
              setEditingTest(null);
              setNewTestDefaultDate(undefined);
              setIsSessionModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-sm transition-all border border-white/10 flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Planifier Test
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setIsCriteriaManagerOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 hover:text-white text-xs font-bold backdrop-blur-sm transition-all border border-amber-400/30 flex items-center gap-2 shadow-sm cursor-pointer"
              title="Configurer les critères d'évaluation par poste (Super Admin uniquement)"
            >
              <Sliders className="w-4 h-4 text-amber-300" />
              Critères d'Évaluation
            </button>
          )}

        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Talents Prospectés</p>
            <p className="text-2xl font-black text-foreground">{totalProspects}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">En Évaluation / Tests</p>
            <p className="text-2xl font-black text-foreground">{inEvaluationCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Signés / Académie</p>
            <p className="text-2xl font-black text-foreground">{signedCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Scouts Actifs</p>
            <p className="text-2xl font-black text-foreground">{activeScoutsCount}</p>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="bg-white rounded-2xl p-1.5 sm:p-2 border shadow-sm flex overflow-x-auto no-scrollbar sm:flex-wrap gap-1.5 sm:gap-2">
        {[
          { id: 'scouts', label: 'Cellule Scouts', icon: UserCheck, count: scouts.length, isPrimary: true },
          { id: 'kanban', label: 'Pipeline Kanban (9 Étapes)', icon: Kanban, count: filteredCandidates.length },
          { id: 'candidates', label: 'Fiches Joueurs & Tuteurs', icon: Users, count: filteredCandidates.length },
          { id: 'shortlist', label: 'Shortlist & Onze Idéal', icon: Trophy, count: shortlistedCandidatesCount, isHighlighted: true },
          { id: 'observations', label: 'Rapports d\'Observation', icon: FileText, count: filteredObservations.length },
          { id: 'sessions', label: 'Planning des Tests', icon: Calendar, count: filteredTests.length },
          { id: 'evaluations', label: 'Évaluations (1–10) & Radars', icon: Award, count: evaluatedCandidates.length },
          { id: 'compare', label: 'Comparateur Radar', icon: Swords, count: null },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={cn(
                "whitespace-nowrap shrink-0 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2",
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/20 font-black"
                  : tab.isHighlighted
                  ? "text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300/80 font-black shadow-xs"
                  : tab.isPrimary
                  ? "text-primary bg-primary/10 hover:bg-primary/15 border border-primary/30 font-black shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className={cn("w-4 h-4", tab.isHighlighted && !isActive && "text-emerald-600")} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px]",
                  isActive
                    ? "bg-white/20 text-white"
                    : tab.isHighlighted
                    ? "bg-emerald-600 text-white font-black"
                    : tab.isPrimary
                    ? "bg-primary text-white font-black"
                    : "bg-slate-200 text-slate-700"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Barre de Filtre Complet Transversale (Recrutement & Détection) */}
      {activeTab !== 'scouts' && activeTab !== 'shortlist' && (
        <div className="bg-white rounded-3xl p-4 md:p-5 border shadow-sm space-y-3">
          {/* LIGNE 1 : Recherche + Compteur de talents + Reset */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filtre global : nom, prénom, club, ville, pays, scout, évaluateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 font-medium transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
                  title="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-end text-xs shrink-0 flex-wrap">
              {/* Bouton filtre : Meilleur Score par Poste */}
              <button
                type="button"
                onClick={() => setBestScorePerPositionFilter(!bestScorePerPositionFilter)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs",
                  bestScorePerPositionFilter
                    ? "bg-amber-400 text-slate-950 ring-2 ring-amber-300 shadow-amber-500/25 scale-105"
                    : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80"
                )}
                title="Conserver uniquement le joueur avec le meilleur score à sa dernière évaluation pour chaque poste"
              >
                <Crown className={cn("w-3.5 h-3.5", bestScorePerPositionFilter ? "text-slate-950 fill-slate-950" : "text-amber-600")} />
                <span>Meilleur Score par Poste</span>
              </button>

              <span className="font-bold text-slate-700 bg-slate-100/90 px-3 py-2 rounded-xl flex items-center gap-1.5 border border-slate-200/60">
                <Users className="w-3.5 h-3.5 text-primary" />
                <strong>{filteredCandidates.length}</strong> / {candidates.length} talents
              </span>

              {isAnyFilterActive && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Réinitialiser tous les critères de filtre"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Réinitialiser</span>
                </button>
              )}
            </div>
          </div>

          {/* LIGNE 2 : Sélecteurs déroulants de filtrage complet */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1 border-t border-slate-100">
            {/* 1. Catégorie d'Âge */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Catégorie d'Âge
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={cn(
                  "w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-primary transition-all",
                  categoryFilter !== 'ALL'
                    ? "border-primary bg-primary/5 text-primary font-bold shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700"
                )}
              >
                <option value="ALL">Toutes les catégories</option>
                {RECRUITMENT_AGE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* 2. Poste de Jeu */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Poste de Jeu
              </label>
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className={cn(
                  "w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-primary transition-all",
                  positionFilter !== 'ALL'
                    ? "border-primary bg-primary/5 text-primary font-bold shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700"
                )}
              >
                <option value="ALL">Tous les postes</option>
                {PLAYER_POSITIONS.map(pos => (
                  <option key={pos.code} value={pos.code}>
                    {pos.code} — {pos.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Étape Pipeline */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Étape Pipeline
              </label>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className={cn(
                  "w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-primary transition-all",
                  stageFilter !== 'ALL'
                    ? "border-primary bg-primary/5 text-primary font-bold shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700"
                )}
              >
                {PIPELINE_STAGE_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* 4. Pied Fort */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Pied Fort
              </label>
              <select
                value={footFilter}
                onChange={(e) => setFootFilter(e.target.value)}
                className={cn(
                  "w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-primary transition-all",
                  footFilter !== 'ALL'
                    ? "border-primary bg-primary/5 text-primary font-bold shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700"
                )}
              >
                {FOOT_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* 5. Verdict Évaluation */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Verdict Évaluation
              </label>
              <select
                value={verdictFilter}
                onChange={(e) => setVerdictFilter(e.target.value)}
                className={cn(
                  "w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-primary transition-all",
                  verdictFilter !== 'ALL'
                    ? "border-primary bg-primary/5 text-primary font-bold shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700"
                )}
              >
                {VERDICT_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* LIGNE 3 : Badges des filtres actifs */}
          {isAnyFilterActive && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
              <span className="font-bold text-slate-400 flex items-center gap-1 mr-1">
                <Filter className="w-3 h-3 text-primary" />
                Filtres actifs :
              </span>

              {searchQuery && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200 flex items-center gap-1">
                  Recherche : "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                </span>
              )}

              {categoryFilter !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20 flex items-center gap-1">
                  Catégorie : {categoryFilter}
                  <button onClick={() => setCategoryFilter('ALL')} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                </span>
              )}

              {positionFilter !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20 flex items-center gap-1">
                  Poste : {positionFilter}
                  <button onClick={() => setPositionFilter('ALL')} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                </span>
              )}

              {stageFilter !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20 flex items-center gap-1">
                  Étape : {PIPELINE_STAGE_OPTIONS.find(o => o.id === stageFilter)?.label}
                  <button onClick={() => setStageFilter('ALL')} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                </span>
              )}

              {footFilter !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20 flex items-center gap-1">
                  Pied : {footFilter}
                  <button onClick={() => setFootFilter('ALL')} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                </span>
              )}

              {verdictFilter !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20 flex items-center gap-1">
                  Verdict : {VERDICT_OPTIONS.find(o => o.id === verdictFilter)?.label}
                  <button onClick={() => setVerdictFilter('ALL')} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                </span>
              )}

              {bestScorePerPositionFilter && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-bold border border-amber-300 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-600 fill-amber-600" />
                  Top 1 par poste (Dernières Évaluations)
                  <button onClick={() => setBestScorePerPositionFilter(false)} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 1 : CELLULE SCOUTS (EN TÊTE) */}
      {activeTab === 'scouts' && (
        <ScoutManagementView
          scouts={scouts}
          candidates={candidates}
          evaluations={evaluations}
          observations={observations}
          onCreateScout={createScout}
          onUpdateScout={(id, updates) => updateScout(id, updates)}
          onDeleteScout={deleteScout}
        />
      )}

      {/* TAB 2 : PIPELINE KANBAN */}
      {activeTab === 'kanban' && (
        <RecruitmentPipelineKanban
          candidates={filteredCandidates}
          evaluations={filteredEvaluations}
          tests={filteredTests}
          onUpdateStage={async (id, stage) => {
            await updatePipelineStage({ id, stage });
          }}
          onOpenCandidateDetail={(c) => openCandidateDetail(c)}
          onOpenEvaluation={(c) => {
            setEvaluatingCandidate(c);
            const existingEval = evaluations.find(e => e.candidate_id === c.id);
            setEvaluationInitialMode(existingEval ? 'edit' : 'create');
            const candTests = tests.filter(t => t.candidate_id === c.id);
            setEvaluationInitialTestId(candTests[0]?.id || '');
            setIsEvaluationModalOpen(true);
          }}
          onOpenScheduleTest={(c, test) => {
            if (test) {
              setEditingTest(test);
              setDefaultDateForTest(test.test_date);
              setDefaultCandidateIdForTest(c.id);
            } else {
              setEditingTest(null);
              setDefaultDateForTest(todayStr);
              setDefaultCandidateIdForTest(c.id);
            }
            setIsTrialModalOpen(true);
          }}
        />
      )}

      {/* TAB 3 : CANDIDATS & TUTEURS (LISTE) */}
      {activeTab === 'candidates' && (
        <div className="space-y-4">
          {filteredCandidates.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border shadow-sm text-center space-y-2">
              <Users className="w-8 h-8 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Aucun profil ne correspond à ce filtre</h3>
              <p className="text-xs text-muted-foreground">
                Essayez d'ajuster ou d'effacer votre terme de recherche dans la barre unique ci-dessus.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCandidates.map((c) => {
              const evalData = evaluations.find(e => e.candidate_id === c.id);

              return (
                <div key={c.id} className="bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-700 text-base shrink-0 overflow-hidden border border-slate-200 shadow-2xs">
                          {c.photo_url ? (
                            <img
                              src={c.photo_url}
                              alt={`${c.first_name} ${c.last_name}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            `${c.first_name[0]}${c.last_name[0]}`
                          )}
                        </div>
                        <div>
                          <h3
                            onClick={() => openCandidateDetail(c)}
                            className="font-bold text-sm text-foreground hover:text-primary cursor-pointer transition-colors"
                          >
                            {c.first_name} {c.last_name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground font-medium">{c.primary_position}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {c.age_category || 'U19'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border">
                        {c.pipeline_stage.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Morphologie & Club */}
                    <div className="grid grid-cols-3 gap-2 mt-4 p-2.5 rounded-xl bg-slate-50 border text-center text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Pied</span>
                        <span className="font-bold">{c.preferred_foot}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Taille / Poids</span>
                        <span className="font-bold">{c.height_cm ? `${c.height_cm}cm` : '-'} / {c.weight_kg ? `${c.weight_kg}kg` : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Nationalité</span>
                        <span className="font-bold">{c.nationality}</span>
                      </div>
                    </div>

                    {c.current_club && (
                      <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5 font-medium">
                        <Shield className="w-3.5 h-3.5 text-primary" />
                        Club : <span className="font-bold text-slate-800">{c.current_club}</span>
                      </p>
                    )}

                    {/* Tuteur info if available */}
                    {c.guardian_name && (
                      <p className="text-[11px] text-amber-800 mt-1 flex items-center gap-1.5 font-medium">
                        <HeartHandshake className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        Tuteur : {c.guardian_name} ({c.guardian_relationship || 'Père'})
                      </p>
                    )}

                    {/* Scout & Recruiter badges */}
                    <div className="pt-2 mt-2 border-t border-slate-100 flex flex-wrap gap-2 text-[11px]">
                      {c.discovering_scout_name && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-medium">
                          <User className="w-3 h-3 text-blue-500" />
                          Scout : <strong>{c.discovering_scout_name}</strong>
                        </span>
                      )}
                      {c.recruiter_name && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 font-medium">
                          <Briefcase className="w-3 h-3 text-amber-600" />
                          Recruteur : <strong>{c.recruiter_name}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score Evaluation */}
                  {evalData ? (
                    <div className="p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-red-950 block">Score 4 Piliers</span>
                        <span className="text-lg font-black text-primary">{evalData.overall_score}/10</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">Verdict</span>
                        <span className="text-xs font-bold text-slate-800 uppercase">{evalData.verdict.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                      Non encore évalué sur 4 piliers
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 border-t flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => openCandidateDetail(c)}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      Dossier
                    </button>

                    {(() => {
                      const candTests = tests.filter(t => t.candidate_id === c.id);
                      return (
                        <button
                          onClick={() => {
                            setEvaluatingCandidate(c);
                            setEvaluationInitialMode(evalData ? 'edit' : 'create');
                            setEvaluationInitialTestId(eligible[0]?.id || '');
                            setIsEvaluationModalOpen(true);
                          }}
                          className={cn(
                            "py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer",
                            evalData
                              ? "bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20"
                              : "bg-slate-900 hover:bg-slate-800 text-white shadow-2xs"
                          )}
                          title={evalData ? `Note Scout : ${evalData.overall_score}/10 (Modifier l'évaluation)` : "Saisir l'évaluation scout"}
                        >
                          <Award className="w-3.5 h-3.5" />
                          {evalData ? `${evalData.overall_score}/10` : 'Évaluer'}
                        </button>
                      );
                    })()}


                    <button
                      onClick={() => {
                        setEditingCandidate(c);
                        setIsCandidateModalOpen(true);
                      }}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                      title="Modifier la fiche"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Supprimer la fiche de ${c.first_name} ${c.last_name} ?`)) {
                          deleteCandidate(c.id);
                        }
                      }}
                      className="p-2 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}


      {/* TAB 4 : RAPPORTS D'OBSERVATION */}
      {activeTab === 'observations' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Rapports d'Observation Match de Terrain</h2>
              <p className="text-xs text-muted-foreground">Comptes-rendus de détection enregistrés par les scouts.</p>
            </div>
            <button
              onClick={() => {
                setObservingCandidate(candidates[0] || null);
                setIsObservationModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow hover:bg-primary/90 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouveau Rapport
            </button>
          </div>

          {filteredObservations.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border shadow-sm text-center space-y-2">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Aucun rapport d'observation trouvé</h3>
              <p className="text-xs text-muted-foreground">
                Essayez d'ajuster votre terme de recherche dans le filtre unique.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredObservations.map((obs) => {
                const candidate = candidates.find(c => c.id === obs.candidate_id);

                return (
                  <div key={obs.id} className="bg-white rounded-3xl p-5 border shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                          {obs.competition_name || 'Match Observé'}
                        </span>
                        <h3 className="text-base font-bold text-foreground mt-1">
                          {candidate ? `${candidate.first_name} ${candidate.last_name}` : 'Joueur'}
                        </h3>
                        <p className="text-xs text-muted-foreground">{obs.match_name || 'Observation de jeu'} • {obs.location || 'Stade'}</p>
                      </div>
                      <span className="text-sm font-black text-primary bg-primary/10 px-2.5 py-1 rounded-xl">
                        Potentiel : {obs.potential_rating}/10
                      </span>
                    </div>

                    {obs.general_impression && (
                      <p className="text-xs p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 italic">
                        « {obs.general_impression} »
                      </p>
                    )}

                    <div className="pt-2 border-t flex justify-between items-center text-xs text-muted-foreground">
                      <span>Scout : <strong className="text-slate-800">{obs.scout_name}</strong></span>
                      <span>{obs.observation_date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5 : PLANNING DES TESTS */}
      {activeTab === 'sessions' && (
        <TestCalendarView
          tests={filteredTests}
          candidates={filteredCandidates}
          evaluations={filteredEvaluations}
          isLoading={isLoadingTests}
          onOpenNewTest={(defaultDate) => {
            setEditingTest(null);
            setNewTestDefaultDate(defaultDate);
            setIsSessionModalOpen(true);
          }}
          onEditTest={(test) => {
            setEditingTest(test);
            setNewTestDefaultDate(undefined);
            setIsSessionModalOpen(true);
          }}
          onDeleteTest={async (testId) => {
            await deleteTest(testId);
          }}
          onMoveTest={async (testId, newDate) => {
            await updateTest({ id: testId, updates: { test_date: newDate } });
          }}
          onOpenEvaluationForTest={(candidate, test) => {
            setEvaluatingCandidate(candidate);
            const hasExisting = evaluations.some(e => e.candidate_id === candidate.id);
            setEvaluationInitialMode(hasExisting ? 'reevaluate' : 'create');
            setEvaluationInitialTestId(test.id);
            setIsEvaluationModalOpen(true);
          }}
        />
      )}

      {/* TAB 6 : ÉVALUATIONS (1–10) & RADARS */}
      {activeTab === 'evaluations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* COLONNE GAUCHE : LISTE UNIQUE DES JOUEURS ÉVALUÉS */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-5 border shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  Joueurs Évalués ({evaluatedCandidates.length})
                </h3>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  1 joueur par fiche
                </span>
              </div>

              <div className="space-y-2 max-h-[520px] overflow-y-auto custom-scrollbar">
                {evaluatedCandidates.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-6 text-center bg-slate-50 rounded-2xl border border-dashed">
                    Aucun joueur évalué pour le moment
                  </div>
                ) : (
                  evaluatedCandidates.map(({ candidate, latestEval, evalCount }) => {
                    const isSelected = (detailCandidate?.id || evaluatedCandidates[0]?.candidate.id) === candidate.id;

                    return (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => {
                          setDetailCandidate(candidate);
                          setSelectedRadarTestId('latest');
                        }}
                        className={cn(
                          "w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 group",
                          isSelected
                            ? "bg-primary/10 border-primary text-primary shadow-sm ring-1 ring-primary/20"
                            : "bg-slate-50/60 hover:bg-slate-100 border-slate-200 text-slate-800"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center font-black text-slate-600 shrink-0 border border-slate-300/60">
                            {candidate.photo_url ? (
                              <img src={candidate.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs">{candidate.first_name[0]}{candidate.last_name[0]}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate group-hover:text-primary transition-colors">
                              {candidate.first_name} {candidate.last_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {candidate.primary_position} • {candidate.current_club || 'Sans club'}
                            </p>
                            {evalCount > 1 ? (
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 text-[9px] font-bold border border-blue-200">
                                {evalCount} tests réalisés
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400">
                                Test du {latestEval.evaluation_date}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-primary block">{latestEval.overall_score}/10</span>
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-700">
                            {latestEval.verdict.replace('_', ' ')}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLONNE DROITE : FICHE RADAR AVEC FILTRE DES TESTS PAR DATE & HEURE */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border shadow-sm">
              {(() => {
                const targetCandidate = detailCandidate || evaluatedCandidates[0]?.candidate || filteredCandidates[0];

                if (!targetCandidate) {
                  return (
                    <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                      Sélectionnez un joueur pour afficher sa fiche radar.
                    </div>
                  );
                }

                // Toutes les évaluations de ce joueur triées par date décroissante
                const candEvals = evaluations
                  .filter(e => e.candidate_id === targetCandidate.id)
                  .sort((a, b) => b.evaluation_date.localeCompare(a.evaluation_date));

                // Tous les tests de ce joueur
                const candTests = tests.filter(t => t.candidate_id === targetCandidate.id);

                // Construction des sessions d'évaluation avec Date & Heure
                const evaluationSessions = candEvals.map((ev, index) => {
                  const linkedTest = ev.test_id ? candTests.find(t => t.id === ev.test_id) : undefined;
                  const testDate = ev.evaluation_date || linkedTest?.test_date || '';
                  const testTime = linkedTest?.start_time || '10:00';
                  const testName = ev.test_name || linkedTest?.test_name || `Session d'Évaluation #${candEvals.length - index}`;
                  const location = linkedTest?.location || 'Complexe FUS';

                  return {
                    id: ev.id,
                    testId: ev.test_id,
                    testName,
                    testDate,
                    testTime,
                    location,
                    overallScore: ev.overall_score,
                    verdict: ev.verdict,
                    evaluatorName: ev.evaluator_name,
                    evaluatorRole: ev.evaluator_role || 'Scout / Staff',
                    eval: ev,
                  };
                });

                // Session sélectionnée par le filtre de test
                const activeSession = (selectedRadarTestId !== 'latest' && evaluationSessions.find(s => s.id === selectedRadarTestId))
                  || evaluationSessions[0];

                const targetEval = activeSession?.eval || candEvals[0];

                if (!targetEval) {
                  return (
                    <div className="flex flex-col items-center justify-center h-64 text-sm text-muted-foreground space-y-2">
                      <Award className="w-8 h-8 text-slate-300" />
                      <p>Aucune évaluation enregistrée pour ce joueur.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* Header Profil Joueur & Score */}
                    <div className="flex justify-between items-start border-b pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center font-black text-slate-600 border shrink-0">
                          {targetCandidate.photo_url ? (
                            <img src={targetCandidate.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm">{targetCandidate.first_name[0]}{targetCandidate.last_name[0]}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">
                            {targetCandidate.first_name} {targetCandidate.last_name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Poste : <strong className="text-slate-800">{targetCandidate.primary_position}</strong> • {targetCandidate.current_club || 'Sans club'} • {targetCandidate.age_category}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1.5">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Score Pondéré</span>
                          <span className="text-3xl font-black text-primary">{targetEval.overall_score}/10</span>
                        </div>
                        {(() => {
                          if (candTests.length > 0) {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setEvaluatingCandidate(targetCandidate);
                                  setEvaluationInitialMode(targetEval ? 'edit' : 'create');
                                  setEvaluationInitialTestId(activeSession?.testId || candTests[0].id);
                                  setIsEvaluationModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                title="Évaluer cette session"
                              >
                                <Award className="w-3.5 h-3.5" />
                                {targetEval ? "Modifier l'Évaluation" : "Évaluer"}
                              </button>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={() => handleOpenScheduleTestForCandidate(targetCandidate)}
                              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                              title="Planifier un test pour ce joueur"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              Planifier Test
                            </button>
                          );
                        })()}
                      </div>
                    </div>

                    {/* FILTRE DES TESTS PAR DATE & HEURE */}
                    <div className="p-3 bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                          <Clock className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                            Filtre Test (Date & Heure)
                          </label>
                          <span className="text-xs font-bold text-slate-800">
                            {evaluationSessions.length} session{evaluationSessions.length > 1 ? 's' : ''} enregistrée{evaluationSessions.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-1 sm:max-w-md">
                        <select
                          value={activeSession?.id || ''}
                          onChange={(e) => setSelectedRadarTestId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-primary"
                        >
                          {evaluationSessions.map((session, idx) => (
                            <option key={session.id} value={session.id}>
                              {idx === 0 ? '⭐ (Dernier Test) ' : ''}📅 {session.testDate} à {session.testTime} — {session.testName} ({session.overallScore}/10)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Détails complémentaires du test sélectionné */}
                    {activeSession && (
                      <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50/80 px-3.5 py-2 rounded-xl border border-slate-200/60">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          Date : {activeSession.testDate}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          Heure : {activeSession.testTime}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          {activeSession.location}
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-500 ml-auto">
                          Évaluateur : <strong className="text-slate-800">{activeSession.evaluatorName}</strong> ({activeSession.evaluatorRole})
                        </span>
                      </div>
                    )}

                    {/* Radar Chart */}
                    <PlayerRadarChart
                      evaluations={[{
                        name: `${targetCandidate.first_name} ${targetCandidate.last_name} (${activeSession?.testDate || ''})`,
                        color: '#ef4444',
                        eval: targetEval,
                      }]}
                      detailed={false}
                      height={300}
                    />

                    {/* 4 Piliers détaillés */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t">
                      <div className="p-2.5 bg-slate-50 rounded-xl border text-center">
                        <span className="text-[10px] text-muted-foreground block font-bold">⚽ Technique (30%)</span>
                        <span className="text-sm font-black text-slate-800">{targetEval.technical_score}/10</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border text-center">
                        <span className="text-[10px] text-muted-foreground block font-bold">🏃 Physique (25%)</span>
                        <span className="text-sm font-black text-slate-800">{targetEval.physical_score}/10</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border text-center">
                        <span className="text-[10px] text-muted-foreground block font-bold">🧭 Tactique (25%)</span>
                        <span className="text-sm font-black text-slate-800">{targetEval.tactical_score}/10</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border text-center">
                        <span className="text-[10px] text-muted-foreground block font-bold">🧠 Mental (20%)</span>
                        <span className="text-sm font-black text-slate-800">{targetEval.mental_score}/10</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7 : COMPARATEUR RADAR */}
      {activeTab === 'compare' && (
        <RadarComparisonView
          candidates={filteredCandidates}
          evaluations={filteredEvaluations}
        />
      )}

      {/* TAB 8 : SHORTLIST & ONZE IDÉAL (TERRAIN VERTICAL) */}
      {activeTab === 'shortlist' && (
        <ShortlistPitchView
          candidates={candidates}
          evaluations={evaluations}
          scouts={scouts}
          onOpenCandidateDetail={(c) => openCandidateDetail(c)}
          onOpenEvaluationForCandidate={(c) => {
            setEvaluatingCandidate(c);
            setEvaluationInitialMode('create');
            setIsEvaluationModalOpen(true);
          }}
          onUpdateCandidate={(id, updates) => updateCandidate(id, updates)}
        />
      )}

      {/* MODALS */}
      {isCandidateModalOpen && (
        <CandidateModal
          isOpen={isCandidateModalOpen}
          onClose={() => {
            setIsCandidateModalOpen(false);
            setEditingCandidate(null);
          }}
          candidate={editingCandidate}
          scouts={scouts}
          onSave={async (data, evalData) => {
            if (editingCandidate) {
              await updateCandidate({ id: editingCandidate.id, updates: data });
              if (evalData) {
                await saveEvaluation({ ...evalData, candidate_id: editingCandidate.id });
              }
            } else {
              const created = await createCandidate(data);
              if (created && created.id && evalData) {
                await saveEvaluation({ ...evalData, candidate_id: created.id });
              }
            }
          }}
        />
      )}

      {isEvaluationModalOpen && evaluatingCandidate && (
        <EvaluationModal
          isOpen={isEvaluationModalOpen}
          onClose={() => {
            setIsEvaluationModalOpen(false);
            setEvaluatingCandidate(null);
            setEvaluationInitialTestId(undefined);
          }}
          candidate={evaluatingCandidate}
          existingEvaluation={evaluations.find(e => e.candidate_id === evaluatingCandidate.id)}
          evaluations={evaluations}
          initialMode={evaluationInitialMode}
          tests={tests}
          initialTestId={evaluationInitialTestId}
          onSave={async (evalData, options) => {
            await saveEvaluation(evalData, options);
          }}
          onDelete={async (evalId) => {
            await deleteEvaluation(evalId);
          }}
          onOpenScheduleTest={(cand) => {
            handleOpenScheduleTestForCandidate(cand);
          }}
        />
      )}

      {isObservationModalOpen && observingCandidate && (
        <ObservationModal
          isOpen={isObservationModalOpen}
          onClose={() => {
            setIsObservationModalOpen(false);
            setObservingCandidate(null);
          }}
          candidate={observingCandidate}
          scouts={scouts}
          onSave={async (obsData) => {
            await createObservation(obsData);
          }}
        />
      )}

      {isSessionModalOpen && (
        <TrialSessionModal
          isOpen={isSessionModalOpen}
          onClose={() => {
            setIsSessionModalOpen(false);
            setEditingTest(null);
            setSchedulingCandidate(null);
            setNewTestDefaultDate(undefined);
          }}
          candidates={candidates}
          scouts={scouts}
          initialTest={editingTest}
          defaultDate={newTestDefaultDate}
          defaultCandidateId={schedulingCandidate?.id}
          onSave={async (testData) => {
            await createTest(testData);
          }}
          onUpdate={async (id, updates) => {
            await updateTest({ id, updates });
          }}
        />
      )}

      {isDetailModalOpen && detailCandidate && (
        <CandidateDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setDetailCandidate(null);
          }}
          candidate={detailCandidate}
          evaluations={evaluations}
          observations={observations}
          tests={tests}
          timeline={timeline}
          onScheduleTest={(cand) => {
            setIsDetailModalOpen(false);
            handleOpenScheduleTestForCandidate(cand);
          }}
          onOpenEvaluation={(options) => {
            setIsDetailModalOpen(false);
            setEvaluatingCandidate(detailCandidate);
            setEvaluationInitialMode(options?.mode || 'reevaluate');
            setEvaluationInitialTestId(options?.testId);
            setIsEvaluationModalOpen(true);
          }}
          onOpenObservation={() => {
            setIsDetailModalOpen(false);
            setObservingCandidate(detailCandidate);
            setIsObservationModalOpen(true);
          }}
        />
      )}

      {/* MODAL RESET CELLULE RECRUTEMENT */}
      {isResetModalOpen && (
        <RecruitmentResetModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          currentUserEmail={authState.email}
          candidatesCount={candidates.length}
          evaluationsCount={evaluations.length}
          observationsCount={observations.length}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.candidates });
            queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.evaluations });
            queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.observations });
            queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEYS.tests });
            queryClient.invalidateQueries({ queryKey: ['recruitment'] });
          }}
        />
      )}

      {/* MODAL GESTION DES CRITÈRES SCOUT (SUPER ADMIN) */}
      {isSuperAdmin && isCriteriaManagerOpen && (
        <ScoutCriteriaManagerModal
          isOpen={isCriteriaManagerOpen}
          onClose={() => setIsCriteriaManagerOpen(false)}
        />
      )}
    </div>
  );
};
export default RecruitmentPage;
