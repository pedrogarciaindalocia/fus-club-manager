import type { Club, MyClubSettings } from '../types';
import {
  buildMyClubContext,
  findMatchingOpponentClub,
  isMyClubName,
  resolveClubAbbreviation,
} from '../features/match-management/utils/frmfMatchSheetParser';

export const DEFAULT_CLUB_LOGOS: Record<string, string> = {
  FUS: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/logos/clubs/1776858917029-khfw3muevjp.jpg',
  RCA: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/logos/clubs/1776889736796-pci0pimt82p.png',
  RAJA: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/logos/clubs/1776889736796-pci0pimt82p.png',
  WAC: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/logos/clubs/1776889628358-3gxnk5hwghh.png',
  WYDAD: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/logos/clubs/1776889628358-3gxnk5hwghh.png',
  FAR: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/logos/clubs/1778162872620-tcx0vjbex8h.png',
  ASFAR: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/logos/clubs/1778162872620-tcx0vjbex8h.png',
  IRT: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1794221891908-el020f0tpnm.png',
  TANGER: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1794221891908-el020f0tpnm.png',
  UTS: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/logos/clubs/1779459564701-rix95xkbh7e.png',
  TOUARGA: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/logos/clubs/1779459564701-rix95xkbh7e.png',
  RSB: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/logos/clubs/1778162939931-ewkumg33s1h.png',
  BERKANE: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/logos/clubs/1778162939931-ewkumg33s1h.png',
  HUSA: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1792759043018-xeewv7kszpb.png',
  AGADIR: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1792759043018-xeewv7kszpb.png',
  MAS: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1791630271201-zjrxja5427a.png',
  FES: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1791630271201-zjrxja5427a.png',
  MAT: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1793878496833-ts0tbr7jge.webp',
  TETOUAN: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1793878496833-ts0tbr7jge.webp',
  KACM: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1794221988909-uw3mhak5y1o.png',
  MARRAKECH: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1794221988909-uw3mhak5y1o.png',
  CODM: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1794221639498-mo1iwp7atc.png',
  MEKNES: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1794221639498-mo1iwp7atc.png',
  DHJ: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1794221787756-vvit3mfjo1.png',
  JADIDA: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1794221787756-vvit3mfjo1.png',
  AMF: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/logos/clubs/u21-amf.png',
  ACADEMIE: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/logos/clubs/u21-amf.png',
  AAMF: '', // Association AMF (distinct de AMF / Académie Mohammed VI — ne doit jamais hériter du logo AMF)
  CFBG: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1792102487210-3fqnzhgw045.jpg',
  USAT: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1794222043143-luvb16ri8ws.png',
  RCAZ: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1793488379247-wj8mwtcz0wq.png',
  ZEMAMRA: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1793488379247-wj8mwtcz0wq.png',
  WST: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1792185973421-kep95se0n6d.jpg',
  TEMARA: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1792185973421-kep95se0n6d.jpg',
  OCS: 'https://upload.wikimedia.org/wikipedia/fr/b/b8/Logo_de_l%27Olympique_Club_de_Safi.png',
  SAFI: 'https://upload.wikimedia.org/wikipedia/fr/b/b8/Logo_de_l%27Olympique_Club_de_Safi.png',
  SCCM: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/logos/clubs/u21-usat.png',
  MOHAMMEDIA: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/logos/clubs/u21-usat.png',
  JSS: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1793488379247-wj8mwtcz0wq.png',
  SOUALEM: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1793488379247-wj8mwtcz0wq.png',
  MCO: 'https://upload.wikimedia.org/wikipedia/fr/8/87/Mouloudia_Club_d%27Oujda.png',
  OUJDA: 'https://upload.wikimedia.org/wikipedia/fr/8/87/Mouloudia_Club_d%27Oujda.png',
  OCK: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1792061673283-hp4ktnbrl6.png',
  KHOURIBGA: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1792061673283-hp4ktnbrl6.png',
  IZK: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1791630271201-zjrxja5427a.png',
  KHEMISSET: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1791630271201-zjrxja5427a.png',
  RAC: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1794221891908-el020f0tpnm.png',
  RCOZ: 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/1793488379247-wj8mwtcz0wq.png',
};

/**
 * Résout le lien vers l'image du logo pour un club donné en priorisant les logos enregistrés en base de données
 */
export function getClubLogoUrl(
  clubName?: string | null,
  opponentClubs?: Club[],
  mainClub?: MyClubSettings | null
): string {
  if (!clubName) {
    return 'https://ui-avatars.com/api/?name=FC&background=020617&color=fff&size=128';
  }

  const myClubCtx = buildMyClubContext(mainClub);

  // 1. Priorité absolue : My Club depuis les paramètres BDD
  if (isMyClubName(clubName, myClubCtx)) {
    if (mainClub?.logo_url && mainClub.logo_url !== 'null') {
      return mainClub.logo_url;
    }
    return DEFAULT_CLUB_LOGOS[myClubCtx.myClubAbbreviation] || DEFAULT_CLUB_LOGOS.FUS;
  }

  // 2. Priorité absolue : Club adversaire enregistré en base de données (recherche par abréviation & nom)
  if (opponentClubs && opponentClubs.length > 0) {
    const abbr = resolveClubAbbreviation(clubName);
    const opp = findMatchingOpponentClub(clubName, opponentClubs, undefined, abbr);
    if (opp?.logo_url && opp.logo_url !== 'null') {
      return opp.logo_url;
    }
  }

  // 3. Fallback dictionnaire statique (via abréviation canonique puis nom)
  const norm = clubName.trim().toUpperCase();
  const abbrKey = resolveClubAbbreviation(clubName);
  if (DEFAULT_CLUB_LOGOS[abbrKey] !== undefined) {
    if (DEFAULT_CLUB_LOGOS[abbrKey]) {
      return DEFAULT_CLUB_LOGOS[abbrKey];
    }
  }
  for (const [key, url] of Object.entries(DEFAULT_CLUB_LOGOS)) {
    if (!url) continue;
    // Empêcher qu'un sigle court comme 'AMF' ou 'ACADEMIE' soit matché pour 'AAMF' / 'Association AMF'
    if (
      (key === 'AMF' || key === 'ACADEMIE') &&
      (norm.includes('AAMF') || abbrKey === 'AAMF' || norm.includes('ASSOCIATION ACADEMIE') || norm.includes('ASSOCIATION AMF'))
    ) {
      continue;
    }
    if (norm === key || (key.length >= 4 && (norm.includes(key) || key.includes(norm)))) {
      return url;
    }
  }

  // 4. Fallback avatar élégant avec l'abréviation
  const cleanInitials = abbrKey || norm.replace(/[^A-Z]/g, '').slice(0, 3) || 'FC';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanInitials)}&background=020617&color=fff&size=128`;
}

