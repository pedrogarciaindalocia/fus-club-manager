import React, { useState, useRef, useMemo } from 'react';
import { useCompetitions } from '../../hooks/useCompetitions';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Building2, MapPin, Plus, Search, Trash2, Edit2,
  X, Users, Camera, Globe, CheckCircle2, Loader2,
  LayoutGrid, List as ListIcon, ChevronLeft, ChevronRight,
  ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { storageService } from '../../services/storageService';
import { useClubData } from '../../hooks/useClubData';
import type { Stadium } from '../../types';
import { Skeleton } from '../../components/ui/skeleton';
import { MediaPickerModal } from '../media-management/components/MediaPickerModal';

type FormState = {
  name: string;
  city: string;
  capacity: string;
  image_url: string;
};

const EMPTY_FORM: FormState = { name: '', city: '', capacity: '', image_url: '' };

const StadiumManagement: React.FC = () => {
  const { stadiums, isLoading: statsLoading, addStadium, updateStadium, deleteStadium } = useCompetitions();
  const { mainClub, isLoading: clubLoading } = useClubData();
  const isLoading = statsLoading || clubLoading;

  const [searchQuery, setSearchQuery]   = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [formData, setFormData]         = useState<FormState>(EMPTY_FORM);
  const [uploading, setUploading]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings sync
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>(mainClub?.preferred_view_mode || 'list');
  const [pageSize, setPageSize] = useState(mainClub?.pagination_limit || 10);
  const [currentPage, setCurrentPage] = useState(1);

  React.useEffect(() => {
    if (mainClub?.preferred_view_mode) setDisplayMode(mainClub.preferred_view_mode);
    if (mainClub?.pagination_limit) setPageSize(mainClub.pagination_limit);
  }, [mainClub]);

  /* ── Helpers ── */
  const field = (key: keyof FormState, val: string) =>
    setFormData(prev => ({ ...prev, [key]: val }));

  const openAdd = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (s: Stadium) => {
    setEditingId(s.id);
    setFormData({
      name:      s.name,
      city:      s.city,
      capacity:  s.capacity?.toString() || '',
      image_url: s.image_url || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  /* ── Photo upload ── */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await storageService.uploadFile(file, 'stadiums');
      field('image_url', url);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.city.trim()) return;
    setSaving(true);
    try {
      const cleanCapacity = formData.capacity.replace(/\s/g, '');
      const payload: any = {
        name:      formData.name.trim(),
        city:      formData.city.trim(),
        capacity:  cleanCapacity ? parseInt(cleanCapacity, 10) : null,
        image_url: formData.image_url.trim() || null,
      };

      if (editingId) {
        await updateStadium({ id: editingId, data: payload });
      } else {
        await addStadium(payload);
      }
      closeForm();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async (id: string) => {
    await deleteStadium(id);
    setConfirmDelete(null);
  };

  const filteredStadiums = stadiums.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedStadiums = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStadiums.slice(start, start + pageSize);
  }, [filteredStadiums, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredStadiums.length / pageSize);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  const isValid = formData.name.trim() && formData.city.trim();

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-[2rem]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 overflow-visible">
      <AnimatePresence mode="wait">
        {!showForm ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-8"
          >
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic text-foreground">
                    Gestion des Stades
                  </h2>
                  <p className="text-muted-foreground text-sm font-medium mt-0.5">
                    {stadiums.length} stade{stadiums.length !== 1 ? 's' : ''} enregistré{stadiums.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Button
                onClick={openAdd}
                className="h-12 px-7 rounded-2xl font-black uppercase tracking-widest text-[11px] gap-3 shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Ajouter un Stade
              </Button>
            </div>

            {/* ── Search Bar ── */}
            <div className="flex items-center gap-4 p-4 rounded-[2rem] bg-white border shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou ville…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-secondary/30 border-transparent rounded-xl font-medium focus:bg-white transition-all"
                />
              </div>

              {/* View Toggle */}
              <div className="flex bg-secondary/30 p-1 rounded-2xl border">
                <Button 
                  variant={displayMode === 'list' ? 'default' : 'ghost'} 
                  size="icon" 
                  onClick={() => setDisplayMode('list')}
                  className="w-10 h-10 rounded-xl"
                >
                  <ListIcon className="w-4 h-4" />
                </Button>
                <Button 
                  variant={displayMode === 'grid' ? 'default' : 'ghost'} 
                  size="icon" 
                  onClick={() => setDisplayMode('grid')}
                  className="w-10 h-10 rounded-xl"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>

              <Badge variant="secondary" className="h-12 px-6 text-[10px] font-black uppercase tracking-widest bg-secondary/50 rounded-xl">
                {filteredStadiums.length} / {stadiums.length}
              </Badge>
            </div>

            {/* Content Area */}
            {displayMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {paginatedStadiums.map(stadium => (
                    <motion.div
                      key={stadium.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.25 }}
                    >
                      <Card className="group relative overflow-hidden border-secondary hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 bg-white rounded-[2rem]">
                        <div className="h-52 bg-secondary relative overflow-hidden">
                          <img 
                            src={(stadium.image_url && stadium.image_url !== 'null') ? stadium.image_url : `https://images.unsplash.com/photo-1540747913346-19e3adcc174d?auto=format&fit=crop&q=80&w=800`} 
                            alt={stadium.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-500" />
                          <div className="absolute top-4 right-4 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-y-2 sm:group-hover:translate-y-0 transition-all duration-300">
                            <Button variant="secondary" size="icon" onClick={() => openEdit(stadium)} className="h-9 w-9 rounded-xl bg-white/90 backdrop-blur-md hover:bg-white shadow-lg"><Edit2 className="w-4 h-4" /></Button>
                            <Button variant="secondary" size="icon" onClick={() => setConfirmDelete(stadium.id)} className="h-9 w-9 rounded-xl bg-white/90 backdrop-blur-md hover:bg-red-50 hover:text-red-500 shadow-lg"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>

                        <CardContent className="p-6 space-y-3">
                          <div>
                            <h3 className="font-black text-lg tracking-tight uppercase group-hover:text-primary transition-colors truncate">{stadium.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin className="w-3.5 h-3.5 text-primary/50" />
                              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stadium.city}</span>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-secondary flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Users className="w-4 h-4 text-muted-foreground opacity-30" />
                              <span className="text-[10px] font-black">{stadium.capacity?.toLocaleString() || 'N/A'}</span>
                            </div>
                            <Badge variant="outline" className="text-[9px] font-black italic border-primary/20 text-primary uppercase px-3">Infrastructure</Badge>
                          </div>
                        </CardContent>

                        <AnimatePresence>
                          {confirmDelete === stadium.id && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center gap-5 p-8 z-10">
                              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center"><Trash2 className="w-6 h-6 text-red-500" /></div>
                              <div className="text-center"><p className="text-sm font-black uppercase italic tracking-tight">Supprimer ?</p></div>
                              <div className="flex gap-3 w-full">
                                <Button variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[10px]">Non</Button>
                                <Button variant="destructive" onClick={() => handleDelete(stadium.id)} className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-200">Oui</Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <motion.button
                  onClick={openAdd}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="border-2 border-dashed border-secondary hover:border-primary/50 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 text-muted-foreground hover:text-primary transition-all duration-300 min-h-[350px] group bg-secondary/5"
                >
                  <div className="w-14 h-14 rounded-2xl bg-secondary group-hover:bg-primary/10 flex items-center justify-center transition-all">
                    <Plus className="w-7 h-7 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-sm uppercase tracking-tight">Ajouter un stade</p>
                  </div>
                </motion.button>
              </div>
            ) : (
              <div className="bg-white border rounded-[2rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-secondary/10 border-b">
                      <tr>
                        <th className="text-left px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Infrastructure</th>
                        <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ville</th>
                        <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Capacité</th>
                        <th className="text-right px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary/30">
                      {paginatedStadiums.map(s => (
                        <tr key={s.id} className="group hover:bg-secondary/5 transition-colors">
                          <td className="px-8 py-3 font-black text-sm uppercase italic tracking-tighter truncate max-w-[200px]">{s.name}</td>
                          <td className="py-3 text-xs font-bold uppercase text-muted-foreground">{s.city}</td>
                          <td className="py-3 font-bold text-xs">{s.capacity?.toLocaleString() || 'N/A'}</td>
                          <td className="px-8 py-3 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-md transition-all"><Edit2 className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(s.id)} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6">
                 <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                    Affichage {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredStadiums.length)} sur {filteredStadiums.length}
                 </div>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="w-9 h-9 rounded-xl bg-white border-secondary"><ChevronLeft className="w-4 h-4" /></Button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <Button key={i} variant={currentPage === i + 1 ? 'default' : 'ghost'} size="sm" onClick={() => setCurrentPage(i + 1)} className={`w-9 h-9 rounded-xl font-black text-[11px] ${currentPage === i + 1 ? 'shadow-lg shadow-primary/20 bg-primary' : 'bg-white border-secondary border'}`}>{i + 1}</Button>
                    ))}
                    <Button variant="outline" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="w-9 h-9 rounded-xl bg-white border-secondary"><ChevronRight className="w-4 h-4" /></Button>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50">Par page:</span>
                    <select value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value))} className="h-9 w-16 rounded-xl bg-white border border-secondary font-black text-xs px-2 appearance-none cursor-pointer text-center">
                       {[5, 10, 15, 20, 25, 50].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                 </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-4xl mx-auto"
          >
            {/* Form Header */}
            <div className="flex items-center gap-6 mb-10">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={closeForm} 
                className="w-14 h-14 rounded-2xl bg-white border shadow-sm hover:bg-secondary transition-all"
              >
                <X className="w-6 h-6 rotate-90" />
              </Button>
              <div>
                <h3 className="text-4xl font-black tracking-tight uppercase italic">
                   {editingId ? 'Modifier les Détails' : 'Nouveau Terrain'}
                </h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1">Infrastructure Official Registry</p>
              </div>
            </div>

            <Card className="border-none shadow-2xl rounded-[3.5rem] bg-white overflow-hidden">
              <CardContent className="p-12 space-y-12">
                 <div className="flex justify-center">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-full max-w-2xl aspect-video rounded-[2.5rem] overflow-hidden bg-secondary/30 border-2 border-dashed border-secondary/50 hover:border-primary transition-all cursor-pointer group shadow-inner"
                    >
                      {(formData.image_url && formData.image_url !== 'null') ? (
                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-secondary/50 to-secondary/80">
                          <img src="https://images.unsplash.com/photo-1540747913346-19e3adcc174d?auto=format&fit=crop&q=80&w=800" className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale" alt="Fallback" />
                          <div className="relative z-10 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-white shadow-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                              <Camera className="w-8 h-8 text-primary" />
                            </div>
                            <p className="text-lg font-black text-primary uppercase tracking-wider">Image du Stade</p>
                            <p className="text-xs text-primary/60 mt-1 font-bold">Sélectionner une photo HD</p>
                          </div>
                        </div>
                      )}

                      {uploading && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20">
                          <Loader2 className="w-10 h-10 text-white animate-spin" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-primary/20 transition-all pointer-events-none" />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>

                    <div className="flex items-center gap-2 mt-3 justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setMediaPickerOpen(true)}
                        className="gap-2 rounded-xl text-xs font-bold border-slate-200 hover:border-primary/40 bg-slate-50 hover:bg-primary/10 text-slate-800 h-9 shadow-sm"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-primary" />
                        Médiathèque
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2 rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-100 text-slate-700 h-9 shadow-sm"
                      >
                        <Camera className="w-3.5 h-3.5 text-slate-500" />
                        Uploader un fichier
                      </Button>
                      {formData.image_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => field('image_url', '')}
                          className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-9 px-2"
                          title="Supprimer la photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                 </div>

                 <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Appellation du Complexe</label>
                      <Input
                        value={formData.name}
                        onChange={e => field('name', e.target.value)}
                        placeholder="ex. Grand Stade de Casablanca"
                        className="h-16 px-8 rounded-2xl bg-secondary/30 border-none font-bold text-lg focus:ring-2 ring-primary/20"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Ville de Résidence</label>
                         <Input
                           value={formData.city}
                           onChange={e => field('city', e.target.value)}
                           placeholder="Casablanca"
                           className="h-16 px-8 rounded-2xl bg-secondary/30 border-none font-bold text-lg focus:ring-2 ring-primary/20"
                         />
                       </div>

                       <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Capacité (Spectateurs)</label>
                         <Input
                           type="number"
                           value={formData.capacity}
                           onChange={e => field('capacity', e.target.value)}
                           placeholder="45 000"
                           className="h-16 px-8 rounded-2xl bg-secondary/30 border-none font-bold text-lg focus:ring-2 ring-primary/20"
                         />
                       </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">URL Directe Image (Optionnel)</label>
                        <Input
                          value={formData.image_url}
                          onChange={e => field('image_url', e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="h-16 px-8 rounded-2xl bg-secondary/30 border-none font-bold focus:ring-2 ring-primary/20"
                        />
                    </div>
                 </div>

                 <div className="flex gap-4 pt-8 border-t border-secondary/50">
                   <Button
                     variant="ghost"
                     onClick={closeForm}
                     className="flex-1 h-16 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-secondary transition-all"
                   >
                     Discard
                   </Button>
                   <Button
                     onClick={handleSave}
                     disabled={!isValid || saving || uploading}
                     className="flex-1 h-16 rounded-2xl bg-slate-950 hover:bg-black text-white font-black uppercase tracking-widest text-xs gap-3 shadow-xl transition-all active:scale-95"
                   >
                     {saving ? (
                       <><Loader2 className="w-5 h-5 animate-spin" /> Transfert...</>
                     ) : (
                       <><CheckCircle2 className="w-5 h-5" /> {editingId ? 'Sauvegarder les modifications' : 'Enregistrer l\'Infrastructure'}</>
                     )}
                   </Button>
                 </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sélecteur de Médias Centralisé */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => field('image_url', url)}
        title="Affecter une image depuis la Médiathèque"
      />
    </div>
  );
};

export default StadiumManagement;
