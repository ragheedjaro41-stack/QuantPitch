/*
# Add player statistics columns and external_id for API-Football sync

1. Modified Tables
   - `players`
     - `external_id` (text, nullable, unique) - API-Football player ID for deduplication
     - `minutes_played` (integer, default 0) - total minutes on pitch
     - `yellow_cards` (integer, default 0) - yellow card count
     - `red_cards` (integer, default 0) - red card count
     - `clean_sheets` (integer, default 0) - goalkeeper clean sheets
     - `saves` (integer, default 0) - goalkeeper saves
     - `injured` (boolean, default false) - current injury status
     - `league_id` (uuid, nullable) - link to leagues table for filtering

2. Important Notes
   - external_id is unique to prevent duplicate player creation during sync
   - All stat columns default to 0 so existing demo players are unaffected
   - jersey_number made nullable (API may not always provide it)
   - league_id added for clean filtering (PL players vs demo vs worldcup)
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='external_id') THEN
    ALTER TABLE players ADD COLUMN external_id text UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='minutes_played') THEN
    ALTER TABLE players ADD COLUMN minutes_played integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='yellow_cards') THEN
    ALTER TABLE players ADD COLUMN yellow_cards integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='red_cards') THEN
    ALTER TABLE players ADD COLUMN red_cards integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='clean_sheets') THEN
    ALTER TABLE players ADD COLUMN clean_sheets integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='saves') THEN
    ALTER TABLE players ADD COLUMN saves integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='injured') THEN
    ALTER TABLE players ADD COLUMN injured boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='league_id') THEN
    ALTER TABLE players ADD COLUMN league_id uuid REFERENCES leagues(id);
  END IF;
END $$;

ALTER TABLE players ALTER COLUMN jersey_number DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_external_id ON players(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_league_id ON players(league_id);
