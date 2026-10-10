import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { MyClubSettings, Club, Player, Staff, League, Stadium, Match, MatchEvent } from '../types';
import { clubService } from '../services/clubService';
import { playerService } from '../services/playerService';
import { matchService } from '../services/matchService';
import { staffService } from '../services/staffService';
import { competitionService } from '../services/competitionService';
import { teamService } from '../services/teamService';
import type { Team } from '../services/teamService';
import { supabase } from '../lib/supabase';

interface ClubContextType {
  mainClub: MyClubSettings | null;
  loading: boolean;
  setMainClub: (club: Partial<MyClubSettings>) => Promise<void>;
  opponentClubs: Club[];
  addOpponentClub: (club: any) => Promise<void>;
  updateOpponentClub: (id: string, club: Partial<Club>) => Promise<void>;
  deleteOpponentClub: (id: string) => Promise<void>;
  players: Player[];
  addPlayer: (player: any) => Promise<void>;
  updatePlayer: (id: string, player: Partial<Player>) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;

  staff: Staff[];
  addStaff: (member: any) => Promise<void>;
  updateStaff: (id: string, member: Partial<Staff>) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;

  teams: Team[];
  addTeam: (team: any) => Promise<void>;
  updateTeam: (id: string, team: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;

  leagues: League[];
  addLeague: (league: any) => Promise<void>;
  updateLeague: (id: string, league: Partial<League>) => Promise<void>;
  deleteLeague: (id: string) => Promise<void>;

  stadiums: Stadium[];
  addStadium: (stadium: any) => Promise<void>;
  updateStadium: (id: string, stadium: Partial<Stadium>) => Promise<void>;
  deleteStadium: (id: string) => Promise<void>;

  matches: Match[];
  addMatch: (match: any) => Promise<void>;
  updateMatch: (id: string, match: Partial<Match>) => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;
  saveMatchLineup: (matchId: string, startingXI: string[], substitutes: string[]) => Promise<void>;
  addMatchEvent: (event: any) => Promise<void>;
  saveMatchStaff: (matchId: string, staffIds: string[]) => Promise<void>;
  refreshData: () => Promise<void>;
  resetDatabase: () => Promise<void>;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export const ClubProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mainClub, setMainClubState] = useState<MyClubSettings | null>(null);
  const [opponentClubs, setOpponentClubs] = useState<Club[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [main, opponents, allPlayers, allMatches, allStaff, allLeagues, allStadiums, allTeams] = await Promise.all([
        clubService.getMyClub(),
        clubService.getOpponentClubs(),
        playerService.getPlayers(),
        matchService.getAllMatches(),
        staffService.getStaff(),
        competitionService.getLeagues(),
        competitionService.getStadiums(),
        teamService.getTeams()
      ]);

      setMainClubState(main);
      setOpponentClubs(opponents);
      setPlayers(allPlayers);
      setMatches(allMatches);
      setStaff(allStaff);
      setLeagues(allLeagues);
      setStadiums(allStadiums);
      setTeams(allTeams);
    } catch (error: any) {
      if (error?.code !== 'PGRST204' && error?.code !== 'PGRST205') {
        console.error("Failed to fetch data from Supabase:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const setMainClub = async (club: Partial<MyClubSettings>) => {
    try {
      if (mainClub?.id) {
        const updated = await clubService.updateMyClub(mainClub.id, club);
        setMainClubState(updated);
      } else {
        const created = await clubService.createMyClub(club as Omit<MyClubSettings, 'id'>);
        setMainClubState(created);
      }
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const addOpponentClub = async (club: any) => {
    const added = await clubService.addOpponentClub(club);
    setOpponentClubs(prev => [...prev, added]);
  };

  const updateOpponentClub = async (id: string, club: Partial<Club>) => {
    const updated = await clubService.updateOpponentClub(id, club);
    setOpponentClubs(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const deleteOpponentClub = async (id: string) => {
    await clubService.deleteOpponentClub(id);
    setOpponentClubs(prev => prev.filter(c => c.id !== id));
  };

  const addPlayer = async (player: any) => {
    const added = await playerService.addPlayer(player);
    setPlayers(prev => [...prev, added]);
  };

  const updatePlayer = async (id: string, player: Partial<Player>) => {
    const updated = await playerService.updatePlayer(id, player);
    setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const deletePlayer = async (id: string) => {
    await playerService.deletePlayer(id);
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const addStaff = async (member: any) => {
    const added = await staffService.addMember(member);
    setStaff(prev => [...prev, added]);
  };

  const updateStaff = async (id: string, member: Partial<Staff>) => {
    const updated = await staffService.updateMember(id, member);
    setStaff(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const deleteStaff = async (id: string) => {
    await staffService.deleteMember(id);
    setStaff(prev => prev.filter(s => s.id !== id));
  };

  const addTeam = async (team: any) => {
    const added = await teamService.addTeam(team);
    setTeams(prev => [...prev, added]);
  };

  const updateTeam = async (id: string, team: Partial<Team>) => {
    const updated = await teamService.updateTeam(id, team);
    setTeams(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const deleteTeam = async (id: string) => {
    await teamService.deleteTeam(id);
    setTeams(prev => prev.filter(t => t.id !== id));
  };

  const addLeague = async (league: any) => {
    const added = await competitionService.addLeague(league);
    setLeagues(prev => [...prev, added]);
  };

  const updateLeague = async (id: string, league: Partial<League>) => {
    const updated = await competitionService.updateLeague(id, league);
    setLeagues(prev => prev.map(l => l.id === updated.id ? updated : l));
  };

  const deleteLeague = async (id: string) => {
    await competitionService.deleteLeague(id);
    setLeagues(prev => prev.filter(l => l.id !== id));
  };

  const addStadium = async (stadium: any) => {
    const added = await competitionService.addStadium(stadium);
    setStadiums(prev => [...prev, added]);
  };

  const updateStadium = async (id: string, stadium: Partial<Stadium>) => {
    const updated = await competitionService.updateStadium(id, stadium);
    setStadiums(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const deleteStadium = async (id: string) => {
    await competitionService.deleteStadium(id);
    setStadiums(prev => prev.filter(s => s.id !== id));
  };

  const addMatch = async (match: any) => {
    const added = await matchService.createMatch(match);
    setMatches(prev => [...prev, added]);
  };

  const updateMatch = async (id: string, match: Partial<Match>) => {
    const updated = await matchService.updateMatch(id, match);
    setMatches(prev => prev.map(old => old.id === updated.id ? updated : old));
  };

  const deleteMatch = async (id: string) => {
    await matchService.deleteMatch(id);
    setMatches(prev => prev.filter(m => m.id !== id));
  };

  const saveMatchLineup = async (matchId: string, startingXI: string[], substitutes: string[]) => {
    await matchService.saveLineup(matchId, startingXI, substitutes);
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, lineup: { startingXI, substitutes, formation: m.formation || '4-3-3' } } : m));
  };

  const addMatchEvent = async (event: any) => {
    await matchService.addEvent(event);
  };

  const saveMatchStaff = async (matchId: string, staffIds: string[]) => {
    await matchService.saveStaff(matchId, staffIds);
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, staff_ids: staffIds } : m));
  };

  const resetDatabase = async () => {
    try {
      // 1. Delete dependent match data
      const { error: eventsErr } = await supabase.from('match_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (eventsErr) throw eventsErr;

      const { error: playersMatchErr } = await supabase.from('match_players').delete().neq('match_id', '00000000-0000-0000-0000-000000000000');
      if (playersMatchErr) throw playersMatchErr;

      const { error: staffMatchErr } = await supabase.from('match_staff').delete().neq('match_id', '00000000-0000-0000-0000-000000000000');
      if (staffMatchErr) throw staffMatchErr;

      // 2. Delete matches
      const { error: matchesErr } = await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (matchesErr) throw matchesErr;

      // 3. Delete master entities
      await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('staff').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 4. Delete clubs info, leagues, stadiums
      await supabase.from('clubs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('leagues').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('stadiums').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      await refreshData();
    } catch (err) {
      console.error("Critical: Reset database failed:", err);
      throw err;
    }
  };

  return (
    <ClubContext.Provider value={{
      mainClub, loading, setMainClub, opponentClubs, addOpponentClub, updateOpponentClub, deleteOpponentClub,
      players, addPlayer, updatePlayer, deletePlayer,
      staff, addStaff, updateStaff, deleteStaff,
      teams, addTeam, updateTeam, deleteTeam,
      leagues, addLeague, updateLeague, deleteLeague,
      stadiums, addStadium, updateStadium, deleteStadium,
      matches,
      addMatch,
      updateMatch,
      deleteMatch,
      saveMatchLineup, addMatchEvent, saveMatchStaff,
      refreshData, resetDatabase
    }}>
      {children}
    </ClubContext.Provider>
  );
};

export const useClub = () => {
  const context = useContext(ClubContext);
  if (context === undefined) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
};
