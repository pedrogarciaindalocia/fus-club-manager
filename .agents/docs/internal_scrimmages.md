# ⚽ Gestion des Oppositions Internes (FUS vs FUS Chasubles)

## 📌 Contexte & Objectif
Permettre au staff technique de planifier et d'orchestrer des **oppositions internes** (matchs d'entraînement, matchs de sélection, revue d'effectif) selon deux modes :
1. **Entre le groupe (Intra-squad)** : Le même groupe / équipe (ex: U13 Groupe A) est scindé en deux formations (Équipe A vs Équipe B Chasubles).
2. **Vs Catégorie (Inter-category)** : Une catégorie affronte une catégorie supérieure ou inférieure (ex: U17 vs U19).

---

## ⚙️ Spécifications Métier & Comportement de l'Assistant Wizard

### 1. Mode "Entre le groupe" (`intra_squad`)
- **Équipe A (Étape 3)** : Le coach choisit la composition du format sélectionné (6v6 jusqu'à 11v11).
  - L'action `⚡ Aligner X Titulaires` (`autoPositionPlayers`) ne remplit plus automatiquement tout le banc des remplaçants de l'Équipe A avec l'intégralité du reste du groupe. Elle aligne uniquement les titulaires nécessaires au format du match.
- **Équipe B / Chasubles (Étape 4)** :
  - L'effectif disponible pour l'équipe adverse correspond **exclusivement aux joueurs restants du groupe** non alignés dans le 11/8 de départ de l'Équipe A (`allGroupPlayers.filter(p => !startingXI.includes(p.id))`).
  - Si des joueurs avaient été placés temporairement sur le banc de l'Équipe A, ils apparaissent avec un indicateur `BANC A` et basculent automatiquement vers l'Équipe B dès qu'ils sont sélectionnés ou auto-positionnés, sans doublon.
  - Le bouton `⚡ Auto (X)` positionne instantanément les joueurs restants dans la composition adverse (titulaires et remplaçants).

### 2. Mode "Vs Catégorie" (`inter_category`)
- L'équipe adverse est composée des joueurs de la catégorie ou équipe cible sélectionnée (ex: U15 ou U19).

---

## 🗄️ Persistance Supabase & Structure des Données
- **Structure SQL de la table `matches`** : Les champs `match_format` et `match_type` ne sont pas des colonnes scalaires directes de la table Postgres `matches`.
- **Stockage dans `lineup` (JSONB)** : Ils sont persistés dans l'objet JSONB `matches.lineup` :
  ```json
  {
    "startingXI": [...],
    "substitutes": [...],
    "formation": "3-3-1",
    "match_format": 8,
    "match_type": "internal_scrimmage",
    "internal_opposition": {
      "is_internal_scrimmage": true,
      "internal_opposition_type": "intra_squad",
      "internal_target_category": null,
      "internal_opponent_team_id": null
    }
  }
  ```
- **Stabilité des `useEffect` (Hooks)** :
  - Les hooks `useTeams` et `useCompetitions` fournissent des fallbacks de tableaux vides constants (`EMPTY_TEAMS`, `EMPTY_LEAGUES`, `EMPTY_STADIUMS`) pour éviter la recréation de références pendant le chargement.
  - Les `useEffect` dans `ScheduleMatchWizard` comparent l'état existant avant tout appel de mise à jour pour prévenir le dépassement de profondeur React (`Maximum update depth exceeded`).

- **Durée dynamique & Timeline réelle (`MatchOverviewPanel.tsx`)** :
  - La durée du match (mi-temps et durée totale) s'adapte automatiquement au format : si le match est en jeu réduit (<= 8 joueurs ou catégories U7 à U13), la durée par défaut est de 30 min par mi-temps (60 min au total) ou la valeur configurée dans `half_duration_minutes`.
  - La timeline horizontale et le macaron central affichent la durée réelle (ex: 60' au lieu de 90' figé).
  - La timeline Play to Play résout les noms de joueurs via `full_name`, `extra.player_name`, et réconcilie la clé `player_id` (snake_case DB) et `playerId`.

---

## 📁 Fichiers Clés
- [`ScheduleMatchWizard.tsx`](file:///Users/macbook/Desktop/FuscClub/fus-dashboard/src/features/match-management/ScheduleMatchWizard.tsx) : Assistant de planification et d'orchestration de match.
- [`MatchManagementPage.tsx`](file:///Users/macbook/Desktop/FuscClub/fus-dashboard/src/features/match-management/MatchManagementPage.tsx) : Vue calendrier, filtres et lancement de l'orchestration.
- [`MatchOverviewPanel.tsx`](file:///Users/macbook/Desktop/FuscClub/fus-dashboard/src/features/match-management/MatchOverviewPanel.tsx) : Vue détaillée, timeline play-to-play, statistiques et compositions tactiques.
