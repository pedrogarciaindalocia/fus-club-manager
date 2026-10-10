-- Add force_password_change and system_role to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS system_role VARCHAR(50) DEFAULT 'viewer';

-- You can define allowed system roles:
-- 'super_admin', 'technical_director', 'coach', 'assistant_coach', 'staff', 'viewer'
