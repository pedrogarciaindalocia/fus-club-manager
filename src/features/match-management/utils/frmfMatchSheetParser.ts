import type {
  FRMFPlayer,
  FRMFGoal,
  FRMFCard,
  FRMFSubstitution,
  FRMFInjury,
  FRMFOfficial,
  FRMFMatchContext,
  ParsedMatchSheet,
} from '../types/matchSheetTypes';
import type { Club, MyClubSettings } from '../../../types';
import { getCategoryRank } from '../../../utils/categoryRank';
import { normalizeAgeCategory } from '../../../constants';

export const VALIDATED_SEASONS = ['2023/24', '2024/25', '2025/26', '2026/27', '2027/28'];

const CLUB_ABBREVIATION_ALIASES: Record<string, string[]> = {
  FUS: ['fus', 'fath union sport', 'fath union sport de rabat', 'fus rabat', 'fath rabat', 'fus club'],
  OCK: ['ock', 'olympique club khouribga', 'olympique club de khouribga', 'olympique khouribga', 'o c khouribga'],
  WAC: ['wac', 'wydad ac', 'wydad athletic club', 'wydad casablanca', 'wydad'],
  RCA: ['rca', 'raja ca', 'raja club athletic', 'raja casablanca', 'raja'],
  FAR: ['far', 'as far', 'asfar', 'far rabat', 'association sportive des far', 'a s far'],
  RSB: ['rsb', 'rs berkane', 'renaissance sportive berkane', 'renaissance berkane', 'berkane'],
  MAS: ['mas', 'mas fes', 'maghreb fes', 'maghreb association sportive', 'maghreb de fes'],
  IRT: ['irt', 'ir tanger', 'ittihad tanger', 'ittihad riadi tanger'],
  UTS: ['uts', 'union touarga', 'union sportive touarga', 'us touarga'],
  HUSA: ['husa', 'hassania agadir', 'hassania union sport agadir'],
  MAT: ['mat', 'moghreb tetouan', 'moghreb athletic tetouan'],
  KACM: ['kacm', 'kawkab marrakech', 'kawkab athletic club marrakech'],
  CODM: ['codm', 'cod meknes', 'club omnisports de meknes', 'c o d meknes'],
  DHJ: ['dhj', 'difaa el jadida', 'difaa hassani jadidi', 'difaa hassani el jadida'],
  OCS: ['ocs', 'olympic safi', 'olympique safi'],
  AAMF: ['aamf', 'amf', 'academie mohammed vi', 'academie mohammed 6', 'academie m6', 'academie mohammed vi de football'],
  CFBG: ['cfbg', 'centre de formation ben guerir', 'cf ben guerir', 'club football ben guerir'],
  SCCM: ['sccm', 'chabab mohammedia', 'sporting club chabab mohammedia', 'sc chabab mohammedia'],
  RCAZ: ['rcaz', 'renaissance zemamra', 'renaissance club athletic zemamra'],
  JSS: ['jss', 'jeunesse soualem', 'jeunesse sportive soualem', 'jeunesse sportive de soualem'],
  WST: ['wst', 'widad temara', 'wydad temara', 'wydad de temara', 'widad de temara', 'wydad sportive temara'],
  MCO: ['mco', 'mouloudia oujda', 'mc oujda'],
  IZK: ['izk', 'ittihad khemisset'],
  RAC: ['rac', 'racing casablanca', 'racing athletic club'],
  RCOZ: ['rcoz', 'rapide oued zem'],
  USAT: ['usat', 'union sportive amal tiznit', 'amal tiznit', 'us amal tiznit', 'union sportive temara', 'us temara'],
  CAYB: ['cayb', 'club athletic youssoufia berrechid', 'youssoufia berrechid'],
  KAC: ['kac', 'kenitra ac', 'kac kenitra', 'kenitra athletic club'],
  ASS: ['ass', 'as sale'],
  USMO: ['usmo', 'usm oujda'],
  SM: ['sm', 'stade marocain'],
};

/**
 * Normalisation de nom (retrait accents, minuscules, caractères spéciaux)
 */
export function normalizeName(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Découpe une chaîne en tokens normalisés significatifs
 */
export function tokenizeNormalized(str: string): string[] {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Correspondance robuste de noms de joueurs (gère "NOM Prénom" vs "Prénom Nom" et noms composés "Ben kaddour")
 */
export function matchPlayerName(nameA: string, nameB: string): boolean {
  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.length >= 6 && normB.length >= 6 && (normA.includes(normB) || normB.includes(normA))) {
    return true;
  }

  const tokensA = tokenizeNormalized(nameA).filter(t => t.length >= 2);
  const tokensB = tokenizeNormalized(nameB).filter(t => t.length >= 2);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  // Vérification par ordre inversé des tokens (ex: "Ben kaddour YASSINE" <-> "Yassine Benkaddour")
  const sortedA = [...tokensA].sort().join('');
  const sortedB = [...tokensB].sort().join('');
  if (sortedA === sortedB) return true;

  // Vérifier que chaque token significatif du nom le plus court est présent dans la forme compacte de l'autre
  const [shorterTokens, longerCompact] =
    tokensA.length <= tokensB.length ? [tokensA, normB] : [tokensB, normA];
  if (shorterTokens.length >= 2 && shorterTokens.every(tok => longerCompact.includes(tok))) {
    return true;
  }

  return false;
}

/**
 * Retire les suffixes de catégorie entre parenthèses ou en fin de nom de club (ex: "FUS (U16)" -> "FUS")
 */
export function stripCategorySuffix(name: string): string {
  return (name || '')
    .replace(/\(\s*U\d+\s*\)/gi, '')
    .replace(/\bU\d+\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcule l'acronyme d'un nom de club (ex: "Olympique Club de Khouribga" -> "OCK")
 */
export function computeClubAcronym(name: string): string {
  const stopWords = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'd', 'l', 'el', 'al', 'et', 'fc']);
  const tokens = tokenizeNormalized(stripCategorySuffix(name)).filter(t => !stopWords.has(t));
  if (tokens.length <= 1) return (tokens[0] || '').toUpperCase();
  return tokens.map(t => t[0]).join('').toUpperCase();
}

/**
 * Normalise une saison vers le format validé YYYY/YY (ex: "2026-2027" -> "2026/27")
 */
export function normalizeSeasonFormat(raw?: string | null): string {
  const clean = (raw || '').trim();
  const match = clean.match(/(\d{4})\s*[-/]\s*(\d{2,4})/);
  if (match) {
    const startYear = parseInt(match[1], 10);
    const rawEnd = match[2];
    const endShort =
      rawEnd.length === 4 ? rawEnd.slice(-2) : rawEnd.padStart(2, '0');
    return `${startYear}/${endShort}`;
  }
  const singleYear = clean.match(/^(\d{4})$/);
  if (singleYear) {
    const startYear = parseInt(singleYear[1], 10);
    return `${startYear}/${String(startYear + 1).slice(-2)}`;
  }
  return '2026/27';
}

export function getSeasonStartYear(seasonStr?: string | null): number {
  const normalized = normalizeSeasonFormat(seasonStr);
  const m = normalized.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : 2026;
}

/**
 * Construit le contexte My Club à partir des paramètres réels du club principal
 */
export function buildMyClubContext(mainClub?: MyClubSettings | null): FRMFMatchContext {
  const rawNames = [
    mainClub?.club_name,
    mainClub?.name,
    (mainClub as any)?.short_name,
  ]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map(v => v.trim());

  const primary = rawNames[0] || 'Fath Union Sport';
  const aliasSet = new Set<string>(rawNames);

  for (const nm of rawNames) {
    const acronym = computeClubAcronym(nm);
    if (acronym.length >= 2) aliasSet.add(acronym);
  }

  // Enrichir avec les variantes connues si My Club correspond au FUS
  const upperCombined = rawNames.join(' ').toUpperCase();
  const explicitShort = (mainClub as any)?.short_name ? String((mainClub as any).short_name).trim().toUpperCase() : '';
  let myClubAbbreviation = explicitShort;

  if (!rawNames.length || upperCombined.includes('FUS') || upperCombined.includes('FATH')) {
    aliasSet.add('Fath Union Sport');
    aliasSet.add('FUS');
    aliasSet.add('FUS Rabat');
    aliasSet.add('FUS de Rabat');
    if (!myClubAbbreviation) myClubAbbreviation = 'FUS';
  }

  if (!myClubAbbreviation) {
    myClubAbbreviation = resolveClubAbbreviation(primary);
  }

  return {
    myClubName: primary,
    myClubAbbreviation,
    myClubAliases: Array.from(aliasSet),
  };
}

/**
 * Résout l'abréviation officielle d'un club (ex: "Olympique Club Khouribga" -> "OCK", "FUS CLUB" -> "FUS")
 */
export function resolveClubAbbreviation(nameOrAbbr?: string | null): string {
  const cleaned = stripCategorySuffix(nameOrAbbr || '').trim();
  if (!cleaned) return 'CLB';

  const canonical = resolveCanonicalClubKey(cleaned);
  if (canonical) return canonical;

  const compact = cleaned.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (compact.length >= 2 && compact.length <= 5 && cleaned === cleaned.toUpperCase()) {
    return compact;
  }

  const acronym = computeClubAcronym(cleaned);
  if (acronym.length >= 2 && acronym.length <= 5) {
    return acronym;
  }

  return compact.slice(0, 4) || 'CLB';
}

/**
 * Vérifie si un nom d'équipe extrait correspond à My Club
 */
export function isMyClubName(teamName: string, context?: FRMFMatchContext): boolean {
  const cleaned = stripCategorySuffix(teamName);
  const normTeam = normalizeName(cleaned);
  if (!normTeam) return false;

  const aliases = context?.myClubAliases?.length
    ? context.myClubAliases
    : ['Fath Union Sport', 'FUS', 'FUS Rabat'];

  for (const alias of aliases) {
    const normAlias = normalizeName(stripCategorySuffix(alias));
    if (!normAlias) continue;
    if (normTeam === normAlias) return true;
    if (normAlias.length >= 4 && (normTeam.includes(normAlias) || normAlias.includes(normTeam))) {
      return true;
    }
    // Correspondance sigle sur frontière de mot (ex: "FUS" dans "FUS (U16)" ou "FUS RABAT")
    if (normAlias.length >= 2 && normAlias.length <= 5) {
      const tokens = tokenizeNormalized(cleaned);
      if (tokens.includes(normAlias)) return true;
    }
  }

  // Vérifier aussi via acronyme du nom d'équipe
  const teamAcronym = normalizeName(computeClubAcronym(cleaned));
  if (teamAcronym.length >= 3) {
    return aliases.some(a => normalizeName(a) === teamAcronym);
  }

  return false;
}

/**
 * Résout le groupe canonique d'un club (pour rapprocher "OCK" et "Olympique Club Khouribga")
 * Privilégie la correspondance exacte ou la variante la plus longue (ex: "Wydad Temara" -> WST avant "Wydad" -> WAC)
 */
function resolveCanonicalClubKey(nameOrAbbr: string): string | null {
  const cleaned = stripCategorySuffix(nameOrAbbr);
  const norm = normalizeName(cleaned);
  const tokens = tokenizeNormalized(cleaned);
  const stopWords = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'd', 'l', 'et']);
  const normNoStop = tokens.filter(t => !stopWords.has(t)).join('');
  const acronym = normalizeName(computeClubAcronym(cleaned));

  let bestKey: string | null = null;
  let bestScore = 0;

  for (const [key, variants] of Object.entries(CLUB_ABBREVIATION_ALIASES)) {
    const normKey = normalizeName(key);
    if (norm === normKey) {
      return key;
    }
    if (tokens.includes(normKey) || acronym === normKey) {
      const score = 800 + normKey.length;
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }
    for (const v of variants) {
      const normV = normalizeName(v);
      const normVNoStop = tokenizeNormalized(v).filter(t => !stopWords.has(t)).join('');
      if (norm === normV || (normNoStop && normNoStop === normVNoStop)) {
        return key;
      }
      if (
        (normV.length >= 5 && (norm.includes(normV) || normV.includes(norm))) ||
        (normVNoStop.length >= 6 && (normNoStop.includes(normVNoStop) || normVNoStop.includes(normNoStop)))
      ) {
        const score = 400 + Math.max(Math.min(norm.length, normV.length), Math.min(normNoStop.length, normVNoStop.length));
        if (score > bestScore) {
          bestScore = score;
          bestKey = key;
        }
      }
    }
  }
  return bestKey;
}

/**
 * Recherche un club adversaire dans la base par nom complet, short_name ou abréviation FRMF
 * En cas de doublon en BDD (ex: "OCK" et "Olympique Club Khouribga"), privilégie le club actif
 * possédant des matchs/logos existants (`preferredClubIds`) et un sigle officiel canonique.
 */
export function findMatchingOpponentClub(
  rawName: string,
  opponentClubs: Club[],
  preferredClubIds?: Set<string>,
  abbreviationHint?: string
): Club | null {
  if ((!rawName && !abbreviationHint) || !opponentClubs?.length) return null;
  const cleanedRaw = stripCategorySuffix(rawName || abbreviationHint || '');
  const normRaw = normalizeName(cleanedRaw);
  const resolvedAbbr = normalizeName(abbreviationHint || resolveClubAbbreviation(cleanedRaw));
  const rawTokens = tokenizeNormalized(cleanedRaw);
  const rawAcronym = normalizeName(computeClubAcronym(cleanedRaw));
  const rawCanonical =
    resolveCanonicalClubKey(cleanedRaw) ||
    (abbreviationHint ? resolveCanonicalClubKey(abbreviationHint) : null);

  const scored: Array<{ club: Club; score: number }> = [];

  for (const club of opponentClubs) {
    const cName = stripCategorySuffix(club.name || '');
    const normName = normalizeName(cName);
    const cShort = String((club as any).short_name || '').trim();
    const normShort = normalizeName(cShort);
    const cAcronym = normalizeName(computeClubAcronym(cName));
    const clubCanonical =
      resolveCanonicalClubKey(cName) || (cShort ? resolveCanonicalClubKey(cShort) : null);

    let matchScore = 0;

    // 1. Recherche prioritaire par abréviation exacte (ex: "OCK" == clubs.name "OCK")
    if (resolvedAbbr && (normName === resolvedAbbr || normShort === resolvedAbbr)) {
      matchScore += 90;
    }

    // 2. Correspondance canonique FRMF (ex: "Olympique Club Khouribga" <-> "OCK")
    if (rawCanonical && clubCanonical && rawCanonical === clubCanonical) {
      matchScore += 65;
      if (normName === normalizeName(rawCanonical) || normShort === normalizeName(rawCanonical)) {
        matchScore += 25;
      }
    }

    // 3. Correspondance exacte sur name ou short_name
    if (normName && normName === normRaw) {
      matchScore += 55;
    } else if (normShort && (normShort === normRaw || (rawAcronym.length >= 2 && normShort === rawAcronym))) {
      matchScore += 50;
    }

    // 4. Correspondance par acronyme calculé ou token sigle (ex: "A.S. FAR" -> token "far" == "FAR")
    if (matchScore === 0) {
      if (rawAcronym.length >= 2 && (cAcronym === rawAcronym || normName === rawAcronym)) {
        matchScore += 45;
      } else if (normRaw.length >= 2 && normRaw.length <= 5 && cAcronym === normRaw) {
        matchScore += 45;
      } else if (normName.length >= 2 && normName.length <= 6 && rawTokens.includes(normName)) {
        matchScore += 40;
      }
    }

    // 5. Correspondance partielle sécurisée (longueur >= 5)
    if (
      matchScore === 0 &&
      normName.length >= 5 &&
      normRaw.length >= 5 &&
      (normName.includes(normRaw) || normRaw.includes(normName))
    ) {
      matchScore += 30;
    }

    if (matchScore > 0) {
      if (club.is_active !== false) matchScore += 25;
      if (preferredClubIds?.has(club.id)) matchScore += 100;
      if (club.logo_url && club.logo_url !== 'null') matchScore += 20;
      scored.push({ club, score: matchScore });
    }
  }

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].club;
}

/**
 * Normalise les apostrophes courbes, tirets cadratins et espaces insécables
 */
export function normalizeDocumentText(text: string): string {
  return (text || '')
    .replace(/[\u2018\u2019\u201A\u201B\u0060\u00B4]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

/**
 * Décode une licence officielle FRMF (ex: "148877M11" ou "152923M12")
 */
export function parseFRMFLicense(license?: string | null): {
  licenseNumber: string;
  gender: 'M' | 'F';
  birthYear: number;
} | null {
  if (!license) return null;
  const match = license.trim().match(/(\d{5,7})\s*([MF])\s*(\d{2})/i);
  if (!match) return null;

  const rawNum = match[1];
  const gender = match[2].toUpperCase() as 'M' | 'F';
  const shortYear = parseInt(match[3], 10);
  const birthYear = shortYear > 50 ? 1900 + shortYear : 2000 + shortYear;

  return {
    licenseNumber: `${rawNum}${gender}${match[3]}`,
    gender,
    birthYear,
  };
}

/**
 * Convertit un âge sportif de fin de saison (ex: 2027 - 2011 = 16) en catégorie officielle FUS
 */
export function categoryFromSeasonAge(seasonAge: number): string {
  if (seasonAge <= 13) return 'U13';
  if (seasonAge === 14) return 'U14';
  if (seasonAge === 15) return 'U15';
  if (seasonAge === 16) return 'U16';
  if (seasonAge === 17) return 'U17';
  if (seasonAge === 18) return 'U18';
  if (seasonAge >= 19 && seasonAge <= 21) return 'U21';
  if (seasonAge >= 22 && seasonAge <= 23) return 'U23';
  return 'SENIOR';
}

/**
 * Compare une catégorie de joueur (depuis base de données) à la catégorie du match pour détecter un surclassement
 */
export function computeSurclassementFromCategory(
  playerCategory?: string | null,
  matchCategory?: string | null
): {
  isSurclasse: boolean;
  expectedCategory: string;
  surclasseDiffYears: number;
} {
  const safeMatchCat = (matchCategory || 'U16').toUpperCase().trim();
  if (!playerCategory) {
    return { isSurclasse: false, expectedCategory: safeMatchCat, surclasseDiffYears: 0 };
  }
  const safePlayerCat = playerCategory.toUpperCase().trim();
  const playerRank = getCategoryRank(safePlayerCat);
  const matchRank = getCategoryRank(safeMatchCat);
  if (playerRank > 0 && matchRank > 0 && playerRank < matchRank) {
    return {
      isSurclasse: true,
      expectedCategory: safePlayerCat,
      surclasseDiffYears: matchRank - playerRank,
    };
  }
  return {
    isSurclasse: false,
    expectedCategory: safePlayerCat,
    surclasseDiffYears: 0,
  };
}

/**
 * Détecte si un joueur est surclassé par rapport à la catégorie du match à partir de son année de naissance (licence FRMF)
 */
export function evaluateSurclassement(
  birthYear: number,
  matchCategory: string,
  seasonStr: string = '2026/27'
): {
  isSurclasse: boolean;
  expectedCategory: string;
  surclasseDiffYears: number;
} {
  const seasonStartYear = getSeasonStartYear(seasonStr);
  const seasonEndYear = seasonStartYear + 1;
  const seasonAge = seasonEndYear - birthYear;
  const expectedCategory = categoryFromSeasonAge(seasonAge);
  return computeSurclassementFromCategory(expectedCategory, matchCategory);
}

/**
 * Règle métier automatique Banc de Touche :
 * Tout joueur entrant (`jerseyIn`) lors d'un changement était obligatoirement sur le banc de touche (`type = 'R'`).
 */
export function enforceSubstitutionBenchRule(
  players: FRMFPlayer[],
  substitutions: FRMFSubstitution[],
  teamSide: 'home' | 'away'
): FRMFPlayer[] {
  const teamSubs = substitutions.filter(s => s.team === teamSide);
  if (teamSubs.length === 0) return players;

  const incomingJerseys = new Set(teamSubs.map(s => s.jerseyIn).filter(n => n > 0));
  const incomingNames = teamSubs
    .map(s => s.playerInName || '')
    .filter(n => n.trim().length > 0);

  return players.map(p => {
    const matchesIn =
      (p.jerseyNumber > 0 && incomingJerseys.has(p.jerseyNumber)) ||
      incomingNames.some(nm => matchPlayerName(nm, p.name));
    if (matchesIn && p.type !== 'R') {
      return { ...p, type: 'R' };
    }
    return p;
  });
}

/**
 * Règle stricte « Un seul gardien dans son poste » :
 * - Un seul gardien (G) titulaire est positionné en tête des titulaires (slot 0 / GK).
 * - Un éventuel 2e gardien (G) marqué remplaçant reste sur le banc ('R').
 * - Si deux titulaires portent par erreur isGoalkeeper=true, seul le premier garde son statut titulaire GK.
 */
export function enforceSingleGoalkeeperRule(players: FRMFPlayer[]): FRMFPlayer[] {
  const starters = players.filter(p => p.type === 'T');
  const bench = players.filter(p => p.type === 'R');

  let gkAssigned = false;
  let startingGkIndex = starters.findIndex(p => p.isGoalkeeper && p.jerseyNumber === 1);
  if (startingGkIndex === -1) {
    startingGkIndex = starters.findIndex(p => p.isGoalkeeper);
  }

  const normalizedStarters: FRMFPlayer[] = [];
  const otherStarters: FRMFPlayer[] = [];

  starters.forEach((p, idx) => {
    if (idx === startingGkIndex) {
      gkAssigned = true;
      normalizedStarters.unshift({ ...p, isGoalkeeper: true });
    } else if (p.isGoalkeeper && gkAssigned) {
      // Ne jamais conserver deux gardiens titulaires simultanés dans le poste GK
      otherStarters.push({ ...p, isGoalkeeper: false });
    } else {
      otherStarters.push(p);
    }
  });

  return [...normalizedStarters, ...otherStarters, ...bench];
}

/**
 * Enrichit une liste brute de joueurs (calcul licence + surclassement)
 */
export function buildFRMFPlayers(
  rawPlayers: any[],
  category: string,
  season: string,
  isOpponent: boolean
): FRMFPlayer[] {
  return (rawPlayers || []).map((p: any) => {
    const jerseyNumber = Number(p.jerseyNumber) || 0;
    const name = String(p.name || '').trim();
    const license = String(p.license || '').trim().toUpperCase();
    const type = (p.type === 'R' ? 'R' : 'T') as 'T' | 'R';
    const isGoalkeeper = Boolean(p.isGoalkeeper);
    const isCaptain = Boolean(p.isCaptain);

    const parsedLic = parseFRMFLicense(license);
    const birthYear = parsedLic?.birthYear ?? p.birthYear;
    const gender = parsedLic?.gender ?? p.gender;

    let isSurclasse = false;
    let expectedCategory = category;
    let surclasseDiffYears = 0;

    if (birthYear) {
      const surclasseInfo = evaluateSurclassement(birthYear, category, season);
      isSurclasse = surclasseInfo.isSurclasse;
      expectedCategory = surclasseInfo.expectedCategory;
      surclasseDiffYears = surclasseInfo.surclasseDiffYears;
    }

    return {
      jerseyNumber,
      name,
      license,
      type,
      isGoalkeeper,
      isCaptain,
      birthYear,
      gender,
      isSurclasse,
      expectedCategory,
      surclasseDiffYears,
      matchedPlayerId: null,
      isNewOpponent: isOpponent,
    };
  });
}

/**
 * Post-traitement unifié (utilisé par Gemini Vision ET Parser Local) :
 * - Normalise saison (YYYY/YY)
 * - Identifie My Club vs Adversaire & isHomeMatch
 * - Applique la règle Banc de Touche sur les changements
 * - Applique la règle d'un seul gardien dans son poste
 */
export function finalizeParsedMatchSheet(
  draft: {
    competition: string;
    round: string;
    category: string;
    season: string;
    date: string;
    time: string;
    stadium: string;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamAbbreviation?: string;
    awayTeamAbbreviation?: string;
    myClubSideHint?: 'home' | 'away';
    scoreHome: number;
    scoreAway: number;
    homePlayersRaw: any[];
    awayPlayersRaw: any[];
    goals: FRMFGoal[];
    cards: FRMFCard[];
    substitutions: FRMFSubstitution[];
    injuries: FRMFInjury[];
    officials: FRMFOfficial[];
    rawText?: string;
  },
  myClubContext?: FRMFMatchContext
): ParsedMatchSheet {
  const category = (draft.category || 'U16').toUpperCase().trim();
  const season = normalizeSeasonFormat(draft.season);
  const context = myClubContext || buildMyClubContext(null);

  const cleanHomeName = stripCategorySuffix(draft.homeTeamName || 'Équipe Receveuse');
  const cleanAwayName = stripCategorySuffix(draft.awayTeamName || 'Équipe Visiteuse');

  // Déterminer quel côté est My Club
  const homeIsMyClub = isMyClubName(cleanHomeName, context);
  const awayIsMyClub = isMyClubName(cleanAwayName, context);

  let myClubSide: 'home' | 'away' = 'home';
  if (awayIsMyClub && !homeIsMyClub) {
    myClubSide = 'away';
  } else if (homeIsMyClub && !awayIsMyClub) {
    myClubSide = 'home';
  } else if (draft.myClubSideHint === 'away' || draft.myClubSideHint === 'home') {
    myClubSide = draft.myClubSideHint;
  }

  const isHomeMatch = myClubSide === 'home';
  const myClubName = isHomeMatch ? cleanHomeName : cleanAwayName;
  const opponentName = isHomeMatch ? cleanAwayName : cleanHomeName;

  const homeTeamAbbreviation = (
    draft.homeTeamAbbreviation?.trim() ||
    (isHomeMatch ? context.myClubAbbreviation : resolveClubAbbreviation(cleanHomeName))
  ).toUpperCase();
  const awayTeamAbbreviation = (
    draft.awayTeamAbbreviation?.trim() ||
    (!isHomeMatch ? context.myClubAbbreviation : resolveClubAbbreviation(cleanAwayName))
  ).toUpperCase();

  const myClubAbbreviation = isHomeMatch ? homeTeamAbbreviation : awayTeamAbbreviation;
  const opponentAbbreviation = isHomeMatch ? awayTeamAbbreviation : homeTeamAbbreviation;

  // Construire les joueurs Recevant (home) et Visiteur (away)
  let homePlayers = buildFRMFPlayers(draft.homePlayersRaw, category, season, myClubSide !== 'home');
  let awayPlayers = buildFRMFPlayers(draft.awayPlayersRaw, category, season, myClubSide !== 'away');

  // Appliquer la règle Banc de Touche pour tout joueur entrant dans les changements
  homePlayers = enforceSubstitutionBenchRule(homePlayers, draft.substitutions, 'home');
  awayPlayers = enforceSubstitutionBenchRule(awayPlayers, draft.substitutions, 'away');

  // Appliquer la règle d'un seul gardien dans son poste (slot 0)
  homePlayers = enforceSingleGoalkeeperRule(homePlayers);
  awayPlayers = enforceSingleGoalkeeperRule(awayPlayers);

  // Enrichir les noms des changements si absents
  const enrichPlayerName = (team: 'home' | 'away', jersey: number, fallback?: string) => {
    if (fallback && fallback.trim()) return fallback.trim();
    const list = team === 'home' ? homePlayers : awayPlayers;
    return list.find(p => p.jerseyNumber === jersey)?.name || `#${jersey}`;
  };

  const substitutions = (draft.substitutions || []).map(s => ({
    ...s,
    playerOutName: enrichPlayerName(s.team, s.jerseyOut, s.playerOutName),
    playerInName: enrichPlayerName(s.team, s.jerseyIn, s.playerInName),
  }));

  // Score cohérent avec les buts si l'OCR a renvoyé 0-0 malgré des buts listés
  let scoreHome = Number(draft.scoreHome ?? 0);
  let scoreAway = Number(draft.scoreAway ?? 0);
  const homeGoalsCount = (draft.goals || []).filter(g => {
    const isCsc = /csc|contre/i.test(g.type || '');
    return isCsc ? g.team === 'away' : g.team === 'home';
  }).length;
  const awayGoalsCount = (draft.goals || []).filter(g => {
    const isCsc = /csc|contre/i.test(g.type || '');
    return isCsc ? g.team === 'home' : g.team === 'away';
  }).length;

  if (scoreHome === 0 && homeGoalsCount > 0) scoreHome = homeGoalsCount;
  if (scoreAway === 0 && awayGoalsCount > 0) scoreAway = awayGoalsCount;

  const myClubPlayers = isHomeMatch ? homePlayers : awayPlayers;
  const opponentPlayers = isHomeMatch ? awayPlayers : homePlayers;

  return {
    competition: (draft.competition || 'Championnat Élite').trim(),
    round: (draft.round || 'Journée 1').trim(),
    category,
    season,
    date: (draft.date || new Date().toISOString().split('T')[0]).trim(),
    time: (draft.time || '13:00').trim(),
    stadium: (draft.stadium || '').trim(),
    homeTeamName: cleanHomeName,
    awayTeamName: cleanAwayName,
    homeTeamAbbreviation,
    awayTeamAbbreviation,
    myClubSide,
    isHomeMatch,
    myClubName,
    myClubAbbreviation,
    opponentName,
    opponentAbbreviation,
    scoreHome,
    scoreAway,
    homePlayers,
    awayPlayers,
    goals: draft.goals || [],
    cards: draft.cards || [],
    substitutions,
    injuries: draft.injuries || [],
    officials: draft.officials || [],
    surclassementsDetected: {
      myClub: myClubPlayers.filter(p => p.isSurclasse),
      opponent: opponentPlayers.filter(p => p.isSurclasse),
    },
    rawText: draft.rawText,
  };
}

/**
 * Résout à quelle équipe de la feuille ('home' ou 'away') appartient un joueur mentionné dans un fait de jeu
 */
export function resolvePlayerTeam(
  jerseyNumber: number,
  playerName: string,
  homePlayers: FRMFPlayer[],
  awayPlayers: FRMFPlayer[]
): { team: 'home' | 'away'; matchedPlayer: FRMFPlayer | null } {
  const homeByName = homePlayers.find(p => matchPlayerName(playerName, p.name));
  if (homeByName) return { team: 'home', matchedPlayer: homeByName };

  const awayByName = awayPlayers.find(p => matchPlayerName(playerName, p.name));
  if (awayByName) return { team: 'away', matchedPlayer: awayByName };

  const homeByNum = homePlayers.find(p => p.jerseyNumber === jerseyNumber);
  const awayByNum = awayPlayers.find(p => p.jerseyNumber === jerseyNumber);
  if (homeByNum && !awayByNum) return { team: 'home', matchedPlayer: homeByNum };
  if (awayByNum && !homeByNum) return { team: 'away', matchedPlayer: awayByNum };

  return { team: 'home', matchedPlayer: homeByNum || null };
}

/**
 * Isole une section de texte comprise entre deux expressions régulières
 */
function findSection(text: string, startRegex: RegExp, endRegex?: RegExp): string {
  const matchStart = text.search(startRegex);
  if (matchStart === -1) return '';
  const sub = text.slice(matchStart);
  if (!endRegex) return sub;
  const matchEnd = sub.search(endRegex);
  return matchEnd !== -1 ? sub.slice(0, matchEnd) : sub;
}

/**
 * Parseur local universel et résilient pour feuilles de match officielles FRMF
 */
export function parseFRMFMatchSheetText(
  rawText: string,
  myClubContext?: FRMFMatchContext
): ParsedMatchSheet {
  const fullText = normalizeDocumentText(rawText);
  const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
  const context = myClubContext || buildMyClubContext(null);

  let category = 'U16';
  let season = '2026/27';
  let date = '';
  let time = '';
  let stadium = '';
  let competition = '';
  let round = '';
  let homeTeamName = context.myClubName;
  let awayTeamName = 'Adversaire';
  let homeTeamAbbreviation = '';
  let awayTeamAbbreviation = '';
  let scoreHome = 0;
  let scoreAway = 0;

  const rawHomePlayers: any[] = [];
  const rawAwayPlayers: any[] = [];
  const goals: FRMFGoal[] = [];
  const cards: FRMFCard[] = [];
  const substitutions: FRMFSubstitution[] = [];
  const injuries: FRMFInjury[] = [];
  const officials: FRMFOfficial[] = [];

  // 1. Extraction Métadonnées En-tête
  const scoreTeamCandidates: Array<{ name: string; score: number }> = [];
  const abbrBadgeCandidates: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Stopper l'extraction d'en-tête dès l'arrivée aux listes de joueurs
    if (/Liste\s+des\s+joueurs|Joueurs\s+d['\s]?[ée]quipe/i.test(line)) {
      break;
    }

    // Détection badges d'abréviation (ex: "FUS (U16)", "OCK (U16)")
    const abbrBadgeMatch = line.match(/^([A-Z0-9]{2,6})\s*(?:\(\s*U\d+\s*\))?$/);
    if (abbrBadgeMatch && !/^(U\d+|PRO|SENIOR)$/i.test(abbrBadgeMatch[1])) {
      abbrBadgeCandidates.push(abbrBadgeMatch[1].toUpperCase());
    }

    if (/Saison/i.test(line)) {
      const m =
        line.match(/Saison\s+([0-9]{4}[-/][0-9]{2,4})/i) ||
        lines[i + 1]?.match(/([0-9]{4}[-/][0-9]{2,4})/);
      if (m) season = normalizeSeasonFormat(m[1]);
    }

    if (/Cat[ée]gorie/i.test(line)) {
      const m =
        line.match(/Cat[ée]gorie\s+(U\d+|SENIOR|PRO)/i) ||
        lines[i + 1]?.match(/(U\d+|SENIOR|PRO)/i);
      if (m) category = m[1].toUpperCase();
    }

    if (/Date/i.test(line)) {
      const m =
        line.match(/Date\s+([0-9]{4}-[0-9]{2}-[0-9]{2})/i) ||
        lines[i + 1]?.match(/([0-9]{4}-[0-9]{2}-[0-9]{2})/);
      if (m) date = m[1];
    }

    if (/Heure/i.test(line)) {
      const m =
        line.match(/Heure\s+([0-9]{1,2}:[0-9]{2})/i) ||
        lines[i + 1]?.match(/([0-9]{1,2}:[0-9]{2})/);
      if (m) time = m[1];
    }

    if (/Terrain/i.test(line)) {
      const m = line.match(/Terrain\s+(.+)/i);
      if (m) {
        stadium = m[1].trim();
        if (lines[i + 1] && !lines[i + 1].includes('Championnat') && !lines[i + 1].includes('Date')) {
          stadium += ' ' + lines[i + 1].trim();
        }
      }
    }

    if (/Championnat/i.test(line)) {
      competition = line.replace(/–/g, '-').trim();
    }

    if (/Journ[ée]e/i.test(line)) {
      const m = line.match(/Journ[ée]e\s*(\d+)/i);
      if (m) round = `Journée ${m[1]}`;
    }

    // Détection des 2 lignes d'équipe + score dans l'en-tête (ex: "Olympique Club Khouribga 1" ou "Olympique Club Khouribga" suivi de "1")
    const teamScoreMatch = line.match(/^([A-Za-zÀ-ÿ0-9\s\.\-\'()]{3,}?)\s+(\d{1,2})\s*$/);
    if (
      teamScoreMatch &&
      !/^(Saison|Cat[ée]gorie|Date|Heure|Terrain|Championnat|Journ[ée]e|N°)/i.test(line) &&
      !/^\d/.test(line) &&
      parseInt(teamScoreMatch[2], 10) <= 20
    ) {
      scoreTeamCandidates.push({
        name: stripCategorySuffix(teamScoreMatch[1]),
        score: parseInt(teamScoreMatch[2], 10),
      });
    } else if (
      !/^(Saison|Cat[ée]gorie|Date|Heure|Terrain|Championnat|Journ[ée]e|N°|Liste|Compositions|F[ée]d[ée]ration|Feuille)/i.test(line) &&
      /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\s\.\-\'()]{2,}$/.test(line) &&
      lines[i + 1] &&
      /^\d{1,2}$/.test(lines[i + 1]) &&
      parseInt(lines[i + 1], 10) <= 20
    ) {
      scoreTeamCandidates.push({
        name: stripCategorySuffix(line),
        score: parseInt(lines[i + 1], 10),
      });
    }
  }

  if (scoreTeamCandidates.length >= 2) {
    homeTeamName = scoreTeamCandidates[0].name;
    scoreHome = scoreTeamCandidates[0].score;
    awayTeamName = scoreTeamCandidates[1].name;
    scoreAway = scoreTeamCandidates[1].score;
  }

  if (abbrBadgeCandidates.length >= 2) {
    const homeCanon = resolveCanonicalClubKey(homeTeamName) || resolveClubAbbreviation(homeTeamName);
    const awayCanon = resolveCanonicalClubKey(awayTeamName) || resolveClubAbbreviation(awayTeamName);
    if (abbrBadgeCandidates.includes(homeCanon)) homeTeamAbbreviation = homeCanon;
    else homeTeamAbbreviation = abbrBadgeCandidates[0];
    if (abbrBadgeCandidates.includes(awayCanon)) awayTeamAbbreviation = awayCanon;
    else awayTeamAbbreviation = abbrBadgeCandidates[1];
  }

  // 2. Extraction des Joueurs (Recevante & Visiteuse)
  const playerLineRegex = /^\s*(\d{1,2})\s+([A-Za-zÀ-ÿ\s\-\'\(\)]+?)\s+(\d{5,7}[MF]\d{2})\s+([TR])\s*$/i;
  let currentSection: 'recevante' | 'visiteuse' | 'none' = 'none';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/Joueurs\s+d['\s]?équipe\s+recevante/i.test(line)) {
      currentSection = 'recevante';
      continue;
    } else if (/Joueurs\s+d['\s]?équipe\s+visiteuse/i.test(line)) {
      currentSection = 'visiteuse';
      continue;
    } else if (/Liste\s+des\s+officiels/i.test(line) || /Changements/i.test(line) || /\bButs\b/i.test(line)) {
      currentSection = 'none';
    }

    let m = line.match(playerLineRegex);

    // Multiligne fallback
    if (!m && /^\d{1,2}$/.test(line) && lines[i + 1] && lines[i + 2]) {
      const composite = `${line} ${lines[i + 1]} ${lines[i + 2]} ${lines[i + 3] || ''}`;
      m = composite.match(playerLineRegex);
      if (m) i += 2;
    }

    if (m && currentSection !== 'none') {
      const jerseyNumber = parseInt(m[1], 10);
      const rawName = m[2].trim();
      const license = m[3].trim().toUpperCase();
      const type = m[4].toUpperCase() as 'T' | 'R';
      const isGoalkeeper = /\(G\)/i.test(rawName);
      const isCaptain = /\(C\)/i.test(rawName);
      const cleanName = rawName.replace(/\([GC]\)/gi, '').trim();

      const rawPlayer = {
        jerseyNumber,
        name: cleanName,
        license,
        type,
        isGoalkeeper,
        isCaptain,
      };

      if (currentSection === 'recevante') {
        rawHomePlayers.push(rawPlayer);
      } else {
        rawAwayPlayers.push(rawPlayer);
      }
    }
  }

  // Pré-construire les deux effectifs pour la résolution des événements
  const tempHome = buildFRMFPlayers(rawHomePlayers, category, season, false);
  const tempAway = buildFRMFPlayers(rawAwayPlayers, category, season, false);

  // 3. Extraction de la Section des BUTS
  const butsSection = findSection(
    fullText,
    /\bButs\b/i,
    /Joueurs(?:\s+ou\s+officiels)?(?:\s+d['\s]équipes?)?\s+avertis|Changements|Remplacements|Les\s+officiels/i
  );

  const goalRegex = /(\d{1,2})\s+([A-Za-zÀ-ÿ\s\-\']+?)(?:\s+(R[ée]gulier|Penalty|CSC|Contre\s+son\s+camp|Normal))?\s+(\d{1,3})['’]?/gi;
  let goalMatch;
  const targetButsText = butsSection.length > 10 ? butsSection : '';

  while ((goalMatch = goalRegex.exec(targetButsText)) !== null) {
    const jerseyNumber = parseInt(goalMatch[1], 10);
    const rawPlayerName = goalMatch[2].trim();
    const type = goalMatch[3] || 'Régulier';
    const minute = parseInt(goalMatch[4], 10);

    if (rawPlayerName.length < 2 || /^(Joueur|Type|Minute|Nom)$/i.test(rawPlayerName)) {
      continue;
    }

    const resolution = resolvePlayerTeam(jerseyNumber, rawPlayerName, tempHome, tempAway);
    goals.push({
      team: resolution.team,
      jerseyNumber,
      playerName: resolution.matchedPlayer ? resolution.matchedPlayer.name : rawPlayerName,
      type,
      minute,
    });
  }

  // 4. Extraction des CARTONS JAUNES (Avertissements)
  const avertisSection = findSection(
    fullText,
    /Joueurs(?:\s+ou\s+officiels)?(?:\s+d['\s]équipes?)?\s+avertis/i,
    /Joueurs(?:\s+ou\s+officiels)?(?:\s+d['\s]équipes?)?\s+expuls[ée]s/i
  );

  const cardRegex = /(\d{1,2})\s+([A-Za-zÀ-ÿ\s\-\']+?)(?:\s+(Joueur|Entraineur|Staff))?\s+(\d{1,3})['’]?/gi;
  let yellowMatch;
  if (avertisSection.length > 15) {
    while ((yellowMatch = cardRegex.exec(avertisSection)) !== null) {
      const jerseyNumber = parseInt(yellowMatch[1], 10);
      const playerName = yellowMatch[2].trim();
      const role = yellowMatch[3] || 'Joueur';
      const minute = parseInt(yellowMatch[4], 10);

      if (playerName.length < 2 || /^(Joueur|Role|Minute|Nom)$/i.test(playerName)) continue;

      const resolution = resolvePlayerTeam(jerseyNumber, playerName, tempHome, tempAway);
      cards.push({
        team: resolution.team,
        cardType: 'yellow',
        jerseyNumber,
        playerName: resolution.matchedPlayer ? resolution.matchedPlayer.name : playerName,
        role,
        minute,
      });
    }
  }

  // 5. Extraction des CARTONS ROUGES (Expulsions)
  const expulsesSection = findSection(
    fullText,
    /Joueurs(?:\s+ou\s+officiels)?(?:\s+d['\s]équipes?)?\s+expuls[ée]s/i,
    /Joueurs\s+bless[ée]s|Les\s+officiels|Changements|Remplacements/i
  );

  let redMatch;
  if (expulsesSection.length > 15) {
    cardRegex.lastIndex = 0;
    while ((redMatch = cardRegex.exec(expulsesSection)) !== null) {
      const jerseyNumber = parseInt(redMatch[1], 10);
      const playerName = redMatch[2].trim();
      const role = redMatch[3] || 'Joueur';
      const minute = parseInt(redMatch[4], 10);

      if (playerName.length < 2 || /^(Joueur|Role|Minute|Nom)$/i.test(playerName)) continue;

      const resolution = resolvePlayerTeam(jerseyNumber, playerName, tempHome, tempAway);
      cards.push({
        team: resolution.team,
        cardType: 'red',
        jerseyNumber,
        playerName: resolution.matchedPlayer ? resolution.matchedPlayer.name : playerName,
        role,
        minute,
      });
    }
  }

  // 6. Extraction des BLESSURES
  const blessesSection = findSection(
    fullText,
    /Joueurs\s+bless[ée]s/i,
    /R[ée]serves|Les\s+officiels|Signatures|Changements|Remplacements/i
  );

  const injuryRegex = /(\d{1,2})\s+([A-Za-zÀ-ÿ\s\-\']+?)\s+(\d{1,3})['’]?/gi;
  let injMatch;
  if (blessesSection.length > 15) {
    while ((injMatch = injuryRegex.exec(blessesSection)) !== null) {
      const jerseyNumber = parseInt(injMatch[1], 10);
      const playerName = injMatch[2].trim();
      const minute = parseInt(injMatch[3], 10);

      if (jerseyNumber > 0 && playerName.length > 2 && !/^(Rien|Nom|Minute)$/i.test(playerName)) {
        const resolution = resolvePlayerTeam(jerseyNumber, playerName, tempHome, tempAway);
        injuries.push({
          team: resolution.team,
          jerseyNumber,
          playerName: resolution.matchedPlayer ? resolution.matchedPlayer.name : playerName,
          minute,
        });
      }
    }
  }

  // 7. Extraction des Changements (Recevante & Visiteuse)
  const chgSection = findSection(
    fullText,
    /Changements|Remplacements/i,
    /\bButs\b|Joueurs(?:\s+ou\s+officiels)?(?:\s+d['\s]équipes?)?\s+avertis|Joueurs\s+bless[ée]s|Les\s+officiels|R[ée]serves|Signatures/i
  );
  if (chgSection.length > 10) {
    const chgLines = chgSection.split('\n').map(l => l.trim()).filter(Boolean);
    let subSide: 'home' | 'away' = 'home';

    for (const sLine of chgLines) {
      if (/visiteuse|ext[ée]rieur/i.test(sLine)) {
        subSide = 'away';
        continue;
      }
      if (/recevante|domicile/i.test(sLine)) {
        subSide = 'home';
        continue;
      }
      // Format avec noms ou numéros seuls: "14 Aouchi -> 25 Jad 65'" ou "14 25 65'"
      const numMatch = sLine.match(/^(\d{1,2})\s+(?:([A-Za-zÀ-ÿ\s\-\']+?)\s+)?(?:->|\/|\s)\s*(\d{1,2})\s+(?:([A-Za-zÀ-ÿ\s\-\']+?)\s+)?(\d{1,3})['’]?$/);
      if (numMatch) {
        const jerseyOut = parseInt(numMatch[1], 10);
        const outName = numMatch[2]?.trim();
        const jerseyIn = parseInt(numMatch[3], 10);
        const inName = numMatch[4]?.trim();
        const minute = parseInt(numMatch[5], 10);
        let team = subSide;
        if (outName) {
          team = resolvePlayerTeam(jerseyOut, outName, tempHome, tempAway).team;
        }
        substitutions.push({
          team,
          jerseyOut,
          jerseyIn,
          playerOutName: outName,
          playerInName: inName,
          minute,
        });
      } else {
        const simpleMatch = sLine.match(/(\d{1,2})\s+(\d{1,2})\s+(\d{1,3})['’]?/);
        if (simpleMatch) {
          substitutions.push({
            team: subSide,
            jerseyOut: parseInt(simpleMatch[1], 10),
            jerseyIn: parseInt(simpleMatch[2], 10),
            minute: parseInt(simpleMatch[3], 10),
          });
        }
      }
    }
  }

  return finalizeParsedMatchSheet(
    {
      competition: competition || 'Championnat Élite',
      round: round || 'Journée 1',
      category,
      season,
      date: date || new Date().toISOString().split('T')[0],
      time: time || '13:00',
      stadium: stadium || '',
      homeTeamName,
      awayTeamName,
      homeTeamAbbreviation: homeTeamAbbreviation || undefined,
      awayTeamAbbreviation: awayTeamAbbreviation || undefined,
      scoreHome,
      scoreAway,
      homePlayersRaw: rawHomePlayers,
      awayPlayersRaw: rawAwayPlayers,
      goals,
      cards,
      substitutions,
      injuries,
      officials,
      rawText,
    },
    context
  );
}

/**
 * Extracteur haute fidélité utilisant PDF.js avec tri géométrique Y/X
 */
export async function extractTextFromPDFFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    let pdfjs = (window as any).pdfjsLib;

    if (!pdfjs) {
      await new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector('script[src*="pdf.min.js"]');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', (e) => reject(e));
          setTimeout(resolve, 500);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => resolve();
        script.onerror = (e) => reject(e);
        document.head.appendChild(script);
      });
      pdfjs = (window as any).pdfjsLib;
    }

    if (pdfjs) {
      if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      let fullText = '';

      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();

        const items = (textContent.items as any[]).filter(
          item => item.str && item.str.trim().length > 0
        );

        const linesMap = new Map<number, any[]>();
        for (const item of items) {
          const y = Math.round(item.transform[5]);
          let matchedY = y;
          for (const key of linesMap.keys()) {
            if (Math.abs(key - y) <= 4) {
              matchedY = key;
              break;
            }
          }
          if (!linesMap.has(matchedY)) {
            linesMap.set(matchedY, []);
          }
          linesMap.get(matchedY)!.push(item);
        }

        const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);
        for (const y of sortedY) {
          const lineItems = linesMap.get(y)!;
          lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
          const lineText = lineItems.map(it => it.str).join(' ');
          fullText += lineText + '\n';
        }
      }

      if (fullText.trim().length > 50) {
        return fullText;
      }
    }
  } catch (err) {
    console.warn('[PDF Extractor] PDF.js non disponible ou erreur, bascule vers décodeur de secours:', err);
  }

  const uint8 = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder('latin1');
  const rawString = decoder.decode(uint8);

  const textChunks: string[] = [];
  const tjRegex = /\(([^)]+)\)\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(rawString)) !== null) {
    textChunks.push(match[1]);
  }

  const arrayRegex = /\[([^\]]+)\]\s*TJ/g;
  while ((match = arrayRegex.exec(rawString)) !== null) {
    const inner = match[1].replace(/\(([^)]+)\)/g, '$1 ');
    textChunks.push(inner);
  }

  if (textChunks.length > 20) {
    return textChunks.join('\n');
  }

  throw new Error('Impossible d\'extraire automatiquement le texte du document.');
}

/**
 * Normalise une heure ("15:00:00", "15h00", "9:30") au format canonique "HH:MM".
 */
export function normalizeTimeHHMM(raw?: string | null): string {
  if (!raw) return '';
  const cleaned = String(raw).trim().toLowerCase().replace('h', ':');
  const match = cleaned.match(/^(\d{1,2})\s*:\s*(\d{1,2})/);
  if (!match) return '';
  const hh = String(Math.min(23, Math.max(0, parseInt(match[1], 10)))).padStart(2, '0');
  const mm = String(Math.min(59, Math.max(0, parseInt(match[2], 10)))).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Vérifie strictement si un match existant correspond aux 4 critères :
 * Date (`match_date`), Heure (`match_time`), Adversaire (`opponent_id`) et Catégorie (`category`).
 */
export function matchesPlannedCriteria(
  candidate: {
    opponent_id?: string | null;
    match_date?: string | null;
    match_time?: string | null;
    category?: string | null;
  },
  criteria: {
    opponentId: string;
    matchDate: string;
    matchTime?: string | null;
    category: string;
  }
): boolean {
  if (!candidate.opponent_id || candidate.opponent_id !== criteria.opponentId) return false;

  const candDate = (candidate.match_date || '').trim().slice(0, 10);
  const targetDate = (criteria.matchDate || '').trim().slice(0, 10);
  if (!candDate || !targetDate || candDate !== targetDate) return false;

  const candCat = normalizeAgeCategory(candidate.category || '');
  const targetCat = normalizeAgeCategory(criteria.category || '');
  if (!candCat || !targetCat || candCat !== targetCat) return false;

  const candTime = normalizeTimeHHMM(candidate.match_time);
  const targetTime = normalizeTimeHHMM(criteria.matchTime);
  return candTime === targetTime;
}
