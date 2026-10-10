import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent } from '../../../components/ui/card';
import type { Player, Club } from '../../../types';
import { 
  X, ArrowRightLeft, Archive, Shield, CheckCircle2, 
  Loader2, AlertTriangle, UserMinus, Globe 
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

interface PlayerDepartureModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  opponentClubs: Club[];
  onConfirmTransfer: (player: Player, targetClub: Club) => Promise<void>;
  onConfirmArchive: (player: Player) => Promise<void>;
}

export const PlayerDepartureModal: React.FC<PlayerDepartureModalProps> = ({
  isOpen,
  onClose,
  player,
  opponentClubs,
  onConfirmTransfer,
  onConfirmArchive,
}) => {
  const [departureType, setDepartureType] = useState<'transfer' | 'archive'>('transfer');
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !player) return null;

  const playerPhoto = (player.photo_url && player.photo_url !== 'null')
    ? player.photo_url
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=020617&color=fff&size=200`;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (departureType === 'transfer') {
        if (!selectedClubId) {
          toast.error('Veuillez sélectionner le club d\'accueil pour le transfert');
          setIsSubmitting(false);
          return;
        }
        const targetClub = opponentClubs.find(c => c.id === selectedClubId);
        if (!targetClub) {
          toast.error('Club adverse non trouvé');
          setIsSubmitting(false);
          return;
        }
        await onConfirmTransfer(player, targetClub);
      } else {
        await onConfirmArchive(player);
      }
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(`Erreur lors du traitement: ${error.message || 'Échec'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 my-8"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-primary to-slate-900 p-8 text-white flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 p-1 border border-white/20 overflow-hidden shrink-0">
              <img src={playerPhoto} alt={player.full_name} className="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black uppercase italic tracking-tighter">{player.full_name}</h3>
                <Badge className="bg-white/20 text-white border-none text-[9px] font-black uppercase">
                  #{player.jersey_number ?? '—'}
                </Badge>
              </div>
              <p className="text-xs text-white/60 font-medium mt-0.5">
                Gestion de la sortie / transfert du roster FUS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Sélectionnez la destination ou le motif de sortie pour <span className="font-black text-primary">{player.full_name}</span> :
          </div>

          {/* Option Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option Transfert */}
            <div
              onClick={() => setDepartureType('transfer')}
              className={cn(
                "p-5 rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3",
                departureType === 'transfer'
                  ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-lg"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                {departureType === 'transfer' && (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <h4 className="font-black text-sm uppercase italic">Transfert vers Adversaire</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Transfère le joueur vers un club adversaire répertorié. Il sera ajouté à son effectif.
                </p>
              </div>
            </div>

            {/* Option Archivage Scouting */}
            <div
              onClick={() => setDepartureType('archive')}
              className={cn(
                "p-5 rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3",
                departureType === 'archive'
                  ? "border-amber-500 bg-amber-500/5 dark:bg-amber-500/10 shadow-lg"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Archive className="w-5 h-5" />
                </div>
                {departureType === 'archive' && (
                  <CheckCircle2 className="w-5 h-5 text-amber-500" />
                )}
              </div>
              <div>
                <h4 className="font-black text-sm uppercase italic">Sortie & Archivage Scouting</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Retire le joueur du roster FUS et le renvoie dans l'archive de la base Scouting & Recrutement.
                </p>
              </div>
            </div>
          </div>

          {/* Conditional Input for Transfer Target Club */}
          <AnimatePresence mode="wait">
            {departureType === 'transfer' ? (
              <motion.div
                key="transfer-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700"
              >
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Sélectionner le Club Adversaire de Destination *
                </label>
                <select
                  value={selectedClubId}
                  onChange={e => setSelectedClubId(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none cursor-pointer"
                >
                  <option value="">-- Choisir le club destinataire --</option>
                  {opponentClubs.map(club => (
                    <option key={club.id} value={club.id}>
                      {club.name} ({club.city ? `${club.city}, ` : ''}{club.country || 'Maroc'})
                    </option>
                  ))}
                </select>
              </motion.div>
            ) : (
              <motion.div
                key="archive-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-bold uppercase">Archivage dans le Recruitment Pipeline</p>
                  <p className="mt-0.5">
                    Le joueur sera retiré du roster FUS et sauvegardé dans la base de données Scouting avec le statut <strong>Archivé</strong> (section Archive du Recrutement).
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-12 px-6 rounded-2xl font-bold text-xs uppercase"
          >
            Annuler
          </Button>
          <Button
            disabled={isSubmitting || (departureType === 'transfer' && !selectedClubId)}
            onClick={handleSubmit}
            className={cn(
              "h-12 px-8 rounded-2xl text-white font-black text-xs uppercase tracking-widest gap-2 shadow-lg transition-all",
              departureType === 'transfer'
                ? "bg-primary hover:bg-slate-900 shadow-primary/20"
                : "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
            )}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : departureType === 'transfer' ? (
              <>
                <ArrowRightLeft className="w-4 h-4" />
                Confirmer le Transfert
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                Confirmer l'Archivage
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
