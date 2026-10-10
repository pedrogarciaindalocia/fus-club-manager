-- ============================================================
-- BACKUP MANAGEMENT — Migration
-- ============================================================
-- Table to track backup history and metadata

CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','completed','failed')),
  type TEXT NOT NULL DEFAULT 'full'
    CHECK (type IN ('full','database_only','storage_only')),
  destination TEXT NOT NULL DEFAULT 'local'
    CHECK (destination IN ('local','google_drive','onedrive')),
  file_url TEXT,
  file_size_bytes BIGINT,
  tables_exported TEXT[] DEFAULT '{}',
  storage_buckets_exported TEXT[] DEFAULT '{}',
  logs TEXT[] DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for fast history queries
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);

-- ============================================================
-- RLS: Only super_admin users can manage backups
-- ============================================================
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage backups"
  ON backups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'super_admin'
    )
  );
