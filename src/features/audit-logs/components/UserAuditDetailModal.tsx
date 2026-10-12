import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Calendar, 
  Clock, 
  Laptop, 
  Activity, 
  FileJson, 
  Globe, 
  ShieldCheck, 
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import type { UserSession, AuditLog } from '../../../types/audit';
import { Button } from '../../../components/ui/button';

export interface UserLatestAction {
  action: string;
  module: string;
  description: string;
  timestamp: string;
  platform: 'web' | 'mobile';
}

export interface UserSummaryItem {
  userId: string | null;
  userEmail: string | null;
  userName: string;
  userAvatar: string | null;
  jobTitle: string;
  status: 'ACTIVE' | 'IDLE' | 'LOGGED_OUT';
  activePlatform?: 'web' | 'mobile' | 'both' | 'none';
  lastPlatform?: 'web' | 'mobile';
  latestAction?: UserLatestAction | null;
  lastActivity: string;
  totalSessions: number;
  totalEvents: number;
  sessions: UserSession[];
  logs: AuditLog[];
}

interface UserAuditDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSummaryItem | null;
  onOpenSessionTimeline: (sessionId: string) => void;
}

export const UserAuditDetailModal: React.FC<UserAuditDetailModalProps> = ({
  isOpen,
  onClose,
  user,
  onOpenSessionTimeline
}) => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'logs'>('sessions');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedLogJson, setSelectedLogJson] = useState<AuditLog | null>(null);

  // Filtrage des sessions par dates (sécurisé si user est null)
  const filteredSessions = useMemo(() => {
    if (!user?.sessions) return [];
    return user.sessions.filter(s => {
      const matchStart = !startDate || new Date(s.login_at) >= new Date(startDate);
      const matchEnd = !endDate || new Date(s.login_at) <= new Date(endDate + 'T23:59:59');
      return matchStart && matchEnd;
    });
  }, [user, startDate, endDate]);

  // Filtrage des actions d'audit réelles par dates (sécurisé si user est null)
  const filteredLogs = useMemo(() => {
    if (!user?.logs) return [];
    return user.logs.filter(l => {
      const matchStart = !startDate || new Date(l.created_at) >= new Date(startDate);
      const matchEnd = !endDate || new Date(l.created_at) <= new Date(endDate + 'T23:59:59');
      return matchStart && matchEnd;
    });
  }, [user, startDate, endDate]);

  if (!isOpen || !user) return null;

  // Calcul de la durée
  const calculateDuration = (startStr: string, endStr: string | null) => {
    const start = new Date(startStr).getTime();
    const end = endStr ? new Date(endStr).getTime() : Date.now();
    const diffMs = Math.max(0, end - start);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
    if (diffMins > 60) {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
    return `${diffMins}m ${diffSecs}s`;
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'LOGOUT':
      case 'SESSION_EXPIRED':
        return 'bg-secondary text-muted-foreground border-border';
      case 'CONCURRENT_LOGIN_DETECTED':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-background/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-border bg-secondary/10 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-4">
              <div className="relative">
                {user.userAvatar ? (
                  <img
                    src={user.userAvatar}
                    alt={user.userName}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-border shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 text-primary-foreground font-black text-lg flex items-center justify-center border-2 border-primary/20 shadow-md">
                    {user.userName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${
                    user.status === 'ACTIVE' ? 'bg-emerald-500' : user.status === 'IDLE' ? 'bg-amber-500' : 'bg-muted-foreground/40'
                  }`}
                  title={user.status === 'ACTIVE' ? 'En ligne' : user.status === 'IDLE' ? 'Inactif' : 'Déconnecté'}
                />
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-black text-foreground">{user.userName}</h3>
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    {user.jobTitle}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                    user.status === 'ACTIVE' 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : user.status === 'IDLE'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-secondary text-muted-foreground border-border'
                  }`}>
                    {user.status === 'ACTIVE' ? 'En ligne' : user.status === 'IDLE' ? 'Inactif' : 'Déconnecté'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-3 mt-1">
                  <span>{user.userEmail || 'Email non renseigné'}</span>
                  <span>•</span>
                  <span>Dernière activité : <strong className="text-foreground">{new Date(user.lastActivity).toLocaleString('fr-FR')}</strong></span>
                </div>
              </div>
            </div>

            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="rounded-xl w-10 h-10 hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Controls Bar : Tabs + Date Range Picker */}
          <div className="px-6 py-3.5 border-b border-border/80 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-secondary/40 rounded-xl border border-border/60 w-fit">
              <button
                onClick={() => setActiveTab('sessions')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'sessions'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Sessions ({filteredSessions.length})
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'logs'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Activity className="w-3.5 h-3.5" /> Actions Réelles ({filteredLogs.length})
              </button>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Période :
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 px-2 bg-secondary/50 text-foreground text-xs font-bold rounded-lg border border-border/60 outline-none cursor-pointer"
                title="Date de début"
              />
              <span className="text-xs text-muted-foreground">à</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 px-2 bg-secondary/50 text-foreground text-xs font-bold rounded-lg border border-border/60 outline-none cursor-pointer"
                title="Date de fin"
              />
              {(startDate || endDate) && (
                <Button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs font-bold text-muted-foreground hover:text-foreground gap-1"
                  title="Réinitialiser les dates"
                >
                  <RotateCcw className="w-3 h-3" /> Effacer
                </Button>
              )}
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeTab === 'sessions' ? (
              filteredSessions.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm font-bold text-foreground">Aucune session sur cette période</p>
                  <p className="text-xs text-muted-foreground">Ajustez la plage de dates ci-dessus.</p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-secondary/20 border-b border-border">
                      <tr>
                        <th className="text-left py-3.5 px-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Session ID</th>
                        <th className="text-left py-3.5 px-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Connexion / Déconnexion</th>
                        <th className="text-center py-3.5 px-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Durée</th>
                        <th className="text-left py-3.5 px-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Appareil & IP</th>
                        <th className="text-center py-3.5 px-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actions</th>
                        <th className="text-center py-3.5 px-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Statut</th>
                        <th className="text-right py-3.5 px-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Détail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredSessions.map((s) => (
                        <tr key={s.session_id} className="hover:bg-secondary/10 transition-colors">
                          <td className="py-3 px-5 font-mono text-xs font-bold text-primary">
                            {s.session_id}
                          </td>
                          <td className="py-3 px-5 text-xs text-muted-foreground">
                            <div>In: <strong className="text-foreground">{new Date(s.login_at).toLocaleString('fr-FR')}</strong></div>
                            {s.logout_at && <div className="text-[11px] text-muted-foreground">Out: {new Date(s.logout_at).toLocaleString('fr-FR')}</div>}
                          </td>
                          <td className="py-3 px-5 text-center font-bold text-xs text-foreground">
                            {calculateDuration(s.login_at, s.logout_at)}
                          </td>
                          <td className="py-3 px-5 text-xs text-muted-foreground">
                            {(() => {
                              const isMob = s.session_id?.startsWith('MOB-') || (s.device || '').toLowerCase().includes('fus-app') || (s.device || '').toLowerCase().includes('mobile');
                              return (
                                <>
                                  <div className="font-bold text-foreground flex items-center gap-1.5">
                                    {isMob ? (
                                      <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-extrabold">
                                        📱 {s.device || 'Fus-App Mobile'}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-primary font-extrabold">
                                        <Laptop className="w-3.5 h-3.5" /> {s.device || 'Web Dashboard'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-mono text-[10px]">{s.ip_address}</div>
                                </>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-5 text-center">
                            <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-black text-xs">
                              {s.event_count || 0}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                              s.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : s.status === 'TERMINATED_CONCURRENT'
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                  : 'bg-secondary text-muted-foreground border-border'
                            }`}>
                              {s.status === 'ACTIVE' ? 'Active' : s.status === 'TERMINATED_CONCURRENT' ? 'Concurrente' : s.status}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right">
                            <Button
                              onClick={() => onOpenSessionTimeline(s.session_id)}
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 hover:bg-primary hover:text-white"
                            >
                              <Eye className="w-3.5 h-3.5" /> Timeline
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* TAB 2 : ACTIONS RÉELLES D'AUDIT */
              filteredLogs.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <Activity className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm font-bold text-foreground">Aucune action d'audit sur cette période</p>
                  <p className="text-xs text-muted-foreground">Les actions de création, mise à jour ou suppression apparaîtront ici.</p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-secondary/20 border-b border-border">
                      <tr>
                        <th className="text-left py-3.5 px-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Horodatage</th>
                        <th className="text-left py-3.5 px-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action & Module</th>
                        <th className="text-left py-3.5 px-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description Réelle</th>
                        <th className="text-center py-3.5 px-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Diff JSON</th>
                        <th className="text-center py-3.5 px-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Résultat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-secondary/10 transition-colors">
                          <td className="py-3 px-5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('fr-FR')}
                          </td>
                          <td className="py-3 px-5">
                            {(() => {
                              const isMob = log.session_id?.startsWith('MOB-') || (log.module || '').toUpperCase().includes('MOBILE');
                              return (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${getActionBadgeClass(log.action)}`}>
                                      {log.action}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground">{log.module}</span>
                                  </div>
                                  <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                    {isMob ? '📱 Fus-App Mobile' : '💻 Web Dashboard'}
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-5 text-xs font-semibold text-foreground max-w-lg">
                            {log.description}
                          </td>
                          <td className="py-3 px-5 text-center">
                            {(log.old_values || log.new_values) ? (
                              <button
                                onClick={() => setSelectedLogJson(log)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-lg transition-colors"
                              >
                                <FileJson className="w-3 h-3" /> Voir Diff
                              </button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 px-5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-red-500/10 text-red-600 border-red-500/30'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </motion.div>

        {/* Modal Secondaire Diff JSON */}
        {selectedLogJson && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-primary" /> Détail des Modifications JSON
                </h4>
                <Button onClick={() => setSelectedLogJson(null)} variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3 font-mono text-xs">
                {selectedLogJson.old_values && (
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-red-500 pb-1">Valeurs Précédentes :</div>
                    <pre className="p-3 rounded-xl bg-secondary/50 border border-border/80 overflow-x-auto text-foreground">
                      {JSON.stringify(selectedLogJson.old_values, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLogJson.new_values && (
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-emerald-500 pb-1">Nouvelles Valeurs :</div>
                    <pre className="p-3 rounded-xl bg-secondary/50 border border-border/80 overflow-x-auto text-foreground">
                      {JSON.stringify(selectedLogJson.new_values, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default UserAuditDetailModal;
