/*
# Create settlement schema (match_results + settlement_log)

1. New Tables
  - `match_results`
    - `id` (uuid, primary key)
    - `match_id` (uuid, FK to matches, unique) - one confirmed result per match
    - `ft_home` (int) - full-time home goals (regulation only, 90 min)
    - `ft_away` (int) - full-time away goals (regulation only, 90 min)
    - `ht_home` (int, nullable) - half-time home goals
    - `ht_away` (int, nullable) - half-time away goals
    - `et_home` (int, nullable) - extra-time home goals (cumulative including FT)
    - `et_away` (int, nullable) - extra-time away goals (cumulative including FT)
    - `pen_home` (int, nullable) - penalty shootout home goals
    - `pen_away` (int, nullable) - penalty shootout away goals
    - `went_to_et` (boolean) - whether match went to extra time
    - `went_to_penalties` (boolean) - whether match went to penalties
    - `match_status` (text) - confirmed, postponed, cancelled, abandoned, void, pending_review
    - `competition_type` (text) - league or cup (determines settlement rules)
    - `provider_source` (text, nullable) - which provider confirmed the result
    - `confirmed_at` (timestamptz) - when the result was confirmed
    - `notes` (text, nullable)
    - `created_at` (timestamptz)

  - `settlement_log`
    - `id` (uuid, primary key)
    - `match_id` (uuid, FK to matches)
    - `match_result_id` (uuid, FK to match_results)
    - `market_key` (text) - which market was settled (h2h, totals_2.5, btts, etc.)
    - `outcome` (text) - the settlement outcome (home, away, draw, over, under, yes, no, void, push)
    - `status` (text) - settled, void, pending_review, error
    - `reason` (text) - human-readable explanation of why this outcome
    - `settled_at` (timestamptz)
    - `created_at` (timestamptz)

2. Modified Tables
  - `trusted_markets`: update btts settlement_supported to true (we are building settlement now)

3. Security
  - RLS enabled on both tables
  - anon + authenticated SELECT (admin views)
  - anon + authenticated INSERT/UPDATE (edge functions and admin)

4. Important Notes
  - `ft_home`/`ft_away` are REGULATION ONLY (90 min). For league matches, this IS the final score.
  - For cup matches with ET, `et_home`/`et_away` hold cumulative score after extra time.
  - Penalty shootout scores are recorded separately and never affect market settlement
    for normal-time markets (h2h, totals, btts).
  - `match_status` drives settlement eligibility: only 'confirmed' matches can be settled.
  - postponed/cancelled/abandoned always produce 'void' or 'pending_review' settlements.
  - One match_results row per match (unique constraint on match_id).
  - Multiple settlement_log rows per match (one per market settled).
*/

-- match_results
CREATE TABLE IF NOT EXISTS match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  ft_home int NOT NULL,
  ft_away int NOT NULL,
  ht_home int,
  ht_away int,
  et_home int,
  et_away int,
  pen_home int,
  pen_away int,
  went_to_et boolean NOT NULL DEFAULT false,
  went_to_penalties boolean NOT NULL DEFAULT false,
  match_status text NOT NULL DEFAULT 'confirmed',
  competition_type text NOT NULL DEFAULT 'league',
  provider_source text,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_match_result UNIQUE (match_id)
);

ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_match_results" ON match_results;
CREATE POLICY "anon_select_match_results" ON match_results FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_match_results" ON match_results;
CREATE POLICY "anon_insert_match_results" ON match_results FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_match_results" ON match_results;
CREATE POLICY "anon_update_match_results" ON match_results FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_match_results" ON match_results;
CREATE POLICY "anon_delete_match_results" ON match_results FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_match_results_match_id ON match_results (match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_status ON match_results (match_status);
CREATE INDEX IF NOT EXISTS idx_match_results_confirmed ON match_results (confirmed_at DESC);

-- settlement_log
CREATE TABLE IF NOT EXISTS settlement_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  match_result_id uuid NOT NULL REFERENCES match_results(id) ON DELETE CASCADE,
  market_key text NOT NULL,
  outcome text NOT NULL,
  status text NOT NULL DEFAULT 'settled',
  reason text NOT NULL,
  settled_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE settlement_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settlement_log" ON settlement_log;
CREATE POLICY "anon_select_settlement_log" ON settlement_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settlement_log" ON settlement_log;
CREATE POLICY "anon_insert_settlement_log" ON settlement_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settlement_log" ON settlement_log;
CREATE POLICY "anon_update_settlement_log" ON settlement_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_settlement_log" ON settlement_log;
CREATE POLICY "anon_delete_settlement_log" ON settlement_log FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_settlement_log_match ON settlement_log (match_id);
CREATE INDEX IF NOT EXISTS idx_settlement_log_market ON settlement_log (market_key);
CREATE INDEX IF NOT EXISTS idx_settlement_log_status ON settlement_log (status);
CREATE INDEX IF NOT EXISTS idx_settlement_log_settled ON settlement_log (settled_at DESC);

-- Mark btts settlement as now supported
UPDATE trusted_markets SET settlement_supported = true
WHERE market_key = 'btts' AND settlement_supported = false;
