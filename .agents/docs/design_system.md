# 🎨 Design System & Typographie — fus-dashboard

Ce document synthétise les tokens de design, l'échelle typographique et les conventions visuelles de l'application **fus-dashboard**.

---

## 1. Échelle Typographique (Base Rem Scaling)

Afin d'assurer une lisibilité accrue tout en conservant des proportions harmonieuses sur l'ensemble des modules (cartes, tableaux, modales, graphiques), l'échelle de base est configurée au niveau de l'élément racine (`html`) :

- **Taille racine (Root Font Size)** : `18px` (+12.5% par rapport aux 16px par défaut du navigateur).
- **Police principale** : `Inter`, sans-serif (chargée via Google Fonts dans `index.html`).

### Tableau des correspondances de taille

| Classe Tailwind | Valeur en `rem` | Rendu réel calculé | Usage principal |
| :--- | :--- | :--- | :--- |
| `text-[9px]` / `text-[10px]` | ~0.55rem - 0.6rem | 10px - 11px | Badges condensés, métadonnées secondaires |
| `text-xs` | `0.75rem` | 13.5px | Sous-titres, étiquettes, tags, statuts |
| `text-sm` | `0.875rem` | 15.75px | Corps de texte standard, items de tableaux |
| `text-base` | `1rem` | 18px | Texte courant, descriptions, inputs |
| `text-lg` | `1.125rem` | 20.25px | Titres de cartes, modales, items mis en avant |
| `text-xl` | `1.25rem` | 22.5px | En-têtes de sections, KPI majeurs |
| `text-2xl` | `1.5rem` | 27px | Titres principaux de modales |
| `text-3xl` | `1.875rem` | 33.75px | Titres de pages & Dashboards |
| `text-4xl` | `2.25rem` | 40.5px | Grands indicateurs numériques |

---

## 2. Palette de Couleurs & Thème (HSL)

Les couleurs sont définies via des variables CSS dynamiques supportant les modes clair et sombre :

- **Primary Red** : `hsl(0 72% 56%)` (#E03D3D) — Identité FUS Club
- **Background Light** : `hsl(0 0% 100%)` / **Dark** : `hsl(240 28% 8%)`
- **Foreground Light** : `hsl(240 28% 15%)` / **Dark** : `hsl(0 0% 98%)`
- **Secondary** : `hsl(240 10% 96%)` / `hsl(240 10% 15%)`
- **Muted** : `hsl(240 10% 96%)` / `hsl(240 10% 15%)`
- **Border** : `hsl(240 10% 90%)` / `hsl(240 10% 20%)`

---

## 3. Layout & Structure Globale

- **Sidebar** : Largeur déployée `lg:w-72` (288px) et repliée `w-20` (80px) avec navigation en accordéon hiérarchique.
- **Header** : Hauteur fixe `h-20` (80px), synchronisé avec les marges de la sidebar (`md:left-20`, `lg:left-72`).
- **Conteneur Principal** : `max-w-[1750px] mx-auto` avec marges aérées (`p-4 sm:p-6 md:p-8 xl:p-10`), offrant un confort de lecture optimal sur les grands écrans.

