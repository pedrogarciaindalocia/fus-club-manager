export type FootType = 'Droitier' | 'Gaucher' | 'Ambidextre';

export type CandidateStatus = 'registered' | 'in_trial' | 'selected' | 'rejected' | 'on_hold';

export type SessionStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export type RecommendationPriority = 'low' | 'medium' | 'high' | 'very_high';

import { PLAYER_CATEGORIES } from '../../../constants';

export const RECRUITMENT_AGE_CATEGORIES = PLAYER_CATEGORIES;

export type RecruitmentAgeCategory = typeof RECRUITMENT_AGE_CATEGORIES[number];

export type PipelineStage = 
  | 'prospect'          // New Prospect
  | 'scouted'           // Observed
  | 'recommended'       // Recommended
  | 'screening'         // Pre-screening
  | 'test_scheduled'    // Test Scheduled
  | 'test_completed'    // Test Completed
  | 'under_evaluation'  // Under Evaluation
  | 'shortlisted'       // Shortlisted
  | 'final_decision'    // Final Decision
  | 'signed'            // Signed
  | 'rejected'          // Rejected
  | 'academy';          // Academy

export type EvaluationVerdict = 
  | 'reject'
  | 'monitor'
  | 'additional_test'
  | 'shortlist'
  | 'recommend_academy'
  | 'recommend_team'
  | 'contract_proposal'
  | 'signed';

// 1. SCOUT PROFILE
export interface Scout {
  id: string;
  full_name: string;
  photo_url?: string;
  phone?: string;
  email?: string;
  role_title: string;
  recruitment_region: string;
  assigned_categories: string[];
  assigned_teams: string[];
  status: 'active' | 'inactive';
  recruited_date: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// 2. CANDIDATE & SPORTING PROFILE (Including Guardian for minors)
export interface TrialCandidate {
  id: string;
  
  // État Civil & Identité
  first_name: string;
  last_name: string;
  birth_date?: string;
  birth_place?: string;
  nationality: string;
  gender?: string;
  photo_url?: string;
  address?: string;
  city?: string;
  country?: string;

  // Contact Joueur
  phone?: string;
  email?: string;
  agent_name?: string;

  // Tuteur / Représentant Légal (Mineurs)
  guardian_name?: string;
  guardian_relationship?: string;
  guardian_phone?: string;
  guardian_phone_alt?: string;
  guardian_email?: string;
  guardian_address?: string;
  emergency_contact?: string;
  guardian_consent_status?: 'pending' | 'granted' | 'refused';

  // Profil Sportif
  primary_position: string;
  secondary_position?: string;
  preferred_foot: FootType;
  height_cm?: number;
  weight_kg?: number;
  age_category?: string;
  surclassement?: string;
  current_club?: string;
  previous_clubs?: string;
  current_team?: string;
  league_competition?: string;

  // Statistiques en Club
  matches_played?: number;
  minutes_played?: number;
  goals?: number;
  assists?: number;
  yellow_cards?: number;
  red_cards?: number;
  national_selections?: string;
  injury_history?: string;
  sporting_achievements?: string;

  // Découverte & Scout
  discovering_scout_id?: string;
  discovering_scout_name?: string;
  discovery_date?: string;
  discovery_location?: string;
  discovery_match?: string;
  recommendation_priority?: RecommendationPriority;
  initial_scout_score?: number;
  scout_recommendation_notes?: string;

  // Recruteur Référent
  recruiter_id?: string;
  recruiter_name?: string;

  // Vidéo & Highlights Détection
  video_type?: 'youtube' | 'drive' | 'none';
  video_url?: string;

  // Pipeline Kanban & Affectation
  pipeline_stage: PipelineStage;
  status: CandidateStatus;
  assigned_team_id?: string;
  assigned_team_name?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;

  // Relations
  evaluations?: CandidateEvaluation[];
  observations?: ScoutObservation[];
  timeline?: RecruitmentTimelineEvent[];
}

// 3. SCOUT OBSERVATION REPORT
export interface ScoutObservation {
  id: string;
  candidate_id: string;
  scout_id?: string;
  scout_name?: string;
  observation_date: string;
  competition_name?: string;
  match_name?: string;
  opponent_name?: string;
  location?: string;
  observed_position?: string;
  minutes_observed?: number;
  general_impression?: string;
  strengths?: string;
  weaknesses?: string;
  potential_rating: number; // 1-10
  recommendation_verdict: string;
  comments?: string;
  video_links?: string[];
  document_urls?: string[];
  created_at?: string;
}

// 4. PLAYER TEST / TRIAL SESSION
export interface PlayerTest {
  id: string;
  candidate_id?: string;
  candidate_ids?: string[];
  match_id?: string;
  match_name?: string;
  test_name: string;
  test_date: string;
  start_time?: string;
  end_time?: string;
  location: string;
  training_ground?: string;
  target_team?: string;
  age_category: string;
  assigned_position?: string;
  assigned_coaches?: string[];
  assigned_scouts?: string[];
  test_type: 'trial_match' | 'physical_test' | 'technical_session' | 'medical_test' | 'comprehensive';
  status: SessionStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// 5. STRUCTURED 4-PILLAR EVALUATION (Scale 1–10)
export interface CandidateEvaluation {
  id: string;
  candidate_id: string;
  test_id?: string;
  test_name?: string;
  evaluator_name: string;
  evaluator_role?: string;
  evaluation_date: string;
  position_evaluated?: string;

  // Pilier A : Technique (1–10) - Poids 30%
  tech_ball_control: number;
  tech_first_touch: number;
  tech_passing_short: number;
  tech_passing_long: number;
  tech_dribbling: number;
  tech_crossing: number;
  tech_finishing: number;
  tech_heading: number;
  tech_1v1_attacking: number;
  tech_1v1_defending: number;
  tech_weak_foot: number;
  technical_score: number;

  // Pilier B : Physique (1–10) - Poids 25%
  phys_acceleration: number;
  phys_sprint_speed: number;
  phys_agility: number;
  phys_balance: number;
  phys_strength: number;
  phys_endurance: number;
  phys_explosiveness: number;
  physical_score: number;

  // Pilier C : Tactique (1–10) - Poids 25%
  tact_positioning: number;
  tact_awareness: number;
  tact_decision_making: number;
  tact_anticipation: number;
  tact_space_awareness: number;
  tact_transition: number;
  tactical_score: number;

  // Pilier D : Mental / Psychologique (1–10) - Poids 20%
  ment_concentration: number;
  ment_discipline: number;
  ment_motivation: number;
  ment_confidence: number;
  ment_teamwork: number;
  ment_leadership: number;
  ment_coachability: number;
  mental_score: number;

  // Critères Spécifiques au Poste (1–10)
  pos_specific_1_label?: string;
  pos_specific_1_score?: number;
  pos_specific_2_label?: string;
  pos_specific_2_score?: number;
  pos_specific_3_label?: string;
  pos_specific_3_score?: number;

  // Grille dynamique spécialisée par poste (Nom du critère -> Note 1-10)
  criteria_scores?: Record<string, number>;
  position_code?: string;

  // Overall Score Pondéré
  overall_score: number;

  verdict: EvaluationVerdict;
  strengths?: string;
  weaknesses?: string;
  projection?: string;
  comments?: string;

  // Rapports par pilier et Scout responsable
  tech_report?: string;
  tact_report?: string;
  phys_report?: string;
  ment_report?: string;
  evaluator_id?: string;

  created_at?: string;
}

// 6. TIMELINE EVENT
export interface RecruitmentTimelineEvent {
  id: string;
  candidate_id: string;
  event_type: string;
  event_title: string;
  event_description?: string;
  performed_by?: string;
  event_date: string;
  created_at?: string;
}

// 7. RECRUITMENT DECISION
export interface RecruitmentDecision {
  id: string;
  candidate_id: string;
  decision_maker: string;
  decision: string;
  decision_date: string;
  reason?: string;
  final_score?: number;
  scout_recommendation?: string;
  coaching_recommendation?: string;
  contract_terms?: string;
  created_at?: string;
}
