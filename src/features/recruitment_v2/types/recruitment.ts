export type FootType = 'Droitier' | 'Gaucher' | 'Ambidextre';

export type PlayerRecruitmentStatus = 'to_follow' | 'invitation_test' | 'recruit_now';

export type CandidateStatus =
  | 'registered'
  | 'in_trial'
  | 'selected'
  | 'rejected'
  | 'on_hold'
  | 'archived'
  | PlayerRecruitmentStatus;

export interface CategoryGroup {
  id: 'labellise' | 'formation' | 'senior';
  label: string;
  shortLabel: string;
  badgeClass: string;
  categories: readonly string[];
}

export const RECRUITMENT_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'labellise',
    label: 'Pôle Labellisé (École de Football)',
    shortLabel: 'Labellisé',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    categories: ['U9', 'U10', 'U11', 'U12'],
  },
  {
    id: 'formation',
    label: 'Pôle Formation (Académie & Élite)',
    shortLabel: 'Formation',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    categories: ['U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'U21', 'U22'],
  },
  {
    id: 'senior',
    label: 'Pôle Senior (Équipe Première & Espoirs)',
    shortLabel: 'Senior',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    categories: ['U23', 'SENIOR'],
  },
];

export interface PlayerStatusOption {
  value: PlayerRecruitmentStatus;
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
  colorClass: string;
}

export const PLAYER_RECRUITMENT_STATUS_OPTIONS: PlayerStatusOption[] = [
  {
    value: 'to_follow',
    label: 'À suivre',
    shortLabel: 'À suivre',
    description: 'Conserver en veille active et planifier de futures observations terrain',
    badgeClass: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30',
    colorClass: 'text-indigo-600',
  },
  {
    value: 'invitation_test',
    label: 'Inviter à un test',
    shortLabel: 'Invitation test',
    description: 'Convoquer pour match d’essai ou détection officielle à l’Académie',
    badgeClass: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
    colorClass: 'text-blue-600',
  },
  {
    value: 'recruit_now',
    label: 'Recrutement immédiatement',
    shortLabel: 'Recrutement immédiat',
    description: 'Signature prioritaire et contractualisation immédiate par le Club',
    badgeClass: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/40',
    colorClass: 'text-emerald-600',
  },
];

export type SessionStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export type RecommendationPriority = 'low' | 'medium' | 'high' | 'very_high';

import { PLAYER_CATEGORIES, normalizeAgeCategory } from '../../../constants';

export const RECRUITMENT_AGE_CATEGORIES = PLAYER_CATEGORIES;

/** Ordre chronologique croissant des catégories FUS (pour calcul du surclassement) */
const ORDERED_AGE_CATEGORIES = [
  'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16',
  'U17', 'U18', 'U19', 'U20', 'U21', 'U22', 'U23', 'SENIOR',
] as const;

export type RecruitmentAgeCategory = typeof RECRUITMENT_AGE_CATEGORIES[number];

/** Extrait le nombre de catégories de surclassement (1..4) à partir du libellé '+1C' ou du compteur numérique */
export function parseSurclassementCount(
  rawSurclass?: string | null,
  upgradedCount?: number | null
): number {
  if (upgradedCount != null && !isNaN(Number(upgradedCount)) && Number(upgradedCount) > 0) {
    return Number(upgradedCount);
  }
  if (rawSurclass && typeof rawSurclass === 'string') {
    const trimmed = rawSurclass.trim().toLowerCase();
    if (trimmed && trimmed !== '0c' && trimmed !== 'non' && trimmed !== 'non surclassé' && trimmed.includes('+')) {
      const parsed = parseInt(trimmed.replace(/\D/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return 0;
}

/**
 * Calcule la catégorie cible d'un joueur surclassé à partir de sa catégorie principale
 * et du nombre de catégories de surclassement (+1C -> +1 cran, etc.).
 * Exemple : base 'U15', +1 -> 'U16'.
 */
export function getSurclassementTargetCategory(
  baseCategory?: string | null,
  upgradedCount?: number | null
): string | null {
  if (!baseCategory || !upgradedCount || upgradedCount <= 0) return null;
  const normalizedBase = normalizeAgeCategory(baseCategory);
  const idx = ORDERED_AGE_CATEGORIES.indexOf(normalizedBase as any);
  if (idx === -1 || idx >= ORDERED_AGE_CATEGORIES.length - 1) return null;
  const targetIdx = Math.min(ORDERED_AGE_CATEGORIES.length - 1, idx + upgradedCount);
  if (targetIdx <= idx) return null;
  return ORDERED_AGE_CATEGORIES[targetIdx];
}

export interface ResolvedSurclassementInfo {
  isUpgraded: boolean;
  count: number;
  baseCategory: string;
  targetCategory: string | null;
  codeLabel: string;
  shortBadgeText: string;
}

/**
 * Résout de manière uniforme le statut de surclassement et la catégorie cible exacte
 * (utilisé sur les rapports, les fiches candidats et le tableau Database).
 */
export function resolveSurclassementInfo(params: {
  baseCategory?: string | null;
  birthDate?: string | null;
  isUpgraded?: boolean | null;
  rawSurclass?: string | null;
  upgradedCount?: number | null;
  storedTargetCategory?: string | null;
  hasReports?: boolean;
}): ResolvedSurclassementInfo {
  const effectiveBase = params.birthDate
    ? getAgeCategoryFromBirthDate(params.birthDate, params.baseCategory || 'U19')
    : normalizeAgeCategory(params.baseCategory || 'U19');

  // Règle métier : si le joueur n'a aucun rapport (0 rapport), il n'y a pas de surclassement
  if (params.hasReports === false || (params.isUpgraded === false && !params.rawSurclass && !params.upgradedCount)) {
    return {
      isUpgraded: false,
      count: 0,
      baseCategory: effectiveBase,
      targetCategory: null,
      codeLabel: '0C',
      shortBadgeText: '0C (Non surclassé)',
    };
  }

  const parsedCount = parseSurclassementCount(params.rawSurclass, params.upgradedCount);
  const hasRawSignal = Boolean(
    params.rawSurclass &&
    !['0c', 'non', 'non surclassé', '0', ''].includes(String(params.rawSurclass).trim().toLowerCase())
  );
  const targetFromStored = params.storedTargetCategory ? normalizeAgeCategory(params.storedTargetCategory) : null;
  const hasStoredDiffTarget = Boolean(targetFromStored && targetFromStored !== normalizeAgeCategory(effectiveBase));

  const explicitlyNormal = params.isUpgraded === false && parsedCount === 0 && !hasRawSignal;
  const isUpgraded = explicitlyNormal
    ? false
    : Boolean(params.isUpgraded || parsedCount > 0 || hasRawSignal || hasStoredDiffTarget);
  const finalCount = isUpgraded ? (parsedCount > 0 ? parsedCount : 1) : 0;
  const computedTarget = isUpgraded
    ? (targetFromStored || getSurclassementTargetCategory(effectiveBase, finalCount))
    : null;

  const codeLabel = isUpgraded ? `+${finalCount}C` : '0C';
  const shortBadgeText = isUpgraded
    ? (computedTarget ? `en ${computedTarget} (${codeLabel})` : codeLabel)
    : '0C (Non surclassé)';

  return {
    isUpgraded,
    count: finalCount,
    baseCategory: effectiveBase,
    targetCategory: computedTarget,
    codeLabel,
    shortBadgeText,
  };
}

/**
 * Résout le surclassement d'un joueur ou d'un rapport spécifique :
 * - Si totalReportsCount === 0 (aucun rapport), garantit "aucun surclassement".
 * - Si le rapport contient ses propres champs surclassement dans report_data, les utilise exclusivement.
 */
export function resolveReportOrCandidateSurclassement(params: {
  candidate: {
    age_category?: string | null;
    birth_date?: string | null;
    is_upgraded_category?: boolean | null;
    surclassement?: string | null;
    upgraded_categories_count?: number | null;
    surclassement_category?: string | null;
  };
  evaluation?: {
    report_data?: {
      age_category?: string | null;
      is_upgraded_category?: boolean | null;
      surclassement?: string | null;
      upgraded_categories_count?: number | null;
      surclassement_category?: string | null;
    };
  } | null;
  totalReportsCount?: number;
}): ResolvedSurclassementInfo {
  const { candidate, evaluation, totalReportsCount } = params;
  const baseCat = evaluation?.report_data?.age_category || candidate.age_category;

  if (totalReportsCount === 0) {
    return resolveSurclassementInfo({
      baseCategory: baseCat,
      birthDate: candidate.birth_date,
      hasReports: false,
    });
  }

  const rd = evaluation?.report_data;
  const reportHasOwnSurclass = Boolean(
    rd && (
      rd.is_upgraded_category !== undefined ||
      rd.upgraded_categories_count !== undefined ||
      (rd as any).surclassement !== undefined ||
      rd.surclassement_category !== undefined
    )
  );

  if (rd && reportHasOwnSurclass) {
    return resolveSurclassementInfo({
      baseCategory: baseCat,
      birthDate: candidate.birth_date,
      isUpgraded: rd.is_upgraded_category,
      rawSurclass: (rd as any).surclassement,
      upgradedCount: rd.upgraded_categories_count,
      storedTargetCategory: rd.surclassement_category,
      hasReports: true,
    });
  }

  return resolveSurclassementInfo({
    baseCategory: baseCat,
    birthDate: candidate.birth_date,
    isUpgraded: candidate.is_upgraded_category,
    rawSurclass: candidate.surclassement,
    upgradedCount: candidate.upgraded_categories_count,
    storedTargetCategory: candidate.surclassement_category,
    hasReports: totalReportsCount === undefined ? Boolean(evaluation) : totalReportsCount > 0,
  });
}

/**
 * Calcul exact de l'âge d'un candidat à partir de sa date de naissance
 */
export function calculateCandidateAge(birthDateStr?: string | null): number | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Déduit automatiquement la catégorie d'âge officielle FUS à partir de la date de naissance
 * (ex: 13 ans -> U13).
 */
export function getAgeCategoryFromBirthDate(birthDateStr?: string | null, fallbackCategory = 'U19'): string {
  const age = calculateCandidateAge(birthDateStr);
  if (age === null) return fallbackCategory;
  if (age <= 9) return 'U9';
  if (age === 10) return 'U10';
  if (age === 11) return 'U11';
  if (age === 12) return 'U12';
  if (age === 13) return 'U13';
  if (age === 14) return 'U14';
  if (age === 15) return 'U15';
  if (age === 16) return 'U16';
  if (age === 17) return 'U17';
  if (age === 18) return 'U18';
  if (age === 19) return 'U19';
  if (age === 20) return 'U20';
  if (age === 21) return 'U21';
  if (age === 22) return 'U22';
  if (age === 23) return 'U23';
  return 'SENIOR';
}

/**
 * Renvoie le pôle FUS (Labellisé, Formation, Senior) correspondant à une catégorie
 */
export function getPoleFromCategory(category?: string | null): CategoryGroup | null {
  if (!category) return null;
  const upper = category.toUpperCase().trim();
  for (const group of RECRUITMENT_CATEGORY_GROUPS) {
    if (group.categories.map(c => c.toUpperCase()).includes(upper)) {
      return group;
    }
  }
  return null;
}

/**
 * Regroupe une liste de catégories d'âge selon les 3 pôles FUS (Labellisé, Formation, Senior)
 */
export function groupCategoriesByPole(categories: readonly string[] | string[]) {
  const labelliseCats = ['U9', 'U10', 'U11', 'U12'];
  const formationCats = ['U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'U21', 'U22'];
  const seniorCats = ['U23', 'SENIOR'];

  const inLabellise = categories.filter(c => labelliseCats.includes(c));
  const inFormation = categories.filter(c => formationCats.includes(c));
  const inSenior = categories.filter(c => seniorCats.includes(c));
  const otherCats = categories.filter(c => !labelliseCats.includes(c) && !formationCats.includes(c) && !seniorCats.includes(c));

  return {
    labellise: inLabellise,
    formation: inFormation,
    senior: inSenior,
    other: otherCats,
  };
}

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
  surclassement_category?: string; // Catégorie cible atteinte en surclassement (ex: 'U16' pour un U15 +1C)
  is_upgraded_category?: boolean; // Surclassé (oui ou non)
  upgraded_categories_count?: number; // 1, 2, 3, 4
  is_first_time_seen?: boolean; // Est-ce qu'on voit pour la première fois ? (oui ou non)
  potential_rating?: number | null; // Potentiel (0 à 10, 0 par défaut si non évalué)
  performance_rating?: number; // Performance (0 à 10, 0 par défaut si non évalué)
  is_starter?: boolean; // Titulaire ou non (oui ou non)
  scout_state_decision?: 'invitation_test' | 'recruit_now' | 'to_follow'; // État (invitation test, à recruter immédiatement, à suivre)
  is_recruit_now_validated?: boolean; // Validé pour recrutement immédiat par la direction
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
  initial_scout_score?: number | null;
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

  // Grille dynamique spécialisée par poste (Nom du critère -> Note 0-10)
  criteria_scores?: Record<string, number>;
  position_code?: string;
  potential_rating?: number | null;

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
    surclassement?: string;
    surclassement_category?: string;
    primary_position?: string;
    secondary_position?: string;
    preferred_foot?: string;
    height_cm?: number;
    weight_kg?: number;
    age_category?: string;
    performance_rating?: number;
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
