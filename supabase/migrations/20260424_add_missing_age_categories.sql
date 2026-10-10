-- Migration: Add missing age categories to the age_category enum
-- Ensure all common categories are present and in UPPERCASE.

-- Note: ADD VALUE cannot be inside a transaction block in some Postgres versions.
-- Supabase migrations are generally fine, but we'll use a safe DO block where possible.

DO $$
BEGIN
    -- U7
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'age_category' AND e.enumlabel = 'U7') THEN
        ALTER TYPE age_category ADD VALUE 'U7';
    END IF;

    -- U9
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'age_category' AND e.enumlabel = 'U9') THEN
        ALTER TYPE age_category ADD VALUE 'U9';
    END IF;

    -- U11
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'age_category' AND e.enumlabel = 'U11') THEN
        ALTER TYPE age_category ADD VALUE 'U11';
    END IF;

    -- U13
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'age_category' AND e.enumlabel = 'U13') THEN
        ALTER TYPE age_category ADD VALUE 'U13';
    END IF;

    -- U15
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'age_category' AND e.enumlabel = 'U15') THEN
        ALTER TYPE age_category ADD VALUE 'U15';
    END IF;

    -- U17
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'age_category' AND e.enumlabel = 'U17') THEN
        ALTER TYPE age_category ADD VALUE 'U17';
    END IF;

    -- U19
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'age_category' AND e.enumlabel = 'U19') THEN
        ALTER TYPE age_category ADD VALUE 'U19';
    END IF;

    -- U21
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'age_category' AND e.enumlabel = 'U21') THEN
        ALTER TYPE age_category ADD VALUE 'U21';
    END IF;

    -- U23
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'age_category' AND e.enumlabel = 'U23') THEN
        ALTER TYPE age_category ADD VALUE 'U23';
    END IF;

    -- SENIOR
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'age_category' AND e.enumlabel = 'SENIOR') THEN
        ALTER TYPE age_category ADD VALUE 'SENIOR';
    END IF;

    -- PRO
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'age_category' AND e.enumlabel = 'PRO') THEN
        ALTER TYPE age_category ADD VALUE 'PRO';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Notice: Some values might already exist or the type might not exist yet.';
END $$;
