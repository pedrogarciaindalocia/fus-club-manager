import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../context/PermissionsContext';
import { getRoleConfig } from '../../constants/roles';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Camera, 
  Save, 
  Loader2, 
  ShieldCheck, 
  KeyRound,
  CheckCircle2,
  MapPin,
  Sparkles,
  Award,
  Globe,
  ArrowLeft,
  Check,
  ImageIcon,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LocationPicker } from '../recruitment_v2/components/LocationPicker';
import { RECRUITMENT_AGE_CATEGORIES } from '../recruitment_v2/types/recruitment';
import { GEOGRAPHY_DATA } from '../../constants/geography';
import { cn } from '../../lib/utils';
import { MediaPickerModal } from '../media-management/components/MediaPickerModal';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { authState } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Données de Détection & Scouting
  const [existingScoutId, setExistingScoutId] = useState<string | null>(null);
  const [region, setRegion] = useState('Rabat, Maroc');
  const [scoutContinent, setScoutContinent] = useState('Afrique');
  const [scoutCountry, setScoutCountry] = useState('Maroc');
  const [scoutCity, setScoutCity] = useState('Rabat');
  const [scoutCustomRegion, setScoutCustomRegion] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([...RECRUITMENT_AGE_CATEGORIES]);
  const [notes, setNotes] = useState('');

  const currentUser = authState.user;
  const currentEmail = authState.email || '';
  const roleConfig = getRoleConfig(currentUser?.system_role);

  // Seuls les Administrateurs (Super Admin, Scout Admin, Admin Club) peuvent voir et attribuer
  // la Zone de détection, les Catégories d'âge et les Notes de profil.
  // Les Scout Managers et Scouts de terrain sont des utilisateurs opérationnels et ne doivent pas voir ces sections.
  const isAdmin = Boolean(
    currentUser?.system_role === 'scout_admin' ||
    currentUser?.system_role === 'super_admin' ||
    currentUser?.system_role === 'admin'
  );

  const isSuperAdmin = Boolean(currentUser?.system_role === 'super_admin');
  const canEditAssignedCategories = isSuperAdmin;

  const isScoutAdmin = Boolean(
    currentUser?.system_role === 'scout_admin' ||
    currentUser?.system_role === 'super_admin'
  );

  const isScout = Boolean(
    currentUser?.system_role?.startsWith('scout') ||
    isAdmin
  );

  useEffect(() => {
    setFullName((currentUser as any)?.full_name || '');
    setPhone((currentUser as any)?.phone_number || '');
    setAvatarUrl(currentUser?.avatar_url || '');
    setAvatarPreview(currentUser?.avatar_url || null);
    setNewPassword('');
    setConfirmPassword('');
    setAvatarFile(null);

    // Charger les données scouting associées depuis la table scouts
    const loadScoutData = async () => {
      try {
        const emailToLookup = currentEmail.toLowerCase().trim();
        let query = supabase.from('scouts').select('*');
        if (emailToLookup) {
          query = query.eq('email', emailToLookup);
        }
        const { data } = await query.maybeSingle();
        if (data) {
          setExistingScoutId(data.id);
          if (data.recruitment_region) {
            setRegion(data.recruitment_region);
            let matched = false;
            for (const [cont, countries] of Object.entries(GEOGRAPHY_DATA)) {
              for (const [country, cities] of Object.entries(countries)) {
                const foundCity = cities.find(ct => data.recruitment_region?.toLowerCase().includes(ct.toLowerCase()));
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
              setScoutCustomRegion(data.recruitment_region);
            }
          }
          if (data.assigned_categories && Array.isArray(data.assigned_categories)) {
            setSelectedCategories(data.assigned_categories);
          }
          if (data.notes) {
            setNotes(data.notes);
          }
          if (data.photo_url && !avatarUrl) {
            setAvatarUrl(data.photo_url);
            setAvatarPreview(data.photo_url);
          }
          if (data.phone && !phone) {
            setPhone(data.phone);
          }
        }
      } catch (err) {
        console.warn("Impossible de charger les données scout associées:", err);
      }
    };

    loadScoutData();
  }, [currentUser, currentEmail]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) {
      toast.error("Session utilisateur introuvable.");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      toast.error("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.error("Les mots de passe saisis ne correspondent pas.");
      return;
    }

    try {
      setLoading(true);

      let finalAvatarUrl = avatarUrl;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const fileName = `${currentUser.id}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('staff').upload(fileName, avatarFile, {
          upsert: true
        });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('staff').getPublicUrl(fileName);
          finalAvatarUrl = publicUrl;
        } else {
          console.warn("Storage upload warn, continuing without avatar update:", uploadError);
        }
      }

      // 1. Mise à jour dans user_profiles
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName.trim(),
          phone_number: phone.trim() || null,
          ...(finalAvatarUrl ? { avatar_url: finalAvatarUrl } : {})
        })
        .eq('id', currentUser.id);

      if (profileError) {
        console.warn("Direct update error in user_profiles:", profileError);
      }

      // 2. Synchronisation de la fiche dans la table scouts
      if (isScout) {
        const scoutPayload: any = {
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          photo_url: finalAvatarUrl || null,
          role_title: isScoutAdmin ? 'Scout Admin' : (roleConfig.label || 'Scout Admin'),
          updated_at: new Date().toISOString()
        };

        // Seul l'administrateur peut modifier la zone assignée, les catégories et les notes
        if (isAdmin) {
          scoutPayload.recruitment_region = region || 'Rabat, Maroc';
          scoutPayload.assigned_categories = selectedCategories.length > 0 ? selectedCategories : [...RECRUITMENT_AGE_CATEGORIES];
          scoutPayload.notes = notes.trim() || null;
        }

        if (existingScoutId) {
          await supabase.from('scouts').update(scoutPayload).eq('id', existingScoutId);
        } else if (currentEmail) {
          await supabase.from('scouts').upsert({
            ...scoutPayload,
            email: currentEmail.toLowerCase().trim(),
            status: 'active',
            recruited_date: new Date().toISOString().split('T')[0]
          }, { onConflict: 'email' });
        }
      }

      // 3. Mise à jour du mot de passe dans Supabase Auth si saisi
      if (newPassword) {
        const { error: pwdError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (pwdError) {
          throw pwdError;
        }
        toast.success("Mot de passe mis à jour avec succès !");
      }

      // 4. Mise à jour des métadonnées auth
      await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          phone_number: phone.trim(),
          avatar_url: finalAvatarUrl
        }
      });

      toast.success("Votre profil a été mis à jour avec succès !");
      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (err: any) {
      console.error("Erreur sauvegarde profil:", err);
      toast.error(`Erreur : ${err?.message || "Impossible de mettre à jour le profil."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePasswordOnly = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!newPassword) {
      toast.error("Veuillez saisir votre nouveau mot de passe.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Le nouveau mot de passe doit comporter au moins 6 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error: pwdErr } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (pwdErr) throw pwdErr;

      if (currentUser?.id) {
        await supabase
          .from('user_profiles')
          .update({ force_password_change: false })
          .eq('id', currentUser.id);
      }

      toast.success("Mot de passe modifié avec succès !");
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordFields(false);
    } catch (err: any) {
      console.error("Erreur modification mot de passe:", err);
      toast.error(`Erreur : ${err?.message || "Impossible de modifier le mot de passe."}`);
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* En-tête de la Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs shrink-0">
            <User className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Mon Profil Personnel
              </h1>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-black uppercase border shadow-2xs",
                roleConfig.badgeClass
              )}>
                {roleConfig.label}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Gestion de votre compte officiel, coordonnées de contact, zones géographiques et sécurité.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1 : Photo & Identifiants */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <User className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Identité & Photographie Officielle
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
            <div className="relative group w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 shadow-md flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-muted-foreground" />
              )}
              <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-[11px] font-bold">
                <Camera className="w-5 h-5 mb-1" />
                Changer
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>

            <div className="space-y-2 flex-1 w-full text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Photo de Profil Officielle</h3>
                  <p className="text-xs text-muted-foreground">
                    Formats acceptés : JPG, PNG ou WebP (max 10 Mo).
                  </p>
                </div>
                <div className="flex items-center gap-2 self-center sm:self-auto flex-wrap">
                  <button
                    type="button"
                    onClick={() => setMediaPickerOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-primary/10 border border-slate-200 dark:border-slate-600 hover:border-primary/40 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-primary" />
                    <span>Médiathèque</span>
                  </button>
                  <label className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Téléverser</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" onChange={handleAvatarChange} />
                  </label>
                  {(avatarPreview || avatarUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl('');
                        setAvatarPreview(null);
                        setAvatarFile(null);
                      }}
                      className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all border border-slate-200 dark:border-slate-700"
                      title="Supprimer la photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => {
                  setAvatarUrl(e.target.value);
                  setAvatarPreview(e.target.value);
                }}
                placeholder="Ou collez un lien URL d'image web..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Nom Complet *
              </label>
              <Input 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                placeholder="Votre nom complet" 
                className="rounded-xl h-11 text-xs font-bold bg-white dark:bg-slate-800"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Téléphone de Contact
              </label>
              <Input 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="+212 600-000000" 
                className="rounded-xl h-11 text-xs font-bold bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Email de Connexion (Identifiant)
              </label>
              <Input 
                value={currentEmail} 
                disabled
                className="rounded-xl h-11 text-xs font-bold bg-slate-100 dark:bg-slate-800/80 text-muted-foreground cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Section 2 : Zone de Détection Géographique (LocationPicker - Réservé Admin) */}
        {isAdmin && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Zone & Région de Détection Assignée
                </h2>
              </div>
              <span className="text-xs font-bold text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 truncate max-w-[280px]">
                {region || 'Non sélectionnée'}
              </span>
            </div>

            <LocationPicker
              continent={scoutContinent}
              setContinent={setScoutContinent}
              country={scoutCountry}
              setCountry={setScoutCountry}
              city={scoutCity}
              setCity={setScoutCity}
              customCity={scoutCustomRegion}
              setCustomCity={setScoutCustomRegion}
              locationString={region}
              setLocationString={setRegion}
            />
          </div>
        )}

        {/* Section 3 : Catégories Assignées (Réservé Admin) */}
        {isAdmin && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Catégories d'Âge Assignées
                </h2>
              </div>
              {canEditAssignedCategories ? (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedCategories([...RECRUITMENT_AGE_CATEGORIES])}
                    className="text-primary hover:underline font-bold text-xs cursor-pointer"
                  >
                    Tout cocher
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategories([])}
                    className="text-slate-500 hover:underline text-xs cursor-pointer"
                  >
                    Tout décocher
                  </button>
                  <span className="text-muted-foreground text-xs font-medium ml-1">
                    ({selectedCategories.length}/{RECRUITMENT_AGE_CATEGORIES.length})
                  </span>
                </div>
              ) : (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Attribué par le Super Admin ({selectedCategories.length} cat.)
                </span>
              )}
            </div>

            {!canEditAssignedCategories && (
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs">
                <Lock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-bold">
                    Périmètre de Détection Attribué par le Super Administrateur (Lecture seule)
                  </p>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                    Vos catégories d'âge d'intervention sont exclusivement assignées et supervisées par la Direction du Club (Super Admin).
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {RECRUITMENT_AGE_CATEGORIES.map((cat) => {
                const isChecked = selectedCategories.includes(cat);
                return (
                  <label
                    key={cat}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all",
                      canEditAssignedCategories ? "cursor-pointer" : "cursor-not-allowed",
                      isChecked
                        ? "bg-primary/10 border-primary text-primary shadow-xs"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 opacity-60 line-through"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={!canEditAssignedCategories}
                      onChange={(e) => {
                        if (!canEditAssignedCategories) return;
                        if (e.target.checked) {
                          setSelectedCategories([...selectedCategories, cat]);
                        } else {
                          setSelectedCategories(selectedCategories.filter(c => c !== cat));
                        }
                      }}
                      className={cn(
                        "rounded text-primary focus:ring-primary h-4 w-4",
                        canEditAssignedCategories ? "cursor-pointer" : "cursor-not-allowed pointer-events-none"
                      )}
                    />
                    <span>{cat}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 4 : Notes de Direction (Réservé Admin) */}
        {isAdmin && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Notes & Observations du Profil
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Réseau relationnel, diplômes d'entraîneur, missions prioritaires..."
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-800 text-foreground"
            />
          </div>
        )}

        {/* Section 5 : Authentification (US-DASH-34) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Authentification
                </h2>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Modifiez votre mot de passe de connexion à tout moment en toute autonomie.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowPasswordFields(prev => !prev);
                if (showPasswordFields) {
                  setNewPassword('');
                  setConfirmPassword('');
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-amber-500/20 self-start sm:self-auto"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{showPasswordFields ? 'Fermer la section' : 'Modifier le mot de passe'}</span>
            </button>
          </div>

          {showPasswordFields ? (
            <div className="space-y-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Nouveau mot de passe *
                  </label>
                  <div className="relative">
                    <Input 
                      type={showPwd ? 'text' : 'password'} 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      placeholder="Saisissez votre nouveau mot de passe (min. 6 caractères)" 
                      className="rounded-xl h-11 text-xs font-medium font-mono bg-white dark:bg-slate-800 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      tabIndex={-1}
                    >
                      {showPwd ? 'Cacher' : 'Voir'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Confirmer le mot de passe *
                  </label>
                  <Input 
                    type={showPwd ? 'text' : 'password'} 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="Répétez le nouveau mot de passe" 
                    className="rounded-xl h-11 text-xs font-medium font-mono bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <p className="text-[11px] text-muted-foreground">
                  Le mot de passe sera immédiatement haché et mis à jour pour vos prochaines connexions.
                </p>
                <Button
                  type="button"
                  disabled={updatingPassword || !newPassword}
                  onClick={handleUpdatePasswordOnly}
                  className="rounded-xl h-10 px-5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs gap-1.5 cursor-pointer shrink-0"
                >
                  {updatingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Modification...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Modifier le mot de passe</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Votre compte est protégé par un mot de passe sécurisé.</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordFields(true)}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                Modifier le mot de passe
              </button>
            </div>
          )}
        </div>

        {/* Boutons d'Action Fixes / Enregistrement */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate(-1)}
            disabled={loading}
            className="rounded-xl h-12 px-6 text-xs font-bold cursor-pointer"
          >
            Annuler
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            className="rounded-xl h-12 px-8 text-xs font-black uppercase bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 gap-2 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer mon profil
          </Button>
        </div>
      </form>

      {/* Sélecteur de Médias Centralisé */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => {
          setAvatarUrl(url);
          setAvatarPreview(url);
          setAvatarFile(null);
        }}
        title="Affecter une photo depuis la Médiathèque"
      />
    </div>
  );
};

export default ProfilePage;
