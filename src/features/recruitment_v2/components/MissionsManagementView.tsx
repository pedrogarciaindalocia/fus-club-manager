import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck, Clock, CheckCircle2, AlertCircle, Search, Filter,
  Calendar, User, ArrowRight, FileText, ExternalLink, Shield,
  Building2, Sparkles, Check, CheckSquare, Tag, Eye, ChevronRight, Lock,
  Target, Plus, X, UserPlus, Loader2, GripVertical, UserMinus
} from 'lucide-react';
import type { TrialCandidate, Scout, ScoutMission } from '../types/recruitment';
import { ScoutingBasketSection } from './ScoutingBasketSection';
import type { BasketPlayer } from './ScoutingBasketSection';
import { recruitmentService } from '../services/recruitmentService';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

interface MissionsManagementViewProps {
  candidates: TrialCandidate[];
  scouts: Scout[];
  currentUser?: any;
  currentScout?: Scout | null;
  isAdmin: boolean;
  isScoutAdmin: boolean;
  isSuperAdmin?: boolean;
  isScoutManager?: boolean;
  onAcknowledgeMission: (candidateId: string, missionId: string) => Promise<void>;
  onOpenCandidate: (candidate: TrialCandidate) => void;
  onNavigateToReport: (candidateId: string) => void;
  onAssignMission?: (
    candidateId: string,
    missionData: {
      scoutId: string;
      missionTitle: string;
      missionDescription: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      dueDate?: string;
    },
    candidateObj?: TrialCandidate
  ) => Promise<void>;
  onUnassignMission?: (candidateId: string, missionId?: string) => Promise<void>;
}

interface EnrichedMission extends ScoutMission {
  candidate: TrialCandidate;
  isActive: boolean;
}

export const MissionsManagementView: React.FC<MissionsManagementViewProps> = ({
  candidates,
  scouts,
  currentUser,
  currentScout,
  isAdmin,
  isScoutAdmin,
  isSuperAdmin = false,
  isScoutManager = false,
  onAcknowledgeMission,
  onOpenCandidate,
  onNavigateToReport,
  onAssignMission,
  onUnassignMission,
}) => {
  const currentUserId = currentScout?.id || currentUser?.id || '';
  const currentUserName = currentScout?.full_name || currentUser?.full_name || 'Moi';
  const isSuperAdminUser = Boolean(
    isSuperAdmin ||
    currentUser?.system_role === 'super_admin' ||
    currentUser?.role === 'super_admin' ||
    (currentUser?.email && currentUser.email.toLowerCase().includes('admin'))
  );
  const hasAdminSupervision = isAdmin || isScoutAdmin || isSuperAdminUser || isSuperAdmin;
  const isSuperAdminOrAdmin = Boolean(isSuperAdmin || isAdmin || isScoutAdmin || isSuperAdminUser);

  // Filtres
  const [filterScope, setFilterScope] = useState<'received' | 'sent' | 'all'>(
    hasAdminSupervision ? 'all' : 'received'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignerId, setSelectedAssignerId] = useState<string>('all');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [isAcknowledgingId, setIsAcknowledgingId] = useState<string | null>(null);

  // Modale d'assignation de mission (Réservée exclusivement au Scout Admin)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCandidateForAssign, setSelectedCandidateForAssign] = useState<TrialCandidate | null>(null);
  const [modalCandidateSearch, setModalCandidateSearch] = useState('');
  const [modalScoutId, setModalScoutId] = useState('');
  const [modalMissionTitle, setModalMissionTitle] = useState('Observation en match officiel');
  const [modalCustomTitle, setModalCustomTitle] = useState('');
  const [modalMissionDesc, setModalMissionDesc] = useState('');
  const [modalPriority, setModalPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [modalDueDate, setModalDueDate] = useState('');
  const [isSubmittingMission, setIsSubmittingMission] = useState(false);

  // État pour le retrait de mission (Règle de gouvernance : retrait obligatoire avant réassignation)
  const [missionToUnassign, setMissionToUnassign] = useState<EnrichedMission | null>(null);
  const [isUnassigning, setIsUnassigning] = useState(false);

  const confirmUnassignMission = async () => {
    if (!missionToUnassign || !onUnassignMission) return;
    setIsUnassigning(true);
    try {
      await onUnassignMission(missionToUnassign.candidate.id, missionToUnassign.id);
      setMissionToUnassign(null);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors du retrait de la mission");
    } finally {
      setIsUnassigning(false);
    }
  };

  // Candidats filtrés pour la modale d'assignation
  const filteredCandidatesForAssign = useMemo(() => {
    if (!modalCandidateSearch.trim()) return candidates.slice(0, 15);
    const q = modalCandidateSearch.toLowerCase().trim();
    return candidates.filter(c => {
      const name = `${c.first_name} ${c.last_name}`.toLowerCase();
      const pos = (c.primary_position || '').toLowerCase();
      const cat = (c.age_category || '').toLowerCase();
      const club = (c.current_club || c.origin_club || '').toLowerCase();
      return name.includes(q) || pos.includes(q) || cat.includes(q) || club.includes(q);
    }).slice(0, 20);
  }, [candidates, modalCandidateSearch]);

  const handleConfirmModalAssign = async () => {
    if (!hasAdminSupervision) {
      toast.error("Action non autorisée : réservée à la Direction (Super Admin et Scout Admin).");
      return;
    }
    if (!selectedCandidateForAssign) {
      toast.error("Veuillez sélectionner un joueur cible.");
      return;
    }
    if (!modalScoutId) {
      toast.error("Veuillez sélectionner un scout destinataire (Scout B).");
      return;
    }

    const effectiveTitle = modalMissionTitle === 'custom'
      ? (modalCustomTitle.trim() || 'Mission personnalisée')
      : modalMissionTitle;

    setIsSubmittingMission(true);
    try {
      if (onAssignMission) {
        await onAssignMission(selectedCandidateForAssign.id, {
          scoutId: modalScoutId,
          missionTitle: effectiveTitle,
          missionDescription: modalMissionDesc.trim() || 'Observation et suivi des performances du joueur.',
          priority: modalPriority,
          dueDate: modalDueDate || undefined,
        });
      }
      setIsAssignModalOpen(false);
      setSelectedCandidateForAssign(null);
      setModalCandidateSearch('');
      setModalScoutId('');
      setModalMissionDesc('');
      setModalDueDate('');
      setModalCustomTitle('');
    } catch (err: any) {
      console.error("Erreur assignation mission:", err);
      toast.error(err?.message || "Erreur lors de l'assignation de la mission");
    } finally {
      setIsSubmittingMission(false);
    }
  };

  // Assignation automatique d'une mission à partir d'un joueur adverse présent dans le Panier de Détection
  const handleAssignMissionFromBasket = async (player: BasketPlayer, scoutId: string): Promise<TrialCandidate | null> => {
    // 1. Chercher si le candidat existe déjà dans la base des candidats
    let targetCand = candidates.find(c => {
      const cName = `${c.first_name} ${c.last_name}`.toLowerCase().trim();
      return cName === player.full_name.toLowerCase().trim() || c.id === player.player_id;
    });

    // 2. Si le candidat n'existe pas encore dans trial_candidates, création automatique du profil
    if (!targetCand) {
      const nameParts = player.full_name.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Joueur';
      const lastName = nameParts.slice(1).join(' ') || 'Adverse';
      const matchContext = player.match_context || {};
      const matchInfo = matchContext.home_name && matchContext.away_name
        ? `${matchContext.home_name} vs ${matchContext.away_name} (${matchContext.score_home ?? 0}-${matchContext.score_away ?? 0})`
        : 'Match officiel';
      const obsText = player.rating_comment ? `\nObservation & Description : "${player.rating_comment}"` : '';

      const createdCand = await recruitmentService.createCandidate({
        first_name: firstName,
        last_name: lastName,
        primary_position: player.position || 'Attaquant',
        age_category: (player.category as any) || 'SENIOR',
        origin_club: matchContext.away_name?.includes('FUS') ? matchContext.home_name : (matchContext.away_name || 'Club adverse'),
        photo_url: player.photo_url || undefined,
        current_status: 'in_trial',
        pipeline_stage: 'scouted',
        evaluation_verdict: 'monitor',
        recommendation_priority: 'high',
        notes: `Joueur adverse repéré lors du match : ${matchInfo}. Ajouté au panier de détection par ${player.added_by_name} (${player.added_by_role || 'Staff'}).${obsText}`,
        rating: player.rating || undefined,
        discovery_match: player.match_id || undefined,
      });

      targetCand = createdCand;
    }

    // 3. Déclencher l'assignation de la mission d'observation au scout cible
    if (onAssignMission && targetCand) {
      const matchSummary = player.match_context?.home_name && player.match_context?.away_name
        ? `${player.match_context.home_name} ${player.match_context.score_home ?? 0}–${player.match_context.score_away ?? 0} ${player.match_context.away_name}`
        : 'Match observé';
      const descObs = player.rating_comment ? ` Observation & Description : "${player.rating_comment}".` : '';

      await onAssignMission(targetCand.id, {
        scoutId,
        missionTitle: `Observation & Rapport : ${player.full_name} (${player.position || 'Adversaire'})`,
        missionDescription: `Joueur repéré lors du match ${matchSummary}. Recommandé par ${player.added_by_name} (${player.added_by_role || 'Cellule Détection'}).${descObs} Mission d'effectuer un rapport complet de suivi et d'observation.`,
        priority: 'high',
      }, targetCand);
    }

    return targetCand || null;
  };

  // Permet d'assigner ou réassigner n'importe quel candidat / mission par glisser-déposer sur un scout
  const handleAssignCandidateToScout = async (candidateId: string, targetScout: Scout, extraData?: any) => {
    if (!onAssignMission) return;
    const targetCand = candidates.find(c => c.id === candidateId);
    const missionTitle = extraData?.missionTitle || `Observation & Suivi : ${targetCand ? `${targetCand.first_name} ${targetCand.last_name}` : 'Joueur'}`;
    const missionDesc = extraData?.missionDescription || `Mission d'observation et de rapport confiée par la Direction Scouting.`;
    const priority = extraData?.priority || 'high';

    await onAssignMission(candidateId, {
      scoutId: targetScout.id,
      missionTitle,
      missionDescription: missionDesc,
      priority,
    }, targetCand);
  };

  // Écoute temps réel des assignations de mission pour notifier instantanément le Scout Manager ou Scout ciblé
  useEffect(() => {
    const channel = supabase
      .channel('scouting_missions_broadcast_alerts')
      .on('broadcast', { event: 'mission_assigned' }, (payload: any) => {
        const data = payload?.payload;
        if (!data) return;

        const isTargeted = Boolean(
          (currentUserId && data.scoutId === currentUserId) ||
          (currentScout?.id && data.scoutId === currentScout.id) ||
          (data.scoutName && currentUserName && data.scoutName.toLowerCase().trim() === currentUserName.toLowerCase().trim()) ||
          (data.scoutName && currentUser?.full_name && data.scoutName.toLowerCase().trim() === currentUser.full_name.toLowerCase().trim())
        );

        if (isTargeted) {
          toast.info(`🎯 Nouvelle Mission Assignée !`, {
            description: `${data.assignedBy} vous a confié l'observation de ${data.candidateName} (${data.missionTitle})`,
            duration: 8000,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, currentScout?.id, currentUserName, currentUser?.full_name]);

  // Extraction et enrichissement de toutes les missions
  const allMissions = useMemo(() => {
    const list: EnrichedMission[] = [];
    candidates.forEach((cand) => {
      // 1. Mission active
      if (cand.active_mission) {
        list.push({
          ...cand.active_mission,
          candidate: cand,
          candidate_name: cand.active_mission.candidate_name || `${cand.first_name} ${cand.last_name}`,
          candidate_photo: cand.active_mission.candidate_photo || cand.photo_url,
          candidate_position: cand.active_mission.candidate_position || cand.primary_position,
          candidate_category: cand.active_mission.candidate_category || cand.age_category,
          candidate_club: cand.active_mission.candidate_club || cand.origin_club || cand.current_club,
          isActive: true,
        });
      }

      // 2. Historique des missions
      if (cand.mission_history && Array.isArray(cand.mission_history)) {
        cand.mission_history.forEach((histMission) => {
          if (cand.active_mission && histMission.id === cand.active_mission.id) {
            return; // Déjà ajoutée comme active
          }
          list.push({
            ...histMission,
            candidate: cand,
            candidate_name: histMission.candidate_name || `${cand.first_name} ${cand.last_name}`,
            candidate_photo: histMission.candidate_photo || cand.photo_url,
            candidate_position: histMission.candidate_position || cand.primary_position,
            candidate_category: histMission.candidate_category || cand.age_category,
            candidate_club: histMission.candidate_club || cand.origin_club || cand.current_club,
            isActive: false,
          });
        });
      }
    });

    // Tri antéchronologique (plus récente en premier)
    return list.sort((a, b) => new Date(b.assigned_at || 0).getTime() - new Date(a.assigned_at || 0).getTime());
  }, [candidates]);

  // US-DASH-32: Vérifie si la mission a été ordonnée par la Direction (Scout Admin ou Super Admin)
  const isEmittedByAdmin = (mission: EnrichedMission) => {
    const role = (mission.assigned_by_role || '').toLowerCase();
    if (role === 'scout_admin' || role === 'super_admin' || role === 'admin') return true;
    if (mission.is_locked) return true;
    const name = (mission.assigned_by_name || '').toLowerCase();
    if (name.includes('direction') || name.includes('admin') || name.includes('super')) return true;
    const assignerScout = scouts.find(s =>
      s.id === mission.assigned_by_id ||
      (s.full_name && s.full_name.toLowerCase().trim() === name.trim())
    );
    if (assignerScout) {
      const scoutRole = (assignerScout.role_title || (assignerScout as any).system_role || '').toLowerCase();
      if (scoutRole.includes('admin') || scoutRole.includes('super')) return true;
    }
    return false;
  };

  // Filtrage selon le rôle et les filtres UI
  const filteredMissions = useMemo(() => {
    return allMissions.filter((mission) => {
      // 1. Filtrage de portée métier : Le Scout / Scout Manager ne voit STRICTEMENT QUE les missions qui lui sont assignées
      if (!hasAdminSupervision) {
        const isAssignedToMe = Boolean(
          (currentUserId && mission.assigned_to_id === currentUserId) ||
          (currentUser?.id && mission.assigned_to_id === currentUser.id) ||
          (currentScout?.id && mission.assigned_to_id === currentScout.id) ||
          (mission.assigned_to_name && currentUserName && mission.assigned_to_name.toLowerCase().trim() === currentUserName.toLowerCase().trim()) ||
          (mission.assigned_to_name && currentUser?.full_name && mission.assigned_to_name.toLowerCase().trim() === currentUser.full_name.toLowerCase().trim()) ||
          (mission.assigned_to_email && currentUser?.email && mission.assigned_to_email.toLowerCase().trim() === currentUser.email.toLowerCase().trim())
        );
        if (!isAssignedToMe) return false;
      } else {
        // En mode supervision Admin
        if (filterScope === 'received') {
          const isAssignedToMe = mission.assigned_to_id === currentUserId ||
            (mission.assigned_to_name && currentUserName && mission.assigned_to_name.toLowerCase().trim() === currentUserName.toLowerCase().trim());
          if (!isAssignedToMe) return false;
        } else if (filterScope === 'sent') {
          const isAssignedByMe = mission.assigned_by_id === currentUserId ||
            (mission.assigned_by_name && currentUserName && mission.assigned_by_name.toLowerCase().trim() === currentUserName.toLowerCase().trim());
          if (!isAssignedByMe) return false;
        }
      }

      // 2. Filtre émetteur (Scout A)
      if (selectedAssignerId !== 'all') {
        if (mission.assigned_by_id !== selectedAssignerId) return false;
      }

      // 3. Filtre destinataire (Scout B)
      if (selectedAssigneeId !== 'all') {
        if (mission.assigned_to_id !== selectedAssigneeId) return false;
      }

      // 4. Filtre statut
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'pending_ack') {
          const isPending = (mission.status === 'pending_ack' || (mission.status === 'pending' && !mission.acknowledged_at));
          if (!isPending) return false;
        } else if (selectedStatus === 'in_progress') {
          const isInProgress = mission.status === 'in_progress' || (mission.acknowledged_at && mission.status !== 'completed' && mission.status !== 'cancelled');
          if (!isInProgress) return false;
        } else if (selectedStatus === 'completed') {
          if (mission.status !== 'completed') return false;
        }
      }

      // 5. Filtre priorité
      if (selectedPriority !== 'all') {
        if ((mission.priority || 'medium') !== selectedPriority) return false;
      }

      // 6. Recherche textuelle (joueur, mission, scouts)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const candName = `${mission.candidate.first_name} ${mission.candidate.last_name}`.toLowerCase();
        const title = (mission.mission_title || '').toLowerCase();
        const desc = (mission.mission_description || '').toLowerCase();
        const assigner = (mission.assigned_by_name || '').toLowerCase();
        const assignee = (mission.assigned_to_name || '').toLowerCase();

        if (!candName.includes(q) && !title.includes(q) && !desc.includes(q) && !assigner.includes(q) && !assignee.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [
    allMissions, hasAdminSupervision, filterScope, currentUserId, currentUserName,
    selectedAssignerId, selectedAssigneeId, selectedStatus, selectedPriority, searchQuery
  ]);

  // KPIs
  const kpis = useMemo(() => {
    const total = allMissions.length;
    const pendingAck = allMissions.filter(m => (m.status === 'pending_ack' || (m.status === 'pending' && !m.acknowledged_at)) && m.status !== 'completed').length;
    const inProgress = allMissions.filter(m => (m.status === 'in_progress' || (m.acknowledged_at && m.status !== 'completed' && m.status !== 'cancelled'))).length;
    const completed = allMissions.filter(m => m.status === 'completed').length;

    // Décompte pour badge mes missions à accuser (masqué définitivement pour le Super Admin et l'Admin)
    const myPendingAck = isSuperAdminOrAdmin ? 0 : allMissions.filter(m =>
      (m.assigned_to_id === currentUserId || (m.assigned_to_name && currentUserName && m.assigned_to_name.toLowerCase().trim() === currentUserName.toLowerCase().trim()) || isScoutManager) &&
      (m.status === 'pending_ack' || (m.status === 'pending' && !m.acknowledged_at)) &&
      m.status !== 'completed'
    ).length;

    return { total, pendingAck, inProgress, completed, myPendingAck };
  }, [allMissions, currentUserId, currentUserName, isSuperAdminOrAdmin, isScoutManager]);

  // Action d'accusé de réception
  const handleAcknowledge = async (mission: EnrichedMission) => {
    try {
      setIsAcknowledgingId(mission.id);
      await onAcknowledgeMission(mission.candidate.id, mission.id);
      toast.success(`Accusé de réception confirmé pour "${mission.mission_title}" !`, {
        icon: '✅',
      });
    } catch (err: any) {
      toast.error(`Erreur accusé de réception : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setIsAcknowledgingId(null);
    }
  };

  // Helper couleur de badge poste
  const getPositionBadge = (pos?: string) => {
    if (!pos) return { label: 'N/A', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    const p = pos.toLowerCase();
    if (p.includes('gardien') || p.includes('gk')) return { label: pos, bg: 'bg-amber-100 text-amber-800 border-amber-300' };
    if (p.includes('défenseur') || p.includes('def') || p.includes('latéral') || p.includes('central')) return { label: pos, bg: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (p.includes('milieu') || p.includes('mid') || p.includes('sentinelle') || p.includes('meneur')) return { label: pos, bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    return { label: pos, bg: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  return (
    <div className="space-y-6">
      {/* BANDEAU DE TITRE & EN-TÊTE */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shadow-xs">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Missions de Détection & d'Observation</h1>
              {hasAdminSupervision && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  <Shield className="w-3.5 h-3.5" />
                  Supervision Globale
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Historisation, flux d'assignation Scout A ➔ Scout B et accusés de réception en direct.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* ALERTE BADGE SI MISSIONS À ACCUSER */}
          {kpis.myPendingAck > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium animate-pulse">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong className="font-bold text-amber-700">{kpis.myPendingAck}</strong> à accuser
              </span>
            </div>
          )}

          {/* ACTION ASSIGNER MISSION : RÉSERVÉE EXCLUSIVEMENT AUX SCOUT ADMINS */}
          {hasAdminSupervision && (
            <button
              type="button"
              onClick={() => {
                setSelectedCandidateForAssign(null);
                setModalCandidateSearch('');
                setIsAssignModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Target className="w-4 h-4" />
              <span>+ Assigner une mission</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Missions</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{kpis.total}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">En Attente d'Accusé</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{kpis.pendingAck}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">En Cours d'Observation</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{kpis.inProgress}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Missions Clôturées</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{kpis.completed}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* BARRE D'ONGLETS DE PORTÉE & RECHERCHE */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Sous-onglets de visibilité */}
          {hasAdminSupervision ? (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl max-w-fit">
              <button
                type="button"
                onClick={() => setFilterScope('all')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  filterScope === 'all'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                🌐 Toutes les Missions (Supervision)
              </button>
              <button
                type="button"
                onClick={() => setFilterScope('received')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
                  filterScope === 'received'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <span>📥 Missions Reçues (Moi)</span>
                {kpis.myPendingAck > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-black">
                    {kpis.myPendingAck}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setFilterScope('sent')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  filterScope === 'sent'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                📤 Missions Émises (Direction)
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold">
              <Shield className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Missions Reçues de la Direction ({filteredMissions.length})</span>
              {kpis.myPendingAck > 0 && (
                <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black ml-1">
                  {kpis.myPendingAck} à accuser
                </span>
              )}
            </div>
          )}

          {/* RECHERCHE */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher joueur, scout, intitulé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>
        </div>

        {/* FILTRES SECONDAIRES AVANCÉS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Émetteur (Scout A) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Assigné par (Scout A)
            </label>
            <select
              value={selectedAssignerId}
              onChange={(e) => setSelectedAssignerId(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              <option value="all">Tous les émetteurs</option>
              {scouts.map(s => (
                <option key={`assigner-${s.id}`} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>

          {/* Destinataire (Scout B) - Uniquement pour la Direction */}
          {hasAdminSupervision && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Assigné à (Scout B)
              </label>
              <select
                value={selectedAssigneeId}
                onChange={(e) => setSelectedAssigneeId(e.target.value)}
                className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="all">Tous les destinataires</option>
                {scouts.map(s => (
                  <option key={`assignee-${s.id}`} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Statut d'accusé */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Statut d'Accusé & Réalisation
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending_ack">⏳ En attente d'accusé de réception</option>
              <option value="in_progress">⚡ Pris en charge / En cours</option>
              <option value="completed">✓ Terminée / Clôturée</option>
            </select>
          </div>

          {/* Priorité */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Priorité
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              <option value="all">Toutes les priorités</option>
              <option value="urgent">🔴 Urgente</option>
              <option value="high">🟠 Haute</option>
              <option value="medium">🟡 Moyenne</option>
              <option value="low">⚪ Basse</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION DU PANIER DE DÉTECTION (REMPLACE OU SURPLOMBE LE BLOC D'ASSIGNATION CHEZ LE SCOUT ADMIN ET SUPER ADMIN) */}
      {hasAdminSupervision && (
        <ScoutingBasketSection
          scouts={scouts}
          isAdmin={isAdmin}
          isScoutAdmin={isScoutAdmin}
          isSuperAdmin={isSuperAdmin || isSuperAdminUser}
          onAssignMissionFromBasket={handleAssignMissionFromBasket}
          onAssignCandidateToScout={handleAssignCandidateToScout}
          className="mb-6"
        />
      )}

      {/* LISTE DES MISSIONS */}
      {filteredMissions.length === 0 ? (
        !hasAdminSupervision ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center mb-3">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Aucune mission correspondante
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Aucune mission d'observation ne vous a été assignée pour le moment par la Direction.
            </p>
          </div>
        ) : null
      ) : (
        <div className="space-y-3">
          {filteredMissions.map((mission) => {
            const cand = mission.candidate;
            const posBadge = getPositionBadge(cand.primary_position);
            const isPendingAck = (mission.status === 'pending_ack' || (mission.status === 'pending' && !mission.acknowledged_at)) && mission.status !== 'completed';
            const isAssignedToMe = Boolean(
              mission.assigned_to_id === currentUserId ||
              (mission.assigned_to_name && currentUserName && mission.assigned_to_name.toLowerCase().trim() === currentUserName.toLowerCase().trim())
            );
            // SUPPRESSION DÉFINITIVE DU BOUTON ACCUSER RÉCEPTION POUR LE SUPER ADMIN ET L'ADMIN ÉMETTEUR
            // SEUL LE SCOUT MANAGER OU LE SCOUT DE TERRAIN ASSIGNÉ (DESTINATAIRE) PEUT ACCUSER RÉCEPTION
            const canIAcknowledge = isPendingAck && !isSuperAdminOrAdmin && (isAssignedToMe || isScoutManager);
            const isAckLoading = isAcknowledgingId === mission.id;

            // Récupération des profils et photos des Scouts A et B
            const assignerScout = scouts.find(s =>
              s.id === mission.assigned_by_id ||
              (s.full_name && mission.assigned_by_name && s.full_name.toLowerCase().trim() === mission.assigned_by_name.toLowerCase().trim())
            );
            const assignerPhoto = mission.assigned_by_avatar || assignerScout?.photo_url;
            const assignerInitials = (mission.assigned_by_name || 'Direction')
              .split(' ')
              .map(n => n[0])
              .filter(Boolean)
              .join('')
              .slice(0, 2)
              .toUpperCase();

            const assigneeScout = scouts.find(s =>
              s.id === mission.assigned_to_id ||
              (s.full_name && mission.assigned_to_name && s.full_name.toLowerCase().trim() === mission.assigned_to_name.toLowerCase().trim())
            );
            const assigneePhoto = mission.assigned_to_avatar || assigneeScout?.photo_url;
            const assigneeInitials = (mission.assigned_to_name || 'Scout')
              .split(' ')
              .map(n => n[0])
              .filter(Boolean)
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={mission.id}
                draggable={hasAdminSupervision}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'mission_card',
                    candidateId: cand.id,
                    name: `${cand.first_name} ${cand.last_name}`,
                    candidateName: `${cand.first_name} ${cand.last_name}`,
                    missionId: mission.id,
                    missionTitle: mission.mission_title,
                    missionDescription: mission.mission_description,
                    priority: mission.priority,
                  }));
                  e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'mission_card',
                    candidateId: cand.id,
                    name: `${cand.first_name} ${cand.last_name}`,
                  }));
                  e.dataTransfer.effectAllowed = 'move';
                }}
                className={cn(
                  'bg-white rounded-2xl border transition-all p-4 sm:p-5 shadow-xs hover:shadow-md space-y-3.5 hover:border-purple-300 relative',
                  hasAdminSupervision && 'cursor-grab active:cursor-grabbing',
                  isPendingAck ? 'border-amber-200 bg-amber-50/15' : 'border-slate-200/90',
                  !mission.isActive && 'opacity-85 bg-slate-50/50'
                )}
              >
                {/* LIGNE 1 : IDENTITÉ DU JOUEUR & STATUT + ACTIONS */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  {/* Informations Joueur */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    {hasAdminSupervision && (
                      <div
                        className="hidden sm:flex items-center text-slate-300 hover:text-purple-600 cursor-grab active:cursor-grabbing p-1 -ml-1 rounded-md transition-colors shrink-0"
                        title="Glisser cette mission sur un scout pour la lui assigner"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}
                    <div className="relative shrink-0">
                      {cand.photo_url ? (
                        <img
                          src={cand.photo_url}
                          alt={`${cand.first_name} ${cand.last_name}`}
                          className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base border border-purple-200 shadow-2xs">
                          {cand.first_name?.[0]}{cand.last_name?.[0]}
                        </div>
                      )}
                      {mission.isActive && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" title="Mission active" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenCandidate(cand)}
                        className="font-extrabold text-sm sm:text-base text-slate-900 hover:text-purple-700 flex items-center gap-1.5 transition-colors text-left group"
                        title="Voir la fiche du joueur"
                      >
                        <span className="truncate">{cand.first_name} {cand.last_name}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition-colors shrink-0" />
                      </button>

                      {/* Badges Sportifs */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className={cn('px-2 py-0.5 rounded-lg font-bold border flex items-center gap-1 shadow-2xs', posBadge.bg)}>
                          <span>⚽</span>
                          <span>{posBadge.label}</span>
                        </span>

                        {cand.age_category && (
                          <span className="px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-semibold flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5 text-slate-400" />
                            <span>{cand.age_category}</span>
                          </span>
                        )}

                        {(cand.origin_club || cand.current_club) && (
                          <span className="px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium flex items-center gap-1 max-w-[150px] truncate" title={cand.origin_club || cand.current_club}>
                            <Building2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            <span className="truncate">{cand.origin_club || cand.current_club}</span>
                          </span>
                        )}

                        {cand.preferred_foot && (
                          <span className="px-1.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-medium text-[9px]">
                            {cand.preferred_foot}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Statut & Boutons d'Action */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                    {/* Statut Badge */}
                    {isPendingAck ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-100/90 text-amber-800 border border-amber-300 shadow-2xs">
                        <Clock className="w-3.5 h-3.5 animate-spin text-amber-700" />
                        <span>En attente d'accusé</span>
                      </span>
                    ) : mission.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-300 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Terminée</span>
                      </span>
                    ) : (
                      <div className="flex flex-col text-left sm:text-right">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
                          <Check className="w-3.5 h-3.5 text-blue-700" />
                          <span>Prise en charge</span>
                        </span>
                        {mission.acknowledged_at && (
                          <span className="text-[10px] text-slate-500 mt-0.5">
                            Accusé le {new Date(mission.acknowledged_at).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bouton Accuser Réception */}
                    {canIAcknowledge && (
                      <button
                        type="button"
                        disabled={isAckLoading}
                        onClick={() => handleAcknowledge(mission)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                        title="Confirmer la prise en charge et envoyer l'accusé de réception"
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>{isAckLoading ? 'Validation...' : 'Accuser réception'}</span>
                      </button>
                    )}

                    {/* Profil Joueur, Rapport & Assigner */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {hasAdminSupervision && (
                        mission.isActive ? (
                          <button
                            type="button"
                            onClick={() => setMissionToUnassign(mission)}
                            className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                            title="Retirer cette mission au scout actuel pour libérer le joueur avant toute réassignation"
                          >
                            <UserMinus className="w-3.5 h-3.5 text-amber-700" />
                            <span>Retirer du scout</span>
                          </button>
                        ) : !cand.active_mission ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCandidateForAssign(cand);
                              setIsAssignModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50/80 hover:bg-purple-100 text-purple-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                            title="Assigner ou confier une nouvelle mission pour ce joueur libre"
                          >
                            <Target className="w-3.5 h-3.5 text-purple-600" />
                            <span>Assigner</span>
                          </button>
                        ) : null
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenCandidate(cand)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-300 text-slate-700 hover:text-purple-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        title="Consulter le profil et le dossier complet du joueur"
                      >
                        <Eye className="w-3.5 h-3.5 text-purple-600" />
                        <span>Profil Joueur</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigateToReport(cand.id)}
                        className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-purple-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        title="Rédiger un rapport d'observation pour ce joueur"
                      >
                        <FileText className="w-3.5 h-3.5 text-purple-600" />
                        <span>Rapport</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* LIGNE 2 : DÉTAILS DE LA MISSION & FLUX SCOUT (GRID RESPONSIVE SANS COLLISION) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center">
                  {/* Colonne Gauche : Détails Mission, Verrouillage, Priorité, Description, Dates */}
                  <div className="lg:col-span-7 xl:col-span-8 space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                        <span>🎯</span>
                        <span>{mission.mission_title}</span>
                      </h4>
                      {mission.is_locked && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs" title="Ordre de mission ordonné par la Direction (Scout Admin) - Non réassignable">
                          <Lock className="w-3 h-3 text-amber-700" />
                          Verrouillé
                        </span>
                      )}
                      {mission.priority && (
                        <span className={cn(
                          'px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shadow-2xs',
                          mission.priority === 'urgent' && 'bg-red-100 text-red-700 border border-red-200',
                          mission.priority === 'high' && 'bg-amber-100 text-amber-800 border border-amber-200',
                          mission.priority === 'medium' && 'bg-blue-100 text-blue-700 border border-blue-200',
                          mission.priority === 'low' && 'bg-slate-100 text-slate-600 border border-slate-200'
                        )}>
                          {mission.priority}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2" title={mission.mission_description}>
                      {mission.mission_description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Assigné : <strong className="text-slate-700 font-semibold">{mission.assigned_at ? new Date(mission.assigned_at).toLocaleDateString('fr-FR') : 'Récemment'}</strong></span>
                      </span>
                      {mission.due_date && (
                        <span className="flex items-center gap-1 text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Échéance : {new Date(mission.due_date).toLocaleDateString('fr-FR')}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Colonne Droite : Émetteur ou Flux Initiateur -> Assigné avec Photos de Profil */}
                  <div className="lg:col-span-5 xl:col-span-4 min-w-0">
                    {!hasAdminSupervision ? (
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-purple-50/70 border border-purple-200/80 shadow-2xs">
                        <div className="relative shrink-0">
                          {assignerPhoto ? (
                            <img
                              src={assignerPhoto}
                              alt={mission.assigned_by_name || 'Scout Admin'}
                              className="w-10 h-10 rounded-full object-cover border-2 border-purple-300 shadow-2xs"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                              {assignerInitials}
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-purple-600 text-white rounded-full flex items-center justify-center text-[9px] border border-white" title="Ordre émis par Scout Admin">
                            <Shield className="w-2.5 h-2.5" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase font-bold text-purple-700 tracking-wider">Ordre Émis par</p>
                          <p className="text-xs font-black text-slate-900 truncate" title={mission.assigned_by_name}>
                            {mission.assigned_by_name || 'Direction Scouting (Scout Admin)'}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {assignerScout?.role_title || 'Scout Admin / Direction'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-2xs">
                        {/* Scout Initiateur (A) avec Photo de Profil */}
                        <div className="flex-1 flex items-center gap-2 min-w-0 px-1">
                          <div className="relative shrink-0">
                            {assignerPhoto ? (
                              <img
                                src={assignerPhoto}
                                alt={mission.assigned_by_name || 'Scout A'}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-2xs"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shadow-2xs">
                                {assignerInitials}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] uppercase font-bold text-slate-500 truncate">Scout A (Émetteur)</p>
                            <p className="text-xs font-extrabold text-slate-900 truncate" title={mission.assigned_by_name}>
                              {mission.assigned_by_name || 'Direction Scouting'}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {assignerScout?.role_title || 'Scout Admin'}
                            </p>
                          </div>
                        </div>

                        {/* Flèche de flux */}
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>

                        {/* Scout Assigné (B) avec Photo de Profil */}
                        <div className="flex-1 flex items-center gap-2 min-w-0 px-1">
                          <div className="relative shrink-0">
                            {assigneePhoto ? (
                              <img
                                src={assigneePhoto}
                                alt={mission.assigned_to_name}
                                className="w-9 h-9 rounded-full object-cover border-2 border-purple-400 ring-2 ring-purple-100 shadow-2xs"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs border border-purple-200 shadow-2xs">
                                {assigneeInitials}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] uppercase font-bold text-purple-700 truncate">Scout B (Assigné)</p>
                            <p className="text-xs font-black text-purple-950 truncate" title={mission.assigned_to_name}>
                              {mission.assigned_to_name}
                            </p>
                            <p className="text-[10px] text-purple-600/80 truncate">
                              {assigneeScout?.recruitment_region || assigneeScout?.role_title || 'Scout'}
                            </p>
                            {hasAdminSupervision && scouts.length > 0 && (
                              <div className="mt-1">
                                <select
                                  value={mission.assigned_to_id || ''}
                                  onChange={async (e) => {
                                    const newScoutId = e.target.value;
                                    if (!newScoutId || newScoutId === mission.assigned_to_id) return;
                                    const targetScout = scouts.find(s => s.id === newScoutId);
                                    if (targetScout) {
                                      await handleAssignCandidateToScout(cand.id, targetScout, {
                                        missionTitle: mission.mission_title,
                                        missionDescription: mission.mission_description,
                                        priority: mission.priority,
                                      });
                                      toast.success(`Mission réassignée avec succès à ${targetScout.full_name}`);
                                    }
                                  }}
                                  className="text-[10px] py-0.5 px-1 rounded-lg border border-purple-200 bg-purple-50/70 hover:bg-white text-purple-900 font-bold focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer max-w-[130px]"
                                  title="Réassigner cette mission à un autre scout"
                                >
                                  <option value={mission.assigned_to_id || ''}>Changer scout...</option>
                                  {scouts.map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.full_name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL D'ASSIGNATION DE MISSION (RÉSERVÉE EXCLUSIVEMENT AUX SCOUT ADMINS) */}
      {isAssignModalOpen && hasAdminSupervision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150 custom-scrollbar">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs shrink-0">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">
                      Assigner une mission d'observation
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                      Scout Admin
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Déléguez l'observation d'un joueur à un scout de terrain et historisez les consignes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setSelectedCandidateForAssign(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ÉTAPE 1 : JOUEUR CIBLE (AVEC PHOTO DE PROFIL) */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <span>1. Joueur Cible (Candidat) *</span>
              </label>

              {selectedCandidateForAssign ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-200 shadow-2xs bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base">
                      {selectedCandidateForAssign.photo_url ? (
                        <img
                          src={selectedCandidateForAssign.photo_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{selectedCandidateForAssign.first_name?.[0]}{selectedCandidateForAssign.last_name?.[0]}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-900 truncate">
                          {selectedCandidateForAssign.first_name} {selectedCandidateForAssign.last_name}
                        </h4>
                        {selectedCandidateForAssign.age_category && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                            {selectedCandidateForAssign.age_category}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate flex items-center gap-1.5">
                        <span>{selectedCandidateForAssign.primary_position || 'Poste N/A'}</span>
                        {selectedCandidateForAssign.current_club && (
                          <>
                            <span>•</span>
                            <span className="truncate">{selectedCandidateForAssign.current_club}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedCandidateForAssign(null)}
                    className="px-2.5 py-1 text-xs font-bold text-purple-700 hover:text-purple-900 hover:bg-purple-100/60 rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    Changer
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Rechercher par nom, poste, catégorie, club..."
                      value={modalCandidateSearch}
                      onChange={(e) => setModalCandidateSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50 custom-scrollbar">
                    {filteredCandidatesForAssign.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-400">Aucun joueur trouvé</p>
                    ) : (
                      filteredCandidatesForAssign.map((cand) => (
                        <div
                          key={cand.id}
                          onClick={() => setSelectedCandidateForAssign(cand)}
                          className="p-2.5 hover:bg-purple-50/80 cursor-pointer transition-colors flex items-center gap-3 group"
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shadow-2xs">
                            {cand.photo_url ? (
                              <img src={cand.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{cand.first_name?.[0]}{cand.last_name?.[0]}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700 truncate">
                              {cand.first_name} {cand.last_name}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {cand.primary_position} • {cand.age_category || 'U15'} {cand.current_club ? `• ${cand.current_club}` : ''}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            Sélectionner →
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ÉTAPE 2 : SCOUT B ASSIGNÉ (AVEC PHOTOS DE PROFIL) */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 flex items-center justify-between uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                  2. Scout de Terrain Assigné (Scout B) *
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {scouts.length} scout{scouts.length > 1 ? 's' : ''} actif{scouts.length > 1 ? 's' : ''}
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50 custom-scrollbar">
                {scouts.map((s) => {
                  const isSelected = modalScoutId === s.id;
                  const initials = s.full_name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();
                  const countFollowed = candidates.filter(
                    c => c.assigned_scout_id === s.id || c.discovering_scout_id === s.id
                  ).length;

                  return (
                    <div
                      key={s.id}
                      onClick={() => setModalScoutId(s.id)}
                      className={cn(
                        'p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 shadow-2xs',
                        isSelected
                          ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-100/80 hover:border-purple-200'
                      )}
                    >
                      {/* Photo de Profil du Scout */}
                      <div className="relative shrink-0">
                        {s.photo_url ? (
                          <img
                            src={s.photo_url}
                            alt={s.full_name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs"
                          />
                        ) : (
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs",
                            isSelected ? "bg-purple-600 text-white" : "bg-purple-100 text-purple-700"
                          )}>
                            {initials}
                          </div>
                        )}
                        {isSelected && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-xs border border-white">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={cn("text-xs font-bold truncate", isSelected ? "text-purple-950 font-black" : "text-slate-900")}>
                          {s.full_name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {s.role_title || 'Scout'} • {s.recruitment_region || 'Maroc'}
                        </p>
                        <p className="text-[9px] text-purple-600 font-semibold truncate">
                          {countFollowed} joueur{countFollowed > 1 ? 's' : ''} suivi{countFollowed > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ÉTAPE 3 : DÉTAILS DE LA MISSION */}
            <div className="space-y-3.5 pt-1 border-t border-slate-100">
              <label className="text-xs font-black text-slate-800 block uppercase tracking-wider">
                3. Détails & Consignes de la Mission *
              </label>

              {/* Suggestions de titres */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500">Intitulé de la mission :</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Observation en match officiel',
                    'Suivi séance d\'entraînement',
                    'Évaluation en tournoi',
                    'Revue technico-tactique',
                    'custom'
                  ].map((t) => {
                    const isCustom = t === 'custom';
                    const active = modalMissionTitle === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setModalMissionTitle(t)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border',
                          active
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        )}
                      >
                        {isCustom ? 'Autre (personnalisé)...' : t}
                      </button>
                    );
                  })}
                </div>

                {modalMissionTitle === 'custom' && (
                  <input
                    type="text"
                    placeholder="Saisissez un titre personnalisé..."
                    value={modalCustomTitle}
                    onChange={(e) => setModalCustomTitle(e.target.value)}
                    className="w-full mt-2 px-3 py-2 text-xs rounded-xl border border-purple-300 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 font-medium"
                  />
                )}
              </div>

              {/* Priorité & Échéance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Niveau de Priorité
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: 'low', label: 'Basse' },
                      { id: 'medium', label: 'Moyenne' },
                      { id: 'high', label: 'Haute' },
                      { id: 'urgent', label: 'Urgente' },
                    ].map((p) => {
                      const isSel = modalPriority === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setModalPriority(p.id as any)}
                          className={cn(
                            'py-1.5 text-center text-xs font-bold rounded-lg border transition-all cursor-pointer',
                            isSel
                              ? p.id === 'urgent'
                                ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                                : p.id === 'high'
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                                  : p.id === 'medium'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                    : 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          )}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Date d'Échéance Souhaitée
                  </label>
                  <input
                    type="date"
                    value={modalDueDate}
                    onChange={(e) => setModalDueDate(e.target.value)}
                    className="w-full text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                  />
                </div>
              </div>

              {/* Consignes spécifiques */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Consignes & Objectifs Spécifiques
                </label>
                <textarea
                  rows={3}
                  value={modalMissionDesc}
                  onChange={(e) => setModalMissionDesc(e.target.value)}
                  placeholder="Ex : Observer en priorité le pied faible, la vitesse de transition et l'attitude sous pression..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 -mx-6 -mb-6 sm:-mx-7 sm:-mb-7 rounded-b-3xl flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmittingMission}
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setSelectedCandidateForAssign(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isSubmittingMission || !selectedCandidateForAssign || !modalScoutId}
                onClick={handleConfirmModalAssign}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingMission ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Assignation en cours...</span>
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4" />
                    <span>Confirmer l'assignation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de retrait de scout */}
      {missionToUnassign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 ring-8 ring-amber-50/50">
                <UserMinus className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-1">
                Retirer la mission du scout ?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Êtes-vous sûr de vouloir retirer cette mission d'observation ? La mission en cours sera clôturée et archivée, et le joueur redeviendra disponible pour une nouvelle assignation.
              </p>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 mb-4 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-medium text-slate-400">Joueur :</span>
                  <span className="font-bold text-slate-800">{missionToUnassign.candidateName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-medium text-slate-400">Scout actuel :</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {missionToUnassign.scoutName}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isUnassigning}
                  onClick={() => setMissionToUnassign(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isUnassigning}
                  onClick={confirmUnassignMission}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUnassigning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Retrait en cours...</span>
                    </>
                  ) : (
                    <>
                      <UserMinus className="w-4 h-4" />
                      <span>Confirmer le retrait</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionsManagementView;
