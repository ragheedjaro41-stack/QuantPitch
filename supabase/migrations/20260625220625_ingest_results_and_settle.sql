-- Ingest match results from existing completed matches and settle all markets.
-- This uses ft_home/ft_away (90-minute regulation scores) for settlement.
-- ET and penalty data stored separately where applicable.
-- No fake data: all scores come from existing matches table.

-- 1. Create results_sync_log entry
INSERT INTO results_sync_log (provider, status, synced_count, settled_count, void_count, missing_score_count, started_at, finished_at)
VALUES ('db-migration', 'completed', 0, 0, 0, 0, now(), now())
RETURNING id;

-- 2. Insert match_results for all completed matches (skip any that already exist)
INSERT INTO match_results (match_id, ft_home, ft_away, ht_home, ht_away, et_home, et_away, pen_home, pen_away, went_to_et, went_to_penalties, match_status, competition_type, provider_source, notes)
SELECT
  m.id,
  m.home_score,
  m.away_score,
  NULL, -- ht_home not stored in matches table
  NULL, -- ht_away not stored in matches table
  NULL, -- et_home
  NULL, -- et_away
  NULL, -- pen_home
  NULL, -- pen_away
  false, -- went_to_et
  false, -- went_to_penalties
  'confirmed',
  CASE
    WHEN m.competition = 'worldcup' AND m.stage IS NOT NULL AND m.stage NOT IN ('group') THEN 'cup'
    WHEN m.competition = 'league' AND m.stage IS NOT NULL AND m.stage IN ('Semifinal', 'Final', 'Quarterfinal') THEN 'cup'
    ELSE 'league'
  END,
  'db-migration',
  CASE
    WHEN m.competition = 'worldcup' THEN 'World Cup ' || COALESCE(m.stage, 'group')
    WHEN l.is_synthetic = true THEN 'Demo league match'
    ELSE NULL
  END
FROM matches m
LEFT JOIN leagues l ON l.id = m.league_id
WHERE m.status = 'completed'
ON CONFLICT (match_id) DO NOTHING;

-- 3. Settle h2h market for all confirmed results
INSERT INTO settlement_log (match_id, match_result_id, market_key, outcome, status, reason)
SELECT
  mr.match_id,
  mr.id,
  'h2h',
  CASE
    WHEN mr.ft_home > mr.ft_away THEN 'home'
    WHEN mr.ft_away > mr.ft_home THEN 'away'
    ELSE 'draw'
  END,
  'settled',
  CASE
    WHEN mr.ft_home > mr.ft_away THEN 'Home win ' || mr.ft_home || '-' || mr.ft_away || ' (FT regulation)'
    WHEN mr.ft_away > mr.ft_home THEN 'Away win ' || mr.ft_home || '-' || mr.ft_away || ' (FT regulation)'
    ELSE 'Draw ' || mr.ft_home || '-' || mr.ft_away || ' (FT regulation)'
  END
FROM match_results mr
WHERE mr.match_status = 'confirmed'
  AND NOT EXISTS (SELECT 1 FROM settlement_log sl WHERE sl.match_result_id = mr.id AND sl.market_key = 'h2h');

-- 4. Settle totals_1.5 market
INSERT INTO settlement_log (match_id, match_result_id, market_key, outcome, status, reason)
SELECT
  mr.match_id,
  mr.id,
  'totals_1.5',
  CASE WHEN (mr.ft_home + mr.ft_away) > 1.5 THEN 'over' ELSE 'under' END,
  'settled',
  (mr.ft_home + mr.ft_away)::text || ' goals ' ||
    CASE WHEN (mr.ft_home + mr.ft_away) > 1.5 THEN '> 1.5' ELSE '< 1.5' END ||
    ' (FT ' || mr.ft_home || '-' || mr.ft_away || ')'
FROM match_results mr
WHERE mr.match_status = 'confirmed'
  AND NOT EXISTS (SELECT 1 FROM settlement_log sl WHERE sl.match_result_id = mr.id AND sl.market_key = 'totals_1.5');

-- 5. Settle totals_2.5 market
INSERT INTO settlement_log (match_id, match_result_id, market_key, outcome, status, reason)
SELECT
  mr.match_id,
  mr.id,
  'totals_2.5',
  CASE WHEN (mr.ft_home + mr.ft_away) > 2.5 THEN 'over' ELSE 'under' END,
  'settled',
  (mr.ft_home + mr.ft_away)::text || ' goals ' ||
    CASE WHEN (mr.ft_home + mr.ft_away) > 2.5 THEN '> 2.5' ELSE '< 2.5' END ||
    ' (FT ' || mr.ft_home || '-' || mr.ft_away || ')'
FROM match_results mr
WHERE mr.match_status = 'confirmed'
  AND NOT EXISTS (SELECT 1 FROM settlement_log sl WHERE sl.match_result_id = mr.id AND sl.market_key = 'totals_2.5');

-- 6. Settle totals_3.5 market
INSERT INTO settlement_log (match_id, match_result_id, market_key, outcome, status, reason)
SELECT
  mr.match_id,
  mr.id,
  'totals_3.5',
  CASE WHEN (mr.ft_home + mr.ft_away) > 3.5 THEN 'over' ELSE 'under' END,
  'settled',
  (mr.ft_home + mr.ft_away)::text || ' goals ' ||
    CASE WHEN (mr.ft_home + mr.ft_away) > 3.5 THEN '> 3.5' ELSE '< 3.5' END ||
    ' (FT ' || mr.ft_home || '-' || mr.ft_away || ')'
FROM match_results mr
WHERE mr.match_status = 'confirmed'
  AND NOT EXISTS (SELECT 1 FROM settlement_log sl WHERE sl.match_result_id = mr.id AND sl.market_key = 'totals_3.5');

-- 7. Settle btts market
INSERT INTO settlement_log (match_id, match_result_id, market_key, outcome, status, reason)
SELECT
  mr.match_id,
  mr.id,
  'btts',
  CASE WHEN mr.ft_home > 0 AND mr.ft_away > 0 THEN 'yes' ELSE 'no' END,
  'settled',
  CASE
    WHEN mr.ft_home > 0 AND mr.ft_away > 0 THEN 'Both scored (FT ' || mr.ft_home || '-' || mr.ft_away || ')'
    ELSE 'Not both scored (FT ' || mr.ft_home || '-' || mr.ft_away || ')'
  END
FROM match_results mr
WHERE mr.match_status = 'confirmed'
  AND NOT EXISTS (SELECT 1 FROM settlement_log sl WHERE sl.match_result_id = mr.id AND sl.market_key = 'btts');

-- 8. Update the sync log with final counts
UPDATE results_sync_log
SET synced_count = (SELECT COUNT(*) FROM match_results WHERE provider_source = 'db-migration'),
    settled_count = (SELECT COUNT(DISTINCT match_id) FROM settlement_log),
    finished_at = now()
WHERE provider = 'db-migration'
  AND status = 'completed'
  AND started_at = (SELECT MAX(started_at) FROM results_sync_log WHERE provider = 'db-migration');
