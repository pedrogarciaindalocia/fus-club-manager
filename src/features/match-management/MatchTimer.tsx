import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipForward, Trophy, Timer, Clock, 
  Hourglass, Plus, Minus, CheckCircle2, Target, Flag
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

type MatchPhase = 'first_half' | 'halftime' | 'second_half' | 'extra_time_first' | 'extra_time_second' | 'penalties' | 'finished';

interface MatchTimerProps {
  matchId: string;
  halfDurationMinutes: number;
  enableExtraTime: boolean;
  enablePenalties: boolean;
  initialStatus?: string;
  initialHalf?: number;
  initialElapsedSeconds?: number;
  addedTimeFirstHalf?: number;
  addedTimeSecondHalf?: number;
  homeScore: number;
  awayScore: number;
  penaltyHomeScore?: number;
  penaltyAwayScore?: number;
  onStatusChange: (status: string, updates: Record<string, any>) => void;
  onScoreChange: (home: number, away: number) => void;
  onPenaltyScoreChange: (home: number, away: number) => void;
}

const MatchTimer: React.FC<MatchTimerProps> = ({
  matchId,
  halfDurationMinutes,
  enableExtraTime,
  enablePenalties,
  initialStatus = 'scheduled',
  initialHalf = 1,
  initialElapsedSeconds = 0,
  addedTimeFirstHalf = 0,
  addedTimeSecondHalf = 0,
  homeScore,
  awayScore,
  penaltyHomeScore = 0,
  penaltyAwayScore = 0,
  onStatusChange,
  onScoreChange,
  onPenaltyScoreChange
}) => {
  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [matchPhase, setMatchPhase] = useState<MatchPhase>('first_half');
  const [phaseTime, setPhaseTime] = useState(0);
  const [totalTime, setTotalTime] = useState(initialElapsedSeconds);
  
  // Added time (temps additionnel)
  const [addedTime, setAddedTime] = useState({
    firstHalf: addedTimeFirstHalf,
    secondHalf: addedTimeSecondHalf,
    extraFirst: 0,
    extraSecond: 0
  });

  // Penalty shootout
  const [showPenaltyInterface, setShowPenaltyInterface] = useState(false);
  const [penalties, setPenalties] = useState<{home: number[]; away: number[]}>({ home: [], away: [] });

  const halfDurationSeconds = halfDurationMinutes * 60;

  // Timer effect
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        setPhaseTime(t => t + 1);
        setTotalTime(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current phase display info
  const getPhaseInfo = () => {
    switch (matchPhase) {
      case 'first_half':
        return { 
          label: '1ère Mi-temps', 
          color: 'bg-emerald-500',
          maxTime: halfDurationSeconds + (addedTime.firstHalf * 60)
        };
      case 'halftime':
        return { 
          label: 'Mi-temps', 
          color: 'bg-amber-500',
          maxTime: 900 // 15 min default halftime
        };
      case 'second_half':
        return { 
          label: '2ème Mi-temps', 
          color: 'bg-emerald-500',
          maxTime: halfDurationSeconds + (addedTime.secondHalf * 60)
        };
      case 'extra_time_first':
        return { 
          label: 'Prol. 1ère', 
          color: 'bg-blue-500',
          maxTime: halfDurationSeconds + (addedTime.extraFirst * 60)
        };
      case 'extra_time_second':
        return { 
          label: 'Prol. 2ème', 
          color: 'bg-blue-500',
          maxTime: halfDurationSeconds + (addedTime.extraSecond * 60)
        };
      case 'penalties':
        return { 
          label: 'Penalties', 
          color: 'bg-purple-500',
          maxTime: 0
        };
      case 'finished':
        return { 
          label: 'Terminé', 
          color: 'bg-slate-500',
          maxTime: 0
        };
    }
  };

  const phaseInfo = getPhaseInfo();

  // Calculate displayed minute (includes added time indication)
  const getDisplayedMinute = () => {
    const baseMinutes = Math.floor(phaseTime / 60);
    const currentAddedTime = (() => {
      switch (matchPhase) {
        case 'first_half': return addedTime.firstHalf;
        case 'second_half': return addedTime.secondHalf;
        case 'extra_time_first': return addedTime.extraFirst;
        case 'extra_time_second': return addedTime.extraSecond;
        default: return 0;
      }
    })();
    
    if (phaseTime > halfDurationSeconds && currentAddedTime > 0) {
      return `${halfDurationMinutes}+${baseMinutes - halfDurationMinutes}`;
    }
    return baseMinutes.toString();
  };

  // Start/Pause match
  const toggleTimer = () => {
    if (matchPhase === 'finished') return;
    setIsRunning(!isRunning);
    onStatusChange(isRunning ? 'paused' : 'live', { 
      status: isRunning ? 'paused' : 'live',
      time_elapsed_seconds: totalTime 
    });
  };

  // End current phase and move to next
  const endPhase = () => {
    setIsRunning(false);
    
    switch (matchPhase) {
      case 'first_half':
        setMatchPhase('halftime');
        setPhaseTime(0);
        onStatusChange('halftime', { 
          status: 'halftime', 
          current_half: 1,
          time_elapsed_seconds: totalTime 
        });
        break;
        
      case 'halftime':
        setMatchPhase('second_half');
        setPhaseTime(0);
        onStatusChange('live', { 
          status: 'live', 
          current_half: 2,
          time_elapsed_seconds: totalTime 
        });
        break;
        
      case 'second_half':
        if (enableExtraTime && homeScore === awayScore) {
          setMatchPhase('extra_time_first');
          setPhaseTime(0);
          onStatusChange('extra_time', { 
            status: 'extra_time', 
            current_half: 3,
            time_elapsed_seconds: totalTime 
          });
        } else if (enablePenalties && homeScore === awayScore) {
          setMatchPhase('penalties');
          setShowPenaltyInterface(true);
          onStatusChange('penalties', { 
            status: 'penalties',
            time_elapsed_seconds: totalTime 
          });
        } else {
          finishMatch();
        }
        break;
        
      case 'extra_time_first':
        setMatchPhase('extra_time_second');
        setPhaseTime(0);
        onStatusChange('extra_time', { 
          status: 'extra_time', 
          current_half: 4,
          time_elapsed_seconds: totalTime 
        });
        break;
        
      case 'extra_time_second':
        if (enablePenalties && homeScore === awayScore) {
          setMatchPhase('penalties');
          setShowPenaltyInterface(true);
          onStatusChange('penalties', { 
            status: 'penalties',
            time_elapsed_seconds: totalTime 
          });
        } else {
          finishMatch();
        }
        break;
        
      case 'penalties':
        finishMatch();
        break;
    }
  };

  // Finish match
  const finishMatch = () => {
    setIsRunning(false);
    setMatchPhase('finished');
    setShowPenaltyInterface(false);
    onStatusChange('finished', { 
      status: 'finished',
      time_elapsed_seconds: totalTime 
    });
  };

  // Adjust added time
  const adjustAddedTime = (half: keyof typeof addedTime, delta: number) => {
    setAddedTime(prev => {
      const newValue = Math.max(0, prev[half] + delta);
      const updated = { ...prev, [half]: newValue };
      
      // Notify parent of added time changes
      if (half === 'firstHalf') {
        onStatusChange(matchPhase === 'first_half' ? 'live' : 'paused', {
          added_time_first_half: newValue
        });
      } else if (half === 'secondHalf') {
        onStatusChange(matchPhase === 'second_half' ? 'live' : 'paused', {
          added_time_second_half: newValue
        });
      }
      
      return updated;
    });
  };

  // Penalty management
  const addPenalty = (team: 'home' | 'away', scored: boolean) => {
    setPenalties(prev => ({
      ...prev,
      [team]: [...prev[team], scored ? 1 : 0]
    }));
    
    if (scored) {
      if (team === 'home') {
        const newScore = penaltyHomeScore + 1;
        onPenaltyScoreChange(newScore, penaltyAwayScore);
      } else {
        const newScore = penaltyAwayScore + 1;
        onPenaltyScoreChange(penaltyHomeScore, newScore);
      }
    }
  };

  const canAddPenalty = (team: 'home' | 'away') => {
    const homeCount = penalties.home.length;
    const awayCount = penalties.away.length;
    if (team === 'home') return homeCount <= awayCount;
    return awayCount <= homeCount;
  };

  return (
    <div className="space-y-6">
      {/* Main Timer Card */}
      <div className="bg-slate-950 rounded-[3rem] p-8 text-white shadow-2xl border-4 border-white">
        {/* Phase Badge */}
        <div className="flex items-center justify-between mb-6">
          <Badge className={`${phaseInfo.color} text-white border-none font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl`}>
            {phaseInfo.label}
          </Badge>
          
          {matchPhase !== 'finished' && matchPhase !== 'penalties' && (
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Total: {formatTime(totalTime)}
              </span>
            </div>
          )}
        </div>

        {/* Timer Display */}
        <div className="flex items-center justify-center py-8">
          {matchPhase === 'penalties' ? (
            <div className="text-center">
              <div className="text-6xl font-black italic tabular-nums flex items-center gap-4">
                <span className="text-primary">{penaltyHomeScore}</span>
                <span className="text-slate-600">-</span>
                <span className="text-slate-400">{penaltyAwayScore}</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">
                Tirs au but
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-7xl font-black italic tabular-nums tracking-tighter">
                {formatTime(phaseTime)}
              </div>
              {matchPhase !== 'halftime' && matchPhase !== 'finished' && (
                <p className="text-[12px] font-black uppercase tracking-widest text-slate-500 mt-2">
                  Minute {getDisplayedMinute()}'
                </p>
              )}
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-4 mt-6">
          {matchPhase !== 'finished' && matchPhase !== 'penalties' && (
            <Button
              onClick={toggleTimer}
              className={`h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all ${
                isRunning 
                  ? 'bg-amber-500 text-white hover:bg-amber-600' 
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {isRunning ? (
                <><Pause className="w-4 h-4 mr-2" /> Pause</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> {phaseTime > 0 ? 'Reprendre' : 'Démarrer'}</>
              )}
            </Button>
          )}

          {matchPhase !== 'finished' && (
            <Button
              onClick={endPhase}
              variant="outline"
              className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-white/20 text-white hover:bg-white/10"
            >
              <SkipForward className="w-4 h-4 mr-2" />
              {matchPhase === 'first_half' && 'Fin 1ère MT'}
              {matchPhase === 'halftime' && 'Début 2ème MT'}
              {matchPhase === 'second_half' && (enableExtraTime && homeScore === awayScore ? 'Prolongation' : enablePenalties && homeScore === awayScore ? 'Penalties' : 'Terminer')}
              {matchPhase === 'extra_time_first' && 'Fin Prol. 1'}
              {matchPhase === 'extra_time_second' && (enablePenalties && homeScore === awayScore ? 'Penalties' : 'Terminer')}
              {matchPhase === 'penalties' && 'Terminer'}
            </Button>
          )}

          {(matchPhase === 'second_half' || matchPhase === 'extra_time_second') && !isRunning && (
            <Button
              onClick={finishMatch}
              variant="outline"
              className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-red-500/50 text-red-400 hover:bg-red-500/20"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Fin Match
            </Button>
          )}
        </div>
      </div>

      {/* Added Time Controls */}
      {matchPhase !== 'halftime' && matchPhase !== 'finished' && matchPhase !== 'penalties' && (
        <div className="bg-white rounded-[2.5rem] p-6 border-2 border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Hourglass className="w-5 h-5 text-primary" />
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">
              Temps Additionnel
            </h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* First Half Added Time */}
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">1ère Mi-temps</p>
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => adjustAddedTime('firstHalf', -1)}
                  className="w-10 h-10 rounded-xl border-2"
                  disabled={addedTime.firstHalf === 0}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-2xl font-black tabular-nums w-16 text-center">
                  +{addedTime.firstHalf}'
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => adjustAddedTime('firstHalf', 1)}
                  className="w-10 h-10 rounded-xl border-2"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Second Half Added Time */}
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">2ème Mi-temps</p>
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => adjustAddedTime('secondHalf', -1)}
                  className="w-10 h-10 rounded-xl border-2"
                  disabled={addedTime.secondHalf === 0}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-2xl font-black tabular-nums w-16 text-center">
                  +{addedTime.secondHalf}'
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => adjustAddedTime('secondHalf', 1)}
                  className="w-10 h-10 rounded-xl border-2"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Penalty Shootout Interface */}
      <AnimatePresence>
        {showPenaltyInterface && matchPhase === 'penalties' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-purple-900 to-slate-900 rounded-[3rem] p-8 text-white shadow-2xl"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <Target className="w-6 h-6 text-purple-300" />
              <h3 className="text-xl font-black uppercase italic tracking-tight">
                Tirs au But
              </h3>
            </div>

            {/* Penalty Score Display */}
            <div className="flex items-center justify-center gap-12 mb-8">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-300 mb-2">Domicile</p>
                <div className="text-5xl font-black italic">{penaltyHomeScore}</div>
                <div className="flex gap-1 mt-3 justify-center">
                  {penalties.home.map((score, i) => (
                    <div 
                      key={i}
                      className={`w-3 h-3 rounded-full ${score ? 'bg-emerald-400' : 'bg-red-500'}`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="text-4xl font-black text-purple-400">VS</div>
              
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-300 mb-2">Extérieur</p>
                <div className="text-5xl font-black italic">{penaltyAwayScore}</div>
                <div className="flex gap-1 mt-3 justify-center">
                  {penalties.away.map((score, i) => (
                    <div 
                      key={i}
                      className={`w-3 h-3 rounded-full ${score ? 'bg-emerald-400' : 'bg-red-500'}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Penalty Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-center text-purple-300">Domicile</p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => addPenalty('home', true)}
                    disabled={!canAddPenalty('home')}
                    className="flex-1 h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-300 font-black uppercase text-[10px] hover:bg-emerald-500/30 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Marqué
                  </Button>
                  <Button
                    onClick={() => addPenalty('home', false)}
                    disabled={!canAddPenalty('home')}
                    className="flex-1 h-14 rounded-2xl bg-red-500/20 border-2 border-red-500/50 text-red-300 font-black uppercase text-[10px] hover:bg-red-500/30 disabled:opacity-50"
                  >
                    <Target className="w-4 h-4 mr-2" /> Raté
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-center text-purple-300">Extérieur</p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => addPenalty('away', true)}
                    disabled={!canAddPenalty('away')}
                    className="flex-1 h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-300 font-black uppercase text-[10px] hover:bg-emerald-500/30 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Marqué
                  </Button>
                  <Button
                    onClick={() => addPenalty('away', false)}
                    disabled={!canAddPenalty('away')}
                    className="flex-1 h-14 rounded-2xl bg-red-500/20 border-2 border-red-500/50 text-red-300 font-black uppercase text-[10px] hover:bg-red-500/30 disabled:opacity-50"
                  >
                    <Target className="w-4 h-4 mr-2" /> Raté
                  </Button>
                </div>
              </div>
            </div>

            {/* Finish Penalties Button */}
            <Button
              onClick={finishMatch}
              className="w-full mt-6 h-14 rounded-2xl bg-white text-purple-900 font-black uppercase text-[11px] tracking-widest hover:bg-purple-100"
            >
              <Flag className="w-4 h-4 mr-2" /> Terminer le Match
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Info */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
          <span>Durée MT: {halfDurationMinutes} min</span>
          {enableExtraTime && <span className="text-blue-500">Prolongations activées</span>}
          {enablePenalties && <span className="text-purple-500">Penalties activés</span>}
        </div>
      </div>
    </div>
  );
};

export default MatchTimer;
