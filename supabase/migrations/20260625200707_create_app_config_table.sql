/*
# Create app_config table for server-side secrets

1. New Tables
   - `app_config`
     - `key` (text, primary key) - config key name
     - `value` (text, not null) - config value
     - `created_at` (timestamptz)

2. Security
   - RLS enabled with ZERO policies.
   - This means ONLY the service role can read/write.
   - anon and authenticated roles cannot access this table at all.
   - Used by edge functions to read API keys securely.
*/

CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
