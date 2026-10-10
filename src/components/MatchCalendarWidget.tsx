import React, { useState, useMemo, useRef } from 'react';
import { useMatches } from '../hooks/useMatches';
import { useClubData } from '../hooks/useClubData';
import { useCompetitions } from '../hooks/useCompetitions';
import { Badge } from './ui/badge';
import { ChevronLeft, ChevronRight, MapPin, Clock, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Match } from '../types';

const MatchCalendarWidget: React.FC = () => {
  const { matches } = useMatches();
  const { mainClub, opponentClubs } = useClubData();
  const { stadiums, leagues } = useCompetitions();

  const scrollRef = useRef<HTMLDivElement>(null);

  const allDates = useMemo(() => {
    const today = new Date();
    const dates: Date[] = [];
    for (let i = -7; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const todayStr = new Date().toLocaleDateString('en-CA');

  const matchDates = useMemo(() => {
    const set = new Set<string>();
    matches.forEach(m => set.add(m.match_date));
    return set;
  }, [matches]);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const upcoming = [...matches]
      .filter(m => m.status === 'scheduled' || m.status === 'live')
      .sort((a, b) => a.match_date.localeCompare(b.match_date));
    return upcoming[0]?.match_date || todayStr;
  });

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const matchesForDate = useMemo(() => {
    return matches
      .filter(m => m.match_date === selectedDate)
      .sort((a, b) => (a.match_time || '').localeCompare(b.match_time || ''));
  }, [matches, selectedDate]);

  const displayedMatch = useMemo(() => {
    if (selectedMatchId) return matches.find(m => m.id === selectedMatchId) || matchesForDate[0];
    return matchesForDate[0] || null;
  }, [selectedMatchId, matchesForDate, matches]);

  const getOpponent = (id: string) => opponentClubs.find(c => c.id === id);
  const getStadium = (id?: string | null) => stadiums.find(s => s.id === id);
  const getLeague = (id?: string | null) => leagues.find(l => l.id === id);

  const getResult = (m: Match) => {
    if (m.status !== 'finished') return null;
    const myScore = m.is_home ? m.score_home : m.score_away;
    const oppScore = m.is_home ? m.score_away : m.score_home;
    if (myScore > oppScore) return { label: 'V', color: 'bg-emerald-500' };
    if (myScore < oppScore) return { label: 'D', color: 'bg-red-500' };
    return { label: 'N', color: 'bg-amber-500' };
  };

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -150 : 150, behavior: 'smooth' });
    }
  };

  const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  return (
    <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Calendrier des Matchs</h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
            {matchesForDate.length} match{matchesForDate.length !== 1 ? 's' : ''} · {monthLabels[new Date(selectedDate).getMonth()]} {new Date(selectedDate).getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => scroll('left')} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all">
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <button onClick={() => scroll('right')} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all">
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Date Scrollbar */}
      <div ref={scrollRef} className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {allDates.map(date => {
          const str = date.toLocaleDateString('en-CA');
          const isToday = str === todayStr;
          const isSelected = str === selectedDate;
          const hasMatch = matchDates.has(str);
          return (
            <button
              key={str}
              onClick={() => { setSelectedDate(str); setSelectedMatchId(null); }}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[52px] ${
                isSelected
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : isToday
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-slate-50 text-slate-500'
              }`}
            >
              <span className={`text-[9px] font-black uppercase tracking-wider ${isSelected ? 'text-white/70' : ''}`}>
                {dayLabels[date.getDay()]}
              </span>
              <span className={`text-[13px] font-black tabular-nums leading-none ${isSelected ? 'text-white' : ''}`}>
                {date.getDate()}
              </span>
              {hasMatch && (
                <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-primary'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Match Tabs (if multiple matches on date) */}
      {matchesForDate.length > 1 && (
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide">
          {matchesForDate.map(m => {
            const opp = getOpponent(m.opponent_id);
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMatchId(m.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                  displayedMatch?.id === m.id
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'border-slate-100 text-slate-400 hover:bg-slate-50'
                }`}
              >
                vs {opp?.name || 'Adversaire'}
              </button>
            );
          })}
        </div>
      )}

      {/* Match Card */}
      <div className="px-4 pb-5">
        <AnimatePresence mode="wait">
          {displayedMatch ? (
            <motion.div
              key={displayedMatch.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="bg-slate-50 rounded-2xl p-5 border border-slate-100"
            >
              {/* Top bar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {displayedMatch.status === 'live' && (
                    <span className="flex items-center gap-1 bg-red-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                      <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
                    </span>
                  )}
                  {getLeague(displayedMatch.league_id) && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {getLeague(displayedMatch.league_id)?.name}
                    </span>
                  )}
                </div>
                {getResult(displayedMatch) && (
                  <span className={`text-[10px] font-black text-white px-3 py-1 rounded-lg ${getResult(displayedMatch)!.color}`}>
                    {getResult(displayedMatch)!.label}
                  </span>
                )}
                {displayedMatch.status === 'scheduled' && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-none text-[9px] font-black uppercase">Prévu</Badge>
                )}
              </div>

              {/* Teams & Score */}
              <div className="flex items-center justify-between gap-4">
                {/* My Club */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-100 shadow-md flex items-center justify-center overflow-hidden p-2 ring-2 ring-primary/10">
                    <img
                      src={mainClub?.logo_url && mainClub.logo_url !== 'null'
                        ? mainClub.logo_url
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent((mainClub as any)?.club_name || (mainClub as any)?.name || 'FC')}&background=0D8ABC&color=fff&size=128`}
                      alt="Club"
                      className="w-full h-full object-contain drop-shadow-sm"
                    />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-tight text-center leading-tight text-foreground max-w-[80px] truncate">
                    {(mainClub as any)?.club_name || (mainClub as any)?.name || 'Mon Club'}
                  </p>
                </div>

                {/* Score / VS */}
                <div className="flex flex-col items-center gap-1">
                  {displayedMatch.status === 'finished' || displayedMatch.status === 'live' ? (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-4xl font-black tabular-nums">{(displayedMatch.is_home ? displayedMatch.score_home : displayedMatch.score_away) ?? 0}</span>
                        <span className="text-lg font-black text-slate-200">—</span>
                        <span className="text-4xl font-black tabular-nums">{(displayedMatch.is_home ? displayedMatch.score_away : displayedMatch.score_home) ?? 0}</span>
                      </div>
                      {displayedMatch.status === 'finished' && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Score Final</span>
                      )}
                    </>
                  ) : (
                    <div className="px-5 py-2 rounded-2xl bg-white border-2 border-slate-100 shadow-inner">
                      <span className="text-[13px] font-black text-primary uppercase tracking-widest italic">VS</span>
                    </div>
                  )}
                </div>

                {/* Opponent */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-100 shadow-md flex items-center justify-center overflow-hidden p-2 ring-2 ring-slate-100">
                    <img
                      src={getOpponent(displayedMatch.opponent_id)?.logo_url && getOpponent(displayedMatch.opponent_id)?.logo_url !== 'null'
                        ? getOpponent(displayedMatch.opponent_id)!.logo_url!
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(getOpponent(displayedMatch.opponent_id)?.name || 'Adv')}&background=random&color=fff&size=128`}
                      alt="Adversaire"
                      className="w-full h-full object-contain drop-shadow-sm"
                    />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-tight text-center leading-tight text-slate-400 max-w-[80px] truncate">
                    {getOpponent(displayedMatch.opponent_id)?.name || 'Adversaire'}
                  </p>
                </div>
              </div>

              {/* Footer info */}
              <div className="flex items-center justify-center gap-5 mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                  <Clock className="w-3 h-3 text-primary/60" />
                  <span>{displayedMatch.match_date} {displayedMatch.match_time ? `· ${displayedMatch.match_time}` : ''}</span>
                </div>
                {getStadium(displayedMatch.stadium_id) && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <MapPin className="w-3 h-3 text-primary/60" />
                    <span className="truncate max-w-[120px]">{getStadium(displayedMatch.stadium_id)?.name}</span>
                  </div>
                )}
                <Badge className={`text-[9px] font-black border-none ${displayedMatch.is_home ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                  {displayedMatch.is_home ? 'Domicile' : 'Extérieur'}
                </Badge>
              </div>

              {/* Pagination dots */}
              {matchesForDate.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  {matchesForDate.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMatchId(m.id)}
                      className={`rounded-full transition-all ${displayedMatch.id === m.id ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-slate-200'}`}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-slate-50 rounded-2xl p-10 border border-dashed border-slate-200 flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Aucun match ce jour</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MatchCalendarWidget;
