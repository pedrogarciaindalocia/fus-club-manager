import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Button } from '../../../components/ui/button';

export interface MatchdayTimelineDropdownConfig {
  value: string;
  onChange: (value: string) => void;
  allLabel?: string;
}

export interface MatchdayTimelineControlProps {
  activeJournee: number;
  maxJournee: number;
  latestPlayedJournee: number;
  finishedDays?: number[];
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSelectJournee: (day: number) => void;
  onJumpToday: () => void;
  isTodaySelected?: boolean;
  todayLabel?: string;
  dropdownMode?: MatchdayTimelineDropdownConfig | null;
  isDark?: boolean;
}

export const MatchdayTimelineControl: React.FC<MatchdayTimelineControlProps> = ({
  activeJournee,
  maxJournee,
  latestPlayedJournee,
  finishedDays = [],
  isPlaying,
  onTogglePlay,
  onSelectJournee,
  onJumpToday,
  isTodaySelected,
  todayLabel = "Aujourd'hui",
  dropdownMode = null,
  isDark = false,
}) => {
  const safeMax = Math.max(1, maxJournee);
  const clampedActive = Math.min(Math.max(1, activeJournee || 1), safeMax);
  const atToday =
    isTodaySelected !== undefined ? isTodaySelected : clampedActive === (latestPlayedJournee || safeMax);

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 border transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800/90' : 'bg-slate-50 border-slate-200/90 shadow-2xs'
      }`}
    >
      {/* Contrôles de lecture & navigation par journée */}
      <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-start min-w-0">
        <Button
          type="button"
          size="sm"
          onClick={onTogglePlay}
          className={`h-9 px-3.5 rounded-xl font-black uppercase text-[10px] tracking-wider gap-1.5 transition-all cursor-pointer shrink-0 ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-[#FF3737] hover:bg-[#e02e2e] text-white shadow-md shadow-red-500/20'
          }`}
        >
          {isPlaying && (
            <span className="relative flex h-2 w-2 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950" />
            </span>
          )}
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isPlaying ? 'Pause' : 'Lecture'}</span>
        </Button>

        <div className="flex items-center gap-1 min-w-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={clampedActive <= 1}
            onClick={() => onSelectJournee(Math.max(1, clampedActive - 1))}
            className={`h-8 w-8 rounded-lg cursor-pointer shrink-0 ${
              isDark
                ? 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs'
            }`}
            title="Journée précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {dropdownMode ? (
            <select
              aria-label="Sélectionner la journée du classement"
              value={dropdownMode.value}
              onChange={(e) => dropdownMode.onChange(e.target.value)}
              className={`h-8 px-2.5 text-xs font-bold rounded-lg border focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer min-w-0 max-w-[190px] ${
                isDark
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-white text-slate-900 border-slate-300 shadow-2xs'
              }`}
            >
              <option value="all">{dropdownMode.allLabel || 'Classement général'}</option>
              {Array.from({ length: safeMax }, (_, i) => i + 1).map((dayNum) => {
                const hasResults = finishedDays.includes(dayNum);
                return (
                  <option key={dayNum} value={String(dayNum)}>
                    Journée {dayNum}
                    {hasResults ? ' ✓' : ''}
                  </option>
                );
              })}
            </select>
          ) : (
            <motion.span
              key={clampedActive}
              initial={{ scale: 0.85, y: -2 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 20 }}
              className={`px-2.5 py-1 rounded-lg text-xs font-black tabular-nums border ${
                isPlaying
                  ? 'bg-[#FF3737] text-white border-[#FF3737] shadow-sm'
                  : isDark
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-white text-slate-900 border-slate-300 shadow-2xs'
              }`}
            >
              J{clampedActive}
            </motion.span>
          )}

          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={clampedActive >= safeMax}
            onClick={() => onSelectJournee(Math.min(safeMax, clampedActive + 1))}
            className={`h-8 w-8 rounded-lg cursor-pointer shrink-0 ${
              isDark
                ? 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs'
            }`}
            title="Journée suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onJumpToday}
          className={`h-8 px-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg cursor-pointer shrink-0 ${
            atToday
              ? isDark
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'bg-slate-200/80 text-slate-900 border border-slate-300/80'
              : isDark
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          {todayLabel}
        </Button>
      </div>

      {/* Curseur chronologique (Slider J1 -> Jmax) */}
      <div className="flex-1 md:max-w-md w-full flex items-center gap-3 min-w-0">
        <span className={`text-[10px] font-bold uppercase shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          J1
        </span>
        <input
          type="range"
          min={1}
          max={safeMax}
          value={clampedActive}
          onChange={(e) => onSelectJournee(parseInt(e.target.value, 10))}
          aria-label="Curseur d'évolution par journée"
          className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-[#FF3737] min-w-0 ${
            isDark ? 'bg-slate-800' : 'bg-slate-200'
          }`}
        />
        <span className={`text-[10px] font-bold uppercase shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          J{safeMax}
        </span>
      </div>
    </div>
  );
};

