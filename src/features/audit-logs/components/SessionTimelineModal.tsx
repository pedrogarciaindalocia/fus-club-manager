import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Clock, 
  User, 
  Laptop, 
  ShieldCheck, 
  Activity, 
  Eye, 
  ChevronRight, 
  CheckCircle2, 
  XCircle,
  FileJson
} from 'lucide-react';
import type { UserSession, AuditLog } from '../../../types/audit';
import { Button } from '../../../components/ui/button';

interface SessionTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession | null;
  events: AuditLog[];
}

export const SessionTimelineModal: React.FC<SessionTimelineModalProps> = ({
  isOpen,
  onClose,
  session,
  events
}) => {
  const [selectedEvent, setSelectedEvent] = useState<AuditLog | null>(null);

  if (!isOpen || !session) return null;

  const calculateDuration = (startStr: string, endStr: string | null) => {
    const start = new Date(startStr).getTime();
    const end = endStr ? new Date(endStr).getTime() : Date.now();
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
    if (diffMins > 60) {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
    return `${diffMins}m ${diffSecs}s`;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'LOGOUT':
        return 'bg-secondary text-muted-foreground border-border';
      case 'CREATE':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'UPDATE':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'DELETE':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-card text-card-foreground border border-border rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-secondary/20 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
                  Timeline de Session : <span className="font-mono text-primary">{session.session_id}</span>
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Trace chronologique complète des événements exécutés pendant cette session
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Session Overview Bar */}
          <div className="px-6 py-4 bg-secondary/10 border-b border-border grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0 text-xs">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Utilisateur</span>
              <div className="font-bold text-foreground truncate">{session.user_email || 'Inconnu'}</div>
              <div className="text-[10px] text-muted-foreground uppercase">{session.user_role}</div>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Connexion & Durée</span>
              <div className="font-bold text-foreground">{formatTime(session.login_at)}</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                Durée: {calculateDuration(session.login_at, session.logout_at)}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Appareil & IP</span>
              <div className="font-bold text-foreground">{session.device || 'Desktop'}</div>
              <div className="font-mono text-[10px] text-muted-foreground">{session.ip_address}</div>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Événements Tracés</span>
              <div className="font-black text-primary text-base">{events.length} actions</div>
              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                session.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-secondary text-muted-foreground border-border'
              }`}>
                {session.status}
              </span>
            </div>
          </div>

          {/* Body content (Timeline left + Event detail right) */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Left: Chronological Timeline */}
            <div className="md:col-span-6 p-6 overflow-y-auto space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
                Séquence Horodatée ({events.length})
              </h4>

              {events.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs italic">
                  Aucun événement d'audit enregistré pour cette session.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {events.map((evt) => {
                    const isSelected = selectedEvent?.id === evt.id;
                    return (
                      <div
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className={`relative group cursor-pointer p-3 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-primary shadow-sm'
                            : 'bg-secondary/20 border-border hover:bg-secondary/40'
                        }`}
                      >
                        {/* Timeline Node Icon */}
                        <div className={`absolute -left-[1.65rem] top-3.5 w-4 h-4 rounded-full border-2 bg-card ${
                          evt.status === 'FAILED' ? 'border-destructive bg-destructive/20' : 'border-primary bg-primary'
                        }`} />

                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-black text-foreground">
                            {formatTime(evt.created_at)}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${getActionBadgeClass(evt.action)}`}>
                            {evt.action}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-foreground mt-1 truncate">
                          {evt.description}
                        </div>

                        <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground font-medium">
                          <span>Module: <strong className="text-foreground">{evt.module}</strong></span>
                          {(evt.old_values || evt.new_values) && (
                            <span className="flex items-center gap-1 text-primary font-bold">
                              <FileJson className="w-3 h-3" /> Diff disponible
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Selected Event Details & Diff */}
            <div className="md:col-span-6 p-6 overflow-y-auto bg-secondary/10">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
                Détail de l'Événement Sélectionné
              </h4>

              {selectedEvent ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase border ${getActionBadgeClass(selectedEvent.action)}`}>
                        {selectedEvent.action}
                      </span>
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        {formatTime(selectedEvent.created_at)}
                      </span>
                    </div>

                    <h5 className="font-bold text-sm text-foreground">{selectedEvent.description}</h5>

                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs border-t border-border text-muted-foreground">
                      <div>Module : <strong className="text-foreground">{selectedEvent.module}</strong></div>
                      <div>Résultat : <strong className={selectedEvent.status === 'SUCCESS' ? 'text-emerald-600 font-bold' : 'text-destructive font-bold'}>{selectedEvent.status}</strong></div>
                      {selectedEvent.entity_type && (
                        <div>Cible : <strong className="text-foreground">{selectedEvent.entity_type} #{selectedEvent.entity_id || ''}</strong></div>
                      )}
                    </div>
                  </div>

                  {/* Old vs New Values Diff */}
                  {selectedEvent.old_values && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                        Anciennes Valeurs (old_values)
                      </label>
                      <pre className="p-3 rounded-xl bg-slate-950 text-amber-400 text-xs font-mono overflow-x-auto max-h-40">
                        {JSON.stringify(selectedEvent.old_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedEvent.new_values && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                        Nouvelles Valeurs (new_values)
                      </label>
                      <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 text-xs font-mono overflow-x-auto max-h-40">
                        {JSON.stringify(selectedEvent.new_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedEvent.metadata && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                        Métadonnées Techniques
                      </label>
                      <pre className="p-3 rounded-xl bg-slate-950 text-blue-300 text-xs font-mono overflow-x-auto max-h-40">
                        {JSON.stringify(selectedEvent.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center text-muted-foreground text-xs font-medium italic border-2 border-dashed border-border rounded-2xl">
                  Cliquez sur un événement dans la timeline à gauche pour inspecter ses détails et modifications.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
