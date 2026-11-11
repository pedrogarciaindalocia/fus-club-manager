import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  UserPlus,
  Link2,
  UserX,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PLAYER_CATEGORIES } from '../../../constants';
import { matchSheetIngestionService } from '../../../services/matchSheetIngestionService';
import type { FRMFPlayer } from '../types/matchSheetTypes';
import type { Player, Team } from '../../../types';

interface MyClubMissingPlayersPanelProps {
  myClubName: string;
  myClubPlayers: FRMFPlayer[];
  allDbPlayers: Player[];
  teams: Team[];
  matchCategory: string;
  season: string;
  onLinkExisting: (playerIndex: number, dbPlayer: Player) => void;
  onPlayerCreated: (playerIndex: number, created: Player) => void;
  onSetIgnored: (playerIndex: number, ignored: boolean) => void;
}

export const MyClubMissingPlayersPanel: React.FC<MyClubMissingPlayersPanelProps> = ({
  myClubName,
  myClubPlayers,
  allDbPlayers,
  teams,
  matchCategory,
  season,
  onLinkExisting,
  onPlayerCreated,
  onSetIgnored,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftJersey, setDraftJersey] = useState<number>(0);
  const [draftCategory, setDraftCategory] = useState(matchCategory);
  const [draftIsGk, setDraftIsGk] = useState(false);
  const [creatingIndex, setCreatingIndex] = useState<number | null>(null);

  const missingEntries = myClubPlayers
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => !player.matchedPlayerId);

  const pendingEntries = missingEntries.filter(
    ({ player }) => player.matchResolution !== 'ignored'
  );
  const ignoredEntries = missingEntries.filter(
    ({ player }) => player.matchResolution === 'ignored'
  );

  if (missingEntries.length === 0) {
    return null;
  }

  const openCreateConfirm = (index: number, p: FRMFPlayer) => {
    setEditingIndex(index);
    setDraftName(p.name);
    setDraftJersey(p.jerseyNumber || 0);
    setDraftCategory(p.expectedCategory || matchCategory);
    setDraftIsGk(p.isGoalkeeper);
  };

  const handleConfirmCreate = async (index: number, p: FRMFPlayer) => {
    if (!draftName.trim()) {
      toast.error('Veuillez saisir le nom complet du joueur.');
      return;
    }
    setCreatingIndex(index);
    try {
      const created = await matchSheetIngestionService.createConfirmedMyClubPlayer({
        fullName: draftName.trim(),
        jerseyNumber: draftJersey,
        category: draftCategory,
        isGoalkeeper: draftIsGk,
        birthYear: p.birthYear,
        teams,
        matchCategory,
        season,
      });
      toast.success(`Joueur "${created.full_name}" ajouté à ${myClubName} !`);
      setEditingIndex(null);
      onPlayerCreated(index, created);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la création du joueur');
    } finally {
      setCreatingIndex(null);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent border border-rose-500/30 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-rose-300 font-semibold text-sm">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            Joueurs absents de {myClubName} ({pendingEntries.length} à confirmer)
          </span>
        </div>
        <Badge variant="outline" className="border-rose-500/40 text-rose-300 bg-rose-500/10 text-[10px]">
          Aucun ajout automatique
        </Badge>
      </div>

      <p className="text-[11px] text-slate-300">
        Ces joueurs figurant sur la feuille FRMF n'existent pas dans l'effectif de <strong>{myClubName}</strong>.
        Souhaitez-vous les ajouter, les associer à un joueur existant ou les ignorer ?
      </p>

      {pendingEntries.length > 0 && (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {pendingEntries.map(({ player: p, index }) => {
            const isEditing = editingIndex === index;
            const isCreating = creatingIndex === index;

            return (
              <div
                key={`${p.license || p.name}-${index}`}
                className="p-3 rounded-lg bg-slate-900/90 border border-slate-700/80 space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold flex items-center justify-center text-xs shrink-0">
                      #{p.jerseyNumber || '?'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{p.name}</span>
                        {p.isGoalkeeper && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-500/40 text-amber-300">
                            Gardien (G)
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[9px] py-0 px-1 border-slate-600 text-slate-300">
                          {p.type === 'T' ? 'Titulaire' : 'Banc (R)'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {p.license ? `Licence ${p.license}` : 'Licence non lue'}
                        {p.birthYear ? ` • Né en ${p.birthYear}` : ''}
                        {p.expectedCategory ? ` • Catégorie déduite : ${p.expectedCategory}` : ''}
                      </p>
                    </div>
                  </div>

                  {!isEditing && (
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => openCreateConfirm(index, p)}
                        className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1"
                      >
                        <UserPlus className="w-3 h-3" />
                        Ajouter à {myClubName}
                      </Button>

                      <select
                        value=""
                        onChange={(e) => {
                          const target = allDbPlayers.find(dbP => dbP.id === e.target.value);
                          if (target) onLinkExisting(index, target);
                        }}
                        className="h-7 rounded-md bg-slate-950 border border-slate-700 text-slate-200 text-[11px] px-2 max-w-[180px]"
                        title="Associer à un joueur existant"
                      >
                        <option value="">Associer à existant...</option>
                        {allDbPlayers.map(dbP => {
                          const teamCat = teams.find(t => t.id === dbP.team_id)?.category;
                          return (
                            <option key={dbP.id} value={dbP.id}>
                              {dbP.full_name} {teamCat ? `(${teamCat})` : ''} {dbP.jersey_number ? `#${dbP.jersey_number}` : ''}
                            </option>
                          );
                        })}
                      </select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onSetIgnored(index, true)}
                        className="h-7 px-2 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 gap-1"
                        title="Ne pas ajouter ce joueur"
                      >
                        <UserX className="w-3 h-3" />
                        Ignorer
                      </Button>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400">Nom complet</label>
                      <Input
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        className="h-8 text-xs bg-slate-950 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400">N° Maillot</label>
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={draftJersey || ''}
                        onChange={(e) => setDraftJersey(parseInt(e.target.value, 10) || 0)}
                        className="h-8 text-xs bg-slate-950 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400">Catégorie</label>
                      <select
                        value={draftCategory}
                        onChange={(e) => setDraftCategory(e.target.value)}
                        className="w-full h-8 rounded-md bg-slate-950 border border-slate-700 text-xs text-white px-2"
                      >
                        {PLAYER_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-4 flex flex-wrap items-center justify-between gap-2 pt-1">
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={draftIsGk}
                          onChange={(e) => setDraftIsGk(e.target.checked)}
                          className="rounded border-slate-600 bg-slate-950"
                        />
                        <span>Poste Gardien de but (GK)</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingIndex(null)}
                          disabled={isCreating}
                          className="h-7 text-xs text-slate-400 hover:text-white"
                        >
                          Annuler
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleConfirmCreate(index, p)}
                          disabled={isCreating}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5"
                        >
                          {isCreating ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Ajout...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Confirmer l'ajout
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {ignoredEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
          <span>{ignoredEntries.length} joueur(s) ignoré(s) :</span>
          {ignoredEntries.map(({ player, index }) => (
            <button
              key={`ignored-${index}`}
              type="button"
              onClick={() => onSetIgnored(index, false)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-[10px]"
              title="Cliquer pour réafficher"
            >
              <Link2 className="w-2.5 h-2.5" />
              {player.name} (rétablir)
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

