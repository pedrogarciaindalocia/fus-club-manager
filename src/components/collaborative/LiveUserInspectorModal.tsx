import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Monitor, Clock, ShieldCheck, ExternalLink, 
  MapPin, Laptop, Smartphone, CheckCircle2, 
  XCircle, Radio, Sparkles, Crosshair, ArrowRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { RemoteCursor } from '../../context/LiveCursorsContext';
import { getVisibleSectionsForRole } from '../../context/LiveCursorsContext';
import { cn } from '../../lib/utils';

interface LiveUserInspectorModalProps {
  user: RemoteCursor | null;
  onClose: () => void;
  onTargetUser: (userId: string) => void;
  isCurrentlyTargeted: boolean;
}

export const LiveUserInspectorModal: React.FC<LiveUserInspectorModalProps> = ({
  user,
  onClose,
  onTargetUser,
  isCurrentlyTargeted,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'screen' | 'session' | 'permissions'>('screen');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Chronomètre de session dynamique
  useEffect(() => {
    if (!user) return;
    const startTime = user.sessionStartedAt ? new Date(user.sessionStartedAt).getTime() : Date.now() - 120000;
    const updateElapsed = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setElapsedSeconds(diff);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const visibleModules = getVisibleSectionsForRole(user.role, user.jobTitle);
  const allowedCount = visibleModules.filter((m) => m.allowed).length;

  const handleJoinPage = () => {
    onClose();
    navigate(user.route);
  };

  return (
    <Dialog open={Boolean(user)} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-white border border-slate-200/90 rounded-[2.5rem] shadow-2xl">
        {/* En-tête Super Admin avec identité de l'utilisateur */}
        <DialogHeader className="p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                style={{ borderColor: user.color }}
                className="w-12 h-12 rounded-2xl border-2 p-0.5 bg-white shrink-0 overflow-hidden shadow-lg shadow-black/40"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  <span 
                    style={{ backgroundColor: user.color }}
                    className="w-full h-full rounded-2xl flex items-center justify-center text-white text-base font-black"
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-black text-white uppercase tracking-tight">
                    {user.name}
                  </DialogTitle>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-white/15 text-slate-200 border border-white/10">
                    {user.role} {user.jobTitle ? `• ${user.jobTitle}` : ''}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>En ligne • Position : <strong>{user.sectionLabel}</strong> ({user.route})</span>
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full h-8 w-8 text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Onglets de navigation */}
          <div className="flex items-center gap-2 pt-4 mt-2 border-t border-white/10">
            {[
              { id: 'screen', label: '🖥️ Son Écran en Direct', icon: Monitor },
              { id: 'session', label: '⏱️ Sa Session', icon: Clock },
              { id: 'permissions', label: `🛡️ Ses Rubriques (${allowedCount})`, icon: ShieldCheck },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-md"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                )}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Corps des onglets */}
        <div className="p-6">
          {/* ONGLET 1 : SON ÉCRAN EN DIRECT */}
          {activeTab === 'screen' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Aperçu & Positionnement Curseur en Direct
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    Résolution de son écran : {user.screenWidth || 1920} × {user.screenHeight || 1080} px
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleJoinPage}
                    className="h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-md"
                  >
                    <span>Rejoindre sa page</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Reproduction Miniature de l'Écran (Screen Mirror Frame) */}
              <div className="relative w-full h-64 bg-slate-950 rounded-3xl border-2 border-slate-800 overflow-hidden shadow-inner select-none">
                {/* Barre de navigation simulant le navigateur */}
                <div className="h-7 bg-slate-900/90 border-b border-white/10 px-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500/80" />
                    <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 bg-slate-800/80 px-3 py-0.5 rounded-md truncate max-w-[220px]">
                    https://fus-club.com{user.route}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 font-mono">
                    {user.screenWidth || 1920}×{user.screenHeight || 1080}
                  </span>
                </div>

                {/* Contenu simulé du dashboard */}
                <div className="p-4 flex flex-col justify-between h-[calc(100%-28px)] relative">
                  {/* Filigrane page active */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                      <MapPin className="w-3 h-3 text-primary" />
                      <span>{user.sectionLabel}</span>
                    </div>
                    <div className="h-1.5 w-24 bg-slate-800 rounded-full" />
                  </div>

                  {/* Grille de fond / Repère cartésien */}
                  <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

                  {/* CURSEUR EN DIRECT DANS L'ÉCRAN MIROIR */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${user.xPercent}%`,
                      top: `${user.yPercent}%`,
                      transform: 'translate3d(-2px, -2px, 0)',
                      transition: 'left 80ms linear, top 80ms linear',
                    }}
                    className="pointer-events-none z-20 flex flex-col items-start gap-1"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                    >
                      <path
                        d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                        fill={user.color}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span 
                      style={{ backgroundColor: user.color }}
                      className="px-1.5 py-0.5 rounded text-[8px] font-black text-white shadow-md truncate max-w-[90px]"
                    >
                      {user.name.split(' ')[0]}
                    </span>
                  </div>

                  {/* Pied de l'écran miroir avec coordonnées dynamiques */}
                  <div className="flex items-center justify-between z-10 pt-2 border-t border-white/10 font-mono text-[9px] text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">X: {user.rawX}px</span>
                      <span className="text-sky-400 font-bold">Y: {user.rawY}px</span>
                    </div>
                    <span className="text-slate-400">
                      Coordonnées relatives : ({Math.round(user.xPercent)}%, {Math.round(user.yPercent)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 2 : SA SESSION */}
          {activeTab === 'session' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <p className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                    Statut de Connexion
                  </p>
                  <p className="text-sm font-black text-emerald-600 flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    En Ligne (Session Active)
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <p className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                    Durée de Présence Active
                  </p>
                  <p className="text-sm font-black text-slate-900 font-mono mt-0.5">
                    {formatDuration(elapsedSeconds)}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <p className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                    Appareil / Plateforme
                  </p>
                  <p className="text-sm font-black text-slate-800 flex items-center gap-1.5 mt-0.5 truncate">
                    <Laptop className="w-4 h-4 text-primary shrink-0" />
                    <span>{user.device || 'Navigateur Web'}</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <p className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                    Résolution d'Écran
                  </p>
                  <p className="text-sm font-black text-slate-800 font-mono mt-0.5">
                    {user.screenWidth || 1920} × {user.screenHeight || 1080} px
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs font-mono flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block">
                    ID Utilisateur Supabase
                  </span>
                  <span className="text-[11px] font-bold text-slate-200 truncate max-w-[280px] block">
                    {user.userId}
                  </span>
                </div>
                <Badge className="bg-emerald-500 text-white font-black text-[9px] uppercase">
                  Supabase Live
                </Badge>
              </div>
            </div>
          )}

          {/* ONGLET 3 : SES RUBRIQUES VISIBLES */}
          {activeTab === 'permissions' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Habilitations & Rubriques Autorisées ({allowedCount}/{visibleModules.length})
                </p>
                <span className="text-[9.5px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  Rôle : {user.role}
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {visibleModules.map((mod) => (
                  <div
                    key={mod.id}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors",
                      mod.allowed
                        ? "bg-emerald-50/50 border-emerald-200/60 text-emerald-950"
                        : "bg-slate-50/60 border-slate-200/40 text-slate-400 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {mod.allowed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold block leading-tight">{mod.name}</span>
                        <span className="text-[9px] text-muted-foreground font-mono">{mod.path}</span>
                      </div>
                    </div>

                    <span className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded-md",
                      mod.allowed ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                    )}>
                      {mod.allowed ? 'Autorisé' : 'Masqué'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pied du modal avec option de ciblage du curseur */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: user.color }} />
            <span className="text-xs font-bold text-slate-700">
              Curseur : {isCurrentlyTargeted ? 'Actuellement Ciblé' : 'Non ciblé'}
            </span>
          </div>

          <Button
            onClick={() => onTargetUser(user.userId)}
            className={cn(
              "rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md",
              isCurrentlyTargeted
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-primary hover:bg-primary/90 text-white"
            )}
          >
            <Crosshair className="w-4 h-4" />
            <span>{isCurrentlyTargeted ? 'Retirer le Ciblage' : 'Cibler son Curseur'}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LiveUserInspectorModal;
