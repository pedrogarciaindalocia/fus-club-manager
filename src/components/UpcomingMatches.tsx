import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { MapPin, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMatches } from '../hooks/useMatches';
import { useClubData } from '../hooks/useClubData';
import { useCompetitions } from '../hooks/useCompetitions';

const UpcomingMatches: React.FC = () => {
  const { matches } = useMatches();
  const { opponentClubs } = useClubData();
  const { stadiums, leagues } = useCompetitions();

  const upcomingMatches = [...matches]
    .filter(m => m.status === 'planned' || m.status === 'scheduled')
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());

  const getOpponentName = (id: string) => opponentClubs.find(c => c.id === id)?.name || 'Adversaire inconnu';
  const getStadiumName = (id: string) => stadiums.find(s => s.id === id)?.name || 'Lieu inconnu';
  const getLeagueName = (id?: string) => leagues.find(l => l.id === id)?.name || '';

  return (
    <Card className="h-full border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold tracking-tight">Matchs à venir</CardTitle>
        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest bg-secondary/50 font-black cursor-pointer">Voir tout</Badge>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {upcomingMatches.length === 0 && (
            <div className="p-8 text-center text-muted-foreground italic text-xs opacity-50">
              Aucun match planifié pour le moment.
            </div>
          )}
          {upcomingMatches.map((match, index) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group p-4 rounded-xl border border-secondary bg-white hover:border-primary/20 hover:shadow-sm transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">vs {getOpponentName(match.opponent_id)}</h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {match.category} {getLeagueName(match.league_id) && `• ${getLeagueName(match.league_id)}`}
                  </p>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">{match.match_date}</Badge>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span className="font-medium">{match.match_time}</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span className="truncate font-medium">{getStadiumName(match.stadium_id)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingMatches;
