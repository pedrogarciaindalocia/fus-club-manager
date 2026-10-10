-- Migration: 20261002_scout_auth_biometric_flow.sql
-- Description: Supports the revised authentication flow for FUS-SCOUT and FUS-DASHBOARD:
-- 1. first_login_required & biometric tracking in user_profiles
-- 2. biometric_devices table for multi-device credential management

-- 1. Extend user_profiles with authentication lifecycle & biometric metadata
ALTER TABLE IF EXISTS user_profiles
  ADD COLUMN IF NOT EXISTS first_login_required BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS biometric_credential_id TEXT,
  ADD COLUMN IF NOT EXISTS biometric_device_id TEXT,
  ADD COLUMN IF NOT EXISTS biometric_registered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS biometric_last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- Maintain sync between force_password_change and first_login_required
UPDATE user_profiles
SET first_login_required = force_password_change
WHERE first_login_required IS NULL;

-- 2. Create biometric_devices table
CREATE TABLE IF NOT EXISTS biometric_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  credential_id TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'ios' | 'android' | 'web'
  biometric_type TEXT NOT NULL, -- 'fingerprint' | 'touch_id' | 'biometric'
  enabled BOOLEAN DEFAULT TRUE,
  registered_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_user_device UNIQUE(user_id, device_id)
);

-- 3. Row Level Security on biometric_devices
ALTER TABLE biometric_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own biometric devices" ON biometric_devices;
CREATE POLICY "Users can manage their own biometric devices"
  ON biometric_devices
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access biometric devices" ON biometric_devices;
CREATE POLICY "Service role full access biometric devices"
  ON biometric_devices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
