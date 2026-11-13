import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  User,
  Search,
  X,
  Check,
  ChevronDown,
  Shield,
  Loader2,
  AlertCircle,
  MapPin,
  Sparkles
} from 'lucide-react';
import type { TrialCandidate } from '../types/recruitment';
import { cn } from '../../../lib/utils';

interface PlayerSelectProps {
  candidates: TrialCandidate[];
  value: string; // candidate ID
  onChange: (candidateId: string, candidate?: TrialCandidate) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const PlayerSelect: React.FC<PlayerSelectProps> = ({
  candidates = [],
  value,
  onChange,
  label = "Joueur à Évaluer",
  placeholder = "Rechercher et sélectionner un joueur (nom, poste, catégorie)...",
  helperText = "Le rapport de scout et les évaluations technico-tactiques seront rattachés à ce joueur.",
  required = true,
  error,
  disabled = false,
  isLoading = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Trouver le joueur sélectionné
  const selectedCandidate = useMemo(() => {
    return candidates.find(c => c.id === value);
  }, [candidates, value]);

  // Filtrer les joueurs selon la recherche
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase().trim();
    return candidates.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.primary_position?.toLowerCase().includes(q) ||
      c.age_category?.toLowerCase().includes(q) ||
      c.current_club?.toLowerCase().includes(q) ||
      c.nationality?.toLowerCase().includes(q) ||
      c.discovering_scout_name?.toLowerCase().includes(q)
    );
  }, [candidates, searchQuery]);

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

  const handleSelect = (cand: TrialCandidate) => {
    onChange(cand.id, cand);
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
          <User className="w-3.5 h-3.5 text-indigo-600" />
          <span>{label}</span>
          {required && <span className="text-rose-500 font-black">*</span>}
        </label>
        <span className="text-[10px] font-bold text-slate-400">
          {candidates.length} joueur{candidates.length > 1 ? 's' : ''} en base
        </span>
      </div>

      {/* Bouton Déclencheur / Combobox Trigger */}
      <div
        onClick={() => {
          if (!disabled && !isLoading) {
            setIsOpen(!isOpen);
          }
        }}
        className={cn(
          "w-full min-h-[50px] px-3.5 py-2.5 rounded-2xl border bg-white flex items-center justify-between gap-3 transition-all cursor-pointer select-none",
          isOpen
            ? "border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50",
          error && "border-rose-300 ring-2 ring-rose-100 bg-rose-50/10",
          disabled && "opacity-60 cursor-not-allowed bg-slate-100 border-slate-200",
          isLoading && "cursor-wait opacity-80"
        )}
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Chargement des joueurs...</span>
          </div>
        ) : selectedCandidate ? (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Avatar Joueur */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-2xs border border-white">
              {selectedCandidate.photo_url ? (
                <img
                  src={selectedCandidate.photo_url}
                  alt={`${selectedCandidate.first_name} ${selectedCandidate.last_name}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span>
                  {`${selectedCandidate.first_name?.[0] || ''}${selectedCandidate.last_name?.[0] || ''}`.toUpperCase() || 'J'}
                </span>
              )}
            </div>

            {/* Infos Joueur */}
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-900 truncate">
                  {selectedCandidate.first_name} {selectedCandidate.last_name}
                </span>
                {selectedCandidate.primary_position && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {selectedCandidate.primary_position}
                  </span>
                )}
                {selectedCandidate.age_category && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {selectedCandidate.age_category}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate mt-0.5">
                {selectedCandidate.current_club && (
                  <span className="truncate flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    <span>{selectedCandidate.current_club}</span>
                  </span>
                )}
                {selectedCandidate.discovering_scout_name && (
                  <span className="text-slate-400 text-[10px] truncate">
                    • Scout: {selectedCandidate.discovering_scout_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-medium flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <span>{placeholder}</span>
          </span>
        )}

        {/* Actions à droite */}
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selectedCandidate && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-colors text-slate-400"
              title="Changer de joueur"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isOpen && "rotate-180 text-indigo-600"
            )}
          />
        </div>
      </div>

      {/* Menu Déroulant avec Recherche */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Barre de Recherche Intégrée */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, poste (ex: CB, ST), catégorie (ex: U17)..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500/20"
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

          {/* Liste des Joueurs */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
            {filteredCandidates.length > 0 ? (
              filteredCandidates.map((cand) => {
                const isSelected = cand.id === value;
                return (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => handleSelect(cand)}
                    className={cn(
                      "w-full p-2.5 rounded-xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer",
                      isSelected
                        ? "bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs"
                        : "hover:bg-slate-50 text-slate-700 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-2xs",
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      )}>
                        {cand.photo_url ? (
                          <img
                            src={cand.photo_url}
                            alt={`${cand.first_name} ${cand.last_name}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>
                            {`${cand.first_name?.[0] || ''}${cand.last_name?.[0] || ''}`.toUpperCase() || 'J'}
                          </span>
                        )}
                      </div>

                      {/* Textes */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "text-xs font-black truncate",
                            isSelected ? "text-indigo-950 font-black" : "text-slate-900"
                          )}>
                            {cand.first_name} {cand.last_name}
                          </span>
                          {cand.primary_position && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {cand.primary_position}
                            </span>
                          )}
                          {cand.age_category && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                              {cand.age_category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 truncate">
                          {cand.current_club && (
                            <span className="truncate">{cand.current_club}</span>
                          )}
                          {cand.discovering_scout_name && (
                            <span className="text-slate-400 text-[10px] truncate">
                              • Scout: {cand.discovering_scout_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Checkmark si sélectionné */}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-6 px-4 text-center">
                <p className="text-xs font-bold text-slate-700">Aucun joueur trouvé</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Aucun joueur en base ne correspond à votre recherche "{searchQuery}"
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

export default PlayerSelect;
