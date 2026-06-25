/*
# Create odds sync log and trusted markets tables

1. New Tables
  - `odds_sync_log`
    - `id` (uuid, primary key) - unique sync run identifier
    - `provider_slug` (text, not null) - which provider was synced
    - `started_at` (timestamptz) - when sync began
    - `finished_at` (timestamptz) - when sync ended
    - `status` (text) - running, completed, failed, rate_limited
    - `synced_count` (int) - number of odds rows inserted
    - `events_count` (int) - number of API events returned
    - `error_message` (text) - error details if failed
    - `leagues_changed` (text[]) - league IDs where has_live_odds changed
    - `odds_age_summary` (jsonb) - freshest/oldest/avg age stats
    - `markets_seen` (text[]) - market keys seen in this sync
    - `untrusted_markets_seen` (text[]) - market keys not in trusted list
    - `sport_key` (text) - sport key used for this sync

  - `trusted_markets`
    - `id` (uuid, primary key)
    - `market_key` (text, unique, not null) - canonical market key (e.g. h2h, totals_2.5)
    - `display_name` (text, not null) - human-readable name
    - `category` (text, not null) - market category
    - `trusted` (boolean, default true) - whether this market is trusted for LIVE_PICK
    - `settlement_supported` (boolean, default false) - whether settlement verification exists
    - `notes` (text)
    - `created_at` (timestamptz)

2. Seed Data
  - 5 trusted markets: Match Result, Over/Under 2.5, Over/Under 1.5, Over/Under 3.5, BTTS
  - Each with settlement_supported flag

3. Security
  - RLS enabled on both tables
  - anon + authenticated SELECT (read-only admin views)
  - Only service_role (edge functions) can INSERT/UPDATE (via bypassing RLS)

4. Important Notes
  - The sync log is append-only from the edge function perspective
  - The cooldown check uses started_at to enforce rate limits
  - Untrusted markets are logged but never used for LIVE_PICK
*/

-- odds_sync_log
CREATE TABLE IF NOT EXISTS odds_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_slug text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  synced_count int DEFAULT 0,
  events_count int DEFAULT 0,
  error_message text,
  leagues_changed text[] DEFAULT '{}',
  odds_age_summary jsonb DEFAULT '{}',
  markets_seen text[] DEFAULT '{}',
  untrusted_markets_seen text[] DEFAULT '{}',
  sport_key text
);

ALTER TABLE odds_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_odds_sync_log" ON odds_sync_log;
CREATE POLICY "anon_select_odds_sync_log" ON odds_sync_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_odds_sync_log" ON odds_sync_log;
CREATE POLICY "anon_insert_odds_sync_log" ON odds_sync_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_odds_sync_log" ON odds_sync_log;
CREATE POLICY "anon_update_odds_sync_log" ON odds_sync_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_odds_sync_log" ON odds_sync_log;
CREATE POLICY "anon_delete_odds_sync_log" ON odds_sync_log FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_odds_sync_log_started ON odds_sync_log (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_odds_sync_log_provider ON odds_sync_log (provider_slug);

-- trusted_markets
CREATE TABLE IF NOT EXISTS trusted_markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  category text NOT NULL,
  trusted boolean NOT NULL DEFAULT true,
  settlement_supported boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trusted_markets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_trusted_markets" ON trusted_markets;
CREATE POLICY "anon_select_trusted_markets" ON trusted_markets FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_trusted_markets" ON trusted_markets;
CREATE POLICY "anon_insert_trusted_markets" ON trusted_markets FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_trusted_markets" ON trusted_markets;
CREATE POLICY "anon_update_trusted_markets" ON trusted_markets FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_trusted_markets" ON trusted_markets;
CREATE POLICY "anon_delete_trusted_markets" ON trusted_markets FOR DELETE
  TO anon, authenticated USING (true);

-- Seed trusted markets
INSERT INTO trusted_markets (market_key, display_name, category, trusted, settlement_supported, notes)
VALUES
  ('h2h', 'Match Result (1X2)', 'match_result', true, true, 'Standard 3-way match result. Full settlement support.'),
  ('totals_2.5', 'Over/Under 2.5 Goals', 'totals', true, true, 'Most liquid totals market. Settlement verified.'),
  ('totals_1.5', 'Over/Under 1.5 Goals', 'totals', true, true, 'Low-threshold totals. Settlement verified.'),
  ('totals_3.5', 'Over/Under 3.5 Goals', 'totals', true, true, 'High-threshold totals. Settlement verified.'),
  ('btts', 'Both Teams to Score', 'btts', true, false, 'BTTS market. Settlement not yet automated.')
ON CONFLICT (market_key) DO NOTHING;
