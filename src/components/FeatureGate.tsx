import React from 'react';
import { usePlugins } from '../context/PluginsContext';

interface FeatureGateProps {
  /**
   * Identifiant du plugin requis (ex: 'recruitment_v1')
   */
  pluginId: string;
  /**
   * Composants ou éléments à rendre si le plugin est actif
   */
  children: React.ReactNode;
  /**
   * Élément de repli affiché si le plugin est inactif (par défaut: null)
   */
  fallback?: React.ReactNode;
  /**
   * Inverse la condition : affiche les enfants si le plugin est INACTIF
   */
  invert?: boolean;
}

/**
 * Composant de protection déclarative (Feature Gatekeeper Pattern)
 * Permet de masquer ou d'adapter conditionnellement les sous-fonctionnalités
 * d'autres modules lorsque le plugin associé est désactivé.
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  pluginId,
  children,
  fallback = null,
  invert = false,
}) => {
  const { isPluginActive } = usePlugins();
  const active = isPluginActive(pluginId);
  const shouldRender = invert ? !active : active;

  if (!shouldRender) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Hook utilitaire (Guard Pattern) pour requêter l'état d'un plugin dans un composant
 */
export const usePluginGate = (pluginId: string) => {
  const { isPluginActive } = usePlugins();
  const isActive = isPluginActive(pluginId);
  return { isActive };
};

export default FeatureGate;
