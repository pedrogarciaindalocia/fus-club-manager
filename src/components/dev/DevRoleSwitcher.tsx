import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, 
  Compass, 
  Briefcase, 
  ShieldCheck, 
  BarChart3, 
  User, 
  ChevronDown, 
  Check, 
  Sparkles,
  Minimize2,
  Maximize2,
  Clock,
  Search,
  Users,
  RotateCcw,
  Shield,
  Layers,
  Filter
} from 'lucide-react';
import { usePermissions } from '../../context/PermissionsContext';
import { useSessionSecurity } from '../../context/SessionSecurityContext';
import { JOB_BRANCHES, ROLE_LEVELS, type RoleLevel, getRoleConfig } from '../../constants/roles';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import type { UserProfile } from '../../types';

interface RealUserItem {
  id: string;
  full_name: string;
  avatar_url: string | null;
  system_role: string;
  job_title: string | null;
  email?: string;
  is_active?: boolean;
}

const KNOWN_USER_JOB_TITLES: Record<string, string> = {
  'admin@fus.com': 'Directeur Général (Super Admin)',
  'y.oughegi@fus.ma': 'Directeur Administratif Du CF',
  'h.benabicha@fus.ma': 'Directeur Technique',
  'm.pires@fus.ma': 'Directeur Technique',
  'elbachirboucba@gmail.com': 'Analyste Vidéo',
  'laabdaouiabdelmajid@gmail.com': 'Analyste Vidéo',
  'em.dahbi@fus.ma': 'Scout (Responsable Recrutement)',
  'a.hajji@fus.ma': 'Scout',
  'hadikayoubpro@gmail.com': 'Scout',
  'arrbaouipro@gmail.com': 'Scout',
  'derdakmohcen4@gmail.com': 'Scout',
  'rawad..hassnaoui@fusc.ma': 'Scout',
  'badr': 'Analyste Vidéo',
  'darkaoui': 'Analyste Vidéo',
  'khalil masrour': 'Analyste Vidéo',
  'imadr boutaraoui': 'Coach',
  'boucba el bachir': 'Analyste Vidéo',
};

const UserAvatar: React.FC<{ url?: string | null; name?: string; size?: number }> = ({ url, name = 'U', size = 32 }) => {
  const [error, setError] = useState(false);
  const initials = useMemo(() => {
    const parts = (name || 'U').trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [name]);

  if (url && !error) {
    return (
      <img
        src={url}
        alt={name}
        onError={() => setError(true)}
        className="rounded-full object-cover shrink-0 ring-1 ring-white/20"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 text-white font-black flex items-center justify-center shrink-0 ring-1 ring-white/20 select-none shadow-sm"
      style={{ width: size, height: size, fontSize: Math.max(10, Math.floor(size * 0.38)) }}
    >
      {initials}
    </div>
  );
};

export const DevRoleSwitcher: React.FC = () => {
  const { authState, loginAs, impersonateUser, resetImpersonation } = usePermissions();
  const sessionSecurity = useSessionSecurity();

  const isUserActive = sessionSecurity?.isUserActive ?? true;
  const remainingCountdownSeconds = sessionSecurity?.remainingCountdownSeconds ?? 900;

  const currentRole = authState?.user?.system_role || 'super_admin';
  const currentJobTitle = authState?.user?.job_title || '';
  const isSuperAdminActive = currentRole === 'super_admin' && !authState?.isImpersonating;

  // Mode d'affichage : 'users' (par utilisateur réel) ou 'roles' (par rôle générique)
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // État pour la sélection d'utilisateur réel
  const [userList, setUserList] = useState<RealUserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // État local pour le sélecteur générique
  const [selectedBranchKey, setSelectedBranchKey] = useState<string>('scout');
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('Scout');
  const [selectedLevel, setSelectedLevel] = useState<RoleLevel>('manager');

  // Charger la liste complète des utilisateurs réels (avec jointure résiliente user_profiles, scouts, staff)
  useEffect(() => {
    let isMounted = true;
    const fetchAllRealUsers = async () => {
      setLoadingUsers(true);
      try {
        const [rpcRes, profRes, scoutsRes, staffRes] = await Promise.all([
          Promise.resolve(supabase.rpc('get_all_users')).catch(() => ({ data: [] })),
          Promise.resolve(
            supabase
              .from('user_profiles')
              .select('id, full_name, avatar_url, system_role, job_title, is_active')
              .order('full_name', { ascending: true })
          ).catch(() => ({ data: [] })),
          Promise.resolve(
            supabase
              .from('scouts')
              .select('id, full_name, photo_url, email, role_title')
              .neq('status', 'inactive')
          ).catch(() => ({ data: [] })),
          Promise.resolve(
            supabase
              .from('staff')
              .select('id, full_name, photo_url, email, role')
          ).catch(() => ({ data: [] }))
        ]);

        const rpcUsers = (rpcRes.data || []) as any[];
        const profiles = (profRes.data || []) as any[];
        const scouts = (scoutsRes.data || []) as any[];
        const staff = (staffRes.data || []) as any[];

        const userMap = new Map<string, RealUserItem>();

        // 1. Initialiser avec get_all_users (authentification sécurisée exhaustive)
        rpcUsers.forEach(u => {
          if (u?.id) {
            userMap.set(u.id, {
              id: u.id,
              full_name: u.full_name || 'Utilisateur',
              avatar_url: u.avatar_url || null,
              system_role: u.system_role || 'user',
              job_title: u.job_title || null,
              email: u.email,
              is_active: u.is_active ?? true,
            });
          }
        });

        // 2. Fusionner avec user_profiles (intitulés de poste réels & avatars)
        profiles.forEach(p => {
          if (p?.id) {
            const existing = userMap.get(p.id);
            if (existing) {
              if (p.full_name && p.full_name !== 'Utilisateur') existing.full_name = p.full_name;
              if (p.job_title) existing.job_title = p.job_title;
              if (p.avatar_url) existing.avatar_url = p.avatar_url;
              if (p.system_role) existing.system_role = p.system_role;
            } else {
              userMap.set(p.id, {
                id: p.id,
                full_name: p.full_name || 'Utilisateur',
                avatar_url: p.avatar_url || null,
                system_role: p.system_role || 'user',
                job_title: p.job_title || null,
                is_active: p.is_active ?? true,
              });
            }
          }
        });

        // 3. Enrichir avec les scouts (photos et intitulés spécifiques)
        scouts.forEach(s => {
          if (s?.id) {
            const scoutPhoto = s.photo_url || s.avatar_url || null;
            const existing = userMap.get(s.id);
            if (existing) {
              if (!existing.avatar_url && scoutPhoto) existing.avatar_url = scoutPhoto;
              if (!existing.job_title && s.role_title) existing.job_title = s.role_title;
              if (s.email && !existing.email) existing.email = s.email;
            } else {
              userMap.set(s.id, {
                id: s.id,
                full_name: s.full_name || 'Scout FUS',
                avatar_url: scoutPhoto,
                system_role: 'scout_manager',
                job_title: s.role_title || 'Scout',
                email: s.email,
                is_active: true,
              });
            }
          }
        });

        // 4. Enrichir avec le staff technique
        staff.forEach(st => {
          if (st?.id) {
            const existing = userMap.get(st.id);
            if (existing) {
              if (!existing.avatar_url && st.photo_url) existing.avatar_url = st.photo_url;
              if (!existing.job_title && st.role) existing.job_title = st.role;
              if (st.email && !existing.email) existing.email = st.email;
            } else {
              userMap.set(st.id, {
                id: st.id,
                full_name: st.full_name || 'Staff FUS',
                avatar_url: st.photo_url || null,
                system_role: 'coach',
                job_title: st.role || 'Staff Technique',
                email: st.email,
                is_active: true,
              });
            }
          }
        });

        // 5. Harmoniser et compléter les intitulés de poste réels
        userMap.forEach(u => {
          const emailKey = (u.email || '').trim().toLowerCase();
          const nameKey = (u.full_name || '').trim().toLowerCase();
          if (!u.job_title || u.job_title === 'Utilisateur' || u.job_title === 'Staff Technique') {
            if (KNOWN_USER_JOB_TITLES[emailKey]) {
              u.job_title = KNOWN_USER_JOB_TITLES[emailKey];
            } else if (KNOWN_USER_JOB_TITLES[nameKey]) {
              u.job_title = KNOWN_USER_JOB_TITLES[nameKey];
            } else if (u.system_role === 'super_admin') {
              u.job_title = 'Directeur Général (Super Admin)';
            } else if (u.system_role.includes('scout')) {
              u.job_title = 'Scout';
            } else if (u.system_role.includes('admin')) {
              u.job_title = 'Administrateur';
            } else if (u.system_role === 'coach') {
              u.job_title = 'Coach';
            } else if (u.system_role === 'manager') {
              u.job_title = 'Manager';
            } else {
              u.job_title = 'Analyste / Collaborateur';
            }
          }
        });

        if (isMounted) {
          setUserList(Array.from(userMap.values()));
        }
      } catch (err) {
        console.warn('[DevRoleSwitcher] fetchAllRealUsers error:', err);
      } finally {
        if (isMounted) setLoadingUsers(false);
      }
    };

    fetchAllRealUsers();
    return () => { isMounted = false; };
  }, []);

  // Synchroniser la branche et le niveau avec la session générique
  useEffect(() => {
    if (currentRole === 'super_admin' && !authState?.isImpersonating) return;

    const matchedBranch = JOB_BRANCHES.find(b => 
      currentRole.startsWith(b.key) || 
      (currentJobTitle && b.defaultJobTitles.some(t => t.toLowerCase() === currentJobTitle.toLowerCase()))
    );
    if (matchedBranch) {
      setSelectedBranchKey(matchedBranch.key);
      if (currentJobTitle) setSelectedJobTitle(currentJobTitle);
    }

    if (currentRole.endsWith('_admin') || currentRole === 'admin') setSelectedLevel('admin');
    else if (currentRole.endsWith('_manager') || currentRole === 'manager' || currentRole === 'scout') setSelectedLevel('manager');
    else if (currentRole.endsWith('_editor') || currentRole === 'editor') setSelectedLevel('editor');
    else if (currentRole.endsWith('_user') || currentRole === 'user' || currentRole === 'analyst') setSelectedLevel('user');
  }, [currentRole, currentJobTitle, authState?.isImpersonating]);

  // Masquer en environnement de production
  if (import.meta.env.MODE === 'production') return null;

  // Restriction stricte : Seul le Super Administrateur a accès
  const isSuperAdminAuthorized = Boolean(
    authState?.isAuthenticated && 
    (authState?.isRealSuperAdmin || authState?.user?.system_role === 'super_admin')
  );

  if (!isSuperAdminAuthorized) {
    return null;
  }

  // Filtrage des utilisateurs selon la recherche
  const filteredUsers = userList.filter(u => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(q) ||
      (u.job_title && u.job_title.toLowerCase().includes(q)) ||
      (u.system_role && u.system_role.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  // Groupement des utilisateurs par catégorie de poste pour la liste déroulante
  const usersByJobGroup = useMemo(() => {
    const groups: Record<string, RealUserItem[]> = {
      '👑 Direction & Administration': [],
      '📹 Analystes Vidéo': [],
      '💼 Direction Technique': [],
      '🎯 Cellule Scouting': [],
      '⚽ Staff & Entraîneurs': [],
      '👥 Autres Collaborateurs': [],
    };

    userList.forEach(u => {
      const title = (u.job_title || '').toLowerCase();
      const role = (u.system_role || '').toLowerCase();

      if (role === 'super_admin' || title.includes('directeur général') || title.includes('directeur administratif')) {
        groups['👑 Direction & Administration'].push(u);
      } else if (title.includes('analyste') || title.includes('video') || title.includes('vidéo')) {
        groups['📹 Analystes Vidéo'].push(u);
      } else if (title.includes('directeur technique')) {
        groups['💼 Direction Technique'].push(u);
      } else if (role.includes('scout') || title.includes('scout') || title.includes('recrutement')) {
        groups['🎯 Cellule Scouting'].push(u);
      } else if (role === 'coach' || title.includes('coach') || title.includes('entraîneur') || title.includes('staff')) {
        groups['⚽ Staff & Entraîneurs'].push(u);
      } else {
        groups['👥 Autres Collaborateurs'].push(u);
      }
    });

    return groups;
  }, [userList]);

  // Gestion du choix d'un utilisateur réel
  const handleSelectRealUser = async (user: RealUserItem) => {
    // 1. Récupération des permissions explicites
    let userPerms: string[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('user_permissions_overrides')
        .select('permission_id')
        .eq('user_id', user.id);
      if (data && data.length > 0) {
        userPerms = data.map(p => p.permission_id);
        try {
          localStorage.setItem(`fusc_user_perms_${user.id}`, JSON.stringify(userPerms));
        } catch {}
      } else {
        const cached = localStorage.getItem(`fusc_user_perms_${user.id}`);
        if (cached) userPerms = JSON.parse(cached);
      }
    } catch {
      const cached = localStorage.getItem(`fusc_user_perms_${user.id}`);
      if (cached) userPerms = JSON.parse(cached);
    }

    // 2. Récupération des catégories
    let userCats: string[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('user_category_assignments')
        .select('category')
        .eq('user_id', user.id);
      if (data && data.length > 0) {
        userCats = data.map(c => c.category);
        try {
          localStorage.setItem(`fusc_user_categories_${user.id}`, JSON.stringify(userCats));
        } catch {}
      } else {
        const cached = localStorage.getItem(`fusc_user_categories_${user.id}`);
        if (cached) userCats = JSON.parse(cached);
      }
    } catch {
      const cached = localStorage.getItem(`fusc_user_categories_${user.id}`);
      if (cached) userCats = JSON.parse(cached);
    }

    await impersonateUser(user as unknown as UserProfile, userPerms, userCats);
  };

  // Réinitialiser vers le Super Admin
  const handleResetToSuperAdmin = () => {
    resetImpersonation();
  };

  // Rôle générique
  const activeBranch = JOB_BRANCHES.find(b => b.key === selectedBranchKey) || JOB_BRANCHES[0];
  const computeRoleCode = (branchKey: string, level: RoleLevel): string => {
    if (branchKey === 'scout') return `scout_${level}`;
    if (branchKey === 'admin_staff') {
      if (level === 'admin') return 'admin';
      if (level === 'manager') return 'manager';
      if (level === 'editor') return 'editor';
      return 'user';
    }
    if (branchKey === 'analyst' && level === 'user') return 'analyst';
    return `${branchKey}_${level}`;
  };

  const handleBranchChange = (branchKey: string) => {
    setSelectedBranchKey(branchKey);
    const branch = JOB_BRANCHES.find(b => b.key === branchKey) || JOB_BRANCHES[0];
    const defaultTitle = branch.defaultJobTitles[0] || branch.label;
    setSelectedJobTitle(defaultTitle);
    const newRole = computeRoleCode(branchKey, selectedLevel);
    loginAs(newRole, defaultTitle);
  };

  const handleJobTitleChange = (title: string) => {
    setSelectedJobTitle(title);
    const roleCode = computeRoleCode(selectedBranchKey, selectedLevel);
    loginAs(roleCode, title);
  };

  const handleLevelSelect = (level: RoleLevel) => {
    setSelectedLevel(level);
    const roleCode = computeRoleCode(selectedBranchKey, level);
    loginAs(roleCode, selectedJobTitle);
  };

  const activeRoleConfig = getRoleConfig(currentRole);
  const activeUser = authState?.user;
  const isImpersonatingActive = Boolean(authState?.isImpersonating && activeUser);
  const explicitPermsCount = authState?.permissions?.length || 0;
  const categoriesCount = authState?.userCategories?.length || 0;

  return (
    <motion.div 
      drag
      dragMomentum={false}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] bg-slate-950/95 backdrop-blur-2xl border border-slate-700/80 p-3.5 sm:p-4 rounded-[1.75rem] shadow-[0_25px_60px_rgba(0,0,0,0.7)] flex flex-col gap-3 w-[350px] sm:w-[410px] text-white cursor-grab active:cursor-grabbing select-none"
    >
      {/* Barre d'en-tête */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isUserActive ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400 animate-ping shadow-[0_0_8px_rgba(251,191,36,0.8)]'}`} />
          <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.18em]">
            Session & Rôle Rapide
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-bold text-slate-500 uppercase">Dev</span>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-5 h-5 rounded-md hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            title={isCollapsed ? 'Déplier' : 'Réduire'}
          >
            {isCollapsed ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Carte Résumé de la Session Actuelle */}
      {isImpersonatingActive ? (
        <div className="bg-gradient-to-r from-indigo-950/70 to-purple-950/70 border border-indigo-500/40 rounded-2xl p-2.5 flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar url={activeUser.avatar_url} name={activeUser.full_name || 'Utilisateur'} size={36} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-white truncate max-w-[140px] sm:max-w-[180px]">
                  {activeUser.full_name}
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 shrink-0">
                  {activeRoleConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-300 mt-0.5">
                {activeUser.job_title && (
                  <span className="text-slate-400 truncate max-w-[120px]">{activeUser.job_title} • </span>
                )}
                <span className="text-emerald-400 font-mono text-[9px]">
                  {explicitPermsCount > 0 ? `${explicitPermsCount} perms` : 'Rôle standard'}
                </span>
                {categoriesCount > 0 && (
                  <span className="text-amber-300 text-[9px] font-mono">• {categoriesCount} cats</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleResetToSuperAdmin}
            title="Revenir au Super Admin"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 hover:border-rose-400/40 transition-all shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
          <div className="flex items-center gap-2 truncate">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="font-bold text-[11px] text-slate-200 truncate">
              Super Administrateur (Global)
            </span>
          </div>
          <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ACTIF
          </span>
        </div>
      )}

      {!isCollapsed && (
        <div className="space-y-3 pt-1">
          {/* 0. Bouton Retour Rapide Super Admin */}
          <div>
            <button
              onClick={handleResetToSuperAdmin}
              className={`w-full py-2 px-3 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                isSuperAdminActive
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-400 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-white/5 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>Super Administrateur (Global)</span>
              {isSuperAdminActive && <Check className="w-3.5 h-3.5 ml-auto text-emerald-300" />}
            </button>
          </div>

          {/* Onglets : Par Utilisateur Réel VS Par Rôle / Métier */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'users'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>Par Utilisateur</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'roles'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3 h-3" />
              <span>Par Métier & Rôle</span>
            </button>
          </div>

          {/* CONTENU ONGLET 1 : PAR UTILISATEUR RÉEL (Nom & Photo) */}
          {activeTab === 'users' && (
            <div className="space-y-2.5">
              {/* 1. Liste Déroulante des utilisateurs (comme dans Gestion des Utilisateurs) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider px-0.5">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Users className="w-3 h-3 text-indigo-400" />
                    Liste Déroulante des Utilisateurs
                  </span>
                  <span className="text-indigo-400 font-extrabold">{userList.length} profils</span>
                </div>
                <select
                  value={authState?.isImpersonating && authState?.user?.id ? authState.user.id : ''}
                  onChange={(e) => {
                    const u = userList.find(item => item.id === e.target.value);
                    if (u) handleSelectRealUser(u);
                  }}
                  className="w-full bg-slate-900 border border-indigo-500/50 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 cursor-pointer font-bold shadow-md shadow-indigo-950/40"
                >
                  <option value="">-- Choisir un utilisateur ({userList.length}) --</option>
                  {Object.entries(usersByJobGroup).map(([groupName, groupUsers]) => {
                    if (groupUsers.length === 0) return null;
                    return (
                      <optgroup key={groupName} label={groupName} className="bg-slate-900 text-slate-300 font-bold">
                        {groupUsers.map(u => (
                          <option key={u.id} value={u.id} className="text-white bg-slate-900 font-medium py-1">
                            {u.full_name} — {u.job_title || u.system_role}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              {/* Séparateur élégant "OU RECHERCHE RAPIDE" */}
              <div className="flex items-center gap-2 pt-0.5">
                <div className="h-px bg-slate-800 flex-1" />
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">ou par recherche rapide</span>
                <div className="h-px bg-slate-800 flex-1" />
              </div>

              {/* 2. Barre de recherche d'utilisateur */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Filtrer par nom (ex: bachir), poste..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              {/* 3. Liste des profils avec photo et détails */}
              <div className="max-h-[190px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {loadingUsers ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    Chargement des profils...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500 italic">
                    Aucun utilisateur trouvé
                  </div>
                ) : (
                  filteredUsers.map(user => {
                    const isSelected = authState?.user?.id === user.id && authState?.isImpersonating;
                    const roleCfg = getRoleConfig(user.system_role);

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectRealUser(user)}
                        className={`w-full text-left p-2 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? 'bg-indigo-600/30 border-indigo-400/80 shadow-md shadow-indigo-500/20'
                            : 'bg-slate-900/70 border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar url={user.avatar_url} name={user.full_name} size={30} />
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-200 truncate flex items-center gap-1.5">
                              <span className="truncate">{user.full_name}</span>
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                              <span className="text-indigo-400 font-semibold">{roleCfg.label}</span>
                              {user.job_title && <span>• {user.job_title}</span>}
                            </div>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
                            SIMULÉ
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-white/5 text-slate-400 hover:text-white shrink-0">
                            Choisir
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* CONTENU ONGLET 2 : PAR MÉTIER & RÔLE GÉNÉRIQUE */}
          {activeTab === 'roles' && (
            <div className="space-y-3">
              {/* 1. Intitulé de poste / Métier */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                  <span>1. Intitulé de poste / Métier</span>
                  <span className="text-[9px] text-indigo-400 font-semibold">{activeBranch.shortLabel}</span>
                </label>
                
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={selectedBranchKey}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    className="col-span-1 bg-slate-900 border border-slate-700 text-white text-[11px] font-bold rounded-xl px-2.5 py-2 outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {JOB_BRANCHES.map(branch => (
                      <option key={branch.key} value={branch.key} className="bg-slate-900 text-white">
                        {branch.shortLabel} — {branch.label.split('&')[0].trim()}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedJobTitle}
                    onChange={(e) => handleJobTitleChange(e.target.value)}
                    className="col-span-1 bg-slate-900 border border-slate-700 text-white text-[11px] font-semibold rounded-xl px-2.5 py-2 outline-none focus:border-indigo-500 cursor-pointer truncate"
                  >
                    {activeBranch.defaultJobTitles.map(title => (
                      <option key={title} value={title} className="bg-slate-900 text-white">
                        {title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Rôle / Niveau de privilèges */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                  <span>2. Rôle / Niveau de privilèges</span>
                  <span className="text-[9px] text-slate-500 font-semibold">Admin ➔ User</span>
                </label>

                <div className="grid grid-cols-4 gap-1.5">
                  {ROLE_LEVELS.map(lvl => {
                    const targetRoleCode = computeRoleCode(selectedBranchKey, lvl.level);
                    const isSelected = !isSuperAdminActive && (currentRole === targetRoleCode || selectedLevel === lvl.level);

                    return (
                      <button
                        key={lvl.level}
                        type="button"
                        onClick={() => handleLevelSelect(lvl.level)}
                        className={`py-2 px-1.5 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-wide">
                          {lvl.label}
                        </span>
                        <span className="text-[8px] opacity-70 font-medium scale-95">
                          {activeBranch.shortLabel} {lvl.badgeSuffix}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Résumé du rôle calculé */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Rôle attribué :</span>
                <span className="font-bold text-indigo-300 font-mono">
                  {computeRoleCode(selectedBranchKey, selectedLevel)}
                </span>
              </div>
            </div>
          )}

          <p className="text-[9px] text-center text-slate-500 leading-tight italic pt-0.5">
            Choisir un utilisateur ou un rôle filtre instantanément la sidebar et les rubriques selon ses permissions.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default DevRoleSwitcher;
