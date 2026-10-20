import React from 'react';
import { useLiveCursors } from '../../context/LiveCursorsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, MousePointerClick } from 'lucide-react';

export const LiveCursorsOverlay: React.FC = () => {
  const { enabled, remoteCursors, isSuperAdmin, setInspectorUser, selectedUserId, recentClicks } = useLiveCursors();

  if (!isSuperAdmin || !enabled) {
    return null;
  }

  const hasCursors = remoteCursors.length > 0;
  const hasClicks = recentClicks.length > 0;

  if (!hasCursors && !hasClicks) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none"
      aria-hidden="true"
    >
      <AnimatePresence>
        {/* 1. Ondes de choc des clics en temps réel (Click Ripple Wave) */}
        {recentClicks.map((click) => {
          const isInsideSidebar = click.rawX != null && click.rawX <= 300;
          const leftPos = isInsideSidebar ? `${click.rawX}px` : `${click.xPercent}%`;
          const topPos = isInsideSidebar ? `${click.rawY}px` : `${click.yPercent}%`;

          return (
            <motion.div
              key={click.id}
              initial={{ opacity: 1, scale: 0.15 }}
              animate={{ opacity: 0, scale: 2.8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute',
                left: leftPos,
                top: topPos,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            >
            {/* Anneau expansif coloré */}
            <div
              style={{ 
                borderColor: click.userColor,
                boxShadow: `0 0 20px ${click.userColor}80` 
              }}
              className="w-16 h-16 rounded-full border-2 animate-ping"
            />
            {/* Anneau d'onde secondaire */}
            <div
              style={{ borderColor: click.userColor }}
              className="absolute inset-0 rounded-full border border-dashed opacity-75"
            />
            {/* Point d'impact central */}
            <div
              style={{ backgroundColor: click.userColor }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-lg"
            />
            {/* Badge flottant au-dessus du clic */}
            <div 
              style={{ backgroundColor: click.userColor }}
              className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full text-[9px] font-black text-white shadow-lg shadow-black/40 border border-white/60 flex items-center gap-1 scale-90"
            >
              <MousePointerClick className="w-2.5 h-2.5 animate-bounce" />
              <span>{click.userName}</span>
              {click.targetText && (
                <span className="text-[8px] bg-black/40 px-1 rounded font-mono font-normal max-w-[80px] truncate">
                  « {click.targetText} »
                </span>
              )}
            </div>
          </motion.div>
          );
        })}

        {/* 2. Curseurs collaboratifs distants */}
        {remoteCursors.map((cursor) => {
          const isInsideSidebar = cursor.rawX != null && cursor.rawX <= 300;
          const leftPos = isInsideSidebar ? `${cursor.rawX}px` : `${cursor.xPercent}%`;
          const topPos = isInsideSidebar ? `${cursor.rawY}px` : `${cursor.yPercent}%`;
          const isTargeted = cursor.userId === selectedUserId;
          const hasRecentClick = cursor.lastClick && (Date.now() - cursor.lastClick.timestamp < 2500);

          return (
            <motion.div
              key={cursor.userId}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                left: leftPos,
                top: topPos,
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                left: { duration: 0.08, ease: 'linear' },
                top: { duration: 0.08, ease: 'linear' },
                opacity: { duration: 0.2 },
              }}
              style={{
                position: 'absolute',
                transform: 'translate3d(-2px, -2px, 0)',
                pointerEvents: 'none',
              }}
              className="will-change-transform"
            >
              <div className="relative">
                {/* Pointeur SVG avec halo dynamique si ciblé */}
                <div className="relative">
                  {isTargeted && (
                    <>
                      <span className="absolute -inset-3 rounded-full border-2 border-emerald-400 animate-ping opacity-75 pointer-events-none" />
                      <span className="absolute -inset-1 rounded-full border border-emerald-500/80 animate-pulse pointer-events-none" />
                    </>
                  )}

                  {/* SVG du curseur de souris */}
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
                  >
                    <path
                      d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                      fill={cursor.color}
                      stroke="#FFFFFF"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* Étiquette flottante attachée au curseur */}
                <div 
                  onClick={() => setInspectorUser(cursor)}
                  className="absolute left-4 top-4 flex flex-col gap-1 items-start min-w-[140px] max-w-[240px] pointer-events-auto cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                  title="Cliquez pour inspecter son écran en direct, sa session et ses rubriques"
                >
                  {/* Badge Identité Collaborateur */}
                  <div
                    style={{ backgroundColor: cursor.color }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white shadow-lg shadow-black/25 text-[11px] font-black tracking-tight"
                  >
                    {/* Avatar Miniature */}
                    <div className="w-4 h-4 rounded-full bg-white/20 overflow-hidden shrink-0 border border-white/40">
                      {cursor.avatarUrl ? (
                        <img 
                          src={cursor.avatarUrl} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-[8px] font-black flex items-center justify-center w-full h-full text-white">
                          {cursor.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <span className="truncate max-w-[120px] drop-shadow-sm">
                      {cursor.name}
                    </span>

                    {/* Badge ciblé avec statut fixe ou en mouvement */}
                    {isTargeted && (
                      <span className="bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded uppercase animate-pulse flex items-center gap-0.5">
                        <span>Ciblé</span>
                        {Date.now() - cursor.lastUpdated > 4000 ? (
                          <span className="opacity-90 font-mono text-[7.5px] lowercase">(fixe)</span>
                        ) : null}
                      </span>
                    )}

                    {/* Point vert si sur la même page */}
                    {cursor.isSameSection && (
                      <span className="relative flex h-2 w-2 shrink-0" title="Sur la même page">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 border border-white" />
                      </span>
                    )}
                  </div>

                  {/* Cartouche Rubrique, Coordonnées (X, Y) et Clic */}
                  <div className="bg-slate-900/95 backdrop-blur-md text-white border border-white/10 rounded-xl px-2.5 py-1.5 shadow-2xl flex flex-col gap-1 text-[9px] font-mono leading-tight">
                    {/* Rubrique où il se situe */}
                    <div className="flex items-center gap-1 text-slate-300 font-sans font-bold truncate max-w-[190px]">
                      <MapPin className="w-2.5 h-2.5 text-primary shrink-0" />
                      <span className="truncate">{cursor.sectionLabel}</span>
                      {!cursor.isSameSection && (
                        <span className="text-[7.5px] font-bold text-sky-400 bg-sky-950/60 px-1 rounded ml-auto shrink-0">
                          Autre page
                        </span>
                      )}
                    </div>

                    {/* Coordonnées X, Y de l'écran en direct */}
                    <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-white/10 font-mono text-[8.5px]">
                      <span className="text-emerald-400 font-bold">
                        X: {cursor.rawX}px
                      </span>
                      <span className="text-sky-400 font-bold">
                        Y: {cursor.rawY}px
                      </span>
                      <span className="text-slate-400 text-[7.5px] opacity-75">
                        ({Math.round(cursor.xPercent)}%, {Math.round(cursor.yPercent)}%)
                      </span>
                    </div>

                    {/* Alerte clic en direct si clic récent */}
                    {hasRecentClick && (
                      <div className="flex items-center gap-1 text-amber-300 bg-amber-500/20 border border-amber-500/30 rounded px-1.5 py-0.5 text-[8px] font-sans font-bold animate-pulse">
                        <MousePointerClick className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">Clic à ({cursor.lastClick?.rawX}px, {cursor.lastClick?.rawY}px)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default LiveCursorsOverlay;
