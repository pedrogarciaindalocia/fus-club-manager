import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell, ChevronDown, Settings, Calendar,
  Search, LogOut, Shield, User, Radio, Swords, X
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { usePermissions } from '../context/PermissionsContext';
import { useMatches } from '../hooks/useMatches';
import { useClubData } from '../hooks/useClubData';
import { MobileMenuButton } from './Sidebar';
import { toast } from 'sonner';
import defaultClubLogo from '../assets/fus-logo.png';
import { getRoleConfig, isScoutBranch } from '../constants/roles';
import UserProfileModal from './UserProfileModal';

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
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
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
        <h1 className="text-base sm:text-xl md:text-2xl font-extrabold text-foreground tracking-tight truncate leading-tight">{title}</h1>
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

        {/* Notifications */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="relative group rounded-2xl h-9 w-9 sm:h-10 sm:w-10"
            title="Notifications (aucune alerte non lue)"
            onClick={() => {
              toast.info('Aucune nouvelle notification pour le moment.');
            }}
          >
            <Bell className="w-4.5 h-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
          </Button>
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
