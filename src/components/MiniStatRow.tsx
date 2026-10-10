import React from 'react';
import { 
  Users, 
  Trophy, 
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { useMatches } from '../hooks/useMatches';
import { usePlayers } from '../hooks/usePlayers';

const MiniStatRow: React.FC = () => {
  const { matches } = useMatches();
  const { players } = usePlayers();

  const totalPlayers = players.length;
  const totalMatches = matches.length;
  
  const stats = [
    {
      id: 'stat-players',
      label: 'Joueurs Total',
      value: totalPlayers.toString(),
      change: '+12%',
      positive: true,
      icon: Users,
      color: '#3b82f6',
    },
    {
      id: 'stat-matches',
      label: 'Matchs Planifiés',
      value: totalMatches.toString(),
      change: 'Active',
      positive: true,
      icon: Trophy,
      color: '#e03d3d',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" id="mini-stat-row">
      {stats.map((s, idx) => {
        const Icon = s.icon;
        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            whileHover={{ y: -5 }}
          >
            <Card className="hover:shadow-lg shadow-sm border overflow-hidden relative group rounded-2xl sm:rounded-3xl">
              <CardContent className="p-3.5 sm:p-5">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div 
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm shrink-0"
                    style={{ background: `${s.color}15`, color: s.color }}
                  >
                    <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className={cn(
                    "flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    s.positive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                  )}>
                    {s.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    <span>{s.change}</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-foreground tracking-tight">{s.value}</p>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <p className="text-xs font-medium uppercase tracking-widest opacity-80">{s.label}</p>
                    <div className="w-full max-w-[60px] h-[2px] bg-muted relative rounded-full overflow-hidden">
                      <motion.div 
                        className="absolute inset-y-0 left-0"
                        initial={{ width: 0 }}
                        animate={{ width: "65%" }}
                        transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                        style={{ background: s.color }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-muted/20 blur-2xl group-hover:bg-primary/5 transition-colors duration-500" />
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

export default MiniStatRow;
