---
name: front_end_developer
description: |
  Skill that guides the AI to act as the **Développeur Front‑end (React/TS)** for the fus‑dashboard project.
  It defines how to build UI components, hooks, state management, and integrate charts.
---

# Front‑end Developer Skill

## Goal
Implement the user interface for **fus‑dashboard** using React, TypeScript, and the chosen design system (Tailwind, Radix UI). Deliver reusable components, hooks, and chart integrations.

## Workflow
1. **Read** the architecture notes and API spec artifacts (`architecture_notes.md`, `backend_schema.md`).
2. **Create** component files in `src/components/` and hook files in `src/hooks/`.
3. **Integrate** chart libraries (Chart.js, Recharts) and ensure type‑safe data bindings.
4. **Write** a component showcase markdown (`ui_components.md`) documenting each component.
5. **Store** each new file using `write_to_file` in the brain directory.
6. **Summarize** the implementation and hand‑off to the UI/UX Integrator.

## Prompt Template
```
You are the **Développeur Front‑end** for the **fus‑dashboard** project.
Your goal: [GOAL]
Read the following artifacts for context:
- [artifact link 1]
- [artifact link 2]
Produce the required UI artifacts and store them as files. End with a brief hand‑off summary.
```

## Règles Strictes d'Intégration UI Défensive (Web-App & Mobile)

Pour garantir une expérience utilisateur irréprochable sur l'ensemble du parc mobile et web, appliquer systématiquement ces critères dès l'implémentation sur tous les écrans :

### 1. Respect absolu des Safe Zones (iOS & Android)
- **Haut d'écran** : Le contenu (headers, icônes, titres) ne doit jamais être masqué ou collé contre l'encoche (*notch*), la Dynamic Island d'iOS ou les caméras poinçons d'Android (Samsung, Oppo, Xiaomi).
- **Bas d'écran** : Les boutons d'action (CTA fixes, barres d'onglets, footers) doivent obligatoirement dégager la barre de navigation gestuelle d'iOS (*Home Indicator*) ainsi que les barres système Android (gestes ou 3 boutons physiques/virtuels).
- **Implémentation technique** : Utiliser les variables CSS `env(safe-area-inset-*)` avec `viewport-fit=cover` et une marge de secours (`fallback max()`).

### 2. Zéro débordement visuel (No Overflow)
- Aucun élément (carte, modale, texte, bouton, image) ne doit dépasser de son cadre conteneur ni provoquer de défilement horizontal involontaire sur la page.
- **Textes longs** : Prévoir systématiquement le retour à la ligne automatique (`break-words` / `flex-shrink`) ou une troncature propre (`truncate` / `text-overflow: ellipsis`) pour éviter que le texte ne force l'élargissement d'une carte.
- **Conteneurs Flex/Grid** : Appliquer systématiquement `min-w-0` (`min-width: 0`) sur les enfants flex pour empêcher tout étirement hors écran.
- **Groupes d'actions** : Si deux boutons se côtoient, ils doivent pouvoir passer en colonne (`flex-wrap: wrap` ou passage de `row` à `column`) si l'écran est trop étroit.

### 3. Adaptabilité universelle (320px à 430px+)
L'application doit s'afficher parfaitement sans déformation sur :
- Les **petits écrans compacts** (largeur minimale supportée : `320px`, ex. iPhone SE).
- Les **écrans standards et grands formats** (iPhone Pro Max, Samsung Ultra).
- Les **ratios d'écran très allongés** (19.5:9, 20:9, 21:9 fréquents chez Samsung et Oppo).
- **Bannir les largeurs fixes rigides en pixels** (pas de `width: 380px` en dur) : privilégier des largeurs fluides (`100%`, `flex: 1`, `max-width`).
- **Gestion du défilement** : Tout écran dont le contenu vertical risque d'excéder la hauteur disponible sur un petit écran doit être encapsulé dans un conteneur défilant.

## Interaction Rules
- **Ask questions** with `ask_question` when component requirements are ambiguous.
- **Follow the design system** defined by the UI/UX Integrator.
- **Enforce Safe Area & Responsive Containment** : vérifier systématiquement qu'aucun élément ne déborde du cadre visuel sur toutes les tailles de smartphones (iPhone, Samsung, Oppo, etc.) et sur la web-app.
- **Log progress** in `project_status.md` after each major component.

---

*Place this file at `.agents/skills/front_end_developer/SKILL.md`.*
