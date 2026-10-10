import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Trophy, Clock, MapPin, Shield, Target } from 'lucide-react';
import { Badge } from './ui/badge';

import { useMatches } from '../hooks/useMatches';
import { useClubData } from '../hooks/useClubData';
import { useCompetitions } from '../hooks/useCompetitions';
import type { Match } from '../types';

const LastMatchResult: React.FC = () => {
  const { matches } = useMatches();
  const { opponentClubs, mainClub } = useClubData();
  const { stadiums } = useCompetitions();
  
  const finishedMatches = [...matches]
    .filter((m: Match) => m.status === 'finished')
    .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());

  const lastMatch = finishedMatches[0];

  if (!lastMatch) {
    return (
      <Card className="h-full border shadow-sm flex items-center justify-center p-12">
        <div className="text-center space-y-2 opacity-30">
          <Trophy className="w-12 h-12 mx-auto mb-4" />
          <p className="font-black uppercase tracking-widest text-sm">Aucun résultat</p>
          <p className="text-xs">Planifiez et jouez des matchs pour voir les statistiques</p>
        </div>
      </Card>
    );
  }

  const opponent = opponentClubs.find(c => c.id === lastMatch.opponent_id);
  const stadium = stadiums.find(s => s.id === lastMatch.stadium_id);
  
  const isWin = lastMatch.is_home 
    ? (lastMatch.score_home || 0) > (lastMatch.score_away || 0)
    : (lastMatch.score_away || 0) > (lastMatch.score_home || 0);
  
  const isDraw = (lastMatch.score_home || 0) === (lastMatch.score_away || 0);

  return (
    <Card className="h-full border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-8">
        <CardTitle className="text-lg font-bold tracking-tight">Dernier Match</CardTitle>
        <Badge 
          className={`text-[10px] font-bold uppercase tracking-widest border-none ${
            isWin ? 'bg-emerald-500/10 text-emerald-600' : isDraw ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'
          }`}
        >
          {isWin ? 'G' : isDraw ? 'N' : 'P'} — {lastMatch.score_home}:{lastMatch.score_away}
        </Badge>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className={`flex items-center justify-between w-full max-w-sm ${!lastMatch.is_home ? 'flex-row-reverse' : ''}`}>
            {/* My Club */}
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-white border-2 border-primary flex items-center justify-center shadow-lg shadow-primary/10 overflow-hidden p-2">
                <img 
                  src={(mainClub?.logo_url && mainClub.logo_url !== 'null') ? mainClub.logo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(mainClub?.club_name || 'FC')}&background=0D8ABC&color=fff&size=150`} 
                  className="w-full h-full object-contain" 
                  alt={mainClub?.club_name} 
                />
              </div>
              <p className="text-[10px] font-black uppercase tracking-tight text-foreground truncate max-w-[80px]">{mainClub?.club_name || 'FuscClub'}</p>
            </div>
            
            {/* Score */}
            <div className="flex flex-col items-center space-y-1">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-black tracking-tighter text-foreground tabular-nums">{lastMatch.score_home}</span>
                <span className="text-xl font-bold text-muted-foreground opacity-20">-</span>
                <span className="text-4xl font-black tracking-tighter text-foreground tabular-nums">{lastMatch.score_away}</span>
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Score Final</p>
            </div>
            
            {/* Opponent */}
            <div className="flex flex-col items-center space-y-3">
               <div className="w-16 h-16 rounded-2xl bg-white border-2 border-secondary flex items-center justify-center shadow-lg shadow-secondary/10 overflow-hidden p-2">
                <img 
                  src={(opponent?.logo_url && opponent.logo_url !== 'null') ? opponent.logo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(opponent?.name || 'Opponent')}&background=random&color=fff&size=150`} 
                  className="w-full h-full object-contain" 
                  alt={opponent?.name} 
                />
              </div>
              <p className="text-[10px] font-black uppercase tracking-tight text-foreground truncate max-w-[80px]">{opponent?.name || 'Adversaire'}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6 w-full max-w-sm pt-6 border-t border-secondary/50">
            <div className="flex flex-col items-center space-y-1">
              <div className="p-2 rounded-lg bg-secondary/50 text-primary">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Date</p>
              <p className="text-xs font-black text-foreground">{lastMatch.match_date}</p>
            </div>
            <div className="flex flex-col items-center space-y-1">
              <div className="p-2 rounded-lg bg-secondary/50 text-primary">
                <MapPin className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Stade</p>
              <p className="text-xs font-black text-foreground truncate max-w-[100px]">{stadium?.name || 'Lieu inconnu'}</p>
            </div>
          </div>
          
          <div className="w-full bg-secondary/20 rounded-xl p-4 border border-secondary/50 flex items-center justify-center text-center">
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-primary">Résumé du match</p>
              <p className="text-[11px] font-bold text-muted-foreground">Catégorie <span className="text-foreground">{lastMatch.category}</span></p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LastMatchResult;
