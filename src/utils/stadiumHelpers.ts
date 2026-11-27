import type { Tables } from '../types/supabase';

export type Stadium = Tables<'stadiums'>;

/**
 * Recherche et résout le stade officiel à domicile de My Club :
 * 0. Priorité absolue au stade explicitement marqué `is_home_stadium = true`
 * 1. Sinon, repli sur la correspondance de nom ("FUS ACADEMY", etc.) ou `club_id`
 */
export function getFusAcademyStadium(
  stadiums: Stadium[],
  mainClubId?: string | null
): Stadium | undefined {
  if (!stadiums || stadiums.length === 0) return undefined;

  // 0. Stade explicitement assigné comme stade officiel de My Club
  const explicitHome =
    (mainClubId && stadiums.find((s) => s.is_home_stadium && s.club_id === mainClubId)) ||
    stadiums.find((s) => s.is_home_stadium);
  if (explicitHome) return explicitHome;

  // 1. Recherche par nom exact ou contenant "FUS ACADEMY" (insensible à la casse)
  const exact = stadiums.find((s) => {
    const nm = (s.name || '').toUpperCase().trim();
    return (
      nm === 'FUS ACADEMY' ||
      nm.includes('FUS ACADEMY') ||
      nm.includes('ACADÉMIE FUS') ||
      nm.includes('ACADEMIE FUS') ||
      nm.includes('FUS ACADÉMIE') ||
      nm.includes('FUS ACADEMIE')
    );
  });
  if (exact) return exact;

  // 2. Recherche contenant "ACADEMY" ou "ACADÉMIE"
  const academy = stadiums.find((s) => {
    const nm = (s.name || '').toUpperCase().trim();
    return nm.includes('ACADEMY') || nm.includes('ACADÉMIE') || nm.includes('ACADEMIE');
  });
  if (academy) return academy;

  // 3. Recherche par club_id associé au club principal (My Club)
  if (mainClubId) {
    const byClub = stadiums.find((s) => s.club_id && s.club_id === mainClubId);
    if (byClub) return byClub;
  }

  // 4. Recherche par nom contenant "FUS" (ex: "Complexe Sportif FUS")
  const fus = stadiums.find((s) => (s.name || '').toUpperCase().includes('FUS'));
  if (fus) return fus;

  return stadiums[0];
}

