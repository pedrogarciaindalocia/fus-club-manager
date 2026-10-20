import React, { useState, useRef, useEffect } from 'react';
import { useLiveCursors } from '../../context/LiveCursorsContext';
import { 
  MousePointer, Users, MapPin, Eye, EyeOff, 
  Filter, Crosshair, ShieldAlert, Check, X, Sparkles, Monitor, MousePointerClick
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import LiveUserInspectorModal from './LiveUserInspectorModal';

export const CollaborativeCursorsWidget: React.FC = () => {
  const {
    enabled,
    setEnabled,
    filterSameSectionOnly,
    setFilterSameSectionOnly,
    selectedUserId,
    setSelectedUserId,
    inspectorUser,
    setInspectorUser,
    remoteCursors,
    allOnlineUsers,
    onlineCount,
    userColor,
    currentSectionLabel,
    isSuperAdmin,
  } = useLiveCursors();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermeture automatique au clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Visibilité STRICTEMENT RÉSERVÉE au Super Admin
  if (!isSuperAdmin) {
    return null;
  }

  const sameSectionCount = allOnlineUsers.filter((c) => c.isSameSection).length;
  const targetedUser = allOnlineUsers.find((c) => c.userId === selectedUserId);

  return (
    <div className="relative" ref={containerRef}>
      {/* Bouton Déclencheur dans le Header (Super Admin uniquement) */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "relative h-9 sm:h-10 px-2.5 sm:px-3 rounded-2xl flex items-center gap-2 border transition-all cursor-pointer shadow-xs",
          enabled 
            ? "bg-slate-900 border-slate-800 text-white hover:bg-slate-800 shadow-md"
            : "bg-slate-100 border-slate-200 text-muted-foreground hover:bg-slate-200"
        )}
        title="Supervision live des curseurs (X, Y) - Réservé Super Admin"
      >
        <div className="relative">
          <MousePointer className={cn("w-4 h-4", enabled ? "text-emerald-400 fill-emerald-400/20" : "text-muted-foreground")} />
          {enabled && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </div>

        {/* Badge & Mode */}
        <div className="hidden md:flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider">
            {selectedUserId ? 'Suivi Ciblé' : 'Curseurs'}
          </span>
          <span className={cn(
            "text-[9px] font-black px-1.5 py-0.2 rounded-md",
            enabled ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-200 text-slate-600"
          )}>
            {enabled ? `${allOnlineUsers.length} en ligne` : 'Désactivé'}
          </span>
        </div>
      </Button>

      {/* Popover / Menu Déroulant Super Admin */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-84 sm:w-[420px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 select-none">
          {/* En-tête Super Admin */}
          <div className="p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div 
                  style={{ backgroundColor: userColor }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/30 border border-white/20"
                >
                  <Crosshair className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black uppercase tracking-tight text-white">
                      Supervision des Curseurs (X, Y)
                    </h4>
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase px-1.5 py-0.2 rounded-md">
                      Super Admin
                    </span>
                  </div>
                  <p className="text-[9.5px] text-slate-300 font-medium truncate max-w-[240px]">
                    📍 Votre position : {currentSectionLabel}
                  </p>
                </div>
              </div>

              {/* Statut connexion */}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-[9px] font-bold text-emerald-300 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {onlineCount} en ligne
              </div>
            </div>
          </div>

          {/* Contrôle 1 : Interrupteur Général Activer / Désactiver */}
          <div className="p-3 bg-slate-50 border-b border-slate-200/80 flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2.5">
                {enabled ? (
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Eye className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <EyeOff className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {enabled ? 'Visualisation Active' : 'Visualisation Désactivée'}
                  </p>
                  <p className="text-[9.5px] text-muted-foreground">
                    Afficher en temps réel les pointeurs et coordonnées X,Y
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  enabled ? "bg-emerald-600" : "bg-slate-300"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                    enabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {/* Contrôle 2 : Mode de ciblage (Tous les utilisateurs OU Utilisateur spécifique) */}
            {enabled && (
              <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSelectedUserId(null)}
                  className={cn(
                    "flex-1 py-1 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    selectedUserId === null
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Users className="w-3 h-3" />
                  <span>Tous ({allOnlineUsers.length})</span>
                </button>

                <button
                  type="button"
                  disabled={allOnlineUsers.length === 0}
                  className={cn(
                    "flex-1 py-1 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                    selectedUserId !== null
                      ? "bg-primary text-white shadow-xs"
                      : "text-muted-foreground opacity-75"
                  )}
                >
                  <Crosshair className="w-3 h-3" />
                  <span>{selectedUserId ? '1 Utilisateur Ciblé' : 'Cibler un User'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Bannière de Focus Utilisateur Ciblé */}
          {enabled && targetedUser && (
            <div className="mx-3 mt-3 p-3 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div 
                  style={{ borderColor: targetedUser.color }}
                  className="w-9 h-9 rounded-full border-2 p-0.5 bg-white shrink-0 overflow-hidden shadow-xs"
                >
                  {targetedUser.avatarUrl ? (
                    <img src={targetedUser.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span 
                      style={{ backgroundColor: targetedUser.color }}
                      className="w-full h-full rounded-full flex items-center justify-center text-white text-[11px] font-black"
                    >
                      {targetedUser.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900 truncate">
                      {targetedUser.name}
                    </span>
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded-md bg-primary text-white">
                      Ciblé
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[9.5px] text-muted-foreground truncate">
                    <MapPin className="w-2.5 h-2.5 text-primary shrink-0" />
                    <span className="truncate">{targetedUser.sectionLabel}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInspectorUser(targetedUser)}
                  className="h-8 px-2.5 rounded-xl border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-black text-[9.5px] uppercase tracking-wider flex items-center gap-1 shadow-xs cursor-pointer"
                  title="Inspecter l'écran, la session et les rubriques"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Inspecter</span>
                </Button>

                <div className="font-mono text-[9.5px] text-right bg-white px-2 py-1 rounded-xl border border-primary/20 shadow-xs hidden sm:block">
                  <div className="text-emerald-600 font-bold">X: {targetedUser.rawX}px</div>
                  <div className="text-sky-600 font-bold">Y: {targetedUser.rawY}px</div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedUserId(null)}
                  className="h-7 w-7 rounded-lg hover:bg-black/5 text-muted-foreground"
                  title="Revenir à la vue de tous les utilisateurs"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Liste des Utilisateurs Détectés pour Sélection */}
          <div className="p-3 max-h-64 overflow-y-auto space-y-1.5">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Choisir un utilisateur à superviser ({allOnlineUsers.length})
              </span>
              {sameSectionCount > 0 && (
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {sameSectionCount} sur votre page
                </span>
              )}
            </div>

            {allOnlineUsers.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Users className="w-7 h-7 mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="text-xs font-bold text-slate-800">Aucun utilisateur connecté pour le moment</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Les utilisateurs connectés (Scouts, Staff, Coachs) apparaîtront ici dès qu'ils naviguent sur le dashboard.
                </p>
              </div>
            ) : (
              allOnlineUsers.map((user) => {
                const isSelected = selectedUserId === user.userId;

                return (
                  <div
                    key={user.userId}
                    onClick={() => {
                      if (!enabled) setEnabled(true);
                      setSelectedUserId(isSelected ? null : user.userId);
                    }}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer",
                      isSelected
                        ? "bg-primary/5 border-primary shadow-sm"
                        : "bg-slate-50/80 hover:bg-slate-100 border-slate-200/60"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar */}
                      <div 
                        style={{ borderColor: user.color }}
                        className="w-8 h-8 rounded-full border-2 p-0.5 bg-white shrink-0 overflow-hidden"
                      >
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span 
                            style={{ backgroundColor: user.color }}
                            className="w-full h-full rounded-full flex items-center justify-center text-white text-[10px] font-black"
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {user.name}
                          </span>
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700">
                            {user.role}
                          </span>
                          {user.lastClick && Date.now() - user.lastClick.timestamp < 3500 && (
                            <span className="text-[7.5px] font-black uppercase px-1 py-0.2 rounded bg-amber-500 text-white flex items-center gap-0.5 animate-pulse">
                              <MousePointerClick className="w-2 h-2" />
                              Clic
                            </span>
                          )}
                        </div>

                        {/* Rubrique où il se situe */}
                        <div className="flex items-center gap-1 text-[9.5px] text-muted-foreground truncate">
                          <MapPin className="w-2.5 h-2.5 text-primary shrink-0" />
                          <span className="truncate">{user.sectionLabel}</span>
                          {user.isSameSection && (
                            <span className="text-[8px] font-black text-emerald-600 bg-emerald-100/80 px-1.5 rounded-full shrink-0">
                              Même page
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions de Sélection & Coordonnées */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right font-mono text-[9px] bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-xs">
                        <div className="text-emerald-600 font-bold">X: {user.rawX}</div>
                        <div className="text-sky-600 font-bold">Y: {user.rawY}</div>
                      </div>

                      {/* Bouton d'inspection rapide écran/session */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectorUser(user);
                        }}
                        className="h-8 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9.5px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border border-slate-200 shadow-xs"
                        title="Inspecter l'écran en direct, la session et les rubriques"
                      >
                        <Monitor className="w-3.5 h-3.5 text-primary" />
                        <span className="hidden sm:inline">Inspecter</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!enabled) setEnabled(true);
                          setSelectedUserId(isSelected ? null : user.userId);
                        }}
                        className={cn(
                          "h-8 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer",
                          isSelected
                            ? "bg-primary text-white shadow-sm"
                            : "bg-slate-200/80 hover:bg-slate-300 text-slate-700"
                        )}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Ciblé</span>
                          </>
                        ) : (
                          <>
                            <Crosshair className="w-3 h-3" />
                            <span>Cibler</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pied du popover */}
          <div className="p-3 bg-slate-100/80 border-t border-slate-200/80 flex items-center justify-between text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1 text-slate-700 font-semibold">
              🔒 Sécurisé Supabase Realtime
            </span>
            <span>
              {selectedUserId ? '1 curseur ciblé affiché' : `Tous les curseurs (${remoteCursors.length})`}
            </span>
          </div>
        </div>
      )}

      {/* Modal d'Inspection Approfondie Super Admin (Écran, Session & Rubriques) */}
      <LiveUserInspectorModal
        user={inspectorUser}
        onClose={() => setInspectorUser(null)}
        onTargetUser={(id) => {
          setSelectedUserId(selectedUserId === id ? null : id);
        }}
        isCurrentlyTargeted={Boolean(inspectorUser && selectedUserId === inspectorUser.userId)}
      />
    </div>
  );
};

export default CollaborativeCursorsWidget;
