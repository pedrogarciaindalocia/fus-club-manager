# API Externe Joueurs (`players-export-api`)

Edge Function Supabase en lecture seule (`GET`) permettant à une plateforme externe d'accéder aux informations d'identité, au profil sportif et aux statistiques agrégées des joueurs (`fus-dashboard`).

## 1. Déploiement & Configuration

Depuis le dossier `fus-dashboard` :

```bash
# 1. Configurer la clé API secrète pour la plateforme partenaire
supabase secrets set EXTERNAL_API_KEY="VOTRE_CLE_API_FORTE_ICI"

# 2. Déployer la fonction sans vérification JWT Supabase (auth gérée par x-api-key)
supabase functions deploy players-export-api --no-verify-jwt
```

## 2. Exemples d'utilisation (`curl`)

### Lister les joueurs (paginé)
```bash
curl -s "https://<PROJECT_REF>.supabase.co/functions/v1/players-export-api/players?page=1&limit=50&is_active=true" \
  -H "x-api-key: VOTRE_CLE_API_FORTE_ICI"
```

### Filtrer par catégorie ou synchronisation incrémentale
```bash
curl -s "https://<PROJECT_REF>.supabase.co/functions/v1/players-export-api/players?category=U19&updated_since=2026-11-01T00:00:00Z" \
  -H "x-api-key: VOTRE_CLE_API_FORTE_ICI"
```

### Récupérer un joueur par son UUID
```bash
curl -s "https://<PROJECT_REF>.supabase.co/functions/v1/players-export-api/players/<PLAYER_UUID>" \
  -H "x-api-key: VOTRE_CLE_API_FORTE_ICI"
```
