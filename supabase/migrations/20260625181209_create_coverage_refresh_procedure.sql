
-- Coverage refresh stored procedure
-- Computes real coverage metrics from actual data tables and updates data_coverage rows.
-- For synthetic/demo leagues it marks them as demo-only with 0% odds coverage.

CREATE OR REPLACE FUNCTION refresh_league_coverage()
RETURNS TABLE(
  league_id uuid,
  league_name text,
  fixture_pct int,
  odds_pct int,
  stats_pct int,
  settlement_pct int,
  overall int,
  risk text,
  refreshed_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  _league RECORD;
  _total_matches int;
  _completed_matches int;
  _matches_with_score int;
  _fixture_pct int;
  _odds_pct int;
  _stats_pct int;
  _settlement_pct int;
  _team_stats_pct int;
  _overall int;
  _risk text;
  _provider_flag text;
  _missing_flags text[];
BEGIN
  FOR _league IN
    SELECT l.id, l.name, l.is_synthetic, l.has_live_odds,
           l.odds_coverage, l.stats_coverage, l.fixture_coverage
    FROM leagues l
    WHERE l.active = true
  LOOP
    -- Count total matches in this league
    SELECT COUNT(*) INTO _total_matches
    FROM matches WHERE league_id = _league.id;

    -- Count completed matches
    SELECT COUNT(*) INTO _completed_matches
    FROM matches WHERE league_id = _league.id AND status = 'completed';

    -- Count matches with actual score data (proxy for settlement coverage)
    SELECT COUNT(*) INTO _matches_with_score
    FROM matches
    WHERE league_id = _league.id
      AND status = 'completed'
      AND home_score IS NOT NULL
      AND away_score IS NOT NULL;

    -- Fixture coverage: completed / total matches (or use seeded value if no match data)
    IF _total_matches > 0 THEN
      _fixture_pct := ROUND((_completed_matches::numeric / _total_matches) * 100);
    ELSE
      _fixture_pct := _league.fixture_coverage; -- fall back to seeded
    END IF;

    -- Odds coverage: 0 if no live odds feed, otherwise seeded value
    -- is_synthetic or NOT has_live_odds → 0 odds
    IF _league.is_synthetic OR NOT _league.has_live_odds THEN
      _odds_pct := 0;
    ELSE
      _odds_pct := _league.odds_coverage;
    END IF;

    -- Stats coverage: computed from matches with event data
    IF _total_matches > 0 THEN
      DECLARE
        _with_events int;
      BEGIN
        SELECT COUNT(DISTINCT match_id) INTO _with_events
        FROM match_events
        WHERE match_id IN (SELECT id FROM matches WHERE league_id = _league.id);
        _stats_pct := ROUND((_with_events::numeric / GREATEST(_total_matches, 1)) * 100);
      END;
    ELSE
      _stats_pct := _league.stats_coverage;
    END IF;

    -- Settlement coverage: matches_with_score / completed_matches
    IF _completed_matches > 0 THEN
      _settlement_pct := ROUND((_matches_with_score::numeric / _completed_matches) * 100);
    ELSE
      _settlement_pct := 0;
    END IF;

    -- Team stats: proxy from stats coverage
    _team_stats_pct := LEAST(_stats_pct, 80);

    -- Build missing flags
    _missing_flags := ARRAY[]::text[];
    IF _odds_pct = 0 THEN _missing_flags := array_append(_missing_flags, 'odds'); END IF;
    IF _stats_pct < 50 THEN _missing_flags := array_append(_missing_flags, 'stats'); END IF;
    IF _fixture_pct < 30 THEN _missing_flags := array_append(_missing_flags, 'fixtures'); END IF;
    IF _settlement_pct < 30 THEN _missing_flags := array_append(_missing_flags, 'settlement'); END IF;

    -- Overall score (weighted average)
    _overall := ROUND(
      (_fixture_pct * 0.2) +
      (_odds_pct * 0.35) +
      (_stats_pct * 0.2) +
      (_settlement_pct * 0.15) +
      (_team_stats_pct * 0.1)
    );

    -- Risk classification
    IF _league.is_synthetic THEN
      _risk := 'demo';
      _provider_flag := 'demo';
    ELSIF _odds_pct = 0 OR _overall < 20 THEN
      _risk := 'critical';
      _provider_flag := 'missing';
    ELSIF _overall < 45 THEN
      _risk := 'high';
      _provider_flag := 'partial';
    ELSIF _overall < 70 THEN
      _risk := 'medium';
      _provider_flag := 'partial';
    ELSE
      _risk := 'low';
      _provider_flag := 'ok';
    END IF;

    -- Upsert into data_coverage
    INSERT INTO data_coverage (
      entity_type, entity_id, entity_name,
      fixture_coverage, odds_coverage, stats_coverage,
      standings_coverage, team_stats_coverage, injury_news_coverage,
      historical_depth_years,
      provider_flags, missing_data_flags,
      overall_score, risk_level, last_audited_at
    ) VALUES (
      'league', _league.id, _league.name,
      _fixture_pct, _odds_pct, _stats_pct,
      _fixture_pct, _team_stats_pct, 0,
      1,
      jsonb_build_object('primary', _provider_flag),
      _missing_flags,
      _overall, _risk, now()
    )
    ON CONFLICT (entity_type, entity_id) DO UPDATE SET
      fixture_coverage = EXCLUDED.fixture_coverage,
      odds_coverage = EXCLUDED.odds_coverage,
      stats_coverage = EXCLUDED.stats_coverage,
      standings_coverage = EXCLUDED.standings_coverage,
      team_stats_coverage = EXCLUDED.team_stats_coverage,
      missing_data_flags = EXCLUDED.missing_data_flags,
      overall_score = EXCLUDED.overall_score,
      risk_level = EXCLUDED.risk_level,
      last_audited_at = EXCLUDED.last_audited_at;

    -- Return row
    league_id := _league.id;
    league_name := _league.name;
    fixture_pct := _fixture_pct;
    odds_pct := _odds_pct;
    stats_pct := _stats_pct;
    settlement_pct := _settlement_pct;
    overall := _overall;
    risk := _risk;
    refreshed_at := now();
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Add unique constraint on data_coverage(entity_type, entity_id) for the upsert
ALTER TABLE data_coverage DROP CONSTRAINT IF EXISTS uq_data_coverage_entity;
ALTER TABLE data_coverage ADD CONSTRAINT uq_data_coverage_entity UNIQUE (entity_type, entity_id);

-- Add unresolved_alias_queue table for alias resolver admin review
CREATE TABLE IF NOT EXISTS unresolved_alias_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_name text NOT NULL,
  source text NOT NULL,
  suggested_team_id uuid REFERENCES teams(id),
  suggested_team_name text,
  confidence int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by text
);

ALTER TABLE unresolved_alias_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_unresolved_aliases" ON unresolved_alias_queue
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_unresolved_aliases" ON unresolved_alias_queue
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_unresolved_aliases" ON unresolved_alias_queue
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_unresolved_aliases" ON unresolved_alias_queue
  FOR DELETE TO anon, authenticated USING (true);
