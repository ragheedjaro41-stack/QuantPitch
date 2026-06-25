
INSERT INTO leagues (name, short_name, country, continent, tier, tier_label, competition_type, season, active,
  has_fixtures, has_odds, has_stats, has_standings, has_team_stats, has_injury_news,
  historical_depth_years, fixture_coverage, odds_coverage, stats_coverage, provider_flag, playable, notes)
VALUES
-- ============================================================
-- TIER 1 — MAJOR RELIABLE LEAGUES
-- ============================================================
('Premier League',        'PL',    'England',     'Europe',        1, 'Tier 1', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  true,  true,  10, 99.5, 98.0, 97.0, 'ok',       true,  'Full coverage. Primary market.'),
('La Liga',               'LL',    'Spain',       'Europe',        1, 'Tier 1', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  true,  true,  10, 99.0, 97.0, 95.0, 'ok',       true,  'Full coverage. Primary market.'),
('Bundesliga',            'BL1',   'Germany',     'Europe',        1, 'Tier 1', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  true,  true,  10, 99.0, 97.5, 95.0, 'ok',       true,  'Full coverage. Primary market.'),
('Serie A',               'SA',    'Italy',       'Europe',        1, 'Tier 1', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  true,  true,  10, 98.5, 97.0, 94.0, 'ok',       true,  'Full coverage. Primary market.'),
('Ligue 1',               'L1',    'France',      'Europe',        1, 'Tier 1', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  true,  true,  10, 98.0, 95.0, 92.0, 'ok',       true,  'Full coverage. Primary market.'),
('Eredivisie',            'ERE',   'Netherlands', 'Europe',        1, 'Tier 1', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  true,  false, 8,  97.0, 90.0, 88.0, 'ok',       true,  'Strong coverage. Good odds.'),
('Primeira Liga',         'PRL',   'Portugal',    'Europe',        1, 'Tier 1', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  true,  false, 8,  97.0, 89.0, 87.0, 'ok',       true,  'Strong coverage.'),
('MLS',                   'MLS',   'USA',         'North America', 1, 'Tier 1', 'domestic_league', '2025',    true,  true,  true,  true,  true,  true,  false, 7,  95.0, 85.0, 82.0, 'ok',       true,  'Good coverage. Season March-Nov.'),
('Liga MX',               'LMX',   'Mexico',      'North America', 1, 'Tier 1', 'domestic_league', 'A2025',   true,  true,  true,  true,  true,  true,  false, 7,  95.0, 86.0, 83.0, 'ok',       true,  'Good coverage. Apertura/Clausura.'),
('Brasileirão Serie A',   'BSA',   'Brazil',      'South America', 1, 'Tier 1', 'domestic_league', '2025',    true,  true,  true,  true,  true,  true,  false, 8,  96.0, 84.0, 80.0, 'ok',       true,  'Strong domestic market.'),
('Primera División ARG',  'PDA',   'Argentina',   'South America', 1, 'Tier 1', 'domestic_league', 'A2025',   true,  true,  true,  true,  true,  false, false, 7,  94.0, 80.0, 78.0, 'ok',       true,  'Good coverage.'),
('Saudi Pro League',      'SPL',   'Saudi Arabia','Asia',          1, 'Tier 1', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  false, false, 4,  95.0, 88.0, 75.0, 'ok',       true,  'Rapidly improving coverage.'),
('J1 League',             'J1',    'Japan',       'Asia',          1, 'Tier 1', 'domestic_league', '2025',    true,  true,  true,  true,  true,  false, false, 7,  94.0, 78.0, 76.0, 'ok',       true,  'Reliable Asian market.'),
('Scottish Premiership',  'SPR',   'Scotland',    'Europe',        1, 'Tier 1', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  true,  false, 9,  96.0, 88.0, 85.0, 'ok',       true,  'Strong UK coverage.'),
-- ============================================================
-- TIER 2 — GOOD COVERAGE LEAGUES
-- ============================================================
('Championship',          'CH',    'England',     'Europe',        2, 'Tier 2', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  true,  false, 9,  98.0, 90.0, 85.0, 'ok',       true,  'Strong odds. Heavy betting market.'),
('2. Bundesliga',         'BL2',   'Germany',     'Europe',        2, 'Tier 2', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  false, false, 8,  97.0, 87.0, 82.0, 'ok',       true,  'Good German second tier.'),
('Serie B',               'SB',    'Italy',       'Europe',        2, 'Tier 2', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  false, false, 7,  96.0, 83.0, 78.0, 'ok',       true,  'Solid Italian second tier.'),
('Ligue 2',               'L2',    'France',      'Europe',        2, 'Tier 2', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  false, false, 7,  95.0, 80.0, 76.0, 'ok',       true,  'Good French second tier.'),
('Segunda División',      'SD',    'Spain',       'Europe',        2, 'Tier 2', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  false, false, 7,  95.0, 81.0, 77.0, 'ok',       true,  'Strong Spanish second tier.'),
('Belgian Pro League',    'BPL',   'Belgium',     'Europe',        2, 'Tier 2', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  false, false, 7,  94.0, 85.0, 80.0, 'ok',       true,  'Good European market.'),
('Turkish Süper Lig',     'TSL',   'Turkey',      'Europe',        2, 'Tier 2', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  false, false, 7,  93.0, 84.0, 78.0, 'ok',       true,  'Strong Turkish market.'),
('Russian Premier League','RPL',   'Russia',      'Europe',        2, 'Tier 2', 'domestic_league', '2025/26', true,  true,  false, true,  false, false, false, 6,  85.0, 60.0, 55.0, 'partial',  false, 'Sanctions impact. Limited odds. Stats unreliable.'),
('Ukrainian Premier League','UPL', 'Ukraine',     'Europe',        2, 'Tier 2', 'domestic_league', '2025/26', true,  true,  false, true,  false, false, false, 5,  75.0, 50.0, 45.0, 'partial',  false, 'Wartime disruption. Fixture reliability issues.'),
('A-League',              'AL',    'Australia',   'Oceania',       2, 'Tier 2', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  false, false, 6,  93.0, 75.0, 72.0, 'ok',       true,  'Good Oceania coverage.'),
('Süper Lig',             'SL',    'Turkey',      'Europe',        2, 'Tier 2', 'domestic_league', '2025/26', true,  true,  true,  true,  true,  false, false, 7,  93.0, 84.0, 78.0, 'ok',       true,  'Duplicate entry guard — see Turkish Süper Lig.'),
('Austrian Bundesliga',   'ABL',   'Austria',     'Europe',        2, 'Tier 2', 'domestic_league', '2025/26', true,  true,  true,  true,  false, false, false, 6,  92.0, 78.0, 72.0, 'ok',       true,  NULL),
('Swiss Super League',    'SSL',   'Switzerland', 'Europe',        2, 'Tier 2', 'domestic_league', '2025/26', true,  true,  true,  true,  false, false, false, 7,  92.0, 80.0, 73.0, 'ok',       true,  NULL),
('Ekstraklasa',           'EKS',   'Poland',      'Europe',        2, 'Tier 2', 'domestic_league', '2025/26', true,  true,  true,  true,  false, false, false, 6,  90.0, 75.0, 70.0, 'ok',       true,  NULL),
('Allsvenskan',           'AVS',   'Sweden',      'Europe',        2, 'Tier 2', 'domestic_league', '2025',    true,  true,  true,  true,  false, false, false, 8,  91.0, 76.0, 71.0, 'ok',       true,  'Spring-autumn season.'),
('Eliteserien',           'ELS',   'Norway',      'Europe',        2, 'Tier 2', 'domestic_league', '2025',    true,  true,  true,  true,  false, false, false, 7,  90.0, 74.0, 69.0, 'ok',       true,  NULL),
('Superligaen',           'SLG',   'Denmark',     'Europe',        2, 'Tier 2', 'domestic_league', '2025/26', true,  true,  true,  true,  false, false, false, 7,  90.0, 75.0, 70.0, 'ok',       true,  NULL),
('K League 1',            'KL1',   'South Korea', 'Asia',          2, 'Tier 2', 'domestic_league', '2025',    true,  true,  true,  true,  false, false, false, 6,  90.0, 70.0, 68.0, 'ok',       true,  NULL),
('Chinese Super League',  'CSL',   'China',       'Asia',          2, 'Tier 2', 'domestic_league', '2025',    true,  true,  false, true,  false, false, false, 5,  88.0, 65.0, 55.0, 'partial',  false, 'Stats coverage unreliable. Financial volatility.'),
-- ============================================================
-- TIER 3 — PLAYABLE BUT WEAKER DATA
-- ============================================================
('EFL League One',        'L1E',   'England',     'Europe',        3, 'Tier 3', 'domestic_league', '2025/26', true,  true,  true,  true,  false, false, false, 6,  94.0, 75.0, 65.0, 'ok',       true,  'Decent UK odds. Stats thin.'),
('EFL League Two',        'L2E',   'England',     'Europe',        3, 'Tier 3', 'domestic_league', '2025/26', true,  true,  true,  true,  false, false, false, 6,  93.0, 70.0, 60.0, 'ok',       true,  'Decent UK odds. Stats very thin.'),
('Serie C',               'SC',    'Italy',       'Europe',        3, 'Tier 3', 'domestic_league', '2025/26', true,  true,  false, true,  false, false, false, 4,  85.0, 60.0, 40.0, 'partial',  false, 'Fixture coverage ok but stats weak.'),
('3. Liga',               'BL3',   'Germany',     'Europe',        3, 'Tier 3', 'domestic_league', '2025/26', true,  true,  false, true,  false, false, false, 5,  88.0, 65.0, 50.0, 'partial',  true,  'Odds ok. Stats thin.'),
('Liga Portugal 2',       'LP2',   'Portugal',    'Europe',        3, 'Tier 3', 'domestic_league', '2025/26', true,  true,  false, true,  false, false, false, 4,  85.0, 62.0, 45.0, 'partial',  true,  NULL),
('Greek Super League',    'GSL',   'Greece',      'Europe',        3, 'Tier 3', 'domestic_league', '2025/26', true,  true,  true,  true,  false, false, false, 5,  87.0, 68.0, 60.0, 'ok',       true,  NULL),
('Czech Liga',            'CZL',   'Czechia',     'Europe',        3, 'Tier 3', 'domestic_league', '2025/26', true,  true,  true,  true,  false, false, false, 5,  86.0, 66.0, 59.0, 'ok',       true,  NULL),
('Romanian Liga I',       'ROL',   'Romania',     'Europe',        3, 'Tier 3', 'domestic_league', '2025/26', true,  true,  false, true,  false, false, false, 4,  84.0, 60.0, 45.0, 'partial',  false, 'Odds available. Stats thin.'),
('Hungarian OTP Liga',    'HOL',   'Hungary',     'Europe',        3, 'Tier 3', 'domestic_league', '2025/26', true,  true,  false, true,  false, false, false, 4,  83.0, 58.0, 40.0, 'partial',  false, NULL),
('Bulgarian First League','BFL',   'Bulgaria',    'Europe',        3, 'Tier 3', 'domestic_league', '2025/26', true,  true,  false, true,  false, false, false, 3,  80.0, 55.0, 35.0, 'partial',  false, NULL),
('Israeli Premier League','IPL',   'Israel',      'Asia',          3, 'Tier 3', 'domestic_league', '2025/26', true,  true,  false, true,  false, false, false, 4,  82.0, 60.0, 40.0, 'partial',  false, 'Coverage impacted by regional events.'),
('Mexican Liga de Expansión','MLE','Mexico',      'North America', 3, 'Tier 3', 'domestic_league', 'A2025',   true,  true,  false, true,  false, false, false, 4,  84.0, 62.0, 45.0, 'partial',  false, NULL),
('Brasileirão Serie B',   'BSB',   'Brazil',      'South America', 3, 'Tier 3', 'domestic_league', '2025',    true,  true,  false, true,  false, false, false, 5,  86.0, 63.0, 50.0, 'partial',  false, NULL),
-- ============================================================
-- TIER 4 — THIN / DATA-RISK LEAGUES
-- ============================================================
('Albanian Superliga',    'ABL4',  'Albania',     'Europe',        4, 'Tier 4', 'domestic_league', '2025/26', true,  true,  false, false, false, false, false, 2,  65.0, 40.0, 20.0, 'missing',  false, 'Data thin. High risk.'),
('Azerbaijani Premier League','AZP','Azerbaijan', 'Asia',          4, 'Tier 4', 'domestic_league', '2025/26', true,  false, false, false, false, false, false, 2,  60.0, 30.0, 15.0, 'missing',  false, 'Very limited coverage.'),
('Belarusian Premier League','BPR','Belarus',     'Europe',        4, 'Tier 4', 'domestic_league', '2025',    true,  false, false, false, false, false, false, 2,  55.0, 25.0, 10.0, 'missing',  false, 'Sanctions risk. Data unreliable.'),
('Kazakh Premier League', 'KPL',   'Kazakhstan',  'Asia',          4, 'Tier 4', 'domestic_league', '2025',    true,  false, false, false, false, false, false, 2,  58.0, 28.0, 12.0, 'missing',  false, NULL),
('Egyptian Premier League','EPL',  'Egypt',       'Africa',        4, 'Tier 4', 'domestic_league', '2025/26', true,  false, false, true,  false, false, false, 3,  70.0, 35.0, 20.0, 'partial',  false, 'Standings ok. Odds/stats thin.'),
('South African PSL',     'SAPSL', 'South Africa','Africa',        4, 'Tier 4', 'domestic_league', '2025/26', true,  false, false, true,  false, false, false, 3,  68.0, 30.0, 18.0, 'partial',  false, NULL),
('Nigerian NPFL',         'NPFL',  'Nigeria',     'Africa',        4, 'Tier 4', 'domestic_league', '2025/26', true,  false, false, false, false, false, false, 1,  40.0, 15.0, 5.0,  'missing',  false, 'Very thin coverage. Needs full audit.'),
('Moroccan Botola Pro',   'MBP',   'Morocco',     'Africa',        4, 'Tier 4', 'domestic_league', '2025/26', true,  false, false, true,  false, false, false, 3,  65.0, 30.0, 15.0, 'missing',  false, NULL),
('Indian Super League',   'ISL',   'India',       'Asia',          4, 'Tier 4', 'domestic_league', '2024/25', true,  false, false, true,  false, false, false, 3,  72.0, 35.0, 25.0, 'partial',  false, NULL),
('Thai League 1',         'THL',   'Thailand',    'Asia',          4, 'Tier 4', 'domestic_league', '2025',    true,  false, false, true,  false, false, false, 3,  68.0, 30.0, 20.0, 'partial',  false, NULL),
-- ============================================================
-- WOMEN''S LEAGUES
-- ============================================================
('WSL',                   'WSL',   'England',     'Europe',        2, 'Tier 2', 'womens',          '2025/26', true,  true,  true,  true,  false, false, false, 5,  90.0, 65.0, 60.0, 'ok',       true,  'Best womens coverage globally.'),
('NWSL',                  'NWSL',  'USA',         'North America', 2, 'Tier 2', 'womens',          '2025',    true,  true,  true,  true,  false, false, false, 5,  88.0, 60.0, 58.0, 'ok',       true,  'Strong US womens market.'),
('D1 Féminine',           'D1F',   'France',      'Europe',        3, 'Tier 3', 'womens',          '2025/26', true,  true,  false, true,  false, false, false, 4,  83.0, 50.0, 42.0, 'partial',  false, NULL),
('Frauen-Bundesliga',     'FBL',   'Germany',     'Europe',        3, 'Tier 3', 'womens',          '2025/26', true,  true,  false, true,  false, false, false, 4,  82.0, 48.0, 40.0, 'partial',  false, NULL),
-- ============================================================
-- YOUTH / RESERVE (LOWER PRIORITY)
-- ============================================================
('Premier League 2',      'PL2',   'England',     'Europe',        4, 'Tier 4', 'youth',           '2025/26', true,  false, false, true,  false, false, false, 3,  70.0, 10.0, 20.0, 'partial',  false, 'Youth league. Low betting priority.'),
('UEFA Youth League',     'UEFAYL','Europe',      'Europe',        4, 'Tier 4', 'youth',           '2025/26', true,  false, false, true,  false, false, false, 3,  72.0, 8.0,  18.0, 'partial',  false, 'Informational only.'),
-- ============================================================
-- INTERNATIONAL (NATIONAL TEAM)
-- ============================================================
('FIFA World Cup 2026',   'WC26',  'International','Global',       1, 'International', 'international_tournament', '2026', true, true, true, true, true, false, false, 5, 99.0, 95.0, 90.0, 'ok', true, 'USA/Canada/Mexico. Full coverage.'),
('UEFA Euro 2028',        'EURO28','International','Europe',       1, 'International', 'international_tournament', '2028', false, false, false, false, false, false, false, 0, 0.0, 0.0, 0.0, 'unknown', false, 'Future tournament. Not yet active.'),
('Copa América 2024',     'CA24',  'International','South America',1, 'International', 'international_tournament', '2024', false, true, true, true, true, false, false, 3, 99.0, 90.0, 85.0, 'ok', true, 'Completed. Historical data available.'),
('UEFA Nations League',   'UNL',   'International','Europe',       2, 'International', 'international',           '2024/25', true, true, true, true, true, false, false, 3, 95.0, 85.0, 80.0, 'ok', true, NULL),
('AFCON 2025',            'AFCON25','International','Africa',      2, 'International', 'international_tournament', '2025', false, true, true, true, false, false, false, 2, 92.0, 72.0, 65.0, 'ok', true, NULL),
('AFC Asian Cup 2027',    'AAC27', 'International','Asia',         2, 'International', 'international_tournament', '2027', false, false, false, false, false, false, false, 0, 0.0, 0.0, 0.0, 'unknown', false, 'Future tournament.'),
('CONCACAF Gold Cup',     'GC',    'International','North America',2, 'International', 'international_tournament', '2025', true, true, true, true, false, false, false, 3, 90.0, 75.0, 68.0, 'ok', true, NULL),
('FIFA World Cup Qualifiers','WCQ','International','Global',       2, 'International', 'international',           '2025/26', true, true, true, true, false, false, false, 4, 93.0, 82.0, 75.0, 'ok', true, NULL),
-- ============================================================
-- CONTINENTAL (CLUB)
-- ============================================================
('UEFA Champions League', 'UCL',   'Europe',      'Europe',        1, 'Cup',    'continental',     '2025/26', true,  true,  true,  true,  true,  true,  false, 10, 99.5, 98.0, 96.0, 'ok',       true,  'Flagship club competition. Full coverage.'),
('UEFA Europa League',    'UEL',   'Europe',      'Europe',        1, 'Cup',    'continental',     '2025/26', true,  true,  true,  true,  true,  false, false, 10, 98.0, 92.0, 88.0, 'ok',       true,  'Strong coverage.'),
('UEFA Conference League','UECL',  'Europe',      'Europe',        2, 'Cup',    'continental',     '2025/26', true,  true,  true,  true,  false, false, false, 3,  95.0, 82.0, 76.0, 'ok',       true,  NULL),
('Copa Libertadores',     'LIBT',  'South America','South America',1, 'Cup',    'continental',     '2025',    true,  true,  true,  true,  false, false, false, 8,  95.0, 80.0, 75.0, 'ok',       true,  'Top CONMEBOL club competition.'),
('Copa Sudamericana',     'CSUD',  'South America','South America',2, 'Cup',    'continental',     '2025',    true,  true,  false, true,  false, false, false, 7,  90.0, 70.0, 60.0, 'ok',       true,  NULL),
('CAF Champions League',  'CAFCL', 'Africa',      'Africa',        3, 'Cup',    'continental',     '2024/25', true,  false, false, true,  false, false, false, 4,  70.0, 30.0, 20.0, 'partial',  false, 'Limited data. Fixtures unreliable.'),
('AFC Champions League',  'AFCCL', 'Asia',        'Asia',          2, 'Cup',    'continental',     '2025/26', true,  true,  false, true,  false, false, false, 5,  85.0, 60.0, 50.0, 'partial',  true,  NULL),
('CONCACAF Champions Cup','CONCAF','North America','North America', 2, 'Cup',    'continental',     '2025',    true,  true,  false, true,  false, false, false, 4,  85.0, 65.0, 55.0, 'partial',  true,  NULL);
