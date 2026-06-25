
-- Add synthetic/demo league flag and live odds flag to leagues table
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS has_live_odds boolean NOT NULL DEFAULT false;

-- Create the QuantPitch Demo League — a synthetic Tier 1 stand-in for fictional teams
INSERT INTO leagues (
  name, short_name, country, continent, tier, tier_label,
  competition_type, season, active, has_fixtures, has_odds, has_stats,
  has_standings, has_team_stats, has_injury_news, historical_depth_years,
  fixture_coverage, odds_coverage, stats_coverage,
  provider_flag, playable, is_synthetic, has_live_odds, notes
) VALUES (
  'QuantPitch Demo League', 'DEMO', 'Synthetic', 'None', 1, 'Tier 1',
  'synthetic', '2025', true, true, false, true,
  true, true, false, 1,
  100, 0, 80,
  'demo', false, true, false,
  'Fictional demo league for app demo data only. Not connected to any real provider.'
)
ON CONFLICT DO NOTHING;
