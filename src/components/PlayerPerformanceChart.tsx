import React, { useMemo, useState, useEffect } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { usePlayers } from '../hooks/usePlayers';
import { useMatches } from '../hooks/useMatches';
import { useAdvancedDashboardStats } from '../hooks/useAdvancedDashboardStats';
import type { Player, AgeCategory } from '../types';
import { normalizeAgeCategory } from '../constants';

// ─── TYPES ─────────────────────────────────────────────────────────────
interface PlayerPerformance {
  player: Player;
  category: AgeCategory;
  indices: {
    buts: number;           // Indice de Finition (IF)
    passes: number;         // Indice de Création (IC)
    changements: number;    // Indice de Rotation (IR)
    discipline: number;     // Indice de Discipline (ID)
    efficacite: number;     // Indice Global (IG)
  };
  rawStats: {
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    substitutionsIn: number;
    substitutionsOut: number;
    matchesPlayed: number;
  };
}

// ─── FORMULES DE CALCUL DES INDICES ────────────────────────────────────
const calculatePerformanceIndices = (
  goals: number,
  assists: number,
  yellowCards: number,
  redCards: number,
  substitutionsIn: number,
  substitutionsOut: number,
  matchesPlayed: number
) => {
  const mp = Math.max(matchesPlayed, 1); // Éviter division par zéro

  // IF - Indice de Finition: (buts/match × 25) + bonus efficacité
  // Max théorique: 100 (4 buts/match = excellent)
  const butsPerMatch = goals / mp;
  const IF = Math.min(100, Math.round((butsPerMatch * 25) + (goals > 0 ? 10 : 0)));

  // IC - Indice de Création: (passes/match × 30) + bonus collectif
  // Max théorique: 100 (3 passes/match = excellent)
  const passesPerMatch = assists / mp;
  const IC = Math.min(100, Math.round((passesPerMatch * 30) + (assists > 0 ? 5 : 0)));

  // IR - Indice de Rotation: mesure la participation via changements
  // Formule: ((entrées + sorties) / matchs × 50) → 2 changements/match = 100
  const totalSubs = substitutionsIn + substitutionsOut;
  const IR = Math.min(100, Math.round((totalSubs / mp) * 50));

  // ID - Indice de Discipline: 100 - pénalités cartons
  // Jaune: -8 points, Rouge: -25 points
  const penaltyYellow = yellowCards * 8;
  const penaltyRed = redCards * 25;
  const ID = Math.max(0, Math.round(100 - penaltyYellow - penaltyRed));

  // IG - Indice Global: moyenne pondérée
  // Finition 35% + Création 25% + Rotation 20% + Discipline 20%
  const IG = Math.round((IF * 0.35) + (IC * 0.25) + (IR * 0.20) + (ID * 0.20));

  return {
    buts: IF,
    passes: IC,
    changements: IR,
    discipline: ID,
    efficacite: IG,
  };
};

// ─── HOOK: CALCULER LES PERFORMANCES ───────────────────────────────────
const usePlayerPerformances = (): PlayerPerformance[] => {
  const { players } = usePlayers();
  const { matches } = useMatches();
  const { data: statsData } = useAdvancedDashboardStats();

  return useMemo(() => {
    if (!players.length || !matches?.length) return [];

    const finishedMatches = matches.filter(m => m.status === 'finished');
    const events = statsData?.events || [];
    const playerStats = statsData?.playerStats || [];

    return players
      .map(player => {
        // Récupérer les matchs où ce joueur a participé
        const playerMatchIds = new Set<string>();
        finishedMatches.forEach(m => {
          if (m.lineup?.startingXI?.includes(player.id) || m.lineup?.substitutes?.includes(player.id)) {
            playerMatchIds.add(m.id);
          }
        });

        const matchesPlayed = playerMatchIds.size;
        if (matchesPlayed === 0) return null;

        // Compter les statistiques depuis les événements de match
        let goals = 0, assists = 0, yellowCards = 0, redCards = 0;
        let substitutionsIn = 0, substitutionsOut = 0;

        events.forEach(e => {
          if (!playerMatchIds.has(e.match_id)) return;

          if (e.player_id === player.id) {
            if (e.type === 'goal') goals++;
            if (e.type === 'yellow_card') yellowCards++;
            if (e.type === 'red_card') redCards++;
            if (e.type === 'substitution' && e.related_player_id) {
              // Sortie: le joueur est remplacé
              substitutionsOut++;
            }
          }
          if (e.related_player_id === player.id) {
            if (e.type === 'assist') assists++;
            if (e.type === 'substitution') {
              // Entrée: le joueur remplace quelqu'un
              substitutionsIn++;
            }
          }
        });

        // Fallback: utiliser player_match_stats si disponible
        const pms = playerStats.find((s: any) => s.player_id === player.id);
        if (pms) {
          goals = Math.max(goals, pms.goals || 0);
          assists = Math.max(assists, pms.assists || 0);
        }

        const indices = calculatePerformanceIndices(
          goals,
          assists,
          yellowCards,
          redCards,
          substitutionsIn,
          substitutionsOut,
          matchesPlayed
        );

        // Catégorie d'âge depuis le joueur (sa catégorie officielle d'appartenance)
        const category = normalizeAgeCategory(player.category || 'SENIOR') as AgeCategory;

        return {
          player,
          category,
          indices,
          rawStats: {
            goals,
            assists,
            yellowCards,
            redCards,
            substitutionsIn,
            substitutionsOut,
            matchesPlayed,
          },
        };
      })
      .filter(Boolean) as PlayerPerformance[]; // Filtrer les null
  }, [players, matches, statsData]);
};

// ─── HOOK: ROTATION AUTO ───────────────────────────────────────────────
const useAutoRotation = (items: PlayerPerformance[], intervalMs: number = 5000) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % items.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [items.length, intervalMs]);

  return {
    current: items[currentIndex],
    currentIndex,
    total: items.length,
    goTo: setCurrentIndex,
  };
};

// ─── COMPOSANT PRINCIPAL ───────────────────────────────────────────────
const PlayerPerformanceChart: React.FC = () => {
  const performances = usePlayerPerformances();

  // Grouper par catégorie et prendre le meilleur de chaque
  const topPlayersByCategory = useMemo(() => {
    const byCategory = new Map<AgeCategory, PlayerPerformance[]>();

    performances.forEach(p => {
      const list = byCategory.get(p.category) || [];
      list.push(p);
      byCategory.set(p.category, list);
    });

    // Prendre le meilleur joueur de chaque catégorie (selon IG)
    const bests: PlayerPerformance[] = [];
    byCategory.forEach((list, category) => {
      const best = list.reduce((max, curr) =>
        curr.indices.efficacite > max.indices.efficacite ? curr : max
      );
      bests.push(best);
    });

    // Trier par catégorie
    return bests.sort((a, b) => a.category.localeCompare(b.category));
  }, [performances]);

  const { current, currentIndex, total, goTo } = useAutoRotation(topPlayersByCategory, 5000);

  // Données pour le radar chart
  const radarData = useMemo(() => {
    if (!current) return [];

    return [
      { subject: 'Finition (B)', A: current.indices.buts, fullMark: 100 },
      { subject: 'Création (P)', A: current.indices.passes, fullMark: 100 },
      { subject: 'Rotation (C)', A: current.indices.changements, fullMark: 100 },
      { subject: 'Discipline', A: current.indices.discipline, fullMark: 100 },
      { subject: 'Efficacité', A: current.indices.efficacite, fullMark: 100 },
    ];
  }, [current]);

  if (!performances.length) {
    return (
      <Card className="h-full border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg tracking-tight">Profil de Performance</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[350px]">
          <p className="text-sm text-muted-foreground">Aucune donnée de match disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <Card className="h-full border shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex-row items-center justify-between pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg tracking-tight">Profil de Performance</CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                {current?.category || '—'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {current ? `${current.player.full_name} - Top Performer` : 'Chargement...'}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest bg-secondary/30">
            {currentIndex + 1}/{total}
          </Badge>
        </CardHeader>

        <CardContent className="pb-6">
          <div className="h-[320px] w-full relative flex items-center justify-center">
            <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="hsl(var(--muted))" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name={current?.player.full_name}
                      dataKey="A"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.5}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl border shadow-lg">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                                {data.subject}
                              </p>
                              <p className="text-lg font-black text-primary">{data.A}/100</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* Stats brutes */}
          <div className="mt-4 grid grid-cols-4 gap-2">
              <div className="p-2 rounded-lg bg-secondary/30 border border-secondary/50 text-center">
                <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Buts</p>
                <p className="text-lg font-black text-primary">{current?.rawStats.goals || 0}</p>
              </div>
              <div className="p-2 rounded-lg bg-secondary/30 border border-secondary/50 text-center">
                <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Passes</p>
                <p className="text-lg font-black text-primary">{current?.rawStats.assists || 0}</p>
              </div>
              <div className="p-2 rounded-lg bg-secondary/30 border border-secondary/50 text-center">
                <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Changt.</p>
                <p className="text-lg font-black text-primary">
                  {(current?.rawStats.substitutionsIn || 0) + (current?.rawStats.substitutionsOut || 0)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-secondary/30 border border-secondary/50 text-center">
                <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Cartons</p>
                <p className="text-lg font-black text-destructive">
                  J{current?.rawStats.yellowCards || 0} R{current?.rawStats.redCards || 0}
                </p>
              </div>
            </div>

          {/* Indicateurs de rotation */}
          {total > 1 && (
            <div className="mt-4 flex justify-center gap-1">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentIndex
                      ? 'bg-primary w-4'
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Légende formules */}
          <div className="mt-4 pt-3 border-t border-border/50">
            <p className="text-[8px] text-muted-foreground text-center">
              <span className="font-bold">Formules:</span> IF=(Buts×25/MJ) IC=(Passes×30/MJ) IR=(Chang.×50/MJ) ID=100-(J×8+R×25)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerPerformanceChart;
