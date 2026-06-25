
-- Link all domestic league teams to Premier League (England Tier 1)
-- These are the fictional demo teams representing a single fictional top-flight league
UPDATE teams
SET league_id = '225cd2f4-2a69-4989-99bb-a0569baa5391'
WHERE competition = 'league' AND league_id IS NULL;

-- Backfill matches.league_id via home team
UPDATE matches m
SET league_id = t.league_id
FROM teams t
WHERE m.home_team_id = t.id
  AND m.competition = 'league'
  AND t.league_id IS NOT NULL
  AND m.league_id IS NULL;
