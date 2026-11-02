import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import type { UserProfile } from '../types';
import { normalizeAgeCategory } from '../constants';

export interface AuthState {
  email: string | null;
  isAuthenticated: boolean;
  user: UserProfile | null;
  roles: string[];
  userCategories: string[];
  permissions: string[];
  loading: boolean;
  isRealSuperAdmin: boolean;
  isImpersonating?: boolean;
  impersonatedUser?: UserProfile | null;
  originalUser?: UserProfile | null;
  originalEmail?: string | null;
  originalPermissions?: string[];
  originalCategories?: string[];
}

export const SUBMODULE_TO_PARENT_MAP: Record<string, string> = {
  // Compétition & Matchs
  matches: 'competition',
  official_shortlist: 'competition',
  arbitres: 'competition',
  leagues: 'competition',
  stadiums: 'competition',
  // Entraînements
  trainings_calendar: 'trainings',
  trainings_sessions: 'trainings',
  trainings_exercises: 'trainings',
  trainings_evaluations: 'trainings',
  trainings_load: 'trainings',
  // Effectif & Sportif
  players: 'effectif',
  teams: 'effectif',
  opponents: 'effectif',
  staff: 'effectif',
  // Détection & Recrutement V2
  scouts: 'recruitment_v2',
  candidates: 'recruitment_v2',
  missions: 'recruitment_v2',
  shortlist: 'recruitment_v2',
  sessions: 'recruitment_v2',
  compare: 'recruitment_v2',
  archives: 'recruitment_v2',
  // Médiathèque
  media: 'media'
};

interface PermissionsContextType {
  authState: AuthState;
  can: (action: string, scopeType?: string, scopeId?: string) => boolean;
  hasModuleAccess: (module: string, action?: 'create' | 'read' | 'update' | 'delete') => boolean;
  hasSubModuleAccess: (subModule: string, action?: 'create' | 'read' | 'update' | 'delete' | 'stats' | 'surclasser' | 'departure' | 'drive_link' | string, parentModule?: string) => boolean;
  canManageCategory: (category: string | null | undefined) => boolean;
  hasCategoryRestriction: boolean;
  allowedCategories: string[];
  logout: () => Promise<void>;
  loginAs: (role: string, jobTitle?: string, categories?: string[]) => void;
  impersonateUser: (user: UserProfile, explicitPerms?: string[], categories?: string[]) => Promise<void>;
  resetImpersonation: () => void;
}

const EMPTY_STATE: AuthState = {
  email: null,
  isAuthenticated: false,
  user: null,
  roles: [],
  userCategories: [],
  permissions: [],
  loading: true,
  isRealSuperAdmin: false,
};

export const DEFAULT_PERMISSIONS_CONTEXT: PermissionsContextType = {
  authState: EMPTY_STATE,
  can: () => false,
  hasModuleAccess: () => false,
  hasSubModuleAccess: () => false,
  canManageCategory: () => true,
  hasCategoryRestriction: false,
  allowedCategories: [],
  logout: async () => {},
  loginAs: () => {},
  impersonateUser: async () => {},
  resetImpersonation: () => {},
};

const PermissionsContext = createContext<PermissionsContextType>(DEFAULT_PERMISSIONS_CONTEXT);

export const usePermissions = () => {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    console.warn("[usePermissions] usePermissions appelé hors de PermissionsProvider ou désynchronisé lors du rechargement à chaud (HMR). Utilisation du contexte sécurisé par défaut.");
    return DEFAULT_PERMISSIONS_CONTEXT;
  }
  return ctx;
};

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(EMPTY_STATE);

  const fetchUser = async (userId: string, email: string | null) => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      let assignedCats: string[] = [];
      try {
        const { data: catAssignments, error: catErr } = await supabaseAdmin
          .from('user_category_assignments')
          .select('category')
          .eq('user_id', userId);
        if (!catErr && catAssignments && catAssignments.length > 0) {
          assignedCats = catAssignments.map(c => c.category);
          localStorage.setItem(`fusc_user_categories_${userId}`, JSON.stringify(assignedCats));
        } else {
          const localCats = localStorage.getItem(`fusc_user_categories_${userId}`);
          if (localCats) {
            assignedCats = JSON.parse(localCats);
          }
        }
      } catch (cErr) {
        console.warn('[PermissionsContext] user_category_assignments fetch error:', cErr);
        const localCats = localStorage.getItem(`fusc_user_categories_${userId}`);
        if (localCats) {
          assignedCats = JSON.parse(localCats);
        }
      }

      // Charger les permissions explicites de l'utilisateur (matrice CRUD et modules)
      let userPerms: string[] = [];
      try {
        const { data: permOverrides } = await supabaseAdmin
          .from('user_permissions_overrides')
          .select('permission_id')
          .eq('user_id', userId);
        if (permOverrides && permOverrides.length > 0) {
          userPerms = permOverrides.map(p => p.permission_id);
        } else {
          const localCache = localStorage.getItem(`fusc_user_perms_${userId}`);
          if (localCache) {
            userPerms = JSON.parse(localCache);
          }
        }
      } catch (pErr) {
        console.warn('[PermissionsContext] user_permissions_overrides fetch error:', pErr);
        const localCache = localStorage.getItem(`fusc_user_perms_${userId}`);
        if (localCache) {
          userPerms = JSON.parse(localCache);
        }
      }

      const roles: string[] = [];
      if (profile?.system_role) {
        roles.push(profile.system_role);
      }

      const isSuperAdmin = profile?.system_role === 'super_admin';

      setAuthState({
        email,
        isAuthenticated: true,
        user: (profile as UserProfile) ?? null,
        roles,
        userCategories: assignedCats,
        permissions: userPerms,
        loading: false,
        isRealSuperAdmin: isSuperAdmin,
      });
    } catch (err) {
      console.error('[PermissionsContext] fetchUser error:', err);
      setAuthState({
        email,
        isAuthenticated: true,
        user: null,
        roles: [],
        userCategories: [],
        permissions: [],
        loading: false,
        isRealSuperAdmin: false,
      });
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAuthState(prev => {
        if (prev.loading) {
          return { ...EMPTY_STATE, loading: false };
        }
        return prev;
      });
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(timeout);
      if (session?.user) {
        fetchUser(session.user.id, session.user.email ?? null);
      } else {
        setAuthState({ ...EMPTY_STATE, loading: false });
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  /**
   * Vérifie l'accès granulaire CRUD à une SOUS-RUBRIQUE :
   * Ex: 'matches', 'official_shortlist', 'arbitres', 'leagues', 'stadiums',
   * 'trainings_calendar', 'trainings_sessions', 'trainings_exercises', 'trainings_evaluations', 'trainings_load',
   * 'players', 'teams', 'opponents', 'staff',
   * 'scouts', 'candidates', 'missions', 'shortlist', 'sessions', 'compare', 'archives'
   */
  const hasSubModuleAccess = (
    subModule: string,
    action: 'create' | 'read' | 'update' | 'delete' | 'stats' | 'surclasser' | 'departure' | 'drive_link' | string = 'read',
    parentModule?: string
  ): boolean => {
    const role = authState.user?.system_role?.toLowerCase() || '';
    const isScoutAdmin = role === 'scout_admin' || authState.user?.role?.toLowerCase() === 'scout_admin' || authState.roles.some(r => r.toLowerCase() === 'scout_admin');
    if (isScoutAdmin && (parentModule === 'recruitment_v2' || SUBMODULE_TO_PARENT_MAP[subModule] === 'recruitment_v2')) return true;
    const isSuperAdmin = role === 'super_admin';
    if (isSuperAdmin) return true;

    const perms = authState.permissions || [];

    // 1. Clé sous-module explicite : "sub:<subModule>:<action>"
    const directKey = `sub:${subModule}:${action}`;
    if (perms.includes(directKey)) return true;

    // Support des alias spécifiques pour la gestion des rapports
    if (subModule === 'candidates' && (action === 'manage_reports' || action === 'reports')) {
      if (perms.includes('sub:candidates:manage_reports') || perms.includes('sub:candidates:reports')) {
        return true;
      }
    }

    // Support de l'action métier spécifique Calendrier des Matchs : Planifier un match
    // RÈGLE STRICTE : dépend impérativement d'être coché explicitement dans UserManagement.
    if (subModule === 'matches' && (action === 'plan_match' || action === 'create')) {
      if (perms.includes('sub:matches:plan_match')) return true;
      if (perms.length > 0) return false;
      // Fallback rôle historique UNIQUEMENT si aucune permission explicite n'a jamais été configurée
      if (role === 'admin' || role === 'direction' || role === 'coach') return true;
      return false;
    }

    // 1.b Actions métier spécifiques joueur (Statistiques / Surclasser / Sortie-Transfert)
    // et Détection V2 Database (Lien Vidéo Drive, Assigner mission, Recruter immédiatement, Gestion de rapport) : STRICT — visibles uniquement si cochées explicitement.
    if (subModule === 'players' && ['stats', 'surclasser', 'departure'].includes(action)) {
      return false;
    }
    // Specific candidate actions including newly added edit_player
    if (subModule === 'candidates' && ['drive_link', 'assign_mission', 'recruit_now', 'manage_reports', 'reports', 'edit_player'].includes(action)) {
      // Priorité absolue aux permissions explicites si définies
      if (perms.includes(`sub:candidates:${action}`)) return true;
      // Si des permissions explicites existent mais que l'action n'est pas cochée, refus strict
      if (perms.length > 0) return false;

      // Fallback rôle si aucune configuration individuelle n'existe
      if (role === 'admin' || role === 'scout_admin') {
        if (action === 'drive_link') return false; // Exige d'être coché explicitement
        return true;
      }
      if (action === 'recruit_now' && (role === 'direction' || authState.user?.job_title === 'Directeur Administratif')) return true;
      if ((action === 'manage_reports' || action === 'reports') && role.startsWith('scout_')) return true;
      return false;
    }

    // 2. RÈGLE STRICTE DE GOUVERNANCE : Si l'utilisateur possède des permissions explicites (perms.length > 0)
    // Si la sous-rubrique n'a pas été cochée dans UserManagement (directKey absente), NE PAS L'AFFICHER !
    if (perms.length > 0) {
      return false;
    }

    // 3. Fallback rôles historiques UNIQUEMENT si AUCUNE permission n'a jamais été configurée
    if (perms.length === 0) {
      if (role === 'admin' || role === 'direction') return true;
      if (role === 'coach' || authState.user?.job_title?.toLowerCase().includes('coach')) {
        if (subModule.startsWith('trainings_') || subModule === 'matches' || subModule === 'official_shortlist' || subModule === 'players' || subModule === 'teams' || subModule === 'opponents' || subModule === 'media') return true;
      }
      if (role.startsWith('scout_') || authState.user?.job_title?.toLowerCase().includes('scout')) {
        if (['candidates', 'missions', 'shortlist', 'sessions', 'compare', 'archives'].includes(subModule)) return true;
        if ((role === 'scout_admin' || role === 'scout_manager' || authState.user?.job_title?.toLowerCase().includes('manager')) && subModule === 'scouts') return true;
        if (['players', 'opponents', 'matches', 'official_shortlist', 'media'].includes(subModule)) return true;
      }
      if (role.includes('analyst') || authState.user?.job_title?.toLowerCase().includes('analyst')) {
        if (['matches', 'official_shortlist', 'arbitres', 'leagues', 'stadiums', 'players', 'teams', 'opponents', 'staff', 'media'].includes(subModule)) return true;
      }
      if (subModule === 'media') return true;
    }

    return false;
  };

  /**
   * Vérifie l'accès granulaire CRUD à une grande rubrique métier :
   * 'recruitment_v2' | 'competition' | 'trainings' | 'effectif' | 'media'
   * Action : 'create' | 'read' | 'update' | 'delete' (par défaut : 'read')
   */
  const hasModuleAccess = (module: string, action: 'create' | 'read' | 'update' | 'delete' = 'read'): boolean => {
    const role = authState.user?.system_role?.toLowerCase() || '';
    const isScoutAdmin = role === 'scout_admin' || authState.user?.role?.toLowerCase() === 'scout_admin' || authState.roles.some(r => r.toLowerCase() === 'scout_admin');
    if (isScoutAdmin && module === 'recruitment_v2') return true;
    const isSuperAdmin = role === 'super_admin';
    if (isSuperAdmin) return true;

    const perms = authState.permissions || [];

    // 1. Si au moins une sous-rubrique de ce module possède la permission requise
    const hasAnySubAction = perms.some(p => {
      if (!p.startsWith('sub:') || !p.endsWith(`:${action}`)) return false;
      const subKey = p.split(':')[1];
      return SUBMODULE_TO_PARENT_MAP[subKey] === module;
    });
    if (hasAnySubAction) return true;

    // 2. Vérification clé granulaire directe
    const directKey = `${module}:${action}`;
    if (perms.includes(directKey)) {
      return true;
    }

    // 3. Si l'utilisateur possède des permissions explicites, ne pas accorder par défaut
    if (perms.length > 0) {
      return false;
    }

    // 4. Fallback rôles historiques si AUCUNE permission n'a jamais été configurée
    if (perms.length === 0) {
      if (role === 'admin' || role === 'direction') return true;
      if (role === 'coach' || authState.user?.job_title?.toLowerCase().includes('coach')) {
        if (module === 'trainings' || module === 'competition' || module === 'effectif' || module === 'media') return true;
      }
      if (role.startsWith('scout_') || authState.user?.job_title?.toLowerCase().includes('scout')) {
        if (module === 'recruitment_v2' || module === 'effectif' || module === 'competition' || module === 'media') return true;
      }
      if (role.includes('analyst') || authState.user?.job_title?.toLowerCase().includes('analyst')) {
        if (module === 'competition' || module === 'effectif' || module === 'media') return true;
      }
      if (module === 'media') return true;
    }

    return false;
  };

  /**
   * Vérifie une permission globale ou d'action
   */
  const can = (action: string) => {
    const role = authState.user?.system_role?.toLowerCase() || '';
    const isSuperAdmin = !authState.isImpersonating && (role === 'super_admin' || authState.isRealSuperAdmin);
    if (isSuperAdmin) return true;

    // Actions système (Gestion Utilisateurs, Plugins, Audit Logs) STRICTEMENT RÉSERVÉES AU SUPER ADMIN
    if (action === 'manage_users' || action === 'manage_roles' || action === 'view_logs' || action === 'manage_system') {
      return isSuperAdmin;
    }

    const perms = authState.permissions || [];
    if (perms.includes(action)) return true;

    if (action === 'manage_teams') {
      return (
        hasModuleAccess('effectif', 'read') ||
        hasModuleAccess('competition', 'read') ||
        hasSubModuleAccess('teams', 'read') ||
        hasSubModuleAccess('opponents', 'read') ||
        hasSubModuleAccess('leagues', 'read') ||
        hasSubModuleAccess('stadiums', 'read') ||
        hasModuleAccess('effectif', 'update') ||
        hasModuleAccess('competition', 'update')
      );
    }
    if (action === 'create_match' || action === 'plan_match' || action === 'schedule_match') {
      if (perms.length > 0) {
        return perms.includes('sub:matches:plan_match') || perms.includes('schedule_match');
      }
      if (role === 'admin' || role === 'direction' || role === 'coach') {
        return true;
      }
      return false;
    }

    if (action === 'manage_matches') {
      return (
        hasSubModuleAccess('matches', 'update') ||
        hasSubModuleAccess('matches', 'create') ||
        hasSubModuleAccess('matches', 'plan_match') ||
        hasModuleAccess('competition', 'update')
      );
    }

    return false; 
  };

  // Écoute en temps réel des mises à jour de catégories depuis UserManagement
  useEffect(() => {
    const handleCategoriesUpdated = (e: any) => {
      const { userId, categories } = e.detail || {};
      if (userId && authState.user?.id && userId === authState.user.id && Array.isArray(categories)) {
        setAuthState(prev => ({
          ...prev,
          userCategories: categories,
        }));
      }
    };
    const handlePermsUpdated = (e: any) => {
      const { userId, permissions } = e.detail || {};
      if (userId && authState.user?.id && userId === authState.user.id && Array.isArray(permissions)) {
        setAuthState(prev => ({
          ...prev,
          permissions,
        }));
      }
    };
    window.addEventListener('fusc_user_categories_updated', handleCategoriesUpdated);
    window.addEventListener('fusc_user_perms_updated', handlePermsUpdated);
    return () => {
      window.removeEventListener('fusc_user_categories_updated', handleCategoriesUpdated);
      window.removeEventListener('fusc_user_perms_updated', handlePermsUpdated);
    };
  }, [authState.user?.id]);

  const hasCategoryRestriction = Boolean(authState.userCategories && authState.userCategories.length > 0);
  const allowedCategories = hasCategoryRestriction
    ? authState.userCategories.map(c => normalizeAgeCategory(c))
    : ['U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U21', 'Senior', 'PRO'];

  const canManageCategory = (category: string | null | undefined): boolean => {
    const role = authState.user?.system_role?.toLowerCase() || '';
    const isScoutAdmin = role === 'scout_admin' || authState.user?.role?.toLowerCase() === 'scout_admin' || authState.roles.some(r => r.toLowerCase() === 'scout_admin');
    if (isScoutAdmin) return true;
    // 1. RÈGLE STRICTE : Si l'utilisateur possède des catégories assignées explicites (userCategories.length > 0),
    // SEULES CES CATÉGORIES sont autorisées à être gérées et visualisées !
    // Même avec un rôle admin ou direction, le périmètre reste strictement confiné aux catégories cochées.
    if (authState.userCategories && authState.userCategories.length > 0) {
      if (!category) return false;
      const normCategory = normalizeAgeCategory(category);
      return authState.userCategories.some(c => normalizeAgeCategory(c) === normCategory);
    }

    // 2. Si AUCUNE catégorie spécifique n'a été restreinte/cochée pour ce compte :
    // Les administrateurs généraux (super_admin, admin, direction) ont accès à tout par défaut.
    const isSuperAdmin = !authState.isImpersonating && (role === 'super_admin' || authState.isRealSuperAdmin);
    if (isSuperAdmin || role === 'admin' || role === 'direction') {
      return true;
    }

    // Pour les autres rôles opérationnels sans catégorie assignée : aucun accès arbitraire
    return false;
  };

  const impersonateUser = async (
    targetUser: UserProfile,
    explicitPerms?: string[],
    categories?: string[]
  ) => {
    const originalUser = authState.originalUser || authState.user;
    const originalEmail = authState.originalEmail || authState.email;
    const originalPerms = authState.originalPermissions || authState.permissions;
    const originalCats = authState.originalCategories || authState.userCategories;

    let perms = explicitPerms;
    let cats = categories;

    if (!perms) {
      perms = [];
      try {
        const { data } = await supabaseAdmin
          .from('user_permissions_overrides')
          .select('permission_id')
          .eq('user_id', targetUser.id);
        if (data && data.length > 0) {
          perms = data.map(p => p.permission_id);
          try {
            localStorage.setItem(`fusc_user_perms_${targetUser.id}`, JSON.stringify(perms));
          } catch {}
        } else {
          const cached = localStorage.getItem(`fusc_user_perms_${targetUser.id}`);
          if (cached) perms = JSON.parse(cached);
        }
      } catch (e) {
        const cached = localStorage.getItem(`fusc_user_perms_${targetUser.id}`);
        if (cached) perms = JSON.parse(cached);
      }
    }

    if (!cats) {
      cats = [];
      try {
        const { data } = await supabaseAdmin
          .from('user_category_assignments')
          .select('category')
          .eq('user_id', targetUser.id);
        if (data && data.length > 0) {
          cats = data.map(c => c.category);
          try {
            localStorage.setItem(`fusc_user_categories_${targetUser.id}`, JSON.stringify(cats));
          } catch {}
        } else {
          const cached = localStorage.getItem(`fusc_user_categories_${targetUser.id}`);
          if (cached) cats = JSON.parse(cached);
        }
      } catch (e) {
        const cached = localStorage.getItem(`fusc_user_categories_${targetUser.id}`);
        if (cached) cats = JSON.parse(cached);
      }
    }

    const isTargetSuper = targetUser.system_role?.toLowerCase() === 'super_admin';

    setAuthState(prev => ({
      ...prev,
      email: (targetUser as any).email || prev.email,
      user: targetUser,
      roles: targetUser.system_role ? [targetUser.system_role] : ['user'],
      permissions: perms || [],
      userCategories: cats || [],
      isImpersonating: !isTargetSuper,
      impersonatedUser: isTargetSuper ? null : targetUser,
      originalUser: prev.originalUser || originalUser,
      originalEmail: prev.originalEmail || originalEmail,
      originalPermissions: prev.originalPermissions || originalPerms,
      originalCategories: prev.originalCategories || originalCats,
      isRealSuperAdmin: prev.isRealSuperAdmin || originalUser?.system_role === 'super_admin',
    }));
  };

  const resetImpersonation = () => {
    setAuthState(prev => {
      const restoredUser = prev.originalUser || prev.user;
      return {
        ...prev,
        user: restoredUser,
        email: prev.originalEmail || prev.email,
        roles: restoredUser?.system_role ? [restoredUser.system_role] : ['super_admin'],
        permissions: prev.originalPermissions || [],
        userCategories: prev.originalCategories || [],
        isImpersonating: false,
        impersonatedUser: null,
        originalUser: null,
        originalEmail: null,
        originalPermissions: undefined,
        originalCategories: undefined,
      };
    });
  };

  const loginAs = (role: string, jobTitle?: string, categories?: string[]) => {
    const isSuper = role === 'super_admin';
    const originalUser = authState.originalUser || authState.user;
    const originalEmail = authState.originalEmail || authState.email;
    const originalPerms = authState.originalPermissions || authState.permissions;
    const originalCats = authState.originalCategories || authState.userCategories;

    setAuthState(prev => ({
      ...prev,
      roles: [role],
      userCategories: categories !== undefined ? categories : prev.userCategories,
      user: prev.user 
        ? { 
            ...prev.user, 
            system_role: role, 
            ...(jobTitle !== undefined ? { job_title: jobTitle } : {}) 
          } 
        : {
            id: 'dev-user-id',
            email: 'dev@fusc.ma',
            full_name: 'Dev Session',
            system_role: role,
            job_title: jobTitle || null,
            is_active: true,
            created_at: new Date().toISOString()
          },
      permissions: isSuper ? prev.originalPermissions || [] : [],
      isImpersonating: !isSuper,
      impersonatedUser: isSuper ? null : {
        id: prev.user?.id || 'dev-user-id',
        full_name: prev.user?.full_name || 'Rôle Simulé',
        avatar_url: prev.user?.avatar_url || null,
        system_role: role,
        job_title: jobTitle || null,
        is_active: true,
        created_at: new Date().toISOString()
      } as UserProfile,
      originalUser: prev.originalUser || originalUser,
      originalEmail: prev.originalEmail || originalEmail,
      originalPermissions: prev.originalPermissions || originalPerms,
      originalCategories: prev.originalCategories || originalCats,
      isRealSuperAdmin: prev.isRealSuperAdmin || originalUser?.system_role === 'super_admin',
    }));
  };

  return (
    <PermissionsContext.Provider value={{
      authState,
      can,
      hasModuleAccess,
      hasSubModuleAccess,
      canManageCategory,
      hasCategoryRestriction,
      allowedCategories,
      logout,
      loginAs,
      impersonateUser,
      resetImpersonation
    }}>
      {children}
    </PermissionsContext.Provider>
  );
};
