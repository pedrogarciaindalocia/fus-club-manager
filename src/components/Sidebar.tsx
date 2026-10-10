import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Trophy, Users, UserCog, Shield, UserCheck,
  FileText, Settings, LogOut, Activity,
  Swords, Building2, Target, Calendar, LayoutTemplate,
  X, ChevronLeft, ChevronDown, Sparkles, UserPlus, Compass,
  Dumbbell, Award, Zap, Menu, Blocks, Archive, User, ClipboardCheck,
  Image as ImageIcon, LifeBuoy
} from 'lucide-react';
import { cn } from '../lib/utils';
import { usePermissions } from '../context/PermissionsContext';
import { useClubData } from '../hooks/useClubData';
import { usePlugins } from '../context/PluginsContext';
import defaultClubLogo from '../assets/fus-logo.png';
import { AuditLogger } from '../services/auditLogger';
import UserProfileModal from './UserProfileModal';
import { ticketService } from '../features/ticket-management/ticketService';

import { isScoutBranch } from '../constants/roles';

interface SubNavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  count?: number;
  hide?: boolean;
  subId?: string;
  children?: SubNavItem[];
}

interface NavCategory {
  id: string;
  title: string;
  badge?: string;
  icon: React.ElementType;
  items: SubNavItem[];
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  onMobileClose,
  collapsed = false,
  onToggleCollapse,
}) => {
  const { logout, can, authState, hasModuleAccess, hasSubModuleAccess } = usePermissions();
  const { mainClub } = useClubData();
  const { isPluginActive } = usePlugins();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [openTicketsCount, setOpenTicketsCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchCount = async () => {
      try {
        const all = await ticketService.getAllTickets();
        if (isMounted) {
          const count = all.filter(t => t.status === 'open').length;
          setOpenTicketsCount(count);
        }
      } catch (e) {
        // Ignorer silencieusement si la table n'est pas encore migrée
      }
    };
    fetchCount();
    const unsub = ticketService.subscribeToChanges(() => {
      fetchCount();
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const currentRole = authState.user?.system_role?.toLowerCase() || (authState.roles?.[0]?.toLowerCase() ?? '');
  const isSuperAdmin = currentRole === 'super_admin';
  const isScout = isScoutBranch(currentRole, authState.user?.job_title);
  const isScoutAdmin = currentRole === 'scout_admin' || isSuperAdmin || currentRole === 'admin';

  const clubName = mainClub?.name || mainClub?.settings?.club_name || 'FUS Rabat';
  const rawLogo = mainClub?.logo_url || mainClub?.settings?.logo_url;
  const clubLogo = (rawLogo && rawLogo !== 'null' && rawLogo.trim() !== '') ? rawLogo : defaultClubLogo;

  // Groupes de navigation hiérarchiques avec identifiants de sous-rubriques (subId)
  // Règle Métier : Système & Contenu est STRICTEMENT RÉSERVÉ au Super Admin
  // Chaque sous-rubrique ne s'affiche que si l'utilisateur possède l'accès 'read' (ou est Super Admin)
  const rawNavCategories: NavCategory[] = [
    {
      id: 'competition',
      title: 'Compétition & Matchs',
      icon: Trophy,
      items: [
        { path: '/matches',            label: 'Calendrier',            icon: Calendar, subId: 'matches' },
        { path: '/official-shortlist', label: 'Shortlist Officielle',  icon: Trophy, subId: 'official_shortlist' },
        { path: '/arbitres',           label: 'Arbitres',              icon: UserCheck, subId: 'arbitres' },
        { path: '/leagues',            label: 'Compétitions',          icon: Trophy, subId: 'leagues' },
        { path: '/stadiums',           label: 'Stades',                icon: Building2, subId: 'stadiums' },
      ],
    },
    {
      id: 'trainings',
      title: 'Entraînements',
      icon: Dumbbell,
      items: [
        { path: '/trainings?tab=calendar',    label: 'Calendrier',             icon: Calendar, subId: 'trainings_calendar' },
        { path: '/trainings?tab=sessions',    label: 'Séances',                icon: FileText, subId: 'trainings_sessions' },
        { path: '/trainings?tab=exercises',   label: 'Exercices',              icon: Dumbbell, subId: 'trainings_exercises' },
        { path: '/trainings?tab=evaluations', label: 'Évaluations',            icon: Award, subId: 'trainings_evaluations' },
        { path: '/trainings?tab=load',        label: 'Charge d\'entraînement', icon: Zap, subId: 'trainings_load' },
      ],
    },
    {
      id: 'effectif',
      title: 'Effectif & Sportif',
      icon: Users,
      items: [
        {
          path: '/players',
          label: 'Mon Club',
          icon: Shield,
          children: [
            { path: '/players', label: 'Joueurs', icon: Users, subId: 'players' },
            { path: '/teams',   label: 'Équipes', icon: Shield, subId: 'teams' },
          ],
        },
        { path: '/opponents', label: 'Adversaires',     icon: Target, subId: 'opponents' },
        { path: '/staff',     label: 'Staff Technique', icon: UserCog, subId: 'staff' },
      ],
    },
    ...(isPluginActive('recruitment_v1') ? [
      {
        id: 'recruitment',
        title: 'Recrutement & Détection v1',
        badge: 'v1.0',
        icon: Compass,
        items: [
          { path: '/recruitment?tab=scouts',       label: 'Cellule Scouts',          icon: UserCheck, subId: 'scouts' },
          { path: '/recruitment?tab=kanban',       label: 'Pipeline Kanban',         icon: LayoutTemplate, subId: 'missions' },
          { path: '/recruitment?tab=candidates',   label: 'Fiches & Tuteurs',        icon: UserPlus, subId: 'candidates' },
          { path: '/recruitment?tab=shortlist',    label: 'Shortlist & Onze Idéal',  icon: Trophy, subId: 'shortlist' },
          { path: '/recruitment?tab=observations', label: 'Observations Matchs',     icon: FileText, subId: 'missions' },
          { path: '/recruitment?tab=sessions',     label: 'Planning des Tests',      icon: Calendar, subId: 'sessions' },
          { path: '/recruitment?tab=evaluations',  label: 'Évaluations (1–10)',      icon: Sparkles, subId: 'compare' },
          { path: '/recruitment?tab=compare',      label: 'Comparateur Radar',       icon: Swords, subId: 'compare' },
        ],
      }
    ] : []),
    ...(isPluginActive('recruitment_v2') ? [
      {
        id: 'recruitment_v2',
        title: 'Recrutement & Détection V2',
        badge: 'v2.0',
        icon: Compass,
        items: [
          { path: '/recruitment-v2?tab=scouts',       label: 'Personnel',               icon: UserCheck, subId: 'scouts' },
          { path: '/recruitment-v2?tab=candidates',   label: 'Database',                icon: UserPlus, subId: 'candidates' },
          { path: '/recruitment-v2?tab=missions',     label: 'Missions',                icon: ClipboardCheck, subId: 'missions' },
          { path: '/recruitment-v2?tab=shortlist',    label: 'Shadow list',             icon: Trophy, subId: 'shortlist' },
          { path: '/recruitment-v2?tab=sessions',     label: 'Planning des Tests',      icon: Calendar, subId: 'sessions' },
          { path: '/recruitment-v2?tab=compare',      label: 'Comparateur Radar',       icon: Swords, subId: 'compare' },
          { path: '/recruitment-v2?tab=archives',     label: 'Archives',                icon: Archive, subId: 'archives' },
        ],
      }
    ] : []),
    {
      id: 'media',
      title: 'Médiathèque',
      icon: ImageIcon,
      items: [
        { path: '/media', label: 'Espace Média', icon: ImageIcon, subId: 'media' },
      ],
    },
    ...(isSuperAdmin ? [
      {
        id: 'system',
        title: 'Système & Contenu',
        icon: LayoutTemplate,
        items: [
          { path: '/plugins',  label: 'Plugins',       icon: Blocks },
          { path: '/blog',     label: 'Blog',          icon: FileText },
          { path: '/store',    label: 'Store',         icon: LayoutTemplate },
          { path: '/users',    label: 'Utilisateurs',  icon: Shield },
          { path: '/logs',     label: 'Logs & Audit',  icon: Activity },
          { 
            path: '/tickets', 
            label: 'Tickets Fus-App', 
            icon: LifeBuoy, 
            count: openTicketsCount > 0 ? openTicketsCount : undefined 
          },
        ],
      }
    ] : []),
  ];

  // Filtrage dynamique hiérarchique :
  // 1. Filtrer chaque sous-rubrique (items) selon hasSubModuleAccess(item.subId, 'read', cat.id)
  // 2. Masquer complètement la grande rubrique si aucun de ses sous-éléments n'est autorisé
  const navCategories = rawNavCategories
    .filter(cat => {
      if (isSuperAdmin) return true;
      if (cat.id === 'system') return false; // Strictement réservé au Super Admin
      return true;
    })
    .map(cat => {
      if (isSuperAdmin || cat.id === 'system') return cat;

      const filteredItems = cat.items
        .map(item => {
          // Gestion des items avec sous-enfants (ex: Mon Club -> Joueurs, Équipes)
          if (item.children && item.children.length > 0) {
            const filteredChildren = item.children.filter(child => {
              const childSubId = child.subId || (child.path === '/players' ? 'players' : 'teams');
              return hasSubModuleAccess(childSubId, 'read', cat.id);
            });
            if (filteredChildren.length === 0) return null;
            return {
              ...item,
              path: filteredChildren[0].path,
              children: filteredChildren
            };
          }

          if (!item.subId) return item;
          const isAllowed = hasSubModuleAccess(item.subId, 'read', cat.id);
          return isAllowed ? item : null;
        })
        .filter(Boolean) as SubNavItem[];

      return {
        ...cat,
        items: filteredItems
      };
    })
    .filter(cat => cat.items.length > 0);

  // État des catégories ouvertes (accordéon)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      competition: true,
      trainings: true,
      effectif: true,
      recruitment: true,
      recruitment_v2: true,
      media: true,
      system: true,
    };
    return initial;
  });
  // State for expanded nav items with children
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const toggleItemExpand = (path: string) => {
    setExpandedItems(prev => ({ ...prev, [path]: !prev[path] }));
  };

  // Détecter et ouvrir automatiquement la catégorie contenant la route active
  useEffect(() => {
    const currentPath = location.pathname;
    const currentSearch = location.search;
    const fullCurrent = `${currentPath}${currentSearch}`;

    navCategories.forEach((cat) => {
      const isInside = cat.items.some(item => {
        if (item.children && item.children.length > 0) {
          if (item.children.some(c => c.path === currentPath)) return true;
        }
        if (item.path.includes('?')) {
          return fullCurrent === item.path ||
            (currentPath === '/recruitment' && item.path.startsWith('/recruitment')) ||
            (currentPath === '/trainings' && item.path.startsWith('/trainings'));
        }
        return currentPath === item.path || (currentPath.startsWith(item.path) && item.path !== '/');
      });

      if (isInside) {
        setOpenCategories(prev => ({ ...prev, [cat.id]: true }));
      }
    });
  }, [location.pathname, location.search]);

  // Basculer l'ouverture/fermeture d'une catégorie (sans forcer la navigation)
  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Detect mobile/tablet viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  }, [location.pathname, location.search]);

  const handleLogout = async () => {
    try {
      await AuditLogger.closeSession();
    } catch (err) {
      console.warn('[Sidebar] Erreur fermeture session audit:', err);
    }
    await logout();
    navigate('/login');
  };

  const isItemActive = (itemPath: string) => {
    if (itemPath.includes('?')) {
      const [path, search] = itemPath.split('?');
      if (location.pathname === path) {
        const defaultSearch = isScoutAdmin ? 'tab=scouts' : 'tab=candidates';
        if (!location.search && (search === defaultSearch || search === 'tab=calendar')) return true;
        return location.search === `?${search}`;
      }
      return false;
    }
    return location.pathname === itemPath;
  };

  const isCategoryActive = (category: NavCategory) => {
    return category.items.some(item => {
      if (item.children && item.children.length > 0) {
        return item.children.some(c => isItemActive(c.path));
      }
      return isItemActive(item.path);
    });
  };

  const isDashboardActive = location.pathname === '/' || location.pathname === '/dashboard';

  const renderNavList = (isCollapsedMode = false) => (
    <div className="space-y-4">
      {/* Primary Dashboard Link */}
      <div className="mb-2">
        <NavLink
          to="/dashboard"
          onClick={() => isMobile && onMobileClose?.()}
          className={cn(
            "w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all duration-200 group relative text-sm font-bold shadow-sm",
            isDashboardActive
              ? "bg-primary text-white shadow-md font-black"
              : "text-slate-700 hover:bg-slate-100",
            isCollapsedMode && "justify-center px-2 py-3"
          )}
          title={isCollapsedMode ? "Tableau de Bord" : undefined}
        >
          <LayoutDashboard className={cn(
            "w-5 h-5 shrink-0 transition-transform",
            !isDashboardActive && "group-hover:scale-110 text-primary"
          )} />

          {!isCollapsedMode && (
            <span className="truncate flex-1 text-left tracking-wide">
              Tableau de Bord
            </span>
          )}

          {!isCollapsedMode && (
            <span className={cn(
              "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
              isDashboardActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
            )}>
              Live
            </span>
          )}

          {isDashboardActive && !isCollapsedMode && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-r-full" />
          )}
        </NavLink>
      </div>

      {navCategories.map((category) => {
        const isOpen = !!openCategories[category.id];
        const CategoryIcon = category.icon;
        const hasActiveSubItem = isCategoryActive(category);

        return (
          <div key={category.id} className="space-y-1">
            {/* Header de la Catégorie (Cliquable pour Accordéon) */}
            <button
              type="button"
              onClick={() => {
                if (!isCollapsedMode) {
                  toggleCategory(category.id);
                }
              }}
              title={isCollapsedMode ? category.title : undefined}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 group",
                hasActiveSubItem
                  ? "text-primary bg-primary/5 font-extrabold"
                  : "text-muted-foreground/80 hover:text-foreground hover:bg-slate-100/70",
                isCollapsedMode && "justify-center px-2 py-2.5"
              )}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <CategoryIcon className={cn(
                  "w-4.5 h-4.5 shrink-0 transition-transform duration-200",
                  hasActiveSubItem ? "text-primary" : "text-muted-foreground",
                  !isCollapsedMode && "group-hover:scale-110"
                )} />
                {!isCollapsedMode && (
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="truncate text-xs font-black">{category.title}</span>
                    {category.badge && (
                      <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-tight">
                        {category.badge}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {!isCollapsedMode && (
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-muted-foreground/60 transition-transform duration-300",
                    isOpen ? "rotate-0" : "-rotate-90"
                  )}
                />
              )}
            </button>

            {/* Sous-catégories Dépliables */}
            {(!isCollapsedMode ? isOpen : true) && (
              <div className={cn(
                "space-y-1 transition-all duration-300",
                !isCollapsedMode && "pl-3 ml-2 border-l-2 border-slate-100"
              )}>
                {category.items.map((item) => {
                  const ItemIcon = item.icon;
                  const active = isItemActive(item.path);
                  const hasChildren = item.children && item.children.length > 0;
                  const childIsActive = item.children?.some(c => isItemActive(c.path));
                  const isExpanded = expandedItems[item.path] !== undefined
                    ? expandedItems[item.path]
                    : Boolean(childIsActive);

                  if (hasChildren) {
                    return (
                      <div key={item.path} className="space-y-1">
                        {/* Parent item with expand toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            toggleItemExpand(item.path);
                            if (!childIsActive) {
                              navigate(item.children?.[0]?.path || item.path);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 group relative text-sm font-semibold",
                            (active || childIsActive)
                              ? "bg-primary/10 text-primary shadow-sm font-bold"
                              : "text-slate-600 hover:bg-secondary hover:text-foreground",
                            isCollapsedMode && "justify-center px-2"
                          )}
                        >
                          <ItemIcon className={cn("w-4.5 h-4.5 shrink-0", !active && !childIsActive && "group-hover:scale-110 transition-transform")} />
                          {!isCollapsedMode && (
                            <span className="truncate flex-1 text-left">{item.label}</span>
                          )}
                          {!isCollapsedMode && (
                            <ChevronDown className={cn(
                              "w-3.5 h-3.5 shrink-0 transition-transform duration-200 text-muted-foreground/60",
                              isExpanded ? "rotate-0" : "-rotate-90"
                            )} />
                          )}
                        </button>

                        {/* Children */}
                        {isExpanded && !isCollapsedMode && (
                          <div className="pl-3 ml-3 border-l-2 border-primary/20 space-y-1">
                            {item.children!.map(child => {
                              const ChildIcon = child.icon;
                              const childActive = isItemActive(child.path);
                              return (
                                <NavLink
                                  key={child.path}
                                  to={child.path}
                                  onClick={() => isMobile && onMobileClose?.()}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 group relative text-xs font-semibold",
                                    childActive
                                      ? "bg-primary/10 text-primary font-bold"
                                      : "text-slate-500 hover:bg-secondary hover:text-foreground"
                                  )}
                                >
                                  <ChildIcon className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate flex-1 text-left">{child.label}</span>
                                  {childActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-r-full" />
                                  )}
                                </NavLink>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Normal item (no children)
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => isMobile && onMobileClose?.()}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 group relative text-sm font-semibold",
                        active
                          ? "bg-primary/10 text-primary shadow-sm font-bold"
                          : "text-slate-600 hover:bg-secondary hover:text-foreground",
                        isCollapsedMode && "justify-center px-2 py-2.5"
                      )}
                      title={isCollapsedMode ? item.label : undefined}
                    >
                      <ItemIcon className={cn(
                        "w-4.5 h-4.5 shrink-0 transition-transform",
                        !active && "group-hover:scale-110"
                      )} />
                      
                      {!isCollapsedMode && (
                        <span className="truncate flex-1 text-left">{item.label}</span>
                      )}

                      {item.count !== undefined && !isCollapsedMode && (
                        <span className="ml-auto bg-primary text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                          {item.count}
                        </span>
                      )}

                      {active && !isCollapsedMode && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-5 bg-primary rounded-r-full" />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const sidebarContent = (
    <>
      {/* Mobile Close Button */}
      {isMobile && (
        <button
          onClick={onMobileClose}
          className="absolute top-4 right-4 p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors lg:hidden active:scale-95 z-20"
          aria-label="Fermer le menu"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>
      )}

      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b shrink-0 bg-white sticky top-0 z-10">
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 shadow-sm p-1.5 flex items-center justify-center shrink-0">
          <img
            src={clubLogo}
            alt={clubName}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = defaultClubLogo;
            }}
          />
        </div>
        <span className="ml-3 font-extrabold text-lg block text-foreground tracking-tight truncate">
          {clubName}
        </span>
      </div>

      {/* Navigation principale */}
      <div className="flex-1 overflow-y-auto py-5 px-3.5 custom-scrollbar">
        {renderNavList(false)}
      </div>

      {/* Navigation bas */}
      <div className="p-3.5 border-t space-y-1.5 bg-white">
        {isScout ? (
          <button
            onClick={() => {
              setProfileModalOpen(true);
              if (isMobile) onMobileClose?.();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100"
          >
            <User className="w-5 h-5 shrink-0 text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="block font-black">Mon Profil</span>
          </button>
        ) : (
          <NavLink
            to="/settings"
            onClick={() => isMobile && onMobileClose?.()}
            className={({ isActive }) => cn(
              "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group text-sm font-semibold",
              isActive
                ? "bg-primary/10 text-primary font-bold"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Settings className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="block">Paramètres</span>
          </NavLink>
        )}

        <button
          onClick={() => {
            handleLogout();
            if (isMobile) onMobileClose?.();
          }}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group text-sm font-semibold text-muted-foreground hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="block">Déconnexion</span>
        </button>
      </div>
    </>
  );

  // Desktop sidebar
  const desktopSidebar = (
    <aside className={cn(
      "fixed left-0 top-0 h-full bg-white border-r hidden md:flex flex-col z-50 transition-all duration-300 overflow-y-auto overflow-hidden",
      collapsed ? "w-20" : "w-20 lg:w-72"
    )}>
      {/* Header Logo & Collapse Button */}
      <div className="h-20 flex items-center px-4.5 border-b shrink-0 bg-white sticky top-0 z-10">
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 shadow-sm p-1.5 flex items-center justify-center shrink-0 ml-1">
          <img
            src={clubLogo}
            alt={clubName}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = defaultClubLogo;
            }}
          />
        </div>
        <span className={cn(
          "ml-3 font-extrabold text-lg text-foreground tracking-tight transition-all duration-300 truncate",
          collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-0 w-0 overflow-hidden lg:opacity-100 lg:w-auto"
        )}>
          {clubName}
        </span>

        <button
          onClick={onToggleCollapse}
          className={cn(
            "ml-auto p-2 rounded-lg hover:bg-secondary transition-all duration-300 hidden lg:flex",
            collapsed ? "opacity-100" : "opacity-60 hover:opacity-100"
          )}
          title={collapsed ? "Développer" : "Réduire"}
        >
          <ChevronLeft className={cn(
            "w-4.5 h-4.5 text-muted-foreground transition-transform duration-300",
            collapsed && "rotate-180"
          )} />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto py-5 px-3.5 custom-scrollbar">
        {renderNavList(collapsed)}
      </div>

      {/* Footer Settings & Logout */}
      <div className="p-3.5 border-t space-y-1.5 bg-white">
        {isScout ? (
          <NavLink
            to="/profile"
            className={({ isActive }) => cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-semibold",
              isActive
                ? "bg-purple-100 text-purple-900 font-bold border border-purple-200 shadow-2xs"
                : "text-purple-700 bg-purple-50 hover:bg-purple-100",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? "Mon Profil" : undefined}
          >
            <User className="w-5 h-5 shrink-0 text-purple-600 group-hover:scale-110 transition-transform" />
            <span className={cn(
              "transition-all duration-300 font-black",
              collapsed ? "opacity-0 w-0 overflow-hidden hidden" : "opacity-100 block"
            )}>Mon Profil</span>
          </NavLink>
        ) : (
          <NavLink
            to="/settings"
            className={({ isActive }) => cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-semibold",
              isActive ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? "Paramètres" : undefined}
          >
            <Settings className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
            <span className={cn(
              "transition-all duration-300",
              collapsed ? "opacity-0 w-0 overflow-hidden hidden" : "opacity-100 block"
            )}>Paramètres</span>
          </NavLink>
        )}

        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-semibold text-muted-foreground hover:bg-red-50 hover:text-red-600",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Déconnexion" : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
          <span className={cn(
            "transition-all duration-300",
            collapsed ? "opacity-0 w-0 overflow-hidden hidden" : "opacity-100 block"
          )}>Déconnexion</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {desktopSidebar}

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onMobileClose}
          />
          <aside className="fixed left-0 top-0 h-full w-[285px] sm:w-80 max-w-[85vw] bg-white border-r flex flex-col z-[65] shadow-2xl animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Fin de Sidebar */}
    </>
  );
};

export const MobileMenuButton: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className }) => (
  <button
    onClick={onClick}
    className={cn(
      "p-2 rounded-2xl hover:bg-secondary text-foreground active:scale-95 transition-all flex items-center justify-center border border-slate-200/80 dark:border-slate-800 shadow-xs",
      className
    )}
    aria-label="Ouvrir le menu"
  >
    <Menu className="w-5 h-5 text-foreground" />
  </button>
);

export default Sidebar;
