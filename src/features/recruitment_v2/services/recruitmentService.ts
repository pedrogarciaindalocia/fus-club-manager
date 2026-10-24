import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import { getMyClubId } from '../../../services/_helpers';
import { AuditLogger } from '../../../services/auditLogger';
import type {
  Scout,
  TrialCandidate,
  PlayerTest,
  CandidateEvaluation,
  ScoutObservation,
  RecruitmentTimelineEvent,
  RecruitmentDecision,
  PipelineStage,
  EvaluationVerdict,
  ScoutMission,
  SavedShortlistConfig,
  AdministrativeDocument
} from '../types/recruitment';
import {
  initialMockScouts,
  initialMockCandidates,
  initialMockTests,
  initialMockEvaluations,
  initialMockObservations,
  initialMockTimeline,
} from '../mocks/mockRecruitmentData';

// Storage keys (Résilience & Cache Local)
const KEY_SCOUTS = 'fus_rec_scouts_v2';
const KEY_CANDIDATES = 'fus_rec_candidates_u13_v1';
const KEY_TESTS = 'fus_rec_tests_u13_v1';
const KEY_EVALS = 'fus_rec_evaluations_u13_v1';
const KEY_OBS = 'fus_rec_observations_v2';
const KEY_TIMELINE = 'fus_rec_timeline_v2';
const KEY_CLEARED = 'fus_rec_is_cleared_v2';
const KEY_SAVED_SHORTLISTS = 'fusc_saved_shortlists_v2';

/** Valide si un identifiant est un UUID PostgreSQL conforme (32 caractères hexadécimaux avec tirets) */
export function isValidUuid(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

/** Garantit un UUID v4 valide */
export function ensureUuid(id?: string | null): string {
  if (isValidUuid(id)) return id!;
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
}

/**
 * Génère un mot de passe temporaire hautement sécurisé (12 caractères avec majuscules, minuscules, chiffres et symboles)
 * Conforme US-DASH-34
 */
export function generateSecureTempPassword(): string {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';

  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  const chars = [
    pick(uppers),
    pick(lowers),
    pick(digits),
    pick(symbols),
    pick(uppers),
    pick(lowers),
    pick(digits),
    pick(symbols),
  ];

  // Mélange Fisher-Yates
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return `Fus#${chars.join('')}!`;
}

/**
 * Génère un identifiant / login standardisé pour un scout (ou réutilise son email)
 * Conforme US-DASH-34
 */
export function generateScoutLogin(fullName: string, existingEmail?: string): string {
  if (existingEmail && existingEmail.trim().length > 0) {
    return existingEmail.trim().toLowerCase();
  }
  const cleanName = (fullName || 'scout')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.');
  return `${cleanName}@fus.ma`;
}

/**
 * Mapping des verdicts frontend vers les valeurs autorisées par la contrainte CHECK PostgreSQL :
 * CHECK (verdict::text = ANY (ARRAY['sign_immediately', 'sign_academy', 'second_trial', 'standby', 'reject']))
 */
export function mapVerdictToSupabase(v?: string): string {
  switch (v) {
    case 'contract_proposal':
    case 'signed':
    case 'sign_immediately':
      return 'sign_immediately';
    case 'recommend_academy':
    case 'sign_academy':
      return 'sign_academy';
    case 'additional_test':
    case 'second_trial':
      return 'second_trial';
    case 'reject':
      return 'reject';
    case 'shortlist':
    case 'monitor':
    case 'recommend_team':
    case 'standby':
    default:
      return 'standby';
  }
}

/** Mapping inverse de la base vers les types de l'IHM */
export function mapVerdictFromSupabase(v?: string): EvaluationVerdict {
  switch (v) {
    case 'sign_immediately':
      return 'contract_proposal';
    case 'sign_academy':
      return 'recommend_academy';
    case 'second_trial':
      return 'additional_test';
    case 'standby':
      return 'shortlist';
    case 'reject':
      return 'reject';
    default:
      return (v as any) || 'shortlist';
  }
}

/** Extrait les métadonnées de missions et d'administration sérialisées dans le champ notes */
export function parseMissionsMetadata(notes?: string): {
  active_mission?: ScoutMission;
  mission_history?: ScoutMission[];
  reference_player_style?: string;
  administrative_documents?: AdministrativeDocument[];
  contract_type?: string;
  administrative_status?: string;
  admin_notes?: string;
} {
  if (!notes || !notes.includes('[MISSIONS_METADATA]:')) return {};
  try {
    const metaJson = notes.split('[MISSIONS_METADATA]:')[1];
    return JSON.parse(metaJson);
  } catch {
    return {};
  }
}

/** Nettoie le champ notes pour masquer le bloc technique de métadonnées à l'affichage */
export function cleanNotesForDisplay(notes?: string): string {
  if (!notes) return '';
  return notes.replace(/\n?\[MISSIONS_METADATA\]:.*$/s, '').trim();
}

// Colonnes existantes dans la table trial_candidates (Supabase)
const SUPABASE_CANDIDATE_COLUMNS = new Set([
  'id', 'created_at', 'updated_at',
  'first_name', 'last_name', 'birth_date', 'birth_place', 'nationality', 'gender',
  'photo_url', 'address', 'city', 'country',
  'phone', 'email', 'agent_name',
  'guardian_name', 'guardian_relationship', 'guardian_phone', 'guardian_phone_alt',
  'guardian_email', 'guardian_address', 'emergency_contact', 'guardian_consent_status',
  'primary_position', 'secondary_position', 'preferred_foot',
  'height_cm', 'weight_kg', 'age_category',
  'is_upgraded_category', 'upgraded_categories_count', 'is_first_time_seen',
  'potential_rating', 'performance_rating', 'is_starter', 'team_formation', 'scout_state_decision',
  'origin_club', 'current_club', 'previous_clubs', 'current_team', 'league_competition',
  'matches_played', 'minutes_played', 'goals', 'assists',
  'yellow_cards', 'red_cards', 'national_selections', 'injury_history', 'sporting_achievements',
  'discovering_scout_id', 'discovering_scout_name', 'discovery_date',
  'discovery_location', 'discovery_match',
  'recommendation_priority', 'initial_scout_score', 'scout_recommendation_notes',
  'recruiter_id', 'recruiter_name',
  'video_type', 'video_url',
  'pipeline_stage', 'status',
  'assigned_team_id', 'assigned_team_name',
  'notes', 'preferred_locations',
]);

/**
 * Filtre et adapte un objet candidat pour la table PostgreSQL public.trial_candidates.
 * Synchronise recruiter_id/name et sérialise la mission active/historique dans notes.
 */
function toSupabasePayload(candidate: Record<string, any>): Record<string, any> {
  const payload: Record<string, any> = {};

  if (candidate.id) {
    payload.id = ensureUuid(candidate.id);
  }

  // Synchronisation assignation scout vers recruiter_id et recruiter_name
  if (candidate.assigned_scout_id !== undefined) {
    payload.recruiter_id = candidate.assigned_scout_id || null;
  }
  if (candidate.assigned_scout_name !== undefined) {
    payload.recruiter_name = candidate.assigned_scout_name || null;
  }

  // Traitement et sérialisation des métadonnées de missions et d'administration dans notes
  const baseNotes = cleanNotesForDisplay(candidate.notes || '');
  const activeMission = candidate.active_mission;
  const missionHistory = candidate.mission_history;
  const reference_player_style = candidate.reference_player_style;
  const administrative_documents = candidate.administrative_documents;
  const contract_type = candidate.contract_type;
  const administrative_status = candidate.administrative_status;
  const admin_notes = candidate.admin_notes;

  const hasExtraMeta = activeMission ||
    (missionHistory && missionHistory.length > 0) ||
    reference_player_style ||
    (administrative_documents && administrative_documents.length > 0) ||
    contract_type ||
    administrative_status ||
    admin_notes;

  if (hasExtraMeta) {
    const metaBlock = `\n[MISSIONS_METADATA]:` + JSON.stringify({
      active_mission: activeMission || null,
      mission_history: missionHistory || [],
      reference_player_style: reference_player_style || null,
      administrative_documents: administrative_documents || [],
      contract_type: contract_type || null,
      administrative_status: administrative_status || null,
      admin_notes: admin_notes || null,
    });
    payload.notes = baseNotes + metaBlock;
  } else if (candidate.notes !== undefined) {
    payload.notes = baseNotes;
  }

  // Contraintes CHECK PostgreSQL
  if (candidate.preferred_foot) {
    const pf = String(candidate.preferred_foot).toLowerCase();
    if (pf.includes('gauch')) payload.preferred_foot = 'Gaucher';
    else if (pf.includes('ambi')) payload.preferred_foot = 'Ambidextre';
    else payload.preferred_foot = 'Droitier';
  }

  if (candidate.status) {
    const validStatuses = new Set(['registered', 'in_trial', 'selected', 'rejected', 'on_hold']);
    payload.status = validStatuses.has(candidate.status) ? candidate.status : 'registered';
  }

  for (const [key, val] of Object.entries(candidate)) {
    if (key === 'notes' && payload.notes !== undefined) continue;
    if (key === 'preferred_foot' && payload.preferred_foot) continue;
    if (key === 'status' && payload.status) continue;
    if (SUPABASE_CANDIDATE_COLUMNS.has(key) && val !== undefined) {
      payload[key] = val;
    }
  }

  // Mapping si origin_club est manquant
  if (!payload.origin_club && payload.current_club) {
    payload.origin_club = payload.current_club;
  }

  return payload;
}

/** Extrait les métadonnées de rapport enrichies stockées dans le champ general_notes */
export function parseReportMetadata(generalNotes?: string): any {
  if (!generalNotes || !generalNotes.includes('[REPORT_METADATA]:')) return {};
  try {
    const metaJson = generalNotes.split('[REPORT_METADATA]:')[1];
    return JSON.parse(metaJson);
  } catch {
    return {};
  }
}

/** Nettoie le champ general_notes pour masquer le bloc technique de métadonnées à l'affichage */
export function cleanGeneralNotes(generalNotes?: string): string {
  if (!generalNotes) return '';
  return generalNotes.replace(/\n?\[REPORT_METADATA\]:.*$/s, '').trim();
}

/**
 * Prépare le payload pour candidate_evaluations en conformité stricte avec PostgreSQL :
 * - Normalise les sous-critères (0-100 entier)
 * - Mappe le verdict vers la contrainte CHECK PostgreSQL
 * - EXCLUT les colonnes calculées (overall_score, etc.)
 * - Sérialise les champs enrichis (report_title, report_data, etc.) dans general_notes
 */
function toSupabaseEvaluationPayload(evaluation: Record<string, any>): Record<string, any> {
  const payload: Record<string, any> = {};

  const techFb = evaluation.technical_score !== undefined ? Math.round(Number(evaluation.technical_score) * 10) : 70;
  const physFb = evaluation.physical_score !== undefined ? Math.round(Number(evaluation.physical_score) * 10) : 70;
  const tactFb = evaluation.tactical_score !== undefined ? Math.round(Number(evaluation.tactical_score) * 10) : 70;
  const mentFb = evaluation.mental_score !== undefined ? Math.round(Number(evaluation.mental_score) * 10) : 70;

  const toDbScore = (val: any, fallback: number = 70): number => {
    if (val === undefined || val === null || isNaN(Number(val))) return fallback;
    const num = Number(val);
    if (num <= 10) return Math.min(100, Math.max(0, Math.round(num * 10)));
    return Math.min(100, Math.max(0, Math.round(num)));
  };

  payload.id = ensureUuid(evaluation.id);
  payload.candidate_id = evaluation.candidate_id;
  payload.session_id = isValidUuid(evaluation.session_id || evaluation.test_id)
    ? (evaluation.session_id || evaluation.test_id)
    : null;
  payload.evaluator_name = evaluation.evaluator_name || 'Scout Principal';
  payload.evaluation_date = evaluation.evaluation_date || new Date().toISOString().split('T')[0];

  // Physique (0-100)
  payload.phys_speed = toDbScore(evaluation.phys_speed ?? evaluation.phys_sprint_speed ?? evaluation.phys_acceleration, physFb);
  payload.phys_endurance = toDbScore(evaluation.phys_endurance, physFb);
  payload.phys_strength = toDbScore(evaluation.phys_strength, physFb);
  payload.phys_agility = toDbScore(evaluation.phys_agility, physFb);
  payload.phys_jump = toDbScore(evaluation.phys_jump ?? evaluation.phys_explosiveness ?? evaluation.phys_balance, physFb);

  // Mental (0-100)
  payload.ment_determination = toDbScore(evaluation.ment_determination, mentFb);
  payload.ment_focus = toDbScore(evaluation.ment_focus, mentFb);
  payload.ment_teamwork = toDbScore(evaluation.ment_teamwork, mentFb);
  payload.ment_composure = toDbScore(evaluation.ment_composure, mentFb);
  payload.ment_leadership = toDbScore(evaluation.ment_leadership, mentFb);

  // Tactique (0-100)
  payload.tact_positioning = toDbScore(evaluation.tact_positioning, tactFb);
  payload.tact_vision = toDbScore(evaluation.tact_vision ?? evaluation.tact_awareness, tactFb);
  payload.tact_anticipation = toDbScore(evaluation.tact_anticipation, tactFb);
  payload.tact_game_iq = toDbScore(evaluation.tact_game_iq ?? evaluation.tact_decision_making, tactFb);
  payload.tact_transition = toDbScore(evaluation.tact_transition ?? evaluation.tact_space_awareness, tactFb);

  // Technique (0-100)
  payload.tech_first_touch = toDbScore(evaluation.tech_first_touch ?? evaluation.tech_ball_control, techFb);
  payload.tech_passing = toDbScore(evaluation.tech_passing ?? evaluation.tech_passing_short ?? evaluation.tech_passing_long, techFb);
  payload.tech_shooting = toDbScore(evaluation.tech_shooting ?? evaluation.tech_finishing, techFb);
  payload.tech_dribbling = toDbScore(evaluation.tech_dribbling, techFb);
  payload.tech_heading = toDbScore(evaluation.tech_heading, techFb);

  // Verdict (Contrainte CHECK PostgreSQL)
  payload.verdict = mapVerdictToSupabase(evaluation.verdict);

  // Textes & Rapports
  if (evaluation.strengths !== undefined) payload.strengths = evaluation.strengths || null;
  if (evaluation.weaknesses !== undefined) payload.weaknesses = evaluation.weaknesses || null;
  if (evaluation.projection !== undefined) payload.projection = evaluation.projection || null;

  // Volets 1, 2 et 3 enrichis (Observation Terrain, Qualités & Synthèses)
  // Sérialisés dans general_notes pour garantir la compatibilité et persistance sur Supabase
  const metaObj: Record<string, any> = {};
  if (evaluation.report_title) metaObj.report_title = evaluation.report_title;
  if (evaluation.report_data) metaObj.report_data = evaluation.report_data;
  if (evaluation.criteria_scores) metaObj.criteria_scores = evaluation.criteria_scores;
  if (evaluation.technical_score !== undefined) metaObj.technical_score = evaluation.technical_score;
  if (evaluation.physical_score !== undefined) metaObj.physical_score = evaluation.physical_score;
  if (evaluation.tactical_score !== undefined) metaObj.tactical_score = evaluation.tactical_score;
  if (evaluation.mental_score !== undefined) metaObj.mental_score = evaluation.mental_score;
  if (evaluation.overall_score !== undefined) metaObj.overall_score = evaluation.overall_score;
  if (evaluation.position_evaluated || evaluation.primary_position) {
    metaObj.position_evaluated = evaluation.position_evaluated || evaluation.primary_position;
  }
  if (evaluation.tech_report) metaObj.tech_report = evaluation.tech_report;
  if (evaluation.tact_report) metaObj.tact_report = evaluation.tact_report;
  if (evaluation.phys_report) metaObj.phys_report = evaluation.phys_report;
  if (evaluation.ment_report) metaObj.ment_report = evaluation.ment_report;
  if (evaluation.evaluator_id) metaObj.evaluator_id = evaluation.evaluator_id;
  if (evaluation.evaluator_name) metaObj.evaluator_name = evaluation.evaluator_name;
  if (evaluation.evaluator_role) metaObj.evaluator_role = evaluation.evaluator_role;
  if (evaluation.potential_rating != null) metaObj.potential_rating = evaluation.potential_rating;
  if (evaluation.created_at) metaObj.created_at = evaluation.created_at;

  const baseNotes = cleanGeneralNotes(evaluation.general_notes || '');
  if (Object.keys(metaObj).length > 0) {
    const metaBlock = `\n[REPORT_METADATA]:` + JSON.stringify(metaObj);
    payload.general_notes = (baseNotes + metaBlock).trim();
  } else if (evaluation.general_notes !== undefined) {
    payload.general_notes = baseNotes;
  }

  return payload;
}

// Aliases for safety
const KEY_EVALUATIONS = KEY_EVALS;
const KEY_OBSERVATIONS = KEY_OBS;

function getLocal<T>(key: string, fallback: T): T {
  try {
    const r = localStorage.getItem(key);
    if (r !== null) return JSON.parse(r);
  } catch (err) {
    console.warn(`[RecruitmentService] Erreur lecture localStorage (${key}):`, err);
  }
  return fallback;
}

function setLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[RecruitmentService] Erreur écriture localStorage (${key}):`, err);
  }
}

export const recruitmentService = {
  // 1. SCOUTS (Synchronisé Supabase avec Résilience Cache Local & Déduplication stricte)
  async getScouts(): Promise<Scout[]> {
    const deduplicate = (list: Scout[]): Scout[] => {
      const byEmail = new Map<string, Scout>();
      const byName = new Map<string, Scout>();
      const byId = new Map<string, Scout>();
      const result: Scout[] = [];

      list.forEach(s => {
        if (!s) return;
        const idKey = s.id?.trim();
        const emailKey = s.email?.toLowerCase().trim();
        const nameKey = s.full_name?.toLowerCase().trim().replace(/\s+/g, ' ');

        const existing = (idKey ? byId.get(idKey) : null) ||
                         (emailKey ? byEmail.get(emailKey) : null) ||
                         (nameKey ? byName.get(nameKey) : null);

        if (!existing) {
          if (idKey) byId.set(idKey, s);
          if (emailKey) byEmail.set(emailKey, s);
          if (nameKey) byName.set(nameKey, s);
          result.push(s);
        } else {
          // Fusionner et conserver la fiche la plus complète et officielle (fus.ma, photo, catégories)
          const isMoreOfficial = (s.email?.endsWith('@fus.ma') && !existing.email?.endsWith('@fus.ma')) ||
            (!existing.photo_url && s.photo_url) ||
            (!existing.phone && s.phone) ||
            ((s.assigned_categories?.length || 0) > (existing.assigned_categories?.length || 0));

          if (isMoreOfficial) {
            const idx = result.indexOf(existing);
            if (idx !== -1) {
              result[idx] = { ...existing, ...s };
              if (idKey) byId.set(idKey, result[idx]);
              if (emailKey) byEmail.set(emailKey, result[idx]);
              if (nameKey) byName.set(nameKey, result[idx]);
            }
          }
        }
      });
      return result;
    };

    try {
      const [scoutsRes, profilesRes, sessionsRes] = await Promise.all([
        supabase.from('scouts').select('*').order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('id, full_name, avatar_url, system_role, is_active, job_title, phone_number, default_club_id, created_at'),
        supabase.from('user_sessions').select('user_id, user_email, user_role')
      ]);

      if (scoutsRes.error) {
        console.warn('[RecruitmentService] Supabase getScouts erreur, bascule cache local:', scoutsRes.error.message);
      }

      let combined: Scout[] = [];
      if (scoutsRes.data && scoutsRes.data.length > 0) {
        combined = [...scoutsRes.data];
      }

      // Map des emails de session réels
      const sessionEmailMap = new Map<string, string>();
      sessionsRes.data?.forEach((s: any) => {
        if (s?.user_id && s?.user_email && s.user_email !== 'invite@fus.ma') {
          sessionEmailMap.set(s.user_id, s.user_email);
        }
      });

      // Map des profils utilisateurs pour enrichir les scouts avec leur rôle réel (Scout Admin / Scout Manager)
      const profileMap = new Map<string, any>();
      const profileByEmail = new Map<string, any>();
      const profileByName = new Map<string, any>();
      profilesRes.data?.forEach((p: any) => {
        if (!p) return;
        if (p.id) profileMap.set(p.id, p);
        if (p.email) profileByEmail.set(p.email.toLowerCase().trim(), p);
        if (p.full_name) profileByName.set(p.full_name.toLowerCase().trim().replace(/\s+/g, ' '), p);
      });

      // Enrichir les scouts de la cellule avec leur rôle réel (Scout Admin / Scout Manager)
      combined = combined.map(s => {
        const p = profileMap.get(s.id) || 
                  (s.email ? profileByEmail.get(s.email.toLowerCase().trim()) : null) || 
                  (s.full_name ? profileByName.get(s.full_name.toLowerCase().trim().replace(/\s+/g, ' ')) : null);
        
        if (!p) return s;

        const sysRole = (p.system_role || '').toLowerCase().trim();
        let roleTitle = s.role_title;
        if (sysRole === 'scout_admin') {
          roleTitle = 'Scout Admin';
        } else if (sysRole === 'scout_manager' && (!roleTitle || roleTitle === 'Scout')) {
          roleTitle = 'Scout Manager';
        }

        return {
          ...s,
          photo_url: s.photo_url || p.avatar_url || undefined,
          phone: s.phone || p.phone_number || '',
          role_title: roleTitle,
          system_role: sysRole || (s as any).system_role,
        };
      });

      // Synchroniser UNIQUEMENT les profils dont le rôle est explicitement Scout Admin ou Scout Manager
      // (Exclusion stricte des administrateurs généraux du club, Directeurs ou Analystes vidéo hors détection)
      if (profilesRes.data && profilesRes.data.length > 0) {
        profilesRes.data.forEach((p: any) => {
          if (!p || !p.id) return;
          const sysRole = (p.system_role || '').toLowerCase().trim();
          const jobTitle = (p.job_title || '').toLowerCase().trim();

          const isScoutPersonnel = (
            sysRole === 'scout_admin' ||
            sysRole === 'scout_manager' ||
            (jobTitle.includes('scout') && (jobTitle.includes('admin') || jobTitle.includes('manager')))
          );

          if (!isScoutPersonnel) return;

          const roleTitle = sysRole === 'scout_admin' 
            ? 'Scout Admin' 
            : sysRole === 'scout_manager' 
              ? 'Scout Manager' 
              : p.job_title;

          const email = (p as any).email || sessionEmailMap.get(p.id) || '';

          const profileScout: Scout = {
            id: p.id,
            full_name: p.full_name || 'Membre Cellule Détection',
            photo_url: p.avatar_url || undefined,
            phone: p.phone_number || '',
            email: email,
            role_title: roleTitle,
            recruitment_region: 'Rabat-Salé-Kénitra',
            assigned_categories: ['U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U21', 'U23', 'Sénior'],
            assigned_teams: [],
            status: p.is_active !== false ? 'active' : 'inactive',
            recruited_date: p.created_at ? p.created_at.split('T')[0] : '2024-01-01',
            notes: `Profil ${sysRole} synchronisé`,
            ...({ system_role: sysRole }),
          };

          combined.push(profileScout);
        });
      }

      if (combined.length > 0) {
        const uniqueData = deduplicate(combined);
        setLocal(KEY_SCOUTS, uniqueData);
        return uniqueData;
      }
    } catch (err) {
      console.warn('[RecruitmentService] Exception getScouts, bascule cache local:', err);
    }
    const local = getLocal<Scout[]>(KEY_SCOUTS, []);
    return deduplicate(local);
  },

  /**
   * Provisionne les identifiants d'un Scout Manager dans Supabase Auth (mot de passe haché bcrypt)
   * et configure user_profiles avec force_password_change = true (US-DASH-34)
   */
  async provisionScoutCredentials(params: {
    scoutId: string;
    login: string;
    tempPassword: string;
    fullName: string;
    phone?: string;
    roleTitle?: string;
  }): Promise<{ success: boolean; message?: string }> {
    const { scoutId, login, tempPassword, fullName, phone, roleTitle } = params;
    const cleanEmail = login.trim().toLowerCase();
    const mapRoleTitleToSystemRole = (title?: string): string => {
      if (!title) return 'scout_manager';
      const lower = title.toLowerCase().trim();
      if (lower === 'scout_admin' || lower.includes('admin')) return 'scout_admin';
      if (lower === 'scout_manager' || lower.includes('manager')) return 'scout_manager';
      if (lower === 'scout_editor' || lower.includes('éditeur') || lower.includes('editeur') || lower.includes('editor')) return 'scout_editor';
      if (lower === 'scout_user' || lower.includes('user') || lower.includes('viewer')) return 'scout_user';
      return 'scout_manager';
    };
    const systemRole = mapRoleTitleToSystemRole(roleTitle);

    // 1. Tenter la gestion via l'Edge Function sécurisée create-user
    try {
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('create-user', {
        body: {
          action: 'create',
          email: cleanEmail,
          password: tempPassword,
          full_name: fullName,
          system_role: systemRole,
          job_title: roleTitle || (systemRole === 'scout_admin' ? 'Scout Admin' : 'Scout Manager'),
          phone_number: phone || null,
        }
      });

      if (!edgeErr && edgeData?.user?.id) {
        const finalUserId = edgeData.user.id;
        if (isValidUuid(scoutId)) {
          await supabase.from('scouts').update({
            email: cleanEmail,
            phone: phone || null,
            full_name: fullName,
            role_title: roleTitle || (systemRole === 'scout_admin' ? 'Scout Admin' : 'Scout Manager'),
            updated_at: new Date().toISOString()
          }).eq('id', scoutId);
        }
        return { success: true, message: 'Compte scout configuré avec succès via Edge Function', userId: finalUserId };
      }
    } catch (edgeEx) {
      console.warn('[RecruitmentService] Exception via Edge Function create-user, repli sur RPC:', edgeEx);
    }

    // 2. Repli : Tenter la procédure RPC sécurisée admin_provision_scout_credentials
    try {
      const targetUuid = isValidUuid(scoutId) ? scoutId : null;
      const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)('admin_provision_scout_credentials', {
        target_user_id: targetUuid,
        temp_password: tempPassword,
        target_email: cleanEmail,
        target_full_name: fullName,
        target_phone: phone || null,
        target_role: systemRole
      });

      if (!rpcErr && rpcData?.success) {
        return { success: true, message: rpcData.message };
      }
      if (rpcErr) {
        console.warn('[RecruitmentService] admin_provision_scout_credentials RPC error:', rpcErr.message || rpcErr);
      }
    } catch (e) {
      console.warn('[RecruitmentService] Exception RPC provision scout:', e);
    }

    return { success: true };
  },

  /**
   * Provisionne ou met à jour les identifiants d'un utilisateur (tout rôle / tout poste)
   * avec mot de passe temporaire chiffré et forçage de changement à la première connexion (force_password_change = true).
   */
  async provisionUserCredentials(params: {
    userId?: string;
    login: string;
    tempPassword: string;
    fullName: string;
    phone?: string;
    systemRole?: string;
    jobTitle?: string;
  }): Promise<{ success: boolean; message?: string; userId?: string }> {
    const { userId, login, tempPassword, fullName, phone, systemRole, jobTitle } = params;
    const cleanEmail = login.trim().toLowerCase();
    const finalRole = systemRole || 'viewer';
    const finalTitle = jobTitle || 'Collaborateur';

    // 1. Tenter via service_role si disponible
    // 1. Tenter en priorité absolue la RPC universelle admin_provision_user_credentials (directe, atomique et 100% fiable)
    try {
      const targetUuid = isValidUuid(userId) ? userId : null;
      const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)('admin_provision_user_credentials', {
        target_user_id: targetUuid,
        temp_password: tempPassword,
        target_email: cleanEmail,
        target_full_name: fullName,
        target_phone: phone || null,
        target_role: finalRole,
        target_job_title: finalTitle
      });

      if (!rpcErr && rpcData?.success) {
        return { success: true, message: rpcData.message, userId: rpcData.user_id };
      }
      if (rpcErr) {
        console.warn('[RecruitmentService] RPC admin_provision_user_credentials notice, fallback service_role:', rpcErr);
      }
    } catch (e) {
      console.warn('[RecruitmentService] RPC admin_provision_user_credentials exception:', e);
    }

    // 2. Repli secondaire via Edge Function sécurisée create-user
    try {
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('create-user', {
        body: {
          action: 'create',
          email: cleanEmail,
          password: tempPassword,
          full_name: fullName,
          system_role: finalRole,
          job_title: finalTitle,
          phone_number: phone || null,
        }
      });

      if (!edgeErr && edgeData?.user?.id) {
        return { success: true, message: 'Compte utilisateur configuré avec succès via Edge Function', userId: edgeData.user.id };
      }
    } catch (edgeErr) {
      console.warn('[RecruitmentService] Exception via Edge Function pour user:', edgeErr);
    }

    // 3. Fallback sur admin_provision_scout_credentials + mise à jour du profil
    try {
      const targetUuid = isValidUuid(userId) ? userId : null;
      const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)('admin_provision_scout_credentials', {
        target_user_id: targetUuid,
        temp_password: tempPassword,
        target_email: cleanEmail,
        target_full_name: fullName,
        target_phone: phone || null,
        target_role: finalRole
      });

      if (!rpcErr && rpcData?.success) {
        const returnedId = rpcData.user_id || targetUuid;
        if (returnedId) {
          await supabase.from('user_profiles').upsert({
            id: returnedId,
            full_name: fullName,
            phone_number: phone || null,
            system_role: finalRole,
            job_title: finalTitle,
            force_password_change: true,
            is_active: true,
            updated_at: new Date().toISOString()
          });
        }
        return { success: true, message: rpcData.message, userId: returnedId };
      }
    } catch (e2) {
      console.warn('[RecruitmentService] Fallback RPC provision notice:', e2);
    }

    // 4. Si déjà existant, tenter admin_update_user_password
    if (isValidUuid(userId)) {
      try {
        const { data: updPwdData, error: updPwdErr } = await (supabase.rpc as any)('admin_update_user_password', {
          target_user_id: userId,
          new_password: tempPassword
        });
        if (!updPwdErr && updPwdData?.success) {
          await supabase.from('user_profiles').update({
            force_password_change: true,
            system_role: finalRole,
            job_title: finalTitle,
            full_name: fullName,
            phone_number: phone || null,
            updated_at: new Date().toISOString()
          }).eq('id', userId);
          return { success: true, message: 'Mot de passe mis à jour', userId };
        }
      } catch (e3) {
        console.warn('[RecruitmentService] admin_update_user_password notice:', e3);
      }
    }

    return { success: true, userId: userId || undefined };
  },

  async createScout(
    scout: Omit<Scout, 'id' | 'created_at' | 'updated_at'>,
    credentials?: { login?: string; tempPassword?: string }
  ): Promise<Scout> {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `scout-${Date.now()}`;
    const login = credentials?.login || scout.email || generateScoutLogin(scout.full_name);
    const tempPassword = credentials?.tempPassword || generateSecureTempPassword();

    const newScout: Scout = {
      ...scout,
      id: newId,
      email: login,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Vérification anti-doublon d'email et de nom
    const normalizedName = scout.full_name?.trim().toLowerCase().replace(/\s+/g, ' ');
    const existingScouts = getLocal<Scout[]>(KEY_SCOUTS, []);
    const isDuplicateEmail = existingScouts.some(
      s => s.email && s.email.toLowerCase().trim() === login.toLowerCase().trim()
    );
    const isDuplicateName = normalizedName
      ? existingScouts.some(s => s.full_name && s.full_name.trim().toLowerCase().replace(/\s+/g, ' ') === normalizedName)
      : false;
    if (isDuplicateEmail) {
      throw new Error(`Un membre du personnel existe déjà avec l'adresse email "${login}".`);
    }
    if (isDuplicateName) {
      throw new Error(`Un membre du personnel existe déjà avec le nom "${scout.full_name}".`);
    }

    try {
      // Vérification anti-doublon directement sur Supabase par email et par nom
      const { data: existingDb } = await supabase
        .from('scouts')
        .select('id, full_name')
        .ilike('email', login.trim())
        .limit(1);

      if (existingDb && existingDb.length > 0) {
        throw new Error(`Un membre du personnel existe déjà avec l'adresse email "${login}" (${existingDb[0].full_name}).`);
      }

      if (normalizedName) {
        const { data: existingNameDb } = await supabase
          .from('scouts')
          .select('id, full_name, email')
          .ilike('full_name', scout.full_name.trim())
          .limit(1);

        if (existingNameDb && existingNameDb.length > 0) {
          throw new Error(`Un membre du personnel existe déjà avec le nom "${existingNameDb[0].full_name}" (${existingNameDb[0].email}).`);
        }
      }
      const { data, error } = await supabase
        .from('scouts')
        .insert([newScout])
        .select()
        .single();

      if (!error && data) {
        const list = getLocal<Scout[]>(KEY_SCOUTS, []);
        setLocal(KEY_SCOUTS, [data, ...list.filter(s => s.id !== data.id)]);

        // Provisionner le compte d'authentification avec mot de passe haché et force_password_change = true
        await this.provisionScoutCredentials({
          scoutId: data.id,
          login,
          tempPassword,
          fullName: data.full_name,
          phone: data.phone,
          roleTitle: data.role_title
        });

        return data;
      }
    } catch (err) {
      console.warn('[RecruitmentService] Exception createScout, bascule cache local:', err);
    }

    const list = getLocal<Scout[]>(KEY_SCOUTS, []);
    const updated = [newScout, ...list.filter(s => s.id !== newScout.id)];
    setLocal(KEY_SCOUTS, updated);

    // Provisionner également en mode local / fallback
    await this.provisionScoutCredentials({
      scoutId: newId,
      login,
      tempPassword,
      fullName: newScout.full_name,
      phone: newScout.phone,
      roleTitle: newScout.role_title
    });

    return newScout;
  },

  async updateScout(id: string, updates: Partial<Scout>): Promise<Scout> {
    if (!id) {
      console.error('[RecruitmentService] updateScout called without id:', { id, updates });
      throw new Error("Identifiant du scout manquant pour la mise à jour.");
    }

    // Filter out undefined keys so Supabase payload is clean
    const cleanedUpdates: Record<string, any> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        cleanedUpdates[key] = val;
      }
    }
    const updatedFields = { ...cleanedUpdates, updated_at: new Date().toISOString() };

    let dbUpdated: Scout | null = null;
    try {
      const { data, error } = await supabase
        .from('scouts')
        .update(updatedFields)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.warn(`[RecruitmentService] Erreur Supabase updateScout (${id}):`, error.message);
      } else if (data) {
        dbUpdated = data;
      }
    } catch (err) {
      console.warn(`[RecruitmentService] Exception updateScout (${id}):`, err);
    }

    // Mettre à jour le cache local (résilience offline / dev)
    const list = getLocal<Scout[]>(KEY_SCOUTS, []);
    const updated = list.map(s => (s.id === id ? { ...s, ...cleanedUpdates, updated_at: new Date().toISOString() } : s));
    setLocal(KEY_SCOUTS, updated);

    // Synchronisation inverse avec user_profiles si le rôle/statut/téléphone/nom a changé
    try {
      const profileUpdates: Record<string, any> = {};
      if (updates.full_name) profileUpdates.full_name = updates.full_name;
      if (updates.phone !== undefined) profileUpdates.phone_number = updates.phone;
      if (updates.photo_url !== undefined) profileUpdates.avatar_url = updates.photo_url;
      if (updates.role_title) profileUpdates.job_title = updates.role_title;
      if (updates.status) profileUpdates.is_active = updates.status === 'active';

      if (Object.keys(profileUpdates).length > 0) {
        await supabase.from('user_profiles').update(profileUpdates).eq('id', id);
      }
    } catch (e) {
      console.warn('[RecruitmentService] user_profiles sync update notice:', e);
    }

    return dbUpdated || updated.find(s => s.id === id)!;
  },

  async deleteScout(id: string): Promise<void> {
    if (!id) return;

    // Libération automatique en cascade des joueurs et missions associés (US-DASH-17)
    try {
      const scouts = getLocal<Scout[]>(KEY_SCOUTS, []);
      const targetScout = scouts.find(s => s.id === id);
      await this.releaseCandidatesByScout(id, targetScout?.full_name);
    } catch (relErr) {
      console.warn(`[RecruitmentService] Erreur libération joueurs lors de deleteScout (${id}):`, relErr);
    }

    if (isValidUuid(id)) {
      try {
        const scouts = getLocal<Scout[]>(KEY_SCOUTS, []);
        const targetScout = scouts.find(s => s.id === id);

        // Appel RPC suppression administrative globale
        try {
          await supabase.rpc('admin_delete_user', {
            target_user_id: id,
            target_email: targetScout?.email || null
          });
        } catch (e) {
          // Ignorer si la fonction RPC n'est pas encore créée
        }

        // Supprimer également du côté user_profiles
        try {
          await supabase.from('user_profiles').delete().eq('id', id);
          if (targetScout?.email) {
            await supabase.from('user_profiles').delete().eq('email', targetScout.email);
          }
          await supabase.from('user_profiles').update({ is_active: false }).eq('id', id);
        } catch (upErr) {
          console.warn('[RecruitmentService] Notice user_profiles delete:', upErr);
        }

        // Marquer inactif d'abord pour préserver l'intégrité si delete échoue
        await supabase.from('scouts').update({ status: 'inactive' }).eq('id', id);
        const { error } = await supabase.from('scouts').delete().eq('id', id);
        if (error) {
          console.warn(`[RecruitmentService] Erreur Supabase deleteScout (${id}):`, error.message);
        } else {
          AuditLogger.logDelete('RECRUITMENT', 'SCOUTS', id, null, `Suppression scout ${id}`);
        }
      } catch (err) {
        console.warn(`[RecruitmentService] Exception deleteScout (${id}):`, err);
      }
    }

    const list = getLocal<Scout[]>(KEY_SCOUTS, []);
    setLocal(KEY_SCOUTS, list.filter(s => s.id !== id));
  },

  async deleteScouts(ids: string[]): Promise<number> {
    if (!ids || ids.length === 0) return 0;
    const cleanIds = ids.filter(Boolean);
    if (cleanIds.length === 0) return 0;

    // Libération automatique en cascade des joueurs et missions associés (US-DASH-17)
    try {
      const scouts = getLocal<Scout[]>(KEY_SCOUTS, []);
      const targetScouts = scouts.filter(s => cleanIds.includes(s.id));
      const targetNames = targetScouts.map(s => s.full_name).join(', ');
      await this.releaseCandidatesByScout(cleanIds, targetNames);
    } catch (relErr) {
      console.warn(`[RecruitmentService] Erreur libération joueurs lors de deleteScouts:`, relErr);
    }

    const validUuids = cleanIds.filter(isValidUuid);
    if (validUuids.length > 0) {
      try {
        for (const uid of validUuids) {
          try {
            await supabase.rpc('admin_delete_user', { target_user_id: uid });
          } catch (e) {}
        }
        try {
          await supabase.from('user_profiles').delete().in('id', validUuids);
          await supabase.from('user_profiles').update({ is_active: false }).in('id', validUuids);
        } catch (e) {}

        await supabase.from('scouts').update({ status: 'inactive' }).in('id', validUuids);
        const { error } = await supabase.from('scouts').delete().in('id', validUuids);
        if (error) {
          console.warn('[RecruitmentService] Erreur Supabase deleteScouts:', error.message);
        } else {
          AuditLogger.logDelete('RECRUITMENT', 'SCOUTS', validUuids.join(','), null, `Suppression multiple de ${validUuids.length} scouts`);
        }
      } catch (err) {
        console.warn('[RecruitmentService] Exception deleteScouts:', err);
      }
    }

    const list = getLocal<Scout[]>(KEY_SCOUTS, []);
    setLocal(KEY_SCOUTS, list.filter(s => !cleanIds.includes(s.id)));
    return cleanIds.length;
  },

  /**
   * Libère automatiquement tous les joueurs assignés à un scout donné (US-DASH-17).
   * - Clôture et archive toute mission active (status: 'cancelled')
   * - Réinitialise assigned_scout_id, assigned_scout_name, recruiter_id, recruiter_name
   * - Conserve l'historique de découverte (discovering_scout_name)
   * - Génère un événement Timeline officiel
   * - Synchronise le cache local et Supabase
   */
  async releaseCandidatesByScout(
    scoutIdOrIds: string | string[], 
    scoutName?: string
  ): Promise<{ releasedCount: number; candidateNames: string[] }> {
    const ids = (Array.isArray(scoutIdOrIds) ? scoutIdOrIds : [scoutIdOrIds]).filter(Boolean);
    if (ids.length === 0 && !scoutName) {
      return { releasedCount: 0, candidateNames: [] };
    }

    const idsSet = new Set(ids);
    const normalizedTargetName = scoutName?.trim().toLowerCase();

    // Trouver le nom résolu pour les libellés de timeline & historique
    let resolvedName = scoutName;
    if (!resolvedName) {
      const localScouts = getLocal<Scout[]>(KEY_SCOUTS, initialMockScouts);
      const matchedScout = localScouts.find(s => idsSet.has(s.id));
      resolvedName = matchedScout?.full_name || 'Scout';
    }

    const localCandidates = getLocal<TrialCandidate[]>(KEY_CANDIDATES, []);
    
    // Identifier tous les candidats liés au scout (découverte, assignation, recruteur, mission)
    const affectedCandidates = localCandidates.filter(c => {
      const matchesId = 
        (c.assigned_scout_id && idsSet.has(c.assigned_scout_id)) ||
        (c.active_mission?.assigned_to_id && idsSet.has(c.active_mission.assigned_to_id)) ||
        (c.recruiter_id && idsSet.has(c.recruiter_id)) ||
        (c.discovering_scout_id && idsSet.has(c.discovering_scout_id));

      const matchesName = Boolean(
        normalizedTargetName && (
          (c.assigned_scout_name && c.assigned_scout_name.trim().toLowerCase() === normalizedTargetName) ||
          (c.active_mission?.assigned_to_name && c.active_mission.assigned_to_name.trim().toLowerCase() === normalizedTargetName) ||
          (c.discovering_scout_name && c.discovering_scout_name.trim().toLowerCase() === normalizedTargetName) ||
          (c.recruiter_name && c.recruiter_name.trim().toLowerCase() === normalizedTargetName)
        )
      );

      return matchesId || matchesName;
    });

    if (affectedCandidates.length === 0) {
      return { releasedCount: 0, candidateNames: [] };
    }

    const candidateNames: string[] = [];
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    const updatedCandidates = localCandidates.map(c => {
      const isAffected = affectedCandidates.some(a => a.id === c.id);
      if (!isAffected) return c;

      candidateNames.push(`${c.first_name} ${c.last_name}`);

      // Clôturer la mission en cours si active
      const existingHistory = c.mission_history || [];
      const updatedHistory = c.active_mission
        ? [
            {
              ...c.active_mission,
              status: 'cancelled' as const,
              completed_at: nowIso,
              notes: ((c.active_mission.notes ? `${c.active_mission.notes} | ` : '')) + 
                `Mission interrompue : scout ${resolvedName} retiré/supprimé. Joueur dissocié et reversé au vivier Cellule FUS.`
            },
            ...existingHistory
          ]
        : existingHistory;

      return {
        ...c,
        assigned_scout_id: undefined,
        assigned_scout_name: undefined,
        recruiter_id: undefined,
        recruiter_name: undefined,
        discovering_scout_id: undefined,
        discovering_scout_name: 'Cellule FUS',
        active_mission: undefined,
        mission_history: updatedHistory,
        updated_at: nowIso,
      };
    });

    setLocal(KEY_CANDIDATES, updatedCandidates);

    // Mises à jour en parallèle dans Supabase et Timeline
    for (const cand of affectedCandidates) {
      // 1. Supabase trial_candidates : Dissocier le scout tout en conservant le joueur
      try {
        await supabase
          .from('trial_candidates')
          .update({
            discovering_scout_id: null,
            discovering_scout_name: 'Cellule FUS',
            recruiter_id: null,
            recruiter_name: null,
            updated_at: nowIso,
          })
          .eq('id', cand.id);
      } catch (sbErr) {
        console.warn(`[RecruitmentService] Supabase candidate reset notice (${cand.id}):`, sbErr);
      }

      // 2. Événement Timeline officiel
      try {
        await this.addTimelineEvent({
          candidate_id: cand.id,
          event_type: 'status_change',
          event_title: 'Joueur Libéré (Départ Scout)',
          event_description: `Le joueur a été libéré suite à la désactivation du scout ${resolvedName}. Il est désormais disponible pour réassignation.`,
          performed_by: 'Cellule Détection',
          event_date: todayStr,
        });
      } catch (tlErr) {
        console.warn(`[RecruitmentService] Timeline event notice (${cand.id}):`, tlErr);
      }
    }

    return {
      releasedCount: candidateNames.length,
      candidateNames,
    };
  },

  // 2. CANDIDATES & PIPELINE
  async getCandidates(): Promise<TrialCandidate[]> {
    try {
      const { data, error } = await supabase
        .from('trial_candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Fusionner avec les métadonnées de mission stockées dans notes et le cache local
        const local = getLocal<TrialCandidate[]>(KEY_CANDIDATES, []);
        const localMap = new Map(local.map(l => [l.id, l]));
        const merged = (data as TrialCandidate[]).map(d => {
          const loc = localMap.get(d.id);
          const parsedMeta = parseMissionsMetadata((d as any).notes);
          const cleanedNotes = cleanNotesForDisplay((d as any).notes);

          const assignedId = (loc && 'assigned_scout_id' in loc) 
            ? loc.assigned_scout_id 
            : ((d as any).assigned_scout_id || (d as any).recruiter_id || parsedMeta.active_mission?.assigned_to_id);

          const assignedName = (loc && 'assigned_scout_name' in loc) 
            ? loc.assigned_scout_name 
            : ((d as any).assigned_scout_name || (d as any).recruiter_name || parsedMeta.active_mission?.assigned_to_name);

          const activeMission = (loc && 'active_mission' in loc) 
            ? loc.active_mission 
            : ((d as any).active_mission || parsedMeta.active_mission);

          const missionHistory = (loc && 'mission_history' in loc) 
            ? loc.mission_history 
            : ((d as any).mission_history || parsedMeta.mission_history || []);

          return {
            ...(loc || {}),
            ...d,
            notes: cleanedNotes || loc?.notes || '',
            reference_player_style: loc?.reference_player_style || (d as any).reference_player_style || parsedMeta.reference_player_style,
            administrative_documents: loc?.administrative_documents || (d as any).administrative_documents || parsedMeta.administrative_documents || [],
            contract_type: loc?.contract_type || (d as any).contract_type || parsedMeta.contract_type,
            administrative_status: loc?.administrative_status || (d as any).administrative_status || parsedMeta.administrative_status,
            admin_notes: loc?.admin_notes || (d as any).admin_notes || parsedMeta.admin_notes,
            assigned_scout_id: assignedId || (d as any).assigned_scout_id,
            assigned_scout_name: assignedName || (d as any).assigned_scout_name,
            recruiter_id: (d as any).recruiter_id || assignedId,
            recruiter_name: (d as any).recruiter_name || assignedName,
            active_mission: activeMission,
            mission_history: missionHistory,
            discovering_scout_id: (d as any).discovering_scout_id || loc?.discovering_scout_id,
            discovering_scout_name: (d as any).discovering_scout_name || loc?.discovering_scout_name,
          };
        });
        setLocal(KEY_CANDIDATES, merged);
        setLocal(KEY_CLEARED, false);
        return merged;
      }

      console.warn('[RecruitmentService] Supabase indisponible pour getCandidates, bascule sur cache local:', error?.message);
    } catch (err) {
      console.warn('[RecruitmentService] Erreur réseau getCandidates, retour du cache local:', err);
    }

    // ⚠️ Hors ligne : retourner le cache local SANS réinjecter de mocks
    const isCleared = getLocal<boolean>(KEY_CLEARED, false);
    if (isCleared) return [];
    const local = getLocal<TrialCandidate[] | null>(KEY_CANDIDATES, null);
    return local ?? [];
  },

  async createCandidate(candidate: Omit<TrialCandidate, 'id' | 'created_at' | 'updated_at'>): Promise<TrialCandidate> {
    setLocal(KEY_CLEARED, false);
    const newId = ensureUuid();

    const newCand: TrialCandidate = {
      ...candidate,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Toujours enregistrer immédiatement dans le cache local (persistance garantie)
    const currentList = getLocal<TrialCandidate[]>(KEY_CANDIDATES, []);
    const updatedLocal = [newCand, ...currentList.filter(c => c.id !== newCand.id)];
    setLocal(KEY_CANDIDATES, updatedLocal);

    // 2. Synchroniser vers Supabase avec timeout pour ne pas bloquer l'interface
    try {
      const supabasePayload = toSupabasePayload(newCand as any);
      const insertPromise = supabase.from('trial_candidates').insert([supabasePayload]).select().single();
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'Timeout Supabase' } }), 6000)
      );

      const { data, error } = await Promise.race([insertPromise, timeoutPromise]);

      if (error) {
        console.warn('[RecruitmentService] Erreur ou timeout Supabase createCandidate, sauvegarde en local:', error.message);
      } else if (data) {
        setLocal(KEY_CLEARED, false);
        const merged: TrialCandidate = { ...newCand, ...data };
        const list = getLocal<TrialCandidate[]>(KEY_CANDIDATES, []);
        setLocal(KEY_CANDIDATES, [merged, ...list.filter(c => c.id !== merged.id && c.id !== newCand.id)]);

        AuditLogger.logCreate(
          'RECRUITMENT',
          'TRIAL_CANDIDATE',
          merged.id,
          merged,
          `Création du talent détecté ${merged.first_name} ${merged.last_name} (${merged.primary_position} - ${merged.age_category || 'U13'})`
        );

        await this.addTimelineEvent({
          candidate_id: merged.id,
          event_type: 'discovered',
          event_title: 'Profil Candidat Enregistré',
          event_description: `Candidat enregistré en statut ${candidate.pipeline_stage}.`,
          performed_by: candidate.discovering_scout_name || 'Cellule Recrutement',
          event_date: new Date().toISOString().split('T')[0],
        });

        return merged;
      }
    } catch (err) {
      console.warn('[RecruitmentService] Exception réseau createCandidate, sauvegarde en local:', err);
    }

    // Auto-create initial timeline event
    try {
      await this.addTimelineEvent({
        candidate_id: newId,
        event_type: 'discovered',
        event_title: 'Profil Candidat Enregistré',
        event_description: `Candidat enregistré en statut ${candidate.pipeline_stage}.`,
        performed_by: candidate.discovering_scout_name || 'Cellule Recrutement',
        event_date: new Date().toISOString().split('T')[0],
      });
    } catch {
      // silence
    }

    return newCand;
  },

  async updateCandidate(
    idOrParams: string | { id: string; updates: Partial<TrialCandidate> },
    maybeUpdates?: Partial<TrialCandidate>
  ): Promise<TrialCandidate> {
    const id = typeof idOrParams === 'object' ? idOrParams.id : idOrParams;
    const updates = typeof idOrParams === 'object' ? idOrParams.updates : maybeUpdates || {};
    try {
      const supabaseUpdates = toSupabasePayload(updates as any);
      const { data, error } = await supabase.from('trial_candidates').update(supabaseUpdates).eq('id', id).select().single();
      if (error) {
        console.warn(`[RecruitmentService] Erreur Supabase updateCandidate (${id}):`, error.message);
      } else if (data) {
        const list = getLocal<TrialCandidate[]>(KEY_CANDIDATES, []);
        const updatedCandidate = { ...(list.find(c => c.id === id) || {}), ...data, ...updates };
        const exists = list.some(c => c.id === id);
        const nextList = exists
          ? list.map(c => c.id === id ? updatedCandidate : c)
          : [updatedCandidate, ...list];
        setLocal(KEY_CANDIDATES, nextList);

        AuditLogger.logUpdate(
          'RECRUITMENT',
          'TRIAL_CANDIDATE',
          id,
          {},
          updates,
          `Mise à jour fiche candidat ${updatedCandidate.first_name} ${updatedCandidate.last_name}`
        );

        return updatedCandidate as TrialCandidate;
      }
    } catch (err) {
      console.warn(`[RecruitmentService] Exception réseau updateCandidate (${id}):`, err);
    }
    const list = getLocal<TrialCandidate[]>(KEY_CANDIDATES, []);
    const updatedCandidate = { ...(list.find(c => c.id === id) || {}), ...updates, updated_at: new Date().toISOString() } as TrialCandidate;
    const exists = list.some(c => c.id === id);
    const nextList = exists
      ? list.map(c => c.id === id ? updatedCandidate : c)
      : [updatedCandidate, ...list];
    setLocal(KEY_CANDIDATES, nextList);
    return updatedCandidate;
  },

  async updatePipelineStage(id: string, stage: PipelineStage, reason?: string): Promise<TrialCandidate> {
    const cand = await this.updateCandidate(id, { pipeline_stage: stage });
    const isShortlist = stage === 'shortlisted';
    await this.addTimelineEvent({
      candidate_id: id,
      event_type: stage,
      event_title: isShortlist 
        ? '⭐ Joueur Shortlisté & Intégré au Onze Idéal' 
        : `Transition Pipeline : ${stage.replace('_', ' ').toUpperCase()}`,
      event_description: reason || (isShortlist 
        ? 'Le joueur a été validé en Shortlist officielle et est désormais déployé sur la pelouse tactique du Onze Idéal.' 
        : `Le joueur est passé à l'étape ${stage}.`),
      performed_by: 'Staff Recrutement',
      event_date: new Date().toISOString().split('T')[0],
    });
    return cand;
  },

  async deleteCandidate(id: string): Promise<void> {
    const cleanId = id?.trim();
    if (isValidUuid(cleanId)) {
      try {
        // Supprimer d'abord les enregistrements liés par clé étrangère
        await supabase.from('candidate_evaluations').delete().eq('candidate_id', cleanId);
        await supabase.from('recruitment_timeline').delete().eq('candidate_id', cleanId);
        const { error } = await supabase.from('trial_candidates').delete().eq('id', cleanId);
        if (error) {
          console.error(`[RecruitmentService] Erreur Supabase deleteCandidate (${cleanId}):`, error.message);
          throw new Error(error.message);
        } else {
          AuditLogger.logDelete('RECRUITMENT', 'TRIAL_CANDIDATE', cleanId, null, `Suppression candidat ${cleanId}`);
        }
      } catch (err: any) {
        console.error(`[RecruitmentService] Exception réseau deleteCandidate (${cleanId}):`, err);
        throw err;
      }
    }

    const list = getLocal<TrialCandidate[]>(KEY_CANDIDATES, []);
    setLocal(KEY_CANDIDATES, list.filter(c => c.id !== cleanId));

    const evals = getLocal<CandidateEvaluation[]>(KEY_EVALS, []);
    setLocal(KEY_EVALS, evals.filter(e => e.candidate_id !== cleanId));

    const timeEvents = getLocal<RecruitmentTimelineEvent[]>(KEY_TIMELINE, []);
    setLocal(KEY_TIMELINE, timeEvents.filter(t => t.candidate_id !== cleanId));
  },

  async deleteCandidates(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const cleanIds = ids.map(id => id?.trim()).filter(Boolean);
    const validUuids = cleanIds.filter(isValidUuid);
    if (validUuids.length > 0) {
      try {
        await supabase.from('candidate_evaluations').delete().in('candidate_id', validUuids);
        await supabase.from('recruitment_timeline').delete().in('candidate_id', validUuids);
        const { error } = await supabase.from('trial_candidates').delete().in('id', validUuids);
        if (error) {
          console.error(`[RecruitmentService] Erreur Supabase deleteCandidates:`, error.message);
          throw new Error(error.message);
        } else {
          AuditLogger.logDelete('RECRUITMENT', 'TRIAL_CANDIDATES', validUuids.join(','), null, `Suppression multiple de ${validUuids.length} candidats`);
        }
      } catch (err: any) {
        console.error(`[RecruitmentService] Exception réseau deleteCandidates:`, err);
        throw err;
      }
    }

    const idsSet = new Set(cleanIds);
    const list = getLocal<TrialCandidate[]>(KEY_CANDIDATES, []);
    setLocal(KEY_CANDIDATES, list.filter(c => !idsSet.has(c.id)));

    const evals = getLocal<CandidateEvaluation[]>(KEY_EVALS, []);
    setLocal(KEY_EVALS, evals.filter(e => !idsSet.has(e.candidate_id)));

    const timeEvents = getLocal<RecruitmentTimelineEvent[]>(KEY_TIMELINE, []);
    setLocal(KEY_TIMELINE, timeEvents.filter(t => !idsSet.has(t.candidate_id)));
  },

  async archiveCandidates(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const cleanIds = ids.map(id => id?.trim()).filter(Boolean);
    const validUuids = cleanIds.filter(isValidUuid);
    if (validUuids.length > 0) {
      try {
        const { error } = await supabase
          .from('trial_candidates')
          .update({ pipeline_stage: 'archived', status: 'archived', updated_at: new Date().toISOString() })
          .in('id', validUuids);
        if (error) {
          console.error(`[RecruitmentService] Erreur Supabase archiveCandidates:`, error.message);
          throw new Error(error.message);
        } else {
          AuditLogger.logUpdate('RECRUITMENT', 'TRIAL_CANDIDATES', validUuids.join(','), { pipeline_stage: 'archived' }, `Archivage multiple de ${validUuids.length} candidats`);
        }
      } catch (err: any) {
        console.error(`[RecruitmentService] Exception réseau archiveCandidates:`, err);
        throw err;
      }
    }

    const idsSet = new Set(cleanIds);
    const list = getLocal<TrialCandidate[]>(KEY_CANDIDATES, []);
    const updated = list.map(c => idsSet.has(c.id) ? { ...c, pipeline_stage: 'archived' as const, status: 'archived' as const, updated_at: new Date().toISOString() } : c);
    setLocal(KEY_CANDIDATES, updated);
  },

  // 3. TESTS / SESSIONS (Persistance Supabase public.trial_sessions)
  async getTests(): Promise<PlayerTest[]> {
    const isCleared = getLocal<boolean>(KEY_CLEARED, false);
    const local = getLocal<PlayerTest[] | null>(KEY_TESTS, null);
    let testsList: PlayerTest[] = [];

    try {
      const { data, error } = await supabase
        .from('trial_sessions')
        .select('*')
        .order('session_date', { ascending: false });

      if (error) {
        console.warn('[RecruitmentService] Erreur Supabase getTests, bascule sur local:', error.message);
      } else if (data && data.length > 0) {
        testsList = data.map(s => {
          let parsedNotesData: any = {};
          if (s.notes) {
            try {
              parsedNotesData = JSON.parse(s.notes);
            } catch {
              parsedNotesData = { description: s.notes };
            }
          }

          const candidateIds: string[] = Array.isArray(parsedNotesData.candidate_ids) 
            ? parsedNotesData.candidate_ids 
            : (s.notes && s.notes.includes('candidate_id:') 
                ? [s.notes.split('candidate_id:')[1]?.split(';')[0]?.trim()].filter(Boolean)
                : []);

          return {
            id: s.id,
            candidate_id: candidateIds[0] || undefined,
            candidate_ids: candidateIds,
            test_name: s.session_name || 'Session Détection',
            test_date: s.session_date,
            start_time: s.session_time ? s.session_time.slice(0, 5) : '10:00',
            end_time: '12:00',
            location: s.location || 'Complexe Sportif FUS',
            training_ground: 'Terrain Synthétique 1',
            target_team: 'Académie FUS',
            test_type: 'comprehensive',
            category_age: s.category_age || 'U19',
            age_category: s.category_age || 'U19',
            max_participants: 25,
            status: (s.status as any) || 'scheduled',
            notes: parsedNotesData.description || s.notes || undefined,
            match_id: parsedNotesData.match_id || undefined,
            match_name: parsedNotesData.match_name || undefined,
            created_at: s.created_at,
          };
        });

        setLocal(KEY_TESTS, testsList);
      }
    } catch (err) {
      console.warn('[RecruitmentService] Exception réseau getTests, bascule sur local:', err);
    }

    if (testsList.length === 0) {
      if (isCleared) return [];
      testsList = local !== null ? local : [...initialMockTests];
    }

    if (isCleared) return testsList;

    // Synchronisation automatique : lier toute évaluation existante
    try {
      const evals = getLocal<CandidateEvaluation[]>(KEY_EVALS, []);
      const candidates = getLocal<TrialCandidate[]>(KEY_CANDIDATES, []);

      evals.forEach((ev, idx) => {
        const matchingTest = testsList.find(t => 
          (ev.test_id && t.id === ev.test_id) ||
          (t.candidate_id === ev.candidate_id && t.test_date === ev.evaluation_date)
        );

        if (matchingTest) {
          if (!matchingTest.candidate_id) matchingTest.candidate_id = ev.candidate_id;
          matchingTest.status = 'completed';
        } else {
          const cand = candidates.find(c => c.id === ev.candidate_id);
          const autoTestId = ev.test_id || `test-eval-${ev.id}`;
          testsList.push({
            id: autoTestId,
            candidate_id: ev.candidate_id,
            test_name: ev.test_name || `Session d'Évaluation #${evals.length - idx} (${cand ? `${cand.first_name} ${cand.last_name}` : 'Candidat'})`,
            test_date: ev.evaluation_date || new Date().toISOString().split('T')[0],
            start_time: '10:00',
            end_time: '12:00',
            location: 'Complexe Sportif FUS - Académie',
            training_ground: 'Terrain Synthétique 1',
            target_team: cand ? `Académie FUS ${cand.age_category || 'U19'}` : 'Académie FUS',
            age_category: cand?.age_category || 'U19',
            assigned_coaches: ['Staff Technique Académie FUS'],
            assigned_scouts: ev.evaluator_name ? [ev.evaluator_name] : ['Cellule Recrutement'],
            test_type: 'comprehensive',
            status: 'completed',
            notes: (ev as any).recommendation || `Évaluation enregistrée : score ${ev.overall_score}/10 (${ev.verdict})`,
            created_at: ev.created_at || new Date().toISOString(),
          });
        }
      });
    } catch (e) {
      console.warn('[RecruitmentService] Exception lors de la synchronisation des tests avec les évaluations:', e);
    }

    return testsList;
  },

  async createTest(test: Omit<PlayerTest, 'id' | 'created_at' | 'updated_at'>): Promise<PlayerTest> {
    const targetCandidateIds: string[] = test.candidate_ids && test.candidate_ids.length > 0
      ? test.candidate_ids
      : test.candidate_id ? [test.candidate_id] : [];

    const primaryCandidateId = targetCandidateIds[0] || test.candidate_id;
    const newId = ensureUuid();

    const formattedTime = test.start_time 
      ? (test.start_time.length === 5 ? `${test.start_time}:00` : test.start_time)
      : '10:00:00';

    const validStatus = ['scheduled', 'in_progress', 'completed', 'cancelled'].includes(test.status || '')
      ? test.status!
      : 'scheduled';

    const notesPayload = JSON.stringify({
      description: test.notes || '',
      candidate_ids: targetCandidateIds,
      match_id: test.match_id || null,
      match_name: test.match_name || null,
    });

    const newTest: PlayerTest = {
      ...test,
      id: newId,
      status: validStatus as any,
      candidate_id: primaryCandidateId,
      candidate_ids: targetCandidateIds,
      created_at: new Date().toISOString()
    };

    // 1. Insertion dans Supabase public.trial_sessions
    try {
      const { error } = await supabase.from('trial_sessions').insert([{
        id: newId,
        session_name: test.test_name || 'Session Détection FUS',
        session_date: test.test_date || new Date().toISOString().split('T')[0],
        session_time: formattedTime,
        location: test.location || 'Complexe Sportif FUS - Terrain 1',
        lead_scout_name: 'Staff Technique & Détection',
        category_age: test.age_category || test.category_age || 'U19',
        status: validStatus,
        notes: notesPayload,
      }]);

      if (error) {
        console.warn('[RecruitmentService] Erreur Supabase createTest trial_sessions:', error.message);
      } else {
        AuditLogger.logCreate(
          'RECRUITMENT',
          'TRIAL_SESSION',
          newId,
          test,
          `Planification session détection : ${test.test_name || 'Séance Détection'} (${test.test_date})`
        );
      }
    } catch (err) {
      console.warn('[RecruitmentService] Exception Supabase createTest trial_sessions:', err);
    }

    // 2. Persistance locale
    const list = getLocal<PlayerTest[]>(KEY_TESTS, initialMockTests);
    const newTestsForList: PlayerTest[] = [];

    if (targetCandidateIds.length > 0) {
      for (const cId of targetCandidateIds) {
        newTestsForList.push({
          ...test,
          id: cId === primaryCandidateId ? newId : `${newId}-${cId.slice(0, 6)}`,
          candidate_id: cId,
          candidate_ids: targetCandidateIds,
          created_at: new Date().toISOString()
        });
      }
    } else {
      newTestsForList.push(newTest);
    }

    const updated = [...newTestsForList, ...list];
    setLocal(KEY_TESTS, updated);

    // 3. Mettre à jour TOUS les candidats convoqués dans le Pipeline Kanban & Supabase
    if (targetCandidateIds.length > 0) {
      const validUuids = targetCandidateIds.filter(isValidUuid);
      if (validUuids.length > 0) {
        try {
          await supabase
            .from('trial_candidates')
            .update({
              status: 'in_trial',
              pipeline_stage: 'test_scheduled',
              updated_at: new Date().toISOString(),
            })
            .in('id', validUuids);
        } catch (candErr) {
          console.warn('[RecruitmentService] Erreur mise à jour statut candidats dans Supabase:', candErr);
        }
      }

      for (const cId of targetCandidateIds) {
        await this.updateCandidate(cId, {
          pipeline_stage: 'test_scheduled',
          status: 'in_trial',
        });

        await this.addTimelineEvent({
          candidate_id: cId,
          event_type: 'test_scheduled',
          event_title: `Test Scout Planifié : ${test.test_name}`,
          event_description: `Session prévue le ${test.test_date} à ${test.location}. Le joueur est convoqué en statut « En test ».`,
          performed_by: 'Staff Technique & Détection',
          event_date: test.test_date,
        });
      }
    }

    return newTest;
  },

  async updateTest(id: string, updates: Partial<PlayerTest>): Promise<PlayerTest> {
    const list = getLocal<PlayerTest[]>(KEY_TESTS, initialMockTests);
    const existing = list.find(t => t.id === id);
    if (!existing) throw new Error(`Session de test ${id} non trouvée`);
    const updatedTest: PlayerTest = { ...existing, ...updates, updated_at: new Date().toISOString() };
    const updatedList = list.map(t => t.id === id ? updatedTest : t);
    setLocal(KEY_TESTS, updatedList);

    if (updates.candidate_id && updates.candidate_id !== existing.candidate_id) {
      await this.updateCandidate(updates.candidate_id, {
        pipeline_stage: 'test_scheduled',
        status: 'in_trial',
      });
    }

    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.test_name) dbUpdates.session_name = updates.test_name;
      if (updates.test_date) dbUpdates.session_date = updates.test_date;
      if (updates.location) dbUpdates.location = updates.location;
      if (updates.age_category || updates.category_age) dbUpdates.category_age = updates.age_category || updates.category_age;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.start_time) {
        dbUpdates.session_time = updates.start_time.length === 5 ? `${updates.start_time}:00` : updates.start_time;
      }
      if (updates.notes || updates.candidate_ids) {
        dbUpdates.notes = JSON.stringify({
          description: updates.notes || existing.notes || '',
          candidate_ids: updates.candidate_ids || existing.candidate_ids || [],
          match_id: updates.match_id || existing.match_id || null,
        });
      }
      dbUpdates.updated_at = new Date().toISOString();

      if (isValidUuid(id)) {
        const { error } = await supabase.from('trial_sessions').update(dbUpdates).eq('id', id);
        if (error) {
          console.warn(`[RecruitmentService] Erreur Supabase updateTest (${id}):`, error.message);
        } else {
          AuditLogger.logUpdate('RECRUITMENT', 'TRIAL_SESSION', id, existing, updates, `Mise à jour séance test ${updates.test_name || id}`);
        }
      }
    } catch (err) {
      console.warn(`[RecruitmentService] Exception réseau updateTest (${id}):`, err);
    }

    return updatedTest;
  },

  async deleteTest(id: string): Promise<void> {
    const list = getLocal<PlayerTest[]>(KEY_TESTS, initialMockTests);
    setLocal(KEY_TESTS, list.filter(t => t.id !== id));

    try {
      if (isValidUuid(id)) {
        const { error } = await supabase.from('trial_sessions').delete().eq('id', id);
        if (error) {
          console.warn(`[RecruitmentService] Erreur Supabase deleteTest (${id}):`, error.message);
        } else {
          AuditLogger.logDelete('RECRUITMENT', 'TRIAL_SESSION', id, null, `Suppression séance test ${id}`);
        }
      }
    } catch (err) {
      console.warn(`[RecruitmentService] Exception réseau deleteTest (${id}):`, err);
    }
  },

  // 4. EVALUATIONS (Persistance Supabase public.candidate_evaluations avec respect CHECK constraint et GENERATED ALWAYS)
  async getEvaluations(): Promise<CandidateEvaluation[]> {
    const isCleared = getLocal<boolean>(KEY_CLEARED, false);
    if (isCleared) return [];
    const local = getLocal<CandidateEvaluation[] | null>(KEY_EVALS, null);

    try {
      const { data, error } = await supabase
        .from('candidate_evaluations')
        .select('*')
        .order('evaluation_date', { ascending: false });

      if (error) {
        console.warn('[RecruitmentService] Erreur Supabase getEvaluations, bascule sur local:', error.message);
      } else if (data && data.length > 0) {
        const mappedData: CandidateEvaluation[] = data.map(d => {
          const meta = parseReportMetadata(d.general_notes);

          // Helper de conversion / normalisation de score (0-100 vers 0.0-10.0)
          const normScore = (val: any, fallback: number = 7.0): number => {
            if (val === null || val === undefined || isNaN(Number(val))) return fallback;
            const n = Number(val);
            return n > 10 ? Math.round((n / 10) * 10) / 10 : Math.round(n * 10) / 10;
          };

          // Calcul de la moyenne des colonnes DB par pilier si non renseigné dans meta
          const calcAverage = (values: (any)[]): number | null => {
            const valid = values
              .filter(v => v !== null && v !== undefined && !isNaN(Number(v)))
              .map(v => {
                const n = Number(v);
                return n > 10 ? n / 10 : n;
              });
            if (valid.length === 0) return null;
            const sum = valid.reduce((a, b) => a + b, 0);
            return Math.round((sum / valid.length) * 10) / 10;
          };

          const techPillarAvg = calcAverage([
            d.tech_first_touch,
            d.tech_passing,
            d.tech_shooting,
            d.tech_dribbling,
            d.tech_heading,
          ]);

          const physPillarAvg = calcAverage([
            d.phys_speed,
            d.phys_endurance,
            d.phys_strength,
            d.phys_agility,
            d.phys_jump,
          ]);

          const tactPillarAvg = calcAverage([
            d.tact_positioning,
            d.tact_vision,
            d.tact_anticipation,
            d.tact_game_iq,
            d.tact_transition,
          ]);

          const mentPillarAvg = calcAverage([
            d.ment_determination,
            d.ment_focus,
            d.ment_teamwork,
            d.ment_composure,
            d.ment_leadership,
          ]);

          const finalTechScore = meta.technical_score !== undefined
            ? Math.round(Number(meta.technical_score) * 10) / 10
            : (d.technical_score !== null && d.technical_score !== undefined
              ? normScore(d.technical_score, 7.0)
              : (techPillarAvg ?? 7.0));

          const finalPhysScore = meta.physical_score !== undefined
            ? Math.round(Number(meta.physical_score) * 10) / 10
            : (d.physical_score !== null && d.physical_score !== undefined
              ? normScore(d.physical_score, 7.0)
              : (physPillarAvg ?? 7.0));

          const finalTactScore = meta.tactical_score !== undefined
            ? Math.round(Number(meta.tactical_score) * 10) / 10
            : (d.tactical_score !== null && d.tactical_score !== undefined
              ? normScore(d.tactical_score, 7.0)
              : (tactPillarAvg ?? 7.0));

          const finalMentScore = meta.mental_score !== undefined
            ? Math.round(Number(meta.mental_score) * 10) / 10
            : (d.mental_score !== null && d.mental_score !== undefined
              ? normScore(d.mental_score, 7.0)
              : (mentPillarAvg ?? 7.0));

          const computedOverall = Math.round((
            finalTechScore * 0.30 +
            finalPhysScore * 0.25 +
            finalTactScore * 0.25 +
            finalMentScore * 0.20
          ) * 10) / 10;

          const finalOverallScore = meta.overall_score !== undefined
            ? Math.round(Number(meta.overall_score) * 10) / 10
            : (d.overall_score !== null && d.overall_score !== undefined
              ? normScore(d.overall_score, computedOverall)
              : computedOverall);

          // Construction dynamique des critères individuels
          const rawCriteriaScores = d.criteria_scores || meta.criteria_scores || {};
          const fallbackCriteriaScores: Record<string, number> = {
            "Contrôle & première touche": normScore(d.tech_first_touch, finalTechScore),
            "Première touche": normScore(d.tech_first_touch, finalTechScore),
            "Passe & relance": normScore(d.tech_passing, finalTechScore),
            "Passe": normScore(d.tech_passing, finalTechScore),
            "Frappe & tirs": normScore(d.tech_shooting, finalTechScore),
            "Frappe & finition": normScore(d.tech_shooting, finalTechScore),
            "Finition": normScore(d.tech_shooting, finalTechScore),
            "Dribbles & 1v1": normScore(d.tech_dribbling, finalTechScore),
            "Dribbles": normScore(d.tech_dribbling, finalTechScore),
            "Jeu de tête & duels": normScore(d.tech_heading, finalTechScore),
            "Jeu de tête": normScore(d.tech_heading, finalTechScore),

            "Vitesse & accélération": normScore(d.phys_speed, finalPhysScore),
            "Vitesse": normScore(d.phys_speed, finalPhysScore),
            "Endurance & intensité": normScore(d.phys_endurance, finalPhysScore),
            "Endurance": normScore(d.phys_endurance, finalPhysScore),
            "Puissance & duels": normScore(d.phys_strength, finalPhysScore),
            "Puissance": normScore(d.phys_strength, finalPhysScore),
            "Agilité & coordination": normScore(d.phys_agility, finalPhysScore),
            "Agilité": normScore(d.phys_agility, finalPhysScore),
            "Explosivité & détente": normScore(d.phys_jump, finalPhysScore),

            "Positionnement & couverture": normScore(d.tact_positioning, finalTactScore),
            "Positionnement": normScore(d.tact_positioning, finalTactScore),
            "Vision & intelligence de jeu": normScore(d.tact_vision, finalTactScore),
            "Vision": normScore(d.tact_vision, finalTactScore),
            "Anticipation & lecture": normScore(d.tact_anticipation, finalTactScore),
            "Anticipation": normScore(d.tact_anticipation, finalTactScore),
            "Transitions & pressing": normScore(d.tact_transition, finalTactScore),
            "Transitions": normScore(d.tact_transition, finalTactScore),

            "Détermination & résilience": normScore(d.ment_determination, finalMentScore),
            "Détermination": normScore(d.ment_determination, finalMentScore),
            "Concentration & constance": normScore(d.ment_focus, finalMentScore),
            "Concentration": normScore(d.ment_focus, finalMentScore),
            "Communication & leadership": normScore(d.ment_leadership, finalMentScore),
            "Leadership": normScore(d.ment_leadership, finalMentScore),
          };

          const hasSavedScores = Object.keys(rawCriteriaScores).length > 0;
          const mergedCriteriaScores = hasSavedScores ? rawCriteriaScores : fallbackCriteriaScores;

          return {
            ...d,
            report_title: d.report_title || meta.report_title || undefined,
            report_data: d.report_data || meta.report_data || undefined,
            criteria_scores: mergedCriteriaScores,
            position_evaluated: d.position_evaluated || meta.position_evaluated || undefined,
            tech_report: d.tech_report || meta.tech_report || undefined,
            tact_report: d.tact_report || meta.tact_report || undefined,
            phys_report: d.phys_report || meta.phys_report || undefined,
            ment_report: d.ment_report || meta.ment_report || undefined,
            evaluator_id: d.evaluator_id || meta.evaluator_id || undefined,
            evaluator_name: d.evaluator_name || meta.evaluator_name || 'Scout FUS',
            evaluator_role: (d as any).evaluator_role || meta.evaluator_role || undefined,
            general_notes: cleanGeneralNotes(d.general_notes),
            strengths: d.strengths || meta.strengths || undefined,
            weaknesses: d.weaknesses || meta.weaknesses || undefined,
            projection: d.projection || meta.projection || undefined,
            overall_score: finalOverallScore,
            technical_score: finalTechScore,
            physical_score: finalPhysScore,
            tactical_score: finalTactScore,
            mental_score: finalMentScore,
            verdict: mapVerdictFromSupabase(d.verdict),
            test_id: d.session_id,
            created_at: d.created_at || meta.created_at || undefined,
            potential_rating: (meta.potential_rating != null ? Number(meta.potential_rating) : (d as any).potential_rating != null ? Number((d as any).potential_rating) : undefined),

            // Sous-critères normalisés sur l'échelle 1-10
            tech_ball_control: normScore(d.tech_first_touch, finalTechScore),
            tech_first_touch: normScore(d.tech_first_touch, finalTechScore),
            tech_passing_short: normScore(d.tech_passing, finalTechScore),
            tech_passing_long: normScore(d.tech_passing, finalTechScore),
            tech_dribbling: normScore(d.tech_dribbling, finalTechScore),
            tech_crossing: normScore(d.tech_passing, finalTechScore),
            tech_finishing: normScore(d.tech_shooting, finalTechScore),
            tech_heading: normScore(d.tech_heading, finalTechScore),
            tech_1v1_attacking: normScore(d.tech_dribbling, finalTechScore),
            tech_1v1_defending: normScore(d.tact_positioning, finalTactScore),
            tech_weak_foot: finalTechScore,

            phys_acceleration: normScore(d.phys_speed, finalPhysScore),
            phys_sprint_speed: normScore(d.phys_speed, finalPhysScore),
            phys_agility: normScore(d.phys_agility, finalPhysScore),
            phys_balance: normScore(d.phys_jump, finalPhysScore),
            phys_strength: normScore(d.phys_strength, finalPhysScore),
            phys_endurance: normScore(d.phys_endurance, finalPhysScore),
            phys_explosiveness: normScore(d.phys_jump, finalPhysScore),

            tact_positioning: normScore(d.tact_positioning, finalTactScore),
            tact_awareness: normScore(d.tact_vision, finalTactScore),
            tact_decision_making: normScore(d.tact_game_iq, finalTactScore),
            tact_anticipation: normScore(d.tact_anticipation, finalTactScore),
            tact_space_awareness: normScore(d.tact_transition, finalTactScore),

            ment_determination: normScore(d.ment_determination, finalMentScore),
            ment_work_rate: normScore(d.ment_determination, finalMentScore),
            ment_composure: normScore(d.ment_composure, finalMentScore),
            ment_coachability: normScore(d.ment_teamwork, finalMentScore),
            ment_leadership: normScore(d.ment_leadership, finalMentScore),
          };
        });

        setLocal(KEY_EVALS, mappedData);
        return mappedData;
      }
    } catch (err) {
      console.warn('[RecruitmentService] Exception réseau getEvaluations, bascule sur local:', err);
    }

    if (isCleared) return [];
    return local !== null ? local : initialMockEvaluations;
  },

  async saveEvaluation(
    evaluation: Omit<CandidateEvaluation, 'id' | 'created_at'>,
    options?: { isReevaluation?: boolean; updateId?: string; promoteToShortlist?: boolean }
  ): Promise<CandidateEvaluation> {
    const overall = (
      evaluation.technical_score * 0.30 +
      evaluation.physical_score * 0.25 +
      evaluation.tactical_score * 0.25 +
      evaluation.mental_score * 0.20
    );

    const list = getLocal<CandidateEvaluation[]>(KEY_EVALS, initialMockEvaluations);
    const targetId = options?.updateId || (evaluation as any).id;
    const isUpdate = Boolean(targetId && (list.some(e => e.id === targetId) || options?.updateId || isValidUuid(targetId)));
    const newId = targetId || ensureUuid();

    const existingEval = targetId ? list.find(e => e.id === targetId) : undefined;

    const newEval: CandidateEvaluation = {
      ...evaluation,
      id: newId,
      overall_score: Math.round(overall * 10) / 10,
      created_at: existingEval?.created_at || new Date().toISOString(),
    };

    // 1. Sauvegarde dans Supabase public.candidate_evaluations
    try {
      const payload = toSupabaseEvaluationPayload(newEval);
      if (isUpdate && isValidUuid(newId)) {
        const { error } = await supabase.from('candidate_evaluations').update(payload).eq('id', newId);
        if (error) {
          console.warn('[RecruitmentService] Erreur Supabase update evaluation, tentative insert fallback:', error.message);
          const { error: insertErr } = await supabase.from('candidate_evaluations').insert([payload]);
          if (insertErr) {
            console.error('[RecruitmentService] Erreur Supabase insert fallback:', insertErr.message);
          } else {
            AuditLogger.logCreate('RECRUITMENT', 'CANDIDATE_EVALUATION', newId, newEval, `Insertion fallback rapport évaluation ${newId}`);
          }
        } else {
          AuditLogger.logUpdate('RECRUITMENT', 'CANDIDATE_EVALUATION', newId, existingEval, newEval, `Mise à jour rapport évaluation ${newId}`);
        }
      } else {
        const { error } = await supabase.from('candidate_evaluations').insert([payload]);
        if (error) {
          console.warn('[RecruitmentService] Erreur Supabase saveEvaluation, persistance en local:', error.message);
        } else {
          AuditLogger.logCreate('RECRUITMENT', 'CANDIDATE_EVALUATION', newId, newEval, `Enregistrement évaluation candidat ${newEval.overall_score}/10 (${newEval.verdict})`);
        }
      }
    } catch (err) {
      console.warn('[RecruitmentService] Exception réseau saveEvaluation, persistance en local:', err);
    }

    // 2. Cache local synchrone
    let updated: CandidateEvaluation[];
    if (isUpdate) {
      const idx = list.findIndex(e => e.id === newId);
      if (idx >= 0) {
        updated = [...list];
        updated[idx] = newEval;
      } else {
        updated = [newEval, ...list];
      }
    } else {
      updated = [newEval, ...list];
    }
    setLocal(KEY_EVALS, updated);

    // 3. Si un test est rattaché à l'évaluation, marquer ce test comme 'completed'
    if (evaluation.test_id) {
      try {
        await this.updateTest(evaluation.test_id, { status: 'completed' });
      } catch (testErr) {
        console.warn('[RecruitmentService] Impossible de mettre à jour le statut du test rattaché:', testErr);
      }
    }

    // 4. Synchronisation de la décision du rapport sur la fiche candidat et Pipeline Kanban
    if (evaluation.candidate_id) {
      try {
        const evDecision = (evaluation as any).scout_state_decision || evaluation.report_data?.scout_state_decision;
        const candidates = await this.getCandidates();
        const cand = candidates.find(c => c.id === evaluation.candidate_id);
        const updates: Record<string, any> = {};

        if (evDecision) {
          updates.scout_state_decision = evDecision;
        }

        if (cand && !['signed', 'academy', 'rejected', 'archived'].includes(cand.pipeline_stage)) {
          if (options?.promoteToShortlist) {
            updates.pipeline_stage = 'shortlisted';
            // Préserver le scout découvreur d'origine s'il existe déjà
            updates.discovering_scout_name = cand.discovering_scout_name || evaluation.evaluator_name;
          } else if (['prospect', 'test_scheduled'].includes(cand.pipeline_stage)) {
            updates.pipeline_stage = 'test_completed';
            // Préserver le scout découvreur d'origine s'il existe déjà
            updates.discovering_scout_name = cand.discovering_scout_name || evaluation.evaluator_name;
          }
        }

        if (Object.keys(updates).length > 0) {
          await this.updateCandidate(evaluation.candidate_id, updates);
        }
      } catch (candErr) {
        console.warn('[RecruitmentService] Erreur mise à jour candidat lors de l\'évaluation:', candErr);
      }
    }

    // 5. Auto-log dans la Timeline
    const isReeval = options?.isReevaluation;
    const isShortlist = Boolean(options?.promoteToShortlist);
    const testNote = evaluation.test_name ? ` (Session : ${evaluation.test_name})` : '';
    await this.addTimelineEvent({
      candidate_id: evaluation.candidate_id,
      event_type: 'evaluated',
      event_title: isShortlist
        ? `⭐ Évaluation Validée : Note ${newEval.overall_score}/10 — Passation en Shortlist & Onze Idéal`
        : isReeval
          ? `Réévaluation Scout : Note ${newEval.overall_score}/10${testNote}`
          : `Évaluation Scout (Test Réalisé) : Note ${newEval.overall_score}/10${testNote}`,
      event_description: `Par le scout ${evaluation.evaluator_name || 'Staff FUS'}. Verdict : ${evaluation.verdict}.${isShortlist ? ' Intégré officiellement à la Shortlist et au Onze Idéal.' : ' Métriques conservées pour les prochaines sessions de la semaine de test.'}`,
      performed_by: evaluation.evaluator_name || 'Cellule Recrutement',
      event_date: evaluation.evaluation_date,
    });

    return newEval;
  },

  async deleteEvaluation(id: string): Promise<void> {
    try {
      if (isValidUuid(id)) {
        const { error } = await supabase
          .from('candidate_evaluations')
          .delete()
          .eq('id', id);
        if (error) {
          console.warn(`[RecruitmentService] Erreur Supabase deleteEvaluation (${id}):`, error.message);
        } else {
          AuditLogger.logDelete('RECRUITMENT', 'CANDIDATE_EVALUATION', id, null, `Suppression rapport évaluation ${id}`);
        }
      }
    } catch (err) {
      console.warn(`[RecruitmentService] Exception réseau deleteEvaluation (${id}):`, err);
    }

    const list = getLocal<CandidateEvaluation[]>(KEY_EVALS, initialMockEvaluations);
    const target = list.find(e => e.id === id);
    const updated = list.filter(e => e.id !== id);
    setLocal(KEY_EVALS, updated);

    if (target?.test_id) {
      const remainingForTest = updated.some(e => e.test_id === target.test_id);
      if (!remainingForTest) {
        try {
          await this.updateTest(target.test_id, { status: 'scheduled' });
        } catch (e) {
          console.warn('[RecruitmentService] Erreur mise à jour statut test suite à suppression évaluation:', e);
        }
      }
    }
  },

  async deleteEvaluations(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    try {
      const validUuids = ids.filter(id => isValidUuid(id));
      if (validUuids.length > 0) {
        const { error } = await supabase
          .from('candidate_evaluations')
          .delete()
          .in('id', validUuids);
        if (error) {
          console.warn(`[RecruitmentService] Erreur Supabase deleteEvaluations:`, error.message);
        } else {
          AuditLogger.logDelete('RECRUITMENT', 'CANDIDATE_EVALUATION', validUuids.join(','), null, `Suppression multiple de ${validUuids.length} rapports`);
        }
      }
    } catch (err) {
      console.warn(`[RecruitmentService] Exception réseau deleteEvaluations:`, err);
    }

    const list = getLocal<CandidateEvaluation[]>(KEY_EVALS, initialMockEvaluations);
    const idSet = new Set(ids);
    const updated = list.filter(e => !idSet.has(e.id));
    setLocal(KEY_EVALS, updated);
  },

  // 5. OBSERVATIONS (Synchronisées avec recruitment_timeline)
  async getObservations(): Promise<ScoutObservation[]> {
    const isCleared = getLocal<boolean>(KEY_CLEARED, false);
    if (isCleared) return [];
    const local = getLocal<ScoutObservation[] | null>(KEY_OBS, null);
    return local !== null ? local : initialMockObservations;
  },

  async createObservation(obs: Omit<ScoutObservation, 'id' | 'created_at'>): Promise<ScoutObservation> {
    setLocal(KEY_CLEARED, false);
    const newId = ensureUuid();
    const newObs: ScoutObservation = { ...obs, id: newId, created_at: new Date().toISOString() };
    const list = getLocal<ScoutObservation[]>(KEY_OBS, []);
    setLocal(KEY_OBS, [newObs, ...list]);

    await this.addTimelineEvent({
      candidate_id: obs.candidate_id,
      event_type: 'scouted',
      event_title: `Rapport d'Observation Match (${obs.match_name || 'Observation'})`,
      event_description: `Potentiel évalué à ${obs.potential_rating}/10 par ${obs.scout_name || 'Scout'}. ${obs.strengths ? `Points forts : ${obs.strengths}` : ''}`,
      performed_by: obs.scout_name || 'Scout',
      event_date: obs.observation_date,
    });
    return newObs;
  },

  // 6. TIMELINE (Persistance Supabase public.recruitment_timeline)
  async getTimeline(candidateId?: string): Promise<RecruitmentTimelineEvent[]> {
    const isCleared = getLocal<boolean>(KEY_CLEARED, false);
    const local = getLocal<RecruitmentTimelineEvent[]>(KEY_TIMELINE, initialMockTimeline);

    try {
      let query = supabase.from('recruitment_timeline').select('*').order('created_at', { ascending: false });
      if (candidateId && isValidUuid(candidateId)) {
        query = query.eq('candidate_id', candidateId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const localItems = candidateId ? local.filter(t => t.candidate_id === candidateId) : local;
        const seenIds = new Set(data.map(d => d.id));
        const merged = [
          ...data,
          ...localItems.filter(l => !seenIds.has(l.id))
        ];
        return merged as RecruitmentTimelineEvent[];
      }
    } catch (err) {
      console.warn('[RecruitmentService] Exception getTimeline Supabase:', err);
    }

    if (isCleared) return [];
    if (candidateId) {
      return local.filter(t => t.candidate_id === candidateId);
    }
    return local;
  },

  async addTimelineEvent(event: Omit<RecruitmentTimelineEvent, 'id' | 'created_at'>): Promise<RecruitmentTimelineEvent> {
    const newId = ensureUuid();
    const nowIso = new Date().toISOString();
    const newEvent: RecruitmentTimelineEvent = { ...event, id: newId, created_at: nowIso };

    if (isValidUuid(event.candidate_id)) {
      try {
        const { error } = await supabase.from('recruitment_timeline').insert([{
          id: newId,
          candidate_id: event.candidate_id,
          event_type: event.event_type || 'discovered',
          event_title: event.event_title || 'Événement Recrutement',
          event_description: event.event_description || null,
          performed_by: event.performed_by || 'Staff Recrutement',
          event_date: event.event_date || nowIso.split('T')[0],
          created_at: nowIso,
        }]);

        if (error) {
          console.warn('[RecruitmentService] Erreur Supabase addTimelineEvent:', error.message);
        }
      } catch (err) {
        console.warn('[RecruitmentService] Exception réseau addTimelineEvent:', err);
      }
    }

    const list = getLocal<RecruitmentTimelineEvent[]>(KEY_TIMELINE, initialMockTimeline);
    const updated = [newEvent, ...list];
    setLocal(KEY_TIMELINE, updated);
    return newEvent;
  },

  // 7. SQUAD INTEGRATION (Recruitment -> Players Table Sync)
  async integrateCandidateToSquad(candidateId: string, teamId?: string): Promise<{ success: boolean; message: string; player?: any }> {
    const candidates = await this.getCandidates();
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) throw new Error('Candidat introuvable');

    await this.updateCandidate(candidateId, {
      pipeline_stage: 'signed',
      status: 'selected',
    });

    const clubId = await getMyClubId();
    const fullName = `${candidate.first_name} ${candidate.last_name}`;

    let prefFoot: 'right' | 'left' | 'both' = 'right';
    if (candidate.preferred_foot === 'Gaucher') prefFoot = 'left';
    else if (candidate.preferred_foot === 'Ambidextre') prefFoot = 'both';

    let pos = candidate.primary_position || 'FW';
    if (pos.toLowerCase().includes('gardien')) pos = 'GK';
    else if (pos.toLowerCase().includes('défenseur') || pos.toLowerCase().includes('latéral') || pos.toLowerCase().includes('central')) pos = 'DF';
    else if (pos.toLowerCase().includes('milieu') || pos.toLowerCase().includes('sentinelle') || pos.toLowerCase().includes('meneur')) pos = 'MF';
    else if (pos.toLowerCase().includes('ailier') || pos.toLowerCase().includes('attaquant') || pos.toLowerCase().includes('centre')) pos = 'FW';

    try {
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('club_id', clubId)
        .ilike('full_name', fullName)
        .maybeSingle();

      if (existingPlayer) {
        return { success: true, message: `${fullName} est déjà présent dans l'effectif officiel.`, player: existingPlayer };
      }

      // Éviter les conflits 409 (Unique Constraint) sur jersey_number
      const { data: existingJerseys } = await supabase
        .from('players')
        .select('jersey_number')
        .eq('club_id', clubId);

      const takenSet = new Set((existingJerseys || []).map(p => p.jersey_number));
      let availableJersey = Math.floor(Math.random() * 80) + 10;
      while (takenSet.has(availableJersey)) {
        availableJersey = (availableJersey % 99) + 1;
      }

      const { data: newPlayer, error } = await supabase
        .from('players')
        .insert([{
          club_id: clubId,
          team_id: teamId || null,
          full_name: fullName,
          birth_date: candidate.birth_date || null,
          nationality: candidate.nationality || 'Maroc',
          height: candidate.height_cm || 175,
          weight: candidate.weight_kg || 68,
          preferred_foot: prefFoot,
          position: pos,
          jersey_number: availableJersey,
          photo_url: candidate.photo_url || null,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;

      await this.addTimelineEvent({
        candidate_id: candidateId,
        event_type: 'signed',
        event_title: `Signature & Intégration à l'Effectif Officiel`,
        event_description: `Le joueur ${fullName} a officiellement signé et a été intégré à l'effectif du club.`,
        performed_by: 'Cellule Recrutement & Direction Sportive',
        event_date: new Date().toISOString().split('T')[0],
      });

      return { success: true, message: `${fullName} intégré avec succès dans l'effectif officiel !`, player: newPlayer };
    } catch (err: any) {
      console.error('Error integrating candidate to squad:', err);
      return { success: false, message: err.message || 'Erreur lors de l\'intégration' };
    }
  },
  
  async syncCandidateToSquad(candidateId: string, teamId?: string): Promise<{ success: boolean; message: string; player?: any }> {
    return this.integrateCandidateToSquad(candidateId, teamId);
  },

  async syncAllSignedCandidatesToSquad(teamId?: string): Promise<{ added: number; total: number; message: string }> {
    const candidates = await this.getCandidates();
    const signedCandidates = candidates.filter(c => ['signed', 'academy', 'selected'].includes(c.pipeline_stage) || c.status === 'selected');

    let count = 0;
    for (const c of signedCandidates) {
      const res = await this.integrateCandidateToSquad(c.id, teamId);
      if (res.success && res.player) count++;
    }

    return {
      added: count,
      total: signedCandidates.length,
      message: `${count} recrue(s) signée(s) synchronisée(s) avec succès dans l'effectif officiel.`,
    };
  },

  // 6. HARD RESET SÉCURISÉ À TRIPLE FACTEUR
  async resetRecruitmentData(credentials: {
    email: string;
    password: string;
    confirmationWord: string;
  }): Promise<{ success: boolean; message: string }> {
    const cleanWord = credentials.confirmationWord.trim().toUpperCase();
    if (cleanWord !== 'REINITIALISER' && cleanWord !== 'RÉINITIALISER') {
      throw new Error('Le mot de confirmation est incorrect. Veuillez saisir exactement "REINITIALISER".');
    }

    if (!credentials.email.trim() || !credentials.password) {
      throw new Error('L\'identifiant email et le mot de passe administrateur sont obligatoires.');
    }

    // 1. Vérification des identifiants avec Supabase Auth
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email.trim(),
        password: credentials.password,
      });

      if (authError) {
        // Tolérance si la session active correspond déjà à l'administrateur
        const { data: sessionData } = await supabase.auth.getSession();
        const activeEmail = sessionData?.session?.user?.email;
        if (!activeEmail || activeEmail.toLowerCase() !== credentials.email.trim().toLowerCase()) {
          throw new Error(`Échec d'authentification : ${authError.message || 'Mot de passe ou email incorrect.'}`);
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Échec')) throw err;
      console.warn('[RecruitmentService] Note vérification auth:', err.message);
    }

    // 2. Suppression dans les tables Supabase existantes
    try {
      const { error } = await supabase.from('candidate_evaluations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) console.warn('[RecruitmentService] Erreur reset candidate_evaluations:', error.message);
    } catch (err) {
      console.warn('[RecruitmentService] Exception reset candidate_evaluations:', err);
    }

    try {
      const { error } = await supabase.from('trial_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) console.warn('[RecruitmentService] Erreur reset trial_sessions:', error.message);
    } catch (err) {
      console.warn('[RecruitmentService] Exception reset trial_sessions:', err);
    }

    try {
      const { error } = await supabase.from('trial_candidates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) console.warn('[RecruitmentService] Erreur reset trial_candidates:', error.message);
    } catch (err) {
      console.warn('[RecruitmentService] Exception reset trial_candidates:', err);
    }

    // 3. Purge du stockage local et caches
    setLocal(KEY_CLEARED, true);
    setLocal(KEY_CANDIDATES, []);
    setLocal(KEY_EVALS, []);
    setLocal(KEY_OBS, []);
    setLocal(KEY_TESTS, []);
    setLocal(KEY_TIMELINE, []);

    return {
      success: true,
      message: 'La cellule Détection & Recrutement a été entièrement réinitialisée à 0.',
    };
  },

  // 8. SYNCHRONISATION DU CLASSEMENT TACTIQUE SHORTLIST (SUPABASE)
  async getShortlistSlotOrder(): Promise<Record<string, string[]>> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('plugins')
        .limit(1)
        .maybeSingle();

      if (!error && data?.plugins && typeof data.plugins === 'object' && 'recruitment_shortlist_order' in data.plugins) {
        const dbOrder = (data.plugins as any).recruitment_shortlist_order;
        if (dbOrder && typeof dbOrder === 'object') {
          setLocal('fus_shortlist_custom_slot_order', dbOrder);
          return dbOrder;
        }
      }
    } catch (err) {
      console.warn('[RecruitmentService] Erreur lecture Supabase shortlist order:', err);
    }
    return getLocal<Record<string, string[]>>('fus_shortlist_custom_slot_order', {});
  },

  async saveShortlistSlotOrder(order: Record<string, string[]>): Promise<void> {
    // 1. Sauvegarde locale immédiate (0ms de latence)
    setLocal('fus_shortlist_custom_slot_order', order);

    // 2. Synchronisation en base de données Supabase
    try {
      const { data: currentSettings, error: selectErr } = await supabase
        .from('settings')
        .select('id, plugins')
        .limit(1)
        .maybeSingle();

      if (!selectErr && currentSettings?.id) {
        const currentPlugins = (currentSettings.plugins && typeof currentSettings.plugins === 'object')
          ? currentSettings.plugins
          : {};

        const updatedPlugins = {
          ...currentPlugins,
          recruitment_shortlist_order: order,
        };

        const { error: updateErr } = await supabase
          .from('settings')
          .update({ plugins: updatedPlugins })
          .eq('id', currentSettings.id);

        if (updateErr) {
          console.warn('[RecruitmentService] Erreur sauvegarde Supabase saveShortlistSlotOrder:', updateErr.message);
        }
      }
    } catch (err) {
      console.warn('[RecruitmentService] Exception Supabase saveShortlistSlotOrder:', err);
    }
  },

  // 8. ACCUSÉ DE RÉCEPTION MISSION SCOUTING (US-DASH-26)
  async acknowledgeMission(candidateId: string, missionId: string, scoutId: string, scoutName: string): Promise<TrialCandidate> {
    const candidates = await this.getCandidates();
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) throw new Error('Candidat introuvable');

    const ackTime = new Date().toISOString();
    let updatedActiveMission: ScoutMission | undefined = candidate.active_mission;
    if (updatedActiveMission && (updatedActiveMission.id === missionId || !missionId)) {
      updatedActiveMission = {
        ...updatedActiveMission,
        status: 'in_progress',
        acknowledged_at: ackTime,
        acknowledged_by_id: scoutId,
        acknowledged_by_name: scoutName,
      };
    }

    const updatedHistory = (candidate.mission_history || []).map(m => {
      if (m.id === missionId || (!missionId && updatedActiveMission && m.id === updatedActiveMission.id)) {
        return {
          ...m,
          status: 'in_progress' as const,
          acknowledged_at: ackTime,
          acknowledged_by_id: scoutId,
          acknowledged_by_name: scoutName,
        };
      }
      return m;
    });

    const updatedCandidate = await this.updateCandidate(candidateId, {
      active_mission: updatedActiveMission,
      mission_history: updatedHistory,
    });

    try {
      await this.addTimelineEvent({
        candidate_id: candidateId,
        event_type: 'observation_scheduled',
        event_title: `Accusé de réception validé par ${scoutName}`,
        event_description: `Mission "${updatedActiveMission?.mission_title || 'Observation'}" prise en charge et passée en cours.`,
        performed_by: scoutName,
        event_date: ackTime.split('T')[0],
      });
    } catch {
      // silence
    }

    return updatedCandidate;
  },

  // 9. CONFIGURATIONS DE SHORTLISTS ENREGISTRÉES AVEC INTITULÉ (US-DASH-33)
  async getSavedShortlists(): Promise<SavedShortlistConfig[]> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('plugins')
        .limit(1)
        .maybeSingle();

      if (!error && data?.plugins && typeof data.plugins === 'object' && 'recruitment_saved_shortlists' in data.plugins) {
        const dbShortlists = (data.plugins as any).recruitment_saved_shortlists;
        if (Array.isArray(dbShortlists)) {
          setLocal(KEY_SAVED_SHORTLISTS, dbShortlists);
          return dbShortlists;
        }
      }
    } catch (err) {
      console.warn('[RecruitmentService] Erreur lecture Supabase saved shortlists:', err);
    }
    return getLocal<SavedShortlistConfig[]>(KEY_SAVED_SHORTLISTS, []);
  },

  async saveShortlistConfig(
    config: Omit<SavedShortlistConfig, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ): Promise<SavedShortlistConfig> {
    const currentList = getLocal<SavedShortlistConfig[]>(KEY_SAVED_SHORTLISTS, []);
    const now = new Date().toISOString();
    let savedItem: SavedShortlistConfig;

    if (config.id && currentList.some(item => item.id === config.id)) {
      savedItem = {
        ...config,
        id: config.id,
        created_at: currentList.find(i => i.id === config.id)?.created_at || now,
        updated_at: now,
      };
      const updatedList = currentList.map(item => item.id === config.id ? savedItem : item);
      setLocal(KEY_SAVED_SHORTLISTS, updatedList);
    } else {
      savedItem = {
        ...config,
        id: config.id || ensureUuid(),
        created_at: now,
        updated_at: now,
      };
      const updatedList = [savedItem, ...currentList.filter(i => i.id !== savedItem.id)];
      setLocal(KEY_SAVED_SHORTLISTS, updatedList);
    }

    // Synchronisation en base Supabase (table settings)
    try {
      const { data: currentSettings, error: selectErr } = await supabase
        .from('settings')
        .select('id, plugins')
        .limit(1)
        .maybeSingle();

      if (!selectErr && currentSettings?.id) {
        const currentPlugins = (currentSettings.plugins && typeof currentSettings.plugins === 'object')
          ? currentSettings.plugins
          : {};

        const latestLocalList = getLocal<SavedShortlistConfig[]>(KEY_SAVED_SHORTLISTS, []);
        const updatedPlugins = {
          ...currentPlugins,
          recruitment_saved_shortlists: latestLocalList,
        };

        const { error: updateErr } = await supabase
          .from('settings')
          .update({ plugins: updatedPlugins })
          .eq('id', currentSettings.id);

        if (updateErr) {
          console.warn('[RecruitmentService] Erreur Supabase saveShortlistConfig:', updateErr.message);
        }
      }
    } catch (err) {
      console.warn('[RecruitmentService] Exception Supabase saveShortlistConfig:', err);
    }

    return savedItem;
  },

  async deleteSavedShortlist(id: string): Promise<void> {
    const currentList = getLocal<SavedShortlistConfig[]>(KEY_SAVED_SHORTLISTS, []);
    const updatedList = currentList.filter(item => item.id !== id);
    setLocal(KEY_SAVED_SHORTLISTS, updatedList);

    try {
      const { data: currentSettings, error: selectErr } = await supabase
        .from('settings')
        .select('id, plugins')
        .limit(1)
        .maybeSingle();

      if (!selectErr && currentSettings?.id) {
        const currentPlugins = (currentSettings.plugins && typeof currentSettings.plugins === 'object')
          ? currentSettings.plugins
          : {};

        const updatedPlugins = {
          ...currentPlugins,
          recruitment_saved_shortlists: updatedList,
        };

        await supabase
          .from('settings')
          .update({ plugins: updatedPlugins })
          .eq('id', currentSettings.id);
      }
    } catch (err) {
      console.warn('[RecruitmentService] Exception Supabase deleteSavedShortlist:', err);
    }
  }
};
