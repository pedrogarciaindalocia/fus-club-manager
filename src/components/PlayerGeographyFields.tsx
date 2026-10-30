import React, { useState, useEffect } from 'react';
import { Globe, MapPin, Flag, ChevronDown } from 'lucide-react';
import { 
  GEOGRAPHY_DATA, 
  CONTINENTS, 
  getCountryFlag, 
  getCountryNationality, 
  getContinentForCountry,
  COUNTRY_METAS 
} from '../constants/geography';

export interface PlayerGeographyFieldsProps {
  continent: string;
  onContinentChange: (continent: string) => void;
  country: string;
  onCountryChange: (country: string, flag: string, defaultNationality: string) => void;
  city: string;
  onCityChange: (city: string) => void;
  birthPlace?: string;
  onBirthPlaceChange?: (birthPlace: string) => void;
  nationality: string;
  onNationalityChange: (nationality: string) => void;
  className?: string;
  layout?: 'grid' | 'stack';
}

export const PlayerGeographyFields: React.FC<PlayerGeographyFieldsProps> = ({
  continent,
  onContinentChange,
  country,
  onCountryChange,
  city,
  onCityChange,
  birthPlace,
  onBirthPlaceChange,
  nationality,
  onNationalityChange,
  className = '',
  layout = 'grid',
}) => {
  const [isCustomCountry, setIsCustomCountry] = useState(false);
  const [customCountryName, setCustomCountryName] = useState('');
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [customCityName, setCustomCityName] = useState('');

  // Liste des pays du continent sélectionné
  const availableCountries = React.useMemo(() => {
    const list = Object.keys(GEOGRAPHY_DATA[continent] || {});
    // Si c'est l'Afrique, assurer que Maroc est en 1er
    if (continent === 'Afrique') {
      return ['Maroc', ...list.filter(c => c !== 'Maroc')];
    }
    return list;
  }, [continent]);

  // Villes disponibles pour le pays sélectionné
  const availableCities = React.useMemo(() => {
    if (isCustomCountry) return [];
    return GEOGRAPHY_DATA[continent]?.[country] || [];
  }, [continent, country, isCustomCountry]);

  // Détection du mode personnalisé au montage ou changement externe
  useEffect(() => {
    if (country && !availableCountries.includes(country)) {
      setIsCustomCountry(true);
      setCustomCountryName(country);
    } else {
      setIsCustomCountry(false);
    }
  }, [country, availableCountries]);

  useEffect(() => {
    if (city && availableCities.length > 0 && !availableCities.includes(city)) {
      setIsCustomCity(true);
      setCustomCityName(city);
    } else if (availableCities.length === 0 && city) {
      setIsCustomCity(true);
      setCustomCityName(city);
    } else {
      setIsCustomCity(false);
    }
  }, [city, availableCities]);

  // Gestion changement de continent
  const handleContinentSelect = (newContinent: string) => {
    onContinentChange(newContinent);
    const countries = Object.keys(GEOGRAPHY_DATA[newContinent] || {});
    const defaultCountry = newContinent === 'Afrique' ? 'Maroc' : (countries[0] || 'Maroc');
    const defaultFlag = getCountryFlag(defaultCountry);
    const defaultNat = getCountryNationality(defaultCountry);

    setIsCustomCountry(false);
    onCountryChange(defaultCountry, defaultFlag, defaultNat);

    // Mettre à jour la ville par défaut
    const cities = GEOGRAPHY_DATA[newContinent]?.[defaultCountry] || [];
    const defaultCity = defaultCountry === 'Maroc' ? 'Rabat' : (cities[0] || '');
    setIsCustomCity(false);
    onCityChange(defaultCity);
    if (onBirthPlaceChange && (!birthPlace || birthPlace === city)) {
      onBirthPlaceChange(defaultCity);
    }
  };

  // Gestion changement de pays
  const handleCountrySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomCountry(true);
      const customName = customCountryName || 'Autre';
      onCountryChange(customName, '🌐', `${customName}e`);
      setIsCustomCity(true);
      return;
    }

    setIsCustomCountry(false);
    const flag = getCountryFlag(val);
    const defaultNat = getCountryNationality(val);
    onCountryChange(val, flag, defaultNat);

    // Villes du nouveau pays
    const cities = GEOGRAPHY_DATA[continent]?.[val] || [];
    const defaultCity = val === 'Maroc' ? 'Rabat' : (cities[0] || '');
    setIsCustomCity(false);
    onCityChange(defaultCity);
    if (onBirthPlaceChange && (!birthPlace || birthPlace === city)) {
      onBirthPlaceChange(defaultCity);
    }
  };

  // Gestion changement de ville
  const handleCitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomCity(true);
      onCityChange(customCityName || '');
      return;
    }

    setIsCustomCity(false);
    onCityChange(val);
    if (onBirthPlaceChange && (!birthPlace || birthPlace === city)) {
      onBirthPlaceChange(val);
    }
  };

  const handleCustomCityInput = (val: string) => {
    setCustomCityName(val);
    onCityChange(val);
    if (onBirthPlaceChange && (!birthPlace || birthPlace === city)) {
      onBirthPlaceChange(val);
    }
  };

  const handleCustomCountryInput = (val: string) => {
    setCustomCountryName(val);
    onCountryChange(val, getCountryFlag(val), getCountryNationality(val));
  };

  const currentFlag = getCountryFlag(country || nationality);

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* ── SECTION EN-TÊTE DU SÉLECTEUR ── */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>Origine & Localisation Géographique</span>
        </span>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-200">
          <span className="text-base leading-none">{currentFlag}</span>
          <span>{country || 'Maroc'}</span>
        </div>
      </div>

      <div className={layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3' : 'space-y-3'}>
        {/* 1. Sélecteur Continent */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Continent <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              value={continent}
              onChange={(e) => handleContinentSelect(e.target.value)}
              className="w-full appearance-none px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-8 cursor-pointer"
            >
              {CONTINENTS.map((c) => (
                <option key={c} value={c}>
                  {c === 'Afrique' ? '🌍 Afrique' : c === 'Europe' ? '🇪🇺 Europe' : c === 'Amérique' ? '🌎 Amérique' : '🌏 Asie/Océanie'}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* 2. Sélecteur Pays avec Drapeau */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
            <span>Pays <span className="text-rose-500">*</span></span>
            <span className="text-sm leading-none">{currentFlag}</span>
          </label>
          <div className="relative">
            <select
              value={isCustomCountry ? '__custom__' : country}
              onChange={handleCountrySelect}
              className="w-full appearance-none px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-8 cursor-pointer"
            >
              {availableCountries.map((c) => {
                const flag = getCountryFlag(c);
                return (
                  <option key={c} value={c}>
                    {flag} {c} {c === 'Maroc' ? '(National)' : ''}
                  </option>
                );
              })}
              <option value="__custom__">🌐 Autre pays...</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {isCustomCountry && (
            <input
              type="text"
              value={customCountryName}
              onChange={(e) => handleCustomCountryInput(e.target.value)}
              placeholder="Préciser le pays..."
              className="mt-1.5 w-full px-3 py-1.5 rounded-lg border border-primary/40 text-xs font-semibold focus:ring-2 focus:ring-primary/20 bg-primary/5 text-slate-900"
            />
          )}
        </div>

        {/* 3. Sélecteur Ville */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span>Ville <span className="text-rose-500">*</span></span>
          </label>
          <div className="relative">
            <select
              value={isCustomCity ? '__custom__' : city}
              onChange={handleCitySelect}
              className="w-full appearance-none px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-8 cursor-pointer"
            >
              {availableCities.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
              <option value="__custom__">🏙️ Autre ville...</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {isCustomCity && (
            <input
              type="text"
              value={customCityName}
              onChange={(e) => handleCustomCityInput(e.target.value)}
              placeholder="Préciser la ville..."
              className="mt-1.5 w-full px-3 py-1.5 rounded-lg border border-primary/40 text-xs font-semibold focus:ring-2 focus:ring-primary/20 bg-primary/5 text-slate-900"
            />
          )}
        </div>

        {/* 4. Nationalité (synchronisée automatiquement avec drapeau) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
            <span>Nationalité</span>
            <span className="text-[10px] text-slate-400 font-medium">(Modifiable)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={nationality}
              onChange={(e) => onNationalityChange(e.target.value)}
              placeholder="Ex: Marocaine"
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
              {currentFlag}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerGeographyFields;
