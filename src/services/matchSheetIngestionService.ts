import { supabase } from '../lib/supabase';
import { getMyClubId } from './_helpers';
import { clubService } from './clubService';
import { opponentPlayerService } from './opponentPlayerService';
import { playerService } from './playerService';
import {
  buildMyClubContext,
  computeClubAcronym,
  computeSurclassementFromCategory,
  enforceSingleGoalkeeperRule,
  enforceSubstitutionBenchRule,
  evaluateSurclassement,
  findMatchingOpponentClub,
  isMyClubName,
  matchPlayerName,
  matchesPlannedCriteria,
  normalizeName,
  normalizeSeasonFormat,
  normalizeTimeHHMM,
} from '../features/match-management/utils/frmfMatchSheetParser';
import type { ParsedMatchSheet, FRMFMatchContext, FRMFPlayer } from '../features/match-management/types/matchSheetTypes';
import type { Club, League, Player, Team } from '../types';
import type { AgeCategory, MatchEventType } from '../types/supabase';

export interface IngestionResult {
  matchId: string;
  isExistingMatch: boolean;
  isHomeMatch: boolean;
  opponentId: string;
  opponentName: string;
  opponentPlayersCreated: number;
  myClubSurclassementsLogged: number;
  eventsInserted: number;
  substitutionsInserted: number;
  injuriesInserted: number;
}

export interface MatchSheetAuditPreview {
  matchedOpponentClub: Club | null;
  dbOpponentClubs: Club[];
  dbLeagues: League[];
  suggestedOpponentName: string;
  suggestedOpponentShortName: string;
  matchedLeagueId: string | null;
  existingMatchCheck: { exists: boolean; match?: any };
  allMyClubPlayers: Player[];
  teams: Team[];
  unmatchedMyClubCount: number;
  existingOpponentPlayersCount: number;
}

function addDaysIso(dateStr: string, days: number): string {
  const base = new Date(dateStr || new Date().toISOString().slice(0, 10));
  if (Number.isNaN(base.getTime())) {
    const now = new Date();
    now.setDate(now.getDate() + days);
    return now.toISOString().slice(0, 10);
  }
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

/**
 * Résout la catégorie officielle en base d'un joueur My Club
 */
function resolveDbPlayerCategory(player: Player, teams: Team[], season: string): string | null {
  const team = teams.find(t => t.id === player.team_id);
  if (team?.category) return String(team.category).toUpperCase();
  if ((player as any).category) return String((player as any).category).toUpperCase();

  const birthYear =
    (player as any).birth_year ??
    (player.birth_date ? new Date(player.birth_date).getFullYear() : null);

  if (birthYear && !Number.isNaN(birthYear)) {
    return evaluateSurclassement(birthYear, 'PRO', season).expectedCategory;
  }
  return null;
}

export { matchesPlannedCriteria, normalizeTimeHHMM };

export const matchSheetIngestionService = {
  /**
   * Recherche un match déjà planifié en base par Date, Heure, Adversaire et Catégorie.
   */
  async checkExistingPlannedMatch(params: {
    clubId?: string | null;
    opponentId: string;
    matchDate: string;
    matchTime?: string | null;
    category: string;
  }): Promise<{ exists: boolean; match?: any }> {
    const clubId = params.clubId || (await getMyClubId());
    const targetDate = (params.matchDate || '').trim().slice(0, 10);
    if (!clubId || !params.opponentId || !targetDate || !params.category) {
      return { exists: false };
    }

    const { data: candidates, error } = await supabase
      .from('matches')
      .select(
        'id, club_id, team_id, opponent_id, score_home, score_away, status, match_date, match_time, category, is_home, lineup, opponent_lineup, opponent_subs'
      )
      .eq('club_id', clubId)
      .eq('opponent_id', params.opponentId)
      .eq('match_date', targetDate);

    if (error || !candidates || candidates.length === 0) {
      return { exists: false };
    }

    const matched = candidates.find((cand) =>
      matchesPlannedCriteria(cand, {
        opponentId: params.opponentId,
        matchDate: targetDate,
        matchTime: params.matchTime,
        category: params.category,
      })
    );

    return matched ? { exists: true, match: matched } : { exists: false };
  },
  /**
   * Interroge directement Supabase (`public.clubs` + `public.matches`) pour récupérer les clubs adversaires réels
   * en excluant My Club (et ses éventuels doublons de nom) et en priorisant les clubs déjà liés à des matchs.
   */
  async fetchOpponentClubsFromDatabase(
    myClubContext?: FRMFMatchContext,
    fallbackClubs: Club[] = []
  ): Promise<{ clubs: Club[]; preferredClubIds: Set<string> }> {
    const clubId = await getMyClubId();
    const ctx = myClubContext || buildMyClubContext(null);

    const [{ data: rawClubs, error: clubsErr }, { data: matchOpps }] = await Promise.all([
      supabase
        .from('clubs')
        .select('*')
        .neq('id', clubId)
        .order('name', { ascending: true }),
      supabase
        .from('matches')
        .select('opponent_id')
        .eq('club_id', clubId),
    ]);

    const preferredClubIds = new Set<string>(
      (matchOpps || []).map((m: any) => m.opponent_id).filter(Boolean)
    );

    const sourceClubs = !clubsErr && rawClubs ? (rawClubs as Club[]) : fallbackClubs;
    const filteredClubs = sourceClubs.filter(
      c => c.id !== clubId && !isMyClubName(c.name || '', ctx)
    );

    return { clubs: filteredClubs, preferredClubIds };
  },

  /**
   * Sélectionne le meilleur joueur My Club correspondant en cas de doublon homonyme en base
   */
  selectBestMyClubPlayerMatch(
    frmfPlayer: FRMFPlayer,
    candidates: Player[],
    teams: Team[],
    matchCategory: string,
    season: string
  ): Player {
    if (candidates.length === 1) return candidates[0];
    const targetCat = matchCategory.toUpperCase();
    const scored = candidates.map(c => {
      let score = 0;
      const cat = resolveDbPlayerCategory(c, teams, season);
      if (cat === targetCat) score += 50;
      if (frmfPlayer.license && (c as any).license_number === frmfPlayer.license) score += 100;
      if (c.jersey_number === frmfPlayer.jerseyNumber) score += 25;
      if (c.birth_date) score += 10;
      if (c.jersey_number != null && c.jersey_number > 0 && c.jersey_number <= 99) score += 5;
      return { c, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].c;
  },

  /**
   * Prépare l'audit complet après scan SANS aucune écriture automatique en base :
   * - Recherche directe en base Supabase (`public.clubs`) par nom & abréviation (`short_name` / acronyme)
   * - Suggestion de la compétition (`public.leagues`)
   * - Vérification d'existence des joueurs My Club & détection des surclassements depuis la catégorie inférieure
   */
  async prepareMatchSheetAudit(
    parsed: ParsedMatchSheet,
    fallbackOpponentClubs: Club[],
    fallbackLeagues: League[],
    myClubContext?: FRMFMatchContext
  ): Promise<MatchSheetAuditPreview> {
    const clubId = await getMyClubId();
    const normSeason = normalizeSeasonFormat(parsed.season);

    // 1. Requête directe en base pour les clubs adversaires & ligues
    const [{ clubs: dbOpponentClubs, preferredClubIds }, { data: rawLeagues, error: leaguesErr }] =
      await Promise.all([
        this.fetchOpponentClubsFromDatabase(myClubContext, fallbackOpponentClubs),
        supabase
          .from('leagues')
          .select('*')
          .eq('club_id', clubId)
          .order('name', { ascending: true }),
      ]);

    const dbLeagues = !leaguesErr && rawLeagues ? (rawLeagues as League[]) : fallbackLeagues;

    // 2. Recherche du club adversaire par abréviation officielle (prioritaire) puis nom + acronyme
    const matchedOpponentClub = findMatchingOpponentClub(
      parsed.opponentName,
      dbOpponentClubs,
      preferredClubIds,
      parsed.opponentAbbreviation
    );

    // 3. Suggestion de la compétition depuis public.leagues
    const normComp = normalizeName(parsed.competition);
    const matchedLeague =
      dbLeagues.find(l => {
        const lCat = (l.category || '').toUpperCase();
        const lSeason = normalizeSeasonFormat(l.season);
        const lNorm = normalizeName(l.name || '');
        const nameMatch = normComp && lNorm && (lNorm.includes(normComp) || normComp.includes(lNorm));
        const catMatch = !lCat || lCat === parsed.category.toUpperCase();
        return nameMatch && catMatch && lSeason === normSeason;
      }) ||
      dbLeagues.find(l => {
        const lCat = (l.category || '').toUpperCase();
        const lNorm = normalizeName(l.name || '');
        return normComp && lNorm && (lNorm.includes(normComp) || normComp.includes(lNorm)) && (!lCat || lCat === parsed.category.toUpperCase());
      }) ||
      dbLeagues.find(
        l =>
          (l.category || '').toUpperCase() === parsed.category.toUpperCase() &&
          normalizeSeasonFormat(l.season) === normSeason
      ) ||
      (dbLeagues.filter(l => l.is_active !== false && normalizeSeasonFormat(l.season) === normSeason && !l.category).length === 1
        ? dbLeagues.find(l => l.is_active !== false && normalizeSeasonFormat(l.season) === normSeason && !l.category) || null
        : null);

    // 4. Vérification si le match existe déjà dans la base (Date, Heure, Adversaire, Catégorie)
    let existingMatchCheck: { exists: boolean; match?: any } = { exists: false };
    if (matchedOpponentClub) {
      existingMatchCheck = await this.checkExistingPlannedMatch({
        clubId,
        opponentId: matchedOpponentClub.id,
        matchDate: parsed.date,
        matchTime: parsed.time,
        category: parsed.category,
      });
    }

    // 5. Charger l'effectif complet de My Club et ses équipes pour réconciliation + surclassement DB
    const [{ data: dbPlayers }, { data: dbTeams }] = await Promise.all([
      supabase
        .from('players')
        .select('*')
        .eq('club_id', clubId)
        .neq('is_active', false)
        .order('full_name', { ascending: true }),
      supabase
        .from('teams')
        .select('*')
        .eq('club_id', clubId),
    ]);

    const allMyClubPlayers = (dbPlayers || []) as Player[];
    const teams = (dbTeams || []) as Team[];

    // 6. Réconcilier les joueurs My Club SANS ajout automatique et détecter les surclassements DB + Licence
    const myClubRoster = parsed.isHomeMatch ? parsed.homePlayers : parsed.awayPlayers;
    const oppRoster = parsed.isHomeMatch ? parsed.awayPlayers : parsed.homePlayers;

    for (const op of oppRoster) {
      op.matchedPlayerId = null;
      op.matchedPlayerName = null;
      op.matchedPlayerCategory = null;
      op.matchedPlayerTeamId = null;
      op.matchedPlayerJersey = null;
      op.matchResolution = undefined;
      op.isNewOpponent = true;
    }

    for (const mp of myClubRoster) {
      mp.matchedOpponentPlayerId = null;
      mp.isNewOpponent = false;
      const matches = allMyClubPlayers.filter(dbP => {
        if (
          mp.license &&
          (dbP as any).license_number &&
          String((dbP as any).license_number).trim().toUpperCase() === mp.license.trim().toUpperCase()
        ) {
          return true;
        }
        return matchPlayerName(mp.name, dbP.full_name);
      });

      if (matches.length > 0) {
        const bestMatch = this.selectBestMyClubPlayerMatch(
          mp,
          matches,
          teams,
          parsed.category,
          normSeason
        );
        this.bindMatchedMyClubPlayer(mp, bestMatch, teams, parsed.category, normSeason);
      } else {
        mp.matchedPlayerId = null;
        mp.matchedPlayerName = null;
        mp.matchedPlayerCategory = null;
        mp.matchedPlayerTeamId = null;
        mp.matchedPlayerJersey = null;
        mp.matchResolution = undefined;
      }
    }

    parsed.surclassementsDetected.myClub = myClubRoster.filter(p => p.isSurclasse);
    parsed.surclassementsDetected.opponent = oppRoster.filter(p => p.isSurclasse);

    // 7. Vérifier les joueurs adverses existants (pour preview UI)
    let existingOpponentPlayersCount = 0;
    if (matchedOpponentClub) {
      const existingOpps = await opponentPlayerService.getOpponentPlayers(matchedOpponentClub.id);
      for (const op of oppRoster) {
        const foundOpp = existingOpps.find(eo => matchPlayerName(op.name, eo.full_name));
        if (foundOpp) {
          op.matchedOpponentPlayerId = foundOpp.id;
          op.isNewOpponent = false;
          existingOpponentPlayersCount++;
        } else {
          op.matchedOpponentPlayerId = null;
          op.isNewOpponent = true;
        }
      }
    }

    return {
      matchedOpponentClub,
      dbOpponentClubs,
      dbLeagues,
      suggestedOpponentName: parsed.opponentAbbreviation || parsed.opponentName,
      suggestedOpponentShortName: parsed.opponentAbbreviation || computeClubAcronym(parsed.opponentName),
      matchedLeagueId: matchedLeague?.id || null,
      existingMatchCheck,
      allMyClubPlayers,
      teams,
      unmatchedMyClubCount: myClubRoster.filter(p => !p.matchedPlayerId).length,
      existingOpponentPlayersCount,
    };
  },

  /**
   * Lie un joueur FRMF à un joueur My Club existant et calcule le surclassement depuis la catégorie inférieure
   */
  bindMatchedMyClubPlayer(
    frmfPlayer: FRMFPlayer,
    dbPlayer: Player,
    teams: Team[],
    matchCategory: string,
    season: string
  ): FRMFPlayer {
    frmfPlayer.matchedPlayerId = dbPlayer.id;
    frmfPlayer.matchedPlayerName = dbPlayer.full_name;
    frmfPlayer.matchedPlayerTeamId = dbPlayer.team_id || null;
    frmfPlayer.matchedPlayerJersey = dbPlayer.jersey_number ?? null;
    frmfPlayer.matchResolution = frmfPlayer.matchResolution || 'matched';

    const dbCat = resolveDbPlayerCategory(dbPlayer, teams, season);
    frmfPlayer.matchedPlayerCategory = dbCat;

    const dbSurc = computeSurclassementFromCategory(dbCat, matchCategory);
    const licSurc = frmfPlayer.birthYear
      ? evaluateSurclassement(frmfPlayer.birthYear, matchCategory, season)
      : { isSurclasse: false, expectedCategory: matchCategory, surclasseDiffYears: 0 };

    if (dbSurc.isSurclasse) {
      frmfPlayer.isSurclasse = true;
      frmfPlayer.expectedCategory = dbSurc.expectedCategory;
      frmfPlayer.surclasseDiffYears = dbSurc.surclasseDiffYears;
    } else if (licSurc.isSurclasse) {
      frmfPlayer.isSurclasse = true;
      frmfPlayer.expectedCategory = licSurc.expectedCategory;
      frmfPlayer.surclasseDiffYears = licSurc.surclasseDiffYears;
    } else {
      frmfPlayer.isSurclasse = false;
      frmfPlayer.expectedCategory = dbCat || matchCategory;
      frmfPlayer.surclasseDiffYears = 0;
    }

    return frmfPlayer;
  },

  /**
   * Crée un joueur My Club UNIQUEMENT après confirmation explicite de l'utilisateur
   */
  async createConfirmedMyClubPlayer(params: {
    fullName: string;
    jerseyNumber: number;
    category: string;
    isGoalkeeper: boolean;
    birthYear?: number;
    teams: Team[];
    matchCategory: string;
    season: string;
  }): Promise<Player> {
    const targetCat = (params.category || params.matchCategory).toUpperCase().trim();
    const matchedTeam =
      params.teams.find(t => String(t.category || '').toUpperCase() === targetCat) ||
      params.teams.find(t => String(t.category || '').toUpperCase() === params.matchCategory.toUpperCase()) ||
      params.teams[0];

    const payload: Record<string, any> = {
      full_name: params.fullName.trim(),
      team_id: matchedTeam?.id || null,
      jersey_number: params.jerseyNumber > 0 ? params.jerseyNumber : null,
      position: params.isGoalkeeper ? 'Gardien' : null,
      is_active: true,
    };

    if (params.birthYear && params.birthYear > 1950) {
      payload.birth_year = params.birthYear;
    }

    const created = await playerService.addPlayer(payload as any);
    return created;
  },

  /**
   * Crée un club adversaire (avec gestion résiliente de short_name)
   */
  async createOpponentClub(params: {
    name: string;
    short_name?: string;
    city?: string;
  }): Promise<Club> {
    const cleanName = params.name.trim() || 'Club Adversaire';
    const shortName = (params.short_name || computeClubAcronym(cleanName) || cleanName.slice(0, 3)).trim().toUpperCase();

    try {
      return await clubService.addOpponentClub({
        name: cleanName,
        short_name: shortName,
        city: params.city?.trim() || (cleanName.toLowerCase().includes('khouribga') ? 'Khouribga' : null),
        country: 'Maroc',
        is_active: true,
      } as any);
    } catch (err: any) {
      const msg = (err?.message || '') + ' ' + (err?.details || '');
      if (err?.code === '42703' || err?.code === 'PGRST204' || msg.includes('short_name')) {
        return await clubService.addOpponentClub({
          name: cleanName,
          city: params.city?.trim() || null,
          country: 'Maroc',
          is_active: true,
        } as any);
      }
      throw err;
    }
  },

  /**
   * Synchronise l'effectif adverse : met à jour le numéro de maillot et le poste GK si besoin,
   * et crée les joueurs adverses inexistants dans opponent_players
   */
  async syncOpponentPlayers(
    opponentId: string,
    oppPlayers: FRMFPlayer[],
    category: string
  ): Promise<{ idByJersey: Map<number, string>; idByName: Map<string, string>; createdCount: number }> {
    const existing = await opponentPlayerService.getOpponentPlayers(opponentId);
    const idByJersey = new Map<number, string>();
    const idByName = new Map<string, string>();
    let createdCount = 0;

    for (const player of oppPlayers) {
      const found =
        (player.matchedOpponentPlayerId ? existing.find(ep => ep.id === player.matchedOpponentPlayerId) : null) ||
        existing.find(ep => matchPlayerName(player.name, ep.full_name));

      if (found) {
        // Synchroniser le numéro de maillot et le poste GK (uniquement si (G))
        const updates: Record<string, any> = {};
        if (player.jerseyNumber > 0 && found.jersey_number !== player.jerseyNumber) {
          updates.jersey_number = player.jerseyNumber;
        }
        if (player.isGoalkeeper && found.position !== 'GK') {
          updates.position = 'GK';
        }
        if (Object.keys(updates).length > 0) {
          try {
            await opponentPlayerService.updateOpponentPlayer(found.id, updates);
          } catch (err) {
            console.warn(`[matchSheetIngestionService] Erreur MAJ joueur adverse ${player.name}:`, err);
          }
        }
        player.matchedOpponentPlayerId = found.id;
        player.isNewOpponent = false;
        if (player.jerseyNumber > 0) idByJersey.set(player.jerseyNumber, found.id);
        idByName.set(normalizeName(player.name), found.id);
      } else {
        try {
          const inserted = await opponentPlayerService.addOpponentPlayer({
            opponent_id: opponentId,
            full_name: player.name,
            jersey_number: player.jerseyNumber > 0 ? player.jerseyNumber : null,
            category,
            position: player.isGoalkeeper ? 'GK' : null,
            is_active: true,
          } as any);

          if (inserted?.id) {
            player.matchedOpponentPlayerId = inserted.id;
            if (player.jerseyNumber > 0) idByJersey.set(player.jerseyNumber, inserted.id);
            idByName.set(normalizeName(player.name), inserted.id);
            createdCount++;
          }
        } catch (err) {
          console.warn(`[matchSheetIngestionService] Impossible de créer le joueur adverse ${player.name}:`, err);
        }
      }
    }

    return { idByJersey, idByName, createdCount };
  },

  /**
   * Synchronise les numéros de maillot des joueurs My Club confirmés/reconnus
   * (sans écraser le numéro d'origine si le joueur est surclassé dans une catégorie supérieure)
   */
  async syncMyClubPlayerJerseys(myClubPlayers: FRMFPlayer[]): Promise<Record<string, number>> {
    const jerseyOverrides: Record<string, number> = {};

    for (const p of myClubPlayers) {
      if (!p.matchedPlayerId || p.jerseyNumber <= 0) continue;

      if (p.isSurclasse) {
        // Pour un joueur surclassé : conserver son numéro d'origine dans players et stocker le maillot porté
        jerseyOverrides[p.matchedPlayerId] = p.jerseyNumber;
      } else if (p.matchedPlayerJersey !== p.jerseyNumber) {
        try {
          const { error: jerseyErr } = await supabase
            .from('players')
            .update({ jersey_number: p.jerseyNumber })
            .eq('id', p.matchedPlayerId);
          if (jerseyErr) {
            console.warn(`[matchSheetIngestionService] Conflit ou erreur MAJ maillot pour ${p.name}:`, jerseyErr.message);
          }
        } catch (err) {
          console.warn(`[matchSheetIngestionService] Conflit ou erreur MAJ maillot pour ${p.name}:`, err);
        }
      }
    }

    return jerseyOverrides;
  },

  /**
   * Enregistre les surclassements détectés côté My Club dans player_surclassements
   */
  async recordMyClubSurclassements(
    myClubSurclassements: FRMFPlayer[],
    targetCategory: string,
    targetTeamId: string,
    matchId: string,
    matchDate: string
  ): Promise<number> {
    const clubId = await getMyClubId();
    let logged = 0;

    for (const player of myClubSurclassements) {
      if (!player.matchedPlayerId) continue;

      try {
        const { data: existing } = await supabase
          .from('player_surclassements')
          .select('id, notes')
          .eq('player_id', player.matchedPlayerId)
          .eq('target_category', targetCategory)
          .eq('status', 'active');

        const alreadyForMatch = (existing || []).some(row => {
          try {
            const parsedNotes = typeof row.notes === 'string' ? JSON.parse(row.notes) : row.notes;
            return String(parsedNotes?.match_id || '') === String(matchId);
          } catch {
            return String(row.notes || '').includes(matchId);
          }
        });

        if (!alreadyForMatch && (!existing || existing.length === 0)) {
          await supabase.from('player_surclassements').insert([{
            club_id: clubId,
            player_id: player.matchedPlayerId,
            original_team_id: player.matchedPlayerTeamId || targetTeamId,
            target_team_id: targetTeamId,
            original_category: player.expectedCategory || 'U15',
            target_category: targetCategory,
            original_jersey_number: player.matchedPlayerJersey ?? null,
            target_jersey_number: player.jerseyNumber > 0 ? player.jerseyNumber : null,
            status: 'active',
            notes: JSON.stringify({
              match_id: matchId,
              source: 'FRMF',
              label: `Surclassement officiel détecté sur feuille de match FRMF (${player.expectedCategory || 'Inf.'} ↗ ${targetCategory})`,
            }),
            promoted_at: matchDate,
          }]);
          logged++;
        }
      } catch (err) {
        console.warn(`[matchSheetIngestionService] Erreur logging surclassement ${player.name}:`, err);
      }
    }

    return logged;
  },

  /**
   * Traitement complet d'ingestion FRMF :
   * - Respecte strictement My Club vs Adversaire & is_home
   * - Lie la compétition (league_id) et la saison validée (YYYY/YY ex: 2026/27)
   * - N'ajoute JAMAIS automatiquement un joueur My Club absent
   * - Enregistre les adversaires absents avec un seul gardien (G) au poste GK (slot 0)
   * - Synchronise les numéros de maillot et surclassements
   * - Injecte buts, cartons jaunes, cartons rouges, blessures (InjuryService) et changements (banc de touche)
   */
  async ingestParsedMatchSheet(
    parsed: ParsedMatchSheet,
    options?: {
      teamId?: string;
      leagueId?: string | null;
      season?: string;
      opponentClubId?: string | null;
      createOpponentPayload?: { name: string; short_name?: string; city?: string } | null;
    }
  ): Promise<IngestionResult> {
    const clubId = await getMyClubId();
    const season = normalizeSeasonFormat(options?.season || parsed.season);

    // 1. Résoudre le Club Adversaire directement en base Supabase (sans duplication)
    const { clubs: dbOpponents, preferredClubIds } =
      await this.fetchOpponentClubsFromDatabase(undefined, []);
    let opponent: Club | null = null;

    if (options?.opponentClubId) {
      opponent = dbOpponents.find(c => c.id === options.opponentClubId) || null;
    }
    if (!opponent) {
      opponent = findMatchingOpponentClub(
        parsed.opponentName,
        dbOpponents,
        preferredClubIds,
        parsed.opponentAbbreviation
      );
    }
    if (!opponent && options?.createOpponentPayload) {
      opponent = await this.createOpponentClub(options.createOpponentPayload);
    }
    if (!opponent) {
      throw new Error(
        `Le club adversaire "${parsed.opponentName}" n'existe pas encore dans la base. Veuillez confirmer sa création ou l'associer à un club existant.`
      );
    }

    // 2. Séparer My Club et Adversaire selon le côté détecté (Domicile vs Extérieur)
    const rawMyClubSide = parsed.myClubSide;
    const rawOppSide: 'home' | 'away' = rawMyClubSide === 'home' ? 'away' : 'home';

    const rawMyClubPlayers = rawMyClubSide === 'home' ? parsed.homePlayers : parsed.awayPlayers;
    const rawOppPlayers = rawMyClubSide === 'home' ? parsed.awayPlayers : parsed.homePlayers;

    // Appliquer en sécurité les règles Banc de touche + Gardien unique
    const myClubPlayers = enforceSingleGoalkeeperRule(
      enforceSubstitutionBenchRule(rawMyClubPlayers, parsed.substitutions, rawMyClubSide)
    );
    const oppPlayers = enforceSingleGoalkeeperRule(
      enforceSubstitutionBenchRule(rawOppPlayers, parsed.substitutions, rawOppSide)
    );

    // 3. Synchroniser les joueurs adverses (création des absents + MAJ maillot + poste GK unique)
    const {
      idByJersey: oppIdByJersey,
      idByName: oppIdByName,
      createdCount: opponentPlayersCreated,
    } = await this.syncOpponentPlayers(opponent.id, oppPlayers, parsed.category);

    // 4. Synchroniser les numéros de maillot des joueurs My Club (uniquement ceux déjà liés/confirmés)
    const myClubIdByJersey = new Map<number, string>();
    const myClubIdByName = new Map<string, string>();
    myClubPlayers.forEach(p => {
      if (p.matchedPlayerId) {
        if (p.jerseyNumber > 0) myClubIdByJersey.set(p.jerseyNumber, p.matchedPlayerId);
        myClubIdByName.set(normalizeName(p.name), p.matchedPlayerId);
      }
    });
    const jerseyOverrides = await this.syncMyClubPlayerJerseys(myClubPlayers);

    // 5. Résoudre l'équipe My Club de la catégorie du match
    let teamId = options?.teamId;
    if (!teamId) {
      const { data: teams } = await supabase
        .from('teams')
        .select('id, category')
        .eq('club_id', clubId);

      const matchedTeam = teams?.find(t => String(t.category || '').toUpperCase() === parsed.category.toUpperCase());
      teamId = matchedTeam ? matchedTeam.id : (teams?.[0]?.id || clubId);
    }

    // 6. Préparer les compositions (slot 0 = unique gardien titulaire, banc = 'R' incluant entrants)
    const myClubStarters = myClubPlayers
      .filter(p => p.type === 'T' && p.matchedPlayerId)
      .map(p => p.matchedPlayerId as string);

    const myClubSubs = myClubPlayers
      .filter(p => p.type === 'R' && p.matchedPlayerId)
      .map(p => p.matchedPlayerId as string);

    const toOpponentLineupEntry = (p: FRMFPlayer) => ({
      id: p.matchedOpponentPlayerId || `OPP-${p.jerseyNumber || normalizeName(p.name)}`,
      full_name: p.name,
      jersey_number: p.jerseyNumber > 0 ? p.jerseyNumber : null,
      position: p.isGoalkeeper ? 'GK' : null,
    });

    const oppStarters = oppPlayers.filter(p => p.type === 'T').map(toOpponentLineupEntry);
    const oppSubs = oppPlayers.filter(p => p.type === 'R').map(toOpponentLineupEntry);

    const myClubSurclassements = myClubPlayers.filter(p => p.isSurclasse && p.matchedPlayerId);
    const surclassesMeta = myClubSurclassements.map(p => ({
      player_id: p.matchedPlayerId,
      original_category: p.expectedCategory || 'U15',
      target_category: parsed.category,
      original_team_id: p.matchedPlayerTeamId || teamId,
      target_team_id: teamId,
    }));

    // 7. Vérifier si le match est DÉJÀ PLANIFIÉ (Date, Heure, Adversaire, Catégorie)
    const plannedCheck = await this.checkExistingPlannedMatch({
      clubId,
      opponentId: opponent.id,
      matchDate: parsed.date,
      matchTime: parsed.time,
      category: parsed.category,
    });
    const existing = plannedCheck.exists ? plannedCheck.match : null;

    let matchId: string;
    let isExistingMatch = false;

    const matchNotes = `Feuille de match FRMF — ${parsed.competition} (${parsed.round}) | Saison ${season}${parsed.stadium ? ` | Terrain: ${parsed.stadium}` : ''}`;

    if (existing) {
      matchId = existing.id;
      isExistingMatch = true;

      const updatePayload: Record<string, any> = {
        team_id: existing.team_id || teamId,
        is_home: parsed.isHomeMatch,
        league_id: options?.leagueId || null,
        season,
        round_name: parsed.round,
        match_type: options?.leagueId ? 'league' : 'amical',
        score_home: parsed.scoreHome,
        score_away: parsed.scoreAway,
        status: 'finished',
        category: parsed.category as AgeCategory,
        match_date: parsed.date,
        match_time: normalizeTimeHHMM(parsed.time) || parsed.time || undefined,
        location: parsed.stadium || undefined,
        notes: matchNotes,
        lineup: {
          ...((existing.lineup as any) || {}),
          round_name: parsed.round,
          startingXI: myClubStarters.length > 0 ? myClubStarters : ((existing.lineup as any)?.startingXI || []),
          substitutes: myClubSubs.length > 0 ? myClubSubs : ((existing.lineup as any)?.substitutes || []),
          formation: (existing.lineup as any)?.formation || '4-3-3',
          jerseyOverrides,
          surclasses: surclassesMeta,
        },
        opponent_lineup: oppStarters.length > 0 ? oppStarters : (existing.opponent_lineup || []),
        opponent_subs: oppSubs.length > 0 ? oppSubs : ((existing as any).opponent_subs || []),
      };

      const { error: updErr } = await supabase.from('matches').update(updatePayload).eq('id', matchId);
      if (updErr) {
        // Retry sans colonnes optionnelles si certaines migrations ne sont pas encore appliquées
        const safeUpdate = { ...updatePayload };
        delete safeUpdate.season;
        delete safeUpdate.round_name;
        delete safeUpdate.match_type;
        delete safeUpdate.location;
        const { error: retryErr } = await supabase.from('matches').update(safeUpdate).eq('id', matchId);
        if (retryErr) throw retryErr;
      }
    } else {
      const insertPayload: Record<string, any> = {
        club_id: clubId,
        team_id: teamId,
        opponent_id: opponent.id,
        league_id: options?.leagueId || null,
        season,
        round_name: parsed.round,
        match_type: options?.leagueId ? 'league' : 'amical',
        category: parsed.category as AgeCategory,
        match_date: parsed.date,
        match_time: parsed.time,
        location: parsed.stadium || null,
        is_home: parsed.isHomeMatch,
        score_home: parsed.scoreHome,
        score_away: parsed.scoreAway,
        status: 'finished',
        notes: matchNotes,
        opponent_formation: '4-3-3',
        formation: '4-3-3',
        lineup: {
          round_name: parsed.round,
          startingXI: myClubStarters,
          substitutes: myClubSubs,
          formation: '4-3-3',
          jerseyOverrides,
          surclasses: surclassesMeta,
        },
        opponent_lineup: oppStarters,
        opponent_subs: oppSubs,
      };

      let matchRes = await supabase.from('matches').insert([insertPayload]).select().single();
      if (matchRes.error) {
        const safeInsert = { ...insertPayload };
        delete safeInsert.season;
        delete safeInsert.round_name;
        delete safeInsert.match_type;
        delete safeInsert.location;
        matchRes = await supabase.from('matches').insert([safeInsert]).select().single();
      }

      if (matchRes.error || !matchRes.data) {
        throw new Error(`Erreur lors de la création du match: ${matchRes.error?.message}`);
      }
      matchId = matchRes.data.id;
    }

    // 8. Enregistrer les surclassements My Club (après obtention de matchId)
    const myClubSurclassementsLogged = await this.recordMyClubSurclassements(
      myClubSurclassements,
      parsed.category,
      teamId,
      matchId,
      parsed.date
    );

    // 9. Insérer ou mettre à jour les match_players pour My Club (slot 0 = unique GK titulaire)
    const { data: existingMatchPlayers } = await supabase
      .from('match_players')
      .select('id, player_id')
      .eq('match_id', matchId);

    const existingPlayerMap = new Map<string, string>(
      (existingMatchPlayers || []).map((p: any) => [String(p.player_id), String(p.id)])
    );
    const matchPlayersInserts: any[] = [];
    let starterPosIdx = 0;

    for (const p of myClubPlayers) {
      const pId = p.matchedPlayerId;
      const isStarter = p.type === 'T';
      const posIdx = isStarter ? starterPosIdx++ : null;
      if (!pId) continue;

      const existingRowId = existingPlayerMap.get(String(pId));
      if (!existingRowId) {
        matchPlayersInserts.push({
          match_id: matchId,
          player_id: pId,
          is_starting: isStarter,
          position_index: posIdx,
        });
      } else if (isExistingMatch) {
        await supabase
          .from('match_players')
          .update({
            is_starting: isStarter,
            position_index: posIdx,
          })
          .eq('id', existingRowId);
      }
    }

    if (matchPlayersInserts.length > 0) {
      await supabase.from('match_players').insert(matchPlayersInserts);
    }

    // 9b. Historiser played_category & jersey_number_worn dans player_match_stats
    for (const p of myClubPlayers) {
      if (!p.matchedPlayerId) continue;
      const playerGoals = parsed.goals.filter(
        g =>
          g.team === rawMyClubSide &&
          !/csc|contre/i.test(g.type || '') &&
          (g.jerseyNumber === p.jerseyNumber || matchPlayerName(g.playerName, p.name))
      ).length;

      try {
        await supabase.from('player_match_stats').upsert(
          {
            match_id: matchId,
            player_id: p.matchedPlayerId,
            played_category: parsed.category,
            jersey_number_worn: p.jerseyNumber > 0 ? p.jerseyNumber : null,
            goals: playerGoals,
          } as any,
          { onConflict: 'match_id,player_id' }
        );
      } catch {
        // Tolérant si les colonnes optionnelles ne sont pas encore migrées
      }
    }

    // 10. INJECTION DES ÉVÉNEMENTS (Buts, Cartons Jaunes/Rouges, Blessures + InjuryService, Changements)
    const { data: existingEvents } = await supabase
      .from('match_events')
      .select('type, minute, extra')
      .eq('match_id', matchId);

    const isDuplicateEvent = (type: string, minute: number, jerseyNumber: number, extraTeam: 'home' | 'away') => {
      return (existingEvents || []).some(ev => {
        const extraJersey = (ev.extra as any)?.jersey_number;
        const evTeam = (ev.extra as any)?.team || 'home';
        return ev.type === type && ev.minute === minute && Number(extraJersey) === Number(jerseyNumber) && evTeam === extraTeam;
      });
    };

    const resolveActor = (sheetTeam: 'home' | 'away', jerseyNumber: number, playerName: string) => {
      const isMyClubActor = sheetTeam === rawMyClubSide;
      if (isMyClubActor) {
        const pid =
          myClubIdByJersey.get(jerseyNumber) ||
          myClubIdByName.get(normalizeName(playerName)) ||
          null;
        return {
          isMyClub: true,
          extraTeam: 'home' as const, // Convention FUS/My Club dans match_events
          playerId: pid,
          oppPlayerId: null as string | null,
          opponentRef: null as string | null,
        };
      } else {
        const oppId =
          oppIdByJersey.get(jerseyNumber) ||
          oppIdByName.get(normalizeName(playerName)) ||
          null;
        return {
          isMyClub: false,
          extraTeam: 'away' as const, // Convention Adversaire dans match_events
          playerId: null as string | null,
          oppPlayerId: oppId,
          opponentRef: oppId || `OPPONENT-${jerseyNumber}`,
        };
      }
    };

    const eventsToInsert: any[] = [];
    let substitutionsInserted = 0;
    let injuriesInserted = 0;

    // 10a. Buts (Régulier, Penalty, CSC)
    for (const goal of parsed.goals) {
      const actor = resolveActor(goal.team, goal.jerseyNumber, goal.playerName);
      const isCsc = /csc|contre/i.test(goal.type || '');
      const isPen = /pen/i.test(goal.type || '');
      const eventType: MatchEventType = isCsc ? 'own_goal' : isPen ? 'penalty' : 'goal';

      if (isDuplicateEvent(eventType, goal.minute, goal.jerseyNumber, actor.extraTeam)) continue;

      eventsToInsert.push({
        match_id: matchId,
        player_id: actor.playerId,
        type: eventType,
        minute: goal.minute,
        extra: {
          team: actor.extraTeam,
          jersey_number: goal.jerseyNumber,
          player_name: goal.playerName,
          goal_type: goal.type,
          ...(isPen ? { result: 'scored' } : {}),
          opponent_player_id: actor.oppPlayerId,
          opponent_ref: actor.opponentRef,
        },
      });
    }

    // 10b. Cartons Jaunes & Cartons Rouges
    for (const card of parsed.cards) {
      const actor = resolveActor(card.team, card.jerseyNumber, card.playerName);
      const cType: MatchEventType = card.cardType === 'yellow' ? 'yellow_card' : 'red_card';
      if (isDuplicateEvent(cType, card.minute, card.jerseyNumber, actor.extraTeam)) continue;

      eventsToInsert.push({
        match_id: matchId,
        player_id: actor.playerId,
        type: cType,
        minute: card.minute,
        extra: {
          team: actor.extraTeam,
          jersey_number: card.jerseyNumber,
          player_name: card.playerName,
          role: card.role,
          opponent_player_id: actor.oppPlayerId,
          opponent_ref: actor.opponentRef,
        },
      });
    }

    // 10c. Blessures (match_events + schéma extra compatible InjuryService)
    for (const injury of parsed.injuries) {
      const actor = resolveActor(injury.team, injury.jerseyNumber, injury.playerName);
      if (isDuplicateEvent('injury', injury.minute, injury.jerseyNumber, actor.extraTeam)) continue;

      eventsToInsert.push({
        match_id: matchId,
        player_id: actor.playerId,
        type: 'injury' as MatchEventType,
        minute: injury.minute,
        extra: {
          team: actor.extraTeam,
          jersey_number: injury.jerseyNumber,
          player_name: injury.playerName,
          opponent_player_id: actor.oppPlayerId,
          opponent_ref: actor.opponentRef,
          // Champs InjuryService pour statut blessé dans fus-app / suivi médical
          injury_id: 'other_injury',
          injury_type: 'Blessure signalée (FRMF)',
          injury_name: 'Blessure signalée sur feuille de match FRMF',
          category: 'Autre',
          severity: 'Modérée',
          days_out: 14,
          injury_date: parsed.date,
          expected_return_date: addDaysIso(parsed.date, 14),
          status: 'active',
        },
      });
      injuriesInserted++;
    }

    // 10d. Changements (substitutions) — joueur entrant était automatiquement sur le banc de touche
    for (const sub of parsed.substitutions) {
      const actorOut = resolveActor(sub.team, sub.jerseyOut, sub.playerOutName || '');
      const actorIn = resolveActor(sub.team, sub.jerseyIn, sub.playerInName || '');
      if (isDuplicateEvent('substitution', sub.minute, sub.jerseyOut, actorOut.extraTeam)) continue;

      const outName = sub.playerOutName || `Joueur #${sub.jerseyOut}`;
      const inName = sub.playerInName || `Joueur #${sub.jerseyIn}`;

      eventsToInsert.push({
        match_id: matchId,
        player_id: actorOut.playerId,
        related_player_id: actorIn.playerId,
        type: 'substitution' as MatchEventType,
        minute: sub.minute,
        extra: {
          team: actorOut.extraTeam,
          jersey_number: sub.jerseyOut,
          related_jersey: sub.jerseyIn,
          player_in_id: actorIn.playerId,
          player_name: outName,
          related_name: inName,
          player_out_name: actorOut.isMyClub ? outName : `#${sub.jerseyOut} ${outName}`,
          player_in_name: actorOut.isMyClub ? inName : `#${sub.jerseyIn} ${inName}`,
          opponent_player_id: actorOut.oppPlayerId,
          related_opponent_player_id: actorIn.oppPlayerId,
          opponent_ref: actorOut.opponentRef,
          from_bench: true,
        },
      });
      substitutionsInserted++;
    }

    if (eventsToInsert.length > 0) {
      const { error: eventsError } = await supabase.from('match_events').insert(eventsToInsert);
      if (eventsError) {
        console.warn('[matchSheetIngestionService] Erreur insertion match_events:', eventsError);
      }
    }

    return {
      matchId,
      isExistingMatch,
      isHomeMatch: parsed.isHomeMatch,
      opponentId: opponent.id,
      opponentName: opponent.name,
      opponentPlayersCreated,
      myClubSurclassementsLogged,
      eventsInserted: eventsToInsert.length,
      substitutionsInserted,
      injuriesInserted,
    };
  },
};
