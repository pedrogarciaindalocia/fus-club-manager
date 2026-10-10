-- Table simple pour gérer les utilisateurs de l'app
CREATE TABLE IF NOT EXISTS public.club_users (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id          UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  full_name        TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT,
  category         TEXT,
  permission_level TEXT NOT NULL DEFAULT 'viewer'
                   CHECK (permission_level IN ('viewer', 'reporter', 'editor', 'live_tracker')),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- RLS simple : l'admin voit tous les users de son club
ALTER TABLE public.club_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_users_all" ON public.club_users
  FOR ALL TO authenticated
  USING (club_id = public.get_my_club_id())
  WITH CHECK (club_id = public.get_my_club_id());

-- Index
CREATE INDEX IF NOT EXISTS idx_club_users_club_id ON public.club_users(club_id);
CREATE INDEX IF NOT EXISTS idx_club_users_email   ON public.club_users(email);
