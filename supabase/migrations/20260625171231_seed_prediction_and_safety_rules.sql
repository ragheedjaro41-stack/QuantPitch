
-- ============================================================
-- PREDICTION RULES
-- ============================================================
INSERT INTO prediction_rules (rule_name, competition_types, applies_to, rule_description, weight_modifier, priority, category) VALUES

-- LEAGUE GAME RULES
('league_home_advantage',       ARRAY['domestic_league'],           ARRAY['league'],              'Standard home advantage applied. Home team scores +0.3 xG baseline.',                             1.10, 1, 'venue'),
('league_form_weight',          ARRAY['domestic_league'],           ARRAY['league'],              'Last 5 league games form weighted at 60% vs. season average.',                                    1.00, 2, 'form'),
('league_h2h_weight',           ARRAY['domestic_league'],           ARRAY['league'],              'Head-to-head in same league context weighted at 20% of prediction.',                              1.00, 3, 'h2h'),
('league_rest_days',            ARRAY['domestic_league', 'cup'],    ARRAY['league', 'cup'],       'Teams with <3 days rest receive fatigue penalty: -0.15 xG.',                                      0.92, 4, 'fatigue'),
('league_relegation_pressure',  ARRAY['domestic_league'],           ARRAY['league'],              'Teams in bottom 3 or within 3pts of drop zone boost motivation by +0.1.',                        1.05, 5, 'motivation'),
('league_title_race',           ARRAY['domestic_league'],           ARRAY['league'],              'Teams within 3pts of title boost: +0.08 xG, tighter defensive line.',                            1.03, 5, 'motivation'),

-- CUP GAME RULES
('cup_rotation_penalty',        ARRAY['cup'],                       ARRAY['cup'],                 'Managers rotate 5+ players in early cup rounds. Reduce ratings by 15%.',                         0.85, 1, 'lineup'),
('cup_upset_factor',            ARRAY['cup'],                       ARRAY['cup'],                 'Lower tier opponents in cup carry +0.12 upset probability. Variance doubled.',                   1.20, 2, 'variance'),
('cup_single_leg_pressure',     ARRAY['cup'],                       ARRAY['cup', 'final'],        'Single-leg knockout increases draw probability by +8% vs league baseline.',                      1.00, 3, 'format'),
('cup_two_leg_first_leg',       ARRAY['cup', 'continental'],        ARRAY['two_leg'],             'First leg: away goals rule may apply. Reduce home aggression by 5%.',                            0.97, 3, 'format'),
('cup_two_leg_second_leg',      ARRAY['cup', 'continental'],        ARRAY['two_leg'],             'Second leg: aggregate deficit teams press. Increase goal probability by 12%.',                   1.12, 3, 'format'),
('cup_final_neutral',           ARRAY['cup', 'continental', 'international_tournament'], ARRAY['final', 'neutral'], 'Final at neutral venue: remove home advantage entirely. Equal footing.',      1.00, 1, 'venue'),
('cup_aggregate_trailing',      ARRAY['cup', 'continental'],        ARRAY['two_leg'],             'Team trailing on aggregate: +0.2 xG boost from desperation attacks.',                            1.15, 2, 'motivation'),
('cup_penalty_shootout_variance',ARRAY['cup', 'continental', 'international_tournament'], ARRAY['two_leg', 'cup', 'final'], 'When closely matched, flag 18% chance of reaching penalties.',       1.00, 4, 'variance'),

-- NEUTRAL VENUE RULES
('neutral_no_home_advantage',   ARRAY['international_tournament', 'cup', 'continental'], ARRAY['neutral'], 'No home advantage at neutral venues. Both teams treated as away.',                       1.00, 1, 'venue'),
('neutral_crowd_support',       ARRAY['international_tournament'],  ARRAY['neutral', 'international'], 'Partisan crowd at neutral venue adds 0.05 xG for supported team.',                          1.03, 2, 'venue'),

-- INTERNATIONAL RULES
('international_squad_quality_gap', ARRAY['international', 'international_tournament'], ARRAY['international'], 'National team quality index replaces club-form. Use FIFA ranking delta.',          1.00, 1, 'quality'),
('international_tournament_fatigue', ARRAY['international_tournament'], ARRAY['international'],  'Group stage fatigue accumulates. Third match in 9 days: -0.1 xG.',                               0.93, 2, 'fatigue'),
('international_camp_chemistry',    ARRAY['international'],         ARRAY['international'],       'National teams lose club synergy. Reduce expected assists by 10%.',                              0.95, 3, 'team'),
('international_wc_knockout_pressure', ARRAY['international_tournament'], ARRAY['final', 'semifinal', 'quarterfinal'], 'Knockout pressure inflates draw rate by +6%. Tighter defensive setup.', 1.00, 2, 'pressure'),

-- PLAYOFF RULES
('playoff_single_game_variance',ARRAY['domestic_league'],           ARRAY['playoff'],             'Single playoff game: massive variance. Model confidence reduced by 25%.',                        1.00, 1, 'variance'),
('playoff_home_leg_advantage',  ARRAY['domestic_league'],           ARRAY['playoff'],             'First leg at home in playoff: +0.15 xG vs neutral equivalent.',                                  1.10, 2, 'venue'),
('playoff_higher_stakes',       ARRAY['domestic_league'],           ARRAY['playoff'],             'Playoff elimination stakes: reduce low-threat team xG by 0.08.',                                 0.95, 3, 'motivation'),

-- FINAL RULES
('final_reputation_factor',     ARRAY['cup', 'continental', 'international_tournament'], ARRAY['final'], 'Finals: teams with more trophy pedigree get +0.05 xG psychological edge.',                1.02, 2, 'reputation'),
('final_tactical_caution',      ARRAY['cup', 'continental', 'international_tournament'], ARRAY['final'], 'Finals: both teams start cautiously. First 20 mins: reduce goal rate by 15%.',             0.88, 3, 'tactics'),

-- SAFETY MODEL RULES
('skip_if_not_playable',        ARRAY['domestic_league', 'cup', 'continental', 'international'], ARRAY['all'], 'Do not generate prediction for leagues marked as not playable.',                   0.00, 0, 'safety'),
('confidence_cap_tier4',        ARRAY['domestic_league'],           ARRAY['tier4'],               'Tier 4 leagues: cap model confidence at 55%. Surface data risk warning.',                        1.00, 0, 'safety'),
('odds_absent_flag',            ARRAY['domestic_league', 'cup'],    ARRAY['all'],                 'No odds available: block prediction output. Flag as missing market data.',                        0.00, 0, 'safety');

-- ============================================================
-- SAFETY RULES
-- ============================================================
INSERT INTO safety_rules (rule_name, min_fixtures, min_team_history_years, min_stats_coverage, min_odds_coverage, min_settlement_coverage, tier_applies_to, description, consequence) VALUES

('tier1_full_coverage',
  20, 5, 80.0, 85.0, 95.0, ARRAY[1],
  'Tier 1 leagues must have 20+ fixtures in history, 5+ years data, 80% stats coverage, 85% odds, 95% settlement.',
  'Block from Tier 1 if any threshold missed. Downgrade to Tier 2.'),

('tier2_good_coverage',
  15, 3, 65.0, 65.0, 85.0, ARRAY[2],
  'Tier 2 leagues need 15+ fixture records, 3+ years, 65% stats, 65% odds, 85% settlement.',
  'Block from Tier 2 if thresholds not met. Downgrade to Tier 3 or flag for review.'),

('tier3_minimum_viability',
  10, 2, 40.0, 45.0, 70.0, ARRAY[3],
  'Tier 3 leagues: 10+ fixtures, 2+ years history, 40% stats, 45% odds, 70% settlement.',
  'Mark as thin. Allow predictions with confidence penalty. Display data risk warning.'),

('tier4_data_audit_required',
  5,  1, 0.0,  20.0, 50.0, ARRAY[4],
  'Tier 4 leagues require manual audit before enabling. Minimum 5 fixtures and 20% odds.',
  'Block all predictions until manual audit passes. Mark as needs_audit.'),

('cups_min_fixture_history',
  8,  2, 50.0, 60.0, 75.0, ARRAY[1, 2, 3],
  'Cup competitions need 8+ round fixtures in history and 60% odds coverage.',
  'Do not predict cup rounds without sufficient fixture history. Flag for review.'),

('neutral_venue_minimum',
  5,  1, 60.0, 70.0, 80.0, ARRAY[1, 2],
  'Neutral venue games (finals, international) need 60% stats and 70% odds.',
  'Apply reduced confidence when neutral venue norms are absent from model.'),

('two_leg_aggregate_required',
  4,  1, 55.0, 65.0, 80.0, ARRAY[1, 2],
  'Two-leg ties require both legs in training data and aggregate score settlement history.',
  'Flag if first-leg isolation data is missing. Reduce leg-2 prediction confidence.'),

('international_tournament_checks',
  12, 2, 65.0, 70.0, 85.0, ARRAY[1, 2],
  'International tournaments need 12+ matches, 65% stats, 70% odds historically.',
  'Reduce confidence by 20% if below threshold. Display national team data risk.'),

('war_conflict_auto_block',
  0,  0, 0.0,  0.0,  0.0,  ARRAY[1, 2, 3, 4],
  'Leagues in active war zones or sanctions (Russia, Belarus currently) auto-blocked.',
  'Block all predictions. Manual override requires compliance approval.'),

('minimum_settlement_global',
  0,  0, 0.0,  0.0,  60.0, ARRAY[1, 2, 3, 4],
  'No league or cup may be marked playable without 60%+ settlement coverage.',
  'Hard block on playable flag. Resolution mandatory before any activation.'),

('no_odds_no_prediction',
  0,  0, 0.0,  30.0, 0.0,  ARRAY[1, 2, 3, 4],
  'If odds coverage is below 30%, predictions are suppressed entirely.',
  'Zero odds threshold means no market confidence. Suspend all outputs for this competition.'),

('womens_minimum_viability',
  8,  2, 45.0, 40.0, 65.0, ARRAY[2, 3],
  'Womens leagues: 8+ fixtures, 40% odds, 65% settlement minimum for activation.',
  'Flag as developing market. Allow limited predictions with confidence cap at 60%.');
