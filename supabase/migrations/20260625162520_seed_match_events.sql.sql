-- Seed match_events: goals + a few cards per match.
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
),
goal_rows AS (
  SELECT
    g.match_id,
    g.team_id,
    a.player_id,
    ((g.goal_idx - 1) * 17 + (CASE WHEN g.team_id = (SELECT home_team_id FROM matches WHERE id = g.match_id) THEN 8 ELSE 23 END)) % 88 + 2 AS minute
  FROM all_goals g
  JOIN attackers a ON a.team_id = g.team_id
    AND a.rn = ((g.goal_idx - 1) % 5) + 1
)
INSERT INTO match_events (match_id, player_id, team_id, event_type, minute, description)
SELECT match_id, player_id, team_id, 'goal', minute, NULL FROM goal_rows;

-- Yellow cards
INSERT INTO match_events (match_id, player_id, team_id, event_type, minute, description)
SELECT v.match_id::uuid, p.id, p.team_id, 'yellow_card', v.minute, NULL
FROM (VALUES
  ('45144364-dccf-4316-bcb0-ba7d6bd0a51e','762e6196-3750-41f0-b828-b517a92876e5',38),
  ('45144364-dccf-4316-bcb0-ba7d6bd0a51e','25cf293f-723c-4363-997a-248c02a8c82e',61),
  ('2a44fa62-0af2-4420-a37d-c3bf698f39ea','50adac8d-c696-4a20-a017-ee6ea5e8bc83',22),
  ('5456aa9b-287c-4915-83b7-29914251450f','a0c99cdd-883e-4e54-8c54-c62bc155a548',55),
  ('65a8d986-59a8-43e3-924f-25008f94b1c9','cf66e954-c6ad-4c04-a41f-78436307a548',70),
  ('f35134b3-86dc-432f-be6d-57a087ba9a3d','a0c99cdd-883e-4e54-8c54-c62bc155a548',40),
  ('8ba4e23a-8f15-4785-8a52-9db8da65ef3e','50adac8d-c696-4a20-a017-ee6ea5e8bc83',33),
  ('d2313e35-aadb-4f39-bb08-072b889dfc99','64d86185-760d-480b-8705-cdf080f8c062',77),
  ('fd6c0409-2dbe-458d-98c0-21e6d75b9fa5','cf66e954-c6ad-4c04-a41f-78436307a548',12)
) AS v(match_id, team_id, minute)
JOIN players p ON p.team_id = v.team_id::uuid
  AND p.position IN ('CB','CDM','RB','LB')
  AND p.jersey_number = (
    SELECT MIN(p2.jersey_number) FROM players p2
    WHERE p2.team_id = v.team_id::uuid AND p2.position IN ('CB','CDM','RB','LB')
  );

-- One red card
INSERT INTO match_events (match_id, player_id, team_id, event_type, minute, description)
SELECT m.id, p.id, p.team_id, 'red_card', 84, NULL
FROM matches m
JOIN players p ON p.team_id = m.away_team_id
WHERE m.id = '5456aa9b-287c-4915-83b7-29914251450f'::uuid
  AND p.position = 'CB' AND p.jersey_number = 5
LIMIT 1;
