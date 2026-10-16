import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Camera, Upload, Loader2, ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import ImageCropperModal from '../../../components/ImageCropperModal';
import { MediaPickerModal } from '../../media-management/components/MediaPickerModal';
import { storageService } from '../../../services/storageService';
import type { Arbitre, ArbitreFormData, RolePrincipalArbitre, GradeArbitre, StatutArbitre } from '../../../types/arbitre';

interface ArbitreFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: ArbitreFormData) => Promise<void>;
  initialData?: Arbitre | null;
}

export const ArbitreFormModal: React.FC<ArbitreFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState<ArbitreFormData>({
    nom: '',
    prenom: '',
    date_naissance: '',
    nationalite: 'Maroc',
    numero_licence: '',
    email: '',
    telephone: '',
    role_principal: 'central',
    grade: 'Régional',
    statut: 'actif',
    photo_url: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Image cropping state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        nom: initialData.nom,
        prenom: initialData.prenom,
        date_naissance: initialData.date_naissance || '',
        nationalite: initialData.nationalite || 'Maroc',
        numero_licence: initialData.numero_licence,
        email: initialData.email || '',
        telephone: initialData.telephone || '',
        role_principal: initialData.role_principal,
        grade: initialData.grade,
        statut: initialData.statut,
        photo_url: initialData.photo_url || '',
      });
    } else {
      setFormData({
        nom: '',
        prenom: '',
        date_naissance: '',
        nationalite: 'Maroc',
        numero_licence: `ARB-2024-${Math.floor(100 + Math.random() * 900)}`,
        email: '',
        telephone: '',
        role_principal: 'central',
        grade: 'Régional',
        statut: 'actif',
        photo_url: '',
      });
    }
    setErrorMsg(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedFileUrl(reader.result as string);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploading(true);
    try {
      const file = new File([croppedBlob], `arbitre-${Date.now()}.png`, { type: 'image/png' });
      try {
        const publicUrl = await storageService.uploadFile(file, 'arbitres');
        setFormData(prev => ({ ...prev, photo_url: publicUrl }));
      } catch (storageErr) {
        // Fallback to Data URL if offline or bucket missing
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, photo_url: reader.result as string }));
        };
        reader.readAsDataURL(croppedBlob);
      }
    } catch (err: any) {
      console.error('Error handling cropped image:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim() || !formData.prenom.trim() || !formData.numero_licence.trim()) {
      setErrorMsg('Veuillez remplir les champs obligatoires (Nom, Prénom, Licence).');
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-card text-card-foreground border border-border rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-secondary/20">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground tracking-tight">
                    {initialData ? 'Modifier la fiche d\'arbitre' : 'Ajouter un officiel d\'arbitrage'}
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium">
                    Remplissez les informations et téléchargez la photo de profil
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center space-x-2 text-destructive text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Photo Upload & Preview Section */}
              <div className="flex items-center gap-6 p-4 rounded-2xl bg-secondary/20 border border-border">
                <div className="relative group shrink-0">
                  {formData.photo_url ? (
                    <img
                      src={formData.photo_url}
                      alt="Aperçu photo"
                      className="w-20 h-20 rounded-2xl object-cover ring-2 ring-primary/20 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-2xl">
                      {formData.prenom?.[0] || 'A'}
                    </div>
                  )}

                  <label
                    htmlFor="arbitre-photo-upload"
                    className="absolute inset-0 bg-black/50 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-xs font-bold gap-1"
                  >
                    <Camera className="w-4 h-4" />
                  </label>
                  <input
                    id="arbitre-photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-foreground">
                    Photo Officielle de l'Arbitre
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMediaPickerOpen(true)}
                      className="h-8 px-3 text-xs gap-1.5 rounded-xl font-bold bg-slate-50 hover:bg-primary/10 border-slate-200 hover:border-primary/40 text-slate-800"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-primary" />
                      <span>Médiathèque</span>
                    </Button>

                    <label
                      htmlFor="arbitre-photo-upload-btn"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold cursor-pointer transition-all shadow-md shadow-primary/20"
                    >
                      {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>Téléverser / Rogner</span>
                    </label>
                    <input
                      id="arbitre-photo-upload-btn"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {formData.photo_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                        className="h-8 px-2.5 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl flex items-center gap-1 font-bold"
                        title="Supprimer la photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Format JPG ou PNG. Vous pourrez recadrer l'image au format portrait carré.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Prénom */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Prénom <span className="text-primary">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    placeholder="Ex: Redouane"
                    className="bg-secondary/30 border-transparent focus:bg-background h-11 rounded-xl font-medium"
                  />
                </div>

                {/* Nom */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Nom <span className="text-primary">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    placeholder="Ex: Ghayat"
                    className="bg-secondary/30 border-transparent focus:bg-background h-11 rounded-xl font-medium"
                  />
                </div>

                {/* Numéro de Licence */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    N° de Licence <span className="text-primary">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    value={formData.numero_licence}
                    onChange={(e) => setFormData({ ...formData, numero_licence: e.target.value })}
                    placeholder="ARB-2024-XXX"
                    className="bg-secondary/30 border-transparent focus:bg-background h-11 rounded-xl font-medium font-mono"
                  />
                </div>

                {/* Date de Naissance */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Date de naissance
                  </label>
                  <Input
                    type="date"
                    value={formData.date_naissance || ''}
                    onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                    className="bg-secondary/30 border-transparent focus:bg-background h-11 rounded-xl font-medium"
                  />
                </div>

                {/* Rôle Principal */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Rôle Principal
                  </label>
                  <select
                    value={formData.role_principal}
                    onChange={(e) =>
                      setFormData({ ...formData, role_principal: e.target.value as RolePrincipalArbitre })
                    }
                    className="w-full h-11 px-3 bg-secondary/30 border border-transparent focus:border-primary focus:bg-background rounded-xl text-xs font-bold text-foreground outline-none transition-all"
                  >
                    <option value="central">Arbitre Principal</option>
                    <option value="assistant">Arbitre Assistant</option>
                    <option value="commissaire">Commissaire du Match / Délégué</option>
                    <option value="var">Arbitre VAR (Vidéo Assistance)</option>
                    <option value="quatrieme">4ème Officiel / Arbitre Quatrième</option>
                  </select>
                </div>

                {/* Grade */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Grade / Niveau
                  </label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value as GradeArbitre })}
                    className="w-full h-11 px-3 bg-secondary/30 border border-transparent focus:border-primary focus:bg-background rounded-xl text-xs font-bold text-foreground outline-none transition-all"
                  >
                    <option value="FIFA">FIFA International</option>
                    <option value="National 1">National 1</option>
                    <option value="Régional">Régional</option>
                    <option value="District">District</option>
                  </select>
                </div>

                {/* Statut */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Statut
                  </label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value as StatutArbitre })}
                    className="w-full h-11 px-3 bg-secondary/30 border border-transparent focus:border-primary focus:bg-background rounded-xl text-xs font-bold text-foreground outline-none transition-all"
                  >
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                    <option value="suspendu">Suspendu</option>
                    <option value="retraite">Retraité</option>
                  </select>
                </div>

                {/* Nationalité */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Nationalité
                  </label>
                  <Input
                    type="text"
                    value={formData.nationalite || 'Maroc'}
                    onChange={(e) => setFormData({ ...formData, nationalite: e.target.value })}
                    placeholder="Ex: Maroc"
                    className="bg-secondary/30 border-transparent focus:bg-background h-11 rounded-xl font-medium"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ex: arbitre@frmf.ma"
                    className="bg-secondary/30 border-transparent focus:bg-background h-11 rounded-xl font-medium"
                  />
                </div>

                {/* Téléphone */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Téléphone
                  </label>
                  <Input
                    type="text"
                    value={formData.telephone || ''}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    placeholder="+212 6..."
                    className="bg-secondary/30 border-transparent focus:bg-background h-11 rounded-xl font-medium"
                  />
                </div>
              </div>

              {/* Photo URL Direct Input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  URL Photo Directe (Optionnel)
                </label>
                <Input
                  type="text"
                  value={formData.photo_url || ''}
                  onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                  placeholder="https://..."
                  className="bg-secondary/30 border-transparent focus:bg-background h-11 rounded-xl font-medium"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-5 border-t border-border mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="rounded-xl font-bold text-xs"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || isUploading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 font-bold text-xs shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                  {submitting
                    ? 'Enregistrement...'
                    : initialData
                    ? 'Mettre à jour'
                    : 'Créer l\'arbitre'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        imageSrc={selectedFileUrl}
        onCropComplete={handleCropComplete}
        aspect={1}
      />

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => setFormData(prev => ({ ...prev, photo_url: url }))}
        title="Affecter une photo depuis la Médiathèque"
      />
    </>
  );
};
