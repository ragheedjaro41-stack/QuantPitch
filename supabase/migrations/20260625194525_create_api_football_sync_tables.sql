/*
# Create API-Football sync tracking tables

Tracks every sync operation from API-Football (fixtures, teams, standings, stats)
and records provider-missing data flags.

1. New Tables
  - `api_football_sync_log`
    - `id` (uuid, primary key)
    - `sync_type` (text) - 'fixtures', 'teams', 'standings', 'stats'
    - `provider` (text) - always 'api-football'
    - `started_at` (timestamptz)
    - `finished_at` (timestamptz, nullable)
    - `status` (text) - 'running', 'completed', 'failed'
    - `synced_count` (int) - rows upserted
    - `skipped_count` (int) - rows skipped (already exists / no change)
    - `error_count` (int) - individual item errors
    - `error_message` (text, nullable) - error details
    - `league_filter` (text, nullable) - which league/competition was targeted
    - `meta` (jsonb) - extra details (quota remaining, etc.)
    - `created_at` (timestamptz)

  - `provider_missing_data`
    - `id` (uuid, primary key)
    - `provider` (text) - 'api-football'
    - `entity_type` (text) - 'standings', 'stats', 'fixtures', 'lineups', 'injuries'
    - `entity_ref` (text) - league name or team name
    - `league_id` (uuid, nullable, FK to leagues)
    - `reason` (text) - why it's missing
    - `first_seen_at` (timestamptz)
    - `last_checked_at` (timestamptz)
    - `resolved` (boolean, default false)
    - `created_at` (timestamptz)
    - UNIQUE constraint: (provider, entity_type, entity_ref)

2. Modified Tables
  - `teams`: add `external_id` (text, nullable) for API-Football team ID mapping
  - `matches`: add `external_id` (text, nullable) for API-Football fixture ID mapping

3. Security
  - RLS enabled on both new tables
  - anon + authenticated full CRUD (admin tool, no auth)

4. Important Notes
  - One row per sync attempt in api_football_sync_log
  - provider_missing_data uses upsert via unique constraint to avoid duplicates
  - external_id columns enable deduplication on upsert from API-Football
*/

-- Add external_id to teams if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE teams ADD COLUMN external_id text;
  END IF;
END $$;

-- Add external_id to matches if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE matches ADD COLUMN external_id text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teams_external_id ON teams (external_id);
CREATE INDEX IF NOT EXISTS idx_matches_external_id ON matches (external_id);

-- API Football sync log
CREATE TABLE IF NOT EXISTS api_football_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL DEFAULT 'fixtures',
  provider text NOT NULL DEFAULT 'api-football',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  synced_count int NOT NULL DEFAULT 0,
  skipped_count int NOT NULL DEFAULT 0,
  error_count int NOT NULL DEFAULT 0,
  error_message text,
  league_filter text,
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_football_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_api_football_sync_log" ON api_football_sync_log;
CREATE POLICY "anon_select_api_football_sync_log" ON api_football_sync_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_api_football_sync_log" ON api_football_sync_log;
CREATE POLICY "anon_insert_api_football_sync_log" ON api_football_sync_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_api_football_sync_log" ON api_football_sync_log;
CREATE POLICY "anon_update_api_football_sync_log" ON api_football_sync_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_api_football_sync_log" ON api_football_sync_log;
CREATE POLICY "anon_delete_api_football_sync_log" ON api_football_sync_log FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_api_football_sync_log_started ON api_football_sync_log (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_football_sync_log_type ON api_football_sync_log (sync_type);

-- Provider missing data
CREATE TABLE IF NOT EXISTS provider_missing_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'api-football',
  entity_type text NOT NULL,
  entity_ref text NOT NULL,
  league_id uuid REFERENCES leagues(id),
  reason text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (provider, entity_type, entity_ref)
);

ALTER TABLE provider_missing_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_provider_missing_data" ON provider_missing_data;
CREATE POLICY "anon_select_provider_missing_data" ON provider_missing_data FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_provider_missing_data" ON provider_missing_data;
CREATE POLICY "anon_insert_provider_missing_data" ON provider_missing_data FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_provider_missing_data" ON provider_missing_data;
CREATE POLICY "anon_update_provider_missing_data" ON provider_missing_data FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_provider_missing_data" ON provider_missing_data;
CREATE POLICY "anon_delete_provider_missing_data" ON provider_missing_data FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_provider_missing_entity ON provider_missing_data (entity_type, resolved);
CREATE INDEX IF NOT EXISTS idx_provider_missing_league ON provider_missing_data (league_id);
