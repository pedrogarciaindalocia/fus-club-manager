import React, { useState } from 'react';
import { useClubData } from '../../hooks/useClubData';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { 
  Plus, 
  Search, 
  MapPin, 
  Globe, 
  Trash2, 
  Edit2, 
  Camera, 
  ShieldAlert,
  X,
  LayoutGrid,
  List as ListIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  Sparkles,
  ImageIcon
} from 'lucide-react';
import type { Club } from '../../types';
import { FusLogoLoader } from '../../components/ui/FusLogoLoader';
import { storageService } from '../../services/storageService';
import { opponentPlayerService } from '../../services/opponentPlayerService';
import { build22FakeOpponentPlayers } from '../../utils/generateFakeOpponentPlayers';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMemo } from 'react';
import { OpponentSquadModal } from './components/OpponentSquadModal';
import { GEOGRAPHY_DATA } from '../../constants/geography';
import { MediaPickerModal } from '../media-management/components/MediaPickerModal';
import { usePermissions } from '../../context/PermissionsContext';

const OpponentClubs: React.FC = () => {
  const { opponentClubs, mainClub, isLoading: clubsLoading, addOpponent, updateOpponent, deleteOpponent } = useClubData();
  const { can, hasSubModuleAccess } = usePermissions();
  const canManageClubs = can('manage_standings') || hasSubModuleAccess('matches', 'manage_standings') || can('create_opponent') || hasSubModuleAccess('opponents', 'create') || hasSubModuleAccess('opponents', 'update');
  const isLoading = clubsLoading;
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [selectedSquadClub, setSelectedSquadClub] = useState<Club | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [autoGenerate22, setAutoGenerate22] = useState(true);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Settings sync
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>(mainClub?.preferred_view_mode || 'list');
  const [pageSize, setPageSize] = useState(mainClub?.pagination_limit || 10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContinent, setSelectedContinent] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [continentFilter, setContinentFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');

  React.useEffect(() => {
    if (mainClub?.preferred_view_mode) setDisplayMode(mainClub.preferred_view_mode);
    if (mainClub?.pagination_limit) setPageSize(mainClub.pagination_limit);
  }, [mainClub]);

  const filteredClubs = useMemo(() => {
     return opponentClubs.filter(club => {
       const matchesSearch = club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (club.city || '').toLowerCase().includes(searchQuery.toLowerCase());
       if (!matchesSearch) return false;

       if (continentFilter) {
          // Priority to database field, fallback to geometry lookup
          const clubContinent = club.continent;
          if (clubContinent) {
             if (clubContinent !== continentFilter) return false;
          } else {
             const countriesInContinent = Object.keys(GEOGRAPHY_DATA[continentFilter] || {});
             if (!countriesInContinent.includes(club.country || '')) return false;
          }
       }

       if (countryFilter) {
          if (club.country !== countryFilter) return false;
       }

       return true;
     });
  }, [opponentClubs, searchQuery, continentFilter, countryFilter]);

  const paginatedClubs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClubs.slice(start, start + pageSize);
  }, [filteredClubs, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredClubs.length / pageSize);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  const [formData, setFormData] = useState<Partial<Club>>({
    name: '',
    city: '',
    country: '',
    continent: '',
    logo_url: ''
  });

  const handleOpenForm = (club?: Club) => {
    if (club) {
      setEditingClub(club);
      setFormData(club);
      
      if (club.continent) {
        setSelectedContinent(club.continent);
        setSelectedCountry(club.country || '');
      } else {
        // Attempt to reverse engineer
        for (const [cont, countries] of Object.entries(GEOGRAPHY_DATA)) {
          if (Object.keys(countries).includes(club.country || '')) {
            setSelectedContinent(cont);
            setSelectedCountry(club.country || '');
            break;
          }
        }
      }
    } else {
      setEditingClub(null);
      setFormData({ name: '', city: '', country: '', continent: '', logo_url: '' });
      setSelectedContinent('');
      setSelectedCountry('');
      setAutoGenerate22(true);
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    // Prevent adding a club with the same name as the main club
    if (formData.name?.toLowerCase().trim() === mainClub?.name?.toLowerCase().trim()) {
      toast.error('Ce club est identique au club principal — impossible de l\'ajouter comme adversaire.');
      return;
    }
    if (editingClub) {
      await updateOpponent({ id: editingClub.id, data: formData });
    } else {
      const createdClub = await addOpponent(formData as Omit<Club, 'id'>);
      if (autoGenerate22 && createdClub?.id) {
        try {
          const fakeSquad = build22FakeOpponentPlayers(createdClub.id, 'SENIOR');
          await opponentPlayerService.addManyOpponentPlayers(fakeSquad);
          toast.success(`Club créé et 22 joueurs fictifs générés avec succès !`);
        } catch (e: any) {
          console.error(e);
        }
      }
    }
    setShowForm(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const publicUrl = await storageService.uploadFile(file, 'clubs');
        setFormData({ ...formData, logo_url: publicUrl });
      } catch (error) {
        console.error('Failed to upload logo:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };


  if (isLoading) {
    return <FusLogoLoader fullPage size="lg" label="Chargement des clubs adversaires…" />;
  }

  return (
    <div className="space-y-8 pb-20 overflow-visible">
        {!showForm ? (
          <div
            key="list"
            className="space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground uppercase italic leading-none">Opponent Database</h2>
                <p className="text-muted-foreground text-sm font-medium mt-1">Manage rival clubs and competition adversaries</p>
              </div>
              <div className="flex items-center gap-4">
                  {/* View Toggle */}
                  <div className="flex bg-secondary/30 p-1 rounded-2xl border ml-auto">
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
                  {canManageClubs && (
                    <Button onClick={() => handleOpenForm()} className="gap-3 shadow-xl shadow-primary/20 h-12 px-6 font-black uppercase tracking-widest text-[10px] bg-primary transition-all active:scale-95">
                      <Plus className="w-4 h-4" />
                      Add Opponent
                    </Button>
                  )}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-4 p-4 rounded-[2rem] bg-white border shadow-sm">
              <div className="relative flex-1 w-full lg:w-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher par nom ou ville..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-secondary/30 border-transparent focus:bg-white transition-all rounded-xl font-medium"
                />
              </div>
              
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto">
                <select 
                  value={continentFilter}
                  onChange={(e) => {
                    setContinentFilter(e.target.value);
                    setCountryFilter('');
                  }}
                  className="h-12 px-4 rounded-xl bg-secondary/30 border-transparent font-black text-[10px] uppercase tracking-widest outline-none focus:ring-2 ring-primary/20 appearance-none cursor-pointer flex-1 sm:flex-initial min-w-[130px]"
                >
                  <option value="">Tous les Continents</option>
                  {Object.keys(GEOGRAPHY_DATA).map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select 
                  disabled={!continentFilter}
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="h-12 px-4 rounded-xl bg-secondary/30 border-transparent font-black text-[10px] uppercase tracking-widest outline-none focus:ring-2 ring-primary/20 appearance-none cursor-pointer flex-1 sm:flex-initial min-w-[130px] disabled:opacity-30"
                >
                  <option value="">Tous les Pays</option>
                  {continentFilter && Object.keys(GEOGRAPHY_DATA[continentFilter]).map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <Badge variant="secondary" className="h-12 px-4 sm:px-6 text-[10px] font-black uppercase tracking-widest bg-secondary/50 rounded-xl whitespace-nowrap">
                  Clubs: {filteredClubs.length}
                </Badge>
              </div>
            </div>

            {/* Content Area */}
            {displayMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedClubs.map((club) => (
                    <div key={club.id}>
                      <Card className="group relative overflow-hidden border-secondary hover:border-primary/20 hover:shadow-2xl transition-all duration-500 bg-white rounded-[2rem]">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-secondary/30 flex items-center justify-center overflow-hidden border border-secondary shadow-inner relative group-hover:scale-105 transition-transform duration-500">
                              <img 
                                src={(club.logo_url && club.logo_url !== 'null') ? club.logo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(club.name)}&background=020617&color=fff&size=256`} 
                                alt={club.name} 
                                className="w-full h-full object-contain p-2"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(club.name)}&background=020617&color=fff&size=256`;
                                }}
                              />
                            </div>
                            {canManageClubs && (
                              <div className="flex gap-1.5">
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all" onClick={() => handleOpenForm(club)}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-red-50 transition-all" onClick={() => deleteOpponent(club.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1 mb-6">
                            <div className="flex items-center gap-2">
                               <h3 className="font-black text-lg tracking-tight uppercase italic">{club.name}</h3>
                               {club.short_name && (
                                 <Badge variant="outline" className="text-[10px] font-black border-secondary text-muted-foreground uppercase">{club.short_name}</Badge>
                               )}
                            </div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-primary" />
                              {club.city}, {club.country}
                            </p>
                          </div>

                          <div className="pt-4 border-t border-secondary/50 flex items-center justify-between">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setSelectedSquadClub(club)}
                              className="h-10 px-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary hover:text-white font-black text-[10px] uppercase gap-2 transition-all group/btn"
                            >
                              <Users className="w-4 h-4 text-primary group-hover/btn:text-white transition-colors" />
                              Effectif
                            </Button>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">
                              Rabat & Proche
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="bg-white border rounded-[2rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[580px]">
                    <thead className="bg-secondary/10 border-b">
                      <tr>
                        <th className="text-left px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Club</th>
                        <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Localisation</th>
                        <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Secteur</th>
                        <th className="text-right px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary/30">
                      {paginatedClubs.map(club => (
                        <tr key={club.id} className="group hover:bg-secondary/5 transition-colors">
                          <td className="px-8 py-3">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-secondary/30 overflow-hidden border-2 border-white shadow-md">
                                   <img src={(club.logo_url && club.logo_url !== 'null') ? club.logo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(club.name)}&background=random&color=fff&size=200`} className="w-full h-full object-contain p-1" />
                                </div>
                                <span className="font-black text-sm uppercase italic tracking-tighter">{club.name}</span>
                             </div>
                          </td>
                          <td className="py-3 text-[10px] font-black uppercase text-muted-foreground">{club.city}, {club.country}</td>
                          <td className="py-3">
                             <Badge variant="outline" className="text-[9px] font-black italic border-primary/20 text-primary uppercase">Opposant</Badge>
                          </td>
                          <td className="px-8 py-3 text-right">
                             <div className="flex items-center justify-end gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                               <Button 
                                 variant="outline" 
                                 size="sm" 
                                 onClick={() => setSelectedSquadClub(club)}
                                 className="h-9 px-3 rounded-xl border-primary/20 bg-primary/5 hover:bg-primary hover:text-white font-black text-[10px] uppercase gap-1.5 transition-all"
                               >
                                 <Users className="w-3.5 h-3.5" />
                                 Effectif
                               </Button>
                                {canManageClubs && (
                                  <>
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenForm(club)} className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-md transition-all">
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteOpponent(club.id)} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-red-50 transition-all">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
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
                    Affichage {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredClubs.length)} sur {filteredClubs.length}
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
          </div>
        ) : (
          <div
            key="form"
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-6 mb-10">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowForm(false)} 
                className="w-14 h-14 rounded-2xl bg-white border shadow-sm hover:bg-secondary transition-all"
              >
                <X className="w-6 h-6 rotate-90" />
              </Button>
              <div>
                <h3 className="text-4xl font-black tracking-tight uppercase italic">{editingClub ? 'Edit Opponent' : 'Add New Opponent'}</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1">Official Opponent Registry</p>
              </div>
            </div>

            <Card className="border-none shadow-2xl rounded-[3.5rem] bg-white overflow-hidden">
              <CardContent className="p-12 space-y-12">
                <div className="flex justify-center">
                   <div className="relative group">
                      <div className="w-32 h-32 rounded-[2rem] bg-secondary/30 flex items-center justify-center overflow-hidden border-2 border-dashed border-secondary group-hover:border-primary/50 transition-all shadow-inner">
                          <img 
                            src={(formData.logo_url && formData.logo_url !== 'null') ? formData.logo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'Opponent')}&background=020617&color=fff&size=200`} 
                            alt="Preview" 
                            className={cn("w-full h-full object-contain p-4", isUploading && "opacity-30")} 
                          />
                          {isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                              <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                          )}
                      </div>

                      <Input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif" 
                        id="form-logo" 
                        className="hidden" 
                        onChange={handleLogoUpload}
                      />
                      <label 
                        htmlFor="form-logo"
                        className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center cursor-pointer shadow-xl hover:scale-110 active:scale-95 transition-all"
                        title="Téléverser un fichier"
                      >
                        <Camera className="w-5 h-5" />
                      </label>
                   </div>
                   <div className="flex items-center gap-2 mt-4">
                     <Button
                       type="button"
                       variant="outline"
                       onClick={() => setMediaPickerOpen(true)}
                       className="gap-2 rounded-xl text-xs font-bold border-slate-200 hover:border-primary/40 bg-slate-50 hover:bg-primary/10 text-slate-800 h-9 shadow-sm"
                     >
                       <ImageIcon className="w-3.5 h-3.5 text-primary" />
                       Médiathèque
                     </Button>
                     {formData.logo_url && (
                       <Button
                         type="button"
                         variant="ghost"
                         onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
                         className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-9 px-2"
                         title="Supprimer le logo"
                       >
                         <Trash2 className="w-3.5 h-3.5" />
                       </Button>
                     )}
                   </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Club Legal Name</label>
                    <Input 
                      placeholder="e.g. Real Madrid CF"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="h-16 px-8 rounded-2xl bg-secondary/30 border-none font-bold text-lg focus:ring-2 ring-primary/20"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Continent</label>
                      <select 
                        className="w-full h-16 px-8 rounded-2xl bg-secondary/30 border-none font-bold text-lg focus:ring-2 ring-primary/20 appearance-none outline-none cursor-pointer"
                        value={selectedContinent}
                        onChange={(e) => {
                          const cont = e.target.value;
                          setSelectedContinent(cont);
                          setSelectedCountry('');
                          setFormData({...formData, continent: cont, country: '', city: ''});
                        }}
                      >
                        <option value="">Sélectionner...</option>
                        {Object.keys(GEOGRAPHY_DATA).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Pays</label>
                      <select 
                        disabled={!selectedContinent}
                        className="w-full h-16 px-8 rounded-2xl bg-secondary/30 border-none font-bold text-lg focus:ring-2 ring-primary/20 appearance-none outline-none cursor-pointer disabled:opacity-50"
                        value={selectedCountry}
                        onChange={(e) => {
                          setSelectedCountry(e.target.value);
                          setFormData({...formData, country: e.target.value, city: ''});
                        }}
                      >
                        <option value="">Sélectionner...</option>
                        {selectedContinent && Object.keys(GEOGRAPHY_DATA[selectedContinent]).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Ville</label>
                      <select 
                        disabled={!selectedCountry}
                        className="w-full h-16 px-8 rounded-2xl bg-secondary/30 border-none font-bold text-lg focus:ring-2 ring-primary/20 appearance-none outline-none cursor-pointer disabled:opacity-50"
                        value={formData.city || ''}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                      >
                        <option value="">Sélectionner...</option>
                        {selectedCountry && GEOGRAPHY_DATA[selectedContinent][selectedCountry].map(v => <option key={v} value={v}>{v}</option>)}
                        <option value="Autre">Autre...</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Direct Logo URL (Alternative)</label>
                    <Input 
                      placeholder="https://storage.fuscc.com/clubs/logo.png"
                      value={formData.logo_url}
                      onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                      className="h-16 px-8 rounded-2xl bg-secondary/30 border-none font-bold focus:ring-2 ring-primary/20"
                    />
                  </div>
                  {!editingClub && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-4 my-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase text-emerald-950 dark:text-emerald-200">
                            Générer un effectif de 22 joueurs fictifs
                          </p>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                            Génère immédiatement 22 joueurs avec leurs maillots (#1 à #22), postes, tailles et caractéristiques modulables.
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoGenerate22}
                        onChange={(e) => setAutoGenerate22(e.target.checked)}
                        className="w-5 h-5 accent-emerald-600 rounded cursor-pointer shrink-0"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-6 border-t border-secondary/50">
                  <Button 
                    variant="ghost" 
                    className="flex-1 h-16 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-secondary" 
                    onClick={() => setShowForm(false)}
                  >
                    Discard
                  </Button>
                  <Button 
                    disabled={isUploading || !formData.name}
                    className="flex-1 h-16 rounded-2xl bg-primary hover:bg-slate-900 shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs gap-3 transition-all active:scale-95" 
                    onClick={handleSave}
                  >
                    {editingClub ? 'Update Club Data' : 'Add to Database'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      {!isLoading && filteredClubs.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
           <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center text-muted-foreground">
              <ShieldAlert className="w-8 h-8 opacity-20" />
           </div>
           <p className="text-muted-foreground font-medium italic uppercase tracking-widest text-[10px]">No opponents match your search criteria.</p>
        </div>
      )}

      {selectedSquadClub && (
        <OpponentSquadModal
          isOpen={!!selectedSquadClub}
          onClose={() => setSelectedSquadClub(null)}
          club={selectedSquadClub}
        />
      )}

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

export default OpponentClubs;

