-- Migration : Correction des politiques RLS sur la table public.banners
-- Problème résolu : La politique précédente exigeait un enregistrement dans 'user_roles' avec r.name = 'admin',
-- or le système utilise public.user_profiles.system_role ('super_admin', 'admin', 'direction', 'club_admin').
-- Cela bloquait toute mise à jour ou suppression de bannières avec l'erreur :
-- "Bannière introuvable ou accès refusé (RLS)".

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- 1. Lecture publique (tous les utilisateurs / visiteurs)
DROP POLICY IF EXISTS "Allow public select" ON public.banners;
CREATE POLICY "Allow public select" ON public.banners
    FOR SELECT USING (true);

-- 2. Gestion des bannières (Insert, Update, Delete)
DROP POLICY IF EXISTS "Allow club admins to manage banners" ON public.banners;
DROP POLICY IF EXISTS "Allow authenticated admins to manage banners" ON public.banners;

CREATE POLICY "Allow authenticated admins to manage banners" ON public.banners
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
              AND (
                  up.system_role IN ('super_admin', 'admin', 'direction')
                  OR (up.system_role = 'club_admin' AND (up.default_club_id = banners.club_id OR banners.club_id IS NULL))
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
              AND (
                  up.system_role IN ('super_admin', 'admin', 'direction')
                  OR (up.system_role = 'club_admin' AND (up.default_club_id = banners.club_id OR banners.club_id IS NULL))
              )
        )
    );
