/*
# Rename results provider default from 'football-data-api' to 'api-football'

1. Modified Tables
  - `results_sync_log`: change default value of `provider` column from 'football-data-api' to 'api-football'

2. Important Notes
  - Aligns the DB default with the secret name API_FOOTBALL_KEY.
  - Does not change existing rows; only affects future inserts that omit the provider field.
*/

ALTER TABLE results_sync_log ALTER COLUMN provider SET DEFAULT 'api-football';
