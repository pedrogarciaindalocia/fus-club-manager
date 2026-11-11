import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Calendar,
  Plus,
  Trash2,
  Edit3,
  X,
  Shield,
  Search,
  Filter,
  Swords
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { Match, OpponentMatch, League, Club } from '../../../types';
import { useOpponentMatches } from '../../../hooks/useOpponentMatches';
import { useClubData } from '../../../hooks/useClubData';
import { usePermissions } from '../../../context/PermissionsContext';
import { PLAYER_CATEGORIES } from '../../../constants';

interface OpponentMatchesPanelProps {
  fusMatches?: Match[];
  leagues: League[];
  opponentClubs: Club[];
  mainClub: Club | null;
  selectedCategory: string;
  selectedLeagueId: string;
  onLeagueChange?: (leagueId: string) => void;
  onCategoryChange?: (category: string) => void;
}

export const OpponentMatchesPanel: React.FC<OpponentMatchesPanelProps> = ({
  leagues,
  opponentClubs,
  mainClub,
  selectedCategory,
  selectedLeagueId,
  onLeagueChange,
  onCategoryChange,
}) => {
  const {
    opponentMatches,
    createOpponentMatch,
    updateOpponentMatch,
    deleteOpponentMatch,
  } = useOpponentMatches(selectedLeagueId === 'All' ? undefined : selectedLeagueId);

  const { can, hasSubModuleAccess } = usePermissions();
  const canManageStandings = can('manage_standings') || hasSubModuleAccess('matches', 'manage_standings');
  const { addOpponent } = useClubData();

  // Modal d'ajout rapide de club adverse
  const [isAddClubModalOpen, setIsAddClubModalOpen] = useState(false);
  const [newClubData, setNewClubData] = useState({
    name: '',
    short_name: '',
    country: 'Maroc',
    city: '',
    logo_url: '',
  });
  const [isSavingClub, setIsSavingClub] = useState(false);

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubData.name.trim()) {
      toast.error('Veuillez renseigner le nom du club adverse');
      return;
    }
    setIsSavingClub(true);
    try {
      const created = await addOpponent({
        name: newClubData.name.trim(),
        short_name: newClubData.short_name.trim() || newClubData.name.trim().slice(0, 3).toUpperCase(),
        country: newClubData.country || 'Maroc',
        city: newClubData.city.trim() || undefined,
        logo_url: newClubData.logo_url.trim() || undefined,
      });
      toast.success(`Club adverse "${newClubData.name}" ajouté avec succès`);
      setIsAddClubModalOpen(false);
      setNewClubData({ name: '', short_name: '', country: 'Maroc', city: '', logo_url: '' });
      if (isAddModalOpen && created?.id) {
        if (!formData.home_club_id) {
          setFormData(prev => ({ ...prev, home_club_id: created.id }));
        } else if (!formData.away_club_id) {
          setFormData(prev => ({ ...prev, away_club_id: created.id }));
        }
      }
    } catch (err: any) {
      toast.error(`Erreur création club: ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setIsSavingClub(false);
    }
  };

  // Filtrer uniquement les compétitions officielles (exclure les tournois amicaux)
  const officialLeagues = useMemo(() => {
    return leagues.filter(l => !l.name?.toLowerCase().includes('amical'));
  }, [leagues]);

  // ID du championnat officiel actif
  const currentLeagueId = useMemo(() => {
    if (selectedLeagueId && selectedLeagueId !== 'All') return selectedLeagueId;
    return officialLeagues[0]?.id || leagues[0]?.id || '';
  }, [selectedLeagueId, officialLeagues, leagues]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<OpponentMatch | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const getClubName = (clubId: string) => {
    if (mainClub && clubId === mainClub.id) return mainClub.name || 'FUS Rabat';
    return opponentClubs.find(c => c.id === clubId)?.name || 'Club inconnu';
  };

  const getClubLogo = (clubId: string) => {
    if (mainClub && clubId === mainClub.id) return mainClub.logo_url;
    return opponentClubs.find(c => c.id === clubId)?.logo_url;
  };

  const getLeagueName = (id: string) => {
    return leagues.find(l => l.id === id)?.name || 'Championnat';
  };

  // Form State pour l'ajout ou la modification d'un match adverse
  const [formData, setFormData] = useState<{
    league_id: string;
    category: string;
    home_club_id: string;
    away_club_id: string;
    match_date: string;
    match_time: string;
    score_home: number;
    score_away: number;
    round_name: string;
    notes: string;
  }>({
    league_id: currentLeagueId,
    category: selectedCategory !== 'All' ? selectedCategory : 'PRO',
    home_club_id: '',
    away_club_id: '',
    match_date: new Date().toISOString().split('T')[0],
    match_time: '18:00',
    score_home: 0,
    score_away: 0,
    round_name: 'Journée 1',
    notes: '',
  });

  // Liste de tous les clubs pour les sélecteurs
  const allClubs = useMemo(() => {
    const list: Club[] = [];
    if (mainClub) list.push(mainClub);
    opponentClubs.forEach(c => {
      if (!list.some(existing => existing.id === c.id)) {
        list.push(c);
      }
    });
    return list;
  }, [mainClub, opponentClubs]);

  // Synchronisation de la ligue dans le formulaire si la sélection change
  React.useEffect(() => {
    if (currentLeagueId) {
      setFormData(prev => ({ ...prev, league_id: currentLeagueId }));
    }
  }, [currentLeagueId]);

  // Le championnat officiel se filtre STRICTEMENT par catégorie
  const effectiveCategory = useMemo(() => {
    if (selectedCategory && selectedCategory !== 'All') return selectedCategory;
    return 'U17';
  }, [selectedCategory]);

  // Synchronisation automatique si le parent a fourni 'All'
  React.useEffect(() => {
    if (selectedCategory === 'All' || !selectedCategory) {
      onCategoryChange?.('U17');
    }
  }, [selectedCategory, onCategoryChange]);

  // Filtrage des matchs adverses affichés
  const filteredOpponentMatches = useMemo(() => {
    return opponentMatches.filter(m => {
      if (currentLeagueId && m.league_id !== currentLeagueId) return false;
      if (m.category && m.category !== effectiveCategory) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const home = getClubName(m.home_club_id).toLowerCase();
        const away = getClubName(m.away_club_id).toLowerCase();
        if (!home.includes(query) && !away.includes(query)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (a.match_date !== b.match_date) {
        return b.match_date.localeCompare(a.match_date);
      }
      return (b.match_time || '').localeCompare(a.match_time || '');
    });
  }, [opponentMatches, currentLeagueId, effectiveCategory, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingMatch(null);
    setFormData({
      league_id: currentLeagueId,
      category: effectiveCategory,
      home_club_id: opponentClubs[0]?.id || '',
      away_club_id: opponentClubs[1]?.id || '',
      match_date: new Date().toISOString().split('T')[0],
      match_time: '18:00',
      score_home: 0,
      score_away: 0,
      round_name: 'Journée 1',
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (match: OpponentMatch) => {
    setEditingMatch(match);
    setFormData({
      league_id: match.league_id,
      category: match.category || 'PRO',
      home_club_id: match.home_club_id,
      away_club_id: match.away_club_id,
      match_date: match.match_date,
      match_time: match.match_time ? match.match_time.slice(0, 5) : '18:00',
      score_home: match.score_home ?? 0,
      score_away: match.score_away ?? 0,
      round_name: match.round_name || 'Journée 1',
      notes: match.notes || '',
    });
    setIsAddModalOpen(true);
  };

  const handleSubmitMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageStandings) {
      toast.error("Permission refusée : la saisie des résultats adverses est restreinte.");
      return;
    }
    if (!formData.home_club_id || !formData.away_club_id) {
      toast.error('Veuillez sélectionner les deux clubs');
      return;
    }
    if (formData.home_club_id === formData.away_club_id) {
      toast.error('Le club domicile et le club extérieur doivent être différents');
      return;
    }
    if (!formData.league_id) {
      toast.error('Veuillez sélectionner un championnat');
      return;
    }

    try {
      if (editingMatch) {
        await updateOpponentMatch({
          id: editingMatch.id,
          data: {
            ...formData,
            status: 'finished',
          },
        });
        toast.success('Résultat mis à jour');
      } else {
        await createOpponentMatch({
          ...formData,
          status: 'finished',
        });
        toast.success('Match et score enregistrés');
      }
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('Erreur soumission match:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── BARRE DE CONTRÔLE SUPÉRIEURE ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-900 leading-none">
              Matchs des Clubs Adverses
            </h2>
            <p className="text-[11px] font-bold text-slate-500 mt-1">
              Saisie des scores et calendrier des rencontres du championnat
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {canManageStandings ? (
            <Button
              onClick={handleOpenAddModal}
              className="bg-[#FF3737] hover:bg-[#e02e2e] text-white h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl font-black uppercase tracking-wider text-[10px] sm:text-xs gap-1.5 shadow-md shadow-red-500/20 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Saisir un Score / Match</span>
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-bold shrink-0">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Consultation seule</span>
            </div>
          )}
        </div>
      </div>

      {/* ── SELECTEURS DE FILTRES RAPIDES ── */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-500">
          <Filter className="w-3.5 h-3.5 text-[#FF3737]" />
          <span>Championnat :</span>
        </div>

        {/* Sélecteur de ligue officielle */}
        <select
          value={currentLeagueId}
          onChange={(e) => onLeagueChange?.(e.target.value)}
          className="text-xs font-bold uppercase rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF3737]/30"
        >
          {officialLeagues.map(l => (
            <option key={l.id} value={l.id}>
              🏆 {l.name} {l.season ? `(${l.season})` : ''}
            </option>
          ))}
          {officialLeagues.length === 0 && leagues.map(l => (
            <option key={l.id} value={l.id}>
              {l.name} {l.season ? `(${l.season})` : ''}
            </option>
          ))}
        </select>

        {/* Sélecteur de catégorie */}
        <select
          value={effectiveCategory}
          onChange={(e) => onCategoryChange?.(e.target.value)}
          className="text-xs font-bold uppercase rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF3737]/30"
        >
          {PLAYER_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Recherche par nom de club */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Rechercher un club..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8 rounded-lg bg-slate-50 border-slate-200"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 text-[11px] font-bold text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{filteredOpponentMatches.length} match{filteredOpponentMatches.length > 1 ? 's' : ''} répertorié{filteredOpponentMatches.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── LISTE DES MATCHS EN MODE TABLE (STYLE PHOTO 2) ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden divide-y divide-slate-100">
        {/* En-tête style Photo 2 (🔴 LIGUE ...) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-50/90 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3737] shrink-0 shadow-xs" />
            <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
              {getLeagueName(currentLeagueId)}
            </h4>
            <Badge variant="outline" className="text-[10px] font-black uppercase border-slate-300 text-slate-600 px-2 py-0.2">
              {effectiveCategory}
            </Badge>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            {filteredOpponentMatches.length} match{filteredOpponentMatches.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Rangées de match style Photo 2 */}
        {filteredOpponentMatches.map((m) => {
          const homeName = getClubName(m.home_club_id);
          const awayName = getClubName(m.away_club_id);
          const homeLogo = getClubLogo(m.home_club_id);
          const awayLogo = getClubLogo(m.away_club_id);
          const isLive = m.status === 'live';
          const isFinished = m.status === 'finished';

          return (
            <div
              key={m.id}
              onClick={() => canManageStandings && handleOpenEditModal(m)}
              className="flex items-center justify-between py-3.5 px-3 sm:px-6 hover:bg-slate-50/90 transition-colors cursor-pointer group"
            >
              {/* Club Domicile (Gauche - texte aligné à droite) */}
              <div className="flex-1 flex items-center justify-end gap-2.5 sm:gap-3 min-w-0">
                <span className="text-xs sm:text-sm font-bold text-slate-800 truncate text-right">
                  {homeName}
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center p-0.5 shrink-0 overflow-hidden shadow-2xs">
                  {homeLogo ? (
                    <img src={homeLogo} alt="" className="w-full h-full object-contain rounded-full" />
                  ) : (
                    <span className="text-[10px] font-black text-slate-500">{homeName.slice(0, 3).toUpperCase()}</span>
                  )}
                </div>
              </div>

              {/* Centre : Score + TF / Statut (Identique Photo 2) */}
              <div className="w-24 sm:w-32 flex flex-col items-center justify-center shrink-0 px-2 text-center">
                {isLive ? (
                  <>
                    <span className="text-base sm:text-lg font-black text-red-600 tracking-wider tabular-nums animate-pulse">
                      {m.score_home ?? 0} - {m.score_away ?? 0}
                    </span>
                    <span className="text-[9px] font-black uppercase text-red-600 bg-red-50 px-2 py-0.2 rounded-full border border-red-200">
                      LIVE
                    </span>
                  </>
                ) : isFinished ? (
                  <>
                    <span className="text-base sm:text-lg font-black text-slate-900 tracking-wider tabular-nums">
                      {m.score_home ?? 0} - {m.score_away ?? 0}
                    </span>
                    <span className="text-[10px] font-black uppercase text-slate-400">
                      TF
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs sm:text-sm font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/80 tabular-nums">
                      {m.match_time ? m.match_time.slice(0, 5) : 'À venir'}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                      {m.match_date}
                    </span>
                  </>
                )}
              </div>

              {/* Club Extérieur (Droite - texte aligné à gauche) */}
              <div className="flex-1 flex items-center justify-start gap-2.5 sm:gap-3 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center p-0.5 shrink-0 overflow-hidden shadow-2xs">
                  {awayLogo ? (
                    <img src={awayLogo} alt="" className="w-full h-full object-contain rounded-full" />
                  ) : (
                    <span className="text-[10px] font-black text-slate-500">{awayName.slice(0, 3).toUpperCase()}</span>
                  )}
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-800 truncate text-left">
                  {awayName}
                </span>
              </div>

              {/* Actions au survol */}
              {canManageStandings && (
                <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0" onClick={e => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEditModal(m)}
                    className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                    title="Modifier le score"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('Supprimer ce résultat de match adverse ?')) {
                        deleteOpponentMatch(m.id);
                      }
                    }}
                    className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {filteredOpponentMatches.length === 0 && (
          <div className="py-12 text-center px-4">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-black uppercase text-slate-700">
              Aucun match adverse enregistré
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Cliquez sur « Saisir un Score / Match » pour enregistrer les scores des autres équipes du championnat.
            </p>
            {canManageStandings && (
              <Button
                onClick={handleOpenAddModal}
                className="mt-4 bg-[#FF3737] hover:bg-[#e02e2e] text-white text-xs font-black uppercase h-9 px-4 rounded-xl"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Saisir un score
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL SAISIE / ÉDITION DE MATCH ADVERSE ── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              {/* Entête du modal */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FF3737]/10 flex items-center justify-center text-[#FF3737]">
                    <Swords className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase italic text-slate-900">
                      {editingMatch ? 'Modifier le Score Adverse' : 'Saisir un Score de Match Adverse'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400">
                      Enregistrement du résultat pour le championnat
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulaire */}
              <form onSubmit={handleSubmitMatch} className="p-6 space-y-4">
                {/* Ligne 1 : Championnat & Catégorie */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Championnat / Ligue *
                    </label>
                    <select
                      value={formData.league_id}
                      onChange={(e) => setFormData({ ...formData, league_id: e.target.value })}
                      required
                      className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:ring-2 focus:ring-[#FF3737]/30"
                    >
                      {leagues.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name} {l.season ? `(${l.season})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Catégorie d'Âge
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:ring-2 focus:ring-[#FF3737]/30"
                    >
                      {PLAYER_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Ligne 2 : Club Domicile vs Club Extérieur */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-black uppercase text-slate-500">
                        Équipe Domicile *
                      </label>
                      {canManageStandings && (
                        <button
                          type="button"
                          onClick={() => setIsAddClubModalOpen(true)}
                          className="text-[10px] font-bold text-[#FF3737] hover:underline flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" /> Nouveau club
                        </button>
                      )}
                    </div>
                    <select
                      value={formData.home_club_id}
                      onChange={(e) => setFormData({ ...formData, home_club_id: e.target.value })}
                      required
                      className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:ring-2 focus:ring-[#FF3737]/30"
                    >
                      <option value="">Sélectionner...</option>
                      {allClubs.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.id === mainClub?.id ? '(Mon Club)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-black uppercase text-slate-500">
                        Équipe Extérieur *
                      </label>
                      {canManageStandings && (
                        <button
                          type="button"
                          onClick={() => setIsAddClubModalOpen(true)}
                          className="text-[10px] font-bold text-[#FF3737] hover:underline flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" /> Nouveau club
                        </button>
                      )}
                    </div>
                    <select
                      value={formData.away_club_id}
                      onChange={(e) => setFormData({ ...formData, away_club_id: e.target.value })}
                      required
                      className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:ring-2 focus:ring-[#FF3737]/30"
                    >
                      <option value="">Sélectionner...</option>
                      {allClubs
                        .filter(c => c.id !== formData.home_club_id)
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.id === mainClub?.id ? '(Mon Club)' : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Ligne 3 : Date, Heure & Journée */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Date du Match *
                    </label>
                    <Input
                      type="date"
                      value={formData.match_date}
                      onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                      required
                      className="text-xs font-bold rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Heure
                    </label>
                    <Input
                      type="time"
                      value={formData.match_time}
                      onChange={(e) => setFormData({ ...formData, match_time: e.target.value })}
                      className="text-xs font-bold rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Journée / Tour
                    </label>
                    <Input
                      type="text"
                      placeholder="ex: J14"
                      value={formData.round_name}
                      onChange={(e) => setFormData({ ...formData, round_name: e.target.value })}
                      className="text-xs font-bold rounded-xl"
                    />
                  </div>
                </div>

                {/* Ligne 4 : Score Domicile vs Score Extérieur (Mise en valeur) */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="text-[10px] font-black uppercase text-slate-500 text-center mb-2">
                    Score & Résultat Final
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-slate-600 mb-1 truncate max-w-[120px]">
                        {getClubName(formData.home_club_id) || 'Domicile'}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        max="99"
                        value={formData.score_home}
                        onChange={(e) => setFormData({ ...formData, score_home: parseInt(e.target.value) || 0 })}
                        className="w-16 h-12 text-center text-2xl font-black rounded-xl bg-white shadow-xs focus:ring-2 focus:ring-[#FF3737]"
                      />
                    </div>

                    <span className="text-2xl font-black text-slate-300 mt-4">-</span>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-slate-600 mb-1 truncate max-w-[120px]">
                        {getClubName(formData.away_club_id) || 'Extérieur'}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        max="99"
                        value={formData.score_away}
                        onChange={(e) => setFormData({ ...formData, score_away: parseInt(e.target.value) || 0 })}
                        className="w-16 h-12 text-center text-2xl font-black rounded-xl bg-white shadow-xs focus:ring-2 focus:ring-[#FF3737]"
                      />
                    </div>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsAddModalOpen(false)}
                    className="text-xs font-bold uppercase rounded-xl h-10 px-4"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#FF3737] hover:bg-[#e02e2e] text-white text-xs font-black uppercase rounded-xl h-10 px-6 shadow-md shadow-red-500/20"
                  >
                    Enregistrer le Résultat
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL CRÉATION RAPIDE DE CLUB ADVERSE ── */}
      <AnimatePresence>
        {isAddClubModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FF3737]/10 flex items-center justify-center text-[#FF3737]">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase italic text-slate-900">
                      Nouveau Club Adverse
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400">
                      Ajout rapide dans la base du club
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddClubModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateClub} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Nom du Club *
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="ex: Wydad AC"
                    value={newClubData.name}
                    onChange={(e) => setNewClubData({ ...newClubData, name: e.target.value })}
                    className="text-xs font-bold rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Sigle / Diminutif
                    </label>
                    <Input
                      type="text"
                      placeholder="ex: WAC"
                      maxLength={5}
                      value={newClubData.short_name}
                      onChange={(e) => setNewClubData({ ...newClubData, short_name: e.target.value })}
                      className="text-xs font-bold rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Ville
                    </label>
                    <Input
                      type="text"
                      placeholder="ex: Casablanca"
                      value={newClubData.city}
                      onChange={(e) => setNewClubData({ ...newClubData, city: e.target.value })}
                      className="text-xs font-bold rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    URL du Logo (Optionnel)
                  </label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={newClubData.logo_url}
                    onChange={(e) => setNewClubData({ ...newClubData, logo_url: e.target.value })}
                    className="text-xs font-bold rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsAddClubModalOpen(false)}
                    className="text-xs font-bold uppercase rounded-xl h-10 px-4"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingClub}
                    className="bg-[#FF3737] hover:bg-[#e02e2e] text-white text-xs font-black uppercase rounded-xl h-10 px-6 shadow-md shadow-red-500/20"
                  >
                    {isSavingClub ? 'Création...' : 'Créer le Club'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OpponentMatchesPanel;
