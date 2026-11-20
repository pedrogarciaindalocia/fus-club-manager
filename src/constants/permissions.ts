export const CRUD_KEYS = ['create', 'read', 'update', 'delete'] as const;
export type CrudAction = typeof CRUD_KEYS[number];

export const SPECIFIC_ACTIONS_BY_SUBMODULE = {
  players: ['stats', 'surclasser', 'departure'],
  candidates: ['drive_link', 'assign_mission', 'recruit_now', 'manage_reports'],
  matches: [
    'plan_match',
    'sync_my_club',
    'import_frmf_sheet',
    'manage_match_played',
    'live_tracking',
    'manage_standings',
  ],
} as const;

export type SpecificSubModule = keyof typeof SPECIFIC_ACTIONS_BY_SUBMODULE;

export const LEGACY_SPECIFIC_KEY_ALIASES: Record<string, string[]> = {
  'players:stats': ['sub:players:stats'],
  'players:surclasser': ['sub:players:surclasser'],
  'players:departure': ['sub:players:departure'],
  'candidates:drive_link': ['sub:candidates:drive_link'],
  'candidates:assign_mission': ['sub:candidates:assign_mission'],
  'candidates:recruit_now': ['sub:candidates:recruit_now'],
  'candidates:manage_reports': ['sub:candidates:manage_reports', 'sub:candidates:reports'],
  'matches:plan_match': ['sub:matches:plan_match', 'plan_match', 'schedule_match'],
  'matches:sync_my_club': ['sub:matches:sync_my_club', 'sync_my_club'],
  'matches:import_frmf_sheet': ['sub:matches:import_frmf_sheet', 'import_frmf_sheet'],
  'matches:manage_match_played': ['sub:matches:manage_match_played', 'manage_match_played'],
  'matches:live_tracking': ['sub:matches:live_tracking', 'live_tracking'],
  'matches:manage_standings': ['sub:matches:manage_standings', 'manage_standings'],
};

const SPECIFIC_TO_SUBMODULE_LOOKUP: Record<string, SpecificSubModule> = Object.entries(
  SPECIFIC_ACTIONS_BY_SUBMODULE
).reduce((acc, [subId, keys]) => {
  keys.forEach((k) => {
    acc[k] = subId as SpecificSubModule;
  });
  return acc;
}, {} as Record<string, SpecificSubModule>);

export const isCrudAction = (action: string): action is CrudAction =>
  (CRUD_KEYS as readonly string[]).includes(action);

export const getSpecificActionKeysForSubModule = (subModule: string): readonly string[] =>
  (SPECIFIC_ACTIONS_BY_SUBMODULE as Record<string, readonly string[]>)[subModule] || [];

export const isSpecificActionForSubModule = (subModule: string, action: string): boolean =>
  getSpecificActionKeysForSubModule(subModule).includes(action);

export const resolveLegacyAliases = (subModule: string, specificAction: string): string[] => {
  const composite = `${subModule}:${specificAction}`;
  const aliases = LEGACY_SPECIFIC_KEY_ALIASES[composite];
  if (aliases) return aliases;
  return [`sub:${subModule}:${specificAction}`];
};

/**
 * Résout l'autorisation CRUD granulaire d'une action métier spécifique (`sub:<subModule>:<specificAction>:<crud>`),
 * avec repli rétro-compatible sur les anciennes clés plates (uniquement tant qu'aucune clé granulaire n'existe).
 */
export const hasSpecificActionPermission = (
  perms: string[],
  subModule: string,
  specificAction: string,
  crudAction: CrudAction = 'read'
): boolean => {
  if (!perms || perms.length === 0) return false;

  const prefix = `sub:${subModule}:${specificAction}`;
  const hasGranularKeys = CRUD_KEYS.some((k) => perms.includes(`${prefix}:${k}`));

  if (hasGranularKeys) {
    if (crudAction === 'read') {
      return CRUD_KEYS.some((k) => perms.includes(`${prefix}:${k}`));
    }
    return perms.includes(`${prefix}:${crudAction}`);
  }

  // Repli rétro-compatible sur l'ancienne clé plate (ex: sub:candidates:manage_reports)
  const legacyKeys = resolveLegacyAliases(subModule, specificAction);
  return legacyKeys.some((k) => perms.includes(k));
};

/**
 * Vérifie si au moins une action spécifique d'un sous-module est active (granulaire ou héritée).
 */
export const hasAnySpecificPermissionInSubModule = (
  perms: string[],
  subModule: string
): boolean => {
  const specKeys = getSpecificActionKeysForSubModule(subModule);
  return specKeys.some((specKey) => hasSpecificActionPermission(perms, subModule, specKey, 'read'));
};

/**
 * Hydrate les anciennes clés plates de permissions spécifiques en clés CRUD granulaires (`:create/:read/:update/:delete`)
 * lors du chargement dans l'éditeur d'utilisateur, et fusionne `sub:candidates:edit_player` dans `sub:candidates:update`.
 */
export const hydrateSpecificPermissionsMap = (
  rawOverrides: Record<string, boolean>
): Record<string, boolean> => {
  const next: Record<string, boolean> = { ...rawOverrides };

  // Fusion de l'ancienne action spécifique 'edit_player' vers le CRUD général 'update' de candidates
  if (next['sub:candidates:edit_player']) {
    next['sub:candidates:update'] = true;
    next['sub:candidates:read'] = true;
    next['recruitment_v2:read'] = true;
    delete next['sub:candidates:edit_player'];
  }

  (Object.entries(SPECIFIC_ACTIONS_BY_SUBMODULE) as [SpecificSubModule, readonly string[]][]).forEach(
    ([subId, specKeys]) => {
      specKeys.forEach((specKey) => {
        const prefix = `sub:${subId}:${specKey}`;
        const hasGranular = CRUD_KEYS.some((crud) => Boolean(next[`${prefix}:${crud}`]));
        const legacyAliases = resolveLegacyAliases(subId, specKey);
        const hasLegacy = legacyAliases.some((k) => Boolean(next[k]));

        if (!hasGranular && hasLegacy) {
          CRUD_KEYS.forEach((crud) => {
            next[`${prefix}:${crud}`] = true;
          });
          next[`sub:${subId}:read`] = true;
        }

        // Nettoyer les anciennes clés plates pour que la sauvegarde enregistre des clés CRUD strictes
        legacyAliases.forEach((k) => {
          delete next[k];
        });
      });
    }
  );

  // Nettoyer également l'ancien alias reports si présent
  if (next['sub:candidates:reports']) {
    delete next['sub:candidates:reports'];
  }

  return next;
};

export const findSubModuleForSpecificAction = (specificAction: string): SpecificSubModule | undefined =>
  SPECIFIC_TO_SUBMODULE_LOOKUP[specificAction];
