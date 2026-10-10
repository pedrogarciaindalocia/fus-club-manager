-- Stocker l'ID Supabase Auth pour pouvoir réinitialiser le mot de passe
ALTER TABLE public.club_users
ADD COLUMN IF NOT EXISTS supabase_user_id UUID;
