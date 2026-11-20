import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell, ChevronDown, Settings, Calendar, CheckCheck, Clock, ExternalLink, Flame,
  Search, LogOut, Shield, User, Radio, Swords, X, Eye, RotateCcw
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { usePermissions } from '../context/PermissionsContext';
import { useMatches } from '../hooks/useMatches';
import { useClubData } from '../hooks/useClubData';
import { MobileMenuButton } from './Sidebar';
import { toast } from 'sonner';
import defaultClubLogo from '../assets/fus-logo.png';
import { getRoleConfig, isScoutBranch, isCoachJob } from '../constants/roles';
import UserProfileModal from './UserProfileModal';
import CollaborativeCursorsWidget from './collaborative/CollaborativeCursorsWidget';
import { useLiveCursors } from '../context/LiveCursorsContext';
import { supabase } from '../lib/supabase';
import { normalizeAgeCategory } from '../constants';
import { recruitmentService } from '../features/recruitment_v2/services/recruitmentService';
import {
  dashboardNotificationService,
  DASHBOARD_NOTIFICATIONS_CHANNEL,
  doesNotificationMatchUser,
  isNotificationReadForUser,
  getTomorrowIsoDate,
  getLocalReadIds,
  isRemoteDashboardNotificationsUnavailable,
  type DashboardNotification,
} from '../services/dashboardNotificationService';

interface HeaderProps {
  title: string;
  onMobileMenuClick?: () => void;
  sidebarCollapsed?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, onMobileMenuClick, sidebarCollapsed = false }) => {
  const { authState, logout } = usePermissions();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const currentRole = authState.user?.system_role?.toLowerCase() || (authState.roles?.[0]?.toLowerCase() ?? '');
  const isScout = isScoutBranch(currentRole, authState.user?.job_title);
  const { selectedUserId, allOnlineUsers, setSelectedUserId } = useLiveCursors();
  const targetedUser = (authState.isRealSuperAdmin || currentRole === 'super_admin') && selectedUserId
    ? (allOnlineUsers.find(u => u.userId === selectedUserId) || null)
    : null;

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen]       = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mobileSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  // Fermer le dropdown si clic hors du composant
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const handleRestartApp = () => {
    setDropdownOpen(false);
    toast.info("Redémarrage de l'application en cours...");
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  // Données affichées
  const email       = authState.email ?? '';
  const displayName = authState.user?.full_name || email.split('@')[0] || 'Utilisateur';
  const roleConfig  = getRoleConfig(authState.user?.system_role);
  const roleLabel   = roleConfig.label;
  const roleBadge   = roleConfig.badgeClass;
  const defaultAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1d4ed8&color=fff&size=100`;
  const avatarUrl   = authState.user?.avatar_url || defaultAvatarUrl;

  const { matches } = useMatches();
  const { opponentClubs, mainClub } = useClubData();

  // Logo et nom configurés dans le Registre du Club
  const clubName = mainClub?.name || mainClub?.settings?.club_name || 'FUS Rabat';
  const rawLogo = mainClub?.logo_url || mainClub?.settings?.logo_url;
  const clubLogo = (rawLogo && rawLogo !== 'null' && rawLogo.trim() !== '') ? rawLogo : defaultClubLogo;

  const effectiveJobTitle = authState.isImpersonating && authState.impersonatedUser
    ? (authState.impersonatedUser.job_title ?? authState.user?.job_title)
    : authState.user?.job_title;
  const effectiveSystemRole = authState.isImpersonating && authState.impersonatedUser
    ? (authState.impersonatedUser.system_role ?? authState.user?.system_role)
    : authState.user?.system_role;
  const notifUserId = authState.isImpersonating && authState.impersonatedUser?.id
    ? authState.impersonatedUser.id
    : (authState.user?.id || null);
  const isCoachProfile = isCoachJob(effectiveJobTitle, effectiveSystemRole);
  const userCategoriesKey = (authState.userCategories || []).join(',');

  const unreadCount = notifications.filter(
    (n) => !isNotificationReadForUser(n, notifUserId)
  ).length;

  const handleNotificationClick = (notif: DashboardNotification) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notif.id
          ? {
              ...item,
              read_by: Array.from(new Set([...(item.read_by || []), notifUserId || 'anonymous'])),
            }
          : item
      )
    );
    void dashboardNotificationService.markAsRead(notif, notifUserId);
    setNotificationsOpen(false);
    navigate(notif.link_url || '/recruitment-v2?tab=sessions');
  };

  const handleMarkAllNotificationsRead = () => {
    const uid = notifUserId || 'anonymous';
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        read_by: Array.from(new Set([...(item.read_by || []), uid])),
      }))
    );
    void dashboardNotificationService.markAllAsRead(notifications, notifUserId);
  };

  useEffect(() => {
    let active = true;
    const ctx = {
      userId: notifUserId,
      jobTitle: effectiveJobTitle,
      systemRole: effectiveSystemRole,
      userCategories: authState.userCategories,
    };

    const handleIncomingNotification = (incoming: DashboardNotification | undefined) => {
      if (!incoming?.id || !doesNotificationMatchUser(incoming, ctx)) return;
      if (seenNotificationIdsRef.current.has(incoming.id)) return;
      seenNotificationIdsRef.current.add(incoming.id);
      setNotifications((prev) => (prev.some((n) => n.id === incoming.id) ? prev : [incoming, ...prev]));
      toast.info(incoming.title, {
        description: incoming.message,
        action: {
          label: 'Voir',
          onClick: () => navigate(incoming.link_url || '/recruitment-v2?tab=sessions'),
        },
      });
    };

    const loadAllNotifications = async () => {
      if (!authState.user) {
        if (active) setNotifications([]);
        return;
      }
      setIsLoadingNotifs(true);
      try {
        const persisted = await dashboardNotificationService.getNotifications(ctx);
        const list = [...persisted];

        if (isCoachProfile) {
          const tomorrowDate = getTomorrowIsoDate();
          try {
            const [tests, candidates] = await Promise.all([
              recruitmentService.getTests(),
              recruitmentService.getCandidates(),
            ]);
            const assignedCats = (authState.userCategories || []).map((c) => normalizeAgeCategory(c));
            const candMap = new Map(candidates.map((c) => [c.id, c]));

            const tomorrowTests = tests.filter((t) => {
              if (t.test_date !== tomorrowDate || t.status === 'cancelled') return false;
              if (assignedCats.length === 0) return true;
              const testCat = t.age_category ? normalizeAgeCategory(t.age_category) : '';
              if (testCat && assignedCats.includes(testCat)) return true;
              const ids = Array.from(new Set([...(t.candidate_ids || []), ...(t.candidate_id ? [t.candidate_id] : [])]));
              return ids.some((id) => {
                const cand = candMap.get(id);
                return cand?.age_category && assignedCats.includes(normalizeAgeCategory(cand.age_category));
              });
            });

            if (tomorrowTests.length > 0) {
              const catSet = new Set<string>();
              const playerNames = new Set<string>();
              tomorrowTests.forEach((t) => {
                if (t.age_category) catSet.add(t.age_category);
                const ids = Array.from(new Set([...(t.candidate_ids || []), ...(t.candidate_id ? [t.candidate_id] : [])]));
                ids.forEach((id) => {
                  const cand = candMap.get(id);
                  if (cand) {
                    const n = `${cand.first_name || ''} ${cand.last_name || ''}`.trim();
                    if (n) playerNames.add(n);
                    if (cand.age_category) catSet.add(cand.age_category);
                  }
                });
              });
              const previewNames = Array.from(playerNames).slice(0, 3).join(', ');
              const extra = playerNames.size > 3 ? ` (+${playerNames.size - 3})` : '';
              const virtualId = `tomorrow-tests-${tomorrowDate}`;
              const readIds = getLocalReadIds(notifUserId || 'anonymous');

              const virtualNotif: DashboardNotification = {
                id: virtualId,
                club_id: null,
                target_user_id: null,
                target_roles: ['coach'],
                target_categories: Array.from(catSet),
                type: 'test_tomorrow_reminder',
                title: `Rappel — Tests demain (${tomorrowDate})`,
                message: `${tomorrowTests.length} séance${tomorrowTests.length > 1 ? 's' : ''} prévue${tomorrowTests.length > 1 ? 's' : ''} demain${previewNames ? ` : ${previewNames}${extra}` : ''}.`,
                link_url: `/recruitment-v2?tab=sessions&date=${tomorrowDate}`,
                metadata: {
                  test_date: tomorrowDate,
                  categories: Array.from(catSet),
                  session_count: tomorrowTests.length,
                },
                read_by: readIds.includes(virtualId) ? [notifUserId || 'anonymous'] : [],
                created_by: null,
                created_at: new Date().toISOString(),
                isVirtual: true,
              };

              list.unshift(virtualNotif);

              const toastKey = `fus_tomorrow_test_toast_${notifUserId || 'anon'}_${tomorrowDate}`;
              if (!isNotificationReadForUser(virtualNotif, notifUserId) && localStorage.getItem(toastKey) !== '1') {
                localStorage.setItem(toastKey, '1');
                toast.info(virtualNotif.title, {
                  description: virtualNotif.message,
                  action: {
                    label: 'Voir le planning',
                    onClick: () => navigate(virtualNotif.link_url),
                  },
                });
              }
            }
          } catch {
            // Ignorer l'erreur réseau ponctuelle pour ne pas bloquer le Header
          }
        }

        if (active) {
          list.forEach((n) => seenNotificationIdsRef.current.add(n.id));
          setNotifications(list);
        }
      } finally {
        if (active) setIsLoadingNotifs(false);
      }
    };

    let channel = supabase
      .channel(DASHBOARD_NOTIFICATIONS_CHANNEL)
      .on('broadcast', { event: 'dashboard_notification' }, ({ payload }) => {
        handleIncomingNotification(payload as DashboardNotification | undefined);
      });

    const initRealtimeNotifications = async () => {
      await loadAllNotifications();
      if (!active) return;

      if (!isRemoteDashboardNotificationsUnavailable()) {
        channel = channel.on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'dashboard_notifications' },
          (payload) => {
            handleIncomingNotification(payload.new as DashboardNotification | undefined);
          }
        );
      }

      channel.subscribe();
    };

    void initRealtimeNotifications();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [authState.user, notifUserId, effectiveJobTitle, effectiveSystemRole, userCategoriesKey, isCoachProfile, navigate]);

  // Date courante formatée
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const todayStr = new Date().toLocaleDateString('en-CA');

  const todayMatch = matches.find(m =>
    m.match_date === todayStr &&
    (m.status === 'scheduled' || m.status === 'live')
  );
  const opponent = todayMatch ? opponentClubs.find(c => c.id === todayMatch.opponent_id) : null;

  return (
    <header className={cn(
      "fixed top-0 right-0 h-20 left-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b flex items-center px-3 sm:px-6 lg:px-8 z-40 transition-all duration-300",
      // md+ : sidebar icône (80px)
      "md:left-20",
      // lg+ : sidebar pleine largeur (288px) ou collapsed (80px)
      sidebarCollapsed ? "lg:left-20" : "lg:left-72"
    )}>
      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="absolute inset-0 bg-white dark:bg-slate-900 z-50 flex items-center px-3 gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (globalSearchQuery.trim()) {
                setMobileSearchOpen(false);
                navigate(`/players?search=${encodeURIComponent(globalSearchQuery.trim())}`);
              }
            }}
            className="flex-1 flex items-center bg-secondary rounded-2xl px-3 py-1.5"
          >
            <Search className="w-4 h-4 text-primary shrink-0 mr-2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Rechercher joueur, club..."
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-semibold text-foreground placeholder:text-muted-foreground"
            />
          </form>
          <button
            onClick={() => setMobileSearchOpen(false)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0"
            aria-label="Fermer la recherche"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Menu burger — uniquement sous md (mobile), la sidebar est visible sur tablette */}
      {onMobileMenuClick && (
        <div className="md:hidden mr-1 sm:mr-2 shrink-0">
          <MobileMenuButton onClick={onMobileMenuClick} />
        </div>
      )}

      {/* Logo officiel du Registre du Club */}
      <Link
        to="/settings"
        title={`Registre du Club : ${clubName} (Cliquez pour configurer)`}
        className="flex items-center gap-2 sm:gap-3 mr-2 sm:mr-4 group shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-2xl p-1 -ml-1 transition-all"
      >
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm p-1.5 flex items-center justify-center overflow-hidden group-hover:border-primary/50 group-hover:shadow-md transition-all">
          <img
            src={clubLogo}
            alt={clubName}
            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = defaultClubLogo;
            }}
          />
        </div>
        <div className="hidden xl:flex flex-col text-left">
          <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/80 leading-tight">Registre</span>
          <span className="text-xs font-black text-foreground truncate max-w-[130px] leading-tight group-hover:text-primary transition-colors">
            {clubName}
          </span>
        </div>
        <div className="h-7 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block mx-1" />
      </Link>

      {/* Titre + date / match du jour */}
      <div className="flex-1 flex flex-col min-w-0 ml-0.5 sm:ml-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h1 className="text-base sm:text-xl md:text-2xl font-extrabold text-foreground tracking-tight truncate leading-tight">{title}</h1>
          {targetedUser && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-800 text-[11px] font-bold shadow-xs">
              <Eye className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
              <span className="truncate max-w-[210px]">
                Vue Miroir : <strong>{targetedUser.name}</strong> ({targetedUser.role})
              </span>
              <button
                type="button"
                onClick={() => setSelectedUserId(null)}
                className="ml-1 text-amber-700 hover:text-amber-950 font-black text-[9.5px] uppercase underline cursor-pointer shrink-0"
                title="Rétablir la vue complète Super Admin"
              >
                Rétablir
              </button>
            </div>
          )}
        </div>
        {todayMatch && opponent ? (
          <button
            onClick={() => navigate('/matchday')}
            className="flex items-center gap-1.5 sm:gap-2 group hover:opacity-80 transition-opacity overflow-hidden mt-0.5 text-left"
          >
            {todayMatch.status === 'live' ? (
              <span className="flex items-center gap-1 bg-red-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full animate-pulse shrink-0">
                <Radio className="w-2.5 h-2.5" /> LIVE
              </span>
            ) : (
              <Swords className="w-3.5 h-3.5 text-primary shrink-0" />
            )}
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-foreground truncate">
              {todayMatch.status === 'live' ? 'En cours' : 'Match ce soir'}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground truncate hidden sm:inline">vs {opponent.name}</span>
            {todayMatch.match_time && (
              <span className="text-[9px] sm:text-[11px] font-bold text-primary bg-primary/10 px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">{todayMatch.match_time}</span>
            )}
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary/60 underline underline-offset-2 group-hover:text-primary transition-colors shrink-0 hidden md:inline">
              → Live
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] sm:text-xs font-semibold uppercase tracking-wider mt-0.5">
            <Calendar className="w-3.5 h-3.5 shrink-0 text-muted-foreground/80 hidden xs:inline" />
            <span className="capitalize truncate">{today}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3.5 shrink-0">
        {/* Mobile Search Button (visible only on <sm) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileSearchOpen(true)}
          className="sm:hidden relative group rounded-2xl h-9 w-9 text-muted-foreground hover:text-primary"
          title="Rechercher"
          aria-label="Ouvrir la recherche"
        >
          <Search className="w-4.5 h-4.5" />
        </Button>

        {/* Recherche Desktop/Tablette - avec validation et navigation au submit */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (globalSearchQuery.trim()) {
              navigate(`/players?search=${encodeURIComponent(globalSearchQuery.trim())}`);
            }
          }}
          className={cn(
            "relative hidden sm:flex items-center rounded-2xl bg-secondary transition-all duration-300 overflow-hidden",
            isSearchFocused ? "w-48 md:w-64 lg:w-80 ring-2 ring-primary/20 bg-white" : "w-32 md:w-48 lg:w-64"
          )}
        >
          <Search className={cn(
            "absolute left-3.5 w-4 h-4 transition-colors",
            isSearchFocused ? "text-primary" : "text-muted-foreground"
          )} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 bg-transparent outline-none text-xs sm:text-sm font-medium"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </form>

        {/* Suivi Collaboratif des Curseurs (X, Y) */}
        <CollaborativeCursorsWidget />

        {/* Notifications */}
        <div className="relative flex items-center" ref={notificationsRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative group rounded-2xl h-9 w-9 sm:h-10 sm:w-10"
            title={unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : 'Notifications'}
            onClick={() => setNotificationsOpen((prev) => !prev)}
          >
            <Bell className="w-4.5 h-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {notificationsOpen && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b bg-slate-50/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllNotificationsRead}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Tout lire
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                {isLoadingNotifs && notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Chargement des alertes...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center space-y-1.5">
                    <Bell className="w-7 h-7 mx-auto text-slate-300" />
                    <p className="text-xs font-semibold text-slate-500">
                      Aucune notification de planning pour le moment.
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isRead = isNotificationReadForUser(notif, notifUserId);
                    const isTomorrow = notif.type === 'test_tomorrow_reminder';
                    const isRecruitNow = notif.type === 'recruit_now_validated';
                    return (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => handleNotificationClick(notif)}
                        className={cn(
                          'w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer',
                          !isRead ? 'bg-primary/5' : 'bg-white'
                        )}
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                            isTomorrow
                              ? 'bg-amber-100 text-amber-700'
                              : isRecruitNow || notif.type === 'test_slot_validated'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          )}
                        >
                          {isTomorrow ? <Clock className="w-4 h-4" /> : isRecruitNow ? <Flame className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-extrabold text-slate-900 leading-snug">
                              {notif.title}
                            </p>
                            {!isRead && (
                              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {notif.message}
                          </p>
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <div className="flex flex-wrap gap-1">
                              {(notif.target_categories || []).slice(0, 3).map((cat) => (
                                <span
                                  key={cat}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold"
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary shrink-0">
                              {isRecruitNow ? 'Dossier' : 'Planning'} <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 sm:h-8 w-px bg-border mx-0.5" />

        {/* Profil utilisateur + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="flex items-center gap-2 sm:gap-3 group cursor-pointer rounded-2xl hover:bg-secondary px-1 sm:px-2 py-1 transition-colors"
          >
            {/* Nom + rôle (masqué sur mobile) */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs sm:text-sm font-bold text-foreground leading-none mb-1 truncate max-w-[140px]">
                {displayName}
              </span>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border",
                roleBadge,
              )}>
                {roleLabel}
              </span>
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
              <img
                src={avatarUrl}
                className="w-full h-full object-cover"
                alt={displayName}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = defaultAvatarUrl;
                }}
              />
            </div>

            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform hidden sm:block",
              dropdownOpen && "rotate-180"
            )} />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-border/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* En-tête dropdown */}
              <div className="px-4 py-3 bg-secondary/50 border-b">
                <p className="text-sm font-semibold text-foreground truncate">{email}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Shield className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    {roleLabel}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2">
                {!isScout && (
                  <Link
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Paramètres du club
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-secondary transition-colors font-medium text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-purple-600" />
                  Mon profil
                </button>

                <button
                  type="button"
                  onClick={handleRestartApp}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors font-medium text-left cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Redémarrer l'application
                </button>
              </div>

              <div className="border-t p-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors font-medium cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
