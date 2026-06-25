
-- ODDS PROVIDERS
CREATE TABLE IF NOT EXISTS odds_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error', 'stale')),
  api_endpoint text,
  last_ping_at timestamptz,
  last_success_at timestamptz,
  config jsonb NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE odds_providers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='odds_providers' AND policyname='anon_read_odds_providers') THEN
    CREATE POLICY "anon_read_odds_providers" ON odds_providers FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='odds_providers' AND policyname='anon_insert_odds_providers') THEN
    CREATE POLICY "anon_insert_odds_providers" ON odds_providers FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='odds_providers' AND policyname='anon_update_odds_providers') THEN
    CREATE POLICY "anon_update_odds_providers" ON odds_providers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='odds_providers' AND policyname='anon_delete_odds_providers') THEN
    CREATE POLICY "anon_delete_odds_providers" ON odds_providers FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- MATCH ODDS
CREATE TABLE IF NOT EXISTS match_odds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  league_id uuid REFERENCES leagues(id),
  provider_id uuid REFERENCES odds_providers(id),
  bookmaker text NOT NULL,
  market text NOT NULL DEFAULT '1x2' CHECK (market IN ('1x2', 'btts', 'over_under_2_5', 'asian_handicap', 'draw_no_bet')),
  home_odds numeric(6,2),
  draw_odds numeric(6,2),
  away_odds numeric(6,2),
  line numeric(4,1),
  is_stale boolean NOT NULL DEFAULT false,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_odds_match_id ON match_odds(match_id);
CREATE INDEX IF NOT EXISTS idx_match_odds_league_id ON match_odds(league_id);
CREATE INDEX IF NOT EXISTS idx_match_odds_fetched_at ON match_odds(fetched_at);

ALTER TABLE match_odds ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='match_odds' AND policyname='anon_read_match_odds') THEN
    CREATE POLICY "anon_read_match_odds" ON match_odds FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='match_odds' AND policyname='anon_insert_match_odds') THEN
    CREATE POLICY "anon_insert_match_odds" ON match_odds FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='match_odds' AND policyname='anon_update_match_odds') THEN
    CREATE POLICY "anon_update_match_odds" ON match_odds FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='match_odds' AND policyname='anon_delete_match_odds') THEN
    CREATE POLICY "anon_delete_match_odds" ON match_odds FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- MATCH XG
CREATE TABLE IF NOT EXISTS match_xg (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  xg_home numeric(4,2),
  xg_away numeric(4,2),
  xg_home_first_half numeric(4,2),
  xg_away_first_half numeric(4,2),
  et_probability numeric(4,3),
  penalty_probability numeric(4,3),
  cup_historical_sample int,
  provider text,
  fetched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE match_xg ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='match_xg' AND policyname='anon_read_match_xg') THEN
    CREATE POLICY "anon_read_match_xg" ON match_xg FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='match_xg' AND policyname='anon_insert_match_xg') THEN
    CREATE POLICY "anon_insert_match_xg" ON match_xg FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='match_xg' AND policyname='anon_update_match_xg') THEN
    CREATE POLICY "anon_update_match_xg" ON match_xg FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='match_xg' AND policyname='anon_delete_match_xg') THEN
    CREATE POLICY "anon_delete_match_xg" ON match_xg FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- COVERAGE REFRESH LOG
CREATE TABLE IF NOT EXISTS coverage_refresh_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by text NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'cron', 'system')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  leagues_refreshed int,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message text,
  summary jsonb
);

ALTER TABLE coverage_refresh_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coverage_refresh_log' AND policyname='anon_read_refresh_log') THEN
    CREATE POLICY "anon_read_refresh_log" ON coverage_refresh_log FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coverage_refresh_log' AND policyname='anon_insert_refresh_log') THEN
    CREATE POLICY "anon_insert_refresh_log" ON coverage_refresh_log FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coverage_refresh_log' AND policyname='anon_update_refresh_log') THEN
    CREATE POLICY "anon_update_refresh_log" ON coverage_refresh_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coverage_refresh_log' AND policyname='anon_delete_refresh_log') THEN
    CREATE POLICY "anon_delete_refresh_log" ON coverage_refresh_log FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- Seed provider stubs
INSERT INTO odds_providers (name, slug, status, notes) VALUES
  ('The Odds API', 'the-odds-api', 'inactive', 'REST provider. Configure api_endpoint + API key in config.json.'),
  ('Betfair Exchange', 'betfair', 'inactive', 'Exchange feed. Requires OAuth.'),
  ('Pinnacle', 'pinnacle', 'inactive', 'Sharp odds reference. REST API.'),
  ('Bet365 Feed', 'bet365', 'inactive', 'Premium feed. Commercial agreement required.')
ON CONFLICT (slug) DO NOTHING;
