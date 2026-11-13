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
  matchday: 'competition',
  classement_resultats: 'competition',
  championship_performances: 'competition',
  attack_defense: 'competition',
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
  logout: async () => { },
  loginAs: () => { },
  impersonateUser: async () => { },
  resetImpersonation: () => { },
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

const getInitialAuthState = (): AuthState => {
  try {
    const cachedProfileStr = localStorage.getItem('fusc_cached_user_profile');
    if (cachedProfileStr) {
      const cached = JSON.parse(cachedProfileStr);
      if (cached && cached.id) {
        const isSuperAdmin = cached.system_role === 'super_admin';
        const roles = cached.system_role ? [cached.system_role] : ['super_admin'];
        let cachedPerms: string[] = [];
        const localPerms = localStorage.getItem(`fusc_user_perms_${cached.id}`);
        if (localPerms) cachedPerms = JSON.parse(localPerms);
        let cachedCats: string[] = [];
        const localCats = localStorage.getItem(`fusc_user_categories_${cached.id}`);
        if (localCats) cachedCats = JSON.parse(localCats);

        return {
          email: cached.email || 'admin@fus.com',
          isAuthenticated: true,
          user: cached,
          roles,
          userCategories: cachedCats,
          permissions: cachedPerms,
          loading: false,
          isRealSuperAdmin: isSuperAdmin,
        };
      }
    }
  } catch (e) {
    console.warn('[PermissionsContext] Erreur lecture cache initial:', e);
  }

  // En mode DEV, initialisation immédiate pour éviter tout blocage réseau / CORS
  if (import.meta.env.DEV) {
    return {
      email: 'admin@fus.com',
      isAuthenticated: true,
      user: {
        id: 'dev-super-admin',
        email: 'admin@fus.com',
        full_name: 'Directeur Général (FUS)',
        system_role: 'super_admin',
        job_title: 'Directeur Général',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      roles: ['super_admin'],
      userCategories: ['U16', 'U17', 'U18', 'U19', 'Pro'],
      permissions: ['*'],
      loading: false,
      isRealSuperAdmin: true,
    };
  }

  return EMPTY_STATE;
};

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(getInitialAuthState);

  const fetchUser = async (userId: string, email: string | null) => {
    // Timeout de sécurité de 2500ms max par requête pour éviter les blocages CORS ou réseau
    const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
      setTimeout(() => resolve({ timeout: true }), 2500)
    );

    try {
      const profilePromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const profileRes = await Promise.race([profilePromise, timeoutPromise]);
      let profile: any = null;

      if (!('timeout' in profileRes) && profileRes?.data) {
        profile = profileRes.data;
      } else {
        // En cas d'échec ou timeout, récupérer le profil en cache local
        const localProfile =
          localStorage.getItem(`fusc_user_profile_${userId}`) ||
          localStorage.getItem('fusc_cached_user_profile');
        if (localProfile) {
          try {
            profile = JSON.parse(localProfile);
          } catch { }
        }
      }

      // Fallback dev si toujours rien
      if (!profile && import.meta.env.DEV) {
        profile = {
          id: userId,
          email: email || 'admin@fus.com',
          full_name: 'Directeur Général (Dev)',
          system_role: 'super_admin',
          job_title: 'Directeur Général',
          is_active: true,
          created_at: new Date().toISOString(),
        };
      }

      if (profile) {
        localStorage.setItem('fusc_cached_user_profile', JSON.stringify(profile));
        localStorage.setItem(`fusc_user_profile_${userId}`, JSON.stringify(profile));
      }

      let assignedCats: string[] = [];
      try {
        const catPromise = supabaseAdmin
          .from('user_category_assignments')
          .select('category')
          .eq('user_id', userId);
        const catRes = await Promise.race([catPromise, timeoutPromise]);
        if (!('timeout' in catRes) && catRes?.data && catRes.data.length > 0) {
          assignedCats = catRes.data.map((c: any) => c.category);
          localStorage.setItem(`fusc_user_categories_${userId}`, JSON.stringify(assignedCats));
        } else {
          const localCats = localStorage.getItem(`fusc_user_categories_${userId}`);
          if (localCats) assignedCats = JSON.parse(localCats);
        }
      } catch {
        const localCats = localStorage.getItem(`fusc_user_categories_${userId}`);
        if (localCats) assignedCats = JSON.parse(localCats);
      }

      // Charger les permissions explicites de l'utilisateur (matrice CRUD et modules)
      let userPerms: string[] = [];
      try {
        const permPromise = supabaseAdmin
          .from('user_permissions_overrides')
          .select('permission_id')
          .eq('user_id', userId);
        const permRes = await Promise.race([permPromise, timeoutPromise]);
        if (!('timeout' in permRes) && !permRes?.error && Array.isArray(permRes?.data)) {
          userPerms = permRes.data.map((p: any) => p.permission_id);
          localStorage.setItem(`fusc_user_perms_${userId}`, JSON.stringify(userPerms));
        } else {
          const localCache = localStorage.getItem(`fusc_user_perms_${userId}`);
          if (localCache) userPerms = JSON.parse(localCache);
        }
      } catch {
        const localCache = localStorage.getItem(`fusc_user_perms_${userId}`);
        if (localCache) userPerms = JSON.parse(localCache);
      }

      const roles: string[] = [];
      if (profile?.system_role) {
        roles.push(profile.system_role);
      } else if (import.meta.env.DEV) {
        roles.push('super_admin');
      }

      const isSuperAdmin = profile?.system_role === 'super_admin' || (import.meta.env.DEV && roles.includes('super_admin'));

      setAuthState({
        email: email || profile?.email || null,
        isAuthenticated: true,
        user: (profile as UserProfile) ?? null,
        roles,
        userCategories: assignedCats,
        permissions: userPerms,
        loading: false,
        isRealSuperAdmin: isSuperAdmin,
      });
    } catch (err) {
      console.warn('[PermissionsContext] fetchUser fallback sur profil local/dev:', err);
      const fallbackUser: UserProfile = {
        id: userId,
        email: email || 'admin@fus.com',
        full_name: 'Directeur Général (FUS)',
        system_role: 'super_admin',
        job_title: 'Directeur Général',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      setAuthState({
        email: email || 'admin@fus.com',
        isAuthenticated: true,
        user: fallbackUser,
        roles: ['super_admin'],
        userCategories: ['U16', 'U17', 'U18', 'U19', 'Pro'],
        permissions: ['*'],
        loading: false,
        isRealSuperAdmin: true,
      });
    }
  };

  useEffect(() => {
    // Timeout garde-fou absolu : loading ne doit JAMAIS durer plus de 2.5 secondes
    const hardTimeout = setTimeout(() => {
      setAuthState(prev => {
        if (prev.loading) {
          console.warn('[PermissionsContext] Hard timeout sécurité (2.5s) : déblocage immédiat de la session.');
          return {
            ...prev,
            loading: false,
            isAuthenticated: import.meta.env.DEV ? true : prev.isAuthenticated,
            roles: import.meta.env.DEV && prev.roles.length === 0 ? ['super_admin'] : prev.roles,
            isRealSuperAdmin: import.meta.env.DEV ? true : prev.isRealSuperAdmin,
          };
        }
        return prev;
      });
    }, 2500);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser(session.user.id, session.user.email ?? null);
      } else {
        if (import.meta.env.DEV) {
          setAuthState(prev => ({
            ...prev,
            loading: false,
          }));
        } else {
          setAuthState({ ...EMPTY_STATE, loading: false });
        }
      }
    });

    return () => {
      clearTimeout(hardTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      localStorage.removeItem('fusc_cached_user_profile');
      // Tentative de déconnexion distante avec protection anti-blocage
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]).catch(() => { });
    } catch (e) {
      console.warn('[PermissionsContext] Erreur signOut Supabase, déconnexion locale appliquée:', e);
    } finally {
      setAuthState({ ...EMPTY_STATE, loading: false });
    }
  };

  const isEffectiveSuperAdmin = (): boolean => {
    const role = authState.user?.system_role?.toLowerCase() || '';
    if (authState.isImpersonating) {
      return authState.impersonatedUser?.system_role?.toLowerCase() === 'super_admin' || role === 'super_admin';
    }
    return role === 'super_admin' || authState.isRealSuperAdmin;
  };

  /**
   * Vérifie l'accès granulaire CRUD à une SOUS-RUBRIQUE :
   * Ex: 'matches', 'official_shortlist', 'arbitres', 'leagues', 'stadiums',
   * 'trainings_calendar', 'trainings_sessions', 'trainings_exercises', 'trainings_evaluations', 'trainings_load',
   * 'players', 'teams', 'opponents', 'staff',
   * 'scouts', 'candidates', 'missions', 'shortlist', 'sessions', 'compare', 'archives', 'media'
   */
  const hasSubModuleAccess = (
    subModule: string,
    action: 'create' | 'read' | 'update' | 'delete' | 'stats' | 'surclasser' | 'departure' | 'drive_link' | string = 'read',
    _parentModule?: string
  ): boolean => {
    // Seul le Super Admin dispose d'un accès total sans configuration explicite
    if (isEffectiveSuperAdmin()) return true;

    const perms = (authState.permissions || []).filter(p => p && p !== 'no_permissions');
    if (perms.length === 0) return false;

    // 1. Clé sous-module explicite : "sub:<subModule>:<action>"
    if (perms.includes(`sub:${subModule}:${action}`)) return true;

    // Alias spécifiques pour la gestion des rapports sur les candidats
    if (subModule === 'candidates' && (action === 'manage_reports' || action === 'reports')) {
      return perms.includes('sub:candidates:manage_reports') || perms.includes('sub:candidates:reports');
    }

    // Actions Métier Spécifiques (Calendrier des Matchs) :
    // Chaque action spécifique doit être STRICTEMENT vérifiée par sa propre clé sub:matches:<action>
    if (subModule === 'matches') {
      if (action === 'plan_match' || action === 'create') {
        return perms.includes('sub:matches:plan_match') || perms.includes('sub:matches:create') || perms.includes('plan_match');
      }
      if (action === 'sync_my_club' || action === 'sync_frmf') {
        return perms.includes('sub:matches:sync_my_club') || perms.includes('sync_my_club');
      }
      if (action === 'import_frmf_sheet' || action === 'import_pdf') {
        return perms.includes('sub:matches:import_frmf_sheet') || perms.includes('import_frmf_sheet');
      }
      if (action === 'manage_match_played' || action === 'prepare_match') {
        return perms.includes('sub:matches:manage_match_played') || perms.includes('manage_match_played');
      }
      if (action === 'live_tracking' || action === 'live_match' || action === 'track_live_match') {
        return perms.includes('sub:matches:live_tracking') || perms.includes('live_tracking');
      }
      if (action === 'manage_standings' || action === 'standings') {
        return perms.includes('sub:matches:manage_standings') || perms.includes('manage_standings');
      }
    }

    // Toute sous-rubrique ou action non explicitement cochée est strictement masquée
    return false;
  };

  /**
   * Vérifie l'accès granulaire CRUD à une grande rubrique métier :
   * 'recruitment_v2' | 'competition' | 'trainings' | 'effectif' | 'media'
   * Action : 'create' | 'read' | 'update' | 'delete' (par défaut : 'read')
   */
  const hasModuleAccess = (module: string, action: 'create' | 'read' | 'update' | 'delete' = 'read'): boolean => {
    if (isEffectiveSuperAdmin()) return true;

    const perms = (authState.permissions || []).filter(p => p && p !== 'no_permissions');
    if (perms.length === 0) return false;

    // Vérifier qu'au moins une sous-rubrique de cette grande rubrique possède la permission requise
    const moduleSubKeys = Object.entries(SUBMODULE_TO_PARENT_MAP)
      .filter(([, parent]) => parent === module)
      .map(([subKey]) => subKey);

    if (moduleSubKeys.length > 0) {
      return moduleSubKeys.some(subKey => hasSubModuleAccess(subKey, action, module));
    }

    // Fallback uniquement pour des modules sans sous-rubrique dans SUBMODULE_TO_PARENT_MAP
    return perms.includes(`${module}:${action}`);
  };

  /**
   * Vérifie une permission globale ou d'action
   */
  const can = (action: string) => {
    const isSuperAdmin = isEffectiveSuperAdmin();
    if (isSuperAdmin) return true;

    // Actions système (Gestion Utilisateurs, Plugins, Audit Logs) STRICTEMENT RÉSERVÉES AU SUPER ADMIN
    if (action === 'manage_users' || action === 'manage_roles' || action === 'view_logs' || action === 'manage_system') {
      return isSuperAdmin;
    }

    const perms = (authState.permissions || []).filter(p => p && p !== 'no_permissions');
    if (perms.includes(action)) return true;

    if (action === 'manage_teams') {
      return hasSubModuleAccess('teams', 'read') || hasSubModuleAccess('teams', 'update');
    }

    if (action === 'create_match' || action === 'plan_match' || action === 'schedule_match') {
      return (
        perms.includes('sub:matches:plan_match') ||
        perms.includes('plan_match') ||
        perms.includes('schedule_match')
      );
    }

    if (action === 'import_frmf_sheet' || action === 'import_pdf') {
      return (
        perms.includes('sub:matches:import_frmf_sheet') ||
        perms.includes('import_frmf_sheet')
      );
    }

    if (action === 'sync_my_club' || action === 'sync_frmf') {
      return (
        perms.includes('sub:matches:sync_my_club') ||
        perms.includes('sync_my_club')
      );
    }

    if (action === 'manage_match_played' || action === 'prepare_match' || action === 'edit_matches') {
      return (
        perms.includes('sub:matches:manage_match_played') ||
        perms.includes('manage_match_played')
      );
    }

    if (action === 'live_tracking' || action === 'live_match' || action === 'track_live_match') {
      return (
        perms.includes('sub:matches:live_tracking') ||
        perms.includes('live_tracking')
      );
    }

    if (action === 'manage_matches') {
      return (
        perms.includes('sub:matches:manage_match_played') ||
        perms.includes('manage_match_played') ||
        hasSubModuleAccess('matches', 'update')
      );
    }

    if (action === 'manage_standings' || action === 'manage_ranking' || action === 'standings') {
      return (
        perms.includes('sub:matches:manage_standings') ||
        perms.includes('manage_standings')
      );
    }

    if (action === 'create_opponent' || action === 'manage_opponents') {
      return (
        perms.includes('sub:matches:manage_standings') ||
        perms.includes('sub:opponents:create') ||
        perms.includes('sub:opponents:update')
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
        const { data, error } = await supabaseAdmin
          .from('user_permissions_overrides')
          .select('permission_id')
          .eq('user_id', targetUser.id);
        if (!error && Array.isArray(data)) {
          perms = data.map(p => p.permission_id);
          try {
            localStorage.setItem(`fusc_user_perms_${targetUser.id}`, JSON.stringify(perms));
          } catch { }
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
          } catch { }
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
