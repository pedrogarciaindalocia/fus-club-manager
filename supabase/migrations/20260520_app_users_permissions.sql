-- ============================================================
-- Migration : App Users Permissions
-- 1. Corrige is_club_admin() — cherchait 'admin' au lieu de 'super_admin'/'club_admin'
-- 2. Ajoute permission_level à user_category_assignments
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. CORRECTION is_club_admin()
--    L'ancienne version cherchait r.name = 'admin' qui n'existe pas.
--    Les vrais rôles sont 'super_admin' et 'club_admin'.
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_club_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'club_admin')
  );
$$;

-- ──────────────────────────────────────────────────────────
-- 2. COLONNE permission_level sur user_category_assignments
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.user_category_assignments
ADD COLUMN IF NOT EXISTS permission_level TEXT NOT NULL DEFAULT 'viewer'
  CONSTRAINT chk_permission_level
  CHECK (permission_level IN ('viewer', 'reporter', 'editor', 'live_tracker'));

-- ──────────────────────────────────────────────────────────
-- 3. INDEX lookup rapide côté app
-- ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_category_assignments_user_id
  ON public.user_category_assignments (user_id);
