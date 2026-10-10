import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOpponentPlayers } from '../../../hooks/useOpponentPlayers';
import { storageService } from '../../../services/storageService';
import { PLAYER_CATEGORIES, NATIONALITIES, FOOT_OPTIONS } from '../../../constants';
import type { Club, OpponentPlayer } from '../../../types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent } from '../../../components/ui/card';
import { 
  X, Plus, Edit2, Trash2, Camera, Search, User, Shield, 
  Loader2, Filter, CheckCircle2, Ruler, Weight, Globe, Footprints, Sparkles, AlertCircle,
  ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import { build22FakeOpponentPlayers } from '../../../utils/generateFakeOpponentPlayers';
import { MediaPickerModal } from '../../media-management/components/MediaPickerModal';

export const OPPONENT_CATEGORIES = [
  'TOUTES',
  'SENIOR',
  'PRO',
  'U23',
  'U21',
  'U20',
  'U19',
  'U18',
  'U17',
  'U16',
  'U15',
  'U14',
  'U13'
] as const;

interface OpponentSquadModalProps {
  isOpen: boolean;
  onClose: () => void;
  club: Club;
}

import { PLAYER_POSITIONS } from '../../../constants';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';

export const OpponentSquadModal: React.FC<OpponentSquadModalProps> = ({ isOpen, onClose, club }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('TOUTES');
  const { players, isLoading, addOpponentPlayer, addManyOpponentPlayers, updateOpponentPlayer, deleteOpponentPlayer } = useOpponentPlayers(
    club.id, 
    selectedCategory === 'TOUTES' ? undefined : selectedCategory
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<OpponentPlayer | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<OpponentPlayer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const executeGenerate22Players = async () => {
    setIsGenerating(true);
    try {
      const targetCat = selectedCategory === 'TOUTES' ? 'SENIOR' : selectedCategory;
      const fakeSquad = build22FakeOpponentPlayers(club.id, targetCat);
      await addManyOpponentPlayers(fakeSquad);
      toast.success(`22 joueurs adverses (${targetCat}) ont été générés avec succès !`);
    } catch (err: any) {
      console.error(err);
      toast.error('Erreur lors de la génération des joueurs');
    } finally {
      setIsGenerating(false);
      setShowGenerateConfirm(false);
    }
  };

  const handleGenerate22Players = () => {
    if (players.length > 0) {
      setShowGenerateConfirm(true);
      return;
    }
    executeGenerate22Players();
  };

  const handleConfirmDelete = async () => {
    if (!playerToDelete) return;
    setIsDeleting(true);
    try {
      await deleteOpponentPlayer(playerToDelete.id);
      toast.success(`${playerToDelete.full_name} a été supprimé de l'effectif.`);
      setPlayerToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la suppression du joueur');
    } finally {
      setIsDeleting(false);
    }
  };

  const [formData, setFormData] = useState<Partial<OpponentPlayer>>({
    full_name: '',
    jersey_number: 10,
    position: 'ST',
    category: 'SENIOR',
    height: 180,
    weight: 75,
    preferred_foot: 'Droit',
    nationality: 'Maroc',
    photo_url: '',
  });

  if (!isOpen) return null;

  const handleOpenForm = (player?: OpponentPlayer) => {
    const defaultCat = selectedCategory === 'TOUTES' ? 'SENIOR' : selectedCategory;
    if (player) {
      setEditingPlayer(player);
      setFormData({
        full_name: player.full_name,
        jersey_number: player.jersey_number ?? 10,
        position: player.position ?? 'ST',
        category: player.category ?? defaultCat,
        height: player.height ?? undefined,
        weight: player.weight ?? undefined,
        preferred_foot: player.preferred_foot ?? 'Droit',
        nationality: player.nationality ?? 'Maroc',
        photo_url: player.photo_url ?? '',
      });
    } else {
      setEditingPlayer(null);
      setFormData({
        full_name: '',
        jersey_number: (players.length > 0 ? (Math.max(...players.map(p => p.jersey_number || 0)) + 1) : 1),
        position: 'ST',
        category: defaultCat,
        height: 180,
        weight: 75,
        preferred_foot: 'Droit',
        nationality: 'Maroc',
        photo_url: '',
      });
    }
    setNameError(null);
    setShowPlayerForm(true);
  };

  const handleSavePlayer = async () => {
    if (!formData.full_name?.trim()) {
      setNameError('Le nom complet est obligatoire');
      toast.error('Veuillez renseigner le nom complet du joueur');
      return;
    }
    setNameError(null);

    const defaultCat = selectedCategory === 'TOUTES' ? 'SENIOR' : selectedCategory;

    try {
      if (editingPlayer) {
        await updateOpponentPlayer({
          id: editingPlayer.id,
          updates: {
            full_name: formData.full_name.trim(),
            jersey_number: formData.jersey_number ? Number(formData.jersey_number) : null,
            position: formData.position || null,
            category: formData.category || defaultCat,
            height: formData.height ? Number(formData.height) : null,
            weight: formData.weight ? Number(formData.weight) : null,
            preferred_foot: formData.preferred_foot || null,
            nationality: formData.nationality || null,
            photo_url: formData.photo_url || null,
          },
        });
      } else {
        await addOpponentPlayer({
          opponent_id: club.id,
          full_name: formData.full_name.trim(),
          jersey_number: formData.jersey_number ? Number(formData.jersey_number) : null,
          position: formData.position || null,
          category: formData.category || defaultCat,
          height: formData.height ? Number(formData.height) : null,
          weight: formData.weight ? Number(formData.weight) : null,
          preferred_foot: formData.preferred_foot || null,
          nationality: formData.nationality || 'Maroc',
          photo_url: formData.photo_url || null,
        });
      }
      setShowPlayerForm(false);
    } catch (e) {
      console.error(e);
    }
  };


  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await storageService.uploadFile(file, 'players');
      setFormData(prev => ({ ...prev, photo_url: url }));
    } catch (err) {
      console.error('Failed to upload photo', err);
      toast.error('Erreur lors du téléversement de la photo');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredPlayers = players.filter(p =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.jersey_number?.toString() || '').includes(searchQuery) ||
    (p.position || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const clubLogo = (club.logo_url && club.logo_url !== 'null') 
    ? club.logo_url 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(club.name)}&background=020617&color=fff&size=200`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 my-8"
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-primary to-slate-900 p-8 text-white flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md p-2 border border-white/20 flex items-center justify-center">
              <img src={clubLogo} alt={club.name} className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">{club.name}</h3>
                <Badge className="bg-primary/20 text-primary-foreground border-white/20 px-3 py-0.5 text-[9px] uppercase font-black">
                  EFFECTIF ADVERSE
                </Badge>
              </div>
              <p className="text-xs font-medium text-white/60 mt-1">
                {club.city ? `${club.city}, ` : ''}{club.country || 'Maroc'} • Gestion des effectifs par catégorie
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all z-10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filter Categories Bar */}
        <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {OPPONENT_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setShowPlayerForm(false);
                }}
                className={cn(
                  "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border cursor-pointer",
                  selectedCategory === cat
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Recherche nom / numéro / poste..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 h-11 w-64 rounded-2xl text-xs font-bold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <Button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerate22Players}
              className="h-11 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-200" />}
              Générer 22 Joueurs
            </Button>

            <Button
              onClick={() => handleOpenForm()}
              className="h-11 px-5 rounded-2xl bg-primary hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Ajouter Joueur
            </Button>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {showPlayerForm ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-slate-50 dark:bg-slate-800/40 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 space-y-6"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <h4 className="text-lg font-black uppercase italic tracking-tight">
                    {editingPlayer ? 'Éditer le Joueur Adverse' : 'Ajouter un Nouveau Joueur Adverse'}
                  </h4>
                  <Badge variant="outline" className="font-black text-[10px] uppercase">
                    Catégorie: {formData.category}
                  </Badge>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-8">
                  {/* Photo / Avatar Uploader & Preview */}
                  <div className="relative group shrink-0">
                    <div className="w-28 h-28 rounded-3xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl relative">
                      <img
                        src={
                          formData.photo_url && formData.photo_url !== 'null'
                            ? formData.photo_url
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.full_name || 'Joueur')}&background=020617&color=fff&size=200`
                        }
                        alt="Avatar Preview"
                        className={cn("w-full h-full object-cover", isUploading && "opacity-30")}
                      />
                      {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                      )}
                    </div>
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      id="opponent-player-photo"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                    <label
                      htmlFor="opponent-player-photo"
                      className="absolute -bottom-2 -right-2 w-9 h-9 rounded-2xl bg-primary text-white flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 active:scale-95 transition-all"
                      title="Téléverser un fichier"
                    >
                      <Camera className="w-4 h-4" />
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMediaPickerOpen(true)}
                      className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 bg-slate-50 hover:bg-primary/10 border-slate-200 hover:border-primary/40 text-slate-800"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-primary" />
                      <span>Médiathèque</span>
                    </Button>
                    {formData.photo_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                        className="h-8 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                        title="Supprimer la photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 w-full">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Nom Complet *
                      </label>
                      <Input
                        placeholder="e.g. Achraf Hakimi"
                        value={formData.full_name}
                        onChange={e => {
                          setFormData({ ...formData, full_name: e.target.value });
                          if (nameError) setNameError(null);
                        }}
                        className={cn(
                          "h-12 rounded-2xl bg-white dark:bg-slate-900 font-bold text-sm transition-all",
                          nameError && "border-red-500 focus-visible:ring-red-500 ring-1 ring-red-500"
                        )}
                      />
                      {nameError && (
                        <p className="text-[11px] font-bold text-red-500 flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {nameError}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Numéro de Maillot
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        placeholder="e.g. 10"
                        value={formData.jersey_number || ''}
                        onChange={e => setFormData({ ...formData, jersey_number: parseInt(e.target.value) || undefined })}
                        className="h-12 rounded-2xl bg-white dark:bg-slate-900 font-bold text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Poste / Position (Liste Déroulante) *
                      </label>
                      <select
                        value={formData.position || 'ST'}
                        onChange={e => setFormData({ ...formData, position: e.target.value })}
                        className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none cursor-pointer"
                      >
                        {PLAYER_POSITIONS.map(p => (
                          <option key={p.code} value={p.code}>{p.code} — {p.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Catégorie d'Âge
                      </label>
                      <select
                        value={formData.category || (selectedCategory === 'TOUTES' ? 'SENIOR' : selectedCategory)}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none cursor-pointer"
                      >
                        {OPPONENT_CATEGORIES.filter(c => c !== 'TOUTES').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                        <Ruler className="w-3.5 h-3.5 text-primary" /> Taille (cm)
                      </label>
                      <Input
                        type="number"
                        min={120}
                        max={220}
                        placeholder="e.g. 182"
                        value={formData.height || ''}
                        onChange={e => setFormData({ ...formData, height: parseInt(e.target.value) || undefined })}
                        className="h-12 rounded-2xl bg-white dark:bg-slate-900 font-bold text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                        <Weight className="w-3.5 h-3.5 text-primary" /> Poids (kg)
                      </label>
                      <Input
                        type="number"
                        min={30}
                        max={130}
                        placeholder="e.g. 75"
                        value={formData.weight || ''}
                        onChange={e => setFormData({ ...formData, weight: parseInt(e.target.value) || undefined })}
                        className="h-12 rounded-2xl bg-white dark:bg-slate-900 font-bold text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                        <Footprints className="w-3.5 h-3.5 text-primary" /> Pied Fort (Liste Déroulante)
                      </label>
                      <select
                        value={formData.preferred_foot || 'Droit'}
                        onChange={e => setFormData({ ...formData, preferred_foot: e.target.value })}
                        className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none cursor-pointer"
                      >
                        {FOOT_OPTIONS.map(foot => (
                          <option key={foot.value} value={foot.value}>{foot.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-primary" /> Nationalité (Liste Déroulante)
                      </label>
                      <select
                        value={formData.nationality || 'Maroc'}
                        onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                        className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none cursor-pointer"
                      >
                        {NATIONALITIES.map(nat => (
                          <option key={nat} value={nat}>{nat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="ghost"
                    onClick={() => setShowPlayerForm(false)}
                    className="h-12 px-6 rounded-2xl font-bold text-xs uppercase"
                  >
                    Annuler
                  </Button>
                  <Button
                    disabled={isUploading || !formData.full_name?.trim()}
                    onClick={handleSavePlayer}
                    className="h-12 px-8 rounded-2xl bg-primary hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest gap-2 shadow-lg"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {editingPlayer ? 'Mettre à jour' : 'Enregistrer'}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {isLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                    <p className="text-xs font-bold uppercase tracking-widest">Chargement de l'effectif...</p>
                  </div>
                ) : filteredPlayers.length === 0 ? (
                  <div className="py-16 text-center flex flex-col items-center justify-center space-y-5 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase italic text-slate-800 dark:text-slate-200">
                        Aucun joueur répertorié pour la catégorie {selectedCategory}
                      </p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                        Générez un effectif complet de 22 joueurs avec des données modulables (postes, maillots, tailles, pieds forts, nationalités) en un seul clic !
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        type="button"
                        disabled={isGenerating}
                        onClick={handleGenerate22Players}
                        className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest gap-2 shadow-lg shadow-emerald-600/30"
                      >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Générer 22 Joueurs Fictifs
                      </Button>
                      <Button
                        onClick={() => handleOpenForm()}
                        variant="outline"
                        className="h-12 px-6 rounded-2xl border-slate-300 font-bold text-xs uppercase tracking-wider"
                      >
                        <Plus className="w-4 h-4 mr-1.5" /> Ajouter Manuellement
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPlayers.map(player => {
                      const avatarUrl = (player.photo_url && player.photo_url !== 'null')
                        ? player.photo_url
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=020617&color=fff&size=128`;

                      return (
                        <div
                          key={player.id}
                          className="flex flex-col p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 hover:border-primary/40 transition-all group space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3.5 min-w-0">
                              {/* Avatar */}
                              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-600 shrink-0 relative shadow-sm">
                                <img src={avatarUrl} alt={player.full_name} className="w-full h-full object-cover" />
                                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-slate-950 text-white p-0 flex items-center justify-center text-[9px] font-black">
                                  #{player.jersey_number ?? '—'}
                                </Badge>
                              </div>

                              <div className="min-w-0">
                                <h5 className="font-black text-sm uppercase truncate text-slate-900 dark:text-white leading-tight">
                                  {player.full_name}
                                </h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase px-2 py-0.5">
                                    {player.position || 'ST'}
                                  </Badge>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    • {player.category}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenForm(player)}
                                className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary"
                                title="Modifier le joueur"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPlayerToDelete(player)}
                                className="h-8 w-8 rounded-xl hover:bg-red-50 hover:text-red-500 text-slate-400"
                                title="Supprimer définitivement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Sports Details Badges */}
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center gap-2 text-[9px] font-bold text-slate-500">
                            {player.nationality && (
                              <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                <Globe className="w-2.5 h-2.5 text-primary" /> {player.nationality}
                              </span>
                            )}
                            {player.height && (
                              <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                <Ruler className="w-2.5 h-2.5 text-primary" /> {player.height} cm
                              </span>
                            )}
                            {player.weight && (
                              <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                <Weight className="w-2.5 h-2.5 text-primary" /> {player.weight} kg
                              </span>
                            )}
                            {player.preferred_foot && (
                              <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                <Footprints className="w-2.5 h-2.5 text-primary" /> {player.preferred_foot}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            Total Joueurs ({selectedCategory}): {players.length}
          </p>
          <Button
            variant="outline"
            onClick={onClose}
            className="h-11 px-6 rounded-2xl font-bold text-xs uppercase"
          >
            Fermer
          </Button>
        </div>
      </motion.div>

      {/* Confirmation de suppression d'un joueur */}
      <ConfirmDialog
        isOpen={Boolean(playerToDelete)}
        onClose={() => !isDeleting && setPlayerToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer ce joueur ?"
        description={`Êtes-vous sûr de vouloir supprimer ${playerToDelete?.full_name || 'ce joueur'} ? Cette action retirera définitivement sa fiche de l'effectif adverse.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="destructive"
        isLoading={isDeleting}
      />

      {/* Confirmation de génération d'effectif fictif supplémentaire */}
      <ConfirmDialog
        isOpen={showGenerateConfirm}
        onClose={() => !isGenerating && setShowGenerateConfirm(false)}
        onConfirm={executeGenerate22Players}
        title="Ajouter 22 joueurs supplémentaires ?"
        description={`Cet effectif contient déjà ${players.length} joueur(s) dans la catégorie ${selectedCategory}. Souhaitez-vous générer 22 profils fictifs supplémentaires ?`}
        confirmLabel="Générer 22 joueurs"
        cancelLabel="Annuler"
        variant="default"
        isLoading={isGenerating}
      />

      {/* Sélecteur de Médias Centralisé */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => setFormData(prev => ({ ...prev, photo_url: url }))}
        title="Affecter une photo depuis la Médiathèque"
      />
    </div>
  );
};
