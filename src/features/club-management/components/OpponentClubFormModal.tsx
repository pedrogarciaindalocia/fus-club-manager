 import React, { useState, useEffect } from 'react';
import { useClubData } from '../../../hooks/useClubData';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { 
  Building2, 
  Camera, 
  X, 
  Sparkles, 
  Loader2,
  ImageIcon,
  Trash2
} from 'lucide-react';
import type { Club } from '../../../types';
import { storageService } from '../../../services/storageService';
import { MediaPickerModal } from '../../media-management/components/MediaPickerModal';
import { opponentPlayerService } from '../../../services/opponentPlayerService';
import { build22FakeOpponentPlayers } from '../../../utils/generateFakeOpponentPlayers';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import { GEOGRAPHY_DATA } from '../../../constants/geography';

interface OpponentClubFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  club?: Club | null;
  initialName?: string;
  onSuccess?: (club: Club) => void;
}

export const OpponentClubFormModal: React.FC<OpponentClubFormModalProps> = ({
  isOpen,
  onClose,
  club = null,
  initialName = '',
  onSuccess,
}) => {
  const { mainClub, addOpponent, updateOpponent } = useClubData();

  const [formData, setFormData] = useState({
    name: '',
    city: '',
    country: '',
    continent: '',
    logo_url: '',
  });

  const [selectedContinent, setSelectedContinent] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoGenerate22, setAutoGenerate22] = useState(true);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Sync form state with incoming club or initialName
  useEffect(() => {
    if (club) {
      setFormData({
        name: club.name || '',
        city: club.city || '',
        country: club.country || '',
        continent: club.continent || '',
        logo_url: club.logo_url || '',
      });

      let foundCont = club.continent || '';
      let foundCountry = club.country || '';

      if (!foundCont && foundCountry) {
        for (const [c, countries] of Object.entries(GEOGRAPHY_DATA)) {
          if (Object.keys(countries).includes(foundCountry)) {
            foundCont = c;
            break;
          }
        }
      }

      setSelectedContinent(foundCont);
      setSelectedCountry(foundCountry);
      setAutoGenerate22(false);
    } else {
      setFormData({
        name: initialName || '',
        city: 'Rabat',
        country: 'Maroc',
        continent: 'AFRIQUE',
        logo_url: '',
      });
      setSelectedContinent('AFRIQUE');
      setSelectedCountry('Maroc');
      setAutoGenerate22(true);
    }
  }, [club, initialName, isOpen]);

  if (!isOpen) return null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const publicUrl = await storageService.uploadFile(file, 'clubs');
        setFormData(prev => ({ ...prev, logo_url: publicUrl }));
        toast.success('Logo du club téléversé avec succès !');
      } catch (error) {
        console.error('Failed to upload logo:', error);
        toast.error('Erreur lors du téléversement du logo');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      toast.error('Le nom du club est obligatoire');
      return;
    }

    if (trimmedName.toLowerCase() === mainClub?.name?.toLowerCase().trim()) {
      toast.error('Ce club est identique au club principal — impossible de l\'ajouter comme adversaire.');
      return;
    }

    setIsSaving(true);
    try {
      let savedClub: Club;

      if (club) {
        savedClub = await updateOpponent({ id: club.id, data: formData });
        toast.success(`Club "${savedClub.name}" mis à jour avec succès !`);
      } else {
        savedClub = await addOpponent({
          ...formData,
          name: trimmedName,
          is_active: true,
        } as Omit<Club, 'id'>);

        if (autoGenerate22 && savedClub?.id) {
          try {
            const fakeSquad = build22FakeOpponentPlayers(savedClub.id, 'SENIOR');
            await opponentPlayerService.addManyOpponentPlayers(fakeSquad);
            toast.success(`Club créé et 22 joueurs fictifs générés avec succès !`);
          } catch (err) {
            console.error('Erreur lors de la génération de l\'effectif:', err);
          }
        } else {
          toast.success(`Club adversaire "${savedClub.name}" ajouté avec succès !`);
        }
      }

      if (onSuccess) {
        onSuccess(savedClub);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(`Erreur : ${err.message || 'Impossible d\'enregistrer le club'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {club ? 'Modifier la Fiche Club Adversaire' : 'Ajouter un Club Adversaire'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Formulaire officiel de la base de données des clubs adversaires
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 rounded-xl text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          
          {/* Logo Upload Section */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-inner">
                <img 
                  src={(formData.logo_url && formData.logo_url !== 'null') 
                    ? formData.logo_url 
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'Opponent')}&background=020617&color=fff&size=200`} 
                  alt="Preview" 
                  className={cn("w-full h-full object-contain p-2", isUploading && "opacity-30")} 
                />
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                )}
              </div>

              <Input 
                type="file" 
                accept="image/*" 
                id="modal-club-logo" 
                className="hidden" 
                onChange={handleLogoUpload}
              />
              <label 
                htmlFor="modal-club-logo"
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all"
                title="Téléverser un logo"
              >
                <Camera className="w-4 h-4" />
              </label>
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <h4 className="text-xs font-bold text-foreground">Écusson / Logo du Club</h4>
              <p className="text-[11px] text-muted-foreground">
                Format carré JPG, PNG ou WebP conseillé (max 10 Mo).
              </p>
              <div className="flex items-center gap-2 justify-center sm:justify-start pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaPickerOpen(true)}
                  className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 bg-white dark:bg-slate-700 hover:bg-primary/10 border-slate-200 dark:border-slate-600 hover:border-primary/40 text-slate-800 dark:text-slate-200"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                  <span>Médiathèque</span>
                </Button>
                {formData.logo_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
                    className="h-8 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                    title="Supprimer le logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Club Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nom Officiel du Club *
            </label>
            <Input 
              required
              placeholder="Ex: Wydad Athletic Club, AS FAR, Raja CA..."
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="h-11 px-4 rounded-xl text-xs font-bold"
            />
          </div>

          {/* Geographic Cascading Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Continent */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Continent
              </label>
              <select 
                value={selectedContinent}
                onChange={(e) => {
                  const cont = e.target.value;
                  setSelectedContinent(cont);
                  setSelectedCountry('');
                  setFormData(prev => ({ ...prev, continent: cont, country: '', city: '' }));
                }}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold cursor-pointer"
              >
                <option value="">Sélectionner...</option>
                {Object.keys(GEOGRAPHY_DATA).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Pays */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Pays
              </label>
              <select 
                disabled={!selectedContinent}
                value={selectedCountry}
                onChange={(e) => {
                  const country = e.target.value;
                  setSelectedCountry(country);
                  setFormData(prev => ({ ...prev, country, city: '' }));
                }}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <option value="">Sélectionner...</option>
                {selectedContinent && GEOGRAPHY_DATA[selectedContinent] && Object.keys(GEOGRAPHY_DATA[selectedContinent]).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Ville */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ville
              </label>
              <select 
                disabled={!selectedCountry}
                value={formData.city || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <option value="">Sélectionner...</option>
                {selectedContinent && selectedCountry && GEOGRAPHY_DATA[selectedContinent]?.[selectedCountry]?.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
                <option value="Autre">Autre...</option>
              </select>
            </div>
          </div>

          {/* Alternative Logo URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              URL Directe du Logo (Alternative)
            </label>
            <Input 
              placeholder="https://domaine.com/logos/club.png"
              value={formData.logo_url}
              onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
              className="h-10 px-4 rounded-xl text-xs font-medium"
            />
          </div>

          {/* Checkbox 22 Players (for new clubs) */}
          {!club && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-emerald-950 dark:text-emerald-200">
                    Générer un effectif de 22 joueurs fictifs
                  </p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                    Génère immédiatement 22 joueurs avec maillots (#1 à #22), postes et tailles.
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

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose} 
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving || isUploading || !formData.name.trim()}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {club ? 'Mettre à jour le Club' : 'Ajouter le Club Adversaire'}
            </Button>
          </div>
        </form>
      </div>

      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
        title="Affecter un logo depuis la Médiathèque"
      />
    </div>
  );
};

export default OpponentClubFormModal;
