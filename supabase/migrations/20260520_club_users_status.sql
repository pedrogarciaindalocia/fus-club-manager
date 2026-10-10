ALTER TABLE public.club_users
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('pending_confirmation', 'active', 'suspended'));
