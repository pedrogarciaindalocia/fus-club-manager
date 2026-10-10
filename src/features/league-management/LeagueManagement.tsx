import React, { useState, useMemo } from 'react';
import { useCompetitions } from '../../hooks/useCompetitions';
import { storageService } from '../../services/storageService';
import { useClubData } from '../../hooks/useClubData';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  Trophy, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit2, 
  X,
  Globe,
  Camera,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LayoutGrid,
  List as ListIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { League, AgeCategory } from '../../types';
import { PLAYER_CATEGORIES } from '../../constants';
import { Skeleton } from '../../components/ui/skeleton';
import LeagueOverviewPanel from './LeagueOverviewPanel';
import { MediaPickerModal } from '../media-management/components/MediaPickerModal';

const LeagueManagement: React.FC = () => {
  const { leagues, isLoading: leaguesLoading, addLeague, updateLeague, deleteLeague } = useCompetitions();
  const { mainClub, isLoading: clubLoading } = useClubData();
  const isLoading = leaguesLoading || clubLoading;

  const [showForm, setShowForm] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Settings sync
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>(mainClub?.preferred_view_mode || 'list');
  const [pageSize, setPageSize] = useState(mainClub?.pagination_limit || 10);
  const [currentPage, setCurrentPage] = useState(1);

  React.useEffect(() => {
    if (mainClub?.preferred_view_mode) setDisplayMode(mainClub.preferred_view_mode);
    if (mainClub?.pagination_limit) setPageSize(mainClub.pagination_limit);
  }, [mainClub]);

  // Form State
  const [formData, setFormData] = useState<Partial<League>>({
    name: '',
    logo_url: '',
    season: '2024/25',
    category: null
  });

  const handleOpenAdd = () => {
    setEditingLeague(null);
    setFormData({ name: '', logo_url: '', season: '2024/25', category: null });
    setShowForm(true);
  };

  const handleOpenEdit = (l: League) => {
    setEditingLeague(l);
    setFormData({ ...l });
    setShowForm(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const publicUrl = await storageService.uploadFile(file, 'leagues');
      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingLeague) {
        await updateLeague({ 
          id: editingLeague.id, 
          data: {
            name: formData.name, 
            logo_url: formData.logo_url, 
            season: formData.season,
            category: formData.category
          }
        });
      } else {
        await addLeague({
          name: formData.name!,
          logo_url: formData.logo_url!,
          season: formData.season!,
          category: formData.category || null
        });
      }
      setShowForm(false);
    } catch (err) {
      console.error("Failed to save league:", err);
    }
  };

  const filteredLeagues = useMemo(() => {
    return leagues.filter(l => 
      l.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [leagues, searchQuery]);

  const paginatedLeagues = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeagues.slice(start, start + pageSize);
  }, [filteredLeagues, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredLeagues.length / pageSize);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <Skeleton className="h-40 w-full rounded-[2.5rem]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-[2rem]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <AnimatePresence mode="wait">
        {!showForm ? (
          <motion.div 
            key="list" 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-8"
          >
            {/* Premium Header */}
            <div className="relative bg-gradient-to-r from-slate-900 to-amber-900 rounded-[2rem] sm:rounded-[3rem] px-6 sm:px-10 py-8 sm:py-12 text-white overflow-hidden shadow-2xl border-b-[8px] border-amber-500/20">
              <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '20px 20px' }} />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
                <div className="flex items-center gap-4 sm:gap-8">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-[1.8rem] sm:rounded-[2.5rem] bg-white/10 flex items-center justify-center text-amber-400 shadow-2xl border border-white/20 ring-4 sm:ring-8 ring-white/5 shrink-0">
                    <Trophy className="w-7 h-7 sm:w-10 sm:h-10" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase italic leading-tight">Competition Hub</h1>
                    <p className="text-white/40 text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] mt-1 sm:mt-3">Elite League & Tournament Management</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
                        <Button 
                            variant={displayMode === 'list' ? 'default' : 'ghost'} 
                            size="icon" 
                            onClick={() => setDisplayMode('list')}
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${displayMode === 'list' ? 'bg-amber-500 text-slate-950' : 'text-white hover:bg-white/10'}`}
                        >
                            <ListIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                        <Button 
                            variant={displayMode === 'grid' ? 'default' : 'ghost'} 
                            size="icon" 
                            onClick={() => setDisplayMode('grid')}
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${displayMode === 'grid' ? 'bg-amber-500 text-slate-950' : 'text-white hover:bg-white/10'}`}
                        >
                            <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                    </div>
                    <Button onClick={handleOpenAdd} className="bg-amber-500 hover:bg-amber-400 text-slate-950 h-12 sm:h-16 px-6 sm:px-10 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 sm:gap-4 shadow-2xl transition-all hover:scale-105 active:scale-95 group">
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-500" /> Create
                    </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-[1.8rem] sm:rounded-[2.5rem] bg-white border shadow-sm">
                <div className="relative flex-1 w-full sm:w-auto">
                    <Search className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground opacity-30" />
                    <Input 
                        placeholder="Rechercher une compétition..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-12 sm:h-14 pl-12 sm:pl-16 pr-6 sm:pr-8 rounded-[1.2rem] sm:rounded-[1.5rem] bg-secondary/20 border-none font-black text-xs sm:text-sm transition-all focus:bg-white focus:ring-4 ring-primary/5"
                    />
                </div>
                <Badge variant="secondary" className="h-10 sm:h-14 px-4 sm:px-8 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] bg-secondary/50 rounded-[1rem] sm:rounded-[1.5rem] border-none shadow-inner self-end sm:self-auto">
                    Total: {leagues.length}
                </Badge>
            </div>

            {/* Content Area */}
            {selectedLeague ? (
              <LeagueOverviewPanel league={selectedLeague} onBack={() => setSelectedLeague(null)} />
            ) : displayMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <AnimatePresence mode="popLayout">
                  {paginatedLeagues.map(league => (
                    <motion.div key={league.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
                      <Card className="group border shadow-xl hover:shadow-primary/5 transition-all duration-700 bg-white rounded-[3.5rem] overflow-hidden">
                        <CardContent className="p-10">
                          <div className="flex flex-col md:flex-row items-center gap-10">
                             <div className="w-28 h-28 rounded-[2.5rem] bg-secondary/20 flex items-center justify-center p-6 border-2 border-white shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
                                  <img src={(league.logo_url && league.logo_url !== 'null') ? league.logo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(league.name)}&background=020617&color=fff&size=200`} alt="Logo" className="w-full h-full object-contain" />
                             </div>

                             <div className="flex-1 space-y-6 text-center md:text-left">
                                <div>
                                   <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                      <h3 className="text-3xl font-black uppercase tracking-tighter italic leading-none">{league.name}</h3>
                                      <Badge className="bg-primary/5 text-primary border-primary/20 font-black uppercase italic text-[10px] px-5 py-1.5 rounded-xl">Season {league.season}</Badge>
                                      {league.category && (
                                        <Badge variant="outline" className="text-muted-foreground border-secondary font-black uppercase text-[10px] px-4 py-1.5 rounded-xl">{league.category}</Badge>
                                      )}
                                   </div>
                                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-3 flex items-center justify-center md:justify-start gap-2 opacity-50">
                                      <Globe className="w-3.5 h-3.5" /> COMPETITION REGISTRY • {league.id.substr(0, 8)}
                                   </p>
                                </div>

                                <div className="flex items-center justify-center md:justify-start gap-3">
                                   <Button onClick={() => setSelectedLeague(league)} className="h-12 px-6 rounded-2xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white transition-all font-black uppercase tracking-widest text-[10px] gap-3 border border-red-100">
                                      <Eye className="w-4 h-4" /> Détails
                                   </Button>
                                   <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(league)} className="w-12 h-12 rounded-2xl bg-secondary/50 hover:bg-secondary transition-all">
                                      <Edit2 className="w-4 h-4" />
                                   </Button>
                                   <Button variant="ghost" size="icon" onClick={() => deleteLeague(league.id)} className="w-12 h-12 rounded-2xl bg-secondary/50 hover:bg-destructive hover:text-white transition-all">
                                      <Trash2 className="w-5 h-5" />
                                   </Button>
                                </div>
                             </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white border rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px]">
                    <thead className="bg-secondary/10 border-b">
                      <tr>
                        <th className="text-left px-6 sm:px-10 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Compétition</th>
                        <th className="text-left py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Saison</th>
                        <th className="text-left py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">ID Système</th>
                        <th className="text-right px-6 sm:px-10 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary/30">
                      {paginatedLeagues.map(l => (
                        <tr key={l.id} className="group hover:bg-secondary/5 transition-colors">
                          <td className="px-6 sm:px-10 py-4">
                             <div className="flex items-center gap-4 sm:gap-5">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-secondary/30 overflow-hidden border-2 border-white shadow-md">
                                   <img src={(l.logo_url && l.logo_url !== 'null') ? l.logo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(l.name)}&background=random&color=fff&size=200`} className="w-full h-full object-contain p-2" />
                                </div>
                                <span className="font-black text-sm sm:text-base uppercase italic tracking-tighter">{l.name}</span>
                             </div>
                          </td>
                          <td className="py-4">
                             <div className="flex items-center gap-2">
                               <span className="font-black italic text-primary/70">{l.season}</span>
                               {l.category && <Badge variant="outline" className="text-[9px] font-black">{l.category}</Badge>}
                             </div>
                          </td>
                          <td className="py-4">
                             <code className="text-[10px] font-black opacity-30 uppercase tracking-widest">{l.id.substr(0, 12)}</code>
                          </td>
                          <td className="px-6 sm:px-10 py-4 text-right">
                             <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={() => setSelectedLeague(l)} className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all">
                                   <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(l)} className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-white hover:shadow-md transition-all">
                                   <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteLeague(l.id)} className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-red-50 transition-all">
                                   <Trash2 className="w-4 h-4" />
                                </Button>
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
                    Affichage {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredLeagues.length)} sur {filteredLeagues.length}
                 </div>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="w-10 h-10 rounded-2xl bg-white border-secondary"><ChevronLeft className="w-4 h-4" /></Button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <Button key={i} variant={currentPage === i + 1 ? 'default' : 'ghost'} size="sm" onClick={() => setCurrentPage(i + 1)} className={`w-10 h-10 rounded-2xl font-black text-[11px] ${currentPage === i + 1 ? 'shadow-lg shadow-primary/20 bg-primary' : 'bg-white border-secondary border'}`}>{i + 1}</Button>
                    ))}
                    <Button variant="outline" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="w-10 h-10 rounded-2xl bg-white border-secondary"><ChevronRight className="w-4 h-4" /></Button>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50">Par page:</span>
                    <select value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value))} className="h-10 w-20 rounded-2xl bg-white border border-secondary font-black text-xs px-2 appearance-none cursor-pointer text-center">
                       {[5, 10, 15, 20, 25, 50].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                 </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="form"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-8 mb-12">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowForm(false)} 
                className="w-16 h-16 rounded-[2rem] bg-white border-2 shadow-xl hover:bg-secondary transition-all group"
              >
                <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
              </Button>
              <div>
                <h3 className="text-5xl font-black tracking-tighter uppercase italic">{editingLeague ? 'Edit League' : 'Register League'}</h3>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] mt-2">Official Competition Registry Setup</p>
              </div>
            </div>

            <Card className="border-none shadow-2xl rounded-[4rem] overflow-hidden bg-white relative">
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-500 to-amber-900" />
              <CardContent className="p-16 space-y-16">
                 <div className="flex justify-center">
                    <div className="relative group">
                       <div className="w-48 h-48 rounded-[4rem] bg-secondary/30 border-4 border-dashed border-secondary flex items-center justify-center overflow-hidden group-hover:border-primary/50 transition-all shadow-2xl shadow-inner">
                          {uploading ? (
                             <Loader2 className="w-12 h-12 text-primary animate-spin" />
                          ) : (
                             <img 
                               src={(formData.logo_url && formData.logo_url !== 'null') ? formData.logo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'L')}&background=020617&color=fff&size=200`} 
                               alt="Logo" 
                               className="w-full h-full object-contain p-10 group-hover:scale-110 transition-transform duration-700" 
                             />
                          )}
                       </div>
                       <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" id="logo-input" className="hidden" onChange={handleLogoUpload} />
                       <label htmlFor="logo-input" className="absolute -bottom-4 -right-4 w-16 h-16 rounded-[2rem] bg-amber-500 text-slate-950 flex items-center justify-center cursor-pointer shadow-2xl hover:scale-110 active:scale-95 transition-all ring-8 ring-white" title="Uploader une image">
                          <Camera className="w-7 h-7" />
                       </label>
                    </div>
                 </div>

                 <div className="flex items-center justify-center gap-3">
                   <Button
                     type="button"
                     variant="outline"
                     onClick={() => setMediaPickerOpen(true)}
                     className="gap-2 rounded-2xl text-xs font-bold border-slate-200 hover:border-amber-500/50 bg-slate-50 hover:bg-amber-500/10 text-slate-800 h-10 px-5 shadow-sm"
                   >
                     <ImageIcon className="w-4 h-4 text-amber-600" />
                     Choisir dans la Médiathèque
                   </Button>
                   {formData.logo_url && (
                     <Button
                       type="button"
                       variant="ghost"
                       onClick={() => setFormData({ ...formData, logo_url: '' })}
                       className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-10 px-3 rounded-2xl"
                       title="Supprimer le logo"
                     >
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   )}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-4">
                     <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Competition Label</label>
                     <Input 
                       value={formData.name} 
                       onChange={e => setFormData({...formData, name: e.target.value})} 
                       placeholder="e.g. Botola Pro" 
                       className="h-18 px-10 rounded-3xl bg-secondary/20 border-none font-black text-xl focus:ring-4 ring-primary/10 transition-all placeholder:opacity-20" 
                     />
                   </div>
                   
                   <div className="space-y-4">
                     <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Financial Season</label>
                     <select 
                       value={formData.season} 
                       onChange={e => setFormData({...formData, season: e.target.value})} 
                       className="w-full h-18 px-10 rounded-3xl bg-secondary/20 border-none font-black text-xl focus:ring-4 ring-primary/10 transition-all appearance-none cursor-pointer"
                     >
                       {['2023/24', '2024/25', '2025/26', '2026/27', '2027/28'].map(s => (
                         <option key={s} value={s}>{s}</option>
                       ))}
                     </select>
                   </div>

                   <div className="space-y-4">
                     <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Catégorie Associée</label>
                     <select 
                       value={formData.category || ''} 
                       onChange={e => setFormData({...formData, category: e.target.value ? e.target.value as AgeCategory : null})} 
                       className="w-full h-18 px-10 rounded-3xl bg-secondary/20 border-none font-black text-xl focus:ring-4 ring-primary/10 transition-all appearance-none cursor-pointer"
                     >
                       <option value="">-- Aucune (Toutes) --</option>
                       {PLAYER_CATEGORIES.map(c => (
                         <option key={c} value={c}>{c}</option>
                       ))}
                     </select>
                   </div>

                   <div className="md:col-span-1 space-y-4">
                     <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Direct Logo Resource (CDN)</label>
                     <Input 
                       value={formData.logo_url} 
                       onChange={e => setFormData({...formData, logo_url: e.target.value})} 
                       placeholder="https://storage.fuscc.com/leagues/logo.png" 
                       className="h-18 px-10 rounded-3xl bg-secondary/20 border-none font-bold focus:ring-4 ring-primary/10 transition-all" 
                     />
                   </div>
                 </div>

                 <div className="flex gap-6 pt-12 border-t border-secondary/50">
                   <Button 
                     variant="ghost" 
                     className="flex-1 h-18 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-secondary transition-all" 
                     onClick={() => setShowForm(false)}
                   >
                     Discard Changes
                   </Button>
                   <Button 
                     disabled={uploading || !formData.name} 
                     className="flex-1 h-18 rounded-[2rem] bg-slate-950 hover:bg-black shadow-2xl font-black uppercase tracking-widest text-xs gap-4 transition-all hover:scale-105 active:scale-95 group" 
                     onClick={handleSave}
                   >
                     {editingLeague ? 'Synch Database' : 'Install Competition'} 
                     <CheckCircle2 className="w-5 h-5 text-amber-500 group-hover:scale-125 transition-transform" />
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
        onSelect={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
        title="Affecter un logo depuis la Médiathèque"
      />
    </div>
  );
};

export default LeagueManagement;
