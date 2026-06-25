
-- Add league_id to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS league_id uuid REFERENCES leagues(id);

-- Backfill league_id for domestic league matches via their home team's league_id
UPDATE matches m
SET league_id = t.league_id
FROM teams t
WHERE m.home_team_id = t.id
  AND m.competition = 'league'
  AND t.league_id IS NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_matches_league_id ON matches(league_id);
