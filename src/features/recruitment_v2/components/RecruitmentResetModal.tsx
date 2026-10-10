import React, { useState } from 'react';
import {
  AlertTriangle,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Trash2,
  X,
  RotateCcw,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { recruitmentService } from '../services/recruitmentService';
import { toast } from 'sonner';

interface RecruitmentResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserEmail?: string | null;
  candidatesCount: number;
  evaluationsCount: number;
  observationsCount: number;
}

export const RecruitmentResetModal: React.FC<RecruitmentResetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUserEmail,
  candidatesCount,
  evaluationsCount,
  observationsCount,
}) => {
  const [email, setEmail] = useState(currentUserEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmationWord, setConfirmationWord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const normalizedWord = confirmationWord.trim().toUpperCase();
  const isKeywordValid = normalizedWord === 'REINITIALISER' || normalizedWord === 'RÉINITIALISER';
  const isFormValid = isKeywordValid && email.trim().length > 0 && password.length > 0;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await recruitmentService.resetRecruitmentData({
        email: email.trim(),
        password,
        confirmationWord: normalizedWord,
      });

      if (res.success) {
        toast.success(res.message);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('Reset error:', err);
      const msg = err.message || 'Une erreur est survenue lors de la réinitialisation.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Danger Header */}
        <div className="p-6 bg-gradient-to-r from-rose-500 via-red-600 to-rose-700 text-white relative flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black shrink-0 border border-white/30">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-200 block">
                Zone de Danger • Action Critique
              </span>
              <h3 className="text-lg font-black tracking-tight leading-tight">
                Réinitialisation Cellule Recrutement
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Content */}
        <div className="p-6 space-y-5">
          
          {/* Alerte explicite */}
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2">
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Avertissement : Remise à zéro définitive</span>
            </div>
            <p className="text-xs text-rose-900 leading-relaxed font-medium">
              Êtes-vous sûr de vouloir réinitialiser toutes les informations enregistrées au niveau de la cellule recrutement & détection ? 
              Toutes les données ci-dessous seront <strong>définitivement supprimées</strong> pour recommencer à zéro.
            </p>
          </div>

          {/* Compteurs de données qui seront supprimées */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 border">
              <span className="text-lg font-black text-rose-600 block">{candidatesCount}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Candidats</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border">
              <span className="text-lg font-black text-rose-600 block">{evaluationsCount}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Évaluations</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border">
              <span className="text-lg font-black text-rose-600 block">{observationsCount}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Observations</span>
            </div>
          </div>

          {/* Formulaire à Triple Verrou */}
          <form onSubmit={handleReset} className="space-y-4 pt-2 border-t">
            
            {/* Erreur éventuelle */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-100 border border-red-300 text-xs text-red-900 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. Email Admin */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-rose-600" />
                1. Identifiant Administrateur (Email) *
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@fus.ma"
                className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-medium"
              />
            </div>

            {/* 2. Mot de Passe Admin */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-rose-600" />
                2. Mot de Passe Administrateur *
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Saisissez votre mot de passe pour confirmer..."
                  className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-medium pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 3. Mot de confirmation textuel */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  3. Tapez le mot « REINITIALISER » *
                </span>
                {isKeywordValid && (
                  <span className="text-emerald-600 flex items-center gap-1 font-bold lowercase text-[10px]">
                    <CheckCircle2 className="w-3 h-3" /> confirmé
                  </span>
                )}
              </label>
              <Input
                type="text"
                required
                value={confirmationWord}
                onChange={(e) => setConfirmationWord(e.target.value)}
                placeholder="REINITIALISER"
                className={`h-10 rounded-xl font-mono text-xs tracking-wider uppercase font-bold transition-all ${
                  isKeywordValid 
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 focus:ring-emerald-200' 
                    : 'border-slate-200 bg-slate-50 focus:ring-rose-200'
                }`}
              />
              <p className="text-[10px] text-muted-foreground italic">
                Saisissez exactement le mot <strong className="text-rose-600 font-mono">REINITIALISER</strong> pour déverrouiller le bouton.
              </p>
            </div>

            {/* Boutons d'action */}
            <div className="pt-4 border-t flex gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                onClick={onClose}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="flex-1 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Réinitialisation en cours...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmer la Réinitialisation</span>
                  </>
                )}
              </Button>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
};

export default RecruitmentResetModal;
