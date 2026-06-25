
DROP FUNCTION IF EXISTS sync_league_live_odds_flag() CASCADE;
DROP FUNCTION IF EXISTS mark_stale_odds(int) CASCADE;

CREATE OR REPLACE FUNCTION mark_stale_odds(stale_threshold_hours int DEFAULT 4)
RETURNS int
LANGUAGE plpgsql AS $$
DECLARE
  _updated int;
BEGIN
  UPDATE match_odds
  SET is_stale = true
  WHERE is_stale = false
    AND fetched_at < now() - (stale_threshold_hours || ' hours')::interval;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END;
$$;

CREATE OR REPLACE FUNCTION sync_league_live_odds_flag()
RETURNS TABLE(out_league_id uuid, out_league_name text, out_has_live_odds boolean)
LANGUAGE plpgsql AS $$
DECLARE
  _league RECORD;
  _fresh_count bigint;
  _new_flag boolean;
BEGIN
  PERFORM mark_stale_odds(4);

  FOR _league IN SELECT id, name, is_synthetic FROM leagues WHERE active = true LOOP
    IF _league.is_synthetic THEN
      _new_flag := false;
    ELSE
      SELECT COUNT(*) INTO _fresh_count
      FROM match_odds mo
      WHERE mo.league_id = _league.id
        AND mo.is_stale = false
        AND mo.fetched_at >= now() - interval '4 hours';
      _new_flag := (_fresh_count > 0);
    END IF;

    UPDATE leagues SET has_live_odds = _new_flag WHERE id = _league.id;

    out_league_id := _league.id;
    out_league_name := _league.name;
    out_has_live_odds := _new_flag;
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION get_cup_sample_size(p_cup_id uuid)
RETURNS int
LANGUAGE sql AS $$
  SELECT COUNT(*)::int
  FROM cup_fixtures
  WHERE cup_id = p_cup_id
    AND status = 'completed'
    AND home_score IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION refresh_league_coverage_logged(p_triggered_by text DEFAULT 'manual')
RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  _log_id uuid;
  _count int := 0;
  _summary jsonb := '[]'::jsonb;
  _row RECORD;
BEGIN
  INSERT INTO coverage_refresh_log (triggered_by, status)
  VALUES (p_triggered_by, 'running')
  RETURNING id INTO _log_id;

  BEGIN
    FOR _row IN SELECT * FROM refresh_league_coverage() LOOP
      _count := _count + 1;
      _summary := _summary || jsonb_build_object(
        'league', _row.out_league_name,
        'risk', _row.out_risk,
        'odds_pct', _row.out_odds_pct,
        'overall', _row.out_overall
      );
    END LOOP;

    UPDATE coverage_refresh_log
    SET status = 'completed',
        finished_at = now(),
        leagues_refreshed = _count,
        summary = _summary
    WHERE id = _log_id;
  EXCEPTION WHEN OTHERS THEN
    UPDATE coverage_refresh_log
    SET status = 'failed',
        finished_at = now(),
        error_message = SQLERRM
    WHERE id = _log_id;
    RAISE;
  END;

  RETURN _log_id;
END;
$$;
