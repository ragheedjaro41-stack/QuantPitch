/*
# Tighten RLS on Sensitive Tables

## Purpose
Restrict client-side (anon/authenticated) access to sensitive audit and settlement
tables to SELECT-only. Edge functions use service_role which bypasses RLS entirely,
so they continue to write normally.

## Tables Affected
- match_results: Settlement results (scores, confirmation status)
- settlement_log: Market settlement outcomes
- odds_sync_log: Odds provider sync audit trail
- results_sync_log: Results sync audit trail
- api_football_sync_log: API-Football sync audit trail
- provider_missing_data: Data availability tracking

## Security Changes
- DROP all INSERT/UPDATE/DELETE policies for anon, authenticated on above tables
- Keep SELECT policies so the admin dashboard can read data
- Edge functions (service_role) are unaffected -- they bypass RLS

## Important Notes
1. This is a no-auth app; the frontend uses the anon key for reads only.
2. All writes to these tables originate from edge functions (service_role).
3. Client-side settlement code in settlement.ts will no longer be able to
   write directly -- this is intentional; settlement should go through
   the sync-results edge function.
*/

-- ============================================================
-- match_results: SELECT only for anon
-- ============================================================
DROP POLICY IF EXISTS "anon_insert_match_results" ON match_results;
DROP POLICY IF EXISTS "anon_update_match_results" ON match_results;
DROP POLICY IF EXISTS "anon_delete_match_results" ON match_results;
DROP POLICY IF EXISTS "insert_match_results" ON match_results;
DROP POLICY IF EXISTS "update_match_results" ON match_results;
DROP POLICY IF EXISTS "delete_match_results" ON match_results;

-- Ensure SELECT policy exists
DROP POLICY IF EXISTS "anon_select_match_results" ON match_results;
CREATE POLICY "anon_select_match_results" ON match_results FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- settlement_log: SELECT only for anon
-- ============================================================
DROP POLICY IF EXISTS "anon_insert_settlement_log" ON settlement_log;
DROP POLICY IF EXISTS "anon_update_settlement_log" ON settlement_log;
DROP POLICY IF EXISTS "anon_delete_settlement_log" ON settlement_log;
DROP POLICY IF EXISTS "insert_settlement_log" ON settlement_log;
DROP POLICY IF EXISTS "update_settlement_log" ON settlement_log;
DROP POLICY IF EXISTS "delete_settlement_log" ON settlement_log;

DROP POLICY IF EXISTS "anon_select_settlement_log" ON settlement_log;
CREATE POLICY "anon_select_settlement_log" ON settlement_log FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- odds_sync_log: SELECT only for anon
-- ============================================================
DROP POLICY IF EXISTS "anon_insert_odds_sync_log" ON odds_sync_log;
DROP POLICY IF EXISTS "anon_update_odds_sync_log" ON odds_sync_log;
DROP POLICY IF EXISTS "anon_delete_odds_sync_log" ON odds_sync_log;
DROP POLICY IF EXISTS "insert_odds_sync_log" ON odds_sync_log;
DROP POLICY IF EXISTS "update_odds_sync_log" ON odds_sync_log;
DROP POLICY IF EXISTS "delete_odds_sync_log" ON odds_sync_log;

DROP POLICY IF EXISTS "anon_select_odds_sync_log" ON odds_sync_log;
CREATE POLICY "anon_select_odds_sync_log" ON odds_sync_log FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- results_sync_log: SELECT only for anon
-- ============================================================
DROP POLICY IF EXISTS "anon_insert_results_sync_log" ON results_sync_log;
DROP POLICY IF EXISTS "anon_update_results_sync_log" ON results_sync_log;
DROP POLICY IF EXISTS "anon_delete_results_sync_log" ON results_sync_log;
DROP POLICY IF EXISTS "insert_results_sync_log" ON results_sync_log;
DROP POLICY IF EXISTS "update_results_sync_log" ON results_sync_log;
DROP POLICY IF EXISTS "delete_results_sync_log" ON results_sync_log;

DROP POLICY IF EXISTS "anon_select_results_sync_log" ON results_sync_log;
CREATE POLICY "anon_select_results_sync_log" ON results_sync_log FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- api_football_sync_log: SELECT only for anon
-- ============================================================
DROP POLICY IF EXISTS "anon_insert_api_football_sync_log" ON api_football_sync_log;
DROP POLICY IF EXISTS "anon_update_api_football_sync_log" ON api_football_sync_log;
DROP POLICY IF EXISTS "anon_delete_api_football_sync_log" ON api_football_sync_log;
DROP POLICY IF EXISTS "insert_api_football_sync_log" ON api_football_sync_log;
DROP POLICY IF EXISTS "update_api_football_sync_log" ON api_football_sync_log;
DROP POLICY IF EXISTS "delete_api_football_sync_log" ON api_football_sync_log;

DROP POLICY IF EXISTS "anon_select_api_football_sync_log" ON api_football_sync_log;
CREATE POLICY "anon_select_api_football_sync_log" ON api_football_sync_log FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- provider_missing_data: SELECT only for anon
-- ============================================================
DROP POLICY IF EXISTS "anon_insert_provider_missing_data" ON provider_missing_data;
DROP POLICY IF EXISTS "anon_update_provider_missing_data" ON provider_missing_data;
DROP POLICY IF EXISTS "anon_delete_provider_missing_data" ON provider_missing_data;
DROP POLICY IF EXISTS "insert_provider_missing_data" ON provider_missing_data;
DROP POLICY IF EXISTS "update_provider_missing_data" ON provider_missing_data;
DROP POLICY IF EXISTS "delete_provider_missing_data" ON provider_missing_data;

DROP POLICY IF EXISTS "anon_select_provider_missing_data" ON provider_missing_data;
CREATE POLICY "anon_select_provider_missing_data" ON provider_missing_data FOR SELECT
  TO anon, authenticated USING (true);
