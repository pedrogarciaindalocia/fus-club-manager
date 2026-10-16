import React, { useState, useEffect } from 'react';
import { useClubData } from '../../hooks/useClubData';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Camera, Save, Globe, Building2, Palette, Sparkles, KeySquare, Target, ShieldCheck, ImageIcon, Trash2, Smartphone, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { storageService } from '../../services/storageService';
import { Skeleton } from '../../components/ui/skeleton';
import { MetricsManagement } from './components/MetricsManagement';
import { MediaPickerModal } from '../media-management/components/MediaPickerModal';

const ClubSettings: React.FC = () => {
  const { mainClub, updateMainClub, isLoading } = useClubData();
  const [activeTab, setActiveTab] = useState<'registry' | 'metrics'>('registry');

  const [formData, setFormData] = useState({
    club_name: '',
    city: '',
    country: '',
    logo_url: '',
    primary_color: '#e03d3d',
    secondary_color: '#ffffff',
    pagination_limit: 10,
    preferred_view_mode: 'list' as 'grid' | 'list',
    session_timeout_minutes: 30,
    show_fan_button: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  useEffect(() => {
    if (mainClub) {
      const currentPlugins = (mainClub.settings as any)?.plugins || {};
      setFormData({
        club_name: mainClub.name || '',
        city: mainClub.city || '',
        country: mainClub.country || '',
        logo_url: mainClub.logo_url || '',
        primary_color: mainClub.settings?.primary_color || '#e03d3d',
        secondary_color: mainClub.settings?.secondary_color || '#ffffff',
        pagination_limit: mainClub.settings?.pagination_limit || 10,
        preferred_view_mode: (mainClub.settings?.preferred_view_mode as any) || 'list',
        session_timeout_minutes: currentPlugins.session_timeout_minutes ?? (mainClub.settings as any)?.session_timeout_minutes ?? 30,
        show_fan_button: currentPlugins.show_fan_button !== false,
      });
    }
  }, [mainClub]);

  const handleSelectTimeout = async (value: number) => {
    setFormData(prev => ({ ...prev, session_timeout_minutes: value }));
    localStorage.setItem('fuso_session_timeout_minutes', String(value));
    window.dispatchEvent(new CustomEvent('session-timeout-updated', { detail: { timeout: value } }));

    if (mainClub) {
      try {
        const currentPlugins = (mainClub.settings as any)?.plugins || {};
        await updateMainClub({
          id: mainClub.id,
          data: {
            plugins: {
              ...currentPlugins,
              session_timeout_minutes: value
            }
          }
        });
        toast.success(`Délai d'inactivité enregistré : ${value === 0 ? 'Désactivé' : `${value} minutes`}`);
      } catch (err: any) {
        console.error(err);
      }
    }
  };

  const handleToggleFanButton = async (value: boolean) => {
    setFormData(prev => ({ ...prev, show_fan_button: value }));

    if (mainClub) {
      try {
        const currentPlugins = (mainClub.settings as any)?.plugins || {};
        await updateMainClub({
          id: mainClub.id,
          data: {
            plugins: {
              ...currentPlugins,
              show_fan_button: value,
            }
          }
        });
        toast.success(`Bouton Fan (${value ? 'Activé' : 'Désactivé'}) pour l'application mobile fus-app`);
      } catch (err: any) {
        console.error(err);
        toast.error('Erreur lors de la mise à jour du paramètre');
      }
    }
  };

  const handleSave = async () => {
    if (!mainClub) return;
    setIsSaving(true);
    try {
      const currentPlugins = (mainClub.settings as any)?.plugins || {};
      const sanitizedData = {
        club_name: formData.club_name,
        city: formData.city,
        country: formData.country,
        logo_url: formData.logo_url,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        pagination_limit: formData.pagination_limit,
        preferred_view_mode: formData.preferred_view_mode,
        plugins: {
          ...currentPlugins,
          session_timeout_minutes: Number(formData.session_timeout_minutes),
          show_fan_button: formData.show_fan_button,
        }
      };
      await updateMainClub({ id: mainClub.id, data: sanitizedData });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const publicUrl = await storageService.uploadFile(file, 'clubs');
        setFormData({ ...formData, logo_url: publicUrl });
      } catch (error: any) {
        console.error(error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
         <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-12 w-48 rounded-2xl" />
         </div>
         <Skeleton className="h-14 w-64 rounded-2xl" />
         <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <Skeleton className="md:col-span-4 h-64 rounded-[2.5rem]" />
            <div className="md:col-span-8 space-y-8">
               <Skeleton className="h-64 rounded-[2.5rem]" />
               <Skeleton className="h-48 rounded-[2.5rem]" />
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground uppercase italic flex items-center gap-2">
            Registre du Club <Sparkles className="w-5 h-5 text-primary" />
          </h2>
          <p className="text-muted-foreground text-sm font-medium">Configurez l'identité légale et visuelle de votre organisation</p>
        </div>
        
        {activeTab === 'registry' && (
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 shadow-xl shadow-primary/20 px-8 h-12 rounded-2xl font-black uppercase tracking-widest text-xs">
            <Save className="w-4 h-4" />
            {isSaving ? 'Synchronisation...' : 'Finaliser l\'Enregistrement'}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-4 p-1 bg-secondary/20 rounded-2xl w-fit">
        <Button 
          variant={activeTab === 'registry' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('registry')}
          className="rounded-xl px-6 font-black uppercase tracking-widest text-[10px]"
        >
          <Building2 className="w-4 h-4 mr-2" />
          Informations Légales
        </Button>
        <Button 
          variant={activeTab === 'metrics' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('metrics')}
          className="rounded-xl px-6 font-black uppercase tracking-widest text-[10px]"
        >
          <Target className="w-4 h-4 mr-2" />
          Gestion des Métriques
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'registry' && (
          <motion.div 
            key="registry"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Preview Card */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="overflow-hidden border-secondary shadow-2xl relative group bg-white rounded-[2.5rem]">
                <div className="h-24 bg-gradient-to-br from-primary to-primary/60 relative overflow-hidden" />
                <CardContent className="pt-0 pb-10 px-6 text-center -mt-12 relative z-10">
                  <div className="inline-block relative mb-4">
                    <div className="w-24 h-24 rounded-[2rem] bg-white border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden">
                      {(formData.logo_url && formData.logo_url !== 'null') ? (
                        <img key={formData.logo_url} src={formData.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                      ) : (
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(formData.club_name || 'FC')}&background=0D8ABC&color=fff&size=150`} alt="Logo" className="w-full h-full object-contain rounded-[2rem]" />
                      )}
                    </div>
                    <Badge className="absolute -bottom-2 right-1/2 translate-x-1/2 px-4 py-1 shadow-md border-2 border-white bg-primary text-[10px] font-black uppercase italic tracking-widest">
                      {formData.city || 'SIÈGE'}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-2xl font-black tracking-tighter text-foreground uppercase italic truncate px-2">{formData.club_name || 'Nom du Club'}</h3>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center justify-center gap-1.5 opacity-60">
                      <Globe className="w-3 h-3" /> {formData.country || 'Pays'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Configuration Form */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="border shadow-sm rounded-[2.5rem] overflow-hidden">
                <CardHeader className="border-b bg-secondary/10 p-8">
                  <CardTitle className="text-lg flex items-center gap-3 font-black uppercase tracking-tighter">
                    <Building2 className="w-6 h-6 text-primary" /> Informations Fondamentales
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nom Complet du Club</label>
                      <Input value={formData.club_name} onChange={(e) => setFormData({ ...formData, club_name: e.target.value })} className="h-12 rounded-xl bg-secondary/30 border-secondary font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Ville du Siège</label>
                      <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="h-12 rounded-xl bg-secondary/30 border-secondary font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pays</label>
                      <Input value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="h-12 rounded-xl bg-secondary/30 border-secondary font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identité Visuelle (Logo/Écusson)</label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setMediaPickerOpen(true)}
                          className="flex-1 h-12 rounded-xl bg-slate-50 hover:bg-primary/10 border-slate-200 hover:border-primary/40 font-bold text-xs gap-2"
                        >
                          <ImageIcon className="w-4 h-4 text-primary" />
                          Médiathèque
                        </Button>
                        <label htmlFor="logo-upload" className="flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-secondary/30 border-2 border-dashed border-secondary cursor-pointer font-bold text-xs hover:border-primary/50 transition-all">
                          <Camera className="w-4 h-4 text-primary" />
                          <span>{isUploading ? 'Chargement...' : 'Uploader'}</span>
                          <input type="file" id="logo-upload" hidden accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={handleLogoUpload} />
                        </label>
                        {formData.logo_url && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setFormData({ ...formData, logo_url: '' })}
                            className="h-12 w-12 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                            title="Supprimer le logo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm rounded-[2.5rem] overflow-hidden">
                <CardHeader className="border-b bg-secondary/10 p-8">
                  <CardTitle className="text-lg flex items-center gap-3 font-black uppercase tracking-tighter">
                    <Palette className="w-6 h-6 text-primary" /> Charte Graphique
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex items-center gap-4">
                      <input type="color" value={formData.primary_color} onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })} className="w-14 h-14 rounded-xl cursor-pointer border-none shadow-lg" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Couleur Primaire</p>
                        <code className="text-xs font-bold opacity-60 uppercase">{formData.primary_color}</code>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <input type="color" value={formData.secondary_color} onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })} className="w-14 h-14 rounded-xl cursor-pointer border-none shadow-lg" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Couleur Secondaire</p>
                        <code className="text-xs font-bold opacity-60 uppercase">{formData.secondary_color}</code>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sécurité des Sessions & Déconnexion Automatique */}
              <Card className="border shadow-sm rounded-[2.5rem] overflow-hidden">
                <CardHeader className="border-b bg-secondary/10 p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-lg flex items-center gap-3 font-black uppercase tracking-tighter">
                      <ShieldCheck className="w-6 h-6 text-primary" /> Sécurité des Sessions & Inactivité
                    </CardTitle>
                    <Badge variant="outline" className="w-fit bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-xs py-1 px-3 rounded-full flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Actif : {Number(formData.session_timeout_minutes) === 0 ? 'Désactivé' : `${formData.session_timeout_minutes} min`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      Délai de déconnexion automatique en cas d'inactivité
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {[
                        { label: '15 min (Max)', value: 15 },
                        { label: '30 min (Recommandé)', value: 30 },
                        { label: '1 heure', value: 60 },
                        { label: '2 heures', value: 120 },
                        { label: 'Désactivé', value: 0 },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectTimeout(opt.value)}
                          className={`p-3 rounded-2xl text-xs font-bold border transition-all text-center cursor-pointer ${
                            Number(formData.session_timeout_minutes) === opt.value
                              ? 'bg-primary text-primary-foreground border-primary shadow-md'
                              : 'bg-secondary/30 text-muted-foreground border-border hover:text-foreground'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">
                      🔒 En cas d'inactivité prolongée (aucun clic, saisie ou navigation), l'utilisateur sera automatiquement déconnecté et sa session d'audit sera clôturée.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Configuration Mobile fus-app : Bouton Fan */}
              <Card className="border shadow-sm rounded-[2.5rem] overflow-hidden">
                <CardHeader className="border-b bg-secondary/10 p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-lg flex items-center gap-3 font-black uppercase tracking-tighter">
                      <Smartphone className="w-6 h-6 text-primary" /> Application Mobile (fus-app)
                    </CardTitle>
                    <Badge variant="outline" className={`w-fit font-bold text-xs py-1 px-3 rounded-full flex items-center gap-1.5 ${
                      formData.show_fan_button
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${formData.show_fan_button ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      {formData.show_fan_button ? 'Bouton Fan : Activé' : 'Bouton Fan : Désactivé'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-secondary/20 border border-secondary/40">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <h4 className="font-black text-sm uppercase tracking-wide">
                          Bouton d'Accès « Pour les fans »
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground max-w-xl">
                        Contrôle l'affichage du bouton dédié aux supporters et fans sur l'écran d'accueil de l'application mobile. Si désactivé, le bouton disparaît et l'accès est strictement réservé aux comptes Pro / Staff.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold text-muted-foreground">
                        {formData.show_fan_button ? 'Affiché' : 'Masqué'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={formData.show_fan_button}
                        onClick={() => handleToggleFanButton(!formData.show_fan_button)}
                        className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner ${
                          formData.show_fan_button ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            formData.show_fan_button ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {activeTab === 'metrics' && (
            <motion.div
              key="metrics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <MetricsManagement />
            </motion.div>
          )}
        </AnimatePresence>

      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
        title="Affecter un logo depuis la Médiathèque"
      />
    </div>
  );
};

export default ClubSettings;
