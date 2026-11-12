import React, { useState, useEffect } from 'react';
import {
  X, Briefcase, FileText, CheckCircle2, AlertCircle, Loader2,
  Building2, Calendar, User, Flame, ArrowRight, ShieldCheck
} from 'lucide-react';
import type { TrialCandidate, AdministrativeDocument, CandidateStatus } from '../types/recruitment';
import { AdministrativeDossierForm, CONTRACT_TYPE_OPTIONS } from './AdministrativeDossierForm';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

interface AdministrativeProcedureModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: TrialCandidate | null;
  onSave: (candidateId: string, updates: {
    contract_type?: string;
    administrative_documents?: AdministrativeDocument[];
    admin_notes?: string;
    status?: CandidateStatus;
  }) => Promise<void>;
}

export const AdministrativeProcedureModal: React.FC<AdministrativeProcedureModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onSave,
}) => {
  const [documents, setDocuments] = useState<AdministrativeDocument[]>([]);
  const [contractType, setContractType] = useState<string>(CONTRACT_TYPE_OPTIONS[0]);
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [candidateStatus, setCandidateStatus] = useState<CandidateStatus>('selected');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (candidate) {
      setDocuments(candidate.administrative_documents || []);
      setContractType(candidate.contract_type || CONTRACT_TYPE_OPTIONS[0]);
      setAdminNotes(candidate.admin_notes || '');
      setCandidateStatus(candidate.status || 'selected');
    }
  }, [candidate]);

  if (!isOpen || !candidate) return null;

  const handleSaveProcedure = async () => {
    setIsSubmitting(true);
    const toastId = toast.loading(`Enregistrement du dossier administratif de ${candidate.first_name} ${candidate.last_name}...`);
    try {
      await onSave(candidate.id, {
        contract_type: contractType,
        administrative_documents: documents,
        admin_notes: adminNotes.trim() || undefined,
        status: candidateStatus,
      });
      toast.success(`Dossier administratif mis à jour avec succès pour ${candidate.first_name} ${candidate.last_name} !`, { id: toastId });
      onClose();
    } catch (err: any) {
      console.error('[AdministrativeProcedureModal] Erreur save:', err);
      toast.error(err.message || 'Erreur lors de l\'enregistrement du dossier administratif', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  const age = calculateAge(candidate.birth_date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="bg-slate-900 text-white p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-950/40 text-white">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">
                  Procédure Administrative & Recrutement Immédiat
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                  <Flame className="w-3 h-3 text-rose-400" />
                  Priorité Absolue
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Instruction du dossier contractuel, pièces officielles PDF et validation administrative.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fiche récapitulative du joueur ciblé */}
        <div className="bg-slate-50 border-b border-slate-200/80 p-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            {candidate.photo_url ? (
              <img
                src={candidate.photo_url}
                alt={`${candidate.first_name} ${candidate.last_name}`}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/30 shadow-xs bg-slate-200 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-slate-800 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
                {candidate.first_name?.[0]}{candidate.last_name?.[0]}
              </div>
            )}
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-sm truncate">
                  {candidate.first_name} {candidate.last_name}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-black uppercase">
                  {candidate.primary_position}
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
                  {candidate.age_category}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate max-w-[150px]">{candidate.current_club || 'Sans club'}</span>
                </span>
                {age != null && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{age} ans</span>
                    </span>
                  </>
                )}
                {candidate.discovering_scout_name && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-700 font-semibold">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Scout : {candidate.discovering_scout_name}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="hidden sm:block text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Statut du Dossier
            </span>
            <select
              value={candidateStatus}
              onChange={(e) => setCandidateStatus(e.target.value as CandidateStatus)}
              className="mt-0.5 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white shadow-2xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="selected">Validé / En instruction</option>
              <option value="in_trial">Sous contrat d'essai</option>
              <option value="registered">Enregistré</option>
              <option value="on_hold">En attente / Complément</option>
              <option value="archived">Archivé</option>
            </select>
          </div>
        </div>

        {/* Corps : Formulaire Administratif */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <AdministrativeDossierForm
            documents={documents}
            onDocumentsChange={setDocuments}
            contractType={contractType}
            onContractTypeChange={setContractType}
            adminNotes={adminNotes}
            onAdminNotesChange={setAdminNotes}
          />
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Direction Administrative — Documents sécurisés dans le bucket Supabase.</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handleSaveProcedure}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all shadow-md shadow-emerald-950/20 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Valider le Dossier Administratif</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
