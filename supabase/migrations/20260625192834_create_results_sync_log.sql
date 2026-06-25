/*
# Create results_sync_log table

Tracks every results synchronization attempt -- successes, failures, and partial syncs.
Used by the sync-results edge function and the admin Settlement page.

1. New Tables
  - `results_sync_log`
    - `id` (uuid, primary key)
    - `provider` (text) - which results provider was used (e.g. 'football-data-api')
    - `started_at` (timestamptz) - when the sync started
    - `finished_at` (timestamptz, nullable) - when the sync completed
    - `status` (text) - running, completed, failed
    - `synced_count` (int) - number of results successfully ingested
    - `settled_count` (int) - number of matches that were settled
    - `void_count` (int) - number of matches marked void/pending_review
    - `missing_score_count` (int) - fixtures returned without a final score
    - `error_message` (text, nullable) - error details if sync failed
    - `sport_key` (text, nullable) - which sport/league was synced
    - `created_at` (timestamptz)

2. Security
  - RLS enabled
  - anon + authenticated full CRUD (admin tool, no auth)

3. Important Notes
  - One row per sync attempt.
  - The sync-results edge function creates a row at start (status=running),
    then updates it on completion or failure.
  - 120s cooldown enforced in the edge function, same pattern as odds_sync_log.
*/

CREATE TABLE IF NOT EXISTS results_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'football-data-api',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  synced_count int NOT NULL DEFAULT 0,
  settled_count int NOT NULL DEFAULT 0,
  void_count int NOT NULL DEFAULT 0,
  missing_score_count int NOT NULL DEFAULT 0,
  error_message text,
  sport_key text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE results_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_results_sync_log" ON results_sync_log;
CREATE POLICY "anon_select_results_sync_log" ON results_sync_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_results_sync_log" ON results_sync_log;
CREATE POLICY "anon_insert_results_sync_log" ON results_sync_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_results_sync_log" ON results_sync_log;
CREATE POLICY "anon_update_results_sync_log" ON results_sync_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_results_sync_log" ON results_sync_log;
CREATE POLICY "anon_delete_results_sync_log" ON results_sync_log FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_results_sync_log_started ON results_sync_log (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_sync_log_status ON results_sync_log (status);
