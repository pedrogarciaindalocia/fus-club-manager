# 🗄️ Supabase & Database Specs - fus-dashboard

## 1. Vue d'ensemble de la Base de Données

Le projet utilise **Supabase** comme Backend-as-a-Service et base de données PostgreSQL.

---

## 2. Scripts et Migrations SQL

Les fichiers SQL principaux se trouvent à la racine et dans `supabase/` :

- `supabase_app_public_read.sql` : Configuration des accès lecture publique / RLS.
- `supabase_rbac_migration.sql` : Système de rôles et permissions (RBAC).
- `supabase_arbitres_migration.sql` : Table `arbitres` (corps arbitral), index, RLS et triggers.
- `20260901_create_opponent_players.sql` : Table `opponent_players` (effectif des clubs adversaires par catégorie, RLS & index).
- `20260909_create_scouts_table.sql` : Table `scouts` (cellule recrutement, profils recruteurs, régions & catégories).
- `20260914_fix_scouts_rls_full_access.sql` : Politiques RLS full access pour la table `scouts`.
- `supabase_mock_data.sql` / `fake_data_maroc.sql` : Données de test.


---

## 3. Politiques RLS (Row Level Security)

Chaque table créée doit obligatoirement avoir RLS activé :

```sql
ALTER TABLE nom_de_la_table ENABLE ROW LEVEL SECURITY;
```

---

## 4. Conventions de nommage SQL

- **Tables** : `snake_case` au pluriel (ex: `users`, `match_statistics`, `arbitres`).
- **Colonnes** : `snake_case` au singulier (ex: `created_at`, `user_id`, `numero_licence`).
- **Clés primaires** : `id` (type `uuid` généré via `gen_random_uuid()`, ou `bigint GENERATED ALWAYS AS IDENTITY` pour certaines tables de registre).

