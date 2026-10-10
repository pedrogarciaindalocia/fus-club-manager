import type {
  Scout,
  TrialCandidate,
  PlayerTest,
  CandidateEvaluation,
  ScoutObservation,
  RecruitmentTimelineEvent
} from '../types/recruitment';

// SCOUTS INITIAL DEMO DATA
export const initialMockScouts: Scout[] = [
  {
    id: 'scout-001',
    full_name: 'Hassan Benabicha',
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    phone: '+212 6 61 11 22 33',
    email: 'h.benabicha@fus.ma',
    role_title: 'Directeur du Recrutement & Scouting',
    recruitment_region: 'National / Élite',
    assigned_categories: ['U13', 'U15', 'U17'],
    assigned_teams: ['Académie FUS Élite', 'École de Foot'],
    status: 'active',
    recruited_date: '2022-06-01',
    notes: 'Supervision générale de la cellule détection jeune.',
  },
  {
    id: 'scout-002',
    full_name: 'Youssef Safri',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    phone: '+212 6 62 44 55 66',
    email: 'y.safri@fus.ma',
    role_title: 'Scout Principal - Nord & Centre',
    recruitment_region: 'Rabat-Salé-Kénitra & Casablanca',
    assigned_categories: ['U13', 'U15'],
    assigned_teams: ['Académie FUS Formation U13'],
    status: 'active',
    recruited_date: '2023-09-15',
    notes: 'Spécialiste de la détection précoce des jeunes talents U13.',
  },
  {
    id: 'scout-003',
    full_name: 'Tarik Sektioui',
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    phone: '+212 6 63 77 88 99',
    email: 't.sektioui@fus.ma',
    role_title: 'Scout Régional - Détection Précoce',
    recruitment_region: 'Tanger-Tétouan & Fès-Meknès',
    assigned_categories: ['U13', 'U15'],
    assigned_teams: ['Académie FUS'],
    status: 'active',
    recruited_date: '2024-01-10',
    notes: 'Détection sur les tournois de jeunes et écoles de football.',
  },
  {
    id: 'scout-004',
    full_name: 'Karim Fassi-Fihri',
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    phone: '+212 6 65 99 88 77',
    email: 'k.fassi@fus.ma',
    role_title: 'Chargé de Recrutement & Relations Familles',
    recruitment_region: 'National',
    assigned_categories: ['U13', 'U15'],
    assigned_teams: ['Académie FUS U13'],
    status: 'active',
    recruited_date: '2023-05-20',
    notes: 'Suivi administratif des dossiers de détection jeunes.',
  }
];

// CANDIDATES INITIAL DEMO DATA : EXCLUSIVEMENT DES PROSPECTS U13 (11 JOUEURS COMPLETS)
export const initialMockCandidates: TrialCandidate[] = [];

// TESTS / SESSIONS DEMO DATA (Vide au départ : les tests seront planifiés après shortlist)
export const initialMockTests: PlayerTest[] = [];

// EVALUATIONS DEMO DATA (Vide au départ : les évaluations seront saisies par le scout directement)
export const initialMockEvaluations: CandidateEvaluation[] = [];

// OBSERVATIONS DEMO DATA
export const initialMockObservations: ScoutObservation[] = [];

// TIMELINE EVENTS INITIAL DEMO DATA
export const initialMockTimeline: RecruitmentTimelineEvent[] = [];
