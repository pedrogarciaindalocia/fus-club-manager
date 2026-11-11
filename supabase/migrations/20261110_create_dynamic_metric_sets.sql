-- ==============================================================================
-- Migration : Multi-Lots de Métriques Dynamiques Isolés des Scouts (US-DASH-136)
-- Tables : public.metric_sets & public.metric_set_positions
-- Date : 2026-11-10
-- Note : Ne modifie PAS public.metric_positions (sanctuarisée pour Scouts & fus-scout)
-- À exécuter dans : Supabase Dashboard → SQL Editor → New Query → Run
-- ==============================================================================

-- 1. Fonction helper RLS : détecte tout compte appartenant à la branche Scout
CREATE OR REPLACE FUNCTION public.is_scout_account()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND (
            LOWER(COALESCE(up.system_role, '')) LIKE 'scout%'
            OR LOWER(COALESCE(up.job_title, '')) LIKE '%scout%'
            OR LOWER(COALESCE(up.job_title, '')) LIKE '%détecteur%'
            OR LOWER(COALESCE(up.job_title, '')) LIKE '%detecteur%'
          )
      )
      OR (
        COALESCE((auth.jwt() ->> 'email'), '') <> ''
        AND EXISTS (
          SELECT 1
          FROM public.scouts sc
          WHERE LOWER(COALESCE(sc.email, '')) = LOWER(COALESCE((auth.jwt() ->> 'email'), ''))
        )
      )
    )
  );
$$;

-- 2. Table des lots de métriques dynamiques (hors-scouts)
CREATE TABLE IF NOT EXISTS public.metric_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  emoji VARCHAR(20) NOT NULL DEFAULT '📈',
  scope VARCHAR(60) NOT NULL DEFAULT 'player_performance'
    CHECK (scope IN ('player_performance', 'training_performance', 'match_performance', 'custom')),
  exclude_scouts BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Table des postes & critères 4 piliers par lot dynamique
CREATE TABLE IF NOT EXISTS public.metric_set_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_set_id UUID NOT NULL REFERENCES public.metric_sets(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  emoji VARCHAR(20) NOT NULL DEFAULT '👤',
  category VARCHAR(50) NOT NULL CHECK (category IN ('GK', 'DF', 'MF', 'FW')),
  criteria JSONB NOT NULL DEFAULT '{"technique": [], "tactique": [], "physique": [], "mental": []}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (metric_set_id, code)
);

-- 4. Index de performance
CREATE INDEX IF NOT EXISTS idx_metric_sets_scope ON public.metric_sets(scope);
CREATE INDEX IF NOT EXISTS idx_metric_sets_sort ON public.metric_sets(sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_metric_set_positions_set_id ON public.metric_set_positions(metric_set_id);
CREATE INDEX IF NOT EXISTS idx_metric_set_positions_cat ON public.metric_set_positions(metric_set_id, category);

-- 5. Permissions & Row Level Security (blocage strict des comptes Scouts)
GRANT ALL ON TABLE public.metric_sets TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.metric_set_positions TO anon, authenticated, service_role;

ALTER TABLE public.metric_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_set_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "metric_sets_non_scout_authenticated" ON public.metric_sets;
CREATE POLICY "metric_sets_non_scout_authenticated"
  ON public.metric_sets
  FOR ALL
  TO authenticated
  USING (NOT (exclude_scouts AND public.is_scout_account()))
  WITH CHECK (NOT (exclude_scouts AND public.is_scout_account()));

DROP POLICY IF EXISTS "metric_sets_anon_dashboard_dev" ON public.metric_sets;
CREATE POLICY "metric_sets_anon_dashboard_dev"
  ON public.metric_sets
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "metric_set_positions_non_scout_authenticated" ON public.metric_set_positions;
CREATE POLICY "metric_set_positions_non_scout_authenticated"
  ON public.metric_set_positions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.metric_sets ms
      WHERE ms.id = metric_set_positions.metric_set_id
        AND NOT (ms.exclude_scouts AND public.is_scout_account())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.metric_sets ms
      WHERE ms.id = metric_set_positions.metric_set_id
        AND NOT (ms.exclude_scouts AND public.is_scout_account())
    )
  );

DROP POLICY IF EXISTS "metric_set_positions_anon_dashboard_dev" ON public.metric_set_positions;
CREATE POLICY "metric_set_positions_anon_dashboard_dev"
  ON public.metric_set_positions
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- 6. Seed initial : Lot par défaut "Performance Joueur (Club)" (hors-scouts)
INSERT INTO public.metric_sets (code, name, description, emoji, scope, exclude_scouts, is_active, sort_order)
VALUES (
  'player_performance',
  'Performance Joueur',
  'Référentiel dynamique dédié à la performance des joueurs du club (isolé des scouts et de Détection V2).',
  '📈',
  'player_performance',
  true,
  true,
  1
)
ON CONFLICT (code) DO NOTHING;

WITH perf_set AS (
  SELECT id FROM public.metric_sets WHERE code = 'player_performance' LIMIT 1
)
INSERT INTO public.metric_set_positions (metric_set_id, code, name, emoji, category, sort_order, criteria)
SELECT
  perf_set.id,
  v.code,
  v.name,
  v.emoji,
  v.category,
  v.sort_order,
  v.criteria::jsonb
FROM perf_set
CROSS JOIN (
  VALUES
    ('GK', 'Gardien de but', '🧤', 'GK', 1, '{"technique":["Prise de balle & captage","Jeu au pied court & long","Relance sous pression","Sorties aériennes","Arrêts réflexes"],"tactique":["Placement sur la ligne & angle","Gestion de la profondeur","Communication défensive","Lecture des centres"],"physique":["Détente & impulsion","Explosivité appuis","Agilité au sol","Coordination"],"mental":["Concentration sur 90 min","Calme sous pression","Autorité dans la surface","Résilience après erreur"]}'),
    ('CB', 'Défenseur central', '🛡️', 'DF', 2, '{"technique":["Contrôle orienté & première relance","Passe entre les lignes","Jeu aérien défensif & offensif","Tacle & interception propre"],"tactique":["Alignement ligne défensive","Couverture & gestion profondeur","Duel 1 contre 1 défensif","Cadrage porteur de balle"],"physique":["Vitesse de récupération","Puissance dans les duels","Endurance de concentration","Impulsion aérienne"],"mental":["Leadership défensif","Communication constante","Sang-froid à la relance","Agressivité maîtrisée"]}'),
    ('RB', 'Latéral droit', '🏃', 'DF', 3, '{"technique":["Contrôle en course","Centre en première intention","Dribble & dédoublement","Passe verticale sur couloir"],"tactique":["Gestion couloir défensif","Fermeture second poteau","Timing montées offensives","Transitions avec et sans ballon"],"physique":["Vitesse maximale & répétée","Capacité aérobie (allers-retours)","Explosivité 1ers mètres","Résistance physique"],"mental":["Rigueur défensive","Générosité dans l''effort","Prise d''initiative couloir","Lucidité fin de match"]}'),
    ('LB', 'Latéral gauche', '🏃', 'DF', 4, '{"technique":["Contrôle en course pied gauche","Centre précis en mouvement","Combinaison couloir & intérieur","Passe sous pression"],"tactique":["Fermeture axe & couloir","Alignement hors-jeu","Timing projection offensive","Compensation défensive"],"physique":["Vitesse de sprint répété","Endurance haute intensité","Vivacité d''appuis","Duel épaule contre épaule"],"mental":["Régularité sur le match","Courage défensif","Adaptation tactique","Concentration sans ballon"]}'),
    ('CDM', 'Milieu défensif', '⚙️', 'MF', 5, '{"technique":["Prise d''information avant contrôle","Orientation du jeu court & long","Protection de balle sous pressing","Récupération propre sans faute"],"tactique":["Équilibre bloc équipe","Couverture des montées de latéraux","Coupe des lignes de passe","Déclenchement du contre-pressing"],"physique":["Volume de course global","Impact dans les duels","Résistance à la fatigue","Mobilité latérale"],"mental":["Lecture anticipative du jeu","Sérénité sous haute pression","Discipline positionnelle","Leadership au cœur du jeu"]}'),
    ('CM', 'Milieu central', '🎯', 'MF', 6, '{"technique":["Contrôle orienté vers l''avant","Passe cassant des lignes","Projection & frappe de loin","Conduite sous pression"],"tactique":["Disponibilité entre les lignes","Lien défense-attaque","Alternance jeu court / long","Repli défensif rapide"],"physique":["Endurance intermittente (de surface à surface)","Vivacité changements de rythme","Puissance dans les duels","Récupération entre efforts"],"mental":["Intelligence tactique","Justesse des choix sous fatigue","Personnalité à la construction","Régularité mentale"]}'),
    ('CAM', 'Milieu offensif', '🎨', 'MF', 7, '{"technique":["Contrôle orienté petit périmètre","Dernière passe décisive","Dribble éliminatoire","Frappe placée entrée de surface"],"tactique":["Prise d''espace inter-lignes","Création supériorité zone 14","Appel en soutien attaquant","Premier rideau de pressing"],"physique":["Accélération sur 10m","Agilité & équilibre appuis","Vitesse d''exécution gestuelle","Endurance d''intensité"],"mental":["Créativité sous contrainte","Sang-froid dans le dernier geste","Vision périphérique","Prise de risque calculée"]}'),
    ('RW', 'Ailier droit', '🪽', 'FW', 8, '{"technique":["Dribble 1 contre 1 en vitesse","Centre tendu ou en retrait","Rentrée intérieur pied gauche","Finition en angle fermé"],"tactique":["Élargissement bloc adverse","Appel dans le dos du latéral","Attaque second poteau","Repli sur latéral adverse"],"physique":["Vitesse pure & démarrage","Explosivité changements d''appui","Répétition de sprints haute intensité","Résistance aux contacts"],"mental":["Audace & percussion","Efficacité dans la zone de vérité","Persévérance après échec en 1 contre 1","Disponibilité constante"]}'),
    ('LW', 'Ailier gauche', '🪽', 'FW', 9, '{"technique":["Dribble 1 contre 1 extérieur / intérieur","Frappe enroulée pied opposé","Combiné court avec latéral/10","Dernière passe surface"],"tactique":["Attaque de la profondeur","Fixation & libération d''espace","Transition offensive immédiate","Pressing orienté sur relance"],"physique":["Accélération explosive","Agilité & feintes de corps","Endurance répétition sprints","Équilibre à haute vitesse"],"mental":["Confiance dans le un contre un","Lucidité devant le but","Implication défensive collective","Réactivité transitions"]}'),
    ('ST', 'Avant-centre', '⚽', 'FW', 10, '{"technique":["Finition 1 touche pied/tête","Contrôle & remise dos au but","Protection du ballon dans la surface","Frappe puissante & placée"],"tactique":["Déplacements de rupture & décrochage","Occupation charnière centrale","Pressing coordonné des relances","Timing appels dans surface"],"physique":["Puissance & engagement duels","Détente aérienne","Explosivité sur 5-15m","Résistance au marquage serré"],"mental":["Sang-froid face au gardien","Instinct de buteur","Combativité permanente","Résilience si peu servi"]}')
) AS v(code, name, emoji, category, sort_order, criteria)
ON CONFLICT (metric_set_id, code) DO NOTHING;

COMMENT ON TABLE public.metric_sets IS 'Lots dynamiques de métriques (Performance Joueur, Entraînement, Match) isolés des grilles Scouts (metric_positions)';
COMMENT ON TABLE public.metric_set_positions IS 'Postes et critères 4 piliers associés à un lot dynamique de public.metric_sets';

-- 7. Extension rétrocompatible pour les rubriques Compétition & Matchs + Entraînements
DO $$
BEGIN
  IF to_regclass('public.match_players') IS NOT NULL THEN
    ALTER TABLE public.match_players
      ADD COLUMN IF NOT EXISTS metric_set_id UUID REFERENCES public.metric_sets(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS pillar_scores JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF to_regclass('public.player_training_evaluations') IS NOT NULL THEN
    ALTER TABLE public.player_training_evaluations
      ADD COLUMN IF NOT EXISTS metric_set_id UUID REFERENCES public.metric_sets(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS metric_set_name TEXT,
      ADD COLUMN IF NOT EXISTS position_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS criteria_scores JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;


