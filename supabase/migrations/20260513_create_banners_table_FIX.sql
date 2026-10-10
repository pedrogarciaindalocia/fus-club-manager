-- Clear existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated select" ON public.banners;
DROP POLICY IF EXISTS "Allow public select" ON public.banners;
DROP POLICY IF EXISTS "Allow club admins to manage banners" ON public.banners;

-- Create banners table if not exists (already done but for completeness)
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

-- 1. Public Select Policy (Mobile App + Dashboard list)
CREATE POLICY "Allow public read" ON public.banners
    FOR SELECT USING (true);

-- 2. Admin Management Policy (Insert, Update, Delete)
-- We use a simpler logic: any authenticated user can manage if they are admin of the club
CREATE POLICY "Allow admins to manage" ON public.banners
    FOR ALL 
    TO authenticated
    USING (
        club_id = (SELECT default_club_id FROM public.user_profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        club_id = (SELECT default_club_id FROM public.user_profiles WHERE id = auth.uid())
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_banners_updated_at ON public.banners;
CREATE TRIGGER set_banners_updated_at
    BEFORE UPDATE ON public.banners
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
