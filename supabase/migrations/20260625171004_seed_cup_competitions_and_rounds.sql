
-- ============================================================
-- CUP COMPETITIONS
-- ============================================================
INSERT INTO cup_competitions (name, short_name, country, continent, competition_type, current_season, active,
  has_groups, has_two_legs, tier_label, has_fixtures, has_odds, has_stats, provider_flag, playable, notes)
VALUES
('FA Cup',                    'FAC',    'England',     'Europe',        'cup',                      '2025/26', true,  false, false, 'Cup',           true,  true,  true,  'ok',      true,  'UK flagship cup. Excellent coverage.'),
('EFL Cup (Carabao Cup)',      'EFL',    'England',     'Europe',        'cup',                      '2025/26', true,  false, false, 'Cup',           true,  true,  true,  'ok',      true,  'Strong UK coverage.'),
('Copa del Rey',               'CDR',    'Spain',       'Europe',        'cup',                      '2025/26', true,  false, true,  'Cup',           true,  true,  true,  'ok',      true,  'Two-leg knockout. Good coverage.'),
('DFB-Pokal',                  'DFBP',   'Germany',     'Europe',        'cup',                      '2025/26', true,  false, false, 'Cup',           true,  true,  true,  'ok',      true,  'Single-leg knockout. Strong coverage.'),
('Coppa Italia',               'CI',     'Italy',       'Europe',        'cup',                      '2025/26', true,  false, true,  'Cup',           true,  true,  true,  'ok',      true,  NULL),
('Coupe de France',            'CDF',    'France',      'Europe',        'cup',                      '2025/26', true,  false, false, 'Cup',           true,  true,  false, 'ok',      true,  NULL),
('Taca de Portugal',           'TCP',    'Portugal',    'Europe',        'cup',                      '2025/26', true,  false, false, 'Cup',           true,  true,  false, 'partial', false, 'Stats thin outside semis/final.'),
('Scottish Cup',               'SC',     'Scotland',    'Europe',        'cup',                      '2025/26', true,  false, false, 'Cup',           true,  true,  false, 'ok',      true,  NULL),
('Belgian Cup',                'BC',     'Belgium',     'Europe',        'cup',                      '2025/26', true,  false, false, 'Cup',           true,  true,  false, 'ok',      true,  NULL),
('Copa del Rey Womens',        'CDRW',   'Spain',       'Europe',        'cup',                      '2025/26', true,  false, false, 'Cup',           true,  false, false, 'partial', false, 'Limited coverage. Womens cup.'),
-- CONTINENTAL CUPS (also in leagues as continental type, mirror here for fixture routing)
('UEFA Champions League Cup',  'UCLC',   'Europe',      'Europe',        'continental',              '2025/26', true,  true,  true,  'Cup',           true,  true,  true,  'ok',      true,  'Group + knockout. Full two-leg ties.'),
('UEFA Europa League Cup',     'UELC',   'Europe',      'Europe',        'continental',              '2025/26', true,  true,  true,  'Cup',           true,  true,  true,  'ok',      true,  NULL),
('Copa Libertadores Cup',      'LIBTC',  'South America','South America','continental',              '2025',    true,  true,  true,  'Cup',           true,  true,  false, 'ok',      true,  'Group + two-leg knockout.'),
-- INTERNATIONAL TOURNAMENTS (cup format)
('FIFA World Cup 2026 Cup',    'WC26C',  'International','Global',       'international_tournament', '2026',    true,  true,  false, 'International', true,  true,  true,  'ok',      true,  'Group stage + knockout. Neutral venues.'),
('UEFA Euro 2024',             'E2024',  'Europe',      'Europe',        'international_tournament', '2024',    false, true,  false, 'International', true,  true,  true,  'ok',      true,  'Completed. Full historical data.'),
('Copa América 2024 Cup',      'CA24C',  'South America','South America','international_tournament', '2024',    false, true,  false, 'International', true,  true,  true,  'ok',      true,  'Completed. Full historical data.'),
('AFCON 2025 Cup',             'AFCON25C','Africa',      'Africa',        'international_tournament', '2025',    false, true,  false, 'International', true,  true,  false, 'ok',      true,  NULL),
('CONCACAF Gold Cup 2025',     'GCC25',  'North America','North America', 'international_tournament', '2025',    false, true,  false, 'International', true,  true,  false, 'ok',      true,  NULL);

-- ============================================================
-- CUP ROUNDS for FA Cup 2025/26
-- ============================================================
WITH fac AS (SELECT id FROM cup_competitions WHERE short_name = 'FAC' LIMIT 1)
INSERT INTO cup_rounds (cup_id, name, round_number, is_two_legs, is_neutral_venue)
SELECT id, r.name, r.rn, false, r.nv FROM fac,
(VALUES
  ('Extra Preliminary Round', 1, false),
  ('Preliminary Round',       2, false),
  ('First Round',             3, false),
  ('Second Round',            4, false),
  ('Third Round',             5, false),
  ('Fourth Round',            6, false),
  ('Fifth Round',             7, false),
  ('Sixth Round (QF)',        8, false),
  ('Semi-Final',              9, true),
  ('Final',                   10, true)
) AS r(name, rn, nv);

-- CUP ROUNDS for Copa del Rey 2025/26
WITH cdr AS (SELECT id FROM cup_competitions WHERE short_name = 'CDR' LIMIT 1)
INSERT INTO cup_rounds (cup_id, name, round_number, is_two_legs, is_neutral_venue)
SELECT id, r.name, r.rn, r.tl, r.nv FROM cdr,
(VALUES
  ('Round of 32',  1, true,  false),
  ('Round of 16',  2, true,  false),
  ('Quarterfinal', 3, true,  false),
  ('Semi-Final',   4, true,  false),
  ('Final',        5, false, true)
) AS r(name, rn, tl, nv);

-- CUP ROUNDS for DFB-Pokal 2025/26
WITH dfb AS (SELECT id FROM cup_competitions WHERE short_name = 'DFBP' LIMIT 1)
INSERT INTO cup_rounds (cup_id, name, round_number, is_two_legs, is_neutral_venue)
SELECT id, r.name, r.rn, false, r.nv FROM dfb,
(VALUES
  ('First Round',  1, false),
  ('Second Round', 2, false),
  ('Third Round',  3, false),
  ('Quarterfinal', 4, false),
  ('Semi-Final',   5, false),
  ('Final',        6, true)
) AS r(name, rn, nv);
