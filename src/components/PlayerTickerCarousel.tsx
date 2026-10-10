import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Users, 
  Play, 
  Pause, 
  ShieldCheck, 
  Shirt
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import type { Player, AgeCategory } from '../types';
import { PLAYER_CATEGORIES, normalizeAgeCategory } from '../constants';

interface PlayerTickerCarouselProps {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
}

const POSITION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  GK: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  DF: { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  MF: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  FW: { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' },
};

const CATEGORIES: (AgeCategory | 'ALL')[] = ['ALL', ...PLAYER_CATEGORIES];

export const PlayerTickerCarousel: React.FC<PlayerTickerCarouselProps> = ({
  players,
  onSelectPlayer,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<AgeCategory | 'ALL'>('ALL');
  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredPlayers = React.useMemo(() => {
    if (selectedCategory === 'ALL') return players;
    return players.filter(p => normalizeAgeCategory((p as any).category) === selectedCategory);
  }, [players, selectedCategory]);

  // Auto-scroll loop effect
  useEffect(() => {
    if (isPaused || filteredPlayers.length === 0) return;

    const interval = setInterval(() => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollContainerRef.current.scrollBy({ left: 240, behavior: 'smooth' });
        }
      }
    }, 3200);

    return () => clearInterval(interval);
  }, [isPaused, filteredPlayers.length]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (players.length === 0) return null;

  return (
    <Card className="border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50/50 to-slate-100/60 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 shadow-sm overflow-hidden rounded-2xl sm:rounded-3xl p-3.5 sm:p-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shadow-inner shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="text-sm sm:text-base font-black tracking-tight text-foreground uppercase truncate">
                Effectif • Showcase
              </h3>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[9px] sm:text-[10px] font-black tracking-widest px-1.5 sm:px-2 py-0.5 shrink-0">
                {filteredPlayers.length} Athlètes
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
              Cliquez sur un joueur pour consulter sa fiche détaillée
            </p>
          </div>
        </div>

        {/* Controls & Filter */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          {/* Category tabs */}
          <div className="flex items-center gap-1 bg-secondary/60 dark:bg-secondary/30 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-x-auto no-scrollbar max-w-full">
            {CATEGORIES.slice(0, 5).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all ${
                  selectedCategory === cat
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat === 'ALL' ? 'Tous' : cat}
              </button>
            ))}
          </div>

          {/* Pause / Play */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? "Reprendre le défilement automatique" : "Mettre en pause"}
            className="p-2 rounded-xl bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Prev / Next buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className="p-2 rounded-xl bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border"
              title="Précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="p-2 rounded-xl bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border"
              title="Suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal scrolling strip */}
      <div
        ref={scrollContainerRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="flex gap-4 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {filteredPlayers.map((player, idx) => {
          const pos = player.position || 'MF';
          const posStyle = POSITION_COLORS[pos] || POSITION_COLORS.MF;
          const photo = (player.photo_url && player.photo_url !== 'null') 
            ? player.photo_url 
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=1e293b&color=fff&size=150`;

          return (
            <motion.div
              key={player.id || idx}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectPlayer(player)}
              className="shrink-0 w-60 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3.5 shadow-sm hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between"
            >
              {/* Top Bar with Number and Position */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-xl bg-primary text-white flex items-center justify-center font-black text-xs shadow-sm group-hover:scale-110 transition-transform">
                    #{player.jersey_number ?? (idx + 1)}
                  </div>
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                    {(player as any).category || 'Élite'}
                  </span>
                </div>

                <Badge 
                  variant="outline" 
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border ${posStyle.bg} ${posStyle.text} ${posStyle.border}`}
                >
                  {pos}
                </Badge>
              </div>

              {/* Player Image and Identity */}
              <div className="flex items-center gap-3 mb-2">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-100 dark:ring-slate-800 group-hover:ring-primary/40 transition-all shrink-0">
                  <img
                    src={photo}
                    alt={player.full_name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).setAttribute('src', `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=1e293b&color=fff&size=150`);
                    }}
                  />
                </div>

                <div className="overflow-hidden">
                  <h4 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors leading-tight">
                    {player.full_name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
                    {player.nationality || 'Maroc'} • {player.preferred_foot ? (player.preferred_foot === 'left' ? 'Gaucher' : player.preferred_foot === 'both' ? 'Ambidextre' : 'Droitier') : 'Droitier'}
                  </p>
                </div>
              </div>

              {/* Bottom Quick Specs */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                <span>{player.height ? `${player.height} cm` : '178 cm'} / {player.weight ? `${player.weight} kg` : '72 kg'}</span>
                <span className="text-primary font-bold flex items-center gap-1 group-hover:underline">
                  Détails <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
};

export default PlayerTickerCarousel;
