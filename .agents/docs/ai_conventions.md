# 🤖 Directives & Conventions pour l'IA

## 1. Principes de Développement

1. **Design Premium** : Les interfaces créées doivent respecter le design system (couleurs harmonieuses, mode sombre, micro-animations, typographie propre).
2. **Aucune Hypothèse** : Ne jamais deviner le nom de fichiers, colonnes SQL ou fonctions sans vérifier le code existant avec les outils de recherche.
3. **Validation Runtime** : Vérifier que le projet compile (`npm run build` ou vérifications TypeScript) après modification majeure.

---

## 2. Interaction avec les Agents IA (@mentions)

L'IA prend en compte les 6 rôles définis dans `.agents/skills/` :
- `@project_owner`
- `@architect_solution`
- `@backend_developer`
- `@front_end_developer`
- `@ui_ux_integrator`
- `@qa_tester`
