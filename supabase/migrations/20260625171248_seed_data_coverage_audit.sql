
-- Populate data_coverage from leagues table
INSERT INTO data_coverage (entity_type, entity_id, entity_name, fixture_coverage, odds_coverage, stats_coverage, standings_coverage, team_stats_coverage, injury_news_coverage, historical_depth_years, provider_flags, missing_data_flags, overall_score, risk_level)
SELECT
  'league',
  id,
  name,
  fixture_coverage,
  odds_coverage,
  stats_coverage,
  CASE WHEN has_standings THEN 95.0 ELSE 0.0 END,
  CASE WHEN has_team_stats THEN 80.0 ELSE 0.0 END,
  CASE WHEN has_injury_news THEN 70.0 ELSE 0.0 END,
  historical_depth_years,
  jsonb_build_object(
    'fixtures', CASE WHEN has_fixtures THEN 'ok' ELSE 'missing' END,
    'odds',     CASE WHEN has_odds THEN 'ok' ELSE 'missing' END,
    'stats',    CASE WHEN has_stats THEN 'ok' ELSE 'missing' END,
    'standings',CASE WHEN has_standings THEN 'ok' ELSE 'missing' END
  ),
  CASE
    WHEN NOT has_fixtures THEN ARRAY['fixtures']
    WHEN NOT has_odds     THEN ARRAY['odds']
    WHEN NOT has_stats    THEN ARRAY['stats']
    ELSE '{}'::text[]
  END,
  ROUND((fixture_coverage + odds_coverage + stats_coverage +
    CASE WHEN has_standings THEN 95.0 ELSE 0.0 END +
    CASE WHEN has_team_stats THEN 80.0 ELSE 0.0 END) / 5.0, 2),
  CASE
    WHEN provider_flag = 'missing' THEN 'critical'
    WHEN provider_flag = 'partial' AND (fixture_coverage < 70 OR odds_coverage < 40) THEN 'high'
    WHEN provider_flag = 'partial' THEN 'medium'
    WHEN fixture_coverage >= 90 AND odds_coverage >= 80 AND stats_coverage >= 75 THEN 'low'
    ELSE 'medium'
  END
FROM leagues;

-- Populate data_coverage from cup_competitions
INSERT INTO data_coverage (entity_type, entity_id, entity_name, fixture_coverage, odds_coverage, stats_coverage, standings_coverage, team_stats_coverage, injury_news_coverage, historical_depth_years, provider_flags, missing_data_flags, overall_score, risk_level)
SELECT
  'cup',
  id,
  name,
  CASE WHEN has_fixtures THEN 90.0 ELSE 30.0 END,
  CASE WHEN has_odds THEN 85.0 ELSE 15.0 END,
  CASE WHEN has_stats THEN 80.0 ELSE 10.0 END,
  0.0, 0.0, 0.0, 0,
  jsonb_build_object(
    'fixtures', CASE WHEN has_fixtures THEN 'ok' ELSE 'missing' END,
    'odds',     CASE WHEN has_odds THEN 'ok' ELSE 'missing' END,
    'stats',    CASE WHEN has_stats THEN 'ok' ELSE 'missing' END
  ),
  CASE
    WHEN NOT has_fixtures THEN ARRAY['fixtures', 'odds', 'stats']
    WHEN NOT has_odds     THEN ARRAY['odds']
    WHEN NOT has_stats    THEN ARRAY['stats']
    ELSE '{}'::text[]
  END,
  ROUND((
    CASE WHEN has_fixtures THEN 90.0 ELSE 30.0 END +
    CASE WHEN has_odds THEN 85.0 ELSE 15.0 END +
    CASE WHEN has_stats THEN 80.0 ELSE 10.0 END
  ) / 3.0, 2),
  CASE
    WHEN provider_flag = 'missing' THEN 'critical'
    WHEN provider_flag = 'partial' THEN 'medium'
    WHEN playable THEN 'low'
    ELSE 'medium'
  END
FROM cup_competitions;
