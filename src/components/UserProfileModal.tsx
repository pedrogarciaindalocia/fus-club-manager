import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../context/PermissionsContext';
import { getRoleConfig } from '../constants/roles';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Camera, 
  Save, 
  X, 
  Loader2, 
  ShieldCheck, 
  Briefcase,
  KeyRound,
  CheckCircle2,
  MapPin,
  Sparkles,
  Award,
  Globe,
  ImageIcon,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LocationPicker } from '../features/recruitment_v2/components/LocationPicker';
import { RECRUITMENT_AGE_CATEGORIES } from '../features/recruitment_v2/types/recruitment';
import { GEOGRAPHY_DATA } from '../constants/geography';
import { cn } from '../lib/utils';
import { MediaPickerModal } from '../features/media-management/components/MediaPickerModal';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { authState } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Champs de Détection & Scouting (Même formulaire complet pour l'Admin - US-DASH-27)
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

  const isScoutAdmin = Boolean(
    currentUser?.system_role === 'scout_admin' ||
    currentUser?.system_role === 'super_admin'
  );

  const isScout = Boolean(
    currentUser?.system_role?.startsWith('scout') ||
    isAdmin
  );

  useEffect(() => {
    if (isOpen) {
      setFullName((currentUser as any)?.full_name || '');
      setPhone((currentUser as any)?.phone_number || '');
      setAvatarUrl(currentUser?.avatar_url || '');
      setAvatarPreview(currentUser?.avatar_url || null);
      setNewPassword('');
      setConfirmPassword('');
      setAvatarFile(null);

      // Charger les données de détection / scouting associées
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
              // Résoudre la géographie
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
    }
  }, [isOpen, currentUser, currentEmail]);

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

      // 1. Mise à jour de la table user_profiles
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

      // 2. Synchronisation de la fiche dans la table scouts (US-DASH-27)
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

      // 4. Mise à jour des métadonnées d'auth (full_name, avatar_url)
      await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          phone_number: phone.trim(),
          avatar_url: finalAvatarUrl
        }
      });

      toast.success("Votre profil a été mis à jour avec succès !");
      onClose();
      // Rafraîchissement léger pour propager les changements
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="bg-white dark:bg-slate-900 border border-border/80 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border bg-slate-50/70 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                    Mon Profil Personnel {isScoutAdmin ? '• Scout Admin' : ''}
                  </h3>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase border shadow-2xs",
                    roleConfig.badgeClass
                  )}>
                    {roleConfig.label}
                  </span>
                </div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Gérez vos informations de compte, coordonnées et périmètre de détection
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              disabled={loading}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
            {/* Photo Avatar & Identifiant */}
            <div className="p-4 rounded-2xl border bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative group w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-[10px] font-bold">
                  <Camera className="w-4 h-4 mb-0.5" />
                  Modifier
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <label className="text-xs font-black uppercase text-foreground">Photo de Profil Officielle</label>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Format PNG, JPG ou WebP (max 10 Mo).
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setMediaPickerOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-primary/10 border border-slate-200 hover:border-primary/40 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-primary" /> Médiathèque
                    </button>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs">
                      <Camera className="w-3.5 h-3.5" /> Téléverser photo
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
                        className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all border border-slate-200 dark:border-slate-700"
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
                  placeholder="Ou collez un lien URL d'image..."
                  className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Coordonnées */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nom Complet *
                </label>
                <Input 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="Votre nom complet" 
                  className="rounded-xl h-10 text-xs font-bold bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Téléphone
                </label>
                <Input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="+212 600-000000" 
                  className="rounded-xl h-10 text-xs font-bold bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Email de Connexion
                </label>
                <Input 
                  value={currentEmail} 
                  disabled
                  className="rounded-xl h-10 text-xs font-bold bg-slate-100 dark:bg-slate-800/80 text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>

            {/* Zone & Région de Détection via LocationPicker (Réservé Admin) */}
            {isAdmin && (
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> Zone & Région de Détection Assignée *
                  </label>
                  <span className="text-[11px] font-bold text-primary truncate max-w-[240px]">
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

            {/* Catégories Assignées (Cases à cocher U13 à U23 - Réservé Admin) */}
            {isAdmin && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Catégories Assignées (Cases à cocher) *
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedCategories([...RECRUITMENT_AGE_CATEGORIES])}
                      className="text-primary hover:underline font-bold text-[11px]"
                    >
                      Tout cocher
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCategories([])}
                      className="text-slate-500 hover:underline text-[11px]"
                    >
                      Tout décocher
                    </button>
                    <span className="text-muted-foreground text-[10px] ml-1">
                      ({selectedCategories.length}/{RECRUITMENT_AGE_CATEGORIES.length})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {RECRUITMENT_AGE_CATEGORIES.map((cat) => {
                    const isChecked = selectedCategories.includes(cat);
                    return (
                      <label
                        key={cat}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all",
                          isChecked
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategories([...selectedCategories, cat]);
                            } else {
                              setSelectedCategories(selectedCategories.filter(c => c !== cat));
                            }
                          }}
                          className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span>{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes du Recruteur / Direction (Réservé Admin) */}
            {isAdmin && (
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Notes & Observations de la Direction / Profil Scout
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Réseau relationnel, diplômes d'entraîneur, missions prioritaires..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-800 text-foreground"
                />
              </div>
            )}

            {/* Sécurité & Mot de passe */}
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" /> Modifier le mot de passe
                </label>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">(Optionnel)</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                    Nouveau mot de passe
                  </label>
                  <Input 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="Min. 6 caractères" 
                    className="rounded-xl h-10 text-xs font-medium font-mono bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                    Confirmer mot de passe
                  </label>
                  <Input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="Répétez le mot de passe" 
                    className="rounded-xl h-10 text-xs font-medium font-mono bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Footer boutons */}
            <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={loading}
                className="rounded-xl h-11 px-4 text-xs font-bold cursor-pointer"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="rounded-xl h-11 px-6 text-xs font-black uppercase bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer mon profil
              </Button>
            </div>
          </form>
        </motion.div>
      </div>

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
    </AnimatePresence>
  );
};

export default UserProfileModal;
