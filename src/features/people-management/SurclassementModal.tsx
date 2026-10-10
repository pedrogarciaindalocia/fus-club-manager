import React, { useState } from 'react';
import { X, ArrowUpCircle, RotateCcw, Clock, CheckCircle2, AlertTriangle, ChevronUp } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { isHigherCategory } from '../../services/surclassementService';
import type { Player, Team, PlayerSurclassement } from '../../types';
import type { SurclassementWithDetails } from '../../services/surclassementService';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return d; }
};

const CAT_COLORS: Record<string, string> = {
  SENIOR: 'bg-amber-500', PRO: 'bg-amber-600',
  U23: 'bg-yellow-500', U21: 'bg-yellow-400',
  U19: 'bg-lime-500', U17: 'bg-green-500',
  U16: 'bg-emerald-500', U15: 'bg-teal-500',
  U13: 'bg-cyan-500', U11: 'bg-sky-500',
  U9: 'bg-blue-500', U7: 'bg-indigo-500',
};

const catColor = (cat: string) => CAT_COLORS[cat] ?? 'bg-slate-500';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  player: Player;
  teams: Team[];
  /** Équipe réelle d'origine (fournie par le wrapper pour gérer le cas où team_id a déjà été déplacé) */
  originalTeam?: Team;
  activeSurclassement: PlayerSurclassement | null;
  history: SurclassementWithDetails[];
  historyLoading: boolean;
  isCreating: boolean;
  isReverting: boolean;
  onConfirmSurclasser: (targetTeamId: string, notes: string, targetJerseyNumber: number | null) => void;
  onConfirmRevert: (surclassementId: string) => void;
  onClose: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function SurclassementModal({
  player,
  teams,
  originalTeam,
  activeSurclassement,
  history,
  historyLoading,
  isCreating,
  isReverting,
  onConfirmSurclasser,
  onConfirmRevert,
  onClose,
}: Props) {
  // Si le joueur est déjà surclassé, son team_id pointe vers l'équipe cible ;
  // on utilise originalTeam (passé par le wrapper) comme référence réelle.
  const currentTeam = originalTeam ?? teams.find(t => t.id === player.team_id);
  const currentCategory = currentTeam?.category ?? '';

  // Équipes cibles : strictement catégorie supérieure, exclu l'équipe actuelle
  const eligibleTeams = teams.filter(
    t => t.id !== player.team_id && isHigherCategory(currentCategory, t.category)
  );

  const [targetTeamId, setTargetTeamId] = useState(eligibleTeams[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  const [targetJerseyNumber, setTargetJerseyNumber] = useState<string>('');
  const [tab, setTab] = useState<'action' | 'history'>('action');
  const [confirmRevert, setConfirmRevert] = useState(false);

  const targetTeam = teams.find(t => t.id === targetTeamId);

  const handleSubmit = () => {
    if (!targetTeamId) return;
    const jersey = targetJerseyNumber !== '' ? parseInt(targetJerseyNumber, 10) : null;
    onConfirmSurclasser(targetTeamId, notes, jersey);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-orange-500 to-amber-500 p-6 pb-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-white/30 shadow-xl flex-shrink-0">
              <img
                src={
                  player.photo_url && player.photo_url !== 'null'
                    ? player.photo_url
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=random&color=fff&size=200`
                }
                alt={player.full_name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">
                {activeSurclassement ? 'Surclassement actif' : 'Surclassement'}
              </p>
              <h3 className="text-white font-black text-xl uppercase tracking-tight leading-tight">
                {player.full_name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-black text-white px-2 py-0.5 rounded-full ${catColor(currentCategory)} bg-opacity-80`}>
                  {currentCategory || 'N/A'}
                </span>
                {activeSurclassement && (
                  <>
                    <ChevronUp className="w-3 h-3 text-white/70" />
                    <span className={`text-[10px] font-black text-white px-2 py-0.5 rounded-full ${catColor(activeSurclassement.target_category)} bg-opacity-80`}>
                      {activeSurclassement.target_category}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-slate-50">
          {(['action', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${
                tab === t
                  ? 'text-orange-500 border-b-2 border-orange-500 bg-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'action' ? '⚡ Action' : '📋 Historique'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {tab === 'action' ? (
              <motion.div key="action" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>

                {/* ── Surclassement actif → proposer réintégration ── */}
                {activeSurclassement ? (
                  <div className="space-y-5">
                    <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        <p className="text-[11px] font-black uppercase tracking-widest text-orange-600">
                          Surclassé depuis le {fmtDate(activeSurclassement.promoted_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-black text-white px-3 py-1 rounded-xl ${catColor(activeSurclassement.original_category)}`}>
                          {activeSurclassement.original_category}
                        </span>
                        <ArrowUpCircle className="w-4 h-4 text-orange-400" />
                        <span className={`text-xs font-black text-white px-3 py-1 rounded-xl ${catColor(activeSurclassement.target_category)}`}>
                          {activeSurclassement.target_category}
                        </span>
                      </div>
                      {activeSurclassement.notes && (
                        <p className="text-xs text-slate-500 italic">"{activeSurclassement.notes}"</p>
                      )}
                    </div>

                    {!confirmRevert ? (
                      <Button
                        onClick={() => setConfirmRevert(true)}
                        className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs gap-2 bg-slate-700 hover:bg-slate-800 text-white"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Réintégrer dans {activeSurclassement.original_category}
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex gap-3">
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-red-700 font-semibold">
                            Confirmer la réintégration de <strong>{player.full_name}</strong> dans la catégorie <strong>{activeSurclassement.original_category}</strong> ?
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setConfirmRevert(false)}
                            className="flex-1 h-11 rounded-2xl font-black uppercase text-xs"
                          >
                            Annuler
                          </Button>
                          <Button
                            onClick={() => onConfirmRevert(activeSurclassement.id)}
                            disabled={isReverting}
                            className="flex-1 h-11 rounded-2xl font-black uppercase text-xs bg-red-600 hover:bg-red-700 text-white gap-2"
                          >
                            {isReverting ? (
                              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />Réintégration…</span>
                            ) : (
                              <><RotateCcw className="w-3 h-3" />Confirmer</>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Pas de surclassement actif → formulaire de création ── */
                  <div className="space-y-5">
                    {eligibleTeams.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center space-y-2">
                        <p className="text-2xl">🚫</p>
                        <p className="text-sm font-bold text-slate-500">
                          Aucune équipe de catégorie supérieure disponible.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Créez d'abord une équipe dans une catégorie au-dessus de <strong>{currentCategory || 'N/A'}</strong>.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Équipe cible */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Équipe cible (catégorie supérieure)
                          </label>
                          <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto pr-1">
                            {eligibleTeams.map(team => (
                              <button
                                key={team.id}
                                onClick={() => setTargetTeamId(team.id)}
                                className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
                                  targetTeamId === team.id
                                    ? 'border-orange-400 bg-orange-50'
                                    : 'border-slate-100 hover:border-slate-300 bg-white'
                                }`}
                              >
                                <span className={`w-2.5 h-2.5 rounded-full ${catColor(team.category)}`} />
                                <span className="font-black text-sm flex-1">{team.name}</span>
                                <span className={`text-[10px] font-black text-white px-2 py-0.5 rounded-full ${catColor(team.category)}`}>
                                  {team.category}
                                </span>
                                {targetTeamId === team.id && (
                                  <CheckCircle2 className="w-4 h-4 text-orange-500" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Flèche promotion */}
                        {targetTeam && (
                          <div className="flex items-center justify-center gap-3 py-2">
                            <span className={`text-xs font-black text-white px-3 py-1.5 rounded-xl ${catColor(currentCategory)}`}>
                              {currentCategory}
                            </span>
                            <ArrowUpCircle className="w-5 h-5 text-orange-400" />
                            <span className={`text-xs font-black text-white px-3 py-1.5 rounded-xl ${catColor(targetTeam.category)}`}>
                              {targetTeam.category}
                            </span>
                          </div>
                        )}

                        {/* Numéro de maillot dans l'équipe cible */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            N° maillot dans l'équipe cible
                          </label>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-xs font-black text-muted-foreground bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                                Actuel #{player.jersey_number ?? '—'}
                              </span>
                              <span className="text-slate-300 font-black">→</span>
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={targetJerseyNumber}
                                onChange={e => setTargetJerseyNumber(e.target.value)}
                                placeholder="N° cible"
                                className="w-28 px-4 py-2 rounded-xl border border-slate-200 text-sm font-black text-center focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                              />
                            </div>
                            {targetJerseyNumber && (
                              <button
                                onClick={() => setTargetJerseyNumber('')}
                                className="text-[10px] font-black text-muted-foreground hover:text-slate-600 underline"
                              >
                                Effacer
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Laisser vide pour conserver le numéro actuel ({player.jersey_number ?? '—'})
                          </p>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Motif / Notes (optionnel)
                          </label>
                          <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Ex : blessé du titulaire, besoin de renforts…"
                            rows={3}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium resize-none focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                          />
                        </div>

                        {/* Submit */}
                        <Button
                          onClick={handleSubmit}
                          disabled={!targetTeamId || isCreating}
                          className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200"
                        >
                          {isCreating ? (
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                              Enregistrement…
                            </span>
                          ) : (
                            <><ArrowUpCircle className="w-4 h-4" />Surclasser le joueur</>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              /* ── Onglet Historique ── */
              <motion.div key="history" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                {historyLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <p className="text-3xl">📋</p>
                    <p className="text-sm font-bold text-muted-foreground">Aucun surclassement enregistré</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {history.map(s => (
                      <div
                        key={s.id}
                        className={`rounded-2xl p-4 border ${
                          s.status === 'active'
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-slate-50 border-slate-200 opacity-70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-black text-white px-2 py-0.5 rounded-full ${catColor(s.original_category)}`}>
                              {s.original_category}
                            </span>
                            <ArrowUpCircle className="w-3 h-3 text-slate-400" />
                            <span className={`text-[10px] font-black text-white px-2 py-0.5 rounded-full ${catColor(s.target_category)}`}>
                              {s.target_category}
                            </span>
                            {s.status === 'active' ? (
                              <Badge className="bg-orange-100 text-orange-600 border-none text-[9px] font-black uppercase">
                                Actif
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-500">
                                Réintégré
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground font-semibold">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Promu le {fmtDate(s.promoted_at)}
                          </span>
                          {s.reverted_at && (
                            <span className="flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" />
                              Réintégré le {fmtDate(s.reverted_at)}
                            </span>
                          )}
                        </div>

                        {s.notes && (
                          <p className="mt-2 text-[11px] text-slate-500 italic">"{s.notes}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
