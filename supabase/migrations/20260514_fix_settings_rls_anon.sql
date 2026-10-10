-- ============================================================
-- Fix : permettre à anon (non-authentifié / dev mode) de
--       lire et modifier les settings du club par défaut FUS.
-- ============================================================

-- Supprime les anciennes policies sur settings pour les recréer
DROP POLICY IF EXISTS "settings_select" ON public.settings;
DROP POLICY IF EXISTS "settings_insert" ON public.settings;
DROP POLICY IF EXISTS "settings_update" ON public.settings;
DROP POLICY IF EXISTS "settings_delete" ON public.settings;

-- Constante : club FUS Rabat
DO $$
DECLARE
  FUS_CLUB_ID uuid := '45642829-a3d7-48de-afdd-3c45a1ced474';
BEGIN

  -- SELECT : authentifié → son club   |   anon → club FUS par défaut
  EXECUTE format(
    $pol$CREATE POLICY "settings_select" ON public.settings
      FOR SELECT
      USING (
        club_id = public.get_my_club_id()
        OR (auth.uid() IS NULL AND club_id = %L)
      )$pol$,
    FUS_CLUB_ID
  );

  -- INSERT : authentifié uniquement
  EXECUTE format(
    $pol$CREATE POLICY "settings_insert" ON public.settings
      FOR INSERT
      WITH CHECK (
        club_id = public.get_my_club_id()
        OR (auth.uid() IS NULL AND club_id = %L)
      )$pol$,
    FUS_CLUB_ID
  );

  -- UPDATE : authentifié → son club   |   anon → club FUS par défaut
  EXECUTE format(
    $pol$CREATE POLICY "settings_update" ON public.settings
      FOR UPDATE
      USING (
        club_id = public.get_my_club_id()
        OR (auth.uid() IS NULL AND club_id = %L)
      )
      WITH CHECK (
        club_id = public.get_my_club_id()
        OR (auth.uid() IS NULL AND club_id = %L)
      )$pol$,
    FUS_CLUB_ID,
    FUS_CLUB_ID
  );

  -- DELETE : authentifié → son club   |   anon → club FUS par défaut
  EXECUTE format(
    $pol$CREATE POLICY "settings_delete" ON public.settings
      FOR DELETE
      USING (
        club_id = public.get_my_club_id()
        OR (auth.uid() IS NULL AND club_id = %L)
      )$pol$,
    FUS_CLUB_ID
  );

END $$;
