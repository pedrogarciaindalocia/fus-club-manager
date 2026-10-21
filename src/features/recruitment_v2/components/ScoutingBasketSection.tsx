import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingBag, User, Calendar, Shield, Sparkles, GripVertical,
  ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Layers,
  Grid, Clock, AlertCircle, RefreshCw, Star, Info, Send, Trash2
} from 'lucide-react';
import type { Scout } from '../types/recruitment';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

export interface BasketPlayer {
  id: string;
  player_id: string;
  full_name: string;
  jersey_number?: number | null;
  position?: string | null;
  photo_url?: string | null;
  category?: string | null;
  match_id?: string | null;
  match_date?: string | null;
  match_context?: {
    home_name?: string;
    away_name?: string;
    home_logo?: string | null;
    away_logo?: string | null;
    score_home?: number;
    score_away?: number;
  };
  rating?: number | null;
  rating_comment?: string | null;
  added_by_id?: string | null;
  added_by_name: string;
  added_by_role?: string | null;
  status: 'pending' | 'assigned' | 'archived';
  assigned_to_id?: string | null;
  assigned_to_name?: string | null;
  assigned_mission_id?: string | null;
  created_at?: string;
}

interface ScoutingBasketSectionProps {
  scouts: Scout[];
  onAssignMissionFromBasket: (player: BasketPlayer, scoutId: string) => Promise<void>;
  onAssignCandidateToScout?: (candidateId: string, scout: Scout, extraData?: any) => Promise<void>;
  isAdmin: boolean;
  isScoutAdmin: boolean;
  isSuperAdmin?: boolean;
  className?: string;
}

export const ScoutingBasketSection: React.FC<ScoutingBasketSectionProps> = ({
  scouts,
  onAssignMissionFromBasket,
  onAssignCandidateToScout,
  isAdmin,
  isScoutAdmin,
  isSuperAdmin = false,
  className,
}) => {
  const canUserAssign = Boolean(isSuperAdmin || isAdmin || isScoutAdmin);
  const [basketPlayers, setBasketPlayers] = useState<BasketPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStackIndex, setActiveStackIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'stack' | 'grid'>('stack');
  const [draggedPlayer, setDraggedPlayer] = useState<BasketPlayer | null>(null);
  const [dragOverScoutId, setDragOverScoutId] = useState<string | null>(null);
  const [selectedScoutForAssign, setSelectedScoutForAssign] = useState<string>('');
  const [isAssigningId, setIsAssigningId] = useState<string | null>(null);

  // Charger les joueurs du panier depuis Supabase (table scouting_basket + matches opponent_lineup/subs)
  const fetchBasketData = useCallback(async () => {
    try {
      const itemsMap = new Map<string, BasketPlayer>();

      // 1. Charger depuis la table public.scouting_basket
      try {
        const { data: dbBasket, error: basketErr } = await supabase
          .from('scouting_basket')
          .select('*')
          .order('created_at', { ascending: false });

        if (!basketErr && Array.isArray(dbBasket)) {
          dbBasket.forEach((item: any) => {
            const key = item.player_id || item.id;
            itemsMap.set(key, {
              id: item.id || `basket-${key}`,
              player_id: item.player_id || item.id,
              full_name: item.full_name || 'Joueur Adverse',
              jersey_number: item.jersey_number ?? null,
              position: item.position ?? null,
              photo_url: item.photo_url ?? null,
              category: item.category || 'SENIOR',
              match_id: item.match_id ?? null,
              match_date: item.match_date ?? null,
              match_context: item.match_context || {},
              rating: item.rating ?? null,
              rating_comment: item.rating_comment ?? null,
              added_by_id: item.added_by_id ?? null,
              added_by_name: item.added_by_name || 'Cellule Détection',
              added_by_role: item.added_by_role || 'Scout / Staff',
              status: item.status || 'pending',
              assigned_to_id: item.assigned_to_id ?? null,
              assigned_to_name: item.assigned_to_name ?? null,
              assigned_mission_id: item.assigned_mission_id ?? null,
              created_at: item.created_at || new Date().toISOString(),
            });
          });
        }
      } catch (err) {
        console.warn('[ScoutingBasket] Notice table scouting_basket:', err);
      }

      // 2. Charger les joueurs avec in_scouting_basket depuis les matches récents
      try {
        const { data: matchesData, error: matchesErr } = await supabase
          .from('matches')
          .select('id, match_date, is_home, score_home, score_away, category, opponent_lineup, opponent_subs, clubs:opponent_id(name, logo_url)')
          .order('match_date', { ascending: false })
          .limit(30);

        if (!matchesErr && Array.isArray(matchesData)) {
          matchesData.forEach((m: any) => {
            const oppClubName = m.clubs?.name || 'Club adverse';
            const oppClubLogo = m.clubs?.logo_url || null;
            const fusLogo = 'https://fuhrxfhszttvpkmjydca.supabase.co/storage/v1/object/public/medias/default/fus_logo.png';
            const homeName = m.is_home ? 'FUS CLUB' : oppClubName;
            const awayName = m.is_home ? oppClubName : 'FUS CLUB';
            const homeLogo = m.is_home ? fusLogo : oppClubLogo;
            const awayLogo = m.is_home ? oppClubLogo : fusLogo;

            const allOpponents = [...(m.opponent_lineup || []), ...(m.opponent_subs || [])];
            allOpponents.forEach((opp: any) => {
              if (opp && typeof opp === 'object' && opp.in_scouting_basket) {
                const pId = String(opp.id || opp.jersey_number || opp.full_name);
                if (!itemsMap.has(pId)) {
                  itemsMap.set(pId, {
                    id: `match-basket-${m.id}-${pId}`,
                    player_id: pId,
                    full_name: opp.full_name || 'Joueur Adverse',
                    jersey_number: opp.jersey_number ?? null,
                    position: opp.position ?? null,
                    photo_url: opp.photo_url ?? null,
                    category: m.category || 'SENIOR',
                    match_id: m.id,
                    match_date: m.match_date,
                    match_context: {
                      home_name: homeName,
                      away_name: awayName,
                      home_logo: homeLogo,
                      away_logo: awayLogo,
                      score_home: m.score_home ?? 0,
                      score_away: m.score_away ?? 0,
                    },
                    rating: opp.rating ?? null,
                    rating_comment: opp.rating_comment ?? null,
                    added_by_id: opp.basket_added_by_id ?? null,
                    added_by_name: opp.basket_added_by_name || 'Staff Match',
                    added_by_role: opp.basket_added_by_role || 'Cellule Détection',
                    status: opp.assigned_scout_id ? 'assigned' : 'pending',
                    assigned_to_id: opp.assigned_scout_id ?? null,
                    assigned_to_name: opp.assigned_scout_name ?? null,
                    created_at: opp.basket_added_at || m.match_date || new Date().toISOString(),
                  });
                }
              }
            });
          });
        }
      } catch (err) {
        console.warn('[ScoutingBasket] Notice matches sync:', err);
      }

      const list = Array.from(itemsMap.values()).sort((a, b) => {
        // Mettre en premier les non-assignés (pending), puis les plus récents
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      setBasketPlayers(list);
    } catch (err) {
      console.error('[ScoutingBasket] Erreur fetchBasketData:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Synchronisation temps réel Supabase
  useEffect(() => {
    fetchBasketData();

    const channel = supabase
      .channel('scouting_basket_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scouting_basket' }, () => {
        fetchBasketData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, () => {
        fetchBasketData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBasketData]);

  // Réinitialiser l'index actif si nécessaire
  useEffect(() => {
    if (activeStackIndex >= basketPlayers.length && basketPlayers.length > 0) {
      setActiveStackIndex(basketPlayers.length - 1);
    }
  }, [basketPlayers.length, activeStackIndex]);

  // Gestion du Drag & Drop HTML5
  const handleDragStart = (e: React.DragEvent, player: BasketPlayer) => {
    setDraggedPlayer(player);
    e.dataTransfer.setData('text/plain', JSON.stringify({ playerId: player.player_id, name: player.full_name }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedPlayer(null);
    setDragOverScoutId(null);
  };

  const handleDropOnScout = async (e: React.DragEvent, targetScout: Scout) => {
    e.preventDefault();
    setDragOverScoutId(null);

    const playerToAssign = draggedPlayer;
    if (playerToAssign) {
      await executeAssignMission(playerToAssign, targetScout);
      return;
    }

    // Support du glisser-déposer depuis les cartes de missions ou candidats externes
    try {
      const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.candidateId && onAssignCandidateToScout) {
          setIsAssigningId(data.candidateId);
          await onAssignCandidateToScout(data.candidateId, targetScout, data);
          toast.success(`Mission assignée avec succès à ${targetScout.full_name} !`, {
            description: `${data.name || data.candidateName || 'Joueur'} a été confié à ${targetScout.full_name}.`,
          });
        }
      }
    } catch (err) {
      console.warn('[ScoutingBasket] Erreur parsing drag data:', err);
    } finally {
      setIsAssigningId(null);
    }
  };

  const executeAssignMission = async (player: BasketPlayer, targetScout: Scout) => {
    setIsAssigningId(player.player_id);
    try {
      await onAssignMissionFromBasket(player, targetScout.id);

      // Mettre à jour localement le joueur au panier
      setBasketPlayers(prev => prev.map(p => {
        if (p.player_id === player.player_id) {
          return {
            ...p,
            status: 'assigned',
            assigned_to_id: targetScout.id,
            assigned_to_name: targetScout.full_name,
          };
        }
        return p;
      }));

      // Mettre à jour dans public.scouting_basket
      try {
        await supabase
          .from('scouting_basket')
          .update({
            status: 'assigned',
            assigned_to_id: targetScout.id,
            assigned_to_name: targetScout.full_name,
            updated_at: new Date().toISOString(),
          })
          .eq('player_id', player.player_id);
      } catch {}

      toast.success(`Mission assignée avec succès à ${targetScout.full_name} !`, {
        description: `Observation & rapport de ${player.full_name} (${player.position || 'Adversaire'})`,
      });
    } catch (err: any) {
      console.error('Erreur assignation depuis panier:', err);
      toast.error(err?.message || "Erreur lors de l'assignation de la mission");
    } finally {
      setIsAssigningId(null);
      setDraggedPlayer(null);
    }
  };

  // Suppression d'un joueur du panier de détection avec répercussion dans matches et broadcast
  const [playerToDelete, setPlayerToDelete] = useState<BasketPlayer | null>(null);
  const [isDeletingBasketId, setIsDeletingBasketId] = useState<string | null>(null);

  const confirmRemoveFromBasket = async (player: BasketPlayer) => {
    setIsDeletingBasketId(player.id);
    try {
      // 1. Supprimer de la table public.scouting_basket
      await supabase
        .from('scouting_basket')
        .delete()
        .or(`id.eq.${player.id},player_id.eq.${player.player_id}`);

      // 2. Mettre à jour la table public.matches (in_scouting_basket = false)
      if (player.match_id) {
        const { data: matchData } = await supabase
          .from('matches')
          .select('id, opponent_lineup, opponent_subs')
          .eq('id', player.match_id)
          .single();

        if (matchData) {
          const updateArray = (arr: any[]) => (arr || []).map(p => {
            if (typeof p === 'object' && p !== null) {
              const matchesId = p.id && String(p.id) === String(player.player_id);
              const matchesJersey = player.jersey_number != null && String(p.jersey_number) === String(player.jersey_number);
              const matchesName = p.full_name && player.full_name && p.full_name.trim().toLowerCase() === player.full_name.trim().toLowerCase();
              if (matchesId || matchesJersey || matchesName) {
                return { ...p, in_scouting_basket: false };
              }
            }
            return p;
          });

          await supabase
            .from('matches')
            .update({
              opponent_lineup: updateArray(matchData.opponent_lineup),
              opponent_subs: updateArray(matchData.opponent_subs),
            })
            .eq('id', player.match_id);
        }
      }

      // 3. Diffuser l'événement en temps réel pour fus-app
      try {
        await supabase.channel('scouting_basket_realtime').send({
          type: 'broadcast',
          event: 'basket_player_removed',
          payload: {
            playerId: player.player_id,
            matchId: player.match_id,
            fullName: player.full_name,
            jerseyNumber: player.jersey_number,
          },
        });
      } catch (broadcastErr) {
        console.warn('[ScoutingBasket] Broadcast error:', broadcastErr);
      }

      // 4. Mettre à jour l'état local
      setBasketPlayers(prev => prev.filter(p => p.id !== player.id && p.player_id !== player.player_id));
      setPlayerToDelete(null);

      toast.success(`${player.full_name} a été retiré du panier de détection`, {
        description: "Le statut panier a été désactivé dans le match et sur l'application mobile.",
      });
    } catch (err: any) {
      console.error('Erreur suppression du panier:', err);
      toast.error(err?.message || "Erreur lors du retrait du panier");
    } finally {
      setIsDeletingBasketId(null);
    }
  };

  // Helper badge poste
  const getPositionBadge = (pos?: string | null) => {
    if (!pos) return { label: 'Adversaire', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    const p = pos.toLowerCase();
    if (p.includes('gardien') || p.includes('gk')) return { label: pos, bg: 'bg-amber-100 text-amber-900 border-amber-300' };
    if (p.includes('déf') || p.includes('latéral') || p.includes('central') || p.includes('df')) return { label: pos, bg: 'bg-blue-100 text-blue-900 border-blue-300' };
    if (p.includes('milieu') || p.includes('mid') || p.includes('mf')) return { label: pos, bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
    return { label: pos, bg: 'bg-rose-100 text-rose-900 border-rose-300' };
  };

  // Helper couleur note ronde
  const getRatingCircleColor = (r?: number | null) => {
    if (r == null) return { bg: 'bg-slate-100', text: 'text-slate-400', border: 'border-slate-300' };
    if (r >= 8) return { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-400' };
    if (r >= 6) return { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-400' };
    if (r >= 5) return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' };
    return { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300' };
  };

  // Format date match
  const formatMatchDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Match récent';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const pendingCount = useMemo(() => basketPlayers.filter(p => p.status === 'pending').length, [basketPlayers]);

  return (
    <div className={cn("bg-white text-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs relative overflow-hidden", className)}>
      {/* EN-TÊTE DE LA SECTION (Charte Rouge et Blanc FUS) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-[#722F37] flex items-center justify-center shadow-xs">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                <span>Panier de Détection</span>
                <span className="text-[#722F37] font-bold text-xs uppercase tracking-wider bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  Joueurs Adversaires
                </span>
              </h2>
              {/* Badge En Direct */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Synchronisé en direct</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Réception instantanée depuis <strong className="text-[#722F37]">fus-app</strong> · Glissez-déposez le joueur sur un scout pour lui assigner la mission d'observation.
            </p>
          </div>
        </div>

        {/* ACTIONS D'EN-TÊTE */}
        <div className="flex items-center gap-2.5">
          {basketPlayers.length > 1 && (
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('stack')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                  viewMode === 'stack' ? "bg-[#722F37] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
                title="Vue Cartes Superposées (Deck 3D)"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Superposé ({basketPlayers.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                  viewMode === 'grid' ? "bg-[#722F37] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
                title="Vue Grille Déployée"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Grille</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => fetchBasketData()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 hover:text-slate-900 transition-all cursor-pointer border border-slate-200"
            title="Actualiser le panier"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin text-[#722F37]")} />
          </button>
        </div>
      </div>

      {/* ZONE SCINDÉE EN DEUX : GAUCHE (PANIER) / DROITE (SCOUTS & DRAG & DROP) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">

        {/* ── VOLET GAUCHE : PANIER DES JOUEURS ADVERSES (COLONNE 1 À 7) ── */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Joueurs au panier
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-[#722F37] text-[11px] font-black border border-rose-200">
                {pendingCount} à assigner
              </span>
            </div>

            {viewMode === 'stack' && basketPlayers.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  {activeStackIndex + 1} / {basketPlayers.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveStackIndex(prev => Math.max(0, prev - 1))}
                    disabled={activeStackIndex === 0}
                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer border border-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStackIndex(prev => Math.min(basketPlayers.length - 1, prev + 1))}
                    disabled={activeStackIndex === basketPlayers.length - 1}
                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer border border-slate-200"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ÉTAT VIDE SI LE PANIER NE CONTIENT AUCUN JOUEUR */}
          {basketPlayers.length === 0 ? (
            <div className="bg-slate-50/80 border border-dashed border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center my-auto min-h-[250px]">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-[#722F37] border border-rose-200 flex items-center justify-center mb-3 shadow-xs">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Le panier de détection est actuellement vide</h4>
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">
                Depuis l'application mobile <strong className="text-[#722F37]">fus-app</strong>, cliquez sur un joueur adverse lors d'un match officiel ou amical et activez le toggle <strong className="text-slate-800">"Ajouter au panier"</strong>. Il apparaîtra immédiatement ici avec son évaluation pour assignation !
              </p>
            </div>
          ) : viewMode === 'stack' ? (
            /* ── MODE SUPERPOSITION / PILE 3D (STACK DE CARTES) EN CHARTE BLANCHE & ROUGE ── */
            <div className="relative min-h-[290px] flex items-center justify-center py-3">
              {basketPlayers.map((player, idx) => {
                const isTop = idx === activeStackIndex;
                const offset = idx - activeStackIndex;
                const isVisible = Math.abs(offset) <= 2;
                if (!isVisible) return null;

                const posBadge = getPositionBadge(player.position);
                const ratingBadge = getRatingCircleColor(player.rating);

                return (
                  <div
                    key={player.id}
                    draggable={isTop && (canUserAssign || player.status === 'pending')}
                    onDragStart={(e) => handleDragStart(e, player)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setActiveStackIndex(idx)}
                    style={{
                      transform: `translateY(${offset * 10}px) scale(${1 - Math.abs(offset) * 0.04}) rotate(${offset * 1.5}deg)`,
                      zIndex: 30 - Math.abs(offset),
                      opacity: isTop ? 1 : Math.max(0.5, 1 - Math.abs(offset) * 0.25),
                    }}
                    className={cn(
                      "w-full max-w-lg bg-white rounded-2xl border p-5 shadow-lg transition-all duration-300 absolute cursor-pointer",
                      isTop ? "border-[#722F37] shadow-xl ring-4 ring-rose-500/10" : "border-slate-200 bg-slate-50/90",
                      isTop && player.status === 'pending' && "cursor-grab active:cursor-grabbing hover:border-rose-600"
                    )}
                  >
                    {/* EN-TÊTE CARTE JOUEUR */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* PHOTO OU AVATAR */}
                        <div className="relative shrink-0">
                          {player.photo_url ? (
                            <img
                              src={player.photo_url}
                              alt={player.full_name}
                              className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 shadow-xs"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#722F37] to-slate-700 flex items-center justify-center text-white border-2 border-slate-200 shadow-xs">
                              <User className="w-7 h-7 text-white/80" />
                            </div>
                          )}
                          {player.jersey_number != null && (
                            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-[#722F37] text-white text-[10px] font-black shadow-xs">
                              #{player.jersey_number}
                            </span>
                          )}
                        </div>

                        {/* IDENTITÉ */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-slate-900 tracking-tight">
                              {player.full_name}
                            </h3>
                            {player.status === 'assigned' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Assigné à {player.assigned_to_name || 'Scout'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", posBadge.bg)}>
                              {posBadge.label}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              Catégorie : {player.category || 'SENIOR'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* PASTILLE NOTE RONDE & BOUTON RETIRER */}
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                          <div className={cn("w-11 h-11 rounded-full border-2 flex items-center justify-center shadow-xs font-black text-sm", ratingBadge.bg, ratingBadge.text, ratingBadge.border)}>
                            {player.rating != null ? `${player.rating}` : '—'}
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold mt-0.5">Note match</span>
                        </div>
                        {canUserAssign && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlayerToDelete(player);
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200"
                            title="Retirer ce joueur du panier"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* CONTEXTE DU MATCH OBSERVÉ (LOGOS & SCORE) */}
                    <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-slate-800">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {player.match_context?.home_logo ? (
                          <img src={player.match_context.home_logo} alt="Home" className="w-6 h-6 object-contain rounded-md" />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">H</div>
                        )}
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {player.match_context?.home_name || 'Équipe Domicile'}
                        </span>
                      </div>

                      <div className="px-3 py-1 rounded-lg bg-[#722F37] text-white font-black text-xs tracking-wider shrink-0 shadow-xs">
                        {player.match_context?.score_home ?? 0} – {player.match_context?.score_away ?? 0}
                      </div>

                      <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-right">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {player.match_context?.away_name || 'Équipe Extérieur'}
                        </span>
                        {player.match_context?.away_logo ? (
                          <img src={player.match_context.away_logo} alt="Away" className="w-6 h-6 object-contain rounded-md" />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">A</div>
                        )}
                      </div>
                    </div>

                    {/* DESCRIPTION / OBSERVATION DU JOUEUR DEPUIS FUS-APP */}
                    {player.rating_comment && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-[11px] text-amber-950 flex items-start gap-2 shadow-2xs">
                        <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-amber-900 block text-[10px] uppercase tracking-wider mb-0.5">Observation & Description :</span>
                          <span className="italic leading-relaxed text-slate-800">« {player.rating_comment} »</span>
                        </div>
                      </div>
                    )}

                    {/* MENTION DE L'AUTEUR QUI A MIS LE JOUEUR AU PANIER */}
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#722F37]" />
                        <span>
                          Mis au panier par <strong className="text-slate-900">{player.added_by_name}</strong>
                          {player.added_by_role && (
                            <span className="text-[#722F37] ml-1 font-semibold">({player.added_by_role})</span>
                          )}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatMatchDate(player.match_date)}
                      </span>
                    </div>

                    {/* INVITATION AU GLISSER-DÉPOSER */}
                    {isTop && (canUserAssign || player.status === 'pending') && (
                      <div className="mt-3 py-2 px-3 rounded-xl bg-rose-50 border border-rose-200 text-[#722F37] text-xs font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <GripVertical className="w-4 h-4 text-[#722F37]" />
                          {player.status === 'assigned'
                            ? `Assigné à ${player.assigned_to_name} • Glissez sur un scout à droite pour réassigner ➔`
                            : `Glissez cette carte sur un scout à droite ➔`}
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          {canUserAssign ? 'Direction & Super Admin' : 'ou cliquez sur Assigner'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── MODE GRILLE DÉPLOYÉE EN CHARTE BLANCHE ── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[380px] overflow-y-auto pr-1">
              {basketPlayers.map((player) => {
                const posBadge = getPositionBadge(player.position);
                const ratingBadge = getRatingCircleColor(player.rating);
                return (
                  <div
                    key={player.id}
                    draggable={canUserAssign || player.status === 'pending'}
                    onDragStart={(e) => handleDragStart(e, player)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "bg-white rounded-2xl border p-4 shadow-xs transition-all hover:border-[#722F37] relative",
                      canUserAssign || player.status === 'pending'
                        ? "cursor-grab active:cursor-grabbing border-slate-200"
                        : "border-emerald-200 bg-emerald-50/10 opacity-80"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {player.photo_url ? (
                          <img src={player.photo_url} alt={player.full_name} className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-white">
                            <User className="w-5 h-5 text-white/80" />
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-black text-slate-900 truncate max-w-[130px]">{player.full_name}</p>
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.2 rounded-md", posBadge.bg)}>
                            {posBadge.label} #{player.jersey_number ?? '?'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className={cn("w-8 h-8 rounded-full border flex items-center justify-center font-black text-xs shrink-0", ratingBadge.bg, ratingBadge.text, ratingBadge.border)}>
                          {player.rating ?? '—'}
                        </div>
                        {canUserAssign && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlayerToDelete(player);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Retirer ce joueur du panier"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px] text-slate-700 flex items-center justify-between">
                      <span className="truncate max-w-[80px]">{player.match_context?.home_name || 'Dom.'}</span>
                      <strong className="text-[#722F37] font-black">{player.match_context?.score_home ?? 0} - {player.match_context?.score_away ?? 0}</strong>
                      <span className="truncate max-w-[80px] text-right">{player.match_context?.away_name || 'Ext.'}</span>
                    </div>

                    {player.rating_comment && (
                      <p className="mt-2 text-[10px] text-amber-900 bg-amber-50/80 p-1.5 rounded-lg border border-amber-200/80 truncate italic">
                        « {player.rating_comment} »
                      </p>
                    )}

                    <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 truncate">
                      Par <strong className="text-slate-800">{player.added_by_name}</strong> ({player.added_by_role || 'Staff'})
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── VOLET DROIT : CELLULE SCOUTS & ZONE DE DÉPÔT (CHARTE BLANCHE & ROUGE) ── */}
        <div className="lg:col-span-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-200 pt-5 lg:pt-0 lg:pl-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#722F37]" />
                Scouts Cibles (Déposez ici)
              </span>
              <span className="text-[11px] text-slate-500">
                {scouts.length} scouts actifs
              </span>
            </div>

            {/* LISTE DES CARTES DE SCOUTS (ZONES DE DROP DRAG & DROP) */}
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {scouts.map((scout) => {
                const isOver = dragOverScoutId === scout.id;
                const isAssigningThis = isAssigningId != null;

                return (
                  <div
                    key={scout.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverScoutId(scout.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverScoutId === scout.id) setDragOverScoutId(null);
                    }}
                    onDrop={(e) => handleDropOnScout(e, scout)}
                    className={cn(
                      "p-3 rounded-2xl border transition-all duration-200 relative group",
                      isOver
                        ? "bg-rose-100/70 border-[#722F37] ring-2 ring-rose-400/50 scale-[1.01] shadow-md"
                        : "bg-slate-50/70 hover:bg-rose-50/40 border-slate-200 hover:border-rose-300 shadow-xs"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* PHOTO DU SCOUT */}
                        {scout.photo_url ? (
                          <img
                            src={scout.photo_url}
                            alt={scout.full_name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#722F37] flex items-center justify-center text-white font-bold shrink-0 text-sm">
                            {scout.full_name.charAt(0)}
                          </div>
                        )}

                        {/* INFOS SCOUT */}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {scout.full_name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {scout.role_title || 'Scout Officiel'}
                          </p>
                          {scout.assigned_categories && scout.assigned_categories.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {scout.assigned_categories.slice(0, 3).map((cat, i) => (
                                <span key={i} className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200/70 text-slate-700">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ACTION ASSIGNER RAPIDE (FALLBACK CLIC) */}
                      {basketPlayers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const targetPlayer = basketPlayers[activeStackIndex] || basketPlayers[0];
                            if (targetPlayer) executeAssignMission(targetPlayer, scout);
                          }}
                          disabled={isAssigningThis}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 shadow-xs",
                            isOver
                              ? "bg-[#722F37] text-white font-black scale-105"
                              : "bg-[#722F37] hover:bg-[#5b252c] text-white"
                          )}
                          title="Assigner le joueur actuellement sélectionné"
                        >
                          <Send className="w-3 h-3" />
                          <span>Assigner</span>
                        </button>
                      )}
                    </div>

                    {/* OVERLAY D'INDICATEUR DE DROP */}
                    {isOver && (
                      <div className="mt-2 text-center py-1 bg-rose-200/60 rounded-lg text-[#722F37] text-[10px] font-bold animate-pulse">
                        🎯 Relâchez pour assigner immédiatement à {scout.full_name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SÉLECTEUR RAPIDE ALTERNATIF EN BAS DU VOLET DROIT */}
          {basketPlayers.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2">
              <select
                value={selectedScoutForAssign}
                onChange={(e) => setSelectedScoutForAssign(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#722F37]"
              >
                <option value="">Sélectionner un scout dans la liste...</option>
                {scouts.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.role_title || 'Scout'})
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!selectedScoutForAssign || isAssigningId != null}
                onClick={() => {
                  const s = scouts.find(sc => sc.id === selectedScoutForAssign);
                  const p = basketPlayers[activeStackIndex] || basketPlayers[0];
                  if (s && p) executeAssignMission(p, s);
                }}
                className="px-4 py-2 rounded-xl bg-[#722F37] hover:bg-[#5b252c] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs whitespace-nowrap cursor-pointer transition-all shadow-xs"
              >
                Valider
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODALE DE CONFIRMATION DE SUPPRESSION DU PANIER */}
      {playerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Retirer du panier de détection</h3>
                <p className="text-xs text-slate-500">Action synchronisée avec l'application mobile</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Voulez-vous vraiment retirer <strong className="text-slate-900">{playerToDelete.full_name}</strong> (#{playerToDelete.jersey_number ?? '?'}) du panier de détection ?
              <br />
              <span className="text-xs text-slate-500 mt-2 block">
                Le statut panier sera automatiquement désactivé sur le match et la pastille sera retirée en temps réel de l'application mobile.
              </span>
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingBasketId != null}
                onClick={() => setPlayerToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeletingBasketId != null}
                onClick={() => confirmRemoveFromBasket(playerToDelete)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isDeletingBasketId != null ? 'Retrait en cours...' : 'Confirmer le retrait'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
