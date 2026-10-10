-- Remplace la politique club_users par une version simple basée sur is_club_admin()
-- is_club_admin() vérifie super_admin | club_admin (déjà corrigée)

DROP POLICY IF EXISTS "club_users_all" ON public.club_users;

CREATE POLICY "club_users_admin" ON public.club_users
  FOR ALL TO authenticated
  USING (public.is_club_admin())
  WITH CHECK (public.is_club_admin());
