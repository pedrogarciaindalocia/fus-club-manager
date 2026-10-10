import React, { useState, useEffect } from 'react';
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
  Clock
} from 'lucide-react';
import { usePermissions } from '../../context/PermissionsContext';
import { useSessionSecurity } from '../../context/SessionSecurityContext';
import { JOB_BRANCHES, ROLE_LEVELS, type RoleLevel, getRoleConfig } from '../../constants/roles';

export const DevRoleSwitcher: React.FC = () => {
  const { authState, loginAs } = usePermissions();
  const sessionSecurity = useSessionSecurity();

  const isUserActive = sessionSecurity?.isUserActive ?? true;
  const remainingCountdownSeconds = sessionSecurity?.remainingCountdownSeconds ?? 900;

  const currentRole = authState?.user?.system_role || 'super_admin';
  const currentJobTitle = authState?.user?.job_title || '';

  // État local pour le sélecteur (toujours déclaré inconditionnellement en tête de composant)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedBranchKey, setSelectedBranchKey] = useState<string>('scout');
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('Scout');
  const [selectedLevel, setSelectedLevel] = useState<RoleLevel>('manager');

  // Synchroniser avec la session actuelle si possible
  useEffect(() => {
    if (currentRole === 'super_admin') return;

    // Déterminer la branche
    const matchedBranch = JOB_BRANCHES.find(b => 
      currentRole.startsWith(b.key) || 
      (currentJobTitle && b.defaultJobTitles.some(t => t.toLowerCase() === currentJobTitle.toLowerCase()))
    );
    if (matchedBranch) {
      setSelectedBranchKey(matchedBranch.key);
      if (currentJobTitle) setSelectedJobTitle(currentJobTitle);
    }

    // Déterminer le niveau
    if (currentRole.endsWith('_admin') || currentRole === 'admin') setSelectedLevel('admin');
    else if (currentRole.endsWith('_manager') || currentRole === 'manager' || currentRole === 'scout') setSelectedLevel('manager');
    else if (currentRole.endsWith('_editor') || currentRole === 'editor') setSelectedLevel('editor');
    else if (currentRole.endsWith('_user') || currentRole === 'user' || currentRole === 'analyst') setSelectedLevel('user');
  }, [currentRole, currentJobTitle]);

  // Masquer en environnement de production
  if (import.meta.env.MODE === 'production') return null;

  // Restriction stricte de gouvernance : Seul le Super Administrateur a accès à ce fast access
  const isSuperAdminAuthorized = Boolean(
    authState?.isAuthenticated && 
    (authState?.isRealSuperAdmin || authState?.user?.system_role === 'super_admin')
  );

  if (!isSuperAdminAuthorized) {
    return null;
  }

  // Branche active sélectionnée
  const activeBranch = JOB_BRANCHES.find(b => b.key === selectedBranchKey) || JOB_BRANCHES[0];

  // Calcul du code de rôle système
  const computeRoleCode = (branchKey: string, level: RoleLevel): string => {
    if (branchKey === 'scout') {
      return `scout_${level}`;
    }
    if (branchKey === 'admin_staff') {
      if (level === 'admin') return 'admin';
      if (level === 'manager') return 'manager';
      if (level === 'editor') return 'editor';
      return 'user';
    }
    if (branchKey === 'analyst' && level === 'user') {
      return 'analyst';
    }
    // Rôle composé standard
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

  const handleSuperAdmin = () => {
    loginAs('super_admin', 'Directeur Général (Super Admin)');
  };

  const isSuperAdminActive = currentRole === 'super_admin';
  const activeRoleConfig = getRoleConfig(currentRole);

  return (
    <motion.div 
      drag
      dragMomentum={false}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] bg-slate-950/95 backdrop-blur-2xl border border-slate-700/80 p-3.5 sm:p-4 rounded-[1.75rem] shadow-[0_25px_60px_rgba(0,0,0,0.7)] flex flex-col gap-3 w-[340px] sm:w-[380px] text-white cursor-grab active:cursor-grabbing select-none"
    >
      {/* Header Bar */}
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

      {/* Rôle Actif Actuel (Résumé condensé) */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
        <div className="flex items-center gap-2 truncate">
          <div className={`w-2 h-2 rounded-full ${isSuperAdminActive ? 'bg-purple-400' : 'bg-indigo-400'}`} />
          <span className="font-bold text-[11px] text-slate-200 truncate">
            {isSuperAdminActive ? 'Super Administrateur' : activeRoleConfig.label}
          </span>
          {currentJobTitle && !isSuperAdminActive && (
            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
              • {currentJobTitle}
            </span>
          )}
        </div>
        {sessionSecurity.inactivityTimeoutMinutes === 0 ? (
          <span className="text-[9px] font-mono font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 shrink-0 flex items-center gap-1" title="Déconnexion automatique désactivée dans les paramètres">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            TIMEOUT OFF
          </span>
        ) : isUserActive ? (
          <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ACTIF
          </span>
        ) : (
          <span 
            className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 shrink-0 flex items-center gap-1 animate-pulse"
            title={`Délai d'inactivité : ${sessionSecurity.inactivityTimeoutMinutes} min. Décompte d'expiration en cours. Bougez le curseur pour réactiver.`}
          >
            <Clock className="w-2.5 h-2.5 text-amber-400" />
            INACTIF ({Math.floor(remainingCountdownSeconds / 60)}:{(remainingCountdownSeconds % 60).toString().padStart(2, '0')})
          </span>
        )}
      </div>

      {!isCollapsed && (
        <div className="space-y-3 pt-1">
          {/* 0. Accès Direct Super Admin */}
          <div>
            <button
              onClick={handleSuperAdmin}
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

          <div className="flex items-center gap-2">
            <div className="h-[1px] bg-slate-800 flex-1" />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              Ou par Métier & Rôle
            </span>
            <div className="h-[1px] bg-slate-800 flex-1" />
          </div>

          {/* 1. Étape 1 : Choisir l'intitulé de poste / Métier */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
              <span>1. Intitulé de poste / Métier</span>
              <span className="text-[9px] text-indigo-400 font-semibold">{activeBranch.shortLabel}</span>
            </label>
            
            <div className="grid grid-cols-2 gap-1.5">
              {/* Sélecteur de Branche Métier */}
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

              {/* Sélecteur d'intitulé de poste précis */}
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

          {/* 2. Étape 2 : Choisir le Rôle / Niveau de privilège */}
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

          <p className="text-[9px] text-center text-slate-500 leading-tight italic">
            Changer l'intitulé ou le rôle bascule la session instantanément sans rafraîchissement.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default DevRoleSwitcher;
