
DROP FUNCTION IF EXISTS refresh_league_coverage();

CREATE OR REPLACE FUNCTION refresh_league_coverage()
RETURNS TABLE(
  out_league_id uuid,
  out_league_name text,
  out_fixture_pct int,
  out_odds_pct int,
  out_stats_pct int,
  out_settlement_pct int,
  out_overall int,
  out_risk text,
  out_refreshed_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  _league RECORD;
  _total_matches bigint;
  _completed_matches bigint;
  _matches_with_score bigint;
  _with_events bigint;
  _calc_fixture_pct int;
  _calc_odds_pct int;
  _calc_stats_pct int;
  _calc_settlement_pct int;
  _calc_team_stats_pct int;
  _calc_overall int;
  _calc_risk text;
  _provider_flag text;
  _missing_flags text[];
BEGIN
  FOR _league IN
    SELECT l.id, l.name, l.is_synthetic, l.has_live_odds,
           l.odds_coverage, l.stats_coverage, l.fixture_coverage
    FROM leagues l
    WHERE l.active = true
  LOOP
    SELECT COUNT(*) INTO _total_matches
    FROM matches m WHERE m.league_id = _league.id;

    SELECT COUNT(*) INTO _completed_matches
    FROM matches m WHERE m.league_id = _league.id AND m.status = 'completed';

    SELECT COUNT(*) INTO _matches_with_score
    FROM matches m
    WHERE m.league_id = _league.id
      AND m.status = 'completed'
      AND m.home_score IS NOT NULL
      AND m.away_score IS NOT NULL;

    IF _total_matches > 0 THEN
      _calc_fixture_pct := ROUND((_completed_matches::numeric / _total_matches) * 100);
    ELSE
      _calc_fixture_pct := _league.fixture_coverage;
    END IF;

    IF _league.is_synthetic OR NOT _league.has_live_odds THEN
      _calc_odds_pct := 0;
    ELSE
      _calc_odds_pct := _league.odds_coverage;
    END IF;

    IF _total_matches > 0 THEN
      SELECT COUNT(DISTINCT me.match_id) INTO _with_events
      FROM match_events me
      JOIN matches m2 ON me.match_id = m2.id
      WHERE m2.league_id = _league.id;
      _calc_stats_pct := ROUND((_with_events::numeric / GREATEST(_total_matches, 1)) * 100);
    ELSE
      _calc_stats_pct := _league.stats_coverage;
    END IF;

    IF _completed_matches > 0 THEN
      _calc_settlement_pct := ROUND((_matches_with_score::numeric / _completed_matches) * 100);
    ELSE
      _calc_settlement_pct := 0;
    END IF;

    _calc_team_stats_pct := LEAST(_calc_stats_pct, 80);

    _missing_flags := ARRAY[]::text[];
    IF _calc_odds_pct = 0 THEN _missing_flags := array_append(_missing_flags, 'odds'); END IF;
    IF _calc_stats_pct < 50 THEN _missing_flags := array_append(_missing_flags, 'stats'); END IF;
    IF _calc_fixture_pct < 30 THEN _missing_flags := array_append(_missing_flags, 'fixtures'); END IF;
    IF _calc_settlement_pct < 30 THEN _missing_flags := array_append(_missing_flags, 'settlement'); END IF;

    _calc_overall := ROUND(
      (_calc_fixture_pct * 0.2) +
      (_calc_odds_pct * 0.35) +
      (_calc_stats_pct * 0.2) +
      (_calc_settlement_pct * 0.15) +
      (_calc_team_stats_pct * 0.1)
    );

    IF _league.is_synthetic THEN
      _calc_risk := 'demo';
      _provider_flag := 'demo';
    ELSIF _calc_odds_pct = 0 OR _calc_overall < 20 THEN
      _calc_risk := 'critical';
      _provider_flag := 'missing';
    ELSIF _calc_overall < 45 THEN
      _calc_risk := 'high';
      _provider_flag := 'partial';
    ELSIF _calc_overall < 70 THEN
      _calc_risk := 'medium';
      _provider_flag := 'partial';
    ELSE
      _calc_risk := 'low';
      _provider_flag := 'ok';
    END IF;

    INSERT INTO data_coverage (
      entity_type, entity_id, entity_name,
      fixture_coverage, odds_coverage, stats_coverage,
      standings_coverage, team_stats_coverage, injury_news_coverage,
      historical_depth_years,
      provider_flags, missing_data_flags,
      overall_score, risk_level, last_audited_at
    ) VALUES (
      'league', _league.id, _league.name,
      _calc_fixture_pct, _calc_odds_pct, _calc_stats_pct,
      _calc_fixture_pct, _calc_team_stats_pct, 0,
      1,
      jsonb_build_object('primary', _provider_flag),
      _missing_flags,
      _calc_overall, _calc_risk, now()
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

    out_league_id := _league.id;
    out_league_name := _league.name;
    out_fixture_pct := _calc_fixture_pct;
    out_odds_pct := _calc_odds_pct;
    out_stats_pct := _calc_stats_pct;
    out_settlement_pct := _calc_settlement_pct;
    out_overall := _calc_overall;
    out_risk := _calc_risk;
    out_refreshed_at := now();
    RETURN NEXT;
  END LOOP;
END;
$$;
