import { useEffect } from 'react';
import type { Match } from '../types';

/**
 * Hook de supervision des matchs programmés
 * 
 * [US-DASH-56] RÈGLE MÉTIER STRICTE :
 * Conformément aux directives du Chef de Projet :
 * S'il n'y a pas eu de coup d'envoi officiel, un match NE DOIT JAMAIS être passé en direct ('live').
 * Le match reste strictement 'scheduled' tant que l'administrateur / arbitre n'a pas
 * cliqué sur "Donner le coup d'envoi" dans le centre de commande.
 */
export const useAutoMatchActivation = (_matches: Match[], _onMatchActivated?: (matchId: string) => void) => {
  useEffect(() => {
    // Aucune mutation automatique de statut sans coup d'envoi officiel
  }, []);
};

export default useAutoMatchActivation;
