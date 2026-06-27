
-- Move all fictional domestic teams from Premier League to QuantPitch Demo League
-- Demo League lookup by short_name = 'DEMO'
UPDATE teams
SET league_id = (SELECT id FROM leagues WHERE short_name = 'DEMO')
WHERE competition = 'league';

-- Relink all domestic matches via home team (cascade)
UPDATE matches m
SET league_id = t.league_id
FROM teams t
WHERE m.home_team_id = t.id
  AND m.competition = 'league';

-- Reset Premier League teams link — PL has no real teams in this demo app
-- (Premier League row stays in registry for real league reference purposes,
--  but no teams/matches reference it)
-- Nothing to do — the UPDATE above already moved them all to Demo League.
