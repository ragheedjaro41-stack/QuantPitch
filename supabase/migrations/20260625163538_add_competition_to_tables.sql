
-- Add competition field to distinguish league vs world cup data
ALTER TABLE teams ADD COLUMN IF NOT EXISTS competition text NOT NULL DEFAULT 'league';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS competition text NOT NULL DEFAULT 'league';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS stage text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS group_name text;

-- Update existing records to explicitly mark as league
UPDATE teams SET competition = 'league' WHERE competition = 'league';
UPDATE matches SET competition = 'league' WHERE competition = 'league';
