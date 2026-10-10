import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { motion } from 'framer-motion';
import { usePlayers } from '../hooks/usePlayers';
import { useMatches } from '../hooks/useMatches';
import { useAdvancedDashboardStats } from '../hooks/useAdvancedDashboardStats';
import { Filter, Calendar, Users, Trophy, ChevronRight, Crown } from 'lucide-react';
import type { Player, AgeCategory } from '../types';
import { PLAYER_CATEGORIES, normalizeAgeCategory } from '../constants';
import TopScorerHeroCard from './TopScorerHeroCard';
import type { TopScorerData } from './TopScorerHeroCard';

interface TopScorersProps {
  onSelectPlayer?: (player: Player) => void;
}

const CATEGORIES = PLAYER_CATEGORIES;
const MONTHS = [
  { value: 'all', label: 'Toute l\'année' },
  { value: '0', label: 'Janvier' }, { value: '1', label: 'Février' },
  { value: '2', label: 'Mars' }, { value: '3', label: 'Avril' },
  { value: '4', label: 'Mai' }, { value: '5', label: 'Juin' },
  { value: '6', label: 'Juillet' }, { value: '7', label: 'Août' },
  { value: '8', label: 'Septembre' }, { value: '9', label: 'Octobre' },
  { value: '10', label: 'Novembre' }, { value: '11', label: 'Décembre' }
];
const TRIMESTERS = [
  { value: 'all', label: 'Tous les trimestres' },
  { value: '1', label: 'T1 (Jan-Mar)' },
  { value: '2', label: 'T2 (Avr-Jun)' },
  { value: '3', label: 'T3 (Jul-Sep)' },
  { value: '4', label: 'T4 (Oct-Déc)' }
];

export const TopScorers: React.FC<TopScorersProps> = ({ onSelectPlayer }) => {
  const { players } = usePlayers();
  const { matches } = useMatches();
  const { data: statsData } = useAdvancedDashboardStats();

  const [selectedCategory, setSelectedCategory] = useState<AgeCategory | 'ALL'>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedTrimester, setSelectedTrimester] = useState<string>('all');

  const scorers: TopScorerData[] = useMemo(() => {
    const events = statsData?.events || [];
    const finishedMatches = matches.filter(m => m.status === 'finished');

    // Filter matches by period
    const filteredMatches = finishedMatches.filter(m => {
      const matchDate = new Date(m.match_date);
      const matchMonth = matchDate.getMonth();
      const matchTrimester = Math.floor(matchMonth / 3) + 1;

      if (selectedMonth !== 'all' && matchMonth !== parseInt(selectedMonth)) return false;
      if (selectedTrimester !== 'all' && matchTrimester !== parseInt(selectedTrimester)) return false;
      if (selectedCategory !== 'ALL' && normalizeAgeCategory(m.category) !== selectedCategory) return false;

      return true;
    });

    const matchIds = new Set(filteredMatches.map(m => m.id));

    // Calculate goals per player from events
    const playerGoals = new Map<string, number>();
    const playerAssists = new Map<string, number>();
    const playerMatches = new Map<string, Set<string>>();

    events.forEach(e => {
      if (!matchIds.has(e.match_id)) return;

      if (e.type === 'goal' && e.player_id) {
        playerGoals.set(e.player_id, (playerGoals.get(e.player_id) || 0) + 1);
      }
      if (e.type === 'assist' && e.player_id) {
        playerAssists.set(e.player_id, (playerAssists.get(e.player_id) || 0) + 1);
      }
    });

    // Count matches played per player
    filteredMatches.forEach(m => {
      const lineup = m.lineup as { startingXI?: string[]; substitutes?: string[] } | undefined;
      if (lineup?.startingXI) {
        lineup.startingXI.forEach(id => {
          if (!playerMatches.has(id)) playerMatches.set(id, new Set());
          playerMatches.get(id)!.add(m.id);
        });
      }
      if (lineup?.substitutes) {
        lineup.substitutes.forEach(id => {
          if (!playerMatches.has(id)) playerMatches.set(id, new Set());
          playerMatches.get(id)!.add(m.id);
        });
      }
    });

    return players
      .map(p => ({
        ...p,
        goals: playerGoals.get(p.id) || 0,
        assists: playerAssists.get(p.id) || 0,
        played: playerMatches.get(p.id)?.size || 0,
        category: (p as any).category || 'Senior'
      }))
      .filter(p => p.goals > 0 || p.played > 0)
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
      .slice(0, 10);
  }, [players, matches, statsData, selectedCategory, selectedMonth, selectedTrimester]);

  const topScorer = scorers.length > 0 ? scorers[0] : null;

  const currentPeriodLabel = useMemo(() => {
    if (selectedMonth !== 'all') {
      const m = MONTHS.find(x => x.value === selectedMonth);
      return m ? m.label : 'Mois sélectionné';
    }
    if (selectedTrimester !== 'all') {
      const t = TRIMESTERS.find(x => x.value === selectedTrimester);
      return t ? t.label : 'Trimestre sélectionné';
    }
    return 'Toute la Saison';
  }, [selectedMonth, selectedTrimester]);

  const currentCategoryLabel = selectedCategory === 'ALL' ? 'Toutes Catégories' : selectedCategory;

  const handlePlayerClick = (p: Player) => {
    if (onSelectPlayer) {
      onSelectPlayer(p);
    }
  };

  return (
    <div className="space-y-6">
      {/* 2-Column Responsive Layout: Golden Boot Hero Card + Full Top Scorers Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: #1 Top Scorer Hero Card */}
        <div className="lg:col-span-5 flex flex-col">
          <TopScorerHeroCard
            topScorer={topScorer}
            onSelectPlayer={handlePlayerClick}
            periodLabel={currentPeriodLabel}
            categoryLabel={currentCategoryLabel}
          />
        </div>

        {/* Right Column: Full Leaderboard & Filters */}
        <div className="lg:col-span-7 flex flex-col">
          <Card className="h-full border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col justify-between">
            <CardHeader className="p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 pb-3 sm:pb-4">
              <div className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-foreground">
                      Classement des Buteurs
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-medium">
                      Cliquez sur une ligne pour afficher les détails du joueur
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/20">
                  <Filter className="w-3 h-3 mr-1" />
                  {scorers.length} Classés
                </Badge>
              </div>

              {/* Filters Toolbar */}
              <div className="flex flex-wrap gap-2 pt-1">
                {/* Category Filter */}
                <div className="flex items-center gap-1.5 bg-secondary/50 dark:bg-secondary/20 rounded-xl px-2.5 py-1.5 border border-slate-200/60 dark:border-slate-800">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as AgeCategory | 'ALL')}
                    className="bg-transparent text-[11px] font-bold outline-none border-none cursor-pointer text-foreground"
                  >
                    <option value="ALL">Toutes catégories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Month Filter */}
                <div className="flex items-center gap-1.5 bg-secondary/50 dark:bg-secondary/20 rounded-xl px-2.5 py-1.5 border border-slate-200/60 dark:border-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      if (e.target.value !== 'all') setSelectedTrimester('all');
                    }}
                    className="bg-transparent text-[11px] font-bold outline-none border-none cursor-pointer text-foreground"
                  >
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>

                {/* Trimester Filter */}
                <div className="flex items-center gap-1.5 bg-secondary/50 dark:bg-secondary/20 rounded-xl px-2.5 py-1.5 border border-slate-200/60 dark:border-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <select
                    value={selectedTrimester}
                    onChange={(e) => {
                      setSelectedTrimester(e.target.value);
                      if (e.target.value !== 'all') setSelectedMonth('all');
                    }}
                    className="bg-transparent text-[11px] font-bold outline-none border-none cursor-pointer text-foreground"
                  >
                    {TRIMESTERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 overflow-x-auto flex-1">
              {scorers.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed">
                  Aucun buteur enregistré pour ces filtres.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-200 dark:border-slate-800">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-12 text-center">Rang</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Joueur & Catégorie</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Buts (B)</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Passes (P)</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Matchs (M)</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scorers.map((scorer, index) => {
                      const photo = (scorer.photo_url && scorer.photo_url !== 'null') 
                        ? scorer.photo_url 
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(scorer.full_name)}&background=e03d3d&color=fff&size=150`;

                      return (
                        <motion.tr
                          key={scorer.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handlePlayerClick(scorer)}
                          className="group border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        >
                          <TableCell className="text-center font-black text-xs text-muted-foreground py-3">
                            {index === 0 ? (
                              <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] inline-flex items-center justify-center shadow-sm">
                                1
                              </span>
                            ) : index === 1 ? (
                              <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-black text-[11px] inline-flex items-center justify-center">
                                2
                              </span>
                            ) : index === 2 ? (
                              <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-black text-[11px] inline-flex items-center justify-center">
                                3
                              </span>
                            ) : (
                              `#${index + 1}`
                            )}
                          </TableCell>

                          <TableCell className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-2xl bg-secondary overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800 group-hover:ring-primary/40 transition-all shrink-0">
                                <img
                                  src={photo}
                                  alt={scorer.full_name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                  onError={(e) => {
                                    (e.target as HTMLElement).setAttribute('src', `https://ui-avatars.com/api/?name=${encodeURIComponent(scorer.full_name)}&background=e03d3d&color=fff&size=150`);
                                  }}
                                />
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                  {scorer.full_name}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                  #{scorer.jersey_number ?? '-'} • {scorer.position || 'FW'} • {scorer.category || 'Senior'}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-center py-3">
                            <span className="text-sm font-black text-amber-500">{scorer.goals}</span>
                          </TableCell>

                          <TableCell className="text-center py-3">
                            <span className="text-xs font-bold text-rose-400">{scorer.assists}</span>
                          </TableCell>

                          <TableCell className="text-center py-3">
                            <span className="text-xs font-bold text-muted-foreground">{scorer.played}</span>
                          </TableCell>

                          <TableCell className="text-right py-3 pr-2">
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default TopScorers;
