import { supabase } from '../../../lib/supabase';
import type {
  TrainingSession,
  TrainingExercise,
  SessionAttendance,
  PlayerTrainingEvaluation,
  PlayerTrainingLoad
} from '../types/training';
import {
  initialMockExercises,
  initialMockSessions,
  initialMockAttendances,
  initialMockEvaluations,
  initialMockLoads
} from '../mocks/mockTrainingData';

const KEY_SESSIONS = 'fus_training_sessions_v1';
const KEY_EXERCISES = 'fus_training_exercises_v1';
const KEY_ATTENDANCES = 'fus_training_attendances_v1';
const KEY_EVALUATIONS = 'fus_training_evaluations_v1';
const KEY_LOADS = 'fus_training_loads_v1';

function getLocal<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    if (data !== null) return JSON.parse(data);
  } catch (err) {
    console.warn(`[TrainingService] Erreur lecture localStorage (${key}):`, err);
  }
  return fallback;
}

function setLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[TrainingService] Erreur écriture localStorage (${key}):`, err);
  }
}

export const trainingService = {
  // 1. SESSIONS
  async getSessions(): Promise<TrainingSession[]> {
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .order('session_date', { ascending: false });
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
      // Fallback local
    }
    return getLocal<TrainingSession[]>(KEY_SESSIONS, initialMockSessions);
  },

  async getSessionById(id: string): Promise<TrainingSession | undefined> {
    const sessions = await this.getSessions();
    return sessions.find(s => s.id === id);
  },

  async createSession(session: Omit<TrainingSession, 'id' | 'created_at' | 'updated_at'>): Promise<TrainingSession> {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ses-${Date.now()}`;
    const newSession: TrainingSession = {
      ...session,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      await supabase.from('training_sessions').insert([newSession]);
    } catch {
      // Local fallback
    }
    const current = getLocal<TrainingSession[]>(KEY_SESSIONS, initialMockSessions);
    const updated = [newSession, ...current];
    setLocal(KEY_SESSIONS, updated);
    return newSession;
  },

  async updateSession(id: string, updates: Partial<TrainingSession>): Promise<TrainingSession> {
    try {
      await supabase.from('training_sessions').update(updates).eq('id', id);
    } catch {
      // Local fallback
    }
    const current = getLocal<TrainingSession[]>(KEY_SESSIONS, initialMockSessions);
    const updated = current.map(s => s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s);
    setLocal(KEY_SESSIONS, updated);
    return updated.find(s => s.id === id)!;
  },

  async deleteSession(id: string): Promise<void> {
    try {
      await supabase.from('training_sessions').delete().eq('id', id);
    } catch {
      // Local fallback
    }
    const current = getLocal<TrainingSession[]>(KEY_SESSIONS, initialMockSessions);
    setLocal(KEY_SESSIONS, current.filter(s => s.id !== id));
  },

  async duplicateSession(id: string): Promise<TrainingSession> {
    const original = await this.getSessionById(id);
    if (!original) throw new Error("Séance introuvable");
    const duplicated: Omit<TrainingSession, 'id' | 'created_at' | 'updated_at'> = {
      ...original,
      name: `${original.name} (Copie)`,
      session_date: new Date().toISOString().split('T')[0],
      status: 'planifiee',
      present_players_count: 0
    };
    return this.createSession(duplicated);
  },

  // 2. EXERCISES
  async getExercises(): Promise<TrainingExercise[]> {
    try {
      const { data, error } = await supabase
        .from('training_exercises')
        .select('*')
        .order('title', { ascending: true });
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
      // Fallback local
    }
    return getLocal<TrainingExercise[]>(KEY_EXERCISES, initialMockExercises);
  },

  async createExercise(exercise: Omit<TrainingExercise, 'id' | 'created_at' | 'updated_at'>): Promise<TrainingExercise> {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exo-${Date.now()}`;
    const newExercise: TrainingExercise = {
      ...exercise,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      await supabase.from('training_exercises').insert([newExercise]);
    } catch {
      // Local fallback
    }
    const current = getLocal<TrainingExercise[]>(KEY_EXERCISES, initialMockExercises);
    const updated = [newExercise, ...current];
    setLocal(KEY_EXERCISES, updated);
    return newExercise;
  },

  async updateExercise(id: string, updates: Partial<TrainingExercise>): Promise<TrainingExercise> {
    try {
      await supabase.from('training_exercises').update(updates).eq('id', id);
    } catch {
      // Local fallback
    }
    const current = getLocal<TrainingExercise[]>(KEY_EXERCISES, initialMockExercises);
    const updated = current.map(e => e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e);
    setLocal(KEY_EXERCISES, updated);
    return updated.find(e => e.id === id)!;
  },

  async deleteExercise(id: string): Promise<void> {
    try {
      await supabase.from('training_exercises').delete().eq('id', id);
    } catch {
      // Local fallback
    }
    const current = getLocal<TrainingExercise[]>(KEY_EXERCISES, initialMockExercises);
    setLocal(KEY_EXERCISES, current.filter(e => e.id !== id));
  },

  async toggleFavoriteExercise(id: string): Promise<TrainingExercise> {
    const current = getLocal<TrainingExercise[]>(KEY_EXERCISES, initialMockExercises);
    const exo = current.find(e => e.id === id);
    if (!exo) throw new Error("Exercice introuvable");
    return this.updateExercise(id, { is_favorite: !exo.is_favorite });
  },

  // 3. ATTENDANCES
  async getAttendances(sessionId?: string): Promise<SessionAttendance[]> {
    const list = getLocal<SessionAttendance[]>(KEY_ATTENDANCES, initialMockAttendances);
    if (sessionId) {
      return list.filter(a => a.session_id === sessionId);
    }
    return list;
  },

  async saveAttendances(sessionId: string, attendances: SessionAttendance[]): Promise<void> {
    const all = getLocal<SessionAttendance[]>(KEY_ATTENDANCES, initialMockAttendances);
    const filtered = all.filter(a => a.session_id !== sessionId);
    const updated = [...filtered, ...attendances];
    setLocal(KEY_ATTENDANCES, updated);

    // Update present count in session
    const presentCount = attendances.filter(a => a.status === 'present').length;
    await this.updateSession(sessionId, {
      called_players_count: attendances.length,
      present_players_count: presentCount
    });
  },

  // 4. EVALUATIONS
  async getEvaluations(): Promise<PlayerTrainingEvaluation[]> {
    try {
      const { data, error } = await supabase
        .from('player_training_evaluations')
        .select('*')
        .order('evaluation_date', { ascending: false });
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
      // Local fallback
    }
    return getLocal<PlayerTrainingEvaluation[]>(KEY_EVALUATIONS, initialMockEvaluations);
  },

  async saveEvaluation(evaluation: Omit<PlayerTrainingEvaluation, 'id'>): Promise<PlayerTrainingEvaluation> {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `eval-${Date.now()}`;
    const newEval: PlayerTrainingEvaluation = {
      ...evaluation,
      id: newId
    };
    try {
      await supabase.from('player_training_evaluations').insert([newEval]);
    } catch {
      // Local fallback
    }
    const current = getLocal<PlayerTrainingEvaluation[]>(KEY_EVALUATIONS, initialMockEvaluations);
    const updated = [newEval, ...current];
    setLocal(KEY_EVALUATIONS, updated);
    return newEval;
  },

  async deleteEvaluation(id: string): Promise<void> {
    try {
      await supabase.from('player_training_evaluations').delete().eq('id', id);
    } catch {
      // Local fallback
    }
    const current = getLocal<PlayerTrainingEvaluation[]>(KEY_EVALUATIONS, initialMockEvaluations);
    setLocal(KEY_EVALUATIONS, current.filter(e => e.id !== id));
  },

  // 5. TRAINING LOADS
  async getLoads(): Promise<PlayerTrainingLoad[]> {
    try {
      const { data, error } = await supabase
        .from('player_training_loads')
        .select('*')
        .order('session_date', { ascending: false });
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
      // Local fallback
    }
    return getLocal<PlayerTrainingLoad[]>(KEY_LOADS, initialMockLoads);
  },

  async saveLoad(loadItem: Omit<PlayerTrainingLoad, 'id'>): Promise<PlayerTrainingLoad> {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `load-${Date.now()}`;
    const newItem: PlayerTrainingLoad = {
      ...loadItem,
      id: newId
    };
    const current = getLocal<PlayerTrainingLoad[]>(KEY_LOADS, initialMockLoads);
    const updated = [newItem, ...current];
    setLocal(KEY_LOADS, updated);
    return newItem;
  }
};
