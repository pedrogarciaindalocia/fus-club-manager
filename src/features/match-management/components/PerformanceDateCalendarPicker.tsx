import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface PerformanceDateCalendarPickerProps {
  value: string;
  onChange: (nextDate: string) => void;
  recordedDateCounts: Record<string, number>;
  isLoadingDates?: boolean;
}

const WEEKDAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function safeParseDate(dateStr: string): Date {
  try {
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return parseISO(dateStr);
    }
  } catch {
    // fallback below
  }
  return new Date();
}

export const PerformanceDateCalendarPicker: React.FC<PerformanceDateCalendarPickerProps> = ({
  value,
  onChange,
  recordedDateCounts,
  isLoadingDates = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(safeParseDate(value)));
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const todayIso = format(new Date(), 'yyyy-MM-dd');

  const sortedRecordedDates = useMemo(() => {
    return Object.keys(recordedDateCounts)
      .filter(d => (recordedDateCounts[d] || 0) > 0)
      .sort((a, b) => b.localeCompare(a));
  }, [recordedDateCounts]);

  const totalRecordedDates = sortedRecordedDates.length;
  const latestRecordedDate = sortedRecordedDates[0] || null;
  const hasPerformanceOnSelectedDate = (recordedDateCounts[value] || 0) > 0;

  const updatePopoverPosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 328;
    const maxLeft = Math.max(12, window.innerWidth - width - 12);
    const left = Math.min(rect.left, maxLeft);
    const estimatedHeight = 380;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow >= estimatedHeight || rect.top < estimatedHeight
        ? rect.bottom + 8
        : Math.max(12, rect.top - estimatedHeight - 8);
    setPopoverCoords({ top, left });
  };

  const handleToggleOpen = () => {
    if (!isOpen) {
      setVisibleMonth(startOfMonth(safeParseDate(value)));
      updatePopoverPosition();
    }
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };
    const handleReposition = () => updatePopoverPosition();

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = endOfMonth(visibleMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [visibleMonth]);

  const formattedTriggerDate = useMemo(() => {
    try {
      return format(safeParseDate(value), 'dd MMM yyyy', { locale: fr });
    } catch {
      return value;
    }
  }, [value]);

  const monthTitle = useMemo(() => {
    const raw = format(visibleMonth, 'MMMM yyyy', { locale: fr });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [visibleMonth]);

  const handleSelectDate = (dateIso: string) => {
    onChange(dateIso);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        id="perf-filter-date"
        type="button"
        onClick={handleToggleOpen}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="w-full h-11 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-[#0D0D0F] text-xs sm:text-sm font-bold flex items-center justify-between gap-2 transition cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon className="w-4 h-4 text-[#FF3737] shrink-0" />
          <span className="truncate">{formattedTriggerDate}</span>
          {hasPerformanceOnSelectedDate && (
            <span
              className="w-2 h-2 rounded-full bg-[#FF3737] shrink-0"
              title="Performance enregistrée à cette date"
            />
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              'px-2 py-0.5 rounded-lg text-[10px] font-black tabular-nums',
              totalRecordedDates > 0
                ? 'bg-[#0D0D0F] text-white'
                : 'bg-white text-slate-500'
            )}
          >
            {isLoadingDates
              ? '...'
              : `${totalRecordedDates} ${totalRecordedDates > 1 ? 'dates' : 'date'}`}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-slate-500 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Calendrier des performances"
            style={{ top: popoverCoords.top, left: popoverCoords.left }}
            className="fixed z-50 w-[328px] rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 space-y-3"
          >
            {/* En-tête mois & navigation */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setVisibleMonth(m => subMonths(m, 1))}
                aria-label="Mois précédent"
                className="w-8 h-8 rounded-xl bg-[#161619] hover:bg-[#26262c] text-white flex items-center justify-center transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs sm:text-sm font-black text-[#0D0D0F] tracking-tight">
                {monthTitle}
              </span>

              <button
                type="button"
                onClick={() => setVisibleMonth(m => addMonths(m, 1))}
                aria-label="Mois suivant"
                className="w-8 h-8 rounded-xl bg-[#161619] hover:bg-[#26262c] text-white flex items-center justify-center transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Jours de la semaine */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS_FR.map(wd => (
                <div
                  key={wd}
                  className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-1"
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Grille des jours avec indicateur rouge FUS si une performance existe */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const dayIso = format(day, 'yyyy-MM-dd');
                const inMonth = isSameMonth(day, visibleMonth);
                const isSelected = dayIso === value;
                const isToday = dayIso === todayIso;
                const evalCount = recordedDateCounts[dayIso] || 0;
                const hasEval = evalCount > 0;

                return (
                  <button
                    key={dayIso}
                    type="button"
                    onClick={() => handleSelectDate(dayIso)}
                    title={
                      hasEval
                        ? `${evalCount} performance${evalCount > 1 ? 's' : ''} enregistrée${evalCount > 1 ? 's' : ''}`
                        : undefined
                    }
                    className={cn(
                      'relative h-10 rounded-xl flex flex-col items-center justify-center text-xs transition cursor-pointer',
                      isSelected
                        ? 'bg-[#0D0D0F] text-white font-black shadow-xs'
                        : hasEval
                          ? 'bg-[#FF3737]/12 hover:bg-[#FF3737]/20 text-[#0D0D0F] font-black'
                          : inMonth
                            ? 'text-[#0D0D0F] font-semibold hover:bg-slate-100'
                            : 'text-slate-300 font-medium hover:bg-slate-50'
                    )}
                  >
                    <span
                      className={cn(
                        'leading-none',
                        isToday && !isSelected && 'underline decoration-[#FF3737] decoration-2 underline-offset-2'
                      )}
                    >
                      {format(day, 'd')}
                    </span>

                    {hasEval && (
                      <span
                        data-testid={`calendar-perf-indicator-${dayIso}`}
                        className="mt-1 w-1.5 h-1.5 rounded-full bg-[#FF3737]"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Légende & Raccourcis */}
            <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF3737]" />
                  <span>Performance enregistrée</span>
                </span>
                <span className="text-[#0D0D0F] font-black tabular-nums">
                  {totalRecordedDates} {totalRecordedDates > 1 ? 'jours' : 'jour'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setVisibleMonth(startOfMonth(new Date()));
                    handleSelectDate(todayIso);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#161619] hover:bg-[#26262c] text-white text-[11px] font-black transition cursor-pointer"
                >
                  Aujourd&apos;hui
                </button>

                {latestRecordedDate && latestRecordedDate !== value && (
                  <button
                    type="button"
                    onClick={() => {
                      setVisibleMonth(startOfMonth(safeParseDate(latestRecordedDate)));
                      handleSelectDate(latestRecordedDate);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#FF3737] hover:bg-[#dc2626] text-white text-[11px] font-black transition cursor-pointer truncate"
                  >
                    Dernière ({format(safeParseDate(latestRecordedDate), 'dd/MM', { locale: fr })})
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
