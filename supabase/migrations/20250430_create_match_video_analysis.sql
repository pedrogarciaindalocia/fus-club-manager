-- Table pour stocker les analyses vidéo des matchs
CREATE TABLE IF NOT EXISTS public.match_video_analysis (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  analyst_id uuid REFERENCES auth.users(id),
  analysis_type text NOT NULL DEFAULT 'full_match' CHECK (analysis_type IN ('full_match', 'highlights', 'tactical', 'player_focus')),
  notes text,
  tags text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT match_video_analysis_pkey PRIMARY KEY (id)
);

-- Index pour recherche rapide par match
CREATE INDEX IF NOT EXISTS idx_match_video_analysis_match_id ON public.match_video_analysis(match_id);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_match_video_analysis_updated_at ON public.match_video_analysis;
CREATE TRIGGER update_match_video_analysis_updated_at
  BEFORE UPDATE ON public.match_video_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Politiques RLS (Row Level Security)
ALTER TABLE public.match_video_analysis ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir les analyses de leur club
CREATE POLICY "Users can view video analysis for their club matches"
  ON public.match_video_analysis
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.clubs c ON m.club_id = c.id
      WHERE m.id = match_video_analysis.match_id
      AND c.id IN (
        SELECT club_id FROM public.user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Politique: Les utilisateurs peuvent créer des analyses
CREATE POLICY "Users can create video analysis"
  ON public.match_video_analysis
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_video_analysis.match_id
      AND m.club_id IN (
        SELECT club_id FROM public.user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Politique: Les analystes peuvent modifier leurs analyses
CREATE POLICY "Analysts can update their own analysis"
  ON public.match_video_analysis
  FOR UPDATE
  USING (analyst_id = auth.uid())
  WITH CHECK (analyst_id = auth.uid());

-- Politique: Les analystes peuvent supprimer leurs analyses
CREATE POLICY "Analysts can delete their own analysis"
  ON public.match_video_analysis
  FOR DELETE
  USING (analyst_id = auth.uid());
