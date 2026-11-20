-- ==============================================================================
-- Migration : Durcissement Sécurité RLS (fus-dashboard)
-- Date : 2026-11-20
-- Cible : public.dashboard_notifications, public.frmf_matches, public.players
-- ==============================================================================

-- 1. public.dashboard_notifications : révoquer anon, restreindre lecture/écriture aux destinataires et créateurs
DO $$
BEGIN
  IF to_regclass('public.dashboard_notifications') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.dashboard_notifications FROM anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.dashboard_notifications TO authenticated, service_role;

    ALTER TABLE public.dashboard_notifications ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "dashboard_notifications_authenticated_all" ON public.dashboard_notifications;
    DROP POLICY IF EXISTS "dashboard_notifications_select_scoped" ON public.dashboard_notifications;
    DROP POLICY IF EXISTS "dashboard_notifications_insert_authenticated" ON public.dashboard_notifications;
    DROP POLICY IF EXISTS "dashboard_notifications_update_scoped" ON public.dashboard_notifications;
    DROP POLICY IF EXISTS "dashboard_notifications_delete_admin" ON public.dashboard_notifications;

    CREATE POLICY "dashboard_notifications_select_scoped"
      ON public.dashboard_notifications
      FOR SELECT
      TO authenticated
      USING (
        target_user_id = auth.uid()
        OR created_by = auth.uid()
        OR (
          target_user_id IS NULL
          AND EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
              AND (
                lower(up.system_role) IN ('super_admin', 'admin')
                OR cardinality(target_roles) = 0
                OR lower(up.system_role) = ANY(target_roles)
              )
          )
        )
      );

    CREATE POLICY "dashboard_notifications_insert_authenticated"
      ON public.dashboard_notifications
      FOR INSERT
      TO authenticated
      WITH CHECK (
        created_by IS NULL OR created_by = auth.uid()
      );

    CREATE POLICY "dashboard_notifications_update_scoped"
      ON public.dashboard_notifications
      FOR UPDATE
      TO authenticated
      USING (
        target_user_id = auth.uid()
        OR created_by = auth.uid()
        OR target_user_id IS NULL
      )
      WITH CHECK (
        target_user_id = auth.uid()
        OR created_by = auth.uid()
        OR target_user_id IS NULL
      );

    CREATE POLICY "dashboard_notifications_delete_admin"
      ON public.dashboard_notifications
      FOR DELETE
      TO authenticated
      USING (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.id = auth.uid()
            AND lower(up.system_role) IN ('super_admin', 'admin')
        )
      );
  END IF;
END $$;

-- 2. public.frmf_matches : lecture publique/authentifiée, écriture réservée aux utilisateurs authentifiés
DO $$
BEGIN
  IF to_regclass('public.frmf_matches') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON TABLE public.frmf_matches FROM anon;
    GRANT SELECT ON TABLE public.frmf_matches TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.frmf_matches TO authenticated, service_role;

    ALTER TABLE public.frmf_matches ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow read frmf_matches" ON public.frmf_matches;
    DROP POLICY IF EXISTS "Allow insert frmf_matches" ON public.frmf_matches;
    DROP POLICY IF EXISTS "Allow update frmf_matches" ON public.frmf_matches;
    DROP POLICY IF EXISTS "Allow delete frmf_matches" ON public.frmf_matches;

    CREATE POLICY "Allow read frmf_matches"
      ON public.frmf_matches FOR SELECT
      TO authenticated, anon
      USING (true);

    CREATE POLICY "Allow insert frmf_matches_auth"
      ON public.frmf_matches FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);

    CREATE POLICY "Allow update frmf_matches_auth"
      ON public.frmf_matches FOR UPDATE
      TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);

    CREATE POLICY "Allow delete frmf_matches_admin"
      ON public.frmf_matches FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.id = auth.uid()
            AND lower(up.system_role) IN ('super_admin', 'admin', 'direction', 'technical_director')
        )
      );
  END IF;
END $$;

-- 3. public.players : révoquer l'accès écriture/suppression anonyme (anon en lecture seule si nécessaire)
DO $$
BEGIN
  IF to_regclass('public.players') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON TABLE public.players FROM anon;
    GRANT SELECT ON TABLE public.players TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.players TO authenticated, service_role;

    ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "players_full_access" ON public.players;
    DROP POLICY IF EXISTS "players_read_all" ON public.players;
    DROP POLICY IF EXISTS "players_write_authenticated" ON public.players;

    CREATE POLICY "players_read_all"
      ON public.players FOR SELECT
      TO authenticated, anon
      USING (true);

    CREATE POLICY "players_write_authenticated"
      ON public.players FOR ALL
      TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;
