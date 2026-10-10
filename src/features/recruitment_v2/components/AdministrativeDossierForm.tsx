import React, { useState, useRef } from 'react';
import {
  FileText, Upload, Trash2, Download, ExternalLink, ShieldCheck,
  Paperclip, AlertCircle, Loader2, CheckCircle2, FileCheck, Calendar, Briefcase
} from 'lucide-react';
import type { AdministrativeDocument } from '../types/recruitment';
import { uploadRecruitmentDocument } from '../utils/uploadDocument';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

interface AdministrativeDossierFormProps {
  documents: AdministrativeDocument[];
  onDocumentsChange: (docs: AdministrativeDocument[]) => void;
  contractType: string;
  onContractTypeChange: (val: string) => void;
  adminNotes?: string;
  onAdminNotesChange?: (val: string) => void;
  readOnly?: boolean;
}

export const CONTRACT_TYPE_OPTIONS = [
  'Convention de formation',
  'Contrat stagiaire',
  'Contrat aspirant',
  'Contrat Professionnel',
  'Licence Club & Mutation',
  'En cours d\'instruction administrative',
];

export const DOC_CATEGORY_LABELS: Record<NonNullable<AdministrativeDocument['category']>, { label: string; badge: string }> = {
  contract: { label: 'Contrat / Convention', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  identity: { label: 'Pièce d\'identité / Passeport', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  medical: { label: 'Certificat médical', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  parental_consent: { label: 'Autorisation parentale', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  other: { label: 'Pièce justificative', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export const AdministrativeDossierForm: React.FC<AdministrativeDossierFormProps> = ({
  documents,
  onDocumentsChange,
  contractType,
  onContractTypeChange,
  adminNotes = '',
  onAdminNotesChange,
  readOnly = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AdministrativeDocument['category']>('contract');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Format de fichier non supporté. Veuillez joindre un document PDF.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(`Téléversement de « ${file.name} »...`);
    try {
      const newDoc = await uploadRecruitmentDocument(file, selectedCategory);
      onDocumentsChange([...documents, newDoc]);
      toast.success(`Document PDF « ${file.name} » rattaché avec succès !`, { id: toastId });
    } catch (err: any) {
      console.error('[AdministrativeDossierForm] Erreur upload:', err);
      toast.error(err.message || 'Erreur lors du téléversement du document PDF', { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveDoc = (docId: string, docName: string) => {
    if (readOnly) return;
    onDocumentsChange(documents.filter(d => d.id !== docId));
    toast.info(`« ${docName} » retiré du dossier.`);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} Ko`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 border-2 border-emerald-200/90 shadow-sm space-y-5 animate-in fade-in duration-300">
      {/* En-tête du volet administratif */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-200/70">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Dossier Administratif & Recrutement Immédiat
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Procédure Prioritaire
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Préparez l'engagement contractuel du joueur et rattachez les pièces justificatives au format PDF.
            </p>
          </div>
        </div>
      </div>

      {/* Cadre contractuel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>Statut / Type de Contrat Proposé *</span>
          </label>
          <select
            value={contractType}
            disabled={readOnly}
            onChange={(e) => onContractTypeChange(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer disabled:bg-slate-50"
          >
            {CONTRACT_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Notes Administratives & Clauses</span>
          </label>
          <input
            type="text"
            value={adminNotes}
            disabled={readOnly}
            onChange={(e) => onAdminNotesChange?.(e.target.value)}
            placeholder="Ex: Entrée en hébergement académie, scolarité prise en charge..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50"
          />
        </div>
      </div>

      {/* Zone de Téléversement des Pièces Jointes PDF */}
      {!readOnly && (
        <div className="p-4 rounded-xl bg-white border border-emerald-200/80 space-y-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
              <span>Joindre des Pièces Justificatives (Fichiers PDF)</span>
            </label>

            {/* Sélecteur de catégorie de document */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Catégorie :</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-slate-50 cursor-pointer"
              >
                <option value="contract">Contrat / Convention</option>
                <option value="identity">Pièce d'identité / Passeport</option>
                <option value="medical">Certificat médical</option>
                <option value="parental_consent">Autorisation parentale</option>
                <option value="other">Autre pièce</option>
              </select>
            </div>
          </div>

          {/* Bouton d'upload / Dropzone PDF */}
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,application/pdf"
              onChange={handleFileSelected}
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-60"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Téléversement du PDF...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Sélectionner un fichier PDF</span>
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-400">
              Format PDF uniquement (max 25 Mo). Contrat signé, passeport, etc.
            </span>
          </div>
        </div>
      )}

      {/* Liste des Documents PDF attachés */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Documents PDF du dossier ({documents.length})</span>
          </span>
          {documents.length === 0 && (
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
              Aucun document PDF joint pour l'instant
            </span>
          )}
        </div>

        {documents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {documents.map((doc) => {
              const catMeta = doc.category && DOC_CATEGORY_LABELS[doc.category] 
                ? DOC_CATEGORY_LABELS[doc.category] 
                : DOC_CATEGORY_LABELS.other;

              return (
                <div
                  key={doc.id}
                  className="p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 transition-all flex items-center justify-between gap-3 shadow-2xs group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/70 font-black text-[10px]">
                      PDF
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate" title={doc.name}>
                        {doc.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded border", catMeta.badge)}>
                          {catMeta.label}
                        </span>
                        {doc.file_size && (
                          <span className="text-[10px] text-slate-400">
                            {formatFileSize(doc.file_size)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
                      title="Ouvrir le document PDF"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(doc.id, doc.name)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Supprimer ce document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-white/60 text-center">
            <p className="text-xs text-slate-500">
              Vous pouvez joindre le contrat scanné, la pièce d'identité ou le certificat médical pour finaliser le dossier de recrutement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
