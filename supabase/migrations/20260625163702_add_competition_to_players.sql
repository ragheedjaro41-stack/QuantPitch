
ALTER TABLE players ADD COLUMN IF NOT EXISTS competition text NOT NULL DEFAULT 'league';
UPDATE players SET competition = 'league' WHERE competition = 'league';
