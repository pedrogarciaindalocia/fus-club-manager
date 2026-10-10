export type SystemRole = 
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'scout'
  | 'scout_admin'
  | 'scout_manager'
  | 'scout_editor'
  | 'scout_user'
  | 'moderator'
  | 'editor'
  | 'support'
  | 'analyst'
  | 'viewer'
  | 'user';

export type RoleLevel = 'admin' | 'manager' | 'editor' | 'user';

export interface SystemRoleDefinition {
  value: string;
  label: string;
  description: string;
  scopeSummary: string;
  badgeClass: string;
  borderClass: string;
  iconName: 'Crown' | 'ShieldCheck' | 'Briefcase' | 'Compass' | 'ShieldAlert' | 'FileEdit' | 'Headphones' | 'BarChart3' | 'User';
}

// -------------------------------------------------------------
// Niveaux d'accès RBAC (de Admin à User)
// -------------------------------------------------------------
export interface RoleLevelDefinition {
  level: RoleLevel;
  label: string;
  badgeSuffix: string;
  scopeSummary: string;
  description: string;
  badgeClass: string;
  iconName: 'Crown' | 'Briefcase' | 'FileEdit' | 'User';
}

export const ROLE_LEVELS: RoleLevelDefinition[] = [
  {
    level: 'admin',
    label: 'Admin',
    badgeSuffix: 'Admin',
    scopeSummary: 'Direction & supervision de la branche',
    description: 'Supervision complète, configuration avancée, validation finale et gestion du personnel du service.',
    badgeClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800',
    iconName: 'Crown'
  },
  {
    level: 'manager',
    label: 'Manager',
    badgeSuffix: 'Manager',
    scopeSummary: 'Gestion opérationnelle & validation',
    description: 'Gestion quotidienne du service, planification, convocations, suivi et coordination opérationnelle.',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
    iconName: 'Briefcase'
  },
  {
    level: 'editor',
    label: 'Editor',
    badgeSuffix: 'Editor',
    scopeSummary: 'Création & saisie des fiches/rapports',
    description: 'Saisie terrain des fiches de détection, rapports d’observation, formulaires et notes techniques.',
    badgeClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800',
    iconName: 'FileEdit'
  },
  {
    level: 'user',
    label: 'User / Viewer',
    badgeSuffix: 'User',
    scopeSummary: 'Consultation & lecture seule',
    description: 'Accès en consultation simple aux dossiers et statistiques de la branche, sans droits de modification.',
    badgeClass: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800',
    iconName: 'User'
  }
];

// -------------------------------------------------------------
// Familles Métiers & Intitulés de Postes
// -------------------------------------------------------------
export interface JobBranchDefinition {
  key: string;
  label: string;
  shortLabel: string;
  iconName: 'Compass' | 'Briefcase' | 'ShieldCheck' | 'BarChart3' | 'User';
  badgeClass: string;
  description: string;
  defaultJobTitles: string[];
}

export const JOB_BRANCHES: JobBranchDefinition[] = [
  {
    key: 'scout',
    label: 'Cellule Détection & Scouting',
    shortLabel: 'Scout',
    iconName: 'Compass',
    badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800',
    description: 'Prospection terrain, fiches candidats, grilles d’observation, planning des tests et Shadow List V2.',
    defaultJobTitles: ['Scout', 'Scout International', 'Scout Régional', 'Responsable Scouting']
  },
  {
    key: 'recruiter',
    label: 'Cellule Recrutement & Négociation',
    shortLabel: 'Recruteur',
    iconName: 'Briefcase',
    badgeClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-300 dark:border-violet-800',
    description: 'Pilotage administratif des dossiers candidats, contacts familles et clubs.',
    defaultJobTitles: ['Recruteur', 'Chargé de Recrutement', 'Directeur du Recrutement']
  },
  {
    key: 'coach',
    label: 'Staff Technique & Entraîneurs',
    shortLabel: 'Coach',
    iconName: 'Briefcase',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
    description: 'Gestion tactique des équipes, séances d’entraînement, compositions et matchs.',
    defaultJobTitles: ['Entraîneur Principal', 'Entraîneur Adjoint', 'Entraîneur des Gardiens', 'Préparateur Physique']
  },
  {
    key: 'medical',
    label: 'Pôle Médical & Santé',
    shortLabel: 'Médical',
    iconName: 'ShieldCheck',
    badgeClass: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-300 dark:border-teal-800',
    description: 'Dossiers médicaux, suivi des blessures, bilans physiques et indisponibilités.',
    defaultJobTitles: ['Médecin', 'Kinésithérapeute', 'Infirmier', 'Ostéopathe']
  },
  {
    key: 'analyst',
    label: 'Analyse Vidéo & Data Sportive',
    shortLabel: 'Analyste',
    iconName: 'BarChart3',
    badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800',
    description: 'Analyse vidéo, rapports statistiques de match et indicateurs de performance.',
    defaultJobTitles: ['Analyste Vidéo', 'Data Analyst']
  },
  {
    key: 'technical_director',
    label: 'Direction Technique & Académie',
    shortLabel: 'Dir. Tech.',
    iconName: 'Crown',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800',
    description: 'Supervision globale de la méthodologie sportive et transversale U7 à PRO.',
    defaultJobTitles: ['Directeur Technique', 'Responsable Centre de Formation']
  },
  {
    key: 'admin_staff',
    label: 'Administration & Gestion Club',
    shortLabel: 'Staff Club',
    iconName: 'ShieldCheck',
    badgeClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800',
    description: 'Opérations administratives, gestion logistique et support du club.',
    defaultJobTitles: ['Responsable Administratif', 'Secrétaire Général', 'Chargé de Mission']
  }
];

// -------------------------------------------------------------
// Rôles Systèmes Standards & Prédéfinis
// -------------------------------------------------------------
export const SYSTEM_ROLES_CONFIG: SystemRoleDefinition[] = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    description: 'Accès total, gouvernance suprême des administrateurs et configuration globale du club.',
    scopeSummary: 'Tous les droits & configuration globale',
    badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800',
    borderClass: 'border-purple-500',
    iconName: 'Crown'
  },
  {
    value: 'scout_admin',
    label: 'Scout Admin',
    description: 'Supervision complète de la cellule détection : gestion des fiches, personnel scout et grilles de critères V2.',
    scopeSummary: 'Direction Détection & Recrutement V2',
    badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800',
    borderClass: 'border-purple-500',
    iconName: 'Crown'
  },
  {
    value: 'scout_manager',
    label: 'Scout Manager',
    description: 'Gestion opérationnelle de la détection : pipeline candidats, planification des tests et Shadow List V2.',
    scopeSummary: 'Management Détection & Recrutement V2',
    badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800',
    borderClass: 'border-purple-500',
    iconName: 'Briefcase'
  },
  {
    value: 'scout_editor',
    label: 'Scout Editor',
    description: 'Observateur terrain : création de fiches prospects et saisie des évaluations & rapports de match.',
    scopeSummary: 'Création & Édition Détection V2',
    badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800',
    borderClass: 'border-purple-500',
    iconName: 'FileEdit'
  },
  {
    value: 'scout_user',
    label: 'Scout User',
    description: 'Consultation simple de la base de prospects et de la Shadow List en lecture seule.',
    scopeSummary: 'Consultation Détection V2 (Lecture seule)',
    badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800',
    borderClass: 'border-purple-500',
    iconName: 'User'
  },
  {
    value: 'admin',
    label: 'Admin Club',
    description: 'Gestion générale de la plateforme, des effectifs, des catégories et des utilisateurs.',
    scopeSummary: 'Gestion plateforme & utilisateurs',
    badgeClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800',
    borderClass: 'border-indigo-500',
    iconName: 'ShieldCheck'
  },
  {
    value: 'manager',
    label: 'Manager Club',
    description: 'Gestion d’une équipe, d’un service ou d’un périmètre sportif (catégories assignées).',
    scopeSummary: 'Périmètre équipe / catégories attribuées',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
    borderClass: 'border-emerald-500',
    iconName: 'Briefcase'
  },
  {
    value: 'moderator',
    label: 'Moderator',
    description: 'Contrôle des contenus, commentaires, avis et modération des utilisateurs.',
    scopeSummary: 'Modération & contrôle des contenus',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800',
    borderClass: 'border-amber-500',
    iconName: 'ShieldAlert'
  },
  {
    value: 'editor',
    label: 'Editor',
    description: 'Création et modification des contenus (articles, fiches, feuilles de match, convocations).',
    scopeSummary: 'Création & mise à jour des contenus',
    badgeClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800',
    borderClass: 'border-cyan-500',
    iconName: 'FileEdit'
  },
  {
    value: 'support',
    label: 'Support',
    description: 'Assistance aux utilisateurs, suivi technique et aide sans accès aux fonctions sensibles.',
    scopeSummary: 'Assistance usagers (lecture & support)',
    badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800',
    borderClass: 'border-rose-500',
    iconName: 'Headphones'
  },
  {
    value: 'analyst',
    label: 'Analyst / Viewer',
    description: 'Consultation des données, rapports et statistiques sportives en lecture seule, sans modification.',
    scopeSummary: 'Consultation métriques (lecture seule)',
    badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800',
    borderClass: 'border-slate-500',
    iconName: 'BarChart3'
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Consultation des dossiers, rapports et statistiques en lecture seule, sans modification.',
    scopeSummary: 'Consultation simple (lecture seule)',
    badgeClass: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800',
    borderClass: 'border-zinc-500',
    iconName: 'User'
  },
  {
    value: 'user',
    label: 'User',
    description: 'Accès aux fonctionnalités normales et courantes de l’application selon son profil.',
    scopeSummary: 'Accès utilisateur standard',
    badgeClass: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800',
    borderClass: 'border-zinc-500',
    iconName: 'User'
  }
];

/**
 * Résout dynamiquement la configuration visuelle et fonctionnelle de n'importe quel rôle
 */
export const getRoleConfig = (role?: string | null): SystemRoleDefinition => {
  if (!role) return SYSTEM_ROLES_CONFIG.find(r => r.value === 'user')!;
  const normalized = role.toLowerCase().trim();

  // Alias directs
  if (normalized === 'super_admin') {
    return SYSTEM_ROLES_CONFIG.find(r => r.value === 'super_admin')!;
  }
  if (normalized === 'scout' || normalized === 'scout_manager') {
    return SYSTEM_ROLES_CONFIG.find(r => r.value === 'scout_manager')!;
  }
  if (normalized === 'scout_admin') {
    return SYSTEM_ROLES_CONFIG.find(r => r.value === 'scout_admin')!;
  }
  if (normalized === 'scout_editor') {
    return SYSTEM_ROLES_CONFIG.find(r => r.value === 'scout_editor')!;
  }
  if (normalized === 'scout_user') {
    return SYSTEM_ROLES_CONFIG.find(r => r.value === 'scout_user')!;
  }
  if (normalized === 'viewer') {
    return SYSTEM_ROLES_CONFIG.find(r => r.value === 'viewer') || SYSTEM_ROLES_CONFIG.find(r => r.value === 'analyst')!;
  }
  if (normalized === 'coach' || normalized === 'technical_director') {
    return SYSTEM_ROLES_CONFIG.find(r => r.value === 'manager')!;
  }

  // Détection de rôles composés dynamiques (ex: coach_admin, medical_editor...)
  for (const branch of JOB_BRANCHES) {
    for (const lvl of ROLE_LEVELS) {
      if (normalized === `${branch.key}_${lvl.level}`) {
        return {
          value: normalized,
          label: `${branch.shortLabel} ${lvl.badgeSuffix}`,
          description: `${branch.label} — ${lvl.description}`,
          scopeSummary: `${branch.shortLabel} (${lvl.scopeSummary})`,
          badgeClass: branch.badgeClass,
          borderClass: 'border-primary',
          iconName: lvl.iconName
        };
      }
    }
  }

  const found = SYSTEM_ROLES_CONFIG.find(r => r.value === normalized);
  if (found) return found;

  return {
    value: normalized,
    label: role.replace('_', ' ').toUpperCase(),
    description: 'Rôle personnalisé ou standard',
    scopeSummary: 'Accès configuré',
    badgeClass: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800',
    borderClass: 'border-zinc-500',
    iconName: 'User'
  };
};

/**
 * Détermine si un rôle ou un intitulé correspond à la branche Scout
 */
export const isScoutBranch = (role?: string | null, jobTitle?: string | null): boolean => {
  const normRole = (role || '').toLowerCase().trim();
  const normJob = (jobTitle || '').toLowerCase().trim();
  return normRole.startsWith('scout') || normJob.includes('scout') || normJob.includes('détecteur');
};

/**
 * Liste officielle et stricte des 6 intitulés de postes autorisés dans FUSC
 * Utilisée dans la gestion des utilisateurs et les filtres des logs d'audit.
 */
export const OFFICIAL_JOB_TITLES = [
  'Scout',
  'Analyste Vidéo',
  'Coach',
  'Coach Adjoint',
  'Coach Principal',
  'Directeur Technique'
] as const;

export type OfficialJobTitle = typeof OFFICIAL_JOB_TITLES[number];

