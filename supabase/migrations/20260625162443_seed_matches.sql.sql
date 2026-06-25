-- Seed 15 matches across 5 rounds
WITH tm AS (
  SELECT short_name, id FROM teams
)
INSERT INTO matches (home_team_id, away_team_id, match_date, venue, home_score, away_score, status, round)
SELECT
  h.id, a.id, m.match_date::timestamptz, m.venue, m.home_score, m.away_score, 'completed', m.round
FROM (VALUES
  -- Round 1
  (1, 'NGU','HBR','2025-08-09 15:00+00','The Citadel',2,1),
  (1, 'CRA','IRV','2025-08-09 17:30+00','Forest Park',0,0),
  (1, 'SLV','MST','2025-08-10 15:00+00','Lakeside Bowl',3,1),
  -- Round 2
  (2, 'HBR','CRA','2025-08-16 15:00+00','Dockside Arena',1,1),
  (2, 'IRV','SLV','2025-08-16 17:30+00','The Foundry',2,2),
  (2, 'MST','NGU','2025-08-17 15:00+00','Victoria Ground',0,3),
  -- Round 3
  (3, 'NGU','CRA','2025-08-23 15:00+00','The Citadel',4,0),
  (3, 'SLV','HBR','2025-08-23 17:30+00','Lakeside Bowl',2,1),
  (3, 'MST','IRV','2025-08-24 15:00+00','Victoria Ground',1,1),
  -- Round 4
  (4, 'IRV','NGU','2025-08-30 15:00+00','The Foundry',1,2),
  (4, 'HBR','MST','2025-08-30 17:30+00','Dockside Arena',3,0),
  (4, 'CRA','SLV','2025-08-31 15:00+00','Forest Park',2,2),
  -- Round 5
  (5, 'NGU','SLV','2025-09-06 15:00+00','The Citadel',1,1),
  (5, 'IRV','HBR','2025-09-06 17:30+00','The Foundry',0,2),
  (5, 'MST','CRA','2025-09-07 15:00+00','Victoria Ground',2,1)
) AS m(round, home_short, away_short, match_date, venue, home_score, away_score)
JOIN tm h ON h.short_name = m.home_short
JOIN tm a ON a.short_name = m.away_short;
