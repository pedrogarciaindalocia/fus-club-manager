import React, { useState, useRef } from 'react';
import { useStore } from '../../hooks/useStore';
import { storageService } from '../../services/storageService';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../../utils/cropImage';
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Upload,
  ExternalLink,
  LayoutTemplate,
  Eye,
  EyeOff,
  ImageIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Banner } from '../../types';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { MediaPickerModal } from '../media-management/components/MediaPickerModal';

const StoreManagement: React.FC = () => {
  const {
    banners,
    isLoadingBanners,
    addBanner,
    updateBanner,
    deleteBanner,
  } = useStore();

  const [showForm, setShowForm] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Banner>>({
    title: '',
    image_url: '',
    target_url: '',
    is_active: true,
    display_order: 0,
  });

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);

  const handleOpenAdd = () => {
    setSelectedBanner(null);
    setFormData({
      title: '',
      image_url: '',
      target_url: '',
      is_active: true,
      display_order: banners.length,
    });
    setShowForm(true);
  };

  const handleOpenEdit = (banner: Banner) => {
    setSelectedBanner(banner);
    setFormData({
      title: banner.title || '',
      image_url: banner.image_url,
      target_url: banner.target_url || '',
      is_active: banner.is_active,
      display_order: banner.display_order,
    });
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    if (imageToCrop && croppedAreaPixels) {
      setUploadingImage(true);
      try {
        const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
        const file = new File([croppedBlob], 'banner.jpg', { type: 'image/jpeg' });
        
        const imageUrl = await storageService.uploadFile(file, 'banners');
        setFormData({ ...formData, image_url: imageUrl });
        setIsCropping(false);
        setImageToCrop(null);
        toast.success('Image recadrée et uploadée');
      } catch (e: any) {
        console.error(e);
        toast.error('Erreur lors du recadrage: ' + e.message);
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleSave = async () => {
    if (!formData.image_url) {
      toast.error('Une image est requise');
      return;
    }

    try {
      if (selectedBanner) {
        await updateBanner({ id: selectedBanner.id, data: formData });
      } else {
        await addBanner(formData as Omit<Banner, 'id' | 'created_at' | 'updated_at'>);
      }
      setShowForm(false);
    } catch (error: any) {
      // toast.error handled by hook
    }
  };

  const toggleStatus = async (banner: Banner) => {
    await updateBanner({ id: banner.id, data: { is_active: !banner.is_active } });
  };

  if (isLoadingBanners) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-11 w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground uppercase italic flex items-center gap-2">
            Store & Ads <LayoutTemplate className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-muted-foreground text-sm font-medium">
            Gérez vos bannières publicitaires pour l'application mobile
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="gap-2 shadow-lg shadow-primary/20 h-11 px-6 font-bold uppercase tracking-widest text-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Bannière
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="rounded-[2.5rem] border shadow-xl overflow-hidden bg-white">
              <div className="p-8 border-b bg-gradient-to-r from-primary/5 to-transparent flex justify-between items-center">
                <h3 className="text-xl font-black uppercase italic">
                  {selectedBanner ? 'Modifier la bannière' : 'Nouvelle bannière'}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="rounded-xl">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Titre (Interne)</label>
                  <Input
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Promo Boutique Été"
                    className="h-12 rounded-xl bg-secondary/30 border-transparent focus:bg-white transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lien de redirection (Target URL)</label>
                  <Input
                    value={formData.target_url || ''}
                    onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                    placeholder="https://..."
                    className="h-12 rounded-xl bg-secondary/30 border-transparent focus:bg-white transition-all font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Image de la bannière (Format Mobile)</label>
                  <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleImageUpload}
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    className="hidden"
                  />
                  {formData.image_url ? (
                    <div className="space-y-2">
                      <div className="relative rounded-2xl overflow-hidden aspect-[21/9] bg-secondary/30 border shadow-sm">
                        <img src={formData.image_url} alt="Banner" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: '' })}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-md"
                          title="Supprimer l'image"
                        >
                          <X className="w-4 h-4" />
                        </button>
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => imageInputRef.current?.click()}
                          className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 border-slate-200 hover:bg-slate-100 text-slate-700"
                        >
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span>Remplacer fichier</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => setMediaPickerOpen(true)}
                        className="flex-1 h-32 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary/10 transition-all flex flex-col items-center justify-center gap-2 text-primary font-bold text-xs p-4 cursor-pointer"
                      >
                        <ImageIcon className="w-6 h-6" />
                        <span>Choisir dans la Médiathèque</span>
                        <span className="text-[10px] text-muted-foreground font-normal">Images du Club</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="flex-1 h-32 rounded-2xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-secondary/30 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground disabled:opacity-50 text-xs font-bold p-4 cursor-pointer"
                      >
                        {uploadingImage ? (
                          <>
                            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            <span className="text-xs font-medium">Upload en cours...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-slate-500" />
                            <span>Téléverser un fichier</span>
                            <span className="text-[10px] text-muted-foreground font-normal">Recommandé: 1200x300px</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                   <button
                    onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-xs font-bold uppercase tracking-widest ${
                      formData.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                   >
                    {formData.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {formData.is_active ? 'Active' : 'Inactive'}
                   </button>
                </div>

                <div className="pt-6 border-t">
                  <Button onClick={handleSave} className="w-full h-12 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                    Enregistrer la bannière
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {banners.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground bg-white rounded-[2.5rem] border border-dashed">
                <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-medium">Aucune bannière publicitaire pour le moment</p>
                <Button variant="link" onClick={handleOpenAdd} className="mt-2 text-primary">Ajouter votre première publicité</Button>
              </div>
            ) : (
              banners.map((banner) => (
                <Card key={banner.id} className="rounded-[2rem] border bg-white overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="aspect-[21/9] bg-secondary/30 relative overflow-hidden">
                    <img src={banner.image_url} alt={banner.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                       {banner.target_url && (
                         <a href={banner.target_url} target="_blank" rel="noreferrer" className="text-white text-xs font-bold flex items-center gap-1 hover:underline">
                           <ExternalLink className="w-3 h-3" />
                           {banner.target_url}
                         </a>
                       )}
                    </div>
                    {!banner.is_active && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                        <Badge variant="secondary" className="gap-1.5 font-black uppercase tracking-widest">
                          <EyeOff className="w-3 h-3" /> Inactif
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{banner.title || 'Sans titre'}</h3>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                          Créé le {new Date(banner.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={banner.is_active ? 'default' : 'outline'} className={banner.is_active ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                        {banner.is_active ? 'Live' : 'Pause'}
                      </Badge>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button variant="outline" size="sm" onClick={() => handleOpenEdit(banner)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                        <Edit2 className="w-3 h-3 mr-1" /> Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(banner)}
                        className={`rounded-xl font-bold uppercase tracking-widest text-[10px] ${banner.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                      >
                        {banner.is_active ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                        {banner.is_active ? 'Désactiver' : 'Activer'}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteBanner(banner.id)} className="rounded-xl text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Recadrage */}
      <AnimatePresence>
        {isCropping && imageToCrop && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10"
            >
              <div className="p-6 border-b flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
                <div>
                  <h3 className="text-xl font-black uppercase italic">Recadrer la photo</h3>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Format optimisé : 1200 x 300 pixels</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsCropping(false)}
                  className="rounded-xl"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <div className="relative h-[400px] bg-slate-900">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={4 / 1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center gap-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground w-12">Zoom</span>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-xs font-black tabular-nums">{zoom.toFixed(1)}x</span>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setIsCropping(false)}
                    className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleCropSave}
                    disabled={uploadingImage}
                    className="px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95 gap-2"
                  >
                    {uploadingImage ? 'Traitement...' : 'Valider et Upload'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sélecteur de Médias Centralisé */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
        title="Affecter une bannière depuis la Médiathèque"
      />
    </div>
  );
};

export default StoreManagement;
