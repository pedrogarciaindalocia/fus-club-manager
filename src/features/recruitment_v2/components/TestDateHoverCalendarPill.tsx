import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, CheckCircle2, CalendarClock } from 'lucide-react';
import type { PlayerTest, TestSlotValidationInfo } from '../types/recruitment';
import {
  formatCompactFrenchDate,
  formatTestDateIntervalLabel,
  type TestDateInterval,
} from '../utils/testDateIntervals';
import { cn } from '../../../lib/utils';

interface TestDateHoverCalendarPillProps {
  candidateName: string;
  interval: TestDateInterval;
  allCandidateTestDates?: string[];
  sessions?: PlayerTest[];
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  readOnly?: boolean;
  slotValidation?: TestSlotValidationInfo | null;
  canValidateSlot?: boolean;
  canOpenSlotModal?: boolean;
  isAdminSlotEditor?: boolean;
  slotEditorLabel?: string;
  customTitle?: string;
  onValidateSlot?: () => void;
  onOpenSlotModal?: () => void;
}

const WEEKDAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

function addUtcDaysIso(isoDate: string, delta: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

function buildMonthGrid(year: number, monthIndexZero: number) {
  const firstDay = new Date(Date.UTC(year, monthIndexZero, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndexZero + 1, 0)).getUTCDate();
  const startDow = (firstDay.getUTCDay() + 6) % 7; // Monday = 0 .. Sunday = 6

  const cells: Array<{
    iso: string;
    dayNum: number;
    inCurrentMonth: boolean;
  }> = [];

  for (let i = startDow - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(year, monthIndexZero, -i));
    cells.push({
      iso: dt.toISOString().slice(0, 10),
      dayNum: dt.getUTCDate(),
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dt = new Date(Date.UTC(year, monthIndexZero, day));
    cells.push({
      iso: dt.toISOString().slice(0, 10),
      dayNum: day,
      inCurrentMonth: true,
    });
  }

  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const dt = new Date(Date.UTC(year, monthIndexZero + 1, i));
    cells.push({
      iso: dt.toISOString().slice(0, 10),
      dayNum: dt.getUTCDate(),
      inCurrentMonth: false,
    });
  }

  return cells;
}

/**
 * Pastille date/intervalle de convocation affichant un mini-calendrier flottant au survol
 * avec tracé visuel continu des jours de test du joueur.
 */
export const TestDateHoverCalendarPill: React.FC<TestDateHoverCalendarPillProps> = ({
  candidateName,
  interval,
  allCandidateTestDates = [],
  sessions = [],
  onClick,
  readOnly = false,
  slotValidation,
  canValidateSlot = false,
  canOpenSlotModal = false,
  isAdminSlotEditor = false,
  slotEditorLabel,
  customTitle,
  onValidateSlot,
  onOpenSlotModal,
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  const spansTwoMonths = useMemo(() => {
    const startYm = interval.startDate.slice(0, 7);
    const endYm = interval.endDate.slice(0, 7);
    if (startYm === endYm) return false;
    const [sy, sm] = startYm.split('-').map(Number);
    const nextMonth = new Date(Date.UTC(sy, sm, 1)).toISOString().slice(0, 7);
    return endYm === nextMonth;
  }, [interval.startDate, interval.endDate]);

  const [viewMonth, setViewMonth] = useState(() => {
    const [y, m] = interval.startDate.split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  useEffect(() => {
    const [y, m] = interval.startDate.split('-').map(Number);
    setViewMonth({ year: y, month: m - 1 });
  }, [interval.startDate]);

  const popoverWidth = spansTwoMonths ? 520 : 288;

  const hasSlotFooter = Boolean(canValidateSlot || canOpenSlotModal || slotValidation);

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedHeight = hasSlotFooter ? 385 : 315;
    const margin = 10;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left < margin) left = margin;
    if (left + popoverWidth > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - popoverWidth - margin);
    }

    let top = rect.bottom + 8;
    if (top + estimatedHeight > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - estimatedHeight - 8);
    }

    setPopoverPos({ top, left });
  }, [popoverWidth, hasSlotFooter]);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleOpen = () => {
    clearCloseTimer();
    const [y, m] = interval.startDate.split('-').map(Number);
    setViewMonth({ year: y, month: m - 1 });
    updatePopoverPosition();
    setIsOpen(true);
  };

  const isSlotValidated = slotValidation?.status === 'validated';
  const isSlotChangeRequested = slotValidation?.status === 'change_requested';

  const handleScheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 120);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleReposition = () => updatePopoverPosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen, updatePopoverPosition]);

  useEffect(() => () => clearCloseTimer(), []);

  const tracedSet = useMemo(() => new Set(interval.dates), [interval.dates]);
  const otherDatesSet = useMemo(
    () => new Set(allCandidateTestDates.filter((d) => !tracedSet.has(d))),
    [allCandidateTestDates, tracedSet]
  );
  const todayIso = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  const intervalSessions = useMemo(
    () =>
      sessions
        .filter((s) => tracedSet.has(s.test_date))
        .sort((a, b) => a.test_date.localeCompare(b.test_date)),
    [sessions, tracedSet]
  );

  const monthsToDisplay = useMemo(() => {
    if (!spansTwoMonths) return [viewMonth];
    const nextDt = new Date(Date.UTC(viewMonth.year, viewMonth.month + 1, 1));
    return [
      viewMonth,
      { year: nextDt.getUTCFullYear(), month: nextDt.getUTCMonth() },
    ];
  }, [viewMonth, spansTwoMonths]);

  const shiftMonth = (delta: number) => {
    setViewMonth((prev) => {
      const dt = new Date(Date.UTC(prev.year, prev.month + delta, 1));
      return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() };
    });
  };

  const label = formatTestDateIntervalLabel(interval);

  const isInteractive = Boolean(onClick && !readOnly);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={handleOpen}
        onMouseLeave={handleScheduleClose}
        onFocus={handleOpen}
        onBlur={handleScheduleClose}
        onClick={(e) => {
          e.stopPropagation();
          if (!isInteractive) {
            return;
          }
          clearCloseTimer();
          setIsOpen(false);
          onClick?.(e);
        }}
        title={
          customTitle
            ? customTitle
            : isInteractive
              ? 'Survoler pour voir le planning • Cliquer pour planifier'
              : 'Survoler pour voir le planning des tests (lecture seule)'
        }
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold shadow-2xs transition-all whitespace-nowrap group/date",
          isInteractive
            ? "cursor-pointer active:scale-95"
            : "cursor-default",
          isOpen
            ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300/60"
            : isInteractive
              ? "border-blue-200 bg-white hover:bg-blue-600 hover:text-white hover:border-blue-600 text-blue-800"
              : "border-blue-200 bg-blue-50/70 hover:bg-blue-600 hover:text-white hover:border-blue-600 text-blue-800"
        )}
      >
        <Calendar
          className={cn(
            "w-3 h-3 shrink-0 transition-colors",
            isOpen ? "text-white" : "text-blue-600 group-hover/date:text-white"
          )}
        />
        <span>{label}</span>
      </button>

      {isOpen && popoverPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={handleScheduleClose}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
            width: `${popoverWidth}px`,
            zIndex: 99999,
          }}
          className="bg-white/98 backdrop-blur-md rounded-2xl border border-blue-200/90 shadow-2xl p-3.5 text-slate-800 animate-in fade-in zoom-in-95 duration-150 space-y-3"
        >
          {/* En-tête du mini-calendrier */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 flex items-center gap-1">
                <Calendar className="w-3 h-3 shrink-0" />
                <span>Jours de test</span>
              </p>
              <p className="text-xs font-black text-slate-900 truncate">
                {candidateName}
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-black whitespace-nowrap shrink-0">
              {interval.dates.length} jour{interval.dates.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Barre de navigation mois */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-black text-slate-800 text-center">
              {monthsToDisplay
                .map((m) => `${MONTHS_FR[m.month]} ${m.year}`)
                .join(' — ')}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Mois suivant"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Grilles mensuelles avec tracé continu des jours de test */}
          <div className={cn("grid gap-3", spansTwoMonths ? "grid-cols-2" : "grid-cols-1")}>
            {monthsToDisplay.map(({ year, month }) => {
              const cells = buildMonthGrid(year, month);
              return (
                <div key={`${year}-${month}`} className="space-y-1">
                  {spansTwoMonths && (
                    <p className="text-[10px] font-black text-slate-500 text-center uppercase tracking-wider">
                      {MONTHS_FR[month]} {year}
                    </p>
                  )}

                  <div className="grid grid-cols-7 text-center text-[9px] font-black text-slate-400">
                    {WEEKDAYS_FR.map((d, i) => (
                      <div key={i} className="py-0.5">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-y-1 text-center">
                    {cells.map((cell, idx) => {
                      const colIdx = idx % 7;
                      const isTraced = tracedSet.has(cell.iso);
                      const prevTraced = isTraced && tracedSet.has(addUtcDaysIso(cell.iso, -1));
                      const nextTraced = isTraced && tracedSet.has(addUtcDaysIso(cell.iso, 1));
                      const isStart = cell.iso === interval.startDate;
                      const isEnd = cell.iso === interval.endDate;
                      const isEndpoint = isStart || isEnd;
                      const isOtherTest = !isTraced && otherDatesSet.has(cell.iso);
                      const isToday = cell.iso === todayIso;

                      return (
                        <div
                          key={cell.iso}
                          className="relative h-7 flex items-center justify-center"
                        >
                          {/* Bande de tracé continu entre jours consécutifs */}
                          {isTraced && (
                            <div
                              className={cn(
                                "absolute inset-y-0.5 bg-blue-100 border-y border-blue-300/80",
                                !prevTraced || colIdx === 0 ? "left-0.5 rounded-l-full border-l" : "left-0",
                                !nextTraced || colIdx === 6 ? "right-0.5 rounded-r-full border-r" : "right-0"
                              )}
                            />
                          )}

                          <span
                            className={cn(
                              "relative z-10 w-6 h-6 rounded-full flex flex-col items-center justify-center text-[10px] leading-none transition-all select-none",
                              !cell.inCurrentMonth && !isTraced && "text-slate-300",
                              cell.inCurrentMonth && !isTraced && !isOtherTest && "text-slate-700 font-semibold",
                              isEndpoint && "bg-blue-600 text-white font-black shadow-xs ring-2 ring-blue-200",
                              isTraced && !isEndpoint && "text-blue-900 font-black",
                              isOtherTest && "bg-indigo-50 text-indigo-700 font-bold ring-1 ring-indigo-300",
                              isToday && !isEndpoint && "ring-1 ring-slate-400"
                            )}
                          >
                            <span>{cell.dayNum}</span>
                            {isTraced && !isEndpoint && (
                              <span className="w-1 h-1 rounded-full bg-blue-600 mt-0.5" />
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Résumé des séances & légende */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            {intervalSessions.slice(0, 2).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 text-[10px] text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/70"
              >
                <span className="font-bold text-slate-800 truncate">
                  {formatCompactFrenchDate(s.test_date, false)} · {s.test_name}
                </span>
                <span className="flex items-center gap-1 text-slate-500 shrink-0">
                  <Clock className="w-2.5 h-2.5" />
                  {s.start_time || '09:30'}
                </span>
              </div>
            ))}
            {intervalSessions.length > 2 && (
              <p className="text-[10px] font-bold text-blue-700 text-center">
                +{intervalSessions.length - 2} autre(s) séance(s) sur la période
              </p>
            )}
            <div className="flex items-center justify-between gap-2 text-[9px] text-slate-400 font-semibold pt-0.5">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                Tracé des jours de test
              </span>
              {intervalSessions[0]?.location && (
                <span className="inline-flex items-center gap-0.5 truncate max-w-[140px]">
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{intervalSessions[0].location}</span>
                </span>
              )}
            </div>

            {(canValidateSlot || canOpenSlotModal || slotValidation) && (
              <div className="pt-2 mt-1 border-t border-slate-100 space-y-2">
                {isSlotValidated ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Créneau validé</span>
                      </span>
                      {isAdminSlotEditor && canOpenSlotModal && onOpenSlotModal && (
                        <button
                          type="button"
                          onClick={() => {
                            clearCloseTimer();
                            setIsOpen(false);
                            onOpenSlotModal();
                          }}
                          className="px-2 py-0.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-600 hover:text-white text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          {slotEditorLabel || 'Changer créneau'}
                        </button>
                      )}
                    </div>
                    {(slotValidation?.room_availability || slotValidation?.catering_availability) && (
                      <div className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {slotValidation.room_availability && (
                          <span>
                            Chambre :{' '}
                            <strong className="text-slate-800">
                              {slotValidation.room_availability === 'available'
                                ? 'Disponible'
                                : slotValidation.room_availability === 'adjusted'
                                  ? 'Ajustée'
                                  : 'Non requise'}
                            </strong>
                          </span>
                        )}
                        {slotValidation.catering_availability && (
                          <span>
                            Restauration :{' '}
                            <strong className="text-slate-800">
                              {slotValidation.catering_availability === 'available'
                                ? 'Disponible'
                                : slotValidation.catering_availability === 'adjusted'
                                  ? 'Ajustée'
                                  : 'Non requise'}
                            </strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {isSlotChangeRequested && slotValidation?.requested_start_date && (
                      <div className="px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[10px] space-y-0.5">
                        <p className="font-black">
                          Autre créneau demandé : {formatCompactFrenchDate(slotValidation.requested_start_date, false)}
                          {slotValidation.requested_end_date &&
                          slotValidation.requested_end_date !== slotValidation.requested_start_date
                            ? ` → ${formatCompactFrenchDate(slotValidation.requested_end_date, false)}`
                            : ''}
                          {slotValidation.requested_start_time ? ` (${slotValidation.requested_start_time})` : ''}
                        </p>
                        {slotValidation.request_note && (
                          <p className="text-[10px] text-amber-800 italic truncate">
                            {slotValidation.request_note}
                          </p>
                        )}
                      </div>
                    )}

                    {(canValidateSlot || canOpenSlotModal) && (
                      <div className="flex items-center gap-1.5">
                        {canValidateSlot && onValidateSlot && (!isSlotChangeRequested || isAdminSlotEditor) && (
                          <button
                            type="button"
                            onClick={() => {
                              clearCloseTimer();
                              setIsOpen(false);
                              onValidateSlot();
                            }}
                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black inline-flex items-center justify-center gap-1 shadow-2xs cursor-pointer transition-all"
                          >
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>
                              {isSlotChangeRequested && isAdminSlotEditor ? 'Valider demande' : 'Valider'}
                            </span>
                          </button>
                        )}
                        {canOpenSlotModal && onOpenSlotModal && (
                          <button
                            type="button"
                            onClick={() => {
                              clearCloseTimer();
                              setIsOpen(false);
                              onOpenSlotModal();
                            }}
                            className="flex-1 py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition-all"
                          >
                            <CalendarClock className="w-3 h-3 shrink-0 text-amber-600" />
                            <span>{slotEditorLabel || (isAdminSlotEditor ? 'Changer créneau' : 'Autre créneau')}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default TestDateHoverCalendarPill;

