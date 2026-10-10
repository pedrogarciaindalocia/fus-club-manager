import React, { useState } from 'react';
import type { TrialCandidate, CandidateEvaluation } from '../types/recruitment';
import PlayerRadarChart from './PlayerRadarChart';
import { Swords, Check, Plus, Sparkles, TrendingUp, Award, User, Shield } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface RadarComparisonViewProps {
  candidates: TrialCandidate[];
  evaluations: CandidateEvaluation[];
}

const PLAYER_COLORS = [
  '#ef4444', // Rouge FUS
  '#3b82f6', // Bleu
  '#10b981', // Vert émeraude
  '#8b5cf6', // Violet
];

export const RadarComparisonView: React.FC<RadarComparisonViewProps> = ({
  candidates,
  evaluations,
}) => {
  const evaluatedCandidates = candidates.filter(c => 
    evaluations.some(e => e.candidate_id === c.id)
  );

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    return evaluatedCandidates.slice(0, 2).map(c => c.id);
  });

  const [detailedView, setDetailedView] = useState(false);

  const toggleSelectPlayer = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter(i => i !== id));
      }
    } else {
      if (selectedIds.length < 4) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const selectedPlayersData = selectedIds.map((id, index) => {
    const candidate = candidates.find(c => c.id === id);
    const evalData = evaluations.find(e => e.candidate_id === id) || {
      id: `eval-fallback-${id}`,
      candidate_id: id,
      evaluator_name: 'Scout',
      evaluation_date: new Date().toISOString().split('T')[0],
      tech_ball_control: 7.0, tech_first_touch: 7.0, tech_passing_short: 7.0, tech_passing_long: 7.0,
      tech_dribbling: 7.0, tech_crossing: 7.0, tech_finishing: 7.0, tech_heading: 7.0,
      tech_1v1_attacking: 7.0, tech_1v1_defending: 7.0, tech_weak_foot: 7.0, technical_score: 7.0,
      phys_acceleration: 7.0, phys_sprint_speed: 7.0, phys_agility: 7.0, phys_balance: 7.0,
      phys_strength: 7.0, phys_endurance: 7.0, phys_explosiveness: 7.0, physical_score: 7.0,
      tact_positioning: 7.0, tact_awareness: 7.0, tact_decision_making: 7.0, tact_anticipation: 7.0,
      tact_space_awareness: 7.0, tact_transition: 7.0, tactical_score: 7.0,
      ment_concentration: 7.0, ment_discipline: 7.0, ment_motivation: 7.0, ment_confidence: 7.0,
      ment_teamwork: 7.0, ment_leadership: 7.0, ment_coachability: 7.0, mental_score: 7.0,
      overall_score: 7.0,
      verdict: 'shortlist',
    } as CandidateEvaluation;

    return {
      candidate,
      eval: evalData,
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],
      name: candidate ? `${candidate.first_name} ${candidate.last_name}` : 'Joueur inconnu',
    };
  });

  return (
    <div className="space-y-6">
      {/* Header & Selection */}
      <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" />
              Comparateur Visuel & Matrice d'Évaluation (Échelle 1–10)
            </h2>
            <p className="text-xs text-muted-foreground">
              Superposez 2 à 4 joueurs pour comparer leurs 4 piliers fondamentaux et identifier les écarts de performance.
            </p>
          </div>

          <button
            onClick={() => setDetailedView(!detailedView)}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5",
              detailedView 
                ? "bg-primary text-white border-primary shadow-sm" 
                : "bg-white text-muted-foreground hover:text-foreground border-slate-200"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {detailedView ? "Vue Détaillée (10 critères)" : "Vue Synthétique (6 axes)"}
          </button>
        </div>

        {/* Badges de sélection */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {evaluatedCandidates.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              Aucun joueur évalué pour le moment. Veuillez enregistrer au moins une évaluation pour lancer la comparaison.
            </p>
          ) : (
            evaluatedCandidates.map((cand) => {
              const isSelected = selectedIds.includes(cand.id);
              const selectedIdx = selectedIds.indexOf(cand.id);
              const playerColor = isSelected ? PLAYER_COLORS[selectedIdx % PLAYER_COLORS.length] : undefined;

              return (
                <button
                  key={cand.id}
                  onClick={() => toggleSelectPlayer(cand.id)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border",
                    isSelected
                      ? "shadow-sm text-white"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                  )}
                  style={isSelected ? { backgroundColor: playerColor, borderColor: playerColor } : {}}
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                    {isSelected ? <Check className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-slate-500" />}
                  </span>
                  <span>{cand.first_name} {cand.last_name}</span>
                  <span className="opacity-80 text-[10px] uppercase font-normal">({cand.primary_position})</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Grid Radar & Metrics Matrix */}
      {selectedPlayersData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Radar Chart Card */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border shadow-sm flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-foreground">Superposition Radar des Profils</h3>
              <span className="text-[11px] text-muted-foreground bg-slate-100 px-2.5 py-1 rounded-full">
                {selectedPlayersData.length} joueur(s) comparé(s)
              </span>
            </div>

            <div className="w-full">
              <PlayerRadarChart
                evaluations={selectedPlayersData.map(p => ({
                  name: p.name,
                  color: p.color,
                  eval: p.eval,
                }))}
                detailed={detailedView}
                height={390}
              />
            </div>

            {/* Légende */}
            <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t">
              {selectedPlayersData.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">Note : <span className="font-bold text-foreground">{p.eval.overall_score || 0}/10</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tableau Comparatif des 4 Piliers */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Matrice Comparative des Scores (1 à 10)
              </h3>

              <div className="space-y-3.5">
                {[
                  { label: '⚽ Pilier Technique (30%)', key: 'technical_score' as const },
                  { label: '🏃 Pilier Physique (25%)', key: 'physical_score' as const },
                  { label: '🧭 Pilier Tactique (25%)', key: 'tactical_score' as const },
                  { label: '🧠 Pilier Mental (20%)', key: 'mental_score' as const },
                ].map((pillar) => {
                  const maxVal = Math.max(...selectedPlayersData.map(p => Number(p.eval[pillar.key]) || 0));

                  return (
                    <div key={pillar.label} className="p-3 bg-slate-50/90 rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                        <span>{pillar.label}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">Échelle 1–10</span>
                      </div>

                      <div className="space-y-1.5">
                        {selectedPlayersData.map((p, i) => {
                          const val = Number(p.eval[pillar.key]) || 0;
                          const isLeader = val === maxVal && selectedPlayersData.length > 1;

                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-slate-600 w-28 truncate">
                                {p.candidate?.last_name || p.name}
                              </span>
                              <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${(val / 10) * 100}%`,
                                    backgroundColor: p.color,
                                  }}
                                />
                              </div>
                              <span className={cn(
                                "text-xs font-bold w-12 text-right",
                                isLeader ? "text-emerald-600 flex items-center justify-end gap-1" : "text-slate-700"
                              )}>
                                {val.toFixed(1)}
                                {isLeader && <Award className="w-3 h-3" />}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Score Global Pondéré */}
                <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border border-red-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Score Global Pondéré
                  </span>
                  <div className="flex items-center gap-3">
                    {selectedPlayersData.map((p, i) => (
                      <div key={i} className="text-right">
                        <span className="text-[10px] text-muted-foreground block truncate max-w-[60px]">
                          {p.candidate?.last_name}
                        </span>
                        <span className="text-sm font-black text-primary">
                          {p.eval.overall_score || 0}/10
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Fiches Profil Express */}
            <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedPlayersData.map((p, i) => (
                <div key={i} className="p-2.5 rounded-xl border bg-white flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs" style={{ color: p.color }}>
                    <User className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {p.candidate?.primary_position} • {p.candidate?.current_club || 'Sans club'}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-500">
                      Pied : {p.candidate?.preferred_foot} • {p.candidate?.height_cm ? `${p.candidate.height_cm} cm` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default RadarComparisonView;
