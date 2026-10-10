-- ============================================
-- Migration: Create backups table
-- Date: 2026-04-15
-- Description: Creates the backups table for the Backup Center feature.
-- ============================================

CREATE TABLE IF NOT EXISTS public.backups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  type          TEXT NOT NULL DEFAULT 'full'
                  CHECK (type IN ('full', 'database_only', 'storage_only')),
  destination   TEXT NOT NULL DEFAULT 'local'
                  CHECK (destination IN ('local', 'google_drive', 'onedrive')),
  file_url      TEXT,
  file_size_bytes BIGINT,
  tables_exported TEXT[] DEFAULT '{}',
  storage_buckets_exported TEXT[] DEFAULT '{}',
  logs          TEXT[] DEFAULT '{}',
  error_message TEXT,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID REFERENCES auth.users(id)
);

-- Index for the common query pattern (ordered by created_at desc)
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON public.backups (created_at DESC);

-- Index for filtering active backups (pending/running)
CREATE INDEX IF NOT EXISTS idx_backups_status ON public.backups (status);

-- Enable Row Level Security
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only authenticated users with super_admin role can manage backups.
-- Adjust this policy to match your RBAC setup.
CREATE POLICY "Authenticated users can read backups"
  ON public.backups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert backups"
  ON public.backups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update backups"
  ON public.backups
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete backups"
  ON public.backups
  FOR DELETE
  TO authenticated
  USING (true);

-- Grant access to the anon and authenticated roles (required for PostgREST / Supabase client)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backups TO authenticated;
