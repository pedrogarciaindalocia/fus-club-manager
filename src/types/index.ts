// Réexporte les enums depuis supabase.ts — source unique de vérité
export type {
  MatchStatus,
  MatchPhase,
  AgeCategory,
  PreferredFoot,
  MatchEventType,
  BackupStatus,
  BackupType,
  BackupDestination,
  BlogPostStatus,
  UserMatchAssignmentType,
} from './supabase';

export * from './arbitre';
export * from './audit';

import type { Tables } from './supabase';

// -------------------------------------------------------
// TYPES DOMAINE — Row types directs depuis la DB
// -------------------------------------------------------

export type Club = Tables<'clubs'> & {
  club_name?: string;
  preferred_view_mode?: string;
  pagination_limit?: number;
  image_url?: string;
  category?: string;
};

export type MyClubSettings = Club & {
  settings?: Settings | null;
  [key: string]: any;
};
export type PlayerSurclassement = Tables<'player_surclassements'>;
export type Settings = Tables<'settings'>;
export type League   = Tables<'leagues'>;
export type Stadium  = Tables<'stadiums'>;
export type Staff    = Tables<'staff'>;
export type StaffMember = Staff & { team_ids?: string[] };
export type Team     = Tables<'teams'>;
export type Player   = Tables<'players'>;
export type OpponentPlayer = Tables<'opponent_players'>;


export type Match           = Tables<'matches'>;
export type MatchPlayer     = Tables<'match_players'>;
export type MatchStaff      = Tables<'match_staff'>;
export type MatchEvent      = Tables<'match_events'>;
export type MatchStats      = Tables<'match_stats'>;
export type PlayerMatchStat = Tables<'player_match_stats'>;

export type BlogCategory = Tables<'blog_categories'>;
export type BlogPost     = Tables<'blog_posts'>;
export type Backup       = Tables<'backups'>;

export interface Banner {
  id: string;
  club_id: string;
  title: string | null;
  image_url: string;
  target_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// RBAC
export type Role                    = Tables<'roles'>;
export type Permission              = Tables<'permissions'>;
export type UserProfile             = Tables<'user_profiles'>;
export type UserTeamAssignment      = Tables<'user_team_assignments'>;
export type UserMatchAssignment     = Tables<'user_match_assignments'>;
export type UserCategoryAssignment  = Tables<'user_category_assignments'>;

// -------------------------------------------------------
// TYPES ENRICHIS (jointures courantes)
// -------------------------------------------------------

/** Match avec composition et staff pré-chargés */
export type MatchWithLineup = Match & {
  match_players: Pick<MatchPlayer, 'player_id' | 'is_starting' | 'position_x' | 'position_y'>[];
  match_staff: Pick<MatchStaff, 'staff_id' | 'role_on_match'>[];
};

/** Shorthand : IDs de compo exploitables côté UI */
export interface MatchLineup {
  startingXI: string[];
  substitutes: string[];
}

// -------------------------------------------------------
// BACKUP STATS (calculé côté client)
// -------------------------------------------------------

export interface BackupStats {
  totalBackups: number;
  lastBackupDate: string | null;
  totalSizeMB: number;
  successRate: number;
}
