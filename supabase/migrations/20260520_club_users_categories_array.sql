-- Passer category (TEXT) → categories (TEXT[]) pour multi-sélection
ALTER TABLE public.club_users
  DROP COLUMN IF EXISTS category;

ALTER TABLE public.club_users
  ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';
