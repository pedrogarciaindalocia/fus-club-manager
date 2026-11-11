import { normalizeAgeCategory } from '../constants';
import {
  buildMyClubContext,
  findMatchingOpponentClub,
  isMyClubName,
} from '../features/match-management/utils/frmfMatchSheetParser';
import { supabase } from '../lib/supabase';
import type { Club, League, Match, MyClubSettings, Team } from '../types';
import type { AgeCategory } from '../types/supabase';
import { getClubLogoUrl } from '../utils/clubLogos';
import {
  auditFrmfMyClubMatchesForCalendar,
  findExistingCalendarMatchForFrmf,
  resolveTeamForFrmfMatch,
  type FrmfCalendarAuditResult,
  type FrmfCalendarMissingMatchItem,
  type FrmfCalendarRoundUpdateItem,
} from '../utils/frmfCalendarSyncEngine';
import { getMyClubId } from './_helpers';
import { AuditLogger } from './auditLogger';
import { frmfDataService, type FRMFDatabaseStatus } from './frmfDataService';

export interface FrmfCalendarDatabaseAuditResponse extends FrmfCalendarAuditResult {
  dbStatus: FRMFDatabaseStatus;
  errorMessage?: string;
}

export interface FrmfCalendarSyncExecutionResult {
  createdCount: number;
  skippedCount: number;
  createdClubsCount: number;
  createdMatchIds: string[];
  errors: string[];
}

export interface FrmfCalendarRoundSyncExecutionResult {
  updatedCount: number;
  skippedCount: number;
  updatedMatchIds: string[];
  errors: string[];
}

function isColumnMissingError(error: { code?: unknown; message?: unknown } | null | undefined): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return code === '42703' || code === 'PGRST204' || msg.includes('column');
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message?: unknown }).message || 'Erreur inconnue');
  }
  return 'Erreur inconnue';
}

export const frmfCalendarSyncService = {
  /**
   * Charge les données fraîches depuis Supabase (`frmf_matches`, `matches`, `clubs`, `teams`, `leagues`)
   * et audite les matchs joués de My Club absents du Calendrier.
   */
  async auditFromDatabase(options?: {
    mainClub?: MyClubSettings | null;
    opponentClubs?: Club[];
    calendarMatches?: Match[];
    leagues?: League[];
    teams?: Team[];
    canManageCategory?: (category: string | null | undefined) => boolean;
    forceFreshCalendar?: boolean;
  }): Promise<FrmfCalendarDatabaseAuditResponse> {
    const clubId = await getMyClubId();
    const frmfRes = await frmfDataService.loadFromDatabase();

    let calendarMatches = options?.calendarMatches;
    let opponentClubs = options?.opponentClubs;
    let teams = options?.teams;
    let leagues = options?.leagues;
    let mainClub = options?.mainClub || null;

    if (options?.forceFreshCalendar || !calendarMatches || !opponentClubs || !teams || !leagues || !mainClub) {
      const [matchesRes, clubsRes, teamsRes, leaguesRes, mainClubRes] = await Promise.all([
        options?.forceFreshCalendar || !calendarMatches
          ? supabase.from('matches').select('*').eq('club_id', clubId)
          : Promise.resolve({ data: calendarMatches, error: null }),
        options?.forceFreshCalendar || !opponentClubs
          ? supabase.from('clubs').select('*').neq('id', clubId).order('name', { ascending: true })
          : Promise.resolve({ data: opponentClubs, error: null }),
        options?.forceFreshCalendar || !teams
          ? supabase.from('teams').select('*').eq('club_id', clubId).order('name', { ascending: true })
          : Promise.resolve({ data: teams, error: null }),
        options?.forceFreshCalendar || !leagues
          ? supabase.from('leagues').select('*').eq('club_id', clubId).order('name', { ascending: true })
          : Promise.resolve({ data: leagues, error: null }),
        !mainClub
          ? supabase.from('clubs').select('*').eq('id', clubId).maybeSingle()
          : Promise.resolve({ data: mainClub, error: null }),
      ]);

      if (!matchesRes.error && Array.isArray(matchesRes.data)) {
        calendarMatches = matchesRes.data as Match[];
      }
      if (!clubsRes.error && Array.isArray(clubsRes.data)) {
        opponentClubs = clubsRes.data as Club[];
      }
      if (!teamsRes.error && Array.isArray(teamsRes.data)) {
        teams = teamsRes.data as Team[];
      }
      if (!leaguesRes.error && Array.isArray(leaguesRes.data)) {
        leagues = leaguesRes.data as League[];
      }
      if (!mainClub && mainClubRes?.data) {
        mainClub = mainClubRes.data as MyClubSettings;
      }
    }

    const myClubCtx = buildMyClubContext(mainClub);
    const filteredOpponents = (opponentClubs || []).filter(
      (c) => c.id !== clubId && !isMyClubName(c.name || '', myClubCtx)
    );

    const audit = auditFrmfMyClubMatchesForCalendar({
      frmfDataset: frmfRes.dataset,
      calendarMatches: calendarMatches || [],
      mainClub,
      opponentClubs: filteredOpponents,
      teams: teams || [],
      leagues: leagues || [],
      canManageCategory: options?.canManageCategory,
    });

    return {
      ...audit,
      dbStatus: frmfRes.dbStatus,
      errorMessage: frmfRes.errorMessage,
    };
  },

  /**
   * Enregistre dans `public.matches` les matchs joués de My Club manquants sélectionnés.
   * Re-vérifie l'unicité avant chaque insertion pour garantir zéro doublon et zéro écrasement.
   */
  async syncMissingMatchesToCalendar(
    items: FrmfCalendarMissingMatchItem[],
    options?: { mainClub?: MyClubSettings | null }
  ): Promise<FrmfCalendarSyncExecutionResult> {
    if (!items.length) {
      return {
        createdCount: 0,
        skippedCount: 0,
        createdClubsCount: 0,
        createdMatchIds: [],
        errors: [],
      };
    }

    const clubId = await getMyClubId();
    const [matchesRes, clubsRes, teamsRes, mainClubRes] = await Promise.all([
      supabase.from('matches').select('*').eq('club_id', clubId),
      supabase.from('clubs').select('*').neq('id', clubId).order('name', { ascending: true }),
      supabase.from('teams').select('*').eq('club_id', clubId).order('name', { ascending: true }),
      options?.mainClub
        ? Promise.resolve({ data: options.mainClub, error: null })
        : supabase.from('clubs').select('*').eq('id', clubId).maybeSingle(),
    ]);

    const mainClub = (options?.mainClub || mainClubRes?.data || null) as MyClubSettings | null;
    const myClubCtx = buildMyClubContext(mainClub);

    const liveMatches: Match[] = Array.isArray(matchesRes.data) ? (matchesRes.data as Match[]) : [];
    const liveOpponents: Club[] = (Array.isArray(clubsRes.data) ? (clubsRes.data as Club[]) : []).filter(
      (c) => c.id !== clubId && !isMyClubName(c.name || '', myClubCtx)
    );
    const liveTeams: Team[] = Array.isArray(teamsRes.data) ? (teamsRes.data as Team[]) : [];

    const clubById = new Map<string, Club>();
    liveOpponents.forEach((c) => {
      if (c?.id) clubById.set(c.id, c);
    });
    const preferredClubIds = new Set<string>(liveMatches.map((m) => m.opponent_id).filter(Boolean));
    const matchesHasRoundNameCol =
      liveMatches.length > 0 && Object.prototype.hasOwnProperty.call(liveMatches[0], 'round_name');

    let createdCount = 0;
    let skippedCount = 0;
    let createdClubsCount = 0;
    const createdMatchIds: string[] = [];
    const errors: string[] = [];

    for (const item of items) {
      try {
        // 1. Résoudre le club adversaire depuis la liste la plus fraîche
        let opponentClub =
          (item.matchedOpponentClub?.id ? clubById.get(item.matchedOpponentClub.id) : null) ||
          findMatchingOpponentClub(
            item.opponentRawName,
            liveOpponents,
            preferredClubIds,
            item.opponentAbbreviation
          );

        // 2. Re-vérifier l'unicité dans les matchs en base juste avant insertion
        const existingCheck = findExistingCalendarMatchForFrmf({
          frmfMatch: item.frmfMatch,
          normCategory: item.category,
          matchDay: item.matchDay,
          normSeason: item.season,
          isHome: item.isHome,
          opponentRawName: item.opponentRawName,
          opponentAbbr: item.opponentAbbreviation,
          matchedOpponentClub: opponentClub || null,
          resolvedLeagueId: item.resolvedLeagueId,
          calendarMatches: liveMatches,
          clubById,
          mainClubId: clubId,
        });

        if (existingCheck) {
          skippedCount++;
          continue;
        }

        // 3. Créer le club adversaire s'il n'existe pas encore dans `public.clubs`
        if (!opponentClub) {
          const cleanOppName = (item.opponentAbbreviation || item.opponentRawName).trim();
          const resolvedLogo = getClubLogoUrl(item.opponentRawName, liveOpponents, mainClub);
          const clubPayload: {
            name: string;
            country: string;
            is_active: boolean;
            logo_url?: string;
          } = {
            name: cleanOppName,
            country: 'Maroc',
            is_active: true,
          };
          if (resolvedLogo && !resolvedLogo.includes('ui-avatars.com')) {
            clubPayload.logo_url = resolvedLogo;
          }

          const { data: createdClub, error: clubErr } = await supabase
            .from('clubs')
            .insert([clubPayload])
            .select()
            .single();

          if (clubErr || !createdClub) {
            throw new Error(
              `Impossible de créer le club adversaire "${cleanOppName}" : ${clubErr?.message || 'erreur inconnue'}`
            );
          }

          opponentClub = createdClub as Club;
          liveOpponents.push(opponentClub);
          clubById.set(opponentClub.id, opponentClub);
          createdClubsCount++;
        }

        // 4. Résoudre (ou créer/replier) l'équipe My Club de la catégorie
        let targetTeam = resolveTeamForFrmfMatch(liveTeams, item.category);
        if (!targetTeam) {
          const normCat = normalizeAgeCategory(item.category);
          const { data: createdTeam, error: teamErr } = await supabase
            .from('teams')
            .insert([
              {
                club_id: clubId,
                name: normCat,
                category: normCat as AgeCategory,
                is_active: true,
              },
            ])
            .select()
            .single();

          if (!teamErr && createdTeam) {
            targetTeam = createdTeam as Team;
            liveTeams.push(targetTeam);
          } else {
            targetTeam = liveTeams.find((t) => t.is_active !== false) || liveTeams[0] || null;
          }
        }

        if (!targetTeam?.id) {
          throw new Error(
            `Aucune équipe My Club trouvée pour la catégorie ${item.category}. Créez d'abord une équipe dans Effectif.`
          );
        }

        // 5. Insérer le match terminé dans `public.matches`
        const insertPayload: Record<string, unknown> = {
          club_id: clubId,
          team_id: targetTeam.id,
          opponent_id: opponentClub.id,
          league_id: item.resolvedLeagueId || null,
          category: item.category,
          match_date: item.matchDate,
          match_time: item.matchTime,
          is_home: item.isHome,
          score_home: item.scoreHome,
          score_away: item.scoreAway,
          status: 'finished',
          season: item.season,
          match_type: 'league',
          match_format: 11,
          ...(matchesHasRoundNameCol ? { round_name: item.roundName } : {}),
          formation: '4-3-3',
          opponent_formation: '4-3-3',
          lineup: {
            formation: '4-3-3',
            match_type: 'league',
            match_format: 11,
            round_name: item.roundName,
            startingXI: [],
            substitutes: [],
            frmf_sync: {
              source: 'frmf_matches',
              frmf_match_id: item.frmfMatch.id || null,
              match_day: item.matchDay,
              league_group: item.group,
              season: item.season,
              synced_at: new Date().toISOString(),
            },
          },
          notes: `Synchronisé depuis Classement & Résultats FRMF • ${item.roundName} (${item.group})`,
        };

        let insertRes = await supabase
          .from('matches')
          .insert([insertPayload as never])
          .select()
          .single();

        if (insertRes.error && isColumnMissingError(insertRes.error)) {
          const safePayload = { ...insertPayload };
          delete safePayload.season;
          delete safePayload.match_type;
          delete safePayload.match_format;
          delete safePayload.round_name;
          insertRes = await supabase
            .from('matches')
            .insert([safePayload as never])
            .select()
            .single();
        }

        if (insertRes.error || !insertRes.data) {
          throw new Error(insertRes.error?.message || 'Échec insertion match dans le calendrier.');
        }

        const insertedMatch = insertRes.data as Match;
        liveMatches.push(insertedMatch);
        preferredClubIds.add(opponentClub.id);
        createdMatchIds.push(insertedMatch.id);
        createdCount++;
      } catch (err: unknown) {
        const oppLabel = item.opponentAbbreviation || item.opponentRawName;
        errors.push(`${item.category} ${item.roundName} (vs ${oppLabel}) : ${getErrorMessage(err)}`);
      }
    }

    if (createdCount > 0) {
      void AuditLogger.log({
        action: 'CREATE',
        module: 'MATCHES',
        entity_type: 'MATCH_BATCH_SYNC',
        description: `Synchronisation Calendrier My Club depuis FRMF : ${createdCount} match(s) ajouté(s), ${skippedCount} ignoré(s)`,
        metadata: {
          createdCount,
          skippedCount,
          createdClubsCount,
          createdMatchIds,
          source: 'frmf_matches',
        },
      });
    }

    return {
      createdCount,
      skippedCount,
      createdClubsCount,
      createdMatchIds,
      errors,
    };
  },

  /**
   * Synchronise la journée ("Journée X") sur des matchs déjà présents dans `public.matches`
   * sans jamais modifier leurs scores, statuts, compositions ni événements (`match_events`).
   */
  async syncRoundNamesToCalendar(
    items: FrmfCalendarRoundUpdateItem[]
  ): Promise<FrmfCalendarRoundSyncExecutionResult> {
    if (!items.length) {
      return {
        updatedCount: 0,
        skippedCount: 0,
        updatedMatchIds: [],
        errors: [],
      };
    }

    const clubId = await getMyClubId();
    let updatedCount = 0;
    let skippedCount = 0;
    const updatedMatchIds: string[] = [];
    const errors: string[] = [];

    for (const item of items) {
      try {
        const matchId = item.existingCalendarMatch.id;
        const { data: freshRow, error: fetchErr } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .eq('club_id', clubId)
          .maybeSingle();

        if (fetchErr || !freshRow) {
          throw new Error(fetchErr?.message || 'Match calendrier introuvable.');
        }

        const freshRecord = freshRow as Record<string, unknown>;
        const existingLineup =
          freshRecord.lineup && typeof freshRecord.lineup === 'object'
            ? (freshRecord.lineup as Record<string, unknown>)
            : {};
        const existingFrmfSync =
          existingLineup.frmf_sync && typeof existingLineup.frmf_sync === 'object'
            ? (existingLineup.frmf_sync as Record<string, unknown>)
            : {};

        const updatedLineup: Record<string, unknown> = {
          ...existingLineup,
          round_name: item.targetRoundName,
          frmf_sync: {
            ...existingFrmfSync,
            source: existingFrmfSync.source || 'frmf_matches',
            frmf_match_id: item.frmfMatch.id || existingFrmfSync.frmf_match_id || null,
            match_day: item.matchDay,
            league_group: item.group,
            season: item.season,
            round_synced_at: new Date().toISOString(),
          },
        };

        const hasRoundNameCol = Object.prototype.hasOwnProperty.call(freshRecord, 'round_name');
        const updatePayload: Record<string, unknown> = {
          lineup: updatedLineup,
          ...(hasRoundNameCol ? { round_name: item.targetRoundName } : {}),
        };

        let updateRes = await supabase
          .from('matches')
          .update(updatePayload as never)
          .eq('id', matchId)
          .eq('club_id', clubId)
          .select()
          .single();

        if (updateRes.error && isColumnMissingError(updateRes.error) && 'round_name' in updatePayload) {
          updateRes = await supabase
            .from('matches')
            .update({ lineup: updatedLineup } as never)
            .eq('id', matchId)
            .eq('club_id', clubId)
            .select()
            .single();
        }

        if (updateRes.error) {
          throw new Error(updateRes.error.message || 'Échec mise à jour de la journée.');
        }

        updatedMatchIds.push(matchId);
        updatedCount++;
      } catch (err: unknown) {
        const oppLabel = item.opponentAbbreviation || item.opponentRawName;
        if (getErrorMessage(err) === 'Match calendrier introuvable.') {
          skippedCount++;
        }
        errors.push(`${item.category} ${item.targetRoundName} (vs ${oppLabel}) : ${getErrorMessage(err)}`);
      }
    }

    if (updatedCount > 0) {
      void AuditLogger.log({
        action: 'UPDATE',
        module: 'MATCHES',
        entity_type: 'MATCH_BATCH_ROUND_SYNC',
        description: `Synchronisation des journées Calendrier My Club depuis FRMF : ${updatedCount} match(s) mis à jour`,
        metadata: {
          updatedCount,
          skippedCount,
          updatedMatchIds,
          source: 'frmf_matches',
        },
      });
    }

    return {
      updatedCount,
      skippedCount,
      updatedMatchIds,
      errors,
    };
  },
};
