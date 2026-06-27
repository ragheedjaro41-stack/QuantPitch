-- Seed match_events: goals + cards per match (dynamic lookups, no hard-coded UUIDs).

-- 1. Goals: distribute goals across attackers using ROW_NUMBER
WITH
attackers AS (
  SELECT
    p.team_id,
    p.id AS player_id,
    ROW_NUMBER() OVER (PARTITION BY p.team_id ORDER BY
      CASE p.position
        WHEN 'ST' THEN 1 WHEN 'CF' THEN 2 WHEN 'RW' THEN 3 WHEN 'LW' THEN 4
        WHEN 'CAM' THEN 5 WHEN 'CM' THEN 6 WHEN 'CDM' THEN 7
        WHEN 'CB' THEN 8 WHEN 'RB' THEN 9 WHEN 'LB' THEN 10 WHEN 'GK' THEN 11
      END
    ) AS rn
  FROM players p
),
home_goals AS (
  SELECT m.id AS match_id, m.home_team_id AS team_id, gs AS goal_idx
  FROM matches m
  JOIN generate_series(1, m.home_score) AS gs ON true
),
away_goals AS (
  SELECT m.id AS match_id, m.away_team_id AS team_id, gs AS goal_idx
  FROM matches m
  JOIN generate_series(1, m.away_score) AS gs ON true
),
all_goals AS (
  SELECT * FROM home_goals
  UNION ALL
  SELECT * FROM away_goals
)
INSERT INTO match_events (match_id, player_id, team_id, event_type, minute, description)
SELECT
  g.match_id,
  a.player_id,
  g.team_id,
  'goal',
  ((g.goal_idx - 1) * 17 + (CASE WHEN g.team_id = (SELECT home_team_id FROM matches WHERE id = g.match_id) THEN 8 ELSE 23 END)) % 88 + 2,
  NULL
FROM all_goals g
JOIN attackers a ON a.team_id = g.team_id
  AND a.rn = ((g.goal_idx - 1) % 5) + 1;

-- 2. Yellow cards: 1 per match, assigned to a defender/midfielder dynamically
INSERT INTO match_events (match_id, player_id, team_id, event_type, minute, description)
SELECT m.id, p.id, p.team_id, 'yellow_card',
  (MOD(length(m.id::text), 60) + 20)::int, NULL
FROM matches m
CROSS JOIN LATERAL (
  SELECT p.id, p.team_id FROM players p
  WHERE p.team_id IN (m.home_team_id, m.away_team_id)
    AND p.position IN ('CB','CDM','RB','LB','CM')
  ORDER BY random() LIMIT 1
) p;

-- 3. Red cards: ~10% of matches get one, assigned dynamically
INSERT INTO match_events (match_id, player_id, team_id, event_type, minute, description)
SELECT m.id, p.id, p.team_id, 'red_card',
  (MOD(length(m.id::text), 20) + 70)::int, NULL
FROM matches m
CROSS JOIN LATERAL (
  SELECT p.id, p.team_id FROM players p
  WHERE p.team_id = m.away_team_id
    AND p.position = 'CB'
  ORDER BY random() LIMIT 1
) p
WHERE MOD(length(m.id::text), 10) = 0;
