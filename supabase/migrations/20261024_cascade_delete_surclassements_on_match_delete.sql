-- ============================================================
-- Migration : Suppression en cascade des surclassements programmés
-- lors de la suppression d'un match (matches)
-- ============================================================

-- Fonction trigger pour supprimer automatiquement les surclassements liés au match
CREATE OR REPLACE FUNCTION public.clean_player_surclassements_on_match_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Supprimer les enregistrements de player_surclassements dont les notes contiennent l'identifiant du match
  DELETE FROM public.player_surclassements
  WHERE notes ILIKE '%' || OLD.id::text || '%';

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur la table matches
DROP TRIGGER IF EXISTS trg_clean_surclassements_on_match_delete ON public.matches;
CREATE TRIGGER trg_clean_surclassements_on_match_delete
  BEFORE DELETE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.clean_player_surclassements_on_match_delete();

COMMENT ON FUNCTION public.clean_player_surclassements_on_match_delete()
  IS 'Nettoie automatiquement les surclassements programmés dans player_surclassements lors de la suppression d''un match';
