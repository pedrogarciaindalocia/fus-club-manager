import React, { useState, useMemo, useEffect } from 'react';
import { useStaff } from '../../hooks/useStaff';
import { useTeams } from '../../hooks/useTeams';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { 
  UserPlus, 
  Search, 
  Mail, 
  Phone, 
  Trash2, 
  Edit2, 
  X,
  Camera,
  Briefcase,
  User as UserIcon,
  Filter,
  Sparkles,
  ShieldAlert,
  LayoutGrid,
  List as ListIcon,
  ChevronLeft,
  ChevronRight,
  ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StaffMember } from '../types';
import { storageService } from '../../services/storageService';
import ImageCropperModal from '../../components/ImageCropperModal';
import { MediaPickerModal } from '../media-management/components/MediaPickerModal';
import { Skeleton } from '../../components/ui/skeleton';

import { useClubData } from '../../hooks/useClubData';

const StaffManagement: React.FC = () => {
  const { staff, isLoading: staffLoading, addStaff, updateStaff, deleteStaff } = useStaff();
  const { teams } = useTeams();
  const { mainClub, isLoading: clubLoading } = useClubData();
  const isLoading = staffLoading || clubLoading;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Settings sync
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>(mainClub?.preferred_view_mode || 'list');
  const [pageSize, setPageSize] = useState(mainClub?.pagination_limit || 10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (mainClub?.preferred_view_mode) setDisplayMode(mainClub.preferred_view_mode);
    if (mainClub?.pagination_limit) setPageSize(mainClub.pagination_limit);
  }, [mainClub]);


  const STAFF_ROLES = [
    { value: 'technical_director', label: 'Directeur Technique' },
    { value: 'manager', label: 'Directeur Sportif' },
    { value: 'coach', label: 'Entraîneur Principal' },
    { value: 'assistant_coach', label: 'Entraîneur Adjoint' },
    { value: 'goalkeeper_coach', label: 'Entraîneur des Gardiens' },
    { value: 'fitness_coach', label: 'Préparateur Physique' },
    { value: 'match_operator', label: 'Analyste Vidéo / Data' },
    { value: 'doctor', label: 'Médecin' },
    { value: 'nurse', label: 'Infirmier' },
    { value: 'physio', label: 'Kinésithérapeute' },
    { value: 'scout', label: 'Scout' },
    { value: 'medical', label: 'Staff Médical' }
  ];

  const [formData, setFormData] = useState<Partial<StaffMember>>({
    full_name: '',
    role: 'coach',
    specialty: '',
    email: '',
    phone: '',
    photo_url: '',
    team_ids: [],
    parent_coach_id: undefined
  });

  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const matchesSearch = s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           s.role?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || s.role?.toUpperCase() === roleFilter.toUpperCase();
      return matchesSearch && matchesRole;
    });
  }, [staff, searchQuery, roleFilter]);

  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStaff.slice(start, start + pageSize);
  }, [filteredStaff, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredStaff.length / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, pageSize]);

  const handleOpenAdd = () => {
    setSelectedStaff(null);
    setFormData({ full_name: '', role: 'coach', specialty: '', email: '', phone: '', photo_url: '', team_ids: [] });
    setShowForm(true);
  };

  const handleOpenEdit = (s: StaffMember) => {
    setSelectedStaff(s);
    setFormData({
      ...s,
      team_ids: s.team_ids || []
    });
    setShowForm(true);
  };

  const toggleTeamAssignment = (teamId: string) => {
    const current = formData.team_ids || [];
    if (current.includes(teamId)) {
      setFormData({ ...formData, team_ids: current.filter(id => id !== teamId) });
    } else {
      setFormData({ ...formData, team_ids: [...current, teamId] });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedFileUrl(url);
      setCropModalOpen(true);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropModalOpen(false);
    setIsUploading(true);
    try {
      const fileName = `staff-${Date.now()}.jpg`;
      const file = new File([croppedBlob], fileName, { type: 'image/jpeg' });
      const publicUrl = await storageService.uploadFile(file, 'staff');
      setFormData({ ...formData, photo_url: publicUrl });
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsUploading(false);
      if (selectedFileUrl) URL.revokeObjectURL(selectedFileUrl);
      setSelectedFileUrl(null);
    }
  };

  const handleSave = async () => {
    if (selectedStaff) {
      const { id, created_at, parent_coach_id, ...updateData } = formData as any;
      await updateStaff({ id: selectedStaff.id, data: updateData });
    } else {
      const { parent_coach_id, ...createData } = formData as any;
      await addStaff(createData as Omit<StaffMember, 'id'>);
    }
    setShowForm(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-11 w-40 rounded-xl" />
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 w-full rounded-3xl" />)}
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-foreground uppercase italic flex items-center gap-2">Staff Technique <Sparkles className="w-6 h-6 text-primary" /></h2>
                <p className="text-muted-foreground text-sm font-medium">Gestion des départements techniques, médicaux et analytiques</p>
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
                  <Button onClick={handleOpenAdd} className="gap-2 shadow-lg shadow-primary/20 h-11 px-4 sm:px-6 font-bold uppercase tracking-widest text-xs transition-all active:scale-95">
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Recruter un Membre</span>
                    <span className="sm:hidden">Recruter</span>
                  </Button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-4 p-4 rounded-2xl bg-white border shadow-sm">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher par nom ou rôle..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-secondary/30 border-transparent focus:bg-white transition-all rounded-xl font-medium"
                />
              </div>
              
              <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
                 <Filter className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
                 <button
                    onClick={() => setRoleFilter('ALL')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                      roleFilter === 'ALL' ? 'bg-primary text-white shadow-md' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    ALL
                  </button>
                 {STAFF_ROLES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRoleFilter(r.value)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                      roleFilter === r.value ? 'bg-primary text-white shadow-md' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid / List Content */}
            {displayMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                  {paginatedStaff.map((person) => (
                    <motion.div
                      key={person.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="group relative overflow-hidden border-secondary hover:border-primary/20 hover:shadow-2xl transition-all duration-500 bg-white">
                        <CardContent className="p-0">
                           <div className="h-16 bg-gradient-to-br from-secondary/50 to-secondary" />
                           
                           <div className="px-6 pb-6 -mt-8 relative z-10">
                              <div className="flex items-end justify-between mb-4">
                                 <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-xl overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                   <img src={(person.photo_url && person.photo_url !== 'null') ? person.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(person.full_name)}&background=random&color=fff&size=200`} alt={person.full_name} className="w-full h-full object-cover" />
                                 </div>
                                 <div className="flex gap-1 mb-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(person)} className="h-8 w-8 rounded-lg hover:bg-primary/10">
                                       <Edit2 className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteStaff(person.id)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive">
                                       <Trash2 className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                                    </Button>
                                 </div>
                              </div>

                              <div className="space-y-4">
                                 <div>
                                    <h3 className="font-black text-lg tracking-tighter uppercase group-hover:text-primary transition-colors">{person.full_name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                       <Badge variant="outline" className="text-[10px] font-black border-primary/20 text-primary bg-primary/5 uppercase">
                                         {STAFF_ROLES.find(r => r.value === person.role)?.label || person.role}
                                       </Badge>
                                    </div>
                                 </div>

                                 <div className="space-y-2 pt-4 border-t border-secondary/50">
                                    {person.email && (
                                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                                        <Mail className="w-3 h-3 text-primary opacity-40" />
                                        <span className="truncate">{person.email}</span>
                                      </div>
                                    )}
                                    {person.phone && (
                                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                                        <Phone className="w-3 h-3 text-primary opacity-40" />
                                        <span>{person.phone}</span>
                                      </div>
                                    )}
                                 </div>
                                 
                                 {/* Coach Principal pour les Adjoints */}
                                 {person.role === 'assistant_coach' && person.parent_coach_id && (
                                   <div className="pt-4 border-t border-secondary/50">
                                      <div className="text-[9px] font-black uppercase text-primary mb-2 flex items-center gap-1.5 leading-none">
                                        <UserIcon className="w-3 h-3" /> Sous la direction de
                                      </div>
                                      {(() => {
                                        const parentCoach = staff.find(s => s.id === person.parent_coach_id);
                                        if (!parentCoach) return null;
                                        return (
                                          <Badge variant="outline" className="text-[9px] font-black border-primary/30 text-primary bg-primary/5 uppercase py-1 px-2">
                                            {parentCoach.full_name}
                                          </Badge>
                                        );
                                      })()}
                                   </div>
                                 )}

                                 {/* Équipes Assignées (directes ou héritées) */}
                                 {(person.team_ids && person.team_ids.length > 0) || (person.role === 'assistant_coach' && person.parent_coach_id) ? (
                                   <div className="pt-4 border-t border-secondary/50">
                                      <div className="text-[9px] font-black uppercase text-muted-foreground mb-2 flex items-center gap-1.5 leading-none">
                                        {person.role === 'assistant_coach' && person.parent_coach_id ? 'Équipes (héritées)' : 'Équipes Assignées'}
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                         {(() => {
                                           // Pour les adjoints, récupérer les équipes du coach parent
                                           let teamIdsToShow = person.team_ids || [];
                                           if (person.role === 'assistant_coach' && person.parent_coach_id) {
                                             const parentCoach = staff.find(s => s.id === person.parent_coach_id);
                                             if (parentCoach?.team_ids) {
                                               teamIdsToShow = parentCoach.team_ids;
                                             }
                                           }
                                           return teamIdsToShow.map(tid => {
                                              const team = teams.find(t => t.id === tid);
                                              if (!team) return null;
                                              return (
                                                <Badge key={tid} variant="secondary" className="text-[8px] font-black uppercase tracking-widest py-0.5 px-2 bg-slate-100 text-slate-600 border-none">
                                                  {team.category} • {team.name}
                                                </Badge>
                                              );
                                           });
                                         })()}
                                      </div>
                                   </div>
                                 ) : null}


                              </div>
                           </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white border rounded-[2rem] overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead className="bg-secondary/10 border-b">
                    <tr>
                      <th className="text-left px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Membre</th>
                      <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rôle</th>
                      <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Affectations</th>
                      <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contact</th>
                      <th className="text-right px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary/30">
                    {paginatedStaff.map(person => (
                      <tr key={person.id} className="group hover:bg-secondary/5 transition-colors">
                        <td className="px-8 py-3">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-secondary/30 overflow-hidden border-2 border-white shadow-md">
                                 <img src={(person.photo_url && person.photo_url !== 'null') ? person.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(person.full_name)}&background=random&color=fff&size=200`} className="w-full h-full object-cover" />
                              </div>
                              <span className="font-black text-sm uppercase italic tracking-tighter">{person.full_name}</span>
                           </div>
                        </td>
                        <td className="py-3">
                           <Badge variant="outline" className="text-[10px] font-black border-primary/20 text-primary bg-primary/5 uppercase">
                             {STAFF_ROLES.find(r => r.value === person.role)?.label || person.role}
                           </Badge>
                        </td>
                        <td className="py-3">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                               {person.team_ids?.map(tid => {
                                  const team = teams.find(t => t.id === tid);
                                  return team ? (
                                    <Badge key={tid} className="text-[8px] bg-slate-100 text-slate-500 border-none font-black">{team.category} • {team.name}</Badge>
                                  ) : null;
                               })}
                               {(!person.team_ids || person.team_ids.length === 0) && <span className="text-[9px] opacity-20 italic">Aucune</span>}
                            </div>
                         </td>
                         <td className="py-3">
                            <div className="flex flex-col gap-0.5">
                               <span className="text-[10px] font-bold text-muted-foreground lowercase">{person.email}</span>
                               <span className="text-[10px] font-black tracking-widest">{person.phone}</span>
                            </div>
                         </td>
                        <td className="px-8 py-3 text-right">
                           <div className="flex items-center justify-end gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(person)} className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-md transition-all">
                                 <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteStaff(person.id)} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-red-50 transition-all">
                                 <Trash2 className="w-4 h-4" />
                              </Button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4">
                 <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                    Affichage {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredStaff.length)} sur {filteredStaff.length}
                 </div>
                 <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" size="icon" disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="w-9 h-9 rounded-xl bg-white border-secondary"
                    >
                       <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <Button
                        key={i}
                        variant={currentPage === i + 1 ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-9 h-9 rounded-xl font-black text-[11px] ${currentPage === i + 1 ? 'shadow-lg shadow-primary/20 bg-primary' : 'bg-white border-secondary border'}`}
                      >
                        {i + 1}
                      </Button>
                    ))}

                    <Button 
                      variant="outline" size="icon" disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="w-9 h-9 rounded-xl bg-white border-secondary"
                    >
                       <ChevronRight className="w-4 h-4" />
                    </Button>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50">Par page:</span>
                    <select 
                      value={pageSize}
                      onChange={(e) => setPageSize(parseInt(e.target.value))}
                      className="h-9 w-16 rounded-xl bg-white border border-secondary font-black text-xs px-2 appearance-none cursor-pointer text-center"
                    >
                       {[10, 15, 20, 25, 50].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                 </div>
              </div>
            )}

            {!isLoading && filteredStaff.length === 0 && (
               <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center text-muted-foreground">
                     <Briefcase className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="text-muted-foreground font-medium italic uppercase tracking-widest text-[10px]">Aucun membre trouvé dans cette catégorie.</p>
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
                <h3 className="text-4xl font-black tracking-tight uppercase italic">{selectedStaff ? 'Modifier le Profil' : 'Nouveau Recrutement'}</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1">Registre du Département Technique</p>
              </div>
            </div>

            <Card className="border-none shadow-2xl rounded-[3.5rem] bg-white overflow-hidden">
              <CardContent className="p-12 space-y-12">
                <div className="flex flex-col items-center gap-3 mb-8">
                   <div className="relative group">
                      <input type="file" id="staff-photo" hidden accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={handlePhotoUpload} />
                      <label htmlFor="staff-photo" className="block w-40 h-40 rounded-[3rem] bg-secondary/30 border-2 border-dashed border-secondary flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-all shadow-inner">
                        {(formData.photo_url && formData.photo_url !== 'null') ? (
                          <img src={formData.photo_url} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        ) : (
                          <div className="text-center">
                            <Camera className={`w-12 h-12 mx-auto ${isUploading ? 'animate-bounce text-primary' : 'text-muted-foreground opacity-20'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-2 block">Choisir Photo</span>
                          </div>
                        )}
                        {isUploading && (
                          <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </label>
                   </div>
                   <div className="flex items-center gap-2">
                     <Button
                       type="button"
                       variant="outline"
                       onClick={() => setMediaPickerOpen(true)}
                       className="gap-2 rounded-xl text-xs font-bold border-slate-200 hover:border-primary/40 bg-slate-50 hover:bg-primary/10 text-slate-800 h-9 shadow-sm"
                     >
                       <ImageIcon className="w-3.5 h-3.5 text-primary" />
                       Médiathèque
                     </Button>
                     <label
                       htmlFor="staff-photo"
                       className="cursor-pointer flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all border border-slate-200 h-9"
                     >
                       <Camera className="w-3.5 h-3.5 text-slate-500" />
                       Uploader
                     </label>
                     {formData.photo_url && (
                       <Button
                         type="button"
                         variant="ghost"
                         onClick={() => setFormData({ ...formData, photo_url: '' })}
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Nom Complet</label>
                      <Input 
                        value={formData.full_name} 
                        onChange={e => setFormData({...formData, full_name: e.target.value})} 
                        className="h-16 px-8 rounded-2xl bg-secondary/30 border-none font-bold text-lg focus:ring-2 ring-primary/20" 
                        placeholder="ex. Walid Regragui"
                      />
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Fonction / Rôle</label>
                        <select 
                          value={formData.role} 
                          onChange={e => setFormData({...formData, role: e.target.value})}
                          className="w-full h-16 rounded-2xl bg-secondary/30 border-none font-bold px-8 text-lg outline-none appearance-none cursor-pointer focus:ring-2 ring-primary/20"
                        >
                          {STAFF_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </div>
                      
                      {/* Sélecteur de Coach Principal pour les Entraîneurs Adjoints */}
                      {formData.role === 'assistant_coach' && (
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2 flex items-center gap-2">
                            <UserIcon className="w-3 h-3" /> Entraîneur Principal
                          </label>
                          <select 
                            value={formData.parent_coach_id || ''} 
                            onChange={e => setFormData({...formData, parent_coach_id: e.target.value || undefined})}
                            className="w-full h-16 rounded-2xl bg-secondary/30 border-none font-bold px-8 text-lg outline-none appearance-none cursor-pointer focus:ring-2 ring-primary/20"
                          >
                            <option value="">-- Sélectionner un Coach Principal --</option>
                            {staff.filter(s => s.role === 'coach' || s.role === 'head_coach').map(coach => (
                              <option key={coach.id} value={coach.id}>{coach.full_name}</option>
                            ))}
                          </select>
                          <p className="text-[10px] text-muted-foreground ml-2">
                            L'adjoint hérite automatiquement des équipes de son coach principal
                          </p>
                        </div>
                      )}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Spécialité Technique</label>
                        <Input 
                          value={formData.specialty} 
                          onChange={e => setFormData({...formData, specialty: e.target.value})} 
                          placeholder="ex. Analyse Tactique" 
                          className="h-16 px-8 rounded-2xl bg-secondary/30 border-none font-bold text-lg focus:ring-2 ring-primary/20" 
                        />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Email de Contact</label>
                        <Input 
                          value={formData.email} 
                          onChange={e => setFormData({...formData, email: e.target.value})} 
                          placeholder="coach@fusclub.com" 
                          className="h-16 px-8 rounded-2xl bg-secondary/30 border-none font-bold text-lg focus:ring-2 ring-primary/20" 
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Téléphone Officiel</label>
                        <Input 
                          value={formData.phone} 
                          onChange={e => setFormData({...formData, phone: e.target.value})} 
                          placeholder="+212 x xx xx xx xx" 
                          className="h-16 px-8 rounded-2xl bg-secondary/30 border-none font-bold text-lg focus:ring-2 ring-primary/20" 
                        />
                    </div>
                   </div>

                   <div className="space-y-6 pt-8 border-t border-secondary/50">
                      <div className="flex items-center justify-between">
                         <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-2 flex items-center gap-3">
                            <LayoutGrid className="w-4 h-4" /> Affectation aux Équipes (Multicritères)
                         </label>
                         <Badge className="bg-primary/10 text-primary border-none text-[9px] uppercase tracking-widest">
                            {formData.team_ids?.length || 0} Équipe(s) Sélectionnée(s)
                         </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {Array.from(new Set(teams.map(t => t.category))).sort().map(cat => (
                            <div key={cat} className="space-y-3 p-6 rounded-3xl bg-slate-50/50 border border-slate-100">
                               <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b pb-2">{cat}</h5>
                               <div className="space-y-2">
                                  {teams.filter(t => t.category === cat).map(team => (
                                     <button
                                        key={team.id}
                                        onClick={() => toggleTeamAssignment(team.id)}
                                        className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all group ${
                                          formData.team_ids?.includes(team.id) 
                                          ? 'bg-white border-primary shadow-lg shadow-primary/5' 
                                          : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
                                        }`}
                                     >
                                        <div className="flex items-center gap-3">
                                           <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                              formData.team_ids?.includes(team.id) ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'
                                           }`}>
                                              <UserIcon className="w-4 h-4" />
                                           </div>
                                           <span className={`text-[11px] font-black uppercase transition-colors ${
                                              formData.team_ids?.includes(team.id) ? 'text-primary' : 'text-slate-500'
                                           }`}>{team.name}</span>
                                        </div>
                                        {formData.team_ids?.includes(team.id) && (
                                           <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                              <Sparkles className="w-3 h-3 text-white" />
                                           </div>
                                        )}
                                     </button>
                                  ))}
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="flex gap-4 pt-8 border-t border-secondary/50">
                  <Button variant="ghost" className="flex-1 h-16 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-secondary" onClick={() => setShowForm(false)}>Annuler</Button>
                  <Button className="flex-1 h-16 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95" onClick={handleSave}>
                    {selectedStaff ? 'Mettre à jour le Profil' : 'Finaliser le Recrutement'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageCropperModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        imageSrc={selectedFileUrl}
        onCropComplete={handleCropComplete}
      />

      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => setFormData(prev => ({ ...prev, photo_url: url }))}
        title="Affecter une photo depuis la Médiathèque"
      />
    </div>
  );
};

export default StaffManagement;
