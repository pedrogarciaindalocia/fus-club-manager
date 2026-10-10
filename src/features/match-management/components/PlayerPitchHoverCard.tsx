import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Shield, Star, Award, ArrowLeftRight } from 'lucide-react';

export interface PlayerPitchStats {
  id?: string;
  name: string;
  jerseyNumber: string | number;
  positionLabel?: string;
  teamName: string;
  isHome: boolean;
  photoUrl?: string | null;
  // Stats
  minutesPlayed: number;
  minutesStatus: string;
  goalsCount: number;
  goalsMinutes: number[];
  assistsCount: number;
  yellowCardsCount?: number;
  yellowCardMinute?: number | null;
  redCardsCount?: number;
  redCardMinute?: number | null;
  rating?: number | null;
  subDetails?: string | null;
}

interface PlayerPitchHoverCardProps {
  stats: PlayerPitchStats;
  placement?: 'top' | 'bottom';
  horizontalAlign?: 'center' | 'left' | 'right';
}

export const PlayerPitchHoverCard: React.FC<PlayerPitchHoverCardProps> = ({
  stats,
  placement = 'top',
  horizontalAlign = 'center',
}) => {
  // Horizontal offset classes based on alignment
  let alignClass = 'left-1/2 -translate-x-1/2';
  let arrowClass = 'left-1/2 -translate-x-1/2';

  if (horizontalAlign === 'left') {
    alignClass = '-left-3 translate-x-0';
    arrowClass = 'left-8';
  } else if (horizontalAlign === 'right') {
    alignClass = '-right-3 translate-x-0';
    arrowClass = 'right-8';
  }

  // Vertical placement classes
  const placementClass = placement === 'bottom' 
    ? 'top-full mt-3' 
    : 'bottom-full mb-3';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: placement === 'bottom' ? -4 : 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`absolute ${placementClass} ${alignClass} w-[248px] bg-[#0d1622]/95 backdrop-blur-md border border-slate-700/80 shadow-[0_20px_40px_rgba(0,0,0,0.6)] rounded-2xl p-3 text-white z-50 pointer-events-none cursor-default`}
      style={{ filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.5))' }}
    >
      {/* Decorative arrow */}
      <div
        className={`absolute ${arrowClass} w-3 h-3 bg-[#0d1622] border-slate-700/80 rotate-45 pointer-events-none ${
          placement === 'bottom'
            ? '-top-1.5 border-t border-l'
            : '-bottom-1.5 border-b border-r'
        }`}
      />

      {/* ── HEADER : Photo, Name, Jersey & Position ── */}
      <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800">
        <div className="relative w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
          {stats.photoUrl && stats.photoUrl !== 'null' ? (
            <img src={stats.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-black text-slate-300">{stats.jerseyNumber}</span>
          )}
          {/* Jersey corner pill */}
          <span
            className={`absolute -top-1 -right-1 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border shadow ${
              stats.isHome
                ? 'bg-blue-600 text-white border-blue-400'
                : 'bg-rose-600 text-white border-rose-400'
            }`}
          >
            {stats.jerseyNumber}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <h4 className="font-black text-xs text-white truncate leading-tight">
              {stats.name}
            </h4>
            {stats.positionLabel && (
              <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                {stats.positionLabel}
              </span>
            )}
          </div>
          <p className="text-[9px] text-slate-400 font-semibold truncate mt-0.5 flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                stats.isHome ? 'bg-blue-400' : 'bg-rose-400'
              }`}
            />
            {stats.teamName}
          </p>
        </div>
      </div>

      {/* ── MINUTES & STATUS HIGHLIGHT STRIP ── */}
      <div className="my-2.5 bg-[#142232] rounded-xl p-2 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[11px] font-black text-emerald-400 tabular-nums leading-none">
              {stats.minutesPlayed}' <span className="text-[8.5px] font-bold uppercase tracking-wider text-emerald-500">Jouées</span>
            </div>
            <p className="text-[8px] text-slate-400 font-semibold mt-0.5 truncate max-w-[130px]">
              {stats.minutesStatus}
            </p>
          </div>
        </div>

        {/* Note if available */}
        {typeof stats.rating === 'number' && stats.rating > 0 && (
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-[10px] font-black text-amber-400">
              <Star className="w-3 h-3 fill-amber-400" />
              <span>{stats.rating.toFixed(1)}</span>
            </div>
            <span className="text-[7.5px] text-slate-500 uppercase font-bold">Note match</span>
          </div>
        )}
      </div>

      {/* ── KEY MATCH STATS GRID (Buts, Passes D, Carton Jaune, Carton Rouge) ── */}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        {/* Buts */}
        <div className={`p-1.5 rounded-xl border ${stats.goalsCount > 0 ? 'bg-emerald-950/50 border-emerald-500/50' : 'bg-slate-900/60 border-slate-800'}`}>
          <div className="text-xs font-black flex items-center justify-center gap-0.5">
            <span className="text-[11px]">⚽</span>
            <span className={stats.goalsCount > 0 ? 'text-emerald-400' : 'text-slate-400'}>{stats.goalsCount}</span>
          </div>
          <span className="text-[7.5px] text-slate-400 uppercase font-black tracking-wider block mt-0.5 truncate">
            {stats.goalsCount > 1 ? 'Buts' : 'But'}
          </span>
          {stats.goalsMinutes.length > 0 && (
            <span className="text-[7px] text-emerald-400 font-bold block truncate">
              {stats.goalsMinutes.map(m => `${m}'`).join(',')}
            </span>
          )}
        </div>

        {/* Passes décisives */}
        <div className={`p-1.5 rounded-xl border ${stats.assistsCount > 0 ? 'bg-blue-950/50 border-blue-500/50' : 'bg-slate-900/60 border-slate-800'}`}>
          <div className="text-xs font-black flex items-center justify-center gap-0.5">
            <span className="text-blue-400 text-[11px]">⭐</span>
            <span className={stats.assistsCount > 0 ? 'text-blue-400' : 'text-slate-400'}>{stats.assistsCount}</span>
          </div>
          <span className="text-[7.5px] text-slate-400 uppercase font-black tracking-wider block mt-0.5 truncate">
            Assists
          </span>
        </div>

        {/* Carton Jaune */}
        <div className={`p-1.5 rounded-xl border ${(stats.yellowCardsCount && stats.yellowCardsCount > 0) || stats.yellowCardMinute ? 'bg-amber-950/50 border-amber-500/50' : 'bg-slate-900/60 border-slate-800'}`}>
          <div className="text-xs font-black flex items-center justify-center gap-0.5">
            <span className="text-[10px]">🟨</span>
            {stats.yellowCardMinute ? (
              <span className="text-amber-400 text-[10px] font-black">{stats.yellowCardMinute}'</span>
            ) : (
              <span className={stats.yellowCardsCount && stats.yellowCardsCount > 0 ? 'text-amber-400 font-black' : 'text-slate-500 text-[10px]'}>
                {stats.yellowCardsCount || 0}
              </span>
            )}
          </div>
          <span className="text-[7.5px] text-slate-400 uppercase font-black tracking-wider block mt-0.5 truncate">
            C. Jaune
          </span>
        </div>

        {/* Carton Rouge */}
        <div className={`p-1.5 rounded-xl border ${(stats.redCardsCount && stats.redCardsCount > 0) || stats.redCardMinute ? 'bg-rose-950/50 border-rose-500/50' : 'bg-slate-900/60 border-slate-800'}`}>
          <div className="text-xs font-black flex items-center justify-center gap-0.5">
            <span className="text-[10px]">🟥</span>
            {stats.redCardMinute ? (
              <span className="text-rose-400 text-[10px] font-black">{stats.redCardMinute}'</span>
            ) : (
              <span className={stats.redCardsCount && stats.redCardsCount > 0 ? 'text-rose-400 font-black' : 'text-slate-500 text-[10px]'}>
                {stats.redCardsCount || 0}
              </span>
            )}
          </div>
          <span className="text-[7.5px] text-slate-400 uppercase font-black tracking-wider block mt-0.5 truncate">
            C. Rouge
          </span>
        </div>
      </div>

      {/* ── SUBSTITUTION FOOTER IF APPLICABLE ── */}
      {stats.subDetails && (
        <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center gap-1 text-[8.5px] text-slate-300 font-semibold truncate">
          <ArrowLeftRight className="w-3 h-3 text-purple-400 shrink-0" />
          <span className="truncate">{stats.subDetails}</span>
        </div>
      )}
    </motion.div>
  );
};

export default PlayerPitchHoverCard;
