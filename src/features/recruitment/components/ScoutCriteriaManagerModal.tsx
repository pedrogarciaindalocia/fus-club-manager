import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit3,
  Check,
  RotateCcw,
  Sliders,
  ShieldAlert,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  SCOUT_POSITION_PROFILES,
  getCustomScoutPositionConfigs,
  addScoutCriterion,
  updateScoutCriterion,
  deleteScoutCriterion,
  resetToDefaultScoutConfigs,
  type ScoutPillarKey,
  type ScoutPositionConfig
} from '../constants/scoutCriteriaByPosition';
import { cn } from '../../../lib/utils';
import { usePermissions } from '../../../context/PermissionsContext';

interface ScoutCriteriaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPositionCode?: string;
}

const PILLARS: { key: ScoutPillarKey; label: string; icon: string; description: string; weight: string }[] = [
  { key: 'technique', label: 'Technique', icon: '⚽', description: 'Maîtrise du ballon, gestes techniques et passes', weight: '30%' },
  { key: 'tactique', label: 'Tactique', icon: '🧭', description: 'Placement, vision de jeu, intelligence situationnelle', weight: '25%' },
  { key: 'physique', label: 'Physique', icon: '🏃', description: 'Vitesse, explosivité, endurance et puissance', weight: '25%' },
  { key: 'mental', label: 'Mental', icon: '🧠', description: 'Concentration, leadership, combativité et résilience', weight: '20%' },
];

export const ScoutCriteriaManagerModal: React.FC<ScoutCriteriaManagerModalProps> = ({
  isOpen,
  onClose,
  defaultPositionCode = 'GK',
}) => {
  const { authState } = usePermissions();
  const isSuperAdmin = Boolean(
    (authState?.roles ?? []).includes('super_admin') ||
    authState?.user?.system_role?.toLowerCase() === 'super_admin' ||
    authState?.user?.system_role?.toLowerCase() === 'admin'
  );

  const [selectedPosition, setSelectedPosition] = useState<string>(defaultPositionCode);
  const [selectedPillar, setSelectedPillar] = useState<ScoutPillarKey>('technique');
  const [configs, setConfigs] = useState<Record<string, ScoutPositionConfig>>({});
  const [newCriterionName, setNewCriterionName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Charger les configurations personnalisées
  const loadConfigs = () => {
    setConfigs(getCustomScoutPositionConfigs());
  };

  useEffect(() => {
    if (isOpen) {
      loadConfigs();
      if (defaultPositionCode) {
        setSelectedPosition(defaultPositionCode);
      }
      setEditingIndex(null);
      setEditingText('');
      setNewCriterionName('');
    }
  }, [isOpen, defaultPositionCode]);

  if (!isOpen) return null;

  // Sécurité d'accès : Réservé strictement au Super Admin
  if (!isSuperAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl border border-rose-200">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900">Accès Refusé</h3>
          <p className="text-sm text-slate-600">
            La personnalisation et la modification des grilles de critères de détection sont réservées exclusivement à la session <strong>Super Administrateur</strong>.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  const currentConfig = configs[selectedPosition] || SCOUT_POSITION_PROFILES[selectedPosition] || SCOUT_POSITION_PROFILES['CM'];
  const currentCriteriaList = currentConfig.criteria[selectedPillar] || [];

  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCriterionName.trim();
    if (!trimmed) {
      toast.error('Veuillez saisir un nom de critère.');
      return;
    }

    const success = addScoutCriterion(selectedPosition, selectedPillar, trimmed);
    if (success) {
      toast.success(`Critère "${trimmed}" ajouté avec succès pour ${currentConfig.name} (${selectedPillar}).`);
      setNewCriterionName('');
      loadConfigs();
    } else {
      toast.error('Ce critère existe déjà pour ce profil et ce pilier.');
    }
  };

  const handleStartEdit = (index: number, currentName: string) => {
    setEditingIndex(index);
    setEditingText(currentName);
  };

  const handleSaveEdit = (oldName: string) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      toast.error('Le nom du critère ne peut pas être vide.');
      return;
    }

    if (trimmed === oldName) {
      setEditingIndex(null);
      return;
    }

    const success = updateScoutCriterion(selectedPosition, selectedPillar, oldName, trimmed);
    if (success) {
      toast.success(`Critère mis à jour : "${trimmed}".`);
      setEditingIndex(null);
      loadConfigs();
    } else {
      toast.error('Un critère portant ce nom existe déjà.');
    }
  };

  const handleDelete = (criterionName: string) => {
    if (currentCriteriaList.length <= 1) {
      toast.error('Impossible de supprimer le dernier critère de ce pilier.');
      return;
    }

    const success = deleteScoutCriterion(selectedPosition, selectedPillar, criterionName);
    if (success) {
      toast.success(`Critère "${criterionName}" retiré.`);
      loadConfigs();
    } else {
      toast.error('Erreur lors de la suppression.');
    }
  };

  const handleResetCurrentPosition = () => {
    resetToDefaultScoutConfigs(selectedPosition);
    toast.success(`Les critères de ${currentConfig.name} ont été réinitialisés aux standards officiels FUS.`);
    setIsResetConfirmOpen(false);
    loadConfigs();
  };

  const handleResetAllPositions = () => {
    resetToDefaultScoutConfigs();
    toast.success('Tous les profils de postes ont été réinitialisés aux critères FUS d’origine.');
    setIsResetConfirmOpen(false);
    loadConfigs();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Gestionnaire des Critères de Détection
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Personnalisez, ajoutez ou modifiez les critères d'évaluation des 4 piliers par poste.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-bold border border-white/10 transition-all flex items-center gap-1.5"
              title="Réinitialiser aux valeurs par défaut"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Réinitialiser</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Positions Selector Tabs */}
        <div className="border-b bg-slate-50 p-3 overflow-x-auto flex gap-2 custom-scrollbar">
          {Object.entries(SCOUT_POSITION_PROFILES).map(([code, pos]) => {
            const isSelected = selectedPosition === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setSelectedPosition(code);
                  setEditingIndex(null);
                }}
                className={cn(
                  "px-3 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 border cursor-pointer",
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                )}
              >
                <span>{pos.emoji}</span>
                <span>{pos.code}</span>
                <span className="hidden md:inline text-[11px] font-normal opacity-80">({pos.name})</span>
              </button>
            );
          })}
        </div>

        {/* Pillars Switcher */}
        <div className="px-6 pt-4 pb-2 border-b bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentConfig.emoji}</span>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  {currentConfig.name} ({currentConfig.code})
                </h4>
                <p className="text-[11px] text-slate-500">{currentConfig.description}</p>
              </div>
            </div>
            <div className="text-xs font-bold text-slate-500 hidden sm:block">
              {Object.values(currentConfig.criteria).reduce((sum, list) => sum + list.length, 0)} critères au total
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PILLARS.map((p) => {
              const count = currentConfig.criteria[p.key]?.length || 0;
              const isSelected = selectedPillar === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setSelectedPillar(p.key);
                    setEditingIndex(null);
                  }}
                  className={cn(
                    "p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer",
                    isSelected
                      ? "bg-primary/5 border-primary ring-2 ring-primary/20"
                      : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{p.icon}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-black",
                      isSelected ? "bg-primary text-white" : "bg-slate-200 text-slate-700"
                    )}>
                      {count} critères
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="text-xs font-black text-slate-900">{p.label}</div>
                    <div className="text-[10px] text-slate-500">Pondération {p.weight}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
          {/* Add Criterion Form */}
          <form onSubmit={handleAddCriterion} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={`Nouveau critère ${selectedPillar} pour ${currentConfig.code} (ex: "Jeu sous pression")...`}
                value={newCriterionName}
                onChange={(e) => setNewCriterionName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-slate-900"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter au pilier</span>
            </button>
          </form>

          {/* List of current criteria */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
              <span>Critères actuels ({currentCriteriaList.length})</span>
              <span>Actions Super Admin</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentCriteriaList.map((crit, index) => {
                const isEditing = editingIndex === index;

                return (
                  <div
                    key={`${crit}-${index}`}
                    className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex items-center justify-between gap-2 shadow-xs group"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(crit);
                            if (e.key === 'Escape') setEditingIndex(null);
                          }}
                          autoFocus
                          className="w-full px-2.5 py-1 text-xs rounded-lg border border-primary focus:outline-none bg-primary/5 text-slate-900 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(crit)}
                          className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition"
                          title="Enregistrer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                          title="Annuler"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-5 h-5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800 truncate" title={crit}>
                            {crit}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(index, crit)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                            title="Modifier le nom du critère"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(crit)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Supprimer ce critère"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Les modifications sont enregistrées en direct et appliquées à tous les formulaires d'évaluation.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
          >
            Fermer
          </button>
        </div>

        {/* Modal Confirmation de Réinitialisation */}
        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">Réinitialiser les Critères</h4>
                  <p className="text-xs text-slate-500">Restaurer les grilles officielles du FUS</p>
                </div>
              </div>

              <p className="text-xs text-slate-600">
                Voulez-vous réinitialiser uniquement le poste en cours (<strong>{currentConfig.name}</strong>) ou l'ensemble des 9 profils de postes ?
              </p>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetCurrentPosition}
                  className="w-full py-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition text-left px-4 flex items-center justify-between"
                >
                  <span>Réinitialiser {currentConfig.name} uniquement</span>
                  <span>➜</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAllPositions}
                  className="w-full py-2.5 rounded-xl bg-rose-50 text-rose-900 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition text-left px-4 flex items-center justify-between"
                >
                  <span>Réinitialiser TOUS les 9 profils de postes</span>
                  <span>⚠️</span>
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoutCriteriaManagerModal;
