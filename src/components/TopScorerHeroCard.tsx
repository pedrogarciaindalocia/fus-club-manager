import React from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Flame, 
  Target, 
  Zap, 
  Sparkles, 
  ChevronRight, 
  Clock, 
  Award,
  Crown
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import type { Player } from '../types';

export interface TopScorerData extends Player {
  goals: number;
  assists: number;
  played: number;
  minutes?: number;
  category?: string;
}

interface TopScorerHeroCardProps {
  topScorer: TopScorerData | null;
  onSelectPlayer: (player: Player) => void;
  periodLabel?: string;
  categoryLabel?: string;
}

export const TopScorerHeroCard: React.FC<TopScorerHeroCardProps> = ({
  topScorer,
  onSelectPlayer,
  periodLabel = 'Cette Saison',
  categoryLabel = 'Toutes Catégories'
}) => {
  if (!topScorer) {
    return (
      <Card className="h-full border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white rounded-3xl p-6 flex flex-col justify-center items-center text-center">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-amber-400 mb-4">
          <Trophy className="w-8 h-8" />
        </div>
        <h4 className="text-lg font-black uppercase tracking-tight">Meilleur Buteur</h4>
        <p className="text-xs text-slate-400 mt-1">Aucun match avec des buts enregistrés pour cette sélection.</p>
      </Card>
    );
  }

  const goalsPerMatch = topScorer.played > 0 ? (topScorer.goals / topScorer.played).toFixed(2) : '0.00';
  const photo = (topScorer.photo_url && topScorer.photo_url !== 'null') 
    ? topScorer.photo_url 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(topScorer.full_name)}&background=e03d3d&color=fff&size=300`;

  return (
    <Card className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-none shadow-xl bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 text-white p-4 sm:p-6 sm:p-7 flex flex-col justify-between group">
      {/* Background glow & accents */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-rose-600/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 group-hover:bg-rose-600/25 transition-all duration-700" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Top Header Badge */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="px-2.5 sm:px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 flex items-center gap-1.5 text-[11px] sm:text-xs font-black uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400" />
            <span>Soulier d'Or • N°1 Buteur</span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
            {categoryLabel} • {periodLabel}
          </span>
        </div>

        <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 sm:px-2.5 sm:py-1">
          {topScorer.position || 'FW'} • #{topScorer.jersey_number ?? 9}
        </Badge>
      </div>

      {/* Main Body */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center my-2">
        {/* Photo Container */}
        <div className="sm:col-span-4 flex justify-center">
          <div className="relative">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden bg-slate-800 ring-4 ring-amber-400/30 group-hover:ring-amber-400/70 shadow-2xl transition-all duration-300">
              <img
                src={photo}
                alt={topScorer.full_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLElement).setAttribute('src', `https://ui-avatars.com/api/?name=${encodeURIComponent(topScorer.full_name)}&background=e03d3d&color=fff&size=300`);
                }}
              />
            </div>
            {/* Rank 1 overlay */}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg border-2 border-slate-900">
              #1
            </div>
          </div>
        </div>

        {/* Player Name and Highlight Numbers */}
        <div className="sm:col-span-8 space-y-3 text-center sm:text-left">
          <div>
            <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white group-hover:text-amber-300 transition-colors leading-tight">
              {topScorer.full_name}
            </h3>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              {topScorer.nationality || 'Maroc'} • Catégorie {topScorer.category || 'Senior'} • Pied {topScorer.preferred_foot || 'Droit'}
            </p>
          </div>

          {/* Core Goals Big Pill */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 border border-white/10 text-center">
              <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider block">Buts</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-400 leading-none mt-0.5 block">
                {topScorer.goals}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 border border-white/10 text-center">
              <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider block">Passes D.</span>
              <span className="text-2xl sm:text-3xl font-black text-rose-300 leading-none mt-0.5 block">
                {topScorer.assists}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 border border-white/10 text-center">
              <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider block">Matchs</span>
              <span className="text-2xl sm:text-3xl font-black text-white leading-none mt-0.5 block">
                {topScorer.played}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer & Action Button */}
      <div className="relative z-10 pt-4 mt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Ratio : <strong className="text-white font-bold">{goalsPerMatch}</strong> but/match</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Forme : <strong className="text-emerald-400 font-bold">Excellente</strong></span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelectPlayer(topScorer)}
          className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
        >
          <span>Fiche Détaillée</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
};

export default TopScorerHeroCard;
