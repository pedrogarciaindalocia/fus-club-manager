import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  Image as ImageIcon,
  Upload,
  Eye,
  Trash2,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import type { AdministrativeDocument } from '../types/recruitment';
import { uploadRecruitmentDocument } from '../utils/uploadDocument';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

const isImageDoc = (doc?: AdministrativeDocument | null): boolean => {
  if (!doc) return false;
  const ft = (doc.file_type || '').toLowerCase();
  const name = (doc.name || '').toLowerCase();
  const url = (doc.url || '').toLowerCase();
  return (
    ft.startsWith('image/') ||
    url.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|webp|gif|avif|heic|heif)(\?|#|$)/i.test(name) ||
    /\.(jpg|jpeg|png|webp|gif|avif|heic|heif)(\?|#|$)/i.test(url)
  );
};

const getErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

const uploadHonorFileWithToast = async (
  file: File,
  loadingMsg: string,
  successMsg: string,
  onDocumentChange: (doc: AdministrativeDocument | null) => Promise<void> | void
) => {
  const toastId = toast.loading(loadingMsg);
  try {
    const uploaded = await uploadRecruitmentDocument(file, 'honor_declaration', {
      allowImages: true,
    });
    await onDocumentChange(uploaded);
    toast.success(successMsg, { id: toastId });
  } catch (err: unknown) {
    toast.error(getErrorMessage(err, 'Erreur lors du téléversement du fichier'), { id: toastId });
  }
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

interface HonorDeclarationModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  document: AdministrativeDocument | null;
  canUpload: boolean;
  onDocumentChange: (doc: AdministrativeDocument | null) => Promise<void> | void;
}

export const HonorDeclarationModal: React.FC<HonorDeclarationModalProps> = ({
  isOpen,
  onClose,
  candidateName,
  document: doc,
  canUpload,
  onDocumentChange,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || typeof window === 'undefined' || typeof globalThis.document === 'undefined') {
    return null;
  }

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadHonorFileWithToast(
        file,
        `Téléversement de « ${file.name} »...`,
        'Déclaration sur l’honneur enregistrée (voyant vert).',
        onDocumentChange
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!canUpload) return;
    setIsUploading(true);
    try {
      await onDocumentChange(null);
      toast.info('Déclaration sur l’honneur supprimée (voyant repassé au rouge).');
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erreur lors de la suppression'));
    } finally {
      setIsUploading(false);
    }
  };

  const imgDoc = isImageDoc(doc);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={cn(
                'w-3 h-3 rounded-full shrink-0 ring-4',
                doc ? 'bg-emerald-500 ring-emerald-500/20' : 'bg-rose-500 ring-rose-500/20'
              )}
            />
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 truncate">
                Déclaration sur l’honneur — {candidateName}
              </h3>
              <p className="text-[11px] text-slate-500">
                {doc
                  ? 'Document justificatif présent (Voyant Vert)'
                  : 'Document manquant — Déposez un PDF ou une image (Voyant Rouge)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {doc ? (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    {imgDoc ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{doc.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {imgDoc ? 'Image' : 'Document PDF'}
                      {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={doc.name}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 hover:text-emerald-700 text-[11px] font-bold inline-flex items-center gap-1"
                    title="Télécharger / Ouvrir"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ouvrir</span>
                  </a>
                </div>
              </div>

              {imgDoc ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden max-h-[300px] flex items-center justify-center">
                  <img
                    src={doc.url}
                    alt={`Déclaration sur l'honneur de ${candidateName}`}
                    className="max-h-[296px] w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <iframe
                    src={doc.url}
                    title={`Déclaration PDF ${candidateName}`}
                    className="w-full h-[260px] border-0 bg-white"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/40 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-xs font-bold text-slate-800">
                Aucune déclaration sur l’honneur déposée
              </p>
              <p className="text-[11px] text-slate-500">
                Téléversez la déclaration signée au format PDF ou Image (JPG, PNG, WEBP) pour passer le voyant au vert.
              </p>
            </div>
          )}

          {canUpload && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf,image/*"
                onChange={handleFilePick}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition-all"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Téléversement...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>{doc ? 'Remplacer (PDF ou Image)' : 'Déposer PDF ou Image'}</span>
                  </>
                )}
              </button>

              {doc && (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleRemove}
                  className="py-2.5 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    globalThis.document.body
  );
};

interface HonorDeclarationStatusPillProps {
  candidateName: string;
  document: AdministrativeDocument | null;
  isRequired: boolean;
  canUpload: boolean;
  onDocumentChange: (doc: AdministrativeDocument | null) => Promise<void> | void;
}

export const HonorDeclarationStatusPill: React.FC<HonorDeclarationStatusPillProps> = ({
  candidateName,
  document: doc,
  isRequired,
  canUpload,
  onDocumentChange,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isRequired && !doc) {
    return (
      <span
        className="text-[11px] font-semibold text-slate-400 select-none"
        title="Requise automatiquement dès que le joueur passe au statut « Inviter à un test »"
      >
        —
      </span>
    );
  }

  const handleQuickFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadHonorFileWithToast(
        file,
        `Téléversement pour ${candidateName}...`,
        `Déclaration sur l'honneur déposée pour ${candidateName}`,
        onDocumentChange
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const hasDoc = Boolean(doc && doc.url);

  return (
    <div
      className="inline-flex items-center gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      {canUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf,image/*"
          onChange={handleQuickFileChange}
          className="hidden"
        />
      )}

      {hasDoc ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-black transition-all cursor-pointer shadow-2xs whitespace-nowrap"
          title={`Déclaration sur l'honneur déposée (${doc?.name || 'Fichier'}) — Cliquer pour voir ou modifier`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/25 shrink-0" />
          <span>Reçue</span>
          <Eye className="w-3 h-3 text-emerald-700 shrink-0" />
        </button>
      ) : canUpload ? (
        <button
          type="button"
          disabled={isUploading}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-600 hover:text-white hover:border-rose-600 text-rose-700 text-[11px] font-black transition-all cursor-pointer shadow-2xs whitespace-nowrap group/honor disabled:opacity-60"
          title="Déclaration sur l'honneur manquante — Cliquer pour uploader un PDF ou une Image"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 group-hover/honor:bg-white ring-2 ring-rose-500/25 shrink-0 transition-colors" />
          {isUploading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              <span>Envoi...</span>
            </>
          ) : (
            <>
              <span>À déposer</span>
              <Upload className="w-3 h-3 shrink-0" />
            </>
          )}
        </button>
      ) : (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-[11px] font-black whitespace-nowrap cursor-default"
          title="Déclaration sur l'honneur non encore déposée"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/25 shrink-0" />
          <span>Manquante</span>
        </span>
      )}

      <HonorDeclarationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        candidateName={candidateName}
        document={doc}
        canUpload={canUpload}
        onDocumentChange={onDocumentChange}
      />
    </div>
  );
};

interface HonorDeclarationFormFieldProps {
  candidateName?: string;
  document: AdministrativeDocument | null;
  canUpload: boolean;
  onDocumentChange: (doc: AdministrativeDocument | null) => Promise<void> | void;
}

export const HonorDeclarationFormField: React.FC<HonorDeclarationFormFieldProps> = ({
  candidateName = 'le joueur',
  document: doc,
  canUpload,
  onDocumentChange,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadHonorFileWithToast(
        file,
        `Téléversement de « ${file.name} »...`,
        'Déclaration sur l’honneur rattachée (voyant vert) !',
        onDocumentChange
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const hasDoc = Boolean(doc && doc.url);
  const imgDoc = isImageDoc(doc);

  return (
    <div
      className={cn(
        'p-4 rounded-2xl border-2 transition-all space-y-3',
        hasDoc
          ? 'bg-emerald-50/50 border-emerald-200'
          : 'bg-rose-50/40 border-rose-200'
      )}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'w-3 h-3 rounded-full shrink-0 ring-4',
              hasDoc ? 'bg-emerald-500 ring-emerald-500/20' : 'bg-rose-500 ring-rose-500/20'
            )}
          />
          <div>
            <h5 className="text-xs font-black text-slate-900">
              Déclaration sur l’honneur (PDF ou Image)
            </h5>
            <p className="text-[11px] text-slate-500">
              {hasDoc
                ? 'Justificatif présent — Voyant au vert'
                : 'Obligatoire pour la convocation aux tests — Voyant rouge tant que le fichier manque'}
            </p>
          </div>
        </div>

        <span
          className={cn(
            'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border inline-flex items-center gap-1',
            hasDoc
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : 'bg-rose-100 text-rose-800 border-rose-300'
          )}
        >
          {hasDoc ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Reçue</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3 text-rose-600" />
              <span>Manquante</span>
            </>
          )}
        </span>
      </div>

      {hasDoc && doc && (
        <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {imgDoc ? (
              <img
                src={doc.url}
                alt={doc.name}
                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-black text-[10px] shrink-0">
                PDF
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{doc.name}</p>
              <p className="text-[10px] text-slate-400">
                {imgDoc ? 'Image' : 'Document PDF'}
                {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 cursor-pointer"
              title="Aperçu"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 cursor-pointer"
              title="Ouvrir dans un onglet"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {canUpload && (
              <button
                type="button"
                onClick={() => onDocumentChange(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {canUpload && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf,image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-60',
              hasDoc
                ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Téléversement...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>{hasDoc ? 'Remplacer (PDF / Image)' : 'Uploader PDF ou Image'}</span>
              </>
            )}
          </button>
          <span className="text-[10px] text-slate-500">
            Formats acceptés : PDF, JPG, PNG, WEBP (max 25 Mo).
          </span>
        </div>
      )}

      <HonorDeclarationModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        candidateName={candidateName}
        document={doc}
        canUpload={canUpload}
        onDocumentChange={onDocumentChange}
      />
    </div>
  );
};
