-- ==============================================================================
-- Migration : Centre de Notifications Dashboard Web (Planning Tests & Détection)
-- Projet : US-DASH-180 (Notifications Coach / Responsable Vie / Magasinier)
-- Table : public.dashboard_notifications
-- Date : 2026-11-19
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.dashboard_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID,
  target_user_id UUID DEFAULT NULL,
  target_roles TEXT[] NOT NULL DEFAULT '{}'::text[],
  target_categories TEXT[] NOT NULL DEFAULT '{}'::text[],
  type VARCHAR(60) NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  link_url TEXT DEFAULT '/recruitment-v2?tab=sessions',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_by UUID[] NOT NULL DEFAULT '{}'::uuid[],
  created_by UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_dashboard_notifications_club_created
  ON public.dashboard_notifications(club_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dashboard_notifications_target_user
  ON public.dashboard_notifications(target_user_id, created_at DESC)
  WHERE target_user_id IS NOT NULL;

GRANT ALL ON TABLE public.dashboard_notifications TO anon, authenticated, service_role;

ALTER TABLE public.dashboard_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dashboard_notifications_authenticated_all" ON public.dashboard_notifications;
CREATE POLICY "dashboard_notifications_authenticated_all"
  ON public.dashboard_notifications
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
