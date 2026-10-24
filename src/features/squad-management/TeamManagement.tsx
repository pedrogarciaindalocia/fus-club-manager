import React, { useState, useMemo, useEffect } from 'react';
import { useTeams } from '../../hooks/useTeams';
import { useStaff } from '../../hooks/useStaff';
import { usePlayers } from '../../hooks/usePlayers';
import { useClubData } from '../../hooks/useClubData';
import { useMatches } from '../../hooks/useMatches';
import { usePermissions } from '../../context/PermissionsContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Shield, 
  LayoutGrid, 
  List as ListIcon,
  User,
  TrendingUp,
  X,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  UserCog,
  BarChart3,
  Calendar,
  Clock,
  Target,
  Trophy,
  Activity,
  ArrowUpDown,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  Flame,
  Award,
  Zap,
  CheckSquare,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Team } from '../../services/teamService';
import type { Player, Match } from '../../types';
import { useSurclassements } from '../../hooks/useSurclassements';
import { isLowerCategory } from '../../services/surclassementService';
import { Skeleton } from '../../components/ui/skeleton';
import { supabase } from '../../lib/supabase';
import { PLAYER_CATEGORIES, normalizeAgeCategory } from '../../constants';
import { toast } from 'sonner';

const CATEGORY_FILTERS = [
  'ALL', ...PLAYER_CATEGORIES
] as const;

const FORM_CATEGORIES = PLAYER_CATEGORIES;

interface TeamMatchStats {
  totalMatches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  substitutions: number;
  totalMinutesPlayed: number;
  totalPlayers: number;
  goalkeepersCount: number;
  defendersCount: number;
  midfieldersCount: number;
  forwardsCount: number;
  outfieldPlayersCount: number;
  opponentsFaced: string[];
}

const TeamManagement: React.FC = () => {
  const { teams, isLoading: teamsLoading, addTeam, updateTeam, deleteTeam } = useTeams();
  const { staff } = useStaff();
  const { players, addPlayer, updatePlayer } = usePlayers();
  const { matches } = useMatches();
  const { mainClub, opponentClubs, isLoading: clubLoading } = useClubData();
  const { can, canManageCategory, allowedCategories } = usePermissions();
  const { surclassements } = useSurclassements();

  const [viewState, setViewState] = useState<'LIST' | 'FORM' | 'ROSTER' | 'STATS'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [rosterTeam, setRosterTeam] = useState<Team | null>(null);
  const [statsTeam, setStatsTeam] = useState<Team | null>(null);
  const [isAssignMode, setIsAssignMode] = useState(false);

  const visibleCategoryFilters = useMemo(() => {
    const allowed = PLAYER_CATEGORIES.filter(cat => canManageCategory(cat));
    if (allowed.length < PLAYER_CATEGORIES.length && allowed.length > 0) {
      return allowed.length === 1 ? allowed : ['ALL', ...allowed];
    }
    return ['ALL', ...PLAYER_CATEGORIES];
  }, [canManageCategory]);

  const formCategories = useMemo(() => {
    const allowed = PLAYER_CATEGORIES.filter(cat => canManageCategory(cat));
    return allowed.length > 0 ? allowed : PLAYER_CATEGORIES;
  }, [canManageCategory]);

  useEffect(() => {
    if (allowedCategories && allowedCategories.length === 1) {
      const single = normalizeAgeCategory(allowedCategories[0]);
      setCategoryFilter(single);
      setFormData(prev => ({ ...prev, category: single }));
    }
  }, [allowedCategories]);

  // Match events state for full automated analytics
  const [matchEvents, setMatchEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  
  // Settings sync
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>(mainClub?.preferred_view_mode || 'list');
  const [pageSize, setPageSize] = useState(mainClub?.pagination_limit || 10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (mainClub?.preferred_view_mode) setDisplayMode(mainClub.preferred_view_mode);
    if (mainClub?.pagination_limit) setPageSize(mainClub.pagination_limit);
  }, [mainClub]);

  // Fetch all match events for real-time automatic stats calculation
  useEffect(() => {
    const fetchEvents = async () => {
      setEventsLoading(true);
      try {
        const { data, error } = await supabase.from('match_events').select('*');
        if (!error && data) {
          setMatchEvents(data);
        }
      } catch (err) {
        console.warn('Could not fetch match events for analytics:', err);
      } finally {
        setEventsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const [formData, setFormData] = useState<Omit<Team, 'id' | 'created_at'>>({
    name: '',
    category: 'U13',
    coach_id: '',
    photo_url: ''
  });

  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
      const normCat = normalizeAgeCategory(t.category);
      if (!canManageCategory(normCat)) return false;
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || normCat === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [teams, searchTerm, categoryFilter, canManageCategory]);

  const paginatedTeams = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTeams.slice(start, start + pageSize);
  }, [filteredTeams, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTeams.length / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, pageSize]);

  // IDs des joueurs surclassés actifs vers cette équipe
  const surclassedIdsForRoster = useMemo(() => {
    if (!rosterTeam) return new Set<string>();
    return new Set(
      surclassements
        .filter(s => s.status === 'active' && s.target_team_id === rosterTeam.id)
        .map(s => s.player_id)
    );
  }, [surclassements, rosterTeam]);

  // Map playerId → original_category pour badge
  const surclassedOriginMap = useMemo(() => {
    if (!rosterTeam) return {} as Record<string, string>;
    return Object.fromEntries(
      surclassements
        .filter(s => s.status === 'active' && s.target_team_id === rosterTeam.id)
        .map(s => [s.player_id, s.original_category])
    );
  }, [surclassements, rosterTeam]);

  // Map playerId → target_jersey_number pour joueurs surclassés
  const surclassedJerseyMap = useMemo(() => {
    if (!rosterTeam) return {} as Record<string, number | null>;
    return Object.fromEntries(
      surclassements
        .filter(s => s.status === 'active' && s.target_team_id === rosterTeam.id && s.target_jersey_number != null)
        .map(s => [s.player_id, s.target_jersey_number])
    );
  }, [surclassements, rosterTeam]);

  // État pour l'édition inline du numéro de maillot
  const [editingJerseyId, setEditingJerseyId] = useState<string | null>(null);
  const [editingJerseyValue, setEditingJerseyValue] = useState<string>('');

  // Multi-sélection pour joueurs disponibles
  const [selectedAvailableIds, setSelectedAvailableIds] = useState<string[]>([]);

  const rosterOfficialPlayers = useMemo(() => {
    if (!rosterTeam) return [];
    const regular = players.filter(p => (p as any).team_id === rosterTeam.id);
    const surclassed = players.filter(p =>
      surclassedIdsForRoster.has(p.id) && (p as any).team_id !== rosterTeam.id
    );

    return [...regular, ...surclassed];
  }, [rosterTeam, players, surclassedIdsForRoster]);

  const rosterPlayers = rosterOfficialPlayers;

  const availablePlayers = useMemo(() => {
    if (!rosterTeam) return [];
    return players.filter(p =>
      (p as any).team_id !== rosterTeam.id &&
      normalizeAgeCategory(p.category || '') === normalizeAgeCategory(rosterTeam.category || '') &&
      !surclassedIdsForRoster.has(p.id)
    );
  }, [rosterTeam, players, surclassedIdsForRoster]);

  // =========================================================================
  // AUTOMATIC STATS & MATCH HISTORY COMPUTATION FOR ANY TEAM
  // =========================================================================
  const getTeamMatchHistoryAndStats = (targetTeam: Team) => {
    // Filter matches associated with this team (by team_id or matching category)
    const teamMatches = matches.filter(
      m => m.team_id === targetTeam.id ||
      (m.category && m.category.toUpperCase() === targetTeam.category.toUpperCase())
    );

    const teamPlayerIds = new Set(
      players.filter(p => (p as any).team_id === targetTeam.id).map(p => p.id)
    );

    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsScored = 0;
    let goalsConceded = 0;
    let totalMinutesPlayed = 0;
    const opponentSet = new Set<string>();

    teamMatches.forEach(m => {
      const isHome = m.is_home;
      const homeScore = m.score_home ?? 0;
      const awayScore = m.score_away ?? 0;

      const scored = isHome ? homeScore : awayScore;
      const conceded = isHome ? awayScore : homeScore;

      goalsScored += scored;
      goalsConceded += conceded;

      if (m.status === 'finished') {
        if (scored > conceded) wins++;
        else if (scored === conceded) draws++;
        else losses++;
      }

      // Calculate minutes
      const matchMins = m.time_elapsed_seconds
        ? Math.round(m.time_elapsed_seconds / 60)
        : (m.half_duration_minutes ? m.half_duration_minutes * 2 : 90);
      totalMinutesPlayed += matchMins;

      // Opponent name
      if (m.opponent_id) {
        const opp = opponentClubs.find(c => c.id === m.opponent_id);
        if (opp && opp.name) opponentSet.add(opp.name);
      }
    });

    // Compute event-based stats (yellow, red, goals, assists, subs)
    const teamMatchIds = new Set(teamMatches.map(m => m.id));
    const teamEvents = matchEvents.filter(e => teamMatchIds.has(e.match_id));

    let yellowCards = 0;
    let redCards = 0;
    let assists = 0;
    let substitutions = 0;

    teamEvents.forEach(e => {
      // Check if event belongs to a player of this team
      if (e.player_id && teamPlayerIds.has(e.player_id)) {
        if (e.type === 'yellow_card') yellowCards++;
        if (e.type === 'red_card') redCards++;
        if (e.type === 'assist') assists++;
        if (e.type === 'substitution' || e.type === 'sub_in') substitutions++;
      }
    });

    // Count players and tactical breakdown
    const teamSquad = players.filter(p => (p as any).team_id === targetTeam.id);
    let goalkeepersCount = 0;
    let defendersCount = 0;
    let midfieldersCount = 0;
    let forwardsCount = 0;

    teamSquad.forEach(p => {
      const pos = (p.position || '').toUpperCase();
      if (['GK', 'G', 'GARDIEN'].includes(pos) || pos.includes('GARD') || pos.includes('GK')) {
        goalkeepersCount++;
      } else if (['DF', 'DEF', 'CB', 'LB', 'RB', 'DC', 'DG', 'DD'].includes(pos) || pos.includes('DEF')) {
        defendersCount++;
      } else if (['FW', 'ATT', 'ST', 'RW', 'LW', 'SS', 'BU', 'AD', 'AG'].includes(pos) || pos.includes('ATT') || pos.includes('AVANT') || pos.includes('AIL')) {
        forwardsCount++;
      } else {
        midfieldersCount++;
      }
    });

    const outfieldPlayersCount = teamSquad.length - goalkeepersCount;

    const statsSummary: TeamMatchStats = {
      totalMatches: teamMatches.length,
      wins,
      draws,
      losses,
      goalsScored,
      goalsConceded,
      assists,
      yellowCards,
      redCards,
      substitutions,
      totalMinutesPlayed,
      totalPlayers: teamSquad.length,
      goalkeepersCount,
      defendersCount,
      midfieldersCount,
      forwardsCount,
      outfieldPlayersCount,
      opponentsFaced: Array.from(opponentSet),
    };

    return {
      teamMatches,
      stats: statsSummary,
    };
  };

  const handleAssignPlayer = async (player: Player) => {
    if (!rosterTeam) return;
    try {
      await updatePlayer({ id: player.id, data: { team_id: rosterTeam.id } as Partial<Player> });
    } catch (e) {
      console.error("Failed to assign player", e);
    }
  };

  const handleRemovePlayer = async (player: Player) => {
    try {
      await updatePlayer({ id: player.id, data: { team_id: null } as any });
    } catch (e) {
      console.error("Failed to remove player", e);
    }
  };

  const toggleSelectAvailable = (id: string) => {
    setSelectedAvailableIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllAvailable = () => {
    if (selectedAvailableIds.length === availablePlayers.length) {
      setSelectedAvailableIds([]);
    } else {
      setSelectedAvailableIds(availablePlayers.map(p => p.id));
    }
  };

  const handleBatchAssignPlayers = async () => {
    if (!rosterTeam || selectedAvailableIds.length === 0) return;
    try {
      for (const id of selectedAvailableIds) {
        const clubPlayer = players.find(p => p.id === id);
        if (clubPlayer) {
          await handleAssignPlayer(clubPlayer);
        }
      }
      toast.success(`${selectedAvailableIds.length} joueur(s) affecté(s) à l'équipe ${rosterTeam.name} !`);
      setSelectedAvailableIds([]);
    } catch (e) {
      console.error("Batch assign error:", e);
      toast.error("Erreur lors de l'affectation groupée");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
       const cleanData = {
         ...formData,
         coach_id: formData.coach_id?.trim() ? formData.coach_id.trim() : null,
         photo_url: (formData.photo_url?.trim() && formData.photo_url !== 'null') ? formData.photo_url.trim() : null,
       };
       if (editingTeam) {
         await updateTeam({ id: editingTeam.id, data: cleanData as any });
         toast.success(`Équipe ${formData.name} mise à jour avec succès !`);
       } else {
         await addTeam(cleanData as any);
         toast.success(`Équipe ${formData.name} créée avec succès !`);
       }
       setViewState('LIST');
    } catch (err: any) {
       console.error("Failed to save team:", err);
       toast.error(err?.message || "Erreur lors de l'enregistrement de l'équipe");
    }
  };

  const handleOpenAdd = () => {
    setEditingTeam(null);
    setFormData({ name: '', category: 'U13', coach_id: '', photo_url: '' });
    setViewState('FORM');
  };

  const handleOpenEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      category: team.category,
      coach_id: team.coach_id || '',
      photo_url: (team.photo_url && team.photo_url !== 'null') ? team.photo_url : ''
    });
    setViewState('FORM');
  };

  const handleOpenRoster = (team: Team) => {
    setRosterTeam(team);
    setViewState('ROSTER');
  };

  const handleOpenStats = (team: Team) => {
    setStatsTeam(team);
    setViewState('STATS');
  };

  const getCoachName = (coachId?: string) => {
    if (!coachId) return 'Aucun Coach';
    const member = staff.find(s => s.id === coachId);
    return member ? member.full_name : 'Staff Inconnu';
  };

  const getAssistantCoachName = (coachId?: string) => {
    if (!coachId) return null;
    const assistant = staff.find(s => s.role === 'assistant_coach' && s.parent_coach_id === coachId);
    return assistant ? assistant.full_name : null;
  };

  const getOpponentName = (opponentId?: string) => {
    if (!opponentId) return 'Adversaire Inconnu';
    const opp = opponentClubs.find(c => c.id === opponentId);
    return opp ? opp.name : 'Adversaire';
  };

  if (teamsLoading || clubLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="h-40 w-full rounded-[2.5rem] bg-secondary/20 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 rounded-[2.5rem]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 overflow-visible">
      <AnimatePresence mode="wait">
        {viewState === 'LIST' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-8 rounded-[2.5rem] border border-border shadow-sm relative overflow-hidden">
               <div className="flex items-center gap-6 relative z-10">
                  <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                     <Users className="w-8 h-8" />
                  </div>
                  <div>
                     <h2 className="text-3xl font-black tracking-tight uppercase italic text-foreground flex items-center gap-2">
                        Unités de Squad <Sparkles className="w-6 h-6 text-primary" />
                     </h2>
                     <p className="text-muted-foreground text-sm font-medium">
                        Gestion des équipes par catégories (U7 à PRO), effectif et statistiques automatiques
                     </p>
                  </div>
               </div>
               <div className="flex items-center gap-3 relative z-10">
                  <div className="flex bg-secondary/30 p-1.5 rounded-2xl border border-border">
                     <Button 
                       variant={displayMode === 'list' ? 'default' : 'ghost'} 
                       size="icon" 
                       onClick={() => setDisplayMode('list')}
                       className="rounded-xl w-10 h-10"
                     >
                        <ListIcon className="w-4 h-4" />
                     </Button>
                     <Button 
                       variant={displayMode === 'grid' ? 'default' : 'ghost'} 
                       size="icon" 
                       onClick={() => setDisplayMode('grid')}
                       className="rounded-xl w-10 h-10"
                     >
                        <LayoutGrid className="w-4 h-4" />
                     </Button>
                  </div>
                  {can('manage_teams') && (
                    <Button onClick={handleOpenAdd} className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/95 text-primary-foreground font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                       <Plus className="w-4 h-4" /> Nouveau Squad
                    </Button>
                  )}
               </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col lg:flex-row items-center gap-4 p-4 rounded-[2rem] bg-card border border-border shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-40" />
                    <Input 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Filtrer par nom d'équipe ou catégorie (U9, U10...)..." 
                      className="h-14 pl-14 pr-6 rounded-2xl bg-secondary/30 border-transparent font-bold text-sm focus:bg-background transition-all"
                    />
                </div>
                
                {/* Category Filter Tabs */}
                <div className="flex bg-secondary/30 p-1.5 rounded-2xl w-full lg:w-auto overflow-x-auto no-scrollbar gap-1">
                  {visibleCategoryFilters.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`flex-1 lg:flex-none px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        categoryFilter === cat ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
            </div>

            {/* Grid View Mode */}
            {displayMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                  {paginatedTeams.map((team) => {
                    const { stats: tStats } = getTeamMatchHistoryAndStats(team);
                    return (
                      <motion.div key={team.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }}>
                         <Card className="group relative border border-border shadow-sm hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] overflow-hidden bg-card">
                            <div className="aspect-[4/3] bg-secondary/30 relative overflow-hidden flex items-center justify-center">
                               <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary group-hover:from-primary/10 transition-colors" />
                               
                               {mainClub?.logo_url ? (
                                 <img src={mainClub.logo_url} alt="Club" className="w-32 h-32 object-contain opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-700 blur-[2px] group-hover:blur-0" />
                               ) : (
                                 <Shield className="w-32 h-32 text-primary/5 opacity-10" />
                               )}
                               
                               <div className="relative z-10 flex flex-col items-center gap-4">
                                  <div className="w-20 h-20 rounded-[1.5rem] bg-card shadow-2xl flex items-center justify-center p-4 transform -rotate-3 group-hover:rotate-0 transition-transform">
                                     {mainClub?.logo_url ? (
                                       <img src={mainClub.logo_url} alt="Club Logo" className="w-full h-full object-contain" />
                                     ) : (
                                       <Shield className="w-10 h-10 text-primary" />
                                     )}
                                  </div>
                                  <span className="px-6 py-2 rounded-2xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-[0.2em] shadow-2xl transform translate-y-2 translate-x-2 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform">
                                     {team.category}
                                  </span>
                               </div>

                               {can('manage_teams') && (
                                 <div className="absolute top-4 right-4 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                                    <Button size="icon" onClick={() => handleOpenEdit(team)} className="w-10 h-10 rounded-xl bg-card text-primary hover:bg-primary hover:text-white shadow-xl">
                                       <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" onClick={() => deleteTeam(team.id)} className="w-10 h-10 rounded-xl bg-card text-destructive hover:bg-destructive hover:text-white shadow-xl">
                                       <Trash2 className="w-4 h-4" />
                                    </Button>
                                 </div>
                               )}
                            </div>
                            <CardContent className="p-8 space-y-4">
                               <h3 className="text-xl font-black tracking-tight uppercase group-hover:text-primary transition-colors truncate">{team.name}</h3>
                               
                               <div className="space-y-2.5 text-xs">
                                  <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                     <User className="w-4 h-4 text-primary shrink-0" />
                                     <span className="truncate">{getCoachName(team.coach_id)}</span>
                                  </div>
                                  {getAssistantCoachName(team.coach_id) && (
                                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                       <UserCog className="w-4 h-4 text-emerald-500 shrink-0" />
                                       <span className="truncate text-emerald-600 dark:text-emerald-400">{getAssistantCoachName(team.coach_id)}</span>
                                    </div>
                                  )}
                               </div>

                               {/* Quick Computed Stats Pill */}
                               <div className="pt-2 border-t border-border grid grid-cols-3 gap-2 text-center">
                                  <div className="bg-secondary/40 p-2 rounded-xl">
                                     <div className="text-xs font-black text-foreground">{tStats.totalPlayers}</div>
                                     <div className="text-[9px] font-bold text-muted-foreground uppercase">Joueurs</div>
                                  </div>
                                  <div className="bg-secondary/40 p-2 rounded-xl">
                                     <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">{tStats.goalkeepersCount}</div>
                                     <div className="text-[9px] font-bold text-muted-foreground uppercase">Gardiens</div>
                                  </div>
                                  <div className="bg-secondary/40 p-2 rounded-xl">
                                     <div className="text-xs font-black text-primary">{tStats.totalMatches}</div>
                                     <div className="text-[9px] font-bold text-muted-foreground uppercase">Matchs</div>
                                  </div>
                               </div>

                               <div className="grid grid-cols-2 gap-2 pt-2">
                                  <Button onClick={() => handleOpenRoster(team)} variant="ghost" className="rounded-xl bg-secondary/30 hover:bg-secondary text-foreground font-black uppercase tracking-wider text-[9px] h-10 transition-all">
                                      Effectif <Users className="w-3 h-3 ml-1.5 opacity-60" />
                                  </Button>
                                  <Button onClick={() => handleOpenStats(team)} variant="ghost" className="rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white font-black uppercase tracking-wider text-[9px] h-10 transition-all">
                                      Stats <BarChart3 className="w-3 h-3 ml-1.5" />
                                  </Button>
                               </div>
                            </CardContent>
                         </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              /* List View Mode */
              <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead className="bg-secondary/20 border-b border-border">
                    <tr>
                      <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Squad & Catégorie</th>
                      <th className="text-left py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Encadrement Staff</th>
                      <th className="text-center py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Effectif (Total / GK)</th>
                      <th className="text-center py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bilan Matchs</th>
                      <th className="text-right px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedTeams.map((team) => {
                      const { stats: tStats } = getTeamMatchHistoryAndStats(team);
                      return (
                        <tr key={team.id} className="group hover:bg-secondary/10 transition-colors">
                          <td className="px-8 py-4">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 overflow-hidden border border-primary/20 flex items-center justify-center shrink-0">
                                   {mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain p-2" /> : <Shield className="w-6 h-6 text-primary" />}
                                </div>
                                <div>
                                   <div className="font-black text-base uppercase italic tracking-tight">{team.name}</div>
                                   <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-extrabold uppercase mt-0.5">
                                      Catégorie {team.category}
                                   </Badge>
                                </div>
                             </div>
                          </td>
                          <td className="py-4">
                             <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-bold text-foreground uppercase">{getCoachName(team.coach_id)}</span>
                                {getAssistantCoachName(team.coach_id) && (
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                                    <UserCog className="w-3 h-3 inline mr-1" />{getAssistantCoachName(team.coach_id)}
                                  </span>
                                )}
                             </div>
                          </td>
                          <td className="py-4 text-center">
                             <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary/40 rounded-xl text-xs font-bold">
                                <span>{tStats.totalPlayers} joueurs</span>
                                <span className="text-emerald-600 dark:text-emerald-400">({tStats.goalkeepersCount} GK)</span>
                             </div>
                          </td>
                          <td className="py-4 text-center">
                             <div className="inline-flex items-center gap-2 text-xs font-bold">
                                <span className="text-primary font-black">{tStats.totalMatches} M</span>
                                <span className="text-emerald-600">({tStats.wins}V - {tStats.draws}N - {tStats.losses}D)</span>
                             </div>
                          </td>
                          <td className="px-8 py-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleOpenStats(team)} className="rounded-xl font-black uppercase text-[9px] h-9 px-3 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all">
                                   <BarChart3 className="w-3.5 h-3.5 mr-1" /> Stats
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleOpenRoster(team)} className="rounded-xl font-black uppercase text-[9px] h-9 px-3 hover:bg-secondary transition-all">
                                   Roster
                                </Button>
                                {can('manage_teams') && (
                                  <>
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(team)} className="h-9 w-9 rounded-xl hover:bg-secondary transition-all"><Edit2 className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteTeam(team.id)} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"><Trash2 className="w-4 h-4" /></Button>
                                  </>
                                )}
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6">
                 <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                    Affichage {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredTeams.length)} sur {filteredTeams.length}
                 </div>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="w-10 h-10 rounded-2xl bg-card border-border"><ChevronLeft className="w-4 h-4" /></Button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <Button key={i} variant={currentPage === i + 1 ? 'default' : 'ghost'} size="sm" onClick={() => setCurrentPage(i + 1)} className={`w-10 h-10 rounded-2xl font-black text-[11px] ${currentPage === i + 1 ? 'shadow-lg shadow-primary/20 bg-primary text-primary-foreground' : 'bg-card border-border border'}`}>{i + 1}</Button>
                    ))}
                    <Button variant="outline" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="w-10 h-10 rounded-2xl bg-card border-border"><ChevronRight className="w-4 h-4" /></Button>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50">Par page:</span>
                    <select value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value))} className="h-10 w-20 rounded-2xl bg-card border border-border font-black text-xs px-2 appearance-none cursor-pointer text-center">
                       {[5, 10, 15, 20, 25, 50].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                 </div>
              </div>
            )}
            
            {filteredTeams.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-card border border-border rounded-[2.5rem]">
                 <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center text-muted-foreground">
                    <Users className="w-8 h-8 opacity-40" />
                 </div>
                 <p className="text-muted-foreground font-medium italic uppercase tracking-widest text-xs">Aucune équipe trouvée dans cette catégorie.</p>
              </div>
            )}
          </motion.div>
        ) : viewState === 'FORM' ? (
          /* FORM VIEW (Create/Edit Team) */
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-3xl mx-auto"
          >
             <div className="flex items-center gap-6 mb-10">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setViewState('LIST')} 
                  className="w-14 h-14 rounded-2xl bg-card border border-border shadow-sm hover:bg-secondary transition-all"
                >
                  <X className="w-6 h-6 rotate-90" />
                </Button>
                <div>
                   <h3 className="text-4xl font-black tracking-tight uppercase italic">{editingTeam ? 'Modifier l\'Équipe' : 'Créer une Nouvelle Équipe'}</h3>
                   <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1">Configuration officielle de l'unité de squad</p>
                </div>
             </div>

             <Card className="border border-border shadow-2xl rounded-[3.5rem] overflow-hidden bg-card">
                <form onSubmit={handleSubmit} className="p-12 space-y-10">
                   <div className="space-y-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Nom de l'Équipe / Squad</label>
                         <Input 
                           required
                           value={formData.name}
                           onChange={e => setFormData({...formData, name: e.target.value})}
                           placeholder="ex. FUS U13 Elite" 
                           className="h-16 px-8 rounded-2xl bg-secondary/30 border-transparent font-bold text-lg focus:bg-background focus:ring-2 ring-primary/20" 
                         />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Catégorie d'Âge (U7 à PRO)</label>
                            <select 
                              value={formData.category}
                              onChange={e => setFormData({...formData, category: e.target.value})}
                              className="w-full h-16 px-8 rounded-2xl bg-secondary/30 border border-transparent font-bold text-base outline-none appearance-none cursor-pointer focus:bg-background focus:ring-2 ring-primary/20 text-foreground"
                            >
                               {formCategories.map(cat => (
                                 <option key={cat} value={cat}>Catégorie {cat}</option>
                               ))}
                            </select>
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Entraîneur Principal</label>
                            <select 
                              value={formData.coach_id}
                              onChange={e => setFormData({...formData, coach_id: e.target.value})}
                              className="w-full h-16 px-8 rounded-2xl bg-secondary/30 border border-transparent font-bold text-base outline-none appearance-none cursor-pointer focus:bg-background focus:ring-2 ring-primary/20 text-foreground"
                            >
                               <option value="">-- Aucun Coach Assigné --</option>
                               {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
                            </select>
                         </div>
                      </div>

                      <div className="p-8 rounded-[2.5rem] bg-secondary/20 border border-border flex items-center gap-6 text-left relative overflow-hidden">
                         <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg flex items-center justify-center p-3 shrink-0">
                            {mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-10 h-10 text-primary" />}
                         </div>
                         <div className="leading-tight">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Identité & Branding du Club</p>
                            <p className="text-xs font-semibold text-muted-foreground leading-relaxed">Cette équipe sera automatiquement synchronisée avec l'effectif, le calendrier des compétitions et l'analyse de performance.</p>
                         </div>
                      </div>
                   </div>

                   <div className="flex gap-4 pt-6 border-t border-border">
                      <Button type="button" variant="ghost" className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-secondary" onClick={() => setViewState('LIST')}>Annuler</Button>
                      <Button type="submit" className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 transition-all active:scale-95">
                         {editingTeam ? 'Mettre à Jour l\'Équipe' : 'Créer l\'Équipe'}
                      </Button>
                   </div>
                </form>
             </Card>
          </motion.div>
        ) : viewState === 'STATS' && statsTeam ? (
          /* AUTOMATIC STATS & MATCH HISTORY VIEW FOR A TEAM */
          <motion.div
            key="stats"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-6xl mx-auto space-y-8"
          >
             {(() => {
                const { teamMatches, stats: tStats } = getTeamMatchHistoryAndStats(statsTeam);
                const coach = staff.find(s => s.id === statsTeam.coach_id);
                const winRate = tStats.totalMatches > 0 ? Math.round((tStats.wins / tStats.totalMatches) * 100) : 0;
                const diff = tStats.goalsScored - tStats.goalsConceded;
                const totalCards = tStats.yellowCards + tStats.redCards;
                const gkPct = tStats.totalPlayers > 0 ? Math.round((tStats.goalkeepersCount / tStats.totalPlayers) * 100) : 0;
                const dfPct = tStats.totalPlayers > 0 ? Math.round((tStats.defendersCount / tStats.totalPlayers) * 100) : 0;
                const mfPct = tStats.totalPlayers > 0 ? Math.round((tStats.midfieldersCount / tStats.totalPlayers) * 100) : 0;
                const fwPct = tStats.totalPlayers > 0 ? Math.round((tStats.forwardsCount / tStats.totalPlayers) * 100) : 0;

                return (
                  <>
                    {/* Header Banner */}
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-card border border-border/80 p-6 md:p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden">
                       <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                       <div className="flex items-center gap-5 relative z-10">
                          <Button 
                            variant="outline" 
                            onClick={() => setViewState('LIST')} 
                            className="h-12 px-4 rounded-2xl bg-card border-border hover:bg-secondary/80 text-foreground font-black uppercase tracking-wider text-xs gap-2 shrink-0 shadow-xs transition-all hover:-translate-x-0.5"
                          >
                            <ArrowLeft className="w-4 h-4 text-primary" />
                            <span className="hidden sm:inline">Équipes</span>
                          </Button>

                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-secondary border border-primary/20 flex items-center justify-center p-3 shadow-inner shrink-0 relative">
                             {mainClub?.logo_url ? (
                                <img src={mainClub.logo_url} alt="Club" className="w-full h-full object-contain drop-shadow-sm" />
                             ) : (
                                <Shield className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                             )}
                             <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-primary text-[9px] font-black text-white uppercase shadow-xs">
                                {statsTeam.category}
                             </span>
                          </div>

                          <div>
                             <div className="flex items-center gap-3">
                                <h3 className="text-2xl md:text-3xl font-black tracking-tight uppercase italic text-foreground">{statsTeam.name}</h3>
                                <Badge className="bg-primary text-primary-foreground font-black uppercase px-3 py-1 border-none text-[10px] shadow-sm shadow-primary/25">
                                   Catégorie {statsTeam.category}
                                </Badge>
                             </div>
                             <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-medium mt-1">
                                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-primary text-[10px]">
                                   <Sparkles className="w-3.5 h-3.5" /> Centre d'Analyse des Matchs
                                </span>
                                <span className="text-border hidden sm:inline">•</span>
                                <span className="flex items-center gap-1.5">
                                   <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
                                   {coach ? <span className="text-foreground font-bold">Coach : {coach.full_name}</span> : <span>Staff technique non assigné</span>}
                                </span>
                             </div>
                          </div>
                       </div>

                       <div className="flex items-center gap-3 w-full lg:w-auto justify-end relative z-10">
                          <Button 
                            onClick={() => handleOpenRoster(statsTeam)}
                            className="rounded-2xl h-12 px-6 font-black uppercase tracking-widest text-xs gap-2.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex-1 lg:flex-initial"
                          >
                            <Users className="w-4 h-4" /> Effectif ({tStats.totalPlayers})
                          </Button>
                          {can('manage_teams') && (
                            <Button 
                              variant="outline" 
                              onClick={() => handleOpenEdit(statsTeam)} 
                              className="rounded-2xl h-12 px-4 font-black uppercase tracking-widest text-xs gap-2 border-border hover:bg-secondary shadow-xs"
                              title="Modifier les informations de l'équipe"
                            >
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                       </div>
                    </div>

                    {/* Automatic Key Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                       {/* Matchs & Ratio */}
                       <Card className="rounded-3xl border-border/80 bg-card p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-all group">
                          <div className="flex items-center justify-between mb-3">
                             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Matchs Joués</span>
                             <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-110">
                                <Trophy className="w-4 h-4" />
                             </div>
                          </div>
                          <div className="text-3xl font-black text-foreground tracking-tight">{tStats.totalMatches}</div>
                          <div className="flex items-center gap-1.5 mt-2">
                             <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">{tStats.wins}V</span>
                             <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black">{tStats.draws}N</span>
                             <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black">{tStats.losses}D</span>
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-2.5">
                             {tStats.totalMatches > 0 ? `${winRate}% de victoires` : 'Aucun match disputé'}
                          </p>
                       </Card>

                       {/* Buts Marqués / Encaissés */}
                       <Card className="rounded-3xl border-border/80 bg-card p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-all group">
                          <div className="flex items-center justify-between mb-3">
                             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Attaque & Défense</span>
                             <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center transition-transform group-hover:scale-110">
                                <Target className="w-4 h-4" />
                             </div>
                          </div>
                          <div className="text-3xl font-black text-foreground tracking-tight">
                             {tStats.goalsScored} <span className="text-base text-muted-foreground font-semibold">/ {tStats.goalsConceded}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                             <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                diff > 0 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                  : diff < 0 
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                                  : 'bg-secondary text-muted-foreground'
                             }`}>
                                Différence : {diff > 0 ? `+${diff}` : diff}
                             </span>
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-2.5">
                             {tStats.totalMatches > 0 ? `${(tStats.goalsScored / tStats.totalMatches).toFixed(1)} buts / match` : '0.0 but / match'}
                          </p>
                       </Card>

                       {/* Discipline (Soccer Cards) */}
                       <Card className="rounded-3xl border-border/80 bg-card p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-all group">
                          <div className="flex items-center justify-between mb-3">
                             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Discipline & Sanctions</span>
                             <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center transition-transform group-hover:scale-110">
                                <Activity className="w-4 h-4" />
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             {/* Yellow Card Soccer Badge */}
                             <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-b from-amber-300 to-amber-400 text-amber-950 font-black text-xs shadow-xs border border-amber-300/80">
                                <div className="w-2.5 h-3.5 bg-amber-500 rounded-[2px] shadow-inner" />
                                <span>{tStats.yellowCards}</span>
                             </div>
                             {/* Red Card Soccer Badge */}
                             <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 text-white font-black text-xs shadow-xs border border-rose-400/80">
                                <div className="w-2.5 h-3.5 bg-rose-700 rounded-[2px] shadow-inner" />
                                <span>{tStats.redCards}</span>
                             </div>
                          </div>
                          <div className="text-xs font-bold text-muted-foreground mt-2">
                             Total Cartons : <span className="text-foreground font-black">{totalCards}</span>
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-2.5">
                             {totalCards === 0 ? 'Discipline exemplaire' : `${totalCards} sanction${totalCards > 1 ? 's' : ''} enregistrée${totalCards > 1 ? 's' : ''}`}
                          </p>
                       </Card>

                       {/* Remplacements & Minutes */}
                       <Card className="rounded-3xl border-border/80 bg-card p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-all group">
                          <div className="flex items-center justify-between mb-3">
                             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Temps de Jeu & Rythme</span>
                             <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center transition-transform group-hover:scale-110">
                                <Clock className="w-4 h-4" />
                             </div>
                          </div>
                          <div className="text-3xl font-black text-foreground tracking-tight">
                             {tStats.totalMinutesPlayed.toLocaleString()} <span className="text-xs font-bold text-muted-foreground">min</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 mt-2">
                             <RefreshCw className="w-3 h-3 animate-spin-slow" />
                             <span>{tStats.substitutions} remplacements</span>
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-2.5">
                             {tStats.totalMatches > 0 ? `~${Math.round(tStats.totalMinutesPlayed / tStats.totalMatches)} min / match` : 'Temps calculé auto'}
                          </p>
                       </Card>
                    </div>

                    {/* Squad Detail Summary & Opponents Faced */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                       {/* Squad Breakdown */}
                       <Card className="lg:col-span-7 rounded-[2.5rem] border-border/80 bg-card p-6 md:p-8 space-y-6 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                             <div>
                                <h4 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                                   <Users className="w-4 h-4 text-primary" /> Répartition Tactique de l'Effectif
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5">Composition par lignes de jeu et postes clés</p>
                             </div>
                             <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider px-3 py-1 border-primary/20 text-primary w-fit">
                                {tStats.totalPlayers} Joueurs Actifs
                             </Badge>
                          </div>

                          {/* Tactical Proportional Progress Bar */}
                          {tStats.totalPlayers > 0 ? (
                             <div className="space-y-2">
                                <div className="h-3 w-full bg-secondary rounded-full overflow-hidden flex gap-0.5 p-0.5">
                                   {gkPct > 0 && <div style={{ width: `${gkPct}%` }} title={`Gardiens: ${tStats.goalkeepersCount} (${gkPct}%)`} className="bg-amber-500 rounded-sm transition-all" />}
                                   {dfPct > 0 && <div style={{ width: `${dfPct}%` }} title={`Défenseurs: ${tStats.defendersCount} (${dfPct}%)`} className="bg-blue-500 rounded-sm transition-all" />}
                                   {mfPct > 0 && <div style={{ width: `${mfPct}%` }} title={`Milieux: ${tStats.midfieldersCount} (${mfPct}%)`} className="bg-emerald-500 rounded-sm transition-all" />}
                                   {fwPct > 0 && <div style={{ width: `${fwPct}%` }} title={`Attaquants: ${tStats.forwardsCount} (${fwPct}%)`} className="bg-rose-500 rounded-sm transition-all" />}
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                   <span>GK ({gkPct}%)</span>
                                   <span>DF ({dfPct}%)</span>
                                   <span>MF ({mfPct}%)</span>
                                   <span>FW ({fwPct}%)</span>
                                </div>
                             </div>
                          ) : (
                             <div className="h-2 w-full bg-secondary rounded-full" />
                          )}

                          {/* 4 Position Metric Tiles */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                             {/* Gardiens */}
                             <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                   <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-black text-[9px] px-2 py-0.5">
                                      GK
                                   </Badge>
                                   <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{gkPct}%</span>
                                </div>
                                <div>
                                   <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{tStats.goalkeepersCount}</div>
                                   <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Gardiens</div>
                                </div>
                             </div>

                             {/* Défenseurs */}
                             <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                   <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-black text-[9px] px-2 py-0.5">
                                      DF
                                   </Badge>
                                   <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{dfPct}%</span>
                                </div>
                                <div>
                                   <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{tStats.defendersCount}</div>
                                   <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Défenseurs</div>
                                </div>
                             </div>

                             {/* Milieux */}
                             <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                   <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-black text-[9px] px-2 py-0.5">
                                      MF
                                   </Badge>
                                   <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{mfPct}%</span>
                                </div>
                                <div>
                                   <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{tStats.midfieldersCount}</div>
                                   <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Milieux</div>
                                </div>
                             </div>

                             {/* Attaquants */}
                             <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                   <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-black text-[9px] px-2 py-0.5">
                                      FW
                                   </Badge>
                                   <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">{fwPct}%</span>
                                </div>
                                <div>
                                   <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{tStats.forwardsCount}</div>
                                   <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Attaquants</div>
                                </div>
                             </div>
                          </div>

                          <Button 
                            variant="outline" 
                            onClick={() => handleOpenRoster(statsTeam)}
                            className="w-full h-12 rounded-2xl border-border hover:bg-secondary text-xs font-black uppercase tracking-wider gap-2 text-foreground transition-all shadow-xs"
                          >
                             <Users className="w-4 h-4 text-primary" />
                             Gérer les numéros de maillot & l'effectif complet →
                          </Button>
                       </Card>

                       {/* Opponents Faced */}
                       <Card className="lg:col-span-5 rounded-[2.5rem] border-border/80 bg-card p-6 md:p-8 space-y-6 shadow-sm flex flex-col justify-between">
                          <div className="space-y-1">
                             <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                                   <ShieldCheck className="w-4 h-4 text-primary" /> Clubs Adversaires ({tStats.opponentsFaced.length})
                                </h4>
                                <Badge variant="secondary" className="text-[10px] font-bold uppercase">Historique</Badge>
                             </div>
                             <p className="text-xs text-muted-foreground">Équipes affrontées lors des dernières rencontres</p>
                          </div>

                          {tStats.opponentsFaced.length > 0 ? (
                             <div className="flex flex-wrap gap-2.5 my-auto">
                                {tStats.opponentsFaced.map((oppName, idx) => {
                                   const oppClub = opponentClubs.find(c => c.name === oppName || c.id === oppName);
                                   return (
                                      <div key={idx} className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-secondary/50 text-foreground text-xs font-bold border border-border/70 shadow-xs hover:border-primary/30 transition-all">
                                         {oppClub?.logo_url ? (
                                            <img src={oppClub.logo_url} alt={oppName} className="w-5 h-5 object-contain shrink-0 rounded-md" />
                                         ) : (
                                            <Shield className="w-4 h-4 text-primary shrink-0" />
                                         )}
                                         <span className="font-extrabold">{oppName}</span>
                                      </div>
                                   );
                                })}
                             </div>
                          ) : (
                             <div className="py-8 text-center flex flex-col items-center justify-center my-auto bg-secondary/20 rounded-2xl border border-dashed border-border/70 p-6">
                                <Shield className="w-8 h-8 text-muted-foreground/40 mb-2" />
                                <p className="text-xs font-bold text-foreground uppercase tracking-wider">Aucune Confrontation</p>
                                <p className="text-[11px] text-muted-foreground mt-1 max-w-[240px]">
                                   Les clubs adverses s'afficheront automatiquement dès qu'un match sera planifié ou joué.
                                </p>
                             </div>
                          )}

                          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                             <span>Compétitions officielles FUS</span>
                             <span className="text-primary font-bold">Synchronisation en direct</span>
                          </div>
                       </Card>
                    </div>

                    {/* Match History List */}
                    <Card className="rounded-[2.5rem] border-border/80 bg-card p-6 md:p-8 space-y-6 shadow-sm">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                             <h4 className="text-base font-black uppercase tracking-wider text-foreground flex items-center gap-2.5">
                                <Calendar className="w-5 h-5 text-primary" /> Historique & Calendrier des Matchs ({teamMatches.length})
                             </h4>
                             <p className="text-xs text-muted-foreground mt-0.5">Calcul des scores, discipline et composition en direct</p>
                          </div>
                          <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase text-[10px] px-3 py-1 w-fit">
                             Calcul Automatisé
                          </Badge>
                       </div>

                       {teamMatches.length > 0 ? (
                          <div className="space-y-3">
                             {teamMatches.map((m) => {
                                const oppClub = opponentClubs.find(c => c.id === m.opponent_id);
                                const oppName = oppClub ? oppClub.name : (m.opponent_id ? 'Adversaire' : 'Adversaire non spécifié');
                                const isHome = m.is_home;
                                const homeScore = m.score_home ?? 0;
                                const awayScore = m.score_away ?? 0;
                                const scored = isHome ? homeScore : awayScore;
                                const conceded = isHome ? awayScore : homeScore;

                                let resultBadge = 'bg-secondary text-muted-foreground border-border';
                                let resultText = 'À VENIR';

                                if (m.status === 'finished') {
                                   if (scored > conceded) {
                                      resultBadge = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
                                      resultText = 'VICTOIRE';
                                   } else if (scored === conceded) {
                                      resultBadge = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
                                      resultText = 'NUL';
                                   } else {
                                      resultBadge = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
                                      resultText = 'DÉFAITE';
                                   }
                                } else if (m.status === 'live') {
                                   resultBadge = 'bg-rose-500 text-white animate-pulse border-rose-600';
                                   resultText = 'EN DIRECT';
                                }

                                return (
                                   <div key={m.id} className="p-4 md:p-5 rounded-2xl bg-secondary/30 border border-border/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-primary/20 transition-all">
                                      <div className="flex items-center gap-4">
                                         {/* Opponent Logo */}
                                         {oppClub?.logo_url ? (
                                            <img
                                               src={oppClub.logo_url}
                                               alt={oppName}
                                               className="w-12 h-12 rounded-xl object-contain p-1 border border-border bg-card shadow-xs shrink-0"
                                            />
                                         ) : (
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm shrink-0">
                                               <Shield className="w-6 h-6" />
                                            </div>
                                         )}

                                         <div>
                                            <div className="font-black text-base text-foreground flex items-center gap-2">
                                               <span>vs {oppName}</span>
                                               <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-card text-muted-foreground border border-border/80">
                                                  {isHome ? 'Domicile' : 'Extérieur'}
                                               </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-3 mt-1">
                                               <span>📅 {m.match_date}</span>
                                               {m.formation && <span className="font-semibold text-foreground">• Schéma : {m.formation}</span>}
                                            </div>
                                         </div>
                                      </div>

                                      <div className="flex items-center gap-4 self-end md:self-center">
                                         <div className="text-xl font-black text-foreground tracking-wider font-mono">
                                            {homeScore} — {awayScore}
                                         </div>
                                         <span className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase border ${resultBadge}`}>
                                            {resultText}
                                         </span>
                                      </div>
                                   </div>
                                );
                             })}
                          </div>
                       ) : (
                          <div className="py-14 text-center flex flex-col items-center justify-center bg-secondary/20 rounded-2xl border border-dashed border-border/70 p-8">
                             <Calendar className="w-10 h-10 text-muted-foreground/40 mb-3" />
                             <p className="text-sm font-black uppercase tracking-wider text-foreground">Aucune rencontre programmée</p>
                             <p className="text-xs text-muted-foreground mt-1 max-w-md">
                                Aucun match n'a encore été joué ou programmé pour l'équipe {statsTeam.name}. Les résultats et statistiques apparaîtront ici automatiquement dès l'enregistrement de matchs.
                             </p>
                          </div>
                       )}
                    </Card>
                  </>
                );
             })()}
          </motion.div>
        ) : (
          /* ROSTER VIEW (Team Roster & Player Assignment) */
          <motion.div
            key="roster"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-5xl mx-auto"
          >
             {rosterTeam && (
               <div className="space-y-10">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-card border border-border/80 p-6 md:p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden">
                     <div className="flex items-center gap-5">
                        <Button 
                          variant="outline" 
                          onClick={() => { setViewState('LIST'); setIsAssignMode(false); }} 
                          className="h-12 px-4 rounded-2xl bg-card border-border hover:bg-secondary/80 text-foreground font-black uppercase tracking-wider text-xs gap-2 shrink-0 shadow-xs transition-all hover:-translate-x-0.5"
                        >
                          <ArrowLeft className="w-4 h-4 text-primary" />
                          <span className="hidden sm:inline">Équipes</span>
                        </Button>
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-secondary border border-primary/20 flex items-center justify-center p-2.5 shadow-inner shrink-0 relative">
                           {mainClub?.logo_url ? (
                              <img src={mainClub.logo_url} alt="Club" className="w-full h-full object-contain drop-shadow-sm" />
                           ) : (
                              <Shield className="w-7 h-7 text-primary" />
                           )}
                           <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-primary text-[9px] font-black text-white uppercase shadow-xs">
                              {rosterTeam.category}
                           </span>
                        </div>
                        <div>
                           <div className="flex items-center gap-3">
                              <h3 className="text-2xl md:text-3xl font-black tracking-tight uppercase italic text-foreground">{rosterTeam.name}</h3>
                              <Badge className="bg-primary text-primary-foreground font-black uppercase px-3.5 py-1 border-none text-[10px] shadow-sm shadow-primary/25">{rosterTeam.category}</Badge>
                           </div>
                           <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">
                              Effectif Officiel • {rosterOfficialPlayers.length} Athlètes
                            </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <Button
                          variant="outline"
                          onClick={() => handleOpenStats(rosterTeam)}
                          className="rounded-2xl h-12 px-5 font-black uppercase tracking-widest text-xs gap-2 border-border hover:bg-secondary shadow-xs"
                        >
                           <BarChart3 className="w-4 h-4 text-primary" /> Voir Stats
                        </Button>
                        <Button 
                           variant={isAssignMode ? "default" : "outline"} 
                           onClick={() => setIsAssignMode(!isAssignMode)} 
                           className={`rounded-2xl h-12 px-6 font-black uppercase tracking-widest text-xs gap-2.5 shadow-md transition-all ${isAssignMode ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20' : 'border-border hover:bg-secondary'}`}
                        >
                           {isAssignMode ? 'Fermer Gestion' : 'Gérer l\'Effectif'} <UserCog className="w-4 h-4" />
                        </Button>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                     <div className={isAssignMode ? "lg:col-span-7 space-y-6" : "lg:col-span-12 space-y-6"}>
                        {/* SECTION 1 : EFFECTIF OFFICIEL (SIGNÉS) */}
                        <Card className="border-border shadow-xl rounded-3xl bg-card overflow-hidden p-6 md:p-8">
                           <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-5 flex items-center gap-3">
                              <div className="w-8 h-px bg-primary/30" /> Effectif Officiel ({rosterOfficialPlayers.length})
                           </h4>
                           
                           <div className={`grid gap-3 ${isAssignMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
                              {rosterOfficialPlayers.length > 0 ? (
                                 rosterOfficialPlayers.map(player => {
                                    const originCat = surclassedOriginMap[player.id];
                                    const isSurclasse = !!originCat;
                                    const displayJersey = surclassedJerseyMap[player.id] ?? player.jersey_number;
                                    const isEditingJersey = editingJerseyId === player.id;
                                    return (
                                       <motion.div key={player.id} layout className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${isAssignMode ? 'bg-red-50/20 border-red-100 dark:bg-red-950/20 dark:border-red-900/30' : isSurclasse ? 'bg-amber-50/30 border-amber-200 dark:bg-amber-950/20' : 'bg-secondary/20 border-border'} group`}>
                                          <div className="w-11 h-11 bg-card rounded-xl overflow-hidden flex items-center justify-center relative shrink-0 border border-border shadow-xs">
                                             <img src={(player.photo_url && player.photo_url !== 'null') ? player.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=random&color=fff&size=200`} alt={player.full_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                          </div>
                                       <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <h4 className="font-black text-sm uppercase truncate leading-tight text-foreground">{player.full_name}</h4>
                                            {isSurclasse && (() => {
                                              const isSousClasse = isLowerCategory(originCat, rosterTeam?.category ?? '');
                                              return (
                                                <span className={`shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase border ${
                                                  isSousClasse
                                                    ? 'bg-sky-100 border-sky-200 text-sky-700'
                                                    : 'bg-amber-100 border-amber-200 text-amber-700'
                                                }`}>
                                                  {isSousClasse ? '↓' : '↑'} {originCat}
                                                </span>
                                              );
                                            })()}
                                          </div>
                                          <div className="flex items-center gap-2 mt-1.5">
                                             {isEditingJersey ? (
                                               <div className="flex items-center gap-1.5">
                                                 <span className="text-[9px] font-black text-muted-foreground">#</span>
                                                 <input
                                                   type="number"
                                                   min={1} max={99}
                                                   autoFocus
                                                   value={editingJerseyValue}
                                                   onChange={e => setEditingJerseyValue(e.target.value)}
                                                   onBlur={async () => {
                                                     const n = parseInt(editingJerseyValue, 10);
                                                     if (!isNaN(n) && n > 0 && n !== player.jersey_number) {
                                                       try {
                                                         await updatePlayer({ id: player.id, data: { jersey_number: n } as any });
                                                       } catch {
                                                         setEditingJerseyValue(String(player.jersey_number ?? ''));
                                                         return;
                                                       }
                                                     }
                                                     setEditingJerseyId(null);
                                                   }}
                                                   onKeyDown={async e => {
                                                     if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                                     if (e.key === 'Escape') setEditingJerseyId(null);
                                                   }}
                                                   className="w-12 px-1 py-0.5 text-xs font-black text-center rounded-md border-2 border-primary bg-primary/5 focus:outline-none focus:ring-1 focus:ring-primary/30"
                                                 />
                                                 <span className="text-[8px] text-muted-foreground">↵</span>
                                               </div>
                                             ) : (
                                               <div className="flex items-center gap-1.5">
                                                 <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                                   #{displayJersey ?? '—'}
                                                   {isSurclasse && surclassedJerseyMap[player.id] != null && (
                                                     <span className="ml-0.5 text-amber-500 text-[8px]">(surclassé)</span>
                                                   )}
                                                 </span>
                                                 <button
                                                   onMouseDown={e => e.stopPropagation()}
                                                   onClick={e => {
                                                     e.stopPropagation();
                                                     e.preventDefault();
                                                     setEditingJerseyId(player.id);
                                                     setEditingJerseyValue(String(player.jersey_number ?? ''));
                                                   }}
                                                   title="Modifier le numéro de maillot"
                                                   className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-border bg-card hover:border-primary hover:text-primary text-muted-foreground transition-all text-[8px] font-black uppercase cursor-pointer"
                                                 >
                                                   <Edit2 className="w-2 h-2" />
                                                   Modifier
                                                 </button>
                                               </div>
                                             )}
                                             <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest h-4 px-1.5">{player.position}</Badge>
                                          </div>
                                       </div>
                                       {isAssignMode && !isSurclasse && (
                                          <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            onClick={() => handleRemovePlayer(player)} 
                                            title="Retirer de l'équipe"
                                            className="h-8 w-8 rounded-lg bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all shrink-0"
                                          >
                                             <X className="w-4 h-4" />
                                          </Button>
                                       )}
                                    </motion.div>
                                    );
                                 })
                              ) : (
                                 <div className="col-span-full flex flex-col items-center justify-center py-12 text-center opacity-40 border-2 border-dashed border-border rounded-2xl">
                                    <Users className="w-10 h-10 mb-3" />
                                    <p className="text-xs font-black uppercase tracking-widest">Effectif Officiel Vide</p>
                                 </div>
                              )}
                           </div>
                        </Card>
                     </div>

                     {isAssignMode && (
                        <div className="lg:col-span-5">
                           <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                              <Card className="border-border shadow-2xl rounded-[3rem] bg-card overflow-hidden p-8 md:p-10">
                                 <div className="flex items-center justify-between gap-3 mb-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
                                       <div className="w-8 h-px bg-emerald-400" /> Joueurs Disponibles ({rosterTeam.category})
                                    </h4>
                                    {availablePlayers.length > 0 && (
                                       <button
                                         type="button"
                                         onClick={handleSelectAllAvailable}
                                         className="text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
                                       >
                                          {selectedAvailableIds.length === availablePlayers.length ? (
                                             <>
                                                <CheckSquare className="w-3.5 h-3.5 text-primary" /> Tout désélectionner
                                             </>
                                          ) : (
                                             <>
                                                <Square className="w-3.5 h-3.5" /> Tout cocher ({availablePlayers.length})
                                             </>
                                          )}
                                       </button>
                                    )}
                                 </div>

                                 {/* BARRE D'ACTIONS GROUPÉES / BATCH */}
                                 <AnimatePresence>
                                    {selectedAvailableIds.length > 0 && (
                                       <motion.div
                                          initial={{ opacity: 0, y: -10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          exit={{ opacity: 0, y: -10 }}
                                          className="mb-6 p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3"
                                       >
                                          <div className="flex items-center gap-2">
                                             <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-black">
                                                {selectedAvailableIds.length}
                                             </span>
                                             <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                                                {selectedAvailableIds.length > 1 ? 'Joueurs cochés' : 'Joueur coché'}
                                             </span>
                                          </div>
                                          <div className="flex items-center gap-2 flex-wrap justify-end">
                                             <Button
                                                size="sm"
                                                onClick={handleBatchAssignPlayers}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl gap-1.5 shadow-sm"
                                                title="Ajouter tous les joueurs sélectionnés à l'équipe"
                                             >
                                                <Plus className="w-3.5 h-3.5" /> Ajouter ({selectedAvailableIds.length})
                                             </Button>
                                             <button
                                                onClick={() => setSelectedAvailableIds([])}
                                                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
                                             >
                                                Annuler
                                             </button>
                                          </div>
                                       </motion.div>
                                    )}
                                 </AnimatePresence>

                                 <div className="space-y-3.5 max-h-[600px] overflow-y-auto no-scrollbar pr-1">
                                    {availablePlayers.length > 0 ? (
                                       availablePlayers.map(player => {
                                          const isChecked = selectedAvailableIds.includes(player.id);
                                          return (
                                             <div 
                                               key={player.id} 
                                               onClick={() => toggleSelectAvailable(player.id)}
                                               className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer group ${
                                                 isChecked
                                                   ? 'border-emerald-500 bg-emerald-500/15 shadow-xs'
                                                   : 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40'
                                               }`}
                                             >
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelectAvailable(player.id);
                                                  }}
                                                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                                                >
                                                   {isChecked ? (
                                                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                                                   ) : (
                                                      <Square className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground" />
                                                   )}
                                                </button>
                                                <div className="w-10 h-10 min-w-[40px] max-w-[40px] min-h-[40px] max-h-[40px] bg-card rounded-xl overflow-hidden flex items-center justify-center relative shrink-0 shadow-xs border border-emerald-500/20">
                                                   <img src={(player.photo_url && player.photo_url !== 'null') ? player.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=random&color=fff&size=200`} alt={player.full_name} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                   <h4 className="font-black text-xs uppercase truncate text-foreground leading-tight">{player.full_name}</h4>
                                                   <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mt-1">#{player.jersey_number ?? '—'} • {player.position}</p>
                                                </div>
                                                <Button 
                                                  size="icon" 
                                                  variant="ghost" 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAssignPlayer(player);
                                                  }} 
                                                  title="Ajouter à l'effectif"
                                                  className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white shrink-0 shadow-xs transition-all"
                                                >
                                                   <Plus className="w-3.5 h-3.5" />
                                                </Button>
                                             </div>
                                          );
                                       })
                                    ) : (
                                       <div className="text-center py-10 opacity-40">
                                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aucun joueur disponible en {rosterTeam.category}.</p>
                                       </div>
                                    )}
                                 </div>
                               </Card>
                            </motion.div>
                        </div>
                     )}
                  </div>
               </div>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeamManagement;
