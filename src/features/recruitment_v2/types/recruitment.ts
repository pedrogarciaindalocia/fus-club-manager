export type FootType = 'Droitier' | 'Gaucher' | 'Ambidextre';

export type CandidateStatus = 'registered' | 'in_trial' | 'selected' | 'rejected' | 'on_hold' | 'archived';

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
  | 'academy'           // Academy
  | 'archived';         // Archivé

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

// 1.1 MISSION SCOUTING (Délégation d'observation Scout A -> Scout B)
export interface ScoutMission {
  id: string;
  candidate_id: string;
  candidate_name?: string;
  candidate_photo?: string;
  candidate_position?: string;
  candidate_category?: string;
  candidate_club?: string;

  assigned_by_id: string;
  assigned_by_name: string;
  assigned_by_avatar?: string;

  assigned_to_id: string;
  assigned_to_name: string;
  assigned_to_avatar?: string;

  mission_title: string;
  mission_description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_at: string;
  due_date?: string;
  status: 'pending' | 'pending_ack' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  acknowledged_at?: string;
  acknowledged_by_id?: string;
  acknowledged_by_name?: string;
  completion_notes?: string;
  completed_at?: string;
  report_id?: string;
  assigned_by_role?: string;
  is_locked?: boolean;
  locked_by_role?: string;
}


export interface AdministrativeDocument {
  id: string;
  name: string;
  url: string;
  file_type?: string;
  file_size?: number;
  uploaded_at: string;
  category?: 'contract' | 'identity' | 'medical' | 'parental_consent' | 'other';
}

export interface ReferencePlayerGroup {
  category: string;
  players: Array<{ name: string; profile: string }>;
}

export const REFERENCE_PLAYER_STYLES: ReferencePlayerGroup[] = [
  {
    category: 'Défense',
    players: [
      { name: 'Achraf Hakimi', profile: 'Latéral offensif moderne / Vitesse & transition' },
      { name: 'Nayef Aguerd', profile: 'Défenseur central relanceur gaucher / Jeu aérien' },
      { name: 'Romain Saïss', profile: 'Défenseur central d\'expérience / Leadership & Duel' },
      { name: 'Noussair Mazraoui', profile: 'Latéral technique polyvalent / Intelligence tactique' },
    ]
  },
  {
    category: 'Milieu',
    players: [
      { name: 'Sofyan Amrabat', profile: 'Milieu sentinelle / Impact physique & Récupération' },
      { name: 'Hakim Ziyech', profile: 'Meneur excentré / Vision, Vista & Pied gauche d\'élite' },
      { name: 'Azzedine Ounahi', profile: 'Milieu relayeur / Élimination, Conservation & Fluidité' },
    ]
  },
  {
    category: 'Attaque',
    players: [
      { name: 'Brahim Díaz', profile: 'Milieu offensif créateur / Dribble court & Percussion' },
      { name: 'Youssef En-Nesyri', profile: 'Attaquant de pointe / Finition & Timing aérien' },
      { name: 'Abde Ezzalzouli', profile: 'Ailier explosif / Provocation 1v1 & Vitesse verticale' },
    ]
  }
];

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
  current_club?: string;
  previous_clubs?: string;
  current_team?: string;
  league_competition?: string;

  // Style de jeu de référence (Lions de l'Atlas)
  reference_player_style?: string;

  // Dossier Administratif & Contrat (Recrutement immédiat)
  administrative_documents?: AdministrativeDocument[];
  contract_type?: string;
  administrative_status?: string;
  admin_notes?: string;

  // Rapport du Joueur / Fiche Sportive
  surclassement?: string; // '0C', '+1C', '+2C', '+3C', '+4C'
  is_upgraded_category?: boolean; // Surclassé (oui ou non)
  upgraded_categories_count?: number; // 1, 2, 3, 4
  is_first_time_seen?: boolean; // Est-ce qu'on voit pour la première fois ? (oui ou non)
  potential_rating?: number; // Potentiel (1 à 10)
  performance_rating?: number; // Performance (1 à 10)
  is_starter?: boolean; // Titulaire ou non (oui ou non)
  team_formation?: string; // Formation de l'équipe (ex: 4-3-3, 4-2-3-1, 3-5-2...)
  scout_state_decision?: 'invitation_test' | 'recruit_now' | 'to_follow'; // État (invitation test, à recruter immédiatement, à suivre)
  information_source?: 'terrain' | 'recommandation_interne' | 'recommandation_externe'; // Source d’information (terrain – recommandation interne – recommandation externe)
  information_source_person?: string; // Nom et prénom de la personne source

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

  // Assignation de Mission (Scout A -> Scout B) avec Historisation
  assigned_scout_id?: string;
  assigned_scout_name?: string;
  assigned_by_scout_id?: string;
  assigned_by_scout_name?: string;
  active_mission?: ScoutMission;
  mission_history?: ScoutMission[];

  // Vidéo & Highlights Détection
  video_type?: 'youtube' | 'drive' | 'none';
  video_url?: string;

  // Pipeline Kanban & Affectation
  pipeline_stage: PipelineStage;
  status: CandidateStatus;
  assigned_team_id?: string;
  assigned_team_name?: string;
  notes?: string;
  preferred_locations?: string[]; // Zones géographiques souhaitées (sélection carte multichoix)
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
  evaluator_id?: string;
  tech_report?: string;
  tact_report?: string;
  phys_report?: string;
  ment_report?: string;
  // Intitulé du Rapport & Snapshot Sportif du Rapport
  report_title?: string;
  report_data?: {
    scout_state_decision?: string;
    is_upgraded_category?: boolean;
    upgraded_categories_count?: number;
    primary_position?: string;
    secondary_position?: string;
    preferred_foot?: string;
    height_cm?: number;
    weight_kg?: number;
    age_category?: string;
    current_club?: string;
    // Observation status & match details
    observation_status?: 'seen' | 'already_seen';
    match_observed?: string;
    is_starter?: boolean;
    is_full_match?: boolean;
    sub_out_half?: '1st' | '2nd';
    sub_out_minute?: number;
    has_subbed_in?: boolean;
    sub_in_half?: '1st' | '2nd';
    sub_in_minute?: number;
    team_formation?: string;
    matches_played?: number;
    minutes_played?: number;
    goals?: number;
    assists?: number;
    information_source?: string;
    information_source_person?: string;
    video_type?: string;
    video_url?: string;
  };

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

// 8. SAVED SHORTLIST CONFIGURATION (US-DASH-33 & US-DASH-35)
export interface SavedShortlistConfig {
  id: string;
  title: string;
  description?: string;
  scout_filter: string;
  category_filter: string;
  formation_key: string;
  custom_slot_order: Record<string, string[]>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  author_id?: string;
  author_name?: string;
  author_email?: string;
  author_role?: string;
}
