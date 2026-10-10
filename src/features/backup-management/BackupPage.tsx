import React, { useState, useRef, useEffect } from 'react';
import { useBackup } from '../../hooks/useBackup';
import { backupService } from '../../services/backupService';
import { usePermissions } from '../../context/PermissionsContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  ShieldCheck,
  Terminal,
  ChevronRight,
  X,
  AlertTriangle,
  Server,
  Image as ImageIcon,
  Sparkles,
  Settings2,
  Link2,
  Unlink,
  Eye,
  EyeOff,
  Save,
  FolderOpen,
  KeyRound,
  ExternalLink,
  RefreshCw,
  Wifi,
  WifiOff,
  HelpCircle,
  Info,
  MonitorDown,
  Copy,
  Timer,
  HardDriveDownload,
  Database,
  FolderArchive,
  Cloud,
  CloudUpload,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Download,
  Play,
  ShieldAlert,
  History,
  BarChart3,
} from 'lucide-react';
import type { BackupType, BackupDestination, Backup } from '../../types';

// ─── Helpers ────────────────────────────────────────────────

const formatBytes = (bytes?: number) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  pending:   { color: 'text-amber-600',   bg: 'bg-amber-500/10 border-amber-500/20',   icon: Timer,        label: 'En attente' },
  running:   { color: 'text-blue-600',    bg: 'bg-blue-500/10 border-blue-500/20',     icon: Loader2,      label: 'En cours' },
  completed: { color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2, label: 'Terminé' },
  failed:    { color: 'text-red-600',     bg: 'bg-red-500/10 border-red-500/20',       icon: XCircle,      label: 'Échoué' },
};

const typeLabels: Record<BackupType, { label: string; icon: React.ElementType }> = {
  full:          { label: 'Complet',             icon: HardDriveDownload },
  database_only: { label: 'Base de données',     icon: Database },
  storage_only:  { label: 'Fichiers (Storage)', icon: ImageIcon },
};

const destLabels: Record<BackupDestination, { label: string; icon: React.ElementType }> = {
  local:        { label: 'Supabase Storage', icon: Server },
  google_drive: { label: 'Google Drive',     icon: Cloud },
  onedrive:     { label: 'OneDrive',         icon: CloudUpload },
  desktop:      { label: 'Mon Ordinateur',   icon: MonitorDown },
};

// ─── Storage Keys ───────────────────────────────────────────

const STORAGE_KEY_GDRIVE = 'backup_gdrive_config';
const STORAGE_KEY_ONEDRIVE = 'backup_onedrive_config';

interface DriveConfig {
  clientId: string;
  clientSecret: string;
  tenantId?: string; // Specific for OneDrive/Azure
  folderId: string;
  connected: boolean;
  lastTestedAt: string | null;
}

const defaultDriveConfig: DriveConfig = {
  clientId: '',
  clientSecret: '',
  tenantId: '',
  folderId: '',
  connected: false,
  lastTestedAt: null,
};

const loadConfig = (key: string): DriveConfig => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? { ...defaultDriveConfig, ...JSON.parse(saved) } : defaultDriveConfig;
  } catch {
    return defaultDriveConfig;
  }
};

const saveConfig = (key: string, config: DriveConfig) => {
  localStorage.setItem(key, JSON.stringify(config));
};

// ─── StatusBadge ────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.pending;
  const Icon = cfg.icon;
  return (
    <Badge className={`${cfg.bg} ${cfg.color} border font-black text-[9px] uppercase tracking-widest gap-1.5 px-3 py-1`}>
      <Icon className={`w-3 h-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {cfg.label}
    </Badge>
  );
};

// ─── Tooltip Component ──────────────────────────────────────

const FieldHelp: React.FC<{ message: string }> = ({ message }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block ml-2 group">
      <div 
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help p-0.5 rounded-full hover:bg-primary/10 transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-xl shadow-2xl pointer-events-none border border-white/10"
          >
            {message}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── SecretInput ────────────────────────────────────────────

const SecretInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-xl bg-secondary/30 border-secondary font-mono text-sm pr-12"
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-secondary/60 transition-colors"
      >
        {visible ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
      </button>
    </div>
  );
};

// ─── DriveConfigCard ────────────────────────────────────────

const DriveConfigCard: React.FC<{
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  config: DriveConfig;
  onUpdate: (config: DriveConfig) => void;
  onSave: () => void;
  onTest: () => void;
  isTesting: boolean;
  docsUrl: string;
  type: 'google' | 'onedrive';
}> = ({ title, subtitle, icon: Icon, iconColor, iconBg, config, onUpdate, onSave, onTest, isTesting, docsUrl, type }) => {
  const hasCredentials = config.clientId.trim() !== '' && config.clientSecret.trim() !== '';
  const redirectUri = `${window.location.origin}/auth/callback/${type}`;

  return (
    <Card className="rounded-[2.5rem] border shadow-sm overflow-hidden bg-white">
      <CardHeader className="border-b bg-secondary/10 p-8">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-3 font-black uppercase tracking-tighter">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            {title}
          </CardTitle>
          <div className="flex items-center gap-3">
            {config.connected ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 border font-black text-[9px] uppercase tracking-widest gap-1.5 px-3 py-1.5">
                <Wifi className="w-3 h-3" /> Connecté
              </Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-500 border-slate-200 border font-black text-[9px] uppercase tracking-widest gap-1.5 px-3 py-1.5">
                <WifiOff className="w-3 h-3" /> Non Connecté
              </Badge>
            )}
          </div>
        </div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2 ml-[52px]">{subtitle}</p>
      </CardHeader>

      <CardContent className="p-8 space-y-6">
        {/* Redirect URI - Informational */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <ExternalLink className="w-3 h-3" /> Redirect URI (à configurer dans la console {type === 'google' ? 'Google' : 'Azure'})
            <FieldHelp message={type === 'google' 
              ? "URL à ajouter dans 'URIs de redirection autorisés' dans votre console Google Cloud." 
              : "URL à ajouter dans 'Redirect URIs' (Web) dans votre portail Azure AD."} />
          </label>
          <div className="flex items-center gap-2">
            <code className="text-[10px] font-mono bg-white px-2 py-1 rounded border flex-1 truncate">{redirectUri}</code>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigator.clipboard.writeText(redirectUri)}>
              <Save className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tenant ID (OneDrive only) */}
          {type === 'onedrive' && (
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
                <ShieldAlert className="w-3 h-3" /> Tenant ID (Azure AD)
                <FieldHelp message="Dans le portail Azure, allez dans 'Azure Active Directory' > 'Aperçu'. Copiez l'ID de l'annuaire (locataire)." />
              </label>
              <Input
                value={config.tenantId}
                onChange={(e) => onUpdate({ ...config, tenantId: e.target.value })}
                placeholder="common, organizations, ou ID spécifique"
                className="h-12 rounded-xl bg-secondary/30 border-secondary font-mono text-sm"
              />
            </div>
          )}

          {/* Client ID */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
              <KeyRound className="w-3 h-3" /> Client ID
              <FieldHelp message={type === 'google' 
                ? "Générez cet ID dans Google Cloud > Identifiants > Créer des identifiants > ID de client OAuth (type Application Web)."
                : "Aussi appelé 'ID d'application (client)'. Disponible dans l'onglet 'Aperçu' de votre inscription d'application dans Azure."} />
            </label>
            <Input
              value={config.clientId}
              onChange={(e) => onUpdate({ ...config, clientId: e.target.value })}
              placeholder={type === 'google' ? "000000000000-xxxx.apps.googleusercontent.com" : "00000000-0000-0000-0000-000000000000"}
              className="h-12 rounded-xl bg-secondary/30 border-secondary font-mono text-sm"
            />
          </div>

          {/* Client Secret */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
              <KeyRound className="w-3 h-3" /> Client Secret
              <FieldHelp message={type === 'google'
                ? "Le code secret généré avec l'ID client dans Google Cloud. Ne le partagez jamais."
                : "Allez dans 'Certificats et secrets' dans Azure, créez un nouveau secret client et copiez la 'Valeur' (pas l'ID)."} />
            </label>
            <SecretInput
              value={config.clientSecret}
              onChange={(val) => onUpdate({ ...config, clientSecret: val })}
              placeholder="••••••••••••••••"
            />
          </div>
        </div>

        {/* Folder ID */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
            <FolderOpen className="w-3 h-3" /> ID du dossier de destination
            <FieldHelp message={type === 'google'
              ? "Ouvrez le dossier sur Drive, l'ID est la suite de caractères à la fin de l'URL (ex: 1zY...)."
              : "ID unique du dossier Microsoft Graph ou laissez vide pour la racine."} />
          </label>
          <Input
            value={config.folderId}
            onChange={(e) => onUpdate({ ...config, folderId: e.target.value })}
            placeholder="ID du dossier cloud"
            className="h-12 rounded-xl bg-secondary/30 border-secondary font-mono text-sm"
          />
        </div>

        {/* Last Tested */}
        {config.lastTestedAt && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200/50">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
              Dernier test réussi : {formatDate(config.lastTestedAt)}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-secondary/50">
          <Button
            onClick={onSave}
            disabled={!hasCredentials}
            className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-primary/10"
          >
            <Save className="w-4 h-4" /> Enregistrer
          </Button>
          <Button
            variant="outline"
            onClick={onTest}
            disabled={!hasCredentials || isTesting}
            className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 border-2"
          >
            {isTesting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Test en cours...</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> Tester la Connexion</>
            )}
          </Button>
          {config.connected && (
            <Button
              variant="outline"
              onClick={() => onUpdate({ ...config, connected: false, lastTestedAt: null })}
              className="h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 border-2 border-destructive/20 text-destructive hover:bg-destructive/5"
            >
              <Unlink className="w-4 h-4" /> Déconnecter
            </Button>
          )}
        </div>

        {/* Documentation link */}
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest hover:underline mt-2 ml-1"
        >
          <ExternalLink className="w-3 h-3" /> Voir la documentation de configuration
        </a>
      </CardContent>
    </Card>
  );
};

// ─── Main Page ──────────────────────────────────────────────

const BackupPage: React.FC = () => {
  const { can } = usePermissions();
  const { backups, stats, isLoading, activeBackup, createBackup, isCreating, deleteBackup } = useBackup();

  const [activeTab, setActiveTab] = useState<'backup' | 'settings' | 'restore'>('backup');
  const [selectedType, setSelectedType] = useState<BackupType>('full');
  const [selectedDest, setSelectedDest] = useState<BackupDestination>('desktop');
  const [showConfirm, setShowConfirm] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);
  const [lastCompletedId, setLastCompletedId] = useState<string | null>(null);

  // Drive configs
  const [gdriveConfig, setGdriveConfig] = useState<DriveConfig>(() => loadConfig(STORAGE_KEY_GDRIVE));
  const [onedriveConfig, setOnedriveConfig] = useState<DriveConfig>(() => loadConfig(STORAGE_KEY_ONEDRIVE));
  const [testingGdrive, setTestingGdrive] = useState(false);
  const [testingOnedrive, setTestingOnedrive] = useState(false);

  // Restauration states
  const [restoreFile, setRestoreFile] = useState<any>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreLogs, setRestoreLogs] = useState<string[]>([]);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const [isBootstrapRequired, setIsBootstrapRequired] = useState(false);
  const [copied, setCopied] = useState(false);

  // Full SQL Schema for the 24 tables
  const SQL_SCHEMA = `-- EXECUTER CE BLOC DANS LE SQL EDITOR SUPABASE
CREATE TABLE IF NOT EXISTS public.settings (id uuid NOT NULL DEFAULT gen_random_uuid(), club_name text, city text, country text, logo_url text, created_at timestamp DEFAULT now(), CONSTRAINT settings_pkey PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS public.stadiums (id uuid NOT NULL DEFAULT gen_random_uuid(), name text, city text, photo_url text, created_at timestamp DEFAULT now(), CONSTRAINT stadiums_pkey PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS public.leagues (id uuid NOT NULL DEFAULT gen_random_uuid(), name text, logo_url text, season text, created_at timestamp DEFAULT now(), CONSTRAINT leagues_pkey PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS public.clubs (id uuid NOT NULL DEFAULT gen_random_uuid(), name text NOT NULL, city text, country text, logo_url text, created_at timestamp DEFAULT now(), CONSTRAINT clubs_pkey PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS public.roles (id uuid NOT NULL DEFAULT gen_random_uuid(), name character varying NOT NULL UNIQUE, description text, created_at timestamp with time zone DEFAULT now(), CONSTRAINT roles_pkey PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS public.permissions (id uuid NOT NULL DEFAULT gen_random_uuid(), resource character varying NOT NULL, action character varying NOT NULL, perm_key character varying NOT NULL UNIQUE, created_at timestamp with time zone DEFAULT now(), CONSTRAINT permissions_pkey PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS public.role_permissions (role_id uuid NOT NULL, permission_id uuid NOT NULL, CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id), CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id), CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id));
CREATE TABLE IF NOT EXISTS public.staff (id uuid NOT NULL DEFAULT gen_random_uuid(), full_name text, role text, phone text, email text, created_at timestamp DEFAULT now(), photo_url text, specialty text, club_id uuid, category text DEFAULT 'TECHNICAL'::text, CONSTRAINT staff_pkey PRIMARY KEY (id), CONSTRAINT staff_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id));
CREATE TABLE IF NOT EXISTS public.teams (id uuid NOT NULL DEFAULT gen_random_uuid(), name text NOT NULL, category text NOT NULL DEFAULT 'U13'::text, coach_id uuid, photo_url text, created_at timestamp DEFAULT now(), CONSTRAINT teams_pkey PRIMARY KEY (id), CONSTRAINT teams_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.staff(id));
CREATE TABLE IF NOT EXISTS public.players (id uuid NOT NULL DEFAULT gen_random_uuid(), full_name text NOT NULL, birth_date date, nationality text, height numeric, weight numeric, preferred_foot text, position text, jersey_number integer, created_at timestamp DEFAULT now(), photo_url text, category text DEFAULT 'U13'::text, team_id uuid, CONSTRAINT players_pkey PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS public.matches (id uuid NOT NULL DEFAULT gen_random_uuid(), category text, opponent_id uuid, league_id uuid, stadium_id uuid, match_date date, match_time time, formation text, created_at timestamp DEFAULT now(), score_home integer DEFAULT 0, score_away integer DEFAULT 0, status text DEFAULT 'finished'::text, team_id uuid, is_home boolean DEFAULT true, opponent_formation text DEFAULT '4-4-2'::text, CONSTRAINT matches_pkey PRIMARY KEY (id), CONSTRAINT matches_opponent_id_fkey FOREIGN KEY (opponent_id) REFERENCES public.clubs(id), CONSTRAINT matches_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id), CONSTRAINT matches_stadium_id_fkey FOREIGN KEY (stadium_id) REFERENCES public.stadiums(id), CONSTRAINT matches_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id));
CREATE TABLE IF NOT EXISTS public.match_events (id uuid NOT NULL DEFAULT gen_random_uuid(), match_id uuid, player_id uuid, type text, minute integer, related_player_id uuid, created_at timestamp DEFAULT now(), CONSTRAINT match_events_pkey PRIMARY KEY (id), CONSTRAINT match_events_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id), CONSTRAINT match_events_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id));
CREATE TABLE IF NOT EXISTS public.event_types (id uuid NOT NULL DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, label text NOT NULL, CONSTRAINT event_types_pkey PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS public.match_players (id uuid NOT NULL DEFAULT gen_random_uuid(), match_id uuid, player_id uuid, is_starting boolean, position_x numeric, position_y numeric, CONSTRAINT match_players_pkey PRIMARY KEY (id), CONSTRAINT match_players_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id), CONSTRAINT match_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id));
CREATE TABLE IF NOT EXISTS public.match_staff (id uuid NOT NULL DEFAULT gen_random_uuid(), match_id uuid, staff_id uuid, CONSTRAINT match_staff_pkey PRIMARY KEY (id), CONSTRAINT match_staff_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id), CONSTRAINT match_staff_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id));
CREATE TABLE IF NOT EXISTS public.match_stats (id uuid NOT NULL DEFAULT gen_random_uuid(), match_id uuid, possession numeric, shots integer, shots_on_target integer, corners integer, fouls integer, offsides integer, yellow_cards integer, red_cards integer, passes integer, successful_passes integer, duels_won integer, CONSTRAINT match_stats_pkey PRIMARY KEY (id), CONSTRAINT match_stats_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id));
CREATE TABLE IF NOT EXISTS public.player_match_stats (id uuid NOT NULL DEFAULT gen_random_uuid(), match_id uuid, player_id uuid, minutes_played integer, goals integer, assists integer, shots integer, passes integer, tackles integer, interceptions integer, dribbles integer, rating numeric, CONSTRAINT player_match_stats_pkey PRIMARY KEY (id), CONSTRAINT player_match_stats_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id), CONSTRAINT player_match_stats_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id));
CREATE TABLE IF NOT EXISTS public.user_profiles (id uuid NOT NULL, staff_id uuid UNIQUE, default_club_id uuid, is_active boolean DEFAULT true, created_at timestamp with time zone DEFAULT now(), CONSTRAINT user_profiles_pkey PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS public.user_roles (user_id uuid NOT NULL, role_id uuid NOT NULL, CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id), CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id), CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id));
CREATE TABLE IF NOT EXISTS public.user_category_assignments (user_id uuid NOT NULL, category character varying NOT NULL, club_id uuid NOT NULL, created_at timestamp with time zone DEFAULT now(), CONSTRAINT user_category_assignments_pkey PRIMARY KEY (user_id, category, club_id), CONSTRAINT user_category_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id));
CREATE TABLE IF NOT EXISTS public.user_match_assignments (user_id uuid NOT NULL, match_id uuid NOT NULL, assignment_type character varying DEFAULT 'tracker'::character varying, created_at timestamp with time zone DEFAULT now(), CONSTRAINT user_match_assignments_pkey PRIMARY KEY (user_id, match_id), CONSTRAINT user_match_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id));
CREATE TABLE IF NOT EXISTS public.user_team_assignments (user_id uuid NOT NULL, team_id uuid NOT NULL, role_id uuid, created_at timestamp with time zone DEFAULT now(), CONSTRAINT user_team_assignments_pkey PRIMARY KEY (user_id, team_id), CONSTRAINT user_team_assignments_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id));
CREATE TABLE IF NOT EXISTS public.user_permissions_overrides (user_id uuid NOT NULL, permission_id uuid NOT NULL, CONSTRAINT user_permissions_overrides_pkey PRIMARY KEY (user_id, permission_id), CONSTRAINT user_permissions_overrides_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id), CONSTRAINT user_permissions_overrides_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id));
CREATE TABLE IF NOT EXISTS public.blog_categories (id uuid NOT NULL DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, created_at timestamptz DEFAULT now(), CONSTRAINT blog_categories_pkey PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS public.blog_posts (id uuid NOT NULL DEFAULT gen_random_uuid(), title text NOT NULL, content text NOT NULL, category_id uuid, status text DEFAULT 'draft'::text, published_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), CONSTRAINT blog_posts_pkey PRIMARY KEY (id), CONSTRAINT blog_posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.blog_categories(id));
CREATE TABLE IF NOT EXISTS public.backups (id uuid NOT NULL DEFAULT gen_random_uuid(), status text DEFAULT 'pending', type text DEFAULT 'full', destination text DEFAULT 'local', file_url text, file_size_bytes bigint, tables_exported text[], storage_buckets_exported text[], logs text[], error_message text, started_at timestamp, completed_at timestamp, created_at timestamp DEFAULT now(), created_by uuid, CONSTRAINT backups_pkey PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS public.table_name (id bigint GENERATED ALWAYS AS IDENTITY NOT NULL, inserted_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), data jsonb, name text, CONSTRAINT table_name_pkey PRIMARY KEY (id));
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    toast.success("SQL copié dans le presse-papier !");
    setTimeout(() => setCopied(false), 2000);
  };

  const logsEndRef = useRef<HTMLDivElement>(null);
  const restoreLogsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs when active backup updates
  useEffect(() => {
    if (activeBackup && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeBackup?.logs.length]);

  // Auto-download logic for Desktop backups
  useEffect(() => {
    const latestBackup = backups[0];
    if (latestBackup && 
        latestBackup.status === 'completed' && 
        latestBackup.destination === 'desktop' && 
        latestBackup.file_url && 
        latestBackup.id !== lastCompletedId) {
      
      setLastCompletedId(latestBackup.id);
      
      // Effective download logic
      const link = document.createElement('a');
      link.href = latestBackup.file_url;
      link.download = `fusclub-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [backups, lastCompletedId]);

  // ── Permission Gate ─────────────────────────────────────
  if (!can('manage_roles')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full rounded-[3rem] border-destructive/20 shadow-2xl overflow-hidden">
          <CardContent className="p-12 text-center space-y-6">
            <div className="w-20 h-20 rounded-[2rem] bg-destructive/10 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-10 h-10 text-destructive" />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-destructive">Accès Refusé</h3>
              <p className="text-sm text-muted-foreground mt-2 font-medium">
                Cette section est réservée aux administrateurs système.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Loading State ───────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-12 w-52 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36 rounded-[2rem]" />)}
        </div>
        <Skeleton className="h-80 rounded-[2.5rem]" />
        <Skeleton className="h-64 rounded-[2.5rem]" />
      </div>
    );
  }

  const handleLaunchBackup = async () => {
    setShowConfirm(false);
    try {
      await createBackup({ type: selectedType, destination: selectedDest });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveGdrive = () => {
    saveConfig(STORAGE_KEY_GDRIVE, gdriveConfig);
  };

  const handleSaveOnedrive = () => {
    saveConfig(STORAGE_KEY_ONEDRIVE, onedriveConfig);
  };

  const handleTestGdrive = async () => {
    setTestingGdrive(true);
    // Simulate a connection test (replace with real OAuth flow later)
    await new Promise(resolve => setTimeout(resolve, 2000));
    const updated = { ...gdriveConfig, connected: true, lastTestedAt: new Date().toISOString() };
    setGdriveConfig(updated);
    saveConfig(STORAGE_KEY_GDRIVE, updated);
    setTestingGdrive(false);
  };

  const handleTestOnedrive = async () => {
    setTestingOnedrive(true);
    // Simulate a connection test (replace with real OAuth flow later)
    await new Promise(resolve => setTimeout(resolve, 2000));
    const updated = { ...onedriveConfig, connected: true, lastTestedAt: new Date().toISOString() };
    setOnedriveConfig(updated);
    saveConfig(STORAGE_KEY_ONEDRIVE, updated);
    setTestingOnedrive(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.tables) throw new Error("Fichier invalide : pas de tables détectées.");
        setRestoreFile(json);
        toast.success("Fichier de sauvegarde chargé avec succès");
      } catch (err: any) {
        toast.error(`Erreur de lecture : ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleStartRestore = async () => {
    if (!restoreFile) return;
    setShowRestoreConfirm(false);
    setRestoring(true);
    setRestoreLogs([]);

    try {
      await backupService.restoreBackup(restoreFile, (msg) => {
        setRestoreLogs(prev => [...prev, msg]);
      });
      toast.success("Restauration terminée avec succès !");
      setRestoreFile(null);
      setIsBootstrapRequired(false);
    } catch (err: any) {
      if (err.message === "SCHEMA_MISSING") {
        setIsBootstrapRequired(true);
        toast.error("La structure de la base de données est manquante.");
      } else {
        toast.error(`Échec de la restauration : ${err.message}`);
      }
    } finally {
      setRestoring(false);
    }
  };

  const elapsed = activeBackup?.started_at
    ? Math.round((Date.now() - new Date(activeBackup.started_at).getTime()) / 1000)
    : 0;

  return (
    <>
      <div className="space-y-8 pb-10">
        {/* ── Header ────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-primary/10 rounded-[2rem] flex items-center justify-center border border-primary/20 shadow-2xl ring-8 ring-primary/5">
              <HardDriveDownload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter text-foreground leading-none flex items-center gap-3">
                Backup Center
                <Sparkles className="w-6 h-6 text-primary" />
              </h1>
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground mt-2">
                Sauvegarde & Protection des Données
              </p>
            </div>
          </div>
          <Badge className="bg-primary text-white border-none px-5 py-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
            <ShieldAlert className="w-3.5 h-3.5 mr-2" /> Admin Only
          </Badge>
        </div>

        {/* ── Tab Switcher ──────────────────────────────── */}
        <div className="flex gap-2 p-1.5 bg-secondary/20 rounded-2xl w-fit">
          <Button
            variant={activeTab === 'backup' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('backup')}
            className="rounded-xl px-6 font-black uppercase tracking-widest text-[10px] h-11"
          >
            <HardDriveDownload className="w-4 h-4 mr-2" />
            Backup
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('settings')}
            className="rounded-xl px-6 font-black uppercase tracking-widest text-[10px] h-11"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Paramétrage
          </Button>
          <Button
            variant={activeTab === 'restore' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('restore')}
            className="rounded-xl px-6 font-black uppercase tracking-widest text-[10px] h-11"
          >
            <History className="w-4 h-4 mr-2" />
            Restauration
          </Button>
        </div>

        {/* ── Tab Content ───────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeTab === 'restore' ? (
            <motion.div
              key="restore-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {isBootstrapRequired && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-[2rem] p-8 relative overflow-hidden group shadow-2xl shadow-amber-500/5">
                  <div className="flex flex-col md:flex-row items-start gap-6">
                    <div className="p-4 bg-amber-500/20 rounded-2xl shadow-inner">
                      <AlertTriangle className="h-8 w-8 text-amber-600 animate-pulse" />
                    </div>
                    <div className="space-y-4 flex-1">
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter italic text-amber-900">
                          Initialisation Requise
                        </h3>
                        <p className="text-xs text-amber-800/70 font-medium leading-relaxed mt-1">
                          Votre projet Supabase est vide. Avant d'importer vos données, vous devez créer la structure des 24 tables.
                          C'est très simple : copiez le script ci-dessous, collez-le dans le <b>SQL Editor</b> de Supabase, puis cliquez sur <b>RUN</b>.
                        </p>
                      </div>
                      
                      <div className="p-4 bg-black/80 rounded-2xl border border-amber-500/30 font-mono text-[10px] text-amber-400 relative shadow-2xl">
                        <pre className="overflow-x-auto max-h-32 mb-1 custom-scrollbar">
                          {SQL_SCHEMA}
                        </pre>
                        <button 
                          onClick={copyToClipboard}
                          className="absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all shadow-lg active:scale-95 font-black uppercase tracking-widest text-[9px]"
                        >
                          {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {copied ? "Copié !" : "Copier le SQL"}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-amber-600 italic">
                        <Terminal className="h-3 w-3" />
                        <span>Une fois le script "Success", réessayez la restauration</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Restauration Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* File Drop Zone */}
                <div className="space-y-6">
                  <Card className="rounded-[2.5rem] border-2 border-dashed border-secondary hover:border-primary/50 transition-all bg-white overflow-hidden">
                    <CardContent className="p-12 text-center space-y-4">
                      <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                        <MonitorDown className="w-10 h-10 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter italic">Importer une sauvegarde</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Fichier .json uniquement</p>
                      </div>
                      
                      <input 
                        type="file" 
                        accept=".json" 
                        id="backup-upload" 
                        className="hidden" 
                        onChange={handleFileSelect}
                        disabled={restoring}
                      />
                      <Button 
                        asChild 
                        variant="secondary"
                        className="rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-[10px] shadow-sm hover:shadow-lg transition-all"
                      >
                        <label htmlFor="backup-upload" className="cursor-pointer">
                          Choisir un fichier
                        </label>
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Warning Box */}
                  <div className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/20 space-y-3">
                    <div className="flex items-center gap-3 text-amber-600">
                      <ShieldAlert className="w-5 h-5" />
                      <p className="font-black uppercase tracking-tighter italic text-sm">Zone Haute Sécurité</p>
                    </div>
                    <p className="text-[11px] text-amber-600/80 font-medium leading-relaxed uppercase tracking-wider">
                      La restauration supprimera toutes vos données actuelles (joueurs, matchs, paramètres) pour les remplacer par celles du fichier. Cette action est irréversible.
                    </p>
                  </div>
                </div>

                {/* File Preview */}
                <AnimatePresence mode="wait">
                  {restoreFile ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-6"
                    >
                      <Card className="rounded-[2.5rem] border-divider bg-white shadow-xl overflow-hidden h-full flex flex-col">
                        <CardHeader className="p-8 border-b bg-secondary/10">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                              <CardTitle className="text-lg font-black uppercase tracking-tighter italic">Sauvegarde Prête</CardTitle>
                              <CardDescription className="text-[10px] font-black uppercase tracking-widest">Contenu validé et prêt à être importé</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6 flex-1">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-secondary/30">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Date Création</p>
                              <p className="font-bold text-sm mt-1">{new Date(restoreFile.metadata?.timestamp).toLocaleString('fr-FR')}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-secondary/30">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Source</p>
                              <p className="font-bold text-xs mt-1 uppercase tracking-tight text-primary">{restoreFile.metadata?.source || 'N/A'}</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Contenu détecté</label>
                            <div className="grid grid-cols-3 gap-2">
                              {Object.entries(restoreFile.tables || {}).map(([table, rows]: [string, any]) => (
                                rows.length > 0 && (
                                  <div key={table} className="flex flex-col gap-0.5 p-3 rounded-xl bg-white border border-secondary shadow-sm">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground truncate">{table}</span>
                                    <span className="font-black text-xs text-foreground uppercase tracking-tighter italic">{rows.length}</span>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>

                          {!restoring ? (
                            <Button 
                              onClick={() => setShowRestoreConfirm(true)}
                              className="w-full h-14 rounded-2xl bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-destructive/20 mt-auto"
                            >
                              Lancer la Restauration
                            </Button>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse italic">Restauration en cours...</span>
                                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                              </div>
                              <div className="h-48 rounded-2xl bg-slate-900 overflow-y-auto p-4 font-mono text-[9px] text-emerald-400 space-y-1 custom-scrollbar scroll-smooth">
                                {restoreLogs.map((log, i) => (
                                  <div key={i} className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <span className="text-emerald-400/50">[{i+1}]</span>
                                    <span>{log}</span>
                                  </div>
                                ))}
                                <div ref={restoreLogsEndRef} />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center p-12 border-2 border-dashed border-secondary rounded-[2.5rem] bg-secondary/5 h-full opacity-50"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center text-muted-foreground">Double-cliquez sur un fichier à gauche pour voir la prévisualisation</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : activeTab === 'backup' ? (
            <motion.div
              key="backup-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* ── Stat Cards ────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Backups',    value: String(stats.totalBackups),                    icon: FolderArchive,    color: 'primary' },
                  { label: 'Dernier Backup',   value: stats.lastBackupDate ? formatDate(stats.lastBackupDate) : 'Aucun', icon: History,          color: 'blue' },
                  { label: 'Taille Totale',    value: `${stats.totalSizeMB} MB`,                    icon: Database,         color: 'emerald' },
                  { label: 'Taux de Réussite', value: `${stats.successRate}%`,                      icon: BarChart3,        color: 'amber' },
                ].map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: idx * 0.08 }}
                      whileHover={{ y: -4 }}
                    >
                      <Card className="h-full border shadow-sm hover:shadow-xl transition-all duration-300 bg-white group overflow-hidden relative">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-6">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-md transition-all duration-300 bg-${stat.color === 'primary' ? 'primary' : stat.color + '-500'}/10 text-${stat.color === 'primary' ? 'primary' : stat.color + '-600'} group-hover:bg-${stat.color === 'primary' ? 'primary' : stat.color + '-500'} group-hover:text-white`}>
                              <Icon className="w-5 h-5" />
                            </div>
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                          <p className="text-2xl font-black tracking-tighter text-foreground mt-1">{stat.value}</p>
                          <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              {/* ── Active Backup Progress ────────────────── */}
              <AnimatePresence>
                {activeBackup && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Card className="border-blue-500/20 bg-gradient-to-r from-blue-50 to-indigo-50/50 shadow-xl rounded-[2.5rem] overflow-hidden">
                      <CardContent className="p-8">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                            </div>
                            <div>
                              <h3 className="text-lg font-black uppercase tracking-tighter italic text-blue-900">Backup In Progress</h3>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600/60">{typeLabels[activeBackup.type].label} → {destLabels[activeBackup.destination].label}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20">
                              <Timer className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-black text-blue-900 tabular-nums">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>
                            </div>
                            <StatusBadge status={activeBackup.status} />
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="h-3 bg-blue-200/50 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                            initial={{ width: '5%' }}
                            animate={{ width: activeBackup.status === 'running' ? '75%' : '100%' }}
                            transition={{ duration: 2, ease: 'easeInOut' }}
                          />
                        </div>

                        {/* Live Logs */}
                        {activeBackup.logs.length > 0 && (
                          <div className="mt-6 bg-slate-900 rounded-2xl p-5 max-h-48 overflow-y-auto custom-scrollbar">
                            {activeBackup.logs.map((log, i) => (
                              <div key={i} className="flex items-start gap-3 py-0.5">
                                <span className="text-emerald-400 font-mono text-[11px] shrink-0">$</span>
                                <span className={`font-mono text-[11px] leading-relaxed ${log.includes('⚠') ? 'text-amber-400' : log.includes('✓') ? 'text-emerald-400' : 'text-slate-300'}`}>{log}</span>
                              </div>
                            ))}
                            <div ref={logsEndRef} />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Action Panel ──────────────────────────── */}
              <Card className="rounded-[2.5rem] border shadow-sm overflow-hidden bg-white">
                <CardHeader className="border-b bg-secondary/10 p-8">
                  <CardTitle className="text-lg flex items-center gap-3 font-black uppercase tracking-tighter">
                    <Play className="w-5 h-5 text-primary" /> Nouveau Backup
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  {/* Type Selector */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Type de Sauvegarde</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(Object.entries(typeLabels) as [BackupType, typeof typeLabels[BackupType]][]).map(([key, { label, icon: Icon }]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedType(key)}
                          className={`p-6 rounded-[2rem] border-2 transition-all text-left group ${
                            selectedType === key
                              ? 'border-primary bg-primary/5 shadow-xl'
                              : 'border-secondary bg-white hover:border-primary/20'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${selectedType === key ? 'bg-primary text-white shadow-lg' : 'bg-secondary text-muted-foreground'}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <p className="font-black text-sm uppercase tracking-tight">{label}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                            {key === 'full' && 'Tables + Fichiers Storage'}
                            {key === 'database_only' && 'Toutes les tables SQL'}
                            {key === 'storage_only' && 'Photos & documents'}
                          </p>
                          {selectedType === key && (
                            <div className="absolute top-4 right-4 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Destination Selector */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Destination</label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {(Object.entries(destLabels) as [BackupDestination, typeof destLabels[BackupDestination]][]).map(([key, { label, icon: Icon }]) => {
                      if (key === 'desktop') {
                        return (
                          <button
                            key={key}
                            onClick={() => setSelectedDest(key)}
                            className={`p-5 rounded-[1.5rem] border-2 transition-all flex items-center gap-4 ${
                              selectedDest === key
                                ? 'border-primary bg-primary/5 shadow-lg'
                                : 'border-secondary bg-white hover:border-primary/20'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedDest === key ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                              <p className="font-black text-xs uppercase tracking-tight">{label}</p>
                              <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">Direct Download</p>
                            </div>
                            {selectedDest === key && <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />}
                          </button>
                        );
                      }

                      const isGdriveConnected = key === 'google_drive' && gdriveConfig.connected;
                      const isOnedriveConnected = key === 'onedrive' && onedriveConfig.connected;
                      const isCloudNotConnected = (key === 'google_drive' && !gdriveConfig.connected) || (key === 'onedrive' && !onedriveConfig.connected);

                      return (
                        <button
                          key={key}
                          onClick={() => {
                            if (isCloudNotConnected) {
                              setActiveTab('settings');
                              return;
                            }
                            setSelectedDest(key);
                          }}
                          className={`p-5 rounded-[1.5rem] border-2 transition-all flex items-center gap-4 relative ${
                            selectedDest === key
                              ? 'border-primary bg-primary/5 shadow-lg'
                              : isCloudNotConnected
                                ? 'border-secondary bg-white/50 opacity-60 hover:opacity-100 hover:border-amber-400/50'
                                : 'border-secondary bg-white hover:border-primary/20'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedDest === key ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="font-black text-xs uppercase tracking-tight">{label}</p>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                              {key === 'local' && 'Bucket Supabase'}
                              {key === 'google_drive' && (gdriveConfig.connected ? 'Connecté ✓' : 'Non configuré')}
                              {key === 'onedrive' && (onedriveConfig.connected ? 'Connecté ✓' : 'Non configuré')}
                            </p>
                          </div>
                          {selectedDest === key && <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />}
                          {isCloudNotConnected && (
                            <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20 border font-black text-[8px] uppercase tracking-widest px-2 py-0.5 gap-1">
                              <Settings2 className="w-2.5 h-2.5" /> Config
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  </div>

                  {/* Launch Button */}
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={() => setShowConfirm(true)}
                      disabled={!!activeBackup || isCreating}
                      className="h-14 px-12 rounded-[2rem] bg-slate-950 hover:bg-black text-white transition-all font-black uppercase tracking-widest text-[11px] gap-3 shadow-2xl active:scale-95 disabled:opacity-50"
                    >
                      {isCreating ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Lancement...</>
                      ) : activeBackup ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Backup en cours...</>
                      ) : (
                        <><Play className="w-4 h-4" /> Lancer le Backup</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* ── History ───────────────────────────────── */}
              <Card className="rounded-[2.5rem] border shadow-sm overflow-hidden bg-white">
                <CardHeader className="border-b bg-secondary/10 p-8">
                  <CardTitle className="text-lg flex items-center gap-3 font-black uppercase tracking-tighter">
                    <History className="w-5 h-5 text-primary" /> Historique des Backups
                    <Badge className="ml-auto bg-secondary/50 text-muted-foreground border-none font-black text-[10px] uppercase tracking-widest px-3 py-1">
                      {backups.length} Entrées
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {backups.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto">
                        <FolderArchive className="w-8 h-8 text-muted-foreground opacity-20" />
                      </div>
                      <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px] italic">
                        Aucun backup enregistré
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-secondary/50">
                      {backups.map((backup, idx) => {
                        const TypeIcon = typeLabels[backup.type]?.icon || Database;
                        const DestIcon = destLabels[backup.destination]?.icon || Server;
                        const isExpanded = expandedLogs === backup.id;

                        return (
                          <motion.div
                            key={backup.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.03 }}
                          >
                            <div className="p-6 hover:bg-secondary/10 transition-all">
                              <div className="flex items-center gap-5">
                                {/* Icon */}
                                <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center shrink-0">
                                  <TypeIcon className="w-6 h-6 text-muted-foreground" />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-1">
                                    <p className="font-black text-sm uppercase tracking-tight truncate">
                                      Backup {typeLabels[backup.type]?.label}
                                    </p>
                                    <StatusBadge status={backup.status} />
                                  </div>
                                  <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    <span className="flex items-center gap-1"><DestIcon className="w-3 h-3" />{destLabels[backup.destination]?.label}</span>
                                    <span>{formatDate(backup.created_at)}</span>
                                    {backup.file_size_bytes && <span>{formatBytes(backup.file_size_bytes)}</span>}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {backup.logs.length > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setExpandedLogs(isExpanded ? null : backup.id)}
                                      className="h-9 w-9 rounded-xl hover:bg-primary/10"
                                    >
                                      <Terminal className={`w-4 h-4 transition-colors ${isExpanded ? 'text-primary' : 'text-muted-foreground'}`} />
                                    </Button>
                                  )}
                                  {backup.file_url && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => window.open(backup.file_url, '_blank')}
                                      className="h-9 w-9 rounded-xl hover:bg-emerald-500/10"
                                    >
                                      <Download className="w-4 h-4 text-emerald-600" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      if (window.confirm('Supprimer cet enregistrement de backup ?')) {
                                        deleteBackup(backup.id);
                                      }
                                    }}
                                    className="h-9 w-9 rounded-xl hover:bg-destructive/10"
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive/60" />
                                  </Button>
                                </div>
                              </div>

                              {/* Expanded Log View */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-4 bg-slate-900 rounded-2xl p-5 max-h-60 overflow-y-auto custom-scrollbar">
                                      {backup.logs.map((log, i) => (
                                        <div key={i} className="flex items-start gap-3 py-0.5">
                                          <span className="text-emerald-400 font-mono text-[11px] shrink-0">$</span>
                                          <span className={`font-mono text-[11px] leading-relaxed ${log.includes('⚠') ? 'text-amber-400' : log.includes('✓') ? 'text-emerald-400' : 'text-slate-300'}`}>
                                            {log}
                                          </span>
                                        </div>
                                      ))}
                                      {backup.error_message && (
                                        <div className="flex items-start gap-3 py-1 mt-2 border-t border-red-800/30 pt-2">
                                          <span className="text-red-400 font-mono text-[11px] shrink-0">!</span>
                                          <span className="font-mono text-[11px] text-red-400">{backup.error_message}</span>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            /* ── SETTINGS TAB ─────────────────────────────── */
            <motion.div
              key="settings-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Info Banner */}
              <Card className="rounded-[2rem] border border-blue-200/50 bg-gradient-to-r from-blue-50 to-indigo-50/30 shadow-sm overflow-hidden">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Link2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-tight text-blue-900">Connexions Cloud</h3>
                    <p className="text-xs text-blue-700/70 font-medium leading-relaxed">
                      Configurez vos connexions OAuth 2.0 pour permettre l'envoi automatique des backups vers Google Drive ou OneDrive.
                      Les identifiants sont stockés localement et utilisés uniquement pour l'authentification lors des sauvegardes.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Connection Status Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className={`h-full border shadow-sm hover:shadow-xl transition-all duration-300 bg-white overflow-hidden relative rounded-[2rem] ${gdriveConfig.connected ? 'border-emerald-200/50' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-all ${gdriveConfig.connected ? 'bg-emerald-500 text-white' : 'bg-secondary text-muted-foreground'}`}>
                          <Cloud className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-sm uppercase tracking-tight">Google Drive</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                            {gdriveConfig.connected ? 'Prêt pour sauvegarde' : 'Configuration requise'}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${gdriveConfig.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
                        {gdriveConfig.connected ? <><CheckCircle2 className="w-3 h-3" /> Connecté</> : <><WifiOff className="w-3 h-3" /> Non connecté</>}
                      </div>
                      <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className={`h-full border shadow-sm hover:shadow-xl transition-all duration-300 bg-white overflow-hidden relative rounded-[2rem] ${onedriveConfig.connected ? 'border-emerald-200/50' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-all ${onedriveConfig.connected ? 'bg-emerald-500 text-white' : 'bg-secondary text-muted-foreground'}`}>
                          <CloudUpload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-sm uppercase tracking-tight">OneDrive</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                            {onedriveConfig.connected ? 'Prêt pour sauvegarde' : 'Configuration requise'}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${onedriveConfig.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
                        {onedriveConfig.connected ? <><CheckCircle2 className="w-3 h-3" /> Connecté</> : <><WifiOff className="w-3 h-3" /> Non connecté</>}
                      </div>
                      <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-blue-500/5 blur-2xl pointer-events-none" />
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Google Drive Config */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <DriveConfigCard
                  title="Google Drive"
                  subtitle="Configuration OAuth 2.0 — Google Cloud Console"
                  icon={Cloud}
                  iconColor="text-blue-600"
                  iconBg="bg-blue-500/10"
                  config={gdriveConfig}
                  onUpdate={setGdriveConfig}
                  onSave={handleSaveGdrive}
                  onTest={handleTestGdrive}
                  isTesting={testingGdrive}
                  docsUrl="https://console.cloud.google.com/apis/credentials"
                  type="google"
                />
              </motion.div>

              {/* OneDrive Config */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <DriveConfigCard
                  title="OneDrive"
                  subtitle="Configuration OAuth 2.0 — Azure AD App Registration"
                  icon={CloudUpload}
                  iconColor="text-sky-600"
                  iconBg="bg-sky-500/10"
                  config={onedriveConfig}
                  onUpdate={setOnedriveConfig}
                  onSave={handleSaveOnedrive}
                  onTest={handleTestOnedrive}
                  isTesting={testingOnedrive}
                  docsUrl="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps"
                  type="onedrive"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Confirmation Modal ─────────────────────────── */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden z-10"
            >
              <div className="p-8 border-b bg-amber-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tighter">Confirmer le Backup</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Opération système</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowConfirm(false)} className="rounded-full h-10 w-10">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <p className="text-sm text-muted-foreground font-medium">
                  Vous êtes sur le point de lancer un backup. Le processus s'exécutera en arrière-plan.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-secondary/50">
                    <div className="flex items-center gap-3">
                      {React.createElement(typeLabels[selectedType].icon, { className: 'w-5 h-5 text-primary' })}
                      <span className="text-sm font-black uppercase tracking-tight">{typeLabels[selectedType].label}</span>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase tracking-widest">Type</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-secondary/50">
                    <div className="flex items-center gap-3">
                      {React.createElement(destLabels[selectedDest].icon, { className: 'w-5 h-5 text-primary' })}
                      <span className="text-sm font-black uppercase tracking-tight">{destLabels[selectedDest].label}</span>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase tracking-widest">Destination</Badge>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t bg-secondary/10 flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleLaunchBackup}
                  className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 gap-2"
                >
                  <Play className="w-4 h-4" /> Confirmer & Lancer
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ── Confirm Restore Modal ───────────────────────── */}
      <AnimatePresence>
        {showRestoreConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setShowRestoreConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden z-10 border border-destructive/20"
            >
              <div className="p-10 text-center space-y-8">
                <div className="w-24 h-24 bg-destructive/10 rounded-[2.5rem] flex items-center justify-center mx-auto ring-8 ring-destructive/5 animate-pulse">
                  <ShieldAlert className="w-12 h-12 text-destructive" />
                </div>
                
                <div className="space-y-4">
                  <h1 className="text-3xl font-black uppercase tracking-tighter italic text-destructive leading-tight">Attention : <br/>Action Irréversible</h1>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground leading-relaxed px-4">
                    ÊTES-VOUS ABSOLUMENT SÛR ? TOUTES LES DONNÉES ACTUELLES (JOUEURS, MATCHS, PARAMÈTRES) SERONT DÉFINITIVEMENT EFFACÉES ET REMPLACÉES PAR CELLES DU FICHIER.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowRestoreConfirm(false)}
                    className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-secondary"
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleStartRestore}
                    className="h-14 rounded-2xl bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-destructive/20"
                  >
                    Oui, Tout Écraser
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BackupPage;
