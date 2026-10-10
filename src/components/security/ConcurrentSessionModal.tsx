import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, LogOut, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';

interface ConcurrentSessionModalProps {
  isOpen: boolean;
  onConfirm: () => void;
}

export const ConcurrentSessionModal: React.FC<ConcurrentSessionModalProps> = ({
  isOpen,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-card border-2 border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center relative overflow-hidden"
        >
          {/* Background Accent */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-9 h-9" />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <h3 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Session Interrompue
            </h3>
            <div className="text-xs font-bold text-red-500 uppercase tracking-wider">
              Connexion Simultanée Détectée
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pt-2">
              Une nouvelle connexion a été effectuée avec vos identifiants depuis un autre appareil ou navigateur.
            </p>
            <p className="text-xs text-muted-foreground bg-secondary/40 p-3 rounded-xl border border-border/50 text-left">
              🔒 <strong>Sécurité FUS Club</strong> : Par mesure de protection, votre session sur ce poste a été clôturée.
            </p>
          </div>

          {/* Action */}
          <div className="pt-2">
            <Button
              onClick={onConfirm}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-wider text-xs shadow-lg shadow-primary/25 hover:bg-primary/90 gap-2"
            >
              <LogOut className="w-4 h-4" /> Se Reconnecter
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConcurrentSessionModal;
