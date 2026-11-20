import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, CheckCircle2, X, Send, Loader2, ArrowRight, BedDouble, Utensils } from 'lucide-react';
import type { TestSlotValidationInfo } from '../types/recruitment';
import { formatCompactFrenchDate } from '../utils/testDateIntervals';
import { toast } from 'sonner';

type LogisticsAvailability = 'available' | 'adjusted' | 'not_required';

interface TestSlotChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  currentStartDate: string;
  currentEndDate: string;
  currentStartTime?: string;
  slotValidation?: TestSlotValidationInfo | null;
  isAdminMode: boolean; // true = Admin / Super Admin / Responsable Vie (met à jour + valide), false = Scout Manager (demande un autre créneau)
  isResponsableVieMode?: boolean;
  onOpenPlanning?: () => void;
  onSubmit: (payload: {
    startDate: string;
    endDate: string;
    startTime: string;
    note: string;
    roomAvailability?: LogisticsAvailability;
    cateringAvailability?: LogisticsAvailability;
  }) => Promise<void> | void;
}

export const TestSlotChangeModal: React.FC<TestSlotChangeModalProps> = ({
  isOpen,
  onClose,
  candidateName,
  currentStartDate,
  currentEndDate,
  currentStartTime = '09:30',
  slotValidation,
  isAdminMode,
  isResponsableVieMode = false,
  onOpenPlanning,
  onSubmit,
}) => {
  const [startDate, setStartDate] = useState(currentStartDate);
  const [endDate, setEndDate] = useState(currentEndDate);
  const [startTime, setStartTime] = useState(currentStartTime);
  const [note, setNote] = useState('');
  const [roomAvailability, setRoomAvailability] = useState<LogisticsAvailability>('available');
  const [cateringAvailability, setCateringAvailability] = useState<LogisticsAvailability>('available');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (isAdminMode && slotValidation?.status === 'change_requested' && slotValidation.requested_start_date) {
      setStartDate(slotValidation.requested_start_date);
      setEndDate(slotValidation.requested_end_date || slotValidation.requested_start_date);
      setStartTime(slotValidation.requested_start_time || currentStartTime || '09:30');
    } else {
      setStartDate(slotValidation?.requested_start_date || currentStartDate);
      setEndDate(slotValidation?.requested_end_date || currentEndDate);
      setStartTime(slotValidation?.requested_start_time || currentStartTime || '09:30');
    }
    setNote(slotValidation?.request_note || '');
    setRoomAvailability(slotValidation?.room_availability || 'available');
    setCateringAvailability(slotValidation?.catering_availability || 'available');
  }, [isOpen, isAdminMode, currentStartDate, currentEndDate, currentStartTime, slotValidation]);

  if (!isOpen || typeof window === 'undefined' || typeof globalThis.document === 'undefined') {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) {
      toast.error('Veuillez choisir une date de début.');
      return;
    }
    const resolvedEnd = endDate && endDate >= startDate ? endDate : startDate;
    setIsSaving(true);
    try {
      await onSubmit({
        startDate,
        endDate: resolvedEnd,
        startTime: startTime || '09:30',
        note: note.trim(),
        ...(isResponsableVieMode ? { roomAvailability, cateringAvailability } : {}),
      });
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du créneau');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
      >
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/90 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900 truncate">
              {isResponsableVieMode
                ? `Ajuster le créneau (Chambre & Restauration) — ${candidateName}`
                : isAdminMode
                  ? `Changer & Valider le créneau — ${candidateName}`
                  : `Demander un autre créneau — ${candidateName}`}
            </h3>
            <p className="text-[11px] text-slate-500">
              Créneau actuel : {formatCompactFrenchDate(currentStartDate)}
              {currentEndDate !== currentStartDate ? ` → ${formatCompactFrenchDate(currentEndDate)}` : ''}
              {' · '}
              {currentStartTime || '09:30'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {slotValidation?.status === 'change_requested' && slotValidation.requested_start_date && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase text-amber-800">
                  Créneau souhaité par {slotValidation.requested_by || 'Scout Manager'}
                </span>
                {isAdminMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(slotValidation.requested_start_date!);
                      setEndDate(slotValidation.requested_end_date || slotValidation.requested_start_date!);
                      setStartTime(slotValidation.requested_start_time || currentStartTime || '09:30');
                    }}
                    className="px-2 py-0.5 rounded-lg bg-amber-600 text-white text-[10px] font-bold hover:bg-amber-700 cursor-pointer"
                  >
                    Appliquer
                  </button>
                )}
              </div>
              <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>
                  {formatCompactFrenchDate(slotValidation.requested_start_date)}
                  {slotValidation.requested_end_date &&
                  slotValidation.requested_end_date !== slotValidation.requested_start_date
                    ? ` → ${formatCompactFrenchDate(slotValidation.requested_end_date)}`
                    : ''}
                  {slotValidation.requested_start_time ? ` · ${slotValidation.requested_start_time}` : ''}
                </span>
              </p>
              {slotValidation.request_note && (
                <p className="text-[11px] text-amber-800 italic">« {slotValidation.request_note} »</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Date de début <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setStartDate(val);
                  if (!endDate || endDate < val) setEndDate(val);
                }}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Horaire de convocation</span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          {isResponsableVieMode && (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                Disponibilités Vie & Hébergement
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <BedDouble className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Chambre</span>
                  </label>
                  <select
                    value={roomAvailability}
                    onChange={(e) => setRoomAvailability(e.target.value as LogisticsAvailability)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="available">Disponible</option>
                    <option value="adjusted">Créneau ajusté (chambre)</option>
                    <option value="not_required">Non requise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Utensils className="w-3.5 h-3.5 text-amber-600" />
                    <span>Restauration</span>
                  </label>
                  <select
                    value={cateringAvailability}
                    onChange={(e) => setCateringAvailability(e.target.value as LogisticsAvailability)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="available">Disponible</option>
                    <option value="adjusted">Créneau ajusté (restauration)</option>
                    <option value="not_required">Non requise</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {isResponsableVieMode
                ? 'Précision chambre / restauration (optionnel)'
                : isAdminMode
                  ? 'Note de confirmation (optionnel)'
                  : 'Motif / Disponibilité souhaitée'}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isResponsableVieMode
                  ? 'Ex. Chambre libre à partir du 22, restauration confirmée'
                  : isAdminMode
                    ? 'Ex. Créneau déplacé suite disponibilité terrain'
                    : 'Ex. Joueur en examen scolaire le 17, disponible à partir du 20'
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              {isAdminMode && onOpenPlanning && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPlanning();
                  }}
                  className="px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Planning</span>
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className={
                isAdminMode
                  ? 'px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60'
                  : 'px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60'
              }
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isAdminMode ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>
                {isResponsableVieMode
                  ? 'Ajuster & Valider'
                  : isAdminMode
                    ? 'Valider et mettre à jour'
                    : 'Envoyer la demande'}
              </span>
              {!isSaving && <ArrowRight className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </form>
    </div>,
    globalThis.document.body
  );
};
