-- Migration: Add video_url and stream_url to matches table for YouTube integration
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'matches'
        AND column_name = 'video_url'
    ) THEN
        ALTER TABLE public.matches ADD COLUMN video_url text;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'matches'
        AND column_name = 'stream_url'
    ) THEN
        ALTER TABLE public.matches ADD COLUMN stream_url text;
    END IF;
END $$;
