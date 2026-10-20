import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, UserPlus, CheckCircle2, ClipboardList, Database } from 'lucide-react';
import { useRecruitment } from './hooks/useRecruitment';
import { usePermissions } from '../../context/PermissionsContext';
import CandidateModal from './components/CandidateModal';

import { toast } from 'sonner';

/**
 * Page dédiée "Ajouter un joueur" — affiche le formulaire CandidateModal
 * en pleine page indépendante (sans overlay modal).
 * Route : /recruitment-v2/add-player
 */
const AddPlayerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authState, hasSubModuleAccess, canManageCategory } = usePermissions();
  const scoutIdParam = searchParams.get('scoutId') || undefined;
  const editIdParam = searchParams.get('editId') || undefined;
  const returnTab = searchParams.get('returnTab') || 'candidates';

  const { scouts, candidates, createCandidate, updateCandidate } = useRecruitment();
  const isSavingRef = useRef(false);
  const [createdCandidateInfo, setCreatedCandidateInfo] = useState<{ id: string; name: string } | null>(null);

  const candidateToEdit = editIdParam ? (candidates.find(c => c.id === editIdParam) || null) : null;

  const currentScout = scouts.find(s => 
    (s.email && s.email.toLowerCase().trim() === authState?.user?.email?.toLowerCase().trim()) ||
    s.id === authState?.user?.id ||
    (s.full_name && s.full_name.toLowerCase().trim() === authState?.user?.full_name?.toLowerCase().trim())
  );
  const effectiveScoutId = scoutIdParam || currentScout?.id || authState?.user?.id || undefined;

  const userRoles = [
    ...(authState?.roles || []),
    authState?.user?.system_role || '',
    authState?.user?.role || ''
  ].map(r => r.toLowerCase().trim());
  const isSuperAdmin = userRoles.includes('super_admin') || Boolean(authState?.isRealSuperAdmin);
  const isAdmin = isSuperAdmin || userRoles.includes('admin') || userRoles.includes('scout_admin');
  const isScoutManager = !isAdmin && (
    userRoles.includes('scout_manager') ||
    userRoles.includes('manager') ||
    (authState?.user?.job_title && authState.user.job_title.toLowerCase().includes('scout manager'))
  );

  const canCreateCandidate = Boolean(isSuperAdmin || hasSubModuleAccess('candidates', 'create'));
  const canUpdateCandidate = Boolean(
    isSuperAdmin || 
    hasSubModuleAccess('candidates', 'edit_player') || 
    hasSubModuleAccess('candidates', 'update')
  );

  useEffect(() => {
    // 1. Mode ajout d'un joueur : vérification du droit CRUD 'create'
    if (!candidateToEdit && !editIdParam && !isAdmin && !isSuperAdmin && !canCreateCandidate) {
      toast.error("Action refusée : vous n'avez pas la permission d'ajouter un joueur (candidates:create).");
      navigate(`/recruitment-v2?tab=${returnTab}`);
      return;
    }

    // 2. Mode modification d'un joueur : vérification du droit CRUD 'update', de la catégorie et de l'appartenance
    if (candidateToEdit) {
      if (!isAdmin && !isSuperAdmin && !canUpdateCandidate) {
        toast.error("Action refusée : vous n'avez pas la permission de modifier ce joueur (candidates:update).");
        navigate(`/recruitment-v2?tab=${returnTab}`);
        return;
      }

      const userId = authState?.user?.id;
      const scoutId = currentScout?.id;
      const scoutName = (currentScout?.full_name || authState?.user?.full_name || '').toLowerCase().trim();
      const userName = (authState?.user?.full_name || '').toLowerCase().trim();
      const isIntroducedByScout = Boolean(
        (userId && ((candidateToEdit as any).created_by === userId || (candidateToEdit as any).user_id === userId)) ||
        (userId && (candidateToEdit.discovering_scout_id === userId || candidateToEdit.recruiter_id === userId)) ||
        (scoutId && (candidateToEdit.discovering_scout_id === scoutId || candidateToEdit.recruiter_id === scoutId)) ||
        (scoutName && (
          (candidateToEdit.discovering_scout_name && candidateToEdit.discovering_scout_name.toLowerCase().trim() === scoutName) ||
          (candidateToEdit.recruiter_name && candidateToEdit.recruiter_name.toLowerCase().trim() === scoutName)
        )) ||
        (userName && (
          (candidateToEdit.discovering_scout_name && candidateToEdit.discovering_scout_name.toLowerCase().trim() === userName) ||
          (candidateToEdit.recruiter_name && candidateToEdit.recruiter_name.toLowerCase().trim() === userName)
        ))
      );

      if (!isAdmin && !isSuperAdmin && !isIntroducedByScout) {
        toast.error("Modification non autorisée : vous ne pouvez modifier que les profils des joueurs que vous avez introduits.");
        navigate(`/recruitment-v2?tab=${returnTab}`);
        return;
      }

      if (!isAdmin && !isSuperAdmin && !isIntroducedByScout && candidateToEdit.age_category && !canManageCategory(candidateToEdit.age_category)) {
        toast.error(`Modification non autorisée : la catégorie ${candidateToEdit.age_category} ne vous est pas assignée.`);
        navigate(`/recruitment-v2?tab=${returnTab}`);
        return;
      }
    }
  }, [candidateToEdit, editIdParam, isAdmin, isSuperAdmin, canCreateCandidate, canUpdateCandidate, canManageCategory, authState?.user, currentScout, returnTab, navigate]);

  const handleClose = () => {
    // Si la sauvegarde est en cours ou effectuée, ne pas annuler vers scouts
    if (isSavingRef.current) {
      return;
    }
    navigate(`/recruitment-v2?tab=${returnTab}`);
  };

  const handleSave = async (
    candidateData: Parameters<typeof createCandidate>[0]
  ) => {
    // Vérification des droits CRUD lors de la soumission
    if (candidateToEdit) {
      if (!isAdmin && !isSuperAdmin && !canUpdateCandidate) {
        toast.error("Action refusée : vous n'avez pas la permission de modifier ce joueur (candidates:update).");
        return;
      }
    } else {
      if (!isAdmin && !isSuperAdmin && !canCreateCandidate) {
        toast.error("Action refusée : vous n'avez pas la permission d'ajouter un joueur (candidates:create).");
        return;
      }
    }

    if (!isAdmin && !isSuperAdmin && !candidateToEdit && candidateData.age_category && !canManageCategory(candidateData.age_category)) {
      toast.error(`Action refusée : la catégorie ${candidateData.age_category} ne vous est pas assignée.`);
      return;
    }

    isSavingRef.current = true;
    try {
      const enrichedData = {
        ...candidateData,
        created_by: authState?.user?.id,
        discovering_scout_id: candidateData.discovering_scout_id || effectiveScoutId,
        discovering_scout_name: candidateData.discovering_scout_name || currentScout?.full_name || authState?.user?.full_name || 'Scout FUS',
      };
      if (candidateToEdit) {
        await updateCandidate({ id: candidateToEdit.id, updates: enrichedData });
        toast.success(`Fiche de ${candidateToEdit.first_name} ${candidateToEdit.last_name} mise à jour avec succès !`);
        navigate(`/recruitment-v2?tab=${returnTab}`);
      } else {
        const created = await createCandidate(enrichedData);
        const candId = (created as any)?.id || '';
        const candName = `${candidateData.first_name} ${candidateData.last_name}`.trim() || 'le joueur';
        setCreatedCandidateInfo({ id: candId, name: candName });
      }
    } catch (err) {
      console.error('[AddPlayerPage] Erreur lors de la création/modification du candidat:', err);
      isSavingRef.current = false;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Barre de navigation de la page */}
      <div className="bg-white rounded-2xl border shadow-sm px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/recruitment-v2?tab=${returnTab}`)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {returnTab === 'scouts' ? 'Retour au Personnel' : 'Retour à la Database'}
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 leading-tight">
                {candidateToEdit ? `Modifier Joueur : ${candidateToEdit.first_name} ${candidateToEdit.last_name}` : 'Nouveau Joueur'}
              </h1>
              <p className="text-[11px] text-slate-500">
                Recrutement & Détection V2 — {returnTab === 'scouts' ? 'Personnel & Scouts' : 'Base de données'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu du formulaire */}
      <div className="max-w-5xl mx-auto">
        <CandidateModal
          isOpen={true}
          mode="player_only"
          initialScoutId={effectiveScoutId}
          onClose={handleClose}
          candidate={candidateToEdit}
          scouts={scouts}
          onSave={handleSave}
        />
      </div>

      {/* Popup de confirmation : Aller dans la Database ou ajouter un rapport */}
      {createdCandidateInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900">
                Joueur enregistré avec succès !
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                La fiche de <strong className="text-slate-800">{createdCandidateInfo.name}</strong> a bien été ajoutée dans la <strong className="text-primary font-bold">Database</strong> des joueurs.
              </p>
              <div className="p-3.5 bg-indigo-50/80 rounded-2xl border border-indigo-100 mt-3 text-left">
                <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-indigo-600 shrink-0" />
                  Voulez-vous ajouter un rapport dès maintenant ?
                </p>
                <p className="text-[11px] text-indigo-700/80 mt-1">
                  Vous pourrez renseigner l'impression générale, le contexte d'observation et les qualités du joueur.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCreatedCandidateInfo(null);
                  navigate('/recruitment-v2?tab=candidates');
                }}
                className="w-full sm:flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer order-2 sm:order-1 shadow-md"
              >
                <Database className="w-4 h-4 text-slate-200" />
                <span>Voir la Database</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const id = createdCandidateInfo.id;
                  setCreatedCandidateInfo(null);
                  navigate(id ? `/recruitment-v2/add-report?candidateId=${id}&returnTab=candidates` : `/recruitment-v2/add-report?returnTab=candidates`);
                }}
                className="w-full sm:flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer order-1 sm:order-2"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Ajouter un rapport</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddPlayerPage;

