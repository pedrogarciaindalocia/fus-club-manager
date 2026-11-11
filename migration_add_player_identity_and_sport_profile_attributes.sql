-- ============================================================
-- Migration : Ajout des attributs d'Identité et de Profil Sportif
-- Conforme à la nomenclature officielle des effectifs (FUS Rabat)
-- ============================================================

-- 1. Attributs Section IDENTITÉ
-- N° dans la catégorie (ordre / matricule au sein de la catégorie)
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS category_number integer;

-- Prénom et Nom séparés (en complément de full_name)
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS first_name text;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS last_name text;

-- Année de naissance (stockée pour indexation / export direct)
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS birth_year integer;

-- 2. Attributs Section PROFIL SPORTIF
-- Poste(s) secondaire(s) (polyvalence sportive)
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS secondary_position text;

-- 3. Rétro-remplissage des joueurs existants (Backfill)
-- Découpage de full_name en prénom / nom et extraction de l'année de naissance
UPDATE public.players
SET 
  first_name = CASE 
    WHEN (first_name IS NULL OR first_name = '') AND full_name IS NOT NULL AND full_name <> '' 
      THEN split_part(trim(full_name), ' ', 1)
    ELSE first_name 
  END,
  last_name = CASE 
    WHEN (last_name IS NULL OR last_name = '') AND full_name IS NOT NULL AND full_name <> '' AND position(' ' in trim(full_name)) > 0 
      THEN substring(trim(full_name) from position(' ' in trim(full_name)) + 1)
    WHEN (last_name IS NULL OR last_name = '') AND full_name IS NOT NULL AND full_name <> '' 
      THEN trim(full_name)
    ELSE last_name 
  END,
  birth_year = CASE 
    WHEN birth_year IS NULL AND birth_date IS NOT NULL 
      THEN EXTRACT(YEAR FROM birth_date)::integer
    ELSE birth_year 
  END
WHERE first_name IS NULL OR last_name IS NULL OR birth_year IS NULL;

-- 4. Trigger de synchronisation automatique (first_name + last_name <-> full_name & birth_date -> birth_year)
CREATE OR REPLACE FUNCTION public.fn_sync_player_identity_and_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Si first_name ou last_name sont renseignés, construire automatiquement full_name
  IF (NEW.first_name IS NOT NULL AND NEW.first_name <> '') OR (NEW.last_name IS NOT NULL AND NEW.last_name <> '') THEN
    NEW.full_name := trim(concat_ws(' ', NULLIF(NEW.first_name, ''), NULLIF(NEW.last_name, '')));
  -- Inversement, si seul full_name est fourni, remplir first_name et last_name
  ELSIF (NEW.full_name IS NOT NULL AND NEW.full_name <> '') AND (NEW.first_name IS NULL OR NEW.first_name = '') THEN
    NEW.first_name := split_part(trim(NEW.full_name), ' ', 1);
    IF position(' ' in trim(NEW.full_name)) > 0 THEN
      NEW.last_name := substring(trim(NEW.full_name) from position(' ' in trim(NEW.full_name)) + 1);
    ELSE
      NEW.last_name := trim(NEW.full_name);
    END IF;
  END IF;

  -- Synchroniser automatiquement l'année de naissance
  IF NEW.birth_date IS NOT NULL THEN
    NEW.birth_year := EXTRACT(YEAR FROM NEW.birth_date)::integer;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_player_identity_and_profile ON public.players;
CREATE TRIGGER trg_sync_player_identity_and_profile
BEFORE INSERT OR UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_player_identity_and_profile();

-- 5. Commentaires explicatifs sur les colonnes
COMMENT ON COLUMN public.players.category_number IS 'N° dans la catégorie (ordre / matricule dans l''effectif)';
COMMENT ON COLUMN public.players.first_name IS 'Prénom du joueur';
COMMENT ON COLUMN public.players.last_name IS 'Nom de famille du joueur';
COMMENT ON COLUMN public.players.birth_year IS 'Année de naissance déduite de la date de naissance';
COMMENT ON COLUMN public.players.secondary_position IS 'Poste(s) secondaire(s) du joueur';
