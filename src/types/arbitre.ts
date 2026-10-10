export type RolePrincipalArbitre = 'central' | 'assistant' | 'var' | 'quatrieme';
export type GradeArbitre = 'FIFA' | 'National 1' | 'Régional' | 'District';
export type StatutArbitre = 'actif' | 'inactif' | 'suspendu' | 'retraite';

export interface Arbitre {
  id: number;
  nom: string;
  prenom: string;
  date_naissance: string | null;
  nationalite: string | null;
  numero_licence: string;
  email: string | null;
  telephone: string | null;
  role_principal: RolePrincipalArbitre;
  grade: GradeArbitre;
  statut: StatutArbitre;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArbitreFormData {
  nom: string;
  prenom: string;
  date_naissance?: string;
  nationalite?: string;
  numero_licence: string;
  email?: string;
  telephone?: string;
  role_principal: RolePrincipalArbitre;
  grade: GradeArbitre;
  statut: StatutArbitre;
  photo_url?: string;
}

export interface MatchRefereeAssignment {
  central_id?: number | null;
  assistant1_id?: number | null;
  assistant2_id?: number | null;
  fourth_id?: number | null;
}

/** Helper function to calculate age dynamically from date_naissance */
export function calculateAge(dateNaissanceStr?: string | null): number | null {
  if (!dateNaissanceStr) return null;
  const birthDate = new Date(dateNaissanceStr);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
