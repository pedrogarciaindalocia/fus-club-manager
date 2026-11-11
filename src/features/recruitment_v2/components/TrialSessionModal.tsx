import React, { useState, useEffect } from 'react';
import type { PlayerTest, TrialCandidate } from '../types/recruitment';
import { X, Calendar } from 'lucide-react';
import { TrialSessionPlannerForm } from './TrialSessionPlannerForm';

interface TrialSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (test: Omit<PlayerTest, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onSaveBatch?: (tests: Omit<PlayerTest, 'id' | 'created_at' | 'updated_at'>[]) => Promise<any>;
  onUpdate?: (id: string, test: Partial<PlayerTest>) => Promise<any>;
  initialTest?: PlayerTest | null;
  defaultDate?: string;
  defaultDates?: string[];
  defaultCandidateId?: string;
  candidates?: TrialCandidate[];
  scouts?: any[];
}

export const TrialSessionModal: React.FC<TrialSessionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveBatch,
  onUpdate,
  initialTest,
  defaultDate,
  defaultDates,
  defaultCandidateId,
  candidates,
  scouts,
}) => {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    if (defaultDates && defaultDates.length > 0) {
      setSelectedDates(Array.from(new Set(defaultDates)).sort());
    } else if (defaultDate) {
      setSelectedDates([defaultDate]);
    } else if (!initialTest) {
      setSelectedDates([new Date().toISOString().split('T')[0]]);
    }
  }, [isOpen, defaultDate, defaultDates?.join(','), initialTest?.id]);

  if (!isOpen) return null;

  const handleSaveBatch = async (testsPayload: Omit<PlayerTest, 'id' | 'created_at' | 'updated_at'>[]) => {
    if (onSaveBatch) {
      await onSaveBatch(testsPayload);
    } else {
      for (const item of testsPayload) {
        await onSave(item);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground tracking-tight">
                {initialTest ? 'Modifier la Session de Test' : 'Planifier des Sessions de Test'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Sélection multi-jours et convocation multi-joueurs avec recherche
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <TrialSessionPlannerForm
          variant="modal"
          selectedDates={selectedDates}
          onSelectedDatesChange={setSelectedDates}
          initialTest={initialTest}
          defaultCandidateId={defaultCandidateId}
          candidates={candidates}
          scouts={scouts}
          onSaveBatch={handleSaveBatch}
          onUpdate={onUpdate}
          onSuccess={onClose}
          onCancel={onClose}
        />
      </div>
    </div>
  );
};

export default TrialSessionModal;
