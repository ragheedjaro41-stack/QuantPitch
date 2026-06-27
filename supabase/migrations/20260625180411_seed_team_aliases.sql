
-- Seed team aliases: common provider name variations for domestic fictional teams
-- Uses dynamic lookup by short_name — no hard-coded UUIDs.
INSERT INTO team_aliases (team_id, alias, source)
SELECT t.id, a.alias, a.source
FROM teams t
JOIN (VALUES
  ('NGU', 'Northgate Utd', 'opta'),
  ('NGU', 'NG United', 'statsperform'),
  ('NGU', 'Northgate', 'betfair'),
  ('HBR', 'Harbor City', 'opta'),
  ('HBR', 'HCFC', 'whoscored'),
  ('HBR', 'HC FC', 'betfair'),
  ('CRA', 'Crestwood Ath', 'opta'),
  ('CRA', 'Crestwood', 'statsperform'),
  ('IRV', 'Ironvale', 'opta'),
  ('IRV', 'Iron Rovers', 'betfair'),
  ('SLV', 'Silverlake', 'opta'),
  ('SLV', 'Silver Lake SC', 'whoscored'),
  ('MST', 'Marston', 'opta'),
  ('MST', 'Marston T', 'betfair')
) AS a(short_name, alias, source) ON t.short_name = a.short_name
WHERE EXISTS (SELECT 1 FROM team_aliases WHERE team_id = t.id AND alias = a.alias) = false;
