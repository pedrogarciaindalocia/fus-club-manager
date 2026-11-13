import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { cn } from './lib/utils';
import './index.css';

import { queryClient } from './lib/queryClient';
import { ClubProvider } from './context/ClubContext';
import { PermissionsProvider, usePermissions } from './context/PermissionsContext';
import { SessionSecurityProvider } from './context/SessionSecurityContext';
import { MatchReminderProvider } from './context/MatchReminderContext';
import { syncQueue } from './services/offlineQueue';
import { isScoutBranch } from './constants/roles';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';

// Pages publiques (auth)
import LoginPage from './features/auth/LoginPage';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage';
import ResetPasswordPage from './features/auth/ResetPasswordPage';
import ForcePasswordChange from './features/auth/ForcePasswordChange';

// Pages protégées
import DashboardPage from './features/dashboard/DashboardPage';
import MatchManagementPage from './features/match-management/MatchManagementPage';
import ScheduleMatchPage from './features/match-management/ScheduleMatchPage';
import MatchDayPage from './features/match-management/MatchDayPage';
import PlayerManagement from './features/people-management/PlayerManagement';
import StaffManagement from './features/people-management/StaffManagement';
import LeagueManagement from './features/league-management/LeagueManagement';
import ClubSettings from './features/club-management/ClubSettings';
import OpponentClubs from './features/club-management/OpponentClubs';
import TeamManagement from './features/squad-management/TeamManagement';
import ClubRosterPage from './features/squad-management/ClubRosterPage';
import StadiumManagement from './features/club-management/StadiumManagement';
import BlogManagement from './features/blog-management/BlogManagement';
import StoreManagement from './features/store-management/StoreManagement';
import ProfilePage from './features/profile/ProfilePage';
import UserManagement from './features/user-management/UserManagement';
import ArbitresPage from './features/people-management/ArbitresPage';
import AuditLogsPage from './features/audit-logs/AuditLogsPage';
import RecruitmentPage from './features/recruitment/RecruitmentPage';
import RecruitmentV2Page from './features/recruitment_v2/RecruitmentV2Page';
import AddPlayerPage from './features/recruitment_v2/AddPlayerPage';
import AddReportPage from './features/recruitment_v2/AddReportPage';
import TrainingsPage from './features/trainings/TrainingsPage';
import OfficialShortlistPage from './features/match-management/OfficialShortlistPage';
import ChampionshipPerformancesPage from './features/match-management/ChampionshipPerformancesPage';
import ClassementResultatsPage from './features/match-management/ClassementResultatsPage';
import PluginsPage from './features/plugins/PluginsPage';
import PluginDisabledView from './features/plugins/PluginDisabledView';
import { PluginsProvider, usePlugins } from './context/PluginsContext';
import DevRoleSwitcher from './components/dev/DevRoleSwitcher';
import { MediaManagementPage } from './features/media-management/MediaManagementPage';
import TicketsPage from './features/ticket-management/TicketsPage';
import { LiveCursorsProvider } from './context/LiveCursorsContext';
import LiveCursorsOverlay from './components/collaborative/LiveCursorsOverlay';
import LiveTargetHUD from './components/collaborative/LiveTargetHUD';

const pageTitles: Record<string, string> = {
  '/': 'Tableau de Bord',
  '/dashboard': 'Tableau de Bord',
  '/tickets': 'Support & Tickets Fus-App',
  '/media': 'Espace de Gestion Média',
  '/matches': 'Calendrier des Matchs',
  '/classement-resultats': 'Classement & Résultats FRMF',
  '/classements-resultats': 'Classement & Résultats FRMF',
  '/championship-performances': 'Championnat & Performances',
  '/championnat-performances': 'Championnat & Performances',
  '/matches/new': 'Planifier un Match (Stepper)',
  '/matchday': 'Match Day',
  '/official-shortlist': 'Shortlist Officielle — Placement Tactique',
  '/club': 'Mon Club — Effectif FUS',
  '/players': 'Joueurs — Effectif FUS',
  '/teams': 'Unités d\'Équipe',
  '/staff': 'Staff Technique',
  '/arbitres': 'Rubrique Arbitres',
  '/trainings': 'Gestion des Entraînements',
  '/trainings/*': 'Gestion des Entraînements',
  '/recruitment': 'Recrutement & Détection v1',
  '/recruitment/*': 'Recrutement & Détection v1',
  '/plugins': 'Gestion des Plugins & Extensions',
  '/leagues': 'Gestion des Compétitions',
  '/opponents': 'Clubs Adversaires',
  '/stadiums': 'Gestion des Stades',
  '/settings': 'Paramètres du Club',
  '/blog': 'Gestion du Blog',
  '/store': 'Gestion du Store',
  '/users': 'Gestion des Utilisateurs',
  '/logs': 'Administration — Logs & Audit',
};

// -------------------------------------------------------
// Layout principal (authentifié)
// -------------------------------------------------------

const AppContent: React.FC = () => {
  const location = useLocation();
  const currentTitle =
    location.pathname.startsWith('/matches/edit') || location.pathname.includes('/prepare')
      ? 'Modifier le Match (Stepper)'
      : (pageTitles[location.pathname] || 'Tableau de Bord');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isPluginActive } = usePlugins();
  const { authState, hasModuleAccess, hasSubModuleAccess } = usePermissions();

  const currentRole = authState.user?.system_role?.toLowerCase() || (authState.roles?.[0]?.toLowerCase() ?? '');
  const isSuperAdmin = !authState.isImpersonating && (currentRole === 'super_admin');
  const isScout = isScoutBranch(currentRole, authState.user?.job_title);
  const canAccessRecruitmentV2 = isSuperAdmin || hasModuleAccess('recruitment_v2', 'read');

  // 1. Redirection de la racine et dashboard vers Détection & Recrutements uniquement si habilité sur au moins une sous-rubrique V2
  if (isScout && canAccessRecruitmentV2 && (location.pathname === '/' || location.pathname === '/dashboard')) {
    return <Navigate to="/recruitment-v2" replace />;
  }

  // Cloisonnement des routes pour le rôle Scout (uniquement les rubriques explicitement cochées)
  const isAllowedScoutPath =
    location.pathname === '/tickets' ||
    (location.pathname.startsWith('/recruitment-v2') && canAccessRecruitmentV2) ||
    location.pathname === '/profile' ||
    (location.pathname === '/media' && hasSubModuleAccess('media', 'read')) ||
    ((location.pathname === '/players' || location.pathname === '/club') && hasSubModuleAccess('players', 'read')) ||
    (location.pathname === '/teams' && hasSubModuleAccess('teams', 'read')) ||
    ((location.pathname === '/matches' || location.pathname.startsWith('/matches/') || location.pathname === '/matchday' || location.pathname === '/classement-resultats') && hasSubModuleAccess('matches', 'read')) ||
    (location.pathname === '/championship-performances' && hasSubModuleAccess('championship_performances', 'read')) ||
    (location.pathname.startsWith('/trainings') && hasModuleAccess('trainings', 'read')) ||
    (location.pathname === '/official-shortlist' && hasSubModuleAccess('official_shortlist', 'read')) ||
    (location.pathname === '/arbitres' && hasSubModuleAccess('arbitres', 'read')) ||
    (location.pathname === '/opponents' && hasSubModuleAccess('opponents', 'read')) ||
    (location.pathname === '/stadiums' && hasSubModuleAccess('stadiums', 'read')) ||
    (location.pathname === '/leagues' && hasSubModuleAccess('leagues', 'read')) ||
    (!canAccessRecruitmentV2 && (location.pathname === '/' || location.pathname === '/dashboard'));

  if (isScout && !isAllowedScoutPath) {
    return <Navigate to={canAccessRecruitmentV2 ? '/recruitment-v2' : '/'} replace />;
  }

  // 2. Protection stricte des routes Système & Contenu : RÉSERVÉES AU SUPER ADMIN
  const isSystemPath =
    location.pathname.startsWith('/plugins') ||
    location.pathname.startsWith('/users') ||
    location.pathname.startsWith('/logs') ||
    location.pathname.startsWith('/blog') ||
    location.pathname.startsWith('/store') ||
    location.pathname.startsWith('/settings');

  if (isSystemPath && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  // 3. Protection granulaire des sous-rubriques métier (Read guard)
  if (!isSuperAdmin) {
    // Compétition & Matchs
    if ((location.pathname === '/matches' || location.pathname.startsWith('/matches/') || location.pathname === '/matchday' || location.pathname === '/classement-resultats' || location.pathname === '/classements-resultats') && !hasSubModuleAccess('matches', 'read')) {
      return <Navigate to="/" replace />;
    }
    if (location.pathname === '/championship-performances' && !hasSubModuleAccess('championship_performances', 'read')) {
      return <Navigate to="/" replace />;
    }
    if (location.pathname === '/official-shortlist' && !hasSubModuleAccess('official_shortlist', 'read')) {
      return <Navigate to="/" replace />;
    }
    if (location.pathname === '/arbitres' && !hasSubModuleAccess('arbitres', 'read')) {
      return <Navigate to="/" replace />;
    }
    if (location.pathname === '/leagues' && !hasSubModuleAccess('leagues', 'read')) {
      return <Navigate to="/" replace />;
    }
    if (location.pathname === '/stadiums' && !hasSubModuleAccess('stadiums', 'read')) {
      return <Navigate to="/" replace />;
    }

    // Entraînements
    if (location.pathname.startsWith('/trainings') && !hasModuleAccess('trainings', 'read')) {
      return <Navigate to="/" replace />;
    }

    // Effectif Sportif
    if ((location.pathname === '/players' || location.pathname === '/club') && !hasSubModuleAccess('players', 'read')) {
      return <Navigate to="/" replace />;
    }
    if (location.pathname === '/teams' && !hasSubModuleAccess('teams', 'read')) {
      return <Navigate to="/" replace />;
    }
    if (location.pathname === '/opponents' && !hasSubModuleAccess('opponents', 'read')) {
      return <Navigate to="/" replace />;
    }
    if (location.pathname === '/staff' && !hasSubModuleAccess('staff', 'read')) {
      return <Navigate to="/" replace />;
    }

    // Détection & Recrutement V2
    if ((location.pathname.startsWith('/recruitment') || location.pathname.startsWith('/recruitment-v2')) && !hasModuleAccess('recruitment_v2', 'read')) {
      return <Navigate to="/" replace />;
    }
    if (location.pathname === '/recruitment-v2/add-player' && !(hasSubModuleAccess('candidates', 'create') || hasSubModuleAccess('candidates', 'edit_player') || hasSubModuleAccess('candidates', 'update'))) {
      return <Navigate to="/recruitment-v2" replace />;
    }
    if (location.pathname === '/recruitment-v2/add-report' && !(hasSubModuleAccess('candidates', 'manage_reports') || hasSubModuleAccess('candidates', 'reports'))) {
      return <Navigate to="/recruitment-v2" replace />;
    }

    // Médiathèque (Espace Média)
    if (location.pathname === '/media' && !hasSubModuleAccess('media', 'read')) {
      return <Navigate to="/" replace />;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <LiveCursorsOverlay />
      <LiveTargetHUD />
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <Header
        title={isScout ? 'Cellule Détection & Scouting' : currentTitle}
        onMobileMenuClick={() => setMobileSidebarOpen(true)}
        sidebarCollapsed={sidebarCollapsed}
      />

      <main className={cn("pt-20 transition-all duration-300 md:pl-20 w-full min-w-0 overflow-x-hidden", sidebarCollapsed ? "lg:pl-20" : "lg:pl-72")}>
        <div className="p-3 sm:p-5 md:p-8 xl:p-10 max-w-[1750px] mx-auto w-full min-w-0">
          <Routes location={location}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/matches" element={<MatchManagementPage />} />
            <Route path="/matches/new" element={
              <ProtectedRoute requiredPermission="plan_match">
                <ScheduleMatchPage />
              </ProtectedRoute>
            } />
            <Route path="/matches/edit/:id" element={
              <ProtectedRoute requiredPermission="manage_match_played">
                <ScheduleMatchPage />
              </ProtectedRoute>
            } />
            <Route path="/matches/:id/prepare" element={
              <ProtectedRoute requiredPermission="manage_match_played">
                <ScheduleMatchPage />
              </ProtectedRoute>
            } />
            <Route path="/matchday" element={
              <ProtectedRoute requiredPermission="live_tracking">
                <MatchDayPage />
              </ProtectedRoute>
            } />
            <Route path="/players" element={<PlayerManagement />} />
            <Route path="/club" element={<Navigate to="/players" replace />} />
            <Route path="/teams" element={
              <ProtectedRoute requiredPermission="manage_teams">
                <TeamManagement />
              </ProtectedRoute>
            } />
            <Route path="/staff" element={
              <ProtectedRoute requiredPermission="manage_roles">
                <StaffManagement />
              </ProtectedRoute>
            } />
            <Route path="/arbitres" element={<ArbitresPage />} />
            <Route path="/official-shortlist" element={<OfficialShortlistPage />} />
            <Route path="/championship-performances" element={<ChampionshipPerformancesPage />} />
            <Route path="/championnat-performances" element={<Navigate to="/championship-performances" replace />} />
            <Route path="/classement-resultats" element={<ClassementResultatsPage />} />
            <Route path="/classements-resultats" element={<Navigate to="/classement-resultats" replace />} />
            <Route path="/trainings" element={<TrainingsPage />} />
            <Route path="/trainings/*" element={<TrainingsPage />} />
            <Route path="/recruitment" element={
              isPluginActive('recruitment_v1')
                ? <RecruitmentPage />
                : <PluginDisabledView pluginId="recruitment_v1" pluginName="Recrutement & Détection v1" />
            } />
            <Route path="/recruitment/*" element={
              isPluginActive('recruitment_v1')
                ? <RecruitmentPage />
                : <PluginDisabledView pluginId="recruitment_v1" pluginName="Recrutement & Détection v1" />
            } />
            <Route path="/recruitment-v2" element={
              isPluginActive('recruitment_v2')
                ? <RecruitmentV2Page />
                : <PluginDisabledView pluginId="recruitment_v2" pluginName="Recrutement & Détection V2" />
            } />
            <Route path="/recruitment-v2/add-player" element={
              isPluginActive('recruitment_v2')
                ? <AddPlayerPage />
                : <PluginDisabledView pluginId="recruitment_v2" pluginName="Recrutement & Détection V2" />
            } />
            <Route path="/recruitment-v2/add-report" element={
              isPluginActive('recruitment_v2')
                ? <AddReportPage />
                : <PluginDisabledView pluginId="recruitment_v2" pluginName="Recrutement & Détection V2" />
            } />
            <Route path="/recruitment-v2/*" element={
              isPluginActive('recruitment_v2')
                ? <RecruitmentV2Page />
                : <PluginDisabledView pluginId="recruitment_v2" pluginName="Recrutement & Détection V2" />
            } />
            <Route path="/plugins" element={<PluginsPage />} />
            <Route path="/leagues" element={<LeagueManagement />} />
            <Route path="/opponents" element={<OpponentClubs />} />
            <Route path="/stadiums" element={<StadiumManagement />} />
            <Route path="/settings" element={
              <ProtectedRoute requiredPermission="manage_roles">
                <ClubSettings />
              </ProtectedRoute>
            } />
            <Route path="/blog" element={<BlogManagement />} />
            <Route path="/store" element={<StoreManagement />} />
            <Route path="/users" element={
              <ProtectedRoute requiredPermission="manage_users">
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/logs" element={<AuditLogsPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/media" element={<MediaManagementPage />} />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      <Toaster position="top-right" richColors closeButton />
      <DevRoleSwitcher />
    </div>
  );
};

// -------------------------------------------------------
// Root
// -------------------------------------------------------

function App() {
  useEffect(() => {
    const handleOnline = async () => {
      const { synced, failed } = await syncQueue();
      if (synced > 0) {
        toast.success(`${synced} opération(s) synchronisée(s) après reconnexion`);
      }
      if (failed > 0) {
        toast.error(`${failed} opération(s) ont échoué lors de la synchronisation`);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider>
        <BrowserRouter>
          <Routes>
            {/* Routes publiques — accessibles sans session */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/force-password-change" element={<ForcePasswordChange />} />

            {/* Toutes les autres routes sont protégées */}
            <Route path="/*" element={
              <ProtectedRoute>
                <ClubProvider>
                  <SessionSecurityProvider>
                    <MatchReminderProvider>
                      <PluginsProvider>
                        <LiveCursorsProvider>
                          <AppContent />
                        </LiveCursorsProvider>
                      </PluginsProvider>
                    </MatchReminderProvider>
                  </SessionSecurityProvider>
                </ClubProvider>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </PermissionsProvider>
    </QueryClientProvider>
  );
}

export default App;
