import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useClubData } from '../hooks/useClubData';

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  category: 'sport' | 'management' | 'media' | 'commerce';
  path: string;
  defaultActive: boolean;
  tags: string[];
  features: string[];
}

export const AVAILABLE_PLUGINS: PluginDefinition[] = [
  {
    id: 'recruitment_v1',
    name: 'Recrutement & Détection v1',
    version: 'v1.0',
    description: 'Plateforme complète de prospection sportive et détection : cellule scouts, pipeline Kanban interactif, fiches candidats & tuteurs légaux, comparateur radar multi-critères, shortlist officielle et planification des sessions terrain.',
    icon: 'Compass',
    category: 'sport',
    path: '/recruitment',
    defaultActive: true,
    tags: ['Scouting', 'Talents', 'Kanban', 'Radar 1-10', 'Sessions'],
    features: [
      'Gestion de la cellule de scouts avec affectation géographique',
      'Pipeline de recrutement Kanban par étapes (Contact, Essais, Sélectionné)',
      'Fiches détaillées des joueurs et contacts des tuteurs',
      'Comparateur de profils avec radar de performance',
      'Shortlist officielle & placement tactique'
    ]
  },
  {
    id: 'recruitment_v2',
    name: 'Recrutement & Détection V2',
    version: 'v2.0',
    description: 'Nouveau module indépendant (V2) de prospection sportive et détection.',
    icon: 'Compass',
    category: 'sport',
    path: '/recruitment-v2',
    defaultActive: true,
    tags: ['Scouting', 'Talents', 'V2'],
    features: [
      'Identique à V1 (pour l\'instant)',
      'Totalement indépendant de V1'
    ]
  }
];

interface PluginsContextType {
  plugins: PluginDefinition[];
  isPluginActive: (id: string) => boolean;
  togglePlugin: (id: string) => Promise<void>;
  setPluginActive: (id: string, active: boolean) => Promise<void>;
  isLoading: boolean;
}

const STORAGE_KEY = 'fus_club_plugins_v1';

const PluginsContext = createContext<PluginsContextType | undefined>(undefined);

export const PluginsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mainClub, updateMainClub } = useClubData();

  // Initialisation de l'état des plugins
  const [pluginStates, setPluginStates] = useState<Record<string, boolean>>(() => {
    // 1. Essai localStorage en priorité pour réactivité instantanée
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Ignorer erreur JSON
    }

    // Valeur par défaut
    const defaults: Record<string, boolean> = {};
    AVAILABLE_PLUGINS.forEach((p) => {
      defaults[p.id] = p.defaultActive;
    });
    return defaults;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Synchronisation avec les settings Supabase du club dès que chargés
  useEffect(() => {
    const clubSettingsPlugins = (mainClub?.settings as any)?.plugins;
    if (clubSettingsPlugins && typeof clubSettingsPlugins === 'object') {
      setPluginStates((prev) => {
        const merged = { ...prev, ...clubSettingsPlugins };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // ignore
        }
        return merged;
      });
    }
  }, [mainClub]);

  const isPluginActive = (id: string): boolean => {
    if (pluginStates[id] !== undefined) {
      return pluginStates[id];
    }
    const def = AVAILABLE_PLUGINS.find((p) => p.id === id);
    return def ? def.defaultActive : false;
  };

  const setPluginActive = async (id: string, active: boolean) => {
    const targetPlugin = AVAILABLE_PLUGINS.find((p) => p.id === id);
    const pluginName = targetPlugin ? targetPlugin.name : id;

    const newStates = { ...pluginStates, [id]: active };
    setPluginStates(newStates);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newStates));
    } catch {
      // ignore
    }

    if (active) {
      toast.success(`Plugin « ${pluginName} » activé`);
    } else {
      toast.info(`Plugin « ${pluginName} » désactivé`);
    }

    // Persistance dans Supabase (settings du club) en tâche de fond si disponible
    if (mainClub?.id) {
      try {
        setIsLoading(true);
        const { error } = await supabase
          .from('settings')
          .update({ plugins: newStates } as any)
          .eq('club_id', mainClub.id);

        if (error) {
          // Si la colonne plugins n'a pas encore été créée en base, le cache local assure le fonctionnement
          console.info('[PluginsContext] Synchronisation Supabase en attente de la colonne "plugins" :', error.message);
        }
      } catch (err: any) {
        console.info('[PluginsContext] Synchronisation Supabase plugins silencieuse :', err?.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const togglePlugin = async (id: string) => {
    const current = isPluginActive(id);
    await setPluginActive(id, !current);
  };

  const value = useMemo(
    () => ({
      plugins: AVAILABLE_PLUGINS,
      isPluginActive,
      togglePlugin,
      setPluginActive,
      isLoading,
    }),
    [pluginStates, isLoading, mainClub]
  );

  return <PluginsContext.Provider value={value}>{children}</PluginsContext.Provider>;
};

export const usePlugins = (): PluginsContextType => {
  const context = useContext(PluginsContext);
  if (!context) {
    throw new Error('usePlugins doit être utilisé au sein d’un PluginsProvider');
  }
  return context;
};
