-- ==========================================
-- RBAC & PBAC ACCESS MANAGEMENT MIGRATION
-- FuscClub Dashboard
-- ==========================================

-- 1. BASE TABLES: USERS, ROLES, PERMISSIONS
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  staff_id UUID UNIQUE NULL, -- Lien avec la table staff
  default_club_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL, 
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  perm_key VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.user_permissions_overrides (
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, permission_id)
);


-- 2. SCOPE / ASSIGNMENT TABLES (PBAC)
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_team_assignments (
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  team_id UUID, -- Modifiez si vous avez une table 'teams' (ex: REFERENCES teams(id))
  role_id UUID REFERENCES public.roles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, team_id)
);

CREATE TABLE IF NOT EXISTS public.user_category_assignments (
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  club_id UUID, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, category, club_id)
);

CREATE TABLE IF NOT EXISTS public.user_match_assignments (
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  match_id UUID, -- Modifiez si FK (REFERENCES matches(id))
  assignment_type VARCHAR(50) DEFAULT 'tracker',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, match_id)
);


-- 3. EVOLUTION OF EXISTING TABLES
---------------------------------------------------------
-- Note: Check if table matches exist before running the ALTER statements.
-- If the tables don't exist yet in Supabase, comment these out or migrate them first.

/*
ALTER TABLE public.staff
ADD COLUMN user_id UUID REFERENCES auth.users(id) UNIQUE;

ALTER TABLE public.matches 
ADD COLUMN tracking_status VARCHAR(20) DEFAULT 'planned',
ADD COLUMN primary_tracker_id UUID REFERENCES public.user_profiles(id),
ADD COLUMN secondary_tracker_id UUID REFERENCES public.user_profiles(id),
ADD COLUMN validated_by UUID REFERENCES public.user_profiles(id),
ADD COLUMN validated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.match_events
ADD COLUMN created_by UUID REFERENCES public.user_profiles(id),
ADD COLUMN updated_by UUID REFERENCES public.user_profiles(id),
ADD COLUMN is_validated BOOLEAN DEFAULT false,
ADD COLUMN event_sequence SERIAL;
*/


-- 4. INSERT DEFAULT CORE ROLES
---------------------------------------------------------
INSERT INTO public.roles (name, description) VALUES 
('super_admin', 'Accès global à toute la plateforme'),
('club_admin', 'Gérant de club, accès à tous les aspects de son club'),
('technical_director', 'Directeur sportif, vision analytique croisée sur sa catégorie'),
('coach', 'Coach, accès total aux équipes qui lui sont assignées'),
('assistant_coach', 'Assistant sécurisé, pas de fonctions destructives'),
('match_operator', 'Opérateur live streaming / events uniquement'),
('staff', 'Membre spécialisé médical, vidéo, sans droit de gestion d_équipes'),
('viewer', 'Lecteur en mode consultatif')
ON CONFLICT (name) DO NOTHING;


-- 5. AUTOMATIC PROFILE CREATION TRIGGER
---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Déclenche la création du User Profile à l'inscription sur Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
