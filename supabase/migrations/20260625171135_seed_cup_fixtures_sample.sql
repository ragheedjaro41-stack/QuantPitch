
-- ============================================================
-- SAMPLE CUP FIXTURES — FA Cup 2025/26 (Third Round onward)
-- ============================================================
DO $$
DECLARE
  fac_id uuid;
  r3_id uuid; r4_id uuid; r8_id uuid; sf_id uuid; fn_id uuid;
BEGIN
  SELECT id INTO fac_id FROM cup_competitions WHERE short_name = 'FAC' LIMIT 1;
  SELECT id INTO r3_id FROM cup_rounds WHERE name = 'Third Round' AND cup_id = fac_id LIMIT 1;
  SELECT id INTO r4_id FROM cup_rounds WHERE name = 'Fourth Round' AND cup_id = fac_id LIMIT 1;
  SELECT id INTO r8_id FROM cup_rounds WHERE name = 'Sixth Round (QF)' AND cup_id = fac_id LIMIT 1;
  SELECT id INTO sf_id FROM cup_rounds WHERE name = 'Semi-Final' AND cup_id = fac_id LIMIT 1;
  SELECT id INTO fn_id FROM cup_rounds WHERE name = 'Final' AND cup_id = fac_id LIMIT 1;

  -- Third Round
  INSERT INTO cup_fixtures (cup_id, round_id, round_name, home_team_name, away_team_name, match_date, venue, home_score, away_score, went_to_et, went_to_penalties, status, winner_name, season, leg) VALUES
    (fac_id, r3_id, 'Third Round', 'Arsenal',          'Oxford United',      '2026-01-08 15:00:00+00', 'Emirates Stadium',        3, 0, false, false, 'completed', 'Arsenal',          '2025/26', 1),
    (fac_id, r3_id, 'Third Round', 'Chelsea',          'Morecambe',          '2026-01-08 15:00:00+00', 'Stamford Bridge',         4, 0, false, false, 'completed', 'Chelsea',          '2025/26', 1),
    (fac_id, r3_id, 'Third Round', 'Manchester City',  'Salford City',       '2026-01-08 20:00:00+00', 'Etihad Stadium',          5, 0, false, false, 'completed', 'Manchester City',  '2025/26', 1),
    (fac_id, r3_id, 'Third Round', 'Liverpool',        'Accrington Stanley', '2026-01-09 15:00:00+00', 'Anfield',                 4, 0, false, false, 'completed', 'Liverpool',        '2025/26', 1),
    (fac_id, r3_id, 'Third Round', 'Tottenham Hotspur','Tamworth',           '2026-01-09 20:00:00+00', 'Tottenham Hotspur Stad',  3, 0, false, false, 'completed', 'Tottenham Hotspur','2025/26', 1),
    (fac_id, r3_id, 'Third Round', 'Aston Villa',      'West Brom',          '2026-01-10 15:00:00+00', 'Villa Park',              2, 1, false, false, 'completed', 'Aston Villa',      '2025/26', 1),
    (fac_id, r3_id, 'Third Round', 'Newcastle United', 'Bromley',            '2026-01-10 20:00:00+00', 'St James Park',           3, 0, false, false, 'completed', 'Newcastle United', '2025/26', 1),
    (fac_id, r3_id, 'Third Round', 'Brighton',         'Norwich City',       '2026-01-11 15:00:00+00', 'Amex Stadium',            2, 1, false, false, 'completed', 'Brighton',         '2025/26', 1),
    (fac_id, r3_id, 'Third Round', 'Brentford',        'Bristol City',       '2026-01-11 15:00:00+00', 'Gtech Community Stadium', 1, 0, false, false, 'completed', 'Brentford',        '2025/26', 1),
    (fac_id, r3_id, 'Third Round', 'Fulham',           'Coventry City',      '2026-01-11 15:00:00+00', 'Craven Cottage',          2, 2, true,  true,  'completed', 'Coventry City',    '2025/26', 1);
  -- Fourth Round
  INSERT INTO cup_fixtures (cup_id, round_id, round_name, home_team_name, away_team_name, match_date, venue, home_score, away_score, went_to_et, went_to_penalties, status, winner_name, season, leg) VALUES
    (fac_id, r4_id, 'Fourth Round', 'Arsenal',          'Chelsea',           '2026-02-07 15:00:00+00', 'Emirates Stadium',        2, 1, false, false, 'completed', 'Arsenal',          '2025/26', 1),
    (fac_id, r4_id, 'Fourth Round', 'Manchester City',  'Liverpool',         '2026-02-07 20:00:00+00', 'Etihad Stadium',          1, 1, true,  false, 'completed', 'Liverpool',        '2025/26', 1),
    (fac_id, r4_id, 'Fourth Round', 'Tottenham Hotspur','Aston Villa',       '2026-02-08 15:00:00+00', 'Tottenham Hotspur Stad',  2, 0, false, false, 'completed', 'Tottenham Hotspur','2025/26', 1),
    (fac_id, r4_id, 'Fourth Round', 'Newcastle United', 'Brighton',          '2026-02-08 20:00:00+00', 'St James Park',           3, 2, false, false, 'completed', 'Newcastle United', '2025/26', 1),
    (fac_id, r4_id, 'Fourth Round', 'Brentford',        'Coventry City',     '2026-02-09 15:00:00+00', 'Gtech Community Stadium', 2, 0, false, false, 'completed', 'Brentford',        '2025/26', 1);
  -- Quarterfinals
  INSERT INTO cup_fixtures (cup_id, round_id, round_name, home_team_name, away_team_name, match_date, venue, home_score, away_score, went_to_et, went_to_penalties, status, winner_name, season, leg) VALUES
    (fac_id, r8_id, 'Quarterfinal', 'Arsenal',          'Tottenham Hotspur', '2026-03-07 15:00:00+00', 'Emirates Stadium',        2, 1, false, false, 'completed', 'Arsenal',          '2025/26', 1),
    (fac_id, r8_id, 'Quarterfinal', 'Liverpool',        'Newcastle United',  '2026-03-08 15:00:00+00', 'Anfield',                 3, 1, false, false, 'completed', 'Liverpool',        '2025/26', 1),
    (fac_id, r8_id, 'Quarterfinal', 'Manchester City',  'Brentford',         '2026-03-08 20:00:00+00', 'Etihad Stadium',          3, 0, false, false, 'completed', 'Manchester City',  '2025/26', 1),
    (fac_id, r8_id, 'Quarterfinal', 'Chelsea',          'Wolves',            '2026-03-09 15:00:00+00', 'Stamford Bridge',         2, 2, true,  true,  'completed', 'Wolves',           '2025/26', 1);
  -- Semi-Finals
  INSERT INTO cup_fixtures (cup_id, round_id, round_name, home_team_name, away_team_name, match_date, venue, home_score, away_score, went_to_et, went_to_penalties, status, winner_name, season, leg, is_neutral_venue) VALUES
    (fac_id, sf_id, 'Semi-Final', 'Arsenal',         'Liverpool',        '2026-04-19 16:30:00+00', 'Wembley Stadium', 2, 1, false, false, 'completed', 'Arsenal',          '2025/26', 1, true),
    (fac_id, sf_id, 'Semi-Final', 'Manchester City', 'Wolves',           '2026-04-20 16:30:00+00', 'Wembley Stadium', 3, 1, false, false, 'completed', 'Manchester City',  '2025/26', 1, true);
  -- Final
  INSERT INTO cup_fixtures (cup_id, round_id, round_name, home_team_name, away_team_name, match_date, venue, home_score, away_score, went_to_et, went_to_penalties, status, winner_name, season, leg, is_neutral_venue) VALUES
    (fac_id, fn_id, 'Final', 'Arsenal', 'Manchester City', '2026-05-17 15:00:00+00', 'Wembley Stadium', 2, 1, false, false, 'completed', 'Arsenal', '2025/26', 1, true);
END $$;

-- ============================================================
-- SAMPLE CUP FIXTURES — Copa del Rey 2025/26 (Two-leg QF onward)
-- ============================================================
DO $$
DECLARE
  cdr_id uuid; qf_id uuid; sf_id uuid; fn_id uuid;
BEGIN
  SELECT id INTO cdr_id FROM cup_competitions WHERE short_name = 'CDR' LIMIT 1;
  SELECT id INTO qf_id FROM cup_rounds WHERE name = 'Quarterfinal' AND cup_id = cdr_id LIMIT 1;
  SELECT id INTO sf_id FROM cup_rounds WHERE name = 'Semi-Final' AND cup_id = cdr_id LIMIT 1;
  SELECT id INTO fn_id FROM cup_rounds WHERE name = 'Final' AND cup_id = cdr_id LIMIT 1;

  -- QF Leg 1
  INSERT INTO cup_fixtures (cup_id, round_id, round_name, home_team_name, away_team_name, match_date, venue, home_score, away_score, status, season, leg) VALUES
    (cdr_id, qf_id, 'Quarterfinal', 'Real Madrid',  'Atletico Madrid', '2026-01-22 21:00:00+00', 'Santiago Bernabeu',      2, 1, 'completed', '2025/26', 1),
    (cdr_id, qf_id, 'Quarterfinal', 'Barcelona',    'Real Betis',      '2026-01-23 21:00:00+00', 'Spotify Camp Nou',       3, 0, 'completed', '2025/26', 1),
    (cdr_id, qf_id, 'Quarterfinal', 'Athletic Club','Villarreal',      '2026-01-23 19:00:00+00', 'San Mames',              1, 1, 'completed', '2025/26', 1),
    (cdr_id, qf_id, 'Quarterfinal', 'Sevilla',      'Valencia',        '2026-01-24 19:00:00+00', 'Ramon Sanchez-Pizjuan',  0, 0, 'completed', '2025/26', 1);
  -- QF Leg 2
  INSERT INTO cup_fixtures (cup_id, round_id, round_name, home_team_name, away_team_name, match_date, venue, home_score, away_score, home_agg, away_agg, status, winner_name, season, leg) VALUES
    (cdr_id, qf_id, 'Quarterfinal', 'Atletico Madrid','Real Madrid',  '2026-01-29 21:00:00+00', 'Metropolitano',          1, 2, 2, 4, 'completed', 'Real Madrid',  '2025/26', 2),
    (cdr_id, qf_id, 'Quarterfinal', 'Real Betis',    'Barcelona',     '2026-01-30 21:00:00+00', 'Benito Villamarin',      0, 2, 0, 5, 'completed', 'Barcelona',    '2025/26', 2),
    (cdr_id, qf_id, 'Quarterfinal', 'Villarreal',    'Athletic Club', '2026-01-30 19:00:00+00', 'Estadio de la Ceramica', 2, 0, 3, 1, 'completed', 'Villarreal',   '2025/26', 2),
    (cdr_id, qf_id, 'Quarterfinal', 'Valencia',      'Sevilla',       '2026-01-31 19:00:00+00', 'Mestalla',               1, 1, 1, 1, 'completed', 'Sevilla',      '2025/26', 2);
  -- SF Leg 1
  INSERT INTO cup_fixtures (cup_id, round_id, round_name, home_team_name, away_team_name, match_date, venue, home_score, away_score, status, season, leg) VALUES
    (cdr_id, sf_id, 'Semi-Final', 'Real Madrid',  'Barcelona',   '2026-02-05 21:00:00+00', 'Santiago Bernabeu',      1, 2, 'completed', '2025/26', 1),
    (cdr_id, sf_id, 'Semi-Final', 'Villarreal',   'Sevilla',     '2026-02-06 21:00:00+00', 'Estadio de la Ceramica', 2, 1, 'completed', '2025/26', 1);
  -- SF Leg 2
  INSERT INTO cup_fixtures (cup_id, round_id, round_name, home_team_name, away_team_name, match_date, venue, home_score, away_score, home_agg, away_agg, status, winner_name, season, leg) VALUES
    (cdr_id, sf_id, 'Semi-Final', 'Barcelona',   'Real Madrid',  '2026-02-12 21:00:00+00', 'Spotify Camp Nou', 3, 1, 5, 2, 'completed', 'Barcelona',  '2025/26', 2),
    (cdr_id, sf_id, 'Semi-Final', 'Sevilla',     'Villarreal',   '2026-02-13 21:00:00+00', 'Ramon Sanchez-Pizjuan', 1, 0, 2, 2, 'completed', 'Villarreal', '2025/26', 2);
  -- Final (neutral)
  INSERT INTO cup_fixtures (cup_id, round_id, round_name, home_team_name, away_team_name, match_date, venue, home_score, away_score, status, winner_name, season, leg, is_neutral_venue) VALUES
    (cdr_id, fn_id, 'Final', 'Barcelona', 'Villarreal', '2026-04-25 21:00:00+00', 'La Cartuja, Sevilla', 2, 0, 'completed', 'Barcelona', '2025/26', 1, true);
END $$;
