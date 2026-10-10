-- Marquer les utilisateurs qui doivent changer leur mot de passe à la 1ère connexion
ALTER TABLE public.club_users
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT true;
