import { supabase } from '../lib/supabase';
import type { Arbitre, ArbitreFormData } from '../types/arbitre';
import { DEFAULT_MOCK_ARBITRES } from '../mocks/mockArbitres';

const STORAGE_KEY = 'fus_arbitres_registry_v2';
const DELETED_IDS_KEY = 'fus_arbitres_deleted_ids_v2';

function getDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map(String));
      }
    }
  } catch (err) {
    console.warn('Erreur lecture deleted_ids arbitres:', err);
  }
  return new Set<string>();
}

function recordDeletedId(id: number | string): void {
  const deleted = getDeletedIds();
  deleted.add(String(id));
  try {
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(deleted)));
  } catch (err) {
    console.warn('Erreur écriture deleted_ids arbitres:', err);
  }
}

function getStoredArbitres(): Arbitre[] {
  const deleted = getDeletedIds();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((a: Arbitre) => !deleted.has(String(a.id)));
      }
    }
  } catch (err) {
    console.warn('Erreur lecture localStorage pour les arbitres:', err);
  }
  // Premier démarrage : initialisation à partir des mocks moins les éléments supprimés
  const initial = DEFAULT_MOCK_ARBITRES.filter((a) => !deleted.has(String(a.id)));
  setStoredArbitres(initial);
  return initial;
}

function setStoredArbitres(list: Arbitre[]): void {
  const deleted = getDeletedIds();
  const cleanList = list.filter((a) => !deleted.has(String(a.id)));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
  } catch (err) {
    console.warn('Erreur écriture localStorage pour les arbitres:', err);
  }
}

/** Nettoie et formate les données pour respecter les contraintes SQL de la table arbitres */
function sanitizeArbitrePayload(data: Partial<ArbitreFormData>) {
  const payload: Record<string, any> = {};

  if (data.nom !== undefined) payload.nom = data.nom.trim();
  if (data.prenom !== undefined) payload.prenom = data.prenom.trim();
  if (data.numero_licence !== undefined) payload.numero_licence = data.numero_licence.trim();
  if (data.role_principal !== undefined) payload.role_principal = data.role_principal;
  if (data.grade !== undefined) payload.grade = data.grade;
  if (data.statut !== undefined) payload.statut = data.statut;
  if (data.nationalite !== undefined) {
    payload.nationalite = data.nationalite.trim() || 'Maroc';
  }

  // Évite les erreurs "invalid input syntax for type date: """ sur Postgres
  if (data.date_naissance !== undefined) {
    payload.date_naissance = data.date_naissance && data.date_naissance.trim() !== '' 
      ? data.date_naissance.trim() 
      : null;
  }

  // Évite les conflits d'unicité sur chaine vide pour l'email
  if (data.email !== undefined) {
    payload.email = data.email && data.email.trim() !== '' 
      ? data.email.trim() 
      : null;
  }

  if (data.telephone !== undefined) {
    payload.telephone = data.telephone && data.telephone.trim() !== '' 
      ? data.telephone.trim() 
      : null;
  }

  if (data.photo_url !== undefined) {
    payload.photo_url = data.photo_url && data.photo_url.trim() !== '' 
      ? data.photo_url.trim() 
      : null;
  }

  return payload;
}

export const arbitreService = {
  /**
   * Récupère la liste de tous les arbitres (Supabase en priorité, sinon localStorage)
   * Filtre toujours les arbitres supprimés pour éviter toute résurrection au rafraîchissement
   */
  async getArbitres(): Promise<Arbitre[]> {
    const deleted = getDeletedIds();
    try {
      const { data, error } = await supabase
        .from('arbitres')
        .select('*')
        .order('nom', { ascending: true });

      if (error) {
        return getStoredArbitres();
      }

      if (data && data.length > 0) {
        const clean = data.filter((a: Arbitre) => !deleted.has(String(a.id)));
        setStoredArbitres(clean);
        return clean;
      }

      // Si la table distante est vide, initialiser avec le stockage local
      const local = getStoredArbitres();
      return local;
    } catch (err) {
      return getStoredArbitres();
    }
  },

  /**
   * Crée un nouvel arbitre dans Supabase avec fallback localStorage
   */
  async createArbitre(formData: ArbitreFormData): Promise<Arbitre> {
    const payload = sanitizeArbitrePayload(formData);

    try {
      const { data: inserted, error } = await supabase
        .from('arbitres')
        .insert([payload])
        .select()
        .single();

      if (error || !inserted) {
        const currentList = getStoredArbitres();
        const fallbackArbitre: Arbitre = {
          id: Date.now(),
          nom: payload.nom || '',
          prenom: payload.prenom || '',
          date_naissance: payload.date_naissance || null,
          nationalite: payload.nationalite || 'Maroc',
          numero_licence: payload.numero_licence || `ARB-${Date.now()}`,
          email: payload.email || null,
          telephone: payload.telephone || null,
          role_principal: payload.role_principal || 'central',
          grade: payload.grade || 'Régional',
          statut: payload.statut || 'actif',
          photo_url: payload.photo_url || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const updatedList = [fallbackArbitre, ...currentList.filter(a => String(a.id) !== String(fallbackArbitre.id))];
        setStoredArbitres(updatedList);
        return fallbackArbitre;
      }

      // Succès Supabase : mettre à jour le cache local
      const currentList = getStoredArbitres();
      const updatedList = [inserted, ...currentList.filter(a => String(a.id) !== String(inserted.id))];
      setStoredArbitres(updatedList);
      return inserted;
    } catch (err: any) {
      const currentList = getStoredArbitres();
      const fallbackArbitre: Arbitre = {
        id: Date.now(),
        nom: payload.nom || '',
        prenom: payload.prenom || '',
        date_naissance: payload.date_naissance || null,
        nationalite: payload.nationalite || 'Maroc',
        numero_licence: payload.numero_licence || `ARB-${Date.now()}`,
        email: payload.email || null,
        telephone: payload.telephone || null,
        role_principal: payload.role_principal || 'central',
        grade: payload.grade || 'Régional',
        statut: payload.statut || 'actif',
        photo_url: payload.photo_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedList = [fallbackArbitre, ...currentList.filter(a => String(a.id) !== String(fallbackArbitre.id))];
      setStoredArbitres(updatedList);
      return fallbackArbitre;
    }
  },

  /**
   * Met à jour un arbitre existant
   */
  async updateArbitre(id: number | string, formData: Partial<ArbitreFormData>): Promise<Arbitre> {
    const payload = sanitizeArbitrePayload(formData);

    try {
      const { data: updated, error } = await supabase
        .from('arbitres')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error || !updated) {
        const currentList = getStoredArbitres();
        const updatedList = currentList.map((a) =>
          String(a.id) === String(id) ? { ...a, ...payload, updated_at: new Date().toISOString() } : a
        );
        setStoredArbitres(updatedList);
        return updatedList.find((a) => String(a.id) === String(id))!;
      }

      // Succès Supabase
      const currentList = getStoredArbitres();
      const updatedList = currentList.map((a) => (String(a.id) === String(id) ? updated : a));
      setStoredArbitres(updatedList);
      return updated;
    } catch (err) {
      const currentList = getStoredArbitres();
      const updatedList = currentList.map((a) =>
        String(a.id) === String(id) ? { ...a, ...payload, updated_at: new Date().toISOString() } : a
      );
      setStoredArbitres(updatedList);
      return updatedList.find((a) => String(a.id) === String(id))!;
    }
  },

  /**
   * Supprime définitivement un arbitre
   * Enregistre l'ID dans la liste des suppressions persistantes pour garantir
   * qu'il ne réapparaisse jamais après un rafraîchissement
   */
  async deleteArbitre(id: number | string): Promise<void> {
    recordDeletedId(id);

    try {
      await supabase
        .from('arbitres')
        .delete()
        .eq('id', id);
    } catch (err) {
      console.warn('Exception suppression arbitre Supabase:', err);
    }

    const currentList = getStoredArbitres();
    const filtered = currentList.filter((a) => String(a.id) !== String(id));
    setStoredArbitres(filtered);
  },
};
