import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';

export interface ExactDatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (dateStr: string) => void;
  matchesCountByDate?: Record<string, number>;
}

export const ExactDatePickerModal: React.FC<ExactDatePickerModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  matchesCountByDate = {},
}) => {
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (selectedDate) {
      const d = new Date(selectedDate + 'T00:00:00');
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  // Sync viewDate when selectedDate changes and modal opens
  useEffect(() => {
    if (isOpen) {
      if (selectedDate) {
        const d = new Date(selectedDate + 'T00:00:00');
        if (!isNaN(d.getTime())) setViewDate(d);
      } else {
        setViewDate(new Date());
      }
    }
  }, [isOpen, selectedDate]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const dayNamesShort = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  // Compute calendar days (Monday-based)
  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    let startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // 0 = Monday, 6 = Sunday

    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: Array<{
      date: Date;
      formatted: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      matchesCount: number;
    }> = [];

    // Previous month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const d = new Date(year, month - 1, dayNum);
      const formatted = d.toLocaleDateString('en-CA');
      cells.push({
        date: d,
        formatted,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: formatted === todayStr,
        isSelected: formatted === selectedDate,
        matchesCount: matchesCountByDate[formatted] || 0,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      const formatted = d.toLocaleDateString('en-CA');
      cells.push({
        date: d,
        formatted,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: formatted === todayStr,
        isSelected: formatted === selectedDate,
        matchesCount: matchesCountByDate[formatted] || 0,
      });
    }

    // Next month padding to reach 35 or 42 cells
    const remaining = (cells.length <= 35 ? 35 : 42) - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const formatted = d.toLocaleDateString('en-CA');
      cells.push({
        date: d,
        formatted,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: formatted === todayStr,
        isSelected: formatted === selectedDate,
        matchesCount: matchesCountByDate[formatted] || 0,
      });
    }

    return cells;
  }, [year, month, selectedDate, todayStr, matchesCountByDate]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 text-[#FF3737] flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 leading-tight">
                  Choix exact de la date
                </h3>
                <p className="text-[10px] font-bold text-slate-400">
                  Sélectionnez un jour pour naviguer instantanément
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Month / Year Navigator */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 transition-all shadow-2xs cursor-pointer"
                title="Mois précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <select
                  value={month}
                  onChange={(e) => setViewDate(new Date(year, Number(e.target.value), 1))}
                  className="bg-white text-xs font-black uppercase tracking-wide text-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 cursor-pointer shadow-2xs outline-none"
                >
                  {monthNames.map((name, idx) => (
                    <option key={name} value={idx}>{name}</option>
                  ))}
                </select>

                <select
                  value={year}
                  onChange={(e) => setViewDate(new Date(Number(e.target.value), month, 1))}
                  className="bg-white text-xs font-black text-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 cursor-pointer shadow-2xs outline-none"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 transition-all shadow-2xs cursor-pointer"
                title="Mois suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekdays header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5 select-none">
              {dayNamesShort.map(day => (
                <div key={day} className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 select-none">
              {calendarCells.map((cell) => {
                return (
                  <button
                    key={cell.formatted}
                    type="button"
                    onClick={() => {
                      onSelectDate(cell.formatted);
                      onClose();
                    }}
                    className={`relative h-10 sm:h-11 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer group ${
                      cell.isSelected
                        ? 'bg-[#16a34a] text-white shadow-md shadow-emerald-600/30 font-black scale-105 z-10'
                        : cell.isToday
                        ? 'bg-emerald-50 text-[#16a34a] font-black border border-emerald-300'
                        : cell.isCurrentMonth
                        ? 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-100'
                        : 'bg-slate-50/50 hover:bg-slate-100/60 text-slate-300 border border-transparent'
                    }`}
                  >
                    <span className="text-xs leading-none font-bold">
                      {cell.dayNumber}
                    </span>

                    {/* Badge / indicateur si match sur ce jour */}
                    {cell.matchesCount > 0 && (
                      <span
                        className={`text-[8px] font-black px-1 rounded-full leading-tight mt-0.5 ${
                          cell.isSelected
                            ? 'bg-white/30 text-white'
                            : 'bg-red-500 text-white'
                        }`}
                      >
                        {cell.matchesCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onSelectDate(todayStr);
                onClose();
              }}
              className="text-xs font-black uppercase tracking-wider text-slate-700 hover:text-[#16a34a] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#16a34a]" />
              <span>Aujourd'hui ({todayStr})</span>
            </button>

            <div className="flex items-center gap-2">
              {selectedDate && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onSelectDate('');
                    onClose();
                  }}
                  className="h-8 px-3 rounded-xl text-[10px] font-black uppercase text-red-600 border-red-200 hover:bg-red-50"
                >
                  Effacer
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={onClose}
                className="h-8 px-4 rounded-xl text-[10px] font-black uppercase bg-slate-900 hover:bg-slate-800 text-white"
              >
                Fermer
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

