import { PLAYER_CATEGORIES, normalizeAgeCategory } from '../constants';
import { type FRMFMatch } from '../services/frmfDataService';
import { getClubLogoUrl } from './clubLogos';

export interface ParsedResultsExtraction {
  detectedCategory?: string;
  detectedDay?: number;
  matches: FRMFMatch[];
}

function parseHtmlDocument(htmlContent: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(htmlContent, 'text/html');
}

function detectCategoryHint(htmlContent: string, pageText: string): string | undefined {
  const urlMatch =
    htmlContent.match(/\/elite\/([a-z0-9]+)/i) ||
    htmlContent.match(/category=([a-z0-9]+)/i);
  if (urlMatch) {
    const normalized = normalizeAgeCategory(urlMatch[1]);
    if ((PLAYER_CATEGORIES as readonly string[]).includes(normalized)) {
      return normalized;
    }
  }
  for (const cat of PLAYER_CATEGORIES) {
    if (new RegExp(`\\b${cat}\\b`, 'i').test(pageText)) {
      return cat;
    }
  }
  return undefined;
}

function extractBestImgSrc(imgEl?: Element | null): string | undefined {
  if (!imgEl) return undefined;
  const srcset = (imgEl.getAttribute('srcset') || '').trim();
  if (srcset) {
    let bestUrl = '';
    let bestWidth = -1;
    srcset.split(',').forEach((entry) => {
      const parts = entry.trim().split(/\s+/);
      const url = parts[0] || '';
      const widthToken = parts[1] || '';
      const w = parseInt(widthToken.replace(/[^\d]/g, ''), 10) || 0;
      if ((url.startsWith('http://') || url.startsWith('https://')) && w >= bestWidth) {
        bestWidth = w;
        bestUrl = url;
      }
    });
    if (bestUrl) return bestUrl;
  }
  const src = (imgEl.getAttribute('src') || '').trim();
  return src || undefined;
}

function resolveLogoSafe(teamName: string, rawSrc?: string | null): string {
  const src = (rawSrc || '').trim();
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  return getClubLogoUrl(teamName);
}

function normalizeDateToken(raw: string): string {
  const slashMatch = raw.match(/(\d{2})[/.\-](\d{2})[/.\-](\d{4})/);
  if (slashMatch) {
    const [, dd, mm, yyyy] = slashMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
  const isoMatch = raw.match(/(\d{4})[/.\-](\d{2})[/.\-](\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  return new Date().toISOString().split('T')[0];
}

function normalizeTimeToken(raw: string): string {
  const m = raw.match(/(\d{1,2})\s*[h:]\s*(\d{2})/i);
  if (!m) return '15:00';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/**
 * Parseur HTML dédié exclusivement aux RÉSULTATS / PROGRAMME par journée.
 * Extrait uniquement les matchs pour la catégorie, le groupe et la journée cibles ;
 * le classement est ensuite recalculé automatiquement depuis ces résultats.
 */
export function parseFRMFResultsHtml(
  htmlContent: string,
  targetCategory: string,
  targetGroup: string,
  targetMatchDay: number
): ParsedResultsExtraction {
  const doc = parseHtmlDocument(htmlContent);
  const pageText = doc.body?.textContent || '';
  const detectedCategory = detectCategoryHint(htmlContent, pageText);

  let detectedDay: number | undefined;
  const selectedDayOption = doc.querySelector(
    'select[name*="journee"] option[selected], select[name*="round"] option[selected], select[name*="day"] option[selected]'
  );
  if (selectedDayOption) {
    const parsed = parseInt((selectedDayOption.textContent || '').replace(/[^\d]/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) detectedDay = parsed;
  }
  if (!detectedDay) {
    const dayHeading = pageText.match(/journ[ée]e\s*[:#n°]?\s*(\d{1,2})/i);
    if (dayHeading) {
      const parsed = parseInt(dayHeading[1], 10);
      if (!isNaN(parsed) && parsed > 0) detectedDay = parsed;
    }
  }

  const effectiveDay = targetMatchDay > 0 ? targetMatchDay : detectedDay || 1;
  const matches: FRMFMatch[] = [];
  const seenMatchKeys = new Set<string>();

  const pushMatch = (
    homeTeamRaw: string,
    awayTeamRaw: string,
    scoreHome: number | null,
    scoreAway: number | null,
    contextText: string,
    homeLogo?: string | null,
    awayLogo?: string | null
  ) => {
    const homeTeam = homeTeamRaw.replace(/\s+/g, ' ').trim();
    const awayTeam = awayTeamRaw.replace(/\s+/g, ' ').trim();
    if (!homeTeam || !awayTeam || homeTeam.length < 2 || awayTeam.length < 2) return;
    if (homeTeam.toUpperCase() === awayTeam.toUpperCase()) return;

    const key = `${homeTeam.toUpperCase()}__${awayTeam.toUpperCase()}`;
    if (seenMatchKeys.has(key)) return;
    seenMatchKeys.add(key);

    const dateMatch =
      contextText.match(/(\d{2}[/.\-]\d{2}[/.\-]\d{4})/) ||
      contextText.match(/(\d{4}[/.\-]\d{2}[/.\-]\d{2})/);
    const timeMatch = contextText.match(/\b(\d{1,2}\s*[h:]\s*\d{2})\b/i);

    let status: FRMFMatch['status'] = scoreHome !== null && scoreAway !== null ? 'finished' : 'scheduled';
    if (/report[ée]/i.test(contextText)) status = 'postponed';
    else if (/annul[ée]/i.test(contextText)) status = 'cancelled';

    matches.push({
      category: targetCategory,
      group: targetGroup,
      match_day: effectiveDay,
      home_team: homeTeam,
      away_team: awayTeam,
      score_home: status === 'finished' ? scoreHome : null,
      score_away: status === 'finished' ? scoreAway : null,
      status,
      match_date: dateMatch ? normalizeDateToken(dateMatch[1]) : new Date().toISOString().split('T')[0],
      match_time: timeMatch ? normalizeTimeToken(timeMatch[1]) : '15:00',
      home_team_logo: resolveLogoSafe(homeTeam, homeLogo),
      away_team_logo: resolveLogoSafe(awayTeam, awayLogo),
    });
  };

  const extractScoreSafe = (rawText: string): { scoreHome: number | null; scoreAway: number | null } => {
    // Nettoyer d'abord les dates et heures pour éviter qu'un horaire 15:00 soit pris pour un score 15 - 0
    const cleaned = rawText
      .replace(/\d{2,4}[/.\-]\d{2}[/.\-]\d{2,4}/g, ' ')
      .replace(/\b\d{1,2}\s*[h:]\s*\d{2}\b/gi, ' ');
    const scoreMatch = cleaned.match(/\b(\d{1,2})\s*[-–:]\s*(\d{1,2})\b/);
    if (!scoreMatch) return { scoreHome: null, scoreAway: null };
    return {
      scoreHome: parseInt(scoreMatch[1], 10),
      scoreAway: parseInt(scoreMatch[2], 10),
    };
  };

  // Stratégie A : Blocs/cartes de matchs dédiés
  const cardEls = Array.from(
    doc.querySelectorAll(
      '.match-item, .match-card, .result-row, tr.match-row, .fixture-item, .programme-match, .item-match, .game-row'
    )
  );

  cardEls.forEach((card) => {
    const rawText = (card.textContent || '').replace(/\s+/g, ' ').trim();
    if (!rawText) return;

    const scoreEl = card.querySelector('.score, .match-score, .resultat, .result');
    const scoreSource = scoreEl?.textContent?.trim() || rawText;
    const { scoreHome, scoreAway } = extractScoreSafe(scoreSource);

    const homeEl = card.querySelector('.home-team, .team-home, .club-home, .equipe-domicile');
    const awayEl = card.querySelector('.away-team, .team-away, .club-away, .equipe-exterieur');

    let homeTeam = homeEl?.textContent?.trim() || '';
    let awayTeam = awayEl?.textContent?.trim() || '';

    if (!homeTeam || !awayTeam) {
      const teamEls = Array.from(
        card.querySelectorAll('.team-name, .club-name, .equipe, strong, b')
      )
        .map((el) => (el.textContent || '').trim())
        .filter((t) => t.length >= 2 && !/^\d{1,2}\s*[-:]\s*\d{1,2}$/.test(t) && !/^vs$/i.test(t));
      if (teamEls.length >= 2) {
        homeTeam = homeTeam || teamEls[0];
        awayTeam = awayTeam || teamEls[teamEls.length - 1];
      }
    }

    if (!homeTeam || !awayTeam) {
      const stripped = rawText
        .replace(/\d{2,4}[/.\-]\d{2}[/.\-]\d{2,4}/g, ' ')
        .replace(/\b\d{1,2}\s*[h:]\s*\d{2}\b/gi, ' ');
      const splitTokens = stripped.split(/\b\d{1,2}\s*[-–:]\s*\d{1,2}\b|\bvs\b/i);
      if (splitTokens.length >= 2) {
        homeTeam = homeTeam || splitTokens[0].trim();
        awayTeam = awayTeam || splitTokens[1].trim();
      }
    }

    const imgs = Array.from(card.querySelectorAll('img'));
    const homeLogo = extractBestImgSrc(imgs[0]);
    const awayLogo = imgs.length > 1 ? extractBestImgSrc(imgs[imgs.length - 1]) : undefined;

    if (homeTeam && awayTeam) {
      pushMatch(homeTeam, awayTeam, scoreHome, scoreAway, rawText, homeLogo, awayLogo);
    }
  });

  // Stratégie B : Tableaux HTML (colonnes dédiées `.first-team` / `.scr` / `.sec-team` et tableaux génériques)
  if (matches.length === 0) {
    const tables = Array.from(doc.querySelectorAll('table'));
    tables.forEach((table) => {
      const tableText = (table.textContent || '').toLowerCase();
      // Ignorer explicitement d'éventuelles tables de classement
      if (tableText.includes('pts') && (tableText.includes('jo') || tableText.includes('diff'))) {
        return;
      }
      const rows = Array.from(table.querySelectorAll('tbody tr, tr'));
      rows.forEach((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 3) return;

        const rawRowText = (row.textContent || '').replace(/\s+/g, ' ').trim();
        const imgs = Array.from(row.querySelectorAll('img'));
        const homeLogo = extractBestImgSrc(imgs[0]);
        const awayLogo = imgs.length > 1 ? extractBestImgSrc(imgs[imgs.length - 1]) : undefined;

        // B1 : Format tableau à cellules score séparées (ex: <td class="first-team">USAT</td><td class="td-logo">...</td><td class="scr">2</td><td class="scr">1</td><td class="td-logo">...</td><td class="sec-team">WAC</td>)
        const firstTeamEl = row.querySelector('.first-team, .home-team, .team-home, .club-home');
        const secTeamEl = row.querySelector('.sec-team, .away-team, .team-away, .club-away');
        const scrEls = Array.from(row.querySelectorAll('.scr, td.score, td.match-score'));

        if (firstTeamEl && secTeamEl) {
          const homeTeam = (firstTeamEl.textContent || '').replace(/\s+/g, ' ').trim();
          const awayTeam = (secTeamEl.textContent || '').replace(/\s+/g, ' ').trim();
          let scoreHome: number | null = null;
          let scoreAway: number | null = null;

          if (scrEls.length >= 2) {
            const hTxt = (scrEls[0].textContent || '').trim();
            const aTxt = (scrEls[1].textContent || '').trim();
            if (/^\d{1,2}$/.test(hTxt) && /^\d{1,2}$/.test(aTxt)) {
              scoreHome = parseInt(hTxt, 10);
              scoreAway = parseInt(aTxt, 10);
            }
          } else if (scrEls.length === 1) {
            const parsed = extractScoreSafe((scrEls[0].textContent || '').trim());
            scoreHome = parsed.scoreHome;
            scoreAway = parsed.scoreAway;
          } else {
            const parsed = extractScoreSafe(rawRowText);
            scoreHome = parsed.scoreHome;
            scoreAway = parsed.scoreAway;
          }

          if (homeTeam && awayTeam) {
            pushMatch(homeTeam, awayTeam, scoreHome, scoreAway, rawRowText, homeLogo, awayLogo);
            return;
          }
        }

        // B2 : Tableaux HTML génériques (score combiné "2 - 1" OU deux cellules numériques isolées "2" et "1")
        const cellTexts = cells.map((c) => (c.textContent || '').replace(/\s+/g, ' ').trim());

        const candidateTeams = cellTexts.filter(
          (t) =>
            t.length >= 2 &&
            !/^\d{1,2}\s*[-–:]\s*\d{1,2}$/.test(t) &&
            !/^\d{2,4}[/.\-]\d{2}[/.\-]\d{2,4}$/.test(t) &&
            !/^\d{1,2}[h:]\d{2}$/i.test(t) &&
            !/^(vs|-|report[ée]|annul[ée]|termin[ée]|programm[ée])$/i.test(t) &&
            !/^-?\d+$/.test(t)
        );
        if (candidateTeams.length < 2) return;

        const combinedScoreCell = cellTexts.find((t) => /^\d{1,2}\s*[-–:]\s*\d{1,2}$/.test(t));
        let { scoreHome, scoreAway } = extractScoreSafe(combinedScoreCell || rawRowText);

        if (scoreHome === null || scoreAway === null) {
          const homeCellIdx = cellTexts.indexOf(candidateTeams[0]);
          const awayCellIdx = cellTexts.indexOf(candidateTeams[1], homeCellIdx + 1);
          const betweenCells =
            homeCellIdx >= 0 && awayCellIdx > homeCellIdx
              ? cellTexts.slice(homeCellIdx + 1, awayCellIdx)
              : cellTexts;
          const singleNumCells = betweenCells.filter((t) => /^\d{1,2}$/.test(t));
          if (singleNumCells.length === 2) {
            scoreHome = parseInt(singleNumCells[0], 10);
            scoreAway = parseInt(singleNumCells[1], 10);
          }
        }

        pushMatch(
          candidateTeams[0],
          candidateTeams[1],
          scoreHome,
          scoreAway,
          rawRowText,
          homeLogo,
          awayLogo
        );
      });
    });
  }

  return {
    detectedCategory,
    detectedDay,
    matches,
  };
}
