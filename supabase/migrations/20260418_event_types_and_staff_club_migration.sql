-- ============================================
-- Migration: Event types + staff club_id migration
-- Date: 2026-04-18
-- Description: Creates event_types table and migrates staff.club_id to reference clubs(id).
-- ============================================

CREATE TABLE IF NOT EXISTS public.event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL
);

DO $$
BEGIN
  -- Only attempt migration if required tables exist
  IF to_regclass('public.staff') IS NULL OR to_regclass('public.clubs') IS NULL THEN
    RETURN;
  END IF;

  -- 1) Add a new temporary column (idempotent)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'staff'
      AND column_name = 'club_id_new'
  ) THEN
    ALTER TABLE public.staff
      ADD COLUMN club_id_new uuid;
  END IF;

  -- 2) If settings exists, create club from settings if needed
  IF to_regclass('public.settings') IS NOT NULL THEN
    INSERT INTO public.clubs (name, city, country, logo_url)
    SELECT club_name, city, country, logo_url
    FROM public.settings
    WHERE NOT EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.name = public.settings.club_name
    );

    -- 3) Associate staff to the created club
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'staff'
        AND column_name = 'club_id'
    ) THEN
      UPDATE public.staff s
      SET club_id_new = c.id
      FROM public.clubs c
      JOIN public.settings st ON c.name = st.club_name
      WHERE s.club_id = st.id;
    END IF;
  END IF;

  -- Only run the destructive part if the current FK points to settings
  IF EXISTS (
    SELECT 1
    FROM pg_constraint con
    WHERE con.conname = 'staff_club_id_fkey'
      AND con.conrelid = 'public.staff'::regclass
      AND con.confrelid = 'public.settings'::regclass
  ) THEN
    -- 4) Drop old constraint
    ALTER TABLE public.staff
      DROP CONSTRAINT IF EXISTS staff_club_id_fkey;

    -- 5) Drop old column (if present)
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'staff'
        AND column_name = 'club_id'
    ) THEN
      ALTER TABLE public.staff
        DROP COLUMN club_id;
    END IF;

    -- 6) Rename new column
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'staff'
        AND column_name = 'club_id_new'
    ) THEN
      ALTER TABLE public.staff
        RENAME COLUMN club_id_new TO club_id;
    END IF;

    -- 7) Recreate the correct foreign key
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'staff'
        AND column_name = 'club_id'
    ) THEN
      ALTER TABLE public.staff
        ADD CONSTRAINT staff_club_id_fkey
        FOREIGN KEY (club_id) REFERENCES public.clubs(id);
    END IF;
  END IF;
END $$;
