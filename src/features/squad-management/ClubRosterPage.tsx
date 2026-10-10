import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, Users, LayoutGrid, List,
  TrendingUp, ChevronRight, Star, Shirt
} from 'lucide-react';
import { usePlayers } from '../../hooks/usePlayers';
import { PLAYER_CATEGORIES, normalizeAgeCategory } from '../../constants';

// ── Charte couleur par catégorie ─────────────────────────────────────────────
const CATEGORY_META: Record<string, {
  bg: string; lightBg: string; text: string; border: string;
  gradient: string; emoji: string;
}> = {
  PRO:    { bg: '#F59E0B', lightBg: '#FEF3C7', text: '#92400E', border: '#F59E0B', gradient: 'from-yellow-400 to-amber-500',   emoji: '🏆' },
  SENIOR: { bg: '#F97316', lightBg: '#FFEDD5', text: '#9A3412', border: '#F97316', gradient: 'from-orange-400 to-red-500',     emoji: '⚽' },
  U23:    { bg: '#EF4444', lightBg: '#FEE2E2', text: '#991B1B', border: '#EF4444', gradient: 'from-red-400 to-rose-500',       emoji: '🔴' },
  U22:    { bg: '#F43F5E', lightBg: '#FFE4E6', text: '#9F1239', border: '#F43F5E', gradient: 'from-rose-400 to-red-500',       emoji: '🍅' },
  U21:    { bg: '#EC4899', lightBg: '#FCE7F3', text: '#9D174D', border: '#EC4899', gradient: 'from-pink-400 to-fuchsia-500',   emoji: '🌸' },
  U20:    { bg: '#D946EF', lightBg: '#FAE8FF', text: '#86198F', border: '#D946EF', gradient: 'from-fuchsia-400 to-purple-500', emoji: '🍇' },
  U19:    { bg: '#8B5CF6', lightBg: '#EDE9FE', text: '#5B21B6', border: '#8B5CF6', gradient: 'from-violet-400 to-purple-600',  emoji: '💜' },
  U18:    { bg: '#7C3AED', lightBg: '#EDE9FE', text: '#5B21B6', border: '#7C3AED', gradient: 'from-purple-500 to-indigo-600',  emoji: '🔮' },
  U17:    { bg: '#6366F1', lightBg: '#E0E7FF', text: '#3730A3', border: '#6366F1', gradient: 'from-indigo-400 to-blue-600',    emoji: '🔵' },
  U16:    { bg: '#3B82F6', lightBg: '#DBEAFE', text: '#1D4ED8', border: '#3B82F6', gradient: 'from-blue-400 to-cyan-600',      emoji: '💙' },
  U15:    { bg: '#06B6D4', lightBg: '#CFFAFE', text: '#0E7490', border: '#06B6D4', gradient: 'from-cyan-400 to-teal-500',      emoji: '🩵' },
  U14:    { bg: '#0891B2', lightBg: '#CFFAFE', text: '#155E75', border: '#0891B2', gradient: 'from-cyan-500 to-blue-600',      emoji: '💠' },
  U13:    { bg: '#14B8A6', lightBg: '#CCFBF1', text: '#0F766E', border: '#14B8A6', gradient: 'from-teal-400 to-emerald-500',   emoji: '🩷' },
  U11:    { bg: '#22C55E', lightBg: '#DCFCE7', text: '#15803D', border: '#22C55E', gradient: 'from-green-400 to-emerald-500',  emoji: '💚' },
  U9:     { bg: '#84CC16', lightBg: '#ECFCCB', text: '#3F6212', border: '#84CC16', gradient: 'from-lime-400 to-green-500',     emoji: '🟢' },
  U7:     { bg: '#10B981', lightBg: '#D1FAE5', text: '#065F46', border: '#10B981', gradient: 'from-emerald-400 to-teal-600',   emoji: '🌱' },
};

type ViewMode = 'grid' | 'table';

export default function ClubRosterPage() {
  const { players, isLoading } = usePlayers();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const categoryStats = useMemo(() => {
    const list = players || [];
    return PLAYER_CATEGORIES.map(cat => {
      const catPlayers = list.filter(p => normalizeAgeCategory(p.category) === cat);
      const positions = catPlayers.reduce<Record<string, number>>((acc, p) => {
        const pos = p.position ?? 'Inconnu';
        acc[pos] = (acc[pos] ?? 0) + 1;
        return acc;
      }, {});
      const topPosition = Object.entries(positions).sort((a, b) => b[1] - a[1])[0]?.[0];
      const avgAge = catPlayers.length > 0
        ? Math.round(
            catPlayers.reduce((sum, p) => {
              if (!p.date_of_birth) return sum;
              const age = new Date().getFullYear() - new Date(p.date_of_birth).getFullYear();
              return sum + age;
            }, 0) / (catPlayers.filter(p => p.date_of_birth).length || 1)
          )
        : null;
      return {
        name: cat,
        count: catPlayers.length,
        topPosition,
        avgAge,
        meta: CATEGORY_META[cat] ?? { bg: '#6B7280', lightBg: '#F3F4F6', text: '#374151', border: '#6B7280', gradient: 'from-gray-400 to-gray-600', emoji: '⚽' },
      };
    });
  }, [players]);

  const handleCategoryClick = (cat: string) => {
    navigate(`/players?category=${cat}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            Mon Club — <span className="text-primary">FUS Rabat</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            {players.length} joueurs répartis sur{' '}
            <span className="font-bold text-foreground">{categoryStats.filter(c => c.count > 0).length} catégories actives</span>
          </p>
        </div>

        {/* Toggle view */}
        <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-1 border border-border">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'grid' ? 'bg-white shadow-sm text-primary border border-border/50' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Grille
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'table' ? 'bg-white shadow-sm text-primary border border-border/50' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="w-4 h-4" />
            Tableau
          </button>
        </div>
      </div>

      {/* ── Summary KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Joueurs', value: players.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Catégories actives', value: categoryStats.filter(c => c.count > 0).length, icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Plus grande cat.', value: categoryStats.sort((a, b) => b.count - a.count)[0]?.name ?? '—', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Maillots attribués', value: players.filter(p => p.jersey_number != null).length, icon: Shirt, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center shrink-0`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-black text-foreground">{kpi.value}</p>
              <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider truncate">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Grid View ── */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {PLAYER_CATEGORIES.map((cat, i) => {
            const stat = categoryStats.find(c => c.name === cat)!;
            const m = stat.meta;
            const isEmpty = stat.count === 0;
            return (
              <motion.div
                key={cat}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={!isEmpty ? { scale: 1.04, y: -3 } : {}}
                whileTap={!isEmpty ? { scale: 0.97 } : {}}
                onClick={() => !isEmpty && handleCategoryClick(cat)}
                className={`relative overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition-all duration-200 flex flex-col ${
                  isEmpty ? 'opacity-40 cursor-default border-border' : 'cursor-pointer hover:shadow-lg'
                }`}
                style={{ borderColor: isEmpty ? undefined : m.border }}
              >
                {/* Gradient top bar */}
                <div className={`h-2 w-full bg-gradient-to-r ${m.gradient}`} />

                {/* Body */}
                <div className="p-4 flex flex-col items-center gap-2 flex-1">
                  {/* Category badge */}
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md mb-1 mt-1"
                    style={{ background: `linear-gradient(135deg, ${m.bg}dd, ${m.bg}99)` }}
                  >
                    <span className="text-2xl font-black text-white drop-shadow">{cat}</span>
                  </div>

                  {/* Count */}
                  <div className="text-center">
                    <p className="text-2xl font-black text-foreground leading-none">{stat.count}</p>
                    <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                      joueur{stat.count > 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Extra info */}
                  {!isEmpty && (
                    <div className="w-full space-y-1 border-t border-border pt-2 mt-1">
                      {stat.avgAge && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground font-bold uppercase">Moy. âge</span>
                          <span className="font-black text-foreground">{stat.avgAge} ans</span>
                        </div>
                      )}
                      {stat.topPosition && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground font-bold uppercase">Poste</span>
                          <span className="font-black text-foreground truncate max-w-[80px] text-right">{stat.topPosition}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer arrow */}
                {!isEmpty && (
                  <div
                    className="flex items-center justify-center gap-1 py-2.5 text-[11px] font-black uppercase tracking-wider"
                    style={{ backgroundColor: m.lightBg, color: m.text }}
                  >
                    <span>Voir les joueurs</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Table View ── */}
      {viewMode === 'table' && (
        <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-6 py-3.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Catégorie</th>
                <th className="text-center px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Joueurs</th>
                <th className="text-center px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Moy. Âge</th>
                <th className="text-center px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Poste dominant</th>
                <th className="text-center px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {PLAYER_CATEGORIES.map((cat, i) => {
                const stat = categoryStats.find(c => c.name === cat)!;
                const m = stat.meta;
                const isEmpty = stat.count === 0;
                return (
                  <motion.tr
                    key={cat}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.035 }}
                    className={`border-b border-border last:border-0 transition-colors ${
                      isEmpty ? 'opacity-40' : 'hover:bg-secondary/30 cursor-pointer'
                    }`}
                    onClick={() => !isEmpty && handleCategoryClick(cat)}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-sm"
                          style={{ background: `linear-gradient(135deg, ${m.bg}, ${m.bg}bb)` }}
                        >
                          {cat}
                        </div>
                        <span className="font-bold text-sm text-foreground">{cat}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black"
                        style={{ backgroundColor: m.lightBg, color: m.text }}
                      >
                        {stat.count}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm font-bold text-foreground">
                      {stat.avgAge ? `${stat.avgAge} ans` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {stat.topPosition ? (
                        <span className="inline-block px-2 py-1 rounded-lg text-[11px] font-bold bg-secondary text-foreground">
                          {stat.topPosition}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {!isEmpty ? (
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all hover:shadow-sm"
                          style={{ backgroundColor: m.lightBg, color: m.text }}
                          onClick={(e) => { e.stopPropagation(); handleCategoryClick(cat); }}
                        >
                          Voir <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-bold">Vide</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
