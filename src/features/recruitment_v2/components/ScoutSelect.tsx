import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Compass, 
  Search, 
  X, 
  Check, 
  ChevronDown, 
  User, 
  MapPin, 
  Shield, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import type { Scout } from '../types/recruitment';
import { cn } from '../../../lib/utils';

interface ScoutSelectProps {
  scouts: Scout[];
  value: string;
  onChange: (scoutId: string, scout?: Scout) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const ScoutSelect: React.FC<ScoutSelectProps> = ({
  scouts = [],
  value,
  onChange,
  label = "Scout",
  placeholder = "Sélectionner un scout...",
  helperText = "Le joueur sera automatiquement relié à la fiche et aux statistiques de ce scout.",
  required = false,
  error,
  disabled = false,
  isLoading = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Trouver le scout sélectionné
  const selectedScout = useMemo(() => {
    return scouts.find(s => s.id === value);
  }, [scouts, value]);

  // Filtrer les scouts selon la recherche
  const filteredScouts = useMemo(() => {
    if (!searchQuery.trim()) return scouts;
    const q = searchQuery.toLowerCase().trim();
    return scouts.filter(s => 
      s.full_name?.toLowerCase().includes(q) ||
      s.role_title?.toLowerCase().includes(q) ||
      s.recruitment_region?.toLowerCase().includes(q) ||
      s.assigned_categories?.some(cat => cat.toLowerCase().includes(q))
    );
  }, [scouts, searchQuery]);

  // Fermer le menu lors d'un clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus automatique sur le champ de recherche à l'ouverture
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = (scout: Scout) => {
    onChange(scout.id, scout);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  return (
    <div className={cn("w-full space-y-1.5 relative", className)} ref={containerRef}>
      {/* Libellé & Statut Requis */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-primary" />
          <span>{label}</span>
          {required && <span className="text-rose-500 font-black">*</span>}
        </label>
        {selectedScout && (
          <span className="text-[10px] font-bold text-slate-400">
            {scouts.length} scout{scouts.length > 1 ? 's' : ''} disponible{scouts.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Bouton Déclencheur / Combobox Trigger */}
      <div
        onClick={() => {
          if (!disabled && !isLoading) {
            setIsOpen(!isOpen);
          }
        }}
        className={cn(
          "w-full min-h-[46px] px-3.5 py-2 rounded-xl border bg-white flex items-center justify-between gap-3 transition-all cursor-pointer select-none",
          isOpen
            ? "border-primary ring-2 ring-primary/20 shadow-xs"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50",
          error && "border-rose-300 ring-2 ring-rose-100 bg-rose-50/10",
          disabled && "opacity-60 cursor-not-allowed bg-slate-100 border-slate-200",
          isLoading && "cursor-wait opacity-80"
        )}
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Chargement des scouts...</span>
          </div>
        ) : selectedScout ? (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Avatar Scout */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-2xs border border-white">
              {selectedScout.photo_url ? (
                <img
                  src={selectedScout.photo_url}
                  alt={selectedScout.full_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span>
                  {selectedScout.full_name
                    .split(' ')
                    .map(n => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
              )}
            </div>

            {/* Infos Scout */}
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {selectedScout.full_name}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100/80 truncate">
                  {(!selectedScout.role_title || selectedScout.role_title.includes('Scout') || selectedScout.role_title.includes('Détecteur') || selectedScout.role_title.includes('Recruteur')) ? 'Scout' : selectedScout.role_title}
                </span>
              </div>
              {selectedScout.recruitment_region && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate mt-0.5">
                  <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                  <span className="truncate">{selectedScout.recruitment_region}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-medium">
            {placeholder}
          </span>
        )}

        {/* Actions à droite */}
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selectedScout && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-slate-100 hover:text-slate-600 transition-colors text-slate-400"
              title="Effacer le choix"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isOpen && "rotate-180 text-primary"
            )}
          />
        </div>
      </div>

      {/* Menu Déroulant avec Recherche */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Barre de Recherche Intégrée */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, rôle, zone..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                onClick={(e) => e.stopPropagation()}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Liste des Scouts */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
            {filteredScouts.length > 0 ? (
              filteredScouts.map((scout) => {
                const isSelected = scout.id === value;
                return (
                  <button
                    key={scout.id}
                    type="button"
                    onClick={() => handleSelect(scout)}
                    className={cn(
                      "w-full p-2 rounded-xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer",
                      isSelected
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-2xs"
                        : "hover:bg-slate-50 text-slate-700 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar */}
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-2xs",
                        isSelected
                          ? "bg-primary text-white"
                          : "bg-slate-100 text-slate-600"
                      )}>
                        {scout.photo_url ? (
                          <img
                            src={scout.photo_url}
                            alt={scout.full_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>
                            {scout.full_name
                              .split(' ')
                              .map(n => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Textes */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn(
                            "text-xs font-bold truncate",
                            isSelected ? "text-primary font-black" : "text-slate-900"
                          )}>
                            {scout.full_name}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {(!scout.role_title || scout.role_title.includes('Scout') || scout.role_title.includes('Détecteur') || scout.role_title.includes('Recruteur')) ? 'Scout' : scout.role_title}
                          </span>
                        </div>
                        {scout.recruitment_region && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            <span className="truncate">{scout.recruitment_region}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Checkmark si sélectionné */}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-6 px-4 text-center">
                <p className="text-xs font-bold text-slate-700">Aucun scout trouvé</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Aucun membre ne correspond à votre recherche "{searchQuery}"
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message d'erreur ou texte d'aide */}
      {error ? (
        <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium pt-0.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 leading-tight pt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

export default ScoutSelect;
