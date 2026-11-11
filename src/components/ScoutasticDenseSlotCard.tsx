import React from 'react';
import { Crown, Star, ChevronRight, SlidersHorizontal, Plus, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface DenseSlotPlayerItem {
  raw: any;
  id: string;
  shortName: string;
  fullName: string;
  photoUrl?: string | null;
  initials: string;
  rating?: number | null;
  badgeLabel?: string | null;
  badgeClassName?: string;
  hasEvaluation?: boolean;
  isTrial?: boolean;
  clubOrTeam?: string | null;
}

interface ScoutasticDenseSlotCardProps {
  slotLabel: string;
  roleCode?: string;
  players: DenseSlotPlayerItem[];
  onSelectPlayer: (player: any) => void;
  onDragStartPlayer?: (player: any) => void;
  onDragEndPlayer?: () => void;
  onRemovePlayer?: (playerId: string) => void;
  onOpenSlotDrawer?: () => void;
  onAddPlayer?: () => void;
  isSelected?: boolean;
  className?: string;
}

export const ScoutasticDenseSlotCard: React.FC<ScoutasticDenseSlotCardProps> = ({
  slotLabel,
  roleCode,
  players,
  onSelectPlayer,
  onDragStartPlayer,
  onDragEndPlayer,
  onRemovePlayer,
  onOpenSlotDrawer,
  onAddPlayer,
  isSelected,
  className,
}) => {
  return (
    <div
      className={cn(
        "scoutastic-dense-card w-60 sm:w-68 bg-white/95 backdrop-blur-md rounded-2xl border-2 shadow-2xl overflow-hidden text-slate-900 transition-all z-30 select-none",
        isSelected
          ? "border-amber-400 ring-4 ring-amber-400/35 shadow-amber-500/20"
          : "border-slate-300 hover:border-emerald-400",
        className
      )}
      style={{ filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.45))' }}
    >
      {/* ── CARD HEADER (Position Label + Count + Bouton Tiroir) ── */}
      <div
        onClick={(e) => {
          if (onOpenSlotDrawer) {
            e.stopPropagation();
            onOpenSlotDrawer();
          }
        }}
        className={cn(
          "bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white px-3 py-2 flex items-center justify-between border-b border-white/10 transition-colors",
          onOpenSlotDrawer && "hover:bg-slate-800/90 cursor-pointer",
          isSelected && "from-slate-900 via-slate-850 to-slate-900"
        )}
        title={onOpenSlotDrawer ? (isSelected ? "Cliquer pour fermer la liste latérale droite" : "Cliquer pour ouvrir la liste à droite du terrain & réorganiser") : undefined}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn(
            "text-[11px] font-black uppercase tracking-wider truncate",
            isSelected ? "text-amber-400" : "text-white"
          )}>
            {slotLabel}
          </span>
          {roleCode && roleCode !== slotLabel && (
            <span className="text-[9px] text-slate-400 font-bold">({roleCode})</span>
          )}
        </div>

        <div className="card-header-actions flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40">
            {players.length} {players.length > 1 ? 'Joueurs' : 'Joueur'}
          </span>
          {onAddPlayer && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddPlayer();
              }}
              className="p-1 rounded-md bg-amber-400/90 hover:bg-amber-300 text-slate-950 font-black shadow-xs transition-all hover:scale-110 active:scale-95 cursor-pointer"
              title="Ajouter un joueur de la base de données à ce poste"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          )}
          {onOpenSlotDrawer && (
            <span
              className={cn(
                "p-1 rounded-md transition-colors",
                isSelected
                  ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                  : "bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
              )}
              title={isSelected ? "Fermer la liste à droite" : "Afficher la liste à droite du terrain"}
            >
              <SlidersHorizontal className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>

      {/* ── VERTICAL STACKED LIST (Ascenseur actif si > 3 joueurs) ── */}
      <div className="card-scroll-area max-h-[148px] overflow-y-auto custom-scrollbar scrollbar-thin divide-y divide-slate-100 bg-white/95">
        {players.map((p, idx) => {
          const isTop = idx === 0 && p.rating !== undefined && p.rating !== null;
          const score = typeof p.rating === 'number' ? p.rating : null;

          return (
            <div
              key={p.id || idx}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', p.id);
                e.dataTransfer.effectAllowed = 'move';
                onDragStartPlayer?.(p.raw);
              }}
              onDragEnd={() => onDragEndPlayer?.()}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPlayer(p.raw);
              }}
              className="px-2.5 py-1.5 flex items-center justify-between gap-2 hover:bg-emerald-50/80 cursor-grab active:cursor-grabbing transition-colors group"
              title={`Glisser pour déplacer ou cliquer pour inspecter ${p.fullName}`}
            >
              {/* Left: Avatar + Crown + Names */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Crown for #1 */}
                {isTop ? (
                  <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0 drop-shadow-xs" />
                ) : (
                  <span className="w-3.5 text-center text-[9px] font-bold text-slate-400 shrink-0">
                    {idx + 1}
                  </span>
                )}

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                  {p.photoUrl ? (
                    <img
                      src={p.photoUrl}
                      alt={p.fullName}
                      crossOrigin="anonymous"
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = '/assets/avatar.svg';
                      }}
                    />
                  ) : (
                    <span>{p.initials}</span>
                  )}
                </div>

                {/* Name & Club */}
                <div className="min-w-0 flex-1">
                  <p className="font-black text-xs text-slate-900 group-hover:text-emerald-700 transition-colors truncate leading-tight">
                    {p.shortName}
                  </p>
                  <p className="text-[8.5px] text-slate-400 font-medium truncate max-w-[120px] leading-tight">
                    {p.clubOrTeam || 'FUS Club'}
                  </p>
                </div>
              </div>

              {/* Right: Score / Rating Badge */}
              <div className="flex items-center gap-1 shrink-0">
                {onRemovePlayer && (
                  <button type="button" aria-label={`Retirer ${p.fullName} du terrain`} onClick={event => { event.stopPropagation(); onRemovePlayer(p.id); }} className="rounded-full bg-slate-100 p-1 text-slate-500 transition hover:bg-red-100 hover:text-red-600" title="Retirer du terrain">
                    <X className="h-3 w-3" />
                  </button>
                )}
                {p.badgeLabel ? (
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[9.5px] font-black shadow-xs",
                      p.badgeClassName || "bg-slate-700 text-white border-slate-500"
                    )}
                  >
                    {p.badgeLabel}
                  </span>
                ) : score !== null ? (
                  <div
                    className={cn(
                      "min-w-[26px] h-5 px-1.5 rounded-full text-[9.5px] font-black flex items-center justify-center gap-0.5 border shadow-xs",
                      score >= 8.0
                        ? "bg-amber-400 text-slate-950 border-amber-300"
                        : score >= 7.0
                          ? "bg-emerald-500 text-white border-emerald-400"
                          : "bg-slate-700 text-white border-slate-600"
                    )}
                  >
                    {p.hasEvaluation && <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-200 shrink-0" />}
                    <span>{score.toFixed(1)}</span>
                  </div>
                ) : (
                  <span className="text-[9px] text-slate-400 font-bold">—</span>
                )}

                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScoutasticDenseSlotCard;
