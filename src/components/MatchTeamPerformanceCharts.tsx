import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Shield, 
  Swords, 
  Calendar, 
  Activity, 
  CheckCircle2, 
  Zap, 
  Radio
} from 'lucide-react';
import { useMatches } from '../hooks/useMatches';
import { useTeams } from '../hooks/useTeams';
import type { Match, AgeCategory } from '../types';
import { PLAYER_CATEGORIES, normalizeAgeCategory } from '../constants';

const CATEGORIES: (AgeCategory | 'ALL')[] = ['ALL', ...PLAYER_CATEGORIES];

export const MatchTeamPerformanceCharts: React.FC = () => {
  const { matches } = useMatches();
  const { teams } = useTeams();
  const [selectedCategory, setSelectedCategory] = useState<AgeCategory | 'ALL'>('ALL');
  const [chartView, setChartView] = useState<'goals' | 'points'>('goals');

  // Filter matches by category
  const filteredMatches = useMemo(() => {
    if (selectedCategory === 'ALL') return matches;
    return matches.filter(m => normalizeAgeCategory(m.category) === selectedCategory);
  }, [matches, selectedCategory]);

  const finishedMatches = useMemo(() => {
    return filteredMatches
      .filter(m => m.status === 'finished')
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
  }, [filteredMatches]);

  const liveMatches = useMemo(() => {
    return filteredMatches.filter(m => m.status === 'in_progress');
  }, [filteredMatches]);

  const upcomingMatches = useMemo(() => {
    return filteredMatches.filter(m => m.status === 'scheduled');
  }, [filteredMatches]);

  // Overall KPIs calculation
  const stats = useMemo(() => {
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsScored = 0;
    let goalsConceded = 0;
    let cleanSheets = 0;
    let homeMatches = 0;
    let homeWins = 0;
    let awayMatches = 0;
    let awayWins = 0;

    finishedMatches.forEach(m => {
      const ourScore = m.is_home ? m.score_home : m.score_away;
      const oppScore = m.is_home ? m.score_away : m.score_home;

      goalsScored += ourScore;
      goalsConceded += oppScore;

      if (oppScore === 0) cleanSheets++;

      if (m.is_home) {
        homeMatches++;
        if (ourScore > oppScore) homeWins++;
      } else {
        awayMatches++;
        if (ourScore > oppScore) awayWins++;
      }

      if (ourScore > oppScore) wins++;
      else if (ourScore === oppScore) draws++;
      else losses++;
    });

    const totalFinished = finishedMatches.length;
    const winRate = totalFinished > 0 ? Math.round((wins / totalFinished) * 100) : 0;
    const avgGoals = totalFinished > 0 ? (goalsScored / totalFinished).toFixed(1) : '0.0';
    const totalPoints = wins * 3 + draws * 1;
    const homeWinRate = homeMatches > 0 ? Math.round((homeWins / homeMatches) * 100) : 0;
    const awayWinRate = awayMatches > 0 ? Math.round((awayWins / awayMatches) * 100) : 0;

    return {
      totalFinished,
      wins,
      draws,
      losses,
      goalsScored,
      goalsConceded,
      cleanSheets,
      winRate,
      avgGoals,
      totalPoints,
      homeWinRate,
      awayWinRate,
      homeMatches,
      awayMatches,
    };
  }, [finishedMatches]);

  // Data for Monthly / Timeline Curves
  const timelineData = useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    let runningPoints = 0;

    const monthlyMap = new Map<number, {
      month: string;
      scored: number;
      conceded: number;
      wins: number;
      draws: number;
      losses: number;
      points: number;
      cumulativePoints: number;
      matchesCount: number;
    }>();

    // Initialize months
    months.forEach((m, idx) => {
      monthlyMap.set(idx, {
        month: m,
        scored: 0,
        conceded: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        cumulativePoints: 0,
        matchesCount: 0,
      });
    });

    finishedMatches.forEach(m => {
      const d = new Date(m.match_date);
      const mIdx = d.getMonth();
      const item = monthlyMap.get(mIdx);
      if (!item) return;

      const ourScore = m.is_home ? m.score_home : m.score_away;
      const oppScore = m.is_home ? m.score_away : m.score_home;

      item.scored += ourScore;
      item.conceded += oppScore;
      item.matchesCount++;

      if (ourScore > oppScore) {
        item.wins++;
        item.points += 3;
      } else if (ourScore === oppScore) {
        item.draws++;
        item.points += 1;
      } else {
        item.losses++;
      }
    });

    // Compute cumulative points
    const result: Array<{
      month: string;
      scored: number;
      conceded: number;
      points: number;
      cumulativePoints: number;
      matchesCount: number;
    }> = [];

    monthlyMap.forEach((val) => {
      runningPoints += val.points;
      result.push({
        ...val,
        cumulativePoints: runningPoints,
      });
    });

    return result;
  }, [finishedMatches]);

  return (
    <div className="space-y-6">
      {/* Live Match Alert Banner if any match is active */}
      {liveMatches.length > 0 && (
        <div className="p-4 rounded-3xl bg-rose-600 text-white shadow-xl flex items-center justify-between flex-wrap gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-white text-rose-600 font-black text-[10px] uppercase">
                  EN DIRECT • MATCH DAY
                </Badge>
                <span className="font-bold text-sm">
                  {liveMatches[0].is_home ? 'FUS Rabat' : 'Extérieur'} vs {liveMatches[0].opponent_id || 'Adversaire'}
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                Score actuel : <strong>{liveMatches[0].score_home} - {liveMatches[0].score_away}</strong> ({liveMatches[0].category})
              </p>
            </div>
          </div>
          <a
            href="/matchday"
            className="px-4 py-2 rounded-xl bg-white text-rose-600 font-black text-xs uppercase tracking-wider shadow hover:bg-rose-50 transition-colors"
          >
            Suivre en Direct
          </a>
        </div>
      )}

      {/* Main KPI Row for Matches & Teams */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Matchs Joués</span>
            <Trophy className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground">{stats.totalFinished}</p>
          <span className="text-[10px] text-muted-foreground font-medium mt-1">
            {upcomingMatches.length} à venir
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Taux Victoires</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.winRate}%</p>
          <span className="text-[10px] text-muted-foreground font-medium mt-1">
            {stats.wins}V • {stats.draws}N • {stats.losses}D
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Buts Marqués</span>
            <Target className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-500">{stats.goalsScored}</p>
          <span className="text-[10px] text-muted-foreground font-medium mt-1">
            Moy. {stats.avgGoals} / match
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Buts Encaissés</span>
            <Shield className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-blue-500">{stats.goalsConceded}</p>
          <span className="text-[10px] text-muted-foreground font-medium mt-1">
            Diff. {stats.goalsScored - stats.goalsConceded > 0 ? `+${stats.goalsScored - stats.goalsConceded}` : stats.goalsScored - stats.goalsConceded}
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Cage Inviolée</span>
            <CheckCircle2 className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">{stats.cleanSheets}</p>
          <span className="text-[10px] text-muted-foreground font-medium mt-1">
            Clean Sheets
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Points Saison</span>
            <Zap className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">{stats.totalPoints}</p>
          <span className="text-[10px] text-muted-foreground font-medium mt-1">
            Dom {stats.homeWinRate}% • Ext {stats.awayWinRate}%
          </span>
        </div>
      </div>

      {/* Main Curve Chart Card */}
      <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-3xl p-6">
        <CardHeader className="p-0 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-black uppercase tracking-tight text-foreground">
                Dynamique & Courbes de Performance des Matchs
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-black uppercase bg-primary/10 text-primary border-primary/20">
                Saison en Cours
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Suivi mensuel des buts marqués vs concédés et de la trajectoire des points
            </p>
          </div>

          {/* Filters & View Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View switcher */}
            <div className="flex items-center gap-1 bg-secondary/60 dark:bg-secondary/30 p-1 rounded-2xl border">
              <button
                type="button"
                onClick={() => setChartView('goals')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  chartView === 'goals'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ⚽ Buts Marqués / Encaissés
              </button>
              <button
                type="button"
                onClick={() => setChartView('points')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  chartView === 'points'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                📈 Trajectoire de Points
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1 bg-secondary/60 dark:bg-secondary/30 px-3 py-1.5 rounded-2xl border">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="bg-transparent text-xs font-black outline-none cursor-pointer text-foreground"
              >
                <option value="ALL">Toutes catégories</option>
                {CATEGORIES.filter(c => c !== 'ALL').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 pt-2">
          <div className="h-[340px] w-full min-w-0" style={{ width: '100%', height: 340, minHeight: 340 }}>
            <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={340}>
              {chartView === 'goals' ? (
                <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoredGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e03d3d" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#e03d3d" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="concededGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '16px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    name="Buts Marqués (FUS)"
                    dataKey="scored"
                    stroke="#e03d3d"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#scoredGradient)"
                  />
                  <Area
                    type="monotone"
                    name="Buts Encaissés"
                    dataKey="conceded"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#concededGradient)"
                  />
                </AreaChart>
              ) : (
                <LineChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '16px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    name="Points Cumulés (Victoire=3, Nul=1)"
                    dataKey="cumulativePoints"
                    stroke="#10b981"
                    strokeWidth={3.5}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    type="monotone"
                    name="Points du Mois"
                    dataKey="points"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchTeamPerformanceCharts;
