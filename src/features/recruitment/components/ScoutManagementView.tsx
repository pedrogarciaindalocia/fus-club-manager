import React, { useState } from 'react';
import type { Scout, TrialCandidate, CandidateEvaluation, ScoutObservation } from '../types/recruitment';
import { RECRUITMENT_AGE_CATEGORIES } from '../types/recruitment';
import { GEOGRAPHY_DATA } from '../../../constants/geography';
import {
  User, Plus, Phone, Mail, MapPin, Award, CheckCircle2,
  Calendar, TrendingUp, Shield, Edit3, Trash2, X, Sparkles,
  Users, CheckSquare, Square, Camera, Upload, Loader2,
  ImageIcon
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { uploadRecruitmentPhoto } from '../utils/uploadPhoto';
import { toast } from 'sonner';
import { MediaPickerModal } from '../../media-management/components/MediaPickerModal';

interface ScoutManagementViewProps {
  scouts: Scout[];
  candidates: TrialCandidate[];
  evaluations: CandidateEvaluation[];
  observations?: ScoutObservation[];
  onCreateScout: (scout: Omit<Scout, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateScout: (id: string, updates: Partial<Scout>) => Promise<any>;
  onDeleteScout: (id: string) => Promise<any>;
}

export const ScoutManagementView: React.FC<ScoutManagementViewProps> = ({
  scouts,
  candidates,
  evaluations,
  observations = [],
  onCreateScout,
  onUpdateScout,
  onDeleteScout,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingScout, setEditingScout] = useState<Scout | null>(null);
  const [selectedScoutId, setSelectedScoutId] = useState<string | null>(() => scouts[0]?.id || null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [roleTitle, setRoleTitle] = useState('Scout Régional');
  const [scoutContinent, setScoutContinent] = useState('Afrique');
  const [scoutCountry, setScoutCountry] = useState('Maroc');
  const [scoutCity, setScoutCity] = useState('Rabat');
  const [scoutCustomRegion, setScoutCustomRegion] = useState('');
  const [region, setRegion] = useState('Rabat, Maroc');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [assignedCategories, setAssignedCategories] = useState<string[]>([...RECRUITMENT_AGE_CATEGORIES]);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [notes, setNotes] = useState('');

  const activeScout = scouts.find(s => s.id === selectedScoutId) || scouts[0];

  const isCandidateForScout = (c: TrialCandidate, targetScout?: Scout) => {
    if (!targetScout) return false;
    const sId = targetScout.id;
    const sName = (targetScout.full_name || '').toLowerCase().trim();

    const matchScoutId = Boolean(c.discovering_scout_id && c.discovering_scout_id === sId);
    const matchScoutName = Boolean(c.discovering_scout_name && c.discovering_scout_name.toLowerCase().trim() === sName);
    const matchRecId = Boolean(c.recruiter_id && c.recruiter_id === sId);
    const matchRecName = Boolean(c.recruiter_name && c.recruiter_name.toLowerCase().trim() === sName);

    return matchScoutId || matchScoutName || matchRecId || matchRecName;
  };

  // Scout KPI calculations
  const scoutCandidates = candidates.filter(c => isCandidateForScout(c, activeScout));
  const scoutEvals = evaluations.filter(e => scoutCandidates.some(c => c.id === e.candidate_id));
  const avgScore = scoutEvals.length > 0
    ? Math.round((scoutEvals.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / scoutEvals.length) * 10) / 10
    : 0;

  const toggleCategory = (cat: string) => {
    setAssignedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleScoutContinentChange = (continent: string) => {
    setScoutContinent(continent);
    const countries = Object.keys(GEOGRAPHY_DATA[continent] || {});
    const firstCountry = countries[0] || '';
    setScoutCountry(firstCountry);
    const cities = GEOGRAPHY_DATA[continent]?.[firstCountry] || [];
    const firstCity = cities[0] || 'Autre';
    setScoutCity(firstCity);
    setRegion(firstCity === 'Autre' ? (scoutCustomRegion || firstCountry) : `${firstCity}, ${firstCountry}`);
  };

  const handleScoutCountryChange = (country: string) => {
    setScoutCountry(country);
    const cities = GEOGRAPHY_DATA[scoutContinent]?.[country] || [];
    const firstCity = cities[0] || 'Autre';
    setScoutCity(firstCity);
    setRegion(firstCity === 'Autre' ? (scoutCustomRegion || country) : `${firstCity}, ${country}`);
  };

  const handleScoutCityChange = (cityVal: string) => {
    setScoutCity(cityVal);
    if (cityVal === 'Autre') {
      setRegion(scoutCustomRegion ? `${scoutCustomRegion}, ${scoutCountry}` : scoutCountry);
    } else {
      setRegion(`${cityVal}, ${scoutCountry}`);
    }
  };

  const handleScoutCustomRegionChange = (val: string) => {
    setScoutCustomRegion(val);
    setRegion(val ? `${val}, ${scoutCountry}` : scoutCountry);
  };

  const handleScoutPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const url = await uploadRecruitmentPhoto(file, 'scouts');
      setPhotoUrl(url);
      toast.success('Photo du scout/recruteur chargée avec succès', { icon: '📸' });
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du téléversement de la photo');
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const openCreateModal = () => {
    setEditingScout(null);
    setFullName('');
    setPhotoUrl('');
    setRoleTitle('Scout Régional');
    setScoutContinent('Afrique');
    setScoutCountry('Maroc');
    setScoutCity('Rabat');
    setScoutCustomRegion('');
    setRegion('Rabat, Maroc');
    setPhone('');
    setEmail('');
    setAssignedCategories([...RECRUITMENT_AGE_CATEGORIES]);
    setStatus('active');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (scout: Scout) => {
    setEditingScout(scout);
    setFullName(scout.full_name);
    setPhotoUrl(scout.photo_url || '');
    setRoleTitle(scout.role_title);
    setRegion(scout.recruitment_region || 'Rabat, Maroc');
    setPhone(scout.phone || '');
    setEmail(scout.email || '');
    setAssignedCategories(scout.assigned_categories || []);
    setStatus(scout.status);
    setNotes(scout.notes || '');

    // Resolve geography
    if (scout.recruitment_region) {
      let matched = false;
      for (const [cont, countries] of Object.entries(GEOGRAPHY_DATA)) {
        for (const [country, cities] of Object.entries(countries)) {
          const foundCity = cities.find(ct => scout.recruitment_region?.toLowerCase().includes(ct.toLowerCase()));
          if (foundCity) {
            setScoutContinent(cont);
            setScoutCountry(country);
            setScoutCity(foundCity);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
      if (!matched) {
        setScoutContinent('Afrique');
        setScoutCountry('Maroc');
        setScoutCity('Autre');
        setScoutCustomRegion(scout.recruitment_region);
      }
    }

    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const data = {
        full_name: fullName.trim(),
        photo_url: photoUrl.trim() || undefined,
        role_title: roleTitle,
        recruitment_region: region,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        assigned_categories: assignedCategories.length > 0 ? assignedCategories : [...RECRUITMENT_AGE_CATEGORIES],
        assigned_teams: ['Académie FUS'],
        status,
        recruited_date: editingScout?.recruited_date || new Date().toISOString().split('T')[0],
        notes: notes.trim() || undefined,
      };

      if (editingScout) {
        await onUpdateScout(editingScout.id, data);
        setSelectedScoutId(editingScout.id);
      } else {
        const created = await onCreateScout(data);
        if (created?.id) setSelectedScoutId(created.id);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('[ScoutManagementView] Erreur sauvegarde scout:', err);
      toast.error(err?.message || "Erreur lors de l'enregistrement du scout");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-5 border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Cellule Détection & Gestion des Scouts
          </h2>
          <p className="text-xs text-muted-foreground">
            Suivi des recruteurs du club, fiches d'activité et zones de prospection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-600 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-100 hidden sm:inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Scout sélectionné : <strong className="text-slate-800">{activeScout?.full_name || 'Aucun'}</strong>
          </span>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow hover:bg-primary/90 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un Scout
          </button>
        </div>
      </div>

      {/* ROSTER ET DÉTAIL DES SCOUTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Liste des Scouts (4 Cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Recruteurs Actifs ({scouts.length})
            </h3>

            <div className="space-y-2.5">
              {scouts.map((scout) => {
                const isSelected = activeScout?.id === scout.id;
                const candCount = candidates.filter(c => isCandidateForScout(c, scout)).length;

                return (
                  <div
                    key={scout.id}
                    onClick={() => setSelectedScoutId(scout.id)}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                      isSelected
                        ? "bg-white border-primary shadow-md ring-2 ring-primary/10"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-slate-200 shadow-2xs">
                        {scout.photo_url ? (
                          <img
                            src={scout.photo_url}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          scout.full_name.split(' ').map(n => n[0]).join('')
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{scout.full_name}</h4>
                        <p className="text-xs text-muted-foreground">{scout.role_title}</p>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-primary" /> {scout.recruitment_region}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 block mb-1">
                        {candCount} joueurs
                      </span>
                      <span className={cn(
                        "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                        scout.status === 'active' ? "text-emerald-700 bg-emerald-50" : "text-slate-500 bg-slate-100"
                      )}>
                        {scout.status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dashboard Personnel du Scout Sélectionné (8 Cols) */}
          {activeScout && (
            <div className="lg:col-span-8 bg-white rounded-3xl p-6 border shadow-sm space-y-6">
              {/* Profil Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-slate-900 text-white flex items-center justify-center text-xl font-black shrink-0 overflow-hidden border border-slate-200 shadow-sm">
                    {activeScout.photo_url ? (
                      <img
                        src={activeScout.photo_url}
                        alt={activeScout.full_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      activeScout.full_name.split(' ').map(n => n[0]).join('')
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-foreground">{activeScout.full_name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Scout Officiel
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{activeScout.role_title} • Région : {activeScout.recruitment_region}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                      {activeScout.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-primary" /> {activeScout.phone}</span>}
                      {activeScout.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-primary" /> {activeScout.email}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(activeScout)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                    title="Modifier le profil"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Retirer le scout ${activeScout.full_name} ?`)) {
                        onDeleteScout(activeScout.id);
                      }
                    }}
                    className="p-2 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* KPIs Performance du Scout */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Talents Découverts</span>
                  <span className="text-2xl font-black text-foreground">{scoutCandidates.length}</span>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">En Évaluation</span>
                  <span className="text-2xl font-black text-amber-700">
                    {scoutCandidates.filter(c => ['screening', 'test_scheduled', 'under_evaluation'].includes(c.pipeline_stage)).length}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Signés / Académie</span>
                  <span className="text-2xl font-black text-emerald-700">
                    {scoutCandidates.filter(c => ['signed', 'academy', 'shortlisted'].includes(c.pipeline_stage)).length}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-red-50/60 border border-red-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-red-900 block">Note Moyenne Talents</span>
                  <span className="text-2xl font-black text-primary">{avgScore > 0 ? `${avgScore}/10` : '-'}</span>
                </div>
              </div>

              {/* Joueurs Recommandés par le Scout */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Joueurs Découverts & Suivis ({scoutCandidates.length})
                </h4>

                {scoutCandidates.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground bg-slate-50 rounded-2xl border border-dashed">
                    Aucun joueur actuellement associé à ce scout.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {scoutCandidates.map((c) => (
                      <div key={c.id} className="p-3 bg-slate-50/60 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{c.first_name} {c.last_name}</p>
                          <p className="text-[10px] text-muted-foreground">{c.primary_position} • {c.current_club || 'Sans club'}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border text-slate-700 uppercase">
                            {c.pipeline_stage.replace('_', ' ')}
                          </span>
                          {c.initial_scout_score && (
                            <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                              {c.initial_scout_score}/10
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      {/* Modal Ajout / Édition Scout */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-foreground">
                {editingScout ? 'Modifier la Fiche Scout' : 'Nouveau Scout'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-muted-foreground hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Photo de Profil du Scout */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
                <div className="relative group shrink-0">
                  <div className="w-16 h-16 rounded-2xl border-2 border-slate-300 bg-white overflow-hidden shadow-xs flex items-center justify-center">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt="Photo scout"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <User className="w-7 h-7 text-slate-300" />
                    )}
                  </div>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-600 transition-colors"
                      title="Supprimer la photo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-primary" />
                        Photo de Profil du Scout
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        Formats JPG, PNG, WebP (max 10 Mo).
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setMediaPickerOpen(true)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 bg-slate-50 hover:bg-primary/10 border border-slate-200 hover:border-primary/40 text-slate-800 shadow-xs"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-primary" />
                        <span>Médiathèque</span>
                      </button>

                      <label className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs shrink-0",
                        isUploadingPhoto
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                          : "bg-primary text-white hover:bg-primary/95 hover:scale-[1.02] active:scale-98 shadow-primary/20"
                      )}>
                        {isUploadingPhoto ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Chargement...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>{photoUrl ? 'Changer' : 'Téléverser'}</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                          disabled={isUploadingPhoto}
                          onChange={handleScoutPhotoUpload}
                          className="hidden"
                        />
                      </label>

                      {photoUrl && (
                        <button
                          type="button"
                          onClick={() => setPhotoUrl('')}
                          className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all border border-slate-200"
                          title="Supprimer la photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="Ou collez un lien URL de photo..."
                    className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] bg-white outline-none focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom Complet *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Hassan Benabicha"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Rôle / Titre *</label>
                  <input
                    type="text"
                    required
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="Ex: Scout Principal U19"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+212 6 XX XX XX XX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="scout@fus.ma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Région de Détection : Cascades Continent ➔ Pays ➔ Ville */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> Zone & Région de Détection *
                  </label>
                  <span className="text-[11px] font-bold text-primary truncate max-w-[200px]">
                    {region || 'Non sélectionnée'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Continent</label>
                    <select
                      value={scoutContinent}
                      onChange={(e) => handleScoutContinentChange(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white cursor-pointer font-medium"
                    >
                      {Object.keys(GEOGRAPHY_DATA).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Pays</label>
                    <select
                      value={scoutCountry}
                      onChange={(e) => handleScoutCountryChange(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white cursor-pointer font-medium"
                    >
                      {scoutContinent && GEOGRAPHY_DATA[scoutContinent] && Object.keys(GEOGRAPHY_DATA[scoutContinent]).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Ville</label>
                    <select
                      value={scoutCity}
                      onChange={(e) => handleScoutCityChange(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white cursor-pointer font-medium"
                    >
                      {scoutContinent && scoutCountry && GEOGRAPHY_DATA[scoutContinent]?.[scoutCountry]?.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                      <option value="Autre">Autre (Personnalisée)</option>
                    </select>
                  </div>
                </div>

                {scoutCity === 'Autre' && (
                  <div className="pt-1">
                    <label className="block text-[9px] font-bold text-slate-500 mb-1">Préciser la zone géographique</label>
                    <input
                      type="text"
                      value={scoutCustomRegion}
                      onChange={(e) => handleScoutCustomRegionChange(e.target.value)}
                      placeholder="Ex: Région Nord, Rabat-Salé-Kénitra..."
                      className="w-full px-3 py-1.5 rounded-xl border text-xs bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Catégories Assignées : Cases à cocher */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Catégories Assignées (Cases à cocher) *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAssignedCategories([...RECRUITMENT_AGE_CATEGORIES])}
                      className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      Tout cocher
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setAssignedCategories([])}
                      className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      Tout décocher
                    </button>
                    <span className="text-[10px] text-muted-foreground font-medium ml-1">
                      ({assignedCategories.length}/{RECRUITMENT_AGE_CATEGORIES.length})
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {RECRUITMENT_AGE_CATEGORIES.map(cat => {
                    const isChecked = assignedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={cn(
                          "px-2.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5",
                          isChecked
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded text-primary focus:ring-0 pointer-events-none"
                        />
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes du Recruteur</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Réseau relationnel, diplômes d'entraîneur..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Statut du Scout */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Statut d'activité</span>
                  <span className="text-[10px] text-muted-foreground">Détermine si le scout est actuellement actif dans la cellule</span>
                </div>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setStatus('active')}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-md transition-all",
                      status === 'active' ? "bg-emerald-500 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Actif
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('inactive')}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-md transition-all",
                      status === 'inactive' ? "bg-slate-400 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Inactif
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sélecteur de Médias Centralisé */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => setPhotoUrl(url)}
        title="Affecter une photo depuis la Médiathèque"
      />
    </div>
  );
};
export default ScoutManagementView;
