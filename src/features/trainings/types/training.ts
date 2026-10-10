export type SessionStatus = 'planifiee' | 'en_cours' | 'terminee' | 'annulee';

export type SessionType = 
  | 'Technique' 
  | 'Tactique' 
  | 'Physique' 
  | 'Régénération' 
  | 'Veille de Match' 
  | 'Jeu Réduit' 
  | 'Spécifique Lignes' 
  | 'Mixte';

export type SessionIntensity = 'Faible' | 'Moyenne' | 'Élevée' | 'Maximale';

export type ExerciseCategory = 
  | 'Technique'
  | 'Tactique'
  | 'Physique'
  | 'Finition'
  | 'Attaque'
  | 'Défense'
  | 'Transition'
  | 'Possession'
  | 'Pressing'
  | 'Jeu réduit'
  | 'Coups de pied arrêtés'
  | 'Gardien'
  | 'Échauffement'
  | 'Récupération';

export type PitchSurface = 
  | 'Plein terrain' 
  | 'Demi-terrain' 
  | 'Quart de terrain' 
  | 'Surface de réparation' 
  | 'Couloir latéral' 
  | 'Zone réduite';

export type AttendanceStatus = 'present' | 'absent_justifie' | 'absent_injustifie' | 'blesse' | 'soins';

export interface TrainingExercise {
  id: string;
  title: string;
  category: ExerciseCategory;
  objective: string;
  description: string;
  duration_minutes: number;
  player_count_min: number;
  player_count_max: number;
  intensity: SessionIntensity;
  pitch_surface: PitchSurface;
  equipment: string[];
  instructions: string[];
  success_criteria: string[];
  diagram_url?: string;
  video_url?: string;
  is_favorite?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TrainingSession {
  id: string;
  name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  team_id?: string;
  team_name: string;
  category: string;
  coach_id?: string;
  coach_name: string;
  pitch: string;
  session_type: SessionType;
  intensity: SessionIntensity;
  status: SessionStatus;
  objectives: string[];
  notes?: string;
  exercises?: {
    exercise_id: string;
    order_index: number;
    allocated_minutes: number;
    exercise?: TrainingExercise;
  }[];
  called_players_count: number;
  present_players_count: number;
  rpe_avg?: number;
  load_avg?: number;
  observations?: string;
  final_report?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SessionAttendance {
  id: string;
  session_id: string;
  player_id: string;
  player_name: string;
  player_photo?: string;
  position: string;
  status: AttendanceStatus;
  rpe?: number; // 1 to 10
  minutes_participated?: number;
  notes?: string;
}

export interface PlayerTrainingEvaluation {
  id: string;
  session_id: string;
  session_name: string;
  evaluation_date: string;
  player_id: string;
  player_name: string;
  player_photo?: string;
  position: string;
  category: string;
  evaluator_name: string;

  // 1. Technique (1-10)
  tech_control: number;
  tech_passing: number;
  tech_dribbling: number;
  tech_shooting: number;
  tech_driving: number;
  tech_score: number;

  // 2. Tactique (1-10)
  tact_positioning: number;
  tact_info_taking: number;
  tact_decision: number;
  tact_game_reading: number;
  tact_placement: number;
  tact_score: number;

  // 3. Physique (1-10)
  phys_speed: number;
  phys_endurance: number;
  phys_explosiveness: number;
  phys_agility: number;
  phys_intensity: number;
  phys_score: number;

  // 4. Mental (1-10)
  ment_concentration: number;
  ment_motivation: number;
  ment_discipline: number;
  ment_communication: number;
  ment_attitude: number;
  ment_score: number;

  // Global (1-10)
  global_score: number;
  coach_comment?: string;
  strengths: string[];
  improvements: string[];
}

export interface PlayerTrainingLoad {
  id: string;
  session_id: string;
  session_name: string;
  session_date: string;
  player_id: string;
  player_name: string;
  player_photo?: string;
  position: string;
  team_name: string;
  category: string;
  duration_minutes: number;
  rpe: number; // 1-10
  load: number; // duration * rpe
  distance_km?: number;
  high_intensity_distance_m?: number;
  sprint_count?: number;
  accelerations?: number;
  decelerations?: number;
  load_alert: 'low' | 'optimal' | 'high' | 'spike';
}
