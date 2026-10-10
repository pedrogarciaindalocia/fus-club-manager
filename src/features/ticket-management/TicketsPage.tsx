import React, { useState, useEffect, useMemo } from 'react';
import { 
  LifeBuoy, Search, Filter, MessageSquare, AlertCircle, Clock, 
  CheckCircle2, AlertTriangle, Paperclip, ChevronRight, RefreshCw, 
  User, Eye, Sparkles, Inbox, Trash2, ArrowUpDown, Briefcase, X
} from 'lucide-react';
import type { SupportTicket, TicketStatus } from './types';
import { CATEGORY_LABELS, PRIORITY_CONFIG, STATUS_CONFIG } from './types';
import { OFFICIAL_JOB_TITLES } from '../../constants/roles';
import { ticketService } from './ticketService';
import { TicketDetailModal } from './TicketDetailModal';
import { toast } from 'sonner';

export const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await ticketService.getAllTickets();
      setTickets(data);
    } catch (err) {
      console.error('Erreur chargement tickets:', err);
      toast.error('Impossible de charger les tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const unsubscribe = ticketService.subscribeToChanges(() => {
      fetchTickets();
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Statistiques calculées
  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'open').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const resolved = tickets.filter(t => t.status === 'resolved').length;
    const closed = tickets.filter(t => t.status === 'closed').length;
    return { total, open, inProgress, resolved, closed };
  }, [tickets]);

  // Calcul des intitulés de postes disponibles et de leurs décomptes
  const { availableJobTitles, jobTitleCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    let noneCount = 0;

    tickets.forEach(t => {
      const title = (t.profile?.job_title || '').trim();
      if (!title) {
        noneCount++;
      } else {
        const lower = title.toLowerCase();
        counts[lower] = (counts[lower] || 0) + 1;
      }
    });

    const ticketTitles = tickets
      .map(t => t.profile?.job_title?.trim())
      .filter((title): title is string => Boolean(title && title.length > 0));

    const combined = [...OFFICIAL_JOB_TITLES, ...ticketTitles];
    const uniqueMap = new Map<string, string>();
    combined.forEach(t => {
      const lower = t.toLowerCase();
      if (!uniqueMap.has(lower)) {
        uniqueMap.set(lower, t);
      }
    });

    return {
      availableJobTitles: Array.from(uniqueMap.values()).sort((a, b) => a.localeCompare(b)),
      jobTitleCounts: { counts, noneCount }
    };
  }, [tickets]);

  // Filtrage des tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Filtre statut
      if (selectedStatus !== 'all' && ticket.status !== selectedStatus) return false;

      // Filtre catégorie
      if (selectedCategory !== 'all' && ticket.category !== selectedCategory) return false;

      // Filtre priorité
      if (selectedPriority !== 'all' && ticket.priority !== selectedPriority) return false;

      // Filtre intitulé de poste
      if (selectedJobTitle !== 'all') {
        if (selectedJobTitle === 'none') {
          if (ticket.profile?.job_title && ticket.profile.job_title.trim().length > 0) return false;
        } else {
          const userTitle = (ticket.profile?.job_title || '').trim().toLowerCase();
          if (userTitle !== selectedJobTitle.toLowerCase()) return false;
        }
      }

      // Recherche plein texte
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const userName = (ticket.profile?.full_name || ticket.user_name || '').toLowerCase();
        const jobTitle = (ticket.profile?.job_title || '').toLowerCase();
        const email = (ticket.user_email || '').toLowerCase();
        const subject = (ticket.subject || '').toLowerCase();
        const desc = (ticket.description || '').toLowerCase();
        const ticketId = ticket.id.toLowerCase();

        return (
          userName.includes(query) ||
          jobTitle.includes(query) ||
          email.includes(query) ||
          subject.includes(query) ||
          desc.includes(query) ||
          ticketId.includes(query)
        );
      }

      return true;
    });
  }, [tickets, selectedStatus, selectedCategory, selectedPriority, selectedJobTitle, searchQuery]);

  const handleStatusChangeFromModal = (ticketId: string, newStatus: TicketStatus) => {
    setTickets(prev =>
      prev.map(t => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket(prev => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const handleDeleteTicket = async (e: React.MouseEvent, ticketId: string) => {
    e.stopPropagation();
    if (!window.confirm('Voulez-vous vraiment supprimer définitivement ce ticket ?')) return;

    try {
      await ticketService.deleteTicket(ticketId);
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      if (selectedTicket?.id === ticketId) setSelectedTicket(null);
      toast.success('Ticket supprimé avec succès');
    } catch (err) {
      toast.error('Erreur lors de la suppression du ticket');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-red-600/10 text-red-600 dark:text-red-400">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Support & Tickets Fus-App
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Centralisation des demandes, bugs et signalements soumis par les utilisateurs mobiles
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchTickets}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Cartes KPI / Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Tous les tickets */}
        <div 
          onClick={() => setSelectedStatus('all')}
          className={`cursor-pointer p-4 rounded-2xl border transition shadow-sm ${
            selectedStatus === 'all'
              ? 'bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-800 ring-2 ring-red-500/20'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total reçus
            </span>
            <Inbox className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.total}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Toutes catégories confondues</span>
        </div>

        {/* Ouverts */}
        <div 
          onClick={() => setSelectedStatus('open')}
          className={`cursor-pointer p-4 rounded-2xl border transition shadow-sm ${
            selectedStatus === 'open'
              ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800 ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Nouveaux / Ouverts
            </span>
            <AlertCircle className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
            {stats.open}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">En attente de prise en charge</span>
        </div>

        {/* En cours */}
        <div 
          onClick={() => setSelectedStatus('in_progress')}
          className={`cursor-pointer p-4 rounded-2xl border transition shadow-sm ${
            selectedStatus === 'in_progress'
              ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              En cours
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {stats.inProgress}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Traitement & échanges actifs</span>
        </div>

        {/* Résolus */}
        <div 
          onClick={() => setSelectedStatus('resolved')}
          className={`cursor-pointer p-4 rounded-2xl border transition shadow-sm ${
            selectedStatus === 'resolved'
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Résolus & Traités
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.resolved}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Demandes clôturées avec succès</span>
        </div>

      </div>

      {/* Barre d'outils, Recherche & Filtres */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          
          {/* Champ Recherche */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par demandeur, sujet, mot-clé ou identifiant..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-600"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Filtres Intitulé de Poste, Catégorie et Priorité */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtre Intitulé de Poste */}
            <select
              value={selectedJobTitle}
              onChange={(e) => setSelectedJobTitle(e.target.value)}
              className={`px-3 py-2.5 rounded-xl border text-xs font-semibold outline-none cursor-pointer max-w-[210px] truncate transition ${
                selectedJobTitle !== 'all'
                  ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold ring-2 ring-red-500/10'
                  : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:border-red-500'
              }`}
              title="Filtrer par intitulé de poste du demandeur"
            >
              <option value="all">Tous les postes ({tickets.length})</option>
              {availableJobTitles.map(title => {
                const count = jobTitleCounts.counts[title.toLowerCase()] || 0;
                return (
                  <option key={title} value={title}>
                    💼 {title} ({count})
                  </option>
                );
              })}
              {jobTitleCounts.noneCount > 0 && (
                <option value="none">
                  ⚠️ Sans poste ({jobTitleCounts.noneCount})
                </option>
              )}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-red-500"
            >
              <option value="all">Toutes catégories</option>
              <option value="technique">Technique / Bug</option>
              <option value="compte">Compte & Accès</option>
              <option value="matchs">Matchs & Compétitions</option>
              <option value="suggestion">Suggestions</option>
              <option value="autre">Autres</option>
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-red-500"
            >
              <option value="all">Toutes priorités</option>
              <option value="urgent">Urgente</option>
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Basse</option>
            </select>
          </div>
        </div>

        {/* Onglets Filtres Rapides par Statut */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-medium">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              selectedStatus === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Tous ({stats.total})
          </button>
          <button
            onClick={() => setSelectedStatus('open')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              selectedStatus === 'open'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Ouverts ({stats.open})
          </button>
          <button
            onClick={() => setSelectedStatus('in_progress')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              selectedStatus === 'in_progress'
                ? 'bg-amber-600 text-white font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            En cours ({stats.inProgress})
          </button>
          <button
            onClick={() => setSelectedStatus('resolved')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              selectedStatus === 'resolved'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Résolus ({stats.resolved})
          </button>
          <button
            onClick={() => setSelectedStatus('closed')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              selectedStatus === 'closed'
                ? 'bg-slate-600 text-white font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Fermés ({stats.closed})
          </button>
        </div>

        {/* Bandeau des filtres actifs */}
        {(selectedJobTitle !== 'all' || selectedCategory !== 'all' || selectedPriority !== 'all' || selectedStatus !== 'all' || searchQuery) && (
          <div className="flex items-center gap-2 flex-wrap text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60">
            <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">
              Filtres actifs :
            </span>
            {selectedJobTitle !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold text-xs">
                <Briefcase className="w-3 h-3" />
                Poste : {selectedJobTitle === 'none' ? 'Sans poste' : selectedJobTitle}
                <button
                  type="button"
                  onClick={() => setSelectedJobTitle('all')}
                  className="hover:text-red-800 dark:hover:text-red-200 rounded-full p-0.5 ml-1 transition-colors cursor-pointer"
                  title="Supprimer ce filtre"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                Catégorie : {CATEGORY_LABELS[selectedCategory as any] || selectedCategory}
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="hover:text-slate-900 dark:hover:text-white rounded-full p-0.5 ml-1 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedPriority !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                Priorité : {PRIORITY_CONFIG[selectedPriority as any]?.label || selectedPriority}
                <button
                  type="button"
                  onClick={() => setSelectedPriority('all')}
                  className="hover:text-slate-900 dark:hover:text-white rounded-full p-0.5 ml-1 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                Recherche : « {searchQuery} »
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-slate-900 dark:hover:text-white rounded-full p-0.5 ml-1 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedJobTitle('all');
                setSelectedCategory('all');
                setSelectedPriority('all');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-red-600 underline ml-2 transition-colors cursor-pointer"
            >
              Réinitialiser tout ({filteredTickets.length}/{tickets.length})
            </button>
          </div>
        )}
      </div>

      {/* Liste des Tickets */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-red-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Chargement des tickets en cours...
            </p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Aucun ticket trouvé
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              {searchQuery || selectedStatus !== 'all' || selectedCategory !== 'all' || selectedPriority !== 'all'
                ? 'Aucun résultat ne correspond à vos critères de recherche ou filtres sélectionnés.'
                : 'Aucun ticket n’a encore été soumis depuis l’application mobile Fus-App.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredTickets.map((ticket) => {
              const statusStyle = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
              const priorityStyle = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
              const userName = ticket.profile?.full_name || ticket.user_name || 'Utilisateur Fus-App';
              const userAvatar = ticket.profile?.avatar_url || ticket.user_avatar;
              const userInitial = userName.charAt(0).toUpperCase() || 'U';

              const rawAttachments = ticket.attachments || [];
              const attachmentsCount = rawAttachments.length;

              const dateStr = new Date(ticket.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 cursor-pointer transition group"
                >
                  {/* Demandeur + Infos ticket */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    
                    {/* Photo de profil de l'utilisateur demandeur */}
                    <div className="relative flex-shrink-0">
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt={userName}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700 shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-red-600 to-red-400 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                          {userInitial}
                        </div>
                      )}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 ${statusStyle.dot}`} />
                    </div>

                    {/* Contenu principal */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition">
                          {userName}
                        </span>
                        {ticket.profile?.job_title && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-[10px] font-bold border border-red-200 dark:border-red-800">
                            <Briefcase className="w-2.5 h-2.5" />
                            {ticket.profile.job_title}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {ticket.user_email || ticket.profile?.phone_number || ''}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-400">
                          {dateStr}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                        {ticket.subject}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {ticket.description}
                      </p>

                      {/* Badges métadonnées */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300">
                          {CATEGORY_LABELS[ticket.category] || ticket.category}
                        </span>

                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${priorityStyle.bg} ${priorityStyle.color} ${priorityStyle.border}`}>
                          {priorityStyle.label}
                        </span>

                        {attachmentsCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-md">
                            <Paperclip className="w-3 h-3" />
                            <span>{attachmentsCount} pièce{attachmentsCount > 1 ? 's' : ''}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Statut & Action */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.color}`}>
                      {statusStyle.label}
                    </span>

                    <button
                      onClick={(e) => handleDeleteTicket(e, ticket.id)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition opacity-0 group-hover:opacity-100"
                      title="Supprimer ce ticket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:text-red-600 group-hover:bg-red-50 dark:group-hover:bg-red-950/30 transition">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de détail / traitement du ticket */}
      <TicketDetailModal
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onStatusChange={handleStatusChangeFromModal}
        onTicketUpdated={fetchTickets}
      />

    </div>
  );
};
export default TicketsPage;
