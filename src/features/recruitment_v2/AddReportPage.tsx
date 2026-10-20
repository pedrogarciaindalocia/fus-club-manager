import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, ClipboardList, UserPlus, AlertCircle } from 'lucide-react';
import { useRecruitment } from './hooks/useRecruitment';
import CandidateModal from './components/CandidateModal';
import PlayerSelect from './components/PlayerSelect';
import { usePermissions } from '../../context/PermissionsContext';
import { toast } from 'sonner';

/**
 * Page dédiée "Ajouter un rapport" — affiche le sélecteur du joueur en premier lieu
 * puis le formulaire Rapport Joueur (1. Observation Terrain, 2. Qualités, 3. Rapport de Scout).
 * Route : /recruitment-v2/add-report
 */
const AddReportPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { authState, hasSubModuleAccess } = usePermissions();
  const returnTab = searchParams.get('returnTab') || 'candidates';
  const candidateIdFromUrl = searchParams.get('candidateId') || (location.state as any)?.candidateId;
  const editReportId = searchParams.get('editReportId') || (location.state as any)?.editReportId;

  const { candidates, scouts, evaluations, updateCandidate, saveEvaluation } = useRecruitment();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(candidateIdFromUrl || '');

  // Trouver l'évaluation à modifier si editReportId est passé
  const evaluationToEdit = editReportId ? evaluations.find(e => e.id === editReportId) : null;

  const userRoles = [
    ...(authState?.roles || []),
    authState?.user?.system_role || '',
    authState?.user?.role || ''
  ].map(r => r.toLowerCase().trim());
  const isSuperAdmin = userRoles.includes('super_admin') || Boolean(authState?.isRealSuperAdmin);
  const isAdmin = isSuperAdmin || userRoles.includes('admin') || userRoles.includes('scout_admin');

  // Permission spécifique de gestion de rapport
  const canManageReports = Boolean(
    isSuperAdmin ||
    isAdmin ||
    hasSubModuleAccess('candidates', 'manage_reports') ||
    hasSubModuleAccess('candidates', 'reports')
  );

  const currentScout = scouts.find((s) => {
    if (authState?.user?.email && s.email && s.email.toLowerCase() === authState.user.email.toLowerCase()) return true;
    if (authState?.user?.full_name && s.full_name && s.full_name.toLowerCase() === authState.user.full_name.toLowerCase()) return true;
    return false;
  });

  const isCandidateIntroducedByScout = (cand: any): boolean => {
    if (!cand) return false;
    const userId = authState?.user?.id;
    const scoutId = currentScout?.id;
    const scoutName = (currentScout?.full_name || authState?.user?.full_name || '').toLowerCase().trim();

    if (userId && (cand.created_by === userId || cand.user_id === userId)) return true;
    if (scoutId && cand.discovering_scout_id === scoutId) return true;
    if (scoutName && cand.discovering_scout_name && cand.discovering_scout_name.toLowerCase().trim() === scoutName) return true;
    if (scoutId && cand.recruiter_id === scoutId) return true;
    if (scoutName && cand.recruiter_name && cand.recruiter_name.toLowerCase().trim() === scoutName) return true;
    return false;
  };

  const isCandidateAssignedToScout = (cand: any): boolean => {
    if (!cand) return false;
    const userId = authState?.user?.id;
    const scoutId = currentScout?.id;
    const scoutName = (currentScout?.full_name || authState?.user?.full_name || '').toLowerCase().trim();

    if (scoutId && cand.assigned_scout_id === scoutId) return true;
    if (scoutName && cand.assigned_scout_name && cand.assigned_scout_name.toLowerCase().trim() === scoutName) return true;
    if (scoutId && cand.active_mission?.assigned_to_id === scoutId) return true;
    if (scoutName && cand.active_mission?.assigned_to_name && cand.active_mission.assigned_to_name.toLowerCase().trim() === scoutName) return true;
    if (userId && cand.active_mission?.assigned_to_id === userId) return true;
    if (cand.assigned_scouts?.some((s: any) => (scoutId && s.id === scoutId) || (userId && s.id === userId) || (scoutName && s.name && s.name.toLowerCase().trim() === scoutName))) return true;
    if (cand.mission_history?.some((m: any) => (scoutId && m.assigned_to_id === scoutId) || (userId && m.assigned_to_id === userId) || (scoutName && m.assigned_to_name && m.assigned_to_name.toLowerCase().trim() === scoutName))) return true;
    return false;
  };

  const isEvaluationAuthoredByScout = (ev: any): boolean => {
    if (!ev) return false;
    if (isSuperAdmin || isAdmin) return true;
    const userId = authState?.user?.id;
    const scoutId = currentScout?.id;
    const scoutName = (currentScout?.full_name || '').toLowerCase().trim();
    const userName = (authState?.user?.full_name || '').toLowerCase().trim();

    if (userId && (ev.created_by === userId || ev.user_id === userId)) return true;
    if (scoutId && (ev.evaluator_id === scoutId || ev.scout_id === scoutId)) return true;
    if (userId && (ev.evaluator_id === userId || ev.scout_id === userId)) return true;
    if (scoutName && ev.evaluator_name && ev.evaluator_name.toLowerCase().trim() === scoutName) return true;
    if (userName && ev.evaluator_name && ev.evaluator_name.toLowerCase().trim() === userName) return true;
    return false;
  };

  const canAddReportForCandidate = (cand: any): boolean => {
    if (!cand) return false;
    if (isSuperAdmin || isAdmin) return true;
    return isCandidateIntroducedByScout(cand) || isCandidateAssignedToScout(cand);
  };

  // Liste des candidats éligibles pour rédiger un rapport :
  // - Tous pour les admins
  // - Pour un scout : ses propres joueurs découverts OU les joueurs avec mission d'observation assignée
  const eligibleCandidates = React.useMemo(() => {
    if (isAdmin || isSuperAdmin) return candidates;
    return candidates.filter(c => canAddReportForCandidate(c));
  }, [candidates, isAdmin, isSuperAdmin, currentScout, authState?.user]);

  // Synchroniser avec l'URL ou le joueur concerné par l'évaluation
  useEffect(() => {
    if (evaluationToEdit?.candidate_id) {
      setSelectedCandidateId(evaluationToEdit.candidate_id);
    } else if (candidateIdFromUrl) {
      setSelectedCandidateId(candidateIdFromUrl);
    } else if (!selectedCandidateId && eligibleCandidates.length > 0) {
      setSelectedCandidateId(eligibleCandidates[0].id);
    }
  }, [candidateIdFromUrl, evaluationToEdit, eligibleCandidates, selectedCandidateId]);

  const selectedCandidate = candidates.find((c) => c.id === selectedCandidateId) || null;

  useEffect(() => {
    // 0. Permission de gestion des rapports requise
    if (!canManageReports) {
      toast.error("Accès non autorisé : la permission 'Gestion de rapport' est requise.");
      navigate(`/recruitment-v2?tab=${returnTab}`);
      return;
    }

    // 1. En cas de modification d'un rapport existant
    if (evaluationToEdit && !isEvaluationAuthoredByScout(evaluationToEdit)) {
      toast.error("Modification non autorisée : vous ne pouvez pas modifier un rapport rédigé par un autre scout.");
      navigate(`/recruitment-v2?tab=${returnTab}`);
      return;
    }

    // 2. En cas de création de rapport sur un joueur cible
    if (!evaluationToEdit && selectedCandidate && !isAdmin && !isSuperAdmin && !canAddReportForCandidate(selectedCandidate)) {
      toast.error("Création de rapport non autorisée : vous n'avez pas de mission d'observation assignée pour ce joueur.");
      navigate(`/recruitment-v2?tab=${returnTab}`);
      return;
    }
  }, [canManageReports, evaluationToEdit, selectedCandidate, isAdmin, isSuperAdmin, currentScout, authState?.user, returnTab, navigate]);

  const handlePlayerChange = (candId: string) => {
    setSelectedCandidateId(candId);
    if (candId) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('candidateId', candId);
        next.set('returnTab', returnTab);
        return next;
      });
    }
  };

  const handleClose = () => {
    if (selectedCandidateId) {
      navigate(`/recruitment-v2?tab=${returnTab}&candidateId=${selectedCandidateId}&detailTab=report`);
    } else {
      navigate(`/recruitment-v2?tab=${returnTab}`);
    }
  };

  const handleSave = async (
    candidateData: any,
    evaluationData?: any
  ) => {
    if (selectedCandidate?.id) {
      // Mise à jour de la fiche joueur UNIQUEMENT si le scout en a la propriété ou est admin
      if (isAdmin || isSuperAdmin || isCandidateIntroducedByScout(selectedCandidate)) {
        await updateCandidate({ id: selectedCandidate.id, updates: candidateData });
      }
      if (evaluationData) {
        await saveEvaluation(
          {
            ...evaluationData,
            id: editReportId || evaluationData.id,
            candidate_id: selectedCandidate.id,
            evaluator_id: evaluationData.evaluator_id || currentScout?.id || authState?.user?.id,
            evaluator_name: evaluationData.evaluator_name || currentScout?.full_name || authState?.user?.full_name || 'Scout FUS',
          },
          editReportId ? { updateId: editReportId } : undefined
        );
      }
      toast.success(editReportId ? 'Rapport mis à jour avec succès !' : `Rapport de scout enregistré pour ${selectedCandidate.first_name} ${selectedCandidate.last_name} !`);
    } else {
      toast.success('Rapport de scout enregistré avec succès !');
    }
    if (selectedCandidate?.id) {
      navigate(`/recruitment-v2?tab=${returnTab}&candidateId=${selectedCandidate.id}&detailTab=report`);
    } else {
      navigate(`/recruitment-v2?tab=${returnTab}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Barre de navigation de la page */}
      <div className="bg-white rounded-2xl border shadow-sm px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {returnTab === 'scouts' ? 'Retour au Personnel' : 'Retour à la Database'}
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 leading-tight">
                {evaluationToEdit
                  ? `Modifier le Rapport : ${evaluationToEdit.report_title || 'Rapport'}`
                  : selectedCandidate
                  ? `Rapport : ${selectedCandidate.first_name} ${selectedCandidate.last_name}`
                  : 'Rédiger un Rapport'}
              </h1>
              <p className="text-[11px] text-slate-500">
                Recrutement & Détection V2 — Évaluation Technico-Tactique & Scout
              </p>
            </div>
          </div>
        </div>

        {/* Bouton pour créer un joueur si non existant */}
        {!editReportId && (
          <button
            onClick={() => navigate('/recruitment-v2/add-player?returnTab=candidates')}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Créer un nouveau joueur</span>
          </button>
        )}
      </div>

      {/* ── ÉTAPE 1 : SÉLECTEUR DU JOUEUR ASSIGNÉ AU RAPPORT ── */}
      <div className="max-w-5xl mx-auto">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/40 border border-indigo-100/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-100/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                1
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Assignation du Joueur
                </h4>
                <p className="text-[11px] text-slate-500">
                  {editReportId ? 'Joueur évalué dans ce rapport.' : 'Choisissez le joueur concerné par cette séance d\'évaluation ou observation terrain.'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <PlayerSelect
              candidates={eligibleCandidates}
              value={selectedCandidateId}
              onChange={handlePlayerChange}
              label="Joueur Cible"
              placeholder="Rechercher par nom, poste, catégorie ou club..."
              helperText="Les observations, notes par piliers et décisions de scout seront automatiquement attachées à ce profil."
            />
          </div>
        </div>
      </div>

      {/* ── ÉTAPE 2 : FORMULAIRE DU RAPPORT (Observation Terrain, Qualités, Rapport Scout) ── */}
      <div className="max-w-5xl mx-auto">
        {selectedCandidate ? (
          <CandidateModal
            key={`${selectedCandidate.id}-${editReportId || 'new'}`}
            isOpen={true}
            mode="report_only"
            initialTab="sport"
            onClose={handleClose}
            candidate={selectedCandidate}
            evaluation={evaluationToEdit}
            scouts={scouts}
            onSave={handleSave}
          />
        ) : (
          <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">
                {eligibleCandidates.length === 0 ? "Aucun joueur éligible pour rapport" : "Aucun joueur sélectionné"}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {eligibleCandidates.length === 0
                  ? "Vous n'avez pas de joueur introduit ni de mission d'observation assignée par la direction pour rédiger un rapport. Vous pouvez créer un nouveau joueur."
                  : "Veuillez sélectionner un joueur dans la liste ci-dessus ou en créer un nouveau pour rédiger votre rapport."}
              </p>
            </div>
            <button
              onClick={() => navigate('/recruitment-v2/add-player?returnTab=candidates')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all shadow-md shadow-primary/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>Créer un joueur d'abord</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddReportPage;
