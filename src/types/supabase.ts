// Auto-generated equivalent — regenerate with:
// npx supabase gen types typescript --project-id fuhrxfhszttvpkmjydca > src/types/supabase.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// -------------------------------------------------------
// ENUMS PostgreSQL (miroir exact des CREATE TYPE)
// -------------------------------------------------------

export type MatchStatus       = 'scheduled' | 'live' | 'paused' | 'halftime' | 'finished' | 'cancelled' | 'postponed' | 'extra_time' | 'penalties';
export type MatchPhase        = 'league' | 'won' | 'lost' | 'round_of_32' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'final' | 'third_place';
export type BackupStatus      = 'pending' | 'running' | 'completed' | 'failed';
export type BackupType        = 'full' | 'database_only' | 'storage_only';
export type BackupDestination = 'local' | 'google_drive' | 'onedrive' | 'desktop';
export type BlogPostStatus    = 'draft' | 'published';
export type AgeCategory       = 'U13' | 'U14' | 'U15' | 'U16' | 'U17' | 'U18' | 'U19' | 'U20' | 'U21' | 'U22' | 'U23' | 'OTHER';
export type PreferredFoot     = 'left' | 'right' | 'both';
export type MatchEventType    =
  | 'goal' | 'own_goal' | 'assist'
  | 'yellow_card' | 'red_card'
  | 'substitution'
  | 'penalty' | 'missed_penalty'
  | 'corner' | 'foul' | 'offside' | 'save'
  | 'injury' | 'other';
export type UserMatchAssignmentType = 'tracker' | 'analyst' | 'coach' | 'admin';

// -------------------------------------------------------
// DATABASE INTERFACE (compatible Supabase JS v2)
// -------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      settings: {
        Row: {
          id: string;
          club_id: string | null;
          club_name: string;
          city: string | null;
          country: string | null;
          logo_url: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          timezone: string;
          primary_color: string;
          secondary_color: string;
          pagination_limit: number;
          preferred_view_mode: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id?: string | null;
          club_name: string;
          city?: string | null;
          country?: string | null;
          logo_url?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          timezone?: string;
          primary_color?: string;
          secondary_color?: string;
          pagination_limit?: number;
          preferred_view_mode?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['settings']['Insert']>;
      };

      clubs: {
        Row: {
          id: string;
          name: string;
          city: string | null;
          country: string | null;
          continent: string | null;
          logo_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          city?: string | null;
          country?: string | null;
          continent?: string | null;
          logo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['clubs']['Insert']>;
      };

      leagues: {
        Row: {
          id: string;
          club_id: string;
          name: string;
          season: string;
          logo_url: string | null;
          category: AgeCategory | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          name: string;
          season: string;
          logo_url?: string | null;
          category?: AgeCategory | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leagues']['Insert']>;
      };

      stadiums: {
        Row: {
          id: string;
          club_id: string;
          name: string;
          city: string | null;
          photo_url: string | null;
          capacity: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          name: string;
          city?: string | null;
          photo_url?: string | null;
          capacity?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['stadiums']['Insert']>;
      };

      staff: {
        Row: {
          id: string;
          club_id: string;
          full_name: string;
          role: string;
          specialty: string | null;
          category: string | null;
          phone: string | null;
          email: string | null;
          photo_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          full_name: string;
          role: string;
          specialty?: string | null;
          category?: string | null;
          phone?: string | null;
          email?: string | null;
          photo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['staff']['Insert']>;
      };

      teams: {
        Row: {
          id: string;
          club_id: string;
          name: string;
          category: AgeCategory;
          coach_id: string | null;
          photo_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          name: string;
          category?: AgeCategory;
          coach_id?: string | null;
          photo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['teams']['Insert']>;
      };

      players: {
        Row: {
          id: string;
          club_id: string;
          team_id: string | null;
          full_name: string;
          birth_date: string | null;
          nationality: string | null;
          height: number | null;
          weight: number | null;
          preferred_foot: PreferredFoot | null;
          position: string | null;
          jersey_number: number | null;
          photo_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          team_id?: string | null;
          full_name: string;
          birth_date?: string | null;
          nationality?: string | null;
          height?: number | null;
          weight?: number | null;
          preferred_foot?: PreferredFoot | null;
          position?: string | null;
          jersey_number?: number | null;
          photo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['players']['Insert']>;
      };

      opponent_players: {
        Row: {
          id: string;
          opponent_id: string;
          full_name: string;
          jersey_number: number | null;
          position: string | null;
          category: string;
          height: number | null;
          weight: number | null;
          preferred_foot: string | null;
          nationality: string | null;
          photo_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          opponent_id: string;
          full_name: string;
          jersey_number?: number | null;
          position?: string | null;
          category?: string;
          height?: number | null;
          weight?: number | null;
          preferred_foot?: string | null;
          nationality?: string | null;
          photo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['opponent_players']['Insert']>;
      };



      matches: {
        Row: {
          id: string;
          club_id: string;
          team_id: string;
          opponent_id: string;
          league_id: string | null;
          stadium_id: string | null;
          category: AgeCategory;
          match_date: string;
          match_time: string | null;
          formation: string | null;
          opponent_formation: string | null;
          opponent_lineup: string[] | null;
          opponent_subs: string[] | null;
          opponent_lineup_positions: any[] | null;
          is_home: boolean;
          score_home: number;
          score_away: number;
          status: MatchStatus;
          match_phase: MatchPhase | null;
          notes: string | null;
          video_url: string | null;
          // Match timing configuration
          half_duration_minutes: number;
          enable_extra_time: boolean;
          enable_penalties: boolean;
          // Live tracking state
          current_half: number;
          time_elapsed_seconds: number;
          added_time_first_half: number;
          added_time_second_half: number;
          // Penalty shootout scores
          penalty_score_home: number;
          penalty_score_away: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          team_id: string;
          opponent_id: string;
          league_id?: string | null;
          stadium_id?: string | null;
          category?: AgeCategory;
          match_date: string;
          match_time?: string | null;
          formation?: string | null;
          opponent_formation?: string | null;
          opponent_lineup?: string[] | null;
          opponent_subs?: string[] | null;
          opponent_lineup_positions?: any[] | null;
          is_home?: boolean;
          score_home?: number;
          score_away?: number;
          status?: MatchStatus;
          match_phase?: MatchPhase | null;
          notes?: string | null;
          video_url?: string | null;
          half_duration_minutes?: number;
          enable_extra_time?: boolean;
          enable_penalties?: boolean;
          current_half?: number;
          time_elapsed_seconds?: number;
          added_time_first_half?: number;
          added_time_second_half?: number;
          penalty_score_home?: number;
          penalty_score_away?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['matches']['Insert']>;
      };

      match_players: {
        Row: {
          id: string;
          match_id: string;
          player_id: string;
          is_starting: boolean;
          position_index: number | null;
          position_x: number | null;
          position_y: number | null;
          rating: number | null;
          rating_comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_id: string;
          is_starting?: boolean;
          position_index?: number | null;
          position_x?: number | null;
          position_y?: number | null;
          rating?: number | null;
          rating_comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['match_players']['Insert']>;
      };

      match_staff: {
        Row: {
          id: string;
          match_id: string;
          staff_id: string;
          role_on_match: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          staff_id: string;
          role_on_match?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['match_staff']['Insert']>;
      };

      match_events: {
        Row: {
          id: string;
          match_id: string;
          player_id: string | null;
          related_player_id: string | null;
          type: MatchEventType;
          minute: number;
          extra: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_id?: string | null;
          related_player_id?: string | null;
          type: MatchEventType;
          minute: number;
          extra?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['match_events']['Insert']>;
      };

      match_stats: {
        Row: {
          id: string;
          match_id: string;
          yellow_cards: number;
          red_cards: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          yellow_cards?: number;
          red_cards?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['match_stats']['Insert']>;
      };

      player_match_stats: {
        Row: {
          id: string;
          match_id: string;
          player_id: string;
          played_category: string | null;
          jersey_number_worn: number | null;
          minutes_played: number | null;
          goals: number;
          assists: number;
          rating: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_id: string;
          played_category?: string | null;
          jersey_number_worn?: number | null;
          minutes_played?: number | null;
          goals?: number;
          assists?: number;
          rating?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['player_match_stats']['Insert']>;
      };

      blog_categories: {
        Row: { id: string; club_id: string; name: string; created_at: string; updated_at: string };
        Insert: { id?: string; club_id: string; name: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['blog_categories']['Insert']>;
      };

      blog_posts: {
        Row: {
          id: string;
          club_id: string;
          title: string;
          content: string;
          category_id: string | null;
          status: BlogPostStatus;
          published_at: string | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          title: string;
          content: string;
          category_id?: string | null;
          status?: BlogPostStatus;
          published_at?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['blog_posts']['Insert']>;
      };

      backups: {
        Row: {
          id: string;
          club_id: string;
          status: BackupStatus;
          type: BackupType;
          destination: BackupDestination;
          file_url: string | null;
          file_size_bytes: number | null;
          tables_exported: string[];
          storage_buckets_exported: string[];
          logs: string[];
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          club_id: string;
          status?: BackupStatus;
          type?: BackupType;
          destination?: BackupDestination;
          file_url?: string | null;
          file_size_bytes?: number | null;
          tables_exported?: string[];
          storage_buckets_exported?: string[];
          logs?: string[];
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['backups']['Insert']>;
      };

      roles: {
        Row: { id: string; name: string; description: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; description?: string | null };
        Update: Partial<Database['public']['Tables']['roles']['Insert']>;
      };

      permissions: {
        Row: { id: string; resource: string; action: string; perm_key: string; created_at: string; updated_at: string };
        Insert: { id?: string; resource: string; action: string; perm_key: string };
        Update: Partial<Database['public']['Tables']['permissions']['Insert']>;
      };

      role_permissions: {
        Row: { role_id: string; permission_id: string };
        Insert: { role_id: string; permission_id: string };
        Update: Partial<Database['public']['Tables']['role_permissions']['Insert']>;
      };

      user_profiles: {
        Row: {
          id: string;
          staff_id: string | null;
          default_club_id: string | null;
          is_active: boolean;
          force_password_change: boolean;
          system_role: string;
          job_title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          staff_id?: string | null;
          default_club_id?: string | null;
          is_active?: boolean;
          force_password_change?: boolean;
          system_role?: string;
          job_title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };

      user_roles: {
        Row: { user_id: string; role_id: string };
        Insert: { user_id: string; role_id: string };
        Update: Partial<Database['public']['Tables']['user_roles']['Insert']>;
      };

      user_permissions_overrides: {
        Row: { user_id: string; permission_id: string };
        Insert: { user_id: string; permission_id: string };
        Update: Partial<Database['public']['Tables']['user_permissions_overrides']['Insert']>;
      };

      user_team_assignments: {
        Row: { user_id: string; team_id: string; role_id: string | null; created_at: string; updated_at: string };
        Insert: { user_id: string; team_id: string; role_id?: string | null };
        Update: Partial<Database['public']['Tables']['user_team_assignments']['Insert']>;
      };

      user_match_assignments: {
        Row: { user_id: string; match_id: string; assignment_type: UserMatchAssignmentType; created_at: string; updated_at: string };
        Insert: { user_id: string; match_id: string; assignment_type?: UserMatchAssignmentType };
        Update: Partial<Database['public']['Tables']['user_match_assignments']['Insert']>;
      };

      user_category_assignments: {
        Row: { user_id: string; category: AgeCategory; club_id: string; created_at: string; updated_at: string };
        Insert: { user_id: string; category: AgeCategory; club_id: string };
        Update: Partial<Database['public']['Tables']['user_category_assignments']['Insert']>;
      };

      player_surclassements: {
        Row: {
          id: string;
          club_id: string;
          player_id: string;
          original_team_id: string;
          target_team_id: string;
          original_category: string;
          target_category: string;
          status: 'active' | 'reverted';
          notes: string | null;
          original_jersey_number: number | null;
          target_jersey_number: number | null;
          promoted_at: string;
          reverted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          player_id: string;
          original_team_id: string;
          target_team_id: string;
          original_category: string;
          target_category: string;
          status?: 'active' | 'reverted';
          notes?: string | null;
          original_jersey_number?: number | null;
          target_jersey_number?: number | null;
          promoted_at?: string;
          reverted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['player_surclassements']['Insert']>;
      };
    };

    Enums: {
      match_status: MatchStatus;
      backup_status: BackupStatus;
      backup_type: BackupType;
      backup_destination: BackupDestination;
      blog_post_status: BlogPostStatus;
      age_category: AgeCategory;
      preferred_foot: PreferredFoot;
      match_event_type: MatchEventType;
      user_match_assignment_type: UserMatchAssignmentType;
    };

    Functions: {
      get_my_club_id: { Args: Record<never, never>; Returns: string };
      is_club_admin:  { Args: Record<never, never>; Returns: boolean };
    };
  };
}

// -------------------------------------------------------
// Raccourcis pratiques (à importer dans les services)
// -------------------------------------------------------

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
