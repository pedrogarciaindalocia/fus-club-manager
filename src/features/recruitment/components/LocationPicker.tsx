import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, List, Globe, X, Search, ChevronDown } from 'lucide-react';
import { GEOGRAPHY_DATA } from '../../../constants/geography';
import { CITY_COORDINATES, CONTINENT_COLORS } from '../../../constants/cityCoordinates';
import { cn } from '../../../lib/utils';

interface LocationPickerProps {
  continent: string;
  setContinent: (val: string) => void;
  country: string;
  setCountry: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  customCity: string;
  setCustomCity: (val: string) => void;
  locationString: string;
  setLocationString: (val: string) => void;
  disableMap?: boolean;
  // ── Multichoix ──────────────────────────────────────────────
  selectedCities?: string[];
  onCitiesChange?: (cities: string[]) => void;
}

interface PopupInfo {
  city: string;
  lat: number;
  lng: number;
  country: string;
  continent: string;
}

// Extrait les villes sélectionnées depuis la locationString (format "[VILLES] Rabat, Paris")
function parseCitiesFromString(str: string): string[] {
  if (!str || !str.startsWith('[VILLES]')) return [];
  return str.replace('[VILLES]', '').split(',').map(s => s.trim()).filter(Boolean);
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  continent, setContinent,
  country, setCountry,
  city, setCity,
  customCity, setCustomCity,
  locationString, setLocationString,
  disableMap = false,
  selectedCities: externalCities,
  onCitiesChange,
}) => {
  const [mode, setMode] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const [showContinentFilter, setShowContinentFilter] = useState(false);
  const [activeContinent, setActiveContinent] = useState<string | null>(null);

  // Villes sélectionnées — géré en interne si pas de prop externe
  const [internalCities, setInternalCities] = useState<string[]>([]);
  const selectedCities = externalCities ?? internalCities;

  const updateCities = useCallback((cities: string[]) => {
    setInternalCities(cities);
    onCitiesChange?.(cities);
    if (mode === 'map') {
      if (cities.length > 0) {
        setLocationString(`[VILLES] ${cities.join(', ')}`);
      } else {
        setLocationString('');
      }
    }
  }, [mode, onCitiesChange, setLocationString]);

  // Vue carte centrée sur le monde, légèrement zoomée sur l'Afrique/Europe
  const [viewState, setViewState] = useState({
    longitude: 10,
    latitude: 20,
    zoom: 1.8,
  });

  // Initialisation depuis locationString
  useEffect(() => {
    if (locationString && locationString.startsWith('[VILLES]')) {
      setMode('map');
      const cities = parseCitiesFromString(locationString);
      setInternalCities(cities);
    } else if (locationString && locationString.includes('[CARTE]')) {
      setMode('map');
    }
  }, []); // Seulement au montage

  // Synchronisation liste → string
  useEffect(() => {
    if (mode === 'list') {
      const finalCity = city === 'Autre' ? customCity : city;
      if (finalCity && country) {
        setLocationString(`${finalCity}, ${country}`);
      } else if (country) {
        setLocationString(country);
      }
    }
  }, [city, country, customCity, mode, setLocationString]);

  // Toggle sélection d'une ville
  const toggleCity = useCallback((cityName: string) => {
    const next = selectedCities.includes(cityName)
      ? selectedCities.filter(c => c !== cityName)
      : [...selectedCities, cityName];
    updateCities(next);
    setPopupInfo(null);
  }, [selectedCities, updateCities]);

  // Clé API Mapbox
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

  // Toutes les villes avec coordonnées, filtrées par recherche et continent/pays
  const allCityEntries = useMemo(() => {
    return Object.entries(CITY_COORDINATES).filter(([cityName, data]) => {
      const matchSearch = !searchQuery || cityName.toLowerCase().includes(searchQuery.toLowerCase()) || data.country.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRegion = !activeContinent 
        ? true 
        : activeContinent === 'Maroc' 
        ? data.country === 'Maroc' 
        : data.continent === activeContinent;
      return matchSearch && matchRegion;
    });
  }, [searchQuery, activeContinent]);

  // Centrer la carte sur le continent ou pays filtré
  const handleContinentFilter = (cont: string | null) => {
    setActiveContinent(cont);
    setShowContinentFilter(false);
    if (!cont) {
      setViewState({ longitude: 10, latitude: 20, zoom: 1.8 });
      return;
    }
    const centers: Record<string, { lat: number; lng: number; zoom: number }> = {
      "Maroc":        { lat: 31.7917, lng: -7.0926, zoom: 5.5 },
      "Afrique":      { lat: 5,   lng: 20,   zoom: 2.5 },
      "Europe":       { lat: 50,  lng: 10,   zoom: 3.2 },
      "Amérique":     { lat: -10, lng: -60,  zoom: 2.2 },
      "Asie/Océanie": { lat: 25,  lng: 110,  zoom: 2.5 },
    };
    const c = centers[cont];
    if (c) setViewState({ longitude: c.lng, latitude: c.lat, zoom: c.zoom });
  };

  const regionOptions = [
    { id: "Maroc", label: "Maroc 🇲🇦", color: CONTINENT_COLORS["Maroc"] || "#e11d48" },
    { id: "Afrique", label: "Afrique", color: CONTINENT_COLORS["Afrique"] || "#ef4444" },
    { id: "Europe", label: "Europe", color: CONTINENT_COLORS["Europe"] || "#3b82f6" },
    { id: "Amérique", label: "Amérique", color: CONTINENT_COLORS["Amérique"] || "#22c55e" },
    { id: "Asie/Océanie", label: "Asie/Océanie", color: CONTINENT_COLORS["Asie/Océanie"] || "#f59e0b" },
  ];

  return (
    <div className="w-full">
      {/* Sélecteur de mode */}
      {!disableMap && (
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 w-full border border-slate-200">
          <button
            type="button"
            onClick={() => setMode('list')}
            className={cn(
              "flex items-center justify-center gap-2 flex-1 py-2 rounded-xl text-sm font-bold transition-all",
              mode === 'list' ? "bg-white text-slate-800 shadow-sm border border-slate-200/60" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <List className="w-4 h-4" /> Listes Déroulantes
          </button>
          <button
            type="button"
            onClick={() => setMode('map')}
            className={cn(
              "flex items-center justify-center gap-2 flex-1 py-2 rounded-xl text-sm font-bold transition-all",
              mode === 'map' ? "bg-white text-slate-800 shadow-sm border border-slate-200/60" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Globe className="w-4 h-4" /> Carte Interactive
          </button>
        </div>
      )}

      {/* ── Mode Liste ────────────────────────────────────────────── */}
      {mode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Continent</label>
            <select
              value={continent}
              onChange={(e) => {
                setContinent(e.target.value);
                const firstCountry = Object.keys(GEOGRAPHY_DATA[e.target.value] || {})[0] || '';
                setCountry(firstCountry);
                setCity((GEOGRAPHY_DATA[e.target.value]?.[firstCountry]?.[0]) || '');
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              {Object.keys(GEOGRAPHY_DATA).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Pays</label>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setCity((GEOGRAPHY_DATA[continent]?.[e.target.value]?.[0]) || '');
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              {Object.keys(GEOGRAPHY_DATA[continent] || {}).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ville</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              {(GEOGRAPHY_DATA[continent]?.[country] || []).map(ct => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
            {city === 'Autre' && (
              <input
                type="text"
                placeholder="Précisez la ville..."
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            )}
          </div>
        </div>
      ) : (

        /* ── Mode Carte ─────────────────────────────────────────────── */
        <div className="space-y-3">

          {/* Barre d'outils : search + filtre continent */}
          {/* Barre d'outils carte : recherche + filtre continent / région */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              {/* Recherche */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher une ville ou un pays..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:ring-2 ring-primary/20 focus:border-primary bg-white"
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Filtre continent / pays */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowContinentFilter(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {activeContinent === 'Maroc' ? '🇲🇦 Maroc' : (activeContinent || 'Toutes les zones')}
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {showContinentFilter && (
                  <div className="absolute right-0 mt-1 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 min-w-[190px]">
                    <button
                      type="button"
                      onClick={() => handleContinentFilter(null)}
                      className={cn("w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-colors", !activeContinent ? "bg-primary/10 text-primary" : "hover:bg-slate-50 text-slate-700")}
                    >
                      🌍 Toutes les zones
                    </button>
                    {regionOptions.map(reg => (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => handleContinentFilter(reg.id)}
                        className={cn("w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-colors", activeContinent === reg.id ? "bg-primary/10 text-primary" : "hover:bg-slate-50 text-slate-700")}
                      >
                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: reg.color }} />
                        {reg.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Focus rapide (pills) avec Maroc mis en valeur */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-[11px] font-semibold text-slate-400 shrink-0">Focus rapide :</span>
              <button
                type="button"
                onClick={() => handleContinentFilter(null)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0",
                  !activeContinent ? "bg-slate-800 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                )}
              >
                Monde
              </button>
              {regionOptions.map(reg => {
                const isActive = activeContinent === reg.id;
                return (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => handleContinentFilter(isActive ? null : reg.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 border",
                      isActive
                        ? "shadow-sm border-transparent text-white"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                    )}
                    style={isActive ? { backgroundColor: reg.color } : {}}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isActive ? '#ffffff' : reg.color }}
                    />
                    {reg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Badges des villes sélectionnées */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-rose-50 p-3 rounded-xl border border-rose-100">
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-black text-rose-800 mb-1">
                Zones sélectionnées : <span className="text-rose-600">{selectedCities.length}</span>
                <span className="font-medium ml-1 text-rose-500">— cliquez sur un marqueur pour sélectionner/désélectionner</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {selectedCities.length === 0 ? (
                  <span className="text-[11px] text-rose-400 italic">Aucune ville sélectionnée</span>
                ) : (
                  selectedCities.map(c => {
                    const coords = CITY_COORDINATES[c];
                    return (
                      <span
                        key={c}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all"
                        style={{
                          backgroundColor: coords ? `${CONTINENT_COLORS[coords.continent]}18` : '#fee2e2',
                          borderColor: coords ? `${CONTINENT_COLORS[coords.continent]}40` : '#fca5a5',
                          color: coords ? CONTINENT_COLORS[coords.continent] : '#dc2626',
                        }}
                      >
                        <MapPin className="w-3 h-3" />
                        {c}
                        {coords && <span className="text-[9px] opacity-60 font-normal">{coords.country}</span>}
                        <button
                          type="button"
                          onClick={() => toggleCity(c)}
                          className="ml-0.5 hover:opacity-60"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    );
                  })
                )}
              </div>
            </div>
            {selectedCities.length > 0 && (
              <button
                type="button"
                onClick={() => updateCities([])}
                className="text-[10px] font-bold text-rose-700 bg-white hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors shadow-sm shrink-0"
              >
                Tout effacer
              </button>
            )}
          </div>

          {/* Carte Mapbox */}
          <div className="h-[520px] w-full rounded-2xl overflow-hidden border-2 border-slate-200 z-0 relative shadow-sm">
            {!mapboxToken ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 text-sm font-medium">
                ⚠️ Token Mapbox manquant dans .env.local (VITE_MAPBOX_TOKEN)
              </div>
            ) : (
              <Map
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                onClick={() => { setPopupInfo(null); setShowContinentFilter(false); }}
                mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
                mapboxAccessToken={mapboxToken}
                style={{ width: '100%', height: '100%' }}
                attributionControl={false}
              >
                {/* Marqueurs de toutes les villes filtrées */}
                {allCityEntries.map(([cityName, data]) => {
                  const isSelected = selectedCities.includes(cityName);
                  const color = CONTINENT_COLORS[data.continent] || '#6b7280';

                  return (
                    <Marker
                      key={cityName}
                      longitude={data.lng}
                      latitude={data.lat}
                      anchor="bottom"
                      onClick={e => {
                        e.originalEvent.stopPropagation();
                        toggleCity(cityName);
                        setPopupInfo(isSelected ? null : { city: cityName, lat: data.lat, lng: data.lng, country: data.country, continent: data.continent });
                      }}
                    >
                      <div
                        className={cn(
                          "relative cursor-pointer transition-all duration-200 group",
                          isSelected ? "scale-125 drop-shadow-lg" : "scale-100 hover:scale-110"
                        )}
                        title={`${cityName} (${data.country}) — ${isSelected ? 'Cliquer pour retirer' : 'Cliquer pour sélectionner'}`}
                      >
                        {/* Marqueur SVG custom */}
                        <svg
                          width={isSelected ? 24 : 16}
                          height={isSelected ? 28 : 20}
                          viewBox="0 0 24 28"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="transition-all duration-200"
                        >
                          <path
                            d="M12 0C5.373 0 0 5.373 0 12C0 19.5 12 28 12 28C12 28 24 19.5 24 12C24 5.373 18.627 0 12 0Z"
                            fill={isSelected ? color : '#94a3b8'}
                            fillOpacity={isSelected ? 1 : 0.65}
                          />
                          <circle
                            cx="12"
                            cy="11"
                            r="4.5"
                            fill="white"
                            fillOpacity={isSelected ? 1 : 0.9}
                          />
                        </svg>

                        {/* Halo de sélection */}
                        {isSelected && (
                          <span
                            className="absolute inset-0 rounded-full animate-ping opacity-30"
                            style={{ backgroundColor: color }}
                          />
                        )}

                        {/* Label ville au survol (visible uniquement si zoom suffisant) */}
                        <span
                          className={cn(
                            "absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded-md text-[9px] font-black shadow-md pointer-events-none transition-opacity duration-150",
                            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                          style={{
                            backgroundColor: isSelected ? color : '#1e293b',
                            color: 'white',
                          }}
                        >
                          {cityName}
                        </span>
                      </div>
                    </Marker>
                  );
                })}

                {/* Popup d'info au clic */}
                {popupInfo && (
                  <Popup
                    longitude={popupInfo.lng}
                    latitude={popupInfo.lat}
                    anchor="top"
                    closeButton={false}
                    closeOnClick={false}
                    offset={30}
                    className="z-10"
                  >
                    <div className="p-2 min-w-[120px]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: CONTINENT_COLORS[popupInfo.continent] }}
                        />
                        <p className="font-black text-slate-800 text-sm">{popupInfo.city}</p>
                      </div>
                      <p className="text-[10px] text-slate-500">{popupInfo.country} · {popupInfo.continent}</p>
                      <button
                        type="button"
                        onClick={() => toggleCity(popupInfo.city)}
                        className="mt-2 w-full text-[10px] font-bold px-2 py-1 rounded-lg text-white transition-colors"
                        style={{ backgroundColor: CONTINENT_COLORS[popupInfo.continent] }}
                      >
                        ✓ Sélectionné
                      </button>
                    </div>
                  </Popup>
                )}
              </Map>
            )}
          </div>

          {/* Légende des couleurs */}
          <div className="flex flex-wrap gap-3 justify-center text-[10px] font-bold">
            {regionOptions.map(reg => (
              <button
                key={reg.id}
                type="button"
                onClick={() => handleContinentFilter(activeContinent === reg.id ? null : reg.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all",
                  activeContinent === reg.id ? "border-current shadow-sm" : "border-transparent hover:border-slate-200"
                )}
                style={{
                  color: reg.color,
                  backgroundColor: activeContinent === reg.id ? `${reg.color}15` : 'transparent',
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: reg.color }} />
                {reg.label}
              </button>
            ))}
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              Non sélectionné
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
