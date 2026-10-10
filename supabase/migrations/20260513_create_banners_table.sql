-- Create banners table for store/ads management
CREATE TABLE IF NOT EXISTS public.banners (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    club_id uuid NOT NULL,
    title text,
    image_url text NOT NULL,
    target_url text,
    is_active boolean NOT NULL DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT banners_pkey PRIMARY KEY (id),
    CONSTRAINT banners_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'banners' AND policyname = 'Allow public select'
    ) THEN
        CREATE POLICY "Allow public select" ON public.banners
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'banners' AND policyname = 'Allow club admins to manage banners'
    ) THEN
        CREATE POLICY "Allow club admins to manage banners" ON public.banners
            FOR ALL USING (
                auth.uid() IN (
                    SELECT up.id FROM public.user_profiles up
                    JOIN public.user_roles ur ON up.id = ur.user_id
                    JOIN public.roles r ON ur.role_id = r.id
                    WHERE up.default_club_id = club_id AND r.name = 'admin'
                )
            );
    END IF;
END $$;

-- Create function for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_banners_updated_at ON public.banners;
CREATE TRIGGER set_banners_updated_at
    BEFORE UPDATE ON public.banners
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Optional: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_banners_club_id ON public.banners(club_id);
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON public.banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banners_display_order ON public.banners(display_order);
