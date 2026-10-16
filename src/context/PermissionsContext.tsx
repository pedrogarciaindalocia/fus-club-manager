import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const usePermissions = () => {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions doit être utilisé dans un PermissionsProvider");
  return ctx;
};

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
        const { data: catAssignments, error: catErr } = await supabase
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
        const { data: permOverrides } = await supabase
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
    const isSuperAdmin = role === 'super_admin';
    if (isSuperAdmin) return true;

    const perms = authState.permissions || [];

    // 1. Clé sous-module explicite : "sub:<subModule>:<action>"
    const directKey = `sub:${subModule}:${action}`;
    if (perms.includes(directKey)) return true;

    // 1.b Actions métier spécifiques joueur (Statistiques / Surclasser / Sortie-Transfert)
    // et Détection V2 Database (Lien Vidéo Drive) : STRICT — visibles uniquement si cochées explicitement.
    if (subModule === 'players' && ['stats', 'surclasser', 'departure'].includes(action)) {
      return false;
    }
    if (subModule === 'candidates' && ['drive_link'].includes(action)) {
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
      if (role === 'coach') {
        if (subModule.startsWith('trainings_') || subModule === 'matches' || subModule === 'players' || subModule === 'teams') return true;
      }
      if (role.startsWith('scout_')) {
        if (['candidates', 'missions', 'shortlist', 'sessions', 'compare', 'archives'].includes(subModule)) return true;
        if (role === 'scout_admin' && subModule === 'scouts') return true;
      }
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
      if (role === 'coach') {
        if (module === 'trainings' || module === 'competition' || module === 'effectif') return true;
      }
      if (role.startsWith('scout_') && module === 'recruitment_v2') return true;
    }

    return false;
  };

  /**
   * Vérifie une permission globale ou d'action
   */
  const can = (action: string) => {
    const role = authState.user?.system_role?.toLowerCase() || '';
    const isSuperAdmin = role === 'super_admin' || authState.isRealSuperAdmin;
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
    if (action === 'track_live_match') {
      return hasModuleAccess('competition', 'update') || perms.includes('live_tracking');
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
    window.addEventListener('fusc_user_categories_updated', handleCategoriesUpdated);
    return () => {
      window.removeEventListener('fusc_user_categories_updated', handleCategoriesUpdated);
    };
  }, [authState.user?.id]);

  const hasCategoryRestriction = Boolean(authState.userCategories && authState.userCategories.length > 0);
  const allowedCategories = hasCategoryRestriction
    ? authState.userCategories.map(c => normalizeAgeCategory(c))
    : ['U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U21', 'Senior', 'PRO'];

  const canManageCategory = (category: string | null | undefined): boolean => {
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
    const role = authState.user?.system_role?.toLowerCase() || '';
    const isSuperAdmin = role === 'super_admin' || authState.isRealSuperAdmin;
    if (isSuperAdmin || role === 'admin' || role === 'direction') {
      return true;
    }

    // Pour les autres rôles opérationnels sans catégorie assignée : aucun accès arbitraire
    return false;
  };

  const loginAs = (role: string, jobTitle?: string, categories?: string[]) => {
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
      isRealSuperAdmin: prev.isRealSuperAdmin || prev.user?.system_role === 'super_admin',
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
      loginAs
    }}>
      {children}
    </PermissionsContext.Provider>
  );
};
