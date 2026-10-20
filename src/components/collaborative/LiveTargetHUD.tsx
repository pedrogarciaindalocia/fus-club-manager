import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveCursors, getVisibleSectionsForRole } from '../../context/LiveCursorsContext';
import { 
  Crosshair, X, Minimize2, Maximize2, Monitor, 
  Clock, ShieldCheck, MapPin, Laptop, Smartphone, 
  ExternalLink, MousePointerClick, ChevronRight, CheckCircle2, XCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const LiveTargetHUD: React.FC = () => {
  const { 
    isSuperAdmin, 
    enabled, 
    selectedUserId, 
    setSelectedUserId, 
    allOnlineUsers, 
    setInspectorUser 
  } = useLiveCursors();

  const [isMinimized, setIsMinimized] = useState(false);
  const [filterMode, setFilterMode] = useState<'allowed' | 'all'>('allowed');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const navigate = useNavigate();

  // Trouver l'utilisateur ciblé
  const targetUser = useMemo(() => {
    if (!selectedUserId) return null;
    return allOnlineUsers.find((u) => u.userId === selectedUserId) || null;
  }, [allOnlineUsers, selectedUserId]);

  // Chronomètre de session dynamique
  useEffect(() => {
    if (!targetUser) return;
    const startTime = targetUser.sessionStartedAt
      ? new Date(targetUser.sessionStartedAt).getTime()
      : Date.now() - 180000;

    const updateElapsed = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setElapsedSeconds(diff);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [targetUser]);

  // Ne pas afficher si non super admin, ou désactivé, ou aucun utilisateur ciblé
  if (!isSuperAdmin || !enabled || !selectedUserId || !targetUser) {
    return null;
  }

  // Rubriques accessibles calculées selon le rôle et le poste
  const visibleSections = getVisibleSectionsForRole(targetUser.role, targetUser.jobTitle);
  const allowedSections = visibleSections.filter((s) => s.allowed);
  const displayedSections = filterMode === 'allowed' ? allowedSections : visibleSections;

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const hasRecentClick = targetUser.lastClick && Date.now() - targetUser.lastClick.timestamp < 3500;

  return (
    <aside 
      aria-label="Supervision en direct de l'utilisateur"
      className="fixed bottom-4 right-4 z-[9990] select-none pointer-events-auto"
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className={cn(
          "bg-slate-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200",
          isMinimized ? "w-80" : "w-[390px] max-w-[94vw]"
        )}
      >
        {/* En-tête HUD Cible */}
        <div 
          style={{ borderTopColor: targetUser.color }}
          className="p-3 bg-gradient-to-r from-slate-900/90 to-slate-950/90 border-b border-white/10 border-t-4 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Avatar avec halo dynamique */}
            <div className="relative shrink-0">
              <div 
                style={{ borderColor: targetUser.color }}
                className="w-10 h-10 rounded-full border-2 overflow-hidden bg-slate-800 shadow-md"
              >
                {targetUser.avatarUrl ? (
                  <img
                    src={targetUser.avatarUrl}
                    alt={targetUser.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-white text-sm">
                    {targetUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white text-xs truncate max-w-[140px]">
                  {targetUser.name}
                </span>
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] px-1.5 py-0 uppercase font-black">
                  Ciblé
                </Badge>
              </div>
              <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                <span>{targetUser.role}</span>
                {targetUser.jobTitle && (
                  <>
                    <span>•</span>
                    <span className="text-slate-300 font-semibold">{targetUser.jobTitle}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Boutons d'action rapides */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setInspectorUser(targetUser)}
              title="Ouvrir le miroir écran complet"
              className="w-7 h-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
            >
              <Monitor className="w-3.5 h-3.5 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? "Agrandir" : "Minimiser"}
              className="w-7 h-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedUserId(null)}
              title="Fermer le ciblage"
              className="w-7 h-7 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Corps HUD (masqué si minimisé) */}
        {!isMinimized && (
          <div className="p-3 space-y-2.5 max-h-[70vh] overflow-y-auto text-xs">
            {/* Alerte Clic en Temps Réel */}
            <AnimatePresence>
              {hasRecentClick && targetUser.lastClick && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-amber-500/20 border border-amber-500/40 rounded-xl p-2 text-amber-200 flex items-center justify-between gap-2 shadow-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1.5 rounded-lg bg-amber-500/30 text-amber-300 animate-bounce shrink-0">
                      <MousePointerClick className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-black text-[11px] text-amber-100 flex items-center gap-1">
                        <span>⚡ Clic en direct !</span>
                        {targetUser.lastClick.targetText && (
                          <span className="text-[10px] text-amber-300 font-normal truncate max-w-[130px]">
                            « {targetUser.lastClick.targetText} »
                          </span>
                        )}
                      </p>
                      <p className="text-[9px] font-mono text-amber-300/80">
                        X: {targetUser.lastClick.rawX}px • Y: {targetUser.lastClick.rawY}px ({Math.round(targetUser.lastClick.xPercent)}%, {Math.round(targetUser.lastClick.yPercent)}%)
                      </p>
                    </div>
                  </div>
                  <span className="text-[8.5px] font-bold uppercase bg-amber-500/30 px-1.5 py-0.5 rounded text-amber-200 shrink-0">
                    À l'instant
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Barre de navigation & Position courante */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" />
                  Rubrique Active
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(targetUser.route)}
                  className="h-5 px-1.5 text-[9px] text-primary hover:text-white hover:bg-primary/20 rounded font-black gap-1"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  Rejoindre sa page
                </Button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-white text-[11px] truncate">
                  {targetUser.sectionLabel}
                </span>
                <span className="font-mono text-[9px] text-slate-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/10 shrink-0">
                  {targetUser.route}
                </span>
              </div>

              {/* Coordonnées XY du curseur */}
              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between font-mono text-[9.5px]">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">X: {targetUser.rawX}px ({Math.round(targetUser.xPercent)}%)</span>
                  <span className="text-sky-400 font-bold">Y: {targetUser.rawY}px ({Math.round(targetUser.yPercent)}%)</span>
                </div>
                <span className="text-[8px] text-slate-400">
                  {targetUser.screenWidth || 1920}×{targetUser.screenHeight || 1080}
                </span>
              </div>
            </div>

            {/* Session & Appareil */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] text-slate-400 uppercase font-black block">Durée Session</span>
                  <span className="font-mono font-bold text-white text-[10.5px]">
                    {formatDuration(elapsedSeconds)}
                  </span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex items-center gap-2">
                {targetUser.device?.includes('iPhone') || targetUser.device?.includes('Android') ? (
                  <Smartphone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                ) : (
                  <Laptop className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="text-[9px] text-slate-400 uppercase font-black block">Appareil</span>
                  <span className="font-bold text-white truncate block text-[10px]">
                    {targetUser.device || 'Desktop'}
                  </span>
                </div>
              </div>
            </div>

            {/* Rubriques Permises pour cette Session (RBAC) */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-black text-[10px] text-white uppercase tracking-wider">
                    Ses Rubriques Permises
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10 text-[9px]">
                  <button
                    onClick={() => setFilterMode('allowed')}
                    className={cn(
                      "px-1.5 py-0.5 rounded font-black transition-all",
                      filterMode === 'allowed' ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                    )}
                  >
                    Actives ({allowedSections.length})
                  </button>
                  <button
                    onClick={() => setFilterMode('all')}
                    className={cn(
                      "px-1.5 py-0.5 rounded font-black transition-all",
                      filterMode === 'all' ? "bg-primary text-white" : "text-slate-400 hover:text-white"
                    )}
                  >
                    Toutes ({visibleSections.length})
                  </button>
                </div>
              </div>

              {/* Matrice de badges rubriques */}
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {displayedSections.map((sec) => (
                  <div
                    key={sec.id}
                    className={cn(
                      "px-2 py-1 rounded-lg border text-[9px] flex items-center justify-between gap-1 transition-colors",
                      sec.allowed
                        ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
                        : "bg-rose-950/20 border-rose-500/20 text-slate-400 opacity-60"
                    )}
                  >
                    <span className="truncate font-medium">{sec.name}</span>
                    {sec.allowed ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bouton pour ouvrir l'inspecteur d'écran complet */}
            <Button
              onClick={() => setInspectorUser(targetUser)}
              className="w-full bg-primary hover:bg-primary/90 text-white font-black text-xs h-8 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Ouvrir Miroir Écran & Audit Complet</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </motion.div>
    </aside>
  );
};

export default LiveTargetHUD;
