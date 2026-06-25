
-- ============================================================
-- LEAGUE REGISTRY
-- ============================================================
CREATE TABLE leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text NOT NULL,
  country text NOT NULL,
  continent text NOT NULL DEFAULT 'Europe',
  tier int NOT NULL DEFAULT 4,
  tier_label text NOT NULL DEFAULT 'Tier 4',
  competition_type text NOT NULL DEFAULT 'domestic_league',
  season text NOT NULL DEFAULT '2025/26',
  active boolean NOT NULL DEFAULT true,
  -- Coverage flags
  has_fixtures boolean NOT NULL DEFAULT false,
  has_odds boolean NOT NULL DEFAULT false,
  has_stats boolean NOT NULL DEFAULT false,
  has_standings boolean NOT NULL DEFAULT false,
  has_team_stats boolean NOT NULL DEFAULT false,
  has_injury_news boolean NOT NULL DEFAULT false,
  historical_depth_years int NOT NULL DEFAULT 0,
  fixture_coverage numeric(5,2) NOT NULL DEFAULT 0,
  odds_coverage numeric(5,2) NOT NULL DEFAULT 0,
  stats_coverage numeric(5,2) NOT NULL DEFAULT 0,
  provider_flag text NOT NULL DEFAULT 'unknown',
  playable boolean NOT NULL DEFAULT false,
  notes text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leagues_tier ON leagues(tier);
CREATE INDEX idx_leagues_competition_type ON leagues(competition_type);
CREATE INDEX idx_leagues_country ON leagues(country);

-- RLS
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_leagues" ON leagues FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_leagues" ON leagues FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_leagues" ON leagues FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_leagues" ON leagues FOR DELETE TO authenticated USING (true);

-- ============================================================
-- TEAM REGISTRY EXTENSIONS
-- ============================================================
ALTER TABLE teams ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS league_id uuid REFERENCES leagues(id);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS promoted boolean NOT NULL DEFAULT false;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS relegated boolean NOT NULL DEFAULT false;

CREATE TABLE team_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  alias text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(alias, source)
);

CREATE INDEX idx_team_aliases_team ON team_aliases(team_id);

ALTER TABLE team_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_team_aliases" ON team_aliases FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_team_aliases" ON team_aliases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_team_aliases" ON team_aliases FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_team_aliases" ON team_aliases FOR DELETE TO authenticated USING (true);

-- ============================================================
-- CUP COMPETITIONS
-- ============================================================
CREATE TABLE cup_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text NOT NULL,
  country text NOT NULL,
  continent text NOT NULL DEFAULT 'Europe',
  competition_type text NOT NULL DEFAULT 'cup',
  current_season text NOT NULL DEFAULT '2025/26',
  active boolean NOT NULL DEFAULT true,
  has_groups boolean NOT NULL DEFAULT false,
  has_two_legs boolean NOT NULL DEFAULT false,
  tier_label text NOT NULL DEFAULT 'Cup',
  has_fixtures boolean NOT NULL DEFAULT false,
  has_odds boolean NOT NULL DEFAULT false,
  has_stats boolean NOT NULL DEFAULT false,
  provider_flag text NOT NULL DEFAULT 'unknown',
  playable boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cups_competition_type ON cup_competitions(competition_type);
CREATE INDEX idx_cups_country ON cup_competitions(country);

ALTER TABLE cup_competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_cups" ON cup_competitions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_cups" ON cup_competitions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_cups" ON cup_competitions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_cups" ON cup_competitions FOR DELETE TO authenticated USING (true);

-- ============================================================
-- CUP ROUNDS
-- ============================================================
CREATE TABLE cup_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cup_id uuid NOT NULL REFERENCES cup_competitions(id) ON DELETE CASCADE,
  name text NOT NULL,
  round_number int NOT NULL,
  is_two_legs boolean NOT NULL DEFAULT false,
  is_neutral_venue boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cup_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_cup_rounds" ON cup_rounds FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_cup_rounds" ON cup_rounds FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_cup_rounds" ON cup_rounds FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_cup_rounds" ON cup_rounds FOR DELETE TO authenticated USING (true);

-- ============================================================
-- CUP FIXTURES
-- ============================================================
CREATE TABLE cup_fixtures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cup_id uuid NOT NULL REFERENCES cup_competitions(id) ON DELETE CASCADE,
  round_id uuid REFERENCES cup_rounds(id),
  round_name text NOT NULL DEFAULT 'Round',
  home_team_id uuid REFERENCES teams(id),
  away_team_id uuid REFERENCES teams(id),
  home_team_name text,
  away_team_name text,
  match_date timestamptz,
  venue text,
  is_neutral_venue boolean NOT NULL DEFAULT false,
  home_score int,
  away_score int,
  home_score_et int,
  away_score_et int,
  home_score_pen int,
  away_score_pen int,
  went_to_et boolean NOT NULL DEFAULT false,
  went_to_penalties boolean NOT NULL DEFAULT false,
  leg int NOT NULL DEFAULT 1,
  tie_id uuid,
  home_agg int,
  away_agg int,
  status text NOT NULL DEFAULT 'completed',
  winner_team_id uuid REFERENCES teams(id),
  winner_name text,
  season text NOT NULL DEFAULT '2025/26',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cup_fixtures_cup ON cup_fixtures(cup_id);
CREATE INDEX idx_cup_fixtures_tie ON cup_fixtures(tie_id);

ALTER TABLE cup_fixtures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_cup_fixtures" ON cup_fixtures FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_cup_fixtures" ON cup_fixtures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_cup_fixtures" ON cup_fixtures FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_cup_fixtures" ON cup_fixtures FOR DELETE TO authenticated USING (true);

-- ============================================================
-- DATA COVERAGE AUDIT
-- ============================================================
CREATE TABLE data_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_name text NOT NULL,
  fixture_coverage numeric(5,2) NOT NULL DEFAULT 0,
  odds_coverage numeric(5,2) NOT NULL DEFAULT 0,
  stats_coverage numeric(5,2) NOT NULL DEFAULT 0,
  standings_coverage numeric(5,2) NOT NULL DEFAULT 0,
  team_stats_coverage numeric(5,2) NOT NULL DEFAULT 0,
  injury_news_coverage numeric(5,2) NOT NULL DEFAULT 0,
  historical_depth_years int NOT NULL DEFAULT 0,
  provider_flags jsonb NOT NULL DEFAULT '{}',
  missing_data_flags text[] NOT NULL DEFAULT '{}',
  last_audited_at timestamptz NOT NULL DEFAULT now(),
  overall_score numeric(5,2) NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX idx_coverage_entity ON data_coverage(entity_type, entity_id);
CREATE INDEX idx_coverage_risk ON data_coverage(risk_level);

ALTER TABLE data_coverage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_coverage" ON data_coverage FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_coverage" ON data_coverage FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_coverage" ON data_coverage FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_coverage" ON data_coverage FOR DELETE TO authenticated USING (true);

-- ============================================================
-- PREDICTION RULES
-- ============================================================
CREATE TABLE prediction_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL UNIQUE,
  competition_types text[] NOT NULL DEFAULT '{}',
  applies_to text[] NOT NULL DEFAULT '{}',
  rule_description text NOT NULL,
  weight_modifier numeric(4,2) NOT NULL DEFAULT 1.0,
  priority int NOT NULL DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE prediction_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_prediction_rules" ON prediction_rules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_prediction_rules" ON prediction_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_prediction_rules" ON prediction_rules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_prediction_rules" ON prediction_rules FOR DELETE TO authenticated USING (true);

-- ============================================================
-- SAFETY RULES
-- ============================================================
CREATE TABLE safety_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL UNIQUE,
  min_fixtures int NOT NULL DEFAULT 0,
  min_team_history_years int NOT NULL DEFAULT 0,
  min_stats_coverage numeric(5,2) NOT NULL DEFAULT 0,
  min_odds_coverage numeric(5,2) NOT NULL DEFAULT 0,
  min_settlement_coverage numeric(5,2) NOT NULL DEFAULT 0,
  tier_applies_to int[] NOT NULL DEFAULT '{}',
  description text NOT NULL,
  consequence text NOT NULL DEFAULT 'Flag for review',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE safety_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_safety_rules" ON safety_rules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_safety_rules" ON safety_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_safety_rules" ON safety_rules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_safety_rules" ON safety_rules FOR DELETE TO authenticated USING (true);
