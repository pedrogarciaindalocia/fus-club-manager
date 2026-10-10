-- ============================================================
-- Migration : Surclassements de joueurs
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS player_surclassements (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id           uuid        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  player_id         uuid        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  original_team_id  uuid        NOT NULL REFERENCES teams(id),
  target_team_id    uuid        NOT NULL REFERENCES teams(id),
  original_category text        NOT NULL,
  target_category   text        NOT NULL,
  status            text        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'reverted')),
  notes             text,
  promoted_at       timestamptz NOT NULL DEFAULT now(),
  reverted_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Index de performances
CREATE INDEX IF NOT EXISTS idx_surclassements_player  ON player_surclassements(player_id);
CREATE INDEX IF NOT EXISTS idx_surclassements_club    ON player_surclassements(club_id);
CREATE INDEX IF NOT EXISTS idx_surclassements_status  ON player_surclassements(status);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_surclassements_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_surclassements_updated_at
  BEFORE UPDATE ON player_surclassements
  FOR EACH ROW EXECUTE FUNCTION update_surclassements_updated_at();

-- Row Level Security
ALTER TABLE player_surclassements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_members_surclassements" ON player_surclassements;
CREATE POLICY "club_members_surclassements" ON player_surclassements
  FOR ALL USING (
    club_id IN (
      SELECT default_club_id FROM user_profiles WHERE id = auth.uid()
    )
  );
