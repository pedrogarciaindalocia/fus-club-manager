-- Migration: Permissions et politiques permissives pour trial_candidates et évaluations (recrutement)
GRANT ALL PRIVILEGES ON TABLE public.trial_candidates TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.trial_sessions TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.candidate_evaluations TO anon, authenticated, service_role;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'trial_candidates' AND policyname = 'Allow anon full access to trial_candidates'
    ) THEN
        CREATE POLICY "Allow anon full access to trial_candidates" 
        ON public.trial_candidates FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'trial_sessions' AND policyname = 'Allow anon full access to trial_sessions'
    ) THEN
        CREATE POLICY "Allow anon full access to trial_sessions" 
        ON public.trial_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'candidate_evaluations' AND policyname = 'Allow anon full access to candidate_evaluations'
    ) THEN
        CREATE POLICY "Allow anon full access to candidate_evaluations" 
        ON public.candidate_evaluations FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Rétablissement des postes originaux pour les 3 joueurs altérés pendant les clics de test
UPDATE public.trial_candidates SET primary_position = 'Gardien de But' WHERE id = 'c0000000-0022-0001-0000-000000000200';
UPDATE public.trial_candidates SET primary_position = 'Latéral Gauche' WHERE id = 'c0000000-0022-0005-0000-000000000208';
UPDATE public.trial_candidates SET primary_position = 'Latéral Gauche' WHERE id = 'c0000000-0022-0005-0000-000000000207';
