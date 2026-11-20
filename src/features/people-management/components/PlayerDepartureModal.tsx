import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  ArrowRightLeft,
  Calendar,
  Building2,
  Coins,
  FileText,
  Trash2,
  RotateCcw,
  ShieldAlert,
  Loader2,
  Check,
} from 'lucide-react';
import {
  DEPARTURE_STATUS_META,
  DEPARTURE_TYPE_META,
  type DeparturePlayerSummary,
  type DepartureStatus,
  type DepartureType,
  type PlayerDeparture,
  playerDepartureService,
  shouldDeactivateOnDeparture,
} from '../../../services/playerDepartureService';

interface PlayerDepartureModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  initialDeparture?: PlayerDeparture | null;
  preselectedPlayer?: DeparturePlayerSummary | null;
  players: DeparturePlayerSummary[];
  teamNamesById?: Record<string, string>;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onSaved: () => Promise<void> | void;
  onDeleted?: () => Promise<void> | void;
}

export const PlayerDepartureModal: React.FC<PlayerDepartureModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialDeparture,
  preselectedPlayer,
  players,
  teamNamesById = {},
  canCreate,
  canUpdate,
  canDelete,
  onSaved,
  onDeleted,
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [departureType, setDepartureType] = useState<DepartureType>('transfer');
  const [status, setStatus] = useState<DepartureStatus>('completed');
  const [departureDate, setDepartureDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [destinationClub, setDestinationClub] = useState('');
  const [transferFee, setTransferFee] = useState('');
  const [currency, setCurrency] = useState('MAD');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [deactivatePlayer, setDeactivatePlayer] = useState(true);
  const [manualDeactivateTouched, setManualDeactivateTouched] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isReadOnly =
    mode === 'view' ||
    (mode === 'create' && !canCreate) ||
    (mode === 'edit' && !canUpdate);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setConfirmDelete(false);
    setManualDeactivateTouched(false);

    if (initialDeparture) {
      setSelectedPlayerId(initialDeparture.player_id);
      setDepartureType(initialDeparture.departure_type);
      setStatus(initialDeparture.status);
      setDepartureDate(initialDeparture.departure_date || new Date().toISOString().slice(0, 10));
      setDestinationClub(initialDeparture.destination_club || '');
      setTransferFee(
        initialDeparture.transfer_fee !== null && initialDeparture.transfer_fee !== undefined
          ? String(initialDeparture.transfer_fee)
          : ''
      );
      setCurrency(initialDeparture.currency || 'MAD');
      setReason(initialDeparture.reason || '');
      setNotes(initialDeparture.notes || '');
      const linkedPlayer =
        initialDeparture.player || players.find(p => p.id === initialDeparture.player_id);
      setDeactivatePlayer(
        linkedPlayer?.is_active === false ||
          shouldDeactivateOnDeparture(initialDeparture.status, initialDeparture.departure_type)
      );
    } else {
      const targetPlayerId = preselectedPlayer?.id || '';
      setSelectedPlayerId(targetPlayerId);
      setDepartureType('transfer');
      setStatus('completed');
      setDepartureDate(new Date().toISOString().slice(0, 10));
      setDestinationClub('');
      setTransferFee('');
      setCurrency('MAD');
      setReason('');
      setNotes('');
      setDeactivatePlayer(true);
    }
  }, [isOpen, initialDeparture, preselectedPlayer, players]);

  useEffect(() => {
    if (!isOpen || mode !== 'create' || manualDeactivateTouched) return;
    setDeactivatePlayer(shouldDeactivateOnDeparture(status, departureType));
  }, [status, departureType, mode, isOpen, manualDeactivateTouched]);

  const activePlayer = useMemo(() => {
    if (preselectedPlayer && preselectedPlayer.id === selectedPlayerId) {
      return preselectedPlayer;
    }
    if (initialDeparture?.player && initialDeparture.player.id === selectedPlayerId) {
      return initialDeparture.player;
    }
    return players.find(p => p.id === selectedPlayerId) || preselectedPlayer || null;
  }, [players, preselectedPlayer, initialDeparture, selectedPlayerId]);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aActive = a.is_active !== false ? 0 : 1;
      const bActive = b.is_active !== false ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return a.full_name.localeCompare(b.full_name);
    });
  }, [players]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!selectedPlayerId) {
      setErrorMsg('Veuillez sélectionner un joueur.');
      return;
    }
    if (!departureDate) {
      setErrorMsg('Veuillez renseigner une date de sortie.');
      return;
    }

    const parsedFee = transferFee.trim() === '' ? null : Number(transferFee.replace(',', '.'));
    if (parsedFee !== null && (Number.isNaN(parsedFee) || parsedFee < 0)) {
      setErrorMsg("L'indemnité de transfert doit être un nombre positif valide.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      if (mode === 'create') {
        await playerDepartureService.createDeparture({
          player_id: selectedPlayerId,
          team_id: activePlayer?.team_id || null,
          departure_type: departureType,
          status,
          departure_date: departureDate,
          destination_club: destinationClub,
          transfer_fee: parsedFee,
          currency,
          reason,
          notes,
          deactivate_player: deactivatePlayer,
        });
      } else if (initialDeparture) {
        await playerDepartureService.updateDeparture(initialDeparture.id, {
          departure_type: departureType,
          status,
          departure_date: departureDate,
          destination_club: destinationClub,
          transfer_fee: parsedFee,
          currency,
          reason,
          notes,
          deactivate_player: deactivatePlayer,
        });
      }
      await onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement de la sortie.";
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reintegrate: boolean) => {
    if (!initialDeparture || !canDelete) return;
    setDeleting(true);
    setErrorMsg(null);
    try {
      await playerDepartureService.deleteDeparture(
        initialDeparture.id,
        initialDeparture.player_id,
        reintegrate
      );
      if (onDeleted) await onDeleted();
      else await onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la suppression.';
      setErrorMsg(msg);
    } finally {
      setDeleting(false);
    }
  };

  const modalTitle =
    mode === 'create'
      ? 'Déclarer une Sortie / Transfert'
      : mode === 'edit'
        ? 'Modifier le Dossier de Sortie'
        : 'Détail de Sortie / Transfert';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* En-tête */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-foreground truncate">{modalTitle}</h3>
              <p className="text-xs text-muted-foreground truncate">
                Gestion administrative des mouvements sortants de l&apos;effectif
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Joueur concerné */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Joueur concerné *
            </label>
            {mode === 'create' && !preselectedPlayer ? (
              <select
                value={selectedPlayerId}
                disabled={isReadOnly}
                onChange={e => setSelectedPlayerId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="">-- Sélectionner un joueur --</option>
                {sortedPlayers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                    {p.jersey_number ? ` (#${p.jersey_number})` : ''}
                    {p.team_id && teamNamesById[p.team_id] ? ` — ${teamNamesById[p.team_id]}` : ''}
                    {p.is_active === false ? ' [Sorti / Inactif]' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {activePlayer?.photo_url ? (
                    <img
                      src={activePlayer.photo_url}
                      alt={activePlayer.full_name}
                      className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center font-black text-sm shrink-0">
                      {(activePlayer?.full_name || 'J')[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {activePlayer?.full_name || 'Joueur'}
                      {activePlayer?.jersey_number ? ` · #${activePlayer.jersey_number}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activePlayer?.position || 'Poste N/A'}
                      {activePlayer?.team_id && teamNamesById[activePlayer.team_id]
                        ? ` · ${teamNamesById[activePlayer.team_id]}`
                        : ''}
                    </p>
                  </div>
                </div>
                {activePlayer?.is_active === false && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30 shrink-0">
                    Inactif
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Type + Statut + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Type de sortie
              </label>
              <select
                value={departureType}
                disabled={isReadOnly}
                onChange={e => setDepartureType(e.target.value as DepartureType)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-70"
              >
                {(Object.keys(DEPARTURE_TYPE_META) as DepartureType[]).map(typeKey => (
                  <option key={typeKey} value={typeKey}>
                    {DEPARTURE_TYPE_META[typeKey].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Statut
              </label>
              <select
                value={status}
                disabled={isReadOnly}
                onChange={e => setStatus(e.target.value as DepartureStatus)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-70"
              >
                {(Object.keys(DEPARTURE_STATUS_META) as DepartureStatus[]).map(stKey => (
                  <option key={stKey} value={stKey}>
                    {DEPARTURE_STATUS_META[stKey].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Date effective *</span>
              </label>
              <input
                type="date"
                value={departureDate}
                disabled={isReadOnly}
                onChange={e => setDepartureDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-70"
              />
            </div>
          </div>

          {/* Club de destination + Indemnité */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Club de destination / Accueil</span>
              </label>
              <input
                type="text"
                value={destinationClub}
                disabled={isReadOnly}
                onChange={e => setDestinationClub(e.target.value)}
                placeholder="Ex: Raja CA, Wydad AC, Club étranger, Agent libre..."
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-70"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Indemnité</span>
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={transferFee}
                  disabled={isReadOnly}
                  onChange={e => setTransferFee(e.target.value)}
                  placeholder="0"
                  className="w-full px-2.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-70"
                />
                <select
                  value={currency}
                  disabled={isReadOnly}
                  onChange={e => setCurrency(e.target.value)}
                  className="px-2 py-2 rounded-xl bg-background border border-border text-xs font-bold text-foreground disabled:opacity-70"
                >
                  <option value="MAD">MAD</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Motif */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Motif / Décision
            </label>
            <input
              type="text"
              value={reason}
              disabled={isReadOnly}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex: Opportunité équipe première, fin de cycle formation, choix familial..."
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-70"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Notes administratives & conditions</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              disabled={isReadOnly}
              onChange={e => setNotes(e.target.value)}
              placeholder="Clauses de rachat, pourcentage à la revente, durée du prêt..."
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-70 resize-none"
            />
          </div>

          {/* Sync statut effectif */}
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
              deactivatePlayer
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-muted/20 border-border'
            } ${isReadOnly ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              type="checkbox"
              checked={deactivatePlayer}
              disabled={isReadOnly || status !== 'completed'}
              onChange={e => {
                setManualDeactivateTouched(true);
                setDeactivatePlayer(e.target.checked);
              }}
              className="mt-0.5 rounded border-border accent-amber-600"
            />
            <div className="text-xs">
              <span className="font-bold text-foreground block">
                Retirer le joueur de l&apos;effectif actif (`is_active = false`)
              </span>
              <span className="text-muted-foreground">
                {status === 'completed'
                  ? "Le joueur n'apparaîtra plus dans la liste active de sa catégorie tout en restant consultable dans le registre des Sorties & Transferts."
                  : 'Applicable uniquement lorsque le statut de la sortie est « Actée ».'}
              </span>
            </div>
          </label>
        </form>

        {/* Pied de page */}
        <div className="px-5 py-3.5 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
          <div>
            {mode === 'edit' && initialDeparture && canDelete && (
              !confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving || deleting}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer / Annuler sortie</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleDelete(true)}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    <span>Supprimer & Réintégrer joueur</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              )
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
            >
              {isReadOnly ? 'Fermer' : 'Annuler'}
            </button>
            {!isReadOnly && (
              <button
                type="button"
                onClick={e => {
                  void handleSubmit(e);
                }}
                disabled={saving || deleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{mode === 'create' ? 'Enregistrer la sortie' : 'Mettre à jour'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
