-- ==============================================================================
-- Migration : Correction RLS et Permissions complètes pour la table scouts
-- Date : 2026-09-14
-- Auteur : Chef de Projet / Équipe Technique FUS
-- ==============================================================================

-- 1. S'assurer que RLS est actif
ALTER TABLE public.scouts ENABLE ROW LEVEL SECURITY;

-- 2. Nettoyage des anciennes politiques restrictives
DROP POLICY IF EXISTS "Allow authenticated users full access to scouts" ON public.scouts;
DROP POLICY IF EXISTS "Allow public read access to scouts" ON public.scouts;
DROP POLICY IF EXISTS "Allow full access for scouts" ON public.scouts;

-- 3. Politique permissive universelle (alignée avec opponent_players et trial_candidates)
CREATE POLICY "Allow full access for scouts" 
  ON public.scouts 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- 4. Assurer l'indexation sur les colonnes clés
CREATE INDEX IF NOT EXISTS idx_scouts_status ON public.scouts(status);
CREATE INDEX IF NOT EXISTS idx_scouts_region ON public.scouts(recruitment_region);
