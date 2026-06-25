-- Add provider_source column to settlement_log for source tracking
ALTER TABLE settlement_log ADD COLUMN IF NOT EXISTS provider_source text NOT NULL DEFAULT 'internal_backfill';

-- Label all existing settlement_log rows as internal backfill
UPDATE settlement_log SET provider_source = 'internal_backfill' WHERE provider_source = 'internal_backfill';

-- Label all existing match_results as internal backfill (they came from DB migration, not provider)
UPDATE match_results SET provider_source = 'internal_backfill' WHERE provider_source = 'db-migration';

-- Update the results_sync_log entry for the backfill migration
UPDATE results_sync_log SET provider = 'internal_backfill' WHERE provider = 'db-migration';
