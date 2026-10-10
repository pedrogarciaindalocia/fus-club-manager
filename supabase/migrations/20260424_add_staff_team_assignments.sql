-- Add multiple team assignments for staff
CREATE TABLE IF NOT EXISTS public.staff_team_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id, team_id)
);

-- Enable RLS
ALTER TABLE public.staff_team_assignments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff assignments are viewable by club staff"
    ON public.staff_team_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.staff s
            WHERE s.id = staff_team_assignments.staff_id
        )
    );

CREATE POLICY "Staff assignments are manageable by club owners"
    ON public.staff_team_assignments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.staff s
            WHERE s.id = staff_team_assignments.staff_id
        )
    );
