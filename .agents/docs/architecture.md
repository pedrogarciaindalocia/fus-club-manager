# 🏗️ Architecture Technique - fus-dashboard

## 1. Stack Technologique

- **Frontend** : React 18+, TypeScript, Vite
- **Styling** : TailwindCSS, PostCSS, Radix UI
- **Visualisation de données** : Chart.js / Recharts
- **Backend / BDD** : Supabase (PostgreSQL), Row Level Security (RLS)
- **CI/CD & Hosting** : Netlify

---

## 2. Arborescence du Projet

```text
fus-dashboard/
├── .agents/               # Configuration et documentation IA
│   ├── docs/              # Base de connaissances Markdown pour l'IA
│   ├── rules/             # Règles globales du projet
│   ├── skills/            # Rôles et compétences des agents IA
│   └── workflow.md        # Cycle de vie et orchestrations des agents
├── public/                # Assets statiques
├── src/                   # Code source React / TypeScript
│   ├── components/        # Composants UI réutilisables
│   ├── hooks/             # Custom Hooks React
│   ├── pages/              # Pages principales du dashboard
│   ├── services/          # Intégrations API & Supabase Client
│   └── types/             # Définitions des types TypeScript
├── supabase/              # Migrations, fonctions et scripts SQL
├── index.html             # Entrée HTML principale
└── package.json           # Dépendances et scripts
```

---

## 3. Modules Principaux & Navigation

1. **Compétition & Matchs** : Calendrier (`/matches`), Match Day Live (`/matchday`), Compétitions (`/leagues`), Clubs Adversaires (`/opponents`), Stades (`/stadiums`).
2. **Effectif & Sportif** : Joueurs (`/players`), Unités d'Équipe (`/teams`), Staff Technique (`/staff`), Arbitres (`/arbitres`).
3. **Recrutement & Détection** :
   - Fiches candidats & Joueurs à l'essai (`/recruitment?tab=candidates`).
   - Planning des sessions de tests (`/recruitment?tab=sessions`).
   - Évaluations 4 piliers (Physique, Mental, Tactique, Technique) (`/recruitment?tab=evaluations`).
   - Comparateur visuel interactif en graphique Radar multi-joueurs (`/recruitment?tab=compare`).
4. **Système & Contenu** : Blog (`/blog`), Store (`/store`), Utilisateurs (`/users`), Logs & Audit de sécurité (`/logs`).
5. **Configuration** : Paramètres du Club (`/settings`).

---

## 4. Principes d'Architecture

- **Modularité** : Composants atomiques et découplés dans `src/components/` et `src/features/`.
- **Navigation Hiérarchique Accordéon** : Gestion automatique de l'état ouvert/fermé par catégorie et détection intelligente de la route active.
- **Visualisation Radar (Recharts)** : Graphiques polygonaux dynamiques sur 4 piliers (20 sous-critères) avec calcul automatique des moyennes pondérées.
- **Typage Strict** : Tout le code TypeScript est typé sans `any` avec `import type`.
- **Sécurité Supabase & RLS** : Toutes les tables de recrutement et d'audit ont des politiques RLS actives.

