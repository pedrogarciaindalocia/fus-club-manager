export type ViewDisplayMode = 'grid' | 'list';

/**
 * Résout la préférence d'affichage (`grid` par défaut) à partir des paramètres du club (`settings` ou racine).
 */
export function resolvePreferredViewMode(
  club:
    | {
        preferred_view_mode?: string | null;
        settings?: { preferred_view_mode?: string | null } | null;
      }
    | null
    | undefined,
  fallback: ViewDisplayMode = 'grid'
): ViewDisplayMode {
  const raw = club?.settings?.preferred_view_mode ?? club?.preferred_view_mode;
  if (raw === 'grid' || raw === 'list') {
    return raw;
  }
  return fallback;
}

