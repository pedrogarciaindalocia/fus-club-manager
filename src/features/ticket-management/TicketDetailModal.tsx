import React, { useState, useEffect } from 'react';
import { 
  X, Send, CheckCircle2, Clock, AlertTriangle, AlertCircle, 
  ExternalLink, User, MessageSquare, Paperclip, ChevronDown, 
  CornerDownRight, Loader2, Sparkles, Check, Briefcase
} from 'lucide-react';
import type { SupportTicket, TicketMessage, TicketStatus } from './types';
import { CATEGORY_LABELS, PRIORITY_CONFIG, STATUS_CONFIG } from './types';
import { ticketService } from './ticketService';
import { usePermissions } from '../../context/PermissionsContext';
import { toast } from 'sonner';

interface TicketDetailModalProps {
  ticket: SupportTicket | null;
  onClose: () => void;
  onStatusChange: (ticketId: string, newStatus: TicketStatus) => void;
  onTicketUpdated: () => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  onClose,
  onStatusChange,
  onTicketUpdated,
}) => {
  const { authState } = usePermissions();
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>(ticket?.status || 'open');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (ticket) {
      setCurrentStatus(ticket.status);
      loadMessages();
    }
  }, [ticket]);

  const loadMessages = async () => {
    if (!ticket) return;
    setLoadingMessages(true);
    try {
      const data = await ticketService.getTicketMessages(ticket.id);
      setMessages(data);
    } catch (err) {
      console.error('Erreur chargement messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  if (!ticket) return null;

  const handleStatusUpdate = async (newStatus: TicketStatus) => {
    try {
      setCurrentStatus(newStatus);
      await ticketService.updateTicketStatus(ticket.id, newStatus);
      onStatusChange(ticket.id, newStatus);
      toast.success(`Statut du ticket mis à jour : ${STATUS_CONFIG[newStatus].label}`);
    } catch (err) {
      toast.error('Erreur lors de la mise à jour du statut');
      setCurrentStatus(ticket.status);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const staffUser = {
        id: authState.user?.id,
        email: authState.user?.email,
        full_name: authState.user?.full_name || 'Staff Support FUS',
        avatar_url: authState.user?.avatar_url,
      };

      const newMsg = await ticketService.sendStaffReply(ticket.id, replyText, staffUser);
      setMessages(prev => [...prev, newMsg]);
      setReplyText('');
      if (currentStatus === 'open') {
        setCurrentStatus('in_progress');
        onStatusChange(ticket.id, 'in_progress');
      }
      onTicketUpdated();
      toast.success('Réponse envoyée au demandeur');
    } catch (err) {
      toast.error("Impossible d'envoyer la réponse");
    } finally {
      setSendingReply(false);
    }
  };

  const priorityStyle = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const statusStyle = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.open;

  // Extraction propre des pièces jointes (support URL string ou objet { url })
  const rawAttachments = ticket.attachments || [];
  const attachmentsList: string[] = rawAttachments
    .map(att => (typeof att === 'string' ? att : att?.url))
    .filter((url): url is string => Boolean(url));

  const userName = ticket.profile?.full_name || ticket.user_name || 'Utilisateur';
  const userAvatar = ticket.profile?.avatar_url || ticket.user_avatar;
  const userInitial = userName.charAt(0).toUpperCase() || 'U';

  const formattedDate = new Date(ticket.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* En-tête de la Modal */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                  TICKET #{ticket.id.slice(0, 8).toUpperCase()}
                </span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusStyle.bg} ${statusStyle.color}`}>
                  {statusStyle.label}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 line-clamp-1">
                {ticket.subject}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Statut sélecteur rapide */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm">
              <span className="text-slate-400 hidden sm:inline">Statut :</span>
              <select
                value={currentStatus}
                onChange={(e) => handleStatusUpdate(e.target.value as TicketStatus)}
                className="bg-transparent border-none outline-none font-semibold cursor-pointer text-slate-900 dark:text-white"
              >
                <option value="open">Ouvert</option>
                <option value="in_progress">En cours</option>
                <option value="resolved">Résolu</option>
                <option value="closed">Fermé</option>
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
              aria-label="Fermer la modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps de la boîte de détail (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Fiche d'identité du demandeur (Fus-App) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-red-500/20 shadow-sm"
                  onError={(e) => {
                    // Fallback vers l'avatar généré si l'image est introuvable
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-red-400 text-white font-bold text-lg flex items-center justify-center shadow-sm">
                  {userInitial}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {userName}
                  </h3>
                  {ticket.profile?.job_title && (
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold border border-red-200 dark:border-red-800 flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {ticket.profile.job_title}
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                    {ticket.profile?.system_role || 'Membre Fus-App'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 mt-0.5">
                  <span>{ticket.user_email || ticket.profile?.phone_number || 'Non renseigné'}</span>
                  <span>•</span>
                  <span>Soumis le {formattedDate}</span>
                </div>
              </div>
            </div>

            {/* Badges Catégorie et Priorité */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                {CATEGORY_LABELS[ticket.category] || ticket.category}
              </span>
              <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${priorityStyle.bg} ${priorityStyle.color} ${priorityStyle.border}`}>
                Priorité : {priorityStyle.label}
              </span>
            </div>
          </div>

          {/* Description originale du ticket */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Description de la demande
            </h4>
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed shadow-sm">
              {ticket.description}
            </div>
          </div>

          {/* Pièces jointes (Photos / Captures d'écran) */}
          {attachmentsList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Pièces jointes & Captures d'écran ({attachmentsList.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {attachmentsList.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => setPreviewImage(url)}
                    className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-sm hover:shadow-md transition"
                  >
                    <img
                      src={url}
                      alt={`Pièce jointe ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-xs font-medium gap-1">
                      <ExternalLink className="w-4 h-4" />
                      <span>Agrandir</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fil de discussion & Réponses du staff */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Échanges & Réponses ({messages.length})
              </h4>
            </div>

            {loadingMessages ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm">Chargement des échanges...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-sm">
                Aucune réponse pour le moment. Rédigez le premier message ci-dessous pour répondre à l'utilisateur.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isStaff = msg.sender_role === 'staff' || msg.sender_role === 'admin';
                  const msgDate = new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: 'short',
                  });

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 p-4 rounded-xl border ${
                        isStaff
                          ? 'bg-red-50/30 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40 ml-4'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 mr-4'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {msg.sender_avatar ? (
                          <img
                            src={msg.sender_avatar}
                            alt={msg.sender_name || 'Auteur'}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                              isStaff ? 'bg-red-600' : 'bg-slate-600'
                            }`}
                          >
                            {(msg.sender_name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {msg.sender_name || (isStaff ? 'Staff Support FUS' : userName)}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                isStaff
                                  ? 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {isStaff ? 'Staff' : 'Demandeur'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">{msgDate}</span>
                        </div>
                        <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Formulaire de réponse (Staff Reply Box) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <form onSubmit={handleSendReply} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Rédiger une réponse à destination de l'utilisateur Fus-App..."
                rows={2}
                disabled={sendingReply}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || sendingReply}
                className="px-5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-md shadow-red-600/20"
              >
                {sendingReply ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Répondre</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Le demandeur sera notifié et verra cette réponse dans l'application mobile.</span>
              <span className="italic">Entrée pour aller à la ligne</span>
            </div>
          </form>
        </div>

      </div>

      {/* Aperçu plein écran de photo/screenshot */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="Aperçu plein écran"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
