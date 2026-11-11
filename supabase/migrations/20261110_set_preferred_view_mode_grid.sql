-- Passer la préférence d'affichage par défaut du club à 'grid' (mode Grille)
ALTER TABLE public.settings
  ALTER COLUMN preferred_view_mode SET DEFAULT 'grid';

UPDATE public.settings
SET preferred_view_mode = 'grid',
    updated_at = NOW()
WHERE preferred_view_mode IS NULL
   OR preferred_view_mode = 'list';

