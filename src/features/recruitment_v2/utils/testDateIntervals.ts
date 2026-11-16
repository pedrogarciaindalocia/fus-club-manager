import type { PlayerTest } from '../types/recruitment';

export interface TestDateInterval {
  startDate: string;
  endDate: string;
  dates: string[];
}

const SHORT_MONTHS_FR = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

/**
 * Normalise une chaîne de date au format ISO `YYYY-MM-DD`, ou retourne `null` si invalide.
 */
export function normalizeIsoDate(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function addOneUtcDay(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

function parseIsoParts(isoDate: string): { year: number; month: number; day: number } {
  const [y, m, d] = isoDate.split('-').map(Number);
  return { year: y, month: m, day: d };
}

/**
 * Regroupe une liste de dates ISO en intervalles de jours consécutifs triés chronologiquement.
 */
export function groupConsecutiveTestDateRanges(
  rawDates: Array<string | null | undefined>
): TestDateInterval[] {
  const uniqueDates = Array.from(
    new Set(
      rawDates
        .map(normalizeIsoDate)
        .filter((d): d is string => Boolean(d))
    )
  ).sort((a, b) => a.localeCompare(b));

  if (uniqueDates.length === 0) return [];

  const intervals: TestDateInterval[] = [];
  let current: TestDateInterval = {
    startDate: uniqueDates[0],
    endDate: uniqueDates[0],
    dates: [uniqueDates[0]],
  };

  for (let i = 1; i < uniqueDates.length; i++) {
    const dateStr = uniqueDates[i];
    if (addOneUtcDay(current.endDate) === dateStr) {
      current.endDate = dateStr;
      current.dates.push(dateStr);
    } else {
      intervals.push(current);
      current = {
        startDate: dateStr,
        endDate: dateStr,
        dates: [dateStr],
      };
    }
  }
  intervals.push(current);

  return intervals;
}

/**
 * Formate une date ISO `YYYY-MM-DD` en libellé compact français (ex. `18 nov. 2026`).
 */
export function formatCompactFrenchDate(isoDate: string, includeYear = true): string {
  const normalized = normalizeIsoDate(isoDate);
  if (!normalized) return isoDate;
  const { year, month, day } = parseIsoParts(normalized);
  const monthLabel = SHORT_MONTHS_FR[month - 1] || '';
  return includeYear ? `${day} ${monthLabel} ${year}` : `${day} ${monthLabel}`;
}

/**
 * Formate un intervalle de dates en libellé concis (ex. `18 nov. 2026`, `18 → 21 nov. 2026`, `29 nov. → 2 déc. 2026`).
 */
export function formatTestDateIntervalLabel(interval: TestDateInterval): string {
  if (interval.startDate === interval.endDate) {
    return formatCompactFrenchDate(interval.startDate, true);
  }

  const start = parseIsoParts(interval.startDate);
  const end = parseIsoParts(interval.endDate);

  if (start.year === end.year && start.month === end.month) {
    return `${start.day} → ${end.day} ${SHORT_MONTHS_FR[end.month - 1]} ${end.year}`;
  }

  if (start.year === end.year) {
    return `${formatCompactFrenchDate(interval.startDate, false)} → ${formatCompactFrenchDate(interval.endDate, true)}`;
  }

  return `${formatCompactFrenchDate(interval.startDate, true)} → ${formatCompactFrenchDate(interval.endDate, true)}`;
}

/**
 * Extrait les identifiants uniques de candidats rattachés à une session de test.
 */
export function getTestCandidateIds(test: Pick<PlayerTest, 'candidate_id' | 'candidate_ids'>): string[] {
  return Array.from(
    new Set([
      ...(test.candidate_ids || []),
      ...(test.candidate_id ? [test.candidate_id] : []),
    ].filter(Boolean))
  );
}

/**
 * Retourne les intervalles de dates des sessions de test actives (hors annulées) pour un joueur donné.
 */
export function getCandidateTestIntervals(
  candidateId: string,
  tests: PlayerTest[]
): TestDateInterval[] {
  if (!candidateId || !Array.isArray(tests) || tests.length === 0) return [];

  const candidateDates = tests
    .filter((test) => {
      if (test.status === 'cancelled') return false;
      const ids = getTestCandidateIds(test);
      return ids.includes(candidateId);
    })
    .map((test) => test.test_date);

  return groupConsecutiveTestDateRanges(candidateDates);
}

