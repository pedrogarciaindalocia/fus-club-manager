import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Client Supabase avec privilèges d'administration pour les surcharges de permissions et gestion utilisateurs
const getAdminSupabase = () => supabaseAdmin;

const DEFAULT_FUS_CLUB_ID = '45642829-a3d7-48de-afdd-3c45a1ced474';

import { usePermissions } from '../../context/PermissionsContext';
import { useClubData } from '../../hooks/useClubData';
import { resolvePreferredViewMode } from '../../utils/viewModePreference';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  UserPlus,
  Search,
  Trash2,
  Edit2,
  Scissors,
  X,
  ShieldCheck,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Camera,
  Upload,
  LayoutGrid,
  List,
  Briefcase,
  Layers,
  Key,
  KeyRound,
  Check,
  Copy,
  MessageCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Sparkles,
  Smartphone,
  LayoutDashboard,
  SlidersHorizontal,
  RotateCcw,
  CheckSquare,
  Square,
  Compass,
  Trophy,
  Dumbbell,
  Users,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  BarChart3,
  ArrowUpCircle,
  Power,
  Video,
  Flame,
  ClipboardList,
  CalendarPlus,
  Calendar,
  Info,
  MapPin,
  Radio,
  RefreshCw,
  FileText,
  PlaySquare
} from 'lucide-react';
import ImageCropperModal from '../../components/ImageCropperModal';
import { FusLogoLoader } from '../../components/ui/FusLogoLoader';
import { AuditLogger } from '../../services/auditLogger';
import { PLAYER_CATEGORIES } from '../../constants';
import { getRoleConfig, OFFICIAL_JOB_TITLES, type OfficialJobTitle } from '../../constants/roles';
import { recruitmentService, generateSecureTempPassword, generateScoutLogin } from '../recruitment_v2/services/recruitmentService';
import { MediaPickerModal } from '../media-management/components/MediaPickerModal';
import defaultClubLogo from '../../assets/fus-logo.png';
import { dispatchMatchPushNotification } from '../../services/pushNotificationSender';

/**
 * Règle métier stricte :
 * Les matchs programmés qui n'ont pas été lancés plus de 24 heures après la date
 * et l'heure prévues du coup d'envoi doivent disparaître de l'espace d'assignation opérateur.
 */
export const isMatchExpiredUnlaunched = (m: {
  status?: string | null;
  match_date?: string | null;
  match_time?: string | null;
}): boolean => {
  if (!m) return false;
  if (m.status === 'live' || m.status === 'finished') return false;
  if (!m.match_date) return false;
  try {
    const timeStr = m.match_time ? m.match_time.slice(0, 5) : '00:00';
    const kickoffMs = new Date(`${m.match_date}T${timeStr}:00`).getTime();
    if (isNaN(kickoffMs)) return false;
    return (Date.now() - kickoffMs) > (24 * 60 * 60 * 1000);
  } catch {
    return false;
  }
};

export interface OperableMatch {
  id: string;
  match_date: string;
  match_time?: string;
  category: string;
  status: string;
  is_home?: boolean;
  homeName: string;
  homeLogo?: string | null;
  awayName: string;
  awayLogo?: string | null;
  stadiumName: string;
  live_operator_id?: string | null;
  live_operator_name?: string | null;
  live_operator_status?: string | null;
  live_operator_acknowledged_at?: string | null;
  homeFormation?: string | null;
  awayFormation?: string | null;
}

interface SystemUser {
  id: string;
  email: string;
  full_name: string | null;
  system_role: string;
  job_title?: string | null;
  is_active: boolean;
  avatar_url?: string | null;
  categories: string[];
  phone_number?: string | null;
  permissions_overrides?: Record<string, boolean>;
}

const SYSTEM_ROLES = [
  { value: 'admin', label: '👑 Administrateur (Admin)', desc: 'Direction & gestion complète de la plateforme' },
  { value: 'manager', label: '⚡ Manager', desc: 'Gestion opérationnelle, création et pilotage métier' },
  { value: 'editor', label: '✍️ Éditeur', desc: 'Saisie et modification des données et fiches' },
  { value: 'viewer', label: '👁️ Viewer', desc: 'Consultation simple en lecture seule' },
  { value: 'super_admin', label: '👑 Super Administrateur (Global)', desc: 'Accès total & gouvernance suprême' }
];

const SCOUT_ROLES = [
  { value: 'scout_admin', label: 'Scout Admin', level: 'Admin', desc: 'Direction & Supervision Détection' },
  { value: 'scout_manager', label: 'Scout Manager', level: 'Manager', desc: 'Gestion opérationnelle & Observation' },
  { value: 'scout_editor', label: 'Scout Editor', level: 'Editor', desc: 'Saisie terrain & Rapports' },
  { value: 'scout_user', label: 'Scout User / Viewer', level: 'User / Viewer', desc: 'Consultation en lecture seule' },
];

export { OFFICIAL_JOB_TITLES };


export interface PermissionDefinition {
  key: string;
  label: string;
  desc: string;
  target: 'mobile' | 'dashboard';
  category: 'match_management' | 'scout_mobile' | 'dashboard_core';
  badge: string;
}

export const MATCH_OPERATION_PERMISSIONS: PermissionDefinition[] = [
  {
    key: 'live_tracking',
    label: 'Live Tracking',
    desc: 'Chronométrage et saisie des événements de match en direct (buts, cartons...)',
    target: 'mobile',
    category: 'match_management',
    badge: 'Live'
  },
  {
    key: 'modify_match',
    label: 'Modification des matchs',
    desc: 'Mettre à jour le score, les titulaires, remplaçants et détails de match',
    target: 'mobile',
    category: 'match_management',
    badge: 'Feuille'
  },
  {
    key: 'change_formation',
    label: 'Changement du système de jeu',
    desc: 'Ajuster le schéma tactique (4-3-3, 3-5-2...) en direct sur le terrain',
    target: 'mobile',
    category: 'match_management',
    badge: 'Tactique'
  },
  {
    key: 'postpone_match',
    label: 'Reporter un match',
    desc: 'Déclarer un report ou une suspension de match',
    target: 'mobile',
    category: 'match_management',
    badge: 'Statut'
  },
  {
    key: 'evaluate_players',
    label: 'Évaluation des joueurs',
    desc: 'Notes individuelles et bilans techniques d\'après-match',
    target: 'mobile',
    category: 'match_management',
    badge: 'Éval'
  }
];

export const MATCH_GLOBAL_PLANNING_PERMISSIONS: PermissionDefinition[] = [
  {
    key: 'schedule_match',
    label: 'Planification des matchs',
    desc: 'Créer, fixer les dates et horaires des rencontres officielles et amicales (/matches/new)',
    target: 'mobile',
    category: 'match_management',
    badge: 'Planning'
  }
];

export const MATCH_MOBILE_PERMISSIONS: PermissionDefinition[] = [
  ...MATCH_GLOBAL_PLANNING_PERMISSIONS,
  ...MATCH_OPERATION_PERMISSIONS
];

export const SCOUT_MOBILE_PERMISSIONS: PermissionDefinition[] = [
  {
    key: 'scout_add_player',
    label: 'Création de fiche joueur',
    desc: 'Créer de nouveaux profils de joueurs prospects observés sur le terrain',
    target: 'mobile',
    category: 'scout_mobile',
    badge: 'Détection'
  },
  {
    key: 'scout_match_report',
    label: 'Rapport d\'observation match',
    desc: 'Rédiger et soumettre des bilans d\'observation en direct de rencontres',
    target: 'mobile',
    category: 'scout_mobile',
    badge: 'Rapport'
  },
  {
    key: 'scout_evaluate_radar',
    label: 'Notation & Radar 4 Piliers',
    desc: 'Évaluer les compétences (Technique, Tactique, Physique, Mental)',
    target: 'mobile',
    category: 'scout_mobile',
    badge: 'Radar'
  },
  {
    key: 'scout_missions',
    label: 'Missions & Ordres de mission',
    desc: 'Consulter les joueurs assignés par la direction et accuser réception',
    target: 'mobile',
    category: 'scout_mobile',
    badge: 'Mission'
  },
  {
    key: 'scout_shortlist_view',
    label: 'Consultation de la Shortlist',
    desc: 'Consulter le vivier des talents et le Onze Idéal de détection',
    target: 'mobile',
    category: 'scout_mobile',
    badge: 'Vivier'
  }
];

export const APP_MOBILE_PERMISSIONS: PermissionDefinition[] = [
  ...MATCH_MOBILE_PERMISSIONS,
  ...SCOUT_MOBILE_PERMISSIONS
];

export interface SubModuleDef {
  id: string;
  title: string;
  badge: string;
  desc: string;
}

export interface DashboardCategoryDef {
  id: 'competition' | 'trainings' | 'effectif' | 'recruitment_v2' | 'media';
  title: string;
  badge: string;
  icon: React.ElementType;
  desc: string;
  colorBorder: string;
  colorBg: string;
  colorBadge: string;
  subModules: SubModuleDef[];
}

export const DASHBOARD_HIERARCHY_MODULES: DashboardCategoryDef[] = [
  {
    id: 'competition',
    title: 'Compétition & Matchs',
    badge: 'Compétition',
    icon: Trophy,
    desc: 'Gestion des matchs, tournois, shortlists tactiques et terrains de jeu',
    colorBorder: 'border-amber-500/30',
    colorBg: 'bg-amber-500/5',
    colorBadge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
    subModules: [
      { id: 'matches', title: 'Calendrier des Matchs', badge: 'Calendrier', desc: 'Gestion et suivi des rencontres officielles et amicales (/matches)' },
      { id: 'matchday', title: 'Match du Jour & Matchs Joués', badge: 'Match du Jour', desc: 'Préparation tactique, feuille de match et suivi direct (/matchday)' },
      { id: 'classement_resultats', title: 'Classement & Résultats FRMF', badge: 'Classement', desc: 'Tableaux officiels et suivi des résultats FRMF (/classement-resultats)' },
      { id: 'championship_performances', title: 'Championnat & Performances', badge: 'Analyse', desc: 'Classement officiel et suivi des performances (/championship-performances)' },
      { id: 'attack_defense', title: 'Adversaires vs Attaque', badge: 'Tactique', desc: 'Comparateur offensif et défensif des adversaires (/championship-performances?tab=attack_defense)' },
      { id: 'official_shortlist', title: 'Shortlist Officielle', badge: 'Tactique', desc: 'Placement tactique et composition officielle (/official-shortlist)' },
      { id: 'arbitres', title: 'Arbitres & Officiels', badge: 'Arbitrage', desc: 'Désignation et suivi des corps arbitraux (/arbitres)' },
      { id: 'leagues', title: 'Compétitions & Ligues', badge: 'Tournois', desc: 'Paramétrage des championnats et coupes (/leagues)' },
      { id: 'stadiums', title: 'Stades & Terrains', badge: 'Infrastructures', desc: 'Gestion des installations sportives (/stadiums)' }
    ]
  },
  {
    id: 'trainings',
    title: 'Entraînements',
    badge: 'Séances',
    icon: Dumbbell,
    desc: 'Planification des séances, bibliothèque d\'exercices et suivi athlétique',
    colorBorder: 'border-blue-500/30',
    colorBg: 'bg-blue-500/5',
    colorBadge: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
    subModules: [
      { id: 'trainings_calendar', title: 'Calendrier des Séances', badge: 'Planning', desc: 'Vue temporelle des séances d\'entraînement (/trainings?tab=calendar)' },
      { id: 'trainings_sessions', title: 'Fiches de Séances', badge: 'Séances', desc: 'Création et déroulé des entraînements (/trainings?tab=sessions)' },
      { id: 'trainings_exercises', title: 'Bibliothèque d\'Exercices', badge: 'Exercices', desc: 'Ateliers techniques et schémas tactiques (/trainings?tab=exercises)' },
      { id: 'trainings_evaluations', title: 'Évaluations des Joueurs', badge: 'Évals', desc: 'Notations et bilans individuels (/trainings?tab=evaluations)' },
      { id: 'trainings_load', title: 'Charge d\'Entraînement', badge: 'Physique', desc: 'Suivi RPE et gestion de la fatigue (/trainings?tab=load)' }
    ]
  },
  {
    id: 'effectif',
    title: 'Effectif & Sportif',
    badge: 'Effectif',
    icon: Users,
    desc: 'Joueurs du club, compositions d\'équipes, adversaires et staff technique',
    colorBorder: 'border-purple-500/30',
    colorBg: 'bg-purple-500/5',
    colorBadge: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
    subModules: [
      { id: 'players', title: 'Joueurs du Club', badge: 'Joueurs', desc: 'Fiches d\'identité sportive des académiciens (/players)' },
      { id: 'teams', title: 'Unités d\'Équipes', badge: 'Équipes', desc: 'Catégories d\'âge et effectifs par équipe (/teams)' },
      { id: 'opponents', title: 'Clubs Adversaires', badge: 'Adversaires', desc: 'Base de données des équipes concurrentes (/opponents)' },
      { id: 'staff', title: 'Staff Technique', badge: 'Staff', desc: 'Encadrement, entraîneurs et préparateurs (/staff)' }
    ]
  },
  {
    id: 'recruitment_v2',
    title: 'Détection & Recrutement V2',
    badge: 'Scouting',
    icon: Compass,
    desc: 'Cellule scouting, vivier de talents, rapports et validation',
    colorBorder: 'border-emerald-500/30',
    colorBg: 'bg-emerald-500/5',
    colorBadge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    subModules: [
      { id: 'scouts', title: 'Personnel & Scouts', badge: 'Cellule', desc: 'Gestion des recruteurs et observateurs (/recruitment-v2?tab=scouts)' },
      { id: 'candidates', title: 'Database & Vivier', badge: 'Candidats', desc: 'Fiches des talents détectés (/recruitment-v2?tab=candidates)' },
      { id: 'missions', title: 'Missions de Détection', badge: 'Missions', desc: 'Ordres de mission et affectations géographiques (/recruitment-v2?tab=missions)' },
      { id: 'shortlist', title: 'Shadow List', badge: 'Shadow', desc: 'Ciblage prioritaire et onze idéal (/recruitment-v2?tab=shortlist)' },
      { id: 'sessions', title: 'Planning des Tests', badge: 'Essais', desc: 'Convocations aux journées de test (/recruitment-v2?tab=sessions)' },
      { id: 'compare', title: 'Comparateur Radar', badge: 'Analyse', desc: 'Comparaisons statistiques multi-joueurs (/recruitment-v2?tab=compare)' },
      { id: 'archives', title: 'Archives de Détection', badge: 'Archives', desc: 'Historique des saisons précédentes (/recruitment-v2?tab=archives)' }
    ]
  },
  {
    id: 'media',
    title: 'Médiathèque & Espace Média',
    badge: 'DAM',
    icon: ImageIcon,
    desc: 'Gestion des images, arborescence de dossiers, téléversement et bucket medias',
    colorBorder: 'border-rose-500/30',
    colorBg: 'bg-rose-500/5',
    colorBadge: 'bg-rose-500/20 text-rose-700 dark:text-rose-300',
    subModules: [
      { id: 'media', title: 'Espace Média (DAM)', badge: 'Médias', desc: 'Arborescence des dossiers, upload et médiathèque centralisée (/media)' }
    ]
  }
];

export const CRUD_ACTIONS: {
  key: 'create' | 'read' | 'update' | 'delete';
  label: string;
  sublabel: string;
  badgeClass: string;
}[] = [
    { key: 'create', label: 'Create', sublabel: 'Créer', badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
    { key: 'read', label: 'Read', sublabel: 'Consulter', badgeClass: 'bg-blue-500/20 text-blue-700 dark:text-blue-300' },
    { key: 'update', label: 'Update', sublabel: 'Modifier', badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300' },
    { key: 'delete', label: 'Delete', sublabel: 'Supprimer', badgeClass: 'bg-rose-500/20 text-rose-700 dark:text-rose-300' }
  ];

export const PLAYER_SPECIFIC_ACTIONS: {
  key: string;
  label: string;
  sublabel: string;
  icon: any;
  badgeClass: string;
}[] = [
    { key: 'stats', label: 'Statistiques', sublabel: 'Consulter & Analyser les Stats', icon: BarChart3, badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
    { key: 'surclasser', label: 'Surclasser', sublabel: 'Surclassement de Catégorie', icon: ArrowUpCircle, badgeClass: 'bg-orange-500/20 text-orange-700 dark:text-orange-300' },
    { key: 'departure', label: 'Sortie / Transfert', sublabel: 'Transfert Club & Libération', icon: X, badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300' },
  ];

export const CANDIDATE_SPECIFIC_ACTIONS: {
  key: string;
  label: string;
  sublabel: string;
  icon: any;
  badgeClass: string;
}[] = [
    { key: 'drive_link', label: 'Lien Vidéo Drive', sublabel: 'Ajouter / Modifier le lien Google Drive', icon: Video, badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
    { key: 'assign_mission', label: 'Assigner une mission', sublabel: 'Assignation de joueur et mission à un scout', icon: UserPlus, badgeClass: 'bg-blue-500/20 text-blue-700 dark:text-blue-300' },
    { key: 'recruit_now', label: 'À recruter immédiatement', sublabel: 'Traitement de la procédure administrative', icon: Flame, badgeClass: 'bg-rose-500/20 text-rose-700 dark:text-rose-300' },
    { key: 'manage_reports', label: 'Gestion de rapport', sublabel: 'Consulter, rédiger et gérer les rapports d\'évaluation', icon: ClipboardList, badgeClass: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' },
    { key: 'edit_player', label: 'Modifier un joueur', sublabel: 'Modifier les informations du joueur', icon: Edit2, badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300' },
  ];

export const MATCH_SPECIFIC_ACTIONS: {
  key: string;
  label: string;
  sublabel: string;
  icon: any;
  badgeClass: string;
}[] = [
    { key: 'plan_match', label: 'Planifier un match', sublabel: 'Planification, programmation et configuration du match (/matches/new)', icon: CalendarPlus, badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300' },
    { key: 'sync_my_club', label: 'Synchroniser My Club (FRMF)', sublabel: 'Synchronisation automatique du calendrier My Club depuis les résultats FRMF', icon: RefreshCw, badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
    { key: 'import_frmf_sheet', label: 'Importer Feuille FRMF (PDF)', sublabel: 'Importation intelligente et reconnaissance OCR des feuilles de match FRMF', icon: FileText, badgeClass: 'bg-rose-500/20 text-rose-700 dark:text-rose-300' },
    { key: 'manage_match_played', label: 'Feuille & Match Joué (Préparation)', sublabel: 'Accès à la préparation du match, composition, consignes et verrouillage', icon: PlaySquare, badgeClass: 'bg-blue-500/20 text-blue-700 dark:text-blue-300' },
    { key: 'live_tracking', label: 'Live Match & Chronomètre', sublabel: 'Gestion du chronomètre en direct, saisie des scores et événements live', icon: Radio, badgeClass: 'bg-red-500/20 text-red-700 dark:text-red-300' },
    { key: 'manage_standings', label: 'Gestion de classement', sublabel: 'Ajouter les clubs adverses et enregistrer leurs résultats pour le classement officiel', icon: Trophy, badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
  ];

export const DASHBOARD_PERMISSIONS: PermissionDefinition[] = [
  ...DASHBOARD_HIERARCHY_MODULES.flatMap(cat =>
    cat.subModules.flatMap(sub =>
      CRUD_ACTIONS.map(action => ({
        key: `sub:${sub.id}:${action.key}`,
        label: `${cat.title} > ${sub.title} (${action.label})`,
        desc: `${action.sublabel} pour ${sub.title}`,
        target: 'dashboard' as const,
        category: 'dashboard_core' as const,
        badge: action.label
      }))
    )
  ),
  ...PLAYER_SPECIFIC_ACTIONS.map(action => ({
    key: `sub:players:${action.key}`,
    label: `Effectif & Sportif > Joueurs du Club (${action.label})`,
    desc: `${action.sublabel} pour les joueurs`,
    target: 'dashboard' as const,
    category: 'dashboard_core' as const,
    badge: action.label
  })),
  ...CANDIDATE_SPECIFIC_ACTIONS.map(action => ({
    key: `sub:candidates:${action.key}`,
    label: `Détection & Recrutement V2 > Database & Vivier (${action.label})`,
    desc: `${action.sublabel} pour les candidats détectés`,
    target: 'dashboard' as const,
    category: 'dashboard_core' as const,
    badge: action.label
  })),
  ...MATCH_SPECIFIC_ACTIONS.map(action => ({
    key: `sub:matches:${action.key}`,
    label: `Compétition & Matchs > Calendrier des Matchs (${action.label})`,
    desc: `${action.sublabel} pour le calendrier`,
    target: 'dashboard' as const,
    category: 'dashboard_core' as const,
    badge: action.label
  })),
  {
    key: 'manage_recruitment',
    label: 'Détection & Recrutement V2 (Legacy)',
    desc: 'Pipeline de détection et fiches talents',
    target: 'dashboard',
    category: 'dashboard_core',
    badge: 'Scouting'
  }
];

const AVAILABLE_PERMISSIONS: PermissionDefinition[] = [
  ...APP_MOBILE_PERMISSIONS,
  ...DASHBOARD_PERMISSIONS
];

const AGE_CATEGORIES = PLAYER_CATEGORIES;

const UserAvatarItem: React.FC<{ user: { full_name?: string | null; avatar_url?: string | null }; size?: 'sm' | 'lg' }> = ({ user, size = 'sm' }) => {
  const [hasError, setHasError] = useState(false);
  const initials = useMemo(() => {
    const name = user.full_name?.trim() || 'U';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [user.full_name]);

  const showPhoto = Boolean(user.avatar_url && !hasError);

  if (size === 'lg') {
    return (
      <div className="w-20 h-20 rounded-2xl overflow-hidden mb-3 shadow-sm ring-2 ring-primary/20 shrink-0 bg-slate-900 text-white flex items-center justify-center font-black text-lg select-none border border-border">
        {showPhoto ? (
          <img
            src={user.avatar_url!}
            alt={user.full_name || ''}
            className="w-full h-full object-cover"
            onError={() => setHasError(true)}
          />
        ) : (
          <span className="tracking-wider">{initials}</span>
        )}
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm overflow-hidden shrink-0 border border-border font-bold text-xs select-none">
      {showPhoto ? (
        <img
          src={user.avatar_url!}
          alt={user.full_name || ''}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="tracking-wider">{initials}</span>
      )}
    </div>
  );
};

const UserPermissionsHoverBadge: React.FC<{ user: SystemUser }> = ({ user }) => {
  const activePermKeys = useMemo(() => {
    return Object.keys(user.permissions_overrides || {}).filter(
      k => k !== 'no_permissions' && user.permissions_overrides?.[k]
    );
  }, [user.permissions_overrides]);

  if (user.system_role === 'super_admin') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold shadow-2xs">
        <span>👑</span>
        <span>Super Admin (Pleins pouvoirs)</span>
      </span>
    );
  }

  if (activePermKeys.length === 0) {
    return (
      <span className="text-xs text-muted-foreground italic font-medium">
        — Aucune rubrique cochée
      </span>
    );
  }

  // Grouper les permissions actives par Rubrique / Sous-rubrique
  const grouped = activePermKeys.reduce((acc, pKey) => {
    const permDef = AVAILABLE_PERMISSIONS.find(ap => ap.key === pKey);
    let sectionTitle = 'Autres Habilitations';
    let subTitle = pKey;
    let actionBadge = permDef?.badge || pKey;
    const isMobile = permDef?.target === 'mobile';

    if (permDef?.label && permDef.label.includes(' > ')) {
      const parts = permDef.label.split(' > ');
      sectionTitle = parts[0];
      const subParts = parts[1].split(' (');
      subTitle = subParts[0];
      actionBadge = subParts[1]?.replace(')', '') || actionBadge;
    } else if (isMobile) {
      sectionTitle = 'Application Mobile (Terrain)';
      subTitle = permDef?.label || pKey;
    }

    if (!acc[sectionTitle]) acc[sectionTitle] = {};
    if (!acc[sectionTitle][subTitle]) acc[sectionTitle][subTitle] = [];
    acc[sectionTitle][subTitle].push({ badge: actionBadge, isMobile });
    return acc;
  }, {} as Record<string, Record<string, { badge: string; isMobile: boolean }[]>>);

  return (
    <div className="relative inline-block group/perm">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all shadow-2xs cursor-pointer group-hover/perm:border-primary group-hover/perm:bg-primary/20"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
        <span>{activePermKeys.length} permission{activePermKeys.length > 1 ? 's' : ''}</span>
        <ChevronDown className="w-3 h-3 opacity-60 group-hover/perm:rotate-180 transition-transform" />
      </button>

      {/* Popover flottant au survol */}
      <div className="absolute left-0 bottom-full mb-2 hidden group-hover/perm:flex flex-col w-72 sm:w-80 p-3.5 bg-card/95 backdrop-blur-md text-card-foreground rounded-2xl border border-border shadow-2xl z-50 animate-in fade-in zoom-in-95 pointer-events-none duration-150">
        <div className="flex items-center justify-between pb-2 border-b border-border mb-2.5">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-xs font-black text-foreground">Habilitations & Accès</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-black">
            {activePermKeys.length} active{activePermKeys.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar text-left">
          {Object.entries(grouped).map(([sectionTitle, subMap]) => (
            <div key={sectionTitle} className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                {sectionTitle}
              </span>
              <div className="space-y-1 pl-2 border-l-2 border-primary/30">
                {Object.entries(subMap).map(([subTitle, actions]) => (
                  <div key={subTitle} className="text-xs">
                    <span className="font-semibold text-foreground text-[11px] block">{subTitle}</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {actions.map((act, i) => (
                        <span
                          key={i}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${act.isMobile
                            ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                            : 'bg-primary/10 text-primary border-primary/20'
                            }`}
                        >
                          {act.isMobile && <span className="mr-0.5">📱</span>}
                          {act.badge}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Composant Interrupteur Physique (Toggle Switch Style iOS / Slider ON-OFF)
const UserStatusToggleSwitch: React.FC<{
  user: SystemUser;
  onToggle: (u: SystemUser) => void;
}> = ({ user, onToggle }) => {
  const isActive = user.is_active !== false;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onToggle(user);
      }}
      className="inline-flex items-center gap-2 cursor-pointer select-none group px-2 py-1 rounded-xl hover:bg-secondary/40 transition-all"
      title={
        isActive
          ? "ACCÈS AUTORISÉ — Cliquer sur le toggle pour basculer en Black-list (Bloquer l'accès)"
          : "BLACK-LISTÉ (Accès bloqué) — Cliquer sur le toggle pour réactiver (Toggle ON) avec toutes les permissions intactes"
      }
    >
      {/* Piste de l'interrupteur coulissant (Track) */}
      <div
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ease-in-out border shadow-inner ${isActive
          ? 'bg-emerald-500 border-emerald-600'
          : 'bg-rose-500 border-rose-600'
          }`}
      >
        {/* Curseur mobile blanc (Bouton Coulissant Knob) */}
        <span
          className={`pointer-events-none inline-flex items-center justify-center h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out my-auto ${isActive ? 'translate-x-5 text-emerald-600 font-extrabold text-[10px]' : 'translate-x-0.5 text-rose-600 font-extrabold text-[10px]'
            }`}
        >
          {isActive ? '✓' : '✕'}
        </span>
      </div>

      {/* Libellé textuel du statut */}
      <span
        className={`text-[11px] font-black uppercase tracking-wider ${isActive
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-rose-600 dark:text-rose-400 font-bold animate-pulse'
          }`}
      >
        {isActive ? 'Accès Autorisé' : 'Black-listé'}
      </span>
    </div>
  );
};

const UserManagement: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'blacklist' ? 'blacklist' : 'all';

  const { authState, can } = usePermissions();
  const { mainClub } = useClubData();
  const preferredViewMode = resolvePreferredViewMode(mainClub, 'grid');
  const currentUserRole = authState?.user?.system_role?.toLowerCase() || '';
  const isSuperAdmin = !authState.isImpersonating && (currentUserRole === 'super_admin');
  const isScoutAdmin = currentUserRole === 'scout_admin';
  const isGlobalAdmin = isSuperAdmin || currentUserRole === 'admin';
  const hasUserManagementAccess = isGlobalAdmin || isScoutAdmin;

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'blacklist'>(initialTab as any);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedJobTitleFilter, setSelectedJobTitleFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(preferredViewMode);

  useEffect(() => {
    setViewMode(preferredViewMode);
  }, [preferredViewMode]);
  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit' | 'view' | 'credentials'>('none');
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [dbErrors, setDbErrors] = useState<string[]>([]);

  // États d'accès rapide & authentification (Mode 'credentials' - Système Scout)
  const [quickCredentialsUser, setQuickCredentialsUser] = useState<SystemUser | null>(null);
  const [quickTempPassword, setQuickTempPassword] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickShowPassword, setQuickShowPassword] = useState(true);
  const [isProvisioningQuick, setIsProvisioningQuick] = useState(false);

  // États de provisioning d'identifiants & WhatsApp (Étape 2)
  const [createdCredentials, setCreatedCredentials] = useState<{
    userId?: string;
    fullName: string;
    login: string;
    tempPassword: string;
    phone?: string;
    roleTitle?: string;
    systemRole?: string;
  } | null>(null);
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [whatsAppPhoneNumber, setWhatsAppPhoneNumber] = useState('');

  const getWhatsAppUrl = (phone: string, message: string) => {
    const cleaned = (phone || '').replace(/[\s\-\(\)]/g, '');
    const digits = cleaned.replace(/^\+/, '');
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  };

  const getWhatsAppUserMessage = (userName: string, login: string, tempPwd: string, jobTitle?: string, systemRole?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fus-club.ma';
    const roleDisplay = jobTitle ? `${jobTitle} (${(systemRole || 'COLLABORATEUR').toUpperCase()})` : ((systemRole || 'COLLABORATEUR').toUpperCase());

    return `Bonjour ${userName},

Bienvenue sur la plateforme officielle du FUS Rabat !
Votre compte ${roleDisplay} a été configuré avec succès par l'Administration du club.

Voici vos identifiants d'accès sécurisés :

🌐 Lien de l'application : ${origin}/login
👤 Identifiant (Login) : ${login}
🔑 Mot de passe temporaire : ${tempPwd}
💼 Rôle / Fonction : ${roleDisplay}

⚠️ Important : Il s'agit d'un mot de passe temporaire. Dès votre première connexion, vous devrez obligatoirement définir votre propre mot de passe personnel pour sécuriser votre compte.

Direction Générale — FUS Rabat`;
  };

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
    system_role: 'admin',
    job_title: '',
    avatar_url: '' as string | null,
    is_active: true,
    categories: [] as string[],
    team_ids: [] as string[],
    permissions_overrides: {} as Record<string, boolean>
  });

  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [mobileAppSubTab, setMobileAppSubTab] = useState<'match' | 'scout'>('match');
  const [operableMatches, setOperableMatches] = useState<OperableMatch[]>([]);
  const [assignedMatchIds, setAssignedMatchIds] = useState<string[]>([]);
  const [matchFilterScope, setMatchFilterScope] = useState<'all' | 'programmed' | 'covered'>('all');
  const [loadingMatches, setLoadingMatches] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchTeams();
    fetchOperableMatches();

    const matchesSub = supabase
      .channel('user-mgmt-matches-sub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchOperableMatches();
      })
      .on('broadcast', { event: 'match_acknowledged' }, () => {
        fetchOperableMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(matchesSub);
    };
  }, []);

  const fetchOperableMatches = async (): Promise<OperableMatch[]> => {
    try {
      setLoadingMatches(true);
      const [matchesRes, clubsRes, stadiumsRes, settingsRes] = await Promise.all([
        supabase
          .from('matches')
          .select('*')
          .order('match_date', { ascending: false }),
        supabase
          .from('clubs')
          .select('id, name, logo_url'),
        supabase
          .from('stadiums')
          .select('id, name'),
        supabase
          .from('settings')
          .select('club_name, logo_url')
          .limit(1)
          .maybeSingle()
      ]);

      const clubsList = clubsRes.data || [];
      const stadiumsList = stadiumsRes.data || [];
      const settingsData = settingsRes.data;

      // Détermination Logo & Nom Officiel FUS
      const mainClubFromList = clubsList.find(c => c.id === DEFAULT_FUS_CLUB_ID);
      const rawMainLogo = settingsData?.logo_url || mainClubFromList?.logo_url;
      const mainClubLogo = (rawMainLogo && rawMainLogo !== 'null' && rawMainLogo.trim() !== '') ? rawMainLogo : defaultClubLogo;
      const mainClubName = settingsData?.club_name || mainClubFromList?.name || 'FUS Rabat';

      const clubsMap = new Map(clubsList.map(c => [c.id, c]));
      const stadiumsMap = new Map(stadiumsList.map(s => [s.id, s.name]));

      const mapped: OperableMatch[] = (matchesRes.data || [])
        .filter((m: any) => !isMatchExpiredUnlaunched(m))
        .map((m: any) => {
        const oppClub = m.opponent_id ? clubsMap.get(m.opponent_id) : null;
        const oppName = oppClub?.name || (m.opponent_id === DEFAULT_FUS_CLUB_ID ? mainClubName : 'Adversaire');
        const oppLogo = (oppClub?.logo_url && oppClub.logo_url !== 'null' && oppClub.logo_url.trim() !== '') ? oppClub.logo_url : null;

        const stadiumName = (m.stadium_id ? stadiumsMap.get(m.stadium_id) : null) || m.location || (m.is_home ? 'Complexe Sportif FUS' : 'Stade Extérieur');

        const homeName = m.is_home ? mainClubName : oppName;
        const homeLogo = m.is_home ? mainClubLogo : oppLogo;
        const awayName = m.is_home ? oppName : mainClubName;
        const awayLogo = m.is_home ? oppLogo : mainClubLogo;

        const resolvedOperatorId = m.live_operator_id || m.lineup?.live_operator?.id || null;
        const resolvedOperatorName = m.live_operator_name || m.lineup?.live_operator?.name || null;
        const resolvedStatus = m.live_operator_status || m.lineup?.live_operator?.status || (m.live_operator_acknowledged_at || m.lineup?.live_operator?.acknowledged_at ? 'acknowledged' : 'pending_ack');
        const resolvedAcknowledgedAt = m.live_operator_acknowledged_at || m.lineup?.live_operator?.acknowledged_at || null;

        const homeFormation = m.is_home ? (m.formation || null) : (m.opponent_formation || null);
        const awayFormation = m.is_home ? (m.opponent_formation || null) : (m.formation || null);

        return {
          id: m.id,
          match_date: m.match_date,
          match_time: m.match_time,
          category: m.category,
          status: m.status,
          is_home: m.is_home,
          homeName,
          homeLogo,
          awayName,
          awayLogo,
          stadiumName,
          live_operator_id: resolvedOperatorId,
          live_operator_name: resolvedOperatorName,
          live_operator_status: resolvedStatus,
          live_operator_acknowledged_at: resolvedAcknowledgedAt,
          homeFormation,
          awayFormation,
        };
      });

      setOperableMatches(mapped);
      return mapped;
    } catch (err) {
      console.warn('[UserManagement] Erreur chargement matchs opérables:', err);
      return [];
    } finally {
      setLoadingMatches(false);
    }
  };

  const toggleAssignMatch = (matchId: string) => {
    if (modalMode === 'view') return;
    setAssignedMatchIds(prev =>
      prev.includes(matchId) ? prev.filter(id => id !== matchId) : [...prev, matchId]
    );
  };

  const fetchTeams = async () => {
    try {
      const { data } = await supabase.from('teams').select('id, name, category');
      if (data) setAvailableTeams(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleUserActive = async (u: SystemUser) => {
    const newStatus = u.is_active === false;
    try {
      const adminClient = getAdminSupabase();
      const { error } = await adminClient
        .from('user_profiles')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', u.id);

      if (error) throw error;

      setUsers(prev => prev.map(item => item.id === u.id ? { ...item, is_active: newStatus } : item));
      if (newStatus) {
        toast.success(`Accès de ${u.full_name || u.email} réactivé avec TOUTES ses permissions intactes !`);
      } else {
        toast.warning(`Compte ${u.full_name || u.email} mis en Black-list (Accès suspendu).`);
      }
    } catch (e: any) {
      console.error('Erreur changement statut:', e);
      toast.error("Impossible de modifier le statut de l'utilisateur.");
    }
  };

  const filteredUsers = users.filter(u => {
    // 1. Filtrage statut (tous / actifs / blacklist)
    if (selectedStatusFilter === 'active' && u.is_active === false) return false;
    if (selectedStatusFilter === 'blacklist' && u.is_active !== false) return false;

    // 2. Filtrage par rôle sélectionné
    if (selectedRoleFilter !== 'all') {
      const roleStr = (u.system_role || '').toLowerCase();
      const titleStr = (u.job_title || '').toLowerCase();
      if (selectedRoleFilter === 'scout') {
        const isScout = roleStr.startsWith('scout_') ||
          titleStr.includes('scout') ||
          titleStr.includes('détection') ||
          titleStr.includes('detection') ||
          titleStr.includes('recrutement') ||
          titleStr.includes('observateur');
        if (!isScout) return false;
      } else if (selectedRoleFilter === 'admin') {
        const isAdmin = roleStr === 'admin' || roleStr === 'super_admin' || roleStr === 'scout_admin';
        if (!isAdmin) return false;
      } else if (selectedRoleFilter === 'staff') {
        const isStaff = !roleStr.startsWith('scout_') && roleStr !== 'admin' && roleStr !== 'super_admin';
        if (!isStaff) return false;
      }
    } else if (isScoutAdmin && !isGlobalAdmin) {
      // Pour un scout_admin strict sans accès global, filtrer uniquement par défaut
      const roleStr = (u.system_role || '').toLowerCase();
      const titleStr = (u.job_title || '').toLowerCase();
      const isScout = roleStr.startsWith('scout_') ||
        titleStr.includes('scout') ||
        titleStr.includes('détection') ||
        titleStr.includes('detection') ||
        titleStr.includes('recrutement') ||
        titleStr.includes('observateur') ||
        roleStr === 'admin' ||
        roleStr === 'super_admin';
      if (!isScout) return false;
    }

    // 3. Filtrage par intitulé de poste
    if (selectedJobTitleFilter !== 'all') {
      if (selectedJobTitleFilter === 'none') {
        if (u.job_title && u.job_title.trim().length > 0) return false;
      } else {
        const userTitle = (u.job_title || '').trim().toLowerCase();
        if (userTitle !== selectedJobTitleFilter.trim().toLowerCase()) return false;
      }
    }

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (u.full_name || '').toLowerCase().includes(searchLower) ||
      (u.email || '').toLowerCase().includes(searchLower) ||
      (u.job_title || '').toLowerCase().includes(searchLower);
    const matchesCategory = selectedCategoryFilter === 'all'
      || (selectedCategoryFilter === 'global' && (!u.categories || u.categories.length === 0))
      || (u.categories && u.categories.includes(selectedCategoryFilter));
    return matchesSearch && matchesCategory;
  });

  const { availableJobTitles, jobTitleCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    let noneCount = 0;

    users.forEach(u => {
      const title = (u.job_title || '').trim();
      if (!title) {
        noneCount++;
      } else {
        const lower = title.toLowerCase();
        counts[lower] = (counts[lower] || 0) + 1;
      }
    });

    const userTitles = users
      .map(u => u.job_title?.trim())
      .filter((title): title is string => Boolean(title && title.length > 0));

    // Fusionner les titres affectés et les 6 postes officiels
    const combined = [...OFFICIAL_JOB_TITLES, ...userTitles];
    const uniqueMap = new Map<string, string>();
    combined.forEach(t => {
      const lower = t.toLowerCase();
      if (!uniqueMap.has(lower)) {
        uniqueMap.set(lower, t);
      }
    });

    const sortedTitles = Array.from(uniqueMap.values()).sort((a, b) => a.localeCompare(b));

    return {
      availableJobTitles: sortedTitles,
      jobTitleCounts: { counts, noneCount }
    };
  }, [users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const adminClient = getAdminSupabase();

      // 1. Récupération des utilisateurs avec leurs emails réels via get_all_users
      let rpcUsers: any[] = [];
      try {
        const { data, error: rpcErr } = await adminClient.rpc('get_all_users');
        if (!rpcErr && data && data.length > 0) {
          rpcUsers = data;
        }
      } catch (e) {
        console.warn('[UserManagement] RPC get_all_users warning:', e);
      }

      // 2. Récupération des profils et des sessions directement pour garantir l'exhaustivité
      let dbProfiles: any[] = [];
      let dbSessions: any[] = [];
      let dbStaff: any[] = [];
      try {
        const [pRes, sRes, stRes] = await Promise.all([
          adminClient.from('user_profiles').select('id, full_name, avatar_url, system_role, is_active, job_title, phone_number, default_club_id'),
          adminClient.from('user_sessions').select('user_id, user_email, user_role'),
          adminClient.from('staff').select('id, full_name, photo_url, role, email')
        ]);
        if (!pRes.error && pRes.data) dbProfiles = pRes.data;
        if (!sRes.error && sRes.data) dbSessions = sRes.data;
        if (!stRes.error && stRes.data) dbStaff = stRes.data;
      } catch (pEx) {
        console.warn('[UserManagement] DB query notice:', pEx);
      }

      // 3. Fusion unifiée par ID en conservant impérativement l'adresse email réelle issue de auth.users / RPC / sessions
      const profileMap = new Map<string, any>();
      dbProfiles.forEach((p: any) => {
        if (p?.id) profileMap.set(p.id, p);
      });

      const rpcUserMap = new Map<string, any>();
      rpcUsers.forEach((u: any) => {
        if (u?.id) rpcUserMap.set(u.id, u);
      });

      const sessionUserMap = new Map<string, any>();
      dbSessions.forEach((s: any) => {
        if (s?.user_id && s.user_email && s.user_email !== 'invite@fus.ma') {
          sessionUserMap.set(s.user_id, s);
        }
      });

      // 4. Indexer les métadonnées étendues
      const avatarMap = new Map<string, string>();
      const jobTitleMap = new Map<string, string>();
      const phoneMap = new Map<string, string>();

      dbProfiles.forEach((p: any) => {
        if (p?.id) {
          if (p.avatar_url) avatarMap.set(p.id, p.avatar_url);
          if (p.job_title) jobTitleMap.set(p.id, p.job_title);
          if (p.phone_number) phoneMap.set(p.id, p.phone_number);
        }
      });

      // 5. Récupérer les catégories et permissions sans restriction RLS
      let catAssignments: any[] = [];
      try {
        const { data: catData, error: catError } = await adminClient
          .from('user_category_assignments')
          .select('*');
        if (!catError && catData) catAssignments = catData;
      } catch (catEx) {
        console.warn('[UserManagement] Category assignments query warning:', catEx);
      }

      let permAssignments: any[] = [];
      try {
        const { data: permData, error: permError } = await adminClient
          .from('user_permissions_overrides')
          .select('*');
        if (!permError && permData) permAssignments = permData;
      } catch (permEx) {
        console.warn('[UserManagement] Perm assignments query warning:', permEx);
      }

      // 6. Mappage initial des utilisateurs répertoriés (RPC + Profiles + Sessions)
      const allUserIds = Array.from(new Set([
        ...rpcUsers.map((u: any) => u.id),
        ...dbProfiles.map((p: any) => p.id),
        ...dbSessions.map((s: any) => s.user_id).filter(Boolean)
      ]));

      const mappedUsers = allUserIds.map((userId: string) => {
        const rpcUser = rpcUserMap.get(userId);
        const prof = profileMap.get(userId);
        const sess = sessionUserMap.get(userId);

        const userPerms: Record<string, boolean> = {};
        permAssignments?.filter(pa => pa.user_id === userId).forEach(pa => {
          userPerms[pa.permission_id] = true;
        });

        const realEmail = rpcUser?.email || sess?.user_email || (prof?.full_name ? `${prof.full_name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@fusc.ma` : '');

        return {
          id: userId,
          email: realEmail,
          full_name: prof?.full_name || rpcUser?.full_name || 'Utilisateur',
          avatar_url: prof?.avatar_url || rpcUser?.avatar_url || avatarMap.get(userId) || null,
          system_role: prof?.system_role || rpcUser?.system_role || 'viewer',
          job_title: prof?.job_title || jobTitleMap.get(userId) || null,
          phone_number: prof?.phone_number || phoneMap.get(userId) || null,
          is_active: prof?.is_active ?? rpcUser?.is_active ?? true,
          categories: (catAssignments?.filter(c => c.user_id === userId).map(c => c.category) || []).length > 0
            ? (catAssignments?.filter(c => c.user_id === userId).map(c => c.category) || [])
            : JSON.parse(localStorage.getItem(`fusc_user_categories_${userId}`) || '[]'),
          permissions_overrides: userPerms
        };
      });

      // 5. Récupération des scouts actifs de la cellule détection (Supabase DB + LocalStorage fallback)
      let activeDbScouts: any[] = [];
      try {
        const { data: dbScouts, error: sErr } = await supabase
          .from('scouts')
          .select('*')
          .neq('status', 'inactive');
        if (!sErr && dbScouts && dbScouts.length > 0) {
          activeDbScouts = dbScouts;
        } else {
          const localScouts = localStorage.getItem('fusc_recruitment_scouts_v2');
          if (localScouts) {
            try {
              const parsed = JSON.parse(localScouts);
              if (Array.isArray(parsed)) activeDbScouts = parsed;
            } catch { }
          }
        }
        activeDbScouts = (activeDbScouts || []).filter((s: any) => s && s.status !== 'inactive');
      } catch (scoutSyncErr) {
        console.warn('[UserManagement] Scout sync query warning:', scoutSyncErr);
      }

      // 6. Indexer les scouts pour synchronisation rapide et enrichissement photo
      const scoutByEmail = new Map<string, any>();
      const scoutById = new Map<string, any>();
      const scoutByName = new Map<string, any>();

      activeDbScouts.forEach((s: any) => {
        if (!s) return;
        if (s.email && typeof s.email === 'string') scoutByEmail.set(s.email.toLowerCase().trim(), s);
        if (s.id) scoutById.set(s.id, s);
        if (s.full_name && typeof s.full_name === 'string') scoutByName.set(s.full_name.toLowerCase().trim(), s);
      });

      // Enrichir tous les utilisateurs avec les photos et détails issus des scouts
      mappedUsers.forEach((u: any) => {
        const emailKey = typeof u.email === 'string' ? u.email.toLowerCase().trim() : '';
        const nameKey = typeof u.full_name === 'string' ? u.full_name.toLowerCase().trim() : '';
        const matchingScout = (emailKey ? scoutByEmail.get(emailKey) : null) ||
          (u.id ? scoutById.get(u.id) : null) ||
          (nameKey ? scoutByName.get(nameKey) : null);

        if (matchingScout) {
          if (matchingScout.photo_url) {
            u.avatar_url = matchingScout.photo_url;
          }
          if (!u.job_title && matchingScout.role_title) {
            u.job_title = matchingScout.role_title;
          }
          if (!u.phone_number && matchingScout.phone) {
            u.phone_number = matchingScout.phone;
          }
          if ((!u.categories || u.categories.length === 0) && matchingScout.assigned_categories) {
            u.categories = matchingScout.assigned_categories;
          }
        }
      });

      // 7. Intégrer les scouts actifs de la cellule détection qui n'ont pas encore de compte utilisateur
      const existingUserIds = new Set(mappedUsers.map((u: any) => u.id));
      const existingEmails = new Set(mappedUsers.map((u: any) => typeof u.email === 'string' ? u.email.toLowerCase().trim() : '').filter(Boolean));
      const existingNames = new Set(mappedUsers.map((u: any) => typeof u.full_name === 'string' ? u.full_name.toLowerCase().trim() : '').filter(Boolean));

      activeDbScouts.forEach((scout: any) => {
        if (!scout) return;
        const sEmail = (typeof scout.email === 'string' && scout.email.trim())
          ? scout.email.trim().toLowerCase()
          : (scout.full_name ? `${scout.full_name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@fusc.ma` : `scout-${scout.id}@fusc.ma`);
        const sName = typeof scout.full_name === 'string' ? scout.full_name.trim().toLowerCase() : '';

        const alreadyInList = existingUserIds.has(scout.id) ||
          (sEmail && existingEmails.has(sEmail)) ||
          (sName && existingNames.has(sName));

        if (!alreadyInList) {
          const roleTitleLower = (scout.role_title || '').toLowerCase();
          const inferredRole = scout.system_role ||
            (roleTitleLower.includes('admin') ? 'scout_admin' :
              roleTitleLower.includes('manager') ? 'scout_manager' :
                roleTitleLower.includes('editor') ? 'scout_editor' :
                  roleTitleLower.includes('user') || roleTitleLower.includes('viewer') ? 'scout_user' : 'scout_editor');

          mappedUsers.push({
            id: scout.id,
            email: scout.email || (scout.full_name ? `${scout.full_name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@fusc.ma` : `scout-${scout.id}@fusc.ma`),
            full_name: scout.full_name || 'Scout',
            avatar_url: scout.photo_url || null,
            system_role: inferredRole,
            job_title: scout.role_title || 'Scout',
            phone_number: scout.phone || null,
            is_active: scout.status !== 'inactive',
            categories: scout.assigned_categories || [],
            permissions_overrides: (() => {
              const sp: Record<string, boolean> = {};
              permAssignments?.filter(pa => pa.user_id === scout.id).forEach(pa => {
                sp[pa.permission_id] = true;
              });
              return sp;
            })()
          });
        }
      });

      // 8. Intégrer les membres du staff technique (Staff) non encore répertoriés
      dbStaff.forEach((st: any) => {
        if (!st) return;
        const stEmail = (typeof st.email === 'string' && st.email.trim())
          ? st.email.trim().toLowerCase()
          : (st.full_name ? `${st.full_name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@fusc.ma` : `staff-${st.id}@fusc.ma`);
        const stName = typeof st.full_name === 'string' ? st.full_name.trim().toLowerCase() : '';

        const alreadyInList = existingUserIds.has(st.id) ||
          (stEmail && existingEmails.has(stEmail)) ||
          (stName && existingNames.has(stName));

        if (!alreadyInList) {
          existingUserIds.add(st.id);
          if (stEmail) existingEmails.add(stEmail);
          mappedUsers.push({
            id: st.id,
            email: st.email || (st.full_name ? `${st.full_name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@fusc.ma` : `staff-${st.id}@fusc.ma`),
            full_name: st.full_name || 'Staff',
            avatar_url: st.photo_url || null,
            system_role: st.role || 'manager',
            job_title: st.role || 'Staff Technique',
            phone_number: null,
            is_active: true,
            categories: [],
            permissions_overrides: {}
          });
        }
      });

      // Retenir l'intégralité des utilisateurs (actifs et inactifs)
      setUsers(mappedUsers);

    } catch (err: any) {
      console.error('[UserManagement] fetchUsers fatal error:', err?.message || err?.code || err);
      toast.error("Erreur de chargement des utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if ((formData.system_role === 'coach' || formData.system_role === 'assistant_coach') && formData.categories.length === 0) {
      toast.error("Vous devez assigner au moins une catégorie pour un coach ou un entraîneur adjoint.");
      return;
    }

    if (!formData.job_title || !formData.job_title.trim()) {
      toast.error("Veuillez sélectionner un intitulé de poste parmi les options officielles.");
      return;
    }

    setIsSubmitting(true);
    try {
      let createdUserId = '';
      // Génération automatique d'un mot de passe temporaire fort si non renseigné
      const finalTempPassword = formData.password?.trim() || generateSecureTempPassword();

      // 1. Provisioning universel des identifiants (auth.users + user_profiles avec mot de passe haché et force_password_change = true)
      try {
        const provRes = await recruitmentService.provisionUserCredentials({
          login: formData.email,
          tempPassword: finalTempPassword,
          fullName: formData.full_name || 'Collaborateur FUS',
          phone: formData.phone_number || undefined,
          systemRole: formData.system_role,
          jobTitle: formData.job_title || undefined
        });
        if (provRes.userId) {
          createdUserId = provRes.userId;
        }
      } catch (provErr) {
        console.warn('[UserManagement] provisionUserCredentials notice:', provErr);
      }

      if (!createdUserId) {
        createdUserId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`;
      }

      // Upload avatar si présent
      let createdAvatarUrl = formData.avatar_url;
      if (avatarFile) {
        try {
          const tempId = createdUserId || `user-${Date.now()}`;
          const fileExt = avatarFile.name.split('.').pop();
          const fileName = `${tempId}-${Math.random()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('staff').upload(fileName, avatarFile);
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('staff').getPublicUrl(fileName);
            createdAvatarUrl = publicUrl;
          }
        } catch (uploadErr) {
          console.warn('[UserManagement] Avatar upload error:', uploadErr);
        }
      }

      // 2. Synchroniser les données dans user_profiles avec les privilèges d'administration
      const adminClient = getAdminSupabase();
      const { error: insertErr } = await adminClient
        .from('user_profiles')
        .upsert({
          id: createdUserId,
          full_name: formData.full_name || 'Collaborateur',
          job_title: formData.job_title || null,
          phone_number: formData.phone_number || null,
          system_role: formData.system_role,
          default_club_id: DEFAULT_FUS_CLUB_ID,
          avatar_url: createdAvatarUrl || null,
          force_password_change: true,
          is_active: formData.is_active !== false
        });
      if (insertErr) {
        console.warn('[UserManagement] user_profiles insert notice:', insertErr.message);
      }

      // 4. Synchronisation Scout dans la table scouts : UNIQUEMENT si l'intitulé de poste est strictement 'Scout'
      const isScout = (formData.job_title || '').trim().toLowerCase() === 'scout';
      if (isScout && createdUserId) {
        try {
          await adminClient.from('scouts').upsert({
            id: createdUserId,
            full_name: formData.full_name || 'Scout FUS',
            email: formData.email,
            phone: formData.phone_number || undefined,
            role_title: 'Scout',
            recruitment_region: 'Rabat-Salé-Kénitra',
            assigned_categories: formData.categories,
            assigned_teams: ['Académie FUS'],
            status: 'active',
            recruited_date: new Date().toISOString().split('T')[0],
            ...(createdAvatarUrl ? { photo_url: createdAvatarUrl } : {})
          });

          const localScoutsRaw = localStorage.getItem('fusc_recruitment_scouts_v2');
          const localScouts = localScoutsRaw ? JSON.parse(localScoutsRaw) : [];
          if (!localScouts.some((s: any) => s.id === createdUserId || s.email === formData.email)) {
            localScouts.push({
              id: createdUserId,
              full_name: formData.full_name || 'Scout FUS',
              email: formData.email,
              phone: formData.phone_number || '',
              role_title: 'Scout',
              recruitment_region: 'Rabat-Salé-Kénitra',
              assigned_categories: formData.categories,
              assigned_teams: ['Académie FUS'],
              status: 'active',
              recruited_date: new Date().toISOString().split('T')[0],
              ...(createdAvatarUrl ? { photo_url: createdAvatarUrl } : {})
            });
            localStorage.setItem('fusc_recruitment_scouts_v2', JSON.stringify(localScouts));
          }
        } catch (scoutErr) {
          console.warn('[UserManagement] Erreur synchronisation table scouts:', scoutErr);
        }
      }

      // 5. Catégories & permissions
      if (createdUserId) {
        if (formData.categories.length > 0) {
          const catInserts = formData.categories.map(cat => ({
            user_id: createdUserId!,
            category: cat,
            club_id: DEFAULT_FUS_CLUB_ID
          }));
          try {
            await adminClient.from('user_category_assignments').insert(catInserts);
          } catch (e) {
            console.warn('Cat notice:', e);
          }
        }
        localStorage.setItem(`fusc_user_categories_${createdUserId}`, JSON.stringify(formData.categories));

        const permsToInsert = Object.keys(formData.permissions_overrides)
          .filter(key => key !== 'no_permissions' && formData.permissions_overrides[key])
          .map(key => ({ user_id: createdUserId!, permission_id: key }));

        // Si aucune permission n'est cochée, insérer un marqueur 'no_permissions' explicite
        if (permsToInsert.length === 0) {
          permsToInsert.push({ user_id: createdUserId!, permission_id: 'no_permissions' });
        }

        try {
          await adminClient.from('user_permissions_overrides').insert(permsToInsert);
          localStorage.setItem(`fusc_user_perms_${createdUserId}`, JSON.stringify(permsToInsert.map(p => p.permission_id)));
        } catch (e) {
          console.warn('Perms notice:', e);
        }

        // 5.5. Synchronisation des matchs assignés pour opérations live
        if (assignedMatchIds.length > 0) {
          try {
            const { data: currentMatches } = await adminClient
              .from('matches')
              .select('id, lineup')
              .in('id', assignedMatchIds);

            const opName = formData.full_name || formData.email;
            const opRole = formData.job_title || formData.system_role || 'Opérateur';
            const opAvatar = createdAvatarUrl || null;

            for (const matchId of assignedMatchIds) {
              const curMatch = (currentMatches || []).find(m => m.id === matchId);
              const curLineup = curMatch?.lineup || {};
              const updatedLineup = {
                ...curLineup,
                live_operator: {
                  id: createdUserId,
                  name: opName,
                  role: opRole,
                  avatar_url: opAvatar,
                }
              };

              const { error: updErr } = await adminClient
                .from('matches')
                .update({
                  live_operator_id: createdUserId,
                  live_operator_name: opName,
                  live_operator_role: opRole,
                  live_operator_avatar_url: opAvatar,
                  lineup: updatedLineup,
                })
                .eq('id', matchId);

              if (updErr) {
                console.error('[UserManagement] Erreur assignation match nouveau compte:', updErr);
              } else {
                try {
                  const foundOperable = operableMatches.find(o => o.id === matchId);
                  const homeName = foundOperable?.homeName || (curMatch?.is_home ? 'FUS Rabat' : 'Adversaire');
                  const awayName = foundOperable?.awayName || (curMatch?.is_home ? 'Adversaire' : 'FUS Rabat');
                  const matchCategory = foundOperable?.category || curMatch?.category || '';
                  const matchDate = foundOperable?.match_date || curMatch?.match_date || '';
                  const matchTime = foundOperable?.match_time || curMatch?.match_time || '';

                  const broadcastPayload = {
                    match_id: matchId,
                    matchId: matchId,
                    category: matchCategory,
                    home_name: homeName,
                    away_name: awayName,
                    match_date: matchDate,
                    match_time: matchTime,
                    operator_id: createdUserId,
                    operator_name: opName,
                    operator_role: opRole,
                    operator_avatar_url: opAvatar,
                  };

                  const assignChannel = supabase.channel('operator-assignments');
                  assignChannel.subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                      await assignChannel.send({
                        type: 'broadcast',
                        event: 'operator_assigned',
                        payload: broadcastPayload,
                      });
                      supabase.removeChannel(assignChannel);
                    }
                  });

                  dispatchMatchPushNotification({
                    match_id: matchId,
                    type: 'operator_assigned',
                    category: matchCategory,
                    operator_id: createdUserId,
                    operator_name: opName,
                    operator_avatar_url: opAvatar,
                    operator_role: opRole,
                    title: `🎙️ Opérateur Match Assigné [${matchCategory || 'FUS'}]`,
                    body: `${opName} a été désigné Opérateur Live pour le match ${homeName} vs ${awayName} le ${matchDate}.`,
                  }).catch(pErr => console.warn('[UserManagement] Erreur push assignation nouveau compte:', pErr));
                } catch (bErr) {
                  console.warn('[UserManagement] Erreur broadcast assignation nouveau compte:', bErr);
                }
              }
            }
            await fetchOperableMatches();
          } catch (mErr) {
            console.warn('[UserManagement] Erreur assignation match nouveau compte:', mErr);
          }
        }
      }

      toast.success("Utilisateur créé avec succès ! Identifiants générés.");
      AuditLogger.logCreate(
        'USERS',
        'USER',
        createdUserId || 'new-user',
        formData,
        `Création du compte utilisateur ${formData.full_name || formData.email} (${formData.system_role})`
      );

      // Bascule automatique vers l'Étape 2 (Restitution des Identifiants & Envoi WhatsApp)
      setCreatedCredentials({
        userId: createdUserId || undefined,
        fullName: formData.full_name || 'Collaborateur FUS',
        login: formData.email,
        tempPassword: finalTempPassword,
        phone: formData.phone_number || '',
        roleTitle: formData.job_title || formData.system_role,
        systemRole: formData.system_role
      });
      setWhatsAppPhoneNumber(formData.phone_number || '');
      setShowTempPassword(false);
      setCopiedField(null);
      setModalStep(2);
      fetchUsers();
    } catch (err: any) {
      console.error('[UserManagement] Exception création:', err);
      toast.error(err.message || "Erreur lors de la création.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    try {
      if (!selectedUserId) return;
      if ((formData.system_role === 'coach' || formData.system_role === 'assistant_coach') && formData.categories.length === 0) {
        toast.error("Vous devez assigner au moins une catégorie pour un coach ou un entraîneur adjoint.");
        return;
      }

      let currentUserId = selectedUserId;

      setIsSubmitting(true);
      const localErrors: string[] = [];
      const adminClient = getAdminSupabase();
      let finalAvatarUrl = formData.avatar_url;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${currentUserId}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('staff').upload(fileName, avatarFile);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('staff').getPublicUrl(fileName);
          finalAvatarUrl = publicUrl;
        }
      }

      // 1. Traitement de la mise à jour du mot de passe si renseigné
      let passwordUpdateSuccess = true;
      const newPassword = formData.password?.trim();
      if (newPassword && newPassword.length > 0) {
        if (newPassword.length < 6) {
          toast.error("Le mot de passe doit contenir au moins 6 caractères.");
          setIsSubmitting(false);
          return;
        }

        try {
          const provRes = await recruitmentService.provisionUserCredentials({
            userId: currentUserId,
            login: formData.email,
            tempPassword: newPassword,
            fullName: formData.full_name || 'Collaborateur FUS',
            phone: formData.phone_number || undefined,
            systemRole: formData.system_role,
            jobTitle: formData.job_title || undefined
          });
          passwordUpdateSuccess = provRes.success;
          if (provRes.userId && provRes.userId !== currentUserId) {
            console.log('[UserManagement] User provisioned with NEW ID:', provRes.userId);
            // Delete the old profile if we are replacing an existing profile that lost its auth user
            if (currentUserId) {
              await adminClient.from('user_profiles').delete().eq('id', currentUserId).catch(() => { });
            }
            // Update currentUserId so subsequent steps use the valid Auth user ID
            currentUserId = provRes.userId;
            setFormData(prev => ({ ...prev, id: provRes.userId }));
          }
        } catch (rpcEx) {
          console.warn('[UserManagement] provisionUserCredentials exception:', rpcEx);
          passwordUpdateSuccess = false;
        }
      }

      // 2. Mise à jour dans auth.users (email, nom, rôle système, et mot de passe si renseigné) via GoTrue Admin
      try {
        const authUpdates: any = {
          user_metadata: {
            full_name: formData.full_name,
            system_role: formData.system_role
          }
        };
        if (formData.email?.trim()) {
          authUpdates.email = formData.email.trim().toLowerCase();
          authUpdates.email_confirm = true;
        }
        if (newPassword && newPassword.length >= 6) {
          authUpdates.password = newPassword;
        }
        // N'appeler auth.admin.updateUserById que si une vraie clé service_role est active dans l'environnement
        // Mise à jour sécurisée via Edge Function serveur (ou client admin si présent)
        try {
          const { error: edgeUpdErr } = await supabase.functions.invoke('create-user', {
            body: {
              action: 'update',
              user_id: currentUserId,
              email: formData.email?.trim().toLowerCase(),
              password: newPassword || undefined,
              full_name: formData.full_name,
              system_role: formData.system_role,
              job_title: formData.job_title,
              phone_number: formData.phone_number,
              club_id: DEFAULT_FUS_CLUB_ID
            }
          });
          if (!edgeUpdErr) {
            passwordUpdateSuccess = true;
          }
        } catch (edgeEx) {
          console.warn('[UserManagement] Edge Function update notice:', edgeEx);
        }
      } catch (authEx) {
        console.warn('[UserManagement] updateUser credentials exception:', authEx);
      }

      // 3. Mise à jour directe dans user_profiles (nom, téléphone, rôle système, intitulé de poste, statut, avatar, club)
      try {
        const { error: profileUpdErr } = await adminClient
          .from('user_profiles')
          .upsert({
            id: currentUserId,
            full_name: formData.full_name,
            phone_number: formData.phone_number || null,
            system_role: formData.system_role,
            job_title: formData.job_title || null,
            default_club_id: DEFAULT_FUS_CLUB_ID,
            is_active: formData.is_active !== false,
            updated_at: new Date().toISOString(),
            ...(finalAvatarUrl ? { avatar_url: finalAvatarUrl } : {})
          });
        if (profileUpdErr) {
          console.error('[UserManagement] Direct user_profiles upsert error:', profileUpdErr);
          localErrors.push(`Profil: ${profileUpdErr.message}`);
        }
      } catch (e: any) {
        console.warn('[UserManagement] Direct user_profiles upsert exception:', e);
        localErrors.push(`Profil exception: ${e?.message || e}`);
      }

      if (newPassword && !passwordUpdateSuccess) {
        toast.error("Profil mis à jour, mais le mot de passe n'a pas pu être modifié. Veuillez vérifier la connexion ou les permissions Supabase.");
      }

      // 4. Synchronisation de la table scouts : UNIQUEMENT si l'intitulé de poste est strictement 'Scout'
      const isScout = (formData.job_title || '').trim().toLowerCase() === 'scout';
      if (isScout) {
        try {
          const { error: scoutSyncErr } = await adminClient.from('scouts').upsert({
            id: currentUserId,
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone_number || undefined,
            role_title: 'Scout',
            recruitment_region: 'Rabat-Salé-Kénitra',
            assigned_categories: formData.categories,
            assigned_teams: ['Académie FUS'],
            status: formData.is_active !== false ? 'active' : 'inactive',
            ...(finalAvatarUrl ? { photo_url: finalAvatarUrl } : {})
          });
          if (scoutSyncErr) {
            console.warn('Scout update sync notice:', scoutSyncErr);
          }

          // Mise à jour synchrone du localStorage scout
          try {
            const localScoutsRaw = localStorage.getItem('fusc_recruitment_scouts_v2');
            if (localScoutsRaw) {
              const localScouts = JSON.parse(localScoutsRaw);
              const idx = localScouts.findIndex((s: any) => s.id === currentUserId || s.email === formData.email);
              if (idx >= 0) {
                localScouts[idx] = {
                  ...localScouts[idx],
                  full_name: formData.full_name,
                  role_title: 'Scout',
                  phone: formData.phone_number || localScouts[idx].phone,
                  assigned_categories: formData.categories,
                  status: formData.is_active !== false ? 'active' : 'inactive',
                  ...(finalAvatarUrl ? { photo_url: finalAvatarUrl } : {})
                };
                localStorage.setItem('fusc_recruitment_scouts_v2', JSON.stringify(localScouts));
              } else {
                localScouts.push({
                  id: currentUserId,
                  full_name: formData.full_name,
                  email: formData.email,
                  phone: formData.phone_number || '',
                  role_title: 'Scout',
                  recruitment_region: 'Rabat-Salé-Kénitra',
                  assigned_categories: formData.categories,
                  assigned_teams: ['Académie FUS'],
                  status: formData.is_active !== false ? 'active' : 'inactive',
                  recruited_date: new Date().toISOString().split('T')[0],
                  ...(finalAvatarUrl ? { photo_url: finalAvatarUrl } : {})
                });
                localStorage.setItem('fusc_recruitment_scouts_v2', JSON.stringify(localScouts));
              }
            }
          } catch { }
        } catch (e) {
          console.warn('Scout update sync exception:', e);
        }
      } else if (currentUserId) {
        // L'utilisateur n'est plus un Scout : nettoyer UNIQUEMENT son entrée dans la table scouts et le cache scout
        // ATTENTION : Ne JAMAIS appeler deleteScout() ici car cela supprimerait le compte utilisateur auth et profile !
        try {
          await adminClient.from('scouts').delete().eq('id', currentUserId);
          if (formData.email) {
            await adminClient.from('scouts').delete().eq('email', formData.email.trim().toLowerCase());
          }
          const localScoutsRaw = localStorage.getItem('fusc_recruitment_scouts_v2');
          if (localScoutsRaw) {
            const arr = JSON.parse(localScoutsRaw);
            const clean = arr.filter((s: any) => s.id !== currentUserId && s.email !== formData.email?.trim().toLowerCase());
            localStorage.setItem('fusc_recruitment_scouts_v2', JSON.stringify(clean));
          }
        } catch (e) {
          console.warn('Scout table cleanup notice:', e);
        }
      }

      // 5. Synchronisation des catégories assignées
      try {
        await adminClient.from('user_category_assignments').delete().eq('user_id', currentUserId);
        if (formData.categories.length > 0) {
          const catInserts = formData.categories.map(cat => ({
            user_id: currentUserId,
            category: cat,
            club_id: DEFAULT_FUS_CLUB_ID
          }));
          const { error: catErr } = await adminClient.from('user_category_assignments').insert(catInserts);
          if (catErr) {
            console.error('[UserManagement] Erreur insertion categories:', catErr);
            localErrors.push(`Catégories: ${catErr.message}`);
          }
        }
        localStorage.setItem(`fusc_user_categories_${currentUserId}`, JSON.stringify(formData.categories));
        window.dispatchEvent(new CustomEvent('fusc_user_categories_updated', {
          detail: {
            userId: currentUserId,
            categories: formData.categories,
          }
        }));
      } catch (catErr: any) {
        console.warn('User categories update notice:', catErr);
      }

      // 6. Synchronisation des permissions accordées
      const { error: delError } = await adminClient.from('user_permissions_overrides').delete().eq('user_id', currentUserId);
      if (delError) {
        console.warn('[UserManagement] Erreur suppression permissions:', delError);
      }

      const permsToInsert = Object.keys(formData.permissions_overrides)
        .filter(key => key !== 'no_permissions' && formData.permissions_overrides[key])
        .map(key => ({ user_id: currentUserId, permission_id: key }));

      // Si aucune permission n'est cochée, insérer un marqueur 'no_permissions' explicite
      if (permsToInsert.length === 0) {
        permsToInsert.push({ user_id: currentUserId, permission_id: 'no_permissions' });
      }

      try {
        const permsList = permsToInsert.map(p => p.permission_id);
        localStorage.setItem(`fusc_user_perms_${currentUserId}`, JSON.stringify(permsList));
        window.dispatchEvent(new CustomEvent('fusc_user_perms_updated', {
          detail: { userId: currentUserId, permissions: permsList }
        }));
      } catch (e) {
        console.warn('LocalStorage permissions cache notice:', e);
      }

      const { error: permError } = await adminClient.from('user_permissions_overrides').insert(permsToInsert);
      if (permError) {
        console.error('[UserManagement] Erreur insertion permissions:', permError);
        localErrors.push(`Permissions: ${permError.message}`);
        toast.error("Les permissions n'ont pas pu être entièrement enregistrées.");
      }

      // 6.5. Synchronisation des matchs assignés pour opérations live (Persistance garantie DB & Lineup)
      try {
        const { data: allCurrentMatches, error: fetchMatchesErr } = await adminClient
          .from('matches')
          .select('*');

        if (!fetchMatchesErr && allCurrentMatches) {
          // 1. Dé-assigner les matchs qui étaient assignés à cet utilisateur mais ne sont plus cochés
          const matchesToUnassign = allCurrentMatches.filter(m => {
            const currentOpId = m.live_operator_id || m.lineup?.live_operator?.id;
            const isAssignedToThisUser = currentOpId && String(currentOpId).toLowerCase() === String(currentUserId).toLowerCase();
            return isAssignedToThisUser && !assignedMatchIds.includes(m.id);
          });

          for (const m of matchesToUnassign) {
            const curLineup = (m.lineup && typeof m.lineup === 'object') ? { ...m.lineup } : {};
            delete curLineup.live_operator;

            const unassignPayload: Record<string, any> = {
              live_operator_id: null,
              live_operator_name: null,
              live_operator_role: null,
              live_operator_avatar_url: null,
              lineup: curLineup,
            };
            if ('live_operator_status' in m) {
              unassignPayload.live_operator_status = null;
              unassignPayload.live_operator_acknowledged_at = null;
            }

            const { error: unassignErr } = await adminClient
              .from('matches')
              .update(unassignPayload)
              .eq('id', m.id);

            if (unassignErr) {
              console.error('[UserManagement] Erreur désassignation match:', m.id, unassignErr);
            }
          }

          // 2. Assigner et persister les matchs cochés
          const opName = formData.full_name || formData.email;
          const opRole = formData.job_title || formData.system_role || 'Opérateur';
          const opAvatar = finalAvatarUrl || formData.avatar_url || null;

          for (const matchId of assignedMatchIds) {
            const targetMatch = allCurrentMatches.find(m => m.id === matchId);
            const curLineup = (targetMatch?.lineup && typeof targetMatch.lineup === 'object') ? { ...targetMatch.lineup } : {};

            const isSameUser = String(targetMatch?.live_operator_id || curLineup?.live_operator?.id).toLowerCase() === String(currentUserId).toLowerCase();
            const existingAck = isSameUser && (targetMatch?.live_operator_acknowledged_at || curLineup?.live_operator?.acknowledged_at);
            const operatorStatus = existingAck ? 'acknowledged' : 'pending_ack';
            const operatorAckAt = existingAck ? (targetMatch?.live_operator_acknowledged_at || curLineup?.live_operator?.acknowledged_at) : null;

            const updatedLineup = {
              ...curLineup,
              live_operator: {
                id: currentUserId,
                name: opName,
                role: opRole,
                avatar_url: opAvatar,
                status: operatorStatus,
                acknowledged_at: operatorAckAt,
              }
            };

            const assignPayload: Record<string, any> = {
              live_operator_id: currentUserId,
              live_operator_name: opName,
              live_operator_role: opRole,
              live_operator_avatar_url: opAvatar,
              lineup: updatedLineup,
            };
            if ('live_operator_status' in (targetMatch || {})) {
              assignPayload.live_operator_status = operatorStatus;
              assignPayload.live_operator_acknowledged_at = operatorAckAt;
            }

            const { error: assignErr } = await adminClient
              .from('matches')
              .update(assignPayload)
              .eq('id', matchId);

            if (assignErr) {
              console.error('[UserManagement] Erreur assignation match:', matchId, assignErr);
            } else {
              // Notification Realtime & Push pour l'Opérateur et l'ensemble du Staff
              try {
                const foundOperable = operableMatches.find(o => o.id === matchId);
                const homeName = foundOperable?.homeName || (targetMatch?.is_home ? 'FUS Rabat' : 'Adversaire');
                const awayName = foundOperable?.awayName || (targetMatch?.is_home ? 'Adversaire' : 'FUS Rabat');
                const matchCategory = foundOperable?.category || targetMatch?.category || '';
                const matchDate = foundOperable?.match_date || targetMatch?.match_date || '';
                const matchTime = foundOperable?.match_time || targetMatch?.match_time || '';

                const broadcastPayload = {
                  match_id: matchId,
                  matchId: matchId,
                  category: matchCategory,
                  home_name: homeName,
                  away_name: awayName,
                  match_date: matchDate,
                  match_time: matchTime,
                  operator_id: currentUserId,
                  operator_name: opName,
                  operator_role: opRole,
                  operator_avatar_url: opAvatar,
                };

                const assignChannel = supabase.channel('operator-assignments');
                assignChannel.subscribe(async (status) => {
                  if (status === 'SUBSCRIBED') {
                    await assignChannel.send({
                      type: 'broadcast',
                      event: 'operator_assigned',
                      payload: broadcastPayload,
                    });
                    supabase.removeChannel(assignChannel);
                  }
                });

                dispatchMatchPushNotification({
                  match_id: matchId,
                  type: 'operator_assigned',
                  category: matchCategory,
                  operator_id: currentUserId,
                  operator_name: opName,
                  operator_avatar_url: opAvatar,
                  operator_role: opRole,
                  title: `🎙️ Opérateur Match Assigné [${matchCategory || 'FUS'}]`,
                  body: `${opName} a été désigné Opérateur Live pour le match ${homeName} vs ${awayName} le ${matchDate}.`,
                }).catch(pErr => console.warn('[UserManagement] Erreur push assignation:', pErr));
              } catch (bErr) {
                console.warn('[UserManagement] Erreur broadcast assignation:', bErr);
              }
            }
          }
        }

        await fetchOperableMatches();
      } catch (mErr) {
        console.warn('[UserManagement] Erreur synchronisation matchs assignés:', mErr);
      }

      setDbErrors(localErrors);

      // 7. Diffusion Realtime pour notification instantanée et déverrouillage à chaud sur l'app mobile
      try {
        const grantedPerms = Object.keys(formData.permissions_overrides).filter(key => formData.permissions_overrides[key]);
        const grantedLabels = grantedPerms.map(k => {
          const def = AVAILABLE_PERMISSIONS.find(p => p.key === k);
          return def ? def.label : k;
        });

        const notifyMessage = grantedLabels.length > 0
          ? `Vous avez désormais accès à : ${grantedLabels.slice(0, 3).join(', ')}${grantedLabels.length > 3 ? '...' : ''}`
          : 'Vos habilitations d\'accès ont été mises à jour.';

        const notifyChannel = supabase.channel(`user-cats-${currentUserId}`);
        notifyChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await notifyChannel.send({
              type: 'broadcast',
              event: 'permissions_updated',
              payload: {
                userId: currentUserId,
                permissions: grantedPerms,
                categories: formData.categories,
                systemRole: formData.system_role,
                message: notifyMessage
              }
            });
            await notifyChannel.send({
              type: 'broadcast',
              event: 'categories_updated',
              payload: {
                userId: currentUserId,
                categories: formData.categories,
                message: notifyMessage
              }
            });
            supabase.removeChannel(notifyChannel);
          }
        });
      } catch (realtimeErr) {
        console.warn('Realtime permission broadcast notice:', realtimeErr);
      }

      // 8. Mise à jour immédiate du state local
      setUsers(prev => prev.map(u => u.id === currentUserId ? {
        ...u,
        email: formData.email.trim().toLowerCase(),
        full_name: formData.full_name,
        phone_number: formData.phone_number || null,
        system_role: formData.system_role,
        job_title: formData.job_title || null,
        categories: formData.categories,
        is_active: formData.is_active !== false,
        permissions_overrides: { ...formData.permissions_overrides },
        ...(finalAvatarUrl ? { avatar_url: finalAvatarUrl } : {})
      } : u));

      if (newPassword && passwordUpdateSuccess) {
        setCreatedCredentials({
          userId: currentUserId,
          fullName: formData.full_name || 'Collaborateur FUS',
          login: formData.email,
          tempPassword: newPassword,
          phone: formData.phone_number || '',
          roleTitle: formData.job_title || formData.system_role,
          systemRole: formData.system_role
        });
        setWhatsAppPhoneNumber(formData.phone_number || '');
        setShowTempPassword(false);
        setCopiedField(null);
        setModalStep(2);
        toast.success("Mot de passe mis à jour ! Vous pouvez le transmettre par WhatsApp.");
      } else {
        toast.success("Utilisateur mis à jour avec succès !");
        setModalMode('none');
      }

      AuditLogger.logUpdate(
        'USERS',
        'USER',
        selectedUserId,
        {},
        formData,
        `Mise à jour du compte utilisateur ${formData.full_name || formData.email}`
      );

      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour.");
    } finally {
      setIsSubmitting(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  };

  const handleDeleteUser = async (id: string, name?: string) => {
    const oldUser = users.find(u => u.id === id);
    const resolvedName = name || oldUser?.full_name || oldUser?.email || 'cet utilisateur';

    // 1. Détecter si l'utilisateur est un scout ou associé à des joueurs (US-DASH-17)
    let assignedCandidatesCount = 0;
    let candidateNames: string[] = [];
    const scoutIdsToRelease: string[] = [id];

    try {
      const allCandidates = await recruitmentService.getCandidates();
      const allScouts = await recruitmentService.getScouts();

      // Trouver si un profil scout correspond par ID, email ou nom
      const matchedScout = allScouts.find(s =>
        s.id === id ||
        (oldUser?.email && s.email && s.email.trim().toLowerCase() === oldUser.email.trim().toLowerCase()) ||
        (oldUser?.full_name && s.full_name && s.full_name.trim().toLowerCase() === oldUser.full_name.trim().toLowerCase())
      );

      if (matchedScout?.id && !scoutIdsToRelease.includes(matchedScout.id)) {
        scoutIdsToRelease.push(matchedScout.id);
      }

      const matchingCandidates = allCandidates.filter(c =>
        (c.assigned_scout_id && scoutIdsToRelease.includes(c.assigned_scout_id)) ||
        (c.active_mission?.assigned_to_id && scoutIdsToRelease.includes(c.active_mission.assigned_to_id)) ||
        (c.recruiter_id && scoutIdsToRelease.includes(c.recruiter_id)) ||
        (c.assigned_scout_name && oldUser?.full_name && c.assigned_scout_name.trim().toLowerCase() === oldUser.full_name.trim().toLowerCase())
      );

      assignedCandidatesCount = matchingCandidates.length;
      candidateNames = matchingCandidates.map(c => `${c.first_name} ${c.last_name}`);
    } catch (checkErr) {
      console.warn('Erreur vérification candidats assignés avant désactivation:', checkErr);
    }

    // 2. Boîte de confirmation avec alerte préventive contextuelle
    let confirmMessage = `Êtes-vous sûr de vouloir supprimer définitivement le compte de ${resolvedName} ?`;
    if (assignedCandidatesCount > 0) {
      const sampleNames = candidateNames.slice(0, 3).join(', ');
      const extraCount = candidateNames.length > 3 ? ` et ${candidateNames.length - 3} autre(s)` : '';
      confirmMessage = `⚠️ ATTENTION : ${resolvedName} est actuellement assigné à ${assignedCandidatesCount} joueur(s) sous observation (${sampleNames}${extraCount}).\n\nEn supprimant ce compte, TOUS ses joueurs seront automatiquement libérés et réintégreront le vivier disponible pour être réassignés à un autre scout existant.\n\nConfirmez-vous la suppression définitive ?`;
    }

    if (!window.confirm(confirmMessage)) return;

    try {
      // 3. Libération automatique en cascade des joueurs et archivage des missions
      let releasedCount = 0;
      try {
        const releaseResult = await recruitmentService.releaseCandidatesByScout(
          scoutIdsToRelease,
          oldUser?.full_name || undefined
        );
        releasedCount = releaseResult.releasedCount;
      } catch (relErr) {
        console.warn('Erreur cascade libération candidats:', relErr);
      }

      // 4. Suppression du compte dans auth.users via Edge Function
      try {
        await supabase.functions.invoke('create-user', {
          body: {
            action: 'delete',
            user_id: id
          }
        });
      } catch (authDelErr) {
        // Non bloquant
      }

      // 5. Suppression définitive dans public.user_profiles
      try {
        await supabase.from('user_profiles').delete().eq('id', id);
        // Fallback marquer inactif au cas où RLS bloque DELETE
        await supabase.from('user_profiles').update({ is_active: false }).eq('id', id);
      } catch (upErr) {
        console.warn('Notice user_profiles delete:', upErr);
      }

      // 6. Suppression définitive dans la table scouts si présent
      try {
        await supabase
          .from('scouts')
          .delete()
          .or(`id.eq.${id}${oldUser?.email ? `,email.eq.${oldUser.email}` : ''}`);

        await supabase
          .from('scouts')
          .update({ status: 'inactive' })
          .or(`id.eq.${id}${oldUser?.email ? `,email.eq.${oldUser.email}` : ''}`);
      } catch (scoutErr) {
        console.warn('Notice scouts table delete:', scoutErr);
      }

      // 7. Nettoyage du cache localStorage des scouts (recruitmentService & fusc_recruitment_scouts_v2)
      try {
        await recruitmentService.deleteScout(id);
        const localRaw = localStorage.getItem('fusc_recruitment_scouts_v2');
        if (localRaw) {
          const arr = JSON.parse(localRaw);
          const clean = arr.filter((s: any) => s.id !== id && (!oldUser?.email || s.email !== oldUser.email));
          localStorage.setItem('fusc_recruitment_scouts_v2', JSON.stringify(clean));
        }
      } catch (lsErr) {
        console.warn('Notice localStorage scout cleanup:', lsErr);
      }

      // 8. Suppression immédiate du state React pour disparition visuelle instantanée
      setUsers(prev => prev.filter(u => u.id !== id && (!oldUser?.email || u.email !== oldUser.email)));

      if (releasedCount > 0) {
        toast.success(`Utilisateur et profil scout supprimés avec succès. ${releasedCount} joueur(s) libéré(s) !`, {
          icon: '🗑️',
          duration: 4000,
        });
      } else {
        toast.success("Utilisateur supprimé définitivement avec succès.");
      }

      AuditLogger.logDelete(
        'USERS',
        'USER',
        id,
        oldUser || null,
        `Suppression définitive du compte utilisateur ${oldUser?.full_name || oldUser?.email || id}${releasedCount > 0 ? ` (${releasedCount} joueur(s) libéré(s))` : ''}`
      );
      fetchUsers();
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      toast.error("Erreur lors de la suppression.");
    }
  };

  const openCredentialsQuickModal = (user: SystemUser) => {
    const generated = generateSecureTempPassword();
    setQuickCredentialsUser(user);
    setQuickTempPassword(generated);
    setQuickPhone(user.phone_number || '');
    setQuickShowPassword(true);
    setSelectedUserId(user.id);
    setModalStep(1);
    setMatchFilterScope('all');
    setCreatedCredentials(null);
    setShowTempPassword(false);
    setCopiedField(null);
    setModalMode('credentials');
  };

  const handleApplyQuickCredentials = async () => {
    if (!quickCredentialsUser || !quickTempPassword.trim()) return;
    setIsProvisioningQuick(true);
    try {
      const cleanPhone = quickPhone.trim();
      const provRes = await recruitmentService.provisionUserCredentials({
        userId: quickCredentialsUser.id,
        login: quickCredentialsUser.email,
        tempPassword: quickTempPassword.trim(),
        fullName: quickCredentialsUser.full_name || quickCredentialsUser.email,
        phone: cleanPhone || undefined,
        jobTitle: quickCredentialsUser.job_title || undefined,
        systemRole: quickCredentialsUser.system_role
      });

      if (cleanPhone && cleanPhone !== quickCredentialsUser.phone_number) {
        await supabase.from('user_profiles').update({ phone_number: cleanPhone }).eq('id', quickCredentialsUser.id);
        setUsers(prev => prev.map(u => u.id === quickCredentialsUser.id ? { ...u, phone_number: cleanPhone } : u));
      }

      setCreatedCredentials({
        userId: quickCredentialsUser.id,
        fullName: quickCredentialsUser.full_name || quickCredentialsUser.email,
        login: quickCredentialsUser.email,
        tempPassword: quickTempPassword.trim(),
        phone: cleanPhone || quickCredentialsUser.phone_number || '',
        roleTitle: quickCredentialsUser.job_title || '',
        systemRole: quickCredentialsUser.system_role
      });
      setWhatsAppPhoneNumber(cleanPhone || quickCredentialsUser.phone_number || '');
      setModalStep(2);
      toast.success("Nouveaux identifiants générés ! Prêts pour transmission WhatsApp.", { icon: '⚡' });
    } catch (err: any) {
      console.error('Erreur provisioning rapide:', err);
      toast.error(err?.message || "Erreur lors de la configuration du mot de passe");
    } finally {
      setIsProvisioningQuick(false);
    }
  };

  const handleOpenCreateModal = () => {
    const generatedPwd = generateSecureTempPassword();
    setFormData({
      email: '',
      password: generatedPwd,
      full_name: '',
      phone_number: '',
      system_role: isScoutAdmin ? 'scout_editor' : 'admin',
      job_title: isScoutAdmin ? 'Scout' : '',
      avatar_url: null,
      is_active: true,
      categories: [],
      team_ids: [],
      permissions_overrides: {}
    });
    setAvatarFile(null);
    setAvatarPreview(null);
    setSelectedUserId(null);
    setAssignedMatchIds([]);
    setMatchFilterScope('all');
    fetchOperableMatches();
    setModalStep(1);
    setMatchFilterScope('all');
    setCreatedCredentials(null);
    setShowTempPassword(false);
    setCopiedField(null);
    setModalMode('create');
  };

  const openEditMode = (user: SystemUser) => {
    setSelectedUserId(user.id);
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name || '',
      phone_number: user.phone_number || '',
      system_role: (user.system_role || 'viewer').toLowerCase(),
      job_title: user.job_title || '',
      avatar_url: user.avatar_url || null,
      is_active: user.is_active !== false,
      categories: user.categories || [],
      team_ids: [],
      permissions_overrides: user.permissions_overrides || {}
    });
    setAvatarFile(null);
    setAvatarPreview(null);
    setDbErrors([]);
    const currentAssigned = operableMatches
      .filter(m => m.live_operator_id && String(m.live_operator_id).toLowerCase() === String(user.id).toLowerCase())
      .map(m => m.id);
    setAssignedMatchIds(currentAssigned);
    fetchOperableMatches().then(matches => {
      const userMatches = matches
        .filter(m => m.live_operator_id && String(m.live_operator_id).toLowerCase() === String(user.id).toLowerCase())
        .map(m => m.id);
      setAssignedMatchIds(userMatches);
    });
    setModalStep(1);
    setMatchFilterScope('all');
    setCreatedCredentials(null);
    setShowTempPassword(false);
    setCopiedField(null);
    setModalMode('edit');
  };

  const openViewMode = (user: SystemUser) => {
    setSelectedUserId(user.id);
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name || '',
      phone_number: user.phone_number || '',
      system_role: (user.system_role || 'viewer').toLowerCase(),
      job_title: user.job_title || '',
      avatar_url: user.avatar_url || null,
      is_active: user.is_active !== false,
      categories: user.categories || [],
      team_ids: [],
      permissions_overrides: user.permissions_overrides || {}
    });
    setAvatarFile(null);
    setAvatarPreview(null);
    const currentAssigned = operableMatches
      .filter(m => m.live_operator_id && String(m.live_operator_id).toLowerCase() === String(user.id).toLowerCase())
      .map(m => m.id);
    setAssignedMatchIds(currentAssigned);
    fetchOperableMatches().then(matches => {
      const userMatches = matches
        .filter(m => m.live_operator_id && String(m.live_operator_id).toLowerCase() === String(user.id).toLowerCase())
        .map(m => m.id);
      setAssignedMatchIds(userMatches);
    });
    setModalStep(1);
    setMatchFilterScope('all');
    setCreatedCredentials(null);
    setShowTempPassword(false);
    setCopiedField(null);
    setModalMode('view');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setSelectedFileUrl(url);
      setCropModalOpen(true);
    }
    e.target.value = '';
  };

  const handleEditExistingAvatar = async () => {
    const currentUrl = avatarPreview || formData.avatar_url;
    if (!currentUrl) return;
    try {
      const res = await fetch(currentUrl);
      const blob = await res.blob();
      const localUrl = URL.createObjectURL(blob);
      setSelectedFileUrl(localUrl);
      setCropModalOpen(true);
    } catch {
      setSelectedFileUrl(currentUrl);
      setCropModalOpen(true);
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    setCropModalOpen(false);
    const croppedFile = new File([croppedBlob], `avatar-${Date.now()}.png`, { type: 'image/png' });
    setAvatarFile(croppedFile);
    setAvatarPreview(URL.createObjectURL(croppedBlob));
    if (selectedFileUrl && selectedFileUrl.startsWith('blob:')) {
      URL.revokeObjectURL(selectedFileUrl);
    }
    setSelectedFileUrl(null);
  };

  const toggleCategory = (cat: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  const togglePermission = (permKey: string) => {
    setFormData(prev => {
      const next = { ...prev.permissions_overrides };
      if (next[permKey]) {
        delete next[permKey]; // Suppression nette de la clé quand désactivée
      } else {
        next[permKey] = true;
      }
      return {
        ...prev,
        permissions_overrides: next
      };
    });
  };

  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    competition: true,
    trainings: false,
    effectif: false,
    recruitment_v2: false
  });

  const toggleCatExpand = (catId: string) => {
    setExpandedCats(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const toggleSubModuleAction = (subId: string, action: string, parentId: string) => {
    setFormData(prev => {
      const next = { ...prev.permissions_overrides };
      const key = `sub:${subId}:${action}`;
      const isCurrentlyActive = Boolean(next[key]);

      if (isCurrentlyActive) {
        delete next[key];
        // Si Planifier un match est décoché, nettoyer aussi sub:matches:create
        if (subId === 'matches' && action === 'plan_match') {
          delete next[`sub:matches:create`];
        }
        // Si Create est décoché sur matches, nettoyer aussi sub:matches:plan_match
        if (subId === 'matches' && action === 'create') {
          delete next[`sub:matches:plan_match`];
        }
        // Si Read est désactivé, désactiver toutes les autres actions de ce sous-module
        if (action === 'read') {
          delete next[`sub:${subId}:create`];
          delete next[`sub:${subId}:update`];
          delete next[`sub:${subId}:delete`];
          if (subId === 'players') {
            PLAYER_SPECIFIC_ACTIONS.forEach(a => {
              delete next[`sub:players:${a.key}`];
            });
          }
          if (subId === 'candidates') {
            CANDIDATE_SPECIFIC_ACTIONS.forEach(a => {
              delete next[`sub:candidates:${a.key}`];
            });
          }
          if (subId === 'matches') {
            MATCH_SPECIFIC_ACTIONS.forEach(a => {
              delete next[`sub:matches:${a.key}`];
            });
          }
        }
      } else {
        next[key] = true;
        // Si Planifier un match est coché, activer aussi sub:matches:create
        if (subId === 'matches' && action === 'plan_match') {
          next[`sub:matches:create`] = true;
        }
        // Si Create est coché sur matches, activer aussi sub:matches:plan_match
        if (subId === 'matches' && action === 'create') {
          next[`sub:matches:plan_match`] = true;
        }
        // Si Create, Update, Delete ou une action spécifique est activé, Read est automatiquement activé
        if (action !== 'read') {
          next[`sub:${subId}:read`] = true;
        }
        // Activer également la grande catégorie parente au niveau read
        next[`${parentId}:read`] = true;
        if (parentId === 'recruitment_v2') next['manage_recruitment'] = true;
      }

      // Vérification de la catégorie parente : si plus aucun sous-module n'a 'read', nettoyer la permission parente
      const parentCat = DASHBOARD_HIERARCHY_MODULES.find(m => m.id === parentId);
      const hasAnySubActiveInParent = parentCat?.subModules.some(sub => Boolean(next[`sub:${sub.id}:read`]));
      if (!hasAnySubActiveInParent) {
        delete next[`${parentId}:read`];
        delete next[`${parentId}:create`];
        delete next[`${parentId}:update`];
        delete next[`${parentId}:delete`];
        if (parentId === 'recruitment_v2') {
          delete next['manage_recruitment'];
          delete next['recruitment_v2'];
          delete next['dashboard_recruitment'];
        }
      }

      return {
        ...prev,
        permissions_overrides: next
      };
    });
  };

  const toggleSubModuleAll = (subId: string, parentId: string) => {
    setFormData(prev => {
      const next = { ...prev.permissions_overrides };
      const baseActions: string[] = ['create', 'read', 'update', 'delete'];
      const actions = subId === 'players'
        ? [...baseActions, ...PLAYER_SPECIFIC_ACTIONS.map(a => a.key)]
        : subId === 'candidates'
          ? [...baseActions, ...CANDIDATE_SPECIFIC_ACTIONS.map(a => a.key)]
          : subId === 'matches'
            ? [...baseActions, ...MATCH_SPECIFIC_ACTIONS.map(a => a.key)]
            : baseActions;
      const activeCount = actions.filter(act => next[`sub:${subId}:${act}`]).length;
      const shouldEnable = activeCount < actions.length;

      actions.forEach(act => {
        if (shouldEnable) {
          next[`sub:${subId}:${act}`] = true;
        } else {
          delete next[`sub:${subId}:${act}`];
        }
      });

      if (shouldEnable) {
        next[`${parentId}:read`] = true;
        if (parentId === 'recruitment_v2') next['manage_recruitment'] = true;
      } else {
        const parentCat = DASHBOARD_HIERARCHY_MODULES.find(m => m.id === parentId);
        const hasAnySubActiveInParent = parentCat?.subModules.some(sub => Boolean(next[`sub:${sub.id}:read`]));
        if (!hasAnySubActiveInParent) {
          delete next[`${parentId}:read`];
          delete next[`${parentId}:create`];
          delete next[`${parentId}:update`];
          delete next[`${parentId}:delete`];
          if (parentId === 'recruitment_v2') {
            delete next['manage_recruitment'];
            delete next['recruitment_v2'];
            delete next['dashboard_recruitment'];
          }
        }
      }

      return {
        ...prev,
        permissions_overrides: next
      };
    });
  };

  const toggleCategoryAll = (category: DashboardCategoryDef) => {
    setFormData(prev => {
      const next = { ...prev.permissions_overrides };
      const getSubActions = (subId: string) =>
        subId === 'players'
          ? ['create', 'read', 'update', 'delete', ...PLAYER_SPECIFIC_ACTIONS.map(a => a.key)]
          : subId === 'candidates'
            ? ['create', 'read', 'update', 'delete', ...CANDIDATE_SPECIFIC_ACTIONS.map(a => a.key)]
            : subId === 'matches'
              ? ['create', 'read', 'update', 'delete', ...MATCH_SPECIFIC_ACTIONS.map(a => a.key)]
              : ['create', 'read', 'update', 'delete'];

      const allActive = category.subModules.every(sub =>
        getSubActions(sub.id).every(act => next[`sub:${sub.id}:${act}`])
      );

      category.subModules.forEach(sub => {
        getSubActions(sub.id).forEach(act => {
          if (!allActive) {
            next[`sub:${sub.id}:${act}`] = true;
          } else {
            delete next[`sub:${sub.id}:${act}`];
          }
        });
      });

      if (!allActive) {
        next[`${category.id}:read`] = true;
        if (category.id === 'recruitment_v2') next['manage_recruitment'] = true;
      } else {
        delete next[`${category.id}:read`];
        if (category.id === 'recruitment_v2') delete next['manage_recruitment'];
      }

      return {
        ...prev,
        permissions_overrides: next
      };
    });
  };

  const setAllPermissionsForTarget = (target: 'mobile' | 'dashboard' | 'match' | 'scout', enable: boolean) => {
    setFormData(prev => {
      const next = { ...prev.permissions_overrides };
      let targetPerms: PermissionDefinition[] = [];
      if (target === 'match') targetPerms = MATCH_GLOBAL_PLANNING_PERMISSIONS;
      else if (target === 'scout') targetPerms = SCOUT_MOBILE_PERMISSIONS;
      else if (target === 'mobile') targetPerms = APP_MOBILE_PERMISSIONS;
      else targetPerms = DASHBOARD_PERMISSIONS;

      targetPerms.forEach(p => {
        if (enable) {
          next[p.key] = true;
        } else {
          delete next[p.key];
        }
      });
      return {
        ...prev,
        permissions_overrides: next
      };
    });
  };

  const clearAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions_overrides: {}
    }));
  };

  if (!hasUserManagementAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Lock className="w-16 h-16 text-muted-foreground mb-4 opacity-40" />
        <h2 className="text-xl font-bold text-muted-foreground">Accès Réservé aux Administrateurs</h2>
        <p className="text-sm text-muted-foreground opacity-60">
          Seuls le Super Administrateur, l'Administrateur du Club et le Scout Admin peuvent accéder à la gestion des utilisateurs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase italic flex items-center gap-2">
            {isScoutAdmin ? 'Gestion des Utilisateurs Scouts' : 'Gestion des Utilisateurs'} <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">
            {isScoutAdmin
              ? 'Administration et affectation exclusive du personnel de la cellule de détection'
              : 'Création de comptes, attribution des intitulés de poste et périmètres d\'accès'}
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="gap-2 shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs uppercase tracking-wider rounded-xl h-11 px-5 w-full sm:w-auto shrink-0">
          <UserPlus className="w-4 h-4" /> Nouvel Utilisateur
        </Button>
      </div>

      {/* Filter and View Toggles */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-4 w-full sm:w-auto flex-wrap">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Rechercher par nom, email, fonction..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-card border-border rounded-xl font-medium"
            />
          </div>

          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="h-11 px-4 rounded-xl border border-border bg-card text-xs font-bold text-foreground outline-none shrink-0 cursor-pointer"
          >
            <option value="all">Toutes catégories</option>
            <option value="global">Accès Global</option>
            {AGE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Filtre Rôle */}
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="h-11 px-4 rounded-xl border border-border bg-card text-xs font-bold text-foreground outline-none shrink-0 cursor-pointer"
          >
            <option value="all">Tous les rôles</option>
            <option value="admin">👑 Administrateurs</option>
            <option value="scout">🎯 Cellule Scouting</option>
            <option value="staff">⚽ Staff & Encadrement</option>
          </select>

          {/* Filtre Intitulé de Poste */}
          <select
            value={selectedJobTitleFilter}
            onChange={(e) => setSelectedJobTitleFilter(e.target.value)}
            className={`h-11 px-4 rounded-xl border text-xs font-bold outline-none shrink-0 cursor-pointer max-w-[240px] truncate transition-all ${selectedJobTitleFilter !== 'all'
              ? 'border-primary bg-primary/10 text-primary font-black shadow-sm'
              : 'border-border bg-card text-foreground'
              }`}
            title="Filtrer par intitulé de poste affecté"
          >
            <option value="all">Tous les intitulés de poste ({users.length})</option>
            {availableJobTitles.map(title => {
              const count = jobTitleCounts.counts[title.toLowerCase()] || 0;
              return (
                <option key={title} value={title}>
                  💼 {title} ({count})
                </option>
              );
            })}
            {jobTitleCounts.noneCount > 0 && (
              <option value="none">
                ⚠️ Sans poste affecté ({jobTitleCounts.noneCount})
              </option>
            )}
          </select>

          {/* Filtre Statut / Black-list Pills */}
          <div className="flex items-center p-1 bg-secondary/30 rounded-xl border border-border shrink-0">
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedStatusFilter === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Tous ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${selectedStatusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-emerald-600'
                }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Actifs ({users.filter(u => u.is_active !== false).length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('blacklist')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${selectedStatusFilter === 'blacklist'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              Black-list ({users.filter(u => u.is_active === false).length})
            </button>
          </div>

          <div className="hidden sm:flex bg-secondary/30 rounded-xl border border-border p-1 shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bandeau des filtres actifs */}
      {(selectedJobTitleFilter !== 'all' || selectedRoleFilter !== 'all' || selectedCategoryFilter !== 'all' || selectedStatusFilter !== 'all' || searchTerm) && (
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1 pb-1">
          <span className="text-muted-foreground font-bold text-[11px] uppercase tracking-wider">
            Filtres actifs :
          </span>
          {selectedJobTitleFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 font-black text-xs">
              <Briefcase className="w-3 h-3" />
              Poste : {selectedJobTitleFilter === 'none' ? 'Sans poste affecté' : selectedJobTitleFilter}
              <button
                type="button"
                onClick={() => setSelectedJobTitleFilter('all')}
                className="hover:text-primary-foreground hover:bg-primary rounded-full p-0.5 ml-1 transition-colors cursor-pointer"
                title="Supprimer ce filtre"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedRoleFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-secondary text-foreground border border-border font-bold text-xs">
              Rôle : {selectedRoleFilter}
              <button
                type="button"
                onClick={() => setSelectedRoleFilter('all')}
                className="hover:text-foreground rounded-full p-0.5 ml-1 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedCategoryFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-secondary text-foreground border border-border font-bold text-xs">
              Catégorie : {selectedCategoryFilter}
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('all')}
                className="hover:text-foreground rounded-full p-0.5 ml-1 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {searchTerm && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-secondary text-foreground border border-border font-bold text-xs">
              Recherche : « {searchTerm} »
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="hover:text-foreground rounded-full p-0.5 ml-1 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setSelectedJobTitleFilter('all');
              setSelectedRoleFilter('all');
              setSelectedCategoryFilter('all');
              setSelectedStatusFilter('all');
              setSearchTerm('');
            }}
            className="text-[11px] font-bold text-muted-foreground hover:text-rose-600 underline ml-2 transition-colors cursor-pointer"
          >
            Réinitialiser tout ({filteredUsers.length}/{users.length})
          </button>
        </div>
      )}

      {/* Main Content: Users List or Grid */}
      {modalMode === 'none' ? (
        <div key="list">
          {/* Bandeau d'information spécifique Rubrique Black-list */}
          {selectedStatusFilter === 'blacklist' && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-rose-500 shrink-0 animate-pulse" />
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                    Rubrique : Utilisateurs en Black-list (Accès Bloqués)
                  </h4>
                  <p className="text-xs font-medium opacity-90 mt-0.5">
                    Les utilisateurs ci-dessous ont leur accès suspendu. Pour leur redonner accès avec <strong>toutes leurs permissions et rôles intacts</strong>, basculez simplement leur toggle sur <span className="font-bold underline text-emerald-600 dark:text-emerald-400">ACCÈS AUTORISÉ</span>.
                  </p>
                </div>
              </div>
              <Badge variant="destructive" className="font-black text-xs px-3.5 py-1.5 shrink-0 self-start sm:self-center shadow-sm">
                {users.filter(u => u.is_active === false).length} compte(s) bloqué(s)
              </Badge>
            </div>
          )}

          {loading ? (
            <FusLogoLoader fullPage size="lg" label="Chargement des utilisateurs…" />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredUsers.map(u => (
                <div key={u.id} className="bg-card rounded-3xl p-6 shadow-sm border border-border flex flex-col items-center text-center relative group hover:shadow-md hover:border-primary/30 transition-all duration-300">
                  <UserAvatarItem user={u} size="lg" />
                  <h3 className="font-black text-foreground truncate w-full px-2">{u.full_name}</h3>
                  <p className="text-xs text-muted-foreground truncate w-full mb-2 px-2 font-medium">{u.email}</p>

                  {/* Job Title Badge */}
                  {u.job_title && (
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase mb-1">
                      <Briefcase className="w-3 h-3 shrink-0" />
                      <span className="truncate">{u.job_title}</span>
                    </div>
                  )}

                  {/* Matchs attribués indicator */}
                  {(() => {
                    const assignedCount = operableMatches.filter(
                      m => m.live_operator_id && String(m.live_operator_id).toLowerCase() === String(u.id).toLowerCase()
                    ).length;
                    if (assignedCount === 0) return null;
                    return (
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/25 text-[10px] font-bold mb-2 shadow-xs">
                        <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                        <span>{assignedCount} match{assignedCount > 1 ? 's' : ''} attribué{assignedCount > 1 ? 's' : ''}</span>
                      </div>
                    );
                  })()}

                  <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3">
                    {(() => {
                      const rCfg = getRoleConfig(u.system_role);
                      return (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${rCfg.badgeClass}`}>
                          <span>{rCfg.label}</span>
                        </span>
                      );
                    })()}

                    {/* Toggle Switch d'accès & Black-list */}
                    <UserStatusToggleSwitch user={u} onToggle={handleToggleUserActive} />
                  </div>

                  <div className="flex flex-wrap gap-1 justify-center mb-4 min-h-[24px]">
                    {u.categories && u.categories.length > 0 ? (
                      u.categories.map(cat => (
                        <Badge key={cat} variant="secondary" className="text-[9px] font-bold bg-secondary text-secondary-foreground">{cat}</Badge>
                      ))
                    ) : (
                      <span className="text-[9px] text-muted-foreground italic font-medium">Périmètre Global</span>
                    )}
                  </div>

                  {/* Permissions (Grid) */}
                  <div className="flex justify-center mb-4 min-h-[28px]">
                    <UserPermissionsHoverBadge user={u} />
                  </div>

                  <div className="flex gap-1.5 w-full justify-center mt-auto pt-3 border-t border-border">
                    <button onClick={() => openViewMode(u)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors" title="Aperçu">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => openCredentialsQuickModal(u)} className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 rounded-xl transition-colors" title="⚡ Générer & Transmettre les Accès (WhatsApp)">
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEditMode(u)} className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors" title="Modifier">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteUser(u.id, u.full_name || u.email)} className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors" title="Supprimer définitivement">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground font-medium italic">
                  {selectedStatusFilter === 'blacklist' ? 'Aucun utilisateur dans la Black-list.' : 'Aucun utilisateur trouvé.'}
                </div>
              )}
            </div>
          ) : (
            /* List View */
            <div className="bg-card rounded-3xl shadow-sm border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/20 border-b border-border">
                    <tr>
                      <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Utilisateur</th>
                      <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Intitulé de Poste</th>
                      <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rôle Système</th>
                      <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Accès & Black-list</th>
                      <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Périmètre Catégories</th>
                      <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Permissions Spécifiques</th>
                      <th className="text-right py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-secondary/10 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <UserAvatarItem user={u} size="sm" />
                            <div>
                              <p className="font-bold text-foreground text-sm">{u.full_name}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                              {(() => {
                                const assignedCount = operableMatches.filter(
                                  m => m.live_operator_id && String(m.live_operator_id).toLowerCase() === String(u.id).toLowerCase()
                                ).length;
                                if (assignedCount === 0) return null;
                                return (
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 border border-red-500/25 text-[9px] font-bold mt-1">
                                    <Radio className="w-2.5 h-2.5 text-red-500 animate-pulse" />
                                    <span>{assignedCount} match{assignedCount > 1 ? 's' : ''} attribué{assignedCount > 1 ? 's' : ''}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {u.job_title ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                              <Briefcase className="w-3.5 h-3.5 shrink-0" />
                              <span>{u.job_title}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic font-medium">— Non spécifié</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {(() => {
                            const rCfg = getRoleConfig(u.system_role);
                            return (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${rCfg.badgeClass}`}>
                                <span>{rCfg.label}</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-4 px-6">
                          <UserStatusToggleSwitch user={u} onToggle={handleToggleUserActive} />
                        </td>
                        <td className="py-4 px-6">
                          {u.categories && u.categories.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {u.categories.map(cat => (
                                <Badge key={cat} variant="secondary" className="text-[9px] font-bold bg-secondary text-secondary-foreground">{cat}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic font-medium">Accès Global</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <UserPermissionsHoverBadge user={u} />
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openViewMode(u)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors" title="Détails">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => openCredentialsQuickModal(u)} className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 rounded-lg transition-colors" title="⚡ Générer & Transmettre les Accès (WhatsApp)">
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEditMode(u)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Modifier">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteUser(u.id, u.full_name || u.email)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Supprimer définitivement">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground font-medium italic">
                          Aucun utilisateur trouvé.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* User Modal (Create / Edit / View) */
        <div key="form" className={modalStep === 2 ? "max-w-2xl mx-auto" : "max-w-4xl mx-auto"}>
          <Card className="border border-border shadow-2xl rounded-3xl overflow-hidden bg-card text-card-foreground">
            {modalStep === 2 && createdCredentials ? (
              /* ── ÉTAPE 2 : IDENTIFIANTS GÉNÉRÉS & ENVOI WHATSAPP ── */
              <div className="animate-in fade-in zoom-in-98 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-border bg-emerald-500/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/30">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 inline-block mb-0.5">
                        Étape 2 / 2 — Identifiants Prêts
                      </span>
                      <h3 className="text-base sm:text-lg font-black uppercase text-foreground">
                        Accès Utilisateur Prêts à Transmettre
                      </h3>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { setModalMode('none'); setModalStep(1); }} className="rounded-xl">
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <CardContent className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-black text-foreground">
                      Compte configuré pour {createdCredentials.fullName}
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Le profil est actif avec le rôle <strong>{createdCredentials.systemRole?.toUpperCase()}</strong> {createdCredentials.roleTitle ? `(${createdCredentials.roleTitle})` : ''}.
                      Voici les identifiants de première connexion à transmettre au collaborateur.
                    </p>
                  </div>

                  {/* Bloc Identifiants */}
                  <div className="bg-secondary/40 border border-border rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border text-xs font-bold text-foreground">
                      <KeyRound className="w-4 h-4 text-primary" />
                      <span>Identifiants de Connexion</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Login */}
                      <div className="p-3.5 bg-background rounded-xl border border-border space-y-1 shadow-xs">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Identifiant (Login / Email)
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono font-bold text-foreground truncate" title={createdCredentials.login}>
                            {createdCredentials.login}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(createdCredentials.login);
                              setCopiedField('login');
                              toast.success("Login copié dans le presse-papier !");
                              setTimeout(() => setCopiedField(null), 2000);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                            title="Copier le login"
                          >
                            {copiedField === 'login' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Mot de passe temporaire */}
                      <div className="p-3.5 bg-background rounded-xl border border-border space-y-1 shadow-xs">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Mot de passe temporaire
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono font-bold text-primary">
                            {showTempPassword ? createdCredentials.tempPassword : '••••••••••••'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setShowTempPassword(!showTempPassword)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                              title={showTempPassword ? "Masquer" : "Afficher"}
                            >
                              {showTempPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(createdCredentials.tempPassword);
                                setCopiedField('pwd');
                                toast.success("Mot de passe temporaire copié !");
                                setTimeout(() => setCopiedField(null), 2000);
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors cursor-pointer"
                              title="Copier le mot de passe"
                            >
                              {copiedField === 'pwd' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sécurité et forçage de changement */}
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
                      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-[11px]">Renouvellement obligatoire à la 1re connexion</p>
                        <p className="text-[11px] opacity-90 leading-relaxed">
                          Ce mot de passe temporaire est haché en base de données. Dès sa première connexion, le collaborateur sera <strong>automatiquement redirigé</strong> vers la page de création d'un nouveau mot de passe personnel avant tout accès au dashboard.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bloc WhatsApp Officiel */}
                  <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-xs">
                          <MessageCircle className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-foreground">Envoi Direct via WhatsApp</h4>
                          <p className="text-[11px] text-muted-foreground">Transmettez le lien de l'application, l'identifiant et le mot de passe en 1 clic.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-foreground block">
                        Numéro WhatsApp du destinataire :
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="tel"
                          value={whatsAppPhoneNumber}
                          onChange={(e) => setWhatsAppPhoneNumber(e.target.value)}
                          placeholder="+212 600-000000"
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-border text-xs font-mono font-bold bg-background focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 text-foreground"
                        />
                        <a
                          href={getWhatsAppUrl(whatsAppPhoneNumber || createdCredentials.phone || '', getWhatsAppUserMessage(createdCredentials.fullName, createdCredentials.login, createdCredentials.tempPassword, createdCredentials.roleTitle, createdCredentials.systemRole))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4 fill-current" />
                          <span>Envoyer WhatsApp</span>
                        </a>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#25D366]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">Message d'invitation pré-formaté prêt à être transmis.</span>
                      <button
                        type="button"
                        onClick={() => {
                          const msg = getWhatsAppUserMessage(createdCredentials.fullName, createdCredentials.login, createdCredentials.tempPassword, createdCredentials.roleTitle, createdCredentials.systemRole);
                          navigator.clipboard.writeText(msg);
                          setCopiedField('all');
                          toast.success("Message d'invitation copié !");
                          setTimeout(() => setCopiedField(null), 2000);
                        }}
                        className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedField === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copier tout le message</span>
                      </button>
                    </div>
                  </div>

                  {/* Bouton de clôture */}
                  <div className="pt-4 border-t border-border flex justify-end">
                    <Button
                      type="button"
                      onClick={() => {
                        setModalMode('none');
                        setModalStep(1);
                        setCreatedCredentials(null);
                      }}
                      className="w-full sm:w-auto px-8 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-lg shadow-primary/20"
                    >
                      Terminer & Fermer
                    </Button>
                  </div>
                </CardContent>
              </div>
            ) : modalMode === 'credentials' && quickCredentialsUser ? (
              /* ── MODAL MODE CREDENTIALS RAPIDE (Identifiants & Authentification) ── */
              <div className="animate-in fade-in zoom-in-98 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-border bg-amber-500/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/30">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 inline-block mb-0.5">
                        Sécurité & Authentification FUS
                      </span>
                      <h3 className="text-base sm:text-lg font-black uppercase text-foreground">
                        Générer & Transmettre les Accès
                      </h3>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setModalMode('none')} className="rounded-xl">
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <CardContent className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
                  {/* Récapitulatif Collaborateur */}
                  <div className="p-4 rounded-2xl bg-secondary/40 border border-border flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <UserAvatarItem user={quickCredentialsUser} size="sm" />
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{quickCredentialsUser.full_name || quickCredentialsUser.email}</h4>
                        <p className="text-xs text-muted-foreground font-mono">{quickCredentialsUser.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleConfig(quickCredentialsUser.system_role).badgeClass}`}>
                        {getRoleConfig(quickCredentialsUser.system_role).label}
                      </span>
                      {quickCredentialsUser.job_title && (
                        <span className="text-[10px] font-semibold text-primary">
                          {quickCredentialsUser.job_title}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mot de passe temporaire à générer */}
                  <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <label className="text-xs font-bold text-foreground">
                          Nouveau mot de passe temporaire
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const generated = generateSecureTempPassword();
                          setQuickTempPassword(generated);
                          toast.success("Nouveau mot de passe généré !", { icon: '⚡' });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>⚡ Régénérer</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={quickShowPassword ? "text" : "password"}
                        value={quickTempPassword}
                        onChange={(e) => setQuickTempPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-800 text-xs font-mono font-bold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 pr-20"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setQuickShowPassword(!quickShowPassword)}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title={quickShowPassword ? "Masquer" : "Afficher"}
                        >
                          {quickShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(quickTempPassword);
                            toast.success("Mot de passe copié !");
                          }}
                          className="p-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                          title="Copier"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Numéro WhatsApp */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-[#25D366]" /> Numéro WhatsApp du collaborateur
                    </label>
                    <Input
                      type="tel"
                      value={quickPhone}
                      onChange={e => setQuickPhone(e.target.value)}
                      placeholder="+212 600-000000"
                      className="bg-secondary/30 border-transparent focus:bg-background h-11 rounded-xl font-medium font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Numéro utilisé pour la redirection WhatsApp directe avec les identifiants préremplis.
                    </p>
                  </div>

                  {/* Sécurité et hachage en base */}
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-[11px]">Hachage sécurisé & Renouvellement obligatoire</p>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        Ce mot de passe temporaire est haché en base de données avec l'extension pgcrypto (bcrypt). Dès sa première connexion, le collaborateur sera <strong>automatiquement contraint</strong> de choisir son propre mot de passe personnel avant d'accéder au dashboard.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 flex gap-3 border-t border-border">
                    <Button type="button" variant="ghost" className="flex-1 rounded-xl font-bold text-xs" onClick={() => setModalMode('none')}>
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      onClick={handleApplyQuickCredentials}
                      disabled={isProvisioningQuick || !quickTempPassword.trim()}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 gap-2 cursor-pointer"
                    >
                      {isProvisioningQuick ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                      <span>Appliquer & Préparer Envoi WhatsApp</span>
                    </Button>
                  </div>
                </CardContent>
              </div>
            ) : (
              <>
                {/* ── HEADER MODAL ── */}
                <div className="flex items-center justify-between p-5 md:p-6 border-b border-border bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-black uppercase text-foreground tracking-tight">
                          {modalMode === 'create' ? 'Création de Compte Utilisateur' : modalMode === 'edit' ? 'Modification du Compte' : 'Fiche Utilisateur & Périmètres'}
                        </h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${modalMode === 'create'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : modalMode === 'edit'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                            : 'bg-secondary text-muted-foreground border border-border'
                          }`}>
                          {modalMode === 'create' ? 'Création' : modalMode === 'edit' ? 'Édition' : 'Lecture'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">
                        Définissez l'intitulé de poste, le rôle système et le périmètre d'habilitation d'accès
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setModalMode('none')} className="rounded-xl hover:bg-secondary">
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <CardContent className="p-5 md:p-8 space-y-6 max-h-[78vh] overflow-y-auto">
                  {(() => {
                    const isScoutJobTitle = (formData.job_title || '').trim().toLowerCase() === 'scout';
                    const activeMobileCount = APP_MOBILE_PERMISSIONS.filter(p => formData.permissions_overrides[p.key]).length;
                    const activeDashboardCount = DASHBOARD_PERMISSIONS.filter(p => formData.permissions_overrides[p.key]).length;
                    const totalActive = activeMobileCount + activeDashboardCount;
                    const isGlobalAdminUser = formData.system_role === 'super_admin' || formData.system_role === 'admin';

                    return (
                      <div className="space-y-6">
                        {/* ── SECTION 1 : INFORMATIONS PERSONNELLES & COORDONNÉES ── */}
                        <div className="p-5 rounded-2xl bg-secondary/20 border border-border/80 space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span className="text-[11px] font-black uppercase tracking-wider text-foreground">
                              1. Profil, Identité & Coordonnées
                            </span>
                          </div>

                          <div className="flex flex-col md:flex-row gap-5 items-start">
                            {/* Photo de Profil Officielle */}
                            <div className="flex flex-col items-center justify-center gap-2 shrink-0 self-center md:self-start">
                              <div className="w-24 h-24 rounded-2xl bg-secondary/60 overflow-hidden border-2 border-dashed border-primary/30 relative group flex items-center justify-center shadow-inner">
                                {avatarPreview || formData.avatar_url ? (
                                  <img src={avatarPreview || formData.avatar_url || ''} className="w-full h-full object-cover" alt="Avatar" />
                                ) : (
                                  <Camera className="w-8 h-8 text-muted-foreground opacity-50" />
                                )}

                                {modalMode !== 'view' && (
                                  <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-bold gap-1">
                                    <Upload className="w-4 h-4" />
                                    <span>Charger</span>
                                    <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={handleAvatarChange} />
                                  </label>
                                )}
                              </div>

                              {modalMode !== 'view' && (
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setMediaPickerOpen(true)}
                                    className="h-7 px-2 text-[10px] font-bold rounded-lg gap-1 border-slate-200 hover:border-primary/40 bg-slate-50 hover:bg-primary/10"
                                  >
                                    <ImageIcon className="w-3 h-3 text-primary" />
                                    Média
                                  </Button>
                                  {(avatarPreview || formData.avatar_url) && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={handleEditExistingAvatar}
                                      className="h-7 px-2 text-[10px] font-bold rounded-lg gap-1 border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary/10 text-primary"
                                      title="Recadrer et zoomer l'avatar existant"
                                    >
                                      <Scissors className="w-3 h-3 text-primary" />
                                      Recadrer
                                    </Button>
                                  )}
                                  {(avatarPreview || formData.avatar_url) && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, avatar_url: '' }));
                                        setAvatarPreview(null);
                                        setAvatarFile(null);
                                      }}
                                      className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                                      title="Supprimer la photo"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              )}

                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                                Photo Officielle
                              </span>
                            </div>

                            {/* Form Fields: Grille 2 colonnes équilibrée */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1 w-full">
                              {/* Nom & Prénom */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                  Nom & Prénom *
                                </label>
                                <Input
                                  disabled={modalMode === 'view'}
                                  value={formData.full_name}
                                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                  placeholder="Ex: Walid Regragui"
                                  className="bg-background/90 border-border/80 focus:bg-background h-10 rounded-xl font-medium text-xs"
                                />
                              </div>

                              {/* Adresse Email */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Adresse Email *
                                  </label>
                                  {modalMode === 'create' && formData.full_name?.trim() && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const generatedEmail = generateScoutLogin(formData.full_name);
                                        setFormData({ ...formData, email: generatedEmail });
                                        toast.success(`Email suggéré : ${generatedEmail}`, { icon: '⚡' });
                                      }}
                                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <Sparkles className="w-3 h-3" /> Suggérer @fus.ma
                                    </button>
                                  )}
                                </div>
                                <Input
                                  disabled={modalMode === 'view'}
                                  type="email"
                                  value={formData.email}
                                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                                  placeholder="coach@fus.ma"
                                  className="bg-background/90 border-border/80 focus:bg-background h-10 rounded-xl font-medium text-xs"
                                />
                              </div>

                              {/* Numéro WhatsApp */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-500" /> Numéro WhatsApp
                                </label>
                                <Input
                                  disabled={modalMode === 'view'}
                                  type="tel"
                                  value={formData.phone_number}
                                  onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                                  placeholder="+212 600-000000"
                                  className="bg-background/90 border-border/80 focus:bg-background h-10 rounded-xl font-medium text-xs font-mono"
                                />
                              </div>

                              {/* Intitulé de Poste / Fonction Officielle */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                    <Briefcase className="w-3.5 h-3.5 text-primary" /> Intitulé de Poste *
                                  </label>
                                  {isScoutJobTitle && (
                                    <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/80 px-2 py-0.2 rounded-full border border-purple-200 dark:border-purple-800">
                                      🎯 Cellule Scouting
                                    </span>
                                  )}
                                </div>
                                <div className="relative">
                                  <select
                                    disabled={modalMode === 'view'}
                                    value={formData.job_title || ''}
                                    onChange={e => {
                                      const title = e.target.value;
                                      const isNowScout = title.trim().toLowerCase() === 'scout';
                                      let newRole = formData.system_role;
                                      if (isNowScout && !formData.system_role?.startsWith('scout_') && formData.system_role !== 'super_admin' && formData.system_role !== 'admin') {
                                        newRole = isScoutAdmin ? 'scout_editor' : 'scout_manager';
                                      } else if (!isNowScout && formData.system_role?.startsWith('scout_')) {
                                        newRole = 'manager';
                                      }
                                      setFormData({ ...formData, job_title: title, system_role: newRole });
                                    }}
                                    className="w-full h-10 px-3 rounded-xl bg-background/90 border border-border/80 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-semibold text-xs text-foreground cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                                  >
                                    <option value="" disabled>Sélectionner un intitulé officiel...</option>
                                    {OFFICIAL_JOB_TITLES.map(title => (
                                      <option key={title} value={title}>
                                        {title}
                                      </option>
                                    ))}
                                    {formData.job_title && !OFFICIAL_JOB_TITLES.includes(formData.job_title as any) && (
                                      <option value={formData.job_title}>
                                        {formData.job_title} (Intitulé existant)
                                      </option>
                                    )}
                                  </select>
                                </div>
                              </div>

                              {/* Statut du Compte */}
                              <div className="space-y-1.5 sm:col-span-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                    <Power className="w-3.5 h-3.5 text-primary" /> Statut du Compte Utilisateur
                                  </label>
                                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${formData.is_active !== false
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                    }`}>
                                    {formData.is_active !== false ? '● Compte Actif' : '○ Compte Désactivé'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={modalMode === 'view'}
                                    onClick={() => setFormData({ ...formData, is_active: true })}
                                    className={`flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${formData.is_active !== false
                                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                                      : 'bg-background/80 text-muted-foreground border-border hover:bg-secondary'
                                      } disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer`}
                                  >
                                    <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse" />
                                    Actif (Accès autorisé)
                                  </button>
                                  <button
                                    type="button"
                                    disabled={modalMode === 'view'}
                                    onClick={() => setFormData({ ...formData, is_active: false })}
                                    className={`flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${formData.is_active === false
                                      ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                                      : 'bg-background/80 text-muted-foreground border-border hover:bg-secondary'
                                      } disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer`}
                                  >
                                    <span className="w-2 h-2 rounded-full bg-rose-200" />
                                    Inactif (Accès suspendu)
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ── SECTION 2 : RÔLE SYSTÈME & MOT DE PASSE (2 COLONNES) ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Colonne Gauche : Rôle Système & Niveau de Privilège */}
                          <div className="p-5 rounded-2xl bg-secondary/20 border border-border/80 space-y-3.5 flex flex-col justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  {isScoutJobTitle ? 'Rôle Scout & Niveau de Privilège *' : 'Rôle Système Officiel *'}
                                </label>
                                {isScoutJobTitle && (
                                  <span className="text-[9px] font-mono font-bold text-purple-600 dark:text-purple-400">
                                    {formData.system_role}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                Définit les privilèges opérationnels et le profil de sécurité.
                              </p>
                            </div>

                            {isScoutJobTitle ? (
                              <div className="space-y-2.5">
                                {isScoutAdmin && (
                                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
                                    <span>🔒 Rôles <strong>Scout Manager</strong> et <strong>Scout Admin</strong> réservés à la Direction.</span>
                                  </div>
                                )}

                                <div className={`grid gap-1.5 ${isScoutAdmin ? 'grid-cols-2' : 'grid-cols-2'}`}>
                                  {(isScoutAdmin
                                    ? SCOUT_ROLES.filter(sr => sr.value === 'scout_editor' || sr.value === 'scout_user')
                                    : SCOUT_ROLES
                                  ).map(sr => {
                                    const isSelected = formData.system_role === sr.value;
                                    return (
                                      <button
                                        key={sr.value}
                                        type="button"
                                        disabled={modalMode === 'view'}
                                        onClick={() => setFormData({ ...formData, system_role: sr.value })}
                                        className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${isSelected
                                          ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30 ring-2 ring-purple-400/40'
                                          : 'bg-background/80 text-foreground border-border hover:bg-secondary hover:border-purple-300'
                                          } disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer`}
                                      >
                                        <span className="text-[11px] font-black uppercase tracking-wide">
                                          {sr.level}
                                        </span>
                                        <span className="text-[9px] font-semibold opacity-85 leading-tight">
                                          {sr.label}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>

                                <select
                                  disabled={modalMode === 'view'}
                                  value={formData.system_role || (isScoutAdmin ? 'scout_editor' : 'scout_manager')}
                                  onChange={e => setFormData({ ...formData, system_role: e.target.value })}
                                  className="w-full h-9 px-3 rounded-xl bg-background border border-border text-xs font-bold text-foreground outline-none"
                                >
                                  <optgroup label="Rôles Cellule Détection">
                                    {(isScoutAdmin
                                      ? SCOUT_ROLES.filter(sr => sr.value === 'scout_editor' || sr.value === 'scout_user')
                                      : SCOUT_ROLES
                                    ).map(r => (
                                      <option key={r.value} value={r.value}>
                                        {r.label} — {r.desc}
                                      </option>
                                    ))}
                                  </optgroup>
                                  {!isScoutAdmin && (
                                    <optgroup label="Administration Globale">
                                      <option value="super_admin">👑 Super Administrateur (Global)</option>
                                      <option value="admin">Administrateur Club</option>
                                    </optgroup>
                                  )}
                                </select>
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                                  {[
                                    { value: 'super_admin', label: '👑 Super', desc: 'Total' },
                                    { value: 'admin', label: 'Admin', desc: 'Gestion' },
                                    { value: 'manager', label: 'Manager', desc: 'Staff' },
                                    { value: 'editor', label: 'Éditeur', desc: 'Saisie' },
                                    { value: 'viewer', label: 'Viewer', desc: 'Lecture' }
                                  ].map(r => {
                                    const isSelected = formData.system_role === r.value;
                                    return (
                                      <button
                                        key={r.value}
                                        type="button"
                                        disabled={modalMode === 'view'}
                                        onClick={() => setFormData({ ...formData, system_role: r.value })}
                                        className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${isSelected
                                          ? r.value === 'super_admin'
                                            ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-400/50'
                                            : 'bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/30'
                                          : 'bg-background/80 text-foreground border-border hover:bg-secondary hover:border-primary/40'
                                          } disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer`}
                                      >
                                        <span className="text-[10px] font-black uppercase tracking-wide">
                                          {r.label}
                                        </span>
                                        <span className="text-[8px] font-semibold opacity-85 leading-tight">
                                          {r.desc}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>

                                <select
                                  disabled={modalMode === 'view'}
                                  value={formData.system_role || 'admin'}
                                  onChange={e => setFormData({ ...formData, system_role: e.target.value })}
                                  className="w-full h-9 px-3 rounded-xl bg-background border border-border text-xs font-bold text-foreground outline-none"
                                >
                                  <optgroup label="Rôles Système Officiels">
                                    {SYSTEM_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                  </optgroup>
                                </select>
                              </div>
                            )}
                          </div>

                          {/* Colonne Droite : Mot de passe / Authentification */}
                          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3.5 flex flex-col justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                                  {modalMode === 'edit' ? "Modifier / Réinitialiser le mot de passe" : "Mot de passe d'accès initial"}
                                </label>
                                {modalMode !== 'view' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const generated = generateSecureTempPassword();
                                      setFormData({ ...formData, password: generated });
                                      toast.success('Nouveau mot de passe généré !', { icon: '⚡' });
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    <span>⚡ Générer</span>
                                  </button>
                                )}
                              </div>
                              <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80">
                                {modalMode === 'edit'
                                  ? "Laissez vide pour conserver l'actuel, ou générez un nouveau mot de passe temporaire."
                                  : "Mot de passe sécurisé à communiquer au collaborateur."}
                              </p>
                            </div>

                            {modalMode !== 'view' ? (
                              <div className="space-y-2">
                                <div className="relative">
                                  <Input
                                    type="text"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={modalMode === 'edit' ? "Laissez vide pour conserver l'actuel" : "Mot de passe temporaire"}
                                    className="bg-background border-amber-300 dark:border-amber-800 focus:ring-amber-500/30 h-10 rounded-xl font-mono text-xs font-bold pr-16 text-foreground"
                                  />
                                  {formData.password && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(formData.password);
                                          toast.success('Mot de passe copié !');
                                        }}
                                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-amber-500/20 transition-colors cursor-pointer"
                                        title="Copier le mot de passe"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start gap-1.5 text-[9.5px] text-amber-800 dark:text-amber-300 leading-snug">
                                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                  <span>
                                    Haché en base (bcrypt). <strong>force_password_change = true</strong> imposera le choix d'un mot de passe personnel dès sa première connexion.
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 rounded-xl bg-background/60 border border-amber-300/30 text-[11px] font-mono text-muted-foreground">
                                Mot de passe sécurisé et haché en base de données.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ── SECTION 3 : PÉRIMÈTRE D'INTERVENTION — CATÉGORIES (U7 À PRO) ── */}
                        <div className="p-5 rounded-2xl bg-secondary/20 border border-border/80 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                              <label className="text-[11px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-primary" />
                                2. Périmètre d'Intervention — Catégories d'Âge (U7 à PRO)
                              </label>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                {formData.categories.length} / {AGE_CATEGORIES.length}
                              </span>
                            </div>

                            {modalMode !== 'view' && (
                              <div className="flex items-center gap-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, categories: [...AGE_CATEGORIES] })}
                                  className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                                >
                                  Tout sélectionner
                                </button>
                                <span className="text-muted-foreground text-xs">•</span>
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, categories: [] })}
                                  className="text-[10px] font-bold text-muted-foreground hover:text-destructive hover:underline cursor-pointer"
                                >
                                  Effacer
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {AGE_CATEGORIES.map(cat => {
                              const isSelected = formData.categories.includes(cat);
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  disabled={modalMode === 'view'}
                                  onClick={() => toggleCategory(cat)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${isSelected
                                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                    : 'bg-background/80 text-muted-foreground border-border hover:bg-secondary hover:text-foreground'
                                    } disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer`}
                                >
                                  {cat}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* ── SECTION 4 : PERMISSIONS SPÉCIFIQUES & HABILITATIONS ── */}
                        <div>
                          {formData.system_role === 'super_admin' ? (
                            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center space-y-2">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                                <ShieldCheck className="w-7 h-7" />
                              </div>
                              <div>
                                <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">
                                  👑 Rôle Super Administrateur — Accès Total Suprême
                                </span>
                                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200 mt-1 max-w-lg mx-auto">
                                  Le Super Administrateur dispose de l'intégralité des privilèges sans restriction.
                                </p>
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 max-w-lg mx-auto">
                                  Accès total débloqué à 100% sur l'App Mobile (Gestion de Match & Scout) et sur l'ensemble du Web Dashboard.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 pt-1">
                              {/* Header permissions */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-secondary/30 border border-border/80">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                    <label className="text-[11px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                                      <SlidersHorizontal className="w-3.5 h-3.5" /> 3. Permissions Spécifiques & Habilitations
                                    </label>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                                      {totalActive === 0 ? 'Défaut (0)' : `${totalActive} active${totalActive > 1 ? 's' : ''}`}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Activez ou désactivez précisément chaque module pour l'Application Mobile et le Web Dashboard.
                                  </p>
                                </div>

                                {modalMode !== 'view' && totalActive > 0 && (
                                  <button
                                    type="button"
                                    onClick={clearAllPermissions}
                                    className="text-[10px] font-bold text-destructive hover:underline flex items-center gap-1 shrink-0 self-start sm:self-auto cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Tout réinitialiser
                                  </button>
                                )}
                              </div>

                              {/* Alerte pour les Administrateurs */}
                              {isGlobalAdminUser && (
                                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-foreground text-xs flex items-start gap-2.5">
                                  <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                  <div className="space-y-0.5">
                                    <p className="font-bold text-[11px]">Privilège Administrateur Global</p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                      En tant qu'administrateur, cet utilisateur a un accès global. Les interrupteurs ci-dessous vous permettent de verrouiller ou d'autoriser sélectivement des opérations sensibles.
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* ── VOLET 1 : APPLICATION MOBILE (fus-app) ── */}
                              <div className="p-4 sm:p-5 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-3.5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-blue-500/20">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                      <Smartphone className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200">
                                        Application Mobile (fus-app)
                                      </h4>
                                      <p className="text-[10px] text-blue-800/80 dark:text-blue-300/80">
                                        Actions opérationnelles sur smartphone pour les modules terrain
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                      {activeMobileCount} / {APP_MOBILE_PERMISSIONS.length}
                                    </span>
                                    {modalMode !== 'view' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentSubPerms = mobileAppSubTab === 'match' ? MATCH_GLOBAL_PLANNING_PERMISSIONS : SCOUT_MOBILE_PERMISSIONS;
                                          const currentActiveInSub = currentSubPerms.filter(p => formData.permissions_overrides[p.key]).length;
                                          setAllPermissionsForTarget(mobileAppSubTab, currentActiveInSub < currentSubPerms.length);
                                        }}
                                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                      >
                                        {(() => {
                                          const currentSubPerms = mobileAppSubTab === 'match' ? MATCH_GLOBAL_PLANNING_PERMISSIONS : SCOUT_MOBILE_PERMISSIONS;
                                          const currentActiveInSub = currentSubPerms.filter(p => formData.permissions_overrides[p.key]).length;
                                          return currentActiveInSub === currentSubPerms.length ? 'Tout décocher ce volet' : 'Tout cocher ce volet';
                                        })()}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Sélecteur de sous-application mobile : Gestion de Match vs Scout */}
                                <div className="flex items-center gap-1.5 p-1 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                  <button
                                    type="button"
                                    onClick={() => setMobileAppSubTab('match')}
                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${mobileAppSubTab === 'match'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'text-blue-900/80 dark:text-blue-200 hover:bg-blue-500/15'
                                      }`}
                                  >
                                    <span>⚽ Planification Match</span>
                                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${mobileAppSubTab === 'match' ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-800 dark:text-blue-300'
                                      }`}>
                                      {MATCH_GLOBAL_PLANNING_PERMISSIONS.filter(p => formData.permissions_overrides[p.key]).length}/{MATCH_GLOBAL_PLANNING_PERMISSIONS.length}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setMobileAppSubTab('scout')}
                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${mobileAppSubTab === 'scout'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'text-blue-900/80 dark:text-blue-200 hover:bg-blue-500/15'
                                      }`}
                                  >
                                    <span>🔍 Scout & Détection</span>
                                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${mobileAppSubTab === 'scout' ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-800 dark:text-blue-300'
                                      }`}>
                                      {SCOUT_MOBILE_PERMISSIONS.filter(p => formData.permissions_overrides[p.key]).length}/{SCOUT_MOBILE_PERMISSIONS.length}
                                    </span>
                                  </button>
                                </div>

                                {/* Note explicative : Habilitations de match terrain déplacées en Section 4 */}
                                {mobileAppSubTab === 'match' && (
                                  <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs flex items-start gap-2.5">
                                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                    <div className="space-y-1 text-[11px] text-blue-900/90 dark:text-blue-200/90">
                                      <span className="font-bold text-blue-950 dark:text-blue-100 flex items-center gap-1.5">
                                        <span>Habilitations Opérations Terrain & Direct</span>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/15 text-red-600 font-bold uppercase">Section 4 Dédiée</span>
                                      </span>
                                      <p className="leading-relaxed">
                                        La permission ci-dessous est globale et concerne uniquement la création de futurs matchs. Toutes les autres habilitations terrain (<strong>Live Tracking, Modification de feuille, Changement de système de jeu, Report et Évaluation</strong>) sont désormais gérées exclusivement dans la <strong>Section 4 « Matchs Assignés pour Opérations Live »</strong> ci-dessous.
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Grille de cartes de permissions Mobile */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {(mobileAppSubTab === 'match' ? MATCH_GLOBAL_PLANNING_PERMISSIONS : SCOUT_MOBILE_PERMISSIONS).map(perm => {
                                    const isChecked = Boolean(formData.permissions_overrides[perm.key]);
                                    return (
                                      <button
                                        key={perm.key}
                                        type="button"
                                        disabled={modalMode === 'view'}
                                        onClick={() => togglePermission(perm.key)}
                                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 min-h-[74px] ${isChecked
                                          ? 'bg-blue-500/15 border-blue-500 shadow-xs ring-1 ring-blue-500/30'
                                          : 'bg-background/90 border-border/80 hover:bg-secondary/40 hover:border-blue-300 dark:hover:border-blue-800'
                                          } disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer`}
                                      >
                                        <div className="mt-0.5 shrink-0">
                                          {isChecked ? (
                                            <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                              <Check className="w-3 h-3 stroke-[3]" />
                                            </div>
                                          ) : (
                                            <div className="w-4 h-4 rounded border border-muted-foreground/40 bg-transparent" />
                                          )}
                                        </div>
                                        <div className="space-y-1 min-w-0 flex-1">
                                          <div className="flex items-center justify-between gap-1 w-full">
                                            <span className="text-xs font-bold text-foreground truncate">
                                              {perm.label}
                                            </span>
                                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 shrink-0">
                                              {perm.badge}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                                            {perm.desc}
                                          </p>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* ── VOLET 2 : WEB DASHBOARD (fus-dashboard) — HIERARCHIE PAR SOUS-RUBRIQUE & ACTIONS CRUD ── */}
                              <div className="p-4 sm:p-5 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-purple-500/20">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400">
                                      <LayoutDashboard className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-bold text-purple-950 dark:text-purple-200">
                                        Web Dashboard — Gestion des Accès par Sous-Rubrique
                                      </h4>
                                      <p className="text-[10px] text-purple-800/80 dark:text-purple-300/80">
                                        Accordéons par rubrique métier avec contrôle granulaire des actions (Create, Read, Update, Delete)
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                      {(() => {
                                        const totalSub = DASHBOARD_HIERARCHY_MODULES.reduce((acc, cat) => acc + cat.subModules.length, 0);
                                        const activeSub = DASHBOARD_HIERARCHY_MODULES.reduce((acc, cat) =>
                                          acc + cat.subModules.filter(sub => Boolean(formData.permissions_overrides[`sub:${sub.id}:read`])).length, 0
                                        );
                                        return `${activeSub} / ${totalSub} sous-rubriques`;
                                      })()}
                                    </span>
                                    {modalMode !== 'view' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const allSubActive = DASHBOARD_HIERARCHY_MODULES.every(cat =>
                                            cat.subModules.every(sub => Boolean(formData.permissions_overrides[`sub:${sub.id}:read`]))
                                          );
                                          setFormData(prev => {
                                            const next = { ...prev.permissions_overrides };
                                            DASHBOARD_HIERARCHY_MODULES.forEach(cat => {
                                              cat.subModules.forEach(sub => {
                                                CRUD_ACTIONS.forEach(a => {
                                                  if (!allSubActive) {
                                                    next[`sub:${sub.id}:${a.key}`] = true;
                                                  } else {
                                                    delete next[`sub:${sub.id}:${a.key}`];
                                                  }
                                                });
                                              });
                                              if (!allSubActive) {
                                                next[`${cat.id}:read`] = true;
                                              } else {
                                                delete next[`${cat.id}:read`];
                                              }
                                            });
                                            if (!allSubActive) next['manage_recruitment'] = true;
                                            else delete next['manage_recruitment'];
                                            return { ...prev, permissions_overrides: next };
                                          });
                                        }}
                                        className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                                      >
                                        {DASHBOARD_HIERARCHY_MODULES.every(cat =>
                                          cat.subModules.every(sub => Boolean(formData.permissions_overrides[`sub:${sub.id}:read`]))
                                        ) ? 'Tout décocher' : 'Tout cocher'}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Liste des 4 grandes rubriques sous forme d'accordéons */}
                                <div className="space-y-3">
                                  {DASHBOARD_HIERARCHY_MODULES.map(cat => {
                                    const CatIcon = cat.icon;
                                    const isExpanded = Boolean(expandedCats[cat.id]);
                                    const activeSubCount = cat.subModules.filter(sub => Boolean(formData.permissions_overrides[`sub:${sub.id}:read`])).length;
                                    const allSubActive = activeSubCount === cat.subModules.length;
                                    const isCatPartiallyActive = activeSubCount > 0;

                                    return (
                                      <div
                                        key={cat.id}
                                        className={`rounded-2xl border transition-all overflow-hidden ${isCatPartiallyActive
                                          ? `${cat.colorBorder} ${cat.colorBg} shadow-xs`
                                          : 'border-border/80 bg-background/50 opacity-90'
                                          }`}
                                      >
                                        {/* Header de la rubrique (Accordéon trigger) */}
                                        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                          <button
                                            type="button"
                                            onClick={() => toggleCatExpand(cat.id)}
                                            className="flex items-start gap-3 text-left flex-1 min-w-0 cursor-pointer"
                                          >
                                            <div className={`p-2 rounded-xl shrink-0 mt-0.5 transition-colors ${isCatPartiallyActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                              }`}>
                                              <CatIcon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs sm:text-sm font-bold text-foreground">
                                                  {cat.title}
                                                </span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cat.colorBadge}`}>
                                                  {cat.badge}
                                                </span>
                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                                                  {activeSubCount} / {cat.subModules.length} sous-rubriques
                                                </span>
                                              </div>
                                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                                {cat.desc}
                                              </p>
                                            </div>
                                          </button>

                                          {/* Actions header : Tout cocher / Déplier */}
                                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                            {modalMode !== 'view' && (
                                              <button
                                                type="button"
                                                onClick={() => toggleCategoryAll(cat)}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${allSubActive
                                                  ? 'bg-purple-600 text-white shadow-xs'
                                                  : isCatPartiallyActive
                                                    ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/30'
                                                    : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
                                                  }`}
                                              >
                                                {allSubActive ? (
                                                  <>
                                                    <CheckSquare className="w-3 h-3" />
                                                    <span>Tout coché</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Square className="w-3 h-3" />
                                                    <span>Tout cocher ({activeSubCount}/{cat.subModules.length})</span>
                                                  </>
                                                )}
                                              </button>
                                            )}

                                            <button
                                              type="button"
                                              onClick={() => toggleCatExpand(cat.id)}
                                              className="p-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground transition-colors cursor-pointer"
                                              title={isExpanded ? 'Réduire' : 'Déplier'}
                                            >
                                              {isExpanded ? (
                                                <ChevronUp className="w-4 h-4" />
                                              ) : (
                                                <ChevronDown className="w-4 h-4" />
                                              )}
                                            </button>
                                          </div>
                                        </div>

                                        {/* Contenu de l'accordéon : Liste des sous-rubriques */}
                                        {isExpanded && (
                                          <div className="px-3.5 pb-4 sm:px-4 pt-1 border-t border-border/50 space-y-2.5 bg-background/40">
                                            {cat.subModules.map(sub => {
                                              const isSubReadActive = Boolean(formData.permissions_overrides[`sub:${sub.id}:read`]);
                                              const subActionsList = sub.id === 'players'
                                                ? [...CRUD_ACTIONS.map(a => a.key), ...PLAYER_SPECIFIC_ACTIONS.map(a => a.key)]
                                                : sub.id === 'candidates'
                                                  ? [...CRUD_ACTIONS.map(a => a.key), ...CANDIDATE_SPECIFIC_ACTIONS.map(a => a.key)]
                                                  : sub.id === 'matches'
                                                    ? [...CRUD_ACTIONS.map(a => a.key), ...MATCH_SPECIFIC_ACTIONS.map(a => a.key)]
                                                    : CRUD_ACTIONS.map(a => a.key);
                                              const activeActionsCount = subActionsList.filter(k => Boolean(formData.permissions_overrides[`sub:${sub.id}:${k}`])).length;

                                              return (
                                                <div
                                                  key={sub.id}
                                                  className={`p-3 rounded-xl border transition-all ${isSubReadActive
                                                    ? 'bg-background shadow-xs border-purple-500/30 ring-1 ring-purple-500/10'
                                                    : 'bg-background/70 border-border/70 opacity-75'
                                                    }`}
                                                >
                                                  {/* Ligne d'en-tête du sous-module avec Master Toggle */}
                                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/50">
                                                    <div className="min-w-0">
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-foreground">
                                                          {sub.title}
                                                        </span>
                                                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-secondary text-secondary-foreground">
                                                          {sub.badge}
                                                        </span>
                                                      </div>
                                                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                                        {sub.desc}
                                                      </p>
                                                    </div>

                                                    {/* Toggle de la sous-rubrique */}
                                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                                      <button
                                                        type="button"
                                                        disabled={modalMode === 'view'}
                                                        onClick={() => toggleSubModuleAll(sub.id, cat.id)}
                                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed ${isSubReadActive
                                                          ? 'bg-purple-600 text-white shadow-xs'
                                                          : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
                                                          }`}
                                                      >
                                                        {isSubReadActive ? (
                                                          <>
                                                            <CheckSquare className="w-3 h-3" />
                                                            <span>Actif ({activeActionsCount}/{subActionsList.length})</span>
                                                          </>
                                                        ) : (
                                                          <>
                                                            <Square className="w-3 h-3" />
                                                            <span>Désactivé</span>
                                                          </>
                                                        )}
                                                      </button>
                                                    </div>
                                                  </div>

                                                  {/* 4 Boutons CRUD pour la sous-rubrique */}
                                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                                                    {CRUD_ACTIONS.map(action => {
                                                      const permKey = `sub:${sub.id}:${action.key}`;
                                                      const isChecked = sub.id === 'matches' && action.key === 'create'
                                                        ? Boolean(formData.permissions_overrides['sub:matches:plan_match'])
                                                        : Boolean(formData.permissions_overrides[permKey]);

                                                      return (
                                                        <button
                                                          key={action.key}
                                                          type="button"
                                                          disabled={modalMode === 'view'}
                                                          onClick={() => toggleSubModuleAction(sub.id, action.key, cat.id)}
                                                          className={`p-1.5 sm:p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${isChecked
                                                            ? 'bg-purple-500/10 border-purple-500/40 shadow-xs ring-1 ring-purple-500/20'
                                                            : 'bg-muted/20 border-border/60 hover:bg-muted/40'
                                                            } disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer`}
                                                        >
                                                          <div className="shrink-0">
                                                            {isChecked ? (
                                                              <div className="w-4 h-4 rounded bg-purple-600 text-white flex items-center justify-center shadow-xs">
                                                                <Check className="w-3 h-3 stroke-[3]" />
                                                              </div>
                                                            ) : (
                                                              <div className="w-4 h-4 rounded border border-muted-foreground/40 bg-background" />
                                                            )}
                                                          </div>
                                                          <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between">
                                                              <span className="text-[11px] font-bold text-foreground">
                                                                {action.label}
                                                              </span>
                                                            </div>
                                                            <p className="text-[9px] text-muted-foreground truncate">
                                                              {action.sublabel}
                                                            </p>
                                                          </div>
                                                        </button>
                                                      );
                                                    })}
                                                  </div>

                                                  {/* Actions Spécifiques Dédiées aux Joueurs (US-DASH-57) */}
                                                  {sub.id === 'players' && (
                                                    <div className="mt-2.5 pt-2 border-t border-border/50">
                                                      <div className="flex items-center gap-1.5 mb-2">
                                                        <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                                                          Actions Métier Spécifiques (Fiche Joueur)
                                                        </span>
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                                                          Permissions Dédiées
                                                        </span>
                                                      </div>
                                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        {PLAYER_SPECIFIC_ACTIONS.map(action => {
                                                          const permKey = `sub:players:${action.key}`;
                                                          const isChecked = Boolean(formData.permissions_overrides[permKey]);
                                                          const IconComponent = action.icon;

                                                          return (
                                                            <button
                                                              key={action.key}
                                                              type="button"
                                                              disabled={modalMode === 'view'}
                                                              onClick={() => toggleSubModuleAction(sub.id, action.key, cat.id)}
                                                              className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2.5 ${isChecked
                                                                ? 'bg-amber-500/10 border-amber-500/40 shadow-xs ring-1 ring-amber-500/20'
                                                                : 'bg-muted/20 border-border/60 hover:bg-muted/40'
                                                                } disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer`}
                                                            >
                                                              <div className="shrink-0">
                                                                {isChecked ? (
                                                                  <div className="w-5 h-5 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
                                                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                                  </div>
                                                                ) : (
                                                                  <div className="w-5 h-5 rounded-lg border border-muted-foreground/40 bg-background flex items-center justify-center text-muted-foreground/60">
                                                                    <IconComponent className="w-3 h-3" />
                                                                  </div>
                                                                )}
                                                              </div>
                                                              <div className="min-w-0 flex-1">
                                                                <div className="flex items-center justify-between">
                                                                  <span className="text-[11px] font-bold text-foreground">
                                                                    {action.label}
                                                                  </span>
                                                                </div>
                                                                <p className="text-[9px] text-muted-foreground truncate">
                                                                  {action.sublabel}
                                                                </p>
                                                              </div>
                                                            </button>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  )}

                                                  {/* Actions Spécifiques Dédiées aux Candidats / Vivier (US-DASH-59) */}
                                                  {sub.id === 'candidates' && (
                                                    <div className="mt-2.5 pt-2 border-t border-border/50">
                                                      <div className="flex items-center gap-1.5 mb-2">
                                                        <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                                                          Actions Métier Spécifiques (Vivier Candidats)
                                                        </span>
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                                                          Permissions Dédiées
                                                        </span>
                                                      </div>
                                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                                        {CANDIDATE_SPECIFIC_ACTIONS.map(action => {
                                                          const permKey = `sub:candidates:${action.key}`;
                                                          const isChecked = Boolean(formData.permissions_overrides[permKey]);
                                                          const IconComponent = action.icon;

                                                          return (
                                                            <button
                                                              key={action.key}
                                                              type="button"
                                                              disabled={modalMode === 'view'}
                                                              onClick={() => toggleSubModuleAction(sub.id, action.key, cat.id)}
                                                              className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2.5 ${isChecked
                                                                ? 'bg-emerald-500/10 border-emerald-500/40 shadow-xs ring-1 ring-emerald-500/20'
                                                                : 'bg-muted/20 border-border/60 hover:bg-muted/40'
                                                                } disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer`}
                                                            >
                                                              <div className="shrink-0">
                                                                {isChecked ? (
                                                                  <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                                  </div>
                                                                ) : (
                                                                  <div className="w-5 h-5 rounded-lg border border-muted-foreground/40 bg-background flex items-center justify-center text-muted-foreground/60">
                                                                    <IconComponent className="w-3 h-3" />
                                                                  </div>
                                                                )}
                                                              </div>
                                                              <div className="min-w-0 flex-1">
                                                                <div className="flex items-center justify-between">
                                                                  <span className="text-[11px] font-bold text-foreground">
                                                                    {action.label}
                                                                  </span>
                                                                </div>
                                                                <p className="text-[9px] text-muted-foreground truncate">
                                                                  {action.sublabel}
                                                                </p>
                                                              </div>
                                                            </button>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  )}

                                                  {/* Actions Spécifiques : Calendrier des Matchs */}
                                                  {sub.id === 'matches' && (
                                                    <div className="mt-2.5 pt-2 border-t border-border/50">
                                                      <div className="flex items-center gap-1.5 mb-2">
                                                        <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                                                          Actions Métier Spécifiques (Calendrier des Matchs)
                                                        </span>
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                                                          Permissions Dédiées
                                                        </span>
                                                      </div>
                                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {MATCH_SPECIFIC_ACTIONS.map(action => {
                                                          const permKey = `sub:matches:${action.key}`;
                                                          const isChecked = Boolean(formData.permissions_overrides[permKey]);
                                                          const IconComponent = action.icon;
                                                          return (
                                                            <button
                                                              key={action.key}
                                                              type="button"
                                                              disabled={modalMode === 'view'}
                                                              onClick={() => toggleSubModuleAction(sub.id, action.key, cat.id)}
                                                              className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2.5 ${isChecked
                                                                ? 'bg-amber-500/10 border-amber-500/40 shadow-xs ring-1 ring-amber-500/20'
                                                                : 'bg-muted/20 border-border/60 hover:bg-muted/40'
                                                                } disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer`}
                                                            >
                                                              <div className="shrink-0">
                                                                {isChecked ? (
                                                                  <div className="w-5 h-5 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
                                                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                                  </div>
                                                                ) : (
                                                                  <div className="w-5 h-5 rounded-lg border border-muted-foreground/40 bg-background flex items-center justify-center text-muted-foreground/60">
                                                                    <IconComponent className="w-3 h-3" />
                                                                  </div>
                                                                )}
                                                              </div>
                                                              <div className="min-w-0 flex-1">
                                                                <div className="flex items-center justify-between">
                                                                  <span className="text-[11px] font-bold text-foreground">
                                                                    {action.label}
                                                                  </span>
                                                                </div>
                                                                <p className="text-[9px] text-muted-foreground truncate">
                                                                  {action.sublabel}
                                                                </p>
                                                              </div>
                                                            </button>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ── SECTION 4 : MATCHS ASSIGNÉS POUR OPÉRATIONS LIVE (fus-app & Direct) ── */}
                        <div className="p-5 rounded-2xl bg-secondary/20 border border-border/80 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-600" />
                              <label className="text-[11px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                <Radio className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                                4. Matchs Assignés pour Opérations Live (fus-app & Direct)
                              </label>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20">
                                {assignedMatchIds.length} match{assignedMatchIds.length > 1 ? 's' : ''} assigné{assignedMatchIds.length > 1 ? 's' : ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Sélectionnez les matchs que ce collaborateur pilotera en direct
                            </p>
                          </div>

                          {/* Note explicative Super Admin vs Opérateur Assigné */}
                          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border/70 text-xs flex items-start gap-2.5">
                            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div className="space-y-0.5 text-[11px] text-muted-foreground">
                              <span className="font-bold text-foreground">Règle d'Habilitation Terrain & Super Admin :</span>
                              <p>
                                Si aucun opérateur n'est assigné à un match, <strong>seul le Super Admin</strong> dispose des commandes (lancement live, chrono, modifications, scores).
                                Dès qu'un match est coché ci-dessous, ce collaborateur devient l'opérateur officiel habilité pour cette rencontre sur <code>fus-app</code> et le dashboard.
                              </p>
                            </div>
                          </div>

                          {/* A. Habilitations Opérationnelles sur les Matchs Assignés */}
                          <div className="p-4 rounded-xl bg-background/70 border border-border/80 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-red-500" />
                                <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                                  A. Habilitations Opérationnelles (Pour les Matchs Assignés)
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20 font-bold">
                                  {MATCH_OPERATION_PERMISSIONS.filter(p => formData.permissions_overrides[p.key]).length}/{MATCH_OPERATION_PERMISSIONS.length} actives
                                </span>
                              </div>
                              {modalMode !== 'view' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allActive = MATCH_OPERATION_PERMISSIONS.every(p => formData.permissions_overrides[p.key]);
                                    setFormData(prev => {
                                      const next = { ...prev.permissions_overrides };
                                      MATCH_OPERATION_PERMISSIONS.forEach(p => {
                                        if (allActive) delete next[p.key];
                                        else next[p.key] = true;
                                      });
                                      return { ...prev, permissions_overrides: next };
                                    });
                                  }}
                                  className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                                >
                                  {MATCH_OPERATION_PERMISSIONS.every(p => formData.permissions_overrides[p.key]) ? 'Tout décocher' : 'Tout cocher'}
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Cochez les actions que ce collaborateur sera habilité à effectuer sur les rencontres qui lui sont assignées ci-dessous :
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                              {MATCH_OPERATION_PERMISSIONS.map(perm => {
                                const isChecked = Boolean(formData.permissions_overrides[perm.key]);
                                return (
                                  <button
                                    key={perm.key}
                                    type="button"
                                    disabled={modalMode === 'view'}
                                    onClick={() => togglePermission(perm.key)}
                                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 min-h-[70px] ${isChecked
                                      ? 'bg-red-500/10 border-red-500 shadow-xs ring-1 ring-red-500/30'
                                      : 'bg-background/90 border-border/80 hover:bg-secondary/40 hover:border-red-300 dark:hover:border-red-800'
                                      } disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer`}
                                  >
                                    <div className="mt-0.5 shrink-0">
                                      {isChecked ? (
                                        <div className="w-4 h-4 rounded bg-[#FF3737] text-white flex items-center justify-center shadow-xs">
                                          <Check className="w-3 h-3 stroke-[3]" />
                                        </div>
                                      ) : (
                                        <div className="w-4 h-4 rounded border border-muted-foreground/40 bg-transparent" />
                                      )}
                                    </div>
                                    <div className="space-y-1 min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-1 w-full">
                                        <span className="text-xs font-bold text-foreground truncate">
                                          {perm.label}
                                        </span>
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-500/15 text-red-600 dark:text-red-400 shrink-0">
                                          {perm.badge}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                                        {perm.desc}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* B. Rencontres Attribuées */}
                          {(() => {
                            const isUserCovered = (m: OperableMatch) => {
                              return (
                                assignedMatchIds.includes(m.id) ||
                                Boolean(
                                  m.live_operator_id &&
                                  selectedUserId &&
                                  String(m.live_operator_id).toLowerCase() === String(selectedUserId).toLowerCase()
                                )
                              );
                            };

                            const isProgrammedOrLive = (m: OperableMatch) => {
                              if (isMatchExpiredUnlaunched(m)) return false;
                              return m.status !== 'finished' && m.status !== 'cancelled';
                            };

                            // Seuls les matchs programmés non expirés (ou en direct) ET les matchs non expirés couverts par le user sont éligibles
                            const eligibleMatches = operableMatches.filter(m => {
                              if (isMatchExpiredUnlaunched(m)) return false;
                              return isProgrammedOrLive(m) || isUserCovered(m);
                            });

                            const filteredList = eligibleMatches.filter(m => {
                              if (matchFilterScope === 'programmed') return isProgrammedOrLive(m);
                              if (matchFilterScope === 'covered') return isUserCovered(m);
                              return true;
                            });

                            const programmedCount = eligibleMatches.filter(isProgrammedOrLive).length;
                            const coveredCount = eligibleMatches.filter(isUserCovered).length;

                            return (
                              <>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 pb-1 border-b border-border/40">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Calendar className="w-4 h-4 text-foreground" />
                                    <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                                      B. Rencontres Attribuées à cet Opérateur
                                    </span>
                                    {assignedMatchIds.length > 0 && (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-500/15 text-red-500 border border-red-500/30 flex items-center gap-1 shadow-xs">
                                        <Check className="w-3 h-3 stroke-[3]" />
                                        {assignedMatchIds.length} attribué{assignedMatchIds.length > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {/* Filtres rapides : Tous / Programmés / Couverts */}
                                    <div className="inline-flex items-center p-0.5 rounded-lg bg-secondary/80 border border-border/60 text-[10px] font-bold">
                                      <button
                                        type="button"
                                        onClick={() => setMatchFilterScope('all')}
                                        className={`px-2 py-0.5 rounded-md transition-all ${matchFilterScope === 'all'
                                          ? 'bg-primary text-primary-foreground shadow-xs'
                                          : 'text-muted-foreground hover:text-foreground'
                                          }`}
                                      >
                                        Tous ({eligibleMatches.length})
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setMatchFilterScope('programmed')}
                                        className={`px-2 py-0.5 rounded-md transition-all ${matchFilterScope === 'programmed'
                                          ? 'bg-primary text-primary-foreground shadow-xs'
                                          : 'text-muted-foreground hover:text-foreground'
                                          }`}
                                      >
                                        Programmés ({programmedCount})
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setMatchFilterScope('covered')}
                                        className={`px-2 py-0.5 rounded-md transition-all ${matchFilterScope === 'covered'
                                          ? 'bg-primary text-primary-foreground shadow-xs'
                                          : 'text-muted-foreground hover:text-foreground'
                                          }`}
                                      >
                                        Couverts ({coveredCount})
                                      </button>
                                    </div>

                                    {assignedMatchIds.length > 0 && modalMode !== 'view' && (
                                      <button
                                        type="button"
                                        onClick={() => setAssignedMatchIds([])}
                                        className="text-[11px] font-bold text-red-500 hover:text-red-400 hover:underline flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                                        title="Décocher toutes les rencontres attribuées à cet utilisateur"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                        <span>Tout décocher ({assignedMatchIds.length})</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Liste des Cartes de Matchs */}
                                {loadingMatches ? (
                                  <div className="py-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                    <span>Chargement du calendrier des matchs...</span>
                                  </div>
                                ) : filteredList.length === 0 ? (
                                  <div className="p-6 text-center rounded-xl bg-background/50 border border-dashed border-border/80 text-xs text-muted-foreground">
                                    {matchFilterScope === 'covered'
                                      ? 'Aucun match couvert par cet opérateur pour le moment.'
                                      : matchFilterScope === 'programmed'
                                        ? 'Aucun match programmé disponible actuellement.'
                                        : 'Aucun match programmé ou attribué à cet opérateur pour le moment.'}
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                                    {(() => {
                                      // Trier les matchs : Attribués EN PREMIER, puis en direct, puis programmés, puis terminés
                                      const sortedList = [...filteredList].sort((a, b) => {
                                        const aAssigned = assignedMatchIds.includes(a.id);
                                        const bAssigned = assignedMatchIds.includes(b.id);
                                        if (aAssigned && !bAssigned) return -1;
                                        if (!aAssigned && bAssigned) return 1;

                                        const isLiveStatus = (s: string) => ['live', 'halftime', 'paused', 'extra_time', 'penalties'].includes(s);
                                        if (isLiveStatus(a.status) && !isLiveStatus(b.status)) return -1;
                                        if (!isLiveStatus(a.status) && isLiveStatus(b.status)) return 1;

                                        const aIsFuture = isProgrammedOrLive(a);
                                        const bIsFuture = isProgrammedOrLive(b);
                                        if (aIsFuture && bIsFuture) {
                                          return new Date(a.match_date || 0).getTime() - new Date(b.match_date || 0).getTime();
                                        }

                                        return new Date(b.match_date || 0).getTime() - new Date(a.match_date || 0).getTime();
                                      });

                                      return sortedList.map(m => {
                                        const isAssigned = assignedMatchIds.includes(m.id);
                                        const isAssignedToOther = Boolean(m.live_operator_id && m.live_operator_id !== selectedUserId && !isAssigned);

                                        const renderMatchStatus = () => {
                                          switch (m.status) {
                                            case 'live':
                                              return (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-red-600 text-white animate-pulse shadow-xs">
                                                  🔴 En Direct
                                                </span>
                                              );
                                            case 'halftime':
                                              return (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-500 text-white shadow-xs">
                                                  ⏸️ Mi-Temps
                                                </span>
                                              );
                                            case 'paused':
                                              return (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-600 text-white shadow-xs">
                                                  ⏸️ Pause
                                                </span>
                                              );
                                            case 'extra_time':
                                              return (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-red-700 text-white animate-pulse">
                                                  ⏱️ Prolongations
                                                </span>
                                              );
                                            case 'penalties':
                                              return (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-red-800 text-white animate-pulse">
                                                  🥅 Tirs au But
                                                </span>
                                              );
                                            case 'finished':
                                              return (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-muted text-muted-foreground border border-border">
                                                  🏁 Terminé
                                                </span>
                                              );
                                            case 'cancelled':
                                              return (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-rose-500/20 text-rose-500 border border-rose-500/30">
                                                  ❌ Annulé
                                                </span>
                                              );
                                            default:
                                              return (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-secondary text-muted-foreground border border-border">
                                                  📅 Programmé
                                                </span>
                                              );
                                          }
                                        };

                                        return (
                                          <div
                                            key={m.id}
                                            onClick={() => {
                                              if (modalMode === 'view') return;
                                              toggleAssignMatch(m.id);
                                            }}
                                            className={`p-3.5 rounded-2xl border transition-all text-left relative flex flex-col justify-between gap-2.5 ${modalMode === 'view' ? 'cursor-default' : 'cursor-pointer hover:border-red-500/50'
                                              } ${isAssigned
                                                ? 'bg-red-500/10 border-red-500 shadow-sm ring-1 ring-red-500/40'
                                                : 'bg-background/80 border-border/80 hover:bg-secondary/40'
                                              }`}
                                          >
                                            {/* Header de la carte : Catégorie Badge & Status */}
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#FF3737] text-white shadow-xs">
                                                  {m.category || 'Équipe'}
                                                </span>
                                                {renderMatchStatus()}
                                              </div>

                                              {/* Checkbox / Statut d'attribution */}
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                {isAssigned ? (
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-black text-red-500 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-lg hidden sm:inline-flex items-center gap-1">
                                                      <Check className="w-3 h-3 stroke-[3]" />
                                                      Attribué (décocher)
                                                    </span>
                                                    <div className="w-5 h-5 rounded-lg border flex items-center justify-center transition-all bg-[#FF3737] border-[#FF3737] text-white shadow-xs">
                                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-medium text-muted-foreground hidden sm:inline">
                                                      Cliquer pour attribuer
                                                    </span>
                                                    <div className="w-5 h-5 rounded-lg border border-muted-foreground/30 bg-background text-transparent flex items-center justify-center transition-all">
                                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {/* Clubs & Logos */}
                                            <div className="flex items-center justify-between gap-2 py-1.5 bg-secondary/40 rounded-xl px-3 border border-border/50">
                                              {/* Domicile */}
                                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <div className="flex flex-col items-center shrink-0">
                                                  <div className="w-7 h-7 rounded-lg bg-background border border-border/60 flex items-center justify-center overflow-hidden shadow-xs">
                                                    {m.homeLogo ? (
                                                      <img
                                                        src={m.homeLogo}
                                                        alt={m.homeName}
                                                        className="w-full h-full object-contain p-0.5"
                                                        onError={(e) => {
                                                          const target = e.currentTarget;
                                                          target.onerror = null;
                                                          target.src = defaultClubLogo;
                                                        }}
                                                      />
                                                    ) : (
                                                      <span className="text-[10px] font-black text-muted-foreground">
                                                        {m.homeName?.slice(0, 2).toUpperCase() || 'DOM'}
                                                      </span>
                                                    )}
                                                  </div>
                                                  {m.homeFormation && (
                                                    <span className="text-[8px] font-black text-muted-foreground mt-0.5 tracking-tight">
                                                      {m.homeFormation}
                                                    </span>
                                                  )}
                                                </div>
                                                <span className="text-xs font-bold text-foreground truncate" title={m.homeName}>
                                                  {m.homeName}
                                                </span>
                                              </div>

                                              <span className="text-[10px] font-black text-muted-foreground/60 px-1 shrink-0">VS</span>

                                              {/* Extérieur */}
                                              <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                                                <span className="text-xs font-bold text-foreground truncate" title={m.awayName}>
                                                  {m.awayName}
                                                </span>
                                                <div className="flex flex-col items-center shrink-0">
                                                  <div className="w-7 h-7 rounded-lg bg-background border border-border/60 flex items-center justify-center overflow-hidden shadow-xs">
                                                    {m.awayLogo ? (
                                                      <img
                                                        src={m.awayLogo}
                                                        alt={m.awayName}
                                                        className="w-full h-full object-contain p-0.5"
                                                        onError={(e) => {
                                                          const target = e.currentTarget;
                                                          target.style.display = 'none';
                                                          if (target.parentElement) {
                                                            const span = document.createElement('span');
                                                            span.className = 'text-[10px] font-black text-muted-foreground';
                                                            span.innerText = m.awayName?.slice(0, 2).toUpperCase() || 'EXT';
                                                            target.parentElement.appendChild(span);
                                                          }
                                                        }}
                                                      />
                                                    ) : (
                                                      <span className="text-[10px] font-black text-muted-foreground">
                                                        {m.awayName?.slice(0, 2).toUpperCase() || 'EXT'}
                                                      </span>
                                                    )}
                                                  </div>
                                                  {m.awayFormation && (
                                                    <span className="text-[8px] font-black text-muted-foreground mt-0.5 tracking-tight">
                                                      {m.awayFormation}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            {/* Date, Heure & Stade */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                              <div className="flex items-center gap-1.5 font-medium">
                                                <CalendarPlus className="w-3.5 h-3.5 text-primary shrink-0" />
                                                <span>
                                                  {m.match_date ? new Date(m.match_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Date TBD'}
                                                  {m.match_time ? ` à ${m.match_time.slice(0, 5)}` : ''}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1.5 font-medium truncate" title={m.stadiumName}>
                                                <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                <span className="truncate">{m.stadiumName}</span>
                                              </div>
                                            </div>

                                            {/* Accusé de réception de l'opérateur (US-MATCH-125) */}
                                            {isAssigned && (
                                              <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                                                {m.live_operator_acknowledged_at || m.live_operator_status === 'acknowledged' ? (
                                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                    <span>
                                                      Accusé de réception validé
                                                      {m.live_operator_acknowledged_at && (
                                                        <span className="opacity-80 font-normal ml-1">
                                                          ({new Date(m.live_operator_acknowledged_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à {new Date(m.live_operator_acknowledged_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})
                                                        </span>
                                                      )}
                                                    </span>
                                                  </div>
                                                ) : (
                                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold animate-pulse">
                                                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                    <span>⏳ En attente d'accusé mobile (fus-app)</span>
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                            {/* Alerte si déjà assigné à un autre opérateur */}
                                            {isAssignedToOther && (
                                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                                                <span>⚠️ Actuellement assigné à :</span>
                                                <strong className="truncate">{m.live_operator_name || 'Autre collaborateur'}</strong>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Modal Action Buttons */}
                  <div className="pt-5 flex items-center justify-end gap-3 border-t border-border">
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-5 rounded-xl font-bold text-xs"
                      onClick={() => setModalMode('none')}
                    >
                      {modalMode === 'view' ? 'Fermer' : 'Annuler'}
                    </Button>

                    {modalMode === 'view' && selectedUserId && (
                      <Button
                        type="button"
                        onClick={() => {
                          const target = users.find(u => u.id === selectedUserId);
                          if (target) openCredentialsQuickModal(target);
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 gap-2 cursor-pointer"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span>Générer / Renvoyer Accès</span>
                      </Button>
                    )}

                    {modalMode !== 'view' && (
                      <Button
                        type="button"
                        className="px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 cursor-pointer"
                        onClick={modalMode === 'create' ? handleCreateUser : handleUpdateUser}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        ) : (
                          modalMode === 'create' ? 'Créer le Compte' : 'Enregistrer les Modifications'
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      )}

      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => {
          setFormData(prev => ({ ...prev, avatar_url: url }));
          setAvatarPreview(url);
          setAvatarFile(null);
        }}
        title="Affecter une photo depuis la Médiathèque"
      />

      <ImageCropperModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        imageSrc={selectedFileUrl}
        onCropComplete={handleCropComplete}
        cropShape="round"
        title="Recadrer l'Avatar Utilisateur"
        description="Ajustez le zoom et cadrez le visage pour la photo de profil"
      />
    </div>
  );
};

export default UserManagement;
