import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { motion } from 'framer-motion';
import { useMatches } from '../hooks/useMatches';
import type { Match } from '../types';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border rounded-xl shadow-xl p-3 ring-1 ring-black/5">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-2">{label}</p>
        <p className="text-sm font-bold text-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          {payload[0].value} Matchs
        </p>
      </div>
    );
  }
  return null;
};

const MatchesPerMonthChart: React.FC = () => {
  const { matches } = useMatches();

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  
  const matchData = useMemo(() => {
    return months.map((month, index) => {
      const count = matches.filter((m: Match) => {
        const matchDate = new Date(m.match_date);
        return matchDate.getMonth() === index;
      }).length;
      return { month, matches: count };
    });
  }, [matches]);

  const maxMatches = useMemo(() => Math.max(...matchData.map(d => d.matches), 1), [matchData]);
  
  const highSeasonText = useMemo(() => {
    const highSeasonMonths = matchData.filter(d => d.matches >= maxMatches * 0.9 && d.matches > 0);
    const fullMonths: Record<string, string> = {
      'Jan': 'Janvier', 'Fév': 'Février', 'Mar': 'Mars', 'Avr': 'Avril',
      'Mai': 'Mai', 'Juin': 'Juin', 'Juil': 'Juillet', 'Août': 'Août',
      'Sep': 'Septembre', 'Oct': 'Octobre', 'Nov': 'Novembre', 'Déc': 'Décembre'
    };
    return highSeasonMonths.map(d => fullMonths[d.month] || d.month).join(' & ') || 'N/A';
  }, [matchData, maxMatches]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="hover:shadow-md transition-shadow border">
        <CardHeader className="flex-row items-center justify-between pb-8">
          <div className="space-y-1">
            <CardTitle className="text-lg tracking-tight">Volume de Matchs par Mois</CardTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              Haute saison : <span className="text-primary font-bold">{highSeasonText}</span>
            </p>
          </div>
          <Badge variant="secondary" className="font-mono text-[10px]">SAISON 2024</Badge>
        </CardHeader>
        <CardContent className="pb-10">
          <div className="h-[400px] w-full relative">
            <ResponsiveContainer width="100%" height={350} debounce={50}>
              <BarChart data={matchData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="matchGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }}
                  dy={15}
                  padding={{ left: 20, right: 20 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', radius: 4 }} />
                <Bar
                  dataKey="matches"
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                  animationBegin={200}
                  animationDuration={1200}
                >
                  {matchData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.matches >= maxMatches * 0.9 && entry.matches > 0 ? 'url(#matchGradient)' : 'hsl(var(--primary) / 0.15)'}
                      className="hover:fill-primary transition-all duration-300"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MatchesPerMonthChart;
