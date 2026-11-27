import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Check,
  History,
  Radio,
  Search,
  ShieldCheck,
  UserMinus,
  X,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { OFFICIAL_JOB_TITLES, resolveCanonicalJobTitle } from '../../../constants/roles';
import { usePermissions } from '../../../context/PermissionsContext';
import {
  assignOrHandoverMatchOperator,
  fetchEligibleOperators,
  isLiveMatchStatus,
  isOperatorEditableMatchStatus,
  type OperatorAssignmentResult,
  type OperatorCandidate,
  type OperatorHistoryEntry,
} from '../../../services/operatorAssignmentService';

interface OperatorAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: any;
  opponentName: string;
  matchMinute?: number | null;
  onAssigned?: (result: OperatorAssignmentResult) => void;
}

const HANDOVER_REASON_PRESETS = [
  'Batterie faible',
  'Perte réseau terrain',
  'Relève prévue',
  'Indisponibilité terrain',
];

const getInitials = (name: string) => {
  if (!name) return '';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const OperatorAssignmentModal: React.FC<OperatorAssignmentModalProps> = ({
  isOpen,
  onClose,
  match,
  opponentName,
  matchMinute,
  onAssigned,
}) => {
  const { authState } = usePermissions();
  const [availableOperators, setAvailableOperators] = useState<OperatorCandidate[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);
  const [operatorSearch, setOperatorSearch] = useState('');
  const [operatorJobFilter, setOperatorJobFilter] = useState<string>('ALL');
  const [selectedOpId, setSelectedOpId] = useState<string>('');
  const [handoverReason, setHandoverReason] = useState<string>('');
  const [savingOperator, setSavingOperator] = useState(false);

  const currentOpId: string =
    match?.live_operator_id || match?.lineup?.live_operator?.id || '';
  const currentOpName: string =
    match?.live_operator_name || match?.lineup?.live_operator?.name || '';
  const isLive = isLiveMatchStatus(match?.status);
  const isEditable = isOperatorEditableMatchStatus(match?.status);
  const operatorHistory: OperatorHistoryEntry[] = Array.isArray(match?.lineup?.operator_history)
    ? match.lineup.operator_history
    : [];

  useEffect(() => {
    if (!isOpen) return;
    setOperatorSearch('');
    setOperatorJobFilter('ALL');
    setHandoverReason('');
    setSelectedOpId(currentOpId);

    let mounted = true;
    setLoadingOperators(true);
    fetchEligibleOperators()
      .then((list) => {
        if (mounted) setAvailableOperators(list);
      })
      .catch((err) => {
        console.warn('[OperatorAssignmentModal] Error loading operators:', err);
        toast.error("Impossible de charger la liste des opérateurs.");
      })
      .finally(() => {
        if (mounted) setLoadingOperators(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, currentOpId]);

  if (!isOpen || !match) return null;

  const isReplacingDifferentOperator = Boolean(
    currentOpId && selectedOpId && currentOpId !== selectedOpId
  );

  const handleSave = async () => {
    if (!isEditable) return;
    const chosen = availableOperators.find((u) => u.id === selectedOpId);
    if (!chosen) {
      toast.error('Veuillez sélectionner un opérateur.');
      return;
    }

    setSavingOperator(true);
    try {
      const result = await assignOrHandoverMatchOperator({
        match,
        newOperator: chosen,
        opponentName,
        changedBy: {
          id: authState?.user?.id,
          name: authState?.user?.name || authState?.user?.email?.split('@')[0],
          email: authState?.user?.email,
        },
        handoverReason: isLive ? handoverReason : undefined,
        matchMinute,
      });

      onAssigned?.(result);

      if (isLive && currentOpId && currentOpId !== chosen.id) {
        toast.success(
          `🔄 Relève Live effectuée : ${chosen.full_name} reprend les commandes (${currentOpName || 'ancien opérateur'} basculé en lecture seule).`
        );
      } else {
        toast.success(
          `🎙️ Opérateur ${chosen.full_name} assigné avec accès complet sur FUS-APP.`
        );
      }
      onClose();
    } catch (err) {
      console.error('[OperatorAssignmentModal] Error saving operator:', err);
      toast.error("Erreur lors de l'enregistrement de l'opérateur.");
    } finally {
      setSavingOperator(false);
    }
  };

  const handleUnassign = async () => {
    if (!isEditable || !currentOpId || isLive) return;
    setSavingOperator(true);
    try {
      const result = await assignOrHandoverMatchOperator({
        match,
        newOperator: null,
        opponentName,
        changedBy: {
          id: authState?.user?.id,
          name: authState?.user?.name || authState?.user?.email?.split('@')[0],
          email: authState?.user?.email,
        },
      });
      onAssigned?.(result);
      toast.success(`Opérateur retiré du match FUS vs ${opponentName}.`);
      onClose();
    } catch (err) {
      console.error('[OperatorAssignmentModal] Error unassigning operator:', err);
      toast.error("Impossible de désassigner l'opérateur.");
    } finally {
      setSavingOperator(false);
    }
  };

  const extraTitles = availableOperators
    .map((u) => resolveCanonicalJobTitle(u.job_title))
    .filter((t): t is string => Boolean(t) && !(OFFICIAL_JOB_TITLES as readonly string[]).includes(t as string));
  const jobTitles = Array.from(new Set([...OFFICIAL_JOB_TITLES, ...extraTitles])).filter(
    (t) => !t.toLowerCase().includes('scout')
  );

  const filteredOperators = availableOperators.filter((u) => {
    const resolvedJob = resolveCanonicalJobTitle(u.job_title) || u.system_role || 'Collaborateur';
    if (operatorJobFilter !== 'ALL' && resolveCanonicalJobTitle(u.job_title) !== operatorJobFilter) {
      return false;
    }
    const q = operatorSearch.trim().toLowerCase();
    if (!q) return true;
    return u.full_name.toLowerCase().includes(q) || resolvedJob.toLowerCase().includes(q);
  });

  const selectedCandidate = availableOperators.find((u) => u.id === selectedOpId);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between text-white ${
            isLive
              ? 'bg-gradient-to-r from-slate-950 via-red-950 to-slate-900'
              : 'bg-gradient-to-r from-slate-900 to-indigo-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                isLive
                  ? 'bg-red-500/20 border-red-400/40 text-red-300'
                  : 'bg-white/10 border-white/20 text-indigo-300'
              }`}
            >
              {isLive ? <Radio className="w-5 h-5 animate-pulse" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider">
                  {isLive ? 'Relève Opérateur en Direct (FUS-APP)' : 'Opérateur FUS-APP'}
                </h3>
                {isLive && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/25 text-red-200 border border-red-400/40 animate-pulse">
                    🔴 Live en cours
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {isLive
                  ? `FUS vs ${opponentName} — Bascule instantanée sans coupure du chrono ni du score`
                  : `Désignez l'utilisateur qui pilotera FUS vs ${opponentName} sur FUS-APP`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Bandeau d'information Passation à chaud en cours de Live */}
          {isLive && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  {currentOpName ? (
                    <>
                      <strong>Passation à chaud :</strong> Dès validation,{' '}
                      <strong className="text-red-700">{currentOpName}</strong> passera{' '}
                      <strong>instantanément en mode consultation (lecture seule)</strong> sur FUS-APP, et{' '}
                      <strong className="text-indigo-700">
                        {selectedCandidate && selectedCandidate.id !== currentOpId
                          ? selectedCandidate.full_name
                          : 'le nouvel opérateur'}
                      </strong>{' '}
                      reprendra immédiatement le chronomètre et le score en cours.
                    </>
                  ) : (
                    <>
                      <strong>Aucun opérateur mobile actif :</strong> L'opérateur sélectionné recevra immédiatement la notification et les commandes complètes du direct sur FUS-APP.
                    </>
                  )}
                </div>
              </div>

              {currentOpId && (
                <div className="pt-1 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                    Motif de la relève (optionnel — tracé dans le journal Live)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {HANDOVER_REASON_PRESETS.map((preset) => {
                      const active = handoverReason === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setHandoverReason(active ? '' : preset)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            active
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100/70'
                          }`}
                        >
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={handoverReason}
                    onChange={(e) => setHandoverReason(e.target.value)}
                    placeholder="Ou précisez un motif (ex: téléphone déchargé à la 55e)..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-amber-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Sélection de l'opérateur */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-800">
                {isLive ? 'Choisir le nouvel opérateur Live' : "Choisir l'opérateur FUS-APP"}
              </label>
              <div className="relative w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={operatorSearch}
                  onChange={(e) => setOperatorSearch(e.target.value)}
                  placeholder="Rechercher un membre..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {loadingOperators ? (
              <div className="py-8 text-center text-xs text-slate-500 font-semibold">
                Chargement des collaborateurs éligibles...
              </div>
            ) : (
              <>
                {/* Filtre par intitulé de poste */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Filtrer par intitulé de poste
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOperatorJobFilter('ALL')}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                        operatorJobFilter === 'ALL'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Tous ({availableOperators.length})
                    </button>
                    {jobTitles.map((jt) => {
                      const count = availableOperators.filter(
                        (u) => resolveCanonicalJobTitle(u.job_title) === jt
                      ).length;
                      if (count === 0) return null;
                      const active = operatorJobFilter === jt;
                      return (
                        <button
                          key={jt}
                          type="button"
                          onClick={() => setOperatorJobFilter(jt)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            active
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {jt} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {filteredOperators.map((op) => {
                    const isSelected = selectedOpId === op.id;
                    const isCurrent = Boolean(currentOpId && currentOpId === op.id);
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setSelectedOpId(op.id)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500/30'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {op.avatar_url ? (
                          <img
                            src={op.avatar_url}
                            alt={op.full_name}
                            className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                            {getInitials(op.full_name)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {op.full_name}
                            </span>
                            {isCurrent && (
                              <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0">
                                Actuel
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {op.job_title || op.system_role || 'Collaborateur'}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                  {filteredOperators.length === 0 && (
                    <div className="col-span-full py-6 text-center text-xs text-slate-400 italic">
                      Aucun collaborateur ne correspond à votre recherche.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Historique des assignations / passations sur ce match */}
          {operatorHistory.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>Historique des passations sur ce match ({operatorHistory.length})</span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                {operatorHistory.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[10.5px]"
                  >
                    <div className="min-w-0 flex-1 truncate text-slate-700">
                      {entry.action === 'unassigned' ? (
                        <>
                          Retrait de <strong>{entry.previous_operator_name || 'Opérateur'}</strong>
                        </>
                      ) : entry.previous_operator_name &&
                        entry.previous_operator_id !== entry.new_operator_id ? (
                        <>
                          <strong>{entry.previous_operator_name}</strong> →{' '}
                          <strong className="text-indigo-700">{entry.new_operator_name}</strong>
                          {entry.reason ? ` (${entry.reason})` : ''}
                        </>
                      ) : (
                        <>
                          Assigné à <strong className="text-indigo-700">{entry.new_operator_name}</strong>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 text-[9.5px] text-slate-400 font-semibold">
                      {entry.is_live && (
                        <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-black">
                          {entry.minute != null ? `${entry.minute}'` : 'LIVE'}
                        </span>
                      )}
                      <span>
                        {new Date(entry.timestamp).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div>
            {!isLive && currentOpId && (
              <button
                type="button"
                disabled={savingOperator}
                onClick={handleUnassign}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <UserMinus className="w-3.5 h-3.5" />
                Désassigner
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!selectedOpId || savingOperator || (isLive && selectedOpId === currentOpId)}
              onClick={handleSave}
              className={`px-5 py-2 rounded-xl text-xs font-black text-white disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm ${
                isLive && isReplacingDifferentOperator
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isLive && isReplacingDifferentOperator ? (
                <ArrowLeftRight className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {savingOperator
                ? 'Transfert en cours...'
                : isLive && isReplacingDifferentOperator
                ? 'Transférer le Direct Maintenant'
                : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorAssignmentModal;
